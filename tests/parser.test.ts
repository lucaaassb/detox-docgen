import path from 'path';
import fs from 'fs';
import os from 'os';
import { describe, it, expect } from 'vitest';
import { parseDetoxTestFile } from '../src/parser/parseDetoxFile';

const FIX = path.join(__dirname, 'fixtures', 'e2e', 'login.e2e.ts');

describe('parseDetoxTestFile', () => {
  it('extracts describe, hooks and it with steps', () => {
    const p = parseDetoxTestFile(FIX, path.join(__dirname, 'fixtures'));
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
