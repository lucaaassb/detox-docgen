import path from 'path';
import fs from 'fs';
import {
  DetoxDocgenOutputFormat,
  DetoxDocgenReportLanguage,
  DetoxDocgenReportTextOverrides,
  DetoxDocgenResolvedConfig,
  DetoxDocgenUserConfig
} from './types';
import { DEFAULT_MARKDOWN_OUTPUT_FILE } from './outputFormat';

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
  outputFile: DEFAULT_MARKDOWN_OUTPUT_FILE,
  folderOutputDir: 'spec-docs-folder',
  pdfOutputDir: 'spec-docs-pdf',
  projectName: '',
  version: '',
  responsible: '',
  environment: '',
  reportLanguage: 'pt-BR',
  reportTextOverrides: {},
  outputFormat: 'md'
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

function reportLanguageOrDefault(
  value: DetoxDocgenReportLanguage | undefined,
  fallback: DetoxDocgenReportLanguage
): DetoxDocgenReportLanguage {
  return value === 'en' || value === 'pt-BR' ? value : fallback;
}

function reportTextOverridesOrDefault(
  value: DetoxDocgenReportTextOverrides | undefined
): DetoxDocgenReportTextOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );
}

function outputFormatOrDefault(
  value: DetoxDocgenOutputFormat | undefined,
  fallback: DetoxDocgenOutputFormat
): DetoxDocgenOutputFormat {
  return value === 'mdx' || value === 'md' ? value : fallback;
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
        environment: valueOrDefault(c.environment, baseDefaults.environment),
        reportLanguage: reportLanguageOrDefault(c.reportLanguage, baseDefaults.reportLanguage),
        reportTextOverrides: reportTextOverridesOrDefault(c.reportTextOverrides),
        outputFormat: outputFormatOrDefault(c.outputFormat, baseDefaults.outputFormat)
      };
    } catch {
  
    }
  }
  return { ...baseDefaults };
}

export function getDefaultConfig(): DetoxDocgenResolvedConfig {
  return { ...DEFAULT };
}
