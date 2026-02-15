import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HyperbookService } from '../../core/services/hyperbook.service';
import { BookSummary } from '../../core/models/hyperbook.model';

import '@ui5/webcomponents/dist/Title.js';
import '@ui5/webcomponents/dist/Card.js';
import '@ui5/webcomponents/dist/CardHeader.js';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="books-container">
      <ui5-title level="H2">Available Books</ui5-title>
      <div class="books-grid">
        <ui5-card *ngFor="let book of books" (click)="selectBook(book)" class="book-card">
          <ui5-card-header slot="header" [attr.title-text]="book.name" [attr.subtitle-text]="book.language || 'en'"></ui5-card-header>
          <div class="book-content">
            <p>{{ book.description || 'No description available' }}</p>
            <div class="book-meta"><strong>Path:</strong> {{ book.basePath }}</div>
          </div>
        </ui5-card>
        <div *ngIf="books.length === 0" class="no-books">
          <ui5-title level="H4">No Books Available</ui5-title>
          <p>Add hyperbook projects to the server's book directory to view them here.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .books-container { padding: 1rem; }
    .books-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .book-card { cursor: pointer; transition: box-shadow 0.2s; }
    .book-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .book-content { padding: 1rem; }
    .book-meta { margin-top: 0.5rem; color: var(--sapContent_LabelColor); font-size: 0.875rem; }
    .no-books { grid-column: 1/-1; text-align: center; padding: 2rem; }
  `]
})
export class BooksComponent implements OnInit {
  books: BookSummary[] = [];
  constructor(private hyperbookService: HyperbookService) {}
  ngOnInit(): void { this.hyperbookService.loadBooks().subscribe(books => this.books = books); }
  selectBook(book: BookSummary): void {
    this.hyperbookService.selectBook(book);
    window.history.pushState({}, '', '/reader');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}