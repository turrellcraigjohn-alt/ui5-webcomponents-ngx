/**
 * Perplexica Search Console - Root Application Component
 * AI-powered search interface with focus modes
 */
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ui5-shellbar
      primary-title="Perplexica Console"
      secondary-title="AI-Powered Search"
      show-notifications
      show-product-switch>
      <ui5-button slot="startButton" icon="menu" id="menuBtn"></ui5-button>
    </ui5-shellbar>

    <div class="app-content">
      <ui5-side-navigation>
        <ui5-side-navigation-item text="Search" icon="search" routerLink="/search"></ui5-side-navigation-item>
        <ui5-side-navigation-item text="Academic" icon="education" routerLink="/academic"></ui5-side-navigation-item>
        <ui5-side-navigation-item text="Writing" icon="edit" routerLink="/writing"></ui5-side-navigation-item>
        <ui5-side-navigation-item text="YouTube" icon="video" routerLink="/youtube"></ui5-side-navigation-item>
        <ui5-side-navigation-item text="Reddit" icon="discussion" routerLink="/reddit"></ui5-side-navigation-item>
        <ui5-side-navigation-item text="History" icon="history" routerLink="/history"></ui5-side-navigation-item>
        <ui5-side-navigation-item text="Settings" icon="action-settings" routerLink="/settings" slot="fixedItems"></ui5-side-navigation-item>
      </ui5-side-navigation>

      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    .app-content {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .main-content {
      flex: 1;
      padding: 1rem;
      overflow-y: auto;
      background: var(--sapBackgroundColor);
    }
  `]
})
export class AppComponent {
  title = 'Perplexica Console';
}