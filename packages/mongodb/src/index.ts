import { z } from 'zod';
import type { Document } from 'mongodb';
import { MongoClient, type Db, type Collection } from 'mongodb';
import { PluginBase, PluginMode, type PluginConfig, type PluginContext } from '@nam088/mcp-core';
import type {
  MongoDBPluginConfig,
  MongoDBQueryResult,
  MongoDBInsertResult,
  MongoDBUpdateResult,
  MongoDBDeleteResult,
  DatabaseInfoRow,
  CollectionInfoRow,
  CollectionStatsRow,
  IndexInfoRow,
  ServerStatusRow,
} from './types.js';

/**
 * MongoDB MCP Plugin
 * Provides tools for interacting with MongoDB databases
 */
export class MongoDBPlugin extends PluginBase {
  readonly metadata: PluginConfig = {
    name: 'mongodb',
    version: '1.0.0',
    description: 'MongoDB database tools for MCP',
  };

  protected config: MongoDBPluginConfig;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  constructor(config?: Record<string, unknown>) {
    super(config);

    // Support mode from config or environment variable
    const modeFromEnv = process.env.MONGODB_MODE;
    if (config?.mode && typeof config.mode === 'string' && config.mode in PluginMode) {
      this.metadata.mode = config.mode as PluginMode;
    } else if (modeFromEnv && modeFromEnv in PluginMode) {
      this.metadata.mode = modeFromEnv as PluginMode;
    } else {
      this.metadata.mode = PluginMode.READONLY;
    }

    // Support environment variables with config override
    const database =
      (config?.database as string) || process.env.MONGODB_DATABASE || process.env.MONGODB_DB;
    const options = config?.options as MongoDBPluginConfig['options'];
    this.config = {
      uri: (config?.uri as string) || process.env.MONGODB_URI || 'mongodb://localhost:27017',
      ...(database && { database }),
      ...(options && { options }),
    };
  }

  /**
   * Initialize MongoDB connection
   */
  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);

    try {
      this.client = new MongoClient(this.config.uri, this.config.options);
      await this.client.connect();

      // If a database is specified, connect to it
      if (this.config.database) {
        this.db = this.client.db(this.config.database);
      }

      // Test connection
      await this.client.db('admin').admin().ping();
    } catch (error) {
      console.error('[ERROR] [MongoDB] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Get database instance (with optional database name override)
   */
  private getDb(databaseName?: string): Db {
    if (!this.client) {
      throw new Error('MongoDB client not initialized');
    }

    if (databaseName) {
      return this.client.db(databaseName);
    }

    if (!this.db) {
      throw new Error('No database specified. Provide database in config or query.');
    }

    return this.db;
  }

  /**
   * Get collection instance
   */
  private getCollection<T extends Document = Document>(
    collectionName: string,
    databaseName?: string,
  ): Collection<T> {
    const db = this.getDb(databaseName);
    return db.collection<T>(collectionName);
  }

  /**
   * Register MongoDB tools
   */
  register(context: PluginContext): void {
    // Tool: mongodb_find (readonly operation)
    this.registerTool({
      context,
      name: 'mongodb_find',
      schema: {
        description: 'Find documents in a MongoDB collection',
        inputSchema: {
          collection: z.string().describe('Collection name to query'),
          database: z.string().optional().describe('Database name (uses default if not specified)'),
          filter: z
            .record(z.unknown())
            .optional()
            .describe('Query filter object (MongoDB query syntax)'),
          projection: z
            .record(z.union([z.literal(0), z.literal(1)]))
            .optional()
            .describe('Fields to include/exclude (e.g., {"name": 1, "_id": 0})'),
          sort: z
            .record(z.union([z.literal(1), z.literal(-1)]))
            .optional()
            .describe('Sort order (e.g., {"age": -1, "name": 1})'),
          limit: z.number().optional().describe('Maximum number of documents to return'),
          skip: z.number().optional().describe('Number of documents to skip'),
        },
      },
      handler: async ({
        collection,
        database,
        filter = {},
        projection,
        sort,
        limit,
        skip,
      }: {
        collection: string;
        database?: string;
        filter?: Record<string, unknown>;
        projection?: Record<string, 0 | 1>;
        sort?: Record<string, 1 | -1>;
        limit?: number;
        skip?: number;
      }) => {
        try {
          const coll = this.getCollection(collection, database);

          const options: Record<string, unknown> = {};
          if (projection) options.projection = projection;
          if (sort) options.sort = sort;
          if (limit) options.limit = limit;
          if (skip) options.skip = skip;

          const documents = await coll.find(filter, options).toArray();

          const result: MongoDBQueryResult = {
            documents,
            count: documents.length,
          };

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

    // Tool: mongodb_count (readonly operation)
    this.registerTool({
      context,
      name: 'mongodb_count',
      schema: {
        description: 'Count documents in a MongoDB collection',
        inputSchema: {
          collection: z.string().describe('Collection name'),
          database: z.string().optional().describe('Database name (uses default if not specified)'),
          filter: z.record(z.unknown()).optional().describe('Query filter object'),
        },
      },
      handler: async ({
        collection,
        database,
        filter = {},
      }: {
        collection: string;
        database?: string;
        filter?: Record<string, unknown>;
      }) => {
        try {
          const coll = this.getCollection(collection, database);
          const count = await coll.countDocuments(filter);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ count }, null, 2),
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

    // Tool: mongodb_insert_one (write operation)
    this.registerTool({
      context,
      name: 'mongodb_insert_one',
      schema: {
        description: 'Insert a single document into a MongoDB collection (requires FULL mode)',
        inputSchema: {
          collection: z.string().describe('Collection name'),
          database: z.string().optional().describe('Database name (uses default if not specified)'),
          document: z.record(z.unknown()).describe('Document to insert'),
        },
      },
      handler: async ({
        collection,
        database,
        document,
      }: {
        collection: string;
        database?: string;
        document: Record<string, unknown>;
      }) => {
        try {
          const coll = this.getCollection(collection, database);
          const result = await coll.insertOne(document);

          const insertResult: MongoDBInsertResult = {
            acknowledged: result.acknowledged,
            insertedId: result.insertedId,
            insertedCount: 1,
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(insertResult, null, 2),
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

    // Tool: mongodb_insert_many (write operation)
    this.registerTool({
      context,
      name: 'mongodb_insert_many',
      schema: {
        description: 'Insert multiple documents into a MongoDB collection (requires FULL mode)',
        inputSchema: {
          collection: z.string().describe('Collection name'),
          database: z.string().optional().describe('Database name (uses default if not specified)'),
          documents: z.array(z.record(z.unknown())).describe('Array of documents to insert'),
        },
      },
      handler: async ({
        collection,
        database,
        documents,
      }: {
        collection: string;
        database?: string;
        documents: Record<string, unknown>[];
      }) => {
        try {
          const coll = this.getCollection(collection, database);
          const result = await coll.insertMany(documents);

          const insertResult: MongoDBInsertResult = {
            acknowledged: result.acknowledged,
            insertedIds: Object.values(result.insertedIds),
            insertedCount: result.insertedCount,
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(insertResult, null, 2),
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

    // Tool: mongodb_update_one (write operation)
    this.registerTool({
      context,
      name: 'mongodb_update_one',
      schema: {
        description: 'Update a single document in a MongoDB collection (requires FULL mode)',
        inputSchema: {
          collection: z.string().describe('Collection name'),
          database: z.string().optional().describe('Database name (uses default if not specified)'),
          filter: z.record(z.unknown()).describe('Query filter to find document to update'),
          update: z
            .record(z.unknown())
            .describe('Update operations (e.g., {"$set": {"field": "value"}})'),
          upsert: z.boolean().optional().describe('Create document if it does not exist'),
        },
      },
      handler: async ({
        collection,
        database,
        filter,
        update,
        upsert = false,
      }: {
        collection: string;
        database?: string;
        filter: Record<string, unknown>;
        update: Record<string, unknown>;
        upsert?: boolean;
      }) => {
        try {
          const coll = this.getCollection(collection, database);
          const result = await coll.updateOne(filter, update, { upsert });

          const updateResult: MongoDBUpdateResult = {
            acknowledged: result.acknowledged,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            upsertedId: result.upsertedId,
            upsertedCount: result.upsertedCount,
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(updateResult, null, 2),
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

    // Tool: mongodb_update_many (write operation)
    this.registerTool({
      context,
      name: 'mongodb_update_many',
      schema: {
        description: 'Update multiple documents in a MongoDB collection (requires FULL mode)',
        inputSchema: {
          collection: z.string().describe('Collection name'),
          database: z.string().optional().describe('Database name (uses default if not specified)'),
          filter: z.record(z.unknown()).describe('Query filter to find documents to update'),
          update: z
            .record(z.unknown())
            .describe('Update operations (e.g., {"$set": {"field": "value"}})'),
          upsert: z.boolean().optional().describe('Create document if no matches found'),
        },
      },
      handler: async ({
        collection,
        database,
        filter,
        update,
        upsert = false,
      }: {
        collection: string;
        database?: string;
        filter: Record<string, unknown>;
        update: Record<string, unknown>;
        upsert?: boolean;
      }) => {
        try {
          const coll = this.getCollection(collection, database);
          const result = await coll.updateMany(filter, update, { upsert });

          const updateResult: MongoDBUpdateResult = {
            acknowledged: result.acknowledged,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            upsertedId: result.upsertedId,
            upsertedCount: result.upsertedCount,
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(updateResult, null, 2),
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

    // Tool: mongodb_delete_one (write operation)
    this.registerTool({
      context,
      name: 'mongodb_delete_one',
      schema: {
        description: 'Delete a single document from a MongoDB collection (requires FULL mode)',
        inputSchema: {
          collection: z.string().describe('Collection name'),
          database: z.string().optional().describe('Database name (uses default if not specified)'),
          filter: z.record(z.unknown()).describe('Query filter to find document to delete'),
        },
      },
      handler: async ({
        collection,
        database,
        filter,
      }: {
        collection: string;
        database?: string;
        filter: Record<string, unknown>;
      }) => {
        try {
          const coll = this.getCollection(collection, database);
          const result = await coll.deleteOne(filter);

          const deleteResult: MongoDBDeleteResult = {
            acknowledged: result.acknowledged,
            deletedCount: result.deletedCount,
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(deleteResult, null, 2),
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

    // Tool: mongodb_delete_many (write operation)
    this.registerTool({
      context,
      name: 'mongodb_delete_many',
      schema: {
        description: 'Delete multiple documents from a MongoDB collection (requires FULL mode)',
        inputSchema: {
          collection: z.string().describe('Collection name'),
          database: z.string().optional().describe('Database name (uses default if not specified)'),
          filter: z.record(z.unknown()).describe('Query filter to find documents to delete'),
        },
      },
      handler: async ({
        collection,
        database,
        filter,
      }: {
        collection: string;
        database?: string;
        filter: Record<string, unknown>;
      }) => {
        try {
          const coll = this.getCollection(collection, database);
          const result = await coll.deleteMany(filter);

          const deleteResult: MongoDBDeleteResult = {
            acknowledged: result.acknowledged,
            deletedCount: result.deletedCount,
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(deleteResult, null, 2),
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

    // Tool: mongodb_aggregate (readonly operation)
    this.registerTool({
      context,
      name: 'mongodb_aggregate',
      schema: {
        description: 'Run an aggregation pipeline on a MongoDB collection',
        inputSchema: {
          collection: z.string().describe('Collection name'),
          database: z.string().optional().describe('Database name (uses default if not specified)'),
          pipeline: z
            .array(z.record(z.unknown()))
            .describe('Aggregation pipeline stages (array of stage objects)'),
        },
      },
      handler: async ({
        collection,
        database,
        pipeline,
      }: {
        collection: string;
        database?: string;
        pipeline: Record<string, unknown>[];
      }) => {
        try {
          const coll = this.getCollection(collection, database);
          const documents = await coll.aggregate(pipeline).toArray();

          const result: MongoDBQueryResult = {
            documents,
            count: documents.length,
          };

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

    // Tool: mongodb_list_databases
    this.registerTool({
      context,
      name: 'mongodb_list_databases',
      schema: {
        description: 'List all databases on the MongoDB server',
        inputSchema: {},
      },
      handler: async () => {
        try {
          if (!this.client) {
            throw new Error('MongoDB client not initialized');
          }

          const adminDb = this.client.db('admin').admin();
          const { databases } = await adminDb.listDatabases();

          const result: DatabaseInfoRow[] = databases.map((db) => ({
            name: db.name,
            sizeOnDisk: db.sizeOnDisk ?? 0,
            empty: db.empty ?? false,
          }));

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

    // Tool: mongodb_list_collections
    this.registerTool({
      context,
      name: 'mongodb_list_collections',
      schema: {
        description: 'List all collections in a MongoDB database',
        inputSchema: {
          database: z.string().optional().describe('Database name (uses default if not specified)'),
        },
      },
      handler: async ({ database }: { database?: string }) => {
        try {
          const db = this.getDb(database);
          const collections = await db.listCollections().toArray();

          const result: CollectionInfoRow[] = collections.map((coll) => ({
            name: coll.name,
            type: coll.type ?? 'collection',
            options: (coll as unknown as { options?: Record<string, unknown> }).options ?? {},
            info: (coll as unknown as { info?: { readOnly: boolean; uuid?: string } }).info ?? {
              readOnly: false,
            },
          }));

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

    // Tool: mongodb_collection_stats
    this.registerTool({
      context,
      name: 'mongodb_collection_stats',
      schema: {
        description: 'Get statistics about a MongoDB collection',
        inputSchema: {
          collection: z.string().describe('Collection name'),
          database: z.string().optional().describe('Database name (uses default if not specified)'),
        },
      },
      handler: async ({ collection, database }: { collection: string; database?: string }) => {
        try {
          const db = this.getDb(database);
          const stats = await db.command({ collStats: collection });

          const result: CollectionStatsRow = {
            ns: stats.ns as string,
            size: stats.size as number,
            count: stats.count as number,
            avgObjSize: stats.avgObjSize as number,
            storageSize: stats.storageSize as number,
            nindexes: stats.nindexes as number,
            totalIndexSize: stats.totalIndexSize as number,
          };

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

    // Tool: mongodb_list_indexes
    this.registerTool({
      context,
      name: 'mongodb_list_indexes',
      schema: {
        description: 'List all indexes on a MongoDB collection',
        inputSchema: {
          collection: z.string().describe('Collection name'),
          database: z.string().optional().describe('Database name (uses default if not specified)'),
        },
      },
      handler: async ({ collection, database }: { collection: string; database?: string }) => {
        try {
          const coll = this.getCollection(collection, database);
          const indexes = await coll.indexes();

          const result: IndexInfoRow[] = indexes.map((idx) => ({
            name: idx.name ?? '',
            key: idx.key,
            unique: idx.unique,
            sparse: idx.sparse,
            expireAfterSeconds: idx.expireAfterSeconds,
            v: idx.v ?? 2,
          }));

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

    // Tool: mongodb_create_index (write operation)
    this.registerTool({
      context,
      name: 'mongodb_create_index',
      schema: {
        description: 'Create an index on a MongoDB collection (requires FULL mode)',
        inputSchema: {
          collection: z.string().describe('Collection name'),
          database: z.string().optional().describe('Database name (uses default if not specified)'),
          keys: z
            .record(z.union([z.literal(1), z.literal(-1)]))
            .describe(
              'Index keys (e.g., {"field": 1} for ascending, {"field": -1} for descending)',
            ),
          options: z
            .object({
              unique: z.boolean().optional(),
              sparse: z.boolean().optional(),
              name: z.string().optional(),
              expireAfterSeconds: z.number().optional(),
            })
            .optional()
            .describe('Index options'),
        },
      },
      handler: async ({
        collection,
        database,
        keys,
        options,
      }: {
        collection: string;
        database?: string;
        keys: Record<string, 1 | -1>;
        options?: {
          unique?: boolean;
          sparse?: boolean;
          name?: string;
          expireAfterSeconds?: number;
        };
      }) => {
        try {
          const coll = this.getCollection(collection, database);
          const indexName = await coll.createIndex(keys, options);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ indexName }, null, 2),
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

    // Tool: mongodb_drop_index (write operation)
    this.registerTool({
      context,
      name: 'mongodb_drop_index',
      schema: {
        description: 'Drop an index from a MongoDB collection (requires FULL mode)',
        inputSchema: {
          collection: z.string().describe('Collection name'),
          database: z.string().optional().describe('Database name (uses default if not specified)'),
          indexName: z.string().describe('Name of the index to drop'),
        },
      },
      handler: async ({
        collection,
        database,
        indexName,
      }: {
        collection: string;
        database?: string;
        indexName: string;
      }) => {
        try {
          const coll = this.getCollection(collection, database);
          await coll.dropIndex(indexName);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { success: true, message: `Index '${indexName}' dropped` },
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

    // Tool: mongodb_server_status
    this.registerTool({
      context,
      name: 'mongodb_server_status',
      schema: {
        description: 'Get MongoDB server status information',
        inputSchema: {},
      },
      handler: async () => {
        try {
          if (!this.client) {
            throw new Error('MongoDB client not initialized');
          }

          const adminDb = this.client.db('admin');
          const status = await adminDb.command({ serverStatus: 1 });

          const result: ServerStatusRow = {
            host: status.host as string,
            version: status.version as string,
            process: status.process as string,
            pid: status.pid as number,
            uptime: status.uptime as number,
            uptimeEstimate: status.uptimeEstimate as number,
            connections: {
              current: (status.connections as { current: number }).current,
              available: (status.connections as { available: number }).available,
              totalCreated: (status.connections as { totalCreated: number }).totalCreated,
            },
          };

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
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
    await super.cleanup();
  }
}

// Export the plugin instance factory
export default function createPlugin(config?: Record<string, unknown>): MongoDBPlugin {
  return new MongoDBPlugin(config);
}
