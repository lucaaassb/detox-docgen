import {
  DetoxDocgenReportLanguage,
  DetoxDocgenReportTextOverrides,
  IParsedTestFile,
  ITestCaseDetail,
  ITestContext
} from '../types';
import { IFlattenedJunit } from '../execution/types';
import { aggregateJunit } from '../execution/parseJunit';

export type ReportMetadata = {
  projectName: string;
  version?: string;
  responsible?: string;
  environment?: string;
  reportLanguage?: DetoxDocgenReportLanguage;
  reportTextOverrides?: DetoxDocgenReportTextOverrides;
};

const PT_BR_REPORT_TEXT = {
  statusFailed: 'Falha',
  statusSkipped: 'Ignorado',
  statusUnknown: 'Desconhecido',
  statusMapped: 'Mapeado',
  codeItemLabel: 'Código',
  untitledScenario: 'Cenário sem título identificado.',
  selectorPatternTemplate: 'elemento que corresponde ao padrão {selector}',
  selectorTextTemplate: 'texto "{selector}"',
  selectorElementTemplate: 'elemento "{selector}"',
  interfaceElement: 'elemento da interface',
  expectedResult: 'resultado esperado',
  actionTypeTextTemplate: 'Preencher {target} com "{value}".',
  actionReplaceTextTemplate: 'Substituir o texto de {target} por "{value}".',
  actionClearTextTemplate: 'Limpar o texto de {target}.',
  actionTapTemplate: 'Tocar em {target}.',
  actionMultiTapTemplate: 'Tocar repetidamente em {target}.',
  actionScrollTemplate: 'Rolar {target} para {direction}.',
  actionScrollToTemplate: 'Rolar {target} até {edge}.',
  actionSwipeTemplate: 'Realizar gesto de deslizar para {direction} em {target}.',
  actionLaunchNewInstance: 'Iniciar uma nova instância do aplicativo.',
  actionLaunchApp: 'Iniciar o aplicativo.',
  actionReloadReactNative: 'Recarregar o React Native.',
  actionRelaunchApp: 'Reiniciar o aplicativo.',
  actionOpenUrl: 'Abrir o aplicativo por URL/deep link.',
  actionSendToHome: 'Enviar o aplicativo para segundo plano.',
  actionSetOrientationTemplate: 'Alterar a orientação do dispositivo para {orientation}.',
  actionHelperTemplate: 'Executar fluxo auxiliar "{helper}".',
  actionAutomationCommandTemplate: 'Executar comando de automação relacionado a {target}.',
  expectationTimeoutSuffixTemplate: ' em até {seconds}s',
  expectationNotVisibleTemplate: '{target} não deve estar visível{suffix}.',
  expectationVisibleTemplate: '{target} deve estar visível{suffix}.',
  expectationExistsTemplate: '{target} deve existir na tela{suffix}.',
  expectationTextTemplate: '{target} deve apresentar o texto "{value}".',
  expectationValidateTemplate: 'Validar {target}.',
  hookLaunchNewInstance: 'Inicia uma nova instância do aplicativo antes da execução da suíte.',
  hookLaunchApp: 'Inicia o aplicativo antes da execução dos testes.',
  hookReloadReactNative: 'Recarrega o React Native para reduzir interferências entre cenários.',
  hookRelaunchApp: 'Reinicia o aplicativo para preparar um novo estado de teste.',
  hookHelperTemplate: 'Delega a preparação para o fluxo auxiliar "{helper}".',
  hookDefault: 'Prepara o ambiente de teste antes da execução dos cenários.',
  validatedTopicsFallback: 'Cenários automatizados identificados no código de teste',
  codeBlockEmpty: 'Sem trecho de automação inline para exibir; o cenário pode estar delegado a fluxos auxiliares ou ter apenas estrutura declarativa.\n\n',
  coverTitle: 'Relatório de Documentação de Testes Automatizados E2E',
  projectLabel: 'Projeto',
  frameworkLabel: 'Framework',
  testTypeLabel: 'Tipo de teste',
  testTypeValue: 'End-to-End Mobile',
  languageLabel: 'Linguagem',
  generationDateLabel: 'Data de geração',
  totalFilesAnalyzedLabel: 'Total de arquivos analisados',
  totalScenariosMappedLabel: 'Total de cenários mapeados',
  summaryCardsHeading: 'Cards de resumo',
  metricLabel: 'Métrica',
  valueLabel: 'Valor',
  testFilesLabel: 'Arquivos de teste',
  suitesFoundLabel: 'Suítes encontradas',
  testsMappedLabel: 'Testes mapeados',
  hooksIdentifiedLabel: 'Hooks identificados',
  statusHeading: 'Status dos testes',
  testLabel: 'Teste',
  statusLabel: 'Status',
  selectorsHeading: '10. Seletores usados',
  selectorsEmpty: 'Nenhum seletor Detox foi identificado automaticamente nos passos mapeados.',
  selectorLabel: 'Seletor',
  typeLabel: 'Tipo',
  fileLabel: 'Arquivo',
  coverageHeading: 'Cobertura por tela / funcionalidade',
  coverageEmpty: 'Não foi possível calcular cobertura porque nenhum cenário foi mapeado.',
  featureLabel: 'Funcionalidade',
  quantityTestsLabel: 'Quantidade de testes',
  automatedAnalysisHeading: '11. Como a análise foi montada',
  automatedAnalysisIntro: 'A ferramenta identificou automaticamente:',
  automatedAnalysisFiles: 'Arquivos de teste Detox',
  automatedAnalysisSuites: 'Suítes de teste',
  automatedAnalysisScenarios: 'Cenários definidos com it/test',
  automatedAnalysisHooks: 'Hooks de configuração',
  automatedAnalysisActions: 'Ações executadas nos testes',
  automatedAnalysisValidations: 'Validações realizadas com expect',
  automatedAnalysisSelectors: 'Seletores utilizados nos elementos da interface',
  managementDividerTitle: 'Parte 1 — Visão gerencial',
  managementDividerDescription: 'Leitura funcional do que foi encontrado, quais fluxos estão cobertos e quais cuidados considerar ao interpretar o relatório.',
  technicalDividerTitle: 'Parte 2 — Detalhamento técnico',
  technicalDividerDescription: 'Inventário técnico dos arquivos, hooks, seletores e trechos de automação extraídos dos testes.',
  executiveSummaryHeading: '1. Resumo executivo',
  executiveSummaryFallback: 'as funcionalidades identificadas nos testes',
  executiveSummaryIntroTemplate: 'Este relatório apresenta a documentação automatizada dos testes End-to-End da aplicação mobile, utilizando o framework Detox. Os testes simulam ações reais de um usuário e cobrem funcionalidades como {examples}. ',
  executiveSummaryGoal: 'O objetivo é facilitar a compreensão da cobertura dos testes, tanto por pessoas técnicas quanto por pessoas não técnicas.',
  managementIndicatorsHeading: '2. Indicadores gerais',
  indicatorLabel: 'Indicador',
  analyzedTestFilesLabel: 'Arquivos de teste analisados',
  automatedScenariosLabel: 'Cenários automatizados',
  coveredFeaturesLabel: 'Funcionalidades cobertas',
  setupHooksIdentifiedLabel: 'Hooks de preparação identificados',
  frameworkUsedLabel: 'Framework utilizado',
  managementCoverageHeading: '3. Cobertura por funcionalidade',
  beingValidatedLabel: 'O que está sendo validado',
  scenarioQuantityLabel: 'Quantidade de cenários',
  naturalScenariosHeading: '4. Cenários validados em linguagem natural',
  featureHeadingLabel: 'Funcionalidade',
  validatedScenariosLabel: 'Cenários validados:',
  managementConclusionHeading: '5. Resultado geral da análise',
  scenarioSingular: 'cenário automatizado',
  scenarioPlural: 'cenários automatizados',
  mappedFeaturesFallback: 'mapeadas',
  managementConclusionTemplate: 'A análise identificou {count} {scenarioLabel} distribuído{pluralSuffix} entre as funcionalidades {features}. ',
  managementConclusionCoverageTemplate: 'Os testes mapeados cobrem fluxos essenciais da aplicação{topicsSuffix}.\n\n',
  managementConclusionTopicsTemplate: ', como {topics}',
  managementNotesHeading: '6. Observações de leitura',
  noteMappedButNotExecuted: 'Todos os cenários foram mapeados, mas isso não significa que foram executados com sucesso.',
  noteMappedStatus: 'O status "Mapeado" indica que o cenário foi identificado no código de teste.',
  noteReportStructure: 'O relatório documenta a estrutura dos testes automatizados, facilitando entendimento, auditoria e manutenção.',
  analyzedFilesHeading: '8. Arquivos analisados',
  pathLabel: 'Caminho',
  mainSuiteLabel: 'Suíte principal',
  hooksHeading: '9. Hooks de configuração',
  hooksEmpty: 'Nenhum hook de configuração foi identificado.',
  fileHeadingLabel: 'Arquivo',
  codeLabel: 'Código',
  interpretationLabel: 'Interpretação',
  scenarioLabel: 'Cenário',
  itemLabel: 'Item',
  detailLabel: 'Detalhe',
  objectiveLabel: 'Objetivo',
  screenFeatureLabel: 'Tela / funcionalidade',
  priorityLabel: 'Prioridade',
  automatedFlowLabel: 'Fluxo automatizado',
  noInlineActions: 'O cenário não apresenta ações Detox inline; a execução parece estar concentrada em fluxos auxiliares ou validações.',
  expectedValidationsLabel: 'Validações esperadas',
  noInlineExpectations: 'Nenhuma validação automática foi identificada diretamente no corpo do cenário.',
  extractedTechnicalSnippetLabel: 'Trecho técnico extraído',
  functionalDescriptionLabel: 'Descrição funcional',
  identifiedScenarioDescription: 'Cenário identificado no teste automatizado.',
  fileSectionLabel: 'Arquivo',
  descriptionLabel: 'Descrição',
  fileAuthorLabel: 'Autor (arquivo)',
  analyzerWarningsLabel: 'Avisos do analisador',
  technicalSummaryHeading: '7. Resumo técnico',
  technicalSummaryTestFilesTemplate: 'Arquivos de teste: **{count}**',
  technicalSummaryEnumeratedTestsTemplate: 'Testes (it / test) enumerados: **{count}**',
  technicalSummaryFrameworkTemplate: 'Framework: **{framework}**',
  technicalSummaryLanguageTemplate: 'Linguagem: **{languages}**',
  technicalSummaryJunitTemplate: 'Testes no JUnit: **{total}** ({passed} OK, {failed} falha(s), {skipped} ignorado(s))',
  technicalSummaryUnmatchedJunitTemplate: 'Linhas JUnit sem teste documentado correspondente: **{count}**',
  technicalSummaryPatternTemplate: 'Padrão `{pattern}`: **{count}** arquivo(s)',
  technicalDetailHeading: '12. Detalhamento técnico dos cenários',
  junitCategoryLabel: 'Categoria (suite)',
  stateLabel: 'Estado',
  durationLabel: 'Duração',
  junitFailuresHeading: '5. Detalhes de falhas (JUnit / Jest)',
  junitFailuresEmpty: 'Não foram encontradas falhas no relatório JUnit analisado.',
  junitNoMessage: '_Sem mensagem de erro no XML._',
  junitConclusionsHeading: '6. Conclusões e recomendações (execução)',
  junitConclusionFix: 'Corrigir primeiro os fluxos com falha listados acima, por impacto de negócio.',
  junitConclusionSlow: 'Rever testes com tempo elevado; verificar gargalos (rede, animação, I/O).',
  junitConclusionPipeline: 'Manter o pipeline gerando o artefato JUnit para atualização automática desta seção.',
  executionReportTitle: 'Relatório de execução - E2E Detox (Artefato JUnit / Jest)',
  projectIdentificationHeading: '1. Identificação do projeto',
  infoLabel: 'Informação',
  systemLabel: 'Sistema',
  versionLabel: 'Versão',
  environmentLabel: 'Ambiente',
  dateTimeLabel: 'Data / hora',
  responsibleLabel: 'Responsável',
  objectiveHeading: '2. Objetivo',
  objectiveText: 'Síntese de resultados de execução com base no XML JUnit gerado (por exemplo, jest-junit).',
  generalMetricsHeading: '3. Métricas gerais',
  junitRowsLabel: 'Testes (linhas JUnit)',
  passedLabel: 'Passou',
  failedLabel: 'Falhou',
  skippedLabel: 'Ignorados',
  durationSumLabel: 'Soma duração (s)',
  junitDetailHeading: '4. Detalhe por teste (JUnit)'
};

type ReportTextKey = keyof typeof PT_BR_REPORT_TEXT;
type ReportText = Record<ReportTextKey, string>;

const EN_REPORT_TEXT: ReportText = {
  statusFailed: 'Failed',
  statusSkipped: 'Skipped',
  statusUnknown: 'Unknown',
  statusMapped: 'Mapped',
  codeItemLabel: 'Code',
  untitledScenario: 'Scenario without an identified title.',
  selectorPatternTemplate: 'element matching pattern {selector}',
  selectorTextTemplate: 'text "{selector}"',
  selectorElementTemplate: 'element "{selector}"',
  interfaceElement: 'interface element',
  expectedResult: 'expected result',
  actionTypeTextTemplate: 'Fill {target} with "{value}".',
  actionReplaceTextTemplate: 'Replace the text of {target} with "{value}".',
  actionClearTextTemplate: 'Clear the text of {target}.',
  actionTapTemplate: 'Tap {target}.',
  actionMultiTapTemplate: 'Tap {target} repeatedly.',
  actionScrollTemplate: 'Scroll {target} to {direction}.',
  actionScrollToTemplate: 'Scroll {target} to {edge}.',
  actionSwipeTemplate: 'Swipe {direction} on {target}.',
  actionLaunchNewInstance: 'Start a new application instance.',
  actionLaunchApp: 'Start the application.',
  actionReloadReactNative: 'Reload React Native.',
  actionRelaunchApp: 'Restart the application.',
  actionOpenUrl: 'Open the application by URL/deep link.',
  actionSendToHome: 'Send the application to the background.',
  actionSetOrientationTemplate: 'Change the device orientation to {orientation}.',
  actionHelperTemplate: 'Run helper flow "{helper}".',
  actionAutomationCommandTemplate: 'Run an automation command related to {target}.',
  expectationTimeoutSuffixTemplate: ' within {seconds}s',
  expectationNotVisibleTemplate: '{target} should not be visible{suffix}.',
  expectationVisibleTemplate: '{target} should be visible{suffix}.',
  expectationExistsTemplate: '{target} should exist on screen{suffix}.',
  expectationTextTemplate: '{target} should display the text "{value}".',
  expectationValidateTemplate: 'Validate {target}.',
  hookLaunchNewInstance: 'Starts a new application instance before the suite runs.',
  hookLaunchApp: 'Starts the application before the tests run.',
  hookReloadReactNative: 'Reloads React Native to reduce interference between scenarios.',
  hookRelaunchApp: 'Restarts the application to prepare a new test state.',
  hookHelperTemplate: 'Delegates preparation to helper flow "{helper}".',
  hookDefault: 'Prepares the test environment before scenarios run.',
  validatedTopicsFallback: 'Automated scenarios identified in the test code',
  codeBlockEmpty: 'No inline automation snippet to display; the scenario may be delegated to helper flows or contain only declarative structure.\n\n',
  coverTitle: 'Automated E2E Test Documentation Report',
  projectLabel: 'Project',
  frameworkLabel: 'Framework',
  testTypeLabel: 'Test type',
  testTypeValue: 'End-to-End Mobile',
  languageLabel: 'Language',
  generationDateLabel: 'Generation date',
  totalFilesAnalyzedLabel: 'Total files analyzed',
  totalScenariosMappedLabel: 'Total scenarios mapped',
  summaryCardsHeading: 'Summary cards',
  metricLabel: 'Metric',
  valueLabel: 'Value',
  testFilesLabel: 'Test files',
  suitesFoundLabel: 'Suites found',
  testsMappedLabel: 'Tests mapped',
  hooksIdentifiedLabel: 'Hooks identified',
  statusHeading: 'Test status',
  testLabel: 'Test',
  statusLabel: 'Status',
  selectorsHeading: '10. Selectors used',
  selectorsEmpty: 'No Detox selector was automatically identified in the mapped steps.',
  selectorLabel: 'Selector',
  typeLabel: 'Type',
  fileLabel: 'File',
  coverageHeading: 'Coverage by screen / feature',
  coverageEmpty: 'Coverage could not be calculated because no scenario was mapped.',
  featureLabel: 'Feature',
  quantityTestsLabel: 'Number of tests',
  automatedAnalysisHeading: '11. How the analysis was assembled',
  automatedAnalysisIntro: 'The tool automatically identified:',
  automatedAnalysisFiles: 'Detox test files',
  automatedAnalysisSuites: 'Test suites',
  automatedAnalysisScenarios: 'Scenarios defined with it/test',
  automatedAnalysisHooks: 'Setup hooks',
  automatedAnalysisActions: 'Actions executed in tests',
  automatedAnalysisValidations: 'Validations performed with expect',
  automatedAnalysisSelectors: 'Selectors used on interface elements',
  managementDividerTitle: 'Part 1 - Management view',
  managementDividerDescription: 'Functional reading of what was found, which flows are covered, and what to consider when interpreting the report.',
  technicalDividerTitle: 'Part 2 - Technical details',
  technicalDividerDescription: 'Technical inventory of files, hooks, selectors, and automation snippets extracted from the tests.',
  executiveSummaryHeading: '1. Executive summary',
  executiveSummaryFallback: 'the features identified in the tests',
  executiveSummaryIntroTemplate: 'This report presents automated documentation for the mobile application End-to-End tests, using the Detox framework. The tests simulate real user actions and cover features such as {examples}. ',
  executiveSummaryGoal: 'Its goal is to make test coverage easier to understand for both technical and non-technical readers.',
  managementIndicatorsHeading: '2. General indicators',
  indicatorLabel: 'Indicator',
  analyzedTestFilesLabel: 'Analyzed test files',
  automatedScenariosLabel: 'Automated scenarios',
  coveredFeaturesLabel: 'Covered features',
  setupHooksIdentifiedLabel: 'Setup hooks identified',
  frameworkUsedLabel: 'Framework used',
  managementCoverageHeading: '3. Coverage by feature',
  beingValidatedLabel: 'What is being validated',
  scenarioQuantityLabel: 'Number of scenarios',
  naturalScenariosHeading: '4. Scenarios validated in natural language',
  featureHeadingLabel: 'Feature',
  validatedScenariosLabel: 'Validated scenarios:',
  managementConclusionHeading: '5. Overall analysis result',
  scenarioSingular: 'automated scenario',
  scenarioPlural: 'automated scenarios',
  mappedFeaturesFallback: 'mapped features',
  managementConclusionTemplate: 'The analysis identified {count} {scenarioLabel} across {features}. ',
  managementConclusionCoverageTemplate: 'The mapped tests cover essential application flows{topicsSuffix}.\n\n',
  managementConclusionTopicsTemplate: ', such as {topics}',
  managementNotesHeading: '6. Reading notes',
  noteMappedButNotExecuted: 'All scenarios were mapped, but this does not mean they ran successfully.',
  noteMappedStatus: 'The "Mapped" status means the scenario was identified in the test code.',
  noteReportStructure: 'The report documents the automated test structure, making understanding, auditing, and maintenance easier.',
  analyzedFilesHeading: '8. Analyzed files',
  pathLabel: 'Path',
  mainSuiteLabel: 'Main suite',
  hooksHeading: '9. Setup hooks',
  hooksEmpty: 'No setup hook was identified.',
  fileHeadingLabel: 'File',
  codeLabel: 'Code',
  interpretationLabel: 'Interpretation',
  scenarioLabel: 'Scenario',
  itemLabel: 'Item',
  detailLabel: 'Detail',
  objectiveLabel: 'Objective',
  screenFeatureLabel: 'Screen / feature',
  priorityLabel: 'Priority',
  automatedFlowLabel: 'Automated flow',
  noInlineActions: 'The scenario has no inline Detox actions; execution seems concentrated in helper flows or validations.',
  expectedValidationsLabel: 'Expected validations',
  noInlineExpectations: 'No automatic validation was identified directly in the scenario body.',
  extractedTechnicalSnippetLabel: 'Extracted technical snippet',
  functionalDescriptionLabel: 'Functional description',
  identifiedScenarioDescription: 'Scenario identified in the automated test.',
  fileSectionLabel: 'File',
  descriptionLabel: 'Description',
  fileAuthorLabel: 'Author (file)',
  analyzerWarningsLabel: 'Analyzer warnings',
  technicalSummaryHeading: '7. Technical summary',
  technicalSummaryTestFilesTemplate: 'Test files: **{count}**',
  technicalSummaryEnumeratedTestsTemplate: 'Tests (it / test) enumerated: **{count}**',
  technicalSummaryFrameworkTemplate: 'Framework: **{framework}**',
  technicalSummaryLanguageTemplate: 'Language: **{languages}**',
  technicalSummaryJunitTemplate: 'JUnit tests: **{total}** ({passed} OK, {failed} failed, {skipped} skipped)',
  technicalSummaryUnmatchedJunitTemplate: 'JUnit rows without a matching documented test: **{count}**',
  technicalSummaryPatternTemplate: 'Pattern `{pattern}`: **{count}** file(s)',
  technicalDetailHeading: '12. Technical scenario details',
  junitCategoryLabel: 'Category (suite)',
  stateLabel: 'State',
  durationLabel: 'Duration',
  junitFailuresHeading: '5. Failure details (JUnit / Jest)',
  junitFailuresEmpty: 'No failures were found in the analyzed JUnit report.',
  junitNoMessage: '_No error message in the XML._',
  junitConclusionsHeading: '6. Conclusions and recommendations (execution)',
  junitConclusionFix: 'Fix the failed flows listed above first, based on business impact.',
  junitConclusionSlow: 'Review slow tests; check for bottlenecks (network, animation, I/O).',
  junitConclusionPipeline: 'Keep the pipeline generating the JUnit artifact so this section can be updated automatically.',
  executionReportTitle: 'Execution report - E2E Detox (JUnit / Jest artifact)',
  projectIdentificationHeading: '1. Project identification',
  infoLabel: 'Information',
  systemLabel: 'System',
  versionLabel: 'Version',
  environmentLabel: 'Environment',
  dateTimeLabel: 'Date / time',
  responsibleLabel: 'Responsible',
  objectiveHeading: '2. Objective',
  objectiveText: 'Summary of execution results based on the generated JUnit XML (for example, jest-junit).',
  generalMetricsHeading: '3. General metrics',
  junitRowsLabel: 'Tests (JUnit rows)',
  passedLabel: 'Passed',
  failedLabel: 'Failed',
  skippedLabel: 'Skipped',
  durationSumLabel: 'Duration sum (s)',
  junitDetailHeading: '4. Test detail (JUnit)'
};

const REPORT_TEXT: Record<DetoxDocgenReportLanguage, ReportText> = {
  'pt-BR': PT_BR_REPORT_TEXT,
  en: EN_REPORT_TEXT
};

function resolveReportText(metadata?: Pick<ReportMetadata, 'reportLanguage' | 'reportTextOverrides'>): ReportText {
  const language = metadata?.reportLanguage === 'en' ? 'en' : 'pt-BR';
  const base = REPORT_TEXT[language];
  const overrides = metadata?.reportTextOverrides ?? {};
  const allowedOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([key]) => key in base)
  ) as Partial<ReportText>;
  return { ...base, ...allowedOverrides };
}

function formatReportText(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

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

function stateLabel(state: IFlattenedJunit['state'], text: ReportText = resolveReportText()): string {
  if (state === 'passed') return 'OK';
  if (state === 'failed') return text.statusFailed;
  if (state === 'skipped') return text.statusSkipped;
  return text.statusUnknown;
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

function summarizeCodeList(
  items: string[],
  emptyLabel: string,
  text: ReportText = resolveReportText()
): string {
  if (!items.length) return emptyLabel;
  return items.map((s, index) => `${text.codeItemLabel} ${index + 1}: \`${mdCode(s)}\``).join(' ');
}

function testStatus(
  junitIndex: JunitIndex,
  suiteName: string,
  title: string,
  text: ReportText
): string {
  const execution = findJunitMatch(junitIndex, suiteName, title);
  return execution ? stateLabel(execution.state, text) : text.statusMapped;
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

function naturalScenarioTitle(title: string, reportText: ReportText): string {
  const text = title.trim();
  if (!text) return reportText.untitledScenario;
  return text.endsWith('.') ? text : `${text}.`;
}

function scenarioIntent(row: TestRow, reportText: ReportText): string {
  if (row.metadata.description) return row.metadata.description;
  return naturalScenarioTitle(row.title, reportText);
}

function friendlySelector(selector: string, type: string, text: ReportText): string {
  if (selector.startsWith('/')) {
    return formatReportText(text.selectorPatternTemplate, { selector });
  }
  if (type === 'by.text') return formatReportText(text.selectorTextTemplate, { selector });
  const spaced = selector
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .toLowerCase();
  return formatReportText(text.selectorElementTemplate, { selector: spaced });
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

function variableTargetInCode(code: string, text: ReportText): string | null {
  const wait = /\bwaitFor\(\s*([A-Za-z_$][\w$]*)\s*\)/.exec(code);
  if (wait) return formatReportText(text.selectorElementTemplate, { selector: humanizeIdentifier(wait[1]) });
  const method = /\b([A-Za-z_$][\w$]*)\.(tap|multiTap|typeText|replaceText|clearText|scroll|scrollTo|swipe|getAttributes)\s*\(/.exec(code);
  if (method) return formatReportText(text.selectorElementTemplate, { selector: humanizeIdentifier(method[1]) });
  return null;
}

function targetFromCode(code: string, fallback: string, text: ReportText): string {
  const selector = firstSelectorInCode(code);
  return selector ? friendlySelector(selector.selector, selector.type, text) : variableTargetInCode(code, text) ?? fallback;
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

function actionToNaturalLanguage(code: string, text: ReportText): string {
  const target = targetFromCode(code, text.interfaceElement, text);
  const typed = /\.typeText\(\s*(['"`])([^'"`]+)\1\s*\)/.exec(code);
  if (typed) return formatReportText(text.actionTypeTextTemplate, { target, value: typed[2] });
  const replaceText = /\.replaceText\(\s*(['"`])([^'"`]+)\1\s*\)/.exec(code);
  if (replaceText) {
    return formatReportText(text.actionReplaceTextTemplate, { target, value: replaceText[2] });
  }
  if (/\.clearText\(\)/.test(code)) return formatReportText(text.actionClearTextTemplate, { target });
  if (/\.tap\(\)/.test(code)) return formatReportText(text.actionTapTemplate, { target });
  if (/\.multiTap\(/.test(code)) return formatReportText(text.actionMultiTapTemplate, { target });
  const scroll = /\.scroll\(\s*(\d+)\s*,\s*(['"`])([^'"`]+)\2/.exec(code);
  if (scroll) return formatReportText(text.actionScrollTemplate, { target, direction: scroll[3] });
  const scrollTo = /\.scrollTo\(\s*(['"`])([^'"`]+)\1/.exec(code);
  if (scrollTo) return formatReportText(text.actionScrollToTemplate, { target, edge: scrollTo[2] });
  const swipe = /\.swipe\(\s*(['"`])([^'"`]+)\1/.exec(code);
  if (swipe) return formatReportText(text.actionSwipeTemplate, { target, direction: swipe[2] });
  if (/\bdevice\.launchApp\(\s*\{[^)]*newInstance:\s*true/.test(code)) {
    return text.actionLaunchNewInstance;
  }
  if (/\bdevice\.launchApp\(/.test(code)) return text.actionLaunchApp;
  if (/\bdevice\.reloadReactNative\(/.test(code)) return text.actionReloadReactNative;
  if (/\bdevice\.relaunchApp\(/.test(code)) return text.actionRelaunchApp;
  if (/\bdevice\.openURL\(/.test(code)) return text.actionOpenUrl;
  if (/\bdevice\.sendToHome\(/.test(code)) return text.actionSendToHome;
  const orientation = /\bdevice\.setOrientation\(\s*(['"`])([^'"`]+)\1/.exec(code);
  if (orientation) {
    return formatReportText(text.actionSetOrientationTemplate, { orientation: orientation[2] });
  }
  const helper = helperCallFromCode(code);
  if (helper) return formatReportText(text.actionHelperTemplate, { helper: humanizeIdentifier(helper) });
  return formatReportText(text.actionAutomationCommandTemplate, { target });
}

function expectationToNaturalLanguage(code: string, text: ReportText): string {
  const target = targetFromCode(code, text.expectedResult, text);
  const timeout = /\.withTimeout\(\s*(\d+)\s*\)/.exec(code);
  const suffix = timeout
    ? formatReportText(text.expectationTimeoutSuffixTemplate, { seconds: Number(timeout[1]) / 1000 })
    : '';
  if (/\.not\.toBeVisible\(\)/.test(code)) {
    return formatReportText(text.expectationNotVisibleTemplate, { target, suffix });
  }
  if (/\.toBeNotVisible\(\)/.test(code)) {
    return formatReportText(text.expectationNotVisibleTemplate, { target, suffix });
  }
  if (/\.toBeVisible\(\)/.test(code)) {
    return formatReportText(text.expectationVisibleTemplate, { target, suffix });
  }
  if (/\.toExist\(\)/.test(code)) {
    return formatReportText(text.expectationExistsTemplate, { target, suffix });
  }
  const textMatch = /\.toHaveText\(\s*(['"`])([^'"`]+)\1\s*\)/.exec(code);
  if (textMatch) return formatReportText(text.expectationTextTemplate, { target, value: textMatch[2] });
  return formatReportText(text.expectationValidateTemplate, { target });
}

function hookInterpretation(code: string, text: ReportText): string {
  if (/device\.launchApp\(\s*\{[^)]*newInstance:\s*true/.test(code)) {
    return text.hookLaunchNewInstance;
  }
  if (/device\.launchApp\(/.test(code)) {
    return text.hookLaunchApp;
  }
  if (/device\.reloadReactNative\(/.test(code)) {
    return text.hookReloadReactNative;
  }
  if (/device\.relaunchApp\(/.test(code)) {
    return text.hookRelaunchApp;
  }
  const helper = helperCallFromCode(code);
  if (helper) {
    return formatReportText(text.hookHelperTemplate, { helper: humanizeIdentifier(helper) });
  }
  return text.hookDefault;
}

function featureGroups(rows: TestRow[]): Map<string, TestRow[]> {
  const groups = new Map<string, TestRow[]>();
  for (const row of rows) {
    const key = featureName(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}

function validatedTopics(rows: TestRow[], text: ReportText): string {
  const words = rows
    .map((row) => scenarioIntent(row, text).replace(/\.$/, '').toLowerCase())
    .slice(0, 4);
  if (!words.length) return text.validatedTopicsFallback;
  return words.join('; ');
}

function codeBlock(lines: string[], language: string = 'ts', text: ReportText = resolveReportText()): string {
  if (!lines.length) {
    return text.codeBlockEmpty;
  }
  return `\`\`\`${language}\n${lines.join('\n')}\n\`\`\`\n\n`;
}

function buildCover(
  files: IParsedTestFile[],
  stats: { totalTestFiles: number; totalTests: number },
  metadata: ReportMetadata,
  text: ReportText
): string {
  let m = `# ${text.coverTitle}\n\n`;
  m += `**${text.projectLabel}:** ${mdText(metadata.projectName)}\n\n`;
  m += `**${text.frameworkLabel}:** Detox\n\n`;
  m += `**${text.testTypeLabel}:** ${text.testTypeValue}\n\n`;
  const languages = Array.from(new Set(files.map((f) => sourceKindLabel(f.sourceKind)).filter((x) => x !== '-')));
  if (languages.length) m += `**${text.languageLabel}:** ${mdText(languages.join(', '))}\n\n`;
  m += `**${text.generationDateLabel}:** ${generationDateString()}\n\n`;
  m += `**${text.totalFilesAnalyzedLabel}:** ${stats.totalTestFiles}\n\n`;
  m += `**${text.totalScenariosMappedLabel}:** ${stats.totalTests}\n\n`;
  m += '---\n\n';
  return m;
}

function buildSummaryCards(
  files: IParsedTestFile[],
  stats: { totalTestFiles: number; totalTests: number },
  text: ReportText
): string {
  const suites = files.reduce((acc, f) => acc + countSuites(f.contexts), 0);
  const hooks = files.reduce((acc, f) => acc + countHooks(f.contexts), 0);
  const languages = Array.from(new Set(files.map((f) => sourceKindLabel(f.sourceKind)).filter((x) => x !== '-')));
  let m = `## ${text.summaryCardsHeading}\n\n`;
  m += `| ${text.metricLabel} | ${text.valueLabel} |\n`;
  m += '| --- | ---: |\n';
  m += `| ${text.testFilesLabel} | ${stats.totalTestFiles} |\n`;
  m += `| ${text.suitesFoundLabel} | ${suites} |\n`;
  m += `| ${text.testsMappedLabel} | ${stats.totalTests} |\n`;
  m += `| ${text.hooksIdentifiedLabel} | ${hooks} |\n`;
  m += `| ${text.frameworkLabel} | Detox |\n`;
  m += `| ${text.languageLabel} | ${mdText(languages.join(', ') || '-')} |\n\n`;
  return m;
}

function buildStatusTable(rows: TestRow[], junitIndex: JunitIndex, text: ReportText): string {
  let m = `## ${text.statusHeading}\n\n`;
  m += `| ${text.testLabel} | ${text.statusLabel} |\n`;
  m += '| --- | --- |\n';
  for (const row of rows) {
    m += `| ${mdText(row.title)} | ${testStatus(junitIndex, row.suiteName, row.title, text)} |\n`;
  }
  m += '\n';
  return m;
}

function buildSelectorsTable(rows: TestRow[], text: ReportText): string {
  const selectors = collectSelectors(rows);
  let m = `## ${text.selectorsHeading}\n\n`;
  if (!selectors.length) {
    m += `${text.selectorsEmpty}\n\n`;
    return m;
  }
  m += `| ${text.selectorLabel} | ${text.typeLabel} | ${text.fileLabel} |\n`;
  m += '| --- | --- | --- |\n';
  for (const s of selectors) {
    m += `| \`${mdCode(s.selector)}\` | \`${mdCode(s.type)}\` | \`${mdCode(s.fileName)}\` |\n`;
  }
  m += '\n';
  return m;
}

function buildCoverageTable(rows: TestRow[], text: ReportText): string {
  const byFeature = new Map<string, { fileName: string; count: number }>();
  for (const row of rows) {
    const feature = row.metadata.screen || row.suiteName;
    const key = `${feature}\0${row.fileName}`;
    const current = byFeature.get(key) ?? { fileName: row.fileName, count: 0 };
    current.count += 1;
    byFeature.set(key, current);
  }

  let m = `## ${text.coverageHeading}\n\n`;
  if (!byFeature.size) {
    m += `${text.coverageEmpty}\n\n`;
    return m;
  }
  m += `| ${text.featureLabel} | ${text.fileLabel} | ${text.quantityTestsLabel} |\n`;
  m += '| --- | --- | ---: |\n';
  for (const [key, value] of byFeature) {
    const [feature] = key.split('\0');
    m += `| ${mdText(feature)} | \`${mdCode(value.fileName)}\` | ${value.count} |\n`;
  }
  m += '\n';
  return m;
}

function buildAutomatedAnalysis(text: ReportText): string {
  let m = `## ${text.automatedAnalysisHeading}\n\n`;
  m += `${text.automatedAnalysisIntro}\n\n`;
  m += `- ${text.automatedAnalysisFiles}\n`;
  m += `- ${text.automatedAnalysisSuites}\n`;
  m += `- ${text.automatedAnalysisScenarios}\n`;
  m += `- ${text.automatedAnalysisHooks}\n`;
  m += `- ${text.automatedAnalysisActions}\n`;
  m += `- ${text.automatedAnalysisValidations}\n`;
  m += `- ${text.automatedAnalysisSelectors}\n\n`;
  return m;
}

function buildManagementDivider(text: ReportText): string {
  return `# ${text.managementDividerTitle}\n\n${text.managementDividerDescription}\n\n---\n\n`;
}

function buildTechnicalDivider(text: ReportText): string {
  return `# ${text.technicalDividerTitle}\n\n${text.technicalDividerDescription}\n\n---\n\n`;
}

function buildExecutiveSummary(rows: TestRow[], text: ReportText): string {
  const features = uniqueSorted(rows.map(featureName));
  const examples = features.length
    ? features.slice(0, 5).join(', ')
    : text.executiveSummaryFallback;
  let m = `## ${text.executiveSummaryHeading}\n\n`;
  m += formatReportText(text.executiveSummaryIntroTemplate, { examples: mdText(examples) });
  m += `${text.executiveSummaryGoal}\n\n`;
  return m;
}

function buildManagementIndicators(
  files: IParsedTestFile[],
  rows: TestRow[],
  stats: { totalTestFiles: number; totalTests: number },
  text: ReportText
): string {
  const features = uniqueSorted(rows.map(featureName));
  const suites = files.reduce((acc, f) => acc + countSuites(f.contexts), 0);
  const hooks = files.reduce((acc, f) => acc + countHooks(f.contexts), 0);
  const languages = Array.from(new Set(files.map((f) => sourceKindLabel(f.sourceKind)).filter((x) => x !== '-')));
  let m = `## ${text.managementIndicatorsHeading}\n\n`;
  m += `| ${text.indicatorLabel} | ${text.valueLabel} |\n`;
  m += '| --- | ---: |\n';
  m += `| ${text.analyzedTestFilesLabel} | ${stats.totalTestFiles} |\n`;
  m += `| ${text.automatedScenariosLabel} | ${stats.totalTests} |\n`;
  m += `| ${text.coveredFeaturesLabel} | ${features.length} |\n`;
  m += `| ${text.suitesFoundLabel} | ${suites} |\n`;
  m += `| ${text.setupHooksIdentifiedLabel} | ${hooks} |\n`;
  m += `| ${text.frameworkUsedLabel} | Detox |\n`;
  m += `| ${text.languageLabel} | ${mdText(languages.join(', ') || '-')} |\n\n`;
  return m;
}

function buildManagementCoverage(rows: TestRow[], text: ReportText): string {
  const groups = featureGroups(rows);
  let m = `## ${text.managementCoverageHeading}\n\n`;
  m += `| ${text.featureLabel} | ${text.beingValidatedLabel} | ${text.scenarioQuantityLabel} |\n`;
  m += '| --- | --- | ---: |\n';
  for (const [feature, featureRows] of groups) {
    m += `| ${mdText(feature)} | ${mdText(validatedTopics(featureRows, text))} | ${featureRows.length} |\n`;
  }
  m += '\n';
  return m;
}

function buildNaturalScenarios(rows: TestRow[], text: ReportText): string {
  const groups = featureGroups(rows);
  let m = `## ${text.naturalScenariosHeading}\n\n`;
  for (const [feature, featureRows] of groups) {
    m += `### ${text.featureHeadingLabel}: ${mdText(feature)}\n\n`;
    m += `${text.validatedScenariosLabel}\n\n`;
    for (const row of featureRows) {
      m += `- ${mdText(naturalScenarioTitle(row.title, text))}\n`;
    }
    m += '\n';
  }
  return m;
}

function buildManagementConclusion(rows: TestRow[], text: ReportText): string {
  const features = uniqueSorted(rows.map(featureName));
  const topics = uniqueSorted(rows.map((row) => scenarioIntent(row, text).replace(/\.$/, ''))).slice(0, 6);
  let m = `## ${text.managementConclusionHeading}\n\n`;
  const scenarioLabel = rows.length === 1 ? text.scenarioSingular : text.scenarioPlural;
  m += formatReportText(text.managementConclusionTemplate, {
    count: rows.length,
    scenarioLabel,
    pluralSuffix: rows.length === 1 ? '' : 's',
    features: mdText(features.join(', ') || text.mappedFeaturesFallback)
  });
  const topicsSuffix = topics.length
    ? formatReportText(text.managementConclusionTopicsTemplate, { topics: mdText(topics.join('; ')) })
    : '';
  m += formatReportText(text.managementConclusionCoverageTemplate, { topicsSuffix });
  return m;
}

function buildManagementNotes(text: ReportText): string {
  let m = `## ${text.managementNotesHeading}\n\n`;
  m += `- ${text.noteMappedButNotExecuted}\n`;
  m += `- ${text.noteMappedStatus}\n`;
  m += `- ${text.noteReportStructure}\n\n`;
  return m;
}

function buildManagementReport(
  files: IParsedTestFile[],
  rows: TestRow[],
  stats: { totalTestFiles: number; totalTests: number },
  text: ReportText
): string {
  let m = buildManagementDivider(text);
  m += buildExecutiveSummary(rows, text);
  m += buildManagementIndicators(files, rows, stats, text);
  m += buildManagementCoverage(rows, text);
  m += buildNaturalScenarios(rows, text);
  m += buildManagementConclusion(rows, text);
  m += buildManagementNotes(text);
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

function buildAnalyzedFilesTable(files: IParsedTestFile[], text: ReportText): string {
  let m = `## ${text.analyzedFilesHeading}\n\n`;
  m += `| ${text.fileLabel} | ${text.pathLabel} | ${text.languageLabel} | ${text.mainSuiteLabel} | ${text.scenarioQuantityLabel} |\n`;
  m += '| --- | --- | --- | --- | ---: |\n';
  for (const file of files) {
    const total = file.contexts.reduce((acc, ctx) => acc + countTestsInContext(ctx), 0);
    m += `| \`${mdCode(file.fileName)}\` | \`${mdCode(file.filePath)}\` | ${sourceKindLabel(file.sourceKind)} | ${mdText(file.firstContext || file.describe || '-')} | ${total} |\n`;
  }
  m += '\n';
  return m;
}

function buildHookSectionForSuite(ctx: ITestContext, depth: number, language: string, text: ReportText): string {
  let m = '';
  if (ctx.hooks?.length) {
    m += `${headingLevel(depth, 3)} Hooks: ${mdText(ctx.name)}\n\n`;
    for (const hook of ctx.hooks) {
      m += `**Hook:** ${hook.type}\n\n`;
      m += `**${text.codeLabel}:**\n\n`;
      m += codeBlock(hook.summary ? [hook.summary] : [], language, text);
      m += `**${text.interpretationLabel}:** ${mdText(hookInterpretation(hook.summary, text))}\n\n`;
    }
  }
  for (const nested of ctx.nested ?? []) {
    m += buildHookSectionForSuite(nested, depth + 1, language, text);
  }
  return m;
}

function buildHooksSection(files: IParsedTestFile[], text: ReportText): string {
  let m = `## ${text.hooksHeading}\n\n`;
  const body = files
    .map((file) => {
      const language = sourceCodeLanguage(file.sourceKind);
      const content = file.contexts.map((ctx) => buildHookSectionForSuite(ctx, 0, language, text)).join('');
      return content ? `### ${text.fileHeadingLabel}: ${mdText(file.fileName)}\n\n${content}` : '';
    })
    .filter(Boolean)
    .join('');
  return body ? m + body : m + `${text.hooksEmpty}\n\n`;
}

function renderScenarioCard(
  c: ITestCaseDetail,
  ctx: ITestContext,
  junitIndex: JunitIndex,
  language: string,
  text: ReportText
): string {
  const execution = findJunitMatch(junitIndex, ctx.name, c.title);
  const status = execution
    ? `${stateLabel(execution.state, text)} (${formatDurationSeconds(execution.timeSec)})`
    : text.statusMapped;
  const steps = c.steps.map((step) => actionToNaturalLanguage(step, text));
  const expectations = c.expectations.map((expectation) => expectationToNaturalLanguage(expectation, text));
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
  let m = `#### ${text.scenarioLabel}: ${mdText(c.title)}\n\n`;
  m += `| ${text.itemLabel} | ${text.detailLabel} |\n`;
  m += '| --- | --- |\n';
  m += `| ${text.objectiveLabel} | ${mdText(c.metadata.description || naturalScenarioTitle(c.title, text))} |\n`;
  m += `| ${text.screenFeatureLabel} | ${mdText(c.metadata.screen || fallbackFeature)} |\n`;
  if (c.metadata.priority) m += `| ${text.priorityLabel} | ${mdText(c.metadata.priority)} |\n`;
  m += `| ${text.statusLabel} | ${mdText(status)} |\n\n`;

  m += `**${text.automatedFlowLabel}:**\n\n`;
  if (steps.length) {
    for (const [index, step] of steps.entries()) m += `${index + 1}. ${mdText(step)}\n`;
  } else {
    m += `${text.noInlineActions}\n`;
  }
  m += `\n**${text.expectedValidationsLabel}:**\n\n`;
  if (expectations.length) {
    for (const [index, expectation] of expectations.entries()) m += `${index + 1}. ${mdText(expectation)}\n`;
  } else {
    m += `${text.noInlineExpectations}\n`;
  }
  m += `\n**${text.extractedTechnicalSnippetLabel}:**\n\n`;
  m += codeBlock(codeSnippets, language, text);
  return m;
}

function renderSuite(ctx: ITestContext, depth: number, junitIndex: JunitIndex, language: string, text: ReportText): string {
  let m = '';
  m += `${headingLevel(depth, 2)} **${mdText(ctx.name)}**\n\n`;
  if (ctx.testCases && ctx.testCases.length) {
    for (const c of ctx.testCases) {
      m += renderScenarioCard(c, ctx, junitIndex, language, text);
    }
  } else if (ctx.tests.length) {
    for (const t of ctx.tests) {
      m += `#### ${text.scenarioLabel}: ${mdText(t)}\n\n`;
      m += `**${text.functionalDescriptionLabel}:** ${text.identifiedScenarioDescription}\n\n`;
      m += `**${text.statusLabel}:** ${text.statusMapped}\n\n`;
    }
  }
  for (const n of ctx.nested ?? []) {
    m += renderSuite(n, depth + 1, junitIndex, language, text);
  }
  return m;
}

function renderFileSection(p: IParsedTestFile, junitIndex: JunitIndex, text: ReportText): string {
  let m = `## ${text.fileSectionLabel}: **${mdText(p.fileName)}**\n\n`;
  m += `**${text.pathLabel}:** ${mdText(p.filePath)}\n\n`;
  if (p.sourceKind) m += `**${text.languageLabel}:** ${sourceKindLabel(p.sourceKind)}\n\n`;
  if (p.description) m += `**${text.descriptionLabel}:** ${mdText(p.description)}\n\n`;
  if (p.author) m += `**${text.fileAuthorLabel}:** ${mdText(p.author)}\n\n`;
  if (p.warnings.length) {
    m += `**${text.analyzerWarningsLabel}:**\n\n`;
    for (const w of p.warnings) {
      m += `- ${text.codeItemLabel}: \`${mdCode(w)}\`\n`;
    }
    m += '\n';
  }
  const language = sourceCodeLanguage(p.sourceKind);
  for (const c of p.contexts) {
    m += renderSuite(c, 0, junitIndex, language, text);
  }
  return m;
}

function buildTechnicalSummary(
  files: IParsedTestFile[],
  allRows: IFlattenedJunit[],
  stats: { spec: number; e2e: number; test: number; totalTestFiles: number; totalTests: number },
  text: ReportText
): string {
  const languages = Array.from(new Set(files.map((f) => sourceKindLabel(f.sourceKind)).filter((x) => x !== '-')));
  let m = `## ${text.technicalSummaryHeading}\n\n`;
  m += `- ${formatReportText(text.technicalSummaryTestFilesTemplate, { count: stats.totalTestFiles })}\n`;
  m += `- ${formatReportText(text.technicalSummaryEnumeratedTestsTemplate, { count: stats.totalTests })}\n`;
  m += `- ${formatReportText(text.technicalSummaryFrameworkTemplate, { framework: 'Detox' })}\n`;
  m += `- ${formatReportText(text.technicalSummaryLanguageTemplate, { languages: mdText(languages.join(', ') || '-') })}\n`;
  if (allRows.length) {
    const a = aggregateJunit(allRows);
    m += `- ${formatReportText(text.technicalSummaryJunitTemplate, {
      total: a.total,
      passed: a.passed,
      failed: a.failed,
      skipped: a.skipped
    })}\n`;
    const documented = new Set(files.flatMap((f) => f.its.map(canonicalKey)));
    const unmatchedJunit = allRows.filter((r) => !documented.has(canonicalKey(r.name))).length;
    if (unmatchedJunit) {
      m += `- ${formatReportText(text.technicalSummaryUnmatchedJunitTemplate, { count: unmatchedJunit })}\n`;
    }
  }
  if (stats.e2e) {
    m += `- ${formatReportText(text.technicalSummaryPatternTemplate, { pattern: '*.e2e.*', count: stats.e2e })}\n`;
  }
  if (stats.spec) {
    m += `- ${formatReportText(text.technicalSummaryPatternTemplate, { pattern: '*.spec.*', count: stats.spec })}\n`;
  }
  if (stats.test) {
    m += `- ${formatReportText(text.technicalSummaryPatternTemplate, { pattern: '*.test.*', count: stats.test })}\n`;
  }
  m += '\n';
  return m;
}

function buildTechnicalReport(
  files: IParsedTestFile[],
  allRows: IFlattenedJunit[],
  stats: { spec: number; e2e: number; test: number; totalTestFiles: number; totalTests: number },
  testRows: TestRow[],
  junitIndex: JunitIndex,
  metadata: ReportMetadata,
  text: ReportText
): string {
  let m = buildTechnicalDivider(text);
  m += buildTechnicalSummary(files, allRows, stats, text);
  m += buildAnalyzedFilesTable(files, text);
  m += buildHooksSection(files, text);
  m += buildSelectorsTable(testRows, text);
  m += buildAutomatedAnalysis(text);
  if (allRows.length) m += buildExecutionReportJunit(allRows, metadata);
  m += `## ${text.technicalDetailHeading}\n\n`;
  for (const f of files) {
    m += renderFileSection(f, junitIndex, text);
  }
  return m;
}

function buildJunitTableWithText(rows: IFlattenedJunit[], text: ReportText): string {
  let m = `| **ID** | **${text.junitCategoryLabel}** | **${text.testLabel}** | **${text.stateLabel}** | **${text.durationLabel}** |\n`;
  m += '|--------|------------------------|----------|------------|-------------|\n';
  let i = 0;
  for (const r of rows) {
    i += 1;
    const id = `E2E${i.toString().padStart(3, '0')}`;
    m += `| ${id} | ${mdText(r.classname || r.name)} | ${mdText(r.name)} | ${stateLabel(r.state, text)} | ${formatDurationSeconds(
      r.timeSec
    )} |\n`;
  }
  return m;
}

export function buildJunitTable(
  rows: IFlattenedJunit[],
  metadata?: Pick<ReportMetadata, 'reportLanguage' | 'reportTextOverrides'>
): string {
  return buildJunitTableWithText(rows, resolveReportText(metadata));
}

function buildJunitErrorSectionWithText(rows: IFlattenedJunit[], text: ReportText): string {
  const fail = rows.filter((r) => r.state === 'failed');
  let m = `## ${text.junitFailuresHeading}\n\n`;
  if (fail.length === 0) {
    m += `${text.junitFailuresEmpty}\n\n`;
    return m;
  }
  for (const f of fail) {
    m += `### **${mdText(f.name)}**\n\n`;
    m += f.message
      ? `${mdText(f.message)}\n\n`
      : `${text.junitNoMessage}\n\n`;
  }
  return m;
}

export function buildJunitErrorSection(
  rows: IFlattenedJunit[],
  metadata?: Pick<ReportMetadata, 'reportLanguage' | 'reportTextOverrides'>
): string {
  return buildJunitErrorSectionWithText(rows, resolveReportText(metadata));
}

function buildJunitConclusionsWithText(text: ReportText): string {
  let m = `## ${text.junitConclusionsHeading}\n\n`;
  m += `- ${text.junitConclusionFix}\n`;
  m += `- ${text.junitConclusionSlow}\n`;
  m += `- ${text.junitConclusionPipeline}\n`;
  m += '\n';
  return m;
}

export function buildJunitConclusions(
  metadata?: Pick<ReportMetadata, 'reportLanguage' | 'reportTextOverrides'>
): string {
  return buildJunitConclusionsWithText(resolveReportText(metadata));
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
  const text = resolveReportText(metadata);
  if (allRows.length === 0) return '';
  const a = aggregateJunit(allRows);
  const passRate = a.total > 0 ? ((a.passed / a.total) * 100).toFixed(2) : '0.00';
  const failRate = a.total > 0 ? ((a.failed / a.total) * 100).toFixed(2) : '0.00';
  const dt = dateTimeString();
  let m = `# ${text.executionReportTitle}\n\n`;
  m += `## ${text.projectIdentificationHeading}\n\n\n`;
  m += `| **${text.infoLabel}** | **${text.valueLabel}** |\n`;
  m += '|----------------|-----------|\n';
  m += `| **${text.systemLabel}**     | ${mdText(metadata.projectName)} |\n`;
  m += `| **${text.versionLabel}**      | ${mdText(metadata.version || '-')} |\n`;
  m += `| **${text.environmentLabel}**    | ${mdText(metadata.environment || '-')} |\n`;
  m += `| **${text.dateTimeLabel}** | ${dt} |\n`;
  m += `| **${text.responsibleLabel}** | ${mdText(metadata.responsible || '-')} |\n\n`;
  m += `## ${text.objectiveHeading}\n\n`;
  m += `${text.objectiveText}\n\n`;
  m += `## ${text.generalMetricsHeading}\n\n`;
  m += `| **${text.metricLabel}**            | **${text.valueLabel}** |\n`;
  m += '|------------------------|-----------|\n';
  m += `| **${text.junitRowsLabel}** | ${a.total} |\n`;
  m += `| **${text.passedLabel}**            | ${a.passed} (${passRate}%) |\n`;
  m += `| **${text.failedLabel}**            | ${a.failed} (${failRate}%) |\n`;
  m += `| **${text.skippedLabel}**         | ${a.skipped} |\n`;
  m += `| **${text.durationSumLabel}**  | ${a.timeSec.toFixed(2)} |\n\n`;
  m += `## ${text.junitDetailHeading}\n\n`;
  m += buildJunitTableWithText(allRows, text);
  m += '\n\n';
  m += buildJunitErrorSectionWithText(allRows, text);
  m += buildJunitConclusionsWithText(text);
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
  const text = resolveReportText(metadata);
  let m = buildCover(files, stats, metadata, text);
  m += buildManagementReport(files, testRows, stats, text);
  m += buildTechnicalReport(files, allRows, stats, testRows, junitIndex, metadata, text);
  return m;
}
