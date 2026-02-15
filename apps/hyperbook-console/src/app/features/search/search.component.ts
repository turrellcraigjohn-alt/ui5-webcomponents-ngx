import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HyperbookService } from '../../core/services/hyperbook.service';
import { SearchResult } from '../../core/models/hyperbook.model';

import '@ui5/webcomponents/dist/Title.js';
import '@ui5/webcomponents/dist/Input.js';
import '@ui5/webcomponents/dist/Button.js';
import '@ui5/webcomponents/dist/List.js';
import '@ui5/webcomponents/dist/StandardListItem.js';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="search-container">
      <ui5-title level="H2">Search Documentation</ui5-title>
      <div class="search-bar">
        <ui5-input #searchInput placeholder="Enter search terms..." (keyup.enter)="search(searchInput.value)" class="search-input"></ui5-input>
        <ui5-button design="Emphasized" icon="search" (click)="search(searchInput.value)">Search</ui5-button>
      </div>
      <div *ngIf="results.length > 0" class="results-info">Found {{ total }} results</div>
      <ui5-list *ngIf="results.length > 0">
        <ui5-li *ngFor="let result of results" icon="document" [attr.description]="result.snippet" (click)="openResult(result)">
          {{ result.page.name }} <span class="score">({{ (result.score * 100).toFixed(0) }}%)</span>
        </ui5-li>
      </ui5-list>
      <p *ngIf="searched && results.length === 0" class="no-results">No results found. Try different keywords.</p>
    </div>
  `,
  styles: [`
    .search-container { padding: 1rem; }
    .search-bar { display: flex; gap: 0.5rem; margin: 1rem 0; }
    .search-input { flex: 1; max-width: 500px; }
    .results-info { color: var(--sapContent_LabelColor); margin: 0.5rem 0; }
    .score { color: var(--sapContent_LabelColor); font-size: 0.875rem; }
    .no-results { color: var(--sapContent_LabelColor); padding: 1rem; }
  `]
})
export class SearchComponent {
  results: SearchResult[] = [];
  total = 0;
  searched = false;
  constructor(private hyperbookService: HyperbookService) {}
  search(query: string): void {
    if (!query.trim()) return;
    const book = this.hyperbookService['currentBookSubject'].value;
    if (book) {
      this.hyperbookService.search(book.id, query).subscribe(response => {
        this.results = response.results;
        this.total = response.total;
        this.searched = true;
      });
    }
  }
  openResult(result: SearchResult): void {
    window.history.pushState({}, '', '/reader');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}