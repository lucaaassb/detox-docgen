import * as t from '@babel/types';

const DESC = /@description\s+([\s\S]*?)(?=\*?\s*@|\*\/)/i;
const AUTH = /@author\s+([\s\S]*?)(?=\*?\s*@|\*\/)/i;
const SCR = /@screen\s+([\s\S]*?)(?=\*?\s*@|\*\/)/i;
const PRIO = /@priority\s+([\s\S]*?)(?=\*?\s*@|\*\/)/i;

function cleanJsdocBody(s: string): string {
  return s
    .split('\n')
    .map((l) => l.replace(/^\s*\*+\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseJsdocText(raw: string): {
  description?: string;
  author?: string;
  screen?: string;
  priority?: string;
} {
  const out: ReturnType<typeof parseJsdocText> = {};
  const d = raw.match(DESC);
  if (d?.[1]) out.description = cleanJsdocBody(d[1]);
  const a = raw.match(AUTH);
  if (a?.[1]) out.author = cleanJsdocBody(a[1]);
  const s = raw.match(SCR);
  if (s?.[1]) out.screen = cleanJsdocBody(s[1]);
  const p = raw.match(PRIO);
  if (p?.[1]) out.priority = cleanJsdocBody(p[1]);
  return out;
}

export function getLeadingBlockComment(
  n: t.Node
): { text: string; start: string } | null {
  if (!n.leadingComments) return null;
  const c = n.leadingComments
    .filter(
      (x) => x.type === 'CommentBlock' && x.value && /@description|@author|@screen|@priority/.test(x.value)
    )
    .pop();
  if (!c || c.value === undefined) return null;
  return { text: `/*${c.value}*/`, start: c.value };
}

export function extractFileJsdoc(program: t.Program): {
  description?: string;
  author?: string;
} {
  if (!program.leadingComments) return {};
  for (const c of program.leadingComments) {
    if (c.type === 'CommentBlock' && c.value) {
      const tgs = parseJsdocText(c.value);
      if (tgs.description || tgs.author) {
        return { description: tgs.description, author: tgs.author };
      }
    }
  }
  return {};
}
