import path from 'path';
import { IParsedTestFile, SourceKind } from '../types';
import { canonicalReadableText } from './strings';
import {
  collectItTitlesInTreeOrder,
  normalizeTestContext
} from './normalizeContext';

function inferSourceKind(fileName: string): SourceKind | undefined {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.tsx') return 'tsx';
  if (ext === '.ts' || ext === '.mts' || ext === '.cts') return 'typescript';
  if (ext === '.jsx' || ext === '.js' || ext === '.mjs' || ext === '.cjs') {
    return 'javascript';
  }
  return undefined;
}

function dedupeWarnings(w: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of w) {
    const k = canonicalReadableText(x);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/**
 * Converte o resultado do parser (vários estilos JS/TS/JSX) para um modelo interno
 * padronizado: textos canónicos, hooks ordenados, metadados limpos, `its` coerente
 * com a árvore de suítes e avisos deduplicados.
 */
export function normalizeParsed(f: IParsedTestFile): IParsedTestFile {
  const emptyStepWarnings = new Set<string>();

  const contexts = (f.contexts ?? []).map((c) =>
    normalizeTestContext(c, emptyStepWarnings)
  );

  const treeTitles = contexts.flatMap((c) => collectItTitlesInTreeOrder(c));
  const its =
    contexts.length > 0 && treeTitles.length > 0
      ? treeTitles
      : (f.its ?? []).map(canonicalReadableText).filter(Boolean);

  const mergedWarnings = dedupeWarnings([
    ...(f.warnings ?? []),
    ...Array.from(emptyStepWarnings)
  ]);

  const describe =
    f.describe === 'N/A' ? 'N/A' : canonicalReadableText(f.describe);
  const firstContext = f.firstContext
    ? canonicalReadableText(f.firstContext)
    : describe !== 'N/A'
      ? describe
      : '';

  return {
    fileName: f.fileName.trim(),
    filePath: f.filePath.replace(/\\/g, '/'),
    describe,
    firstContext,
    contexts,
    its,
    description: canonicalReadableText(f.description ?? ''),
    author: canonicalReadableText(f.author ?? ''),
    warnings: mergedWarnings,
    fileStats: { ...f.fileStats },
    sourceKind: inferSourceKind(f.fileName)
  };
}

export { canonicalReadableText, trimCodeLine } from './strings';
export { normalizeTestContext, collectItTitlesInTreeOrder } from './normalizeContext';
export type { SourceKind } from '../types';
