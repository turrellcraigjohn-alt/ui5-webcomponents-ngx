/**
 * RAG Service
 * Integrates with langhana-be-po-pipeline-service for semantic search
 * using HANA Cloud Vector Engine with MMR diversification.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

export type DistanceStrategy = 'cosine' | 'euclidean';

export interface SearchFilter {
  pagePaths?: string[];
  sections?: string[];
  keywords?: string[];
}

export interface SimilaritySearchRequest {
  query: string;
  bookId?: string;
  k?: number;
  filter?: SearchFilter;
  scoreThreshold?: number;
}

export interface ScoredDocument {
  id: string;
  content: string;
  bookId: string;
  pagePath: string;
  score: number;
  metadata?: {
    title?: string;
    section?: string;
    keywords?: string[];
  };
}

export interface SimilaritySearchResult {
  documents: ScoredDocument[];
  queryEmbedding?: number[];
  totalFound: number;
}

export interface MMRSearchRequest {
  query: string;
  bookId?: string;
  k?: number;
  fetchK?: number;
  lambdaMult?: number; // 0 = max diversity, 1 = max relevance
  filter?: SearchFilter;
}

export interface SourceDocument {
  pagePath: string;
  title?: string;
  snippet: string;
  score: number;
}

export interface RAGQuestionRequest {
  question: string;
  bookId?: string;
  k?: number;
  useMmr?: boolean;
  lambdaMult?: number;
  includeSources?: boolean;
}

export interface RAGQuestionResponse {
  answer: string;
  sources?: SourceDocument[];
  confidence: number;
  modelUsed: string;
}

export interface IndexRequest {
  bookId: string;
  overwrite?: boolean;
  embeddingModel?: string;
}

export interface IndexResponse {
  documentsIndexed: number;
  chunksCreated: number;
  timeMs: number;
  tableName: string;
}

export interface RAGStats {
  totalDocuments: number;
  totalChunks: number;
  indexSizeBytes: number;
  lastIndexed?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RAGService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/rag';
  
  // State signals
  readonly isSearching = signal(false);
  readonly lastSearchResult = signal<SimilaritySearchResult | null>(null);
  readonly lastRAGAnswer = signal<RAGQuestionResponse | null>(null);
  readonly indexStats = signal<Record<string, RAGStats>>({});
  readonly error = signal<string | null>(null);

  /**
   * Perform semantic similarity search
   */
  similaritySearch(request: SimilaritySearchRequest): Observable<SimilaritySearchResult> {
    this.isSearching.set(true);
    this.error.set(null);
    
    return this.http.post<SimilaritySearchResult>(`${this.apiUrl}/similarity`, {
      query: request.query,
      book_id: request.bookId,
      k: request.k || 5,
      filter: request.filter,
      score_threshold: request.scoreThreshold
    }).pipe(
      tap(result => {
        this.lastSearchResult.set(result);
        this.isSearching.set(false);
      }),
      catchError(err => {
        this.error.set(err.message || 'Similarity search failed');
        this.isSearching.set(false);
        return of({ documents: [], totalFound: 0 });
      })
    );
  }

  /**
   * Perform MMR (Maximal Marginal Relevance) search for diverse results
   */
  mmrSearch(request: MMRSearchRequest): Observable<SimilaritySearchResult> {
    this.isSearching.set(true);
    this.error.set(null);
    
    return this.http.post<SimilaritySearchResult>(`${this.apiUrl}/mmr`, {
      query: request.query,
      book_id: request.bookId,
      k: request.k || 5,
      fetch_k: request.fetchK || 20,
      lambda_mult: request.lambdaMult ?? 0.5,
      filter: request.filter
    }).pipe(
      tap(result => {
        this.lastSearchResult.set(result);
        this.isSearching.set(false);
      }),
      catchError(err => {
        this.error.set(err.message || 'MMR search failed');
        this.isSearching.set(false);
        return of({ documents: [], totalFound: 0 });
      })
    );
  }

  /**
   * Answer a question using RAG (Retrieval Augmented Generation)
   */
  askQuestion(request: RAGQuestionRequest): Observable<RAGQuestionResponse> {
    this.isSearching.set(true);
    this.error.set(null);
    
    return this.http.post<RAGQuestionResponse>(`${this.apiUrl}/ask`, {
      question: request.question,
      book_id: request.bookId,
      k: request.k || 5,
      use_mmr: request.useMmr ?? true,
      lambda_mult: request.lambdaMult ?? 0.5,
      include_sources: request.includeSources ?? true
    }).pipe(
      tap(response => {
        this.lastRAGAnswer.set(response);
        this.isSearching.set(false);
      }),
      catchError(err => {
        this.error.set(err.message || 'RAG question failed');
        this.isSearching.set(false);
        return of({
          answer: 'Unable to answer question',
          confidence: 0,
          modelUsed: 'none'
        });
      })
    );
  }

  /**
   * Index a book for RAG search
   */
  indexBook(request: IndexRequest): Observable<IndexResponse> {
    return this.http.post<IndexResponse>(`${this.apiUrl}/index/${request.bookId}`, {
      overwrite: request.overwrite || false,
      embedding_model: request.embeddingModel
    }).pipe(
      catchError(err => {
        this.error.set(err.message || 'Indexing failed');
        return of({
          documentsIndexed: 0,
          chunksCreated: 0,
          timeMs: 0,
          tableName: ''
        });
      })
    );
  }

  /**
   * Delete RAG index for a book
   */
  deleteIndex(bookId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/index/${bookId}`).pipe(
      catchError(() => of({ success: false }))
    );
  }

  /**
   * Get RAG stats for a book
   */
  getStats(bookId: string): Observable<RAGStats> {
    return this.http.get<RAGStats>(`${this.apiUrl}/stats/${bookId}`).pipe(
      tap(stats => {
        this.indexStats.update(current => ({ ...current, [bookId]: stats }));
      }),
      catchError(() => of({
        totalDocuments: 0,
        totalChunks: 0,
        indexSizeBytes: 0
      }))
    );
  }

  /**
   * Find similar pages to a given page
   */
  findSimilarPages(bookId: string, pagePath: string, k: number = 5): Observable<ScoredDocument[]> {
    return this.http.post<{ documents: ScoredDocument[] }>(`${this.apiUrl}/similar-pages`, {
      book_id: bookId,
      page_path: pagePath,
      k
    }).pipe(
      map(result => result.documents),
      catchError(() => of([] as ScoredDocument[]))
    );
  }

  /**
   * Smart search - uses MMR if query looks like it needs diversity
   */
  smartSearch(query: string, bookId?: string, k: number = 5): Observable<SimilaritySearchResult> {
    // Use MMR for longer queries that may have multiple aspects
    const useMmr = query.split(' ').length > 3 || query.includes(' and ') || query.includes(' or ');
    
    if (useMmr) {
      return this.mmrSearch({
        query,
        bookId,
        k,
        fetchK: k * 4,
        lambdaMult: 0.6
      });
    } else {
      return this.similaritySearch({
        query,
        bookId,
        k
      });
    }
  }

  /**
   * Find related content across books
   */
  findRelatedContent(content: string, excludeBookId?: string, k: number = 10): Observable<ScoredDocument[]> {
    return this.similaritySearch({
      query: content,
      k,
      scoreThreshold: 0.7
    }).pipe(
      map(result => {
        let docs = result.documents;
        if (excludeBookId) {
          docs = docs.filter(d => d.bookId !== excludeBookId);
        }
        return docs;
      }),
      catchError(() => of([] as ScoredDocument[]))
    );
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.lastSearchResult.set(null);
    this.lastRAGAnswer.set(null);
    this.error.set(null);
  }
}