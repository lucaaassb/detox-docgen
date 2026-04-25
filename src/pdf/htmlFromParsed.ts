import path from 'path';
import { IParsedTestFile, ITestContext } from '../types';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderContextHtml(ctx: ITestContext, depth: number): string {
  const pad = 12 + depth * 8;
  let h = '';
  h += `<div class="context-section" style="margin-left:${pad}px">`;
  h += `<h3 style="color:#2c3e50">${esc(ctx.name)}</h3>`;
  if (ctx.hooks && ctx.hooks.length) {
    h += '<p class="meta-info">Hooks: ';
    h += esc(ctx.hooks.map((x) => x.type + (x.summary ? ` (${x.summary})` : '')).join(', '));
    h += '</p>';
  }
  if (ctx.testCases && ctx.testCases.length) {
    for (const c of ctx.testCases) {
      h += '<div class="test-item"><strong>Teste:</strong> ' + esc(c.title) + '</div>';
      if (c.metadata.description) {
        h += '<p class="meta-info">' + esc(c.metadata.description) + '</p>';
      }
      if (c.steps.length) {
        h += '<ul>';
        for (const s of c.steps) h += '<li><code>' + esc(s) + '</code></li>';
        h += '</ul>';
      }
      if (c.expectations.length) {
        h += '<p><em>Expectativas</em></p><ul>';
        for (const s of c.expectations) h += '<li><code>' + esc(s) + '</code></li>';
        h += '</ul>';
      }
    }
  } else {
    h += '<ul>';
    for (const t of ctx.tests) h += '<li class="test-item">' + esc(t) + '</li>';
    h += '</ul>';
  }
  for (const n of ctx.nested ?? []) h += renderContextHtml(n, depth + 1);
  h += '</div>';
  return h;
}

export function generateTestDocumentationHTML(
  parsedFiles: IParsedTestFile[],
  projectName: string
): string {
  const css = `
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height:1.5; margin:40px; color:#333; }
  h1 { text-align:center; color:#2c3e50; border-bottom:3px solid #3498db; padding-bottom:10px; }
  h2 { color:#34495e; border-left:4px solid #3498db; padding-left:12px; }
  .context-section { margin:16px 0; padding:12px; background:#f8f9fa; border-radius:6px; }
  .meta-info { color:#7f8c8d; font-size: 14px; }
  @media print { h1 { page-break-after: avoid; } .context-section { page-break-inside: avoid; } }`;

  let b = '';
  b += '<!doctype html><html><head><meta charset="utf-8"><title>Detox E2E — Documentação</title><style>' + css + '</style></head><body>';
  b += '<h1>Detox E2E — Documentação de testes</h1><p>Projecto: <strong>' + esc(projectName) + '</strong></p><hr/>';

  for (const f of parsedFiles) {
    b += '<h2>' + esc(f.fileName) + '</h2>';
    b += '<p><strong>Caminho:</strong> ' + esc(f.filePath) + '</p>';
    if (f.description) b += '<p><strong>Descrição:</strong> ' + esc(f.description) + '</p>';
    if (f.author) b += '<p><strong>Autor:</strong> ' + esc(f.author) + '</p>';
    for (const c of f.contexts) b += renderContextHtml(c, 0);
  }
  b += '</body></html>';
  return b;
}

export function getPdfFileNameForDir(
  projectRoot: string,
  dirPathRelative: string
): string {
  const normalized = dirPathRelative === '.' ? 'root' : dirPathRelative;
  if (normalized === 'root' || !normalized) return 'overview.pdf';
  return (
    path.normalize(normalized).replace(/[/\\]+/g, '-').replace(/^-|-$/g, '') + '.pdf'
  );
}
