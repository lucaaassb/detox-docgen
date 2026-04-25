import path from 'path';
import { describe, it, expect } from 'vitest';
import { parseDetoxTestFile } from '../src/parser/parseDetoxFile';
import { normalizeParsed } from '../src/normalizer';
import { IHookInfo, IParsedTestFile, ITestContext } from '../src/types';

const FIX = path.join(__dirname, 'fixtures', 'e2e', 'login.e2e.ts');

describe('normalizeParsed', () => {
  it('marca sourceKind e caminhos POSIX', () => {
    const raw = parseDetoxTestFile(FIX, path.join(__dirname, 'fixtures'));
    const n = normalizeParsed(raw);
    expect(n.sourceKind).toBe('typescript');
    expect(n.filePath).not.toContain('\\');
  });

  it('ordena hooks na ordem canónica Jest', () => {
    const ctx: ITestContext = {
      name: 'X',
      tests: [],
      hooks: [
        { type: 'afterEach', summary: 'a' },
        { type: 'beforeAll', summary: 'b' },
        { type: 'beforeEach', summary: 'c' }
      ],
      nested: []
    };
    const f: IParsedTestFile = {
      fileName: 't.test.js',
      filePath: 'e2e/t.test.js',
      describe: 'N/A',
      firstContext: '',
      contexts: [ctx],
      its: [],
      description: '',
      author: '',
      warnings: [],
      fileStats: { spec: 0, e2e: 0, test: 1 }
    };
    const n = normalizeParsed(f);
    const h = n.contexts[0].hooks.map((x: IHookInfo) => x.type);
    expect(h).toEqual(['beforeAll', 'beforeEach', 'afterEach']);
  });

  it('deduplica avisos e colapsa espaços em metadados', () => {
    const tc = {
      title: '  t  ',
      steps: [],
      expectations: [],
      metadata: {
        author: '  x  '
      }
    };
    const f: IParsedTestFile = {
      fileName: 'a.ts',
      filePath: 'e2e/a.ts',
      describe: 'D',
      firstContext: 'D',
      contexts: [
        {
          name: 'S',
          tests: ['t'],
          testCases: [tc],
          hooks: [],
          nested: []
        }
      ],
      its: ['t'],
      description: '',
      author: '',
      warnings: ['dup', 'dup', '  x  '],
      fileStats: { spec: 0, e2e: 0, test: 0 }
    };
    const n = normalizeParsed(f);
    expect(n.warnings.filter((w) => w === 'dup').length).toBeLessThanOrEqual(1);
    expect(n.contexts[0].testCases?.[0].metadata.description).toBeUndefined();
    expect(n.contexts[0].testCases?.[0].metadata.author).toBe('x');
    expect(n.warnings.some((w) => w.includes('sem passos'))).toBe(true);
  });
});
