# MongoDB MCP Tools Documentation

This document provides detailed information about all available tools in the MongoDB MCP plugin.

## Read-Only Tools

These tools are available in both READONLY and FULL modes.

### mongodb_find

Find documents in a MongoDB collection.

**Parameters:**
- `collection` (string, required): Collection name to query
- `database` (string, optional): Database name (uses default if not specified)
- `filter` (object, optional): Query filter object using MongoDB query syntax
- `projection` (object, optional): Fields to include/exclude (e.g., `{"name": 1, "_id": 0}`)
- `sort` (object, optional): Sort order (e.g., `{"age": -1, "name": 1}`)
- `limit` (number, optional): Maximum number of documents to return
- `skip` (number, optional): Number of documents to skip

**Example:**
```json
{
  "collection": "users",
  "filter": {
    "age": { "$gte": 18 },
    "status": "active"
  },
  "projection": {
    "name": 1,
    "email": 1
  },
  "sort": {
    "name": 1
  },
  "limit": 10
}
```

---

### mongodb_count

Count documents in a MongoDB collection.

**Parameters:**
- `collection` (string, required): Collection name
- `database` (string, optional): Database name (uses default if not specified)
- `filter` (object, optional): Query filter object

**Example:**
```json
{
  "collection": "users",
  "filter": {
    "status": "active"
  }
}
```

---

### mongodb_aggregate

Run an aggregation pipeline on a MongoDB collection.

**Parameters:**
- `collection` (string, required): Collection name
- `database` (string, optional): Database name (uses default if not specified)
- `pipeline` (array, required): Array of aggregation pipeline stages

**Example:**
```json
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

---

### mongodb_list_databases

List all databases on the MongoDB server.

**Parameters:** None

**Example:**
```json
{}
```

**Response:**
```json
[
  {
    "name": "admin",
    "sizeOnDisk": 32768,
    "empty": false
  },
  {
    "name": "mydb",
    "sizeOnDisk": 1048576,
    "empty": false
  }
]
```

---

### mongodb_list_collections

List all collections in a MongoDB database.

**Parameters:**
- `database` (string, optional): Database name (uses default if not specified)

**Example:**
```json
{
  "database": "mydb"
}
```

**Response:**
```json
[
  {
    "name": "users",
    "type": "collection",
    "options": {},
    "info": {
      "readOnly": false
    }
  }
]
```

---

### mongodb_collection_stats

Get statistics about a MongoDB collection.

**Parameters:**
- `collection` (string, required): Collection name
- `database` (string, optional): Database name (uses default if not specified)

**Example:**
```json
{
  "collection": "users",
  "database": "mydb"
}
```

**Response:**
```json
{
  "ns": "mydb.users",
  "size": 1048576,
  "count": 1000,
  "avgObjSize": 1024,
  "storageSize": 2097152,
  "nindexes": 3,
  "totalIndexSize": 65536
}
```

---

### mongodb_list_indexes

List all indexes on a MongoDB collection.

**Parameters:**
- `collection` (string, required): Collection name
- `database` (string, optional): Database name (uses default if not specified)

**Example:**
```json
{
  "collection": "users"
}
```

**Response:**
```json
[
  {
    "name": "_id_",
    "key": {
      "_id": 1
    },
    "v": 2
  },
  {
    "name": "email_unique",
    "key": {
      "email": 1
    },
    "unique": true,
    "v": 2
  }
]
```

---

### mongodb_server_status

Get MongoDB server status information.

**Parameters:** None

**Example:**
```json
{}
```

**Response:**
```json
{
  "host": "localhost:27017",
  "version": "6.0.0",
  "process": "mongod",
  "pid": 12345,
  "uptime": 86400,
  "uptimeEstimate": 86400,
  "connections": {
    "current": 5,
    "available": 51195,
    "totalCreated": 100
  }
}
```

---

## Write Tools (FULL Mode Only)

These tools require the plugin to be running in FULL mode.

### mongodb_insert_one

Insert a single document into a MongoDB collection.

**Parameters:**
- `collection` (string, required): Collection name
- `database` (string, optional): Database name (uses default if not specified)
- `document` (object, required): Document to insert

**Example:**
```json
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

**Response:**
```json
{
  "acknowledged": true,
  "insertedId": "507f1f77bcf86cd799439011",
  "insertedCount": 1
}
```

---

### mongodb_insert_many

Insert multiple documents into a MongoDB collection.

**Parameters:**
- `collection` (string, required): Collection name
- `database` (string, optional): Database name (uses default if not specified)
- `documents` (array, required): Array of documents to insert

**Example:**
```json
{
  "collection": "users",
  "documents": [
    {
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ]
}
```

**Response:**
```json
{
  "acknowledged": true,
  "insertedIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012"
  ],
  "insertedCount": 2
}
```

---

### mongodb_update_one

Update a single document in a MongoDB collection.

**Parameters:**
- `collection` (string, required): Collection name
- `database` (string, optional): Database name (uses default if not specified)
- `filter` (object, required): Query filter to find document to update
- `update` (object, required): Update operations (e.g., `{"$set": {"field": "value"}}`)
- `upsert` (boolean, optional): Create document if it does not exist (default: false)

**Example:**
```json
{
  "collection": "users",
  "filter": {
    "email": "john@example.com"
  },
  "update": {
    "$set": {
      "status": "inactive"
    },
    "$inc": {
      "loginCount": 1
    }
  }
}
```

**Response:**
```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1,
  "upsertedId": null,
  "upsertedCount": 0
}
```

---

### mongodb_update_many

Update multiple documents in a MongoDB collection.

**Parameters:**
- `collection` (string, required): Collection name
- `database` (string, optional): Database name (uses default if not specified)
- `filter` (object, required): Query filter to find documents to update
- `update` (object, required): Update operations
- `upsert` (boolean, optional): Create document if no matches found (default: false)

**Example:**
```json
{
  "collection": "users",
  "filter": {
    "status": "pending"
  },
  "update": {
    "$set": {
      "status": "active"
    }
  }
}
```

**Response:**
```json
{
  "acknowledged": true,
  "matchedCount": 10,
  "modifiedCount": 10,
  "upsertedId": null,
  "upsertedCount": 0
}
```

---

### mongodb_delete_one

Delete a single document from a MongoDB collection.

**Parameters:**
- `collection` (string, required): Collection name
- `database` (string, optional): Database name (uses default if not specified)
- `filter` (object, required): Query filter to find document to delete

**Example:**
```json
{
  "collection": "users",
  "filter": {
    "email": "john@example.com"
  }
}
```

**Response:**
```json
{
  "acknowledged": true,
  "deletedCount": 1
}
```

---

### mongodb_delete_many

Delete multiple documents from a MongoDB collection.

**Parameters:**
- `collection` (string, required): Collection name
- `database` (string, optional): Database name (uses default if not specified)
- `filter` (object, required): Query filter to find documents to delete

**Example:**
```json
{
  "collection": "users",
  "filter": {
    "status": "deleted"
  }
}
```

**Response:**
```json
{
  "acknowledged": true,
  "deletedCount": 5
}
```

---

### mongodb_create_index

Create an index on a MongoDB collection.

**Parameters:**
- `collection` (string, required): Collection name
- `database` (string, optional): Database name (uses default if not specified)
- `keys` (object, required): Index keys (e.g., `{"field": 1}` for ascending, `{"field": -1}` for descending)
- `options` (object, optional): Index options
  - `unique` (boolean): Create unique index
  - `sparse` (boolean): Create sparse index
  - `name` (string): Index name
  - `expireAfterSeconds` (number): TTL in seconds

**Example:**
```json
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

**Response:**
```json
{
  "indexName": "email_unique"
}
```

---

### mongodb_drop_index

Drop an index from a MongoDB collection.

**Parameters:**
- `collection` (string, required): Collection name
- `database` (string, optional): Database name (uses default if not specified)
- `indexName` (string, required): Name of the index to drop

**Example:**
```json
{
  "collection": "users",
  "indexName": "email_unique"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Index 'email_unique' dropped"
}
```

---

## MongoDB Query Operators

### Comparison Operators

- `$eq`: Equal to
- `$gt`: Greater than
- `$gte`: Greater than or equal to
- `$lt`: Less than
- `$lte`: Less than or equal to
- `$ne`: Not equal to
- `$in`: In array
- `$nin`: Not in array

### Logical Operators

- `$and`: Logical AND
- `$or`: Logical OR
- `$not`: Logical NOT
- `$nor`: Logical NOR

### Element Operators

- `$exists`: Field exists
- `$type`: Field type

### Array Operators

- `$all`: All elements match
- `$elemMatch`: Element matches
- `$size`: Array size

### Update Operators

- `$set`: Set field value
- `$unset`: Remove field
- `$inc`: Increment value
- `$mul`: Multiply value
- `$push`: Add to array
- `$pull`: Remove from array
- `$addToSet`: Add to array if not exists

For more information, see the [MongoDB documentation](https://docs.mongodb.com/manual/reference/operator/).

