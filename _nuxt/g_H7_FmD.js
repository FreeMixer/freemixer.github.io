var e=`plugin-hostd-protocol`,t=`5e12b959fa098ee4800a4a8485d5c6ce1ffada2c`,n=[{slug:``,src:`README.md`,title:`plugin-hostd-protocol`,source:`https://github.com/FreeMixer/plugin-hostd-protocol/blob/5e12b959fa098ee4800a4a8485d5c6ce1ffada2c/README.md`,toc:[{id:`use-it`,title:`Use it`},{id:`the-declared-protocol`,title:`The declared protocol`},{id:`build-and-test`,title:`Build and test`},{id:`what-differs-from-mod-host`,title:`What differs from mod-host`},{id:`credit`,title:`Credit`},{id:`licence`,title:`Licence`}],html:`<h1 id="plugin-hostd-protocol">plugin-hostd-protocol</h1>
<p>The plugin-hostd protocol, a superset of mod-host's text protocol: any mod-host client works unchanged.</p>
<p><code>libplugin-hostd-protocol</code> is the socket server, the line protocol and the command dispatch that plugin-hostd and
omx-clap-host answer their controllers with. A host registers a backend (<code>host_backend_t</code>) and the library does the
rest: it listens on the command and feedback ports, splits the input into NUL-terminated commands, parses them against
the command table and answers <code>resp &lt;status&gt; [value]</code>, as mod-host does.</p>
<p>The library answers mod-host's commands as mod-host does, byte for byte, with two bugs fixed (below). Since 0.2 it also
holds the whole declared protocol: the verbs plugin-hostd and omx-clap-host add, their replies and refusals, the
events, and the one verb table and the grammar written from them (below and <a href="/projects/plugin-hostd-protocol/protocol">doc/protocol.md</a>).</p>
<h2 id="use-it">Use it</h2>
<pre><code>pkg-config --cflags --libs plugin-hostd-protocol
</code></pre>
<p>The headers are installed under <code>&lt;includedir&gt;/plugin-hostd-protocol/</code> with the names and the API of
<code>libmod-host-protocol</code> (<code>protocol.h</code>, <code>socket.h</code>, <code>host-dispatch.h</code>, <code>host-backend.h</code>, <code>host-errors.h</code>,
<code>host-scenario.h</code>, <code>mod-host.h</code>, <code>utils.h</code>), so a program built against <code>mod-host-protocol</code> changes only the package
name it asks pkg-config for. The scenario corpus every host is tested with, the source of its runner and the protocol
page are installed too: <code>pkg-config --variable=scenarios</code> (<code>runner</code>, <code>protocoldoc</code>) <code>plugin-hostd-protocol</code>.</p>
<p>The commands and the error codes: <a href="/projects/plugin-hostd-protocol/protocol">doc/protocol.md</a>.</p>
<h2 id="the-declared-protocol">The declared protocol</h2>
<p>What plugin-hostd declares of the protocol is installed with the development package, so no consumer keeps a copy:</p>
<ul>
<li><code>&lt;plugin-hostd/protocol.h&gt;</code> (under <code>&lt;includedir&gt;/plugin-hostd-protocol/</code>, found with this package's Cflags): the
verbs, the placement, the reply codes, the events, the host verb table and the settings, with the headers omx-contract
renders from <code>data/verbs.json</code> (<code>plugin_hostd_protocol_host_verbs.h</code>, <code>plugin_hostd_protocol_vocabulary.h</code>) and from
omx-clap-core's package of the contract directory (<code>omx_clap_core_host_verbs.h</code>, <code>omx_clap_core_vocabulary.h</code>);</li>
<li>the one verb table, <code>plugin-hostd-protocol.json</code>: every command, each once, with its origin (mod-host, plugin-hostd or
omx-clap-core), its argument types, its reply and its refusals, and every feedback line
(<code>pkg-config --variable=table plugin-hostd-protocol</code>);</li>
<li>the grammar of a line, in ABNF, generated from that table (<code>--variable=grammar</code>);</li>
<li><code>plugin-hostd.json</code>, what <code>protocol.h</code> declares as JSON, and its schema (<code>--variable=protocoljson</code>,
<code>--variable=protocolschema</code>), and <code>mod-host.json</code>, mod-host's commands and codes (<code>--variable=modhostjson</code>);</li>
<li>the source of the generator of <code>plugin-hostd.json</code> (<code>--variable=protocolgen</code>), for a consumer that checks its own
pages against a changed copy of the headers;</li>
<li><code>data/verbs.json</code>, as the package plugin-hostd-protocol of omx-contract's contract directory
(<code>plugin-hostd-protocol-contract</code>).</li>
</ul>
<p>Every one is written from the declarations by a tool of <code>tools/</code>, and <code>make check-generated</code> fails when one is not what
its tool writes. A word added to the protocol never changes a mod-host word: <code>tools/protocol-table.py</code> refuses to write
the table when a verb of another origin neither extends mod-host's command of the same word nor is a second form of it
told apart by its number of arguments (<code>preset_show &lt;uri&gt;</code> is mod-host's, <code>preset_show &lt;instance&gt; &lt;key&gt;</code> plugin-hostd's).
There is no list of exceptions.</p>
<p>What each host profile owes each verb a controller sends:</p>
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
<p>The profiles: <code>lv2-worker</code>, an LV2 plugin's worker: mod-host, or omx-clap-host's LV2 adapter; <code>clap-worker</code>, a CLAP plugin's worker, omx-clap-host; <code>console</code>, the openmixer console as a controller of the daemon; <code>zynthian</code>, Zynthian's mod-ui and its plugind engine as a controller of the daemon. <code>required</code> is answered as its grammar says; <code>optional</code> is answered, or refused with -902, and never misread; <code>absent</code> is refused on purpose, and no client of the profile may need it.</p>
<p>Packages: <code>plugin-hostd-protocol</code>, <code>plugin-hostd-protocol-devel</code> and <code>plugin-hostd-protocol-contract</code> (RPM),
<code>libplugin-hostd-protocol0</code>, <code>libplugin-hostd-protocol-dev</code> and <code>plugin-hostd-protocol-contract</code> (DEB). The library
package carries the table, the grammar and the JSON documents a program reads at run time; the development package the
headers, the schema, the scenario corpus and its runner, the protocol page and the generator's source.</p>
<h2 id="build-and-test">Build and test</h2>
<pre><code>make
make test
make install PREFIX=/usr LIBDIR=/usr/lib64
</code></pre>
<p><code>make test</code> needs gcc with AddressSanitizer and UndefinedBehaviorSanitizer (libasan, libubsan), python3 and
omx-contract's C headers (omx-contract-devel, libomx-contract-dev). It runs:</p>
<ul>
<li>the protocol, dispatcher and scenario tests over a fake backend (<code>test-protocol</code>, <code>test-protocol-commands</code>), and the
input splitter, NUL framing and bind address tests (<code>test-utils</code>, <code>test-socket</code>, <code>test-bind</code>);</li>
<li>the golden test (<code>test-golden</code>): the scenario corpus and both fuzz seed corpora sent over a real socket, each command
answered nine ways by a recording backend, the transcript held byte for byte to <code>tests/golden/plugin-hostd-protocol.txt</code>;</li>
<li>the comparison with mod-host (<code>test-golden-modhost</code>): every exchange of <code>tests/golden/mod-host-protocol.txt</code>, the
same transcript taken from libmod-host-protocol 0.10.6-11.3, is the same in ours, except the ones
<code>tests/golden/deviations.txt</code> names, which must differ. <code>make golden-modhost MODHOST_PREFIX=&lt;dir&gt;</code> takes it again
from a libmod-host-protocol installed there;</li>
<li>the fixes below (<code>test-fixes</code>), and each fix taken out again, which must fail (<code>test-fixes-sabotage</code>);</li>
<li>the installed library as a consumer meets it (<code>test-install</code>), the exported symbols (<code>test-abi</code>, the list of
libmod-host-protocol.so.0) and the version (<code>version-check</code>);</li>
<li>the declared protocol: every generated file is what its tool writes from the declarations (<code>check-generated</code>,
<code>check-protocol-doc</code>; <code>make gen</code> writes them), the host verb table covers every verb (<code>test-verb-table</code>),
<code>mod-host.json</code> follows its headers (<code>test-mod-host-json</code>), and each generated file edited by hand, or each
declaration changed without writing them again, turns those checks red (<code>test-generated-sabotage</code>), and so does each
rule of the host verb table broken in a scratch copy of the header.</li>
</ul>
<p><code>make check-protocol-tools</code> runs what needs tools a package build does not carry, as CI does: the rendered headers
against the installed omx-contract and omx-clap-core-contract (<code>check-rendered</code>, and <code>test-rendered-sabotage</code>), the
staged contract package (<code>check-contract-dir</code>), the JSON against its schema (<code>check-schema</code>, python3-jsonschema), and
the grammar against the scenario corpus, the golden transcript and the table (<code>test-grammar</code>, python's <code>abnf</code> module,
<code>PYTHON=&lt;an interpreter that has it&gt;</code>), each with its sabotage.</p>
<p><code>make fuzz</code> and <code>make fuzz-run</code> build and run the libFuzzer harnesses with clang (<a href="https://github.com/FreeMixer/plugin-hostd-protocol/blob/5e12b959fa098ee4800a4a8485d5c6ce1ffada2c/fuzz/README.md">fuzz/README.md</a>).</p>
<h2 id="what-differs-from-mod-host">What differs from mod-host</h2>
<ul>
<li><code>format_number()</code> writes NaN, Infinity and -Infinity, where it wrote past a stack array: <code>param_info</code> of a port whose
range or default is not finite (plugin-hostd#371).</li>
<li><code>protocol_parse()</code> runs the callback of the command the message names, and no other: <code>zzz %s 5</code> is not found, where
it ran <code>add</code> (plugin-hostd#372).</li>
<li>A verb may have more than one form, told apart by its number of arguments (<code>preset_show &lt;uri&gt;</code> is mod-host's,
<code>preset_show &lt;instance&gt; &lt;key&gt;</code> plugin-hostd's): <code>protocol_parse()</code> reads every command registered for the verb and
runs the first whose arguments fit, in number and then in types (<code>%i</code> a whole number, <code>%f</code> a number), where it read
only the first one registered. A line no form takes is refused as the first form refuses it, so a verb of one form
answers as mod-host answers it (<code>make test-forms</code>, and <code>test-forms-sabotage</code> puts the first-form reading back).</li>
</ul>
<h2 id="credit">Credit</h2>
<p>The library's code (<code>src/</code>, the headers at the top of <code>include/</code>) is mod-host's
(<a href="https://github.com/mod-audio/mod-host">mod-audio/mod-host</a>), by Filipe Coelho, MOD Audio UG and the mod-host
contributors, taken from FreeMixer's fork (<a href="https://github.com/FreeMixer/mod-host">FreeMixer/mod-host</a>, branch
<code>freemixer</code>, 013ac7d): upstream 12335c2 with the pull requests that made it a library (#81, #82, #98, #100, #101, #104
to #109, #112, #113, #116 and the bind address of FreeMixer/mod-host#12). The files that come from it keep mod-host's
copyright and licence lines. The declared protocol (<code>include/plugin-hostd/</code>, <code>data/</code>, <code>protocol/</code>, <code>grammar/</code>,
<code>tools/</code>) came from plugin-hostd.</p>
<h2 id="licence">Licence</h2>
<p>GPL-3.0-or-later, as mod-host: <a href="https://github.com/FreeMixer/plugin-hostd-protocol/blob/5e12b959fa098ee4800a4a8485d5c6ce1ffada2c/COPYING">COPYING</a>.</p>
`},{slug:`protocol`,src:`doc/protocol.md`,title:`doc/protocol.md`,source:`https://github.com/FreeMixer/plugin-hostd-protocol/blob/5e12b959fa098ee4800a4a8485d5c6ce1ffada2c/doc/protocol.md`,toc:[{id:`the-verb-table-and-the-grammar`,title:`The verb table and the grammar`},{id:`reply-codes`,title:`Reply codes`},{id:`appendix-mod-host-s-command-reference`,title:`Appendix: mod-host's command reference`},{id:`commands-or-protocol`,title:`Commands (or Protocol)`}],html:`<h1 id="the-plugin-hostd-protocol">The plugin-hostd protocol</h1>
<p>The plugin-hostd protocol is a superset of mod-host's text protocol: any mod-host client works unchanged.</p>
<p>Protocol <code>plugin-hostd</code>, version 1 of its JSON declaration (<code>protocol/plugin-hostd.json</code>); mod-host's protocol as the daemon models it is <code>protocol/mod-host.json</code>, version 1, written from the mod-host headers <code>mod-host.h</code>, <code>protocol.h</code>, <code>host-errors.h</code> the daemon is built against. The verbs the daemon adds are declared in <code>data/verbs.json</code> (since 0.12.0, requiring omx-contract-schema &gt;= 3.3.0, omx-clap-core &gt;= 0.23.0).</p>
<ol>
<li>Transport</li>
</ol>
<hr>
<table>
<thead>
<tr>
<th>what</th>
<th>value</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td>command port</td>
<td>TCP, 5555 without <code>-p</code></td>
<td>the command port without -p; the feedback port is the next one, unless -n is given</td>
</tr>
<tr>
<td>feedback port</td>
<td>TCP</td>
<td>the next port after the command port, unless -n is given; <code>-f &lt;port&gt;</code> names it</td>
</tr>
<tr>
<td>daemon ready</td>
<td><code>plugin-hostd ready!</code></td>
<td>printed on stdout once both ports accept</td>
</tr>
<tr>
<td>worker ready</td>
<td><code>ready!</code></td>
<td>the end of the line a worker prints once its socket accepts</td>
</tr>
<tr>
<td>worker command line</td>
<td><code>-n -p &lt;command port&gt; -f &lt;feedback port&gt;</code></td>
<td>how the daemon starts every worker</td>
</tr>
<tr>
<td>line_max</td>
<td>4096 bytes</td>
<td>the protocol socket's buffer: the longest pin_set line the daemon takes</td>
</tr>
<tr>
<td>line_words_max</td>
<td>64 words</td>
<td>the words of one command line the daemon reads, the verb included; a word past them is not read</td>
</tr>
<tr>
<td>string_max</td>
<td>255 bytes</td>
<td>the longest string word</td>
</tr>
</tbody>
</table>
<p>A command is one line of words, the verb first; a reply is <code>resp &lt;code&gt; [...]</code>: the words after the code are the verb's reply grammar below, and a negative code is a refusal, named in <a href="#reply-codes">Reply codes</a>. Events go out on the feedback port, one line each (<a href="#4-events-and-feedback">4. Events and feedback</a>).</p>
<p>Discovery: the daemon declares itself in files, not on the socket. The verb tables below are installed as:</p>
<table>
<thead>
<tr>
<th>file in this tree</th>
<th>installed as</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>grammar/plugin-hostd-protocol.abnf</code></td>
<td><code>/usr/share/plugin-hostd-protocol/plugin-hostd-protocol.abnf</code></td>
</tr>
<tr>
<td><code>protocol/mod-host.json</code></td>
<td><code>/usr/share/plugin-hostd-protocol/mod-host.json</code></td>
</tr>
<tr>
<td><code>protocol/plugin-hostd-protocol.json</code></td>
<td><code>/usr/share/plugin-hostd-protocol/plugin-hostd-protocol.json</code></td>
</tr>
<tr>
<td><code>protocol/plugin-hostd.json</code></td>
<td><code>/usr/share/plugin-hostd-protocol/plugin-hostd.json</code></td>
</tr>
<tr>
<td><code>protocol/plugin-hostd.schema.json</code></td>
<td><code>/usr/share/plugin-hostd-protocol/plugin-hostd.schema.json</code></td>
</tr>
</tbody>
</table>
<p><code>pkg-config --variable=protocoldir plugin-hostd-protocol</code> names that directory, and <code>--variable=table</code>, <code>grammar</code> and <code>protocoljson</code> name the files. The <code>protocol</code> and <code>version</code> keys of the protocol JSON identify it; no verb below answers a version.</p>
<h2 id="the-verb-table-and-the-grammar">The verb table and the grammar</h2>
<p><code>protocol/plugin-hostd-protocol.json</code> is the one table of the protocol: every command, each once, with its origin, its argument types, its reply and its refusals, and every feedback line. It is merged from <code>protocol/mod-host.json</code>, <code>protocol/plugin-hostd.json</code>, <code>data/verbs.json</code>, <code>include/plugin-hostd/omx_clap_core_host_verbs.h</code> by <code>tools/protocol-table.py</code>; 48 commands of origin mod-host, 27 commands of origin plugin-hostd, 11 commands of origin omx-clap-core, 21 feedback lines.</p>
<p><code>grammar/plugin-hostd-protocol.abnf</code> is the grammar of a line, in ABNF (RFC 5234, with RFC 7405's case-sensitive strings): the lexical core, written once by hand (<code>grammar/core.abnf</code>), and a rule per command, per feedback line and per parse refusal generated from the table by <code>tools/abnf-gen.py</code>. Every line of the scenario corpus and every reply the library writes in the golden transcript is held to it (<code>make test-grammar</code>).</p>
<p>A word of another origin that mod-host also has either extends mod-host's command (takes its arguments, in its types, first, and more only where mod-host's command takes a tail), or is a second form of the word told apart from mod-host's by its number of arguments, so that a line of mod-host's form is always answered as mod-host answers it. Any other is refused: the table is not written, and there is no list of exceptions. The words with more than one form:</p>
<table>
<thead>
<tr>
<th>verb</th>
<th>form</th>
<th>origin</th>
<th>reply</th>
<th>codes</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>preset_show</code></td>
<td><code>preset_show word</code></td>
<td>mod-host</td>
<td>as mod-host answers it</td>
<td>-</td>
</tr>
<tr>
<td><code>preset_show</code></td>
<td><code>preset_show int word</code></td>
<td>plugin-hostd</td>
<td>resp 0 &lt;json&gt;</td>
<td>-523 PRESET_NOT_OFFERED; -524 PRESET_INVALID; -3 reply.host.instance-non-exists; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
</tr>
</tbody>
</table>
<ol start="2">
<li>mod-host's verbs on plugin-hostd</li>
</ol>
<hr>
<p><code>required</code> is answered as its grammar says; <code>optional</code> is answered, or refused with -902, and never misread; <code>absent</code> is refused on purpose, and no client of the profile may need it.</p>
<p>Answer: <code>same</code> is relayed to the worker that holds the instance (any other verb to every worker) and answered as that worker answers it; <code>differs</code> is a verb plugin-hostd declares a grammar or a behaviour of its own for, or one the Path A run observed answered otherwise on the LV2 worker; <code>refused</code> is absent of every profile. The argument types are mod-host's templates (<code>int</code> %i, <code>word</code> %s, <code>float</code> %f, <code>...</code> an optional tail); the declarations carry no unit per argument, and a range or a unit a verb has is in its meaning.</p>
<p>mod-host's templates name no reply codes per verb: a relayed verb answers what its worker answers, or one of -503 WORKER_SPAWN (the worker is not up: the spawn failed, or it is in backoff; ask again after instance_restored) or -507 VERB_DROPPED (the worker died on this very command and the daemon dropped it: it is not replayed, and the instance_verb_dropped event names it; or it died on, or did not answer in rpc_timeout_ms, the pin_expect of an add, which is then never forwarded).</p>
<h3 id="required-of-every-profile">Required of every profile</h3>
<table>
<thead>
<tr>
<th>verb</th>
<th>mod-host arguments</th>
<th>levels</th>
<th>answer</th>
<th>what the data says</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>add</code></td>
<td>word int ...</td>
<td>required (every profile)</td>
<td>differs</td>
<td>plugin-hostd declares it: <code>&lt;uri&gt; &lt;instance&gt; [own | pool:&lt;name&gt; | chain:&lt;chain&gt; | default] [client_name]</code> → <code>resp &lt;instance&gt;</code>; mod-host's add with a placement; a token after the instance that is not a placement is the jack client name&lt;br&gt;Path A: none; no</td>
</tr>
<tr>
<td><code>remove</code></td>
<td>int</td>
<td>required (every profile)</td>
<td>same</td>
<td>Path A: none; no</td>
</tr>
<tr>
<td><code>preset_load</code></td>
<td>int word</td>
<td>required (every profile)</td>
<td>differs</td>
<td>Path A: LV2: user presets fail after a pedalboard reload; CLAP: yes, presets</td>
</tr>
<tr>
<td><code>preset_save</code></td>
<td>int word word word</td>
<td>required (every profile)</td>
<td>same</td>
<td>Path A: CLAP: user presets cannot be saved</td>
</tr>
<tr>
<td><code>preset_show</code></td>
<td>word</td>
<td>required (every profile)</td>
<td>same</td>
<td>Path A: CLAP: no&lt;br&gt;a second form, <code>preset_show int word</code> (plugin-hostd), told apart by its number of arguments: <a href="#the-verb-table-and-the-grammar">The verb table and the grammar</a></td>
</tr>
<tr>
<td><code>connect</code></td>
<td>word word</td>
<td>required (every profile)</td>
<td>differs</td>
<td>Path A: LV2: 2 replies differ, and the pedalboard's output path through mod-monitor hangs on one worker; CLAP: yes, no audio routing</td>
</tr>
<tr>
<td><code>disconnect</code></td>
<td>word word</td>
<td>required (every profile)</td>
<td>same</td>
<td>-</td>
</tr>
<tr>
<td><code>bypass</code></td>
<td>int int</td>
<td>required (every profile)</td>
<td>same</td>
<td>Path A: none; no</td>
</tr>
<tr>
<td><code>param_set</code></td>
<td>int word word</td>
<td>required (every profile)</td>
<td>same</td>
<td>Path A: CLAP: yes, every restored and moved parameter refused (pedalboard load ignores the code, mod/host.py:3849 has no callback)</td>
</tr>
<tr>
<td><code>set_bpm</code></td>
<td>float</td>
<td>required (every profile)</td>
<td>same</td>
<td>a host setting (TEMPO), kept and handed to every new worker: <a href="#host-settings">Host settings</a></td>
</tr>
<tr>
<td><code>set_bpb</code></td>
<td>float</td>
<td>required (every profile)</td>
<td>same</td>
<td>a host setting (TEMPO), kept and handed to every new worker: <a href="#host-settings">Host settings</a></td>
</tr>
<tr>
<td><code>cpu_load</code></td>
<td>none</td>
<td>required (every profile)</td>
<td>same</td>
<td>Path A: not compared beyond the code (a load figure is timing, OWED on hardware)</td>
</tr>
<tr>
<td><code>bundle_add</code></td>
<td>word</td>
<td>required (every profile)</td>
<td>same</td>
<td>Path A: CLAP: no (mod-ui ignores it)</td>
</tr>
<tr>
<td><code>bundle_remove</code></td>
<td>word word</td>
<td>required (every profile)</td>
<td>same</td>
<td>Path A: as bundle_add</td>
</tr>
<tr>
<td><code>state_load</code></td>
<td>word</td>
<td>required (every profile)</td>
<td>same</td>
<td>Path A: CLAP: yes, plugin state not restored with the pedalboard</td>
</tr>
<tr>
<td><code>state_save</code></td>
<td>word</td>
<td>required (every profile)</td>
<td>same</td>
<td>Path A: none; no</td>
</tr>
<tr>
<td><code>state_tmpdir</code></td>
<td>word</td>
<td>required (every profile)</td>
<td>same</td>
<td>Path A: CLAP: no</td>
</tr>
<tr>
<td><code>feature_enable</code></td>
<td>word int</td>
<td>required (every profile)</td>
<td>differs</td>
<td>Path A: LV2: a worker started later never hears it; CLAP: processing on/off refused</td>
</tr>
<tr>
<td><code>transport</code></td>
<td>int float float</td>
<td>required (every profile)</td>
<td>same</td>
<td>Path A: none, but the transport feedback comes once per worker (6 against 1 in the session)&lt;br&gt;a host setting (TEMPO), kept and handed to every new worker: <a href="#host-settings">Host settings</a></td>
</tr>
<tr>
<td><code>transport_sync</code></td>
<td>word</td>
<td>required (every profile)</td>
<td>same</td>
<td>Path A: none; no&lt;br&gt;a host setting (TEMPO), kept and handed to every new worker: <a href="#host-settings">Host settings</a></td>
</tr>
<tr>
<td><code>quit</code></td>
<td>none</td>
<td>required (every profile)</td>
<td>same</td>
<td>-</td>
</tr>
</tbody>
</table>
<h3 id="optional">Optional</h3>
<table>
<thead>
<tr>
<th>verb</th>
<th>mod-host arguments</th>
<th>levels</th>
<th>answer</th>
<th>what the data says</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>param_get</code></td>
<td>int word</td>
<td>optional (every profile)</td>
<td>same</td>
<td>-</td>
</tr>
<tr>
<td><code>param_monitor</code></td>
<td>int word word float</td>
<td>optional (every profile)</td>
<td>same</td>
<td>relay rule SUBSCRIPTION: monitor_output is in the ledger, one line per output, and param_monitor as it was sent; a respawn replays them after the add, so a respawned instance reports the same outputs, each once, starting again from its first value</td>
</tr>
<tr>
<td><code>patch_get</code></td>
<td>int word</td>
<td>optional (every profile)</td>
<td>same</td>
<td>Path A: none for the probe plugin; a plugin with patch parameters is untested; no</td>
</tr>
<tr>
<td><code>patch_set</code></td>
<td>int word word</td>
<td>optional (every profile)</td>
<td>same</td>
<td>Path A: as patch_get</td>
</tr>
<tr>
<td><code>licensee</code></td>
<td>int</td>
<td>optional (every profile)</td>
<td>same</td>
<td>-</td>
</tr>
<tr>
<td><code>monitor</code></td>
<td>word int int</td>
<td>optional (every profile)</td>
<td>same</td>
<td>-</td>
</tr>
<tr>
<td><code>monitor_output</code></td>
<td>int word</td>
<td>optional (every profile)</td>
<td>same</td>
<td>Path A: CLAP: no meters, and no refusal&lt;br&gt;relay rule SUBSCRIPTION: monitor_output is in the ledger, one line per output, and param_monitor as it was sent; a respawn replays them after the add, so a respawned instance reports the same outputs, each once, starting again from its first value</td>
</tr>
<tr>
<td><code>monitor_midi_program</code></td>
<td>int int</td>
<td>optional (every profile)</td>
<td>same</td>
<td>Path A: CLAP-only rig: pedalboard change by MIDI program lost</td>
</tr>
<tr>
<td><code>midi_learn</code></td>
<td>int word float float</td>
<td>optional (every profile)</td>
<td>same</td>
<td>Path A: CLAP: MIDI learn through mod-ui lost</td>
</tr>
<tr>
<td><code>midi_map</code></td>
<td>int word int int float float</td>
<td>optional (every profile)</td>
<td>same</td>
<td>Path A: CLAP: saved MIDI maps not restored</td>
</tr>
<tr>
<td><code>midi_unmap</code></td>
<td>int word</td>
<td>optional (every profile)</td>
<td>same</td>
<td>Path A: as midi_map</td>
</tr>
<tr>
<td><code>cv_map</code></td>
<td>int word word float float word</td>
<td>optional (every profile)</td>
<td>same</td>
<td>Path A: CLAP: CV addressing lost</td>
</tr>
<tr>
<td><code>cv_unmap</code></td>
<td>int word</td>
<td>optional (every profile)</td>
<td>same</td>
<td>Path A: as cv_map</td>
</tr>
<tr>
<td><code>load</code></td>
<td>word</td>
<td>optional (every profile)</td>
<td>same</td>
<td>-</td>
</tr>
<tr>
<td><code>save</code></td>
<td>word</td>
<td>optional (every profile)</td>
<td>same</td>
<td>-</td>
</tr>
<tr>
<td><code>output_data_ready</code></td>
<td>none</td>
<td>optional (every profile)</td>
<td>same</td>
<td>Path A: CLAP: no&lt;br&gt;relay rule HANDSHAKE: output_data_ready names no instance and goes to every worker; each worker's data_finish is relayed</td>
</tr>
<tr>
<td><code>track_info</code></td>
<td>int word word ...</td>
<td>optional (every profile)</td>
<td>differs</td>
<td>plugin-hostd declares it: <code>&lt;instance&gt; &lt;name&gt; &lt;#RRGGBB | -&gt; [bus | return | master]</code> → <code>resp 0</code>; the strip's name (&quot;&quot; for none), colour and kind, absent for an input channel; a worker whose plugin format has a track-info extension passes them on; any other word is -902</td>
</tr>
<tr>
<td><code>remote_pages</code></td>
<td>int</td>
<td>optional (every profile)</td>
<td>differs</td>
<td>plugin-hostd declares it: <code>&lt;instance&gt;</code> → <code>resp &lt;count&gt;</code>; the plugin's remote-control pages, from clap.remote-controls; 0 for an instance of a format whose worker has none</td>
</tr>
<tr>
<td><code>remote_page_get</code></td>
<td>int int</td>
<td>optional (every profile)</td>
<td>differs</td>
<td>plugin-hostd declares it: <code>&lt;instance&gt; &lt;page&gt;</code> → <code>resp 0 &lt;page_id&gt; &lt;section&gt; &lt;page_name&gt; &lt;s1&gt; &lt;s2&gt; &lt;s3&gt; &lt;s4&gt; &lt;s5&gt; &lt;s6&gt; &lt;s7&gt; &lt;s8&gt;</code>; one page, 0 to count - 1: each slot the symbol param_set takes, - for an empty one; -902 for a page that is not one</td>
</tr>
<tr>
<td><code>param_info</code></td>
<td>int word</td>
<td>optional (every profile)</td>
<td>differs</td>
<td>plugin-hostd declares it: <code>&lt;instance&gt; &lt;symbol&gt;</code> → <code>resp 0 &lt;unit&gt; &lt;scale&gt; &lt;min&gt; &lt;max&gt; &lt;default&gt; &lt;step&gt; &lt;stable_symbol&gt;</code>; what a parameter's value means: its unit, its scale, and the symbol it keeps across hosts and versions; -103 for a symbol that is not a parameter, the plugin's own bypass and :bypass included; -511 for a parameter whose unit and scale the worker holds no checked contract for</td>
</tr>
<tr>
<td><code>help</code></td>
<td>none</td>
<td>optional (every profile)</td>
<td>same</td>
<td>-</td>
</tr>
</tbody>
</table>
<h3 id="absent-refused-on-purpose">Absent: refused on purpose</h3>
<table>
<thead>
<tr>
<th>verb</th>
<th>mod-host arguments</th>
<th>levels</th>
<th>answer</th>
<th>what the data says</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>cc_map</code></td>
<td>int word int int word float float float int int word int ...</td>
<td>absent (every profile)</td>
<td>refused</td>
<td>absent of every profile: refused on purpose&lt;br&gt;Path A: none on Zynthian (no Control Chain hardware); no</td>
</tr>
<tr>
<td><code>cc_value_set</code></td>
<td>int word float</td>
<td>absent (every profile)</td>
<td>refused</td>
<td>absent of every profile: refused on purpose&lt;br&gt;Path A: as cc_map</td>
</tr>
<tr>
<td><code>cc_unmap</code></td>
<td>int word</td>
<td>absent (every profile)</td>
<td>refused</td>
<td>absent of every profile: refused on purpose&lt;br&gt;Path A: as cc_map</td>
</tr>
<tr>
<td><code>hmi_map</code></td>
<td>int word int int int int int word float float int</td>
<td>absent (every profile)</td>
<td>refused</td>
<td>absent of every profile: refused on purpose&lt;br&gt;Path A: none on Zynthian (no MOD HMI); no</td>
</tr>
<tr>
<td><code>hmi_unmap</code></td>
<td>int word</td>
<td>absent (every profile)</td>
<td>refused</td>
<td>absent of every profile: refused on purpose&lt;br&gt;Path A: as hmi_map</td>
</tr>
<tr>
<td><code>show_external_ui</code></td>
<td>int</td>
<td>absent (every profile)</td>
<td>refused</td>
<td>absent of every profile: refused on purpose&lt;br&gt;Path A: none; no</td>
</tr>
</tbody>
</table>
<p>Verbs of Zynthian's mod-ui that are no mod-host command, each refused:</p>
<table>
<thead>
<tr>
<th>verb</th>
<th>levels</th>
<th>Path A</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>set_midi_program_change_pedalboard_bank_channel</code></td>
<td>absent (every profile)</td>
<td>dead code in Zynthian's mod-ui; the only verbs of mod-ui's source missing from protocol/mod-host.json</td>
</tr>
<tr>
<td><code>set_midi_program_change_pedalboard_snapshot_channel</code></td>
<td>absent (every profile)</td>
<td>as above</td>
</tr>
</tbody>
</table>
<h3 id="the-path-a-evidence">The Path A evidence</h3>
<p><code>doc/evidence/mod-ui-verbs.tsv</code>: every verb Zynthian's mod-ui sends, replayed against mod-host and against plugin-hostd. The column heads name the versions that ran; the rows are what was observed then, not run again by this page.</p>
<table>
<thead>
<tr>
<th>verb</th>
<th>sent by mod-ui (zynthian/mod-ui 817a672 file:line; times in the session)</th>
<th>LV2 worker (plugin-hostd + mod-host 12335c2)</th>
<th>CLAP worker (plugin-hostd + omx-clap-host 0.12.0)</th>
<th>difference from mod-host (and: breaks a CLAP pedalboard?)</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>add</code></td>
<td>mod/host.py:2581, :3849 (pedalboard load); 10</td>
<td>resp &lt;n&gt;, as mod-host</td>
<td>resp &lt;n&gt;</td>
<td>none; no</td>
</tr>
<tr>
<td><code>remove</code></td>
<td>mod/host.py:1083 (remove -1), :2305; 7</td>
<td>resp 0, as mod-host</td>
<td>resp 0</td>
<td>none; no</td>
</tr>
<tr>
<td><code>connect</code></td>
<td>mod/host.py:2218, :3409; 24</td>
<td>resp 0 between instance ports; resp -902 for system:capture_N -&gt; mod-monitor:in_N (no instance owns either port; diff.txt); mod-monitor exists only while the first LV2 worker, the one JACK names mod-host, lives (mod-host src/effects.c:3922), -205 once it is removed (monitor-owner.txt)</td>
<td>resp -205 for 22 of 24 in the replay: mod-ui writes the LV2 port symbols, the CLAP worker's ports are named otherwise; -205 for mod-monitor (probe.tsv)</td>
<td>LV2: 2 replies differ, and the pedalboard's output path through mod-monitor hangs on one worker; CLAP: yes, no audio routing</td>
</tr>
<tr>
<td><code>bypass</code></td>
<td>mod/host.py:2161, :2692; 10</td>
<td>resp 0, as mod-host</td>
<td>resp 0</td>
<td>none; no</td>
</tr>
<tr>
<td><code>param_set</code></td>
<td>mod/host.py:2172, :2715; 40</td>
<td>resp 0, as mod-host</td>
<td>resp -103 for all 40 (LV2 symbols; the CLAP worker takes the parameter number); resp 0 with a number (probe.tsv)</td>
<td>CLAP: yes, every restored and moved parameter refused (pedalboard load ignores the code, mod/host.py:3849 has no callback)</td>
</tr>
<tr>
<td><code>patch_get</code></td>
<td>mod/host.py:2720; 0</td>
<td>resp -902, as mod-host (the probe plugin has no patch parameter)</td>
<td>resp -902</td>
<td>none for the probe plugin; a plugin with patch parameters is untested; no</td>
</tr>
<tr>
<td><code>patch_set</code></td>
<td>mod/host.py:2189, :2730; 0</td>
<td>resp -902, as mod-host</td>
<td>resp -902</td>
<td>as patch_get</td>
</tr>
<tr>
<td><code>preset_load</code></td>
<td>mod/host.py:2166, :3867; 5</td>
<td>resp 0 in one worker; resp -105 for a user preset when the instance's worker started after the preset's bundle_add (diff.txt, 2 of 5)</td>
<td>resp -902</td>
<td>LV2: user presets fail after a pedalboard reload; CLAP: yes, presets</td>
</tr>
<tr>
<td><code>preset_save</code></td>
<td>mod/host.py:2925; 2</td>
<td>resp 0, as mod-host</td>
<td>resp -902</td>
<td>CLAP: user presets cannot be saved</td>
</tr>
<tr>
<td><code>preset_show</code></td>
<td>mod/host.py:2829; 2</td>
<td>the preset's Turtle, identical</td>
<td>resp -902</td>
<td>CLAP: no</td>
</tr>
<tr>
<td><code>bundle_add</code></td>
<td>mod/host.py:2240; 2</td>
<td>resp 0, as mod-host (not replayed to later workers, see preset_load)</td>
<td>resp -902</td>
<td>CLAP: no (mod-ui ignores it)</td>
</tr>
<tr>
<td><code>bundle_remove</code></td>
<td>mod/host.py:2260; 0</td>
<td>resp 0, as mod-host</td>
<td>resp -902</td>
<td>as bundle_add</td>
</tr>
<tr>
<td><code>state_load</code></td>
<td>mod/host.py:2145, :3665; 3</td>
<td>resp 0, as mod-host</td>
<td>resp -105 (2 of 3 in the replay); resp -105 in the probe</td>
<td>CLAP: yes, plugin state not restored with the pedalboard</td>
</tr>
<tr>
<td><code>state_save</code></td>
<td>mod/host.py:4012; 2</td>
<td>resp 0, as mod-host</td>
<td>resp 0</td>
<td>none; no</td>
</tr>
<tr>
<td><code>state_tmpdir</code></td>
<td>mod/host.py:1086; 1</td>
<td>resp 0, as mod-host</td>
<td>resp -902 in the probe (resp 0 in the replay, sent before any CLAP worker existed)</td>
<td>CLAP: no</td>
</tr>
<tr>
<td><code>feature_enable</code></td>
<td>mod/host.py:3489 (aggregated-midi), :5689 (processing); 17</td>
<td>processing: resp 0; aggregated-midi: -202 from a worker, as mod-host here (the pod has no mod-midi-merger internal client); with no worker running the daemon answers 0 and keeps nothing</td>
<td>resp -902</td>
<td>LV2: a worker started later never hears it; CLAP: processing on/off refused</td>
</tr>
<tr>
<td><code>transport</code></td>
<td>mod/host.py:2028, :4656; 7</td>
<td>resp 0, as mod-host</td>
<td>resp 0</td>
<td>none, but the transport feedback comes once per worker (6 against 1 in the session)</td>
</tr>
<tr>
<td><code>transport_sync</code></td>
<td>mod/host.py:4565; 1</td>
<td>resp 0, as mod-host</td>
<td>resp 0</td>
<td>none; no</td>
</tr>
<tr>
<td><code>monitor_output</code></td>
<td>mod/host.py:2180, :2565; 0</td>
<td>resp 1, as mod-host</td>
<td>resp 0 for any symbol</td>
<td>CLAP: no meters, and no refusal</td>
</tr>
<tr>
<td><code>monitor_midi_program</code></td>
<td>mod/host.py:1126; 0</td>
<td>resp 0, as mod-host</td>
<td>resp -902</td>
<td>CLAP-only rig: pedalboard change by MIDI program lost</td>
</tr>
<tr>
<td><code>midi_learn</code></td>
<td>mod/host.py:4922; 0</td>
<td>resp 1, as mod-host</td>
<td>resp -902</td>
<td>CLAP: MIDI learn through mod-ui lost</td>
</tr>
<tr>
<td><code>midi_map</code></td>
<td>mod/host.py:764, :2164; 0</td>
<td>resp 1, as mod-host</td>
<td>resp -902</td>
<td>CLAP: saved MIDI maps not restored</td>
</tr>
<tr>
<td><code>midi_unmap</code></td>
<td>mod/host.py:807; 0</td>
<td>resp 1, as mod-host</td>
<td>resp -902</td>
<td>as midi_map</td>
</tr>
<tr>
<td><code>cc_map</code></td>
<td>mod/host.py:748; 0</td>
<td>resp -401, as mod-host (no Control Chain)</td>
<td>resp -902</td>
<td>none on Zynthian (no Control Chain hardware); no</td>
</tr>
<tr>
<td><code>cc_value_set</code></td>
<td>mod/host.py:868; 0</td>
<td>resp -401, as mod-host</td>
<td>resp -902</td>
<td>as cc_map</td>
</tr>
<tr>
<td><code>cc_unmap</code></td>
<td>mod/host.py:803; 0</td>
<td>resp -401, as mod-host</td>
<td>resp -902</td>
<td>as cc_map</td>
</tr>
<tr>
<td><code>cv_map</code></td>
<td>mod/host.py:780, :2204; 0</td>
<td>resp 0, as mod-host</td>
<td>resp -902</td>
<td>CLAP: CV addressing lost</td>
</tr>
<tr>
<td><code>cv_unmap</code></td>
<td>mod/host.py:811; 0</td>
<td>resp 0, as mod-host</td>
<td>resp -902</td>
<td>as cv_map</td>
</tr>
<tr>
<td><code>hmi_map</code></td>
<td>mod/host.py:689; 0</td>
<td>resp -403, as mod-host (no HMI)</td>
<td>resp -902</td>
<td>none on Zynthian (no MOD HMI); no</td>
</tr>
<tr>
<td><code>hmi_unmap</code></td>
<td>mod/host.py:694; 0</td>
<td>resp -403, as mod-host</td>
<td>resp -902</td>
<td>as hmi_map</td>
</tr>
<tr>
<td><code>cpu_load</code></td>
<td>mod/host.py:5736, mod/session.py:354; 0</td>
<td>resp 0 ..., as mod-host</td>
<td>resp 0 ...</td>
<td>not compared beyond the code (a load figure is timing, OWED on hardware)</td>
</tr>
<tr>
<td><code>output_data_ready</code></td>
<td>mod/host.py:1888; 2</td>
<td>resp 0, as mod-host</td>
<td>resp -902 in the probe (resp 0 in the replay, broadcast)</td>
<td>CLAP: no</td>
</tr>
<tr>
<td><code>show_external_ui</code></td>
<td>mod/session.py:349; 0</td>
<td>resp -902, as mod-host</td>
<td>resp -902</td>
<td>none; no</td>
</tr>
<tr>
<td><code>set_midi_program_change_pedalboard_bank_channel</code></td>
<td>mod/host.py:4735, commented out: never sent</td>
<td>-</td>
<td>-</td>
<td>dead code in Zynthian's mod-ui; the only verbs of mod-ui's source missing from protocol/mod-host.json</td>
</tr>
<tr>
<td><code>set_midi_program_change_pedalboard_snapshot_channel</code></td>
<td>mod/host.py:4739, commented out: never sent</td>
<td>-</td>
<td>-</td>
<td>as above</td>
</tr>
</tbody>
</table>
<ol start="3">
<li>Verbs mod-host does not have</li>
</ol>
<hr>
<p>Each is declared in <code>protocol/plugin-hostd.json</code>; the formats, codes and hosts come from <code>data/verbs.json</code>, or from omx-clap-core's verb table for a verb the two hosts share. A verb whose meaning begins &quot;sent by the daemon to a worker&quot; is the daemon's to a worker, never a controller's.</p>
<h3 id="placement-and-supervision">Placement and supervision</h3>
<table>
<thead>
<tr>
<th>verb</th>
<th>arguments</th>
<th>types</th>
<th>reply</th>
<th>codes</th>
<th>since (the group's)</th>
<th>hosts</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>worker_list</code></td>
<td>none</td>
<td>none</td>
<td><code>resp &lt;n&gt; &lt;worker&gt;:&lt;pid&gt;:&lt;format&gt;:&lt;state&gt;:&lt;core&gt;:&lt;pool&gt;:&lt;place&gt;:&lt;i&gt;,&lt;i&gt;,...</code></td>
<td>-901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>the workers, one record each</td>
</tr>
<tr>
<td><code>instance_info</code></td>
<td><code>&lt;instance&gt;</code></td>
<td>int</td>
<td><code>resp 0 &lt;worker&gt; &lt;pid&gt; &lt;state&gt; &lt;crashes&gt; &lt;quarantined&gt;</code></td>
<td>-3 reply.host.instance-non-exists; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>where an instance lives and what it has cost</td>
</tr>
<tr>
<td><code>supervisor_reset</code></td>
<td><code>[&lt;worker&gt; | all]</code></td>
<td>...</td>
<td><code>resp 0</code></td>
<td>-506 NO_SUCH_WORKER; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>re-arm the storm bound and the backoff of a given-up placement</td>
</tr>
<tr>
<td><code>quarantine_clear</code></td>
<td><code>&lt;instance&gt; | all</code></td>
<td>word</td>
<td><code>resp 0</code></td>
<td>-3 reply.host.instance-non-exists; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>let a quarantined instance go back where its placement says</td>
</tr>
<tr>
<td><code>policy_set</code></td>
<td><code>&lt;format | *&gt; own | pool:&lt;name&gt;</code></td>
<td>word word</td>
<td><code>resp 0</code></td>
<td>-501 PLACEMENT_INVALID; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>the placement of an add that says default</td>
</tr>
<tr>
<td><code>pool_config</code></td>
<td><code>&lt;name&gt; &lt;max_instances&gt;</code></td>
<td>word int</td>
<td><code>resp 0</code></td>
<td>-501 PLACEMENT_INVALID; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>the instances a pool holds before a sibling opens</td>
</tr>
<tr>
<td><code>worker_env</code></td>
<td><code>&lt;format | *&gt; &lt;cpu-list|-&gt; &lt;nice|-&gt;</code></td>
<td>word word word</td>
<td><code>resp 0</code></td>
<td>-901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>the cpu list and the nice value of the workers of a format, at spawn and on the ones running</td>
</tr>
<tr>
<td><code>lv2_worker_set</code></td>
<td><code>&lt;uri&gt; &lt;mod-host | omx-clap-host | auto | -&gt;</code></td>
<td>word word</td>
<td><code>resp 0</code></td>
<td>-901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>the worker of one LV2 plugin, for its adds from now on: it overrides the lv2_worker setting, - takes the override back; -902 for a word that is none of these. Like policy_set it is the controller's, not in the ledger, gone with the daemon</td>
</tr>
</tbody>
</table>
<p><code>worker_list</code>:</p>
<pre><code>&gt; worker_list
&lt; resp &lt;n&gt; &lt;worker&gt;:&lt;pid&gt;:&lt;format&gt;:&lt;state&gt;:&lt;core&gt;:&lt;pool&gt;:&lt;place&gt;:&lt;i&gt;,&lt;i&gt;,...
</code></pre>
<p><code>instance_info</code>:</p>
<pre><code>&gt; instance_info 0
&lt; resp 0 &lt;worker&gt; &lt;pid&gt; &lt;state&gt; &lt;crashes&gt; &lt;quarantined&gt;
</code></pre>
<p><code>supervisor_reset</code>:</p>
<pre><code>&gt; supervisor_reset
&lt; resp 0
</code></pre>
<p><code>quarantine_clear</code>:</p>
<pre><code>&gt; quarantine_clear 0
&lt; resp 0
</code></pre>
<p><code>policy_set</code>:</p>
<pre><code>&gt; policy_set clap own
&lt; resp 0
</code></pre>
<p><code>pool_config</code>:</p>
<pre><code>&gt; pool_config fx 4
&lt; resp 0
</code></pre>
<p><code>worker_env</code>:</p>
<pre><code>&gt; worker_env clap - -
&lt; resp 0
</code></pre>
<p><code>lv2_worker_set</code>:</p>
<pre><code>&gt; lv2_worker_set lv2:urn:openmixer:comp omx-clap-host
&lt; resp 0
</code></pre>
<h3 id="pins-and-qualification">Pins and qualification</h3>
<table>
<thead>
<tr>
<th>verb</th>
<th>arguments</th>
<th>types</th>
<th>reply</th>
<th>codes</th>
<th>since (the group's)</th>
<th>hosts</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>pin_set</code></td>
<td><code>&lt;uri&gt; &lt;path&gt;=&lt;sha256&gt;[,&lt;path&gt;=&lt;sha256&gt;...] &lt;scheme&gt;:&lt;sha256&gt; [verdict=&lt;verdict&gt;] [pool=&lt;pool&gt;]</code></td>
<td>word word word ...</td>
<td><code>resp 0</code></td>
<td>-516 PIN_REFUSED; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>the pin of one plugin: the SHA-256 of every file the host loads for it, a path relative to the bundle (the directory of a single-file format's file), its layout fingerprint and, when they are known, the verdict of its qualification and whether its worker gets the CLAP thread pool; it replaces an earlier pin of the uri; -516 for a plugin whose pins_dir pin carries verdict=refused, which nothing overrides. The pin store, a pin_file and a pins_dir file hold the same line, with or without the verb</td>
</tr>
<tr>
<td><code>pin_clear</code></td>
<td><code>&lt;uri&gt; | all</code></td>
<td>word</td>
<td><code>resp 0</code></td>
<td>-901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>forget the pin of one plugin, or of every one; a pins_dir pin is read-only and holds again</td>
</tr>
<tr>
<td><code>pin_reload</code></td>
<td>none</td>
<td>none</td>
<td><code>resp 0</code></td>
<td>-902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>read the pin_file and the pins_dir files again and put the pins in at once, without a restart; the daemon also does this by itself when one of those files changes. Running instances keep running: one the new pins refuse is logged and its id in worker_list is followed by !. The pin_set pins of the controller are kept. -902 under pin_mode off or when the pin_file is gone or has a line outside the grammar, and the earlier pins hold</td>
</tr>
<tr>
<td><code>pin_changed</code></td>
<td><code>[&lt;uri&gt;] [files | layout]</code></td>
<td>...</td>
<td><code>resp 0</code></td>
<td>-902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>the notice the package sync sends to every daemon it knows after it rewrote the pin file: the same as pin_reload, with or without the pin_changed event's words after it; more words than those are -902</td>
</tr>
<tr>
<td><code>pin_accept</code></td>
<td><code>&lt;uri&gt;</code></td>
<td>word</td>
<td><code>resp 0</code></td>
<td>-508 PIN_ABSENT; -509 PIN_BINARY_MISMATCH; -516 PIN_REFUSED; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>pin_mode first-use only: take the plugin's files as they are now as its pin, after a pin_changed event; the layout is learned again by the next add and the verdict is dropped; -508 when the plugin has no pin, -509 when its files cannot be collected, -516 when its pins_dir pin carries verdict=refused, -902 under pin_mode strict</td>
</tr>
<tr>
<td><code>pin_layout</code></td>
<td><code>&lt;instance&gt;</code></td>
<td>int</td>
<td><code>resp 0 &lt;scheme&gt;:&lt;sha256&gt;</code></td>
<td>-</td>
<td>0.12.0</td>
<td>omx-clap-host optional, mod-host unsupported</td>
<td>sent by the daemon to a worker of a format that checks layouts, after it accepted the add of a plugin whose layout pin is still unknown: the layout the worker found after init, which the daemon records in the pin</td>
</tr>
<tr>
<td><code>pin_expect</code></td>
<td><code>&lt;instance&gt; &lt;scheme&gt;:&lt;sha256&gt;</code></td>
<td>int word</td>
<td><code>resp 0</code></td>
<td>-1 reply.host.instance-invalid; -902 reply.host.invalid-operation; -508 PIN_ABSENT</td>
<td>-</td>
<td>plugin-hostd unsupported, omx-clap-host required, mod-host unsupported</td>
<td>sent by the daemon to a worker of a format that checks layouts, just before the instance's add: the layout pin that add checks after init and before activate; any other reply than resp 0 refuses the add with that code, and the add is never forwarded</td>
</tr>
</tbody>
</table>
<p><code>pin_set</code>:</p>
<pre><code>&gt; pin_set clap:/usr/lib/clap/omx-comp.clap#org.openmixer.comp &lt;path&gt;=&lt;sha256&gt; &lt;scheme&gt;:&lt;sha256&gt;
&lt; resp 0
</code></pre>
<p><code>pin_clear</code>:</p>
<pre><code>&gt; pin_clear clap:/usr/lib/clap/omx-comp.clap#org.openmixer.comp
&lt; resp 0
</code></pre>
<p><code>pin_reload</code>:</p>
<pre><code>&gt; pin_reload
&lt; resp 0
</code></pre>
<p><code>pin_changed</code>:</p>
<pre><code>&gt; pin_changed
&lt; resp 0
</code></pre>
<p><code>pin_accept</code>:</p>
<pre><code>&gt; pin_accept clap:/usr/lib/clap/omx-comp.clap#org.openmixer.comp
&lt; resp 0
</code></pre>
<p><code>pin_layout</code>:</p>
<pre><code>&gt; pin_layout 0
&lt; resp 0 &lt;scheme&gt;:&lt;sha256&gt;
</code></pre>
<p><code>pin_expect</code>:</p>
<pre><code>&gt; pin_expect 0 &lt;scheme&gt;:&lt;sha256&gt;
&lt; resp 0
</code></pre>
<h3 id="chains-and-plans">Chains and plans</h3>
<table>
<thead>
<tr>
<th>verb</th>
<th>arguments</th>
<th>types</th>
<th>reply</th>
<th>codes</th>
<th>since (the group's)</th>
<th>hosts</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>chain</code></td>
<td><code>&lt;chain&gt; &lt;instance&gt; [&lt;instance&gt; ...]</code></td>
<td>int int ...</td>
<td><code>resp 0</code></td>
<td>-518 CHAIN_UNKNOWN_INSTANCE; -519 CHAIN_DUPLICATE; -520 CHAIN_INSTANCE_BUSY; -521 CHAIN_MIXED_FORMAT; -501 PLACEMENT_INVALID; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required, omx-clap-host required, mod-host unsupported</td>
<td>the instances, in this order, are one chain, run in one worker of place chain:&lt;chain&gt;: each member's state is saved, it is removed from the worker it was in and replayed in the chain's. A chain already declared takes the new order, and a member left out of it goes back to a worker of its own; while its worker is up that worker is kept: a new member joins it (its add, the order, its state, its ledger, its connections) and no other member is restarted, unless the new member's format narrows the worker's world, which forms the chain again. Members of clap and lv2-clap form one chain. A worker that runs chains in one client (clap, lv2-clap) is sent this line, with the members it holds, after the adds of its replay; one that does not (mod-host) never is. A worker that refuses the line would not run the members as one: the chain is forgotten and each member runs in a worker of its own, the line answers -501, and the event chain_refused carries the worker's own code, also when the refusal comes later, on a respawn. Every instance verb still names one member by its own number. A member that crashes the worker is quarantined to a worker of its own and the chain goes on without it; quarantine_clear puts it back. -518 for an instance no add made, -519 for one named twice, -520 for one in another chain, -521 for members no one worker program runs together, -501 for a plugin that may not share a worker while require_pins is on (a CLAP plugin whose first-use pin is not in-process; an LV2 member whose bundle is not found, since a chain's worker sees a world narrowed to the union of its members' bundles), -902 for a chain or an instance that is not a number, or fewer than chain_members_min (1) instances</td>
</tr>
<tr>
<td><code>chain_clear</code></td>
<td><code>&lt;chain&gt;</code></td>
<td>int</td>
<td><code>resp 0</code></td>
<td>-522 NO_SUCH_CHAIN; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>forget the chain: each member goes to a worker of its own; -522 for a chain no chain declared</td>
</tr>
<tr>
<td><code>chain_get</code></td>
<td><code>&lt;chain&gt;</code></td>
<td>int</td>
<td><code>resp 0 &lt;worker&gt; &lt;instance&gt;,... &lt;instance&gt;,...</code></td>
<td>-522 NO_SUCH_CHAIN; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>read a chain back: its worker (- when it has none), its members in the declared order, and the members its worker runs now in their order (- for none); a quarantined member is declared and not running; -522 for a chain no chain declared, -902 for a chain that is not a number</td>
</tr>
<tr>
<td><code>plan</code></td>
<td><code>&lt;chain&gt; &lt;instance&gt; [&lt;instance&gt; ...]</code></td>
<td>int int ...</td>
<td><code>resp 0 &lt;instance&gt;,...;&lt;instance&gt;,...;... &lt;core&gt;,...;&lt;core&gt;,...;...</code></td>
<td>-518 CHAIN_UNKNOWN_INSTANCE; -519 CHAIN_DUPLICATE; -520 CHAIN_INSTANCE_BUSY; -501 PLACEMENT_INVALID; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>the instances, in signal order, are planned (the grouping-planner design note): the daemon decides, from the pin and the cost of each, which runs of consecutive members share a worker. A run of two or more is declared as a chain of place chain:&lt;chain&gt;.&lt;k&gt;, k counting segments from 0; a member that shares with no neighbour is placed own. The reply names the segments in order, the members of one joined by commas and the segments by semicolons, then the cores: the segments again with each member replaced by the audio core of the worker that runs it now, - for one the setting placement did not pin (docs/placement.md). A chain planned again keeps the running worker of every segment that did not change, and the daemon plans it again by itself when a member is quarantined and, history_regroup_s after a death that split its group, to gather it. The plan numbers are its own, apart from chain's. While the setting grouping is off the plan is answered and kept for plan_get and nothing moves. A segment that cannot be formed refuses the whole plan with its own code, moves nothing and is told by plan_get as plan-refused:&lt;code&gt;. A segment its worker refuses, which is known only once it has moved, refuses the plan with -501 too, and then every segment ends and each member runs in a worker of its own. -518 for an instance no add made, -519 for one named twice, -520 for one in a chain or in the plan of another chain, -501 for a segment no world can be built for or its worker refuses, -902 for a chain or an instance that is not a number, or fewer than chain_members_min (1) instances</td>
</tr>
<tr>
<td><code>plan_get</code></td>
<td><code>&lt;chain&gt;</code></td>
<td>int</td>
<td><code>resp 0 &lt;instance&gt;,...;&lt;instance&gt;,...;... &lt;instance&gt;:&lt;reason&gt;,... &lt;core&gt;,...;&lt;core&gt;,...;...</code></td>
<td>-532 NO_SUCH_PLAN; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>read the last plan of a chain back: its segments as plan answered them, then the members that have a reason, instance:reason joined by commas (- for none); the reasons are the words of PLUGIN_HOSTD_GROUPING_REASONS (data/grouping.json), then the cores of the members as plan answers them; -532 for a chain no plan planned, -902 for a chain that is not a number</td>
</tr>
<tr>
<td><code>plan_clear</code></td>
<td><code>&lt;chain&gt;</code></td>
<td>int</td>
<td><code>resp 0</code></td>
<td>-532 NO_SUCH_PLAN; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>forget the plan: each member goes to a worker of its own; -532 for a chain no plan planned</td>
</tr>
<tr>
<td><code>estimate</code></td>
<td><code>&lt;rate&gt; &lt;quantum&gt; &lt;uri&gt; [&lt;uri&gt; ...]</code></td>
<td>int int word ...</td>
<td><code>resp 0 &lt;latency_frames&gt; &lt;cpu_percent&gt; &lt;ram_bytes&gt; &lt;workers&gt; &lt;unknown_count&gt; &lt;member&gt;:&lt;code&gt;,... &lt;ram_used_bytes&gt; &lt;ram_added_bytes&gt; &lt;ram_budget_bytes&gt; &lt;ram_unknown_count&gt;</code></td>
<td>-533 NO_RECORD; -534 NO_CELL; -535 UNKNOWN_PLUGIN; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>what a chain of these plugins, in signal order and named as add names them, would cost at that rate and quantum, read from the qualification records of qualification_dir; no plugin is loaded and nothing moves. latency_frames adds up each member's measured latency of the grid point, else its declared one; cpu_percent adds up each member's median nanoseconds per sample times the rate, percent of one core's cycle (a member's cost per block over the block's duration); ram_bytes adds up the Pss of the worker each member ran alone in, the history's pss_mb_solo of the binary its pin holds on this host class, - unless every member has one, since no qualification record carries a RAM figure; workers is how many workers plan would place the members in (an isolated one alone); unknown_count is how many members have no figure at that rate and quantum, and the latency and the CPU add up only the others. The last word names each of them as its position in the line, from 0, and its code, -533 for no record, -534 for no point of the grid at that rate and quantum, -535 for a uri that names no plugin installed here, joined by commas, - for none. Several records of one plugin (several versions) give the largest figure. -902 for a rate or a quantum that is not a whole number above 0, or no uri</td>
</tr>
</tbody>
</table>
<p><code>chain</code>:</p>
<pre><code>&gt; chain 1 0 1
&lt; resp 0
</code></pre>
<p><code>chain_clear</code>:</p>
<pre><code>&gt; chain_clear 1
&lt; resp 0
</code></pre>
<p><code>chain_get</code>:</p>
<pre><code>&gt; chain_get 1
&lt; resp 0 &lt;worker&gt; &lt;instance&gt;,... &lt;instance&gt;,...
</code></pre>
<p><code>plan</code>:</p>
<pre><code>&gt; plan 1 0 1
&lt; resp 0 &lt;instance&gt;,...;&lt;instance&gt;,...;... &lt;core&gt;,...;&lt;core&gt;,...;...
</code></pre>
<p><code>plan_get</code>:</p>
<pre><code>&gt; plan_get 1
&lt; resp 0 &lt;instance&gt;,...;&lt;instance&gt;,...;... &lt;instance&gt;:&lt;reason&gt;,... &lt;core&gt;,...;&lt;core&gt;,...;...
</code></pre>
<p><code>plan_clear</code>:</p>
<pre><code>&gt; plan_clear 1
&lt; resp 0
</code></pre>
<p><code>estimate</code>:</p>
<pre><code>&gt; estimate &lt;rate&gt; &lt;quantum&gt; clap:/usr/lib/clap/omx-comp.clap#org.openmixer.comp
&lt; resp 0 &lt;latency_frames&gt; &lt;cpu_percent&gt; &lt;ram_bytes&gt; &lt;workers&gt; &lt;unknown_count&gt; &lt;member&gt;:&lt;code&gt;,... &lt;ram_used_bytes&gt; &lt;ram_added_bytes&gt; &lt;ram_budget_bytes&gt; &lt;ram_unknown_count&gt;
</code></pre>
<h3 id="descriptors-panels-and-the-running-history">Descriptors, panels and the running history</h3>
<table>
<thead>
<tr>
<th>verb</th>
<th>arguments</th>
<th>types</th>
<th>reply</th>
<th>codes</th>
<th>since (the group's)</th>
<th>hosts</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>descriptor_get</code></td>
<td><code>&lt;uri&gt;</code></td>
<td>word</td>
<td><code>resp 0 &quot;&lt;path&gt;&quot;</code></td>
<td>-528 DIR_NOT_WRITABLE; -529 DESCRIPTOR_ABSENT; -530 DESCRIPTOR_PENDING; -531 DESCRIPTOR_SCAN_FAILED; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>the scanned descriptor of the plugin, answered from descriptor_dir: the file named for its binary as it is now (&lt;id&gt;@&lt;version&gt;-&lt;hash&gt;.json), written by the scan the plugin's add ran. -529 when there is none, -530 while its scan runs, -531 when its last scan wrote nothing, -528 when the directory could not be written</td>
</tr>
<tr>
<td><code>panel_get</code></td>
<td><code>&lt;uri&gt;</code></td>
<td>word</td>
<td><code>resp 0 &quot;&lt;path&gt;&quot;</code></td>
<td>-528 DIR_NOT_WRITABLE; -529 DESCRIPTOR_ABSENT; -530 DESCRIPTOR_PENDING; -531 DESCRIPTOR_SCAN_FAILED; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>the panel the plugin publishes (org.openmixer.panel-description/1), answered from descriptor_dir: the file panels/&lt;id&gt;@&lt;version&gt;-&lt;hash&gt;.json, named as its descriptor, which the same scan writes once the descriptor is in place, {&quot;plugin&quot;: {&quot;format&quot;, &quot;id&quot;}, &quot;panel&quot;: &lt;the panel object omx-clap-scan --json prints for the plugin, null when it serves none&gt;}; an LV2 plugin's panel is null. The codes are descriptor_get's: -529 when there is none, -530 while its scan runs, -531 when its last scan wrote nothing, -528 when the directory could not be written</td>
</tr>
<tr>
<td><code>history_get</code></td>
<td><code>&lt;uri&gt;</code></td>
<td>word</td>
<td><code>resp 0 &lt;history&gt;</code></td>
<td>-901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>what the daemon kept of the plugin on this host class, for the binary its pin holds now (the running history: the windows it ran alone and in a group, its crashes, restarts and quarantines): one word of comma-joined digest=&lt;sha256&gt;, class=&lt;host class&gt;, crashed=&lt;0|1&gt;, raises_xruns=&lt;0|1&gt; and then every key=value of the record (data/history.json); - when the plugin has no pin or no record, unavailable while the history file is blocked or history_window_s is 0, -902 for a line that is not one word</td>
</tr>
<tr>
<td><code>history_clear</code></td>
<td><code>&lt;uri&gt; | all</code></td>
<td>word</td>
<td><code>resp 0</code></td>
<td>-901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd required</td>
<td>delete the history of one plugin (every binary and host class of it), or all of it, from memory and from the file at once; -902 while the history is blocked or off, or for a line that is not one word</td>
</tr>
</tbody>
</table>
<p><code>descriptor_get</code>:</p>
<pre><code>&gt; descriptor_get clap:/usr/lib/clap/omx-comp.clap#org.openmixer.comp
&lt; resp 0 &quot;&lt;path&gt;&quot;
</code></pre>
<p><code>panel_get</code>:</p>
<pre><code>&gt; panel_get clap:/usr/lib/clap/omx-comp.clap#org.openmixer.comp
&lt; resp 0 &quot;&lt;path&gt;&quot;
</code></pre>
<p><code>history_get</code>:</p>
<pre><code>&gt; history_get clap:/usr/lib/clap/omx-comp.clap#org.openmixer.comp
&lt; resp 0 &lt;history&gt;
</code></pre>
<p><code>history_clear</code>:</p>
<pre><code>&gt; history_clear clap:/usr/lib/clap/omx-comp.clap#org.openmixer.comp
&lt; resp 0
</code></pre>
<h3 id="presets-and-notes-by-instance">Presets and notes, by instance</h3>
<table>
<thead>
<tr>
<th>verb</th>
<th>arguments</th>
<th>types</th>
<th>reply</th>
<th>codes</th>
<th>since (the group's)</th>
<th>hosts</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>preset_list</code></td>
<td><code>&lt;instance&gt;</code></td>
<td>int</td>
<td><code>resp &lt;count&gt;</code></td>
<td>-515 NO_PRESET_LIST; -3 reply.host.instance-non-exists; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd optional, omx-clap-host optional, mod-host unsupported</td>
<td>the plugin's presets, the ones its preset discovery or its bundle lists; (-515) for an instance of a worker that cannot list them</td>
</tr>
<tr>
<td><code>preset_get</code></td>
<td><code>&lt;instance&gt; &lt;index&gt;</code></td>
<td>int int</td>
<td><code>resp 0 &lt;load_key&gt; &lt;name&gt;</code></td>
<td>-515 NO_PRESET_LIST; -3 reply.host.instance-non-exists; -901 reply.host.memory-allocation; -902 reply.host.invalid-operation</td>
<td>0.12.0</td>
<td>plugin-hostd optional, omx-clap-host optional, mod-host unsupported</td>
<td>one preset, 0 to count - 1: the key preset_load takes for it, and its name; -902 for an index that is not one</td>
</tr>
<tr>
<td><code>note_input</code></td>
<td><code>&lt;instance&gt;</code></td>
<td>int</td>
<td><code>resp 0 &lt;port | -&gt;</code></td>
<td>-3 reply.host.instance-non-exists; -902 reply.host.invalid-operation; -514 NOTES_BY_JACK; -901 reply.host.memory-allocation</td>
<td>-</td>
<td>plugin-hostd optional, omx-clap-host required, mod-host unsupported</td>
<td>whether the instance takes notes: the name of its note input on its worker's jack client, - for a plugin that takes none; (-514) for an instance of a worker that cannot say</td>
</tr>
<tr>
<td><code>note_on</code></td>
<td><code>&lt;instance&gt; &lt;channel&gt; &lt;key&gt; &lt;velocity&gt;</code></td>
<td>int int int int</td>
<td><code>resp 0</code></td>
<td>-513 NO_NOTE_INPUT; -514 NOTES_BY_JACK; -517 NOTE_QUEUE_FULL; -3 reply.host.instance-non-exists; -902 reply.host.invalid-operation; -901 reply.host.memory-allocation</td>
<td>-</td>
<td>plugin-hostd optional, omx-clap-host required, mod-host unsupported</td>
<td>play a key: channel 0 to 15, key 0 to 127, velocity 1 to 127, a MIDI note on at the start of the worker's next cycle; (-513) for a plugin that takes no notes, (-514) for an instance of a worker that takes none on its socket, -902 for a word out of its range</td>
</tr>
<tr>
<td><code>note_off</code></td>
<td><code>&lt;instance&gt; &lt;channel&gt; &lt;key&gt; &lt;velocity&gt;</code></td>
<td>int int int int</td>
<td><code>resp 0</code></td>
<td>-513 NO_NOTE_INPUT; -514 NOTES_BY_JACK; -517 NOTE_QUEUE_FULL; -3 reply.host.instance-non-exists; -902 reply.host.invalid-operation; -901 reply.host.memory-allocation</td>
<td>-</td>
<td>plugin-hostd optional, omx-clap-host required, mod-host unsupported</td>
<td>release a key, velocity 0 to 127, a MIDI note off; answered as note_on is</td>
</tr>
<tr>
<td><code>all_notes_off</code></td>
<td><code>&lt;instance&gt;</code></td>
<td>int</td>
<td><code>resp 0</code></td>
<td>-513 NO_NOTE_INPUT; -514 NOTES_BY_JACK; -517 NOTE_QUEUE_FULL; -3 reply.host.instance-non-exists; -902 reply.host.invalid-operation; -901 reply.host.memory-allocation</td>
<td>-</td>
<td>plugin-hostd optional, omx-clap-host required, mod-host unsupported</td>
<td>release every key of every channel, MIDI's all notes off (controller 123) on each; answered as note_on is</td>
</tr>
</tbody>
</table>
<p><code>preset_list</code>:</p>
<pre><code>&gt; preset_list 0
&lt; resp &lt;count&gt;
</code></pre>
<p><code>preset_get</code>:</p>
<pre><code>&gt; preset_get 0 0
&lt; resp 0 &lt;load_key&gt; &lt;name&gt;
</code></pre>
<p><code>note_input</code>:</p>
<pre><code>&gt; note_input 0
&lt; resp 0 &lt;port | -&gt;
</code></pre>
<p><code>note_on</code>:</p>
<pre><code>&gt; note_on 0 0 60 100
&lt; resp 0
</code></pre>
<p><code>note_off</code>:</p>
<pre><code>&gt; note_off 0 0 60 100
&lt; resp 0
</code></pre>
<p><code>all_notes_off</code>:</p>
<pre><code>&gt; all_notes_off 0
&lt; resp 0
</code></pre>
<ol start="4">
<li>Events and feedback</li>
</ol>
<hr>
<p>mod-host's feedback lines, relayed as the worker wrote them:</p>
<table>
<thead>
<tr>
<th>line</th>
<th>arguments</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>output_set</code></td>
<td>int word float</td>
</tr>
<tr>
<td><code>remote_pages_changed</code></td>
<td>int</td>
</tr>
</tbody>
</table>
<p>The daemon's events and the worker lines it relays:</p>
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
</tbody>
</table>
<p>The relay rules:</p>
<ul>
<li>VERBATIM: every line a worker writes on its feedback port goes out on the daemon's feedback port as the worker wrote it: output_set, param_set, data_finish and the rest of mod-host's feedback, and a line the daemon does not know</li>
<li>INSTANCE: the instance number in a relayed line is already the controller's: add hands it to the worker unchanged, so nothing in a line is rewritten</li>
<li>ORDER: a worker's lines go out in the order it wrote them, and what a worker wrote before it died goes out before its worker_died event; an instance lives in one worker at a time, so its lines keep their order across a respawn; the lines of different workers interleave</li>
<li>SUBSCRIPTION: monitor_output is in the ledger, one line per output, and param_monitor as it was sent; a respawn replays them after the add, so a respawned instance reports the same outputs, each once, starting again from its first value</li>
<li>HANDSHAKE: output_data_ready names no instance and goes to every worker; each worker's data_finish is relayed</li>
<li>NO_CONTROLLER: with no feedback port, or no controller on it, a line is dropped, as mod-host drops it; the daemon reads every worker's feedback all the time, so no worker waits on it</li>
</ul>
<h3 id="host-settings">Host settings</h3>
<ul>
<li>TEMPO: the tempo, the metre and the transport a controller sets (mod-host's set_bpm, set_bpb, transport and transport_sync) are kept, the latest line of each as it was sent, in the order they were last sent</li>
<li>REPLAY: a worker is handed them before anything else: a respawned one before its first add, and a worker started later, of a new placement, as well; a worker's refusal of one is written to stderr and is no failure</li>
<li>GRAMMAR: a line whose words are not that command's grammar is passed on and not kept</li>
</ul>
<h2 id="reply-codes">Reply codes</h2>
<p>mod-host's parse refusals (<code>protocol.h</code>): -1 PROTOCOL_NOT_FOUND (not found); -2 PROTOCOL_MANY_ARGUMENTS (many arguments); -3 PROTOCOL_FEW_ARGUMENTS (few arguments); -4 PROTOCOL_INVALID_ARGUMENT (invalid argument).</p>
<p>mod-host's reply codes (<code>host-errors.h</code>): 0 SUCCESS; -1 ERR_INSTANCE_INVALID; -2 ERR_INSTANCE_ALREADY_EXISTS; -3 ERR_INSTANCE_NON_EXISTS; -4 ERR_INSTANCE_UNLICENSED; -101 ERR_HOST_INVALID_URI; -102 ERR_HOST_INSTANTIATION; -103 ERR_HOST_INVALID_PARAM_SYMBOL; -104 ERR_HOST_INVALID_PRESET_URI; -105 ERR_HOST_CANT_LOAD_STATE; -101 ERR_LV2_INVALID_URI; -102 ERR_LV2_INSTANTIATION; -103 ERR_LV2_INVALID_PARAM_SYMBOL; -104 ERR_LV2_INVALID_PRESET_URI; -105 ERR_LV2_CANT_LOAD_STATE; -201 ERR_JACK_CLIENT_CREATION; -202 ERR_JACK_CLIENT_ACTIVATION; -203 ERR_JACK_CLIENT_DEACTIVATION; -204 ERR_JACK_PORT_REGISTER; -205 ERR_JACK_PORT_CONNECTION; -206 ERR_JACK_PORT_DISCONNECTION; -207 ERR_JACK_VALUE_OUT_OF_RANGE; -301 ERR_ASSIGNMENT_ALREADY_EXISTS; -302 ERR_ASSIGNMENT_INVALID_OP; -303 ERR_ASSIGNMENT_LIST_FULL; -304 ERR_ASSIGNMENT_FAILED; -305 ERR_ASSIGNMENT_UNUSED; -401 ERR_CONTROL_CHAIN_UNAVAILABLE; -402 ERR_ABLETON_LINK_UNAVAILABLE; -403 ERR_HMI_UNAVAILABLE; -404 ERR_EXTERNAL_UI_UNAVAILABLE; -901 ERR_MEMORY_ALLOCATION; -902 ERR_INVALID_OPERATION.</p>
<p>The codes omx-clap-host answers too (omx-clap-core's <code>reply.host.*</code>):</p>
<table>
<thead>
<tr>
<th>resp</th>
<th>code</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td>-1</td>
<td><code>reply.host.instance-invalid</code></td>
<td>mod-host's ERR_INSTANCE_INVALID: an instance number outside the host's table</td>
</tr>
<tr>
<td>-3</td>
<td><code>reply.host.instance-non-exists</code></td>
<td>mod-host's ERR_INSTANCE_NON_EXISTS: an instance no add made</td>
</tr>
<tr>
<td>-103</td>
<td><code>reply.host.param-symbol-invalid</code></td>
<td>mod-host's ERR_LV2_INVALID_PARAM_SYMBOL: a symbol that is not a parameter param_set takes, the plugin's own bypass included</td>
</tr>
<tr>
<td>-508</td>
<td><code>reply.host.pin-absent</code></td>
<td>a layout pin in a scheme this host does not know, refused as no pin at all</td>
</tr>
<tr>
<td>-510</td>
<td><code>reply.host.pin-layout-mismatch</code></td>
<td>the add of an instance whose layout after init is not the one pin_expect named: the plugin is not activated</td>
</tr>
<tr>
<td>-511</td>
<td><code>reply.host.no-param-contract</code></td>
<td>the host holds no checked unit and scale for this parameter: the controller falls back to the layout the scan gives</td>
</tr>
<tr>
<td>-513</td>
<td><code>reply.host.no-note-input</code></td>
<td>the instance's plugin takes no notes</td>
</tr>
<tr>
<td>-514</td>
<td><code>reply.host.notes-by-jack</code></td>
<td>the instance's worker takes no notes on its socket (mod-host): the plugin is played through its jack MIDI input</td>
</tr>
<tr>
<td>-517</td>
<td><code>reply.host.note-queue-full</code></td>
<td>the worker has no room for the line's notes before its next block: nothing of it is kept, and the line may be sent again</td>
</tr>
<tr>
<td>-901</td>
<td><code>reply.host.memory-allocation</code></td>
<td>mod-host's ERR_MEMORY_ALLOCATION: the reply could not be built</td>
</tr>
<tr>
<td>-902</td>
<td><code>reply.host.invalid-operation</code></td>
<td>mod-host's ERR_INVALID_OPERATION: a word outside the verb's grammar, or a verb the host refuses on purpose</td>
</tr>
</tbody>
</table>
<p>The codes the daemon adds:</p>
<table>
<thead>
<tr>
<th>resp</th>
<th>name</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td>-501</td>
<td><code>PLACEMENT_INVALID</code></td>
<td>placement invalid: not a placement, or not valid here, as a pool:&lt;name&gt; for a plugin of a format whose pin holds only in a world of the plugin's own, while require_pins is on</td>
</tr>
<tr>
<td>-502</td>
<td><code>NO_BACKEND</code></td>
<td>no worker program for the scheme</td>
</tr>
<tr>
<td>-503</td>
<td><code>WORKER_SPAWN</code></td>
<td>the worker is not up: the spawn failed, or it is in backoff; ask again after instance_restored</td>
</tr>
<tr>
<td>-504</td>
<td><code>REPLAY</code></td>
<td>the name of a refused replay, never a reply: a replayed add that its pin or the worker refuses is announced by the instance_replay_refused event with the refusal's own code, and written to stderr with this one and the step that refused it</td>
</tr>
<tr>
<td>-505</td>
<td><code>GAVE_UP</code></td>
<td>the storm bound is spent for that placement</td>
</tr>
<tr>
<td>-506</td>
<td><code>NO_SUCH_WORKER</code></td>
<td>no such worker</td>
</tr>
<tr>
<td>-507</td>
<td><code>VERB_DROPPED</code></td>
<td>the worker died on this very command and the daemon dropped it: it is not replayed, and the instance_verb_dropped event names it; or it died on, or did not answer in rpc_timeout_ms, the pin_expect of an add, which is then never forwarded</td>
</tr>
<tr>
<td>-508</td>
<td><code>PIN_ABSENT</code></td>
<td>pin_mode strict and the plugin has no pin, or its layout pin is in a scheme this version does not know: add is refused and no worker sees it</td>
</tr>
<tr>
<td>-509</td>
<td><code>PIN_BINARY_MISMATCH</code></td>
<td>a pinned file is missing or its SHA-256 differs, or the plugin's manifest names a file the pin does not hold: add is refused and no worker sees it</td>
</tr>
<tr>
<td>-510</td>
<td><code>PIN_LAYOUT_MISMATCH</code></td>
<td>the worker found the parameter layout after init differs from the layout pin: the instance is destroyed before activate</td>
</tr>
<tr>
<td>-511</td>
<td><code>NO_PARAM_CONTRACT</code></td>
<td>the host holds no checked unit and scale for this parameter: fall back to qualification</td>
</tr>
<tr>
<td>-512</td>
<td><code>LV2_ADAPTER_REFUSED</code></td>
<td>the lv2-clap worker's LV2 adapter cannot run this plugin (MIDI it does not feed, a required feature it lacks, a layout it does not take): the worker answered the add -102, the lv2_adapter_refused event carries the hosting.* code of that reply, and under lv2_worker auto the plugin is run by the lv2 row instead and this code is never answered; a plugin no bundle of the worker's world holds is no refusal: the worker's -101 is answered</td>
</tr>
<tr>
<td>-513</td>
<td><code>NO_NOTE_INPUT</code></td>
<td>the instance's plugin takes no notes (an effect): its worker answers note_on, note_off and all_notes_off with this code</td>
</tr>
<tr>
<td>-514</td>
<td><code>NOTES_BY_JACK</code></td>
<td>the instance's worker takes no notes on its socket (mod-host): the daemon answers the note verbs and note_input with this code, and the plugin is played through its jack MIDI input with connect</td>
</tr>
<tr>
<td>-515</td>
<td><code>NO_PRESET_LIST</code></td>
<td>the instance's worker cannot list the plugin's presets (mod-host): the daemon answers preset_list and preset_get with this code; preset_load still takes a preset the controller knows</td>
</tr>
<tr>
<td>-516</td>
<td><code>PIN_REFUSED</code></td>
<td>the plugin's pin carries verdict=refused: its files are the ones that failed qualification, so add is refused and no worker sees it, and a replayed add is refused the same way; files that differ from the pin answer (-509) first. A pins_dir pin of that verdict is never overridden: pin_set and pin_accept of its plugin answer this code</td>
</tr>
<tr>
<td>-517</td>
<td><code>NOTE_QUEUE_FULL</code></td>
<td>the instance's worker has no room for this note_on, note_off or all_notes_off before its next block: the line was not taken and nothing of it is kept; the controller may send it again</td>
</tr>
<tr>
<td>-518</td>
<td><code>CHAIN_UNKNOWN_INSTANCE</code></td>
<td>a member of chain is an instance no add made: the chain is not declared</td>
</tr>
<tr>
<td>-519</td>
<td><code>CHAIN_DUPLICATE</code></td>
<td>an instance is named twice in one chain: the chain is not declared</td>
</tr>
<tr>
<td>-520</td>
<td><code>CHAIN_INSTANCE_BUSY</code></td>
<td>a member of chain is already in another chain: the chain is not declared; chain_clear of the other chain frees it</td>
</tr>
<tr>
<td>-521</td>
<td><code>CHAIN_MIXED_FORMAT</code></td>
<td>the members of chain are not all run by one worker program, or are of two rows of one program and a row does not run chains in one client, so no one worker runs them: the chain is not declared</td>
</tr>
<tr>
<td>-522</td>
<td><code>NO_SUCH_CHAIN</code></td>
<td>chain_clear or chain_get of a chain no chain declared</td>
</tr>
<tr>
<td>-523</td>
<td><code>PRESET_NOT_OFFERED</code></td>
<td>the worker: preset_load or preset_show of a stable name the plugin does not offer, or of a plugin with no preset system and no state</td>
</tr>
<tr>
<td>-524</td>
<td><code>PRESET_INVALID</code></td>
<td>preset_save with a file path that is not absolute or with no name, or preset_load or preset_show of a file that cannot be read, is no JSON, is of a format version other than org.openmixer.preset/1 and org.openmixer.preset/2, or breaks the format (docs/presets.md): the daemon answers it and no worker sees the file</td>
</tr>
<tr>
<td>-525</td>
<td><code>PRESET_NEEDS_STATE</code></td>
<td>the worker: a preset file that carries state for a worker that cannot take state yet</td>
</tr>
<tr>
<td>-526</td>
<td><code>PRESET_PLUGIN_CHANGED</code></td>
<td>the worker: the preset file's plugin id, version or fingerprint is not the instance's; nothing of it is applied</td>
</tr>
<tr>
<td>-527</td>
<td><code>LOAD_REFUSED</code></td>
<td>the worker: the plugin refused the preset or the state its file carries</td>
</tr>
<tr>
<td>-528</td>
<td><code>DIR_NOT_WRITABLE</code></td>
<td>descriptor_dir or qualification_dir cannot be made or written: the daemon does not start, and says which key and which path on stderr with this code; a directory that turns read-only later makes the scan of an add write nothing, and descriptor_get and panel_get of that plugin answer this code</td>
</tr>
<tr>
<td>-529</td>
<td><code>DESCRIPTOR_ABSENT</code></td>
<td>descriptor_get (panel_get) of a plugin that has no descriptor (panel) in descriptor_dir for its binary as it is now, and none being written: no add since it changed, or a binary that cannot be found</td>
</tr>
<tr>
<td>-530</td>
<td><code>DESCRIPTOR_PENDING</code></td>
<td>descriptor_get (panel_get) of a plugin whose scan, started by its add, has not written its descriptor (panel) yet: ask again</td>
</tr>
<tr>
<td>-531</td>
<td><code>DESCRIPTOR_SCAN_FAILED</code></td>
<td>descriptor_get (panel_get) of a plugin whose last scan wrote no descriptor (panel): the scanner refused the plugin, made no dump or no panel, or is not installed; the add it ran for stands, and stderr and the scan's log say why. The next add scans again</td>
</tr>
<tr>
<td>-532</td>
<td><code>NO_SUCH_PLAN</code></td>
<td>plan_get or plan_clear of a chain no plan planned</td>
</tr>
<tr>
<td>-533</td>
<td><code>NO_RECORD</code></td>
<td>a member of estimate that no qualification record in qualification_dir names: never a reply, the code of the member in the reply's list</td>
</tr>
<tr>
<td>-534</td>
<td><code>NO_CELL</code></td>
<td>a member of estimate whose qualification records hold no point of the grid at that rate and quantum with a cost and a latency: never a reply, the code of the member in the reply's list</td>
</tr>
<tr>
<td>-535</td>
<td><code>UNKNOWN_PLUGIN</code></td>
<td>a member of estimate whose uri names no plugin installed here (its format cannot tell the plugin's binary, or the binary is not there): never a reply, the code of the member in the reply's list</td>
</tr>
</tbody>
</table>
<ol start="5">
<li>JSON documents</li>
</ol>
<hr>
<table>
<thead>
<tr>
<th>schema</th>
<th>installed as</th>
<th>$id</th>
<th>title</th>
<th>format</th>
<th>description</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>protocol/plugin-hostd.schema.json</code></td>
<td><code>/usr/share/plugin-hostd-protocol/plugin-hostd.schema.json</code></td>
<td><code>https://github.com/FreeMixer/plugin-hostd-protocol/protocol/plugin-hostd.schema.json</code></td>
<td>The protocol surface plugin-hostd owns</td>
<td>-</td>
<td>Generated from include/plugin-hostd/protocol.h, which is the declaration; this file says the shape of the JSON.</td>
</tr>
</tbody>
</table>
<p>Counts: 48 mod-host commands, 34 same, 8 differs, 6 refused; 32 verbs mod-host does not have.</p>
<h2 id="appendix-mod-host-s-command-reference">Appendix: mod-host's command reference</h2>
<p>The &quot;Commands (or Protocol)&quot; section of mod-host's README (FreeMixer/mod-host, branch freemixer, 013ac7d), kept as it
is. Copyright 2013-2026 Filipe Coelho, MOD Audio UG and the mod-host contributors, GPL-3.0-or-later.</p>
<p>Where it says &quot;mod-host&quot;, read &quot;the host&quot;: any host built on this library answers these commands. The library parses
and dispatches them; what a command does to a plugin is the host's backend (<code>host_backend_t</code>, <code>include/host-backend.h</code>).</p>
<h2 id="commands-or-protocol">Commands (or Protocol)</h2>
<p>The commands supported by mod-host are:</p>
<pre><code>add &lt;lv2_uri&gt; &lt;instance_number&gt; [client_name]
    * add an LV2 plugin encapsulated as a jack client
    e.g.: add &quot;http://lv2plug.in/plugins/eg-amp&quot; 0
    instance_number must be any value between 0 ~ 9990, inclusively
    client_name is optional; when omitted the jack client (and so the graph node) is
    named &quot;effect_&lt;instance_number&gt;&quot;, same as always. When given, mod-host tries to
    open the jack client under that name instead -- so a host running many plugins
    shows a graph with a name per plugin instead of an undifferentiated effect_0,
    effect_1, effect_2... The name is sanitised for jack (':' is replaced with '_',
    since jack uses ':' as the client:port separator, and it is truncated to the
    running jack backend's client name limit) and, on a collision with an existing
    jack client, disambiguated by appending &quot;_&lt;instance_number&gt;&quot;. If the sanitised
    name is empty, or the name still collides after the instance number is appended,
    mod-host falls back to the default &quot;effect_&lt;instance_number&gt;&quot; rather than fail
    the add.
    e.g.: add &quot;http://lv2plug.in/plugins/eg-amp&quot; 0 &quot;channel1-eg-amp&quot;

remove &lt;instance_number&gt;
    * remove an LV2 plugin instance (and also the jack client)
    e.g.: remove 0
    when instance_number is -1 all plugins will be removed

preset_load &lt;instance_number&gt; &lt;preset_uri&gt;
    * load a preset state of an effect instance
    e.g.: preset_load 0 &quot;http://drobilla.net/plugins/mda/presets#JX10-moogcury-lite&quot;

preset_save &lt;instance_number&gt; &lt;preset_name&gt; &lt;dir&gt; &lt;file_name&gt;
    * save a preset state of an effect instance
    e.g.: preset_save 0 &quot;My Preset&quot; &quot;/home/user/.lv2/my-presets.lv2&quot; &quot;mypreset.ttl&quot;

preset_show &lt;preset_uri&gt;
    * show the preset information of requested URI
    e.g.: preset_show &quot;http://drobilla.net/plugins/mda/presets#EPiano-bright&quot;

connect &lt;origin_port&gt; &lt;destination_port&gt;
    * connect two jack ports
    e.g.: connect &quot;system:capture_1&quot; &quot;effect_0:in&quot;

disconnect &lt;origin_port&gt; &lt;destination_port&gt;
    * disconnect two jack ports
    e.g.: disconnect &quot;system:capture_1&quot; &quot;effect_0:in&quot;

bypass &lt;instance_number&gt; &lt;bypass_value&gt;
    * toggle effect processing
    e.g.: bypass 0 1
    if bypass_value = 1 bypass effect
    if bypass_value = 0 process effect

param_set &lt;instance_number&gt; &lt;param_symbol&gt; &lt;param_value&gt;
    * set the value of a control port
    e.g.: param_set 0 &quot;gain&quot; 2.5

param_get &lt;instance_number&gt; &lt;param_symbol&gt;
    * get the value of a control port
    e.g.: param_get 0 &quot;gain&quot;

param_monitor &lt;instance_number&gt; &lt;param_symbol&gt; &lt;cond_op&gt; &lt;value&gt;
    * monitor a control port according to a condition
    e.g: param_monitor 0 &quot;gain&quot; &quot;&gt;&quot; 2.5

patch_set &lt;instance_number&gt; &lt;property_uri&gt; &lt;value&gt;
    * set the value of a control port
    e.g.: patch_set 0 &quot;gain&quot; 2.5

patch_get &lt;instance_number&gt; &lt;property_uri&gt;
    * get the value of a control port
    e.g.: patch_get 0 &quot;gain&quot;

licensee &lt;instance_number&gt;
    * get the licensee name for a commercial plugin
    e.g.: licensee 0

monitor &lt;addr&gt; &lt;port&gt; &lt;status&gt;
    * open a socket port for monitoring parameter changes
    e.g: monitor localhost 12345 1
    if status = 1 start monitoring
    if status = 0 stop monitoring

monitor_output &lt;instance_number&gt; &lt;param_symbol&gt;
    * request monitoring of an output control port (on the feedback port)
    e.g.: monitor_output 0 &quot;meter&quot;

midi_learn &lt;instance_number&gt; &lt;param_symbol&gt; &lt;minimum&gt; &lt;maximum&gt;
    * start MIDI learn for a control port
    e.g.: midi_learn 0 &quot;gain&quot; 0.0 1.0

midi_map &lt;instance_number&gt; &lt;param_symbol&gt; &lt;midi_channel&gt; &lt;midi_cc&gt; &lt;minimum&gt; &lt;maximum&gt;
    * map a MIDI controller to a control port
    e.g.: midi_map 0 &quot;gain&quot; 0 7 0.0 1.0
    a non-standard midi_cc value of 131 (0x83) is used for pitchbend

midi_unmap &lt;instance_number&gt; &lt;param_symbol&gt;
    * unmap the MIDI controller from a control port
    e.g.: midi_unmap 0 &quot;gain&quot;

monitor_midi_program &lt;midi_channel&gt; &lt;enable&gt;
    * listen to MIDI program change messages (on the feedback port)
    e.g.: monitor_midi_program 0 1

set_midi_program_change_pedalboard_bank_channel &lt;enable&gt; &lt;midi_channel&gt;
    * set the MIDI channel which changes pedalboard banks on MIDI program change. &lt;midi_channel&gt; is in the range of [0,15].
    e.g.: set_midi_program_change_pedalboard_bank_channel 1 5 to enable listening for bank changes on channel 6

set_midi_program_change_pedalboard_snapshot_channel &lt;enable&gt; &lt;midi_channel&gt;
    * set the MIDI channel which changes pedalboard snapshots on MIDI program change. &lt;midi_channel&gt; is in the range of [0,15].
    e.g.: set_midi_program_change_pedalboard_snapshot_channel 1 4 to enable listening for preset changes on channel 5

cc_map &lt;instance_number&gt; &lt;param_symbol&gt; &lt;device_id&gt; &lt;actuator_id&gt; &lt;label&gt; &lt;value&gt; &lt;minimum&gt; &lt;maximum&gt; &lt;steps&gt; &lt;extraflags&gt; &lt;unit&gt; &lt;scalepoints_count&gt; &lt;scalepoints...&gt;
    * map a Control Chain actuator to a control port
    e.g.: cc_map 0 &quot;gain&quot; 0 1 &quot;Gain&quot; 0.0 -24.0 3.0 33 0 &quot;dB&quot; 0

cc_unmap &lt;instance_number&gt; &lt;param_symbol&gt;
    * unmap the Control Chain actuator from a control port
    e.g.: cc_unmap 0 &quot;gain&quot;

cc_value_set &lt;instance_number&gt; &lt;param_symbol&gt; &lt;value&gt;
    * set the value of a  mapped Control Chain actuator
    e.g.: cc_value_set 0 &quot;gain&quot; 2.5

cv_map &lt;instance_number&gt; &lt;param_symbol&gt; &lt;source_port_name&gt; &lt;minimum&gt; &lt;maximum&gt; &lt;operational-mode&gt;
    * map a CV source port to a control port, operational-mode being one of '-', '+', 'b' or '='
    e.g.: cv_map 0 &quot;gain&quot; &quot;AMS CV Source:CV Out 1&quot; -24.0 3.0 =

cv_unmap &lt;instance_number&gt; &lt;param_symbol&gt;
    * unmap the CV source port actuator from a control port
    e.g.: cv_unmap 0 &quot;gain&quot;

cpu_load
    * return current jack cpu load

load &lt;file_name&gt;
    * load a history command file
    * dummy way to save/load workspace state
    e.g.: load my_setup

save &lt;file_name&gt;
    * saves the history of typed commands
    * dummy way to save/load workspace state
    e.g.: save my_setup

bundle_add &lt;bundle_path&gt;
    * add a bundle to the running lv2 world
    e.g.: bundle_add &quot;/path/to/bundle.lv2&quot;

bundle_remove &lt;bundle_path&gt; &lt;resource&gt;
    * remove a bundle from the running lv2 world
    e.g.: bundle_remove &quot;/path/to/bundle.lv2&quot; &quot;&quot;

feature_enable &lt;feature&gt; &lt;enable&gt;
    * enable or disable a feature
    * feature can be one of &quot;aggregated-midi&quot;, &quot;freewheeling&quot; or &quot;processing&quot;
    * the &quot;aggregated-midi&quot; feature requires the use of jack2 and mod-midi-merger to be installed system-wide
    e.g.: feature_enable link 1

set_bpm &lt;beats_per_minute&gt;
    * set the global beats per minute transport value
    e.g.: set_bpm 120

set_bpb &lt;beats_per_bar&gt;
    * set the global beats per bar transport value
    e.g.: set_bpb 4

transport &lt;rolling&gt; &lt;beats_per_bar&gt; &lt;beats_per_minute&gt;
    * change the global transport state
    e.g.: transport 1 4 120

transport_sync &lt;mode&gt;
    * change the transport sync mode
    * mode can be one of &quot;none&quot;, &quot;link&quot; or &quot;midi&quot;
    e.g.: transport_sync &quot;midi&quot;

output_data_ready
    * report feedback port ready for more messages

track_info &lt;instance_number&gt; &lt;name&gt; &lt;color&gt; [bus|return|master]
    * pass the name and color of the mixer track the instance sits on, color as #RRGGBB or - for none
    * an LV2 plugin has no way to receive them, so mod-host answers -902
    e.g.: track_info 0 &quot;Kick In&quot; #FF8000

remote_pages &lt;instance_number&gt;
    * get the number of remote-control pages of the plugin (8 parameters per page); 0 for an LV2 plugin
    e.g.: remote_pages 0

remote_page_get &lt;instance_number&gt; &lt;page_index&gt;
    * get one remote-control page: resp 0 &lt;page_id&gt; &lt;section_name&gt; &lt;page_name&gt; &lt;symbol&gt; x8, - for an empty slot
    e.g.: remote_page_get 0 0

param_info &lt;instance_number&gt; &lt;param_symbol&gt;
    * get what a control means: resp 0 &lt;unit&gt; &lt;scale&gt; &lt;minimum&gt; &lt;maximum&gt; &lt;default&gt; &lt;step&gt; &lt;stable_symbol&gt;
    * unit is an LV2 unit name (db, hz, ms, ...) or none, scale is linear, log or stepped, step 0 is continuous
    e.g.: param_info 0 &quot;gain&quot;

help
    * show a help message

quit
    bye!
</code></pre>
<p>For each effect added one client on JACK will be created. The names of clients
follow the standard: effect_&lt;instance_number&gt;</p>
<p>If a valid command is executed a response is given as following:</p>
<pre><code>resp &lt;status&gt; [value]
</code></pre>
<p>If status is a negative number an error has occurred. The table below shows the number of each error.</p>
<table>
<thead>
<tr>
<th>status</th>
<th>error</th>
</tr>
</thead>
<tbody>
<tr>
<td>-1</td>
<td>ERR_INSTANCE_INVALID</td>
</tr>
<tr>
<td>-2</td>
<td>ERR_INSTANCE_ALREADY_EXISTS</td>
</tr>
<tr>
<td>-3</td>
<td>ERR_INSTANCE_NON_EXISTS</td>
</tr>
<tr>
<td>-4</td>
<td>ERR_INSTANCE_UNLICENSED</td>
</tr>
<tr>
<td>-101</td>
<td>ERR_LV2_INVALID_URI</td>
</tr>
<tr>
<td>-102</td>
<td>ERR_LV2_INSTANTIATION</td>
</tr>
<tr>
<td>-103</td>
<td>ERR_LV2_INVALID_PARAM_SYMBOL</td>
</tr>
<tr>
<td>-104</td>
<td>ERR_LV2_INVALID_PRESET_URI</td>
</tr>
<tr>
<td>-105</td>
<td>ERR_LV2_CANT_LOAD_STATE</td>
</tr>
<tr>
<td>-201</td>
<td>ERR_JACK_CLIENT_CREATION</td>
</tr>
<tr>
<td>-202</td>
<td>ERR_JACK_CLIENT_ACTIVATION</td>
</tr>
<tr>
<td>-203</td>
<td>ERR_JACK_CLIENT_DEACTIVATION</td>
</tr>
<tr>
<td>-204</td>
<td>ERR_JACK_PORT_REGISTER</td>
</tr>
<tr>
<td>-205</td>
<td>ERR_JACK_PORT_CONNECTION</td>
</tr>
<tr>
<td>-206</td>
<td>ERR_JACK_PORT_DISCONNECTION</td>
</tr>
<tr>
<td>-207</td>
<td>ERR_JACK_VALUE_OUT_OF_RANGE</td>
</tr>
<tr>
<td>-301</td>
<td>ERR_ASSIGNMENT_ALREADY_EXISTS</td>
</tr>
<tr>
<td>-302</td>
<td>ERR_ASSIGNMENT_INVALID_OP</td>
</tr>
<tr>
<td>-303</td>
<td>ERR_ASSIGNMENT_LIST_FULL</td>
</tr>
<tr>
<td>-304</td>
<td>ERR_ASSIGNMENT_FAILED</td>
</tr>
<tr>
<td>-304</td>
<td>ERR_ASSIGNMENT_UNUSED</td>
</tr>
<tr>
<td>-401</td>
<td>ERR_CONTROL_CHAIN_UNAVAILABLE</td>
</tr>
<tr>
<td>-402</td>
<td>ERR_LINK_UNAVAILABLE</td>
</tr>
<tr>
<td>-403</td>
<td>ERR_HMI_UNAVAILABLE</td>
</tr>
<tr>
<td>-404</td>
<td>ERR_EXTERNAL_UI_UNAVAILABLE</td>
</tr>
<tr>
<td>-901</td>
<td>ERR_MEMORY_ALLOCATION</td>
</tr>
<tr>
<td>-902</td>
<td>ERR_INVALID_OPERATION</td>
</tr>
</tbody>
</table>
<p>A status zero or positive means that the command was executed successfully.
In case of the add command, the status returned is the instance number.
The value field exists for the param_get, remote_page_get and param_info commands.</p>
<p>When the plugin changes its remote-control pages, the feedback port gets:</p>
<pre><code>remote_pages_changed &lt;instance_number&gt;
</code></pre>
`}],r={repo:e,commit:t,pages:n};export{t as commit,r as default,n as pages,e as repo};