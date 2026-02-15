/**
 * Search Service
 * Integrates with Elasticsearch backend for advanced full-text search
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { Subject } from 'rxjs';

export interface SearchHit {
  id: string;
  score: number;
  bookId: string;
  pagePath: string;
  title: string;
  contentSnippet: string;
  section?: string;
  highlights?: Record<string, string[]>;
}

export interface SearchResponse {
  total: number;
  hits: SearchHit[];
  tookMs: number;
  suggestions?: Suggestion[];
  aggregations?: Record<string, AggregationResult>;
}

export interface Suggestion {
  text: string;
  score: number;
  frequency: number;
}

export interface AggregationResult {
  buckets: AggregationBucket[];
}

export interface AggregationBucket {
  key: string;
  docCount: number;
}

export interface SearchRequest {
  query: string;
  bookId?: string;
  fields?: string[];
  from?: number;
  size?: number;
  highlight?: boolean;
  suggest?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1';
  
  // Search state signals
  readonly isSearching = signal(false);
  readonly lastSearchResults = signal<SearchResponse | null>(null);
  readonly suggestions = signal<Suggestion[]>([]);
  readonly searchError = signal<string | null>(null);
  
  // Debounced search subject for autocomplete
  private searchSubject = new Subject<string>();
  
  constructor() {
    // Set up debounced suggestions
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length < 2) {
          return of({ suggestions: [] });
        }
        return this.getSuggestions(query);
      })
    ).subscribe(result => {
      this.suggestions.set(result.suggestions || []);
    });
  }

  /**
   * Full-text search across all books using Elasticsearch
   */
  search(request: SearchRequest): Observable<SearchResponse> {
    this.isSearching.set(true);
    this.searchError.set(null);
    
    return this.http.post<SearchResponse>(`${this.apiUrl}/search`, {
      query: request.query,
      book_id: request.bookId,
      fields: request.fields,
      from: request.from || 0,
      size: request.size || 20,
      highlight: request.highlight ?? true,
      suggest: request.suggest ?? false
    }).pipe(
      tap(response => {
        this.lastSearchResults.set(response);
        this.isSearching.set(false);
      }),
      catchError(error => {
        this.searchError.set(error.message || 'Search failed');
        this.isSearching.set(false);
        return of({
          total: 0,
          hits: [],
          tookMs: 0
        });
      })
    );
  }

  /**
   * Search within a specific book
   */
  searchBook(bookId: string, query: string, options?: Partial<SearchRequest>): Observable<SearchResponse> {
    return this.search({
      query,
      bookId,
      ...options
    });
  }

  /**
   * Get autocomplete suggestions
   */
  getSuggestions(prefix: string, bookId?: string): Observable<{ suggestions: Suggestion[] }> {
    const params: Record<string, string> = { prefix };
    if (bookId) {
      params['book_id'] = bookId;
    }
    
    return this.http.get<{ suggestions: Suggestion[] }>(`${this.apiUrl}/search/suggest`, { params }).pipe(
      catchError(() => of({ suggestions: [] }))
    );
  }

  /**
   * Trigger debounced suggestion lookup
   */
  lookupSuggestions(query: string): void {
    this.searchSubject.next(query);
  }

  /**
   * Clear search state
   */
  clearSearch(): void {
    this.lastSearchResults.set(null);
    this.suggestions.set([]);
    this.searchError.set(null);
  }

  /**
   * Index book content (admin)
   */
  indexBook(bookId: string): Observable<{ indexed: number; failed: number; tookMs: number }> {
    return this.http.post<{ indexed: number; failed: number; tookMs: number }>(
      `${this.apiUrl}/admin/index/${bookId}`,
      {}
    );
  }

  /**
   * Delete book index (admin)
   */
  deleteBookIndex(bookId: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(
      `${this.apiUrl}/admin/index/${bookId}`
    );
  }

  /**
   * Highlight matching text in content
   */
  highlightText(content: string, query: string): string {
    if (!query) return content;
    
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    let result = content;
    
    for (const term of terms) {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      result = result.replace(regex, '<mark>$1</mark>');
    }
    
    return result;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Parse Elasticsearch-style query string
   * Supports: AND, OR, NOT, "phrase", field:value
   */
  parseQuery(queryString: string): { terms: string[]; phrases: string[]; fieldQueries: Record<string, string> } {
    const terms: string[] = [];
    const phrases: string[] = [];
    const fieldQueries: Record<string, string> = {};
    
    // Extract phrases
    const phraseRegex = /"([^"]+)"/g;
    let match;
    let remaining = queryString;
    
    while ((match = phraseRegex.exec(queryString)) !== null) {
      phrases.push(match[1]);
      remaining = remaining.replace(match[0], '');
    }
    
    // Extract field:value queries
    const fieldRegex = /(\w+):(\w+)/g;
    while ((match = fieldRegex.exec(remaining)) !== null) {
      fieldQueries[match[1]] = match[2];
      remaining = remaining.replace(match[0], '');
    }
    
    // Extract remaining terms (excluding operators)
    const words = remaining.split(/\s+/).filter(w => 
      w && !['AND', 'OR', 'NOT'].includes(w.toUpperCase())
    );
    terms.push(...words);
    
    return { terms, phrases, fieldQueries };
  }
}