# SAP Pipeline Console

Angular application for managing SAP AI Core Pipeline operations using SAP UI5 Web Components.

## Overview

This console provides a graphical interface for interacting with the SAP Cloud SDK Pipeline backend service (`sap-cloudsdk-fe-dev-pipeline`), which runs on port 8088 and exposes OpenAI-compliant endpoints.

## Features

| Feature | Description | Backend Intent |
|---------|-------------|----------------|
| **Dashboard** | Service health status, available models overview | `/health`, `/v1/models` |
| **Deployments** | Create, manage, and monitor AI model deployments | `sap_deployment` |
| **Executions** | Run AI pipelines and monitor execution status | `sap_execution` |
| **Scenarios** | Browse and explore available AI scenarios | `sap_scenario` |
| **Grounding** | Document retrieval and vector search operations | `sap_grounding` |
| **Settings** | Configure API endpoint and credentials | - |

## Project Structure

```
sap-pipeline-console/
├── package.json
├── README.md
└── src/
    └── app/
        ├── app.component.ts          # Main shell with navigation
        ├── app.routes.ts             # Angular routing configuration
        ├── core/
        │   ├── models/
        │   │   └── pipeline.model.ts # TypeScript interfaces
        │   └── services/
        │       ├── pipeline.service.ts    # API client
        │       └── connection.service.ts  # Connection state
        └── features/
            ├── dashboard/            # Overview & health
            ├── deployments/          # Deployment management
            ├── executions/           # Execution runner
            ├── scenarios/            # Scenario browser
            ├── grounding/            # Document search
            └── settings/             # Configuration
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- SAP Pipeline backend running on port 8088

### Installation

```bash
cd aiNucleusSdk/ainuc-sap-sdk/sap-ui5-webcomponents-ngx
yarn install
```

### Development

```bash
# Start the development server
cd apps/sap-pipeline-console
npm start

# Or from the monorepo root
nx serve sap-pipeline-console
```

The application will be available at `http://localhost:4200`.

### Build

```bash
# Development build
npm run build

# Production build
npm run build:prod
```

## API Communication

The console communicates with the backend via OpenAI-compliant chat completions:

```typescript
// Example: List scenarios
POST /v1/chat/completions
{
  "model": "sap-orchestrator-v1",
  "messages": [
    {"role": "user", "content": "list scenarios"}
  ]
}
```

### Intent Mapping

| User Action | API Message | Backend Intent |
|-------------|-------------|----------------|
| View deployments | "deployment status" | `sap_deployment` |
| Create deployment | "create deployment {config}" | `sap_deployment` |
| Run execution | "execute scenario {name}" | `sap_execution` |
| List scenarios | "list scenarios" | `sap_scenario` |
| Search documents | "vector search {query}" | `sap_grounding` |

## UI Components

Built with SAP UI5 Web Components for Angular:

- `ui5-shellbar` - Application header with branding
- `ui5-side-navigation` - Left navigation menu
- `ui5-card` - Dashboard cards and info panels
- `ui5-table` - Data tables for listings
- `ui5-wizard` - Step-by-step workflows
- `ui5-tree` - Hierarchical scenario view
- `ui5-dialog` - Modal dialogs for forms
- `ui5-message-strip` - Status notifications
- `ui5-busy-indicator` - Loading states

## Configuration

Default backend endpoint: `http://localhost:8088`

Configure via Settings page or environment variables:

```bash
export SAP_PIPELINE_URL="http://localhost:8088"
```

## Backend Service

This console connects to the `sap-cloudsdk-fe-dev-pipeline` service:

- **Location**: `src/ainuc-fe/sap-cloudsdk-fe-dev-pipeline/`
- **Technology**: Zig/Mojo/Mangle
- **Port**: 8088
- **API**: OpenAI-compliant `/v1/chat/completions`

### Starting the Backend

```bash
cd src/ainuc-fe/sap-cloudsdk-fe-dev-pipeline
make run
```

## Related Documentation

- [SAP UI5 Web Components for Angular](https://sap.github.io/ui5-webcomponents-ngx/)
- [SAP AI Core Documentation](https://help.sap.com/docs/sap-ai-core)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

## License

Apache License 2.0 - see [LICENSE](../../LICENSE) for details.