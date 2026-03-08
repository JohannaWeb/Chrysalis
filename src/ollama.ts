import OpenAI from 'openai';
import { loadConfig } from './config.js';

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolCallResult {
  tool: string;
  result: string;
  error?: string;
}

export type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;

// Check if content looks like a JSON tool call
function parseToolCallFromContent(content: string): { name: string; arguments: Record<string, unknown> } | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.name && typeof parsed.name === 'string') {
      return { name: parsed.name, arguments: parsed.arguments || {} };
    }
  } catch {
    // Not JSON, ignore
  }
  return null;
}

export class OllamaClient {
  private client: OpenAI;
  private model: string;

  constructor(model?: string) {
    const config = loadConfig();
    this.client = new OpenAI({
      baseURL: config.ollamaEndpoint,
      apiKey: 'ollama', 
    });
    this.model = model || config.defaultModel;
  }

  setModel(model: string): void {
    this.model = model;
  }

  getModel(): string {
    return this.model;
  }

  async chat(messages: ChatMessage[], tools?: Tool[]): Promise<{
    content: string;
    toolCalls?: unknown[];
    hasToolCalls: boolean;
  }> {
    const config = loadConfig();
    const params: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: config.temperature,
    };

    if (tools && tools.length > 0) {
      params.tools = tools;
    }

    // @ts-ignore - OpenAI SDK compatibility with Ollama
    const response = await this.client.chat.completions.create(params);
    const message = response.choices[0]?.message;

    if (!message) {
      throw new Error('No response from Ollama');
    }

    // Check for tool calls in standard tool_calls field
    const toolCalls = message.tool_calls;

    // Also check content field for JSON tool calls (some Ollama models don't use tool_calls)
    let hasToolCalls = false;
    if (!toolCalls || toolCalls.length === 0) {
      const parsed = parseToolCallFromContent(message.content || '');
      if (parsed) {
        // Convert to tool_calls format
        return {
          content: '',
          toolCalls: [{
            type: 'function',
            function: {
              name: parsed.name,
              arguments: JSON.stringify(parsed.arguments),
            },
          }],
          hasToolCalls: true,
        };
      }
    }

    return {
      content: message.content || '',
      toolCalls,
      hasToolCalls: !!(toolCalls && toolCalls.length > 0),
    };
  }

  async *streamChat(messages: ChatMessage[], tools?: Tool[]): AsyncGenerator<string> {
    const config = loadConfig();
    const params: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: config.temperature,
      stream: true,
    };

    if (tools && tools.length > 0) {
      params.tools = tools;
    }

    // @ts-ignore - OpenAI SDK compatibility with Ollama
    const stream = await this.client.chat.completions.create(params);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
