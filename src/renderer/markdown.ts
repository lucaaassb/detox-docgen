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
  codeSnippets: string[];
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

function sourceCodeLanguage(kind: string | undefined): string {
  if (kind === 'javascript') return 'js';
  if (kind === 'tsx') return 'tsx';
  return 'ts';
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
        codeSnippets: c.codeSnippets ?? [...c.steps, ...c.expectations],
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
          codeSnippets: [],
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
  return items.map((s, index) => `Código ${index + 1}: \`${mdCode(s)}\``).join(' ');
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
  const re = /\bby\.(id|text|label|type|traits|value)\(\s*(?:(['"`])([^'"`]+)\2|\/((?:\\.|[^/])+?)\/[gimsuy]*)\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    const selector = match[3] ?? `/${match[4]}/`;
    rows.push({
      selector,
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
    const codeSources = row.codeSnippets.length
      ? row.codeSnippets
      : [...row.steps, ...row.expectations];
    for (const code of codeSources) {
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

function featureName(row: TestRow): string {
  const leafSuite = row.suiteName.split(' > ').pop() || row.suiteName;
  if (/sess[aã]o|notifica/i.test(leafSuite)) return leafSuite;
  return row.metadata.screen || leafSuite;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function naturalScenarioTitle(title: string): string {
  const text = title.trim();
  if (!text) return 'Cenário sem título identificado.';
  return text.endsWith('.') ? text : `${text}.`;
}

function scenarioIntent(row: TestRow): string {
  if (row.metadata.description) return row.metadata.description;
  return naturalScenarioTitle(row.title);
}

function friendlySelector(selector: string, type: string): string {
  if (selector.startsWith('/')) return `elemento que corresponde ao padrão ${selector}`;
  if (type === 'by.text') return `texto "${selector}"`;
  const spaced = selector
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .toLowerCase();
  return `elemento "${spaced}"`;
}

function firstSelectorInCode(code: string): SelectorRow | undefined {
  return extractSelectorsFromCode(code, '').at(0);
}

function humanizeIdentifier(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .toLowerCase();
}

function variableTargetInCode(code: string): string | null {
  const wait = /\bwaitFor\(\s*([A-Za-z_$][\w$]*)\s*\)/.exec(code);
  if (wait) return `elemento "${humanizeIdentifier(wait[1])}"`;
  const method = /\b([A-Za-z_$][\w$]*)\.(tap|multiTap|typeText|replaceText|clearText|scroll|scrollTo|swipe|getAttributes)\s*\(/.exec(code);
  if (method) return `elemento "${humanizeIdentifier(method[1])}"`;
  return null;
}

function targetFromCode(code: string, fallback: string): string {
  const selector = firstSelectorInCode(code);
  return selector ? friendlySelector(selector.selector, selector.type) : variableTargetInCode(code) ?? fallback;
}

function helperCallFromCode(code: string): string | null {
  const compact = code
    .replace(/^const\s+[A-Za-z_$][\w$]*\s*=\s*/, '')
    .replace(/;$/, '')
    .trim();
  const match = /^(?:await\s+)?([A-Za-z_$][\w$]*)\s*\(/.exec(compact);
  if (!match) return null;
  const name = match[1];
  if (['element', 'expect', 'waitFor', 'by', 'describe', 'it', 'test'].includes(name)) return null;
  return name;
}

function actionToNaturalLanguage(code: string): string {
  const target = targetFromCode(code, 'elemento da interface');
  const typed = /\.typeText\(\s*(['"`])([^'"`]+)\1\s*\)/.exec(code);
  if (typed) return `Preencher ${target} com "${typed[2]}".`;
  const replaceText = /\.replaceText\(\s*(['"`])([^'"`]+)\1\s*\)/.exec(code);
  if (replaceText) return `Substituir o texto de ${target} por "${replaceText[2]}".`;
  if (/\.clearText\(\)/.test(code)) return `Limpar o texto de ${target}.`;
  if (/\.tap\(\)/.test(code)) return `Tocar em ${target}.`;
  if (/\.multiTap\(/.test(code)) return `Tocar repetidamente em ${target}.`;
  const scroll = /\.scroll\(\s*(\d+)\s*,\s*(['"`])([^'"`]+)\2/.exec(code);
  if (scroll) return `Rolar ${target} para ${scroll[3]}.`;
  const scrollTo = /\.scrollTo\(\s*(['"`])([^'"`]+)\1/.exec(code);
  if (scrollTo) return `Rolar ${target} até ${scrollTo[2]}.`;
  const swipe = /\.swipe\(\s*(['"`])([^'"`]+)\1/.exec(code);
  if (swipe) return `Realizar gesto de deslizar para ${swipe[2]} em ${target}.`;
  if (/\bdevice\.launchApp\(\s*\{[^)]*newInstance:\s*true/.test(code)) {
    return 'Iniciar uma nova instância do aplicativo.';
  }
  if (/\bdevice\.launchApp\(/.test(code)) return 'Iniciar o aplicativo.';
  if (/\bdevice\.reloadReactNative\(/.test(code)) return 'Recarregar o React Native.';
  if (/\bdevice\.relaunchApp\(/.test(code)) return 'Reiniciar o aplicativo.';
  if (/\bdevice\.openURL\(/.test(code)) return 'Abrir o aplicativo por URL/deep link.';
  if (/\bdevice\.sendToHome\(/.test(code)) return 'Enviar o aplicativo para segundo plano.';
  const orientation = /\bdevice\.setOrientation\(\s*(['"`])([^'"`]+)\1/.exec(code);
  if (orientation) return `Alterar a orientação do dispositivo para ${orientation[2]}.`;
  const helper = helperCallFromCode(code);
  if (helper) return `Executar fluxo auxiliar "${humanizeIdentifier(helper)}".`;
  return `Executar comando de automação relacionado a ${target}.`;
}

function expectationToNaturalLanguage(code: string): string {
  const target = targetFromCode(code, 'resultado esperado');
  const timeout = /\.withTimeout\(\s*(\d+)\s*\)/.exec(code);
  const suffix = timeout ? ` em até ${Number(timeout[1]) / 1000}s` : '';
  if (/\.not\.toBeVisible\(\)/.test(code)) return `${target} não deve estar visível${suffix}.`;
  if (/\.toBeNotVisible\(\)/.test(code)) return `${target} não deve estar visível${suffix}.`;
  if (/\.toBeVisible\(\)/.test(code)) return `${target} deve estar visível${suffix}.`;
  if (/\.toExist\(\)/.test(code)) return `${target} deve existir na tela${suffix}.`;
  const text = /\.toHaveText\(\s*(['"`])([^'"`]+)\1\s*\)/.exec(code);
  if (text) return `${target} deve apresentar o texto "${text[2]}".`;
  return `Validar ${target}.`;
}

function hookInterpretation(code: string): string {
  if (/device\.launchApp\(\s*\{[^)]*newInstance:\s*true/.test(code)) {
    return 'Inicia uma nova instância do aplicativo antes da execução da suíte.';
  }
  if (/device\.launchApp\(/.test(code)) {
    return 'Inicia o aplicativo antes da execução dos testes.';
  }
  if (/device\.reloadReactNative\(/.test(code)) {
    return 'Recarrega o React Native para reduzir interferências entre cenários.';
  }
  if (/device\.relaunchApp\(/.test(code)) {
    return 'Reinicia o aplicativo para preparar um novo estado de teste.';
  }
  const helper = helperCallFromCode(code);
  if (helper) {
    return `Delega a preparação para o fluxo auxiliar "${humanizeIdentifier(helper)}".`;
  }
  return 'Prepara o ambiente de teste antes da execução dos cenários.';
}

function featureGroups(rows: TestRow[]): Map<string, TestRow[]> {
  const groups = new Map<string, TestRow[]>();
  for (const row of rows) {
    const key = featureName(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}

function validatedTopics(rows: TestRow[]): string {
  const words = rows
    .map((row) => scenarioIntent(row).replace(/\.$/, '').toLowerCase())
    .slice(0, 4);
  if (!words.length) return 'Cenários automatizados identificados no código de teste';
  return words.join('; ');
}

function codeBlock(lines: string[], language: string = 'ts'): string {
  if (!lines.length) {
    return 'Sem trecho de automação inline para exibir; o cenário pode estar delegado a fluxos auxiliares ou ter apenas estrutura declarativa.\n\n';
  }
  return `\`\`\`${language}\n${lines.join('\n')}\n\`\`\`\n\n`;
}

function buildCover(
  files: IParsedTestFile[],
  stats: { totalTestFiles: number; totalTests: number },
  metadata: ReportMetadata
): string {
  let m = '# Relatório de Documentação de Testes Automatizados E2E\n\n';
  m += `**Projeto:** ${mdText(metadata.projectName)}\n\n`;
  m += '**Framework:** Detox\n\n';
  m += '**Tipo de teste:** End-to-End Mobile\n\n';
  const languages = Array.from(new Set(files.map((f) => sourceKindLabel(f.sourceKind)).filter((x) => x !== '-')));
  if (languages.length) m += `**Linguagem:** ${mdText(languages.join(', '))}\n\n`;
  m += `**Data de geração:** ${generationDateString()}\n\n`;
  m += `**Total de arquivos analisados:** ${stats.totalTestFiles}\n\n`;
  m += `**Total de cenários mapeados:** ${stats.totalTests}\n\n`;
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
  let m = '## 10. Seletores usados\n\n';
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
  let m = '## 11. Como a análise foi montada\n\n';
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

function buildManagementDivider(): string {
  return '# Parte 1 — Visão gerencial\n\nLeitura funcional do que foi encontrado, quais fluxos estão cobertos e quais cuidados considerar ao interpretar o relatório.\n\n---\n\n';
}

function buildTechnicalDivider(): string {
  return '# Parte 2 — Detalhamento técnico\n\nInventário técnico dos arquivos, hooks, seletores e trechos de automação extraídos dos testes.\n\n---\n\n';
}

function buildExecutiveSummary(rows: TestRow[]): string {
  const features = uniqueSorted(rows.map(featureName));
  const examples = features.length
    ? features.slice(0, 5).join(', ')
    : 'as funcionalidades identificadas nos testes';
  let m = '## 1. Resumo executivo\n\n';
  m += `Este relatório apresenta a documentação automatizada dos testes End-to-End da aplicação mobile, utilizando o framework Detox. Os testes simulam ações reais de um usuário e cobrem funcionalidades como ${mdText(examples)}. `;
  m += 'O objetivo é facilitar a compreensão da cobertura dos testes, tanto por pessoas técnicas quanto por pessoas não técnicas.\n\n';
  return m;
}

function buildManagementIndicators(
  files: IParsedTestFile[],
  rows: TestRow[],
  stats: { totalTestFiles: number; totalTests: number }
): string {
  const features = uniqueSorted(rows.map(featureName));
  const suites = files.reduce((acc, f) => acc + countSuites(f.contexts), 0);
  const hooks = files.reduce((acc, f) => acc + countHooks(f.contexts), 0);
  const languages = Array.from(new Set(files.map((f) => sourceKindLabel(f.sourceKind)).filter((x) => x !== '-')));
  let m = '## 2. Indicadores gerais\n\n';
  m += '| Indicador | Valor |\n';
  m += '| --- | ---: |\n';
  m += `| Arquivos de teste analisados | ${stats.totalTestFiles} |\n`;
  m += `| Cenários automatizados | ${stats.totalTests} |\n`;
  m += `| Funcionalidades cobertas | ${features.length} |\n`;
  m += `| Suítes encontradas | ${suites} |\n`;
  m += `| Hooks de preparação identificados | ${hooks} |\n`;
  m += '| Framework utilizado | Detox |\n';
  m += `| Linguagem | ${mdText(languages.join(', ') || '-')} |\n\n`;
  return m;
}

function buildManagementCoverage(rows: TestRow[]): string {
  const groups = featureGroups(rows);
  let m = '## 3. Cobertura por funcionalidade\n\n';
  m += '| Funcionalidade | O que está sendo validado | Quantidade de cenários |\n';
  m += '| --- | --- | ---: |\n';
  for (const [feature, featureRows] of groups) {
    m += `| ${mdText(feature)} | ${mdText(validatedTopics(featureRows))} | ${featureRows.length} |\n`;
  }
  m += '\n';
  return m;
}

function buildNaturalScenarios(rows: TestRow[]): string {
  const groups = featureGroups(rows);
  let m = '## 4. Cenários validados em linguagem natural\n\n';
  for (const [feature, featureRows] of groups) {
    m += `### Funcionalidade: ${mdText(feature)}\n\n`;
    m += 'Cenários validados:\n\n';
    for (const row of featureRows) {
      m += `- ${mdText(naturalScenarioTitle(row.title))}\n`;
    }
    m += '\n';
  }
  return m;
}

function buildManagementConclusion(rows: TestRow[]): string {
  const features = uniqueSorted(rows.map(featureName));
  const topics = uniqueSorted(rows.map((row) => scenarioIntent(row).replace(/\.$/, ''))).slice(0, 6);
  let m = '## 5. Resultado geral da análise\n\n';
  const scenarioLabel = rows.length === 1 ? 'cenário automatizado' : 'cenários automatizados';
  m += `A análise identificou ${rows.length} ${scenarioLabel} distribuído${rows.length === 1 ? '' : 's'} entre as funcionalidades ${mdText(features.join(', ') || 'mapeadas')}. `;
  m += `Os testes mapeados cobrem fluxos essenciais da aplicação${topics.length ? `, como ${mdText(topics.join('; '))}` : ''}.\n\n`;
  return m;
}

function buildManagementNotes(): string {
  let m = '## 6. Observações de leitura\n\n';
  m += '- Todos os cenários foram mapeados, mas isso não significa que foram executados com sucesso.\n';
  m += '- O status "Mapeado" indica que o cenário foi identificado no código de teste.\n';
  m += '- O relatório documenta a estrutura dos testes automatizados, facilitando entendimento, auditoria e manutenção.\n\n';
  return m;
}

function buildManagementReport(
  files: IParsedTestFile[],
  rows: TestRow[],
  stats: { totalTestFiles: number; totalTests: number }
): string {
  let m = buildManagementDivider();
  m += buildExecutiveSummary(rows);
  m += buildManagementIndicators(files, rows, stats);
  m += buildManagementCoverage(rows);
  m += buildNaturalScenarios(rows);
  m += buildManagementConclusion(rows);
  m += buildManagementNotes();
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

function countTestsInContext(ctx: ITestContext): number {
  return (ctx.testCases?.length ?? ctx.tests.length) + (ctx.nested ?? []).reduce((acc, n) => acc + countTestsInContext(n), 0);
}

function buildAnalyzedFilesTable(files: IParsedTestFile[]): string {
  let m = '## 8. Arquivos analisados\n\n';
  m += '| Arquivo | Caminho | Linguagem | Suíte principal | Quantidade de cenários |\n';
  m += '| --- | --- | --- | --- | ---: |\n';
  for (const file of files) {
    const total = file.contexts.reduce((acc, ctx) => acc + countTestsInContext(ctx), 0);
    m += `| \`${mdCode(file.fileName)}\` | \`${mdCode(file.filePath)}\` | ${sourceKindLabel(file.sourceKind)} | ${mdText(file.firstContext || file.describe || '-')} | ${total} |\n`;
  }
  m += '\n';
  return m;
}

function buildHookSectionForSuite(ctx: ITestContext, depth: number, language: string): string {
  let m = '';
  if (ctx.hooks?.length) {
    m += `${headingLevel(depth, 3)} Hooks: ${mdText(ctx.name)}\n\n`;
    for (const hook of ctx.hooks) {
      m += `**Hook:** ${hook.type}\n\n`;
      m += '**Código:**\n\n';
      m += codeBlock(hook.summary ? [hook.summary] : [], language);
      m += `**Interpretação:** ${mdText(hookInterpretation(hook.summary))}\n\n`;
    }
  }
  for (const nested of ctx.nested ?? []) {
    m += buildHookSectionForSuite(nested, depth + 1, language);
  }
  return m;
}

function buildHooksSection(files: IParsedTestFile[]): string {
  let m = '## 9. Hooks de configuração\n\n';
  const body = files
    .map((file) => {
      const language = sourceCodeLanguage(file.sourceKind);
      const content = file.contexts.map((ctx) => buildHookSectionForSuite(ctx, 0, language)).join('');
      return content ? `### Arquivo: ${mdText(file.fileName)}\n\n${content}` : '';
    })
    .filter(Boolean)
    .join('');
  return body ? m + body : m + 'Nenhum hook de configuração foi identificado.\n\n';
}

function renderScenarioCard(c: ITestCaseDetail, ctx: ITestContext, junitIndex: JunitIndex, language: string): string {
  const execution = findJunitMatch(junitIndex, ctx.name, c.title);
  const status = execution
    ? `${stateLabel(execution.state)} (${formatDurationSeconds(execution.timeSec)})`
    : 'Mapeado';
  const steps = c.steps.map(actionToNaturalLanguage);
  const expectations = c.expectations.map(expectationToNaturalLanguage);
  const fallbackFeature = featureName({
    fileName: '',
    suiteName: ctx.name,
    title: c.title,
    steps: c.steps,
    expectations: c.expectations,
    codeSnippets: c.codeSnippets ?? [],
    metadata: c.metadata
  });
  const codeSnippets = c.codeSnippets?.length ? c.codeSnippets : [...c.steps, ...c.expectations];
  let m = `#### Cenário: ${mdText(c.title)}\n\n`;
  m += '| Item | Detalhe |\n';
  m += '| --- | --- |\n';
  m += `| Objetivo | ${mdText(c.metadata.description || naturalScenarioTitle(c.title))} |\n`;
  m += `| Tela / funcionalidade | ${mdText(c.metadata.screen || fallbackFeature)} |\n`;
  if (c.metadata.priority) m += `| Prioridade | ${mdText(c.metadata.priority)} |\n`;
  m += `| Status | ${mdText(status)} |\n\n`;

  m += '**Fluxo automatizado:**\n\n';
  if (steps.length) {
    for (const [index, step] of steps.entries()) m += `${index + 1}. ${mdText(step)}\n`;
  } else {
    m += 'O cenário não apresenta ações Detox inline; a execução parece estar concentrada em fluxos auxiliares ou validações.\n';
  }
  m += '\n**Validações esperadas:**\n\n';
  if (expectations.length) {
    for (const [index, expectation] of expectations.entries()) m += `${index + 1}. ${mdText(expectation)}\n`;
  } else {
    m += 'Nenhuma validação automática foi identificada diretamente no corpo do cenário.\n';
  }
  m += '\n**Trecho técnico extraído:**\n\n';
  m += codeBlock(codeSnippets, language);
  return m;
}

function renderSuite(ctx: ITestContext, depth: number, junitIndex: JunitIndex, language: string): string {
  let m = '';
  m += `${headingLevel(depth, 2)} **${mdText(ctx.name)}**\n\n`;
  if (ctx.testCases && ctx.testCases.length) {
    for (const c of ctx.testCases) {
      m += renderScenarioCard(c, ctx, junitIndex, language);
    }
  } else if (ctx.tests.length) {
    for (const t of ctx.tests) {
      m += `#### Cenário: ${mdText(t)}\n\n`;
      m += '**Descrição funcional:** Cenário identificado no teste automatizado.\n\n';
      m += '**Status:** Mapeado\n\n';
    }
  }
  for (const n of ctx.nested ?? []) {
    m += renderSuite(n, depth + 1, junitIndex, language);
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
  const language = sourceCodeLanguage(p.sourceKind);
  for (const c of p.contexts) {
    m += renderSuite(c, 0, junitIndex, language);
  }
  return m;
}

function buildTechnicalSummary(
  files: IParsedTestFile[],
  allRows: IFlattenedJunit[],
  stats: { spec: number; e2e: number; test: number; totalTestFiles: number; totalTests: number }
): string {
  const languages = Array.from(new Set(files.map((f) => sourceKindLabel(f.sourceKind)).filter((x) => x !== '-')));
  let m = '## 7. Resumo técnico\n\n';
  m += `- Arquivos de teste: **${stats.totalTestFiles}**\n`;
  m += `- Testes (it / test) enumerados: **${stats.totalTests}**\n`;
  m += '- Framework: **Detox**\n';
  m += `- Linguagem: **${mdText(languages.join(', ') || '-')}**\n`;
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
  return m;
}

function buildTechnicalReport(
  files: IParsedTestFile[],
  allRows: IFlattenedJunit[],
  stats: { spec: number; e2e: number; test: number; totalTestFiles: number; totalTests: number },
  testRows: TestRow[],
  junitIndex: JunitIndex,
  metadata: ReportMetadata
): string {
  let m = buildTechnicalDivider();
  m += buildTechnicalSummary(files, allRows, stats);
  m += buildAnalyzedFilesTable(files);
  m += buildHooksSection(files);
  m += buildSelectorsTable(testRows);
  m += buildAutomatedAnalysis();
  if (allRows.length) m += buildExecutionReportJunit(allRows, metadata);
  m += '## 12. Detalhamento técnico dos cenários\n\n';
  for (const f of files) {
    m += renderFileSection(f, junitIndex);
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
  const testRows = collectTestRows(files);
  let m = buildCover(files, stats, metadata);
  m += buildManagementReport(files, testRows, stats);
  m += buildTechnicalReport(files, allRows, stats, testRows, junitIndex, metadata);
  return m;
}
