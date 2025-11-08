import type { PoolOptions, RowDataPacket, FieldPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * Re-export mysql2/promise types for convenience
 */
export type { RowDataPacket, FieldPacket, ResultSetHeader };

/**
 * MySQL Plugin Configuration
 * Uses PoolOptions from mysql2/promise directly
 */
export type MysqlPluginConfig = PoolOptions;

/**
 * MySQL Query Result
 */
export interface MysqlQueryResult<T = RowDataPacket> {
  rows: T[];
  rowCount: number;
  fields?: Array<{ name: string; type: string }> | undefined;
}

/**
 * Specific row type interfaces for type safety
 */

/**
 * Version query result
 */
export interface VersionRow extends RowDataPacket {
  version: string;
}

/**
 * Database query result
 */
export interface DatabaseRow extends RowDataPacket {
  current_database: string | null;
}

/**
 * MySQL Table Info
 */
export interface MysqlTableInfo {
  table_name: string;
  table_type: string;
  engine?: string;
  table_rows?: number;
  data_length?: number;
  index_length?: number;
}

/**
 * MySQL Column Info
 */
export interface MysqlColumnInfo {
  column_name: string;
  data_type: string;
  column_type: string;
  is_nullable: string;
  column_default: string | null;
  column_key: string;
  extra: string;
}
