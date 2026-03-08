import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

export interface FileSystemToolParams {
  action: 'read' | 'list';
  path?: string;
  content?: string;
}

export const filesystemTool = {
  name: 'list_files',
  description: 'List files in a directory. Returns a list of files with their types and sizes.',
  parameters: {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string',
        description: 'The directory path to list (default: current directory)',
      },
    },
    required: [],
  },
};

export async function executeFilesystemTool(params: Record<string, unknown>): Promise<string> {
  const path = (params.path as string) || '.';

  const resolvedPath = resolve(process.cwd(), path);

  try {
    const entries = readdirSync(resolvedPath);
    const items = entries.map((entry) => {
      try {
        const fullPath = join(resolvedPath, entry);
        const stat = statSync(fullPath);
        const type = stat.isDirectory() ? 'dir' : 'file';
        const size = stat.size;
        return `${type.padEnd(5)} ${size.toString().padStart(10)} ${entry}`;
      } catch {
        return `unknown ${entry}`;
      }
    });
    return `Directory: ${resolvedPath}\n\n${items.join('\n')}`;
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
