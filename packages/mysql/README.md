# @nam088/mcp-mysql

MySQL/MariaDB plugin for Model Context Protocol (MCP) server. This plugin provides a comprehensive set of tools for interacting with MySQL and MariaDB databases through the MCP protocol.

## Features

- 🔍 **Query Execution**: Execute SELECT queries with parameterized queries support
- ✏️ **Write Operations**: INSERT, UPDATE, DELETE, and DDL operations (with mode control)
- 📊 **Database Inspection**: List databases, tables, columns, indexes, constraints
- 🔧 **Maintenance**: Optimize and analyze tables
- 📈 **Performance**: Query execution plans with EXPLAIN
- 🔒 **Process Management**: View and kill running queries
- 🔄 **Triggers & Views**: List and manage triggers, views, stored procedures, and functions
- 🛡️ **Mode Control**: READONLY, WRITEONLY, or FULL modes for security

## Installation

```bash
npm install @nam088/mcp-mysql
```

## Usage

### As a Standalone MCP Server

Create a configuration file or use environment variables:

```json
{
  "mcpServers": {
    "mysql": {
      "command": "npx",
      "args": ["-y", "@nam088/mcp-mysql"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "your_database",
        "MYSQL_MODE": "FULL"
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
    "mysql": {
      "command": "npx",
      "args": ["-y", "@nam088/mcp-mysql"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "your_database",
        "MYSQL_MODE": "FULL"
      }
    }
  }
}
```

**With Connection Pool Settings:**

```json
{
  "mcpServers": {
    "mysql": {
      "command": "npx",
      "args": ["-y", "@nam088/mcp-mysql"],
      "env": {
        "MYSQL_HOST": "db.example.com",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "db_user",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "production_db",
        "MYSQL_MODE": "READONLY",
        "MYSQL_POOL_SIZE": "10",
        "MYSQL_TIMEOUT": "10000"
      }
    }
  }
}
```

**MariaDB Configuration:**

```json
{
  "mcpServers": {
    "mysql": {
      "command": "npx",
      "args": ["-y", "@nam088/mcp-mysql"],
      "env": {
        "MYSQL_HOST": "mariadb.example.com",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "mariadb_user",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "mariadb_database",
        "MYSQL_MODE": "FULL",
        "MYSQL_POOL_SIZE": "15",
        "MYSQL_TIMEOUT": "15000"
      }
    }
  }
}
```

### As a Plugin in Your MCP Server

```typescript
import { PluginRegistry } from '@nam088/mcp-core';
import { MysqlPlugin } from '@nam088/mcp-mysql';

const registry = new PluginRegistry({
  name: 'my-mcp-server',
  version: '1.0.0',
});

// Register MySQL plugin
registry.registerPlugin(new MysqlPlugin({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'your_password',
  database: 'your_database',
  mode: 'FULL', // READONLY, WRITEONLY, or FULL
}));

await registry.start();
```

## Configuration

### Environment Variables

- `MYSQL_HOST` - Database host (default: `localhost`)
- `MYSQL_PORT` - Database port (default: `3306`)
- `MYSQL_USER` - Database user (default: `root`)
- `MYSQL_PASSWORD` or `MYSQL_PWD` - Database password
- `MYSQL_DATABASE` or `MYSQL_DB` - Database name (default: `mysql`)
- `MYSQL_MODE` - Plugin mode: `READONLY`, `WRITEONLY`, or `FULL` (default: `READONLY`)
- `MYSQL_POOL_SIZE` - Connection pool size (default: `10`)
- `MYSQL_TIMEOUT` - Connection timeout in milliseconds (default: `10000`)

### Plugin Configuration

```typescript
new MysqlPlugin({
  // Connection settings
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'your_password',
  database: 'your_database',
  
  // Pool settings
  connectionLimit: 10,
  connectTimeout: 10000,
  waitForConnections: true,
  queueLimit: 0,
  
  // Plugin mode
  mode: 'FULL', // READONLY, WRITEONLY, or FULL
})
```

## Plugin Modes

### READONLY Mode (Default)
Only allows read operations:
- `mysql_query` - Execute SELECT queries
- `mysql_list_*` - List databases, tables, indexes, etc.
- `mysql_describe_*` - Describe table structures
- `mysql_explain_query` - Explain query execution plans
- `mysql_processlist` - View running processes
- `mysql_database_info` - Get database server info

### WRITEONLY Mode
Only allows write operations:
- `mysql_execute` - Execute INSERT, UPDATE, DELETE, DDL
- `mysql_kill_query` - Kill running queries
- `mysql_optimize_table` - Optimize tables
- `mysql_analyze_table` - Analyze tables

### FULL Mode
Allows all operations (both read and write).

## Available Tools

### Query Tools

#### `mysql_query`
Execute SELECT queries on the database.

```typescript
{
  query: "SELECT * FROM users WHERE id = ?",
  params: [1]
}
```

#### `mysql_execute`
Execute INSERT, UPDATE, DELETE, or DDL queries (requires FULL or WRITEONLY mode).

```typescript
{
  query: "INSERT INTO users (name, email) VALUES (?, ?)",
  params: ["John Doe", "john@example.com"]
}
```

### Database Inspection Tools

#### `mysql_list_databases`
List all databases in the MySQL server.

```typescript
{}
```

#### `mysql_list_tables`
List all tables in a database.

```typescript
{
  database: "my_database" // optional, uses current database if not provided
}
```

#### `mysql_describe_table`
Get detailed information about a table structure.

```typescript
{
  table: "users",
  database: "my_database" // optional
}
```

#### `mysql_list_indexes`
List all indexes for a table.

```typescript
{
  table: "users",
  database: "my_database" // optional
}
```

#### `mysql_list_constraints`
List all constraints for a table (foreign keys, primary keys, unique).

```typescript
{
  table: "users",
  database: "my_database" // optional
}
```

#### `mysql_database_info`
Get MySQL database server information.

```typescript
{}
```

### Performance Tools

#### `mysql_explain_query`
Explain a query execution plan.

```typescript
{
  query: "SELECT * FROM users WHERE email = ?",
  format: "JSON", // TRADITIONAL, JSON, or TREE (default: TRADITIONAL)
  params: ["john@example.com"]
}
```

#### `mysql_table_status`
Get detailed status information about tables.

```typescript
{
  table: "users", // optional, all tables if not provided
  database: "my_database" // optional
}
```

### Process Management Tools

#### `mysql_processlist`
List currently running processes/queries.

```typescript
{
  full: true // optional, show full queries (default: false)
}
```

#### `mysql_kill_query`
Kill a running query by process ID (requires FULL or WRITEONLY mode).

```typescript
{
  pid: 123,
  connection: false // optional, kill entire connection (default: false)
}
```

### Maintenance Tools

#### `mysql_optimize_table`
Optimize a table to reclaim storage and improve performance (requires FULL or WRITEONLY mode).

```typescript
{
  table: "users",
  database: "my_database" // optional
}
```

#### `mysql_analyze_table`
Analyze a table to update index statistics (requires FULL or WRITEONLY mode).

```typescript
{
  table: "users",
  database: "my_database" // optional
}
```

### Database Objects Tools

#### `mysql_list_views`
List all views in a database.

```typescript
{
  database: "my_database" // optional
}
```

#### `mysql_list_procedures`
List all stored procedures in a database.

```typescript
{
  database: "my_database" // optional
}
```

#### `mysql_list_functions`
List all stored functions in a database.

```typescript
{
  database: "my_database" // optional
}
```

#### `mysql_list_triggers`
List all triggers for a table or database.

```typescript
{
  table: "users", // optional, all triggers if not provided
  database: "my_database" // optional
}
```

## Security Best Practices

1. **Use READONLY mode by default** - Only enable write operations when needed
2. **Use parameterized queries** - Always use the `params` parameter to prevent SQL injection
3. **Limit database user permissions** - Use a database user with minimal required privileges
4. **Secure connection strings** - Never commit passwords to version control
5. **Use environment variables** - Store sensitive configuration in environment variables
6. **Enable SSL/TLS** - Use encrypted connections for production databases

## Examples

### Query with Parameters

```typescript
// Safe - uses parameterized query
await mysql_query({
  query: "SELECT * FROM users WHERE email = ? AND status = ?",
  params: ["john@example.com", "active"]
})
```

### List All Tables

```typescript
await mysql_list_tables({
  database: "my_database"
})
```

### Explain Query Performance

```typescript
await mysql_explain_query({
  query: "SELECT u.*, p.* FROM users u JOIN posts p ON u.id = p.user_id WHERE u.status = 'active'",
  format: "JSON"
})
```

### Optimize Table

```typescript
await mysql_optimize_table({
  table: "users",
  database: "my_database"
})
```

### Kill Long-Running Query

```typescript
// First, find the process ID
await mysql_processlist({ full: true })

// Then kill the query
await mysql_kill_query({
  pid: 123,
  connection: false
})
```

## Supported Databases

- MySQL 5.7+
- MySQL 8.0+
- MariaDB 10.2+
- MariaDB 10.3+
- MariaDB 10.4+
- MariaDB 10.5+
- MariaDB 10.6+
- MariaDB 11.0+

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npm run type-check

# Clean
npm run clean
```

## License

MIT

## Author

nam088

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

### 0.1.0
- Initial release
- Support for MySQL and MariaDB
- 20+ tools for database operations
- Mode control (READONLY, WRITEONLY, FULL)
- Connection pooling
- Parameterized queries
- Health checks

