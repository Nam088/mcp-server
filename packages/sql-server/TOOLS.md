# SQL Server MCP Tools

This document provides detailed information about all available tools in the SQL Server MCP plugin.

## Table of Contents

- [Read-Only Tools](#read-only-tools)
- [Write Tools](#write-tools)
- [Tool Reference](#tool-reference)

## Read-Only Tools

These tools are available in both `READONLY` and `FULL` modes.

### sqlserver_query

Execute a SELECT query on SQL Server database.

**Parameters:**
- `query` (string, required): SQL SELECT query to execute
- `params` (object, optional): Named parameters for parameterized queries

**Example:**
```json
{
  "query": "SELECT * FROM users WHERE id = @id",
  "params": {
    "id": 1
  }
}
```

### sqlserver_list_databases

List all databases in the SQL Server instance (excludes system databases).

**Parameters:** None

**Example:**
```json
{}
```

### sqlserver_list_tables

List all tables in a schema.

**Parameters:**
- `schema` (string, optional): Schema name (default: "dbo")

**Example:**
```json
{
  "schema": "dbo"
}
```

### sqlserver_describe_table

Get detailed information about a table structure.

**Parameters:**
- `table` (string, required): Table name
- `schema` (string, optional): Schema name (default: "dbo")

**Example:**
```json
{
  "table": "users",
  "schema": "dbo"
}
```

### sqlserver_list_schemas

List all schemas in the database (excludes built-in role schemas).

**Parameters:** None

**Example:**
```json
{}
```

### sqlserver_list_indexes

List all indexes for a table.

**Parameters:**
- `table` (string, required): Table name
- `schema` (string, optional): Schema name (default: "dbo")

**Example:**
```json
{
  "table": "users",
  "schema": "dbo"
}
```

### sqlserver_list_constraints

List all constraints for a table (foreign keys, primary keys, unique, check).

**Parameters:**
- `table` (string, required): Table name
- `schema` (string, optional): Schema name (default: "dbo")

**Example:**
```json
{
  "table": "orders",
  "schema": "dbo"
}
```

### sqlserver_database_info

Get SQL Server database server information.

**Parameters:** None

**Example:**
```json
{}
```

### sqlserver_explain_query

Get query execution plan using SHOWPLAN_XML.

**Parameters:**
- `query` (string, required): SQL query to explain
- `params` (object, optional): Named parameters for parameterized queries

**Example:**
```json
{
  "query": "SELECT * FROM users WHERE status = @status",
  "params": {
    "status": "active"
  }
}
```

### sqlserver_active_sessions

List currently active sessions in the database.

**Parameters:**
- `include_system` (boolean, optional): Include system sessions (default: false)

**Example:**
```json
{
  "include_system": false
}
```

### sqlserver_table_stats

Get statistics about a table (size, row count, index size, etc).

**Parameters:**
- `table` (string, required): Table name
- `schema` (string, optional): Schema name (default: "dbo")

**Example:**
```json
{
  "table": "users",
  "schema": "dbo"
}
```

## Write Tools

These tools are only available in `FULL` mode.

### sqlserver_execute

Execute an INSERT, UPDATE, DELETE, or DDL query.

**Parameters:**
- `query` (string, required): SQL query to execute
- `params` (object, optional): Named parameters for parameterized queries

**Example:**
```json
{
  "query": "INSERT INTO users (name, email) VALUES (@name, @email)",
  "params": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### sqlserver_kill_session

Kill a session by session ID.

**Parameters:**
- `session_id` (number, required): Session ID to kill

**Example:**
```json
{
  "session_id": 52
}
```

### sqlserver_rebuild_index

Rebuild an index on a table.

**Parameters:**
- `table` (string, required): Table name
- `index` (string, optional): Index name (rebuilds all indexes if not provided)
- `schema` (string, optional): Schema name (default: "dbo")

**Example:**
```json
{
  "table": "users",
  "index": "IX_users_email",
  "schema": "dbo"
}
```

### sqlserver_update_statistics

Update statistics for a table.

**Parameters:**
- `table` (string, required): Table name
- `schema` (string, optional): Schema name (default: "dbo")

**Example:**
```json
{
  "table": "users",
  "schema": "dbo"
}
```

## Tool Reference

### Common Patterns

#### Parameterized Queries

Always use named parameters to prevent SQL injection:

```json
{
  "query": "SELECT * FROM users WHERE id = @id AND status = @status",
  "params": {
    "id": 1,
    "status": "active"
  }
}
```

#### Schema Names

Most tools support optional schema names (default: "dbo"):

```json
{
  "table": "users",
  "schema": "sales"
}
```

#### Error Handling

All tools return errors in a consistent format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Invalid object name 'users'."
    }
  ],
  "isError": true
}
```

## Data Types

SQL Server supports various data types. Here are the common ones:

- **Numeric**: int, bigint, decimal, numeric, float, real
- **String**: varchar, nvarchar, char, nchar, text, ntext
- **Date/Time**: date, time, datetime, datetime2, datetimeoffset
- **Binary**: binary, varbinary, image
- **Other**: bit, uniqueidentifier, xml, json

## Best Practices

1. **Use Parameterized Queries**: Always use named parameters (@param) to prevent SQL injection
2. **Specify Schema**: Explicitly specify schema names for better performance
3. **Monitor Sessions**: Use `sqlserver_active_sessions` to monitor database activity
4. **Regular Maintenance**: Use `sqlserver_rebuild_index` and `sqlserver_update_statistics` regularly
5. **Check Execution Plans**: Use `sqlserver_explain_query` to optimize slow queries
6. **Table Statistics**: Monitor table growth with `sqlserver_table_stats`

## Security Considerations

1. **READONLY Mode**: Use READONLY mode for most operations
2. **FULL Mode**: Only use FULL mode when write operations are required
3. **Minimal Permissions**: Grant only necessary permissions to the database user
4. **Connection Encryption**: Always use encrypted connections in production
5. **Certificate Validation**: Validate server certificates in production environments

## Performance Tips

1. **Connection Pooling**: Configure appropriate pool sizes
2. **Index Maintenance**: Regularly rebuild fragmented indexes
3. **Statistics Updates**: Keep statistics up to date for optimal query plans
4. **Query Optimization**: Use execution plans to identify slow queries
5. **Monitoring**: Regularly check active sessions and resource usage

