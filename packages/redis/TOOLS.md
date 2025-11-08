# Redis Plugin - Complete Tools Reference

This document provides a comprehensive reference for all 23 Redis tools available in the MCP Redis plugin.

## Quick Reference

| Tool | Category | Write? | Description |
|------|----------|--------|-------------|
| `redis_get` | String | ❌ | Get value by key |
| `redis_set` | String | ✅ | Set value with optional TTL |
| `redis_mget` | String | ❌ | Get multiple values |
| `redis_del` | Key | ✅ | Delete key |
| `redis_exists` | Key | ❌ | Check if keys exist |
| `redis_incr` | String | ✅ | Increment integer value |
| `redis_decr` | String | ✅ | Decrement integer value |
| `redis_keys` | Key | ❌ | Find keys by pattern |
| `redis_ttl` | Key | ❌ | Get time to live |
| `redis_expire` | Key | ✅ | Set expiration time |
| `redis_hget` | Hash | ❌ | Get hash field value |
| `redis_hgetall` | Hash | ❌ | Get all hash fields |
| `redis_hset` | Hash | ✅ | Set hash field value |
| `redis_hdel` | Hash | ✅ | Delete hash fields |
| `redis_lpush` | List | ✅ | Prepend to list |
| `redis_rpush` | List | ✅ | Append to list |
| `redis_lrange` | List | ❌ | Get list range |
| `redis_sadd` | Set | ✅ | Add set members |
| `redis_smembers` | Set | ❌ | Get all set members |
| `redis_srem` | Set | ✅ | Remove set members |
| `redis_zadd` | Sorted Set | ✅ | Add sorted set members |
| `redis_zrange` | Sorted Set | ❌ | Get sorted set range |
| `redis_info` | Server | ❌ | Get server information |

**Note:** Tools marked with ✅ require FULL mode (write operations disabled in READONLY mode).

---

## String Operations

### redis_get

**Description:** Retrieve a value from Redis by its key.

**Parameters:**
```typescript
{
  key: string  // The Redis key to retrieve
}
```

**Returns:**
```json
{
  "key": "user:123",
  "value": "John Doe",
  "exists": true
}
```

**Example:**
```typescript
await redis_get({ key: "user:123" });
```

---

### redis_set

**Description:** Set a key-value pair in Redis with optional TTL (time to live).

**Requires:** FULL mode (write operation)

**Parameters:**
```typescript
{
  key: string     // The Redis key
  value: string   // The value to store
  ttl?: number    // Optional TTL in seconds
}
```

**Returns:**
```json
{
  "key": "session:abc",
  "value": "data",
  "ttl": 3600,
  "result": "OK"
}
```

**Examples:**
```typescript
// Set without expiration
await redis_set({ key: "user:name", value: "Alice" });

// Set with 1-hour expiration
await redis_set({ key: "session:token", value: "xyz", ttl: 3600 });
```

---

### redis_mget

**Description:** Get values of multiple keys in a single operation.

**Parameters:**
```typescript
{
  keys: string[]  // Array of Redis keys
}
```

**Returns:**
```json
{
  "keys": ["user:1", "user:2", "user:3"],
  "values": {
    "user:1": "Alice",
    "user:2": "Bob",
    "user:3": null
  }
}
```

**Example:**
```typescript
await redis_mget({ keys: ["user:1", "user:2", "user:3"] });
```

---

### redis_incr

**Description:** Increment the integer value of a key by 1. Creates key if it doesn't exist (starts at 0).

**Requires:** FULL mode (write operation)

**Parameters:**
```typescript
{
  key: string  // The Redis key
}
```

**Returns:**
```json
{
  "key": "page:views",
  "newValue": 101
}
```

**Example:**
```typescript
// Increment page view counter
await redis_incr({ key: "page:views" });
```

---

### redis_decr

**Description:** Decrement the integer value of a key by 1.

**Requires:** FULL mode (write operation)

**Parameters:**
```typescript
{
  key: string  // The Redis key
}
```

**Returns:**
```json
{
  "key": "inventory:stock",
  "newValue": 49
}
```

**Example:**
```typescript
// Decrement inventory
await redis_decr({ key: "product:123:stock" });
```

---

## Key Management

### redis_del

**Description:** Delete one or more keys from Redis.

**Requires:** FULL mode (write operation)

**Parameters:**
```typescript
{
  key: string  // The Redis key to delete
}
```

**Returns:**
```json
{
  "key": "temp:data",
  "deleted": true,
  "deletedCount": 1
}
```

**Example:**
```typescript
await redis_del({ key: "temp:session" });
```

---

### redis_exists

**Description:** Check if one or more keys exist in Redis.

**Parameters:**
```typescript
{
  keys: string[]  // Array of keys to check
}
```

**Returns:**
```json
{
  "keys": ["user:1", "user:2", "user:999"],
  "existsCount": 2,
  "allExist": false
}
```

**Example:**
```typescript
await redis_exists({ keys: ["session:abc", "user:123"] });
```

---

### redis_keys

**Description:** Find all keys matching a pattern using glob-style patterns.

**Parameters:**
```typescript
{
  pattern: string  // Pattern to match (supports * and ?)
}
```

**Returns:**
```json
{
  "pattern": "user:*",
  "keys": ["user:1", "user:2", "user:123"],
  "count": 3
}
```

**Examples:**
```typescript
// Find all user keys
await redis_keys({ pattern: "user:*" });

// Find all session keys
await redis_keys({ pattern: "session:*" });

// Find all keys
await redis_keys({ pattern: "*" });
```

**⚠️ Warning:** Use with caution on large databases. Consider using SCAN in production.

---

### redis_ttl

**Description:** Get the time to live (TTL) for a key in seconds.

**Parameters:**
```typescript
{
  key: string  // The Redis key
}
```

**Returns:**
```json
{
  "key": "session:abc",
  "ttl": 3595,
  "status": "key expires in seconds"
}
```

**Special TTL values:**
- `-2`: Key does not exist
- `-1`: Key exists but has no expiration
- `> 0`: Time in seconds until expiration

**Example:**
```typescript
await redis_ttl({ key: "session:token" });
```

---

### redis_expire

**Description:** Set a timeout on a key. After the timeout, the key will be automatically deleted.

**Requires:** FULL mode (write operation)

**Parameters:**
```typescript
{
  key: string      // The Redis key
  seconds: number  // TTL in seconds
}
```

**Returns:**
```json
{
  "key": "temp:data",
  "seconds": 3600,
  "success": true
}
```

**Example:**
```typescript
// Set 1-hour expiration
await redis_expire({ key: "cache:data", seconds: 3600 });

// Set 24-hour expiration
await redis_expire({ key: "session:abc", seconds: 86400 });
```

---

## Hash Operations

Hashes are maps between string fields and string values. Perfect for representing objects.

### redis_hget

**Description:** Get the value of a specific field in a hash.

**Parameters:**
```typescript
{
  key: string    // The hash key
  field: string  // The field name
}
```

**Returns:**
```json
{
  "key": "user:123",
  "field": "email",
  "value": "user@example.com",
  "exists": true
}
```

**Example:**
```typescript
await redis_hget({ key: "user:123", field: "email" });
```

---

### redis_hgetall

**Description:** Get all fields and values in a hash.

**Parameters:**
```typescript
{
  key: string  // The hash key
}
```

**Returns:**
```json
{
  "key": "user:123",
  "hash": {
    "email": "user@example.com",
    "name": "John Doe",
    "age": "30"
  },
  "fieldCount": 3
}
```

**Example:**
```typescript
await redis_hgetall({ key: "user:123" });
```

---

### redis_hset

**Description:** Set the value of a field in a hash.

**Requires:** FULL mode (write operation)

**Parameters:**
```typescript
{
  key: string      // The hash key
  field: string    // The field name
  value: string    // The value to set
}
```

**Returns:**
```json
{
  "key": "user:123",
  "field": "email",
  "value": "new@example.com",
  "newField": false
}
```

**Example:**
```typescript
// Set user email
await redis_hset({ 
  key: "user:123", 
  field: "email", 
  value: "user@example.com" 
});

// Set user name
await redis_hset({ 
  key: "user:123", 
  field: "name", 
  value: "John Doe" 
});
```

---

### redis_hdel

**Description:** Delete one or more fields from a hash.

**Requires:** FULL mode (write operation)

**Parameters:**
```typescript
{
  key: string      // The hash key
  fields: string[] // Array of field names to delete
}
```

**Returns:**
```json
{
  "key": "user:123",
  "fields": ["temp_field", "old_data"],
  "deletedCount": 2
}
```

**Example:**
```typescript
await redis_hdel({ 
  key: "user:123", 
  fields: ["old_email", "temp_token"] 
});
```

---

## List Operations

Lists are linked lists of string values. Useful for queues, logs, and activity feeds.

### redis_lpush

**Description:** Prepend one or more values to the head (left) of a list.

**Requires:** FULL mode (write operation)

**Parameters:**
```typescript
{
  key: string      // The list key
  values: string[] // Array of values to prepend
}
```

**Returns:**
```json
{
  "key": "logs:recent",
  "values": ["log3", "log2"],
  "newLength": 5
}
```

**Example:**
```typescript
// Add to stack (LIFO - Last In First Out)
await redis_lpush({ 
  key: "stack:recent", 
  values: ["item1", "item2"] 
});
```

---

### redis_rpush

**Description:** Append one or more values to the tail (right) of a list.

**Requires:** FULL mode (write operation)

**Parameters:**
```typescript
{
  key: string      // The list key
  values: string[] // Array of values to append
}
```

**Returns:**
```json
{
  "key": "queue:jobs",
  "values": ["job1", "job2"],
  "newLength": 7
}
```

**Example:**
```typescript
// Add to queue (FIFO - First In First Out)
await redis_rpush({ 
  key: "queue:jobs", 
  values: ["process_email", "send_notification"] 
});
```

---

### redis_lrange

**Description:** Get a range of elements from a list by index.

**Parameters:**
```typescript
{
  key: string    // The list key
  start: number  // Start index (0-based)
  stop: number   // Stop index (-1 for end)
}
```

**Returns:**
```json
{
  "key": "queue:jobs",
  "start": 0,
  "stop": 9,
  "values": ["job1", "job2", "job3"],
  "count": 3
}
```

**Examples:**
```typescript
// Get all elements
await redis_lrange({ key: "logs", start: 0, stop: -1 });

// Get first 10 elements
await redis_lrange({ key: "feed", start: 0, stop: 9 });

// Get last 5 elements
await redis_lrange({ key: "recent", start: -5, stop: -1 });
```

---

## Set Operations

Sets are unordered collections of unique strings. Perfect for tags, categories, and unique items.

### redis_sadd

**Description:** Add one or more members to a set. Duplicates are ignored.

**Requires:** FULL mode (write operation)

**Parameters:**
```typescript
{
  key: string      // The set key
  members: string[] // Array of members to add
}
```

**Returns:**
```json
{
  "key": "tags:post123",
  "members": ["redis", "database", "cache"],
  "addedCount": 3
}
```

**Example:**
```typescript
await redis_sadd({ 
  key: "user:123:permissions", 
  members: ["read", "write", "admin"] 
});
```

---

### redis_smembers

**Description:** Get all members in a set.

**Parameters:**
```typescript
{
  key: string  // The set key
}
```

**Returns:**
```json
{
  "key": "tags:post123",
  "members": ["redis", "database", "cache", "mcp"],
  "count": 4
}
```

**Example:**
```typescript
await redis_smembers({ key: "user:123:roles" });
```

---

### redis_srem

**Description:** Remove one or more members from a set.

**Requires:** FULL mode (write operation)

**Parameters:**
```typescript
{
  key: string      // The set key
  members: string[] // Array of members to remove
}
```

**Returns:**
```json
{
  "key": "tags:post123",
  "members": ["old_tag"],
  "removedCount": 1
}
```

**Example:**
```typescript
await redis_srem({ 
  key: "user:123:permissions", 
  members: ["admin"] 
});
```

---

## Sorted Set Operations

Sorted sets are sets where each member has an associated score for sorting. Great for leaderboards, rankings, and priority queues.

### redis_zadd

**Description:** Add one or more members with scores to a sorted set.

**Requires:** FULL mode (write operation)

**Parameters:**
```typescript
{
  key: string    // The sorted set key
  members: Array<{
    score: number   // Score for sorting
    value: string   // Member value
  }>
}
```

**Returns:**
```json
{
  "key": "leaderboard:game1",
  "members": [
    { "score": 1000, "value": "player1" },
    { "score": 850, "value": "player2" }
  ],
  "addedCount": 2
}
```

**Examples:**
```typescript
// Add players to leaderboard
await redis_zadd({ 
  key: "leaderboard:game1",
  members: [
    { score: 1000, value: "player1" },
    { score: 850, value: "player2" },
    { score: 750, value: "player3" }
  ]
});

// Add tasks with priorities
await redis_zadd({ 
  key: "tasks:priority",
  members: [
    { score: 1, value: "urgent_task" },
    { score: 5, value: "normal_task" },
    { score: 10, value: "low_priority" }
  ]
});
```

---

### redis_zrange

**Description:** Get a range of members from a sorted set, ordered by score (low to high).

**Parameters:**
```typescript
{
  key: string          // The sorted set key
  start: number        // Start index (0-based)
  stop: number         // Stop index (-1 for end)
  withScores?: boolean // Include scores in response
}
```

**Returns (without scores):**
```json
{
  "key": "leaderboard",
  "start": 0,
  "stop": 2,
  "result": ["player3", "player2", "player1"],
  "count": 3
}
```

**Returns (with scores):**
```json
{
  "key": "leaderboard",
  "start": 0,
  "stop": 2,
  "result": [
    { "value": "player3", "score": 750 },
    { "value": "player2", "score": 850 },
    { "value": "player1", "score": 1000 }
  ],
  "count": 3
}
```

**Examples:**
```typescript
// Get top 10 players
await redis_zrange({ 
  key: "leaderboard:game1", 
  start: 0, 
  stop: 9 
});

// Get top 10 with scores
await redis_zrange({ 
  key: "leaderboard:game1", 
  start: 0, 
  stop: 9, 
  withScores: true 
});

// Get all members
await redis_zrange({ 
  key: "rankings", 
  start: 0, 
  stop: -1, 
  withScores: true 
});
```

---

## Server Information

### redis_info

**Description:** Get Redis server information and statistics.

**Parameters:**
```typescript
{
  section?: string  // Optional section name
}
```

**Available sections:**
- `server` - General server information
- `clients` - Client connections
- `memory` - Memory usage
- `persistence` - RDB and AOF information
- `stats` - General statistics
- `replication` - Master/replica information
- `cpu` - CPU usage
- `keyspace` - Database keys statistics

**Returns:**
```json
{
  "section": "server",
  "info": {
    "redis_version": "7.0.0",
    "os": "Linux 5.10.0",
    "uptime_in_seconds": "3600",
    "tcp_port": "6379"
  }
}
```

**Examples:**
```typescript
// Get all information
await redis_info({});

// Get server information
await redis_info({ section: "server" });

// Get memory usage
await redis_info({ section: "memory" });

// Get database statistics
await redis_info({ section: "keyspace" });
```

---

## Common Use Cases

### 1. Session Storage
```typescript
// Create session with 1-hour expiration
await redis_set({ 
  key: "session:abc123", 
  value: JSON.stringify({ userId: 123, role: "admin" }), 
  ttl: 3600 
});

// Check if session exists
await redis_exists({ keys: ["session:abc123"] });

// Get session data
await redis_get({ key: "session:abc123" });

// Extend session
await redis_expire({ key: "session:abc123", seconds: 3600 });
```

### 2. Rate Limiting
```typescript
// Increment request count
await redis_incr({ key: "rate:user:123:minute" });

// Set expiration (1 minute)
await redis_expire({ key: "rate:user:123:minute", seconds: 60 });

// Check count
const result = await redis_get({ key: "rate:user:123:minute" });
```

### 3. Caching
```typescript
// Cache user data for 5 minutes
await redis_set({ 
  key: "cache:user:123", 
  value: JSON.stringify(userData), 
  ttl: 300 
});

// Get cached data
await redis_get({ key: "cache:user:123" });

// Invalidate cache
await redis_del({ key: "cache:user:123" });
```

### 4. Real-time Leaderboard
```typescript
// Add player scores
await redis_zadd({ 
  key: "leaderboard:weekly",
  members: [
    { score: 1500, value: "player1" },
    { score: 1200, value: "player2" }
  ]
});

// Get top 10
await redis_zrange({ 
  key: "leaderboard:weekly", 
  start: 0, 
  stop: 9, 
  withScores: true 
});
```

### 5. Job Queue
```typescript
// Add jobs to queue
await redis_rpush({ 
  key: "queue:email", 
  values: [
    JSON.stringify({ to: "user@example.com", subject: "Welcome" })
  ]
});

// Get pending jobs
await redis_lrange({ key: "queue:email", start: 0, stop: 9 });
```

---

## Error Handling

All tools return errors in a consistent format:

```json
{
  "content": [{
    "type": "text",
    "text": "Error: Redis client not initialized"
  }],
  "isError": true
}
```

Common errors:
- `Redis client not initialized` - Connection not established
- `Write operations are not allowed in READONLY mode` - Attempted write in readonly mode
- `WRONGTYPE` - Operation against wrong data type
- `NOAUTH` - Authentication required

---

## Performance Tips

1. **Use MGET instead of multiple GET calls** - More efficient for retrieving multiple keys
2. **Avoid KEYS in production** - Use SCAN instead for large datasets
3. **Use pipelining** - Batch multiple commands together
4. **Set appropriate TTLs** - Prevent memory bloat
5. **Use hashes for objects** - More memory efficient than JSON strings
6. **Choose the right data structure** - Each type is optimized for specific use cases

---

## Related Documentation

- [Main README](./README.md) - Installation and configuration
- [EXAMPLES.md](./EXAMPLES.md) - Real-world configuration examples
- [Redis Commands Documentation](https://redis.io/commands/)

