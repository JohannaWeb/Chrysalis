import { readdirSync, statSync, readFileSync } from 'fs';
import { join, resolve, relative } from 'path';

export interface SearchToolParams {
  query: string;
  path?: string;
  fileTypes?: string[];
  maxResults?: number;
}

export const searchTool = {
  name: 'search',
  description: 'Search for text within files in a directory. Searches file contents for the query string.',
  parameters: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'The text to search for',
      },
      path: {
        type: 'string',
        description: 'Directory to search in (defaults to current directory)',
      },
      fileTypes: {
        type: 'array',
        items: { type: 'string' },
        description: 'File extensions to search (e.g., ["ts", "js", "md"])',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (default: 20)',
      },
    },
    required: ['query'],
  },
};

async function searchDirectory(
  dirPath: string,
  query: string,
  fileTypes: string[],
  maxResults: number,
  basePath: string,
  results: { file: string; line: string; content: string }[]
): Promise<void> {
  if (results.length >= maxResults) return;

  try {
    const entries = readdirSync(dirPath);

    for (const entry of entries) {
      if (results.length >= maxResults) break;

      // Skip common directories to ignore
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist' || entry === 'build') {
        continue;
      }

      const fullPath = join(dirPath, entry);

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          await searchDirectory(fullPath, query, fileTypes, maxResults, basePath, results);
        } else if (stat.isFile()) {
          // Check file type filter
          const ext = entry.split('.').pop()?.toLowerCase();
          if (fileTypes.length > 0 && ext && !fileTypes.includes(ext)) {
            continue;
          }

          // Read and search file
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
              if (lines[i].toLowerCase().includes(query.toLowerCase())) {
                const relativePath = relative(basePath, fullPath);
                results.push({
                  file: `${relativePath}:${i + 1}`,
                  line: (i + 1).toString(),
                  content: lines[i].trim().substring(0, 200),
                });
                break; // Only first match per file
              }
            }
          } catch {
            // Skip files that can't be read (binary, etc.)
          }
        }
      } catch {
        // Skip inaccessible files/directories
      }
    }
  } catch {
    // Skip inaccessible directories
  }
}

export async function executeSearchTool(params: Record<string, unknown>): Promise<string> {
  const query = params.query as string;
  const path = (params.path as string) || '.';
  const fileTypes = (params.fileTypes as string[]) || [];
  const maxResults = (params.maxResults as number) || 20;

  const searchPath = resolve(process.cwd(), path);
  const results: { file: string; line: string; content: string }[] = [];

  await searchDirectory(searchPath, query, fileTypes, maxResults, searchPath, results);

  if (results.length === 0) {
    return `No results found for "${query}"`;
  }

  const formatted = results
    .map((r) => `${r.file}\n  ${r.content}`)
    .join('\n\n');

  return `Found ${results.length} result(s) for "${query}":\n\n${formatted}`;
}
