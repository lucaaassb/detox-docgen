import { describe, expect, it } from 'vitest';
import {
  folderOutputFileForDir,
  outputFileForFormat
} from '../src/outputFormat';

describe('output format helpers', () => {
  it('uses mdx extension for default single and folder outputs', () => {
    expect(outputFileForFormat('spec-docs.md', 'mdx')).toBe('spec-docs.mdx');
    expect(folderOutputFileForDir('root', 'mdx')).toBe('root.mdx');
    expect(folderOutputFileForDir('e2e/login', 'mdx')).toBe('e2e-login.mdx');
  });

  it('keeps explicit outputFile values unchanged', () => {
    expect(outputFileForFormat('qa-report.md', 'mdx')).toBe('qa-report.md');
  });
});
