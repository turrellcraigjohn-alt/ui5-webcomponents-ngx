import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PipelineService } from '../../core/services/pipeline.service';
import { ConnectionService } from '../../core/services/connection.service';
import { ConnectionState, ModelInfo } from '../../core/models/pipeline.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <ui5-title level="H2">Dashboard</ui5-title>
      <p class="subtitle">SAP AI Core Pipeline Overview</p>

      <div class="cards-grid">
        <!-- Service Status Card -->
        <ui5-card>
          <ui5-card-header
            slot="header"
            title-text="Service Status"
            subtitle-text="Pipeline Health"
            [status]="connectionState === 'connected' ? 'Positive' : connectionState === 'error' ? 'Negative' : 'None'"
          >
            <ui5-icon slot="avatar" name="connected"></ui5-icon>
          </ui5-card-header>
          <div class="card-content">
            <div class="status-row">
              <span class="label">Status:</span>
              <ui5-badge 
                [color-scheme]="connectionState === 'connected' ? '8' : connectionState === 'error' ? '1' : '6'">
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
            <ui5-button 
              design="Emphasized" 
              (click)="refreshHealth()"
              [disabled]="connectionState === 'connecting'">
              {{ connectionState === 'connecting' ? 'Checking...' : 'Refresh' }}
            </ui5-button>
          </div>
        </ui5-card>

        <!-- Available Models Card -->
        <ui5-card>
          <ui5-card-header
            slot="header"
            title-text="Available Models"
            subtitle-text="AI Orchestration Models"
          >
            <ui5-icon slot="avatar" name="machine"></ui5-icon>
          </ui5-card-header>
          <div class="card-content">
            <ui5-busy-indicator *ngIf="loadingModels" active size="Medium"></ui5-busy-indicator>
            <ui5-list *ngIf="!loadingModels && models.length > 0">
              <ui5-li *ngFor="let model of models" icon="accept">
                {{ model.id }}
                <span slot="description">{{ model.owned_by }}</span>
              </ui5-li>
            </ui5-list>
            <p *ngIf="!loadingModels && models.length === 0" class="no-data">
              No models available
            </p>
            <ui5-button design="Transparent" (click)="loadModels()">
              Refresh Models
            </ui5-button>
          </div>
        </ui5-card>

        <!-- Quick Actions Card -->
        <ui5-card>
          <ui5-card-header
            slot="header"
            title-text="Quick Actions"
            subtitle-text="Common Operations"
          >
            <ui5-icon slot="avatar" name="action"></ui5-icon>
          </ui5-card-header>
          <div class="card-content actions-grid">
            <ui5-button design="Default" icon="deploy" (click)="quickAction('deployments')">
              View Deployments
            </ui5-button>
            <ui5-button design="Default" icon="process" (click)="quickAction('executions')">
              Run Execution
            </ui5-button>
            <ui5-button design="Default" icon="tree" (click)="quickAction('scenarios')">
              List Scenarios
            </ui5-button>
            <ui5-button design="Default" icon="search" (click)="quickAction('grounding')">
              Vector Search
            </ui5-button>
          </div>
        </ui5-card>

        <!-- Recent Activity Card -->
        <ui5-card>
          <ui5-card-header
            slot="header"
            title-text="Recent Activity"
            subtitle-text="Latest Operations"
          >
            <ui5-icon slot="avatar" name="history"></ui5-icon>
          </ui5-card-header>
          <div class="card-content">
            <ui5-busy-indicator *ngIf="loadingActivity" active size="Medium"></ui5-busy-indicator>
            <ui5-timeline *ngIf="!loadingActivity && activities.length > 0">
              <ui5-timeline-item 
                *ngFor="let activity of activities"
                [title-text]="activity.title"
                [subtitle-text]="activity.time"
                [icon]="activity.icon">
              </ui5-timeline-item>
            </ui5-timeline>
            <p *ngIf="!loadingActivity && activities.length === 0" class="no-data">
              No recent activity
            </p>
          </div>
        </ui5-card>
      </div>

      <!-- Chat Test Section -->
      <ui5-card class="chat-test-card">
        <ui5-card-header
          slot="header"
          title-text="Test Pipeline"
          subtitle-text="Send a test message to the backend"
        >
          <ui5-icon slot="avatar" name="message-popup"></ui5-icon>
        </ui5-card-header>
        <div class="card-content">
          <div class="chat-input-row">
            <ui5-input
              #chatInput
              placeholder="Enter a command (e.g., 'list scenarios')"
              class="chat-input"
              (keyup.enter)="sendTestMessage(chatInput.value)"
            ></ui5-input>
            <ui5-button 
              design="Emphasized" 
              (click)="sendTestMessage(chatInput.value)"
              [disabled]="sendingMessage">
              {{ sendingMessage ? 'Sending...' : 'Send' }}
            </ui5-button>
          </div>
          <div class="chat-response" *ngIf="lastResponse">
            <ui5-title level="H5">Response:</ui5-title>
            <pre>{{ lastResponse }}</pre>
          </div>
        </div>
      </ui5-card>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 1rem;
    }

    .subtitle {
      color: var(--sapContent_LabelColor);
      margin-bottom: 1.5rem;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .card-content {
      padding: 1rem;
    }

    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .label {
      color: var(--sapContent_LabelColor);
      font-weight: 500;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .no-data {
      color: var(--sapContent_LabelColor);
      font-style: italic;
      text-align: center;
      padding: 1rem;
    }

    .chat-test-card {
      margin-top: 1rem;
    }

    .chat-input-row {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .chat-input {
      flex: 1;
    }

    .chat-response {
      background: var(--sapField_Background);
      border: 1px solid var(--sapField_BorderColor);
      border-radius: 4px;
      padding: 1rem;
    }

    .chat-response pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--sapFontFamily);
    }
  `]
})
export class DashboardComponent implements OnInit {
  private pipelineService = inject(PipelineService);
  private connectionService = inject(ConnectionService);

  connectionState: ConnectionState = 'disconnected';
  serviceInfo: { service: string; stack: string } | null = null;
  
  models: ModelInfo[] = [];
  loadingModels = false;

  activities: { title: string; time: string; icon: string }[] = [];
  loadingActivity = false;

  lastResponse = '';
  sendingMessage = false;

  ngOnInit(): void {
    this.connectionService.state$.subscribe(state => {
      this.connectionState = state;
      if (state === 'connected') {
        this.loadModels();
      }
    });

    this.connectionService.serviceInfo$.subscribe(info => {
      this.serviceInfo = info;
    });

    // Load initial data if already connected
    if (this.connectionService.getState() === 'connected') {
      this.loadModels();
    }
  }

  refreshHealth(): void {
    this.connectionService.checkHealth();
  }

  loadModels(): void {
    this.loadingModels = true;
    this.pipelineService.getModels().subscribe({
      next: (response) => {
        this.models = response.data || [];
        this.loadingModels = false;
      },
      error: () => {
        this.models = [];
        this.loadingModels = false;
      }
    });
  }

  quickAction(action: string): void {
    // Navigate to the respective feature
    console.log('Quick action:', action);
  }

  sendTestMessage(message: string): void {
    if (!message.trim()) return;

    this.sendingMessage = true;
    this.lastResponse = '';

    this.pipelineService.sendChatCompletion(message).subscribe({
      next: (response) => {
        this.lastResponse = this.pipelineService.extractResponseContent(response);
        this.sendingMessage = false;

        // Add to activity
        this.activities.unshift({
          title: `Sent: ${message}`,
          time: new Date().toLocaleTimeString(),
          icon: 'message-popup'
        });
        if (this.activities.length > 5) {
          this.activities.pop();
        }
      },
      error: (error) => {
        this.lastResponse = `Error: ${error.message}`;
        this.sendingMessage = false;
      }
    });
  }
}