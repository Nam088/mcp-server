import { z } from 'zod';
import pg from 'pg';
import { PluginBase, PluginMode, type PluginConfig, type PluginContext } from '@nam088/mcp-core';
import type {
  PostgresPluginConfig,
  PostgresQueryResult,
  VersionRow,
  DatabaseInfoRow,
  ConnectionCountRow,
  TableStatsRow,
  KillQueryRow,
} from './types.js';

const { Pool } = pg;

/**
 * PostgreSQL MCP Plugin
 * Provides tools for interacting with PostgreSQL databases
 */
export class PostgresPlugin extends PluginBase {
  readonly metadata: PluginConfig = {
    name: 'postgres',
    version: '1.0.0',
    description: 'PostgreSQL database tools for MCP',
  };

  private pgConfig: PostgresPluginConfig;
  private pool: pg.Pool | null = null;

  constructor(config?: Record<string, unknown>) {
    super(config);

    // Support mode from config or environment variable
    const modeFromEnv = process.env.POSTGRES_MODE || process.env.PG_MODE;
    if (config?.mode && typeof config.mode === 'string' && config.mode in PluginMode) {
      this.metadata.mode = config.mode as PluginMode;
    } else if (modeFromEnv && modeFromEnv in PluginMode) {
      this.metadata.mode = modeFromEnv as PluginMode;
    } else {
      this.metadata.mode = PluginMode.READONLY;
    }

    // Support connection string (takes precedence over individual settings)
    const connectionString =
      (config?.connectionString as string) ||
      (config?.url as string) ||
      process.env.POSTGRES_CONNECTION_STRING ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.PG_CONNECTION_STRING;

    // Support environment variables with config override
    const ssl = config?.ssl !== undefined ? config.ssl : process.env.POSTGRES_SSL === 'true';
    let sslConfig:
      | boolean
      | {
          rejectUnauthorized?: boolean;
          ca?: string;
          cert?: string;
          key?: string;
        }
      | undefined;

    if (typeof ssl === 'boolean') {
      sslConfig = ssl;
    } else if (ssl && typeof ssl === 'object') {
      const sslObj = ssl as {
        rejectUnauthorized?: boolean;
        ca?: string;
        cert?: string;
        key?: string;
      };
      sslConfig = {
        rejectUnauthorized:
          sslObj.rejectUnauthorized !== undefined
            ? sslObj.rejectUnauthorized
            : process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== 'false',
        ...(sslObj.ca && { ca: sslObj.ca }),
        ...(sslObj.cert && { cert: sslObj.cert }),
        ...(sslObj.key && { key: sslObj.key }),
      };
    } else {
      sslConfig = undefined;
    }

    // If connectionString is provided, use it exclusively (with optional SSL config)
    // Otherwise, use individual connection parameters
    if (connectionString) {
      this.pgConfig = {
        connectionString,
        connectionTimeoutMillis:
          (config?.connectionTimeoutMillis as number) ||
          parseInt(process.env.POSTGRES_TIMEOUT || '5000'),
        idleTimeoutMillis: (config?.idleTimeoutMillis as number) || 10000,
        max: (config?.max as number) || parseInt(process.env.POSTGRES_MAX_POOL || '10'),
        min: (config?.min as number) || parseInt(process.env.POSTGRES_MIN_POOL || '0'),
        ...(sslConfig !== undefined && { ssl: sslConfig }),
        application_name:
          (config?.application_name as string) || process.env.POSTGRES_APP_NAME || 'mcp-postgres',
        statement_timeout:
          (config?.statement_timeout as number) ||
          parseInt(process.env.POSTGRES_STATEMENT_TIMEOUT || '0'),
        query_timeout:
          (config?.query_timeout as number) || parseInt(process.env.POSTGRES_QUERY_TIMEOUT || '0'),
      };
    } else {
      const password =
        (config?.password as string) || process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD;

      this.pgConfig = {
        host:
          (config?.host as string) ||
          process.env.POSTGRES_HOST ||
          process.env.PGHOST ||
          'localhost',
        port:
          (config?.port as number) ||
          parseInt(process.env.POSTGRES_PORT || process.env.PGPORT || '5432'),
        user:
          (config?.user as string) || process.env.POSTGRES_USER || process.env.PGUSER || 'postgres',
        ...(password && { password }),
        database:
          (config?.database as string) ||
          process.env.POSTGRES_DB ||
          process.env.POSTGRES_DATABASE ||
          process.env.PGDATABASE ||
          'postgres',
        connectionTimeoutMillis:
          (config?.connectionTimeoutMillis as number) ||
          parseInt(process.env.POSTGRES_TIMEOUT || '5000'),
        idleTimeoutMillis: (config?.idleTimeoutMillis as number) || 10000,
        max: (config?.max as number) || parseInt(process.env.POSTGRES_MAX_POOL || '10'),
        min: (config?.min as number) || parseInt(process.env.POSTGRES_MIN_POOL || '0'),
        ...(sslConfig !== undefined && { ssl: sslConfig }),
        application_name:
          (config?.application_name as string) || process.env.POSTGRES_APP_NAME || 'mcp-postgres',
        statement_timeout:
          (config?.statement_timeout as number) ||
          parseInt(process.env.POSTGRES_STATEMENT_TIMEOUT || '0'),
        query_timeout:
          (config?.query_timeout as number) || parseInt(process.env.POSTGRES_QUERY_TIMEOUT || '0'),
      };
    }
  }

  /**
   * Initialize PostgreSQL connection pool
   */
  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);

    try {
      this.pool = new Pool(this.pgConfig);

      // Add error handler
      this.pool.on('error', (err) => {
        console.error('[ERROR] [Postgres] Pool Error:', err);
      });

      // Test connection
      const client = await this.pool.connect();
      try {
        await client.query('SELECT NOW()');
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[ERROR] [Postgres] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Register PostgreSQL tools
   */
  register(context: PluginContext): void {
    // Tool: postgres_query (readonly operation)
    this.registerTool({
      context,
      name: 'postgres_query',
      schema: {
        description: 'Execute a SELECT query on PostgreSQL database',
        inputSchema: {
          query: z.string().describe('SQL SELECT query to execute'),
          params: z
            .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
            .optional()
            .describe('Query parameters for parameterized queries'),
        },
      },
      handler: async ({
        query,
        params,
      }: {
        query: string;
        params?: Array<string | number | boolean | null>;
      }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          // Validate that query is a SELECT statement
          const trimmedQuery = query.trim().toLowerCase();
          if (!trimmedQuery.startsWith('select') && !trimmedQuery.startsWith('with')) {
            throw new Error(
              'Only SELECT queries are allowed. Use postgres_execute for other operations.',
            );
          }

          const result: PostgresQueryResult = await this.pool.query(query, params);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
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

    // Tool: postgres_execute (write operation)
    this.registerTool({
      context,
      name: 'postgres_execute',
      schema: {
        description: 'Execute an INSERT, UPDATE, DELETE, or DDL query (requires FULL mode)',
        inputSchema: {
          query: z.string().describe('SQL query to execute'),
          params: z
            .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
            .optional()
            .describe('Query parameters for parameterized queries'),
        },
      },
      handler: async ({
        query,
        params,
      }: {
        query: string;
        params?: Array<string | number | boolean | null>;
      }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const result: PostgresQueryResult = await this.pool.query(query, params);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
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

    // Tool: postgres_list_tables
    this.registerTool({
      context,
      name: 'postgres_list_tables',
      schema: {
        description: 'List all tables in the database or a specific schema',
        inputSchema: {
          schema: z.string().optional().default('public').describe('Schema name (default: public)'),
        },
      },
      handler: async ({ schema = 'public' }: { schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = `
            SELECT 
              table_name,
              table_type,
              table_schema
            FROM information_schema.tables
            WHERE table_schema = $1
            ORDER BY table_name;
          `;

          const result = await this.pool.query(query, [schema]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    tables: result.rows,
                    count: result.rowCount || 0,
                  },
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

    // Tool: postgres_describe_table
    this.registerTool({
      context,
      name: 'postgres_describe_table',
      schema: {
        description: 'Get detailed information about a table structure',
        inputSchema: {
          table: z.string().describe('Table name'),
          schema: z.string().optional().default('public').describe('Schema name (default: public)'),
        },
      },
      handler: async ({ table, schema = 'public' }: { table: string; schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = `
            SELECT 
              column_name,
              data_type,
              character_maximum_length,
              column_default,
              is_nullable,
              ordinal_position
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position;
          `;

          const result = await this.pool.query(query, [schema, table]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    table,
                    columns: result.rows,
                    columnCount: result.rowCount || 0,
                  },
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

    // Tool: postgres_list_schemas
    this.registerTool({
      context,
      name: 'postgres_list_schemas',
      schema: {
        description: 'List all schemas in the database',
        inputSchema: {},
      },
      handler: async () => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = `
            SELECT 
              schema_name,
              schema_owner
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
            ORDER BY schema_name;
          `;

          const result = await this.pool.query(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schemas: result.rows,
                    count: result.rowCount || 0,
                  },
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

    // Tool: postgres_list_indexes
    this.registerTool({
      context,
      name: 'postgres_list_indexes',
      schema: {
        description: 'List all indexes for a table',
        inputSchema: {
          table: z.string().describe('Table name'),
          schema: z.string().optional().default('public').describe('Schema name (default: public)'),
        },
      },
      handler: async ({ table, schema = 'public' }: { table: string; schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = `
            SELECT
              i.relname AS index_name,
              a.attname AS column_name,
              am.amname AS index_type,
              ix.indisprimary AS is_primary,
              ix.indisunique AS is_unique
            FROM pg_class t
            JOIN pg_index ix ON t.oid = ix.indrelid
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
            JOIN pg_am am ON am.oid = i.relam
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE t.relname = $1 AND n.nspname = $2
            ORDER BY i.relname, a.attnum;
          `;

          const result = await this.pool.query(query, [table, schema]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    table,
                    indexes: result.rows,
                    count: result.rowCount || 0,
                  },
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

    // Tool: postgres_database_info
    this.registerTool({
      context,
      name: 'postgres_database_info',
      schema: {
        description: 'Get PostgreSQL database server information',
        inputSchema: {},
      },
      handler: async () => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const versionResult: PostgresQueryResult<VersionRow> =
            await this.pool.query('SELECT version()');
          const sizeResult: PostgresQueryResult<DatabaseInfoRow> = await this.pool.query(`
            SELECT 
              pg_database.datname as database_name,
              pg_size_pretty(pg_database_size(pg_database.datname)) AS size
            FROM pg_database
            WHERE datname = current_database();
          `);
          const connectionResult: PostgresQueryResult<ConnectionCountRow> = await this.pool.query(`
            SELECT count(*) as connection_count
            FROM pg_stat_activity
            WHERE datname = current_database();
          `);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    version: versionResult.rows[0]?.version,
                    database: sizeResult.rows[0],
                    connections: connectionResult.rows[0]?.connection_count,
                  },
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

    // Tool: postgres_list_views
    this.registerTool({
      context,
      name: 'postgres_list_views',
      schema: {
        description: 'List all views in a schema',
        inputSchema: {
          schema: z.string().optional().default('public').describe('Schema name (default: public)'),
        },
      },
      handler: async ({ schema = 'public' }: { schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = `
            SELECT 
              table_name as view_name,
              view_definition
            FROM information_schema.views
            WHERE table_schema = $1
            ORDER BY table_name;
          `;

          const result = await this.pool.query(query, [schema]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    views: result.rows,
                    count: result.rowCount || 0,
                  },
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

    // Tool: postgres_list_functions
    this.registerTool({
      context,
      name: 'postgres_list_functions',
      schema: {
        description: 'List all functions and procedures in a schema',
        inputSchema: {
          schema: z.string().optional().default('public').describe('Schema name (default: public)'),
        },
      },
      handler: async ({ schema = 'public' }: { schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = `
            SELECT 
              routine_name as function_name,
              routine_type,
              data_type as return_type,
              routine_definition
            FROM information_schema.routines
            WHERE routine_schema = $1
            ORDER BY routine_name;
          `;

          const result = await this.pool.query(query, [schema]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    functions: result.rows,
                    count: result.rowCount || 0,
                  },
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

    // Tool: postgres_list_sequences
    this.registerTool({
      context,
      name: 'postgres_list_sequences',
      schema: {
        description: 'List all sequences in a schema',
        inputSchema: {
          schema: z.string().optional().default('public').describe('Schema name (default: public)'),
        },
      },
      handler: async ({ schema = 'public' }: { schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = `
            SELECT 
              sequence_name,
              data_type,
              start_value,
              minimum_value,
              maximum_value,
              increment
            FROM information_schema.sequences
            WHERE sequence_schema = $1
            ORDER BY sequence_name;
          `;

          const result = await this.pool.query(query, [schema]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    sequences: result.rows,
                    count: result.rowCount || 0,
                  },
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

    // Tool: postgres_table_stats
    this.registerTool({
      context,
      name: 'postgres_table_stats',
      schema: {
        description: 'Get statistics about a table (size, row count, index size, etc)',
        inputSchema: {
          table: z.string().describe('Table name'),
          schema: z.string().optional().default('public').describe('Schema name (default: public)'),
        },
      },
      handler: async ({ table, schema = 'public' }: { table: string; schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = `
            SELECT 
              schemaname,
              tablename,
              pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
              pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
              pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
              n_live_tup as row_count,
              n_dead_tup as dead_rows,
              last_vacuum,
              last_autovacuum,
              last_analyze,
              last_autoanalyze
            FROM pg_stat_user_tables
            WHERE schemaname = $1 AND tablename = $2;
          `;

          const result: PostgresQueryResult<TableStatsRow> = await this.pool.query(query, [
            schema,
            table,
          ]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    table,
                    stats: result.rows[0] || null,
                  },
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

    // Tool: postgres_list_constraints
    this.registerTool({
      context,
      name: 'postgres_list_constraints',
      schema: {
        description: 'List all constraints for a table (foreign keys, primary keys, unique, check)',
        inputSchema: {
          table: z.string().describe('Table name'),
          schema: z.string().optional().default('public').describe('Schema name (default: public)'),
        },
      },
      handler: async ({ table, schema = 'public' }: { table: string; schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = `
            SELECT 
              tc.constraint_name,
              tc.constraint_type,
              kcu.column_name,
              ccu.table_schema AS foreign_table_schema,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name,
              rc.update_rule,
              rc.delete_rule,
              cc.check_clause
            FROM information_schema.table_constraints tc
            LEFT JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            LEFT JOIN information_schema.referential_constraints rc
              ON tc.constraint_name = rc.constraint_name
              AND tc.table_schema = rc.constraint_schema
            LEFT JOIN information_schema.check_constraints cc
              ON tc.constraint_name = cc.constraint_name
              AND tc.table_schema = cc.constraint_schema
            WHERE tc.table_schema = $1 AND tc.table_name = $2
            ORDER BY tc.constraint_type, tc.constraint_name;
          `;

          const result = await this.pool.query(query, [schema, table]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    table,
                    constraints: result.rows,
                    count: result.rowCount || 0,
                  },
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

    // Tool: postgres_explain_query
    this.registerTool({
      context,
      name: 'postgres_explain_query',
      schema: {
        description: 'Explain a query execution plan (EXPLAIN ANALYZE)',
        inputSchema: {
          query: z.string().describe('SQL query to explain'),
          analyze: z
            .boolean()
            .optional()
            .default(false)
            .describe('Run EXPLAIN ANALYZE (actually executes the query)'),
          params: z
            .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
            .optional()
            .describe('Query parameters for parameterized queries'),
        },
      },
      handler: async ({
        query,
        analyze = false,
        params,
      }: {
        query: string;
        analyze?: boolean;
        params?: Array<string | number | boolean | null>;
      }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const explainQuery = analyze ? `EXPLAIN ANALYZE ${query}` : `EXPLAIN ${query}`;
          const result = await this.pool.query(explainQuery, params);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    query,
                    analyze,
                    plan: result.rows,
                  },
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

    // Tool: postgres_active_queries
    this.registerTool({
      context,
      name: 'postgres_active_queries',
      schema: {
        description: 'List currently running queries in the database',
        inputSchema: {
          include_idle: z.boolean().optional().default(false).describe('Include idle connections'),
        },
      },
      handler: async ({ include_idle = false }: { include_idle?: boolean }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = `
            SELECT 
              pid,
              usename,
              application_name,
              client_addr,
              state,
              query,
              query_start,
              state_change,
              wait_event_type,
              wait_event
            FROM pg_stat_activity
            WHERE datname = current_database()
              ${!include_idle ? "AND state != 'idle'" : ''}
            ORDER BY query_start DESC;
          `;

          const result = await this.pool.query(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    queries: result.rows,
                    count: result.rowCount || 0,
                  },
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

    // Tool: postgres_kill_query
    this.registerTool({
      context,
      name: 'postgres_kill_query',
      schema: {
        description: 'Terminate a running query by process ID (requires FULL mode)',
        inputSchema: {
          pid: z.number().describe('Process ID of the query to terminate'),
          force: z
            .boolean()
            .optional()
            .default(false)
            .describe('Force terminate (pg_terminate_backend) instead of cancel'),
        },
      },
      handler: async ({ pid, force = false }: { pid: number; force?: boolean }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = force
            ? 'SELECT pg_terminate_backend($1) as terminated'
            : 'SELECT pg_cancel_backend($1) as cancelled';

          const result: PostgresQueryResult<KillQueryRow> = await this.pool.query(query, [pid]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    pid,
                    action: force ? 'terminated' : 'cancelled',
                    success: result.rows[0],
                  },
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
      isWriteTool: true,
    });

    // Tool: postgres_vacuum_analyze
    this.registerTool({
      context,
      name: 'postgres_vacuum_analyze',
      schema: {
        description: 'Run VACUUM ANALYZE on a table for maintenance (requires FULL mode)',
        inputSchema: {
          table: z.string().describe('Table name'),
          schema: z.string().optional().default('public').describe('Schema name (default: public)'),
          full: z
            .boolean()
            .optional()
            .default(false)
            .describe('Run VACUUM FULL (more aggressive, locks table)'),
        },
      },
      handler: async ({
        table,
        schema = 'public',
        full = false,
      }: {
        table: string;
        schema?: string;
        full?: boolean;
      }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const fullTable = `"${schema}"."${table}"`;
          const query = full ? `VACUUM FULL ANALYZE ${fullTable}` : `VACUUM ANALYZE ${fullTable}`;

          await this.pool.query(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    table,
                    action: full ? 'VACUUM FULL ANALYZE' : 'VACUUM ANALYZE',
                    success: true,
                  },
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
      isWriteTool: true,
    });

    // Tool: postgres_list_triggers
    this.registerTool({
      context,
      name: 'postgres_list_triggers',
      schema: {
        description: 'List all triggers for a table',
        inputSchema: {
          table: z.string().optional().describe('Table name (optional, list all if not provided)'),
          schema: z.string().optional().default('public').describe('Schema name (default: public)'),
        },
      },
      handler: async ({ table, schema = 'public' }: { table?: string; schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = table
            ? `
              SELECT 
                trigger_name,
                event_manipulation,
                event_object_table,
                action_statement,
                action_timing,
                action_orientation
              FROM information_schema.triggers
              WHERE event_object_schema = $1 AND event_object_table = $2
              ORDER BY trigger_name;
            `
            : `
              SELECT 
                trigger_name,
                event_manipulation,
                event_object_table,
                action_statement,
                action_timing,
                action_orientation
              FROM information_schema.triggers
              WHERE event_object_schema = $1
              ORDER BY event_object_table, trigger_name;
            `;

          const params = table ? [schema, table] : [schema];
          const result = await this.pool.query(query, params);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    ...(table && { table }),
                    triggers: result.rows,
                    count: result.rowCount || 0,
                  },
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

    // Tool: postgres_list_materialized_views
    this.registerTool({
      context,
      name: 'postgres_list_materialized_views',
      schema: {
        description: 'List all materialized views in a schema',
        inputSchema: {
          schema: z.string().optional().default('public').describe('Schema name (default: public)'),
        },
      },
      handler: async ({ schema = 'public' }: { schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = `
            SELECT 
              schemaname,
              matviewname as view_name,
              matviewowner as owner,
              hasindexes as has_indexes,
              ispopulated as is_populated,
              definition
            FROM pg_matviews
            WHERE schemaname = $1
            ORDER BY matviewname;
          `;

          const result = await this.pool.query(query, [schema]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    materialized_views: result.rows,
                    count: result.rowCount || 0,
                  },
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

    // Tool: postgres_refresh_materialized_view
    this.registerTool({
      context,
      name: 'postgres_refresh_materialized_view',
      schema: {
        description: 'Refresh a materialized view (requires FULL mode)',
        inputSchema: {
          view: z.string().describe('Materialized view name'),
          schema: z.string().optional().default('public').describe('Schema name (default: public)'),
          concurrently: z
            .boolean()
            .optional()
            .default(false)
            .describe('Refresh concurrently (requires unique index)'),
        },
      },
      handler: async ({
        view,
        schema = 'public',
        concurrently = false,
      }: {
        view: string;
        schema?: string;
        concurrently?: boolean;
      }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const fullView = `"${schema}"."${view}"`;
          const query = concurrently
            ? `REFRESH MATERIALIZED VIEW CONCURRENTLY ${fullView}`
            : `REFRESH MATERIALIZED VIEW ${fullView}`;

          await this.pool.query(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    view,
                    action: concurrently ? 'REFRESH CONCURRENTLY' : 'REFRESH',
                    success: true,
                  },
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
      isWriteTool: true,
    });

    // Tool: postgres_index_usage
    this.registerTool({
      context,
      name: 'postgres_index_usage',
      schema: {
        description: 'Get index usage statistics for a table or all tables in schema',
        inputSchema: {
          table: z
            .string()
            .optional()
            .describe('Table name (optional, all tables if not provided)'),
          schema: z.string().optional().default('public').describe('Schema name (default: public)'),
        },
      },
      handler: async ({ table, schema = 'public' }: { table?: string; schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = table
            ? `
              SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan as scans,
                idx_tup_read as tuples_read,
                idx_tup_fetch as tuples_fetched,
                pg_size_pretty(pg_relation_size(indexrelid)) as index_size
              FROM pg_stat_user_indexes
              WHERE schemaname = $1 AND tablename = $2
              ORDER BY idx_scan DESC;
            `
            : `
              SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan as scans,
                idx_tup_read as tuples_read,
                idx_tup_fetch as tuples_fetched,
                pg_size_pretty(pg_relation_size(indexrelid)) as index_size
              FROM pg_stat_user_indexes
              WHERE schemaname = $1
              ORDER BY idx_scan DESC;
            `;

          const params = table ? [schema, table] : [schema];
          const result = await this.pool.query(query, params);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    ...(table && { table }),
                    indexes: result.rows,
                    count: result.rowCount || 0,
                  },
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

    // Tool: postgres_lock_info
    this.registerTool({
      context,
      name: 'postgres_lock_info',
      schema: {
        description: 'Get information about current locks in the database',
        inputSchema: {
          blocked_only: z.boolean().optional().default(false).describe('Show only blocked queries'),
        },
      },
      handler: async ({ blocked_only = false }: { blocked_only?: boolean }) => {
        try {
          if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
          }

          const query = `
            SELECT 
              blocked_locks.pid AS blocked_pid,
              blocked_activity.usename AS blocked_user,
              blocking_locks.pid AS blocking_pid,
              blocking_activity.usename AS blocking_user,
              blocked_activity.query AS blocked_statement,
              blocking_activity.query AS blocking_statement,
              blocked_activity.application_name AS blocked_application,
              blocking_activity.application_name AS blocking_application
            FROM pg_catalog.pg_locks blocked_locks
            JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
            JOIN pg_catalog.pg_locks blocking_locks 
              ON blocking_locks.locktype = blocked_locks.locktype
              AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
              AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
              AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
              AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
              AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
              AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
              AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
              AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
              AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
              AND blocking_locks.pid != blocked_locks.pid
            JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
            WHERE NOT blocked_locks.granted
            ${blocked_only ? '' : 'UNION ALL SELECT NULL, NULL, locks.pid, activity.usename, NULL, activity.query, NULL, activity.application_name FROM pg_catalog.pg_locks locks JOIN pg_catalog.pg_stat_activity activity ON activity.pid = locks.pid WHERE locks.granted'};
          `;

          const result = await this.pool.query(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    blocked_only,
                    locks: result.rows,
                    count: result.rowCount || 0,
                  },
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
   * Cleanup PostgreSQL connection pool
   */
  async cleanup(): Promise<void> {
    await super.cleanup();
    if (this.pool) {
      await this.pool.end();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool) {
        return false;
      }
      const result = await this.pool.query('SELECT 1');
      return result.rowCount === 1;
    } catch {
      return false;
    }
  }
}
