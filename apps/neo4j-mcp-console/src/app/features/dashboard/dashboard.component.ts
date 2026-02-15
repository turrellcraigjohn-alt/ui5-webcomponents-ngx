import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectionService } from '../../core/services/connection.service';
import { McpClientService, McpTool } from '../../core/services/mcp-client.service';
import { ConnectionState, ConnectionInfo } from '../../core/models/connection.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ui5-page background-design="Solid">
      <ui5-bar slot="header">
        <ui5-title slot="startContent" level="H3">Dashboard</ui5-title>
      </ui5-bar>

      <div class="dashboard-container">
        <!-- Connection Status Card -->
        <ui5-card class="dashboard-card">
          <ui5-card-header 
            slot="header"
            title-text="Connection Status"
            [status]="connectionState === 'connected' ? 'Connected' : 'Disconnected'"
            interactive
            (click)="navigateToSettings()">
          </ui5-card-header>

          <div class="card-content">
            <ui5-message-strip 
              *ngIf="connectionState === 'connected'"
              design="Positive"
              hide-close-button>
              Connected to Neo4j Database
            </ui5-message-strip>

            <ui5-message-strip 
              *ngIf="connectionState === 'disconnected'"
              design="Warning"
              hide-close-button>
              Not connected - Configure settings to connect
            </ui5-message-strip>

            <ui5-message-strip 
              *ngIf="connectionState === 'error'"
              design="Negative"
              hide-close-button>
              Connection Error - Check settings
            </ui5-message-strip>

            <div *ngIf="connectionInfo" class="connection-details">
              <div class="detail-row">
                <span class="label">Database:</span>
                <span class="value">{{ connectionInfo.database }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Version:</span>
                <span class="value">{{ connectionInfo.neo4jVersion }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Edition:</span>
                <span class="value">{{ connectionInfo.edition }}</span>
              </div>
            </div>
          </div>
        </ui5-card>

        <!-- Available Tools Card -->
        <ui5-card class="dashboard-card">
          <ui5-card-header 
            slot="header"
            title-text="MCP Tools"
            subtitle-text="{{ tools.length }} tools available">
          </ui5-card-header>

          <div class="card-content">
            <ui5-list *ngIf="tools.length">
              <ui5-li 
                *ngFor="let tool of tools"
                icon="wrench"
                [description]="tool.description">
                {{ tool.name }}
              </ui5-li>
            </ui5-list>

            <ui5-illustrated-message 
              *ngIf="!tools.length && connectionState === 'connected'"
              name="NoData"
              title-text="No Tools Available">
            </ui5-illustrated-message>

            <ui5-button 
              *ngIf="connectionState === 'connected'"
              design="Emphasized" 
              (click)="refreshTools()">
              Refresh Tools
            </ui5-button>
          </div>
        </ui5-card>

        <!-- Quick Actions Card -->
        <ui5-card class="dashboard-card">
          <ui5-card-header 
            slot="header"
            title-text="Quick Actions">
          </ui5-card-header>

          <div class="card-content actions-grid">
            <ui5-button 
              design="Default" 
              icon="tree"
              [disabled]="connectionState !== 'connected'"
              (click)="navigateToSchema()">
              View Schema
            </ui5-button>

            <ui5-button 
              design="Default" 
              icon="syntax"
              [disabled]="connectionState !== 'connected'"
              (click)="navigateToCypher()">
              Run Query
            </ui5-button>

            <ui5-button 
              design="Default" 
              icon="chart-axis"
              [disabled]="connectionState !== 'connected'"
              (click)="navigateToGds()">
              GDS Explorer
            </ui5-button>

            <ui5-button 
              design="Default" 
              icon="action-settings"
              (click)="navigateToSettings()">
              Settings
            </ui5-button>
          </div>
        </ui5-card>

        <!-- Getting Started Card -->
        <ui5-card class="dashboard-card" *ngIf="connectionState !== 'connected'">
          <ui5-card-header 
            slot="header"
            title-text="Getting Started">
          </ui5-card-header>

          <div class="card-content">
            <ui5-timeline>
              <ui5-timeline-item 
                title-text="Configure Connection"
                subtitle-text="Set your Neo4j connection details"
                icon="settings">
                <p>Go to Settings and enter your Neo4j URI, username, and password.</p>
              </ui5-timeline-item>

              <ui5-timeline-item 
                title-text="Start MCP Server"
                subtitle-text="Run the Neo4j MCP Server"
                icon="connected">
                <p>Start the Zig-based MCP server in HTTP mode on port 8080.</p>
              </ui5-timeline-item>

              <ui5-timeline-item 
                title-text="Test Connection"
                subtitle-text="Verify connectivity"
                icon="accept">
                <p>Click "Test Connection" in Settings to verify everything works.</p>
              </ui5-timeline-item>
            </ui5-timeline>
          </div>
        </ui5-card>
      </div>
    </ui5-page>
  `,
  styles: [`
    .dashboard-container {
      padding: 1rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1rem;
    }

    .dashboard-card {
      min-height: 200px;
    }

    .card-content {
      padding: 1rem;
    }

    .connection-details {
      margin-top: 1rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--sapGroup_ContentBorderColor);
    }

    .label {
      color: var(--sapContent_LabelColor);
    }

    .value {
      font-weight: 500;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }

    ui5-button {
      width: 100%;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private connectionService = inject(ConnectionService);
  private mcpClient = inject(McpClientService);

  connectionState: ConnectionState = 'disconnected';
  connectionInfo: ConnectionInfo | null = null;
  tools: McpTool[] = [];

  ngOnInit() {
    this.connectionService.state$.subscribe((state: ConnectionState) => {
      this.connectionState = state;
      if (state === 'connected') {
        this.refreshTools();
      }
    });

    this.connectionService.connectionInfo$.subscribe((info: ConnectionInfo | null) => {
      this.connectionInfo = info;
    });

    this.mcpClient.tools$.subscribe((tools: McpTool[]) => {
      this.tools = tools;
    });
  }

  async refreshTools() {
    await this.mcpClient.listTools();
  }

  navigateToSettings() {
    // Navigation will be handled by the app component
    window.location.hash = '#/settings';
  }

  navigateToSchema() {
    window.location.hash = '#/schema';
  }

  navigateToCypher() {
    window.location.hash = '#/cypher';
  }

  navigateToGds() {
    window.location.hash = '#/gds';
  }
}