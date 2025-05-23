/**
 * @file crawl4ai-extract-schema.ts
 * @description Schema definition for the crawl4ai_extract tool
 *
 * This module defines the schema for the crawl4ai_extract tool, which extracts
 * structured information from web pages using LLM-based extraction. It can analyze
 * one or more URLs to extract specific data according to a provided schema or prompt,
 * enabling conversion of unstructured web content into structured data.
 *
 * The schema uses Zod for runtime type validation and documentation generation,
 * ensuring type safety and providing descriptive information for MCP clients.
 */

import { z } from 'zod';

/**
 * Schema for the crawl4ai_extract tool
 *
 * @remarks This tool extracts structured information from web pages using either a
 * JSON schema or natural language prompts to guide the extraction process. It's
 * useful for converting unstructured web content into structured, usable data.
 */
export const crawl4aiExtractSchema = z.object({
  // Required: List of URLs to extract information from
  urls: z
    .array(z.string())
    .min(1)
    .describe(
      'List of URLs to extract information from. The tool will process each URL and extract the requested data. Must include at least one valid URL with protocol'
    ),

  // Optional: JSON schema for structured data extraction
  schema: z
    .record(z.any())
    .optional()
    .describe(
      'JSON schema defining the structure of data to extract. This tells the tool what fields to look for and their expected types. Provides more structured results than using a natural language prompt'
    ),

  // Optional: Prompt for the LLM extraction
  prompt: z
    .string()
    .optional()
    .describe(
      'Natural language prompt describing what information to extract from the pages. Use this for free-form extraction when you don\'t have a rigid schema. Example: "Extract the product name, price, and description"'
    ),

  // Optional: System prompt for LLM extraction
  systemPrompt: z
    .string()
    .optional()
    .describe(
      'System prompt providing context and instructions to the LLM for extraction. This helps guide the extraction process at a high level. Useful for controlling output format and extraction behavior'
    ),

  // Optional with default: Whether to enable web search for additional context
  enableWebSearch: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Enable web search for additional context when extracting information. This can improve extraction quality for complex topics by providing more background information'
    ),

  // Optional with default: Whether to allow extraction from external links
  allowExternalLinks: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Allow extraction to follow and process external links found in the source pages. Setting to true enables deeper content exploration but increases processing time'
    ),

  // Optional with default: Whether to include subdomains in extraction
  includeSubdomains: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Include subdomains in extraction process when following links. For example, when processing example.com, also process blog.example.com if links are found'
    ),

  // Optional with default: Maximum depth for link following
  maxDepth: z
    .number()
    .min(1)
    .max(3)
    .optional()
    .default(1)
    .describe(
      'Maximum depth for following links during extraction (1-3). Only applies when allowExternalLinks is true. Higher values enable more thorough analysis but increase processing time'
    ),

  // Optional with default: Maximum content length to process per URL
  maxContentLength: z
    .number()
    .optional()
    .default(50000)
    .describe(
      'Maximum content length in characters to process per URL. Longer content will be truncated. Increase for more comprehensive extraction of long pages'
    ),

  // Optional with default: Whether to use cached content when available
  useCache: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Use cached content when available to speed up extraction and reduce bandwidth usage. Setting to false ensures always fresh content at the cost of performance'
    ),

  // Optional with default: Output format for the extracted data
  outputFormat: z
    .enum(['json', 'markdown', 'text'])
    .optional()
    .default('json')
    .describe(
      'Format for the extracted data in the response. "json" is most structured, "markdown" provides formatted text, and "text" is plain text'
    ),
});

/**
 * Type definition for the crawl4ai_extract handler function
 *
 * @remarks This type represents the function signature for the handler that processes
 * a crawl4ai_extract request and returns the extracted structured data.
 */
export type Crawl4aiExtractHandler = (
  params: z.infer<typeof crawl4aiExtractSchema>
) => Promise<{ content: Array<{ type: string; text: string }> }>;

// Export the schema
export default crawl4aiExtractSchema;
