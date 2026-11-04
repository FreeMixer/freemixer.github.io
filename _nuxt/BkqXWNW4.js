var e=`omx-dsp`,t=`f5c279a980a76a9b2ca53df5a9000f9416cb6cc3`,n=[{slug:``,src:`README.md`,title:`omx-dsp`,source:`https://github.com/FreeMixer/omx-dsp/blob/f5c279a980a76a9b2ca53df5a9000f9416cb6cc3/README.md`,toc:[{id:`install`,title:`Install`},{id:`use`,title:`Use`},{id:`licence`,title:`Licence`}],html:`<h1 id="omx-dsp">omx-dsp</h1>
<p>The DSP library of <a href="https://www.openmixer.org">OpenMixer</a>: the building blocks of
the console (biquads, one-poles, envelopes, gain computers, delay rings, the oversampler) and the
effect kernels built from them. The OpenMixer engine and the omx plugins compile the same kernels
from this library, so an effect sounds the same on the console and in any other host.</p>
<ul>
<li>Plain C11 and <code>-lm</code>. No allocation, lock or system call on the audio path; every state is
owned by the caller, so any number of threads can run the kernels on their own states.</li>
<li>Pre- and postconditions on every function, compiled in with <code>-DOMX_CONTRACTS</code> for testing and
absent from a release build.</li>
<li>Every kernel is tested against its closed form at 44.1, 48, 88.2, 96, 176.4 and 192 kHz, and
its output is held bit for bit by golden digests. The dynamics, balance, rotor, limiter and
loudness are also tested at 32, 64 and 128 kHz, the other rates of the oracle set.</li>
<li>Build time only: headers and a static library. Nothing is installed that a running program
loads.</li>
</ul>
<h2 id="install">Install</h2>
<p>Fedora 44, x86_64 or aarch64:</p>
<pre><code>sudo dnf install https://www.openmixer.org/rpm/openmixer-release.noarch.rpm
sudo dnf install omx-dsp-devel
</code></pre>
<p>Debian bookworm and trixie, amd64 or arm64 (also Raspberry Pi OS and Zynthian):</p>
<pre><code>curl -fsSLO https://www.openmixer.org/deb/openmixer-release.deb &amp;&amp; sudo apt install ./openmixer-release.deb
sudo apt install libomxdsp-dev
</code></pre>
<h2 id="use">Use</h2>
<pre><code>cc $(pkg-config --cflags omxdsp) -c my_plugin.c
cc -shared -o my_plugin.so my_plugin.o $(pkg-config --libs omxdsp)
</code></pre>
<pre><code class="language-c">#include &lt;omxdsp/fx/omx_delay.h&gt;
</code></pre>
<p>A consumer's CI can check that it calls the library instead of carrying its own copies of
what the library exports. The devel package installs <code>omx-dsp-copy-check</code> and the exports file it
reads; from the root of the consumer's checkout:</p>
<pre><code>omx-dsp-copy-check --enforce
</code></pre>
<p>It scans the tracked C and TypeScript sources (tests, fakes, fixtures, oracles and generated
directories excluded) and names each function that defines an exported name or a twin the
library's documentation declares, repeats an export's body, carries two of its distinctive
constants with the same maths calls, or writes a short export inline, such as <code>20 * log10(x)</code> or
the mono sum <code>0.5f * (l[i] + r[i])</code>. Without <code>--enforce</code> it only reports. Copies kept on purpose
go in <code>omx-dsp-copies.allow</code> at the root, one per line:</p>
<pre><code>tools/measure.c:main | omx_lin_to_db_d | an independent measurement, kept on purpose | owner#12
</code></pre>
<p>An entry that no longer covers a copy, or that has no reason or owner, fails the check, so the
list only shrinks. <code>omx-dsp-copy-check --help</code> describes every rule.</p>
<p>The library comes in three flavours, each with its own archive and pkg-config file. A program
builds against the one that matches its own build, so that its contract and TSan builds also
check the library's compiled code:</p>
<table>
<thead>
<tr>
<th>pkg-config</th>
<th>archive</th>
<th>for</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>omxdsp</code></td>
<td><code>libomxdsp.a</code></td>
<td>release builds; contracts compiled out</td>
</tr>
<tr>
<td><code>omxdsp-contracts</code></td>
<td><code>libomxdsp-contracts.a</code></td>
<td>test builds with <code>-DOMX_CONTRACTS</code></td>
</tr>
<tr>
<td><code>omxdsp-tsan</code></td>
<td><code>libomxdsp-tsan.a</code></td>
<td>test builds under ThreadSanitizer, contracts on</td>
</tr>
</tbody>
</table>
<p>The contracts and TSan flavours put <code>-DOMX_CONTRACTS</code> (and <code>-fsanitize=thread</code>) in the cflags.
The program defines the violation ledger in one of its files with <code>#define OMX_CONTRACT_STORAGE</code>
before including the headers.</p>
<p>Building from source and running the tests: <a href="/projects/omx-dsp/building">BUILDING.md</a>.</p>
<h2 id="licence">Licence</h2>
<p>GPL-3.0-or-later.</p>
`},{slug:`building`,src:`BUILDING.md`,title:`Building omx-dsp`,source:`https://github.com/FreeMixer/omx-dsp/blob/f5c279a980a76a9b2ca53df5a9000f9416cb6cc3/BUILDING.md`,toc:[{id:`flavours`,title:`Flavours`},{id:`gcc-12-2-on-arm64`,title:`GCC 12.2 on arm64`},{id:`golden-digests-and-libm`,title:`Golden digests and libm`},{id:`libmvec`,title:`libmvec`},{id:`rates-outside-the-declaration`,title:`Rates outside the declaration`},{id:`the-engine-s-copies`,title:`The engine's copies`},{id:`the-channel-strip-s-input-stage`,title:`The channel strip's input stage`},{id:`room-analysis-and-the-alignment-fit`,title:`Room analysis and the alignment fit`},{id:`the-eq-maths-openmixer-s-typescript-computes`,title:`The EQ maths openmixer's TypeScript computes`},{id:`loudness`,title:`Loudness`},{id:`the-definitions-and-the-limits`,title:`The definitions and the limits`},{id:`packages`,title:`Packages`}],html:`<h1 id="building-omx-dsp">Building omx-dsp</h1>
<p>Needs a C11 compiler, GNU make, binutils, awk, sed, grep and diffutils.</p>
<table>
<thead>
<tr>
<th>command</th>
<th>does</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>make</code></td>
<td><code>build/libomxdsp.a</code>, <code>build/libomxdsp-contracts.a</code> and <code>build/libomxdsp-tsan.a</code></td>
</tr>
<tr>
<td><code>make test</code></td>
<td>the whole suite: every primitive's and kernel's oracle at every declared rate with contracts on, the negative, perturbation and thread arms, the writable-data and doc checks, and the golden digests</td>
</tr>
<tr>
<td><code>make check-package</code></td>
<td>what the deb's and the RPM's check run: the suite, the negative, consumer and thread arms, every oracle and golden digest, the flavours and the libmvec oracles; the sabotage and perturbation arms and the source checks run in <code>make test</code> (<code>tools/check-package-check.sh</code>, part of <code>make checks</code>, holds the two lists together)</td>
</tr>
<tr>
<td><code>make test-fx</code></td>
<td>the effect kernels' oracles and golden digests alone</td>
</tr>
<tr>
<td><code>make consumer</code></td>
<td>the stateful stages built the way a consumer builds them (release flags, <code>-Werror</code>, states on the stack that only their init or settle writes) and run</td>
</tr>
<tr>
<td><code>make test-analysis</code></td>
<td>the feedback detector's, the RTA ring and spectrum's and HRP's oracles (the HRP render and live core among them) at the nine oracle rates (32 to 192 kHz), their no-allocation arm, golden digests and one sabotage per kernel; the room analysis, Farina sweep and alignment fit against closed forms at the nine rates and against core's TypeScript (the parity table), and one sabotage per kernel that both must catch; alone</td>
</tr>
<tr>
<td><code>make test-engine-kernels</code></td>
<td>the golden digests of the sample-rate converter, the generators and the analyser's readings at the nine oracle rates, which the engine's own copies wrote, and a break in each that must move its own digests and no other's</td>
</tr>
<tr>
<td><code>make install PREFIX=/usr LIBDIR=/usr/lib64 DESTDIR=…</code></td>
<td>headers, the three archives and <code>omxdsp.pc</code>, <code>omxdsp-contracts.pc</code>, <code>omxdsp-tsan.pc</code></td>
</tr>
<tr>
<td><code>make flavours</code></td>
<td>each archive carries its flavour, and a contracts consumer reads a violation raised inside the compiled code only through the contracts archive</td>
</tr>
<tr>
<td><code>make docs</code></td>
<td>the API reference with doxygen</td>
</tr>
<tr>
<td><code>make exports</code></td>
<td><code>build/omx-dsp-exports.json</code>: every public function and macro with its signature, its body as normalised tokens, its distinctive literals, maths calls, inline kernels and <code>@twin</code> names; <code>make install</code> puts it in <code>$(DATADIR)/omxdsp/</code> beside <code>omx-dsp-copy-check</code> in <code>$(BINDIR)</code></td>
</tr>
<tr>
<td><code>make copy-check</code></td>
<td><code>tools/omx-dsp-copy-check.sh --self-test</code>: planted copies in a scratch consumer (an exact copy, a renamed one, a TypeScript twin, a literal copy, inline kernels) must be found, a legitimate caller, boilerplate, tests and fakes must pass, and a stale or reasonless allowlist entry must fail; then each rule is broken in turn and the self-test must go red (part of <code>make test</code>, which runs it alone before everything else, so no parallel job runs beside it)</td>
</tr>
<tr>
<td><code>make lint</code></td>
<td>the doc check, the source scan, the log10f guard, tools/contract-single-source.sh (no name omx-contract defines is defined again here), tools/face-conformance.sh (every instance face's resolve takes its kernel's contract controls by name, order and kind), tools/travel-grid-check.sh (a travel's step reaches its maximum and default, a choice names its ids) and tools/clone-check.sh (a second copy of a body inside the library goes red); each checks its own sabotage</td>
</tr>
<tr>
<td><code>make test-tsan</code></td>
<td>the thread arm under ThreadSanitizer, where the toolchain has it</td>
</tr>
<tr>
<td><code>make engine-kernels-identity OPENMIXER=&lt;checkout&gt;</code></td>
<td>renders those digests again through the copies OpenMixer's engine still carries (<code>mix_src.h</code>, <code>mix_dsp.h</code>), and checks that each of its sabotages goes red; a desk check, not run in CI</td>
</tr>
<tr>
<td><code>make test-mix</code></td>
<td>the mix module's golden digests at the nine oracle rates (<code>test/golden/mix.sha256</code>, written by the engine's own copies), and a break in each kernel and in each of the bus stages' contract checks that must turn its arm red; alone</td>
</tr>
<tr>
<td><code>make mix-engine-identity OPENMIXER=&lt;checkout&gt;</code></td>
<td>renders the mix digests again through each set of copies OpenMixer's engine still carries (the bus stages' <code>omx_mix_strip</code>, <code>omx_bus_out_gain</code> and <code>omx_bus_out_stage</code> in <code>mix_dsp.h</code>, under the same names as <code>mix/omx_bus_stage.h</code>), and checks that each of its sabotages goes red; a desk check, not run in CI</td>
</tr>
<tr>
<td><code>make strip-input-identity OMX_PLUGINS=&lt;checkout&gt;</code></td>
<td>renders omx-plugins' channel strip's own input stage (<code>plugins/omx-strip/omx_strip.h</code>) and requires the trim face's golden digests, then its sabotage; a desk check, not run in CI</td>
</tr>
<tr>
<td><code>make analysis-engine-identity OPENMIXER=&lt;checkout&gt;</code></td>
<td>builds the analysis golden against the engine's own <code>mix_dsp.h</code>, <code>hrp_render.h</code> and <code>hrp_lv2.h</code> and requires the committed digests, then its sabotage; a desk check, not run in CI</td>
</tr>
<tr>
<td><code>make room-ts-golden OPENMIXER=&lt;checkout&gt;</code></td>
<td>runs core's room analysis and alignment fit from an OpenMixer checkout under node (22.6 or later) and requires the committed parity table <code>test/analysis/fixtures/room_ts.h</code>; a desk check, not run in CI</td>
</tr>
<tr>
<td><code>make eq-sabotage</code></td>
<td>the EQ bank, head-filter and drawn-curve arms (<code>eq-curve</code>, <code>eq-design-ts</code>) against nine sabotaged copies of the headers; each must fail both arms (part of <code>make test</code>)</td>
</tr>
<tr>
<td><code>make bench-mixmatrix</code></td>
<td>the mix matrix's cost, then a 64 x 32 matrix held to MIXMATRIX_PERIOD_SHARE of the period at the nine rates, and a budget nothing can meet must go red; a desk check, not run in CI, whose shared runners time a core the console does not run on</td>
</tr>
<tr>
<td><code>make golden-write</code></td>
<td>rewrites every kernel's <code>test/golden/&lt;kernel&gt;.sha256</code>; only in a commit that bumps the minor version or adds a kernel</td>
</tr>
</tbody>
</table>
<p><code>make -jN test</code> is supported. <code>tools/kernels-gen.sh</code> runs once, as the Make rule that produces
<code>build/kernels-suite.inc.c</code> and <code>build/kernels-perturb.inc.c</code>; every target that reads them lists
them as a prerequisite and no recipe or script calls the generator into <code>build/</code>. <code>make test-fx</code>
is one target per kernel, instance, oracle, golden and perturbation script (<code>fx-run-*</code>), so <code>-j</code>
runs them side by side; the set run and each assertion are the same as serially.
<code>make gen-once</code> (<code>test/gen-once.sh</code>, part of <code>make test</code>) counts the generations under <code>-j8</code> and
must see exactly one; it then re-adds the generator call to a recipe in a scratch copy of the
Makefile, which must turn it red.</p>
<p>Consumers compile the kernels through <code>pkg-config --cflags omxdsp</code>, which carries
<code>-ffp-contract=off</code>: the kernels are inline, and without it an architecture with fused
multiply-add would round differently from one without.</p>
<h2 id="flavours">Flavours</h2>
<p>The compiled part of the library (the oversampler, the FBS detector, the room analysis, the Farina
sweep and the alignment fit; everything else is inline in the headers) is built once per flavour
into <code>build/</code>:</p>
<ul>
<li><code>libomxdsp.a</code>: <code>CFLAGS</code> only, contracts compiled out.</li>
<li><code>libomxdsp-contracts.a</code>: objects in <code>build/contracts/</code>, with <code>-DOMX_CONTRACTS</code>.</li>
<li><code>libomxdsp-tsan.a</code>: objects in <code>build/tsan-lib/</code>, with <code>-DOMX_CONTRACTS -fsanitize=thread</code>.</li>
</ul>
<p>Each has a pkg-config file of the same name (<code>omxdsp</code>, <code>omxdsp-contracts</code>, <code>omxdsp-tsan</code>) whose
cflags carry the flavour's flags, so the inline headers and the archive are always built the same
way. The suite, the thread arm and the contract-checked kernel tests link <code>libomxdsp-contracts.a</code>,
<code>make test-tsan</code> links <code>libomxdsp-tsan.a</code>, and the release-flag kernel tests link <code>libomxdsp.a</code>.
<code>make flavours</code> (<code>tools/flavour-check.sh</code>, part of <code>make test</code>) checks each archive's symbols and
builds <code>test/omxdsp_flavour.c</code>, a contracts consumer that feeds a NaN to the compiled oversampler:
against <code>libomxdsp-contracts.a</code> it must find the violation in its own ledger, and against
<code>libomxdsp.a</code> it must fail.</p>
<h2 id="gcc-12-2-on-arm64">GCC 12.2 on arm64</h2>
<p>Debian bookworm's GCC 12.2 on arm64 (Raspberry Pi OS, Zynthian) crashes with an internal compiler
error in <code>vect_transform_reduction</code> on a loop that keeps a <code>double</code> running maximum or minimum with
<code>fmax</code>/<code>fmin</code> over values widened from <code>float</code>. Write such a reduction as a comparison instead,
<code>if (!(e &lt;= worst)) worst = e;</code>, which also carries a NaN into the result. <code>make lint</code> refuses the
shape on any host (<code>tools/reduction-check.sh</code>), and CI builds the suite on bookworm arm64.</p>
<h2 id="golden-digests-and-libm">Golden digests and libm</h2>
<p>A golden digest covers the kernel's output bit for bit, so it also covers every libm call the
kernel makes per sample. A libm's <code>log10f</code> is not one function: glibc 2.36 (debian:bookworm)
misrounds 1.39% of the non-negative floats, 62 225 of them by 2 ulp, where glibc 2.41 (debian:trixie)
and 2.43 (Fedora 44) round every one correctly, since 2.41 took <code>log10f</code> from CORE-MATH. The limiter's
48 kHz digest (the render of FreeMixer/omx-dsp#21) read <code>5fe47250…</code> on bookworm against <code>69a449ce…</code>
on 2.41 and 2.43. The compiler played no part: the same binary flips with the glibc it runs on.</p>
<p>Production calls the libm: <code>omx_lin_to_db()</code> is <code>20·log10f(max(lin, 1e-9))</code>, about 2 ns per call
against 10 ns for a libm-free <code>log10f</code> on glibc 2.43. The goldens do not: <code>omx_log10f()</code> lives in
<code>test/support/log10f_cr.h</code>, a correctly rounded <code>log10</code> in IEEE double arithmetic (it needs
<code>FLT_EVAL_METHOD == 0</code> and <code>-ffp-contract=off</code>, which the Makefile's <code>FPFLAGS</code> carry), and every
effect-kernel golden TU is compiled with <code>-include test/support/log10f_subst.h</code>, which defines <code>log10f</code> as
<code>omx_log10f</code>. The kernels are static inline, so the substitution reaches them, and every kernel's
golden is an exact digest on every toolchain. Two guards hold it: <code>golden.h</code> refuses to compile a
golden without the substitution and the golden driver exits 2 when <code>log10f</code> there is not
<code>omx_log10f</code>, and <code>tools/log10f-guard.sh</code> (part of <code>make lint</code>) fails when <code>omx_log10f</code> appears
under <code>include/</code> or <code>src/</code>. <code>make check-log10f</code> compares <code>omx_log10f</code> with the host libm's <code>log10f</code>
on all 2³¹ non-negative floats; against glibc 2.43 none differ. <code>test/kernels/units.c</code> tests it
against fixed bit patterns, including <code>0x0efeee7a</code>, 7.8e-10 ulp from a float midpoint, which is
answered from its exact value. The analysis golden (<code>test/analysis/golden.test.c</code>), whose HRP
code calls <code>log10f</code> through the compiled headers, links with <code>-Wl,--wrap=log10f</code> and answers each
call with <code>omx_log10f</code>; it exits 2 if the wrap was never reached.</p>
<p>On glibc older than 2.41 a production build may therefore differ from the golden by up to 2 ulp of
a dB value in the units that call <code>log10f</code>. That is accepted.</p>
<p>The limiter's other per-sample call, <code>powf</code> in <code>omx_db_to_lin()</code>, is the same implementation in
every glibc since 2.28 and returned the same bits for equal arguments on 2.36, 2.41 and 2.43. A
kernel that adds a per-sample libm call adds it to the RT-safe allowlist named in its <code>@note</code>, and
checks that the goldens agree across glibc versions, or uses a libm-free word.</p>
<h2 id="libmvec">libmvec</h2>
<p>The drive's shaper (<code>omx_drive_shape_block</code>) and the dynamics gain curves (the loops of
<code>omx_dynamics_keyed</code> and <code>omx_dyn_flat_gain_block</code>) are stateless per sample, so their <code>tanhf</code>,
<code>log10f</code> and <code>powf</code> run four samples at a time through glibc's libmvec. Measured on a Pi 5 (glibc
2.41, gcc 14, 256-sample blocks), libm against libmvec in ns per sample: tanhf 9.34 to 2.52,
log10f 8.08 to 1.87, expf 6.22 to 1.80, powf 11.74 to 7.22. <code>include/omxdsp/omx_fastmath.h</code> makes the
<code>#pragma omp declare simd notinbranch</code> declarations, because glibc's own <code>&lt;math.h&gt;</code> makes them only under
<code>__FAST_MATH__</code>, which this library never uses (<code>-ffast-math</code> sets flush-to-zero at load).</p>
<p>The build decides, per function, by compiling and linking a probe (<code>tools/fastmath-probe.sh</code>): a function
counts only when the compiler turns a loop over it into a call of its <code>_ZGV</code> symbol and the program links with
<code>-lm -lmvec</code>. The Makefile then adds <code>-fopenmp-simd -fno-math-errno</code> and
<code>-DOMX_FASTMATH_MVEC_&lt;F&gt;=1</code> for each function found, and <code>-lmvec</code> to the link; <code>omxdsp.pc</code> carries the same in its
<code>Cflags</code> and <code>Libs</code>, so a consumer that links the static library takes libmvec on exactly the targets where the
library was built with it (<code>pkg-config --cflags --libs omxdsp</code>). Where libmvec is absent (Debian 12 on arm64;
glibc older than 2.35 on x86-64; glibc older than 2.40 for <code>tanhf</code> and <code>powf</code> on aarch64) the probe finds nothing, the
flags are empty and every kernel calls the libm as before. <code>make FASTMATH=off</code> forces that path. <code>-fopenmp-simd</code>
links no OpenMP runtime; <code>-fno-math-errno</code> lets the compiler treat the four functions as pure, and enables no
exception. The trapping-math default is kept: the loops select with <code>omx_fm_select()</code> rather than <code>?:</code> on floats, so
nothing has to be speculated for them to vectorise.</p>
<p>The output through libmvec is not bit-identical to the libm's. Held by:</p>
<ul>
<li><code>make fastmath</code>: the oracle (<code>test/fx/fastmath.test.c</code>), each function against the double-precision libm over
the range the library uses, with its specials, and a check (<code>tools/fastmath-vec-check.sh</code>) that every loop
above really calls the vector symbols;</li>
<li><code>make fastmath-diff</code>: every kernel that uses them rendered on the libm and on libmvec at every declared rate,
the largest sample difference in dB re full scale, failing above <code>FM_DIFF_LIMIT_DBFS</code> (-96);</li>
<li><code>make fastmath-sabotage</code>: the oracle red on a result moved by 5 ULP, the loop check red on a header without
the pragma, the probe empty for a toolchain with no libmvec, no pragma or no vector symbol;</li>
<li><code>make fastmath-plain</code>: the oracle, the drive and the dynamics again with <code>FASTMATH=off</code>.</li>
</ul>
<p>The golden digests stay on the libm: their translation units are built with the flags before the libmvec ones
(<code>CFLAGS_PLAIN</code>), and the stage's contracts build (<code>-DOMX_CONTRACTS</code>) keeps its per-sample calls, so a digest or a
contract ledger does not depend on the glibc's libmvec.</p>
<h2 id="rates-outside-the-declaration">Rates outside the declaration</h2>
<p>The console declares six rates (<code>OMX_DECLARED_RATES</code>), and the kernels' contracts refuse any other
with a <code>rate-is-declared</code> precondition. The dynamics, balance, rotor and limiter oracles also run at
32, 64 and 128 kHz, the other rates of the oracle set (<code>OMX_FX_ORACLE_RATES</code> in
<code>test/fx/fx_rates.h</code>), with contracts still on: there the <code>rate-is-declared</code> precondition is
expected, and every other law must hold. Their golden digest files carry all nine rates.</p>
<h2 id="the-engine-s-copies">The engine's copies</h2>
<p>The sample-rate converter (<code>omx_src.h</code>), the generators (<code>omx_gen.h</code>) and the analyser's spectrum
readings and half-band decimator (<code>analysis/omx_rta.h</code>) moved here from OpenMixer's engine unchanged in
behaviour. Their oracles are suite arms (<code>test/kernels/src.c</code>, <code>gen.c</code>,
<code>rta.c</code>); <code>test/engine_kernels/golden.test.c</code> hashes their output per kernel at the nine oracle rates,
and <code>test/golden/engine_kernels.sha256</code> holds the digests the engine's own copies gave, written by
<code>tools/engine-kernels-identity.sh --write</code>. <code>make engine-kernels-identity OPENMIXER=&lt;checkout&gt;</code>
compiles the program again with those copies in place of the three headers, against the
omx-contract release the engine pins, and requires the same digests (set
<code>ENGINE_IDENTITY_INCLUDE</code> to the include directory of the omx-dsp the engine pins, e.g. <code>git archive &lt;its commit&gt; include</code>, when this tree's other headers need a newer contract than the engine's); its self-test changes one line
in each copy and requires a failure each time. It is a desk check and CI does not run it: the copies
live in OpenMixer's private repository. It ends when the engine builds from these headers instead
of its copies.</p>
<p>The engine spells the converter's design rolloff <code>OMX_SRC_ROLLOFF</code>, a double; omx-contract renders
it as the float <code>OMX_SRC_ROLLOFF</code> and the double <code>OMX_SRC_ROLLOFF_DOUBLE</code>. A caller that wants the
engine's coefficients passes <code>OMX_SRC_ROLLOFF_DOUBLE</code> to <code>omx_src_design</code>.</p>
<h2 id="the-channel-strip-s-input-stage">The channel strip's input stage</h2>
<p>omx-plugins' channel strip ran its input trim and the trim's ramp as arithmetic of its own. That
stage is now two faces: <code>fx/omx_trim_instance.h</code> (the trim kernel's one control, the console's
de-zippered head gain) and <code>fx/omx_eq_instance.h</code> with every band off (the HPF and the LPF, which
the console runs as sections of its channel EQ). <code>test/golden/trim_instance.sha256</code> was written by
<code>make strip-input-identity OMX_PLUGINS=&lt;checkout&gt;</code> (<code>tools/strip-input-identity.sh</code>) from the
plugin's own <code>omx_strip.h</code>, and <code>test/fx/trim_instance_golden.test.c</code> holds the two faces to it at
every declared rate. Run it again whenever either face or the strip's input stage changes; it ends
when the strip is generated from these faces and holds no arithmetic of its own.</p>
<h2 id="room-analysis-and-the-alignment-fit">Room analysis and the alignment fit</h2>
<p>OpenMixer's room analysis and Smart Alignment's fit moved here from TypeScript:
<code>analysis/omx_align_fit.h</code> (the cross-spectrum accumulator, the
delay and polarity fit, the correction), <code>analysis/omx_room.h</code> (the H1 transfer and coherence,
the impulse response and its early reflections, RT60 per octave band, the mode finder and the
mode-EQ proposal) and <code>analysis/omx_sweep.h</code> (the Farina sweep, its inverse and the
deconvolution), compiled in <code>src/omx_align_fit.c</code>, <code>src/omx_room.c</code> and <code>src/omx_sweep.c</code>. They
run on a control thread, never in the audio callback: every buffer and scratch array is the
caller's, sized as each function states, and nothing is allocated, locked or kept between calls.
A measurement that cannot conclude returns a refusal code (<code>enum omx_analysis_refusal</code>), one per
word of core's refusal lists.</p>
<p>The numbers core declares for these readers and omx-contract does not yet carry (the frame
floor, the default and mode bands, the trust coherence, the analysis floor, the early-reflection
horizon and floor, the T20 span, the octave centres, the mode margin and position floor, the
sweep's fade fraction) are the caller's to pass; this tree types none of them. The proposal's
bounds are omx-contract's (<code>OMX_FBS_MAX_NOTCH_DEPTH_DB</code>, <code>OMX_EQ_GAIN_RANGE_*</code>,
<code>OMX_EQ_Q_RANGE_*</code>).</p>
<p>Two kinds of oracle hold them. <code>test/analysis/align_fit.test.c</code>, <code>room.test.c</code> and
<code>sweep.test.c</code> check closed forms at the nine oracle rates (a known delay, gain, reflection,
decay, set of resonances, sweep law) and count allocations. <code>test/analysis/room_ts.test.c</code> holds
every result to what core's TypeScript computes on fixed inputs, from the parity table
<code>test/analysis/fixtures/room_ts.h</code>: integers exactly, reals within 1e-9 relative (measured gap
about 1e-12; V8's libm against the host's). <code>tools/room-ts-golden.mjs</code> wrote the table from an
OpenMixer checkout, with omx-contract's TypeScript render from the pinned release; every input
is built from an integer PRNG and exact arithmetic, so the C test rebuilds the same bits.
<code>make room-ts-golden OPENMIXER=&lt;checkout&gt;</code> writes it again and requires the committed file; run
it whenever core's TypeScript or these kernels change, until the TypeScript is deleted. <code>test/analysis/room-sabotage.sh</code> breaks each kernel once in a
scratch copy and requires its closed-form oracle and the parity test to fail.</p>
<h2 id="the-eq-maths-openmixer-s-typescript-computes">The EQ maths openmixer's TypeScript computes</h2>
<p>openmixer designs its console EQ and draws its curve in TypeScript today. The C
here computes the same results, so the engine and the server can take them from one place:</p>
<table>
<thead>
<tr>
<th>TypeScript</th>
<th>C</th>
</tr>
</thead>
<tbody>
<tr>
<td>core <code>rbjSection</code>, <code>rbjCoeffs</code> (core <code>eq.ts</code>)</td>
<td><code>omx_eq_design</code>, <code>omx_eq_design_f</code></td>
</tr>
<tr>
<td>core <code>bandwidthOctavesQ</code></td>
<td><code>omx_eq_bandwidth_q</code></td>
</tr>
<tr>
<td>core <code>butterworthSlopeQs</code>, web <code>butterworthSectionQs</code></td>
<td><code>omx_eq_butterworth_qs</code></td>
</tr>
<tr>
<td>core <code>passFilterMaxSections</code></td>
<td><code>OMX_EQ_PASS_MAX_SECTIONS</code></td>
</tr>
<tr>
<td>core <code>complementSection</code></td>
<td><code>omx_eq_complement</code></td>
</tr>
<tr>
<td>core <code>eqBandIsIdentity</code></td>
<td><code>omx_eq_band_is_identity</code></td>
</tr>
<tr>
<td>core <code>eqCoeffs</code></td>
<td><code>omx_eq_bank_design</code></td>
</tr>
<tr>
<td>core <code>passFilterCoeffs</code></td>
<td><code>omx_eq_pass_design</code></td>
</tr>
<tr>
<td>core <code>sectionMagnitudeDb</code></td>
<td><code>omx_biquad_magnitude_db_d</code></td>
</tr>
<tr>
<td>core <code>biquadMagnitudeDb</code></td>
<td><code>omx_eq_band_magnitude_db</code></td>
</tr>
<tr>
<td>core <code>eqCurveDb</code></td>
<td><code>omx_eq_curve_db</code> (its frequencies: <code>omx_eq_curve_freqs</code>)</td>
</tr>
<tr>
<td>web <code>magnitudeSumDb</code>, <code>seatY</code>'s value (web <code>eqCurveGeom.ts</code>)</td>
<td><code>omx_eq_magnitude_sum_db</code></td>
</tr>
<tr>
<td>web <code>eqStateBands</code>, <code>filterBands</code>, <code>passFilterBands</code></td>
<td><code>omx_eq_curve_bands</code></td>
</tr>
<tr>
<td>web <code>eqStateCurveDb</code>, <code>compositeCurveDb</code></td>
<td><code>omx_eq_curve_bands</code>, then <code>omx_eq_curve_db</code></td>
</tr>
<tr>
<td>catalog <code>octavesToQ</code> (catalog <code>eq.ts</code>)</td>
<td><code>omx_eq_octaves_q</code></td>
</tr>
</tbody>
</table>
<p><code>test/kernels/fixtures/eq_design_ts.h</code> is what that TypeScript computes on fixed inputs at the nine
oracle rates, written by <code>tools/ts-golden.mjs design &lt;openmixer&gt; &lt;contract-ts&gt;</code> (Node 22.7 or later;
<code>&lt;contract-ts&gt;</code> is omx-contract's TypeScript render, <code>omx-contract render --target ts --out &lt;dir&gt;</code>
from a checkout of the installed release). The <code>eq-design-ts</code> arm holds the C to it: a coefficient, a Q or
a frequency of the drawn grid within 4 ulp, a magnitude within 1e-9 dB, the bank's order, count and
parked sections exactly. Two families of coefficient pass 4 ulp, both a cancellation that turns one
ulp of V8's <code>exp</code> or <code>cos</code> into many (a matched bell or shelf at a low corner or a wide Q, and the
fitted low-pass's b2 far below Nyquist); they are held to 1e-13 absolute, and the arm prints the
largest gap of each kind. Regenerate the fixture when openmixer's TypeScript changes, until it is
deleted. The <code>eq-curve</code> arm holds the same functions to closed forms.</p>
<h2 id="loudness">Loudness</h2>
<p><code>omx_loudness.h</code> measures EBU R 128 loudness the way ITU-R BS.1770-4 defines it
(FreeMixer/omx-dsp#64). The engine measures and accumulates; it reads the figures and publishes
them, and no other code computes them.</p>
<ul>
<li><strong>K-weighting.</strong> Two sections designed for the rate at init, in double, from the analogue
prototype of BS.1770's 48 kHz table (a high shelf at 1681.97 Hz, +4.0 dB, and the RLB high-pass
at 38.135 Hz), by the bilinear transform with <code>tan</code> prewarping. At 48 kHz they reproduce the
standard's printed coefficients; at the other rates they are the same filter. Each leg runs
through omx_biquad_d(), double history.</li>
<li><strong>Blocks.</strong> The K-weighted squares, each leg weighted (1.0 for L, R, C; 1.41 for the surrounds;
0 drops a leg, the LFE), are summed in 10 ms sub-blocks (<code>rate / 100</code> samples, a whole number at
each of the nine oracle rates). Momentary loudness is the last 40 sub-blocks (400 ms), short-term
the last 300 (3 s); a window that has not yet filled counts the missing time as silence.</li>
<li><strong>Gating.</strong> Every 100 ms a full 400 ms block joins the integrated measurement and, once 3 s have
passed, the short-term value joins the range. Neither keeps the blocks: each keeps a histogram of
0.1 LU bins from −70 LUFS up, every bin holding its count and the exact sum of its energies. The
absolute gate (−70 LUFS) is a bin edge; the relative gate (−10 LU for the integrated loudness,
−20 LU for the range) is placed in energy, and the bin it falls in is kept when its own mean is
above the gate. So a programme of any length takes the same state, and the integrated value is
exact except for blocks within 0.1 LU of the relative gate.</li>
<li><strong>Loudness range.</strong> EBU Tech 3342: the 10th to the 95th percentile of the gated short-term
values, each percentile read as the energy mean of the bin that holds it.</li>
<li><strong>True peak.</strong> The largest reading of omx_truepeak_block() over every leg: the shared ×4
half-band interpolator, BS.1770-4's four, not a second one.</li>
</ul>
<p>Nothing on the process path allocates, locks or calls libm: the bin edges and coefficients are
computed at init, and a reading calls <code>pow</code> and <code>log10</code> at most twice. The state is one caller-owned struct
without pointers, exported with OMXDSP_STATE_LAYOUT.</p>
<p>The oracle (<code>test/fx/loudness.test.c</code>) generates EBU Tech 3341's and 3342's test signals from
their closed forms at each of the nine oracle rates and holds the readings to the tolerances the
documents give: momentary, short-term and integrated ±0.1 LU, true peak +0.2/−0.4 dB, loudness
range ±1 LU. Generated: 3341 signals 1 to 6, 9, 12 and 15 to 19, and 3342 signals 1 to 4. In
place of the burst signals 10 and 13, a burst of exactly one window (3 s, 400 ms) at −23 dBFS is
placed off the 10 ms grid and the largest reading must be −23.0 LUFS ±0.1. Not generated: the
programme recordings (3341 signals 7 and 8, 3342 signals 5 and 6) and the signals published only
as files (3341 signals 11, 14 and 20 to 23). The true-peak tones are faded in over 20 ms: a sine
switched on at full level is a step, and its reconstruction overshoots. The golden digests
(<code>test/golden/loudness.sha256</code>) hold the readings in energy, so no libm <code>log10</code> enters them;
<code>test/fx/loudness-perturb.sh</code> breaks the shelf, the relative gate, the range percentile, the true
peak and the momentary window one at a time, and each must turn the oracle red and move every
digest.</p>
<h2 id="the-definitions-and-the-limits">The definitions and the limits</h2>
<p>The kernels and DSP constants this library implements are defined in <code>data/</code>: one file per kernel
under <code>data/kernels/</code>, one per constant under <code>data/primitives/</code>, in omx-contract's schema. The C
code reads them through <code>&lt;omxdsp/omxdsp_definitions.h&gt;</code>, rendered from <code>data/</code> by omx-contract's tool
(<code>make definitions OMX_CONTRACT=&lt;checkout&gt;</code>, which runs <code>omx-contract render --target c --package omx-dsp</code>) and committed, so a build needs no node. Never edit the header: change the definition and
render again; <code>make definitions-check</code> fails while the two differ, and <code>tools/contract-single-source.sh</code>
fails on a second definition of any of its names. <code>make install</code> installs <code>data/</code> into omx-contract's
contract directory as the package <code>omx-dsp</code>, with a <code>MANIFEST.json</code>, where the other packages read
it.</p>
<p>The facts no single package implements (the declared sample rates, the parameter scales) stay in
FreeMixer/omx-contract, read through <code>&lt;omxcontract/omx_contract_limits.h&gt;</code>, which the definitions
header includes. That dependency is declared once, in the packaging: <code>packaging/omx-dsp.spec</code>
(<code>BuildRequires</code>, <code>Requires</code>) and <code>debian/control</code> (<code>Build-Depends</code>, <code>Depends</code>) carry the same floor
and no upper bound (<code>&gt;= 3.1.0</code>), and <code>omxdsp.pc</code> requires the same floor. Install
it from the FreeMixer channel with the rest of the build dependencies:</p>
<pre><code>dnf builddep packaging/omx-dsp.spec     # Fedora, with the FreeMixer repository added
apt-get build-dep ./                    # Debian, with the FreeMixer source list added
</code></pre>
<p><code>tools/contract-include.sh</code> finds the installed <code>omx-contract</code> with <code>pkg-config</code>: at or above the
floor the spec declares, it prints the package's include directory; otherwise the build stops, naming
the package, the floor and the version installed. The dependency is a floor only, never a ceiling.
Nothing is downloaded and no version is pinned anywhere else. <code>tools/contract-include-selftest.sh</code>
(<code>make checks</code>) holds the script to that floor, <code>debian/control</code> and <code>omxdsp.pc.in</code> to the spec's, and
refuses an upper bound in any of them.</p>
<p><code>OMX_CONTRACT_INC=&lt;dir&gt;</code> names another include directory (one that holds <code>omxcontract/</code>) and skips the
version check. The perturbation arms use it, and so can you: render a contract with one value moved
into a scratch directory, <code>make test</code>, and the kernel test that reads that value must go red.
Moving the range is one commit of its own, in the spec and <code>debian/control</code> together. A value the
kernels need is added to its definition in <code>data/</code> and the header rendered again; it is never typed
in the code.</p>
<h2 id="packages">Packages</h2>
<p><code>packaging/omx-dsp.spec</code> (RPM, <code>omx-dsp-devel</code>) and <code>debian/</code> (<code>libomxdsp-dev</code>). A <code>v&lt;version&gt;</code>
tag releases both through the FreeMixer release workflows; the version is
<code>OMXDSP_VERSION_*</code> in <code>include/omxdsp/omxdsp.h</code>, the spec's <code>Version:</code> and the top of
<code>debian/changelog</code>, and CI refuses them disagreeing.</p>
`}],r={repo:e,commit:t,pages:n};export{t as commit,r as default,n as pages,e as repo};