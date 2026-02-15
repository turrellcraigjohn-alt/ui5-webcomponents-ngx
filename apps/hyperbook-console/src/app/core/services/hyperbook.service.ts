import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  BookSummary,
  ListBooksResponse,
  Navigation,
  GetNavigationResponse,
  HyperbookPage,
  GetPageResponse,
  SearchResponse,
  HealthResponse,
  TocEntry,
  Glossary,
  ConnectionState
} from '../models/hyperbook.model';

export interface StatusBanner {
  design: 'Positive' | 'Warning' | 'Information' | 'Negative';
  message: string;
  showAction: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HyperbookService {
  private apiBaseUrl = 'http://localhost:3000/api/v1';

  // Connection state management (matching other console apps)
  private connectionStateSubject = new BehaviorSubject<ConnectionState>('disconnected');
  public connectionState$ = this.connectionStateSubject.asObservable();

  private connectionErrorSubject = new BehaviorSubject<string>('');
  public connectionError$ = this.connectionErrorSubject.asObservable();

  private serviceInfoSubject = new BehaviorSubject<HealthResponse | null>(null);
  public serviceInfo$ = this.serviceInfoSubject.asObservable();

  private booksSubject = new BehaviorSubject<BookSummary[]>([]);
  public books$ = this.booksSubject.asObservable();

  private currentBookSubject = new BehaviorSubject<BookSummary | null>(null);
  public currentBook$ = this.currentBookSubject.asObservable();

  private navigationSubject = new BehaviorSubject<Navigation | null>(null);
  public navigation$ = this.navigationSubject.asObservable();

  private currentPageSubject = new BehaviorSubject<HyperbookPage | null>(null);
  public currentPage$ = this.currentPageSubject.asObservable();

  private glossarySubject = new BehaviorSubject<Glossary>({});
  public glossary$ = this.glossarySubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get current connection state
   */
  get state(): ConnectionState {
    return this.connectionStateSubject.value;
  }

  /**
   * Configure the API base URL
   */
  setApiBaseUrl(url: string): void {
    this.apiBaseUrl = url;
  }

  /**
   * Check connection to the Hyperbook service
   */
  checkConnection(): void {
    this.connectionStateSubject.next('connecting');
    this.connectionErrorSubject.next('');

    this.checkHealth().subscribe({
      next: (response) => {
        if (response.status === 'healthy') {
          this.connectionStateSubject.next('connected');
          this.serviceInfoSubject.next(response);
        } else {
          this.connectionStateSubject.next('error');
          this.connectionErrorSubject.next('Service is unhealthy');
        }
      },
      error: (err) => {
        this.connectionStateSubject.next('error');
        this.connectionErrorSubject.next(err.message || 'Connection failed');
      }
    });
  }

  /**
   * Check server health
   */
  checkHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.apiBaseUrl.replace('/api/v1', '')}/health`).pipe(
      catchError(() => of({
        status: 'unhealthy' as const,
        service: { name: 'hyperbook-server', version: '0.0.0', stack: 'unknown' },
        uptimeSeconds: 0
      }))
    );
  }

  /**
   * Build status banner from connection state (matching pattern from neo4jmcp)
   */
  buildStatusBanner(state: ConnectionState): StatusBanner {
    switch (state) {
      case 'connected':
        return {
          design: 'Positive',
          message: `Connected to Hyperbook service`,
          showAction: false
        };
      case 'connecting':
        return {
          design: 'Information',
          message: 'Connecting to Hyperbook service...',
          showAction: false
        };
      case 'error':
        return {
          design: 'Negative',
          message: `Connection error: ${this.connectionErrorSubject.value || 'Unknown error'}`,
          showAction: true
        };
      case 'disconnected':
      default:
        return {
          design: 'Warning',
          message: 'Not connected to Hyperbook service.',
          showAction: true
        };
    }
  }

  /**
   * Load available books
   */
  loadBooks(): Observable<BookSummary[]> {
    return this.http.get<ListBooksResponse>(`${this.apiBaseUrl}/books`).pipe(
      map(response => response.books),
      tap(books => this.booksSubject.next(books)),
      catchError(() => {
        console.error('Failed to load books');
        return of([]);
      })
    );
  }

  /**
   * Select a book as current
   */
  selectBook(book: BookSummary): void {
    this.currentBookSubject.next(book);
    this.loadNavigation(book.id).subscribe();
  }

  /**
   * Load navigation for a book
   */
  loadNavigation(bookId: string): Observable<Navigation | null> {
    return this.http.get<GetNavigationResponse>(`${this.apiBaseUrl}/books/${bookId}/navigation`).pipe(
      tap(response => {
        this.navigationSubject.next(response.navigation);
        this.glossarySubject.next(response.glossary);
      }),
      map(response => response.navigation),
      catchError(() => {
        console.error('Failed to load navigation');
        return of(null);
      })
    );
  }

  /**
   * Load a specific page
   */
  loadPage(bookId: string, pagePath: string): Observable<GetPageResponse | null> {
    const encodedPath = encodeURIComponent(pagePath);
    return this.http.get<GetPageResponse>(`${this.apiBaseUrl}/books/${bookId}/pages/${encodedPath}`).pipe(
      tap(response => this.currentPageSubject.next(response.page)),
      catchError(() => {
        console.error(`Failed to load page: ${pagePath}`);
        return of(null);
      })
    );
  }

  /**
   * Search within a book
   */
  search(bookId: string, query: string, limit = 20): Observable<SearchResponse> {
    return this.http.post<SearchResponse>(`${this.apiBaseUrl}/books/${bookId}/search`, {
      query,
      limit
    }).pipe(
      catchError(() => of({ results: [], total: 0 }))
    );
  }

  /**
   * Render markdown to HTML (server-side)
   */
  renderMarkdown(content: string, bookId?: string): Observable<{ html: string; toc: TocEntry[] }> {
    return this.http.post<{ html: string; toc: TocEntry[]; glossary_terms: string[] }>(
      `${this.apiBaseUrl}/render/markdown`,
      { content, book_id: bookId }
    ).pipe(
      map(response => ({ html: response.html, toc: response.toc || [] })),
      catchError(() => of({ html: '', toc: [] }))
    );
  }

  /**
   * Get glossary term definition
   */
  getGlossaryTerm(term: string): Observable<{ name: string; href: string }[]> {
    const glossary = this.glossarySubject.value;
    const definitions = glossary[term.toLowerCase()] || [];
    return of(definitions);
  }

  /**
   * Navigate to next page
   */
  navigateNext(): void {
    const nav = this.navigationSubject.value;
    const book = this.currentBookSubject.value;
    if (nav?.next && book) {
      this.loadPage(book.id, nav.next.href || '').subscribe();
    }
  }

  /**
   * Navigate to previous page
   */
  navigatePrevious(): void {
    const nav = this.navigationSubject.value;
    const book = this.currentBookSubject.value;
    if (nav?.previous && book) {
      this.loadPage(book.id, nav.previous.href || '').subscribe();
    }
  }
}