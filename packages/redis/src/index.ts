import { z } from 'zod';
import { createClient, type RedisClientType } from 'redis';
import { PluginBase, PluginMode, type PluginConfig, type PluginContext } from '@nam088/mcp-core';
import type { RedisPluginConfig } from './types.js';

/**
 * Redis MCP Plugin
 * Provides tools for interacting with Redis
 */
export class RedisPlugin extends PluginBase {
  readonly metadata: PluginConfig = {
    name: 'redis',
    version: '1.0.0',
    description: 'Redis database tools for MCP',
  };

  private redisConfig: RedisPluginConfig;
  private client: RedisClientType | null = null;

  constructor(config?: Record<string, unknown>) {
    super(config);

    // Support mode from config or environment variable
    const modeFromEnv = process.env.REDIS_MODE;
    if (config?.mode && typeof config.mode === 'string' && config.mode in PluginMode) {
      this.metadata.mode = config.mode as PluginMode;
    } else if (modeFromEnv && modeFromEnv in PluginMode) {
      this.metadata.mode = modeFromEnv as PluginMode;
    } else {
      this.metadata.mode = PluginMode.READONLY;
    }

    // Support connection string (URL) - takes precedence over individual settings
    const url =
      (config?.url as string) || (config?.connectionString as string) || process.env.REDIS_URL;

    // Support environment variables with config override
    const password = (config?.password as string) || process.env.REDIS_PASSWORD;
    const tls =
      config?.tls !== undefined ? (config.tls as boolean) : process.env.REDIS_TLS === 'true';
    const rejectUnauthorized =
      config?.rejectUnauthorized !== undefined
        ? (config.rejectUnauthorized as boolean)
        : process.env.REDIS_REJECT_UNAUTHORIZED !== 'false'; // Default true for security

    this.redisConfig = {
      ...(url && { url }),
      host: (config?.host as string) || process.env.REDIS_HOST || 'localhost',
      port: (config?.port as number) || parseInt(process.env.REDIS_PORT || '6379'),
      ...(password && { password }),
      db: (config?.db as number) || parseInt(process.env.REDIS_DB || '0'),
      connectionTimeout:
        (config?.connectionTimeout as number) || parseInt(process.env.REDIS_TIMEOUT || '5000'),
      commandTimeout: (config?.commandTimeout as number) || 5000,
      tls,
      rejectUnauthorized,
      lazyConnect: (config?.lazyConnect as boolean) || false,
      maxRetries: (config?.maxRetries as number) || 3,
      enableAutoPipelining: (config?.enableAutoPipelining as boolean) !== false, // Default true
      keepAlive: (config?.keepAlive as number) || 30000,
    };
  }

  /**
   * Initialize Redis connection
   */
  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);

    try {
      // If connection URL is provided, use it directly
      if (this.redisConfig.url) {
        const clientConfig: {
          url: string;
          socket?: {
            connectTimeout?: number;
            keepAlive?: number;
            reconnectStrategy?: (retries: number) => number | Error;
            tls?: boolean;
            rejectUnauthorized?: boolean;
          };
          commandsQueueMaxLength?: number;
        } = {
          url: this.redisConfig.url,
          commandsQueueMaxLength: 10000,
        };

        // Add socket options if specified
        const socketConfig: {
          connectTimeout?: number;
          keepAlive?: number;
          reconnectStrategy?: (retries: number) => number | Error;
          tls?: boolean;
          rejectUnauthorized?: boolean;
        } = {};

        if (this.redisConfig.connectionTimeout) {
          socketConfig.connectTimeout = this.redisConfig.connectionTimeout;
        }

        if (this.redisConfig.keepAlive) {
          socketConfig.keepAlive = this.redisConfig.keepAlive;
        }

        // Add retry strategy
        const maxRetries = this.redisConfig.maxRetries || 3;
        socketConfig.reconnectStrategy = (retries: number): number | Error => {
          if (retries > maxRetries) {
            console.error(`[ERROR] [Redis] Max retries (${maxRetries}) exceeded`);
            return new Error('Max retries exceeded');
          }
          const delay = Math.min(retries * 100, 3000); // Max 3s delay
          return delay;
        };

        // Add TLS configuration if URL doesn't already specify it
        // (rediss:// means TLS, redis:// means no TLS)
        if (this.redisConfig.tls && !this.redisConfig.url.startsWith('rediss://')) {
          socketConfig.tls = true;
          if (this.redisConfig.rejectUnauthorized !== undefined) {
            socketConfig.rejectUnauthorized = this.redisConfig.rejectUnauthorized;
          }
        } else if (
          this.redisConfig.url.startsWith('rediss://') &&
          this.redisConfig.rejectUnauthorized !== undefined
        ) {
          socketConfig.tls = true;
          socketConfig.rejectUnauthorized = this.redisConfig.rejectUnauthorized;
        }

        if (Object.keys(socketConfig).length > 0) {
          clientConfig.socket = socketConfig;
        }

        this.client = createClient(clientConfig);
      } else {
        // Use individual config settings (existing behavior)
        const socketConfig: {
          host: string;
          port: number;
          connectTimeout?: number;
          tls?: boolean;
          rejectUnauthorized?: boolean;
          keepAlive?: number;
          reconnectStrategy?: (retries: number) => number | Error;
        } = {
          host: this.redisConfig.host || 'localhost',
          port: this.redisConfig.port || 6379,
        };

        if (this.redisConfig.connectionTimeout) {
          socketConfig.connectTimeout = this.redisConfig.connectionTimeout;
        }

        if (this.redisConfig.keepAlive) {
          socketConfig.keepAlive = this.redisConfig.keepAlive;
        }

        // Add retry strategy
        const maxRetries = this.redisConfig.maxRetries || 3;
        socketConfig.reconnectStrategy = (retries: number): number | Error => {
          if (retries > maxRetries) {
            console.error(`[ERROR] [Redis] Max retries (${maxRetries}) exceeded`);
            return new Error('Max retries exceeded');
          }
          const delay = Math.min(retries * 100, 3000); // Max 3s delay
          return delay;
        };

        // Add TLS configuration
        if (this.redisConfig.tls) {
          socketConfig.tls = true;
          if (this.redisConfig.rejectUnauthorized !== undefined) {
            socketConfig.rejectUnauthorized = this.redisConfig.rejectUnauthorized;
          }
        }

        const clientConfig: {
          socket: typeof socketConfig;
          password?: string;
          database?: number;
          commandsQueueMaxLength?: number;
        } = {
          socket: socketConfig,
          commandsQueueMaxLength: 10000, // Prevent memory issues
        };

        if (this.redisConfig.password) {
          clientConfig.password = this.redisConfig.password;
        }
        if (this.redisConfig.db !== undefined) {
          clientConfig.database = this.redisConfig.db;
        }

        this.client = createClient(clientConfig);
      }

      // Add event listeners
      this.client.on('error', (err) => {
        console.error('[ERROR] [Redis] Client Error:', err);
      });

      // Connect based on lazyConnect option
      if (!this.redisConfig.lazyConnect) {
        await this.client.connect();
      }
    } catch (error) {
      console.error('[ERROR] [Redis] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Register Redis tools
   */
  register(context: PluginContext): void {
    // Tool: redis_get (readonly operation)
    this.registerTool({
      context,
      name: 'redis_get',
      schema: {
        description: 'Get value from Redis by key',
        inputSchema: {
          key: z.string().describe('Redis key to retrieve'),
        },
      },
      handler: async ({ key }: { key: string }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const value = await this.client.get(key);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, value, exists: value !== null }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    });

    // Tool: redis_set (write operation)
    this.registerTool({
      context,
      name: 'redis_set',
      schema: {
        description: 'Set value in Redis (requires FULL mode)',
        inputSchema: {
          key: z.string().describe('Redis key'),
          value: z.string().describe('Value to set'),
          ttl: z.number().optional().describe('TTL in seconds (optional)'),
        },
      },
      handler: async ({ key, value, ttl }: { key: string; value: string; ttl?: number }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          let result: string | null;
          if (ttl) {
            result = await this.client.setEx(key, ttl, value);
          } else {
            result = await this.client.set(key, value);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, value, ttl: ttl || null, result }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
      isWriteTool: true,
    });

    // Tool: redis_del (write operation)
    this.registerTool({
      context,
      name: 'redis_del',
      schema: {
        description: 'Delete key from Redis (requires FULL mode)',
        inputSchema: {
          key: z.string().describe('Redis key to delete'),
        },
      },
      handler: async ({ key }: { key: string }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const deletedCount = await this.client.del(key);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, deleted: deletedCount > 0, deletedCount }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
      isWriteTool: true,
    });

    // Tool: redis_keys
    this.registerTool({
      context,
      name: 'redis_keys',
      schema: {
        description: 'Find keys matching a pattern',
        inputSchema: {
          pattern: z.string().describe('Pattern to match (e.g., "user:*")'),
        },
      },
      handler: async ({ pattern }: { pattern: string }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const keys = await this.client.keys(pattern);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ pattern, keys, count: keys.length }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    });

    // Tool: redis_info
    this.registerTool({
      context,
      name: 'redis_info',
      schema: {
        description: 'Get Redis server information',
        inputSchema: {
          section: z
            .string()
            .optional()
            .describe('Info section (server, clients, memory, stats, etc.)'),
        },
      },
      handler: async ({ section }: { section?: string }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const infoStr = section ? await this.client.info(section) : await this.client.info();

          // Parse INFO output into structured format
          const info: Record<string, string> = {};
          const lines = infoStr.split('\r\n');
          for (const line of lines) {
            if (line && !line.startsWith('#')) {
              const [key, value] = line.split(':');
              if (key && value) {
                info[key] = value;
              }
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ section: section || 'default', info }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    });

    // Tool: redis_exists
    this.registerTool({
      context,
      name: 'redis_exists',
      schema: {
        description: 'Check if one or more keys exist',
        inputSchema: {
          keys: z.array(z.string()).describe('Array of keys to check'),
        },
      },
      handler: async ({ keys }: { keys: string[] }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const exists = await this.client.exists(keys);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { keys, existsCount: exists, allExist: exists === keys.length },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    });

    // Tool: redis_ttl
    this.registerTool({
      context,
      name: 'redis_ttl',
      schema: {
        description: 'Get the time to live for a key',
        inputSchema: {
          key: z.string().describe('Redis key'),
        },
      },
      handler: async ({ key }: { key: string }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const ttl = await this.client.ttl(key);
          let status: string;

          if (ttl === -2) {
            status = 'key does not exist';
          } else if (ttl === -1) {
            status = 'key has no expiration';
          } else {
            status = 'key expires in seconds';
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, ttl, status }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    });

    // Tool: redis_expire
    this.registerTool({
      context,
      name: 'redis_expire',
      schema: {
        description: 'Set a timeout on a key (requires FULL mode)',
        inputSchema: {
          key: z.string().describe('Redis key'),
          seconds: z.number().describe('TTL in seconds'),
        },
      },
      handler: async ({ key, seconds }: { key: string; seconds: number }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const result = await this.client.expire(key, seconds);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, seconds, success: result }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
      isWriteTool: true,
    });

    // Tool: redis_incr
    this.registerTool({
      context,
      name: 'redis_incr',
      schema: {
        description: 'Increment the integer value of a key by 1 (requires FULL mode)',
        inputSchema: {
          key: z.string().describe('Redis key'),
        },
      },
      handler: async ({ key }: { key: string }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const newValue = await this.client.incr(key);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, newValue }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
      isWriteTool: true,
    });

    // Tool: redis_decr
    this.registerTool({
      context,
      name: 'redis_decr',
      schema: {
        description: 'Decrement the integer value of a key by 1 (requires FULL mode)',
        inputSchema: {
          key: z.string().describe('Redis key'),
        },
      },
      handler: async ({ key }: { key: string }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const newValue = await this.client.decr(key);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, newValue }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
      isWriteTool: true,
    });

    // Tool: redis_mget
    this.registerTool({
      context,
      name: 'redis_mget',
      schema: {
        description: 'Get values of multiple keys',
        inputSchema: {
          keys: z.array(z.string()).describe('Array of Redis keys'),
        },
      },
      handler: async ({ keys }: { keys: string[] }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const values = await this.client.mGet(keys);
          const result: Record<string, string | null> = {};

          keys.forEach((key: string, index: number) => {
            result[key] = values[index];
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ keys, values: result }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    });

    // Tool: redis_hget
    this.registerTool({
      context,
      name: 'redis_hget',
      schema: {
        description: 'Get the value of a hash field',
        inputSchema: {
          key: z.string().describe('Redis hash key'),
          field: z.string().describe('Hash field name'),
        },
      },
      handler: async ({ key, field }: { key: string; field: string }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const value = await this.client.hGet(key, field);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, field, value, exists: value !== null }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    });

    // Tool: redis_hgetall
    this.registerTool({
      context,
      name: 'redis_hgetall',
      schema: {
        description: 'Get all fields and values in a hash',
        inputSchema: {
          key: z.string().describe('Redis hash key'),
        },
      },
      handler: async ({ key }: { key: string }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const hash = await this.client.hGetAll(key);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, hash, fieldCount: Object.keys(hash).length }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    });

    // Tool: redis_hset
    this.registerTool({
      context,
      name: 'redis_hset',
      schema: {
        description: 'Set the value of a hash field (requires FULL mode)',
        inputSchema: {
          key: z.string().describe('Redis hash key'),
          field: z.string().describe('Hash field name'),
          value: z.string().describe('Value to set'),
        },
      },
      handler: async ({ key, field, value }: { key: string; field: string; value: string }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const result = await this.client.hSet(key, field, value);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, field, value, newField: result === 1 }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
      isWriteTool: true,
    });

    // Tool: redis_hdel
    this.registerTool({
      context,
      name: 'redis_hdel',
      schema: {
        description: 'Delete one or more hash fields (requires FULL mode)',
        inputSchema: {
          key: z.string().describe('Redis hash key'),
          fields: z.array(z.string()).describe('Array of field names to delete'),
        },
      },
      handler: async ({ key, fields }: { key: string; fields: string[] }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const deletedCount = await this.client.hDel(key, fields);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, fields, deletedCount }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
      isWriteTool: true,
    });

    // Tool: redis_lpush
    this.registerTool({
      context,
      name: 'redis_lpush',
      schema: {
        description: 'Prepend one or more values to a list (requires FULL mode)',
        inputSchema: {
          key: z.string().describe('Redis list key'),
          values: z.array(z.string()).describe('Array of values to prepend'),
        },
      },
      handler: async ({ key, values }: { key: string; values: string[] }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const newLength = await this.client.lPush(key, values);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, values, newLength }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
      isWriteTool: true,
    });

    // Tool: redis_rpush
    this.registerTool({
      context,
      name: 'redis_rpush',
      schema: {
        description: 'Append one or more values to a list (requires FULL mode)',
        inputSchema: {
          key: z.string().describe('Redis list key'),
          values: z.array(z.string()).describe('Array of values to append'),
        },
      },
      handler: async ({ key, values }: { key: string; values: string[] }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const newLength = await this.client.rPush(key, values);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, values, newLength }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
      isWriteTool: true,
    });

    // Tool: redis_lrange
    this.registerTool({
      context,
      name: 'redis_lrange',
      schema: {
        description: 'Get a range of elements from a list',
        inputSchema: {
          key: z.string().describe('Redis list key'),
          start: z.number().describe('Start index (0-based)'),
          stop: z.number().describe('Stop index (-1 for end of list)'),
        },
      },
      handler: async ({ key, start, stop }: { key: string; start: number; stop: number }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const values = await this.client.lRange(key, start, stop);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, start, stop, values, count: values.length }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    });

    // Tool: redis_sadd
    this.registerTool({
      context,
      name: 'redis_sadd',
      schema: {
        description: 'Add one or more members to a set (requires FULL mode)',
        inputSchema: {
          key: z.string().describe('Redis set key'),
          members: z.array(z.string()).describe('Array of members to add'),
        },
      },
      handler: async ({ key, members }: { key: string; members: string[] }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const addedCount = await this.client.sAdd(key, members);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, members, addedCount }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
      isWriteTool: true,
    });

    // Tool: redis_smembers
    this.registerTool({
      context,
      name: 'redis_smembers',
      schema: {
        description: 'Get all members in a set',
        inputSchema: {
          key: z.string().describe('Redis set key'),
        },
      },
      handler: async ({ key }: { key: string }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const members = await this.client.sMembers(key);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, members, count: members.length }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    });

    // Tool: redis_srem
    this.registerTool({
      context,
      name: 'redis_srem',
      schema: {
        description: 'Remove one or more members from a set (requires FULL mode)',
        inputSchema: {
          key: z.string().describe('Redis set key'),
          members: z.array(z.string()).describe('Array of members to remove'),
        },
      },
      handler: async ({ key, members }: { key: string; members: string[] }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const removedCount = await this.client.sRem(key, members);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, members, removedCount }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
      isWriteTool: true,
    });

    // Tool: redis_zadd
    this.registerTool({
      context,
      name: 'redis_zadd',
      schema: {
        description: 'Add one or more members to a sorted set (requires FULL mode)',
        inputSchema: {
          key: z.string().describe('Redis sorted set key'),
          members: z
            .array(
              z.object({
                score: z.number().describe('Score for sorting'),
                value: z.string().describe('Member value'),
              }),
            )
            .describe('Array of members with scores'),
        },
      },
      handler: async ({
        key,
        members,
      }: {
        key: string;
        members: Array<{ score: number; value: string }>;
      }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const addedCount = await this.client.zAdd(key, members);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, members, addedCount }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
      isWriteTool: true,
    });

    // Tool: redis_zrange
    this.registerTool({
      context,
      name: 'redis_zrange',
      schema: {
        description: 'Get a range of members from a sorted set by index',
        inputSchema: {
          key: z.string().describe('Redis sorted set key'),
          start: z.number().describe('Start index'),
          stop: z.number().describe('Stop index'),
          withScores: z.boolean().optional().describe('Include scores in response'),
        },
      },
      handler: async ({
        key,
        start,
        stop,
        withScores,
      }: {
        key: string;
        start: number;
        stop: number;
        withScores?: boolean;
      }) => {
        try {
          if (!this.client) {
            throw new Error('Redis client not initialized');
          }

          const result = withScores
            ? await this.client.zRangeWithScores(key, start, stop)
            : await this.client.zRange(key, start, stop);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { key, start, stop, result, count: Array.isArray(result) ? result.length : 0 },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    });
  }

  /**
   * Cleanup Redis connection
   */
  async cleanup(): Promise<void> {
    await super.cleanup();
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
