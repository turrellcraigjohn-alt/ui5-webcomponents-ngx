/**
 * Neo4j Connection Models
 */

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionConfig {
  uri: string;
  username: string;
  password: string;
  database: string;
}

export interface ConnectionInfo {
  neo4jVersion: string;
  edition: string;
  database: string;
  connected: boolean;
}

export interface McpServerConfig {
  host: string;
  port: number;
  transport: 'stdio' | 'http';
  tlsEnabled: boolean;
}

export const DEFAULT_CONNECTION_CONFIG: ConnectionConfig = {
  uri: 'neo4j://localhost:7687',
  username: 'neo4j',
  password: '',
  database: 'neo4j'
};

export const DEFAULT_MCP_SERVER_CONFIG: McpServerConfig = {
  host: 'localhost',
  port: 8080,
  transport: 'http',
  tlsEnabled: false
};