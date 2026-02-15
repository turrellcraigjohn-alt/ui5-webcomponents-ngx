import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HyperbookService } from './core/services/hyperbook.service';

interface NavItem {
  path: string;
  title: string;
  icon: string;
  fixed?: boolean;
}

interface StatusBanner {
  design: string;
  message: string;
  showAction: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterOutlet],
  template: `
    <ui5-shellbar
      primary-title="Hyperbook Console"
      secondary-title="Text Documentation Viewer"
      show-search-field
      (search-button-click)="onSearch($event)"
      class="shellbar"
    >
      <ui5-avatar slot="profile" initials="HB"></ui5-avatar>
    </ui5-shellbar>

    <div class="layout">
      <ui5-side-navigation class="side-nav">
        <ui5-side-navigation-item
          *ngFor="let item of topNavItems"
          [icon]="item.icon"
          [text]="item.title"
          [selected]="isActive(item.path)"
          (click)="navigate(item.path)"
        >
        </ui5-side-navigation-item>

        <ui5-side-navigation-item
          *ngFor="let item of fixedNavItems"
          slot="fixedItems"
          [icon]="item.icon"
          [text]="item.title"
          [selected]="isActive(item.path)"
          (click)="navigate(item.path)"
        >
        </ui5-side-navigation-item>
      </ui5-side-navigation>

      <main class="main">
        <ui5-message-strip
          *ngIf="(statusBanner$ | async) as banner"
          [design]="banner.design"
          hide-close-button
          class="status-strip"
        >
          {{ banner.message }}
          <ui5-button
            *ngIf="banner.showAction"
            slot="endButton"
            design="Transparent"
            icon="action-settings"
            (click)="navigate('/settings')"
          >
            Configure
          </ui5-button>
        </ui5-message-strip>

        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .shellbar {
      position: sticky;
      top: 0;
      z-index: 20;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .layout {
      display: grid;
      grid-template-columns: 250px 1fr;
      min-height: calc(100vh - 3rem);
    }

    .side-nav {
      border-right: 1px solid rgba(33, 85, 146, 0.12);
      background: linear-gradient(180deg, #f4f8ff 0%, #eef3fb 100%);
    }

    .main {
      padding: 1rem 1.25rem 1.5rem;
      background: var(--sapBackgroundColor);
      overflow: auto;
    }

    .status-strip {
      margin-bottom: 1rem;
    }

    @media (max-width: 980px) {
      .layout {
        grid-template-columns: 1fr;
      }

      .side-nav {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid rgba(33, 85, 146, 0.12);
      }
    }
  `]
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hyperbookService = inject(HyperbookService);

  readonly topNavItems: NavItem[] = [
    { path: '/dashboard', title: 'Dashboard', icon: 'home' },
    { path: '/books', title: 'Books', icon: 'library' },
    { path: '/reader', title: 'Reader', icon: 'document-text' },
    { path: '/glossary', title: 'Glossary', icon: 'list' },
    { path: '/search', title: 'Search', icon: 'search' },
  ];

  readonly fixedNavItems: NavItem[] = [
    { path: '/settings', title: 'Settings', icon: 'action-settings', fixed: true },
  ];

  readonly statusBanner$ = this.hyperbookService.connectionState$.pipe(
    map((state) => this.buildStatusBanner(state)),
    startWith(this.buildStatusBanner('disconnected'))
  );

  private currentPath = '/dashboard';

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.currentPath = event.urlAfterRedirects || '/dashboard';
      });
  }

  ngOnInit(): void {
    // Initialize connection state check
    this.hyperbookService.checkConnection();
  }

  isActive(path: string): boolean {
    return this.currentPath === path || this.currentPath.startsWith(`${path}/`);
  }

  navigate(path: string): void {
    void this.router.navigateByUrl(path);
  }

  onSearch(event: Event): void {
    console.log('Search triggered', event);
    this.navigate('/search');
  }

  private buildStatusBanner(state: string): StatusBanner {
    switch (state) {
      case 'connected':
        return {
          design: 'Positive',
          message: 'Connected to Hyperbook service',
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
          message: 'Connection error. Check settings.',
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
}