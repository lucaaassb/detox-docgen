import path from 'path';
import fs from 'fs';
import fg from 'fast-glob';
import { isLikelyE2EFileName } from './matchByConvention';
import { createPathFilter } from './loadIgnore';

const ALWAYS_SKIP = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git'
]);

export async function findTestFiles(
  workingDir: string,
  testGlobs: string | string[]
): Promise<string[]> {
  const patterns = Array.isArray(testGlobs) ? testGlobs : [testGlobs];
  const filter = createPathFilter(workingDir);

  const results = await fg(patterns, {
    cwd: workingDir,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    unique: true
  });

  const withConvention = results.filter(
    (abs) => isLikelyE2EFileName(abs) && filter(path.relative(workingDir, abs).split(path.sep).join('/'))
  );

  return withConvention
    .filter((abs) => {
      const rel = path.relative(workingDir, abs);
      const segs = rel.split(path.sep);
      return !segs.some((s) => s.startsWith('.') && s !== '.') || rel.startsWith('e2e');
    })
    .filter((abs) => {
      const segs = path.relative(workingDir, abs).split(path.sep);
      return !segs.some((d) => ALWAYS_SKIP.has(d));
    })
    .sort((a, b) => a.localeCompare(b));
}

export function classifyFileNameForStats(fileName: string): { spec: number; e2e: number; test: number } {
  const s = { spec: 0, e2e: 0, test: 0 };
  if (fileName.includes('.e2e.')) s.e2e = 1;
  if (fileName.includes('.spec.')) s.spec = 1;
  if (fileName.includes('.test.')) s.test = 1;
  if (s.e2e === 0 && s.spec === 0 && s.test === 0) {
    s.e2e = 1;
  }
  return s;
}

/**
 * @internal — ensure a directory exists.
 */
export function ensureDirSync(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
