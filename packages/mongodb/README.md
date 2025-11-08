# @nam088/mcp-mongodb

MongoDB plugin for Model Context Protocol (MCP) server.

## Features

- 🔍 **Query Documents**: Find documents with flexible filtering, sorting, and projection
- 📊 **Database Introspection**: List databases, collections, indexes, and statistics
- 🔧 **CRUD Operations**: Insert, update, and delete documents
- 🚀 **Aggregation Pipeline**: Run complex aggregation queries
- 📈 **Index Management**: Create and manage indexes
- 🛡️ **Type-Safe**: Full TypeScript support with proper typing
- 🔒 **Secure**: Support for MongoDB authentication and SSL/TLS connections
- ⚡ **Connection Pooling**: Efficient connection management

## Installation

```bash
npm install @nam088/mcp-mongodb
```

## Configuration

### Environment Variables

Configure your MongoDB connection using environment variables:

```bash
# Required
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=your_database

# Optional
MONGODB_MODE=READONLY          # Plugin mode: READONLY or FULL
```

### Plugin Configuration

```typescript
import { MongoDBPlugin } from '@nam088/mcp-mongodb';

const plugin = new MongoDBPlugin({
  uri: 'mongodb://localhost:27017',
  database: 'your_database',
  mode: 'READONLY', // or 'FULL'
  options: {
    // MongoDB client options
    maxPoolSize: 10,
    minPoolSize: 0,
  }
});
```

### MongoDB Atlas Configuration

For MongoDB Atlas (cloud):

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
MONGODB_DATABASE=your_database
```

## Usage

### As Standalone MCP Server

Create `mcp-config.json`:

```json
{
  "mcpServers": {
    "mongodb": {
      "command": "npx",
      "args": [
        "-y",
        "@nam088/mcp-mongodb"
      ],
      "env": {
        "MONGODB_URI": "mongodb://localhost:27017",
        "MONGODB_DATABASE": "your_database",
        "MONGODB_MODE": "READONLY"
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
import { MongoDBPlugin } from '@nam088/mcp-mongodb';

const server = new McpServer(
  { name: 'my-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

const registry = new PluginRegistry(server);
await registry.registerPlugin(MongoDBPlugin);

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Available Tools

### Read-Only Tools (READONLY mode)

- **mongodb_find**: Find documents in a collection
- **mongodb_count**: Count documents in a collection
- **mongodb_aggregate**: Run aggregation pipeline
- **mongodb_list_databases**: List all databases
- **mongodb_list_collections**: List collections in a database
- **mongodb_collection_stats**: Get collection statistics
- **mongodb_list_indexes**: List indexes on a collection
- **mongodb_server_status**: Get server status information

### Write Tools (FULL mode only)

- **mongodb_insert_one**: Insert a single document
- **mongodb_insert_many**: Insert multiple documents
- **mongodb_update_one**: Update a single document
- **mongodb_update_many**: Update multiple documents
- **mongodb_delete_one**: Delete a single document
- **mongodb_delete_many**: Delete multiple documents
- **mongodb_create_index**: Create an index
- **mongodb_drop_index**: Drop an index

## Plugin Modes

### READONLY Mode (Default)

Only read operations are allowed. Safe for production use.

```bash
MONGODB_MODE=READONLY
```

### FULL Mode

All operations including writes are allowed. Use with caution.

```bash
MONGODB_MODE=FULL
```

## Examples

### Find Documents

```typescript
// Tool: mongodb_find
{
  "collection": "users",
  "filter": {
    "age": { "$gte": 18 },
    "status": "active"
  },
  "projection": {
    "name": 1,
    "email": 1,
    "_id": 0
  },
  "sort": {
    "name": 1
  },
  "limit": 10
}
```

### Insert Document (FULL mode)

```typescript
// Tool: mongodb_insert_one
{
  "collection": "users",
  "document": {
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30,
    "status": "active"
  }
}
```

### Update Documents (FULL mode)

```typescript
// Tool: mongodb_update_many
{
  "collection": "users",
  "filter": {
    "status": "inactive"
  },
  "update": {
    "$set": {
      "status": "archived"
    }
  }
}
```

### Aggregation Pipeline

```typescript
// Tool: mongodb_aggregate
{
  "collection": "orders",
  "pipeline": [
    {
      "$match": {
        "status": "completed"
      }
    },
    {
      "$group": {
        "_id": "$userId",
        "totalSpent": { "$sum": "$amount" },
        "orderCount": { "$sum": 1 }
      }
    },
    {
      "$sort": {
        "totalSpent": -1
      }
    },
    {
      "$limit": 10
    }
  ]
}
```

### Create Index (FULL mode)

```typescript
// Tool: mongodb_create_index
{
  "collection": "users",
  "keys": {
    "email": 1
  },
  "options": {
    "unique": true,
    "name": "email_unique"
  }
}
```

### List Collections

```typescript
// Tool: mongodb_list_collections
{
  "database": "mydb"
}
```

### Get Collection Statistics

```typescript
// Tool: mongodb_collection_stats
{
  "collection": "users",
  "database": "mydb"
}
```

## Security Best Practices

1. **Use Encrypted Connections**: Use `mongodb+srv://` or configure SSL/TLS
2. **Limit Permissions**: Use database users with minimal required permissions
3. **Use READONLY Mode**: For most use cases, READONLY mode is sufficient
4. **Validate Input**: MongoDB operators like `$where` can be dangerous
5. **Connection Pooling**: Configure appropriate pool sizes for your workload
6. **Network Security**: Use VPN or IP whitelisting for remote connections

## Type Safety

This plugin is fully typed with TypeScript. All query results and configurations use proper types from the `mongodb` library, ensuring type safety throughout your application.

```typescript
import type {
  MongoDBPluginConfig,
  MongoDBQueryResult,
  MongoDBInsertResult,
  MongoDBUpdateResult,
  MongoDBDeleteResult
} from '@nam088/mcp-mongodb';
```

## Requirements

- Node.js >= 18
- MongoDB 4.0 or later (including MongoDB Atlas)
- Network access to MongoDB instance

## License

MIT

## Author

nam088

## Support

For issues and questions, please visit the [GitHub repository](https://github.com/nam088/mcp-server).

