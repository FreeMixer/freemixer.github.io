const r=`# Backing up sessions

Everything worth keeping is plain JSON under one directory. The backup is a copy of that
directory, plus two configuration files.

## What to copy

\`\`\`sh
~/.local/state/openmixer/          # sessions, scenes, patches, channel configs, settings
~/.config/reac-pw/                 # the REAC transport configuration
/etc/openmixer/config.json         # the server's startup configuration
\`\`\`

Use \`$XDG_STATE_HOME/openmixer\` instead of the first path if that variable is set.

## A backup

\`\`\`sh
tar czf ~/openmixer-backup-$(date +%F).tar.gz \\
    -C "$HOME" .local/state/openmixer .config/reac-pw
sudo cp /etc/openmixer/config.json ~/openmixer-config-$(date +%F).json
\`\`\`

The mixer does not need to be stopped: session files are written whole, and a copy taken
mid-write is at worst one stale file among many.

For a rig that matters, take one **before every upgrade** and **after every show** whose
session you want to keep.

## Restoring

Stop the units first — the server holds console state in memory and would overwrite a
restored autosave on its way out.

\`\`\`sh
systemctl --user stop openmixer-server reac-pw
tar xzf ~/openmixer-backup-2026-07-28.tar.gz -C "$HOME"
systemctl --user start openmixer-server reac-pw
\`\`\`

## Moving a show to another machine

Sessions are portable, but they record the hardware they expected. Copy \`sessions/\`,
\`scenes/\`, \`patches/\` and \`channel-configs/\` to the target machine's state directory and
load the session from the surface. Those four are the show. The rest of the state
directory is host-local rig state and is deliberately *not* on that list — but note that
\`measurements/\` (the measured plugin-latency store) and \`clock-ownership.json\` /
\`rme-totalmix.json\` are expensive to rebuild, so a machine you are replacing rather than
lending to should get the whole directory as in the section above. If the target rig lacks a box the session expected,
the restore reports what is missing rather than presenting a console with silent
channels.

Do **not** copy \`network-settings.json\` between machines unless you mean to: it carries
the persisted bind address and ports, and it outranks the new machine's configuration.

## Version compatibility

A session written by a newer server is not guaranteed to load into an older one. Keep the
pre-upgrade copy until you have loaded a session on the new version and are satisfied.

## What is not worth backing up

- \`/usr/lib/openmixer/\`, \`/usr/share/openmixer/\` — package-owned, reinstall instead.
- The plugin catalog — it ships with the package.
- The journal — see [logs](logs.md) for collecting a diagnostic snapshot instead.
`,l='# Configuration files\n\n| Path | Owner | Survives upgrade | What it is |\n|---|---|---|---|\n| `/etc/openmixer/config.json` | `openmixer-server` package | yes (`%config(noreplace)`) | The server\'s startup configuration: console size, gig label, catalog path, network bind. |\n| `/etc/nginx/conf.d/openmixer-web-ui.conf` | `openmixer-web-ui` package | yes (`%config(noreplace)`) | The nginx drop-in: the upstream, the plain listener, and the mask include that reaches the https server block. Names no certificate, so it loads on a console that has none. |\n| `/etc/openmixer/nginx/tls.conf` | `%post` of `openmixer-web-ui` | it is rewritten on every install | The https + HTTP/2 server block, copied from `/usr/share/openmixer/nginx/openmixer-web-ui-tls.conf` **only when the leaf and key are there**. Removed on a full uninstall, and by `enable-nginx-tls.sh` whenever the leaf goes. Edit the shipped file, not this copy. |\n| `/etc/openmixer/tls/{root,console}.{crt,key}` | `%post` of `openmixer-web-ui` (`issue-local-ca.sh`) | yes — never overwritten once present | The console\'s own certificate authority and the leaf nginx serves. Keys are `0600`. Replace either with your own and upgrades will leave it alone; delete `console.crt` and `console.key` to have the next install re-issue. |\n| `~/.config/reac-pw/reac-pw.env` | the mixer\'s Setup screen | yes (no package owns it) | Which NICs face REAC on this host — the transport\'s config-once fact. |\n| `~/.config/reac-pw/<iface>.env` | the mixer\'s Setup screen and the segment\'s `role` | yes (no package owns it) | One per segment: transmit interface, launch role, desk profile, wire pace, segment name. |\n| `<state-dir>/network-settings.json` | the server | yes | The persisted **Setup → Network** values. Outranks CLI and environment. |\n| `<state-dir>/locale-settings.json` | the server | yes | The persisted operator locale. |\n| `<state-dir>/adapters.yaml` | the server | yes | Adapter definitions for the adapter manager. |\n| `<state-dir>/stageboxes.json` | the server | yes | Stagebox names, keyed by box identity, independent of any session. |\n| `~/.config/pipewire/pipewire.conf.d/*.conf` | you | yes | Graph-wide sample rate and quantum. See [clocking](../hardware/clocking-and-sample-rate.md). |\n\n`<state-dir>` is `$XDG_STATE_HOME/openmixer`, or `~/.local/state/openmixer` when\n`XDG_STATE_HOME` is unset. See [state and sessions](state-and-sessions.md).\n\n## `/etc/openmixer/config.json`\n\nThe shipped default is empty — with one boot path there is nothing to select, and every\nknob below has a working default:\n\n```json\n{}\n```\n\nThe recognised shape:\n\n```json\n{\n  "adapter": "software",\n  "device": { "host": "127.0.0.1", "port": 10002, "options": {} },\n  "web":    { "host": "localhost", "port": 8080 },\n  "rig":    { "console": "32:16", "gig": "Saturday", "catalog": "/path/to/catalog.json", "demoSources": true }\n}\n```\n\nEvery field is optional; anything omitted takes its default.\n\n- **`adapter`** — which console family the server drives: `software` (the PipeWire\n  native mix engine — the real mixer), `midas`, `x32`, `roland`, or `mock` for tests.\n  Default `mock`.\n- **`device.host` / `device.port`** — the address of a physical desk, when `adapter`\n  names one. Each adapter supplies its own protocol default port when omitted.\n- **`web.*`** — the bind address and port, as the **lowest** layer of the network\n  resolver: persisted Setup value > CLI flag > environment > **this file** > built-in\n  default (`packages/server/src/network-config.ts`). So `{"web": {"port": 9000}}` here\n  moves the server to 9000, but a `--web-port` or an `OPENMIXER_WEB_PORT` still overrides\n  it for that run. Resolution is per field, so setting only `host` here leaves the port\n  alone. Values are validated on load — a port out of range stops the boot rather than\n  binding something unexpected, and an unknown key inside `web` is rejected rather than\n  ignored. See [ports](ports.md).\n- **`rig.preset`** — **retired.** The console is the only rig; there is no axis to select.\n  A rig axis whose default (`bare`: the configured adapter and nothing else) could not carry\n  audio meant a server started without this file came up mute and never said so. Three names\n  (`bare`, `demo`, `console`) still parse, so a file written before the change does not\n  fail validation on upgrade — but they are ignored, and the server says so at startup.\n  `bare` says it loudly, because that file asked for a rig that no longer exists and is\n  getting a whole console instead. Remove the key.\n- **`rig.console`** — pins the console size as `IN:OUT`, e.g. `"32:16"`. A malformed\n  value is logged and ignored, falling back to detection: a typo must never stop the desk\n  from booting.\n- **`rig.gig`** — a label for the session.\n- **`rig.catalog`** — an explicit plugin-catalog path. Unset means the catalog package\'s\n  own bundled data file.\n\nThe file is validated on load. An unknown adapter name — or a rig preset that was never\na real one — is an error, not a silent fallback.\n\n## Pointing at a different file\n\n```sh\nopenmixer-server --config /etc/openmixer/rig-b.json\n```\n\nor the environment variable `OPENMIXER_CONFIG`. To change it for the service, use a\ndrop-in rather than editing the packaged unit:\n\n```sh\nsystemctl --user edit openmixer-server\n```\n\n```ini\n[Service]\nExecStart=\nExecStart=/usr/bin/openmixer-server --config /etc/openmixer/rig-b.json\n```\n\n## The nginx drop-in\n\nPackage-owned but marked `%config(noreplace)` (the nginx drop-in\'s own `%files` entry in\n`packaging/rpm/openmixer.spec`), so an\nupgrade keeps *your* edited file and drops the package\'s new one beside it as\n`openmixer-web-ui.conf.rpmnew`. That is the opposite of the risk you might expect: your\nchanges are safe, but an upgrade that changes the proxied paths or the upstream will not\nreach you. After an upgrade, check for the `.rpmnew` and merge it:\n\n```sh\nls /etc/nginx/conf.d/openmixer-web-ui.conf.rpmnew && \\\n  diff -u /etc/nginx/conf.d/openmixer-web-ui.conf{,.rpmnew}\nsudo systemctl reload nginx\n```\n',h="# Environment variables\n\nEvery environment variable the openmixer server reads. Anything not listed here is either\na build-time parameter (see [configuration files](config-files.md)) or belongs to the\ntransport (see [the transport's own knobs](#the-transports-knobs)).\n\nAn unset variable always means \"use the default\". The empty string counts as unset for\n`OPENMIXER_CONSOLE`, `OPENMIXER_GIG`, `OPENMIXER_CATALOG` and the network knobs — but not\nfor all of them: `OPENMIXER_ADAPTER=` and `OPENMIXER_DEVICE_HOST=` are *parsed*, fail\ntheir schema (`ServerConfigSchema`'s `adapter` and `device.host` fields) and the server\nexits at boot with a validation error. Unset the variable rather than blanking it.\n\n## Where environment variables sit in the precedence chain\n\nFor the network fields:\n\n```\npersisted Setup value  >  CLI flag  >  environment variable  >  config file  >  built-in default\n```\n\nFor everything else the environment is the override and the config file (or the built-in\ndefault) is the base — the same order, so the whole chain reads one way.\n\n## Startup and configuration\n\n| Variable | Effect | Default |\n|---|---|---|\n| `OPENMIXER_CONFIG` | Path to the JSON server-config file. The `--config` flag outranks it. | `/etc/openmixer/config.json` via the unit |\n| `OPENMIXER_ADAPTER` | Console family: `software`, `midas`, `x32`, `roland`, `mock`. An unknown name is an error. | `mock` (the packaged config selects a rig instead) |\n| `OPENMIXER_RIG` | **Retired.** Named the startup rig while there were two; `bare`, `demo` and `console` still parse and are ignored (the console is the only rig), with a line at startup saying so. | — |\n| `OPENMIXER_CONSOLE` | Pin the console size as `IN:OUT`, e.g. `32:16`. A malformed value is logged and ignored. | detected |\n| `OPENMIXER_GIG` | A label for the session. | unset |\n| `OPENMIXER_CATALOG` | Explicit plugin-catalog JSON path. | the catalog package's bundled data file |\n| `OPENMIXER_STATE_DIR` | Persisted-state directory. The `--state-dir` flag outranks it. | `$XDG_STATE_HOME/openmixer`, else `~/.local/state/openmixer` |\n| `OPENMIXER_ADAPTERS_CONFIG` | Path to the adapter definitions. | `<state-dir>/adapters.yaml` |\n| `OPENMIXER_PERF` | `0` disables the engine's own performance sampling (the seam timings behind `/perf` and the process gauge at `/telemetry/process`). Any other value, or unset, leaves it on. | enabled |\n\n## Network\n\n| Variable | Effect | Default |\n|---|---|---|\n| `OPENMIXER_WEB_HOST` | HTTP bind address. | `localhost` (both loopbacks, nothing else — a LAN device goes through nginx) |\n| `OPENMIXER_WEB_PORT` | HTTP port. | `8080` |\n| `OPENMIXER_MANUAL_DIR` | **Override only — leave it unset.** The console works out where its documentation site is: `/usr/share/openmixer/manual` (the `openmixer-manual` package), else `packages/website/.output/public` in a workspace checkout. It serves whichever it finds at `/help`, so the surface's help deep-links (`/help/manual/user#<anchor>`) resolve offline, on the desk. No site in either → `/help` answers 404 and the console says so in its log rather than faking a page. Set it only for an unusual layout; the RPM may set it, an operator should not have to. Whatever is set must be the build **root**, never a directory inside it — a prerendered page's stylesheet, chunks and fonts sit beside the pages, and the manual's topic pages are under `docs/`, so a subtree serves HTML whose every asset 404s. The console warns at boot when the value is not a site built for this mount. | derived |\n| `OPENMIXER_DEVICE_HOST` | Address of a physical desk, when an adapter drives one. Ignored: the console hardcodes the `software` adapter and overwrites `device` (`console-rig.ts`), as it does `OPENMIXER_ADAPTER`. There is no longer a rig that honours them. | `127.0.0.1` |\n| `OPENMIXER_DEVICE_PORT` | Its port. | per-adapter: Midas `10002`, X32 `10023` |\n| `OPENMIXER_PATCHBAY_HOST` | Bind address of the standalone `openmixer-patchbay` tool (read directly in its `bin/patchbay.ts` entry point). Loopback by default — not reachable from a tablet. | `127.0.0.1` |\n| `OPENMIXER_PATCHBAY_PORT` | Its port (see [ports](ports.md)). | `8890` |\n| `OPENMIXER_PHYSICAL_SURFACES` | `off` keeps this console's hands off every physical control surface (the X-Touch family): it never probes or opens one, and its surface entries report why. Read once at boot. Every launcher of a console that is NOT the live one — a deploy shadow, a preview, a test console — sets it `off`, because the ALSA sequencer is shared by the whole machine and a second console opening the surface stalls the live one (surface map §9). The live unit leaves it unset. | unset (surfaces open) |\n| `OPENMIXER_CONSOLE_DROP_IN` | **Override only — leave it unset.** The systemd unit drop-in `/console/allocation` GENERATES when a reshape is accepted, carrying the size the next boot builds at (`console-allocation-boot.ts`). It sorts after a hand-written `zz-console-*.conf`, so where both exist the generated one wins; a file this console did not generate is left alone and reported, never overwritten. Set by a test to a scratch path; production never sets it, and under a test runner with no value set the console generates NOTHING rather than writing into a real deployment's unit directory. | `$XDG_CONFIG_HOME/systemd/user/openmixer-engine.service.d/zz-console-size.conf` |\n| `OPENMIXER_TLS_CERT_DIR` | **Override only — leave it unset.** Where `/console/addresses` (`console-addresses-row.ts`) reads `console.crt` from, the same directory `issue-local-ca.sh` issues into. Set by a test to a scratch directory; production never sets it. | `/etc/openmixer/tls` |\n\nRemember that a value persisted through **Setup → Network** outranks both of the\nnetwork variables. If setting one appears to do nothing, that is why — check\n`<state-dir>/network-settings.json`.\n\n## Engine behaviour\n\n| Variable | Effect | Default |\n|---|---|---|\n| `OPENMIXER_MOD_HOST_BIN` | Absolute path of the mod-host binary the console spawns — a local build while mod-host itself is under development (ruling 36: published releases by default; set in `~/.config/openmixer/dev.env`). A relative path is refused at startup. | `/usr/bin/mod-host` (the installed release) |\n| `OPENMIXER_PLUGIN_HOSTD_BIN` | Absolute path of the shared plugin supervisor the console spawns when `device.options.modHost.supervisor` is `plugin-hostd` (the dual-run window of `docs/design/specs/2026-09-30-shared-plugin-supervisor.md` §8.1) — a run tree points it at `packages/pipewire-native/tools/plugin-hostd.sh bin`. A relative path is refused at startup. | `plugin-hostd` on PATH |\n| `OPENMIXER_DEMO_SOURCES` | `1` spawns the real, patchable demo source nodes instead of modelling them virtually. | off |\n| `OPENMIXER_REAC_FORCE` | `1` tells the discovery probe to assume it has raw-socket capability rather than testing for it. Useful only when the capability was granted in a way the probe cannot see. | off |\n| `OPENMIXER_RELAY_SETTLE_MS` | Overrides the CAP on the post-pace-write re-lay, in milliseconds. The re-lay normally fires as soon as the graph goes quiet; this only bounds how long it waits when no port churn arrives. For measuring what that bound should be. | 2000 |\n\n## Not for production\n\n| Variable | What it is |\n|---|---|\n| `REACPW_DIR` | Locates a `reac-pw` source checkout **for the RPM build** (`packaging/publish-repo.sh`'s `REACPW_DIR` default). It does not steer the running prober — that takes an injected `reacpwBin` option and otherwise resolves `reac-pw` on `PATH` (`reacPwProber` in `packages/server/src/reac-pw-prober.ts`). Setting it will not make the mixer probe a dev binary. |\n| `OPENMIXER_CATALOG_JSON`, `OPENMIXER_VERSION` | Build-time inputs read by the RPM build script, not by the server. |\n| `OPENMIXER_REPO_BASEURL` | A build ARG of `packaging/image/Containerfile`, not a server variable. It is the dnf repository the console image installs from, substituted into the `.repo` file at image-build time so the host is never baked into a committed file. It must be a plain HTTP tree of directories — the layout `packaging/publish-repo.sh` emits — and never a container registry, which serves OCI manifests and cannot answer a dnf `baseurl`. Setting it on a running console does nothing. |\n| `OPENMIXER_RATCHET_PRUNE`, `OPENMIXER_RATCHET_PRUNE_LOG` | Test infrastructure, read only by `@freemixer/ratchet` under vitest (`packages/ratchet/src/prune.ts`). `OPENMIXER_RATCHET_PRUNE=1` makes a ratchet's shrink-only arms rewrite its debt list, removing the keys that no longer deviate; `=dry` reports them and fails as usual; `OPENMIXER_RATCHET_PRUNE_LOG` names a file that gets one JSON line per key. `harness/lane-finish.sh` step retire-debt sets both. The server never reads them. |\n| `OPENMIXER_KIOSK_URL` | Read by the image's kiosk session script (`packaging/image/usr/share/openmixer/kiosk/gnome-kiosk-script.openmixer.sh`), not by the server: the URL the `desk` variant's Chromium opens at login. A surface-only kiosk points it at another machine's console. | `https://localhost:8443/` |\n\n## The REAC transport's variables\n\n`~/.config/reac-pw/` supplies the transport's *configuration* — interface, role, desk\nmodel, desk profile. It is written by the mixer's Setup screen and documented on its own\npage: [REAC configuration](reac-configuration.md).\n\n## The transport's knobs\n\n`reac-pw` has a small number of behaviour knobs of its own, all default-off and\nbyte-identical on the wire when unset. They are documented in the transport's repository\nat `docs/ENV-KNOBS.md` and listed in `reac-pw --help`:\n\n- `REACPW_GRANT_DWELL_S` — hold the recognised-but-ungranted dwell for a whole number of\n  seconds, for boxes that want a longer wait than the built-in one.\n- `REAC_DEBUG` — set to any value for diagnostic counters on stderr roughly every two\n  seconds: received, duplicate, other-source, bad and gap counts, plus ring statistics.\n  The duplicate counter is what tells you whether you are on a\n  [mirrored port](../hardware/wiring-and-nic.md#never-use-a-mirrored-switch-port) — on a\n  correctly-cabled interface it stays at zero.\n\nSet them in the unit with a drop-in:\n\n```sh\nsystemctl --user edit reac-pw\n```\n\n```ini\n[Service]\nEnvironment=REAC_DEBUG=1\n```\n",d=`# Administrator guide

Everything a person responsible for the machine needs, as opposed to the person mixing
on it. If you are setting a rig up for the first time, start with
[Installing openmixer](../install/index.md); this section is the reference you come back
to.

- **[Services and units](services.md)** — the two systemd user units, what they run and
  how they depend on the session.
- **[Ports](ports.md)** — every port openmixer listens on, its default, and where the
  default is defined.
- **[Configuration files](config-files.md)** — every file that changes behaviour, who
  owns it, and what survives an upgrade.
- **[Environment variables](env-vars.md)** — the complete reference for the server, and
  where the transport's own knobs are documented.
- **[REAC configuration](reac-configuration.md)** — \`~/.config/reac-pw/\`, what Setup writes into
  it, and the fields it validates.
- **[State and session directories](state-and-sessions.md)** — where sessions, scenes,
  patches, channel configs and settings live on disk.
- **[Logs](logs.md)** — where output goes and what to ask for when something is wrong.
- **[Backing up sessions](backup.md)** — what to copy, when, and how to restore.

## The shape of the system

\`\`\`
nginx :8880  ──  static web surface + reverse proxy
      │
      └──▶  openmixer-server  :8080  (REST + ?watch=1 SSE)
                   │
                   ├── PipeWire (the user's session graph)
                   ├── mod-host (LV2 plugin inserts)
                   └── reac-pw  ──  the REAC segment  ──  stagebox
\`\`\`

Both openmixer processes are **user** units in the operator's session, because the
engine is a native PipeWire client and must share the graph. nginx is an ordinary system
service.

## Precedence, once and for all

Every runtime parameter has exactly one default, defined in one place, and a documented
override chain. For the network settings the order is:

\`\`\`
persisted Setup value  >  CLI flag  >  environment variable  >  config file  >  built-in default
\`\`\`

Persisted values live in \`<state-dir>/network-settings.json\` and are written by the
surface's **Setup → Network** screen. This is why editing a unit file to add
\`OPENMIXER_WEB_PORT\` may appear to do nothing: a persisted Setup value outranks it. The
config file's \`web\` block is the bottom layer, for the same reason in reverse: it is the
deployment's baseline, so a flag or a variable meant for one run still wins.
`,c=`# Logs

Both openmixer units log to the systemd journal in the operator's user scope. There are
no log files to rotate.

## Reading them

\`\`\`sh
journalctl --user -u openmixer-server -f            # follow the mixer
journalctl --user -u reac-pw -f              # follow the transport
journalctl --user -u openmixer-server -n 200 --no-pager
journalctl --user -u openmixer-server --since "-1h"
journalctl --user -u openmixer-server -b            # this boot only
\`\`\`

From outside the operator's session — for example over SSH on a headless rig with
lingering enabled:

\`\`\`sh
machinectl shell <operator>@ /bin/journalctl --user -u openmixer-server -n 200 --no-pager
\`\`\`

nginx logs the surface separately, in the system journal:

\`\`\`sh
sudo journalctl -u nginx -n 100 --no-pager
\`\`\`

## What to collect when reporting a problem

\`\`\`sh
{
  rpm -q openmixer openmixer-server openmixer-web-ui reac-pw libreac
  getcap /usr/bin/reac-pw
  systemctl --user status openmixer-server reac-pw
  ip -br link
  cat ~/.config/reac-pw/reac-pw.env ~/.config/reac-pw/*.env
  pw-metadata -n settings | grep clock
  curl -s http://127.0.0.1:8080/health
  curl -s http://127.0.0.1:8080/telemetry
  journalctl --user -u openmixer-server -n 300 --no-pager
  journalctl --user -u reac-pw  -n 300 --no-pager
} > /tmp/openmixer-report.txt 2>&1
\`\`\`

That covers the questions that get asked first: which versions, whether the transport has
its capabilities, whether the units are running, which interfaces exist, what the graph
rate is, and what each process last said.

## Turning up the transport's diagnostics

The transport is quiet by default. For a link that is misbehaving, enable its counters:

\`\`\`sh
systemctl --user edit reac-pw
\`\`\`

\`\`\`ini
[Service]
Environment=REAC_DEBUG=1
\`\`\`

\`\`\`sh
systemctl --user restart reac-pw
journalctl --user -u reac-pw -f
\`\`\`

Roughly every two seconds it then reports received / duplicate / other-source / bad
frame counts and gap statistics, plus the ring's active channels, peak and fill.

Two of those numbers answer common questions directly:

- **duplicate** greater than zero means frames are arriving twice — you are almost
  certainly on a [mirrored switch port](../hardware/wiring-and-nic.md#never-use-a-mirrored-switch-port).
- **other-source** counting up means more than one box is transmitting on the segment,
  and only the first one to establish is being decoded.

Turn it off again afterwards. It is diagnostic output, not something to leave running
through a show.

## In-mixer telemetry

The surface's **telemetry** panel reports what the logs cannot: the mains-path latency,
the buffer quantum, the sample rate, a live xrun counter, and a per-channel, per-plugin
latency breakdown. For dropout and latency questions, start there rather than in the
journal.
`,u="# Ports\n\n| Port | Default | Listener | What it carries |\n|---|---|---|---|\n| **8443** | build-time (`omx_webui_tls_port`) | nginx | The https + HTTP/2 origin — the surface, the REST entity API (with `?watch=1` SSE streams multiplexed on the one h2 connection), the manual, health, telemetry, patchbay REST. This is the LAN door (deployment/h2 rulings, amendment 2026-09-03). Opened in firewalld by the package. |\n| **8880** | build-time (`omx_webui_port`) | nginx | The plain listener. Carries no API: only the redirect to the https origin and the trust page serving the root certificate (`/trust/root.crt`) for a browser that does not yet trust it. Opened in firewalld by the package. |\n| **8080** | runtime (`web.port`), product default | `openmixer-server` | The console's own listener, which nginx proxies to (`127.0.0.1:<web.port>`, `/etc/openmixer/nginx/upstream.conf`). Binds `localhost` — both loopbacks and nothing else — so a device on the LAN reaches it only through nginx at 8443. The number itself is runtime config, not a package parameter; see below. |\n| **8890** | runtime (`OPENMIXER_PATCHBAY_PORT`) | `openmixer-patchbay` | The standalone patchbay tool, when you run it. Not started by any unit. Binds `127.0.0.1` only (`OPENMIXER_PATCHBAY_HOST`), and nginx does not proxy it. |\n| **operator's choice** | runtime (`--port` in `/etc/openmixer/osc.env`) | `omx-osc` | The OSC surface, UDP. No default, because no OSC port is registered; the unit does not start until `osc.env` names one. Not proxied by nginx and not opened in firewalld by the package: opening it is yours. |\n| **5555** | runtime | `mod-host` | The LV2 insert host's command socket, on `127.0.0.1`. The server **spawns it** (`ensureModHost` in `packages/server/src/software-mixer-loader.ts`) after probing for an existing one, so it is a listener you did not start by hand. Worth knowing about when a port conflicts or an unrelated mod-host is already running. |\n\n## 8443 — the surface, and the LAN door\n\nThe nginx drop-in at `/etc/nginx/conf.d/openmixer-web-ui.conf` plus the https server block\nit includes (`/etc/openmixer/nginx/tls.conf`, present once a certificate has been issued)\nserve `/usr/share/openmixer/web-ui` on **8443** and proxy these paths to the server:\n\n```\n/api/*         the REST entity API (and its ?watch=1 SSE streams) — includes\n               /api/net/binding, the console's own discoverable port\n/manual        the bundled manual\n/health        liveness\n/telemetry     the latency and xrun report\n/patchbay/*    the routing endpoints\n```\n\nTLS terminates here, with the console's own bundled local CA, and installing the anchor is\ncovered in [Backup and TLS](backup.md). **8880** carries no API at all: it is a plain\nredirect to `https://<host>:8443` plus the trust page a browser without the anchor can still\nread, so opening 8880 alone reaches only that page, never the mixer.\n\nThe listen ports and the upstreams are plain configuration in those two files. Both are\nalso build-time parameters of the RPM (`omx_webui_port`, `omx_webui_tls_port`, `omx_web_port`),\nwhich is how the packaged files and the firewalld rules stay consistent with each other.\n\nYou do not edit the upstream. `/etc/openmixer/nginx/upstream.conf` is generated from\n`web.port` of `/etc/openmixer/config.json` — by `%post` at install — and the drop-in\nincludes it. **After that, one step:**\n\n```sh\nsudo openmixer-apply-port\n```\n\nIt regenerates the upstream, moves the SELinux port label from whatever it was to the port\nthe config now names, and reloads nginx — all three, in order. There is no other way to get\nan edit into nginx: the packaged server unit is a `--user` unit and cannot write\n`/etc/openmixer` or call `semanage`, so it runs no nginx step of any kind. A restart alone,\nor a bare `systemctl reload nginx`, leaves nginx proxying to the OLD port.\n\n## 8080 — the server\n\nThe server's own port is **runtime** configuration, not a package parameter, and **8080 is\nonly its product default** — the number an install carries until something says otherwise.\nIt can be set five ways, in this order of precedence:\n\n1. The persisted value from the surface's **Setup → Network** screen, in\n   `<state-dir>/network-settings.json`.\n2. The CLI flag `--web-port`.\n3. The environment variable `OPENMIXER_WEB_PORT`.\n4. `web.port` in the config file (`/etc/openmixer/config.json`, or whatever `--config` /\n   `OPENMIXER_CONFIG` names). See [configuration files](config-files.md).\n5. The built-in default, **8080**.\n\nLayers 1, 3 and 4 are the ones a shell script can see (there is no `--web-port` flag for a\nscript to read), and `/usr/lib/openmixer/openmixer-config-port.sh` is what sees them: the\nnginx upstream, the SELinux port label and the gig-safe restart hooks all ask it rather than\ncarrying the number. It walks the layers in the same order — the persisted file, then the\nenv var, then the config file — reading `<state-dir>/network-settings.json` in the same\nsession a hook or `openmixer-apply-port` runs in, so a port set from Setup → Network reaches\nnginx the same way an edit to `config.json` does.\n\nThe same chain applies to `--web-host` / `OPENMIXER_WEB_HOST` / `web.host` (default\n`localhost`: both loopbacks, nothing else).\n\nPrecedence is resolved **per field**, not per layer: a persisted host does not stop the\nconfig file's `web.port` from applying. The Setup → Network screen shows which layer won\neach field, so `file` there means the value came from the config file.\n\nThe config file sits at the bottom because it is the deployment's baseline — a\n`--web-port` typed at the console, or an `OPENMIXER_WEB_PORT` in a systemd drop-in, is\nmeant for this run and still wins.\n\nTo find the port an installed console actually answers on, ask nginx's own upstream\n(`cat /etc/openmixer/nginx/upstream.conf`) or the entity that carries it live —\n`curl -sk https://127.0.0.1:8443/api/net/binding`. There is no separate discovery endpoint:\na `GET /config` outside the entity contract used to duplicate this and was retired\n(deployment/h2 rulings, amendment 2026-09-03) once nothing in the surface was found reading it.\n\n## Exposing the mixer to other devices\n\nThe surface is designed to be opened on several devices at once — a tablet at front of\nhouse, a laptop backstage. Open **8443** and **8880** (nginx) on the firewall and nothing\nelse: 8443 carries the surface, the entity API and its SSE streams over https/h2; 8880 only\nredirects to it and serves the trust page. The console's own port is bound on loopback only,\nso there is nothing on it for a LAN device to reach. An operator who wants the plain port on\na LAN address sets `web.host` explicitly — it is never the default.\n\nThe trap is opening 8880 alone: it never carries the API, with or without a server-port\nchange — a device that only reaches 8880 gets the trust page, never the mixer.\n\n```sh\nsudo firewall-cmd --add-port=8443/tcp --add-port=8880/tcp --permanent && sudo firewall-cmd --reload\n```\n\n## Checking what is actually listening\n\n```sh\nss -ltnp | grep -E ':8443|:8880|:8080|:8890|:5555'\ncurl -s -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:8080/health   # engine, loopback only\ncurl -sk -o /dev/null -w '%{http_code}\\n' https://127.0.0.1:8443/health # nginx, the LAN door\ncurl -sI http://127.0.0.1:8880/                                         # redirects to :8443\n```\n",p=`# REAC configuration

The transport reads its configuration from \`~/.config/reac-pw/\` — one file saying which NICs
face REAC, and one file per segment beside it. \`reac-pw.service\` is the unit that reads them; it
passes no interface, no rate and no role on its command line, so those files are the whole
declaration. The mixer writes them; you rarely need to.

## How it is normally written

**Setup → Adapters → REAC** in the mixer. Choose the interface and save, and the mixer declares
the segment, writes its file and enables and starts the unit for you.

This is the supported path. It validates what you enter before it writes, which hand-editing does
not.

## The files

\`~/.config/reac-pw/reac-pw.env\` — the config-once fact, which NICs face REAC on this host:

\`\`\`sh
# generated by openmixer — edits are overwritten
REAC_IFACES=enp3s0,enp4s0
\`\`\`

\`~/.config/reac-pw/<iface>.env\` — one per segment, named for the interface that faces it:

\`\`\`sh
# generated by openmixer — edits are overwritten
REAC_TX=enp3s0
REAC_ROLE=master
REAC_MIXER=m5000
REAC_RATE=96000
REAC_NAME=seg2
\`\`\`

| Field | Meaning |
|---|---|
| \`REAC_IFACES\` | Comma-separated interface names, exactly as \`ip -br link\` spells them. Each one declares a segment and names its file. A NIC that re-enumerates under a new name is a config change, and the daemon exits rather than serving a dead binding. |
| \`REAC_TX\` | The interface this segment transmits on. Normally the same as the one the file is named for; Setup writes them equal. |
| \`REAC_ROLE\` | \`master\` (this console owns the clock and drives the handshake) or \`slave\` (an external desk does). The **launch** role — read once, at start. Do not set it by hand: it is generated from the role you set on the segment, below. |
| \`REAC_MIXER\` | Which Roland desk the mixer presents itself as: \`m200\`, \`m300\` or \`m5000\`. Boxes lock to any of them. |
| \`REAC_RATE\` | The REAC **wire pace** in Hz — \`44100\`, \`48000\` or \`96000\`, one setting for the whole REAC side, and independent of \`REAC_MIXER\`: the mixer generation says which desk is impersonated, never the rate, and neither is ever derived from the other. \`reac-pw\` refuses any other rate outright. |
| \`REAC_NAME\` | This segment's name, which is the address the console's patches and its \`/reac/segment/{name}\` row use. A file with no \`REAC_NAME\` is the \`default\` segment. Changing it re-points every patch on that box. |

There is no box model or label in any of these files. \`reac-pw\` learns which box is on a segment
from the box itself and sizes and labels the nodes from that; the console's own expectation of
which box *should* be there is a Setup field, stored with the adapter entry in
\`adapters.yaml\`, and it reaches the transport nowhere.

## The role is set in the mixer, not in the file

\`REAC_ROLE\` is generated. The operator's intent lives on the segment's own row, in the product's
words:

\`\`\`sh
curl -sX PATCH -H 'content-type: application/json' \\
  -d '{"role":"mixer"}' http://console.local:8800/api/reac/segment/default
\`\`\`

\`mixer\` is the master end of the desk↔stagebox pairing, \`recorder\` the slave end, and \`auto\` —
the default — observes the wire and takes the end it leaves open. The console translates that
into \`REAC_ROLE\` for every declared segment and writes it into the file the daemon launches from,
so a daemon restart comes back as the end you asked for. \`auto\` launches as a **slave**: a slave
transmits no master presence and so cannot collide with a desk already holding the wire, and
\`auto\` then resolves for real on the segment's first announce.

The console never fights another master for the wire. When a rival master appears on a segment,
the console classifies it: a desk is joined and the console takes the slave end; a stagebox whose
switch is set to the wrong position is refused, and the refusal is shown as a named warning on
the segment, so a misconfigured box can be corrected at the box rather than argued with.

## The mixer only writes files it generated

The first line of every file the mixer writes is:

\`\`\`
# generated by openmixer — edits are overwritten
\`\`\`

A file without that line was written by a person, and the mixer leaves it exactly as it is —
including its \`REAC_ROLE\`, which then keeps overriding whatever role you set in the mixer. It
says so rather than doing it silently: a standing warning on \`/warnings\`, coded
\`reac:config-not-generated\`, naming the file.

To hand the file over to the mixer, move yours aside:

\`\`\`sh
mv ~/.config/reac-pw/enp3s0.env ~/.config/reac-pw/enp3s0.env.hand-written
\`\`\`

The mixer generates a fresh one on its next projection and the warning clears. There is no button
that does this, deliberately: a gesture that destroys your own file should be yours.

## Verifying a change to the REAC or head-amp path

A soft meter is not proof anything changed at the box — see
[trusting what you see](../manual/head-amp.md#trusting-what-you-see). Before and after any
change that touches the transport, the enrolment path, or head-amp control, measure one
channel on a box you are not experimenting on and confirm its reading did not move. Keep the
same box, the same input, the same reference level every time, so a single number (a SENS
ratio, an RMS level) is directly comparable across the change. If that reference channel
moves, the change reached further than intended and the change stops, not the channel.

This matters most on a rig with more than one box: an experiment against one box's enrolment
or clocking can, and has, silently perturbed a segment it was never meant to touch.

## What is deliberately *not* here

No part of your rig is compiled into any package: interface names, MAC addresses, box
tables, ports and paths are all configuration. If you find yourself wanting to patch a
binary to change one of them, the setting exists somewhere and this is the wrong
approach.

## Checking

\`\`\`sh
cat ~/.config/reac-pw/reac-pw.env ~/.config/reac-pw/*.env
systemctl --user status reac-pw
journalctl --user -u reac-pw -n 100 --no-pager
curl -s http://console.local:8800/api/warnings
\`\`\`

If the box never establishes, work through
[the box is not establishing](../troubleshooting/box-not-establishing.md). The first
suspects are always the interface (is it the right one, is it up, does it have an
address it should not have) and whether something else on the segment is already acting
as master.
`,m="# Services and units\n\n## The units\n\n| Unit | Scope | Command |\n|---|---|---|\n| `openmixer-server.service` | systemd **user** | `/usr/bin/openmixer-server --config /etc/openmixer/config.json` |\n| `omx-osc.service` | systemd **user** | `/usr/bin/omx-osc $OMX_OSC_ARGS`, flags from `/etc/openmixer/osc.env`. Packaged by `openmixer-osc`; wanted by `openmixer-server.service`, ordered after it and stopped with it. **Skipped, not failed, while `osc.env` does not exist** — there is no default port. |\n| `reac-pw.service` | systemd **user** | `/usr/bin/reac-pw`, serving every segment declared in `~/.config/reac-pw/reac-pw.env`, each configured by its own `<iface>.env` beside it. Packaged by reac-pw; openmixer writes the conf and drives the unit. |\n| `nginx.service` | system | serves the static surface and proxies the server |\n\nBoth server-side units are installed by the `openmixer-server` package to\n`/usr/lib/systemd/user/`; `omx-osc.service` comes from the optional `openmixer-osc` package, which\nthe server only recommends.\n\n## Why user units\n\nThe engine is a native PipeWire client. PipeWire runs per user session, so a system-scope\nservice would attach to a different graph and find none of the operator's devices. The\nsame reasoning applies to the transport, which publishes the stagebox as PipeWire nodes\nin that same graph.\n\nThe consequence is [lingering](../install/services.md#enable-lingering-first): without\n`loginctl enable-linger`, systemd stops both units when the operator's last session ends.\n\n## Ordering\n\n`openmixer-server.service` is ordered `After=pipewire.service wireplumber.service` and\n`Wants=pipewire.service`.\n\n`reac-pw.service` is ordered `After=pipewire.service network-online.target` and\nwants both.\n\nNeither waits for the other. The mixer copes with the stagebox arriving late, and the\ntransport copes with the mixer restarting under it.\n\n## Everyday commands\n\n```sh\nsystemctl --user status  openmixer-server reac-pw\nsystemctl --user restart openmixer-server\nsystemctl --user restart reac-pw\nsystemctl --user stop    openmixer-server\njournalctl --user -u openmixer-server -f\n```\n\nRestarting the transport is safe with a box connected: the stagebox re-runs its handshake\nby itself and is normally back within seconds.\n\n## Capabilities on the transport\n\n`/usr/bin/reac-pw` carries file capabilities `cap_net_raw,cap_sys_nice=ep`, applied by\nthe `reac-pw` package's own scriptlet. `CAP_NET_RAW` is what lets it open the raw socket\non the REAC interface; `CAP_SYS_NICE` is what lets it hold a real-time scheduling class\nfor the packet cadence.\n\n`reac-pw.service` verifies them before it execs, and fails with an explicit\nmessage if they are missing, rather than dying on a silent permission error inside the\ncapture path.\n\n```sh\ngetcap /usr/bin/reac-pw\n```\n\n`NoNewPrivileges=` is deliberately **not** set on that unit: the kernel ignores file\ncapabilities across `execve()` when it is on, which would silently strip `CAP_NET_RAW`.\nDo not add it.\n\n## Unit overrides\n\nUse drop-ins, never edits to the packaged files (an upgrade replaces those):\n\n```sh\nsystemctl --user edit openmixer-server\n```\n\nBe aware that a file at `~/.config/systemd/user/openmixer-server.service` — a whole unit,\nnot a drop-in — **shadows** the packaged one and will make upgrades appear to have no\neffect. Check with:\n\n```sh\nsystemctl --user list-unit-files | grep -E 'openmixer-server|reac-pw'\n```\n\nBoth should resolve from `/usr/lib/systemd/user/`.\n",k=`# State and session directories

## Where state lives

\`\`\`
$XDG_STATE_HOME/openmixer          # or ~/.local/state/openmixer when XDG_STATE_HOME is unset
├── sessions/                      # whole-console saves
├── scenes/                        # named snapshots recalled during a show
├── patches/                       # saved routing patches
├── channel-configs/               # reusable per-channel processing presets
├── measurements/                  # measured plugin latency, host-local (local.json + work/)
├── stageboxes.json                # stagebox names, keyed by box identity
├── adapters.yaml                  # adapter definitions
├── network-settings.json          # persisted Setup → Network values
├── locale-settings.json           # persisted operator locale
├── clock-ownership.json           # which device the console claims as clock master
├── rme-totalmix.json              # RME TotalMix state the mixer drove
└── engine.pid                     # single-instance lock
\`\`\`

Override the root with \`--state-dir\` or \`OPENMIXER_STATE_DIR\`. The five sub-directories
are derived from it.

Everything is plain JSON (and YAML for the adapters file). You can read it, copy it and
version it.

## Sessions

A **session** is the whole console saved at once: levels, mutes, solos and sends, the
buses, the matrix, DCA and mute-group membership, every plugin chain with its parameters,
the routing and the surface layout. One file per session in \`sessions/\`.

Each session also records the **hardware it expected** at the time it was saved. A
restore onto a rig that is missing a box can therefore tell the operator exactly what is
absent instead of loading a console with silent channels.

### The two reserved autosaves

Two session ids are reserved and overwritten rather than accumulated:

| Id | Written when | Purpose |
|---|---|---|
| \`autosave-preload\` | immediately before a session is loaded | A restore point for "that was the wrong session" |
| \`autosave-live\` | continuously, as the console changes | What the server offers to restore after a restart |

On start the server prefers the live autosave, then the most recent named session, then
nothing. The reserved ids are excluded from the named-session fallback so an autosave is
never mistaken for a show.

This is a convenience and occasionally a hazard: a console left in a bad state writes
that bad state into the live autosave, and the next boot restores it. See
[a poisoned autosave session](../troubleshooting/poisoned-autosave.md).

## Scenes

Scenes are the many named snapshots an operator jumps between during a show. They live in
\`scenes/\`, separately from sessions, because their lifecycle is different: a session is
the rig, a scene is a moment in the set.

## Channel configs

A channel config captures one channel's processing — its plugin chain and its EQ, gate
and compressor — as a reusable named preset saved from one channel and applied to
another. They live in \`channel-configs/\` and travel between gigs.

## Patches

Saved routing patches live in \`patches/\`. A patch is the routing alone, without the
console state, which makes it the right thing to carry between rigs with the same
physical I/O and different shows.

## Ownership and permissions

Everything under the state directory belongs to the operator's user account and is
written by the server process. It is not package-owned, no scriptlet ever touches it,
and no upgrade rewrites it.

## See also

- [Backing up sessions](backup.md)
- [Configuration files](config-files.md) — the files outside the state directory
`,g=`# 0001 — Native REAC, not AES67, for Roland stageboxes

Status: Accepted (designed; the audio path lives in the sibling \`reac-pw\` repo)
Date: 2026-06-29

## Context

openmixer's first real rig takes its I/O from one or two Roland REAC stageboxes (for
example the S-1608): mic inputs in, the mixed PA feed out. There are three ways to get
that audio onto and off the host:

1. A Roland M-5000 console acting as the REAC master, bridged to the host somehow.
2. Convert REAC to AES67 (or Dante) with a hardware or software gateway, and run the
   mixer on the standardised stream.
3. Speak **native REAC** directly — the Roland stagebox's own Layer-2 protocol
   (\`EtherType 0x8819\`).

A Roland stagebox without a console expects a REAC **master** to clock it and exchange
frames. It does not speak AES67. Converting would mean buying or building a gateway,
adding a clock domain crossing, and adding latency — to talk a protocol the box does
not natively use, when the box already speaks one we have reverse-engineered.

The REAC receive path already exists and works: \`reac-pw\`'s \`reac:capture\` decodes live
REAC into a 40-channel PipeWire source today. A REAC frame *encoder* exists and is
verified by a round-trip test.

## Decision

For Roland stageboxes, the correct wire is **native REAC**. openmixer receives REAC as
a PipeWire source and sends the mix back as a PipeWire sink that re-encodes native REAC
to the stagebox outputs. No M-5000 console and no AES67/Dante conversion in the path.

What remains to drive a *real* stagebox (designed, not yet built): the master-role
JOIN/HOLD handshake (\`cdea\` establishment + heartbeat) so the box locks to openmixer as
its master, and a \`SCHED_FIFO\` cadence pacer that emits frames at a rock-steady rate so
the box stays locked without clicks.

## Consequences

- No gateway hardware, no extra clock-domain crossing, minimal added latency — the
  stagebox connects to the mixing host's NIC and nothing else.
- It commits us to maintaining a native REAC implementation (\`libreac\` / \`reac-pw\`),
  including the master handshake and an RT-grade egress pacer. This is real systems work
  and is the main remaining gap in the audio core.
- It needs raw L2 socket access (\`AF_PACKET\`, \`CAP_NET_RAW\`) on the mixing host, which
  shapes deployment (the audio host, not a generic cluster node).
- AES67/Dante are not foreclosed: they remain valid for *other* I/O endpoints and are
  first-class targets of the discovery layer ([0012](0012-adapter-manager-menus-and-files.md));
  this decision is specifically about how to talk to a Roland stagebox.
`,w=`# 0002 — PipeWire-native summing; mod-host for inserts only

Status: Accepted (both built) — see the 2026-07-29 note at the foot: the engine the
live rig runs is not the one described here
Date: 2026-06-29

## Context

A real mixer needs two distinct kinds of DSP:

- **Structural DSP** — summing buses, faders, pan, channel/output EQ, loudspeaker
  crossovers, delay alignment. This is the skeleton of the console.
- **User inserts** — the LV2 plugins an operator drops onto a strip (a compressor, a
  reverb, a saturator).

It is tempting to run *everything* through one plugin host (mod-host). But that means a
process per node and N-way port summing wired by hand, and it runs into a concrete
limit: on this platform mod-host's JACK-style \`connect\` truncates long PipeWire port
names (error \`-205\`), which is exactly the situation at the summing stage. PipeWire also
will not sum on a port — a port takes a single link, so every convergence point needs an
explicit mixer node anyway.

PipeWire ships builtin filter-chain nodes (MIT-licensed): \`mixer\` (up to 8 inputs, each
with a live gain — that *is* a summing bus with per-tap send gain), \`linear\` (faders),
\`bq_*\` biquads (EQ), \`convolver\` + biquads (crossovers), and \`delay\` (alignment). Props
changes are smoothed by PipeWire, which gives click-free fader/mute ramps for free
([0006](0006-ordered-processor-channel-strip.md) notes the alternative dB-space ramp).

## Decision

Draw a clean two-layer line:

- **Structural DSP is PipeWire-native.** Each bus is one filter-chain \`mixer\` node;
  faders are \`linear\` nodes; EQ/crossover/delay are biquad/convolver/delay nodes. This
  is where summing, sends, DCAs (as gain contributions), matrix, and loudspeaker
  management live.
- **mod-host hosts user inserts only.** The per-strip ordered LV2 insert chain runs in
  mod-host; nothing structural does.
- **\`pw-link\` is used only for source patching** — wiring REAC/USB I/O into bus nodes,
  and bus outputs to physical outs.

Built: the mod-host insert layer (\`ChainManager\`, \`AudioEngineAdapter\`), the \`pw-link\`
router, and the PipeWire filter-chain summing layer — \`bus-node.ts\`'s \`BusControl\`
spawns a filter-chain mixer-tree bus node (a tree of builtin \`mixer\` nodes:
\`ceil(N/8)\` group mixers summed by one sum mixer, N input slots each with a live
\`g<grp>:Gain k\` send gain), and \`SoftwareMixer\` builds the structural graph on top:
aux/group buses with per-channel sends, DCAs as control-domain gain coupling
([0008](0008-dca-as-control-domain-gain-coupling.md)), matrix outputs (a bus sourced
from buses/mains), and output insert chains on bus/matrix/main outputs (reusing
\`ChainManager\`). The main mix is itself one such bus. Verified on real PipeWire: an
N=40 bus loads with 40 \`playback_AUX0…39\` input ports + a routable stereo
\`<bus>_out:output_FL/FR\`, and per-tap gains set via \`pw-cli set-param … Props\`.

## Consequences

- Collapses process sprawl: one filter-chain node per bus instead of many loopback
  processes plus hand-wired summing.
- Sidesteps the mod-host long-port-name truncation for the summing stage, because the
  structural graph never goes through mod-host's \`connect\`.
- Gives declick for free via PipeWire Props smoothing — a hard mute or fader snap
  clicks; ramping does not.
- Resolves the central "native nodes vs plugin host" question with a rule, not a
  case-by-case judgement: structural = PipeWire-native, inserts = mod-host.
- Outputs host insert chains exactly like channels, so separate subs + tops, aux-fed
  subs, and per-channel HPF/LPF are *configuration*, not new code — openmixer subsumes
  the separate loudspeaker processor (DriveRack/Lake) for the rig.
- It is the largest remaining build item in the software engine.

## Note — 2026-07-29: the shipping engine is a third thing this ADR does not name

The decision stands: two distinct kinds of DSP, structural summing separate from
plugin inserts, \`mod-host\` for inserts only. The **mod-host half is exactly what
runs.** What has changed is the realisation of the structural half.

This ADR specifies structural DSP as PipeWire's *built-in* filter-chain nodes —
one \`mixer\` node per bus, \`linear\` nodes for faders, biquad/convolver/delay nodes
for EQ and delay. That path was built, and was for a while the **fallback**. It is
no longer even that: \`OPENMIXER_NATIVE_MIXER\` — the switch that chose between the
two topologies — was deleted in 2026-07, and the filter-chain realisation of the
channel EQ and gate (\`packages/audio-engine/src/eq-node.ts\`, \`gate-node.ts\`, both
of which cited this ADR as their authority) went with it, having had no caller.
They were rejected on measurement, not on taste: the filter-chain path introduced
latency that a live console cannot afford. \`bus-node.ts\` survives — the software
mixer still uses it for bus plumbing. The live rig runs openmixer's
own C \`pw_filter\` node instead: one node per stagebox group, with hand-written
DSP kernels for summing, fader, pan, polarity, the EQ bank, gate/comp, delay and
reverb — \`packages/pipewire-native/src/mixer.c\`, \`mixer_rt.c\`, \`mix_dsp.h\`.
ADR 0017 already recorded this in passing; this note makes it explicit here, because a
reader who follows this ADR looking for \`bq_peaking\` nodes will never find the
code that processes the show.

Why the change happened is worth keeping: the filter-chain-per-bus shape needed
one PipeWire node per bus and a \`pw-loopback\` per strip, and ~40 of those is the
fork pile the module doc comment in \`packages/pipewire-native/src/mixer.c\` calls
"the fork-killer". The *decision* — structural DSP
below the node boundary, inserts above it — is what survived; the choice of
whose C it is did not. See
[native DSP vs mod-host inserts](../native-dsp-vs-modhost-inserts.md).

The consequence line "It is the largest remaining build item in the software
engine" was true when written and is no longer.
`,f=`# 0003 — The server is the single source of truth; surfaces are thin clients

Status: Accepted (built)
Date: 2026-06-29

## Context

A live mix is driven from several places at once: a tablet at front-of-house, a phone on
stage, a laptop, and — designed for S3 — two or three physical X-Touch fader banks. They
must all show the *same values*. If two surfaces each held their own authoritative state
and synced peer-to-peer, they would drift, fight, and need conflict resolution. That is
the failure mode of every "everybody is a master" design.

## Decision

The **server holds the canonical state**. Every surface — web UI, future MCU bank,
another desk routed in — is a **bidirectional client** of that one server and nothing
else. Any edit (a finger on glass, a motor fader, a device-side change) is sent to the
server; the server applies it through the engine and **broadcasts the resulting value to
every connected client, including the originator**. Surfaces never talk to each other.

In the code: \`MixerServer.broadcast()\` fans every \`EngineEvent\` to all sockets; the
originating client also applies its change optimistically and reconciles against the
echoed authoritative value. A connecting client is greeted with the current topology and
can \`subscribe\` to have state (re)sent.

## Consequences

- All surfaces converge on one truth. There is no surface-to-surface protocol to design,
  and no distributed-consensus problem.
- Adding a surface type is adding a client, not a new authority. The designed MCU/X-Touch
  layer is "one more client"; multi-window is "more clients of the same server".
- Self-echo is deliberate: the server echoes to the originator too, so optimistic UIs
  have an authoritative value to reconcile to. (Some *consoles* suppress echo of a
  client's own writes — e.g. the X32 — so adapters apply optimistically and poll on
  connect; that is a device quirk, not openmixer's policy.)
- The server is a single point of failure for control. It is stateless enough to restart
  and re-hydrate from device state + persisted sessions; clients reconnect and re-render.
- Built today: greet-on-connect, \`subscribe\`, and full broadcast of \`state\` / \`meters\` /
  \`plugin.chain\`. The reconnect **snapshot-on-connect** for an arbitrary surface slice
  (so a reconnecting MCU bank repaints correctly) is part of the S3 design.

## Note — 2026-07-29: the reconnect snapshot is built, and the X-Touch banks are real

Consequences says the reconnect snapshot-on-connect for an arbitrary surface
slice, "so a reconnecting MCU bank repaints correctly", "is part of the S3
design". It is built and pervasive, though not the way this ADR describes: every
\`?watch=1\` stream's first event is a full snapshot of that row
(\`packages/server/src/resource-stream.ts\`), so a reconnecting client — including the
selection row at \`/surface/selection\`
(\`packages/server/src/surface-selection-row.ts\`) — is whole again the moment it
re-opens, with no separate replay path. The physical X-Touch banks the Context
anticipates are also real — \`packages/adapter-xtouch/\`.
`,y=`# 0004 — One canonical device-neutral model with per-device adapters

Status: Accepted (built)
Date: 2026-06-29

## Context

Every digital console speaks its own remote-control protocol, with its own addressing,
its own fader taper, and its own quirks (the X32 inverts mute; the Midas has no single
pan node). A mixer surface and a mix engine written against any one of those protocols is
welded to that desk forever. We want the surface, the engine, and the I/O to be reusable
across consoles and across a from-scratch software mixer — and to be able to route one
desk's surface to drive another.

## Decision

Put **one canonical, device-neutral model in the middle** (\`@freemixer/core\`) and make
**adapters the only code that knows a protocol**.

- The model names things by role: \`ChannelId = { kind, index }\`, \`ChannelStrip\`,
  \`FaderLevel\`, \`MixerTopology\` with a mandatory capability map. Values are normalised (a
  fader is an opaque 0..1 position with dB alongside; the device-raw taper is private to
  the adapter — see [0011](0011-fader-position-and-db-with-per-adapter-scale.md)).
- An adapter implements \`MixerAdapter\` (writes are promises) and pushes reads to a
  \`MixerReceiver\` (because desks stream state after subscribe). The software audio engine
  implements the *same* \`MixerAdapter\` contract, so it is just another sink.
- The \`MixerEngine\` holds state for one bound device and *is* its \`MixerReceiver\`, so
  device-pushed and surface-pushed changes share one path and one fan-out.

## Consequences

- **Add a console = add an adapter.** Nothing in the surface, server, or engine changes.
  Three console adapters exist (Midas mature, X32 substantial, Roland a documented stub);
since this ADR a fourth, \`adapter-xtouch\`, attaches an X-Touch control surface through the
same contract, and the built-in mix engine is the \`software\` adapter the composition root
builds; the three desks are controller adapter types (\`packages/server/src/desk-controller.ts\`).
- The valuable, reusable assets are the neutral model and the adapters — not any one
  desk's protocol.
- A desk can be both a sink (we control it) and a source (its surface drives others)
  with no special case: subscribe one engine's events, call another engine's methods.
- The model must be a superset of what real desks expose, and capabilities must be
  honest, so a surface greys out features a given device lacks rather than erroring.
- Adapter packages are loaded lazily (guarded dynamic \`import()\`), so the server builds
  and tests with no adapter packages present; the built-in \`MockAdapter\` is the default.
`,b=`# 0005 — Declarative desired-graph reconcile for audio routing

Status: Accepted (built)
Date: 2026-06-29

## Context

The audio routing — which capture port feeds which plugin, which plugin feeds which bus,
which bus feeds which output — changes constantly as the operator adds inserts, re-routes
sends, recalls scenes, and as I/O appears and disappears. Patching PipeWire/JACK ports
imperatively ("connect A→B now") is fragile: it is order-dependent, it double-applies on
retry, and it has no notion of "what should be true" to converge back to after a glitch
or a replug.

## Decision

Route **declaratively**: the engine holds the *desired* graph and a reconciler converges
the live graph onto it. This is the Zynthian \`zynautoconnect\` pattern, and the same shape
as a Kubernetes controller — edit state, then reconcile.

- \`DeclarativeAudioGraph\` holds a \`{ destination: [sources] }\` desired map.
- \`plan()\` reads the live edges (via \`pw-link -l\`, parsed by \`parsePwLink\`), diffs them
  against desired, and returns only the \`connect\`/\`disconnect\` operations needed.
- It only ever tears down edges whose *destination* it manages, so it never rips out
  routing set up outside openmixer (mics→monitors patched by hand).
- The same idea drives the per-strip insert chain: \`planChain\` is a pure positional diff
  of desired-vs-loaded slots producing exact mod-host \`add\`/\`remove\`/\`connect\`/\`disconnect\`
  calls, keeping unchanged prefixes stable.

The diff logic is a pure function, unit-tested against a fake backend with no socket.

## Consequences

- Idempotent and self-healing: re-running reconcile is safe, and after a graph change the
  engine can re-assert the desired state. Reading the live graph is what makes the diff
  possible — the mod-host protocol alone cannot list connections.
- Scene recall becomes "set the desired graph, then reconcile" rather than a script of
  imperative patches.
- Two known sharp edges, recorded as TODOs in the code: \`reconcile()\` currently
  disconnects-then-connects (it should connect-new-then-drop-stale, ideally suspending the
  node, to avoid audible glitches during re-patching); and the live-graph read needs to be
  robust across PipeWire id churn, which is why routing persists by name, not id
  ([0007](0007-persist-routing-by-name-not-id.md)).
- The reconciler is structural plumbing; it deliberately does **not** sum audio — summing
  is a PipeWire-native mixer node ([0002](0002-pipewire-native-summing-mod-host-inserts-only.md)).

## Note — 2026-07-29: the reconcile-ordering sharp edge is fixed

Consequences records two known sharp edges as TODOs in the code, the first being
that \`reconcile()\` "currently disconnects-then-connects (it should
connect-new-then-drop-stale … to avoid audible glitches during re-patching)".
That is done. \`graph.ts\` now wires the new route live before dropping the stale one, so
the signal is never broken and no silence-gap click reaches the operator; the code
comment next to the change records the same reasoning.

The rest of the ADR — the desired-graph model, \`plan()\`/\`reconcile()\`, only
tearing down destinations it manages, \`parsePwLink\` — is current.
`,v=`# 0006 — The channel strip is an ordered processor list; the fader is a processor

Status: Accepted (built for the insert chain)
Date: 2026-06-29

## Context

On a console, a channel strip has a fixed mental order — trim, polarity, gate, EQ,
compressor, inserts, fader, more inserts, pan, out — and the operator cares deeply about
*where* in that order things sit. Pre-fader versus post-fader sends and inserts are the
classic example. Modelling pre/post as a boolean flag on each element forces a special
case for every element and breaks down as soon as you want two post-fader inserts with a
send between them.

Ardour/Mixbus and Non-Mixer both model the strip as a typed ordered list of processors
where the fader is *itself* a processor in the list; Zynthian's chain model is the same
idea. openmixer's design already stated this thesis.

## Decision

A strip is an **ordered array of processor nodes**, and the **fader is one of them**. The
fader's index defines the pre/post boundary, so pre/post is a *position*, not a flag — any
insert, send, or crossover sits anywhere with no special-casing. Both LV2 inserts and
built-in gain/meter/send nodes present the same minimal module shape (audio in/out,
control ports, latency, bypass, position).

Built today: the per-strip **insert chain** is exactly this — an ordered list of LV2
slots reconciled positionally by \`planChain\` (\`ChainManager\`), where slot order *is* audio
order and an unchanged prefix is never disturbed when you append. The full strip (with the
fader and meter taps as ordered pseudo-modules, and pre/post sends interleaved) is the
design extension of the same structure, landing with the PipeWire-native summing layer.

## Consequences

- Pre/post-fader inserts and sends fall out of ordering — no \`prefader\` boolean scattered
  through the model.
- One reconcile algorithm handles "append an insert", "swap a plugin", and "reorder",
  because matching is positional and order is load-bearing.
- The same module abstraction lets the engine compute per-element latency for telemetry
  ([0013](0013-telemetry-measured-in-the-engine.md)) and delay compensation.
- The UI presents a console-shaped strip (not a raw node graph), compiled down to the
  ordered nodes underneath — keeping the declarative reconcile core
  ([0005](0005-declarative-desired-graph-reconcile.md)).
- Fader and mute changes must **ramp**, never snap (a hard mute clicks); in a filter-chain
  \`linear\`/\`mixer\` node PipeWire's Props smoothing supplies the ramp for free.

## Note — 2026-07-29: the ordered strip beyond inserts landed, in C

This ADR says the full ordered strip "is the design extension of the same
structure, landing with the PipeWire-native summing layer". It landed — in the
native engine rather than as filter-chain nodes (see ADR 0002's 2026-07-29 note),
and the code names this ADR while doing it.
the module doc comment in \`packages/pipewire-native/src/mix_order.h\`:

    The mixer's \`on_process\` used to run the built-in stages in one hardcoded C
    statement sequence (trim-gain → gate → EQ → comp → delay → reverb →
    fader/sum, "fixed this phase, ADR 0006"). This header makes the REORDERABLE
    middle — gate / EQ / comp / delay / reverb — DATA

So the fixed-order caveat this ADR records for the native stages no longer binds:
the middle of the chain is reorderable, the fader's position is not.
`,x=`# 0007 — Persist routing and scenes by node/port name, never by numeric id

Status: Accepted (designed; the principle already shapes the built reconciler)
Date: 2026-06-29

## Context

PipeWire (and JACK) assign numeric object ids to nodes and ports. Those ids are **not
stable**: they change across a restart, and they change when a device is unplugged and
replugged. A stagebox that drops off the network and comes back, an X-Touch reconnected
to a different USB port, the host rebooted between soundcheck and doors — all of these
churn the ids. Any routing or scene that referenced a port by its numeric id would
mis-route or silently fail after such an event. This is precisely when scene recall most
needs to be correct.

## Decision

Persist all routing and scene state **by node-name + port-name (with glob/pattern
matching), and re-resolve to live ids on every scan**. Never store a numeric id.

The model (adopted from ZestBay's MIT \`AutoConnectRule\`): a rule carries a source pattern,
a target pattern, and explicit port mappings; on each scan, cached ids are re-resolved by
pattern, incompatible mappings (MIDI↔Audio) are dropped, and a fallback chain resolves a
port by channel name → identical name → physical index → first available. A scene's
routing is a rule-set; recall is "set the rules, then scan/reconcile". An explicit
per-scene merge-vs-exclusive flag controls whether recall leaves foreign links alone or
disconnects everything not in the rule-set.

## Consequences

- "Restore my patch when the stagebox reappears" works, and scene recall does not
  mis-route after any replug.
- The built reconciler already leans on this: it diffs by name-keyed edges and only tears
  down destinations it manages, so it composes with name-based rules cleanly.
- It requires a settle-time debounce before re-applying rules after a graph change, so a
  burst of PipeWire events does not cause thrashing.
- Plugin instances in a scene carry a logical \`stable_id\` so the chain reconciler can
  diff desired-vs-live by logical identity across id churn, independent of mod-host's
  instance numbers.
- This is the explicit anti-pattern to avoid: **do not** persist by numeric PipeWire/JACK
  id.
`,T=`# 0008 — DCA/VCA is control-domain gain coupling, not an audio sub-bus

Status: Accepted (built — 2026-07-29 note below)
Date: 2026-06-29

## Context

A DCA (or VCA) group gives one master fader control over a set of member channels — pull
the DCA down and every member comes down with it — without changing where any member's
audio is routed. The naive implementation is to route the members into a real sub-bus and
put the master on that bus. That is wrong for a live console: it changes the signal path,
collapses the members into a summed stereo pair, and breaks per-member direct-outs and
sends.

## Decision

A DCA carries **no audio**. It is a control-domain coupling: a member channel's effective
gain is its own fader plus the sum of the dB trims of every DCA it belongs to, pushed to
that channel's own gain node.

\`\`\`
effective_gain(ch) = fader_dB(ch) + Σ DCA_dB(groups containing ch)
\`\`\`

This supports many-masters-per-member and VCA nesting, and mute/solo propagate through the
masters. With faders implemented as node gains
([0002](0002-pipewire-native-summing-mod-host-inserts-only.md)), the coupling is cheap and
exact. The canonical model already carries the \`dca\` channel kind; this ADR fixes how it
is realised.

## Consequences

- Member audio paths, direct-outs, and sends are untouched — a DCA only trims gains.
- "Spill" (show a DCA's members on a surface) is a navigation operation over the
  membership set, not a routing change.
- Solo/mute on a DCA master propagate to members as control-domain operations.
- The trap to avoid, recorded as an explicit anti-pattern: **never** implement a DCA as a
  real audio sub-bus.

## Note — 2026-07-29: built

DCA-as-gain-coupling is implemented as specified. \`packages/audio-engine/src/software-mixer.ts\`
holds the \`dcaRuntimes\` map (\`DcaRuntime\`) and exposes \`dcas()\`; the server side is
\`setDcaFader\` in \`packages/server/src/structural-dsp.ts\`, with the \`dca.members\` /
\`dca.fader\` / \`dca.name\` / \`dca.remove\` behaviour exercised by name in
\`structural-dsp.test.ts\`. No audio sub-bus was introduced — the decision held.
`,S=`# 0009 — C for hot paths, with the PipeWire node as the language boundary

Status: Accepted (built) — the inventory of what is C has grown; see the 2026-07-29 note
Date: 2026-06-29

## Context

openmixer is a TypeScript/Node application, which is the right tool for the control plane,
the canonical model, the server, and the UI. But native REAC has a hard real-time core: a
40-channel frame must be encoded and emitted on a raw \`AF_PACKET\` socket at a rock-steady
cadence (every 125 µs at 96 kHz), with a free-running counter and the right tail bytes, or
the stagebox loses lock and the PA clicks. A GC'd, event-loop language cannot meet that
deadline reliably.

## Decision

Write the **hot path in C** (\`libreac\` / \`reac-pw\`): the frame encoder, the \`cdea\`
master-role state machine, and the \`AF_PACKET\` egress with a \`SCHED_FIFO\` cadence pacer.
Keep **everything else in TypeScript**. The boundary between them is **the PipeWire node**:

- \`reac:capture\` is a PipeWire Audio/Source (stagebox in); \`reac:playback\` is a PipeWire
  Audio/Sink (mix out, re-encoded to REAC).
- openmixer (TS) **never touches a REAC byte**. It only wires the \`reac:capture\` /
  \`reac:playback\` ports into its mix graph via \`pw-link\`.

"C for hot paths, TS for the rest." The same rule explains why structural DSP is
PipeWire-native nodes and inserts are mod-host
([0002](0002-pipewire-native-summing-mod-host-inserts-only.md)): the audio-rate work
happens in compiled, RT-scheduled code, and TypeScript orchestrates it from outside the
audio thread.

Built today: the REAC receive path (\`reac:capture\`) and the frame encoder
(\`reac_tx_build\` + emit, verified by a round-trip test) live in the sibling \`reac-pw\`
repository. The master-role handshake and the dedicated egress pacer are designed and not
yet built.

## Consequences

- The RT deadline is met by code designed for it; the TS side is free to GC, await, and
  block without ever risking an audio dropout.
- The C/TS boundary is narrow and well-defined (named PipeWire ports), so the two sides
  develop and test independently. openmixer can be exercised against any PipeWire device
  while the REAC node is developed separately.
- It requires raw-socket privileges (\`CAP_NET_RAW\`) and RT scheduling on the audio host —
  a deployment constraint, not a code constraint.
- The REAC code lives in a separate repo with its own lifecycle; this monorepo depends on
  the *ports it exposes*, not on its internals.

## Elaboration (2026-06-30)

The original decision named the boundary (the PipeWire node) and gave one example of what
sits below it (REAC). This section settles the general rule, because new work keeps raising
the same question: "should this be C or TypeScript?"

**The boundary is the PipeWire node.** Draw a line at the node and the answer is mechanical.

*Below the line* — per-sample, per-cycle, real-time — is **C**:

- PipeWire's own built-in filter-chain nodes wherever they suffice: summing buses, linear
  faders, biquad EQ/crossover, delay. This is compiled, RT-scheduled DSP we don't write.
- \`mod-host\` plus the LV2 plugins for inserts. Also compiled, also on the audio thread.
- A small C node or helper — the \`reac-pw\` / \`libreac\` pattern — only when openmixer must
  own custom DSP that no off-the-shelf node provides: REAC encode/decode, the \`SCHED_FIFO\`
  cadence pacer, the raw \`AF_PACKET\` egress.

*Above the line* — routing decisions, the desired-graph reconciler, sessions, adapters,
telemetry aggregation, the WS server — is **TypeScript**. The UI is TypeScript.

### Why the control plane is TS, not C

**No audio flows through the control plane.** It computes the desired graph and then issues
*control* commands — \`pw-link\`, \`wpctl set-volume\`, \`mod-host\` \`param_set\`, \`pw-cli
set-param\` — and broadcasts state to clients. These fire at **event rate** (a fader move is
a handful of commands; telemetry is a few hertz), never at sample rate. Every per-sample
operation is already in C: PipeWire, \`mod-host\`, \`libreac\`.

So rewriting the control plane in C would buy **zero audio performance** — the audio thread
is already compiled and RT-scheduled — while costing development speed and testability. The
engine's logic and its ~700 fake-backed tests are cheap to write and run in TypeScript and
would be painful in C. And the failure mode people worry about doesn't apply: a Node GC
pause delays a *control* command by an imperceptible amount; it cannot cause a dropout
because the PipeWire and \`mod-host\` RT threads keep moving audio regardless of what the
control plane is doing.

### Invariant: no per-sample math in TypeScript

Any DSP openmixer must own becomes a C node **at the boundary** — the \`libreac\` pattern —
never per-sample arithmetic inside the TypeScript engine. The engine today already honours
this: it delegates *all* DSP to PipeWire, \`mod-host\`, and \`libreac\`, and never touches an
audio sample itself. This is the line not to cross.

### Control-loop latency note

A round-trip from a hardware surface, to the server (TS), to PipeWire and back is tens of
milliseconds. That is imperceptible for fader and routing changes, and what little of it
could be heard is smoothed by PipeWire Props ramps (see
[\`live-edits-click-avoidance.md\`](../../design/live-edits-click-avoidance.md)). It does not
warrant moving the control plane into C.

## Note — 2026-07-29: the rule holds, the inventory under it does not

The decision — no per-sample math in TypeScript, C below the PipeWire node
boundary, TypeScript above it — is intact and still honoured. Two statements
made *under* it have gone stale in the same direction.

**"Below the line" is no longer just three things.** This ADR enumerates
PipeWire's built-in filter-chain nodes, \`mod-host\` plus LV2, and "a small C node
or helper — the \`reac-pw\` / \`libreac\` pattern — only when openmixer must own
custom DSP that no off-the-shelf node provides". openmixer now owns a large body
of in-monorepo C that is none of those: the mixer node itself
(\`packages/pipewire-native/src/mixer.c\`, \`mixer_rt.c\`, \`mixer_strip.c\`,
\`mix_dsp.h\`), the reverb kernels (\`mix_reverb.h\` — Freeverb room and Dattorro
plate), the delay kernel (\`mix_delay.h\`), the RTA/FFT tap
(\`mix_dsp.h\`, \`struct omx_rta_tap_snap\`) and RT load metering
(\`struct omx_rt_load\`). That growth is the ADR's own escape clause taken
repeatedly, not a violation of it — but the list reads as exhaustive and is not.

**"It delegates *all* DSP to PipeWire, \`mod-host\`, and \`libreac\`, and never
touches an audio sample itself"** was true of the engine in 2026-06 and is now
false: the engine's own C touches every sample. The boundary the sentence was
defending — *TypeScript* never touches a sample — is still absolute.

The "~700 fake-backed tests" figure is stale too: \`packages/audio-engine/src\`
alone carries 993, and the repo 6280 across 452 test files. The argument the
figure supports is unaffected.

The REAC status in the header ("handshake/pacer designed") described the sibling
\`reac-pw\` repo; the master-role handshake is since verified against a real
Roland S-0808 on the development rig: cold-connect through grant to the box's own
\`ESTABLISHED\` state, a steady 1/s heartbeat, and zero drops.
`,A="# 0010 — An auto-generated, metadata-driven plugin editor\n\nStatus: Accepted (built)\nDate: 2026-06-29\n\n## Context\n\nopenmixer hosts arbitrary LV2 plugins (LSP, Calf, Zam, …), each with its own set of\ncontrol ports — knobs, toggles, enumerations, log-scaled gains, file paths. The\nEasyEffects approach is to hand-code one UI and one preset class per effect. That does not\nscale to \"any installed plugin\" and welds the UI to a fixed plugin set.\n\nLV2 already carries, in each plugin's Turtle metadata, everything needed to render the\nright control: range, default, integer/toggle/enumeration/logarithmic/trigger flags, scale\npoints, and the unit symbol. Carla, MOD-UI, Non-Mixer and Zynthian all independently\nconfirm that a single metadata→widget decision table is the right abstraction.\n\n## Decision\n\n**One decision table, no per-plugin UI code.** A `lilv` scanner (`scan.py`) introspects\ninstalled plugins into `PluginDescriptor`s; a single `widgetFor(param)` function maps each\nparameter's metadata to a widget kind (`knob`, `logKnob`, `toggle`, `button`, `stepper`,\n`dropdown`, `filepath`, `text`, `readout`); the web UI renders that widget generically. A\ncurated palette intersected with what is actually installed gives the operator a quality\nshortlist, while the full scan stays searchable.\n\nThis is built end to end: `scan.py` → `@freemixer/catalog` (`widgetFor`, `Catalog`,\ncurated palette) → the web UI's `ParamControl` and its widget components, with no\nplugin-specific code anywhere.\n\n## Consequences\n\n- Any installed LV2 plugin gets a usable editor for free; adding a plugin to the palette\n  is a one-line catalog entry, not a new component.\n- The same descriptor metadata drives the editor, the mod-host `param_set` calls, and\n  (designed) the MCU encoder labels and scribble strips — one introspection pipeline,\n  many surfaces.\n- Bypass and preset selection can be modelled as synthetic `:bypass` / `:presets` pseudo\n  control ports so the *same* widget pipeline renders them with no special-case UI\n  (designed; the server already has `setBypass` / `loadPreset`).\n- It depends on plugins providing honest LV2 metadata; where a port lacks a range or\n  unit, the editor falls back to a plain readout rather than guessing.\n- The explicit anti-pattern: do **not** hand-code per-plugin UIs. Per-plugin overrides are\n  permitted only as optional *data* (labels, grouping), never as code.\n",P=`# 0011 — Faders are a 0..1 position plus dB, with a per-adapter scale

Status: Accepted (built)
Date: 2026-06-29

## Context

A fader value means different things on different desks. A Midas or X32 fader is already a
normalised 0..1 control; a software gain is dB-native; an M-5000 has its own taper. The
surface wants one consistent representation it can draw and the operator wants to see exact
dB. If the canonical model committed to one device's units, every other adapter would have
to lie.

## Decision

The canonical \`FaderLevel\` is \`{ position, db }\`: an **opaque 0..1 surface position**
(1 = top of throw) with **dB carried alongside as a derived read**. The mapping between
them — the taper — is owned by each adapter through a \`FaderScale\`
(\`positionToDb\` / \`dbToPosition\`). The device-raw value never appears in the model; it
stays private to the adapter.

\`NormalizedScale\` is the default (used by the Midas and X32 adapters, whose faders are
already normalised). An adapter with a real measured taper supplies its own \`FaderScale\`
without changing the model or the surface.

## Consequences

- The surface draws and reasons in one unit (0..1) and shows dB next to it, identically for
  every device.
- A *send* is just a fader at an input × output intersection — same \`FaderLevel\`, same
  scale machinery, no separate type.
- Exact-dB entry (type a number into a fader) maps cleanly through \`dbToPosition\`, which
  the multi-modal input design relies on
  ([0014](0014-multi-modal-input.md)).
- The dB shown for a normalised desk is an approximation over a generic throw until that
  desk's true taper is measured and supplied as a \`FaderScale\` — honest, and overridable
  per desk without churn.
- The web UI carries its own client-side taper (\`db.ts\`) for the demo/offline path; in live
  use the server-derived dB from the adapter's scale is authoritative.
`,z='# 0012 — Menus and config files are two front-ends to one AdapterManager\n\nStatus: Accepted (built — 2026-07-29 note below)\nDate: 2026-06-29\n\n## Context\n\nAn operator needs to plug in I/O endpoints and consoles/surfaces (a PipeWire device, a\nREAC stagebox, an X32, an MCU) two ways: from a **GUI menu** at the gig ("found a\nstagebox — add it"), and from a **config file** checked into the rig setup ("these are my\nendpoints, start them on boot"). The dangerous design is to build those as two separate\ncode paths that can disagree — the menu adds an adapter the file does not know about, or\nediting the file does something subtly different from using the menu.\n\n## Decision\n\n**One `AdapterManager` is the single source of truth, and menus and files are two\nfront-ends to it and to the same persisted config.**\n\n- On start, the manager reads `config/adapters.{yaml,json}`, instantiates each `enabled`\n  adapter via a `type → factory` registry, and tracks status.\n- The web UI add/edit/remove menu calls WS verbs (`adapter.add/update/remove/list/types`);\n  the manager applies the change *and persists it back to the same config file*.\n- Editing the file and restarting yields the identical end state. There is no second code\n  path.\n- `adapter.types` returns a per-type `settingsSchema` so the menu form is rendered\n  generically — the same metadata→widget idea as the plugin editor\n  ([0010](0010-metadata-driven-plugin-editor.md)), so there is no per-adapter-type UI code.\n- Discovery feeds the same manager: a found device → `discovery.addAsAdapter` →\n  `AdapterManager.add` → persisted → started. Same end state as hand-editing the file.\n\nToday the server loads a **single** adapter chosen by environment variables\n(`OPENMIXER_ADAPTER`), via a lazy package loader. The multi-adapter `AdapterManager`, the\nconfig file, and the `adapter.*` / `discovery.*` WS verbs are designed and not yet built.\n\n## Consequences\n\n- The menu and the file can never drift, because they are the same state and the same\n  persistence — "no second code path" is the whole point.\n- Reproducible rigs: the gig setup is a file you can version, diff, and restore; the menu\n  is just a live editor for it.\n- A new adapter type is a factory registration plus a settings schema; the menu form and\n  the file format both pick it up with no UI work.\n- Probes must degrade (a missing NIC disables that probe with a logged reason, never\n  crashes discovery), so the manager always starts even on a partial rig.\n\n## Note — 2026-07-29: built, all three parts\n\nThe Context paragraph "The multi-adapter `AdapterManager`, the config file, and\nthe `adapter.*` / `discovery.*` WS verbs are designed and not yet built" is no\nlonger true of any of the three, though the WS verbs it names were later deleted\noutright rather than built — the REST entity map replaced them:\n\n- `AdapterManager` — the class in `packages/server/src/adapter-manager.ts`.\n- the config file — `startConsole` in `packages/server/src/console-rig.ts` resolves\n  `OPENMIXER_ADAPTERS_CONFIG` or `<stateDir>/adapters.yaml`; an example ships at\n  `packages/server/config/adapters.example.yaml`.\n- the verbs — `buildAdapterAdminRows` (`packages/server/src/adapter-admin-rows.ts`) and\n  `buildDiscoveryRows` (`packages/server/src/discovery-rows.ts`) build the `/adapter/*`\n  and `/discovery/*` REST rows; `packages/server/src/server.ts` is what registers them\n  into the resource registry.\n\nThe per-type `settingsSchema` this ADR predicted is real too\n(`xtouchRegistration` in `packages/adapter-xtouch/src/control-surface.ts`,\nand `AdapterManager` in `packages/server/src/adapter-manager.ts`). The single-adapter\n`OPENMIXER_ADAPTER` env path still exists alongside it.\n',C=`# 0013 — Latency telemetry is measured in the audio engine

Status: Accepted (built — 2026-07-29 note below)
Date: 2026-06-29

## Context

A live operator needs to know the **exact latency** each step and each plugin adds, in
real time — to manage delay compensation, to align the PA against the stage, to spot a
plugin that just blew the monitor-path budget. Latency could be *estimated* in the UI from
plugin nameplate figures, but that is a guess: the real numbers depend on the live graph —
the quantum, the sample rate, each plugin's reported latency port, and how many async links
a path crosses.

The audio engine is the only component that owns the graph and can read those numbers
directly.

## Decision

**Measure latency in the audio engine**, at its source, and stream it out — do not estimate
it elsewhere.

- **Per plugin** — read the LV2 \`lv2:latency\`-designated output port where the plugin
  reports it (mod-host exposes the port value). Where a plugin does not report, mark it
  \`0\`/unknown — do not guess.
- **Per step/node** — PipeWire node processing latency, plus the base buffering latency
  \`quantum / sampleRate\` per link.
- **Per path** — sum input → inserts → bus → output in milliseconds, with the per-element
  breakdown retained.
- **Health** — xrun/underrun counter, current quantum and sample rate.

The engine exposes \`getLatencyReport()\`; the server polls it a few times a second and
broadcasts \`telemetry.*\`; the UI shows a per-channel total badge that expands to the
per-plugin/per-step breakdown, with the mains/monitor path shown prominently and a live
xrun counter.

## Consequences

- The numbers are real, not nameplate estimates, because they come from the live graph.
- It is the natural place for delay compensation to live too: the engine that measures the
  per-path latency is the one that inserts \`delay\` nodes where parallel paths reconverge.
- Telemetry is a low-rate, separate stream (a few Hz), kept off the per-control message
  path — meters and latency do not bloat every fader frame.
- It depends on plugins honestly designating their latency port; unknown is surfaced as
  unknown, which is the honest failure mode.
- Verifying real PipeWire/plugin latency values needs the actual mixing host; this is a
  documented test gate, not something CI can assert without hardware.

## Note — 2026-07-29: built

\`getLatencyReport()\` is a real contract (the \`LatencyReportSource\` interface in
\`packages/core/src/telemetry.ts\`) with a real implementation in the engine
(\`SoftwareMixer.getLatencyReport\` in \`packages/audio-engine/src/software-mixer.ts\`), and
the periodic report is polled by \`TelemetryBroadcaster\`
(\`packages/server/src/telemetry.ts\`) and served at \`GET /telemetry/latency?watch=1\`.
Measurement stays in the engine, as decided.
`,E=`# 0014 — Touch, keyboard, mouse and surface are all first-class input

Status: Accepted (built for the web surface; hardware surface designed)
Date: 2026-06-29

## Context

The same mix is driven by an operator's finger on a stage-lit tablet, by a mouse and
keyboard at a laptop, and — designed for S3 — by motor faders on an X-Touch. If any one of
those is a second-class afterthought, the operator is forced into the others at the worst
moment. A touch-only widget cannot be reached from the keyboard; a mouse-only readout is
useless on a tablet; a control with no exact-value entry frustrates an operator who knows
the dB they want.

## Decision

**Every control must be operable by touch, keyboard, mouse, and (designed) a hardware
surface — none of them second-class.** All four write to the one server
([0003](0003-server-single-source-of-truth.md)) and every surface re-renders from the
broadcast, so they always agree.

- **Touch** — large hit targets, generous spacing, drag faders/knobs, usable under stage
  light (high contrast). The live-gig view is designed touch-first.
- **Keyboard** — full tab/arrow navigation with a visible focus ring; arrows fine-step,
  PageUp/Down coarse-step, Home/End jump to the ends, Enter snaps a fader to unity / a pan
  to centre / a knob to default; and exact-value entry where the operator wants a figure.
- **Mouse** — pointer affordances, wheel to adjust, Shift for fine, double-click to
  reset-to-default.
- **Surface** — MCU/X-Touch motor faders/encoders/scribble as bidirectional clients
  (planned as S3; built — \`packages/adapter-xtouch/\`).

Audio-domain conventions are honoured: a proper dB fader law (not linear), meter
ballistics with peak-hold and clip, ramped mute (no click). Accessibility is not optional:
ARIA roles and names on every control, keyboard-reachable, no touch-only or mouse-only
widgets.

This is built in the web UI today: faders, knobs, pan, steppers, toggles and buttons each
support pointer-capture drag, wheel (with Shift modifier), the full key set above, and
double-click reset, and each carries a \`role="slider"\`/\`spinbutton\`/\`switch\` with an
\`aria-valuetext\` in engineering units. The hardware-surface modality was the S3 design
and is now built (see the 2026-07-29 note).

## Consequences

- The operator uses whatever is to hand without losing capability — finger, mouse, key, or
  fader.
- It constrains every new control: it ships with keyboard handlers, wheel handling, an ARIA
  role, and a sensible reset, or it is not done. The pointer-capture pattern lets a drag
  continue when the pointer leaves the widget.
- Continuously-changing meters are marked decorative (\`aria-hidden\`); the fader's dB
  readout is the accessible level surface, so screen readers are not spammed.
- Exact-value entry leans on the per-adapter fader scale
  ([0011](0011-fader-position-and-db-with-per-adapter-scale.md)) to convert a typed dB to a
  position.

## Note — 2026-07-29: the hardware-surface modality is built

The module doc comment in \`packages/adapter-xtouch/src/index.ts\` — the Behringer
X-Touch and X-Touch Mini
"translating surface gestures into canonical ops and canonical state back into
motor faders, LEDs, V-Pot rings, scribble strips and meters". It is the largest
adapter in the repo. The decision — every modality is a first-class client of the
same canonical intents, none privileged — is what let it drop in without a new
control path.
`,R=`# 0015 — A modular, single-process, multi-window web UI

Status: Accepted (built, including in-app window management — 2026-07-29 note below)
Date: 2026-06-29

## Context

A real front-of-house setup is not one screen. The operator wants the fader wall on the
main display, a plugin editor on a second monitor, meters and latency on a tablet, and a
phone on stage for monitor mixes — several windows and screens, several devices, all live
and all agreeing. The question is how to structure the UI so those views are independent
without becoming independent *applications* that drift apart.

## Decision

Build the UI as **modular view components over one shared, server-synced state**, so a
window is a *composition of modules*, not a separate app. Because the server is the single
source of truth ([0003](0003-server-single-source-of-truth.md)), every window — same
device or another — is just one more thin client that sends intents and re-renders from the
broadcast. Synchronisation across windows is therefore free: there is nothing to reconcile
between them, only between each window and the server.

The web UI is already factored this way: a fader wall, a per-strip insert rack, an
auto-generated plugin editor, and meter widgets are independent components driven by
module-scoped composables (\`useMixer\`, \`useInserts\`, \`useCatalog\`, \`useTheme\`) over the
server's REST entity API (with \`?watch=1\` SSE for live rows), plus the legacy WebSocket
for what has not yet moved off it — either way, one connection per client to the one
authoritative server.

Today, "multi-window" is achieved by **opening the surface on several windows, tabs, or
devices at once** — each an independent client the server keeps in sync. An *in-app*
window/screen manager (assign which modules show on which screen, save that layout
per-show) is designed but not yet built; the modular component structure and the
single-source-of-truth server are the substrate it will sit on.

## Consequences

- Multiple synchronised views work today with no extra machinery — open more clients.
- Windows stay in agreement by construction, because none of them is authoritative; the
  server is.
- The path to a real multi-window manager is additive: compose the existing modules into
  named layouts and persist them, not re-architect the UI.
- A single shared connection and module-scoped state keep memory and message traffic
  reasonable as windows multiply; meters are a separate low-rate stream so extra views do
  not multiply per-control chatter.
- The same modules are reused by the live-gig view, the plugin configurator, and (designed)
  the surface-assignment UI — one component set, many compositions.

## Note — 2026-07-29: the in-app window manager is built

"An *in-app* window/screen manager (assign which modules show on which screen,
save that layout per-show) is designed but not yet built" now describes shipped
code, point for point:
\`packages/web-ui/app/modules/LayoutManager.vue\` composes, saves, switches,
duplicates and pops out window layouts; \`app/utils/layout.ts\` is the pure data model
and \`useLayout\` (\`app/composables/useLayout.ts\`) persists a layout per show with the
session; the dock substrate is \`useLayout.ts\`, \`useDockContext.ts\`,
\`DockShell.vue\`, \`DockRegion.vue\`, \`DockPanel.vue\`, \`WindowView.vue\` and
\`utils/dock.ts\`.
`,M=`# 0016 — GPL-3.0-or-later, with no AGPL code copied in

Status: Accepted (built — it governs every borrow)
Date: 2026-06-29

## Context

openmixer leans heavily on the open-source audio ecosystem: PipeWire filter-chains,
jack_mixer's bus/send model, Ardour/Non-Mixer's strip model, ZestBay's persistence, CSI's
surface factoring, libebur128's metering, and protocol facts for MCU/X32. Reusing them well
requires a clear, consistent licence policy — both to stay compliant and to decide, per
source, whether to copy code or only learn from it.

A specific hazard: the projects whose *designs* fit openmixer best — MOD-UI's plugin
editor ideas, Eyevinn/audio-mixer's REST-over-WebSocket protocol, Zrythm's sectioning — are
**AGPL-3.0**. AGPL adds a network-use obligation that openmixer, a GPL-3 project, does not
carry. Copying AGPL code in would impose that obligation on the whole codebase.

## Decision

openmixer is **GPL-3.0-or-later**, © Pau Aliagas. The borrow rules, applied throughout:

- **MIT / BSD** — copyable directly.
- **GPL-2.0-or-later** — copyable (the "or-later" upgrades to GPL-3).
- **GPL-3.0** — copyable.
- **AGPL-3.0** — **not** copyable. Study the architecture/algorithm and re-implement clean.
  Flagged per item in the borrow brief.
- **Protocol facts** (MCU, X32 OSC, MIDI) — not copyrightable; implement freely.

So MOD-UI's \`:bypass\`/\`:presets\` idea and log-knob math, Eyevinn's resource-path WS shape
and PFL-as-bus design, and Zrythm's sectioning are taken as **ideas only** and written
fresh; jack_mixer, Ardour, Non-Mixer (GPL-2-or-later), CSI (GPL-3), ZestBay and libebur128
(MIT) may be copied with attribution.

## Consequences

- openmixer never acquires the AGPL network-use obligation, because no AGPL code is copied
  in — only re-implemented designs.
- Every borrow must be licence-checked before code is copied; "shape only, re-implement" is
  a recurring, deliberate cost for the best-fitting (AGPL) designs.
- Bundled third-party data carries its own attribution (e.g. the Midas parameter map from
  the community \`midas-pro-series-osc-commands\` project, credited in
  \`packages/adapter-midas/data/CREDITS.md\`).
- The explicit anti-pattern: do **not** copy AGPL code (MOD-UI, Eyevinn/audio-mixer,
  Zrythm) — ideas, algorithms and shapes only, re-implemented clean.
`,I=`# 0017 — A per-destination output trim, not multiple mains, is the output-gain floor

Status: Accepted. Layer 1 is built and audibly driven; layer 2 (native matrix summing) is
built and live; layer 3 is sequenced.
Date: 2026-07-13

## Context

A bus's physical routing is bare, full-scale links: \`pw-link\` (or the native node's output
port) straight to a sink, at whatever level the bus master happens to sit. That is fine when a
bus feeds ONE destination. It is not fine when a bus fans out to several — the exact situation
that bit the operator.

**The 16 dB incident (2026-07-13).** A bus was fanned to two physical destinations at once: a
stagebox monitor feed **and** the operator's RME feed. The RME feed carried a −10 dB desktop
softvol of its own; the box path had **no gain control at all**, plus an unchosen stereo→mono
fold that summed both legs at unity (+6 dB). The monitor feed therefore ran **~16 dB hotter**
than the RME feed, and nothing on the console could pull it down — the level lived entirely
outside the mix (in a desktop mixer on one path, and nowhere on the other).

The hard constraint this exposes: **it must NEVER be impossible to send a *controlled* gain to
a physical destination.** A destination with no console-side level is a trap — the operator
reaches for a fader that does not exist.

The tempting "fix" is **multiple mains**: give the console N master strips, one per
destination, each a full fader/mute/pan. It is the wrong shape. N mains means N×(fader + mute +
pan) per channel, an N-fold scene explosion, and a control-surface layout that has to bank
across masters that are almost always moved together. The console already has the right
primitives for "the same mix at N controlled levels": DCAs
([0008](0008-dca-as-control-domain-gain-coupling.md)) couple gain across members without a
sub-bus, and matrices sum buses/mains into independent outputs. Multiplying the master is not
the canon answer; a per-destination trim plus matrices is.

## Decision

Answer the output-gain floor in **three layers**, weakest-coupling first.

### Layer 1 — a per-destination output trim (this ADR, built)

Every output route — the primary AND each fan-out extra — grows from a bare port list to an
**\`OutputRoute\`**: \`{ ports, trimDb?, mute?, monoFoldDb? }\`. Absent fields read as
unity / un-muted / the default fold, so every existing session (which persisted bare port
arrays) loads losslessly and, until an operator sets a trim, nothing changes on disk or in the
signal path.

- **Model** (\`@freemixer/core\`). \`OutputSnapshotJson.routeTo\` / \`extraRouteTo\` carry the new
  shape; \`normalizeOutputRoute\` reads the legacy bare-array form as a unity route. The
  stereo→mono fold carries a **−6 dB-per-leg default sum law** (\`monoFoldDb\`), so a correlated
  L≈R signal folds to ~unity instead of the +6 dB that bit the operator — kept as a route-model
  coefficient so the per-leg-choice UI can override it per destination.
- **Native DSP** (\`packages/pipewire-native\`, \`mixer.c\` + \`mix_dsp.h\`). The native mixer node's
  MAIN output fans to per-destination **output routes**, each a gain+mute+fold stage applied
  POST bus-master **at the fan point** — a word-atomic parameter like the existing master gain,
  ramped click-free by the same \`omx_fill_gain\` / \`omx_apply_master\` discipline (no zipper
  noise). Route 0 (the primary) reuses the node's own \`out_L\`/\`out_R\` and is trimmed in place,
  skipped at unity so the common single-route path stays byte-identical; extras get their own
  \`out_<idx>\` ports. A mono destination folds L+R with \`omx_fold_gain\` at the −6 dB coefficient.
- **Server**. \`SoftwareMixer.setBusOutputTrim\` / \`busOutputTrimOf\` store a per-(bus, sink) trim;
  the session capture writes a bare array at the unity default (zero churn) and the object shape
  once trimmed; a \`patchbay.outputTrim\` WS command sets one destination's trim and broadcasts
  the crosspoint state with each cell's trim.
- **Web UI**. Each active output crosspoint cell carries a compact dB + mute affordance — the
  crosspoint stays a patch tick, the trim edits in a small inline editor. Scope is trim + mute;
  no EQ/delay.
- **Reconcile drive** (phase 2, built). The model half above is now made AUDIBLE: the native
  reconcile (\`rebuildDesiredNative\`, and every path that lays output links, including the
  sink-reappearance re-route) lays each **extra** destination on its OWN native \`out_<idx>\` port
  pair — never the shared \`out_L\`/\`out_R\` — and pushes every route's trim/mute/fold into the C
  route table (\`mixerSetOutputRoute\`): the primary (route 0) trimmed in place, on session load AND
  on every live \`patchbay.outputTrim\` change (not only at creation), each extra on its own route.
  Route add/remove drives \`mixerAddOutputRoute\`/\`mixerRemoveOutputRoute\` idempotently, so a
  session load re-creates the same ports deterministically across engine restarts.
  **Unity semantics** hold: a show with no trims pushes unity/un-muted on every route and keeps
  the primary path byte-identical (an extra MAY move to its own port at unity gain — a stereo
  extra is a bit-identical copy; a mono destination now folds at the −6 dB-per-leg default
  instead of the pre-trim +6 dB sum, which is the incident fix, not a regression).
  **Loopback path**: a per-destination output trim there would have needed a gain node per
  fan-out edge (a \`pw-link\` carries no gain), so it was recorded here as a **native-only
  feature**. Moot since 2026-07: the loopback topology and its \`OPENMIXER_NATIVE_MIXER\` gate
  are deleted, the native mixer always owns the graph, and the trim is always applied.

### Layer 2 — matrix buses as first-class output strips (sequenced next; SUPERSEDES the fan-out)

The structural "outputs like main": a matrix is a mix of buses/mains feeding its own output,
with its own fader/EQ/inserts — the model half already exists
(\`MatrixSnapshotJson\` / \`MatrixSpec\`). Promoting matrices to full first-class strips gives the
operator N *independent* outputs with full processing, which is the right home for a
destination that needs more than a trim (a delayed fill, a broadcast feed with its own
limiter). Layer 1's per-destination trim is the floor under this; matrices are the ceiling.

**Supersession plan.** The layer-1 \`extraRouteTo\`
fan-out — one MAIN output fanning to several destinations, each with a patch-edge trim — is
**TRANSITIONAL**. Layer 2 REPLACES it: **each destination becomes a MATRIX strip fed from MAIN
at unity**, and the route's \`trimDb\` **migrates to that matrix's fader** (the proper, recallable,
control-surface-bankable level, with EQ/delay/limiter available on the same strip). Once a
destination is a matrix, the patch-edge trim is no longer the destination's *level* — it remains
only as the **final safety on the matrix → physical-port patch** (the "controlled gain must
always exist" floor, now a backstop under the matrix fader rather than the primary control). So
the phase-2 \`out_<idx>\` fan-out is the mechanism that keeps every destination controllable
*today*, deliberately built to be retired into matrix strips — not a parallel long-term routing
model. **Multiple mains stays explicitly rejected** (below): the answer to "N controlled
destinations" is N matrices fed from the one MAIN, never N master strips.

**Migration mechanism — retired.** A promotion surface
(\`promoteOutputToMatrix\` / the \`output.promoteToMatrix\` verb) existed to convert a MAIN
\`extraRouteTo\` destination into a matrix. Its only input was the extras list, and the
one-destination-per-bus rule made that data impossible: a bus goes to ONE place, and
fanning to several IS a matrix (\`usePatchbay.ts\`, operator ruling 2026-08-06). The surface, its
row, its broadcast and its debt entries were deleted; allocation now follows the one-summing-bus
one-summing-bus model. A pre-matrix session still loads —
\`extraRouteTo\` survives only as fixture history.

**Layer 2 native summing, built.** The matrix strip
is now a real native DSP stage, not just a model. On the MAIN mixer node
(\`packages/pipewire-native/mixer.c\`) each allocated matrix is a \`struct omx_matrix\`: a
fixed-size per-source **send coefficient table**, its own **fader/mute/balance** stage (the
master stage reused — \`omx_strip_eff\` × \`omx_balance_law\` → \`omx_apply_master\`), and its own
output ports \`mtx_<i>_L/_R\`. In \`on_process\` the matrix stage taps the **post-master MAIN mix**
(\`busL/busR\`, read before the primary route trims it in place, exactly like the \`extraRouteTo\`
extras), sums it via \`omx_mix_strip\` at the matrix's MAIN send coefficient, applies the matrix
fader/mute/balance, meters it, and writes its ports. **What flows natively today:** a matrix
fed from MAIN (send slot 0 — the loader default \`sources: [MAIN_BUS_ID]\`). Higher send slots
store + round-trip a level but carry no native audio yet, because the aux/mix buses that would
feed them live in other nodes / on the loopback path — they become native taps when those
buses are native (no table resize needed; the slots already exist). Mono matrices are deferred
(stereo only this phase). The matrix output patches through the existing crosspoint and
stays trim-guarded by the layer-1 floor on the final \`matrix → physical-port\` edge — the
supersession plan's "backstop under the matrix fader" made concrete. N-API verbs:
\`mixerAddMatrix\` / \`mixerSetMatrix\` / \`mixerSetMatrixPoint\` / \`mixerRemoveMatrix\` /
\`mixerMatrixMeters\`; \`mixerInfo\` reports each matrix's ports; the engine wraps them as
\`NativeConsoleMixer.{addMatrix,setMatrix,setMatrixPoint,removeMatrix,matrixMeters}\` +
\`syncMatrices(count)\` / \`matrixOutputNames()\` (declarative reconcile, mirroring
\`syncExtraRoutes\`).

**Consistency with DCAs + mute groups.** A matrix send is the
**membership-with-level** idiom the console already uses: a DCA is membership + a fader, a mute
group is membership + an active flag, and a matrix is its **sources** as members each at a
per-send level — same schema shape in \`@freemixer/core\`, same \`X.point\` / \`X.set\` WS verb
family, same SEL-driven sends-on-faders assignment flow in the UI. A matrix is NOT a third
pattern; it is the DCA/mute-group membership shape applied to *audio sends into an output
strip*.

**Send-groups seam (follow-on, NOT built).** A send group — grouped adjustment of several
channels'/sources' sends, a DCA-like overlay on send *levels* — attaches cleanly here: the
level pushed to \`NativeConsoleMixer.setMatrixPoint\` (and the native coefficient table) is
already the **resolved** per-send coefficient, so a group offset layers *above* the per-send
value at the TS resolve step (\`effective = memberSend + groupOffset\`, the DCA pattern applied
to sends) without changing the native table or the persisted per-send levels. That is where a
future \`send.group\` overlay would compute its contribution.

### Layer 3 — reac-pw sink volume Props (transport defense in depth)

The reac-pw transport sink also exposes a PipeWire volume via node \`Props\`, so a controlled
level survives even below the console model — a last-resort floor at the wire, independent of
whether the mix model is loaded. Belt-and-braces for the "controlled gain must always exist"
constraint, not the primary control surface.

### Rejected — multiple mains

N mains = N×(fader/mute/pan) per channel and a scene / control-surface explosion, for a need
that DCAs + matrices + a per-destination trim already cover. Not built, not planned.

## Consequences

- The hard constraint holds: a physical destination is never uncontrollable — its trim is on
  the crosspoint, persisted, and applied in the engine at the fan point.
- Lossless back-compat: a pre-trim session (bare port arrays) loads as unity/un-muted, and an
  untrimmed route re-captures as a bare array, so shows written before this feature are
  byte-stable.
- The native fan point is the one place per-destination gain lives, so metering, RTA and clip
  detection stay on the shared post-master mix (the console's actual output), while each
  destination is scaled downstream of them — the meter reads the mix, the trim shapes the feed.
- The −6 dB mono-fold default fixes the specific +6 dB the incident carried, while leaving the
  per-leg choice a clean override point.
- Layers 2–3 are additive: matrices and the transport-sink volume slot under the same
  \`OutputRoute\` model without re-litigating the floor.

## Note — 2026-07-29: the back-compat consequence did not survive; two symbols moved

The decision — one per-destination trim/mute/fold on the route, rather than
multiple mains — stands and is built. Three specifics in this ADR no longer match
the code.

**"Lossless back-compat" is the opposite of what shipped.** This ADR promises "a
pre-trim session (bare port arrays) loads as unity/un-muted … so shows written
before this feature are byte-stable", and describes \`normalizeOutputRoute\` reading
"the legacy bare-array form as a unity route". The code took a deliberate clean
break instead — the module doc comment atop \`packages/core/src/output-route.ts\` reads:

    FORMAT (greenfield, clean break). … The earlier POSITIONAL shape (a bare
    \`[l]\`/\`[l, r]\` array or \`{ ports }\`) is **NOT read back** — a session written
    by an older build **drops its output routes on load** (authorized: no migration).

An operator reading this ADR would believe an older show file still loads its
routing. It does not.

**\`normalizeOutputRoute\` no longer exists** anywhere in \`packages/*/src\`. The
accessors are \`outputRouteTrimDb\` / \`outputRouteMuted\` / \`outputRouteDelayMs\`
(all in \`packages/core/src/output-route.ts\`).

**The route shape is role-keyed, not positional.** \`{ ports, trimDb?, mute?,
monoFoldDb? }\` is now \`{ L?, R?, trimDb?, mute?, delayMs? }\`, the \`OutputRoute\`
type in \`output-route.ts\` — note \`delayMs\`, which post-dates this ADR.

**THE FOLD IS NO LONGER A NUMBER ON THE ROUTE** (operator ruling 2026-09-07, spec
\`docs/design/specs/2026-07-16-per-leg-output-routing.md\` amendment 2026-09-07b).
\`monoFoldDb\` and its \`outputRouteMonoFoldDb\` accessor are GONE, and with them this
ADR's "kept as a route-model coefficient so the per-leg-choice UI can override it
per destination" — that override is exactly what the ruling withdraws. The figure
is \`MONO_FOLD_COEF = 0.5\` in \`output-route.ts\`, declared once: correlated content
sums to \`2 L\`, so the coefficient that lands it at unity is the reciprocal of that
sum and is not a per-destination choice. WHETHER a destination folds is its
endpoint's shape — both roles on one physical port — published as the boolean
\`monoFold\` on the leg row and derived from the profile-RESOLVED sink.

Two smaller drifts: mono matrices are no longer deferred — width is per matrix, via
\`syncMatrices(lanes: readonly NativeMatrixLane[])\` (each lane carries its own
\`channels: 1 | 2\`) in \`packages/audio-engine/src/native-mixer.ts\`, a signature that has
moved twice since this ADR and will likely move again; and the native files live under
\`packages/pipewire-native/**src**/\`, with the route table since split out into
\`mixer_route.c\` / \`mixer_route.h\`.
`,D=`# 0018 — clock.force-rate is the live re-clock lever; the reported rate is measured from hardware

Status: Accepted and built.
Date: 2026-07-15

## Context

The graph-clock controller was built on a belief stated ~6× in its own comments:
\`clock.force-rate\` is *inert* on a running PipeWire graph. Acting on that, it wrote
\`force-rate\` "best-effort" but reported the graph rate by reading the **\`clock.rate\`** metadata
key back — the graph *target*, which does not move. On the rig this meant the controller
forced the RME to 48 kHz while **reporting 192 kHz**, and an operator's 192 kHz pick "silently
no-op'd". The "inert" verdict was itself a measurement error: it read the wrong metadata key.

## Decision

- **\`clock.force-rate\` IS the live re-clock lever.** Proven live on the RME Babyface Pro:
  writing it drove the driver 96 → 192 → 48 kHz instantly, no restart (target rate must be in
  \`clock.allowed-rates\` first — a force outside it is dropped silently).
- **The reported/effective rate is MEASURED from hardware** — the ALSA driver's \`Momentary
  freq\` in \`/proc/asound/card<N>/stream0\` (resolved from the default sink's card), snapped to a
  standard rate — never the \`clock.rate\` metadata proxy.
- **Device-supported rates drive the UI menu** (\`clock.state.supportedRates\`, probed from the
  card), not a hardcoded list.
- **Persistence is two-layer:** a managed \`pipewire.conf.d\` drop-in (\`default.clock.rate\`) so a
  cold PipeWire start opens at the picked rate, plus a **boot re-assert** (the server re-forces
  the persisted rate if the live driver has drifted).
- Pure parsers + the probe live in a dependency-free leaf (\`clock-rate-parse.ts\` /
  \`clock-rates.ts\`), separate from the IO probe (\`clock-device-rates.ts\`).

## Consequences

- Rate reporting is honest; 192 kHz is reachable and holds across engine + PipeWire restarts.
- The old "restart audio to apply" UI note becomes a *rare driver-refused* signal, since a pick
  normally applies live.
- The controller measures, it never trusts a metadata echo — the same "measure, don't declare"
  principle ADR 0020 applies to plugin latency.
- Superseded belief: the earlier "force-rate is inert" assumption is wrong on this hardware and
  is purged from the code.
`,L=`# 0019 — Cue/solo is a monitor bus; the monitor auto-takeover is NEVER the mains

Status: Accepted and built; live acceptance pending.
Date: 2026-07-15

## Context

Solo on the console was decorative — no DSP behind it. A professional desk needs **cue/solo to
a monitor** (headphones/monitor wedge) so an engineer can audition a channel without changing
what the audience hears. The first implementation wired the monitor auto-takeover to a MAIN
output route without a guard, so soloing could crossfade the **house mix** to the solo — sending
PFL to the audience.

## Decision

- **A native cue bus** sums the soloed taps: **PFL** (pre-fader, the default), **AFL** (post-
  fader + pan, a global toggle), **SIP** (solo-in-place — mutes non-soloed on the main, an
  explicit mode). Plus **solo-safe** (SIP-exempt channels), **latch + momentary**, and a
  **solo-clear**. All-mute panic wins over SIP unconditionally.
- **The monitor auto-takeover crossfades a destination to the cue bus while any solo is active**
  — but that destination is a **SECONDARY MAIN fan-out** (a dedicated monitor/headphones send),
  never MAIN's primary output. **\`setMonitorOutput\` refuses MAIN route index 0** (the audience
  mains): a pick that resolves to the mains yields *no monitor* rather than a hijacked house
  mix. The operator assigns the monitor destination (auto-detect a Headphones output; otherwise
  leave it unset).
- The cue bus also exposes ordinary output ports (\`cue_L/cue_R\`), patchable independently of the
  auto-takeover.

## Consequences

- Real PFL/AFL/SIP monitoring on the cans; the **house mix is structurally protected** — PFL
  can never reach the audience, enforced at the engine seam, not just the UI.
- The monitor auto-takeover only engages when MAIN fans to a *secondary* destination (the
  headphones); with a single MAIN output it stays unset (safe) until the operator wires a
  monitor send.
- Native cue summing sits next to the MAIN/matrix native sum (ADR 0002); it is not an LV2 or a
  subprocess.
`,_='# 0020 — Plugin tiers are fixed by MEASURED latency; LV2 ships as tiered subpackages\n\nStatus: Accepted (built, including the tiered RPM packaging — 2026-07-29 note below)\nDate: 2026-07-15\n\n## Context\n\nA live console must never host a latency-eater (linear-phase EQ, look-ahead limiter, FFT\ndenoiser, long convolution reverb). The catalog scans ~610 LV2 plugins, and the RPM originally\nshipped none. The obvious signal — the plugin\'s declared `lv2:latency` port — **cannot be\ntrusted**: a measured round-trip pass over all 610 found **12 plugins that declare zero latency\nbut actually delay the signal** (two SWH IIR crossovers by ~99 ms), and the inverse (SWH\n`artificialLatency` declares 120000 frames, delays 0).\n\n## Decision\n\n- **Measure, don\'t declare.** Every plugin\'s round-trip latency is measured offline (lilv\n  `run()` + a unit impulse + onset detection, `benchmark.py --measure`). The **measured** figure\n  fixes the tier: `live` (≤ 5 ms) / `studio` (> 5 ms). A plugin that can\'t be measured\n  (instrument/no-audio-in, silent under defaults, won\'t instantiate) is quarantined\n  `unclassified` — **never auto-`live`**.\n- **Two axes.** Latency fixes the tier (automatic); curation splits **recommended** vs **extra**\n  within a tier (`curation.ts` ∪ the harvested zynthian effects set + a curator override list; an\n  override may set any tier **except** promote to `live` from a non-`live` measured tier — so a\n  curator can rescue an unmeasurable-but-known-good effect to `studio` case-by-case, but a\n  latency-eater can never reach the live path).\n- **Ship as four RPM subpackages** — `openmixer-plugins-{live,live-extra,studio,studio-extra}`\n  — with dependencies auto-derived (per-plugin owning RPM via `rpm -qf` → `INDEX.json` →\n  generated `plugin-deps.inc`). The meta package `Recommends: openmixer-plugins-live` only.\n- **Catalog stored per-package** (`data/plugins/<rpm>.json`, sorted) so a plugin-package update\n  is one reviewable file diff.\n\n## Consequences\n\n- A live install *physically cannot* pull in a studio latency-eater; a 99 ms crossover can never\n  slip into the live set on a false declaration.\n- The committed catalog is a reproducible build input (no scan needed in a clean chroot).\n- `-live` is a `Recommends`, not a `Requires`: the native EQ/gate/comp/delay/reverb (ADR 0021)\n  make the console fully functional with zero LV2 plugins.\n- Same "measure the hardware/reality, don\'t trust a declaration" principle as ADR 0018 (clock).\n\n## Note — 2026-07-29: packaging landed; a third suitability axis has since appeared\n\nThe core of this ADR is implemented verbatim and is worth trusting: the 5 ms\n`live` boundary (`LIVE_MAX_MS = 5` in `packages/catalog/src/tier.ts`), the\nquarantine of the ambiguous rather than a guess (`tierForBounds` in the same file), and\nthe curator-override rule that overrides may demote but never promote to `live`\n(`resolveTier` in `packages/catalog/src/curation-tier.ts`).\n\nTwo things have moved since.\n\n**Packaging is done, not "in progress".** The four subpackages are generated by\n`packages/catalog/tools/gen-plugin-deps.mjs`, the generated\n`packaging/rpm/plugin-deps.inc` is committed and pulled in by the spec\'s own\n`%include %{omx_plugin_inc}` directive, and `Recommends: %{name}-plugins-live`\nappears exactly as specified. The per-package catalogs are\n`packages/catalog/data/plugins/*.json` plus `INDEX.json`.\n\n**"Two axes" is now three.** This ADR says latency fixes the tier and curation\nsplits recommended-vs-extra within it. Measured per-plugin **CPU cost** has since\njoined them as a first-class dimension —\nthe module doc comment in `packages/catalog/src/cpu-cost.ts` calls itself "the third\nsuitability dimension, alongside latency and topology", fed by `tools/benchmark.py --cost`\nwith provenance committed at `packages/catalog/data/cpu-cost-provenance.json`,\nalongside `destination-suitability.ts` and `family-standing.ts`. Someone scoping\ncatalog work off this ADR alone will under-scope it.\n\nThe "~610 LV2 plugins" figure in Context is the size of the scan at the time; the\ncatalog now holds 958 entries. The "12 of 610 declare zero latency but actually\ndelay the signal" measurement is a dated finding and reads correctly as one.\n',O=`# 0021 — Time-based FX are send/return channels on the existing summing buses; delay + reverb are native

Status: Accepted (designed; native delay/reverb + FX-bus role in progress)
Date: 2026-07-15

## Context

Professional desks (Roland M-5000, Midas PRO/M32/X32, SSL Live) apply time-based FX — reverb,
delay — as **send/return**, not per-channel inserts: an FX rack of engines, each fed from an
**FX-send bus** and returning **wet-only** on an **FX-return channel** in the mix, so many
sources share one reverb. openmixer must feel the same. A first draft proposed insert-only
native FX and invented a "native aux-bus summing" prerequisite — both wrong: openmixer already
sums aux/group/matrix/mix-minus through one common summing-bus + sends-on-fader primitive
(\`bus-node\`, ADR 0002), and already has \`fxSend\`/\`fxReturn\` channel kinds.

## Decision

- **An FX channel is an existing \`fxSend\` summing bus + an \`fxReturn\` strip** whose insert is the
  FX engine, defaulted **wet-only**; the per-channel **send-to-FX** is the existing \`setSend\`.
  No new summing infrastructure. Per-channel **insert** of the same engine stays available for
  mono/in-line use.
- **Delay and reverb are NATIVE** DSP kernels (\`mix_delay.h\`, \`mix_reverb.h\`) in \`mixer.c\`,
  following the existing native EQ/gate/comp path — never an LV2 dependency for the core FX.
  Reverb ships **BOTH** algorithms (Freeverb room + Dattorro plate), operator-selectable.
- **A console-wide BPM + tap-tempo** (a TAP button; pure tap-interval averaging with outlier
  rejection, gap reset, 30–300 clamp) drives tempo-synced delay time.
- **Pitch, convolution and other latency-heavy FX stay LV2** (studio tier, ADR 0020). An FX
  bus's processor can be a native kernel OR a hosted LV2 — the FX rack hosts both identically.

## Consequences

- FX behave like a pro desk (shared send/return engines with return strips).
- The console builds a full live mix — EQ, gate, comp, **delay, reverb** — on native DSP alone,
  which is *why* the LV2 tiers (ADR 0020) are \`Recommends\`, not \`Requires\`.
- No engine-summing work was needed; the feature is two DSP kernels + tap-tempo + an FX bus role
  on infrastructure that already existed (a correction to the initial over-scoped design).
`,N=`# Architecture decision records

Each ADR records one significant decision: the **context** that forced a choice, the
**decision** taken, and the **consequences** that follow. They are append-only — a
later ADR may supersede an earlier one, but earlier records are not rewritten.

The decisions are drawn from internal design notes and from the shape of the code under
\`packages/\`. Where a decision is implemented today the ADR says so; where it is designed
but not yet built, it says that too.

| # | Decision | Status |
|---|---|---|
| [0001](0001-native-reac-not-aes67.md) | Native REAC, not AES67, for Roland stageboxes | Accepted (designed) |
| [0002](0002-pipewire-native-summing-mod-host-inserts-only.md) | PipeWire-native summing; mod-host for inserts only | Accepted (both built; the live engine diverged — see the ADR's 2026-07-29 note) |
| [0003](0003-server-single-source-of-truth.md) | The server is the single source of truth; surfaces are thin clients | Accepted (built) |
| [0004](0004-canonical-model-and-adapters.md) | One canonical device-neutral model with per-device adapters | Accepted (built) |
| [0005](0005-declarative-desired-graph-reconcile.md) | Declarative desired-graph reconcile for audio routing | Accepted (built) |
| [0006](0006-ordered-processor-channel-strip.md) | The channel strip is an ordered processor list; the fader is a processor | Accepted (built for inserts) |
| [0007](0007-persist-routing-by-name-not-id.md) | Persist routing and scenes by node/port name, never by numeric id | Accepted (designed) |
| [0008](0008-dca-as-control-domain-gain-coupling.md) | DCA/VCA is control-domain gain coupling, not an audio sub-bus | Accepted (built) |
| [0009](0009-c-for-hot-paths-pipewire-node-boundary.md) | C for hot paths, with the PipeWire node as the language boundary | Accepted (built; the inventory of what is C has grown — see the ADR's 2026-07-29 note) |
| [0010](0010-metadata-driven-plugin-editor.md) | An auto-generated, metadata-driven plugin editor | Accepted (built) |
| [0011](0011-fader-position-and-db-with-per-adapter-scale.md) | Faders are a 0..1 position plus dB, with a per-adapter scale | Accepted (built) |
| [0012](0012-adapter-manager-menus-and-files.md) | Menus and config files are two front-ends to one AdapterManager | Accepted (built) |
| [0013](0013-telemetry-measured-in-the-engine.md) | Latency telemetry is measured in the audio engine | Accepted (built) |
| [0014](0014-multi-modal-input.md) | Touch, keyboard, mouse and surface are all first-class input | Accepted (built for web) |
| [0015](0015-modular-multi-window-web-ui.md) | A modular, single-process, multi-window web UI | Accepted (built, incl. in-app window management) |
| [0016](0016-gpl3-no-agpl-code-copied.md) | GPL-3.0-or-later, with no AGPL code copied in | Accepted (built) |
| [0017](0017-per-destination-output-trim-floor.md) | A per-destination output trim, not multiple mains, is the output-gain floor | Accepted (layers 1–2 built; layer 3 sequenced — see the ADR's 2026-07-29 note) |
| [0018](0018-clock-force-rate-live-lever-hardware-probe.md) | \`clock.force-rate\` is the live re-clock lever; the reported rate is measured from hardware | Accepted (built) |
| [0019](0019-cue-solo-monitor-bus-never-the-mains.md) | Cue/solo is a monitor bus; the monitor auto-takeover is never the mains | Accepted (built; live acceptance pending) |
| [0020](0020-plugin-tiers-fixed-by-measured-latency.md) | Plugin tiers are fixed by measured latency; LV2 ships as tiered subpackages | Accepted (built, incl. tiered RPM packaging) |
| [0021](0021-fx-send-return-channels-native-delay-reverb.md) | Time-based FX are send/return channels on the existing summing buses; delay + reverb are native | Accepted (built — mix_delay.h, mix_reverb.h) |
`,F="# Architecture\n\nDevelopment documentation: how openmixer is built, and why it is built that way. None of\nthis is needed to run a desk — see the [operator manual](../manual/index.md) for that.\n\n- **[Overview](overview.md)** — the layered design: one canonical model driving a\n  software mix engine plus hardware adapters, the server as the single source of truth,\n  surfaces and windows as thin clients, pluggable I/O, C for the hot paths, a modular web\n  UI.\n- **[Technical manual](technical-manual.md)** — the monorepo packages, the canonical\n  model, the software audio engine (PipeWire summing, `mod-host` inserts, `pw-link`\n  reconcile, plugin-delay compensation), the control protocol, the graph-layout engine\n  and the patchbay, and how to add an adapter, a plugin, a probe or a view module.\n- **[Native DSP versus mod-host inserts](native-dsp-vs-modhost-inserts.md)** — which\n  processing is native and which is an LV2 insert, and why the two are never conflated.\n- **[One summing bus](one-summing-bus.md)** — why MAIN, groups, auxes and matrices are all\n  the same weighted-sum operation, the fader as MAIN's coefficient, and why the mono fold\n  and the pan law's centre position are fixed numbers rather than settings.\n- **[The row grammar and conformance](row-grammar-and-conformance.md)** — how every REST entity\n  is built (mold, address codec, field codecs, station, registration), how a surface must derive\n  from the contract instead of hardcoding it, and a sample of the conformance ratchets that hold\n  both mechanically.\n- **[Decision log](decisions/README.md)** — one architecture decision record per\n  significant choice, with its context, the decision and its consequences.\n\nThe specifications and implementation plans these are built on are internal development\nmaterial and are not published here.\n\n## Generated API reference\n\n`pnpm docs:api` runs [TypeDoc](https://typedoc.org) over the packages whose docstrings are rich\nenough to be worth generating from — `declarations`, `core`, `server`, `audio-engine`, `catalog`,\n`patchbay`, `graph-layout`, `discovery`, `adapter-xtouch`, `adapter-midas`, `adapter-roland`,\n`adapter-x32`, `omx-ml` and `assistant` — and writes static HTML to `api-docs/` at the repo root.\nThat directory is generated and git-ignored: it is not a second, hand-kept copy of the API, it is\nthe existing TSDoc comments rendered. Build the dependency closure first (`pnpm -r --filter\n\"@freemixer/server...\" build`) so cross-package types resolve, then run `pnpm docs:api`.\n`typedoc.json` at the repo root is the one place the entry-point list is declared.\n\n**`@freemixer/declarations` is the page to read first.** It holds every value the desk asserts\nabout itself — travels, spans, counts, allowed values, declared defaults — each with the reasoning\nthat fixed the number, and the generated reference is the only place that reasoning is readable\nwithout opening the source. Note what it is *not*: a surface may not import this package. The web\nUI does not list it as a dependency, so an import is a module-resolution error rather than a lint\nwarning somebody suppresses, and `declarations-withheld.test.ts` in core gates `core` against\nre-exporting it. A surface learns these values at runtime from `OPTIONS` — `OPTIONS /api/` for the\nrow-wide ones, `OPTIONS` at an instance for the ones that belong to a device — or it draws nothing.\nRead the generated page to understand what the console publishes and why; derive from `OPTIONS`.\n",H='<!-- SPDX-License-Identifier: GPL-3.0-or-later -->\n# Native built-in DSP vs mod_host plugin inserts\n\n> **Read this before touching the EQ / Gate / Compressor UI or the processor chain.**\n> The two have been repeatedly confused, producing regressions ("this channel has\n> no EQ stage", the EQ curve routed through a plugin, an LV2 "add" offer on the EQ\n> tab). They are **two independent mechanisms**. Do not conflate them.\n\n## 1. Native built-in DSP — the channel\'s OWN processing (always present)\n\nEvery processing channel (input strips; buses that carry processing) has a\n**built-in EQ, gate and compressor that run inside the native C engine**\n(`packages/pipewire-native/src/mixer.c` — a biquad cascade for the EQ, one\n`omx_dynamics` atom for gate/comp). See ADR 0002 (structural DSP is\nPipeWire-native), ADR 0006 (the channel strip is an ordered processor list),\nADR 0009 (C for the hot path).\n\n- **Always there.** There is no "EQ stage" to add and no way to be without one.\n  A fresh channel has a flat EQ (shaping nothing) — that is honest, not a\n  placeholder. You **disable** a block with its on-switch (`EqState.on`,\n  `GateState.on`, `CompState.on`), you never "remove the stage".\n- **State → DSP path.** The model lives in `@freemixer/core` / `@freemixer/catalog`\n  (`EqState`, `GateState`, `CompState`, `defaultEqState()`, `defaultGateState()`,\n  `defaultCompState()`). The web-ui edits it through `useChannelEq` /\n  `useChannelGate` / `useChannelComp`, which emit the **`eq.set` / gate / comp\n  verbs**. The server threads those to the native strip\n  (`gateStateToNativeDyn`, the EQ coeff push, `native.setStripEq/setStripDyn`),\n  where they run as biquads / the dynamics atom. Word-atomic params (JS writes\n  relaxed, the RT thread reads).\n- **The UI.** The EQ / Gate / Compressor tabs draw the native state directly:\n  `EqCurve.vue` (EQ), `GateCurve.vue` (gate), `CompCurve.vue` (comp). These\n  curves ARE the native processor. The EQ RTA pre/post taps read the signal\n  around the native EQ cascade.\n\n## 2. mod_host / LV2 plugin inserts — OPTIONAL, separate, ad-hoc\n\nFree LV2 plugins hosted via **mod-host**, inserted into a channel\'s processor\n**chain** as ad-hoc effects (ADR 0002: inserts = mod-host). This is a *different*\nthing from the built-in DSP above.\n\n- Managed by the **Plugins tab** (the `StripInsertRack` / insert rack) and the\n  chain `StagePanel` — `chainProcessors` / `setProcessorPlugin` /\n  `setProcessorEnabled` / `reorder` verbs. `useChain` / `useInserts`.\n- A chain having "no eq stage" means **no plugin EQ insert** — it says nothing\n  about the channel\'s native EQ, which is always present (§1). Never surface a\n  chain-stage emptiness as "this channel has no EQ".\n- LV2 EQs/dynamics belong ONLY here (the Plugins tab), never as the path to a\n  channel\'s own EQ/gate/comp.\n\n## Rules for anyone (human or agent) working here\n\n1. The **EQ / Gate / Comp tabs edit the NATIVE built-in DSP** (§1), always, for\n   every processing channel. Bind the curve to `eqFor()/gateFor()/compFor()` and\n   emit the native verbs. Do **not** gate the curve on chain-stage presence, and\n   do **not** route the built-in EQ/gate/comp through mod_host / a plugin.\n2. **mod_host inserts live in the Plugins tab** (§2). Do not put an "add plugin"\n   / LV2 affordance on the EQ/Gate/Comp tabs — those tabs are the native DSP.\n3. An empty insert chain renders **nothing** on the native tabs — never a\n   "no … stage" message (`StagePanel` empty state is intentionally silent).\n4. Defaults: gate `on: false`, comp `on: false`, EQ flat & `on: true` (a flat EQ\n   is inert). See `@freemixer/catalog`\'s `default*State()`.\n\nIf a change makes you write "add EQ", "no EQ stage", or route EQ through a\nplugin, stop — you\'re fighting mod_host. Re-read §1.\n',B=`<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
# One summing bus

openmixer has exactly one way of adding signals together, and every bus on the console —
MAIN, a group, an aux, a matrix — is the same operation applied to a different set of
sources. There is no separate "master bus" mechanism sitting beside a separate "aux bus"
mechanism; there is one operation, instantiated as many times as the console has buses.

## The one operation

A bus is a weighted sum of its sources: each source contributes its signal multiplied by a
coefficient, and the bus is the sum of those products, sample by sample.

\`\`\`
bus = Σ  coefficient(source) × signal(source)
\`\`\`

That is the whole idea. Everything else a bus does — a fader, a send, a mute, a pan, a
crosspoint — is a name for one of the two things in that sum:

- **A coefficient** is a number that scales one source's contribution to one bus. A fader
  is a coefficient. A send level is a coefficient. A mute is a coefficient forced to zero
  without disturbing the number underneath it, so un-muting returns exactly where you left
  it.
- **A tap** is which point in a channel's signal path is being read for a given
  contribution — the same channel can feed one bus post-fader and another pre-fader,
  because a bus reads a *point*, not "the channel" as a single wire.

**MAIN is not a special case.** MAIN is the bus whose fader realises the coefficient. The
motorised fader under your hand is not a different thing from an aux send level; it is the
same coefficient, given a dedicated physical control because the desk is built around
mixing to MAIN by default. A group, an aux and a matrix use the identical operation with a
stored, per-source coefficient instead of one riding the channel fader.

Because it is one operation, the things that look like separate features are consequences
of it rather than extra mechanisms:

- **A send** is a channel's coefficient into a bus other than MAIN.
- **Sends-on-faders** is the fader wall temporarily displaying and driving *that*
  coefficient instead of MAIN's — the same fader, pointed at a different sum.
- **A matrix crosspoint** is a coefficient where the source is itself a bus rather than a
  channel: matrices sum buses (and sometimes channels) the same way a group sums channels.
- **A mute** never deletes the coefficient it silences; it sets the contribution to zero
  and remembers what it was zeroing, which is why release restores the fader exactly.

One operation, one place it is implemented, and every bus on the desk — however many the
console allocates — is an instance of it.

## Power, amplitude and loudness

Three different things get called "level," and mixing them up is the root of most decibel
confusion.

**Amplitude** is the size of the waveform itself — the voltage on a cable, the number
stored for each audio sample. It is what a fader coefficient multiplies.

**Power** is proportional to amplitude *squared* — it is what heats a loudspeaker coil and
what an energy meter reads. Doubling amplitude quadruples power, because doubling a number
and squaring the result multiplies it by four.

**Loudness** is what a listener actually perceives, and it grows more slowly than either —
ears are not linear meters. A change that measures as a clean doubling in amplitude or in
power does not sound twice as loud; it takes a considerably bigger change than that before
most listeners agree something is "twice as loud."

The decibel exists to make one ratio out of these different scales. It is always a ratio,
never a quantity on its own — "+6 dB" means nothing without something to be six decibels
*more than*. Because power is amplitude squared, the same physical change reads as the same
number of decibels down either scale, provided you square the ratio you drop into the
amplitude formula: amplitude uses 20·log10(ratio), power uses 10·log10(ratio), and a
doubling of amplitude is a quadrupling of power — so both arrive at the same six decibels.
\`dBFS\`, the unit meters on the desk read in, is exactly this ratio, measured against digital
full scale (the loudest sample value the format can represent) rather than against another
signal.

| Doubling | Reads as |
|---|---|
| ×2 amplitude | +6 dB |
| ×2 power | +3 dB |
| ×2 perceived loudness | ≈ +10 dB |

## The three doublings

Read against that table, three different-looking rules of thumb turn out to be the same
one idea, applied to the thing that is actually doubling:

- **+3 dB doubles power**, when two *unrelated* signals combine — two different musicians'
  microphones, or any two sources whose waveforms are not alike from moment to moment. Their
  powers add; their amplitudes do not, because unrelated signals do not consistently
  reinforce each other.
- **+6 dB doubles amplitude**, when two *identical* signals combine — the same signal
  arriving twice, in step. This is why a stereo pair carrying mono content (the same signal
  on both legs, dead centre) sums to twice the amplitude, not the square-root-of-two you
  would get from two unrelated sources: the two legs are perfectly correlated, so they add
  like amplitudes, not like powers, and the result is 6 dB hotter than either leg alone —
  not 3.
- **+10 dB doubles perceived loudness**, roughly and empirically. This one is not derived
  from the sum at all; it is a property of hearing, folded in here only because it is the
  number people reach for and confuse with the other two.

## Why the mono fold and the pan law are fixed numbers, not settings

Two controls on the desk look like they are missing a knob, and neither is.

**The mono fold has no level control.** When a destination is a single socket — a mono
fill speaker, a hearing-assist feed — the desk has to turn a stereo pair into one signal,
and stereo content is, in the case that matters, the *same* signal on both legs (a mix that
was built to sit centred). Summing two identical legs is the +6 dB case above: without
correction, folding to mono makes a centred mix six decibels hotter than it was in stereo.
The fold applies a fixed −6 dB to bring a correlated pair back to the same amplitude it had
on either leg alone. That −6 dB is not a mix decision; it is the exact number that undoes a
doubling, so there is nothing to set — a control there would only let someone dial in the
wrong answer to a question arithmetic has already settled.

**The pan law's centre position is −3 dB per leg, for the matching reason on the power
side.** A pan control distributes one source across two legs by power, not by amplitude, so
that a sound panned hard left and the same sound panned hard right are equally loud — and
so that sweeping a pan knob across the stereo field does not swell or dip in level as it
passes through the middle. At centre, the source's power is split evenly between the two
legs: half the power in each leg is −3 dB down from the source's full power, and the two
legs sum back to the source's original power. Any other split at centre would either lose
level in the middle of a pan sweep or gain it, and both are audible defects, not stylistic
choices. Constant-power panning is the one split that keeps a pan move level-neutral, which
is why it is the law and not an option.

## See also

- The [operator manual's page on sends, buses, groups and DCAs](../manual/sends-buses-dcas.md)
  for how this shows up as controls on the desk.
- The [matrix and outputs page](../manual/matrix-outputs.md) for the mono fold as an output
  leg setting.
- [FAQ](https://freemixer.github.io/openmixer-www/faq) for the short version of the two
  rulings above.
`,G="# Architecture manual\n\nThis manual describes how openmixer is put together: the layers, why they are drawn\nwhere they are, and how data moves through them. It is paired with a\n[decision log](decisions/) that records each significant choice as a standalone ADR.\n\nThroughout, **built** marks something that exists in `packages/` today and **designed**\nmarks something documented as a plan but not yet implemented. The two are kept apart\ndeliberately — the architecture is stable, but only part of it is wired.\n\n## The one idea\n\nEvery digital mixer fuses three things that do not have to be fused: the **control\nsurface** you touch, the **mix engine** that does the DSP, and the **audio I/O** that\ngets sound in and out. openmixer separates them behind a single device-neutral model\nand lets you mix and match:\n\n```\n   control surfaces                 canonical model                  I/O + engines\n   (north, thin clients)            (single source of truth)         (south, sinks)\n\n   web UI (Nuxt/Vue)  ┐                                         ┌─ software engine\n   touch / mouse / kbd ┼─ intents ─▶  @freemixer/core  ──fan──▶ ┤    (native C DSP\n   MCU / X-Touch ──────┤              model + engine    out     │     + mod-host / LV2)\n   another desk ───────┘              capability map            ├─ REAC stagebox I/O\n                                      event fan-out             ├─ console adapter\n                                                                │    (Midas / X32 / Roland)\n                                                                └─ …\n```\n\nA control source emits a **canonical intent** (\"move `input/3`'s fader to 0.7\"). The\nengine holds the canonical state, applies it, and fans the resulting change out to\nevery connected listener. A sink is either a **device adapter** (drives a real\nconsole over its own protocol) or the **software audio engine** (hosts LV2 plugins and\nroutes audio). The surface and the engine never know which sink is behind the model —\nonly the adapter does.\n\nThis is the part worth owning: the neutral model in the middle, and the adapters\naround it. Add a console, a stagebox, or a surface by adding an adapter, not by\ntouching the core.\n\n## The layers\n\n### 1. The canonical model — `@freemixer/core` (built)\n\n`core` is the vocabulary everything else speaks. It has **zero device specifics**.\n\n- **`ChannelId` = `{ kind, index }`.** `kind` is one of `input`, `fxReturn`, `aux`,\n  `mix`, `matrix`, `cue`, `main`, `fxSend`, `dca`, `muteGroup`, `mixMinus`\n  (`packages/core/src/model.ts` is authoritative); `index` is 1-based. A send is\n  not a special type — it is a fader at an input × output intersection.\n- **`ChannelStrip`** carries the per-channel state: `fader`, `mute`, `solo`, `pan`,\n  `gain`, `phantom`, `polarity`, `eq`, `dynamics`, `inserts`, and `sends`.\n- **`FaderLevel` = `{ position, db }`.** Position is an opaque 0..1 surface scalar; dB\n  is carried alongside as a derived read. The device-raw taper stays private to each\n  adapter behind a `FaderScale` ([ADR&nbsp;0011](decisions/0011-fader-position-and-db-with-per-adapter-scale.md)).\n- **`MixerTopology`** is what an adapter reports on connect: the model name, the\n  channel list, stereo pairs, a **capability map** (`has(id, feature)`), and a send\n  matrix spec. Capabilities are mandatory — no desk has every feature, so surfaces\n  grey out what a given device cannot do rather than erroring.\n- **`MixerAdapter` / `MixerReceiver`** are the device-facing contracts. Writes are\n  promises (`setFader`, `setMute`, …); reads are a push observer (`onFader`,\n  `onMeters`, …) because real desks stream state unsolicited after you subscribe.\n- **`MixerEngine`** is the hub's heart. It holds the canonical state for one bound\n  device, forwards intents to the adapter, and *is* the adapter's `MixerReceiver`, so\n  device-pushed state and surface-pushed state share one path and one fan-out.\n\nRouting one source to one sink — \"the Midas surface drives the X32\" — is just\nsubscribing one engine's events and calling another engine's control methods. No\nspecial case.\n\n### 2. The sinks (south)\n\nThere are two kinds of sink, both behind the same `MixerAdapter` contract.\n\n**Console adapters** (built, varying maturity) translate the canonical model to a real\ndesk's remote protocol. They are the *only* code that knows a protocol:\n\n- `adapter-midas` — Midas PRO Series over OSC/UDP (port 10002). The most complete;\n  ported from a working Python proof-of-concept. Fader/mute/solo/gain/name work both\n  directions; cross-point sends and read-side EQ/dynamics/meters are still open.\n- `adapter-x32` — Behringer X32 / Midas M32 over OSC/UDP (port 10023). Substantial:\n  fader/mute/pan/gain/send/name plus `/xremote` keep-alive; `setSolo` and read-side\n  EQ/dynamics/meters are open. It absorbs the X32's quirks (e.g. `/mix/on` is\n  ON=unmuted, inverted to the canonical \"muted\").\n- `adapter-roland` — Roland M-5000 over the RCS control plane. A **documented stub**:\n  fully wired to the interface, but every place the real RCS wire format plugs in is\n  marked `TODO(hardware)` and isolated behind a transport seam. Note: this is the\n  Roland **control** plane, not REAC audio transport — those are separate.\n\n**The software audio engine** (built) — `@freemixer/audio-engine` plus\n`@freemixer/pipewire-native` — *is* the mixer rather than controlling one. It presents\nthe same north-facing `MixerAdapter` contract, so the engine drives it identically to a\nconsole: a web fader moves a software channel exactly as it moves a Midas channel.\n\nThe control face is `SoftwareMixerAdapter` (`software-adapter.ts`), built by the composition\nroot (`software-mixer-loader.ts`): gain/mute are PipeWire node\nvolume, never a mod-host gain plugin. Fader, mute, solo (`setSolo`) and pan (`setPan`)\nare all live on it.\n\n- The **structural** DSP — per-strip gain/fader/pan/polarity, summing, the EQ bank, the\n  gate/comp atom, native delay and reverb — is openmixer's own C `pw_filter` node in\n  `@freemixer/pipewire-native` (`mixer.c`, `mixer_rt.c`, `mix_dsp.h`). The older path\n  that realised buses as PipeWire filter-chain nodes (`bus-node.ts`, `eq-node.ts`)\n  still exists as a fallback; the live rig runs the native node\n  ([ADR&nbsp;0002](decisions/0002-pipewire-native-summing-mod-host-inserts-only.md),\n  [ADR&nbsp;0009](decisions/0009-c-for-hot-paths-pipewire-node-boundary.md)).\n- **LV2 plugin inserts** are a separate layer: an ordered chain hosted by **mod-host**\n  (`ChainManager` / `planChain`), reconciled declaratively\n  ([ADR&nbsp;0006](decisions/0006-ordered-processor-channel-strip.md)). Which of the two\n  layers owns what, and why they must not be conflated, is\n  [native DSP vs mod-host inserts](native-dsp-vs-modhost-inserts.md).\n- Audio is patched by a **declarative desired-graph reconciler** (`DeclarativeAudioGraph`)\n  over PipeWire's `pw-link` (`PipeWireBackend`), in the style of Zynthian's\n  `zynautoconnect` ([ADR&nbsp;0005](decisions/0005-declarative-desired-graph-reconcile.md)).\n\n### 3. The I/O (the southern edge)\n\nThe target deployment feeds the software engine from a **Roland REAC stagebox** over\n**native REAC** — not AES67, not an M-5000 console\n([ADR&nbsp;0001](decisions/0001-native-reac-not-aes67.md)). The stagebox's inputs\narrive as a 40-channel PipeWire source; the mixed buses go back out as a PipeWire sink\nthat re-encodes REAC to the stagebox outputs, which feed the PA.\n\nThe REAC work lives in a **sibling repository, `reac-pw`** (with `libreac`), behind a\nhard boundary: the PipeWire node. openmixer (TypeScript) never touches a REAC byte; it\nonly wires the `reac:capture` / `reac:playback` ports into its mix graph. The REAC\nreceive path and the frame encoder exist and are verified, and so does the master-role\nhandshake that lets openmixer drive a real box: cold-connect → grant → ESTABLISHED →\nsteady 1/s heartbeat, zero drops, verified against a Roland S-0808. openmixer\npackages that master as a unit (`packaging/systemd/reac-pw.service`)\nand probes the box through it (`packages/server/src/reac-pw-prober.ts`). This is the\nC-for-hot-paths boundary\n([ADR&nbsp;0009](decisions/0009-c-for-hot-paths-pipewire-node-boundary.md)).\n\n### 4. The server — `@freemixer/server` (built)\n\nThe server wires one chosen adapter into a `MixerEngine` and exposes it to browsers:\n\n- **REST is the front door.** Every entity is `GET`/`PATCH`/`OPTIONS`-able at\n  `/{root}/{kind}/{index}[/{sub}]`, one `ConsoleResource` declaration per entity, served\n  by the `ResourceRegistry` (`packages/server/src/rest-router.ts`). Around 85 entities\n  serve today, decomposed from an earlier verb-based wire that no longer exists.\n  Any `GET` also takes `?watch=1` to become a live `text/event-stream` of that same\n  body — no separate subscribe verb (`packages/server/src/resource-stream.ts`). It is\n  the only wire: there is no WebSocket.\n\nThe server is the **single source of truth**\n([ADR&nbsp;0003](decisions/0003-server-single-source-of-truth.md)). Every engine event\nlands on the affected row's `?watch=1` stream for *every* watcher, including the client\nthat caused it — so a finger on glass, a motor fader, or a device-side change all\nconverge to the same values on every client. There is no peer-to-peer surface chatter; surfaces talk only to the\nserver.\n\n### 5. The surfaces (north, thin clients) — `@freemixer/web-ui` (built)\n\nThe web UI is a Nuxt 4 single-page app — a live control surface, no SSR. It renders the\nfader wall (level, meter, mute, solo, pan per strip), an insert rack per strip, and an\n**auto-generated plugin editor**: every control widget is chosen from LV2 metadata by\none `widgetFor()` decision table, so there is no per-plugin UI code\n([ADR&nbsp;0010](decisions/0010-metadata-driven-plugin-editor.md)). It is built\ntouch-first with full keyboard navigation, pointer/wheel affordances, and ARIA roles on\nevery control ([ADR&nbsp;0014](decisions/0014-multi-modal-input.md)).\n\nBecause the server is authoritative, a surface is intentionally thin: it sends intents\nand re-renders from broadcasts. Opening the surface on several devices at once gives you\nseveral synchronized views for free — that is the substrate the MCU/X-Touch surfaces (a\nphysical fader bank with motorized, touch-sensing faders that mirrors and drives the desk\nover MIDI) and the multi-window model\n([ADR&nbsp;0015](decisions/0015-modular-multi-window-web-ui.md)) build on: each surface,\nwindow, and physical fader bank is one more client of the one server.\n\n## How a fader move flows (built path)\n\n1. The operator drags a fader in the web UI. The client updates its local state\n   **optimistically** and sends `PATCH /api/channel/{kind}/{index}/fader`.\n2. The server validates the patch, derives dB from the adapter's `FaderScale`, and\n   calls `engine.setFader(...)`.\n3. The engine records the new value, emits a `fader` event, and calls\n   `adapter.setFader(...)`, which writes to the device (a console, or mod-host).\n4. The engine's event lands on the fader row's `?watch=1` stream for **every** watcher.\n   Other clients update; the originating client reconciles its optimistic value against\n   the authoritative one.\n\nA device-originated change (someone moves a real fader) enters at the adapter's\n`MixerReceiver`, takes the same `engine → broadcast` path, and lands on every surface.\nOne path, both directions.\n\n## Cross-cutting principles\n\n- **Configuration over hard-coding.** Endpoints, ports, timeouts, channel lists, strip\n  plugin URIs, and fader tapers are all configuration with sensible defaults — nothing\n  about a device is baked into the wiring.\n- **Pure cores, injected I/O.** The load-bearing logic — the chain reconciler\n  (`planChain`), the graph diff (`DeclarativeAudioGraph.plan`), the mod-host wire\n  codec — is written as pure functions and unit-tested with no socket and no hardware. The stateful drivers are thin shells around them.\n- **Persist by name, never by id.** PipeWire/JACK object ids churn across restart and\n  replug, so routing and scenes must persist by node-name + port-name and re-resolve\n  ([ADR&nbsp;0007](decisions/0007-persist-routing-by-name-not-id.md)).\n- **Degrade, don't crash.** A missing stagebox, an absent adapter package, a dead\n  mod-host, an unreachable discovery NIC — each is reported and worked around, never\n  fatal.\n- **GPL-3, no AGPL copied.** openmixer is GPL-3.0-or-later. MIT/BSD/GPL-2-or-later/GPL-3\n  code may be copied; AGPL code (MOD-UI, Eyevinn, Zrythm) is studied and re-implemented\n  clean, never copied ([ADR&nbsp;0016](decisions/0016-gpl3-no-agpl-code-copied.md)).\n\n## What is built vs designed\n\n| Layer | Built | Designed (not yet built) |\n|---|---|---|\n| Canonical model | full `core` model + engine | — |\n| Software engine | native C DSP node (gain/fader/pan/sum, EQ, gate/comp, delay, reverb, RTA), mod-host insert chains, `pw-link` routing, summing/buses/matrix/DCA/sends | a deeper bus tree (buses are single-tier — enforced in `createManagedBus`) |\n| I/O | REAC discovery probe, head-amp control, packaged `reac-pw` master unit | native REAC audio transport itself stays in the sibling `reac-pw` repo, not here |\n| Server | REST only (~85 `ConsoleResource` entities, each `GET`/`PATCH`/`OPTIONS`-able and `?watch=1`-streamable), `/health`, `/telemetry` | — |\n| Adapters | Midas (mature), X32 (substantial), X-Touch MCU (largest), Roland (stub), `AdapterManager` registry + `adapters.yaml` | Roland RCS wire format (`TODO(hardware)`) |\n| Surfaces | web UI (strips, inserts, auto-editor), MCU/X-Touch, in-app multi-window layout manager, EBU-R128 metering | — |\n\nRead the [decision log](decisions/) next for the reasoning behind each of these\nchoices, or the [technical manual](technical-manual.md) for the concrete\ninterfaces, the full control protocol, and how to add an adapter, plugin, probe, or view\nmodule.\n",W="# The row grammar, the contract, and conformance\n\nHow every REST entity is built, how a surface finds out what it may do without being told in\nadvance, and how the repo keeps both of those true mechanically rather than by review.\n\n## The row grammar\n\nEvery entity the console serves — a fader, a bus, a DCA, a mute group, a matrix point, a\nsession — is one instance of a single grammar, held to mechanically by\n`row-grammar-conformance.test.ts`:\n\n```\nrow = mold(address, fields | derive, station, [ripples], [refusal wording], [lifecycle], [policy])\n```\n\n- **A mold from core** — `ScalarRecordResource`, `CollectionResource`, `LatchResource`,\n  `OperationResource` or `DerivedResource`. No row subclasses `ConsoleResource` directly.\n- **An address codec from core** — `CHANNEL_ADDRESS`, `SINGLETON_ADDRESS`,\n  `fixedKindChannelAddress(kind)`, or a named codec added to core when a genuinely new address\n  shape appears. A row never spells out a `{ parse, canonical }` literal for a shape core already\n  owns.\n- **Field codecs from core** — `bool`, `finiteNumber`, `enumOf`, `text`, `tokenArray`,\n  `nodeIdArray`, `refArray`, `nullableChannelRef`, each with mandatory example vectors. A new\n  value shape gets a new named core codec, never an inline literal in a row file.\n- **A station over the engine's one doorway** — the ONE store's read/write path. Server stations\n  extend `EngineDoorStation`, `StripScopedStation` / `ChannelScopedStation`, or `JsonFileStation`.\n  A shape that fits none of these is a new base, added beside them with its own tests.\n- **Registration at a sanctioned site only** — `console-resources.ts` (composition policy), the\n  constructor registration block of `server.ts`, or `demo-resources.ts`. A row registered\n  anywhere else is invisible to the composition reader.\n- **Lifecycle**, when the row is a collection — `create`/`remove` doors declared on the mold from\n  `@freemixer/core`'s `resource-lifecycle.ts`, never hand-rolled. `OPTIONS` advertises `DELETE`/\n  `POST` only where the door exists; a door that doesn't exist answers `405`, not a refusal code\n  dressed up as one.\n- **Policy** — `{ dirtiesSession?, undoable?, undoBarrier?, undoLabel, undoCoalesce? }`, executed\n  once by the registry for every door. `dirtiesSession` defaults `true`; `undoable` defaults\n  `false` and requires a coded `undoLabel` when set — the registry replays the inverse from the\n  PRIOR field values it read before the write, never a guess.\n\nLaws every row inherits rather than re-deciding: one store (never a second ledger for a fact\nanother component already owns), broadcast only through `broadcastResource`, refusals as codes\n(never English on the wire — the client translates), absence is a fact (no instance is\nnot-found, never a fabricated zero), latches are kept honest by query-and-compare, and an\noperation is the only place \"do\" semantics live.\n\nThe row-grammar test refuses a new `AddressCodec`, `FieldCodec`, or unbased `*Station` outside\n`@freemixer/core` / the shared server bases. The fix is never a suppression: promote the new\nshape into core, name it, give it example vectors, and instantiate it from there.\n\n## The contract drives the surface — nothing is hardcoded\n\n**The console generates its URLs, address spaces and OPTIONS from the contract; a surface asks,\nit does not decide.** `GET` reads a row, `PATCH` writes it, `OPTIONS` reports what THIS instance\ncurrently allows — which fields are writable, what range they accept, whether `DELETE`/`POST`\nexist — and any `GET` takes `?watch=1` to become the same body as a live stream. There is no\nsecond, hand-held list of what a desk supports: a client that imports a constant where the\ncontract already publishes the fact is a deviation, because it is exactly how two surfaces end up\ndisagreeing about the same desk.\n\nThis is enforced, not aspirational: `contract-derivation-conformance.test.ts` scans the web UI for\nplaces that decided something the console already declares — a hardcoded channel count, a\ncapability assumed rather than read, a range checked against a literal instead of the published\none — and keeps a shrink-only work list of what is left to move. `mixer-standard.md` (NORMATIVE)\nstates the rule twice: nothing about a specific desk or show is hardcoded, and a desk does not get\nits own classes — it maps its capabilities onto the standard ones.\n\nPractically, this means: **never write down \"the available options are A, B, C.\"** Describe how\nto ask — `OPTIONS /channel/input/3/headAmp`, or read the `range` a `GET` already carries — because\nthe contract row is free to change and the prose is not.\n\n### Where the declared values live, and why you cannot import them\n\nThe numbers behind those published limits are in `@freemixer/declarations` — every travel, span,\ncount, allowed value and declared default the desk asserts about itself, each carrying the\nreasoning that fixed it. The package depends on nothing, and `@freemixer/core` depends on it and\nmust never re-export it.\n\n**A surface cannot reach it, by construction.** `@freemixer/web-ui` does not list it as a\ndependency, so a client's import of a declared value fails to resolve rather than becoming a lint\nwarning somebody suppresses; `declarations-withheld.test.ts` in core is the gate on the re-export\nhalf. This is the mechanism that makes \"derive from the contract\" true rather than merely\nrequested — a surface has no way to hardcode a limit it can only receive.\n\nThe line the package draws: **what a value MAY BE** is declared here — travels, spans, counts,\nallowed values. **How a value is REALISED** is not — a fader taper, tick geometry, density tokens,\na wire encoding belong to the surface or the adapter that draws or speaks them. Server defensive,\nclient generative, one source: the write door refuses out-of-travel values *by* these\ndeclarations, and a client generates its controls *from* the same ones received over the wire.\nNeither trusts the other, and both are built from one statement of the fact.\n\nOne caution for anything device-dependent: a range that depends on the DEVICE must come from the\ndevice. A channel's gain travel is a property of the preamp patched behind it — a REAC box\ndeclares 0..55 dB, an RME mic input reaches 65 — so a row publishes the patched preamp's own\ndeclaration and never a package constant. Only a constant of the desk itself or of the maths (the\npan travel, the desk's own DSP gain stage) is declared once and for all.\n\n`pnpm docs:api` renders all of it, reasoning included; see\n[the generated API reference](index.md#generated-api-reference).\n\n## Conformance ratchets — a sample of what they guard\n\nThe repo carries around thirty `*-conformance.test.ts` files. Each names a real defect that\nshipped once, reduces it to a mechanical scan, and — by the ratchet rule (R-011) — is checked on\nall four ratchet arms (new drift, a fixed-but-still-listed entry, an entry that no longer matches\nanything, and an entry whose meaning quietly grew) rather than hand-maintained. A few, to show the\nrange:\n\n| Ratchet | Guards against |\n|---|---|\n| `row-grammar-conformance` | A row inventing its own address/field codec or station shape instead of using core's. |\n| `contract-derivation-conformance` | A surface deciding a capability instead of reading it from the contract. |\n| `dispatch-conformance` | Any socket or verb transport reappearing — REST is the only door, permanently. |\n| `model-ownership-conformance` | Console truth (capacity, capability, recall rules) re-implemented in a client instead of read from `@freemixer/core`/the server. |\n| `cast-regression-conformance` | The three `as`-cast shapes that have actually recurred, each swept mechanically. |\n| `comment-narrative-conformance` | A code comment narrating history instead of stating the current contract — git holds history. |\n| `contract-connector-conformance` | A contract column nothing reads — a declared fact with no consumer is a comment pretending to be a law. |\n| `value-in-published-limit-conformance` | A published value that falls outside the range published beside it. |\n| `wire-finite-conformance` | `NaN`/`Infinity` reaching the wire as JSON `null`, which a client then reads as a confident zero. |\n| `silent-write-conformance` | A control that moved on screen while no audio path actually changed. |\n| `restore-announce-conformance` | A restore path (session/scene load) writing a store without also broadcasting it. |\n| `settlement-conformance` | A row answering a write from a read that can still precede it. |\n| `env-var-conformance` | An environment variable the code reads that the admin docs don't document, or vice versa. |\n| `native-capability-conformance` | A capability wired end-to-end in C, N-API and TypeScript that nothing in production ever calls. |\n| `one-intake-conformance` | A second live transport into the web UI — there is exactly one stream and one dialler for it. |\n\nEach file's own header states the defect it was built for in more detail than a table row can;\nread the file before extending or relaxing one.\n\n## Extending the system\n\nThe house laws behind all of the above — ownership, where code lives, the one path to audio,\ntesting the graph rather than the model, the four-armed ratchet, decisions written down as they\nhappen, house style — are in [the rules index](../design/rules/INDEX.md); this page assumes them\nand does not restate them.\n\nFor the concrete steps to add a console adapter, a plugin, a view module or a discovery probe,\nsee [technical manual → Extending](technical-manual.md#extending). An OSC or other new control\nsurface follows the same rule as the web UI: it reads the contract and instantiates from it, and\nmust never grow a private map of addresses.\n",q="# openmixer technical manual\n\nHow openmixer is put together: the canonical model, the software audio engine, the control\nprotocol, and how someone building or extending an installation runs and configures it. Read\nthe [architecture manual](../architecture/overview.md) first for *why* the layers are drawn\nwhere they are; this is the *how*, grounded in the code as it stands today.\n\nThe one idea the whole system turns on: a single device-neutral model sits in the middle,\nthe server owns it as the single source of truth, and everything else — the web surface, the\nsoftware mix engine, the console adapters, the hardware I/O — plugs into it. A surface never\nknows which backend it is driving; only the adapter does.\n\n## The monorepo\n\nA pnpm workspace (`packages/*`) on Node 22+, TypeScript with `strict` +\n`noUncheckedIndexedAccess`, ES modules, Vitest for tests, GPL-3.0-or-later on every file.\n\n```sh\npnpm install\npnpm -r build      # build every package\npnpm -r test       # vitest across the workspace\npnpm -r lint\n```\n\n| Package | Role | Bin |\n|---|---|---|\n| `@freemixer/core` | The canonical model and pure logic: topology, fader scales, sends, DCA and mute-group coupling, scenes/recall-safe, sessions, console allocation, telemetry types, the in-memory `MixerEngine`. No I/O. | — |\n| `@freemixer/audio-engine` | The software mixer: routing/summing/faders/buses plus `mod-host` LV2 inserts — `SoftwareMixer` and its `SoftwareMixerAdapter`. | — |\n| `@freemixer/pipewire-native` | The native libpipewire client and the C DSP engine: event-driven registry (no `pw-dump`, no subprocesses) and the `omx-console` `pw_filter` node — per-strip gain/fader/pan/polarity/summing, EQ biquads, the gate/comp atom, native delay and reverb, the RTA FFT tap, RT load metering. | — |\n| `@freemixer/catalog` | The curated LV2 plugin catalog + descriptors, the EQ band model and biquad maths; a Python scanner/benchmark toolchain. | — |\n| `@freemixer/server` | Fastify: wires an adapter into a `MixerEngine` and serves it as the REST entity API (`?watch=1` for SSE). | `openmixer-server`, `openmixer-console`, `openmixer-clock-drift` |\n| `@freemixer/discovery` | Network device discovery — REAC (L2), Dante (mDNS), AES67 (SAP) probes behind the core `DiscoveryProvider`. | — |\n| `@freemixer/graph-layout` | A pure, zero-dependency layered-DAG auto-arrange for patch graphs (Sugiyama-style). Framework- and language-neutral. | — |\n| `@freemixer/patchbay` | A `GraphSource` abstraction plus a self-contained PipeWire (`pw-dump`/`pw-link`) backend for `graph-layout`. | `openmixer-patchbay` |\n| `@freemixer/web-ui` | The browser mixing surface — a Nuxt 4 / Vue 3 SPA (no SSR), talks to the server over REST, with `?watch=1` SSE for live rows. | — |\n| `@freemixer/website` | The explainer site and these manuals, statically generated for GitHub Pages. | — |\n| `@freemixer/adapter-midas` · `-x32` · `-roland` | Per-console protocol adapters (Midas PRO over OSC, X32/M32 over OSC, Roland M-5000 over RCS). | — |\n| `@freemixer/adapter-xtouch` | The Behringer X-Touch / X-Touch Mini control surface as a bidirectional client — gestures in, motor faders / LEDs / V-Pot rings / scribble strips / meters out. The largest adapter. | — |\n| `@freemixer/assistant` | The console assistant: one chat loop over the same REST entity door, the one backend setting's model (local by default, works with no internet; any OpenAI-compatible endpoint by choice), every write armed by the operator; the CLI and the service behind the web UI's `/assistant` page. | `omx-assist` |\n| `@freemixer/omx-ml` | The AI-feature layer: classic-DSP analyzers as CPU PipeWire nodes plus a GPU-gated out-of-process ONNX/TensorRT inference service. | — |\n\nThe three *console* adapters (Midas, X32, Roland) are **controller desks**: each is one\n`kind: 'surface'` adapter type in the adapter manager (`desk-controller.ts`,\n`2026-09-24-surface-control-map.md` §10) whose bridge carries the desk's controls onto the\nconsole's rows and the rows back onto the desk, as `adapter-xtouch`'s surface does\n(`xtouchRegistration`, registered beside them in `console-rig.ts`). The console's own south\nadapter is the `software` adapter, the real PipeWire mix engine, built by the composition root.\n\n## The canonical model — `@freemixer/core`\n\nEverything the surface and engine speak, with zero device specifics.\n\n- **`ChannelId = { kind, index }`**, `index` 1-based. `kind ∈ input | fxReturn | aux | mix |\n  matrix | cue | main | fxSend | dca | muteGroup | mixMinus` (`core/src/model.ts` is\n  authoritative). A send is not a special kind — it is a fader at an input × output\n  intersection.\n- **`ChannelStrip`** holds the per-channel state: `fader`, `mute`, `solo`, `pan`, `gain`\n  (head-amp), `phantom`, `polarity`, `eq`, `dynamics`, `inserts`, `sends`.\n- **`FaderLevel = { position, db }`** — an opaque 0..1 surface scalar with dB carried\n  alongside; the device-raw taper stays private to each adapter behind a `FaderScale`.\n- **`MixerTopology`** is what an adapter reports on connect: model name, channel list, stereo\n  pairs, a **capability map** (`has(id, feature)`, mandatory — surfaces grey out what a device\n  cannot do), and the send matrix spec.\n- **`MixerEngine`** holds the canonical state for one bound device, forwards intents to the\n  adapter, and *is* the adapter's `MixerReceiver`, so device-pushed and surface-pushed state\n  share one path and one fan-out. Routing one desk to another is `engineA.subscribe(apply to\n  engineB)` — no special case.\n\nThe pure coupling logic also lives here: **DCA** (`dca.ts` — `effectiveChannelGain` = fader ×\nΠ active masters, with VCA nesting and a cycle guard), **mute groups** (`mute-group.ts` —\n`effectiveChannelMute` = individual OR any active group, individual state never overwritten),\n**scenes and recall-safe** (`scene.ts` — `SavedScene`, the `SafeScope` set, and\n`filterSnapshotForRecall` which strips safed channels/scopes before a recall is applied),\n**sessions** (`session.ts`), and **console allocation** (`console-allocation.ts` — the\n`CONSOLE_PRESETS` from 16:8 to 96:32, default 16:8 = 16 inputs, aux 8 / group 4 / matrix 2 /\nDCA 6 / mix-minus 1 / main 2).\n\n## The software audio engine — `@freemixer/audio-engine`\n\nThe running console is `SoftwareMixer` (`software-mixer.ts`). Its rule (ADR&nbsp;0002): the\n**structural DSP is PipeWire-native** — routing, summing, faders and buses are PipeWire nodes\nand links — and **`mod-host` is used only for the LV2 plugin inserts**. It presents the same\nnorth-facing `MixerAdapter` contract as a console (`SoftwareMixerAdapter`), so a web fader\nmoves a software channel exactly as it moves a Midas channel.\n\nWhat is built here today:\n\n- **Declarative routing.** A desired-graph reconciler (`DeclarativeAudioGraph`) diffs the\n  wanted edges against the live graph and applies the difference over `pw-link`\n  (`PipeWireBackend`); it only tears down edges whose destination it manages, and it detects\n  feedback loops. Routing persists by node/port **name**, never by id, because PipeWire ids\n  churn across restart and replug (ADR&nbsp;0007).\n- **Inserts via mod-host.** Each strip carries an ordered LV2 chain. `planChain` is a pure\n  positional diff that keeps the unchanged prefix stable and computes the exact\n  connect/disconnect edges; `ChainManager` drives it over `ModHostClient` (a small, unit-tested\n  line-protocol codec). mod-host bring-up is non-fatal: if it is down the desk still runs and\n  reports the degraded state through `/health`, reconnecting and re-instantiating when it\n  returns.\n- **Summing.** PipeWire filter-chain bus nodes sum their inputs; the MAIN fader is a real\n  managed node. Buses are single-tier today (an input cap of 64 per bus); a deeper bus tree is\n  explicitly not yet built.\n- **The rest of the console.** Aux/group sends with position-based tap resolution, reorderable\n  channel and bus-master chains (with an EQ↔dynamics swap for buses), stereo channel linking,\n  N−1 mix-minus with a per-channel exclude list, the source layer and direct paths, the matrix\n  crosspoints, DCA and mute-group coupling (as control-domain overlays, no audio nodes), a\n  quantum lever (with an adaptive mode), live peak meters (a GStreamer meter source), and EBU\n  R128 loudness.\n- **Plugin delay compensation.** `setPdc` / `applyPdc` / `pdcReport` measure each insert's\n  latency and delay the shorter summing paths to match, so parallel paths stay phase-aligned.\n\nThe **REAC stagebox** audio path is out of this repo by design: it is C in the sibling\n`reac-pw` / `libreac` projects, behind a hard boundary — the PipeWire node (ADR&nbsp;0009).\nThe TypeScript side never touches a REAC byte; it only wires the named `reac:capture` /\n`reac:playback` ports into the mix graph through the same `pw-link` reconciler used for\neverything else. The receive path and the frame encoder exist and are verified upstream; the\nmaster-role handshake and cadence pacer that let openmixer drive a real desk are the remaining\npiece there.\n\n> Note the legacy `AudioEngineAdapter` (`audio-engine/src/adapter.ts`), a simpler\n> plugin-gain adapter whose sends/solo/pan are still `TODO(M3+)`. The running console uses\n> `SoftwareMixerAdapter`, not this; don't confuse the two when reading the tree.\n\n## The catalog — `@freemixer/catalog`\n\n`tools/scan.py` introspects installed LV2 plugins with `lilv` into `PluginDescriptor`s. Each\n`PluginParam` carries what the UI needs — kind (control/patch), symbol, name, min/max/default,\ninteger/toggle/enumeration/logarithmic/trigger flags, unit, scale points. **`widgetFor(param)`**\nis the entire metadata→UI bridge, one decision table that picks a dropdown, toggle, button,\nstepper, log knob, knob, file path, text, or readout (ADR&nbsp;0010) — there is no per-plugin UI\ncode. `palette()` intersects a curated list with what is installed; the curated set is ranked by\n**measured latency** within each role, so live-safe choices lead. The EQ band model (`eq.ts`)\nand biquad maths (`biquad.ts`) group a plugin's ports into bands from their symbols/names/units\n(with a small per-URI override table) and evaluate a magnitude curve — this is what the\ninteractive EQ draws and edits.\n\n## The server — `@freemixer/server`\n\n`MixerServer` is Fastify. It instantiates the configured adapter, wraps it in a\n`MixerEngine`, and puts every engine event on the affected row's `?watch=1` stream\n(ADR&nbsp;0003). A watch opens with a full snapshot of the row — the root stream with a\nsnapshot of every instance — so a late client renders a populated board off one response.\n\nConfiguration is environment-driven, validated with Zod (`config.ts`):\n\n| Env var | Config | Default |\n|---|---|---|\n| `OPENMIXER_ADAPTER` | adapter (`software` / `midas` / `x32` / `roland` / `mock`) | `mock` |\n| `OPENMIXER_DEVICE_HOST` / `_PORT` | device endpoint | `127.0.0.1` / per-adapter |\n| `OPENMIXER_WEB_HOST` / `_PORT` | HTTP bind | `0.0.0.0` / `8080` |\n\n> **Port note.** The web UI does not hardcode a port. It discovers the server endpoint\n> from `GET <origin>/config`; `:8800` survives only as a fourth-precedence fallback applied\n> when the page is itself served from the Nuxt dev port 3000 — the historical dev split\n> (`web-ui/app/utils/serverEndpoints.ts`). A normal run needs no `OPENMIXER_WEB_PORT` at all;\n> the default is `8080` (`core/src/network-defaults.ts`). Failing all of that, the UI falls\n> back to its offline demo.\n\nStructural rows actuate only when the server is built over the live `SoftwareMixer`\nsurface; the plugin rows need a plugin host; the persistence rows their store directories;\nthe adapter rows an `AdapterManager`; discovery a provider; telemetry a source. Each is\nguarded and refuses with an error when its capability is absent — `OPTIONS` reports what an\ninstance currently allows — which is how the mock and console adapters cleanly refuse what\nthey cannot do.\n\n## Running it from a checkout\n\n`pnpm --filter @freemixer/server console` (or `openmixer-server` — the same thing) stands up\na real software mixer with no hardware. It calls `parseConfig` directly with\n`adapter: 'software'`, so it ignores `OPENMIXER_ADAPTER` / `OPENMIXER_DEVICE_*` and honours\nonly the web-bind and catalog env. It sizes a 16:8 desk, models its virtual I/O, brings up\nthe native mixer node, loads the catalog and builds the `SoftwareMixer` over that topology\nwith the allocation seeded. Nodes are torn down on SIGINT/SIGTERM.\n\nThere was a second bin, `openmixer-demo-lab`, which did all of that and then auto-patched\nthe host's detected mics and application streams onto input channels. It was deleted in\n2026-07: it was never packaged, it built its console on the loopback topology this engine\nno longer uses, and — having neither the engine lock nor the single-engine graph guard — a\nlab instance started next to a running console was exactly the node-name collision those\ntwo guards exist to prevent.\n\n`OPENMIXER_CATALOG` points at the plugin catalog JSON; the built-in default is the\n`@freemixer/catalog` package's own `data/catalog.json` (package-relative), so any checkout or\ninstall resolves it — a host that was never scanned just loads an empty catalog. Run the\nscanner (`packages/plugin-qualify/tools/scan.py`) to populate it.\n\n`openmixer-server` boots the console — the only rig. It used to choose by `rig.preset`\nbetween `bare` (the plain server, no engine) and `demo`, later `console`; that axis\ncollapsed in 2026-07 because nothing ever selected `bare`, which was nonetheless the\n*default*. `openmixer-console` (and its former name `openmixer-demo`) is now an exact\nsynonym of `openmixer-server`, kept for muscle memory. A JSON config file is named with\n`--config <file>` or `OPENMIXER_CONFIG`; the bundled\n`packages/server/config/console.config.json` is the shipped default install config (the\nRPM's) and is empty — it has nothing to select. Retired preset names still parse\nand are ignored, with a startup line saying so. Precedence: config file < env\n(`OPENMIXER_CONSOLE`, `OPENMIXER_GIG`, `OPENMIXER_CATALOG`,\n`OPENMIXER_DEMO_SOURCES` map onto the `rig` section); the web\nbinding runs its own per-field chain, persisted > CLI > env > config file > default, into\nwhich the file's `web` block enters at the bottom — the same file-under-env order.\n\n## The control protocol\n\n**REST is the front door.** Every entity — a channel's fader, a bus, a DCA, a mute group, a\nmatrix point, a session, a scene, an adapter, a discovery device, a telemetry row, and so on —\nis declared once as a `ConsoleResource` and served at `/{root}/{kind}/{index}[/{sub}]` by the\n`ResourceRegistry` (`packages/server/src/rest-router.ts`, `console-resources.ts`). `GET` reads\nit, `PATCH` writes it, `OPTIONS` reports what this instance currently allows, and any `GET`\ntakes `?watch=1` to become that same body as a live `text/event-stream` — there is no separate\nsubscribe verb. Around 85 entities serve today, decomposed from an earlier verb-based wire that no longer exists.\n\nThis is the whole of the wire — there is no WebSocket, no frames, no verbs. Every write is a\nREST patch on the fact's own row, and every read rides that row or its `?watch=1` stream.\n`packages/server/src/dispatch-conformance.test.ts` holds the property mechanically at the\nsource, and `packages/web-ui/app/one-intake-conformance.test.ts` holds it on the surface.\n\n## The graph layout engine and the patchbay\n\n`@freemixer/graph-layout` is a pure, zero-dependency library: feed it a `Graph` (nodes with\ndirectional ports, edges between ports) and `layout(graph, opts?)` returns a deterministic 2-D\nplacement — a column per signal-flow layer, nodes ordered to minimise edge crossings, stereo\nhalves kept adjacent — via a Sugiyama-style pipeline (break cycles, assign layers with a role\nfloor + longest path, minimise crossings with the median heuristic, pair stereo mates, assign\ncoordinates). `followSignal(graph, node)` returns a node's whole upstream + downstream path for\nhover-highlighting. Determinism is a hard requirement: equal input yields byte-identical output.\nIt has no DOM, PipeWire, or framework dependency by design, so the same algorithm can be ported\nto helvum (Rust) or qpwgraph (C++).\n\n`@freemixer/patchbay` binds that engine to real audio. It defines a `GraphSource`\n(`snapshot`, `subscribe`, `connect`, `disconnect`) with three implementations — a live\n`PipeWireGraphSource` (pure `pwDumpToGraph` over `pw-dump`, links via `pw-link`, hot-plug by\npolling), an `HttpGraphSource` for the browser, and a `MockGraphSource` for demos and tests.\n`PatchbayHttp` exposes the three operations the graph tab needs over REST — `GET /patchbay/graph`,\n`POST /patchbay/link`, `POST /patchbay/unlink` — which the mixer server mounts, and which the\nstandalone **`openmixer-patchbay`** bin also serves from a bare `node:http` server with no mixer\nattached (`OPENMIXER_PATCHBAY_HOST` / `_PORT`, default `127.0.0.1:8890`). The web-ui Graph tab\nrenders the same shared `GraphCanvas` over whichever source is reachable, falling back to the\ndemo graph. Serving the graphical canvas statically from the standalone bin is a documented\nfollow-up in the spec — the intended path is a Graph-only web-ui bundle, not a second renderer.\n\n## The surface — `@freemixer/web-ui`\n\nA Nuxt 4 SPA (no SSR — it is a live control surface). It is intentionally thin: components read\nstate from module-scoped composables (`useMixer`, `useStructural`, `useChain`, `useSends`,\n`useScenes`, `usePatchbay`, `useGraph`, `useTalkback`, `useCatalog`, `useTheme`,\n`usePersonality`, …) and send intents through them — never a second wire, never a second\nauthoritative copy of state (ADR&nbsp;0015). Every LV2 control renders through the shared param\nwidgets (`ParamControl` over `Encoder`/`Knob`/`EnumSelect`/`NudgeField`/`ToggleSwitch`), and every\ncontrol has keyboard, wheel, an ARIA role, and a double-click reset (ADR&nbsp;0006/0014). The\nsurface can run with no server via clearly-marked offline mocks in several composables, which\nanswer reads and writes locally until a real server is attached.\n\n**Personalities** are pure web-ui data (`app/utils/personalities.ts` + token blocks in\n`app/assets/tokens.css`) — eight of them, `openmixer` plus `classic-analog` /\n`modern-digital` / `vintage` / `midas` / `roland` / `ssl` / `waves`, orthogonal to the\nbrightness theme (`dark` / `hc` / `light`). `PERSONALITIES` in that file is the list. Adding one\nis a CSS block plus a registry entry. The plugin editor's parameter grid sizes its column\ncount to the parameter count instead of scrolling, and skins each panel with a texture and\naccent tinted to the plugin's vendor family, keyed by URI.\n\n## Running and deploying\n\n```sh\npnpm -r build && pnpm -r test          # the whole workspace\n\nOPENMIXER_WEB_PORT=8800 pnpm --filter @freemixer/server console   # a real software desk\npnpm --filter @freemixer/web-ui dev                               # the surface (dev)\npnpm --filter @freemixer/web-ui generate                          # the surface (static)\n\nNUXT_APP_BASE_URL=/openmixer/ pnpm --filter @freemixer/website generate   # the site, for Pages\npnpm --filter @freemixer/website build                                   # the site, for a console\n```\n\nThe website is statically generated, and it has two deployments: GitHub Pages under a project\nsub-path, and the **console itself**, which serves it at `/help` so a desk that is offline at a\ngig still has its manual. A prerendered page names its assets absolutely (`<baseURL>_nuxt/…`),\nso the path prefix is a **build input** — one config, one artifact shape, `NUXT_APP_BASE_URL`\ninjected per deployment. Building for `/` and serving under a prefix 404s every asset and\nleaves the no-script fallback on screen; that was the rig's dead manual on 2026-08-05.\n\nThe console's prefix is `MANUAL_MOUNT` in `@freemixer/core` — the server mounts it, the surface\ndeep-links through it, and `packages/website`'s default `build` script injects it, so\n`pnpm -r build` on a console produces a site the console can serve. Fonts are self-hosted by\n`@nuxt/fonts` into `_fonts/` at build time; nothing on the page reaches the network at runtime,\nwhich is the point of shipping it at all.\n\n**Where the site is, is derived, not configured.** The server looks in\n`/usr/share/openmixer/manual` (the `openmixer-manual` RPM, staged by `scripts/build-rpm.sh` from\n`build:console`) and then in the workspace build root beside its own package, and serves the\nfirst that carries the manual. Finding neither it answers 404 and says so in the log.\n`OPENMIXER_MANUAL_DIR` exists only to override an unusual layout — a parameter the system can\nwork out must never be one an operator has to remember, which is exactly how a rig came to point\nat a path one level too deep with nothing to notice.\n\n## Design principles\n\n- Keep the load-bearing logic **pure and tested without hardware** — the protocol parser, the\n  chain diff (`planChain`), the graph diff, the mod-host codec, the layout engine, each\n  adapter's address mapping. The stateful drivers are thin shells around them, with the transport\n  behind an injectable seam so the protocol is tested with a fake runner. Things that genuinely\n  need hardware — real REAC framing, live PipeWire latency, live-network discovery — are\n  documented test gates verified on the mixing host, not in CI.\n- **GPL-3.0-or-later**, `SPDX-License-Identifier` on every source file. MIT/BSD/GPL code may be\n  copied in; AGPL code is studied and re-implemented clean, never copied (ADR&nbsp;0016).\n\n### Extending\n\n- **A console adapter** — a new `packages/adapter-<name>` implementing core's `MixerAdapter`,\n  translating `{ kind, index }` to the device's address space and absorbing its quirks *there and\n  only there*; supply a `FaderScale`; declare it in core's `DESK_CONTROLLER_TYPES` and give it a\n  family in `desk-controller.ts`. Test the protocol\n  against captured bytes, not hardware.\n- **A plugin** — usable as soon as `scan.py` finds it installed (addressed by LV2 URI + port\n  symbol, no code); add one `{ role, uri, label }` to `catalog/src/curation.ts` to curate it. The\n  auto editor renders it from metadata.\n- **A view module** — a Vue component reading state from a composable and sending intents through\n  it; reuse the param widgets and give every control keyboard/wheel/ARIA/reset.\n- **A discovery probe** — one protocol per probe emitting `DiscoveredDevice`s, degrading (never\n  crashing) on a missing NIC or route; unit-tested against captured packets.\n\nThe [decision log](../architecture/decisions/) records the reasoning behind each choice.\n",U=`# Clocking and sample rate

## Rate and clock are two different things

It is worth separating them before anything else, because they are easy to conflate:

- **The sample rate** is a number — 44.1, 48 or 96 kHz. On a Roland desk the operator
  picks it from the REAC menu. It is a *choice*, made once, at the mixer.
- **The clock** is the timing reference everything locks to — who actually generates the
  ticks. That is a *separate* setting, and it does not have to be the mixer.

A rig can take its clock from:

- **the mixer itself** (its internal clock — the common case);
- **a stagebox** on the REAC segment;
- **an external source** — Roland desks have a word-clock connector for exactly this, and
  it is how a REAC rig joins a house clock shared with other digital equipment.

**The one hard rule: exactly one clock master on the network.** Two devices both trying
to be master is the classic cause of clicks, dropouts and links that come and go. If you
change the clock source, change it in one place and confirm everything else is following.

The rate is chosen at the mixer regardless of where the clock comes from — the clock
source supplies the *timing*, not the *number*.

### "REAC master" means: you own the clock pace

These are not two roles that happen to coincide — they are the same statement:

> **Being the REAC master is a way of saying you own the clock pace.**
> Whoever emits the clock *is* the master.

The owner sends the frames; that emission **is** the segment's clock, and everything else
answers on that grid.

**Either end can be the owner.** This is not a property of what a device *is* — a stagebox
can own the pace just as a mixer can. It is a **configuration**, set on each device, and
the job is to make sure the two ends agree:

> **Configure the box and the mixer so that exactly one of them owns the clock.**

Two owners on one segment is the classic fault — clicks, dropouts, links that come and go.
No owner at all is equally broken: nothing emits, nothing locks.

| pace owner | the other end | notes |
| --- | --- | --- |
| the mixer | boxes follow its grid | the ordinary live configuration |
| **a stagebox** | the mixer follows the box's grid | equally valid; the mixer is still the desk, it just does not own the pace |
| a real Roland desk | openmixer follows as a box | what openmixer does in slave role |

Whoever owns the pace still has to get its *rhythm* from somewhere. That is the **clock
reference**, a separate question from ownership:

- its own internal clock — the common case;
- an **external word clock** — Roland desks have the connector, and it is how a REAC rig
  joins a house clock shared with other digital gear.

> **Taking your timing from elsewhere does not change who owns the pace.** A mixer locked
> to house word clock still owns the pace, still grants, still drives the segment. It
> simply derives the rhythm of that pace from another source.

### openmixer needs a real clock before it may own the pace

A Roland desk always has an answer to "where does your rhythm come from" — a crystal on
its own board. openmixer does not. It is software on a general-purpose machine, and its
rhythm has to come from some device on the PipeWire graph. That makes clock reference an
*eligibility* question for us in a way it never is for a hardware desk:

> **openmixer may own the REAC pace only if the graph contains a real hardware clock it
> can follow.** We take the best one available and drive the segment from it.

The reason is that our emission *is* the segment's clock. Every box locks to it. Whatever
jitter is in our reference, we hand to the whole rig with the authority of the master — so
"a clock exists" is not the bar; "a clock worth propagating" is. Not all of them are:

| reference | verdict |
| --- | --- |
| a professional interface with a proper PLL (RME class) | the intended case — this is what the RME is for |
| an ordinary onboard or USB codec | workable, but expect more drift; fine for rehearsal, think twice for a show |
| an **HDMI** sink | unsuitable — its audio timing is a by-product of a display clock |
| \`Dummy-Driver\`, \`Freewheel-Driver\`, any software timer | not a clock at all |

### Why a PLL, and how to see whether you have one

Every digital device keeps time with its own crystal, and no two crystals run at exactly
the same speed. Left alone, a stagebox, an audio interface and the computer's graph each
tick at their own rate and slowly drift apart; the converters between them absorb the drift,
which works, but it is a rig held together by correction rather than by a common clock.

A **phase-locked loop** is the circuit that makes one device follow another's timing: it
compares its own ticks with the reference, steers its oscillator until they line up, and
keeps them lined up while filtering the jitter of the reference out of what it passes on.
That is what makes a clock worth propagating. A professional interface such as the RME has
one, so when it drives the graph, every rate on the graph is steady and the REAC pace derived
from it is steady too. A crystal running free has no loop and drifts; a software timer has
no oscillator to steer and jitters with the machine's load.

The REAC clock panel tells you which of these the rig is running on. Each segment shows its
**pace source**, from best to worst:

| pace source | meaning |
| --- | --- |
| \`phc\` | the network card's own hardware clock, or an external reference feeding it |
| \`graph-ref\` | the graph's clock, driven by locked hardware such as the RME |
| \`box-slope\` | the box's own counter, followed as a frequency reference |
| \`foreign-master\` | another desk owns the pace; we follow it |
| \`free-run\` | nothing worth following was found: the pace runs on the machine's timer |

A properly clocked rig shows \`phc\` or \`graph-ref\`. \`free-run\` is a fallback the panel
reports so that it never passes for normal: audio still flows, the converters still cope,
but the rig is drifting rather than locked, and that is the state to leave before a show.

If nothing better than a software timer is on the graph, the honest configuration is to
**let something else own the pace** — a stagebox owns it perfectly well, and following a
real box clock beats leading with an invented one. Free-running as master is an emergency
measure, not a default.

This does not restrict us to the machine's own hardware: a stagebox's recovered clock is a
first-class reference too. What matters is that the rhythm we emit was measured off real
hardware somewhere, not synthesised from a system timer.

#### What software timing can and cannot do

None of this means software clock discipline is weak — it is how we *use* a good reference,
and it is very good at that. Two axes, and they behave differently:

**Frequency accuracy is recovered, not invented.** Counting frames over a window and
dividing by elapsed time recovers the transmitting crystal to **sub-ppm**, because a crystal
is what is being averaged. This is measured, not theoretical: it is how \`reac-repacer\`'s PLL
nulls long-term drift. So a good reference makes us about as accurate as that reference is.
The corollary is the whole point of the rule above — with no crystal in the loop there is
nothing to average, and disciplining to a host timer only makes that timer's drift *smooth*,
never *right*.

**Emission phase is bounded by the scheduler, not by the filter.** Getting the frame onto
the wire at the intended instant is a different problem, and no amount of loop tuning
improves it. Commodity hardware is fine on the *follower* side — a received frame is a tick,
so the cadence comes in for free — but the *owner* side has to place each frame itself.
Closing that gap wants TSN hardware launch time (\`SO_TXTIME\` offload on i226-class NICs);
without it, software timing still carries scheduler wake jitter.

Which is why the follower role is the easy one and owning the pace is the demanding one: as
a follower we inherit both axes from the master. As the owner we must supply both — accuracy
from a real reference, phase from the machine.

### Where this lives in the console: Setup → Clock

The panel's first control is **Master / Follower** — whether openmixer owns the pace. It is
a setting, kept with the session, not something the desk works out from what is plugged in.

- **Master** lists the devices on the graph that could be the reference, says what each one
  is (audio interface / onboard codec / display audio / software driver) and which one
  PipeWire is actually driving from. The desk picks a sane default; **you can designate one
  yourself, and your choice wins** — an interface it does not recognise is still an
  interface. Only the ones that genuinely cannot carry a pace are refused. The sample-rate
  menu then offers what the segment can run: 44.1, 48 or 96 kHz.
- With **nothing on the graph worth propagating**, Master is not offered at all. Free-running
  is available, but only by ticking it explicitly — the panel says what that means.
- **Follower** shows who owns the pace and the rate we are being given, and the rate menu
  goes read-only: that number is not ours to choose. The transport still free-runs on the
  host clock today, so the panel says *free-running* rather than claiming a lock.

Two owners, no owner, and \`Dummy-Driver\` driving the graph all raise a warning in the
header's warnings panel, so they are visible without the Setup page open.

### The 192 kHz limit is physical

REAC runs over **100 Mb Ethernet**, and the downstream broadcast is 1492 B per frame
regardless of how many inputs the box has. That fixes the bandwidth per direction (the
link is full duplex, so downstream and upstream have separate budgets):

| rate | downstream | upstream, 32 ch |
| --- | --- | --- |
| 44.1 kHz | 45.0 Mbps | 36.6 Mbps |
| 48 kHz | 49.0 Mbps | 39.8 Mbps |
| 96 kHz | 97.9 Mbps | 79.6 Mbps |
| 192 kHz | **195.8 Mbps** | 159.2 Mbps |

At 48 kHz the downstream uses about half the link. At 96 kHz it uses nearly all of it —
tight, but workable, because the traffic is isochronous with one talker per direction and
no contention to lose capacity to. **At 192 kHz it would need roughly twice the link, so
it cannot work on 100 Mb hardware.** That is arithmetic, not a limitation of this
software: it would require gigabit stageboxes, which do not exist in this product line.

A practical planning consequence: at 96 kHz the segment has very little spare headroom.
Keep the REAC link on its own dedicated, non-mirrored port (see
[Wiring and NIC](wiring-and-nic.md)) — a mirrored port is already the wrong topology, and
at 96 kHz there is no capacity to absorb anything unexpected.

### 44.1 kHz: supported, but check your plugins

The transport syncs at 44.1 kHz — this has been done on the rig. Whether you *want* to is
a different question, and a third question again is whether your plugins behave there:
some plugins hold a buffer sized for 48 kHz and report a different latency at 44.1 kHz
than their behaviour at every other rate would predict. That is a plugin matter, not a
transport one.

## Setting the graph rate

The rate is a PipeWire property of the whole graph, not an openmixer setting, and it
cannot be changed on a running graph in a way the mixer can force behind your back — the
mixer's clock controls report what the graph is actually doing.

The rig's rate is a console control, not a configuration file: the clock on the Setup page
sets the graph's rate from the rates the hardware declares, and the console keeps it there
across restarts because it is part of the session. A REAC segment keeps its own pace, chosen
in the REAC clock panel, 44.1, 48 or 96 kHz, and the daemon converts between
the two. Editing PipeWire's configuration by hand is not needed and is not how this console
is meant to be run.

Then restart the session's PipeWire and the mixer:

## When there is other hardware on the graph

If the rig also has an audio interface — an RME, a USB card — it is on the same PipeWire
graph, and it must agree. Two rules:

- Set every device to the same rate. A device that disagrees will be resampled.
- An interface that is present but idle can still be elected the graph's driver, which
  is a well-known source of xruns. If you see dropouts on a rig with an unused capture
  device, see [xruns and driver election](../troubleshooting/xrun-driver-election.md).

That interface is also the rig's clock reference when openmixer owns the REAC pace — see
[openmixer needs a real clock before it may own the pace](#openmixer-needs-a-real-clock-before-it-may-own-the-pace).

## Checking

\`\`\`sh
pw-metadata -n settings | grep clock
\`\`\`

The mixer shows the same facts in its **telemetry** panel: the buffer quantum, the
sample rate and a live xrun counter. If the rate there is not 48000 with a stagebox
connected, fix that before chasing anything else.
`,Q=`# REAC stageboxes

openmixer can take its inputs straight off a Roland REAC stagebox and send its outputs
back to the box, with no converter box and no audio-over-IP layer in between. The
transport is handled by \`reac-pw\`, a separate daemon the mixer starts and configures for
you.

This section is what an operator needs to cable, configure and trust the link. It does
not describe the protocol internals — you do not need them, and they are not documented
here.

- **[Supported boxes](reac-boxes.md)** — which models work, how many inputs and outputs
  each gives you, and how you tell the mixer which one is on the wire.
- **[Wiring and the network interface](wiring-and-nic.md)** — the single-master rule,
  what to plug where, and the NIC requirements. **Read this before cabling.** The wrong
  interface produces audio that sounds broken in a way that looks like a decoding bug.
- **[Clocking and sample rate](clocking-and-sample-rate.md)** — who is master, what rate
  the box runs at, and why a mismatched graph rate makes a stagebox sound granular.

## How it fits together

\`\`\`
stagebox  ──(REAC, raw Ethernet)──  NIC  ──  reac-pw  ──  PipeWire  ──  openmixer
\`\`\`

- \`reac-pw\` owns the wire. It runs as the systemd user unit \`reac-pw.service\` and
  presents the box to the rest of the system as two ordinary PipeWire nodes:
  \`reac-capture\` (the box's inputs) and \`reac-playback\` (the box's outputs).
- openmixer sees those nodes exactly as it sees a sound card. You patch them to channels
  in the Patchbay like anything else.
- Head-amp control — phantom power, pad, input sensitivity — travels over the same link.
  See [head-amp control](../manual/head-amp.md) in the operator manual.

## Configuring it

Everything is set from the mixer: **Setup → Adapters → REAC**. That writes
\`~/.config/reac-pw/\` and enables and starts the transport unit. There is no
file to hand-edit for normal use, and nothing about your rig is compiled into any
package — the interface names, the box model and the rates are all runtime
configuration.

See [REAC configuration](../admin/reac-configuration.md) in the administrator guide for
what that file contains.
`,X=`# Supported stageboxes

## The models

| Model | Inputs | Outputs | Identifier |
|---|---|---|---|
| Roland **S-0808** | 8 | 8 | \`s0808\` |
| Roland **S-1608** | 16 | 8 | \`s1608\` |
| Roland **S-4000S** | 32 | 8 | \`s4000s\` |

The identifier in the last column is what the transport is told; the mixer sizes its
\`reac-capture\` node to the box's inputs and its \`reac-playback\` node to the box's
outputs, and labels the ports accordingly.

Declaring the model matters. It is what makes channel 9 on the surface correspond to
input 9 on the box, and it is what stops the desk from offering you inputs the box does
not have.

## Choosing the model in the mixer

**Setup → Adapters → REAC** offers the box model along with the network interface and a
label for the box. The label is yours — "Stage left", "Drums" — and it is what the
patchbay shows.

Two honest limitations of the current Setup screen:

- The model list in Setup offers **S-0808** and **S-1608**. An **S-4000S** works — the
  transport recognizes it on the wire with nothing configured (reac-pw, 2026-08-05) — but
  the Setup menu cannot express it, so an S-4000S rig leaves the model unset and the box
  declares itself. See [REAC configuration](../admin/reac-configuration.md).
- **One box per REAC segment.** The transport tracks a single stagebox: the first box to
  complete its handshake owns the link, and frames from any other box on the same wire
  are ignored. Driving several boxes at once is designed but not built. If you need two
  boxes, they need two separate segments (two NICs, or two VLANs) and two transport
  instances.

## Which desk the mixer impersonates

REAC has no fixed master — any device on the segment can be the master and the rest
slave to it. When openmixer drives a stagebox it acts as the master, presenting itself as
a Roland desk. Which desk it claims to be is configurable (\`M-200\`, \`M-300\` or \`M-5000\`;
the default is **M-200**), and it changes only the identity on the wire: a box locks to
any of the profiles.

You will normally never touch this. It exists because a box may validate what kind of
device is talking to it.

## What you get in the mixer

Once the box has established:

- \`reac-capture\` appears in the **Patchbay** as a source device band with one row per box
  input, numbered \`1 … N\`.
- \`reac-playback\` appears in the output routing row, so a bus or the main mix can be sent
  to a box output.
- Per-input head-amp control — **+48 V phantom**, **pad**, **sensitivity** — is available
  on the source layer. See [head-amp control](../manual/head-amp.md).

If the box never appears, work through
[the box is not establishing](../troubleshooting/box-not-establishing.md).

## Other boxes

Other REAC devices exist and some of them will very likely work — the handshake is not
model-specific — but only the three models above are declared, sized and labelled by the
mixer, and only they have been run on real hardware. Treat anything else as untested.
`,V=`# Wiring and the network interface

REAC is raw Layer-2 Ethernet. There is no IP, no DHCP and no routing: the mixer and the
stagebox talk directly over the wire with a dedicated EtherType. Everything below follows
from that.

## Use a dedicated wired interface

The interface the transport captures on must be:

- **Wired.** Not Wi-Fi, not a USB tether, not a bridge to anything else.
- **Dedicated to REAC.** Nothing else should share the segment. Management traffic,
  file copies and streaming on the same wire will not corrupt audio, but they will
  compete with it for the very steady packet cadence the link depends on.
- **Up, with no IP address.** REAC needs no addressing. Give the interface no IPv4 and
  no IPv6; an address only adds unrelated traffic to a wire that should carry nothing
  else.

A second physical NIC (or a VLAN on a NIC whose other traffic you control) is the normal
arrangement: one interface for management and the network, one for the stagebox.

## Never use a mirrored switch port

This is the failure that is worth its own heading, because the symptom does not point at
the cause.

A **mirrored** (SPAN / monitor) switch port delivers **every frame twice** — once as the
real frame and once as the mirror copy — and it does so in both directions. Feed the
transport from such a port and every block of audio is played twice. What you hear is
**granular, stuttery audio**, on a link where the box establishes normally, phantom power
works, and metering looks right. It sounds like a broken decoder. It is not.

Mirror ports exist for diagnosis. They are for watching a link, never for carrying one.

The transport does now drop byte-identical duplicate frames, and that guard is what makes
such a link sound clean, so you may not notice you are on a mirrored port at all. Do not
rely on it: it is a robustness guard against duplicated delivery, not a supported
topology. On a correctly-cabled interface it does nothing.

If you suspect this, see
[granulated or stuttery box audio](../troubleshooting/granulated-audio.md).

## Cabling

- **Direct cable** from the mixer's REAC NIC to the box is the simplest and the most
  reliable arrangement. Use it unless you have a reason not to.
- **Through a switch** works. Give REAC its own switch, or its own VLAN on a switch you
  control, and make sure that the port the mixer uses is an ordinary access port — not a
  mirror destination, not a port with storm control or IGMP snooping doing anything
  clever to Layer-2 traffic it does not recognise.
- **Cat 5e or better**, standard Ethernet lengths. REAC runs over ordinary Ethernet
  cabling.

## The single-master rule

Exactly one device on a REAC segment may be the master. When openmixer drives a box, the
mixer **is** the master: it owns the clock and drives the handshake.

That means:

- Do not put a Roland desk that is also acting as master on the same segment. Two masters
  on one wire is not a configuration the box can resolve; the visible result is a box that
  never settles, or one that flaps between establishing and dropping.
- Do not run two copies of the transport on the same interface.
- If a real desk must own the segment, the transport can run as a **slave** instead, but
  that is a different rig topology and not what Setup configures for you.

## Interface names

Interface names are configuration, never a compiled-in default. Find yours with:

\`\`\`sh
ip -br link
\`\`\`

Pick the wired interface that goes to the box and enter it in **Setup → Adapters →
REAC**. If the machine has several similar-looking interfaces, unplug the stagebox and
watch which one loses carrier.

Two names are configurable: the capture interface and the transmit interface. They are
normally the same interface and Setup treats them as one; a split is only useful in
diagnostic rigs.

## A checklist before a show

\`\`\`sh
ip -br link                       # the REAC NIC is UP, with no address
systemctl --user status reac-pw
journalctl --user -u reac-pw -n 50
\`\`\`

Then look at the mixer's Patchbay: the box should be there, with the right number of
inputs.
`,j=`# openmixer documentation

openmixer is a from-scratch professional software mixer. It takes audio from a stagebox
or any PipeWire source, mixes it with faders, native EQ and dynamics and LV2 plugin
inserts, and sends the mix back out to the PA — driven from a web surface that any number
of devices can share at once. One device-neutral mixer model sits in the middle;
everything else — the surface, the audio engine, the I/O — plugs into it.

## Start here

- **[Installing openmixer](install/index.md)** — \`dnf install\`, enabling the services,
  first boot, and a walkthrough from silence to one mixed channel.
- **[Operator manual](manual/index.md)** — running the desk: the surface, the channel
  strip, EQ and dynamics, feedback suppression, sends and buses, cue and solo, the
  patchbay, scenes and sessions.
- **[REAC stageboxes](hardware/index.md)** — supported boxes, wiring, the network
  interface rules, clocking.
- **[Troubleshooting](troubleshooting/index.md)** — one page per symptom.

## Running a rig

- **[Administrator guide](admin/index.md)** — services, ports, configuration files, the
  environment-variable reference, state directories, logs, backup.

## Development

- **[Architecture](architecture/index.md)** — the layered design, the technical manual,
  and the decision log.
- **[Rig hardware map](reference/rig-hardware-map.md)** — the development rig's network
  interfaces, clock master, and where each physical thing is.
- **[RME Babyface Pro FS notes](reference/babyface-pro-notes.md)** — I/O, clocking and
  routing patterns worth borrowing.
- **[reac-pw integration](reference/reac-pw-integration.md)** — how the REAC transport is
  driven from the mixer.
- **[Deploying to the development rig](operations/deploy.md)** — the build-and-restart
  sequence and the deploy gate. Not the product install; see
  [Installing openmixer](install/index.md) for that.

Specifications, implementation plans and dated research notes are internal development
material, kept in this repository but not part of the published site (see the table below).

## How this tree is organised

| Directory | Audience | Published |
|---|---|---|
| \`install/\`, \`manual/\`, \`hardware/\`, \`admin/\`, \`troubleshooting/\` | operators and administrators | yes |
| \`architecture/\` | developers | yes |
| \`reference/\`, \`operations/\` | developers, rig-specific | no |
| \`design/\` | developers — specs, plans, research | no |
| \`design/archive/\` | history — dated, unmaintained | no |

One topic per page, so each page is a translation unit and a Catalan mirror can match the
English tree file for file.

## Licence

GPL-3.0-or-later. © Pau Aliagas &lt;linuxnow@gmail.com&gt;. See
[the architecture overview](architecture/overview.md) and
[ADR&nbsp;0016](architecture/decisions/0016-gpl3-no-agpl-code-copied.md) for the licence
policy — in particular, why no AGPL code is copied in.
`,K=`# First boot

A fresh install boots a complete, working console with no configuration and no
environment variables. This page describes what you should see and how to confirm it.

## What starts

\`openmixer-server.service\` runs

\`\`\`
/usr/bin/openmixer-server --config /etc/openmixer/config.json
\`\`\`

and the shipped \`/etc/openmixer/config.json\` is empty:

\`\`\`json
{}
\`\`\`

It has nothing to select. There is one boot path — the console — and it is the product:
a sized input/output topology, its own virtual PipeWire nodes, the plugin catalog, the
buses, the native mix engine. The desk you see on first boot is the desk you will use.

It was chosen by a \`rig.preset\` key until 2026-07, when the second rig (\`bare\`, which
started no engine and which nothing ever selected) was deleted. An upgraded host keeps
its own \`/etc/openmixer/config.json\`, so a file naming any of the old presets still
parses — the server ignores the key and says so at startup.

The file is marked \`%config(noreplace)\`, so your edits survive a package upgrade.

## Where the surface lives

nginx terminates TLS and HTTP/2 with a certificate the console issues itself, and serves
the surface at:

\`\`\`
https://<host>:8443/
\`\`\`

The server itself listens on **8080** (loopback only) and nginx proxies \`/api/*\` (the
REST entity API and its \`?watch=1\` live streams), \`/manual\`, \`/health\`, \`/telemetry\` and
\`/patchbay/*\` to it. There is no WebSocket — every live value on the surface arrives over
that same HTTPS connection. Port **8880** carries no API: it only redirects to 8443 and
serves the page a browser uses to install the console's certificate before it trusts it,
at \`http://<host>:8880/trust/\`.

The console's own browser needs nothing — installing \`openmixer-web-ui\` puts the
certificate authority into that machine's system trust store. **Every other device needs
one step, once**: see [Trusting the console's certificate](trust-the-console.md).
See [Ports](../admin/ports.md) for the full picture, and
[the web UI cannot reach the server](../troubleshooting/web-ui-cannot-reach-server.md) if
a device will not connect.

## Health checks

\`\`\`sh
systemctl --user status openmixer-server
curl -s http://127.0.0.1:8080/health
curl -sk https://127.0.0.1:8443/api/net/binding
\`\`\`

\`/api/net/binding\` answers with the network facts the surface uses (host, port, which
layer set them). \`/health\` answers with the server's liveness view.

From another machine, the equivalent through nginx:

\`\`\`sh
curl -sk https://<host>:8443/health
\`\`\`

## What you should see in the browser

The surface draws a header with the openmixer mark, a connection indicator, the theme
and personality pickers and the two panic buttons; a channel view across the upper part
of the screen; and the fader bay below. The connection indicator is the thing to read
first — it says *Connecting*, *Connected*, *Demo (offline)* or *Disconnected*.

**Demo (offline)** means the browser could not reach a server and is drawing a simulated
board. It is a useful way to learn the controls, but nothing you do in it touches audio.
If you see it on a fresh install, go to
[the web UI cannot reach the server](../troubleshooting/web-ui-cannot-reach-server.md).

## Logs

Both units log to the journal:

\`\`\`sh
journalctl --user -u openmixer-server -f
journalctl --user -u reac-pw -f
\`\`\`

## Does the desk work at all?

Five checks, two minutes, before you trust anything else on the console. If any of these
fail, stop here and fix it before going further — everything else assumes they hold.

1. **The board comes up populated.** Open the surface in a fresh, cold browser tab (not a
   reload of one you had open before) — twice. Every time, the full channel board
   appears: no tab that connects but shows no strips.
2. **A reload keeps the desk.** Reload the tab against a running console. Every strip
   reappears, in the same order, with its name, and the faders sit where the mix left
   them.
3. **A restart reconnects on its own.** Restart the server
   (\`systemctl --user restart openmixer-server\`) while the tab is open. The connection
   indicator shows *Disconnected*, the values on screen do not reset, and the surface
   reconnects by itself once the server is back — no reload needed. Move a fader after it
   reconnects and confirm the move lands.
4. **A restart never leaves audio running unmanaged.** With something audibly playing
   into a channel, restart the server. The room goes silent the moment the server stops
   — never a burst of raw, unmixed audio — and stays silent until the console has
   reconnected and taken the graph back over.
5. **Routing and trims survive a restart.** In the patchbay, assign an input to a
   channel and set a trim on an output, then restart the server. Both are still there
   once it reconnects — routing and trims are part of the session, not the running
   process.

## Next

[Your first session](first-session.md) takes you from this state to audible sound.
`,Z=`# Your first session

Goal: from a silent, freshly-installed console to **one source audible in the main mix**,
saved so it comes back tomorrow. Ten minutes, no stagebox required.

If you do have a REAC stagebox, read [the hardware guide](../hardware/index.md) first —
especially [the network interface rules](../hardware/wiring-and-nic.md) — and then follow
the same steps, choosing a stagebox input instead of a local source at step 2.

## 1. Open the surface and check you are live

Open \`http://<host>:8880/\`. The connection indicator in the header must read
**Connected**. If it reads *Demo (offline)*, stop here — nothing you do will make sound —
and see
[the web UI cannot reach the server](../troubleshooting/web-ui-cannot-reach-server.md).

## 2. Give the desk a source

Everything the machine is playing is patchable. The quickest source is any application:
start music in a media player, or audio in a browser tab.

Open the **Patchbay** chip. Its rows are the live sources the server can see and its
columns are your input channels. The player you just started appears as a new row. Tick
the cell where that row crosses **channel 1**.

More than one source may be summed into a channel. A source feeding several channels is
flagged, with a count, so a fan-out is never invisible.

## 3. Send the main mix somewhere you can hear

Below the patchbay grid, the **output routing** row picks the real sink each bus and the
main output feed. Set **Main** to your headphones or monitor interface.

If Main stays silent from here on, the cause is almost always the output route, not the
mixer: see [silent main output](../troubleshooting/silent-main.md).

## 4. Set the gain before the fader

Select channel 1 in the fader bay and open the **Processing** chip. At the top of the
strip is the **head-amp gain** — the input trim, a different control from the fader.

Bring the trim up until the channel meter sits healthily in its working range and never
touches the clip indicator on the loudest part of the material. The strip's state dot
tells you the same story at a glance: grey for silence, green for signal, red for clip.

Gain first, always. The fader is for balance, not for finding signal.

## 5. Bring the fader up

Push channel 1's fader up to around unity. You should hear it. The main meter moves.

Mute and un-mute the channel to confirm you are hearing the path you think you are.

## 6. Shape it, if you want to

The **Processing** chip lays the channel out in signal order — trim, high-pass, gate,
EQ, dynamics, inserts, fader — with a tab for each part.

- **EQ** draws the channel's response as one curve. Drag a band point sideways for
  frequency, up and down for gain, wheel over it for Q. The high-pass and low-pass points
  sit at each end of the same curve.
- **Gate** and **Compressor** have their own tabs with the same live curve treatment.
- **Plugins** adds LV2 inserts from the curated catalog.

None of this is required to finish the exercise.

## 7. Save the session

Press \`Ctrl\`/\`⌘\`+\`S\`, or use **Save session** in the header. Give it a name.

A session is the whole console: every level, mute, solo and send, the buses, the matrix,
DCA and mute-group membership, every plugin chain with its parameters, the routing and
the surface layout. Loading one moves every connected screen at once.

The **Setup** chip's session browser lists, loads and deletes saved sessions.

## What you now have

A channel with signal, gain staged, routed to a main output you can hear, saved. From
here:

- [Operator manual](../manual/index.md) — the whole desk: buses, DCAs, sends,
  cue/solo, feedback suppression, scenes.
- [REAC hardware](../hardware/index.md) — putting a real stagebox in front of it.
`,Y=`# Installing from the console image

The image is a full Fedora bootc install: flash it, answer nothing — **it installs onto the first
disk it finds and erases it** — and the console is running when it reboots. This is the recommended path — see [Packages](packages.md) for the alternative
of installing onto a Fedora you already have.

> **Status (2026-09-08).** The \`console\` variant boots, answers \`/health\` and \`/api/plugins\`, issues
> and anchors its own certificate, updates and rolls back between two image tags, and converges
> under the Ansible playbook — all measured on a real qcow2/VM built against a LOCAL dnf tree (the
> published repo still answers 404; see \`docs/design/notes/2026-09-08-image-proofs-lane.md\` for
> full traces and five real defects found and fixed along the way). **Not yet measured**: the ISO's
> unattended install completing end to end (it was mid-install when the build host itself
> rebooted), and the \`desk\` variant's kiosk screen (built, not re-verified after the fixes below).
> The ISO built in this run is **2.3 GB**; first-boot timing is not yet measured.

## Two variants

Every release publishes two images from the one build:

| tag | what it runs |
|---|---|
| \`console\` (\`:44\`) | The server alone — a headless box driven from a laptop, today's rig. |
| \`desk\` (\`:44-desk\`) | The server **plus** a kiosk session that opens the console's own web UI, full-screen, on the box's own monitor. |

Both are the same product at the same version; \`desk\` only adds a screen. A surface that should
show a *different* console's desk (not this box's own server) is not part of either variant —
point a browser or a kiosk unit at that console's address instead, and see
[Trusting the console's certificate](trust-the-console.md) first.

## 1. Download the ISO

Each release publishes \`openmixer-console-fc44-<version>-x86_64.iso\` and
\`openmixer-desk-fc44-<version>-x86_64.iso\` as GitHub Release assets. The version in the
filename is the tag — and the tag is one dnf repo snapshot, so \`/health.version\` on a running
console will read that same string back once it is up (see [Upgrading](upgrading.md)).

## 2. Write it to a USB stick

\`dd\` it, or use Fedora Media Writer / Balena Etcher if you would rather not type a device path by
hand:

\`\`\`
sudo dd if=openmixer-desk-fc44-<version>-x86_64.iso of=/dev/sdX bs=8M status=progress
\`\`\`

**Double-check \`/dev/sdX\`** — \`dd\` overwrites the device you name with no confirmation and no
undo. \`lsblk\` before you type the command, not after.

## 3. Boot it

Boot the stick from your firmware's boot menu (F12, F11 or Esc on most machines). Whether the
stick boots with Secure Boot on has not been verified yet — the ISO built and its unattended GRUB
selection was proven headless in a VM (no Secure Boot in that path), but the disk write itself was
interrupted by a host reboot before an install completed. If the firmware refuses it, turn Secure
Boot off for the install and tell us.

## 4. Nothing to answer

The install is unattended (\`packaging/image/kickstart/console.toml\`, embedded in the ISO). It
answers the three questions Anaconda would otherwise ask:

- **Disk** — the whole first disk, always. There is no disk picker; a box with more than one
  drive should have any drive it does not want wiped disconnected before this step.
- **User** — \`openmixer\`, password \`openmixer\`, in the \`wheel\` group (so \`sudo\` works, and asks
  for that same password). This is a **documented default** and every console flashed from one
  image starts with it: see [§5a](#5a-the-password) for changing it, and for the switch that makes
  the box ask for its own instead.
- **Timezone** — whatever the image itself carries (UTC, Fedora's own default). Nothing in the
  installer sets this; it is a property of the image, not a question asked at install time.

None of the three configures the desk — the web UI, the audio graph and every per-console fact
in §6 below arrive after the box reboots, never through the installer.

## 5. Reboot; what happens without you

On first boot, \`openmixer-firstboot.service\` runs once: it issues this machine's own TLS
certificate authority and leaf (never the same key two consoles would ever share), anchors that
root into the system trust store, enables the HTTPS block, resolves and labels the web port, and
arms the engine's \`--user\` unit under \`loginctl enable-linger\` so it runs with nobody logged in.
Only once that unit has succeeded does \`gdm.service\` start (\`desk\` variant only) — the ordering is
deliberate: a kiosk that opened before the certificate existed would show a certificate warning on
a screen with no keyboard to dismiss it.

- **\`console\`** — the box is now a headless server. Nothing shows on an attached monitor; reach it
  from another machine's browser (see step 7).
- **\`desk\`** — the box logs in as \`openmixer\` and opens \`https://localhost:8443/\` full-screen. That
  is the console's own web UI, not a separate viewer — see the next section.

**Nothing is asked, and nothing waits.** A console is switched on before a show, often with no
keyboard attached: the boot has no question in it, and the mixer is what appears. If the first-boot
unit ever FAILS, the desk does not open — the machine stays on its text console with that unit's
error printed on it, which is the screen you want when something is wrong, rather than a browser
showing a connection error that looks like a network fault.

## 5a. The password

The image ships one, documented, the same on every box flashed from it:

| | |
|---|---|
| user | \`openmixer\` |
| password | \`openmixer\` |
| can \`sudo\` | yes, in the \`wheel\` group, asking for that same password |
| root | **locked** — there is no root login, on the console or over ssh |

**Change it** on any box that is reachable by people who should not have it. From another machine:

\`\`\`
ssh openmixer@<the console's address>        # password: openmixer
passwd                                       # asks for the old one, then the new one twice
\`\`\`

or at the console itself: \`Ctrl+Alt+F3\` for a text login, \`passwd\`, then \`Ctrl+Alt+F1\` back to the
mixer. Nothing on the console reads this password again — it is an ordinary account password, and
the desk keeps running while you change it.

**Or have each box ask for its own, at its first boot.** One switch, \`/etc/openmixer/firstboot.conf\`:

\`\`\`
ask-console-password = yes
\`\`\`

With that set BEFORE a box's first boot, the console stops on a full-screen prompt and asks for a
password for \`openmixer\`, twice, before the mixer opens; an empty answer or two that do not match
are refused and it asks again. It waits as long as it takes — nobody can answer it remotely, so
this is for boxes someone will be standing at the first time they are switched on. It asks once per
first boot: a machine that completes its first boot is never asked again, and one whose first boot
FAILS partway (no network for the certificate step, say) asks again the next time it is switched
on, together with everything else that first boot does.

To turn it on for a box that has already booted, clear the first-boot stamp as well:

\`\`\`
sudo sed -i 's/^ask-console-password.*/ask-console-password = yes/' /etc/openmixer/firstboot.conf
sudo rm /var/lib/openmixer/.firstboot-done
sudo systemctl reboot
\`\`\`

Two things to know before you enable it:

- **Nothing checks how good the password is.** There is no minimum length and no complexity rule —
  whatever is typed is accepted. Twelve characters or a short passphrase is a sensible house rule;
  the console will not enforce one for you.
- **There is no way back in if it is forgotten.** Root is locked and no other account exists, so a
  console whose password nobody remembers is re-flashed from the ISO (which erases the disk; the
  session and takes on it go with it). With the documented default left in place this cannot
  happen, which is part of why it is the default.

## 6. Plug the boxes in

REAC stageboxes and the RME clock master are hardware this image cannot know about at build time
— see [the hardware guide](../hardware/index.md) for cabling, then
[the Ansible section](#7-per-console-facts-ansible) below for how their NIC names and clock role
reach the console.

## 7. Per-console facts: Ansible

The image is identical on every console it is flashed onto. What makes *this* box this room's
desk — its console size, which NICs carry which REAC segment, which device is the clock master, a
private repo mirror if this room has one, and a TLS re-issue after a rename — is carried by
\`ansible/playbooks/configure-console.yml\` against the \`consoles\` inventory group, not baked into
the image. Trusting the console from an operator's laptop is the separate
[trust page](trust-the-console.md) walk, not an Ansible role — pushing a CA onto a fleet of
laptops the console does not own would be a second door onto the same trust store.

## 8. Open the desk

- On a \`desk\` console's own screen: it is already open.
- From anywhere else, on either variant: \`https://<box-address>:8443/\`. Find the box's LAN address
  the way your network already tells you (DHCP lease list or mDNS); the desk does not display it
  yet.
- **Every *other* device visits \`http://<box-address>:8880/trust/\` first** — the certificate this
  machine minted for itself in step 5 is trusted by nothing else yet. See
  [Trusting the console's certificate](trust-the-console.md); it is not optional.

## Until the project opens

The image and the packages live on private registries for now, and pulling them needs a
credential from the project. Those steps are internal and change when the project opens; ask
for them rather than reading them here.

## 9. Updating and going back

\`bootc-fetch-apply-updates.timer\` (enabled in the image, no updater of our own) pulls the tag the
machine was flashed from. It is bootc's own unit and runs \`bootc update --apply\`, which reboots
the machine when a new image was staged — so leave the timer disabled during a show and update
between shows, or run \`bootc update\` by hand and reboot when it suits you. This has not yet been
observed on an installed console. To go back:

\`\`\`
bootc rollback
systemctl reboot
\`\`\`

The previous deployment is still on disk — rollback does not re-download anything. Proven both
directions on a real VM (2026-09-08): \`bootc switch\` to a second tag moves \`/health.version\`
forward after a reboot, and \`bootc rollback\` + reboot moves it back, with zero failed units either
time. See [Upgrading](upgrading.md) for what does and does not restart.

## The RPM path still exists

Everything above is one way to get the same bits [Packages](packages.md) installs with \`dnf\` on a
Fedora you already run. One signed repository feeds both; a dnf user and an image user are running
the same openmixer.
`,J=`# Installing openmixer

openmixer installs from RPM packages with \`dnf\`. Nothing here assumes a development
checkout: the packages carry the engine, the web surface, the systemd units and a
default configuration that boots a working console on first start.

Read these in order the first time. If you would rather flash a disk image than run \`dnf\`
yourself, start with **[the installable console image](image.md)** instead of step 1 — one
signed repository feeds both paths.

1. **[Packages](packages.md)** — what each package contains, the install order of the
   three-repo stack (\`libreac\` → \`reac-pw\` → \`openmixer\`), and the one command that
   installs a mixer without a stagebox.
2. **[Services](services.md)** — the two systemd **user** units, why lingering is
   required, and how to prove they survive a reboot.
3. **[First boot](first-boot.md)** — what a fresh install does when it starts, where to
   point the browser, and the checks that tell you the install is healthy.
4. **[Your first session](first-session.md)** — a walkthrough from silence to one
   channel audible in the main mix.
5. **[Trusting the console's certificate](trust-the-console.md)** — the one step every
   device other than the console itself needs before a browser will open the surface
   without a warning, per platform, including the two that fail silently.
6. **[Upgrading](upgrading.md)** — what \`dnf upgrade\` does and does not restart, and how
   session files survive a version change.
7. **[The bootable image](image.md)** — the \`bootc\` alternative to installing RPMs by
   hand, and how a console pulls it while the image stays private.

## What you need

- A Fedora host (the packages are built and tested against Fedora 42; Fedora 41 builds
  clean as well) with PipeWire running in the operator's user session.
- Node 22 or newer — pulled in as a package dependency, not something you install by
  hand.
- \`nginx\`, pulled in by \`openmixer-web-ui\`.
- For a REAC stagebox: a **dedicated wired network interface**. See
  [the hardware guide](../hardware/index.md) before you cable anything — the NIC choice
  is the single most common cause of bad audio.

## Where to go afterwards

- [Operator manual](../manual/index.md) — running the desk.
- [Administrator guide](../admin/index.md) — ports, configuration files, environment
  variables, state directories, logs, backup.
- [Troubleshooting](../troubleshooting/index.md) — one page per symptom.
`,$="# Packages and install order\n\nopenmixer ships as a small family of RPMs spread over three repositories. Only the\n`openmixer` ones are needed for a mixer that takes audio from the host's own sound\ndevices; the REAC packages are added when the rig drives a Roland stagebox.\n\n## The packages\n\n| Package | Repository | What it installs |\n|---|---|---|\n| `openmixer` | `FreeMixer/openmixer` | A meta-package. Installs nothing itself; pulls in the server and the web UI. |\n| `openmixer-server` | `FreeMixer/openmixer` | The engine and control plane under `/usr/lib/openmixer/server`, the command-line wrappers `/usr/bin/openmixer-server`, `/usr/bin/openmixer-console` and `/usr/bin/openmixer-patchbay`, the default `/etc/openmixer/config.json`, and the two systemd **user** units. |\n| `openmixer-web-ui` | `FreeMixer/openmixer` | The static web surface under `/usr/share/openmixer/web-ui` and the nginx drop-in `/etc/nginx/conf.d/openmixer-web-ui.conf`. Its `%post` issues the console's own certificate under `/etc/openmixer/tls` and enables the https origin once the leaf is there. Requires `nginx` and `openssl`. |\n| `openmixer-plugins-*` | `FreeMixer/openmixer` | Meta-packages that pull in a curated set of LV2 plugins (`-live`, `-live-extra`, `-studio`, …). |\n| `reac-pw` | `FreeREAC/reac-pw` | `/usr/bin/reac-pw`, the REAC transport daemon. The binary only — the systemd unit that integrates it belongs to `openmixer-server`. |\n| `libreac` | `FreeREAC/libreac` | The shared REAC library `reac-pw` links against. Installed automatically as a dependency. |\n\n`openmixer-server` **recommends** `reac-pw`. A weak dependency is only considered at the\nmoment openmixer is first installed: if you enable the FreeREAC repository *afterwards*,\na later `dnf upgrade` will not pull `reac-pw` in on its own. Install it explicitly in\nthat case.\n\n## Install order\n\nPackage dependencies handle the order for you when you install from a repository:\n\n```sh\nsudo dnf install openmixer          # server + web UI\nsudo dnf install reac-pw            # only if this rig drives a REAC stagebox\n```\n\n`reac-pw` pulls `libreac` in as an ordinary shared-library dependency.\n\nInstalling from local RPM files instead — for example a set you built yourself — the\norder does matter, because `dnf` will not resolve the FreeREAC packages for you:\n\n```sh\nsudo dnf install libreac-*.rpm\nsudo dnf install reac-pw-*.rpm\nsudo dnf install openmixer-*.rpm openmixer-server-*.rpm openmixer-web-ui-*.rpm\n```\n\n## Plugins\n\nThe channel and output insert chains use LV2 plugins. Install one of the curated sets:\n\n```sh\nsudo dnf install openmixer-plugins-live\n```\n\nIf no plugins are installed the desk still runs — faders, EQ, dynamics, buses and\nrouting are all native — but the plugin picker will be empty. See\n[the empty-catalog troubleshooting page](../troubleshooting/plugin-catalog-empty.md).\n\n## What the install does to the host\n\n- **firewalld**: `openmixer-web-ui` opens TCP **8880** permanently. Removed again on a\n  full uninstall, not on an upgrade.\n- **SELinux**: `openmixer-web-ui` labels `/usr/share/openmixer/web-ui` as\n  `httpd_sys_content_t` so nginx may serve it.\n- **Capabilities**: the `reac-pw` package applies `cap_net_raw,cap_sys_nice=ep` to\n  `/usr/bin/reac-pw` in its own scriptlet. openmixer never runs `setcap` on anything.\n  Raw packet capture and real-time scheduling are what those grant; without them the\n  REAC transport cannot see the wire.\n- **Services**: nothing is enabled automatically. See [Services](services.md).\n\n## Verifying the install\n\n```sh\nrpm -q openmixer openmixer-server openmixer-web-ui reac-pw libreac\ngetcap /usr/bin/reac-pw          # expect cap_net_raw,cap_sys_nice=ep\nopenmixer-server --help\n```\n",ee=`# Enabling the services

openmixer runs as **systemd user units**, not system services. The engine is a native
PipeWire client and has to live inside the session that owns the operator's PipeWire
graph; a system unit would land in a different graph and find no audio devices.

Two units ship with \`openmixer-server\`, both installed to \`/usr/lib/systemd/user/\`:

| Unit | What it runs |
|---|---|
| \`openmixer-server.service\` | \`/usr/bin/openmixer-server --config /etc/openmixer/config.json\` — the mixer engine and control plane. |
| \`reac-pw.service\` | \`/usr/bin/reac-pw\`, serving every declared REAC segment. Reads \`~/.config/reac-pw/reac-pw.env\` plus one \`<iface>.env\` per segment. Owned by the reac-pw package, not by openmixer. |

## Enable lingering first

\`\`\`sh
loginctl enable-linger "$(whoami)"
\`\`\`

This is **required**, not optional. systemd stops a user's units when that user's last
session ends. Without lingering the mixer dies when you log out and does not come back
after a headless reboot.

## Enable the engine

\`\`\`sh
systemctl --user enable --now openmixer-server
sudo systemctl reload nginx
\`\`\`

The web surface is then on \`http://<host>:8880/\`.

## Do not enable the REAC unit by hand

\`reac-pw.service\` is registered by the package but deliberately left disabled.
Configure the transport from the mixer itself — **Setup → Adapters → REAC**. That writes
\`~/.config/reac-pw/\` and enables and starts the unit for you.

Enabling it by hand on a host that declares no interface does not crash-loop: the unit's
command line requires \`REAC_LIVE_IFACE\` to be set and fails fast with a
message naming the Setup path. That is the intended behaviour, but you have gained
nothing over letting Setup do it.

The unit also refuses to start if \`/usr/bin/reac-pw\` has lost its file capabilities. It
checks \`getcap\` before exec and fails with an explicit message rather than dying on a
silent \`EPERM\` inside the capture path. If you ever see that, reinstall or repair the
\`reac-pw\` package.

One further detail worth knowing if you edit the unit: \`NoNewPrivileges=\` is deliberately
**not** set on \`reac-pw.service\`. The kernel ignores file capabilities across
\`execve()\` when that flag is on, which would silently strip \`CAP_NET_RAW\`.

## Prove it survives a reboot

Starting once is not the test. Reboot the machine, do not log in, and check from another
session:

\`\`\`sh
machinectl shell <operator>@ /bin/systemctl --user status openmixer-server reac-pw
\`\`\`

Both should be active. If they are not, lingering is the first thing to check.

## Check the units resolve from the packaged path

\`\`\`sh
systemctl --user list-unit-files | grep -E 'openmixer-server|reac-pw'
\`\`\`

Both should come from \`/usr/lib/systemd/user/\`. A leftover file at
\`~/.config/systemd/user/<name>.service\` **shadows** the packaged unit of the same name,
so a package upgrade will appear to have no effect. That is exactly what this check
catches; a rig migrating off hand-installed units should run
\`deploy/systemd/migrate-to-packaged.sh\` from the source tree.

## Restarting

\`\`\`sh
systemctl --user restart openmixer-server
systemctl --user restart reac-pw
\`\`\`

Restarting the REAC unit is safe with a box connected: the stagebox re-runs its handshake
by itself and is normally back within a few seconds.
`,ne=`# Trusting the console's certificate

The console serves its surface over HTTPS. It has to: no browser will speak HTTP/2 without
TLS, and HTTP/2 is what lets one tab hold every live meter, fader and stream the surface
displays over a single connection.

The certificate it serves is one it issued itself, signed by its own local authority. That
authority is not on the internet's list of the ones every browser already knows, so a
browser meeting the console for the first time says the connection is not private. Nothing
is wrong. The browser is telling you, correctly, that it has never been introduced.

This page is the introduction. It is one step per device, once.

## Why not a real certificate

A publicly-trusted certificate is issued to a **domain name**, by an authority that checks
you control that name — either by answering on port 80 from the public internet, or by
writing a record into the name's DNS zone. A mixing console on a show LAN has neither. It
has a hostname, an mDNS name, and whatever address the DHCP server handed it this morning.
There is no zone to answer in.

The second reason matters more on a show day. Public certificates expire in about ninety
days and are renewed automatically over the internet. A console in a truck with no uplink
would eventually boot with an expired certificate, and it would do it at the worst possible
moment, behind a browser error page nobody can read past. The console's own authority is
valid for ten years and renews its certificate locally, without asking anyone.

If a console is ever given a real DNS name in a zone with an API token, that trade changes
and is worth revisiting. Until then, this page is the cost, and it is paid once per device.

## The console itself is already done

When \`openmixer-web-ui\` is installed it issues the certificate **and** installs the
authority into that machine's own system trust store. A browser running on the console
never sees a warning. Uninstalling the package takes the authority back out again; the
certificate files stay, so reinstalling does not send you round every device a second time.

Everything below is for the *other* devices — the tablet at the desk, a phone on the wing,
a laptop in the truck.

**A device typing the address is not the only way in.** The console's own Help → About shows a
QR code for its address — scan it from a phone or tablet already sitting near a trusted screen
instead of typing an IP address off a truck floor. It opens the console directly; a device
meeting this console for the first time still lands here first, on this page's own address,
which About prints beside the QR.

## Get the certificate

Every console serves it, in plain HTTP, at a fixed address:

\`\`\`
http://<console>:8880/trust/
\`\`\`

That page carries the download and the same per-platform steps as this one, so you can
reach it from the device you are setting up without copying a file off a laptop.

The plain port exists for exactly this and serves nothing else — a device that trusts
nothing cannot use HTTPS to fetch the thing that would give it trust. Everything else on
that port redirects to the HTTPS origin.

The file itself:

\`\`\`
http://<console>:8880/trust/root.crt
\`\`\`

## Install it

### Linux

Fedora, RHEL and relatives:

\`\`\`sh
sudo cp openmixer-root.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust extract
\`\`\`

Debian, Ubuntu and relatives:

\`\`\`sh
sudo cp openmixer-root.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
\`\`\`

If the machine has openmixer installed, the console's own script does whichever of those
two applies, knows how to undo it, and is safe to run twice:

\`\`\`sh
sudo /usr/libexec/openmixer/anchor-local-ca.sh openmixer-root.crt
sudo /usr/libexec/openmixer/anchor-local-ca.sh --remove openmixer-root.crt
\`\`\`

### Chromium and Chrome

Nothing further on Linux, macOS or Windows — they read the operating system's store, so
the step above is the whole job. On Android, see below.

### Firefox

**Firefox keeps its own store and ignores the system one.** Installing the certificate for
the operating system changes nothing in Firefox, and the symptom is identical to not having
installed anything at all. Do one of these:

- Open \`about:config\`, accept the warning, and set \`security.enterprise_roots.enabled\` to
  \`true\`. Firefox then reads the system store and the step above starts working. Restart
  Firefox.
- Or import it directly: **Settings → Privacy & Security → Certificates → View
  Certificates → Authorities → Import…**, choose the file, and tick *Trust this CA to
  identify websites*.

### Windows

Double-click the file → **Install Certificate** → **Local Machine** → *Place all
certificates in the following store* → **Browse…** → **Trusted Root Certification
Authorities**. It must be that store; the one Windows offers by default will not work.
Restart the browser.

### macOS

Double-click the file to open Keychain Access and add it to the **System** keychain.

Then — and this is the step people miss — find it in the list, open it, expand **Trust**,
and set *When using this certificate* to **Always Trust**. An imported-but-untrusted root
fails exactly like no root at all.

### iOS and iPadOS

Open the trust page in Safari and tap the download; allow the profile. Then install it:
**Settings → General → VPN & Device Management → openmixer → Install**.

Then, separately: **Settings → General → About → Certificate Trust Settings**, and turn on
full trust for *openmixer console local CA*. The profile alone does nothing, and again the
symptom is indistinguishable from having skipped the whole page.

### Android

**Settings → Security & privacy → More security settings → Encryption & credentials →
Install a certificate → CA certificate**, accept the warning, and pick the downloaded file.
The exact path varies by vendor; searching the settings for *CA certificate* finds it.

It lands in the user store. Chrome honours it; some apps do not. That is Android's rule,
not the console's.

## The names the certificate covers

A browser checks the name you typed against a list inside the certificate, and refuses
anything not on it — even with the authority installed. The console puts the names it can
see at the moment it issues:

- \`localhost\`, \`127.0.0.1\` and \`::1\`
- its hostname, and its \`.local\` mDNS name
- its hostname under each domain its resolver searches (\`console.lan\`, if the DHCP server hands
  out a \`lan\` search domain)
- every non-loopback address it held when the certificate was issued

**The \`.local\` name is the one to teach people.** Addresses move with a DHCP lease; the
mDNS name does not.

If the console's address has changed since the certificate was issued, reaching it by the
new address warns again. Re-issuing fixes it and costs nobody a second trip round the
devices — they trust the *authority*, and the authority does not change:

\`\`\`sh
sudo rm /etc/openmixer/tls/console.crt /etc/openmixer/tls/console.key
sudo /usr/libexec/openmixer/issue-local-ca.sh /etc/openmixer/tls
sudo nginx -t && sudo systemctl reload nginx
\`\`\`

The reload is deliberate and is the operator's call: it drops every open connection, so
every surface re-dials at once. Do it between shows, not during one.

**\`nginx -t\` or the reload fails outright, \`cannot load certificate … Permission denied\`,
on a console issued before 2026-09-08:** the older issuer minted the pair in a scratch
directory under \`/tmp\` and \`mv\`d it into place, and \`mv\` never relabels — the files kept
\`/tmp\`'s SELinux label instead of picking up \`/etc/openmixer/tls\`'s. Fixed issuers write
the certificates in place under \`/etc/openmixer/tls\` and relabel what they wrote as their
own last step, so a re-issue on an updated console does not hit this; on a console still
running the older issuer, or on files left behind from before the update:

\`\`\`sh
sudo restorecon -F /etc/openmixer/tls/*
\`\`\`

## If it still warns

| what you see | what it is |
|---|---|
| the warning names a different host than the one you typed | the name is not on the list above — use the \`.local\` name, or re-issue |
| Firefox warns, everything else is fine | Firefox's own store; see above |
| macOS or iOS still warns after importing | the second step — *Always Trust*, or *Certificate Trust Settings* |
| nothing loads at all, not even a warning | the network, not the certificate; the device cannot reach the console |
| \`nginx -t\`/reload fails, \`Permission denied\` loading the certificate | a stale SELinux label from before 2026-09-08 — \`sudo restorecon -F /etc/openmixer/tls/*\` |

## Removing it

Reverse whichever step you followed. On Linux, \`anchor-local-ca.sh --remove\` does it. The
console removes its own when the package is uninstalled.
`,te=`# Upgrading

## \`dnf upgrade\` does not restart the mixer

This is deliberate, and it is the single most important thing to know about upgrading a
live rig.

\`\`\`sh
sudo dnf upgrade openmixer openmixer-server openmixer-web-ui
\`\`\`

replaces the files on disk and the unit definitions, but the **running** engine keeps
serving the pre-upgrade code. The package's uninstall scriptlets use the plain systemd
user macros, not the restart-on-upgrade variants. A console mid-show is never bounced by
a package transaction.

Nothing changes until you restart the units yourself.

## Restarting after an upgrade

Pick a moment when silence is acceptable, then:

\`\`\`sh
systemctl --user restart openmixer-server
systemctl --user restart reac-pw     # if this rig drives a stagebox
\`\`\`

The source tree also carries \`scripts/deploy-live.sh\`, which gates the restart behind a
shadow boot of the newly-installed server against a **copy** of the rig's real session on
a spare port, a \`reac-pw\` capability check, and a post-restart health check. If you have
the checkout, prefer it — it catches an upgrade that cannot load this rig's session
*before* the live one goes down.

## Session and scene files across versions

Sessions, scenes, patches and channel configs are JSON files under the state directory
(see [state and session directories](../admin/state-and-sessions.md)). They are written
by the server and read back by the server; a version change does not rewrite them until
you save again.

Before an upgrade on a rig whose sessions matter, copy the state directory:

\`\`\`sh
cp -a ~/.local/state/openmixer ~/openmixer-state-$(date +%F)
\`\`\`

That is the whole backup. Restoring is a copy back with the units stopped.

## Configuration files are preserved

- \`/etc/openmixer/config.json\` is \`%config(noreplace)\`: your edited copy survives, and
  the package's new version lands beside it as \`.rpmnew\` if the shipped default changed.
- \`~/.config/reac-pw/\` is written by the mixer's own Setup screen and is not
  owned by any package, so no upgrade touches it.
- The nginx drop-in \`/etc/nginx/conf.d/openmixer-web-ui.conf\` **is** package-owned. If
  you edited the listen port or the upstream by hand, keep a copy — and reload nginx
  after an upgrade:

  \`\`\`sh
  sudo systemctl reload nginx
  \`\`\`

## After restarting, verify

\`\`\`sh
systemctl --user status openmixer-server reac-pw
curl -s http://127.0.0.1:8080/health
getcap /usr/bin/reac-pw          # a reac-pw upgrade that lost its caps shows up here
\`\`\`

Then load your session and check that the sources you expect are present. A session
records the hardware it expected when it was saved, so a restore onto a rig missing a
box tells you what is absent instead of failing quietly.

## Downgrading

\`dnf downgrade\` on the same package set works and, like an upgrade, changes nothing
running until you restart. Sessions saved by a newer server are not guaranteed to load
into an older one — this is what the pre-upgrade copy of the state directory is for.
`,oe=`# Alignment

Two instruments with the same name and different jobs:

- **Align** — two microphones on **one source**, made to arrive together. A kick drum with
  a mic inside and one outside; a snare top and bottom; a guitar cabinet with a dynamic and
  a condenser on it. Its own ROW on the **Analysis** chip (alongside [FBS](fbs.md) and
  [HRP](hrp.md), which share the same chip), because it is a channel-level instrument.
- **Speakers** — the **loudspeakers in the room**, made to arrive together. The delay stack
  under the balcony, the front fills, the delay towers. It lives in the **PA Setup** tab,
  alongside [Room](room.md) — Speakers and Room are PA setup, not channel processing, so they
  share one tab, last in the strip, under a numbered strip that names where you are in the
  procedure: **Aligned → Positions → Modes confirmed → Proposals → Applied → Re-swept**. Each
  step lights once the fact behind it is true — a measurement taken, two or more mic positions
  added, a mode confirmed, a cut proposed, applied, and re-measured — so the whole PA setup
  reads as one flow rather than two unrelated panels.

They are the same measurement pointed in opposite directions, and both are answered with a
delay and, where it applies, a polarity flip.

Neither of them is the **delay** tab beside them. That one is the musical effect — feedback,
wet and dry, ping-pong. Alignment is fully wet, has no feedback, and is applied before every
tap point in the chain.

![Layouts, Processing, Align](images/alignment-1.png)
*The Align tab with channel 2 picked as the reference and no measurement taken yet: the picker holds the reference, the four readouts wait for the first capture, and the delay stays at zero until you apply one.*

## Align — two microphones on one source

Pick the **reference** — the other microphone on that source — and read four numbers. Only
input channels are offered as a reference: alignment is a relationship between two
microphones on one source, and a bus is many sources summed.

| Number | What it is |
|---|---|
| **Delay** | How much later this microphone should be pushed, in milliseconds, to land with the reference. This is what gets applied. |
| **Polarity** | Whether this microphone should be flipped. Also applied. |
| **Coherence** | Whether to believe the other two. Low coherence means the two microphones are not hearing enough of the same thing for the measurement to mean anything. |
| **Residual** | What the delay and the flip did **not** explain. A small residual means the pair really is just offset in time; a large one means something else is going on. |

There is no phase-against-frequency curve, on purpose. Every number here is a single value
you act on, and a dense plot on a touchscreen during a show is not something anybody reads.

**Below 0.50 coherence the fit is refused** and the panel says so — a confident wrong number
is worse than none.

**The measurement runs because the panel is open.** Opening it arms the desk to measure this
pair and no other; closing it stops. Nothing is measured that nobody is looking at.

**Nothing is applied until you press APPLY.** The analyser never writes by itself. It shows
what it found and waits. Pressing APPLY spends it: the delay onto the channel's alignment
delay, the flip onto the channel's ordinary polarity switch — the same one you would reach
for by hand.

Pressing APPLY a second time on an aligned pair does nothing further: the correction is
already in, and the measurement now reads near zero because the pair is aligned. That is the
check, not a bug.

### When it refuses

Every refusal is named on screen rather than left as a silent failure:

- **the measurement is stale** — nothing has been heard close enough in time to trust;
- **coherence is too low** — the two microphones are not hearing the same source;
- **the reference is this channel** — a channel cannot be aligned to itself;
- **no shared energy** — one of them is silent;
- **no capture / no reference** — one of the two is not patched.

**A pure sustained tone is not a valid test signal.** A sine wave is the same at every
period, so "how much later" has no single answer. Use the real source: a played instrument,
a voice, programme material.

**Re-align all** re-runs the measurement on every channel that already names a reference —
the soundcheck gesture: set the references once, then re-align after anybody moves a
microphone. It never invents an alignment for a channel that has no reference.

It runs several passes per channel rather than one, and that is not caution for its own
sake. A single fit under-reads by a few per cent, because the delay costs some overlap
between the two analysis windows. Each pass then works on a smaller remainder where that
bias is smaller, and the error falls roughly twenty-fold each time — measured on a real
pair as 4.748, then 0.236, then 0.015, then 0.000 ms. It stops as soon as the correction it
would apply is negligible.

Alignment is per channel and is saved with the show. Load a show that never had one and the
alignments are gone with it, which is correct: they belong to a microphone placement, not to
a desk.

## Speakers — the loudspeakers in the room

Offered on outputs that feed a box. A measurement microphone stands in the room, each
loudspeaker is measured against its own feed, and the delay that makes them arrive together
is offered per box.

**A loudspeaker is one box on one socket.** A mix reaches its destination through one leg, and
that leg's sides land on their own sockets — MAIN's left box on one, its right box on another.
Each side is its own row here, measured on its own and corrected on its own: aligning the near
box does not move the far one. The reference is a box too, so the picker beside the reference
output asks which one everything else is matched to.

Three numbers per loudspeaker:

| Number | What it is |
|---|---|
| **Arrival** | How long the sound takes to get from the console to the microphone — the flight through the air plus everything in the signal chain. |
| **Coherence** | Whether to believe it. |
| **Residual** | What the delay does not explain. Mostly the room. |

### Two rules that are enforced, not suggested

**A measurement microphone in front of the PA and routed back into it is a feedback loop.**
The desk refuses to measure while that channel is assigned to MAIN or holds any send, and it
says which one is in the way. Clear the assignment and the send, then measure. The panel
repeats the instruction because you are the one who has to clear it — but the refusal is
where it cannot be skipped.

**One loudspeaker at a time.** A microphone hears the sum, so the procedure is: mute
everything but one, measure it, move on. Every box's row is on screen and measuring;
the silent ones say so. The desk remembers each box's last good arrival, so a correction
is still a difference from the reference even while the reference is silent. That is what
makes a stereo PA workable: silence the right box, read the left one, silence the left box,
read the right one, and the two rows hold both answers at once.

### Doing it

1. Put the measurement microphone where the audience is — for a delay stack, under it.
2. Patch it to a channel, set its gain, and make sure that channel is **not** assigned to
   MAIN and has **no** sends. The desk will tell you if it is.
3. Select the output you are aligning and open its **PA Setup** tab.
4. Mute every other box. Play something broadband through the one you are measuring.
5. Read the arrival. Check the coherence before you believe it.
6. **APPLY** on that row, which spends the correction on **that box's own delay** — the side
   of the leg its socket is on. Nothing else on the desk moves.
7. Unmute, move to the next box, repeat.

Each row applies its own correction to its own box. There is no "align everything" button
here, because there is no order in which every box can be measured at once.

A side with no socket of its own has no box, and the desk says so rather than taking a number
for it: a leg that routes only one side, or one that folds both sides onto a single socket, has
one loudspeaker and one delay.

## Related

- [The channel strip](channel-strip.md) — where polarity lives, and the signal order the
  alignment delay sits in.
- [The matrix and outputs](matrix-outputs.md) — the leg, and the per-side delay a loudspeaker
  correction is spent on.
- [EQ and dynamics](eq-dynamics.md) — the Delay tab, which is the other thing entirely.
`,ae=`# The channel strip

## The tile in the bay

![The fader bay](images/channel-strip-1.png)
*The fader bay: tiles in banks of eight, the selected strip outlined, MAIN pinned to the right.*

Each strip in the fader bay shows, top to bottom:

- a small **state dot** — grey when silent, green on signal, red on clip, and a distinct
  colour when the engine has flagged a feedback ring on the channel — and the strip
  **number** (\`M\` for Main);
- the **name**, which you click to rename, and a scribble **colour**;
- a **latency badge** that opens the channel's latency breakdown, and turns hot when the
  path runs long;
- the **head-amp gain** control — the input trim, a different control from the fader;
- the **meter** (one column for mono, an L/R pair for a linked or stereo strip, each with
  peak-hold);
- the **fader** with its dB readout;
- **mute** and **solo** (Main has no solo);
- one-tap live helpers: a **−6** trim, **TAME** for a ringing channel, and **SPARE** to
  swap in a spare.

Pan and the deeper processing are deliberately not on the tile. You reach them by
selecting the strip and opening the channel view above, which keeps the tile itself large
and thumb-friendly.

### Badges on the tile

A tile carries a badge only while there is something to say, so a tile with none is a clean
channel rather than an unfinished one.

- **FBS** and **HRP** — the feedback suppressor or the harmonic processor is on for this
  channel. A plain badge means armed and listening; lit solid with a glow, it is cutting right
  now.
- **HELD** (red) — a mute group or PANIC is silencing the channel, whatever its own **MUTE**
  says. Release it where it was set: the mute group, or PANIC.
- **SIP** (amber) — a solo-in-place is keeping the channel out of MAIN. Clear the solo, or make
  the channel solo-safe.
- **FEED** (red, glowing) — on a mix: the output leg this mix feeds is muted, so the
  destination it names is silent while the mix itself still meters.
- **NO DEVICE** (red) — the channel is patched to hardware that is not on the rig, so it passes
  no audio. Hover it for the device it is waiting on.
- **TRK** — the channel is playing a recorded track in a
  [virtual soundcheck](recording.md#virtual-soundcheck) instead of its live input.
- **a dB figure** in an outlined chip — a DCA is pulling on this channel, and the figure is
  the level it actually plays at with every DCA over it applied.
- **the latency badge** — the path's total in milliseconds, amber above 12 ms. Press it for the
  breakdown.

## Mixing a channel

### Signal order

![Layouts, Processing](images/channel-strip-2.png)
*The channel view for the selected strip: the head-amp row on top, then the section tabs.*

Select a channel and open the **Processing** chip. The strip lays the signal out in order:

\`\`\`
head amp → trim → high-pass / low-pass → gate → EQ → dynamics → inserts → fader → sends → bus
\`\`\`

with a chip for each of the parts you edit most: **EQ**, **Gate**, **Compressor**,
**Speakers**, **Delay**, **Reverb**, **Plugins** and **Sends**. Which of them appear depends on
the strip: a bus has no corrector and no alignment, and a console profile modelled on a desk with
no delay strip does not show one. The spectrum analyser (RTA) is always visible beside the
controls, whichever chip you have open. See [EQ and dynamics](eq-dynamics.md) and
[alignment](alignment.md).

**Analysis** is a stacked chip rather than a single door: alignment, the feedback suppressor and
the harmonic resonance processor each get a row on it, showing their name, where they stand, and
their own on/off switch. Click a row's name to bring that one's controls up; throw its switch to
arm or release it without leaving what you are looking at.

Every stage switches in and out with the same switch — the EQ, the gate, the compressor, the
analyser and the two correctors all read the same way, on the chip and in the controls beside it.

Each stage's controls window carries **copy** and **paste** in its top corner: copy takes that
one stage from this channel, and paste puts it on another. Paste stays dim until the clipboard
holds that stage and the channel you are on can carry it; hovering says which of the two is
missing. The whole channel's copy/paste is still in the channel bar's **⋯** menu.

The order of the processing blocks is not fixed — the default console profile allows free
reordering, and the plugin rack is where you move inserts within the chain.

### Badges on the channel view's header

The channel view's header line repeats the facts that change what you are hearing:

- **STEREO** — the strip is a linked or stereo pair, and its controls move both legs.
- **NO DEVICE** (red) — the source this channel is patched from is not on the rig. Hover it for
  the reason.
- **NOT LANDED** (amber) — a head-amp setting, phantom power or the pad, was sent to the box
  and the box has not confirmed it. One badge covers the whole head amp; hover it for which
  setting and why. See [trusting what you see](head-amp.md#trusting-what-you-see).

### Gain staging

Set gain at the **head amp** first, so the channel meter sits in its working range and
never touches clip on the loudest part of the material. Then shape with EQ, gate and
compressor, add any plugin inserts, and ride the fader.

The fader is for balance. If you are using it to find signal, the gain is wrong.

Two distinct controls are easy to confuse:

- **Head-amp gain / sensitivity** — the analogue input stage, before conversion. On a
  stagebox channel this control *is* the box's sensitivity; see
  [head-amp control](head-amp.md).
- **Trim** — a fine digital adjustment after conversion, composing with the gain.

![Setup, Come-up gain](images/channel-strip-3.png)
*Come-up gain, in the config zone: the make-up the desk applies when a source is brought up.*

### Pan

A channel's pan control places it in the stereo image, dead centre at rest. It is one dial —
there is no separate balance control on a channel strip; MAIN's own pan is its balance (see
[buses are strips too](#buses-are-strips-too)).

**What this stage guarantees:** Every sample this stage produces is a finite number — never NaN, never infinite. Panning follows a constant-power law: centre sits 3 dB down on each side so the perceived loudness stays constant.

## The channel overview

The **Channel overview** panel shows the whole of the selected channel on one screen: every
stage as a small card, each with its own encoders, so you can read a channel at a glance instead
of stepping through the tabs. Add it from **LAYOUTS ▸ Add panel** like any other panel.

The cards read top to bottom in the channel's own order:

- **Input** — gain, pad, 48 V and polarity. On a strip with no head amp (a bus, or a channel
  with nothing patched to a preamp) the whole card is greyed and says why; it is never hidden,
  so you can always see that the channel has no input stage rather than wondering where it went.
- **one card per processing stage** — Gate, EQ, Compressor, Drive, Delay and Reverb — **in the
  order this channel actually runs them**. If you drag the processing tabs into a different
  order, the cards follow, because both read the same channel setting. Each card has the
  section's on/off switch beside its name.
- **Fader** — the fader, pan, mute and the channel's meter.
- **Sends** — one bar per destination.

Gate, EQ, Compressor and Drive draw a small picture of what they are doing — the gate and
compressor curves, the EQ response, the drive's shape. Delay and Reverb carry encoders only.
The pictures are there to be read, not grabbed: to edit a curve by hand, open the section.

**Every encoder is the real control.** Turn one and the channel changes, exactly as it would on
the section's own tab; double-click resets it to the value the desk itself comes up at. Each
encoder is drawn from the travel this channel reports — a preamp that reaches 65 dB shows 65 —
and a control the desk has not described yet is shown greyed rather than over an invented scale.

**The card's title is a door.** Click the name on any card and the Processing panel opens on
that section, on the same channel.

### The send bars

Each bar is one destination: its short name, how far the send is up, the dB, and a \`PRE\` tag
when the send is pre-fader. **Tap a bar** and the fader bay flips to sends-on-faders for that
destination, which is where a send is actually ridden — see
[sends, buses and DCAs](sends-buses-dcas.md).

The bars show the send LEVEL, not audio. They move when a send moves; they do not meter what is
going down it.

## The bay overview

The **Bay overview** panel is the same cards for **eight strips side by side**, one column each,
with the rows lined up across the bay: every gate on one line, every EQ on the next. It is how
you compare a bank — see at a glance which channels have a gate in, where the drive is up, which
one has a send open.

- It **follows the fader bay**. The eight strips are the bank the bay is showing; page the wall
  and the overview pages with it. There is no separate navigator.
- The **selected channel's column is lit**, and clicking a column head selects that channel —
  the same selection every other screen uses.
- Each column draws **its own channel's order**, so a channel whose stages were reordered reads
  as an odd column. That is deliberate: the bay shows you what each channel really does.
- A bank with fewer than eight strips draws the columns it has.
- Every encoder works exactly as it does in the channel overview, on that column's channel.

Narrow the panel and the columns get tighter, down to a floor: past it the panel **scrolls
sideways** rather than dropping a strip or wrapping a column onto a second row. Eight stay eight.

## Mute and solo

Mute and solo are on the tile and echo to every screen. Solo feeds the cue and monitor
path, not the mains — see [cue, solo and the monitor](cue-solo.md) for what PFL, AFL and
solo-in-place each do, and for the momentary solo-clear.

A channel muted by a **mute group** keeps its own mute state underneath: release the
group and it returns exactly as it was.

## Stereo channels and linking

Two different things, both available from the strip:

- **Link** folds two *adjacent* mono channels into an odd–even pair — \`03–04\` — so they
  move together. Console muscle memory: either channel of the pair names the pair.
- **Width** makes the *selected* channel a single strip carrying an intrinsic L/R pair.

A linked or stereo strip meters as an L/R pair. Beside its name
every strip carries a small width tag: **S**, lit, on a stereo strip, and **M** on a mono one.

## Renaming and colour

Click the name on the tile to rename it. The scribble colour is identity metadata only —
it changes nothing about the signal, and it is what makes a wall of 48 channels readable
from the back of a room.

## Buses are strips too

An aux or a group master reuses the same processing view: a bus has its own chain, its own
EQ and dynamics, and its own inserts. What it does not have is a head amp, and the
sections that make no sense on a bus are simply absent rather than greyed out.
`,se=`# Cue, solo and the monitor

Solo on this desk feeds a **cue bus**, and the cue bus feeds a monitor output you choose.
It never feeds the mains. That is a deliberate design rule, and it is what makes solo safe
to press during a show.

## Where the controls are

![The header, right of the panic buttons](images/cue-solo-1.png)
*The cue and monitor block in the header: cue mode, SIP arming, solo clear, monitor source, level and dim.*

An always-visible **cue and monitor** block in the header, beside the emergency controls.
It is console-wide state, so it is reachable from any bank without changing what the fader
bay is showing.

## The three cue modes

| Mode | What you hear | When |
|---|---|---|
| **PFL** | Pre-fader listen: the channel before its fader. | Checking a source, setting gain, finding a fault. The fader position does not matter. |
| **AFL** | After-fader listen: the channel as it sits in the mix. | Judging what the audience gets from that channel. |
| **SIP** | Solo in place: everything *not* soloed is muted **in the mains**. | Almost never during a show. |

PFL and AFL are one tap.

**SIP is guarded.** It is disabled until you arm it in Setup, and even then the button
requires a deliberate confirm step. The reason is obvious once stated: SIP mutes the
programme the audience is listening to. The guard is there so nobody reaches it by
accident on a dark stage.

## Solo clear

A momentary **clear** drops every active solo at once. Use it rather than hunting for
which strips are still lit.

## The monitor output

The monitor picker lists the live sinks the cue bus can feed — headphones, a wedge, a
second interface output — and routes the cue bus to the one you choose.

It is the same routing action the patchbay's cue row performs, so the two views always
agree: change it in either place and the other follows.

Alongside it:

- **Monitor level** — the standard encoder, with the same hold-to-reveal behaviour as
  every other encoder on the surface.
- **DIM** — a fixed attenuation for talking to someone without letting go of the level.
- **Takeover (A/B)** — switches which source the monitor position is following, so a
  monitor engineer can flip between two references without repatching.

## Solo does not affect the mains

Worth repeating because it is the opposite of some desks' defaults: pressing solo on this
console changes what is in your headphones and nothing else. The mains keep running.

The one exception is SIP, which is why it is guarded.

## If the monitor is silent

1. Is a monitor output picked at all? The picker shows the current sink.
2. Is the monitor **level** up, and is **DIM** off?
3. Is anything soloed? PFL and AFL only produce sound when something is cued.
4. Does the chosen sink actually work — can you hear the main mix through it? If not, the
   problem is the device, not the cue path; see
   [the main output is silent](../troubleshooting/silent-main.md).
`,ie=`# EQ and dynamics

## The interactive EQ

![Layouts, Processing, EQ](images/eq-dynamics-1.png)
*The interactive EQ: drag a band on the curve, or use the encoder bank beside it.*

The **EQ** tab draws the channel's frequency response as one curve and lets you shape it
by hand. It is touch-first:

- **drag a band point** left and right for frequency, up and down for gain;
- **roll the wheel** over a band point to tighten or widen its Q;
- **double-click the open curve** to add a band at that frequency; select a band and press
  **Delete** (or Backspace) to remove it;
- the **high-pass** and **low-pass** points sit at each end of the same curve — drag them
  to set the cutoff, tap one to switch the filter on or off.

A live readout under the curve shows each band's exact frequency, gain and Q as you drag,
and an encoder bank below does the same job for fine numeric work. The curve and the
encoders edit one shared state, so moving either moves the other.

Every control is keyboard-reachable: arrows nudge, Enter toggles a filter.

The curve is drawn from what is actually shaping the signal — the EQ in the channel's EQ
stage plus the built-in high-pass and low-pass — not from a generic picture.

This is a **dynamic-band** EQ, not a fixed-band one: a channel opens with a handful of
starter bands, and from there you add, drag and remove bands freely — bands sort by
frequency and renumber as you go, so there is no "band 3" that stays band 3. That differs
from a desk with a fixed set of named bands (Bass/LoMid/HiMid/Treble and the like) in the
way that matters on a real show: no band sits unused because the mix didn't need it, no
problem frequency goes untreated because every named slot is already spoken for, and each
band is a decision the operator made, not a slot the desk handed out. A restrictive
[console profile](look.md) may offer a different EQ character (a fixed
musical set, for instance), and will say so by simply not presenting the dynamic controls.

**What this stage guarantees:** Every sample this stage produces is a finite number — never NaN, never infinite. This stage's internal state never settles into denormal numbers that could stall the audio thread. Bypassed, this stage's output is identical to its input, sample for sample.

### The band chips

Under the graph, a row of chips picks what the encoders edit:

- one chip per **parametric band**, dimmed while the band is off, and marked when it is a
  notch the feedback suppressor planted;
- **HPF** and **LPF** for the two filters;
- **＋** adds a band, greyed when the EQ has no room for another;
- **⇅** sorts the bands by frequency, which renumbers them.

With a band selected, **DEL** at the end of its row removes it.

## Gate

The **Gate** tab has its own live curve and the usual controls: threshold, range, attack,
hold and release.

The gate sits **before** the EQ in the default signal order, so it keys off the raw input
rather than off whatever the EQ has just done. Some console profiles enforce
gate-before-compressor; the openmixer profile does not force an order.

### Keyed detection

By default the gate's detector listens to the same signal it gates. The **Key** block below
the gate controls lets it listen to something else instead:

- **Key source** picks what the detector hears — another channel, or **Self**. The channel's
  own fader always carries its own full-range audio; only what the *detector* listens to
  changes.
- **Key HP** / **Key LP** filter the detector only, never the audio itself. Set with both
  edges together, they make a band: a **Voice band** button sets them to a vocal's
  fundamental-and-presence window (120 Hz high-pass, 8 kHz low-pass) in one tap — useful on a
  self-keyed mic so it opens on its own voice and ignores bleed sitting outside that band.
  Left at 0, an edge is off.
- **Key listen** feeds the filtered detector to the cue bus, the same way PFL lets you hear a
  channel pre-fader, so you can hear exactly what the gate is reacting to before trusting it.

Typical uses: a bass channel keyed by the kick so the low end stays tight to the kick's own
timing; a snare-bottom mic keyed by the snare-top mic so hi-hat bleed does not open it; a
vocal mic self-keyed through the voice band so a neighbouring vocalist's spill does not open
it.

**What this stage guarantees:** Every sample this stage produces is a finite number — never NaN, never infinite. This stage's internal state never settles into denormal numbers that could stall the audio thread. Bypassed, this stage's output is identical to its input, sample for sample. This stage never adds gain — its output level never exceeds what came in. At its default settings, this stage passes audio through unchanged in level.

## Compressor

![Layouts, Processing, Compressor](images/eq-dynamics-2.png)
*The compressor: the transfer curve, with threshold, ratio and the live gain-reduction readouts beside it.*

The **Compressor** tab likewise draws its transfer curve: threshold, ratio, knee, attack,
release and make-up gain, with the curve showing the result as you move them.

The default profile makes several dynamics types available in the two dynamics stages —
gate, expander, compressor, limiter, ducker, de-esser and multiband compressor. A stage
takes one of them.

**What this stage guarantees:** Every sample this stage produces is a finite number — never NaN, never infinite. This stage's internal state never settles into denormal numbers that could stall the audio thread. Bypassed, this stage's output is identical to its input, sample for sample. Output level never exceeds input level by more than the makeup gain you set — this bounds level, never a sample's peak. At its default settings, this stage passes audio through unchanged in level.

## Native FX

The channel's own send-type effects — **Delay** and **Reverb** today, and chorus or flanger when
those land — share one chip, **Native FX**, in the processing view's channel block beside
**Analysis**. It is built the same way: one row per effect, always listed whether it is on or off,
each showing its name and its own on/off switch. Hover a name to see its current settings.

| Control | What it does |
|---|---|
| **An effect's name** | Opens that effect's controls. |
| **An effect's switch** | Turns that effect on or off without leaving what you are looking at. |

An effect that is on also appears in the channel's processing chain as a stage of its own, where
you drag it to a new place like any other stage; switched off, it leaves the chain but keeps its
place in the processing order. This chip is a stand-in until a better way of laying out the native effects arrives.

## The FX page

The **FX** page shows the selected strip's effects chain, and below it one effect's whole panel:
every parameter, and its curve when it has one. It follows channel select the way the processing
view does, so selecting another strip shows that strip's chain.

| Control | What it does |
|---|---|
| **An effect in the chain bar** | Shows that effect's panel below the bar. |
| **An effect's switch** | Bypasses that effect or brings it back. |
| **The arrows beside the bar** | Move the selected effect earlier or later in the chain. |
| **\`+\`** | Opens the plugin picker for the strip's inserts, with delay, reverb, modulation and saturation listed first. |

In the processing view each effect is a small chip with its name, its switch, one key value
(a delay's time, for example) and a \`›\`. Tapping the chip opens the FX page at that effect. The
page remembers, for each strip, the effect you last looked at and opens on it again.

## Delay

The **Delay** tab is the channel's own effect delay — the musical one, not an alignment.

| Control | What it does |
|---|---|
| **On** | In or out. |
| **Time** | Up to 2000 ms, in milliseconds. |
| **Sync** | Follow the console's tempo instead of a figure in milliseconds. |
| **Division** | With sync on, the note the delay lands on — quarter, eighth, dotted eighth, eighth triplet. The resolved milliseconds are shown live beside it. |
| **Feedback** | How much of the output goes back in. It stops short of 1, so it cannot run away. |
| **Mix** | Dry to wet. |
| **Tone** | Darkens the repeats. |
| **Ping-pong** | Alternates the repeats between the two sides. |

The console's tempo is set from the header's tap-tempo control, so a delay on sync follows
the song rather than a number you worked out once.

The Delay tab is offered where the console has native effects and the console profile ships
a delay section. A profile modelled on a desk that has no delay strip does not show it.

**What this stage guarantees:** Every sample this stage produces is a finite number — never NaN, never infinite. Bypassed, this stage's output is identical to its input, sample for sample. The output is an exact copy of the input, delayed by the reported number of samples.

## Reverb

The **Reverb** tab is the channel's own reverb. Five algorithms — **room**, **plate**, **hall**,
**reverse** and **gated** — share one set of controls.

| Control | What it does |
|---|---|
| **On** | In or out. |
| **Algorithm** | Room, plate, hall, reverse or gated. |
| **Size** | How big the space is. |
| **Damping** | How fast the top end dies away in it. The same setting is the same filter whatever rate the desk is clocked at, so a session moved between a 44.1 or 48 kHz stage box and the desk's 96 kHz keeps its sound. |
| **Pre-delay** | Up to 100 ms of gap before the tail starts. A little of it separates the reverb from the source and keeps words intelligible. |
| **Width** | How wide the tail is. |
| **Mix** | Dry to wet. |
| **Low cut** / **High cut** | Keep the tail out of the bottom and the top of the mix. |

Three things about these reverbs are worth knowing before you reach for them.

**Damping means one filter, at any clock.** Set damping where you want it and it stays there: the
tail is the same length and the same brightness at 44.1, 48, 96 and 192 kHz. A room does not get
brighter or longer because a stage box brought a different clock with it.

**The plate does not ring.** Its tank drifts slowly — about a second per cycle, too slow to hear
as movement — and that is what keeps the end of a plate's tail from settling into the faint
metallic flutter plates are known for. A plate's tail runs about as long as its size says; if you
want more of it, turn **Size** up.

**A gated reverb re-opens without a click.** Hit it again while the previous tail is still closing
and the gate opens over a millisecond and a half instead of instantly, so the second hit arrives
clean. The bite on a snare is unchanged — a millisecond and a half is well inside the stick.

A per-channel reverb is convenient and it is not the only way: an aux feeding a reverb on a
bus gives one tail that several channels share, which is usually what a mix wants. See
[sends, buses, groups and DCAs](sends-buses-dcas.md).

**What this stage guarantees:** Every sample this stage produces is a finite number — never NaN, never infinite. This stage's internal state never settles into denormal numbers that could stall the audio thread. Bypassed, this stage's output is identical to its input, sample for sample. The reverb tail always decays to silence — it never sustains or grows on its own.

## Drive

The **Drive** tab is the channel's saturator — the one control on the strip that is there to
add colour rather than to correct something. It sits after the compressor and before the
delay and reverb, so what it colours is the channel as you have already shaped it.

**The picture beside the controls is the curve the desk is running.** Input along the bottom,
output up the side, and the straight diagonal is what the channel would do if the stage did
nothing. The further the curve leaves that line, the harder the signal is being squeezed — turn
**Drive** up and you watch it bend. A curve that has stopped being a straight line is a sound
that has stopped being clean, which is the whole point of the section.

The picture draws the shape, the mix and the trim. It does not draw **auto gain**, because that
is measured from the signal as it plays rather than being a property of the curve, and it does
not draw **band** or **HF roll-off**, because those are choices about frequency and this picture
has no frequency axis — this chapter is where that is written down, not a line under the curve:
move **Character** or **Band** and watch the picture stay still, and it will be obvious why.

The **?** button in the DRIVE header opens this chapter over the desk, without leaving the mix.

| Control | What it does |
|---|---|
| **On** | In or out. Off, it costs nothing at all. |
| **Curve** | The shape of the knee. **Soft** is the firmest and cleanest, **tape** is gentler, **tube** is the widest and richest. **Exciter** is different: instead of fading between the clean and driven sounds it ADDS the driven band on top of the whole channel, which is what an enhancer does. |
| **Drive** | How hard the signal is pushed into the curve. At 0 dB it barely does anything; turn it up until you hear it. |
| **Character** | Which harmonics you get. All the way down is the plain curve: odd harmonics only, the hard, edgy kind. Turning it up shifts the signal off centre inside the curve, so the two halves of the wave are treated differently and even harmonics appear — the warm, thick kind. All the way up they lead by a good margin at normal drive settings; push Drive past about 15 dB and the clipping's own odd harmonics take over again whatever this knob says. |
| **Even bias bar** | Reads Character back as one number: how far up its travel the even-harmonic bias is set, 0 to 100 %. It follows the knob; it is not something you set, and it is not a measurement of what came out — how much even harmonic you actually get depends on how hard you are driving the curve. |
| **Band** | Which part of the sound is driven. **Full** is everything, **low** is below the band frequency, **high** is above it, and **tilt** drives the top harder than the bottom without changing the tone. |
| **Band** (frequency) | Where that split sits. |
| **Mix** | How much of the driven sound you hear against the clean one. At 0 % the channel passes through exactly as it came in. |
| **Trim** | Level after the stage, so you can switch it in and out against the same loudness. |
| **Auto gain** | On by default. The desk measures the level going in and coming out and matches them, so turning Drive up changes the colour and not the loudness. |
| **Stereo link** | On a stereo channel, one gain path for both sides, so nothing can pull the image off centre. |
| **HF roll-off** | Off, 12 kHz or 16 kHz. Tames the fizz an exciter can put on top. |
| **Oversampling** | 1×, 2× or 4×, and 4× is the default. Higher settings run the saturator at a multiple of the console's rate so the harmonics it makes stay where they belong instead of folding back down into the music. Leave it at 4× unless you are short of CPU. |

### What the three shapes sound like

**Soft** is the firmest knee: it holds the level down close to where it was and lets go of the
extra harmonics quickly, so it reads as clean loudness — the most "console" of the three.
**Tape** bends earlier and more slowly, so you hear the thickening before you hear the limit.
**Tube** has the widest knee of all: it is audibly working long before anything reaches a
ceiling, and it is the richest of the three because its harmonics carry furthest up the series.
All three are ODD-symmetric shapes on their own; the **Character** knob is what puts even
harmonics in, on any of them — and it does it the way valve stages do, by sitting the
signal off centre on the curve rather than by adding a second kind of distortion. Turned up, it
also makes the channel quieter — the curve is flatter away from its centre — and **auto gain**
is what puts that back. If you have switched auto gain off, expect to find the trim.

**Exciter** is not a fourth knee — it is soft's shape wired differently, added on top of the
whole channel instead of fading against it, which is what an enhancer does. It comes up aimed at
the top of the spectrum and at a low mix for that reason.

**What Band leaves alone.** At **low** and **high** the half the curve does not see bypasses the
stage untouched and is added back exactly as it came in, so setting Mix to 0 gives you back the
channel bit for bit whichever band you picked. **Tilt** is different: it drives the whole signal
but tips the balance with a shelf, and then takes the same shelf back out afterwards — so what
tilts is how hard each octave hits the knee, not the tone of what comes out.

**Why auto gain is measured and not a table.** A saturator gets louder as you drive it, and how
much louder depends on the material, not only on the setting. The desk therefore measures the
level going into the stage and the level coming out of it over the same short window and matches
them. Below about −90 dBFS it holds the last figure instead of tracking, because a ratio taken on
silence is not a measurement. That is why turning Drive up changes the colour and not the
loudness, and why the correction follows a fader move.

**It costs a little latency while it is on** — 0.75 ms at 4× and 0.50 ms at 2×, and the panel
shows the exact number in samples. That is normal for any oversampled processor; it means a channel with
Drive on is a fraction of a millisecond behind one without it, which matters if the two are
two microphones on the same source. It is zero while the stage is off.

**What this stage guarantees:** Every sample this stage produces is a finite number — never NaN, never infinite. Bypassed, this stage's output is identical to its input, sample for sample. At its default settings, this stage passes audio through unchanged in level.

## Chorus

The **Chorus** tab thickens a channel by mixing it with copies of itself whose delay is swept
slowly up and down — a few milliseconds of wobble that the ear hears as several performers
instead of one. It runs after the drive and before the delay, and it arrives switched off.

| Control | What it does |
|---|---|
| **On** | In or out. Off, it costs nothing at all. |
| **Rate** | How fast the copies sweep, 0.05 to 8 Hz. Well under 1 Hz is a gentle shimmer; push past about 3 Hz and it stops sounding like a chorus and starts sounding like vibrato. |
| **Depth** | How far the delay swings above its 10 ms base, 0 to 12 ms. More depth is a wider, more obvious detune. |
| **Voices** | How many swept copies run at once, spread evenly around the sweep, 1 to 4. More voices is a smoother, denser ensemble. |
| **Mix** | Dry to wet, 0 to 100 %. |

**What this stage guarantees:** Every sample this stage produces is a finite number — never NaN,
never infinite. Bypassed, this stage's output is identical to its input, sample for sample.

## Flanger

The **Flanger** tab is the jet-plane sweep: one copy of the channel at a very short, moving
delay, mixed back with the original so a comb of notches glides up and down the spectrum. It
runs after the chorus and before the delay, and it arrives switched off.

| Control | What it does |
|---|---|
| **On** | In or out. Off, it costs nothing at all. |
| **Rate** | How fast the sweep travels, 0.05 to 5 Hz. |
| **Depth** | How far the delay swings above its 0.5 ms base, 0 to 5 ms — how much of the spectrum the notches cross. |
| **Feedback** | Signed, −0.95 to 0.95. Positive values sharpen the peaks into a metallic ring; negative values hollow the sound out. Near either end it rings hard. |
| **Mix** | Dry to wet, 0 to 100 %. |

**What this stage guarantees:** Every sample this stage produces is a finite number — never NaN,
never infinite. Bypassed, this stage's output is identical to its input, sample for sample.

## Pitch

The **Pitch** stage shifts the channel up or down without changing its speed, by reading the signal
twice through a short moving delay and crossfading between the two reads. It runs after the flanger
and before the delay, and it arrives switched off. No strip panel draws it yet; it is reached through
its row, \`/channel/{kind}/{index}/pitch\`.

| Control | What it does |
|---|---|
| **On** | In or out. Off, the channel passes through exactly as it came in. |
| **Semitones** | The coarse shift, −12 to +12 in whole semitones; it comes up at 0. |
| **Cents** | The fine shift, −50 to +50 cents; it comes up at 0. |
| **Mix** | Dry to wet, 0 to 100 %; it comes up at 100 %, the shifted signal alone. |

The shifted signal is read from up to 40 ms back, so the wet part sits slightly behind the dry
one; that is the effect's own time, not a delay the console adds to the channel.

## De-esser

The **De-esser** tab turns down the hard "s", "sh" and "t" sounds of a voice — and only while
they are there. It listens to the band where sibilance lives, and when that band gets louder than
you asked for it pulls it down; the rest of the time it does nothing at all. It sits after the EQ
and before the compressor, so the compressor never reacts to an "s" the de-esser has already
dealt with.

**The GR bar is what it is doing right now.** It reads the reduction the engine is actually
applying, measured in the stage, and it is drawn against the deepest cut the **Range** control
can make — a full bar is the stage at its floor. While no sibilant is crossing the threshold it
sits empty, which is the normal state. If the channel has no measurement it reads **—**, never a
made-up 0.

The **?** button in the DE-ESSER header opens this chapter over the desk, without leaving the mix.

| Control | What it does |
|---|---|
| **On** | In or out. Off, the channel passes through exactly as it came in. |
| **Mode** | **Split** cuts only the sibilant band and leaves the rest of the voice alone — the default, and the one to reach for first. **Wideband** turns the whole channel down while the "s" lasts, the older broadcast behaviour; some operators prefer it on a shouted vocal. |
| **Frequency** | The centre of the band the de-esser listens to, from 2 kHz to 16 kHz; it comes up at 7 kHz. Sweep it while the singer says "s" and stop where the reduction bites hardest. |
| **Width** | How wide that band is, in octaves (0.25 to 4, default 1). Narrow catches a single whistle; wide catches a whole spread of hiss. |
| **Threshold** | The sibilant level, −60 to 0 dB, above which reduction starts. Default −30 dB. |
| **Ratio** | How hard it bites once the band is over the threshold, 1:1 to 20:1. Default 4:1. |
| **Range** | The deepest cut it may ever make, −24 to 0 dB, however loud the "s". Default −12 dB. This is what keeps a de-esser from lisping. |
| **Attack** | How quickly the reduction arrives when an "s" starts, 0.1 to 50 ms. Default 1 ms — sibilance is fast. |
| **Release** | How quickly the channel recovers after the "s" ends, 5 to 500 ms. Default 60 ms. |

**If it does not seem to do anything:** turn **On** on, ask for an "s", and watch the GR bar.
Empty bar — the threshold is above the sibilant, or the frequency is off the voice's "s"; lower
the threshold or sweep the frequency. Bar pinned full and the voice sounds lispy — raise the
threshold or bring **Range** up towards 0.

**What this stage guarantees:** Every sample this stage produces is a finite number — never NaN, never infinite. This stage's internal state never settles into denormal numbers that could stall the audio thread. Bypassed, this stage's output is identical to its input, sample for sample. This stage never adds gain — its output level never exceeds what came in.

## Limiter

The **Limiter** tab keeps a bus or the MAIN output from ever going over a level you choose. It
looks a little ahead of the signal, so it can turn the level down just before a peak arrives
instead of after, and it counts the peaks that fall *between* the samples as well as on them (the
"true peak" a converter or a broadcast meter would see). Only buses and MAIN have one — an input
channel has no Limiter tab. It is always the last stage before the fader: whatever you rack in the
plugin slots or reorder in the chain, the limiter has the final word.

**Left and right move together.** The two sides of a stereo bus are turned down by the same
amount, so the picture does not lean when one side peaks.

**It delays the signal while it is on.** The look-ahead is paid in time: with the limiter on, the
bus comes out later by the **Look-ahead** setting. With it off the bus is untouched and nothing
is delayed.

**The two readouts are what the engine is measuring right now.** **GR** is how many decibels the
limiter is turning the signal down at this moment; it sits at 0 while nothing reaches the
ceiling. **Peak** is the highest true peak arriving at the limiter before it acts. A readout the
engine cannot give shows **—**, never a made-up 0.

The **?** button in the LIMITER header opens this chapter over the desk, without leaving the mix.

| Control | What it does |
|---|---|
| **On** | In or out. It comes up out, so a bus is never limited until you ask. |
| **Ceiling** | The level nothing leaving the bus may pass, −12 to 0 dBTP. Default −1 dBTP. |
| **Look-ahead** | How far ahead it listens, 0.5 to 5 ms. Default 1.5 ms. Longer is gentler on the sound, and delays the bus by the same amount. |
| **Release** | How quickly the level returns after a peak, 1 to 1000 ms. Default 50 ms. |

A value outside a control's range is refused with the range named, never quietly pulled in.

**If it does not seem to do anything:** turn **On** on, then watch **GR** while the loud part
plays. GR stuck at 0 — the signal never reaches the ceiling, which is the limiter doing its job;
lower the **Ceiling** to see it act. Both readouts at **—** — the engine has no limiter running on
this bus to measure.

**What this stage guarantees:** Every sample this stage produces is a finite number — never NaN, never infinite. Bypassed, this stage's output is identical to its input, sample for sample.

## Alignment

Two more tabs — **Align** and **Speakers** — are the time-alignment instruments, and they
are a different job from the Delay above. See [alignment](alignment.md).

## Native, not plugins

The EQ, gate and compressor are the mixer's **own** processing, not LV2 plugins loaded
into a chain. They are always there, they cost no plugin slot, and they do not depend on
anything being installed.

Plugin inserts are a separate, ordered chain on the same channel — see
[plugins and the rack](plugins.md). The two are never the same thing, and a plugin EQ in
an insert does not replace or duplicate the channel EQ; it is extra processing at a
different point in the signal path.

## Feedback suppression lives here

Beside the curve, the EQ tab carries four panels: **RTA**, **EQ**, **FBS** and **HRP**.
Pick one from the bar above the panel; the curve stays where it is.

| Panel | What it is |
|---|---|
| **RTA** | The live spectrum behind the curve. See [the analyser](rta.md). |
| **EQ** | The band editor — the encoder bank described above. |
| **FBS** | The automatic feedback corrector, which plants its cuts as ordinary bands in this same EQ. See [feedback suppression](fbs.md). |
| **HRP** | The harmonic processor. See [the harmonic processor](hrp.md). |

Pressing the panel you are already on folds it away and gives the curve the whole width.
Press it again to bring it back.

## Presets for one stage

A stage panel with presets — the gate and the compressor among them — carries a preset picker
listing the console's factory presets first and then your own. Picking one writes its settings
onto that stage of this channel and nothing else. Before it lands, the desk lists what the
preset would move on this channel and asks you to confirm.

To keep your own, press **Save** beside the picker, type a name and confirm: the stage's current
settings on this channel are stored under that name and join the picker for every channel. The
**Delete** picker beside it lists only your own presets — pick one, then press **Delete** twice.
The console's factory presets are never offered there and cannot be removed.

## Copying a sound between channels

A **channel config** captures one channel's processing — its plugin chain and its EQ, gate
and compressor — as a reusable named preset. Save it from a channel you like and apply it
to another. See [scenes and sessions](scenes-sessions.md).

For a quick copy without saving anything, the channel view's clipboard panel is a copy and a
paste, each a row of part chips — single parts such as **EQ**, **Gate** or **Sends**, and groups
such as **Dynamics**, **Processing** or **Whole strip**. Pick what goes onto the clipboard, then,
on each channel you paste onto, pick which of it comes back out: copying a whole strip once and
pasting only its EQ onto three channels is the common case. A picked chip is lit. A part the
destination cannot carry is drawn dashed in red and cannot be picked, and its hover gives the
reason. One undo takes a paste back.
`,re=`# Feedback suppression

The automatic feedback corrector — FBS — listens to a channel, recognises a ring, and
plants a narrow cut at its frequency. It is the manual notch you would reach for anyway,
automated, with rules.

It is **per channel** and **off by default**. Nothing is notched on a channel you have not
armed.

## Where it is

![Layouts, Processing, EQ, FBS](images/fbs-1.png)
*Feedback suppression: the mode, sensitivity, notch Q and merge radius, over the channel's own filter curve.*

The **Analysis** chip in the channel view's CHANNEL block, on its **FBS** row (alongside
**Align** and **HRP**, which share the same chip). It has two views of its own, picked from
the bar above it:

- **Settings** — the controls.
- **Filters** — the roster of what has been planted, so it scrolls in its own view instead
  of pushing the controls off the screen.

## The two modes

| Mode | When to use it | What it plants | Does it lift? |
|---|---|---|---|
| **Off** | Default. | nothing | — |
| **Ring-out** | Soundcheck: you are deliberately ringing the room out. | a **true notch** — a full cut at the found frequency | No. A ring-out find is a fact about the room, and it stays. |
| **Live** | During the show. | a **bell** whose depth follows how prominent the ring was | Yes — see below. |

The difference matters. A ring-out notch is a null: there is no gain left in it to bring
back, which is exactly right for a permanent room correction. A live find has to be able
to release, so it plants a gain-carrying bell instead.

## Lifting

In **Live** mode, once a planted band's frequency has stayed clean for the **hold** time,
its gain ramps back to 0 dB over about three seconds and the band is removed. The ramp is
slow on purpose: a cut that disappeared in one step would be audible.

A ring returning during the hold resets it. Setting the hold to **never** keeps the band
until you remove it. Ring-out bands never lift on their own.

The default hold is 5 seconds.

## The controls

| Control | What it does |
|---|---|
| **Mode** | Off / Ring-out / Live. |
| **Sensitivity** | A single 0-to-1 scalar. \`0\` is the most conservative detection; raising it shortens the time to a decision and relaxes how prominent a ring must be before it counts. |
| **Notch width (Q)** | How narrow the planted cut is. The default is very narrow — around Q 116 — which is what makes a notch inaudible on programme material. |
| **Clean hold** | How long a live band's frequency must stay clean before it lifts, in seconds, or **never**. |
| **Auto-band cap** | The most bands FBS may plant on this channel. A full pool plants nothing more and says so. |
| **Pool usage** | How much of the cap is in use. |

### About sensitivity

Raising sensitivity only ever shortens latency and relaxes prominence, within bounds that
stay safe on music. In **Live** mode the discriminators that keep music from being
mistaken for feedback stay pinned at every sensitivity setting — they relax only in the
ring-out pool, where you are deliberately provoking rings and there is no programme
material to protect. The panel says so beneath the control whenever the mode is live.

### About notch width

A very low Q broadens the cut enough to dent the mix. The panel warns when you take it
there. If you find yourself widening notches to catch a ring, the problem is usually the
gain structure or a microphone position, not the notch.

## What gets planted

A planted band is an **ordinary EQ band** in the channel's own EQ, named for its
frequency and tagged with its origin. You can see it on the EQ curve like any other band.

FBS only ever modifies or removes bands **it** planted. A band you placed by hand is never
touched, whatever the mode and whatever the sensitivity.

## The roster

The **Filters** view lists every planted band with its frequency, lets you delete one
individually, and offers a **clear** that removes all of them on this channel at once.

Clearing is how you start a fresh soundcheck. It removes only the automatic bands.

## How to use it in practice

**Soundcheck**

1. Set the channel to **Ring-out**.
2. Bring the channel up until it rings; let FBS take it; repeat until you have the
   headroom you want.
3. Look at the roster. A handful of narrow cuts is normal. Fifteen means something else
   is wrong — a microphone in a stupid place, a wedge pointed at a cardioid's rear lobe,
   or a gain structure that needs rebuilding.
4. Switch the channel to **Live** for the show, or leave it in ring-out if you want the
   soundcheck's corrections frozen and no further automatic action.

**During a show**

Leave armed channels in **Live**. Rings get caught and released; the roster tells you
afterwards where the room was fighting you.


## Worked example: ringing out a vocal microphone

The room is empty, the PA is on, and channel 1 is the lead vocal microphone in front of
the wedge.

1. **Select channel 1** in the fader bay, and open **Layouts ▸ Processing**. Go to the
   **EQ** tab and pick the **FBS** panel beside the curve.
2. **Set the mode to Ring-out.** The channel's state dot changes to say the corrector is
   armed. Nothing has been planted yet — the roster is empty.
3. **Bring the channel fader up slowly**, listening. At some point the room takes off on
   one frequency and starts to sing.
4. **Watch it stop.** Within a second or so the ring dies away by itself. That is the
   notch landing.
5. **Look at the EQ curve.** There is now a very narrow cut where the ring was, drawn like
   any other band and labelled with its frequency. It is a true notch: a ring-out find is
   a fact about the room, and it stays.
6. **Bring the fader up further.** The room takes off somewhere else, and the same thing
   happens. Repeat until you have the level you need, or until it stops being worth it.
7. **Open the Filters view** and read what you got.

![Layouts, Processing, EQ, FBS, Filters](images/fbs-2.png)
*The planted-band roster with the channel armed in Live and nothing ringing yet: "No auto-notch planted", and Clear auto greyed out because there is nothing to clear. After a ring-out each band appears here with its frequency and its own delete.*

**What you should see:** a handful of narrow cuts — three, five, perhaps eight — at
scattered frequencies, and several more decibels of gain before feedback than you started
with.

**What it means if you do not:**

- **Nothing was planted and the room still rings.** Check the mode is actually Ring-out
  and not Off, and check you are ringing the channel you armed — a microphone into
  channel 1 while channel 2 is armed will ring all night. See
  [the patchbay](patchbay.md) to confirm what is patched where.
- **Fifteen notches and it still rings.** The corrector is not the problem. A microphone
  in a poor position, a wedge pointed into a cardioid's rear lobe, or gain structure that
  needs rebuilding will all produce this, and no amount of notching will fix any of them.
- **The whole mix went dull.** The notch width has been widened too far. Put it back to
  the default and clear the roster with **clear**, which removes only the automatic bands.

Then switch the channel to **Live** for the show — or leave it in Ring-out if you want
tonight's corrections frozen and no further automatic action.

## What it does not do

- It does not replace gain structure, microphone choice or wedge aiming.
- It does not run on channels you have not armed.
- It does not touch **your** EQ bands. It plants its own into the same channel EQ,
  tagged as FBS, and those tagged bands are the only ones it will ever edit or
  remove — a band you dialled by hand is never moved, re-shaped or deleted. Expect
  to see the FBS bands in the EQ display; that is where they live.
- On music, in live mode, it deliberately errs towards doing nothing.

## Related

- The channel's **state dot** shows a distinct colour when a ring is flagged; see
  [the channel strip](channel-strip.md).
- [EQ and dynamics](eq-dynamics.md) — the EQ the bands are planted into.
`,le=`# Head-amp control

The head amp is the analogue input stage: what the microphone actually sees, before
anything is converted or processed. On a rig with a REAC stagebox those controls are on
the box, at the far end of a cable, and the mixer drives them over the same link that
carries the audio.

## Where the controls are

On the **Processing** chip, at the top of the channel strip, as a head-amp card:

![Layouts, Processing: the head-amp row](images/head-amp-1.png)
*The head-amp block: gain, trim, pan, phantom, pad and polarity, each shown only where the bound device offers it.*

| Control | What it does |
|---|---|
| **Gain / sensitivity** | The analogue input sensitivity. On a head-amp channel this *is* the box's sensitivity control — there is deliberately no second, duplicate control. |
| **Phantom +48 V** | Condenser microphone power. |
| **Pad −20 dB** | A 20 dB attenuator ahead of the preamp, applied by the box. Engaging it does not change the sensitivity value; it shifts the whole range down by 20 dB. |
| **Polarity** | Inverts the signal's polarity. A native sign flip in the mixer's own processing. |
| **Trim** | A fine digital adjustment after conversion, composing with the gain. Not part of the head amp proper. |

The same head-amp identity — gain, phantom, polarity — also lives on the **Source layer**
chip, where it belongs to the *source* rather than to whichever channel is
currently processing it. Rename or re-gain a source there and it follows the source when
you patch it elsewhere.

## Capability gating

The head-amp controls a channel offers depend on what is actually patched to it. Phantom,
pad and sensitivity are real only on a source whose device declares a head amp — a REAC
stagebox input, or another adapter that advertises one. On a channel fed by an application
or a plain sound card they are absent, not decorative.

Re-patch a channel and the controls follow within a moment: the server re-advertises the
channel's capabilities to every connected screen, so a tablet that was already open shows
the change without a reload.

## On a REAC stagebox

Phantom, pad and sensitivity are sent to the box and applied there. Two consequences worth
knowing on a live stage:

- **A change is a physical change at the box.** Phantom power on a channel with a dynamic
  microphone plugged in, or a ribbon, is exactly as bad an idea here as on any other desk.
  Mute the channel before you switch phantom.
- **The mixer holds the state.** The recorded head-amp settings are re-applied to the box,
  so a box that was power-cycled or a transport that was restarted comes back with the
  settings the desk believes in rather than whatever the box booted with.

Sensitivity is an analogue step on the box, not a digital gain — which is why it appears
in dBu and why the range shifts when the pad is engaged.

## Trusting what you see

A soft meter is not proof that phantom power is present at the microphone. If a condenser
is silent, confirm at the box — an indicator on the box itself, or a microphone you know
works — before concluding the mixer is at fault. The control reports what was *sent*.

## The spare microphone

A microphone dies mid-song. There is a spare hanging beside it, already plugged into a
different port. **SPARE** on the channel's tile moves the channel onto it in one press.

### Preparing one

The swap only exists on channels you prepared, and preparing one is a soundcheck job:

1. Plug the spare microphone into its own port and patch nothing to it.
2. **Set that port's own preamp** — gain, pad and phantom — for the spare microphone, not
   for the primary. A ribbon and a condenser want opposite things, and the desk will not
   guess.
3. Declare it as the channel's spare with the show.

A channel with a spare declared shows a **SPARE** button on its tile in the fader bay.
Channels without one show no button, so there is nothing to press by mistake.

### Swapping

**Press SPARE.** The channel re-points to the spare port immediately. The button lights and
stays lit while the channel is standing on its spare.

**Press it again** to go back. The desk remembered the primary, so the reverse is the same
one gesture — it is a latch, not a one-way door. A dead microphone is usually a temporarily
dead microphone.

Reloading, or another surface opening mid-swap, shows the same thing: the swap is desk
state, not a fact about the screen you pressed it on.

### Two things that deliberately do not follow

**The preamp does not follow.** Gain, pad and phantom belong to the **port**, and the spare's
port already carries what its own microphone needs. Copying the primary's settings across
would be the desk guessing about hardware it cannot see, and +48 V guessed onto a ribbon is
damage rather than a wrong level.

What you see after the swap is the **spare port's** head-amp state, which is exactly the
point: an unprepared spare is visible at a glance instead of silently wrong.

**The alignment does not follow either.** The channel's alignment delay described where the
dead microphone was standing. The spare hangs somewhere else, so the number is stale the
moment the swap lands, and the desk clears it rather than keeping a lie. Re-align the spare
when there is a quiet moment — see [alignment](alignment.md).

## Direct paths

A source can take a **direct path** to an output without consuming a channel — the
post-preamp route a Roland desk offers. Direct paths are opened and closed on the
**Source layer** chip, alongside the head-amp controls.

## If the controls are not there

- The channel has nothing patched, or its source declares no head amp. Check the
  [patchbay](patchbay.md).
- On a REAC rig, the box may not have established. See
  [the stagebox is not establishing](../troubleshooting/box-not-establishing.md).
`,he=`# The harmonic processor

HRP — the harmonic resonance processor — listens to one channel, works out what note is
being played, looks at that note's harmonics, and finds the one that is louder than it
normally is on this instrument. Then it either tells you about it or takes it out with a
narrow cut.

It is the thing you do by ear when a cello has one boomy note, or an acoustic guitar
honks on a single fret, and it is the thing that is hard to do by ear because the offending
frequency moves with the note.

It is **per channel** and **off by default**.

## Where it is

![Layouts, Processing, EQ, HRP](images/hrp-1.png)
*The harmonic processor armed in Monitor on a channel with no signal: the header reads Listening, the amount and the band budget are live, and the detected, proposed and active blocks stay empty until the analyser hears something. Adaptive adds the correction; Monitor only listens.*

The **Analysis** chip in the channel view's CHANNEL block, on its **HRP** row (alongside
**Align** and **FBS**, which share the same chip). It is offered on input channels; a bus has
no harmonic processor, so the row is simply not there.

**Off, the panel is just the switch and the mode ladder.** The header reads *Harmonic
resonance · Off* and there is nothing else to see, because nothing is being measured.
Everything described below appears the moment you turn HRP on.

## On, off, and the two modes

The **HRP** switch at the top of the panel says whether it is running — the same switch every
other stage on the channel view has. Turning it off releases any corrections it had planted;
turning it back on returns it to the mode it was last in, or Monitor if it has never run.

| Mode | What it does |
|---|---|
| **MONITOR** | Analyses and shows — the note, its harmonics, and the cut it *would* make. Never touches the EQ. |
| **ADAPTIVE** | Applies safe corrections by itself when a note is stable and a harmonic sticks out. |

Monitor is not a lesser mode; it is the one to start in. The number it shows under
**Proposed** is the exact cut Adaptive would plant, computed the same way, so nothing
surprising happens when you move the switch. Picking a mode while HRP is off turns it on and
puts it in that mode, one gesture.

## Reading the panel

The panel answers four questions, top to bottom, and they cannot disagree with each other
because each comes from a different place.

**Detected** — the note, large, with its frequency small beside it and a confidence
percentage on the right. The note is what you glance at; \`A4\` is what a musician says, and
\`440.2 Hz\` is not.

Under it, a row of small chips, one per harmonic: \`H1\`, \`H2\`, \`H3\` … Hover or hold one for
its frequency, its measured level, and how far it is from what this instrument normally
does at this note. A dimmed chip is a harmonic that is not there — which is a different
fact from "very quiet", and only the first stops a correction. A chip marked \`?\` is
**ambiguous**: two notes sounding together put their partials in the same place, the energy
belongs to both, and HRP will not make a strong cut into a note nobody complained about.

**Proposed** (or **Correcting**, in Adaptive) — the one harmonic it would act on, its
frequency and the cut in dB. In Monitor there is an **Apply** button beside it: press it
and the cut becomes **your** EQ band, which HRP will then leave alone forever.

**Active in EQ** — what is actually in the channel's EQ right now, read back from the EQ
itself rather than restated. If this line is empty, nothing is cut, whatever the rest of
the panel says.

**Detection log** — every note HRP heard, newest first, kept after it stops sounding. A
dim row is a note that was heard but was too brief or too unclear to act on; a \`●\` means
it is sounding right now. The **clear** button clears this screen's log and nothing else.

## The controls

| Control | What it does |
|---|---|
| **HRP** | On or off. Off releases every correction it had planted. |
| **Mode** | Monitor or Adaptive. |
| **Amount** | How hard it corrects, from 0 to 1. The default is 0.5. It is a musical control, not a threshold: turning it up does not remove the safety rules, it moves the correction within them. |
| **Max bands** | The most bands HRP may plant on this channel at once, 1 to 24. The default is 4. |
| **Freeze** | Stops HRP adapting and stops any new correction. Cuts already standing stay; the display keeps moving. |
| **Reset learning** | Forgets everything HRP has learned about this channel. |

**Freeze is the live control.** Press it before the passage you care about and HRP will not
change its mind in the middle of it. Press it again afterwards. It is far more useful than
turning HRP off, because the corrections you already have keep working.

**Reset learning** takes two presses — the first arms it, the second within a few seconds
fires it. It clears the learned harmonic profile for this channel, forgets the notes it has
been tracking, and releases the HRP cuts. Your own EQ bands and your FBS notches are not
touched.

## What it learns, and how long it takes

HRP builds a picture of what this instrument's harmonics normally look like **at each
note** — not one average for the channel. The same instrument has a different harmonic
balance at the bottom of its range than at the top, and one blurred-together profile would
call the blur normal.

That has two consequences worth knowing:

- **A note it has not heard enough of has no baseline, and HRP does nothing about it.** No
  answer is the honest answer, and it will not guess. Play through the range you care about
  during soundcheck and it will be ready for the set.
- **One bad measurement does not poison it.** A mic bump or a chord that confused the
  attribution moves the stored figure by a fraction of a decibel, not by the whole
  difference.

## What it will and will not do

- **It cuts. It never boosts.** A harmonic that is quieter than normal is not a problem
  HRP has an opinion about.
- **It plants ordinary EQ bands**, into the channel's own EQ, tagged as HRP. You can see
  them on the curve like any other band.
- **It only ever touches its own bands.** A band you placed by hand is never moved,
  re-shaped or removed — nor is a band FBS planted. That rule runs the other way too: FBS
  will not touch an HRP band.
- **It is not source separation.** When two notes share a partial it says so and declines
  rather than deciding.
- **It needs the channel EQ switched in.** With the EQ bypassed the corrections are still
  listed and are doing nothing, and the panel says so.
- **It does not run on the audio path.** The analysis rides behind the same spectrum the
  RTA uses, so arming it costs the mix nothing.

## Using it

**Soundcheck.** Put the channel in **Monitor** and have the player go through the range —
a scale, or just the parts. Watch the detection log fill. When a note comes up that you
know is the problem one, look at what HRP proposes; if you agree, press **Apply** and it
becomes your band and stops being HRP's business.

**During the set.** **Adaptive**, amount at the default, max bands at 4, and **Freeze**
before anything you do not want touched. Look at **Active in EQ** afterwards: it is a
list of what the instrument actually did tonight.

**When you do not trust it.** Monitor mode never touches audio. Leave it there for a whole
show and read the log at the end; it costs nothing and tells you whether it would have been
right.

## Related

- [EQ and dynamics](eq-dynamics.md) — the EQ the bands are planted into.
- [Feedback suppression](fbs.md) — the other automatic planter, in the panel next door,
  solving a different problem.
- [The analyser](rta.md) — the spectrum HRP reads.
`,de=`# Operator manual

openmixer is a mixing console built in software. Audio runs through it: inputs arrive
from a stagebox or any PipeWire source, each channel has a fader and a chain of
processing, PipeWire sums the buses, and the mix goes back out to the PA. You drive it
from a web surface that any number of screens can share at once — one server holds the
whole mix and every screen is a view of it, so a fader moved anywhere moves everywhere.

New here? [Your first session](../install/first-session.md) takes a fresh install from
silence to one channel audible in the main mix. Come back to this manual for everything
else.

## The desk

- **[The surface](surface.md)** — the header, the layout chips, the fader bay, and where
  to find things that are not where you would first look.
- **[The console menus](menus.md)** — Setup, Patch, Scenes, Meters and Layouts, item by
  item, and the rest of the header.
- **[Layouts, banks and the work zone](layouts.md)** — arranging the panels, paging the
  bay, USER pages and density.
- **[The channel strip](channel-strip.md)** — signal order, trim, the tile controls,
  selecting and naming, and the channel and bay overviews.
- **[Head-amp control](head-amp.md)** — phantom power, pad, sensitivity and polarity,
  including on a REAC stagebox.
- **[EQ and dynamics](eq-dynamics.md)** — the interactive EQ curve, the gate and the
  compressor.
- **[The analyser](rta.md)** — the live spectrum, the tilt reference, and reading a
  feedback ring on it.
- **[Feedback suppression](fbs.md)** — the automatic feedback corrector: ring-out and
  live modes, sensitivity, notch width, and the planted-notch roster.
- **[The harmonic processor](hrp.md)** — the instrument-aware adaptive EQ: what it hears,
  what it proposes, and what it plants.
- **[Alignment](alignment.md)** — two microphones on one source, and the loudspeakers in
  the room.
- **[Plugins, the rack and skins](plugins.md)** — inserts, the picker, the generated editor,
  ordering and skins.
- **[The plugin catalog](plugin-catalog/index.md)** — every plugin measured: latency, CPU cost
  and which ones run on the console's own audio thread.
- **[What to reach for](plugin-catalog/recommendations.md)** — the short list for a show and
  the short list for a mix.

## The mix

- **[Sends, buses, groups and DCAs](sends-buses-dcas.md)** — aux sends,
  sends-on-faders, bus masters, subgroups, DCAs and mute groups.
- **[LCR mains](lcr.md)** — a discrete centre speaker feed on MAIN: the format picker,
  divergence, the meter and leg block's third bar, and the X-Touch SHIFT gesture.
- **[The matrix and outputs](matrix-outputs.md)** — matrix outputs and per-output
  processing.
- **[Cue, solo and the monitor](cue-solo.md)** — PFL, AFL, solo-in-place, the monitor
  output, level and dim.
- **[The patchbay and the graph](patchbay.md)** — getting real audio in and out.
- **[Talkback and test signals](talkback.md)** — the oscillator, noise generators and
  the talkback path.

## Running a show

- **[Scenes and sessions](scenes-sessions.md)** — saving the console, snapshots,
  recall-safe and channel configs.
- **[Recording and virtual soundcheck](recording.md)** — multitrack takes, and playing
  them back through the desk.
- **[Metering and latency](metering-latency.md)** — the meter bridge, loudness, and
  what the telemetry numbers mean.
- **[Console profiles and the look](look.md)** — console profiles, the theme, accent and
  finish, and accessibility.
- **[The Setup panels](setup.md)** — allocation, adapters, control surfaces, stageboxes,
  discovery, the interface takeover and the network.
- **[The clock](reac-clock.md)** — the graph clock and the REAC wire, segment by segment.
- **[Keyboard reference](keyboard.md)** — every shortcut.

## Reference

- **[Frequently asked questions](https://freemixer.github.io/openmixer-www/faq)** — short
  answers to questions that come up repeatedly, on the project site.

## Elsewhere

- [Installing openmixer](../install/index.md)
- [REAC stageboxes](../hardware/index.md)
- [Troubleshooting](../troubleshooting/index.md)
- [Administrator guide](../admin/index.md)
`,ce="# Keyboard reference\n\nEvery control on the surface is reachable by keyboard, with a visible focus ring.\n\n![The fader bay after Tab](images/keyboard-1.png)\n*Keyboard focus in the bay: a control shows a visible ring before it takes an arrow key.*\n\n## Controls\n\n- Faders and knobs take **drag**, **wheel** and **arrow keys**; hold `Shift` for coarse\n  steps.\n- **Double-click** or `Enter` resets a control to its default — unity for a fader, centre\n  for pan.\n- In the EQ curve, arrows nudge the selected band and `Enter` toggles a filter.\n\n## Shortcuts\n\n| Key | Action |\n|---|---|\n| `←` / `→` (or `[` / `]`) | select the previous / next channel |\n| `M` | mute the selected channel |\n| `S` | solo the selected channel |\n| `F` | flip the bay to sends-on-faders, and back |\n| `,` / `.` | page the bank left / right |\n| `1`–`8` | recall a saved snapshot |\n| `Ctrl`/`⌘` + `S` | save the session |\n| `Ctrl`/`⌘` + `Z` | undo |\n| `Ctrl`/`⌘` + `Shift` + `Z` | redo |\n| `Ctrl` + `Y` | redo (the Windows-style alias) |\n\nShortcuts are suppressed while you are typing in a text field, so renaming a channel `M`\ndoes not mute it.\n\n`M` and `S` act on the **selected** channel. Select with the arrow keys or by tapping a\nstrip.\n\n## Quick answers\n\n**A screen looks stale.** It has probably lost its connection. Reload it and it\nre-hydrates from the server.\n\n**A control is greyed out or absent.** The bound device does not offer that feature — the\nsurface honours each adapter's and each console profile's capabilities rather than\noffering a control that would do nothing.\n\n**The surface says Demo (offline).** It cannot reach a server. See\n[the web UI cannot reach the server](../troubleshooting/web-ui-cannot-reach-server.md).\n",ue=`# Layouts, banks and the work zone

The screen has three regions and they are arranged separately: the header across the top,
the **work zone** in the middle, and the **fader bay** across the bottom. This page is
about arranging them.

![The fader bay with its layer menu and bank chrome](images/layouts-1.png)
*The fader bay: layer tabs across the top, banks of eight below, MAIN pinned outside the paging.*

## The work zone

The work zone holds panels. Every panel is one of the console's own modules — Processing,
Sends, Patchbay, Meter bridge and the rest — and the **Layouts** menu lists all of them
under its divider. Picking one adds it to the arrangement you already have; it does not
replace it.

A panel can be split off, resized at its gutter, grouped with others into a tab strip,
minimised, maximised, floated over the rest, or closed. Drag a panel's titlebar onto
another panel to tab them together, or onto an edge to split.

The **Layouts** panel lists every saved arrangement as a chip; the lit one is active, press
another to switch, and a shipped arrangement is tagged **preset**.

Two menu items manage the whole arrangement:

- **Reset to default** puts the work zone back to the shipped arrangement.
- **Save config…** freezes what you have as a named layout.

Those two are not the same kind of thing, and the difference matters:

**The arrangement is per window.** It lives in this browser and follows this screen. A
phone held at the stage and the screen at front of house are entitled to show the same
show arranged differently, and the desk does not push one onto the other. Reload and you
come back to the arrangement you left.

**A saved layout rides the session.** *Save config…* names the arrangement and stores it
with the show, so it is there on every device that opens that session.

### The shipped layouts

Ten of them, each a starting point rather than a rule:

| Layout | What it opens with |
|---|---|
| **Processing** | The channel view, full width. |
| **Plugin rack** | The insert chain, full width. |
| **Plugin editor** | One plugin's generated controls. |
| **Sends** | Per-channel sends beside the bus masters. |
| **Routing** | The MAIN and sub-group assigns beside the bus masters. |
| **Matrix + outputs** | The crosspoint matrix beside the output insert chains. |
| **Meter bridge** | Metering, full width. |
| **Patchbay** | The routing patchbay, full width. |
| **Graph** | The node canvas, full width. |
| **Source layer** | Named inputs and their head-amps, full width. |

### Giving the work zone the bay's half

The **⤢** button hands the fader bay's half of the screen to the work zone, and gives it
back when you press it again. Use it whenever a panel is too short to read — an EQ curve
in half the height is a curve you cannot judge — and press it again to get the faders
back.

### A panel on a second screen

Any layout can be popped out into its own browser window, so the fader wall lives on the
main display and a plugin editor sits on a second screen. Each window is another client of
the same console: everything is live in both, and each window keeps its own arrangement.

## The fader bay

Strips are grouped in **banks of eight**, because eight is what moves together on a
hardware desk and the habit is worth keeping.

The bay shows one **layer** at a time, chosen from the tabs beside the faders:

**Channels** · **Aux** · **Group** · **DCA** · **Matrix**

Picking a layer jumps the bay to it. It does **not** fence the paging: the **◀ ▶** arrows
step through every bank of every layer as one continuous, wrapping sequence — channels,
then buses, then DCAs, then matrix, then round again. The \`,\` and \`.\` keys do the same.

You can also **roll the mouse wheel over the bank rail** to step banks, in either
direction. The gesture stays out of the way of the controls it rolls over: a wheel on a
fader still trims that fader, and only the space between the controls steps banks. One
flick of a trackpad is one bank, not twenty.

Within the bay:

- **Pin** a bank and the paging flows past it — it stays where it is while the rest cycle.
- **Collapse** a bank to a thin labelled spine, and click it to bring it back.
- **MAIN** is pinned to the far right, always in view, outside the paging entirely.
- **Hide unpatched** drops input channels with nothing patched into them, so a 64-channel
  console shows the ten strips a small gig actually uses.
- The layer menu itself can sit **across the top or down either edge** of the bay.

## USER pages

A **USER page** is a bay layer you build yourself: an ordered list of slots, each one any
strip on the console — an input, an aux master, a group, a DCA, a matrix, MAIN — or a
deliberate **blank**, the gap a hardware desk uses to separate one part of a band from
another.

USER pages ride the tabs beside Channels / Aux / Group / DCA / Matrix.

- **Tap** a USER tab to show that page in the bay.
- **Long-press** the tab (or press **EDIT PAGE**) to open the page editor.
- **＋** adds a page.

The editor is built for a finger: pick a slot, pick what goes in it, drag to reorder,
leave gaps where you want gaps.

**A USER page belongs to the desk, not to this screen.** Build one at front of house and it
is there on the tablet at the stage and on the laptop in the office, because it is part of
the show. That is the opposite of the work-zone arrangement above, and deliberately so: a
page is *which strips matter tonight*, which is a fact about the gig; an arrangement is
*how big this screen is*, which is not.

What you can keep locally is a **page profile** — a named snapshot of the whole set of
USER pages together. Save the festival set, load the theatre set, switch back. Profiles
live in this browser and loading one moves the desk onto it.

## Density

**Density** decides how much the surface packs into the space it has. Three tiers, plus
**auto**:

| Tier | Fader width | Use it when |
|---|---|---|
| **compact** | 80 px | A tablet, a laptop, or any time you want the most faders on screen. |
| **normal** | 100 px | The everyday setting. |
| **comfortable** | 116 px | A big screen, or fingers on a touchscreen at arm's length. |

**Auto** picks for you: a touchscreen narrower than about 1100 px goes to compact;
otherwise it takes the widest tier that still keeps at least two banks — sixteen faders —
on the wall.

The density control is in the header's display settings and in **Setup ▸ Preferences**.
It is an operator preference, so it rides the session and reaches every window you have
open.

### What happens when the faders do not fit

By default, **nothing gets narrower**. The strips keep their width and the surplus banks
page — which is how a hardware desk behaves, and means a fader is always in the same place
under your hand.

The other behaviour is available and is an explicit opt-in: **narrow on overflow** shrinks
the tier until every bank of the current layer fits at once, and never widens past the
tier you chose. Turn it on when seeing the whole layer matters more than the strips staying
the size you set.

The bay never shows more than four cycling banks side by side, whatever the width.

### A narrow screen

At compact density on a small screen the config zone stops being a column and comes in
over the right-hand edge with a dimmed backdrop behind it. Tap the backdrop to send it
away. While it is up it covers the header, so close it before reaching for a menu.

The dock chrome compresses along with the strips, and panel tabs swap their titles for
short console abbreviations — \`FDR\`, \`PROC\`, \`RACK\`, \`MTX\`, \`RTA\` — so a tab strip of six
panels still reads at a glance.

## Related

- [The console menus](menus.md) — the Layouts menu item by item.
- [The surface](surface.md) — what each region is for.
- [Keyboard reference](keyboard.md) — paging and layer shortcuts.
`,pe=`# LCR mains

Governed by: \`docs/design/specs/2026-09-08-lcr-mains.md\`

A MAIN bus can carry a third, discrete centre speaker feed alongside its usual left and
right — the LCR format. This is for a room with its own centre cluster: a vocal or a
centred instrument can sit in a genuinely discrete \`C\` output instead of a phantom image
built from the L/R pair.

## Turning a MAIN into LCR

Select the MAIN strip and open its processing view. A **Format** picker sits on the strip
head, offering whatever this console's appliance actually supports — some consoles only
ever offer \`Stereo\`, because their engine has no discrete centre output to give one. Where
\`LCR\` is offered, picking it grows a third output on MAIN immediately.

If the console refuses the change, the picker shows why (the exact reason the desk gives,
not a paraphrase) instead of silently staying on \`Stereo\`.

Switching a MAIN that is already mixing is an operator action with an audible
consequence — every channel's image redraws through the LCR panner (below) the moment you
pick it. Switching back to \`Stereo\` removes the \`C\` output and returns every channel to a
phantom image.

## Divergence — how much of a source is discrete

Once MAIN is \`LCR\`, every channel feeding it grows a second control beside **Pan**:
**Divergence**. Pan still places a source left-to-right exactly as before; Divergence
decides how much of a centred source comes out of the discrete \`C\` speaker rather than
being phantom-imaged between L and R.

- **Divergence at 100% (Phantom)** — the default, and what an untouched channel plays:
  the image is exactly what it always was, with \`C\` silent.
- **Divergence at 0% (Discrete)** — a source panned to centre plays entirely out of \`C\`,
  with L and R silent for it.
- Anywhere in between reads as **Phantom \`NN\`%** — a blend of the two.

Divergence is a property of the CHANNEL, not of any one destination: if a channel feeds
both an ordinary stereo aux and the LCR main, its one divergence value only does anything
on the LCR leg — the aux hears the same channel it always did.

On a channel whose destination is not \`LCR\`, no Divergence control appears at all — there
is nothing for it to do there.

## The meter and the leg block

An LCR MAIN's meter grows a third bar, \`L\` \`C\` \`R\`, so you can see level reaching the
centre speaker the same way you see it reaching the others. A MAIN that is \`Stereo\`
keeps its usual two bars.

In the [patchbay](patchbay.md), an LCR MAIN's leg block grows a third cell, \`C\`, beside
\`L\` and \`R\` — the same tap-to-patch, long-press-to-unpatch gesture as the other two, and
the feed's trim, alignment delay and mute (drawn once, for the destination as a whole)
apply to all three legs together. A \`Stereo\` MAIN keeps its usual two-cell block.

## X-Touch: SHIFT turns the V-Pot into Divergence

On an X-Touch in MCU mode, a strip's V-Pot dials Pan by default. Hold **SHIFT** (the
modifier key under the display) and turn the SAME V-Pot: while SHIFT is held, the turn
dials Divergence instead, and the ring shows the divergence position (empty = discrete,
full = phantom). Release SHIFT and the V-Pot is Pan again.

This only redirects a V-Pot that is currently dialling Pan, and only where MAIN is
\`LCR\`. On any other strip — a V-Pot dialling head-amp gain, or MAIN when it is
\`Stereo\` — holding SHIFT achieves nothing: the V-Pot keeps doing its ordinary job, never
a write to a fact that means nothing there. SHIFT never overrides a physically held
V-Pot push either — that momentary pan layer takes priority, exactly as it did before
SHIFT existed.

## What LCR does not do yet

This is phase 1 of a larger surround design. It does **not** currently include:

- **No LFE, no 5.1/7.1.** The format list is exactly \`Stereo\` and \`LCR\`.
- **No cue/monitor centre fold.** Soloing or monitoring a channel that feeds an LCR
  main does not yet fold its \`C\` content into the two-speaker cue bus — that crossfade is
  designed but not built. Until it lands, monitor what MAIN itself is doing rather than
  relying on cue to represent the centre image.
- **Appliance-dependent.** Whether \`LCR\` is even offered on MAIN depends on the console
  profile in use — not every supported desk models a discrete centre bus.
`,me=`# Console profiles and the look

Two independent things in the display menu. They do different jobs and it is worth keeping
them apart: the **console profile** sets what the desk can do, the **look** sets how it is
drawn.

## Console profile — what the desk *is*

![Setup, Preferences](images/look-1.png)
*Preferences in the config zone: theme, accent, finish and language.*

A **console profile** sets the desk's capabilities: how many input channels and buses,
how many EQ bands and of what kind, which dynamics types are available and in how many
stages, whether the processing order is free or fixed, how many inserts, which send tap
points exist.

- **openmixer** — the default. Restricts nothing: the caps are the engine's own maxima,
  every section present, free reordering, a dynamic-band parametric EQ (add and remove
  bands freely, no fixed count), two dynamics stages with the full type list.
- **Midas PRO** — a fixed-format desk: fixed per-type bus counts, a four-band musical EQ
  (fixed named bands, no adding or removing), gate before compressor enforced, a single
  insert.
- **Roland M-5000** — the M-5000's own shape.

Choosing a restrictive profile is how you make the software behave like the desk your
crew already knows. A capability a profile does not have is **absent**, not greyed out —
there is no pretending.

Changing profile changes what the console can do, so it is a setup decision, not a
during-the-show one. A saved session records the size it was built at; a profile that
cannot express that size will not silently shrink it. A profile never changes the look.

## The look — how the desk is drawn

The desk has one house style, the **omx look**: an enamel faceplate, aluminium knobs, ridged
fader caps, buttons that are off, dim or lit, and meters and curves behind backlit glass. You
choose three things about it, each independently of the other two.

- **Theme** — **dark** (the default), **high contrast**, or **light**. High contrast separates
  meter zones by **brightness** as well as by colour, for stage glare and for colour-blind
  safety.
- **Accent** — the colour every live thing glows in: values, lamps, lit segments, curve
  traces, the fader fill and the focus ring. **Orange** (the default), **amber**, **teal**,
  **ice**, **green**, **violet**, **red** or **magenta**. On the light theme each accent is
  drawn a deeper shade, and on high contrast a brighter one, so it reads on every panel.
- **Finish** — the metal of the knobs, fader caps, toggles and screws: **aluminium** (the
  default), **graphite** or **black**. The knob's pointer stays light on every finish.

Two families of colour never follow the accent: the **function colours** (mute red, solo
amber, the record and alarm lamps), so a mute is always a mute; and the **channel colours**
you give a strip, which keep their own hue and are drawn per theme.

The look is part of the **session**: it is saved with the show, every screen on the desk shows
the same look, and loading a show brings back the look it was mixed with. Plugin panels wear
the same look.

## The three themes

The same fader bay, photographed once in each theme at the same density.

![The fader bay in the dark theme](images/look-theme-dark.png)
*Dark — the default a new console starts in.*

![The fader bay in the high-contrast theme](images/look-theme-hc.png)
*High contrast — a black field, white type, meter zones separated by brightness as well as colour. The rest of this manual is printed in it.*

![The fader bay in the light theme](images/look-theme-light.png)
*Light — for a bright room.*

Every other figure in this manual is captured in the **high-contrast** theme at the **compact**
density, because that is how the desk is run: high contrast on the narrowest screen you are
likely to be carrying. A picture taken at a roomier density teaches a layout you will not see
when it matters, and a picture taken light teaches a surface you will not be looking at.

## Density

Not part of the look but the same kind of setting: the **density** picker in the display menu
sets how tightly the surface packs — compact, normal or comfortable, plus **auto**, which
picks one for the screen you are on. On a small tablet
compact fits more strips; on a large touchscreen at front of house comfortable is easier to
hit in the dark.

## Language

The surface's language is selectable in Setup. English is the default; Catalan and
Spanish are fully-translated selectable locales.

Numbers and dates follow the chosen locale — Catalan uses comma decimals, and the numeric
fields accept either separator, so nothing has to be retyped when you switch.
`,ke=`# The matrix and outputs

## The crosspoint matrix

![Patch, Matrix](images/matrix-outputs-1.png)
*The crosspoint matrix: a cell per source and destination, each carrying its own level.*

The **Matrix + outputs** chip holds the matrix: a grid whose **rows are matrix outputs**
and whose **columns are the buses and mains** that can feed them. Each crosspoint is a
level control with a dB readout, and each source column carries its own master.

A matrix output is any blend of the mains and the buses, at levels you set. That is how
you build:

- a **delay-tower** or **fill** feed — the mains, at a level and with a delay of its own;
- a **broadcast or recording mix** — a different balance from the room's;
- a **zone send** — the bar, the foyer, the dressing rooms.

Because a matrix output is fed from buses rather than from channels, it follows the mix
you are actually making. Change the vocal in the mains and it changes in the broadcast
feed too, which is usually what you want and is occasionally not — that is what the
per-crosspoint levels are for.

## Output processing

![Layouts, Output inserts](images/matrix-outputs-3.png)
*Per-output processing: the insert chain that sits on an output, after the mix.*

Beside the matrix, the **output inserts** panel gives every output its own ordered plugin
chain: a crossover, a limiter, EQ and delay per output.

This is loudspeaker management, and it is the reason there does not need to be a separate
speaker processor in the rack. It works exactly like a channel's insert chain — the same
picker, the same generated editors, the same drag-to-reorder — and there are two racks in
the **Plugin rack** chip for this reason: one for the selected channel, one for the
selected output.

The output's chain latency is reported like any other, and it counts towards the
mains-path figure in [telemetry](metering-latency.md).

## Output legs

![Patch, Patchbay, Buses & outputs](images/matrix-outputs-2.png)
*The leg block: every bus and output leg against the physical ports, with the feed trim, alignment delay and mono fold for the selected feed.*

A **leg** is one destination a mix feeds, together with the fixed correction that piece of
hardware needs. Other desks call this the output port's own settings: an M32 gives each output a
source, a delay and a polarity; a Yamaha CL gives each output port gain, delay and phase; an
Allen & Heath dLive gives each socket a delay and a polarity. Same idea, same job.

A leg carries four things. The trim, the fold and the mute belong to the destination as a whole —
never to one side of it. The **delay** is the one exception, and it is per side, because how far
away a box is is a fact about that box:

- **Feed trim** (dB) — this destination leaves the desk hotter or quieter than the others.
- **Alignment delay** (ms), **one encoder per socket** — this box is nearer than the one beside
  it, so its feed is pushed later. Each encoder is captioned by the socket it moves, so the
  operator dials the box and not a letter. A side that lands on no socket of its own, or that
  folds onto a socket an earlier side already has, has no box and no encoder.
- **Mono fold** — a switch: both sides of the mix sum onto this destination's one socket. There
  is no figure to set. Summing two sides that carry the same thing would arrive twice as loud, so
  the desk halves each of them, which is the only number that lands the sum back where it
  started. The switch is available when the destination is one socket; a destination on two
  sockets has nothing to fold onto, and says so.
- **Feed mute** — this destination goes silent while the mix keeps running everywhere else.

The controls are drawn **on the leg**, in one block captioned by where the mix lands
("RME AUX0 / AUX1"). The crosspoint cells above it only say which socket each side lands on;
they carry no mute, because a control captioned with one side that silences both is a trap.

The two numbers are **encoders**, the same control the processing view uses: turn the dial
(drag, or the mouse wheel over it), step it with the **−** and **+** buttons beside it, or tap
the number to type an exact figure. Arrow keys nudge it and Home/End take it to the ends of its
travel. The feed trim's dial fills out from **0 dB** in both directions, so a cut and a boost are
told apart at a glance; the delay fills from one end, because that is all the travel it has. No
dial can be turned past the range the desk declares for it. The mono fold has no dial: it is on
or off, like the feed mute.

### Leg or matrix?

**A fixed correction for a piece of hardware is a leg. A feed you operate during the show is a
matrix.**

A matrix is a bus: it mixes many sources at their own send levels, and it has a fader, a mute, a
meter and its own processing. It costs a path from the pool and a strip on the surface. Give a
destination a matrix when it needs its own level, EQ or mute *during the show*. Give it a leg
when it needs a number set once and left alone.

### A muted feed is visible on the strip

Muting a leg silences that destination only. The mix itself is still running, its fader is up,
its MUTE button is off and its meter is healthy — so if the mark lived only in the patchbay, a
silent PA would have no visible cause anywhere you were looking.

It does not. The strip that feeds the muted leg wears a **FEED MUTED** badge naming the
destination, and **tapping that badge un-mutes it**. The same single action is available on the
leg block itself. If your mains go quiet and the meters are moving, this badge is the first thing
to look for.

## Walk-through: patching Main to a device

1. Open the **patchbay**, then the **Buses & outputs** tab.
2. Find the **Main** rows. A stereo mix has two: **Main L** and **Main R**.
3. **Patch it.** Where the device declares a stereo pair, the **L+R** button beside the L cell
   puts both sides on it in one gesture. Otherwise click the cell where Main L should land, then
   the cell for Main R — the two sides are independent, so they may sit on different sockets or
   even different devices.
4. A **leg block** appears under the two rows, captioned with where the mix now lands. That is
   the destination, and those are its controls.
5. **Trim it.** Turn the leg's feed trim encoder, or tap its number and type a dB figure. Only
   this destination changes; the bus fader everybody is mixing on does not move.
6. **Align it.** Set the measured skew in milliseconds on the alignment delay encoder **of the
   socket that box hangs off**. A feed can only be pushed later, never advanced, and the box on
   the other socket keeps whatever it was set to. Two stacks at two distances off one leg is
   exactly what this is for.
7. **Mute it.** Tap **FEED MUTE**. That destination goes silent; the mix keeps running. Look at
   the Main strip on the fader wall — it now carries the FEED MUTED badge naming the
   destination. Tap either one to bring it back.
8. **Split L and R.** Click Main R's cell on a different socket. The mix's two sides now land in
   two places; it is still one leg to one destination, with one set of corrections. To join them
   back onto a declared pair, use the **L+R** button on the L row.

A mix feeds **one** destination. If you need a second, simultaneous feed with its own level, that
is a matrix — see the crosspoint matrix above.

## Worked example: a delay fill under the balcony

Two speakers under the balcony are too far back to hear the mains cleanly. They want the
main mix, a little of the vocal aux for intelligibility, at their own level, arriving late
enough to line up with the sound coming from the stage.

1. **Open Patch ▸ Matrix.** Rows are the matrix outputs, columns are the buses and mains
   that can feed them.

![Patch, Matrix](images/matrix-outputs-4.png)
*The crosspoint grid with the work zone expanded: a level per cell, and a master per source column.*

2. **Find Matrix 1's row.** In the **Main** column, set the crosspoint to unity, or a few
   decibels below it. That is the mix the fill carries.
3. **In the vocal aux's column on the same row**, set a level well below the main — a few
   decibels is usually plenty. The fill is there to make words intelligible, not to be a
   second PA.
4. **Set Matrix 1's own fader** on the bay's **Matrix** layer. That is the fill's overall
   level, and it is the one you will ride if the balcony complains.
5. **Send it somewhere.** Open **Patch ▸ Patchbay ▸ Buses & outputs**, find Matrix 1's row,
   and patch it onto the amplifier's socket. A **leg block** appears under the row,
   captioned with where it lands.
6. **Delay it.** On that leg, set the **alignment delay of the socket the amplifier is on** to
   the time sound takes to travel from the mains to the balcony — roughly 3 ms per metre. Twenty
   metres is about 58 ms. Turn the encoder, or tap the number and type it.
7. **Trim it** on the same leg if the amplifier wants a hotter or quieter feed than the
   others.
8. **Check it.** Stand under the balcony. The fill should sound like the stage, only
   closer, with no slap and no doubled consonants.

**What you should see:** the matrix output metering when the mains do, the leg block
naming the amplifier's socket, and the delay figure standing on the leg.

**What it means if you do not:**

- **The matrix output meters and nothing comes out.** The mix is being made and is not
  reaching hardware. The leg is the place to look — see
  [the main output is silent](../troubleshooting/silent-main.md).
- **It comes out but at the wrong balance.** You set the crosspoints and forgot the matrix
  fader, or the other way round. Both are in the path and both multiply.
- **It sounds like an echo.** The delay is too long. Halve it and work up.
- **It arrives early and smears.** The delay is too short, or zero. A feed can only ever be
  pushed later — the desk cannot advance one, because there is nothing to advance it from.
- **Changing the vocal in the house changed the fill by more than you meant.** That is the
  matrix doing its job: it is fed from buses, so it follows the mix. If you want a feed
  that does not follow, feed it from different buses.

**Leg or matrix?** The delay above belongs to the *piece of hardware* — it never changes
during the show — so it lives on the leg. The *level of the fill*, which you might ride, is
the matrix. That is the whole distinction.

## Routing an output to real hardware

The matrix decides *what* an output carries. Where it physically goes is a routing
question, handled in the [patchbay](patchbay.md): the output routing row picks the real
sink each bus, matrix output and the main feeds.

In the patchbay's output grid a stereo bus takes one row per side, and a chip before each row
names the side it carries, such as \`L\` or \`R\`.

The two are separate on purpose. Re-patching to a different physical output does not
disturb the mix you built.

## The main output

The Main fader is pinned to the right of the fader bay, outside the paging, and Main has
no solo. Its output route is set in the same output routing row as everything else.

If the main meter moves and nothing comes out, that route is where to look:
[the main output is silent](../troubleshooting/silent-main.md).
`,ge=`# The console menus

Six menus sit across the top of the header: **Setup**, **Patch**, **Scenes**, **Meters**,
**Layouts** and **Help**. Everything the desk can show is behind one of them, and this page is the
list — one line per item, with a link to the page that explains it properly.

![The console menus, with Setup open](images/menus-1.png)
*The header menus: one is open at a time, a click on an item runs it and closes the menu.*

One menu is open at a time. Clicking an item does the thing and closes the menu; a click
anywhere else, or the \`Esc\` key, closes it without doing anything.

The items land in one of two places, and it is worth knowing which:

- **The config zone** — the reserved column at the top right. It holds one panel at a time
  and is where the between-songs settings live. On a narrow screen it comes in over the
  right edge with a dimmed backdrop; tap the backdrop to send it away.
- **The work zone** — the middle of the screen, where the mixing panels live. Opening a
  work-zone panel adds it to the current arrangement rather than replacing it. See
  [layouts and the work zone](layouts.md).

## Setup

Fourteen panels, all of them in the config zone.

| Item | What it is |
|---|---|
| **Allocation** | How many channels and buses this console has. See [the Setup panels](setup.md#allocation). |
| **Adapters** | The I/O endpoints and control surfaces the console talks to. See [the Setup panels](setup.md#adapters). |
| **MIDI Controllers** | The control surfaces that are configured, whether each is present, and the autodetect button. See [the Setup panels](setup.md#control-surfaces). |
| **Gestures** | Encoder double-tap and long-press timing. See [the Setup panels](setup.md#gestures). |
| **Interface takeover** | Whether the console holds the audio interface exclusively. See [the Setup panels](setup.md#interface-takeover). |
| **Come-up gain** | What a fresh strip starts at. See [the channel strip](channel-strip.md). |
| **Discovery** | Network audio devices found on the wire. See [the Setup panels](setup.md#discovery). |
| **Stageboxes** | The boxes this console knows. See [the Setup panels](setup.md#stageboxes). |
| **Clock** | The graph clock and the REAC wire clock. See [the clock](reac-clock.md). |
| **RME TotalMix** | The internal routing of an RME interface, owned by the console. See [the Setup panels](setup.md#rme-totalmix). |
| **Network** | The address and port the server is answering on. See [the Setup panels](setup.md#network). |
| **Plugin analysis** | Plugin cost measured on this machine against the figures the catalog ships. See [the Setup panels](setup.md#plugin-analysis). |
| **Sessions** | The saved consoles on this server. See [scenes and sessions](scenes-sessions.md). |
| **Preferences** | Theme, accent, finish and language. See [console profiles and the look](look.md). |

## Patch

Four work-zone panels.

| Item | What it is |
|---|---|
| **Patchbay** | Sources against channels, and the output legs. See [the patchbay and the graph](patchbay.md). |
| **Matrix** | The crosspoint matrix. See [the matrix and outputs](matrix-outputs.md). |
| **Graph** | The same routing as a node canvas. See [the patchbay and the graph](patchbay.md#the-graph). |
| **Source layer** | Named inputs with their head-amp and direct paths. See [the patchbay and the graph](patchbay.md#the-source-layer). |

## Scenes

| Item | What it is |
|---|---|
| **Scenes** | Store and recall named mix snapshots, with recall-safe. See [scenes and sessions](scenes-sessions.md). |

## Meters

| Item | What it is |
|---|---|
| **Meter bridge** | Every strip at once, with peak-hold and clip. See [metering and latency](metering-latency.md). |
| **Analyzer** | The real-time spectrum of any source. See [the analyser](rta.md). |
| **Telemetry** | Per-channel latency, the mains and monitor paths, live xruns. See [metering and latency](metering-latency.md). |
| **Perf** | Quantum, sample rate, xruns and the graph load behind them. See [metering and latency](metering-latency.md). |

Meter bridge and Analyzer open in the work zone; Telemetry and Perf open in the config
zone.

## Layouts

Two actions, then the whole list of work-zone panels.

| Item | What it is |
|---|---|
| **Reset to default** | Throw away this window's arrangement and go back to the shipped one. |
| **Save config…** | Freeze the current arrangement as a named layout that rides the session. |

Below the divider, every work-zone panel the console has, each one an "add this panel":
Fader wall, Processing, Plugin rack, Plugin editor, Plugin catalog, Sends, Routing, Bus
sends, Bus masters, Matrix, Output inserts, Source layer, Patchbay, Talkback, Record,
Graph, Meter bridge and Analyzer. See [layouts and the work zone](layouts.md).

## Help

Last of the menus, and **always there** — it does not disappear when the console is offline,
which is exactly when you are most likely to want it.

| Item | What it opens |
|---|---|
| **Manual** | This manual, from the console's own copy, in a panel over the desk. |
| **Plugin catalog** | [The plugin catalog](plugin-catalog/index.md) — every plugin measured, by family. |
| **Keyboard shortcuts** | [The keyboard reference](keyboard.md). |
| **Frequently asked questions** | The FAQ on the project's public site. This one needs the internet; the rest do not. |
| **About** | What the console reports about itself: its build, its model, whether this surface is linked to it and whether the plugin host is up. |

The first three open a **panel over the desk**, not a new page: the meters keep moving, the
fader bay stays where it is, and the panic buttons still work while you read. Close it with
its ✕ or with \`Esc\`. Each page in the panel also carries **Open in a new tab**, for when you
want the manual on its own screen.

**About** reports the build the *console* is running, asked of the console itself. Where the
console does not report one it says *unidentified build* rather than guessing: a version the
browser made up would describe the wrong thing.

**About** also carries a QR code for this console's own address, below the build — scan it from
a phone or tablet to open the same console there. A device meeting this console for the first
time lands on the [trust page](../install/trust-the-console.md) instead of the console itself,
because it has not yet been told to trust the certificate the console issued itself; the code
beside the QR names that page's address too.

The menu also carries a one-line reminder of the faster way to get help — hold any control
for half a second, or tap its ⓘ mark on a touchscreen. See
[getting help on a control](surface.md#getting-help-on-a-control).

## The rest of the header

Not menus, but they live up there too.

- The **connection indicator** — the first thing to read when something looks wrong. See
  [the surface](surface.md#the-header).
- **MAINS MUTE** and **ALL MUTE** — the panic buttons. They fire immediately and do not
  ask. Held, each stays lit so the room's silence has a visible reason. Beside them,
  **CLEAR CLIPS** clears every latched clip on the desk in one tap; it is greyed while nothing
  has clipped, so a lit button is itself the sign that something did.
- **Routing loop detected** — a banner that appears only when the desk's routing feeds back
  into itself, naming the channels in the ring. **BREAK LOOP** cuts one link to open it; if
  there is no link the desk can safely cut, it says so rather than cutting something else.
- The **cue and monitor** block. See [cue, solo and the monitor](cue-solo.md).
- **Display settings** — console appliance, the look (theme, accent, finish) and density,
  put where you can reach them without opening a panel. See
  [console profiles and the look](look.md).
- **Warnings** — see [what the warnings say](#what-the-warnings-say) below.
- **Undo / redo** and the **History** panel — see [undo and history](#undo-and-history).
- The **REC** transport — see [recording and takes](recording.md).

## What the warnings say

The header carries a warnings button with a count. The count is a chip, red when
there is anything to warn about. It is lit when the console is unhappy
about something and calm when it is not; opening it either way gives you the list, and
under it the things that have cleared.

A warning names what is wrong, where it came from and when it was raised, and carries a
**Copy** button that puts the whole entry on the clipboard — the fastest way to get an
exact fault into a message to someone else. Long entries can be expanded for detail.

Four of them are about the surface's own grip on the console rather than about audio, and
they are worth recognising on sight:

| Warning | What it means |
|---|---|
| *The live stream is down* | This screen is not receiving updates. What you see may be stale. |
| *A missed update was detected* | The surface noticed a gap and is re-reading the console. It settles by itself. |
| *Reconnected — waiting for the console to confirm the board* | The stream came back and the full picture has not arrived yet. |
| *The console heartbeat stopped* | Nothing has been heard from the console for too long to promise the values are current. |

Resolved warnings are kept for the session so you can see what happened during a set
without watching for it.

## Undo and history

Every change you make is an entry: \`Ctrl+Z\` (\`⌘+Z\`) undoes it, \`Ctrl+Shift+Z\` redoes it,
and the header's two arrows do the same with the pending change named in their tooltip.

The **History** panel lists the changes themselves, newest first, each with what it was
and what it became, and who made it — this surface, another surface, a client over the
network, or the console itself. Any entry can be undone from the list rather than by
walking back through everything after it. While you have stepped back, a chip at the foot
of the list counts how many changes are **undone** and waiting to be redone.

The history holds a bounded number of changes and says how many. If an entry you are
about to jump back to has been changed since, the desk says so and offers **Go back
anyway** or **Leave it** rather than quietly overwriting somebody's more recent work.

## Related

- [The surface](surface.md) — the shape of the screen the menus sit on.
- [Layouts and the work zone](layouts.md) — what happens when you add a panel.
- [The Setup panels](setup.md) — what each Setup item opens.
- [Keyboard reference](keyboard.md) — the shortcuts that skip the menus entirely.
`,we=`# Metering and latency

## The meter bridge

![Meters, Meter bridge](images/metering-latency-1.png)
*The meter bridge: every strip at once, with peak-hold and clip.*

The **Meter bridge** chip shows the full metering picture with peak-hold and clip
indication across the console.

Beside the mains it carries an **EBU R128 loudness** meter: momentary, short-term and
integrated LUFS with true-peak, against a −23 target. It is measured in the engine when a
server is running, and estimated from the mains otherwise.

## Meters on the strips

Every strip tile carries its own meter — one column for a mono channel, an L/R pair for a
linked or stereo strip, each with peak-hold.

The **state dot** at the top of the tile is the fast read across a whole wall: grey for
silence, green for signal, red for clip, and a distinct colour when a feedback ring has
been flagged on that channel.

## Latency

![Meters, Perf](images/metering-latency-2.png)
*The performance panel: quantum, graph load and the xrun counter behind the latency figure.*

A software mixer adds latency, and this desk reports it rather than hiding it.

- **Channel latency badges** on each tile open that channel's breakdown, and turn hot when
  the path runs long.
- **The plugin rack** sums the chain's latency at the foot and shows each unit's own
  contribution.
- **The telemetry panel** reports the mains-path latency, the buffer quantum, the sample
  rate, a live xrun counter, and a per-channel, per-plugin breakdown, with a warning when
  a path runs hot. The warning is a red **⚠** chip carrying the figure, on any path where
  the latency openmixer itself introduces goes past the 2 ms budget.

### Where it comes from

Three contributions, in rough order of size:

1. **The buffer quantum.** The graph-wide trade: a bigger quantum is more headroom and
   more latency.
2. **Plugin inserts.** Some plugins — linear-phase EQ, look-ahead limiters — cost a great
   deal. The catalog reports each plugin's figure and can hide the ones that are not
   live-safe.
3. **The transport**, on a rig with a stagebox.

Delay compensation keeps channels aligned with each other. It cannot make the total
smaller — a heavily-processed channel forces the rest to wait for it.

### Reading the xrun counter

An xrun is the graph missing a deadline: a click or a dropout. The counter should sit
still. A counter that climbs means the graph is out of time, and the causes are covered in
[xruns and driver election](../troubleshooting/xrun-driver-election.md).

Watch it during soundcheck with the full plugin load in place, not on an idle console.

### Checking the sample rate

Telemetry reports the graph's rate: the rate the console's clock is set to, on the
Setup page, 192 kHz where the hardware allows it. A stagebox segment paces at its own wire
rate, 44.1, 48 or 96 kHz as set in the REAC clock panel, and the box follows that pace. The
panel shows it beside the graph's rate. The two do not have to match: the REAC daemon converts
between them at the segment, and that conversion is clean. A box that sounds
[granular](../troubleshooting/granulated-audio.md) is a segment that changed rate without
re-pacing its box, not a graph at the wrong rate.

The clock panel itself — both tabs, and every segment control — is [the clock](reac-clock.md).

## A soft meter is not proof

Meters tell you what the mixer received. They do not tell you that phantom power reached a
microphone, that an amplifier is on, or that a wedge is plugged in. For anything physical,
confirm physically.
`,fe=`# The patchbay and the graph

openmixer treats the live PipeWire graph as the truth. Anything producing audio on the
machine — a browser tab, a media player, a microphone, a stagebox — can be patched into a
channel, and anything patched elsewhere shows up here too.

## The routing patchbay

![Patch, Patchbay, Inputs](images/patchbay-1.png)
*The routing patchbay: sources down the side, channels across the top, a cell per patch.*

The **Patchbay** chip is a crosspoint list.

- **Rows** are the live sources: a stagebox, a microphone, an application, the talkback
  generators.
- **Columns** are your input channels.

Tick a cell to patch that source into that channel. More than one source can sum into a
channel. A source feeding more than one channel is flagged, with a count, so a fan-out is
never something you discover by accident.

Sources are grouped into **bands** by device: a stagebox appears as one band, its ports
numbered \`1 … N\`, with the box's own label as the band header. A band can be collapsed,
and it stays collapsed across a re-patch.

Below the grid, the **output routing** row picks the real sink each bus, matrix output and
the main mix feeds — headphones, a stagebox playback, an interface output, another
application.

Each source row also carries a **routing policy**, a small glyph before its name that opens a
menu:

| Policy | Glyph | What the console does |
|---|---|---|
| **Offered** | → | Listed as a source. Under exclusive control the console takes its stray link to the sound card. |
| **No auto-patch** | ⊘ | Listed, but the console never patches or re-links it on its own. |
| **Leave alone** | – | Not offered: folded away, and the console neither unlinks nor patches it, so the system keeps its own routing. |
| **Ignored** | ✕ | The console has nothing to do with it: not offered, never patched, and its links onto the desk's ports are removed. |

## Getting a real source in

Just make it play. Start music in a media player or audio in a browser tab and it appears
as a new row; tick it into a channel and it is in the mix.

A stagebox appears as soon as it establishes. If it does not, see
[the stagebox is not establishing](../troubleshooting/box-not-establishing.md).

### The stagebox and interface lists

Above the grid, the **stageboxes** fold opens a card per box. Closed, its chip counts them —
\`3 boxes · 1 departed\`, red while any box the show expects has gone. Each card is headed by a
**GROUP** badge, because a box is one band of inputs in the grid, and a link chip that says
whether it is here: **CONNECTED**, **PROBING** while the console looks for it, **NO BOX** when
the wire carries none, or **NOT PRESENT** in red for a box this show is waiting on. Hover the
red one for the same reason its disabled preamp controls give.

The **interfaces** fold lists every sound card the console can see, with a switch to enable or
disable each; closed, its chip reads \`2 / 3 enabled\`.

In the grid, a source row can carry a one-character chip before its name: **∅** when the source
is not on the graph right now — its patch is kept and reconnects when it returns — and **↺**
when it has come back and the patch re-established.

## The source layer

![Patch, Source layer](images/patchbay-2.png)
*The source layer: named inputs with their own head-amp control and direct paths.*

The **Source layer** chip is where an input's identity lives: its name,
its head-amp settings — gain, phantom, polarity — and which physical input feeds it.

The point of the separation is that those settings follow the **source**, not the channel.
Re-patch a microphone to a different channel and its gain and phantom go with it. See
[head-amp control](head-amp.md).

Direct outs and direct paths are managed here too: a source can take a path to an output
without consuming a channel.

## The graph

The **Graph** chip shows the same routing as a node canvas, auto-arranged so signal flows
left to right with the fewest crossing wires and stereo pairs kept side by side. Each node
has its inputs down the left edge and its outputs down the right.

- **Drag from an output dot to an input dot** to make a connection.
- **Click a wire** to cut it.
- **Hover a node** to light its whole upstream-and-downstream signal path.
- Pan the canvas, zoom with the wheel, and collapse groups to tame a big graph.

It reads the live graph when a server is reachable and falls back to a demo graph
otherwise. A chip in the panel's header says which you are looking at: **live PipeWire**, or
**offline**. In full screen, **Esc** or **Close** returns to the panel.

## Worked example: a microphone from the stage to the PA

The whole path, once, on a rig with a **Roland S-1608** stagebox on the REAC wire and an
**RME Babyface Pro** as the interface the PA hangs off. Substitute your own box and your
own interface; the steps do not change.

A condenser microphone is plugged into the stagebox's input 3. Nothing is patched.

### Get it into a channel

1. **Open Patch ▸ Patchbay.** Give it the height it deserves with the **⤢** button — the
   grid is easier to read at full height.

![Patch, Patchbay, Inputs](images/patchbay-3.png)
*The input grid at full height: sources down the side grouped into a band per device, channels across the top, a cell per patch.*

2. **Find the stagebox's band.** It appears as one band headed with the box's own name and
   its shape — *S-1608 (16 in / 8 out)* — with its ports numbered \`1 … 16\` under it. A
   band can be collapsed, and stays collapsed across a re-patch.
3. **Tick the cell** where the box's port 3 meets **channel 1**. That is the patch. The
   channel now has a source.
4. **Name it.** Select channel 1 in the bay and type a name on the strip — *Vox* — so the
   rest of the evening is about a name and not about a number.

### Set the head amp

5. **Open Patch ▸ Source layer**, or use the head-amp row at the top of
   **Layouts ▸ Processing** with channel 1 selected. Either reaches the same controls.
6. **Switch on +48 V.** The box's own LED for that input should light. Give it a few
   seconds; a condenser takes a moment to come up.
7. **Set the gain.** Have somebody talk or sing at working level and bring the gain up
   until the channel meter is peaking healthily below clipping — a little over halfway is
   a fair target on this desk's scale.
8. **Use the pad if you have to.** If the gain is at its bottom and it is still too loud —
   a close-mic'd snare, a horn — switch the pad in and set the gain again.
9. **Check the polarity** against the other microphone on the same source, if there is
   one. See [smart alignment](channel-strip.md) for doing that with numbers rather than
   by ear.

Those settings follow the **source**, not the channel. Re-patch this microphone to a
different channel and the gain, the phantom and the pad go with it.

### Get it out to the PA

10. **Bring the channel fader up** and make sure it is assigned to MAIN — the **Routing**
    panel shows the MAIN on/off for the selected strip.
11. **Open Patch ▸ Patchbay ▸ Buses & outputs.** Find the **Main L** and **Main R** rows.
12. **Patch them onto the interface's outputs.** Where the device declares a stereo pair,
    the **L+R** button beside the L cell does both in one gesture; otherwise click the two
    cells separately.
13. **A leg block appears** under the two rows, captioned with where the mix lands. Trim it
    there if the amplifier wants a different level, and delay it there if the boxes are
    further away than the stage. See [output legs](matrix-outputs.md#output-legs).

### Get it out to a wedge as well

14. **Patch the box's own outputs.** The stagebox is a sink too — it appears in the same
    output list with its 8 output ports. Patch **Aux 1** onto the box's output 1 and the
    wedge plugged into it is fed from the stage, without a cable back to front of house.
15. **Build the wedge mix** with [sends-on-faders](sends-buses-dcas.md#worked-example-building-a-wedge-mix-on-the-faders).

**What you should see:** the channel meter moving when somebody talks, the main meter
moving with it, sound out of the PA, and the phantom LED lit on the box.

**What it means if you do not:**

- **No meter on the channel.** The patch did not take, or the microphone is in a different
  port than you think. Look at the cell again, and at the box.
- **A meter but no phantom LED.** Nothing on this screen can prove phantom power is at the
  pins — an indicator is a claim, not a measurement. Look at the box.
- **The channel meters and the main does not.** The channel is muted, its fader is down,
  or it is not assigned to MAIN. Check the **Routing** panel.
- **The main meters and nothing comes out.** The mix is being made and is not reaching
  hardware. That is the output patch, and it is the single most common cause of a silent
  PA: [the main output is silent](../troubleshooting/silent-main.md).
- **It works and then stops when a box is replugged.** Routes are stored by name, so they
  come back by themselves. If they do not, see
  [the stagebox is not establishing](../troubleshooting/box-not-establishing.md).

## Routing is stored by name

Routes are persisted by **name**, not by whatever id a device happened to have. That is
what lets a session load onto a rig where the devices enumerated in a different order, and
what lets a USB interface that re-plugged get its routes back automatically.

The mixer also re-issues routes as ports register, so a device that appears late — an
interface that takes its time enumerating — is picked up rather than left silent.

What it cannot do is route to ports that do not exist. A device presenting a different set
of ports under a different profile is the classic cause of a silent output; see
[the main output is silent](../troubleshooting/silent-main.md).

## Exclusive control

The console can take exclusive control of the device outputs, severing every non-mixer
application's link to the sound card while leaving those applications visible in the
patchbay for manual patching. On a dedicated rig it removes a whole class of contention
problems.

It is **not** on by default, because on a shared desktop it would silently cut every other
application's audio. While it is on, the patchbay's tab line carries an **Exclusive** badge;
hover it for what that means. Fire it deliberately from the patchbay, or configure it for a rig
that is only ever a mixer — see
[environment variables](../admin/env-vars.md#engine-behaviour).

## The standalone patchbay

The same graph engine runs as a standalone tool, \`openmixer-patchbay\`: a small server that
exposes the machine's live PipeWire routing with no mixer attached. It is useful as a
plain patchbay in its own right.
`,ye=`# Analysis and metering

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

59 plugins, 34 of them cleared to run on
the console's own audio thread. Figures are at 96 kHz; the columns are explained on
[the catalog index](index.md). Sorted by hosting verdict, then by name.

2 of them declare no LV2 category at all and are filed here from their own
name or description — our reading, not the plugin's claim.

| Plugin | Package | Host | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Certified | Note |
|:---|:---|:---|---:|:---|---:|:---|:---|:---|
| 1/3 Octave Spectrum Display Mono | lv2-x42-plugins | suitable | 0 ms | zero | 1.53 % | ok / ok / ok / ok | yes |  |
| 1/3 Octave Spectrum Display Stereo | lv2-x42-plugins | suitable | 0 ms | zero | 1.54 % | ok / ok / ok / ok | yes |  |
| BBC M-6 | lv2-x42-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| BBC Meter (Mono) | lv2-x42-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| BBC Meter (Stereo) | lv2-x42-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| DIN Meter (Mono) | lv2-x42-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| DIN Meter (Stereo) | lv2-x42-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| DR-14 - Crest Factor Loudness Range Meter (Mono) | lv2-x42-plugins | suitable | 0 ms | zero | 0.43 % | ok / ok / ok / ok | yes |  |
| DR-14 - Crest Factor Loudness Range Meter (Stereo) | lv2-x42-plugins | suitable | 0 ms | zero | 0.83 % | ok / ok / ok / ok | yes |  |
| EBU Meter (Mono) | lv2-x42-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| EBU Meter (Stereo) | lv2-x42-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| K12/RMS Meter (Mono) | lv2-x42-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| K12/RMS Meter (Stereo) | lv2-x42-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| K14/RMS Meter (Mono) | lv2-x42-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| K14/RMS Meter (Stereo) | lv2-x42-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| K20/RMS Meter (Mono) | lv2-x42-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| K20/RMS Meter (Stereo) | lv2-x42-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| Nordic Meter (Mono) | lv2-x42-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| Nordic Meter (Stereo) | lv2-x42-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| Phase/Frequency Wheel | lv2-x42-plugins | suitable | 0 ms | zero | 0.02 % | ok / ok / ok / ok | yes |  |
| Simple Scope (Mono) | lv2-x42-plugins | suitable | 0 ms | zero | 0.02 % | ok / ok / ok / ok | yes |  |
| Simple Scope (Stereo) | lv2-x42-plugins | suitable | 0 ms | zero | 0.02 % | ok / ok / ok / ok | yes |  |
| Spectr | lv2-x42-plugins | suitable | 0 ms | zero | 0.02 % | ok / ok / ok / ok | yes |  |
| Stereo Phase Scope | lv2-x42-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| Stereo Phase-Correlation Meter | lv2-x42-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| Stereo/Frequency Scope | lv2-x42-plugins | suitable | 0 ms | zero | 0.02 % | ok / ok / ok / ok | yes |  |
| True-Peak Meter (Mono) | lv2-x42-plugins | suitable | 0 ms | zero | 0.39 % | ok / ok / ok / ok | yes |  |
| True-Peak Meter (Stereo) | lv2-x42-plugins | suitable | 0 ms | zero | 0.77 % | ok / ok / ok / ok | yes |  |
| True-Peak and RMS Meter (Mono) | lv2-x42-plugins | suitable | 0 ms | zero | 0.41 % | ok / ok / ok / ok | yes |  |
| True-Peak and RMS Meter (Stereo) | lv2-x42-plugins | suitable | 0 ms | zero | 0.79 % | ok / ok / ok / ok | yes |  |
| VU Meter (Mono) | lv2-x42-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| VU Meter (Stereo) | lv2-x42-plugins | suitable | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes |  |
| x42 Instrument Tuner | lv2-x42-plugins | suitable | 0 ms | zero | 0.75 % | ok / ok / ok / ok | yes |  |
| x42 Instrument Tuner[Spectrum] | lv2-x42-plugins | suitable | 0 ms | zero | 0.74 % | ok / ok / ok / ok | yes |  |
| Calf Analyzer | lv2-calf-plugins | conditional — wants MIDI in, which an insert never carries | 0 ms | zero | 0.08 % | ok / ok / ok / ok | yes |  |
| Bit Meter | lv2-x42-plugins | unknown — stability never measured | — | unknown | — | — / — / — / — | no |  |
| EBU R128 Meter | lv2-x42-plugins | unknown — stability never measured | — | unknown | — | — / — / — / — | no |  |
| Frequency tracker | lv2-swh-plugins | unknown — not soaked at every rate | — | unknown | 0.03 % | blast / blast / blast / blast | no |  |
| GxTuner | lv2-guitarix-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.38 % | ok / ok / ok / ok | no |  |
| Hilbert transformer | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | 1.031 ms | low | 0.26 % | ok / ok / ok / ok | no |  |
| LSP Latency Meter | lsp-plugins-lv2 | unknown — not soaked at every rate | — | unknown | 0.03 % | ok / ok / ok / dies | no |  |
| LSP Spectrum Analyzer x1 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.18 % | ok / ok / ok / ok | no |  |
| LSP Spectrum Analyzer x12 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.50 % | ok / ok / ok / ok | no |  |
| LSP Spectrum Analyzer x16 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.61 % | ok / ok / ok / ok | no |  |
| LSP Spectrum Analyzer x2 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.21 % | ok / ok / ok / ok | no |  |
| LSP Spectrum Analyzer x4 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.27 % | ok / ok / ok / ok | no |  |
| LSP Spectrum Analyzer x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.36 % | ok / ok / ok / ok | no |  |
| Signal Distribution Histogram | lv2-x42-plugins | unknown — stability never measured | — | unknown | — | — / — / — / — | no |  |
| Simple Scope (3 channel) | lv2-x42-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.02 % | ok / ok / ok / ok | no |  |
| Simple Scope (4 channel) | lv2-x42-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.02 % | ok / ok / ok / ok | no |  |
| Surround Level 3 | lv2-x42-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.13 % | ok / ok / ok / ok | no |  |
| Surround Level 4 | lv2-x42-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.17 % | ok / ok / ok / ok | no |  |
| Surround Level 5 | lv2-x42-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.18 % | ok / ok / ok / ok | no |  |
| Surround Level 8 | lv2-x42-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.23 % | ok / ok / ok / ok | no |  |
| LSP Phase Detector | lsp-plugins-lv2 | unsuitable — costs more of a core than one insert may | 0 ms | zero | 1.65 % | ok / ok / ok / ok | yes |  |
| LUFS Meter | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |  |
| LUFS Meter (Multichannel) | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 1.07 % | ok / ok / ok / ok | no |  |
| Peak meter | lv2-ll-plugins | unsuitable — has no audio output, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Peak meter (Stereo) | lv2-ll-plugins | unsuitable — has no audio output, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
`,be=`# Delay

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

49 plugins, 29 of them cleared to run on
the console's own audio thread. Figures are at 96 kHz; the columns are explained on
[the catalog index](index.md). Sorted by hosting verdict, then by name.

3 of them declare no LV2 category at all and are filed here from their own
name or description — our reading, not the plugin's claim.

| Plugin | Package | Host | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Certified | Note |
|:---|:---|:---|---:|:---|---:|:---|:---|:---|
| ADT | lv2-airwindows | suitable | 0 ms | zero | 0.38 % | ok / ok / ok / ok | yes | Extra — artificial double tracking (short stereo delays). |
| Allpass delay line, cubic spline interpolation | lv2-swh-plugins | suitable | 0.010 ms | low | 0.10 % | ok / ok / ok / ok | yes |  |
| Allpass delay line, noninterpolating | lv2-swh-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| Comb delay line, cubic spline interpolation | lv2-swh-plugins | suitable | 0.010 ms | low | 0.10 % | ok / ok / ok / ok | yes |  |
| Comb delay line, linear interpolation | lv2-swh-plugins | suitable | 0.010 ms | low | 0.06 % | ok / ok / ok / ok | yes |  |
| Comb delay line, noninterpolating | lv2-swh-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| Doublelay | lv2-airwindows | suitable | 0 ms | zero | 0.42 % | ok / ok / ok / ok | yes | Extra — dual delay/doubler, proven to delay, but the 0..1 delay controls map non-linearly (0.1 -> 100.9 ms, 0.2 -> 245.7 ms) with no unit, which is awkward on a desk. |
| GxDelay-Stereo | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.11 % | ok / ok / ok / ok | yes |  |
| GxEcho-Stereo | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes |  |
| GxMultiBandDelay | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.59 % | ok / ok / ok / ok | yes |  |
| GxMultiBandEcho | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.54 % | ok / ok / ok / ok | yes |  |
| GxReverseDelay | null | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| Gxdigital_delay | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.17 % | ok / ok / ok / ok | yes |  |
| Gxdigital_delay_st | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.33 % | ok / ok / ok / ok | yes |  |
| Gxduck_delay | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| Gxduck_delay_st | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.23 % | ok / ok / ok / ok | yes |  |
| L/C/R Delay | lv2-swh-plugins | suitable | 0 ms | zero | 0.06 % | ok / ok / ok / ok | yes |  |
| LSP Artistic Delay Stereo | lsp-plugins-lv2 | suitable | 0 ms | zero | 0.08 % | ok / ok / ok / ok | yes |  |
| LSP Delay Compensator Mono | lsp-plugins-lv2 | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| LSP Delay Compensator Stereo | lsp-plugins-lv2 | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| LSP Delay Compensator x2 Stereo | lsp-plugins-lv2 | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| LSP Slapback Delay Stereo | lsp-plugins-lv2 | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| MDA Delay | lv2-mdala-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| MDA DubDelay | lv2-mdala-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| SampleDelay | lv2-airwindows | suitable | 0 ms | zero | 0.19 % | ok / ok / ok / ok | yes | Extra — sample/ms delay proven exact (10.000 ms set -> 480 frames at 48 k), but its Inv/Wet control runs 0..1 where upstream is -1..1 (kept deliberately for presets). |
| Simple delay line, cubic spline interpolation | lv2-swh-plugins | suitable | 0.010 ms | low | 0.03 % | ok / ok / ok / ok | yes |  |
| Simple delay line, linear interpolation | lv2-swh-plugins | suitable | 0.021 ms | low | 0.03 % | ok / ok / ok / ok | yes |  |
| Simple delay line, noninterpolating | lv2-swh-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| ZamGrains | lv2-zam-plugins | suitable | 0 ms | zero | 0.12 % | ok / ok / ok / ok | yes |  |
| Allpass delay line, linear interpolation | lv2-swh-plugins | unknown — latency never measured | — | unknown | 0.06 % | ok / ok / ok / ok | yes |  |
| C* Scape - Stereo delay + Filters | caps-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.12 % | ok / ok / ok / ok | no | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| Calf Compensation Delay Line | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.12 % | ok / ok / ok / blast | no |  |
| Calf Reverse Delay | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.13 % | ok / ok / dies / dies | no |  |
| Calf Vintage Delay | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.16 % | ok / ok / ok / blast | no |  |
| Delayorama | lv2-swh-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.06 % | dies / dies / dies / dies | no |  |
| Fractionally Addressed Delay Line | lv2-swh-plugins | unknown — latency never measured | — | unknown | 0.26 % | ok / ok / ok / ok | yes |  |
| GxEchoCat | lv2-guitarix-plugins | unknown — not soaked at every rate | 0 ms | zero | 2.00 % | dies / ok / ok / ok | no |  |
| GxTubeDelay | lv2-guitarix-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.61 % | dies / ok / ok / ok | no |  |
| Gxlivelooper | lv2-guitarix-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.15 % | ok / ok / ok / ok | no |  |
| LSP Artistic Delay Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.08 % | ok / ok / ok / ok | no |  |
| LSP Slapback Delay Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |  |
| Modulatable delay | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | — | unknown | 0.05 % | ok / ok / ok / ok | no |  |
| QDelay | lv2-qdelay | unknown — stability never measured | 0 ms | zero | 0.55 % | — / — / — / — | no | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| Reverse Delay (5s max) | lv2-swh-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.08 % | dies / ok / ok / ok | no |  |
| StereoCrossDelay | lv2-stereocrossdelay | unknown — not soaked at every rate | 0 ms | zero | 0.28 % | dies / dies / ok / ok | no | Stereo cross-feed echo (L/R delay with ratio, feedback, cross-mix, loop LP/HP). |
| Tape Delay Simulation | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | — | unknown | 0.07 % | dies / dies / dies / dies | no |  |
| ZamDelay | lv2-zam-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.10 % | ok / ok / ok / dies | no |  |
| PitchedDelay | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.08 % | ok / ok / ok / ok | no |  |
| Tal-Dub-3 | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.43 % | ok / ok / ok / ok | no |  |
`,ve=`# Dynamics

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

193 plugins, 57 of them cleared to run on
the console's own audio thread. Figures are at 96 kHz; the columns are explained on
[the catalog index](index.md). Sorted by hosting verdict, then by name.

7 of them declare no LV2 category at all and are filed here from their own
name or description — our reading, not the plugin's claim.

| Plugin | Package | Host | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Certified | Note |
|:---|:---|:---|---:|:---|---:|:---|:---|:---|
| A-Law Compressor | lv2-swh-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| Acceleration | lv2-airwindows | suitable | 0 ms | zero | 0.25 % | ok / ok / ok / ok | yes | Extra — slew/acceleration limiter (brightness tamer). |
| C* Compress - Mono compressor | caps-lv2 | suitable | 0 ms | zero | 0.31 % | ok / ok / ok / ok | yes | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| C* CompressX2 - Stereo compressor | caps-lv2 | suitable | 0 ms | zero | 0.54 % | ok / ok / ok / ok | yes | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| C* Spice | caps-lv2 | suitable | 0 ms | zero | 0.18 % | ok / ok / ok / ok | yes | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| C* SpiceX2 | caps-lv2 | suitable | 0 ms | zero | 0.27 % | ok / ok / ok / ok | yes | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| CS10QM | lv2-eq10q | suitable | 0 ms | zero | 0.15 % | ok / ok / ok / ok | yes |  |
| CS10QS | lv2-eq10q | suitable | 0 ms | zero | 0.16 % | ok / ok / ok / ok | yes |  |
| ClipOnly | lv2-airwindows | suitable | 0.010 ms | low | 0.04 % | ok / ok / ok / ok | yes | Extra — the original hard clipper, superseded by ClipOnly2. |
| ClipOnly2 | lv2-airwindows | suitable | 0.010 ms | low | 0.04 % | ok / ok / ok / ok | yes | Recommended — safety clipper with no controls: bit-transparent below the ceiling, holds -0.40 dBFS on a +3 dBFS input. |
| ClipSoftly | lv2-airwindows | suitable | 0.010 ms | low | 0.24 % | ok / ok / ok / ok | yes | Extra — soft clipper whose knee is already active at -6 dBFS (1.06 % THD), so it colours everything below the ceiling. |
| Compresaturator | lv2-airwindows | suitable | 0 ms | zero | 0.31 % | ok / ok / ok / ok | yes | Extra — compressor/saturator hybrid. |
| DeBess | lv2-airwindows | suitable | 0 ms | zero | 0.70 % | ok / ok / ok / ok | yes | Recommended — the author's starter-kit de-esser, 0 ms at every rate, filling a role the palette has only one entry for. |
| DrumSlam | lv2-airwindows | suitable | 0 ms | zero | 0.54 % | ok / ok / ok / ok | yes | Extra — drum-bus saturator/compressor. |
| Dyson compressor | lv2-swh-plugins | suitable | 10.406 ms | low | 0.92 % | ok / ok / ok / ok | yes |  |
| Fast Lookahead limiter | lv2-swh-plugins | suitable | 5.000 ms | low | 0.06 % | ok / ok / ok / ok | yes |  |
| FinalClip | lv2-airwindows | suitable | 0.010 ms | low | 0.05 % | ok / ok / ok / ok | yes | Extra — final-stage clipper, one frame. |
| GT10QM | lv2-eq10q | suitable | 0 ms | zero | 0.09 % | ok / ok / ok / ok | yes |  |
| GT10QS | lv2-eq10q | suitable | 0 ms | zero | 0.10 % | ok / ok / ok / ok | yes |  |
| GxCompressor | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.16 % | ok / ok / ok / ok | yes |  |
| GxMultiBandCompressor | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.78 % | ok / ok / ok / ok | yes |  |
| HermeTrim | lv2-airwindows | suitable | 0 ms | zero | 0.18 % | ok / ok / ok / ok | yes | Extra — fine trim utility with dB ranges. |
| LSP Clipper Mono | lsp-plugins-lv2 | suitable | 25.000 ms | high | 0.22 % | ok / ok / ok / ok | yes |  |
| LSP Clipper Stereo | lsp-plugins-lv2 | suitable | 25.000 ms | high | 0.39 % | ok / ok / ok / ok | yes |  |
| LSP Surge Filter Mono | lsp-plugins-lv2 | suitable | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes |  |
| LSP Surge Filter Stereo | lsp-plugins-lv2 | suitable | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes |  |
| LSP Trigger Mono | lsp-plugins-lv2 | suitable | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes |  |
| LSP Trigger Stereo | lsp-plugins-lv2 | suitable | 0 ms | zero | 0.08 % | ok / ok / ok / ok | yes |  |
| Lookahead limiter (fixed latency) | lv2-swh-plugins | suitable | 170.656 ms | high | 0.06 % | ok / ok / ok / ok | yes |  |
| MDA De-ess | lv2-mdala-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| MDA Dynamics | lv2-mdala-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| MDA Limiter | lv2-mdala-plugins | suitable | 0 ms | zero | 0.06 % | ok / ok / ok / ok | yes |  |
| MDA Splitter | lv2-mdala-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| MDA Transient | lv2-mdala-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| Overheads | lv2-airwindows | suitable | 0 ms | zero | 0.23 % | ok / ok / ok / ok | yes | Extra — overhead-mic compressor/tamer. |
| Point | lv2-airwindows | suitable | 0 ms | zero | 0.21 % | ok / ok / ok / ok | yes | Extra — transient designer, research standout, but not characterised here beyond the scan. |
| Pop | lv2-airwindows | suitable | 0 ms | zero | 0.54 % | ok / ok / ok / ok | yes | Extra — the original Pop compressor; +8.9 dB at defaults with peaks +1.8 dBFS from -20 dBFS noise. |
| Pop2 | lv2-airwindows | suitable | 0.010 ms | low | 0.37 % | ok / ok / ok / ok | yes | Extra — aggressive compressor that compresses hard (15.6 dB implied GR at defaults) but adds +8.6 dB of makeup at its DEFAULT, a level surprise on a live insert. |
| Pressure5 | lv2-airwindows | suitable | 0.010 ms | low | 0.33 % | ok / ok / ok / ok | yes | Recommended — the house's compressor (author's starter kit, with ClipOnly2 built in): 13.2 dB of implied gain reduction at pressure=0.7, one frame of delay, 0.34 % of a core. |
| Pressure6 | lv2-airwindows | suitable | 0 ms | zero | 0.33 % | ok / ok / ok / ok | yes | Extra — a very gentle compressor: 3.1 dB implied GR at MAXIMUM (compres=1, ratio=1), 0 dB at ratio=0. |
| Recurve | lv2-airwindows | suitable | 0 ms | zero | 0.35 % | ok / ok / ok / ok | yes | Extra — curve/compressor with +6 dB at defaults. |
| SC1 | lv2-swh-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| SC4 | lv2-swh-plugins | suitable | 0 ms | zero | 0.13 % | ok / ok / ok / ok | yes |  |
| SE4 | lv2-swh-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| Simple amplifier | lv2-swh-plugins | suitable | 0 ms | zero | 0.02 % | ok / ok / ok / ok | yes |  |
| Sinew | lv2-airwindows | suitable | 0 ms | zero | 0.25 % | ok / ok / ok / ok | yes | Extra — sine-shaped soft clipper. |
| Transient mangler | lv2-swh-plugins | suitable | 0 ms | zero | 0.06 % | ok / ok / ok / ok | yes |  |
| ZaMultiComp | lv2-zam-plugins | suitable | 0 ms | zero | 0.25 % | ok / ok / ok / ok | yes |  |
| ZaMultiCompX2 | lv2-zam-plugins | suitable | 0 ms | zero | 0.39 % | ok / ok / ok / ok | yes |  |
| ZamAutoSat | lv2-zam-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| abGate | lv2-abGate | suitable | 0 ms | zero | 0.02 % | ok / ok / ok / ok | yes |  |
| curve | lv2-airwindows | suitable | 0 ms | zero | 0.36 % | ok / ok / ok / ok | yes | Extra — soft compressor/curve. |
| x42-comp - Dynamic Compressor Mono | lv2-x42-plugins | suitable | 0 ms | zero | 0.10 % | ok / ok / ok / ok | yes |  |
| x42-comp - Dynamic Compressor Stereo | lv2-x42-plugins | suitable | 0 ms | zero | 0.10 % | ok / ok / ok / ok | yes |  |
| x42-dpl - Digital Peak Limiter Mono | lv2-x42-plugins | suitable | 1.333 ms | low | 0.06 % | ok / ok / ok / ok | yes |  |
| x42-dpl - Digital Peak Limiter Stereo | lv2-x42-plugins | suitable | 1.333 ms | low | 0.08 % | ok / ok / ok / ok | yes |  |
| μ-Law Compressor | lv2-swh-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| Calf Compressor | lv2-calf-plugins | conditional — wants MIDI in, which an insert never carries | 0 ms | zero | 0.22 % | ok / ok / ok / ok | yes |  |
| Calf Deesser | lv2-calf-plugins | conditional — wants MIDI in, which an insert never carries | 0 ms | zero | 0.17 % | ok / ok / ok / ok | yes |  |
| Calf Mono Compressor | lv2-calf-plugins | conditional — wants MIDI in, which an insert never carries | 0 ms | zero | 0.26 % | ok / ok / ok / ok | yes |  |
| LSP Loudness Compensator Mono | lsp-plugins-lv2 | conditional — cost spikes far above its own median | 42.667 ms | high | 0.34 % | ok / ok / ok / ok | yes |  |
| LSP Loudness Compensator Stereo | lsp-plugins-lv2 | conditional — its latency changes with its own controls | 42.667 ms | high | 0.42 % | ok / ok / ok / ok | yes |  |
| Lookahead limiter | lv2-swh-plugins | conditional — its latency changes with its own controls | 1000.500 ms | high | 0.07 % | ok / ok / ok / ok | yes |  |
| ADClip7 | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.74 % | ok / ok / ok / dies | no | Extra — loudness clipper, superseded by ADClip8 and three times its cost. |
| ADClip8 | lv2-airwindows | unknown — not soaked at every rate | 0.010 ms | low | 0.21 % | ok / ok / dies / ok | no | Extra — loudness clipper with a one-frame delay. |
| BitShiftGain | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.03 % | dies / ok / ok / ok | no | Extra — exact 6 dB-step gain utility, proven bit-exact. |
| BitShiftPan | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.03 % | dies / ok / ok / ok | no | Extra — bit-shift pan/gain utility. |
| CS10QM-SC | lv2-eq10q | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.15 % | ok / ok / ok / ok | no |  |
| CS10QS-SC | lv2-eq10q | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.17 % | ok / ok / ok / ok | no |  |
| Calf Gate | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.11 % | ok / ok / blast / blast | no |  |
| Calf Multiband Compressor | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 2.15 % | ok / ok / blast / blast | no |  |
| Calf Multiband Gate | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 2.01 % | blast / blast / blast / blast | no |  |
| Calf Sidechain Compressor | lv2-calf-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.24 % | ok / ok / ok / ok | no |  |
| Calf Sidechain Gate | lv2-calf-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.13 % | ok / ok / ok / ok | no |  |
| Calf Transient Designer | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.34 % | ok / ok / blast / blast | no |  |
| EveryTrim | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.18 % | dies / ok / ok / ok | no | Extra — per-leg/M/S trim utility, proven exact (+6.000 dB on L, R untouched). |
| Gate | lv2-swh-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.07 % | ok / ok / dies / ok | no |  |
| GxExpander | lv2-guitarix-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.11 % | ok / ok / ok / dies | no |  |
| GxRedeye Big Chump | lv2-guitarix-plugins | unknown — stability never measured | 0.073 ms | low | 0.94 % | — / — / — / — | no |  |
| GxRedeye Chump | lv2-guitarix-plugins | unknown — stability never measured | 0.063 ms | low | 0.67 % | — / — / — / — | no |  |
| GxRedeye Vibro Chump | lv2-guitarix-plugins | unknown — stability never measured | 0.177 ms | low | 1.29 % | — / — / — / — | no |  |
| Gxjcm800pre | lv2-guitarix-plugins | unknown — stability never measured | — | unknown | 2.62 % | — / — / — / — | no |  |
| Gxjcm800preST | lv2-guitarix-plugins | unknown — stability never measured | — | unknown | 2.64 % | — / — / — / — | no |  |
| LSP Autogain Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.32 % | ok / ok / ok / ok | no |  |
| LSP Compressor LeftRight | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |  |
| LSP Compressor MidSide | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.12 % | ok / ok / ok / ok | no |  |
| LSP Compressor Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |  |
| LSP Compressor Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.12 % | ok / ok / ok / ok | no |  |
| LSP Dynamics Processor LeftRight | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.20 % | ok / ok / ok / ok | no |  |
| LSP Dynamics Processor MidSide | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.20 % | ok / ok / ok / ok | no |  |
| LSP Dynamics Processor Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |  |
| LSP Dynamics Processor Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.19 % | ok / ok / ok / ok | no |  |
| LSP Expander LeftRight | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |  |
| LSP Expander MidSide | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |  |
| LSP Expander Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |  |
| LSP Expander Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |  |
| LSP GOTT Compressor MidSide | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 5.000 ms | low | 2.41 % | ok / ok / ok / ok | no |  |
| LSP GOTT Compressor Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 5.000 ms | low | 1.34 % | ok / ok / ok / ok | no |  |
| LSP GOTT Compressor Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 5.000 ms | low | 2.41 % | ok / ok / ok / ok | no |  |
| LSP Gate LeftRight | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.10 % | ok / ok / ok / ok | no |  |
| LSP Gate MidSide | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |  |
| LSP Gate Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |  |
| LSP Gate Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.10 % | ok / ok / ok / ok | no |  |
| LSP Limiter Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 5.000 ms | low | 0.06 % | ok / ok / ok / ok | no |  |
| LSP Limiter Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 5.000 ms | low | 0.10 % | ok / ok / ok / ok | no |  |
| LSP Multiband Compressor Mono x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 1.53 % | ok / ok / ok / ok | no |  |
| LSP Multiband Compressor Stereo x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 2.90 % | ok / ok / ok / ok | no |  |
| LSP Multiband Dynamics Processor Mono x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 1.74 % | ok / ok / ok / ok | no |  |
| LSP Multiband Expander LeftRight x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 2.86 % | ok / ok / ok / ok | no |  |
| LSP Multiband Expander MidSide x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 2.86 % | ok / ok / ok / ok | no |  |
| LSP Multiband Expander Mono x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 1.52 % | ok / ok / ok / ok | no |  |
| LSP Multiband Expander Stereo x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 2.85 % | ok / ok / ok / ok | no |  |
| LSP Multiband Gate LeftRight x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 2.91 % | ok / ok / ok / ok | no |  |
| LSP Multiband Gate Mono x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 1.53 % | ok / ok / ok / ok | no |  |
| LSP Multiband Limiter Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 10.000 ms | low | 0.86 % | ok / ok / ok / ok | no |  |
| LSP Multiband Ring Modulated Sidechain Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.77 % | ok / ok / ok / ok | no |  |
| LSP Ring Modulated Sidechain Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |  |
| LSP Ring Modulated Sidechain Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.08 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Autogain Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.33 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Compressor LeftRight | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.12 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Compressor MidSide | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.12 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Compressor Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Compressor Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.12 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Dynamics Processor LeftRight | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.20 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Dynamics Processor MidSide | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.20 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Dynamics Processor Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Dynamics Processor Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.19 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Expander LeftRight | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Expander MidSide | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Expander Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Expander Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |  |
| LSP Sidechain GOTT Compressor LeftRight | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 5.000 ms | low | 2.41 % | ok / ok / ok / ok | no |  |
| LSP Sidechain GOTT Compressor MidSide | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 5.000 ms | low | 2.42 % | ok / ok / ok / ok | no |  |
| LSP Sidechain GOTT Compressor Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 5.000 ms | low | 1.33 % | ok / ok / ok / ok | no |  |
| LSP Sidechain GOTT Compressor Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 5.000 ms | low | 2.42 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Gate LeftRight | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.10 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Gate MidSide | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Gate Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Gate Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.10 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Limiter Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 5.000 ms | low | 0.06 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Limiter Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 5.000 ms | low | 0.10 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Compressor Mono x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 1.59 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Dynamics Processor Mono x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 1.77 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Expander Mono x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 1.57 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Gate Mono x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 1.57 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Limiter Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 10.000 ms | low | 0.85 % | ok / ok / ok / ok | no |  |
| MDA Loudness | lv2-mdala-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.04 % | dies / ok / ok / ok | no |  |
| PurestFade | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.07 % | dies / dies / ok / ok | no | Extra — fade utility. |
| PurestGain | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.07 % | dies / dies / ok / ok | no | Extra — dB gain utility, proven exact to float precision (+6.000 dB). |
| SC2 | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | — | unknown | 0.04 % | ok / ok / ok / ok | no |  |
| SC3 | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | — | unknown | 0.04 % | ok / ok / ok / ok | no |  |
| ZL_Compressor | lv2-zl-compressor | unknown — stability never measured | 0 ms | zero | 0.17 % | — / — / — / — | no | Extra, not a default. |
| ZamComp | lv2-zam-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.08 % | ok / ok / ok / ok | no |  |
| ZamCompX2 | lv2-zam-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.13 % | ok / ok / ok / ok | no |  |
| ZamGate | lv2-zam-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.39 % | ok / ok / ok / ok | no |  |
| ZamGateX2 | lv2-zam-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.61 % | ok / ok / ok / ok | no |  |
| dRowAudio Tremolo | DISTRHO-Ports | unknown — not yet racked and unracked a thousand times | 0 ms | zero | — | ok / ok / ok / ok | no |  |
| Calf Limiter | lv2-calf-plugins | unsuitable — allocates, locks or calls the system inside the audio callback | 4.990 ms | low | 0.26 % | ok / ok / ok / ok | no |  |
| Calf Multiband Limiter | lv2-calf-plugins | unsuitable — allocates, locks or calls the system inside the audio callback | 7.979 ms | low | 2.71 % | ok / ok / ok / ok | no |  |
| Calf Sidechain Limiter | lv2-calf-plugins | unsuitable — allocates, locks or calls the system inside the audio callback | 7.979 ms | low | 2.91 % | ok / ok / ok / ok | no |  |
| LSP Autogain Stereo | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.57 % | ok / ok / ok / ok | no |  |
| LSP Beat Breather Mono | lsp-plugins-lv2 | unsuitable — costs more of a core than one insert may | 278.604 ms | high | 2.23 % | ok / ok / ok / dies | no |  |
| LSP Beat Breather Stereo | lsp-plugins-lv2 | unsuitable — costs more of a core than one insert may | 278.604 ms | high | 2.86 % | ok / ok / dies / dies | no |  |
| LSP GOTT Compressor LeftRight | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 5.000 ms | low | 2.46 % | ok / ok / ok / ok | no |  |
| LSP Multiband Clipper Mono | lsp-plugins-lv2 | unsuitable — costs more of a core than one insert may | 122.760 ms | high | 1.86 % | ok / ok / ok / ok | yes |  |
| LSP Multiband Clipper Stereo | lsp-plugins-lv2 | unsuitable — costs more of a core than one insert may | 122.760 ms | high | 2.62 % | ok / ok / ok / ok | yes |  |
| LSP Multiband Compressor LeftRight x8 | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 2.87 % | ok / ok / ok / ok | no |  |
| LSP Multiband Compressor MidSide x8 | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 2.86 % | ok / ok / ok / ok | no |  |
| LSP Multiband Dynamics Processor LeftRight x8 | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 3.31 % | ok / ok / ok / ok | no |  |
| LSP Multiband Dynamics Processor MidSide x8 | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 3.30 % | ok / ok / ok / ok | no |  |
| LSP Multiband Dynamics Processor Stereo x8 | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 3.24 % | ok / ok / ok / ok | no |  |
| LSP Multiband Gate MidSide x8 | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 2.91 % | ok / ok / ok / ok | no |  |
| LSP Multiband Gate Stereo x8 | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 2.91 % | ok / ok / ok / ok | no |  |
| LSP Multiband Limiter Stereo | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 10.000 ms | low | 1.44 % | ok / ok / ok / ok | no |  |
| LSP Multiband Ring Modulated Sidechain Stereo | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 1.14 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Autogain Stereo | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.57 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Compressor LeftRight x8 | lsp-plugins-lv2 | unsuitable — costs more of a core than one insert may | 0 ms | zero | 2.95 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Compressor MidSide x8 | lsp-plugins-lv2 | unsuitable — costs more of a core than one insert may | 0 ms | zero | 2.99 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Compressor Stereo x8 | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 2.94 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Dynamics Processor LeftRight x8 | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 3.33 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Dynamics Processor MidSide x8 | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 3.34 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Dynamics Processor Stereo x8 | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 3.31 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Expander LeftRight x8 | lsp-plugins-lv2 | unsuitable — costs more of a core than one insert may | 0 ms | zero | 2.93 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Expander MidSide x8 | lsp-plugins-lv2 | unsuitable — costs more of a core than one insert may | 0 ms | zero | 2.94 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Expander Stereo x8 | lsp-plugins-lv2 | unsuitable — costs more of a core than one insert may | 0 ms | zero | 3.00 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Gate LeftRight x8 | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 2.95 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Gate MidSide x8 | lsp-plugins-lv2 | unsuitable — costs more of a core than one insert may | 0 ms | zero | 2.98 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Gate Stereo x8 | lsp-plugins-lv2 | unsuitable — costs more of a core than one insert may | 0 ms | zero | 2.93 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Multiband Limiter Stereo | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 10.000 ms | low | 1.41 % | ok / ok / ok / ok | no |  |
| LSP Trigger MIDI Mono | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes |  |
| LSP Trigger MIDI Stereo | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.08 % | ok / ok / ok / ok | yes |  |
| Roth-AIR | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | — | dies / dies / dies / dies | no |  |
| ZaMaximX2 | lv2-zam-plugins | unsuitable — costs more of a core than one insert may | 5.000 ms | low | 8.72 % | ok / ok / dies / dies | no |  |
`,xe=`# Equalisers

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

70 plugins, 28 of them cleared to run on
the console's own audio thread. Figures are at 96 kHz; the columns are explained on
[the catalog index](index.md). Sorted by hosting verdict, then by name.

2 of them declare no LV2 category at all and are filed here from their own
name or description — our reading, not the plugin's claim.

| Plugin | Package | Host | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Certified | Note |
|:---|:---|:---|---:|:---|---:|:---|:---|:---|
| Air | lv2-airwindows | suitable | 0 ms | zero | 0.25 % | ok / ok / ok / ok | yes | Extra — the original Air treble enhancer, superseded by Air3/Air4. |
| Air2 | lv2-airwindows | suitable | 0 ms | zero | 0.23 % | ok / ok / ok / ok | yes | NOT recommended and demoted to unclassified: SILENT at its LV2 defaults. |
| Air3 | lv2-airwindows | suitable | 0 ms | zero | 0.24 % | ok / ok / ok / ok | yes | Extra — air-band enhancer. |
| Air4 | lv2-airwindows | suitable | 0 ms | zero | 0.32 % | ok / ok / ok / ok | yes | Extra — the current air-band enhancer. |
| BassKit | lv2-airwindows | suitable | 0 ms | zero | 0.57 % | ok / ok / ok / ok | yes | Extra — bass sub/drive kit (amp-sim family). |
| Baxandall | lv2-airwindows | suitable | 0 ms | zero | 0.34 % | ok / ok / ok / ok | yes | Recommended — two-knob Baxandall tone control from the author's starter kit; ±12 dB shelves measured to do what they say. |
| C* Eq4p - 4-band parametric equaliser | caps-lv2 | suitable | 0.031 ms | low | 0.07 % | ok / ok / ok / ok | yes | Verified at 192 kHz, 2026-09-05. |
| C* EqFA4p - 4-band parametric shelving equalizer | caps-lv2 | suitable | 0.031 ms | low | 0.07 % | ok / ok / ok / ok | yes | Verified at 192 kHz, 2026-09-05. |
| DJ EQ | lv2-swh-plugins | suitable | 0 ms | zero | 0.08 % | ok / ok / ok / ok | yes |  |
| DJ EQ (mono) | lv2-swh-plugins | suitable | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes |  |
| EQ10Q Mono | lv2-eq10q | suitable | 0 ms | zero | 0.28 % | ok / ok / ok / ok | yes |  |
| EQ10Q Stereo | lv2-eq10q | suitable | 0 ms | zero | 0.48 % | ok / ok / ok / ok | yes |  |
| EQ1Q Mono | lv2-eq10q | suitable | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes |  |
| EQ1Q Stereo | lv2-eq10q | suitable | 0 ms | zero | 0.09 % | ok / ok / ok / ok | yes |  |
| EQ4Q Mono | lv2-eq10q | suitable | 0 ms | zero | 0.11 % | ok / ok / ok / ok | yes |  |
| EQ4Q Stereo | lv2-eq10q | suitable | 0 ms | zero | 0.19 % | ok / ok / ok / ok | yes |  |
| EQ6Q Mono | lv2-eq10q | suitable | 0 ms | zero | 0.16 % | ok / ok / ok / ok | yes |  |
| EQ6Q Stereo | lv2-eq10q | suitable | 0 ms | zero | 0.27 % | ok / ok / ok / ok | yes |  |
| GxBarkGraphicEQ | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.77 % | ok / ok / ok / ok | yes |  |
| GxGraphicEQ | lv2-guitarix-plugins | suitable | 0 ms | zero | 1.05 % | ok / ok / ok / ok | yes |  |
| GxHF_Brightener | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.06 % | ok / ok / ok / ok | yes |  |
| Hull2 | lv2-airwindows | suitable | 0 ms | zero | 0.37 % | ok / ok / ok / ok | yes | Extra — research standout (named in the family standout URIs), not characterised here beyond the scan. |
| ResEQ | lv2-airwindows | suitable | 0 ms | zero | 0.71 % | ok / ok / ok / ok | yes | Extra — resonant EQ v1; same feedback-risk family as ResEQ2 and three times its cost. |
| ResEQ2 | lv2-airwindows | suitable | 0 ms | zero | 0.20 % | ok / ok / ok / ok | yes | Not recommended — resonant boost EQ the author himself flags for live sound ('unless you like dial-a-feedback'). |
| Single band parametric | lv2-swh-plugins | suitable | 0 ms | zero | 0.06 % | ok / ok / ok / ok | yes |  |
| XNotch | lv2-airwindows | suitable | 0 ms | zero | 0.35 % | ok / ok / ok / ok | yes | Extra — distorted notch. |
| x42-eq - Parametric Equalizer Mono | lv2-x42-plugins | suitable | 0 ms | zero | 0.26 % | ok / ok / ok / ok | yes |  |
| x42-eq - Parametric Equalizer Stereo | lv2-x42-plugins | suitable | 0 ms | zero | 0.49 % | ok / ok / ok / ok | yes |  |
| LSP Filter Mono | lsp-plugins-lv2 | conditional — cost spikes far above its own median | 0 ms | zero | 0.45 % | ok / ok / ok / ok | yes |  |
| LSP Filter Stereo | lsp-plugins-lv2 | conditional — cost spikes far above its own median | 0 ms | zero | 0.43 % | ok / ok / ok / ok | yes |  |
| C* Eq10 - 10-band equalizer | caps-lv2 | unknown — not soaked at every rate | 0 ms | zero | 0.08 % | dies / ok / ok / ok | no | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| C* Eq10X2 - 10-band equalizer | caps-lv2 | unknown — not soaked at every rate | 0 ms | zero | 0.14 % | dies / ok / ok / ok | no | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| Calf Equalizer 12 Band | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.22 % | ok / ok / blast / dies | no |  |
| Calf Equalizer 5 Band | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.13 % | ok / ok / blast / dies | no |  |
| Calf Equalizer 8 Band | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.15 % | ok / ok / blast / dies | no |  |
| EQ | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.19 % | dies / ok / ok / ok | no | Extra — three-band EQ with dB ranges; works but +12 dB treble drives a -6 dBFS sine to 6.8 % THD. |
| GxMuff | lv2-guitarix-plugins | unknown — not soaked at every rate | — | unknown | 0.25 % | ok / ok / ok / dies | no |  |
| LSP Graphic Equalizer x16 LeftRight | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 1.79 % | ok / ok / ok / ok | no |  |
| LSP Graphic Equalizer x16 MidSide | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 1.78 % | ok / ok / ok / ok | no |  |
| LSP Graphic Equalizer x16 Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 1.07 % | ok / ok / ok / ok | no |  |
| LSP Graphic Equalizer x16 Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 1.78 % | ok / ok / ok / ok | no |  |
| LSP Graphic Equalizer x32 Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 1.85 % | ok / ok / ok / ok | no |  |
| LSP Matcher Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 42.667 ms | high | 0.38 % | ok / ok / ok / ok | no |  |
| LSP Matcher Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 42.667 ms | high | 0.71 % | ok / ok / ok / ok | no |  |
| LSP Parametric Equalizer x16 LeftRight | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.42 % | ok / ok / ok / ok | no |  |
| LSP Parametric Equalizer x16 Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.39 % | ok / ok / ok / ok | no |  |
| LSP Parametric Equalizer x32 MidSide | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.50 % | ok / ok / ok / ok | no |  |
| LSP Parametric Equalizer x8 Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.45 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Matcher Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 42.667 ms | high | 0.50 % | ok / ok / ok / ok | no |  |
| LSP Sidechain Matcher Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 42.667 ms | high | 0.89 % | ok / ok / ok / ok | no |  |
| MDA MultiBand | lv2-mdala-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.06 % | dies / dies / ok / ok | no |  |
| Triple band parametric with shelves | lv2-swh-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.09 % | ok / ok / ok / dies | no |  |
| ZamDynamicEQ | lv2-zam-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.49 % | ok / ok / ok / ok | no |  |
| ZamEQ2 | lv2-zam-plugins | unknown — not soaked at every rate | — | unknown | — | dies / dies / dies / dies | no |  |
| ZamGEQ31 | lv2-zam-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.10 % | ok / ok / dies / dies | no |  |
| Calf Equalizer 30 Band | lv2-calf-plugins | unsuitable — costs more of a core than one insert may | 0 ms | zero | 3.40 % | ok / ok / blast / blast | no |  |
| EQinox | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.79 % | ok / ok / ok / ok | no |  |
| LSP Graphic Equalizer x32 LeftRight | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 3.28 % | ok / ok / ok / ok | no |  |
| LSP Graphic Equalizer x32 MidSide | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 3.26 % | ok / ok / ok / ok | no |  |
| LSP Graphic Equalizer x32 Stereo | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 3.34 % | ok / ok / ok / ok | no |  |
| LSP Parametric Equalizer x16 MidSide | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.48 % | ok / ok / ok / ok | no |  |
| LSP Parametric Equalizer x16 Stereo | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.47 % | ok / ok / ok / ok | no |  |
| LSP Parametric Equalizer x32 LeftRight | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.49 % | ok / ok / ok / ok | no |  |
| LSP Parametric Equalizer x32 Mono | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.40 % | ok / ok / ok / ok | no |  |
| LSP Parametric Equalizer x32 Stereo | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.42 % | ok / ok / ok / ok | no |  |
| LSP Parametric Equalizer x8 LeftRight | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.47 % | ok / ok / ok / ok | no |  |
| LSP Parametric Equalizer x8 MidSide | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.47 % | ok / ok / ok / ok | no |  |
| LSP Parametric Equalizer x8 Stereo | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.46 % | ok / ok / ok / ok | no |  |
| Luftikus | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.28 % | ok / ok / ok / ok | no |  |
| Multiband EQ | lv2-swh-plugins | unsuitable — allocates, locks or calls the system inside the audio callback | 3.927 ms | low | 0.15 % | ok / ok / ok / ok | no |  |
`,Te=`# Filters

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

51 plugins, 27 of them cleared to run on
the console's own audio thread. Figures are at 96 kHz; the columns are explained on
[the catalog index](index.md). Sorted by hosting verdict, then by name.

1 of them declare no LV2 category at all and are filed here from their own
name or description — our reading, not the plugin's claim.

| Plugin | Package | Host | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Certified | Note |
|:---|:---|:---|---:|:---|---:|:---|:---|:---|
| C* AutoFilter | caps-lv2 | suitable | 0 ms | zero | 0.09 % | ok / ok / ok / ok | yes | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| Capacitor | lv2-airwindows | suitable | 0 ms | zero | 0.24 % | ok / ok / ok / ok | yes | Extra — the original Capacitor lowpass/highpass; superseded by Capacitor2. |
| Capacitor2 | lv2-airwindows | suitable | 0 ms | zero | 0.26 % | ok / ok / ok / ok | yes | Recommended — the author's starter-kit filter (Capacitor with nonlinearity). |
| Comb Filter | lv2-swh-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| DC Offset Remover | lv2-swh-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| Distance2 | lv2-airwindows | suitable | 0 ms | zero | 0.40 % | ok / ok / ok / ok | yes | Not recommended — emits DC with no input: a constant -57.1 dBFS offset on pure silence at defaults, so an idle channel with it racked puts DC on the bus. |
| GxAutoWah | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.13 % | ok / ok / ok / ok | yes |  |
| GxHogsFoot | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| GxMole | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| GxRangeMaster | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes |  |
| GxWah | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| Hypersonic | lv2-airwindows | suitable | 0 ms | zero | 0.27 % | ok / ok / ok / ok | yes | Extra — ultrasonic lowpass that does NOTHING at 48 kHz (0.00 dB to 23 kHz); acts only at 96 k and above. |
| Infrasonic | lv2-airwindows | suitable | 0 ms | zero | 0.28 % | ok / ok / ok / ok | yes | Extra — steep subsonic highpass. |
| Karaoke | lv2-swh-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| MDA Vocoder | lv2-mdala-plugins | suitable | 0 ms | zero | 0.13 % | ok / ok / ok / ok | yes |  |
| PhaseNudge | lv2-airwindows | suitable | 0 ms | zero | 0.34 % | ok / ok / ok / ok | yes | Not recommended — at its DEFAULT (0.0) it is not an allpass: +1.6 dB at 10 kHz, +4.2 at 15 kHz, +8.6 dB at 20 kHz. |
| SideDull | lv2-airwindows | suitable | 0 ms | zero | 0.18 % | ok / ok / ok / ok | yes | Extra — side-channel lowpass utility. |
| Sidepass | lv2-airwindows | suitable | 0 ms | zero | 0.18 % | ok / ok / ok / ok | yes | Extra — side-channel highpass utility. |
| SlewOnly | lv2-airwindows | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes | Extra — mix-check tool that outputs only the slew component (+10.2 dB at defaults). |
| State Variable Filter | lv2-swh-plugins | suitable | 0 ms | zero | 0.21 % | ok / ok / ok / ok | yes |  |
| Ultrasonic | lv2-airwindows | suitable | 0 ms | zero | 0.28 % | ok / ok / ok / ok | yes | Extra — steep ultrasonic lowpass that acts at 48 k (-3 dB at 20 kHz, -62 dB at 22 kHz); a pre-nonlinearity tool with a 1-frame delay at 192 k. |
| UltrasonicLite | lv2-airwindows | suitable | 0 ms | zero | 0.19 % | ok / ok / ok / ok | yes | Extra — gentle ultrasonic lowpass (-1.2 dB at 20 kHz at 48 k). |
| UltrasonicMed | lv2-airwindows | suitable | 0 ms | zero | 0.20 % | ok / ok / ok / ok | yes | Extra — medium ultrasonic lowpass (-4.2 dB at 20 kHz at 48 k). |
| Wolfbot | lv2-airwindows | suitable | 0 ms | zero | 0.47 % | ok / ok / ok / ok | yes | Extra — bass-synth-ish distortion oddity, -6.2 dB at defaults. |
| XBandpass | lv2-airwindows | suitable | 0 ms | zero | 0.27 % | ok / ok / ok / ok | yes | Extra — 'distorted digital' bandpass, -12.4 dB at defaults. |
| XLowpass | lv2-airwindows | suitable | 0 ms | zero | 0.28 % | ok / ok / ok / ok | yes | Extra — distorted lowpass, -13.2 dB at defaults. |
| XRegion | lv2-airwindows | suitable | 0 ms | zero | 0.35 % | ok / ok / ok / ok | yes | Extra — distorted region filter, -13.1 dB at defaults. |
| 4 x 4 pole allpass | lv2-swh-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.11 % | dies / dies / blast / ok | no |  |
| Calf Emphasis | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.28 % | ok / ok / ok / blast | no |  |
| Calf Envelope Filter | lv2-calf-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.71 % | ok / ok / ok / ok | no |  |
| Calf Filter | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.16 % | ok / ok / blast / blast | no |  |
| Calf Filterclavier | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.16 % | ok / ok / ok / blast | no |  |
| Comb Splitter | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |  |
| GLAME Butterworth Highpass | lv2-swh-plugins | unknown — stability never measured | 0 ms | zero | 0.06 % | — / — / — / — | no |  |
| GLAME Butterworth Lowpass | lv2-swh-plugins | unknown — stability never measured | 0 ms | zero | 0.06 % | — / — / — / — | no | GLAME Butterworth Lowpass — measured ~98.81 ms round-trip. |
| Glame Bandpass Analog Filter | lv2-swh-plugins | unknown — stability never measured | 0 ms | zero | 0.06 % | — / — / — / — | no |  |
| Glame Bandpass Filter | lv2-swh-plugins | unknown — stability never measured | 0 ms | zero | 0.09 % | — / — / — / — | no |  |
| Glame Butterworth X-over Filter | lv2-swh-plugins | unknown — stability never measured | 0 ms | zero | 0.07 % | — / — / — / — | no | Glame Butterworth X-over Filter — measured ~98.81 ms round-trip, same family/cause as buttlow_iir above. |
| Glame Highpass Filter | lv2-swh-plugins | unknown — stability never measured | 0 ms | zero | 0.07 % | — / — / — / — | no |  |
| Glame Lowpass Filter | lv2-swh-plugins | unknown — stability never measured | 0 ms | zero | 0.07 % | — / — / — / — | no |  |
| Hermes Filter | lv2-swh-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.28 % | dies / dies / dies / ok | no |  |
| LS Filter | lv2-swh-plugins | unknown — not soaked at every rate | — | unknown | 0.10 % | ok / ok / dies / dies | no |  |
| MDA RezFilter | lv2-mdala-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.10 % | dies / dies / dies / dies | no |  |
| MDA TalkBox | lv2-mdala-plugins | unknown — latency never measured | — | unknown | 0.28 % | ok / ok / ok / ok | yes |  |
| SubsOnly | lv2-airwindows | unknown — reports a latency it does not keep | 3.906 ms | low | 0.64 % | ok / ok / ok / ok | yes | Not recommended — mix-check tool that passes only the subs (rejects 1 kHz by 41.7 dB), 3.7 ms of group delay with no latency port, and a 61x denormal cost blow-up in silence unless the host sets FTZ/DAZ (mod-host does). |
| Bankstown | lv2-bankstown | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.21 % | ok / ok / ok / ok | no |  |
| Calf Vocoder | lv2-calf-plugins | unsuitable — costs more of a core than one insert may | — | unknown | 2.86 % | ok / ok / ok / ok | no |  |
| Gx Tape Stereo | lv2-guitarix-plugins | unsuitable — costs more of a core than one insert may | 0.010 ms | low | 5.65 % | ok / ok / ok / dies | no |  |
| GxTape | lv2-guitarix-plugins | unsuitable — costs more of a core than one insert may | 0.010 ms | low | 2.88 % | ok / ok / ok / ok | yes |  |
| Tal-Filter | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | — | ok / ok / ok / ok | no |  |
| Tal-Filter-2 | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0.031 ms | low | 1.32 % | ok / ok / ok / ok | no |  |
`,Se=`# The plugin catalog

Every LV2 plugin the reference install carries, measured rather than described: latency and
CPU cost at 44.1, 48, 96 and 192 kHz, an allocation/lock/syscall trace of the audio callback
under a parameter sweep, a soak at all four rates and a thousand rack/unrack cycles. **The
console runs at 96 kHz, so every figure on this page is the 96 kHz figure** — a delay in
milliseconds is a different number at every rate, and quoting one rate is the only honest way
to print it. The pages are written from the measurement data itself, so an edit made here is
overwritten the next time the sweep runs.

## The columns

- **Latency at 96 kHz** — the delay the plugin adds to the signal, in milliseconds, measured
  at 96 kHz.
- **Class** — \`zero\` where the measurement found no delay at all, \`low\` where the delay is
  smaller than one buffer, \`high\` where it is one buffer or more, \`unknown\` where the
  measurement did not resolve. One buffer is the console's default 1024 frames at 96 kHz,
  10.67 ms: below it a plugin's delay disappears inside the buffering the desk already pays
  for, at or above it the plugin costs the path a whole extra period. These are the console's
  own thresholds, the same ones the plugin picker's live-safe filter uses.
- **Cost at 96 kHz** — one instance's 95th-percentile share of one CPU core at 96 kHz.
  Multiply by the number of strips you intend to run it on.
- **44.1 / 48 / 96 / 192** — what happened at each sample rate: \`ok\`, \`dies\` where the plugin
  went silent or produced non-finite samples at that rate, \`blast\` where it opened with a
  burst of level before settling, \`—\` where it would not instantiate.
- **In the picker** — whether the console offers it in the plugin picker today. The picker
  serves a curated palette; the rest of this catalog is what the reference install carries.
- **Certified** (on the per-kind pages) — \`yes\` when the soak came back clean at all four
  rates *and* the plugin survived a thousand rack/unrack cycles.
- **Host** (on the per-kind pages) — \`suitable\`, \`conditional\`, \`unknown\` or \`unsuitable\`,
  with the measurement that decided it; [what these mean](recommendations.md#what-suitable-means).

See [plugins, the rack and skins](../plugins.md) for how inserts work on a strip, and
[the recommendations](recommendations.md) for the short lists.

## Runs on the console's own audio thread

These 368 plugins have earned a place inside the mixing engine itself, with no
separate host process between them and the mix: no allocation, lock or system call anywhere in
the audio callback, a clean soak at every rate, and a thousand rack/unrack cycles without a
fault. That saves a buffer in and a buffer out per insert — at 96 kHz, milliseconds an
engineer can hear. Every one of them is certified on both counts, which is what earned the
place, so the certified column is on the per-kind pages rather than repeated here. Sorted by
latency, cheapest first, within each kind.

### Equalisers (28)

| Plugin | Package | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | In the picker |
|:---|:---|---:|:---|---:|:---|:---|
| Air | lv2-airwindows | 0 ms | zero | 0.25 % | ok / ok / ok / ok | no |
| Air2 | lv2-airwindows | 0 ms | zero | 0.23 % | ok / ok / ok / ok | no |
| Air3 | lv2-airwindows | 0 ms | zero | 0.24 % | ok / ok / ok / ok | no |
| Air4 | lv2-airwindows | 0 ms | zero | 0.32 % | ok / ok / ok / ok | no |
| BassKit | lv2-airwindows | 0 ms | zero | 0.57 % | ok / ok / ok / ok | no |
| Baxandall | lv2-airwindows | 0 ms | zero | 0.34 % | ok / ok / ok / ok | no |
| DJ EQ | lv2-swh-plugins | 0 ms | zero | 0.08 % | ok / ok / ok / ok | no |
| DJ EQ (mono) | lv2-swh-plugins | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |
| EQ10Q Mono | lv2-eq10q | 0 ms | zero | 0.28 % | ok / ok / ok / ok | no |
| EQ10Q Stereo | lv2-eq10q | 0 ms | zero | 0.48 % | ok / ok / ok / ok | no |
| EQ1Q Mono | lv2-eq10q | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |
| EQ1Q Stereo | lv2-eq10q | 0 ms | zero | 0.09 % | ok / ok / ok / ok | no |
| EQ4Q Mono | lv2-eq10q | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |
| EQ4Q Stereo | lv2-eq10q | 0 ms | zero | 0.19 % | ok / ok / ok / ok | no |
| EQ6Q Mono | lv2-eq10q | 0 ms | zero | 0.16 % | ok / ok / ok / ok | no |
| EQ6Q Stereo | lv2-eq10q | 0 ms | zero | 0.27 % | ok / ok / ok / ok | no |
| GxBarkGraphicEQ | lv2-guitarix-plugins | 0 ms | zero | 0.77 % | ok / ok / ok / ok | no |
| GxGraphicEQ | lv2-guitarix-plugins | 0 ms | zero | 1.05 % | ok / ok / ok / ok | no |
| GxHF_Brightener | lv2-guitarix-plugins | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |
| Hull2 | lv2-airwindows | 0 ms | zero | 0.37 % | ok / ok / ok / ok | no |
| ResEQ | lv2-airwindows | 0 ms | zero | 0.71 % | ok / ok / ok / ok | no |
| ResEQ2 | lv2-airwindows | 0 ms | zero | 0.20 % | ok / ok / ok / ok | no |
| Single band parametric | lv2-swh-plugins | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |
| XNotch | lv2-airwindows | 0 ms | zero | 0.35 % | ok / ok / ok / ok | no |
| x42-eq - Parametric Equalizer Mono | lv2-x42-plugins | 0 ms | zero | 0.26 % | ok / ok / ok / ok | yes |
| x42-eq - Parametric Equalizer Stereo | lv2-x42-plugins | 0 ms | zero | 0.49 % | ok / ok / ok / ok | yes |
| C* Eq4p - 4-band parametric equaliser | caps-lv2 | 0.031 ms | low | 0.07 % | ok / ok / ok / ok | no |
| C* EqFA4p - 4-band parametric shelving equalizer | caps-lv2 | 0.031 ms | low | 0.07 % | ok / ok / ok / ok | no |

### Filters (27)

| Plugin | Package | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | In the picker |
|:---|:---|---:|:---|---:|:---|:---|
| C* AutoFilter | caps-lv2 | 0 ms | zero | 0.09 % | ok / ok / ok / ok | no |
| Capacitor | lv2-airwindows | 0 ms | zero | 0.24 % | ok / ok / ok / ok | no |
| Capacitor2 | lv2-airwindows | 0 ms | zero | 0.26 % | ok / ok / ok / ok | no |
| Comb Filter | lv2-swh-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| DC Offset Remover | lv2-swh-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| Distance2 | lv2-airwindows | 0 ms | zero | 0.40 % | ok / ok / ok / ok | no |
| GxAutoWah | lv2-guitarix-plugins | 0 ms | zero | 0.13 % | ok / ok / ok / ok | no |
| GxHogsFoot | lv2-guitarix-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| GxMole | lv2-guitarix-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| GxRangeMaster | lv2-guitarix-plugins | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |
| GxWah | lv2-guitarix-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| Hypersonic | lv2-airwindows | 0 ms | zero | 0.27 % | ok / ok / ok / ok | no |
| Infrasonic | lv2-airwindows | 0 ms | zero | 0.28 % | ok / ok / ok / ok | no |
| Karaoke | lv2-swh-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| MDA Vocoder | lv2-mdala-plugins | 0 ms | zero | 0.13 % | ok / ok / ok / ok | no |
| PhaseNudge | lv2-airwindows | 0 ms | zero | 0.34 % | ok / ok / ok / ok | no |
| SideDull | lv2-airwindows | 0 ms | zero | 0.18 % | ok / ok / ok / ok | no |
| Sidepass | lv2-airwindows | 0 ms | zero | 0.18 % | ok / ok / ok / ok | no |
| SlewOnly | lv2-airwindows | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| State Variable Filter | lv2-swh-plugins | 0 ms | zero | 0.21 % | ok / ok / ok / ok | no |
| Ultrasonic | lv2-airwindows | 0 ms | zero | 0.28 % | ok / ok / ok / ok | no |
| UltrasonicLite | lv2-airwindows | 0 ms | zero | 0.19 % | ok / ok / ok / ok | no |
| UltrasonicMed | lv2-airwindows | 0 ms | zero | 0.20 % | ok / ok / ok / ok | no |
| Wolfbot | lv2-airwindows | 0 ms | zero | 0.47 % | ok / ok / ok / ok | no |
| XBandpass | lv2-airwindows | 0 ms | zero | 0.27 % | ok / ok / ok / ok | no |
| XLowpass | lv2-airwindows | 0 ms | zero | 0.28 % | ok / ok / ok / ok | no |
| XRegion | lv2-airwindows | 0 ms | zero | 0.35 % | ok / ok / ok / ok | no |

### Dynamics (57)

| Plugin | Package | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | In the picker |
|:---|:---|---:|:---|---:|:---|:---|
| A-Law Compressor | lv2-swh-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| Acceleration | lv2-airwindows | 0 ms | zero | 0.25 % | ok / ok / ok / ok | no |
| C* Compress - Mono compressor | caps-lv2 | 0 ms | zero | 0.31 % | ok / ok / ok / ok | no |
| C* CompressX2 - Stereo compressor | caps-lv2 | 0 ms | zero | 0.54 % | ok / ok / ok / ok | no |
| C* Spice | caps-lv2 | 0 ms | zero | 0.18 % | ok / ok / ok / ok | no |
| C* SpiceX2 | caps-lv2 | 0 ms | zero | 0.27 % | ok / ok / ok / ok | no |
| CS10QM | lv2-eq10q | 0 ms | zero | 0.15 % | ok / ok / ok / ok | no |
| CS10QS | lv2-eq10q | 0 ms | zero | 0.16 % | ok / ok / ok / ok | no |
| Compresaturator | lv2-airwindows | 0 ms | zero | 0.31 % | ok / ok / ok / ok | no |
| DeBess | lv2-airwindows | 0 ms | zero | 0.70 % | ok / ok / ok / ok | no |
| DrumSlam | lv2-airwindows | 0 ms | zero | 0.54 % | ok / ok / ok / ok | no |
| GT10QM | lv2-eq10q | 0 ms | zero | 0.09 % | ok / ok / ok / ok | yes |
| GT10QS | lv2-eq10q | 0 ms | zero | 0.10 % | ok / ok / ok / ok | no |
| GxCompressor | lv2-guitarix-plugins | 0 ms | zero | 0.16 % | ok / ok / ok / ok | no |
| GxMultiBandCompressor | lv2-guitarix-plugins | 0 ms | zero | 0.78 % | ok / ok / ok / ok | no |
| HermeTrim | lv2-airwindows | 0 ms | zero | 0.18 % | ok / ok / ok / ok | no |
| LSP Surge Filter Mono | lsp-plugins-lv2 | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |
| LSP Surge Filter Stereo | lsp-plugins-lv2 | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |
| LSP Trigger Mono | lsp-plugins-lv2 | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |
| LSP Trigger Stereo | lsp-plugins-lv2 | 0 ms | zero | 0.08 % | ok / ok / ok / ok | no |
| MDA De-ess | lv2-mdala-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| MDA Dynamics | lv2-mdala-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| MDA Limiter | lv2-mdala-plugins | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |
| MDA Splitter | lv2-mdala-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| MDA Transient | lv2-mdala-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| Overheads | lv2-airwindows | 0 ms | zero | 0.23 % | ok / ok / ok / ok | no |
| Point | lv2-airwindows | 0 ms | zero | 0.21 % | ok / ok / ok / ok | no |
| Pop | lv2-airwindows | 0 ms | zero | 0.54 % | ok / ok / ok / ok | no |
| Pressure6 | lv2-airwindows | 0 ms | zero | 0.33 % | ok / ok / ok / ok | no |
| Recurve | lv2-airwindows | 0 ms | zero | 0.35 % | ok / ok / ok / ok | no |
| SC1 | lv2-swh-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| SC4 | lv2-swh-plugins | 0 ms | zero | 0.13 % | ok / ok / ok / ok | no |
| SE4 | lv2-swh-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| Simple amplifier | lv2-swh-plugins | 0 ms | zero | 0.02 % | ok / ok / ok / ok | no |
| Sinew | lv2-airwindows | 0 ms | zero | 0.25 % | ok / ok / ok / ok | no |
| Transient mangler | lv2-swh-plugins | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |
| ZaMultiComp | lv2-zam-plugins | 0 ms | zero | 0.25 % | ok / ok / ok / ok | no |
| ZaMultiCompX2 | lv2-zam-plugins | 0 ms | zero | 0.39 % | ok / ok / ok / ok | no |
| ZamAutoSat | lv2-zam-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| abGate | lv2-abGate | 0 ms | zero | 0.02 % | ok / ok / ok / ok | yes |
| curve | lv2-airwindows | 0 ms | zero | 0.36 % | ok / ok / ok / ok | no |
| x42-comp - Dynamic Compressor Mono | lv2-x42-plugins | 0 ms | zero | 0.10 % | ok / ok / ok / ok | yes |
| x42-comp - Dynamic Compressor Stereo | lv2-x42-plugins | 0 ms | zero | 0.10 % | ok / ok / ok / ok | yes |
| μ-Law Compressor | lv2-swh-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| ClipOnly | lv2-airwindows | 0.010 ms | low | 0.04 % | ok / ok / ok / ok | no |
| ClipOnly2 | lv2-airwindows | 0.010 ms | low | 0.04 % | ok / ok / ok / ok | no |
| ClipSoftly | lv2-airwindows | 0.010 ms | low | 0.24 % | ok / ok / ok / ok | no |
| FinalClip | lv2-airwindows | 0.010 ms | low | 0.05 % | ok / ok / ok / ok | no |
| Pop2 | lv2-airwindows | 0.010 ms | low | 0.37 % | ok / ok / ok / ok | no |
| Pressure5 | lv2-airwindows | 0.010 ms | low | 0.33 % | ok / ok / ok / ok | yes |
| x42-dpl - Digital Peak Limiter Mono | lv2-x42-plugins | 1.333 ms | low | 0.06 % | ok / ok / ok / ok | yes |
| x42-dpl - Digital Peak Limiter Stereo | lv2-x42-plugins | 1.333 ms | low | 0.08 % | ok / ok / ok / ok | yes |
| Fast Lookahead limiter | lv2-swh-plugins | 5.000 ms | low | 0.06 % | ok / ok / ok / ok | no |
| Dyson compressor | lv2-swh-plugins | 10.406 ms | low | 0.92 % | ok / ok / ok / ok | no |
| LSP Clipper Mono | lsp-plugins-lv2 | 25.000 ms | high | 0.22 % | ok / ok / ok / ok | no |
| LSP Clipper Stereo | lsp-plugins-lv2 | 25.000 ms | high | 0.39 % | ok / ok / ok / ok | no |
| Lookahead limiter (fixed latency) | lv2-swh-plugins | 170.656 ms | high | 0.06 % | ok / ok / ok / ok | no |

### Reverb (22)

| Plugin | Package | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | In the picker |
|:---|:---|---:|:---|---:|:---|:---|
| BrightAmbience | lv2-airwindows | 0 ms | zero | 0.32 % | ok / ok / ok / ok | no |
| BrightAmbience2 | lv2-airwindows | 0 ms | zero | 0.46 % | ok / ok / ok / ok | no |
| C* PlateX2 - Stereo in/out Versatile plate reverb | caps-lv2 | 0 ms | zero | 0.28 % | ok / ok / ok / ok | no |
| GxMultiBandReverb | lv2-guitarix-plugins | 0 ms | zero | 0.80 % | ok / ok / ok / ok | no |
| GxReverb-Stereo | lv2-guitarix-plugins | 0 ms | zero | 0.25 % | ok / ok / ok / ok | no |
| GxZita_rev1-Stereo | lv2-guitarix-plugins | 0 ms | zero | 0.33 % | ok / ok / ok / ok | no |
| Gxroom_simulator | lv2-guitarix-plugins | 0 ms | zero | 0.29 % | ok / ok / ok / ok | no |
| Gxshimmizita | lv2-guitarix-plugins | 0 ms | zero | 0.86 % | ok / ok / ok / ok | no |
| LSP Impulse Responses Mono | lsp-plugins-lv2 | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| LSP Impulse Responses Stereo | lsp-plugins-lv2 | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| LSP Impulse Reverb Stereo | lsp-plugins-lv2 | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |
| MDA Ambience | lv2-mdala-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| MV | lv2-airwindows | 0 ms | zero | 0.54 % | ok / ok / ok / ok | no |
| PocketVerbs | lv2-airwindows | 0 ms | zero | 1.55 % | ok / ok / ok / ok | no |
| StarChild | lv2-airwindows | 0 ms | zero | 0.85 % | ok / ok / ok / ok | no |
| Verbity | lv2-airwindows | 0 ms | zero | 0.28 % | ok / ok / ok / ok | yes |
| kCosmos | lv2-airwindows | 0 ms | zero | 0.48 % | ok / ok / ok / ok | no |
| kGuitarHall2 | lv2-airwindows | 0 ms | zero | 0.40 % | ok / ok / ok / ok | no |
| kPlateA | lv2-airwindows | 0 ms | zero | 0.61 % | ok / ok / ok / ok | yes |
| kPlateB | lv2-airwindows | 0 ms | zero | 0.63 % | ok / ok / ok / ok | no |
| kPlateC | lv2-airwindows | 0 ms | zero | 0.62 % | ok / ok / ok / ok | no |
| kPlateD | lv2-airwindows | 0 ms | zero | 0.72 % | ok / ok / ok / ok | no |

### Delay (29)

| Plugin | Package | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | In the picker |
|:---|:---|---:|:---|---:|:---|:---|
| ADT | lv2-airwindows | 0 ms | zero | 0.38 % | ok / ok / ok / ok | no |
| Allpass delay line, noninterpolating | lv2-swh-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| Comb delay line, noninterpolating | lv2-swh-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| Doublelay | lv2-airwindows | 0 ms | zero | 0.42 % | ok / ok / ok / ok | no |
| GxDelay-Stereo | lv2-guitarix-plugins | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |
| GxEcho-Stereo | lv2-guitarix-plugins | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |
| GxMultiBandDelay | lv2-guitarix-plugins | 0 ms | zero | 0.59 % | ok / ok / ok / ok | no |
| GxMultiBandEcho | lv2-guitarix-plugins | 0 ms | zero | 0.54 % | ok / ok / ok / ok | no |
| GxReverseDelay | null | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| Gxdigital_delay | lv2-guitarix-plugins | 0 ms | zero | 0.17 % | ok / ok / ok / ok | no |
| Gxdigital_delay_st | lv2-guitarix-plugins | 0 ms | zero | 0.33 % | ok / ok / ok / ok | no |
| Gxduck_delay | lv2-guitarix-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| Gxduck_delay_st | lv2-guitarix-plugins | 0 ms | zero | 0.23 % | ok / ok / ok / ok | no |
| L/C/R Delay | lv2-swh-plugins | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |
| LSP Artistic Delay Stereo | lsp-plugins-lv2 | 0 ms | zero | 0.08 % | ok / ok / ok / ok | yes |
| LSP Delay Compensator Mono | lsp-plugins-lv2 | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |
| LSP Delay Compensator Stereo | lsp-plugins-lv2 | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| LSP Delay Compensator x2 Stereo | lsp-plugins-lv2 | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |
| LSP Slapback Delay Stereo | lsp-plugins-lv2 | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| MDA Delay | lv2-mdala-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| MDA DubDelay | lv2-mdala-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| SampleDelay | lv2-airwindows | 0 ms | zero | 0.19 % | ok / ok / ok / ok | no |
| Simple delay line, noninterpolating | lv2-swh-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| ZamGrains | lv2-zam-plugins | 0 ms | zero | 0.12 % | ok / ok / ok / ok | no |
| Allpass delay line, cubic spline interpolation | lv2-swh-plugins | 0.010 ms | low | 0.10 % | ok / ok / ok / ok | no |
| Comb delay line, cubic spline interpolation | lv2-swh-plugins | 0.010 ms | low | 0.10 % | ok / ok / ok / ok | no |
| Comb delay line, linear interpolation | lv2-swh-plugins | 0.010 ms | low | 0.06 % | ok / ok / ok / ok | no |
| Simple delay line, cubic spline interpolation | lv2-swh-plugins | 0.010 ms | low | 0.03 % | ok / ok / ok / ok | no |
| Simple delay line, linear interpolation | lv2-swh-plugins | 0.021 ms | low | 0.03 % | ok / ok / ok / ok | no |

### Modulation (20)

| Plugin | Package | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | In the picker |
|:---|:---|---:|:---|---:|:---|:---|
| Auto phaser | lv2-swh-plugins | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |
| C* PhaserII - Mono phaser modulated by a Lorenz fractal | caps-lv2 | 0 ms | zero | 0.20 % | ok / ok / ok / ok | no |
| DJ flanger | lv2-swh-plugins | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |
| Giant flange | lv2-swh-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| GxChorus-Stereo | lv2-guitarix-plugins | 0 ms | zero | 0.15 % | ok / ok / ok / ok | no |
| GxFlanger | lv2-guitarix-plugins | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |
| GxPhaser | lv2-guitarix-plugins | 0 ms | zero | 0.14 % | ok / ok / ok / ok | no |
| GxTremolo | lv2-guitarix-plugins | 0 ms | zero | 0.30 % | ok / ok / ok / ok | no |
| GxTubeVibrato | lv2-guitarix-plugins | 0 ms | zero | 0.56 % | ok / ok / ok / ok | no |
| GxWahwah | lv2-guitarix-plugins | 0 ms | zero | 0.09 % | ok / ok / ok / ok | no |
| Gxgcb_95 | lv2-guitarix-plugins | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |
| Gxswitched_tremolo | lv2-guitarix-plugins | 0 ms | zero | 0.13 % | ok / ok / ok / ok | no |
| LFO Phaser | lv2-swh-plugins | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |
| LSP Phaser Mono | lsp-plugins-lv2 | 0 ms | zero | 0.58 % | ok / ok / ok / ok | no |
| LSP Phaser Stereo | lsp-plugins-lv2 | 0 ms | zero | 1.10 % | ok / ok / ok / ok | no |
| MDA RingMod | lv2-mdala-plugins | 0 ms | zero | 0.15 % | ok / ok / ok / ok | no |
| MDA ThruZero | lv2-mdala-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| Ringmod with LFO | lv2-swh-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| Vibrato | lv2-airwindows | 0 ms | zero | 0.40 % | ok / ok / ok / ok | no |
| Retro Flanger | lv2-swh-plugins | 0.198 ms | low | 0.19 % | ok / ok / ok / ok | no |

### Saturation and amp simulation (101)

| Plugin | Package | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | In the picker |
|:---|:---|---:|:---|---:|:---|:---|
| Aliasing | lv2-swh-plugins | 0 ms | zero | 0.02 % | ok / ok / ok / ok | no |
| BassAmp | lv2-airwindows | 0 ms | zero | 1.17 % | ok / ok / ok / ok | no |
| BassUp | lv2-eq10q | 0 ms | zero | 0.12 % | ok / ok / ok / ok | no |
| BussColors4 | lv2-airwindows | 0 ms | zero | 0.50 % | ok / ok / ok / ok | no |
| C* CabinetIII - Idealised loudspeaker cabinet emulation | caps-lv2 | 0 ms | zero | 0.27 % | ok / ok / ok / ok | no |
| C* ToneStack - Tone stack emulation | caps-lv2 | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| Channel8 | lv2-airwindows | 0 ms | zero | 0.38 % | ok / ok / ok / ok | no |
| Channel9 | lv2-airwindows | 0 ms | zero | 0.44 % | ok / ok / ok / ok | no |
| Console6Buss | lv2-airwindows | 0 ms | zero | 0.19 % | ok / ok / ok / ok | no |
| Console6Channel | lv2-airwindows | 0 ms | zero | 0.19 % | ok / ok / ok / ok | no |
| Console7Buss | lv2-airwindows | 0 ms | zero | 0.40 % | ok / ok / ok / ok | no |
| Console7Channel | lv2-airwindows | 0 ms | zero | 0.52 % | ok / ok / ok / ok | no |
| Console8BussHype | lv2-airwindows | 0 ms | zero | 0.36 % | ok / ok / ok / ok | no |
| Console8BussIn | lv2-airwindows | 0 ms | zero | 0.30 % | ok / ok / ok / ok | no |
| Console8ChannelHype | lv2-airwindows | 0 ms | zero | 0.28 % | ok / ok / ok / ok | no |
| Console8ChannelOut | lv2-airwindows | 0 ms | zero | 0.34 % | ok / ok / ok / ok | no |
| Console8LiteBuss | lv2-airwindows | 0 ms | zero | 0.40 % | ok / ok / ok / ok | no |
| Console8LiteChannel | lv2-airwindows | 0 ms | zero | 0.39 % | ok / ok / ok / ok | no |
| Console8SubHype | lv2-airwindows | 0 ms | zero | 0.36 % | ok / ok / ok / ok | no |
| Console8SubOut | lv2-airwindows | 0 ms | zero | 0.35 % | ok / ok / ok / ok | no |
| ConsoleLABuss | lv2-airwindows | 0 ms | zero | 0.47 % | ok / ok / ok / ok | no |
| ConsoleLAChannel | lv2-airwindows | 0 ms | zero | 0.93 % | ok / ok / ok / ok | no |
| Creature | lv2-airwindows | 0 ms | zero | 0.55 % | ok / ok / ok / ok | no |
| Crossover distortion | lv2-swh-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| CrunchyGrooveWear | lv2-airwindows | 0 ms | zero | 0.65 % | ok / ok / ok / ok | no |
| Declipper | lv2-swh-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| Desk | lv2-airwindows | 0 ms | zero | 0.34 % | ok / ok / ok / ok | no |
| Diode Processor | lv2-swh-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| Drive | lv2-airwindows | 0 ms | zero | 0.20 % | ok / ok / ok / ok | no |
| Dyno | lv2-airwindows | 0 ms | zero | 0.39 % | ok / ok / ok / ok | no |
| EverySlew | lv2-airwindows | 0 ms | zero | 0.33 % | ok / ok / ok / ok | no |
| Facet | lv2-airwindows | 0 ms | zero | 0.19 % | ok / ok / ok / ok | no |
| Fast overdrive | lv2-swh-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| Focus | lv2-airwindows | 0 ms | zero | 0.44 % | ok / ok / ok / ok | no |
| Foldover distortion | lv2-swh-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| Fracture | lv2-airwindows | 0 ms | zero | 0.29 % | ok / ok / ok / ok | no |
| GoldenSlew | lv2-airwindows | 0 ms | zero | 0.26 % | ok / ok / ok / ok | no |
| Gx w20 | lv2-guitarix-plugins | 0 ms | zero | 0.54 % | ok / ok / ok / ok | no |
| GxBigMuffPi | lv2-guitarix-plugins | 0 ms | zero | 0.21 % | ok / ok / ok / ok | no |
| GxBoss DS1 | lv2-guitarix-plugins | 0 ms | zero | 0.39 % | ok / ok / ok / ok | no |
| GxColorSound Tonebender | lv2-guitarix-plugins | 0 ms | zero | 0.25 % | ok / ok / ok / ok | no |
| GxFuzzFaceJH2 | lv2-guitarix-plugins | 0 ms | zero | 0.32 % | ok / ok / ok / ok | no |
| GxHornet | lv2-guitarix-plugins | 0 ms | zero | 0.12 % | ok / ok / ok / ok | no |
| GxRat | lv2-guitarix-plugins | 0 ms | zero | 0.14 % | ok / ok / ok / ok | no |
| GxScreamingBird | lv2-guitarix-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| GxSustainer | lv2-guitarix-plugins | 0 ms | zero | 0.38 % | ok / ok / ok / ok | no |
| GxTubeScreamer | lv2-guitarix-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| Hard Limiter | lv2-swh-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| Hypersoft | lv2-airwindows | 0 ms | zero | 1.66 % | ok / ok / ok / ok | no |
| Inflamer | lv2-airwindows | 0 ms | zero | 0.67 % | ok / ok / ok / ok | no |
| Interstage | lv2-airwindows | 0 ms | zero | 0.20 % | ok / ok / ok / ok | no |
| LRConvolve | lv2-airwindows | 0 ms | zero | 0.18 % | ok / ok / ok / ok | no |
| MDA Combo | lv2-mdala-plugins | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |
| MDA Dither | lv2-mdala-plugins | 0 ms | zero | 0.12 % | ok / ok / ok / ok | no |
| MDA Leslie | lv2-mdala-plugins | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |
| MDA Overdrive | lv2-mdala-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| MDA SubSynth | lv2-mdala-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| Mojo | lv2-airwindows | 0 ms | zero | 0.43 % | ok / ok / ok / ok | no |
| PlatinumSlew | lv2-airwindows | 0 ms | zero | 0.33 % | ok / ok / ok / ok | no |
| Pointer cast distortion | lv2-swh-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| PowerSag | lv2-airwindows | 0 ms | zero | 0.28 % | ok / ok / ok / ok | no |
| PowerSag2 | lv2-airwindows | 0 ms | zero | 0.23 % | ok / ok / ok / ok | no |
| PurestConsole2Buss | lv2-airwindows | 0 ms | zero | 0.27 % | ok / ok / ok / ok | no |
| PurestConsole2Channel | lv2-airwindows | 0 ms | zero | 0.25 % | ok / ok / ok / ok | no |
| PurestConsole3Buss | lv2-airwindows | 0 ms | zero | 0.63 % | ok / ok / ok / ok | no |
| PurestConsole3Channel | lv2-airwindows | 0 ms | zero | 0.64 % | ok / ok / ok / ok | no |
| PurestConsoleBuss | lv2-airwindows | 0 ms | zero | 0.25 % | ok / ok / ok / ok | no |
| PurestConsoleChannel | lv2-airwindows | 0 ms | zero | 0.24 % | ok / ok / ok / ok | no |
| PurestDrive | lv2-airwindows | 0 ms | zero | 0.26 % | ok / ok / ok / ok | yes |
| PurestWarm2 | lv2-airwindows | 0 ms | zero | 0.24 % | ok / ok / ok / ok | no |
| ShortBuss | lv2-airwindows | 0 ms | zero | 0.28 % | ok / ok / ok / ok | no |
| Signal sifter | lv2-swh-plugins | 0 ms | zero | 0.10 % | ok / ok / ok / ok | no |
| Sinus wavewrapper | lv2-swh-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| Slew | lv2-airwindows | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| Spiral | lv2-airwindows | 0 ms | zero | 0.24 % | ok / ok / ok / ok | no |
| Spiral2 | lv2-airwindows | 0 ms | zero | 0.33 % | ok / ok / ok / ok | no |
| TapeHack | lv2-airwindows | 0 ms | zero | 0.24 % | ok / ok / ok / ok | no |
| ToTape5 | lv2-airwindows | 0 ms | zero | 0.94 % | ok / ok / ok / ok | no |
| TransDesk | lv2-airwindows | 0 ms | zero | 0.50 % | ok / ok / ok / ok | no |
| Tube | lv2-airwindows | 0 ms | zero | 0.22 % | ok / ok / ok / ok | no |
| Tube2 | lv2-airwindows | 0 ms | zero | 0.32 % | ok / ok / ok / ok | no |
| TubeDesk | lv2-airwindows | 0 ms | zero | 0.54 % | ok / ok / ok / ok | no |
| Valve rectifier | lv2-swh-plugins | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |
| Valve saturation | lv2-swh-plugins | 0 ms | zero | 0.12 % | ok / ok / ok / ok | yes |
| C* Saturate | caps-lv2 | 0.010 ms | low | 0.51 % | ok / ok / ok / ok | yes |
| Console8BussOut | lv2-airwindows | 0.010 ms | low | 0.29 % | ok / ok / ok / ok | no |
| Console8ChannelIn | lv2-airwindows | 0.021 ms | low | 0.24 % | ok / ok / ok / ok | no |
| Console8SubIn | lv2-airwindows | 0.021 ms | low | 0.30 % | ok / ok / ok / ok | no |
| IronOxideClassic2 | lv2-airwindows | 0.021 ms | low | 0.44 % | ok / ok / ok / ok | no |
| MidAmp | lv2-airwindows | 0.021 ms | low | 1.53 % | ok / ok / ok / ok | no |
| BigAmp | lv2-airwindows | 0.031 ms | low | 1.88 % | ok / ok / ok / ok | no |
| C* CabinetIV - Idealised loudspeaker cabinet emulation | caps-lv2 | 0.031 ms | low | 0.22 % | ok / ok / ok / ok | no |
| LilAmp | lv2-airwindows | 0.042 ms | low | 1.37 % | ok / ok / ok / ok | no |
| GrindAmp | lv2-airwindows | 0.052 ms | low | 1.97 % | ok / ok / ok / ok | no |
| FireAmp | lv2-airwindows | 0.063 ms | low | 1.57 % | ok / ok / ok / ok | no |
| LeadAmp | lv2-airwindows | 0.063 ms | low | 2.40 % | ok / ok / ok / ok | no |
| MDA Degrade | lv2-mdala-plugins | 0.135 ms | low | 0.05 % | ok / ok / ok / ok | no |
| Barry's Satan Maximiser | lv2-swh-plugins | 0.156 ms | low | 0.04 % | ok / ok / ok / ok | no |
| GxFuzz | lv2-guitarix-plugins | 0.250 ms | low | 0.61 % | ok / ok / ok / ok | no |
| ToTape6 | lv2-airwindows | 0.396 ms | low | 1.13 % | ok / ok / ok / ok | no |
| GxMXR Distortion | lv2-guitarix-plugins | — | unknown | 0.10 % | ok / ok / ok / ok | no |

### Pitch and spectral (8)

| Plugin | Package | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | In the picker |
|:---|:---|---:|:---|---:|:---|:---|
| AM pitchshifter | lv2-swh-plugins | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |
| GlitchShifter | lv2-airwindows | 0 ms | zero | 0.34 % | ok / ok / ok / ok | no |
| Gxoc_2 | lv2-guitarix-plugins | 0 ms | zero | 0.20 % | ok / ok / ok / ok | no |
| MDA Detune | lv2-mdala-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| MDA RePsycho! | lv2-mdala-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| MDA Tracker | lv2-mdala-plugins | 0 ms | zero | 0.15 % | ok / ok / ok / ok | no |
| MDA VocInput | lv2-mdala-plugins | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |
| PitchNasty | lv2-airwindows | 0 ms | zero | 0.24 % | ok / ok / ok / ok | no |

### Spatial (5)

| Plugin | Package | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | In the picker |
|:---|:---|---:|:---|---:|:---|:---|
| C* Narrower - Stereo image width reduction | caps-lv2 | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| MDA Image | lv2-mdala-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| MDA RoundPan | lv2-mdala-plugins | 0 ms | zero | 0.11 % | ok / ok / ok / ok | no |
| MDA Stereo | lv2-mdala-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| Stereo Balance Control | lv2-x42-plugins | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |

### Analysis and metering (34)

| Plugin | Package | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | In the picker |
|:---|:---|---:|:---|---:|:---|:---|
| 1/3 Octave Spectrum Display Mono | lv2-x42-plugins | 0 ms | zero | 1.53 % | ok / ok / ok / ok | no |
| 1/3 Octave Spectrum Display Stereo | lv2-x42-plugins | 0 ms | zero | 1.54 % | ok / ok / ok / ok | no |
| BBC M-6 | lv2-x42-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| BBC Meter (Mono) | lv2-x42-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| BBC Meter (Stereo) | lv2-x42-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| DIN Meter (Mono) | lv2-x42-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| DIN Meter (Stereo) | lv2-x42-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| DR-14 - Crest Factor Loudness Range Meter (Mono) | lv2-x42-plugins | 0 ms | zero | 0.43 % | ok / ok / ok / ok | no |
| DR-14 - Crest Factor Loudness Range Meter (Stereo) | lv2-x42-plugins | 0 ms | zero | 0.83 % | ok / ok / ok / ok | no |
| EBU Meter (Mono) | lv2-x42-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| EBU Meter (Stereo) | lv2-x42-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| K12/RMS Meter (Mono) | lv2-x42-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| K12/RMS Meter (Stereo) | lv2-x42-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| K14/RMS Meter (Mono) | lv2-x42-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| K14/RMS Meter (Stereo) | lv2-x42-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| K20/RMS Meter (Mono) | lv2-x42-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| K20/RMS Meter (Stereo) | lv2-x42-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| Nordic Meter (Mono) | lv2-x42-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| Nordic Meter (Stereo) | lv2-x42-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| Phase/Frequency Wheel | lv2-x42-plugins | 0 ms | zero | 0.02 % | ok / ok / ok / ok | no |
| Simple Scope (Mono) | lv2-x42-plugins | 0 ms | zero | 0.02 % | ok / ok / ok / ok | no |
| Simple Scope (Stereo) | lv2-x42-plugins | 0 ms | zero | 0.02 % | ok / ok / ok / ok | no |
| Spectr | lv2-x42-plugins | 0 ms | zero | 0.02 % | ok / ok / ok / ok | no |
| Stereo Phase Scope | lv2-x42-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| Stereo Phase-Correlation Meter | lv2-x42-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| Stereo/Frequency Scope | lv2-x42-plugins | 0 ms | zero | 0.02 % | ok / ok / ok / ok | no |
| True-Peak Meter (Mono) | lv2-x42-plugins | 0 ms | zero | 0.39 % | ok / ok / ok / ok | no |
| True-Peak Meter (Stereo) | lv2-x42-plugins | 0 ms | zero | 0.77 % | ok / ok / ok / ok | no |
| True-Peak and RMS Meter (Mono) | lv2-x42-plugins | 0 ms | zero | 0.41 % | ok / ok / ok / ok | no |
| True-Peak and RMS Meter (Stereo) | lv2-x42-plugins | 0 ms | zero | 0.79 % | ok / ok / ok / ok | no |
| VU Meter (Mono) | lv2-x42-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| VU Meter (Stereo) | lv2-x42-plugins | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |
| x42 Instrument Tuner | lv2-x42-plugins | 0 ms | zero | 0.75 % | ok / ok / ok / ok | no |
| x42 Instrument Tuner[Spectrum] | lv2-x42-plugins | 0 ms | zero | 0.74 % | ok / ok / ok / ok | no |

### Utility (24)

| Plugin | Package | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | In the picker |
|:---|:---|---:|:---|---:|:---|:---|
| Artificial latency | lv2-swh-plugins | 0 ms | zero | 0.02 % | ok / ok / ok / ok | no |
| Audio Gain (Mono) | lv2-carla | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| Audio Gain (Stereo) | lv2-carla | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| C* Noisegate - Attenuate noise resident in silence | caps-lv2 | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |
| DCVoltage | lv2-airwindows | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| EdIsDim | lv2-airwindows | 0 ms | zero | 0.18 % | ok / ok / ok / ok | no |
| Flipity | lv2-airwindows | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| Golem | lv2-airwindows | 0 ms | zero | 0.18 % | ok / ok / ok / ok | no |
| GxBooster | lv2-guitarix-plugins | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |
| Inverter | lv2-swh-plugins | 0 ms | zero | 0.02 % | ok / ok / ok / ok | no |
| LeftoMono | lv2-airwindows | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| MS2LR | lv2-eq10q | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| Matrix Spatialiser | lv2-swh-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| Matrix: MS to Stereo | lv2-swh-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| Matrix: Stereo to MS | lv2-swh-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| Mega Delay Line | lv2-x42-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| Micro Delay Line | lv2-x42-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| MidSide | lv2-airwindows | 0 ms | zero | 0.18 % | ok / ok / ok / ok | no |
| Monitoring | lv2-airwindows | 0 ms | zero | 0.37 % | ok / ok / ok / ok | no |
| No Delay Line | lv2-x42-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| Offset, sample-based | lv2-swh-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| Stereo Routing | lv2-x42-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| ZamPhono | lv2-zam-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| z-1 | lv2-swh-plugins | 0.010 ms | low | 0.02 % | ok / ok / ok / ok | no |

### Instruments and generators (10)

| Plugin | Package | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | In the picker |
|:---|:---|---:|:---|---:|:---|:---|
| Constant Signal Generator | lv2-swh-plugins | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |
| FM Oscillator | lv2-swh-plugins | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |
| Gong model | lv2-swh-plugins | 0 ms | zero | 0.24 % | ok / ok / ok / ok | no |
| Harmonic generator | lv2-swh-plugins | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |
| HighGlossDither | lv2-airwindows | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |
| LSP Oscillator Mono | lsp-plugins-lv2 | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| MDA BeatBox | lv2-mdala-plugins | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |
| TPDFDither | lv2-airwindows | 0 ms | zero | 0.09 % | ok / ok / ok / ok | no |
| RawGlitters | lv2-airwindows | 0.010 ms | low | 0.05 % | ok / ok / ok / ok | no |
| RawTimbers | lv2-airwindows | 0.010 ms | low | 0.05 % | ok / ok / ok / ok | no |

### Uncategorised (3)

| Plugin | Package | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | In the picker |
|:---|:---|---:|:---|---:|:---|:---|
| Acceleration2 | lv2-airwindows | 0 ms | zero | 0.25 % | ok / ok / ok / ok | no |
| Nikola | lv2-airwindows | 0 ms | zero | 0.21 % | ok / ok / ok / ok | no |
| Mastering | lv2-airwindows | 0.010 ms | low | 0.89 % | ok / ok / ok / ok | no |

## Hosted apart, with a caution

These 26 measured well enough to be worth naming, but one dimension came back
short, so they run in a host process of their own where a fault costs them and not the show.
The caution column names the dimension that decided it.

| Plugin | Package | Kind | Latency at 96 kHz | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Caution |
|:---|:---|:---|---:|---:|:---|:---|
| BrightAmbience3 | lv2-airwindows | Reverb | 0 ms | 0.29 % | ok / ok / ok / ok | its latency changes with its own controls |
| Calf Analyzer | lv2-calf-plugins | Analysis and metering | 0 ms | 0.08 % | ok / ok / ok / ok | wants MIDI in, which an insert never carries |
| Calf Compressor | lv2-calf-plugins | Dynamics | 0 ms | 0.22 % | ok / ok / ok / ok | wants MIDI in, which an insert never carries |
| Calf Deesser | lv2-calf-plugins | Dynamics | 0 ms | 0.17 % | ok / ok / ok / ok | wants MIDI in, which an insert never carries |
| Calf Mono Compressor | lv2-calf-plugins | Dynamics | 0 ms | 0.26 % | ok / ok / ok / ok | wants MIDI in, which an insert never carries |
| Calf Pitch Tools | lv2-calf-plugins | Pitch and spectral | 0 ms | 1.69 % | ok / ok / ok / ok | wants MIDI in, which an insert never carries |
| Calf Rotary Speaker | lv2-calf-plugins | Saturation and amp simulation | 0 ms | 0.39 % | ok / ok / ok / ok | wants MIDI in, which an insert never carries |
| Calf Saturator | lv2-calf-plugins | Saturation and amp simulation | 0 ms | 0.25 % | ok / ok / ok / ok | wants MIDI in, which an insert never carries |
| Calf Tape Simulator | lv2-calf-plugins | Saturation and amp simulation | 0 ms | 1.68 % | ok / ok / ok / ok | wants MIDI in, which an insert never carries |
| Classic Reverb RE-02 | lv2-classicreverb-re02 | Reverb (inferred from the name) | 0 ms | 0.46 % | ok / ok / ok / ok | its latency changes with its own controls |
| LSP Filter Mono | lsp-plugins-lv2 | Equalisers | 0 ms | 0.45 % | ok / ok / ok / ok | cost spikes far above its own median |
| LSP Filter Stereo | lsp-plugins-lv2 | Equalisers | 0 ms | 0.43 % | ok / ok / ok / ok | cost spikes far above its own median |
| LSP Flanger Mono | lsp-plugins-lv2 | Modulation | 0 ms | 0.16 % | ok / ok / ok / ok | its latency changes with its own controls |
| LSP Flanger Stereo | lsp-plugins-lv2 | Modulation | 0 ms | 0.29 % | ok / ok / ok / ok | its latency changes with its own controls |
| LSP Noise Generator x1 | lsp-plugins-lv2 | Utility | 0 ms | 0.47 % | ok / ok / ok / ok | cost spikes far above its own median |
| LSP Noise Generator x2 | lsp-plugins-lv2 | Utility | 0 ms | 0.51 % | ok / ok / ok / ok | cost spikes far above its own median |
| LSP Sampler Mono | lsp-plugins-lv2 | Instruments and generators | 0 ms | 0.05 % | ok / ok / ok / ok | wants MIDI in, which an insert never carries |
| LSP Sampler Stereo | lsp-plugins-lv2 | Instruments and generators | 0 ms | 0.06 % | ok / ok / ok / ok | wants MIDI in, which an insert never carries |
| Infinity2 | lv2-airwindows | Reverb | 12.604 ms | 0.53 % | ok / ok / ok / ok | its latency changes with its own controls |
| Infinity | lv2-airwindows | Reverb | 15.906 ms | 0.48 % | ok / ok / ok / ok | its latency changes with its own controls |
| x42-Autotune | lv2-x42-plugins | Pitch and spectral | 21.323 ms | 0.18 % | ok / ok / ok / ok | wants MIDI in, which an insert never carries |
| x42-Autotune (microtonal) | lv2-x42-plugins | Pitch and spectral | 21.323 ms | 0.18 % | ok / ok / ok / ok | wants MIDI in, which an insert never carries |
| x42-Autotune (scales) | lv2-x42-plugins | Pitch and spectral | 21.323 ms | 0.18 % | ok / ok / ok / ok | wants MIDI in, which an insert never carries |
| LSP Loudness Compensator Mono | lsp-plugins-lv2 | Dynamics | 42.667 ms | 0.34 % | ok / ok / ok / ok | cost spikes far above its own median |
| LSP Loudness Compensator Stereo | lsp-plugins-lv2 | Dynamics | 42.667 ms | 0.42 % | ok / ok / ok / ok | its latency changes with its own controls |
| Lookahead limiter | lv2-swh-plugins | Dynamics | 1000.500 ms | 0.07 % | ok / ok / ok / ok | its latency changes with its own controls |

## The full matrix

All 958 plugins, by kind. Each page lists every plugin of that kind whatever its
verdict, with the same columns plus the hosting verdict and the curator's note where there is
one.

- **[Equalisers](equalisers.md)** — 70 plugins, 28 on the audio thread.
- **[Filters](filters.md)** — 51 plugins, 27 on the audio thread.
- **[Dynamics](dynamics.md)** — 193 plugins, 57 on the audio thread.
- **[Reverb](reverb.md)** — 58 plugins, 22 on the audio thread.
- **[Delay](delay.md)** — 49 plugins, 29 on the audio thread.
- **[Modulation](modulation.md)** — 37 plugins, 20 on the audio thread.
- **[Saturation and amp simulation](saturation-and-amps.md)** — 140 plugins, 101 on the audio thread.
- **[Pitch and spectral](pitch-and-spectral.md)** — 31 plugins, 8 on the audio thread.
- **[Spatial](spatial.md)** — 14 plugins, 5 on the audio thread.
- **[Analysis and metering](analysis.md)** — 59 plugins, 34 on the audio thread.
- **[Utility](utility.md)** — 156 plugins, 24 on the audio thread.
- **[Instruments and generators](instruments.md)** — 57 plugins, 10 on the audio thread.
- **[MIDI](midi.md)** — 34 plugins, 0 on the audio thread.
- **[Uncategorised](uncategorised.md)** — 9 plugins, 3 on the audio thread.
`,Ae=`# Instruments and generators

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

57 plugins, 10 of them cleared to run on
the console's own audio thread. Figures are at 96 kHz; the columns are explained on
[the catalog index](index.md). Sorted by hosting verdict, then by name.

1 of them declare no LV2 category at all and are filed here from their own
name or description — our reading, not the plugin's claim.

| Plugin | Package | Host | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Certified | Note |
|:---|:---|:---|---:|:---|---:|:---|:---|:---|
| Constant Signal Generator | lv2-swh-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| FM Oscillator | lv2-swh-plugins | suitable | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes |  |
| Gong model | lv2-swh-plugins | suitable | 0 ms | zero | 0.24 % | ok / ok / ok / ok | yes |  |
| Harmonic generator | lv2-swh-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| HighGlossDither | lv2-airwindows | suitable | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes | Not recommended — word-length dither, pointless inside a float console; not an effect. |
| LSP Oscillator Mono | lsp-plugins-lv2 | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| MDA BeatBox | lv2-mdala-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| RawGlitters | lv2-airwindows | suitable | 0.010 ms | low | 0.05 % | ok / ok / ok / ok | yes | Not recommended — word-length dither with an unlabelled default (quantizer=2 has no scale point); pointless inside a float console, not an effect. |
| RawTimbers | lv2-airwindows | suitable | 0.010 ms | low | 0.05 % | ok / ok / ok / ok | yes | Not recommended — word-length dither with an unlabelled default; not an effect for a float console. |
| TPDFDither | lv2-airwindows | suitable | 0 ms | zero | 0.09 % | ok / ok / ok / ok | yes | Not recommended — TPDF dither, proven correct (16-bit grid, -93 dBFS noise) but pointless inside a float console and its default quantizer=2 has no scale-point label. |
| LSP Sampler Mono | lsp-plugins-lv2 | conditional — wants MIDI in, which an insert never carries | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| LSP Sampler Stereo | lsp-plugins-lv2 | conditional — wants MIDI in, which an insert never carries | 0 ms | zero | 0.06 % | ok / ok / ok / ok | yes |  |
| Audio Divider (Suboctave Generator) | lv2-swh-plugins | unknown — latency never measured | — | unknown | 0.03 % | ok / ok / ok / ok | yes |  |
| Gong beater | lv2-swh-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.05 % | dies / ok / ok / ok | no |  |
| LSP Multi-Sampler x12 DirectOut | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.43 % | ok / ok / ok / ok | no |  |
| LSP Multi-Sampler x12 Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.38 % | ok / ok / ok / ok | no |  |
| LSP Multi-Sampler x24 DirectOut | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.81 % | ok / ok / ok / ok | no |  |
| LSP Multi-Sampler x24 Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.73 % | ok / ok / ok / ok | no |  |
| MDA Shepard | lv2-mdala-plugins | unknown — latency never measured | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| MDA TestTone | lv2-mdala-plugins | unknown — latency never measured | 0 ms | zero | 0.15 % | ok / ok / ok / ok | yes |  |
| Wave Terrain Oscillator | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | — | unknown | 0.03 % | ok / ok / ok / ok | no |  |
| drumkv1 | lv2-drumkv1 | unknown — stability never measured | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |  |
| samplv1 | lv2-samplv1 | unknown — stability never measured | 0 ms | zero | 0.03 % | — / — / — / — | no |  |
| synthv1 | lv2-synthv1 | unknown — stability never measured | 0 ms | zero | 0.03 % | — / — / — / — | no |  |
| Analogue Oscillator | lv2-swh-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / dies | no |  |
| C* CEO - Chief Executive Oscillator | caps-lv2 | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| C* Fractal - Audio stream from deterministic chaos | caps-lv2 | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| C* Sin - Sine wave generator | caps-lv2 | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| C* White - White noise generator | caps-lv2 | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| Calf Fluidsynth | lv2-calf-plugins | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | — | ok / ok / ok / ok | no |  |
| Calf Monosynth | lv2-calf-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Calf Organ | lv2-calf-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Calf Wavetable | lv2-calf-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Dexed | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | — | ok / ok / ok / ok | no |  |
| DrumSynth | DISTRHO-Ports | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Fabla | lv2-fabla | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| JuceOPL | DISTRHO-Ports | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| LSP Multi-Sampler x48 DirectOut | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 1.83 % | ok / ok / ok / ok | no |  |
| LSP Multi-Sampler x48 Stereo | lsp-plugins-lv2 | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 1.52 % | ok / ok / ok / ok | no |  |
| MDA DX10 | lv2-mdala-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MDA JX10 | lv2-mdala-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MDA Piano | lv2-mdala-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MDA ePiano | lv2-mdala-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Newtonator (Instr.) | lv2-newtonator | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Noize Mak3r | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | — | ok / ok / ok / ok | no |  |
| Non-bandlimited single-sample impulses | lv2-swh-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Obxd | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | — | ok / ok / ok / ok | no |  |
| Rudolf 556 | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Sine + cosine oscillator | lv2-swh-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Sineshaper | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Sorcer | lv2-sorcer | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Vex | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | — | ok / ok / ok / ok | no |  |
| Vitalium | DISTRHO-Ports | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Wolpertinger | DISTRHO-Ports | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Yoshimi | yoshimi | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Yoshimi-Multi | yoshimi | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| zynadd | lv2-zynadd-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
`,Pe=`# MIDI

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

34 plugins, 0 of them cleared to run on
the console's own audio thread. Figures are at 96 kHz; the columns are explained on
[the catalog index](index.md). Sorted by hosting verdict, then by name.

1 of them declare no LV2 category at all and are filed here from their own
name or description — our reading, not the plugin's claim.

| Plugin | Package | Host | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Certified | Note |
|:---|:---|:---|---:|:---|---:|:---|:---|:---|
| Basic arpeggiator | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| MIDI CC Map | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI CC to Note | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Channel Filter | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Channel Map | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Channel Unisono | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Choke | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Chord | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Chromatic Transpose | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Delayline | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Duplicate Blocker | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Enforce Scale | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Event Filter | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Key-Range Filter | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Keysplit | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Monophonic Legato | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI N-Tap Delay | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Note Toggle | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Note Transpose | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Note to CC | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Note to PC | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Note/Channel Map | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Quantization | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Remove Active Sensing | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Scale CC Value | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Simple Channel Filter | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Sostenuto | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Strum | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Thru | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Tonal Pedal | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Velocity Adjust | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Velocity Gamma | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Velocity Randomization | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Velocity-Range Filter | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
`,ze=`# Modulation

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

37 plugins, 20 of them cleared to run on
the console's own audio thread. Figures are at 96 kHz; the columns are explained on
[the catalog index](index.md). Sorted by hosting verdict, then by name.

| Plugin | Package | Host | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Certified | Note |
|:---|:---|:---|---:|:---|---:|:---|:---|:---|
| Auto phaser | lv2-swh-plugins | suitable | 0 ms | zero | 0.11 % | ok / ok / ok / ok | yes |  |
| C* PhaserII - Mono phaser modulated by a Lorenz fractal | caps-lv2 | suitable | 0 ms | zero | 0.20 % | ok / ok / ok / ok | yes | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| DJ flanger | lv2-swh-plugins | suitable | 0 ms | zero | 0.06 % | ok / ok / ok / ok | yes |  |
| Giant flange | lv2-swh-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| GxChorus-Stereo | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.15 % | ok / ok / ok / ok | yes |  |
| GxFlanger | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes |  |
| GxPhaser | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.14 % | ok / ok / ok / ok | yes |  |
| GxTremolo | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.30 % | ok / ok / ok / ok | yes |  |
| GxTubeVibrato | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.56 % | ok / ok / ok / ok | yes |  |
| GxWahwah | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.09 % | ok / ok / ok / ok | yes |  |
| Gxgcb_95 | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes |  |
| Gxswitched_tremolo | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.13 % | ok / ok / ok / ok | yes |  |
| LFO Phaser | lv2-swh-plugins | suitable | 0 ms | zero | 0.11 % | ok / ok / ok / ok | yes |  |
| LSP Phaser Mono | lsp-plugins-lv2 | suitable | 0 ms | zero | 0.58 % | ok / ok / ok / ok | yes |  |
| LSP Phaser Stereo | lsp-plugins-lv2 | suitable | 0 ms | zero | 1.10 % | ok / ok / ok / ok | yes |  |
| MDA RingMod | lv2-mdala-plugins | suitable | 0 ms | zero | 0.15 % | ok / ok / ok / ok | yes |  |
| MDA ThruZero | lv2-mdala-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| Retro Flanger | lv2-swh-plugins | suitable | 0.198 ms | low | 0.19 % | ok / ok / ok / ok | yes |  |
| Ringmod with LFO | lv2-swh-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| Vibrato | lv2-airwindows | suitable | 0 ms | zero | 0.40 % | ok / ok / ok / ok | yes | Extra — proven vibrato (±3.5 % / ±60 cents at depth 0.5, none at the default depth 0). |
| LSP Flanger Mono | lsp-plugins-lv2 | conditional — its latency changes with its own controls | 0 ms | zero | 0.16 % | ok / ok / ok / ok | yes |  |
| LSP Flanger Stereo | lsp-plugins-lv2 | conditional — its latency changes with its own controls | 0 ms | zero | 0.29 % | ok / ok / ok / ok | yes |  |
| C* ChorusI - Mono chorus/flanger | caps-lv2 | unknown — not soaked at every rate | 0 ms | zero | 0.07 % | dies / dies / dies / dies | no | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| Calf Flanger | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.13 % | ok / ok / ok / blast | no |  |
| Calf Multi Chorus | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.29 % | ok / ok / ok / blast | no |  |
| Calf Phaser | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.32 % | ok / ok / ok / blast | no |  |
| Calf Pulsator | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.35 % | ok / ok / blast / blast | no |  |
| Calf Ring Modulator | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.47 % | ok / ok / blast / blast | no |  |
| Flanger | lv2-swh-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.11 % | dies / dies / dies / dies | no |  |
| GxTubeTremelo | lv2-guitarix-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.71 % | dies / ok / ok / ok | no |  |
| LSP Chorus Mono | lsp-plugins-lv2 | unknown — not soaked at every rate | 0 ms | zero | 0.43 % | ok / ok / ok / dies | no |  |
| LSP Chorus Stereo | lsp-plugins-lv2 | unknown — not soaked at every rate | 0 ms | zero | 0.86 % | ok / ok / dies / dies | no |  |
| Multivoice Chorus | lv2-swh-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.06 % | dies / dies / dies / dies | no |  |
| Ringmod with two inputs | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.02 % | ok / ok / ok / ok | no |  |
| Tal-Vocoder-II | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | 0.90 % | ok / ok / ok / ok | no |  |
| The Pilgrim | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.24 % | ok / ok / ok / ok | no |  |
| dRowAudio: Flanger | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |  |
`,Ce=`# Pitch and spectral

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

31 plugins, 8 of them cleared to run on
the console's own audio thread. Figures are at 96 kHz; the columns are explained on
[the catalog index](index.md). Sorted by hosting verdict, then by name.

1 of them declare no LV2 category at all and are filed here from their own
name or description — our reading, not the plugin's claim.

| Plugin | Package | Host | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Certified | Note |
|:---|:---|:---|---:|:---|---:|:---|:---|:---|
| AM pitchshifter | lv2-swh-plugins | suitable | 0 ms | zero | 0.06 % | ok / ok / ok / ok | yes |  |
| GlitchShifter | lv2-airwindows | suitable | 0 ms | zero | 0.34 % | ok / ok / ok / ok | yes | NOT recommended and demoted to studio: not live-safe at defaults. |
| Gxoc_2 | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.20 % | ok / ok / ok / ok | yes |  |
| MDA Detune | lv2-mdala-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| MDA RePsycho! | lv2-mdala-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| MDA Tracker | lv2-mdala-plugins | suitable | 0 ms | zero | 0.15 % | ok / ok / ok / ok | yes |  |
| MDA VocInput | lv2-mdala-plugins | suitable | 0 ms | zero | 0.06 % | ok / ok / ok / ok | yes |  |
| PitchNasty | lv2-airwindows | suitable | 0 ms | zero | 0.24 % | ok / ok / ok / ok | yes | Extra — lo-fi pitch shifter whose semitone mapping is ~0.7 st flat (note -12 gives 480 Hz from 1 kHz, not 500). |
| Calf Pitch Tools | lv2-calf-plugins | conditional — wants MIDI in, which an insert never carries | 0 ms | zero | 1.69 % | ok / ok / ok / ok | yes |  |
| x42-Autotune | lv2-x42-plugins | conditional — wants MIDI in, which an insert never carries | 21.323 ms | high | 0.18 % | ok / ok / ok / ok | yes |  |
| x42-Autotune (microtonal) | lv2-x42-plugins | conditional — wants MIDI in, which an insert never carries | 21.323 ms | high | 0.18 % | ok / ok / ok / ok | yes |  |
| x42-Autotune (scales) | lv2-x42-plugins | conditional — wants MIDI in, which an insert never carries | 21.323 ms | high | 0.18 % | ok / ok / ok / ok | yes |  |
| Bode frequency shifter | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | 0.708 ms | low | 0.31 % | ok / ok / ok / ok | no |  |
| Bode frequency shifter (CV) | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | 2.083 ms | low | 0.33 % | ok / ok / ok / ok | no |  |
| Calf Bass Enhancer | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.34 % | ok / ok / ok / blast | no |  |
| Calf Exciter | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.33 % | blast / blast / blast / blast | no |  |
| Gxdetune | lv2-guitarix-plugins | unknown — stability never measured | 0 ms | zero | 1.55 % | — / — / — / — | no |  |
| Noise repellent | lv2-noise-repellent | unknown — stability never measured | 0 ms | zero | 0.77 % | — / — / — / — | no |  |
| Noise repellent Adaptive | lv2-noise-repellent | unknown — stability never measured | 0 ms | zero | 1.19 % | — / — / — / — | no |  |
| Rate shifter | lv2-swh-plugins | unknown — latency never measured | — | unknown | 0.04 % | ok / ok / ok / ok | yes |  |
| dm-GrainDelay | lv2-dm-graindelay | unknown — stability never measured | — | unknown | — | — / — / — / — | no | NOT RECOMMENDED — broken as installed. |
| Higher Quality Pitch Scaler | lv2-swh-plugins | unsuitable — allocates, locks or calls the system inside the audio callback | 15.969 ms | high | 2.28 % | ok / ok / ok / ok | no |  |
| Noise repellent | lv2-noise-repellent | unsuitable — costs more of a core than one insert may | 0 ms | zero | 1.51 % | — / — / — / — | no |  |
| Noise repellent Adaptive | lv2-noise-repellent | unsuitable — costs more of a core than one insert may | 0 ms | zero | 2.30 % | — / — / — / — | no |  |
| Rubber Band Live Mono Pitch Shifter | lv2-rubberband-plugins | unsuitable — costs more of a core than one insert may | 48.552 ms | high | 4.01 % | ok / ok / ok / dies | no |  |
| Rubber Band Live Stereo Pitch Shifter | lv2-rubberband-plugins | unsuitable — costs more of a core than one insert may | 48.552 ms | high | 5.16 % | ok / ok / dies / dies | no |  |
| Rubber Band Mono Pitch Shifter | lv2-rubberband-plugins | unsuitable — allocates, locks or calls the system inside the audio callback | 84.979 ms | high | 2.86 % | ok / ok / ok / dies | no |  |
| Rubber Band R3 Mono Pitch Shifter | lv2-rubberband-plugins | unsuitable — costs more of a core than one insert may | 65.625 ms | high | 7.51 % | ok / ok / dies / dies | no |  |
| Rubber Band R3 Stereo Pitch Shifter | lv2-rubberband-plugins | unsuitable — costs more of a core than one insert may | 65.625 ms | high | 14.60 % | ok / ok / dies / dies | no |  |
| Rubber Band Stereo Pitch Shifter | lv2-rubberband-plugins | unsuitable — allocates, locks or calls the system inside the audio callback | 84.979 ms | high | 5.48 % | ok / ok / dies / dies | no |  |
| Vocoder | lv2-vocoder-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
`,Ee=`# What to reach for

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

The catalog is an inventory. This page is the short list: what to put on a channel when you
have no time to read a table. Two jobs, because they want different things — a show cares
about latency above almost everything, and a mix does not.

## The house processors

Two of the desk's most useful processors are not LV2 plugins at all, and so appear in no
table here: they are built into the console and carry no hosting verdict to earn.

- **FBS**, the feedback suppressor — listens to a channel, recognises a ring and plants a
  narrow cut at its frequency, per channel and off until you arm it. See
  [feedback suppression](../fbs.md).
- **HRP**, the harmonic resonance processor — finds unusually strong harmonic components of
  one instrument's material and applies sparse, conservative cuts. Rack it on a channel,
  never on a bus or a sum, where the harmonic model describes nothing. It racks bypassed.

Both are live tools first. In the studio the harmonic stage earns its place for the opposite
reason: run the other way it *adds* harmonics rather than removing them — a colour, not a
cure.

## For a live show

100 plugins. Chosen for the live job: measured inside the live latency allowance at
every rate, from a family with a track record, and with no control that can quietly overrun
the budget mid-show. Sorted by latency at 96 kHz.

| Plugin | Package | Kind | Latency at 96 kHz | Cost at 96 kHz | Host | Offered by the console |
|:---|:---|:---|---:|---:|:---|:---|
| Auto phaser | lv2-swh-plugins | Modulation | 0 ms | 0.11 % | suitable | no |
| Baxandall | lv2-airwindows | Equalisers | 0 ms | 0.34 % | suitable | no |
| C* Noisegate - Attenuate noise resident in silence | caps-lv2 | Utility | 0 ms | 0.06 % | suitable | no |
| C* Plate - Versatile plate reverb | caps-lv2 | Reverb | 0 ms | 0.26 % | unknown — not yet racked and unracked a thousand times | no |
| C* PlateX2 - Stereo in/out Versatile plate reverb | caps-lv2 | Reverb | 0 ms | 0.28 % | suitable | no |
| Calf Compressor | lv2-calf-plugins | Dynamics | 0 ms | 0.22 % | conditional — wants MIDI in, which an insert never carries | yes |
| Calf Deesser | lv2-calf-plugins | Dynamics | 0 ms | 0.17 % | conditional — wants MIDI in, which an insert never carries | yes |
| Calf Equalizer 8 Band | lv2-calf-plugins | Equalisers | 0 ms | 0.15 % | unknown — not soaked at every rate | yes |
| Calf Exciter | lv2-calf-plugins | Pitch and spectral | 0 ms | 0.33 % | unknown — not soaked at every rate | yes |
| Calf Filter | lv2-calf-plugins | Filters | 0 ms | 0.16 % | unknown — not soaked at every rate | yes |
| Calf Flanger | lv2-calf-plugins | Modulation | 0 ms | 0.13 % | unknown — not soaked at every rate | yes |
| Calf Gate | lv2-calf-plugins | Dynamics | 0 ms | 0.11 % | unknown — not soaked at every rate | yes |
| Calf Mono Compressor | lv2-calf-plugins | Dynamics | 0 ms | 0.26 % | conditional — wants MIDI in, which an insert never carries | yes |
| Calf Multi Chorus | lv2-calf-plugins | Modulation | 0 ms | 0.29 % | unknown — not soaked at every rate | yes |
| Calf Multiband Compressor | lv2-calf-plugins | Dynamics | 0 ms | 2.15 % | unknown — not soaked at every rate | yes |
| Calf Phaser | lv2-calf-plugins | Modulation | 0 ms | 0.32 % | unknown — not soaked at every rate | yes |
| Calf Reverb | lv2-calf-plugins | Reverb | 0 ms | 0.35 % | unknown — not soaked at every rate | yes |
| Calf Rotary Speaker | lv2-calf-plugins | Saturation and amp simulation | 0 ms | 0.39 % | conditional — wants MIDI in, which an insert never carries | yes |
| Calf Saturator | lv2-calf-plugins | Saturation and amp simulation | 0 ms | 0.25 % | conditional — wants MIDI in, which an insert never carries | yes |
| Calf Tape Simulator | lv2-calf-plugins | Saturation and amp simulation | 0 ms | 1.68 % | conditional — wants MIDI in, which an insert never carries | yes |
| Calf Vintage Delay | lv2-calf-plugins | Delay | 0 ms | 0.16 % | unknown — not soaked at every rate | yes |
| Capacitor2 | lv2-airwindows | Filters | 0 ms | 0.26 % | suitable | no |
| Chebyshev distortion | lv2-swh-plugins | Saturation and amp simulation | 0 ms | 0.19 % | unknown — not soaked at every rate | no |
| Console7Buss | lv2-airwindows | Saturation and amp simulation (inferred from the name) | 0 ms | 0.40 % | suitable | no |
| Console7Channel | lv2-airwindows | Saturation and amp simulation (inferred from the name) | 0 ms | 0.52 % | suitable | no |
| DJ EQ | lv2-swh-plugins | Equalisers | 0 ms | 0.08 % | suitable | no |
| DJ flanger | lv2-swh-plugins | Modulation | 0 ms | 0.06 % | suitable | no |
| DeBess | lv2-airwindows | Dynamics (inferred from the description) | 0 ms | 0.70 % | suitable | no |
| Delayorama | lv2-swh-plugins | Delay | 0 ms | 0.06 % | unknown — not soaked at every rate | no |
| Dragonfly Hall Reverb | lv2-dragonfly-reverb | Reverb | 0 ms | 1.57 % | unsuitable — allocates, locks or calls the system inside the audio callback | yes |
| Dragonfly Plate Reverb | lv2-dragonfly-reverb | Reverb | 0 ms | 0.24 % | unsuitable — allocates, locks or calls the system inside the audio callback | yes |
| Dragonfly Room Reverb | lv2-dragonfly-reverb | Reverb | 0 ms | 1.53 % | unsuitable — allocates, locks or calls the system inside the audio callback | yes |
| Flanger | lv2-swh-plugins | Modulation | 0 ms | 0.11 % | unknown — not soaked at every rate | no |
| GLAME Butterworth Highpass | lv2-swh-plugins | Filters | 0 ms | 0.06 % | unknown — stability never measured | yes |
| GT10QM | lv2-eq10q | Dynamics | 0 ms | 0.09 % | suitable | yes |
| GVerb | lv2-swh-plugins | Reverb | 0 ms | 0.27 % | unknown — not yet racked and unracked a thousand times | no |
| Giant flange | lv2-swh-plugins | Modulation | 0 ms | 0.05 % | suitable | no |
| GxTremolo | lv2-guitarix-plugins | Modulation | 0 ms | 0.30 % | suitable | no |
| Gxswitched_tremolo | lv2-guitarix-plugins | Modulation | 0 ms | 0.13 % | suitable | no |
| Hard Limiter | lv2-swh-plugins | Saturation and amp simulation | 0 ms | 0.05 % | suitable | no |
| Interstage | lv2-airwindows | Saturation and amp simulation (inferred from the description) | 0 ms | 0.20 % | suitable | no |
| Karaoke | lv2-swh-plugins | Filters | 0 ms | 0.03 % | suitable | no |
| LFO Phaser | lv2-swh-plugins | Modulation | 0 ms | 0.11 % | suitable | no |
| LSP Artistic Delay Stereo | lsp-plugins-lv2 | Delay | 0 ms | 0.08 % | suitable | yes |
| LSP Chorus Mono | lsp-plugins-lv2 | Modulation | 0 ms | 0.43 % | unknown — not soaked at every rate | yes |
| LSP Chorus Stereo | lsp-plugins-lv2 | Modulation | 0 ms | 0.86 % | unknown — not soaked at every rate | yes |
| LSP Compressor Mono | lsp-plugins-lv2 | Dynamics | 0 ms | 0.07 % | unknown — not yet racked and unracked a thousand times | yes |
| LSP Compressor Stereo | lsp-plugins-lv2 | Dynamics | 0 ms | 0.12 % | unknown — not yet racked and unracked a thousand times | yes |
| LSP Delay Compensator Mono | lsp-plugins-lv2 | Delay | 0 ms | 0.03 % | suitable | yes |
| LSP Delay Compensator x2 Stereo | lsp-plugins-lv2 | Delay | 0 ms | 0.03 % | suitable | yes |
| LSP Expander Mono | lsp-plugins-lv2 | Dynamics | 0 ms | 0.07 % | unknown — not yet racked and unracked a thousand times | yes |
| LSP Expander Stereo | lsp-plugins-lv2 | Dynamics | 0 ms | 0.11 % | unknown — not yet racked and unracked a thousand times | yes |
| LSP Filter Mono | lsp-plugins-lv2 | Equalisers | 0 ms | 0.45 % | conditional — cost spikes far above its own median | yes |
| LSP Filter Stereo | lsp-plugins-lv2 | Equalisers | 0 ms | 0.43 % | conditional — cost spikes far above its own median | yes |
| LSP Flanger Mono | lsp-plugins-lv2 | Modulation | 0 ms | 0.16 % | conditional — its latency changes with its own controls | yes |
| LSP Flanger Stereo | lsp-plugins-lv2 | Modulation | 0 ms | 0.29 % | conditional — its latency changes with its own controls | yes |
| LSP Gate Mono | lsp-plugins-lv2 | Dynamics | 0 ms | 0.06 % | unknown — not yet racked and unracked a thousand times | yes |
| LSP Gate Stereo | lsp-plugins-lv2 | Dynamics | 0 ms | 0.10 % | unknown — not yet racked and unracked a thousand times | yes |
| LSP Graphic Equalizer x16 Mono | lsp-plugins-lv2 | Equalisers | 0 ms | 1.07 % | unknown — not yet racked and unracked a thousand times | yes |
| LSP Graphic Equalizer x16 Stereo | lsp-plugins-lv2 | Equalisers | 0 ms | 1.78 % | unknown — not yet racked and unracked a thousand times | yes |
| LSP Impulse Reverb Stereo | lsp-plugins-lv2 | Reverb | 0 ms | 0.04 % | suitable | yes |
| LSP Multiband Compressor Stereo x8 | lsp-plugins-lv2 | Dynamics | 0 ms | 2.90 % | unknown — not yet racked and unracked a thousand times | yes |
| LSP Parametric Equalizer x16 LeftRight | lsp-plugins-lv2 | Equalisers | 0 ms | 0.42 % | unknown — not yet racked and unracked a thousand times | yes |
| LSP Parametric Equalizer x16 Mono | lsp-plugins-lv2 | Equalisers | 0 ms | 0.39 % | unknown — not yet racked and unracked a thousand times | yes |
| LSP Parametric Equalizer x16 Stereo | lsp-plugins-lv2 | Equalisers | 0 ms | 0.47 % | unsuitable — allocates, locks or calls the system inside the audio callback | yes |
| LSP Sidechain Compressor Stereo | lsp-plugins-lv2 | Dynamics | 0 ms | 0.12 % | unknown — not yet racked and unracked a thousand times | yes |
| MDA RoundPan | lv2-mdala-plugins | Spatial | 0 ms | 0.11 % | suitable | no |
| Multivoice Chorus | lv2-swh-plugins | Modulation | 0 ms | 0.06 % | unknown — not soaked at every rate | no |
| Plate reverb | lv2-swh-plugins | Reverb | 0 ms | 0.29 % | unknown — not yet racked and unracked a thousand times | no |
| PurestDrive | lv2-airwindows | Saturation and amp simulation | 0 ms | 0.26 % | suitable | yes |
| Reverse Delay (5s max) | lv2-swh-plugins | Delay | 0 ms | 0.08 % | unknown — not soaked at every rate | no |
| SC4 | lv2-swh-plugins | Dynamics | 0 ms | 0.13 % | suitable | no |
| StereoCrossDelay | lv2-stereocrossdelay | Delay | 0 ms | 0.28 % | unknown — not soaked at every rate | no |
| Tube2 | lv2-airwindows | Saturation and amp simulation | 0 ms | 0.32 % | suitable | no |
| Valve saturation | lv2-swh-plugins | Saturation and amp simulation | 0 ms | 0.12 % | suitable | yes |
| Verbity | lv2-airwindows | Reverb | 0 ms | 0.28 % | suitable | yes |
| ZamCompX2 | lv2-zam-plugins | Dynamics | 0 ms | 0.13 % | unknown — not yet racked and unracked a thousand times | yes |
| ZamDelay | lv2-zam-plugins | Delay | 0 ms | 0.10 % | unknown — not soaked at every rate | yes |
| ZamGEQ31 | lv2-zam-plugins | Equalisers | 0 ms | 0.10 % | unknown — not soaked at every rate | yes |
| ZamGateX2 | lv2-zam-plugins | Dynamics | 0 ms | 0.61 % | unknown — not yet racked and unracked a thousand times | yes |
| ZamVerb | lv2-zam-plugins | Reverb | 0 ms | 5.73 % | — | yes |
| abGate | lv2-abGate | Dynamics | 0 ms | 0.02 % | suitable | yes |
| kPlateA | lv2-airwindows | Reverb | 0 ms | 0.61 % | suitable | yes |
| x42-comp - Dynamic Compressor Mono | lv2-x42-plugins | Dynamics | 0 ms | 0.10 % | suitable | yes |
| x42-comp - Dynamic Compressor Stereo | lv2-x42-plugins | Dynamics | 0 ms | 0.10 % | suitable | yes |
| x42-eq - Parametric Equalizer Mono | lv2-x42-plugins | Equalisers | 0 ms | 0.26 % | suitable | yes |
| x42-eq - Parametric Equalizer Stereo | lv2-x42-plugins | Equalisers | 0 ms | 0.49 % | suitable | yes |
| C* Saturate | caps-lv2 | Saturation and amp simulation | 0.010 ms | 0.51 % | suitable | yes |
| ClipOnly2 | lv2-airwindows | Dynamics | 0.010 ms | 0.04 % | suitable | no |
| Pressure5 | lv2-airwindows | Dynamics | 0.010 ms | 0.33 % | suitable | yes |
| C* Eq4p - 4-band parametric equaliser | caps-lv2 | Equalisers | 0.031 ms | 0.07 % | suitable | no |
| C* EqFA4p - 4-band parametric shelving equalizer | caps-lv2 | Equalisers | 0.031 ms | 0.07 % | suitable | no |
| Retro Flanger | lv2-swh-plugins | Modulation | 0.198 ms | 0.19 % | suitable | no |
| ZamTube | lv2-zam-plugins | Saturation and amp simulation | 0.333 ms | 4.57 % | unsuitable — costs more of a core than one insert may | yes |
| x42-dpl - Digital Peak Limiter Mono | lv2-x42-plugins | Dynamics | 1.333 ms | 0.06 % | suitable | yes |
| x42-dpl - Digital Peak Limiter Stereo | lv2-x42-plugins | Dynamics | 1.333 ms | 0.08 % | suitable | yes |
| Calf Limiter | lv2-calf-plugins | Dynamics | 4.990 ms | 0.26 % | unsuitable — allocates, locks or calls the system inside the audio callback | yes |
| Fast Lookahead limiter | lv2-swh-plugins | Dynamics | 5.000 ms | 0.06 % | suitable | no |
| LSP Limiter Mono | lsp-plugins-lv2 | Dynamics | 5.000 ms | 0.06 % | unknown — not yet racked and unracked a thousand times | yes |
| LSP Limiter Stereo | lsp-plugins-lv2 | Dynamics | 5.000 ms | 0.10 % | unknown — not yet racked and unracked a thousand times | yes |

## For studio mixing

The desk is equally a studio mixer, and the studio job lifts the one constraint the live list
is built around: latency stops disqualifying, and the stakes of an overrun fall. So the studio
list is the live list plus the 6 recommended plugins the live allowance excludes —
look-ahead limiters, multiband dynamics, linear-phase and convolution work.

It is not simply the live list with the limits removed: some entries are the same plugin used
for a different job, the harmonic processor above being the clearest case.

| Plugin | Package | Kind | Latency at 96 kHz | Cost at 96 kHz | Host | Offered by the console |
|:---|:---|:---|---:|---:|:---|:---|
| Multiband EQ | lv2-swh-plugins | Equalisers | 3.927 ms | 0.15 % | unsuitable — allocates, locks or calls the system inside the audio callback | no |
| ZaMaximX2 | lv2-zam-plugins | Dynamics | 5.000 ms | 8.72 % | unsuitable — costs more of a core than one insert may | yes |
| LSP Multiband Limiter Stereo | lsp-plugins-lv2 | Dynamics | 10.000 ms | 1.44 % | unsuitable — allocates, locks or calls the system inside the audio callback | yes |
| Tape Delay Simulation | lv2-swh-plugins | Delay | — | 0.07 % | unknown — not yet racked and unracked a thousand times | no |
| ZamEQ2 | lv2-zam-plugins | Equalisers | — | — | unknown — not soaked at every rate | yes |
| x42 - Preset Convolver Stereo | lv2-x42-plugins | Reverb | — | 0.02 % | unknown — stability never measured | yes |

## What the console offers

The picker serves 70 plugins — the curated palette, not everything installed on the
machine. A plugin you installed by hand will not appear even though the host can load it; the
palette is a short list you can trust under pressure, and the full matrix is one click away.

Each role below is one of the picker's groups, ranked the way the picker ranks it: the lowest
latency class first, the better-known house first within a class, heavy variants last. An
entry whose plugin is not installed on the machine is left out of the picker rather than
shown greyed. **Width** is the build: a \`mono\` one fits a one-channel destination such as a
wedge or a mono input, a \`stereo\` one a stereo strip. **Latency** is the curator's class, the
same \`zero\` / \`low\` / \`high\` the catalog uses.

### EQ

| Plugin | Width | Latency | Note |
|---|---|---|---|
| LSP Parametric EQ x16 | stereo | zero |  |
| LSP Parametric EQ x16 (mono) | mono | zero | Mono build of the palette's default parametric. |
| LSP Parametric EQ x16 (L/R) | stereo | zero | Independent left/right curves — minimum-phase, still live-safe. |
| LSP Graphic EQ x16 | stereo | zero |  |
| LSP Graphic EQ x16 (mono) | mono | zero | The wedge graphic EQ — one channel, no summing. |
| x42 Parametric EQ | stereo | zero | Minimum-phase 4-band + shelves/HPF/LPF. |
| x42 Parametric EQ (mono) | mono | zero | Mono minimum-phase 4-band + shelves/HPF/LPF, and the cheapest measured parametric in the palette — the clean parametric for a wedge. |
| Calf EQ 8-Band | stereo | zero |  |
| ZamEQ2 | mono | zero |  |
| ZamGEQ31 (mono) | mono | zero | 31-band mono graphic EQ — the traditional one-third-octave wedge tool, and cheap enough to run on every mix. |
| HRP+ (per-instrument) | mono | zero | Harmonic Resonance Processor, live insert form — finds unusually strong harmonic components of ONE instrument's material and applies sparse, conservative cuts through an ordinary bell cascade. |

### Compressor

| Plugin | Width | Latency | Note |
|---|---|---|---|
| LSP Compressor | stereo | zero |  |
| LSP Compressor (mono) | mono | zero | Mono build of the palette's default comp — ~40 % cheaper per instance. |
| LSP Sidechain Comp | stereo | zero | Sidechain/ducking compressor. |
| x42 Compressor | stereo | zero | Dynamic compressor — auto-makeup, easy to drive. |
| x42 Compressor (mono) | mono | zero | Mono dynamic compressor — auto-makeup, zero-latency, no look-ahead control to overrun a monitor budget. |
| Calf Compressor | stereo | zero |  |
| Calf Mono Compressor | mono | zero | Calf's dedicated mono comp. |
| ZamComp | stereo | zero |  |
| Airwindows Pressure5 | stereo | low | Airwindows' compressor with ClipOnly2 built in — 13.2 dB of implied gain reduction at pressure=0.7, one frame of delay (0.021 ms @ 48 k), 0.34 % of a core per instance at 96 kHz. |
| LSP Multiband Comp x8 | stereo | high | 8-band crossover — measures 0 ms in its default Classic (IIR) mode, but the linear-phase modes add latency. |
| Calf Multiband Comp | stereo | high | Crossover band-split adds latency. |

### Glue Bus Comp

| Plugin | Width | Latency | Note |
|---|---|---|---|
| LSP Bus Comp (glue) | stereo | zero | SSL-style glue on a bus — threshold/ratio/attack/release/makeup, stereo. |
| Calf Bus Comp (glue) | stereo | zero | Alternative glue comp — full-featured stereo comp, zero-latency. |

### Gate / Expander

| Plugin | Width | Latency | Note |
|---|---|---|---|
| LSP Gate | stereo | zero |  |
| LSP Gate (mono) | mono | zero | Mono build — measures 0 ms and costs ~40 % less per instance than the stereo one. |
| LSP Expander | stereo | zero | Gentler than a gate — downward expansion. |
| LSP Expander (mono) | mono | zero | Mono downward expansion — same sidechain look-ahead caveat as the mono gate. |
| Calf Gate | stereo | zero |  |
| ZamGate | stereo | zero |  |
| eq10q GT10QM | mono | zero | Mono gate with the stage feature set the others lack — sidechain HPF/LPF, key listen, ratio and knee — and still 0 ms at every rate with no latency-bearing control. |
| abGate | mono | zero | Mono noise gate — threshold / attack / hold / decay / range. |

### De-esser

| Plugin | Width | Latency | Note |
|---|---|---|---|
| Calf De-esser | stereo | zero | Sibilance control for vocals — zero-latency. |

### Limiter

| Plugin | Width | Latency | Note |
|---|---|---|---|
| LSP Limiter | stereo | low | Measured 5 ms look-ahead at default settings, at every rate: \`low\` by the console's own rule, because 5 ms fits inside one buffer at the rig's canonical rate (operator ruling 2026-09-08: the class follows the rule, never the plugin). |
| LSP Multiband Limiter | stereo | low | Multiband look-ahead limiter. |
| LSP Limiter (mono) | mono | low | Mono build — the same measured 5 ms look-ahead as the stereo one and the same class, \`low\` by the rule (operator ruling 2026-09-08). |
| x42 Digital Peak Limiter | stereo | low | True-peak limiter, 64-frame look-ahead (measured 1.33 ms @ 48 kHz). |
| x42 Digital Peak Limiter (mono) | mono | low | Mono true-peak limiter, same measured 64-frame look-ahead as the stereo build. |
| Calf Limiter | stereo | low |  |
| ZaMaxim | stereo | low | Brickwall look-ahead maximiser. |

### Reverb

| Plugin | Width | Latency | Note |
|---|---|---|---|
| Dragonfly Hall | stereo | zero | Algorithmic hall — the live reverb. |
| Dragonfly Room | stereo | zero | Algorithmic room. |
| Dragonfly Plate | stereo | zero | Algorithmic plate — a plate reverb, and the cheapest reverb in the palette: 0.24 % of a core per instance at 96 kHz, 0 ms dry-path latency at all four rates, flat cost in silence. |
| Calf Reverb | stereo | low | Algorithmic — the installed live default where Dragonfly is absent. |
| ZamVerb | stereo | low |  |
| Airwindows Verbity | stereo | low | Cheap algorithmic reverb (0.29 % of a core per instance at 96 k) with a clean decay: -51 dB re peak at 200 ms, -99 dB at 1 s at defaults. |
| Airwindows kPlateA | stereo | low | Plate reverb — a character the palette's halls and rooms do not cover. |
| LSP Convolution Reverb | stereo | high | Long-IR convolution — measures 0 ms only because no IR is loaded; the latency arrives with the IR. |
| x42 IR Convolver | stereo | high | Impulse-response convolver — measures 0 ms only with no IR loaded; real latency depends on the IR/partitioning. |

### Delay

| Plugin | Width | Latency | Note |
|---|---|---|---|
| LSP Delay Compensator | stereo | zero | Sample-accurate fixed delay (alignment). |
| LSP Delay Compensator (mono) | mono | zero | Mono sample-accurate fixed delay (alignment) — the cheapest entry in the palette at any width. |
| LSP Artistic Delay | stereo | zero | Tempo/feedback echo for FX sends. |
| Calf Vintage Delay | stereo | zero |  |
| ZamDelay | mono | zero |  |

### Saturation

| Plugin | Width | Latency | Note |
|---|---|---|---|
| Calf Saturator | stereo | zero |  |
| Calf Tape Simulator | stereo | zero | Tape-style colour + soft saturation. |
| Calf Exciter | stereo | zero | Harmonic top-end enhancer. |
| ZamTube | mono | zero |  |
| Airwindows PurestDrive | stereo | zero | The subtle saturator: bit-exact identity at drive=0, and at drive=1 still only 0.58 % THD with a flat response (-0.12 dB). |
| C* Saturate (mono) | mono | zero | Mono waveshaper with selectable transfer modes and a bias control. |
| Valve Saturation (mono) | mono | zero | Mono valve-style soft saturation — distortion character and knee, 0 ms at every rate. |

### Modulation

| Plugin | Width | Latency | Note |
|---|---|---|---|
| LSP Chorus | stereo | zero |  |
| LSP Chorus (mono) | mono | zero | Mono chorus — half the measured cost of the stereo build, and nothing to cancel on a one-channel insert. |
| LSP Flanger | stereo | zero |  |
| LSP Flanger (mono) | mono | zero | Mono flanger — same reasoning as the mono chorus. |
| Calf Multi Chorus | stereo | zero |  |
| Calf Phaser | stereo | zero |  |
| Calf Flanger | stereo | zero |  |
| Calf Rotary Speaker | stereo | zero | Leslie/rotary cabinet sim. |
| GxTremolo (mono) | mono | zero | Tremolo — the hosted route for roster gap 12 until the native stage exists. |
| Gx Switched Tremolo (mono) | mono | zero | Square-wave (switched, on/off) tremolo — the choppier cousin of GxTremolo. |
| MDA RoundPan (auto-pan) | stereo | zero | LFO auto-panner — the hosted route for roster gap 12 until the native stage exists. |

### Filter / HPF

| Plugin | Width | Latency | Note |
|---|---|---|---|
| LSP Filter | stereo | zero |  |
| LSP Filter (mono) | mono | zero | Mono build for a wedge or a mono input channel — no stereo legs to sum. |
| Calf Filter | stereo | zero |  |
| Butterworth HPF (mono) | mono | zero | Plain mono Butterworth high-pass — cutoff and resonance, nothing else. |

## What suitable means

A plugin marked \`suitable\` has earned a place on the console's own audio thread, where there
is no separate host process between it and the mix. That is worth a buffer in and a buffer out
per insert, and at 96 kHz an engineer can hear the difference. It is also the most dangerous
place in the system: one memory allocation inside the audio callback is the whole desk's
dropout, and one crash is the whole desk's silence. So it is earned, never granted:

- **Nothing that can block.** No memory allocation, no lock and no system call anywhere in the
  audio callback, measured under a sweep of every parameter — not read from a promise in the
  plugin's documentation.
- **A clean soak at all four rates.** 44.1, 48, 96 and 192 kHz, each run long enough to catch
  the plugins that look perfect for a second.
- **A thousand rack and unrack cycles** without a leak, a stray thread or a fault.
- **Affordable, knowable and the right shape** — its cost at 96 kHz under the ceiling, its
  latency resolved, and one-in-one-out or stereo so it fits a strip.

The verdict is the *worst* of those, and an absent measurement counts against rather than for:
\`unknown\` keeps a plugin in its own process exactly as \`unsuitable\` does. \`conditional\` means
it measured well but one dimension carries a caution worth reading before you lean on it.

Of the plugins measured, 368 are suitable today. The rest run in a host process of their
own, which costs a buffer each way and is where the large majority of any LV2 collection will
always live. Nothing about that makes them worse plugins.

See [the catalog](index.md) for the full matrix.
`,Re=`# Reverb

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

58 plugins, 22 of them cleared to run on
the console's own audio thread. Figures are at 96 kHz; the columns are explained on
[the catalog index](index.md). Sorted by hosting verdict, then by name.

5 of them declare no LV2 category at all and are filed here from their own
name or description — our reading, not the plugin's claim.

| Plugin | Package | Host | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Certified | Note |
|:---|:---|:---|---:|:---|---:|:---|:---|:---|
| BrightAmbience | lv2-airwindows | suitable | 0 ms | zero | 0.32 % | ok / ok / ok / ok | yes | Extra — bright early-reflection ambience (v1). |
| BrightAmbience2 | lv2-airwindows | suitable | 0 ms | zero | 0.46 % | ok / ok / ok / ok | yes | Extra — bright ambience v2. |
| C* PlateX2 - Stereo in/out Versatile plate reverb | caps-lv2 | suitable | 0 ms | zero | 0.28 % | ok / ok / ok / ok | yes | Verified at 192 kHz, 2026-09-05. |
| GxMultiBandReverb | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.80 % | ok / ok / ok / ok | yes |  |
| GxReverb-Stereo | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.25 % | ok / ok / ok / ok | yes |  |
| GxZita_rev1-Stereo | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.33 % | ok / ok / ok / ok | yes |  |
| Gxroom_simulator | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.29 % | ok / ok / ok / ok | yes |  |
| Gxshimmizita | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.86 % | ok / ok / ok / ok | yes |  |
| LSP Impulse Responses Mono | lsp-plugins-lv2 | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| LSP Impulse Responses Stereo | lsp-plugins-lv2 | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| LSP Impulse Reverb Stereo | lsp-plugins-lv2 | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| MDA Ambience | lv2-mdala-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| MV | lv2-airwindows | suitable | 0 ms | zero | 0.54 % | ok / ok / ok / ok | yes | Extra — huge 'MV' reverb: effectively 100 % wet at defaults (dry -89.9 dBFS), 111 ms wet onset, builds for 760 ms and is still -16.6 dB re peak at 1 s. |
| PocketVerbs | lv2-airwindows | suitable | 0 ms | zero | 1.55 % | ok / ok / ok / ok | yes | Extra — multi-type small reverb (room/chamber/spring…); tails decay, but the default Room is very short and it is the dearest live-tier reverb here after Reverb. |
| StarChild | lv2-airwindows | suitable | 0 ms | zero | 0.85 % | ok / ok / ok / ok | yes | Extra — comb/space effect praised by the community but reported to cause xruns on MOD hardware with sustain past noon; 0.86 % of a core here. |
| Verbity | lv2-airwindows | suitable | 0 ms | zero | 0.28 % | ok / ok / ok / ok | yes | Recommended — the author's starter-kit reverb and the cheapest usable one here (0.29 % of a core): dry at 0 ms, a 27 ms wet onset at defaults and a clean decay (-51 dB re peak at 200 ms, -99 dB at 1 s). |
| kCosmos | lv2-airwindows | suitable | 0 ms | zero | 0.48 % | ok / ok / ok / ok | yes | Extra — kCosmos reverb/ambience, research standout but not run through the tail oracle here. |
| kGuitarHall2 | lv2-airwindows | suitable | 0 ms | zero | 0.40 % | ok / ok / ok / ok | yes | Extra — guitar-hall reverb. |
| kPlateA | lv2-airwindows | suitable | 0 ms | zero | 0.61 % | ok / ok / ok / ok | yes | Recommended — plate reverb with a clean, decaying tail: dry at 0 ms, wet onset 4.3 ms at defaults (wetness=0.25), -50 dB re peak at 200 ms and -110 dB at 2 s. |
| kPlateB | lv2-airwindows | suitable | 0 ms | zero | 0.63 % | ok / ok / ok / ok | yes | Extra — kPlate variant B; not run through the tail oracle (kPlateA was). |
| kPlateC | lv2-airwindows | suitable | 0 ms | zero | 0.62 % | ok / ok / ok / ok | yes | Extra — kPlate variant C; not oracle-characterised. |
| kPlateD | lv2-airwindows | suitable | 0 ms | zero | 0.72 % | ok / ok / ok / ok | yes | Extra — kPlate variant D; not oracle-characterised. |
| BrightAmbience3 | lv2-airwindows | conditional — its latency changes with its own controls | 0 ms | zero | 0.29 % | ok / ok / ok / ok | yes | Extra — bright ambience v3. |
| Classic Reverb RE-02 | lv2-classicreverb-re02 | conditional — its latency changes with its own controls | 0 ms | zero | 0.46 % | ok / ok / ok / ok | yes | Classic Reverb RE-02 (AnClark, AI-assisted reverse-engineering of Kjaerhus Classic). |
| Infinity | lv2-airwindows | conditional — its latency changes with its own controls | 15.906 ms | high | 0.48 % | ok / ok / ok / ok | yes | Studio, not recommended: an infinite-hold reverb by design (feedback infinite at defaults) — the tail does not decay and a sustained tone holds at -11..-16 dBFS. |
| Infinity2 | lv2-airwindows | conditional — its latency changes with its own controls | 12.604 ms | high | 0.53 % | ok / ok / ok / ok | yes | Studio, not recommended: at defaults (feedback=1) it raises a sustained -6 dBFS sine to +3.9 dBFS peak within a second and holds there. |
| C* Plate - Versatile plate reverb | caps-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.26 % | ok / ok / ok / ok | no | Verified at 192 kHz, 2026-09-05. |
| Calf Reverb | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.35 % | ok / dies / dies / dies | no |  |
| Classic Reverb RE-03 | lv2-classicreverb-re03 | unknown — not soaked at every rate | 0 ms | zero | 0.39 % | dies / ok / ok / ok | no | Classic Reverb RE-03 — reverse-engineered clone of Kjaerhus Classic Reverb (DPF, 2x2). |
| GVerb | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.27 % | ok / ok / ok / ok | no |  |
| Galactic | lv2-airwindows | unknown — reports a latency it does not keep | 94.375 ms | high | 0.40 % | ok / ok / ok / ok | yes | Studio, not recommended for the live desk: 100 %-wet by default with a 95.7 ms wet onset and a tail still -32 dB re peak at 2 s; the v34.0 build also lacks the 2026-08-24 right-channel dither fix. |
| IR | lv2-ir-plugins | unknown — stability never measured | — | unknown | — | — / — / — / — | no |  |
| LSP Impulse Reverb Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |  |
| LSP Room Builder Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |  |
| LSP Room Builder Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |  |
| Plate reverb | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.29 % | ok / ok / ok / ok | no |  |
| Room Reverb | lv2-roomreverb | unknown — stability never measured | 0 ms | zero | 1.74 % | — / — / — / — | no | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| dRowAudio: Reverb | DISTRHO-Ports | unknown — not yet racked and unracked a thousand times | 0 ms | zero | — | ok / ok / dies / dies | no |  |
| x42 - IR Convolver Mono | lv2-x42-plugins | unknown — stability never measured | — | unknown | 0.02 % | — / — / — / — | no |  |
| x42 - IR Convolver Mono => Stereo | lv2-x42-plugins | unknown — stability never measured | — | unknown | 0.02 % | — / — / — / — | no |  |
| x42 - IR Convolver Stereo | lv2-x42-plugins | unknown — stability never measured | — | unknown | 0.02 % | — / — / — / — | no |  |
| x42 - Preset Convolver Mono | lv2-x42-plugins | unknown — stability never measured | — | unknown | 0.02 % | — / — / — / — | no |  |
| x42 - Preset Convolver Mono => Stereo | lv2-x42-plugins | unknown — stability never measured | — | unknown | 0.02 % | — / — / — / — | no |  |
| x42 - Preset Convolver Stereo | lv2-x42-plugins | unknown — stability never measured | — | unknown | 0.02 % | — / — / — / — | no |  |
| CloudReverb | lv2-cloudreverb | unsuitable — costs more of a core than one insert may | 0 ms | zero | 3.06 % | — / — / — / — | no | Extra, not a default pick. |
| Dragonfly Early Reflections | lv2-dragonfly-reverb | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.29 % | ok / ok / ok / ok | no | Dragonfly Early Reflections — an early-reflections-only processor, NOT a reverb with a tail: at 20 m the reflections span 8.6-162 ms and are gone by 200 ms (-114 dB), so it fails the generic reverb oracle by design, not by fault. |
| Dragonfly Hall Reverb | lv2-dragonfly-reverb | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 1.57 % | ok / ok / ok / ok | no | Dragonfly Hall — the live-tier hall. |
| Dragonfly Plate Reverb | lv2-dragonfly-reverb | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.24 % | ok / ok / ok / ok | no | Dragonfly Plate — a plate reverb, and the cheapest reverb in the package: 0.24 % of a core per instance at 96 kHz (411/core), 0 ms dry-path latency at all four rates, flat cost in silence and exact-zero idle output. |
| Dragonfly Room Reverb | lv2-dragonfly-reverb | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 1.53 % | ok / ok / ok / ok | no | Dragonfly Room — a live-tier room/ambience reverb. |
| HybridReverb2 | lv2-hybridreverb2 | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | 0.02 % | ok / ok / ok / ok | no | Not recommended: functionally dead in a headless host. |
| KlangFalter | DISTRHO-Ports | unsuitable — needs a host facility the audio thread will not become | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |  |
| MatrixVerb | lv2-airwindows | unsuitable — costs more of a core than one insert may | 25.719 ms | high | 7.20 % | ok / ok / ok / dies | no | Studio, not recommended: 51.3 ms wet onset at 100 % wet with no latency port, a tail that does not decay within 2 s, and the family's second-dearest plugin (7.3 % of a core per instance at 96 k). |
| Reverb | lv2-airwindows | unsuitable — costs more of a core than one insert may | 0 ms | zero | 6.09 % | ok / ok / ok / dies | no | Extra — the plain 'Reverb': a clean decaying tail, but 7.1 % of a core per instance at 96 k, the family's third-dearest plugin. |
| Tal-Reverb | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 1.58 % | ok / ok / ok / ok | no |  |
| Tal-Reverb-II | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | — | ok / ok / ok / ok | no |  |
| Tal-Reverb-III | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.86 % | ok / ok / ok / ok | no |  |
| dm-Reverb | lv2-dm-reverb | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 1.01 % | ok / ok / ok / ok | yes | dm-Reverb — Erbe-Verb-style creative stereo reverb (FDN + shimmer, reverse, freeze), measured 0 ms at 44.1/48/96/192 kHz and 1.04 % of a core per instance at 96 kHz, 40/40 clean host cycles, tail present; the measured controls — mix,… |
| ZamVerb | lv2-zam-plugins | — | 0 ms | zero | 5.73 % | — / — / — / — | no |  |
`,Me=`# Saturation and amp simulation

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

140 plugins, 101 of them cleared to run on
the console's own audio thread. Figures are at 96 kHz; the columns are explained on
[the catalog index](index.md). Sorted by hosting verdict, then by name.

50 of them declare no LV2 category at all and are filed here from their own
name or description — our reading, not the plugin's claim.

| Plugin | Package | Host | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Certified | Note |
|:---|:---|:---|---:|:---|---:|:---|:---|:---|
| Aliasing | lv2-swh-plugins | suitable | 0 ms | zero | 0.02 % | ok / ok / ok / ok | yes |  |
| Barry's Satan Maximiser | lv2-swh-plugins | suitable | 0.156 ms | low | 0.04 % | ok / ok / ok / ok | yes |  |
| BassAmp | lv2-airwindows | suitable | 0 ms | zero | 1.17 % | ok / ok / ok / ok | yes | Extra — bass amp sim, not a live-desk effect. |
| BassUp | lv2-eq10q | suitable | 0 ms | zero | 0.12 % | ok / ok / ok / ok | yes |  |
| BigAmp | lv2-airwindows | suitable | 0.031 ms | low | 1.88 % | ok / ok / ok / ok | yes | Extra — guitar amp sim; +12.9 dB at defaults (peaks +2.5 dBFS from -20 dBFS noise) and one of the family's dearer plugins. |
| BussColors4 | lv2-airwindows | suitable | 0 ms | zero | 0.50 % | ok / ok / ok / ok | yes | Extra — console-colour bus saturator. |
| C* CabinetIII - Idealised loudspeaker cabinet emulation | caps-lv2 | suitable | 0 ms | zero | 0.27 % | ok / ok / ok / ok | yes | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| C* CabinetIV - Idealised loudspeaker cabinet emulation | caps-lv2 | suitable | 0.031 ms | low | 0.22 % | ok / ok / ok / ok | yes | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| C* Saturate | caps-lv2 | suitable | 0.010 ms | low | 0.51 % | ok / ok / ok / ok | yes | Verified at 192 kHz, 2026-09-05. |
| C* ToneStack - Tone stack emulation | caps-lv2 | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| Channel8 | lv2-airwindows | suitable | 0 ms | zero | 0.38 % | ok / ok / ok / ok | yes | Extra — console channel colour v8, superseded by Channel9. |
| Channel9 | lv2-airwindows | suitable | 0 ms | zero | 0.44 % | ok / ok / ok / ok | yes | Extra — subtle console-channel colour (Neve/API/SSL modes). |
| Console6Buss | lv2-airwindows | suitable | 0 ms | zero | 0.19 % | ok / ok / ok / ok | yes | Extra — Console6 buss half; -5.8 dB at defaults, the complement of the channel's +5.6 dB. |
| Console6Channel | lv2-airwindows | suitable | 0 ms | zero | 0.19 % | ok / ok / ok / ok | yes | Extra — Console6 channel half; +5.6 dB at defaults, a surprise on a lone insert. |
| Console7Buss | lv2-airwindows | suitable | 0 ms | zero | 0.40 % | ok / ok / ok / ok | yes | Recommended — the buss half of the Console7 pair (author's starter kit): one instance on the mix bus, with Console7Channel on every contributing strip. |
| Console7Channel | lv2-airwindows | suitable | 0 ms | zero | 0.52 % | ok / ok / ok / ok | yes | Recommended — the channel half of the Console7 pair (author's starter kit): one per strip, Console7Buss on the mix. |
| Console8BussHype | lv2-airwindows | suitable | 0 ms | zero | 0.36 % | ok / ok / ok / ok | yes | Extra — Console8 buss (hype); +6.6 dB at defaults. |
| Console8BussIn | lv2-airwindows | suitable | 0 ms | zero | 0.30 % | ok / ok / ok / ok | yes | Extra — Console8 buss-in stage. |
| Console8BussOut | lv2-airwindows | suitable | 0.010 ms | low | 0.29 % | ok / ok / ok / ok | yes | Extra — Console8 buss-out stage with a one-frame delay. |
| Console8ChannelHype | lv2-airwindows | suitable | 0 ms | zero | 0.28 % | ok / ok / ok / ok | yes | Extra — Console8 channel (hype); +6.4 dB at defaults. |
| Console8ChannelIn | lv2-airwindows | suitable | 0.021 ms | low | 0.24 % | ok / ok / ok / ok | yes | Extra — Console8 channel-in stage; a fixed 0.021 ms at every rate (fixed-time). |
| Console8ChannelOut | lv2-airwindows | suitable | 0 ms | zero | 0.34 % | ok / ok / ok / ok | yes | Extra — Console8 channel-out stage. |
| Console8LiteBuss | lv2-airwindows | suitable | 0 ms | zero | 0.40 % | ok / ok / ok / ok | yes | Extra — the one-plugin Console8 buss. |
| Console8LiteChannel | lv2-airwindows | suitable | 0 ms | zero | 0.39 % | ok / ok / ok / ok | yes | Extra — the one-plugin Console8 channel. |
| Console8SubHype | lv2-airwindows | suitable | 0 ms | zero | 0.36 % | ok / ok / ok / ok | yes | Extra — Console8 sub-mix (hype); +6.6 dB at defaults. |
| Console8SubIn | lv2-airwindows | suitable | 0.021 ms | low | 0.30 % | ok / ok / ok / ok | yes | Extra — Console8 sub-in stage; fixed 0.021 ms at every rate. |
| Console8SubOut | lv2-airwindows | suitable | 0 ms | zero | 0.35 % | ok / ok / ok / ok | yes | Extra — Console8 sub-out stage. |
| ConsoleLABuss | lv2-airwindows | suitable | 0 ms | zero | 0.47 % | ok / ok / ok / ok | yes | Extra — ConsoleLA buss. |
| ConsoleLAChannel | lv2-airwindows | suitable | 0 ms | zero | 0.93 % | ok / ok / ok / ok | yes | Extra — ConsoleLA channel with built-in 3-band EQ, pan and fader; one of the dearer console channels (Console7Cascade/Crunch cost more) and a duplicate of what the strip already has natively. |
| Creature | lv2-airwindows | suitable | 0 ms | zero | 0.55 % | ok / ok / ok / ok | yes | Extra — experimental saturation oddity, -11.6 dB at defaults. |
| Crossover distortion | lv2-swh-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| CrunchyGrooveWear | lv2-airwindows | suitable | 0 ms | zero | 0.65 % | ok / ok / ok / ok | yes | Extra — vinyl groove-wear distortion. |
| Declipper | lv2-swh-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| Desk | lv2-airwindows | suitable | 0 ms | zero | 0.34 % | ok / ok / ok / ok | yes | Extra — original Desk console colour. |
| Diode Processor | lv2-swh-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| Drive | lv2-airwindows | suitable | 0 ms | zero | 0.20 % | ok / ok / ok / ok | yes | Extra — simple drive with a dB-ranged control. |
| Dyno | lv2-airwindows | suitable | 0 ms | zero | 0.39 % | ok / ok / ok / ok | yes | Extra — dynamic waveshaper. |
| EverySlew | lv2-airwindows | suitable | 0 ms | zero | 0.33 % | ok / ok / ok / ok | yes | Extra — slew limiter. |
| Facet | lv2-airwindows | suitable | 0 ms | zero | 0.19 % | ok / ok / ok / ok | yes | Extra — waveform faceting distortion oddity. |
| Fast overdrive | lv2-swh-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| FireAmp | lv2-airwindows | suitable | 0.063 ms | low | 1.57 % | ok / ok / ok / ok | yes | Extra — guitar amp sim: +7.1 dB, 55 dB band span, 21 % THD at defaults, and ~6 frames of delay at 96 k. |
| Focus | lv2-airwindows | suitable | 0 ms | zero | 0.44 % | ok / ok / ok / ok | yes | Extra — kit-listed saturating booster, but not characterised here beyond the scan. |
| Foldover distortion | lv2-swh-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| Fracture | lv2-airwindows | suitable | 0 ms | zero | 0.29 % | ok / ok / ok / ok | yes | Not recommended — wavefolder with +15.5 dB at defaults, hard-ceilinged at 0 dBFS. |
| GoldenSlew | lv2-airwindows | suitable | 0 ms | zero | 0.26 % | ok / ok / ok / ok | yes | Extra — golden-ratio slew limiter. |
| GrindAmp | lv2-airwindows | suitable | 0.052 ms | low | 1.97 % | ok / ok / ok / ok | yes | Extra — guitar amp sim; +12.1 dB at defaults (peaks +2.2 dBFS), dear, and a 5–10 frame rate-dependent delay at 96/192 k. |
| Gx w20 | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.54 % | ok / ok / ok / ok | yes |  |
| GxBigMuffPi | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.21 % | ok / ok / ok / ok | yes |  |
| GxBoss DS1 | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.39 % | ok / ok / ok / ok | yes |  |
| GxColorSound Tonebender | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.25 % | ok / ok / ok / ok | yes |  |
| GxFuzz | lv2-guitarix-plugins | suitable | 0.250 ms | low | 0.61 % | ok / ok / ok / ok | yes |  |
| GxFuzzFaceJH2 | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.32 % | ok / ok / ok / ok | yes |  |
| GxHornet | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.12 % | ok / ok / ok / ok | yes |  |
| GxMXR Distortion | lv2-guitarix-plugins | suitable | — | unknown | 0.10 % | ok / ok / ok / ok | yes |  |
| GxRat | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.14 % | ok / ok / ok / ok | yes |  |
| GxScreamingBird | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| GxSustainer | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.38 % | ok / ok / ok / ok | yes |  |
| GxTubeScreamer | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| Hard Limiter | lv2-swh-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| Hypersoft | lv2-airwindows | suitable | 0 ms | zero | 1.66 % | ok / ok / ok / ok | yes | Extra — soft-clip/saturation, one of the dearer non-reverb entries. |
| Inflamer | lv2-airwindows | suitable | 0 ms | zero | 0.67 % | ok / ok / ok / ok | yes | Extra — harmonic 'inflation' saturator. |
| Interstage | lv2-airwindows | suitable | 0 ms | zero | 0.20 % | ok / ok / ok / ok | yes | Recommended — the author's 'always on' inter-stage colour from the starter kit: 0 ms, one of the family's cheapest, no default surprise in the scan. |
| IronOxideClassic2 | lv2-airwindows | suitable | 0.021 ms | low | 0.44 % | ok / ok / ok / ok | yes | Extra — tape colour with an ips control; 2–4 frame rate-dependent delay at 96/192 k the scan could not reconcile. |
| LRConvolve | lv2-airwindows | suitable | 0 ms | zero | 0.18 % | ok / ok / ok / ok | yes | Extra — convolves L with R; a sound-design oddity. |
| LeadAmp | lv2-airwindows | suitable | 0.063 ms | low | 2.40 % | ok / ok / ok / ok | yes | Extra — guitar lead amp sim, the dearest amp after PointyGuitar, with ~6 frames (0.062 ms) of delay at 96 k. |
| LilAmp | lv2-airwindows | suitable | 0.042 ms | low | 1.37 % | ok / ok / ok / ok | yes | Extra — small guitar amp sim; 4–11 frame rate-dependent delay at 96/192 k. |
| MDA Combo | lv2-mdala-plugins | suitable | 0 ms | zero | 0.06 % | ok / ok / ok / ok | yes |  |
| MDA Degrade | lv2-mdala-plugins | suitable | 0.135 ms | low | 0.05 % | ok / ok / ok / ok | yes |  |
| MDA Dither | lv2-mdala-plugins | suitable | 0 ms | zero | 0.12 % | ok / ok / ok / ok | yes |  |
| MDA Leslie | lv2-mdala-plugins | suitable | 0 ms | zero | 0.06 % | ok / ok / ok / ok | yes |  |
| MDA Overdrive | lv2-mdala-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| MDA SubSynth | lv2-mdala-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| MidAmp | lv2-airwindows | suitable | 0.021 ms | low | 1.53 % | ok / ok / ok / ok | yes | Extra — mid-gain guitar amp sim; 2–8 frame rate-dependent delay at 96/192 k. |
| Mojo | lv2-airwindows | suitable | 0 ms | zero | 0.43 % | ok / ok / ok / ok | yes | Extra — saturator that adds +3.77 dB and 2 % THD at its default; a colour choice, not a transparent default. |
| PlatinumSlew | lv2-airwindows | suitable | 0 ms | zero | 0.33 % | ok / ok / ok / ok | yes | Extra — slew limiter. |
| Pointer cast distortion | lv2-swh-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| PowerSag | lv2-airwindows | suitable | 0 ms | zero | 0.28 % | ok / ok / ok / ok | yes | Extra — power-supply sag emulation oddity. |
| PowerSag2 | lv2-airwindows | suitable | 0 ms | zero | 0.23 % | ok / ok / ok / ok | yes | Extra — power-sag v2 oddity. |
| PurestConsole2Buss | lv2-airwindows | suitable | 0 ms | zero | 0.27 % | ok / ok / ok / ok | yes | Extra — PurestConsole2 buss half; pair-only, uncharacterised. |
| PurestConsole2Channel | lv2-airwindows | suitable | 0 ms | zero | 0.25 % | ok / ok / ok / ok | yes | Extra — PurestConsole2 channel half; pair-only, uncharacterised. |
| PurestConsole3Buss | lv2-airwindows | suitable | 0 ms | zero | 0.63 % | ok / ok / ok / ok | yes | Extra — PurestConsole3 buss half; pair-only, uncharacterised. |
| PurestConsole3Channel | lv2-airwindows | suitable | 0 ms | zero | 0.64 % | ok / ok / ok / ok | yes | Extra — PurestConsole3 channel half; pair-only, uncharacterised. |
| PurestConsoleBuss | lv2-airwindows | suitable | 0 ms | zero | 0.25 % | ok / ok / ok / ok | yes | Extra — PurestConsole buss half; pair-only, uncharacterised. |
| PurestConsoleChannel | lv2-airwindows | suitable | 0 ms | zero | 0.24 % | ok / ok / ok / ok | yes | Extra — PurestConsole channel half; pair-only, uncharacterised. |
| PurestDrive | lv2-airwindows | suitable | 0 ms | zero | 0.26 % | ok / ok / ok / ok | yes | Recommended — a subtle, safe saturator: bit-exact identity at drive=0, and even at drive=1 only 0.58 % THD with a flat response and -0.12 dB level. |
| PurestWarm2 | lv2-airwindows | suitable | 0 ms | zero | 0.24 % | ok / ok / ok / ok | yes | Extra — asymmetric soft warmth. |
| ShortBuss | lv2-airwindows | suitable | 0 ms | zero | 0.28 % | ok / ok / ok / ok | yes | Extra — subharmonic/distortion oddity. |
| Signal sifter | lv2-swh-plugins | suitable | 0 ms | zero | 0.10 % | ok / ok / ok / ok | yes |  |
| Sinus wavewrapper | lv2-swh-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| Slew | lv2-airwindows | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes | Extra — the original slew limiter. |
| Spiral | lv2-airwindows | suitable | 0 ms | zero | 0.24 % | ok / ok / ok / ok | yes | Extra — sine-based saturator v1. |
| Spiral2 | lv2-airwindows | suitable | 0 ms | zero | 0.33 % | ok / ok / ok / ok | yes | Extra — Spiral saturator v2, community-named; not characterised here. |
| TapeHack | lv2-airwindows | suitable | 0 ms | zero | 0.24 % | ok / ok / ok / ok | yes | Extra — tape-hack colour. |
| ToTape5 | lv2-airwindows | suitable | 0 ms | zero | 0.94 % | ok / ok / ok / ok | yes | Extra — tape emulation v5, superseded by ToTape6. |
| ToTape6 | lv2-airwindows | suitable | 0.396 ms | low | 1.13 % | ok / ok / ok / ok | yes | Extra — tape emulation that does what it says, but its DEFAULT is a +8.6 dB head bump at 50 Hz and +3.9 dB at 1 kHz — a colour that surprises on a live insert. |
| TransDesk | lv2-airwindows | suitable | 0 ms | zero | 0.50 % | ok / ok / ok / ok | yes | Extra — transistor-desk colour. |
| Tube | lv2-airwindows | suitable | 0 ms | zero | 0.22 % | ok / ok / ok / ok | yes | Extra — the original Tube saturator, superseded by Tube2. |
| Tube2 | lv2-airwindows | suitable | 0 ms | zero | 0.32 % | ok / ok / ok / ok | yes | Recommended — the stronger tube colour next to PurestDrive: flat +1.07 dB with 1.14 % THD at defaults, +4.5 dB and 7.7 % THD at tube=1 (peak -3.75 dBFS on a -6 dBFS sine). |
| TubeDesk | lv2-airwindows | suitable | 0 ms | zero | 0.54 % | ok / ok / ok / ok | yes | Extra — tube-desk colour. |
| Valve rectifier | lv2-swh-plugins | suitable | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes |  |
| Valve saturation | lv2-swh-plugins | suitable | 0 ms | zero | 0.12 % | ok / ok / ok / ok | yes |  |
| Calf Rotary Speaker | lv2-calf-plugins | conditional — wants MIDI in, which an insert never carries | 0 ms | zero | 0.39 % | ok / ok / ok / ok | yes |  |
| Calf Saturator | lv2-calf-plugins | conditional — wants MIDI in, which an insert never carries | 0 ms | zero | 0.25 % | ok / ok / ok / ok | yes |  |
| Calf Tape Simulator | lv2-calf-plugins | conditional — wants MIDI in, which an insert never carries | 0 ms | zero | 1.68 % | ok / ok / ok / ok | yes |  |
| BassDrive | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.71 % | dies / dies / ok / ok | no | Extra — bass drive/amp colour, +7.6 dB at defaults. |
| C* AmpVTS - Tube amp + Tone stack | caps-lv2 | unknown — not yet racked and unracked a thousand times | 0.010 ms | low | 3.02 % | ok / ok / dies / ok | no | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| Cabs | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.68 % | dies / ok / ok / ok | no | Extra — guitar cabinet sim (HPStack default). |
| Calf Crusher | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.38 % | ok / ok / blast / blast | no |  |
| Chebyshev distortion | lv2-swh-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.19 % | blast / blast / blast / ok | no |  |
| Console0Buss | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.20 % | dies / ok / ok / ok | no | Extra — Console0 buss half; -7.4 dB at defaults. |
| Console0Channel | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.20 % | dies / ok / ok / ok | no | Extra — Console0 channel half. |
| Console7Cascade | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 1.20 % | dies / ok / ok / ok | no | Extra — the heavier Console7 channel variant; about 2.3 times Console7Channel's cost with a 1-frame delay at 192 k. |
| Console7Crunch | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 1.20 % | dies / ok / ok / ok | no | Extra — Console7 channel with added crunch; same cost tier as Cascade. |
| Decimator | lv2-swh-plugins | unknown — latency never measured | — | unknown | 0.03 % | ok / ok / ok / ok | yes |  |
| Dirt | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.39 % | ok / ok / dies / dies | no | Extra — dirt/distortion; a 2-frame rate-dependent delay at 192 k the scan could not reconcile. |
| Gx Alembic | lv2-guitarix-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.40 % | dies / dies / dies / ok | no |  |
| Gx Studio Preamp Mono | lv2-guitarix-plugins | unknown — not soaked at every rate | 0 ms | zero | 1.14 % | dies / ok / ok / ok | no |  |
| Gx Studio Preamp Stereo | lv2-guitarix-plugins | unknown — not soaked at every rate | 0 ms | zero | 2.40 % | dies / ok / ok / ok | no |  |
| GxAmplifier-Stereo-X | lv2-guitarix-plugins | unknown — stability never measured | 0 ms | zero | 1.43 % | — / — / — / — | no |  |
| GxAmplifier-X | lv2-guitarix-plugins | unknown — stability never measured | 0 ms | zero | 0.73 % | — / — / — / — | no |  |
| GxCabinet | lv2-guitarix-plugins | unknown — stability never measured | 0 ms | zero | 0.08 % | — / — / — / — | no |  |
| GxFuzzFaceFuller | lv2-guitarix-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.29 % | dies / dies / dies / ok | no |  |
| GxFuzzMaster | lv2-guitarix-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.33 % | ok / ok / dies / dies | no |  |
| GxMetalAmp | lv2-guitarix-plugins | unknown — stability never measured | 0.448 ms | low | 0.91 % | — / — / — / — | no |  |
| GxMetalHead | lv2-guitarix-plugins | unknown — stability never measured | 0.271 ms | low | 0.92 % | — / — / — / — | no |  |
| GxMultiBandDistortion | lv2-guitarix-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.52 % | dies / ok / ok / ok | no |  |
| GxTiltTone | lv2-guitarix-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.71 % | dies / ok / ok / ok | no |  |
| MDA Bandisto | lv2-mdala-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.08 % | dies / ok / ok / ok | no |  |
| Smooth Decimator | lv2-swh-plugins | unknown — latency never measured | — | unknown | 0.04 % | ok / ok / ok / ok | yes |  |
| VyNil (Vinyl Effect) | lv2-swh-plugins | unknown — not soaked at every rate | 0.010 ms | low | 0.16 % | dies / dies / ok / dies | no |  |
| Wave shaper | lv2-swh-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.08 % | dies / dies / dies / dies | no |  |
| ZOutputStage | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.25 % | dies / ok / ok / ok | no | Extra — Z-series output-stage colour. |
| Calf Psychoachoustic Clipper | lv2-calf-plugins | unsuitable — costs more of a core than one insert may | 5.333 ms | low | 3.07 % | blast / blast / blast / blast | no |  |
| Calf Vinyl | lv2-calf-plugins | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.14 % | ok / ok / ok / ok | no |  |
| PointyGuitar | lv2-airwindows | unsuitable — costs more of a core than one insert may | 0 ms | zero | 11.81 % | ok / ok / dies / dies | no | Not recommended — guitar amp sim and the family's CPU outlier: 11.9 % of a core per instance at 96 k (22.5 % at 192 k). |
| Swanky Amp | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 10.667 ms | high | 3.10 % | ok / ok / ok / ok | no |  |
| Temper | DISTRHO-Ports | unsuitable — costs more of a core than one insert may | 0.021 ms | low | 3.29 % | ok / ok / ok / ok | no |  |
| ZamTube | lv2-zam-plugins | unsuitable — costs more of a core than one insert may | 0.333 ms | low | 4.57 % | ok / ok / ok / dies | no |  |
| dRowAudio: Distortion | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.08 % | ok / ok / ok / ok | no |  |
| dRowAudio: Distortion Shaper | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.09 % | ok / ok / ok / ok | no |  |
`,Ie=`# Spatial

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

14 plugins, 5 of them cleared to run on
the console's own audio thread. Figures are at 96 kHz; the columns are explained on
[the catalog index](index.md). Sorted by hosting verdict, then by name.

2 of them declare no LV2 category at all and are filed here from their own
name or description — our reading, not the plugin's claim.

| Plugin | Package | Host | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Certified | Note |
|:---|:---|:---|---:|:---|---:|:---|:---|:---|
| C* Narrower - Stereo image width reduction | caps-lv2 | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| MDA Image | lv2-mdala-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| MDA RoundPan | lv2-mdala-plugins | suitable | 0 ms | zero | 0.11 % | ok / ok / ok / ok | yes |  |
| MDA Stereo | lv2-mdala-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| Stereo Balance Control | lv2-x42-plugins | suitable | 0 ms | zero | 0.07 % | ok / ok / ok / ok | yes |  |
| C* Wider - Stereo image Synthesis | caps-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| Calf Haas Stereo Enhancer | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.14 % | ok / ok / blast / blast | no |  |
| Calf Multi Spread | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.37 % | ok / ok / blast / blast | no |  |
| Calf Multiband Enhancer | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 2.02 % | ok / ok / blast / blast | no |  |
| Calf Stereo Tools | lv2-calf-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.21 % | blast / blast / blast / blast | no |  |
| Srsly2 | lv2-airwindows | unsuitable — costs more of a core than one insert may | 0 ms | zero | 5.34 % | ok / ok / ok / ok | yes | Not recommended — stereo widener (a decorrelator, the worst case on any mono destination) and dear: 5.2 % of a core per instance at 96 k. |
| StereoSourceSeparation | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 42.677 ms | high | 0.16 % | ok / ok / ok / ok | no |  |
| The Function | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |  |
| ZamHeadX2 | lv2-zam-plugins | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | 0.10 % | ok / ok / ok / ok | no |  |
`,De=`# Uncategorised

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

9 plugins that declare no LV2 category, and whose own name and description
say nothing about what they do either. Everything else that declares nothing has been
filed on the page its name or description points at. Figures are at 96 kHz; the columns
are explained on [the catalog index](index.md). Sorted by hosting verdict, then by name.

| Plugin | Package | Host | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Certified | Note |
|:---|:---|:---|---:|:---|---:|:---|:---|:---|
| Acceleration2 | lv2-airwindows | suitable | 0 ms | zero | 0.25 % | ok / ok / ok / ok | yes | Extra — the newer acceleration limiter. |
| Mastering | lv2-airwindows | suitable | 0.010 ms | low | 0.89 % | ok / ok / ok / ok | yes | Extra — mastering chain (glue/clip/dither) with a one-frame delay; a mastering tool, not a live insert. |
| Nikola | lv2-airwindows | suitable | 0 ms | zero | 0.21 % | ok / ok / ok / ok | yes | Not recommended — 'audio tesla coil' distortion; the author himself says it does not sound nice. |
| Luxor | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.53 % | dies / ok / ok / ok | no | Extra — bright saturation colour. |
| Mackity | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.40 % | dies / ok / ok / ok | no | Extra — small-mixer preamp overdrive colour. |
| EasySSP | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |  |
| HiReSam | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | — | ok / ok / ok / ok | no |  |
| ReFine | DISTRHO-Ports | unsuitable — allocates, locks or calls the system inside the audio callback | 10.667 ms | high | 0.25 % | ok / ok / ok / ok | no |  |
| ZamNoise | lv2-zam-plugins | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.34 % | ok / ok / ok / ok | no |  |
`,Le=`# Utility

Governed by: \`docs/design/specs/2026-07-15-plugin-catalog-tiered-packaging.md\`

156 plugins, 24 of them cleared to run on
the console's own audio thread. Figures are at 96 kHz; the columns are explained on
[the catalog index](index.md). Sorted by hosting verdict, then by name.

7 of them declare no LV2 category at all and are filed here from their own
name or description — our reading, not the plugin's claim.

| Plugin | Package | Host | Latency at 96 kHz | Class | Cost at 96 kHz | 44.1 / 48 / 96 / 192 | Certified | Note |
|:---|:---|:---|---:|:---|---:|:---|:---|:---|
| Artificial latency | lv2-swh-plugins | suitable | 0 ms | zero | 0.02 % | ok / ok / ok / ok | yes |  |
| Audio Gain (Mono) | lv2-carla | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| Audio Gain (Stereo) | lv2-carla | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| C* Noisegate - Attenuate noise resident in silence | caps-lv2 | suitable | 0 ms | zero | 0.06 % | ok / ok / ok / ok | yes | Run at 192 kHz on 2026-09-05: finite, not silent, and identical to 48 kHz. |
| DCVoltage | lv2-airwindows | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes | Extra — adds a DC offset by design; a test utility, not an effect for a PA. |
| EdIsDim | lv2-airwindows | suitable | 0 ms | zero | 0.18 % | ok / ok / ok / ok | yes | Extra — M/S utility: outputs M on L and S on R, so R is silent for a mono source. |
| Flipity | lv2-airwindows | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes | Extra — polarity/swap utility, proven exact. |
| Golem | lv2-airwindows | suitable | 0 ms | zero | 0.18 % | ok / ok / ok / ok | yes | Extra — two-mic phase/blend utility for a stereo pair. |
| GxBooster | lv2-guitarix-plugins | suitable | 0 ms | zero | 0.06 % | ok / ok / ok / ok | yes |  |
| Inverter | lv2-swh-plugins | suitable | 0 ms | zero | 0.02 % | ok / ok / ok / ok | yes |  |
| LeftoMono | lv2-airwindows | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes | Extra — copies L to both outputs, bit-exact. |
| MS2LR | lv2-eq10q | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| Matrix Spatialiser | lv2-swh-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| Matrix: MS to Stereo | lv2-swh-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| Matrix: Stereo to MS | lv2-swh-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| Mega Delay Line | lv2-x42-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| Micro Delay Line | lv2-x42-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| MidSide | lv2-airwindows | suitable | 0 ms | zero | 0.18 % | ok / ok / ok / ok | yes | Extra — M/S encoder with no 1/2 scaling (M = L+R is +6 dB for correlated material, S = L-R). |
| Monitoring | lv2-airwindows | suitable | 0 ms | zero | 0.37 % | ok / ok / ok / ok | yes | Extra — monitoring utility (mono check, dither, speaker sims), proven to sum to mono correctly. |
| No Delay Line | lv2-x42-plugins | suitable | 0 ms | zero | 0.04 % | ok / ok / ok / ok | yes |  |
| Offset, sample-based | lv2-swh-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| Stereo Routing | lv2-x42-plugins | suitable | 0 ms | zero | 0.03 % | ok / ok / ok / ok | yes |  |
| ZamPhono | lv2-zam-plugins | suitable | 0 ms | zero | 0.05 % | ok / ok / ok / ok | yes |  |
| z-1 | lv2-swh-plugins | suitable | 0.010 ms | low | 0.02 % | ok / ok / ok / ok | yes |  |
| LSP Noise Generator x1 | lsp-plugins-lv2 | conditional — cost spikes far above its own median | 0 ms | zero | 0.47 % | ok / ok / ok / ok | yes |  |
| LSP Noise Generator x2 | lsp-plugins-lv2 | conditional — cost spikes far above its own median | 0 ms | zero | 0.51 % | ok / ok / ok / ok | yes |  |
| Calf Mono Input | lv2-calf-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.15 % | ok / ok / ok / ok | no |  |
| Calf X-Over 2 Band | lv2-calf-plugins | unknown — not yet racked and unracked a thousand times | 0.010 ms | low | 0.47 % | ok / ok / ok / ok | no |  |
| Calf X-Over 3 Band | lv2-calf-plugins | unknown — not yet racked and unracked a thousand times | 0.063 ms | low | 0.78 % | ok / ok / ok / ok | no |  |
| Calf X-Over 4 Band | lv2-calf-plugins | unknown — not yet racked and unracked a thousand times | 2.292 ms | low | 1.09 % | ok / ok / ok / ok | no |  |
| Carla-Patchbay (CV) | lv2-carla | unknown — stability never measured | — | unknown | 0.11 % | ok / ok / ok / ok | no |  |
| Crossfade | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |  |
| Crossfade (4 outs) | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |  |
| Exponential signal decay | lv2-swh-plugins | unknown — not soaked at every rate | 0 ms | zero | 0.03 % | ok / ok / blast / blast | no |  |
| Function modf (A) | lv2-ll-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |  |
| LR2MS | lv2-eq10q | unknown — not soaked at every rate | 0 ms | zero | 0.05 % | dies / ok / ok / ok | no |  |
| LSP A/B Tester x2 Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |  |
| LSP A/B Tester x2 Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |  |
| LSP A/B Tester x4 Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |  |
| LSP A/B Tester x4 Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |  |
| LSP A/B Tester x8 Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |  |
| LSP A/B Tester x8 Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.07 % | ok / ok / ok / ok | no |  |
| LSP Crossover LeftRight x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.71 % | ok / ok / ok / ok | no |  |
| LSP Crossover MidSide x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.71 % | ok / ok / ok / ok | no |  |
| LSP Crossover Mono x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.58 % | ok / ok / ok / ok | no |  |
| LSP Crossover Stereo x8 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.71 % | ok / ok / ok / ok | no |  |
| LSP Mixer x16 Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.08 % | ok / ok / ok / ok | no |  |
| LSP Mixer x16 Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.12 % | ok / ok / ok / ok | no |  |
| LSP Mixer x4 Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.04 % | ok / ok / ok / ok | no |  |
| LSP Mixer x4 Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.06 % | ok / ok / ok / ok | no |  |
| LSP Mixer x8 Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.05 % | ok / ok / ok / ok | no |  |
| LSP Mixer x8 Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.08 % | ok / ok / ok / ok | no |  |
| LSP Noise Generator x4 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.87 % | ok / ok / ok / ok | no |  |
| LSP Oscilloscope x1 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.95 % | ok / ok / ok / ok | no |  |
| LSP Oscilloscope x2 | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 2.05 % | ok / ok / ok / ok | no |  |
| LSP Profiler Mono | lsp-plugins-lv2 | unknown — latency never measured | — | unknown | 0.03 % | ok / ok / ok / ok | yes |  |
| LSP Profiler Stereo | lsp-plugins-lv2 | unknown — latency never measured | — | unknown | 0.03 % | ok / ok / ok / ok | yes |  |
| LSP Referencer Mono | lsp-plugins-lv2 | unknown — not soaked at every rate | 0 ms | zero | 0.86 % | ok / ok / ok / dies | no |  |
| LSP Referencer Stereo | lsp-plugins-lv2 | unknown — not soaked at every rate | 0 ms | zero | 1.70 % | ok / ok / ok / dies | no |  |
| LSP Return Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |  |
| LSP Return Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |  |
| LSP Send Mono | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |  |
| LSP Send Stereo | lsp-plugins-lv2 | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |  |
| Matrix Mixer 8x8 | lv2-x42-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.09 % | ok / ok / ok / ok | no |  |
| Mixer'n'Trigger | lv2-x42-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.13 % | ok / ok / ok / ok | no |  |
| MoNoam | lv2-airwindows | unknown — not soaked at every rate | 0 ms | zero | 0.19 % | ok / ok / dies / ok | no | Extra — bypass/mono/side switch utility, proven exact. |
| Mono to Stereo splitter | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |  |
| Phaserotate | lv2-x42-plugins | unknown — reports a latency it does not keep | 26.667 ms | high | 0.15 % | ok / ok / ok / ok | yes |  |
| Phaserotate Stereo | lv2-x42-plugins | unknown — reports a latency it does not keep | 26.667 ms | high | 0.28 % | ok / ok / ok / ok | yes |  |
| RightoMono | lv2-airwindows | unknown — latency never measured | — | unknown | 0.03 % | ok / ok / ok / ok | yes | The oracle proves it a 0 ms, bit-exact routing utility. |
| Stereo DJ X-Fade | lv2-x42-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |  |
| Surround matrix encoder | lv2-swh-plugins | unknown — not yet racked and unracked a thousand times | 0 ms | zero | 0.26 % | ok / ok / ok / ok | no |  |
| Audio File | lv2-carla | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | — | ok / ok / ok / ok | no |  |
| Big Meter | lv2-carla | unsuitable — has no audio output, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| C* Click - Metronome | caps-lv2 | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no | Functional oracle verified at 48/96 kHz, not yet re-run at the rig's 192 kHz. |
| Carla-Patchbay | lv2-carla | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | — | ok / ok / ok / ok | no |  |
| Carla-Patchbay (16chan) | lv2-carla | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | 0.15 % | — / — / — / — | no |  |
| Carla-Patchbay (32chan) | lv2-carla | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | 0.24 % | — / — / — / — | no |  |
| Carla-Patchbay (64chan) | lv2-carla | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | 0.45 % | — / — / — / — | no |  |
| Carla-Patchbay (sidechain) | lv2-carla | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | 0.09 % | — / — / — / — | no |  |
| Carla-Rack | lv2-carla | unsuitable — allocates, locks or calls the system inside the audio callback | 0 ms | zero | 0.03 % | ok / ok / ok / ok | no |  |
| Constant 1/pi | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Constant 2/pi | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Constant 2/sqrt(pi) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Constant e | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Constant ln(10) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Constant ln(2) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Constant log10(e) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Constant log2(e) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Constant pi | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Constant pi/2 | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Constant pi/4 | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Constant sqrt(1/2) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Constant sqrt(2) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Control Invert | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Control Linear Scale | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Control Low Pass | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Control Port Exponential | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Control Port Logarithm | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Control2MIDI | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function abs (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function abs (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function acos (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function acos (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function asin (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function asin (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function atan (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function atan (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function atan2(x,y) (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function atan2(x,y) (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function ceil (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function ceil (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function cos (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function cos (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function cosh (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function cosh (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function exp (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function exp (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function floor (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function floor (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function fmod(x,y) (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function fmod(x,y) (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function log (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function log (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function log10 (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function log10 (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function modf (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Function pow(x,y) (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function pow(x,y) (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function sin (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function sin (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function sinh (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function sinh (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function sqrt (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function sqrt (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function tan (A) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Function tan (C) | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| Klaviatur | lv2-ll-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | — / — / — / — | no |  |
| LFO | lv2-carla | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| LSP Oscilloscope x4 | lsp-plugins-lv2 | unsuitable — costs more of a core than one insert may | 0 ms | zero | 4.87 % | ok / ok / ok / ok | no |  |
| MIDI Channel A/B | lv2-carla | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Channel Filter | lv2-carla | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Channelize | lv2-carla | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Event Generator | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI File | lv2-carla | unsuitable — allocates, locks or calls the system inside the audio callback | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Gain | lv2-carla | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Generator | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Join | lv2-carla | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Pattern | lv2-carla | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Split | lv2-carla | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Step Sequencer8x8 | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| MIDI Transpose | lv2-carla | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Midi Event Map | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Onset Trigger - Bassdrum Detection Mono | lv2-x42-plugins | unsuitable — has no audio output, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Onset Trigger - Bassdrum Detection Stereo | lv2-x42-plugins | unsuitable — has no audio output, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
| Test Signal Generator | lv2-x42-plugins | unsuitable — has no audio input, so it is not an insert | — | unknown | — | ok / ok / ok / ok | no |  |
`,_e=`# Plugins, the rack, and skins

Each channel — and each bus and each output — carries an ordered **insert chain** of LV2
plugins. These are inserts, and they are a different thing from the channel's own EQ, gate
and compressor, which are native processing that is always present. See
[EQ and dynamics](eq-dynamics.md).

## Adding one

![Layouts, Plugin rack](images/plugins-1.png)
*The plugin rack: the ordered insert chain for the selected strip.*

From the **Plugins** tab on the channel strip, or from the **Plugin rack** chip. The
picker:

- groups a curated set by role — EQ, compressor, glue bus comp, gate, de-esser, limiter,
  reverb, delay, saturation, modulation, filter;
- lets you search;
- shows each plugin's **latency**, and can sort by it or hide anything that is not
  live-safe.

Pick one and it drops into the chain.

If the picker is empty, see
[the plugin catalog is empty](../troubleshooting/plugin-catalog-empty.md).

### Reading a picker row

Each plugin in the picker carries up to four chips after its name:

- **latency** — the delay the plugin adds, in milliseconds, tinted by how it sits against the
  live allowance. A trailing **?** means the figure is the curator's expectation and has not
  been measured on a rig yet.
- **family** — the house that makes it and its standing, such as \`LSP · established\`. A dashed
  chip reads \`unproven here\`: a house with no live history on this desk, admitted on its
  measurements alone — a standing, not a verdict against it. Hover it for the curator's note.
- **cost** — what racking it costs the path: nothing when it runs in the console's own engine,
  one graph buffer when it runs in the separate plugin host.
- **in-process** or **isolated** — shown with the plugin's details: whether it runs in the
  console's own engine or in the separate plugin host, where the strip pays one buffer for the
  round trip on top of the plugin's own latency. See
  [what suitable means](plugin-catalog/recommendations.md#what-suitable-means).

## The generated editor

Tap a plugin to open its editor. There is no hand-built panel per plugin: the editor reads
the plugin's own LV2 metadata and generates the right controls — knobs (linear or
logarithmic), toggles, steppers, dropdowns for enumerated choices, file pickers for things
like impulse responses.

It shows every parameter at once, sizing the grid to fit rather than hiding controls below
a scroll. A **bypass** A/B and a **remove** button sit in the header, and the plugin's own
LV2 **presets** load from the same place.

The consequence of generating editors is that a plugin the project has never seen works
the day it is installed.

## Order is signal order

In the **Plugin rack**, drag a unit to move it, or use its up/down buttons. Each unit
shows its position, name, on/bypass state and its own latency, with the chain's total
summed at the foot.

There are two racks — one for the selected **channel**, one for the selected **output** —
so a loudspeaker-management chain on an output works exactly like inserts on a channel.

Between the units, dashed chips mark the chain's named **feed points** — \`Pre-EQ\`, \`Post-EQ\`,
\`Pre-Fader\`, \`Post-Insert-A\` and the rest — at the place each one taps. A send or a recorder set
to that point hears the chain up to there and nothing after it, which is how you see at a glance
whether a send takes a plugin's latency with it.

## Latency

Every plugin costs something. The rack shows per-plugin and per-chain figures, the channel
tile carries a latency badge that turns hot when the path runs long, and telemetry reports
the mains-path total. Delay compensation keeps channels aligned with each other; it cannot
make the total smaller.

A plugin that is fine on two channels can be expensive on forty. The catalog's latency
figures and the live-safe filter exist for exactly that decision — see
[metering and latency](metering-latency.md).

## Skins

Panels can wear **skins**: a texture and accent per plugin family, so a wall of open
editors is easy to scan. Every panel wears the desk's [look](look.md) (theme, accent and
finish); the skin only tints its backdrop by the plugin's vendor, and a per-plugin picker in
the editor header pins any panel to a skin you choose.

## What is in the catalog

![Layouts, Plugin catalog](images/plugins-2.png)
*The plugin catalog: the curated set, with each plugin's measured latency and cost.*

A curated set, chosen and ranked, not everything installed on the machine. A plugin you
installed by hand will not appear even though the host can load it. That is deliberate:
the catalog is a live-safe shortlist, not an inventory.

Each row carries its measured **latency**, a **tier** chip — \`live\` in green at 5 ms or less,
\`studio\` in amber above that, \`unclassified\` in red where there is no measurement to tier it
by — and three
**destination** chips, **monitors**, **PA** and **FX return**, each tinted by whether the
plugin fits that job: *fits*, *check*, *not judged* or *does not fit*. Hover a destination chip
for the measurements that decided it. A star marks the curator's recommendation.

The measurements behind that ranking are published in full: [the plugin
catalog](plugin-catalog/index.md) lists every plugin the reference install carries with its
latency, its CPU cost and whether it has earned a place on the console's own audio thread,
and [what to reach for](plugin-catalog/recommendations.md) is the short list for a show and
for a studio mix.

Install a curated set with \`dnf\` — see [packages](../install/packages.md).
`,Oe=`# The clock

There are two clocks on this desk and they are not the same thing.

- **The graph clock** paces the mixer itself: the sample rate everything inside the console
  runs at, and the buffer size that decides how much latency that costs.
- **The REAC clock** paces a stagebox wire. Each REAC port is a segment with its own pace,
  and a box on that segment follows it.

They are independent. A stagebox running at 96 kHz on a console running at 192 kHz is a
normal, working rig: the bridge converts between them. That is why the panel has two tabs.

![Setup, Clock](images/reac-clock-1.png)
*The clock panel, PipeWire tab: the reference, the latency presets, the quantum and rate, and the buffer latency those two come to.*

**Setup ▸ Clock**, in the config zone.

## The PipeWire tab — the graph clock

### Latency presets

Three named pairs of buffer size and rate, safest first:

| Preset | Buffer | Rate |
|---|---|---|
| **Safe** | 256 frames | 48 kHz |
| **Low** | 128 frames | 96 kHz |
| **Ultra** | 64 frames | 96 kHz |

One press sets both. **Safe** is the between-songs setting; **Ultra** is the tightest the
desk offers. **Buffer latency** at the bottom of the tab is what the pair actually costs, in
milliseconds, so the trade is a number rather than a feeling. Set the quantum or the rate to
anything that is not one of the three and the preset row reads **Custom**.

### Quantum and sample rate

Set separately when a preset is not what you want. The rate menu offers what the active
output card actually supports, read from the card — not a list the desk imagines. The rate
applies live: nothing restarts and the show keeps running.

The rate shown is always the rate the driver **is** running, not the one you asked for. In
the rare case a driver refuses a pick, the panel says so — *driver kept X kHz* — instead of
displaying a number that is not true.

### The clock reference

The reference is the device whose clock the console derives its pace from. The menu lists
what is available, each entry graded:

| Grade | What it is |
|---|---|
| **audio interface** | A real interface. The best kind of reference. |
| **onboard codec** | The machine's built-in audio. Usable. |
| **display audio** | A clock that comes out of a monitor or a graphics card. Not a reference. |
| **software driver** | Not hardware at all. Not a reference. |

The menu opens on **Automatic — best available**, with the device it settled on named
underneath. The console picks the highest-graded one by itself and says why — *"an audio interface with
no known disqualifier — designate it explicitly if you know your clock"*. Pick one from the
menu to **designate** it, which stops the ranking from changing its mind later. The entry
that is currently pacing the graph is marked *(driving the graph)*.

If nothing worth following is present you can still own the pace, by switching on
**free-running**. That is an emergency configuration and the panel says so: every box locks
to a rhythm the console invented, with nothing outside checking it.

### Clock pace: Master or Follower

| | |
|---|---|
| **Master** | openmixer owns the pace. Every box locks to our grid. |
| **Follower** | Another device owns the pace. openmixer answers on its grid. |

Master is only offered when there is a reference worth propagating, or when you have turned
on the free-running override.

As a **Follower** the tab stops offering a rate — you are being told the number, not
choosing it — and reports instead **who owns the pace**, **the locked rate**, and whether
the lock is real or the pace is free-running.

Any clock warning the console raises appears at the bottom of this tab.

## The REAC tab — the wire

The REAC tab lists the **segments**: one per REAC port on this machine. A segment is
labelled by its port — **REAC A**, **REAC B** — and by the box on it, if there is one.

### Reading a segment card

| What you see | What it means |
|---|---|
| **REAC A · *box name*** | The port, and the box that is on it. |
| A badge: **Master clock** | This console is mastering that wire. |
| A badge: **Slave clock to …** | Something else is mastering it, and the card shows that device's address. |
| A badge: **Ready to drive** | Nothing is mastering the wire yet. |
| **96.0 kHz** | The rate the wire is running at right now. |
| **Pace: …** | Where the timing comes from. See the ladder below. |

**Show details** opens a popover with the box's model, its firmware version, the master's
address and its hardware identification. It is a popover on purpose: reading it does not
move the card, so nothing shifts under your finger mid-show.

### The pace ladder

**Pace** names what is actually timing the wire, best first:

| Pace | What it means |
|---|---|
| **hardware clock** | A real hardware clock on the network interface. The best answer. |
| **graph clock, as a reference** | The console's own graph clock, used as the reference the wire is paced from. |
| **the box's own slope** | The rate is being recovered from the box's own arrival timing. |
| **the foreign master** | Another desk is mastering this segment and we are following it. |
| **internal clock** | Free-running: the host's own clock, with nothing outside it. |

It is reported, never hidden. *Internal clock* is a working state, not a fault — it is what
you get with no hardware timestamping on the interface — but it is worth knowing that is
where the timing is coming from.

### Setting a segment's rate

REAC runs at **44.1, 48 or 96 kHz**. That is the wire, not the console: the graph can be at
192 kHz with a segment at 96 and the bridge converts.

Pick the rate and press **Apply**. It is a two-press control — the first press arms it,
the second fires — because of what it costs:

> Changing the rate re-establishes the segment on the wire: the box's inputs and outputs go
> silent for about six seconds while it re-locks. On a box carrying the PA return, that is
> the whole rig.

While it re-locks the card says **Re-locking…** and the rate control waits.

A few things the card will tell you rather than letting you guess:

- **A slave segment has no rate to set.** It follows the foreign master's pace, and the
  card says so instead of offering a control that would do nothing.
- **Wire *x* kHz · desired *y* kHz** means the pace you asked for and the pace on the wire
  disagree. A **Re-assert** button pushes it again.
- **pending** — the write is in flight. **refused: *reason*** — it was not accepted, with
  the reason.

Capture and playback always follow **one** wire rate together. A segment whose inputs and
outputs claimed different rates would be a fault, not a configuration.

### The segment's role

What the console intends to **be** on that wire:

| Role | Meaning |
|---|---|
| **Master (mixer)** | We are the desk. We master the segment and own its clock. |
| **Slave (recorder)** | We follow whatever masters the wire — a desk, or a box switched to master — and take its clock. |
| **Auto** | Listen first, then take the end the wire leaves open: master a vacant wire with boxes on it, follow a master that is already there. |

On a Roland desk this is one switch for the whole console. Here it is **per segment**: one port
can master a stagebox while another follows a desk.

A role change also re-establishes the segment, so it is the same two-press Apply with the
same warning.

Beside the menu is the **role state** — what the wire actually did, as opposed to what you
asked for:

| State | Meaning |
|---|---|
| **Applied** | It took. |
| **Re-establishing…** | In progress. |
| **Hunting for a desk…** | You asked to record and nothing is mastering yet. |
| **Not reported** | This console's engine does not report role state, so no conflict can be shown here. |

### When a role is refused

REAC allows exactly one master per segment, so the console refuses rather than fighting.
Each refusal names the remedy:

- *You asked to be the mixer, but a desk is already mastering this segment.* The console is
  holding and has asserted nothing on the wire. Switch to **Recorder**, or take the other
  desk off.
- *A stagebox on this segment has its REAC Mode switch on M (master).* Nothing on the wire
  will fix this. Set the switch to **S** and power-cycle the box.
- *Something is mastering this segment and the console cannot tell what it is.* Check what
  else is plugged into that wire.
- *You asked to record, but nothing is mastering this segment.* The role was asserted and
  the console is hunting; until a desk appears there is nothing to record.
- *A box is on this segment but has not joined.* It only connects when its link comes up,
  so waiting will not help — unplug and replug the cable at the box.

Where the conflict has a one-gesture answer, the card offers it as a **Switch to *role***
button.

## Which rate should I run?

- **The graph** at the highest rate your interface and your plugin load are comfortable at.
  The desk runs happily at 192 kHz.
- **A REAC segment** at 96 kHz unless you have a reason. That is the top of what REAC
  carries.
- **Matching them** avoids a conversion at the bridge. When they differ the rate picker says
  so in one line — *192 kHz resamples at the REAC bridge (the box runs ≤ 96 kHz) — still
  fine to use* — and offers to align the graph. It is advice, never a block: running
  converted on purpose is allowed and is what this rig does.

## Related

- [Metering and latency](metering-latency.md) — what the buffer size costs, measured.
- [Head-amp control](head-amp.md) — the boxes on those segments.
- [The console menus](menus.md) — where the panel lives.
`,Ne=`# Recording and virtual soundcheck

The console records itself. Every patched input, multitrack, at whatever rate the desk is
running — and then plays those tracks back **through the desk** as if the band were still
on stage.

That second half is the point. A virtual soundcheck lets you build a mix, ring out the
room, or teach somebody the desk, at four in the afternoon with nobody on stage.

![Layouts, Record](images/recording-1.png)
*The recorder: the transport and the arm count, the take being held, and the soundcheck section under it.*

**Layouts ▸ Record** opens the panel. The header also carries a **REC** button, so a take
can be started and stopped without a panel open.

## Arming

**Every patched input is armed by default**, plus MAIN. Aux and matrix outputs are not
recorded unless you ask for them.

Choosing what goes in the take is done on the whole wall at once, the same way sends-on-
faders is: switch the bay into record-arm mode and tap the strips out of the take that do
not belong in it — the talkback channel, a spare, an effects return you can re-make later.

A channel that is armed but has nothing linked into its input cannot be recorded. The header's
record controls carry an amber count of those channels; hover it for which ones. Patch them and
they come back on their own.

What each channel records is a **tap** — a point in its signal chain:

| Tap | What it holds |
|---|---|
| **Post-Trim** | The input, after the head-amp and before everything else. This is the one a virtual soundcheck plays back. |
| **Post-Fader** | The channel as it went into the mix — your EQ, your dynamics, your fader ride. Stems for post-production. |
| **Pre-Fader** | The processed channel without the fader ride. An opt-in. |

The default is **Post-Trim and Post-Fader** together: the raw material for tomorrow, and
the mix as you actually made it, in one take.

## Recording

Press **REC**. The panel shows the number of armed channels, the elapsed time, and an xrun
count if the machine drops anything.

**The take records at the console's own rate, bit for bit.** There is no converter in the
capture path and there never will be — the samples in the file are the samples the desk
mixed. That has an honest cost in disk: thirty-two tracks are roughly 22 GB an hour at
48 kHz, 44 at 96 kHz and 88 at 192 kHz. Choosing a high clock is choosing that.

The desk refuses to start a take it cannot finish. When it does, it says how much room it
needed and how much there is — the disk figure appears at exactly that moment and at no
other, because a free-space number sitting on screen going stale is worse than none.

The arm set is fixed when the take starts. A take has one channel set from beginning to
end; arm or disarm during a take and it applies to the next one.

**The take is stopped with a two-press STOP**, so a stray finger during a set does not end
the recording.

The record panel's phase chip says where the transport is: **idle**, **armed**, **recording** or
**stopping**, and **no recorder** on a console with no capture engine, where the panel says so
once rather than greying every control.

## Following a DAW (MMC)

A DAW or a show controller can drive the transports with MIDI Machine Control. The settings live
in \`/record/mmc\`: **enabled**, the **device id** the desk answers to (0x00–0x7F; the default
0x7F answers all-call only) and **record**, which is \`ignore\` or \`strobe\`.

**MMC cannot start or stop a take unless you say so.** With the default \`record = ignore\`, MMC
can play, pause, stop and locate the virtual soundcheck, but a take is never touched: a DAW's
STOP is the button pressed all evening, and it must not end the show's multitrack. Set
\`record = strobe\` once, on purpose, and RECORD STROBE starts a take and RECORD EXIT or STOP ends
it — through the same REC and STOP the panel uses, with the same refusals. MMC never arms a
channel; arming stays the patch and the per-channel opt-out.

**Enabled is off after every restart**, whatever it was when the desk went down, so a desk
restarted mid-show does not start taking orders from a DAW that is still sending. A message the
desk does not act on — a command it does not honour, another device id — is counted in
\`ignored\`, never dropped silently.

Not yet: the MIDI port that feeds these settings is not connected on this build. The row holds
and persists the settings, but no MMC message reaches the transports until the MIDI-in door
lands.

## The take library

Stored takes are listed newest first, each with the date, the length, the rate, the number
of tracks and which taps it holds. If you know a take's id you can also type it.

Up to five marks may appear on a take, and none of them implies the others:

- **DROPS** — the machine dropped frames while it was recording.
- **n EMPTY** — that many tracks came out at digital zero.
- **n NOT CARRIED** — that many channels were armed but nothing reached them, so the take holds
  no file for them.
- **UNMEASURED** (dashed) — tracks that carry no frame count, which the console cannot speak for
  either way.
- **UNSEALED HEADER** (amber) — the audio is all there and plays at its real length, but a
  file's header does not state that length yet, so another program reading it — a DAW, ffmpeg —
  would disagree about how long the show was. Nothing was lost, and the recorder's next start
  repairs it.

A clean take carries no mark at all, which is what makes a mark worth looking at.

## Virtual soundcheck

**Load** a take, then **Engage**. The soundcheck's own chip reads **no take**, **stopped**
or **playing** — or **no soundcheck** on a console with no playback engine. Every channel that has a track switches its source from
the live input to the recording; the rest of the desk is untouched. Your faders, EQ,
dynamics, sends, buses and outputs all work exactly as they do on a live band, because from
the channel's point of view nothing has changed except where its audio comes from.

Play, and mix.

Per channel you can leave one strip live while the rest play back — a talkback mic, or the
one instrument that turned up early.

**EJECT** is one big button and it is deliberately not confirmed. It is what you press when
the band walks in and the room is still hearing yesterday. Nothing is lost: the take is on
the disk and the mix is untouched.

**The soundcheck is transient.** It is not saved with the show and it does not survive a
restart — a console that came up playing yesterday's recording into the PA would be a
serious fault. The take *library* persists; loading one is always a deliberate act.

### If it refuses to play

**The take's rate must match the graph's.** There is no resampler in the playback path. A
take recorded at 96 kHz will not play into a graph running at 192 kHz, and the desk says
so rather than playing it at the wrong speed. Either set the graph to the take's rate — see
[the clock](reac-clock.md) — or convert the take when you load it, which the desk does
offline, with a progress bar, before it engages.

Tracks that came out empty are skipped and named rather than being engaged into silence.

## After the show

A take can be **rendered** with the harmonic processor run over it offline — the same
engine as the live one, but with the whole file to look at and no real-time budget, so it
can be far more thorough. The take keeps both the original and the render; nothing is
overwritten.

Takes can also be **exported** for a DAW.

If you line the three taps up in a DAW on the same bar, they are sample-aligned with each
other: the same moment in Post-Trim, Pre-Fader and Post-Fader is the same frame.

## Related

- [Scenes and sessions](scenes-sessions.md) — saving the console itself, which is a
  different thing from recording its audio.
- [The clock](reac-clock.md) — the rate a take is made at.
- [Metering and latency](metering-latency.md) — the xrun counter.
`,Fe=`# Room

Governed by: \`docs/design/specs/2026-09-08-room-analysis.md\`

Part of the **PA Setup** tab, alongside **Speakers**, on any output that feeds a box — MAIN, a
mix, a matrix. It reads the room the way Speakers reads a loudspeaker's arrival, against the
SAME measurement microphone, but it keeps the whole curve instead of reducing it to one number:
where the room is loud or thin, what bounces back and when, where it rings. **Align** is a
different tab — a channel-level instrument for two microphones on one source, not a PA-setup
step.

The PA Setup tab draws a numbered strip above Speakers and Room — **Aligned → Positions →
Modes confirmed → Proposals → Applied → Re-swept** — reading each step straight off the same
rows the two panels below it already carry. It is a map of where you are in the procedure, not
a control of its own.

**This page names what it finds — a curve, a set of reflections, a set of modes, a decay time
per band — and, for a confirmed mode, a narrow EQ cut you may apply.** A reflection is never
corrected here; see below for why. A mode is only ever corrected on your own APPLY gesture, and
only while this output's own FBS row is set to **live** — see "Room modes and mic positions"
below.

## Room — the transfer curve and the reflections

Pick the measurement microphone the same way you do for Speakers (the picker lives in the
same PA Setup tab; Room reads the same pick). Play pink noise through the output under test —
one output at a time, exactly Speakers' own rule, because a microphone hears the sum of
whatever plays.

The panel draws:

- **The transfer curve** — magnitude across the band, with coherence shaded underneath it.
  A flat line means the room is not colouring that range; a shaded band that drops out means
  the reading there is not to be trusted yet.
- **Reflections** — every distinct echo the desk can pick out of the first 80 milliseconds
  after the direct sound, each as *time after the direct arrival* (milliseconds), *how far
  that is past the direct path* (metres), and *how loud it is relative to the direct sound*
  (dB). A reflection is never "fixed" here — see below.
- **Reverberation time (RT60)**, one small bar per octave band (63 Hz to 8 kHz), read from the
  last take you recorded of this microphone. A room usually rings longer at the low end than
  the top, which is why one broadband number would hide the thing worth knowing.

**The measurement runs because the panel is open.** Opening it arms the desk to measure this
output against the microphone and no other; closing it stops. Nothing is measured that nobody
is looking at.

### Why nothing here is "fixed" automatically

A reflection is a second arrival in *time*, not a level problem at one frequency. An EQ cut
that flattens the notch it leaves in the curve does nothing for a seat two metres away — the
notch moves with where the microphone stood, the EQ band does not. The honest fix for a
reflection is acoustic: absorption, diffusion, or re-aiming the surface or the box. This
instrument names the reflection and stops there.

## Room modes and mic positions

A room mode is a standing wave — a property of the room's shape, not of where the microphone
happened to be. The tell is that its *frequency* does not move when the microphone does, while
a reflection's comb pattern moves with every position.

So confirming a mode takes more than one reading: measure, press **Measure this position**,
move the microphone, measure again. The desk compares the low end of each position's curve and
keeps only the peaks that show up, within a fraction of a bin, at every position measured. Two
positions is the floor, never the ceiling — keep adding positions until the confirmed set stops
changing, which the panel reports as *enough*.

Each confirmed mode is shown with its frequency, how far above the surrounding curve it reads,
and how many positions confirmed it.

**Clear** resets the position ledger for this output. It is explicit only — the ledger never
ages out on its own, because a sweep you stepped away from mid-room is still the sweep you will
come back to.

## Proposed cuts and APPLY

Each confirmed mode with real excess energy over the room's own floor lists as a proposed
narrow cut: the frequency, the depth, the confirming position count, and its own **Apply**
button — never a bulk "apply all". Applying spends the SAME depth ceiling and gate rails FBS's
own feedback notches use; a proposal that would have gone deeper says so ("bounded") rather
than quietly offering less than the room asked for.

**Apply only lands while this output's own FBS row reads Live.** Room Analysis carries no
switch of its own for this — it reads the FBS panel's own mode. In Off or Ring-out the row
refuses the write and the row explains why; the proposal stays on screen either way, so you can
see what would be spent before arming FBS live.

Applying the same proposal twice does not plant a second band — it retunes the one already
there. **Clear cuts** retires every band this instrument has planted on this output, and
nothing else: an operator's own EQ bands and any FBS or HRP bands are untouched.

Once applied, keep the tab open (or reopen it) and the same reading keeps running — that is
the re-sweep, no separate button for it. A **residual** figure appears beside the applied
proposal once the fresh curve has a reading at that frequency: how much of the mode is left
after the cut, so you can see what it bought.

## Related

- [Alignment](alignment.md) — Speakers, the PA Setup tab's other half, this reuses the same
  measurement microphone and safety rule from, and the loudspeaker delay this desk offers to
  fix arrival time; also where the tab's numbered procedure strip is described.
- [EQ and dynamics](eq-dynamics.md) — where an applied room-mode cut lands, tagged the same way
  an FBS or HRP band is.
- [Recording](recording.md) — the take RT60 is read from.
`,He=`# The analyser

The analyser draws a live spectrum: frequency across, level up. It is how you see what a
microphone is actually picking up, where a room resonates, and which frequency is ringing
before it becomes a howl.

![Meters, Analyzer](images/rta-1.png)
*The analyser: the live spectrum of the chosen source, with the tilt reference, the peak readout and the trace controls.*

There are two of it, and they are the same instrument:

- **Meters ▸ Analyzer** — a panel of its own, pointed at any source you choose.
- **The trace window in the channel view** — the same trace behind the channel's own EQ
  curve, so you shape the curve over what you are looking at. It is on every processing
  chip, not only the EQ one, and the thin line along it carries the analyser's controls
  wherever you are in the chain.

Both carry the same controls, in the same order, with the same words.

## Reading it

- **Across** — 20 Hz on the left to 20 kHz on the right, on a logarithmic scale, with
  octave landmarks marked at 20, 50, 100, 200, 500 Hz and 1, 2, 5, 10, 20 kHz. A console
  running at a rate whose top is below 20 kHz plots up to its own limit instead.
- **Up** — 0 dBFS at the top down to −100 dBFS at the floor.
- **Resolution** — a 16384-point analysis at the console's 96 kHz reference rate, drawn as between 128 and 640 bars depending on
  how wide the panel is. Widening the panel buys you detail rather than bigger bars.

**Near-silence draws as silence.** When nothing in the frame rises above −60 dBFS the panel
draws a flat floor rather than lifting the noise floor into a knee-high block of bars.
Anything real playing brings the whole spectrum back, its quiet detail included.

## The controls

| Control | What it does |
|---|---|
| **Source** | Which strip is analysed — an input, a bus, or the mains. |
| **Tilt** | The reference slope the trace is drawn against. |
| **Peak** | The loudest band right now, its frequency and its level. |
| **Peak hold** | Leaves a mark at each band's highest reading so a transient does not vanish before you have read it. |
| **Meter colour** | Colours the trace by level instead of drawing it in one colour. |
| **Tap** | Whether the trace is taken **Pre** the EQ, **Post** the EQ, or **Both** at once. |
| **Δ EQ** | Shades the gap between the pre and post traces — amber where the EQ boosts, blue where it cuts. Needs the tap on **Both**. |
| **Freeze** | Holds the live trace still so you can look at it. |
| **EQ curve** | Draws the analysed source's EQ response over the spectrum, for reference. It has no handles here and never follows the tilt — a transfer curve is not a spectrum. |
| **Ring-out arm** | Turns on the feedback ring markers. Off by default. |

### About the tilt

Raw spectrum magnitude is not what your ears do. Music and pink noise both fall off with
frequency, so a flat-sounding mix drawn flat looks like it is losing its top end.

**Flat** shows the raw magnitude. The **pink tilt** references draw the trace against a
falling slope, so material that sounds balanced draws roughly level and a genuine hump or
hole is obvious. Pick the slope that makes your usual programme material sit flat, then
read departures from it.

The tilt changes the **display** and never the audio.

### About Pre / Post / Both

**Pre** is what arrives at the EQ. **Post** is what leaves it. **Both** draws them
together, which is what you want while you are working: with **Δ EQ** on, the shaded gap
between them is exactly what your EQ is doing, drawn on the material rather than as a
theoretical curve. **Δ DRIVE** does the same for the drive stage: the signal entering it is
drawn as a ghost under the signal leaving it, so the harmonics the drive added read as the gap.

If a source is **muted**, the panel says so. A post-EQ trace on a muted channel is floored;
a trace that is still painting is the pre-EQ input, which is a useful thing to see and a
confusing one if you have not noticed the badge.

Two chips sit on the analyser's line to say so: **Muted** (red) when the analysed source is
muted, and **No post-EQ** when this source has no post-EQ trace at all, so what you see is its
pre-EQ input, dimmed. The channel view's own trace line carries the same **Muted** chip.

## Seeing a feedback ring

**Ring-out arm** turns on the feedback markers. When it is on, the analyser flags the bands
that look like a ring rather than like music, and a trace log below records what was
flagged and when. Each flagged band is a red chip with its frequency; hover it for
the notch the desk would suggest, its depth and Q.

A ring on the analyser looks different from music, once you have seen one:

- **A single, very narrow spike**, one bar wide, where music is broad.
- **It stays put.** A musical note moves; a ring sits on one frequency because the
  frequency belongs to the room, not to the player.
- **It grows steadily** rather than being struck and decaying.
- Often **its harmonics come up with it** at exact multiples, as the loop gets going.

The markers are **off by default** on purpose: a sustained musical tone — an organ pedal, a
held synth pad, a bowed note — has the same narrow, stable shape and gets flagged. Arm them
when you are ringing a room out, not through a set.

Seeing a ring and *fixing* it are different jobs. The analyser shows you; the automatic
corrector plants the notch. See [feedback suppression](fbs.md), and its
[worked example](fbs.md#worked-example-ringing-out-a-vocal-microphone).

## The trace window and the FX curve window

The channel view's second row holds two pictures, side by side:

| Window | What you see |
|---|---|
| **The EQ graph + RTA window** | The analyser, with the channel's EQ response over it — on every chip, always. |
| **The FX space's curve window** | The picture of the chip you have open — the gate's or compressor's transfer curve with its live gain reduction, the drive's shaper, the delay's tap train, the reverb's decay — beside the chips it belongs to. |

Neither window takes the other's place. Opening the gate shows the gate's curve next to the
chips and leaves the spectrum where it was, so you can read the notch you are cutting and the
threshold you are setting at the same time; the analyser's peak hold, colour, tap, Δ and any
freeze are never touched by a chip press. A chip with no picture of its own — EQ, whose
picture IS the analyser's surface, or sends — draws no curve window at all, and the room it
would have taken goes to the windows beside it.

The analyser's own controls stay on its line, so the trace never loses them.

## Why a channel is armed

The RTA switch on a channel is not the only thing that arms its analyser, so the bar beside
the switch says **who is holding it** — \`armed: SEL, FBS\` means the channel is both the
selected strip and under feedback detection.

The reasons the desk names:

| Reason | What it means |
|---|---|
| **SEL** | This channel is the console's selected strip. |
| **MANUAL** | You armed it with the RTA switch. |
| **FBS** | The feedback suppressor is hunting on this channel. |
| **HRP** | The harmonic processor is analysing this channel. |
| **ALIGN** | An alignment measurement is using this channel — its own, or as the reference. |
| **ROOM** | A room measurement is using this channel. |

They are independent. Turning the RTA switch off drops **MANUAL** and nothing else, so a
channel FBS is working on stays armed and keeps saying so; selecting another strip drops
**SEL** and leaves the rest. **The analyser goes off only when the last reason lets go.**

Of the six, **MANUAL is the only one a show file remembers**: saving a session stores the
channels you armed yourself, never the one that happened to be selected or the ones a
detector was working on when you saved.

## Nothing computes unwatched

An analyser that is not on screen is not running. The console only produces a spectrum for
a panel that is actually displayed, which is why the trace takes a moment to arrive when
you open the panel or switch strips, and why leaving analysers armed all over the desk does
not cost you anything.

This is also why the trace behind the EQ curve follows the selected strip: the feed is
pointed at the strip you are looking at.

## Related

- [EQ and dynamics](eq-dynamics.md) — the curve the trace sits behind.
- [Feedback suppression](fbs.md) — the automatic corrector.
- [The harmonic processor](hrp.md) — the other reader of this spectrum.
- [Metering and latency](metering-latency.md) — level metering, which is a different job.
`,Be=`# Scenes, snapshots, and saving your work

Three different things, easy to confuse, each with its own job.

| | What it holds | What it is for |
|---|---|---|
| **Session** | the whole console | the rig and the show |
| **Scene** | a named snapshot you jump between | a song, a cue, a support act |
| **Channel config** | one channel's processing | a sound that travels between gigs |

## Sessions

![Setup, Sessions](images/scenes-sessions-2.png)
*Sessions: the saved consoles on this server, and the autosave the desk keeps for itself.*

A **session** is the whole console saved at once: every level, mute, solo and send, the
buses, the matrix, DCA and mute-group membership, every plugin chain with its parameters
and presets, the routing, and the surface layout.

- Save with the header's **Save session** button or \`Ctrl\`/\`⌘\`+\`S\`.
- The header's **Setup** menu opens the session browser, which lists, loads and deletes
  them.
- A session loads **atomically** and pushes itself to every connected screen.

A session also records the **hardware it expected**. Load it onto a rig missing a stagebox
and it tells you what is absent, instead of presenting a console with silently dead
channels.

### Autosave

The console is autosaved continuously, and a restore point is written immediately before
any session load — so "that was the wrong session" is recoverable, and a restart during a
show comes back where you were.

The other side of that coin: a console left in a bad state is autosaved in that bad state.
If the desk comes back broken after **every** restart, see
[a poisoned autosave session](../troubleshooting/poisoned-autosave.md).

Keep a **named** session saved for each rig. It is what the desk falls back to when the
autosave is not usable.

## Scenes

![Scenes, Scenes](images/scenes-sessions-1.png)
*Scenes in the config zone: store, recall, and what a recall is allowed to touch.*

**Scenes** are the many named snapshots you jump between during a show. Recall one and the
whole desk moves to it. The digit keys \`1\`–\`8\` recall from anywhere on the surface.

### Recall-safe

Recall-safe is what makes scenes usable live. Flag a channel — or just one of its scopes:
**fader**, **mute**, **sends**, **eq**, **dyn**, **inserts** or **patch** — as safe, and a
recall leaves it exactly as it is. On the channel view the recall-safe panel shows each scope
as a chip, lit while that scope is safe, and its header carries a summary chip — the number of
safe scopes, or **SAFE** when the whole channel is — so a closed panel still says it.

**Patch** keeps the channel's input patch: a scene that plugs a different source into that
channel leaves its cable where it is, and one that unplugs it leaves it plugged. The rest of
the scene's patch still lands on the other channels.

So the vocal you are riding survives a scene change; or the whole monitor world stays put
while front of house moves through cues.

The safe mask is live show state, shared to every screen, and it holds until you clear it.
It is not part of the scene: it is a property of *now*.

### Working with scenes

A workable pattern for a show with cues:

1. Build the mix. Save it as a **session** — that is your baseline and your safety net.
2. Set the desk for the first song and store a scene.
3. Repeat per song or per cue.
4. Before doors, set recall-safe on anything you intend to ride by hand.
5. During the show, recall scenes; ride what is safe.

## Channel configs

A **channel config** captures one channel's processing — its plugin chain and its EQ, gate
and compressor — as a reusable named preset: "Lead vocal", "Kick in".

Save it from a channel you like, apply it to another. A known-good vocal or drum sound
travels between gigs without carrying a whole session with it.

## Undo

\`Ctrl\`/\`⌘\`+\`Z\` undoes, \`Ctrl\`/\`⌘\`+\`Shift\`+\`Z\` (or \`Ctrl\`+\`Y\`) redoes. The stack covers
console edits, which makes an accidental drag on a fader wall recoverable without
reloading a session.

## Saved patches

The Sessions panel also keeps a library of saved **patches**: a patch is the crosspoints alone,
so loading one re-patches the desk and leaves the mix as it is. Save, load and delete them there.

## Where the files are

Sessions, scenes, patches and channel configs are plain JSON under the state directory.
See [state and session directories](../admin/state-and-sessions.md) for the layout, and
[backing up sessions](../admin/backup.md) for what to copy before a gig or an upgrade.
`,Ge=`# Sends, buses, groups and DCAs

## Assigning a channel

Where a channel's audio goes is two decisions, and they are separate.

**MAIN** — on or off. A channel with MAIN off is still in the desk, still metering, still
feeding its sends; it simply is not in the house mix. That is what you want for a click
track, a talkback mic, or a source that only ever feeds a monitor.

**Groups** — a chip per group bus. Ticking one sends the channel into that group, which
then folds into MAIN under its own fader and its own processing.

Both live in the **Routing** panel for the selected strip — **Layouts ▸ Routing**, which
opens beside the bus masters so you can assign channels into a group and ride that group's
fader on one screen.

A channel can feed MAIN directly, or through a group, or both. Through a group *and*
directly is usually a mistake — it arrives twice, at two levels, and the group fader only
moves one of them.

Select a **group** strip instead and the Routing panel turns round to the group's side: a
**MAIN** chip for whether the group folds back into MAIN — off makes it a stem — and a chip per
input channel for its members, the same assignments seen from the group.

**What this stage guarantees:** Every sample this stage produces is a finite number — never NaN, never infinite. Every source feeding this bus is summed linearly, coefficient times signal, with no other mixing step.

## Aux sends and sends-on-faders

![Layouts, Sends](images/sends-buses-dcas-1.png)
*Per-channel sends for the selected strip: level and tap point per bus.*

Two ways to work them.

**The Sends tab** on the channel strip shows one channel's sends to every bus as a row of
faders, each with a **tap point** selector — pre or post fader, with the SSL- and
Roland-style landmark presets (top of channel, pre-EQ, post-EQ, pre-fader, post-fader)
alongside the plain choices.

**Sends-on-faders** is faster for building a monitor mix. Select the aux — SEL on its
strip, wherever it is on the desk — and press the **SENDS ON FADERS** button, or the \`F\`
key: the whole fader wall becomes that aux's send levels. Every input fader is now its send
into the selected aux, with a per-channel **PRE/POST** tap and an **IN/OUT** include toggle.
Press \`F\` again to return to the main mix.

The strip you select is what the bay points at, so there is no separate target to keep in
step. With nothing selected the picker beside the button names the aux instead; select any
strip and the picker greys out, because the selection is now doing that job.

The bay's appearance changes distinctly in sends-on-faders, because moving what you think
is a channel fader and actually moving a send is a mistake worth designing out.

## All channels into one bus

That is the monitor engineer's view: when you are building the drummer's wedge you do not
want one channel at a time, you want the whole band's contributions to that one wedge on one
screen. It is the same gesture as everything else — **select the bus, press SENDS ON
FADERS** — and the wall becomes every channel's send into it, on the big faders.

The bay turns round with the selection:

- select a **bus** and press SENDS — every channel's send *into* that bus, on the wall;
- select a **channel** and press SENDS — that channel's send *out* into every bus, drawn as
  a rail of buses with the channel's own fader beside it;
- select **nothing** and the picker beside the button names the bus, as it always did.

Both directions are the same levels on the same rows, so it never matters which way round
you came at them. The **Sends** tab on the channel strip shows the second of those in
miniature, for when the wall is busy with something else.

## Bus masters, subgroups and glue

![Layouts, Bus masters](images/sends-buses-dcas-2.png)
*Bus masters, with the Mute Groups section where mute-group membership is assigned.*

Open the **Sends** chip to reach the **Bus masters** panel. Each aux and group bus has:

- a **fader**;
- a **CHAIN** button that opens the bus's own reorderable processing — a bus is a strip
  too, with its own EQ, dynamics and inserts;
- a one-click **+GLUE** bus compressor;
- an **N−1** mix-minus toggle with a per-channel exclude list, for clean feeds.

A **subgroup** is a group bus used as one: channels feed the group, the group feeds the
main, and the group's fader and its inserts sit over all of them.


## Worked example: building a wedge mix on the faders

The drummer wants more keys and less guitar in wedge 1, which is fed by **Aux 1**.

1. **Select Aux 1.** Switch the bay to the **Aux** layer and tap the Aux 1 strip, or pick
   it from the target menu in the bay toolbar.
2. **Press SENDS ON FADERS** in the fader-bay toolbar, or press \`F\`. The bay changes
   appearance distinctly — that change is deliberate, because moving what you think is a
   channel fader and actually moving a send is a mistake worth designing out.

![The fader bay in sends-on-faders](images/sends-buses-dcas-3.png)
*Sends-on-faders: every input fader is now its send into the selected aux, with a per-channel tap and include toggle, and the aux master pinned beside them.*

3. **Every input fader is now its send into Aux 1.** The keys channel and the guitar
   channel are wherever their sends to that wedge currently sit.
4. **Push the keys send up** and **pull the guitar send down**, listening on the wedge or
   on cue.
5. **Check the tap on each.** A **PRE** send ignores the channel's main fader, which is
   what you usually want for a wedge: pulling the guitar down in the house should not
   change what the drummer hears. **POST** follows the house fader, which is what you want
   for a reverb send.
6. **Press \`F\` again** to return. The faders are back to the main mix, exactly where you
   left them.

**What you should see:** the two faders you moved are at new positions in sends-on-faders,
and the main mix is untouched when you come back out.

**What it means if you do not:**

- **The faders did not change appearance.** Sends-on-faders did not engage. Check a bus is
  actually selected — with no target there is nothing to be the sends *of*.
- **Moving a send changed the house mix.** You were not in sends-on-faders; you moved
  channel faders. Press \`F\` and check the bay's appearance before touching anything.
- **The wedge did not change.** The send moved but the wedge is not fed by that aux. Check
  which bus feeds that output in [the patchbay](patchbay.md).
- **Pulling the guitar down in the house also pulled it out of the wedge.** That send's tap
  is Post-Fader. Set it to Pre.

## Mix-minus

Mix-minus (N−1) builds a feed that contains everything *except* a chosen channel — a
presenter's earpiece that carries the show but not their own voice, a remote contributor
who should not hear themselves delayed.

Toggle it on the bus and set the exclusions per channel.

## DCAs

A DCA routes **no audio**. Its fader trims all its members together, so a channel can
belong to a DCA and still take its own path through the desk untouched. That is the whole
difference from a group: a group is a bus that audio flows through; a DCA is a control
that moves other faders.

**A DCA is a strip.** Page the fader bay to the **DCA** bank and there they are, with the same
chrome as every other strip: the fader is the DCA's own level, the head is its name and its SEL.

**Assigning it is the traditional gesture.** Press a DCA's **SEL** and the bay goes into
assignment for it: every channel strip's SEL key becomes **IN** / **OUT** for that DCA, lit on
the channels it already holds. Press the strips you want. Nothing else moves — a member's own
fader stays exactly where you left it, which is what a DCA is. Press the DCA's SEL again to
leave; another DCA's SEL moves the assignment straight to it.

**The chips are the fast way.** The ⚙ beside the DCA chips in the fader bay's control line opens
the manager: a card per DCA with its name, and a chip per channel. Tick a whole section there in
one glance. It is the same membership — what you do on the bay shows in the chips, and the other
way round.

The chips beside the ⚙ do something else again: one tap **spills** that DCA — its master and its
members alone on the bay — and a second tap brings back the layer you were on.

DCAs can nest.

## Mute groups

In the same master bay, in the **Mute Groups** section. Each group has a **MUTE** button
that silences and later restores every member at once, and a **MEMBERS** popover with a
checkbox per input.

A channel muted by a group keeps its own mute state underneath — release the group and it
returns exactly as it was, rather than un-muting something you had muted deliberately.

The group MUTE buttons are mirrored onto the fader-bay toolbar so you can fire them
without leaving the wall. There each group is a chip with its name and its members,
lit red while the group is muting; a DCA's chip on the same line lights instead while that DCA
is spilled onto the bay.

## Which one do I want?

| Want | Use |
|---|---|
| A separate mix at a different balance (monitors, an FX feed) | an **aux** |
| One fader and one compressor over a group of channels that all go to the main | a **group** / subgroup |
| One fader over channels that keep their own routing | a **DCA** |
| One button that silences a set of channels | a **mute group** |
| A feed of everything except one channel | **mix-minus** on a bus |
`,We=`# The Setup panels

Everything behind the header's **Setup** menu. These are the between-songs settings —
what the console is, what hardware it talks to, and how it behaves — as opposed to the
things you ride during a show.

![Setup, Allocation](images/setup-1.png)
*A Setup panel in the config zone: one panel at a time, in the reserved column at the top right.*

They all open in the **config zone**, the reserved column at the top right, one at a time.
On a narrow screen it arrives over the right-hand edge with a dimmed backdrop; tap the
backdrop to send it away.

## Show setup assistant

Open it from **Setup ▸ Show setup**. It is a checklist for taking the console from wherever
it is to a show ready to mix, one numbered step at a time: **Session, Stageboxes, Allocation,
Placement, Outputs, Configs, Save.**

A step is only marked done because the console's own state says so, never because you clicked
through it. Open the panel on a console that is half set up and it starts you at the first
step that is not done yet.

### Guided

Walk the steps yourself, one at a time:

1. **Session** — name the show. **New session** starts a blank show: it keeps this room's
   output routing, cue setup and REAC segment settings, and drops everything about the
   previous gig — channel names, patch, EQ, sends, all of it. Use it when the hardware is
   already wired the way you want and you are starting a fresh gig on it. If the console
   carries work that has not been saved under a name, you are asked to save it first, or you
   can discard it.
2. **Stageboxes** — choose which of the boxes the console can see belong to this show.
3. **Allocation** — the console proposes a channel and bus count that covers the boxes you
   picked. Some allocation changes only take effect after a restart; the step says so and
   names the command to run.
4. **Placement** — the console patches each included box's inputs onto channels, one box at a
   time, and shows you where each one landed.
5. **Outputs** — confirm MAIN has somewhere to go. The console never leaves MAIN unpatched, so
   this step will not let you skip past it.
6. **Configs** — the console offers any saved channel settings it recognises for the boxes you
   picked. Apply or dismiss each one.
7. **Save** — give the show a name to save it under. The step only turns green once nothing is
   left unsaved.

Whatever a step refuses, the refusal is shown right there, on that step.

The steps are drawn as a numbered strip, each number a chip tinted by its state — grey while pending,
amber for the step you are on, green once done and red where it is blocked — so the whole walk
reads at a glance. The PA Setup tab draws its own procedure the
same way (see [room](room.md)). On the **Stageboxes** step each box shows its model in a chip,
green when it is ready and amber when it is not, and an **IN** chip once it is included; on
**Configs**, each offer is tagged **same box input** in green when it matches a box input by
identity, or **same family** when it only matches by kind of box.

### Auto

One button, over the same seven steps, with the console choosing the answers: a blank session
named after the included boxes and the date, every present box included, the smallest
allocation that covers them, each box placed in the order it was found, MAIN and cue left
exactly as they were, and any saved channel settings that match a box leg by identity applied
without asking (a settings match by family only is proposed, never applied on its own). Auto
stops at the first step it cannot get through — an allocation that needs a restart, a box the
console cannot place — and shows why, on that step.
 The step where it halted carries a red **STOPPED** chip.

## Allocation

**Build your console for the gig.** A channel count, and a count of each kind of bus —
aux, group, matrix, DCA, mix-minus and mains. Every summing bus is then sized to the
channel count so that every input can reach every bus.

Presets take you from the minimum, 16 channels and 8 buses, up to 96 and 32. **Load
defaults** puts the form back to what the server starts a fresh console with.

The panel shows what is left of the path budget as you change the numbers, so you find out
that an allocation is too big for the machine here rather than during a set.

The console cannot be made **smaller** mid-show. Asking for fewer inputs than the desk is
holding is refused, and the refusal says how many it holds.

## Adapters

The I/O endpoints the console talks to: a REAC transport, a network audio device, a control
surface. Each row shows its type, its status and its key settings.

The add and edit forms are **generated from the adapter type itself**, so a type that gains
a setting shows it here with no change to the surface. A REAC adapter reports its own link
state — established, probing, unconfigured — rather than a generic running/stopped lamp,
because "the process is up" and "the wire is carrying audio" are different facts.

## Control surfaces

**Setup ▸ MIDI Controllers** — the physical control surfaces, an X-Touch first among them.

Each row carries a **presence** lamp, refreshed every couple of seconds by the server
actually probing the device, and an **enabled** switch. The switch is your standing intent:
an enabled surface connects itself when its device appears and detaches cleanly when it
vanishes, and it survives a restart. A surface that is configured and unplugged stays in
the list, unlit — the desk keeps knowing about your control surface between shows.

Two things make adding one quicker, and neither happens without you:

- a **Preset** picker fills the add form from a template for a known surface;
- a **first-run offer**: when a recognised surface is plugged in and nothing is configured
  yet, the panel offers it with an explicit **Add** or **Not now**. It is never adopted
  silently, and once any surface is configured the offer stops appearing.

## Gestures

Two timings that every attached control surface and the touchscreen read live:

- **Double-tap window** — how long the desk waits for a second tap before treating the
  first as a single one.
- **Long-press threshold** — how long a press must be held to count as a hold.

Raise the double-tap window if your second tap keeps being missed; lower it if two
deliberate presses are being read as one gesture.

The **server has the last word** on the range: type a figure outside it and the field
re-seeds with what the desk actually kept, so the panel never shows a value the console is
not using.

There is also the **confirm destructive actions** switch, which governs whether removing
things asks first. See [scenes and sessions](scenes-sessions.md).

## Interface takeover

**Setup ▸ Patchbay** — the exclusive-control switch, named for what it protects rather than
the panel it opens.

The console can take exclusive control of the audio interface, severing every other
application's link to the sound card. On a dedicated rig it removes a whole class of
contention problems; on a shared desktop it would silently cut every other application's
audio, which is why it is **off by default**.

The panel keeps two facts apart, deliberately:

- **what you want** — the switch;
- **what the console actually holds** — the status line under it.

So it says *holding*, or *wanted but not held yet*, or the reason it was refused. It never
shows a lit lamp for a hold that is not there.

See also [the patchbay](patchbay.md#exclusive-control).

## Discovery

The network audio devices the console has seen — REAC, Dante, AES67 — with each one's
protocol, name, address and channel count, and a **Scan** button to look again. Each device's protocol is a chip at the start of its
row, and the same chip marks each row of the list of places discovery could not look. **Add as
adapter** turns one into a configured adapter in one press.

The empty state is not one state, and the panel says which one you have:

- discovery swept the network and found nothing;
- discovery has not looked yet;
- discovery **could not** look, and why.

That last one matters: a stagebox that is busy carrying audio can be too busy to answer a
probe, and a panel that reported it as "no devices found" would be telling you the opposite
of the truth. The same facts reach the header's warnings badge, so you do not need this
panel open to know discovery is blind.

Below the devices, **Patchbay nodes** is the override on what the patchbay shows. A node
the default filters hide — a video capture card that also carries audio — can be
**included**, and anything you have included or excluded carries a **Reset** back to the
default. Each override is tagged **Included** or **Excluded**. The console's own internal plumbing is never offered.

## Stageboxes

The REAC boxes this console knows: name them, bind them, and **build a patch for a box that
is not here yet**.

That last part is what the panel exists for. Until a box is plugged in there is nothing to
patch against, so a show's setup could not begin until the truck arrived. Add the box you
know is coming, patch the gig against it, and when the real one turns up it takes over the
row.

Real and prepared boxes are **one list** on purpose: they are the same thing, and the only
difference is whether a recognition key has turned up yet. A prepared box becoming real is
one row learning its key, not a move between two collections.

The models offered come from the console itself, along with each one's input and output
counts, so the panel can never offer a box the console would refuse.

See [head-amp control](head-amp.md) for what those boxes do once they are on the wire, and
[the clock](reac-clock.md) for the segment they sit on.

## RME TotalMix

Where an RME interface is in use, the console **owns** its internal routing.

An RME normally does its own monitoring inside the box, which means audio can reach the
outputs without passing through the desk. Arming ownership declares a straight-through
output map at unity and zeroes every hardware-input crosspoint, so the interface stops
routing around the mix.

It is **off by default and it is a real decision**: turning it on cuts the interface's own
zero-latency direct monitoring. Turn it on when the console is the mixer and you want one
signal path; leave it off if you are relying on the box's own monitoring.

The panel binds to what the console has **declared**, not to a reading of the hardware —
these controls cannot be read back — and re-declares the whole map at boot, whenever the
interface reconnects, and whenever you press **Re-assert routing**.

Phantom power and pad are not here: they belong to the source. See
[head-amp control](head-amp.md). The clock is not here either; see
[the clock](reac-clock.md).

## Network

The address and port the server is answering on, each value shown with **where it came
from** — a persisted setting, a command-line flag, an environment variable or the built-in
default, highest precedence first.

You can edit the persisted override: fill a field and it is persisted and outranks the
command line and the environment at the next boot; empty it and the lower layers win again.

The server does not re-bind a running listener, so a change is flagged **takes effect on
restart** rather than pretending to have applied.

## OSC control

Not a panel: the console speaks OSC to any controller or script that sends it UDP datagrams,
through a small service that runs beside the server. Nothing on the desk shows it, so it is set
up from the machine the console runs on.

It starts only when you give it a port. There is no default, because no OSC port is registered
and any number would borrow another product's meaning. Copy the example and set yours:

\`\`\`sh
sudo cp /etc/openmixer/osc.env.example /etc/openmixer/osc.env
sudoedit /etc/openmixer/osc.env          # set --port, and --console if web.port is not 8080
systemctl --user restart openmixer-server
\`\`\`

The service (\`omx-osc.service\`, from the \`openmixer-osc\` package) starts and stops with the
console. Without \`osc.env\` it is skipped, not failed, and \`systemctl --user status omx-osc\`
says why.

An address is the console's own path followed by the field, under \`/omx\`: a controller sending
the float \`-12\` to \`/omx/channel/input/1/fader/db\` puts input 1's fader at −12 dB, exactly as the
fader on the desk would, and the desk's fader moves. Every row and field the console serves has
an address and nothing else does. Send \`/omx/_/declare\` to be told the whole list. A write the
desk refuses is answered on \`/omx/_/error\` with a reason code, never dropped. Wildcards are not
supported: a write goes to one address.

If a controller sends nothing back and the fader does not move, check in this order: the port
in \`osc.env\` matches the controller, the firewall lets that UDP port in, and \`systemctl --user
status omx-osc\` shows it running.

## Plugin analysis

Plugin cost measured **on this machine**, beside the figures the catalog ships.

Every count on screen is split between the local run and the shipped one, and each run's
provenance is named — machine, processor, CPU governor and date — so you always know which
of the two you are reading. A cost figure ranks plugins on one machine and the panel says
so next to the run it applies to.

Run it on the rig you are going to use, and the catalog's rankings become your rig's
rankings. See [the plugin catalog](plugin-catalog/index.md).

## The rest of Setup

| Item | Documented in |
|---|---|
| **Come-up gain** | [The channel strip](channel-strip.md) |
| **Clock** | [The clock](reac-clock.md) |
| **Sessions** | [Scenes and sessions](scenes-sessions.md) |
| **Preferences** | [Console profiles and the look](look.md) |

## Related

- [The console menus](menus.md) — every menu item in one list.
- [The surface](surface.md) — where the config zone sits.
`,qe=`# The surface

The surface is a digital console split into two halves, with a header on top.

![The whole surface at 1600 x 900](images/surface-1.png)
*The surface: the header on top, the work zone in the middle, the fader bay across the bottom.*

## The header

Carries the openmixer mark, the console model, the **connection indicator**, a channel
count, the **display settings** menu (console profile, theme, accent, finish, density), a **Save session**
button, and two panic buttons — **MAINS MUTE** and **ALL MUTE** — which kill sound
instantly and do not ask for confirmation.

The connection indicator is the first thing to read when something seems wrong. It shows
*Connecting*, *Connected*, *Demo (offline)* or *Disconnected*.

![The header](images/surface-2.png)
*The header: the console menus, the connection indicator, the panic buttons, and the cue and monitor block.*

**Demo (offline)** means the browser could not reach a server and is drawing a simulated
board. Every control works and nothing touches audio. It is a good way to learn the desk
and a bad surprise mid-show — see
[the web UI cannot reach the server](../troubleshooting/web-ui-cannot-reach-server.md).

Beside the emergency buttons sits the always-visible **cue and monitor** block. It is
console-wide state, reachable from any bank; see [cue, solo and the monitor](cue-solo.md).

## The console menus

On the left of the header, sharing its line, are the console menus: **Setup**, **Patch**,
**Scenes**, **Meters**, **Layouts** and **Help**. One opens at a time; a click elsewhere
or the Escape key closes it.

| Menu | What it holds |
|---|---|
| **Setup** | The between-songs surfaces: allocation, adapters, controllers, discovery, stageboxes, the clock, preferences. |
| **Patch** | The routing views: the patchbay, the crosspoint matrix, the graph and the source layer. |
| **Scenes** | Sessions and scenes — saving, recalling and storing the desk. |
| **Meters** | The meter bridge, the analyser, and the telemetry and performance readouts. |
| **Layouts** | Reset the workspace to its default, save it, and add any panel to the work zone. |
| **Help** | The manual, the plugin catalogue, the keyboard shortcuts, the FAQ and About. |

### Help

**Help** is the last menu and it is always there — it does not disappear when the console
is offline, which is when you are most likely to want it.

| Item | What it opens |
|---|---|
| **Manual** | This manual, from the console's own copy, in a panel over the desk. |
| **Plugin catalog** | The [plugin catalogue](plugin-catalog/index.md) — every measured plugin, by family. |
| **Keyboard shortcuts** | The [keyboard reference](keyboard.md). |
| **Frequently asked questions** | The FAQ on the public website. This one needs the internet. |
| **About** | What the console reports about itself: its build, its model, whether the surface is linked to it and whether the plugin host is up. |

The first three open a **panel over the desk**, not a new page: the meters keep moving,
the fader bay stays where it is, and the panic buttons still work while you read. Close
the panel with its ✕ or with Escape. Every page in the panel also carries **Open in a new
tab**, for when you want the manual on its own screen.

**About** shows the build the *console* is running, asked of the console itself. Where the
console does not report one it says \`unidentified build\` rather than guess: a version the
browser made up would describe the wrong thing.

The Help menu also carries a one-line reminder of the other way to get help, which is
usually the faster one: see [getting help on a control](#getting-help-on-a-control) below.

## The channel view and the layout chips

The upper part of the screen shows whichever module you have open. It starts empty with
"Select a strip below to open its channel view."

Above it is a row of **layout chips** — what most consoles would call tabs. Each chip
swaps the module or modules shown in the channel view. Beside them sit the session
controls and a **density** control (compact / normal / comfortable, plus **auto**), which
sets how much the surface packs into the space available.

The built-in chips:

| Chip | What it holds |
|---|---|
| **Processing** | The channel strip: trim, filters, gate, EQ, dynamics, inserts. See [the channel strip](channel-strip.md). |
| **Plugin rack** | The ordered insert chain for the selected channel and the selected output. |
| **Plugin editor** | The generated editor for one plugin. |
| **Sends** | Per-channel sends, plus the bus and mute-group masters. |
| **Routing** | The selected strip's MAIN on/off and sub-group assigns. |
| **Matrix + outputs** | The crosspoint matrix and the per-output insert chains. |
| **Meter bridge** | Full metering with peak-hold, clip and loudness. |
| **Patchbay** | The crosspoint routing list. |
| **Graph** | The same routing as a node canvas. |
| **Source layer** | Named inputs with head-amp control and direct paths. |

Any module — or a whole layout — can be popped into its own browser window, so the fader
wall can live on the main display with a plugin editor on a second screen. Each window is
another client of the same server. The header's **Layouts** menu adds a panel beyond
this built-in set to the current work zone — the [talkback](talkback.md) generators among
them. Arranging, splitting and saving all of that is
[layouts, banks and the work zone](layouts.md); every menu item, one line each, is
[the console menus](menus.md).

Console size, adapters, discovery, sessions and the other between-songs settings are not
chips: they live in the reserved top-right **config zone**, reached from the header's
**Setup**, **Scenes** and **Meters** menus.

## The fader bay

The bay is the wall of channel strips and the heart of the desk.

Strips are grouped in **banks of eight**. The bay shows one *set* of the console at a time
and cycles through them:

**CH** (input channels) → **AUX** (aux masters) → **BUS** (group and subgroup masters) →
**DCA** → **MTX** (matrix).

The **Main** fader is pinned to the far right, always in view, outside the paging.

Within a bank you can pin a strip, page left and right (\`,\` and \`.\`), collapse the bay to
a thin spine, and drag strips to reorder them.

## Console size

The console starts at **16:8** — sixteen inputs, eight buses — which is also the minimum,
and scales up through presets to **96:32**. Pick the size under the header's **Setup**
menu, in **Allocation**.

When a stagebox is detected the console sizes itself to what the box actually offers; the
16:8 preset is the fallback when there is nothing to detect. Whichever happened is
recorded, so a console that came up smaller than you expected has an answer in the log.

## Getting help on a control

Most controls can explain themselves. On a touchscreen each one carries a small
**information mark** in one of its corners — the circled **i**. Tap it and a card opens
with what the control does, its units and its range, and an **Open manual** button that
jumps straight to the section of this manual about it. It is an *i*, not a question mark,
on purpose: nothing is wrong and nothing is being asked of you, there is simply more to
know about that control.

The mark sits in whichever corner is free, so it never lands on the control itself: top
right on most, top left on the gate and compressor rows, whose right-hand end is the
value's **−** and **+** steppers. Tapping the mark never moves the control under it, and
tapping the control never opens the card.

You do not have to hit the mark. **Press and hold anywhere on the control for about half a
second** and the same card opens — which is also how you reach it on the few controls with
no room for a mark at all, such as a fader cap or the output-leg destination in the
patchbay. Holding a control never changes its value: if your finger moves, the desk reads
it as a normal adjustment and no card appears.

With a mouse there is no mark, because a mouse does not need one: **hover** a control for
the same explanation as a tooltip, and **right-click** it for the card with the manual
link.

## Where do I find X

A few things are not where you would first look:

- The **crosspoint matrix** is under **Matrix + outputs**, not a chip of its own.
- **DCA membership** is assigned on the fader bay: page to the **DCA** bank, press a DCA's
  **SEL**, and the channel strips' SEL keys become IN/OUT for that DCA. The ⚙ beside the DCA
  chips opens the manager, whose member chips do the same job faster for a whole section.
- **Mute-group membership** is assigned in the master bay: open the **Sends** chip and use the
  **Bus masters** panel's Mute Groups section, or the ⚙ beside the mute-group chips.
- **Sends-on-faders** is a button in the fader bay (and the \`F\` key), not a separate view.
- **Feedback suppression** is a sub-tab of the **EQ** tab in the channel strip, not a
  console-wide panel.
- The **routing patchbay** (a crosspoint list) and the **Graph** (a node canvas) are two
  views of the same routing.
- **Cue and monitor** controls are in the header block, not in a chip.
- **Console size, adapters, discovery and sessions** live in the config zone under the
  header's **Setup** menu, not a chip — see [the Setup panels](setup.md).
- **Setup ▸ Patchbay** is the exclusive-control switch, not the routing patchbay. The
  routing patchbay is under **Patch**.
- **The clock** — both the console's rate and a stagebox wire's — is **Setup ▸ Clock**; see
  [the clock](reac-clock.md).
- **Recording and virtual soundcheck** are **Layouts ▸ Record**, plus the **REC** button in
  the header; see [recording](recording.md).
- **The manual, the plugin catalogue, the shortcuts and the FAQ** are under the header's
  **Help** menu, and the first three open over the desk rather than replacing it.
`,Ue=`# Talkback and test signals

The built-in signal sources live in the **Talkback** module. It is not one of the default
chips — add it from the header's **LAYOUTS** menu to put it on screen, or pop it into its
own window.

## The generators

![Layouts, Talkback](images/talkback-1.png)
*Talkback and the test generators: the oscillator and noise sources, and the talkback path into the buses.*

- An **oscillator** — sine, square, saw or triangle, with a frequency and a level.
- **White noise** and **pink noise**.

Each switches on as a real PipeWire source and gets a **Route to** picker, so you can send
it to any strip: a channel, a monitor, a talkback bus.

Because they are real sources they also appear in the [patchbay](patchbay.md), grouped
under "Talkback / Generators", so you can crosspoint them anywhere you can crosspoint
anything else.

## What to use them for

- **Ringing out a room** — pink noise into the PA, then work the
  [feedback suppression](fbs.md) ring-out mode, or notch by hand.
- **Checking a path** — a sine at a known level tells you immediately whether a wedge,
  a delay tower or a matrix output is actually connected.
- **Lining up a system** — pink noise and a measurement microphone.

Set a sensible level before you route anything. Full-scale pink noise into a PA is a
mistake you make once.

## Talkback

A talkback-microphone slot sits alongside the generators, for routing a talkback input to
where it needs to go — the monitor mixes, a specific wedge, the in-ears.

The routing is ordinary routing: the talkback source appears in the patchbay like any
other and can be crosspointed to any channel or, more usually, sent to the buses that need
it.

## Do not leave it running

A generator is a real source and it stays on until switched off. It is worth a glance at
the Talkback chip before doors.
`,Qe=`# The stagebox is not establishing

## Symptom

The box is powered and cabled, but the mixer shows no stagebox: no \`reac-capture\` device
band in the patchbay, no inputs, and discovery reports nothing.

## Work through these in order

### 1. Is the transport running at all?

\`\`\`sh
systemctl --user status reac-pw
journalctl --user -u reac-pw -n 100 --no-pager
\`\`\`

Two failures show up here immediately:

- **Missing configuration.** If \`~/.config/reac-pw/reac-pw.env\` declares no interface, or
  box, the unit fails fast with a message telling you to set it from **Setup → Adapters →
  REAC**. That is by design; configure it there rather than writing the file.
- **Missing capabilities.** The unit checks \`/usr/bin/reac-pw\` for \`cap_net_raw\` before
  it starts and refuses with an explicit message if it is gone. Confirm with
  \`getcap /usr/bin/reac-pw\` (expect \`cap_net_raw,cap_sys_nice=ep\`) and reinstall the
  \`reac-pw\` package if it is missing.

### 2. Is it the right interface, and is the interface right?

\`\`\`sh
ip -br link
\`\`\`

The REAC interface must be:

- the one physically cabled to the box — unplug it and watch which one loses carrier;
- **UP**, with carrier;
- **without an IP address**. REAC is raw Layer-2; addressing does nothing for it.

Then check what the mixer was told:

\`\`\`sh
cat ~/.config/reac-pw/reac-pw.env ~/.config/reac-pw/*.env
\`\`\`

\`REAC_LIVE_IFACE\` and \`REAC_TX_IFACE\` must both name that interface.

### 3. Is something else acting as master?

Exactly one master is allowed on a REAC segment. If a Roland desk is also on the wire
acting as master, or a second copy of the transport is running on the same interface, the
box cannot settle — the visible result is a box that never establishes, or one that
appears and disappears.

Take everything else off the segment and try again. See
[the single-master rule](../hardware/wiring-and-nic.md#the-single-master-rule).

### 4. Is the switch in the way?

The most reliable test is to remove the switch: run a **direct cable** from the REAC
interface to the box. If it establishes on a direct cable and not through the switch, the
switch is doing something to Layer-2 traffic it does not recognise, or the port is a
mirror destination. See [wiring](../hardware/wiring-and-nic.md).

### 5. Is more than one box transmitting?

Only one stagebox per segment is tracked: the first box to complete its handshake owns
the link and frames from any other box are ignored. If you have two boxes on one wire,
the second one will never appear.

Enable the transport's counters to see it:

\`\`\`sh
systemctl --user edit reac-pw     # [Service] Environment=REAC_DEBUG=1
systemctl --user restart reac-pw
journalctl --user -u reac-pw -f
\`\`\`

An **other-source** count climbing means a second box is transmitting.

### 6. Give it longer

A cold box can take a noticeable while to complete its handshake — a real desk holds a
cold box waiting for tens of seconds. If the log shows the box being recognised but never
granted, the dwell can be lengthened with \`REACPW_GRANT_DWELL_S\` (whole seconds); see
[the transport's knobs](../admin/env-vars.md#the-transports-knobs).

Try this only after the cabling and single-master checks. It is a knob for a box that
wants a longer wait, not a fix for a wiring fault.

### 7. Power-cycle the box

Last, and it does sometimes matter: power the box down, wait, power it up with the cable
already in place, and watch the log.

## If it establishes but sounds wrong

Then this page is done and you want
[granulated or stuttery box audio](granulated-audio.md).

## If it establishes but the inputs are wrong

Check what the transport RECOGNIZED, not what anyone declared: \`reac.box-model\` /
\`reac.box-width\` / \`reac.box-source\` on the \`reac-playback\` node (\`pw-dump | grep
reac.box\`), and the \`recognized box = …\` line in
\`journalctl --user -u reac-pw\`. Since 2026-08-05 the box's own declaration is
what sizes and numbers the inputs and \`REAC_BOX\` is ignored by the transport; a
\`reac.box-model\` of \`none\` means no box has declared itself yet, which is a wire or
link problem, never a configuration one. (Historically the declared model sized the
inputs, so an S-1608 declared as an S-0808 gave you eight inputs and no explanation —
which is why nothing declares it any more.) See
[supported boxes](../hardware/reac-boxes.md).
`,Xe=`# Granulated or stuttery box audio

## Symptom

The stagebox establishes cleanly. Phantom power works. The meters look right. The audio
is **granular** — a fast, grainy stutter, as though every short block of sound were being
played twice or chopped.

It sounds exactly like a broken decoder. It is almost never a decoder.

There are two causes, and they produce the same sound.

## Cause 1: the segment changed rate without re-pacing the box

A stagebox runs at the pace its segment is clocked at, 44.1, 48 or 96 kHz, the rates a Roland
desk uses, and it follows the pace it is given. What granulates is a segment whose rate was
changed while the box was established without the segment being re-opened at the new pace: the
box keeps counting at the old one and the stream arrives torn. The console's REAC daemon re-opens
the segment on every rate change since version 0.4.5, so this is rare now, but a segment that
was already running when the daemon was upgraded can still be in that state.

### Check

Open the REAC clock panel. Each segment shows its pace and its box. Compare the pace with what
the box reports in the same panel; a mismatch is the fault.

### Fix

In the same panel, set the segment's rate again, to the value you want; the box re-paces in about
two seconds and the audio is clean. Everything is done with the console's controls; there is no
configuration file to edit and nothing to restart. If you want the graph itself at another rate,
that is the clock on the Setup page, and it is described in
[clocking and sample rate](../hardware/clocking-and-sample-rate.md).

## Cause 2: frames are arriving twice

A **mirrored** (SPAN / monitor) switch port delivers every frame twice — the real frame
and the mirror copy, in both directions. Every block of audio is then assembled twice, and
the result is the same granular stutter.

Nothing else looks wrong: the box establishes, phantom works, metering is correct. That is
what makes this one expensive to find.

### Check

Turn on the transport's counters:

\`\`\`sh
systemctl --user edit reac-pw
\`\`\`

\`\`\`ini
[Service]
Environment=REAC_DEBUG=1
\`\`\`

\`\`\`sh
systemctl --user restart reac-pw
journalctl --user -u reac-pw -f
\`\`\`

Roughly every two seconds it reports received, **duplicate**, other-source, bad and gap
counts. On a correctly-cabled interface the duplicate count is **zero**. Anything else
means duplicated delivery.

### Fix

Move the transport onto a **dedicated, non-mirrored** interface — a direct cable to the
box is the simplest correct topology — and set \`REAC_LIVE_IFACE\` / \`REAC_TX_IFACE\` in
**Setup → Adapters → REAC** to match.

The transport does drop byte-identical duplicate frames, and that guard is what makes a
mirrored link sound clean, so you may not hear the fault at all. **Do not rely on it.**
It is a robustness guard against any duplicated-delivery path; it is not a supported
topology, and it costs you the ability to tell a real duplicate from a wiring mistake. On
a correctly-cabled interface it does nothing.

Turn \`REAC_DEBUG\` off again when you are done.

## What it is not

Two things that have been suspected and cleared:

- **Not a decode bug.** Individual samples decode correctly; the fault is in how frames
  are assembled, not in how bytes are read.
- **Not the box misbehaving.** A stagebox sends each frame once, slaved to the master's
  clock. If you are seeing every frame twice, something between the box and the socket is
  duplicating it.

## Still granular?

Check the obvious in-graph causes before going further: another application fighting for
the device, a plugin chain running out of time (the telemetry panel's xrun counter will
show it), or a CPU governor pinned low. See
[xruns and driver election](xrun-driver-election.md).
`,Ve=`# Troubleshooting

One symptom per page. Find what you are hearing (or not hearing) and start there.

## No sound

- **[The main output is silent](silent-main.md)** — channels meter, the main meter
  moves, nothing comes out.
- **[The web UI cannot reach the server](web-ui-cannot-reach-server.md)** — the surface
  loads but says *Demo (offline)*, or nothing you touch has any effect.

## Bad sound

- **[Granulated or stuttery box audio](granulated-audio.md)** — a stagebox that
  establishes cleanly but sounds broken.
- **[Xruns and driver election](xrun-driver-election.md)** — clicks and dropouts,
  especially on a rig with an idle audio interface.

## Missing things

- **[The stagebox is not establishing](box-not-establishing.md)** — no \`reac-capture\`,
  no box in the patchbay.
- **[The plugin catalog is empty](plugin-catalog-empty.md)** — the picker offers
  nothing.

## Bad state

- **[A poisoned autosave session](poisoned-autosave.md)** — the console comes back
  broken after every restart, and a fresh boot does not fix it.

## Before anything else

Three questions answer a surprising share of problems:

\`\`\`sh
systemctl --user status openmixer-server reac-pw   # is it running?
pw-metadata -n settings | grep clock                      # what rate is the graph at?
ip -br link                                               # is the REAC NIC up, without an address?
\`\`\`

And in the surface: the connection indicator in the header, and the **telemetry** panel's
xrun counter and sample rate.

See [logs](../admin/logs.md) for collecting a full diagnostic snapshot.
`,je=`# The plugin catalog is empty

## Symptom

The plugin picker offers nothing, or a small fraction of what you expected. The rack and
the insert chains work but have nothing to insert.

The desk itself is unaffected: faders, EQ, gate, compressor, buses and routing are all
native and need no plugins at all.

## Cause 1: no LV2 plugins are installed

The catalog lists plugins that exist on the machine. A fresh install has none unless you
asked for them.

\`\`\`sh
sudo dnf install openmixer-plugins-live
systemctl --user restart openmixer-server
\`\`\`

Other curated sets are available (\`-live-extra\`, \`-studio\`, …); each is a meta-package
that pulls in the LV2 plugin RPMs it covers.

## Cause 2: the catalog data file is not being found

The catalog is a **committed data file** shipped inside the catalog package — not a scan
performed on your machine at start-up. The server resolves it relative to that package.

An explicit path overrides it:

- \`rig.catalog\` in \`/etc/openmixer/config.json\`
- the \`OPENMIXER_CATALOG\` environment variable

If either points somewhere that does not exist, you get an empty catalog. Check both, and
remove the override if you did not mean to set one.

\`\`\`sh
grep -n catalog /etc/openmixer/config.json
systemctl --user show-environment | grep OPENMIXER_CATALOG
\`\`\`

## Cause 3: the plugins are installed but not where LV2 looks

\`\`\`sh
lv2ls | head
echo "$LV2_PATH"
ls /usr/lib64/lv2
\`\`\`

\`lv2ls\` listing nothing while \`/usr/lib64/lv2\` has content means \`LV2_PATH\` is set to
something that excludes the system directory. Unset it, or include the system path.

Plugins installed outside the package manager — built by hand into \`~/.lv2\` — are visible
to \`lv2ls\` but are not in the shipped catalog, which lists a curated set. They are not
missing; they were never listed.

## Cause 4: it is a curated list, not everything you have

The catalog is deliberately curated: a chosen set, grouped by role, with a latency figure
per plugin so live-unsafe processing can be sorted or hidden. A plugin installed on the
machine but absent from the curated list will not appear.

This is a product decision, not a fault. The set is regenerated and reviewed when the
curation changes.

## Verifying

After a fix, restart the server and re-open the picker:

\`\`\`sh
systemctl --user restart openmixer-server
journalctl --user -u openmixer-server -n 50 --no-pager
\`\`\`

The catalog is loaded at start-up, so a plugin installed while the server is running will
not appear until it restarts.
`,Ke=`# A poisoned autosave session

## Symptom

The console comes back **broken after every restart**, in the same way each time.
Restarting does not fix it. Sometimes nothing plays at all — every client connects, the
surface draws, and no audio moves anywhere.

The tell is the repetition. A one-off failure is a fault; a failure that survives every
restart is *state being restored*.

## Why it happens

The server continuously writes a **live autosave** of the console, and on start it
prefers that autosave over anything else. That is what makes a restart transparent
during a show.

It also means a console left in a bad state writes that bad state to disk, and the next
boot faithfully restores it. Two states are known to do real damage:

- **A persisted graph rate that flips the whole graph on boot** — the console restores a
  rate the hardware cannot serve, and the audio device wedges.
- **A main output pinned to a device profile that is not active**, or to a device that is
  no longer present — the mixer restores a route it cannot lay.

A wedged driver is not a quiet failure: with the graph's driver stalled, *no* client can
play, not just the mixer.

## Fix

Move the live autosave aside and boot clean. Do not delete it — it is evidence, and it
may contain a show you want to salvage.

\`\`\`sh
systemctl --user stop openmixer-server

cd ~/.local/state/openmixer/sessions          # or $XDG_STATE_HOME/openmixer/sessions
ls -la
mv autosave-live.json  autosave-live.broken-$(date +%F).json

systemctl --user start openmixer-server
\`\`\`

The exact filename follows the reserved id \`autosave-live\`; list the directory rather
than guessing. If the fault persists, move \`autosave-preload\` aside as well.

On the next start the server finds no live autosave, falls back to the most recent named
session, and if there is none, boots the configured rig fresh.

## Then rebuild deliberately

Load a **named** session — one you saved yourself, not an autosave — and check it before
you trust it:

- The graph rate, in the telemetry panel. It should be what the rig runs at, normally
  48000 with a stagebox.
- The main output route, in the patchbay's output routing row.
- That sound actually reaches the speakers.

Save it under a new name once it is right. That gives the server a clean named session
to fall back to next time.

## Preventing it

- **Save a known-good named session** for every rig, and re-save it whenever the rig
  changes. The fallback chain — live autosave, then the most recent named session, then a
  fresh rig — is only as good as the named session behind it.
- **Take a backup** before an upgrade or a rig change. See
  [backing up sessions](../admin/backup.md).
- **Do not leave the console in a broken state at the end of a night.** The autosave will
  remember it.

## Related

- [The main output is silent](silent-main.md) — if the restored route is the only thing
  wrong.
- [State and session directories](../admin/state-and-sessions.md) — what the two reserved
  autosave ids are and when each is written.
`,Ze=`# The main output is silent

## Symptom

Channels have signal. The channel meters move. The **main meter moves**. Nothing comes
out of the speakers or headphones.

The moving main meter is the important detail: it means the mix is being made and the
problem is on its way out of the desk, not inside it.

## Most likely cause: the main output is not routed to a live sink

The main mix has to be routed to a real PipeWire sink, and that route is stored by
**name**, not by whatever happened to be device number three last week.

Two things break it:

- **The sink is not there.** An interface that was unplugged, a USB card that
  re-enumerated, a Bluetooth device that disconnected.
- **The sink is there but its ports are not.** An audio interface presents different
  ports under different **profiles** — an RME running its pro-audio profile has
  completely different port names from the same card running plain analog stereo. A route
  saved against one profile refers to ports the other does not have.

openmixer follows the device's **active** profile when it lays routes, so a saved
\`…analog-stereo\` route on a card now running its pro profile is remapped rather than left
dangling. What it cannot do is invent a port: a device whose active profile has no
equivalent output at all is genuinely unroutable, and that is the case that stays silent.

### Fix

1. Open the **Patchbay** chip.
2. In the **output routing** row, find **Main**.
3. Re-pick the sink you actually want to hear.

If the sink you want is not in the list, the device is not presenting outputs. Check the
card's profile — for an interface with a pro/DAW profile, check whether the mixer is
looking at the profile you think it is — and check that the device is not being held by
another application.

## Second cause: something else owns the card

If another application has the output device, the mixer's route can be laid and still
produce nothing.

\`\`\`sh
pw-top
pw-link -l | grep -i <your device>
\`\`\`

The console takes exclusive control of the device sinks by default — severing every
non-mixer application link while leaving those applications visible in the patchbay for
manual patching. The preference is \`/patchbay/exclusive\` \`wanted\`, switched from Setup >
Patchbay; an application the operator marks \`leave-alone\` keeps its own route through the
takeover. On a shared desktop, switch it off there.

## Third cause: the obvious ones

Check them, in this order, because they are quick:

- **MAINS MUTE** or **ALL MUTE** in the header. They are panic buttons and they do not
  ask for confirmation.
- The **Main fader** itself, and the main mute.
- A **matrix** or **output insert** chain on the main output — a limiter with its
  threshold at the floor, a crossover routing to nothing.
- The physical amplifier or monitor.

## If the sinks are muted at the operating system after a restart

The desk keeps the house silent while the engine is down. Two hooks on the
\`openmixer-server\` unit do it: the stop hook mutes every sink the console was feeding
milliseconds after the process dies (it runs on a crash too), and the start hook gives
them back only after the console has answered and re-laid its routes.

So a house that is silent after a restart, with the console's own meters moving, is the
start hook reporting that it never got an answer. It leaves the sinks muted on purpose —
an unmuted sink with no console behind it plays whatever a browser tab is holding into
the room. It also says which sinks it is holding:

\`\`\`
journalctl --user -u openmixer-server -b | grep gig-safe
gig-safe: http://127.0.0.1:8800/health did not answer in 60 tries (up to 180s); sinks held muted: alsa_output.usb-RME_Babyface_Pro-00.pro-output-0
\`\`\`

The sinks are the symptom, not the fault: the console is not answering on the port the
hook asked. Find out why the console is down (\`systemctl --user status openmixer-server\`),
fix that, and restart the unit — the start hook unmutes on the first health poll that
answers. To hear something before then, unmute the named sink by hand:

\`\`\`
pactl set-sink-mute alsa_output.usb-RME_Babyface_Pro-00.pro-output-0 0
\`\`\`

Nothing is stopping the desk from starting either way: the hook's failure is recorded and
ignored, never propagated to the unit.

## If it started after a restart

A restart tears the PipeWire links down along with the processes. The mixer re-issues its
routes by name when it comes back, and an event-driven heal re-issues them again as ports
register, which covers a device that enumerates late. If Main is still silent a minute
after a restart, the route is not being *lost* — it is not resolvable. Go back to the top
of this page.

## If the console comes back broken after **every** restart

That is a different problem: see [a poisoned autosave session](poisoned-autosave.md).
`,Ye=`# The web UI cannot reach the server

## Symptom

The surface loads, draws a full console, and the connection indicator in the header reads
**Demo (offline)** — or *Disconnected*. Faders move on screen and nothing happens to the
audio.

*Demo (offline)* is a deliberate feature: with no server reachable, the surface falls back
to a simulated board so the controls can be learned. It is not an error message, which is
why it is easy to miss.

## The default arrangement

\`\`\`
browser ──▶ nginx :8443 (TLS, HTTP/2, the console's own local CA) ──▶ openmixer-server 127.0.0.1:8800
                │
                └── nginx :8880 (plain) — no API here, only a 302 to :8443 and the trust page
\`\`\`

nginx terminates TLS and HTTP/2 with a certificate the console issues itself; the upstream
to the server stays plain HTTP/1.1 on loopback (nginx does not proxy h2 upstream — the
multiplex is a browser↔nginx fact). nginx proxies \`/api/*\` (the REST entity API, including
its \`?watch=1\` SSE streams), \`/manual\`, \`/health\`, \`/telemetry\` and \`/patchbay/*\`
from the :8443 origin to the server. **There is no WebSocket and no \`/ws\`** — the surface's
live intake is \`/api\` SSE, over the same HTTPS connection as everything else. There is also
no separate \`/config\` discovery endpoint — the console's own port is \`/api/net/binding\`,
an entity like any other.

The :8880 listener is not a second copy of the API: it answers only the redirect to
\`https://<host>:8443/\` and the trust page that serves the root certificate to a browser
that does not trust it yet — a browser needs a plain channel to fetch the thing that would
give it trust in the first place. **A 302 from :8880 is healthy** — treat it as one, not as
a failure.

## Check in this order

### 1. Is the server running?

\`\`\`sh
systemctl --user status openmixer-server
curl -s http://127.0.0.1:8800/health
\`\`\`

Nothing on the loopback engine port means this page is done and the problem is the
service. Check [the journal](../admin/logs.md). (The port here is whatever \`web.port\`
resolves to for this console — see step 3; 8800 is this console's current value.)

### 2. Is nginx running and serving the HTTPS origin?

\`\`\`sh
sudo systemctl status nginx
sudo nginx -t
curl -sk -o /dev/null -w '%{http_code}\\n' https://127.0.0.1:8443/health   # through the proxy, expect 200
curl -sI http://127.0.0.1:8880/                                          # expect 302 to :8443 — this is healthy
\`\`\`

If the loopback engine answers \`/health\` but \`https://127.0.0.1:8443/health\` does not, the
drop-in is the problem — either nginx did not reload after an upgrade replaced it, the
certificate is missing (nginx refuses to start the TLS listener with no leaf/key), or the
upstream no longer matches the server's port.

Do **not** conclude the drop-in is broken from a 302 on :8880 — that plain listener never
serves the API; it only redirects and serves the trust page.

\`\`\`sh
grep -n listen /etc/nginx/conf.d/openmixer-web-ui.conf   # the two plain-listener paths
cat /etc/openmixer/nginx/upstream.conf                   # the port nginx proxies to
sudo openmixer-apply-port
\`\`\`

The upstream file is generated, not edited: \`%post\` writes it at install; after that, the
ONE step is \`sudo openmixer-apply-port\` — it regenerates the upstream from \`web.port\` in
\`/etc/openmixer/config.json\` (or the persisted Setup value, see step 3), moves the SELinux
port label, and reloads nginx. No unit does any part of this: \`openmixer-server.service\` is
a \`--user\` unit and cannot write \`/etc/openmixer\` or call \`semanage\`, so
\`systemctl reload nginx\` alone reloads the OLD upstream. If the file names the wrong port
after running it, the config file is where to fix it.

### 3. Did someone move the server's port?

The server's port is runtime configuration. The layers a shell script can see, and the
order \`openmixer-apply-port\` walks (via \`openmixer-config-port.sh\`):

\`\`\`
port of <state-dir>/network-settings.json  >  OPENMIXER_WEB_PORT  >  web.port of config.json  >  built-in default
\`\`\`

A value persisted through **Setup → Network** — a flat \`{host, port}\` document at
\`<state-dir>/network-settings.json\` — outranks everything else, which is the classic way
for a rig to end up with a server on a port the nginx upstream does not know about.

\`\`\`sh
curl -sk https://127.0.0.1:8443/api/net/binding # what the server thinks its port is, through the proxy
cat /etc/openmixer/config.json                  # the baseline layer, "web": {"port": ...}
cat ~/.local/state/openmixer/network-settings.json 2>/dev/null   # the persisted Setup layer, if any
\`\`\`

If the persisted port is wrong, fix it from **Setup → Network** — or stop the server,
delete that file, and start again to fall back to the config-file/default layers.

Whatever the server's port ends up as, \`sudo openmixer-apply-port\` derives the nginx upstream
from the same layers the server itself resolves, persisted Setup value included — it reads
\`<state-dir>/network-settings.json\` in the operator's own session, the same file Setup →
Network writes. Run without that session (a root shell with a different \`$HOME\`), and with
neither \`--state-dir\` nor \`OPENMIXER_STATE_DIR\`, it prints a warning and falls through to
\`config.json\`, which is the deployment's own baseline for exactly that caller — pass
\`--state-dir <console user's XDG state dir>\` to honour a port set from Setup → Network.
Under SELinux there is a second half to it: the new port needs \`http_port_t\`, because the
console's \`httpd_can_network_relay\` grant only reaches labelled ports —
\`openmixer-apply-port\` labels the resolved port and drops whichever port it labelled last,
so a port moved more than once does not leave stale labels behind.

### 4. Firewall

\`\`\`sh
sudo firewall-cmd --list-ports
\`\`\`

**8880** and **8443** should both be open — the package opens them at install. The loopback
engine port (8800 above, 8080 by default) does not need to be, and should not be: nothing
proxies to it from outside the host, and it carries no TLS.

### 5. Certificate trust

If nginx serves \`/health\` locally (step 2) but a browser on another device shows a
certificate warning or refuses to connect, the device has not installed the console's root
certificate. Fetch it from the plain listener and install it per platform (Firefox and iOS
need a second step beyond "import" — see the console's own trust page):

\`\`\`sh
curl -s http://<rig>:8880/trust/root.crt -o openmixer-root.crt
\`\`\`

### 6. Is it the right host?

Opening the surface by IP from a tablet works; opening it from a machine that cannot
route to the rig does not. Check that the browser and the rig are on the same network and
that you are using the rig's address, not \`localhost\`.

## A red lamp during a restart is normal — up to 30 seconds

After a console restart (a deploy, an upgrade) the connection indicator goes red for up to
30 seconds while it retries — nginx briefly has nowhere to proxy to while the server process
comes back up — and then clears on its own, with no reload: the surface keeps trying to
reconnect on its own, waiting a little longer between attempts each time rather than giving
up. If it does not come back on its own within a minute or so, reload the page and work
through the steps above.

## Quick end-to-end test

From the machine running the browser:

\`\`\`sh
curl -sk https://<rig>:8443/health
curl -sk https://<rig>:8443/api/net/binding
\`\`\`

Both answering 200 means the surface should connect. If it still does not, reload the page —
a stale tab holds a stale connection — and check the browser console.
`,Je=`# Xruns and driver election

## Symptom

Clicks, ticks and short dropouts. The **xrun counter** in the surface's telemetry panel
climbs. Often worse on a rig that has an audio interface plugged in but unused.

## What a driver is, and why it matters

Every PipeWire graph has one node acting as its **driver**: the node whose clock the whole
graph follows. Every other node runs to that node's cadence.

The election is automatic, and it does not know which device you care about. A capture
device that is present but doing nothing can be elected the driver, and then the entire
console — including playback — is being timed by a device with no reason to be timely.
That produces exactly this symptom.

## Check which node is driving

\`\`\`sh
pw-top
\`\`\`

The driver is at the top of each group. Look for a device you are *not* using appearing
there, and for the xrun columns.

## Fix: get the idle device out of the way

The clean solution is for the device that actually carries your audio to drive the graph.
Options, in order of preference:

1. **Unplug or disable the unused interface.** If nothing needs it, this ends the
   problem.
2. **Suspend the unused node.** Suspending an idle capture device stops it being a
   candidate; the playback side then drives.
   \`\`\`sh
   pw-cli list-objects Node | grep -i node.name    # find the offender's name
   \`\`\`
   WirePlumber's device configuration is where to make this permanent for a given card.
3. **Set an explicit profile** on the interface so the ports you do not use are not
   presented at all. On a card with a pro/DAW profile, choosing it deliberately usually
   removes a pile of unused endpoints.

## Fix: give the graph enough time

If the driver is right and xruns persist, the graph is running out of time rather than
being mistimed.

- **Quantum.** The telemetry panel reports the buffer quantum. A larger quantum buys
  headroom at the cost of latency.
  \`\`\`
  # ~/.config/pipewire/pipewire.conf.d/20-quantum.conf
  context.properties = {
      default.clock.quantum     = 1024
      default.clock.min-quantum = 256
  }
  \`\`\`
- **Plugin load.** The per-channel, per-plugin latency breakdown in telemetry shows where
  the time goes, and channel latency badges turn hot when a path runs long. A single
  expensive plugin on many channels is the usual answer.
- **CPU governor.** A laptop on a power-saving governor will xrun under load that a
  performance governor handles without effort.
- **Real-time scheduling.** PipeWire needs it. If the session has no real-time limits the
  whole graph is at the mercy of the scheduler.

## Fix: stop the contention

Another application fighting the mixer for the same card produces periodic dropouts that
look like xruns. The console can take exclusive control of the device sinks — severing
every non-mixer application link, while those applications stay visible in the patchbay
for manual patching. It is opt-in; see
[environment variables](../admin/env-vars.md#engine-behaviour).

## If it is a stagebox that sounds wrong rather than the whole graph

Xruns make everything click. A stagebox that sounds granular while the rest of the graph
is clean is a different fault: see
[granulated or stuttery box audio](granulated-audio.md).
`,s=[{slug:"install",label:"Install"},{slug:"manual",label:"Operator manual"},{slug:"hardware",label:"Hardware"},{slug:"admin",label:"Administration"},{slug:"troubleshooting",label:"Troubleshooting"},{slug:"architecture",label:"Architecture"}],$e=Object.assign({"../../../../docs/admin/backup.md":r,"../../../../docs/admin/config-files.md":l,"../../../../docs/admin/env-vars.md":h,"../../../../docs/admin/index.md":d,"../../../../docs/admin/logs.md":c,"../../../../docs/admin/ports.md":u,"../../../../docs/admin/reac-configuration.md":p,"../../../../docs/admin/services.md":m,"../../../../docs/admin/state-and-sessions.md":k,"../../../../docs/architecture/decisions/0001-native-reac-not-aes67.md":g,"../../../../docs/architecture/decisions/0002-pipewire-native-summing-mod-host-inserts-only.md":w,"../../../../docs/architecture/decisions/0003-server-single-source-of-truth.md":f,"../../../../docs/architecture/decisions/0004-canonical-model-and-adapters.md":y,"../../../../docs/architecture/decisions/0005-declarative-desired-graph-reconcile.md":b,"../../../../docs/architecture/decisions/0006-ordered-processor-channel-strip.md":v,"../../../../docs/architecture/decisions/0007-persist-routing-by-name-not-id.md":x,"../../../../docs/architecture/decisions/0008-dca-as-control-domain-gain-coupling.md":T,"../../../../docs/architecture/decisions/0009-c-for-hot-paths-pipewire-node-boundary.md":S,"../../../../docs/architecture/decisions/0010-metadata-driven-plugin-editor.md":A,"../../../../docs/architecture/decisions/0011-fader-position-and-db-with-per-adapter-scale.md":P,"../../../../docs/architecture/decisions/0012-adapter-manager-menus-and-files.md":z,"../../../../docs/architecture/decisions/0013-telemetry-measured-in-the-engine.md":C,"../../../../docs/architecture/decisions/0014-multi-modal-input.md":E,"../../../../docs/architecture/decisions/0015-modular-multi-window-web-ui.md":R,"../../../../docs/architecture/decisions/0016-gpl3-no-agpl-code-copied.md":M,"../../../../docs/architecture/decisions/0017-per-destination-output-trim-floor.md":I,"../../../../docs/architecture/decisions/0018-clock-force-rate-live-lever-hardware-probe.md":D,"../../../../docs/architecture/decisions/0019-cue-solo-monitor-bus-never-the-mains.md":L,"../../../../docs/architecture/decisions/0020-plugin-tiers-fixed-by-measured-latency.md":_,"../../../../docs/architecture/decisions/0021-fx-send-return-channels-native-delay-reverb.md":O,"../../../../docs/architecture/decisions/README.md":N,"../../../../docs/architecture/index.md":F,"../../../../docs/architecture/native-dsp-vs-modhost-inserts.md":H,"../../../../docs/architecture/one-summing-bus.md":B,"../../../../docs/architecture/overview.md":G,"../../../../docs/architecture/row-grammar-and-conformance.md":W,"../../../../docs/architecture/technical-manual.md":q,"../../../../docs/hardware/clocking-and-sample-rate.md":U,"../../../../docs/hardware/index.md":Q,"../../../../docs/hardware/reac-boxes.md":X,"../../../../docs/hardware/wiring-and-nic.md":V,"../../../../docs/index.md":j,"../../../../docs/install/first-boot.md":K,"../../../../docs/install/first-session.md":Z,"../../../../docs/install/image.md":Y,"../../../../docs/install/index.md":J,"../../../../docs/install/packages.md":$,"../../../../docs/install/services.md":ee,"../../../../docs/install/trust-the-console.md":ne,"../../../../docs/install/upgrading.md":te,"../../../../docs/manual/alignment.md":oe,"../../../../docs/manual/channel-strip.md":ae,"../../../../docs/manual/cue-solo.md":se,"../../../../docs/manual/eq-dynamics.md":ie,"../../../../docs/manual/fbs.md":re,"../../../../docs/manual/head-amp.md":le,"../../../../docs/manual/hrp.md":he,"../../../../docs/manual/index.md":de,"../../../../docs/manual/keyboard.md":ce,"../../../../docs/manual/layouts.md":ue,"../../../../docs/manual/lcr.md":pe,"../../../../docs/manual/look.md":me,"../../../../docs/manual/matrix-outputs.md":ke,"../../../../docs/manual/menus.md":ge,"../../../../docs/manual/metering-latency.md":we,"../../../../docs/manual/patchbay.md":fe,"../../../../docs/manual/plugin-catalog/analysis.md":ye,"../../../../docs/manual/plugin-catalog/delay.md":be,"../../../../docs/manual/plugin-catalog/dynamics.md":ve,"../../../../docs/manual/plugin-catalog/equalisers.md":xe,"../../../../docs/manual/plugin-catalog/filters.md":Te,"../../../../docs/manual/plugin-catalog/index.md":Se,"../../../../docs/manual/plugin-catalog/instruments.md":Ae,"../../../../docs/manual/plugin-catalog/midi.md":Pe,"../../../../docs/manual/plugin-catalog/modulation.md":ze,"../../../../docs/manual/plugin-catalog/pitch-and-spectral.md":Ce,"../../../../docs/manual/plugin-catalog/recommendations.md":Ee,"../../../../docs/manual/plugin-catalog/reverb.md":Re,"../../../../docs/manual/plugin-catalog/saturation-and-amps.md":Me,"../../../../docs/manual/plugin-catalog/spatial.md":Ie,"../../../../docs/manual/plugin-catalog/uncategorised.md":De,"../../../../docs/manual/plugin-catalog/utility.md":Le,"../../../../docs/manual/plugins.md":_e,"../../../../docs/manual/reac-clock.md":Oe,"../../../../docs/manual/recording.md":Ne,"../../../../docs/manual/room.md":Fe,"../../../../docs/manual/rta.md":He,"../../../../docs/manual/scenes-sessions.md":Be,"../../../../docs/manual/sends-buses-dcas.md":Ge,"../../../../docs/manual/setup.md":We,"../../../../docs/manual/surface.md":qe,"../../../../docs/manual/talkback.md":Ue,"../../../../docs/troubleshooting/box-not-establishing.md":Qe,"../../../../docs/troubleshooting/granulated-audio.md":Xe,"../../../../docs/troubleshooting/index.md":Ve,"../../../../docs/troubleshooting/plugin-catalog-empty.md":je,"../../../../docs/troubleshooting/poisoned-autosave.md":Ke,"../../../../docs/troubleshooting/silent-main.md":Ze,"../../../../docs/troubleshooting/web-ui-cannot-reach-server.md":Ye,"../../../../docs/troubleshooting/xrun-driver-election.md":Je});function en(e){const n=e.lastIndexOf("/docs/");return n<0?e:e.slice(n+6)}function nn(e){const n=e.replace(/\.md$/,"");return n==="index"?"":n.replace(/\/index$/,"")}function tn(e,n){const t=/^#\s+(.+)$/m.exec(e);return t?.[1]?t[1].trim():(n.split("/").pop()??n).replace(/\.md$/,"")}function on(e){if(e==="index.md")return!0;const n=e.split("/")[0];return s.some(t=>t.slug===n)}const a=new Map(Object.entries($e).map(([e,n])=>({docPath:en(e),source:n})).filter(({docPath:e})=>on(e)).map(({docPath:e,source:n})=>{const t=s.find(i=>i.slug===e.split("/")[0]),o={docPath:e,slug:nn(e),...t?{section:t}:{},title:tn(n,e),source:n};return[o.slug,o]})),sn=new Set([...a.values()].map(e=>e.docPath));function rn(e){return a.get(e.replace(/^\/+|\/+$/g,""))}function an(e){return e.toLowerCase().replace(/[`*_]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"section"}const ln=(()=>{const e=new Map;for(const n of a.values())if(n.section?.slug==="manual")for(const[,t]of n.source.matchAll(/^#{1,3}\s+(.+)$/gm)){const o=an(t??"");e.has(o)||e.set(o,n.slug)}return e})();export{s as D,ln as M,sn as R,nn as a,rn as d,an as s};
