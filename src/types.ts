export interface ITestCaseDetail {
  title: string;
  steps: string[];
  expectations: string[];
  codeSnippets?: string[];
  metadata: {
    description?: string;
    author?: string;
    screen?: string;
    priority?: string;
  };
}

export interface IHookInfo {
  type: 'beforeAll' | 'afterAll' | 'beforeEach' | 'afterEach';
  summary: string;
}

export interface ITestContext {
  name: string;
  tests: string[];
  testCases?: ITestCaseDetail[];
  hooks: IHookInfo[];
  nested?: ITestContext[];
}

/** Inferido da extensão após normalização (JS / TS / TSX tratados de forma uniforme no modelo). */
export type SourceKind = 'javascript' | 'typescript' | 'tsx';

export interface IParsedTestFile {
  fileName: string;
  filePath: string;
  describe: string;
  firstContext: string;
  contexts: ITestContext[];
  its: string[];
  description: string;
  author: string;
  warnings: string[];
  fileStats: {
    spec: number;
    e2e: number;
    test: number;
  };
  /** Preenchido pelo normalizador a partir da extensão do arquivo. */
  sourceKind?: SourceKind;
}

export type DetoxDocgenReportLanguage = 'pt-BR' | 'en';

export type DetoxDocgenReportTextOverrides = Record<string, string>;

export type DetoxDocgenOutputFormat = 'md' | 'mdx';

export type DetoxDocgenUserConfig = {
  testGlob?: string | string[];
  outputFile?: string;
  folderOutputDir?: string;
  pdfOutputDir?: string;
  projectName?: string;
  version?: string;
  responsible?: string;
  environment?: string;
  reportLanguage?: DetoxDocgenReportLanguage;
  reportTextOverrides?: DetoxDocgenReportTextOverrides;
  outputFormat?: DetoxDocgenOutputFormat;
};

export type DetoxDocgenResolvedConfig = Required<DetoxDocgenUserConfig>;

export type DetoxDocgenGenerateOptions = {
  reportLanguage?: DetoxDocgenReportLanguage;
  reportTextOverrides?: DetoxDocgenReportTextOverrides;
  outputFormat?: DetoxDocgenOutputFormat;
};
