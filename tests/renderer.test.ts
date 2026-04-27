import { describe, expect, it } from 'vitest';
import { buildJunitTable, buildTestDocumentation } from '../src/renderer/markdown';
import { IParsedTestFile } from '../src/types';

const parsed: IParsedTestFile = {
  fileName: 'login.e2e.ts',
  filePath: 'e2e/login.e2e.ts',
  describe: 'Login',
  firstContext: 'Login',
  contexts: [
    {
      name: 'Login',
      tests: ['deve abrir a tela'],
      hooks: [],
      testCases: [
        {
          title: 'deve abrir a tela',
          steps: ["await element(by.id('email')).typeText('a@b.com')"],
          expectations: ["await expect(element(by.id('homeScreen'))).toBeVisible()"],
          metadata: {
            priority: 'alta',
            screen: 'Login'
          }
        }
      ],
      nested: []
    }
  ],
  its: ['deve abrir a tela'],
  description: '',
  author: '',
  warnings: [],
  fileStats: { spec: 0, e2e: 1, test: 0 },
  sourceKind: 'typescript'
};

describe('markdown renderer', () => {
  it('adds metadata, summary and JUnit execution status to documented tests', () => {
    const md = buildTestDocumentation(
      [parsed],
      [{ name: 'deve abrir a tela', classname: 'Login', timeSec: 2.4, state: 'passed' }],
      { spec: 0, e2e: 1, test: 0, totalTestFiles: 1, totalTests: 1 },
      {
        projectName: 'mobile-app',
        version: '1.2.3',
        environment: 'qa',
        responsible: 'QA'
      }
    );

    expect(md).toContain('| **Sistema**     | mobile-app |');
    expect(md).toContain('| **Versao**      | 1.2.3 |');
    expect(md).toContain('- Testes no JUnit: **1** (1 OK, 0 falha(s), 0 ignorado(s))');
    expect(md).toContain('**Execucao:** OK (2s)');
    expect(md).not.toContain('### Describe:');
    expect(md).toContain('## Sumario');
  });

  it('escapes table pipes from JUnit values', () => {
    const table = buildJunitTable([
      { name: 'login | pipe', classname: 'suite | pipe', timeSec: 1, state: 'failed', message: 'x' }
    ]);

    expect(table).toContain('suite \\| pipe');
    expect(table).toContain('login \\| pipe');
  });
});
