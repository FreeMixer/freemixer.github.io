var e=`omx-panel`,t=`edaf4f48de7e57496ead1b949f754b7e111867e3`,n=[{slug:``,src:`README.md`,title:`omx-panel`,source:`https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/README.md`,toc:[{id:`what-is-here`,title:`What is here`},{id:`install`,title:`Install`},{id:`for-a-plugin-author`,title:`For a plugin author`}],html:`<h1 id="omx-panel">omx-panel</h1>
<p>Panels for audio plugins, generated from what the plugin declares. Give any LV2 or CLAP plugin a panel
without drawing one: a MOD GUI for MOD and Zynthian, pages for a controller, a layout for a host, all from
the plugin's own declaration, in the omx look, vintage or modern.</p>
<h2 id="what-is-here">What is here</h2>
<ul>
<li>The layout: <code>tools/panel-description.mjs</code> lays out a panel from a plugin's descriptor (sections, controls, roles,
the family, the pages of eight a controller shows), under the plugin's declared panel when it has one
(<a href="/projects/omx-panel/panel-layout">docs/panel-layout.md</a>).</li>
<li>The MOD GUI generator: <code>omx-panel modgui</code> writes a plugin's MOD GUI from its descriptor, its images rasterised
byte for byte, in the omx look (<code>tools/look/tokens.css</code>) (<a href="/projects/omx-panel/modgui">docs/modgui.md</a>).</li>
<li>The sync: <code>omx-modgui-sync</code> gives a generated MOD GUI to every installed LV2 plugin that ships none, into
<code>/usr/local/lib/lv2</code> (<code>~/.lv2</code> for a user), one bundle per plugin, never touching a bundle that is not its own.
The systemd unit is installed, not enabled: <code>systemctl enable omx-modgui-sync</code> makes it run after each
<code>plugin-qualify-sync</code> (a drop-in on that unit queues it when a scan finishes, only if enabled). <code>omx-modgui-sync --check</code> says whether MOD-UI reads the folder. A plugin that cannot get a GUI never
fails the run; <code>omx-modgui-sync(1)</code> has the directories, the exit status and the summary.</li>
<li>The group inference: <code>tools/group-infer.mjs</code> finds the port groups an LV2 plugin lacks from what it states (its own
partial groups, designations, name and symbol prefixes, units, index runs, its MOD GUI), or says it cannot with
confidence and leaves the plugin as it is (<a href="/projects/omx-panel/group-inference">docs/group-inference.md</a>).</li>
<li>The complement: <code>omx-complement-sync</code> (<code>omx-panel complement</code>) carries those groups to lilv, for jalv on the Zynthian
touchscreen: for an installed bundle with a plugin to group it writes, beside omx-modgui-sync's GUIs, a bundle that
restates the installed TTL, adds the groups and raises <code>lv2:microVersion</code> by one, so lilv loads it in place of the
installed one. The installed files are never touched; a marker makes a second run write nothing, a run removes the
bundles of its own no longer wanted (the installed bundle gone, changed or needing no groups now), and deleting the
bundle restores the plugin as installed (<a href="/projects/omx-panel/lv2-complement">docs/lv2-complement.md</a>, <code>omx-complement-sync(1)</code>).</li>
<li>The skin package: its schema, <code>omx-panel validate</code>, and its facts as a module (<code>src/skin-package.ts</code>: the
directory name, the override and how it applies, the licence allow-list, the refusal codes)
(<a href="/projects/omx-panel/skin-package">docs/skin-package.md</a>).</li>
<li>The importer: <code>omx-panel import</code> turns a MOD GUI bundle into a skin package.</li>
<li>The widgets a panel names (<code>schema/panel.schema.json</code>): knob, fader, switch, selector.</li>
<li>A worked example: a third-party LV2 plugin (ZamComp) and CLAP plugin (LSP Limiter Mono) from the scan to a
generated panel, and where Zynthian reads the LV2 one (<a href="/projects/omx-panel/worked-example">docs/worked-example.md</a>).</li>
</ul>
<h2 id="install">Install</h2>
<p><code>omx-panel</code> comes as an RPM and a DEB, each carrying the tools, the schema and the skins directory, and as
<code>@openmixer/omx-panel</code> on npm (<code>npm install @openmixer/omx-panel</code>).</p>
<p>Fedora 44, x86_64 or aarch64:</p>
<pre><code>sudo dnf install https://www.openmixer.org/rpm/openmixer-release.noarch.rpm
sudo dnf install omx-panel
</code></pre>
<p>Debian bookworm and trixie, amd64 or arm64 (also Raspberry Pi OS and Zynthian):</p>
<pre><code>curl -fsSLO https://www.openmixer.org/deb/openmixer-release.deb &amp;&amp; sudo apt install ./openmixer-release.deb
sudo apt install omx-panel
</code></pre>
<p>To build from source, see <a href="https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/BUILDING.md">BUILDING.md</a>.</p>
<h2 id="for-a-plugin-author">For a plugin author</h2>
<p>A skin package is a directory named after the plugin, holding a <code>skin.json</code> that says how the plugin's panel is
drawn: its sections, labels and displays, the art it brings, and the licence of everything in it. The plugin's
own description keeps every range, unit and scale; the skin refers to controls by id. The format is described
in <a href="/projects/omx-panel/skin-package">docs/skin-package.md</a>; <code>omx-panel validate</code> checks a package before it is installed.</p>
<p>A plugin with no MOD GUI gets one from its descriptor: <code>omx-panel modgui --descriptor &lt;file&gt; --out &lt;bundle.lv2&gt;</code>
writes <code>modgui.ttl</code> and <code>modgui/</code> into the bundle, every control drawn with its own travel and default.
<code>omx-panel descriptors --installed</code> lists the installed descriptor files, one path per line.</p>
<p>A plugin that already ships a MOD GUI does not start from nothing: the importer reads the bundle's <code>modgui.ttl</code> and the plugin's licence and writes a skin package from them, one
section in port order, the labels from the port names and the screenshot as the backdrop. A bundle whose licence
is missing or not on the allow-list is refused with a named code and nothing is written.</p>
<p>Licence: GPL-3.0-or-later (<code>LICENSE</code>).</p>
`},{slug:`compare`,src:`docs/compare.md`,title:`Compare A/B/C/D and undo`,source:`https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/docs/compare.md`,toc:[{id:`the-document`,title:`The document`},{id:`the-operations`,title:`The operations`}],html:`<h1 id="compare-a-b-c-d-and-undo">Compare A/B/C/D and undo</h1>
<p><code>tools/compare.mjs</code> holds four unnamed sets of a processor's control values, and an undo ring, as pure functions: a
document and the running values in, a new document and the parameter moves out. A host reads its values, calls the
function, applies the moves through its own parameter door, and stores the document with its session. It works for any plugin:
it only ever moves parameters. Presets are not touched.</p>
<p>JavaScript imports <code>@openmixer/omx-panel/compare</code>. Any other host runs the command, one JSON object in, one out:</p>
<pre><code>omx-panel compare switch --to B     { &quot;doc&quot;: ..., &quot;values&quot;: { ... } }
omx-panel compare copy --to C       { &quot;doc&quot;: ..., &quot;values&quot;: { ... } }
omx-panel compare undo              { &quot;ring&quot;: ..., &quot;captures&quot;: [ { ... } ], &quot;values&quot;: { ... } }
omx-panel compare redo              { &quot;ring&quot;: ..., &quot;values&quot;: { ... } }
                                 -&gt; { &quot;doc&quot;: ..., &quot;ring&quot;: ..., &quot;moves&quot;: [ { &quot;symbol&quot;: &quot;ratio&quot;, &quot;value&quot;: 3 } ], &quot;unknown&quot;: [ ] }
</code></pre>
<p>Leave out <code>doc</code> or <code>ring</code> for a new one. <code>captures</code> is a queue of value sets to take before the step, in order, so a
host starts no process while a knob turns. A refusal exits 1 and names its code on stderr; a usage error exits 2.</p>
<h2 id="the-document">The document</h2>
<pre><code class="language-json">{ &quot;format&quot;: &quot;org.openmixer.compare/1&quot;, &quot;active&quot;: &quot;A&quot;,
  &quot;slots&quot;: { &quot;A&quot;: { &quot;threshold&quot;: -18, &quot;ratio&quot;: 3 }, &quot;C&quot;: { &quot;threshold&quot;: -30, &quot;ratio&quot;: 8 } } }
</code></pre>
<p><code>slots</code> holds the slots used. Values are finite numbers, under whatever key the host names a control by.</p>
<h2 id="the-operations">The operations</h2>
<table>
<thead>
<tr>
<th>Function</th>
<th>Does</th>
<th>Moves</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>switchTo(doc, values, to)</code></td>
<td>stores the running values in the slot left and makes <code>to</code> the running one</td>
<td>one per control that differs from <code>to</code>, sorted by symbol; none when <code>to</code> is empty, which takes a copy</td>
</tr>
<tr>
<td><code>copyTo(doc, values, to)</code></td>
<td>puts the running values in <code>to</code></td>
<td>none</td>
</tr>
<tr>
<td><code>capture(ring, values)</code></td>
<td>keeps the values as a step; the same values twice are one step, and a new step ends what could be redone; at most 64</td>
<td>none</td>
</tr>
<tr>
<td><code>undo(ring, values)</code>, <code>redo(ring, values)</code></td>
<td>steps back or forward, keeping the running values on the other side</td>
<td>to the step's values; none at either end</td>
</tr>
</tbody>
</table>
<p>A control a slot holds that the running plugin does not is named in <code>unknown</code>, not moved, and kept in the slot. A control the
slot lacks keeps its value.</p>
<table>
<thead>
<tr>
<th>Refusal</th>
<th>When</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>COMPARE_NO_SLOT</code></td>
<td>a slot that is not <code>A</code>, <code>B</code>, <code>C</code> or <code>D</code></td>
</tr>
<tr>
<td><code>COMPARE_FORMAT</code></td>
<td>a document of another format</td>
</tr>
<tr>
<td><code>COMPARE_VALUE</code></td>
<td>a value that is no finite number</td>
</tr>
<tr>
<td><code>COMPARE_COPY_TO_RUNNING</code></td>
<td>a copy onto the slot running</td>
</tr>
</tbody>
</table>
<p>Only parameters move: a plugin's non-parameter state stays where it is, so a plugin whose sound lives in its state compares
only what its parameters reach.</p>
`},{slug:`group-inference`,src:`docs/group-inference.md`,title:`Port-group inference for LV2 plugins`,source:`https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/docs/group-inference.md`,toc:[{id:`the-inputs`,title:`The inputs`},{id:`the-verdict`,title:`The verdict`},{id:`the-rules-in-this-order`,title:`The rules, in this order`},{id:`confident`,title:`Confident`},{id:`measured`,title:`Measured`}],html:`<h1 id="port-group-inference-for-lv2-plugins">Port-group inference for LV2 plugins</h1>
<p>Most installed LV2 plugins declare no port groups, so a consumer that draws screens per group (the Zynthian
touchscreen cuts each group into screens of four) shows them as screens of four in port order.
<code>tools/group-infer.mjs</code> (<code>@openmixer/omx-panel/group-infer</code>) infers the groups such a plugin lacks from what it
already states, or says it cannot with confidence. It is the rule set of plugin-hostd#218 (step G1): a pure
function, no file written. The bundle that carries the result to lilv is <a href="/projects/omx-panel/lv2-complement">lv2-complement.md</a>'s (G2).</p>
<pre><code class="language-js">import { readBundle } from '@openmixer/omx-panel/modgui-import';
import { inferGroups, pluginUris, readPluginPorts, readModguiLayout } from '@openmixer/omx-panel/group-infer';

const triples = readBundle('/usr/lib64/lv2/fil4.lv2');            // the bundle's TTL, through tools/turtle-read.mjs
for (const uri of pluginUris(triples)) {
  const verdict = inferGroups(readPluginPorts(triples, uri), readModguiLayout(triples, uri));
}
</code></pre>
<h2 id="the-inputs">The inputs</h2>
<ul>
<li><strong>The ports</strong> (<code>readPluginPorts</code>): per port its <code>lv2:symbol</code>, <code>lv2:name</code>, <code>lv2:index</code>, whether it is a control
input, <code>lv2:designation</code>, <code>units:unit</code>, the <code>pg:group</code> it already has, and <code>pprops:notOnGUI</code>; and per group node the
plugin states, its <code>lv2:symbol</code>, <code>lv2:name</code> (else <code>rdfs:label</code>) and <code>lv2:displayPriority</code>.</li>
<li><strong>The MOD GUI layout</strong> (<code>readModguiLayout</code>): the ports the plugin's own <code>modgui:gui</code> puts on its face, in their
order, or <code>null</code> when the plugin has none (a <code>modgui:gui</code> on the plugin's URI, the test omx-modgui-sync makes).</li>
</ul>
<p>The rules place the <strong>placeable controls</strong>: control input ports, not marked <code>notOnGUI</code>, and not driven by the host
(<code>lv2:enabled</code>, the touchscreen's bypass; <code>lv2:freeWheeling</code>, <code>lv2:latency</code>, <code>param:bypass</code>, <code>param:sampleRate</code>, the
<code>time:</code> designations). A port that is not placeable needs no group.</p>
<h2 id="the-verdict">The verdict</h2>
<ul>
<li><code>{ outcome: 'nothing-to-do', reason }</code>: <code>own-groups-complete</code> (every placeable control already carries a <code>pg:group</code>
whose node has an <code>lv2:symbol</code>, which is what the touchscreen needs), <code>fits-one-screen</code> (four placeable controls or
fewer and no groups: one screen already holds them) or <code>no-controls</code>. The plugin is left exactly as it is. Our own
omx-plugins bundles are the first case: their groups carry <code>lv2:symbol</code> and <code>rdfs:label</code>, and the missing
<code>lv2:name</code> and <code>lv2:displayPriority</code> are added at their source, in omx-plugins.</li>
<li><code>{ outcome: 'grouped', groups, placedBy }</code>: each group has <code>symbol</code> (an <code>lv2:symbol</code>), <code>name</code> (its <code>lv2:name</code>),
<code>displayPriority</code> (its <code>lv2:displayPriority</code>), <code>ports</code> (its members <strong>by port symbol</strong>, never by blank node: a
plugin's ports are anonymous nodes, their symbols are stable), <code>rule</code> (the rule that made it) and, for a group the
plugin itself states, <code>node</code> (that node). <code>placedBy</code> maps each control's symbol to the rule that placed it.</li>
<li><code>{ outcome: 'no-confident-grouping', reason, detail, attempt }</code>: the plugin is left exactly as it is, never given a
guessed layout. <code>attempt</code> is what the rules found, for a diagnosis only.</li>
</ul>
<p>Groups are ordered by their first control's <code>lv2:index</code>, the order the plugin's author chose and the touchscreen shows
without a complement. <code>displayPriority</code> (higher is shown first): when every group the plugin states itself carries an
<code>lv2:displayPriority</code>, those keep theirs and the generated groups follow below the lowest of them, in port order;
otherwise every group counts down from the number of groups, in port order, so the first group is shown first. A
generated group under a plugin's own priorities therefore shows after all of the plugin's groups, even when its
controls come first in port order: the plugin's stated order is its author's word, and ours is only inferred, so ours
never outranks it.</p>
<h2 id="the-rules-in-this-order">The rules, in this order</h2>
<p>Each rule sees only the controls no earlier rule placed, and never moves a control an earlier rule placed. A rule
never makes a group of fewer than two controls, nor one holding every control (that is the plugin as it is, with a
title).</p>
<ol>
<li><strong>The plugin's own <code>pg:group</code> assignments</strong>, partial or whole. The plugin's node, symbol and name are kept, and its
priority as above;
a node with no <code>lv2:symbol</code> gets one from its IRI.</li>
<li><strong><code>lv2:designation</code></strong>, through the LV2 parameters vocabulary: attack, decay, sustain, release, hold and delay are an
Envelope (attack, release and hold are Dynamics in a plugin that also designates a threshold or a ratio);
threshold and ratio Dynamics; cutoff frequency and resonance a Filter; waveform, pulse width, frequency and
amplitude an Oscillator; gain, wet, dry and wet/dry an Output.</li>
<li><strong>A shared name or symbol prefix</strong>, in four passes (<code>PREFIX_PASSES</code>): the symbol's trailing number, the name's
trailing number, the name's leading word, the symbol's leading word. The symbol's number comes first because a
symbol numbers a band the same way on every control (<code>xs_9</code>, <code>g_9</code>) where a name may print its frequency
(&quot;Band gain 1K&quot;, &quot;31.5&quot;) and number nothing:
<ul>
<li>a shared trailing number, when it is the only number in the name and the plugin repeats it (at least two numbers,
each on at least two controls): one group per number. The label's number is the names' own when the
names number the same controls into the same groups (swh's <code>f0</code>, <code>fb0</code> are &quot;Frequency 1&quot;, &quot;Feedback 1&quot;: &quot;Group
1&quot;), else the pass's, counted from 1 when a symbol counts from 0. Its word is the first word every name of the
group starts with (&quot;Band 1 gain&quot; -&gt; &quot;Band 1&quot;), else a section word among its controls' names or symbols
(<code>SECTION_WORDS</code>: band, section, channel, ch, osc, oscillator, voice, step, tap, stage, lfo, env, envelope,
part, layer, op, operator; so &quot;Frequency 1&quot;, &quot;Gain 1&quot;, &quot;Section 1&quot; are &quot;Section 1&quot;), or held anywhere in more than
half the group's names (&quot;Solo band 1&quot;, &quot;Mute band 1&quot;, &quot;Band gain 1&quot; beside &quot;Hue 1&quot;: &quot;Band 1&quot;), else &quot;Group&quot;. A
label an earlier group already holds is never emitted with a &quot; 2&quot;: the pass places nothing for that group. A stem is
numbered only when its whole pattern is: every control whose word after the stem starts with a digit lands in a numbered group, or the pass
places none of that stem's controls (&quot;Band gain 16&quot; ... &quot;Band gain 1K&quot; is left to the next pass). And the numbers
must be one numbering: the pattern is the number set most stems carry; a stem with it, or with it less its last
number (the last band lacking a control), belongs; a stem numbered inside it but fewer is another thing (mixtri's
two triggers) and is left to the next pass; a stem numbered outside it is an unrelated numbering (AMS advenv:
attack stages 1-4, release stages 1-3) and the pass places nothing; and every numbered group holds the same stems,
at most one group lacking one;</li>
<li>a shared leading word (&quot;Highpass Frequency&quot;, &quot;Highpass Resonance&quot;), or the first two when the second is a number
and more follows (&quot;Band 1 Freq&quot;, <code>b1_freq</code>); a control whose whole name is that word joins it (&quot;Highpass&quot;).
Controls that differ only by a trailing number (<code>tuning</code>, <code>tuning_2</code>, <code>tuning_3</code>) are one parameter repeated
across sections, not a section, and this pass places nothing for them (grouping them would lay the plugin out
transposed, one screen per parameter), unless what they share holds a number itself (<code>mix_0_0</code>, <code>mix_0_1</code>: row 0
of a matrix) and no control is that stem alone (DrumSynth's <code>freq1</code> is the first
copy of <code>freq1_2</code>, <code>freq1_3</code>). Likewise a numbered group may hold each stem once: two &quot;O-Env-T1&quot; in group 1
(DrumSynth's voices) mean the numbers are not the sections.
When every control of an earlier group shares the key, the controls join that group rather than cut the
section in two (&quot;VCF Freq&quot; and &quot;VCF Reso&quot;, rule 2's Filter, take &quot;VCF Env&quot;); a key two earlier groups share
joins neither.</li>
</ul>
</li>
<li><strong>A shared <code>units:unit</code></strong> (the same IRI): Hz is Frequency, dB Level, ms and s Time, % and coef Amount, degree
Phase, semitone and octave Pitch, cent Tuning; another unit is named by its label.</li>
<li><strong>A contiguous run of <code>lv2:index</code></strong>: controls next to each other in index order (other ports between them do not
break a run), none placed: &quot;General&quot; at the start of the plugin, &quot;More&quot; elsewhere. A run carries no meaning of its
own; it fills the gaps between groups the plugin's words found.</li>
<li><strong>The plugin's own MOD GUI layout</strong>: the controls its face shows are &quot;Main&quot;, the ones it leaves off &quot;More&quot;.</li>
</ol>
<p>The order is part of the contract: <code>inferGroups(plugin, modgui, { rules, prefixPasses })</code> takes another order of the
rules, or of rule 3's passes, for tests only.</p>
<h2 id="confident">Confident</h2>
<p>A grouping is confident, and returned, only when all of these hold; the thresholds are constants of the module, each
with its reason:</p>
<table>
<thead>
<tr>
<th>constant</th>
<th>value</th>
<th>the grouping must</th>
<th>why</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>MAX_UNPLACED</code></td>
<td>0</td>
<td>place every placeable control</td>
<td>an unplaced control falls into the consumer's catch-all (&quot;Params&quot;) beside ours, a layout nobody inferred</td>
</tr>
<tr>
<td><code>MIN_GROUP_SIZE</code></td>
<td>2</td>
<td>(not checked: no rule creates a group under it; the plugin's own groups are kept whatever their size)</td>
<td>a screen with one control is worse than port order</td>
</tr>
<tr>
<td><code>MIN_GROUPS</code></td>
<td>2</td>
<td>have at least two groups</td>
<td>one group is the plugin as it is, with a title</td>
</tr>
<tr>
<td><code>MAX_GROUPS</code></td>
<td>32</td>
<td>have at most 32 groups</td>
<td>a ceiling, not a need: 32 screens of sections is already more than anyone pages through. A 32-band equaliser with its input and output groups does not fit (LSP's x32 needs 36) and is refused; wider, the rules are more likely slicing a sequencer or a matrix</td>
</tr>
<tr>
<td><code>MAX_INDEX_RUN_SHARE</code></td>
<td>0.5</td>
<td>place at most half its controls by rule 5</td>
<td>when index runs are most of the plugin, the grouping is port order cut at arbitrary points</td>
</tr>
<tr>
<td><code>SCREEN_SIZE</code></td>
<td>4</td>
<td>(not asked: four controls or fewer is nothing to do)</td>
<td>one touchscreen screen holds four</td>
</tr>
</tbody>
</table>
<p>Otherwise the verdict names the first condition that failed: <code>unplaced-controls</code>, <code>too-few-groups</code>,
<code>too-many-groups</code> or <code>mostly-by-index</code>.</p>
<h2 id="measured">Measured</h2>
<p>Over the 979 plugins installed on a Fedora 44 desk: 333 fit one screen, 98 have no controls, 40 carry
their own complete groups (all 19 of omx-plugins among them), 84 are grouped, and 424 have no confident grouping
(402 with controls left in no group, 19 mostly by index, 3 with more than 32 groups). The thresholds favour leaving a
plugin alone over a guess; loosening <code>MAX_UNPLACED</code> is the one change that would group most of the rest.</p>
<p>The tests (<code>test/group-infer.test.mjs</code>) run the rules over TTL copied from installed plugins: swh, Calf, x42, CAPS,
ZamAudio, MDA, LSP and our own (<code>test/fixtures/lv2-groups</code>, provenance and licences in its <code>SOURCES</code>).</p>
`},{slug:`lv2-complement`,src:`docs/lv2-complement.md`,title:`The LV2 complement: a replacing bundle with the inferred port groups`,source:`https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/docs/lv2-complement.md`,toc:[{id:`why-a-replacing-bundle`,title:`Why a replacing bundle`},{id:`what-is-written`,title:`What is written`},{id:`what-is-not-written`,title:`What is not written`},{id:`what-is-removed`,title:`What is removed`},{id:`where-it-runs-and-whether-lilv-sees-it`,title:`Where it runs, and whether lilv sees it`},{id:`the-search-order-the-same-result-not-the-same-cost`,title:`The search order: the same result, not the same cost`},{id:`measured`,title:`Measured`},{id:`open-for-review`,title:`Open for review`}],html:`<h1 id="the-lv2-complement-a-replacing-bundle-with-the-inferred-port-groups">The LV2 complement: a replacing bundle with the inferred port groups</h1>
<p><code>tools/group-infer.mjs</code> (<a href="/projects/omx-panel/group-inference">group-inference.md</a>) infers the port groups an LV2 plugin lacks.
<code>tools/lv2-complement.mjs</code> (<code>omx-panel complement</code>, run at install time by <code>omx-complement-sync</code>) carries them to
the programs that read plugins through lilv, the Zynthian touchscreen's jalv first: plugin-hostd#218, step G2.</p>
<pre><code>omx-panel complement --out &lt;dir&gt; [--lv2-path &lt;a:b:...&gt;] [--state &lt;dir&gt;] [--only &lt;bundle.lv2&gt;]... [--dry-run | --check] [--verbose]
omx-complement-sync [--dry-run] [--verbose] | --check
</code></pre>
<h2 id="why-a-replacing-bundle">Why a replacing bundle</h2>
<p>A second bundle that only adds <code>pg:group</code> to a plugin cannot work: a plugin's ports are blank nodes, local to the file
that states them, so another file has nothing to attach a group to. What lilv does offer is its duplicate rule: a
bundle that declares a plugin already loaded <strong>replaces</strong> it when its <code>lv2:minorVersion</code>/<code>lv2:microVersion</code> is newer,
and is dropped when it is equal or older (lilv <code>world.c</code>, <code>lilv_world_load_bundle</code>; the order of the search list does
not change which bundle wins, it is a comparison; it changes what the load costs, <a href="#the-search-order-the-same-result-not-the-same-cost">below</a>). lilv reads a version only when both values are stated, with <code>atoi</code>; otherwise it is
0.0.</p>
<p>lilv drops the <strong>whole</strong> old bundle when one of its plugins is replaced (&quot;Dropping old bundle&quot;): replacing MDA's
RezFilter alone left one of MDA's 36 plugins listed. So the unit the writer works on is the installed bundle, not the
plugin. For a bundle with one plugin to group it writes a bundle that restates every plugin of it, each one bumped;
the groups go to the grouped plugins only, the others are restated unchanged.</p>
<h2 id="what-is-written">What is written</h2>
<h3 id="the-name">The name</h3>
<p><code>omx-complement-&lt;name&gt;.lv2</code>, <code>&lt;name&gt;</code> the bundle's basename without <code>.lv2</code>, characters outside <code>A-Za-z0-9._-</code>
replaced by <code>_</code>. When another installed bundle would take the same name (one basename in two folders of the search
list, or basenames that differ only in the characters replaced), every bundle sharing it is named
<code>omx-complement-&lt;name&gt;-&lt;hash&gt;.lv2</code> instead, <code>&lt;hash&gt;</code> the first eight hex digits of the SHA-256 of the installed
bundle's absolute path. The hash depends on the path alone, so the name is stable between runs, and both bundles are
written: a name of ours that collides is our naming problem, never a reason to refuse a plugin. The marker names the
installed bundle, so the stale-bundle removal below is exact on the derived name. A bundle whose basename is alone
keeps the plain name; when a second bundle of that basename appears (or the other goes), the plain and the derived
names are swapped by the ordinary removal of the bundle of ours that is no longer wanted.</p>
<p>For an installed bundle <code>&lt;dir&gt;/&lt;name&gt;.lv2</code> holding at least one plugin whose verdict is <code>grouped</code>, the bundle
<code>&lt;out&gt;/omx-complement-&lt;name&gt;.lv2</code> holds:</p>
<ul>
<li>
<p><strong>every TTL file lilv reads for it</strong>, restated: <code>manifest.ttl</code> and each file a plugin's <code>rdfs:seeAlso</code> names there
(what lilv's <code>load_plugin_model</code> reads). Each file is parsed by <code>tools/turtle-read.mjs</code> and written back statement
for statement: every IRI as the reader resolved it (absolute), every literal with its own lexical form and datatype
or language (<code>+30</code>, <code>0.0</code>, <code>1e-05</code> stay as written; a number is written as a number only when the reader would read
it back as the same lexical form and type), every blank node under a label prefixed by its file (<code>_:f1_b12</code>): lilv
keeps each file's blank nodes apart, a tool that reads all the files into one graph (sord_validate) does not.
Nothing is retyped and nothing is left out; comments are not statements and are not carried.</p>
</li>
<li>
<p><strong><code>rdfs:seeAlso</code> pointing at the restated files</strong> (written relative, <code>&lt;plugin.ttl&gt;</code>), so lilv reads ours; any other
<code>rdfs:seeAlso</code> (a preset, a UI) still names the installed file.</p>
</li>
<li>
<p><strong><code>lv2:binary</code> unchanged</strong>: the reader resolved it to the installed library's absolute <code>file:</code> IRI, which resolves
from anywhere. Every other entry of the installed bundle (the library, presets, a MOD GUI, resources) is linked in
by a symbolic link, because lilv hands a plugin its bundle path (ours now) and some plugins read their own files
from there.</p>
</li>
<li>
<p><strong>the version</strong>: each plugin's <code>lv2:minorVersion</code> and <code>lv2:microVersion</code> statements are dropped and <code>manifest.ttl</code>
states <code>lv2:minorVersion</code> = the installed value (0 when none) and <code>lv2:microVersion</code> = the installed value + 1 (1
when none). A plugin stating only a minor version (lilv reads 0.0) keeps its minor.</p>
</li>
<li>
<p><strong>the groups</strong>: for each group of the verdict, a node <code>&lt;#&lt;plugin&gt;-&lt;symbol&gt;&gt;</code> in the file that states the plugin's
ports, typed <code>pg:Group</code>, with <code>lv2:symbol</code>, <code>lv2:name</code> and <code>lv2:displayPriority</code>, and <code>pg:group</code> on each of its
ports, found by <code>lv2:symbol</code> in that file. A group the plugin states itself (rule 1) keeps its own node: only what
that node lacks of <code>lv2:symbol</code>, <code>lv2:name</code> and <code>lv2:displayPriority</code> is added, and a port that already carries a
<code>pg:group</code> keeps it. A generated node never merges into one already there: <code>&lt;#&lt;plugin&gt;-&lt;symbol&gt;&gt;</code> is resolved as the
Turtle reader resolves it, against the installed file (what the plugin's own <code>&lt;#…&gt;</code> of that fragment means) and
against the written file at its target (what lilv will read), and when either IRI is one the bundle already states,
or another grouped plugin of the same file would take the same node (two plugin URIs ending in the same word), the
bundle is refused (<code>group-iri-collision</code>). Refused rather than given a suffix: a node whose name cannot be predicted
from the plugin and the group symbol would surprise whoever looks it up, and over the 979 plugins on the desk the
guard refuses none (37 bundles, 84 grouped plugins, as before), so the conservative choice costs nothing measured.</p>
</li>
<li>
<p><strong>the marker</strong> <code>.omx-complement-sync</code>, in the bundle, as omx-modgui-sync marks its own with <code>.omx-modgui-sync</code>:</p>
<pre><code>/usr/lib64/lv2/triple_para-swh.lv2
writer &lt;sha256 of lv2-complement.mjs, group-infer.mjs and turtle-read.mjs&gt;
source-sha256 &lt;sha256 of the installed TTL files read, name and bytes&gt;
plugin http://plugin.org.uk/swh-plugins/triplePara 0.0 0.1 grouped 5
file manifest.ttl &lt;sha256&gt;
file plugin.ttl &lt;sha256&gt;
</code></pre>
<p>The first three lines decide: a bundle whose marker names the same installed bundle, writer and content hash is up
to date and is not written again (a second run writes nothing, byte for byte the same tree). A changed installed
file (an upgrade) or a changed rule rewrites it (<code>replaced …</code>, the line saying which changed). A directory of our
name <strong>without</strong> the marker is never written. Deleting the bundle is the whole removal; lilv loads the installed
bundle again.</p>
</li>
</ul>
<p><code>lv2:displayPriority</code> is what zynthian-ui reads on a group node (<code>zyngine/zynthian_lv2.py</code>). It is not in the LV2
vocabulary (the port-props extension defines <code>pprops:displayPriority</code>, for a port), so <code>sord_validate</code> reports it as an
undefined property: over the 37 bundles written on the desk, those are the only messages it gives on ours that it does
not give on the installed files.</p>
<h2 id="what-is-not-written">What is not written</h2>
<ul>
<li>A bundle none of whose plugins is <code>grouped</code>: a plugin that carries its own groups (our omx-plugins, synthv1, x42
matrixmixer), fits one screen, or has no confident grouping is left exactly as it is, no bundle and no marker.</li>
<li>The installed files: never opened for writing.</li>
<li>A bundle the restatement cannot carry is <strong>refused</strong>, named on its own line with the reason, counted in the summary,
and never written (step G4 decides what the proxy fallback does with these):
<ul>
<li><code>ttl-unreadable</code>: a file the reader cannot parse (<code>ttl-missing</code>: a <code>rdfs:seeAlso</code> file that does not exist);</li>
<li><code>version-ceiling</code>: a version past lilv's <code>int</code> (2147483647), or a micro version a bump would take past it;
<code>version-unreadable</code>: a version that is not an integer; <code>version-not-newer</code>: a bump that would still not be newer;</li>
<li>more than one subject for the URI: <code>version-ambiguous</code> (two values of <code>lv2:minorVersion</code> or <code>lv2:microVersion</code>),
<code>binary-ambiguous</code> (two <code>lv2:binary</code>; <code>no-binary</code> for none), <code>plugin-in-several-bundles</code> (the plugin URI declared by
two installed bundles: lilv picks between them by version, and the restatement cannot say which it replaces),
<code>port-symbol-ambiguous</code> (two ports of one symbol);</li>
<li><code>dynamic-manifest</code>, <code>data-outside-bundle</code> (a plugin's <code>rdfs:seeAlso</code> outside its bundle), <code>ports-split-across-files</code>;</li>
<li><code>group-iri-collision</code>: a generated group node whose IRI the bundle already states, or that two grouped plugins of
one file would share (above).</li>
</ul>
</li>
</ul>
<p>A name taken by two installed bundles is never a refusal (below).</p>
<h2 id="what-is-removed">What is removed</h2>
<p>A bundle of ours left in place past its time does harm: its bumped version keeps winning, so it would hide an upgraded
plugin behind the old restatement, or keep a removed one listed with a library that is gone. So each run, after
writing, removes every bundle of ours it did not find up to date or write again, as omx-modgui-sync removes its GUIs,
one line each naming the bundle and why (<code>removed &lt;bundle&gt;: &lt;installed bundle&gt;: &lt;reason&gt;</code>):</p>
<ul>
<li>its installed bundle is gone, or no longer on the search list (the package was removed);</li>
<li>its installed bundle changed (the content hash in the marker no longer matches) into one the writer refuses (the
reason is the refusal's), or that declares no plugin;</li>
<li>none of the installed bundle's plugins comes out <code>grouped</code> on the current rules (the rules changed, or the upgrade
brought the plugin's own groups).</li>
</ul>
<p>An installed bundle that changed and still has a plugin to group is written again, which replaces ours whole. Ours is
a directory named <code>omx-complement-*.lv2</code> that holds the marker, and only that is ever removed: a directory without the
marker, one of another name, or a symbolic link to a marked directory is left alone. With <code>--only</code>, only the bundles
written for the bundles named are considered. Once ours is deleted lilv loads the installed bundle again (the test
proves it through python3-lilv, and <code>lv2info</code> shows it, below).</p>
<p><code>--dry-run</code> prints <code>would remove …</code> for each and removes nothing. <code>--check</code> writes and removes nothing and names each
bundle of ours that is <code>stale</code> (the sync removes it) or <code>out of date</code> (the sync writes it again; a bundle not written
yet is named <code>missing</code> and is not stale); it exits 3 when there is one, 0 when there is none, 1 when it cannot run, 2
on usage.</p>
<h2 id="where-it-runs-and-whether-lilv-sees-it">Where it runs, and whether lilv sees it</h2>
<p><code>omx-complement-sync</code> (<code>bin/</code>) is omx-modgui-sync's twin and runs beside it: the same shell shape calling omx-panel,
the same <code>/etc/omx/modgui-sync.conf</code>, the same directories, the same opt-in unit (<code>omx-complement-sync.service</code>,
installed and never enabled) queued by the same drop-in on <code>plugin-qualify-sync.service</code> after each scan, the same
<code>--dry-run</code> and <code>--check</code>.</p>
<p>What triggers a run, once the unit is enabled: plugin-qualify's package triggers (rpm <code>%transfiletriggerin</code> and
<code>%transfiletriggerpostun</code>, dpkg <code>interest-noawait</code>) on <code>/usr/lib/lv2</code>, <code>/usr/lib64/lv2</code> and <code>/usr/local/lib/lv2</code> fire
once per package transaction that installs, upgrades or removes a file there, and start <code>plugin-qualify-sync.service</code>;
its path unit does the same for a change in those folders (and the ones <code>qualify.conf</code> adds) outside a package
manager; its timer runs it after boot. When that scan finishes, the drop-in
(<code>plugin-qualify-sync.service.d/omx-complement-sync.conf</code>) queues <code>omx-complement-sync.service</code> from <code>ExecStartPost</code>,
so a removal or an upgrade is followed by the removal or the rewrite of our bundle within the scan's minute of quiet
plus its run. Two limits: <code>ExecStartPost</code> runs only when the scan exits 0 (plugin-qualify-sync exits 0 whatever its
verdicts and 2 when it cannot run, and then this waits for the next scan); and in a transaction without systemd (an
image build, a chroot) the trigger runs the scan directly, with no unit and no drop-in, so the complement follows at the
next boot (the unit is <code>WantedBy=multi-user.target</code>). Our own writes and removals in <code>/usr/local/lib/lv2</code> are changes
the path unit sees too: they queue one more scan, after which the complement finds everything up to date and changes
nothing. It writes its bundles where omx-modgui-sync writes its GUIs: <code>MODGUI_DIR</code>, by default
<code>/usr/local/lib/lv2</code> for root (<code>~/.lv2</code> for a user); its work files go under <code>STATE_DIR</code> (<code>/var/lib/omx/modgui-sync</code>),
outside the LV2 path, and each bundle is moved in whole.</p>
<p>lilv loads the bundles only from its own <code>LV2_PATH</code>. On Zynthian, <code>/usr/local/lib/lv2</code> is on it: <code>zynthian_envars*.sh</code>
(zynthian-sys) export <code>LV2_PATH=/usr/lib/lv2:/usr/lib/&lt;arch&gt;/lv2:/usr/local/lib/lv2:...</code>, which zynthian-ui and the
jalv it spawns per plugin inherit, and the mod-host and mod-ui units carry the same list. zynthian-sys gives
omx-modgui-sync a drop-in that sets that <code>LV2_PATH</code>; <code>omx-complement-sync.service</code> needs the same drop-in there, so it
reads the plugins Zynthian loads. <code>omx-complement-sync --check</code> says whether <code>MODGUI_DIR</code> is on the search list. A
complemented plugin's MOD GUI from omx-modgui-sync still applies: that bundle declares no plugin, only GUI statements
about the plugin URI, which lilv merges whatever bundle the plugin itself comes from.</p>
<h2 id="the-search-order-the-same-result-not-the-same-cost">The search order: the same result, not the same cost</h2>
<p>Whether <code>MODGUI_DIR</code> comes before or after the installed folders on <code>LV2_PATH</code>, lilv ends with the same plugins, ours
in place of the installed ones (the version comparison decides, not the order). What the order changes is the work:
ours first, lilv meets the installed bundle second, finds it older and ignores it; ours last, it loads the installed
bundle, then meets ours, replaces every plugin of it, drops the old bundle and prints a line for each replacement.</p>
<p>Measured by the G2 review on the Fedora 44 desk with 979 plugins installed and the 37 bundles written, not
on a Zynthian: <code>lv2ls</code> takes 0.01 s over the installed folders alone, 0.03 s with ours first, and 0.37 s with ours
last, when lilv also prints 1398 replace lines. Zynthian's <code>zynthian_envars*.sh</code> puts <code>/usr/local/lib/lv2</code> after the
system folders, so on the touchscreen ours comes last: the costly order. Every program that builds a lilv world pays it
at start (zynthian-ui, each jalv it spawns, mod-host, mod-ui). Step G4 measures it on the Pi, where the figure that
matters is what it adds to jalv's start and to zynthian-ui's plugin scan. Nothing here changes the search order: it is
Zynthian's (and each distribution's) to set, and the result is the same either way.</p>
<h2 id="measured">Measured</h2>
<p>Over the 979 plugins installed on a Fedora 44 desk, in 4.8 s: 84 grouped, 471 nothing to do, 424 without
a confident grouping (G1's figures); 37 bundles written, holding 466 plugins (84 of them grouped), none refused, 25 MB
(LSP's restated bundle is 22 MB, its installed TTL 16.9 MB). With the bundles on <code>LV2_PATH</code>, <code>lv2ls</code> lists the same 979
plugins whatever the order of the search list; <code>lv2info</code> and python3-lilv load each complemented plugin from ours, at
the bumped version, with its groups, and instantiate it from the installed library; deleting a bundle loads the
installed one again. The removal, with <code>lv2info</code> over a scratch <code>LV2_PATH</code> (ours first, a copy of the installed
<code>triple_para-swh.lv2</code> second): a copy upgraded into one the writer refuses (<code>lv2:microVersion &quot;beta&quot;</code>) still loads ours
at 0.1 until the sync, which names it <code>stale</code> under <code>--check</code> (exit 3) and then removes it (&quot;it changed, and it is
refused now (version-unreadable …)&quot;), after which <code>lv2info</code> loads the installed copy with no groups; with the copy
deleted (the package removed) <code>lv2ls</code> still lists the plugin from ours, its binary gone, until the sync removes ours
(&quot;its installed bundle … is gone&quot;) and the plugin is no longer listed. The tests (<code>test/lv2-complement.test.mjs</code>) build installed-shaped bundles from G1's fixtures
(<code>test/fixtures/lv2-groups</code>) and prove each of these points, the lilv ones through python3-lilv when it is installed.</p>
<h2 id="open-for-review">Open for review</h2>
<ul>
<li>The group names are G1's: &quot;Group N&quot; when the names share no word, &quot;More&quot; / &quot;More 2&quot; for index runs (x42 stepseq's
notes fall to &quot;More&quot;).</li>
<li><code>lv2:displayPriority</code> versus the vocabulary's <code>pprops:displayPriority</code>, above: we write the term the touchscreen
reads.</li>
<li>A whole multi-plugin bundle is restated to group a few of its plugins (LSP: 30 of 194). The alternative, refusing
such bundles, would leave most of the grouped plugins without groups.</li>
</ul>
`},{slug:`modgui`,src:`docs/modgui.md`,title:`The MOD GUI generator`,source:`https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/docs/modgui.md`,toc:[{id:`the-look`,title:`The look`},{id:`the-test`,title:`The test`}],html:`<h1 id="the-mod-gui-generator">The MOD GUI generator</h1>
<p><code>tools/modgui-gen.mjs</code> writes a MOD GUI (MOD Devices' modgui, the format MOD and Zynthian draw) for one plugin,
from its <strong>descriptor</strong> (omx-contract <code>docs/descriptors.md</code>) and, when the plugin declares one, its <strong>panel</strong>.</p>
<pre><code>omx-panel modgui --descriptor &lt;file&gt; | --installed &lt;package&gt;/&lt;name&gt;
                 [--panel &lt;file&gt;] --out &lt;bundle.lv2&gt; [--stem &lt;name&gt;] [--source &lt;text&gt;] [--easy-first] [--check | --emit-stdout]
</code></pre>
<ul>
<li><code>--descriptor</code> names a descriptor file; <code>--installed omx-plugins/omx-delay</code> reads the one a package installed into
omx-contract's contract directory (<code>&lt;contractdir&gt;/3/&lt;package&gt;/plugins/&lt;name&gt;.json</code>).</li>
<li><code>--panel</code> names a JSON file holding the declared panel: <code>family</code>, <code>sections</code> (each <code>key</code>, <code>label</code>, <code>controls</code> by
symbol) and, optionally, <code>widgets</code> (symbol to <code>knob</code>, <code>fader</code>, <code>switch</code> or <code>selector</code>, the list in
<code>schema/panel.schema.json</code>) and <code>easy</code> (the controls of the Easy face). With none, the sections are the descriptor's groups, laid out by
<code>tools/panel-description.mjs</code>, and the family the one their meanings make.</li>
<li><code>--out</code> is the LV2 bundle the files go into: <code>modgui.ttl</code> and <code>modgui/</code>. <code>--stem</code> names the files
(<code>icon-&lt;stem&gt;.html</code>, <code>stylesheet-&lt;stem&gt;.css</code>, <code>screenshot-&lt;stem&gt;.png</code>, <code>thumbnail-&lt;stem&gt;.png</code>); it defaults to
the bundle's name without <code>.lv2</code>.</li>
<li><code>--source</code> is the text the files' banner names as what they were made from; it defaults to the descriptor and
the panel files.</li>
<li><code>--check</code> writes nothing and refuses a stale, missing or extra file byte for byte; <code>--emit-stdout</code> prints every
text file and one digest line per image.</li>
</ul>
<p>Every control's symbol, travel, default and label is the descriptor's. A toggle is a switch; a choice, or an
integer travel of at most 16 steps, a selector over its values; every other travel a knob. The template lays out
every section and every control; <code>modgui.ttl</code> lists the input controls of the first section as <code>modgui:port</code>. With <code>--easy-first</code> the Easy controls (<a href="/projects/omx-panel/panel-layout">panel-layout.md</a>) are that first section, so a pedal's listed ports are them; a plugin's package turns it on when it regenerates its committed files, and <code>omx-modgui-sync</code> always does.</p>
<p>A readout (a <code>readonly</code> control: a gain reduction, a level) has no travel to turn and no default. It is drawn as a
display: a frame in its cell carrying its symbol and its range, never a knob, a fader, a switch or a selector, and
never looked up as a control input. MOD's template binds input control ports by role (<code>input-control-port</code>) and
has no role for an output control port, so the frame carries none; it is not a <code>modgui:port</code> either. Showing the
reading live needs the bundle's own <code>modgui:javascript</code>, which this generator does not write. A declared panel
that names a widget for a readout is refused.</p>
<p>The images (the screenshot, the thumbnail, the knob film and the fader's when a control is one) are rasterised by
<code>tools/raster.mjs</code> from the template's own layout, each control at its default. The screenshot and the thumbnail
carry the plugin title, the section labels (one band per section, so per group of a grouped descriptor), and each
control's name and its default with unit; the thumbnail is the screenshot at half size. The text is set from the font
file the look names (<code>--font-file</code>, <code>tools/fonts/Inter-Regular.ttf</code>, SIL OFL 1.1, licence beside it), whose
outlines <code>tools/font.mjs</code> reads and <code>tools/raster.mjs</code> fills at the shapes' own sampling: no host font is consulted.
A fixed-code deflate and no zlib, so their bytes depend only on the descriptor, the panel and the look.</p>
<h2 id="the-look">The look</h2>
<p><code>tools/look/tokens.css</code> is the omx look's token cascade, the one source of the colours and the font a renderer
wears. <code>tools/look.mjs</code> resolves it at the look it names into <code>tools/look.json</code>, every colour a plain <code>#rrggbb</code>;
<code>omx-panel look --check</code> refuses a <code>look.json</code> that is not what the cascade resolves to.</p>
<h2 id="the-test">The test</h2>
<p><code>tools/modgui-test.sh &lt;bundle.lv2&gt; &lt;descriptor&gt; [&lt;panel&gt;]</code> holds a written MOD GUI to its descriptor on values:
the files are the generation byte for byte; every control is drawn in the template with its symbol, travel and
default (a readout with its symbol and range, as a display with no port role), and nothing undeclared is; every choice is a selector with each of its values; <code>sord_validate</code> accepts
the bundle against the LV2 specifications, <code>tools/modgui-terms.ttl</code> (the closed modgui vocabulary) and
omx-contract's resource-hint terms, and refuses a property outside that vocabulary; and a descriptor with its
first control's default moved makes <code>--check</code> fail on the template.</p>
`},{slug:`panel-layout`,src:`docs/panel-layout.md`,title:`Panel layout from a descriptor`,source:`https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/docs/panel-layout.md`,toc:[{id:`the-two-inputs`,title:`The two inputs`},{id:`units`,title:`Units`},{id:`meanings-and-roles`,title:`Meanings and roles`},{id:`the-family`,title:`The family`},{id:`the-widget`,title:`The widget`},{id:`sections-with-no-declared-panel`,title:`Sections with no declared panel`},{id:`pages`,title:`Pages`},{id:`the-easy-face`,title:`The Easy face`},{id:`verbatim`,title:`Verbatim`}],html:`<h1 id="panel-layout-from-a-descriptor">Panel layout from a descriptor</h1>
<p><code>tools/panel-description.mjs</code> lays out a plugin's panel from its <strong>descriptor</strong>: the words omx-contract
uses to describe one plugin, ours or anyone's (omx-contract <code>docs/descriptors.md</code>). A plugin from any
origin (<code>authored</code>, <code>built</code>, <code>scanned</code>) gets a layout; a plugin that declares its panel (omx-plugins'
do, in <code>&lt;stem&gt;.decl.json</code>) adds it on top, and what its faces serve as <code>org.openmixer.panel-description/1</code>
is this layout.</p>
<h2 id="the-two-inputs">The two inputs</h2>
<table>
<thead>
<tr>
<th>Input</th>
<th>Who has it</th>
<th>What it gives</th>
</tr>
</thead>
<tbody>
<tr>
<td>The descriptor</td>
<td>every plugin</td>
<td>each control's <code>kind</code>, <code>travel</code> (range, <code>unit</code>, <code>scale</code>, default), choice ids and labels, <code>label</code>, <code>group</code>, <code>meaning</code>, <code>hidden</code>, <code>readonly</code>; the <code>ports</code>; the <code>origin</code></td>
</tr>
<tr>
<td>The declared panel</td>
<td>a plugin that declares one (omx-plugins: <code>&lt;stem&gt;.decl.json</code>, <code>panel</code>)</td>
<td>the family, the section keys and labels, the order of the controls in each section, the roles, the widgets the panel names, the graphs, the per-placement come-up values</td>
</tr>
</tbody>
</table>
<p>This package reads descriptors, never a declaration. omx-plugins renders its declarations as their
<code>authored</code> descriptors (its <code>tools/descriptor.mjs</code>): one control per parameter, its id the parameter's
index, its name the symbol, its label the parameter's name; a toggle is a <code>toggle</code>, an integer travel
with labelled values a <code>choice</code>, every other parameter a <code>travel</code> with the declared unit and scale; its
<code>group</code> the label of the panel section that lists it; its <code>meaning</code> the one the declared role names
(below). The declared panel then goes to the layout unchanged.</p>
<h2 id="units">Units</h2>
<p>A control's unit is the descriptor's <code>travel.unit</code>. A role checks it against the units the
param-contract extension serves (<code>tools/vocabulary.mjs</code>, <code>servedToken</code>): a unit's token is the LV2 unit a
face writes for it, plugin-hostd's installed LV2 table read backwards, or the name of a unit in the
extension's vendor block (<code>dBu</code>, <code>ratio</code>); it is served when the extension's unit table,
<code>OMX_PARAM_CONTRACT_UNITS</code> (omx-contract's sheet, <code>3/omx-contract/param-contract.json</code> in the contract directory, omx-contract-data from 3.6.0), gives the token a value. So a unit that table or that block knows (<code>LUFS</code>, <code>dBu</code>
among them) is checked like any other. A unit with no token there, <code>unknown</code> included, takes no role and
is drawn as a plain number. Nothing here types a unit: the reader reads the installed table
(<code>$PLUGIN_HOSTD_TABLES</code> stands in for it) and the installed unit sheet (<code>param-contract.json</code> in omx-contract's directory), and refuses by name when either is missing.</p>
<p>The level roles (<code>threshold</code>, <code>ceiling</code>) take <code>dB</code>, <code>dBFS</code>, <code>dBu</code> and <code>LUFS</code>.</p>
<h2 id="meanings-and-roles">Meanings and roles</h2>
<p>A skin binds by meaning, never by symbol. A family's roles map to the descriptor's meanings
(<code>tools/vocabulary.mjs</code>, <code>meaningOfRole</code>, over omx-contract's closed list of meanings as its installed
schema declares it); a role whose name is a meaning maps to it, and these are renamed:</p>
<table>
<thead>
<tr>
<th>Role</th>
<th>Meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>mix</code></td>
<td><code>wetDryRatio</code></td>
</tr>
<tr>
<td><code>time</code></td>
<td><code>delay</code></td>
</tr>
<tr>
<td><code>cutoff</code></td>
<td><code>cutoffFrequency</code></td>
</tr>
<tr>
<td><code>band_freq</code>, <code>band_gain</code>, <code>band_q</code></td>
<td><code>frequency</code>, <code>gain</code>, <code>q</code></td>
</tr>
<tr>
<td><code>hpf_freq</code>, <code>low_cut</code></td>
<td><code>lowCut</code></td>
</tr>
<tr>
<td><code>lpf_freq</code>, <code>high_cut</code></td>
<td><code>highCut</code></td>
</tr>
<tr>
<td><code>hpf_slope</code>, <code>lpf_slope</code></td>
<td><code>slope</code></td>
</tr>
<tr>
<td><code>key_listen</code></td>
<td><code>listen</code></td>
</tr>
</tbody>
</table>
<p>A role with no meaning word (<code>band_type</code>, <code>model</code>, <code>algorithm</code>, <code>knee_start</code>, ...) is bound only by
a declared panel.</p>
<p>With no declared panel the roles come from the meanings: in the family the layout takes, each
meaning that names exactly one of the family's roles plays it; an indexed role (<code>band_*</code>) takes every
control of its meaning, in order; any other role is played by its first control, and a second is
left unpublished, named.</p>
<p>A <code>modulation</code> depth is a plain amount (<code>none</code>, <code>pc</code>, <code>coef</code>) or a sweep in octaves (<code>oct</code>), as a phaser's is.</p>
<h2 id="the-family">The family</h2>
<p>The family follows from the meanings, never from a guess about the plugin:</p>
<table>
<thead>
<tr>
<th>Family</th>
<th>A declared family needs one of</th>
<th>Inferred, with no declared panel, from all of</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>limiter</code></td>
<td><code>ceiling</code></td>
<td><code>ceiling</code></td>
</tr>
<tr>
<td><code>deesser</code></td>
<td><code>frequency</code>, <code>threshold</code></td>
<td><code>frequency</code>, <code>threshold</code>, <code>listen</code></td>
</tr>
<tr>
<td><code>gate</code></td>
<td><code>threshold</code></td>
<td><code>threshold</code>, <code>range</code></td>
</tr>
<tr>
<td><code>dynamics</code></td>
<td><code>threshold</code>, <code>ratio</code></td>
<td><code>threshold</code>, <code>ratio</code></td>
</tr>
<tr>
<td><code>eq</code></td>
<td><code>gain</code>, <code>frequency</code></td>
<td><code>frequency</code>, <code>gain</code>, <code>q</code></td>
</tr>
<tr>
<td><code>filter</code></td>
<td><code>cutoffFrequency</code></td>
<td><code>cutoffFrequency</code></td>
</tr>
<tr>
<td><code>drive</code></td>
<td><code>drive</code></td>
<td><code>drive</code></td>
</tr>
<tr>
<td><code>delay</code></td>
<td><code>delay</code></td>
<td><code>delay</code>, <code>feedback</code></td>
</tr>
<tr>
<td><code>reverb</code></td>
<td><code>size</code>, <code>decay</code></td>
<td><code>size</code>, or <code>decay</code></td>
</tr>
<tr>
<td><code>pitch</code></td>
<td><code>shift</code></td>
<td><code>shift</code></td>
</tr>
<tr>
<td><code>modulation</code></td>
<td>(any: a rotor's speeds and an LFO's shape have no meaning word yet)</td>
<td><code>rate</code>, <code>depth</code></td>
</tr>
</tbody>
</table>
<p>A declaration whose family none of its meanings backs is refused, naming the family and the
meanings it would need: a transient designer (attack and sustain amounts, no threshold, no ratio) is
not a compressor, so its family is <code>none</code>. Inference tries the families in the order of the table and
takes the first whose meanings are all there; none fits, <code>none</code>.</p>
<h2 id="the-widget">The widget</h2>
<p>The widget is a step of its own, <code>widgetOf(control, declared)</code>, before any skin. It picks one of the
standard widgets, and a representation (a skin) draws it; the skins are not chosen here.</p>
<table>
<thead>
<tr>
<th>Standard widget</th>
<th>Taken by</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>knob</code></td>
<td>a travel</td>
</tr>
<tr>
<td><code>fader</code></td>
<td>a travel the declared panel draws as a fader</td>
</tr>
<tr>
<td><code>switch</code></td>
<td>a toggle; a trigger (momentary)</td>
</tr>
<tr>
<td><code>selector</code></td>
<td>a choice</td>
</tr>
<tr>
<td><code>meter</code></td>
<td>a read-only travel in a level unit (<code>dB</code>, <code>dBFS</code>, <code>dBu</code>, <code>LUFS</code>)</td>
</tr>
<tr>
<td><code>display</code></td>
<td>any other read-only control</td>
</tr>
<tr>
<td><code>curve</code></td>
<td>a section's graph a host computes (<code>eq-curve</code>, <code>dynamics-curve</code>, <code>transfer-curve</code>)</td>
</tr>
<tr>
<td><code>xy</code></td>
<td>no descriptor word names a pair of controls yet; nothing takes it</td>
</tr>
</tbody>
</table>
<p>A meter carries its measurement (<code>peak</code>, <code>rms</code>, <code>vu</code>, <code>ppm</code>, <code>lufs</code>): <code>lufs</code> for a LUFS reading.
The descriptor has no word for the others, so any other meter's measurement is <code>null</code>, not a guess.</p>
<p>What a face serves keeps the extension's widget enum: <code>knob</code>, <code>fader</code> and <code>switch</code> as they are, a
<code>selector</code> as <code>auto</code> (a CLAP selector needs <code>CLAP_PARAM_IS_ENUM</code>, which the faces do not set).</p>
<h2 id="sections-with-no-declared-panel">Sections with no declared panel</h2>
<p>Each distinct <code>group</code> path is a section, in the order its first control comes; its label is the path
joined with <code>/</code>, its key the path's segments in the key grammar, joined with dots. Controls with no
group go to a section <code>controls</code>. A hidden control is left out. The layout also carries the ports: the
audio inputs and outputs with their channels, whether one is a side-chain, and the note inputs.</p>
<h2 id="pages">Pages</h2>
<p><code>omx-panel layout --pages</code> cuts each section's controls, in the section's order, into pages of eight (the
CLAP remote-controls surface); a section of several pages numbers them (<code>Filter 1</code>, <code>Filter 2</code>). A
surface with another number of encoders asks for it: <code>--pages --per-page N</code> (<code>perPage</code> in
<code>schema/panel.schema.json</code>, default 8). Then a group that fits a page is not split across two (the page
ends early), a group wider than N is cut, and a section of several pages names each page by the controls
it holds (<code>Band: Freq - Q</code>). Every page carries N slots, a short page's last ones <code>null</code>. Left out, the
output is the plain cut of eight, unchanged.</p>
<h2 id="the-easy-face">The Easy face</h2>
<p><code>tools/easy.mjs</code> picks the handful of controls a plugin opens on; every control is one click away, on the same processor.
<code>easyOf</code> returns their symbols, and the layout carries them as <code>easy</code>. The first that answers wins:</p>
<ol>
<li><strong>Declared</strong>: the declared panel's <code>easy</code>, else the descriptor's. At most 8. A list that names no control of the panel, a
control no face can set, or one control twice is refused by name, never trimmed.</li>
<li><strong>Roles</strong>: the family's row below, each role that is mapped, at most 6. An indexed role with more members than places takes
them evenly spaced, both ends included, so a 31-band graphic shows its whole span.</li>
<li><strong>Order</strong>: when the roles gave fewer than 4, the first controls in layout order fill up to 4.</li>
</ol>
<table>
<thead>
<tr>
<th>Family</th>
<th>Roles, in order</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>gate</code></td>
<td><code>threshold</code>, <code>range</code>, <code>attack</code>, <code>release</code></td>
</tr>
<tr>
<td><code>dynamics</code></td>
<td><code>threshold</code>, <code>ratio</code>, <code>makeup</code>, <code>mix</code>, <code>attack</code>, <code>release</code></td>
</tr>
<tr>
<td><code>limiter</code></td>
<td><code>ceiling</code>, <code>threshold</code>, <code>release</code>, <code>output</code></td>
</tr>
<tr>
<td><code>deesser</code></td>
<td><code>frequency</code>, <code>threshold</code>, <code>range</code>, <code>mix</code></td>
</tr>
<tr>
<td><code>eq</code></td>
<td><code>band_gain</code>, <code>output</code></td>
</tr>
<tr>
<td><code>filter</code></td>
<td><code>cutoff</code>, <code>resonance</code>, <code>filter_type</code>, <code>mix</code></td>
</tr>
<tr>
<td><code>drive</code></td>
<td><code>drive</code>, <code>tone</code>, <code>model</code>, <code>mix</code></td>
</tr>
<tr>
<td><code>modulation</code></td>
<td><code>rate</code>, <code>depth</code>, <code>feedback</code>, <code>mix</code></td>
</tr>
<tr>
<td><code>delay</code></td>
<td><code>time</code>, <code>feedback</code>, <code>tone</code>, <code>mix</code></td>
</tr>
<tr>
<td><code>reverb</code></td>
<td><code>size</code>, <code>decay</code>, <code>damping</code>, <code>mix</code></td>
</tr>
<tr>
<td><code>pitch</code></td>
<td><code>shift</code>, <code>fine</code>, <code>mix</code></td>
</tr>
</tbody>
</table>
<p>A face can set any control that is not a reading, a trigger or a bypass. The list is a view of the panel, so it stays out of
the canonical serialisation and the fingerprint.</p>
<p><code>omx-panel layout --pages --easy-first</code> puts the Easy controls first, on pages named <code>Easy</code>, <code>Easy 2</code>, with no control on two
pages; a scanned descriptor takes the <code>easy</code> of the descriptor the plugin's package installed under the same plugin id, as a scan
has nothing to read one from. Without the flag the pages are the page rule's. <code>omx-panel modgui --easy-first</code> draws the Easy
controls as a MOD GUI's first section and lists them as <code>modgui:port</code>.</p>
<h2 id="verbatim">Verbatim</h2>
<p>For omx-plugins' plugins the descriptor carries what the declaration did, so every generated header,
every built face's description, every MOD GUI and its rasters stay byte-identical when omx-plugins lays
them out through this package; its own <code>--check</code> runs hold that.</p>
<p><code>test/panel-layout.test.mjs</code> (<code>make test</code>) holds each rule above by value, with an arm per rule that
breaks its input and reads the result change; it lays out omx-contract's example descriptors
(<code>test/fixtures/descriptors/</code>, scanned CLAP and LV2, a built instrument). The rule over omx-plugins' own
plugins, which loads their declarations, stays in omx-plugins.</p>
`},{slug:`skin-package`,src:`docs/skin-package.md`,title:`The skin package`,source:`https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/docs/skin-package.md`,toc:[{id:`skin-json`,title:`skin.json`},{id:`applying-it`,title:`Applying it`},{id:`refusals`,title:`Refusals`},{id:`the-licence`,title:`The licence`},{id:`importing-a-mod-gui`,title:`Importing a MOD GUI`},{id:`what-the-validator-checks`,title:`What the validator checks`}],html:`<h1 id="the-skin-package">The skin package</h1>
<p>A skin package is a directory named after the plugin it draws. The plugin id is the name. An id that holds a byte
outside <code>A-Z a-z 0-9 . _ -</code> (an LV2 URI) has each such byte written as <code>%XX</code>, and <code>.</code> and <code>..</code> alone are never a
name, so the name is always safe in a path. One function writes the name, <code>encodeSkinId</code> (<code>src/skin-package.ts</code>), and
<code>decodeSkinId</code> reads it back. This package creates <code>/usr/share/omx/skins</code> for packages to be installed into; which
directories a host reads, and in what order, is the host's.</p>
<pre><code>&lt;plugin id&gt;/
  skin.json          the override file, required, even if it only names the licence
  view/              optional: a view of the skin's own
    index.mjs        an ES module, the entry
  i18n/&lt;lang&gt;.json   optional: label key to text, one file per language
  art/               optional: the images the override file names
  modgui/            optional: a MOD GUI, imported from a bundle or generated
</code></pre>
<h2 id="skin-json">skin.json</h2>
<p>One schema, declared twice in one place: <code>schema/skin-package.schema.json</code> (JSON Schema, what <code>omx-panel validate</code>
checks) and <code>parseSkinOverride</code> (<code>src/skin-package.ts</code>, what a reader applies). A test holds the two to the same
verdict on every broken copy of the example. A file holds:</p>
<table>
<thead>
<tr>
<th>Field</th>
<th>Meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>schema</code></td>
<td><code>1</code>, the file's schema version; any other value refuses the file</td>
</tr>
<tr>
<td><code>plugin</code></td>
<td>the plugin id; a reader refuses a file whose id is not the directory's decoded name</td>
</tr>
<tr>
<td><code>licence</code></td>
<td>the SPDX expression of everything in the package; required</td>
</tr>
<tr>
<td><code>source</code></td>
<td>where the package came from: <code>own</code>, <code>generated</code> or <code>modgui</code>, with the <code>bundle</code> and the <code>licenceEvidence</code> an importer read; an imported MOD GUI may name its own icon template and stylesheet, <code>modgui: { html, css }</code>, both under <code>modgui/</code></td>
</tr>
<tr>
<td><code>fingerprint</code></td>
<td>the panel description fingerprint the file was written against; a mismatch is a warning, never a refusal</td>
</tr>
<tr>
<td><code>family</code></td>
<td>a panel family; replaces the description's</td>
</tr>
<tr>
<td><code>roles</code></td>
<td>role (<code>time</code>, <code>band_freq[2]</code>) to control symbol; replaces the description's roles, each checked against the family</td>
</tr>
<tr>
<td><code>sections</code></td>
<td><code>[{ key, labelKey?, label?, controls }]</code>; replaces the sections and their order; a control named nowhere goes to a last section, never hidden</td>
</tr>
<tr>
<td><code>labels</code></td>
<td>control symbol to <code>{ labelKey?, label? }</code></td>
</tr>
<tr>
<td><code>visibleWhen</code></td>
<td>control symbol to <code>{ param, values }</code>, the integer values 0 to 63 that show it</td>
</tr>
<tr>
<td><code>displays</code></td>
<td><code>[{ kind, section, source, ... }]</code>, the displays the panel draws</td>
</tr>
<tr>
<td><code>houseView</code></td>
<td>the family of the house view to use</td>
</tr>
<tr>
<td><code>look</code></td>
<td>the default look; a client's own choice still wins</td>
</tr>
<tr>
<td><code>backdrop</code></td>
<td>an image under <code>art/</code></td>
</tr>
<tr>
<td><code>view</code></td>
<td><code>{ entry, api }</code>: the view's entry under <code>view/</code> (<code>view/index.mjs</code>) and the skin API version it was written for, <code>MAJOR.MINOR</code></td>
</tr>
<tr>
<td><code>modgui</code></td>
<td><code>{ entry }</code> under <code>modgui/</code>: the opt-in for a MOD GUI's own script, never beside a <code>view</code></td>
</tr>
</tbody>
</table>
<p>A path in a skin is relative to the package and stays inside it: no absolute path, no <code>..</code> segment, no backslash.</p>
<p>The skin restates no range, unit or scale. The plugin's own description holds those, and the skin binds to a
control by its symbol and its meaning.</p>
<h2 id="applying-it">Applying it</h2>
<p><code>applySkinOverride(description, override)</code> applies the file to a panel description field by field. An entry that
names an unknown symbol, a role the family has no place for or whose unit it does not take, or a display in no
section is dropped and listed with its reason (<code>unknown-symbol</code>, <code>unknown-section</code>, <code>role-not-in-family</code>,
<code>role-unit</code>, <code>role-repeats</code>); the rest of the file stands. The role check reads <code>ROLES</code> of
<code>tools/panel-description.mjs</code>; a caller may pass its own. That table is wider than the console's own at five
roles: <code>threshold</code> of gate, dynamics, limiter and deesser and <code>ceiling</code> of limiter take <code>db, dbfs, dbu, lufs</code> here and
<code>db, dbfs</code> in the console. A console that keeps its own table passes it as the check; one that adopts this table
accepts a threshold in dBu or LUFS.</p>
<h2 id="refusals">Refusals</h2>
<p>Each refusal is a code with named arguments (<code>SKIN_REFUSAL_CODES</code>): <code>SKIN_OVERRIDE_INVALID</code> (the file does not parse
or fails the schema, <code>args.field</code> the first field that broke it), <code>SKIN_OVERRIDE_ENTRY_DROPPED</code>, <code>SKIN_API_MISMATCH</code>,
<code>SKIN_VIEW_ERROR</code>, <code>SKIN_VIEW_LINT</code>, <code>SKIN_MODGUI_LICENCE</code>, and the importer's own ten, <code>MODGUI_*</code> (below).</p>
<h2 id="the-licence">The licence</h2>
<p><code>SKIN_LICENCE_ALLOW_LIST</code> is the one list a MOD GUI's licence must be on: GPL-2.0-or-later, GPL-3.0-or-later,
LGPL-2.1-or-later, LGPL-3.0-or-later, MIT, BSD-2-Clause, BSD-3-Clause, ISC, Zlib, CC0-1.0 and CC-BY-4.0.
<code>spdxFromDoapLicence</code> reads a plugin's <code>doap:license</code> as an SPDX id; mapping is not permission.</p>
<h2 id="importing-a-mod-gui">Importing a MOD GUI</h2>
<p><code>omx-panel import &lt;bundle.lv2&gt; --out &lt;skins dir&gt; [--plugin &lt;uri&gt;]</code> (<code>tools/modgui-import.mjs</code>) reads a bundle's
<code>modgui.ttl</code> and the plugin's <code>doap:license</code> and writes a package: one section in <code>modgui:port</code> order, each port's
<code>lv2:name</code> as its label, the screenshot as the backdrop under <code>art/</code>, the whole resources directory and the TTL
under <code>modgui/</code>, and <code>source</code> <code>{ kind: &quot;modgui&quot;, bundle, licenceEvidence }</code>. It writes no view, no family and no
roles. It refuses, with a code that names the file it read and nothing written: <code>MODGUI_NOT_FOUND</code>,
<code>MODGUI_TTL_INVALID</code>, <code>MODGUI_NO_LICENCE</code>, <code>MODGUI_LICENCE_UNMAPPED</code>, <code>MODGUI_LICENCE_REFUSED</code> (outside the
allow-list), <code>MODGUI_UNKNOWN_PROPERTY</code>, <code>MODGUI_PORT_UNKNOWN</code> (a <code>modgui:port</code> or <code>modgui:monitoredOutputs</code>
symbol the plugin does not carry), <code>MODGUI_IMAGE_NOT_FOUND</code> (a template image the bundle does not hold),
<code>MODGUI_PATH_ESCAPE</code> (a resource, or a template reference, outside the bundle) and <code>MODGUI_TARGET_EXISTS</code>.</p>
<p>The known <code>modgui:gui</code> properties are mod-ui's whole list, not only the ones a reviewed bundle used:
<code>resourcesDirectory</code>, <code>iconTemplate</code>, <code>settingsTemplate</code>, <code>javascript</code>, <code>stylesheet</code>, <code>screenshot</code>, <code>thumbnail</code>,
<code>documentation</code>, <code>discussionURL</code>, <code>brand</code>, <code>label</code>, <code>model</code>, <code>panel</code>, <code>color</code>, <code>knob</code>, <code>port</code> and <code>monitoredOutputs</code>
(<code>MODGUI_GUI_PROPERTIES</code>). Any other <code>modgui:</code> property is <code>MODGUI_UNKNOWN_PROPERTY</code>, as is an <code>lv2:</code> property on a
<code>modgui:port</code> other than <code>index</code>, <code>symbol</code> and <code>name</code>. The file-valued ones (<code>iconTemplate</code>, <code>settingsTemplate</code>,
<code>javascript</code>, <code>stylesheet</code>, <code>screenshot</code>, <code>thumbnail</code>, and <code>documentation</code> when it names a <code>file:</code> IRI;
<code>MODGUI_FILE_PROPERTIES</code>) must resolve inside the bundle and are copied with the package; <code>discussionURL</code>, and a
<code>documentation</code> that names a web address, are kept as text and never fetched.</p>
<p>Every <code>modgui:port</code> is checked against the plugin's own <code>lv2:port</code> declarations in the bundle, the same TTL the
importer reads for the licence: a <code>modgui:port</code> whose <code>lv2:symbol</code> names no <code>lv2:symbol</code> of the plugin's own ports
is <code>MODGUI_PORT_UNKNOWN</code>, naming the file and the symbol, so a renamed or stale modgui entry is never imported as if
it controlled a real parameter. A <code>modgui:monitoredOutputs</code> entry is checked the same way: its <code>lv2:symbol</code> (or the
literal symbol it names) must be one of the plugin's own ports.</p>
<p>Every image a template names (<code>MODGUI_TEMPLATE_PROPERTIES</code>: the icon template and the settings template; an HTML
<code>src=&quot;...&quot;</code> or <code>src='...'</code> or a CSS <code>url(...)</code> inside it) is checked. A Mustache suffix like <code>{{{ns}}}</code> (mod-ui's
<code>?uri=...</code>), a query and a fragment are dropped, and the path is percent-decoded once and its dot segments resolved,
as a browser and mod-ui's server do, before anything else is decided. Under mod-ui's <code>/resources/</code> route
(<code>MODGUI_RESOURCES_ROUTE</code>, the bundle's <code>resourcesDirectory</code>) a path that climbs out of the resources directory is
<code>MODGUI_PATH_ESCAPE</code>, whether its target exists or not; one that names no file there, the directory itself
included, is <code>MODGUI_IMAGE_NOT_FOUND</code>, naming the template file and the path it names. A web address, any other
absolute path, or a relative path that climbs out of the bundle is <code>MODGUI_PATH_ESCAPE</code>, so a drawn template never
reaches outside the package. The absolute paths kept are mod-ui's own routes, the directories its static handler
serves from its html directory, <code>/fonts/</code>, <code>/img/</code>, <code>/js/</code>, <code>/css/</code> and <code>/include/</code> (<code>MODGUI_SERVER_ROUTES</code>): a file
the drawing supplies or replaces, kept as text and never fetched. A path holding a Mustache tag anywhere cannot be
checked before mod-ui fills it in, so it is kept; a <code>data:</code> address and a value that is only a Mustache tag are left
as they are too. The stylesheet is not checked this way: MOD's shared pedal stylesheets are one theme file covering
every knob count and colour a style offers, most of it unused by any one plugin, so most of its <code>url()</code>s name no file
the bundle carries, on purpose.</p>
<h2 id="what-the-validator-checks">What the validator checks</h2>
<p>The shape. That every control id exists in the plugin's description and that a role fits its control is
<code>applySkinOverride</code>'s, against the description it is applied to.</p>
`},{slug:`worked-example`,src:`docs/worked-example.md`,title:`Worked example: a third-party LV2 and CLAP plugin to a generated panel, adapted to Zynthian`,source:`https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/docs/worked-example.md`,toc:[{id:`where-it-ran`,title:`Where it ran`},{id:`1-the-plugins-as-installed`,title:`1. The plugins as installed`},{id:`2-the-scan-into-a-descriptor`,title:`2. The scan into a descriptor`},{id:`3-the-layout-and-the-mod-gui`,title:`3. The layout and the MOD GUI`},{id:`4-zynthian`,title:`4. Zynthian`},{id:`what-is-verified-and-what-is-not`,title:`What is verified, and what is not`}],html:`<h1 id="worked-example-a-third-party-lv2-and-clap-plugin-to-a-generated-panel-adapted-to-zynthian">Worked example: a third-party LV2 and CLAP plugin to a generated panel, adapted to Zynthian</h1>
<p>This takes two plugins nobody here wrote, as a distribution installs them, through the whole panel path: the
scan into a descriptor, the layout, the MOD GUI and the test that holds it to the descriptor. It then follows
the LV2 one to where Zynthian looks for it.</p>
<ul>
<li><strong>LV2</strong>: ZamComp, Damien Zammit's mono compressor (<code>urn:zamaudio:ZamComp</code>), from Fedora's <code>lv2-zam-plugins</code>.
Section 4 reads, from Zynthian's sources, where it would look for it.</li>
<li><strong>CLAP</strong>: LSP Limiter Mono (<code>in.lsp-plug.limiter_mono</code>), from Fedora's <code>lsp-plugins-clap</code>.</li>
</ul>
<p>Every command below was run as written, from the root of this repository, and its output is shown under it, or
is the committed file it writes under <a href="https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/examples/worked-example/"><code>examples/worked-example/</code></a>. What each
command printed is also committed, one file per command, in
<a href="https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/examples/worked-example/transcript/"><code>examples/worked-example/transcript/</code></a>, written by
<a href="https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/examples/worked-example/repeat.sh"><code>repeat.sh</code></a> (run it after the setup of the next section; a command that
prints nothing leaves no file). The output shown here is that transcript, line for line. A <code>[exit N]</code> line is
the command's exit status when it is not 0. The <code>rpm -q</code> and <code>lv2ls</code> lines and the package versions are those of
the container the run was made in. Nothing here was run on a Zynthian or a MOD: the last section says what
comes from Zynthian's sources and what is still to be seen on one.</p>
<h2 id="where-it-ran">Where it ran</h2>
<p>A Fedora 44 container (the <code>openmixer-worker</code> image, whose packages the commands below upgrade), the Fedora
repositories and the FreeMixer channel enabled. The image also carries a copr repository, which the
installs leave out so that every plugin comes from Fedora itself. As root:</p>
<pre><code>dnf -y -q --disablerepo=copr-ycollet-audinux install lv2-zam-plugins lsp-plugins-clap omx-clap-host plugin-hostd plugin-hostd-devel omx-contract-devel
dnf -y -q --disablerepo=copr-ycollet-audinux upgrade omx-contract omx-contract-devel omx-clap-host omx-clap-core plugin-hostd plugin-hostd-devel
ln -s &quot;$PWD/bin/omx-panel.mjs&quot; /usr/local/bin/omx-panel
dnf -y -q --disablerepo=copr-ycollet-audinux install omx-panel
</code></pre>
<p>and, as the user, <code>npm ci --silent</code> in this checkout.</p>
<p>On a stock Fedora 44, the OpenMixer channel comes first, as this repository's CI adds it
(<code>dnf install https://www.openmixer.org/rpm/openmixer-release.noarch.rpm</code>; not run here, the
image carries the channel), and <code>python3-lilv</code> and <code>sord</code> are installed with the rest (the image carries them:
<code>python3-lilv-0.26.4</code>, <code>sord-0.16.22</code>, <code>lv2-1.18.10</code>).</p>
<p><code>omx-panel</code> is this checkout, run as <code>omx-panel</code> through the link above (<code>/usr/local/bin</code> comes before
<code>/usr/bin</code> on the path). The commands ran at <code>3ebf9b7</code>, the commit that adds <code>repeat.sh</code>; its omx-panel is
<code>origin/main</code> at <code>15cc25bb9</code> (pull request 26 merged, so the readout fix of omx-panel#25 is in), and the branch
adds only the example, this document, a line of the README and the exemption of the example's output files in
<code>tools/check-spdx.mjs</code>. The released omx-panel 0.2.5, installed last, is run as <code>/usr/bin/omx-panel</code>
once: it stops on ZamComp (<a href="#the-released-025-on-zamcomp">section 3</a>). Every other
command runs as an unprivileged user.</p>
<h2 id="1-the-plugins-as-installed">1. The plugins as installed</h2>
<pre><code>$ mkdir -p examples/worked-example/zamcomp examples/worked-example/lsp-limiter-mono

$ rpm -q lv2-zam-plugins lsp-plugins-clap
lv2-zam-plugins-4.4-7.fc44.x86_64
lsp-plugins-clap-1.2.29-1.fc44.x86_64

$ rpm -ql lv2-zam-plugins | grep '^/usr/lib64/lv2/ZamComp.lv2/'
/usr/lib64/lv2/ZamComp.lv2/ZamComp_dsp.so
/usr/lib64/lv2/ZamComp.lv2/ZamComp_dsp.ttl
/usr/lib64/lv2/ZamComp.lv2/ZamComp_ui.so
/usr/lib64/lv2/ZamComp.lv2/ZamComp_ui.ttl
/usr/lib64/lv2/ZamComp.lv2/manifest.ttl
/usr/lib64/lv2/ZamComp.lv2/presets.ttl

$ rpm -qf /usr/lib64/clap/lsp-plugins.clap
lsp-plugins-clap-1.2.29-1.fc44.x86_64

$ lv2ls | grep -x urn:zamaudio:ZamComp
urn:zamaudio:ZamComp

$ lv2info urn:zamaudio:ZamComp &gt; examples/worked-example/zamcomp/lv2info.txt

$ omx-clap-scan /usr/lib64/clap/lsp-plugins.clap | sed -n '/^  plugin in.lsp-plug.limiter_mono /,/^    note ports/p' &gt; examples/worked-example/lsp-limiter-mono/omx-clap-scan.txt
</code></pre>
<p><a href="https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/examples/worked-example/zamcomp/lv2info.txt"><code>zamcomp/lv2info.txt</code></a> is ZamComp as lilv reads it: three
audio ports, eight input controls (<code>att</code>, <code>rel</code>, <code>kn</code>, <code>rat</code>, <code>thr</code>, <code>mak</code>, <code>slew</code>, <code>sidech</code>, ports 3 to 10)
and two output controls, the readouts <code>gr</code> (gain reduction) and <code>outlevel</code> (ports 11 and 12). lilv lists the
three presets in an order that changes from run to run, so a repeat can differ from the committed file in those
three lines and nowhere else.
<a href="https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/examples/worked-example/lsp-limiter-mono/omx-clap-scan.txt"><code>lsp-limiter-mono/omx-clap-scan.txt</code></a> is the
limiter as omx-clap-scan lists it, version 1.0.33, 28 parameters; the scan of the whole <code>lsp-plugins.clap</code>
lists every plugin the file holds, and <code>sed</code> keeps this one.</p>
<h2 id="2-the-scan-into-a-descriptor">2. The scan into a descriptor</h2>
<p>One step writes a <code>scanned</code> descriptor (omx-contract <code>docs/descriptors.md</code>) for either format:
<code>plugin-hostd-probe describe</code> (plugin-hostd 0.7.0 and later, its <code>docs/formats.md</code>). It runs omx-clap-core's
<code>omx-clap-scan --fields</code>, the dump of every field one CLAP or LV2 plugin states, read as a host reads it (for
LV2, through lilv), and maps each field to a descriptor word by plugin-hostd's format tables. So the LV2 scan
to a descriptor exists, and it is the same step as the CLAP one.</p>
<pre><code>$ rpm -q omx-clap-host omx-clap-core plugin-hostd omx-contract
omx-clap-host-0.20.1-1.fc44.x86_64
omx-clap-core-0.20.1-1.fc44.x86_64
plugin-hostd-0.10.0-1.fc44.x86_64
omx-contract-3.1.0-1.fc44.noarch

$ omx-clap-scan --fields lv2:urn:zamaudio:ZamComp &gt; examples/worked-example/zamcomp/zamcomp.fields.tsv

$ plugin-hostd-probe describe lv2:urn:zamaudio:ZamComp &gt; examples/worked-example/zamcomp/zamcomp.descriptor.json

$ omx-clap-scan --fields clap:/usr/lib64/clap/lsp-plugins.clap#in.lsp-plug.limiter_mono &gt; examples/worked-example/lsp-limiter-mono/limiter_mono.fields.tsv

$ plugin-hostd-probe describe clap:/usr/lib64/clap/lsp-plugins.clap#in.lsp-plug.limiter_mono &gt; examples/worked-example/lsp-limiter-mono/limiter_mono.descriptor.json
</code></pre>
<p>The dumps are the committed <code>.fields.tsv</code> files, the descriptors the <code>.descriptor.json</code> beside them. What a
scan cannot know, it writes as <code>unknown</code>:</p>
<ul>
<li>every control's <code>meaning</code> is <code>unknown</code> (neither format states what a control means), so the layout infers no
family and no roles: both plugins are family <code>none</code>;</li>
<li>ZamComp's units are its TTL's (<code>ms</code>, <code>dB</code>), its <code>rat</code> and <code>slew</code> state none (<code>unknown</code>); <code>gr</code> and <code>outlevel</code>
are <code>readonly</code>, with a range and no default;</li>
<li>the limiter's controls are keyed by CLAP parameter id, a number; their units are <code>unknown</code> and their scales
<code>unknown</code> or <code>stepped</code>, as CLAP states neither.</li>
</ul>
<h2 id="3-the-layout-and-the-mod-gui">3. The layout and the MOD GUI</h2>
<h3 id="zamcomp-with-no-panel-file">ZamComp, with no panel file</h3>
<pre><code>$ omx-panel layout --descriptor examples/worked-example/zamcomp/zamcomp.descriptor.json &gt; examples/worked-example/zamcomp/zamcomp.layout.json

$ omx-panel layout --descriptor examples/worked-example/zamcomp/zamcomp.descriptor.json --pages | tee examples/worked-example/zamcomp/zamcomp.pages.json
[
  {
    &quot;section&quot;: 0,
    &quot;sectionName&quot;: &quot;Controls&quot;,
    &quot;pageName&quot;: &quot;Controls 1&quot;,
    &quot;ids&quot;: [
      &quot;att&quot;,
      &quot;rel&quot;,
      &quot;kn&quot;,
      &quot;rat&quot;,
      &quot;thr&quot;,
      &quot;mak&quot;,
      &quot;slew&quot;,
      &quot;sidech&quot;
    ]
  },
  {
    &quot;section&quot;: 0,
    &quot;sectionName&quot;: &quot;Controls&quot;,
    &quot;pageName&quot;: &quot;Controls 2&quot;,
    &quot;ids&quot;: [
      &quot;gr&quot;,
      &quot;outlevel&quot;,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  }
]
</code></pre>
<p>ZamComp's TTL states no port groups, so every control is in the one section <code>Controls</code>, in port order, cut
into pages of eight (the page rule of <code>docs/panel-layout.md</code>). The two readouts take the second page: the
layout pages every control it lists, a readout included.</p>
<pre><code>$ omx-panel modgui --descriptor examples/worked-example/zamcomp/zamcomp.descriptor.json --out examples/worked-example/zamcomp/no-panel/ZamComp.lv2
modgui: wrote examples/worked-example/zamcomp/no-panel/ZamComp.lv2/modgui.ttl
modgui: wrote examples/worked-example/zamcomp/no-panel/ZamComp.lv2/modgui/icon-ZamComp.html
modgui: wrote examples/worked-example/zamcomp/no-panel/ZamComp.lv2/modgui/stylesheet-ZamComp.css
modgui: wrote examples/worked-example/zamcomp/no-panel/ZamComp.lv2/modgui/screenshot-ZamComp.png
modgui: wrote examples/worked-example/zamcomp/no-panel/ZamComp.lv2/modgui/thumbnail-ZamComp.png
modgui: wrote examples/worked-example/zamcomp/no-panel/ZamComp.lv2/modgui/knobs/omx-knob.png

$ tools/modgui-test.sh examples/worked-example/zamcomp/no-panel/ZamComp.lv2 examples/worked-example/zamcomp/zamcomp.descriptor.json
PASS modgui-gen --check ZamComp
PASS template draws att with its declared travel and default
PASS template draws rel with its declared travel and default
PASS template draws kn with its declared travel and default
PASS template draws rat with its declared travel and default
PASS template draws thr with its declared travel and default
PASS template draws mak with its declared travel and default
PASS template draws slew with its declared travel and default
PASS template draws sidech with its declared travel and default
PASS template draws readout gr as a display with its declared range
PASS template draws readout outlevel as a display with its declared range
PASS template draws exactly the 10 declared parameters
PASS sord_validate ZamComp.lv2/*.ttl against the LV2 specs, modgui terms and resource-hint terms (Found 21 errors among 85 files (checked 1947 restrictions); all 21 the label errors of omx-contract#144)
PASS sord_validate refuses a modgui property outside modgui-terms.ttl
PASS a moved default makes modgui-gen --check fail
</code></pre>
<p>The eight input controls are knobs (none is a toggle or a choice in the TTL), the two readouts displays
(<code>docs/modgui.md</code>); <code>modgui.ttl</code> lists the eight as <code>modgui:port</code>.</p>
<h3 id="zamcomp-with-a-panel-file">ZamComp, with a panel file</h3>
<p><a href="https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/examples/worked-example/zamcomp/zamcomp.panel.json"><code>zamcomp/zamcomp.panel.json</code></a> is a panel written for
this example: the detector controls in one section, the makeup gain in a second as a fader, the two readouts in
a third. Its family is <code>none</code>: a declared <code>dynamics</code> would be refused, since no control of the scan carries the
meaning <code>threshold</code> or <code>ratio</code> (<code>docs/panel-layout.md</code>, the family).</p>
<pre><code>$ omx-panel layout --descriptor examples/worked-example/zamcomp/zamcomp.descriptor.json --panel examples/worked-example/zamcomp/zamcomp.panel.json --pages | tee examples/worked-example/zamcomp/zamcomp.panel.pages.json
[
  {
    &quot;section&quot;: 0,
    &quot;sectionName&quot;: &quot;Detector&quot;,
    &quot;pageName&quot;: &quot;Detector&quot;,
    &quot;ids&quot;: [
      &quot;thr&quot;,
      &quot;rat&quot;,
      &quot;kn&quot;,
      &quot;att&quot;,
      &quot;rel&quot;,
      &quot;slew&quot;,
      &quot;sidech&quot;,
      null
    ]
  },
  {
    &quot;section&quot;: 1,
    &quot;sectionName&quot;: &quot;Output&quot;,
    &quot;pageName&quot;: &quot;Output&quot;,
    &quot;ids&quot;: [
      &quot;mak&quot;,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  {
    &quot;section&quot;: 2,
    &quot;sectionName&quot;: &quot;Meters&quot;,
    &quot;pageName&quot;: &quot;Meters&quot;,
    &quot;ids&quot;: [
      &quot;gr&quot;,
      &quot;outlevel&quot;,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  }
]

$ omx-panel modgui --descriptor examples/worked-example/zamcomp/zamcomp.descriptor.json --panel examples/worked-example/zamcomp/zamcomp.panel.json --out examples/worked-example/zamcomp/with-panel/ZamComp.lv2
modgui: wrote examples/worked-example/zamcomp/with-panel/ZamComp.lv2/modgui.ttl
modgui: wrote examples/worked-example/zamcomp/with-panel/ZamComp.lv2/modgui/icon-ZamComp.html
modgui: wrote examples/worked-example/zamcomp/with-panel/ZamComp.lv2/modgui/stylesheet-ZamComp.css
modgui: wrote examples/worked-example/zamcomp/with-panel/ZamComp.lv2/modgui/screenshot-ZamComp.png
modgui: wrote examples/worked-example/zamcomp/with-panel/ZamComp.lv2/modgui/thumbnail-ZamComp.png
modgui: wrote examples/worked-example/zamcomp/with-panel/ZamComp.lv2/modgui/knobs/omx-knob.png
modgui: wrote examples/worked-example/zamcomp/with-panel/ZamComp.lv2/modgui/knobs/omx-fader.png

$ tools/modgui-test.sh examples/worked-example/zamcomp/with-panel/ZamComp.lv2 examples/worked-example/zamcomp/zamcomp.descriptor.json examples/worked-example/zamcomp/zamcomp.panel.json
PASS modgui-gen --check ZamComp
PASS template draws thr with its declared travel and default
PASS template draws rat with its declared travel and default
PASS template draws kn with its declared travel and default
PASS template draws att with its declared travel and default
PASS template draws rel with its declared travel and default
PASS template draws slew with its declared travel and default
PASS template draws sidech with its declared travel and default
PASS template draws mak with its declared travel and default
PASS template draws readout gr as a display with its declared range
PASS template draws readout outlevel as a display with its declared range
PASS template draws exactly the 10 declared parameters
PASS sord_validate ZamComp.lv2/*.ttl against the LV2 specs, modgui terms and resource-hint terms (Found 21 errors among 85 files (checked 1938 restrictions); all 21 the label errors of omx-contract#144)
PASS sord_validate refuses a modgui property outside modgui-terms.ttl
PASS a moved default makes modgui-gen --check fail
</code></pre>
<p>With the panel, <code>modgui.ttl</code> lists the seven controls of the first section, <code>Detector</code>, as <code>modgui:port</code>, and
the makeup fader brings its own film strip.</p>
<h3 id="the-released-0-2-5-on-zamcomp">The released 0.2.5 on ZamComp</h3>
<pre><code>$ rpm -q omx-panel
omx-panel-0.2.5-1.fc44.noarch

$ /usr/bin/omx-panel modgui --descriptor examples/worked-example/zamcomp/zamcomp.descriptor.json --out /tmp/zamcomp-0.2.5.lv2 2&gt;&amp;1 | grep '^Error'
Error: modgui-gen: 'gr' is not a declared control input with a travel
</code></pre>
<p>That is omx-panel#25: 0.2.5 looks a travel up for a readout. This checkout carries the fix.</p>
<h3 id="lsp-limiter-mono-a-clap-plugin">LSP Limiter Mono, a CLAP plugin</h3>
<pre><code>$ omx-panel layout --descriptor examples/worked-example/lsp-limiter-mono/limiter_mono.descriptor.json &gt; examples/worked-example/lsp-limiter-mono/limiter_mono.layout.json

$ omx-panel layout --descriptor examples/worked-example/lsp-limiter-mono/limiter_mono.descriptor.json --pages &gt; examples/worked-example/lsp-limiter-mono/limiter_mono.pages.json

$ omx-panel modgui --descriptor examples/worked-example/lsp-limiter-mono/limiter_mono.descriptor.json --out /tmp/limiter_mono.lv2 2&gt;&amp;1 | grep '^Error'
Error: modgui-gen: 'in.lsp-plug.limiter_mono' states no LV2 URI; a MOD GUI belongs to an LV2 bundle
</code></pre>
<p>The limiter's 28 controls state no group, so they are one section <code>Controls</code>, four pages of eight, the last
holding four (<a href="https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/examples/worked-example/lsp-limiter-mono/limiter_mono.pages.json"><code>limiter_mono.pages.json</code></a>,
each slot a CLAP parameter id). These are the pages a CLAP host shows through <code>clap.remote-controls</code>. A MOD GUI
belongs to an LV2 bundle, so the generator refuses a CLAP descriptor by name; lsp-plugins also ships an LV2
build, which would be scanned as <code>lv2:&lt;uri&gt;</code> and go the way of ZamComp.</p>
<p>Not every lsp CLAP plugin lays out yet. Filter Mono has two parameters named &quot;Filter mode&quot;, and a CLAP
control, whose id is a number, is keyed by its name:</p>
<pre><code>$ plugin-hostd-probe describe clap:/usr/lib64/clap/lsp-plugins.clap#in.lsp-plug.filter_mono &gt; examples/worked-example/lsp-limiter-mono/filter_mono.descriptor.json

$ omx-panel layout --descriptor examples/worked-example/lsp-limiter-mono/filter_mono.descriptor.json --pages
omx-panel: examples/worked-example/lsp-limiter-mono/filter_mono.descriptor.json: 'Filter mode' is a control twice
[exit 1]
</code></pre>
<p>That is omx-panel#27. <a href="https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/examples/worked-example/survey-lsp-mono.sh"><code>survey-lsp-mono.sh</code></a> scans and lays out
every mono plugin of the file:</p>
<pre><code>$ bash examples/worked-example/survey-lsp-mono.sh
refused in.lsp-plug.filter_mono: omx-panel: &lt;descriptor&gt;: 'Filter mode' is a control twice
refused in.lsp-plug.sampler_mono: omx-panel: &lt;descriptor&gt;: 'Sample pitch' is a control twice
refused in.lsp-plug.trigger_midi_mono: omx-panel: &lt;descriptor&gt;: 'Sample pitch' is a control twice
refused in.lsp-plug.trigger_mono: omx-panel: &lt;descriptor&gt;: 'Sample pitch' is a control twice
59 laid out, 4 refused
</code></pre>
<p>With <code>--all</code> it also lists the 59 plugins that lay out, one <code>ok</code> line each
(<a href="https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/examples/worked-example/transcript/27a-survey-lsp-mono-all.txt"><code>transcript/27a-survey-lsp-mono-all.txt</code></a>).
The four refusals have the cause of Filter Mono's, a name two parameters share.</p>
<h2 id="4-zynthian">4. Zynthian</h2>
<p>What follows comes from Zynthian's sources (zynthian-ui <code>f46b018</code> and zynthian-sys <code>0774a58</code>, both on their
<code>vangelis</code> branch; zynthian-plugins <code>648c84a</code>, its <code>master</code>), the omx-plugins README, and the lilv
runs shown. Each file and line cited is at those commits. None of it was seen on a Zynthian.</p>
<h3 id="where-zynthian-looks-for-lv2-bundles-and-their-mod-guis">Where Zynthian looks for LV2 bundles and their MOD GUIs</h3>
<ul>
<li><code>LV2_PATH</code> is <code>/usr/lib/lv2:/usr/lib/arm-linux-gnueabihf/lv2:/usr/local/lib/lv2:$ZYNTHIAN_PLUGINS_DIR/lv2:</code>
<code>$ZYNTHIAN_DATA_DIR/presets/lv2:$ZYNTHIAN_MY_DATA_DIR/presets/lv2</code> (zynthian-sys
<code>scripts/zynthian_envars.sh:107</code>), with <code>ZYNTHIAN_PLUGINS_DIR</code> <code>/zynthian/zynthian-plugins</code> (<code>:105</code>).
zynthian-ui loads it with lilv's <code>world.load_all()</code> (<code>zyngine/zynthian_lv2.py:213</code>).</li>
<li>A bundle a user adds goes to <code>/zynthian/zynthian-plugins/lv2</code> (<code>LV2_DIR</code>, <code>zynthian_lv2.py:197</code>): the
webconf upload copies it there through <code>add_engine</code> (<code>zynthian_lv2.py:386</code>), and the omx-plugins README has a
Zynthian without the apt channel copy its <code>lv2/</code> bundles there and rescan the LV2 plugins from the admin
menu. A plugin the rescan finds for the first time is disabled until enabled (<code>zynthian_lv2.py:619</code>).</li>
<li>The last commit of the zynthian-plugins repository (directories <code>dssi</code>, <code>ladspa</code>, <code>lv2</code>, <code>vst</code>) is
<code>648c84a</code>, dated 2016-09-21. The image's setup script installs LV2 plugins with <code>apt-get</code>, and the list
names <code>zam-plugins</code> (zynthian-sys <code>scripts/setup_plugins_rbpi.sh:42-52</code>, the name on line 52); the recipe
that builds zam-plugins from source, <code>scripts/recipes/install_zam.sh</code>, is commented out at
<code>setup_plugins_rbpi.sh:94</code>. That the Debian package carries the same ZamComp as Fedora's, and puts it in
<code>/usr/lib/lv2</code>, is not read from these sources.</li>
<li>A MOD GUI is drawn by MOD-UI, which Zynthian runs as an engine of its own (zynthian-ui
<code>zyngine/zynthian_engine_modui.py</code>; zynthian's mod-ui fork, <code>scripts/recipes/install_mod-ui.sh</code>, run by
<code>setup_system_raspioslite_64bit_trixie.sh:562</code>). Its service takes an <code>LV2_PATH</code>
(<code>etc/systemd/mod-ui.service:11</code>) that <code>scripts/update_zynthian_sys.sh:527</code> fills from the value set at <code>:188</code>:
the same directories as above plus <code>/usr/lib/$arch_libdir/lv2</code> and <code>$ZYNTHIAN_PLUGINS_DIR/lv2-presets</code>.</li>
</ul>
<h3 id="how-the-bundle-gets-there">How the bundle gets there</h3>
<p>A MOD GUI is read only when the bundle's manifest names <code>modgui.ttl</code>, and only from the bundle lilv takes the
plugin from. Both are shown on a copy of the installed bundle:</p>
<pre><code>$ rm -rf /tmp/stage &amp;&amp; mkdir -p /tmp/stage

$ cp -R /usr/lib64/lv2/ZamComp.lv2 /tmp/stage/

$ cp -R examples/worked-example/zamcomp/with-panel/ZamComp.lv2/modgui.ttl examples/worked-example/zamcomp/with-panel/ZamComp.lv2/modgui /tmp/stage/ZamComp.lv2/

$ LV2_PATH=/tmp/stage python3 examples/worked-example/lilv-modgui.py urn:zamaudio:ZamComp
plugin  urn:zamaudio:ZamComp
bundle  file:///tmp/stage/ZamComp.lv2/
modgui:gui  none
[exit 1]

$ printf '\\n&lt;urn:zamaudio:ZamComp&gt; rdfs:seeAlso &lt;modgui.ttl&gt; .\\n' &gt;&gt; /tmp/stage/ZamComp.lv2/manifest.ttl

$ LV2_PATH=/tmp/stage python3 examples/worked-example/lilv-modgui.py urn:zamaudio:ZamComp
plugin  urn:zamaudio:ZamComp
bundle  file:///tmp/stage/ZamComp.lv2/
modgui:resourcesDirectory  file:///tmp/stage/ZamComp.lv2/modgui
modgui:iconTemplate  file:///tmp/stage/ZamComp.lv2/modgui/icon-ZamComp.html
modgui:stylesheet  file:///tmp/stage/ZamComp.lv2/modgui/stylesheet-ZamComp.css
modgui:screenshot  file:///tmp/stage/ZamComp.lv2/modgui/screenshot-ZamComp.png
modgui:thumbnail  file:///tmp/stage/ZamComp.lv2/modgui/thumbnail-ZamComp.png
modgui:brand  Damien Zammit
modgui:label  ZamComp
modgui:port  0 thr
modgui:port  1 rat
modgui:port  2 kn
modgui:port  3 att
modgui:port  4 rel
modgui:port  5 slew
modgui:port  6 sidech

$ LV2_PATH=/usr/lib64/lv2:/tmp/stage python3 examples/worked-example/lilv-modgui.py urn:zamaudio:ZamComp
lilv_world_compare_versions(): warning: Ignoring duplicate version 6.0 of &lt;urn:zamaudio:ZamComp&gt; from &lt;file:///tmp/stage/ZamComp.lv2/&gt;
lilv_world_compare_versions(): note: Previously loaded from &lt;file:///usr/lib64/lv2/ZamComp.lv2/&gt;
plugin  urn:zamaudio:ZamComp
bundle  file:///usr/lib64/lv2/ZamComp.lv2/
modgui:gui  none
[exit 1]

$ LV2_PATH=/tmp/stage:/usr/lib64/lv2 python3 examples/worked-example/lilv-modgui.py urn:zamaudio:ZamComp | head -3
lilv_world_compare_versions(): warning: Ignoring duplicate version 6.0 of &lt;urn:zamaudio:ZamComp&gt; from &lt;file:///usr/lib64/lv2/ZamComp.lv2/&gt;
lilv_world_compare_versions(): note: Previously loaded from &lt;file:///tmp/stage/ZamComp.lv2/&gt;
plugin  urn:zamaudio:ZamComp
bundle  file:///tmp/stage/ZamComp.lv2/
modgui:resourcesDirectory  file:///tmp/stage/ZamComp.lv2/modgui
</code></pre>
<p><a href="https://github.com/FreeMixer/omx-panel/blob/edaf4f48de7e57496ead1b949f754b7e111867e3/examples/worked-example/lilv-modgui.py"><code>lilv-modgui.py</code></a> asks lilv, the library mod-ui reads LV2 data
with, for the plugin's <code>modgui:gui</code>. The manifest line is added by hand: <code>omx-panel modgui</code> leaves the manifest
as it is (omx-panel#28). Of two bundles with one plugin URI and one version, lilv keeps the first on
<code>LV2_PATH</code> and ignores the other.</p>
<p>The test over the whole staged bundle:</p>
<pre><code>$ tools/modgui-test.sh /tmp/stage/ZamComp.lv2 examples/worked-example/zamcomp/zamcomp.descriptor.json examples/worked-example/zamcomp/zamcomp.panel.json
PASS modgui-gen --check ZamComp
PASS template draws thr with its declared travel and default
PASS template draws rat with its declared travel and default
PASS template draws kn with its declared travel and default
PASS template draws att with its declared travel and default
PASS template draws rel with its declared travel and default
PASS template draws slew with its declared travel and default
PASS template draws sidech with its declared travel and default
PASS template draws mak with its declared travel and default
PASS template draws readout gr as a display with its declared range
PASS template draws readout outlevel as a display with its declared range
PASS template draws exactly the 10 declared parameters
error: Object not in range &lt;http://lv2plug.in/ns/lv2core#ExtensionData&gt;

error: Use of undefined property
       urn:zamaudio:ZamComp
error: Property &lt;http://moddevices.com/ns/mod#brand&gt; has no label
       urn:zamaudio:ZamComp
error: Use of undefined property
       urn:zamaudio:ZamComp
error: Property &lt;http://moddevices.com/ns/mod#label&gt; has no label
       urn:zamaudio:ZamComp
error: Object not in range &lt;http://lv2plug.in/ns/lv2core#ExtensionData&gt;
FAIL sord_validate ZamComp.lv2/*.ttl (Found 27 errors among 89 files (checked 2194 restrictions))
PASS sord_validate refuses a modgui property outside modgui-terms.ttl
PASS a moved default makes modgui-gen --check fail
modgui-test: 1 check(s) failed
[exit 1]
</code></pre>
<p>The six errors besides the 21 of omx-contract#144 are ZamComp's own TTL's, and the installed bundle, untouched,
has the same six against the same LV2 specifications:</p>
<pre><code>$ for s in core port-props units urid atom worker ui options midi patch time log state buf-size parameters presets resize-port port-groups morph dynmanifest instance-access data-access event uri-map schemas; do set -- &quot;$@&quot; /usr/lib64/lv2/$s.lv2/*.ttl; done; sord_validate /usr/lib64/lv2/ZamComp.lv2/*.ttl &quot;$@&quot; 2&gt;&amp;1 | grep -A1 '^error'
error: Object not in range &lt;http://lv2plug.in/ns/lv2core#ExtensionData&gt;

--
error: Use of undefined property
       urn:zamaudio:ZamComp
--
error: Property &lt;http://moddevices.com/ns/mod#brand&gt; has no label
       urn:zamaudio:ZamComp
--
error: Use of undefined property
       urn:zamaudio:ZamComp
--
error: Property &lt;http://moddevices.com/ns/mod#label&gt; has no label
       urn:zamaudio:ZamComp
--
error: Object not in range &lt;http://lv2plug.in/ns/lv2core#ExtensionData&gt;
</code></pre>
<p>On a Zynthian where the Debian package has put ZamComp in <code>/usr/lib/lv2/ZamComp.lv2</code> (not read from the
sources, see above), that bundle is first on <code>LV2_PATH</code>, and a copy of the bundle in
<code>/zynthian/zynthian-plugins/lv2</code> would be ignored by lilv as above. <code>add_engine</code> refuses a plugin whose engine
is already registered unless <code>force</code> is set (<code>zynthian_lv2.py:411-424</code>). The MOD GUI then goes into the bundle
lilv takes: copy <code>modgui.ttl</code> and <code>modgui/</code> from
<code>examples/worked-example/zamcomp/with-panel/ZamComp.lv2/</code> into <code>/usr/lib/lv2/ZamComp.lv2/</code>, append the same
<code>rdfs:seeAlso</code> line to its <code>manifest.ttl</code>, and restart MOD-UI. That step was not run, and a <code>zam-plugins</code>
upgrade would overwrite the manifest. The descriptor should be the scan of the Zynthian's own ZamComp, whose
Debian version may differ from Fedora's 4.4.</p>
<h3 id="what-the-encoder-pages-show">What the encoder pages show</h3>
<p>The pages of eight above are the layout's: what a CLAP host shows through <code>clap.remote-controls</code>. Zynthian's
touchscreen does not read them. For an LV2 plugin hosted by jalv it builds its own screens of four
(zynthian-ui <code>zyngine/zynthian_engine.py</code>, <code>generate_ctrl_screens</code>, lines 681 to 724):</p>
<ul>
<li>the controls are the plugin's input control ports, in port order (<code>zynthian_lv2.py:940</code>, <code>get_plugin_ports</code>),
sorted by <code>lv2:displayPriority</code>, and grouped by <code>pg:group</code>; ungrouped controls are the group <code>Params</code>;</li>
<li>each group is cut into screens of four, numbered from 1 when a group has more than four;</li>
<li>an audio effect with no bypass port of its own gets a <code>bypass</code> control, added last
(<code>zyngine/zynthian_engine_jalv.py:544</code>);</li>
<li>output control ports are no controllers: a readout is never on a screen.</li>
</ul>
<p>ZamComp states no port group and no display priority:</p>
<pre><code>$ grep -c -E 'portgroups|pg:group|displayPriority' /usr/lib64/lv2/ZamComp.lv2/ZamComp_dsp.ttl
0
[exit 1]
</code></pre>
<p>So, by those rules, Zynthian shows ZamComp as <code>Params 1</code> (Attack, Release, Knee, Ratio), <code>Params 2</code>
(Threshold, Makeup, Slew, Sidechain) and <code>Params 3</code> (bypass), and neither <code>gr</code> nor <code>outlevel</code>. This is read
from the source, not seen. The layout's sections do not reach Zynthian's screens: an LV2 bundle would carry
them as <code>pg:group</code> in its TTL, which the MOD GUI generator does not write. The word <code>clap</code> appears in no file
of zynthian-ui at <code>f46b018</code> (<code>grep -ri clap</code> finds nothing), and in zynthian-sys at <code>0774a58</code> only once, in
a name misspelt &quot;Claption&quot; in a plugin description (<code>config/engine_config.json:7932</code>), so those sources name no
CLAP host or plugin and the limiter's pages are not shown there.</p>
<h2 id="what-is-verified-and-what-is-not">What is verified, and what is not</h2>
<p>Verified, by the commands above: both plugins come from Fedora 44's own packages; <code>plugin-hostd-probe describe</code> writes a <code>scanned</code> descriptor of each; <code>omx-panel layout</code> lays out ZamComp with and without a panel
file and the limiter, and stops on Filter Mono and three more of the 63 mono lsp plugins (omx-panel#27); <code>omx-panel modgui</code> writes ZamComp's MOD GUI with
and without a panel file, each bundle passing <code>tools/modgui-test.sh</code>, and refuses the CLAP limiter by name;
omx-panel 0.2.5 stops on ZamComp's readout (omx-panel#25); lilv reads the MOD GUI from a copy of the bundle
once its manifest names <code>modgui.ttl</code>, and keeps the first of two bundles of one plugin on <code>LV2_PATH</code>.</p>
<p>Not verified:</p>
<ul>
<li>anything on a Zynthian or a MOD: the bundle's install there, MOD-UI drawing the template, the screens of
four, the rescan;</li>
<li>the template as mod-ui draws it in a browser: the tests read the template's text and its TTL, not a render;</li>
<li>the readouts' displays showing a value: the generated MOD GUI draws a frame, and a live reading needs a
<code>modgui:javascript</code>, which is not generated (<code>docs/modgui.md</code>);</li>
<li>ZamComp's Debian build (Zynthian's) having the same ports as Fedora's;</li>
<li>the limiter's pages on a CLAP host with a controller.</li>
</ul>
`}],r={repo:e,commit:t,pages:n};export{t as commit,r as default,n as pages,e as repo};