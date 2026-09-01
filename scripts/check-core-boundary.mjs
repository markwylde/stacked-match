#!/usr/bin/env node
// Enforces the core/shell split from design.md: src/core is pure TypeScript
// with no DOM access, so every game rule stays unit-testable without a browser.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const CORE = new URL('../src/core/', import.meta.url).pathname;
const ROOT = new URL('..', import.meta.url).pathname;

// Globals that only exist in a browser. `localStorage` is included
// deliberately: core persistence takes an injected storage adapter.
const FORBIDDEN_GLOBALS = [
  'document',
  'window',
  'navigator',
  'localStorage',
  'sessionStorage',
  'HTMLElement',
  'SVGElement',
  'requestAnimationFrame',
  'getComputedStyle',
  'CustomEvent',
];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
  });

const violations = [];

for (const file of walk(CORE)) {
  // Blank out block comments (keeping line count) so prose like "a private
  // window" is not mistaken for a DOM reference.
  const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (block) =>
    block.replace(/[^\n]/g, ' '),
  );
  source.split('\n').forEach((line, index) => {
    const code = line.replace(/\/\/.*$/, '');
    const importMatch = code.match(/from\s+['"]([^'"]+)['"]/);
    if (importMatch && /(^|\/)(shell|\.\.\/shell)/.test(importMatch[1])) {
      violations.push({ file, line: index + 1, reason: `imports shell module "${importMatch[1]}"` });
    }
    for (const name of FORBIDDEN_GLOBALS) {
      if (new RegExp(`(^|[^\\w.$'"\`])${name}\\b`).test(code)) {
        violations.push({ file, line: index + 1, reason: `references DOM global "${name}"` });
      }
    }
  });
}

if (violations.length > 0) {
  console.error('core boundary violations:\n');
  for (const v of violations) {
    console.error(`  ${relative(ROOT, v.file)}:${v.line}  ${v.reason}`);
  }
  console.error(`\n${violations.length} violation(s). src/core must stay DOM-free.`);
  process.exit(1);
}

console.log('core boundary clean: no DOM access in src/core');
