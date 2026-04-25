import path from 'path';
import { describe, it, expect } from 'vitest';
import { parseDetoxTestFile } from '../src/parser/parseDetoxFile';

const FIX = path.join(__dirname, 'fixtures', 'e2e', 'login.e2e.ts');

describe('parseDetoxTestFile', () => {
  it('extracts describe, hooks and it with steps', () => {
    const p = parseDetoxTestFile(FIX, path.join(__dirname, 'fixtures'));
    expect(p.fileName).toBe('login.e2e.ts');
    expect(p.describe).toBe('Login');
    expect(p.its.length).toBe(1);
    const ctx = p.contexts[0];
    expect(ctx).toBeDefined();
    const nested = ctx.nested?.find((n) => n.name.includes('com email'));
    expect(nested).toBeDefined();
    const tc = nested?.testCases?.[0];
    expect(tc?.title).toBe('deve abrir a tela');
    expect((tc?.steps || []).length).toBeGreaterThan(0);
    expect((tc?.expectations || []).length).toBeGreaterThan(0);
  });
});
