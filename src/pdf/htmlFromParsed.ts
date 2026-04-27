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
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height:1.5; margin:40px; color:#333; }
  h1 { color:#2c3e50; border-bottom:3px solid #3498db; padding-bottom:10px; }
  h2 { color:#34495e; border-left:4px solid #3498db; padding-left:12px; margin-top:28px; }
  h3, h4, h5, h6 { color:#2c3e50; margin-top:20px; }
  table { width:100%; border-collapse:collapse; margin:12px 0 18px; font-size:13px; }
  th, td { border:1px solid #d7dee8; padding:7px 9px; text-align:left; vertical-align:top; }
  th { background:#edf3f8; }
  code { background:#f1f3f5; border-radius:4px; padding:1px 4px; font-family: Consolas, monospace; font-size: 12px; }
  li { margin:4px 0; }
  hr { border:0; border-top:1px solid #d7dee8; margin:24px 0; }
  @media print { h1, h2, h3 { page-break-after: avoid; } table, ul { page-break-inside: avoid; } }`;

  const out: string[] = [];
  let inUl = false;
  let inTable = false;
  const closeBlocks = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inTable) {
      out.push('</tbody></table>');
      inTable = false;
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
      }
      const cells = splitTableCells(line);
      out.push('<tr>' + cells.map((c) => `<td>${escInlineMarkdown(c)}</td>`).join('') + '</tr>');
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
