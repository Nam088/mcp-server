#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PluginRegistry } from '@nam088/mcp-core';
import { SwaggerParserPlugin } from '../src/index.js';

/**
 * Swagger Parser MCP Server
 * Standalone server for Swagger/OpenAPI plugin
 */
async function main(): Promise<void> {
  const server = new McpServer(
    {
      name: 'mcp-swagger-parser',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Create plugin registry
  const registry = new PluginRegistry(server);

  // Register SwaggerParser plugin
  // We pass config via environment variables, or it falls back to defaults/empty
  // Use SWAGGER_URL or SWAGGER_JSON env vars to configure
  const config = {
    url: process.env.SWAGGER_URL || 'http://localhost:3000/docs-json',
    json: process.env.SWAGGER_JSON
      ? (JSON.parse(process.env.SWAGGER_JSON) as Record<string, unknown>)
      : undefined,
  };

  await registry.registerPlugin(SwaggerParserPlugin, { config });

  // Connect transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('[ERROR] [MCPSwaggerServer] Fatal error:', error);
  process.exit(1);
});
