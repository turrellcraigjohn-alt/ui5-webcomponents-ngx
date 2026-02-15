/**
 * OpenAI-Compliant Proxy Service
 * Bidirectional A2A routing for Neo4j MCP Console
 * Routes to local models, Neo4j graph services, or MCP servers
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

export type ServiceType = 'local-models' | 'neo4j-graph' | 'mcp-server' | 'sap-aicore';

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

export type GraphIntent = 
  | 'get_schema' | 'execute_cypher' | 'run_gds_algorithm'
  | 'similarity_search' | 'graph_visualization' | 'path_finding'
  | 'node_embedding' | 'community_detection' | 'centrality_analysis'
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
    { name: 'neo4j-graph', url: 'http://localhost:7474', serviceType: 'neo4j-graph', healthy: true },
    { name: 'mcp-server', url: 'http://localhost:3000', serviceType: 'mcp-server', healthy: true },
    { name: 'sap-aicore', url: 'https://api.ai.core.sap', serviceType: 'sap-aicore', healthy: false }
  ]);
  
  // Discovered models
  readonly models = signal<ModelInfo[]>([
    { id: 'phi-2', object: 'model', created: 1700000000, owned_by: 'local-models' },
    { id: 'gemma-3-270m-it', object: 'model', created: 1700000000, owned_by: 'local-models' },
    { id: 'all-MiniLM-L6-v2', object: 'model', created: 1700000000, owned_by: 'local-models' }
  ]);
  
  readonly isProcessing = signal(false);
  readonly error = signal<string | null>(null);

  // Graph tool definitions
  readonly graphTools: ToolDefinition[] = [
    {
      type: 'function',
      function: {
        name: 'get_schema',
        description: 'Get the database schema including node labels, relationship types, and properties',
        parameters: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name (default: neo4j)' }
          }
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'execute_cypher',
        description: 'Execute a Cypher query against the Neo4j database',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Cypher query to execute' },
            database: { type: 'string', description: 'Database name' },
            parameters: { type: 'object', description: 'Query parameters' }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'run_gds_algorithm',
        description: 'Run a Graph Data Science algorithm',
        parameters: {
          type: 'object',
          properties: {
            algorithm: { type: 'string', description: 'Algorithm name (pagerank, louvain, shortestPath, etc.)' },
            projection: { type: 'string', description: 'Graph projection name' },
            config: { type: 'object', description: 'Algorithm configuration' }
          },
          required: ['algorithm']
        }
      }
    }
  ];

  // Intent to service mapping
  private readonly intentServiceMap: Record<GraphIntent, ServiceType> = {
    'get_schema': 'neo4j-graph',
    'execute_cypher': 'neo4j-graph',
    'run_gds_algorithm': 'neo4j-graph',
    'similarity_search': 'neo4j-graph',
    'graph_visualization': 'neo4j-graph',
    'path_finding': 'neo4j-graph',
    'node_embedding': 'local-models',
    'community_detection': 'neo4j-graph',
    'centrality_analysis': 'neo4j-graph',
    'chat_completion': 'local-models',
    'embeddings': 'local-models'
  };

  /**
   * OpenAI-compliant chat completions with graph tools
   */
  chatCompletion(request: ChatCompletionRequest): Observable<ChatCompletionResponse> {
    this.isProcessing.set(true);
    this.error.set(null);
    
    // Add graph tools if not provided
    const enhancedRequest = {
      ...request,
      tools: request.tools || this.graphTools
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
  routeIntent<T>(intent: GraphIntent, payload: unknown): Observable<T> {
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
   * Natural language to Cypher
   */
  naturalLanguageToCypher(question: string): Observable<string> {
    return this.chatCompletion({
      model: 'phi-2',
      messages: [
        { 
          role: 'system', 
          content: 'You are a Cypher query expert. Convert natural language to Cypher queries for Neo4j. Return only the Cypher query, no explanation.' 
        },
        { role: 'user', content: question }
      ],
      temperature: 0.2
    }).pipe(
      map(response => response.choices[0]?.message.content || '')
    );
  }

  /**
   * Explain query results
   */
  explainResults(query: string, results: unknown): Observable<string> {
    return this.chatCompletion({
      model: 'phi-2',
      messages: [
        { 
          role: 'system', 
          content: 'You are a data analyst. Explain graph database query results in plain language.' 
        },
        { role: 'user', content: `Query: ${query}\n\nResults: ${JSON.stringify(results, null, 2)}\n\nExplain these results.` }
      ],
      temperature: 0.5
    }).pipe(
      map(response => response.choices[0]?.message.content || '')
    );
  }

  /**
   * Suggest graph exploration
   */
  suggestExploration(schema: unknown, context?: string): Observable<string[]> {
    const prompt = context
      ? `Given this schema and context "${context}", suggest 5 interesting queries to explore:`
      : 'Given this schema, suggest 5 interesting queries to explore:';
    
    return this.chatCompletion({
      model: 'phi-2',
      messages: [
        { 
          role: 'system', 
          content: 'You are a graph database expert. Suggest interesting Cypher queries based on the schema.' 
        },
        { role: 'user', content: `${prompt}\n\nSchema: ${JSON.stringify(schema, null, 2)}` }
      ],
      temperature: 0.7
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