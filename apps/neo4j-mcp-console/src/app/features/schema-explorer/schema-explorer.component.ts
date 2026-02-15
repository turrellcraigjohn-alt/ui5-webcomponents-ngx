import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { McpClientService, DatabaseSchema, SchemaNode, SchemaRelationship } from '../../core/services/mcp-client.service';
import { ConnectionService } from '../../core/services/connection.service';

@Component({
  selector: 'app-schema-explorer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ui5-page background-design="Solid">
      <ui5-bar slot="header">
        <ui5-title slot="startContent" level="H3">Schema Explorer</ui5-title>
        <ui5-button slot="endContent" design="Emphasized" (click)="refreshSchema()" [disabled]="loading">
          {{ loading ? 'Loading...' : 'Refresh Schema' }}
        </ui5-button>
      </ui5-bar>

      <div class="schema-container">
        <!-- Node Labels Panel -->
        <ui5-panel header-text="Node Labels" [collapsed]="nodesCollapsed">
          <ui5-table *ngIf="schema?.nodes?.length">
            <ui5-table-column slot="columns">
              <ui5-label>Label</ui5-label>
            </ui5-table-column>
            <ui5-table-column slot="columns">
              <ui5-label>Properties</ui5-label>
            </ui5-table-column>
            <ui5-table-column slot="columns">
              <ui5-label>Count</ui5-label>
            </ui5-table-column>

            <ui5-table-row *ngFor="let node of schema?.nodes">
              <ui5-table-cell>
                <ui5-badge color-scheme="6">{{ node.label }}</ui5-badge>
              </ui5-table-cell>
              <ui5-table-cell>
                <span *ngFor="let prop of node.properties; let last = last">
                  {{ prop.name }}: {{ prop.type }}{{ last ? '' : ', ' }}
                </span>
              </ui5-table-cell>
              <ui5-table-cell>
                {{ node.nodeCount | number }}
              </ui5-table-cell>
            </ui5-table-row>
          </ui5-table>

          <ui5-illustrated-message 
            *ngIf="!schema?.nodes?.length && !loading"
            name="NoData"
            title-text="No Node Labels"
            subtitle-text="No node labels found in the database">
          </ui5-illustrated-message>
        </ui5-panel>

        <!-- Relationships Panel -->
        <ui5-panel header-text="Relationship Types" [collapsed]="relsCollapsed">
          <ui5-table *ngIf="schema?.relationships?.length">
            <ui5-table-column slot="columns">
              <ui5-label>Type</ui5-label>
            </ui5-table-column>
            <ui5-table-column slot="columns">
              <ui5-label>Pattern</ui5-label>
            </ui5-table-column>
            <ui5-table-column slot="columns">
              <ui5-label>Properties</ui5-label>
            </ui5-table-column>

            <ui5-table-row *ngFor="let rel of schema?.relationships">
              <ui5-table-cell>
                <ui5-badge color-scheme="2">{{ rel.type }}</ui5-badge>
              </ui5-table-cell>
              <ui5-table-cell>
                ({{ rel.startLabels?.join('|') || '*' }})-[:{{ rel.type }}]->({{ rel.endLabels?.join('|') || '*' }})
              </ui5-table-cell>
              <ui5-table-cell>
                <span *ngFor="let prop of rel.properties; let last = last">
                  {{ prop.name }}: {{ prop.type }}{{ last ? '' : ', ' }}
                </span>
              </ui5-table-cell>
            </ui5-table-row>
          </ui5-table>

          <ui5-illustrated-message 
            *ngIf="!schema?.relationships?.length && !loading"
            name="NoData"
            title-text="No Relationship Types"
            subtitle-text="No relationship types found in the database">
          </ui5-illustrated-message>
        </ui5-panel>

        <!-- Schema Visualization -->
        <ui5-panel header-text="Schema Visualization" [collapsed]="vizCollapsed">
          <div class="viz-container">
            <svg #schemaSvg width="100%" height="400">
              <!-- Simple visualization will be rendered here -->
              <g *ngFor="let node of schema?.nodes; let i = index">
                <circle 
                  [attr.cx]="100 + (i * 150)" 
                  cy="200" 
                  r="40" 
                  fill="#4169E1" 
                  stroke="#1E90FF" 
                  stroke-width="2">
                </circle>
                <text 
                  [attr.x]="100 + (i * 150)" 
                  y="205" 
                  text-anchor="middle" 
                  fill="white" 
                  font-size="12">
                  {{ node.label }}
                </text>
              </g>
            </svg>
          </div>
        </ui5-panel>
      </div>
    </ui5-page>
  `,
  styles: [`
    .schema-container {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    ui5-panel {
      width: 100%;
    }

    ui5-badge {
      margin-right: 0.5rem;
    }

    .viz-container {
      background: var(--sapBackgroundColor);
      border-radius: 8px;
      min-height: 400px;
    }
  `]
})
export class SchemaExplorerComponent implements OnInit {
  private mcpClient = inject(McpClientService);
  private connectionService = inject(ConnectionService);

  schema: DatabaseSchema | null = null;
  loading = false;
  nodesCollapsed = false;
  relsCollapsed = false;
  vizCollapsed = true;

  ngOnInit() {
    this.mcpClient.schema$.subscribe(schema => {
      this.schema = schema;
    });

    // Auto-load schema if connected
    this.connectionService.state$.subscribe(state => {
      if (state === 'connected' && !this.schema) {
        this.refreshSchema();
      }
    });
  }

  async refreshSchema() {
    if (this.loading) return;
    
    this.loading = true;
    try {
      await this.mcpClient.getSchema();
    } finally {
      this.loading = false;
    }
  }
}