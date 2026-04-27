import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import fg from 'fast-glob';
import { IFlattenedJunit } from './types';

function num(v: unknown, def: number = 0): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return def;
}

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function attr(
  o: Record<string, unknown> | null | undefined,
  a: string,
  b?: string
): string | number | undefined {
  if (!o) return undefined;
  const p = o[`@_${a}`] ?? o[a];
  if (p != null) return p as string | number;
  if (b) return o[b] as string | number;
  return undefined;
}

function mapTestcase(
  raw: unknown,
  suiteName?: string
): IFlattenedJunit | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = attr(o, 'name', 'name');
  if (name == null) return null;
  const t = num(attr(o, 'time', 'time'), 0);
  const cls = (attr(o, 'classname', 'classname') ?? suiteName ?? '') as string;
  const failure = o.failure ?? o.error ?? o['@_failure'];
  let message: string | undefined;
  if (typeof failure === 'string') message = failure;
  else if (Array.isArray(failure)) {
    message = failure
      .map((x) => {
        if (typeof x === 'string') return x;
        if (x && typeof x === 'object') {
          const item = x as Record<string, unknown>;
          return item['#text'] ?? item['@_message'] ?? item.message;
        }
        return undefined;
      })
      .filter(Boolean)
      .join('\n');
  } else if (failure && typeof failure === 'object') {
    const item = failure as Record<string, unknown>;
    const text = item['#text'] ?? item['@_message'] ?? item.message;
    if (text) message = String(text);
  }
  const skipped = o.skipped != null;
  return {
    name: String(name),
    classname: String(cls),
    timeSec: t,
    state: skipped
      ? 'skipped'
      : message != null && String(message)
        ? 'failed'
        : 'passed',
    message: message != null ? String(message) : undefined
  };
}

function walkForTestCases(
  obj: unknown,
  out: IFlattenedJunit[],
  suiteHint: string = ''
): void {
  if (obj == null) return;
  if (Array.isArray(obj)) {
    for (const x of obj) walkForTestCases(x, out, suiteHint);
    return;
  }
  if (typeof obj !== 'object') return;
  const o = obj as Record<string, unknown>;
  const thisSuite = attr(o, 'name', 'name');
  const effective = thisSuite != null ? String(thisSuite) : suiteHint;
  if (o.testcase) {
    for (const tc of toArray(o.testcase as unknown as unknown[])) {
      const m = mapTestcase(tc, effective);
      if (m) out.push(m);
    }
  }
  for (const k of Object.keys(o)) {
    if (k === 'testcase' || k.startsWith('@_')) continue;
    walkForTestCases(o[k], out, effective);
  }
}

export function parseJunitFile(filePath: string): IFlattenedJunit[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const p = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  } as { ignoreAttributes: boolean; attributeNamePrefix: string });
  const j = p.parse(raw) as unknown;
  const out: IFlattenedJunit[] = [];
  walkForTestCases(j, out);
  return out;
}

export async function findJunitFiles(workingDir: string): Promise<string[]> {
  return fg(
    [
      '**/junit.xml',
      '**/e2e-junit.xml',
      '**/e2e/junit.xml',
      '**/*-junit.xml',
      '**/e2e-results.xml'
    ],
    {
      cwd: workingDir,
      absolute: true,
      onlyFiles: true,
      unique: true,
      ignore: ['**/node_modules/**', '**/dist/**'],
      followSymbolicLinks: false
    }
  );
}

export function aggregateJunit(
  results: IFlattenedJunit[]
): { total: number; failed: number; passed: number; timeSec: number; skipped: number } {
  return results.reduce(
    (a, r) => {
      a.total += 1;
      a.timeSec += r.timeSec;
      if (r.state === 'failed') a.failed += 1;
      else if (r.state === 'passed') a.passed += 1;
      else if (r.state === 'skipped') a.skipped += 1;
      return a;
    },
    { total: 0, failed: 0, passed: 0, timeSec: 0, skipped: 0 }
  );
}
