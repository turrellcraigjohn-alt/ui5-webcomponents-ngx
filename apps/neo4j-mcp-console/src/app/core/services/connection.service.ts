import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  ConnectionState, 
  ConnectionConfig, 
  ConnectionInfo,
  McpServerConfig,
  DEFAULT_CONNECTION_CONFIG,
  DEFAULT_MCP_SERVER_CONFIG
} from '../models/connection.model';

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  private stateSubject = new BehaviorSubject<ConnectionState>('disconnected');
  private errorSubject = new BehaviorSubject<string>('');
  private configSubject = new BehaviorSubject<ConnectionConfig>(DEFAULT_CONNECTION_CONFIG);
  private mcpConfigSubject = new BehaviorSubject<McpServerConfig>(DEFAULT_MCP_SERVER_CONFIG);
  private connectionInfoSubject = new BehaviorSubject<ConnectionInfo | null>(null);

  readonly state$ = this.stateSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly config$ = this.configSubject.asObservable();
  readonly mcpConfig$ = this.mcpConfigSubject.asObservable();
  readonly connectionInfo$ = this.connectionInfoSubject.asObservable();

  constructor() {
    this.loadSavedConfig();
  }

  get state(): ConnectionState {
    return this.stateSubject.value;
  }

  get config(): ConnectionConfig {
    return this.configSubject.value;
  }

  get mcpConfig(): McpServerConfig {
    return this.mcpConfigSubject.value;
  }

  updateConfig(config: Partial<ConnectionConfig>): void {
    const newConfig = { ...this.configSubject.value, ...config };
    this.configSubject.next(newConfig);
    this.saveConfig();
  }

  updateMcpConfig(config: Partial<McpServerConfig>): void {
    const newConfig = { ...this.mcpConfigSubject.value, ...config };
    this.mcpConfigSubject.next(newConfig);
    this.saveConfig();
  }

  async connect(): Promise<boolean> {
    if (this.stateSubject.value === 'connecting') {
      return false;
    }

    this.stateSubject.next('connecting');
    this.errorSubject.next('');

    try {
      // Get MCP server URL
      const mcpConfig = this.mcpConfigSubject.value;
      const protocol = mcpConfig.tlsEnabled ? 'https' : 'http';
      const baseUrl = `${protocol}://${mcpConfig.host}:${mcpConfig.port}`;

      // Test connection via MCP initialize
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.buildAuthHeader()
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'neo4j-mcp-console',
              version: '1.0.0'
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      // Connection successful
      this.connectionInfoSubject.next({
        neo4jVersion: result.result?.serverInfo?.version || 'unknown',
        edition: 'unknown',
        database: this.configSubject.value.database,
        connected: true
      });

      this.stateSubject.next('connected');
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.errorSubject.next(errorMessage);
      this.stateSubject.next('error');
      return false;
    }
  }

  disconnect(): void {
    this.stateSubject.next('disconnected');
    this.connectionInfoSubject.next(null);
  }

  /**
   * Check health on startup - attempts lightweight connection check
   */
  checkHealth(): void {
    // Use the existing connect method for health check
    this.connect().catch(() => {
      // Error already handled in connect()
    });
  }

  private buildAuthHeader(): string {
    const config = this.configSubject.value;
    if (!config.username || !config.password) {
      return '';
    }
    const credentials = btoa(`${config.username}:${config.password}`);
    return `Basic ${credentials}`;
  }

  private loadSavedConfig(): void {
    try {
      const savedConfig = localStorage.getItem('neo4j-connection-config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.neo4j) {
          this.configSubject.next({ ...DEFAULT_CONNECTION_CONFIG, ...config.neo4j });
        }
        if (config.mcp) {
          this.mcpConfigSubject.next({ ...DEFAULT_MCP_SERVER_CONFIG, ...config.mcp });
        }
      }
    } catch (e) {
      console.warn('Failed to load saved configuration:', e);
    }
  }

  private saveConfig(): void {
    try {
      const config = {
        neo4j: this.configSubject.value,
        mcp: this.mcpConfigSubject.value
      };
      // Don't save password
      const safeConfig = {
        ...config,
        neo4j: { ...config.neo4j, password: '' }
      };
      localStorage.setItem('neo4j-connection-config', JSON.stringify(safeConfig));
    } catch (e) {
      console.warn('Failed to save configuration:', e);
    }
  }
}