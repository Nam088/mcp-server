# Quick Start Guide

## Khởi động nhanh

### Bước 1: Cài đặt dependencies

```bash
npm install
```

### Bước 2: Build tất cả packages

```bash
npm run build
```

Lệnh này sẽ:
1. Build các packages trong `packages/` (core, plugin-redis)
2. Build main server

### Bước 3: Sử dụng các packages trong project của bạn

Cài đặt packages cần thiết:

```bash
# Chọn các packages bạn cần
npm install @nam088/mcp-core
npm install @nam088/mcp-mysql        # MySQL/MariaDB
npm install @nam088/mcp-sql-server   # SQL Server
npm install @nam088/mcp-mongodb      # MongoDB
npm install @nam088/mcp-redis        # Redis
npm install @nam088/mcp-postgres     # PostgreSQL
```

Tạo MCP server của bạn:

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
  mode: 'READONLY', // READONLY, WRITEONLY, or FULL
});

await registry.registerPlugin(MongoDBPlugin, {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  database: process.env.MONGODB_DATABASE || 'test',
  mode: 'READONLY', // READONLY or FULL
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Project Structure

```
mcp-server/
├── packages/               # Independent plugins
│   ├── core/              # Core system (no database dependencies)
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── mysql/             # MySQL/MariaDB plugin (dependency: mysql2)
│   │   ├── src/
│   │   ├── bin/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── sql-server/        # SQL Server plugin (dependency: mssql)
│   │   ├── src/
│   │   ├── bin/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── mongodb/           # MongoDB plugin (dependency: mongodb)
│   │   ├── src/
│   │   ├── bin/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── redis/             # Redis plugin (dependency: redis)
│   │   ├── src/
│   │   ├── bin/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── postgres/          # PostgreSQL plugin (dependency: pg)
│       ├── src/
│       ├── bin/
│       ├── package.json
│       └── tsconfig.json
├── package.json            # Root package with workspaces
└── tsconfig.json           # Shared TypeScript config
```

## Benefits of This Architecture

### 1. Fully Independent Plugins

Each plugin is a separate npm package with its own dependencies:

```
@nam088/mcp-mysql
└── dependencies: mysql2     <-- ONLY MySQL plugin needs this lib

@nam088/mcp-sql-server
└── dependencies: mssql      <-- ONLY SQL Server plugin needs this lib

@nam088/mcp-mongodb
└── dependencies: mongodb    <-- ONLY MongoDB plugin needs this lib

@nam088/mcp-redis
└── dependencies: redis      <-- ONLY Redis plugin needs this lib

@nam088/mcp-postgres
└── dependencies: pg         <-- ONLY Postgres plugin needs this lib
```

### 2. Selective Installation

Install only the packages you need:

```bash
# MySQL only
npm install @nam088/mcp-core @nam088/mcp-mysql

# SQL Server only
npm install @nam088/mcp-core @nam088/mcp-sql-server

# MongoDB only
npm install @nam088/mcp-core @nam088/mcp-mongodb

# Redis only
npm install @nam088/mcp-core @nam088/mcp-redis

# PostgreSQL only
npm install @nam088/mcp-core @nam088/mcp-postgres

# Or combine multiple plugins
npm install @nam088/mcp-core @nam088/mcp-mysql @nam088/mcp-mongodb @nam088/mcp-redis
```

### 3. No Dependency Conflicts

- Each plugin has its own dependencies
- No interference between plugins
- Can update versions independently

### 4. Independent Development

Develop and publish each plugin separately:

```bash
cd packages/redis
npm publish  # Publish Redis plugin only
```

## Available Plugins

### MySQL Plugin

```bash
# Standalone server
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export MYSQL_USER=root
export MYSQL_PASSWORD=your_password
export MYSQL_DATABASE=your_database
export MYSQL_MODE=READONLY  # READONLY, WRITEONLY, or FULL
npx @nam088/mcp-mysql

# Or use in code
import { MysqlPlugin } from '@nam088/mcp-mysql';
```

**Tools**: `mysql_query`, `mysql_execute`, `mysql_list_databases`, `mysql_list_tables`, `mysql_describe_table`, `mysql_list_indexes`, `mysql_explain_query`, `mysql_processlist`, and more...

### SQL Server Plugin

```bash
# Standalone server
export MSSQL_HOST=localhost
export MSSQL_PORT=1433
export MSSQL_USER=sa
export MSSQL_PASSWORD=your_password
export MSSQL_DATABASE=your_database
export MSSQL_MODE=READONLY  # READONLY or FULL
npx @nam088/mcp-sql-server

# Or use in code
import { SqlServerPlugin } from '@nam088/mcp-sql-server';
```

**Tools**: `sqlserver_query`, `sqlserver_execute`, `sqlserver_list_databases`, `sqlserver_list_tables`, `sqlserver_describe_table`, `sqlserver_list_indexes`, `sqlserver_active_sessions`, and more...

### MongoDB Plugin

```bash
# Standalone server
export MONGODB_URI=mongodb://localhost:27017
export MONGODB_DATABASE=your_database
export MONGODB_MODE=READONLY  # READONLY or FULL
npx @nam088/mcp-mongodb

# Or use in code
import { MongoDBPlugin } from '@nam088/mcp-mongodb';
```

**Tools**: `mongodb_find`, `mongodb_insert_one`, `mongodb_update_one`, `mongodb_delete_one`, `mongodb_aggregate`, `mongodb_list_databases`, `mongodb_list_collections`, `mongodb_create_index`, and more...

### Redis Plugin

```bash
# Standalone server
export REDIS_HOST=localhost
export REDIS_PORT=6379
npx @nam088/mcp-redis

# Or use in code
import { RedisPlugin } from '@nam088/mcp-redis';
```

**Tools**: `redis_get`, `redis_set`, `redis_del`, `redis_keys`, and more...

### PostgreSQL Plugin

```bash
# Standalone server
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=your_password
export POSTGRES_DB=your_database
npx @nam088/mcp-postgres

# Or use in code
import { PostgresPlugin } from '@nam088/mcp-postgres';
```

**Tools**: `postgres_query`, `postgres_execute`, `postgres_list_tables`, `postgres_describe_table`, and more...

## Creating a New Plugin

### Example: Creating a MongoDB Plugin

```bash
# 1. Create folder
mkdir -p packages/mongodb/src

# 2. Create package.json
cd packages/mongodb
npm init -y
```

Edit `package.json`:

```json
{
  "name": "@nam088/mcp-mongodb",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "@modelcontextprotocol/sdk": "^1.21.1",
    "@nam088/mcp-core": "^0.1.0"
  },
  "dependencies": {
    "mongodb": "^6.0.0"
  }
}
```

Create `src/index.ts`:

```typescript
import { PluginBase, type PluginConfig, type PluginContext } from '@nam088/mcp-core';
import { Pool } from 'pg';

export class PostgresPlugin extends PluginBase {
  readonly metadata: PluginConfig = {
    name: 'postgres',
    version: '0.1.0',
    description: 'PostgreSQL plugin for MCP',
  };

  private pool?: Pool;

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);
    const config = this.getConfig<{ host: string; port: number; database: string }>();
    
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
    });
  }

  register(context: PluginContext): void {
    const { server } = context;
    
    server.registerTool('postgres_query', {
      description: 'Execute PostgreSQL query',
      inputSchema: { /* ... */ }
    }, async (args) => {
      const result = await this.pool?.query(args.query);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    });
  }

  async cleanup(): Promise<void> {
    await this.pool?.end();
    await super.cleanup();
  }
}
```

Use in server:

```typescript
import { PostgresPlugin } from '@nam088/mcp-postgres';

await registry.registerPlugin(PostgresPlugin, {
  host: 'localhost',
  port: 5432,
  database: 'mydb',
});
```

## Development Workflow

```bash
# Build all packages
npm run build

# Type check entire project
npm run type-check

# Lint and format
npm run lint:fix
npm run format

# Clean build artifacts
npm run clean
```

## Frequently Asked Questions

### Q: Why do I need to build packages first?

Because the main server imports from workspace packages. TypeScript needs type declarations (`.d.ts`) from these packages.

### Q: Can I use plugins from npm?

Yes! Just install and configure:

```bash
npm install @someone/mcp-mongodb

# Add to plugins.config.json
{
  "package": "@someone/mcp-mongodb",
  "export": "MongoDBPlugin",
  "config": { ... }
}
```

### Q: Which plugin runs first?

Plugins load in the order they appear in the config file, from top to bottom.

### Q: How to temporarily disable a plugin?

Set `"enabled": false` in config:

```json
{
  "package": "@nam088/mcp-redis",
  "enabled": false,
  "config": { ... }
}
```

## Additional Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture
- [README.md](./README.md) - Project overview
- [packages/core/README.md](./packages/core/README.md) - Core API
- [packages/mysql/README.md](./packages/mysql/README.md) - MySQL plugin
- [packages/sql-server/README.md](./packages/sql-server/README.md) - SQL Server plugin
- [packages/mongodb/README.md](./packages/mongodb/README.md) - MongoDB plugin
- [packages/redis/README.md](./packages/redis/README.md) - Redis plugin
- [packages/postgres/README.md](./packages/postgres/README.md) - PostgreSQL plugin

