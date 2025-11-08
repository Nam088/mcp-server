/**
 * Redis plugin configuration
 */
export interface RedisPluginConfig {
  /**
   * Redis connection URL (e.g., redis://localhost:6379 or rediss://:password@host:6380/0)
   * If provided, this takes precedence over individual host/port/password/db settings
   */
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  /**
   * Connection timeout in milliseconds
   * @default 5000
   */
  connectionTimeout?: number;
  /**
   * Command timeout in milliseconds (max time for a command to execute)
   * @default 5000
   */
  commandTimeout?: number;
  /**
   * Enable TLS/SSL connection
   * @default false
   */
  tls?: boolean;
  /**
   * Reject unauthorized TLS certificates (set false for self-signed certs)
   * Only applies when tls is enabled
   * @default true
   */
  rejectUnauthorized?: boolean;
  /**
   * Enable lazy connection (connect only when first command is executed)
   * @default false
   */
  lazyConnect?: boolean;
  /**
   * Maximum number of retries when connection fails
   * @default 3
   */
  maxRetries?: number;
  /**
   * Enable automatic reconnection on connection loss
   * @default true
   */
  enableAutoPipelining?: boolean;
  /**
   * Keep alive interval in milliseconds
   * @default 30000
   */
  keepAlive?: number;
}

/**
 * Redis tool arguments
 */
export interface RedisGetArgs {
  key: string;
}

export interface RedisSetArgs {
  key: string;
  value: string;
  ttl?: number;
}

export interface RedisDelArgs {
  key: string;
}

export interface RedisKeysArgs {
  pattern: string;
}

export interface RedisInfoArgs {
  section?: string;
}
