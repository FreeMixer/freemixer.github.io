var e=`plugin-qualify`,t=`949bed5011c9f3660cacb211725aea4647a0072d`,n=[{slug:``,src:`README.md`,title:`plugin-qualify`,source:`https://github.com/FreeMixer/plugin-qualify/blob/949bed5011c9f3660cacb211725aea4647a0072d/README.md`,toc:[{id:`install`,title:`Install`},{id:`run-it-on-your-own-plugin`,title:`Run it on your own plugin`},{id:`the-measurement-grid`,title:`The measurement grid`},{id:`clap-plugins-the-rt-safety-verdict`,title:`CLAP plugins: the RT-safety verdict`},{id:`judging-a-probe-output`,title:`Judging a probe output`},{id:`adjusting-a-verdict-by-what-the-plugin-did-on-this-machine`,title:`Adjusting a verdict by what the plugin did on this machine`},{id:`lv2-plugins-the-hosting-measurement`,title:`LV2 plugins: the hosting measurement`},{id:`scanned-descriptors`,title:`Scanned descriptors`},{id:`what-the-verdicts-mean`,title:`What the verdicts mean`},{id:`reproducing-a-failure`,title:`Reproducing a failure`},{id:`for-other-projects-zynthian-mod-packagers`,title:`For other projects (zynthian, MOD, packagers)`}],html:`<h1 id="plugin-qualify">plugin-qualify</h1>
<p>Can this audio plugin be hosted in a real-time audio engine, and at what cost? <code>plugin-qualify</code>
scans a plugin, measures it offline (latency and CPU cost per rate and quantum), runs it
under a real host (mod-host, with an AddressSanitizer build), and gives one verdict.
Licence: GPL-3.0-or-later (<code>LICENSE</code>).</p>
<h2 id="install">Install</h2>
<p>plugin-qualify is published, signed, in the OpenMixer package channel, for Fedora 44 (x86_64, aarch64)
and for Debian bookworm and trixie, including Raspberry Pi OS (amd64, arm64).</p>
<p>Fedora:</p>
<pre><code>sudo dnf install https://www.openmixer.org/rpm/openmixer-release.noarch.rpm
sudo dnf install plugin-qualify
</code></pre>
<p>Debian and Raspberry Pi OS:</p>
<pre><code>curl -fsSLO https://www.openmixer.org/deb/openmixer-release.deb &amp;&amp; sudo apt install ./openmixer-release.deb
sudo apt update
sudo apt install plugin-qualify
</code></pre>
<p>From the npm registry:</p>
<pre><code>pnpm add @openmixer/plugin-qualify
# or, to install the command globally:
npm install -g @openmixer/plugin-qualify
</code></pre>
<p>The npm package ships the TypeScript command only, not the native tools. The CLAP prober, the LV2 measurer and
the interposer come with the RPM or DEB, or from <code>make -C native</code> in a checkout; with the npm package alone,
point <code>OMX_CLAP_QUALIFY</code>, <code>OMX_LV2_MEASURE</code> and <code>OMX_RT_INTERPOSE</code> at them (the probe runner is plugin-hostd's, <code>OMX_PROBE_RUNNER</code>), or CLAP qualification and the LV2
hosting dimensions refuse with &quot;no CLAP prober at ...&quot;.</p>
<p>The GitHub release also carries the packed tarball, <code>openmixer-plugin-qualify-&lt;version&gt;.tgz</code>. To run from a
checkout instead (Node.js 20 or newer and pnpm 10, see <code>BUILDING.md</code>):</p>
<pre><code>git clone https://github.com/FreeMixer/plugin-qualify.git
cd plugin-qualify
pnpm install
pnpm exec plugin-qualify --help
</code></pre>
<p>It needs Node.js 18 or newer to run. The measuring tools also want Python 3 with the lilv bindings
(<code>python3-lilv</code>) and, for the hosting sweep, <code>mod-host</code>. The <code>Containerfile</code> builds an image with all of
them. The commands below are written as <code>plugin-qualify</code>; from a checkout run them with <code>pnpm exec</code>.</p>
<h2 id="run-it-on-your-own-plugin">Run it on your own plugin</h2>
<pre><code>plugin-qualify urn:example:my-plugin          # one plugin, by URI
plugin-qualify ./my-plugin.lv2                # every plugin in a bundle
plugin-qualify --all --out ./qualification   # every LV2 bundle on LV2_PATH and every CLAP on the search path, one record each
plugin-qualify --help                         # every option and its default
</code></pre>
<p><code>--format json</code> prints the verdicts as JSON; <code>--out &lt;dir&gt;</code> writes the full measurement document.
<code>--isolate</code> measures each plugin in a fresh worker so a crash or hang takes only that plugin. The <code>Containerfile</code> builds an image
with lilv, mod-host and the ASan mod-host, if you do not want to install them yourself.</p>
<p>A named LV2 plugin is measured the same way as a CLAP one: through the probe runner, then judged from the probe
output it writes (<code>plugin-qualify judge</code> below). Exit code: <code>0</code> every plugin qualified, <code>1</code> some did not, <code>2</code>
something could not be measured.</p>
<h2 id="the-measurement-grid">The measurement grid</h2>
<p>A plugin is measured in cells, each one sample rate and one quantum (block size in frames). The verdict a host
gets reads the cell of that host's rate and quantum, so the grid has to hold it.</p>
<pre><code>plugin-qualify --all --out ./q                          # the full grid (the default): 4 rates x 4 block sizes
plugin-qualify --all --grid-hosts --out ./q             # the hosts' grid, the fast option (also --grid hosts)
plugin-qualify --grid 48000/128,96000/1024 urn:my:fx    # exactly these cells
</code></pre>
<ul>
<li><code>--grid hosts</code> (the fast option; <code>--grid-hosts</code> says the same): the rate and quantum of every host the run judges
(each <code>--host-profile</code>, and the console's two tiers, <code>openmixer-console</code> and the format's isolated host), then
quantum 512 at every <code>--rates</code> rate, so that a record stays comparable with the ones written before the grid.
With the four shipped hosts that is seven cells: 96000/1024 (<code>openmixer-console</code>), 48000/256 (<code>jalv</code>),
48000/128 (<code>mod-host</code>, <code>omx-clap-host</code>), and 512 at 44100, 48000, 96000 and 192000.</li>
<li><code>--grid full</code> (the default; every plugin is measured under the same conditions, so any host's verdict can be read at any cell and the figures compare): every <code>--rates</code> rate at every <code>--quanta</code> quantum, 16 cells with the defaults
(44100, 48000, 96000, 192000 by 128, 256, 512, 1024).</li>
<li><code>--grid &lt;rate&gt;/&lt;quantum&gt;,...</code>: exactly the cells named.</li>
</ul>
<p>The cells are taken in that order: the hosts' own cells first, in the order the hosts are named, then the
512 cells, then the rest by rate and quantum. <code>--cells-per-plugin-budget N</code> keeps the first N, so a first pass
over a large machine can measure the hosts' cells alone (<code>--cells-per-plugin-budget 3</code> with the four shipped hosts).
<code>--blocks N</code> shortens the CLAP sweep of each cell from 512 blocks to N; the LV2 pass has a fixed shape (30
lifecycles and 3 swept runs per cell) and is not shortened by it.</p>
<p>An LV2 plugin is measured on the same grid as a CLAP one. plugin-hostd's runner measures an LV2 plugin at one
rate per run (the highest it is given), which is why records written before the grid hold LV2 figures at 192000
only; plugin-qualify now runs it once per cell. A CLAP plugin is run once per quantum, at every rate of the grid
at that quantum. The runs of one plugin and one offer make one probe output: the grid points of every run, the
steps of every run, and the run's outcome. The record and its byte copy hold that document.</p>
<p>A run that ended badly leaves a grid point at each of its cells with the run's outcome in place of figures, so a
cell is never silently absent. The cost a host is judged by is read at its cell: a measured cell is compared with
the host's budget; a cell whose run failed reads <code>unknown</code> with that run's outcome (<code>probe.oom</code>, say); only a
cell the grid does not hold reads <code>hosting.cost.unmeasured-at-rate-and-quantum</code>.</p>
<h3 id="the-memory-bound">The memory bound</h3>
<p>A sampler loading its library can take all the memory of a small machine, and the kernel then kills it, or
something else. Every run is bounded: <code>--memory-limit &lt;bytes&gt;</code> (<code>512M</code>, <code>2G</code>, or <code>off</code>), by default half of
the machine's RAM. The bound is the runner's data limit (<code>--data-bytes</code>, <code>RLIMIT_DATA</code> on the measuring child:
its heap and private writable mappings), and the interposer the child runs under turns an allocation refused
under that limit into an immediate exit with status 121. A run that ends that way, or by a <code>SIGKILL</code> the
runner did not send (the kernel's out-of-memory killer), is recorded as <code>probe.oom</code>: its cells carry the
outcome and <code>memoryLimit { bytes, mechanism }</code>, the plugin's record is still written, and the other cells are
judged as usual. A plugin whose every run ended <code>probe.oom</code> is <code>unknown</code> under every host, deciding <code>probe.oom</code>.
A host whose own cell ended <code>probe.oom</code> is <code>unknown</code> there as well (<code>memory</code>, <code>probe.oom</code>): the plugin did not
run within the bound at that host's rate and quantum.</p>
<p>Where the machine delegates the memory controller, the runner sets the bound as <code>memory.max</code> of a cgroup instead: a run the
kernel kills at it is <code>probe.memory-limit</code>, read the same way, and the document's <code>limits</code> says which it was. A process
plugin-qualify spawns itself, with no runner (<code>tools/lv2-measure.mjs</code>, <code>tools/benchmark.py</code>), runs under <code>RLIMIT_AS</code> at the
machine's RAM, off for a sanitizer build; hitting it is <code>memory-limit-exceeded</code>, with the limit.</p>
<h3 id="memory">Memory</h3>
<p>Each cell carries a footprint: how far the resident set of a process of its own grew, in KB, after instantiate, after
activate, at rest after processing, with notes held for an instrument, and what a second instance added. A record adds what
they come to: <code>firstInstanceKb</code>, the most one instance held with everything its instances share, and <code>perInstanceKb</code>, what
one more costs.</p>
<p>A host with a memory budget reads them, at every cell it runs, and the verdict follows:
<code>hosting.memory.within-ceiling</code>, <code>hosting.memory.above-ceiling</code> (<code>unsuitable</code>), or <code>hosting.memory.unmeasured</code> (<code>unknown</code>,
since a missing figure never reads as fitting). <code>openmixer-console</code> has one, sized for the desk, and the Raspberry Pi hosts
<code>openmixer-pi-4gb</code> and <code>openmixer-pi-8gb</code>, at 48000/128 and 48000/256, have one each. The Pi budgets are not measured on a Pi
yet, so a plugin under them is <code>conditional</code>, <code>hosting.memory.within-provisional-ceiling</code>: that gives the figure and the
ceiling and does not say the plugin fits. The other hosts have no budget, and read nothing.</p>
<p>A soak (LV2; the CLAP prober has no continuous render yet) also reads the growth: past 10 MB per minute of audio over its
second half, provisional, the rate fails as <code>leaks</code>.</p>
<h3 id="how-long-a-run-takes">How long a run takes</h3>
<p>The default grid is the full one, so the expected time of a run with no grid option is the <code>full</code> row: about 65 hours on a Raspberry Pi 5 for the vangelis set (1823 records). <code>--grid-hosts</code> is the fast option, about 30 hours there.</p>
<p>Times from one deep run on a Raspberry Pi 5 (4 cores, 4 GB), 1823 records (494 CLAP, two offers of each of 247,
and 1329 LV2), six hours in all with the grid of before (CLAP at four rates in one run at quantum 512, LV2 at
192000/512 alone):</p>
<table>
<thead>
<tr>
<th></th>
<th>runs</th>
<th>mean a run</th>
<th>total</th>
</tr>
</thead>
<tbody>
<tr>
<td>CLAP, one run per offer (4 cells)</td>
<td>494</td>
<td>2.8 s</td>
<td>0.38 h</td>
</tr>
<tr>
<td>LV2, one run (1 cell)</td>
<td>1329</td>
<td>10.5 s</td>
<td>3.86 h</td>
</tr>
<tr>
<td>host admissions (jalv, mod-host) and the scan</td>
<td></td>
<td></td>
<td>about 1.8 h</td>
</tr>
</tbody>
</table>
<p>A CLAP plugin takes one run per quantum of the grid, an LV2 plugin one run per cell; the admissions do not
grow with the grid. On that machine, then, about:</p>
<table>
<thead>
<tr>
<th>grid</th>
<th>CLAP runs a plugin</th>
<th>LV2 runs a plugin</th>
<th>expected</th>
</tr>
</thead>
<tbody>
<tr>
<td>hosts (7 cells)</td>
<td>4</td>
<td>7</td>
<td>1.5 h + 27 h + 1.8 h, about 30 h</td>
</tr>
<tr>
<td>full (16 cells)</td>
<td>4</td>
<td>16</td>
<td>1.5 h + 62 h + 1.8 h, about 65 h</td>
</tr>
<tr>
<td>hosts, <code>--cells-per-plugin-budget 3</code></td>
<td>3</td>
<td>3</td>
<td>1.1 h + 11.6 h + 1.8 h, about 15 h</td>
</tr>
</tbody>
</table>
<p>These are ceilings: the LV2 time a run was taken at 192000, the dearest rate. <code>--blocks 128</code> takes a quarter of
the CLAP sweep a cell. A first pass with <code>--cells-per-plugin-budget 3</code>, then <code>--grid full</code> over the plugins worth
it, keeps a small machine's night bounded.</p>
<h2 id="clap-plugins-the-rt-safety-verdict">CLAP plugins: the RT-safety verdict</h2>
<p>A <code>.clap</code> file, or a directory holding one, is scanned by <code>omx-clap-scan</code> (from omx-clap-core; set
<code>OMX_CLAP_SCAN</code> to its path when it is not on <code>PATH</code>) and each plugin in it is then qualified by the
CLAP prober the package installs (from a checkout, the one built from <code>native/</code>, see <code>BUILDING.md</code>):</p>
<pre><code>plugin-qualify ./my-fx.clap                   # every plugin in the file
plugin-qualify --out ./out ./my-fx.clap       # and its RT-safety documents
CLAP_PATH=~/my-clap plugin-qualify --all      # every CLAP on the search path
</code></pre>
<p>Each plugin is measured by plugin-hostd's probe runner, <code>plugin-hostd-probe</code> (from the <code>plugin-hostd</code> package, 0.4.0 or later, which
the RPM and DEB require;
<code>OMX_PROBE_RUNNER</code> names it when it is not on <code>PATH</code>). The runner starts the prober under limits (a wall clock
that kills the whole process tree, CPU time, memory, files), and plugin-qualify waits for the runner and reads
the document it writes, the probe output. Nothing in plugin-qualify times a prober out on its own any more.</p>
<p>The files a pin holds are plugin-hostd's: the sync writes each pin with the files <code>plugin-hostd --pin-files &lt;uri&gt;</code>
prints for the device's LV2 directories (plugin-hostd 0.15.0 or later; <code>PLUGIN_HOSTD</code> names the daemon when it is not
on <code>PATH</code>), the list an add checks, and hashes exactly those. When plugin-hostd cannot name them, or is older, the
plugin gets no pin, the log says why, and the daemon pins it on its first add (<code>pin_mode first-use</code>).</p>
<p><code>--all</code> walks the standard CLAP search path through the same scanner: each directory <code>CLAP_PATH</code>
names (colon-separated), then <code>~/.clap</code>, then <code>/usr/lib/clap</code>, which is the system directory on every
distribution and architecture. A plugin id found twice keeps its first place on that path. LV2 plugins
are measured by <code>tools/lv2-measure.mjs</code> (below); this entry point does not drive that pass yet, so
<code>--all</code> refuses with exit 2 when any <code>.lv2</code> bundle is on the LV2 path (<code>LV2_PATH</code>, else <code>~/.lv2</code> and the
system lv2 directories) rather than qualify only the CLAP side. A directory on the CLAP path that cannot
be read (permissions, a symlink loop) also refuses with exit 2, naming it.</p>
<p>The prober runs each plugin headless at every cell of the grid (see &quot;The measurement grid&quot;), under an interposer that counts the
allocations, locks and syscalls its <code>process()</code> makes while every parameter is swept, and prints
the file's SHA-256 beside what it measured. The verdict is the real-time-safety one: <strong>suitable</strong>
only on a clean count, <strong>conditional</strong> (isolated in the pin: it runs in a worker of its own, never refused) on any
allocation, lock, syscall or main-thread host call from <code>process()</code>, <strong>unsuitable</strong> on <code>CLAP_PROCESS_ERROR</code>, <strong>unknown</strong> when it could not be counted. An instrument is
quiet until it is played, so a plugin with a note input is also played, at every rate and under a
count of its own: a chord, the pitch bent and a controller moved, pressure, the chord let go, a
burst of 32 note ons in one block and their offs, all notes off, in the dialect its note input
reads (CLAP's, else MIDI's). An allocation, lock or syscall while it plays is <strong>conditional</strong>, isolated in the pin like the same
violation in the run (<code>hosting.rt-safety.violations-under-notes</code>); an instrument that could not be played under the
interposer is <strong>unknown</strong> (<code>hosting.rt-safety.notes-unmeasured</code>). <code>--out</code> writes the qualification records and the probe outputs they judged (see
&quot;Judging a probe output&quot; below), one pair per plugin binary and offered host extensions. Each plugin's pin is
an <code>integrity</code> block in the probe output: the <code>.clap</code>'s SHA-256 by its file name and the parameter-layout
fingerprint <code>omx-layout/1:&lt;sha256&gt;</code>, both computed through plugin-hostd's <code>pin.h</code>, which is what a console
hands plugin-hostd as <code>pin_set</code> before it adds the plugin. <code>OMX_CLAP_QUALIFY</code> and <code>OMX_RT_INTERPOSE</code>
name the prober and the interposer the runner starts when they are not the installed ones or the checkout's
own build.</p>
<h2 id="judging-a-probe-output">Judging a probe output</h2>
<p>The probe output is the document <code>plugin-hostd-probe run</code> writes: one binary and one offer, the steps the
prober reached and how each ended, and the figures per rate and quantum, with no verdict in it. plugin-qualify
reads it with <code>readProbeOutput</code>, which refuses a document of a major version it does not know
(<code>probe.format.major-unknown</code>), a document that carries a verdict, and a document whose derived fields disagree
with the fields they are computed from (<code>probe.format.derived-mismatch</code>): <code>machine.class.cstatesLimited</code> and
<code>machine.profile.meetsProtocol</code> are recomputed from <code>cpuidle[]</code>, the governor and <code>unmet[]</code>, never trusted.</p>
<pre><code>plugin-hostd-probe run --out out/plate.probe.json ./example-plate.clap org.example.plate
plugin-qualify judge --host-profile omx-clap-host --qualification-dir ./qualification out/plate.probe.json
</code></pre>
<p><code>judge</code> writes, into the qualification directory (<code>--qualification-dir</code>, else <code>$XDG_STATE_HOME/omx/qualification</code>,
else <code>~/.local/state/omx/qualification</code>), the qualification record <code>&lt;id&gt;@&lt;version&gt;-&lt;sha256 first 12&gt;.&lt;offer&gt;.qualification.json</code>
and, beside it, a byte copy of the probe output it judged, <code>&lt;same name&gt;.probe.json</code>, because the probe directory
may be wiped. The record names that copy and its SHA-256 in <code>probe</code>, with the run's protocol, reason and machine
class, so a reference figure and a local one are told apart. The record holds, for each host profile, the verdict
(<code>rating</code>, <code>hosting</code>, the deciding reason code and every reason) and the cost reasons at that profile's rate and
quantum, and the figures as measured. Exit <code>0</code> every plugin qualified, <code>1</code> some did not, <code>2</code> something could not
be read or judged.</p>
<p>The verdict is the same one <code>plugin-qualify</code> gives CLAP plugins, the real-time-safety one, now for LV2 as
well; cost is reported beside it, not folded into it. Cost is read at the profile's rate AND quantum: a pair the
document does not hold reads <code>hosting.cost.unmeasured-at-rate-and-quantum</code>, and two quanta of one plugin that cost
differently give two different cost reasons. Only a measurement of the old format, which keeps one figure per
rate, is read per rate. A run that did not end <code>probe.ok</code> is <code>unknown</code>, with the run's outcome code as the reason.</p>
<p>An instrument costs nothing until a voice plays, so its cost is taken with notes held down, at velocity 127,
spread across the keyboard, while every parameter is swept: as many notes as the voice capacity the plugin
declares (CLAP <code>voice-info</code>, basis <code>declared</code>), or, when it declares none, the count <code>--probe-notes</code> gives
(basis <code>probe</code>; LV2 declares none). Each rate's figure says how many notes it held and why (<code>voices: { held, basis, capacity }</code>). An instrument with no count to hold is not timed (<code>voices-unknown</code>).</p>
<p>An LV2 plugin's record holds the same two figures, under the same field names, in <code>measurements.grid[]</code>:
<code>latency { declaredFrames, measuredFrames }</code> and <code>cost</code>. <code>lv2_measure</code> takes them at the run's rate and block, the
way the CLAP prober does: the declared figure is what the plugin reports on its latency port
(<code>lv2:designation lv2:latency</code>, or the older <code>lv2:reportsLatency</code>; 0 when it has none), the measured one is where an
impulse at frame 0 lands (the first frame at or above 1e-3 of the response's own peak), or, for an instrument, where a
struck A4 sounds. A plugin that has no latency port is measured, never read as 0. An instrument's cost holds
<code>OMX_PROBE_NOTES</code> keys down (the LV2 counterpart of <code>--probe-notes</code>). A figure the run could not take (a response that
stays silent, an instrument with no count to hold) is left out of the grid point and named in
<code>measurements.unmeasured</code> with its hosting code (<code>hosting.latency.unmeasured</code>,
<code>hosting.cost.unmeasured-at-rate-and-quantum</code>).</p>
<p>Every cell of a record carries <code>latency</code>: the two figures when the run took them, else
<code>{ unmeasuredReason, code }</code>, the contract's word for why and the hosting code a reader classifies by. A latency
step that did not end well gives the child's reason (<code>silent-output</code>, say); a cell whose run failed, its outcome's
word (<code>probe-crashed</code>, or <code>probe-error</code> for <code>probe.oom</code>); a run that took no latency at all (a runner or a child
older than the latency arm), <code>not-attempted</code>. The declared figure alone, for a plugin whose response could not be
measured, is not in the probe output: plugin-hostd's runner writes a cell's latency only with both figures.</p>
<p>The prober also scans: <code>OMX_CLAP_SCAN=native/build/clap-qualify</code> makes it the scanner, and its scan
keeps what a console needs to draw a third-party plugin's controls: an enum parameter's labels (as
the plugin's <code>value_to_text</code> renders them), each parameter's module, and the plugin's
remote-control pages.</p>
<h2 id="adjusting-a-verdict-by-what-the-plugin-did-on-this-machine">Adjusting a verdict by what the plugin did on this machine</h2>
<pre><code>plugin-qualify adjust --history ~/.local/state/plugin-hostd/history --qualification-dir ./qualification --host-profile omx-clap-host
plugin-qualify adjust --history history --qualification-dir ./qualification --host-class aarch64/4/2400 --pins pins.txt
</code></pre>
<p>plugin-hostd keeps a running history of every plugin binary on every host class it ran on (windows run alone and in a
group, CPU, xrun windows, crashes, restarts, quarantines). <code>adjust</code> reads that file directly, so it runs without a daemon,
and writes a second verdict beside the measured one in each qualification record: a <code>history</code> block per host class of the
file, holding the line it looked for (the plugin's plugin-hostd uri and the digest of the first file of its pin), whether
the history has it, the windows it counts, and for each <code>--host-profile</code> the measured pin verdict, the adjusted one, the
move (<code>demote</code>, <code>promote</code> or <code>none</code>) and a reason code. The measured <code>verdicts</code> and the measurement are never changed: the
same plugin on another host class has another history and another adjusted verdict.</p>
<table>
<thead>
<tr>
<th>move</th>
<th>when</th>
<th>reason</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>in-process</code> to <code>isolated</code></td>
<td>a crash was counted within 30 days, on this host class</td>
<td><code>history.crashed</code></td>
</tr>
<tr>
<td><code>in-process</code> to <code>isolated</code></td>
<td>from 30 grouped windows, the share of xrun windows grouped exceeds the share alone by 5 points</td>
<td><code>history.xruns-grouped</code></td>
</tr>
<tr>
<td><code>isolated</code> to <code>refused</code></td>
<td>three or more solo crashes, the latest within 30 days</td>
<td><code>history.crashed-alone</code></td>
</tr>
<tr>
<td><code>isolated</code> to <code>in-process</code></td>
<td>every reason against the plugin is a <code>hosting.cost.*</code> one, 360 windows run alone (six hours), no crash or restart ever counted, no xruns raised when grouped, <code>cpu_p95_solo</code> under the host profile's ceiling</td>
<td><code>history.steady</code></td>
</tr>
<tr>
<td>none</td>
<td>no line for this binary on this class</td>
<td><code>history.no-record</code></td>
</tr>
<tr>
<td>none</td>
<td>a line, and no rule moves the verdict</td>
<td><code>history.no-change</code></td>
</tr>
<tr>
<td>none</td>
<td>the line would promote, but the verdict is a fact about the plugin: a real-time-safety, feature, stability, latency or topology reason, an <code>unknown</code>, or a <code>refused</code></td>
<td><code>history.not-liftable</code>, with <code>blockedBy</code></td>
</tr>
</tbody>
</table>
<p>History never lifts a real-time-safety, feature or unknown verdict, and never promotes a refused one; a demotion is one
step. The thresholds are one table, <code>HISTORY_POLICY</code> in <code>src/history-adjust.ts</code>. <code>--pins &lt;file&gt;</code> writes the pins with the
adjusted verdict of the first <code>--host-profile</code> instead of the measured one; it needs exactly one host class, so name one
with <code>--host-class</code> when the history holds several. <code>--now &lt;seconds&gt;</code> fixes the time the history is read at. A line of the
history outside its grammar is not read and is named on stderr; a history of a version this tool does not know is refused.</p>
<h2 id="lv2-plugins-the-hosting-measurement">LV2 plugins: the hosting measurement</h2>
<p><code>tools/lv2-measure.mjs</code> measures the hosting dimensions (<code>stability</code>, <code>rtSafety</code>, <code>features</code>) through
the LV2 measurer the package installs, <code>lv2_measure</code>: each plugin is loaded through lilv in its own
process, instantiated and destroyed 30 times, and run under the interposer while every control is
swept. <code>tools/lv2-measure.mjs</code> measures at the highest <code>--rates</code> rate; <code>plugin-qualify</code> runs the measurer
once per cell of its grid (see &quot;The measurement grid&quot;):</p>
<pre><code>node tools/lv2-measure.mjs --rates 48000 --dimensions stability,rtSafety,features \\
  --plugins urn:my:plugin --out measurements.json --run
</code></pre>
<p>Without <code>--plugins</code> it measures every plugin the scan finds. Each plugin's entry carries its pin, an
<code>integrity</code> block: the SHA-256 of the files the host loads and the parameter-layout fingerprint,
through plugin-hostd's <code>pin.h</code>, as for CLAP. <code>OMX_LV2_MEASURE</code> and <code>OMX_RT_INTERPOSE</code> name the
measurer and the interposer when they are not the installed ones or the checkout's own build.</p>
<p>The features the measurer offers a plugin are the console's own: omx-clap-core's LV2 feature
provider, the code its LV2 host builds every instance's features with. Each of the provider's
options is a flag of <code>tools/lv2-measure.mjs</code> and of <code>lv2_measure</code> itself, and each plugin's record
names the options it ran under, <code>featureOptions</code>:</p>
<table>
<thead>
<tr>
<th>flag</th>
<th>what it sets</th>
<th>default</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>--features LIST</code></td>
<td>the kinds offered: <code>map</code>, <code>unmap</code>, <code>options</code>, <code>bounded</code>, <code>worker</code>, <code>default-state</code>, <code>log</code>, <code>rtmempool</code> (empty: none)</td>
<td>all but <code>default-state</code></td>
</tr>
<tr>
<td><code>--strict</code> / <code>--no-strict</code></td>
<td>refuse a plugin requiring a feature not offered (the record's <code>refusedFeature</code> names it), or hand it to its own instantiate without it</td>
<td><code>--no-strict</code></td>
</tr>
<tr>
<td><code>--block-declares LIST</code></td>
<td>the buf-size declarations made when <code>bounded</code> is offered: <code>bounded</code>, <code>fixed</code>, <code>pow2</code> (empty: none)</td>
<td><code>bounded</code></td>
</tr>
<tr>
<td><code>--block-min N</code></td>
<td><code>bufsz:minBlockLength</code>; 0 is the run's block</td>
<td>1</td>
</tr>
<tr>
<td><code>--block-max N</code></td>
<td><code>bufsz:maxBlockLength</code>; 0 is the run's block</td>
<td>0</td>
</tr>
<tr>
<td><code>--block-nominal N</code></td>
<td><code>bufsz:nominalBlockLength</code>; 0 is the maximum</td>
<td>0</td>
</tr>
<tr>
<td><code>--log MODE</code></td>
<td><code>log:log</code> lines: <code>silent</code>, <code>route</code> (to stderr) or <code>capture</code> (into the record's <code>featureOptions.log.lines</code>)</td>
<td><code>silent</code></td>
</tr>
<tr>
<td><code>--log-capture-bytes N</code></td>
<td>the capture buffer, its NUL included</td>
<td>4096</td>
</tr>
</tbody>
</table>
<p>The defaults are the measurement as it has always been, so a verdict reached under them does not
move. <code>lv2_measure --help</code> lists the same flags.</p>
<h2 id="scanned-descriptors">Scanned descriptors</h2>
<p>Both scanners also write what each plugin states about itself as a scanned descriptor: one JSON file per
plugin in omx-contract's descriptor words (identity, controls, ports, what it needs from a host, whether it
reports latency), held to omx-contract's descriptor schema before it is written. A descriptor holds no
measurement and no verdict; those are the qualification record's.</p>
<p>The files go into the descriptor directory, the key <code>descriptor_dir</code>:</p>
<table>
<thead>
<tr>
<th></th>
<th>where</th>
</tr>
</thead>
<tbody>
<tr>
<td>named</td>
<td><code>--descriptor-dir &lt;dir&gt;</code></td>
</tr>
<tr>
<td>a user (the default)</td>
<td><code>$XDG_STATE_HOME/omx/descriptors</code>, else <code>~/.local/state/omx/descriptors</code></td>
</tr>
<tr>
<td>a system service</td>
<td><code>/var/lib/omx/descriptors</code> (<code>--system</code>)</td>
</tr>
</tbody>
</table>
<p>Each file is named <code>&lt;id&gt;@&lt;version&gt;-&lt;sha256 first 12&gt;.json</code>: the CLAP id or the LV2 URI, the version the
plugin states (<code>unversioned</code> when it states none) and the SHA-256 of its binary (the <code>.clap</code>, or the LV2
bundle's <code>lv2:binary</code>), with every character other than letters, digits, <code>.</code>, <code>_</code> and <code>-</code> written <code>_</code>. The hash
keys which file describes which binary: a changed binary is a new file, and the old one stays as history.</p>
<pre><code>tools/scan.py --out catalog.json                                     # LV2: the catalog, and the descriptors beside it
tools/scan.py --descriptor-dir ./descriptors urn:my:plugin           # one plugin, into a directory of your own
native/build/clap-qualify --json ./my-fx.clap | tools/descriptors.py clap --descriptor-dir ./descriptors
</code></pre>
<p><code>scan.py --no-descriptors</code> writes the catalog only. A descriptor the schema refuses is not written and is
reported as <code>contract.file.invalid</code>, omx-contract's code; a plugin whose binary cannot be read is
<code>qualify.descriptor.binary-unhashed</code>; a directory that cannot be written is <code>qualify.descriptor.dir-unwritable</code>;
no schema found is <code>qualify.descriptor.schema-missing</code>. Any of them makes the run exit <code>2</code>, and the other
plugins are still written. The schema is the omx-contract package plugin-qualify depends on, else
<code>/usr/share/omx-contract/omx-contract.schema.json</code>; <code>OMX_CONTRACT_SCHEMA</code> names another one, for a test. The
writer needs Python's <code>jsonschema</code> (<code>python3-jsonschema</code>).</p>
<h2 id="what-the-verdicts-mean">What the verdicts mean</h2>
<ul>
<li><strong>suitable</strong>: every dimension was measured and passed. Safe to run inside the engine's own
process. This is the only verdict that counts as qualified.</li>
<li><strong>conditional</strong>: it works, with a caution (for example a high cost at small quanta, or an
allocation, lock or syscall in <code>run()</code>). It is run isolated, and the deciding reason names the caution.</li>
<li><strong>unknown</strong>: something was not measured. An unmeasured plugin is never a pass.</li>
<li><strong>unsuitable</strong>: a measured failure: a crash, a memory error in the plugin's own binary, or a
required feature the host does not provide. An allocation, lock or syscall in <code>run()</code> is not
one: that plugin is <strong>conditional</strong>, and runs isolated.</li>
</ul>
<p>The worst dimension decides. The text output prints the plugin, its verdict and the reason that
decided it.</p>
<h2 id="reproducing-a-failure">Reproducing a failure</h2>
<ol>
<li>Run the plugin alone: <code>plugin-qualify --format json --out ./out &lt;uri&gt;</code>.</li>
<li>The document in <code>./out</code> names the dimension that failed and, for a crash, the sanitizer class
and the object of the faulting frame.</li>
<li>Run the ASan mod-host (<code>mod-host-asan</code> in the image) with just that plugin to get the full
sanitizer report.</li>
</ol>
<p><code>fixtures/zero-path.lv2</code> is a known-bad plugin (a zero-size <code>atom:Path</code> overread). It should
rate <strong>unsuitable</strong>; if it does not, the sweep is not catching memory errors.</p>
<h2 id="for-other-projects-zynthian-mod-packagers">For other projects (zynthian, MOD, packagers)</h2>
<p>The measurements describe the plugin and never the host: latency and cost per rate, whether it
survives a thousand lifecycles and a three-hour soak, whether <code>run()</code> allocates, locks or makes
syscalls, and which LV2 features it requires. They are taken once. The <strong>verdict</strong> is a separate
step: the same measurements judged against a <strong>host profile</strong>, the facts that differ between
hosts. Two projects share the measurements and differ only in the profile they choose.</p>
<h3 id="choosing-a-host-profile">Choosing a host profile</h3>
<pre><code>plugin-qualify --host-profile jalv ./my-synth.lv2                  # zynthian: one jalv process per plugin
plugin-qualify --host-profile mod-host ./my-fx.lv2                 # MOD: one shared mod-host process
plugin-qualify --host-profile omx-clap-host ./my-synth.clap        # omx-clap-host, alone or under plugin-hostd
plugin-qualify --host-profile jalv,mod-host,openmixer-console &lt;uri&gt;  # one verdict per profile
plugin-qualify --host-profile ./my-host.json &lt;uri&gt;                 # your own host
</code></pre>
<table>
<thead>
<tr>
<th>profile</th>
<th>isolation</th>
<th>verdict</th>
<th>instruments</th>
<th>LV2 features read from</th>
<th>cost budget (P95 of a core, rate / quantum)</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>openmixer-console</code> (default)</td>
<td>in-process (the console's RT thread)</td>
<td>judged from a declaration</td>
<td>no</td>
<td>the console's in-process table</td>
<td>0.05 at 96000 / 1024</td>
</tr>
<tr>
<td><code>jalv</code></td>
<td>per-process</td>
<td><strong>measured by a run</strong> (<code>jalv -n &lt;name&gt; &lt;uri&gt;</code>, headless)</td>
<td>yes</td>
<td>jalv 1.6.8 <code>src/jalv.c</code> (zynthian's fork passes the same list)</td>
<td>0.25 at 48000 / 256</td>
</tr>
<tr>
<td><code>mod-host</code></td>
<td>shared-process</td>
<td><strong>measured by a run</strong> (<code>add</code>, <code>activate</code>, <code>remove</code> on mod-host's socket)</td>
<td>yes</td>
<td>mod-host f14a230 <code>src/effects.c</code></td>
<td>0.05 at 48000 / 128</td>
</tr>
<tr>
<td><code>omx-clap-host</code></td>
<td>shared-process</td>
<td>judged from a declaration</td>
<td>yes</td>
<td>the console's in-process table (the same LV2 feature provider)</td>
<td>0.05 at 48000 / 128</td>
</tr>
</tbody>
</table>
<p><strong>Measured or declared.</strong> A <em>declared</em> verdict is what the profile's feature list and cost budget make of
the one probe output. A <em>measured</em> verdict (<code>jalv</code>, <code>mod-host</code>, LV2 plugins) also runs the plugin under that
host, one admission per plugin, and its record entry carries <code>arm: &quot;run&quot;</code> and <code>measured: true</code>. A refusal
(<code>resp -102</code>), a crash (the signal), a host that dies on <code>add</code>, or a port type the host does not know makes the
plugin <code>unsuitable</code> for that host, with the code as the deciding reason (<code>mod-host.resp-102</code>,
<code>mod-host.signal-SIGABRT</code>, <code>mod-host.died-on-add</code>, <code>jalv.unknown-port-type</code>, <code>jalv.signal-SIGABRT</code>). A host
that is not installed leaves the verdict unmeasured (<code>unknown</code>, deciding <code>&lt;host&gt;.not-installed</code>). After any
death on mod-host the next admission starts a fresh host. <code>plugin-qualify judge</code> reads a probe output
that holds no run, so its <code>jalv</code> and <code>mod-host</code> entries stay <code>arm: &quot;declaration&quot;</code>.</p>
<p><strong>The console's two tiers.</strong> Every record carries <code>tiers</code>: the <em>in-process</em> verdict (<code>openmixer-console</code>) and the
<em>isolated</em> verdict (<code>omx-clap-host</code>, an LV2 plugin through plugin-hostd's LV2 adapter), <code>offeredOn</code> (<code>in-process</code> when its
verdict qualified, <code>isolated</code> when its verdict qualified or is <code>conditional</code>) and, when neither, <code>dimmed</code> with the reason. A
<code>conditional</code> plugin, RT-unsafe for instance, is offered on the isolated tier with <code>runsAlone: true</code>: it runs in a worker of
its own, never grouped, and its pin says <code>isolated</code>. An LV2 plugin is run once under the adapter, and
that run decides its <code>omx-clap-host</code> verdict as a mod-host run decides mod-host's. An <code>lv2:InstrumentPlugin</code> is also played one
held note there, its output read at its JACK ports (<code>jack_peak</code>): at or under -120 dBFS it reads <code>unknown</code>
(<code>omx-clap-host.silent-under-note</code>), not qualified and not refused, since a sampler with nothing loaded is silent too. A level
that could not be read reads the same way (<code>omx-clap-host.level-unmeasured</code>). A plugin that kills the isolated
host and qualifies in-process is offered in-process only. The tiers are judged for every plugin whether or not
<code>--host-profile</code> names them; mod-host and jalv are run only when <code>--host-profile</code> asks for them.</p>
<p><code>omx-clap-host</code> offers a CLAP plugin the console's six host extensions and three more,
<code>clap.preset-load/2</code>, <code>clap.track-info/1</code> and <code>clap.remote-controls/2</code>. A CLAP plugin judged
under it is probed again with those three offered, so its verdict holds for the host it runs in.</p>
<p>The <code>jalv</code>, <code>mod-host</code> and <code>omx-clap-host</code> budgets are defaults, not a measurement of your board. State your own
by writing a profile file. Every field is required; a missing or mistyped field is refused and
never filled in with a default:</p>
<pre><code class="language-json">{
  &quot;id&quot;: &quot;zynthian-v5&quot;,
  &quot;lv2Features&quot;: [&quot;http://lv2plug.in/ns/ext/urid#map&quot;, &quot;http://lv2plug.in/ns/ext/urid#unmap&quot;,
                  &quot;http://lv2plug.in/ns/ext/worker#schedule&quot;, &quot;http://lv2plug.in/ns/ext/log#log&quot;,
                  &quot;http://lv2plug.in/ns/ext/options#options&quot;,
                  &quot;http://lv2plug.in/ns/ext/state#loadDefaultState&quot;,
                  &quot;http://lv2plug.in/ns/ext/buf-size#powerOf2BlockLength&quot;,
                  &quot;http://lv2plug.in/ns/ext/buf-size#fixedBlockLength&quot;,
                  &quot;http://lv2plug.in/ns/ext/buf-size#boundedBlockLength&quot;],
  &quot;clapExtensions&quot;: null,
  &quot;instruments&quot;: true,
  &quot;cost&quot;: { &quot;coreFractionCeiling&quot;: 0.3, &quot;rate&quot;: 48000, &quot;quantum&quot;: 256 },
  &quot;latency&quot;: &quot;uncompensated&quot;,
  &quot;isolation&quot;: &quot;per-process&quot;
}
</code></pre>
<p>What each field changes. <code>lv2Features</code> is what the host passes to <code>instantiate</code>: a plugin that
requires anything else is <strong>unsuitable</strong> on that host. <code>clapExtensions</code> is <code>null</code> for a host with
no CLAP path. <code>instruments: true</code> means a MIDI input is fed, and a plugin with no audio input but
a MIDI input and an audio output rates as an instrument. <code>cost</code> is the per-instance ceiling, and
the rate and quantum the verdict is judged at. <code>latency: &quot;compensated&quot;</code> means the host aligns on
the plugin's latency, so a latency that moves with a control is a caution. <code>isolation</code> decides
whether spawned threads and a linked GUI toolkit count as cautions: they do only when the plugin
shares its process. An unmeasured dimension is <strong>unknown</strong> on every host.</p>
<p>With several profiles, the exit code is <code>0</code> only if every plugin qualifies under every profile.</p>
<h3 id="the-json-document">The JSON document</h3>
<p><code>--out &lt;dir&gt;</code> writes one interchange document per run (<code>lv2-plugin-measurements</code>, format 1.6,
the same format the OpenMixer console reads). The
<code>plugins</code> array holds the raw, host-free measurements. Beside it, <code>hostProfiles</code> holds each
profile the run judged against, in full, and <code>verdicts</code> holds one entry per plugin per profile:</p>
<pre><code class="language-json">{ &quot;uri&quot;: &quot;urn:example:verb&quot;, &quot;host&quot;: &quot;jalv&quot;, &quot;rating&quot;: &quot;unknown&quot;, &quot;qualified&quot;: false,
  &quot;deciding&quot;: &quot;hosting.stability.unsoaked&quot; }
</code></pre>
<p><code>host</code> is the <code>id</code> of an entry in <code>hostProfiles</code>. <code>deciding</code> is a stable code, absent when the
plugin is <code>suitable</code>. If you have your own host rules, re-derive them from <code>plugins</code> and do not
trust another host's verdict.</p>
<h3 id="as-a-library">As a library</h3>
<p><code>classifyPluginHosting(plugin, { rate, quantum, profile })</code> gives one verdict, and
<code>qualifyPlugins(measured, { profiles })</code> gives one per plugin per profile. <code>readHostProfile(json)</code>
validates a profile file, and <code>judgedDocument(run, plugins, profiles, verdicts)</code> builds the
document. All of them are exported from the package root. The package depends on no other
OpenMixer package.</p>
<h3 id="pinning-what-was-qualified">Pinning what was qualified</h3>
<pre><code>plugin-qualify --pins pins.txt ./my-synth.clap     # a pin and a verdict per plugin, in a file plugin-hostd loads
</code></pre>
<p><code>--pins &lt;file&gt;</code> writes one line per qualified plugin, the same line as plugin-hostd's <code>pin_set</code> verb with the verdict as
a last word: the SHA-256 of every file the host loads, the parameter-layout fingerprint, and <code>verdict=in-process</code>
(suitable), <code>isolated</code> (conditional) or <code>refused</code> (unsuitable). A plugin with no verdict is pinned without one. Put the
file in plugin-hostd's settings as <code>pin_file</code> and an <code>add</code> of that plugin needs no <code>pin_set</code>; a changed file is refused
with -509. The verdict is the first <code>--host-profile</code>'s. A run that took no pin leaves an existing file alone.</p>
<h3 id="qualifying-every-plugin-on-a-machine">Qualifying every plugin on a machine</h3>
<p><code>plugin-qualify-sync</code> qualifies every plugin installed on the machine, and again each one whose files
change. With its pin file in plugin-hostd's settings, the daemon runs in its default mode (<code>require_pins 1</code>)
and chains any plugin that qualified, the image's own and any installed later:</p>
<pre><code>pin_file /var/lib/omx/qualified.pins          # in plugin-hostd.conf
</code></pre>
<p>The package ships it as a service that runs two minutes after boot and whenever a plugin directory
changes, once the directory has been quiet for a minute. A run finds every <code>.clap</code> under the CLAP
directories and every plugin of every bundle under the LV2 ones, and hashes each one's files as
plugin-hostd does for a pin. A plugin whose files hash as recorded is skipped. A new or changed one gets the
quick qualification through the probe runner, on the grid <code>grid</code> names (see &quot;The measurement grid&quot;): its pin, the RT-safety sweep, cost and latency, its
qualification record and its descriptor. The soak is not part of it, and every record it writes says so in
<code>notMeasured</code> (<code>hosting.stability.unsoaked</code>).</p>
<p>Each run of the runner (one cell of an LV2 plugin, one quantum of a CLAP one) has <code>budget_s</code> seconds, under <code>memory_limit</code>. One that crashes or hangs is recorded as <code>crashed</code> or <code>hung</code>, one that
fails the sweep is pinned <code>verdict=refused</code>, and the run goes on to the next. The pin file and the state are
written whole after every plugin, so a run cut short keeps what it finished. The last line counts the run:</p>
<pre><code>qualified 2, skipped 0, refused 0, crashed 1, hung 1, unmeasured 0, distributed 0, 4.6 s
</code></pre>
<p>A plugin that is no longer found, or whose bytes changed, leaves nothing behind: its pin, its qualification
record (with the probe output copied beside it) and its descriptor are removed. Records the sync did not write
stay, and nothing is removed in a run that could not read a bundle, so a half-written install is no uninstall.
A run looks only where its settings point: a plugin outside every directory of its format that the run scans is
kept as it is (a run scoped to LV2 keeps every CLAP pin), and only one missing from a directory it scans is gone.
A running plugin-hostd is told with <code>pin_clear</code>.</p>
<p>When plugin-hostd answers on <code>hostd_port</code>, the changed pins are also sent to it with <code>pin_set</code> and apply at
once. plugin-hostd serves one controller at a time, so while one is connected the run says so and the pins
apply at the daemon's next start.</p>
<p>The settings are <code>/etc/omx/qualify.conf</code>, one <code>key value</code> per line, and each is also a flag
(<code>--budget-s 30</code>):</p>
<table>
<thead>
<tr>
<th>key</th>
<th>default</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>lv2_path</code></td>
<td><code>$LV2_PATH</code>, else plugin-hostd's: <code>/usr/lib64/lv2:/usr/lib/lv2:/usr/local/lib/lv2</code></td>
</tr>
<tr>
<td><code>lv2_extra</code></td>
<td><code>/zynthian/zynthian-plugins/lv2:/zynthian/zynthian-my-data/plugins/lv2</code></td>
</tr>
<tr>
<td><code>clap_path</code>, <code>clap_extra</code></td>
<td><code>$CLAP_PATH</code>, then <code>~/.clap</code>, then <code>/usr/lib/clap</code>; none</td>
</tr>
<tr>
<td><code>pin_file</code></td>
<td><code>/var/lib/omx/qualified.pins</code></td>
</tr>
<tr>
<td><code>qualification_dir</code>, <code>descriptor_dir</code></td>
<td><code>/var/lib/omx/qualification</code>, <code>/var/lib/omx/descriptors</code></td>
</tr>
<tr>
<td><code>state_file</code></td>
<td><code>/var/lib/omx/qualify-sync.json</code></td>
</tr>
<tr>
<td><code>budget_s</code></td>
<td><code>60</code></td>
</tr>
<tr>
<td><code>host_profile</code></td>
<td><code>omx-clap-host</code></td>
</tr>
<tr>
<td><code>grid</code></td>
<td><code>full</code>: every rate at every block size, 16 cells (<code>hosts</code>, or <code>--grid-hosts</code>: the cells of <code>host_profile</code> and of the console's two tiers, then 512 at every rate; or <code>&lt;rate&gt;/&lt;quantum&gt;,...</code>)</td>
</tr>
<tr>
<td><code>cells_per_plugin_budget</code></td>
<td><code>0</code>, every cell of the grid</td>
</tr>
<tr>
<td><code>memory_limit</code></td>
<td>half of the machine's RAM (<code>off</code> for none)</td>
</tr>
<tr>
<td><code>memory_notes</code></td>
<td><code>16</code>: the notes an instrument with no declared capacity holds in a <code>--memory-only</code> run</td>
</tr>
<tr>
<td><code>hostd_port</code>, <code>hostd_feedback_port</code></td>
<td><code>5555</code>, the next port</td>
</tr>
<tr>
<td><code>host_class</code></td>
<td>the board's own, from the device tree (<code>rpi5</code>); none elsewhere</td>
</tr>
<tr>
<td><code>distributed_dir</code></td>
<td><code>/usr/share/omx/qualification</code></td>
</tr>
</tbody>
</table>
<p>Those are the service's (<code>--system</code>); run by a user, the files go under <code>$XDG_STATE_HOME/omx</code>. An LV2
directory added here belongs in plugin-hostd's <code>lv2_path</code> too, or the daemon cannot find the bundle it
pinned. <code>--force</code> qualifies everything again, and <code>--no-distributed</code> reads no distributed record. A second <code>plugin-qualify-sync</code> waits for the run in progress (a lock on <code>&lt;state_file&gt;.lock</code>); <code>--no-wait</code> exits 0 at once and leaves a marker, and the holder runs once more at its end over what changed meanwhile.</p>
<p>Every run starts by bringing each pin's files up to the ones <code>plugin-hostd --pin-files</code> names, measuring nothing: a pin
written before 0.17.3 lacks the preset files an LV2's manifest names, which plugin-hostd 0.15.0 also checks, and its add
answers -509 until then. The new list replaces the old one when no file both lists hold changed its hash, so the verdict
stands; a changed file is measured again by the run. <code>--refresh-pins</code> does only that, writes the pin file and sends the
changed pins to a running plugin-hostd; the package's upgrade runs it (plugin-qualify#239).</p>
<p>The path unit names the standard folders (<code>/usr/lib/lv2</code>, <code>/usr/lib64/lv2</code>, <code>/usr/local/lib/lv2</code>,
<code>/usr/lib/clap</code>, <code>/usr/lib64/clap</code>). The folders the settings file adds (<code>lv2_path</code>, <code>lv2_extra</code>, <code>clap_path</code>,
<code>clap_extra</code>) are written into a drop-in of the unit by a systemd generator at boot and at every
<code>systemctl daemon-reload</code>, so the file is the one place a machine's extra folders are written.</p>
<p>The path unit watches a folder, not the bundles inside it: a new bundle appearing in a watched folder is
seen at once, but a package's own files being replaced in place (an upgrade) is not a change of the folder
itself. A packaged plugin is still caught at once, by the distribution's install triggers over the standard
folders. An unpackaged bundle replaced in place in an extra folder is caught at the next run of
plugin-qualify-sync.timer, at most about 15 minutes after the change.</p>
<h3 id="keeping-the-records-through-an-upgrade">Keeping the records through an upgrade</h3>
<p>An upgrade of plugin-qualify, of the plugins' libraries or of the judge's rules does not call for measuring every plugin
again. The figures in the records are carried across and judged again:</p>
<pre><code class="language-bash">plugin-qualify-sync --system --rejudge
</code></pre>
<p><code>--rejudge</code> measures nothing and needs no measuring tool. It reads every record in <code>qualification_dir</code> with the probe
output it names, and passes them through the same judge a measurement goes through, under the rules of the running
version: a real-time violation under <code>run()</code> or under notes is <code>conditional</code> and pinned <code>isolated</code>, each host's budget is
read, and a plugin with no footprint is <code>unknown</code> on a host with a memory budget, never read as fitting. It also judges
each record for <code>omx-clap-host</code>, <code>openmixer-console</code> and the Pi boards <code>openmixer-pi-4gb</code> and <code>openmixer-pi-8gb</code>. The
verdicts, the tiers and the plugin's pin word are replaced; the figures, the probe output and who took them stay as they
were. The record gains a <code>rejudged</code> block with <code>at</code>, <code>by</code> (the version that judged) and <code>figures</code> (<code>tool</code>, <code>measuredAt</code>
and <code>runId</code>, as measured). A run that finds nothing to change writes nothing.</p>
<p>A verdict never says more than the figures do. An LV2 plugin's <code>omx-clap-host</code> verdict is decided by its run under the LV2
adapter (the record's <code>adapter</code> block). A record with no measured adapter run reads <code>unknown</code>
(<code>qualify.sync.adapter-run-owed</code>), is not offered on the isolated tier, and its pin has no verdict word: plugin-hostd loads
such a plugin without grouping it. The same goes for a <code>mod-host</code> or <code>jalv</code> verdict with no run under that host. A record
whose plugin's bytes changed, or whose probe output is not the copy it names, is left as it is. Everything left owing
is listed under <code>owes</code> in the record and in <code>qualify-owed.json</code> beside the state file (<code>--rejudge</code> prints each line too),
with the measurement it needs:</p>
<table>
<thead>
<tr>
<th><code>measurement</code></th>
<th>code</th>
<th>what pays it</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>adapter-run</code></td>
<td><code>qualify.sync.adapter-run-owed</code></td>
<td><code>--adapter-only</code>, then <code>--rejudge</code></td>
</tr>
<tr>
<td><code>host-run</code></td>
<td><code>qualify.sync.host-run-owed</code></td>
<td>a run under that host; today, qualifying the plugin again with <code>--host-profile</code></td>
</tr>
<tr>
<td><code>qualification</code></td>
<td><code>qualify.sync.bytes-changed</code>, <code>qualify.sync.figures-unreadable</code>, <code>qualify.sync.no-figures</code></td>
<td>qualifying the plugin again; the next run does so for changed bytes</td>
</tr>
</tbody>
</table>
<p>A probe that crashed took no figures: its record stays <code>unknown</code> with <code>probe.crashed</code>, no pin word and the state's
outcome <code>crashed</code>. A crash under a host's run stays <code>unsuitable</code> and <code>refused</code>.</p>
<p>Footprints older records lack are taken apart from everything else:</p>
<pre><code class="language-bash">plugin-qualify-sync --system --memory-only   # the footprints, at the cells a Pi runs
plugin-qualify-sync --system --rejudge       # the verdicts that read them
</code></pre>
<p><code>--memory-only</code> takes the footprint of each plugin the state holds (after instantiate, after activate, at rest, a second
instance, and notes held for an instrument) at 48 kHz in blocks of 128 and 256 frames, and nothing else: no sweep, no
cost, no latency, no lifecycle, no soak. It goes through the probe runner under the limits of an ordinary run (<code>budget_s</code>,
<code>memory_limit</code>), each plugin in processes of its own, an LV2 plugin in a world of its own bundle. An instrument that
declares its voice capacity holds that many notes; one that does not holds <code>memory_notes</code>, with basis <code>probe</code>. Only the
<code>memory</code> of those cells changes in the record, a cell it lacked joins with no other figure, and a <code>memoryRun</code> block says
which runner took them and when. A cell whose run failed holds a reason and no figure. A plugin whose footprints are
already merged is skipped, so a pass cut short can be run again; <code>--force</code> takes them again. The pass judges nothing:
<code>--rejudge</code> afterwards does.</p>
<p>The adapter runs a record owes are taken apart as well:</p>
<pre><code class="language-bash">plugin-qualify-sync --system --adapter-only  # the runs, at the cells a Pi runs
plugin-qualify-sync --system --rejudge       # the verdicts they decide
</code></pre>
<p><code>--isolated-only</code> runs the isolated step a record still owes: a plugin rated conditional, or one that crashed or hung in
the probe, added alone under a plugin-hostd of its own on a private JACK server, with a sine through it for 3 seconds. The
record's <code>run</code> keeps its id and gains the step, and the pin follows it; nothing else is measured. A step the machine could
not run stays owed.</p>
<p><code>--adapter-only</code> starts each LV2 plugin the state holds under a fresh omx-clap-host, <code>add</code> then <code>remove</code> through the LV2
adapter, once per cell: 48 kHz in blocks of 128 and 256 frames. Each cell has a private JACK server (<code>jackd -d dummy</code>, so
<code>jackd</code> must be installed), so the device's live server is never touched. A command has <code>budget_s</code> seconds, the host's
address space is limited as a direct spawn's is, and it is killed with whatever it started. Only the record's <code>adapter</code>
block changes: <code>versions</code> (omx-clap-host and plugin-hostd, read from <code>--version</code>), <code>measuredAt</code>, <code>cells</code>, and at its top
what the judge reads. A crash or a command that gets no answer in time is the plugin's recorded outcome, at the cell it
happened, and reads <code>unsuitable</code> at the next <code>--rejudge</code>. A host that could not be run decides nothing: the block says
<code>measured: false</code>, and the run stays owed and is tried again. The pass refuses to start, writing nothing, when a host does
not say its version or there is no <code>jackd</code>. A plugin whose block was taken at these host versions is skipped, so a pass
cut short can be run again; a host upgrade or <code>--force</code> takes them again. A plugin whose probe failed is skipped: it has
no verdict a run could decide.</p>
<p><strong>A leak is not measured.</strong> Growth over time takes a soak, which this pass does not run: every record it writes names
<code>memoryGrowth</code> under <code>notMeasured</code>, and the last line says <code>leaks not measured</code>.</p>
<p>On a Raspberry Pi 5 a plugin takes under 0.6 s at the median, 5 s at the 90th percentile and 22 s at the 99th; about an
hour at most for the 1,542 plugins of the Zynthian set. Those are upper bounds: twice the time the 2026-10-28 records say a
whole pass at one cell took, which also ran 30 lifecycles, the sweep, the latency and the cost. A plugin that hangs
takes <code>budget_s</code> a cell. The test fixtures take 0.1 s each, both cells, on an x86-64 desktop.</p>
<h3 id="distributed-records">Distributed records</h3>
<p>A device that ships with a known plugin set need not measure it again at first start. The qualification records
another device of the same machine class wrote for that set are installed read-only, and the sync takes from them
every plugin whose files are the bytes that were measured:</p>
<pre><code>/usr/share/omx/qualification/&lt;host class&gt;/&lt;set&gt;/          # system (--system)
$XDG_DATA_HOME/omx/qualification/&lt;host class&gt;/&lt;set&gt;/      # a user run, then each $XDG_DATA_DIRS/omx/qualification
</code></pre>
<p>Each <code>&lt;set&gt;</code> directory holds the records (<code>*.qualification.json</code>, each with its probe output <code>*.probe.json</code>) and a
<code>provenance.json</code> that says where they come from: the set, the host class, the image, the package versions of the
measuring device, the date and the package that installed them. The host class is a directory name: <code>host_class</code>
in the settings, or, when it is unset, the board's own name read from the device tree (<code>rpi5</code> on a Raspberry Pi 5,
<code>rpi4</code> on a Raspberry Pi 4). Where neither gives one, the layer is not read and the run says so.</p>
<p>Before a plugin is measured, the sync looks for a distributed record of it: a CLAP record whose binary is the same
<code>.clap</code> path, or an LV2 record of the same plugin uri. The name only finds the record; a record applies when, and
only when:</p>
<ul>
<li>every file of its <code>binary.files</code> is installed at that path relative to the plugin's root, with that SHA-256,
computed on the device;</li>
<li>its schema is the one this version writes and its probe output is one this version's reader accepts, the copy
intact (its SHA-256 the one the record names): the same acceptance the sync gives a record of its own, which it
never measures again for a newer tool;</li>
<li>it holds a verdict for the sync's <code>host_profile</code>, and that verdict ended <code>qualified</code>, <code>refused</code>, <code>crashed</code> or
<code>hung</code>. One that could not be measured at the source (<code>unmeasured</code>) is measured here.</li>
</ul>
<p>A plugin whose distributed records apply is not measured: the records are copied into <code>qualification_dir</code> with the
set's <code>provenance</code> object added, its pin is taken from the probe output the record judged, its descriptor is
written, and the run says</p>
<pre><code>distributed: http://distrho.sf.net/plugins/3BandEQ: applied (zynthian-vangelis)
</code></pre>
<p>A plugin with a distributed record whose files differ is measured as before, and the run says
<code>distributed: &lt;uri&gt;: binary differs</code>; one with no distributed record is measured without a word. The summary counts
the plugins taken from the layer, <code>distributed N</code>, apart from the ones measured and skipped. A later run treats an
applied plugin like one it measured: skipped while its files are unchanged, measured when they change. <code>--force</code>
measures everything and reads no distributed record; <code>--no-distributed</code> keeps the layer out of a run.</p>
<p>The package that installs a set is built from a device's <code>qualification_dir</code> by <code>plugin-qualify-records-package</code>:</p>
<pre><code>plugin-qualify-records-package /var/lib/omx/qualification --host-class rpi5 --set zynthian-vangelis \\
  --provenance provenance.json --out .
</code></pre>
<p>It writes <code>omx-qualification-&lt;host class&gt;-&lt;set&gt;_&lt;version&gt;_all.deb</code>, the version the build date
(<code>2026.10.29</code>) unless <code>--version</code> names one. The package installs the records under
<code>/usr/share/omx/qualification/&lt;host class&gt;/&lt;set&gt;/</code> with <code>provenance.json</code>, depends on the plugin-qualify that reads
the layer, and is <code>Architecture: all</code>. <code>--provenance</code> names a JSON file (or holds the JSON itself) with what the tool
cannot know: the image, the package versions and the source revisions of the device. The tool adds the set, the host
class, the package and the date. A record whose probe output is missing or does not match its SHA-256 is left out
and named; a record of a plugin that could not be measured (<code>*.unmeasured.json</code>) is left out, since it never
applies. The tool builds the Debian package only; an RPM of a set is not built yet.</p>
<h3 id="the-container-image">The container image</h3>
<pre><code>podman build -t plugin-qualify -f Containerfile .
podman run --rm -v &quot;$PWD/my-plugins:/plugins:ro&quot; -e LV2_PATH=/plugins -v &quot;$PWD/out:/out&quot; \\
  plugin-qualify --host-profile jalv --all --out /out
</code></pre>
<p>The image has lilv, the distribution's mod-host and an AddressSanitizer build of mod-host.</p>
<p><strong>Status:</strong> the pure steps are in place and tested: target resolution, profile resolution, the
verdict, the document and the exit code. The command-line entry point does not yet drive the
measuring tools (<code>tools/lv2-measure.mjs</code>, the mod-host sweep). A run that would measure exits
<code>2</code> and names the missing step, rather than rate a plugin on less than was asked.</p>
`}],r={repo:e,commit:t,pages:n};export{t as commit,r as default,n as pages,e as repo};