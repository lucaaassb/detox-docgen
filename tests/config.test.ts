import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { loadUserConfig } from '../src/config';

function tempProject(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'detox-docgen-config-'));
}

describe('loadUserConfig', () => {
  it('uses package name and version as report defaults', () => {
    const dir = tempProject();
    try {
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ name: 'mobile-app', version: '2.0.0' }),
        'utf8'
      );

      const config = loadUserConfig(dir);

      expect(config.projectName).toBe('mobile-app');
      expect(config.version).toBe('2.0.0');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('loads report metadata from CommonJS config', () => {
    const dir = tempProject();
    try {
      fs.writeFileSync(
        path.join(dir, 'detox-docgen.config.cjs'),
        "module.exports = { projectName: 'App QA', version: '3.1.0', environment: 'staging', responsible: 'Lucas' };",
        'utf8'
      );

      const config = loadUserConfig(dir);

      expect(config.projectName).toBe('App QA');
      expect(config.version).toBe('3.1.0');
      expect(config.environment).toBe('staging');
      expect(config.responsible).toBe('Lucas');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
