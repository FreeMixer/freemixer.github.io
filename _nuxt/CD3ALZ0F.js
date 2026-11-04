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
`}],r={repo:e,commit:t,pages:n};export{t as commit,r as default,n as pages,e as repo};