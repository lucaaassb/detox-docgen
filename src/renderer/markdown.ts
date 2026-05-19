import { IParsedTestFile, ITestCaseDetail, ITestContext } from '../types';
import { IFlattenedJunit } from '../execution/types';
import { aggregateJunit } from '../execution/parseJunit';

export type ReportMetadata = {
  projectName: string;
  version?: string;
  responsible?: string;
  environment?: string;
};

type JunitIndex = Map<string, IFlattenedJunit[]>;

type TestRow = {
  fileName: string;
  suiteName: string;
  title: string;
  steps: string[];
  expectations: string[];
  metadata: ITestCaseDetail['metadata'];
};

type SelectorRow = {
  selector: string;
  type: string;
  fileName: string;
};

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
  return s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function mdCode(s: string): string {
  return s.replace(/`/g, '\\`').replace(/\r?\n/g, ' ');
}

function stateLabel(state: IFlattenedJunit['state']): string {
  if (state === 'passed') return 'OK';
  if (state === 'failed') return 'Falha';
  if (state === 'skipped') return 'Ignorado';
  return 'Desconhecido';
}

function generationDateString(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}/${d.getFullYear()}`;
}

function sourceKindLabel(kind: string | undefined): string {
  if (kind === 'typescript' || kind === 'tsx') return 'TypeScript';
  if (kind === 'javascript') return 'JavaScript';
  return '-';
}

function countSuites(ctxs: ITestContext[]): number {
  let total = 0;
  for (const ctx of ctxs) {
    total += 1;
    total += countSuites(ctx.nested ?? []);
  }
  return total;
}

function countHooks(ctxs: ITestContext[]): number {
  let total = 0;
  for (const ctx of ctxs) {
    total += ctx.hooks?.length ?? 0;
    total += countHooks(ctx.nested ?? []);
  }
  return total;
}

function collectTestRows(files: IParsedTestFile[]): TestRow[] {
  const rows: TestRow[] = [];
  const visit = (file: IParsedTestFile, ctx: ITestContext) => {
    for (const c of ctx.testCases ?? []) {
      rows.push({
        fileName: file.fileName,
        suiteName: ctx.name,
        title: c.title,
        steps: c.steps,
        expectations: c.expectations,
        metadata: c.metadata
      });
    }
    if (!ctx.testCases?.length) {
      for (const title of ctx.tests ?? []) {
        rows.push({
          fileName: file.fileName,
          suiteName: ctx.name,
          title,
          steps: [],
          expectations: [],
          metadata: {}
        });
      }
    }
    for (const nested of ctx.nested ?? []) visit(file, nested);
  };
  for (const file of files) {
    for (const ctx of file.contexts) visit(file, ctx);
  }
  return rows;
}

function summarizeCodeList(items: string[], emptyLabel: string): string {
  if (!items.length) return emptyLabel;
  return items.map((s, index) => `Código ${index + 1}: \`${mdCode(s)}\``).join('; ');
}

function testStatus(
  junitIndex: JunitIndex,
  suiteName: string,
  title: string
): string {
  const execution = findJunitMatch(junitIndex, suiteName, title);
  return execution ? stateLabel(execution.state) : 'Mapeado';
}

function extractSelectorsFromCode(code: string, fileName: string): SelectorRow[] {
  const rows: SelectorRow[] = [];
  const re = /\bby\.(id|text|label|type|traits|value)\(\s*(['"`])([^'"`]+)\2\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    rows.push({
      selector: match[3],
      type: `by.${match[1]}`,
      fileName
    });
  }
  return rows;
}

function collectSelectors(rows: TestRow[]): SelectorRow[] {
  const seen = new Set<string>();
  const out: SelectorRow[] = [];
  for (const row of rows) {
    for (const code of [...row.steps, ...row.expectations]) {
      for (const selector of extractSelectorsFromCode(code, row.fileName)) {
        const key = `${selector.type}\0${selector.selector}\0${selector.fileName}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(selector);
      }
    }
  }
  return out;
}

function buildCover(
  files: IParsedTestFile[],
  stats: { totalTestFiles: number; totalTests: number },
  metadata: ReportMetadata
): string {
  let m = '# Documentação de Testes Automatizados E2E com Detox\n\n';
  m += `**Projeto:** ${mdText(metadata.projectName)}\n\n`;
  m += '**Framework:** Detox\n\n';
  m += '**Tipo de teste:** End-to-End Mobile\n\n';
  m += `**Total de arquivos analisados:** ${stats.totalTestFiles}\n\n`;
  m += `**Total de cenários mapeados:** ${stats.totalTests}\n\n`;
  m += `**Data de geração:** ${generationDateString()}\n\n`;
  const languages = Array.from(new Set(files.map((f) => sourceKindLabel(f.sourceKind)).filter((x) => x !== '-')));
  if (languages.length) m += `**Linguagem:** ${mdText(languages.join(', '))}\n\n`;
  m += '---\n\n';
  return m;
}

function buildSummaryCards(
  files: IParsedTestFile[],
  stats: { totalTestFiles: number; totalTests: number }
): string {
  const suites = files.reduce((acc, f) => acc + countSuites(f.contexts), 0);
  const hooks = files.reduce((acc, f) => acc + countHooks(f.contexts), 0);
  const languages = Array.from(new Set(files.map((f) => sourceKindLabel(f.sourceKind)).filter((x) => x !== '-')));
  let m = '## Cards de resumo\n\n';
  m += '| Métrica | Valor |\n';
  m += '| --- | ---: |\n';
  m += `| Arquivos de teste | ${stats.totalTestFiles} |\n`;
  m += `| Suítes encontradas | ${suites} |\n`;
  m += `| Testes mapeados | ${stats.totalTests} |\n`;
  m += `| Hooks identificados | ${hooks} |\n`;
  m += '| Framework | Detox |\n';
  m += `| Linguagem | ${mdText(languages.join(', ') || '-')} |\n\n`;
  return m;
}

function buildStatusTable(rows: TestRow[], junitIndex: JunitIndex): string {
  let m = '## Status dos testes\n\n';
  m += '| Teste | Status |\n';
  m += '| --- | --- |\n';
  for (const row of rows) {
    m += `| ${mdText(row.title)} | ${testStatus(junitIndex, row.suiteName, row.title)} |\n`;
  }
  m += '\n';
  return m;
}

function buildSelectorsTable(rows: TestRow[]): string {
  const selectors = collectSelectors(rows);
  let m = '## Seletores usados\n\n';
  if (!selectors.length) {
    m += 'Nenhum seletor Detox foi identificado automaticamente nos passos mapeados.\n\n';
    return m;
  }
  m += '| Seletor | Tipo | Arquivo |\n';
  m += '| --- | --- | --- |\n';
  for (const s of selectors) {
    m += `| \`${mdCode(s.selector)}\` | \`${mdCode(s.type)}\` | \`${mdCode(s.fileName)}\` |\n`;
  }
  m += '\n';
  return m;
}

function buildCoverageTable(rows: TestRow[]): string {
  const byFeature = new Map<string, { fileName: string; count: number }>();
  for (const row of rows) {
    const feature = row.metadata.screen || row.suiteName;
    const key = `${feature}\0${row.fileName}`;
    const current = byFeature.get(key) ?? { fileName: row.fileName, count: 0 };
    current.count += 1;
    byFeature.set(key, current);
  }

  let m = '## Cobertura por tela / funcionalidade\n\n';
  if (!byFeature.size) {
    m += 'Não foi possível calcular cobertura porque nenhum cenário foi mapeado.\n\n';
    return m;
  }
  m += '| Funcionalidade | Arquivo | Quantidade de testes |\n';
  m += '| --- | --- | ---: |\n';
  for (const [key, value] of byFeature) {
    const [feature] = key.split('\0');
    m += `| ${mdText(feature)} | \`${mdCode(value.fileName)}\` | ${value.count} |\n`;
  }
  m += '\n';
  return m;
}

function buildAutomatedAnalysis(): string {
  let m = '## Análise automatizada dos testes\n\n';
  m += 'A ferramenta identificou automaticamente:\n\n';
  m += '- Arquivos de teste Detox\n';
  m += '- Suítes de teste\n';
  m += '- Cenários definidos com it/test\n';
  m += '- Hooks de configuração\n';
  m += '- Ações executadas nos testes\n';
  m += '- Validações realizadas com expect\n';
  m += '- Seletores utilizados nos elementos da interface\n\n';
  return m;
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
    m += '**Hooks de configuração do bloco**:\n\n';
    for (const h of ctx.hooks) {
      m += `- *${h.type}*${h.summary ? `: Código: \`${mdCode(h.summary)}\`` : ''}\n`;
    }
    m += '\n';
  }
  if (ctx.testCases && ctx.testCases.length) {
    m += '| Cenário | Ações executadas | Validação esperada | Status |\n';
    m += '| --- | --- | --- | --- |\n';
    for (const c of ctx.testCases) {
      const execution = findJunitMatch(junitIndex, ctx.name, c.title);
      const status = execution
        ? `${stateLabel(execution.state)} (${formatDurationSeconds(execution.timeSec)})`
        : 'Mapeado';
      const details = [
        c.metadata.description ? mdText(c.metadata.description) : '',
        c.metadata.screen ? `Tela: ${mdText(c.metadata.screen)}` : '',
        c.metadata.priority ? `Prioridade: ${mdText(c.metadata.priority)}` : '',
        c.metadata.author ? `Autor: ${mdText(c.metadata.author)}` : ''
      ].filter(Boolean);
      const scenario = details.length ? `${mdText(c.title)} — ${details.join(' — ')}` : mdText(c.title);
      m += `| ${scenario} | ${summarizeCodeList(c.steps, 'Nenhuma ação inicial')} | ${summarizeCodeList(
        c.expectations,
        'Nenhuma validação automática identificada'
      )} | ${status} |\n`;
    }
    m += '\n';
  } else if (ctx.tests.length) {
    m += '| Cenário | Ações executadas | Validação esperada | Status |\n';
    m += '| --- | --- | --- | --- |\n';
    for (const t of ctx.tests) {
      m += `| ${mdText(t)} | Nenhuma ação inicial | Nenhuma validação automática identificada | Mapeado |\n`;
    }
    m += '\n';
  }
  for (const n of ctx.nested ?? []) {
    m += renderSuite(n, depth + 1, junitIndex);
  }
  return m;
}

function renderFileSection(p: IParsedTestFile, junitIndex: JunitIndex): string {
  let m = `## Arquivo: **${mdText(p.fileName)}**\n\n`;
  m += `**Caminho:** ${mdText(p.filePath)}\n\n`;
  if (p.sourceKind) m += `**Linguagem:** ${sourceKindLabel(p.sourceKind)}\n\n`;
  if (p.description) m += `**Descrição:** ${mdText(p.description)}\n\n`;
  if (p.author) m += `**Autor (arquivo):** ${mdText(p.author)}\n\n`;
  if (p.warnings.length) {
    m += '**Avisos do analisador:**\n\n';
    for (const w of p.warnings) {
      m += `- Código: \`${mdCode(w)}\`\n`;
    }
    m += '\n';
  }
  for (const c of p.contexts) {
    m += renderSuite(c, 0, junitIndex);
  }
  return m;
}

export function buildJunitTable(rows: IFlattenedJunit[]): string {
  let m = '| **ID** | **Categoria (suite)** | **Teste** | **Estado** | **Duração** |\n';
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
    m += 'Não foram encontradas falhas no relatório JUnit analisado.\n\n';
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
  let m = '## 6. Conclusões e recomendações (execução)\n\n';
  m += '- Corrigir primeiro os fluxos com falha listados acima, por impacto de negócio.\n';
  m += '- Rever testes com tempo elevado; verificar gargalos (rede, animação, I/O).\n';
  m += '- Manter o pipeline gerando o artefato JUnit para atualização automática desta seção.\n';
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
  let m = '# Relatório de execução - E2E Detox (Artefato JUnit / Jest)\n\n';
  m += '## 1. Identificação do projeto\n\n\n';
  m += '| **Informação** | **Valor** |\n';
  m += '|----------------|-----------|\n';
  m += `| **Sistema**     | ${mdText(metadata.projectName)} |\n`;
  m += `| **Versão**      | ${mdText(metadata.version || '-')} |\n`;
  m += `| **Ambiente**    | ${mdText(metadata.environment || '-')} |\n`;
  m += `| **Data / hora** | ${dt} |\n`;
  m += `| **Responsável** | ${mdText(metadata.responsible || '-')} |\n\n`;
  m += '## 2. Objetivo\n\n';
  m += 'Síntese de resultados de execução com base no XML JUnit gerado (por exemplo, jest-junit).\n\n';
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
  projectNameOrMetadata: string | ReportMetadata
): string {
  const metadata: ReportMetadata =
    typeof projectNameOrMetadata === 'string'
      ? { projectName: projectNameOrMetadata }
      : projectNameOrMetadata;
  const junitIndex = buildJunitIndex(allRows);
  const hasJunit = allRows.length > 0;
  const testRows = collectTestRows(files);
  let m = buildCover(files, stats, metadata);
  m += buildSummaryCards(files, stats);
  m += buildStatusTable(testRows, junitIndex);
  m += buildSelectorsTable(testRows);
  m += buildCoverageTable(testRows);
  m += buildAutomatedAnalysis();
  if (hasJunit) m += buildExecutionReportJunit(allRows, metadata);
  m += '## Resumo técnico\n\n';
  m += `- Arquivos de teste: **${stats.totalTestFiles}**\n`;
  m += `- Testes (it / test) enumerados: **${stats.totalTests}**\n`;
  if (allRows.length) {
    const a = aggregateJunit(allRows);
    m += `- Testes no JUnit: **${a.total}** (${a.passed} OK, ${a.failed} falha(s), ${a.skipped} ignorado(s))\n`;
    const documented = new Set(files.flatMap((f) => f.its.map(canonicalKey)));
    const unmatchedJunit = allRows.filter((r) => !documented.has(canonicalKey(r.name))).length;
    if (unmatchedJunit) m += `- Linhas JUnit sem teste documentado correspondente: **${unmatchedJunit}**\n`;
  }
  if (stats.e2e) m += `- Padrão \`*.e2e.*\`: **${stats.e2e}** arquivo(s)\n`;
  if (stats.spec) m += `- Padrão \`*.spec.*\`: **${stats.spec}** arquivo(s)\n`;
  if (stats.test) m += `- Padrão \`*.test.*\`: **${stats.test}** arquivo(s)\n`;
  m += '\n';
  m += '---\n\n';
  for (const f of files) {
    m += renderFileSection(f, junitIndex);
  }
  return m;
}
