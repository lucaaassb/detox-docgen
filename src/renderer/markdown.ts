import { IParsedTestFile, ITestContext } from '../types';
import { IFlattenedJunit } from '../execution/types';
import { aggregateJunit } from '../execution/parseJunit';

export function formatDurationSeconds(sec: number): string {
  const t = Math.floor(sec);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function headingLevel(depth: number, base: number = 3): string {
  const d = Math.min(6, base + Math.min(depth, 3));
  return '#'.repeat(d);
}

function renderSuite(ctx: ITestContext, depth: number): string {
  let m = '';
  m += `${headingLevel(depth, 2)} **${ctx.name}**\n\n`;
  if (ctx.hooks && ctx.hooks.length) {
    m += `**Hooks de configuração do bloco**:\n\n`;
    for (const h of ctx.hooks) {
      m += `- *${h.type}*${h.summary ? `: \`${h.summary}\`` : ''}\n`;
    }
    m += '\n';
  }
  if (ctx.testCases && ctx.testCases.length) {
    for (const c of ctx.testCases) {
      m += `#### ${c.title}\n\n`;
      if (c.metadata.description) {
        m += `*${c.metadata.description}*\n\n`;
      }
      if (c.metadata.author) m += `**Autor (JSDoc):** ${c.metadata.author}\n\n`;
      if (c.metadata.screen) m += `**Tela:** ${c.metadata.screen}\n\n`;
      if (c.metadata.priority) m += `**Prioridade:** ${c.metadata.priority}\n\n`;
      if (c.steps.length) {
        m += '**Passos (extraídos do corpo do teste):**\n\n';
        for (const s of c.steps) {
          m += `- \`${s}\`\n`;
        }
        m += '\n';
      }
      if (c.expectations.length) {
        m += '**Expectativas (assert/expect):**\n\n';
        for (const s of c.expectations) {
          m += `- \`${s}\`\n`;
        }
        m += '\n';
      }
    }
  } else if (ctx.tests.length) {
    m += `**Cenários:**\n\n`;
    for (const t of ctx.tests) {
      m += `- ${t}\n`;
    }
    m += '\n';
  }
  for (const n of ctx.nested ?? []) {
    m += renderSuite(n, depth + 1);
  }
  return m;
}

function renderFileSection(p: IParsedTestFile): string {
  let m = `## Ficheiro: **${p.fileName}**\n\n`;
  m += `**Caminho:** ${p.filePath}\n\n`;
  if (p.description) m += `**Descrição:** ${p.description}\n\n`;
  if (p.author) m += `**Autor (ficheiro):** ${p.author}\n\n`;
  if (p.warnings.length) {
    m += '**Avisos do analisador:**\n\n';
    for (const w of p.warnings) {
      m += `- \`${w}\`\n`;
    }
    m += '\n';
  }
  if (p.describe !== 'N/A') m += `### Describe: **${p.describe}**\n\n`;
  for (const c of p.contexts) {
    m += renderSuite(c, 0);
  }
  return m;
}

export function buildJunitTable(rows: IFlattenedJunit[]): string {
  let m = `| **ID** | **Categoria (suite)** | **Teste** | **Estado** | **Duração** |\n`;
  m += `|--------|------------------------|----------|------------|-------------|\n`;
  let i = 0;
  for (const r of rows) {
    i += 1;
    const id = `E2E${i.toString().padStart(3, '0')}`;
    const st = r.state === 'passed' ? 'OK' : r.state === 'failed' ? 'Falha' : 'Ignorado';
    m += `| ${id} | ${r.classname || r.name} | ${r.name} | ${st} | ${formatDurationSeconds(
      r.timeSec
    )} |\n`;
  }
  return m;
}

export function buildJunitErrorSection(rows: IFlattenedJunit[]): string {
  const fail = rows.filter((r) => r.state === 'failed');
  let m = '## 5. Detalhes de falhas (JUnit / Jest)\n\n';
  if (fail.length === 0) {
    m += 'Não foram encontradas falhas no relatório JUnit analisado.\n\n';
    return m;
  }
  for (const f of fail) {
    m += `### **${f.name}**\n\n`;
    m += f.message
      ? `${f.message}\n\n`
      : '_Sem mensagem de erro no XML._\n\n';
  }
  return m;
}

export function buildJunitConclusions(): string {
  let m = '## 6. Conclusões e recomendações (execução)\n\n';
  m += '- Corrigir primeiro os fluxos com falha listados acima, por impacto de negócio.\n';
  m += '- Rever testes com tempo elevado; verificar gargalos (rede, animação, I/O).\n';
  m += '- Manter o *pipeline* a gerar o artefato JUnit para atualização automática desta seção.\n';
  m += '\n';
  return m;
}

function dateTimeString(): string {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(
    d.getDate()
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export function buildExecutionReportJunit(
  allRows: IFlattenedJunit[],
  projectName: string
): string {
  if (allRows.length === 0) return '';
  const a = aggregateJunit(allRows);
  const passRate = a.total > 0 ? ((a.passed / a.total) * 100).toFixed(2) : '0.00';
  const failRate = a.total > 0 ? ((a.failed / a.total) * 100).toFixed(2) : '0.00';
  const dt = dateTimeString();
  let m = `# Relatório de execução — E2E Detox (Artefato JUnit / Jest)\n\n`;
  m += '## 1. Identificação do projecto\n\n\n';
  m += '| **Informação** | **Valor** |\n';
  m += '|-----------------|-----------|\n';
  m += `| **Sistema**     | ${projectName} |\n`;
  m += `| **Versão**      | - |\n`;
  m += `| **Data / hora** | ${dt} |\n`;
  m += `| **Responsável** | - |\n\n`;
  m += '## 2. Objetivo\n\n';
  m += 'Síntese de resultados de execução com base no XML JUnit gerado (por ex. *jest-junit*).\n\n';
  m += '## 3. Métricas gerais\n\n';
  m += '| **Métrica**            | **Valor** |\n';
  m += '|------------------------|-----------|\n';
  m += `| **Testes (linhas JUnit)** | ${a.total} |\n`;
  m += `| **Passou**            | ${a.passed} (${passRate}%) |\n`;
  m += `| **Falhou**            | ${a.failed} (${failRate}%) |\n`;
  m += `| **Ignorados**         | ${a.skipped} |\n`;
  m += `| **Soma duração (s)**  | ${a.timeSec.toFixed(2)} |\n\n`;
  m += '## 4. Detalhe por teste (JUnit)\n\n';
  m += buildJunitTable(allRows);
  m += '\n\n';
  m += buildJunitErrorSection(allRows);
  m += buildJunitConclusions();
  m += '\n---\n\n';
  return m;
}

export function buildTestDocumentation(
  files: IParsedTestFile[],
  allRows: IFlattenedJunit[],
  stats: { spec: number; e2e: number; test: number; totalTestFiles: number; totalTests: number },
  projectName: string
): string {
  const hasJunit = allRows.length > 0;
  let m = hasJunit ? buildExecutionReportJunit(allRows, projectName) : '';
  if (!hasJunit) {
    m = `# Documentação de testes Detox (E2E)\n\n`;
  }
  m += `## Resumo\n\n`;
  m += `- Ficheiros de teste: **${stats.totalTestFiles}**\n`;
  m += `- Testes (it / test) enumerados: **${stats.totalTests}**\n`;
  if (stats.e2e) m += `- Padrão \`*.e2e.*\`: **${stats.e2e}** ficheiro(s)\n`;
  if (stats.spec) m += `- Padrão \`*.spec.*\`: **${stats.spec}** ficheiro(s)\n`;
  if (stats.test) m += `- Padrão \`*.test.*\`: **${stats.test}** ficheiro(s)\n`;
  m += '\n';
  m += '---\n\n';
  for (const f of files) {
    m += renderFileSection(f);
  }
  return m;
}
