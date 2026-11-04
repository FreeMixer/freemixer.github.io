var e=`omx-contract`,t=`c241fd47a68d4de548a1cd415f967b211da6475e`,n=[{slug:``,src:`README.md`,title:`omx-contract`,source:`https://github.com/FreeMixer/omx-contract/blob/c241fd47a68d4de548a1cd415f967b211da6475e/README.md`,toc:[{id:`install`,title:`Install`},{id:`use`,title:`Use`},{id:`building`,title:`Building`},{id:`license`,title:`License`}],html:`<h1 id="omx-contract">omx-contract</h1>
<p>The FreeMixer declarations as data: what a value may be (a travel, a default, a kernel constant, a list),
written once as JSON, checked by a JSON Schema and rendered into the languages that read it. The mixer
engine, the DSP library and the plugins all take their ranges, defaults and constants from the same
definitions, so a knob means the same thing on the console, in a plugin and in a test.</p>
<ul>
<li>One declaration per value, validated against a closed schema. This package holds the schema, the one tool,
and the facts no single package owns (<code>data/</code>: the sample rates, the readout rate, the parameter scales, the measurement, resource and machine-class words, and the whole LV2 and CLAP vocabulary mapped, laid out by <a href="https://github.com/FreeMixer/omx-contract/blob/c241fd47a68d4de548a1cd415f967b211da6475e/docs/data-layout.md">docs/data-layout.md</a>); a package that implements a definition ships its own file into the
contract directory (<a href="https://github.com/FreeMixer/omx-contract/blob/c241fd47a68d4de548a1cd415f967b211da6475e/docs/contract-dir.md">docs/contract-dir.md</a>): omx-dsp its kernels and design constants,
omx-clap-core its hosting limits.</li>
<li>Renders for C (a header), TypeScript and resolved JSON, each held equal to the data by CI.</li>
<li>Semantic versioning enforced by a check: a change that narrows a declaration needs a major bump, one that adds
or widens needs a minor (<a href="https://github.com/FreeMixer/omx-contract/blob/c241fd47a68d4de548a1cd415f967b211da6475e/docs/kernel-files.md#what-semver-judges">what the check judges</a>).</li>
</ul>
<h2 id="install">Install</h2>
<p>Fedora 44:</p>
<pre><code>sudo dnf install https://www.openmixer.org/rpm/openmixer-release.noarch.rpm
sudo dnf install omx-contract-devel
</code></pre>
<p>Debian bookworm and trixie (also Raspberry Pi OS and Zynthian):</p>
<pre><code>curl -fsSLO https://www.openmixer.org/deb/openmixer-release.deb &amp;&amp; sudo apt install ./openmixer-release.deb
sudo apt install libomx-contract-dev
</code></pre>
<p>The development package pulls in omx-contract-data, the files a program reads at run time (the contract directory,
the schema and the resolved json); a program that only reads them at run time requires omx-contract-data alone.</p>
<p>JavaScript and TypeScript projects (the <code>ts</code> render is the main export, the CLI is <code>omx-contract</code>):</p>
<pre><code>npm install @openmixer/omx-contract
</code></pre>
<p>Every GitHub release also carries the <code>npm pack</code> tarball, the RPMs and the debs.</p>
<h2 id="use">Use</h2>
<p>Include the C header and read the constants by name:</p>
<pre><code class="language-c">#include &lt;omxcontract/omx_contract_limits.h&gt;
</code></pre>
<pre><code>pkg-config --cflags omx-contract
</code></pre>
<p>Pin one version and build against its renders instead of keeping a copy: the installed package at exactly
that version (<code>pkg-config --exact-version=2.20.0 omx-contract</code>), else the npm tarball, unpacked, and
<code>omx-contract render --target c --out build/omx-contract/include</code>. A kernel's controls and readouts, in their
order, are in the json render of the contract directory (<code>omx-contract render --target json --installed</code>); how a declaration is written is in
<a href="https://github.com/FreeMixer/omx-contract/blob/c241fd47a68d4de548a1cd415f967b211da6475e/docs/kernel-files.md">docs/kernel-files.md</a>, and what a readout is in <a href="https://github.com/FreeMixer/omx-contract/blob/c241fd47a68d4de548a1cd415f967b211da6475e/docs/readouts.md">docs/readouts.md</a>. The hosting limits, the refusal codes and the <code>clap_host_limits.h</code> rendered from them are in <a href="https://github.com/FreeMixer/omx-contract/blob/c241fd47a68d4de548a1cd415f967b211da6475e/docs/hosting.md">docs/hosting.md</a>. How an owner's own header is spelled by a <code>render</code> word in its file is in <a href="https://github.com/FreeMixer/omx-contract/blob/c241fd47a68d4de548a1cd415f967b211da6475e/docs/render.md">docs/render.md</a>. The curve kinds a panel draws, the axes each is drawn on, and the frequency grid an EQ curve is sampled on are in <a href="https://github.com/FreeMixer/omx-contract/blob/c241fd47a68d4de548a1cd415f967b211da6475e/docs/curves.md">docs/curves.md</a>. How a package installs its own definitions into the contract directory, and how a reader reads them, is in <a href="https://github.com/FreeMixer/omx-contract/blob/c241fd47a68d4de548a1cd415f967b211da6475e/docs/contract-dir.md">docs/contract-dir.md</a>. How a plugin, ours or anyone's, is described in the same words (controls, ports, instruments, what it needs from a host) is in <a href="https://github.com/FreeMixer/omx-contract/blob/c241fd47a68d4de548a1cd415f967b211da6475e/docs/descriptors.md">docs/descriptors.md</a>.</p>
<h2 id="building">Building</h2>
<p>See <a href="https://github.com/FreeMixer/omx-contract/blob/c241fd47a68d4de548a1cd415f967b211da6475e/BUILDING.md">BUILDING.md</a>.</p>
<h2 id="license">License</h2>
<p>GPL-3.0-or-later. JSON cannot carry an SPDX comment; every data file is covered by <code>LICENSE</code>.</p>
`}],r={repo:e,commit:t,pages:n};export{t as commit,r as default,n as pages,e as repo};