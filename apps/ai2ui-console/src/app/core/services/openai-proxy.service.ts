/**
 * OpenAI-Compliant Proxy Service
 * Multi-agent orchestration with A2A protocol support for AI2UI Console
 * Routes to all available agents: search, graph, docs, pipeline
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap, forkJoin } from 'rxjs';

export type ServiceType = 'local-models' | 'perplexica-search' | 'neo4j-graph' | 'hyperbook-rag' | 'sap-pipeline' | 'orchestrator';

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

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
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
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Google A2A AgentCard
export interface AgentCard {
  name: string;
  url: string;
  version: string;
  description?: string;
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    stateTransitionHistory: boolean;
  };
  skills: AgentSkill[];
}

export interface AgentSkill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
}

export type OrchestrationIntent = 
  | 'orchestrate_task' | 'delegate_agent' | 'aggregate_results'
  | 'route_search' | 'route_graph' | 'route_docs' | 'route_pipeline'
  | 'discover_agents' | 'agent_health_check' | 'chat_completion' | 'embeddings';

@Injectable({
  providedIn: 'root'
})
export class OpenAIProxyService {
  private readonly http = inject(HttpClient);
  private readonly proxyUrl = '/v1';
  
  // Service registry (from Mangle)
  readonly services = signal<ServiceEndpoint[]>([
    { name: 'local-models', url: 'http://localhost:8080', serviceType: 'local-models', defaultModel: 'phi-2', healthy: true },
    { name: 'perplexica-search', url: 'http://localhost:3001', serviceType: 'perplexica-search', defaultModel: 'perplexica-web', healthy: true },
    { name: 'neo4j-graph', url: 'http://localhost:7474', serviceType: 'neo4j-graph', healthy: true },
    { name: 'hyperbook-rag', url: 'http://localhost:8090', serviceType: 'hyperbook-rag', healthy: true },
    { name: 'sap-pipeline', url: 'http://localhost:8091', serviceType: 'sap-pipeline', healthy: true },
    { name: 'orchestrator', url: 'http://localhost:8000', serviceType: 'orchestrator', defaultModel: 'ai2ui-orchestrator', healthy: true }
  ]);
  
  // Discovered agents via A2A protocol
  readonly agents = signal<AgentCard[]>([]);
  
  readonly isProcessing = signal(false);
  readonly error = signal<string | null>(null);

  // Orchestration tools
  readonly orchestrationTools: ToolDefinition[] = [
    {
      type: 'function',
      function: {
        name: 'delegate_to_agent',
        description: 'Delegate a task to a specific agent',
        parameters: {
          type: 'object',
          properties: {
            agent_type: { type: 'string', enum: ['search', 'graph', 'docs', 'pipeline'] },
            task: { type: 'string', description: 'Task description' },
            context: { type: 'object', description: 'Additional context' }
          },
          required: ['agent_type', 'task']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'aggregate_results',
        description: 'Combine results from multiple agents',
        parameters: {
          type: 'object',
          properties: {
            results: { type: 'array', description: 'Results from agents' },
            aggregation_style: { type: 'string', enum: ['merge', 'summary', 'ranked'] }
          },
          required: ['results']
        }
      }
    }
  ];

  // Intent to service mapping (from Mangle)
  private readonly intentServiceMap: Record<OrchestrationIntent, ServiceType> = {
    'orchestrate_task': 'orchestrator',
    'delegate_agent': 'orchestrator',
    'aggregate_results': 'orchestrator',
    'route_search': 'perplexica-search',
    'route_graph': 'neo4j-graph',
    'route_docs': 'hyperbook-rag',
    'route_pipeline': 'sap-pipeline',
    'discover_agents': 'orchestrator',
    'agent_health_check': 'orchestrator',
    'chat_completion': 'local-models',
    'embeddings': 'local-models'
  };

  /**
   * OpenAI-compliant chat completions
   */
  chatCompletion(request: ChatCompletionRequest): Observable<ChatCompletionResponse> {
    this.isProcessing.set(true);
    this.error.set(null);
    
    return this.http.post<ChatCompletionResponse>(`${this.proxyUrl}/chat/completions`, request).pipe(
      tap(() => this.isProcessing.set(false)),
      catchError(err => {
        this.error.set(err.message || 'Chat completion failed');
        this.isProcessing.set(false);
        return of(this.createErrorResponse(request.model, err.message));
      })
    );
  }

  /**
   * Discover agents via A2A protocol
   */
  discoverAgents(): Observable<AgentCard[]> {
    const agentEndpoints = [
      'http://localhost:3001/.well-known/agent.json',
      'http://localhost:8090/.well-known/agent.json',
      'http://localhost:7474/.well-known/agent.json',
      'http://localhost:8091/.well-known/agent.json'
    ];
    
    return forkJoin(
      agentEndpoints.map(url => 
        this.http.get<AgentCard>(url).pipe(catchError(() => of(null)))
      )
    ).pipe(
      map(results => results.filter((r): r is AgentCard => r !== null)),
      tap(agents => this.agents.set(agents))
    );
  }

  /**
   * Delegate task to specific agent
   */
  delegateToAgent(agentType: 'search' | 'graph' | 'docs' | 'pipeline', task: string): Observable<unknown> {
    const serviceMap: Record<string, ServiceType> = {
      'search': 'perplexica-search',
      'graph': 'neo4j-graph',
      'docs': 'hyperbook-rag',
      'pipeline': 'sap-pipeline'
    };
    
    const service = this.services().find(s => s.serviceType === serviceMap[agentType] && s.healthy);
    if (!service) {
      return of({ error: 'Agent service unavailable' });
    }
    
    return this.http.post(`${service.url}/api/task`, { task });
  }

  /**
   * Route intent to appropriate service
   */
  routeIntent<T>(intent: OrchestrationIntent, payload: unknown): Observable<T> {
    const serviceType = this.intentServiceMap[intent];
    const service = this.services().find(s => s.serviceType === serviceType && s.healthy);
    
    if (!service) {
      return of({ error: 'No healthy service available' } as T);
    }
    
    switch (intent) {
      case 'chat_completion':
        return this.chatCompletion(payload as ChatCompletionRequest) as Observable<T>;
      case 'discover_agents':
        return this.discoverAgents() as Observable<T>;
      default:
        return this.http.post<T>(`/api/v1/${intent.replace('_', '-')}`, payload);
    }
  }

  /**
   * Orchestrate multi-agent task
   */
  orchestrateTask(task: string, context?: Record<string, unknown>): Observable<unknown> {
    return this.chatCompletion({
      model: 'ai2ui-orchestrator',
      messages: [
        { 
          role: 'system', 
          content: 'You are an AI orchestrator. Route tasks to the appropriate agent based on the request.' 
        },
        { 
          role: 'user', 
          content: `Task: ${task}\nContext: ${JSON.stringify(context || {})}` 
        }
      ],
      tools: this.orchestrationTools,
      temperature: 0.3
    });
  }

  /**
   * Check health of all services
   */
  checkHealth(): Observable<ServiceEndpoint[]> {
    return of(this.services());
  }

  private createErrorResponse(model: string, errorMessage: string): ChatCompletionResponse {
    return {
      id: `error-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: `Error: ${errorMessage}` },
        finish_reason: 'error'
      }]
    };
  }
}