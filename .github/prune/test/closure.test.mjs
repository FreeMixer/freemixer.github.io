// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Pau Aliagas <linuxnow@gmail.com>
//
//   node --test .github/prune/test/
//
// The kept set is closed under dependencies, rich ones and ranges included: the case is the one that broke
// the first apply, a contract package that needs an older build of a library than the newest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parsePrimary, parsePackages, parseKeep, parseRich, selectRepo, uninstallable } from '../prune.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const select = path.join(here, '..', 'select.mjs');
const expect = path.join(here, '..', 'expect.mjs');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// requires are written as dnf writes them: a plain name, or a rich "(a >= 1 with a < 2)" as one name
function rpmPkg(name, ver, { requires = [] } = {}) {
  return `<package type="rpm">
  <name>${name}</name>
  <arch>noarch</arch>
  <version epoch="0" ver="${ver}" rel="1.fc44"/>
  <location href="${name}-${ver}-1.fc44.noarch.rpm"/>
  <format>
    <rpm:sourcerpm>${name}-${ver}-1.fc44.src.rpm</rpm:sourcerpm>
    <rpm:provides><rpm:entry name="${name}" flags="EQ" epoch="0" ver="${ver}" rel="1.fc44"/></rpm:provides>
    <rpm:requires>
${requires.map((r) => `      <rpm:entry name="${esc(r)}"/>`).join('\n')}
    </rpm:requires>
  </format>
</package>`;
}
const primary = (pkgs) => `<?xml version="1.0"?>\n<metadata xmlns:rpm="http://linux.duke.edu/metadata/rpm">\n${pkgs.join('\n')}\n</metadata>\n`;
const debPkg = (name, version, depends) => [
  `Package: ${name}`, 'Architecture: all', `Version: ${version}`, `Filename: ./all/${name}_${version}_all.deb`,
  ...(depends ? [`Depends: ${depends}`] : []), `Description: ${name}`,
].join('\n');

const KEEP_HOSTD = parseKeep(`keep:
  - version: 0.18.0
    rpm: [plugin-hostd-contract]
    deb: [plugin-hostd-contract]
    reason: the 0.18 line is pinned
`);

// the first apply's case: the contract wants clap-core-contract >= 0.26.2 and < 0.30
const RPM = primary([
  rpmPkg('omx-clap-core-contract', '0.26.2'),
  rpmPkg('omx-clap-core-contract', '0.29.0'),
  rpmPkg('omx-clap-core-contract', '0.30.0'),
  rpmPkg('omx-clap-core-contract', '0.30.1'),
  rpmPkg('plugin-hostd-contract', '0.18.0', { requires: ['(omx-clap-core-contract >= 0.26.2 with omx-clap-core-contract < 0.30)'] }),
  rpmPkg('plugin-hostd-contract', '0.19.0', { requires: ['(omx-clap-core-contract >= 0.26.2 with omx-clap-core-contract < 0.31)'] }),
]);
const DEB = [
  debPkg('omx-clap-core-contract', '0.26.2'),
  debPkg('omx-clap-core-contract', '0.29.0'),
  debPkg('omx-clap-core-contract', '0.30.0'),
  debPkg('omx-clap-core-contract', '0.30.1'),
  debPkg('plugin-hostd-contract', '0.18.0', 'omx-clap-core-contract (>= 0.26.2~), omx-clap-core-contract (<< 0.30~)'),
  debPkg('plugin-hostd-contract', '0.19.0', 'omx-clap-core-contract (>= 0.26.2~), omx-clap-core-contract (<< 0.31~)'),
].join('\n\n') + '\n';

const versions = (r, name) => r.keep.filter((k) => k.name === name).map((k) => k.version.replace(/-.*/, '')).sort();

test('parseRich: with is one provider, or is alternatives, and is two requirements, the rest stays with dnf', () => {
  assert.deepEqual(parseRich('(a >= 1 with a < 2)'), [[{ name: 'a', op: '>=', evr: { epoch: undefined, ver: '1', rel: undefined }, and: [{ name: 'a', op: '<', evr: { epoch: undefined, ver: '2', rel: undefined } }] }]]);
  assert.deepEqual(parseRich('(a or b)').map((g) => g.map((x) => x.name)), [['a', 'b']]);
  assert.deepEqual(parseRich('((a or b) and c)').map((g) => g.map((x) => x.name)), [['a', 'b'], ['c']]);
  assert.deepEqual(parseRich('(pkgconfig(x) >= 1:2.0-3 with pkgconfig(x) < 3)')[0][0].evr, { epoch: '1', ver: '2.0', rel: '3' });
  for (const dnf of ['(a if b)', '(a unless b)', '(a if b else c)', '(a without b)', '(a or /usr/bin/b)', '(a with (b or c))']) {
    assert.equal(parseRich(dnf), null, dnf);
  }
});

test('rpm: a rich range keeps the only build the range allows, besides the newest', () => {
  const pkgs = parsePrimary(RPM, 'fedora/44', 'noarch');
  const r = selectRepo(pkgs, KEEP_HOSTD, { newest: 1 });
  assert.deepEqual(versions(r, 'omx-clap-core-contract'), ['0.29.0', '0.30.1'], '0.29.0 is what plugin-hostd-contract 0.18.0 installs against');
  assert.deepEqual(uninstallable(pkgs, new Set(r.keep.map((k) => k.file))), []);
});

test('rpm: or keeps one satisfier of the alternatives', () => {
  const pkgs = parsePrimary(primary([
    rpmPkg('alt-a', '1.0'), rpmPkg('alt-a', '2.0'),
    rpmPkg('user', '1.0', { requires: ['(alt-a < 2 or alt-gone)'] }),
  ]), 'fedora/44', 'noarch');
  const r = selectRepo(pkgs, parseKeep('keep:\n  - version: 1.0\n    rpm: [user]\n    reason: pinned\n'), { newest: 1 });
  assert.deepEqual(versions(r, 'alt-a'), ['1.0', '2.0']);
});

test('rpm: if/unless and file paths are left to dnf and keep nothing', () => {
  const pkgs = parsePrimary(primary([
    rpmPkg('lib', '1.0'), rpmPkg('lib', '2.0'),
    rpmPkg('user', '1.0', { requires: ['(lib < 2 if foo)', '/usr/bin/lib'] }),
  ]), 'fedora/44', 'noarch');
  const r = selectRepo(pkgs, parseKeep('keep:\n  - version: 1.0\n    rpm: [user]\n    reason: pinned\n'), { newest: 1 });
  assert.deepEqual(versions(r, 'lib'), ['2.0']);
});

test('deb: a range written as two groups keeps the build both allow, and the plan says what apt must be told', () => {
  const pkgs = parsePackages(DEB, 'debian/bookworm');
  const r = selectRepo(pkgs, KEEP_HOSTD, { newest: 1 });
  assert.deepEqual(versions(r, 'omx-clap-core-contract'), ['0.29.0', '0.30.1']);
  const old = r.keep.find((k) => k.name === 'plugin-hostd-contract' && k.version === '0.18.0');
  assert.deepEqual(old.needs, ['omx-clap-core-contract=0.29.0'], 'apt would take 0.30.1 and fail on << 0.30~');
  assert.equal(r.keep.find((k) => k.name === 'plugin-hostd-contract' && k.version === '0.19.0').needs, undefined);
  assert.deepEqual(uninstallable(pkgs, new Set(r.keep.map((k) => k.file))), []);
});

test('deb: the install check names the older dependency build beside the package', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'closure-'));
  const pkgs = parsePackages(DEB, 'debian/bookworm');
  const r = selectRepo(pkgs, KEEP_HOSTD, { newest: 1 });
  const plan = path.join(dir, 'plan.json');
  fs.writeFileSync(plan, JSON.stringify({ keep: r.keep.map((k) => ({ ...k, path: `deb/debian/bookworm/${k.file}` })) }));
  const out = spawnSync('node', [expect, '--plan', plan, '--format', 'deb', '--repo', 'debian/bookworm', '--arch', 'amd64'], { encoding: 'utf8' });
  assert.equal(out.status, 0, out.stderr);
  assert.ok(out.stdout.split('\n').includes('install plugin-hostd-contract=0.18.0,omx-clap-core-contract=0.29.0'), out.stdout);
});

test('the invariant: a kept package whose only satisfier is deleted is named, with the requirement', () => {
  for (const [pkgs, req] of [
    [parsePrimary(RPM, 'fedora/44', 'noarch'), 'omx-clap-core-contract >= 0.26.2 with omx-clap-core-contract < 0.30'],
    [parsePackages(DEB, 'debian/bookworm'), 'omx-clap-core-contract >= 0.26.2~ with omx-clap-core-contract << 0.30~'],
  ]) {
    const keptNoOld = new Set(pkgs.filter((p) => p.name === 'plugin-hostd-contract' || p.evr.ver === '0.30.1' || p.evr === '0.30.1').map((p) => p.file));
    const [line, ...more] = uninstallable(pkgs, keptNoOld);
    assert.equal(more.length, 0);
    assert.match(line, /plugin-hostd-contract 0\.18\.0/);
    assert.ok(line.includes(`requires ${req}`) || line.includes('requires omx-clap-core-contract >= 0.26.2'), line);
    assert.match(line, /only satisfiers are deleted: omx-clap-core-contract 0\.2/);
  }
});

function writeTree(root) {
  const d = path.join(root, 'rpm/fedora/44/noarch');
  fs.mkdirSync(path.join(d, 'repodata'), { recursive: true });
  fs.writeFileSync(path.join(d, 'repodata/primary.xml'), RPM);
  fs.writeFileSync(path.join(d, 'repodata/repomd.xml'), '<repomd><data type="primary"><location href="repodata/primary.xml"/></data></repomd>\n');
  const s = path.join(root, 'deb/debian/bookworm');
  fs.mkdirSync(path.join(s, 'all'), { recursive: true });
  fs.writeFileSync(path.join(s, 'Packages'), DEB);
  for (const p of parsePrimary(RPM, 'fedora/44', 'noarch')) fs.writeFileSync(path.join(root, 'rpm/fedora/44', p.file), '');
  for (const p of parsePackages(DEB, 'debian/bookworm')) fs.writeFileSync(path.join(s, p.file), '');
}

test('cli: the plan carries the invariant, and --check fails a plan that breaks it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'closure-'));
  const tree = path.join(dir, 'tree');
  writeTree(tree);
  fs.writeFileSync(path.join(dir, 'keep.yml'), 'keep:\n  - version: 0.18.0\n    rpm: [plugin-hostd-contract]\n    deb: [plugin-hostd-contract]\n    reason: pinned\n');
  const planFile = path.join(dir, 'plan.json');
  const run = (...a) => spawnSync('node', [select, '--keep', path.join(dir, 'keep.yml'), '--tree', tree, ...a], { encoding: 'utf8' });
  const ok = run('--json', planFile);
  assert.equal(ok.status, 0, ok.stderr);
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  assert.deepEqual(plan.uninstallable, []);
  assert.equal(run('--check', planFile).status, 0);
  // a plan that leaves a kept package uninstallable fails the run itself, after printing, and writes nothing off
  const open = run('--skip-closure', '--json', path.join(dir, 'open.json'));
  assert.equal(open.status, 1);
  assert.match(open.stderr, /leaves a kept package uninstallable/);
  assert.match(open.stderr, /plugin-hostd-contract 0\.18\.0.*requires omx-clap-core-contract >= 0\.26\.2.*deleted: .*0\.29\.0/);
  assert.ok(fs.existsSync(path.join(dir, 'open.json')), 'the plan is written before the exit, like pinsLost');
  // the same plan with the 0.29.0 builds dropped: what the first apply did
  const broken = { ...plan, keep: plan.keep.filter((k) => !(k.name === 'omx-clap-core-contract' && k.version.startsWith('0.29.0'))) };
  fs.writeFileSync(path.join(dir, 'broken.json'), JSON.stringify(broken));
  const bad = run('--check', path.join(dir, 'broken.json'));
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /plugin-hostd-contract 0\.18\.0.*requires omx-clap-core-contract >= 0\.26\.2/);
  assert.match(bad.stdout, /only satisfiers are deleted: .*omx-clap-core-contract 0\.29\.0/);
});
