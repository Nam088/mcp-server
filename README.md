# @nam088/mcp-server

A professional MCP (Model Context Protocol) server implementation with a plugin-based architecture.

## Features

- **Plugin-Based Architecture**: Modular design with independent plugins
- **Workspace Structure**: Each plugin is a separate npm package with its own dependencies
- **Dynamic Loading**: Load plugins from configuration or environment variables
- **Type-Safe**: Full TypeScript support
- **Extensible**: Easy to create custom plugins

## Architecture

This project uses a monorepo workspace structure where:
- **Core System** (`@nam088/mcp-core`): Plugin interfaces and registry
- **Plugins** (e.g., `@nam088/mcp-redis`): Independent packages with their own dependencies
- **Main Server**: Loads and orchestrates plugins

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Installation

```bash
npm install
```

## Building

```bash
# Build all packages
npm run build

# Clean build artifacts
npm run clean
```

## Usage

Install the packages you need in your project:

```bash
npm install @nam088/mcp-core @nam088/mcp-mysql @nam088/mcp-mongodb
```

Create your MCP server:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PluginRegistry } from '@nam088/mcp-core';
import { MysqlPlugin } from '@nam088/mcp-mysql';
import { MongoDBPlugin } from '@nam088/mcp-mongodb';

const server = new Server(
  { name: 'my-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

const registry = new PluginRegistry(server);

// Register plugins
await registry.registerPlugin(MysqlPlugin, {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  mode: 'READONLY',
});

await registry.registerPlugin(MongoDBPlugin, {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  database: process.env.MONGODB_DATABASE || 'test',
  mode: 'READONLY',
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Available Plugins

### MySQL Plugin (`@nam088/mcp-mysql`)

Comprehensive MySQL/MariaDB plugin with 20+ tools.

**Tools:**
- `mysql_query` - Execute SELECT queries with parameters
- `mysql_execute` - Execute INSERT/UPDATE/DELETE/DDL (WRITEONLY or FULL mode)
- `mysql_list_databases` - List all databases
- `mysql_list_tables` - List tables in database
- `mysql_describe_table` - Get table structure
- `mysql_list_indexes` - List table indexes
- `mysql_list_constraints` - List table constraints
- `mysql_explain_query` - Query execution plan
- `mysql_processlist` - View running queries
- `mysql_kill_query` - Kill running query (WRITEONLY or FULL mode)
- `mysql_optimize_table` - Optimize tables (WRITEONLY or FULL mode)
- `mysql_analyze_table` - Analyze tables (WRITEONLY or FULL mode)
- `mysql_list_views` - List views
- `mysql_list_procedures` - List stored procedures
- `mysql_list_functions` - List stored functions
- `mysql_list_triggers` - List triggers
- And more...

**Dependencies:** `mysql2`  
**Modes:** READONLY, WRITEONLY, FULL  
**See:** [packages/mysql/README.md](./packages/mysql/README.md)

### SQL Server Plugin (`@nam088/mcp-sql-server`)

Microsoft SQL Server plugin with comprehensive tools.

**Tools:**
- `sqlserver_query` - Execute SELECT queries
- `sqlserver_execute` - Execute INSERT/UPDATE/DELETE/DDL (FULL mode)
- `sqlserver_list_databases` - List all databases
- `sqlserver_list_tables` - List tables in schema
- `sqlserver_describe_table` - Get table structure
- `sqlserver_list_schemas` - List all schemas
- `sqlserver_list_indexes` - List table indexes
- `sqlserver_list_constraints` - List table constraints
- `sqlserver_explain_query` - Query execution plan
- `sqlserver_active_sessions` - View active sessions
- `sqlserver_kill_session` - Kill session (FULL mode)
- `sqlserver_rebuild_index` - Rebuild indexes (FULL mode)
- `sqlserver_update_statistics` - Update statistics (FULL mode)
- And more...

**Dependencies:** `mssql`  
**Modes:** READONLY, FULL  
**See:** [packages/sql-server/README.md](./packages/sql-server/README.md)

### MongoDB Plugin (`@nam088/mcp-mongodb`)

MongoDB plugin with CRUD and aggregation support.

**Tools:**
- `mongodb_find` - Find documents with filtering, sorting, projection
- `mongodb_count` - Count documents
- `mongodb_aggregate` - Run aggregation pipeline
- `mongodb_insert_one` - Insert single document (FULL mode)
- `mongodb_insert_many` - Insert multiple documents (FULL mode)
- `mongodb_update_one` - Update single document (FULL mode)
- `mongodb_update_many` - Update multiple documents (FULL mode)
- `mongodb_delete_one` - Delete single document (FULL mode)
- `mongodb_delete_many` - Delete multiple documents (FULL mode)
- `mongodb_list_databases` - List all databases
- `mongodb_list_collections` - List collections in database
- `mongodb_collection_stats` - Get collection statistics
- `mongodb_list_indexes` - List collection indexes
- `mongodb_create_index` - Create index (FULL mode)
- `mongodb_drop_index` - Drop index (FULL mode)
- And more...

**Dependencies:** `mongodb`  
**Modes:** READONLY, FULL  
**See:** [packages/mongodb/README.md](./packages/mongodb/README.md)

### Redis Plugin (`@nam088/mcp-redis`)

Redis plugin with support for all data types.

**Tools:**
- `redis_get` - Get value by key
- `redis_set` - Set value with optional TTL
- `redis_del` - Delete key
- `redis_keys` - Find keys by pattern
- `redis_info` - Get server information
- And more... (hash, list, set, sorted set operations)

**Dependencies:** `redis`  
**See:** [packages/redis/README.md](./packages/redis/README.md)

### PostgreSQL Plugin (`@nam088/mcp-postgres`)

PostgreSQL plugin with comprehensive SQL support.

**Tools:**
- `postgres_query` - Execute SELECT queries
- `postgres_execute` - Execute INSERT/UPDATE/DELETE/DDL (FULL mode)
- `postgres_list_tables` - List all tables in schema
- `postgres_describe_table` - Get table structure
- `postgres_list_schemas` - List all schemas
- `postgres_list_indexes` - List table indexes
- `postgres_database_info` - Get database information

**Dependencies:** `pg`  
**See:** [packages/postgres/README.md](./packages/postgres/README.md)

## Creating Custom Plugins

### 1. Create Plugin Package

```bash
mkdir -p packages/mydb/src
cd packages/mydb
npm init -y
```

### 2. Setup package.json

```json
{
  "name": "@nam088/mcp-mydb",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "peerDependencies": {
    "@modelcontextprotocol/sdk": "^1.21.1",
    "@nam088/mcp-core": "^0.1.0"
  },
  "dependencies": {
    "mydb-client": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "typescript": "^5.7.2"
  }
}
```

### 3. Create tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### 4. Implement Plugin

```typescript
// packages/mydb/src/index.ts
import { PluginBase, PluginConfig, PluginContext } from '@nam088/mcp-core';
import { z } from 'zod';

export class MyDBPlugin extends PluginBase {
  readonly metadata: PluginConfig = {
    name: 'mydb',
    version: '0.1.0',
    description: 'MyDB plugin for MCP',
  };

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);
    // Initialize your DB connection
  }

  register(context: PluginContext): void {
    const { server } = context;
    
    server.registerTool('mydb_query', {
      description: 'Query MyDB',
      inputSchema: {
        query: z.string().describe('SQL query'),
      }
    }, async ({ query }) => {
      // Implement your tool
      return {
        content: [{ type: 'text', text: 'Result' }]
      };
    });
  }

  async cleanup(): Promise<void> {
    await super.cleanup();
    // Cleanup resources
  }
}
```

### 5. Build and Use

```bash
# Build your plugin
cd packages/mydb
npm run build

# Use it in your server
npm install @nam088/mcp-mydb
```

## Development

```bash
# Build all packages
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Clean build artifacts
npm run clean
```

## Project Structure

```
mcp-server/
├── packages/
│   ├── core/                    # @nam088/mcp-core
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── mysql/                   # @nam088/mcp-mysql
│   │   ├── src/
│   │   ├── bin/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── sql-server/              # @nam088/mcp-sql-server
│   │   ├── src/
│   │   ├── bin/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── mongodb/                 # @nam088/mcp-mongodb
│   │   ├── src/
│   │   ├── bin/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── redis/                   # @nam088/mcp-redis
│   │   ├── src/
│   │   ├── bin/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── postgres/                # @nam088/mcp-postgres
│       ├── src/
│       ├── bin/
│       ├── package.json
│       └── tsconfig.json
├── package.json                # Root package with workspaces
├── tsconfig.json               # Shared TypeScript config
├── ARCHITECTURE.md             # Architecture documentation
└── QUICK_START.md              # Vietnamese quick start guide
```

## Benefits of This Architecture

1. **Plugin Independence**: Each plugin has its own dependencies
   - MySQL: `mysql2`
   - SQL Server: `mssql`
   - MongoDB: `mongodb`
   - Redis: `redis`
   - PostgreSQL: `pg`
2. **Selective Installation**: Install only the plugins you need
3. **No Dependency Conflicts**: Plugins don't interfere with each other
4. **Easy Publishing**: Each plugin can be published to npm independently
5. **Flexible Loading**: Choose static imports or dynamic loading
6. **Type Safety**: Full TypeScript support across all packages
7. **Mode Control**: READONLY, WRITEONLY (MySQL), or FULL modes for security
8. **Standalone Servers**: Each plugin can run as a standalone MCP server

## License

MIT

## Author

nam088

