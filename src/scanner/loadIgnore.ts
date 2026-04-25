import fs from 'fs';
import path from 'path';
import ignore from 'ignore';

export function createPathFilter(workingDir: string): (relPosix: string) => boolean {
  const p = path.join(workingDir, '.detox-docgenignore');
  if (!fs.existsSync(p) || !fs.statSync(p).isFile()) {
    return () => true;
  }
  const body = fs.readFileSync(p, 'utf8');
  const ign = ignore().add(body);
  return (relPosix: string) => !ign.ignores(relPosix);
}
