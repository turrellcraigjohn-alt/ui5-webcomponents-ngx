/**
 * OpenAI-Compliant Proxy Service
 * Bidirectional A2A routing for Perplexica Search Console
 * Routes to local models, SearxNG, or Perplexica search backends
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

export type ServiceType = 'local-models' | 'perplexica-search' | 'searxng' | 'sap-aicore';

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

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
}

export type SearchIntent = 
  | 'web_search' | 'academic_search' | 'youtube_search' | 'reddit_search'
  | 'wolfram_query' | 'writing_assist' | 'summarize_results' | 'cite_sources'
  | 'chat_completion' | 'embeddings';

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
    { name: 'searxng', url: 'http://localhost:8888', serviceType: 'searxng', healthy: true },
    { name: 'sap-aicore', url: 'https://api.ai.core.sap', serviceType: 'sap-aicore', healthy: false }
  ]);
  
  readonly isProcessing = signal(false);
  readonly error = signal<string | null>(null);

  // Search tool definitions
  readonly searchTools: ToolDefinition[] = [
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for information with citations',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            focus_mode: { type: 'string', enum: ['webSearch', 'academicSearch', 'writingAssistant', 'youtubeSearch', 'redditSearch'] }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'summarize_results',
        description: 'Summarize search results with citations',
        parameters: {
          type: 'object',
          properties: {
            results: { type: 'array', description: 'Search results to summarize' },
            style: { type: 'string', enum: ['brief', 'detailed', 'bullet'] }
          },
          required: ['results']
        }
      }
    }
  ];

  // Intent to service mapping (from Mangle)
  private readonly intentServiceMap: Record<SearchIntent, ServiceType> = {
    'web_search': 'perplexica-search',
    'academic_search': 'perplexica-search',
    'youtube_search': 'perplexica-search',
    'reddit_search': 'perplexica-search',
    'wolfram_query': 'perplexica-search',
    'writing_assist': 'perplexica-search',
    'summarize_results': 'local-models',
    'cite_sources': 'perplexica-search',
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
   * Perform search with specified focus mode
   */
  search(query: string, focusMode: string = 'webSearch'): Observable<SearchResult[]> {
    this.isProcessing.set(true);
    
    return this.http.post<{ results: SearchResult[] }>('/api/search', { query, focusMode }).pipe(
      map(response => response.results),
      tap(() => this.isProcessing.set(false)),
      catchError(err => {
        this.error.set(err.message || 'Search failed');
        this.isProcessing.set(false);
        return of([]);
      })
    );
  }

  /**
   * Summarize search results
   */
  summarizeResults(results: SearchResult[], style: string = 'detailed'): Observable<string> {
    return this.chatCompletion({
      model: 'phi-2',
      messages: [
        { 
          role: 'system', 
          content: 'You are a research assistant. Summarize search results concisely with citations.' 
        },
        { 
          role: 'user', 
          content: `Summarize these search results in ${style} style:\n\n${JSON.stringify(results, null, 2)}` 
        }
      ],
      temperature: 0.5
    }).pipe(
      map(response => response.choices[0]?.message.content || '')
    );
  }

  /**
   * Route intent to appropriate service
   */
  routeIntent<T>(intent: SearchIntent, payload: unknown): Observable<T> {
    const serviceType = this.intentServiceMap[intent];
    const service = this.services().find(s => s.serviceType === serviceType && s.healthy);
    
    if (!service) {
      return of({ error: 'No healthy service available' } as T);
    }
    
    switch (intent) {
      case 'chat_completion':
        return this.chatCompletion(payload as ChatCompletionRequest) as Observable<T>;
      case 'web_search':
      case 'academic_search':
      case 'youtube_search':
      case 'reddit_search':
        const searchPayload = payload as { query: string; focusMode?: string };
        return this.search(searchPayload.query, searchPayload.focusMode) as Observable<T>;
      default:
        return this.http.post<T>(`/api/v1/${intent.replace('_', '-')}`, payload);
    }
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