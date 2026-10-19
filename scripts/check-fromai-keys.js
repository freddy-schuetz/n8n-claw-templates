#!/usr/bin/env node
// Checks every template for $fromAI keys that n8n rejects at runtime.
//
// Since n8n 2.35.4 (security fix GHSA-9x83-43r8-5hwc) $fromAI refuses keys that
// name internal JavaScript properties. The tool call then fails silently with
// "Invalid parameter key" while the execution still reports success. jira 1.3.0
// to 1.4.1 used $fromAI('caller') and was dead on every n8n >= 2.35.4.
// The list below is n8n-workflow 2.42.2 dist/cjs/utils.js (unsafeObjectProperties),
// unchanged up to 2.44.x. Re-check it inside the container after an n8n update.
//
// Usage: node scripts/check-fromai-keys.js   (exit code 1 on any finding)
// Also runs as pre-commit hook: git config core.hooksPath .githooks
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const RESERVED = new Set(['__proto__', 'prototype', 'constructor', 'getPrototypeOf', 'setPrototypeOf',
  'getOwnPropertyDescriptor', 'getOwnPropertyDescriptors', 'defineProperty', 'defineProperties',
  'mainModule', 'binding', '_linkedBinding', '_load', 'prepareStackTrace', '__lookupGetter__',
  '__lookupSetter__', '__defineGetter__', '__defineSetter__', 'caller', 'callee', 'arguments',
  'getBuiltinModule', 'dlopen', 'execve', 'loadEnvFile']);
const VALID = /^[a-zA-Z0-9_-]{1,64}$/;
// n8n matches $fromAI case-insensitively and allows spaces before the bracket.
const FROMAI = /\$fromai\s*\(\s*(['"`])((?:(?!\1).)*)\1/gi;

function files(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...files(p));
    else if (e.name === 'workflow.json') out.push(p);
  }
  return out;
}

// Only n8n expressions ("=..." or "{{ }}"); jsCode that generates $fromAI text is not an expression.
function expressions(v, out) {
  if (typeof v === 'string') { if (v.startsWith('=') || v.includes('{{')) out.push(v); }
  else if (Array.isArray(v)) v.forEach(x => expressions(x, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (k !== 'jsCode') expressions(x, out); }
  return out;
}

let errors = 0, keys = 0;
for (const file of files(path.join(ROOT, 'templates'))) {
  const rel = path.relative(ROOT, file);
  let bundle;
  try { bundle = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { errors++; console.log('  FAIL ' + rel + ': invalid JSON (' + e.message + ')'); continue; }
  const nodes = [];
  for (const part of ['sub', 'server']) if (bundle[part] && Array.isArray(bundle[part].nodes)) nodes.push(...bundle[part].nodes);
  if (Array.isArray(bundle.nodes)) nodes.push(...bundle.nodes);
  for (const n of nodes) {
    for (const ex of expressions(n.parameters || {}, [])) {
      for (const m of ex.matchAll(FROMAI)) {
        const k = m[2];
        if (k.includes('${')) continue;
        keys++;
        if (RESERVED.has(k)) { errors++; console.log('  FAIL ' + rel + ' / ' + n.name + ': $fromAI key "' + k + '" is reserved in n8n'); }
        else if (!VALID.test(k)) { errors++; console.log('  FAIL ' + rel + ' / ' + n.name + ': $fromAI key "' + k + '" is invalid'); }
      }
    }
  }
}
console.log(keys + ' $fromAI keys checked, ' + errors + ' finding(s)');
process.exit(errors ? 1 : 0);
