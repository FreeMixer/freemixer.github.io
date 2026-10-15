#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Pau Aliagas <linuxnow@gmail.com>
//
// What the check after a prune asks the package manager, from the plan select.mjs wrote:
//
//   expect.mjs --plan plan.json --format rpm --repo fedora/44 --arch x86_64
//   expect.mjs --plan plan.json --format deb --repo debian/bookworm --arch amd64
//
// prints one line per kept package the architecture installs ("install <spec>[,<spec>...]", as dnf or apt
// takes them) and one per package name with the version that must resolve as the newest ("newest <name> <version>").
import fs from 'node:fs';
import { rpmEvrCmp, debVersionCmp } from './prune.mjs';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); if (i < 0) throw new Error(`${k} is required`); return args[i + 1]; };
const plan = JSON.parse(fs.readFileSync(opt('--plan'), 'utf8'));
const format = opt('--format'), repo = opt('--repo'), arch = opt('--arch');
const indep = format === 'rpm' ? 'noarch' : 'all';

const rows = plan.keep.filter((k) => k.format === format && k.repo === repo && (k.arch === arch || k.arch === indep));
const evr = (v) => { const m = v.match(/^(?:(\d+):)?(.*)-([^-]*)$/); return { epoch: m[1] || '0', ver: m[2], rel: m[3] }; };
const cmp = format === 'rpm' ? (a, b) => rpmEvrCmp(evr(a), evr(b)) : debVersionCmp;

// dnf steps a dependency back to the version an exact Requires names; apt does not, so a deb is installed
// together with the kept packages of its source at the same version (omx-plugins=0.5.1 with its -clap and
// -lv2 0.5.1), comma separated
const spec = (r) => (format === 'rpm' ? `${r.name}-${r.version.replace(/^\d+:/, '')}.${r.arch}` : `${r.name}=${r.version}`);
const newest = new Map();
for (const r of rows) {
  const with_ = format === 'deb' ? rows.filter((o) => o !== r && o.source === r.source && o.version === r.version) : [];
  console.log(`install ${[r, ...with_].map(spec).join(',')}`);
  if (!newest.has(r.name) || cmp(r.version, newest.get(r.name)) > 0) newest.set(r.name, r.version);
}
for (const [name, version] of [...newest].sort()) console.log(`newest ${name} ${version}`);
