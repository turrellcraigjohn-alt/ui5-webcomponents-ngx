import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HyperbookService } from '../../core/services/hyperbook.service';

import '@ui5/webcomponents/dist/Title.js';
import '@ui5/webcomponents/dist/Card.js';
import '@ui5/webcomponents/dist/CardHeader.js';
import '@ui5/webcomponents/dist/Input.js';
import '@ui5/webcomponents/dist/Button.js';
import '@ui5/webcomponents/dist/Label.js';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="settings-container">
      <ui5-title level="H2">Settings</ui5-title>
      <ui5-card>
        <ui5-card-header slot="header" title-text="Server Configuration"></ui5-card-header>
        <div class="card-content">
          <div class="form-group">
            <ui5-label for="apiUrl">API Base URL</ui5-label>
            <ui5-input id="apiUrl" [value]="apiUrl" (change)="onApiUrlChange($event)"></ui5-input>
          </div>
          <ui5-button design="Emphasized" (click)="saveSettings()">Save</ui5-button>
          <ui5-button design="Transparent" (click)="testConnection()">Test Connection</ui5-button>
          <div *ngIf="connectionStatus" class="status" [class.success]="connectionStatus === 'connected'" [class.error]="connectionStatus === 'failed'">
            {{ connectionStatus === 'connected' ? 'Connected successfully' : 'Connection failed' }}
          </div>
        </div>
      </ui5-card>
      <ui5-card>
        <ui5-card-header slot="header" title-text="Display Options"></ui5-card-header>
        <div class="card-content">
          <p>Text-only mode is enabled by default. No images, video, or audio content is displayed.</p>
        </div>
      </ui5-card>
    </div>
  `,
  styles: [`
    .settings-container { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
    .card-content { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .form-group ui5-input { width: 100%; max-width: 400px; }
    .status { padding: 0.5rem; border-radius: 4px; }
    .status.success { background: var(--sapPositiveColor); color: white; }
    .status.error { background: var(--sapNegativeColor); color: white; }
  `]
})
export class SettingsComponent {
  apiUrl = 'http://localhost:3000/api/v1';
  connectionStatus: 'connected' | 'failed' | null = null;
  constructor(private hyperbookService: HyperbookService) {}
  onApiUrlChange(event: Event): void { this.apiUrl = (event.target as HTMLInputElement).value; }
  saveSettings(): void { this.hyperbookService.setApiBaseUrl(this.apiUrl); }
  testConnection(): void {
    this.hyperbookService.setApiBaseUrl(this.apiUrl);
    this.hyperbookService.checkHealth().subscribe(health => {
      this.connectionStatus = health.status === 'healthy' ? 'connected' : 'failed';
    });
  }
}