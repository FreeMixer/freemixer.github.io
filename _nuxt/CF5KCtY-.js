var e=`libmackie`,t=`3f45d99be73faaa3f2b103c300c42748cd719d99`,n=[{slug:``,src:`README.md`,title:`libmackie`,source:`https://github.com/FreeMixer/libmackie/blob/3f45d99be73faaa3f2b103c300c42748cd719d99/README.md`,toc:[{id:`where-it-sits`,title:`Where it sits`},{id:`the-control-map`,title:`The control map`},{id:`provenance`,title:`Provenance`},{id:`licence`,title:`Licence`}],html:`<h1 id="libmackie">libmackie</h1>
<p>A C library for the Mackie Control (MCU) protocol that motorised MIDI control surfaces such as
the Behringer X-Touch speak: encoders and decoders for motor faders, buttons and their lamps,
V-Pots and their LED rings, the jog wheel, meters, scribble strips and their backlights, the
seven-segment displays and the host-connection handshake.</p>
<p>It is a codec and nothing else. Every function is pure, over caller memory: no MIDI port, no
clock, no thread, no allocation. The host already owns a MIDI transport (ALSA sequencer, raw
MIDI, a DAW's own) and carries the bytes; libmackie says what they are.</p>
<h2 id="where-it-sits">Where it sits</h2>
<p>libmackie is the wire layer under a surface behaviour layer (motor policy, touch, banking,
repaint) that is shared by MIDI surfaces and by DigiNet desks such as the Digidesign Control|24
(<a href="https://github.com/FreeMixer/libdiginet">libdiginet</a>). MIDI bytes never cross into that
layer: libmackie encodes and decodes them, and the host carries them. The design is on
<a href="https://github.com/FreeMixer/libdiginet/issues/29">libdiginet#29</a>.</p>
<h2 id="the-control-map">The control map</h2>
<p>Which note, CC or pitch-bend channel each control sits on is the surface's, not the
protocol's. The host fills a <code>struct mackie_map</code> from its own surface profile, the one source
of every address, and every encoder and decoder reads it. libmackie keeps no second table of
addresses beside the profile; <code>mackie_map_check()</code> refuses a map it cannot use, whole.</p>
<h2 id="provenance">Provenance</h2>
<p>The codec is a port of a TypeScript MCU module (the X-Touch adapter's <code>mcu.ts</code>) that drives
X-Touches in production. It is held to that module byte for byte: <code>tools/gen-goldens.mjs</code> ran
every TypeScript encoder and decoder over a set of inputs and wrote what they returned into
<code>tests/golden/mcu_golden.h</code>, and <code>tests/test_golden.c</code> checks every C encoder and decoder
against it. The host-connection handshake is pinned to an exchange captured live on an X-Touch
(firmware V1.22).</p>
<p>Building and testing: <a href="/projects/libmackie/building">BUILDING.md</a>.</p>
<h2 id="licence">Licence</h2>
<p>GPL-3.0-or-later. See <a href="https://github.com/FreeMixer/libmackie/blob/3f45d99be73faaa3f2b103c300c42748cd719d99/LICENSE">LICENSE</a>.</p>
`},{slug:`building`,src:`BUILDING.md`,title:`Building libmackie`,source:`https://github.com/FreeMixer/libmackie/blob/3f45d99be73faaa3f2b103c300c42748cd719d99/BUILDING.md`,toc:[{id:`tests`,title:`Tests`},{id:`the-golden-bytes`,title:`The golden bytes`}],html:`<h1 id="building-libmackie">Building libmackie</h1>
<p>A hand-kept Makefile, no build system to configure. You need a C11 compiler and <code>make</code>.
Nothing else: no library outside libc, not even libm.</p>
<pre><code>make                          # libmackie.a
make shared                   # libmackie.so.&lt;version&gt;, with its soname links
make test                     # the unit suite, the same command CI runs
make install PREFIX=/usr/local [DESTDIR=...]
make clean
</code></pre>
<p>The code is plain C11 built with <code>-Wall -Wextra -Werror</code>, so a warning is a build failure.
<code>CC</code> and <code>CFLAGS</code> can be overridden on the command line; the warning flags are kept even then.</p>
<p><code>make install</code> copies the headers to <code>$(PREFIX)/include/mackie/</code>, the archive to
<code>$(PREFIX)/lib</code> (<code>LIBDIR=</code> to change it) and a pkg-config file, so a consumer builds with:</p>
<pre><code>cc app.c $(pkg-config --cflags --libs libmackie)
</code></pre>
<h2 id="tests">Tests</h2>
<p>Every test runs through <code>tests/run-test.sh</code>, which gives it a timeout: a hang is a failure,
never a stalled build. A test that exits 77 proved this machine cannot host it and is reported
as SKIP, never as a pass.</p>
<ul>
<li><code>test_mcu</code> is the TypeScript MCU suite ported case for case: faders, buttons, V-Pots,
meters, scribble strips, the handshake ground truth and the scribble backlights, with the
refusals a C API adds.</li>
<li><code>test_golden</code> holds every encoder and decoder to <code>tests/golden/mcu_golden.h</code>, the bytes the
TypeScript encoders sent and what the TypeScript decoders read for the same inputs, and
checks that what the encoders send decodes back to what they were given.</li>
<li><code>test_install.sh</code> installs into a scratch root and builds a consumer through pkg-config;
<code>conformance-packaging.sh</code> holds the version and soname copies to one another;
<code>test_workflows.sh</code> parses the CI workflows; <code>public-sources-check.sh</code> and its own test keep
private names out of the tree and the history.</li>
</ul>
<h2 id="the-golden-bytes">The golden bytes</h2>
<p><code>tests/golden/mcu_golden.h</code> is generated, and committed. To compare against a TypeScript MCU
module (compiled to <code>mcu.js</code>, with its dependencies resolvable from where it sits):</p>
<pre><code>node tools/gen-goldens.mjs path/to/mcu.js &gt; tests/golden/mcu_golden.h
git diff tests/golden/mcu_golden.h
</code></pre>
<p>A difference in the header is a change of wire bytes on one side or the other. The generator
draws its sampled inputs from a fixed seed, so the same module writes the same file.</p>
`}],r={repo:e,commit:t,pages:n};export{t as commit,r as default,n as pages,e as repo};