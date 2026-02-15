/**
 * AI Service
 * Integrates with local LLM backend (rustshimmy-be-log-local-models)
 * for AI-powered summarization, Q&A, and content analysis.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';

export type SummarizeStyle = 'brief' | 'standard' | 'detailed' | 'bullet';

export interface SummarizeRequest {
  content: string;
  bookId?: string;
  pagePath?: string;
  style?: SummarizeStyle;
  maxLength?: number;
}

export interface SummarizeResponse {
  summary: string;
  keyPoints?: string[];
  wordCount: number;
  modelUsed: string;
}

export interface QARequest {
  question: string;
  context: string;
  bookId?: string;
  includeCitations?: boolean;
}

export interface Citation {
  pagePath: string;
  snippet: string;
  relevance: number;
}

export interface QAResponse {
  answer: string;
  confidence: number;
  citations?: Citation[];
  modelUsed: string;
}

export interface KeyPoint {
  point: string;
  explanation?: string;
  importance: number;
}

export interface KeyPointsRequest {
  content: string;
  maxPoints?: number;
  includeExplanations?: boolean;
}

export interface KeyPointsResponse {
  points: KeyPoint[];
  modelUsed: string;
}

export interface GeneratedTerm {
  term: string;
  definition: string;
  confidence: number;
}

export interface GlossaryGenRequest {
  content: string;
  existingTerms?: string[];
  maxTerms?: number;
}

export interface GlossaryGenResponse {
  terms: GeneratedTerm[];
  modelUsed: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  sizeBytes: number;
  quantization?: string;
  capabilities: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/ai';
  
  // State signals
  readonly isProcessing = signal(false);
  readonly lastSummary = signal<SummarizeResponse | null>(null);
  readonly lastAnswer = signal<QAResponse | null>(null);
  readonly lastKeyPoints = signal<KeyPointsResponse | null>(null);
  readonly availableModels = signal<ModelInfo[]>([]);
  readonly error = signal<string | null>(null);

  /**
   * Summarize content using local LLM
   */
  summarize(request: SummarizeRequest): Observable<SummarizeResponse> {
    this.isProcessing.set(true);
    this.error.set(null);
    
    return this.http.post<SummarizeResponse>(`${this.apiUrl}/summarize`, {
      content: request.content,
      book_id: request.bookId,
      page_path: request.pagePath,
      style: request.style || 'standard',
      max_length: request.maxLength
    }).pipe(
      tap(response => {
        this.lastSummary.set(response);
        this.isProcessing.set(false);
      }),
      catchError(err => {
        this.error.set(err.message || 'Summarization failed');
        this.isProcessing.set(false);
        return of({
          summary: 'Unable to generate summary',
          wordCount: 0,
          modelUsed: 'none'
        });
      })
    );
  }

  /**
   * Ask a question about content
   */
  askQuestion(request: QARequest): Observable<QAResponse> {
    this.isProcessing.set(true);
    this.error.set(null);
    
    return this.http.post<QAResponse>(`${this.apiUrl}/ask`, {
      question: request.question,
      context: request.context,
      book_id: request.bookId,
      include_citations: request.includeCitations
    }).pipe(
      tap(response => {
        this.lastAnswer.set(response);
        this.isProcessing.set(false);
      }),
      catchError(err => {
        this.error.set(err.message || 'Q&A failed');
        this.isProcessing.set(false);
        return of({
          answer: 'Unable to answer question',
          confidence: 0,
          modelUsed: 'none'
        });
      })
    );
  }

  /**
   * Extract key points from content
   */
  extractKeyPoints(request: KeyPointsRequest): Observable<KeyPointsResponse> {
    this.isProcessing.set(true);
    this.error.set(null);
    
    return this.http.post<KeyPointsResponse>(`${this.apiUrl}/keypoints`, {
      content: request.content,
      max_points: request.maxPoints || 5,
      include_explanations: request.includeExplanations
    }).pipe(
      tap(response => {
        this.lastKeyPoints.set(response);
        this.isProcessing.set(false);
      }),
      catchError(err => {
        this.error.set(err.message || 'Key points extraction failed');
        this.isProcessing.set(false);
        return of({
          points: [],
          modelUsed: 'none'
        });
      })
    );
  }

  /**
   * Generate glossary terms from content
   */
  generateGlossary(request: GlossaryGenRequest): Observable<GlossaryGenResponse> {
    this.isProcessing.set(true);
    this.error.set(null);
    
    return this.http.post<GlossaryGenResponse>(`${this.apiUrl}/glossary`, {
      content: request.content,
      existing_terms: request.existingTerms,
      max_terms: request.maxTerms || 10
    }).pipe(
      tap(() => this.isProcessing.set(false)),
      catchError(err => {
        this.error.set(err.message || 'Glossary generation failed');
        this.isProcessing.set(false);
        return of({
          terms: [],
          modelUsed: 'none'
        });
      })
    );
  }

  /**
   * Get available AI models
   */
  getModels(): Observable<ModelInfo[]> {
    return this.http.get<ModelInfo[]>(`${this.apiUrl}/models`).pipe(
      tap(models => this.availableModels.set(models)),
      catchError(() => of([]))
    );
  }

  /**
   * Quick summarize for page content
   */
  summarizePage(bookId: string, pagePath: string, content: string, style: SummarizeStyle = 'standard'): Observable<SummarizeResponse> {
    return this.summarize({
      content,
      bookId,
      pagePath,
      style
    });
  }

  /**
   * Explain a concept in simpler terms
   */
  explainConcept(concept: string, context: string): Observable<QAResponse> {
    return this.askQuestion({
      question: `Explain the following concept in simple terms: ${concept}`,
      context,
      includeCitations: false
    });
  }

  /**
   * Generate study questions from content
   */
  generateStudyQuestions(content: string, count: number = 5): Observable<KeyPointsResponse> {
    const wrappedContent = `Generate ${count} study questions based on this content:\n\n${content}`;
    return this.http.post<KeyPointsResponse>(`${this.apiUrl}/keypoints`, {
      content: wrappedContent,
      max_points: count,
      include_explanations: true
    });
  }

  /**
   * Clear all cached responses
   */
  clearCache(): void {
    this.lastSummary.set(null);
    this.lastAnswer.set(null);
    this.lastKeyPoints.set(null);
    this.error.set(null);
  }
}