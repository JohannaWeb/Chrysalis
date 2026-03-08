import { OllamaClient } from './src/ollama.js';

const client = new OllamaClient('qwen2.5-coder');
try {
  const result = await client.chat([{role: 'user', content: 'hi'}]);
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (e) {
  console.error('Error:', e.message);
}
