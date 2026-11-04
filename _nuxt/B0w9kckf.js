var e=`libdiginet`,t=`084e09f8eaea72a275f583b8ae148b565aa6a548`,n=[{slug:``,src:`README.md`,title:`libdiginet`,source:`https://github.com/FreeMixer/libdiginet/blob/084e09f8eaea72a275f583b8ae148b565aa6a548/README.md`,toc:[{id:`network`,title:`Network`},{id:`status`,title:`Status`},{id:`safety`,title:`Safety`},{id:`licence`,title:`Licence`}],html:`<h1 id="libdiginet">libdiginet</h1>
<p>A C library for the Ethernet protocol of the Digidesign <strong>Control|24</strong> and <strong>ProControl</strong> control surfaces, so that any Linux mixer or DAW can drive one again: motor faders, V-Pots and their LED rings, buttons and lamps, scribble strips, meters, the counter and the jog wheel.</p>
<p>The surfaces talk raw Ethernet (EtherType <code>0x885F</code>), not MIDI or IP. libdiginet holds the protocol: frame and session grammar, encoders and decoders for every control, and one personality per desk. A small transport layer holds the wire: the packet socket, discovery, the online handshake, acknowledgements, keepalive, retransmit and pacing. A host links the library, or runs a thin daemon that holds the one capability raw sockets need (<code>cap_net_raw</code>) and hands the desk's commands to an unprivileged application.</p>
<p>What is known about the protocol, and what is still open, is in <a href="/projects/libdiginet/protocol">docs/protocol.md</a>, every claim cited to its source.</p>
<h2 id="network">Network</h2>
<p>The desk broadcasts its announce (about every 7 s while idle, measured on a ProControl); after that every frame is unicast between the desk's MAC and the host's MAC. A switch forwards these frames like any other, and machines that speak only IP ignore them, so the desk can share a segment with ordinary IP clients. What the link needs:</p>
<ul>
<li>The desk and the host on the same layer-2 segment. There is no IP header, so no router can sit between them.</li>
<li>The desk on the untagged (native) VLAN of the host's port: it sends no VLAN tag.</li>
<li>A wired path from the desk to the host. Some Wi-Fi bridges drop an EtherType they do not know; IP clients on Wi-Fi are not affected.</li>
<li>Not on an interface that carries other real-time traffic, such as a REAC stagebox link.</li>
<li>The ProControl's port runs at 10 Mbit/s half duplex. If a modern NIC will not settle on that, put a small unmanaged 10/100 switch between them.</li>
</ul>
<p>DigiNet has no authentication: the desk takes a session with whichever host answers its announce. On a LAN shared with other people, give the desk and its host a segment of their own.</p>
<h2 id="status">Status</h2>
<p>Early, and not yet tried on a desk. In the tree:</p>
<ol>
<li><code>protocol/diginet.ksy</code>, the formal byte grammar, with golden-frame tests.</li>
<li>The codecs and the Control|24 / ProControl personalities.</li>
<li>The transport: session state machine, ack window, keepalive, retransmit, latest-wins coalescing, all tested against a desk emulator.</li>
<li>One packet socket for every interface, and a desk mux that runs a session per desk over it, with appeared and gone notices, so a host hears every desk on every NIC, one plugged in later included. The socket can come from <code>diginet-packet-helper</code>, so the host itself needs no capability.</li>
<li><code>diginet-probe</code>, a command-line tool for a first test on a real desk: wake it, move a fader, light a lamp, write a scribble strip, log every press. See <a href="/projects/libdiginet/probe">docs/probe.md</a>.</li>
</ol>
<p>Building and testing: <a href="/projects/libdiginet/building">BUILDING.md</a>.</p>
<h2 id="safety">Safety</h2>
<p>The desk's system and diagnostic message family (<code>F0 13 xx 70 …</code>) can write to the desk's own memory. The library refuses to encode it.</p>
<h2 id="licence">Licence</h2>
<p>GPL-3.0-or-later. See <a href="https://github.com/FreeMixer/libdiginet/blob/084e09f8eaea72a275f583b8ae148b565aa6a548/LICENSE">LICENSE</a>.</p>
`},{slug:`building`,src:`BUILDING.md`,title:`Building libdiginet`,source:`https://github.com/FreeMixer/libdiginet/blob/084e09f8eaea72a275f583b8ae148b565aa6a548/BUILDING.md`,toc:[{id:`tests`,title:`Tests`},{id:`diginet-probe`,title:`diginet-probe`},{id:`diginet-packet-helper`,title:`diginet-packet-helper`},{id:`the-kaitai-grammar`,title:`The Kaitai grammar`},{id:`fuzzing`,title:`Fuzzing`},{id:`ci`,title:`CI`},{id:`packages`,title:`Packages`}],html:`<h1 id="building-libdiginet">Building libdiginet</h1>
<p>A hand-kept Makefile, no build system to configure. You need a C11 compiler and <code>make</code>.
Nothing else: no library outside libc.</p>
<pre><code>make                          # libdiginet.a, libdiginet-transport.a and tools/diginet-probe
make test                     # the unit suite, the same command CI runs
make install PREFIX=/usr/local [DESTDIR=...]
make clean
</code></pre>
<p>The code is plain C11 built with <code>-Wall -Wextra -Werror</code>, so a warning is a build failure.
<code>CC</code> and <code>CFLAGS</code> can be overridden on the command line; the warning flags are kept even then.</p>
<p>Three libraries come out of one tree:</p>
<ul>
<li><code>libdiginet</code>: the protocol. Frame grammar, codecs, personalities. No socket, no clock.</li>
<li><code>libdiginet-transport</code>: the wire. The packet socket and the session (discovery, wake,
ACKs, retransmit, keepalive, coalescing, pacing), and the desk mux (many desks over one
socket that hears every interface). It links <code>libdiginet</code>.</li>
<li><code>libdiginet-emu</code>: the desk emulator (see Tests below), installed so that a project testing
against a Control|24 or ProControl links it instead of keeping its own copy.</li>
</ul>
<p><code>make install</code> copies the headers to <code>$(PREFIX)/include/diginet/</code>, the archives to
<code>$(PREFIX)/lib</code> (<code>LIBDIR=</code> to change it) and three pkg-config files, so a consumer builds with:</p>
<pre><code>cc app.c $(pkg-config --cflags --libs libdiginet-transport)
cc test.c $(pkg-config --cflags --libs libdiginet-emu)
</code></pre>
<h2 id="tests">Tests</h2>
<p>Every test runs through <code>tests/run-test.sh</code>, which gives it a timeout: a hang is a failure,
never a stalled build. A test that exits 77 proved this machine cannot host it and is reported
as SKIP, never as a pass.</p>
<p>The golden frames are in <code>tests/golden/frames.txt</code>, one whole Ethernet frame per line in hex.
The C suite reads that file and checks every frame against the values <code>docs/protocol.md</code>
gives. The same file feeds the Kaitai check below, so the two readings of the grammar cannot
drift apart.</p>
<p>The transport suite needs no desk and no privileges. <code>testsupport/desk_emu.c</code>, installed as
<code>libdiginet-emu</code>, is a desk emulator that speaks the protocol; <code>test_transport</code> drives a
session against it on a virtual clock
(minutes of desk time in milliseconds), <code>test_mux</code> drives the desk mux against two of them on
two interfaces, and <code>test_fdio</code> does the same on the real clock over a socketpair. <code>test_packet</code> runs the real <code>AF_PACKET</code> path: it enters a user and network
namespace of its own, where it may open packet sockets on a private loopback; where
unprivileged namespaces are not allowed it exits 77 and reports SKIP. <code>test_anyif</code> does the
same with two veth pairs: it gives up its capabilities, takes the any-interface socket from
<code>tools/diginet-packet-helper</code>, and checks that each desk is heard on its own interface (one
made after the socket was opened), that a frame goes out of the interface it is sent to, and
that two desk emulators, one on each, come online through one mux over that one socket.</p>
<p><code>test_probe</code> runs <code>tools/diginet-probe</code> as its own process against the emulator, with the
wire on descriptor 3 and the operator's answers on stdin, and checks both the probe's output
and what the desk received.</p>
<h2 id="diginet-probe">diginet-probe</h2>
<p><code>make install</code> puts <code>diginet-probe</code> in <code>$(PREFIX)/bin</code>. It opens a packet socket, which needs
<code>cap_net_raw</code>:</p>
<pre><code>sudo setcap cap_net_raw=ep ./tools/diginet-probe
</code></pre>
<p>Every rebuild or copy makes a binary without the capability, so run <code>setcap</code> again after it.
How to run it on a desk is in <a href="/projects/libdiginet/probe">docs/probe.md</a>.</p>
<h2 id="diginet-packet-helper">diginet-packet-helper</h2>
<p><code>tools/diginet-packet-helper</code> opens the packet socket that hears every interface and hands it
to the program that started it, over a Unix socket on its descriptor 3, so that program needs
no capability (<a href="https://github.com/FreeMixer/libdiginet/blob/084e09f8eaea72a275f583b8ae148b565aa6a548/docs/diginet-packet-helper.1">docs/diginet-packet-helper.1</a>). The helper is
the one binary that holds <code>cap_net_raw</code>:</p>
<pre><code>sudo setcap cap_net_raw=ep ./tools/diginet-packet-helper
</code></pre>
<p>It links the static archives, even in the packages, so it loads no shared library of ours
while it holds the capability.</p>
<h2 id="the-kaitai-grammar">The Kaitai grammar</h2>
<p><code>protocol/diginet.ksy</code> is the formal byte grammar. To check that it compiles and that the
parser it generates reads the golden frames as the C library does:</p>
<pre><code>make ksy-check
</code></pre>
<p>This needs <code>kaitai-struct-compiler</code> (0.11, from https://github.com/kaitai-io/kaitai_struct_compiler/releases)
and the Python runtime (<code>pip install kaitaistruct==0.11</code>). CI runs it in a Debian container.</p>
<h2 id="fuzzing">Fuzzing</h2>
<p>Every reader of desk bytes has a libFuzzer harness in <code>fuzz/</code>, with a seed corpus, a coverage
floor, a recorded breakage for every check and one sabotage patch per property;
<a href="https://github.com/FreeMixer/libdiginet/blob/084e09f8eaea72a275f583b8ae148b565aa6a548/fuzz/README.md">fuzz/README.md</a> says what each checks. They need clang with libFuzzer,
<code>llvm-cov</code> for the coverage witness and the static libc for the static build:</p>
<pre><code>make fuzz fuzz-run FUZZ_TIME=60 fuzz-sabotage fuzz-records fuzz-coverage fuzz-static
</code></pre>
<h2 id="ci">CI</h2>
<p><code>.github/workflows/ci.yml</code> runs <code>make</code>, <code>make test</code> and <code>make install</code> in fedora:44,
debian:bookworm and debian:trixie containers, <code>make test</code> once more on the bare runner (where
the namespace test can run), and <code>make ksy-check</code> in a Debian container with the compiler
installed. <code>.github/workflows/fuzz.yml</code> builds the harnesses in fedora:44, fuzzes each for 60 s
and runs <code>make fuzz-corpus-check</code>, <code>make fuzz-sabotage</code>, <code>make fuzz-records</code>,
<code>make fuzz-coverage</code> and <code>make fuzz-static</code>.</p>
<h2 id="packages">Packages</h2>
<p>One source builds two shared libraries and a tool:</p>
<table>
<thead>
<tr>
<th></th>
<th>Fedora</th>
<th>Debian</th>
</tr>
</thead>
<tbody>
<tr>
<td>libdiginet, libdiginet-transport</td>
<td><code>libdiginet</code></td>
<td><code>libdiginet0</code>, <code>libdiginet-transport0</code></td>
</tr>
<tr>
<td>headers, pkg-config, <code>diginet.ksy</code></td>
<td><code>libdiginet-devel</code></td>
<td><code>libdiginet-dev</code></td>
</tr>
<tr>
<td><code>diginet-probe</code></td>
<td><code>diginet-tools</code></td>
<td><code>diginet-tools</code></td>
</tr>
</tbody>
</table>
<p><code>packaging/libdiginet.spec</code> and <code>debian/</code> describe them; both run <code>make shared</code> and
<code>make install-shared</code>, and <code>make test</code> against the result. The RPM gives <code>diginet-probe</code>
<code>cap_net_raw</code> with <code>%caps</code>; the DEB sets it in <code>diginet-tools.postinst</code> with <code>setcap</code>.</p>
<p>The version is the <code>VERSION</code> file; the sonames' majors are <code>DIGINET_ABI</code> and
<code>DIGINET_TRANSPORT_ABI</code> in <code>include/diginet/diginet.h</code>. <code>tests/conformance-packaging.sh</code> (part of
<code>make test</code>) refuses a header, spec or <code>debian/</code> that disagrees with them.</p>
<h3 id="releasing">Releasing</h3>
<p>Set the version in <code>VERSION</code>, <code>include/diginet/diginet.h</code>, <code>Version:</code> in the spec and the top
entry of <code>debian/changelog</code>, then tag <code>vX.Y.Z</code>. The tag runs <code>.github/workflows/release.yml</code>,
which calls the shared <code>build-rpm.yml</code> and <code>build-deb.yml</code> workflows of FreeMixer/.github: signed
RPMs for Fedora 44 (x86_64, aarch64) and DEBs for Debian bookworm and trixie (amd64, arm64) are
published to the FreeMixer channel and attached to the GitHub release. A pull request runs the
same workflows as a dry run that builds, lints and publishes nothing, then installs the packages
it built in clean containers and builds a consumer against the development package. Git history
is the changelog; no changelog file is kept.</p>
`},{slug:`protocol`,src:`docs/protocol.md`,title:`The DigiNet surface protocol (Control|24, ProControl)`,source:`https://github.com/FreeMixer/libdiginet/blob/084e09f8eaea72a275f583b8ae148b565aa6a548/docs/protocol.md`,toc:[{id:`sources`,title:`Sources`},{id:`the-protocol`,title:`The protocol`},{id:`checked-against-c24-engine-renewed`,title:`Checked against C24-Engine-Renewed`},{id:`assumptions`,title:`Assumptions`},{id:`open-questions-and-how-to-settle-them-on-a-unit`,title:`Open questions and how to settle them on a unit`}],html:`<h1 id="the-diginet-surface-protocol-control-24-procontrol">The DigiNet surface protocol (Control|24, ProControl)</h1>
<p>What is known about the protocol the Digidesign Control|24 and ProControl speak over Ethernet, gathered from the projects listed below. Every claim names its source. Nothing here was taken from a vendor document. Items marked unknown are settled by captures on a real unit (see the end of this file).</p>
<h2 id="sources">Sources</h2>
<p>Line citations below are to these commits.</p>
<table>
<thead>
<tr>
<th>Source</th>
<th>URL</th>
<th>What it covers</th>
<th>What here rests on it</th>
</tr>
</thead>
<tbody>
<tr>
<td>ReaControl24, branch <code>Release</code>, commit <code>2a963e9</code> (2020-06-26). GPL-3.0-or-later</td>
<td>https://github.com/phunkyg/ReaControl24</td>
<td>A Control|24 daemon and OSC client for Reaper: daemon <code>control24d.py</code>, control map <code>control24map.py</code>, client <code>control24osc.py</code></td>
<td>The header fields and their names, <code>e2</code> and <code>a0</code>, the counters, stop-and-wait and back-off, the batching limits, the 10 s keepalive and its bug, the button and LED map, and the fader, V-Pot, ring, meter, scribble, automation-LED and counter encodings</td>
</tr>
<tr>
<td>ReaControl24, branch <code>Ftr_Version2</code>, commit <code>440f29a</code> (2024-11-19)</td>
<td>https://github.com/phunkyg/ReaControl24/tree/Ftr_Version2</td>
<td>The newer multi-device daemon <code>ReaControl.py</code>, <code>ReaCommon.py</code>, the ProControl client <code>procontrolosc.py</code>, <code>pro_control_map.csv</code>, <code>test/emulator.py</code></td>
<td>The announce layout, broadcast and unicast, the ProControl's name, the stale fourth V-Pot byte</td>
</tr>
<tr>
<td>ReaControl24 issues #2 to #22</td>
<td>https://github.com/phunkyg/ReaControl24/issues</td>
<td>Problems users reported</td>
<td>ProControl display addressing (#12, #22) and its device byte</td>
</tr>
<tr>
<td>procontrol-linux, commit <code>ecf1da8</code> (2026-09-27). GPL-3.0-or-later; the documents are in French</td>
<td>https://github.com/julienfernandez/procontrol-linux</td>
<td>A ProControl driver for Linux, with captures and measurements from a real unit. It carries lazlooose's ProControl display fixes (<code>docs/displays.md</code>)</td>
<td>The header sum, <code>e0</code>/<code>e1</code> and the host MAC in <code>e1</code>, the keepalive bug and its fix, the fader echo, the 10 Mbit/s half-duplex link, the ProControl counter and display addresses, the dangers of the <code>0x70</code> family</td>
</tr>
<tr>
<td>C24-Engine-Renewed, commit <code>94d7a3b</code> (2026-08-16). No licence</td>
<td>https://github.com/Davitekk/C24-Engine-Renewed</td>
<td>Control|24 tools for macOS that drive a real desk: a Pro Tools HUI bridge (<code>Control24-Engine/motore.py</code>), CamillaDSP and media modes (<code>Camilla24/</code>, <code>HUI-OS/</code>), a calculator on the keypad and counter (<code>Calculator24/</code>), an LED finder (<code>Control24-LED-Finder/</code>)</td>
<td>The header as a host fills it, <code>e3</code>, the minimum frame, the ping and watchdog timings, running status, display pacing, the 14-bit fader, the ring bits (A1), the meter bits (A2), the seven-segment bits (A3), the counter's digit and dot order (A4, A5), the centre displays, the automation and counter-mode LED values, the device-name write. Every point is compared with this library in &quot;Checked against C24-Engine-Renewed&quot; below</td>
</tr>
<tr>
<td>Neyrinck, legacy control surface research</td>
<td>https://neyrinck.com/v-control-pro/legacy-control-surface-research/</td>
<td>Neyrinck's one-line description of the surfaces' link: &quot;low level ethernet communications, cryptography, CRC error detection&quot;</td>
<td>R3 and R11</td>
</tr>
</tbody>
</table>
<hr>
<h2 id="the-protocol">The protocol</h2>
<h3 id="transport">Transport</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Finding</th>
<th>Status</th>
<th>Citation</th>
</tr>
</thead>
<tbody>
<tr>
<td>Framing</td>
<td>Raw Ethernet II, EtherType <strong>0x885F</strong>, no IP</td>
<td>Decoded, confirmed by three projects</td>
<td><code>control24d.py:42</code>, <code>:123</code>; procontrol-linux <code>docs/protocol.md</code> (frame offset table)</td>
</tr>
<tr>
<td>Vendor</td>
<td>Source OUI <strong>00:a0:7e</strong> (Digidesign)</td>
<td>Decoded</td>
<td><code>control24d.py:101</code>, <code>:403</code></td>
</tr>
<tr>
<td>Capture filter used</td>
<td><code>(ether dst &lt;host-mac&gt; or broadcast) and ether[12:2]=0x885f</code></td>
<td>—</td>
<td><code>control24d.py:69</code>, <code>:261</code></td>
</tr>
<tr>
<td>Link</td>
<td>The ProControl showed <strong>10 Mbit/s half duplex</strong> on a direct link. The Control</td>
<td>24's port is of the same generation</td>
<td>Observed (ProControl); <strong>to verify</strong> on the C24</td>
</tr>
<tr>
<td>Minimum frame</td>
<td>Bodies are padded to the Ethernet minimum (46-byte payload). Bytes after the logical length are padding, and a Control</td>
<td>24 leaves stale bytes there: in <code>walk2.pcap</code> (Control</td>
<td>24 1.08, a walk of every control) 402 of its 2,306 data frames carry bytes at or above 0x80 in the padding, and none carries one in its messages. The grammar (<code>diginet.ksy</code>) accepts a data byte at or above 0x80 where the C decoder rejects it; whether a desk ever sends one inside a message is <strong>unmeasured</strong></td>
</tr>
<tr>
<td>Broadcast and unicast</td>
<td>The desk <strong>broadcasts</strong> its announce to ff:ff:ff:ff:ff:ff. Everything else is unicast between the desk MAC and the host MAC</td>
<td>Decoded</td>
<td><code>control24d.py:396-418</code>; <code>ReaControl.py:418-436</code> (Ftr_Version2)</td>
</tr>
</tbody>
</table>
<p><strong>The header</strong> (16 bytes after the 14-byte Ethernet header, big-endian; <code>control24d.py:137-150</code>):</p>
<table>
<thead>
<tr>
<th>Frame offset</th>
<th>Size</th>
<th>Field (ReaControl name)</th>
<th>Meaning</th>
<th>Status</th>
</tr>
</thead>
<tbody>
<tr>
<td>14</td>
<td>2</td>
<td><code>numbytes</code></td>
<td>16 + body length (keepalive = 17, bare control frame = 16, announce = 50)</td>
<td>Decoded (<code>control24d.py:198</code>, <code>:221</code>)</td>
</tr>
<tr>
<td>16</td>
<td>2</td>
<td><code>unknown1</code> / &quot;parity&quot;</td>
<td><strong>16-bit additive sum of the body.</strong> All 418 of 418 ProControl→host frames matched (procontrol-linux <code>tools/audit_diginet.py:26-27</code>, <code>docs/protocol.md</code> §Mise à jour). ReaControl's one non-zero value, <code>0x0244</code> on the clock-init frame (<code>control24d.py:415-416</code>), is exactly the byte sum of that body. ReaControl and C24-Engine send <strong>zero</strong> everywhere else, and the Control</td>
<td>24 accepts it</td>
</tr>
<tr>
<td>18</td>
<td>4</td>
<td><code>sendcounter</code></td>
<td>The sender's own sequence. ReaControl advances it by the number of commands in the frame; C24-Engine by one per frame, ACKs and pings included. The desk works with both. <strong>The desk's own</strong> advances by the previous data frame's <code>numcommands</code> (a frame carries the counter before its own commands); a retransmission carries it unchanged with <code>retry</code> set (<code>r15b.pcap</code>, <code>walk2.pcap</code>, Control</td>
<td>24 1.08)</td>
</tr>
<tr>
<td>22</td>
<td>4</td>
<td><code>cmdcounter</code></td>
<td>In an ACK: the peer's sequence being acknowledged</td>
<td>Decoded (<code>control24d.py:439-447</code>, <code>:499-500</code>)</td>
</tr>
<tr>
<td>26</td>
<td>2</td>
<td><code>retry</code></td>
<td>Non-zero = the desk is retransmitting because it did not get our ACK in time</td>
<td>Partly decoded (<code>control24d.py:430-437</code>)</td>
</tr>
<tr>
<td>28</td>
<td>1</td>
<td><code>c24cmd</code></td>
<td><code>0x00</code> = data, <code>0xA0</code> = ACK, <code>0xE2</code> = online/wake, <code>0xE0</code> = announce (offline), <code>0xE1</code> = announce (in session), <code>0xE3</code> = disconnect</td>
<td><code>a0</code>/<code>e2</code> in <code>control24common.py:48-51</code>; <code>e0</code>/<code>e1</code> in procontrol-linux <code>tools/procontrold.py:102-115</code> and <code>docs/session-reference.md</code>; <code>e3</code> in C24-Engine <code>motore.py:1069-1079</code></td>
</tr>
<tr>
<td>29</td>
<td>1</td>
<td><code>numcommands</code></td>
<td>Number of commands in the body. A fader move <code>B0 tt MSB (20+tt) LSB</code> counts as one. A Control</td>
<td>24 batches moves of one fader: <code>r15b.pcap</code> packets 596 and 613 carry 2 and 5 moves, counts 2 and 5 (A7)</td>
</tr>
</tbody>
</table>
<p><strong>Discovery and handshake:</strong></p>
<ol>
<li>The desk broadcasts an <code>e0</code> announce about every 7 s when idle (ProControl: 4 in 30 s, 104 in 740 s; procontrol-linux <code>docs/observations-2026-09-13.md:60,73</code>). The body is 14 unknown bytes, then the version from byte 14 (<code>v1.08</code>: byte 14 is the letter <code>v</code>), then the device name from byte 24: <strong><code>CNTRL|24</code></strong> for a Control|24, <code>MAINUNIT</code> for a ProControl (<code>control24d.py:168-176</code>; <code>ReaControl.py:624-636</code>; <code>test/emulator.py:14-17</code>). C24-Engine reads the version at body bytes 14–24 and the name at 24–32 (<code>motore.py:1191-1198</code>), which every announce in <code>r15b.pcap</code> and <code>walk2.pcap</code> bears out. ReaControl's layout, and this library's (<code>diginet_frame.c:148</code>), read the version from byte 15, so they give <code>1.08</code> without the <code>v</code>.</li>
<li>The host sends <code>e2</code> with no body (<code>control24d.py:414</code>), at send counter 0: a Control|24 takes a session on no other (#41). ReaControl then sends a clock-clear frame <code>F0 13 01 30 19 00 … F7</code> with checksum <code>02 44</code> (<code>control24d.py:415-418</code>). After the <code>30</code> it carries 9 or 10 bytes: the counter address <code>19</code> and eight zeros, or with the dots byte as the counter message has it. The zeros add nothing to the sum, so <code>02 44</code> fits both. procontrol-linux showed the clock frame is not needed (<code>docs/session-reference.md</code>, &quot;Essai local&quot;).</li>
<li>The desk ACKs (<code>a0</code>, ack counter = our sequence). A ProControl then switches its broadcasts to <strong><code>e1</code>, which carries the host MAC</strong>, so on a ProControl an <code>e1</code> announce is the &quot;online&quot; proof and an ACK alone is not (procontrol-linux <code>docs/online-2026-09-13.md:35-36</code>). <strong>A Control|24 enters its session only once the host has sent in it</strong> (firmware 1.08, captures on the desk, #41, #48). After a boot it announces <code>e0</code>, answers an <code>e2</code> at send counter 0 with <code>a0</code> (an <code>e2</code> at any other counter it only ACKs), and keeps announcing <code>e0</code>. A host that goes online on that <code>a0</code> and sends sees every frame ACKed; at the desk's next <code>e0</code> it sends another <code>e2</code>, and 1 ms later the desk announces <code>e1</code> naming the host, and <code>e1</code> only from then on. That second <code>e2</code> opens a new session on the desk, which blanks its scribbles (the faders keep their place), so its first <code>e1</code> is ONLINE again for the host (<code>DIGINET_R_RENEWED</code>), which shows everything again. A host that waits for <code>e1</code> before it sends is answered <code>a0</code> to every <code>e2</code> and never sees one: so on a Control|24 the <code>a0</code> is the online proof. Out of session it still ACKs every host data frame and shows Offline. Once an <code>e1</code> has named the host, an <code>e0</code> is a desk out of session, after a reboot: it ends the session, which the host then wakes again. <strong>A Control|24 that boots while large unknown broadcasts reach it ignores every host:</strong> booted with reac-pw sending about 32 REAC frames of 1492 bytes a second on its link, it ACKed no <code>e2</code>, ours nor ReaControl24's, and stopping the traffic did not bring it back; booted on a quiet link it took the session at once. Such a desk keeps announcing and lets every <code>e2</code> time out, and nothing on the wire names the cause, so the session reports it on its own: after <code>deaf_wakes</code> (3) wakes in a row that time out while the desk still announces (an announce within <code>offline_ms</code>), it gives <code>DIGINET_N_DESK_DEAF</code> once (#35). An <code>a0</code> for an <code>e2</code>, an <code>e1</code> naming another host (<code>DIGINET_N_FOREIGN</code>, a different notice: that desk hears hosts) or a timeout with no recent announce ends the count.</li>
<li>Disconnect is <code>e3</code> with no body. It drops the session (C24-Engine <code>motore.py:1069-1079</code>, &quot;the CORRECT way to disconnect&quot;). A Control|24 (firmware 1.08, measured 2026-10-29, #33) then keeps announcing <code>e1</code> naming that host for about 30 s (34 s and 30 s), until its own timeout, before it falls back to <code>e0</code>. With <code>auto_wake</code> the session therefore sends <code>e2</code> on an <code>e1</code> naming its own host as it does on an <code>e0</code>, so a restarted host need not wait for the desk to time out.</li>
</ol>
<p>C24-Engine sends <code>e2</code> five times 5 ms apart, waits 200 ms and then drives the desk without waiting for an ACK or an <code>e1</code> (<code>motore.py:1172-1189</code>). It treats any frame from the desk as the desk being there.</p>
<p><strong>Acks, sequencing, retransmit:</strong></p>
<ul>
<li>Every desk data frame gets a host ACK. ReaControl sends it about 0.8 ms after receipt (<code>TIMING_BEFORE_ACKT</code>, <code>control24d.py:48</code>, <code>:445-447</code>), with the desk's <code>sendcounter</code> in our <code>cmdcounter</code> field (<code>:499-500</code>). ReaControl does not advance its own counter on an ACK; C24-Engine does (<code>motore.py:940-948</code>). Both work, so the desk tolerates either.</li>
<li><strong>Host→desk is stop-and-wait: one frame in flight.</strong> <code>receive_handler</code> blocks on <code>sendlock</code> until the desk's <code>a0</code> arrives (<code>control24d.py:460-468</code>). It logs every 100 ms and never gives up or retransmits: <code>#TODO implement daw-desk retry packets</code> (<code>:463</code>). procontrol-linux kept the same one-frame window (<code>docs/fader-echo-2026-09-14.md</code>, &quot;une seule trame en attente d'ACK&quot;).</li>
<li>When the desk sends a retry frame, ReaControl pauses its own sending for 300 ms (<code>TIMING_BACKOFF</code>, <code>control24d.py:53</code>, <code>:433-437</code>).</li>
<li>C24-Engine does not wait for ACKs at all: it sends frame after frame, never retransmits, and never sets or reads the retry field (<code>motore.py:516-550</code>). So the desk accepts more than one host frame in flight.</li>
<li>Batching: up to 48 commands or 314 bytes per frame (<code>control24d.py:298-299</code>, <code>:333-341</code>). C24-Engine packs whole display batches into one frame, up to 51 commands and 461 bytes when it initialises the scribble strips (<code>motore.py:962-984</code>) and 100 LED commands when it blanks the desk (<code>:1036-1067</code>), and paces display batches about 2 ms apart, &quot;so the desk's controller renders cleanly (no datamoshing)&quot; (<code>motore.py:531-550</code>).</li>
</ul>
<p><strong>Keepalive (a real bug in the reference):</strong></p>
<ul>
<li>ReaControl sends a keepalive frame (body <code>00</code>, ncmds 1) when nothing has been sent for 10 s (<code>control24d.py:46</code>, <code>:285-293</code>, <code>:507-511</code>). But every ACK counts as &quot;sent&quot; (<code>pcap_last_sent</code>, <code>:484</code>), so a busy surface never sends one.</li>
<li>procontrol-linux measured a 48 s gap between keepalives with 225 ACKs in between, and the desk fell back to <code>e0</code> (offline). Their fix is a keepalive every 10 s <strong>regardless of ACKs</strong> (<code>docs/online-2026-09-13.md:136-160</code>). After the fix the longest gap was 10.048 s and the desk stayed online.</li>
<li>C24-Engine pings every 1 s with an empty 16-byte data frame (count 0, no body), and declares the desk offline after 4 s with no traffic (<code>motore.py:404</code>, <code>:951-960</code>, <code>:1023-1034</code>). Its calculator pings every 2.5 s (<code>Calculator24/Calculator24.py:78-81</code>). The desk accepts both keepalive forms, the empty frame and the body <code>00</code>.</li>
<li>The desk-side timeout is <strong>not measured</strong>; &quot;about 45 s&quot; is an upper bound on the ProControl.</li>
</ul>
<p><strong>One socket, every interface (libdiginet's own, #35):</strong></p>
<p>Nothing in the protocol ties a desk to an interface: it broadcasts its announce on whatever link it is cabled to, and a host answers from that link's MAC. So one <code>AF_PACKET</code> socket bound to EtherType 0x885F on no interface (<code>diginet_packet_open_any()</code>) hears every desk on every interface, interfaces that come up later included (a USB adapter plugged in afterwards). Each frame comes with the index of the interface it arrived on (<code>diginet_packet_recvfrom()</code>), and a frame goes out of one named interface (<code>diginet_packet_sendto()</code>); a host MAC is the MAC of the desk's interface (<code>diginet_if_mac()</code>).</p>
<ul>
<li><strong>The desk mux</strong> (<code>diginet_mux.h</code>) runs one session per desk over that socket. A desk is keyed by its MAC. Its first valid announce, from a Digidesign MAC, makes it present on the interface it came in on (<code>DIGINET_MUX_N_APPEARED</code>); from then on its frames come from that interface only, and the same MAC on another interface while it is present (a bridge and its port both show a frame) is set aside. An attached desk's session sends out of the desk's interface, from that interface's MAC.</li>
<li><strong>A desk that moved between interfaces of one host (#40):</strong> it keeps announcing <code>e1</code> naming the first interface's MAC until its own timeout, about 30 s (step 4 of the handshake). Each attached session carries this host's other interface MACs (<code>other_host_macs</code>, from the io's <code>host_macs</code>, <code>diginet_host_macs()</code> on the packet socket), so that <code>e1</code> is this host's own session, not <code>DIGINET_N_FOREIGN</code>, and <code>auto_wake</code> takes it at once from the new interface. Only an <code>e1</code> naming the session's own interface MAC is the online proof. A MAC of no interface of this host is still another host's session. Two daemons on two interfaces of one host are one host to the desk mux: R13's one daemon per desk holds there too.</li>
<li><strong>Gone:</strong> nothing from the desk for <code>gone_ms</code> (30 s), or its session ended on silence (<code>DIGINET_R_SILENCE</code>, nothing for <code>offline_ms</code>, 25 s): <code>DIGINET_MUX_N_GONE</code>. 30 s is more than three announce periods (6.0-9.4 s, #29) and more than <code>offline_ms</code>, so an attached session gives up first. A Control|24 in an <code>e0</code> session loses it sooner, on its first unACKed keepalive (<code>DIGINET_R_ACK_LOST</code>), and is then gone at <code>gone_ms</code>.</li>
<li><strong>The capability:</strong> <code>cap_net_raw</code> is checked when the socket is opened, never after. <code>diginet-packet-helper</code> holds it, opens the socket, passes it over a Unix socket (<code>SCM_RIGHTS</code>) and exits; <code>diginet_packet_open_by_helper()</code> starts it and takes the socket, and <code>diginet_packet_receive_fd()</code> takes only an <code>AF_PACKET</code> socket. The program that drives the desks holds no capability.</li>
<li><strong>What the socket also hears.</strong> It hears 0x885F on every interface, a REAC trunk included, and the mux would answer a desk there. The mux reports each desk's interface; whether a host should refuse a desk on an interface that carries REAC is the host's to rule, from that interface.</li>
</ul>
<h3 id="the-command-set-body">The command set (body)</h3>
<p>The body is a byte stream of MIDI-shaped messages. <strong>Running status occurs</strong>: C24-Engine expands it before parsing (<code>motore.py:1100-1137</code>, <code>:1209</code>), and says a desk fader move arrives as <code>B0 tt MSB (20+tt) LSB</code> with the second <code>B0</code> left out. ReaControl instead splits on known status bytes and <code>F7</code> (<code>control24osc.py:1175-1200</code>), which mis-parses running status. The desk uses the same encoding in both directions for faders, buttons and LEDs.</p>
<p><strong>Faders (24 motor faders)</strong> — decoded:</p>
<ul>
<li>Desk→host and host→desk: <code>B0 tt MSB (20+tt) LSB</code>, a 14-bit MIDI CC pair carrying a <strong>10-bit</strong> position: MSB = v&gt;&gt;3, LSB = (v&amp;7)&lt;&lt;4 (<code>control24osc.py:166-176</code>, <code>:916-920</code>, <code>:986-1001</code>).
<ul>
<li>Example: v = 512 gives <code>B0 tt 40 (20+tt) 00</code>.</li>
<li>C24-Engine writes and reads plain 14-bit values, MSB = v&gt;&gt;7, LSB = v&amp;0x7F (<code>motore.py:585-590</code>, <code>:1345-1372</code>). These are the same bytes with the low 4 bits used.</li>
</ul>
</li>
<li>procontrol-linux confirmed raw travel of 0–1023 on fader 1 (<code>docs/protocol.md</code>, register row &quot;Fader 1 et contact&quot;).</li>
<li><strong>Touch:</strong> a strip button <code>90 09 (40|tt)</code> on touch, <code>90 09 tt</code> on release (<code>control24map.py:942-946</code>).</li>
<li><strong>The motor holds a set-point.</strong> ReaControl echoes the hand's position back to the desk at most every 100 ms during a move (<code>control24osc.py:974-976</code>, <code>TIMING_FADER_ECHO :50</code>), and re-sends the last position on release (<code>:978-983</code>).
<ul>
<li>procontrol-linux filmed the consequence of a late echo: on release the motor drove back to the old set-point, then to the new one (<code>docs/fader-echo-2026-09-14.md</code>).</li>
<li>Their fix: echo the exact physical value immediately on release, and refuse any other host value while the cap is touched.</li>
<li><strong>Status:</strong> encoding decoded. Whether the motor pushes against a touched cap is <strong>unknown</strong> on the C24.</li>
</ul>
</li>
</ul>
<p><strong>V-Pots (24) and jog wheel</strong> — decoded:</p>
<ul>
<li>Turn: <code>B0 (40|tt) dd</code> with delta = dd − 64 (<code>control24map.py:20-36</code>; <code>control24osc.py:890-906</code>).</li>
<li>ReaControl reads a 4th &quot;velocity&quot; byte (<code>control24osc.py:893</code>). The ProControl logs show that byte is stale buffer content (<code>pro_control_map.csv</code>, rows 5/15/25: arbitrary values), so treat V-Pot input as 3 bytes.</li>
<li>The jog wheel is &quot;virtual track 28&quot;: <code>B0 5C dd</code>, delta = dd − 64 (<code>control24osc.py:369-373</code>, <code>:746-775</code>; procontrol-linux <code>docs/protocol.md</code>, &quot;Le jog <code>b0 5c valeur</code>&quot;). C24-Engine reads V-Pots and jog the same way, three bytes each (<code>motore.py:1374-1391</code>), and hands the jog on with its sign inverted relative to the V-Pots. Which way of turning gives dd &gt; 64 on each control is <strong>unknown</strong>.</li>
<li>Scrub and Shuttle are buttons in zone <code>0x1C</code>, ids 0x12/0x13 (<code>control24map.py:746-756</code>).</li>
</ul>
<p><strong>V-Pot LED rings (15 LEDs)</strong> — decoded:</p>
<ul>
<li><code>F0 13 01 00 (tt | 0x40·LED1) b1 b2 F7</code>: bit 6 of the address byte lights LED 1, <code>b1</code> bits 6..0 are LEDs 2..8, <code>b2</code> bits 6..0 are LEDs 9..15.</li>
<li>ReaControl ships dot and fill tables (<code>control24osc.py:783-816</code>, <code>:864-882</code>). C24-Engine computes the same, LED 1 in the address byte and LED 2 at bit 6 of <code>b1</code> (<code>motore.py:633-643</code>).</li>
</ul>
<p><strong>Buttons and LEDs</strong> — decoded, about 200 controls mapped:</p>
<ul>
<li><strong>Strip buttons:</strong> <code>90 bb (40·pressed | tt)</code>, where <code>bb</code> is the button: 00 RecArm, 01 Pan/Send, 02 EQ, 03 Dynamics, 04 Switch/Active, 05 auto-mode, 06 Select, 07 Solo, 08 Mute, 09 fader Touch, 0A Inserts, 0B Peak, 0C SourceToggle, 0D RollOff (<code>control24map.py:886-962</code>).</li>
<li><strong>Section buttons:</strong> <code>90 bb (40·pressed | zone)</code>, zone 0x18..0x1D (<code>control24map.py:37-48</code>, <code>ChildByteMatch 0x18</code>):</li>
</ul>
<table>
<thead>
<tr>
<th>Zone</th>
<th>What it holds</th>
<th>Citation</th>
</tr>
</thead>
<tbody>
<tr>
<td>0x18</td>
<td>F1–F10, automation enable and mode, Shift/Option/Control/Command modifiers, Show Values/Group/Names/Info, Solo Clear, meter select</td>
<td><code>control24map.py:49-330</code></td>
</tr>
<tr>
<td>0x19</td>
<td>Window, zoom presets, Nav/Zoom/SelAdj, cursor keys, Counter Mode</td>
<td><code>control24map.py:331-446</code></td>
</tr>
<tr>
<td>0x1A</td>
<td>Numeric keypad</td>
<td><code>control24map.py:447-505</code></td>
</tr>
<tr>
<td>0x1B</td>
<td>Edit mode/function/tools, Bank Left/Nudge/Right, Master Faders, Undo/Save/Esc, Groups</td>
<td><code>control24map.py:506-668</code></td>
</tr>
<tr>
<td>0x1C</td>
<td>Transport and Talkback</td>
<td><code>control24map.py:669-757</code></td>
</tr>
<tr>
<td>0x1D</td>
<td>Monitor, inserts, assignment, Sends Flip and A/F–E/J, pans, channel-bar scroll</td>
<td><code>control24map.py:758-880</code></td>
</tr>
</tbody>
</table>
<ul>
<li><strong>LEDs</strong> use the same 3-byte message: <code>90 bb (40·on | zone-or-track)</code>. ReaControl builds its LED table by walking the input map (<code>control24osc.py:178-208</code>, <code>:1005-1062</code>). C24-Engine: <code>send_native_button_led</code> (<code>motore.py:552-556</code>) and a separately discovered LED dictionary (<code>Control24-LED-Finder/c24_led_dictionary.json</code>, 1149 lines, facts only).</li>
<li><strong>Per-strip automation LEDs:</strong> <code>F0 13 01 20 tt bits F7</code> with write 0x40, touch 0x20, latch 0x10, trim 0x08, read 0x04 (<code>control24osc.py:1082-1098</code>). C24-Engine uses the same values (<code>motore.py:777-779</code>), noting that its first version had touch and trim swapped; its docstring at <code>:438-440</code> still shows the swapped pair.</li>
<li><strong>Counter-mode LEDs:</strong> <code>F0 13 01 20 19 xx F7</code> (<code>control24osc.py:429-456</code>), with timecode 0x20, feet+frames 0x10, bars|beats 0x08, min:sec 0x40, all off 0x00 (<code>motore.py:339-343</code>, <code>:449-470</code>).</li>
<li><strong>Status:</strong> the map covers what a mixing console needs. Some zone assignments are ReaControl's names and are unverified on a C24.</li>
</ul>
<p><strong>Scribble strips</strong> — decoded, with one open point:</p>
<ul>
<li><code>F0 13 01 40 aa 00 c1 c2 c3 c4 F7</code>: <strong>4 characters</strong>, plain ASCII, padded with spaces (<code>control24osc.py:609-673</code>).</li>
<li>Special glyphs: a &quot;dot plus small digit&quot; glyph for <code>.1</code>..<code>.9</code> is <code>chr(ord(d) − 26)</code>, i.e. 0x17..0x1F (<code>control24osc.py:662-671</code>).</li>
<li>Addresses:
<ul>
<li>ReaControl writes strip n at <code>aa = n</code> (0x00..0x17), plus virtual 24..31 (<code>control24osc.py:375-376</code>, <code>:631</code>).</li>
<li>C24-Engine writes names at <code>aa = 0x20+n</code> (<code>motore.py:962-975</code>) and the two centre &quot;channel bar&quot; displays at <code>0x1D</code>/<code>0x1E</code> (<code>motore.py:558-565</code>).</li>
<li>On the ProControl, <code>00..07</code> is the top row and <code>20..27</code> the bottom row, 8 characters each (issue #12; procontrol-linux <code>docs/displays.md</code>).</li>
<li><strong>What <code>0x00+n</code> versus <code>0x20+n</code> means on a Control|24 (two layers, two rows, or aliases) is unknown.</strong></li>
</ul>
</li>
<li><code>long_scribble</code> spreads a 96-character message over all strips (<code>control24osc.py:338-345</code>).</li>
</ul>
<p><strong>Meters</strong> — encoding decoded, physical segment count unknown:</p>
<ul>
<li><code>F0 13 01 10 ch hi lo F7</code>, with ch 0..23 left and 0x20+ch right; bus meters start at 24/56 (<code>control24osc.py:540-606</code>).</li>
<li>The value is a <strong>thermometer bitmask</strong> over 14 bits (two 7-bit bytes): n segments lit is the n lowest bits, <code>hi</code> = mask&gt;&gt;7, <code>lo</code> = mask&amp;0x7F. ReaControl's 15-step table is at <code>:552-568</code>; C24-Engine builds the mask the same way, at most 14 bits, and refreshes at 25 Hz (<code>motore.py:913-928</code>; <code>Camilla24/camilla_engine.py:92</code>, &quot;the C24 bitmask holds up to 14&quot;).</li>
<li>Whether the desk decays a lit meter on its own (as the X-Touch does) is unknown.</li>
</ul>
<p><strong>Counter / timecode</strong> — decoded:</p>
<ul>
<li><code>F0 13 01 30 19 dots d8 … d1 F7</code>: 8 seven-segment digits, the <strong>rightmost first</strong> (d8 … d1 with d1 the leftmost), then F7 (<code>control24osc.py:382-425</code>, <code>:459-520</code>; <code>motore.py:616-631</code>; <code>HUI-OS/HUI_OS.py:612-626</code>; <code>Calculator24/Calculator24.py:83-112</code>).</li>
<li>A segment byte has <strong>bit 6 = a, 5 = b, 4 = c, 3 = d, 2 = e, 1 = f, 0 = g</strong>: C24-Engine draws <code>0</code> as 0x7E, <code>1</code> as 0x30, <code>-</code> as 0x01, <code>E</code> as 0x4F and <code>r</code> as 0x05 (<code>motore.py:616-619</code>; <code>Calculator24/Calculator24.py:27-31</code>). The library's table covers 0–9 and A b C d E F H h J L o P r S U Y Z -.</li>
<li>The <code>dots</code> byte: <strong>bit k lights the dot after the k-th digit from the left</strong> (bit 0 the leftmost). The rightmost digit has no dot bit. C24-Engine's calculator shows &quot;12.5&quot; with dots = 0x40, and its clock puts the minutes dot at bit 5 (<code>Calculator24/Calculator24.py:83-93</code>; <code>HUI-OS/HUI_OS.py:612-621</code>; <code>motore.py:621-626</code>).</li>
<li>The ProControl uses address <code>0x09</code> and device byte <code>00</code> instead of <code>0x19</code> and <code>01</code> (procontrol-linux <code>docs/displays.md</code>).</li>
</ul>
<p><strong>System and diagnostic family <code>F0 13 xx 70 …</code></strong> — dangerous:</p>
<ul>
<li>Device-name write to the desk's memory: <code>F0 13 01 70 00 6E &lt;8 chars&gt; F7</code> (C24-Engine <code>motore.py:566-574</code>).</li>
<li>On the ProControl the same family reads firmware memory (<code>70 00</code> comm processor, <code>70 01</code> faders) and produced spurious touch events (procontrol-linux <code>docs/protocol.md</code>, top section; <code>docs/fader-touch-recovery-2026-09-21.md</code>).</li>
<li><strong>The desk sends this family itself:</strong> in <code>r15b.pcap</code> a Control|24 1.08 sent <code>F0 13 01 70 01 4F 4B F7</code> and <code>F0 13 01 70 01 0A 0D F7</code> (packets 735 and 737). What they mean is not known.</li>
<li>A host must never send this family; the library refuses to encode it.</li>
</ul>
<p><strong>The device byte</strong> after <code>F0 13</code> is <code>01</code> for the Control|24 and <code>00</code> for the ProControl main unit (issue #22 trace <code>f0 13 00 40 …</code>; procontrol-linux <code>docs/protocol.md</code>). This is a per-device personality, not a constant.</p>
<h3 id="sources-and-licences">Sources and licences</h3>
<p>ReaControl24 and procontrol-linux are GPL-3.0-or-later, like this library. C24-Engine-Renewed carries no licence, so only facts come from it (byte layouts, bit orders, timings), never code or tables. libdiginet is a new implementation written from this description, not a port: the byte grammar lives in <code>diginet.ksy</code>, each field cited to the sources above.</p>
<hr>
<h2 id="checked-against-c24-engine-renewed">Checked against C24-Engine-Renewed</h2>
<p>C24-Engine-Renewed drives a real Control|24 from a working host, so each point it touches is
compared here with what this library does. Citations are to its files at commit <code>94d7a3b</code>.</p>
<table>
<thead>
<tr>
<th>Point</th>
<th>This library</th>
<th>C24-Engine-Renewed</th>
<th>Result</th>
</tr>
</thead>
<tbody>
<tr>
<td>Header layout</td>
<td>16 bytes: <code>numbytes</code>, sum, send counter, ack counter, retry, command, count</td>
<td>The same offsets: length at 0, counter at 4, ack counter at 8, command at 14, count at 15, the rest zero (<code>motore.py:516-545</code>, <code>:930-960</code>)</td>
<td>Agrees</td>
</tr>
<tr>
<td>Minimum frame</td>
<td>Padded to a 46-byte payload</td>
<td><code>bytearray(max(46, length))</code> (<code>motore.py:520</code>, <code>:538</code>)</td>
<td>Agrees</td>
</tr>
<tr>
<td>Command codes</td>
<td><code>00</code> data, <code>a0</code> ACK, <code>e2</code> wake, <code>e3</code> disconnect, <code>e0</code>/<code>e1</code> announce</td>
<td><code>00</code>, <code>a0</code>, <code>e2</code>, <code>e3</code>; the announce is told apart by its length 0x32 (<code>motore.py:930-960</code>, <code>:1069-1079</code>, <code>:1191-1198</code>)</td>
<td>Agrees</td>
</tr>
<tr>
<td>Header sum</td>
<td>Body sum by default, zero selectable</td>
<td>Always zero, and the desk works (<code>motore.py:516-545</code>)</td>
<td>Agrees that zero is accepted. Whether the desk checks a non-zero sum (R3) stays open</td>
</tr>
<tr>
<td>Send counter</td>
<td>Advanced by the number of commands in a data frame; ACK, <code>e2</code> and <code>e3</code> do not advance it (as ReaControl does)</td>
<td>Advanced by one for every frame, ACKs and pings included (<code>motore.py:516-545</code>, <code>:940-960</code>)</td>
<td>The desk works with both, so it does not check the step (A8)</td>
</tr>
<tr>
<td>ACK</td>
<td>Every desk data frame is ACKed at once, with the desk's send counter in the ack counter</td>
<td>The same, for every desk frame other than an announce (<code>motore.py:1200-1201</code>, <code>:940-948</code>)</td>
<td>Agrees</td>
</tr>
<tr>
<td>Command count</td>
<td>A fader move <code>B0 tt MSB (20+tt) LSB</code> counts one; a frame's count is its commands</td>
<td>A fader move is sent with count 1, a batch with the number of its messages (<code>motore.py:585-590</code>, <code>:531-545</code>). Its calculator sends single messages with count 0x23 (<code>Calculator24/Calculator24.py:112</code>, <code>:155</code>)</td>
<td>Agrees (A7): the desk's own frames count one per move, 2 and 5 in batched frames. The desk seems not to check the count against the body</td>
</tr>
<tr>
<td>Frames in flight</td>
<td>One host data frame in flight, retransmitted with the retry field after 100 ms</td>
<td>No wait for ACKs, no retransmission, the retry field never set or read (<code>motore.py:516-550</code>)</td>
<td>No conflict: the desk takes more than one frame in flight (R8)</td>
</tr>
<tr>
<td>Frame size</td>
<td>At most 48 commands and 314 bytes</td>
<td>Up to 51 commands and 461 bytes (<code>motore.py:962-984</code>), and 100 commands (<code>:1036-1067</code>)</td>
<td>No conflict: the library's limits are inside what the desk takes (R8)</td>
</tr>
<tr>
<td>Display pacing</td>
<td>2 ms between frames that carry display writes</td>
<td>2 ms after each display batch (<code>motore.py:546-550</code>)</td>
<td>Agrees</td>
</tr>
<tr>
<td>Keepalive</td>
<td>Body <code>00</code>, count 1, every 10 s on its own clock</td>
<td>An empty data frame, count 0, every 1 s (<code>motore.py:951-960</code>, <code>:1023-1034</code>); every 2.5 s in the calculator (<code>Calculator24/Calculator24.py:78-81</code>)</td>
<td>Both forms work. The desk's own timeout (R5) stays open</td>
</tr>
<tr>
<td>Offline detection</td>
<td>25 s with no frame from the desk</td>
<td>4 s, with its 1 s pings keeping the desk talking (<code>motore.py:404</code>, <code>:1028-1033</code>)</td>
<td>No conflict: each interval is longer than that host's keepalive</td>
</tr>
<tr>
<td>Wake</td>
<td>One <code>e2</code>, 3 s for its <code>a0</code>, then 10 s for an <code>e1</code> naming this host, the announce period being up to 9.4 s</td>
<td><code>e2</code> five times 5 ms apart, then 200 ms, then drive the desk (<code>motore.py:1172-1189</code>)</td>
<td>No conflict</td>
</tr>
<tr>
<td>Announce</td>
<td>Version from body byte 15, name from byte 24, 9 bytes each (ReaControl's layout)</td>
<td>Version from byte 14 (10 bytes, cut at the first NUL), name from byte 24 (8 bytes) (<code>motore.py:1191-1198</code>)</td>
<td>The name agrees. Byte 14 is the <code>v</code> of <code>v1.08</code> in every Control</td>
</tr>
<tr>
<td>Host MAC in <code>e1</code></td>
<td>Searched for in the leading bytes (A6)</td>
<td>Not read</td>
<td>Measured at body offset 0 on a Control|24 (A6)</td>
</tr>
<tr>
<td>Running status</td>
<td>Expanded; a data byte with no status in force is reported and skipped</td>
<td>Expanded; such a byte is skipped (<code>motore.py:1100-1137</code>)</td>
<td>Agrees</td>
</tr>
<tr>
<td>Fader</td>
<td>10-bit position, MSB = v&gt;&gt;3, LSB = (v&amp;7)&lt;&lt;4</td>
<td>14-bit, MSB = v&gt;&gt;7, LSB = v&amp;0x7F, both ways (<code>motore.py:585-590</code>, <code>:1345-1372</code>)</td>
<td>Agrees: the same bytes, with the low 4 bits used</td>
</tr>
<tr>
<td>Touch</td>
<td><code>90 09 (40|tt)</code> touched, <code>90 09 tt</code> released</td>
<td>The same (<code>motore.py:1249-1259</code>)</td>
<td>Agrees</td>
</tr>
<tr>
<td>V-Pot and jog</td>
<td><code>B0 (40|tt) dd</code> and <code>B0 5C dd</code>, three bytes, delta = dd − 64</td>
<td>The same (<code>motore.py:1374-1391</code>); the jog is handed on with its sign inverted relative to the V-Pots</td>
<td>Agrees on the bytes. Which way of turning is dd &gt; 64 stays open (M1)</td>
</tr>
<tr>
<td>Ring LEDs</td>
<td>LED 1 = bit 6 of the address byte; <code>b1</code> bits 6..0 = LEDs 2..8; <code>b2</code> bits 6..0 = LEDs 9..15</td>
<td>The same (<code>motore.py:633-643</code>)</td>
<td>Agrees (A1)</td>
</tr>
<tr>
<td>Meter bits</td>
<td>n segments = the n lowest of 14 bits; <code>hi</code> = mask&gt;&gt;7, <code>lo</code> = mask&amp;0x7F</td>
<td>The same, at most 14 bits (<code>motore.py:913-926</code>; <code>Camilla24/camilla_engine.py:92</code>)</td>
<td>Agrees (A2). The number of LEDs (R7) stays open</td>
</tr>
<tr>
<td>Seven-segment bits</td>
<td>Was bit 0 = a ... bit 6 = g</td>
<td>Bit 6 = a ... bit 0 = g: <code>0</code> = 0x7E, <code>1</code> = 0x30, <code>-</code> = 0x01, <code>E</code> = 0x4F (<code>motore.py:616-619</code>; <code>Calculator24/Calculator24.py:27-31</code>)</td>
<td><strong>Contradicted; fixed.</strong> <code>diginet_seg7</code> now gives bit 6 = a (A3)</td>
</tr>
<tr>
<td>Counter digit order</td>
<td>Rightmost digit first on the wire</td>
<td>The same (<code>motore.py:621-631</code>; <code>HUI-OS/HUI_OS.py:612-626</code>; <code>Calculator24/Calculator24.py:99-112</code>)</td>
<td>Agrees (A4)</td>
</tr>
<tr>
<td>Counter dots</td>
<td>Was bit k = the k-th digit on the wire, the leftmost dot refused</td>
<td>Bit k = the k-th digit from the left, the rightmost digit with no bit: &quot;12.5&quot; is dots 0x40 (<code>Calculator24/Calculator24.py:83-93</code>; <code>HUI-OS/HUI_OS.py:612-621</code>; <code>motore.py:621-626</code>)</td>
<td><strong>Contradicted; fixed.</strong> <code>DIGINET_COUNTER_DOT(d)</code> is now bit d, and a dot on the rightmost digit is refused (A5)</td>
</tr>
<tr>
<td>Automation LEDs</td>
<td>write 0x40, touch 0x20, latch 0x10, trim 0x08, read 0x04</td>
<td>The same values in use (<code>motore.py:777-779</code>); the docstring at <code>:438-440</code> still has touch and trim swapped, as its code comment explains</td>
<td>Agrees</td>
</tr>
<tr>
<td>Counter-mode LEDs</td>
<td><code>F0 13 01 20 19 bits F7</code>, bits passed through</td>
<td>timecode 0x20, feet+frames 0x10, bars|beats 0x08, min:sec 0x40 (<code>motore.py:339-343</code>, <code>:449-470</code>)</td>
<td>Agrees; the values are now in &quot;Buttons and LEDs&quot;</td>
</tr>
<tr>
<td>Scribble strips</td>
<td>4 characters at any address the caller names</td>
<td>Names at <code>0x20+n</code>, the centre displays at <code>0x1D</code>/<code>0x1E</code> (<code>motore.py:558-564</code>, <code>:962-978</code>)</td>
<td>Agrees. What <code>0x00+n</code> is beside <code>0x20+n</code> (R6) stays open</td>
</tr>
<tr>
<td><code>0x70</code> family</td>
<td>Refused by the encoder, the body check and the frame builder</td>
<td>Writes the desk's name with <code>F0 13 01 70 00 6E &lt;8 chars&gt; F7</code>, taken from a Pro Tools capture (<code>motore.py:566-573</code>)</td>
<td>Agrees that the family writes the desk's memory</td>
</tr>
</tbody>
</table>
<h2 id="assumptions">Assumptions</h2>
<p>Each point below is a choice libdiginet makes in one constant or one function, so a capture
that contradicts it is a one-line change. Where C24-Engine-Renewed decides the point, the
library follows it; a capture on our own unit is still the last word.</p>
<table>
<thead>
<tr>
<th>#</th>
<th>Point</th>
<th>What the library does</th>
<th>Evidence</th>
<th>Still to check on the desk</th>
</tr>
</thead>
<tbody>
<tr>
<td>A1</td>
<td>Ring LED order inside <code>b1</code>/<code>b2</code></td>
<td>Bit 6 = LED 2 ... bit 0 = LED 8 in <code>b1</code>; bit 6 = LED 9 ... bit 0 = LED 15 in <code>b2</code></td>
<td>C24-Engine-Renewed (<code>motore.py:633-643</code>)</td>
<td>Light LED 2 alone on strip 1 **Measured 2026-10-29 (Control</td>
</tr>
<tr>
<td>A2</td>
<td>Meter bit order</td>
<td>Bit 0 of <code>lo</code> is the bottom segment; n segments lit = the n lowest bits of the 14</td>
<td>C24-Engine-Renewed (<code>motore.py:913-926</code>)</td>
<td>R7 **Measured 2026-10-29 (Control</td>
</tr>
<tr>
<td>A3</td>
<td>Seven-segment bits</td>
<td>Bit 6 = a, 5 = b, 4 = c, 3 = d, 2 = e, 1 = f, 0 = g</td>
<td>C24-Engine-Renewed (<code>motore.py:616-619</code>; <code>Calculator24/Calculator24.py:27-31</code>)</td>
<td>Write <code>8</code> with one bit cleared at a time</td>
</tr>
<tr>
<td>A4</td>
<td>Counter digit order</td>
<td>The API takes the digits left to right as shown; the wire carries them right to left (<code>d8 … d1</code>)</td>
<td>C24-Engine-Renewed (<code>motore.py:621-631</code>; <code>Calculator24/Calculator24.py:99-112</code>)</td>
<td>Write <code>12345678</code> **Measured 2026-10-29 (Control</td>
</tr>
<tr>
<td>A5</td>
<td>Counter dots</td>
<td>Bit k lights the dot after the k-th digit from the left (k = 0 the leftmost). A data byte holds 7 bits, so the rightmost digit has no dot and a dot there is refused</td>
<td>C24-Engine-Renewed (<code>Calculator24/Calculator24.py:83-93</code>; <code>HUI-OS/HUI_OS.py:612-621</code>)</td>
<td>Write <code>12.5</code>, then each dot bit alone **Measured 2026-10-29 (Control</td>
</tr>
<tr>
<td>A6</td>
<td>Host MAC in the <code>e1</code> body</td>
<td>Searched for anywhere in the 15 unknown leading bytes; the probe prints the offset where it was found</td>
<td>None: no source reads it</td>
<td>M1 **Measured 2026-10-29 (Control</td>
</tr>
<tr>
<td>A7</td>
<td><code>numcommands</code></td>
<td>Counts commands as the encoders make them: a fader move (<code>B0 tt MSB (20+tt) LSB</code>) is one command</td>
<td>ReaControl24 and C24-Engine-Renewed send it so (<code>motore.py:585-590</code>); the desk also accepts a count that does not match (<code>Calculator24/Calculator24.py:112</code>)</td>
<td>M1 logs of desk frames: what the desk puts there **Measured (Control</td>
</tr>
<tr>
<td>A8</td>
<td>Counter sequence</td>
<td>A data frame carries the sender's counter after adding its own commands; ACK, <code>e2</code> and <code>e3</code> carry it unchanged; an ACK echoes the peer's counter</td>
<td>ReaControl24 steps by commands, C24-Engine-Renewed by frames, and the desk works with both, so the step is not checked</td>
<td>M1: whether the desk's ACK echoes our counter exactly, which the transport matches on **Measured 2026-10-29 (Control</td>
</tr>
</tbody>
</table>
<h2 id="open-questions-and-how-to-settle-them-on-a-unit">Open questions and how to settle them on a unit</h2>
<table>
<thead>
<tr>
<th>#</th>
<th>Unknown</th>
<th>Resolve by</th>
</tr>
</thead>
<tbody>
<tr>
<td>R1</td>
<td>Which desk it is. The **Control</td>
<td>24** (2001, 10BASE-T, Focusrite preamps) or the **C</td>
</tr>
<tr>
<td>R2</td>
<td>Link speed and duplex. A modern NIC may not negotiate 10/half</td>
<td>M0: <code>/sys/class/net/*/speed,duplex</code>; if bad, use a cheap 10/100 unmanaged switch. Keep it off the REAC interfaces</td>
</tr>
<tr>
<td>R3</td>
<td>Checksum: does the C24 verify host→desk? (Neyrinck mentions &quot;CRC&quot;)</td>
<td>M1: send the sum, and if no ACK, retry with zero. Also check that desk frames in the M0 pcap match sum16</td>
</tr>
<tr>
<td>R4</td>
<td>Does the motor fight a touched cap? Does it go back to its set-point on release?</td>
<td>M1 extension: command 25 %, grab the cap, move it, release, with no echo. Feel and film. Then repeat with an echo on release **Measured 2026-10-29 (Control</td>
</tr>
<tr>
<td>R5</td>
<td>Keepalive and offline timeout. Hosts that work send one every 1 s (C24-Engine-Renewed) or 10 s with the fix above (procontrol-linux)</td>
<td>M1: stretch the keepalive interval 10 → 20 → 40 s and watch <code>e1</code>→<code>e0</code> and the &quot;Offline&quot; display **Measured 2026-10-29 (Control</td>
</tr>
<tr>
<td>R6</td>
<td>Scribble <code>0x00+n</code> versus <code>0x20+n</code>: layers, rows or aliases; the glyph set beyond ASCII</td>
<td>M1: write different text to both, then sweep bytes 0x00–0x7F onto one strip **Measured 2026-10-29 (Control</td>
</tr>
<tr>
<td>R7</td>
<td>Meter segment count (the mask holds 14), and whether a lit meter decays on its own</td>
<td>Send each bitmask step to strip 1 and count the LEDs; hold a value for 10 s **Measured 2026-10-29 (Control</td>
</tr>
<tr>
<td>R8</td>
<td>ACK window and frame size. C24-Engine-Renewed sends without waiting for ACKs and up to 461-byte bodies, so a burst is accepted; whether the desk retries or drops frames under such a burst is not known</td>
<td>Load test in the probe: N commands per frame, measure retries and display garbling **Measured 2026-10-29 (Control</td>
</tr>
<tr>
<td>R9</td>
<td>Running status and multi-command frames from the desk</td>
<td>The M1 logs; the parser handles both **Measured (Control</td>
</tr>
<tr>
<td>R10</td>
<td>Gaps in the button map, and which keys light</td>
<td>Press every key during M1 (decode log); walk LEDs over zones 0x18–0x1D (Davitekk's LED-finder approach, reimplemented) **Measured 2026-10-29 (Control</td>
</tr>
<tr>
<td>R11</td>
<td>Does Pro Tools do anything we skip (the &quot;cryptography&quot; in Neyrinck's note)?</td>
<td><strong>Optional:</strong> capture ReaControl24 driving the desk once, on a separate test machine, never a production one. That is the only way to see a known-working host conversation; Pro Tools on any machine would be even better</td>
</tr>
<tr>
<td>R12</td>
<td>Analogue section: which buttons reach the preamps, and whether they are safe</td>
<td>A physical check on the unit; never inferred from LEDs</td>
</tr>
<tr>
<td>R13</td>
<td>Two hosts on one desk (a shadow console, or a second daemon)</td>
<td>One daemon owning each desk, plus the transport refusing to send <code>e2</code> when it sees a foreign <code>e1</code></td>
</tr>
<tr>
<td>R14</td>
<td>The daemon binary loses <code>cap_net_raw</code> on reinstall (<code>install</code> does not keep file capabilities)</td>
<td><code>getcap</code> check in <code>ExecStartPre</code>; <code>%caps</code> in the RPM. <strong>The packages (#35):</strong> <code>diginet-probe</code> and <code>diginet-packet-helper</code> carry <code>%caps(cap_net_raw=ep)</code> in the RPM and get <code>setcap</code> in the Debian postinst, and <code>tests/package-check.sh</code> asks <code>getcap</code> for both after a clean install. A host that should hold no capability takes its socket from <code>diginet-packet-helper</code> instead (<code>diginet_packet_open_by_helper()</code>, &quot;One socket, every interface&quot; above)</td>
</tr>
<tr>
<td>R15</td>
<td>What a desk keeps across sessions</td>
<td><strong>Measured 2026-10-29:</strong> a new session (e2 taken) blanks every scribble, LED, ring, meter and the counter; an e3 leaves all of it shown under &quot;Offline&quot;; faders stay where they are either way. A host repaints everything each time the session comes online, faders included</td>
</tr>
<tr>
<td>R16</td>
<td>Motor faders on an old desk</td>
<td><strong>Measured 2026-10-29:</strong> on one unit, most motors climbed when the desk was cold and up to nine stopped climbing (still pulling down) after an hour on, while every position sensor and touch read true; one fader's sensor jumped (13 -&gt; 1023 within 30 ms) and its motor hunted at full speed. The hardware wants its tracks cleaned and its motor supply checked; a host treats every fader the same</td>
</tr>
</tbody>
</table>
`},{slug:`probe`,src:`docs/probe.md`,title:`diginet-probe: the first test on a real desk`,source:`https://github.com/FreeMixer/libdiginet/blob/084e09f8eaea72a275f583b8ae148b565aa6a548/docs/probe.md`,toc:[{id:`before-the-probe-a-passive-capture-m0`,title:`Before the probe: a passive capture (M0)`},{id:`running-it-m1`,title:`Running it (M1)`},{id:`every-interface-with-no-capability-any`,title:"Every interface, with no capability (`--any`)"}],html:`<h1 id="diginet-probe-the-first-test-on-a-real-desk">diginet-probe: the first test on a real desk</h1>
<p><code>diginet-probe</code> wakes a Control|24 or ProControl, drives a few controls, logs everything the
desk sends, and prints what it found. It is built on libdiginet and its transport and needs
one capability, <code>cap_net_raw</code>, to open the packet socket. Nothing else on the machine is
involved: no mixer, no DAW.</p>
<h2 id="before-the-probe-a-passive-capture-m0">Before the probe: a passive capture (M0)</h2>
<p>Cable the desk to a NIC of its own (directly, or through a 10/100 switch; never a network
that carries anything else), power it on, and record two minutes without sending anything:</p>
<pre><code>cat /sys/class/net/&lt;if&gt;/speed /sys/class/net/&lt;if&gt;/duplex
sudo tcpdump -i &lt;if&gt; -w c24-boot.pcap 'ether proto 0x885f'
</code></pre>
<p>Expected: <code>e0</code> frames from <code>00:a0:7e:…</code>, length 50, the name <code>CNTRL|24</code> and a version, about
7 s apart.</p>
<h2 id="running-it-m1">Running it (M1)</h2>
<pre><code>make
sudo setcap cap_net_raw=ep ./tools/diginet-probe
./tools/diginet-probe -i &lt;if&gt;
</code></pre>
<p>Run <code>tcpdump</code> beside it to keep a capture of the whole session. The probe:</p>
<ol>
<li>waits for the desk's <code>e0</code> announce and prints its MAC, name, version and personality;
if the desk is in a session with another host (<code>e1</code> naming another MAC) it stops there;</li>
<li>sends <code>e2</code>;</li>
<li>requires an <code>a0</code> and then an <code>e1</code> naming this host, and prints where the host MAC sits
in the <code>e1</code> body;</li>
<li>keeps the session alive every 10 s (<code>--keepalive</code>);</li>
<li>moves fader 1 to mid-travel (<code>B0 00 40 20 00</code>) and says whether the desk ACKed it;</li>
<li>lights strip 1 MUTE (<code>90 08 40</code>), then turns it off;</li>
<li>writes <code>OMX1</code> to strip 1's scribble at address <code>0x00</code>, asks what the desk shows (type a
word and Enter), then writes it at <code>0x20</code> and asks again;</li>
<li>logs and decodes every command from the desk for 60 s (<code>--listen</code>): press keys, touch
and move fader 1, turn V-Pot 1 and the jog wheel;</li>
<li>sends <code>e3</code> on exit (also on Ctrl-C).</li>
</ol>
<p>It ends with a summary, one line per open question it can answer.</p>
<table>
<thead>
<tr>
<th>Option</th>
<th>What it is for</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>-i &lt;if&gt;</code></td>
<td>The interface the desk is cabled to</td>
</tr>
<tr>
<td><code>--checksum zero|sum</code></td>
<td>The header sum of our frames (R3). <code>sum</code> is the default; if the fader frame is not ACKed, run again with <code>zero</code></td>
</tr>
<tr>
<td><code>--keepalive &lt;s&gt;</code></td>
<td>The keepalive interval (R5). Stretch it 10 → 20 → 40 and watch for the desk falling back to <code>e0</code></td>
</tr>
<tr>
<td><code>--touch-test</code></td>
<td>R4: commands fader 1 to 25 %, then asks you to grab the cap, move it, and let go; it sends no echo and reports what the fader did while held and after release</td>
</tr>
<tr>
<td><code>--listen &lt;s&gt;</code></td>
<td>How long step 8 lasts (60 s)</td>
</tr>
<tr>
<td><code>--desk &lt;mac&gt;</code></td>
<td>Talk only to this desk</td>
</tr>
<tr>
<td><code>--fd &lt;n&gt; --mac &lt;mac&gt;</code></td>
<td>Use an already open descriptor instead of <code>-i</code> (a launcher that holds the capability, or the test suite)</td>
</tr>
<tr>
<td><code>--any</code></td>
<td>Every interface at once, in place of <code>-i</code>: one socket bound to no interface, the steps run with the first desk that appears (or <code>--desk</code>), from the MAC of its interface. Every desk that appears or goes is logged with its interface. Without <code>cap_net_raw</code> the socket comes from <code>diginet-packet-helper</code></td>
</tr>
<tr>
<td><code>--helper &lt;path&gt;</code></td>
<td>With <code>--any</code>, always take the socket from this helper</td>
</tr>
</tbody>
</table>
<p>Exit status: 0 when every step was acknowledged; 2 for a usage error; 3 when the desk is in
another host's session; 4 when no desk answered; 5 when the desk did not ACK our data.</p>
<p><code>setcap</code> has to be repeated after every rebuild: a new binary carries no capability.</p>
<h2 id="every-interface-with-no-capability-any">Every interface, with no capability (<code>--any</code>)</h2>
<p><code>diginet-probe --any</code> needs no interface name. It opens one packet socket bound to no
interface, so it hears a desk on any NIC, a NIC plugged in after it started included, and talks
to the desk from the MAC of the interface the desk appeared on. Where the probe holds no
<code>cap_net_raw</code>, the socket comes from <code>diginet-packet-helper</code> (installed with that capability by
the packages, or <code>sudo setcap cap_net_raw=ep ./tools/diginet-packet-helper</code> in the tree), and
the probe says so:</p>
<pre><code>./tools/diginet-probe --any --helper ./tools/diginet-packet-helper --listen 60
</code></pre>
<p>It logs <code>desk &lt;mac&gt; appeared on &lt;if&gt;</code> for every desk it hears and <code>desk &lt;mac&gt; gone from &lt;if&gt;</code>
when one falls silent for 30 s, and ends with <code>SUMMARY any interface: desks appeared on ...</code>.
To see that an interface added later is heard: start the probe with the desk unplugged, plug
in the USB NIC, then cable the desk to it; the desk appears on the new interface.</p>
<p>Which interface the desk is on is the probe's to report, not to choose: the socket hears
EtherType 0x885F on every interface, a REAC link included.</p>
`}],r={repo:e,commit:t,pages:n};export{t as commit,r as default,n as pages,e as repo};