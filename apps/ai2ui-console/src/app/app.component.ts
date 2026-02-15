/**
 * AI2UI Universal Console - Root Application Component
 * Multi-agent orchestration interface using Google A2A protocol
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
      primary-title="AI2UI Console"
      secondary-title="Multi-Agent Orchestration"
      show-notifications
      show-product-switch>
      <ui5-button slot="startButton" icon="menu" id="menuBtn"></ui5-button>
    </ui5-shellbar>

    <div class="app-content">
      <ui5-side-navigation>
        <ui5-side-navigation-item text="Dashboard" icon="home" routerLink="/dashboard"></ui5-side-navigation-item>
        <ui5-side-navigation-item text="Agents" icon="group" routerLink="/agents">
          <ui5-side-navigation-sub-item text="Search Agent" routerLink="/agents/search"></ui5-side-navigation-sub-item>
          <ui5-side-navigation-sub-item text="Graph Agent" routerLink="/agents/graph"></ui5-side-navigation-sub-item>
          <ui5-side-navigation-sub-item text="Docs Agent" routerLink="/agents/docs"></ui5-side-navigation-sub-item>
          <ui5-side-navigation-sub-item text="Pipeline Agent" routerLink="/agents/pipeline"></ui5-side-navigation-sub-item>
        </ui5-side-navigation-item>
        <ui5-side-navigation-item text="Tasks" icon="task" routerLink="/tasks"></ui5-side-navigation-item>
        <ui5-side-navigation-item text="Orchestrator" icon="workflow-tasks" routerLink="/orchestrator"></ui5-side-navigation-item>
        <ui5-side-navigation-item text="A2A Discovery" icon="globe" routerLink="/discovery"></ui5-side-navigation-item>
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
  title = 'AI2UI Console';
}