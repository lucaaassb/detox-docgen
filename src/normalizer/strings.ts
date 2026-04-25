export function canonicalReadableText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export function trimCodeLine(s: string): string {
  return s.trim();
}
