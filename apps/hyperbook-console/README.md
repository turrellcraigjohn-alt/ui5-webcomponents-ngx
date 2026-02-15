# Hyperbook Console

Angular-based frontend for the Hyperbook documentation viewer using SAP UI5 Web Components.

**Text-only mode**: This application intentionally excludes video, audio, and image content per requirements.

## Stack

- **Frontend**: Angular 19 with SAP UI5 Web Components
- **Backend**: Zig HTTP server
- **Processing**: Mojo for high-performance text processing
- **Schema**: Mangle for type definitions and validation

## Features

- 📚 **Book Browser** - View and select available hyperbook projects
- 📖 **Document Reader** - Navigate and read markdown documentation
- 🔍 **Full-Text Search** - Search across all documentation
- 📝 **Glossary** - Browse defined terms and definitions
- 🧭 **Navigation** - Hierarchical page/section navigation
- ⚙️ **Settings** - Configure server connection and display options

## Project Structure

```
hyperbook-console/
├── src/app/
│   ├── core/
│   │   ├── models/        # TypeScript interfaces
│   │   └── services/      # API services
│   └── features/
│       ├── dashboard/     # Overview dashboard
│       ├── books/         # Book listing
│       ├── reader/        # Document reader
│       ├── glossary/      # Glossary browser
│       ├── search/        # Search interface
│       └── settings/      # Configuration
└── package.json
```

## Backend Integration

The frontend connects to a Zig-based backend server:

**Zig Backend** (`src/ainuc-fe/hyperbook-fe-dev-html/zig/`)
- `main.zig` - Application entry point
- `http_server.zig` - HTTP server with REST API
- `config.zig` - Configuration management
- `fs_reader.zig` - File system operations
- `navigation.zig` - Navigation tree builder

**Mangle Schemas** (`src/ainuc-fe/hyperbook-fe-dev-html/mangle/`)
- `hyperbook_types.mg` - Core type definitions
- `hyperbook_config.mg` - Configuration schema
- `markdown_directives.mg` - Markdown directive types
- `api_routes.mg` - API route definitions

**Mojo Modules** (`src/ainuc-fe/hyperbook-fe-dev-html/mojo/`)
- Text search engine
- Markdown processor
- Glossary manager

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/info` | Server information |
| GET | `/api/v1/books` | List all books |
| GET | `/api/v1/books/:id/navigation` | Get book navigation |
| GET | `/api/v1/books/:id/pages/:path` | Get page content |
| GET | `/api/v1/books/:id/glossary` | Get glossary terms |
| POST | `/api/v1/books/:id/search` | Search book content |
| POST | `/api/v1/render/markdown` | Render markdown to HTML |

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Running the Full Stack

```bash
# From src/ainuc-fe/hyperbook-fe-dev-html/

# Build and run Zig backend
make run

# Or run in development mode
make dev
```

## Configuration

Configure the API endpoint in the Settings page or set environment variables:

```typescript
// Default API URL
apiBaseUrl: 'http://localhost:3000/api/v1'
```

## License

Apache 2.0