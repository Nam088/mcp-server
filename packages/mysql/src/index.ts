import { z } from 'zod';
import mysql, { type Pool } from 'mysql2/promise';
import { PluginBase, PluginMode, type PluginConfig, type PluginContext } from '@nam088/mcp-core';
import type {
  MysqlPluginConfig,
  MysqlQueryResult,
  RowDataPacket,
  FieldPacket,
  ResultSetHeader,
  VersionRow,
  DatabaseRow,
} from './types.js';

/**
 * MySQL/MariaDB MCP Plugin
 * Provides tools for interacting with MySQL and MariaDB databases
 */
export class MysqlPlugin extends PluginBase {
  readonly metadata: PluginConfig = {
    name: 'mysql',
    version: '1.0.0',
    description: 'MySQL/MariaDB database tools for MCP',
  };

  private mysqlConfig: MysqlPluginConfig;
  private pool: Pool | null = null;

  constructor(config?: Record<string, unknown>) {
    super(config);

    // Support mode from config or environment variable
    const modeFromEnv = process.env.MYSQL_MODE;
    if (config?.mode && typeof config.mode === 'string' && config.mode in PluginMode) {
      this.metadata.mode = config.mode as PluginMode;
    } else if (modeFromEnv && modeFromEnv in PluginMode) {
      this.metadata.mode = modeFromEnv as PluginMode;
    } else {
      this.metadata.mode = PluginMode.READONLY;
    }

    // Support environment variables with config override
    const password =
      (config?.password as string) || process.env.MYSQL_PASSWORD || process.env.MYSQL_PWD;

    this.mysqlConfig = {
      host: (config?.host as string) || process.env.MYSQL_HOST || 'localhost',
      port: (config?.port as number) || parseInt(process.env.MYSQL_PORT || '3306'),
      user: (config?.user as string) || process.env.MYSQL_USER || 'root',
      ...(password && { password }),
      database:
        (config?.database as string) ||
        process.env.MYSQL_DATABASE ||
        process.env.MYSQL_DB ||
        'mysql',
      connectionLimit:
        (config?.connectionLimit as number) || parseInt(process.env.MYSQL_POOL_SIZE || '10'),
      connectTimeout:
        (config?.connectTimeout as number) || parseInt(process.env.MYSQL_TIMEOUT || '10000'),
      waitForConnections: (config?.waitForConnections as boolean) !== false,
      queueLimit: (config?.queueLimit as number) || 0,
    };
  }

  /**
   * Initialize MySQL connection pool
   */
  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);

    try {
      this.pool = mysql.createPool(this.mysqlConfig);

      // Test connection
      const connection = await this.pool.getConnection();
      try {
        await connection.query('SELECT 1');
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[ERROR] [MySQL] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Helper method to execute queries with proper typing
   */
  private async executeQuery<
    T extends RowDataPacket[] | RowDataPacket[][] | ResultSetHeader | ResultSetHeader[],
  >(query: string, params?: Array<string | number | boolean | null>): Promise<[T, FieldPacket[]]> {
    if (!this.pool) {
      throw new Error('MySQL pool not initialized');
    }
    return this.pool.query<T>(query, params);
  }

  /**
   * Register MySQL tools
   */
  register(context: PluginContext): void {
    // Tool: mysql_query (readonly operation)
    this.registerTool({
      context,
      name: 'mysql_query',
      schema: {
        description: 'Execute a SELECT query on MySQL database',
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
            throw new Error('MySQL pool not initialized');
          }

          // Validate that query is a SELECT statement
          const trimmedQuery = query.trim().toLowerCase();
          if (
            !trimmedQuery.startsWith('select') &&
            !trimmedQuery.startsWith('with') &&
            !trimmedQuery.startsWith('show') &&
            !trimmedQuery.startsWith('describe') &&
            !trimmedQuery.startsWith('explain')
          ) {
            throw new Error(
              'Only SELECT/SHOW/DESCRIBE/EXPLAIN queries are allowed. Use mysql_execute for other operations.',
            );
          }

          const [rows, fields] = await this.executeQuery<RowDataPacket[]>(query, params);

          const resultData: MysqlQueryResult<RowDataPacket> = {
            rows,
            rowCount: rows.length,
            fields: fields.map((f) => ({ name: f.name, type: String(f.type) })),
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(resultData, null, 2),
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

    // Tool: mysql_execute (write operation)
    this.registerTool({
      context,
      name: 'mysql_execute',
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
            throw new Error('MySQL pool not initialized');
          }

          const [result] = await this.executeQuery<ResultSetHeader>(query, params);

          const resultData: MysqlQueryResult<RowDataPacket> = {
            rows: [],
            rowCount: result.affectedRows,
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(resultData, null, 2),
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

    // Tool: mysql_list_tables
    this.registerTool({
      context,
      name: 'mysql_list_tables',
      schema: {
        description: 'List all tables in the database or a specific database',
        inputSchema: {
          database: z.string().optional().describe('Database name (default: current database)'),
        },
      },
      handler: async ({ database }: { database?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          const query = database
            ? `
              SELECT 
                TABLE_NAME as table_name,
                TABLE_TYPE as table_type,
                ENGINE as engine,
                TABLE_ROWS as table_rows,
                DATA_LENGTH as data_length,
                INDEX_LENGTH as index_length
              FROM information_schema.TABLES
              WHERE TABLE_SCHEMA = ?
              ORDER BY TABLE_NAME;
            `
            : `
              SELECT 
                TABLE_NAME as table_name,
                TABLE_TYPE as table_type,
                ENGINE as engine,
                TABLE_ROWS as table_rows,
                DATA_LENGTH as data_length,
                INDEX_LENGTH as index_length
              FROM information_schema.TABLES
              WHERE TABLE_SCHEMA = DATABASE()
              ORDER BY TABLE_NAME;
            `;

          const [rows] = database
            ? await this.executeQuery<RowDataPacket[]>(query, [database])
            : await this.executeQuery<RowDataPacket[]>(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    database: database || 'current',
                    tables: rows,
                    count: Array.isArray(rows) ? rows.length : 0,
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

    // Tool: mysql_describe_table
    this.registerTool({
      context,
      name: 'mysql_describe_table',
      schema: {
        description: 'Get detailed information about a table structure',
        inputSchema: {
          table: z.string().describe('Table name'),
          database: z.string().optional().describe('Database name (default: current database)'),
        },
      },
      handler: async ({ table, database }: { table: string; database?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          const query = database
            ? `
              SELECT 
                COLUMN_NAME as column_name,
                DATA_TYPE as data_type,
                COLUMN_TYPE as column_type,
                IS_NULLABLE as is_nullable,
                COLUMN_DEFAULT as column_default,
                COLUMN_KEY as column_key,
                EXTRA as extra,
                ORDINAL_POSITION as ordinal_position
              FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
              ORDER BY ORDINAL_POSITION;
            `
            : `
              SELECT 
                COLUMN_NAME as column_name,
                DATA_TYPE as data_type,
                COLUMN_TYPE as column_type,
                IS_NULLABLE as is_nullable,
                COLUMN_DEFAULT as column_default,
                COLUMN_KEY as column_key,
                EXTRA as extra,
                ORDINAL_POSITION as ordinal_position
              FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
              ORDER BY ORDINAL_POSITION;
            `;

          const [rows] = database
            ? await this.executeQuery<RowDataPacket[]>(query, [database, table])
            : await this.executeQuery<RowDataPacket[]>(query, [table]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    database: database || 'current',
                    table,
                    columns: rows,
                    columnCount: Array.isArray(rows) ? rows.length : 0,
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

    // Tool: mysql_list_databases
    this.registerTool({
      context,
      name: 'mysql_list_databases',
      schema: {
        description: 'List all databases in the MySQL server',
        inputSchema: {},
      },
      handler: async () => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          const query = `
            SELECT 
              SCHEMA_NAME as database_name,
              DEFAULT_CHARACTER_SET_NAME as charset,
              DEFAULT_COLLATION_NAME as collation
            FROM information_schema.SCHEMATA
            WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
            ORDER BY SCHEMA_NAME;
          `;

          const [rows] = await this.executeQuery<RowDataPacket[]>(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    databases: rows,
                    count: Array.isArray(rows) ? rows.length : 0,
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

    // Tool: mysql_list_indexes
    this.registerTool({
      context,
      name: 'mysql_list_indexes',
      schema: {
        description: 'List all indexes for a table',
        inputSchema: {
          table: z.string().describe('Table name'),
          database: z.string().optional().describe('Database name (default: current database)'),
        },
      },
      handler: async ({ table, database }: { table: string; database?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          const query = database
            ? `
              SELECT 
                INDEX_NAME as index_name,
                COLUMN_NAME as column_name,
                INDEX_TYPE as index_type,
                NON_UNIQUE = 0 as is_unique,
                INDEX_NAME = 'PRIMARY' as is_primary,
                SEQ_IN_INDEX as seq_in_index
              FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
              ORDER BY INDEX_NAME, SEQ_IN_INDEX;
            `
            : `
              SELECT 
                INDEX_NAME as index_name,
                COLUMN_NAME as column_name,
                INDEX_TYPE as index_type,
                NON_UNIQUE = 0 as is_unique,
                INDEX_NAME = 'PRIMARY' as is_primary,
                SEQ_IN_INDEX as seq_in_index
              FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
              ORDER BY INDEX_NAME, SEQ_IN_INDEX;
            `;

          const [rows] = database
            ? await this.executeQuery<RowDataPacket[]>(query, [database, table])
            : await this.executeQuery<RowDataPacket[]>(query, [table]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    database: database || 'current',
                    table,
                    indexes: rows,
                    count: Array.isArray(rows) ? rows.length : 0,
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

    // Tool: mysql_database_info
    this.registerTool({
      context,
      name: 'mysql_database_info',
      schema: {
        description: 'Get MySQL database server information',
        inputSchema: {},
      },
      handler: async () => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          const [versionRows] = await this.executeQuery<VersionRow[]>(
            'SELECT VERSION() as version',
          );
          const [dbRows] = await this.executeQuery<DatabaseRow[]>(
            'SELECT DATABASE() as current_database',
          );
          const [processRows] = await this.executeQuery<RowDataPacket[]>('SHOW PROCESSLIST');

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    version: versionRows[0]?.version ?? null,
                    current_database: dbRows[0]?.current_database ?? null,
                    connections: processRows.length,
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

    // Tool: mysql_list_constraints
    this.registerTool({
      context,
      name: 'mysql_list_constraints',
      schema: {
        description: 'List all constraints for a table (foreign keys, primary keys, unique)',
        inputSchema: {
          table: z.string().describe('Table name'),
          database: z.string().optional().describe('Database name (default: current database)'),
        },
      },
      handler: async ({ table, database }: { table: string; database?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          const query = database
            ? `
              SELECT 
                CONSTRAINT_NAME as constraint_name,
                CONSTRAINT_TYPE as constraint_type,
                COLUMN_NAME as column_name,
                REFERENCED_TABLE_SCHEMA as foreign_table_schema,
                REFERENCED_TABLE_NAME as foreign_table_name,
                REFERENCED_COLUMN_NAME as foreign_column_name
              FROM information_schema.TABLE_CONSTRAINTS tc
              LEFT JOIN information_schema.KEY_COLUMN_USAGE kcu
                ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
                AND tc.TABLE_NAME = kcu.TABLE_NAME
              WHERE tc.TABLE_SCHEMA = ? AND tc.TABLE_NAME = ?
              ORDER BY tc.CONSTRAINT_TYPE, tc.CONSTRAINT_NAME;
            `
            : `
              SELECT 
                CONSTRAINT_NAME as constraint_name,
                CONSTRAINT_TYPE as constraint_type,
                COLUMN_NAME as column_name,
                REFERENCED_TABLE_SCHEMA as foreign_table_schema,
                REFERENCED_TABLE_NAME as foreign_table_name,
                REFERENCED_COLUMN_NAME as foreign_column_name
              FROM information_schema.TABLE_CONSTRAINTS tc
              LEFT JOIN information_schema.KEY_COLUMN_USAGE kcu
                ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
                AND tc.TABLE_NAME = kcu.TABLE_NAME
              WHERE tc.TABLE_SCHEMA = DATABASE() AND tc.TABLE_NAME = ?
              ORDER BY tc.CONSTRAINT_TYPE, tc.CONSTRAINT_NAME;
            `;

          const [rows] = database
            ? await this.executeQuery<RowDataPacket[]>(query, [database, table])
            : await this.executeQuery<RowDataPacket[]>(query, [table]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    database: database || 'current',
                    table,
                    constraints: rows,
                    count: Array.isArray(rows) ? rows.length : 0,
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

    // Tool: mysql_explain_query
    this.registerTool({
      context,
      name: 'mysql_explain_query',
      schema: {
        description: 'Explain a query execution plan',
        inputSchema: {
          query: z.string().describe('SQL query to explain'),
          format: z
            .enum(['TRADITIONAL', 'JSON', 'TREE'])
            .optional()
            .default('TRADITIONAL')
            .describe('Explain format (TRADITIONAL, JSON, or TREE)'),
          params: z
            .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
            .optional()
            .describe('Query parameters for parameterized queries'),
        },
      },
      handler: async ({
        query,
        format = 'TRADITIONAL',
        params,
      }: {
        query: string;
        format?: 'TRADITIONAL' | 'JSON' | 'TREE';
        params?: Array<string | number | boolean | null>;
      }) => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          const explainQuery =
            format === 'TRADITIONAL' ? `EXPLAIN ${query}` : `EXPLAIN FORMAT=${format} ${query}`;

          const [rows] = await this.executeQuery<RowDataPacket[]>(explainQuery, params);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    query,
                    format,
                    plan: rows,
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

    // Tool: mysql_processlist
    this.registerTool({
      context,
      name: 'mysql_processlist',
      schema: {
        description: 'List currently running processes/queries in the database',
        inputSchema: {
          full: z.boolean().optional().default(false).describe('Show full queries (not truncated)'),
        },
      },
      handler: async ({ full = false }: { full?: boolean }) => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          const query = full ? 'SHOW FULL PROCESSLIST' : 'SHOW PROCESSLIST';
          const [rows] = await this.executeQuery<RowDataPacket[]>(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    processes: rows,
                    count: Array.isArray(rows) ? rows.length : 0,
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

    // Tool: mysql_kill_query
    this.registerTool({
      context,
      name: 'mysql_kill_query',
      schema: {
        description: 'Kill a running query by process ID (requires FULL mode)',
        inputSchema: {
          pid: z.number().describe('Process ID of the query to kill'),
          connection: z
            .boolean()
            .optional()
            .default(false)
            .describe('Kill entire connection instead of just query'),
        },
      },
      handler: async ({ pid, connection = false }: { pid: number; connection?: boolean }) => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          const query = connection ? `KILL CONNECTION ${pid}` : `KILL QUERY ${pid}`;
          await this.executeQuery<ResultSetHeader>(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    pid,
                    action: connection ? 'killed connection' : 'killed query',
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

    // Tool: mysql_table_status
    this.registerTool({
      context,
      name: 'mysql_table_status',
      schema: {
        description: 'Get detailed status information about tables',
        inputSchema: {
          table: z
            .string()
            .optional()
            .describe('Table name (optional, all tables if not provided)'),
          database: z.string().optional().describe('Database name (default: current database)'),
        },
      },
      handler: async ({ table, database }: { table?: string; database?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          let query: string;
          let params: string[] = [];

          if (database) {
            await this.executeQuery<ResultSetHeader>('USE ??', [database]);
          }

          if (table) {
            query = 'SHOW TABLE STATUS LIKE ?';
            params = [table];
          } else {
            query = 'SHOW TABLE STATUS';
          }

          const [rows] = await this.executeQuery<RowDataPacket[]>(query, params);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    database: database || 'current',
                    ...(table && { table }),
                    status: rows,
                    count: Array.isArray(rows) ? rows.length : 0,
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

    // Tool: mysql_optimize_table
    this.registerTool({
      context,
      name: 'mysql_optimize_table',
      schema: {
        description:
          'Optimize a table to reclaim storage and improve performance (requires FULL mode)',
        inputSchema: {
          table: z.string().describe('Table name'),
          database: z.string().optional().describe('Database name (default: current database)'),
        },
      },
      handler: async ({ table, database }: { table: string; database?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          if (database) {
            await this.executeQuery<ResultSetHeader>('USE ??', [database]);
          }

          const [rows] = await this.executeQuery<RowDataPacket[]>('OPTIMIZE TABLE ??', [table]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    database: database || 'current',
                    table,
                    result: rows,
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

    // Tool: mysql_analyze_table
    this.registerTool({
      context,
      name: 'mysql_analyze_table',
      schema: {
        description: 'Analyze a table to update index statistics (requires FULL mode)',
        inputSchema: {
          table: z.string().describe('Table name'),
          database: z.string().optional().describe('Database name (default: current database)'),
        },
      },
      handler: async ({ table, database }: { table: string; database?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          if (database) {
            await this.executeQuery<ResultSetHeader>('USE ??', [database]);
          }

          const [rows] = await this.executeQuery<RowDataPacket[]>('ANALYZE TABLE ??', [table]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    database: database || 'current',
                    table,
                    result: rows,
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

    // Tool: mysql_list_triggers
    this.registerTool({
      context,
      name: 'mysql_list_triggers',
      schema: {
        description: 'List all triggers for a table or database',
        inputSchema: {
          table: z
            .string()
            .optional()
            .describe('Table name (optional, all triggers if not provided)'),
          database: z.string().optional().describe('Database name (default: current database)'),
        },
      },
      handler: async ({ table, database }: { table?: string; database?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          const query = table
            ? database
              ? `
                SELECT 
                  TRIGGER_NAME as trigger_name,
                  EVENT_MANIPULATION as event,
                  EVENT_OBJECT_TABLE as table_name,
                  ACTION_STATEMENT as action,
                  ACTION_TIMING as timing,
                  ACTION_ORIENTATION as orientation
                FROM information_schema.TRIGGERS
                WHERE TRIGGER_SCHEMA = ? AND EVENT_OBJECT_TABLE = ?
                ORDER BY TRIGGER_NAME;
              `
              : `
                SELECT 
                  TRIGGER_NAME as trigger_name,
                  EVENT_MANIPULATION as event,
                  EVENT_OBJECT_TABLE as table_name,
                  ACTION_STATEMENT as action,
                  ACTION_TIMING as timing,
                  ACTION_ORIENTATION as orientation
                FROM information_schema.TRIGGERS
                WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = ?
                ORDER BY TRIGGER_NAME;
              `
            : database
              ? `
                SELECT 
                  TRIGGER_NAME as trigger_name,
                  EVENT_MANIPULATION as event,
                  EVENT_OBJECT_TABLE as table_name,
                  ACTION_STATEMENT as action,
                  ACTION_TIMING as timing,
                  ACTION_ORIENTATION as orientation
                FROM information_schema.TRIGGERS
                WHERE TRIGGER_SCHEMA = ?
                ORDER BY EVENT_OBJECT_TABLE, TRIGGER_NAME;
              `
              : `
                SELECT 
                  TRIGGER_NAME as trigger_name,
                  EVENT_MANIPULATION as event,
                  EVENT_OBJECT_TABLE as table_name,
                  ACTION_STATEMENT as action,
                  ACTION_TIMING as timing,
                  ACTION_ORIENTATION as orientation
                FROM information_schema.TRIGGERS
                WHERE TRIGGER_SCHEMA = DATABASE()
                ORDER BY EVENT_OBJECT_TABLE, TRIGGER_NAME;
              `;

          const params: string[] = [];
          if (table && database) {
            params.push(database, table);
          } else if (table) {
            params.push(table);
          } else if (database) {
            params.push(database);
          }

          const [rows] = await this.executeQuery<RowDataPacket[]>(query, params);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    database: database || 'current',
                    ...(table && { table }),
                    triggers: rows,
                    count: Array.isArray(rows) ? rows.length : 0,
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

    // Tool: mysql_list_views
    this.registerTool({
      context,
      name: 'mysql_list_views',
      schema: {
        description: 'List all views in a database',
        inputSchema: {
          database: z.string().optional().describe('Database name (default: current database)'),
        },
      },
      handler: async ({ database }: { database?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          const query = database
            ? `
              SELECT 
                TABLE_NAME as view_name,
                VIEW_DEFINITION as definition,
                CHECK_OPTION as check_option,
                IS_UPDATABLE as is_updatable
              FROM information_schema.VIEWS
              WHERE TABLE_SCHEMA = ?
              ORDER BY TABLE_NAME;
            `
            : `
              SELECT 
                TABLE_NAME as view_name,
                VIEW_DEFINITION as definition,
                CHECK_OPTION as check_option,
                IS_UPDATABLE as is_updatable
              FROM information_schema.VIEWS
              WHERE TABLE_SCHEMA = DATABASE()
              ORDER BY TABLE_NAME;
            `;

          const [rows] = database
            ? await this.executeQuery<RowDataPacket[]>(query, [database])
            : await this.executeQuery<RowDataPacket[]>(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    database: database || 'current',
                    views: rows,
                    count: Array.isArray(rows) ? rows.length : 0,
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

    // Tool: mysql_list_procedures
    this.registerTool({
      context,
      name: 'mysql_list_procedures',
      schema: {
        description: 'List all stored procedures in a database',
        inputSchema: {
          database: z.string().optional().describe('Database name (default: current database)'),
        },
      },
      handler: async ({ database }: { database?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          const query = database
            ? `
              SELECT 
                ROUTINE_NAME as procedure_name,
                ROUTINE_TYPE as routine_type,
                DTD_IDENTIFIER as return_type,
                ROUTINE_DEFINITION as definition
              FROM information_schema.ROUTINES
              WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'
              ORDER BY ROUTINE_NAME;
            `
            : `
              SELECT 
                ROUTINE_NAME as procedure_name,
                ROUTINE_TYPE as routine_type,
                DTD_IDENTIFIER as return_type,
                ROUTINE_DEFINITION as definition
              FROM information_schema.ROUTINES
              WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'PROCEDURE'
              ORDER BY ROUTINE_NAME;
            `;

          const [rows] = database
            ? await this.executeQuery<RowDataPacket[]>(query, [database])
            : await this.executeQuery<RowDataPacket[]>(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    database: database || 'current',
                    procedures: rows,
                    count: Array.isArray(rows) ? rows.length : 0,
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

    // Tool: mysql_list_functions
    this.registerTool({
      context,
      name: 'mysql_list_functions',
      schema: {
        description: 'List all stored functions in a database',
        inputSchema: {
          database: z.string().optional().describe('Database name (default: current database)'),
        },
      },
      handler: async ({ database }: { database?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('MySQL pool not initialized');
          }

          const query = database
            ? `
              SELECT 
                ROUTINE_NAME as function_name,
                ROUTINE_TYPE as routine_type,
                DTD_IDENTIFIER as return_type,
                ROUTINE_DEFINITION as definition
              FROM information_schema.ROUTINES
              WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'FUNCTION'
              ORDER BY ROUTINE_NAME;
            `
            : `
              SELECT 
                ROUTINE_NAME as function_name,
                ROUTINE_TYPE as routine_type,
                DTD_IDENTIFIER as return_type,
                ROUTINE_DEFINITION as definition
              FROM information_schema.ROUTINES
              WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'FUNCTION'
              ORDER BY ROUTINE_NAME;
            `;

          const [rows] = database
            ? await this.executeQuery<RowDataPacket[]>(query, [database])
            : await this.executeQuery<RowDataPacket[]>(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    database: database || 'current',
                    functions: rows,
                    count: Array.isArray(rows) ? rows.length : 0,
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
   * Cleanup MySQL connection pool
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
      const [rows] = await this.executeQuery<RowDataPacket[]>('SELECT 1');
      return Array.isArray(rows) && rows.length === 1;
    } catch {
      return false;
    }
  }
}
