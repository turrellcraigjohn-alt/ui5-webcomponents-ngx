import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PipelineService } from '../../core/services/pipeline.service';
import { Execution } from '../../core/models/pipeline.model';

@Component({
  selector: 'app-executions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="executions">
      <div class="header">
        <ui5-title level="H2">Executions</ui5-title>
        <ui5-button design="Emphasized" icon="play" (click)="openRunDialog()">
          Run Execution
        </ui5-button>
      </div>
      <p class="subtitle">Run and monitor SAP AI Core pipeline executions</p>

      <!-- Loading State -->
      <ui5-busy-indicator *ngIf="loading" active size="Large" class="loading-indicator">
      </ui5-busy-indicator>

      <!-- Executions Table -->
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
          <span>Started</span>
        </ui5-table-column>
        <ui5-table-column slot="columns" min-width="150">
          <span>Completed</span>
        </ui5-table-column>
        <ui5-table-column slot="columns" min-width="100">
          <span>Actions</span>
        </ui5-table-column>

        <ui5-table-row *ngFor="let execution of executions">
          <ui5-table-cell>
            <ui5-link>{{ execution.name }}</ui5-link>
          </ui5-table-cell>
          <ui5-table-cell>
            <ui5-badge [color-scheme]="getStatusColorScheme(execution.status)">
              {{ execution.status }}
            </ui5-badge>
          </ui5-table-cell>
          <ui5-table-cell>{{ execution.scenarioId }}</ui5-table-cell>
          <ui5-table-cell>{{ execution.startedAt ? (execution.startedAt | date:'short') : '-' }}</ui5-table-cell>
          <ui5-table-cell>{{ execution.completedAt ? (execution.completedAt | date:'short') : '-' }}</ui5-table-cell>
          <ui5-table-cell>
            <ui5-button design="Transparent" icon="detail-view" 
              (click)="viewExecution(execution)">
            </ui5-button>
            <ui5-button design="Transparent" icon="stop" 
              *ngIf="execution.status === 'RUNNING'"
              (click)="stopExecution(execution)">
            </ui5-button>
            <ui5-button design="Transparent" icon="refresh" 
              *ngIf="execution.status === 'FAILED'"
              (click)="retryExecution(execution)">
            </ui5-button>
          </ui5-table-cell>
        </ui5-table-row>

        <ui5-table-row *ngIf="executions.length === 0">
          <ui5-table-cell colspan="6">
            <div class="no-data">
              <ui5-icon name="process" style="font-size: 3rem; opacity: 0.5;"></ui5-icon>
              <p>No executions found</p>
              <ui5-button design="Emphasized" (click)="loadExecutions()">
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

      <!-- Run Execution Dialog -->
      <ui5-dialog #runDialog header-text="Run Execution">
        <div class="dialog-content">
          <ui5-wizard>
            <ui5-wizard-step 
              icon="hint" 
              title-text="Select Scenario" 
              [selected]="currentStep === 1"
              (selection-change)="currentStep = 1">
              <div class="wizard-content">
                <ui5-label for="scenarioSelect" required>Scenario</ui5-label>
                <ui5-select #scenarioSelect id="scenarioSelect" class="form-input">
                  <ui5-option value="text-generation">Text Generation</ui5-option>
                  <ui5-option value="embedding-generation">Embedding Generation</ui5-option>
                  <ui5-option value="rag-pipeline">RAG Pipeline</ui5-option>
                  <ui5-option value="custom">Custom Scenario</ui5-option>
                </ui5-select>
              </div>
            </ui5-wizard-step>
            
            <ui5-wizard-step 
              icon="settings" 
              title-text="Configuration" 
              [selected]="currentStep === 2"
              (selection-change)="currentStep = 2">
              <div class="wizard-content">
                <div class="form-row">
                  <ui5-label for="configSelect" required>Configuration</ui5-label>
                  <ui5-input #configSelect id="configSelect" 
                    placeholder="Enter configuration ID"
                    class="form-input">
                  </ui5-input>
                </div>
                <div class="form-row">
                  <ui5-label for="executionName">Execution Name (optional)</ui5-label>
                  <ui5-input #executionName id="executionName" 
                    placeholder="e.g., my-execution-001"
                    class="form-input">
                  </ui5-input>
                </div>
              </div>
            </ui5-wizard-step>
            
            <ui5-wizard-step 
              icon="accept" 
              title-text="Review & Run" 
              [selected]="currentStep === 3"
              (selection-change)="currentStep = 3">
              <div class="wizard-content review-content">
                <ui5-title level="H5">Review Execution</ui5-title>
                <p>Scenario: <strong>{{ scenarioSelect?.value || 'Not selected' }}</strong></p>
                <p>Configuration: <strong>{{ configSelect?.value || 'Not entered' }}</strong></p>
              </div>
            </ui5-wizard-step>
          </ui5-wizard>
        </div>
        <div slot="footer" class="dialog-footer">
          <ui5-button design="Transparent" (click)="runDialog.close()">
            Cancel
          </ui5-button>
          <ui5-button 
            *ngIf="currentStep < 3" 
            design="Default" 
            (click)="currentStep = currentStep + 1">
            Next
          </ui5-button>
          <ui5-button 
            *ngIf="currentStep === 3" 
            design="Emphasized" 
            (click)="runExecution(scenarioSelect.value, configSelect.value); runDialog.close()">
            Run Execution
          </ui5-button>
        </div>
      </ui5-dialog>
    </div>
  `,
  styles: [`
    .executions {
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
      min-width: 500px;
    }

    .wizard-content {
      padding: 1rem;
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

    .review-content p {
      margin: 0.5rem 0;
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
export class ExecutionsComponent implements OnInit {
  private pipelineService = inject(PipelineService);

  executions: Execution[] = [];
  loading = false;
  lastResponse = '';
  currentStep = 1;

  ngOnInit(): void {
    this.loadExecutions();
  }

  loadExecutions(): void {
    this.loading = true;
    this.pipelineService.listExecutions().subscribe({
      next: (response) => {
        this.lastResponse = response;
        this.parseExecutionsFromResponse(response);
        this.loading = false;
      },
      error: (error) => {
        this.lastResponse = `Error: ${error.message}`;
        this.executions = [];
        this.loading = false;
      }
    });
  }

  private parseExecutionsFromResponse(response: string): void {
    // Demo data - in production, parse the actual response
    this.executions = [
      {
        id: 'exec-001',
        name: 'RAG Pipeline Run',
        status: 'COMPLETED',
        scenarioId: 'rag-pipeline',
        configurationId: 'config-rag',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        modifiedAt: new Date().toISOString(),
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 1800000).toISOString()
      },
      {
        id: 'exec-002',
        name: 'Text Generation',
        status: 'RUNNING',
        scenarioId: 'text-generation',
        configurationId: 'config-gpt4',
        createdAt: new Date(Date.now() - 600000).toISOString(),
        modifiedAt: new Date().toISOString(),
        startedAt: new Date(Date.now() - 600000).toISOString()
      }
    ];
  }

  runExecution(scenarioId: string, configurationId: string): void {
    if (!scenarioId || !configurationId) return;

    this.loading = true;
    this.pipelineService.runExecution(scenarioId, configurationId).subscribe({
      next: (response) => {
        this.lastResponse = response;
        this.currentStep = 1;
        this.loadExecutions();
      },
      error: (error) => {
        this.lastResponse = `Error: ${error.message}`;
        this.loading = false;
      }
    });
  }

  viewExecution(execution: Execution): void {
    console.log('View execution:', execution);
  }

  stopExecution(execution: Execution): void {
    this.pipelineService.sendChatCompletion(`stop execution ${execution.id}`).subscribe({
      next: (response) => {
        this.lastResponse = this.pipelineService.extractResponseContent(response);
        this.loadExecutions();
      }
    });
  }

  retryExecution(execution: Execution): void {
    this.runExecution(execution.scenarioId, execution.configurationId);
  }

  openRunDialog(): void {
    this.currentStep = 1;
  }

  getStatusColorScheme(status: string): string {
    switch (status) {
      case 'COMPLETED': return '8';  // Positive green
      case 'RUNNING': return '6';    // Information blue
      case 'PENDING': return '5';    // Neutral
      case 'FAILED': return '1';     // Negative red
      case 'STOPPED': return '5';
      default: return '6';
    }
  }
}