// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Pau Aliagas <linuxnow@gmail.com>
//
// What the prune keeps and what it deletes, decided from the indexes alone: the dnf primary.xml of every
// rpm/fedora/<release>/<dir>/ and the apt Packages file of every deb/debian/<suite>/. No I/O here; the CLI
// (select.mjs) and the tests feed it text.
//
// The rule, per repository (one Fedora release, one Debian suite) and per binary package name:
//   - the newest version is kept, and of that version only the newest build (an older Release or Debian
//     revision of the same version is a duplicate build and goes);
//   - a pinned version is kept the same way: one keep.yml names for that name and format, or one that
//     openmixer's main or integration branches pin for its source package (pins.mjs derives those);
//   - a version is kept per architecture: x86_64 and aarch64 (amd64 and arm64) each get the best build of
//     the version that the architecture can install, its own or noarch/all. An architecture that has no
//     build of the newest version keeps its own newest build, and the plan says so;
//   - whatever a kept package requires and only an otherwise deleted package provides is kept too, so
//     every kept package still installs;
//   - a source RPM is kept when a kept binary names it as its source, or when it is the newest of its name.
// Everything else goes.

// ---------------------------------------------------------------- version comparison

// rpmvercmp, as rpm implements it: alternating runs of digits and letters, separators ignored, ~ sorts
// before anything (even the end), ^ after the end but before anything else.
export function rpmvercmp(a, b) {
  if (a === b) return 0;
  let i = 0, j = 0;
  const isAlnum = (c) => /[A-Za-z0-9]/.test(c);
  for (;;) {
    while (i < a.length && !isAlnum(a[i]) && a[i] !== '~' && a[i] !== '^') i++;
    while (j < b.length && !isAlnum(b[j]) && b[j] !== '~' && b[j] !== '^') j++;
    const ca = a[i], cb = b[j];
    if (ca === '~' || cb === '~') {
      if (ca !== '~') return 1;
      if (cb !== '~') return -1;
      i++; j++; continue;
    }
    if (ca === '^' || cb === '^') {
      if (i >= a.length) return -1;
      if (j >= b.length) return 1;
      if (ca !== '^') return 1;
      if (cb !== '^') return -1;
      i++; j++; continue;
    }
    if (i >= a.length || j >= b.length) break;
    const digits = /[0-9]/.test(a[i]);
    const re = digits ? /[0-9]/ : /[A-Za-z]/;
    let ei = i; while (ei < a.length && re.test(a[ei])) ei++;
    let ej = j; while (ej < b.length && re.test(b[ej])) ej++;
    let sa = a.slice(i, ei), sb = b.slice(j, ej);
    if (sb.length === 0) return digits ? 1 : -1; // a number is newer than letters
    if (digits) {
      sa = sa.replace(/^0+/, ''); sb = sb.replace(/^0+/, '');
      if (sa.length !== sb.length) return sa.length > sb.length ? 1 : -1;
    }
    if (sa !== sb) return sa > sb ? 1 : -1;
    i = ei; j = ej;
  }
  if (i >= a.length && j >= b.length) return 0;
  return i >= a.length ? -1 : 1;
}

const num = (s) => (s === undefined || s === null || s === '' ? 0 : Number(s));

// epoch, version, then release; a side without a release (a dependency "= 2.6.0") ignores it
export function rpmEvrCmp(x, y) {
  const e = num(x.epoch) - num(y.epoch);
  if (e) return e > 0 ? 1 : -1;
  const v = rpmvercmp(x.ver, y.ver);
  if (v || !x.rel || !y.rel) return v;
  return rpmvercmp(x.rel, y.rel);
}

// dpkg's verrevcmp: ~ before everything, then the end, then letters, then everything else
function dpkgOrder(c) {
  if (c === undefined) return 0;
  if (c === '~') return -1;
  if (/[0-9]/.test(c)) return 0;
  if (/[A-Za-z]/.test(c)) return c.charCodeAt(0);
  return c.charCodeAt(0) + 256;
}
function verrevcmp(a, b) {
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    let first = 0;
    while ((i < a.length && !/[0-9]/.test(a[i])) || (j < b.length && !/[0-9]/.test(b[j]))) {
      const ac = dpkgOrder(a[i]), bc = dpkgOrder(b[j]);
      if (ac !== bc) return ac > bc ? 1 : -1;
      i++; j++;
    }
    while (a[i] === '0') i++;
    while (b[j] === '0') j++;
    while (i < a.length && /[0-9]/.test(a[i]) && j < b.length && /[0-9]/.test(b[j])) {
      if (!first) first = a.charCodeAt(i) - b.charCodeAt(j);
      i++; j++;
    }
    if (i < a.length && /[0-9]/.test(a[i])) return 1;
    if (j < b.length && /[0-9]/.test(b[j])) return -1;
    if (first) return first > 0 ? 1 : -1;
  }
  return 0;
}

export function parseDebVersion(v) {
  let epoch = 0, rest = v;
  const colon = v.indexOf(':');
  if (colon >= 0) { epoch = Number(v.slice(0, colon)); rest = v.slice(colon + 1); }
  const dash = rest.lastIndexOf('-');
  return dash >= 0
    ? { epoch, upstream: rest.slice(0, dash), revision: rest.slice(dash + 1) }
    : { epoch, upstream: rest, revision: '' };
}

export function debVersionCmp(a, b) {
  const x = parseDebVersion(a), y = parseDebVersion(b);
  if (x.epoch !== y.epoch) return x.epoch > y.epoch ? 1 : -1;
  const u = verrevcmp(x.upstream, y.upstream);
  if (u) return u > 0 ? 1 : -1;
  const r = verrevcmp(x.revision, y.revision);
  return r ? (r > 0 ? 1 : -1) : 0;
}

// semver 2.0 precedence, for npm
export function semverCmp(a, b) {
  const split = (v) => {
    const [core, pre] = v.split('+')[0].split(/-(.*)/s);
    return { core: core.split('.').map(Number), pre: pre ? pre.split('.') : [] };
  };
  const x = split(a), y = split(b);
  for (let k = 0; k < 3; k++) if (x.core[k] !== y.core[k]) return x.core[k] > y.core[k] ? 1 : -1;
  if (!x.pre.length || !y.pre.length) return x.pre.length === y.pre.length ? 0 : (x.pre.length ? -1 : 1);
  for (let k = 0; k < Math.max(x.pre.length, y.pre.length); k++) {
    const p = x.pre[k], q = y.pre[k];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    const pn = /^\d+$/.test(p), qn = /^\d+$/.test(q);
    if (pn && qn) { if (Number(p) !== Number(q)) return Number(p) > Number(q) ? 1 : -1; }
    else if (pn !== qn) return pn ? -1 : 1;
    else if (p !== q) return p > q ? 1 : -1;
  }
  return 0;
}

// ---------------------------------------------------------------- keep.yml

// keep.yml is a fixed shape, read by this small reader so the prune needs nothing installed:
//   keep:
//     - version: 2.6.0
//       rpm: [name, glob*]        any of rpm, deb, npm, source; at least one
//       deb: [name]
//       npm: ["@scope/name"]
//       source: [name]            every rpm and deb built from that source package
//       release: 11               optional: that build of the version (rpm Release or Debian revision, before
//                                 any .dist suffix), not the newest build of it
//       reason: why it stays
// Anything else is refused rather than guessed at.
export function parseKeep(text) {
  const entries = [];
  let cur = null, seenRoot = false;
  const scalar = (s) => {
    s = s.trim();
    if (/^".*"$/.test(s) || /^'.*'$/.test(s)) return s.slice(1, -1);
    return s;
  };
  text.split('\n').forEach((raw, n) => {
    const line = raw.replace(/\s+#.*$/, '').replace(/^#.*$/, '');
    if (!line.trim()) return;
    const where = `keep.yml:${n + 1}`;
    if (/^keep:\s*$/.test(line)) { if (seenRoot) throw new Error(`${where}: a second keep:`); seenRoot = true; return; }
    if (!seenRoot) throw new Error(`${where}: expected "keep:" first`);
    const m = line.match(/^ {2}(- | {2})([a-z]+):\s*(.*)$/);
    if (!m) throw new Error(`${where}: not "  - key: value" or "    key: value": ${raw}`);
    if (m[1] === '- ') { cur = {}; entries.push(cur); }
    else if (!cur) throw new Error(`${where}: a key outside an entry`);
    const [, , key, value] = m;
    if (key in cur) throw new Error(`${where}: ${key} given twice`);
    if (key === 'version' || key === 'release' || key === 'reason') cur[key] = scalar(value);
    else if (key === 'rpm' || key === 'deb' || key === 'npm' || key === 'source') {
      const l = value.match(/^\[(.*)\]$/);
      if (!l) throw new Error(`${where}: ${key} must be an inline list [a, b]`);
      cur[key] = l[1].split(',').map(scalar).filter(Boolean);
    } else throw new Error(`${where}: unknown key ${key}`);
  });
  if (!seenRoot) throw new Error('keep.yml: no "keep:"');
  entries.forEach((e, k) => {
    const what = `keep.yml entry ${k + 1}`;
    if (!e.version) throw new Error(`${what}: no version`);
    if (!e.reason) throw new Error(`${what}: no reason`);
    if (!e.rpm && !e.deb && !e.npm && !e.source) throw new Error(`${what}: names no rpm, deb, npm or source package`);
  });
  return entries;
}

const globRe = (g) => new RegExp('^' + g.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');

// the pins of keep.yml that apply to one package name of one format
// source: the name of the source package a binary was built from; an entry's `source` list pins every binary
// built from those sources, in rpm and deb alike
export function pinsFor(keep, format, name, source) {
  return keep.filter((e) => (e[format] || []).some((g) => globRe(g).test(name))
    || (format !== 'npm' && source && (e.source || []).includes(source)));
}

// the name of the source package of a binary: the Source of a deb, the name in the source RPM's file name
export const sourceName = (p) => (p.format === 'rpm' ? (p.source || '').replace(/-[^-]+-[^-]+\.src\.rpm$/, '') : p.source);

// a build is the pin's: its version, and its release when the pin names one (11 matches 11 and 11.fc44)
const pinned = (F, evr, pin) => {
  if (F.upstream(evr) !== pin.version) return false;
  if (!pin.release) return true;
  const r = F.release(evr);
  return r === pin.release || r.startsWith(pin.release + '.');
};

// ---------------------------------------------------------------- index parsing

const attr = (tag, a) => { const m = tag.match(new RegExp(`\\b${a}="([^"]*)"`)); return m ? m[1] : undefined; };
const unxml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const RPM_FLAG = { EQ: '=', LT: '<', LE: '<=', GT: '>', GE: '>=' };

function rpmEntries(block, section) {
  const m = block.match(new RegExp(`<rpm:${section}>([\\s\\S]*?)</rpm:${section}>`));
  if (!m) return [];
  return [...m[1].matchAll(/<rpm:entry\b[^>]*\/>/g)].map(([t]) => ({
    name: unxml(attr(t, 'name')),
    op: RPM_FLAG[attr(t, 'flags')],
    evr: attr(t, 'ver') === undefined ? undefined : { epoch: attr(t, 'epoch'), ver: attr(t, 'ver'), rel: attr(t, 'rel') },
  }));
}

// one dnf repository directory: rpm/fedora/<release>/<dir>/repodata/primary.xml
export function parsePrimary(xml, repo, dir) {
  return [...xml.matchAll(/<package type="rpm">([\s\S]*?)<\/package>/g)].map(([, b]) => {
    const v = b.match(/<version [^>]*\/>/)[0];
    const arch = b.match(/<arch>([^<]*)<\/arch>/)[1];
    const name = b.match(/<name>([^<]*)<\/name>/)[1];
    const evr = { epoch: attr(v, 'epoch') || '0', ver: attr(v, 'ver'), rel: attr(v, 'rel') };
    const provides = rpmEntries(b, 'provides');
    if (arch !== 'src' && !provides.some((p) => p.name === name)) provides.push({ name, op: '=', evr });
    return {
      format: 'rpm', repo, dir, name, arch, evr,
      file: `${dir}/${unxml(b.match(/<location [^>]*href="([^"]*)"/)[1])}`,
      source: (b.match(/<rpm:sourcerpm>([^<]*)<\/rpm:sourcerpm>/) || [])[1] || null,
      provides,
      // rich dependencies ("(a or b)") and file paths are left to dnf: neither names a package of ours
      requires: rpmEntries(b, 'requires').filter((r) => !r.name.startsWith('(') && !r.name.startsWith('/')).map((r) => [r]),
    };
  });
}

function debRelations(field) {
  if (!field) return [];
  return field.split(',').map((group) => group.split('|').map((alt) => {
    const m = alt.trim().match(/^([^\s(:]+)(?::\S+)?\s*(?:\(\s*(<<|<=|=|>=|>>|<|>)\s*([^)\s]+)\s*\))?/);
    return { name: m[1], op: m[2], evr: m[3] };
  })).filter((g) => g.length);
}

// one flat apt repository: deb/debian/<suite>/Packages
export function parsePackages(text, repo) {
  return text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).map((stanza) => {
    const f = {};
    let last = null;
    for (const line of stanza.split('\n')) {
      if (/^\s/.test(line)) { if (last) f[last] += '\n' + line; continue; }
      const i = line.indexOf(':');
      last = line.slice(0, i);
      f[last] = line.slice(i + 1).trim();
    }
    const evr = f.Version;
    const provides = debRelations(f.Provides).map((g) => g[0]);
    provides.push({ name: f.Package, op: '=', evr });
    return {
      format: 'deb', repo, dir: f.Architecture, name: f.Package, arch: f.Architecture, evr,
      file: f.Filename.replace(/^\.\//, ''),
      source: f.Source ? f.Source.split(' ')[0] : f.Package,
      provides,
      requires: [...debRelations(f['Pre-Depends']), ...debRelations(f.Depends)],
    };
  });
}

// ---------------------------------------------------------------- the selection

const fmt = {
  rpm: {
    id: 'rpm',
    cmp: rpmEvrCmp,
    // the version a pin and "newest version" speak of: epoch and version, not the build
    vcmp: (a, b) => rpmEvrCmp({ epoch: a.epoch, ver: a.ver }, { epoch: b.epoch, ver: b.ver }),
    upstream: (evr) => evr.ver,
    release: (evr) => evr.rel,
    show: (evr) => `${evr.epoch && evr.epoch !== '0' ? evr.epoch + ':' : ''}${evr.ver}-${evr.rel}`,
    indep: 'noarch',
    satisfies(provide, req) {
      if (!req.op) return true;
      if (!provide.op || !provide.evr) return true; // an unversioned provide satisfies any version (rpm)
      const c = rpmEvrCmp(provide.evr, req.evr);
      return cmpOk(c, req.op, provide.op);
    },
  },
  deb: {
    id: 'deb',
    cmp: debVersionCmp,
    vcmp: (a, b) => {
      const x = parseDebVersion(a), y = parseDebVersion(b);
      return debVersionCmp(`${x.epoch}:${x.upstream}`, `${y.epoch}:${y.upstream}`);
    },
    upstream: (evr) => parseDebVersion(evr).upstream,
    release: (evr) => parseDebVersion(evr).revision,
    show: (evr) => evr,
    indep: 'all',
    satisfies(provide, req) {
      if (!req.op) return true;
      if (!provide.op || !provide.evr) return false; // apt: a versioned dependency needs a versioned provide
      return cmpOk(debVersionCmp(provide.evr, req.evr), req.op, provide.op);
    },
  },
};

// does a provide "= P" (c = P cmp R) satisfy a requirement "<op> R"; a provide with a range is treated by
// its bound, which is all our packages ever carry (=)
function cmpOk(c, op, pop = '=') {
  if (pop !== '=') return true;
  switch (op) {
    case '=': return c === 0;
    case '<': case '<<': return c < 0;
    case '<=': return c <= 0;
    case '>': case '>>': return c > 0;
    case '>=': return c >= 0;
    default: return true;
  }
}

// one repository: all the packages of one rpm/fedora/<release> (every dir) or one deb/debian/<suite>
export function selectRepo(pkgs, keep) {
  if (!pkgs.length) return { keep: [], delete: [], notes: [] };
  const F = fmt[pkgs[0].format];
  const kept = new Map(); // file -> reason
  const notes = [];
  const mark = (p, why) => { if (!kept.has(p.file)) kept.set(p.file, why); };
  const binaries = pkgs.filter((p) => p.arch !== 'src');
  const arches = [...new Set(binaries.map((p) => p.arch).filter((a) => a !== F.indep))].sort();
  const forArch = (p, a) => p.arch === a || p.arch === F.indep;
  const best = (list) => list.reduce((x, y) => {
    const c = F.cmp(x.evr, y.evr);
    if (c) return c > 0 ? x : y;
    if (x.arch !== y.arch) return x.arch === F.indep ? y : x; // the architecture's own build wins a tie
    return x.file < y.file ? x : y;
  });
  // with no architecture-specific build at all, the independent ones are their own architecture
  const archList = arches.length ? arches : [F.indep];

  const byName = new Map();
  for (const p of binaries) (byName.get(p.name) || byName.set(p.name, []).get(p.name)).push(p);

  for (const [name, builds] of byName) {
    const newest = builds.reduce((x, y) => (F.vcmp(x.evr, y.evr) >= 0 ? x : y));
    const targets = [{ evr: newest.evr, why: 'newest', isNewest: true }];
    for (const pin of pinsFor(keep, F.id, name, sourceName(builds[0]))) {
      const hit = builds.find((b) => pinned(F, b.evr, pin));
      if (hit && (pin.release || F.vcmp(hit.evr, newest.evr) !== 0)) targets.push({ evr: hit.evr, exact: !!pin.release, why: `pinned: ${pin.reason}` });
    }
    for (const t of targets) {
      for (const a of archList) {
        const own = builds.filter((b) => forArch(b, a));
        if (!own.length) continue;
        const same = own.filter((b) => (t.exact ? F.cmp : F.vcmp)(b.evr, t.evr) === 0);
        if (same.length) mark(best(same), t.why);
        else if (t.isNewest) {
          const fb = best(own);
          mark(fb, `newest for ${a}: ${F.upstream(newest.evr)} has no ${a} build`);
          notes.push(`${name}: ${a} has no build of ${F.upstream(newest.evr)}, keeps ${F.show(fb.evr)}`);
        }
      }
    }
  }

  // what a kept package needs and only a deleted package would provide stays as well
  const providers = new Map();
  for (const p of binaries) for (const pr of p.provides) {
    (providers.get(pr.name) || providers.set(pr.name, []).get(pr.name)).push({ pkg: p, pr });
  }
  const byFile = new Map(pkgs.map((p) => [p.file, p]));
  for (let changed = true; changed;) {
    changed = false;
    for (const file of [...kept.keys()]) {
      const p = byFile.get(file);
      if (p.arch === 'src') continue;
      for (const group of p.requires) {
        for (const a of p.arch === F.indep ? archList : [p.arch]) {
          const cands = [];
          for (const alt of group) {
            for (const { pkg, pr } of providers.get(alt.name) || []) {
              if (pkg !== p && forArch(pkg, a) && F.satisfies(pr, alt)) cands.push(pkg);
            }
          }
          if (!cands.length || cands.some((c) => kept.has(c.file))) continue;
          const need = best(cands);
          mark(need, `needed by ${p.name} ${F.show(p.evr)} (${p.arch})`);
          changed = true;
        }
      }
    }
  }

  // sources: the ones a kept binary was built from, and the newest of each name
  const sources = pkgs.filter((p) => p.arch === 'src');
  if (sources.length) {
    const built = new Set(binaries.filter((p) => kept.has(p.file)).map((p) => p.source));
    const srcByName = new Map();
    for (const s of sources) (srcByName.get(s.name) || srcByName.set(s.name, []).get(s.name)).push(s);
    for (const list of srcByName.values()) {
      for (const s of list) if (built.has(s.file.split('/').pop())) mark(s, 'source of a kept package');
      mark(best(list), 'newest source');
    }
  }

  const out = { keep: [], delete: [], notes };
  for (const p of pkgs) {
    const row = { format: p.format, repo: p.repo, dir: p.dir, file: p.file, name: p.name, arch: p.arch, version: F.show(p.evr), source: p.source };
    if (kept.has(p.file)) out.keep.push({ ...row, reason: kept.get(p.file) });
    else out.delete.push(row);
  }
  return out;
}

// pins that match no package of any repository: keep.yml is out of date, or names a package wrongly
export function unusedPins(keep, allPkgs) {
  const out = [];
  for (const e of keep) for (const format of ['rpm', 'deb']) for (const g of e[format] || []) {
    const re = globRe(g);
    const hit = allPkgs.some((p) => p.format === format && p.arch !== 'src' && re.test(p.name) && fmt[format].upstream(p.evr) === e.version);
    if (!hit) out.push(`${format} ${g} ${e.version}: no such package in any repository`);
  }
  // a source pin holds in every format that builds that source at all: a format that has the source but not
  // the pinned version is named on its own
  for (const e of keep) for (const src of e.source || []) {
    const v = `${e.version}${e.release ? '-' + e.release : ''}`;
    const of = allPkgs.filter((p) => p.arch !== 'src' && sourceName(p) === src);
    if (!of.length) { out.push(`source ${src} ${v}: no such package in any repository`); continue; }
    for (const format of ['rpm', 'deb']) {
      const mine = of.filter((p) => p.format === format);
      if (mine.length && !mine.some((p) => pinned(fmt[format], p.evr, e))) out.push(`source ${src} ${v}: no ${format} build of it`);
    }
  }
  return out;
}

// the pins a plan would break: per repository, package and architecture, a pinned version that exists
// and of which no build is kept. keptPaths: the plan's kept paths (rpm/<repo>/<file>, deb/<repo>/<file>)
export function pinsLost(keep, allPkgs, keptPaths) {
  const groups = new Map();
  for (const p of allPkgs) {
    if (p.arch === 'src') continue;
    for (const e of pinsFor(keep, p.format, p.name, sourceName(p))) {
      if (!pinned(fmt[p.format], p.evr, e)) continue;
      const k = `${p.format} ${p.repo} ${p.name}.${p.arch} ${e.version}${e.release ? '-' + e.release : ''}`;
      (groups.get(k) || groups.set(k, { reason: e.reason, paths: [] }).get(k)).paths.push(`${p.format}/${p.repo}/${p.file}`);
    }
  }
  return [...groups].filter(([, g]) => !g.paths.some((f) => keptPaths.has(f))).map(([k, g]) => `${k}: ${g.reason}`);
}

// ---------------------------------------------------------------- npm

export const DEPRECATION = 'superseded; nobody uses this version';

// packument: the registry document of the package ({versions, 'dist-tags'}). Stage 1 of the prune only
// deprecates: a deprecated version still installs, so a pin nobody listed here keeps working, while an
// unpublished one is gone for good and npm never lets that version number be published again.
export function selectNpm(name, packument, keep) {
  const versions = Object.keys(packument.versions || {}).sort(semverCmp);
  const stable = versions.filter((v) => !v.includes('-'));
  const newest = (stable.length ? stable : versions).at(-1);
  const keepSet = new Map([[newest, 'newest']]);
  const latest = packument['dist-tags']?.latest;
  if (latest && latest !== newest) keepSet.set(latest, 'the latest dist-tag');
  for (const pin of pinsFor(keep, 'npm', name)) if (versions.includes(pin.version) && !keepSet.has(pin.version)) keepSet.set(pin.version, `pinned: ${pin.reason}`);
  const out = { name, keep: [], deprecate: [], already: [] };
  for (const v of versions) {
    if (keepSet.has(v)) out.keep.push({ version: v, reason: keepSet.get(v) });
    else if (packument.versions[v].deprecated) out.already.push({ version: v, deprecated: packument.versions[v].deprecated });
    else out.deprecate.push({ version: v });
  }
  return out;
}

// ---------------------------------------------------------------- the report

// per package and format: what stays and what goes, the architectures of one build folded into one line
export function report(results) {
  const lines = [];
  const groups = new Map();
  for (const r of results) for (const [verdict, rows] of [['keep', r.keep], ['delete', r.delete]]) {
    for (const row of rows) {
      const key = `${row.format} ${row.repo} ${row.name}${row.arch === 'src' ? ' (source)' : ''}`;
      if (!groups.has(key)) groups.set(key, new Map());
      const g = groups.get(key);
      const k = `${verdict} ${row.version}`;
      if (!g.has(k)) g.set(k, { verdict, version: row.version, arches: new Set(), reason: row.reason });
      g.get(k).arches.add(row.arch);
    }
  }
  for (const key of [...groups.keys()].sort()) {
    const [format] = key.split(' ');
    const F = fmt[format];
    lines.push(key);
    const rows = [...groups.get(key).values()].sort((a, b) => -F.cmp(evrOf(format, a.version), evrOf(format, b.version)) || a.verdict.localeCompare(b.verdict));
    for (const r of rows) {
      lines.push(`  ${r.verdict.padEnd(6)} ${r.version.padEnd(28)} ${[...r.arches].sort().join(',').padEnd(16)}${r.reason ? ' ' + r.reason : ''}`);
    }
  }
  return lines.join('\n');
}

function evrOf(format, shown) {
  if (format === 'deb') return shown;
  const m = shown.match(/^(?:(\d+):)?(.*)-([^-]*)$/);
  return { epoch: m[1] || '0', ver: m[2], rel: m[3] };
}
