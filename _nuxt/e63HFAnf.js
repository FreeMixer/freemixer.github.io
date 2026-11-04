var e=`libsurface`,t=`a1f337eaafad7faa65f2331027ef2f6aea44d556`,n=[{slug:``,src:`README.md`,title:`libsurface`,source:`https://github.com/FreeMixer/libsurface/blob/a1f337eaafad7faa65f2331027ef2f6aea44d556/README.md`,toc:[{id:`what-it-does`,title:`What it does`},{id:`the-mackie-module`,title:`The Mackie module`},{id:`the-diginet-module`,title:`The DigiNet module`},{id:`the-api`,title:`The API`},{id:`building`,title:`Building`},{id:`licence`,title:`Licence`}],html:`<h1 id="libsurface">libsurface</h1>
<p>The device behaviour of a motorised control surface, written once in C for every surface and every host: the motor-fader policy, touch, the bank window, a shadow of the whole board and its replay, meter steps and LED ring rendering. A Behringer X-Touch, a Digidesign Control|24 and, later, a ProControl run on the same code; a mixer or DAW links it and keeps only its mixing semantics (what a strip shows, names, colours, its verbs).</p>
<p>The design is <a href="https://github.com/FreeMixer/libdiginet/issues/29">FreeMixer/libdiginet#29</a>. This repository holds the core and its optional modules, one per device family, each its own library and package so a host installs only what it uses:</p>
<table>
<thead>
<tr>
<th>Module</th>
<th>Library</th>
<th>Packages</th>
<th>Needs</th>
</tr>
</thead>
<tbody>
<tr>
<td>core</td>
<td><code>libsurface</code></td>
<td><code>libsurface</code>, <code>libsurface-devel</code> (deb: <code>libsurface0</code>, <code>libsurface-dev</code>)</td>
<td>libc, libm</td>
</tr>
<tr>
<td>Mackie Control: the X-Touch</td>
<td><code>libsurface-mackie</code></td>
<td><code>libsurface-mackie</code>, <code>libsurface-mackie-devel</code> (deb: <code>libsurface-mackie0</code>, <code>libsurface-mackie-dev</code>)</td>
<td><a href="https://github.com/FreeMixer/libmackie">libmackie</a> 0.1.0 or later</td>
</tr>
<tr>
<td>DigiNet: the Control|24</td>
<td><code>libsurface-diginet</code></td>
<td><code>libsurface-diginet</code>, <code>libsurface-diginet-devel</code>, <code>surface-c24</code> (deb: <code>libsurface-diginet0</code>, <code>libsurface-diginet-dev</code>, <code>surface-c24</code>)</td>
<td><a href="https://github.com/FreeMixer/libdiginet">libdiginet</a> 0.1.4 or later</td>
</tr>
</tbody>
</table>
<p>The protocol libraries stay independent and never depend on libsurface. The Python binding comes in a later phase.</p>
<h2 id="what-it-does">What it does</h2>
<ul>
<li><strong>Motor faders that never fight the hand.</strong> A fader has a touch flag and a target; the motor tracks the target only while untouched, and on release the cap is written once, to where the hand left it. An implicit-touch window holds the motor off while reports say a hand moves the cap even when the touch sensor drops out. The surface's own moves are awaited until the host echoes them, so a lagging burst of echoes never walks the cap back through the gesture, and a burst of served frames costs one leading and one trailing write.</li>
<li><strong>Touch</strong> with a self-heal for a release lost on the wire (a surface that repeats its touch message while held), and a release debounce for a sensor that chatters (the Control|24's drops out for 30-240 ms during a move).</li>
<li><strong>The Control|24's set-point.</strong> Its motor holds a set-point of its own and drives back to it when the cap is let go, and the desk never reports its own moves; so while a hand is on the cap each reported position is written back as the set-point, and once more at the release.</li>
<li><strong>Bank window</strong> over the host's ordered list of targets: bank and channel steps, show, jump.</li>
<li><strong>Board shadow and replay.</strong> The latest value of every element (LEDs, rings, scribbles, counter, colours, fader targets) is kept; a device that comes back blank gets the whole board again without asking the host.</li>
<li><strong>Meter steps</strong> with hysteresis, sent only on a change, with a keep-alive for a surface that decays a lit meter by itself.</li>
</ul>
<p>What it is not: it speaks no wire, owns no socket, thread or clock, and knows no channel or verb. Each call that needs time takes the caller's <code>now_us</code>; <code>surface_deadline()</code> and <code>surface_tick()</code> run the timers. It allocates once, in <code>surface_create()</code>.</p>
<h2 id="the-mackie-module">The Mackie module</h2>
<p><code>libsurface-mackie</code> (<a href="https://github.com/FreeMixer/libsurface/blob/a1f337eaafad7faa65f2331027ef2f6aea44d556/include/surface/surface_mackie.h"><code>include/surface/surface_mackie.h</code></a>, <code>src/mackie/</code>) drives a Mackie Control surface such as the Behringer X-Touch, with libmackie as its codec:</p>
<ul>
<li><strong>The transport is the host's.</strong> Every message the module writes goes to the host's write callback as one complete MIDI message, and the host hands over each message it receives. The module owns no port, thread or clock.</li>
<li><strong>The map is the host's.</strong> The control map is a <code>struct mackie_map</code> filled from the host's own surface profile, checked whole at open.</li>
<li><strong>The device's own rings.</strong> An MCU device draws a ring from mode, position and centre: <code>surface_ring_code()</code> keeps that code in the shadow and replays it as it is; a ring the core rendered comes back to the nearest code.</li>
<li><strong>The handshake.</strong> The device's connection query is answered and brings the surface online, which replays the board and the assignment display.</li>
</ul>
<h2 id="the-diginet-module">The DigiNet module</h2>
<p><code>libsurface-diginet</code> (<a href="https://github.com/FreeMixer/libsurface/blob/a1f337eaafad7faa65f2331027ef2f6aea44d556/include/surface/surface_diginet.h"><code>include/surface/surface_diginet.h</code></a>, <code>src/diginet/</code>) drives a Digidesign Control|24 over libdiginet's desk mux:</p>
<ul>
<li><strong>One listener for every desk.</strong> One packet socket hears every interface (libdiginet's <code>diginet_packet_open_any</code>, or the descriptor <code>diginet-packet-helper</code> hands over); each desk that announces is reported to the host with its MAC, interface, name and version, and the host attaches the ones it wants.</li>
<li><strong>One surface per desk,</strong> with the Control|24 geometry: 24 strips, 10-bit faders, 14-segment meters on two sides, 15-LED rings, 4-character scribbles, an 8-digit counter, the touch-release debounce and the set-point echo.</li>
<li><strong>The board on every session.</strong> A new session blanks the desk; every ONLINE replays everything the host wrote, faders included. A desk that drops off and comes back, or a host that restarts, is repainted without the host asking.</li>
<li><strong>The wire both ways.</strong> Writes go through libdiginet's encoders into the session queue, where a newer write to an address replaces a queued one; faders, touches, keys, V-Pots and the jog come up as events.</li>
<li><strong>Warnings.</strong> A desk that announces but answers no wake (booted on a noisy link) and a desk in session with another host are raised as warnings.</li>
</ul>
<pre><code class="language-c">int fd = diginet_packet_open_by_helper(NULL);              /* the socket, from the helper */
struct surface_diginet *d;
surface_diginet_open(&amp;d, fd, on_desk, host);               /* on_desk(host, info, present) */
/* in on_desk, for a desk the host wants: */
struct surface *s;
surface_diginet_attach(d, info-&gt;mac, on_event, host, &amp;s);  /* then the API below on s */
/* the loop: poll surface_diginet_fd(d) until surface_diginet_deadline(d, now), then */
surface_diginet_service(d, now_us);
</code></pre>
<p><code>surface-c24 [--helper PATH] [--fifo PATH]</code> drives a desk through the whole stack with no privilege of its own: its socket comes from <code>diginet-packet-helper</code>. It attaches the first Control|24 that announces, labels its strips F1..F24, plays the console (each move served back), mirrors each fader on its own meter, and prints every event. The FIFO takes <code>scrib S TEXT</code>, <code>led NAME:S|KEY on|off</code>, <code>fader S 0..1</code>, <code>ring S MASK</code> and <code>quit</code>, strips counted from 1; <code>quit</code> leaves <code>OFF </code> on the scribbles, which the desk keeps under &quot;Offline&quot;.</p>
<h2 id="the-api">The API</h2>
<p>Everything is in <a href="https://github.com/FreeMixer/libsurface/blob/a1f337eaafad7faa65f2331027ef2f6aea44d556/include/surface/surface.h"><code>include/surface/surface.h</code></a>.</p>
<pre><code class="language-c">#include &lt;surface/surface.h&gt;

struct surface_config c = { .ops = &amp;my_backend_ops, .backend = dev, .event = on_event, .event_ctx = host };
surface_geometry_preset(SURFACE_MODEL_CONTROL24, &amp;c.geometry);
struct surface *s;
surface_create(&amp;s, &amp;c);

surface_bank_set(s, targets, n);                 /* what the strips show: opaque ids of the host's */
surface_in_online(s, now_us);                    /* the backend: the device is ready; the board replays */

surface_fader_served(s, target, 0.75, now_us);   /* the host's truth -&gt; the motor, by the policy */
surface_fader_served_at(s, target, 0.75, sent_us, now_us);   /* the same, with when the host sent it */
surface_scribble(s, 0, 0, &quot;KICK&quot;);
surface_meter(s, 0, 0, fill, now_us);

surface_in_fader(s, strip, raw, now_us);         /* the backend's decoded input ... */
/* ... comes up as SURFACE_EV_FADER_MOVED / _TOUCHED / _RELEASED, _KEY, _VPOT, _JOG, _WARNING */

uint64_t when = surface_deadline(s, now_us);     /* sleep until then, or until input */
surface_tick(s, when);
</code></pre>
<p>Up the seam go events with the strip's target; down go fader targets, LED states by key id, ring values, scribble text, meter fills, counter text and colours. MIDI bytes, DigiNet frames, channel ids and verb names never cross it.</p>
<h2 id="building">Building</h2>
<p><code>make</code>, <code>make test</code>, <code>make install</code>. A C11 compiler, <code>make</code> and libm for the core; the DigiNet module is built when libdiginet with the desk mux is found (pkg-config, or <code>make DIGINET_SRC=../libdiginet</code>). See <a href="/projects/libsurface/building">BUILDING.md</a>.</p>
<h2 id="licence">Licence</h2>
<p>GPL-3.0-or-later. See <a href="https://github.com/FreeMixer/libsurface/blob/a1f337eaafad7faa65f2331027ef2f6aea44d556/LICENSE">LICENSE</a>.</p>
`},{slug:`building`,src:`BUILDING.md`,title:`Building libsurface`,source:`https://github.com/FreeMixer/libsurface/blob/a1f337eaafad7faa65f2331027ef2f6aea44d556/BUILDING.md`,toc:[{id:`tests`,title:`Tests`},{id:`the-diginet-module`,title:`The DigiNet module`},{id:`the-mackie-module`,title:`The Mackie module`}],html:`<h1 id="building-libsurface">Building libsurface</h1>
<p>A hand-kept Makefile, no build system to configure. You need a C11 compiler and <code>make</code>.
Nothing else: no library outside libc and libm.</p>
<pre><code>make                          # libsurface.a
make test                     # the unit suite, the same command CI runs
make shared                   # libsurface.so, as the packages build it
make install PREFIX=/usr/local [DESTDIR=...]
make clean
</code></pre>
<p>The code is plain C11 built with <code>-Wall -Wextra -Werror</code>, so a warning is a build failure.
<code>CC</code> and <code>CFLAGS</code> can be overridden on the command line; the warning flags are kept even then.</p>
<p><code>make install</code> copies the header to <code>$(PREFIX)/include/surface/</code>, the archive to
<code>$(PREFIX)/lib</code> (<code>LIBDIR=</code> to change it) and a pkg-config file, so a consumer builds with:</p>
<pre><code>cc app.c $(pkg-config --cflags --libs libsurface)
</code></pre>
<p>(<code>--static</code> adds libm for a link against the archive.)</p>
<h2 id="tests">Tests</h2>
<p>Every test runs through <code>tests/run-test.sh</code>, which gives it a timeout: a hang is a failure,
never a stalled build. A test that exits 77 proved this machine cannot host it and is reported
as SKIP, never as a pass.</p>
<p>The suites need no device. <code>tests/harness.h</code> is a fake backend that records every write, a
fake host that answers the surface's moves the way a console does (echoing at once, lagging,
or refusing), and a virtual clock that runs the surface's timers in order:</p>
<ul>
<li><code>test_motor</code>: the motor policy, case by case as the X-Touch driver's suite proved it;</li>
<li><code>test_audit</code>: the motor-law audit of 2026-09-25 and the fast-throw round trip;</li>
<li><code>test_bank</code>: the bank window;</li>
<li><code>test_meter</code>: meter ballistics, ring rendering, and the step law against
<code>tests/golden/meter-steps.txt</code>, vectors generated once from the TypeScript law and fixed;</li>
<li><code>test_c24</code>: the Control|24's rules: release debounce, set-point echo, the replay on every
session.</li>
</ul>
<p>The script checks: <code>constants-check.sh</code> (each timing constant declared once, in the header),
<code>conformance-packaging.sh</code> (the version and soname agree in every packaging copy),
<code>test_install.sh</code> (a consumer builds against an installed tree through pkg-config alone),
<code>test_workflows.sh</code> (the workflows parse), and <code>public-sources-check.sh</code> with its own test.</p>
<h2 id="the-diginet-module">The DigiNet module</h2>
<p><code>libsurface-diginet</code> and <code>tools/surface-c24</code> need libdiginet with the desk mux
(<code>diginet/transport/diginet_mux.h</code>, libdiginet 0.1.4 and later). <code>DIGINET</code> says what to do:</p>
<pre><code>make                                   # DIGINET=auto: the module when libdiginet is found, else a SKIP line
make DIGINET=yes                       # the module, or a failed build (the packages)
make DIGINET=no                        # the core alone
make DIGINET_SRC=../libdiginet         # libdiginet from a built source tree instead of pkg-config
make DIGINET_SRC=../libdiginet test    # + the module's tests
</code></pre>
<p>A source tree is linked from its archives, into the shared library too: that is for working on
the two together, never for a package. <code>make shared</code> adds <code>libsurface-diginet.so</code> (its own soname,
<code>SURFACE_DIGINET_ABI</code>) and <code>surface-c24</code> linked to it; <code>make install</code> adds the header,
<code>libsurface-diginet.pc</code> and the tool.</p>
<p><code>surface-c24</code>'s default helper is <code>DIGINET_SRC</code>'s <code>tools/diginet-packet-helper</code>, else
<code>diginet-packet-helper</code> in PATH (<code>SURFACE_C24_HELPER=</code> builds it to look in PATH always, as the
packages do; <code>--helper PATH</code> overrides either at run time). The helper needs
<code>setcap cap_net_raw+ep</code> (libdiginet's <code>docs/diginet-packet-helper.1</code>).</p>
<p>The module's tests, in <code>tests/diginet/</code>, run after the core's:</p>
<ul>
<li><code>test_diginet</code>: the module against libdiginet's desk emulator, in process, on a virtual clock:
the board replayed on every ONLINE; each report of a touched cap echoed as its set-point, and
once more at the release with no snap; a host move on an untouched cap and never on a touched
one; the inputs; a deaf desk and a foreign session as warnings; the repaint after a desk
restart and at the first announce after a host restart; a desk that goes and comes back;</li>
<li><code>test_c24_tool</code>: <code>surface-c24</code> itself, unprivileged, its socket from <code>diginet-packet-helper</code>,
against the emulator on a veth pair in a user and network namespace of the test's own. SKIP
with no helper or no such namespace;</li>
<li><code>test_install.sh</code>: the module installed, a consumer built through pkg-config alone;</li>
<li><code>emu-sync-check.sh</code>: libdiginet installs no test code, so its emulator is copied into
<code>tests/diginet/</code> (<code>tests/diginet/SOURCE</code>); this holds the copies to the <code>DIGINET_SRC</code> tree.</li>
</ul>
<h2 id="the-mackie-module">The Mackie module</h2>
<p><code>libsurface-mackie</code> is built when libmackie is found: through pkg-config, or from a built tree with
<code>MACKIE_SRC=../libmackie</code>. <code>MACKIE=auto</code> (the default) builds it when found, <code>MACKIE=yes</code> stops the
build when not, <code>MACKIE=no</code> never builds it. <code>make test</code> runs <code>tests/mackie/test_mackie</code> when it is
built, and says SKIP when it is not.</p>
`}],r={repo:e,commit:t,pages:n};export{t as commit,r as default,n as pages,e as repo};