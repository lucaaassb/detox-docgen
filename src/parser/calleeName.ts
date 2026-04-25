import * as t from '@babel/types';

export type CallishName =
  | { kind: 'root'; name: string; member?: 'only' | 'skip' | 'failing' | 'todo' | 'concurrent' }
  | { kind: 'chained' };

function memberChainBase(
  exp: t.Expression | t.V8IntrinsicIdentifier | t.PrivateName
): string | null {
  if (t.isIdentifier(exp)) return exp.name;
  if (t.isMemberExpression(exp) && !exp.computed) {
    if (t.isIdentifier(exp.property, { name: 'only' })) {
      if (t.isIdentifier(exp.object)) {
        return exp.object.name;
      }
    }
    if (t.isIdentifier(exp.property, { name: 'skip' })) {
      if (t.isIdentifier(exp.object)) return exp.object.name;
    }
    if (t.isIdentifier(exp.object)) {
      if (t.isIdentifier(exp.property)) {
        if (['skip', 'only', 'failing', 'todo', 'concurrent'].includes(exp.property.name)) {
          return exp.object.name;
        }
        if (['each', 'for'].includes(exp.property.name)) {
          return exp.object.name;
        }
      }
    }
  }
  return null;
}

export function getCallRootName(
  callee: t.Expression | t.V8IntrinsicIdentifier
): { root: string; isEach: boolean; modifier?: 'only' | 'skip' } | null {
  if (t.isIdentifier(callee)) {
    return { root: callee.name, isEach: false };
  }
  if (t.isMemberExpression(callee) && !callee.computed) {
    if (t.isIdentifier(callee.object) && t.isIdentifier(callee.property)) {
      const obj = callee.object.name;
      const prop = callee.property.name;
      if (['skip', 'only', 'failing', 'todo', 'concurrent'].includes(prop) && (obj === 'it' || obj === 'test' || obj === 'describe')) {
        return { root: obj, isEach: false, modifier: prop as 'only' | 'skip' };
      }
      if (prop === 'each' && (obj === 'it' || obj === 'describe' || obj === 'test')) {
        return { root: obj, isEach: true };
      }
    }
  }
  const b = memberChainBase(callee as t.Expression);
  if (b) return { root: b, isEach: false };
  return null;
}

export function isHookCallName(root: string): boolean {
  return (
    root === 'beforeAll' ||
    root === 'afterAll' ||
    root === 'beforeEach' ||
    root === 'afterEach'
  );
}
