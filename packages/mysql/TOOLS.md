# MySQL MCP Tools Reference

This document provides a complete reference for all tools available in the MySQL MCP plugin.

## Table of Contents

- [Query Tools](#query-tools)
- [Database Inspection](#database-inspection)
- [Performance Tools](#performance-tools)
- [Process Management](#process-management)
- [Maintenance Tools](#maintenance-tools)
- [Database Objects](#database-objects)

## Query Tools

### mysql_query

Execute SELECT queries on the MySQL database.

**Mode Required:** READONLY or FULL

**Parameters:**
- `query` (string, required): SQL SELECT query to execute
- `params` (array, optional): Query parameters for parameterized queries

**Example:**
```json
{
  "query": "SELECT * FROM users WHERE id = ?",
  "params": [1]
}
```

**Response:**
```json
{
  "rows": [
    { "id": 1, "name": "John Doe", "email": "john@example.com" }
  ],
  "rowCount": 1,
  "fields": [
    { "name": "id", "type": "3" },
    { "name": "name", "type": "253" },
    { "name": "email", "type": "253" }
  ]
}
```

### mysql_execute

Execute INSERT, UPDATE, DELETE, or DDL queries.

**Mode Required:** WRITEONLY or FULL

**Parameters:**
- `query` (string, required): SQL query to execute
- `params` (array, optional): Query parameters for parameterized queries

**Example:**
```json
{
  "query": "INSERT INTO users (name, email) VALUES (?, ?)",
  "params": ["Jane Doe", "jane@example.com"]
}
```

**Response:**
```json
{
  "rows": [],
  "rowCount": 1
}
```

## Database Inspection

### mysql_list_databases

List all databases in the MySQL server.

**Mode Required:** READONLY or FULL

**Parameters:** None

**Example:**
```json
{}
```

**Response:**
```json
{
  "databases": [
    {
      "database_name": "testdb",
      "charset": "utf8mb4",
      "collation": "utf8mb4_general_ci"
    }
  ],
  "count": 1
}
```

### mysql_list_tables

List all tables in a database.

**Mode Required:** READONLY or FULL

**Parameters:**
- `database` (string, optional): Database name (defaults to current database)

**Example:**
```json
{
  "database": "testdb"
}
```

**Response:**
```json
{
  "database": "testdb",
  "tables": [
    {
      "table_name": "users",
      "table_type": "BASE TABLE",
      "engine": "InnoDB",
      "table_rows": 100,
      "data_length": 16384,
      "index_length": 32768
    }
  ],
  "count": 1
}
```

### mysql_describe_table

Get detailed information about a table structure.

**Mode Required:** READONLY or FULL

**Parameters:**
- `table` (string, required): Table name
- `database` (string, optional): Database name (defaults to current database)

**Example:**
```json
{
  "table": "users",
  "database": "testdb"
}
```

**Response:**
```json
{
  "database": "testdb",
  "table": "users",
  "columns": [
    {
      "column_name": "id",
      "data_type": "int",
      "column_type": "int(11)",
      "is_nullable": "NO",
      "column_default": null,
      "column_key": "PRI",
      "extra": "auto_increment",
      "ordinal_position": 1
    }
  ],
  "columnCount": 1
}
```

### mysql_list_indexes

List all indexes for a table.

**Mode Required:** READONLY or FULL

**Parameters:**
- `table` (string, required): Table name
- `database` (string, optional): Database name (defaults to current database)

**Example:**
```json
{
  "table": "users",
  "database": "testdb"
}
```

**Response:**
```json
{
  "database": "testdb",
  "table": "users",
  "indexes": [
    {
      "index_name": "PRIMARY",
      "column_name": "id",
      "index_type": "BTREE",
      "is_unique": true,
      "is_primary": true,
      "seq_in_index": 1
    }
  ],
  "count": 1
}
```

### mysql_list_constraints

List all constraints for a table (foreign keys, primary keys, unique).

**Mode Required:** READONLY or FULL

**Parameters:**
- `table` (string, required): Table name
- `database` (string, optional): Database name (defaults to current database)

**Example:**
```json
{
  "table": "posts",
  "database": "testdb"
}
```

**Response:**
```json
{
  "database": "testdb",
  "table": "posts",
  "constraints": [
    {
      "constraint_name": "PRIMARY",
      "constraint_type": "PRIMARY KEY",
      "column_name": "id",
      "foreign_table_schema": null,
      "foreign_table_name": null,
      "foreign_column_name": null
    },
    {
      "constraint_name": "fk_user_id",
      "constraint_type": "FOREIGN KEY",
      "column_name": "user_id",
      "foreign_table_schema": "testdb",
      "foreign_table_name": "users",
      "foreign_column_name": "id"
    }
  ],
  "count": 2
}
```

### mysql_database_info

Get MySQL database server information.

**Mode Required:** READONLY or FULL

**Parameters:** None

**Example:**
```json
{}
```

**Response:**
```json
{
  "version": "8.0.35",
  "current_database": "testdb",
  "connections": 5
}
```

## Performance Tools

### mysql_explain_query

Explain a query execution plan.

**Mode Required:** READONLY or FULL

**Parameters:**
- `query` (string, required): SQL query to explain
- `format` (enum, optional): Explain format - TRADITIONAL (default), JSON, or TREE
- `params` (array, optional): Query parameters for parameterized queries

**Example:**
```json
{
  "query": "SELECT * FROM users WHERE email = ?",
  "format": "JSON",
  "params": ["john@example.com"]
}
```

**Response:**
```json
{
  "query": "SELECT * FROM users WHERE email = ?",
  "format": "JSON",
  "plan": [
    {
      "id": 1,
      "select_type": "SIMPLE",
      "table": "users",
      "type": "ref",
      "key": "idx_email",
      "rows": 1
    }
  ]
}
```

### mysql_table_status

Get detailed status information about tables.

**Mode Required:** READONLY or FULL

**Parameters:**
- `table` (string, optional): Table name (all tables if not provided)
- `database` (string, optional): Database name (defaults to current database)

**Example:**
```json
{
  "table": "users",
  "database": "testdb"
}
```

**Response:**
```json
{
  "database": "testdb",
  "table": "users",
  "status": [
    {
      "Name": "users",
      "Engine": "InnoDB",
      "Version": 10,
      "Row_format": "Dynamic",
      "Rows": 100,
      "Avg_row_length": 163,
      "Data_length": 16384,
      "Max_data_length": 0,
      "Index_length": 32768,
      "Data_free": 0,
      "Auto_increment": 101,
      "Create_time": "2024-01-01 00:00:00",
      "Update_time": "2024-01-01 00:00:00",
      "Collation": "utf8mb4_general_ci"
    }
  ],
  "count": 1
}
```

## Process Management

### mysql_processlist

List currently running processes/queries in the database.

**Mode Required:** READONLY or FULL

**Parameters:**
- `full` (boolean, optional): Show full queries (default: false)

**Example:**
```json
{
  "full": true
}
```

**Response:**
```json
{
  "processes": [
    {
      "Id": 123,
      "User": "root",
      "Host": "localhost:54321",
      "db": "testdb",
      "Command": "Query",
      "Time": 5,
      "State": "Sending data",
      "Info": "SELECT * FROM users WHERE status = 'active'"
    }
  ],
  "count": 1
}
```

### mysql_kill_query

Kill a running query by process ID.

**Mode Required:** WRITEONLY or FULL

**Parameters:**
- `pid` (number, required): Process ID of the query to kill
- `connection` (boolean, optional): Kill entire connection instead of just query (default: false)

**Example:**
```json
{
  "pid": 123,
  "connection": false
}
```

**Response:**
```json
{
  "pid": 123,
  "action": "killed query",
  "success": true
}
```

## Maintenance Tools

### mysql_optimize_table

Optimize a table to reclaim storage and improve performance.

**Mode Required:** WRITEONLY or FULL

**Parameters:**
- `table` (string, required): Table name
- `database` (string, optional): Database name (defaults to current database)

**Example:**
```json
{
  "table": "users",
  "database": "testdb"
}
```

**Response:**
```json
{
  "database": "testdb",
  "table": "users",
  "result": [
    {
      "Table": "testdb.users",
      "Op": "optimize",
      "Msg_type": "status",
      "Msg_text": "OK"
    }
  ]
}
```

### mysql_analyze_table

Analyze a table to update index statistics.

**Mode Required:** WRITEONLY or FULL

**Parameters:**
- `table` (string, required): Table name
- `database` (string, optional): Database name (defaults to current database)

**Example:**
```json
{
  "table": "users",
  "database": "testdb"
}
```

**Response:**
```json
{
  "database": "testdb",
  "table": "users",
  "result": [
    {
      "Table": "testdb.users",
      "Op": "analyze",
      "Msg_type": "status",
      "Msg_text": "OK"
    }
  ]
}
```

## Database Objects

### mysql_list_views

List all views in a database.

**Mode Required:** READONLY or FULL

**Parameters:**
- `database` (string, optional): Database name (defaults to current database)

**Example:**
```json
{
  "database": "testdb"
}
```

**Response:**
```json
{
  "database": "testdb",
  "views": [
    {
      "view_name": "active_users",
      "definition": "SELECT * FROM users WHERE status = 'active'",
      "check_option": "NONE",
      "is_updatable": "YES"
    }
  ],
  "count": 1
}
```

### mysql_list_procedures

List all stored procedures in a database.

**Mode Required:** READONLY or FULL

**Parameters:**
- `database` (string, optional): Database name (defaults to current database)

**Example:**
```json
{
  "database": "testdb"
}
```

**Response:**
```json
{
  "database": "testdb",
  "procedures": [
    {
      "procedure_name": "get_user_posts",
      "routine_type": "PROCEDURE",
      "return_type": null,
      "definition": "BEGIN ... END"
    }
  ],
  "count": 1
}
```

### mysql_list_functions

List all stored functions in a database.

**Mode Required:** READONLY or FULL

**Parameters:**
- `database` (string, optional): Database name (defaults to current database)

**Example:**
```json
{
  "database": "testdb"
}
```

**Response:**
```json
{
  "database": "testdb",
  "functions": [
    {
      "function_name": "get_user_count",
      "routine_type": "FUNCTION",
      "return_type": "int",
      "definition": "BEGIN RETURN (SELECT COUNT(*) FROM users); END"
    }
  ],
  "count": 1
}
```

### mysql_list_triggers

List all triggers for a table or database.

**Mode Required:** READONLY or FULL

**Parameters:**
- `table` (string, optional): Table name (all triggers if not provided)
- `database` (string, optional): Database name (defaults to current database)

**Example:**
```json
{
  "table": "users",
  "database": "testdb"
}
```

**Response:**
```json
{
  "database": "testdb",
  "table": "users",
  "triggers": [
    {
      "trigger_name": "users_before_insert",
      "event": "INSERT",
      "table_name": "users",
      "action": "BEGIN SET NEW.created_at = NOW(); END",
      "timing": "BEFORE",
      "orientation": "ROW"
    }
  ],
  "count": 1
}
```

## Error Handling

All tools return errors in the following format:

```json
{
  "error": "Error message description"
}
```

Common error scenarios:
- Connection errors
- Permission errors
- SQL syntax errors
- Missing required parameters
- Mode restrictions (e.g., attempting write operation in READONLY mode)

