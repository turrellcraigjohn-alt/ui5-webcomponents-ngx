# Neo4j MCP Console

SAP UI5 Angular application for managing Neo4j Graph Databases via the Model Context Protocol (MCP).

## 🎯 Overview

The Neo4j MCP Console is a web-based management interface that connects to the Neo4j MCP Server (Zig backend) to provide:

- **Dashboard**: Connection status and quick actions
- **Schema Explorer**: Visual database schema exploration
- **Cypher Editor**: Execute and manage Cypher queries
- **GDS Explorer**: Graph Data Science algorithm exploration
- **Settings**: Connection and server configuration

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Neo4j MCP Console                         │
│                   (Angular + UI5 WebComponents)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Dashboard  │  │   Schema    │  │   Cypher Editor     │  │
│  │  Component  │  │  Explorer   │  │   Component         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    GDS      │  │  Settings   │  │   MCP Client        │  │
│  │  Explorer   │  │  Component  │  │   Service           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP JSON-RPC
┌─────────────────────────────────────────────────────────────┐
│                   Neo4j MCP Server (Zig)                     │
│               src/ainuc-fe/neo4jmcp-fe-dev-gen-foundry       │
└─────────────────────────────────────────────────────────────┘
                            │ Bolt Protocol
┌─────────────────────────────────────────────────────────────┐
│                    Neo4j Database                            │
│                   (with APOC + GDS)                          │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
neo4j-mcp-console/
├── src/
│   └── app/
│       ├── app.component.ts        # Main app shell
│       ├── app.routes.ts           # Route configuration
│       ├── core/
│       │   ├── models/
│       │   │   └── connection.model.ts
│       │   └── services/
│       │       ├── connection.service.ts
│       │       └── mcp-client.service.ts
│       └── features/
│           ├── dashboard/
│           │   └── dashboard.component.ts
│           ├── schema-explorer/
│           │   └── schema-explorer.component.ts
│           ├── cypher-editor/
│           │   └── cypher-editor.component.ts
│           ├── gds-explorer/
│           │   └── gds-explorer.component.ts
│           └── settings/
│               └── settings.component.ts
├── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Neo4j MCP Server running (HTTP mode)

### Installation

```bash
# Navigate to the app directory
cd aiNucleusSdk/ainuc-sap-sdk/sap-ui5-webcomponents-ngx/apps/neo4j-mcp-console

# Install dependencies
npm install

# Start development server
npm start
```

The application will be available at `http://localhost:4200`.

### Configuration

1. Start the Neo4j MCP Server in HTTP mode:
   ```bash
   cd src/ainuc-fe/neo4jmcp-fe-dev-gen-foundry
   make run-http
   ```

2. Open the console in your browser
3. Go to Settings and configure:
   - **Neo4j URI**: `neo4j://localhost:7687`
   - **Username**: Your Neo4j username
   - **Password**: Your Neo4j password
   - **MCP Server Host**: `localhost`
   - **MCP Server Port**: `8080`

4. Click "Test Connection" to verify

## 🎨 Features

### Dashboard
- Connection status overview
- Available MCP tools listing
- Quick action buttons
- Getting started guide for new users

### Schema Explorer
- View all node labels and properties
- View all relationship types
- Property type information
- Node/relationship counts
- Visual schema diagram

### Cypher Editor
- Syntax-highlighted query input
- Query execution with results
- Query history tracking
- Template queries for common operations
- Copy/paste functionality

### GDS Explorer
- Check GDS library availability
- Browse algorithm categories:
  - Centrality (PageRank, Degree)
  - Community (Louvain)
  - Similarity (Node Similarity, KNN)
  - Path Finding (Dijkstra, A*)
  - Link Prediction
  - Node Embedding (Node2Vec, GraphSAGE)
- Pre-built GDS query templates

### Settings
- Neo4j connection configuration
- MCP server configuration
- Connection testing
- Reset to defaults

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Angular 18 |
| UI Library | SAP UI5 Web Components |
| State Management | RxJS BehaviorSubject |
| HTTP Client | Fetch API |
| Styling | CSS Variables (SAP Theming) |

## 📝 API Integration

The console communicates with the Neo4j MCP Server via JSON-RPC over HTTP:

### Initialize Connection
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "neo4j-mcp-console",
      "version": "1.0.0"
    }
  }
}
```

### List Tools
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

### Call Tool
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "read-cypher",
    "arguments": {
      "query": "MATCH (n) RETURN n LIMIT 10"
    }
  }
}
```

## 🔒 Security

- Credentials are sent via Basic Auth header
- Passwords are not persisted to localStorage
- TLS can be enabled for production deployments

## 🤝 Integration with NucleusAI

This console is part of the NucleusAI platform and integrates with:

| Service | Purpose |
|---------|---------|
| `neo4jmcp-fe-dev-gen-foundry` | Zig MCP Server backend |
| `aihana-be-po-universal-prompt` | AI agent integration |
| `mcppal-be-po-mesh-gateway` | MCP service mesh |

## 📄 License

Apache License 2.0

## 🙏 Acknowledgments

- [SAP UI5 Web Components](https://sap.github.io/ui5-webcomponents/)
- [Angular](https://angular.io/)
- [Neo4j](https://neo4j.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)