import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HyperbookService } from '../../core/services/hyperbook.service';
import { BookSummary, HealthResponse } from '../../core/models/hyperbook.model';

import '@ui5/webcomponents/dist/Card.js';
import '@ui5/webcomponents/dist/CardHeader.js';
import '@ui5/webcomponents/dist/List.js';
import '@ui5/webcomponents/dist/StandardListItem.js';
import '@ui5/webcomponents/dist/Title.js';
import '@ui5/webcomponents/dist/Badge.js';
import '@ui5/webcomponents/dist/Icon.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="dashboard-container">
      <ui5-title level="H2">Dashboard</ui5-title>

      <div class="cards-grid">
        <!-- Server Status Card -->
        <ui5-card class="status-card">
          <ui5-card-header
            slot="header"
            title-text="Server Status"
            subtitle-text="Hyperbook Backend"
          ></ui5-card-header>
          <div class="card-content">
            <div class="status-item">
              <span>Status:</span>
              <ui5-badge [attr.color-scheme]="healthStatus === 'healthy' ? '8' : '1'">
                {{ healthStatus }}
              </ui5-badge>
            </div>
            <div class="status-item" *ngIf="health">
              <span>Version:</span>
              <span>{{ health.service.version }}</span>
            </div>
            <div class="status-item" *ngIf="health">
              <span>Stack:</span>
              <span>{{ health.service.stack }}</span>
            </div>
            <div class="status-item" *ngIf="health">
              <span>Uptime:</span>
              <span>{{ formatUptime(health.uptimeSeconds) }}</span>
            </div>
          </div>
        </ui5-card>

        <!-- Books Overview Card -->
        <ui5-card class="books-card">
          <ui5-card-header
            slot="header"
            title-text="Available Books"
            [attr.subtitle-text]="books.length + ' books loaded'"
          ></ui5-card-header>
          <ui5-list>
            <ui5-li
              *ngFor="let book of books"
              icon="document"
              (click)="selectBook(book)"
            >
              {{ book.name }}
              <span slot="description">{{ book.description || 'No description' }}</span>
            </ui5-li>
            <ui5-li *ngIf="books.length === 0" icon="hint">
              No books available
              <span slot="description">Add hyperbook projects to view them here</span>
            </ui5-li>
          </ui5-list>
        </ui5-card>

        <!-- Quick Actions Card -->
        <ui5-card class="actions-card">
          <ui5-card-header
            slot="header"
            title-text="Quick Actions"
          ></ui5-card-header>
          <ui5-list>
            <ui5-li icon="search" (click)="navigateTo('search')">
              Search Documentation
              <span slot="description">Full-text search across all books</span>
            </ui5-li>
            <ui5-li icon="list" (click)="navigateTo('glossary')">
              Browse Glossary
              <span slot="description">View all defined terms</span>
            </ui5-li>
            <ui5-li icon="action-settings" (click)="navigateTo('settings')">
              Configure Settings
              <span slot="description">Server and display preferences</span>
            </ui5-li>
          </ui5-list>
        </ui5-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 1rem;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .card-content {
      padding: 1rem;
    }

    .status-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--sapList_BorderColor);
    }

    .status-item:last-child {
      border-bottom: none;
    }

    ui5-card {
      height: fit-content;
    }
  `]
})
export class DashboardComponent implements OnInit {
  health: HealthResponse | null = null;
  healthStatus = 'checking...';
  books: BookSummary[] = [];

  constructor(private hyperbookService: HyperbookService) {}

  ngOnInit(): void {
    this.checkHealth();
    this.loadBooks();
  }

  checkHealth(): void {
    this.hyperbookService.checkHealth().subscribe(health => {
      this.health = health;
      this.healthStatus = health.status;
    });
  }

  loadBooks(): void {
    this.hyperbookService.loadBooks().subscribe(books => {
      this.books = books;
    });
  }

  selectBook(book: BookSummary): void {
    this.hyperbookService.selectBook(book);
    this.navigateTo('reader');
  }

  navigateTo(route: string): void {
    window.history.pushState({}, '', `/${route}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  formatUptime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }
}