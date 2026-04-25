import path from 'path';

const RE_CONVENTION =
  /\.(e2e|spec|test)\.(m?[jt]sx?|[jt]sx?)$/i;

export function isLikelyE2EFileName(filePath: string): boolean {
  const name = path.basename(filePath);
  return RE_CONVENTION.test(name);
}
