# MCP Server Architecture

## Project Structure

This project uses a **monorepo workspace structure** to keep plugins independent with their own dependencies.

```
mcp-server/
├── packages/
│   ├── core/                    # Core plugin system
│   │   ├── src/
│   │   │   ├── types.ts        # Plugin interfaces
│   │   │   ├── plugin-base.ts  # Base plugin class
│   │   │   ├── plugin-registry.ts
│   │   │   └── index.ts
│   │   ├── package.json        # @nam088/mcp-core
│   │   └── tsconfig.json
│   │
│   ├── mysql/                  # MySQL/MariaDB plugin package
│   │   ├── src/
│   │   │   ├── index.ts        # MysqlPlugin implementation
│   │   │   └── types.ts
│   │   ├── bin/
│   │   │   └── server.ts       # Standalone server
│   │   ├── package.json        # @nam088/mcp-mysql
│   │   │                       # dependencies: mysql2
│   │   └── tsconfig.json
│   │
│   ├── sql-server/             # SQL Server plugin package
│   │   ├── src/
│   │   │   ├── index.ts        # SqlServerPlugin implementation
│   │   │   └── types.ts
│   │   ├── bin/
│   │   │   └── server.ts       # Standalone server
│   │   ├── package.json        # @nam088/mcp-sql-server
│   │   │                       # dependencies: mssql
│   │   └── tsconfig.json
│   │
│   ├── mongodb/                # MongoDB plugin package
│   │   ├── src/
│   │   │   ├── index.ts        # MongoDBPlugin implementation
│   │   │   └── types.ts
│   │   ├── bin/
│   │   │   └── server.ts       # Standalone server
│   │   ├── package.json        # @nam088/mcp-mongodb
│   │   │                       # dependencies: mongodb
│   │   └── tsconfig.json
│   │
│   ├── redis/                  # Redis plugin package
│   │   ├── src/
│   │   │   ├── index.ts        # RedisPlugin implementation
│   │   │   └── types.ts
│   │   ├── bin/
│   │   │   └── server.ts       # Standalone server
│   │   ├── package.json        # @nam088/mcp-redis
│   │   │                       # dependencies: redis
│   │   └── tsconfig.json
│   │
│   └── postgres/               # PostgreSQL plugin package
│       ├── src/
│       │   ├── index.ts        # PostgresPlugin implementation
│       │   └── types.ts
│       ├── bin/
│       │   └── server.ts       # Standalone server
│       ├── package.json        # @nam088/mcp-postgres
│       │                       # dependencies: pg
│       └── tsconfig.json
│
├── src/
│   └── index.ts                # Main server entry point
├── package.json                # Root package with workspaces
└── tsconfig.json

```

## Plugin Independence

### Separate Packages

Each plugin is its own npm package with:
- **Independent dependencies**: 
  - MySQL: `mysql2`
  - SQL Server: `mssql`
  - MongoDB: `mongodb`
  - Redis: `redis`
  - PostgreSQL: `pg`
- **Own package.json**: Version, dependencies, scripts managed separately
- **Own tsconfig.json**: TypeScript configuration per plugin
- **Publishable**: Each plugin can be published to npm independently
- **Standalone servers**: Each plugin can run as a standalone MCP server

### Shared Core

All plugins depend on `@nam088/mcp-core` which provides:
- `IPlugin` interface
- `PluginBase` abstract class
- `PluginRegistry` for plugin management
- `PluginContext` and type definitions

## Dependency Tree

```
@nam088/mcp-server
├── @nam088/mcp-core
├── @nam088/mcp-mysql
│   ├── @nam088/mcp-core (peer)
│   └── mysql2
├── @nam088/mcp-sql-server
│   ├── @nam088/mcp-core (peer)
│   └── mssql
├── @nam088/mcp-mongodb
│   ├── @nam088/mcp-core (peer)
│   └── mongodb
├── @nam088/mcp-redis
│   ├── @nam088/mcp-core (peer)
│   └── redis
└── @nam088/mcp-postgres
    ├── @nam088/mcp-core (peer)
    └── pg
```

## Adding New Plugins

### 1. Create Plugin Package

```bash
cd packages
mkdir mydb
cd mydb
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
  "peerDependencies": {
    "@modelcontextprotocol/sdk": "^1.21.1",
    "@nam088/mcp-core": "^0.1.0"
  },
  "dependencies": {
    "mydb-client": "^1.0.0"  // Your DB client
  }
}
```

### 3. Implement Plugin

```typescript
// packages/plugin-mydb/src/index.ts
import { PluginBase, PluginConfig, PluginContext } from '@nam088/mcp-core';

export class MyDBPlugin extends PluginBase {
  readonly metadata: PluginConfig = {
    name: 'mydb',
    version: '0.1.0',
    description: 'MyDB plugin',
  };

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);
    // Initialize DB connection
  }

  register(context: PluginContext): void {
    const { server } = context;
    // Register tools
  }

  async cleanup(): Promise<void> {
    await super.cleanup();
    // Cleanup resources
  }
}
```

### 4. Add to Main Server

```typescript
// src/index.ts
import { MyDBPlugin } from '@nam088/mcp-mydb';

await registry.registerPlugin(MyDBPlugin, {
  host: process.env.MYDB_HOST,
  // ... config
});
```

## Building

```bash
# Build all packages
npm run build

# Build only packages
npm run build:packages

# Type check everything
npm run type-check
```

## Benefits

1. **Plugin Isolation**: Each plugin has its own dependencies
2. **Independent Development**: Plugins can be developed separately
3. **Selective Installation**: Users can install only needed plugins
4. **Publishing**: Each plugin can be published to npm
5. **Version Management**: Plugins have independent versioning
6. **No Dependency Conflicts**: Plugins don't interfere with each other

## Plugin Lifecycle

1. **Registration**: `registerPlugin(PluginClass, config)`
2. **Initialization**: `plugin.initialize(context)`
3. **Registration**: `plugin.register(context)` - register tools
4. **Runtime**: Plugin tools are available
5. **Cleanup**: `plugin.cleanup()` on shutdown

## Environment Variables

Plugins can use environment variables for configuration:

### MySQL Plugin
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- `MYSQL_MODE`: `READONLY`, `WRITEONLY`, or `FULL`

### SQL Server Plugin
- `MSSQL_HOST`, `MSSQL_PORT`, `MSSQL_USER`, `MSSQL_PASSWORD`, `MSSQL_DATABASE`
- `MSSQL_MODE`: `READONLY` or `FULL`

### MongoDB Plugin
- `MONGODB_URI`, `MONGODB_DATABASE`
- `MONGODB_MODE`: `READONLY` or `FULL`

### Redis Plugin
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`

### PostgreSQL Plugin
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

