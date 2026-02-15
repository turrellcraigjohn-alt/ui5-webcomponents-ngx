/**
 * OpenAI-Compliant Proxy Service
 * Bidirectional A2A routing for SAP Pipeline Console
 * Routes to local models, SAP AI Core, or scenario execution services
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

export type ServiceType = 'local-models' | 'sap-aicore' | 'scenario-service' | 'grounding-service';

export interface ServiceEndpoint {
  name: string;
  url: string;
  serviceType: ServiceType;
  defaultModel?: string;
  healthy: boolean;
  lastCheck?: Date;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage & { tool_calls?: ToolCall[] };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
}

export interface EmbeddingResponse {
  object: 'list';
  data: {
    object: 'embedding';
    index: number;
    embedding: number[];
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface ModelInfo {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

export interface ModelsResponse {
  object: 'list';
  data: ModelInfo[];
}

export type PipelineIntent = 
  | 'execute_scenario' | 'list_deployments' | 'get_execution_status'
  | 'configure_grounding' | 'create_deployment' | 'delete_deployment'
  | 'list_scenarios' | 'get_scenario_config' | 'stream_execution'
  | 'chat_completion' | 'embeddings';

@Injectable({
  providedIn: 'root'
})
export class OpenAIProxyService {
  private readonly http = inject(HttpClient);
  private readonly proxyUrl = '/v1';
  
  // Service registry
  readonly services = signal<ServiceEndpoint[]>([
    { name: 'local-models', url: 'http://localhost:8080', serviceType: 'local-models', defaultModel: 'phi-2', healthy: true },
    { name: 'sap-aicore', url: 'https://api.ai.core.sap', serviceType: 'sap-aicore', healthy: true },
    { name: 'scenario-service', url: 'http://localhost:8090', serviceType: 'scenario-service', healthy: true },
    { name: 'grounding-service', url: 'http://localhost:8091', serviceType: 'grounding-service', healthy: true }
  ]);
  
  // Discovered models
  readonly models = signal<ModelInfo[]>([
    { id: 'phi-2', object: 'model', created: 1700000000, owned_by: 'local-models' },
    { id: 'gemma-3-270m-it', object: 'model', created: 1700000000, owned_by: 'local-models' },
    { id: 'gpt-4', object: 'model', created: 1700000000, owned_by: 'sap-aicore' },
    { id: 'text-embedding-ada-002', object: 'model', created: 1700000000, owned_by: 'sap-aicore' }
  ]);
  
  readonly isProcessing = signal(false);
  readonly error = signal<string | null>(null);

  // Pipeline tool definitions
  readonly pipelineTools: ToolDefinition[] = [
    {
      type: 'function',
      function: {
        name: 'execute_scenario',
        description: 'Execute an AI pipeline scenario in SAP AI Core',
        parameters: {
          type: 'object',
          properties: {
            scenario_id: { type: 'string', description: 'Scenario identifier' },
            parameters: { type: 'object', description: 'Execution parameters' },
            grounding: { type: 'object', description: 'Grounding configuration' }
          },
          required: ['scenario_id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'list_deployments',
        description: 'List available model deployments',
        parameters: {
          type: 'object',
          properties: {
            scenario_id: { type: 'string', description: 'Filter by scenario' },
            status: { type: 'string', description: 'Filter by status (running, stopped, pending)' }
          }
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'configure_grounding',
        description: 'Configure document grounding for a scenario',
        parameters: {
          type: 'object',
          properties: {
            scenario_id: { type: 'string', description: 'Scenario identifier' },
            documents: { type: 'array', description: 'Document references' },
            retrieval_config: { type: 'object', description: 'Retrieval configuration' }
          },
          required: ['scenario_id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_execution_status',
        description: 'Get the status of a scenario execution',
        parameters: {
          type: 'object',
          properties: {
            execution_id: { type: 'string', description: 'Execution identifier' },
            include_logs: { type: 'boolean', description: 'Include execution logs' }
          },
          required: ['execution_id']
        }
      }
    }
  ];

  // Intent to service mapping
  private readonly intentServiceMap: Record<PipelineIntent, ServiceType> = {
    'execute_scenario': 'scenario-service',
    'list_deployments': 'sap-aicore',
    'get_execution_status': 'scenario-service',
    'configure_grounding': 'grounding-service',
    'create_deployment': 'sap-aicore',
    'delete_deployment': 'sap-aicore',
    'list_scenarios': 'sap-aicore',
    'get_scenario_config': 'sap-aicore',
    'stream_execution': 'scenario-service',
    'chat_completion': 'sap-aicore',
    'embeddings': 'sap-aicore'
  };

  /**
   * OpenAI-compliant chat completions with pipeline tools
   */
  chatCompletion(request: ChatCompletionRequest): Observable<ChatCompletionResponse> {
    this.isProcessing.set(true);
    this.error.set(null);
    
    // Add pipeline tools if not provided
    const enhancedRequest = {
      ...request,
      tools: request.tools || this.pipelineTools
    };
    
    return this.http.post<ChatCompletionResponse>(`${this.proxyUrl}/chat/completions`, enhancedRequest).pipe(
      tap(() => this.isProcessing.set(false)),
      catchError(err => {
        this.error.set(err.message || 'Chat completion failed');
        this.isProcessing.set(false);
        return of(this.createErrorResponse(request.model, err.message));
      })
    );
  }

  /**
   * OpenAI-compliant embeddings
   */
  createEmbedding(request: EmbeddingRequest): Observable<EmbeddingResponse> {
    this.isProcessing.set(true);
    
    return this.http.post<EmbeddingResponse>(`${this.proxyUrl}/embeddings`, request).pipe(
      tap(() => this.isProcessing.set(false)),
      catchError(err => {
        this.error.set(err.message || 'Embedding failed');
        this.isProcessing.set(false);
        return of({
          object: 'list' as const,
          data: [],
          model: request.model,
          usage: { prompt_tokens: 0, total_tokens: 0 }
        });
      })
    );
  }

  /**
   * List available models
   */
  listModels(): Observable<ModelsResponse> {
    return this.http.get<ModelsResponse>(`${this.proxyUrl}/models`).pipe(
      tap(response => {
        this.models.set(response.data);
      }),
      catchError(() => of({
        object: 'list' as const,
        data: this.models()
      }))
    );
  }

  /**
   * Route intent to appropriate service
   */
  routeIntent<T>(intent: PipelineIntent, payload: unknown): Observable<T> {
    const serviceType = this.intentServiceMap[intent];
    const service = this.services().find(s => s.serviceType === serviceType && s.healthy);
    
    if (!service) {
      const fallback = this.services().find(s => s.serviceType === 'local-models' && s.healthy);
      if (!fallback) {
        return of({ error: 'No healthy service available' } as T);
      }
    }
    
    switch (intent) {
      case 'chat_completion':
        return this.chatCompletion(payload as ChatCompletionRequest) as Observable<T>;
      case 'embeddings':
        return this.createEmbedding(payload as EmbeddingRequest) as Observable<T>;
      default:
        return this.http.post<T>(`/api/v1/${intent.replace('_', '-')}`, payload);
    }
  }

  /**
   * Generate scenario prompt
   */
  generateScenarioPrompt(scenarioType: string, context?: string): Observable<string> {
    return this.chatCompletion({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: 'You are an AI assistant helping to configure SAP AI Core scenarios. Generate appropriate prompts and configurations.' 
        },
        { role: 'user', content: `Generate a prompt for a ${scenarioType} scenario. ${context ? `Context: ${context}` : ''}` }
      ],
      temperature: 0.7
    }).pipe(
      map(response => response.choices[0]?.message.content || '')
    );
  }

  /**
   * Explain execution results
   */
  explainExecution(executionData: unknown): Observable<string> {
    return this.chatCompletion({
      model: 'phi-2',
      messages: [
        { 
          role: 'system', 
          content: 'You are an AI specialist. Explain SAP AI Core execution results in plain language.' 
        },
        { role: 'user', content: `Explain these execution results:\n\n${JSON.stringify(executionData, null, 2)}` }
      ],
      temperature: 0.5
    }).pipe(
      map(response => response.choices[0]?.message.content || '')
    );
  }

  /**
   * Suggest grounding documents
   */
  suggestGrounding(scenarioId: string, description: string): Observable<string[]> {
    return this.chatCompletion({
      model: 'phi-2',
      messages: [
        { 
          role: 'system', 
          content: 'You are an AI grounding expert. Suggest document types and sources for RAG grounding.' 
        },
        { role: 'user', content: `For scenario "${scenarioId}": ${description}\n\nSuggest grounding document types and sources.` }
      ],
      temperature: 0.6
    }).pipe(
      map(response => {
        const text = response.choices[0]?.message.content || '';
        return text.split('\n').filter(line => line.trim().length > 0);
      })
    );
  }

  /**
   * Check health of all services
   */
  checkHealth(): Observable<ServiceEndpoint[]> {
    const services = this.services();
    return of(services);
  }

  private createErrorResponse(model: string, errorMessage: string): ChatCompletionResponse {
    return {
      id: `error-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: `Error: ${errorMessage}`
        },
        finish_reason: 'error'
      }]
    };
  }
}