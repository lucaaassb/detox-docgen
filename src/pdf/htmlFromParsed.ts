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
  b += '<!doctype html><html><head><meta charset="utf-8"><title>Detox E2E - Documentação</title><style>' + css + '</style></head><body>';
  b += '<h1>Detox E2E - Documentação de testes</h1><p>Projeto: <strong>' + esc(projectName) + '</strong></p><hr/>';

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

function escInlineMarkdown(s: string): string {
  return esc(s)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function splitTableCells(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  const body = line.slice(1, -1);
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '|' && body[i - 1] !== '\\') {
      cells.push(cell.trim().replace(/\\\|/g, '|'));
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim().replace(/\\\|/g, '|'));
  return cells;
}

export function markdownToHtmlDocument(markdown: string, title: string): string {
  const css = `
  :root { color-scheme: light; }
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height:1.5;
    margin:0;
    padding:0 40px 34px;
    color:#243042;
    background:#f5f7fb;
    box-sizing:border-box;
  }
  *, *::before, *::after { box-sizing:inherit; }
  body > * { margin-left:0; margin-right:0; }
  h1 {
    margin:0 -40px 26px;
    padding:38px 40px 34px;
    color:#fff;
    background:linear-gradient(135deg, #123f6d 0%, #2563eb 52%, #13a39a 100%);
    border-bottom:6px solid #f59e0b;
    font-size:30px;
    letter-spacing:0;
  }
  h1 + p, h1 + p + p, h1 + p + p + p, h1 + p + p + p + p, h1 + p + p + p + p + p, h1 + p + p + p + p + p + p, h1 + p + p + p + p + p + p + p {
    background:#ffffff;
    border-left:4px solid #2563eb;
    margin-top:0;
    margin-bottom:8px;
    padding:8px 12px;
    box-shadow:0 1px 2px rgba(18,63,109,.08);
  }
  h2 {
    color:#123f6d;
    border-left:6px solid #13a39a;
    padding:8px 0 8px 14px;
    margin:30px 0 12px;
    background:#e9f5ff;
  }
  h3, h4, h5, h6 { color:#1f4f7a; margin-top:20px; }
  table {
    width:100%;
    border-collapse:separate;
    border-spacing:0;
    margin:12px 0 20px;
    font-size:12.5px;
    background:#fff;
    border:1px solid #d7e2ef;
    box-shadow:0 1px 3px rgba(18,63,109,.08);
  }
  th, td { border-bottom:1px solid #d7e2ef; padding:8px 10px; text-align:left; vertical-align:top; }
  th { background:#123f6d; color:#fff; font-weight:700; }
  tr:nth-child(even) td { background:#f8fbff; }
  tr:last-child td { border-bottom:0; }
  code {
    display:inline-block;
    max-width:100%;
    overflow-wrap:anywhere;
    background:#eef6ff;
    border:1px solid #9fc8ef;
    border-left:4px solid #2563eb;
    border-radius:4px;
    padding:2px 6px;
    font-family: Consolas, 'Courier New', monospace;
    font-size: 12px;
    line-height:1.35;
    color:#143f63;
  }
  li { margin:4px 0; }
  p { margin-top:8px; margin-bottom:8px; }
  hr { border:0; border-top:2px solid #f59e0b; margin:26px 0; }
  @media print {
    body { background:#fff; }
    h1, h2, h3 { page-break-after: avoid; }
    table, ul { page-break-inside: avoid; }
  }`;

  const out: string[] = [];
  let inUl = false;
  let inTable = false;
  let nextTableRowIsHeader = false;
  const closeBlocks = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inTable) {
      out.push('</tbody></table>');
      inTable = false;
      nextTableRowIsHeader = false;
    }
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      if (inUl) {
        out.push('</ul>');
        inUl = false;
      }
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      closeBlocks();
      out.push('<hr/>');
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeBlocks();
      const level = heading[1].length;
      out.push(`<h${level}>${escInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    if (line.startsWith('|') && line.endsWith('|')) {
      if (/^\|[-\s|:]+$/.test(line)) continue;
      if (!inTable) {
        if (inUl) {
          out.push('</ul>');
          inUl = false;
        }
        out.push('<table><tbody>');
        inTable = true;
        nextTableRowIsHeader = true;
      }
      const cells = splitTableCells(line);
      const tag = nextTableRowIsHeader ? 'th' : 'td';
      out.push('<tr>' + cells.map((c) => `<${tag}>${escInlineMarkdown(c)}</${tag}>`).join('') + '</tr>');
      nextTableRowIsHeader = false;
      continue;
    }
    if (line.startsWith('- ')) {
      if (inTable) {
        out.push('</tbody></table>');
        inTable = false;
      }
      if (!inUl) {
        out.push('<ul>');
        inUl = true;
      }
      out.push(`<li>${escInlineMarkdown(line.slice(2))}</li>`);
      continue;
    }
    closeBlocks();
    out.push(`<p>${escInlineMarkdown(line)}</p>`);
  }
  closeBlocks();

  return '<!doctype html><html><head><meta charset="utf-8"><title>' +
    esc(title) +
    '</title><style>' +
    css +
    '</style></head><body>' +
    out.join('\n') +
    '</body></html>';
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
