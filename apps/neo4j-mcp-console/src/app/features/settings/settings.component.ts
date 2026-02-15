import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConnectionService } from '../../core/services/connection.service';
import { ConnectionConfig, McpServerConfig } from '../../core/models/connection.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <ui5-page background-design="Solid">
      <ui5-bar slot="header">
        <ui5-title slot="startContent" level="H3">Settings</ui5-title>
        <ui5-button 
          slot="endContent" 
          design="Emphasized" 
          (click)="testConnection()"
          [disabled]="testing">
          {{ testing ? 'Testing...' : 'Test Connection' }}
        </ui5-button>
      </ui5-bar>

      <div class="settings-container">
        <!-- Neo4j Connection Settings -->
        <ui5-panel header-text="Neo4j Connection">
          <div class="form-group">
            <ui5-label for="uri" required>Neo4j URI</ui5-label>
            <ui5-input 
              id="uri"
              [(ngModel)]="neo4jConfig.uri"
              placeholder="neo4j://localhost:7687"
              (change)="saveNeo4jConfig()">
            </ui5-input>
          </div>

          <div class="form-group">
            <ui5-label for="username" required>Username</ui5-label>
            <ui5-input 
              id="username"
              [(ngModel)]="neo4jConfig.username"
              placeholder="neo4j"
              (change)="saveNeo4jConfig()">
            </ui5-input>
          </div>

          <div class="form-group">
            <ui5-label for="password" required>Password</ui5-label>
            <ui5-input 
              id="password"
              type="Password"
              [(ngModel)]="neo4jConfig.password"
              placeholder="Enter password"
              (change)="saveNeo4jConfig()">
            </ui5-input>
          </div>

          <div class="form-group">
            <ui5-label for="database">Database</ui5-label>
            <ui5-input 
              id="database"
              [(ngModel)]="neo4jConfig.database"
              placeholder="neo4j"
              (change)="saveNeo4jConfig()">
            </ui5-input>
          </div>
        </ui5-panel>

        <!-- MCP Server Settings -->
        <ui5-panel header-text="MCP Server">
          <div class="form-group">
            <ui5-label for="mcpHost">Host</ui5-label>
            <ui5-input 
              id="mcpHost"
              [(ngModel)]="mcpConfig.host"
              placeholder="localhost"
              (change)="saveMcpConfig()">
            </ui5-input>
          </div>

          <div class="form-group">
            <ui5-label for="mcpPort">Port</ui5-label>
            <ui5-input 
              id="mcpPort"
              type="Number"
              [(ngModel)]="mcpConfig.port"
              placeholder="8080"
              (change)="saveMcpConfig()">
            </ui5-input>
          </div>

          <div class="form-group">
            <ui5-label for="mcpTransport">Transport</ui5-label>
            <ui5-select 
              id="mcpTransport"
              [(value)]="mcpConfig.transport"
              (change)="saveMcpConfig()">
              <ui5-option value="http">HTTP</ui5-option>
              <ui5-option value="stdio">STDIO</ui5-option>
            </ui5-select>
          </div>

          <div class="form-group">
            <ui5-checkbox
              [(checked)]="mcpConfig.tlsEnabled"
              text="Enable TLS"
              (change)="saveMcpConfig()">
            </ui5-checkbox>
          </div>
        </ui5-panel>

        <!-- Connection Status -->
        <ui5-panel header-text="Connection Status">
          <ui5-message-strip 
            *ngIf="connectionStatus === 'connected'"
            design="Positive"
            hide-close-button>
            Connected to Neo4j successfully
          </ui5-message-strip>

          <ui5-message-strip 
            *ngIf="connectionStatus === 'disconnected'"
            design="Information"
            hide-close-button>
            Not connected. Configure settings and click "Test Connection".
          </ui5-message-strip>

          <ui5-message-strip 
            *ngIf="connectionStatus === 'error'"
            design="Negative"
            hide-close-button>
            {{ connectionError }}
          </ui5-message-strip>

          <div *ngIf="connectionInfo" class="connection-info">
            <ui5-list>
              <ui5-li icon="database">
                Database: {{ connectionInfo.database }}
              </ui5-li>
              <ui5-li icon="it-instance">
                Neo4j Version: {{ connectionInfo.neo4jVersion }}
              </ui5-li>
              <ui5-li icon="badge">
                Edition: {{ connectionInfo.edition }}
              </ui5-li>
            </ui5-list>
          </div>
        </ui5-panel>

        <!-- Actions -->
        <div class="actions">
          <ui5-button 
            design="Positive" 
            (click)="connect()"
            [disabled]="connecting">
            {{ connecting ? 'Connecting...' : 'Connect' }}
          </ui5-button>
          <ui5-button 
            design="Negative" 
            (click)="disconnect()"
            [disabled]="connectionStatus !== 'connected'">
            Disconnect
          </ui5-button>
          <ui5-button 
            design="Transparent" 
            (click)="resetToDefaults()">
            Reset to Defaults
          </ui5-button>
        </div>
      </div>
    </ui5-page>
  `,
  styles: [`
    .settings-container {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 800px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 1rem;
    }

    ui5-input, ui5-select {
      width: 100%;
    }

    .connection-info {
      margin-top: 1rem;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }
  `]
})
export class SettingsComponent implements OnInit {
  private connectionService = inject(ConnectionService);

  neo4jConfig: ConnectionConfig = {
    uri: '',
    username: '',
    password: '',
    database: 'neo4j'
  };

  mcpConfig: McpServerConfig = {
    host: 'localhost',
    port: 8080,
    transport: 'http',
    tlsEnabled: false
  };

  connectionStatus: string = 'disconnected';
  connectionError: string = '';
  connectionInfo: { database: string; neo4jVersion: string; edition: string } | null = null;
  testing = false;
  connecting = false;

  ngOnInit() {
    this.connectionService.config$.subscribe(config => {
      this.neo4jConfig = { ...config };
    });

    this.connectionService.mcpConfig$.subscribe(config => {
      this.mcpConfig = { ...config };
    });

    this.connectionService.state$.subscribe(state => {
      this.connectionStatus = state;
    });

    this.connectionService.error$.subscribe(error => {
      this.connectionError = error;
    });

    this.connectionService.connectionInfo$.subscribe(info => {
      this.connectionInfo = info;
    });
  }

  saveNeo4jConfig() {
    this.connectionService.updateConfig(this.neo4jConfig);
  }

  saveMcpConfig() {
    this.connectionService.updateMcpConfig(this.mcpConfig);
  }

  async testConnection() {
    this.testing = true;
    try {
      await this.connectionService.connect();
    } finally {
      this.testing = false;
    }
  }

  async connect() {
    this.connecting = true;
    try {
      await this.connectionService.connect();
    } finally {
      this.connecting = false;
    }
  }

  disconnect() {
    this.connectionService.disconnect();
  }

  resetToDefaults() {
    this.neo4jConfig = {
      uri: 'neo4j://localhost:7687',
      username: 'neo4j',
      password: '',
      database: 'neo4j'
    };

    this.mcpConfig = {
      host: 'localhost',
      port: 8080,
      transport: 'http',
      tlsEnabled: false
    };

    this.saveNeo4jConfig();
    this.saveMcpConfig();
  }
}