# MongoDB MCP Plugin Examples

This document provides practical examples of using the MongoDB MCP plugin.

## Basic Query Examples

### Find All Documents

```json
{
  "tool": "mongodb_find",
  "arguments": {
    "collection": "users"
  }
}
```

### Find with Filter

```json
{
  "tool": "mongodb_find",
  "arguments": {
    "collection": "users",
    "filter": {
      "age": { "$gte": 18 },
      "status": "active"
    }
  }
}
```

### Find with Projection and Limit

```json
{
  "tool": "mongodb_find",
  "arguments": {
    "collection": "users",
    "filter": {
      "country": "USA"
    },
    "projection": {
      "name": 1,
      "email": 1,
      "_id": 0
    },
    "limit": 5
  }
}
```

### Find with Sorting and Pagination

```json
{
  "tool": "mongodb_find",
  "arguments": {
    "collection": "products",
    "filter": {
      "price": { "$lte": 100 }
    },
    "sort": {
      "price": -1,
      "name": 1
    },
    "skip": 10,
    "limit": 10
  }
}
```

## Aggregation Examples

### Group and Count

```json
{
  "tool": "mongodb_aggregate",
  "arguments": {
    "collection": "orders",
    "pipeline": [
      {
        "$group": {
          "_id": "$status",
          "count": { "$sum": 1 }
        }
      }
    ]
  }
}
```

### Calculate Total Sales by User

```json
{
  "tool": "mongodb_aggregate",
  "arguments": {
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
          "orderCount": { "$sum": 1 },
          "avgOrderValue": { "$avg": "$amount" }
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
}
```

### Lookup (Join) Example

```json
{
  "tool": "mongodb_aggregate",
  "arguments": {
    "collection": "orders",
    "pipeline": [
      {
        "$lookup": {
          "from": "users",
          "localField": "userId",
          "foreignField": "_id",
          "as": "user"
        }
      },
      {
        "$unwind": "$user"
      },
      {
        "$project": {
          "orderId": "$_id",
          "amount": 1,
          "userName": "$user.name",
          "userEmail": "$user.email"
        }
      }
    ]
  }
}
```

### Date Aggregation Example

```json
{
  "tool": "mongodb_aggregate",
  "arguments": {
    "collection": "orders",
    "pipeline": [
      {
        "$match": {
          "createdAt": {
            "$gte": { "$date": "2024-01-01T00:00:00.000Z" }
          }
        }
      },
      {
        "$group": {
          "_id": {
            "$dateToString": {
              "format": "%Y-%m-%d",
              "date": "$createdAt"
            }
          },
          "dailyRevenue": { "$sum": "$amount" },
          "orderCount": { "$sum": 1 }
        }
      },
      {
        "$sort": {
          "_id": 1
        }
      }
    ]
  }
}
```

## Insert Examples (FULL Mode)

### Insert Single Document

```json
{
  "tool": "mongodb_insert_one",
  "arguments": {
    "collection": "users",
    "document": {
      "name": "John Doe",
      "email": "john@example.com",
      "age": 30,
      "status": "active",
      "createdAt": { "$date": "2024-01-01T00:00:00.000Z" }
    }
  }
}
```

### Insert Multiple Documents

```json
{
  "tool": "mongodb_insert_many",
  "arguments": {
    "collection": "products",
    "documents": [
      {
        "name": "Product A",
        "price": 29.99,
        "category": "electronics"
      },
      {
        "name": "Product B",
        "price": 49.99,
        "category": "electronics"
      },
      {
        "name": "Product C",
        "price": 19.99,
        "category": "books"
      }
    ]
  }
}
```

## Update Examples (FULL Mode)

### Update Single Document

```json
{
  "tool": "mongodb_update_one",
  "arguments": {
    "collection": "users",
    "filter": {
      "email": "john@example.com"
    },
    "update": {
      "$set": {
        "status": "inactive",
        "updatedAt": { "$date": "2024-01-02T00:00:00.000Z" }
      }
    }
  }
}
```

### Update Multiple Documents

```json
{
  "tool": "mongodb_update_many",
  "arguments": {
    "collection": "products",
    "filter": {
      "category": "electronics"
    },
    "update": {
      "$mul": {
        "price": 0.9
      },
      "$set": {
        "onSale": true
      }
    }
  }
}
```

### Increment Counter

```json
{
  "tool": "mongodb_update_one",
  "arguments": {
    "collection": "users",
    "filter": {
      "_id": { "$oid": "507f1f77bcf86cd799439011" }
    },
    "update": {
      "$inc": {
        "loginCount": 1
      },
      "$set": {
        "lastLogin": { "$date": "2024-01-02T00:00:00.000Z" }
      }
    }
  }
}
```

### Upsert Example

```json
{
  "tool": "mongodb_update_one",
  "arguments": {
    "collection": "settings",
    "filter": {
      "key": "theme"
    },
    "update": {
      "$set": {
        "value": "dark",
        "updatedAt": { "$date": "2024-01-02T00:00:00.000Z" }
      }
    },
    "upsert": true
  }
}
```

### Array Operations

```json
{
  "tool": "mongodb_update_one",
  "arguments": {
    "collection": "users",
    "filter": {
      "email": "john@example.com"
    },
    "update": {
      "$push": {
        "tags": "premium"
      },
      "$addToSet": {
        "interests": "technology"
      }
    }
  }
}
```

## Delete Examples (FULL Mode)

### Delete Single Document

```json
{
  "tool": "mongodb_delete_one",
  "arguments": {
    "collection": "users",
    "filter": {
      "email": "john@example.com"
    }
  }
}
```

### Delete Multiple Documents

```json
{
  "tool": "mongodb_delete_many",
  "arguments": {
    "collection": "logs",
    "filter": {
      "createdAt": {
        "$lt": { "$date": "2023-01-01T00:00:00.000Z" }
      }
    }
  }
}
```

## Index Management Examples (FULL Mode)

### Create Simple Index

```json
{
  "tool": "mongodb_create_index",
  "arguments": {
    "collection": "users",
    "keys": {
      "email": 1
    },
    "options": {
      "unique": true,
      "name": "email_unique"
    }
  }
}
```

### Create Compound Index

```json
{
  "tool": "mongodb_create_index",
  "arguments": {
    "collection": "orders",
    "keys": {
      "userId": 1,
      "createdAt": -1
    },
    "options": {
      "name": "user_orders_idx"
    }
  }
}
```

### Create TTL Index

```json
{
  "tool": "mongodb_create_index",
  "arguments": {
    "collection": "sessions",
    "keys": {
      "createdAt": 1
    },
    "options": {
      "name": "session_ttl",
      "expireAfterSeconds": 3600
    }
  }
}
```

### Drop Index

```json
{
  "tool": "mongodb_drop_index",
  "arguments": {
    "collection": "users",
    "indexName": "email_unique"
  }
}
```

## Database Introspection Examples

### List All Databases

```json
{
  "tool": "mongodb_list_databases",
  "arguments": {}
}
```

### List Collections

```json
{
  "tool": "mongodb_list_collections",
  "arguments": {
    "database": "mydb"
  }
}
```

### Get Collection Statistics

```json
{
  "tool": "mongodb_collection_stats",
  "arguments": {
    "collection": "users",
    "database": "mydb"
  }
}
```

### List Indexes

```json
{
  "tool": "mongodb_list_indexes",
  "arguments": {
    "collection": "users"
  }
}
```

### Get Server Status

```json
{
  "tool": "mongodb_server_status",
  "arguments": {}
}
```

## Complex Query Operators

### Text Search (requires text index)

```json
{
  "tool": "mongodb_find",
  "arguments": {
    "collection": "articles",
    "filter": {
      "$text": {
        "$search": "mongodb tutorial"
      }
    },
    "projection": {
      "title": 1,
      "score": { "$meta": "textScore" }
    },
    "sort": {
      "score": { "$meta": "textScore" }
    }
  }
}
```

### Regex Search

```json
{
  "tool": "mongodb_find",
  "arguments": {
    "collection": "users",
    "filter": {
      "email": {
        "$regex": "^[a-zA-Z0-9._%+-]+@example\\.com$",
        "$options": "i"
      }
    }
  }
}
```

### Array Queries

```json
{
  "tool": "mongodb_find",
  "arguments": {
    "collection": "users",
    "filter": {
      "tags": {
        "$all": ["premium", "verified"]
      }
    }
  }
}
```

### Nested Document Query

```json
{
  "tool": "mongodb_find",
  "arguments": {
    "collection": "users",
    "filter": {
      "address.city": "New York",
      "address.country": "USA"
    }
  }
}
```

### Exists and Type Queries

```json
{
  "tool": "mongodb_find",
  "arguments": {
    "collection": "users",
    "filter": {
      "phone": { "$exists": true },
      "age": { "$type": "number" }
    }
  }
}
```

## Performance Tips

1. **Use Indexes**: Always create indexes for frequently queried fields
2. **Projection**: Only fetch fields you need
3. **Limit Results**: Use `limit` to avoid fetching too many documents
4. **Aggregation**: Use aggregation pipeline for complex queries instead of fetching all documents
5. **Covered Queries**: Use projections that can be satisfied entirely by index
6. **Connection Pooling**: Configure appropriate pool size in connection options

## Error Handling

All tools return errors in a consistent format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: <error message>"
    }
  ],
  "isError": true
}
```

Common errors:
- Connection errors: Check MongoDB URI and network connectivity
- Authentication errors: Verify username/password
- Permission errors: Ensure user has required privileges
- Query errors: Check query syntax and field names

