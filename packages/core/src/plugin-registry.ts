import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IPlugin, PluginConstructor, PluginContext } from './types.js';
import { PluginMode } from './types.js';

/**
 * Plugin Registry Options
 */
export interface PluginRegistryOptions {
  /**
   * Default mode for all plugins (default: READONLY)
   */
  defaultMode?: PluginMode;
}

/**
 * Plugin Registry
 * Manages plugin lifecycle and registration
 */
export class PluginRegistry {
  private plugins: Map<string, IPlugin> = new Map();
  private server: McpServer;
  private defaultMode: PluginMode;

  constructor(server: McpServer, options?: PluginRegistryOptions) {
    this.server = server;
    this.defaultMode = options?.defaultMode ?? PluginMode.READONLY;
  }

  /**
   * Register a plugin
   */
  async registerPlugin(
    PluginClass: PluginConstructor,
    config?: Record<string, unknown>,
  ): Promise<void> {
    const plugin = new PluginClass(config);
    const pluginName = plugin.metadata.name;

    if (this.plugins.has(pluginName)) {
      throw new Error(`Plugin ${pluginName} is already registered`);
    }

    // Apply default mode if not specified
    if (!plugin.metadata.mode) {
      plugin.metadata.mode = this.defaultMode;
    }

    const context: PluginContext = {
      server: this.server,
    };

    try {
      // Initialize plugin
      await plugin.initialize(context);

      // Register plugin's tools/resources/prompts
      await plugin.register(context);

      // Store plugin
      this.plugins.set(pluginName, plugin);
    } catch (error) {
      console.error(`[ERROR] [PluginRegistry] Failed to register plugin ${pluginName}:`, error);
      throw error;
    }
  }

  /**
   * Get a registered plugin
   */
  getPlugin(name: string): IPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): IPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if plugin is registered
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    if (plugin.cleanup) {
      await plugin.cleanup();
    }

    this.plugins.delete(name);
  }

  /**
   * Cleanup all plugins
   */
  async cleanup(): Promise<void> {
    for (const [name, plugin] of this.plugins) {
      try {
        if (plugin.cleanup) {
          await plugin.cleanup();
        }
      } catch (error) {
        console.error(`[ERROR] [PluginRegistry] Error cleaning up plugin ${name}:`, error);
      }
    }

    this.plugins.clear();
  }

  /**
   * Health check all plugins
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, plugin] of this.plugins) {
      try {
        results[name] = plugin.healthCheck ? await plugin.healthCheck() : true;
      } catch (error) {
        console.error(`[ERROR] [PluginRegistry] Health check failed for ${name}:`, error);
        results[name] = false;
      }
    }

    return results;
  }
}
