#!/usr/bin/env node

import { Command } from 'commander';
import { OllamaClient, Tool, ChatMessage } from './ollama.js';
import { filesystemTool, executeFilesystemTool } from './tools/filesystem.js';
import { shellTool, executeShellTool } from './tools/shell.js';
import { searchTool, executeSearchTool } from './tools/search.js';
import { setPrompt, showPrompt, loadPromptFromFile, getAvailableModels } from './prompt.js';
import { loadConfig, saveConfig, getSystemPrompt } from './config.js';
import chalk from 'chalk';
import readline from 'readline';

const program = new Command();

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function promptQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Register all tools
const tools: Tool[] = [filesystemTool, shellTool, searchTool];

// Tool execution map
const toolExecutors: Record<string, (params: Record<string, unknown>) => Promise<string>> = {
  list_files: executeFilesystemTool,
  shell: executeShellTool,
  search: executeSearchTool,
};

// Chat function
async function startChat(options: { model?: string; system?: string }) {
  console.log(chalk.cyan('Crystalys - AI Assistant\n'));

  const config = loadConfig();
  const model = options.model || config.defaultModel;
  const client = new OllamaClient(model);

  console.log(chalk.gray(`Model: ${model}`));
  console.log(chalk.gray('Type "exit" or "quit" to end session\n'));

  const messages: ChatMessage[] = [
    { role: 'system', content: options.system || getSystemPrompt() },
  ];

  while (true) {
    const input = await promptQuestion(chalk.green('You: '));

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log(chalk.yellow('Goodbye!'));
      rl.close();
      break;
    }

    if (!input.trim()) continue;

    messages.push({ role: 'user', content: input });

    try {
      let response = await client.chat(messages, tools);

      process.stdout.write(chalk.blue('Assistant: '));

      if (response.hasToolCalls && response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          const tc = toolCall as { function?: { name?: string; arguments?: unknown } };
          const toolName = tc.function?.name;
          const args = tc.function?.arguments;

          if (toolName && toolExecutors[toolName]) {
            console.log(chalk.gray(`\n[Using tool: ${toolName}]`));

            try {
              const params = typeof args === 'string' ? JSON.parse(args) : args as Record<string, unknown>;
              const result = await toolExecutors[toolName](params);

              messages.push({
                role: 'assistant',
                content: response.content,
              });
              messages.push({
                role: 'tool',
                content: result,
              } as ChatMessage);

              const finalResponse = await client.chat(messages, tools);
              process.stdout.write(chalk.cyan(finalResponse.content || ''));
              messages.push({ role: 'assistant', content: finalResponse.content || '' });
            } catch (toolError) {
              console.log(chalk.red(`\nTool error: ${toolError}`));
            }
          }
        }
      } else {
        process.stdout.write(chalk.cyan(response.content || ''));
        messages.push({ role: 'assistant', content: response.content || '' });
      }

      console.log('\n');
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
    }
  }
}

// Default command - start chat directly
program
  .action((options) => {
    startChat(options);
  });

// Chat command (alias)
program
  .command('chat')
  .description('Start an interactive chat session with Ollama')
  .option('-m, --model <model>', 'Model to use')
  .option('-s, --system <prompt>', 'Custom system prompt')
  .action(startChat);

// Config command
program
  .command('config')
  .description('Manage configuration')
  .action(() => {
    const config = loadConfig();
    console.log(JSON.stringify(config, null, 2));
  });

// Config set command
const configSet = program.command('config:set').description('Set a configuration value');

configSet
  .command('endpoint <url>')
  .action((url) => {
    saveConfig({ ollamaEndpoint: url });
  });

configSet
  .command('model <name>')
  .action((name) => {
    saveConfig({ defaultModel: name });
  });

// Prompt commands
program
  .command('prompt')
  .description('Manage system prompt')
  .action(() => {
    showPrompt();
  });

program
  .command('prompt:set')
  .description('Set the system prompt')
  .argument('<prompt>', 'The system prompt text')
  .action((prompt) => {
    setPrompt(prompt);
  });

program
  .command('prompt:file')
  .description('Load system prompt from a file')
  .argument('<file>', 'Path to prompt file')
  .action((file) => {
    try {
      const prompt = loadPromptFromFile(file);
      setPrompt(prompt);
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
    }
  });

// Models command
program
  .command('models')
  .description('List available models')
  .action(() => {
    console.log('Common Ollama models:');
    getAvailableModels().forEach((model) => {
      console.log(`  - ${model}`);
    });
    console.log('\nTo see locally installed models, run: ollama list');
  });

// Tool command - for testing tools directly
program
  .command('tool')
  .description('Execute a tool directly')
  .requiredOption('-n, --name <name>', 'Tool name (filesystem, shell, search)')
  .requiredOption('-a, --args <json>', 'Tool arguments as JSON')
  .action(async (options) => {
    const toolName = options.name;
    const args = JSON.parse(options.args);

    if (!toolExecutors[toolName]) {
      console.error(chalk.red(`Unknown tool: ${toolName}`));
      process.exit(1);
    }

    try {
      const result = await toolExecutors[toolName](args);
      console.log(result);
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
    }
  });

program.parse(process.argv);
