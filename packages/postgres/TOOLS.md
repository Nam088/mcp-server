# PostgreSQL Plugin - Available Tools

## Read-Only Tools (Available in all modes)

### postgres_query
Execute SELECT queries on PostgreSQL database.

**Input Schema:**
```typescript
{
  query: string;      // SQL SELECT query
  params?: Array<string | number | boolean | null>;  // Optional parameters
}
```

**Example:**
```typescript
{
  query: "SELECT * FROM users WHERE id = $1",
  params: [123]
}
```

**Response:**
```json
{
  "rows": [
    { "id": 123, "name": "John", "email": "john@example.com" }
  ],
  "rowCount": 1,
  "fields": [
    { "name": "id", "dataTypeID": 23 },
    { "name": "name", "dataTypeID": 1043 },
    { "name": "email", "dataTypeID": 1043 }
  ]
}
```

---

### postgres_list_tables
List all tables in a schema.

**Input Schema:**
```typescript
{
  schema?: string;  // Schema name (default: "public")
}
```

**Example:**
```typescript
{
  schema: "public"
}
```

**Response:**
```json
{
  "schema": "public",
  "tables": [
    {
      "table_name": "users",
      "table_type": "BASE TABLE",
      "table_schema": "public"
    },
    {
      "table_name": "orders",
      "table_type": "BASE TABLE",
      "table_schema": "public"
    }
  ],
  "count": 2
}
```

---

### postgres_describe_table
Get detailed information about table structure.

**Input Schema:**
```typescript
{
  table: string;    // Table name
  schema?: string;  // Schema name (default: "public")
}
```

**Example:**
```typescript
{
  table: "users",
  schema: "public"
}
```

**Response:**
```json
{
  "schema": "public",
  "table": "users",
  "columns": [
    {
      "column_name": "id",
      "data_type": "integer",
      "character_maximum_length": null,
      "column_default": "nextval('users_id_seq'::regclass)",
      "is_nullable": "NO",
      "ordinal_position": 1
    },
    {
      "column_name": "name",
      "data_type": "character varying",
      "character_maximum_length": 255,
      "column_default": null,
      "is_nullable": "YES",
      "ordinal_position": 2
    }
  ],
  "columnCount": 2
}
```

---

### postgres_list_schemas
List all schemas in the database.

**Input Schema:**
```typescript
{}  // No parameters
```

**Response:**
```json
{
  "schemas": [
    {
      "schema_name": "public",
      "schema_owner": "postgres"
    },
    {
      "schema_name": "auth",
      "schema_owner": "postgres"
    }
  ],
  "count": 2
}
```

---

### postgres_list_indexes
List all indexes for a table.

**Input Schema:**
```typescript
{
  table: string;    // Table name
  schema?: string;  // Schema name (default: "public")
}
```

**Example:**
```typescript
{
  table: "users",
  schema: "public"
}
```

**Response:**
```json
{
  "schema": "public",
  "table": "users",
  "indexes": [
    {
      "index_name": "users_pkey",
      "column_name": "id",
      "index_type": "btree",
      "is_primary": true,
      "is_unique": true
    },
    {
      "index_name": "users_email_idx",
      "column_name": "email",
      "index_type": "btree",
      "is_primary": false,
      "is_unique": true
    }
  ],
  "count": 2
}
```

---

### postgres_database_info
Get PostgreSQL database server information.

**Input Schema:**
```typescript
{}  // No parameters
```

**Response:**
```json
{
  "version": "PostgreSQL 16.1 on x86_64-pc-linux-gnu...",
  "database": {
    "database_name": "mydb",
    "size": "8537 kB"
  },
  "connections": 5
}
```

---

## Write Tools (Requires FULL mode)

### postgres_execute
Execute INSERT, UPDATE, DELETE, or DDL queries.

**Input Schema:**
```typescript
{
  query: string;      // SQL query to execute
  params?: Array<string | number | boolean | null>;  // Optional parameters
}
```

**INSERT Example:**
```typescript
{
  query: "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
  params: ["John Doe", "john@example.com"]
}
```

**UPDATE Example:**
```typescript
{
  query: "UPDATE users SET name = $1 WHERE id = $2",
  params: ["Jane Doe", 123]
}
```

**DELETE Example:**
```typescript
{
  query: "DELETE FROM users WHERE id = $1",
  params: [123]
}
```

**DDL Example:**
```typescript
{
  query: "CREATE TABLE products (id SERIAL PRIMARY KEY, name VARCHAR(255))"
}
```

**Response:**
```json
{
  "rows": [
    { "id": 124, "name": "John Doe", "email": "john@example.com" }
  ],
  "rowCount": 1,
  "fields": [
    { "name": "id", "dataTypeID": 23 },
    { "name": "name", "dataTypeID": 1043 },
    { "name": "email", "dataTypeID": 1043 }
  ]
}
```

---

## Tool Comparison

| Tool | Mode Required | Operation Type | Returns Data |
|------|---------------|----------------|--------------|
| `postgres_query` | READONLY | SELECT | ✅ Yes |
| `postgres_list_tables` | READONLY | Schema Info | ✅ Yes |
| `postgres_describe_table` | READONLY | Schema Info | ✅ Yes |
| `postgres_list_schemas` | READONLY | Schema Info | ✅ Yes |
| `postgres_list_indexes` | READONLY | Schema Info | ✅ Yes |
| `postgres_database_info` | READONLY | Server Info | ✅ Yes |
| `postgres_execute` | FULL | INSERT/UPDATE/DELETE/DDL | ✅ Yes (with RETURNING) |

---

## Security Notes

1. **Always use parameterized queries** ($1, $2, etc.) to prevent SQL injection
2. **READONLY mode** only allows SELECT and schema inspection
3. **FULL mode** allows all database operations - use with caution
4. **Connection pooling** is enabled by default for better performance
5. **Statement timeouts** can be configured to prevent long-running queries

## Error Handling

All tools return errors in this format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: relation \"non_existent_table\" does not exist"
    }
  ],
  "isError": true
}
```

## Performance Tips

1. **Use indexes** for frequently queried columns
2. **Limit result sets** with LIMIT clause
3. **Use connection pooling** (configured automatically)
4. **Set appropriate timeouts** for your use case
5. **Use prepared statements** (parameterized queries)
6. **Batch operations** when possible
7. **Monitor connection pool** usage

