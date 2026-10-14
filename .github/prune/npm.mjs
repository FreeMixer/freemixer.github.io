#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Pau Aliagas <linuxnow@gmail.com>
//
// The npm half of the prune: keep the newest version of each package and what keep.yml pins, unpublish the
// rest where npmjs allows it and deprecate what it refuses, so those still install but are flagged.
//
//   npm.mjs --keep keep.yml [--apply] [package ...]
//
// Without --apply it only prints what it would do. --apply needs an npm login with publish rights
// (NODE_AUTH_TOKEN through the .npmrc that actions/setup-node writes).
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseKeep, selectNpm, DEPRECATION } from './prune.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const apply = args.includes('--apply');
const names = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--keep');
const packages = names.length ? names : ['@openmixer/omx-contract', '@openmixer/plugin-qualify'];

async function json(url) {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

function npm(...a) {
  const r = spawnSync('npm', a, { encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout + r.stderr).trim() };
}

async function main() {
  const keep = parseKeep(fs.readFileSync(opt('--keep', 'keep.yml'), 'utf8'));
  let failed = 0;
  for (const name of packages) {
    const doc = await json(`https://registry.npmjs.org/${name.replace('/', '%2F')}`);
    const dl = await json(`https://api.npmjs.org/downloads/point/last-week/${name}`).catch(() => ({ downloads: Infinity }));
    const plan = selectNpm(name, doc, keep, { weekly: dl.downloads });
    console.log(`npm ${name} (downloads last week: ${dl.downloads}, maintainers: ${(doc.maintainers || []).length})`);
    for (const k of plan.keep) console.log(`  keep        ${k.version.padEnd(14)} ${k.reason}`);
    for (const k of plan.unpublish) console.log(`  unpublish   ${k.version}`);
    for (const k of plan.deprecate) console.log(`  deprecate   ${k.version}`);
    for (const k of plan.already) console.log(`  deprecated  ${k.version.padEnd(14)} already: ${k.deprecated}`);
    if (!apply) continue;
    for (const { version } of plan.unpublish) {
      const r = npm('unpublish', `${name}@${version}`);
      if (r.ok) { console.log(`  unpublished ${version}`); continue; }
      console.log(`  npm refused to unpublish ${version}, deprecating it: ${r.out.split('\n').pop()}`);
      plan.deprecate.push({ version });
    }
    for (const { version } of plan.deprecate) {
      const r = npm('deprecate', `${name}@${version}`, DEPRECATION);
      if (r.ok) console.log(`  deprecated  ${version}`);
      else { failed++; console.error(`  FAILED to deprecate ${name}@${version}: ${r.out}`); }
    }
  }
  if (!apply) console.log('\ndry run: nothing was unpublished or deprecated');
  if (failed) process.exit(1);
}

main().catch((e) => { console.error(e.message); process.exit(2); });
