# MCP Server Examples

This directory contains example implementations of MCP servers using the `@nam088/mcp-core` plugin system.

## Files

- `index.ts` - Static import example (import plugins at compile time)
- `index-dynamic.ts` - Dynamic loading example (load plugins at runtime from config)
- `plugin-loader.ts` - Utility for loading plugins dynamically

## Running Examples

### Build and Run Static Example

```bash
npm run build:examples
node examples/dist/index.js
```

### Build and Run Dynamic Example

```bash
# 1. Create plugins.config.json (see ../plugins.config.example.json)
cp ../plugins.config.example.json plugins.config.json

# 2. Build and run
npm run build:examples
node examples/dist/index-dynamic.js
```

## Creating Your Own Server

These examples show how to use the core plugin system. You can:

1. Copy these files to your own project
2. Install the packages you need:
   ```bash
   npm install @nam088/mcp-core @nam088/mcp-redis
   ```
3. Customize the server to your needs
4. Add your own plugins

## See Also

- [Main README](../README.md) - Overview and quick start
- [Architecture](../ARCHITECTURE.md) - System design
- [Quick Start](../QUICK_START.md) - Vietnamese guide

