import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(directory, entry.name)) : entry.name.endsWith('.tsx') ? [join(directory, entry.name)] : []);
}
const normalize = (path: string) => ('/' + path.split('/').filter((part) => part && !part.startsWith('(')).join('/')).replace(/\/index$/, '') || '/';

it('resolves navigation targets from tabs, menus, and pages to real app routes', () => {
  const app = join(process.cwd(), 'app');
  const routeFiles = files(app).filter((file) => !file.endsWith('_layout.tsx'));
  const routes = routeFiles.map((file) => normalize('/' + relative(app, file).replaceAll('\\', '/').replace(/\.tsx$/, '')));
  const matches = (target: string) => routes.some((route) => {
    const expected = route.split('/');
    const actual = normalize(target.split('?')[0]).split('/');
    return expected.length === actual.length && expected.every((segment, index) => segment.startsWith('[') || segment === actual[index]);
  });
  const links: { file: string; target: string }[] = [];
  function targets(node: ts.Expression): string[] {
    if (ts.isStringLiteral(node)) return [node.text];
    if (ts.isTemplateExpression(node)) return [node.head.text + node.templateSpans.map((span) => '__dynamic__' + span.literal.text).join('')];
    if (ts.isConditionalExpression(node)) return [...targets(node.whenTrue), ...targets(node.whenFalse)];
    if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return targets(node.expression);
    if (ts.isObjectLiteralExpression(node)) {
      const pathname = node.properties.find((prop) => ts.isPropertyAssignment(prop) && prop.name.getText() === 'pathname');
      if (pathname && ts.isPropertyAssignment(pathname)) return targets(pathname.initializer);
    }
    return [];
  }
  for (const file of [...files(app), ...files(join(process.cwd(), 'src/components'))]) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.arguments[0]) {
        const name = node.expression.getText(source);
        if (['router.push', 'router.replace', 'go'].includes(name)) {
          for (const target of targets(node.arguments[0])) {
            if (target.startsWith('/') && target !== '/(tabs)/__dynamic__') links.push({ file, target });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  expect(routeFiles.length).toBeGreaterThan(30);
  expect(links.length).toBeGreaterThan(20);
  expect(links.filter(({ target }) => !matches(target))).toEqual([]);
  for (const tab of ['', '/nutrition', '/training', '/leaderboards', '/social', '/messages', '/session']) {
    expect(matches('/(tabs)' + tab)).toBe(true);
  }
});
