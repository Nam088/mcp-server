import { z } from 'zod';
import axios, { type AxiosRequestConfig } from 'axios';
import { URL, URLSearchParams } from 'url';
import { PluginBase, type PluginConfig, type PluginContext } from '@nam088/mcp-core';
import yaml from 'js-yaml';
import type { SwaggerParserPluginConfig } from './types.js';

interface OpenApiParameter {
  name: string;
  in: string;
  required?: boolean;
  schema?: Record<string, unknown>;
  description?: string;
}

interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: {
    content?: Record<string, { schema?: Record<string, unknown> }>;
  };
  responses?: Record<string, { description?: string; content?: Record<string, unknown> }>;
  [key: string]: unknown;
}

interface OpenApiPaths {
  [path: string]: {
    [method: string]: OpenApiOperation;
  };
}

interface OpenApiSpec {
  paths: OpenApiPaths;
  info?: { title?: string; version?: string };
  servers?: Array<{ url: string }>;
  tags?: Array<{ name: string; description?: string }>;
  [key: string]: unknown;
}

/**
 * Swagger Parser MCP Plugin
 * Enhanced tool suite with discovery, safe reads, and controlled writes
 */
export class SwaggerParserPlugin extends PluginBase {
  readonly metadata: PluginConfig = {
    name: 'swagger-parser',
    version: '3.0.0',
    description: 'Enhanced OpenAPI/Swagger tool suite for MCP',
    config: {},
  };

  private swaggerConfig: SwaggerParserPluginConfig = {};
  private openApiSpec: OpenApiSpec | null = null;
  private baseUrl: string = 'http://localhost:3000';

  constructor(config?: Record<string, unknown>) {
    super(config);
    this.swaggerConfig = (config as unknown as SwaggerParserPluginConfig) || {};
    if (this.swaggerConfig.baseUrl) {
      this.baseUrl = this.swaggerConfig.baseUrl;
    }
  }

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);
    await this.loadSpec();
  }

  private async loadSpec(): Promise<void> {
    try {
      if (this.swaggerConfig.url) {
        console.log(`[SwaggerParser] Fetching spec from ${this.swaggerConfig.url}`);
        const response = await axios.get<string>(this.swaggerConfig.url, {
          responseType: this.swaggerConfig.url.match(/\.(ya?ml)$/i) ? 'text' : 'json',
        });

        // Parse YAML if needed
        if (this.swaggerConfig.url.match(/\.(ya?ml)$/i)) {
          this.openApiSpec = yaml.load(response.data) as OpenApiSpec;
        } else {
          this.openApiSpec = response.data as unknown as OpenApiSpec;
        }

        if (!this.swaggerConfig.baseUrl) {
          try {
            this.baseUrl = new URL(this.swaggerConfig.url).origin;
          } catch {
            if (this.openApiSpec.servers?.[0]?.url) {
              this.baseUrl = this.openApiSpec.servers[0].url;
            }
          }
        }
      } else if (this.swaggerConfig.json) {
        console.log(`[SwaggerParser] Using provided JSON spec`);
        this.openApiSpec = this.swaggerConfig.json as unknown as OpenApiSpec;

        if (!this.swaggerConfig.baseUrl && this.openApiSpec.servers?.[0]?.url) {
          this.baseUrl = this.openApiSpec.servers[0].url;
        }
      } else {
        console.warn('[SwaggerParser] No URL or JSON provided in config');
      }
    } catch (error) {
      console.error('[ERROR] [SwaggerParser] Initialization failed:', error);
      throw error;
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.swaggerConfig.defaultHeaders,
    };

    if (this.swaggerConfig.authToken) {
      headers['Authorization'] = `Bearer ${this.swaggerConfig.authToken}`;
    }

    return headers;
  }

  /**
   * Resolve $ref in schema recursively
   */
  private resolveRef(schema: unknown, depth = 0): unknown {
    if (depth > 10) return schema; // Prevent infinite recursion

    if (!schema || typeof schema !== 'object') return schema;

    const schemaObj = schema as Record<string, unknown>;

    // Handle $ref
    if ('$ref' in schemaObj && typeof schemaObj.$ref === 'string') {
      const refPath = schemaObj.$ref.replace('#/components/schemas/', '');
      const components = this.openApiSpec?.components as Record<string, unknown> | undefined;
      const schemas = components?.schemas as Record<string, unknown> | undefined;
      const refSchema = schemas?.[refPath];

      if (refSchema) {
        return this.resolveRef(refSchema, depth + 1);
      }
      return schema; // Keep $ref if not found
    }

    // Handle arrays
    if (Array.isArray(schemaObj)) {
      return schemaObj.map((item) => this.resolveRef(item, depth + 1));
    }

    // Handle nested objects
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schemaObj)) {
      resolved[key] = this.resolveRef(value, depth + 1);
    }
    return resolved;
  }

  private async executeRequest(
    method: string,
    path: string,
    params?: Record<string, unknown>,
    body?: unknown,
  ): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    try {
      let finalUrl = `${this.baseUrl}${path}`;
      const queryParams = new URLSearchParams();

      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (finalUrl.includes(`{${key}}`)) {
            finalUrl = finalUrl.replace(`{${key}}`, String(value));
          } else {
            queryParams.append(key, String(value));
          }
        }
      }

      const urlWithQuery = queryParams.toString()
        ? `${finalUrl}?${queryParams.toString()}`
        : finalUrl;

      const axiosConfig: AxiosRequestConfig = {
        method: method.toUpperCase(),
        url: urlWithQuery,
        headers: this.buildHeaders(),
      };

      if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        axiosConfig.data = body;
      }

      const apiResponse = await axios(axiosConfig);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(apiResponse.data, null, 2),
          },
        ],
      };
    } catch (err) {
      let errorMessage: string = String(err);
      if (axios.isAxiosError(err)) {
        errorMessage = `Axios Error: ${err.message} - ${JSON.stringify(err.response?.data || {})}`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Error calling API: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  register(context: PluginContext): void {
    // Tool 1: Search endpoints
    this.registerTool({
      context,
      name: 'swagger_search_tools',
      schema: {
        description: 'Search for available API tools/endpoints in the Swagger spec',
        inputSchema: {
          query: z.string().describe('Search term (keywords, resource name, or path)'),
        },
      },
      handler: async ({ query }: { query: string }) => {
        await Promise.resolve();
        if (!this.openApiSpec?.paths) {
          return {
            content: [{ type: 'text' as const, text: 'Error: No OpenAPI spec loaded.' }],
            isError: true,
          };
        }

        const matches: Array<{
          method: string;
          path: string;
          summary?: string;
          description?: string;
          operationId?: string;
          paramsHint?: string;
        }> = [];

        const lowerQuery = query.toLowerCase();

        for (const [path, methods] of Object.entries(this.openApiSpec.paths)) {
          for (const [method, op] of Object.entries(methods)) {
            const searchableText =
              `${method} ${path} ${op.summary || ''} ${op.description || ''} ${op.operationId || ''}`.toLowerCase();

            if (searchableText.includes(lowerQuery)) {
              const params =
                op.parameters
                  ?.map((p) => `${p.name} (${p.in}${p.required ? '*' : ''})`)
                  .join(', ') || 'None';

              matches.push({
                method: method.toUpperCase(),
                path,
                ...(op.summary ? { summary: op.summary } : {}),
                ...(op.description
                  ? { description: op.description.substring(0, 100) + '...' }
                  : {}),
                ...(op.operationId ? { operationId: op.operationId } : {}),
                paramsHint: params,
              });
            }
          }
        }

        const limitedMatches = matches.slice(0, 20);

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `Found ${matches.length} matches (showing top ${limitedMatches.length}):\n\n` +
                JSON.stringify(limitedMatches, null, 2),
            },
          ],
        };
      },
    });

    // Tool 2: Get endpoint details
    this.registerTool({
      context,
      name: 'swagger_get_endpoint_details',
      schema: {
        description: 'Get detailed information about a specific API endpoint',
        inputSchema: {
          method: z.string().describe('HTTP method (GET, POST, etc.)'),
          path: z.string().describe('API path (e.g., /users/{id})'),
        },
      },
      handler: async ({ method, path }: { method: string; path: string }) => {
        await Promise.resolve();
        if (!this.openApiSpec?.paths) {
          return {
            content: [{ type: 'text' as const, text: 'Error: No OpenAPI spec loaded.' }],
            isError: true,
          };
        }

        const op = this.openApiSpec.paths[path]?.[method.toLowerCase()];
        if (!op) {
          return {
            content: [{ type: 'text' as const, text: `Endpoint not found: ${method} ${path}` }],
            isError: true,
          };
        }

        const details = {
          method: method.toUpperCase(),
          path,
          summary: op.summary,
          description: op.description,
          operationId: op.operationId,
          tags: op.tags,
          parameters: op.parameters || [],
          requestBody: this.resolveRef(op.requestBody),
          responses: this.resolveRef(op.responses),
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(details, null, 2),
            },
          ],
        };
      },
    });

    // Tool 3: List all tags
    this.registerTool({
      context,
      name: 'swagger_list_tags',
      schema: {
        description: 'List all API tags/categories',
        inputSchema: {},
      },
      handler: async () => {
        await Promise.resolve();
        if (!this.openApiSpec) {
          return {
            content: [{ type: 'text' as const, text: 'Error: No OpenAPI spec loaded.' }],
            isError: true,
          };
        }

        const tags = this.openApiSpec.tags || [];
        const tagSet = new Set<string>();

        // Also collect tags from operations
        for (const methods of Object.values(this.openApiSpec.paths)) {
          for (const op of Object.values(methods)) {
            if (op.tags) {
              op.tags.forEach((tag: string) => tagSet.add(tag));
            }
          }
        }

        const allTags = [...new Set([...tags.map((t) => t.name), ...Array.from(tagSet)])];

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ tags: allTags, count: allTags.length }, null, 2),
            },
          ],
        };
      },
    });

    // Tool 4: List endpoints by tag
    this.registerTool({
      context,
      name: 'swagger_list_endpoints_by_tag',
      schema: {
        description: 'List all endpoints belonging to a specific tag',
        inputSchema: {
          tag: z.string().describe('Tag name'),
        },
      },
      handler: async ({ tag }: { tag: string }) => {
        await Promise.resolve();
        if (!this.openApiSpec?.paths) {
          return {
            content: [{ type: 'text' as const, text: 'Error: No OpenAPI spec loaded.' }],
            isError: true,
          };
        }

        const endpoints: Array<{ method: string; path: string; summary?: string }> = [];

        for (const [path, methods] of Object.entries(this.openApiSpec.paths)) {
          for (const [method, op] of Object.entries(methods)) {
            if (op.tags?.includes(tag)) {
              endpoints.push({
                method: method.toUpperCase(),
                path,
                ...(op.summary ? { summary: op.summary } : {}),
              });
            }
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ tag, endpoints, count: endpoints.length }, null, 2),
            },
          ],
        };
      },
    });

    // Tool 5: Generate curl command
    this.registerTool({
      context,
      name: 'swagger_generate_curl',
      schema: {
        description: 'Generate a curl command for an API endpoint',
        inputSchema: {
          method: z.string().describe('HTTP method'),
          path: z.string().describe('API path'),
          params: z.record(z.unknown()).optional().describe('Parameters'),
          body: z.record(z.unknown()).optional().describe('Request body'),
        },
      },
      handler: async ({
        method,
        path,
        params,
        body,
      }: {
        method: string;
        path: string;
        params?: Record<string, unknown>;
        body?: Record<string, unknown>;
      }) => {
        await Promise.resolve();
        let finalUrl = `${this.baseUrl}${path}`;
        const queryParams = new URLSearchParams();

        if (params) {
          for (const [key, value] of Object.entries(params)) {
            if (finalUrl.includes(`{${key}}`)) {
              finalUrl = finalUrl.replace(`{${key}}`, String(value));
            } else {
              queryParams.append(key, String(value));
            }
          }
        }

        if (queryParams.toString()) {
          finalUrl += `?${queryParams.toString()}`;
        }

        let curlCmd = `curl -X ${method.toUpperCase()} "${finalUrl}"`;

        const headers = this.buildHeaders();
        for (const [key, value] of Object.entries(headers)) {
          curlCmd += ` \\\n  -H "${key}: ${value}"`;
        }

        if (body) {
          curlCmd += ` \\\n  -d '${JSON.stringify(body)}'`;
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: curlCmd,
            },
          ],
        };
      },
    });

    // Tool 6: Generate example request
    this.registerTool({
      context,
      name: 'swagger_generate_example_request',
      schema: {
        description: 'Generate an example request with sample values',
        inputSchema: {
          method: z.string().describe('HTTP method'),
          path: z.string().describe('API path'),
        },
      },
      handler: async ({ method, path }: { method: string; path: string }) => {
        await Promise.resolve();
        if (!this.openApiSpec?.paths) {
          return {
            content: [{ type: 'text' as const, text: 'Error: No OpenAPI spec loaded.' }],
            isError: true,
          };
        }

        const op = this.openApiSpec.paths[path]?.[method.toLowerCase()];
        if (!op) {
          return {
            content: [{ type: 'text' as const, text: `Endpoint not found: ${method} ${path}` }],
            isError: true,
          };
        }

        const example: {
          method: string;
          path: string;
          params?: Record<string, string>;
          body?: string;
        } = {
          method: method.toUpperCase(),
          path,
        };

        if (op.parameters) {
          example.params = {};
          for (const param of op.parameters) {
            example.params[param.name] = `<${param.name}>`;
          }
        }

        if (op.requestBody) {
          example.body = '<request body>';
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(example, null, 2),
            },
          ],
        };
      },
    });

    // Tool 7: Reload spec
    this.registerTool({
      context,
      name: 'swagger_reload',
      schema: {
        description: 'Reload the OpenAPI specification from source',
        inputSchema: {},
      },
      handler: async () => {
        try {
          await this.loadSpec();
          return {
            content: [{ type: 'text' as const, text: 'OpenAPI spec reloaded successfully.' }],
          };
        } catch (err) {
          return {
            content: [{ type: 'text' as const, text: `Failed to reload spec: ${String(err)}` }],
            isError: true,
          };
        }
      },
    });

    // Tool 8: Execute GET (READONLY mode OK)
    this.registerTool({
      context,
      name: 'swagger_execute_get',
      schema: {
        description: 'Execute a GET request (read-only, safe)',
        inputSchema: {
          path: z.string().describe('API path'),
          params: z.record(z.unknown()).optional().describe('Query/path parameters'),
        },
      },
      handler: async ({ path, params }: { path: string; params?: Record<string, unknown> }) => {
        return await this.executeRequest('GET', path, params);
      },
    });

    // Tool 9: Execute POST (FULL mode only)
    this.registerTool({
      context,
      name: 'swagger_execute_post',
      schema: {
        description: 'Execute a POST request (requires FULL mode)',
        inputSchema: {
          path: z.string().describe('API path'),
          params: z.record(z.unknown()).optional().describe('Query/path parameters'),
          body: z.record(z.unknown()).optional().describe('Request body'),
        },
      },
      handler: async ({
        path,
        params,
        body,
      }: {
        path: string;
        params?: Record<string, unknown>;
        body?: Record<string, unknown>;
      }) => {
        return await this.executeRequest('POST', path, params, body);
      },
      isWriteTool: true,
    });

    // Tool 10: Execute PUT (FULL mode only)
    this.registerTool({
      context,
      name: 'swagger_execute_put',
      schema: {
        description: 'Execute a PUT request (requires FULL mode)',
        inputSchema: {
          path: z.string().describe('API path'),
          params: z.record(z.unknown()).optional().describe('Query/path parameters'),
          body: z.record(z.unknown()).optional().describe('Request body'),
        },
      },
      handler: async ({
        path,
        params,
        body,
      }: {
        path: string;
        params?: Record<string, unknown>;
        body?: Record<string, unknown>;
      }) => {
        return await this.executeRequest('PUT', path, params, body);
      },
      isWriteTool: true,
    });

    // Tool 11: Execute PATCH (FULL mode only)
    this.registerTool({
      context,
      name: 'swagger_execute_patch',
      schema: {
        description: 'Execute a PATCH request (requires FULL mode)',
        inputSchema: {
          path: z.string().describe('API path'),
          params: z.record(z.unknown()).optional().describe('Query/path parameters'),
          body: z.record(z.unknown()).optional().describe('Request body'),
        },
      },
      handler: async ({
        path,
        params,
        body,
      }: {
        path: string;
        params?: Record<string, unknown>;
        body?: Record<string, unknown>;
      }) => {
        return await this.executeRequest('PATCH', path, params, body);
      },
      isWriteTool: true,
    });

    // Tool 12: Execute DELETE (FULL mode only)
    this.registerTool({
      context,
      name: 'swagger_execute_delete',
      schema: {
        description: 'Execute a DELETE request (requires FULL mode)',
        inputSchema: {
          path: z.string().describe('API path'),
          params: z.record(z.unknown()).optional().describe('Query/path parameters'),
        },
      },
      handler: async ({ path, params }: { path: string; params?: Record<string, unknown> }) => {
        return await this.executeRequest('DELETE', path, params);
      },
      isWriteTool: true,
    });
  }
}
