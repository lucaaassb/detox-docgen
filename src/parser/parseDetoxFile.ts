import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import * as t from '@babel/types';
import generate from '@babel/generator';
import { getCallRootName, isHookCallName } from './calleeName';
import { extractFileJsdoc, getLeadingBlockComment, parseJsdocText } from './jsdoc';
import {
  IHookInfo,
  IParsedTestFile,
  ITestCaseDetail,
  ITestContext
} from '../types';

const BABEL_PLUGINS = [
  'typescript',
  'jsx',
  'classProperties',
  ['decorators', { decoratorsBeforeExport: true }],
  'objectRestSpread',
  'optionalChaining',
  'nullishCoalescingOperator',
  'asyncGenerators',
  'topLevelAwait',
  'importMeta',
  'dynamicImport'
] as const;

function isDescribeName(name: string, isEach: boolean): boolean {
  return name === 'describe' && !isEach;
}

function isItRoot(name: string, isEach: boolean): boolean {
  return (name === 'it' || name === 'test') && !isEach;
}

function getStringArg(node: t.Expression | t.SpreadElement | t.JSXNamespacedName | t.ArgumentPlaceholder | t.V8IntrinsicIdentifier | t.TSType | undefined, warn: string[]): string | null {
  if (!node) return null;
  if (t.isStringLiteral(node)) return node.value;
  if (t.isTemplateLiteral(node) && node.quasis.length === 1 && !node.expressions.length) {
    return node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
  }
  warn.push('Não foi possível extrair título estático; use string literal ou JSDoc @description no teste.');
  return '<<título dinâmico>>';
}

function shouldCaptureStep(code: string): boolean {
  return /\b(element|device|expect|waitFor|by)\b/.test(code);
}

function extractStepsFromBlock(
  body: t.BlockStatement | t.Expression
): { steps: string[]; expectations: string[] } {
  const steps: string[] = [];
  const exp: string[] = [];

  const visitExpr = (e: t.Expression) => {
    const code = generate(e, { comments: false, compact: false }).code;
    if (!shouldCaptureStep(code)) return;
    const one = code.replace(/\s+/g, ' ').trim();
    if (one.length > 500) {
      steps.push(`${one.slice(0, 497)}...`);
    } else if (/\bexpect\s*\(/.test(one) || /\.toBeVisible|\.toExist|\.toHaveText|\.toHaveLabel|not\./.test(one)) {
      exp.push(one);
    } else {
      steps.push(one);
    }
  };

  if (t.isBlockStatement(body)) {
    for (const st of body.body) {
      if (t.isExpressionStatement(st)) {
        if (t.isCallExpression(st.expression) || t.isOptionalCallExpression(st.expression)) {
          visitExpr(st.expression);
        } else {
          visitExpr(st.expression);
        }
      } else if (t.isVariableDeclaration(st)) {
        for (const d of st.declarations) {
          if (d.init) visitExpr(d.init as t.Expression);
        }
      } else if (t.isReturnStatement(st) && st.argument) {
        visitExpr(st.argument as t.Expression);
      } else if (t.isTryStatement(st) && t.isBlockStatement(st.block)) {
        for (const inner of st.block.body) {
          if (t.isExpressionStatement(inner) && t.isExpression(inner.expression)) {
            visitExpr(inner.expression);
          }
        }
      }
    }
  } else {
    visitExpr(body);
  }
  return { steps, expectations: exp };
}

function getItCallback(
  call: t.CallExpression
): t.FunctionExpression | t.ArrowFunctionExpression | null {
  if (call.arguments.length < 2) return null;
  const arg = call.arguments[1];
  if (t.isFunctionExpression(arg) || t.isArrowFunctionExpression(arg)) return arg;
  return null;
}

function getFirstFnArg(
  call: t.CallExpression
): t.FunctionExpression | t.ArrowFunctionExpression | null {
  const arg = call.arguments[0];
  if (t.isFunctionExpression(arg) || t.isArrowFunctionExpression(arg)) return arg;
  return null;
}

function getDescribeCallback(
  call: t.CallExpression
): t.FunctionExpression | t.ArrowFunctionExpression | null {
  if (call.arguments.length < 2) return null;
  const arg = call.arguments[1];
  if (t.isFunctionExpression(arg) || t.isArrowFunctionExpression(arg)) return arg;
  return null;
}

function extractHooks(
  block: t.BlockStatement,
  warnings: string[]
): IHookInfo[] {
  const hooks: IHookInfo[] = [];
  for (const st of block.body) {
    if (!t.isExpressionStatement(st) || !t.isCallExpression(st.expression)) continue;
    const call = st.expression;
    const meta = getCallRootName(call.callee as t.Expression);
    if (!meta || isHookCallName(meta.root) === false) continue;
    const fn = getFirstFnArg(call);
    if (fn && t.isBlockStatement(fn.body)) {
      const { steps } = extractStepsFromBlock(fn.body);
      hooks.push({
        type: meta.root as IHookInfo['type'],
        summary: steps[0] ?? ''
      });
    } else {
      hooks.push({ type: meta.root as IHookInfo['type'], summary: '' });
    }
  }
  return hooks;
}

export function parseDetoxTestFile(absoluteFilePath: string, cwd: string = process.cwd()): IParsedTestFile {
  const fileName = path.basename(absoluteFilePath);
  const content = fs.readFileSync(absoluteFilePath, 'utf8');
  const relative = path.relative(cwd, absoluteFilePath);
  const warnings: string[] = [];

  const ast = parse(content, {
    sourceType: 'unambiguous',
    allowAwaitOutsideFunction: true,
    errorRecovery: true,
    attachComment: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: BABEL_PLUGINS as any
  });

  const fileDoc = extractFileJsdoc(ast.program);
  const contexts: ITestContext[] = [];
  const allIts: string[] = [];

  let firstDescribe: string = 'N/A';
  let firstContextName = '';

  function processSuiteBlock(
    block: t.BlockStatement,
    suiteName: string,
    parentPath: string
  ): ITestContext {
    const hooks = extractHooks(block, warnings);
    const nested: ITestContext[] = [];
    const testCases: ITestCaseDetail[] = [];
    const testTitles: string[] = [];

    for (const st of block.body) {
      if (!t.isExpressionStatement(st) || !t.isCallExpression(st.expression)) continue;
      const call = st.expression;
      const cr = getCallRootName(call.callee as t.Expression);
      if (!cr) continue;

      if (cr.root === 'describe' && cr.isEach) {
        warnings.push('describe.each: suporte parcial; documente o bloco com JSDoc.');
        continue;
      }

      if (isDescribeName(cr.root, cr.isEach)) {
        const title = getStringArg(call.arguments[0] as t.Expression, warnings);
        const sub = title ?? 'Suite';
        const nextPath = parentPath ? `${parentPath} > ${sub}` : sub;
        const cb = getDescribeCallback(call);
        if (cb && t.isBlockStatement(cb.body)) {
          const child = processSuiteBlock(cb.body, sub, nextPath);
          child.name = nextPath;
          nested.push(child);
        } else {
          warnings.push('describe sem callback de bloco: ignorado parcialmente.');
        }
        continue;
      }

      if (isItRoot(cr.root, cr.isEach)) {
        if (cr.isEach) {
          warnings.push('it.each: suporte parcial; use títulos explícitos ou JSDoc.');
        }
        const title = getStringArg(call.arguments[0] as t.Expression, warnings) ?? 'Test';
        testTitles.push(title);
        allIts.push(title);

        let itMeta: ITestCaseDetail['metadata'] = {};
        const lead = getLeadingBlockComment(st);
        if (lead) {
          const p = parseJsdocText(lead.start);
          itMeta = { ...p };
        }

        const cb = getItCallback(call);
        let steps: string[] = [];
        let expectations: string[] = [];
        if (cb) {
          if (t.isBlockStatement(cb.body)) {
            const e = extractStepsFromBlock(cb.body);
            steps = e.steps;
            expectations = e.expectations;
          } else {
            const e = extractStepsFromBlock(cb.body);
            steps = e.steps;
            expectations = e.expectations;
          }
        }
        testCases.push({
          title,
          steps,
          expectations,
          metadata: itMeta
        });
      }
    }

    return {
      name: suiteName,
      tests: testTitles,
      testCases,
      hooks,
      nested
    };
  }

  for (const st of ast.program.body) {
    if (!t.isExpressionStatement(st) || !t.isCallExpression(st.expression)) continue;
    const call = st.expression;
    const cr = getCallRootName(call.callee as t.Expression);
    if (!cr) continue;
    if (cr.root === 'describe' && cr.isEach) {
      warnings.push('describe.each (nível de ficheiro): suporte parcial; documente com JSDoc.');
      continue;
    }
    if (isDescribeName(cr.root, cr.isEach)) {
      const title = getStringArg(call.arguments[0] as t.Expression, warnings) ?? 'Suite';
      if (firstDescribe === 'N/A') {
        firstDescribe = title;
        firstContextName = title;
      }
      const cb = getDescribeCallback(call);
      if (cb && t.isBlockStatement(cb.body)) {
        const rootCtx = processSuiteBlock(cb.body, title, title);
        rootCtx.name = title;
        contexts.push(rootCtx);
      } else {
        warnings.push('describe (nível de ficheiro) sem callback de bloco.');
      }
    }
  }

  if (contexts.length === 0) {
    for (const st of ast.program.body) {
      if (!t.isExpressionStatement(st) || !t.isCallExpression(st.expression)) continue;
      const call = st.expression;
      const m = getCallRootName(call.callee as t.Expression);
      if (!m || !isItRoot(m.root, m.isEach)) continue;
      if (m.isEach) {
        warnings.push('it.each (nível de ficheiro): suporte parcial.');
        continue;
      }
      const title = getStringArg(call.arguments[0] as t.Expression, warnings) ?? 'Test';
      allIts.push(title);
      const lead = getLeadingBlockComment(st);
      const itMeta: ITestCaseDetail['metadata'] = lead ? parseJsdocText(lead.start) : {};
      const cb = getItCallback(call);
      let steps: string[] = [];
      let expectations: string[] = [];
      if (cb) {
        const e = t.isBlockStatement(cb.body)
          ? extractStepsFromBlock(cb.body)
          : extractStepsFromBlock(cb.body);
        steps = e.steps;
        expectations = e.expectations;
      }
      contexts.push({
        name: firstContextName || 'Tests',
        tests: [title],
        testCases: [{ title, steps, expectations, metadata: itMeta }],
        hooks: [],
        nested: []
      });
    }
  }

  const b = fileName;
  const fileStats = {
    spec: b.includes('.spec.') ? 1 : 0,
    e2e: b.includes('.e2e.') ? 1 : 0,
    test: b.includes('.test.') ? 1 : 0
  };

  return {
    fileName,
    filePath: relative,
    describe: firstDescribe,
    firstContext: firstContextName,
    contexts,
    its: allIts,
    description: fileDoc.description ?? '',
    author: fileDoc.author ?? '',
    warnings,
    fileStats
  };
}

export function sumFileStats(
  files: IParsedTestFile[]
): { spec: number; e2e: number; test: number } {
  return files.reduce(
    (a, f) => ({
      spec: a.spec + f.fileStats.spec,
      e2e: a.e2e + f.fileStats.e2e,
      test: a.test + f.fileStats.test
    }),
    { spec: 0, e2e: 0, test: 0 }
  );
}
