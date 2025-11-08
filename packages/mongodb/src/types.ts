import type { MongoClientOptions, Document, Filter, UpdateFilter, FindOptions } from 'mongodb';

/**
 * Re-export MongoDB types for convenience
 */
export type { Document, Filter, UpdateFilter, FindOptions };

/**
 * MongoDB Plugin Configuration
 */
export interface MongoDBPluginConfig extends Record<string, unknown> {
  /**
   * MongoDB connection URI
   * Format: mongodb://[username:password@]host[:port][/database][?options]
   * Or: mongodb+srv://[username:password@]host[/database][?options] for Atlas
   */
  uri: string;

  /**
   * Database name to connect to
   */
  database?: string;

  /**
   * MongoDB client options
   */
  options?: MongoClientOptions;
}

/**
 * MongoDB Query Result
 */
export interface MongoDBQueryResult<T = Document> {
  documents: T[];
  count?: number;
}

/**
 * MongoDB Insert Result
 */
export interface MongoDBInsertResult {
  acknowledged: boolean;
  insertedId?: unknown;
  insertedIds?: unknown[];
  insertedCount: number;
}

/**
 * MongoDB Update Result
 */
export interface MongoDBUpdateResult {
  acknowledged: boolean;
  matchedCount: number;
  modifiedCount: number;
  upsertedId?: unknown;
  upsertedCount: number;
}

/**
 * MongoDB Delete Result
 */
export interface MongoDBDeleteResult {
  acknowledged: boolean;
  deletedCount: number;
}

/**
 * Database info result
 */
export interface DatabaseInfoRow {
  name: string;
  sizeOnDisk: number;
  empty: boolean;
}

/**
 * Collection info result
 */
export interface CollectionInfoRow {
  name: string;
  type: string;
  options: Record<string, unknown>;
  info: {
    readOnly: boolean;
    uuid?: string;
  };
}

/**
 * Collection stats result
 */
export interface CollectionStatsRow {
  ns: string;
  size: number;
  count: number;
  avgObjSize: number;
  storageSize: number;
  nindexes: number;
  totalIndexSize: number;
}

/**
 * Index info result
 */
export interface IndexInfoRow {
  name: string;
  key: Record<string, number | string>;
  unique?: boolean | undefined;
  sparse?: boolean | undefined;
  expireAfterSeconds?: number | undefined;
  v: number;
}

/**
 * Server status result
 */
export interface ServerStatusRow {
  host: string;
  version: string;
  process: string;
  pid: number;
  uptime: number;
  uptimeEstimate: number;
  connections: {
    current: number;
    available: number;
    totalCreated: number;
  };
}
