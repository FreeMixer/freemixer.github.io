// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Pau Aliagas <linuxnow@gmail.com>
//
//   node --test .github/prune/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  rpmvercmp, rpmEvrCmp, debVersionCmp, semverCmp, parseKeep, parsePrimary, parsePackages,
  selectRepo, unusedPins, pinsLost, selectNpm, report,
} from '../prune.mjs';
import { pinsTxt, packageJson, pnpmLock, toKeep } from '../pins.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const select = path.join(here, '..', 'select.mjs');

// ------------------------------------------------------------------ fixtures, in the shape of the real indexes

const FLAG = { '=': 'EQ', '<': 'LT', '<=': 'LE', '>': 'GT', '>=': 'GE' };
function entry(spec) {
  const m = spec.match(/^(\S+)(?: (=|<|<=|>|>=) (?:(\d+):)?([^-\s]+)(?:-(\S+))?)?$/);
  if (!m[2]) return `      <rpm:entry name="${m[1]}"/>`;
  return `      <rpm:entry name="${m[1]}" flags="${FLAG[m[2]]}" epoch="${m[3] || 0}" ver="${m[4]}"${m[5] ? ` rel="${m[5]}"` : ''}/>`;
}
// "name arch [epoch:]ver-rel", requires and provides as "name op ver[-rel]"
function rpmPkg(nevra, { requires = [], provides = [], source } = {}) {
  const [name, arch, v] = nevra.split(' ');
  const [, epoch = '0', ver, rel] = v.match(/^(?:(\d+):)?(.*)-([^-]*)$/);
  const file = `${name}-${ver}-${rel}.${arch}.rpm`;
  const own = arch === 'src' ? [] : [`${name} = ${epoch}:${ver}-${rel}`];
  return `<package type="rpm">
  <name>${name}</name>
  <arch>${arch}</arch>
  <version epoch="${epoch}" ver="${ver}" rel="${rel}"/>
  <checksum type="sha256" pkgid="YES">00</checksum>
  <summary>${name}</summary>
  <location href="${file}"/>
  <format>
    <rpm:license>GPL-3.0-or-later</rpm:license>
    <rpm:sourcerpm>${arch === 'src' ? '' : (source || `${name}-${ver}-${rel}.src.rpm`)}</rpm:sourcerpm>
    <rpm:provides>
${[...own, ...provides].map(entry).join('\n')}
    </rpm:provides>
    <rpm:requires>
      <rpm:entry name="libc.so.6(GLIBC_2.34)(64bit)"/>
      <rpm:entry name="/usr/bin/pkg-config"/>
${requires.map(entry).join('\n')}
    </rpm:requires>
  </format>
</package>`;
}
const primary = (pkgs) => `<?xml version="1.0" encoding="UTF-8"?>
<metadata xmlns="http://linux.duke.edu/metadata/common" xmlns:rpm="http://linux.duke.edu/metadata/rpm" packages="${pkgs.length}">
${pkgs.join('\n')}
</metadata>
`;

const debPkg = (name, version, arch, { depends, source } = {}) => [
  `Package: ${name}`,
  `Architecture: ${arch}`,
  `Version: ${version}`,
  ...(source ? [`Source: ${source}`] : []),
  'Maintainer: Pau Aliagas <linuxnow@gmail.com>',
  `Filename: ./${arch}/${name}_${version.replace(/^\d+:/, '')}_${arch}.deb`,
  ...(depends ? [`Depends: ${depends}`] : []),
  `Description: ${name}`,
  ' a long description line',
].join('\n');

const KEEP = `# fixture
keep:
  - version: 1.0
    rpm: [foo-devel]
    deb: [libfoo-dev]
    npm: ["@scope/foo"]
    reason: something pins foo 1.0
  - version: 1.0
    rpm: [tool]
    reason: something pins tool 1.0
  - version: 0.5.1
    deb: [plugins*]
    reason: something pins plugins 0.5.1
  - version: 9.9.9
    rpm: [nothing-has-this]
    reason: a stale pin
`;
const keep = parseKeep(KEEP);

const RPM = {
  x86_64: primary([
    rpmPkg('foo x86_64 2.9.0-1'),
    rpmPkg('foo x86_64 2.10.1-1'),
    rpmPkg('foo x86_64 2.10.1-2'), // a second build of the newest version
    rpmPkg('bar x86_64 2.0-1'),
    rpmPkg('bar x86_64 3.0-1'),
    rpmPkg('baz x86_64 0:9.0-1'),
    rpmPkg('baz x86_64 1:0.1-1'), // the epoch wins
    rpmPkg('qual x86_64 0.7.0-1'),
    rpmPkg('mod x86_64 0.10.6.f14a230-5.1.freemixer1.fc44'),
    rpmPkg('mod x86_64 0.10.6.f14a230-10.fc44'),
    rpmPkg('mod x86_64 0.10.6.f14a230-9.fc44'),
    rpmPkg('tool x86_64 1.0-1', { requires: ['libtool-runtime = 1.0-1'] }),
    rpmPkg('tool x86_64 2.0-1', { requires: ['libtool-runtime = 2.0-1'] }),
    rpmPkg('libtool-runtime x86_64 1.0-1', { source: 'tool-1.0-1.src.rpm', provides: ['libtool.so.1()(64bit)'] }),
    rpmPkg('libtool-runtime x86_64 2.0-1', { source: 'tool-2.0-1.src.rpm' }),
  ]),
  aarch64: primary([
    rpmPkg('foo aarch64 2.10.1-1'),
    rpmPkg('foo aarch64 2.10.1-2'),
    rpmPkg('bar aarch64 2.0-1'), // aarch64 never got bar 3.0
    rpmPkg('qual aarch64 0.7.0-1'),
  ]),
  noarch: primary([
    rpmPkg('foo-devel noarch 0.9-1'),
    rpmPkg('foo-devel noarch 1.0-1'),
    rpmPkg('foo-devel noarch 1.1-1'),
    rpmPkg('qual noarch 0.5.0-1'), // became arch-specific later: the old noarch build goes
  ]),
  SRPMS: primary([
    rpmPkg('foo src 2.9.0-1'),
    rpmPkg('foo src 2.10.1-1'),
    rpmPkg('foo src 2.10.1-2'),
    rpmPkg('tool src 1.0-1'),
    rpmPkg('tool src 2.0-1'),
    rpmPkg('tool src 0.1-1'),
  ]),
};
const rpmPkgs = () => Object.entries(RPM).flatMap(([dir, xml]) => parsePrimary(xml, 'fedora/44', dir));

const PACKAGES = [
  debPkg('libfoo-dev', '0.9', 'all', { source: 'foo' }),
  debPkg('libfoo-dev', '1.0', 'all', { source: 'foo' }),
  debPkg('libfoo-dev', '1.1', 'all', { source: 'foo' }),
  debPkg('libproto0', '0.1.0-1', 'amd64'),
  debPkg('libproto0', '0.1.0-3', 'amd64'),
  debPkg('libproto0', '0.1.0-10', 'amd64'), // -10 is newer than -3: compared as numbers
  debPkg('libproto0', '0.1.0-5', 'arm64'),
  debPkg('libproto0', '0.1.0-3', 'arm64'),
  debPkg('plugins', '0.5.0', 'amd64'),
  debPkg('plugins', '0.5.1', 'amd64'),
  debPkg('plugins', '0.6.0', 'amd64'),
  debPkg('plugins-dev', '0.5.1', 'all', { source: 'plugins' }),
  debPkg('plugins-dev', '0.6.0', 'amd64', { source: 'plugins' }),
  debPkg('plugins-dev', '0.6.0', 'arm64', { source: 'plugins' }),
  debPkg('epochal', '9.0', 'amd64'),
  debPkg('epochal', '1:0.1', 'amd64'),
  debPkg('app', '2.0', 'amd64', { depends: 'libc6 (>= 2.34), libapp1 (= 2.0)' }),
  debPkg('libapp1', '2.0', 'amd64'),
  debPkg('libapp1', '3.0', 'amd64'),
  debPkg('rc', '1.0~rc1', 'amd64'),
  debPkg('rc', '1.0', 'amd64'),
].join('\n\n') + '\n';
const debPkgs = () => parsePackages(PACKAGES, 'debian/bookworm');

const kept = (r) => r.keep.map((k) => k.file).sort();
const deleted = (r) => r.delete.map((k) => k.file).sort();

// ------------------------------------------------------------------ version order

test('rpm version order', () => {
  const lt = [
    ['2.9.0', '2.10.1'], ['2.10.0', '2.10.1'], ['1.0~rc1', '1.0'], ['1.0', '1.0^git1'], ['1.0^git1', '1.0.1'],
    ['1.0a', '1.0.1'], ['5.1.freemixer1.fc44', '10.fc44'], ['9.fc44', '10.fc44'], ['1.01', '1.2'], ['a', '1'],
  ];
  for (const [a, b] of lt) {
    assert.equal(rpmvercmp(a, b), -1, `${a} < ${b}`);
    assert.equal(rpmvercmp(b, a), 1, `${b} > ${a}`);
  }
  assert.equal(rpmvercmp('1.0', '1_0'), 0);
  assert.equal(rpmvercmp('1.01', '1.1'), 0);
  assert.equal(rpmEvrCmp({ epoch: '1', ver: '0.1', rel: '1' }, { epoch: '0', ver: '9.0', rel: '1' }), 1);
  assert.equal(rpmEvrCmp({ epoch: '0', ver: '2.10.1', rel: '2' }, { epoch: '0', ver: '2.10.1', rel: '1' }), 1);
  assert.equal(rpmEvrCmp({ ver: '2.6.0', rel: '1.fc44' }, { ver: '2.6.0' }), 0, 'a dependency without a release ignores it');
});

test('debian version order', () => {
  const lt = [
    ['2.9.0', '2.10.1'], ['1.0~rc1', '1.0'], ['1.0', '1.0+b1'], ['1.0', '1.0a'], ['1.0', '1.0-1'], ['0.1.0-3', '0.1.0-5'],
    ['0.1.0-9', '0.1.0-10'], ['9.9', '1:0.1'], ['1.0~~', '1.0~'], ['1.9.10+20150825', '1.9.10+20150826'],
  ];
  for (const [a, b] of lt) {
    assert.equal(debVersionCmp(a, b), -1, `${a} < ${b}`);
    assert.equal(debVersionCmp(b, a), 1, `${b} > ${a}`);
  }
  assert.equal(debVersionCmp('0:1.0', '1.0'), 0);
  assert.equal(debVersionCmp('1.00', '1.0'), 0);
});

test('semver order', () => {
  const asc = ['0.0.0-stage', '0.3.0', '1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-beta', '1.0.0', '2.9.0', '2.10.0', '2.10.1'];
  assert.deepEqual([...asc].reverse().sort(semverCmp), asc);
});

// ------------------------------------------------------------------ keep.yml

test('keep.yml is read in its one shape', () => {
  assert.equal(keep.length, 4);
  assert.deepEqual(keep[0], { version: '1.0', rpm: ['foo-devel'], deb: ['libfoo-dev'], npm: ['@scope/foo'], reason: 'something pins foo 1.0' });
  const bad = [
    ['keep:\n  - version: 1\n    rpm: [a]\n', /no reason/],
    ['keep:\n  - version: 1\n    reason: r\n', /names no rpm/],
    ['keep:\n  - version: 1\n    rpm: a\n    reason: r\n', /inline list/],
    ['keep:\n  - version: 1\n    rmp: [a]\n    reason: r\n', /unknown key rmp/],
    ['keep:\n  - version: 1\n   rpm: [a]\n', /not "  - key/],
    ['  - version: 1\n', /expected "keep:"/],
    ['keep:\n  - version: 1\n    version: 2\n', /given twice/],
  ];
  for (const [text, err] of bad) assert.throws(() => parseKeep(text), err, text);
});

test('the repository keep.yml reads and names what the operator ruled', () => {
  const real = parseKeep(fs.readFileSync(path.join(here, '..', '..', '..', 'keep.yml'), 'utf8'));
  const flat = real.flatMap((e) => ['rpm', 'deb', 'npm'].flatMap((f) => (e[f] || []).map((n) => `${f} ${n} ${e.version}`))).sort();
  assert.deepEqual(flat, [
    'deb libomx-contract-dev 2.6.0', 'deb omx-plugins* 0.5.1', 'deb plugin-qualify 0.5.1',
    'npm @openmixer/omx-contract 2.6.0', 'npm @openmixer/plugin-qualify 0.5.1',
    'rpm omx-contract-devel 2.3.0', 'rpm omx-contract-devel 2.6.0', 'rpm omx-dsp-devel 0.14.0', 'rpm omx-dsp-devel 0.6.1',
    'rpm omx-plugins* 0.5.1', 'rpm plugin-qualify 0.5.1',
  ]);
  for (const e of real) assert.ok(e.reason.length > 10);
});

// ------------------------------------------------------------------ rpm selection

test('rpm: the newest build of the newest version, per architecture', () => {
  const r = selectRepo(rpmPkgs(), keep);
  const k = kept(r);
  assert.ok(k.includes('x86_64/foo-2.10.1-2.x86_64.rpm'));
  assert.ok(k.includes('aarch64/foo-2.10.1-2.aarch64.rpm'));
  for (const f of ['x86_64/foo-2.10.1-1.x86_64.rpm', 'aarch64/foo-2.10.1-1.aarch64.rpm', 'x86_64/foo-2.9.0-1.x86_64.rpm']) {
    assert.ok(deleted(r).includes(f), `${f} is a duplicate build or an old version`);
  }
  assert.ok(k.includes('x86_64/baz-0.1-1.x86_64.rpm'), 'epoch 1 beats a higher version of epoch 0');
  assert.ok(deleted(r).includes('x86_64/baz-9.0-1.x86_64.rpm'));
  assert.ok(k.includes('x86_64/mod-0.10.6.f14a230-10.fc44.x86_64.rpm'), '10 > 9 > 5.1');
  assert.ok(deleted(r).includes('x86_64/mod-0.10.6.f14a230-9.fc44.x86_64.rpm'));
  assert.ok(deleted(r).includes('x86_64/mod-0.10.6.f14a230-5.1.freemixer1.fc44.x86_64.rpm'));
});

test('rpm: an architecture without the newest version keeps its own newest, and says so', () => {
  const r = selectRepo(rpmPkgs(), keep);
  assert.ok(kept(r).includes('x86_64/bar-3.0-1.x86_64.rpm'));
  assert.ok(deleted(r).includes('x86_64/bar-2.0-1.x86_64.rpm'));
  assert.ok(kept(r).includes('aarch64/bar-2.0-1.aarch64.rpm'));
  assert.ok(r.notes.some((n) => /bar: aarch64 has no build of 3\.0/.test(n)));
});

test('rpm: an old noarch build of a package that is arch-specific now goes', () => {
  const r = selectRepo(rpmPkgs(), keep);
  assert.ok(deleted(r).includes('noarch/qual-0.5.0-1.noarch.rpm'));
  assert.ok(kept(r).includes('x86_64/qual-0.7.0-1.x86_64.rpm'));
});

test('rpm: a pinned version stays beside the newest; other versions go', () => {
  const r = selectRepo(rpmPkgs(), keep);
  const row = r.keep.find((k) => k.file === 'noarch/foo-devel-1.0-1.noarch.rpm');
  assert.match(row.reason, /pinned: something pins foo 1\.0/);
  assert.ok(kept(r).includes('noarch/foo-devel-1.1-1.noarch.rpm'));
  assert.ok(deleted(r).includes('noarch/foo-devel-0.9-1.noarch.rpm'));
});

test('rpm: what a kept package requires is kept, even an old version', () => {
  const r = selectRepo(rpmPkgs(), keep);
  assert.ok(kept(r).includes('x86_64/tool-1.0-1.x86_64.rpm'));
  const lib = r.keep.find((k) => k.file === 'x86_64/libtool-runtime-1.0-1.x86_64.rpm');
  assert.ok(lib, 'tool 1.0 requires libtool-runtime = 1.0-1');
  assert.match(lib.reason, /needed by tool 1\.0-1/);
  // without the pin, nothing needs it
  const bare = selectRepo(rpmPkgs(), keep.filter((e) => !(e.rpm || []).includes('tool')));
  assert.ok(deleted(bare).includes('x86_64/libtool-runtime-1.0-1.x86_64.rpm'));
});

test('rpm: a source stays when a kept binary was built from it', () => {
  const r = selectRepo(rpmPkgs(), keep);
  assert.ok(kept(r).includes('SRPMS/foo-2.10.1-2.src.rpm'));
  assert.ok(deleted(r).includes('SRPMS/foo-2.10.1-1.src.rpm'));
  assert.ok(deleted(r).includes('SRPMS/foo-2.9.0-1.src.rpm'));
  assert.ok(kept(r).includes('SRPMS/tool-1.0-1.src.rpm'));
  assert.ok(kept(r).includes('SRPMS/tool-2.0-1.src.rpm'));
  assert.ok(deleted(r).includes('SRPMS/tool-0.1-1.src.rpm'));
});

test('rpm: every package is either kept or deleted, once', () => {
  const all = rpmPkgs();
  const r = selectRepo(all, keep);
  assert.equal(r.keep.length + r.delete.length, all.length);
  assert.equal(new Set([...kept(r), ...deleted(r)]).size, all.length);
});

// openmixer#2216: mod-host 5.1.freemixer1 carries libmod-host-protocol.so.0 itself and declares no conflict
// with the split mod-host-protocol, so while it is served dnf takes it for the soname and mod-host-protocol
// 11.1.fmx for the name, and the two file-conflict on /usr/lib64/libmod-host-protocol.so.0.1.0
test('rpm: an old build that carries a soname a split package now provides goes, and the closure does not bring it back', () => {
  const SO = 'libmod-host-protocol.so.0()(64bit)';
  const V = '0.10.6.f14a230';
  const pkgs = parsePrimary(primary([
    rpmPkg(`mod-host x86_64 ${V}-5.1.freemixer1.fc44`, { provides: [SO] }),
    rpmPkg(`mod-host-protocol-devel x86_64 ${V}-5.1.freemixer1.fc44`, { source: `mod-host-${V}-5.1.freemixer1.fc44.src.rpm`, requires: [SO] }),
    rpmPkg(`mod-host x86_64 ${V}-11.1.fmx.fc44`, { requires: ['mod-host-protocol'] }),
    rpmPkg(`mod-host-protocol x86_64 ${V}-11.1.fmx.fc44`, { source: `mod-host-${V}-11.1.fmx.fc44.src.rpm`, provides: [SO] }),
    rpmPkg(`mod-host-protocol-devel x86_64 ${V}-11.1.fmx.fc44`, { source: `mod-host-${V}-11.1.fmx.fc44.src.rpm`, requires: [SO] }),
    rpmPkg('openmixer-server x86_64 0.2.0-1.fc44', { requires: [SO, 'mod-host-protocol'] }),
  ]), 'fedora/44', 'x86_64');
  const r = selectRepo(pkgs, []);
  assert.deepEqual(deleted(r), [
    `x86_64/mod-host-${V}-5.1.freemixer1.fc44.x86_64.rpm`,
    `x86_64/mod-host-protocol-devel-${V}-5.1.freemixer1.fc44.x86_64.rpm`,
  ]);
  const soProviders = r.keep.filter((k) => pkgs.find((p) => p.file === k.file).provides.some((pr) => pr.name === SO));
  assert.deepEqual(soProviders.map((k) => k.file), [`x86_64/mod-host-protocol-${V}-11.1.fmx.fc44.x86_64.rpm`]);
});

// ------------------------------------------------------------------ deb selection

test('deb: duplicate builds go, the highest Debian revision stays', () => {
  const r = selectRepo(debPkgs(), keep);
  assert.ok(kept(r).includes('amd64/libproto0_0.1.0-10_amd64.deb'));
  assert.ok(kept(r).includes('arm64/libproto0_0.1.0-5_arm64.deb'), 'arm64 keeps its own newest build');
  for (const f of ['amd64/libproto0_0.1.0-1_amd64.deb', 'amd64/libproto0_0.1.0-3_amd64.deb', 'arm64/libproto0_0.1.0-3_arm64.deb']) {
    assert.ok(deleted(r).includes(f), f);
  }
});

test('deb: version order, epochs, tildes and globbed pins', () => {
  const r = selectRepo(debPkgs(), keep);
  assert.ok(kept(r).includes('amd64/epochal_0.1_amd64.deb'));
  assert.ok(deleted(r).includes('amd64/epochal_9.0_amd64.deb'));
  assert.ok(kept(r).includes('amd64/rc_1.0_amd64.deb'));
  assert.ok(deleted(r).includes('amd64/rc_1.0~rc1_amd64.deb'));
  assert.ok(kept(r).includes('amd64/plugins_0.6.0_amd64.deb'));
  assert.ok(kept(r).includes('amd64/plugins_0.5.1_amd64.deb'), 'plugins* pins 0.5.1');
  assert.ok(deleted(r).includes('amd64/plugins_0.5.0_amd64.deb'));
  assert.ok(kept(r).includes('all/plugins-dev_0.5.1_all.deb'), 'plugins* matches plugins-dev too');
  assert.ok(kept(r).includes('all/libfoo-dev_1.0_all.deb'));
  assert.ok(kept(r).includes('all/libfoo-dev_1.1_all.deb'));
  assert.ok(deleted(r).includes('all/libfoo-dev_0.9_all.deb'));
});

test('deb: an exact dependency of a kept package is kept', () => {
  const r = selectRepo(debPkgs(), keep);
  assert.ok(kept(r).includes('amd64/libapp1_2.0_amd64.deb'), 'app 2.0 depends on libapp1 (= 2.0)');
  assert.ok(kept(r).includes('amd64/libapp1_3.0_amd64.deb'));
});

test('a pin that matches nothing is reported', () => {
  const w = unusedPins(keep, [...rpmPkgs(), ...debPkgs()]);
  assert.deepEqual(w, ['rpm nothing-has-this 9.9.9: no such package in any repository']);
});

test('the report folds architectures and names the reason', () => {
  const text = report([selectRepo(rpmPkgs(), keep)]);
  assert.match(text, /^rpm fedora\/44 foo$/m);
  assert.match(text, /^ {2}keep {3}2\.10\.1-2 +aarch64,x86_64 +newest$/m);
  assert.match(text, /^ {2}delete 2\.10\.1-1 +aarch64,x86_64\s*$/m);
  assert.match(text, /^rpm fedora\/44 foo \(source\)$/m);
});

// ------------------------------------------------------------------ npm

test('npm: newest and pins stay; the rest is deprecated, never unpublished', () => {
  const versions = { '0.0.0-stage': {}, '0.9.0': { deprecated: 'old' }, '1.0.0': {}, '2.9.0': {}, '2.10.0': {}, '2.10.1': {} };
  const packument = {
    versions: Object.fromEntries(Object.entries(versions).map(([k, x]) => [k, { version: k, ...x }])),
    'dist-tags': { latest: '2.10.1' },
  };
  const r = selectNpm('@scope/foo', packument, keep);
  assert.deepEqual(r.keep.map((k) => k.version), ['2.10.1'], 'the pin 1.0 is not 1.0.0');
  assert.deepEqual(r.deprecate.map((k) => k.version), ['0.0.0-stage', '1.0.0', '2.9.0', '2.10.0']);
  assert.deepEqual(r.already.map((k) => k.version), ['0.9.0']);
  assert.equal(r.unpublish, undefined, 'stage 1 unpublishes nothing');
  // a pin that names an existing version keeps it
  const pinned = selectNpm('@scope/foo', packument, parseKeep('keep:\n  - version: 1.0.0\n    npm: ["@scope/foo"]\n    reason: pinned by x\n'));
  assert.deepEqual(pinned.keep.map((k) => k.version), ['1.0.0', '2.10.1']);
  // a latest tag that is not the highest version is kept too
  const tagged = selectNpm('@scope/foo', { ...packument, 'dist-tags': { latest: '2.10.0' } }, []);
  assert.deepEqual(tagged.keep.map((k) => k.version), ['2.10.0', '2.10.1']);
});

// ------------------------------------------------------------------ the CLI over a channel tree

function writeTree(root, rpm, packages, extraFiles = []) {
  for (const [dir, xml] of Object.entries(rpm)) {
    const d = path.join(root, 'rpm/fedora/44', dir);
    fs.mkdirSync(path.join(d, 'repodata'), { recursive: true });
    fs.writeFileSync(path.join(d, 'repodata', 'primary.xml'), xml);
    fs.writeFileSync(path.join(d, 'repodata', 'repomd.xml'),
      '<repomd><data type="primary"><location href="repodata/primary.xml"/></data></repomd>\n');
    for (const p of parsePrimary(xml, 'fedora/44', dir)) fs.writeFileSync(path.join(root, 'rpm/fedora/44', p.file), '');
  }
  const s = path.join(root, 'deb/debian/bookworm');
  fs.mkdirSync(s, { recursive: true });
  fs.writeFileSync(path.join(s, 'Packages'), packages);
  for (const p of parsePackages(packages, 'debian/bookworm')) {
    fs.mkdirSync(path.join(s, p.arch), { recursive: true });
    fs.writeFileSync(path.join(s, p.file), '');
  }
  for (const f of extraFiles) fs.writeFileSync(path.join(root, f), '');
}

test('cli: a tree is planned, unindexed files go, and the pruned tree checks clean', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-'));
  const keepFile = path.join(tmp, 'keep.yml');
  fs.writeFileSync(keepFile, KEEP);
  const before = path.join(tmp, 'before');
  writeTree(before, RPM, PACKAGES, ['rpm/fedora/44/x86_64/stray-1.0-1.x86_64.rpm']);
  const planFile = path.join(tmp, 'plan.json');
  const run = (tree, ...more) => spawnSync(process.execPath, [select, '--keep', keepFile, '--tree', tree, ...more], { encoding: 'utf8' });

  const r = run(before, '--json', planFile, '--expect-clean');
  assert.equal(r.status, 1, 'an unpruned tree is not clean');
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  assert.deepEqual(plan.orphans, ['rpm/fedora/44/x86_64/stray-1.0-1.x86_64.rpm']);
  assert.ok(plan.keep.some((k) => k.path === 'rpm/fedora/44/x86_64/foo-2.10.1-2.x86_64.rpm'));
  assert.ok(plan.delete.some((k) => k.path === 'deb/debian/bookworm/amd64/libproto0_0.1.0-3_amd64.deb'));
  assert.match(r.stdout, /summary:\n {2}rpm: keep \d+, delete \d+\n {2}deb: keep \d+, delete \d+\n {2}files no index lists: 1/);
  assert.deepEqual(plan.warnings, ['rpm nothing-has-this 9.9.9: no such package in any repository']);

  // the pruned tree: only what the plan keeps, with indexes that list only that
  const keptPaths = new Set(plan.keep.map((k) => k.path));
  const after = path.join(tmp, 'after');
  const rpmAfter = Object.fromEntries(Object.entries(RPM).map(([dir, xml]) => [dir, primary(
    [...xml.matchAll(/<package type="rpm">[\s\S]*?<\/package>/g)].map(([b]) => b)
      .filter((b) => keptPaths.has(`rpm/fedora/44/${dir}/${b.match(/href="([^"]*)"/)[1]}`)),
  )]));
  const debAfter = PACKAGES.split('\n\n').filter((s) => keptPaths.has(`deb/debian/bookworm/${s.match(/Filename: \.\/(\S+)/)[1]}`)).join('\n\n') + '\n';
  writeTree(after, rpmAfter, debAfter);
  const clean = run(after, '--expect-clean');
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  assert.match(clean.stdout, /rpm: keep \d+, delete 0/);
});

test('expect: a deb installs with the kept packages of its source at its version', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-'));
  const planFile = path.join(tmp, 'plan.json');
  fs.writeFileSync(planFile, JSON.stringify({ keep: selectRepo(debPkgs(), keep).keep }));
  const run = (...a) => spawnSync(process.execPath, [path.join(here, '..', 'expect.mjs'), '--plan', planFile, ...a], { encoding: 'utf8' });
  const out = run('--format', 'deb', '--repo', 'debian/bookworm', '--arch', 'amd64').stdout.split('\n');
  assert.ok(out.includes('install plugins=0.5.1,plugins-dev=0.5.1'), out.join('\n'));
  assert.ok(out.includes('install plugins=0.6.0,plugins-dev=0.6.0'));
  assert.ok(out.includes('newest plugins 0.6.0'));
  assert.ok(out.includes('newest libproto0 0.1.0-10'));
  assert.ok(!out.some((l) => l.includes('arm64')));
});

test('cli: a broken keep.yml stops the run', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-'));
  fs.writeFileSync(path.join(tmp, 'keep.yml'), 'keep:\n  - version: 1\n');
  const r = spawnSync(process.execPath, [select, '--keep', path.join(tmp, 'keep.yml'), '--tree', tmp], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no reason/);
});

// ------------------------------------------------------------------ what openmixer pins

test('pins: pins.txt lines with a version, bare or as a tag; lines without one pin nothing', () => {
  assert.deepEqual(pinsTxt([
    '# comment',
    'omx-dsp 0.6.1',
    'omx-dsp-source https://github.com/FreeMixer/omx-dsp.git dacc2f9c',
    'omx-clap-host 0.4.2 https://github.com/FreeMixer/omx-clap-core.git 09f9d6c1',
    'mod-host https://github.com/linuxnow/mod-host.git - 5739eaeb',
    'omx-contract https://github.com/FreeMixer/omx-contract.git v2.5.0 1beee741',
    'mod-host-protocol 0.1.0 0.10.6.f14a230-11 https://example.org/builds/mod-host-0.10.6.f14a230-11.fc44.src.rpm b863fb13',
  ].join('\n')), [
    { name: 'omx-dsp', version: '0.6.1' },
    { name: 'omx-clap-host', version: '0.4.2' },
    { name: 'omx-contract', version: '2.5.0' },
    { name: 'mod-host-protocol', version: '0.1.0' },
    { name: 'mod-host', version: '0.10.6.f14a230', release: '11' },
  ]);
});

test('pins: exact @openmixer specifiers of a package.json, and what the lock resolved', () => {
  assert.deepEqual(packageJson(JSON.stringify({
    dependencies: { '@openmixer/omx-contract': '2.5.0', '@openmixer/core': 'workspace:*', left: '1.0.0' },
    devDependencies: { '@openmixer/plugin-qualify': '=0.5.1', '@openmixer/ranged': '^1.2.0' },
  })), [{ name: 'omx-contract', version: '2.5.0' }, { name: 'plugin-qualify', version: '0.5.1' }]);
  assert.deepEqual(pnpmLock([
    "  '@openmixer/omx-contract@2.5.0':",
    '    resolution: {integrity: sha512-x}',
    "  '@openmixer/ranged@1.2.3(typescript@5.6.0)':",
    "  '@openmixer/pre@1.0.0-rc.1':",
  ].join('\n')), [{ name: 'omx-contract', version: '2.5.0' }, { name: 'ranged', version: '1.2.3' }]);
});

test('pins: one keep entry per name and version, for the source in rpm and deb and on npm', () => {
  const k = toKeep([
    { ref: 'origin/main', file: '.github/pins.txt', name: 'omx-contract', version: '2.5.0' },
    { ref: 'origin/main', file: 'pnpm-lock.yaml', name: 'omx-contract', version: '2.5.0' },
    { ref: 'origin/integration/x', file: '.github/pins.txt', name: 'omx-contract', version: '2.6.0' },
  ]);
  assert.deepEqual(k.map((e) => [e.version, e.source, e.npm]), [
    ['2.5.0', ['omx-contract'], ['@openmixer/omx-contract']],
    ['2.6.0', ['omx-contract'], ['@openmixer/omx-contract']],
  ]);
  assert.match(k[0].reason, /origin\/main:\.github\/pins\.txt, origin\/main:pnpm-lock\.yaml/);
});

// a contract library at three versions: the rpm and the deb carry other names than the source
const CONTRACT_RPM = primary(['2.5.0', '2.6.0', '2.7.0'].map((v) => rpmPkg(`omx-contract-devel noarch ${v}-1.fc44`, { source: `omx-contract-${v}-1.fc44.src.rpm` })));
const CONTRACT_DEB = ['2.5.0', '2.6.0', '2.7.0'].map((v) => debPkg('libomx-contract-dev', `${v}-1`, 'all', { source: 'omx-contract' })).join('\n\n') + '\n';

test('pins: a source pin keeps that version of every rpm and deb built from it', () => {
  const pins = toKeep([{ ref: 'origin/main', file: '.github/pins.txt', name: 'omx-contract', version: '2.5.0' }]);
  const rpm = selectRepo(parsePrimary(CONTRACT_RPM, 'fedora/44', 'noarch'), pins);
  assert.deepEqual(kept(rpm), ['noarch/omx-contract-devel-2.5.0-1.fc44.noarch.rpm', 'noarch/omx-contract-devel-2.7.0-1.fc44.noarch.rpm']);
  const deb = selectRepo(parsePackages(CONTRACT_DEB, 'debian/bookworm'), pins);
  assert.deepEqual(kept(deb), ['all/libomx-contract-dev_2.5.0-1_all.deb', 'all/libomx-contract-dev_2.7.0-1_all.deb']);
  assert.deepEqual(unusedPins(pins, [...parsePrimary(CONTRACT_RPM, 'fedora/44', 'noarch')]), []);
  assert.deepEqual(unusedPins(toKeep([{ ref: 'r', file: 'f', name: 'omx-contract', version: '9.9.9' }]), parsePackages(CONTRACT_DEB, 'debian/bookworm')),
    ['source omx-contract 9.9.9: no deb build of it']);
  assert.deepEqual(unusedPins(toKeep([{ ref: 'r', file: 'f', name: 'nothing-builds-this', version: '1.0.0' }]), parsePackages(CONTRACT_DEB, 'debian/bookworm')),
    ['source nothing-builds-this 1.0.0: no such package in any repository']);
});

test('pins: a plan that deletes every build of a pinned version names it', () => {
  const pkgs = parsePackages(CONTRACT_DEB, 'debian/bookworm');
  const pins = toKeep([{ ref: 'origin/main', file: '.github/pins.txt', name: 'omx-contract', version: '2.5.0' }]);
  const keptPaths = new Set(['deb/debian/bookworm/all/libomx-contract-dev_2.7.0-1_all.deb']);
  assert.deepEqual(pinsLost(pins, pkgs, keptPaths).map((l) => l.split(':')[0]), ['deb debian/bookworm libomx-contract-dev.all 2.5.0']);
  keptPaths.add('deb/debian/bookworm/all/libomx-contract-dev_2.5.0-1_all.deb');
  assert.deepEqual(pinsLost(pins, pkgs, keptPaths), []);
});

// an openmixer repository whose main pins omx-contract 2.5.0 three ways and whose integration branch 2.6.0
function openmixerRepo(root) {
  const git = (...a) => spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' });
  fs.mkdirSync(path.join(root, '.github'), { recursive: true });
  fs.mkdirSync(path.join(root, 'packages/core'), { recursive: true });
  git('init', '-q', '-b', 'main');
  const commit = (v, ref) => {
    fs.writeFileSync(path.join(root, '.github/pins.txt'), `omx-contract https://github.com/FreeMixer/omx-contract.git v${v} 1beee741\n`);
    fs.writeFileSync(path.join(root, 'packages/core/package.json'), JSON.stringify({ dependencies: { '@openmixer/omx-contract': v } }));
    fs.writeFileSync(path.join(root, 'pnpm-lock.yaml'), `packages:\n  '@openmixer/omx-contract@${v}':\n`);
    git('add', '-A');
    git('-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', v);
    git('update-ref', ref, 'HEAD');
  };
  commit('2.5.0', 'refs/remotes/origin/main');
  commit('2.6.0', 'refs/remotes/origin/integration/waves');
}

test('cli: what openmixer main pins survives the plan in rpm, deb and npm', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-'));
  const om = path.join(tmp, 'openmixer');
  openmixerRepo(om);
  const pinsFile = path.join(tmp, 'pins.json');
  const p = spawnSync(process.execPath, [path.join(here, '..', 'pins.mjs'), '--repo', om, '--json', pinsFile], { encoding: 'utf8' });
  assert.equal(p.status, 0, p.stderr);
  assert.match(p.stdout, /refs read: origin\/integration\/waves, origin\/main/);
  const pins = JSON.parse(fs.readFileSync(pinsFile, 'utf8'));
  assert.deepEqual(pins.map((e) => e.version), ['2.5.0', '2.6.0']);

  const tree = path.join(tmp, 'tree');
  writeTree(tree, { noarch: CONTRACT_RPM }, CONTRACT_DEB);
  fs.writeFileSync(path.join(tmp, 'keep.yml'), 'keep:\n');
  const planFile = path.join(tmp, 'plan.json');
  const r = spawnSync(process.execPath, [select, '--keep', path.join(tmp, 'keep.yml'), '--pins', pinsFile, '--tree', tree, '--json', planFile], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  const keptOf = (f) => plan.keep.filter((k) => k.format === f).map((k) => k.version).sort();
  assert.deepEqual(keptOf('rpm'), ['2.5.0-1.fc44', '2.6.0-1.fc44', '2.7.0-1.fc44']);
  assert.deepEqual(keptOf('deb'), ['2.5.0-1', '2.6.0-1', '2.7.0-1']);
  assert.deepEqual(plan.lost, []);

  const keepAll = [...parseKeep('keep:\n'), ...pins];
  const npm = selectNpm('@openmixer/omx-contract', { versions: { '2.4.0': {}, '2.5.0': {}, '2.6.0': {}, '2.7.0': {} } }, keepAll);
  assert.deepEqual(npm.keep.map((k) => k.version), ['2.5.0', '2.6.0', '2.7.0']);
  assert.deepEqual(npm.deprecate.map((k) => k.version), ['2.4.0']);
});

test('cli: no origin/main to read is an error, not an empty pin list', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-'));
  spawnSync('git', ['init', '-q', tmp]);
  const p = spawnSync(process.execPath, [path.join(here, '..', 'pins.mjs'), '--repo', tmp], { encoding: 'utf8' });
  assert.equal(p.status, 2);
  assert.match(p.stderr, /no origin\/main/);
});

test('pins: a pinned release keeps that build, even when a newer build of the version exists', () => {
  const rpm = primary(['9', '11', '12'].map((r) => rpmPkg(`mod-host-protocol x86_64 0.10.6.f14a230-${r}.fc44`, { source: `mod-host-0.10.6.f14a230-${r}.fc44.src.rpm` })));
  const pins = toKeep(pinsTxt('mod-host-protocol 0.1.0 0.10.6.f14a230-11 https://example.org/mod-host-0.10.6.f14a230-11.fc44.src.rpm b8\n')
    .map((p) => ({ ref: 'origin/main', file: '.github/pins.txt', ...p })));
  const pkgs = parsePrimary(rpm, 'fedora/44', 'x86_64');
  const r = selectRepo(pkgs, pins);
  assert.deepEqual(kept(r), ['x86_64/mod-host-protocol-0.10.6.f14a230-11.fc44.x86_64.rpm', 'x86_64/mod-host-protocol-0.10.6.f14a230-12.fc44.x86_64.rpm']);
  for (const row of r.keep) row.path = `rpm/fedora/44/${row.file}`;
  assert.deepEqual(pinsLost(pins, pkgs, new Set(r.keep.map((k) => k.path))), []);
  assert.deepEqual(pinsLost(pins, pkgs, new Set(['rpm/fedora/44/x86_64/mod-host-protocol-0.10.6.f14a230-12.fc44.x86_64.rpm'])).length, 1,
    'the newest build of the version does not stand in for the pinned one');
  // two pinned builds of one version are two pins: keeping one does not answer for the other
  const both = toKeep([{ ref: 'origin/main', file: 'f', name: 'mod-host', version: '0.10.6.f14a230', release: '11' },
    { ref: 'origin/integration/x', file: 'f', name: 'mod-host', version: '0.10.6.f14a230', release: '12' }]);
  const lost = pinsLost(both, pkgs, new Set(['rpm/fedora/44/x86_64/mod-host-protocol-0.10.6.f14a230-12.fc44.x86_64.rpm']));
  assert.deepEqual(lost.map((l) => l.split(':')[0]), ['rpm fedora/44 mod-host-protocol.x86_64 0.10.6.f14a230-11']);
});

test('pins: a source one format builds without the pinned version is named for that format', () => {
  const pins = toKeep([{ ref: 'origin/main', file: '.github/pins.txt', name: 'omx-contract', version: '2.5.0' }]);
  const rpmWithout = parsePrimary(primary([rpmPkg('omx-contract-devel noarch 2.7.0-1.fc44', { source: 'omx-contract-2.7.0-1.fc44.src.rpm' })]), 'fedora/44', 'noarch');
  assert.deepEqual(unusedPins(pins, [...rpmWithout, ...parsePackages(CONTRACT_DEB, 'debian/bookworm')]), ['source omx-contract 2.5.0: no rpm build of it']);
  // a source only one format builds at all is not a gap in the other
  assert.deepEqual(unusedPins(pins, parsePackages(CONTRACT_DEB, 'debian/bookworm')), []);
});

test('cli: a plan that would delete a pinned version fails the run and names it', () => {
  // the selection is broken on purpose in a copy, so the gate in select.mjs is what must catch it
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-'));
  const copy = path.join(tmp, 'prune');
  fs.cpSync(path.join(here, '..'), copy, { recursive: true });
  const lib = path.join(copy, 'prune.mjs');
  const src = fs.readFileSync(lib, 'utf8');
  const broken = src.replace('for (const pin of pinsFor(keep, F.id, name, sourceName(builds[0])))', 'for (const pin of [])');
  assert.notEqual(broken, src, 'the sabotage applies');
  fs.writeFileSync(lib, broken);
  const tree = path.join(tmp, 'tree');
  writeTree(tree, { noarch: CONTRACT_RPM }, CONTRACT_DEB);
  fs.writeFileSync(path.join(tmp, 'keep.yml'), 'keep:\n');
  const pinsFile = path.join(tmp, 'pins.json');
  fs.writeFileSync(pinsFile, JSON.stringify(toKeep([{ ref: 'origin/main', file: '.github/pins.txt', name: 'omx-contract', version: '2.5.0' }])));
  const r = spawnSync(process.execPath, [path.join(copy, 'select.mjs'), '--keep', path.join(tmp, 'keep.yml'), '--pins', pinsFile, '--tree', tree], { encoding: 'utf8' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /the plan deletes every build of a pinned version:\n/);
  assert.match(r.stderr, /\n {2}rpm fedora\/44 omx-contract-devel\.noarch 2\.5\.0: openmixer pins/);
  assert.match(r.stderr, /\n {2}deb debian\/bookworm libomx-contract-dev\.all 2\.5\.0: openmixer pins/);
});
