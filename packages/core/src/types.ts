import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';

/**
 * Plugin access mode
 */
export enum PluginMode {
  /**
   * Read-only mode - only read operations allowed
   */
  READONLY = 'readonly',

  /**
   * Full mode - all operations allowed
   */
  FULL = 'full',
}

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  /**
   * Plugin name
   */
  name: string;

  /**
   * Plugin version
   */
  version: string;

  /**
   * Plugin description
   */
  description?: string;

  /**
   * Plugin access mode (default: FULL)
   */
  mode?: PluginMode;

  /**
   * Plugin-specific configuration
   */
  config?: Record<string, unknown>;
}

/**
 * Context provided to plugins
 */
export interface PluginContext {
  /**
   * MCP Server instance
   */
  server: McpServer;

  /**
   * Request handler extra context
   */
  extra?: RequestHandlerExtra<ServerRequest, ServerNotification>;
}

/**
 * Base Plugin interface that all plugins must implement
 */
export interface IPlugin {
  /**
   * Plugin metadata
   */
  readonly metadata: PluginConfig;

  /**
   * Initialize the plugin
   * Called when plugin is loaded
   */
  initialize(context: PluginContext): Promise<void> | void;

  /**
   * Register plugin's tools, resources, and prompts
   * Called after initialization
   */
  register(context: PluginContext): Promise<void> | void;

  /**
   * Cleanup plugin resources
   * Called when server is shutting down
   */
  cleanup?(): Promise<void> | void;

  /**
   * Health check for the plugin
   * Returns true if plugin is healthy
   */
  healthCheck?(): Promise<boolean> | boolean;
}

/**
 * Plugin constructor type
 */
export type PluginConstructor = new (config?: Record<string, unknown>) => IPlugin;
