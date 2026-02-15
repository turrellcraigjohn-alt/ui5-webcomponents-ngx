import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PipelineService } from '../../core/services/pipeline.service';
import { Deployment } from '../../core/models/pipeline.model';

@Component({
  selector: 'app-deployments',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="deployments">
      <div class="header">
        <ui5-title level="H2">Deployments</ui5-title>
        <ui5-button design="Emphasized" icon="add" (click)="openCreateDialog()">
          Create Deployment
        </ui5-button>
      </div>
      <p class="subtitle">Manage SAP AI Core model deployments</p>

      <!-- Loading State -->
      <ui5-busy-indicator *ngIf="loading" active size="Large" class="loading-indicator">
      </ui5-busy-indicator>

      <!-- Deployments Table -->
      <ui5-table *ngIf="!loading" sticky-column-header>
        <ui5-table-column slot="columns" min-width="200">
          <span>Name</span>
        </ui5-table-column>
        <ui5-table-column slot="columns" min-width="100">
          <span>Status</span>
        </ui5-table-column>
        <ui5-table-column slot="columns" min-width="150">
          <span>Scenario</span>
        </ui5-table-column>
        <ui5-table-column slot="columns" min-width="150">
          <span>Configuration</span>
        </ui5-table-column>
        <ui5-table-column slot="columns" min-width="150">
          <span>Created</span>
        </ui5-table-column>
        <ui5-table-column slot="columns" min-width="100">
          <span>Actions</span>
        </ui5-table-column>

        <ui5-table-row *ngFor="let deployment of deployments">
          <ui5-table-cell>
            <ui5-link>{{ deployment.name }}</ui5-link>
          </ui5-table-cell>
          <ui5-table-cell>
            <ui5-badge [color-scheme]="getStatusColorScheme(deployment.status)">
              {{ deployment.status }}
            </ui5-badge>
          </ui5-table-cell>
          <ui5-table-cell>{{ deployment.scenarioId }}</ui5-table-cell>
          <ui5-table-cell>{{ deployment.configurationId }}</ui5-table-cell>
          <ui5-table-cell>{{ deployment.createdAt | date:'short' }}</ui5-table-cell>
          <ui5-table-cell>
            <ui5-button design="Transparent" icon="detail-view" 
              (click)="viewDeployment(deployment)">
            </ui5-button>
            <ui5-button design="Transparent" icon="stop" 
              *ngIf="deployment.status === 'RUNNING'"
              (click)="stopDeployment(deployment)">
            </ui5-button>
            <ui5-button design="Transparent" icon="play" 
              *ngIf="deployment.status === 'STOPPED'"
              (click)="startDeployment(deployment)">
            </ui5-button>
          </ui5-table-cell>
        </ui5-table-row>

        <ui5-table-row *ngIf="deployments.length === 0">
          <ui5-table-cell colspan="6">
            <div class="no-data">
              <ui5-icon name="document" style="font-size: 3rem; opacity: 0.5;"></ui5-icon>
              <p>No deployments found</p>
              <ui5-button design="Emphasized" (click)="loadDeployments()">
                Refresh
              </ui5-button>
            </div>
          </ui5-table-cell>
        </ui5-table-row>
      </ui5-table>

      <!-- Response Panel -->
      <ui5-panel *ngIf="lastResponse" header-text="Backend Response" collapsed>
        <pre class="response-content">{{ lastResponse }}</pre>
      </ui5-panel>

      <!-- Create Deployment Dialog -->
      <ui5-dialog #createDialog header-text="Create Deployment">
        <div class="dialog-content">
          <div class="form-row">
            <ui5-label for="scenarioInput" required>Scenario ID</ui5-label>
            <ui5-input #scenarioInput id="scenarioInput" 
              placeholder="Enter scenario ID"
              class="form-input">
            </ui5-input>
          </div>
          <div class="form-row">
            <ui5-label for="configInput" required>Configuration ID</ui5-label>
            <ui5-input #configInput id="configInput"
              placeholder="Enter configuration ID"
              class="form-input">
            </ui5-input>
          </div>
        </div>
        <div slot="footer" class="dialog-footer">
          <ui5-button design="Transparent" (click)="createDialog.close()">
            Cancel
          </ui5-button>
          <ui5-button design="Emphasized" 
            (click)="createDeployment(scenarioInput.value, configInput.value); createDialog.close()">
            Create
          </ui5-button>
        </div>
      </ui5-dialog>
    </div>
  `,
  styles: [`
    .deployments {
      padding: 1rem;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: var(--sapContent_LabelColor);
      margin-bottom: 1.5rem;
    }

    .loading-indicator {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }

    .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
      color: var(--sapContent_LabelColor);
    }

    .response-content {
      white-space: pre-wrap;
      word-break: break-word;
      font-family: monospace;
      font-size: 0.875rem;
      padding: 1rem;
      background: var(--sapField_Background);
      border-radius: 4px;
      margin: 0;
    }

    .dialog-content {
      padding: 1rem;
      min-width: 400px;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      margin-bottom: 1rem;
    }

    .form-row ui5-label {
      margin-bottom: 0.25rem;
    }

    .form-input {
      width: 100%;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 0.5rem;
    }

    ui5-panel {
      margin-top: 1rem;
    }
  `]
})
export class DeploymentsComponent implements OnInit {
  private pipelineService = inject(PipelineService);

  deployments: Deployment[] = [];
  loading = false;
  lastResponse = '';

  ngOnInit(): void {
    this.loadDeployments();
  }

  loadDeployments(): void {
    this.loading = true;
    this.pipelineService.listDeployments().subscribe({
      next: (response) => {
        this.lastResponse = response;
        // Parse the response and extract deployments
        // For now, showing mock data since the backend returns text
        this.parseDeploymentsFromResponse(response);
        this.loading = false;
      },
      error: (error) => {
        this.lastResponse = `Error: ${error.message}`;
        this.deployments = [];
        this.loading = false;
      }
    });
  }

  private parseDeploymentsFromResponse(response: string): void {
    // In a real implementation, parse the JSON response
    // For demo purposes, show some placeholder data
    this.deployments = [
      {
        id: 'deploy-001',
        name: 'GPT-4 Deployment',
        status: 'RUNNING',
        scenarioId: 'text-generation',
        configurationId: 'config-gpt4',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      },
      {
        id: 'deploy-002',
        name: 'Embedding Model',
        status: 'PENDING',
        scenarioId: 'embedding-generation',
        configurationId: 'config-embed',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      }
    ];
  }

  createDeployment(scenarioId: string, configurationId: string): void {
    if (!scenarioId || !configurationId) return;

    this.loading = true;
    this.pipelineService.createDeployment(scenarioId, configurationId).subscribe({
      next: (response) => {
        this.lastResponse = response;
        this.loadDeployments();
      },
      error: (error) => {
        this.lastResponse = `Error: ${error.message}`;
        this.loading = false;
      }
    });
  }

  viewDeployment(deployment: Deployment): void {
    console.log('View deployment:', deployment);
  }

  startDeployment(deployment: Deployment): void {
    this.pipelineService.sendChatCompletion(`start deployment ${deployment.id}`).subscribe({
      next: (response) => {
        this.lastResponse = this.pipelineService.extractResponseContent(response);
        this.loadDeployments();
      }
    });
  }

  stopDeployment(deployment: Deployment): void {
    this.pipelineService.sendChatCompletion(`stop deployment ${deployment.id}`).subscribe({
      next: (response) => {
        this.lastResponse = this.pipelineService.extractResponseContent(response);
        this.loadDeployments();
      }
    });
  }

  openCreateDialog(): void {
    // Dialog is opened via template reference
  }

  getStatusColorScheme(status: string): string {
    switch (status) {
      case 'RUNNING': return '8';   // Positive green
      case 'PENDING': return '6';   // Information blue
      case 'STOPPED': return '5';   // Neutral
      case 'FAILED': return '1';    // Negative red
      default: return '6';
    }
  }
}