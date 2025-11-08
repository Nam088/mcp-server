#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PluginRegistry } from '@nam088/mcp-core';
import { MysqlPlugin } from '../src/index.js';

/**
 * MySQL MCP Server
 * Standalone server for MySQL plugin
 */
async function main(): Promise<void> {
  const server = new McpServer(
    {
      name: 'mcp-mysql',
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

  // Register MySQL plugin
  await registry.registerPlugin(MysqlPlugin);

  // Connect transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('[ERROR] [MCPMysqlServer] Fatal error:', error);
  process.exit(1);
});
