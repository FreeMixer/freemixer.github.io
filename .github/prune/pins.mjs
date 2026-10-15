#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Pau Aliagas <linuxnow@gmail.com>
//
// The versions openmixer pins, read from its main and integration branches, as keep entries the prune adds
// to keep.yml. A version deleted under a pin breaks that branch: `pnpm install --frozen-lockfile` fails on a
// missing npm version, and a missing package sends the readers of .github/pins.txt to a source build.
//
//   pins.mjs --repo <openmixer git directory> [--refs origin/main,origin/integration/*] [--json pins.json]
//
// --refs names the refs to read (a trailing * matches every ref under that prefix); origin/main must exist,
// because a plan without the pins of main is a plan that may delete them. Per ref it reads:
//   - .github/pins.txt: every line "<name> ... <version> ...", the version bare or as a v-tag;
//   - packages/*/package.json: every exact @openmixer/<name> specifier;
//   - pnpm-lock.yaml: every resolved @openmixer/<name>@<version>.
// A pinned name is the source package of the rpm and deb packages (omx-contract builds omx-contract-devel
// and libomx-contract-dev) and @openmixer/<name> on npm, so one pin keeps that version in all three.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const VERSION = /^v?(\d+\.\d+\.\d+)$/;

// .github/pins.txt: "<name> <version>", "<name> <version> <url> <sha>", "<name> <url> v<version> <sha>";
// a line without a version (a source commit, a fork at a commit) pins no package
export function pinsTxt(text) {
  const out = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [name, ...rest] = line.split(/\s+/);
    const v = rest.map((t) => t.match(VERSION)).find(Boolean);
    if (v) out.push({ name, version: v[1] });
  }
  return out;
}

// a package.json: exact @openmixer/* versions in any dependency field; ranges and workspace: links are left
// to the lock, which says what they resolved to
export function packageJson(text) {
  const doc = JSON.parse(text);
  const out = [];
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [dep, spec] of Object.entries(doc[field] || {})) {
      const m = dep.match(/^@openmixer\/(.+)$/);
      const v = m && String(spec).replace(/^=/, '').match(VERSION);
      if (v) out.push({ name: m[1], version: v[1] });
    }
  }
  return out;
}

export function pnpmLock(text) {
  return [...text.matchAll(/@openmixer\/([a-z0-9._-]+)@(\d+\.\d+\.\d+)(?![\w.+-])/g)].map((m) => ({ name: m[1], version: m[2] }));
}

// found: [{ ref, file, name, version }] -> keep entries, one per name and version, every place named
export function toKeep(found) {
  const by = new Map();
  for (const f of found) {
    const k = `${f.name} ${f.version}`;
    (by.get(k) || by.set(k, { name: f.name, version: f.version, where: new Set() }).get(k)).where.add(`${f.ref}:${f.file}`);
  }
  return [...by.values()].sort((a, b) => (a.name + a.version < b.name + b.version ? -1 : 1)).map((p) => ({
    version: p.version,
    source: [p.name],
    npm: [`@openmixer/${p.name}`],
    reason: `openmixer pins ${p.name} ${p.version} (${[...p.where].sort().join(', ')})`,
  }));
}

export function readRepo(repo, refPatterns) {
  const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const all = git('for-each-ref', '--format=%(refname)', 'refs/remotes', 'refs/heads').split('\n').filter(Boolean)
    .map((r) => r.replace(/^refs\/(remotes|heads)\//, ''));
  const refs = new Set();
  for (const p of refPatterns) {
    const hits = p.endsWith('*') ? all.filter((r) => r.startsWith(p.slice(0, -1))) : all.filter((r) => r === p);
    hits.forEach((r) => refs.add(r));
  }
  if (!refs.has('origin/main')) throw new Error(`${repo}: no origin/main; the pins of main are what the prune must not delete`);
  const found = [];
  const show = (ref, file) => { try { return git('show', `${ref}:${file}`); } catch { return null; } };
  for (const ref of [...refs].sort()) {
    const add = (file, list) => list.forEach((p) => found.push({ ref, file, ...p }));
    const txt = show(ref, '.github/pins.txt');
    if (txt !== null) add('.github/pins.txt', pinsTxt(txt));
    for (const file of git('ls-tree', '-r', '--name-only', ref, '--', 'packages').split('\n')) {
      if (/^packages\/[^/]+\/package\.json$/.test(file)) add(file, packageJson(show(ref, file)));
    }
    const lock = show(ref, 'pnpm-lock.yaml');
    if (lock !== null) add('pnpm-lock.yaml', pnpmLock(lock));
  }
  return { refs: [...refs].sort(), keep: toKeep(found) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  try {
    const repo = opt('--repo');
    if (!repo) throw new Error('--repo is required');
    const { refs, keep } = readRepo(repo, opt('--refs', 'origin/main,origin/integration/*').split(','));
    console.log(`openmixer refs read: ${refs.join(', ')}`);
    for (const e of keep) console.log(`  ${e.source[0]} ${e.version}: ${e.reason.replace(/^.*\((.*)\)$/, '$1')}`);
    if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(keep, null, 2) + '\n');
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
}
