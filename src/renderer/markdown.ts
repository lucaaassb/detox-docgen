import { IParsedTestFile, ITestContext } from '../types';
import { IFlattenedJunit } from '../execution/types';
import { aggregateJunit } from '../execution/parseJunit';

export type ReportMetadata = {
  projectName: string;
  version?: string;
  responsible?: string;
  environment?: string;
};

type JunitIndex = Map<string, IFlattenedJunit[]>;

export function formatDurationSeconds(sec: number): string {
  const t = Math.floor(sec);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function canonicalKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function mdText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function mdCode(s: string): string {
  return s.replace(/`/g, '\\`').replace(/\r?\n/g, ' ');
}

function anchorFor(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function stateLabel(state: IFlattenedJunit['state']): string {
  if (state === 'passed') return 'OK';
  if (state === 'failed') return 'Falha';
  if (state === 'skipped') return 'Ignorado';
  return 'Desconhecido';
}

function buildJunitIndex(rows: IFlattenedJunit[]): JunitIndex {
  const index: JunitIndex = new Map();
  for (const row of rows) {
    for (const key of [row.name, `${row.classname} ${row.name}`]) {
      const k = canonicalKey(key);
      if (!k) continue;
      const list = index.get(k) ?? [];
      list.push(row);
      index.set(k, list);
    }
  }
  return index;
}

function findJunitMatch(index: JunitIndex, suiteName: string, testTitle: string): IFlattenedJunit | undefined {
  const exact = index.get(canonicalKey(testTitle))?.[0];
  if (exact) return exact;
  const suiteExact = index.get(canonicalKey(`${suiteName} ${testTitle}`))?.[0];
  if (suiteExact) return suiteExact;

  const titleKey = canonicalKey(testTitle);
  for (const [key, rows] of index) {
    if (key.endsWith(titleKey) || key.includes(titleKey)) return rows[0];
  }
  return undefined;
}

function headingLevel(depth: number, base: number = 3): string {
  const d = Math.min(6, base + Math.min(depth, 3));
  return '#'.repeat(d);
}

function renderSuite(ctx: ITestContext, depth: number, junitIndex: JunitIndex): string {
  let m = '';
  m += `${headingLevel(depth, 2)} **${mdText(ctx.name)}**\n\n`;
  if (ctx.hooks && ctx.hooks.length) {
    m += '**Hooks de configuracao do bloco**:\n\n';
    for (const h of ctx.hooks) {
      m += `- *${h.type}*${h.summary ? `: \`${mdCode(h.summary)}\`` : ''}\n`;
    }
    m += '\n';
  }
  if (ctx.testCases && ctx.testCases.length) {
    for (const c of ctx.testCases) {
      const execution = findJunitMatch(junitIndex, ctx.name, c.title);
      m += `#### ${mdText(c.title)}\n\n`;
      if (execution) {
        m += `**Execucao:** ${stateLabel(execution.state)} (${formatDurationSeconds(execution.timeSec)})\n\n`;
      }
      if (c.metadata.description) {
        m += `*${mdText(c.metadata.description)}*\n\n`;
      }
      if (c.metadata.author) m += `**Autor (JSDoc):** ${mdText(c.metadata.author)}\n\n`;
      if (c.metadata.screen) m += `**Tela:** ${mdText(c.metadata.screen)}\n\n`;
      if (c.metadata.priority) m += `**Prioridade:** ${mdText(c.metadata.priority)}\n\n`;
      if (c.steps.length) {
        m += '**Passos (extraidos do corpo do teste):**\n\n';
        for (const s of c.steps) {
          m += `- \`${mdCode(s)}\`\n`;
        }
        m += '\n';
      }
      if (c.expectations.length) {
        m += '**Expectativas (assert/expect):**\n\n';
        for (const s of c.expectations) {
          m += `- \`${mdCode(s)}\`\n`;
        }
        m += '\n';
      }
    }
  } else if (ctx.tests.length) {
    m += '**Cenarios:**\n\n';
    for (const t of ctx.tests) {
      m += `- ${mdText(t)}\n`;
    }
    m += '\n';
  }
  for (const n of ctx.nested ?? []) {
    m += renderSuite(n, depth + 1, junitIndex);
  }
  return m;
}

function renderFileSection(p: IParsedTestFile, junitIndex: JunitIndex): string {
  let m = `## Ficheiro: **${mdText(p.fileName)}**\n\n`;
  m += `**Caminho:** ${mdText(p.filePath)}\n\n`;
  if (p.sourceKind) m += `**Tipo:** ${p.sourceKind}\n\n`;
  if (p.description) m += `**Descricao:** ${mdText(p.description)}\n\n`;
  if (p.author) m += `**Autor (ficheiro):** ${mdText(p.author)}\n\n`;
  if (p.warnings.length) {
    m += '**Avisos do analisador:**\n\n';
    for (const w of p.warnings) {
      m += `- \`${mdCode(w)}\`\n`;
    }
    m += '\n';
  }
  for (const c of p.contexts) {
    m += renderSuite(c, 0, junitIndex);
  }
  return m;
}

export function buildJunitTable(rows: IFlattenedJunit[]): string {
  let m = '| **ID** | **Categoria (suite)** | **Teste** | **Estado** | **Duracao** |\n';
  m += '|--------|------------------------|----------|------------|-------------|\n';
  let i = 0;
  for (const r of rows) {
    i += 1;
    const id = `E2E${i.toString().padStart(3, '0')}`;
    m += `| ${id} | ${mdText(r.classname || r.name)} | ${mdText(r.name)} | ${stateLabel(r.state)} | ${formatDurationSeconds(
      r.timeSec
    )} |\n`;
  }
  return m;
}

export function buildJunitErrorSection(rows: IFlattenedJunit[]): string {
  const fail = rows.filter((r) => r.state === 'failed');
  let m = '## 5. Detalhes de falhas (JUnit / Jest)\n\n';
  if (fail.length === 0) {
    m += 'Nao foram encontradas falhas no relatorio JUnit analisado.\n\n';
    return m;
  }
  for (const f of fail) {
    m += `### **${mdText(f.name)}**\n\n`;
    m += f.message
      ? `${mdText(f.message)}\n\n`
      : '_Sem mensagem de erro no XML._\n\n';
  }
  return m;
}

export function buildJunitConclusions(): string {
  let m = '## 6. Conclusoes e recomendacoes (execucao)\n\n';
  m += '- Corrigir primeiro os fluxos com falha listados acima, por impacto de negocio.\n';
  m += '- Rever testes com tempo elevado; verificar gargalos (rede, animacao, I/O).\n';
  m += '- Manter o pipeline a gerar o artefato JUnit para atualizacao automatica desta secao.\n';
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
  metadata: ReportMetadata
): string {
  if (allRows.length === 0) return '';
  const a = aggregateJunit(allRows);
  const passRate = a.total > 0 ? ((a.passed / a.total) * 100).toFixed(2) : '0.00';
  const failRate = a.total > 0 ? ((a.failed / a.total) * 100).toFixed(2) : '0.00';
  const dt = dateTimeString();
  let m = '# Relatorio de execucao - E2E Detox (Artefato JUnit / Jest)\n\n';
  m += '## 1. Identificacao do projecto\n\n\n';
  m += '| **Informacao** | **Valor** |\n';
  m += '|----------------|-----------|\n';
  m += `| **Sistema**     | ${mdText(metadata.projectName)} |\n`;
  m += `| **Versao**      | ${mdText(metadata.version || '-')} |\n`;
  m += `| **Ambiente**    | ${mdText(metadata.environment || '-')} |\n`;
  m += `| **Data / hora** | ${dt} |\n`;
  m += `| **Responsavel** | ${mdText(metadata.responsible || '-')} |\n\n`;
  m += '## 2. Objetivo\n\n';
  m += 'Sintese de resultados de execucao com base no XML JUnit gerado (por ex. jest-junit).\n\n';
  m += '## 3. Metricas gerais\n\n';
  m += '| **Metrica**            | **Valor** |\n';
  m += '|------------------------|-----------|\n';
  m += `| **Testes (linhas JUnit)** | ${a.total} |\n`;
  m += `| **Passou**            | ${a.passed} (${passRate}%) |\n`;
  m += `| **Falhou**            | ${a.failed} (${failRate}%) |\n`;
  m += `| **Ignorados**         | ${a.skipped} |\n`;
  m += `| **Soma duracao (s)**  | ${a.timeSec.toFixed(2)} |\n\n`;
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
  projectNameOrMetadata: string | ReportMetadata
): string {
  const metadata: ReportMetadata =
    typeof projectNameOrMetadata === 'string'
      ? { projectName: projectNameOrMetadata }
      : projectNameOrMetadata;
  const junitIndex = buildJunitIndex(allRows);
  const hasJunit = allRows.length > 0;
  let m = hasJunit ? buildExecutionReportJunit(allRows, metadata) : '';
  if (!hasJunit) {
    m = '# Documentacao de testes Detox (E2E)\n\n';
    m += `**Projecto:** ${mdText(metadata.projectName)}\n\n`;
  }
  m += '## Resumo\n\n';
  m += `- Ficheiros de teste: **${stats.totalTestFiles}**\n`;
  m += `- Testes (it / test) enumerados: **${stats.totalTests}**\n`;
  if (allRows.length) {
    const a = aggregateJunit(allRows);
    m += `- Testes no JUnit: **${a.total}** (${a.passed} OK, ${a.failed} falha(s), ${a.skipped} ignorado(s))\n`;
    const documented = new Set(files.flatMap((f) => f.its.map(canonicalKey)));
    const unmatchedJunit = allRows.filter((r) => !documented.has(canonicalKey(r.name))).length;
    if (unmatchedJunit) m += `- Linhas JUnit sem teste documentado correspondente: **${unmatchedJunit}**\n`;
  }
  if (stats.e2e) m += `- Padrao \`*.e2e.*\`: **${stats.e2e}** ficheiro(s)\n`;
  if (stats.spec) m += `- Padrao \`*.spec.*\`: **${stats.spec}** ficheiro(s)\n`;
  if (stats.test) m += `- Padrao \`*.test.*\`: **${stats.test}** ficheiro(s)\n`;
  m += '\n';
  if (files.length) {
    m += '## Sumario\n\n';
    for (const f of files) {
      m += `- [${mdText(f.fileName)}](#${anchorFor(`Ficheiro ${f.fileName}`)})\n`;
    }
    m += '\n';
  }
  m += '---\n\n';
  for (const f of files) {
    m += renderFileSection(f, junitIndex);
  }
  return m;
}
