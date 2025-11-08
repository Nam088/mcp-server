#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PluginRegistry } from '@nam088/mcp-core';
import { PostgresPlugin } from '../src/index.js';

/**
 * PostgreSQL MCP Server
 * Standalone server for PostgreSQL plugin
 */
async function main(): Promise<void> {
  const server = new McpServer(
    {
      name: 'mcp-postgres',
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

  // Register PostgreSQL plugin
  await registry.registerPlugin(PostgresPlugin);

  // Connect transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('[ERROR] [MCPPostgresServer] Fatal error:', error);
  process.exit(1);
});
