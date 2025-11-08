#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PluginRegistry } from '@nam088/mcp-core';
import { SqlServerPlugin } from '../src/index.js';

/**
 * SQL Server MCP Server
 * Standalone server for SQL Server plugin
 */
async function main(): Promise<void> {
  const server = new McpServer(
    {
      name: 'mcp-sql-server',
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

  // Register SQL Server plugin
  await registry.registerPlugin(SqlServerPlugin);

  // Connect transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('[ERROR] [MCPSqlServerServer] Fatal error:', error);
  process.exit(1);
});
