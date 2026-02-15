import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { McpClientService, McpToolCallResult } from '../../core/services/mcp-client.service';
import { ConnectionService } from '../../core/services/connection.service';

interface GdsProcedure {
  name: string;
  description: string;
  category: string;
}

@Component({
  selector: 'app-gds-explorer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ui5-page background-design="Solid">
      <ui5-bar slot="header">
        <ui5-title slot="startContent" level="H3">Graph Data Science Explorer</ui5-title>
        <ui5-button 
          slot="endContent" 
          design="Emphasized" 
          (click)="loadProcedures()"
          [disabled]="loading">
          {{ loading ? 'Loading...' : 'Refresh Procedures' }}
        </ui5-button>
      </ui5-bar>

      <div class="gds-container">
        <!-- GDS Status Panel -->
        <ui5-panel header-text="GDS Status">
          <ui5-message-strip 
            *ngIf="gdsAvailable === true"
            design="Positive"
            hide-close-button>
            Neo4j Graph Data Science library is installed and available.
          </ui5-message-strip>

          <ui5-message-strip 
            *ngIf="gdsAvailable === false"
            design="Warning"
            hide-close-button>
            GDS library not detected. Some features may be unavailable.
          </ui5-message-strip>

          <ui5-message-strip 
            *ngIf="gdsAvailable === null && !loading"
            design="Information"
            hide-close-button>
            Click "Refresh Procedures" to check GDS availability.
          </ui5-message-strip>
        </ui5-panel>

        <!-- Algorithm Categories -->
        <ui5-panel header-text="Algorithm Categories">
          <div class="categories-grid">
            <ui5-card 
              *ngFor="let category of categories"
              class="category-card"
              (click)="filterByCategory(category.name)">
              <ui5-card-header 
                slot="header"
                [titleText]="category.name"
                [subtitleText]="category.count + ' algorithms'"
                [status]="selectedCategory === category.name ? 'Selected' : ''">
              </ui5-card-header>
              <div class="card-content">
                <ui5-icon [name]="category.icon" class="category-icon"></ui5-icon>
              </div>
            </ui5-card>
          </div>
        </ui5-panel>

        <!-- Procedures List -->
        <ui5-panel header-text="Available Procedures" [collapsed]="!procedures.length">
          <ui5-input 
            placeholder="Search procedures..."
            [(ngModel)]="searchQuery"
            (input)="filterProcedures()"
            class="search-input">
            <ui5-icon slot="icon" name="search"></ui5-icon>
          </ui5-input>

          <ui5-table *ngIf="filteredProcedures.length">
            <ui5-table-column slot="columns">
              <ui5-label>Procedure Name</ui5-label>
            </ui5-table-column>
            <ui5-table-column slot="columns">
              <ui5-label>Category</ui5-label>
            </ui5-table-column>
            <ui5-table-column slot="columns">
              <ui5-label>Description</ui5-label>
            </ui5-table-column>

            <ui5-table-row *ngFor="let proc of filteredProcedures">
              <ui5-table-cell>
                <ui5-badge color-scheme="8">{{ proc.name }}</ui5-badge>
              </ui5-table-cell>
              <ui5-table-cell>
                {{ proc.category }}
              </ui5-table-cell>
              <ui5-table-cell>
                {{ proc.description }}
              </ui5-table-cell>
            </ui5-table-row>
          </ui5-table>

          <ui5-illustrated-message 
            *ngIf="!filteredProcedures.length && !loading"
            name="NoSearchResults"
            title-text="No Procedures Found"
            subtitle-text="Try a different search term or category">
          </ui5-illustrated-message>
        </ui5-panel>

        <!-- Common Operations Panel -->
        <ui5-panel header-text="Common GDS Operations">
          <div class="operations-grid">
            <ui5-button 
              design="Default"
              icon="org-chart"
              [disabled]="!gdsAvailable"
              (click)="runOperation('pagerank')">
              PageRank
            </ui5-button>

            <ui5-button 
              design="Default"
              icon="collaborate"
              [disabled]="!gdsAvailable"
              (click)="runOperation('community')">
              Community Detection
            </ui5-button>

            <ui5-button 
              design="Default"
              icon="connected"
              [disabled]="!gdsAvailable"
              (click)="runOperation('similarity')">
              Node Similarity
            </ui5-button>

            <ui5-button 
              design="Default"
              icon="journey-change"
              [disabled]="!gdsAvailable"
              (click)="runOperation('pathfinding')">
              Pathfinding
            </ui5-button>
          </div>
        </ui5-panel>
      </div>
    </ui5-page>
  `,
  styles: [`
    .gds-container {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .category-card {
      cursor: pointer;
      min-height: 100px;
    }

    .card-content {
      padding: 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .category-icon {
      font-size: 2rem;
      color: var(--sapContent_IconColor);
    }

    .search-input {
      width: 100%;
      margin-bottom: 1rem;
    }

    .operations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.5rem;
    }

    ui5-badge {
      font-family: monospace;
    }
  `]
})
export class GdsExplorerComponent implements OnInit {
  private mcpClient = inject(McpClientService);
  private connectionService = inject(ConnectionService);

  procedures: GdsProcedure[] = [];
  filteredProcedures: GdsProcedure[] = [];
  loading = false;
  gdsAvailable: boolean | null = null;
  searchQuery = '';
  selectedCategory = '';

  categories = [
    { name: 'Centrality', icon: 'trend-up', count: 0 },
    { name: 'Community', icon: 'group', count: 0 },
    { name: 'Similarity', icon: 'compare', count: 0 },
    { name: 'Path Finding', icon: 'map', count: 0 },
    { name: 'Link Prediction', icon: 'chain-link', count: 0 },
    { name: 'Node Embedding', icon: 'dimension', count: 0 }
  ];

  ngOnInit() {
    this.connectionService.state$.subscribe(state => {
      if (state === 'connected') {
        this.loadProcedures();
      }
    });
  }

  async loadProcedures() {
    if (this.loading) return;

    this.loading = true;
    try {
      const result = await this.mcpClient.listGdsProcedures();
      
      if (result.isError) {
        this.gdsAvailable = false;
        this.procedures = [];
      } else {
        this.gdsAvailable = true;
        this.procedures = this.parseProcedures(result);
        this.updateCategoryCounts();
      }
      
      this.filterProcedures();
    } catch (error) {
      this.gdsAvailable = false;
      console.error('Failed to load GDS procedures:', error);
    } finally {
      this.loading = false;
    }
  }

  filterByCategory(category: string) {
    this.selectedCategory = this.selectedCategory === category ? '' : category;
    this.filterProcedures();
  }

  filterProcedures() {
    let filtered = this.procedures;

    if (this.selectedCategory) {
      filtered = filtered.filter(p => p.category === this.selectedCategory);
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    this.filteredProcedures = filtered;
  }

  async runOperation(operation: string) {
    // Navigate to cypher editor with pre-filled query
    const queries: Record<string, string> = {
      pagerank: `CALL gds.pageRank.stream('myGraph')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS name, score
ORDER BY score DESC LIMIT 10`,
      community: `CALL gds.louvain.stream('myGraph')
YIELD nodeId, communityId
RETURN gds.util.asNode(nodeId).name AS name, communityId
ORDER BY communityId`,
      similarity: `CALL gds.nodeSimilarity.stream('myGraph')
YIELD node1, node2, similarity
RETURN gds.util.asNode(node1).name AS from,
       gds.util.asNode(node2).name AS to,
       similarity
ORDER BY similarity DESC LIMIT 10`,
      pathfinding: `MATCH (source:Node {name: 'A'}), (target:Node {name: 'B'})
CALL gds.shortestPath.dijkstra.stream('myGraph', {
  sourceNode: source,
  targetNode: target
})
YIELD path
RETURN path`
    };

    if (queries[operation]) {
      localStorage.setItem('cypher-preset-query', queries[operation]);
      window.location.hash = '#/cypher';
    }
  }

  private parseProcedures(result: McpToolCallResult): GdsProcedure[] {
    try {
      const text = result.content?.[0]?.text || '[]';
      const parsed = JSON.parse(text);
      
      return (parsed as Array<{name: string; description: string}>).map(p => ({
        name: p.name,
        description: p.description || '',
        category: this.categorize(p.name)
      }));
    } catch {
      return [];
    }
  }

  private categorize(name: string): string {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('pagerank') || lowerName.includes('centrality') || lowerName.includes('degree')) {
      return 'Centrality';
    }
    if (lowerName.includes('louvain') || lowerName.includes('community') || lowerName.includes('modularity')) {
      return 'Community';
    }
    if (lowerName.includes('similarity') || lowerName.includes('knn')) {
      return 'Similarity';
    }
    if (lowerName.includes('path') || lowerName.includes('dijkstra') || lowerName.includes('astar')) {
      return 'Path Finding';
    }
    if (lowerName.includes('link') || lowerName.includes('predict')) {
      return 'Link Prediction';
    }
    if (lowerName.includes('embed') || lowerName.includes('node2vec') || lowerName.includes('graphsage')) {
      return 'Node Embedding';
    }
    
    return 'Other';
  }

  private updateCategoryCounts() {
    for (const category of this.categories) {
      category.count = this.procedures.filter(p => p.category === category.name).length;
    }
  }
}