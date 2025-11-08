# Redis Plugin - Configuration Examples

## Table of Contents

1. [Basic Connection](#basic-connection)
2. [With Password](#with-password)
3. [Production with TLS](#production-with-tls)
4. [Development with Self-Signed Certificate](#development-with-self-signed-certificate)
5. [AWS ElastiCache](#aws-elasticache)
6. [Redis Cloud](#redis-cloud)
7. [Azure Cache for Redis](#azure-cache-for-redis)

---

## Basic Connection

**TypeScript:**
```typescript
await registry.registerPlugin(RedisPlugin, {
  host: 'localhost',
  port: 6379,
});
```

**JSON Config:**
```json
{
  "mcpServers": {
    "redis-local": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379"
      }
    }
  }
}
```

---

## With Password

**TypeScript:**
```typescript
await registry.registerPlugin(RedisPlugin, {
  host: 'localhost',
  port: 6379,
  password: 'your-secure-password',
  db: 1,
});
```

**JSON Config:**
```json
{
  "mcpServers": {
    "redis-auth": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379",
        "REDIS_PASSWORD": "your-secure-password",
        "REDIS_DB": "1"
      }
    }
  }
}
```

---

## Production with TLS

**TypeScript:**
```typescript
await registry.registerPlugin(RedisPlugin, {
  host: 'production-redis.example.com',
  port: 6380,
  password: 'prod-secret-password',
  tls: true,
  rejectUnauthorized: true, // Verify SSL certificates (recommended)
});
```

**JSON Config:**
```json
{
  "mcpServers": {
    "redis-production": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "REDIS_HOST": "production-redis.example.com",
        "REDIS_PORT": "6380",
        "REDIS_PASSWORD": "prod-secret-password",
        "REDIS_TLS": "true",
        "REDIS_REJECT_UNAUTHORIZED": "true"
      }
    }
  }
}
```

---

## Development with Self-Signed Certificate

When using self-signed certificates in development/testing:

**TypeScript:**
```typescript
await registry.registerPlugin(RedisPlugin, {
  host: 'dev-redis.local',
  port: 6380,
  password: 'dev-password',
  tls: true,
  rejectUnauthorized: false, // Allow self-signed certificates
});
```

**JSON Config:**
```json
{
  "mcpServers": {
    "redis-dev": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "REDIS_HOST": "dev-redis.local",
        "REDIS_PORT": "6380",
        "REDIS_PASSWORD": "dev-password",
        "REDIS_TLS": "true",
        "REDIS_REJECT_UNAUTHORIZED": "false"
      }
    }
  }
}
```

⚠️ **Security Warning:** Only use `rejectUnauthorized: false` in development. Always verify certificates in production!

---

## AWS ElastiCache

### Without TLS (In-Transit Encryption Disabled)

**JSON Config:**
```json
{
  "mcpServers": {
    "elasticache": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "REDIS_HOST": "my-cluster.abc123.0001.usw2.cache.amazonaws.com",
        "REDIS_PORT": "6379"
      }
    }
  }
}
```

### With TLS (In-Transit Encryption Enabled)

**JSON Config:**
```json
{
  "mcpServers": {
    "elasticache-tls": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "REDIS_HOST": "my-cluster.abc123.0001.usw2.cache.amazonaws.com",
        "REDIS_PORT": "6380",
        "REDIS_TLS": "true",
        "REDIS_REJECT_UNAUTHORIZED": "true"
      }
    }
  }
}
```

---

## Redis Cloud

Redis Cloud (Redis Labs) typically uses TLS on port 6380:

**JSON Config:**
```json
{
  "mcpServers": {
    "redis-cloud": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "REDIS_HOST": "redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com",
        "REDIS_PORT": "12345",
        "REDIS_PASSWORD": "your-redis-cloud-password",
        "REDIS_TLS": "true",
        "REDIS_REJECT_UNAUTHORIZED": "true"
      }
    }
  }
}
```

**TypeScript:**
```typescript
await registry.registerPlugin(RedisPlugin, {
  host: 'redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com',
  port: 12345,
  password: 'your-redis-cloud-password',
  tls: true,
  rejectUnauthorized: true,
});
```

---

## Azure Cache for Redis

### Standard Tier (Non-SSL port)

**JSON Config:**
```json
{
  "mcpServers": {
    "azure-redis": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "REDIS_HOST": "myredis.redis.cache.windows.net",
        "REDIS_PORT": "6379",
        "REDIS_PASSWORD": "your-azure-redis-key"
      }
    }
  }
}
```

### Premium Tier with TLS (SSL port)

**JSON Config:**
```json
{
  "mcpServers": {
    "azure-redis-tls": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "REDIS_HOST": "myredis.redis.cache.windows.net",
        "REDIS_PORT": "6380",
        "REDIS_PASSWORD": "your-azure-redis-key",
        "REDIS_TLS": "true",
        "REDIS_REJECT_UNAUTHORIZED": "true"
      }
    }
  }
}
```

---

## Advanced Configuration Examples

### High Availability Production Setup

For production environments with high reliability requirements:

**TypeScript:**
```typescript
await registry.registerPlugin(RedisPlugin, {
  host: 'production-redis.example.com',
  port: 6380,
  password: process.env.REDIS_PASSWORD,
  tls: true,
  rejectUnauthorized: true,
  connectionTimeout: 10000,      // 10s connection timeout
  commandTimeout: 5000,           // 5s command timeout
  maxRetries: 5,                  // Retry up to 5 times
  keepAlive: 60000,              // 1-minute keepalive
  enableAutoPipelining: true,    // Optimize batch operations
  mode: 'FULL',
});
```

**JSON Config:**
```json
{
  "mcpServers": {
    "redis-prod": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "REDIS_HOST": "production-redis.example.com",
        "REDIS_PORT": "6380",
        "REDIS_PASSWORD": "your-password",
        "REDIS_TLS": "true",
        "REDIS_REJECT_UNAUTHORIZED": "true"
      }
    }
  }
}
```

### Lazy Connection (On-Demand)

Connect only when the first command is executed (useful for lambda/serverless):

**TypeScript:**
```typescript
await registry.registerPlugin(RedisPlugin, {
  host: 'redis.example.com',
  port: 6379,
  lazyConnect: true,  // Don't connect until first command
  connectionTimeout: 3000,
  maxRetries: 2,
});
```

### Development with Fast Fail

For development, fail fast without retries:

**TypeScript:**
```typescript
await registry.registerPlugin(RedisPlugin, {
  host: 'localhost',
  port: 6379,
  connectionTimeout: 2000,  // Short timeout
  maxRetries: 0,            // No retries
  mode: 'FULL',
});
```

### Unstable Network Environment

For environments with intermittent connectivity:

**TypeScript:**
```typescript
await registry.registerPlugin(RedisPlugin, {
  host: 'remote-redis.example.com',
  port: 6379,
  connectionTimeout: 15000,     // Long timeout
  commandTimeout: 10000,        // Long command timeout
  maxRetries: 10,               // Many retries
  keepAlive: 30000,            // Frequent keepalive
  enableAutoPipelining: false, // Disable pipelining for reliability
});
```

---

## Testing Your Connection

After configuring, you can test your connection by:

1. **Start your MCP server**
2. **Use the `redis_info` tool** to verify connection:

```typescript
// The plugin will attempt to connect on initialization
// Check logs for: "[Redis Plugin] Successfully connected to Redis"

// Or use redis_info to get server information
const result = await redis_info({ section: 'server' });
```

**Expected log output:**

```
[Redis Plugin] Connecting to redis://localhost:6379
[Redis Plugin] Successfully connected to Redis
```

Or with TLS:

```
[Redis Plugin] Connecting to rediss://production-redis.example.com:6380
[Redis Plugin] TLS enabled (rejectUnauthorized: true)
[Redis Plugin] Successfully connected to Redis
```

---

## Troubleshooting

### Connection Timeout

If you're experiencing connection timeouts, increase the timeout:

```typescript
await registry.registerPlugin(RedisPlugin, {
  host: 'slow-redis.example.com',
  port: 6379,
  connectionTimeout: 10000, // 10 seconds
});
```

Or via environment variable:

```json
{
  "env": {
    "REDIS_TIMEOUT": "10000"
  }
}
```

### TLS Certificate Errors

If you see errors like `DEPTH_ZERO_SELF_SIGNED_CERT`:

- For **development**: Set `rejectUnauthorized: false`
- For **production**: Ensure your certificates are properly signed

### Authentication Errors

If you see `NOAUTH Authentication required`:

- Make sure you're providing the correct password
- Check if your Redis instance requires AUTH

---

## Environment-Specific Configurations

### Development

```json
{
  "mcpServers": {
    "redis-dev": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379"
      }
    }
  }
}
```

### Staging

```json
{
  "mcpServers": {
    "redis-staging": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "REDIS_HOST": "staging-redis.internal",
        "REDIS_PORT": "6380",
        "REDIS_PASSWORD": "${STAGING_REDIS_PASSWORD}",
        "REDIS_TLS": "true"
      }
    }
  }
}
```

### Production

```json
{
  "mcpServers": {
    "redis-production": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "REDIS_HOST": "prod-redis.internal",
        "REDIS_PORT": "6380",
        "REDIS_PASSWORD": "${PRODUCTION_REDIS_PASSWORD}",
        "REDIS_TLS": "true",
        "REDIS_REJECT_UNAUTHORIZED": "true",
        "REDIS_TIMEOUT": "10000"
      }
    }
  }
}
```

---

## Security Best Practices

1. ✅ **Always use TLS in production**
2. ✅ **Keep `rejectUnauthorized: true` in production**
3. ✅ **Use strong passwords**
4. ✅ **Use environment variables for sensitive data**
5. ✅ **Limit Redis access by IP/VPC**
6. ✅ **Use separate Redis instances per environment**
7. ⚠️ **Never commit passwords to version control**
8. ⚠️ **Don't use `rejectUnauthorized: false` in production**

---

## More Information

- [Redis TLS Documentation](https://redis.io/docs/manual/security/encryption/)
- [Node Redis Client Options](https://github.com/redis/node-redis/blob/master/docs/client-configuration.md)
- [AWS ElastiCache TLS](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/in-transit-encryption.html)

