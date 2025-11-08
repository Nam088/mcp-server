# @nam088/mcp-sql-server

Microsoft SQL Server plugin for Model Context Protocol (MCP) server.

## Features

- 🔍 **Query Execution**: Execute SELECT queries with parameterized inputs
- 📊 **Database Introspection**: List databases, tables, schemas, indexes, and constraints
- 🔧 **Maintenance Operations**: Rebuild indexes, update statistics
- 📈 **Performance Monitoring**: View active sessions, query execution plans
- 🛡️ **Type-Safe**: Full TypeScript support with proper typing
- 🔒 **Secure**: Support for encrypted connections and SQL Server authentication
- ⚡ **Connection Pooling**: Efficient connection management with configurable pool settings

## Installation

```bash
npm install @nam088/mcp-sql-server
```

## Configuration

### Environment Variables

Configure your SQL Server connection using environment variables:

```bash
# Required
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD=your_password
MSSQL_DATABASE=your_database

# Optional
MSSQL_MODE=READONLY          # Plugin mode: READONLY or FULL
MSSQL_POOL_MAX=10           # Maximum pool size
MSSQL_POOL_MIN=0            # Minimum pool size
MSSQL_IDLE_TIMEOUT=30000    # Idle timeout in milliseconds
MSSQL_CONNECTION_TIMEOUT=15000  # Connection timeout
MSSQL_REQUEST_TIMEOUT=15000     # Request timeout
```

### Plugin Configuration

```typescript
import { SqlServerPlugin } from '@nam088/mcp-sql-server';

const plugin = new SqlServerPlugin({
  server: 'localhost',
  port: 1433,
  user: 'sa',
  password: 'your_password',
  database: 'your_database',
  mode: 'READONLY', // or 'FULL'
  encrypt: true,
  trustServerCertificate: false,
  poolMax: 10,
  poolMin: 0,
  connectionTimeout: 15000,
  requestTimeout: 15000,
});
```

## Usage

### As Standalone MCP Server

Create `mcp-config.json`:

```json
{
  "mcpServers": {
    "sql-server": {
      "command": "npx",
      "args": [
        "-y",
        "@nam088/mcp-sql-server"
      ],
      "env": {
        "MSSQL_HOST": "localhost",
        "MSSQL_PORT": "1433",
        "MSSQL_USER": "sa",
        "MSSQL_PASSWORD": "your_password",
        "MSSQL_DATABASE": "your_database",
        "MSSQL_MODE": "READONLY"
      }
    }
  }
}
```

### Complete Configuration Examples

**Basic Configuration:**

```json
{
  "mcpServers": {
    "sql-server": {
      "command": "npx",
      "args": [
        "-y",
        "@nam088/mcp-sql-server"
      ],
      "env": {
        "MSSQL_HOST": "localhost",
        "MSSQL_PORT": "1433",
        "MSSQL_USER": "sa",
        "MSSQL_PASSWORD": "your_password",
        "MSSQL_DATABASE": "your_database",
        "MSSQL_MODE": "READONLY"
      }
    }
  }
}
```

**With Connection Pool Settings:**

```json
{
  "mcpServers": {
    "sql-server": {
      "command": "npx",
      "args": [
        "-y",
        "@nam088/mcp-sql-server"
      ],
      "env": {
        "MSSQL_HOST": "sqlserver.example.com",
        "MSSQL_PORT": "1433",
        "MSSQL_USER": "db_user",
        "MSSQL_PASSWORD": "your_password",
        "MSSQL_DATABASE": "production_db",
        "MSSQL_MODE": "FULL",
        "MSSQL_POOL_MAX": "10",
        "MSSQL_POOL_MIN": "0",
        "MSSQL_IDLE_TIMEOUT": "30000",
        "MSSQL_CONNECTION_TIMEOUT": "15000",
        "MSSQL_REQUEST_TIMEOUT": "15000"
      }
    }
  }
}
```

**Azure SQL Database Configuration:**

```json
{
  "mcpServers": {
    "sql-server": {
      "command": "npx",
      "args": [
        "-y",
        "@nam088/mcp-sql-server"
      ],
      "env": {
        "MSSQL_HOST": "your-server.database.windows.net",
        "MSSQL_PORT": "1433",
        "MSSQL_USER": "admin_user",
        "MSSQL_PASSWORD": "your_password",
        "MSSQL_DATABASE": "azure_database",
        "MSSQL_MODE": "READONLY",
        "MSSQL_POOL_MAX": "20",
        "MSSQL_CONNECTION_TIMEOUT": "30000"
      }
    }
  }
}
```

### As Plugin in Your MCP Server

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PluginRegistry } from '@nam088/mcp-core';
import { SqlServerPlugin } from '@nam088/mcp-sql-server';

const server = new McpServer(
  { name: 'my-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

const registry = new PluginRegistry(server);
await registry.registerPlugin(SqlServerPlugin);

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Available Tools

### Read-Only Tools (READONLY mode)

- **sqlserver_query**: Execute SELECT queries
- **sqlserver_list_databases**: List all databases
- **sqlserver_list_tables**: List tables in a schema
- **sqlserver_describe_table**: Get table structure details
- **sqlserver_list_schemas**: List all schemas
- **sqlserver_list_indexes**: List indexes for a table
- **sqlserver_list_constraints**: List constraints for a table
- **sqlserver_database_info**: Get database server information
- **sqlserver_explain_query**: Get query execution plan
- **sqlserver_active_sessions**: List active database sessions
- **sqlserver_table_stats**: Get table statistics (size, rows, etc)

### Write Tools (FULL mode only)

- **sqlserver_execute**: Execute INSERT, UPDATE, DELETE, DDL queries
- **sqlserver_kill_session**: Kill a database session
- **sqlserver_rebuild_index**: Rebuild table indexes
- **sqlserver_update_statistics**: Update table statistics

## Plugin Modes

### READONLY Mode (Default)

Only read operations are allowed. Safe for production use.

```bash
MSSQL_MODE=READONLY
```

### FULL Mode

All operations including writes are allowed. Use with caution.

```bash
MSSQL_MODE=FULL
```

## Examples

### Query with Parameters

```typescript
// Tool: sqlserver_query
{
  "query": "SELECT * FROM users WHERE id = @id AND status = @status",
  "params": {
    "id": 1,
    "status": "active"
  }
}
```

### List Tables

```typescript
// Tool: sqlserver_list_tables
{
  "schema": "dbo"
}
```

### Get Table Structure

```typescript
// Tool: sqlserver_describe_table
{
  "table": "users",
  "schema": "dbo"
}
```

### Execute Write Operation (FULL mode)

```typescript
// Tool: sqlserver_execute
{
  "query": "INSERT INTO users (name, email) VALUES (@name, @email)",
  "params": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

## Security Best Practices

1. **Use Encrypted Connections**: Set `encrypt: true` in production
2. **Limit Permissions**: Use database users with minimal required permissions
3. **Use READONLY Mode**: For most use cases, READONLY mode is sufficient
4. **Parameterized Queries**: Always use named parameters to prevent SQL injection
5. **Connection Pooling**: Configure appropriate pool sizes for your workload
6. **Certificate Validation**: Set `trustServerCertificate: false` in production

## Type Safety

This plugin is fully typed with TypeScript. All query results and configurations use proper types from the `mssql` library, ensuring type safety throughout your application.

```typescript
import type { SqlServerPluginConfig, SqlServerQueryResult } from '@nam088/mcp-sql-server';
```

## Requirements

- Node.js >= 18
- SQL Server 2012 or later (including Azure SQL Database)
- Network access to SQL Server instance

## License

MIT

## Author

nam088

## Support

For issues and questions, please visit the [GitHub repository](https://github.com/nam088/mcp-server).

