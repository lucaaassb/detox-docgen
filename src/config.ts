import path from 'path';
import fs from 'fs';
import { DetoxDocgenResolvedConfig, DetoxDocgenUserConfig } from './types';

const CANDIDATES = [
  'detox-docgen.config.js',
  'detox-docgen.config.cjs',
  '.detox-docgenrc.js',
  '.detox-docgenrc.cjs'
] as const;

const DEFAULT: DetoxDocgenResolvedConfig = {
  testGlob: [
    'e2e/**/*.{js,jsx,ts,tsx}'
  ],
  outputFile: 'spec-docs.md',
  folderOutputDir: 'spec-docs-folder',
  pdfOutputDir: 'spec-docs-pdf',
  projectName: '',
  version: '',
  responsible: '',
  environment: ''
};

function readPackageValue(workingDir: string, key: 'name' | 'version'): string {
  const pkgPath = path.join(workingDir, 'package.json');
  if (!fs.existsSync(pkgPath) || !fs.statSync(pkgPath).isFile()) return '';
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
    const value = pkg[key];
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

function valueOrDefault(value: string | undefined, fallback: string): string {
  return value && value.trim() ? value.trim() : fallback;
}

export function loadUserConfig(workingDir: string): DetoxDocgenResolvedConfig {
  const packageName = readPackageValue(workingDir, 'name');
  const packageVersion = readPackageValue(workingDir, 'version');
  const baseDefaults: DetoxDocgenResolvedConfig = {
    ...DEFAULT,
    projectName: packageName,
    version: packageVersion
  };

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
      if (!c || typeof c !== 'object') return { ...baseDefaults };
      return {
        testGlob: c.testGlob
          ? Array.isArray(c.testGlob)
            ? c.testGlob
            : [c.testGlob]
          : baseDefaults.testGlob,
        outputFile: c.outputFile ?? baseDefaults.outputFile,
        folderOutputDir: c.folderOutputDir ?? baseDefaults.folderOutputDir,
        pdfOutputDir: c.pdfOutputDir ?? baseDefaults.pdfOutputDir,
        projectName: valueOrDefault(c.projectName, baseDefaults.projectName),
        version: valueOrDefault(c.version, baseDefaults.version),
        responsible: valueOrDefault(c.responsible, baseDefaults.responsible),
        environment: valueOrDefault(c.environment, baseDefaults.environment)
      };
    } catch {
  
    }
  }
  return { ...baseDefaults };
}

export function getDefaultConfig(): DetoxDocgenResolvedConfig {
  return { ...DEFAULT };
}
