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
    expect(md).toContain('| **Versão**      | 1.2.3 |');
    expect(md).toContain('- Testes no JUnit: **1** (1 OK, 0 falha(s), 0 ignorado(s))');
    expect(md).toContain('#### Cenário: deve abrir a tela');
    expect(md).toContain('| Status | OK (2s) |');
    expect(md).toContain('1. Preencher elemento "email" com "a@b.com".');
    expect(md).toContain('```ts\nawait element(by.id(\'email\')).typeText(\'a@b.com\')\nawait expect(element(by.id(\'homeScreen\'))).toBeVisible()\n```');
    expect(md).toContain('| `email` | `by.id` | `login.e2e.ts` |');
    expect(md).toContain('| Login | deve abrir a tela | 1 |');
    expect(md).toContain('| `login.e2e.ts` | `e2e/login.e2e.ts` | TypeScript | Login | 1 |');
    expect(md).not.toContain('### Describe:');
    expect(md).not.toContain('## Sumário');
  });

  it('renders report chrome in English without translating test content', () => {
    const md = buildTestDocumentation(
      [parsed],
      [{ name: 'deve abrir a tela', classname: 'Login', timeSec: 2.4, state: 'passed' }],
      { spec: 0, e2e: 1, test: 0, totalTestFiles: 1, totalTests: 1 },
      {
        projectName: 'mobile-app',
        reportLanguage: 'en'
      }
    );

    expect(md).toContain('# Automated E2E Test Documentation Report');
    expect(md).toContain('## 1. Executive summary');
    expect(md).toContain('#### Scenario: deve abrir a tela');
    expect(md).toContain('| Objective | deve abrir a tela. |');
    expect(md).toContain('| Status | OK (2s) |');
    expect(md).toContain('1. Fill element "email" with "a@b.com".');
    expect(md).toContain('1. element "home screen" should be visible.');
    expect(md).toContain('| **Version**      | - |');
    expect(md).not.toContain('#### Cenário:');
  });

  it('allows report text overrides for static labels', () => {
    const md = buildTestDocumentation(
      [parsed],
      [],
      { spec: 0, e2e: 1, test: 0, totalTestFiles: 1, totalTests: 1 },
      {
        projectName: 'mobile-app',
        reportLanguage: 'en',
        reportTextOverrides: {
          coverTitle: 'QA Evidence',
          scenarioLabel: 'Case'
        }
      }
    );

    expect(md).toContain('# QA Evidence');
    expect(md).toContain('#### Case: deve abrir a tela');
    expect(md).not.toContain('#### Scenario: deve abrir a tela');
  });

  it('escapes table pipes from JUnit values', () => {
    const table = buildJunitTable([
      { name: 'login | pipe', classname: 'suite | pipe', timeSec: 1, state: 'failed', message: 'x' }
    ]);

    expect(table).toContain('suite \\| pipe');
    expect(table).toContain('login \\| pipe');
  });

  it('uses professional fallback text instead of an empty-code placeholder', () => {
    const noInlineCode: IParsedTestFile = {
      ...parsed,
      contexts: [
        {
          name: 'Shared flow',
          tests: ['should sign in the test user'],
          hooks: [],
          testCases: [
            {
              title: 'should sign in the test user',
              steps: [],
              expectations: [],
              metadata: {}
            }
          ],
          nested: []
        }
      ],
      its: ['should sign in the test user']
    };

    const md = buildTestDocumentation(
      [noInlineCode],
      [],
      { spec: 0, e2e: 1, test: 0, totalTestFiles: 1, totalTests: 1 },
      'mobile-app'
    );

    expect(md).not.toContain('_Nenhum código extraído._');
    expect(md).toContain('Sem trecho de automação inline para exibir');
  });

  it('renders helper call snippets when a scenario delegates to shared flows', () => {
    const helperFlow: IParsedTestFile = {
      ...parsed,
      sourceKind: 'javascript',
      contexts: [
        {
          name: 'Shared flow',
          tests: ['should switch to power mode'],
          hooks: [],
          testCases: [
            {
              title: 'should switch to power mode',
              steps: ['await switchPowerMode()'],
              expectations: [],
              codeSnippets: ['await switchPowerMode();'],
              metadata: {}
            }
          ],
          nested: []
        }
      ],
      its: ['should switch to power mode']
    };

    const md = buildTestDocumentation(
      [helperFlow],
      [],
      { spec: 0, e2e: 1, test: 0, totalTestFiles: 1, totalTests: 1 },
      'mobile-app'
    );

    expect(md).toContain('1. Executar fluxo auxiliar "switch power mode".');
    expect(md).toContain('```js\nawait switchPowerMode();\n```');
  });
});
