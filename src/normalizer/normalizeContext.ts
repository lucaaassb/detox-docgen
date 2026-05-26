import { IHookInfo, ITestCaseDetail, ITestContext } from '../types';
import { canonicalReadableText, trimCodeLine } from './strings';

const HOOK_ORDER: Record<IHookInfo['type'], number> = {
  beforeAll: 0,
  beforeEach: 1,
  afterEach: 2,
  afterAll: 3
};

function normalizeMetadata(
  m: ITestCaseDetail['metadata']
): ITestCaseDetail['metadata'] {
  const out: ITestCaseDetail['metadata'] = {};
  const put = (k: keyof ITestCaseDetail['metadata'], v: string | undefined) => {
    if (v == null) return;
    const t = canonicalReadableText(String(v));
    if (t) out[k] = t;
  };
  put('description', m.description);
  put('author', m.author);
  put('screen', m.screen);
  put('priority', m.priority);
  return out;
}

function normalizeHooks(hooks: IHookInfo[]): IHookInfo[] {
  const sorted = [...hooks].sort(
    (a, b) => HOOK_ORDER[a.type] - HOOK_ORDER[b.type]
  );
  const seen = new Set<string>();
  const out: IHookInfo[] = [];
  for (const h of sorted) {
    const summary = trimCodeLine(h.summary);
    const key = `${h.type}\0${summary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type: h.type, summary });
  }
  return out;
}

function normalizeTestCase(
  tc: ITestCaseDetail,
  emptyStepWarnings: Set<string>
): ITestCaseDetail {
  const title = canonicalReadableText(tc.title);
  const steps = tc.steps.map(trimCodeLine).filter((s) => s.length > 0);
  const expectations = tc.expectations.map(trimCodeLine).filter((s) => s.length > 0);
  const codeSnippets = (tc.codeSnippets ?? [])
    .map(trimCodeLine)
    .filter((s) => s.length > 0);
  const metadata = normalizeMetadata(tc.metadata);

  if (
    steps.length === 0 &&
    expectations.length === 0 &&
    codeSnippets.length === 0 &&
    !metadata.description
  ) {
    emptyStepWarnings.add(
      `Teste sem passos ou expectativas extraíveis: "${title}" — use JSDoc @description ou comandos element/device/expect no corpo.`
    );
  }

  return {
    title,
    steps,
    expectations,
    ...(codeSnippets.length ? { codeSnippets } : {}),
    metadata
  };
}

/**
 * Converte uma suíte (e sub-suítes) para o modelo interno padronizado.
 */
export function normalizeTestContext(ctx: ITestContext, emptyStepWarnings: Set<string>): ITestContext {
  const name = canonicalReadableText(ctx.name);
  const hooks = normalizeHooks(ctx.hooks ?? []);
  const nested = (ctx.nested ?? []).map((n) =>
    normalizeTestContext(n, emptyStepWarnings)
  );

  let testCases: ITestCaseDetail[] | undefined;
  let tests: string[];

  if (ctx.testCases && ctx.testCases.length > 0) {
    testCases = ctx.testCases.map((tc) => normalizeTestCase(tc, emptyStepWarnings));
    tests = testCases.map((t) => t.title);
  } else {
    testCases = undefined;
    tests = (ctx.tests ?? []).map((t) => canonicalReadableText(t)).filter(Boolean);
  }

  return { name, tests, testCases, hooks, nested };
}

/**
 * Percorre a árvore em profundidade-primeiro (nested antes dos testes do nível),
 * alinhado à ordem típica de leitura de `describe` aninhados no arquivo.
 */
export function collectItTitlesInTreeOrder(ctx: ITestContext): string[] {
  const out: string[] = [];
  for (const n of ctx.nested ?? []) {
    out.push(...collectItTitlesInTreeOrder(n));
  }
  if (ctx.testCases && ctx.testCases.length) {
    for (const tc of ctx.testCases) {
      out.push(canonicalReadableText(tc.title));
    }
  } else {
    for (const t of ctx.tests ?? []) {
      out.push(canonicalReadableText(t));
    }
  }
  return out;
}
