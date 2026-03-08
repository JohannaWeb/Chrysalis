import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getSystemPrompt, loadConfig } from './config.js';

export function setPrompt(prompt: string): void {
  const config = loadConfig();
  config.systemPrompt = prompt;

  const configPath = join(homedir(), '.crystalys.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('System prompt updated');
}

export function showPrompt(): void {
  const prompt = getSystemPrompt();
  console.log('\n--- Current System Prompt ---\n');
  console.log(prompt);
  console.log('\n------------------------------\n');
}

export function loadPromptFromFile(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  return readFileSync(filePath, 'utf-8');
}

export function getAvailableModels(): string[] {
  // Common Ollama models - user can add more
  return [
    'deepseek-coder',
    'llama3.2',
    'llama3.2:1b',
    'llama3.2:3b',
    'llama3.1',
    'llama3.1:8b',
    'mistral',
    'codellama',
    'phi3',
    'qwen2.5',
    'gemma2',
  ];
}
