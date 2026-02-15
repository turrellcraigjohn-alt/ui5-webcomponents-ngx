import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ConnectionService } from './connection.service';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpToolCallResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export interface SchemaNode {
  label: string;
  properties: Array<{ name: string; type: string }>;
  nodeCount: number;
}

export interface SchemaRelationship {
  type: string;
  startLabels: string[];
  endLabels: string[];
  properties: Array<{ name: string; type: string }>;
}

export interface DatabaseSchema {
  nodes: SchemaNode[];
  relationships: SchemaRelationship[];
}

@Injectable({
  providedIn: 'root'
})
export class McpClientService {
  private connectionService = inject(ConnectionService);
  private toolsSubject = new BehaviorSubject<McpTool[]>([]);
  private schemaSubject = new BehaviorSubject<DatabaseSchema | null>(null);
  private requestIdCounter = 0;

  readonly tools$ = this.toolsSubject.asObservable();
  readonly schema$ = this.schemaSubject.asObservable();

  private getBaseUrl(): string {
    const config = this.connectionService.mcpConfig;
    const protocol = config.tlsEnabled ? 'https' : 'http';
    return `${protocol}://${config.host}:${config.port}`;
  }

  private async sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${this.getBaseUrl()}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.buildAuthHeader()
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++this.requestIdCounter,
        method,
        params
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.result;
  }

  private buildAuthHeader(): string {
    const config = this.connectionService.config;
    if (!config.username || !config.password) {
      return '';
    }
    const credentials = btoa(`${config.username}:${config.password}`);
    return `Basic ${credentials}`;
  }

  async listTools(): Promise<McpTool[]> {
    try {
      const result = await this.sendRequest('tools/list') as { tools: McpTool[] };
      this.toolsSubject.next(result.tools);
      return result.tools;
    } catch (error) {
      console.error('Failed to list tools:', error);
      return [];
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<McpToolCallResult> {
    const result = await this.sendRequest('tools/call', {
      name,
      arguments: args
    }) as McpToolCallResult;
    return result;
  }

  async getSchema(): Promise<DatabaseSchema | null> {
    try {
      const result = await this.callTool('get-schema', {});
      
      if (result.isError || !result.content?.[0]?.text) {
        throw new Error('Failed to get schema');
      }

      // Parse schema from result
      const schemaText = result.content[0].text;
      const schema = this.parseSchema(schemaText);
      this.schemaSubject.next(schema);
      return schema;
    } catch (error) {
      console.error('Failed to get schema:', error);
      return null;
    }
  }

  async executeCypher(query: string, params?: Record<string, unknown>): Promise<McpToolCallResult> {
    // Determine if query is read-only
    const isReadOnly = this.isReadOnlyQuery(query);
    const toolName = isReadOnly ? 'read-cypher' : 'write-cypher';

    return this.callTool(toolName, {
      query,
      params: params || {}
    });
  }

  async listGdsProcedures(): Promise<McpToolCallResult> {
    return this.callTool('list-gds-procedures', {});
  }

  private isReadOnlyQuery(query: string): boolean {
    const upperQuery = query.toUpperCase().trim();
    
    // Check for write operations
    const writeKeywords = ['CREATE', 'MERGE', 'DELETE', 'DETACH', 'SET', 'REMOVE'];
    for (const keyword of writeKeywords) {
      if (upperQuery.includes(keyword)) {
        return false;
      }
    }
    
    return true;
  }

  private parseSchema(text: string): DatabaseSchema {
    // Parse the schema response text into structured format
    // This is a simplified parser - in production would be more robust
    try {
      const parsed = JSON.parse(text);
      return {
        nodes: parsed.nodes || [],
        relationships: parsed.relationships || []
      };
    } catch {
      // If not JSON, return empty schema
      return {
        nodes: [],
        relationships: []
      };
    }
  }
}