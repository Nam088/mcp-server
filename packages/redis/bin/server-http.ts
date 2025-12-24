#!/usr/bin/env node

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { PluginRegistry } from '@nam088/mcp-core';
import { RedisPlugin } from '../src/index.js';
import { randomUUID } from 'node:crypto';

/**
 * Redis MCP Server - HTTP Mode
 * Single instance server that can handle multiple clients via HTTP
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

  // Store transports for each session
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // Create HTTP server
  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Use async IIFE to handle async operations
    void (async (): Promise<void> => {
      try {
        // Parse request body for POST requests
        let parsedBody: unknown = undefined;
        if (req.method === 'POST') {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(chunk as Buffer);
          }
          const body = Buffer.concat(chunks).toString();
          if (body) {
            try {
              parsedBody = JSON.parse(body);
            } catch {
              parsedBody = body;
            }
          }
        }

        // Get session ID from header or query
        const sessionId =
          (req.headers['x-session-id'] as string) ||
          new URL(req.url || '/', `http://${req.headers.host}`).searchParams.get('sessionId') ||
          undefined;

        // Handle session management
        if (sessionId && !transports.has(sessionId)) {
          // Session not found
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Session not found' }));
          return;
        }

        // Create or get transport for this session
        let transport = sessionId ? transports.get(sessionId) : undefined;

        if (!transport) {
          // Create new transport for new session
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: (): string => randomUUID(),
            onsessionclosed: (id: string): void => {
              transports.delete(id);
              console.log(`[INFO] [MCPRedisServer] Session closed: ${id}`);
            },
          });

          const newSessionId = transport.sessionId;
          if (newSessionId) {
            transports.set(newSessionId, transport);
            console.log(`[INFO] [MCPRedisServer] New session created: ${newSessionId}`);
          }

          // Connect server to transport
          await server.connect(transport);

          // Set session ID in response header
          if (newSessionId) {
            res.setHeader('X-Session-Id', newSessionId);
          }
        }

        // Handle the request
        await transport.handleRequest(req, res, parsedBody);
      } catch (error) {
        console.error('[ERROR] [MCPRedisServer] Request error:', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }
    })();
  });

  // Get port from environment or use default
  const port = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3000;
  const host = process.env.MCP_HOST || 'localhost';

  httpServer.listen(port, host, () => {
    console.log(`[INFO] [MCPRedisServer] Redis MCP Server running on http://${host}:${port}`);

    // Display Redis connection info
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING;
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';
    const redisMode = process.env.REDIS_MODE || 'READONLY';

    if (redisUrl) {
      try {
        const url = new URL(redisUrl);
        const redisHostname = url.hostname;
        const redisPortNum = url.port || (url.protocol === 'rediss:' ? '6380' : '6379');
        console.log(
          `[INFO] [MCPRedisServer] Redis connection: ${redisHostname}:${redisPortNum} (mode: ${redisMode})`,
        );
      } catch {
        console.log(`[INFO] [MCPRedisServer] Redis connection: ${redisUrl} (mode: ${redisMode})`);
      }
    } else {
      console.log(
        `[INFO] [MCPRedisServer] Redis connection: ${redisHost}:${redisPort} (mode: ${redisMode})`,
      );
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[INFO] [MCPRedisServer] Shutting down...');
    httpServer.close(() => {
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('[INFO] [MCPRedisServer] Shutting down...');
    httpServer.close(() => {
      process.exit(0);
    });
  });
}

main().catch((error) => {
  console.error('[ERROR] [MCPRedisServer] Fatal error:', error);
  process.exit(1);
});
