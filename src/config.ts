import path from 'path';
import fs from 'fs';
import { DetoxDocgenUserConfig } from './types';

const CANDIDATES = [
  'detox-docgen.config.js',
  'detox-docgen.config.cjs',
  '.detox-docgenrc.js',
  '.detox-docgenrc.cjs',
  'detox-docgen.config.mjs',
  '.detox-docgenrc.mjs'
] as const;

const DEFAULT: Required<DetoxDocgenUserConfig> = {
  testGlob: [
    'e2e/**/*.{js,jsx,ts,tsx}'
  ],
  outputFile: 'spec-docs.md',
  folderOutputDir: 'spec-docs-folder',
  pdfOutputDir: 'spec-docs-pdf'
};

export function loadUserConfig(workingDir: string): typeof DEFAULT {
  for (const name of CANDIDATES) {
    const full = path.join(workingDir, name);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    try {
      const resolved = require.resolve(full);
      delete require.cache[resolved];
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const mod = require(resolved) as unknown;
      const c = (
        mod &&
        typeof mod === 'object' &&
        'default' in (mod as object) &&
        (mod as { default: DetoxDocgenUserConfig }).default
          ? (mod as { default: DetoxDocgenUserConfig }).default
          : (mod as DetoxDocgenUserConfig)
      ) as DetoxDocgenUserConfig;
      if (!c || typeof c !== 'object') return { ...DEFAULT };
      return {
        testGlob: c.testGlob
          ? Array.isArray(c.testGlob)
            ? c.testGlob
            : [c.testGlob]
          : DEFAULT.testGlob,
        outputFile: c.outputFile ?? DEFAULT.outputFile,
        folderOutputDir: c.folderOutputDir ?? DEFAULT.folderOutputDir,
        pdfOutputDir: c.pdfOutputDir ?? DEFAULT.pdfOutputDir
      };
    } catch {
  
    }
  }
  return { ...DEFAULT };
}

export function getDefaultConfig(): typeof DEFAULT {
  return { ...DEFAULT };
}
