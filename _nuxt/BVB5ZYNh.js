var e=`plugin-hostd`,t=`b4ea6a9`,n=[{slug:``,src:`README.md`,title:`README.md`,source:`https://github.com/FreeMixer/plugin-hostd/blob/b4ea6a9/README.md`,toc:[{id:`install`,title:`Install`},{id:`status`,title:`Status`},{id:`try-it`,title:`Try it`},{id:`protocol`,title:`Protocol`},{id:`running`,title:`Running`},{id:`placement`,title:`Placement`},{id:`grouped-workers-against-one-process-per-plugin`,title:`Grouped workers against one process per plugin`},{id:`verbs-the-daemon-adds`,title:`Verbs the daemon adds`},{id:`verbs-a-worker-answers-by-instance`,title:`Verbs a worker answers, by instance`},{id:`the-workers-own-feedback`,title:`The workers' own feedback`},{id:`probing-a-plugin`,title:`Probing a plugin`},{id:`pins`,title:`Pins`},{id:`the-running-history`,title:`The running history`},{id:`what-a-worker-must-do`,title:`What a worker must do`},{id:`formats`,title:`Formats`},{id:`who-runs-an-lv2-plugin`,title:`Who runs an LV2 plugin`}],html:`<h1 id="plugin-hostd">plugin-hostd</h1>
<p>plugin-hostd runs your LV2 and CLAP audio plugins, each in a worker process of its own, and
puts back any worker that dies. A plugin that crashes takes down its own worker and nothing
else. It is for anyone who runs plugins live on Linux, on a mixing console, a stage rig or a
Raspberry Pi, and cannot let one bad plugin stop the show.</p>
<ul>
<li>A crash stays small: only the plugin's worker is lost, and it is respawned with the links the daemon made itself.</li>
<li>Nothing to change in your controller: it speaks mod-host's socket protocol, same ports, same replies.</li>
<li>LV2 through omx-clap-host's adapter, with mod-host for the plugins the adapter refuses, and CLAP through omx-clap-host, side by side.</li>
<li>Audio never passes through the daemon; every worker is a JACK client, as in mod-host.</li>
<li>A plugin that keeps crashing is singled out and given up on without touching its neighbours.</li>
</ul>
<p>Three things it adds, each optional and taken or left on its own:</p>
<ul>
<li>Plugin hosting: the LV2 and CLAP plugins hosted in workers, with a qualification on the device saying which are safe
to load and how.</li>
<li>Grouping: a controller's chain stays as it is; when several of its plugins may share one process, by their records,
they run in one worker, and the others alone.</li>
<li>Panels: a plugin's control pages and its MOD GUI drawn from its one description, with omx-panel; a plugin's own GUI
is kept.</li>
</ul>
<h2 id="install">Install</h2>
<p>Fedora:</p>
<pre><code>sudo dnf install https://www.openmixer.org/rpm/openmixer-release.noarch.rpm
sudo dnf install plugin-hostd omx-clap-host
</code></pre>
<p>Debian bookworm and trixie and Raspberry Pi OS (amd64 and arm64):</p>
<pre><code>curl -fsSLO https://www.openmixer.org/deb/openmixer-release.deb &amp;&amp; sudo apt install ./openmixer-release.deb
sudo apt update &amp;&amp; sudo apt install plugin-hostd omx-clap-host
</code></pre>
<p>The LV2 worker is mod-host, which Debian does not package; without it CLAP plugins still work.</p>
<h2 id="status">Status</h2>
<p>What the continuous integration runs on every push:</p>
<ul>
<li>The daemon against stand-in workers that die on cue: placement, forwarding, the ledger, replay,
attribution and the bound on a respawn storm. No JACK and no plugin are needed for this.</li>
<li>The generated protocol files, README tables and man page checked against <code>protocol.h</code>, and
every guard broken on purpose to see its test go red.</li>
<li>The daemon with a real CLAP worker (omx-clap-host) over PipeWire's JACK and over JACK2's <code>jackd</code>,
including meters reaching the controller.</li>
<li>RPMs (Fedora 44) and DEBs (bookworm and trixie) built and installed in a clean environment.</li>
</ul>
<p>The LV2 worker (mod-host) is not run in CI; those steps stay in the Makefile for a machine that has
mod-host and an LV2 bundle.</p>
<h2 id="try-it">Try it</h2>
<p>Start the daemon, with pin checking off for a first try (it says when both ports accept):</p>
<pre><code>echo 'require_pins 0' &gt; plugin-hostd.conf
plugin-hostd -n -p 5555 -c plugin-hostd.conf
</code></pre>
<p>In another terminal, add an LV2 plugin, set its gain and ask where it runs
(messages end in a NUL byte, which <code>printf</code> adds):</p>
<pre><code>send() { printf '%s\\0' &quot;$1&quot; | nc -w3 127.0.0.1 5555 | tr '\\0' '\\n'; }
send &quot;add http://plugin.org.uk/swh-plugins/amp 0&quot;      # resp 0
send &quot;param_set 0 gain 6&quot;                              # resp 0
send &quot;param_get 0 gain&quot;                                # resp 0 6.0000
send &quot;worker_list&quot;                                     # resp 1 w1:&lt;pid&gt;:lv2:up:1:qualified:own:0
</code></pre>
<p>The plugin now runs as JACK client <code>effect_0</code> in its own process. Link it in your graph as
you would a mod-host plugin. <code>man plugin-hostd</code> has the options; the full protocol is below.</p>
<p>Using it from your own host (Zynthian, a Raspberry Pi, any Debian): <a href="/projects/plugin-hostd/own-host">docs/own-host.md</a>, nine commands from
nothing to a plugin running.</p>
<p>Under Zynthian on a Raspberry Pi 5: <a href="https://openmixer.org/docs/zynthian">https://openmixer.org/docs/zynthian</a> says what it changes, how to install and use
it and where it stands; the measurements are at <a href="https://openmixer.org/benchmarks">https://openmixer.org/benchmarks</a>, and how they were taken, with the
design of pins, chains and grouping, in the technical notes at <a href="https://openmixer.org/notes">https://openmixer.org/notes</a>.</p>
<p>Building from source: see <a href="https://github.com/FreeMixer/plugin-hostd/blob/b4ea6a9/BUILDING.md">BUILDING.md</a>. More about FreeMixer at <a href="https://www.openmixer.org">https://www.openmixer.org</a>.</p>
<h2 id="protocol">Protocol</h2>
<p>The protocol is the plugin-hostd protocol, a superset of mod-host's text protocol: any mod-host client works unchanged.
It is declared once, in <a href="https://github.com/FreeMixer/plugin-hostd-protocol">plugin-hostd-protocol</a>, the library the daemon answers its controllers with; the wire
protocol for a reader of another host, mod-host's verbs on plugin-hostd and the verbs mod-host does not have, is its
<a href="https://github.com/FreeMixer/plugin-hostd-protocol/blob/main/doc/protocol.md">doc/protocol.md</a>.</p>
<p>What it declares is installed with that library's development package (<code>plugin-hostd-protocol-devel</code>,
<code>libplugin-hostd-protocol-dev</code>): the header <code>&lt;plugin-hostd/protocol.h&gt;</code> with the placement syntax, the error codes, the
feedback events, the settings and the verbs (<code>pkg-config --cflags plugin-hostd-protocol</code>); the one verb table, its
grammar, and the protocol and mod-host's as JSON (<code>pkg-config --variable=table</code>, <code>grammar</code>, <code>protocoljson</code> and
<code>modhostjson</code> of <code>plugin-hostd-protocol</code>). The verbs the daemon adds are its package of omx-contract's contract
directory (<code>plugin-hostd-protocol-contract</code>). A refusal number omx-clap-host answers too carries omx-clap-core's
<code>reply.host.*</code> code (package <code>omx-clap-core-contract</code>), the others plugin-hostd's <code>reply.plugin-hostd.*</code>: one name per
number. The tables here and the man page's key list are generated from that header; this tree keeps no copy of it.</p>
<p>This tree's development package installs what it declares beside the protocol: the schemas <code>probe-output.schema.json</code>
for the probe's document and <code>preset.schema.json</code> for the org.openmixer.preset file (<code>protocoldir</code> in the pkg-config
file of <code>plugin-hostd</code> is that directory), and <code>&lt;plugin-hostd/pin.h&gt;</code>.</p>
<h2 id="running">Running</h2>
<pre><code>plugin-hostd -n -p &lt;port&gt; [-f &lt;port&gt;] [-c plugin-hostd.conf]
</code></pre>
<p>&lt;!-- BEGIN GENERATED protocol:readiness --&gt;
It prints <code>plugin-hostd ready!</code> once both ports accept.
&lt;!-- END GENERATED protocol:readiness --&gt;</p>
<p>No worker exists until the first <code>add</code>. <code>quit</code> or SIGTERM stops every worker and the daemon;
after a SIGKILL the workers notice the parent gone (<code>PR_SET_PDEATHSIG</code>) and exit.</p>
<p>Both ports listen on 127.0.0.1, so only programs on the same machine reach them. To control the daemon from
another machine, start it with <code>--bind-address &lt;address&gt;</code> or set <code>bind_address</code> in the settings; <code>0.0.0.0</code> is every
address of the machine. A controller is not authenticated and can load a plugin from any path, so do that only on a
network whose hosts you trust. A daemon that cannot listen on the address does not start. The workers it starts
listen on 127.0.0.1 whatever this says, and only the daemon talks to them.</p>
<p>The settings live in a file, <code>-c</code>, <code>$PLUGIN_HOSTD_CONF</code> or
<code>~/.config/plugin-hostd.conf</code>, one <code>key value</code> per line:</p>
<p>&lt;!-- BEGIN GENERATED protocol:config --&gt;</p>
<table>
<thead>
<tr>
<th>key</th>
<th>default</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>mod_host</code></td>
<td><code>mod-host</code></td>
<td>worker for lv2 (a name on PATH or a path)</td>
</tr>
<tr>
<td><code>clap_host</code></td>
<td><code>omx-clap-host</code></td>
<td>worker for clap</td>
</tr>
<tr>
<td><code>lv2_worker</code></td>
<td><code>auto</code></td>
<td>who runs an LV2 plugin: mod-host (the mod_host program), omx-clap-host (the clap_host program, through its LV2 adapter, a plugin it cannot run refused with a code) or auto (the adapter first, mod-host for what it refuses, each such plugin in a worker of its own unless its add names a placement); lv2_worker_set overrides it for one plugin</td>
</tr>
<tr>
<td><code>lv2_path</code></td>
<td><code>$LV2_PATH</code>, else <code>/usr/lib/lv2:/usr/lib/x86_64-linux-gnu/lv2:/usr/lib/aarch64-linux-gnu/lv2:/usr/lib/arm-linux-gnueabihf/lv2:/usr/local/lib/lv2:/usr/local/lib/x86_64-linux-gnu/lv2:/usr/local/lib/aarch64-linux-gnu/lv2:/usr/local/lib/arm-linux-gnueabihf/lv2:/usr/lib64/lv2:/usr/local/lib64/lv2</code></td>
<td>where bundles are searched</td>
</tr>
<tr>
<td><code>lv2_extra</code></td>
<td>\`\`</td>
<td>the site's own bundle folders, searched after lv2_path: the one declaration of them, which plugin-qualify and omx-panel read too</td>
</tr>
<tr>
<td><code>clap_path</code></td>
<td><code>~/.clap:/usr/lib/clap</code></td>
<td>where .clap files are searched by whoever searches (plugin-qualify, omx-panel); an add names its file, so the daemon loads none by search; $CLAP_PATH is searched before it</td>
</tr>
<tr>
<td><code>state_root</code></td>
<td><code>$XDG_RUNTIME_DIR</code>, else <code>/tmp</code></td>
<td>the daemon's checkpoints and worker logs</td>
</tr>
<tr>
<td><code>pin_mode</code></td>
<td><code>first-use</code></td>
<td>strict or first-use, while require_pins is 1: first-use records the pin of a plugin on its first add, strict admits only a plugin a controller, a pin_file or pins_dir pinned</td>
</tr>
<tr>
<td><code>grouping</code></td>
<td><code>off</code></td>
<td>off or on: whether plan applies its plan (a run of consecutive members that may share a worker is declared as a chain), or only answers it; the default stays off until the benchmark has published a win</td>
</tr>
<tr>
<td><code>bind_address</code></td>
<td><code>127.0.0.1</code></td>
<td>the IPv4 address the command and feedback ports listen on: this machine alone by default; 0.0.0.0 is every address of the machine, and a controller is not authenticated, so widen it only on a network whose hosts are trusted; --bind-address overrides it</td>
</tr>
<tr>
<td><code>placement</code></td>
<td><code>spread</code></td>
<td>spread or none (docs/placement.md): spread pins each new worker to the audio core with the least load, the sum of the qualification costs of the workers already on it, or their number while one of them has a member of unknown cost, the lowest core of a tie, and keeps the daemon, its threads and the scans it forks on the reserved cores; a worker keeps its core across respawns, and one whose format worker_env gave a cpu list is not placed; none pins nothing; --placement overrides it</td>
</tr>
<tr>
<td><code>audio_cores</code></td>
<td>\`\`</td>
<td>the cpus the placement spreads the workers over, a cpu list inside the daemon's own affinity (&quot;1-3&quot;); empty is that affinity less its lowest cpu; the reserved cores are the rest of it</td>
</tr>
<tr>
<td><code>pin_store</code></td>
<td>\`\`</td>
<td>the file first-use pins are kept in; empty is $XDG_STATE_HOME/plugin-hostd/pins, else $HOME/.local/state/plugin-hostd/pins</td>
</tr>
<tr>
<td><code>pin_file</code></td>
<td>\`\`</td>
<td>a file of pin lines loaded at start, as plugin-qualify --all --pins writes it; empty is none</td>
</tr>
<tr>
<td><code>pins_dir</code></td>
<td><code>/usr/share/plugin-hostd/pins.d</code></td>
<td>the read-only pins of packages: every file in it whose name ends in .pins, read at start in name order, under the store, the pin_file and pin_set, except that a pin of verdict=refused there always holds; empty is none</td>
</tr>
<tr>
<td><code>descriptor_dir</code></td>
<td><code>$OMX_DESCRIPTOR_DIR</code>, else \`\`</td>
<td>the scanned descriptors, one file per plugin binary (&lt;id&gt;@&lt;version&gt;-&lt;hash&gt;.json, the hash the binary's SHA-256), written by the scan of an add and read by descriptor_get; empty is $XDG_STATE_HOME/omx/descriptors, else /var/lib/omx/descriptors run as root (a system service), else $HOME/.local/state/omx/descriptors; its variable is for tests only</td>
</tr>
<tr>
<td><code>qualification_dir</code></td>
<td><code>$OMX_QUALIFICATION_DIR</code>, else \`\`</td>
<td>plugin-qualify's qualification records (verdict, cost, version tested), kept apart from the descriptors; empty is $XDG_STATE_HOME/omx/qualification, else /var/lib/omx/qualification run as root (a system service), else $HOME/.local/state/omx/qualification; its variable is for tests only</td>
</tr>
<tr>
<td><code>probe</code></td>
<td><code>plugin-hostd-probe</code></td>
<td>the scanner an add runs, as &lt;probe&gt; describe &lt;target&gt;, in a child of its own once per plugin binary; its stdout is the descriptor</td>
</tr>
<tr>
<td><code>history_file</code></td>
<td>\`\`</td>
<td>the running history: what each plugin did on this machine, kept per plugin, binary and host class; empty is $XDG_STATE_HOME/plugin-hostd/history, else $HOME/.local/state/plugin-hostd/history; local to this machine, mode 0600, written by the daemon alone, and deleted by history_clear</td>
</tr>
<tr>
<td><code>host_class</code></td>
<td>\`\`</td>
<td>the host class the history is kept under, as arch/cores/clock (x86_64/5-8/2.5-3.5GHz); empty is the class of this machine, as the probe writes it; no white space</td>
</tr>
<tr>
<td><code>ready_timeout_ms</code></td>
<td>5000 ms</td>
<td>a worker that does not accept in this long is a failed spawn</td>
</tr>
<tr>
<td><code>rpc_timeout_ms</code></td>
<td>5000 ms</td>
<td>a worker that does not answer in this long is killed</td>
</tr>
<tr>
<td><code>backoff_base_ms</code></td>
<td>250 ms</td>
<td>respawn backoff, doubling per death in the window</td>
</tr>
<tr>
<td><code>backoff_max_ms</code></td>
<td>5000 ms</td>
<td>the most a respawn backoff grows to</td>
</tr>
<tr>
<td><code>storm_deaths</code></td>
<td>5 deaths</td>
<td>deaths inside the window that end respawning of a placement</td>
</tr>
<tr>
<td><code>storm_window_ms</code></td>
<td>60000 ms</td>
<td>the window storm_deaths are counted in</td>
</tr>
<tr>
<td><code>suspect_window_ms</code></td>
<td>500 ms</td>
<td>a worker that dies this soon after a reply drops the verb it answered; 0 turns it off</td>
</tr>
<tr>
<td><code>checkpoint_ms</code></td>
<td>5000 ms</td>
<td>a quiet interval with a changed ledger writes a checkpoint</td>
</tr>
<tr>
<td><code>chain_form_timeout_ms</code></td>
<td>10000 ms</td>
<td>a chain or a plan's segment that has not formed in this long is said with chain_stalled; 0 turns it off</td>
</tr>
<tr>
<td><code>idle_ms</code></td>
<td>25 ms</td>
<td>the period of the idle tick: reap, respawn, checkpoint</td>
</tr>
<tr>
<td><code>pool_max</code></td>
<td>8 instances</td>
<td>instances in a pool before a sibling opens</td>
</tr>
<tr>
<td><code>history_window_s</code></td>
<td>60 s</td>
<td>the length of one history window: a worker's CPU and memory are read and folded into the history of its plugins once per window, and a window the plugin was up less than half of is not counted; 0 keeps no history</td>
</tr>
<tr>
<td><code>history_save_s</code></td>
<td>300 s</td>
<td>the history is written at most once this often when it changed, and at quit</td>
</tr>
<tr>
<td><code>history_regroup_s</code></td>
<td>600 s</td>
<td>a plan whose group was split by a death that named no culprit is made again after this many seconds without another death of its members, and the members that share are gathered in a worker again; 0 never makes it again by itself</td>
</tr>
<tr>
<td><code>ram_budget_mb</code></td>
<td>0 MiB</td>
<td>the memory this host gives its plugins, which estimate answers beside what they hold; 0 for no budget set</td>
</tr>
<tr>
<td><code>group_max</code></td>
<td>8 instances</td>
<td>most members of one segment of a plan; 0 sets no limit</td>
</tr>
<tr>
<td><code>group_cost_max</code></td>
<td>60 percent of a core</td>
<td>most the costs of the members of one segment of a plan add to, each a member's coreFractionP95 of its qualification record at group_rate and group_quantum; a member over it alone stays alone; 0 sets no limit</td>
</tr>
<tr>
<td><code>group_rate</code></td>
<td>48000 Hz</td>
<td>the sample rate the cost of a member is read at</td>
</tr>
<tr>
<td><code>group_quantum</code></td>
<td>128 frames</td>
<td>the quantum the cost of a member is read at</td>
</tr>
<tr>
<td><code>require_pins</code></td>
<td>1</td>
<td>1: add admits only a plugin that has a pin (see pin_mode), its files hashed before any worker sees it, and a plugin of a format whose pin holds only in a world of its own gets a worker of its own, its world the plugin's files (a default that resolves to a pool is placed own); 0: no pin is checked</td>
</tr>
<tr>
<td>&lt;!-- END GENERATED protocol:config --&gt;</td>
<td></td>
<td></td>
</tr>
</tbody>
</table>
<p>Where plugins are searched is written once, in <code>include/plugin-hostd/search_paths.h</code>. The LV2 default is Zynthian's own
<code>LV2_PATH</code> order (<code>/usr/lib/lv2</code>, <code>/usr/lib/&lt;multiarch&gt;/lv2</code>, <code>/usr/local/lib/lv2</code>, <code>/usr/local/lib/&lt;multiarch&gt;/lv2</code>)
and then the lib64 folders; the CLAP rule is CLAP's own, <code>$CLAP_PATH</code>, then <code>~/.clap</code>, then <code>/usr/lib/clap</code>. A site adds
its own folders in <code>lv2_extra</code> (a Zynthian image: <code>/zynthian/zynthian-plugins/lv2</code> and the like), searched after
<code>lv2_path</code>; plugin-qualify and omx-panel read <code>lv2_path</code>, <code>lv2_extra</code> and <code>clap_path</code> from this file, or run
<code>tools/search-paths.py lv2|clap [--existing] [--env]</code>, and keep no list of their own. The benchmark and the scripts of
<code>tools/zynthian/</code> use the same script.</p>
<p>&lt;!-- BEGIN GENERATED protocol:constants --&gt;</p>
<table>
<thead>
<tr>
<th>name</th>
<th>value</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>default_command_port</code></td>
<td>5555 port</td>
<td>the command port without -p; the feedback port is the next one, unless -n is given</td>
</tr>
<tr>
<td><code>connect_retry_ms</code></td>
<td>5000 ms</td>
<td>how long the idle tick asks again for a connect a respawned worker could not make yet</td>
</tr>
<tr>
<td><code>line_max</code></td>
<td>4096 bytes</td>
<td>the protocol socket's buffer: the longest pin_set line the daemon takes</td>
</tr>
<tr>
<td><code>line_words_max</code></td>
<td>64 words</td>
<td>the words of one command line the daemon reads, the verb included; a word past them is not read</td>
</tr>
<tr>
<td><code>chain_members_min</code></td>
<td>1 instances</td>
<td>the fewest members of a chain: a chain of one is valid, so one isolated plugin is a chain like any other</td>
</tr>
<tr>
<td>&lt;!-- END GENERATED protocol:constants --&gt;</td>
<td></td>
<td></td>
</tr>
</tbody>
</table>
<h2 id="placement">Placement</h2>
<p>&lt;!-- BEGIN GENERATED protocol:placement --&gt;
The placement of an <code>add</code> is <code>own | pool:&lt;name&gt; | chain:&lt;chain&gt; | default</code>. <code>own</code> is a worker for that instance alone; <code>pool:&lt;name&gt;</code> is the pool's worker, opened on first use and capped by <code>pool_config</code>, and a full pool opens <code>&lt;name&gt;#2</code>, <code>&lt;name&gt;#3</code>, and so on; <code>default</code> is the policy of <code>policy_set</code>. A pool name matches <code>^[A-Za-z0-9_-]{1,32}$</code>.
&lt;!-- END GENERATED protocol:placement --&gt;</p>
<p><code>&lt;uri&gt;</code> is <code>lv2:&lt;uri&gt;</code> or a bare URI for an LV2 plugin, <code>clap:&lt;path&gt;#&lt;id&gt;</code>
for a CLAP one. The instance number is the controller's and reaches the
worker unchanged. A worker holds one format. An own LV2 worker sees one
bundle: <code>LV2_PATH</code> is a directory of the daemon's holding a link to the bundle
whose <code>manifest.ttl</code> names the URI.</p>
<p>A token after the instance that is not a placement is the fork's optional
jack client name, passed on. An instance that crashed in a pool is placed
<code>own</code> whatever the hint until <code>quarantine_clear</code>.</p>
<h2 id="grouped-workers-against-one-process-per-plugin">Grouped workers against one process per plugin</h2>
<p>A chain runs its plugins in one worker; the other way is one process per plugin. One measurement of the two, with
16 plugins, with the numbers of the page at <a href="https://www.openmixer.org/docs/grouped-vs-processes">https://www.openmixer.org/docs/grouped-vs-processes</a>:</p>
<table>
<thead>
<tr>
<th></th>
<th>grouped</th>
<th>one process per plugin</th>
<th></th>
</tr>
</thead>
<tbody>
<tr>
<td>resident memory (RSS), 48 kHz</td>
<td>125.4 MB</td>
<td>1764.6 MB</td>
<td>14x smaller grouped</td>
</tr>
<tr>
<td>proportional memory (PSS), 48 kHz</td>
<td>42.9 MB</td>
<td>118.2 MB</td>
<td>2.8x smaller grouped</td>
</tr>
</tbody>
</table>
<ul>
<li>RSS counts a shared library once for every process that maps it, so a design with many processes looks larger than
it is. PSS divides shared pages between the processes that use them, so it is the honest figure. Do not read the RSS
ratio as the saving in real memory.</li>
<li>CPU: 1.2 to 1.9x less when grouped, across 3, 8 and 16 plugins at 48 and 96 kHz.</li>
<li>Context switches: up to about 14x fewer when grouped, 13.9x at 48 kHz and 14.8x at 96 kHz with 16 plugins.</li>
<li>Xruns over the 12 runs of each mode: 10 grouped against 41 with one process per plugin. Each run is one window of
10 seconds and the xruns in it are few and unevenly spread, so the 10 against 41 is suggestive and not proof.</li>
</ul>
<p>How: a Raspberry Pi 5 with 4 cores, CPU governor on performance during the runs, plugin-hostd 0.12.0 with
omx-clap-host 0.22.1 as the worker, N omx plugins in series, 256 frames, on a private JACK server.</p>
<p>Not measured: only 256 frames; only plugin-hostd, with omx plugins; the grouping planner is not part of the result and
no default has been changed because of the numbers; DSP load and xruns are those of the JACK dummy driver, so no claim
about real audio hardware is made.</p>
<h2 id="verbs-the-daemon-adds">Verbs the daemon adds</h2>
<p>&lt;!-- BEGIN GENERATED protocol:verbs --&gt;</p>
<table>
<thead>
<tr>
<th>verb</th>
<th>arguments</th>
<th>reply</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>add</code></td>
<td><code>&lt;uri&gt; &lt;instance&gt; [own | pool:&lt;name&gt; | chain:&lt;chain&gt; | default] [client_name]</code></td>
<td><code>resp &lt;instance&gt;</code></td>
<td>mod-host's add with a placement; a token after the instance that is not a placement is the jack client name</td>
</tr>
<tr>
<td><code>worker_list</code></td>
<td>none</td>
<td><code>resp &lt;n&gt; &lt;worker&gt;:&lt;pid&gt;:&lt;format&gt;:&lt;state&gt;:&lt;core&gt;:&lt;pool&gt;:&lt;place&gt;:&lt;i&gt;,&lt;i&gt;,...</code></td>
<td>the workers, one record each</td>
</tr>
<tr>
<td><code>instance_info</code></td>
<td><code>&lt;instance&gt;</code></td>
<td><code>resp 0 &lt;worker&gt; &lt;pid&gt; &lt;state&gt; &lt;crashes&gt; &lt;quarantined&gt;</code></td>
<td>where an instance lives and what it has cost</td>
</tr>
<tr>
<td><code>supervisor_reset</code></td>
<td><code>[&lt;worker&gt; | all]</code></td>
<td><code>resp 0</code></td>
<td>re-arm the storm bound and the backoff of a given-up placement</td>
</tr>
<tr>
<td><code>quarantine_clear</code></td>
<td><code>&lt;instance&gt; | all</code></td>
<td><code>resp 0</code></td>
<td>let a quarantined instance go back where its placement says</td>
</tr>
<tr>
<td><code>policy_set</code></td>
<td><code>&lt;format | *&gt; own | pool:&lt;name&gt;</code></td>
<td><code>resp 0</code></td>
<td>the placement of an add that says default</td>
</tr>
<tr>
<td><code>pool_config</code></td>
<td><code>&lt;name&gt; &lt;max_instances&gt;</code></td>
<td><code>resp 0</code></td>
<td>the instances a pool holds before a sibling opens</td>
</tr>
<tr>
<td><code>worker_env</code></td>
<td><code>&lt;format | *&gt; &lt;cpu-list|-&gt; &lt;nice|-&gt;</code></td>
<td><code>resp 0</code></td>
<td>the cpu list and the nice value of the workers of a format, at spawn and on the ones running</td>
</tr>
<tr>
<td><code>pin_set</code></td>
<td><code>&lt;uri&gt; &lt;path&gt;=&lt;sha256&gt;[,&lt;path&gt;=&lt;sha256&gt;...] &lt;scheme&gt;:&lt;sha256&gt; [verdict=&lt;verdict&gt;] [pool=&lt;pool&gt;]</code></td>
<td><code>resp 0</code></td>
<td>the pin of one plugin: the SHA-256 of every file the host loads for it, a path relative to the bundle (the directory of a single-file format's file), its layout fingerprint and, when they are known, the verdict of its qualification and whether its worker gets the CLAP thread pool; it replaces an earlier pin of the uri; -516 for a plugin whose pins_dir pin carries verdict=refused, which nothing overrides. The pin store, a pin_file and a pins_dir file hold the same line, with or without the verb</td>
</tr>
<tr>
<td><code>pin_clear</code></td>
<td><code>&lt;uri&gt; | all</code></td>
<td><code>resp 0</code></td>
<td>forget the pin of one plugin, or of every one; a pins_dir pin is read-only and holds again</td>
</tr>
<tr>
<td><code>pin_reload</code></td>
<td>none</td>
<td><code>resp 0</code></td>
<td>read the pin_file and the pins_dir files again and put the pins in at once, without a restart; the daemon also does this by itself when one of those files changes. Running instances keep running: one the new pins refuse is logged and its id in worker_list is followed by !. The pin_set pins of the controller are kept. -902 under pin_mode off or when the pin_file is gone or has a line outside the grammar, and the earlier pins hold</td>
</tr>
<tr>
<td><code>pin_changed</code></td>
<td><code>[&lt;uri&gt;] [files | layout]</code></td>
<td><code>resp 0</code></td>
<td>the notice the package sync sends to every daemon it knows after it rewrote the pin file: the same as pin_reload, with or without the pin_changed event's words after it; more words than those are -902</td>
</tr>
<tr>
<td><code>lv2_worker_set</code></td>
<td><code>&lt;uri&gt; &lt;mod-host | omx-clap-host | auto | -&gt;</code></td>
<td><code>resp 0</code></td>
<td>the worker of one LV2 plugin, for its adds from now on: it overrides the lv2_worker setting, - takes the override back; -902 for a word that is none of these. Like policy_set it is the controller's, not in the ledger, gone with the daemon</td>
</tr>
<tr>
<td><code>pin_accept</code></td>
<td><code>&lt;uri&gt;</code></td>
<td><code>resp 0</code></td>
<td>pin_mode first-use only: take the plugin's files as they are now as its pin, after a pin_changed event; the layout is learned again by the next add and the verdict is dropped; -508 when the plugin has no pin, -509 when its files cannot be collected, -516 when its pins_dir pin carries verdict=refused, -902 under pin_mode strict</td>
</tr>
<tr>
<td><code>pin_layout</code></td>
<td><code>&lt;instance&gt;</code></td>
<td><code>resp 0 &lt;scheme&gt;:&lt;sha256&gt;</code></td>
<td>sent by the daemon to a worker of a format that checks layouts, after it accepted the add of a plugin whose layout pin is still unknown: the layout the worker found after init, which the daemon records in the pin</td>
</tr>
<tr>
<td><code>pin_expect</code></td>
<td><code>&lt;instance&gt; &lt;scheme&gt;:&lt;sha256&gt;</code></td>
<td><code>resp 0</code></td>
<td>sent by the daemon to a worker of a format that checks layouts, just before the instance's add: the layout pin that add checks after init and before activate; any other reply than resp 0 refuses the add with that code, and the add is never forwarded</td>
</tr>
<tr>
<td><code>chain</code></td>
<td><code>&lt;chain&gt; &lt;instance&gt; [&lt;instance&gt; ...]</code></td>
<td><code>resp 0</code></td>
<td>the instances, in this order, are one chain, run in one worker of place chain:&lt;chain&gt;: each member's state is saved, it is removed from the worker it was in and replayed in the chain's. A chain already declared takes the new order, and a member left out of it goes back to a worker of its own; while its worker is up that worker is kept: a new member joins it (its add, the order, its state, its ledger, its connections) and no other member is restarted, unless the new member's format narrows the worker's world, which forms the chain again. Members of clap and lv2-clap form one chain. A worker that runs chains in one client (clap, lv2-clap) is sent this line, with the members it holds, after the adds of its replay; one that does not (mod-host) never is. A worker that refuses the line would not run the members as one: the chain is forgotten and each member runs in a worker of its own, the line answers -501, and the event chain_refused carries the worker's own code, also when the refusal comes later, on a respawn. Every instance verb still names one member by its own number. A member that crashes the worker is quarantined to a worker of its own and the chain goes on without it; quarantine_clear puts it back. -518 for an instance no add made, -519 for one named twice, -520 for one in another chain, -521 for members no one worker program runs together, -501 for a plugin that may not share a worker while require_pins is on (a CLAP plugin whose first-use pin is not in-process; an LV2 member whose bundle is not found, since a chain's worker sees a world narrowed to the union of its members' bundles), -902 for a chain or an instance that is not a number, or fewer than chain_members_min (1) instances</td>
</tr>
<tr>
<td><code>chain_clear</code></td>
<td><code>&lt;chain&gt;</code></td>
<td><code>resp 0</code></td>
<td>forget the chain: each member goes to a worker of its own; -522 for a chain no chain declared</td>
</tr>
<tr>
<td><code>chain_get</code></td>
<td><code>&lt;chain&gt;</code></td>
<td><code>resp 0 &lt;worker&gt; &lt;instance&gt;,... &lt;instance&gt;,...</code></td>
<td>read a chain back: its worker (- when it has none), its members in the declared order, and the members its worker runs now in their order (- for none); a quarantined member is declared and not running; -522 for a chain no chain declared, -902 for a chain that is not a number</td>
</tr>
<tr>
<td><code>plan</code></td>
<td><code>&lt;chain&gt; &lt;instance&gt; [&lt;instance&gt; ...]</code></td>
<td><code>resp 0 &lt;instance&gt;,...;&lt;instance&gt;,...;... &lt;core&gt;,...;&lt;core&gt;,...;...</code></td>
<td>the instances, in signal order, are planned (the grouping-planner design note): the daemon decides, from the pin and the cost of each, which runs of consecutive members share a worker. A run of two or more is declared as a chain of place chain:&lt;chain&gt;.&lt;k&gt;, k counting segments from 0; a member that shares with no neighbour is placed own. The reply names the segments in order, the members of one joined by commas and the segments by semicolons, then the cores: the segments again with each member replaced by the audio core of the worker that runs it now, - for one the setting placement did not pin (docs/placement.md). A chain planned again keeps the running worker of every segment that did not change, and the daemon plans it again by itself when a member is quarantined and, history_regroup_s after a death that split its group, to gather it. The plan numbers are its own, apart from chain's. While the setting grouping is off the plan is answered and kept for plan_get and nothing moves. A segment that cannot be formed refuses the whole plan with its own code, moves nothing and is told by plan_get as plan-refused:&lt;code&gt;. A segment its worker refuses, which is known only once it has moved, refuses the plan with -501 too, and then every segment ends and each member runs in a worker of its own. -518 for an instance no add made, -519 for one named twice, -520 for one in a chain or in the plan of another chain, -501 for a segment no world can be built for or its worker refuses, -902 for a chain or an instance that is not a number, or fewer than chain_members_min (1) instances</td>
</tr>
<tr>
<td><code>plan_get</code></td>
<td><code>&lt;chain&gt;</code></td>
<td><code>resp 0 &lt;instance&gt;,...;&lt;instance&gt;,...;... &lt;instance&gt;:&lt;reason&gt;,... &lt;core&gt;,...;&lt;core&gt;,...;...</code></td>
<td>read the last plan of a chain back: its segments as plan answered them, then the members that have a reason, instance:reason joined by commas (- for none); the reasons are the words of PLUGIN_HOSTD_GROUPING_REASONS (data/grouping.json), then the cores of the members as plan answers them; -532 for a chain no plan planned, -902 for a chain that is not a number</td>
</tr>
<tr>
<td><code>plan_clear</code></td>
<td><code>&lt;chain&gt;</code></td>
<td><code>resp 0</code></td>
<td>forget the plan: each member goes to a worker of its own; -532 for a chain no plan planned</td>
</tr>
<tr>
<td><code>descriptor_get</code></td>
<td><code>&lt;uri&gt;</code></td>
<td><code>resp 0 &quot;&lt;path&gt;&quot;</code></td>
<td>the scanned descriptor of the plugin, answered from descriptor_dir: the file named for its binary as it is now (&lt;id&gt;@&lt;version&gt;-&lt;hash&gt;.json), written by the scan the plugin's add ran. -529 when there is none, -530 while its scan runs, -531 when its last scan wrote nothing, -528 when the directory could not be written</td>
</tr>
<tr>
<td><code>panel_get</code></td>
<td><code>&lt;uri&gt;</code></td>
<td><code>resp 0 &quot;&lt;path&gt;&quot;</code></td>
<td>the panel the plugin publishes (org.openmixer.panel-description/1), answered from descriptor_dir: the file panels/&lt;id&gt;@&lt;version&gt;-&lt;hash&gt;.json, named as its descriptor, which the same scan writes once the descriptor is in place, {&quot;plugin&quot;: {&quot;format&quot;, &quot;id&quot;}, &quot;panel&quot;: &lt;the panel object omx-clap-scan --json prints for the plugin, null when it serves none&gt;}; an LV2 plugin's panel is null. The codes are descriptor_get's: -529 when there is none, -530 while its scan runs, -531 when its last scan wrote nothing, -528 when the directory could not be written</td>
</tr>
<tr>
<td><code>history_get</code></td>
<td><code>&lt;uri&gt;</code></td>
<td><code>resp 0 &lt;history&gt;</code></td>
<td>what the daemon kept of the plugin on this host class, for the binary its pin holds now (the running history: the windows it ran alone and in a group, its crashes, restarts and quarantines): one word of comma-joined digest=&lt;sha256&gt;, class=&lt;host class&gt;, crashed=&lt;0|1&gt;, raises_xruns=&lt;0|1&gt; and then every key=value of the record (data/history.json); - when the plugin has no pin or no record, unavailable while the history file is blocked or history_window_s is 0, -902 for a line that is not one word</td>
</tr>
<tr>
<td><code>history_clear</code></td>
<td><code>&lt;uri&gt; | all</code></td>
<td><code>resp 0</code></td>
<td>delete the history of one plugin (every binary and host class of it), or all of it, from memory and from the file at once; -902 while the history is blocked or off, or for a line that is not one word</td>
</tr>
<tr>
<td><code>estimate</code></td>
<td><code>&lt;rate&gt; &lt;quantum&gt; &lt;uri&gt; [&lt;uri&gt; ...]</code></td>
<td><code>resp 0 &lt;latency_frames&gt; &lt;cpu_percent&gt; &lt;ram_bytes&gt; &lt;workers&gt; &lt;unknown_count&gt; &lt;member&gt;:&lt;code&gt;,... &lt;ram_used_bytes&gt; &lt;ram_added_bytes&gt; &lt;ram_budget_bytes&gt; &lt;ram_unknown_count&gt;</code></td>
<td>what a chain of these plugins, in signal order and named as add names them, would cost at that rate and quantum, read from the qualification records of qualification_dir; no plugin is loaded and nothing moves. latency_frames adds up each member's measured latency of the grid point, else its declared one; cpu_percent adds up each member's median nanoseconds per sample times the rate, percent of one core's cycle (a member's cost per block over the block's duration); ram_bytes adds up the Pss of the worker each member ran alone in, the history's pss_mb_solo of the binary its pin holds on this host class, - unless every member has one, since no qualification record carries a RAM figure; workers is how many workers plan would place the members in (an isolated one alone); unknown_count is how many members have no figure at that rate and quantum, and the latency and the CPU add up only the others. The last word names each of them as its position in the line, from 0, and its code, -533 for no record, -534 for no point of the grid at that rate and quantum, -535 for a uri that names no plugin installed here, joined by commas, - for none. Several records of one plugin (several versions) give the largest figure. -902 for a rate or a quantum that is not a whole number above 0, or no uri</td>
</tr>
</tbody>
</table>
<p>A <code>&lt;state&gt;</code> is <code>up</code> (accepting commands), <code>starting</code> (spawned, not yet accepting), <code>backoff</code> (dead, waiting to be respawned), <code>given-up</code> (the storm bound is spent for its placement).
&lt;!-- END GENERATED protocol:verbs --&gt;</p>
<p>A record's place holds a colon (<code>pool:p</code>), so a <code>worker_list</code> record is read from both ends: six fields on the
left, the instance list on the right, the place in between. The fifth is the audio core the setting <code>placement</code> pinned
the worker to, <code>-</code> for none (<a href="/projects/plugin-hostd/placement">docs/placement.md</a>). The sixth is the worker's thread pool: <code>on</code> for a
worker started with <code>--thread-pool=on</code>, which only a CLAP or lv2-clap worker of one plugin whose pin carries <code>pool=cores</code>
is, <code>qualified</code> for every other (the worker's default, which grants the pool to no plugin).</p>
<p><code>panel_get</code> gives a host that draws a plugin's panel itself (Zynthian's engine, a console) the panel the plugin
publishes, as the scan of its add read it: sections, controls with their widget and visibility rule, roles, displays
and placement defaults. A renderer takes the panel for the structure, <code>param_info</code> for each control's unit and scale,
and <code>remote_page_get</code> for the pages of 8: <a href="/projects/plugin-hostd/panel">docs/panel.md</a>.</p>
<h2 id="verbs-a-worker-answers-by-instance">Verbs a worker answers, by instance</h2>
<p>What a host knows of a strip and of a plugin's controls. For a CLAP instance the daemon routes them like mod-host's
instance verbs and passes the worker's reply through; the worker answers them from the plugin (<code>clap.track-info</code>,
<code>clap.remote-controls</code>, <code>clap.params</code>), except <code>param_info</code>: omx-clap-host answers it from the param contract (<code>org.openmixer.param-contract/1</code>), and
<code>-511</code> for a parameter the worker holds no checked contract for (and <code>-103</code> for a symbol that is no parameter). <code>-511</code>
is the stable answer to read as &quot;no contract; fall back to the layout from <code>omx-clap-scan</code>&quot;; the daemon passes it through
and drops nothing. For an LV2 instance on mod-host the daemon answers them itself, never forwarding them, so
mod-host learns none of them: <code>track_info</code> is kept and answered <code>resp 0</code>, and the other two come from the bundle's
Turtle, read when they are asked (the manifest and the files it names with <code>rdfs:seeAlso</code>). <code>remote_pages</code> and
<code>remote_page_get</code> make a page of each <code>pg:group</code>'s control inputs in port order (the group's <code>lv2:name</code>, else its
<code>rdfs:label</code>; a further page, &quot;Name 2&quot;, for each 8 past the first), one page named Controls for the control inputs in
no group, the pages in the order their group first appears; outputs and <code>pprops:notOnGUI</code> ports are on no page, a slot
is the port's symbol, and the section is empty. <code>param_info</code> answers a control port from its own statements: its
<code>units:unit</code> (the words of <code>data/formats/lv2.json</code>, empty for a port with none), <code>stepped</code> for an integer, toggled or
enumeration port, <code>log</code> for a <code>pprops:logarithmic</code> port whose bounds are positive and <code>linear</code> otherwise, its
<code>lv2:minimum</code>, <code>lv2:maximum</code> and <code>lv2:default</code> (a toggled port's are 0, 1 and 0 when it states none), a step of 1 for
a stepped port and 0 for the others, and its symbol. <code>-511</code> stays the answer for a port with a unit the table has no
word for (a unit of the plugin's own) or no range, and <code>-103</code> for a symbol that is no control port. A bundle the
daemon cannot find or read has no pages, and <code>param_info</code> asks mod-host as it did. When a CLAP plugin changes its pages, its
worker writes <code>remote_pages_changed &lt;instance&gt;</code> on its feedback port and the daemon relays it.</p>
<p>Notes are played the same way, by a controller that is not a jack client (a web console, a test, a MIDI surface on the
network): <code>note_input</code> says whether an instance takes notes, and <code>note_on</code>, <code>note_off</code> and <code>all_notes_off</code> reach its
worker unchanged once the daemon has checked their words. A worker answers them from the plugin's note input. mod-host
takes no notes on its socket, so for an LV2 instance on mod-host the daemon answers all four <code>-514</code>, and the plugin is
played through its jack MIDI input with <code>connect</code>. omx-clap-host does not answer them yet (FreeMixer/omx-clap-core#122).</p>
<p><code>preset_list</code> and <code>preset_get</code> list a plugin's presets the way <code>remote_pages</code> and <code>remote_page_get</code> list its pages; the
key <code>preset_get</code> gives is the one <code>preset_load</code> takes. mod-host cannot list presets, so for an LV2 instance on mod-host
the daemon answers both <code>-515</code>. omx-clap-host lists them with <code>preset_list</code> and <code>preset_get</code>.</p>
<p>A plugin with a window or a surface of its own tells its host when the user takes hold of one of its knobs and lets go,
moves values by itself, and suggests a remote page. Its worker writes <code>param_gesture</code>, mod-host's <code>param_set</code> and
<code>remote_page_suggest</code> on its feedback port, and the daemon relays them as written, in order (events below). If the
worker dies, or the instance is removed, while a gesture is held, the daemon ends the gesture itself, so no control
stays held at the controller. omx-clap-host writes these lines from FreeMixer/omx-clap-core#87 on.</p>
<p>&lt;!-- BEGIN GENERATED protocol:instance-verbs --&gt;</p>
<table>
<thead>
<tr>
<th>verb</th>
<th>arguments</th>
<th>reply</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>track_info</code></td>
<td><code>&lt;instance&gt; &lt;name&gt; &lt;#RRGGBB | -&gt; [bus | return | master]</code></td>
<td><code>resp 0</code></td>
<td>the strip's name (&quot;&quot; for none), colour and kind, absent for an input channel; a worker whose plugin format has a track-info extension passes them on; any other word is -902</td>
</tr>
<tr>
<td><code>remote_pages</code></td>
<td><code>&lt;instance&gt;</code></td>
<td><code>resp &lt;count&gt;</code></td>
<td>the plugin's remote-control pages, from clap.remote-controls; 0 for an instance of a format whose worker has none</td>
</tr>
<tr>
<td><code>remote_page_get</code></td>
<td><code>&lt;instance&gt; &lt;page&gt;</code></td>
<td><code>resp 0 &lt;page_id&gt; &lt;section&gt; &lt;page_name&gt; &lt;s1&gt; &lt;s2&gt; &lt;s3&gt; &lt;s4&gt; &lt;s5&gt; &lt;s6&gt; &lt;s7&gt; &lt;s8&gt;</code></td>
<td>one page, 0 to count - 1: each slot the symbol param_set takes, - for an empty one; -902 for a page that is not one</td>
</tr>
<tr>
<td><code>param_info</code></td>
<td><code>&lt;instance&gt; &lt;symbol&gt;</code></td>
<td><code>resp 0 &lt;unit&gt; &lt;scale&gt; &lt;min&gt; &lt;max&gt; &lt;default&gt; &lt;step&gt; &lt;stable_symbol&gt;</code></td>
<td>what a parameter's value means: its unit, its scale, and the symbol it keeps across hosts and versions; -103 for a symbol that is not a parameter, the plugin's own bypass and :bypass included; -511 for a parameter whose unit and scale the worker holds no checked contract for</td>
</tr>
<tr>
<td><code>preset_list</code></td>
<td><code>&lt;instance&gt;</code></td>
<td><code>resp &lt;count&gt;</code></td>
<td>the plugin's presets, the ones its preset discovery or its bundle lists; (-515) for an instance of a worker that cannot list them</td>
</tr>
<tr>
<td><code>preset_get</code></td>
<td><code>&lt;instance&gt; &lt;index&gt;</code></td>
<td><code>resp 0 &lt;load_key&gt; &lt;name&gt;</code></td>
<td>one preset, 0 to count - 1: the key preset_load takes for it, and its name; -902 for an index that is not one</td>
</tr>
<tr>
<td><code>note_input</code></td>
<td><code>&lt;instance&gt;</code></td>
<td><code>resp 0 &lt;port | -&gt;</code></td>
<td>whether the instance takes notes: the name of its note input on its worker's jack client, - for a plugin that takes none; (-514) for an instance of a worker that cannot say</td>
</tr>
<tr>
<td><code>note_on</code></td>
<td><code>&lt;instance&gt; &lt;channel&gt; &lt;key&gt; &lt;velocity&gt;</code></td>
<td><code>resp 0</code></td>
<td>play a key: channel 0 to 15, key 0 to 127, velocity 1 to 127, a MIDI note on at the start of the worker's next cycle; (-513) for a plugin that takes no notes, (-514) for an instance of a worker that takes none on its socket, -902 for a word out of its range</td>
</tr>
<tr>
<td><code>note_off</code></td>
<td><code>&lt;instance&gt; &lt;channel&gt; &lt;key&gt; &lt;velocity&gt;</code></td>
<td><code>resp 0</code></td>
<td>release a key, velocity 0 to 127, a MIDI note off; answered as note_on is</td>
</tr>
<tr>
<td><code>all_notes_off</code></td>
<td><code>&lt;instance&gt;</code></td>
<td><code>resp 0</code></td>
<td>release every key of every channel, MIDI's all notes off (controller 123) on each; answered as note_on is</td>
</tr>
</tbody>
</table>
<p>The ledger keeps the latest <code>track_info</code> of an instance and replays it after the add; the others are never replayed. A <code>&lt;scale&gt;</code> is <code>linear</code> (the value is linear in position), <code>log</code> (the value is geometric in position; both bounds are positive), <code>stepped</code> (the whole numbers from min to max, step 1). A string word is at most 255 bytes of UTF-8 with no control character.
&lt;!-- END GENERATED protocol:instance-verbs --&gt;</p>
<p>What each host profile owes every verb a controller sends: mod-host's commands, the two that Zynthian's mod-ui still
names, and the verbs the daemon adds. A verb has a row here before the daemon serves it. The daemon relays a worker's
verb, an instance verb to the worker that holds the instance and any other to every worker, and passes its answer
back: a required verb (presets and bundles for the CLAP worker and Zynthian) answers -902
only while the worker does. MIDI learn and CV addressing are policy of the surfaces: the host answers them only as the
mechanism, and they stay optional. The preset verbs and the preset file are <a href="/projects/plugin-hostd/presets">docs/presets.md</a>.</p>
<p>&lt;!-- BEGIN GENERATED protocol:host-verbs --&gt;</p>
<table>
<thead>
<tr>
<th>verb</th>
<th>sent by</th>
<th>lv2-worker</th>
<th>clap-worker</th>
<th>console</th>
<th>zynthian</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>add</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>remove</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>bypass</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>connect</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>param_set</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>state_load</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>state_save</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>state_tmpdir</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>feature_enable</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>bundle_add</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>bundle_remove</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>preset_load</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>preset_save</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>preset_show</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>transport</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>transport_sync</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>cpu_load</code></td>
<td>mod-ui</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>midi_learn</code></td>
<td>mod-ui</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>midi_map</code></td>
<td>mod-ui</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>midi_unmap</code></td>
<td>mod-ui</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>cv_map</code></td>
<td>mod-ui</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>cv_unmap</code></td>
<td>mod-ui</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>monitor_midi_program</code></td>
<td>mod-ui</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>monitor_output</code></td>
<td>mod-ui</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>output_data_ready</code></td>
<td>mod-ui</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>patch_get</code></td>
<td>mod-ui</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>patch_set</code></td>
<td>mod-ui</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>cc_map</code></td>
<td>mod-ui</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
</tr>
<tr>
<td><code>cc_value_set</code></td>
<td>mod-ui</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
</tr>
<tr>
<td><code>cc_unmap</code></td>
<td>mod-ui</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
</tr>
<tr>
<td><code>hmi_map</code></td>
<td>mod-ui</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
</tr>
<tr>
<td><code>hmi_unmap</code></td>
<td>mod-ui</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
</tr>
<tr>
<td><code>show_external_ui</code></td>
<td>mod-ui</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
</tr>
<tr>
<td><code>set_midi_program_change_pedalboard_bank_channel</code></td>
<td>mod-ui</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
</tr>
<tr>
<td><code>set_midi_program_change_pedalboard_snapshot_channel</code></td>
<td>mod-ui</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
<td>absent</td>
</tr>
<tr>
<td><code>disconnect</code></td>
<td>mod-host</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>set_bpm</code></td>
<td>mod-host</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>set_bpb</code></td>
<td>mod-host</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>quit</code></td>
<td>mod-host</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>param_get</code></td>
<td>mod-host</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>param_monitor</code></td>
<td>mod-host</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>licensee</code></td>
<td>mod-host</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>monitor</code></td>
<td>mod-host</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>load</code></td>
<td>mod-host</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>save</code></td>
<td>mod-host</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>help</code></td>
<td>mod-host</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>track_info</code></td>
<td>mod-host</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>remote_pages</code></td>
<td>mod-host</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>remote_page_get</code></td>
<td>mod-host</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>param_info</code></td>
<td>mod-host</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>preset_list</code></td>
<td>daemon</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>preset_get</code></td>
<td>daemon</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>note_input</code></td>
<td>daemon</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>note_on</code></td>
<td>daemon</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>note_off</code></td>
<td>daemon</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>all_notes_off</code></td>
<td>daemon</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
<td>optional</td>
</tr>
<tr>
<td><code>worker_list</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>instance_info</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>supervisor_reset</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>quarantine_clear</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>policy_set</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>pool_config</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>worker_env</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>pin_set</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>pin_clear</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>pin_accept</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>pin_reload</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>pin_changed</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>lv2_worker_set</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>chain</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>chain_clear</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>chain_get</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>plan</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>plan_get</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>plan_clear</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>descriptor_get</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>panel_get</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>history_get</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>history_clear</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
<tr>
<td><code>estimate</code></td>
<td>daemon</td>
<td>required</td>
<td>required</td>
<td>required</td>
<td>required</td>
</tr>
</tbody>
</table>
<p>The profiles: <code>lv2-worker</code>, an LV2 plugin's worker: mod-host, or omx-clap-host's LV2 adapter; <code>clap-worker</code>, a CLAP plugin's worker, omx-clap-host; <code>console</code>, the openmixer console as a controller of the daemon; <code>zynthian</code>, Zynthian's mod-ui and its plugind engine as a controller of the daemon. <code>required</code> is answered as its grammar says; <code>optional</code> is answered, or refused with -902, and never misread; <code>absent</code> is refused on purpose, and no client of the profile may need it.
&lt;!-- END GENERATED protocol:host-verbs --&gt;</p>
<p>Error codes the daemon adds to mod-host's:</p>
<p>&lt;!-- BEGIN GENERATED protocol:errors --&gt;</p>
<table>
<thead>
<tr>
<th>code</th>
<th>name</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>-501</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_PLACEMENT_INVALID_RESP</code></td>
<td>placement invalid: not a placement, or not valid here, as a pool:&lt;name&gt; for a plugin of a format whose pin holds only in a world of the plugin's own, while require_pins is on</td>
</tr>
<tr>
<td><code>-502</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_NO_BACKEND_RESP</code></td>
<td>no worker program for the scheme</td>
</tr>
<tr>
<td><code>-503</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_WORKER_SPAWN_RESP</code></td>
<td>the worker is not up: the spawn failed, or it is in backoff; ask again after instance_restored</td>
</tr>
<tr>
<td><code>-504</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_REPLAY_RESP</code></td>
<td>the name of a refused replay, never a reply: a replayed add that its pin or the worker refuses is announced by the instance_replay_refused event with the refusal's own code, and written to stderr with this one and the step that refused it</td>
</tr>
<tr>
<td><code>-505</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_GAVE_UP_RESP</code></td>
<td>the storm bound is spent for that placement</td>
</tr>
<tr>
<td><code>-506</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_NO_SUCH_WORKER_RESP</code></td>
<td>no such worker</td>
</tr>
<tr>
<td><code>-507</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_VERB_DROPPED_RESP</code></td>
<td>the worker died on this very command and the daemon dropped it: it is not replayed, and the instance_verb_dropped event names it; or it died on, or did not answer in rpc_timeout_ms, the pin_expect of an add, which is then never forwarded</td>
</tr>
<tr>
<td><code>-508</code></td>
<td><code>OMX_REPLY_HOST_PIN_ABSENT_RESP</code></td>
<td>pin_mode strict and the plugin has no pin, or its layout pin is in a scheme this version does not know: add is refused and no worker sees it</td>
</tr>
<tr>
<td><code>-509</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_PIN_BINARY_MISMATCH_RESP</code></td>
<td>a pinned file is missing or its SHA-256 differs, or the plugin's manifest names a file the pin does not hold: add is refused and no worker sees it</td>
</tr>
<tr>
<td><code>-510</code></td>
<td><code>OMX_REPLY_HOST_PIN_LAYOUT_MISMATCH_RESP</code></td>
<td>the worker found the parameter layout after init differs from the layout pin: the instance is destroyed before activate</td>
</tr>
<tr>
<td><code>-511</code></td>
<td><code>OMX_REPLY_HOST_NO_PARAM_CONTRACT_RESP</code></td>
<td>the host holds no checked unit and scale for this parameter: fall back to qualification</td>
</tr>
<tr>
<td><code>-512</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_LV2_ADAPTER_REFUSED_RESP</code></td>
<td>the lv2-clap worker's LV2 adapter cannot run this plugin (MIDI it does not feed, a required feature it lacks, a layout it does not take): the worker answered the add -102, the lv2_adapter_refused event carries the hosting.* code of that reply, and under lv2_worker auto the plugin is run by the lv2 row instead and this code is never answered; a plugin no bundle of the worker's world holds is no refusal: the worker's -101 is answered</td>
</tr>
<tr>
<td><code>-513</code></td>
<td><code>OMX_REPLY_HOST_NO_NOTE_INPUT_RESP</code></td>
<td>the instance's plugin takes no notes (an effect): its worker answers note_on, note_off and all_notes_off with this code</td>
</tr>
<tr>
<td><code>-514</code></td>
<td><code>OMX_REPLY_HOST_NOTES_BY_JACK_RESP</code></td>
<td>the instance's worker takes no notes on its socket (mod-host): the daemon answers the note verbs and note_input with this code, and the plugin is played through its jack MIDI input with connect</td>
</tr>
<tr>
<td><code>-515</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_NO_PRESET_LIST_RESP</code></td>
<td>the instance's worker cannot list the plugin's presets (mod-host): the daemon answers preset_list and preset_get with this code; preset_load still takes a preset the controller knows</td>
</tr>
<tr>
<td><code>-516</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_PIN_REFUSED_RESP</code></td>
<td>the plugin's pin carries verdict=refused: its files are the ones that failed qualification, so add is refused and no worker sees it, and a replayed add is refused the same way; files that differ from the pin answer (-509) first. A pins_dir pin of that verdict is never overridden: pin_set and pin_accept of its plugin answer this code</td>
</tr>
<tr>
<td><code>-517</code></td>
<td><code>OMX_REPLY_HOST_NOTE_QUEUE_FULL_RESP</code></td>
<td>the instance's worker has no room for this note_on, note_off or all_notes_off before its next block: the line was not taken and nothing of it is kept; the controller may send it again</td>
</tr>
<tr>
<td><code>-518</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_CHAIN_UNKNOWN_INSTANCE_RESP</code></td>
<td>a member of chain is an instance no add made: the chain is not declared</td>
</tr>
<tr>
<td><code>-519</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_CHAIN_DUPLICATE_RESP</code></td>
<td>an instance is named twice in one chain: the chain is not declared</td>
</tr>
<tr>
<td><code>-520</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_CHAIN_INSTANCE_BUSY_RESP</code></td>
<td>a member of chain is already in another chain: the chain is not declared; chain_clear of the other chain frees it</td>
</tr>
<tr>
<td><code>-521</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_CHAIN_MIXED_FORMAT_RESP</code></td>
<td>the members of chain are not all run by one worker program, or are of two rows of one program and a row does not run chains in one client, so no one worker runs them: the chain is not declared</td>
</tr>
<tr>
<td><code>-522</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_NO_SUCH_CHAIN_RESP</code></td>
<td>chain_clear or chain_get of a chain no chain declared</td>
</tr>
<tr>
<td><code>-523</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_PRESET_NOT_OFFERED_RESP</code></td>
<td>the worker: preset_load or preset_show of a stable name the plugin does not offer, or of a plugin with no preset system and no state</td>
</tr>
<tr>
<td><code>-524</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_PRESET_INVALID_RESP</code></td>
<td>preset_save with a file path that is not absolute or with no name, or preset_load or preset_show of a file that cannot be read, is no JSON, is of a format version other than org.openmixer.preset/1 and org.openmixer.preset/2, or breaks the format (docs/presets.md): the daemon answers it and no worker sees the file</td>
</tr>
<tr>
<td><code>-525</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_PRESET_NEEDS_STATE_RESP</code></td>
<td>the worker: a preset file that carries state for a worker that cannot take state yet</td>
</tr>
<tr>
<td><code>-526</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_PRESET_PLUGIN_CHANGED_RESP</code></td>
<td>the worker: the preset file's plugin id, version or fingerprint is not the instance's; nothing of it is applied</td>
</tr>
<tr>
<td><code>-527</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_LOAD_REFUSED_RESP</code></td>
<td>the worker: the plugin refused the preset or the state its file carries</td>
</tr>
<tr>
<td><code>-528</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_DIR_NOT_WRITABLE_RESP</code></td>
<td>descriptor_dir or qualification_dir cannot be made or written: the daemon does not start, and says which key and which path on stderr with this code; a directory that turns read-only later makes the scan of an add write nothing, and descriptor_get and panel_get of that plugin answer this code</td>
</tr>
<tr>
<td><code>-529</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_DESCRIPTOR_ABSENT_RESP</code></td>
<td>descriptor_get (panel_get) of a plugin that has no descriptor (panel) in descriptor_dir for its binary as it is now, and none being written: no add since it changed, or a binary that cannot be found</td>
</tr>
<tr>
<td><code>-530</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_DESCRIPTOR_PENDING_RESP</code></td>
<td>descriptor_get (panel_get) of a plugin whose scan, started by its add, has not written its descriptor (panel) yet: ask again</td>
</tr>
<tr>
<td><code>-531</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_DESCRIPTOR_SCAN_FAILED_RESP</code></td>
<td>descriptor_get (panel_get) of a plugin whose last scan wrote no descriptor (panel): the scanner refused the plugin, made no dump or no panel, or is not installed; the add it ran for stands, and stderr and the scan's log say why. The next add scans again</td>
</tr>
<tr>
<td><code>-532</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_NO_SUCH_PLAN_RESP</code></td>
<td>plan_get or plan_clear of a chain no plan planned</td>
</tr>
<tr>
<td><code>-533</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_NO_RECORD_RESP</code></td>
<td>a member of estimate that no qualification record in qualification_dir names: never a reply, the code of the member in the reply's list</td>
</tr>
<tr>
<td><code>-534</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_NO_CELL_RESP</code></td>
<td>a member of estimate whose qualification records hold no point of the grid at that rate and quantum with a cost and a latency: never a reply, the code of the member in the reply's list</td>
</tr>
<tr>
<td><code>-535</code></td>
<td><code>OMX_REPLY_PLUGIN_HOSTD_UNKNOWN_PLUGIN_RESP</code></td>
<td>a member of estimate whose uri names no plugin installed here (its format cannot tell the plugin's binary, or the binary is not there): never a reply, the code of the member in the reply's list</td>
</tr>
<tr>
<td>&lt;!-- END GENERATED protocol:errors --&gt;</td>
<td></td>
<td></td>
</tr>
</tbody>
</table>
<p>A worker's own refusal is returned as it said it. An <code>add</code> that killed its worker answers mod-host's <code>-102</code>.</p>
<p><code>worker_env</code> offers no real-time priority: a worker's audio thread is set by the jack client library (under a SCHED_FIFO 60
driver it ran at 55, unasked), and a FIFO priority given to the whole process puts the plugin's own threads above
it, where a busy thread starves the graph.</p>
<p>A daemon without privilege cannot give a worker a nice lower than the worker has (a new worker has the daemon's own). The
verb still answers <code>resp 0</code>, the worker keeps its nice, and the daemon logs <code>worker_env: worker &lt;pid&gt; keeps nice &lt;n&gt;, the nice &lt;m&gt; was not applied</code> on stderr.</p>
<p>Like mod-host, the daemon serves one controller at a time, and <code>remove</code> of an instance it does not hold answers
<code>resp 0</code>. With <code>-n</code> and no <code>-f</code> there is no feedback port (mod-host's own rule), and a controller need not open
one; without <code>-n</code>, or with <code>-f</code>, the daemon waits for the controller to open both. A command that finds its
worker gone answers <code>PHD_ERR_WORKER_SPAWN</code>: the worker is not up, ask again after <code>instance_restored</code>. A command that
kills its worker answers <code>PHD_ERR_VERB_DROPPED</code>.</p>
<p>Events on the feedback port, one NUL-terminated line each:</p>
<p>&lt;!-- BEGIN GENERATED protocol:events --&gt;</p>
<table>
<thead>
<tr>
<th>event</th>
<th>fields</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>worker_died</code></td>
<td><code>&lt;worker&gt; &lt;pid&gt; &lt;exit:N | signal:N&gt; &lt;instance&gt;,...</code></td>
<td>a worker died; the instances it held, or - for none</td>
</tr>
<tr>
<td><code>instance_verb_dropped</code></td>
<td><code>&lt;instance&gt; &lt;the command as sent&gt;</code></td>
<td>the command a worker died on, dropped from the ledger; or the add it died on, the add as the worker was given it, which names the plugin, or the pin_expect of that add</td>
</tr>
<tr>
<td><code>instance_verb_dropped</code></td>
<td><code>&lt;instance&gt; suspect:&lt;ms&gt; &lt;the command as sent&gt;</code></td>
<td>the last verb a worker answered when it died inside suspect_window_ms, &lt;ms&gt; the age of the reply</td>
</tr>
<tr>
<td><code>worker_backoff</code></td>
<td><code>&lt;worker&gt; &lt;ms&gt;</code></td>
<td>the respawn waits this long</td>
</tr>
<tr>
<td><code>worker_respawned</code></td>
<td><code>&lt;worker&gt; &lt;pid&gt; &lt;replayed_count&gt; &lt;ms&gt;</code></td>
<td>a worker is back and its ledger replayed</td>
</tr>
<tr>
<td><code>instance_restored</code></td>
<td><code>&lt;instance&gt; &lt;worker&gt;</code></td>
<td>an instance is back in a worker</td>
</tr>
<tr>
<td><code>instance_replay_refused</code></td>
<td><code>&lt;instance&gt; &lt;code&gt;</code></td>
<td>a replayed add was refused, by its pin or by the worker, &lt;code&gt; the refusal's own: no worker holds the instance until the next replay</td>
</tr>
<tr>
<td><code>instance_quarantined</code></td>
<td><code>&lt;instance&gt; &lt;worker&gt;</code></td>
<td>the culprit of a pool or a chain death, placed own until cleared; a chain goes on without it</td>
</tr>
<tr>
<td><code>chain_formed</code></td>
<td><code>&lt;chain&gt; &lt;worker&gt; &lt;instance&gt;,...</code></td>
<td>a chain's worker is up with these members, in this order, after its declaration, a respawn or a member's quarantine; - for none. &lt;chain&gt; is the number chain declared, or &lt;plan&gt;.&lt;k&gt; for segment k of a plan</td>
</tr>
<tr>
<td><code>chain_refused</code></td>
<td><code>&lt;chain&gt; &lt;code&gt;</code></td>
<td>a chain's worker would not run the members as one chain, &lt;code&gt; its own answer, and its stderr says why: the chain is forgotten and each member runs in a worker of its own. &lt;chain&gt; as chain_formed names it</td>
</tr>
<tr>
<td><code>chain_stalled</code></td>
<td><code>&lt;chain&gt; &lt;instance | -&gt; &lt;step&gt; &lt;code&gt;</code></td>
<td>a chain, or a plan's segment, has not formed within chain_form_timeout_ms of its declaration: the member and the step that held it (spawn, add, pin, state, memory) and the code it answered, 0 for none, - for no one member; said once each time it is declared or gathered again, and the daemon goes on trying</td>
</tr>
<tr>
<td><code>plan_reason</code></td>
<td><code>&lt;chain&gt; &lt;instance&gt;:&lt;reason&gt;,...</code></td>
<td>a plan of the chain changed: the reasons plan_get answers now, after the segments, - for none</td>
</tr>
<tr>
<td><code>supervisor_gave_up</code></td>
<td><code>&lt;worker&gt; &lt;deaths&gt; &lt;window_ms&gt;</code></td>
<td>the storm bound is spent; respawning ends</td>
</tr>
<tr>
<td><code>pin_changed</code></td>
<td><code>&lt;uri&gt; files | layout</code></td>
<td>an add or a replay of a plugin was refused because its files, or the layout the worker found, differ from its pin; the pin is as it was until pin_accept or pin_set</td>
</tr>
<tr>
<td><code>lv2_adapter_refused</code></td>
<td><code>&lt;uri&gt; &lt;reason&gt; auto | omx-clap-host</code></td>
<td>the LV2 adapter of the lv2-clap worker refused a plugin: &lt;reason&gt; is the hosting.* code after -102 on the worker's reply to that add (- when it named none); the last word is the lv2_worker in force, auto for a plugin the lv2 row runs from now on, omx-clap-host for an add answered (-512)</td>
</tr>
<tr>
<td><code>remote_pages_changed</code></td>
<td><code>&lt;instance&gt;</code></td>
<td>relayed from a worker: the plugin changed its remote pages; read them again</td>
</tr>
<tr>
<td><code>remote_page_suggest</code></td>
<td><code>&lt;instance&gt; &lt;page_id&gt;</code></td>
<td>relayed from a worker: the plugin suggests the remote page of that id (a page_id of remote_page_get); a surface may follow it</td>
</tr>
<tr>
<td><code>param_gesture</code></td>
<td><code>&lt;instance&gt; &lt;symbol&gt; begin | end</code></td>
<td>relayed from a worker: the user took hold of a control of the plugin's own, or let it go; a controller writes no automation of that parameter in between. The values the plugin moves meanwhile, or at any time by itself, are mod-host's param_set feedback lines, relayed as written. A gesture whose worker died, or whose instance was removed, before its end is ended by the daemon, before the worker_died event</td>
</tr>
<tr>
<td><code>xruns</code></td>
<td><code>&lt;count&gt;</code></td>
<td>relayed from a worker, and read by the daemon: the JACK xruns the worker has counted since it started, written when the count changes and at most once a second; a worker that never writes it counted none. The daemon takes the first count of a worker as its baseline and, at the close of each history window, adds the window to xrun_windows_solo or xrun_windows_grouped of every member of the worker when the count rose in it; a line that is not the word and one whole number is not a count</td>
</tr>
<tr>
<td><code>abi_clobber</code></td>
<td><code>&lt;instance&gt; &lt;mask&gt; &lt;registers&gt; &lt;call&gt; &lt;block&gt;</code></td>
<td>relayed from a worker (omx-clap-host 0.26.2 or later), and read by the daemon: the plugin returned from a call with a callee-saved register changed, said once per instance. The worker put the registers back, so its own frame is whole; the other members' state in the same process is not covered, so the daemon quarantines the instance (instance_quarantined, and the history keeps it alone from then on) and, when it shares its worker or is in a chain, moves it to a worker of its own with its state saved; one already alone is only marked</td>
</tr>
<tr>
<td><code>param_set</code></td>
<td><code>&lt;instance&gt; &lt;symbol&gt; &lt;value&gt;</code></td>
<td>relayed from a worker: parameter feedback, a value the plugin moved by itself (its automation, an LFO, a preset load, a MIDI map, the user's knob of the plugin's own), as mod-host writes it; a controller updates its control to it. A worker never writes it for a value a controller's param_set gave it, and a worker that writes none changes nothing: the daemon adds no line of its own</td>
</tr>
<tr>
<td>&lt;!-- END GENERATED protocol:events --&gt;</td>
<td></td>
<td></td>
</tr>
</tbody>
</table>
<h2 id="the-workers-own-feedback">The workers' own feedback</h2>
<p>What a worker reports on its feedback port (the <code>output_set</code> of a monitored output, the <code>param_set</code> of a parameter the
plugin moved, <code>data_finish</code>, the log lines) reaches the controller on the daemon's feedback port, among the events
above:</p>
<p>&lt;!-- BEGIN GENERATED protocol:relay --&gt;
Every worker is started as <code>&lt;program&gt; -n -p &lt;command port&gt; -f &lt;feedback port&gt;</code>.</p>
<ul>
<li>every line a worker writes on its feedback port goes out on the daemon's feedback port as the worker wrote it: output_set, param_set, data_finish and the rest of mod-host's feedback, and a line the daemon does not know.</li>
<li>the instance number in a relayed line is already the controller's: add hands it to the worker unchanged, so nothing in a line is rewritten.</li>
<li>a worker's lines go out in the order it wrote them, and what a worker wrote before it died goes out before its worker_died event; an instance lives in one worker at a time, so its lines keep their order across a respawn; the lines of different workers interleave.</li>
<li>monitor_output is in the ledger, one line per output, and param_monitor as it was sent; a respawn replays them after the add, so a respawned instance reports the same outputs, each once, starting again from its first value.</li>
<li>output_data_ready names no instance and goes to every worker; each worker's data_finish is relayed.</li>
<li>with no feedback port, or no controller on it, a line is dropped, as mod-host drops it; the daemon reads every worker's feedback all the time, so no worker waits on it.
&lt;!-- END GENERATED protocol:relay --&gt;</li>
</ul>
<p>A synced delay or an arpeggiator comes back at the right tempo after a crash. What the daemon keeps of the commands
every worker shares:</p>
<p>&lt;!-- BEGIN GENERATED protocol:host-settings --&gt;</p>
<ul>
<li>the tempo, the metre and the transport a controller sets (mod-host's set_bpm, set_bpb, transport and transport_sync) are kept, the latest line of each as it was sent, in the order they were last sent.</li>
<li>a worker is handed them before anything else: a respawned one before its first add, and a worker started later, of a new placement, as well; a worker's refusal of one is written to stderr and is no failure.</li>
<li>a line whose words are not that command's grammar is passed on and not kept.
&lt;!-- END GENERATED protocol:host-settings --&gt;</li>
</ul>
<h2 id="probing-a-plugin">Probing a plugin</h2>
<p><code>plugin-hostd-probe run</code> loads a plugin in a child process under limits and writes down what happened, as facts only: no
verdict. The child is clap-qualify for a CLAP plugin. For an LV2 plugin, named <code>lv2:&lt;uri&gt;</code>, the child is plugin-qualify's
<code>lv2_measure</code>, found at run time in <code>/usr/libexec/plugin-qualify</code> (plugin-qualify is not a dependency of this package).
The runner never loads plugin code itself.</p>
<pre><code>plugin-hostd-probe run --out probe.json --log probe.stderr.log /usr/lib64/clap/plate.clap org.example.plate
plugin-hostd-probe run --out probe.json lv2:http://example.org/plate
</code></pre>
<p>A CLAP instrument is timed holding notes down: as many as the voice capacity it declares, or, when it declares none,
the count <code>--probe-notes N</code> gives; <code>--hold N</code> holds that count whatever it declares. Both are passed to clap-qualify.
Each rate's grid point carries the cost clap-qualify timed at that rate, in nanoseconds per sample, and for an instrument
<code>voices</code>, the notes it held and why that many (<code>declared</code> or <code>probe</code>). A rate it did not time has no cost. An instrument has
no input for the impulse, so its latency is measured from a note (<code>method: note-onset</code>), with <code>heard: false</code> at a rate
where the note did not sound.</p>
<p>clap-qualify runs under plugin-qualify's interposer, <code>rt_interpose.so</code> beside the child. A bare <code>--child</code> is found as execvp
finds it; name the child by path when PATH is unset or holds a directory of its name. The measured child gets the interposer
and nothing else: an <code>LD_PRELOAD</code> the runner was started with is dropped for the measurement, named in <code>run.tools.droppedPreload</code>
and in the <code>rt-safety</code> step, and put back in the runner's environment after the child. The first grid point carries what process() did under it, and an instrument's
note sweep carries what process() did while notes played. <code>run.tools.interposer</code> names it once the child says it counted
under it. With no interposer beside the child, or one that did not load, no count is written: rtSafety says
<code>interposer: false</code>, and the <code>rt-safety</code> and <code>note-sweep</code> steps are <code>probe.not-attempted</code> and say why.</p>
<p>An LV2 plugin is measured the way plugin-qualify's LV2 hosting pass measures it, in two children under the same
limits and the same wall clock. The first child (<code>lv2_measure --pin</code>) pins the bundle's files without instantiating the
plugin. The second measures at the highest of <code>--rates</code>, in blocks of <code>--quantum</code>, with 30 instantiate and destroy cycles
and 3 swept rt-safety runs. It runs under plugin-qualify's interposer (<code>rt_interpose.so</code> beside the child, found and with any
other preload dropped as for clap-qualify) and the noise stimulus. The document's binary is the plugin's library, with every pinned file of the bundle listed. The rate's grid
point carries what run() did under the interposer and, for a plugin with a MIDI input, its note sweep (what run() did
while notes played), and <code>behaviour</code> carries the lifecycles, the threads and the features
the plugin requires. A plugin no bundle holds exits 3 with no document. A plugin of which nothing could be pinned exits 2
with no document, because the document has no binary to name. Its refusal is a code on stderr: <code>&lt;plugin&gt;: &lt;code&gt;: &lt;why&gt;</code>,
<code>probe.unpinnable</code> for a bundle the pin cannot cover. Version 1 runs the quick measurement only: the deep lifecycle pass
and the soak stay plugin-qualify's until the probe protocol says which plugins get them and for how long.</p>
<p>The runner kills the whole process tree of the child at its wall clock, and again when the child is done, so a process a
plugin started in a session of its own does not outlive the run. It applies these limits on every Linux: the wall clock,
the CPU time, the memory, the open files, the file size, no core dump, the real-time priority it was granted and the
wall budget as its real-time CPU time, the memory it may lock, no new privileges, the child dying with the runner, and the
cpus the child may use (<code>--cpus</code>). <code>--list-limits</code> prints them as a run on this machine would apply them.</p>
<p>The measured child runs as the host runs the plugin: SCHED_FIFO at the highest priority the runner may give it (all of it
with <code>CAP_SYS_NICE</code>, else the <code>RLIMIT_RTPRIO</code> hard limit the runner was started with, else none), with its memory locked
by the runner's lock preload (<code>&lt;libexecdir&gt;/plugin-hostd/probe-lock.so</code>, <code>/usr/libexec</code> in the packages, beside the interposer) when its <code>RLIMIT_MEMLOCK</code>
covers the memory limit. The runner itself and an LV2 plugin's pin pass stay SCHED_OTHER. <code>run.realtime</code> says what the
kernel reported for the child after the exec (class, priority, the priority requested, who granted it, and why none),
<code>capabilityBound</code> (whether the child, as the kernel reports it, holds no capability in its permitted or effective set, so it cannot raise <code>RLIMIT_RTPRIO</code>, <code>RLIMIT_RTTIME</code> or <code>RLIMIT_MEMLOCK</code> again: the probe drops every capability and the bounding set, which a runner without <code>CAP_SETPCAP</code> cannot, and then it says <code>false</code>),
<code>offer.realtime</code> is that class, and <code>run.memoryLock</code> says whether the lock held. A service that runs the probe passes the
grant with <code>LimitRTPRIO=</code> and <code>LimitMEMLOCK=</code> (<a href="/projects/plugin-hostd/own-host#measuring-plugins-at-real-time-priority">docs/own-host.md</a>). A limit the set asks for and this version does not
apply (the number of tasks, namespaces, Landlock, seccomp) is listed in the document under <code>limits.unavailable</code> with its
code, and <code>--require tasks</code> makes the run refuse instead.</p>
<p>The memory limit (<code>--data-bytes</code>) is <code>memory.max</code> of a cgroup the measured child runs in, so the kernel counts what the
plugin really holds and kills its whole tree at the limit; that run ends <code>probe.memory-limit</code>, with the limit in the step's
detail and the document written as for any other outcome. The cgroup goes under the runner's own cgroup when that hands the
memory controller down, else beside it, else, when the runner is alone in a delegated cgroup, under it once the runner has
stepped into a leaf; it is removed after the run. A machine that gives none of these bounds the child with <code>RLIMIT_DATA</code>, and
<code>limits.unavailable</code> says so: <code>memory</code> with <code>probe.limit.cgroup-absent</code> (no cgroup v2 hierarchy) or
<code>probe.limit.controller-not-delegated</code>. Children other than the measured one always run under <code>RLIMIT_DATA</code>.</p>
<p>A plugin's footprint, when the child took one, is the point's <code>memory</code>: how far the resident set grew from before the plugin
loaded, in KB, after instantiate, after activate, at rest after processing, with notes held, and what a second instance
added. A figure the child could not take is absent, and <code>unmeasuredReason</code> says why when none could be.</p>
<p>A crash, a hang and a timeout are outcomes in the document, never a missing document: the steps the child finished before
dying stay in it. The exit status says whether there is one: 0 a complete run, 1 a document with some step that ended
otherwise, 2 no document, 3 no such plugin. The document is described by <code>probe-output.schema.json</code>, generated from the
codes in <code>protocol.h</code>, and installed with the protocol.</p>
<h2 id="pins">Pins</h2>
<p>Why: a plugin is checked before the console trusts it. We measure one build of it for crashes, real-time safety and
its parameters. The pin makes sure the bytes that load are the bytes that were checked, so an update or a swapped
file cannot slip in unchecked. The layout pin also protects the controls: presets, surfaces and the REST rows are
mapped to the plugin's parameters, and a changed layout would send values to the wrong ones. It also leaves a record
you can audit: the exact plugin build that processed the audio.</p>
<p>With <code>require_pins</code> on, the default, <code>add</code> admits only a plugin that has a pin: the SHA-256 of
every file the host loads for it, and its parameter layout fingerprint. Before any worker is spawned or sees the
<code>add</code>, the daemon hashes each pinned file over one open descriptor: for a CLAP the files beside the <code>.clap</code> that
<code>clap:&lt;path&gt;#&lt;id&gt;</code> names, the <code>.clap</code> itself among them; for an LV2 the files of the bundle whose <code>manifest.ttl</code> names
the URI, the manifest among them, and every file the manifest names with <code>lv2:binary</code> or <code>rdfs:seeAlso</code> for the plugin
must be held by the pin. No pin, or a layout pin in a scheme this version does not know, answers <code>PHD_ERR_PIN_ABSENT</code>;
a file missing, changed or not held answers <code>PHD_ERR_PIN_BINARY_MISMATCH</code>. For a CLAP the daemon then sends the worker
<code>pin_expect &lt;instance&gt; &lt;layout pin&gt;</code> and the <code>add</code> unchanged, and the worker answers <code>PHD_ERR_PIN_LAYOUT_MISMATCH</code>
when the layout after <code>init</code> is not the pinned one; a worker that refuses <code>pin_expect</code> gets no <code>add</code>, and its refusal
is the reply, and one that dies on it or does not answer it is dropped with <code>PHD_ERR_VERB_DROPPED</code>, the
<code>instance_verb_dropped</code> event naming the <code>pin_expect</code>. An LV2 worker gets no pin verb: its layout is its bundle's TTL,
which the hash covers, in a world of that one bundle; so a pinned LV2 plugin gets a worker of its own, a <code>default</code> that
resolves to a pool is placed <code>own</code> and an explicit <code>pool:&lt;name&gt;</code> answers <code>PHD_ERR_PLACEMENT_INVALID</code>.</p>
<p>Where the pin comes from is <code>pin_mode</code>. <code>strict</code> takes it from <code>pin_set</code> or from a <code>pin_file</code> loaded at start, and a
plugin with no pin is refused. <code>first-use</code>, the default, records it: the first <code>add</code> of a plugin with no pin hashes its
files, keeps the pin in the pin store (<code>$XDG_STATE_HOME/plugin-hostd/pins</code>) and places the instance <code>own</code>; the layout is
asked of the worker after the add (<code>pin_layout</code>) and recorded too. A host that pins by itself sets <code>pin_mode strict</code>.
The store, a <code>pin_file</code> and <code>pin_set</code> carry one line format, <code>pin_set &lt;uri&gt; &lt;files&gt; &lt;layout&gt; [verdict=&lt;word&gt;]</code> with the
verb optional in a file. In <code>first-use</code> only a pin with <code>verdict=in-process</code>, which plugin-qualify writes, lets a plugin
share a worker. A pin with <code>verdict=refused</code> names files that failed qualification. Their <code>add</code> answers <code>-516</code>
(<code>PIN_REFUSED</code>), no worker sees it, and a replay is refused with the same code. A pin that changes to <code>refused</code> while
the instance runs takes effect at its next replay. Files that differ from the pin answer <code>-509</code> first, because the
verdict was given for the pinned files only.</p>
<p>The pins are read again while the daemon runs, so a plugin upgrade never needs a restart (#255). The daemon stats the
<code>pin_file</code> and the <code>pins_dir</code> files at every idle tick and before every <code>add</code>, and reads them again when one changed
(a rewrite in place or a rename over it); <code>pin_reload</code>, and the sync's <code>pin_changed</code> notice, do the same at once. The
new tables are put in whole or not at all: a <code>pin_file</code> with a line outside the grammar answers <code>-902</code> and the earlier
pins hold. A <code>pin_set</code> of a controller is not in any file and is kept. Running instances keep running: one whose files
the new pins refuse is logged on stderr, and its id in <code>worker_list</code> is followed by <code>!</code> until a pin holds it again. A plugin that changed since it was pinned is refused (-509, or -510 from the worker), the
<code>pin_changed &lt;uri&gt; files|layout</code> event names what changed, and <code>pin_accept &lt;uri&gt;</code> takes the new pin.</p>
<p>Pins that ship with packages live in a read-only layer of their own, under the host's. At start the daemon reads
every <code>*.pins</code> file of <code>pins_dir</code> (<code>/usr/share/plugin-hostd/pins.d</code> by default; empty is none), in byte order of
their names, in the same line format. A package drops its own file there, so its plugins and their pins are replaced
in one transaction and removed together; plugin-hostd owns the directory and another package may co-own it. The
daemon never writes it. A pin from this layer is trusted as it is, in both pin modes. The rules:</p>
<ul>
<li>A pins.d pin with <code>verdict=refused</code> always holds. The pin store, a <code>pin_file</code> and <code>pin_set</code> never override it:
<code>pin_set</code> and <code>pin_accept</code> of its uri answer <code>-516</code> (<code>PIN_REFUSED</code>), and a line of the store or of the <code>pin_file</code>
for it is kept but has no effect, which stderr says at start.</li>
<li>Any other pins.d pin is under the host's layer. A pin of the same uri in the store, the <code>pin_file</code> or from
<code>pin_set</code> holds over it, and <code>pin_accept</code> of a plugin whose files differ from its package pin records the new files
in the store, which then hold. <code>pin_clear</code> forgets the host's pin only: the package pin holds again.</li>
<li>When two pins.d files hold the same uri, a refusal wins; otherwise the file last in name order wins. Two lines of
one file follow the same rule, the later line in place of the later file.</li>
<li>A line outside the grammar, or longer than a pin line can be, is skipped and named on stderr; the rest of the file
is read. A file that cannot be read is named on stderr and skipped. A directory that is missing or empty holds no
pins and is no error.</li>
</ul>
<p>What cannot be pinned:</p>
<p>&lt;!-- BEGIN GENERATED protocol:pin-limits --&gt;</p>
<ul>
<li>a path holding ',', '=' or whitespace cannot be pinned: they are the separators of pin_set's words, and pin_set refuses it as a token outside its grammar.</li>
<li>a pin_set line is at most line_max, 4096 bytes, the protocol socket's buffer; a longer one is refused as outside the grammar.</li>
<li>a manifest that uses @base makes add answer OMX_REPLY_PLUGIN_HOSTD_PIN_BINARY_MISMATCH_RESP (-509): the daemon does not resolve it, so it cannot know the file the host would load. A file the manifest names by a percent-encoded IRI is pinned as written, one word, and opened decoded; a name with a stray % is refused the same way.
&lt;!-- END GENERATED protocol:pin-limits --&gt;</li>
</ul>
<p>Pins are the controller's policy, like <code>policy_set</code>: not in the ledger, gone with the daemon, set again by a controller
that reconnects. A replayed <code>add</code> is checked again, so a file swapped while a worker was down is refused on respawn:
the daemon emits <code>instance_replay_refused &lt;instance&gt; &lt;code&gt;</code> with the refusal's own code (the pin's, or the worker's
when it refuses the replayed <code>pin_expect</code> or <code>add</code>), writes <code>PHD_ERR_REPLAY</code>, the step and that code to stderr, and
the worker does not hold that instance until a later replay passes. The hashing and the layout serialisation are <code>include/plugin-hostd/pin.h</code>, installed beside the
protocol header for the hosts that check a layout.</p>
<h2 id="the-running-history">The running history</h2>
<p>The daemon keeps what each plugin did on this machine, per plugin, per binary and per host class: the file named by
<code>history_file</code>, else <code>$XDG_STATE_HOME/plugin-hostd/history</code>, else <code>$HOME/.local/state/plugin-hostd/history</code>. It is
local: it holds URIs, digests and counters, no audio, no path, no user, session or preset name, the daemon sends it
nowhere and no verb writes it from outside; <code>history_clear &lt;uri | all&gt;</code> deletes it. Only the daemon writes it, mode
0600 in a directory of mode 0700, to a temporary file that is renamed over it, at most once per <code>history_save_s</code> and
at quit. <code>history_window_s</code> 0 keeps none.</p>
<p>The first line is <code># plugin-hostd history/1</code>, then one line per key, <code>history &lt;uri&gt; &lt;binary digest&gt; &lt;host class&gt; key=value ...</code>. The binary digest is the SHA-256 of the first file the plugin's pin holds, so a plugin with no pin has
no history and a changed plugin starts a record of its own, the old one kept and not read. The host class is
<code>arch/cores/clock</code> as the probe writes it (<code>x86_64/5-8/2.5-3.5GHz</code>), or the <code>host_class</code> setting. The keys are the
words of <code>PLUGIN_HOSTD_HISTORY_KEYS</code> in <a href="https://github.com/FreeMixer/plugin-hostd/blob/b4ea6a9/data/history.json">data/history.json</a>: <code>first</code>, <code>last</code>, <code>windows_solo</code>,
<code>windows_grouped</code>, <code>cpu_p95_solo</code>, <code>cpu_max_solo</code>, <code>pss_mb_solo</code>, <code>xrun_windows_solo</code>, <code>xrun_windows_grouped</code>,
<code>crashes_solo</code>, <code>crashes_grouped</code>, <code>restarts_grouped</code>, <code>quarantines</code>, <code>last_crash</code>, <code>last_crash_grouped</code>.</p>
<p>A window is <code>history_window_s</code> seconds of one worker: its utime plus stime from <code>/proc/&lt;pid&gt;/stat</code> as percent of one
core, and the <code>Pss</code> of its <code>smaps_rollup</code>. A worker of its own gives a window to the plugin it holds; a worker of two
or more gives one to each member, counted in <code>windows_grouped</code> and nowhere else, because a group's CPU cannot be split
among its members. <code>cpu_p95_solo</code> is an estimate that needs no list of windows: each window above it moves it up
by 0.95 of 2 percent of itself and each one not above moves it down by 0.05 of that. A window in which the members of
the worker changed is dropped, and a worker that died is counted if it had been up for half the window. A crash is
counted when the daemon names a culprit (<code>crashes_solo</code> in a worker of its own, <code>crashes_grouped</code> in a group), the
members that went down with it and were not the culprit get <code>restarts_grouped</code>, and a quarantine counts in
<code>quarantines</code>. A worker writes <code>xruns &lt;count&gt;</code> on its feedback port, the JACK xruns it has counted since it started,
when the count changes. The daemon takes the first count of a process as its baseline, never as xruns of the window it
arrives in, and at the close of a window adds one to <code>xrun_windows_solo</code> or <code>xrun_windows_grouped</code> of every member of
the worker when the count rose in it, however many xruns it rose by. A worker that wrote no count counted none; a
restarted worker counts from zero and its first count is a baseline again; a line that is not the word and one whole
number is not a count.</p>
<p>A line this version cannot read, or with a key it does not know, is kept as it is by every save and is not read. A file
that cannot be read, or whose first line is another version, is neither read nor overwritten: stderr says why, and
<code>history_get</code> answers <code>unavailable</code> until the file is repaired or removed.</p>
<p><code>history_get &lt;uri&gt;</code> answers the record of the binary the pin holds now, on this host class, as one word: <code>digest=</code>,
<code>class=</code>, <code>crashed=1</code> when a crash is within 30 days, <code>raises_xruns=1</code> when the share of xrun windows in a group
exceeds the share alone by 5 points (from 30 windows in a group), and then every key. <code>-</code> is no record.</p>
<p>The planner reads that summary. A plugin the history marks <code>crashed</code>, or the daemon has quarantined, is left alone by
the next plan with the reason <code>history-crashed</code>; one marked <code>raises_xruns</code> with <code>history-xruns</code>. Both are judged after
the pin's rules (a history makes a plan more careful than the pin, never less) and before the cost. A plugin's cost is
the larger of its qualification record's and its <code>cpu_p95_solo</code> (percent of one core, from the windows it ran alone). A
plugin with no history is judged by its pin and its cost alone. With the history blocked or <code>history_window_s</code> 0 the plan
is the pins' and the costs', and every member with nothing harder to say says <code>history-unavailable</code>.</p>
<p>A plan is made again by the daemon, never in the middle of a cycle of a worker, when a member of it is quarantined or
its quarantine is cleared, and <code>history_regroup_s</code> seconds after a death that named no culprit and split a group, if no
member of the plan has died since: the segments that did not change keep their workers, a group that was split is
gathered, and the member the history marks goes alone. The new reasons come as a <code>plan_reason</code> event and in <code>plan_get</code>.</p>
<p><code>estimate &lt;rate&gt; &lt;quantum&gt; &lt;uri&gt; [&lt;uri&gt; ...]</code> answers what a chain of those plugins would cost before any of them is
added: a chain editor asks it before an insert. It loads nothing and moves nothing. The figures come from the
qualification records of <code>qualification_dir</code>, the grid point at that rate and quantum: the latency is the measured
frames, else the declared ones, added up; the CPU is the cost median in nanoseconds per sample times the rate, added up,
as percent of one core's cycle. No per-worker overhead is added: none is measured. The RAM is the history's
<code>pss_mb_solo</code> of each member, in bytes, and <code>-</code> unless every member has one. The workers are the segments <code>plan</code> would make of the members, so an isolated plugin counts a worker of
its own. A member with no figure at that rate and quantum is counted and named by its position in the line, from 0,
with <code>-533</code> (no record names it), <code>-534</code> (no point of the grid at that rate and quantum with a cost and a latency) or
<code>-535</code> (the uri names no plugin installed here, which <code>plan</code> would place nowhere); the latency and the CPU add up only
the others, so a client says &quot;not measured&quot; for those members and never reads their figure as 0.</p>
<p>Four more words answer whether the chain fits in memory. <code>ram_used_bytes</code> is what the plugins running now hold, the Pss of
every worker, <code>-</code> when one cannot be read. <code>ram_added_bytes</code> is what the members would add, from the memory of the
qualification records at that rate and quantum: what instances of one plugin share is counted once in a segment, since a
segment is one process, and again in another segment, which loads it again. <code>ram_budget_bytes</code> is the host's <code>ram_budget_mb</code>,
<code>-</code> when none is set. <code>ram_unknown_count</code> is how many members have no figure: they add nothing to the sum and are not 0, and
when no member has one <code>ram_added_bytes</code> is <code>-</code>:</p>
<pre><code>estimate 48000 128 clap:/usr/lib64/clap/a.clap#org.example.a clap:/usr/lib64/clap/a.clap#org.example.b
resp 0 64 9.60 - 1 1 1:-534 0 104857600 2147483648 1
</code></pre>
<h2 id="what-a-worker-must-do">What a worker must do</h2>
<ul>
<li>answer mod-host's protocol on <code>-n -p &lt;port&gt; -f &lt;port&gt;</code>, the feedback port opened by the daemon right after the
command port;
&lt;!-- BEGIN GENERATED protocol:worker-ready --&gt;</li>
<li>print a line ending <code>ready!</code> on stdout once its socket accepts;
&lt;!-- END GENERATED protocol:worker-ready --&gt;</li>
<li>write, for <code>state_save &lt;dir&gt;</code>, files whose names begin <code>effect_&lt;instance&gt;</code> and read them back on
<code>state_load &lt;dir&gt;</code>, skipping an instance with no file.</li>
</ul>
<p><code>mod-host</code> and <code>omx-clap-host</code> do.</p>
<h2 id="formats">Formats</h2>
<p>The daemon holds its plugin formats in one table, <code>src/formats.c</code>, and nothing else in the daemon, the protocol or the
pins names a format. A row says how a uri reaches the format (<code>prefix</code>, <code>strip_prefix</code>, <code>fallback</code>), which program serves
it (<code>worker</code>), where its plugins are searched and how a worker's world is narrowed to one plugin (<code>search</code>, <code>world_env</code>,
<code>narrow_world</code>), which files a pin holds (<code>pin_collect</code>), whether the worker checks the layout (<code>layout_check</code>), whether
a pinned plugin must run in a worker of its own (<code>pinned_own_only</code>) and who answers the instance verbs
(<code>native_instance_verbs</code>, else <code>param_info</code>). Adding a format is a row and its worker; <code>formats_register</code> refuses a row
with a capability missing and says which. a test registers a third format in the test and takes it through
<code>add</code>, <code>param_set</code>, <code>pin_set</code> and <code>remove</code>.</p>
<h2 id="who-runs-an-lv2-plugin">Who runs an LV2 plugin</h2>
<p><code>lv2_worker</code> chooses the program that runs LV2 plugins: <code>auto</code> (the default: the adapter first, mod-host for a plugin the
adapter refuses, and for every add while omx-clap-host is not installed), <code>omx-clap-host</code> (the <code>clap_host</code> program, through
its LV2 adapter, a plugin it cannot run refused with a code) or <code>mod-host</code> (the <code>mod_host</code> program). <code>lv2_worker_set &lt;uri&gt; &lt;mod-host|omx-clap-host|auto|-&gt;</code> overrides it for one plugin from then on, and <code>-</code> takes
the override back. The two programs are two rows of the table, <code>lv2</code> and <code>lv2-clap</code>, so <code>policy_set</code>, <code>worker_env</code> and
<code>worker_list</code> name them like any format. The adapter row differs from the mod-host row in these ways, each held by a test:</p>
<table>
<thead>
<tr>
<th>capability</th>
<th><code>lv2</code> (mod-host)</th>
<th><code>lv2-clap</code> (omx-clap-host)</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>worker</code></td>
<td><code>mod_host</code></td>
<td><code>clap_host</code>, given the uri with its <code>lv2:</code> prefix</td>
</tr>
<tr>
<td><code>native_instance_verbs</code></td>
<td>no: the daemon answers <code>track_info</code>, <code>remote_pages</code>, <code>remote_page_get</code> and <code>param_info</code></td>
<td>yes: the worker answers them from the plugin, and <code>track_info</code> is replayed to it after a respawn</td>
</tr>
<tr>
<td><code>layout_check</code></td>
<td>no</td>
<td>no: an LV2 pin holds the layout of the plugin's ports, not of the CLAP parameters the adapter presents, so <code>pin_expect</code> would refuse every pin <code>plugin-qualify</code> wrote</td>
</tr>
<tr>
<td><code>world_scope</code></td>
<td>one bundle, narrowed: <code>LV2_PATH</code> holds a link to the plugin's bundle</td>
<td>the same: the adapter opens bundles through the LV2 world</td>
</tr>
<tr>
<td><code>pin_pool</code></td>
<td>no: a pinned plugin is placed <code>own</code></td>
<td>the same, for the same reason</td>
</tr>
</tbody>
</table>
<p>An adapter handles a subset of LV2. When it refuses a plugin, the worker answers the add <code>resp -102 &lt;hosting code&gt;</code>
(for instance <code>hosting.features.midi-in-fed-empty</code>, <code>hosting.features.missing</code>, <code>hosting.topology.wider-than-strip</code> or
<code>hosting.no-realisation</code>). The add under <code>omx-clap-host</code> then answers <code>-512</code> (<code>LV2_ADAPTER_REFUSED</code>) and the
<code>lv2_adapter_refused</code> event carries that code, read from the reply to that add and never from the worker's log, which a
pool worker shares with other plugins (<code>-</code> when the reply named none). Under <code>auto</code> the add is made again on the <code>lv2</code>
row, the plugin stays there, the event is sent once, and the controller never sees <code>-512</code>. The daemon remembers the refusal until
the adapter has a reason to take the plugin again: <code>lv2_worker_set</code> of that uri (to any word, <code>-</code> included) forgets it, and
so does a change of pins (<code>pin_set</code>, <code>pin_accept</code>, <code>pin_clear</code>) for every plugin; the next add under <code>auto</code> asks the
adapter once more.</p>
<p>A plugin the adapter refused under <code>auto</code> runs on the <code>lv2</code> row in a worker of its own, whatever the policy says, unless
its add names a placement. The adapter never ran it, so nothing says it is safe in a shared worker. Some plugins abort
in instantiate: drumkv1, samplv1 and synthv1 do, through Qt, when no display is set. Such a plugin takes down only
its own worker. The add answers <code>-102</code>, and an <code>instance_verb_dropped</code> event names the add with its uri.</p>
<p>A plugin that no bundle of the worker's world holds is not a refusal: the worker answers <code>resp -101</code> with no code. Under
<code>omx-clap-host</code> the add answers that <code>-101</code>, with no event. Under <code>auto</code> the same add is made on the <code>lv2</code> row, so mod-host
looks for the plugin; nothing is remembered, and the adapter is asked again on the next add. Under <code>auto</code> an
<code>omx-clap-host</code> that is not installed is not an error either: the add goes to the <code>lv2</code> row.</p>
`},{slug:`formats`,src:`docs/formats.md`,title:`docs/formats.md`,source:`https://github.com/FreeMixer/plugin-hostd/blob/b4ea6a9/docs/formats.md`,toc:[{id:`the-tables`,title:`The tables`},{id:`the-transforms`,title:`The transforms`},{id:`the-coverage-test`,title:`The coverage test`},{id:`the-field-dump`,title:`The field dump`},{id:`the-descriptor-describe-writes`,title:"The descriptor `describe` writes"}],html:`<h1 id="the-format-tables-how-a-scan-becomes-a-descriptor">The format tables: how a scan becomes a descriptor</h1>
<p>plugin-hostd turns what a CLAP or LV2 plugin states about itself into a <code>scanned</code> descriptor (omx-contract
<code>docs/descriptors.md</code>). Three layers do it, and each is one thing:</p>
<table>
<thead>
<tr>
<th>Layer</th>
<th>What</th>
<th>Where</th>
</tr>
</thead>
<tbody>
<tr>
<td>L1 description</td>
<td>one mapping table per format, data: every field a scan reads, mapped to a descriptor word, carried in the extension bag, or dropped by a named decision</td>
<td><code>data/formats/clap.json</code> (<code>PLUGIN_HOSTD_CLAP_MAP</code>), <code>data/formats/lv2.json</code> (<code>PLUGIN_HOSTD_LV2_MAP</code>), item kind <code>formatMap</code></td>
</tr>
<tr>
<td>L2 transforms</td>
<td>a closed list of named functions, each with its inverse, which a table names and never defines</td>
<td><code>src/transforms.h</code> (<code>TRANSFORMS(X)</code>), <code>src/transforms.c</code></td>
</tr>
<tr>
<td>L3 runtime</td>
<td>the field dump of one plugin, read as a host reads it</td>
<td>omx-clap-core's <code>omx-clap-scan --fields</code></td>
</tr>
</tbody>
</table>
<p><code>plugin-hostd-probe describe</code> joins them: it runs the dump in an isolated child, applies the table and its transforms,
and writes the descriptor. The same tables, read backwards, are what omx-plugins' generators write a CLAP face and an
LV2 <code>.ttl</code> from: one vocabulary, two directions, and the round trip (author, generate both faces, scan back, compare)
is the proof.</p>
<h2 id="the-tables">The tables</h2>
<p><code>make install-contract</code> installs both tables, with omx-contract-devel's <code>install-contract-dir.sh</code>, as the package
<code>plugin-hostd</code> of the contract directory: <code>&lt;contractdir&gt;/3/plugin-hostd/formats/{clap,lv2}.json</code>, with its
<code>MANIFEST.json</code>, beside the daemon's verbs (<code>verbs.json</code>). The noarch package plugin-hostd-contract
(<code>plugin-hostd-contract</code> on Debian too) ships them, and a program that reads them at run time requires it.
It requires omx-contract 3.2.0 or later (<code>Requires</code>, Debian <code>Depends</code>): the tables live in omx-contract's contract
directory and are read against its schema, and 3.2.0 is the first whose source field takes an index
(<code>omx_clap_panel_display.meter_ids[0]</code>), so an older omx-contract never sits beside a table it refuses.</p>
<p><code>make check-contract-dir</code> installs the package into a staging directory and runs <code>omx-contract validate</code> over it
together with the installed contract directory (omx-contract's own tables, omx-clap-core's): red on any table the
installed schema refuses, and red, never a skip, when the <code>omx-contract</code> command is absent. The coverage test below
walks the schema for the words only, never for the row keys; this gate reads every key as a reader of the installed
directory does.</p>
<p>A table's <code>rows</code> are keyed by the source field, and each row has exactly one class:</p>
<table>
<thead>
<tr>
<th>Class</th>
<th>Carries</th>
<th>Meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>word</code></td>
<td><code>{ word, transform, values? | factor? }</code></td>
<td>the descriptor word it becomes (<code>controls[].travel.unit</code>), the transform that converts it (a name of <code>TRANSFORMS(X)</code>) and that transform's data: <code>values</code> for <code>lookup</code>, <code>factor</code> for <code>scale-by</code>. Never code</td>
</tr>
<tr>
<td><code>extension</code></td>
<td><code>true</code></td>
<td>carried verbatim into the descriptor's <code>extensions.&lt;format&gt;.&lt;field&gt;</code> (a record of a control's or a port's scope under <code>&lt;scope&gt;/&lt;field&gt;</code>)</td>
</tr>
<tr>
<td><code>dropped</code></td>
<td><code>{ ruling }</code></td>
<td>left out, by the decision it names: a spec path and section, or the TERM's own <code>out-of-scope</code> mark</td>
</tr>
</tbody>
</table>
<p>Each row names what it covers, one of two: <code>term</code>, a TERM of omx-contract's format files (<code>LV2_UNITS_TERMS#unit</code>), or
<code>from</code>, the header or specification link of a field no TERM file lists (the CLAP struct fields and <code>clap_entry</code>,
<code>rdf:type</code>, <code>rdfs:comment</code>, <code>rdfs:seeAlso</code>, <code>doap:name</code>, <code>doap:license</code>).</p>
<h3 id="field-names">Field names</h3>
<p>The key of a row is the field as the dump names it:</p>
<ul>
<li>a CLAP TERM: its <code>id</code> (<code>CLAP_PARAM_IS_STEPPED</code>, <code>CLAP_EXT_LATENCY</code>, <code>CLAP_PLUGIN_FEATURE_DELAY</code>);</li>
<li>a CLAP struct field: <code>&lt;struct&gt;.&lt;member&gt;</code> as the headers spell them (<code>clap_param_info.min_value</code>), or
<code>&lt;struct&gt;.&lt;function&gt;</code> for what a call returns (<code>clap_plugin.get_extension</code>, <code>clap_plugin_params.value_to_text</code>);</li>
<li>an LV2 TERM: <code>&lt;prefix&gt;:&lt;term&gt;</code>, the term's own name under the prefix of its specification (<code>units:db</code>,
<code>lv2:toggled</code>, <code>pg:group</code>, <code>units:units.lv2</code> for the specification itself);</li>
<li>any other LV2 predicate: its usual CURIE (<code>rdf:type</code>, <code>rdfs:comment</code>, <code>doap:name</code>).</li>
</ul>
<p>The LV2 prefixes: <code>lv2</code> lv2core, <code>atom</code>, <code>bufsz</code> buf-size, <code>da</code> data-access, <code>dman</code> dynmanifest, <code>ev</code> event,
<code>ia</code> instance-access, <code>log</code>, <code>midi</code>, <code>morph</code>, <code>opts</code> options, <code>param</code> parameters, <code>patch</code>, <code>pg</code> port-groups,
<code>pprops</code> port-props, <code>pset</code> presets, <code>rsz</code> resize-port, <code>state</code>, <code>time</code>, <code>ui</code>, <code>units</code>, <code>urimap</code> uri-map, <code>urid</code>,
<code>work</code> worker; and <code>rdf</code>, <code>rdfs</code>, <code>doap</code>, <code>foaf</code> for the W3C and DOAP vocabularies.</p>
<h3 id="field-rows-and-value-rows">Field rows and value rows</h3>
<p>Some TERMs are fields (<code>lv2:minimum</code>, <code>units:unit</code>); others are values a field takes (<code>units:db</code> is a value of
<code>units:unit</code>, <code>lv2:toggled</code> of <code>lv2:portProperty</code>, <code>CLAP_PARAM_IS_STEPPED</code> of <code>clap_param_info.flags</code>). Every TERM has
its row either way. A record of the dump is resolved in this order:</p>
<ol>
<li>when its value is the key of a row (a value row): a <code>word</code> row converts it, a <code>dropped</code> row drops it, an <code>extension</code>
row says the value has no word of its own and defers to the field's row;</li>
<li>otherwise the field's row: a <code>word</code> row converts the value (a <code>lookup</code> that has no entry for it carries the value
in the bag instead), an <code>extension</code> row carries it in the bag, a <code>dropped</code> row drops it;</li>
<li>a field with no row at all is refused: <code>describe</code> names it and writes no descriptor.</li>
</ol>
<p>A value row's <code>lookup</code> holds its own pair (<code>units:db</code> -&gt; <code>dB</code>): the unit rows are the same correspondence as
omx-plugins' <code>LV2_UNITS</code> (<code>tools/gen.mjs</code>), and where the TERM file names the unit's word the row maps to that word,
which the coverage test holds.</p>
<h3 id="what-a-table-drops">What a table drops</h3>
<p>A row is <code>dropped</code> only by a decision it names. The TERMs omx-contract marks <code>out-of-scope</code> are dropped by that mark,
which the row quotes. A field this section rules out is dropped by <code>docs/formats.md#what-a-table-drops</code>:</p>
<ul>
<li>a runtime handle that is no fact of the plugin (<code>clap_param_info.cookie</code>, a pointer the host passes back);</li>
<li>every field of the panel description (<code>omx_clap_plugin_panel_description.*</code> and the <code>omx_clap_panel_*</code> structures of
omx-clap-core's <code>omx_clap_ext.h</code>): the panel travels whole, as the scan's <code>panel</code> object, by <code>panel_get</code>
(<a href="/projects/plugin-hostd/panel">panel.md</a>), and the descriptor carries none of it. A panel field's row is a drop and nothing else;
<code>describe</code> refuses a table that makes one a word or the bag.</li>
</ul>
<p>A TERM omx-contract marks <code>used</code> is never dropped: its row is a word or the bag.</p>
<h3 id="outbound-read-rows">Outbound-read rows</h3>
<p>A generator reads a value row of a table to write a face: the TERM is a value (not a <code>property</code>) and omx-contract
lists omx-plugins among its users (<code>by</code>). Such a row's transform is <code>identity</code> or <code>lookup</code>, the two a generator applies
by reading the table alone; what is structure (scale points, groups, module paths) stays in the generator's code.</p>
<h2 id="the-transforms">The transforms</h2>
<p><code>src/transforms.h</code> declares the closed list as one X-macro, <code>TRANSFORMS(X)</code>: the name a table writes, the inbound
function (format to descriptor) and its inverse (descriptor to format), all prefixed <code>transforms_</code>. A value crosses as
text: a JSON literal on the descriptor side (<code>-60</code>, <code>&quot;dB&quot;</code>, <code>true</code>, <code>[&quot;Filter&quot;,&quot;Envelope&quot;]</code>), the dump's text on the
format side.</p>
<table>
<thead>
<tr>
<th>Name</th>
<th>Inbound</th>
<th>Inverse</th>
<th>Data</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>identity</code></td>
<td>the value as it is, a number as a number</td>
<td>the same</td>
<td>none</td>
</tr>
<tr>
<td><code>lookup</code></td>
<td>the value's entry in <code>values</code></td>
<td>the key whose entry it is</td>
<td><code>values</code>, one to one: a table whose values repeat is refused</td>
</tr>
<tr>
<td><code>scale-by</code></td>
<td>the number times <code>factor</code></td>
<td>the number divided by <code>factor</code></td>
<td><code>factor</code>, not zero</td>
</tr>
<tr>
<td><code>flag</code></td>
<td>present -&gt; <code>true</code></td>
<td><code>true</code> -&gt; the row's key, <code>false</code> -&gt; nothing</td>
<td>none</td>
</tr>
<tr>
<td><code>scale-points</code></td>
<td><code>&lt;number&gt; &lt;label&gt;</code> -&gt; one point of the control's <code>values</code> and <code>labels</code></td>
<td>the point back as <code>&lt;number&gt; &lt;label&gt;</code></td>
<td>none</td>
</tr>
<tr>
<td><code>group-path</code></td>
<td>a CLAP module path <code>a/b</code> -&gt; the group <code>[&quot;a&quot;,&quot;b&quot;]</code></td>
<td>the group joined by <code>/</code></td>
<td>none</td>
</tr>
<tr>
<td><code>port-group</code></td>
<td>an LV2 group's label -&gt; the group <code>[&quot;label&quot;]</code>; a <code>pg:subGroupOf</code> label -&gt; a level put before the group read so far</td>
<td>the path's last level, the group a port names</td>
<td>none</td>
</tr>
</tbody>
</table>
<p>A new transform is added when a row needs it, never before; <code>make test-transforms</code> runs every function and its inverse
over its vectors (in, out, back in, equal).</p>
<h2 id="the-coverage-test">The coverage test</h2>
<p><code>make test-format-coverage</code> runs <code>tests/format_coverage.py</code> once per format. The field list is every term of the
installed TERM files (<code>&lt;contractdir&gt;/3/omx-contract/formats/&lt;format&gt;/**</code>) plus every row with a <code>from</code>; each field has
exactly one row. It prints, per field, <code>mapped &lt;word&gt; &lt;transform&gt;</code>, <code>extension &lt;format&gt;</code> or <code>dropped &lt;decision&gt;</code>, then the
count per class. It is red for:</p>
<ul>
<li>a field with no row, and a row that covers no field (its <code>term</code> is no installed term);</li>
<li>a <code>word</code> the descriptor schema lacks (walked in the installed <code>omx-contract.schema.json</code>), or a <code>lookup</code> entry that
is no value the word takes;</li>
<li>a <code>transform</code> that is not in <code>TRANSFORMS(X)</code>, or a <code>lookup</code> that is not one to one;</li>
<li>a <code>used</code> TERM that is <code>dropped</code>, and a <code>dropped</code> row that names no decision;</li>
<li>an outbound-read row whose transform is neither <code>identity</code> nor <code>lookup</code>;</li>
<li>a unit row that does not map to the word its TERM names.</li>
</ul>
<p><code>tests/format_coverage.py --self-test</code> breaks a copy of each table three ways (one row removed, one <code>word</code> misspelt,
one transform renamed) and each arm must go red naming the field.</p>
<h2 id="the-field-dump">The field dump</h2>
<p><code>omx-clap-scan --fields clap:&lt;path&gt;#&lt;id&gt; | lv2:&lt;uri&gt;</code> writes one record per line, TAB-separated:</p>
<pre><code>&lt;scope&gt;	&lt;field&gt;	&lt;value&gt;
</code></pre>
<ul>
<li><code>scope</code>: <code>plugin</code>; <code>param:&lt;index&gt;</code> (CLAP, in <code>clap_plugin_params.get_info</code> order); <code>audio_in:&lt;index&gt;</code>,
<code>audio_out:&lt;index&gt;</code>, <code>note_in:&lt;index&gt;</code>, <code>note_out:&lt;index&gt;</code> (CLAP ports); <code>port:&lt;index&gt;</code> (an LV2 port, by
<code>lv2:index</code>). A scope is a source field's first segment, so a bag key <code>&lt;scope&gt;/&lt;field&gt;</code> is one too. A CLAP plugin
that serves a panel description adds <code>panel</code>, <code>section:&lt;index&gt;</code>, <code>control:&lt;index&gt;</code>, <code>role:&lt;index&gt;</code>,
<code>display:&lt;index&gt;</code> and <code>placement_default:&lt;index&gt;</code> (omx-clap-scan 0.20.0); these scopes are no entry of the
descriptor, and each of their fields is dropped (above).</li>
<li><code>field</code>: a row key, as named above.</li>
<li><code>value</code>: the field's value as text. A number in <code>%.17g</code>; a CLAP constant (a flag bit, a port type, a note dialect,
an extension id, a feature the headers define) by its macro name, one record per flag set or per item; an LV2 URI as
a CURIE under the prefixes above, a URI no prefix covers in full; a scale point or a CLAP value text as
<code>&lt;number&gt; &lt;label&gt;</code>. A TAB or a newline in a text becomes a space.</li>
<li>the provenance: a CLAP dump writes <code>plugin	clap_entry	&lt;file name of the .clap&gt;</code>, an LV2 dump
<code>plugin	rdfs:seeAlso	&lt;bundle directory&gt;/&lt;data file&gt;</code>, the <code>.ttl</code> that describes the plugin.</li>
</ul>
<p>The first line is <code># omx-clap-scan --fields 1</code>, the format's version; a dump with another version is refused.</p>
<h2 id="the-descriptor-describe-writes">The descriptor <code>describe</code> writes</h2>
<p><code>plugin-hostd-probe describe [--table &lt;file&gt;] [--fields-from &lt;dump.tsv&gt;] clap:&lt;path&gt;#&lt;id&gt; | lv2:&lt;uri&gt;</code> writes the
<code>scanned</code> descriptor on stdout, exit 0; 2 when nothing is written (usage, a table it cannot read, a refused dump), 3 when
the dump cannot be made. Without <code>--fields-from</code> it runs <code>omx-clap-scan --fields</code> under the probe runner's limits, in a
child of its own (<code>run</code>'s isolation); with it, it reads a recorded dump, which is what its own tests do.</p>
<p>What the tables leave to <code>describe</code>:</p>
<ul>
<li>each scope is one entry: a CLAP <code>param:</code> scope a control, a CLAP port scope a port, an LV2 <code>port:</code> scope a control
when a row makes it one (<code>lv2:ControlPort</code>) and a port when a row gives it a port kind; <code>id</code> and <code>name</code> follow the
entry;</li>
<li>an LV2 control's kind is <code>travel</code> (its <code>lv2:ControlPort</code> row) unless another record of the port gives a more
specific one (<code>toggle</code>, <code>choice</code>, <code>trigger</code>), whatever order the dump lists the port's records in;</li>
<li>an LV2 travel that states both <code>lv2:integer</code> (stepped) and <code>pprops:logarithmic</code> (log) is <code>log</code>, whatever order the
dump lists them in;</li>
<li>an LV2 output control is <code>readonly</code>; an LV2 port that reports latency (<code>lv2:latency</code>) is no control;</li>
<li>consecutive LV2 audio ports of one direction, role and group are one port, its <code>channels</code> their count, its layout
<code>mono</code> or <code>stereo</code> by that count;</li>
<li>a CLAP port that is not main is <code>aux</code>; a control's <code>unit</code> is <code>unknown</code> when no row sets it, its <code>scale</code> <code>unknown</code>
on CLAP and <code>linear</code> on LV2 (where a scale not stated is linear); its <code>meaning</code> is <code>unknown</code> when no row sets it; a
control with points is a <code>choice</code>, its <code>ids</code> taken from its labels and its default the id of the default's point, a
<code>toggle</code> defaults to its default being non-zero;</li>
<li>an LV2 port's group path is its <code>pg:group</code> label with one <code>pg:subGroupOf</code> record per group above it, nearest first
(the scanner follows the chain, <code>lv2:name</code> else <code>rdfs:label</code> of each group); the path is read outermost first, and a
<code>pg:subGroupOf</code> with no <code>pg:group</code> before it is refused;</li>
<li>the bag holds a field's one value as it is, two or more as a list;</li>
<li>a plugin no feature of which maps is an <code>audio-effect</code>; an LV2 plugin's <code>id</code> and <code>uri</code> are the URI asked for;</li>
<li>the links a scanned descriptor needs (<code>source.from</code>): a CLAP descriptor's own, <code>&lt;file&gt;#clap_entry</code>; each LV2
control's, <code>&lt;data file&gt;#&lt;symbol&gt;</code>, from the row of <code>clap_entry</code> and of <code>rdfs:seeAlso</code>; a character a link cannot hold
becomes <code>_</code>; <code>instrument</code> is written when the features hold it, <code>polyphonic</code> when it states more than one voice; <code>latency</code>
is always written, <code>reports</code> false when no row sets it.</li>
<li>a word of a table that <code>describe</code> does not write is refused with the table: a new word is code here first.</li>
</ul>
`},{slug:`own-host`,src:`docs/own-host.md`,title:`the highest SCHED_FIFO priority, which the probe asks for, and a lock as large as the probe's memory limit`,source:`https://github.com/FreeMixer/plugin-hostd/blob/b4ea6a9/docs/own-host.md`,toc:[{id:`lv2-plugins`,title:`LV2 plugins`},{id:`measuring-plugins-at-real-time-priority`,title:`Measuring plugins at real-time priority`},{id:`what-a-zynthian-integration-still-needs-from-us`,title:`What a Zynthian integration still needs from us`}],html:`<h1 id="use-plugin-hostd-in-your-own-host">Use plugin-hostd in your own host</h1>
<p>This page takes a Debian machine (Raspberry Pi OS, Zynthian, any Debian 12 or 13, arm64 or amd64) from nothing to a
plugin running under plugin-hostd, driven over its socket, in nine commands, and then runs an LV2 plugin the same way in eight more. CI runs every command below, as written, in
a clean Debian container on Debian 12 and 13, on both architectures; a step that stops working fails that job.</p>
<p>The plugin is a CLAP effect from the <code>omx-plugins-clap</code> package, so nothing else has to be installed to try it. Any
host that already speaks mod-host's socket protocol can send the same lines.</p>
<p>The first line of the block is a helper, not counted: one protocol message in, the reply out (a message ends in a NUL
byte, which <code>printf</code> adds). A trailing <code># resp ...</code> or <code># has ...</code> is the reply or output CI expects; to you it is a
comment.</p>
<p>The commands, in order. Run them as a normal user with <code>sudo</code>, or as root:</p>
<pre><code class="language-sh">send() { printf '%s\\0' &quot;$1&quot; | nc -w3 127.0.0.1 5555 | tr '\\0' '\\n'; }
curl -fsSLO https://www.openmixer.org/deb/openmixer-release.deb
sudo apt-get install -y ./openmixer-release.deb
sudo apt-get update &amp;&amp; sudo apt-get install -y plugin-hostd omx-clap-host omx-plugins-clap jackd2 netcat-openbsd
jackd -r -d dummy &gt;/dev/null 2&gt;&amp;1 &amp; sleep 2
plugin-hostd -n -p 5555 &gt;plugin-hostd.log 2&gt;&amp;1 &amp; sleep 2
omx-clap-scan /usr/lib/clap/omx-comp.clap | grep 'param 1 '  # has Ratio [1 .. 20] default 4
send &quot;add clap:/usr/lib/clap/omx-comp.clap#org.openmixer.comp 0&quot;   # resp 0
send &quot;param_set 0 1 8&quot;   # resp 0
send &quot;param_get 0 1&quot;   # resp 0 8.0000
</code></pre>
<p>What each step did:</p>
<ol>
<li><code>curl</code> fetches the repository key of the FreeMixer channel. It signs every package, for x86_64 and arm64.</li>
<li>The <code>echo</code> adds the channel for your Debian release (<code>bookworm</code> and <code>trixie</code> are published).</li>
<li><code>apt-get install</code> takes the daemon, the CLAP worker <code>omx-clap-host</code>, a set of CLAP plugins to try, and JACK. On a
machine that already runs JACK (Zynthian does) leave <code>jackd2</code> out.</li>
<li><code>jackd -r -d dummy</code> starts a JACK server that needs no sound card. On a real machine use the one you have.</li>
<li><code>plugin-hostd -n -p 5555</code> starts the daemon on the command port, 5555. It prints <code>plugin-hostd ready!</code> once the port
accepts. No worker exists until the first <code>add</code>. The ports listen on 127.0.0.1; a controller on another machine needs
<code>--bind-address</code> (<code>man plugin-hostd</code>).</li>
<li><code>omx-clap-scan</code> reads the plugin's layout: every parameter, its number, range and default. The number is the symbol
the protocol takes, so the compressor's Ratio is <code>1</code>.</li>
<li><code>add</code> loads the plugin as instance <code>0</code>. The daemon starts a worker of its own for it, a JACK client named
<code>effect_0</code>, and puts it back if it dies.</li>
<li><code>param_set</code> sets Ratio to 8.</li>
<li><code>param_get</code> reads it back.</li>
</ol>
<h2 id="lv2-plugins">LV2 plugins</h2>
<p>Zynthian's plugins are mostly LV2. <code>omx-clap-host</code>, which you already installed, also runs an LV2 plugin through its LV2
adapter; the LV2 build of the same plugins is the package <code>omx-plugins-lv2</code>. Continue in the same shell, with the
<code>send</code> helper of the first block and JACK still running. <code>lv2_worker</code> names the program that runs LV2 plugins, and
<code>mod-host</code> is the default, so the daemon is restarted with <code>omx-clap-host</code> named in its configuration file. An LV2
plugin is added by its URI with an <code>lv2:</code> prefix, and its parameters are named by their LV2 symbol (<code>ratio</code>), not by a
number.</p>
<pre><code class="language-sh">send &quot;quit&quot;; sleep 1   # resp 0
sudo apt-get install -y omx-plugins-lv2
echo &quot;lv2_worker omx-clap-host&quot; &gt; plugin-hostd.conf
plugin-hostd -n -p 5555 -c plugin-hostd.conf &gt;plugin-hostd-lv2.log 2&gt;&amp;1 &amp; sleep 2
send &quot;add lv2:urn:openmixer:comp 0&quot;   # resp 0
send &quot;param_set 0 ratio 8&quot;   # resp 0
send &quot;param_get 0 ratio&quot;   # resp 0 8.0000
send &quot;worker_list&quot;   # has :lv2-clap:
</code></pre>
<ol>
<li><code>quit</code> stops the daemon and the worker of the first block.</li>
<li><code>apt-get install</code> adds the LV2 bundles under <code>/usr/lib/lv2</code>, where the daemon searches.</li>
<li>The configuration file makes <code>omx-clap-host</code> the worker of LV2 plugins.</li>
<li>The daemon starts again with it.</li>
<li><code>add</code> loads the plugin by its URI as instance <code>0</code>, in a worker of its own.</li>
<li>and 7. <code>param_set</code> and <code>param_get</code> set and read back the compressor's Ratio by its symbol.</li>
<li><code>worker_list</code> names the worker of each instance; <code>lv2-clap</code> is <code>omx-clap-host</code> running an LV2 plugin.</li>
</ol>
<p>CI also sends a sine into the instance's JACK ports and measures what comes out, with the Makeup gain set to 6 dB and
Ratio to 1: the output peak must be 1.995 times the input's.</p>
<p>Pins need nothing from you. A plugin has to be pinned (its files' hashes and its parameter layout) before the daemon
lets it run; in the default <code>first-use</code> mode the first <code>add</code> records the pin in <code>$XDG_STATE_HOME/plugin-hostd/pins</code>, and
a later <code>add</code> of a changed file is refused with a <code>pin_changed</code> event. A host that pins by itself sets <code>pin_mode strict</code>.
See Pins in the <a href="/projects/plugin-hostd">README</a>.</p>
<p>What to read next: <code>man plugin-hostd</code>; the verbs and error codes in the README; <code>remote_pages</code> and <code>remote_page_get</code> for
the plugin's own pages of controls; the machine-readable protocol at
<code>/usr/share/plugin-hostd-protocol/plugin-hostd.json</code>; a C consumer can include <code>plugin-hostd/protocol.h</code>
(<code>pkg-config --cflags plugin-hostd-protocol</code>, package <code>libplugin-hostd-protocol-dev</code>).</p>
<h2 id="measuring-plugins-at-real-time-priority">Measuring plugins at real-time priority</h2>
<p><code>plugin-hostd-probe</code> measures a plugin on a SCHED_FIFO thread at the highest priority it is granted, with its memory
locked, as JACK or PipeWire runs it; without a grant the figures are taken at ordinary priority, and the record says so
(<code>run.realtime.class: none</code> and the reason). On Zynthian and on the console, plugin-qualify's sync service
(<code>plugin-qualify-sync.service</code>) runs the probe; it passes the grant with a drop-in,
<code>/etc/systemd/system/plugin-qualify-sync.service.d/realtime.conf</code>:</p>
<pre><code class="language-ini">[Service]
# the highest SCHED_FIFO priority, which the probe asks for, and a lock as large as the probe's memory limit
LimitRTPRIO=99
LimitMEMLOCK=infinity
# the unit forbids real time to everything it starts; the probe bounds it instead (RLIMIT_RTPRIO, RLIMIT_RTTIME)
RestrictRealtime=no
</code></pre>
<p>then <code>sudo systemctl daemon-reload</code>. Where the distribution lets a service hold capabilities,
<code>AmbientCapabilities=CAP_SYS_NICE</code> grants the same priority without the rlimit; a CI job whose container holds CAP_SYS_NICE
and no CAP_SYS_RESOURCE runs the probe's real-time arm on that route, so the record's <code>grantedBy: cap</code> is measured on every
push. A unit without <code>User=</code> runs the probe as root: the measured child then has every capability and the bounding set dropped, and <code>run.realtime.capabilityBound</code> says whether that held (<code>false</code> when the runner lacks <code>CAP_SETPCAP</code>, where only a <code>User=</code> with <code>AmbientCapabilities=</code> keeps the bound). <code>plugin-qualify --all</code>, run by hand,
gets the grant of the user's login session: the <code>rtprio</code> and <code>memlock</code> of <code>/etc/security/limits.d/</code>, as for JACK (for
example the <code>audio</code> group's). <code>plugin-hostd-probe run --list-limits</code> prints what a run would get: the <code>realtime</code> line
names the grant and the priority, or why there is none.</p>
<p>The probe's memory limit is <code>memory.max</code> of a cgroup it makes for the measured child. A service running as root needs nothing
for that. A service under another user needs <code>Delegate=memory</code> in the same drop-in; without it the limit is <code>RLIMIT_DATA</code>, and
the document says so under <code>limits.unavailable</code>.</p>
<h2 id="what-a-zynthian-integration-still-needs-from-us">What a Zynthian integration still needs from us</h2>
<p>Checked in a clean Debian container against published packages. The first item against 0.4.0 of the daemon and 0.10.0 of
the worker and plugins (the page's CI); the others against 0.2.1 of the daemon and 0.8.0 of the worker and plugins, on
trixie, and not re-checked since:</p>
<ul>
<li>An LV2 plugin that the LV2 adapter of <code>omx-clap-host</code> refuses needs mod-host, which neither Debian nor the FreeMixer
channel packages. The add answers <code>-512</code>; <code>lv2_worker auto</code> runs such a plugin in mod-host when one is installed.</li>
<li><code>param_info</code> answers <code>-511</code> (the worker holds no checked unit and scale) for every parameter of a CLAP instance with
the released worker, 0.8.0; the daemon passes the answer through. A host reads ranges and defaults from
<code>omx-clap-scan</code> (or <code>omx-clap-scan --json</code>) and not from the socket, until a worker answers <code>resp 0</code>.</li>
<li>Parameters are named by their CLAP number (<code>0</code>, <code>1</code>, ...), not by a name; a host maps names to numbers from the scan.</li>
<li>No Zynthian image was available to CI: the check is on plain Debian arm64, not on Zynthian's own userland (its jackd,
its audio configuration, its realtime limits).</li>
</ul>
<p>Each of these is an issue of its own.</p>
`},{slug:`panel`,src:`docs/panel.md`,title:`docs/panel.md`,source:`https://github.com/FreeMixer/plugin-hostd/blob/b4ea6a9/docs/panel.md`,toc:[{id:`the-verb`,title:`The verb`},{id:`where-the-panel-comes-from`,title:`Where the panel comes from`},{id:`the-file`,title:`The file`},{id:`the-format-tables-stay-strict`,title:`The format tables stay strict`},{id:`why-a-verb-of-its-own`,title:`Why a verb of its own`},{id:`drawing-a-panel-the-three-verbs-together`,title:`Drawing a panel: the three verbs together`}],html:`<h1 id="the-panel-a-plugin-publishes-served-to-a-host">The panel a plugin publishes, served to a host</h1>
<p>A plugin of omx-plugins states how its panel is laid out through the CLAP extension
<code>org.openmixer.panel-description/1</code> (omx-clap-core's <code>src/omx_clap_ext.h</code>, omx-plugins' <code>include/omx_panel_description.h</code>):
its family, a fingerprint, and five tables, the sections, the controls (each with its parameter, section, widget and
visibility rule), the roles, the displays and the placement defaults. A host that draws the panel itself, such as
Zynthian's engine, reads it from the daemon with <code>panel_get</code>.</p>
<h2 id="the-verb">The verb</h2>
<pre><code>panel_get &lt;uri&gt;          resp 0 &quot;&lt;path&gt;&quot;
</code></pre>
<p><code>&lt;uri&gt;</code> is the one <code>add</code> takes (<code>clap:&lt;path&gt;#&lt;id&gt;</code>, <code>lv2:&lt;uri&gt;</code>). The reply is the path of the plugin's panel file,
one quoted word as <code>descriptor_get</code> answers its descriptor. The codes are <code>descriptor_get</code>'s:</p>
<table>
<thead>
<tr>
<th>Code</th>
<th>When</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>-529</code></td>
<td>no descriptor, or a descriptor with no panel beside it, for the plugin's binary as it is now: no add since it changed, a binary that cannot be found, a descriptor filed by a daemon that predates <code>panel_get</code></td>
</tr>
<tr>
<td><code>-530</code></td>
<td>the scan of its add has not filed the panel yet: ask again</td>
</tr>
<tr>
<td><code>-531</code></td>
<td>the last scan filed no panel: the descriptor failed, or the panel stage did (the scanner states no panel, see below); the next add scans again</td>
</tr>
<tr>
<td><code>-528</code></td>
<td>descriptor_dir could not be written</td>
</tr>
<tr>
<td><code>-902</code></td>
<td>no <code>&lt;uri&gt;</code>, or more than one word</td>
</tr>
</tbody>
</table>
<h2 id="where-the-panel-comes-from">Where the panel comes from</h2>
<p>The answered <code>add</code> of a plugin whose files have no descriptor runs the scan, in a child of its own, as it does for
<code>descriptor_get</code>. The scan has two stages:</p>
<ol>
<li><code>plugin-hostd-probe describe &lt;target&gt;</code>, whose stdout is the descriptor, filed as
<code>&lt;descriptor_dir&gt;/&lt;id&gt;@&lt;version&gt;-&lt;hash&gt;.json</code>;</li>
<li>once that file is in place, <code>plugin-hostd-probe panel &lt;target&gt;</code>, whose stdout is the panel, filed under the same
name in <code>&lt;descriptor_dir&gt;/panels/</code>. Both are written once, atomically.</li>
</ol>
<p><code>panel</code> runs <code>omx-clap-scan --json</code> on the plugin's file (omx-clap-core 0.20.0 or later) and copies the <code>panel</code> object
the scan prints for the plugin's id, byte for byte. The daemon never reads the plugin's <code>decl.json</code> and never calls the
extension: what the scan printed is what a host gets. An add of a plugin whose descriptor is in place and whose panel
is not (a descriptor of an older daemon, a panel stage that failed) runs the panel stage alone.</p>
<h2 id="the-file">The file</h2>
<pre><code class="language-json">{&quot;plugin&quot;: {&quot;format&quot;: &quot;clap&quot;, &quot;id&quot;: &quot;org.openmixer.delay&quot;}, &quot;panel&quot;: {&quot;family&quot;: &quot;...&quot;, &quot;fingerprint&quot;: &quot;...&quot;,
 &quot;sections&quot;: [...], &quot;controls&quot;: [...], &quot;roles&quot;: [...], &quot;displays&quot;: [...], &quot;placementDefaults&quot;: [...]}}
</code></pre>
<ul>
<li><code>panel</code> is the scan's object as omx-clap-scan(1) states it: each entry with the members of its structure, a code by
omx-plugins' word for it, an id that is none as <code>null</code>, a visibility mask as a hex string.</li>
<li><code>panel</code> is <code>null</code> for a plugin that serves no description.</li>
<li>a table the scan refused for its count (past 4096 entries) stays refused: <code>{&quot;refused&quot;: &quot;too-many&quot;, &quot;count&quot;: &lt;n&gt;, &quot;max&quot;: 4096}</code> in place of its array, the other tables as they are.</li>
<li>an LV2 plugin's <code>panel</code> is <code>null</code>: the description is a CLAP extension, and nothing is run for it.</li>
<li>a scan that states no <code>panel</code> for the plugin (a scanner before omx-clap-scan 0.20.0, a plugin that fails to
initialise) is refused, and <code>panel_get</code> answers <code>-531</code>: a missing panel is never read as a null one.</li>
</ul>
<p>The field dump (<code>omx-clap-scan --fields</code>) prints the same description under its own scopes; the format table drops
each of those fields (docs/formats.md#what-a-table-drops), so the descriptor carries none of it.</p>
<h2 id="the-format-tables-stay-strict">The format tables stay strict</h2>
<p>A scan scope or field the format table has no row for is refused, and the add of that plugin answers <code>-531</code> for its
panel. A new scope or field of omx-clap-scan therefore needs its row in <code>data/formats/clap.json</code> first, with the rule
that says whether the descriptor carries it or drops it; a daemon is not to learn a scope by ignoring what it does not
know. Whether a refusal that costs one plugin its whole panel should rise to a single, higher-altitude refusal is a
design question of its own; until it is decided the tables stay strict.</p>
<h2 id="why-a-verb-of-its-own">Why a verb of its own</h2>
<p>The panel could have been a word more of <code>descriptor_get</code>'s reply, or a member of the descriptor. The protocol's own
conventions decide against both:</p>
<ul>
<li>Reply size. A message is at most <code>line_max</code>, 4096 bytes, the socket's buffer, and one panel table may hold 4096
entries. A panel never fits a reply, so it is a file the reply names, as the descriptor is.</li>
<li>No optional reply words. Every reply of the protocol is one fixed grammar, word by word (the protocol JSON's
<code>reply</code>); what is optional is a verb, answered or refused with <code>-902</code>, never a field a client must guess the
presence of. A second path in <code>descriptor_get</code>'s reply would change a <code>required</code> verb's grammar for every client
that parses it. A new verb leaves <code>descriptor_get</code> as it is, and a daemon that predates <code>panel_get</code> answers it
<code>-902</code>, which no client misreads.</li>
<li>The descriptor is omx-contract's document. A <code>scanned</code> descriptor follows <code>omx-contract.schema.json</code>, which has no
panel; the descriptor file stays what plugin-qualify and omx-contract's reader read.</li>
</ul>
<p>So <code>panel_get</code> is a daemon verb, required for every profile like <code>descriptor_get</code>, with its file beside the
descriptor's and the same codes.</p>
<h2 id="drawing-a-panel-the-three-verbs-together">Drawing a panel: the three verbs together</h2>
<p>A native renderer combines what the daemon serves; none of the three replaces another.</p>
<table>
<thead>
<tr>
<th>What</th>
<th>Verb</th>
<th>Keyed by</th>
</tr>
</thead>
<tbody>
<tr>
<td>the structure: sections, which control is in which, its widget, when it is shown, roles, displays</td>
<td><code>panel_get &lt;uri&gt;</code></td>
<td>the plugin's files</td>
</tr>
<tr>
<td>what a value means: unit, scale, range, default, step, the stable symbol</td>
<td><code>param_info &lt;instance&gt; &lt;symbol&gt;</code></td>
<td>the running instance</td>
</tr>
<tr>
<td>the pages of 8 a hardware surface steps through</td>
<td><code>remote_pages &lt;instance&gt;</code>, <code>remote_page_get &lt;instance&gt; &lt;page&gt;</code></td>
<td>the running instance</td>
</tr>
</tbody>
</table>
<ol>
<li>After <code>add &lt;uri&gt; &lt;instance&gt;</code>, ask <code>panel_get &lt;uri&gt;</code> until it is no <code>-530</code>. Only a <code>null</code> panel, and an LV2 plugin
until its bundle is read for a panel, mean the plugin states no layout: draw the
controls in parameter order, as a host did before. Every other code is a failure to show, not a plugin without a
layout: <code>-531</code> is a panel stage that failed and <code>-528</code> a descriptor directory that could not be written, and the
plugin may well have a layout. Name the failure to the user, and draw in parameter order only as the fallback.</li>
<li>For each control of <code>panel.controls</code> (in table order), its <code>paramId</code> is the CLAP parameter id, the number
<code>omx-clap-scan</code> lists a parameter by and the <code>&lt;symbol&gt;</code> the instance verbs take for a CLAP instance. The daemon does not parse that word:
<code>sup_instance_verb</code> (src/supervisor.c) passes the line of a format with native instance verbs, CLAP among them, to the
worker untouched, and omx-clap-host(1) states that it addresses a CLAP parameter by its decimal CLAP id.
<code>param_info &lt;instance&gt; &lt;paramId&gt;</code> gives its unit and scale,
so a knob shows <code>dB</code> and moves on its own scale; <code>-511</code> means the worker holds no checked contract, and the range
and default come from <code>omx-clap-scan</code>'s parameter list.</li>
<li>A control whose <code>visibleParamId</code> is not <code>null</code> is shown while bit <code>v</code> of <code>visibleMask</code> is set, <code>v</code> the value of that
parameter (<code>param_get</code>).</li>
<li><code>remote_page_get</code> gives the plugin's own grouping in eights, each slot a symbol: a surface with eight encoders
pages through those, the panel's sections and widgets dressing each slot.</li>
<li>A refused table is drawn as the plugin having none of it, and named to the user: its count is in the refusal.</li>
</ol>
<p>What the panel cannot give yet: an enum's labels and the remote pages in the scan itself;
until then a choice's labels come from the worker (<code>param_info</code> and the plugin's value texts) and the pages from
<code>remote_page_get</code>, both on a running instance.</p>
`},{slug:`placement`,src:`docs/placement.md`,title:`docs/placement.md`,source:`https://github.com/FreeMixer/plugin-hostd/blob/b4ea6a9/docs/placement.md`,toc:[{id:`the-policy`,title:`The policy`},{id:`the-configuration`,title:`The configuration`},{id:`what-reports-the-core`,title:`What reports the core`},{id:`the-clap-thread-pool`,title:`The CLAP thread pool`},{id:`measured`,title:`Measured`}],html:`<h1 id="core-placement-one-worker-per-chain-pinned-across-the-audio-cores">Core placement: one worker per chain, pinned across the audio cores</h1>
<p>plugin-hostd runs each chain (and each plugin that may not share) in a worker process of its own. On a small machine,
a Raspberry Pi 5 with four cores, the kernel and the JACK server decide where those processes run unless someone pins
them. A plugin's own threads do not help: Surge XT 1.4.0 and the other plugins measured on the Pi 5 ignore CLAP's
thread-pool extension, so one instrument is one audio thread. Several instruments use several cores only when each
runs in a worker of its own and those workers are spread over the cores, with the daemon, the UI and the system kept
off them.</p>
<p>The setting <code>placement</code> does that.</p>
<h2 id="the-policy">The policy</h2>
<ul>
<li><strong>Audio cores.</strong> <code>audio_cores</code> is a cpu list (<code>1-3</code>, <code>2,3</code>). Empty, the default, is every cpu the daemon may run on
when it starts (its affinity, so a <code>taskset</code> or a cgroup is honoured) except the lowest one. A list that names a cpu
outside that set refuses the start.</li>
<li><strong>The reserved cores</strong> are the daemon's cpus that are not audio cores: the lowest one by default. The daemon pins
itself and all its threads there at start. The processes it starts that are not workers, the descriptor scans and
probes, are forked from it and inherit that mask. The UI is the system's to pin there (<code>taskset -c 0</code>, or
<code>CPUAffinity=0</code> in its unit). With no reserved core left (<code>audio_cores</code> names every cpu) the daemon is not pinned, and stderr says so.</li>
<li><strong>Each new worker</strong> is pinned (<code>sched_setaffinity</code>, in the child before it runs the worker program, so every thread
it creates, its JACK or PipeWire thread included, inherits the mask) to one audio core: the one with the least load.
The load of a core is the sum of the estimated costs of the workers already placed on it, when the cost of every
placed worker is known. A worker's cost is the sum of its members' <code>coreFractionP95</code> from their qualification records
at <code>group_rate</code> and <code>group_quantum</code>, as the planner reads it. When any placed worker has a member without a record,
the load is the number of workers. Ties go to the lowest core. So four workers on four cpus land on cores 1, 2, 3 and
1, with the daemon on 0.</li>
<li><strong>A worker keeps its core</strong> when it is respawned. A worker that is made anew (a chain formed, a group split by a
death, a quarantined member moved out) is placed again.</li>
<li><strong>Chains and isolated plugins.</strong> A chain, whether declared by <code>chain</code> or a segment of a <code>plan</code>, is one worker, so it
takes one core. A plugin the planner leaves alone, an <code>isolated</code> verdict among them, gets a worker
of its own, placed by the same rule. Zynthian still sees one chain.</li>
<li><strong><code>worker_env</code>.</strong> A format whose workers were given a cpu list by <code>worker_env</code> keeps that list: the policy does not
move those workers, and they report no core.</li>
<li><strong><code>placement none</code></strong> is the behaviour before this setting. Nothing is pinned, the workers inherit the daemon's mask,
and the reports say <code>-</code>.</li>
</ul>
<h2 id="the-configuration">The configuration</h2>
<p>In the settings file (<code>-c</code>, or <code>$XDG_CONFIG_HOME/plugin-hostd.conf</code>):</p>
<pre><code>placement spread        # or none
audio_cores 1-3         # empty: every cpu the daemon may use but the lowest
</code></pre>
<p>and on the command line, over the file: <code>plugin-hostd --placement=none</code>.</p>
<h2 id="what-reports-the-core">What reports the core</h2>
<ul>
<li><code>worker_list</code>: each record is <code>&lt;worker&gt;:&lt;pid&gt;:&lt;format&gt;:&lt;state&gt;:&lt;core&gt;:&lt;pool&gt;:&lt;place&gt;:&lt;instances&gt;</code>, <code>&lt;core&gt;</code> the audio
core the policy pinned it to, <code>-</code> for none, <code>&lt;pool&gt;</code> <code>on</code> or <code>qualified</code> (below). The place still holds colons, so a
record is read from both ends: six fields on the left, the instances on the right.</li>
<li><code>plan</code> answers <code>resp 0 &lt;segments&gt; &lt;cores&gt;</code> and <code>plan_get</code> <code>resp 0 &lt;segments&gt; &lt;reasons&gt; &lt;cores&gt;</code>: <code>&lt;cores&gt;</code> has the
shape of <code>&lt;segments&gt;</code>, each member replaced by the core of the worker that runs it now (<code>-</code> for none), so <code>1,2;3</code>
placed on cores 2 and 1 reads <code>2,2;1</code>.</li>
</ul>
<h2 id="the-clap-thread-pool">The CLAP thread pool</h2>
<p>omx-clap-host's pool of helper threads (<code>--thread-pool=qualified|off|on</code>) sizes itself from the
worker's affinity mask: N cores, N - 1 helpers. The pool is the plugin's qualification's to give, never a global switch,
and it travels in the plugin's pin as the word <code>pool=cores</code> (or <code>pool=off</code>) after the verdict:</p>
<pre><code>pin_set &lt;uri&gt; &lt;files&gt; &lt;layout&gt; verdict=isolated pool=cores
</code></pre>
<p>A CLAP or lv2-clap worker of a plugin whose pin says <code>pool=cores</code> (and is not a refusal) is started with
<code>--thread-pool=on</code>, after the cpus above are set, so the mask it sizes the pool from is the one the policy gave it. The
plugin runs in a worker of its own: the planner leaves it alone (<code>verdict-isolated</code>), a <code>pool:</code> placement and a chain
are refused for it, and a respawn starts the worker with the option again. Every other worker is started with no
option, the host's <code>qualified</code>, which grants the pool to no plugin. The pool's waits past the block are in the worker's
<code>xruns</code> line, so they are attributed as any xrun is. Pins are read while <code>require_pins</code> is on, so the pool is too.</p>
<h2 id="measured">Measured</h2>
<p>On a Pi 5, with two and three LV2 instruments in workers of their own, <code>spread</code> put the workers on cores 1-3 and the
daemon on 0, and core 0 fell from 7-9 % busy to under 2 %. Neither mode had an xrun at that load, so no xrun
gain is shown yet: the instruments use a fraction of one core. A run that fills the audio cores is still owed.</p>
`},{slug:`presets`,src:`docs/presets.md`,title:`Presets in the host`,source:`https://github.com/FreeMixer/plugin-hostd/blob/b4ea6a9/docs/presets.md`,toc:[{id:`who-owns-what`,title:`Who owns what`},{id:`verbs`,title:`Verbs`},{id:`the-file-org-openmixer-preset`,title:`The file: org.openmixer.preset`},{id:`loading-a-file`,title:`Loading a file`}],html:`<h1 id="presets-in-the-host">Presets in the host</h1>
<p>Presets in the host, as this tree builds it. The schema is
<a href="https://github.com/FreeMixer/plugin-hostd/blob/b4ea6a9/protocol/preset.schema.json">protocol/preset.schema.json</a>; <code>tests/preset_format.py</code> holds it to the examples below.</p>
<h2 id="who-owns-what">Who owns what</h2>
<ul>
<li>The <strong>worker</strong> (omx-clap-host for CLAP, its LV2 adapter for LV2) holds the instance, so it owns the primitives: list
the plugin's own presets, load one, write the instance to a file, load a file.</li>
<li>The <strong>daemon</strong> relays the verbs to the worker that holds the instance and passes its answer back; it answers -902
only while the worker does. Before a file reaches a worker it reads it and refuses one that is not a preset file of
a version it knows (<code>PRESET_INVALID</code>), so no worker guesses at a format.</li>
<li>The <strong>consumer</strong> (the console, the Zynthian engine) owns the library: where files live, the user's presets, rename,
delete, banks. The host never decides a path or a name: both arrive as arguments.</li>
</ul>
<p>MIDI learn is policy of the surfaces: the host answers <code>midi_learn</code>, <code>midi_map</code>, <code>midi_unmap</code>, <code>cv_map</code> and <code>cv_unmap</code>
only as the mechanism, and the host verb table keeps them optional for every profile.</p>
<h2 id="verbs">Verbs</h2>
<table>
<thead>
<tr>
<th>verb</th>
<th>arguments</th>
<th>reply</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>preset_list</code></td>
<td><code>&lt;instance&gt;</code></td>
<td><code>resp &lt;count&gt;</code>, then <code>preset_get &lt;instance&gt; &lt;index&gt;</code> one row each</td>
</tr>
<tr>
<td><code>preset_load</code></td>
<td><code>&lt;instance&gt; &lt;stable name | file path&gt;</code></td>
<td><code>resp 0</code></td>
</tr>
<tr>
<td><code>preset_save</code></td>
<td><code>&lt;instance&gt; &lt;file path&gt; &lt;name&gt;</code></td>
<td><code>resp 0</code>: the worker wrote the file</td>
</tr>
<tr>
<td><code>preset_show</code></td>
<td><code>&lt;instance&gt; &lt;stable name | file path&gt;</code></td>
<td><code>resp 0 &lt;json&gt;</code>: what a load would apply, on one line of JSON (below)</td>
</tr>
</tbody>
</table>
<p>The reply of <code>preset_show</code> is <code>resp 0 &lt;json&gt;</code>, one shape on every worker and through the daemon, which passes the worker's
line on unchanged: the rest of the line after <code>resp 0 </code> is one JSON object on one line. For a file it is the document with
each state body's <code>bytes</code> replaced by its decoded <code>size</code>; for a listed preset (a stable name) it holds <code>name</code>, <code>loadKey</code>
and <code>location</code>. It is not <code>resp 0 &lt;carries&gt; &lt;name&gt;</code>: <code>carries</code> and <code>name</code> are fields of that object.</p>
<p>A file path is absolute (it starts with <code>/</code>); any other word is a stable name of the plugin's own presets, the
<code>load_key</code> of <code>preset_get</code>. The name of <code>preset_save</code> is the rest of the line, quoted when it holds a space.
<code>preset_show</code> has two forms, told apart by their number of words: <code>preset_show &lt;instance&gt; &lt;key&gt;</code> goes to the worker
that holds the instance alone, and <code>preset_show &lt;uri&gt;</code>, mod-host's form, goes to every worker and is answered as
mod-host answers it, by the LV2 worker: the preset's state, with no <code>resp</code> before it (the first answer of the workers
when no LV2 worker of mod-host's is up).
<code>bundle_add</code> and <code>bundle_remove</code> stay as declared.</p>
<h3 id="refusals">Refusals</h3>
<table>
<thead>
<tr>
<th>code</th>
<th>name</th>
<th>who</th>
<th>when</th>
</tr>
</thead>
<tbody>
<tr>
<td>-523</td>
<td><code>PRESET_NOT_OFFERED</code></td>
<td>worker</td>
<td>a stable name the plugin does not offer, or a plugin with no preset system and no state</td>
</tr>
<tr>
<td>-524</td>
<td><code>PRESET_INVALID</code></td>
<td>daemon, worker</td>
<td>a path that is not absolute, a <code>preset_save</code> with no name, a file that cannot be read, is no JSON, is of an unknown format version, or breaks the schema</td>
</tr>
<tr>
<td>-525</td>
<td><code>PRESET_NEEDS_STATE</code></td>
<td>worker</td>
<td>a file that carries state for a worker that cannot take state yet; it disappears when every worker takes state</td>
</tr>
<tr>
<td>-526</td>
<td><code>PRESET_PLUGIN_CHANGED</code></td>
<td>worker</td>
<td>the file's plugin id, version or fingerprint is not the instance's</td>
</tr>
<tr>
<td>-527</td>
<td><code>LOAD_REFUSED</code></td>
<td>worker</td>
<td>the plugin refused the state or the preset (its load callback failed)</td>
</tr>
</tbody>
</table>
<h2 id="the-file-org-openmixer-preset">The file: org.openmixer.preset</h2>
<p>The console's format, extended additively. <code>/1</code> stays valid and is params-only: our own plugins and their factory
presets never change. A file with a state body is <code>/2</code>.</p>
<table>
<thead>
<tr>
<th>field</th>
<th></th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>format</code></td>
<td>required</td>
<td><code>org.openmixer.preset/1</code> or <code>org.openmixer.preset/2</code>; any other is refused, never guessed</td>
</tr>
<tr>
<td><code>plugin.id</code></td>
<td>required</td>
<td>the plugin's id: the CLAP id, or the LV2 uri</td>
</tr>
<tr>
<td><code>plugin.version</code></td>
<td>required in /2</td>
<td>the plugin's version as its descriptor says</td>
</tr>
<tr>
<td><code>plugin.fingerprint</code></td>
<td>required in /2</td>
<td>the descriptor fingerprint: the plugin's layout pin, <code>omx-layout/1:&lt;sha256&gt;</code>; a fingerprint of a scheme this version does not know is refused</td>
</tr>
<tr>
<td><code>id</code></td>
<td>required</td>
<td>stable, minted by the consumer; a worker writing a file names it after the file (its name without <code>.json</code>)</td>
</tr>
<tr>
<td><code>name</code></td>
<td>required</td>
<td>display, free text, editable on user presets only</td>
</tr>
<tr>
<td><code>alias</code></td>
<td>optional</td>
<td>a short label, at most 12 characters, for small displays (a scribble strip); absent means derive from <code>name</code></td>
</tr>
<tr>
<td><code>bank</code>, <code>tags</code>, <code>description</code></td>
<td>optional</td>
<td>the consumer's</td>
</tr>
<tr>
<td><code>createdAt</code>, <code>modifiedAt</code></td>
<td>optional</td>
<td>ISO 8601 UTC, <code>YYYY-MM-DDTHH:MM:SSZ</code></td>
</tr>
<tr>
<td><code>carries</code></td>
<td>required in /2</td>
<td><code>params</code>, <code>params+state</code> or <code>state</code></td>
</tr>
<tr>
<td><code>params</code></td>
<td></td>
<td><code>[{symbol, unit, value}]</code>: plain values, written as the plugin gave them, never a float widened</td>
</tr>
<tr>
<td><code>state</code></td>
<td></td>
<td><code>{encoding: &quot;base64&quot;, context, bytes, files?}</code>; <code>context</code> is <code>preset</code> or <code>project</code> for CLAP (the clap.state context), <code>lv2</code> for LV2; <code>files</code> <code>[{name, encoding, bytes}]</code> are LV2 state paths, a file name each</td>
</tr>
</tbody>
</table>
<p>The writer picks <code>carries</code>: <code>params</code> when the plugin has only declared parameters, otherwise <code>state</code> (<code>params+state</code>
when both are read). <code>carries</code> and the body agree: <code>params</code> has <code>params</code> and no <code>state</code>, <code>params+state</code> both, <code>state</code>
a <code>state</code>. Unknown fields are kept on rewrite.</p>
<p>A params-only file of /2:</p>
<pre><code class="language-json">{&quot;format&quot;: &quot;org.openmixer.preset/2&quot;,
 &quot;plugin&quot;: {&quot;id&quot;: &quot;org.freemixer.comp&quot;, &quot;version&quot;: &quot;1.2.0&quot;,
            &quot;fingerprint&quot;: &quot;omx-layout/1:0000000000000000000000000000000000000000000000000000000000000000&quot;},
 &quot;id&quot;: &quot;warm&quot;, &quot;name&quot;: &quot;Warm Pad&quot;, &quot;createdAt&quot;: &quot;2026-10-22T21:00:00Z&quot;, &quot;modifiedAt&quot;: &quot;2026-10-22T21:00:00Z&quot;,
 &quot;carries&quot;: &quot;params&quot;, &quot;params&quot;: [{&quot;symbol&quot;: &quot;gain&quot;, &quot;unit&quot;: &quot;dB&quot;, &quot;value&quot;: -3.25}]}
</code></pre>
<p>A state file adds <code>&quot;carries&quot;: &quot;params+state&quot;</code> and
<code>&quot;state&quot;: {&quot;encoding&quot;: &quot;base64&quot;, &quot;context&quot;: &quot;preset&quot;, &quot;bytes&quot;: &quot;AAEC&quot;}</code>.</p>
<h2 id="loading-a-file">Loading a file</h2>
<ol>
<li>The daemon reads the file and checks it against the format above (<code>PRESET_INVALID</code> when it does not hold); no
worker is asked.</li>
<li>The worker compares <code>plugin</code> with the instance: another id, version or fingerprint answers <code>PRESET_PLUGIN_CHANGED</code>
and nothing is applied.</li>
<li>The worker applies the state body when the file carries one, then the parameter values, each clamped to its
declared range, an unknown symbol ignored, as clap.state's load does.</li>
</ol>
<p>Parameter feedback (the <code>param_set</code> event a worker writes for a value the plugin moved by itself, a preset load
included) is the declared event of the protocol's JSON (plugin-hostd-protocol's <code>plugin-hostd.json</code>); a controller's own writes produce none.</p>
`}],r={repo:e,commit:t,pages:n};export{t as commit,r as default,n as pages,e as repo};