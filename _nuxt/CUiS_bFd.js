var e=`omx-clap-core`,t=`d53f42b8689dc42669552b8518feef626ea9c828`,n=[{slug:``,src:`README.md`,title:`README.md`,source:`https://github.com/FreeMixer/omx-clap-core/blob/d53f42b8689dc42669552b8518feef626ea9c828/README.md`,toc:[{id:`install`,title:`Install`},{id:`status`,title:`Status`},{id:`try-it`,title:`Try it`}],html:`<h1 id="omx-clap-host">omx-clap-host</h1>
<p>omx-clap-host hosts CLAP and LV2 audio plugins without a screen. You drive it over a socket
with the same text commands as mod-host, and each plugin appears in your JACK or PipeWire
graph as a client of its own. It is for controllers, mixers and stage rigs on Linux that
already talk to mod-host and want CLAP plugins beside their LV2 ones.</p>
<ul>
<li>Same protocol as mod-host: <code>add</code>, <code>param_set</code>, <code>bypass</code>, <code>connect</code>, with mod-host's replies and error codes.</li>
<li>Every plugin is a JACK client <code>effect_&lt;N&gt;</code> with ports <code>in_&lt;k&gt;</code> and <code>out_&lt;k&gt;</code>, laid out as mod-host lays out an LV2 plugin.</li>
<li>Instruments work too: a note input becomes a MIDI port, <code>effect_&lt;N&gt;:midi_in</code>, and a note output another, <code>effect_&lt;N&gt;:midi_out</code>.</li>
<li>LV2 plugins too: <code>add lv2:&lt;uri&gt; &lt;N&gt;</code> (or the URI alone, as mod-host takes it) runs an LV2 plugin from <code>LV2_PATH</code> on the same ports, its controls addressed by their LV2 symbols.</li>
<li>Tempo-synced plugins get a transport: <code>set_bpm</code>, <code>set_bpb</code> and <code>transport</code> drive the host's own, or <code>-t</code> follows the JACK transport.</li>
<li>Meters and latency reach your graph: gain-reduction meters come back as <code>output_set</code> lines, and the plugin's latency is published on its ports.</li>
<li>A plugin's own window, on request: <code>show_external_ui &lt;N&gt;</code> puts it on your display, as jalv and mod-host show one, and <code>hide_external_ui &lt;N&gt;</code> takes it off. On a Wayland session it is a Wayland window when the plugin has one; X11 otherwise.</li>
<li><code>-S</code> shows every plugin's window as it is added; with no display the command says so by code and the audio runs on.</li>
<li><code>omx-clap-scan</code> lists what a CLAP file holds (parameters, ports, latency), as text or JSON; <code>--fields</code> dumps every field one CLAP or LV2 plugin states, the records plugin-hostd builds its descriptors from.</li>
</ul>
<p>An LV2 plugin runs natively: it is a real LV2 instance, loaded through lilv into the host's own
process, with no emulation and no wrapper process. What sits between it and the host is the
LV2 adapter, the library <code>libomx-clap-lv2</code> linked into omx-clap-host, and it maps the host
interface only: the plugin's ports and controls are presented as CLAP ports and parameters, so
one hosting core drives both formats. Any program can link the adapter too, from the package
<code>omx-clap-lv2-devel</code> (<code>libomx-clap-lv2-dev</code> on Debian). lilv is loaded on the first LV2 add. A
plugin the adapter cannot map is refused with its reason: <code>resp -102 hosting.features.missing</code>.
What is supported, what is not and the test behind each row is in
<a href="https://github.com/FreeMixer/omx-clap-core/blob/d53f42b8689dc42669552b8518feef626ea9c828/docs/lv2-compatibility.md">docs/lv2-compatibility.md</a>. plugin-hostd, which runs each plugin in a
process of its own, hosts CLAP and LV2 with omx-clap-host as the worker of both, and mod-host for
an LV2 plugin the adapter refuses.</p>
<p>The CLAP hosting core is a library of its own, <code>libomx-clap-core</code>, for programs that host CLAP
plugins themselves: it checks a plugin before using it, runs its audio on your thread and keeps
its parameters and state. The host, the core and the LV2 adapter share one version.</p>
<h2 id="install">Install</h2>
<p>Fedora (x86_64 and aarch64):</p>
<pre><code>sudo dnf install https://www.openmixer.org/rpm/openmixer-release.noarch.rpm
sudo dnf install omx-clap-host
</code></pre>
<p>Debian bookworm and trixie and Raspberry Pi OS (amd64 and arm64):</p>
<pre><code>curl -fsSLO https://www.openmixer.org/deb/openmixer-release.deb &amp;&amp; sudo apt install ./openmixer-release.deb
sudo apt install omx-clap-host
</code></pre>
<p>The latest release ships these packages, all from the same version:</p>
<table>
<thead>
<tr>
<th>What</th>
<th>Fedora</th>
<th>Debian</th>
</tr>
</thead>
<tbody>
<tr>
<td>The host and the scanner: <code>omx-clap-host</code>, <code>omx-clap-scan</code>, their manual pages</td>
<td><code>omx-clap-host</code></td>
<td><code>omx-clap-host</code></td>
</tr>
<tr>
<td>The hosting core, a shared library</td>
<td><code>omx-clap-core</code></td>
<td><code>libomx-clap-core1</code></td>
</tr>
<tr>
<td>Headers, pkg-config file and ABI baseline to build a program on the core</td>
<td><code>omx-clap-core-devel</code></td>
<td><code>libomx-clap-core-dev</code></td>
</tr>
<tr>
<td>The core's definitions in omx-contract's contract directory: hosting limits and codes, the host verbs</td>
<td><code>omx-clap-core-contract</code> (noarch)</td>
<td><code>omx-clap-core-contract</code> (all)</td>
</tr>
<tr>
<td>Headers, pkg-config file and static library of the LV2 adapter, to link at build time (LV2 at run time is <code>omx-clap-host</code> with lilv)</td>
<td><code>omx-clap-lv2-devel</code></td>
<td><code>libomx-clap-lv2-dev</code></td>
</tr>
</tbody>
</table>
<p>For your own program, install the <code>-devel</code> / <code>-dev</code> package and build with
<code>pkg-config --cflags --libs omx-clap-core</code> (and <code>omx-clap-lv2</code> for the adapter).</p>
<h2 id="status">Status</h2>
<p>The latest release is packaged for Fedora 44 and Debian bookworm and trixie. What
the continuous integration runs on every push, and the packages it builds:</p>
<ul>
<li>The plugin lifecycle and the scanner against fake plugins, including a plugin that crashes.</li>
<li>The hosting core with untrusted plugins, under AddressSanitizer and UndefinedBehaviorSanitizer.</li>
<li>The LV2 adapter against fixture bundles, validated with <code>lv2_validate</code>.</li>
<li>An LV2 plugin through the host in a JACK graph: <code>add lv2:&lt;uri&gt;</code>, refusals with their codes,
parameters by symbol, <code>lv2:enabled</code> as the bypass, state, presets and remove; and its output bit
for bit against mod-host and against the adapter in process.</li>
<li>The host in a JACK graph, over PipeWire's JACK and over JACK2's <code>jackd</code> (x86_64): port layout,
latency, MIDI input for instruments, meters.</li>
<li>The exported symbols of <code>libomx-clap-core</code> against a versioned baseline.</li>
<li>RPMs (Fedora 44, x86_64 and aarch64) and DEBs (bookworm and trixie, amd64 and arm64), each
installed in a clean root or container.</li>
</ul>
<p>Almost all of LV2 is supported: <a href="https://github.com/FreeMixer/omx-clap-core/blob/d53f42b8689dc42669552b8518feef626ea9c828/docs/lv2-compatibility.md">docs/lv2-compatibility.md</a> lists
each feature with the test behind it, and the few that are not supported, each with its reason.
Every CLAP extension, what the host does with it and the test behind each claim, is in
<a href="https://github.com/FreeMixer/omx-clap-core/blob/d53f42b8689dc42669552b8518feef626ea9c828/docs/clap-compatibility.md">docs/clap-compatibility.md</a>.</p>
<h2 id="try-it">Try it</h2>
<p>List what a CLAP file holds (any <code>.clap</code> will do; this one is LSP's):</p>
<pre><code>omx-clap-scan /usr/lib64/clap/lsp-plugins.clap
</code></pre>
<p>Start the host. It prints <code>omx-clap-host ready!</code>:</p>
<pre><code>omx-clap-host -n -p 5555
</code></pre>
<p>In another terminal, load a limiter, set its output gain to -6 dB and read it back
(messages end in a NUL byte, which <code>printf</code> adds; a parameter is the plugin's CLAP id,
which the scan prints):</p>
<pre><code>send() { printf '%s\\0' &quot;$1&quot; | nc -w3 127.0.0.1 5555 | tr '\\0' '\\n'; }
send &quot;add clap:/usr/lib64/clap/lsp-plugins.clap#in.lsp-plug.limiter_stereo 0&quot;   # resp 0
send &quot;param_set 0 3630838676 -6&quot;                                               # resp 0
send &quot;param_get 0 3630838676&quot;                                                  # resp 0 -6.0000
send &quot;bypass 0 1&quot;                                                              # resp 0
</code></pre>
<p>The plugin is now the JACK client <code>effect_0</code>: link your audio to its <code>in_&lt;k&gt;</code> ports and take it
from its <code>out_&lt;k&gt;</code> ports. On a desktop, or over the VNC display a Zynthian serves, a plugin that
has its own window shows it (CLAP plugins with Wayland or X11 windows; LV2 desktop UIs are not
shown yet):</p>
<pre><code>send &quot;show_external_ui 0&quot;                                                      # resp 0
send &quot;hide_external_ui 0&quot;                                                      # resp 0
</code></pre>
<p>The show tries, in order: a Wayland floating window, when <code>WAYLAND_DISPLAY</code> names a compositor
and the plugin offers one; an X11 window embedded in one of the host's, on <code>DISPLAY</code>; an X11
floating window. The first the plugin offers whose display answers is taken.</p>
<p>An LV2 plugin is added by its URI, from the bundles on <code>LV2_PATH</code>, and its controls are its port
symbols, as with mod-host. Its audio ports are read by the LV2 port groups, so a mono-in
stereo-out reverb has <code>in_1</code> and <code>out_1</code>, <code>out_2</code>; a plugin the LV2 adapter cannot map answers
<code>resp -102</code> and the code that says why:</p>
<pre><code>send &quot;add lv2:urn:zamaudio:ZamComp 1&quot;                                          # resp 1
send &quot;param_set 1 thr -20&quot;                                                     # resp 0
send &quot;param_get 1 thr&quot;                                                         # resp 0 -20.0000
send &quot;add lv2:http://moddevices.com/plugins/caps/Plate 2&quot;                       # resp 2
</code></pre>
<p>More: <a href="https://github.com/FreeMixer/omx-clap-core/blob/d53f42b8689dc42669552b8518feef626ea9c828/doc/reference.md">every command, meters, bypass, port layout, latency and scanning</a>, the
manual pages (<code>man omx-clap-host</code>, <code>man omx-clap-scan</code>) and <a href="https://www.openmixer.org">https://www.openmixer.org</a>.
Building from source: see <a href="https://github.com/FreeMixer/omx-clap-core/blob/d53f42b8689dc42669552b8518feef626ea9c828/BUILDING.md">BUILDING.md</a>.</p>
`},{slug:`thread-pool`,src:`docs/thread-pool.md`,title:`The CLAP thread pool`,source:`https://github.com/FreeMixer/omx-clap-core/blob/d53f42b8689dc42669552b8518feef626ea9c828/docs/thread-pool.md`,toc:[{id:`two-paths`,title:`Two paths`},{id:`the-gate-per-plugin-by-its-qualification`,title:`The gate: per plugin, by its qualification`},{id:`measured`,title:`Measured`}],html:`<h1 id="the-clap-thread-pool">The CLAP thread pool</h1>
<p><code>clap.thread-pool</code> lets a plugin split one <code>process()</code> into tasks: inside <code>process()</code> it calls the host's
<code>request_exec(num_tasks)</code>, and the host calls the plugin's <code>exec(plugin, task_index)</code> once for every index from 0 to
<code>num_tasks - 1</code> before <code>request_exec</code> returns. A plugin that splits its voices into tasks then uses as many cores as
the host gives it. This page states how libomx-clap-core runs those tasks, when it spreads them across cores, and what
was measured (#395).</p>
<p><strong>What it gains, and for which plugins.</strong> The pool spreads voices only for a plugin that splits them into tasks. Surge
XT 1.4.0 does not offer <code>clap.thread-pool</code> (no <code>CLAP_EXT_THREAD_POOL</code> in its extension list, no <code>request_exec</code> in its
source), and none of the 489 plugin descriptors on the Raspberry Pi 5 of the measurement mentions the extension. For
every other plugin the cores are used by placement: one worker per instrument or chain, pinned across the cores
(plugin-hostd#226, not yet built). That, not the pool, is what the Pi gains from first. The pool is the host behaviour
the extension specifies, and the gate by qualification stands for the plugins that use it.</p>
<h2 id="two-paths">Two paths</h2>
<p><strong>Serial.</strong> Every task runs on the calling audio thread, one after the other, before <code>request_exec</code> returns. The
extension allows it, it is real-time safe, and it is what an instance gets unless the pool is granted to it.</p>
<p><strong>Pooled.</strong> The process holds one pool of helper threads, shared by every instance granted it:</p>
<ul>
<li><strong>Size.</strong> N is the number of cores in the worker's CPU affinity mask when the pool is made (<code>sched_getaffinity</code>, so
a worker that plugin-hostd placed on cores gets exactly those); the pool has N - 1 helpers (at most
<code>OMX_CLAP_THREAD_POOL_HELPERS_MAX</code>), and the audio thread is the N-th worker. A mask of one core gives no pool.</li>
<li><strong>Placement.</strong> Each helper is pinned to one core of the mask, every core but the mask's first, which is left to the
audio thread. A helper is named <code>omx-pool-&lt;core&gt;</code> (ps, <code>/proc/&lt;pid&gt;/task/*/comm</code>).</li>
<li><strong>Priority.</strong> A helper runs at the audio thread's scheduling: <code>SCHED_FIFO</code> at the audio thread's real-time priority
(omx-clap-host reads it from JACK, <code>jack_client_real_time_priority</code>), or the normal class when the audio thread is not
real-time. When the priority cannot be set (no <code>CAP_SYS_NICE</code>, an <code>RLIMIT_RTPRIO</code> below it) no pool is made and the
instance runs serial, with one log line naming why: <code>thread pool: serial: SCHED_FIFO &lt;p&gt; refused (&lt;errno&gt;)</code>.</li>
<li><strong>Lifetime.</strong> The pool is made by the first activate of an instance granted it and ended by the last deactivate; its
threads are created and joined on the control thread only. Nothing is allocated after the activate.</li>
<li><strong>Parking.</strong> Between requests a helper spins for a few microseconds, then sleeps on a futex. A request wakes the
sleepers with one <code>FUTEX_WAKE</code>, only when some helper is asleep.</li>
<li><strong>Handing out.</strong> The request is published as one 64-bit word: a generation, the task count and the next index. The
helpers and the calling audio thread take indices from it with one compare-and-swap each, so a task is taken
exactly once and no lock is held anywhere. The audio thread takes tasks too: a helper that has not woken yet is never
waited for, the audio thread runs the tasks it would have taken.</li>
<li><strong>Completion.</strong> <code>request_exec</code> returns when every task has finished. The audio thread spins on the completion count
for the length of one block (<code>max_block / rate</code>), then sleeps on the completion futex, which the helper that finishes
the last task wakes. A wait that runs past the block is a <strong>late</strong> event: it is counted in the process's pool
(<code>omx_clap_host_thread_pool</code>) and omx-clap-host adds it to the <code>xruns &lt;count&gt;</code> line it writes on its feedback port,
so plugin-hostd attributes it as it does an xrun. A task a helper has already started is still waited for: returning
before it ends would hand <code>process()</code> back to the plugin while its own task still runs, which the extension forbids.
Tasks nobody has started are never waited for.</li>
<li><strong>Exclusion.</strong> One request holds the pool at a time. A second audio thread that asks while another request holds it
runs its tasks serial. A request made from inside a task, on a helper or on the audio thread, is refused, as before.</li>
<li><strong>The role.</strong> Inside a task, a helper answers <code>clap.thread-check</code>'s <code>is_audio_thread</code> true for the instance whose task
it runs: the helpers are audio threads of that instance for the length of the task.</li>
<li><strong>Limits.</strong> A request of one task, or of more than 65535, runs serial.</li>
</ul>
<h2 id="the-gate-per-plugin-by-its-qualification">The gate: per plugin, by its qualification</h2>
<p>The pool is never a global switch. A plugin gets helper threads only when its qualification measured it real-time safe
(<code>hosting.rt-safety.*</code> clean, with the interposer watching the helper threads too) and faster with the pool at that
quantum; plugin-hostd carries that verdict in the plugin's pin as <code>pool: cores|off</code>. An unmeasured plugin, or one with
violations, runs serial.</p>
<p>In the library the gate is one call per instance, made while it is inactive:
<code>omx_clap_host_thread_pool_use(in, use, rt_priority)</code>. An instance never told to use the pool runs serial.</p>
<p>omx-clap-host takes the verdict on its command line, <code>--thread-pool=qualified|off|on</code>:</p>
<ul>
<li><code>qualified</code> (the default): an instance gets the pool only when the host was told its qualification grants it. The
host has no per-instance verdict input yet, so <code>qualified</code> runs every instance serial until plugin-hostd hands the
verdict over.</li>
<li><code>on</code>: every instance that implements <code>clap.thread-pool</code> gets the pool. plugin-hostd passes it to the worker of a
plugin whose pin says <code>pool: cores</code>; a pinned plugin runs in a worker of its own, so the worker's switch is that
plugin's verdict.</li>
<li><code>off</code>: every instance runs serial.</li>
</ul>
<h2 id="measured">Measured</h2>
<p>Raspberry Pi 5 (4 cores, governor <code>powersave</code>, kernel 6.18 PREEMPT), idle (no stress run), 2026-10-29. Surge XT offers
no <code>clap.thread-pool</code>, and no plugin on the device does, so this is <strong>the fixture plugin</strong>, <code>tests/fake_pool.clap</code>: 16
tasks a block, each rendering 8, 24 or 48 sine voices over the block. The bench (<code>tests/thread_pool_bench.c</code>) is the
audio thread at SCHED_FIFO 70 (jackd's <code>-P 70</code>) on core 0, the pool's three helpers on cores 1 to 3 at the same
priority, each block started at its period for 10 s; the branch was built natively on the Pi with its gcc. Per-block
cost of <code>omx_clap_host_run</code> in microseconds, 48000 Hz:</p>
<table>
<thead>
<tr>
<th>voices/task</th>
<th>frames</th>
<th>budget</th>
<th>off mean</th>
<th>off p99</th>
<th>on mean</th>
<th>on p99</th>
<th>speed-up</th>
<th>helper busy</th>
</tr>
</thead>
<tbody>
<tr>
<td>8</td>
<td>128</td>
<td>2667</td>
<td>263.6</td>
<td>277.1</td>
<td>81.7</td>
<td>86.8</td>
<td>3.2x</td>
<td>2.5% each</td>
</tr>
<tr>
<td>8</td>
<td>256</td>
<td>5333</td>
<td>527.9</td>
<td>534.8</td>
<td>155.9</td>
<td>164.6</td>
<td>3.4x</td>
<td>2.5% each</td>
</tr>
<tr>
<td>8</td>
<td>512</td>
<td>10667</td>
<td>1035.3</td>
<td>1050.2</td>
<td>289.5</td>
<td>296.0</td>
<td>3.6x</td>
<td>2.4% each</td>
</tr>
<tr>
<td>24</td>
<td>128</td>
<td>2667</td>
<td>780.6</td>
<td>793.2</td>
<td>212.9</td>
<td>221.1</td>
<td>3.7x</td>
<td>7.4% each</td>
</tr>
<tr>
<td>24</td>
<td>256</td>
<td>5333</td>
<td>1583.4</td>
<td>1591.1</td>
<td>418.7</td>
<td>425.0</td>
<td>3.8x</td>
<td>7.4% each</td>
</tr>
<tr>
<td>24</td>
<td>512</td>
<td>10667</td>
<td>3242.2</td>
<td>3269.9</td>
<td>845.6</td>
<td>858.0</td>
<td>3.8x</td>
<td>7.6% each</td>
</tr>
<tr>
<td>48</td>
<td>128</td>
<td>2667</td>
<td>1660.9</td>
<td>1683.1</td>
<td>432.3</td>
<td>439.0</td>
<td>3.8x</td>
<td>15.6% each</td>
</tr>
<tr>
<td>48</td>
<td>256</td>
<td>5333</td>
<td>3335.5</td>
<td>3362.7</td>
<td>857.9</td>
<td>863.2</td>
<td>3.9x</td>
<td>15.6% each</td>
</tr>
<tr>
<td>48</td>
<td>512</td>
<td>10667</td>
<td>6603.3</td>
<td>6649.5</td>
<td>1686.6</td>
<td>1699.2</td>
<td>3.9x</td>
<td>15.4% each</td>
</tr>
</tbody>
</table>
<p>No block went over its budget and no wait was late in any run. &quot;Helper busy&quot; is each helper's time inside tasks over
the run's wall time. The 512-frame load of 48 voices, 6.6 ms of the 10.7 ms block serial, takes 1.7 ms on the pool.
The raw per-block costs, the summary and the device are in <code>docs/evidence/thread-pool-pi5-2026-10-29/</code>
(<code>measure.sh</code> reruns it).</p>
<p>Not measured: a real plugin that requests tasks (none on the device does), the pool under JACK's own thread rather
than the bench's, voices until the first xrun, and 96 kHz. The fixture's tasks are equal in size and touch no shared
state, which is the pool's best case.</p>
`}],r={repo:e,commit:t,pages:n};export{t as commit,r as default,n as pages,e as repo};