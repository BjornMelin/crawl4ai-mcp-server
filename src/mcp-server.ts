/**
 * MCP Server
 *
 * Configures and initializes the Model Context Protocol server with
 * Crawl4AI tools and handlers.
 */

import { MCPServer, createWorkerTransport } from '@modelcontextprotocol/sdk';
import { ToolConfig } from './types';
import { Env } from './index';

// Import tool schemas
import {
  crawl4aiScrapeSchema,
  crawl4aiMapSchema,
  crawl4aiCrawlSchema,
  crawl4aiCheckCrawlStatusSchema,
  crawl4aiExtractSchema,
  crawl4aiDeepResearchSchema,
  crawl4aiSearchSchema,
} from './tool-schemas';

// Import handlers
import {
  handleCrawl4aiScrape,
  handleCrawl4aiMap,
  handleCrawl4aiCrawl,
  handleCrawl4aiCheckCrawlStatus,
  handleCrawl4aiExtract,
  handleCrawl4aiDeepResearch,
  handleCrawl4aiSearch,
} from './tool-handlers';

// Import adapter
import adapter from './adapters';

/**
 * Wraps a handler with standardized error handling and logging
 * 
 * This function creates a wrapper around tool handlers to ensure:
 * 1. All errors are caught and transformed into a consistent MCP response
 * 2. Errors are logged for debugging purposes
 * 3. Environment variables are passed correctly to handlers
 * 
 * @param handler - The original handler function to wrap
 * @returns A wrapped handler function with error handling
 */
function wrapHandler(
  handler: (params: Record<string, unknown>, env?: unknown) => Promise<unknown>
): (params: Record<string, unknown>, rawEnv?: unknown) => Promise<unknown> {
  return async (params: Record<string, unknown>, rawEnv?: unknown): Promise<unknown> => {
    try {
      return await handler(params, rawEnv as Env);
    } catch (error) {
      // In production, limit the error details that are logged
      if (process.env.NODE_ENV === 'production') {
        console.error('Handler error:', {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : 'Unknown error',
          // Omit stack trace and other potentially sensitive details
        });
      } else {
        // Full detailed logging in non-production environments
        console.error('Handler error:', error);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  };
}

/**
 * Tool configurations
 */
const toolConfigs: ToolConfig[] = [
  {
    name: 'crawl4ai_scrape',
    description:
      'Scrape a webpage with options for content extraction including markdown, HTML, and screenshots.',
    parameters: crawl4aiScrapeSchema,
    handler: wrapHandler(handleCrawl4aiScrape),
  },
  {
    name: 'crawl4ai_map',
    description: 'Discover URLs from a starting point using sitemap.xml and HTML link discovery.',
    parameters: crawl4aiMapSchema,
    handler: wrapHandler(handleCrawl4aiMap),
  },
  {
    name: 'crawl4ai_crawl',
    description: 'Start an asynchronous crawl of multiple pages with depth control and filtering.',
    parameters: crawl4aiCrawlSchema,
    handler: wrapHandler(handleCrawl4aiCrawl),
  },
  {
    name: 'crawl4ai_check_crawl_status',
    description: 'Check the status of a crawl job.',
    parameters: crawl4aiCheckCrawlStatusSchema,
    handler: wrapHandler(handleCrawl4aiCheckCrawlStatus),
  },
  {
    name: 'crawl4ai_extract',
    description: 'Extract structured information from web pages using LLM.',
    parameters: crawl4aiExtractSchema,
    handler: wrapHandler(handleCrawl4aiExtract),
  },
  {
    name: 'crawl4ai_deep_research',
    description: 'Conduct deep research on a query using web crawling and AI analysis.',
    parameters: crawl4aiDeepResearchSchema,
    handler: wrapHandler(handleCrawl4aiDeepResearch),
  },
  {
    name: 'crawl4ai_search',
    description: 'Search and retrieve content from web pages with optional scraping.',
    parameters: crawl4aiSearchSchema,
    handler: wrapHandler(handleCrawl4aiSearch),
  },
];

/**
 * Creates and configures the MCP server with all available Crawl4AI tools
 * 
 * This function initializes an MCPServer instance with:
 * 1. Adapter configuration using environment variables
 * 2. Registration of all available Crawl4AI tools
 * 
 * The initialized server can then be used to create a worker transport for handling requests.
 * 
 * @param env - The environment object containing API keys and configuration
 * @returns A configured MCPServer instance ready for handling requests
 */
export const createMCPServer = (env: Env): MCPServer => {
  // Configure the adapter
  adapter.configure({
    apiKey: env.CRAWL4AI_API_KEY,
    baseUrl: env.CRAWL4AI_API_URL || 'https://api.crawl4ai.com',
  });

  // Create server and register all tools
  const server = new MCPServer();
  toolConfigs.forEach(tool => server.registerTool(tool));
  
  return server;
};

/**
 * Creates an MCP transport for Cloudflare Workers
 * 
 * This function creates and initializes a CloudFlare Worker transport
 * that can handle MCP protocol requests. It configures the transport with
 * the server instance and the incoming request.
 * 
 * @param request - The incoming HTTP request
 * @param env - The environment object containing API keys and configuration
 * @returns A configured worker transport that can handle MCP requests
 */
export const createWorkerMCPTransport = (request: Request, env: Env) => 
  createWorkerTransport(createMCPServer(env), request);

/**
 * Handles incoming MCP protocol requests
 * 
 * This is the main entry point for the MCP server. It:
 * 1. Creates an MCP server with all tools registered
 * 2. Creates a worker transport for the request
 * 3. Processes the request through the transport
 * 4. Returns the response from the MCP server
 * 
 * @param request - The incoming HTTP request
 * @param env - The environment object containing API keys and configuration
 * @returns A Response object with the result of the MCP operation
 */
export const handleMCPRequest = async (request: Request, env: Env): Promise<Response> => {
  const transport = createWorkerMCPTransport(request, env);
  return transport.handleRequest();
};
