import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { McpClientService, McpToolCallResult } from '../../core/services/mcp-client.service';
import { ConnectionService } from '../../core/services/connection.service';

interface QueryHistoryItem {
  query: string;
  timestamp: Date;
  success: boolean;
  duration?: number;
}

@Component({
  selector: 'app-cypher-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <ui5-page background-design="Solid">
      <ui5-bar slot="header">
        <ui5-title slot="startContent" level="H3">Cypher Editor</ui5-title>
        <ui5-button 
          slot="endContent" 
          design="Emphasized" 
          icon="play" 
          (click)="executeQuery()"
          [disabled]="executing || !query.trim()">
          {{ executing ? 'Executing...' : 'Execute' }}
        </ui5-button>
      </ui5-bar>

      <div class="editor-container">
        <!-- Query Input -->
        <ui5-panel header-text="Query" class="query-panel">
          <ui5-textarea
            [(ngModel)]="query"
            placeholder="Enter your Cypher query..."
            rows="8"
            growing
            growing-max-rows="20"
            class="cypher-input"
            (keydown.ctrl.enter)="executeQuery()">
          </ui5-textarea>

          <div class="query-actions">
            <ui5-button design="Transparent" icon="refresh" (click)="clearQuery()">
              Clear
            </ui5-button>
            <ui5-button design="Transparent" icon="copy" (click)="copyQuery()">
              Copy
            </ui5-button>
            <ui5-select [(value)]="selectedTemplate" (change)="applyTemplate()">
              <ui5-option value="">Templates...</ui5-option>
              <ui5-option value="match-all">Match All Nodes</ui5-option>
              <ui5-option value="count-nodes">Count Nodes by Label</ui5-option>
              <ui5-option value="find-paths">Find Shortest Path</ui5-option>
              <ui5-option value="create-node">Create Node</ui5-option>
            </ui5-select>
          </div>
        </ui5-panel>

        <!-- Results -->
        <ui5-panel header-text="Results" [collapsed]="!result" class="results-panel">
          <ui5-message-strip 
            *ngIf="error" 
            design="Negative"
            (close)="error = ''">
            {{ error }}
          </ui5-message-strip>

          <div *ngIf="result && !error" class="result-content">
            <ui5-message-strip design="Positive" hide-close-button>
              Query executed successfully in {{ executionTime }}ms
            </ui5-message-strip>

            <pre class="result-json">{{ resultJson }}</pre>
          </div>

          <ui5-illustrated-message 
            *ngIf="!result && !error && !executing"
            name="BeforeSearch"
            title-text="No Results Yet"
            subtitle-text="Execute a Cypher query to see results">
          </ui5-illustrated-message>
        </ui5-panel>

        <!-- Query History -->
        <ui5-panel header-text="Query History" [collapsed]="!history.length">
          <ui5-list mode="SingleSelect">
            <ui5-li 
              *ngFor="let item of history"
              icon="{{ item.success ? 'accept' : 'error' }}"
              description="{{ item.timestamp | date:'short' }}"
              (click)="loadFromHistory(item)">
              {{ item.query | slice:0:60 }}{{ item.query.length > 60 ? '...' : '' }}
            </ui5-li>
          </ui5-list>
        </ui5-panel>
      </div>
    </ui5-page>
  `,
  styles: [`
    .editor-container {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .query-panel, .results-panel {
      width: 100%;
    }

    .cypher-input {
      width: 100%;
      font-family: 'Fira Code', 'Consolas', monospace;
    }

    .query-actions {
      display: flex;
      gap: 0.5rem;
      padding-top: 0.5rem;
    }

    .result-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .result-json {
      background: var(--sapField_Background);
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      font-family: 'Fira Code', 'Consolas', monospace;
      font-size: 12px;
      max-height: 400px;
      overflow-y: auto;
    }

    ui5-li {
      cursor: pointer;
    }
  `]
})
export class CypherEditorComponent implements OnInit {
  private mcpClient = inject(McpClientService);
  private connectionService = inject(ConnectionService);

  query = '';
  result: McpToolCallResult | null = null;
  resultJson = '';
  error = '';
  executing = false;
  executionTime = 0;
  history: QueryHistoryItem[] = [];
  selectedTemplate = '';

  private templates: Record<string, string> = {
    'match-all': 'MATCH (n) RETURN n LIMIT 25',
    'count-nodes': 'MATCH (n) RETURN labels(n)[0] AS label, count(*) AS count ORDER BY count DESC',
    'find-paths': 'MATCH path = shortestPath((a)-[*]-(b))\nWHERE id(a) = $startId AND id(b) = $endId\nRETURN path',
    'create-node': 'CREATE (n:Label {name: $name})\nRETURN n'
  };

  ngOnInit() {
    this.loadHistory();
  }

  async executeQuery() {
    if (!this.query.trim() || this.executing) return;

    this.executing = true;
    this.error = '';
    this.result = null;
    const startTime = Date.now();

    try {
      this.result = await this.mcpClient.executeCypher(this.query);
      this.executionTime = Date.now() - startTime;

      if (this.result.isError) {
        this.error = this.result.content?.[0]?.text || 'Query failed';
        this.addToHistory(this.query, false);
      } else {
        this.resultJson = JSON.stringify(
          this.result.content?.map(c => c.text) || [],
          null,
          2
        );
        this.addToHistory(this.query, true, this.executionTime);
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error';
      this.addToHistory(this.query, false);
    } finally {
      this.executing = false;
    }
  }

  clearQuery() {
    this.query = '';
    this.result = null;
    this.error = '';
  }

  copyQuery() {
    navigator.clipboard.writeText(this.query);
  }

  applyTemplate() {
    if (this.selectedTemplate && this.templates[this.selectedTemplate]) {
      this.query = this.templates[this.selectedTemplate];
      this.selectedTemplate = '';
    }
  }

  loadFromHistory(item: QueryHistoryItem) {
    this.query = item.query;
  }

  private addToHistory(query: string, success: boolean, duration?: number) {
    this.history.unshift({
      query,
      timestamp: new Date(),
      success,
      duration
    });

    // Keep only last 20 items
    if (this.history.length > 20) {
      this.history = this.history.slice(0, 20);
    }

    this.saveHistory();
  }

  private loadHistory() {
    try {
      const saved = localStorage.getItem('cypher-query-history');
      if (saved) {
        this.history = JSON.parse(saved).map((item: QueryHistoryItem) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (e) {
      console.warn('Failed to load query history:', e);
    }
  }

  private saveHistory() {
    try {
      localStorage.setItem('cypher-query-history', JSON.stringify(this.history));
    } catch (e) {
      console.warn('Failed to save query history:', e);
    }
  }
}