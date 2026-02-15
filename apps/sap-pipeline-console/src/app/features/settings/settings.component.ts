import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ConnectionService } from '../../core/services/connection.service';
import { PipelineConfig, ConnectionState } from '../../core/models/pipeline.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="settings">
      <ui5-title level="H2">Settings</ui5-title>
      <p class="subtitle">Configure SAP Pipeline console connection</p>

      <!-- Connection Settings Card -->
      <ui5-card class="settings-card">
        <ui5-card-header
          slot="header"
          title-text="Connection Settings"
          subtitle-text="API endpoint configuration"
        >
          <ui5-icon slot="avatar" name="connected"></ui5-icon>
        </ui5-card-header>
        <div class="card-content">
          <div class="form-row">
            <ui5-label for="baseUrl" required>Base URL</ui5-label>
            <ui5-input
              #baseUrlInput
              id="baseUrl"
              [value]="config.baseUrl"
              placeholder="http://localhost:8088"
              class="form-input"
            ></ui5-input>
            <span class="form-help">The SAP Pipeline backend service URL</span>
          </div>

          <div class="form-row">
            <ui5-label for="model">Model</ui5-label>
            <ui5-input
              #modelInput
              id="model"
              [value]="config.model"
              placeholder="sap-orchestrator-v1"
              class="form-input"
            ></ui5-input>
            <span class="form-help">Default model for chat completions</span>
          </div>

          <div class="form-row">
            <ui5-label for="timeout">Timeout (ms)</ui5-label>
            <ui5-step-input
              #timeoutInput
              id="timeout"
              [value]="config.timeout"
              min="1000"
              max="120000"
              step="1000"
            ></ui5-step-input>
            <span class="form-help">Request timeout in milliseconds</span>
          </div>

          <div class="action-buttons">
            <ui5-button design="Emphasized" (click)="saveSettings(baseUrlInput.value, modelInput.value, timeoutInput.value)">
              Save & Connect
            </ui5-button>
            <ui5-button design="Default" (click)="testConnection()">
              Test Connection
            </ui5-button>
            <ui5-button design="Transparent" (click)="resetToDefaults()">
              Reset to Defaults
            </ui5-button>
          </div>
        </div>
      </ui5-card>

      <!-- Connection Status Card -->
      <ui5-card class="status-card">
        <ui5-card-header
          slot="header"
          title-text="Connection Status"
          subtitle-text="Current connection state"
        >
          <ui5-icon slot="avatar" name="sys-monitor"></ui5-icon>
        </ui5-card-header>
        <div class="card-content">
          <div class="status-row">
            <span class="label">Status:</span>
            <ui5-badge [color-scheme]="getStatusColorScheme(connectionState)">
              {{ connectionState | titlecase }}
            </ui5-badge>
          </div>
          <div class="status-row" *ngIf="serviceInfo">
            <span class="label">Service:</span>
            <span>{{ serviceInfo.service }}</span>
          </div>
          <div class="status-row" *ngIf="serviceInfo">
            <span class="label">Stack:</span>
            <span>{{ serviceInfo.stack }}</span>
          </div>
          <div class="status-row" *ngIf="connectionError">
            <span class="label">Error:</span>
            <span class="error-text">{{ connectionError }}</span>
          </div>
        </div>
      </ui5-card>

      <!-- Environment Info Card -->
      <ui5-card class="info-card">
        <ui5-card-header
          slot="header"
          title-text="Environment"
          subtitle-text="Application configuration"
        >
          <ui5-icon slot="avatar" name="hint"></ui5-icon>
        </ui5-card-header>
        <div class="card-content">
          <div class="info-row">
            <span class="label">Backend Service:</span>
            <span>sap-cloudsdk-fe-dev-pipeline</span>
          </div>
          <div class="info-row">
            <span class="label">Backend Port:</span>
            <span>8088</span>
          </div>
          <div class="info-row">
            <span class="label">API Format:</span>
            <span>OpenAI-compatible</span>
          </div>
          <div class="info-row">
            <span class="label">UI Framework:</span>
            <span>SAP UI5 Web Components for Angular</span>
          </div>
        </div>
      </ui5-card>

      <!-- Status Messages -->
      <ui5-message-strip
        *ngIf="saveSuccess"
        design="Positive"
        (close)="saveSuccess = false">
        Settings saved successfully!
      </ui5-message-strip>

      <ui5-message-strip
        *ngIf="saveError"
        design="Negative"
        (close)="saveError = ''">
        {{ saveError }}
      </ui5-message-strip>
    </div>
  `,
  styles: [`
    .settings {
      padding: 1rem;
      max-width: 800px;
    }

    .subtitle {
      color: var(--sapContent_LabelColor);
      margin-bottom: 1.5rem;
    }

    .settings-card, .status-card, .info-card {
      margin-bottom: 1rem;
    }

    .card-content {
      padding: 1rem;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      margin-bottom: 1.5rem;
    }

    .form-row ui5-label {
      margin-bottom: 0.25rem;
    }

    .form-input {
      width: 100%;
      max-width: 400px;
    }

    .form-help {
      color: var(--sapContent_LabelColor);
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }

    .status-row, .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--sapGroup_ContentBorderColor);
    }

    .label {
      color: var(--sapContent_LabelColor);
      font-weight: 500;
    }

    .error-text {
      color: var(--sapNegativeElementColor);
    }

    ui5-message-strip {
      margin-top: 1rem;
    }

    ui5-step-input {
      width: 150px;
    }
  `]
})
export class SettingsComponent implements OnInit {
  private connectionService = inject(ConnectionService);

  config: PipelineConfig = {
    baseUrl: 'http://localhost:8088',
    model: 'sap-orchestrator-v1',
    timeout: 30000
  };

  connectionState: ConnectionState = 'disconnected';
  connectionError = '';
  serviceInfo: { service: string; stack: string } | null = null;
  
  saveSuccess = false;
  saveError = '';

  ngOnInit(): void {
    // Load current configuration
    this.config = this.connectionService.getConfig();

    // Subscribe to connection state changes
    this.connectionService.state$.subscribe(state => {
      this.connectionState = state;
    });

    this.connectionService.error$.subscribe(error => {
      this.connectionError = error;
    });

    this.connectionService.serviceInfo$.subscribe(info => {
      this.serviceInfo = info;
    });
  }

  saveSettings(baseUrl: string, model: string, timeout: number): void {
    this.saveSuccess = false;
    this.saveError = '';

    if (!baseUrl.trim()) {
      this.saveError = 'Base URL is required';
      return;
    }

    try {
      new URL(baseUrl); // Validate URL format
    } catch {
      this.saveError = 'Invalid URL format';
      return;
    }

    this.connectionService.updateConfig({
      baseUrl: baseUrl.trim(),
      model: model.trim() || 'sap-orchestrator-v1',
      timeout: Number(timeout) || 30000
    });

    this.saveSuccess = true;
    this.config = this.connectionService.getConfig();
  }

  testConnection(): void {
    this.connectionService.checkHealth();
  }

  resetToDefaults(): void {
    this.connectionService.updateConfig({
      baseUrl: 'http://localhost:8088',
      model: 'sap-orchestrator-v1',
      timeout: 30000
    });
    
    this.config = this.connectionService.getConfig();
    this.saveSuccess = true;
  }

  getStatusColorScheme(state: ConnectionState): string {
    switch (state) {
      case 'connected': return '8';    // Positive green
      case 'connecting': return '6';   // Information blue
      case 'disconnected': return '5'; // Neutral
      case 'error': return '1';        // Negative red
      default: return '6';
    }
  }
}