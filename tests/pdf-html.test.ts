import { describe, expect, it } from 'vitest';
import { markdownToHtmlDocument } from '../src/pdf/htmlFromParsed';

describe('markdownToHtmlDocument', () => {
  it('renders headings, tables and list items for PDF output', () => {
    const html = markdownToHtmlDocument(
      '# Titulo\n\n| A | B |\n|---|---|\n| **x** | `y` |\n\n- item',
      'Doc'
    );

    expect(html).toContain('<h1>Titulo</h1>');
    expect(html).toContain('<table><tbody>');
    expect(html).toContain('<strong>x</strong>');
    expect(html).toContain('<code>y</code>');
    expect(html).toContain('<li>item</li>');
  });

  it('keeps escaped table pipes in a single cell', () => {
    const html = markdownToHtmlDocument('| A | B |\n|---|---|\n| login \\| pipe | ok |', 'Doc');

    expect(html).toContain('<td>login | pipe</td><td>ok</td>');
  });
});
