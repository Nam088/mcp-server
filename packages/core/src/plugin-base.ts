import type { IPlugin, PluginConfig, PluginContext } from './types.js';
import { PluginMode } from './types.js';
import type {
  CallToolResult,
  ServerRequest,
  ServerNotification,
} from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ZodRawShape } from 'zod';

/**
 * Tool schema definition
 */
export type ToolSchema = {
  description: string;
  inputSchema: ZodRawShape;
};

/**
 * Tool handler function type
 */
export type ToolHandler<TArgs = Record<string, unknown>> = (
  args: TArgs,
) => CallToolResult | Promise<CallToolResult>;

/**
 * Abstract base class for plugins
 * Provides common functionality and enforces interface implementation
 */
export abstract class PluginBase implements IPlugin {
  abstract readonly metadata: PluginConfig;

  protected context?: PluginContext;
  protected config: Record<string, unknown>;

  constructor(config?: Record<string, unknown>) {
    this.config = config ?? {};
  }

  /**
   * Initialize plugin
   * Override this to add custom initialization logic
   */
  initialize(context: PluginContext): Promise<void> | void {
    this.context = context;
  }

  /**
   * Register tools, resources, prompts
   * Must be implemented by subclasses
   */
  abstract register(context: PluginContext): Promise<void> | void;

  /**
   * Cleanup resources
   * Override this to add custom cleanup logic
   */
  cleanup(): Promise<void> | void {
    // Override this method to add custom cleanup logic
  }

  /**
   * Health check
   * Override this to add custom health checks
   */
  healthCheck(): Promise<boolean> | boolean {
    return true;
  }

  /**
   * Get plugin context
   */
  protected getContext(): PluginContext {
    if (!this.context) {
      throw new Error(`Plugin ${this.metadata.name} not initialized`);
    }
    return this.context;
  }

  /**
   * Get plugin configuration
   */
  protected getConfig<T = Record<string, unknown>>(): T {
    return (this.config || {}) as T;
  }

  /**
   * Check if plugin is in readonly mode
   */
  protected isReadonly(): boolean {
    return this.metadata.mode === PluginMode.READONLY;
  }

  /**
   * Check if plugin is in full mode
   */
  protected isFullMode(): boolean {
    return this.metadata.mode === PluginMode.FULL;
  }

  /**
   * Register a tool with automatic mode checking
   * Write tools are automatically skipped in readonly mode
   * @param options Tool registration options
   * @param options.context Plugin context
   * @param options.name Tool name
   * @param options.schema Tool schema with description and inputSchema
   * @param options.handler Tool handler function
   * @param options.isWriteTool Whether this is a write operation (default: false)
   */
  protected registerTool<TArgs = Record<string, unknown>>(options: {
    context: PluginContext;
    name: string;
    schema: ToolSchema;
    handler: ToolHandler<TArgs>;
    isWriteTool?: boolean;
  }): void {
    const { context, name, schema, handler, isWriteTool = false } = options;

    // Skip write tools in readonly mode
    if (isWriteTool && this.isReadonly()) {
      console.warn(`[WARN] [${this.metadata.name}] Skipping write tool '${name}' in readonly mode`);
      return;
    }
    // Wrap handler to match MCP SDK signature: (args, extra) => ...
    // The SDK expects both args and extra, but our handler only needs args
    context.server.registerTool(
      name,
      schema,
      (
        args: { [x: string]: unknown },
        _extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
      ) => {
        return handler(args as TArgs);
      },
    );
  }
}
