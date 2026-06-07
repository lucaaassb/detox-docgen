import fs from 'fs';
import path from 'path';
import { findTestFiles, ensureDirSync } from './scanner/findTestFiles';
import { loadUserConfig } from './config';
import { parseDetoxTestFile, sumFileStats } from './parser/parseDetoxFile';
import { normalizeParsed } from './normalizer';
import { buildTestDocumentation } from './renderer/markdown';
import { findJunitFiles, parseJunitFile } from './execution/parseJunit';
import { IFlattenedJunit } from './execution/types';
import { DetoxDocgenGenerateOptions, IParsedTestFile } from './types';
import { generateSinglePDF, generateFolderPDFs } from './pdf/generatePdf';
import { folderOutputFileForDir, outputFileForFormat } from './outputFormat';

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

export async function generateSingleDoc(
  workingDir: string = process.cwd(),
  options: DetoxDocgenGenerateOptions = {}
): Promise<void> {
  const config = applyGenerateOptions(loadUserConfig(workingDir), options);
  const testFiles = await findTestFiles(workingDir, config.testGlob);
  if (testFiles.length === 0) {
    console.log('Nenhum arquivo de teste Detox encontrado com os padrões configurados.');
    return;
  }
  const parsed: IParsedTestFile[] = testFiles.map((p) =>
    normalizeParsed(parseDetoxTestFile(p, workingDir))
  );
  const statsAgg = sumFileStats(parsed);
  const totalTests = parsed.reduce((a, f) => a + f.its.length, 0);
  const junitPaths = await findJunitFiles(workingDir);
  const allJunit: IFlattenedJunit[] = [];
  for (const j of junitPaths) {
    try {
      allJunit.push(...parseJunitFile(j));
    } catch (e) {
      console.warn(`Aviso: não foi possível analisar JUnit: ${j}`, e);
    }
  }
  const projectName = config.projectName || path.basename(workingDir);
  const md = buildTestDocumentation(
    parsed,
    allJunit,
    {
      spec: statsAgg.spec,
      e2e: statsAgg.e2e,
      test: statsAgg.test,
      totalTestFiles: testFiles.length,
      totalTests
    },
    {
      projectName,
      version: config.version,
      responsible: config.responsible,
      environment: config.environment,
      reportLanguage: config.reportLanguage,
      reportTextOverrides: config.reportTextOverrides
    }
  );
  const outputFile = outputFileForFormat(config.outputFile, config.outputFormat);
  const out = path.join(workingDir, outputFile);
  fs.writeFileSync(out, md, 'utf8');
  console.log(`✅ ${outputFile} gerado.`);
  console.log(
    `Arquivos: ${testFiles.length}, testes: ${totalTests} (e2e:${statsAgg.e2e} spec:${statsAgg.spec} test:${statsAgg.test})`
  );
  if (allJunit.length) {
    console.log(`Relatório JUnit: ${allJunit.length} caso(s) de teste (de ${junitPaths.length} arquivo(s)).`);
  }
}

export async function generateFolderDocs(
  workingDir: string = process.cwd(),
  options: DetoxDocgenGenerateOptions = {}
): Promise<void> {
  const config = applyGenerateOptions(loadUserConfig(workingDir), options);
  const testFiles = await findTestFiles(workingDir, config.testGlob);
  if (testFiles.length === 0) {
    console.log('Nenhum arquivo de teste Detox encontrado.');
    return;
  }
  const byDir = new Map<string, string[]>();
  for (const f of testFiles) {
    const rel = path.relative(workingDir, f);
    const d = path.dirname(rel);
    const k = d === '' || d === '.' ? 'root' : d;
    if (!byDir.has(k)) byDir.set(k, []);
    byDir.get(k)!.push(f);
  }
  const outDir = path.join(workingDir, config.folderOutputDir);
  ensureDirSync(outDir);
  const allJunit: IFlattenedJunit[] = [];
  for (const j of await findJunitFiles(workingDir)) {
    try {
      allJunit.push(...parseJunitFile(j));
    } catch (e) {
      console.warn(`Aviso JUnit: ${j}`, e);
    }
  }
  const projectName = config.projectName || path.basename(workingDir);
  for (const [d, files] of byDir) {
    const parsed: IParsedTestFile[] = files.map((p) =>
      normalizeParsed(parseDetoxTestFile(p, workingDir))
    );
    const statsAgg = sumFileStats(parsed);
    const totalTests = parsed.reduce((a, f) => a + f.its.length, 0);
    const md = buildTestDocumentation(
      parsed,
      d === 'root' ? allJunit : [],
      {
        spec: statsAgg.spec,
        e2e: statsAgg.e2e,
        test: statsAgg.test,
        totalTestFiles: files.length,
        totalTests
      },
      {
        projectName,
        version: config.version,
        responsible: config.responsible,
        environment: config.environment,
        reportLanguage: config.reportLanguage,
        reportTextOverrides: config.reportTextOverrides
      }
    );
    const fileName = folderOutputFileForDir(d, config.outputFormat);
    fs.writeFileSync(path.join(outDir, fileName), md, 'utf8');
  }
  console.log(`✅ Documentação por pasta em ${outDir} (${byDir.size} arquivo(s)).`);
}

export { parseDetoxTestFile } from './parser/parseDetoxFile';
export { normalizeParsed } from './normalizer';
export { generateSinglePDF, generateFolderPDFs } from './pdf/generatePdf';
export * from './types';
