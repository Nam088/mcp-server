# @nam088/mcp-swagger-parser

Enhanced OpenAPI/Swagger MCP plugin with 12 powerful tools, YAML support, and automatic schema resolution.

## Features

✨ **12 Comprehensive Tools**
- 7 Discovery Tools (search, details, tags, curl generator)
- 1 Safe Read Tool (GET requests only)
- 4 Write Tools (POST/PUT/PATCH/DELETE with FULL mode restriction)

🔍 **Auto Schema Resolution**
- Automatically resolves `$ref` references
- Returns complete schemas in one call
- No manual dereferencing needed

📄 **YAML & JSON Support**
- Auto-detects `.yaml`/`.yml` files
- Works with OpenAPI 2.0, 3.0, 3.1

🔐 **Authentication**
- Bearer token support
- Custom headers
- Per-request configuration

## Installation

```bash
npm install @nam088/mcp-swagger-parser
```

## Quick Start

### Configure MCP Server

Add to your MCP configuration file:

```json
{
  "mcpServers": {
    "swagger": {
      "command": "npx",
      "args": ["-y", "@nam088/mcp-swagger-parser"],
      "env": {
        "SWAGGER_URL": "http://localhost:3000/docs-json"
      }
    }
  }
}
```

### With Authentication

```json
{
  "env": {
    "SWAGGER_URL": "https://api.example.com/openapi.yaml",
    "SWAGGER_AUTH_TOKEN": "your-bearer-token",
    "SWAGGER_BASE_URL": "https://api.example.com"
  }
}
```

## Available Tools

### Discovery Tools (Always Safe)

#### 1. `swagger_search_tools`
Search for API endpoints by keyword.
```typescript
{ query: "user" }
```

#### 2. `swagger_get_endpoint_details`
Get complete endpoint specification with resolved schemas.
```typescript
{ method: "POST", path: "/api/users" }
```

#### 3. `swagger_list_tags`
List all API categories/tags.

#### 4. `swagger_list_endpoints_by_tag`
Filter endpoints by tag.
```typescript
{ tag: "Auth" }
```

#### 5. `swagger_generate_curl`
Generate ready-to-use curl command.
```typescript
{ 
  method: "POST", 
  path: "/api/login",
  body: { email: "test@example.com" }
}
```

#### 6. `swagger_generate_example_request`
Generate example request with placeholder values.
```typescript
{ method: "GET", path: "/api/users/{id}" }
```

#### 7. `swagger_reload`
Reload OpenAPI specification from source.

### Read-Only Tool (READONLY Mode)

#### 8. `swagger_execute_get`
Execute GET requests safely (no side effects).
```typescript
{ 
  path: "/api/users",
  params: { limit: "10" }
}
```

### Write Tools (FULL Mode Only)

#### 9-12. `swagger_execute_post/put/patch/delete`
Execute write operations (requires FULL mode).
```typescript
{
  path: "/api/users",
  body: { name: "John" }
}
```

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `SWAGGER_URL` | OpenAPI spec URL (.json/.yaml) | Required |
| `SWAGGER_JSON` | Direct JSON spec object | Optional |
| `SWAGGER_BASE_URL` | Override base API URL | Auto-detected |
| `SWAGGER_AUTH_TOKEN` | Bearer token | Optional |
| `SWAGGER_DEFAULT_HEADERS` | JSON object of headers | Optional |

## Examples

### Basic Usage
```json
{
  "SWAGGER_URL": "http://localhost:3000/docs-json"
}
```

### With YAML
```json
{
  "SWAGGER_URL": "https://api.example.com/openapi.yaml"
}
```

### With Authentication
```json
{
  "SWAGGER_URL": "https://api.example.com/api-docs",
  "SWAGGER_AUTH_TOKEN": "eyJhbGc...",
  "SWAGGER_BASE_URL": "https://api.example.com"
}
```

## Programmatic Usage

```typescript
import { SwaggerParserPlugin } from '@nam088/mcp-swagger-parser';

const plugin = new SwaggerParserPlugin({
  url: 'http://localhost:3000/docs-json',
  authToken: 'your-token',
  baseUrl: 'http://localhost:3000'
});

await plugin.initialize(context);
plugin.register(context);
```

## Features

### Automatic Schema Resolution
All `$ref` references are automatically resolved:

```typescript
// Before: { "$ref": "#/components/schemas/User" }
// After: { 
//   "type": "object",
//   "properties": {
//     "id": { "type": "string" },
//     "name": { "type": "string" }
//   }
// }
```

### Mode-Based Security
- **Discovery tools**: Always safe, no restrictions
- **GET execution**: Safe, available in READONLY mode
- **Write operations**: Require FULL mode, marked with `isWriteTool: true`

## Development

```bash
# Build
npm run build

# Clean
npm run clean

# Test
npm test
```

## License

MIT

## Author

Nam088

## Repository

https://github.com/nam088/mcp-server
