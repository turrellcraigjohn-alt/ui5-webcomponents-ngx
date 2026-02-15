/**
 * OpenAI-Compliant Proxy Service
 * Bidirectional A2A routing for Hyperbook
 * Routes to local models, HANA RAG, or external services
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap, switchMap } from 'rxjs';

export type ServiceType = 'local-models' | 'hana-rag' | 'elastic-search' | 'sap-aicore';

export interface ServiceEndpoint {
  name: string;
  url: string;
  serviceType: ServiceType;
  defaultModel?: string;
  healthy: boolean;
  lastCheck?: Date;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
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

export type HyperbookIntent = 
  | 'summarize_page' | 'summarize_book' | 'extract_keypoints'
  | 'ask_question' | 'explain_concept' | 'generate_study_questions'
  | 'similarity_search' | 'mmr_search' | 'fulltext_search'
  | 'generate_glossary' | 'define_term'
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
    { name: 'hana-rag', url: 'http://localhost:8090', serviceType: 'hana-rag', healthy: true },
    { name: 'elastic-search', url: 'http://localhost:9200', serviceType: 'elastic-search', healthy: true },
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

  // Intent to service mapping
  private readonly intentServiceMap: Record<HyperbookIntent, ServiceType> = {
    'summarize_page': 'local-models',
    'summarize_book': 'local-models',
    'extract_keypoints': 'local-models',
    'ask_question': 'hana-rag',
    'explain_concept': 'local-models',
    'generate_study_questions': 'local-models',
    'similarity_search': 'hana-rag',
    'mmr_search': 'hana-rag',
    'fulltext_search': 'elastic-search',
    'generate_glossary': 'local-models',
    'define_term': 'local-models',
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
  routeIntent<T>(intent: HyperbookIntent, payload: unknown): Observable<T> {
    const serviceType = this.intentServiceMap[intent];
    const service = this.services().find(s => s.serviceType === serviceType && s.healthy);
    
    if (!service) {
      // Try fallback
      const fallback = this.services().find(s => s.serviceType === 'local-models' && s.healthy);
      if (!fallback) {
        return of({ error: 'No healthy service available' } as T);
      }
    }
    
    // Route to appropriate endpoint
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
   * Summarize content
   */
  summarize(content: string, style: 'brief' | 'standard' | 'detailed' | 'bullet' = 'standard'): Observable<string> {
    const systemPrompts: Record<string, string> = {
      brief: 'You are a helpful assistant. Provide a 1-2 sentence summary.',
      standard: 'You are a helpful assistant. Provide a concise paragraph summary.',
      detailed: 'You are a helpful assistant. Provide a detailed multi-paragraph summary.',
      bullet: 'You are a helpful assistant. Provide the summary as bullet points.'
    };
    
    const maxTokens: Record<string, number> = {
      brief: 100,
      standard: 256,
      detailed: 512,
      bullet: 300
    };
    
    return this.chatCompletion({
      model: 'phi-2',
      messages: [
        { role: 'system', content: systemPrompts[style] },
        { role: 'user', content: `Summarize: ${content}` }
      ],
      max_tokens: maxTokens[style],
      temperature: 0.7
    }).pipe(
      map(response => response.choices[0]?.message.content || '')
    );
  }

  /**
   * Q&A with context (RAG-style)
   */
  askWithContext(question: string, context: string): Observable<string> {
    return this.chatCompletion({
      model: 'phi-2',
      messages: [
        { role: 'system', content: 'Answer based on the provided context. If the answer is not in the context, say so.' },
        { role: 'user', content: `Context: ${context}\n\nQuestion: ${question}` }
      ],
      temperature: 0.3
    }).pipe(
      map(response => response.choices[0]?.message.content || '')
    );
  }

  /**
   * Extract key points
   */
  extractKeyPoints(content: string, maxPoints: number = 5): Observable<string[]> {
    return this.chatCompletion({
      model: 'phi-2',
      messages: [
        { role: 'system', content: `Extract exactly ${maxPoints} key points from the text. Return as a numbered list.` },
        { role: 'user', content: content }
      ],
      temperature: 0.3
    }).pipe(
      map(response => {
        const text = response.choices[0]?.message.content || '';
        return text.split('\n').filter(line => line.trim().length > 0);
      })
    );
  }

  /**
   * Generate glossary term definition
   */
  defineTerm(term: string, context?: string): Observable<string> {
    const prompt = context 
      ? `Define the term "${term}" in the context of: ${context}`
      : `Provide a clear definition for the term: ${term}`;
    
    return this.chatCompletion({
      model: 'phi-2',
      messages: [
        { role: 'system', content: 'You are a knowledgeable assistant. Provide clear, concise definitions.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 200
    }).pipe(
      map(response => response.choices[0]?.message.content || '')
    );
  }

  /**
   * Check health of all services
   */
  checkHealth(): Observable<ServiceEndpoint[]> {
    const services = this.services();
    // Would check each service's /health endpoint
    return of(services);
  }

  /**
   * Resolve model to service
   */
  resolveModelService(modelId: string): ServiceType {
    // Pattern-based routing
    if (modelId.startsWith('phi-') || modelId.startsWith('gemma-') || modelId.includes('MiniLM')) {
      return 'local-models';
    }
    if (modelId.startsWith('gpt-') || modelId.startsWith('text-embedding')) {
      return 'sap-aicore';
    }
    return 'local-models';
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