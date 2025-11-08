# @nam088/mcp-plugin-redis

Redis plugin for MCP (Model Context Protocol) server.

## Features

- **Redis GET**: Retrieve values by key
- **Redis SET**: Set values with optional TTL
- **Redis DEL**: Delete keys
- **Redis KEYS**: Find keys by pattern
- **Redis INFO**: Get server information

## Installation

```bash
npm install @nam088/mcp-redis
```

This will automatically install all required dependencies including `@nam088/mcp-core`, `@modelcontextprotocol/sdk`, and `redis`.

## Usage

### Quick Start with Environment Variables

The simplest way to use the plugin is with environment variables. Your server code doesn't need to pass any config:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PluginRegistry } from '@nam088/mcp-core';
import { RedisPlugin } from '@nam088/mcp-plugin-redis';

const server = new Server(
  { name: 'redis-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

const registry = new PluginRegistry(server);

// Register plugin - will automatically read from env vars
await registry.registerPlugin(RedisPlugin);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

Then configure via JSON (Claude Desktop) or environment variables:

```json
{
  "mcpServers": {
    "redis": {
      "command": "node",
      "args": ["/path/to/your/server.js"],
      "env": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379",
        "REDIS_PASSWORD": "secret123"
      }
    }
  }
}
```

### Complete Configuration Examples

**Using Connection String (Recommended):**

```json
{
  "mcpServers": {
    "redis": {
      "command": "npx",
      "args": ["-y", "@nam088/mcp-redis"],
      "env": {
        "REDIS_URL": "redis://:your_password@localhost:6379/0",
        "REDIS_MODE": "READONLY"
      }
    }
  }
}
```

**With TLS/SSL in Connection String:**

```json
{
  "mcpServers": {
    "redis": {
      "command": "npx",
      "args": ["-y", "@nam088/mcp-redis"],
      "env": {
        "REDIS_URL": "rediss://:your_password@redis.example.com:6380/0",
        "REDIS_MODE": "READONLY",
        "REDIS_REJECT_UNAUTHORIZED": "true"
      }
    }
  }
}
```

**Using Individual Environment Variables (Alternative):**

```json
{
  "mcpServers": {
    "redis": {
      "command": "npx",
      "args": ["-y", "@nam088/mcp-redis"],
      "env": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379",
        "REDIS_PASSWORD": "your_password",
        "REDIS_DB": "0",
        "REDIS_MODE": "READONLY",
        "REDIS_TIMEOUT": "5000",
        "REDIS_COMMAND_TIMEOUT": "5000",
        "REDIS_MAX_RETRIES": "3"
      }
    }
  }
}
```

### Advanced: Override with Config Object

You can also pass config directly in code (this overrides environment variables):

```typescript
await registry.registerPlugin(RedisPlugin, {
  host: 'localhost',
  port: 6379,
  password: 'your-password', // optional
  db: 0, // optional, default: 0
  connectionTimeout: 5000,
});
```

## Configuration

> 📚 **See [EXAMPLES.md](./EXAMPLES.md)** for real-world configuration examples including AWS ElastiCache, Redis Cloud, Azure Cache, and more!

### 1. Using TypeScript/JavaScript Config

**Basic connection:**

```typescript
await registry.registerPlugin(RedisPlugin, {
  host: 'localhost',
  port: 6379,
  password: 'your-password',
  db: 0,
  connectionTimeout: 5000,
  commandTimeout: 5000,      // Timeout for each command
  maxRetries: 3,             // Retry on connection failure
  lazyConnect: true,         // Connect on first command (recommended)
  keepAlive: 30000,          // TCP keep-alive interval
  enableAutoPipelining: true // Auto-pipeline for better performance
});
```

**With TLS (production):**

```typescript
await registry.registerPlugin(RedisPlugin, {
  host: 'myredis.example.com',
  port: 6380,
  password: 'secret123',
  tls: true,
  rejectUnauthorized: true,  // Verify SSL certificates
  connectionTimeout: 10000,  // Longer timeout for remote server
  commandTimeout: 5000,
  maxRetries: 5,
  lazyConnect: true,
  keepAlive: 60000,          // Longer keep-alive for production
  enableAutoPipelining: true
});
```

**With self-signed certificate (development):**

```typescript
await registry.registerPlugin(RedisPlugin, {
  host: 'localhost',
  port: 6380,
  password: 'dev123',
  tls: true,
  rejectUnauthorized: false, // Allow self-signed certs
  lazyConnect: false,        // Connect immediately to test connection
  commandTimeout: 5000,
  maxRetries: 3
});
```

**Read-only mode (safe mode for AI):**

```typescript
import { PluginMode } from '@mcp-framework/core';

await registry.registerPlugin(RedisPlugin, {
  host: 'localhost',
  port: 6379,
  password: 'your-password',
  mode: PluginMode.READONLY, // Only allow read operations
  // Available modes:
  // - PluginMode.READONLY: Only GET, KEYS, HGETALL, etc. (safe for AI)
  // - PluginMode.FULL: All operations including SET, DEL, etc.
});
```

> 💡 **Tip:** Use `READONLY` mode when connecting AI agents to production Redis to prevent accidental data modifications. Only read operations like `redis_get`, `redis_keys`, `redis_hgetall` will be available.

### 2. Using JSON Config File (MCP Server)

If you're using Claude Desktop or another MCP client with JSON configuration:

**Basic configuration:**

```json
{
  "mcpServers": {
    "redis": {
      "command": "node",
      "args": ["/path/to/your/server.js"],
      "env": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379",
        "REDIS_PASSWORD": "your-password",
        "REDIS_DB": "0",
        "REDIS_TIMEOUT": "5000",
        "REDIS_COMMAND_TIMEOUT": "5000",
        "REDIS_MAX_RETRIES": "3",
        "REDIS_LAZY_CONNECT": "true",
        "REDIS_KEEP_ALIVE": "30000",
        "REDIS_ENABLE_AUTO_PIPELINING": "true"
      }
    }
  }
}
```

**With TLS/SSL** (for production Redis with SSL):

```json
{
  "mcpServers": {
    "redis-secure": {
      "command": "node",
      "args": ["/path/to/your/server.js"],
      "env": {
        "REDIS_HOST": "myredis.example.com",
        "REDIS_PORT": "6380",
        "REDIS_PASSWORD": "secret123",
        "REDIS_TLS": "true",
        "REDIS_REJECT_UNAUTHORIZED": "true",
        "REDIS_TIMEOUT": "10000",
        "REDIS_COMMAND_TIMEOUT": "5000",
        "REDIS_MAX_RETRIES": "5",
        "REDIS_LAZY_CONNECT": "true",
        "REDIS_KEEP_ALIVE": "60000",
        "REDIS_ENABLE_AUTO_PIPELINING": "true"
      }
    }
  }
}
```

**With self-signed certificate** (development/testing):

```json
{
  "mcpServers": {
    "redis-dev": {
      "command": "node",
      "args": ["/path/to/your/server.js"],
      "env": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6380",
        "REDIS_PASSWORD": "dev123",
        "REDIS_TLS": "true",
        "REDIS_REJECT_UNAUTHORIZED": "false",
        "REDIS_LAZY_CONNECT": "false",
        "REDIS_COMMAND_TIMEOUT": "5000",
        "REDIS_MAX_RETRIES": "3"
      }
    }
  }
}
```

**For Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "my-redis-server": {
      "command": "node",
      "args": ["/Users/yourname/mcp-server/dist/index.js"],
      "env": {
        "REDIS_HOST": "myredis.example.com",
        "REDIS_PORT": "6380",
        "REDIS_PASSWORD": "secret123",
        "REDIS_DB": "1",
        "REDIS_TLS": "true",
        "REDIS_MODE": "READONLY",
        "REDIS_TIMEOUT": "10000",
        "REDIS_COMMAND_TIMEOUT": "5000",
        "REDIS_MAX_RETRIES": "5",
        "REDIS_LAZY_CONNECT": "true",
        "REDIS_KEEP_ALIVE": "60000",
        "REDIS_ENABLE_AUTO_PIPELINING": "true"
      }
    }
  }
}
```

> 💡 **Security Tip:** Set `REDIS_MODE` to `READONLY` in Claude Desktop config to restrict AI to only read operations, preventing accidental modifications to production data.

### 3. Using Environment Variables

The plugin automatically reads from environment variables if config is not provided:

**Mode:**
- `REDIS_MODE` - Operation mode: `READONLY` (safe for AI, default) or `FULL` (all operations)

**Connection:**
- `REDIS_HOST` - Redis host (default: `localhost`)
- `REDIS_PORT` - Redis port (default: `6379`)
- `REDIS_PASSWORD` - Redis password (optional)
- `REDIS_DB` - Database number (default: `0`)

**Timeouts & Retries:**
- `REDIS_TIMEOUT` - Connection timeout in ms (default: `5000`)
- `REDIS_COMMAND_TIMEOUT` - Command execution timeout in ms (default: `5000`)
- `REDIS_MAX_RETRIES` - Max connection retry attempts (default: `3`)

**TLS/SSL:**
- `REDIS_TLS` - Enable TLS/SSL (set to `true` to enable)
- `REDIS_REJECT_UNAUTHORIZED` - Verify SSL certificates (default: `true`)

**Performance:**
- `REDIS_LAZY_CONNECT` - Connect on first command (default: `true`)
- `REDIS_KEEP_ALIVE` - TCP keep-alive interval in ms (default: `30000`)
- `REDIS_ENABLE_AUTO_PIPELINING` - Auto-pipeline commands (default: `true`)

```bash
# Read-only mode (safe for AI)
export REDIS_MODE=READONLY
export REDIS_HOST=myredis.example.com
export REDIS_PORT=6380
export REDIS_PASSWORD=secret123

# Full mode with all operations
export REDIS_MODE=FULL
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_DB=1

# With TLS (production)
export REDIS_TLS=true
export REDIS_REJECT_UNAUTHORIZED=true
export REDIS_TIMEOUT=10000
export REDIS_COMMAND_TIMEOUT=5000
export REDIS_MAX_RETRIES=5

# With TLS + self-signed cert (development)
export REDIS_TLS=true
export REDIS_REJECT_UNAUTHORIZED=false
```

### Priority Order

Config values are resolved in this order (highest to lowest priority):

1. **Config object** (passed to `registerPlugin`)
2. **Environment variables** (from JSON config `env` or system env)
3. **Default values**

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'READONLY'` \| `'FULL'` | `'READONLY'` | Operation mode: `READONLY` (read-only, safe for AI) or `FULL` (all operations) |
| `host` | string | `'localhost'` | Redis host |
| `port` | number | `6379` | Redis port |
| `password` | string | `undefined` | Redis password (optional) |
| `db` | number | `0` | Database number |
| `connectionTimeout` | number | `5000` | Connection timeout in ms |
| `commandTimeout` | number | `5000` | Max time for a command to execute (ms) |
| `tls` | boolean | `false` | Enable TLS/SSL connection |
| `rejectUnauthorized` | boolean | `true` | Reject unauthorized TLS certificates (set `false` for self-signed certs) |
| `lazyConnect` | boolean | `false` | Connect only when first command is executed |
| `maxRetries` | number | `3` | Maximum connection retry attempts |
| `enableAutoPipelining` | boolean | `true` | Enable automatic command pipelining for better performance |
| `keepAlive` | number | `30000` | TCP keep-alive interval in ms |

## Tools

The Redis plugin provides **23 tools** covering all major Redis data types and operations:

> 📖 **See [TOOLS.md](./TOOLS.md)** for complete documentation with examples for all 23 tools!

### String Operations

#### redis_get
Get value from Redis by key.
```typescript
{ key: string }
```

#### redis_set
Set value in Redis with optional TTL. *(Requires FULL mode)*
```typescript
{ key: string, value: string, ttl?: number }
```

#### redis_mget
Get values of multiple keys.
```typescript
{ keys: string[] }
```

#### redis_del
Delete key from Redis. *(Requires FULL mode)*
```typescript
{ key: string }
```

#### redis_exists
Check if one or more keys exist.
```typescript
{ keys: string[] }
```

#### redis_incr
Increment the integer value of a key by 1. *(Requires FULL mode)*
```typescript
{ key: string }
```

#### redis_decr
Decrement the integer value of a key by 1. *(Requires FULL mode)*
```typescript
{ key: string }
```

### Key Management

#### redis_keys
Find keys matching a pattern.
```typescript
{ pattern: string } // e.g., "user:*"
```

#### redis_ttl
Get the time to live for a key.
```typescript
{ key: string }
```

#### redis_expire
Set a timeout on a key. *(Requires FULL mode)*
```typescript
{ key: string, seconds: number }
```

### Hash Operations

#### redis_hget
Get the value of a hash field.
```typescript
{ key: string, field: string }
```

#### redis_hgetall
Get all fields and values in a hash.
```typescript
{ key: string }
```

#### redis_hset
Set the value of a hash field. *(Requires FULL mode)*
```typescript
{ key: string, field: string, value: string }
```

#### redis_hdel
Delete one or more hash fields. *(Requires FULL mode)*
```typescript
{ key: string, fields: string[] }
```

### List Operations

#### redis_lpush
Prepend one or more values to a list. *(Requires FULL mode)*
```typescript
{ key: string, values: string[] }
```

#### redis_rpush
Append one or more values to a list. *(Requires FULL mode)*
```typescript
{ key: string, values: string[] }
```

#### redis_lrange
Get a range of elements from a list.
```typescript
{ key: string, start: number, stop: number }
```

### Set Operations

#### redis_sadd
Add one or more members to a set. *(Requires FULL mode)*
```typescript
{ key: string, members: string[] }
```

#### redis_smembers
Get all members in a set.
```typescript
{ key: string }
```

#### redis_srem
Remove one or more members from a set. *(Requires FULL mode)*
```typescript
{ key: string, members: string[] }
```

### Sorted Set Operations

#### redis_zadd
Add one or more members to a sorted set. *(Requires FULL mode)*
```typescript
{
  key: string, 
  members: Array<{ score: number, value: string }> 
}
```

#### redis_zrange
Get a range of members from a sorted set by index.
```typescript
{ key: string, start: number, stop: number, withScores?: boolean }
```

### Server Information

#### redis_info
Get Redis server information.
```typescript
{ section?: string } // e.g., "server", "clients", "memory", "stats"
```

## Usage Examples

### Basic String Operations

```typescript
// Get a value
await redis_get({ key: "user:123" });

// Set a value with 1-hour TTL
await redis_set({ key: "session:abc", value: "data", ttl: 3600 });

// Get multiple values at once
await redis_mget({ keys: ["user:1", "user:2", "user:3"] });

// Check if keys exist
await redis_exists({ keys: ["user:123", "session:abc"] });
```

### Counter Operations

```typescript
// Increment page views
await redis_incr({ key: "page:views" });

// Decrement inventory
await redis_decr({ key: "product:123:stock" });
```

### Hash Operations (Store Objects)

```typescript
// Store user profile
await redis_hset({ key: "user:123", field: "email", value: "user@example.com" });
await redis_hset({ key: "user:123", field: "name", value: "John Doe" });

// Get single field
await redis_hget({ key: "user:123", field: "email" });

// Get entire hash
await redis_hgetall({ key: "user:123" });
// Returns: { email: "user@example.com", name: "John Doe" }
```

### List Operations (Queues/Logs)

```typescript
// Add to queue (right/tail)
await redis_rpush({ key: "queue:jobs", values: ["job1", "job2"] });

// Add to stack (left/head)
await redis_lpush({ key: "stack:recent", values: ["item1", "item2"] });

// Get all items
await redis_lrange({ key: "queue:jobs", start: 0, stop: -1 });

// Get first 10 items
await redis_lrange({ key: "logs:recent", start: 0, stop: 9 });
```

### Set Operations (Unique Collections)

```typescript
// Add tags
await redis_sadd({ key: "post:123:tags", members: ["redis", "database", "cache"] });

// Get all tags
await redis_smembers({ key: "post:123:tags" });

// Remove tags
await redis_srem({ key: "post:123:tags", members: ["cache"] });
```

### Sorted Set Operations (Leaderboards/Rankings)

```typescript
// Add scores to leaderboard
await redis_zadd({ 
  key: "leaderboard:game1",
  members: [
    { score: 1000, value: "player1" },
    { score: 850, value: "player2" },
    { score: 750, value: "player3" }
  ]
});

// Get top 10 players with scores
await redis_zrange({ 
  key: "leaderboard:game1", 
  start: 0, 
  stop: 9, 
  withScores: true 
});
```

### Key Expiration

```typescript
// Set TTL on existing key (1 hour)
await redis_expire({ key: "session:abc", seconds: 3600 });

// Check remaining TTL
await redis_ttl({ key: "session:abc" });
// Returns: { ttl: 3595, status: "key expires in seconds" }
```

### Pattern Search

```typescript
// Find all user keys
await redis_keys({ pattern: "user:*" });

// Find all session keys
await redis_keys({ pattern: "session:*" });
```

## License

MIT

