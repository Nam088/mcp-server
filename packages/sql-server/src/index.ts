import { z } from 'zod';
import sql, { type ConnectionPool } from 'mssql';
import { PluginBase, PluginMode, type PluginConfig, type PluginContext } from '@nam088/mcp-core';
import type {
  SqlServerPluginConfig,
  SqlServerQueryResult,
  IResult,
  VersionRow,
  DatabaseRow,
  CurrentDatabaseRow,
  TableInfoRow,
  ColumnInfoRow,
  IndexInfoRow,
  ConstraintInfoRow,
  ProcessListRow,
  TableStatsRow,
} from './types.js';

/**
 * SQL Server (MSSQL) MCP Plugin
 * Provides tools for interacting with Microsoft SQL Server databases
 */
export class SqlServerPlugin extends PluginBase {
  readonly metadata: PluginConfig = {
    name: 'sql-server',
    version: '1.0.0',
    description: 'Microsoft SQL Server database tools for MCP',
  };

  protected config: SqlServerPluginConfig;
  private pool: ConnectionPool | null = null;

  constructor(config?: Record<string, unknown>) {
    super(config);

    // Support mode from config or environment variable
    const modeFromEnv = process.env.MSSQL_MODE;
    if (config?.mode && typeof config.mode === 'string' && config.mode in PluginMode) {
      this.metadata.mode = config.mode as PluginMode;
    } else if (modeFromEnv && modeFromEnv in PluginMode) {
      this.metadata.mode = modeFromEnv as PluginMode;
    } else {
      this.metadata.mode = PluginMode.READONLY;
    }

    // Support environment variables with config override
    const password = (config?.password as string) || process.env.MSSQL_PASSWORD;

    this.config = {
      server: (config?.server as string) || process.env.MSSQL_HOST || 'localhost',
      port: (config?.port as number) || parseInt(process.env.MSSQL_PORT || '1433'),
      user: (config?.user as string) || process.env.MSSQL_USER || 'sa',
      ...(password && { password }),
      database: (config?.database as string) || process.env.MSSQL_DATABASE || process.env.MSSQL_DB,
      options: {
        encrypt: (config?.encrypt as boolean) ?? true, // Use encryption by default
        trustServerCertificate: (config?.trustServerCertificate as boolean) ?? false,
        enableArithAbort: true,
        ...(config?.options as Record<string, unknown>),
      },
      pool: {
        max: (config?.poolMax as number) || parseInt(process.env.MSSQL_POOL_MAX || '10'),
        min: (config?.poolMin as number) || parseInt(process.env.MSSQL_POOL_MIN || '0'),
        idleTimeoutMillis:
          (config?.idleTimeout as number) || parseInt(process.env.MSSQL_IDLE_TIMEOUT || '30000'),
      },
      connectionTimeout:
        (config?.connectionTimeout as number) ||
        parseInt(process.env.MSSQL_CONNECTION_TIMEOUT || '15000'),
      requestTimeout:
        (config?.requestTimeout as number) ||
        parseInt(process.env.MSSQL_REQUEST_TIMEOUT || '15000'),
    };
  }

  /**
   * Initialize SQL Server connection pool
   */
  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);

    try {
      this.pool = await sql.connect(this.config);

      // Test connection
      await this.pool.request().query('SELECT 1');
    } catch (error) {
      console.error('[ERROR] [SQL Server] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Helper method to execute queries with proper typing
   */
  private async executeQuery<T = Record<string, unknown>>(
    query: string,
    params?: Record<string, string | number | boolean | null>,
  ): Promise<IResult<T>> {
    if (!this.pool) {
      throw new Error('SQL Server pool not initialized');
    }

    const request = this.pool.request();

    // Add parameters if provided
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
      }
    }

    return request.query<T>(query);
  }

  /**
   * Register SQL Server tools
   */
  register(context: PluginContext): void {
    // Tool: sqlserver_query (readonly operation)
    this.registerTool({
      context,
      name: 'sqlserver_query',
      schema: {
        description: 'Execute a SELECT query on SQL Server database',
        inputSchema: {
          query: z.string().describe('SQL SELECT query to execute'),
          params: z
            .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
            .optional()
            .describe('Named parameters for parameterized queries (e.g., {"id": 1})'),
        },
      },
      handler: async ({
        query,
        params,
      }: {
        query: string;
        params?: Record<string, string | number | boolean | null>;
      }) => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          // Validate that query is a SELECT statement
          const trimmedQuery = query.trim().toLowerCase();
          if (
            !trimmedQuery.startsWith('select') &&
            !trimmedQuery.startsWith('with') &&
            !trimmedQuery.startsWith('exec sp_help') &&
            !trimmedQuery.startsWith('exec sp_columns')
          ) {
            throw new Error(
              'Only SELECT queries are allowed. Use sqlserver_execute for other operations.',
            );
          }

          const result = await this.executeQuery(query, params);

          const resultData: SqlServerQueryResult = {
            recordset: result.recordset,
            rowsAffected: result.rowsAffected,
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

    // Tool: sqlserver_execute (write operation)
    this.registerTool({
      context,
      name: 'sqlserver_execute',
      schema: {
        description: 'Execute an INSERT, UPDATE, DELETE, or DDL query (requires FULL mode)',
        inputSchema: {
          query: z.string().describe('SQL query to execute'),
          params: z
            .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
            .optional()
            .describe('Named parameters for parameterized queries'),
        },
      },
      handler: async ({
        query,
        params,
      }: {
        query: string;
        params?: Record<string, string | number | boolean | null>;
      }) => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          const result = await this.executeQuery(query, params);

          const resultData: SqlServerQueryResult = {
            recordset: result.recordset,
            rowsAffected: result.rowsAffected,
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

    // Tool: sqlserver_list_databases
    this.registerTool({
      context,
      name: 'sqlserver_list_databases',
      schema: {
        description: 'List all databases in the SQL Server instance',
        inputSchema: {},
      },
      handler: async () => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          const query = `
            SELECT 
              name,
              database_id,
              create_date
            FROM sys.databases
            WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
            ORDER BY name;
          `;

          const result = await this.executeQuery<DatabaseRow>(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    databases: result.recordset,
                    count: result.recordset.length,
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

    // Tool: sqlserver_list_tables
    this.registerTool({
      context,
      name: 'sqlserver_list_tables',
      schema: {
        description: 'List all tables in the database or a specific schema',
        inputSchema: {
          schema: z.string().optional().default('dbo').describe('Schema name (default: dbo)'),
        },
      },
      handler: async ({ schema = 'dbo' }: { schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          const query = `
            SELECT 
              TABLE_SCHEMA as table_schema,
              TABLE_NAME as table_name,
              TABLE_TYPE as table_type
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = @schema
            ORDER BY TABLE_NAME;
          `;

          const result = await this.executeQuery<TableInfoRow>(query, { schema });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    tables: result.recordset,
                    count: result.recordset.length,
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

    // Tool: sqlserver_describe_table
    this.registerTool({
      context,
      name: 'sqlserver_describe_table',
      schema: {
        description: 'Get detailed information about a table structure',
        inputSchema: {
          table: z.string().describe('Table name'),
          schema: z.string().optional().default('dbo').describe('Schema name (default: dbo)'),
        },
      },
      handler: async ({ table, schema = 'dbo' }: { table: string; schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          const query = `
            SELECT 
              COLUMN_NAME as column_name,
              DATA_TYPE as data_type,
              CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
              NUMERIC_PRECISION as numeric_precision,
              NUMERIC_SCALE as numeric_scale,
              IS_NULLABLE as is_nullable,
              COLUMN_DEFAULT as column_default,
              ORDINAL_POSITION as ordinal_position
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
            ORDER BY ORDINAL_POSITION;
          `;

          const result = await this.executeQuery<ColumnInfoRow>(query, { schema, table });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    table,
                    columns: result.recordset,
                    columnCount: result.recordset.length,
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

    // Tool: sqlserver_list_schemas
    this.registerTool({
      context,
      name: 'sqlserver_list_schemas',
      schema: {
        description: 'List all schemas in the database',
        inputSchema: {},
      },
      handler: async () => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          const query = `
            SELECT 
              name as schema_name,
              schema_id
            FROM sys.schemas
            WHERE name NOT IN ('db_owner', 'db_accessadmin', 'db_securityadmin', 
                               'db_ddladmin', 'db_backupoperator', 'db_datareader', 
                               'db_datawriter', 'db_denydatareader', 'db_denydatawriter')
            ORDER BY name;
          `;

          const result = await this.executeQuery(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schemas: result.recordset,
                    count: result.recordset.length,
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

    // Tool: sqlserver_list_indexes
    this.registerTool({
      context,
      name: 'sqlserver_list_indexes',
      schema: {
        description: 'List all indexes for a table',
        inputSchema: {
          table: z.string().describe('Table name'),
          schema: z.string().optional().default('dbo').describe('Schema name (default: dbo)'),
        },
      },
      handler: async ({ table, schema = 'dbo' }: { table: string; schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          const query = `
            SELECT 
              i.name as index_name,
              c.name as column_name,
              i.type_desc as index_type,
              i.is_unique as is_unique,
              i.is_primary_key as is_primary_key,
              i.is_unique_constraint as is_unique_constraint
            FROM sys.indexes i
            INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            WHERE i.object_id = OBJECT_ID(@schema + '.' + @table)
            ORDER BY i.name, ic.index_column_id;
          `;

          const result = await this.executeQuery<IndexInfoRow>(query, { schema, table });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    table,
                    indexes: result.recordset,
                    count: result.recordset.length,
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

    // Tool: sqlserver_database_info
    this.registerTool({
      context,
      name: 'sqlserver_database_info',
      schema: {
        description: 'Get SQL Server database server information',
        inputSchema: {},
      },
      handler: async () => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          const versionQuery = 'SELECT @@VERSION as version';
          const dbQuery = 'SELECT DB_NAME() as current_database';
          const connectionQuery = `
            SELECT 
              @@SERVERNAME as server_name,
              COUNT(*) as connection_count
            FROM sys.dm_exec_sessions
            WHERE is_user_process = 1;
          `;

          const [versionResult, dbResult, connectionResult] = await Promise.all([
            this.executeQuery<VersionRow>(versionQuery),
            this.executeQuery<CurrentDatabaseRow>(dbQuery),
            this.executeQuery(connectionQuery),
          ]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    version: versionResult.recordset[0]?.version ?? null,
                    current_database: dbResult.recordset[0]?.current_database ?? null,
                    server_info: connectionResult.recordset[0] ?? null,
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

    // Tool: sqlserver_list_constraints
    this.registerTool({
      context,
      name: 'sqlserver_list_constraints',
      schema: {
        description: 'List all constraints for a table (foreign keys, primary keys, unique, check)',
        inputSchema: {
          table: z.string().describe('Table name'),
          schema: z.string().optional().default('dbo').describe('Schema name (default: dbo)'),
        },
      },
      handler: async ({ table, schema = 'dbo' }: { table: string; schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          const query = `
            SELECT 
              tc.CONSTRAINT_NAME as constraint_name,
              tc.CONSTRAINT_TYPE as constraint_type,
              kcu.COLUMN_NAME as column_name,
              fk.TABLE_SCHEMA as foreign_table_schema,
              fk.TABLE_NAME as foreign_table_name,
              fk.COLUMN_NAME as foreign_column_name
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
              ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
              AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
              AND tc.TABLE_NAME = kcu.TABLE_NAME
            LEFT JOIN (
              SELECT 
                fk.name as CONSTRAINT_NAME,
                OBJECT_SCHEMA_NAME(fk.referenced_object_id) as TABLE_SCHEMA,
                OBJECT_NAME(fk.referenced_object_id) as TABLE_NAME,
                COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) as COLUMN_NAME
              FROM sys.foreign_keys fk
              INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
            ) fk ON tc.CONSTRAINT_NAME = fk.CONSTRAINT_NAME
            WHERE tc.TABLE_SCHEMA = @schema AND tc.TABLE_NAME = @table
            ORDER BY tc.CONSTRAINT_TYPE, tc.CONSTRAINT_NAME;
          `;

          const result = await this.executeQuery<ConstraintInfoRow>(query, { schema, table });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    table,
                    constraints: result.recordset,
                    count: result.recordset.length,
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

    // Tool: sqlserver_explain_query
    this.registerTool({
      context,
      name: 'sqlserver_explain_query',
      schema: {
        description: 'Get query execution plan',
        inputSchema: {
          query: z.string().describe('SQL query to explain'),
          params: z
            .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
            .optional()
            .describe('Named parameters for parameterized queries'),
        },
      },
      handler: async ({
        query,
        params,
      }: {
        query: string;
        params?: Record<string, string | number | boolean | null>;
      }) => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          // Use SHOWPLAN_XML to get execution plan
          const explainQuery = `
            SET SHOWPLAN_XML ON;
            ${query};
            SET SHOWPLAN_XML OFF;
          `;

          const result = await this.executeQuery(explainQuery, params);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    query,
                    plan: result.recordset,
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

    // Tool: sqlserver_active_sessions
    this.registerTool({
      context,
      name: 'sqlserver_active_sessions',
      schema: {
        description: 'List currently active sessions in the database',
        inputSchema: {
          include_system: z.boolean().optional().default(false).describe('Include system sessions'),
        },
      },
      handler: async ({ include_system = false }: { include_system?: boolean }) => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          const query = `
            SELECT 
              s.session_id,
              s.login_name,
              s.host_name,
              s.program_name,
              s.status,
              r.command,
              DB_NAME(s.database_id) as database_name,
              r.wait_time,
              r.cpu_time
            FROM sys.dm_exec_sessions s
            LEFT JOIN sys.dm_exec_requests r ON s.session_id = r.session_id
            WHERE ${include_system ? '1=1' : 's.is_user_process = 1'}
            ORDER BY s.session_id;
          `;

          const result = await this.executeQuery<ProcessListRow>(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    sessions: result.recordset,
                    count: result.recordset.length,
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

    // Tool: sqlserver_kill_session
    this.registerTool({
      context,
      name: 'sqlserver_kill_session',
      schema: {
        description: 'Kill a session by session ID (requires FULL mode)',
        inputSchema: {
          session_id: z.number().describe('Session ID to kill'),
        },
      },
      handler: async ({ session_id }: { session_id: number }) => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          const query = `KILL ${session_id}`;
          await this.executeQuery(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    session_id,
                    action: 'killed session',
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

    // Tool: sqlserver_table_stats
    this.registerTool({
      context,
      name: 'sqlserver_table_stats',
      schema: {
        description: 'Get statistics about a table (size, row count, index size, etc)',
        inputSchema: {
          table: z.string().describe('Table name'),
          schema: z.string().optional().default('dbo').describe('Schema name (default: dbo)'),
        },
      },
      handler: async ({ table, schema = 'dbo' }: { table: string; schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          const query = `
            SELECT 
              t.NAME as table_name,
              p.rows as row_count,
              SUM(a.total_pages) * 8 as reserved_space_kb,
              SUM(a.used_pages) * 8 as data_space_kb,
              (SUM(a.total_pages) - SUM(a.used_pages)) * 8 as unused_space_kb,
              SUM(CASE WHEN i.index_id > 0 THEN a.used_pages ELSE 0 END) * 8 as index_space_kb
            FROM sys.tables t
            INNER JOIN sys.indexes i ON t.OBJECT_ID = i.object_id
            INNER JOIN sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
            INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
            WHERE t.NAME = @table AND SCHEMA_NAME(t.schema_id) = @schema
            GROUP BY t.Name, p.Rows;
          `;

          const result = await this.executeQuery<TableStatsRow>(query, { schema, table });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    table,
                    stats: result.recordset[0] ?? null,
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

    // Tool: sqlserver_rebuild_index
    this.registerTool({
      context,
      name: 'sqlserver_rebuild_index',
      schema: {
        description: 'Rebuild an index on a table (requires FULL mode)',
        inputSchema: {
          table: z.string().describe('Table name'),
          index: z
            .string()
            .optional()
            .describe('Index name (optional, rebuilds all indexes if not provided)'),
          schema: z.string().optional().default('dbo').describe('Schema name (default: dbo)'),
        },
      },
      handler: async ({
        table,
        index,
        schema = 'dbo',
      }: {
        table: string;
        index?: string;
        schema?: string;
      }) => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          const query = index
            ? `ALTER INDEX [${index}] ON [${schema}].[${table}] REBUILD`
            : `ALTER INDEX ALL ON [${schema}].[${table}] REBUILD`;

          await this.executeQuery(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    table,
                    index: index || 'all',
                    action: 'rebuilt',
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

    // Tool: sqlserver_update_statistics
    this.registerTool({
      context,
      name: 'sqlserver_update_statistics',
      schema: {
        description: 'Update statistics for a table (requires FULL mode)',
        inputSchema: {
          table: z.string().describe('Table name'),
          schema: z.string().optional().default('dbo').describe('Schema name (default: dbo)'),
        },
      },
      handler: async ({ table, schema = 'dbo' }: { table: string; schema?: string }) => {
        try {
          if (!this.pool) {
            throw new Error('SQL Server pool not initialized');
          }

          const query = `UPDATE STATISTICS [${schema}].[${table}]`;
          await this.executeQuery(query);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    schema,
                    table,
                    action: 'updated statistics',
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
  }

  /**
   * Cleanup SQL Server connection pool
   */
  async cleanup(): Promise<void> {
    await super.cleanup();
    if (this.pool) {
      await this.pool.close();
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
      const result = await this.executeQuery('SELECT 1');
      return result.recordset.length === 1;
    } catch {
      return false;
    }
  }
}
