import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HyperbookService } from '../../core/services/hyperbook.service';
import { HyperbookPage, Navigation, TocEntry } from '../../core/models/hyperbook.model';

import '@ui5/webcomponents/dist/Title.js';
import '@ui5/webcomponents/dist/Panel.js';
import '@ui5/webcomponents/dist/Tree.js';
import '@ui5/webcomponents/dist/TreeItem.js';
import '@ui5/webcomponents/dist/Button.js';
import '@ui5/webcomponents/dist/Breadcrumbs.js';
import '@ui5/webcomponents/dist/BreadcrumbsItem.js';

@Component({
  selector: 'app-reader',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="reader-container">
      <!-- Navigation Panel -->
      <aside class="nav-panel">
        <ui5-panel header-text="Navigation" collapsed="false">
          <ui5-tree *ngIf="navigation">
            <ui5-tree-item
              *ngFor="let section of navigation.sections"
              [text]="section.name"
              icon="folder-blank"
              [expanded]="section.expanded"
            >
              <ui5-tree-item
                *ngFor="let page of section.pages"
                [text]="page.name"
                icon="document"
                (click)="loadPage(page)"
              ></ui5-tree-item>
            </ui5-tree-item>
            <ui5-tree-item
              *ngFor="let page of navigation.pages"
              [text]="page.name"
              icon="document"
              (click)="loadPage(page)"
            ></ui5-tree-item>
          </ui5-tree>
        </ui5-panel>
      </aside>

      <!-- Content Area -->
      <main class="content-area">
        <!-- Breadcrumbs -->
        <ui5-breadcrumbs *ngIf="currentPage">
          <ui5-breadcrumbs-item href="/">Home</ui5-breadcrumbs-item>
          <ui5-breadcrumbs-item>{{ currentPage.name }}</ui5-breadcrumbs-item>
        </ui5-breadcrumbs>

        <!-- Page Title -->
        <ui5-title level="H1" *ngIf="currentPage">
          {{ currentPage.title || currentPage.name }}
        </ui5-title>

        <!-- Page Description -->
        <p class="description" *ngIf="currentPage?.description">
          {{ currentPage.description }}
        </p>

        <!-- Rendered Content (text-only, no images/video/audio) -->
        <div class="content" [innerHTML]="renderedContent"></div>

        <!-- Navigation Buttons -->
        <div class="page-navigation" *ngIf="navigation">
          <ui5-button
            design="Transparent"
            icon="navigation-left-arrow"
            [disabled]="!navigation.previous"
            (click)="navigatePrevious()"
          >
            {{ navigation.previous?.name || 'Previous' }}
          </ui5-button>
          <ui5-button
            design="Transparent"
            icon-end
            icon="navigation-right-arrow"
            [disabled]="!navigation.next"
            (click)="navigateNext()"
          >
            {{ navigation.next?.name || 'Next' }}
          </ui5-button>
        </div>
      </main>

      <!-- TOC Panel -->
      <aside class="toc-panel" *ngIf="toc.length > 0">
        <ui5-panel header-text="On This Page" collapsed="false">
          <ul class="toc-list">
            <li *ngFor="let entry of toc" [class]="'toc-level-' + entry.level">
              <a [href]="'#' + entry.slug">{{ entry.text }}</a>
            </li>
          </ul>
        </ui5-panel>
      </aside>
    </div>
  `,
  styles: [`
    .reader-container {
      display: grid;
      grid-template-columns: 250px 1fr 200px;
      gap: 1rem;
      height: 100%;
      overflow: hidden;
    }

    .nav-panel {
      overflow-y: auto;
      padding: 0.5rem;
    }

    .content-area {
      overflow-y: auto;
      padding: 1rem;
    }

    .toc-panel {
      overflow-y: auto;
      padding: 0.5rem;
    }

    .description {
      color: var(--sapContent_LabelColor);
      margin: 0.5rem 0 1rem;
    }

    .content {
      line-height: 1.6;
    }

    .content :deep(h1),
    .content :deep(h2),
    .content :deep(h3) {
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .content :deep(p) {
      margin: 0.75rem 0;
    }

    .content :deep(code) {
      background: var(--sapBackgroundColor);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: monospace;
    }

    .content :deep(pre) {
      background: var(--sapBackgroundColor);
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }

    .page-navigation {
      display: flex;
      justify-content: space-between;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--sapList_BorderColor);
    }

    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .toc-list li {
      padding: 0.25rem 0;
    }

    .toc-list a {
      text-decoration: none;
      color: var(--sapLinkColor);
    }

    .toc-level-2 { padding-left: 0.5rem; }
    .toc-level-3 { padding-left: 1rem; }
    .toc-level-4 { padding-left: 1.5rem; }

    @media (max-width: 900px) {
      .reader-container {
        grid-template-columns: 1fr;
      }
      .nav-panel, .toc-panel {
        display: none;
      }
    }
  `]
})
export class ReaderComponent implements OnInit {
  navigation: Navigation | null = null;
  currentPage: HyperbookPage | null = null;
  renderedContent = '';
  toc: TocEntry[] = [];

  constructor(private hyperbookService: HyperbookService) {}

  ngOnInit(): void {
    this.hyperbookService.navigation$.subscribe(nav => {
      this.navigation = nav;
    });

    this.hyperbookService.currentPage$.subscribe(page => {
      this.currentPage = page;
      if (page) {
        this.loadPageContent(page);
      }
    });
  }

  loadPage(page: HyperbookPage): void {
    const book = this.hyperbookService['currentBookSubject'].value;
    if (book && page.href) {
      this.hyperbookService.loadPage(book.id, page.href).subscribe(response => {
        if (response) {
          this.renderedContent = response.content;
          this.toc = response.toc || [];
        }
      });
    }
  }

  loadPageContent(page: HyperbookPage): void {
    // Content would be loaded from API - for now just show placeholder
    this.renderedContent = `<p>Loading content for: ${page.name}</p>`;
    this.toc = [];
  }

  navigateNext(): void {
    this.hyperbookService.navigateNext();
  }

  navigatePrevious(): void {
    this.hyperbookService.navigatePrevious();
  }
}