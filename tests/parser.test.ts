import path from 'path';
import fs from 'fs';
import os from 'os';
import { describe, it, expect } from 'vitest';
import { normalizeParsed } from '../src/normalizer';
import { parseDetoxTestFile, sumFileStats } from '../src/parser/parseDetoxFile';

const FIXTURE_ROOT = path.join(__dirname, 'fixtures');
const E2E_FIXTURES = path.join(FIXTURE_ROOT, 'e2e');
const FIX = path.join(E2E_FIXTURES, 'login.e2e.ts');
const EXPECTED_FIXTURE_FILES = [
  'acessibilidade.e2e.tsx',
  'fluxosAvancados.e2e.ts',
  'home.e2e.ts',
  'login.e2e.ts',
  'onboarding.e2e.ts',
  'perfil.test.js',
  'smoke.e2e.ts',
  'transferencias.spec.ts'
];

describe('parseDetoxTestFile', () => {
  it('extracts describe, hooks and it with steps', () => {
    const p = parseDetoxTestFile(FIX, FIXTURE_ROOT);
    expect(p.fileName).toBe('login.e2e.ts');
    expect(p.describe).toBe('Login');
    expect(p.its.length).toBe(10);
    const ctx = p.contexts[0];
    expect(ctx).toBeDefined();
    const nested = ctx.nested?.find((n) => n.name.includes('Autenticação'));
    expect(nested).toBeDefined();
    const tc = nested?.testCases?.find((test) =>
      test.title.includes('credenciais válidas')
    );
    expect(tc?.title).toBe('deve autenticar usuário com credenciais válidas');
    expect((tc?.steps || []).length).toBeGreaterThan(0);
    expect((tc?.expectations || []).length).toBeGreaterThan(0);
  });

  it('parses the expanded Detox fixture corpus', () => {
    const parsed = fs
      .readdirSync(E2E_FIXTURES)
      .filter((file) => /\.(?:e2e|spec|test)\.[jt]sx?$/.test(file))
      .sort()
      .map((file) => normalizeParsed(parseDetoxTestFile(path.join(E2E_FIXTURES, file), FIXTURE_ROOT)));

    expect(parsed.map((file) => file.fileName)).toEqual(EXPECTED_FIXTURE_FILES);
    expect(parsed.reduce((total, file) => total + file.its.length, 0)).toBe(66);
    expect(sumFileStats(parsed)).toEqual({ e2e: 6, spec: 1, test: 1 });

    const tsxFixture = parsed.find((file) => file.fileName === 'acessibilidade.e2e.tsx');
    expect(tsxFixture?.sourceKind).toBe('tsx');
    expect(tsxFixture?.its).toHaveLength(7);

    const topLevelFixture = parsed.find((file) => file.fileName === 'smoke.e2e.ts');
    expect(topLevelFixture?.describe).toBe('N/A');
    expect(topLevelFixture?.contexts).toHaveLength(4);

    const specFixture = parsed.find((file) => file.fileName === 'transferencias.spec.ts');
    expect(specFixture?.its).toContain('deve confirmar transferência com biometria');
    expect(specFixture?.fileStats).toEqual({ e2e: 0, spec: 1, test: 0 });
  });

  it('keeps helper calls and expression-bodied hooks as technical snippets', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'detox-docgen-parser-'));
    try {
      const file = path.join(dir, 'signIn.e2e.js.js');
      fs.writeFileSync(
        file,
        `
        describe("Shared flow", () => {
          beforeAll(async () => iNatE2eBeforeAll(device));

          it("should sign in the test user", async () => {
            await closeOnboarding();
            const username = await signIn();
            await usernameLabel.tap();
          });
        });
        `,
        'utf8'
      );

      const parsed = parseDetoxTestFile(file, dir);
      const testCase = parsed.contexts[0].testCases?.[0];

      expect(parsed.contexts[0].hooks[0].summary).toBe('iNatE2eBeforeAll(device)');
      expect(testCase?.steps).toContain('await closeOnboarding()');
      expect(testCase?.steps).toContain('await signIn()');
      expect(testCase?.steps).toContain('await usernameLabel.tap()');
      expect(testCase?.codeSnippets).toContain('await closeOnboarding();');
      expect(testCase?.codeSnippets).toContain('const username = await signIn();');
      expect(testCase?.codeSnippets).toContain('await usernameLabel.tap();');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
