import { DetoxDocgenOutputFormat } from './types';

export const DEFAULT_MARKDOWN_OUTPUT_FILE = 'spec-docs.md';

export function extensionForOutputFormat(format: DetoxDocgenOutputFormat): 'md' | 'mdx' {
  return format === 'mdx' ? 'mdx' : 'md';
}

export function defaultOutputFileForFormat(format: DetoxDocgenOutputFormat): string {
  return `spec-docs.${extensionForOutputFormat(format)}`;
}

export function outputFileForFormat(
  outputFile: string,
  format: DetoxDocgenOutputFormat
): string {
  if (outputFile !== DEFAULT_MARKDOWN_OUTPUT_FILE) return outputFile;
  return defaultOutputFileForFormat(format);
}

export function folderOutputFileForDir(dirName: string, format: DetoxDocgenOutputFormat): string {
  const extension = extensionForOutputFormat(format);
  return dirName === 'root' ? `root.${extension}` : `${dirName.replace(/[/\\]+/g, '-')}.${extension}`;
}
