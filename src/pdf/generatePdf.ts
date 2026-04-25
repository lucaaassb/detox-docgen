import path from 'path';
import puppeteer from 'puppeteer';
import { findTestFiles } from '../scanner/findTestFiles';
import { loadUserConfig } from '../config';
import { parseDetoxTestFile } from '../parser/parseDetoxFile';
import { IParsedTestFile } from '../types';
import { generateTestDocumentationHTML, getPdfFileNameForDir } from './htmlFromParsed';
import { ensureDirSync } from '../scanner/findTestFiles';

export async function generateSinglePDF(workingDir: string = process.cwd()): Promise<void> {
  const config = loadUserConfig(workingDir);
  const originalCwd = process.cwd();
  try {
    process.chdir(workingDir);
    const testFiles = await findTestFiles(workingDir, config.testGlob);
    if (testFiles.length === 0) {
      console.log('Nenhum ficheiro de teste Detox encontrado.');
      return;
    }
    const parsed: IParsedTestFile[] = testFiles.map((p) => parseDetoxTestFile(p, workingDir));
    const projectName = path.basename(workingDir);
    const html = generateTestDocumentationHTML(parsed, projectName);
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
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
    console.log(`Ficheiros: ${testFiles.length}, testes (it): ${n}.`);
  } finally {
    process.chdir(originalCwd);
  }
}

export async function generateFolderPDFs(workingDir: string = process.cwd()): Promise<void> {
  const config = loadUserConfig(workingDir);
  const originalCwd = process.cwd();
  try {
    process.chdir(workingDir);
    const testFiles = await findTestFiles(workingDir, config.testGlob);
    if (testFiles.length === 0) {
      console.log('Nenhum ficheiro de teste Detox encontrado.');
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
      const parsed: IParsedTestFile[] = files.map((p) => parseDetoxTestFile(p, workingDir));
      const projectName = path.basename(workingDir);
      const display = d === 'root' ? projectName : projectName + ' / ' + d;
      const html = generateTestDocumentationHTML(parsed, display);
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
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
      console.log(`✅ ${name} — ${files.length} ficheiro(s), ${n} teste(s).`);
    }
    console.log(`📄 PDFs em ${outRoot} (${byDir.size} directório(s)).`);
  } finally {
    process.chdir(originalCwd);
  }
}
