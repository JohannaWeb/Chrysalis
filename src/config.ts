import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

export interface CrystalysConfig {
  ollamaEndpoint: string;
  defaultModel: string;
  systemPrompt?: string;
  temperature?: number;
}

const DEFAULT_CONFIG: CrystalysConfig = {
  ollamaEndpoint: 'http://localhost:11434/v1',
  defaultModel: 'qwen2.5-coder',
  temperature: 0.7,
};

function getConfigPath(): string {
  return resolve(process.env.HOME || process.env.USERPROFILE || '', '.crystalys.json');
}

export function loadConfig(): CrystalysConfig {
  const configPath = getConfigPath();

  // Support environment variable override
  const ollamaEndpoint = process.env.OLLAMA_ENDPOINT;

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      const fileConfig = JSON.parse(content);
      return { ...DEFAULT_CONFIG, ...fileConfig, ollamaEndpoint: ollamaEndpoint || fileConfig.ollamaEndpoint };
    } catch (error) {
      console.error('Error loading config, using defaults:', error);
    }
  }

  return { ...DEFAULT_CONFIG, ollamaEndpoint: ollamaEndpoint || DEFAULT_CONFIG.ollamaEndpoint };
}

export function saveConfig(config: Partial<CrystalysConfig>): void {
  const configPath = getConfigPath();
  const currentConfig = loadConfig();
  const newConfig = { ...currentConfig, ...config };

  writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
  console.log(`Configuration saved to ${configPath}`);
}

export function getSystemPrompt(): string {
  const config = loadConfig();

  if (config.systemPrompt) {
    return config.systemPrompt;
  }

  // Try to load from agent directory if it exists
  const agentPromptPath = join(process.cwd(), 'agent', 'personality.md');
  if (existsSync(agentPromptPath)) {
    try {
      return readFileSync(agentPromptPath, 'utf-8');
    } catch (error) {
      console.error('Error loading personality.md:', error);
    }
  }

  return `You are Crystalys, an AI assistant with access to tools. Use the available tools to help the user.
When you need to perform actions like reading files, running shell commands, or searching, use the provided tools.
Always explain what you're doing before using tools.`;
}
