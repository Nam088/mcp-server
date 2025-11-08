#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PluginRegistry } from '@nam088/mcp-core';
import { RedisPlugin } from '../src/index.js';

/**
 * Redis MCP Server
 * Standalone server for Redis plugin
 */
async function main(): Promise<void> {
  const server = new McpServer(
    {
      name: 'mcp-redis',
      version: '0.2.5',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Create plugin registry
  const registry = new PluginRegistry(server);

  // Register Redis plugin
  await registry.registerPlugin(RedisPlugin);

  // Connect transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log('[INFO] [MCPRedisServer] Redis MCP Server running on stdio');
}

main().catch((error) => {
  console.error('[ERROR] [MCPRedisServer] Fatal error:', error);
  process.exit(1);
});
