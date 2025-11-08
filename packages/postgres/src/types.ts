import type {
  PoolConfig,
  QueryResult,
  QueryResultRow,
  FieldDef,
  Pool,
  PoolClient,
  ClientConfig,
  QueryConfig,
} from 'pg';

// Re-export standard pg types for convenience
export type {
  PoolConfig,
  QueryResult,
  QueryResultRow,
  FieldDef,
  Pool,
  PoolClient,
  ClientConfig,
  QueryConfig,
};

/**
 * PostgreSQL plugin configuration
 * Directly uses pg.PoolConfig from the pg library with all standard types
 * Reference: @types/pg ClientConfig and PoolConfig
 *
 * Includes all ClientConfig fields:
 * - user, database, password, port, host, connectionString, keepAlive, stream
 * - statement_timeout, ssl, query_timeout, lock_timeout, keepAliveInitialDelayMillis
 * - idle_in_transaction_session_timeout, application_name, fallback_application_name
 * - connectionTimeoutMillis, types, options, client_encoding
 *
 * Includes all Pool-specific fields:
 * - max, min, idleTimeoutMillis, log, Promise, allowExitOnIdle
 * - maxUses, maxLifetimeSeconds, Client
 */
export type PostgresPluginConfig = PoolConfig;

/**
 * PostgreSQL query result
 * Directly uses pg.QueryResult from the pg library
 * Reference: @types/pg QueryResult
 */
export type PostgresQueryResult<R extends QueryResultRow = QueryResultRow> = QueryResult<R>;

/**
 * PostgreSQL tool arguments
 */
export interface PostgresQueryArgs {
  query: string;
  params?: Array<string | number | boolean | null>;
}

export interface PostgresListTablesArgs {
  schema?: string;
}

export interface PostgresDescribeTableArgs {
  table: string;
  schema?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PostgresListSchemasArgs {
  // No arguments needed
}

export interface PostgresExecuteArgs {
  query: string;
  params?: Array<string | number | boolean | null>;
}

/**
 * Row types for various PostgreSQL queries
 */
export interface VersionRow {
  version: string;
}

export interface DatabaseInfoRow {
  database_name: string;
  size: string;
}

export interface ConnectionCountRow {
  connection_count: number;
}

export interface TableStatsRow {
  schemaname: string;
  tablename: string;
  total_size: string;
  table_size: string;
  index_size: string;
  row_count: number;
  dead_rows: number;
  last_vacuum: Date | null;
  last_autovacuum: Date | null;
  last_analyze: Date | null;
  last_autoanalyze: Date | null;
}

export interface KillQueryRow {
  terminated?: boolean;
  cancelled?: boolean;
}
