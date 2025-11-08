# @nam088/mcp-postgres

PostgreSQL plugin for MCP (Model Context Protocol) server. Provides tools for interacting with PostgreSQL databases.

## Features

- ✅ Connection pooling with configurable pool size
- ✅ Support for connection string or individual config
- ✅ SSL/TLS support
- ✅ Environment variable configuration
- ✅ Read-only and full access modes
- ✅ Parameterized queries for SQL injection prevention
- ✅ Database schema inspection
- ✅ Table and index listing
- ✅ Connection timeout and retry logic

## Installation

```bash
npm install @nam088/mcp-postgres
```

## Quick Start

### MCP Client Configuration (Claude Desktop, Cursor, etc.)

Add to your MCP client configuration file:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@nam088/mcp-postgres"],
      "env": {
        "POSTGRES_HOST": "localhost",
        "POSTGRES_PORT": "5432",
        "POSTGRES_USER": "postgres",
        "POSTGRES_PASSWORD": "your_password",
        "POSTGRES_DB": "your_database",
        "POSTGRES_MODE": "READONLY"
      }
    }
  }
}
```

**Config file locations:**
- **Claude Desktop (macOS):** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Desktop (Windows):** `%APPDATA%\Claude\claude_desktop_config.json`
- **Cursor:** See Cursor MCP settings

### Standalone Server (Terminal)

```bash
# Using environment variables
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=your_password
export POSTGRES_DB=your_database
export POSTGRES_MODE=READONLY

npx -y @nam088/mcp-postgres
```

### As a Plugin

```typescript
import { PostgresPlugin } from '@nam088/mcp-postgres';
import { PluginRegistry } from '@nam088/mcp-core';

const registry = new PluginRegistry(server);
await registry.registerPlugin(PostgresPlugin, {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'your_password',
  database: 'your_database',
  mode: 'READONLY'
});
```

## Configuration

### Connection String (Recommended)

```typescript
{
  connectionString: 'postgresql://user:password@localhost:5432/database',
  ssl: true
}
```

### Individual Settings

```typescript
{
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'your_password',
  database: 'your_database',
  ssl: {
    rejectUnauthorized: false, // For self-signed certificates
  },
  max: 10, // Maximum pool size
  min: 0,  // Minimum pool size
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 30000
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_URL` or `DATABASE_URL` | Connection string | - |
| `POSTGRES_HOST` or `PGHOST` | PostgreSQL host | `localhost` |
| `POSTGRES_PORT` or `PGPORT` | PostgreSQL port | `5432` |
| `POSTGRES_USER` or `PGUSER` | Database user | `postgres` |
| `POSTGRES_PASSWORD` or `PGPASSWORD` | Database password | - |
| `POSTGRES_DB` or `PGDATABASE` | Database name | `postgres` |
| `POSTGRES_MODE` | Plugin mode (`READONLY`, `FULL`) | `READONLY` |
| `POSTGRES_SSL` | Enable SSL | `false` |
| `POSTGRES_SSL_REJECT_UNAUTHORIZED` | Reject unauthorized SSL | `true` |
| `POSTGRES_MAX_POOL` | Maximum pool size | `10` |
| `POSTGRES_MIN_POOL` | Minimum pool size | `0` |
| `POSTGRES_TIMEOUT` | Connection timeout (ms) | `5000` |
| `POSTGRES_STATEMENT_TIMEOUT` | Statement timeout (ms) | `0` |
| `POSTGRES_QUERY_TIMEOUT` | Query timeout (ms) | `0` |
| `POSTGRES_APP_NAME` | Application name | `mcp-postgres` |

## Available Tools

**22 powerful tools for PostgreSQL management!**

### 📊 Schema & Structure Tools (9 tools)

#### `postgres_list_schemas`
List all schemas in the database.
```typescript
{}
```

#### `postgres_list_tables`
List all tables in a schema.
```typescript
{ schema: "public" }
```

#### `postgres_describe_table`
Get detailed information about table structure.
```typescript
{ table: "users", schema: "public" }
```

#### `postgres_list_views`
List all views in a schema.
```typescript
{ schema: "public" }
```

#### `postgres_list_materialized_views`
List all materialized views in a schema.
```typescript
{ schema: "public" }
```

#### `postgres_list_functions`
List all functions and procedures in a schema.
```typescript
{ schema: "public" }
```

#### `postgres_list_sequences`
List all sequences in a schema.
```typescript
{ schema: "public" }
```

#### `postgres_list_indexes`
List all indexes for a table.
```typescript
{ table: "users", schema: "public" }
```

#### `postgres_list_triggers`
List all triggers for a table (or all tables in schema).
```typescript
{ table: "users", schema: "public" }  // or just { schema: "public" }
```

### 🔍 Query & Analysis Tools (3 tools)

#### `postgres_query`
Execute SELECT queries on PostgreSQL database.
```typescript
{ query: "SELECT * FROM users WHERE id = $1", params: [1] }
```

#### `postgres_explain_query`
Explain a query execution plan (EXPLAIN or EXPLAIN ANALYZE).
```typescript
{ 
  query: "SELECT * FROM users WHERE age > $1",
  params: [25],
  analyze: true  // false = EXPLAIN only, true = EXPLAIN ANALYZE
}
```

#### `postgres_database_info`
Get PostgreSQL database server information.
```typescript
{}
```

### 📈 Performance & Stats Tools (4 tools)

#### `postgres_table_stats`
Get statistics about a table (size, row count, dead rows, vacuum info).
```typescript
{ table: "users", schema: "public" }
```

#### `postgres_index_usage`
Get index usage statistics for a table or all tables.
```typescript
{ table: "users", schema: "public" }  // or just { schema: "public" }
```

#### `postgres_list_constraints`
List all constraints for a table (FK, PK, unique, check).
```typescript
{ table: "users", schema: "public" }
```

#### `postgres_active_queries`
List currently running queries in the database.
```typescript
{ include_idle: false }  // true to include idle connections
```

#### `postgres_lock_info`
Get information about current locks and blocked queries.
```typescript
{ blocked_only: true }  // false to show all locks
```

### 🔧 Write Tools (Requires FULL mode)

#### `postgres_execute`
Execute INSERT, UPDATE, DELETE, or DDL queries.
```typescript
{ query: "INSERT INTO users (name) VALUES ($1)", params: ["John"] }
```

#### `postgres_kill_query`
Terminate a running query by process ID.
```typescript
{ pid: 12345, force: false }  // true = terminate, false = cancel
```

#### `postgres_vacuum_analyze`
Run VACUUM ANALYZE on a table for maintenance.
```typescript
{ table: "users", schema: "public", full: false }
```

#### `postgres_refresh_materialized_view`
Refresh a materialized view.
```typescript
{ view: "user_stats", schema: "public", concurrently: true }
```

## Security

### Plugin Modes

- **READONLY**: Only SELECT queries and schema inspection
- **FULL**: All database operations (INSERT, UPDATE, DELETE, DDL)

### Best Practices

1. **Use parameterized queries** to prevent SQL injection:
   ```typescript
   // ✅ Good
   { query: "SELECT * FROM users WHERE id = $1", params: [userId] }
   
   // ❌ Bad
   { query: `SELECT * FROM users WHERE id = ${userId}` }
   ```

2. **Use connection strings** for sensitive credentials:
   ```bash
   export DATABASE_URL='postgresql://user:pass@host:5432/db'
   ```

3. **Enable SSL** for production:
   ```typescript
   {
     ssl: {
       rejectUnauthorized: true,
       ca: fs.readFileSync('ca-cert.pem').toString()
     }
   }
   ```

4. **Set statement timeouts** to prevent long-running queries:
   ```typescript
   {
     statement_timeout: 30000, // 30 seconds
     query_timeout: 30000
   }
   ```

## Examples

See [EXAMPLES.md](./EXAMPLES.md) for detailed usage examples.

## License

MIT

