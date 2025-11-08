import type { config as ConnectionConfig, IResult, IRecordSet } from 'mssql';

/**
 * Re-export mssql types for convenience
 */
export type { IResult, IRecordSet, ConnectionConfig };

/**
 * SQL Server Plugin Configuration
 * Uses ConnectionConfig from mssql directly
 */
export type SqlServerPluginConfig = ConnectionConfig & Record<string, unknown>;

/**
 * SQL Server Query Result
 */
export interface SqlServerQueryResult<T = Record<string, unknown>> {
  recordset: T[];
  rowsAffected: number[];
  output?: Record<string, unknown>;
}

/**
 * Specific row type interfaces for type safety
 */

/**
 * Version query result
 */
export interface VersionRow {
  version: string;
}

/**
 * Database query result
 */
export interface DatabaseRow {
  name: string;
  database_id: number;
  create_date: Date;
}

/**
 * Current database result
 */
export interface CurrentDatabaseRow {
  current_database: string;
}

/**
 * Table info result
 */
export interface TableInfoRow {
  table_schema: string;
  table_name: string;
  table_type: string;
}

/**
 * Column info result
 */
export interface ColumnInfoRow {
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
}

/**
 * Index info result
 */
export interface IndexInfoRow {
  index_name: string;
  column_name: string;
  index_type: string;
  is_unique: boolean;
  is_primary_key: boolean;
  is_unique_constraint: boolean;
}

/**
 * Constraint info result
 */
export interface ConstraintInfoRow {
  constraint_name: string;
  constraint_type: string;
  column_name: string;
  foreign_table_schema: string | null;
  foreign_table_name: string | null;
  foreign_column_name: string | null;
}

/**
 * Process list result
 */
export interface ProcessListRow {
  session_id: number;
  login_name: string;
  host_name: string;
  program_name: string;
  status: string;
  command: string;
  database_name: string;
  wait_time: number;
  cpu_time: number;
}

/**
 * Table stats result
 */
export interface TableStatsRow {
  table_name: string;
  row_count: number;
  reserved_space_kb: number;
  data_space_kb: number;
  index_space_kb: number;
  unused_space_kb: number;
}

/**
 * Connection info result
 */
export interface ConnectionInfoRow {
  server_name: string;
  database_name: string;
  connection_count: number;
}
