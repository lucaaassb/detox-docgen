import path from 'path';
import puppeteer from 'puppeteer';
import { findTestFiles } from '../scanner/findTestFiles';
import { loadUserConfig } from '../config';
import { parseDetoxTestFile, sumFileStats } from '../parser/parseDetoxFile';
import { normalizeParsed } from '../normalizer';
import { DetoxDocgenGenerateOptions, IParsedTestFile } from '../types';
import { markdownToHtmlDocument, getPdfFileNameForDir } from './htmlFromParsed';
import { ensureDirSync } from '../scanner/findTestFiles';
import { buildTestDocumentation } from '../renderer/markdown';
import { findJunitFiles, parseJunitFile } from '../execution/parseJunit';
import { IFlattenedJunit } from '../execution/types';

async function loadJunitRows(workingDir: string): Promise<IFlattenedJunit[]> {
  const rows: IFlattenedJunit[] = [];
  for (const j of await findJunitFiles(workingDir)) {
    try {
      rows.push(...parseJunitFile(j));
    } catch (e) {
      console.warn(`Aviso JUnit: ${j}`, e);
    }
  }
  return rows;
}

function applyGenerateOptions(
  config: ReturnType<typeof loadUserConfig>,
  options: DetoxDocgenGenerateOptions = {}
): ReturnType<typeof loadUserConfig> {
  return {
    ...config,
    reportLanguage: options.reportLanguage ?? config.reportLanguage,
    reportTextOverrides: options.reportTextOverrides ?? config.reportTextOverrides,
    outputFormat: options.outputFormat ?? config.outputFormat
  };
}

function reportMetadata(config: ReturnType<typeof loadUserConfig>, workingDir: string) {
  return {
    projectName: config.projectName || path.basename(workingDir),
    version: config.version,
    responsible: config.responsible,
    environment: config.environment,
    reportLanguage: config.reportLanguage,
    reportTextOverrides: config.reportTextOverrides
  };
}

function buildMarkdownReport(
  parsed: IParsedTestFile[],
  junitRows: IFlattenedJunit[],
  metadata: ReturnType<typeof reportMetadata>
): string {
  const statsAgg = sumFileStats(parsed);
  const totalTests = parsed.reduce((a, f) => a + f.its.length, 0);
  return buildTestDocumentation(
    parsed,
    junitRows,
    {
      spec: statsAgg.spec,
      e2e: statsAgg.e2e,
      test: statsAgg.test,
      totalTestFiles: parsed.length,
      totalTests
    },
    metadata
  );
}

function pdfDocumentTitle(config: ReturnType<typeof loadUserConfig>): string {
  return config.reportLanguage === 'en' ? 'Detox E2E - Documentation' : 'Detox E2E - Documentação';
}

export async function generateSinglePDF(
  workingDir: string = process.cwd(),
  options: DetoxDocgenGenerateOptions = {}
): Promise<void> {
  workingDir = path.resolve(workingDir);
  const config = applyGenerateOptions(loadUserConfig(workingDir), options);
  const originalCwd = process.cwd();
  try {
    process.chdir(workingDir);
    const testFiles = await findTestFiles(workingDir, config.testGlob);
    if (testFiles.length === 0) {
      console.log('Nenhum arquivo de teste Detox encontrado.');
      return;
    }
    const parsed: IParsedTestFile[] = testFiles.map((p) =>
      normalizeParsed(parseDetoxTestFile(p, workingDir))
    );
    const markdown = buildMarkdownReport(parsed, await loadJunitRows(workingDir), reportMetadata(config, workingDir));
    const html = markdownToHtmlDocument(markdown, pdfDocumentTitle(config));
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 0 });
    const out = path.join(workingDir, 'spec-docs.pdf');
    await page.pdf({
      path: out,
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true
    });
    await browser.close();
    const n = parsed.reduce((a, f) => a + f.its.length, 0);
    console.log('✅ spec-docs.pdf gerado com sucesso.');
    console.log(`Arquivos: ${testFiles.length}, testes (it): ${n}.`);
  } finally {
    process.chdir(originalCwd);
  }
}

export async function generateFolderPDFs(
  workingDir: string = process.cwd(),
  options: DetoxDocgenGenerateOptions = {}
): Promise<void> {
  workingDir = path.resolve(workingDir);
  const config = applyGenerateOptions(loadUserConfig(workingDir), options);
  const originalCwd = process.cwd();
  try {
    process.chdir(workingDir);
    const testFiles = await findTestFiles(workingDir, config.testGlob);
    if (testFiles.length === 0) {
      console.log('Nenhum arquivo de teste Detox encontrado.');
      return;
    }
    const byDir = new Map<string, string[]>();
    for (const f of testFiles) {
      const rel = path.relative(workingDir, f);
      const d = path.dirname(rel);
      const k = d === '' ? 'root' : d;
      if (!byDir.has(k)) byDir.set(k, []);
      byDir.get(k)!.push(f);
    }
    const outRoot = path.join(workingDir, config.pdfOutputDir);
    ensureDirSync(outRoot);
    for (const [d, files] of byDir) {
      const parsed: IParsedTestFile[] = files.map((p) =>
        normalizeParsed(parseDetoxTestFile(p, workingDir))
      );
      const metadata = reportMetadata(config, workingDir);
      const display = d === 'root' ? metadata.projectName : metadata.projectName + ' / ' + d;
      const markdown = buildMarkdownReport(parsed, d === 'root' ? await loadJunitRows(workingDir) : [], {
        ...metadata,
        projectName: display
      });
      const html = markdownToHtmlDocument(markdown, pdfDocumentTitle(config));
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load', timeout: 0 });
      const name = getPdfFileNameForDir(workingDir, d);
      const out = path.join(outRoot, name);
      await page.pdf({
        path: out,
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        printBackground: true
      });
      await browser.close();
      const n = parsed.reduce((a, f) => a + f.its.length, 0);
      console.log(`✅ ${name} — ${files.length} arquivo(s), ${n} teste(s).`);
    }
    console.log(`📄 PDFs em ${outRoot} (${byDir.size} diretório(s)).`);
  } finally {
    process.chdir(originalCwd);
  }
}
