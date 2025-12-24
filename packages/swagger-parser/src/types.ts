import type { PluginConfig } from '@nam088/mcp-core';

export interface SwaggerParserPluginConfig {
  /**
   * OpenAPI Specification URL or File Path
   */
  url?: string;

  /**
   * JSON Object
   */
  json?: Record<string, unknown>;

  /**
   * Base URL for API calls (overrides spec servers)
   */
  baseUrl?: string;

  /**
   * Authentication token (Bearer token)
   */
  authToken?: string;

  /**
   * Default headers to include in all requests
   */
  defaultHeaders?: Record<string, string>;
}

export type SwaggerParserConfig = PluginConfig & {
  config?: SwaggerParserPluginConfig;
};
