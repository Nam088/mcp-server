# PostgreSQL Plugin Examples

## Basic Usage

### Querying Data

```typescript
// Simple SELECT
const result = await postgres_query({
  query: "SELECT * FROM users LIMIT 10"
});

// With parameters (recommended)
const result = await postgres_query({
  query: "SELECT * FROM users WHERE email = $1",
  params: ["user@example.com"]
});

// Complex query with multiple parameters
const result = await postgres_query({
  query: `
    SELECT u.*, COUNT(o.id) as order_count
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.created_at >= $1 AND u.status = $2
    GROUP BY u.id
    ORDER BY order_count DESC
  `,
  params: ["2024-01-01", "active"]
});
```

### Schema Inspection

```typescript
// List all tables in public schema
const tables = await postgres_list_tables({
  schema: "public"
});

// Describe table structure
const structure = await postgres_describe_table({
  table: "users",
  schema: "public"
});

// List all schemas
const schemas = await postgres_list_schemas({});

// List indexes for a table
const indexes = await postgres_list_indexes({
  table: "users",
  schema: "public"
});

// Get database info
const info = await postgres_database_info({});
```

## Data Modification (FULL mode required)

### Insert Data

```typescript
// Single insert
const result = await postgres_execute({
  query: "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
  params: ["John Doe", "john@example.com"]
});

// Batch insert
const result = await postgres_execute({
  query: `
    INSERT INTO users (name, email)
    VALUES 
      ($1, $2),
      ($3, $4),
      ($5, $6)
    RETURNING *
  `,
  params: [
    "Alice", "alice@example.com",
    "Bob", "bob@example.com",
    "Charlie", "charlie@example.com"
  ]
});
```

### Update Data

```typescript
// Simple update
const result = await postgres_execute({
  query: "UPDATE users SET last_login = NOW() WHERE id = $1",
  params: [123]
});

// Conditional update
const result = await postgres_execute({
  query: `
    UPDATE products 
    SET price = price * 0.9 
    WHERE category = $1 AND stock > $2
    RETURNING *
  `,
  params: ["electronics", 10]
});
```

### Delete Data

```typescript
// Simple delete
const result = await postgres_execute({
  query: "DELETE FROM sessions WHERE expires_at < NOW()"
});

// Conditional delete with parameter
const result = await postgres_execute({
  query: "DELETE FROM users WHERE id = $1 RETURNING *",
  params: [123]
});
```

## Advanced Queries

### Transactions (Using CTE)

```typescript
const result = await postgres_execute({
  query: `
    WITH deleted_cart AS (
      DELETE FROM cart_items WHERE user_id = $1 RETURNING *
    ),
    inserted_order AS (
      INSERT INTO orders (user_id, total)
      SELECT user_id, SUM(price * quantity)
      FROM deleted_cart
      GROUP BY user_id
      RETURNING *
    )
    INSERT INTO order_items (order_id, product_id, quantity, price)
    SELECT 
      (SELECT id FROM inserted_order),
      product_id,
      quantity,
      price
    FROM deleted_cart
    RETURNING *
  `,
  params: [userId]
});
```

### JSON Queries

```typescript
// Query JSON columns
const result = await postgres_query({
  query: `
    SELECT 
      id,
      metadata->>'name' as name,
      metadata->'tags' as tags
    FROM products
    WHERE metadata @> $1::jsonb
  `,
  params: [JSON.stringify({ featured: true })]
});

// Update JSON field
const result = await postgres_execute({
  query: `
    UPDATE users
    SET preferences = preferences || $1::jsonb
    WHERE id = $2
  `,
  params: [JSON.stringify({ theme: "dark" }), userId]
});
```

### Full-Text Search

```typescript
const result = await postgres_query({
  query: `
    SELECT *,
      ts_rank(search_vector, query) as rank
    FROM articles,
      plainto_tsquery('english', $1) query
    WHERE search_vector @@ query
    ORDER BY rank DESC
    LIMIT 10
  `,
  params: ["PostgreSQL tutorial"]
});
```

### Window Functions

```typescript
const result = await postgres_query({
  query: `
    SELECT 
      id,
      name,
      salary,
      department,
      AVG(salary) OVER (PARTITION BY department) as avg_dept_salary,
      RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dept_rank
    FROM employees
    WHERE department = $1
  `,
  params: ["Engineering"]
});
```

## Connection Examples

### Using Connection String

```typescript
import { PostgresPlugin } from '@nam088/mcp-postgres';

const plugin = new PostgresPlugin({
  connectionString: 'postgresql://user:password@localhost:5432/mydb',
  mode: 'READONLY'
});
```

### Using SSL

```typescript
import fs from 'fs';

const plugin = new PostgresPlugin({
  host: 'postgres.example.com',
  port: 5432,
  user: 'myuser',
  password: 'mypassword',
  database: 'mydb',
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('ca-certificate.crt').toString(),
    key: fs.readFileSync('client-key.key').toString(),
    cert: fs.readFileSync('client-certificate.crt').toString()
  }
});
```

### Connection Pool Configuration

```typescript
const plugin = new PostgresPlugin({
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  max: 20, // Maximum 20 connections in pool
  min: 5,  // Minimum 5 idle connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s
  statement_timeout: 60000, // Max query time 60s
  application_name: 'my-app'
});
```

## Error Handling

```typescript
try {
  const result = await postgres_query({
    query: "SELECT * FROM non_existent_table"
  });
} catch (error) {
  if (error.message.includes('does not exist')) {
    console.error('Table not found');
  }
}
```

## Integration with Claude Desktop

Add to your `claude_desktop_config.json`:

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

## Best Practices

1. **Always use parameterized queries** to prevent SQL injection
2. **Use appropriate plugin mode** (READONLY for queries, FULL for writes)
3. **Set connection timeouts** to prevent hanging connections
4. **Use connection pooling** for better performance
5. **Enable SSL** in production environments
6. **Monitor pool usage** and adjust max/min connections as needed
7. **Use indexes** for frequently queried columns
8. **Limit result sets** with LIMIT clause when appropriate
9. **Use transactions** for related operations
10. **Handle errors gracefully** with proper error checking

