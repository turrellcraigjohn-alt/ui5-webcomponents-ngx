import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PipelineService } from '../../core/services/pipeline.service';
import { GroundingResult } from '../../core/models/pipeline.model';

@Component({
  selector: 'app-grounding',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grounding">
      <ui5-title level="H2">Grounding & Vector Search</ui5-title>
      <p class="subtitle">Document retrieval and semantic search operations</p>

      <!-- Search Section -->
      <ui5-card class="search-card">
        <ui5-card-header
          slot="header"
          title-text="Vector Search"
          subtitle-text="Search documents using semantic similarity"
        >
          <ui5-icon slot="avatar" name="search"></ui5-icon>
        </ui5-card-header>
        <div class="card-content">
          <div class="search-row">
            <ui5-input
              #searchInput
              placeholder="Enter your search query..."
              class="search-input"
              (keyup.enter)="performSearch(searchInput.value)"
            ></ui5-input>
            <ui5-button 
              design="Emphasized" 
              icon="search"
              (click)="performSearch(searchInput.value)"
              [disabled]="searching">
              {{ searching ? 'Searching...' : 'Search' }}
            </ui5-button>
          </div>

          <div class="search-options">
            <div class="option-group">
              <ui5-label for="topK">Top K Results</ui5-label>
              <ui5-step-input #topKInput id="topK" value="5" min="1" max="20"></ui5-step-input>
            </div>
            <div class="option-group">
              <ui5-label for="threshold">Similarity Threshold</ui5-label>
              <ui5-slider #thresholdSlider id="threshold" min="0" max="100" value="70"
                show-tooltip label-interval="10">
              </ui5-slider>
            </div>
          </div>
        </div>
      </ui5-card>

      <!-- Loading State -->
      <ui5-busy-indicator *ngIf="searching" active size="Large" class="loading-indicator">
      </ui5-busy-indicator>

      <!-- Results Section -->
      <div *ngIf="!searching && searchResults.length > 0" class="results-section">
        <ui5-title level="H4">Search Results ({{ searchResults.length }} found)</ui5-title>
        
        <ui5-list mode="None" header-text="Documents">
          <ui5-li-custom *ngFor="let result of searchResults; let i = index">
            <div class="result-item">
              <div class="result-header">
                <ui5-badge color-scheme="8">Score: {{ (result.score * 100).toFixed(1) }}%</ui5-badge>
                <span class="result-id">{{ result.id }}</span>
              </div>
              <div class="result-content">
                {{ result.content }}
              </div>
              <div class="result-metadata" *ngIf="result.metadata">
                <ui5-badge 
                  *ngFor="let meta of getMetadata(result.metadata)"
                  color-scheme="6">
                  {{ meta.key }}: {{ meta.value }}
                </ui5-badge>
              </div>
            </div>
          </ui5-li-custom>
        </ui5-list>
      </div>

      <!-- No Results -->
      <div *ngIf="!searching && searched && searchResults.length === 0" class="no-results">
        <ui5-illustrated-message name="NoSearchResults">
          <ui5-title slot="title" level="H4">No Results Found</ui5-title>
          <div slot="subtitle">
            Try adjusting your search query or lowering the similarity threshold.
          </div>
        </ui5-illustrated-message>
      </div>

      <!-- Grounding Status Card -->
      <ui5-card class="status-card">
        <ui5-card-header
          slot="header"
          title-text="Grounding Status"
          subtitle-text="Check vector index health"
        >
          <ui5-icon slot="avatar" name="database"></ui5-icon>
        </ui5-card-header>
        <div class="card-content">
          <div class="status-row">
            <span class="label">Index Status:</span>
            <ui5-badge [color-scheme]="indexStatus === 'ready' ? '8' : '6'">
              {{ indexStatus | titlecase }}
            </ui5-badge>
          </div>
          <ui5-button design="Transparent" icon="refresh" (click)="checkGroundingStatus()">
            Check Status
          </ui5-button>
        </div>
      </ui5-card>

      <!-- Response Panel -->
      <ui5-panel *ngIf="lastResponse" header-text="Backend Response" collapsed>
        <pre class="response-content">{{ lastResponse }}</pre>
      </ui5-panel>
    </div>
  `,
  styles: [`
    .grounding {
      padding: 1rem;
    }

    .subtitle {
      color: var(--sapContent_LabelColor);
      margin-bottom: 1.5rem;
    }

    .search-card {
      margin-bottom: 1rem;
    }

    .card-content {
      padding: 1rem;
    }

    .search-row {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .search-input {
      flex: 1;
    }

    .search-options {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
    }

    .option-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .loading-indicator {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }

    .results-section {
      margin-top: 1rem;
    }

    .result-item {
      padding: 1rem;
      border-bottom: 1px solid var(--sapGroup_ContentBorderColor);
    }

    .result-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .result-id {
      color: var(--sapContent_LabelColor);
      font-size: 0.875rem;
    }

    .result-content {
      font-size: 0.9rem;
      line-height: 1.5;
      margin-bottom: 0.5rem;
    }

    .result-metadata {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .no-results {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }

    .status-card {
      margin-top: 1rem;
    }

    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .label {
      color: var(--sapContent_LabelColor);
      font-weight: 500;
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

    ui5-slider {
      width: 200px;
    }
  `]
})
export class GroundingComponent {
  private pipelineService = inject(PipelineService);

  searchResults: GroundingResult[] = [];
  searching = false;
  searched = false;
  lastResponse = '';
  indexStatus = 'unknown';

  performSearch(query: string): void {
    if (!query.trim()) return;

    this.searching = true;
    this.searched = true;
    this.searchResults = [];

    this.pipelineService.groundingSearch(query).subscribe({
      next: (response) => {
        this.lastResponse = response;
        this.parseSearchResults(response);
        this.searching = false;
      },
      error: (error) => {
        this.lastResponse = `Error: ${error.message}`;
        this.searchResults = [];
        this.searching = false;
      }
    });
  }

  private parseSearchResults(response: string): void {
    // Demo data - in production, parse the actual response
    this.searchResults = [
      {
        id: 'doc-001',
        content: 'SAP AI Core provides a standardized way to develop, deploy, and operate AI solutions at scale. It supports various ML frameworks and provides infrastructure for training and inference.',
        score: 0.92,
        metadata: { source: 'documentation', type: 'overview' }
      },
      {
        id: 'doc-002',
        content: 'The orchestration service routes requests to appropriate AI models based on intent detection. It uses Mangle Datalog rules for declarative routing logic.',
        score: 0.85,
        metadata: { source: 'technical-spec', type: 'architecture' }
      },
      {
        id: 'doc-003',
        content: 'Vector embeddings enable semantic search across documents. The grounding service integrates with various vector stores including SAP HANA Vector Engine.',
        score: 0.78,
        metadata: { source: 'guide', type: 'embedding' }
      }
    ];
  }

  checkGroundingStatus(): void {
    this.pipelineService.checkGroundingStatus().subscribe({
      next: (response) => {
        this.lastResponse = response;
        // Parse status from response
        if (response.toLowerCase().includes('green') || response.toLowerCase().includes('ready')) {
          this.indexStatus = 'ready';
        } else if (response.toLowerCase().includes('yellow') || response.toLowerCase().includes('initializing')) {
          this.indexStatus = 'initializing';
        } else {
          this.indexStatus = 'unknown';
        }
      },
      error: (error) => {
        this.lastResponse = `Error: ${error.message}`;
        this.indexStatus = 'error';
      }
    });
  }

  getMetadata(metadata: Record<string, unknown>): { key: string; value: string }[] {
    return Object.entries(metadata).map(([key, value]) => ({
      key,
      value: String(value)
    }));
  }
}