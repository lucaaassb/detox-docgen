import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { findTestFiles } from '../src/scanner/findTestFiles';

const FIXTURE_ROOT = path.join(__dirname, 'fixtures');

function tempProject(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'detox-docgen-scanner-'));
}

describe('findTestFiles', () => {
  it('respects file naming convention and .detox-docgenignore', async () => {
    const dir = tempProject();
    try {
      const e2e = path.join(dir, 'e2e');
      const ignored = path.join(e2e, 'ignored');
      fs.mkdirSync(ignored, { recursive: true });
      fs.writeFileSync(path.join(e2e, 'login.e2e.ts'), 'it("x", () => {})', 'utf8');
      fs.writeFileSync(path.join(e2e, 'helper.ts'), 'export const x = 1', 'utf8');
      fs.writeFileSync(path.join(ignored, 'pay.e2e.ts'), 'it("y", () => {})', 'utf8');
      fs.writeFileSync(path.join(dir, '.detox-docgenignore'), 'e2e/ignored/**', 'utf8');

      const files = await findTestFiles(dir, 'e2e/**/*.{ts,tsx}');

      expect(files.map((f) => path.basename(f))).toEqual(['login.e2e.ts']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('accepts Detox files with repeated JavaScript extensions', async () => {
    const dir = tempProject();
    try {
      const e2e = path.join(dir, 'e2e');
      fs.mkdirSync(e2e, { recursive: true });
      fs.writeFileSync(path.join(e2e, 'signIn.e2e.js.js'), 'it("x", () => {})', 'utf8');
      fs.writeFileSync(path.join(e2e, 'switchPowerMode.e2e.js.js'), 'it("y", () => {})', 'utf8');

      const files = await findTestFiles(dir, 'e2e/**/*.{js,jsx,ts,tsx}');

      expect(files.map((f) => path.basename(f))).toEqual([
        'signIn.e2e.js.js',
        'switchPowerMode.e2e.js.js'
      ]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('discovers the expanded fixture corpus across e2e, spec, test and tsx files', async () => {
    const files = await findTestFiles(FIXTURE_ROOT, 'e2e/**/*.{js,jsx,ts,tsx}');

    expect(files.map((f) => path.basename(f))).toEqual([
      'acessibilidade.e2e.tsx',
      'fluxosAvancados.e2e.ts',
      'home.e2e.ts',
      'login.e2e.ts',
      'onboarding.e2e.ts',
      'perfil.test.js',
      'smoke.e2e.ts',
      'transferencias.spec.ts'
    ]);
  });
});
