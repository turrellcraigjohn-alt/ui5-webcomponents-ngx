import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PipelineService } from '../../core/services/pipeline.service';
import { Scenario } from '../../core/models/pipeline.model';

@Component({
  selector: 'app-scenarios',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scenarios">
      <div class="header">
        <ui5-title level="H2">Scenarios</ui5-title>
        <ui5-button design="Transparent" icon="refresh" (click)="loadScenarios()">
          Refresh
        </ui5-button>
      </div>
      <p class="subtitle">Browse available SAP AI Core scenarios</p>

      <!-- Loading State -->
      <ui5-busy-indicator *ngIf="loading" active size="Large" class="loading-indicator">
      </ui5-busy-indicator>

      <!-- Scenarios Tree/List -->
      <div *ngIf="!loading" class="scenarios-container">
        <ui5-tree header-text="Available Scenarios">
          <ui5-tree-item 
            *ngFor="let scenario of scenarios"
            [text]="scenario.name"
            [additionalText]="scenario.id"
            icon="folder-blank"
            expanded>
            <ui5-tree-item 
              [text]="'ID: ' + scenario.id"
              icon="tag"
              has-children="false">
            </ui5-tree-item>
            <ui5-tree-item 
              *ngIf="scenario.description"
              [text]="scenario.description"
              icon="hint"
              has-children="false">
            </ui5-tree-item>
            <ui5-tree-item 
              [text]="'Created: ' + (scenario.createdAt | date:'short')"
              icon="calendar"
              has-children="false">
            </ui5-tree-item>
          </ui5-tree-item>
        </ui5-tree>

        <div *ngIf="scenarios.length === 0" class="no-data">
          <ui5-illustrated-message name="NoData">
            <ui5-title slot="title" level="H4">No Scenarios Found</ui5-title>
            <div slot="subtitle">
              No scenarios are available. Check your SAP AI Core configuration.
            </div>
          </ui5-illustrated-message>
        </div>
      </div>

      <!-- Scenario Details Card -->
      <ui5-card *ngIf="selectedScenario" class="details-card">
        <ui5-card-header
          slot="header"
          [title-text]="selectedScenario.name"
          [subtitle-text]="selectedScenario.id"
        >
          <ui5-icon slot="avatar" name="tree"></ui5-icon>
        </ui5-card-header>
        <div class="card-content">
          <div class="detail-row">
            <span class="label">ID:</span>
            <span>{{ selectedScenario.id }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Name:</span>
            <span>{{ selectedScenario.name }}</span>
          </div>
          <div class="detail-row" *ngIf="selectedScenario.description">
            <span class="label">Description:</span>
            <span>{{ selectedScenario.description }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Created:</span>
            <span>{{ selectedScenario.createdAt | date:'medium' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Modified:</span>
            <span>{{ selectedScenario.modifiedAt | date:'medium' }}</span>
          </div>
          <div class="detail-row" *ngIf="selectedScenario.labels">
            <span class="label">Labels:</span>
            <div class="labels-container">
              <ui5-badge 
                *ngFor="let label of getLabels(selectedScenario.labels)"
                color-scheme="7">
                {{ label.key }}: {{ label.value }}
              </ui5-badge>
            </div>
          </div>
          <div class="action-buttons">
            <ui5-button design="Emphasized" icon="play" 
              (click)="runScenario(selectedScenario)">
              Run Execution
            </ui5-button>
            <ui5-button design="Default" icon="deploy" 
              (click)="createDeployment(selectedScenario)">
              Create Deployment
            </ui5-button>
          </div>
        </div>
      </ui5-card>

      <!-- Response Panel -->
      <ui5-panel *ngIf="lastResponse" header-text="Backend Response" collapsed>
        <pre class="response-content">{{ lastResponse }}</pre>
      </ui5-panel>
    </div>
  `,
  styles: [`
    .scenarios {
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

    .scenarios-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
      color: var(--sapContent_LabelColor);
    }

    .details-card {
      height: fit-content;
    }

    .card-content {
      padding: 1rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--sapGroup_ContentBorderColor);
    }

    .label {
      color: var(--sapContent_LabelColor);
      font-weight: 500;
      min-width: 100px;
    }

    .labels-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
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

    ui5-panel {
      margin-top: 1rem;
    }

    ui5-tree {
      height: 400px;
      overflow: auto;
    }

    @media (max-width: 768px) {
      .scenarios-container {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ScenariosComponent implements OnInit {
  private pipelineService = inject(PipelineService);

  scenarios: Scenario[] = [];
  selectedScenario: Scenario | null = null;
  loading = false;
  lastResponse = '';

  ngOnInit(): void {
    this.loadScenarios();
  }

  loadScenarios(): void {
    this.loading = true;
    this.pipelineService.listScenarios().subscribe({
      next: (response) => {
        this.lastResponse = response;
        this.parseScenariosFromResponse(response);
        this.loading = false;
        if (this.scenarios.length > 0) {
          this.selectedScenario = this.scenarios[0];
        }
      },
      error: (error) => {
        this.lastResponse = `Error: ${error.message}`;
        this.scenarios = [];
        this.loading = false;
      }
    });
  }

  private parseScenariosFromResponse(response: string): void {
    // Demo data - in production, parse the actual response
    this.scenarios = [
      {
        id: 'text-generation',
        name: 'Text Generation',
        description: 'Generate text using LLM models like GPT-4',
        labels: { type: 'llm', capability: 'generation' },
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        modifiedAt: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        id: 'embedding-generation',
        name: 'Embedding Generation',
        description: 'Generate vector embeddings for documents',
        labels: { type: 'embedding', capability: 'vectorization' },
        createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
        modifiedAt: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        id: 'rag-pipeline',
        name: 'RAG Pipeline',
        description: 'Retrieval Augmented Generation pipeline',
        labels: { type: 'rag', capability: 'qa' },
        createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
        modifiedAt: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      {
        id: 'classification',
        name: 'Document Classification',
        description: 'Classify documents into categories',
        labels: { type: 'classification', capability: 'ml' },
        createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        modifiedAt: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];
  }

  selectScenario(scenario: Scenario): void {
    this.selectedScenario = scenario;
  }

  runScenario(scenario: Scenario): void {
    console.log('Run scenario:', scenario);
    // Navigate to executions with scenario pre-selected
  }

  createDeployment(scenario: Scenario): void {
    console.log('Create deployment for scenario:', scenario);
    // Navigate to deployments with scenario pre-selected
  }

  getLabels(labels: Record<string, string>): { key: string; value: string }[] {
    return Object.entries(labels).map(([key, value]) => ({ key, value }));
  }
}