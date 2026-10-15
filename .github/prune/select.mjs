#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Pau Aliagas <linuxnow@gmail.com>
//
// Print what the prune keeps and deletes in the package repository, and write the plan as JSON.
//
//   select.mjs --keep keep.yml [--pins pins.json] --tree <channel checkout> [--json plan.json] [--expect-clean]
//   select.mjs --keep keep.yml [--pins pins.json] --url https://freemixer.github.io [--rpm fedora/44/x86_64,...] [--deb bookworm,...]
//
// --pins adds the entries pins.mjs derived from openmixer's branches to keep.yml's. A plan that would still
// delete every build of a pinned version that exists exits 1, after printing and writing it.
// --only rpm|deb reads that half alone.
// --tree reads every rpm/fedora/<release>/<dir>/repodata and deb/debian/<suite>/Packages of a checkout, and
// also deletes package files that no index lists. --url reads the served indexes of the named directories.
// --expect-clean exits 1 when anything would be deleted: the check that a pruned tree is what the plan said.
// Paths in the plan are relative to the channel root (rpm/..., deb/...).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { parseKeep, parsePrimary, parsePackages, selectRepo, unusedPins, pinsLost, report } from './prune.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes(k);

function decompress(buf, name) {
  if (name.endsWith('.zst')) {
    return zlib.zstdDecompressSync ? zlib.zstdDecompressSync(buf) : execFileSync('zstd', ['-dc'], { input: buf, maxBuffer: 1 << 30 });
  }
  if (name.endsWith('.gz')) return zlib.gunzipSync(buf);
  if (name.endsWith('.xz')) return execFileSync('xz', ['-dc'], { input: buf, maxBuffer: 1 << 30 });
  return buf;
}

async function get(url) {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(url);
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    if (attempt >= 5 || r.status < 500) throw new Error(`${url}: HTTP ${r.status}`);
    await new Promise((res) => setTimeout(res, 2000 * attempt));
  }
}

const primaryHref = (repomd) => {
  const m = repomd.match(/<data type="primary">[\s\S]*?<location href="([^"]*)"/);
  if (!m) throw new Error('repomd.xml names no primary');
  return m[1];
};

async function main() {
  const keep = parseKeep(fs.readFileSync(opt('--keep', 'keep.yml'), 'utf8'));
  if (opt('--pins')) keep.push(...JSON.parse(fs.readFileSync(opt('--pins'), 'utf8')));
  const tree = opt('--tree');
  const url = opt('--url');
  if (!tree === !url) throw new Error('give exactly one of --tree and --url');
  const rpmRepos = new Map(); // fedora/44 -> pkgs
  const debRepos = new Map();
  const listed = new Set();
  const add = (m, k, pkgs) => (m.get(k) || m.set(k, []).get(k)).push(...pkgs);
  const only = opt('--only');
  if (only && only !== 'rpm' && only !== 'deb') throw new Error('--only takes rpm or deb');
  const want = (f) => !only || only === f;

  if (tree) {
    const rpmRoot = path.join(tree, 'rpm/fedora');
    for (const rel of want('rpm') && fs.existsSync(rpmRoot) ? fs.readdirSync(rpmRoot).sort() : []) {
      for (const dir of fs.readdirSync(path.join(rpmRoot, rel)).sort()) {
        const repodata = path.join(rpmRoot, rel, dir, 'repodata');
        if (!fs.existsSync(path.join(repodata, 'repomd.xml'))) continue;
        const href = primaryHref(fs.readFileSync(path.join(repodata, 'repomd.xml'), 'utf8'));
        const xml = decompress(fs.readFileSync(path.join(rpmRoot, rel, dir, href)), href).toString('utf8');
        add(rpmRepos, `fedora/${rel}`, parsePrimary(xml, `fedora/${rel}`, dir));
      }
    }
    const debRoot = path.join(tree, 'deb/debian');
    for (const suite of want('deb') && fs.existsSync(debRoot) ? fs.readdirSync(debRoot).sort() : []) {
      const p = path.join(debRoot, suite, 'Packages');
      if (fs.existsSync(p)) add(debRepos, `debian/${suite}`, parsePackages(fs.readFileSync(p, 'utf8'), `debian/${suite}`));
    }
  } else {
    const base = url.replace(/\/$/, '');
    for (const d of want('rpm') ? opt('--rpm', 'fedora/44/x86_64,fedora/44/noarch,fedora/44/aarch64,fedora/44/SRPMS').split(',') : []) {
      const [distro, rel, dir] = d.split('/');
      const href = primaryHref((await get(`${base}/rpm/${d}/repodata/repomd.xml`)).toString('utf8'));
      const xml = decompress(await get(`${base}/rpm/${d}/${href}`), href).toString('utf8');
      add(rpmRepos, `${distro}/${rel}`, parsePrimary(xml, `${distro}/${rel}`, dir));
    }
    for (const suite of want('deb') ? opt('--deb', 'bookworm,trixie').split(',') : []) {
      add(debRepos, `debian/${suite}`, parsePackages((await get(`${base}/deb/debian/${suite}/Packages`)).toString('utf8'), `debian/${suite}`));
    }
  }

  const results = [];
  const all = [];
  for (const [format, repos] of [['rpm', rpmRepos], ['deb', debRepos]]) {
    for (const [repo, pkgs] of repos) {
      all.push(...pkgs);
      const r = selectRepo(pkgs, keep);
      for (const row of [...r.keep, ...r.delete]) { row.path = `${format}/${repo}/${row.file}`; listed.add(row.path); }
      results.push(r);
    }
  }

  // files of the tree that no index lists: unreachable, and gone with the rest
  const orphans = [];
  if (tree) {
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) return e.name === 'repodata' ? [] : walk(p);
      return /\.(rpm|deb)$/.test(e.name) ? [path.relative(tree, p)] : [];
    });
    for (const top of ['rpm', 'deb']) if (want(top) && fs.existsSync(path.join(tree, top))) {
      for (const f of walk(path.join(tree, top))) if (!listed.has(f)) orphans.push(f);
    }
  }

  const plan = {
    keep: results.flatMap((r) => r.keep),
    delete: results.flatMap((r) => r.delete),
    orphans: orphans.sort(),
    notes: results.flatMap((r) => r.notes),
    warnings: only ? [] : unusedPins(keep, all),
    lost: pinsLost(keep, all, new Set(results.flatMap((r) => r.keep).map((r) => r.path))),
  };
  console.log(report(results));
  if (plan.orphans.length) console.log(`\nfiles no index lists (deleted):\n${plan.orphans.map((f) => '  ' + f).join('\n')}`);
  if (plan.notes.length) console.log(`\nnotes:\n${plan.notes.map((n) => '  ' + n).join('\n')}`);
  if (plan.warnings.length) console.log(`\nkeep.yml pins that match nothing:\n${plan.warnings.map((n) => '  ' + n).join('\n')}`);
  const count = (rows, f) => rows.filter((r) => r.format === f).length;
  console.log('\nsummary:');
  for (const f of ['rpm', 'deb'].filter(want)) console.log(`  ${f}: keep ${count(plan.keep, f)}, delete ${count(plan.delete, f)}`);
  if (tree) console.log(`  files no index lists: ${plan.orphans.length}`);
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(plan, null, 2) + '\n');
  if (plan.lost.length) {
    console.error(`the plan deletes every build of a pinned version:\n${plan.lost.map((n) => '  ' + n).join('\n')}`);
    process.exit(1);
  }
  if (flag('--expect-clean') && (plan.delete.length || plan.orphans.length)) {
    console.error(`not clean: ${plan.delete.length} indexed and ${plan.orphans.length} unindexed package(s) would still be deleted`);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e.message); process.exit(2); });
