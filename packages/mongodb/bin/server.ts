#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PluginRegistry } from '@nam088/mcp-core';
import { MongoDBPlugin } from '../src/index.js';

/**
 * MongoDB MCP Server
 * Standalone server for MongoDB plugin
 */
async function main(): Promise<void> {
  const server = new McpServer(
    {
      name: 'mcp-mongodb',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Create plugin registry
  const registry = new PluginRegistry(server);

  // Register MongoDB plugin
  await registry.registerPlugin(MongoDBPlugin);

  // Connect transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('[ERROR] [MCPMongoDBServer] Fatal error:', error);
  process.exit(1);
});
