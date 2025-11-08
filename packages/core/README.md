# @nam088/mcp-core

Core plugin system for MCP (Model Context Protocol) server.

## Features

- **Plugin Interface**: Standard interface for all MCP plugins
- **Plugin Base Class**: Abstract base class with common functionality
- **Plugin Registry**: Manages plugin lifecycle and registration
- **TypeScript Support**: Full type definitions

## Installation

```bash
npm install @nam088/mcp-core @modelcontextprotocol/sdk
```

## Usage

### Creating a Plugin

```typescript
import { PluginBase, PluginConfig, PluginContext } from '@nam088/mcp-core';

export class MyPlugin extends PluginBase {
  readonly metadata: PluginConfig = {
    name: 'my-plugin',
    version: '1.0.0',
    description: 'My custom plugin',
  };

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);
    // Initialize your plugin resources
  }

  register(context: PluginContext): void {
    const { server } = context;
    
    // Register your tools
    server.registerTool('my_tool', {
      description: 'My custom tool',
      inputSchema: { /* ... */ }
    }, async (args) => {
      // Tool implementation
    });
  }

  async cleanup(): Promise<void> {
    await super.cleanup();
    // Cleanup your resources
  }
}
```

### Using Plugin Registry

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PluginRegistry } from '@nam088/mcp-core';
import { MyPlugin } from './my-plugin.js';

const server = new McpServer({ name: 'my-server', version: '1.0.0' });
const registry = new PluginRegistry(server);

// Register plugin
await registry.registerPlugin(MyPlugin, {
  // Plugin configuration
});

// Cleanup on shutdown
await registry.cleanup();
```

## License

MIT

