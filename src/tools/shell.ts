import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ShellToolParams {
  command: string;
  cwd?: string;
}

export const shellTool = {
  name: 'shell',
  description: 'Execute shell commands and return the output. Use this to run commands, scripts, or git operations.',
  parameters: {
    type: 'object' as const,
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute',
      },
      cwd: {
        type: 'string',
        description: 'Optional working directory for the command',
      },
    },
    required: ['command'],
  },
};

export async function executeShellTool(params: Record<string, unknown>): Promise<string> {
  const command = params.command as string;
  const cwd = params.cwd as string | undefined;

  // Security: restrict dangerous commands
  const dangerousPatterns = [
    /rm\s+-rf\s+\/(?:\s|$)/,
    /mkfs\./,
    /dd\s+if=.*of=\/dev\//,
    /:\(\)\{.*:\|:&\};:/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return `Error: Command blocked for safety: ${command}`;
    }
  }

  try {
    const options = cwd ? { cwd } : {};
    const { stdout, stderr } = await execAsync(command, { timeout: 30000, ...options });

    let result = '';
    if (stdout) result += stdout;
    if (stderr) result += `\nStderr: ${stderr}`;

    return result || '(command completed with no output)';
  } catch (error) {
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return `Error: ${String(error)}`;
  }
}
