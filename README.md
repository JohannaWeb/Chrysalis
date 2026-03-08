# Crystalys
Using AI for readmes is kinda lame.
I wrote this because i was tired of rate limits.
A human hitting the keys on a plastic thing we call a keyboard.

## Installation

```bash
cd crystalys
npm install
```

## Usage

### Interactive Chat

Start an interactive chat session with Ollama:

```bash
npm run chat
# or
npm start
```

### Available Commands

- `chat` - Start an interactive chat session
- `config` - View current configuration
- `config:set endpoint <url>` - Set Ollama endpoint
- `config:set model <name>` - Set default model
- `prompt` - Show current system prompt
- `prompt:set <prompt>` - Set system prompt directly
- `prompt:file <file>` - Load system prompt from file
- `models` - List available Ollama models
- `tool` - Execute a tool directly

### Tool Calling

1. **filesystem** - Read files or list directories
2. **shell** - Execute shell commands
3. **search** - Search for text within files

### Configuration

Configuration is stored in `~/.crystalys.json`. Default values:

- Ollama endpoint: `http://localhost:11434/v1`
- Default model: `llama3.2`
- Temperature: 0.7

### System Prompt

Crystalys can load a system prompt from:
1. Config file (`systemPrompt` field)
2. `agent/personality.md` in the current working directory
3. Default built-in prompt

## Examples

```bash
# Chat with specific model
npm run chat -- -m llama3.1

# Set custom system prompt
npm run prompt:set "You are a helpful coding assistant."

# Load prompt from file
npm run prompt:file ./my-prompt.md

# List directory using tool command
npm run tool -- -n filesystem -a '{"action":"list","path":"./src"}'

# Search using tool command
npm run tool -- -n search -a '{"query":"TODO","path":".","fileTypes":["ts","js"]}'
```

## Requirements

- Node.js 18+
- Ollama running locally (or remote endpoint)
