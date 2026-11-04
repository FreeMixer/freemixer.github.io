var e={slug:`plugin-hostd-on-a-raspberry-pi-5`,order:80,title:`"plugin-hostd on a Raspberry Pi 5: what was measured and how"`,summary:`On a Raspberry Pi 5 running Zynthian, a plugin-hostd chain has the lowest DSP load of the three hosts measured and uses 41 to 49 % less memory than mod-host; from four plugins on it is also the fastest to add to. This note gives the device, the method and every table.`,measured:`Raspberry Pi 5 (4 GB) with ZynthianOS Vangelis, 2 November 2026; plugin-hostd 0.15.9, omx-clap-core 0.26.4, plugin-qualify 0.18.5, omx-plugins 0.17.0, Zynthian's stock mod-host.`,topic:`zynthian`,toc:[{id:`the-device-and-the-method`,title:`The device and the method`},{id:`the-three-hosts`,title:`The three hosts`},{id:`time-to-add`,title:`Time to add`},{id:`instruments`,title:`Instruments`},{id:`where-the-chain-s-time-goes`,title:`Where the chain's time goes`},{id:`many-chains-at-once`,title:`Many chains at once`},{id:`qualification-on-the-device`,title:`Qualification on the device`},{id:`what-is-not-measured-yet`,title:`What is not measured yet`}],html:`<p>The figures of these runs are also on the <a href="/benchmarks">benchmarks page</a>, row by row.</p>
<h2 id="the-device-and-the-method">The device and the method</h2>
<ul>
<li>A Raspberry Pi 5 (Cortex-A76, 4 cores, 4 GB) running ZynthianOS Vangelis (Debian 13, arm64), kernel 6.18 (not
PREEMPT_RT), with the packages a Zynthian on the OpenMixer channel installs.</li>
<li>Every run used a private JACK server on the dummy driver, at 48000 Hz and 256 frames, with the CPU governor at
<code>performance</code>. DSP load, xruns and latency are the dummy driver's: everything was read digitally at JACK ports, and
nothing here is a claim about analog audio.</li>
<li>Each row is the median of three repeats; DSP is JACK's DSP load, PSS the host processes' proportional memory (which
shares the libraries out, so it is the memory the device actually spends).</li>
<li>The daemon was measured directly, not through Zynthian's engine. The mod-host rows are Zynthian's own binary, started on
a private port; no row measures MOD-UI or the device's own mod-host service.</li>
</ul>
<p>The hosts:</p>
<table>
<thead>
<tr>
<th>mode</th>
<th>what runs</th>
</tr>
</thead>
<tbody>
<tr>
<td>plugin-hostd, added into one chain</td>
<td>the daemon and one worker for the whole chain, one JACK client</td>
</tr>
<tr>
<td>plugin-hostd, chain built after the adds</td>
<td>each plugin added in a worker of its own, then the chain declared</td>
</tr>
<tr>
<td>plugin-hostd, one worker per plugin</td>
<td>the daemon and one worker per plugin, a JACK client each</td>
</tr>
<tr>
<td>omx-clap-host, one process</td>
<td>one omx-clap-host process for every plugin</td>
</tr>
<tr>
<td>mod-host</td>
<td>one mod-host process for every plugin, a JACK client each</td>
</tr>
</tbody>
</table>
<p>The plugin sets: 24 plugins in series (omx comp, delay and drive in turn, and Calf Compressor), in their CLAP builds where a
host can run CLAP or in their LV2 builds on every host; and ten third-party LV2 effects in series, all rated suitable for
the three hosts and real-time clean in qualification.</p>
<h2 id="the-three-hosts">The three hosts</h2>
<p>0 xruns in every repeat of every row. DSP load / PSS:</p>
<table>
<thead>
<tr>
<th>scenario</th>
<th>plugin-hostd, added into one chain</th>
<th>omx-clap-host, one process</th>
<th>mod-host</th>
</tr>
</thead>
<tbody>
<tr>
<td>24 plugins, CLAP builds (Calf LV2; mod-host runs the LV2 builds)</td>
<td>12.51 % / 64.1 MB</td>
<td>15.31 % / 64.6 MB</td>
<td>15.02 % / 109.4 MB</td>
</tr>
<tr>
<td>the same 24, LV2 builds on every host</td>
<td>12.73 % / 63.3 MB</td>
<td>16.40 % / 63.9 MB</td>
<td>15.43 % / 109.4 MB</td>
</tr>
<tr>
<td>ten third-party LV2 plugins</td>
<td>5.64 % / 45.2 MB</td>
<td>6.87 % / 44.1 MB</td>
<td>6.58 % / 89.5 MB</td>
</tr>
</tbody>
</table>
<p>plugin-hostd's chain has the lowest DSP load of the three in every scenario and every repeat (its highest repeat, 12.55 %,
is below mod-host's lowest, 14.88 %), and uses 41 to 49 % less memory than mod-host, as omx-clap-host does. One JACK client
runs the whole chain, where mod-host puts one client per plugin on the graph.</p>
<p>The other plugin-hostd modes:</p>
<table>
<thead>
<tr>
<th>scenario</th>
<th>chain built after the adds</th>
<th>one worker per plugin</th>
</tr>
</thead>
<tbody>
<tr>
<td>24 plugins, CLAP builds</td>
<td>12.48 % / 65.8 MB</td>
<td>17.76 % / 183.1 MB</td>
</tr>
<tr>
<td>the same 24, LV2 builds</td>
<td>12.74 % / 64.3 MB</td>
<td>18.78 % / 189.6 MB</td>
</tr>
<tr>
<td>ten third-party LV2 plugins</td>
<td>5.50 % / 45.8 MB</td>
<td>7.25 % / 111.2 MB</td>
</tr>
</tbody>
</table>
<p>One worker per plugin is the expensive mode: 24 processes and 24 JACK clients, and the only rows with xruns (one repeat of
24 plugins with 21). It is not the default.</p>
<h2 id="time-to-add">Time to add</h2>
<p>Cold: the host started, then every plugin of the set added, until the last one runs; the median of three. mod-host scans
the whole LV2 world (1336 plugins on this device) before it answers, and that start, 800 to 945 ms, is part of its time.</p>
<table>
<thead>
<tr>
<th>set</th>
<th>plugin-hostd, into a chain</th>
<th>plugin-hostd, one worker each</th>
<th>omx-clap-host</th>
<th>mod-host</th>
</tr>
</thead>
<tbody>
<tr>
<td>24 plugins, LV2 builds</td>
<td>549 ms</td>
<td>1976 ms</td>
<td>948 ms</td>
<td>1459 ms</td>
</tr>
<tr>
<td>24 plugins, CLAP builds (Calf LV2)</td>
<td>440 ms</td>
<td></td>
<td>848 ms</td>
<td></td>
</tr>
<tr>
<td>ten third-party LV2 plugins</td>
<td>255 ms</td>
<td>497 ms</td>
<td>458 ms</td>
<td>1044 ms</td>
</tr>
</tbody>
</table>
<p>Warm: chains of 2, 4 and 7 of omx comp, delay and drive, LV2 builds, the host already running.</p>
<table>
<thead>
<tr>
<th>plugins</th>
<th>mod-host</th>
<th>plugin-hostd, into a chain</th>
<th>omx-clap-host</th>
<th>plugin-hostd, one worker each</th>
</tr>
</thead>
<tbody>
<tr>
<td>2</td>
<td>44.8 ms</td>
<td>55.9 ms</td>
<td>72.4 ms</td>
<td>79.5 ms</td>
</tr>
<tr>
<td>4</td>
<td>98 ms</td>
<td>73 ms</td>
<td>137 ms</td>
<td>154 ms</td>
</tr>
<tr>
<td>7</td>
<td>189 ms</td>
<td>96 ms</td>
<td>234 ms</td>
<td>272 ms</td>
</tr>
</tbody>
</table>
<p>mod-host is the fastest to add two plugins to a running host; from four on, the chain is. A worker of its own costs about
40 ms per plugin: the process and its JACK client.</p>
<h2 id="instruments">Instruments</h2>
<p>One instance with 1, 8 and 16 notes held; DSP load and PSS:</p>
<table>
<thead>
<tr>
<th>instrument</th>
<th>plugin-hostd</th>
<th>mod-host</th>
</tr>
</thead>
<tbody>
<tr>
<td>mda Piano</td>
<td>0.6 / 2.0 / 3.5 %, 29 MB</td>
<td>0.6 / 2.0 / 3.5 %, 72 MB</td>
</tr>
<tr>
<td>Odin 2</td>
<td>3.6 / 11.8 / 21.3 %, 89 MB</td>
<td>3.8 / 11.7 / 21.0 %, 132 MB</td>
</tr>
<tr>
<td>Surge XT (CLAP on plugin-hostd, LV2 on mod-host)</td>
<td>1.8 / 4.2 / 6.9 %, 68 MB</td>
<td>2.0 / 4.1 / 6.9 %, 112 MB</td>
</tr>
</tbody>
</table>
<p>The same DSP load on both hosts, and 43 to 44 MB less memory on plugin-hostd. ZynAddSubFX and sfizz run as their own JACK
programs, as Zynthian runs them, through neither host: ZynAddSubFX with Analog Pad 1 at 0.6 / 1.6 / 2.6 %, 90 MB; sfizz with
the Salamander piano at 0.9 / 2.9 / 5.1 %, 86 to 119 MB. None of the five offers a thread pool. One plugin-hostd repeat of
Odin 2 at one note had one xrun. How instruments use the cores is in <a href="/notes/instruments-on-a-pi-5">Instruments on a Pi 5</a>.</p>
<h2 id="where-the-chain-s-time-goes">Where the chain's time goes</h2>
<p>perf on the worker's audio thread, 24 plugins in one chain, measured with builds carrying symbols: the plugins and libm take
88 to 92 % of it. The host's own code takes about 4 to 7 %: the LV2 adapter's copies (1.9 % when every plugin is LV2), the
copies at the chain's input and output (about 1 %), the adapter's control and event work (about 1 % on LV2), and the guards
of the stage with the clamp (about 0.5 %). The kernel and libjack take 0.5 %, where mod-host on the same chain spends 10 to
14 % of its samples there, across its 24 JACK clients. The heaviest single symbol is <code>tanhf</code> in omx-drive, 14 to 15 %.</p>
<h2 id="many-chains-at-once">Many chains at once</h2>
<p>An earlier stress run, on plugin-hostd 0.13.1 and the device's own JACK server at 48000 Hz and 256 frames, held chains of
four LV2 plugins at 1, 2, 4, 8 and 16 chains for 60 s each. At 16 chains the hosting processes used 70.6 % of a core
grouped (one worker per chain, 60 plugins), 100.8 % alone (one worker per plugin) and 82.3 % on jalv (64 plugins); PSS was
224.2, 359.3 and 2745.6 MB. Grouped and alone reached 16 chains without a limit; jalv stopped there on memory, with 2
xruns.</p>
<h2 id="qualification-on-the-device">Qualification on the device</h2>
<p>With the qualification records package omx-qualification-rpi5-zynthian-vangelis 2026110101: 1602 plugins (1341 LV2, 261 CLAP); 1079 qualified in-process
and 306 isolated; 93 crashed, 46 hung and 13 refused; 27 unmeasured, each with its reason. Every package installs from the
channel and <code>dpkg -V</code> finds nothing changed; each of the five instruments above sounds under its notes.</p>
<h2 id="what-is-not-measured-yet">What is not measured yet</h2>
<ul>
<li>Audio through a chain on a Zynthian with an audio interface, and latency measured on audio per host: both need a loopback
through the interface.</li>
<li>The per-block cost of every plugin at Zynthian's own quantum (128 and 256 frames): the qualification probe times
512-frame blocks only.</li>
<li>The cost estimate a chain editor would ask the daemon for before an insert.</li>
</ul>
`},t=JSON.parse(`{"slug":"plugin-hostd-on-a-raspberry-pi-5","order":80,"title":"\\"plugin-hostd en una Raspberry Pi 5: què s'ha mesurat i com\\"","summary":"En una Raspberry Pi 5 amb Zynthian, una cadena de plugin-hostd té la càrrega DSP més baixa dels tres amfitrions mesurats i fa servir entre un 41 i un 49 % menys de memòria que mod-host; a partir de quatre plugins també és la més ràpida d'ampliar. Aquesta nota en dona l'aparell, el mètode i totes les taules.","measured":"Raspberry Pi 5 (4 GB) amb ZynthianOS Vangelis, 2 de novembre del 2026; plugin-hostd 0.15.9, omx-clap-core 0.26.4, plugin-qualify 0.18.5, omx-plugins 0.17.0, el mod-host de sèrie de Zynthian.","topic":"zynthian","toc":[{"id":"l-aparell-i-el-metode","title":"L'aparell i el mètode"},{"id":"els-tres-amfitrions","title":"Els tres amfitrions"},{"id":"temps-d-addicio","title":"Temps d'addició"},{"id":"instruments","title":"Instruments"},{"id":"on-se-n-va-el-temps-de-la-cadena","title":"On se'n va el temps de la cadena"},{"id":"moltes-cadenes-alhora","title":"Moltes cadenes alhora"},{"id":"qualificacio-a-l-aparell","title":"Qualificació a l'aparell"},{"id":"el-que-encara-no-s-ha-mesurat","title":"El que encara no s'ha mesurat"}],"html":"<p>Les xifres d'aquestes execucions també són a la <a href=\\"/ca/benchmarks\\">pàgina de bancs de proves</a>, fila per fila.</p>\\n<h2 id=\\"l-aparell-i-el-metode\\">L'aparell i el mètode</h2>\\n<ul>\\n<li>Una Raspberry Pi 5 (Cortex-A76, 4 nuclis, 4 GB) amb ZynthianOS Vangelis (Debian 13, arm64), nucli 6.18 (sense\\nPREEMPT_RT), amb els paquets que instal·la un Zynthian des del canal d'OpenMixer.</li>\\n<li>Cada execució ha fet servir un servidor JACK privat amb el controlador fictici, a 48000 Hz i 256 mostres, amb el\\ngovernador de la CPU a <code>performance</code>. La càrrega DSP, els xruns i la latència són els del controlador fictici: tot s'ha\\nllegit digitalment als ports de JACK i res d'això no afirma res sobre l'àudio analògic.</li>\\n<li>Cada fila és la mediana de tres repeticions; DSP és la càrrega DSP de JACK, PSS la memòria proporcional dels processos de\\nl'amfitrió (que reparteix les biblioteques i per tant és la memòria que gasta de debò l'aparell).</li>\\n<li>El dimoni s'ha mesurat directament, no a través del motor de Zynthian. Les files de mod-host són el binari del mateix\\nZynthian, engegat en un port privat; cap fila no mesura MOD-UI ni el servei mod-host de l'aparell.</li>\\n</ul>\\n<p>Els amfitrions:</p>\\n<table>\\n<thead>\\n<tr>\\n<th>mode</th>\\n<th>què corre</th>\\n</tr>\\n</thead>\\n<tbody>\\n<tr>\\n<td>plugin-hostd, afegit a una sola cadena</td>\\n<td>el dimoni i un worker per a tota la cadena, un client JACK</td>\\n</tr>\\n<tr>\\n<td>plugin-hostd, cadena feta després de les addicions</td>\\n<td>cada plugin afegit en un worker propi i després es declara la cadena</td>\\n</tr>\\n<tr>\\n<td>plugin-hostd, un worker per plugin</td>\\n<td>el dimoni i un worker per plugin, un client JACK cadascun</td>\\n</tr>\\n<tr>\\n<td>omx-clap-host, un procés</td>\\n<td>un procés omx-clap-host per a tots els plugins</td>\\n</tr>\\n<tr>\\n<td>mod-host</td>\\n<td>un procés mod-host per a tots els plugins, un client JACK cadascun</td>\\n</tr>\\n</tbody>\\n</table>\\n<p>Els conjunts de plugins: 24 plugins en sèrie (omx comp, delay i drive alternats i Calf Compressor), en les seves versions\\nCLAP on un amfitrió pot fer córrer CLAP o en les seves versions LV2 a tots els amfitrions; i deu efectes LV2 de tercers en\\nsèrie, tots qualificats d'aptes per als tres amfitrions i nets en temps real a la qualificació.</p>\\n<h2 id=\\"els-tres-amfitrions\\">Els tres amfitrions</h2>\\n<p>0 xruns en cada repetició de cada fila. Càrrega DSP / PSS:</p>\\n<table>\\n<thead>\\n<tr>\\n<th>escenari</th>\\n<th>plugin-hostd, afegit a una sola cadena</th>\\n<th>omx-clap-host, un procés</th>\\n<th>mod-host</th>\\n</tr>\\n</thead>\\n<tbody>\\n<tr>\\n<td>24 plugins, versions CLAP (Calf LV2; mod-host fa córrer les versions LV2)</td>\\n<td>12,51 % / 64,1 MB</td>\\n<td>15,31 % / 64,6 MB</td>\\n<td>15,02 % / 109,4 MB</td>\\n</tr>\\n<tr>\\n<td>els mateixos 24, versions LV2 a tots els amfitrions</td>\\n<td>12,73 % / 63,3 MB</td>\\n<td>16,40 % / 63,9 MB</td>\\n<td>15,43 % / 109,4 MB</td>\\n</tr>\\n<tr>\\n<td>deu plugins LV2 de tercers</td>\\n<td>5,64 % / 45,2 MB</td>\\n<td>6,87 % / 44,1 MB</td>\\n<td>6,58 % / 89,5 MB</td>\\n</tr>\\n</tbody>\\n</table>\\n<p>La cadena de plugin-hostd té la càrrega DSP més baixa dels tres en cada escenari i en cada repetició (la seva repetició més\\nalta, 12,55 %, és per sota de la més baixa de mod-host, 14,88 %) i fa servir entre un 41 i un 49 % menys de memòria que\\nmod-host, com omx-clap-host. Un sol client JACK fa córrer tota la cadena, on mod-host posa al graf un client per plugin.</p>\\n<p>Els altres modes de plugin-hostd:</p>\\n<table>\\n<thead>\\n<tr>\\n<th>escenari</th>\\n<th>cadena feta després de les addicions</th>\\n<th>un worker per plugin</th>\\n</tr>\\n</thead>\\n<tbody>\\n<tr>\\n<td>24 plugins, versions CLAP</td>\\n<td>12,48 % / 65,8 MB</td>\\n<td>17,76 % / 183,1 MB</td>\\n</tr>\\n<tr>\\n<td>els mateixos 24, versions LV2</td>\\n<td>12,74 % / 64,3 MB</td>\\n<td>18,78 % / 189,6 MB</td>\\n</tr>\\n<tr>\\n<td>deu plugins LV2 de tercers</td>\\n<td>5,50 % / 45,8 MB</td>\\n<td>7,25 % / 111,2 MB</td>\\n</tr>\\n</tbody>\\n</table>\\n<p>Un worker per plugin és el mode car: 24 processos i 24 clients JACK i les úniques files amb xruns (una repetició de 24\\nplugins amb 21). No és el valor per defecte.</p>\\n<h2 id=\\"temps-d-addicio\\">Temps d'addició</h2>\\n<p>En fred: s'engega l'amfitrió i s'hi afegeixen tots els plugins del conjunt, fins que corre l'últim; la mediana de tres.\\nmod-host explora tot el món LV2 (1336 plugins en aquest aparell) abans de respondre i aquesta arrencada, de 800 a 945 ms,\\nforma part del seu temps.</p>\\n<table>\\n<thead>\\n<tr>\\n<th>conjunt</th>\\n<th>plugin-hostd, a una cadena</th>\\n<th>plugin-hostd, un worker cadascun</th>\\n<th>omx-clap-host</th>\\n<th>mod-host</th>\\n</tr>\\n</thead>\\n<tbody>\\n<tr>\\n<td>24 plugins, versions LV2</td>\\n<td>549 ms</td>\\n<td>1976 ms</td>\\n<td>948 ms</td>\\n<td>1459 ms</td>\\n</tr>\\n<tr>\\n<td>24 plugins, versions CLAP (Calf LV2)</td>\\n<td>440 ms</td>\\n<td></td>\\n<td>848 ms</td>\\n<td></td>\\n</tr>\\n<tr>\\n<td>deu plugins LV2 de tercers</td>\\n<td>255 ms</td>\\n<td>497 ms</td>\\n<td>458 ms</td>\\n<td>1044 ms</td>\\n</tr>\\n</tbody>\\n</table>\\n<p>En calent: cadenes de 2, 4 i 7 d'omx comp, delay i drive, versions LV2, amb l'amfitrió ja en marxa.</p>\\n<table>\\n<thead>\\n<tr>\\n<th>plugins</th>\\n<th>mod-host</th>\\n<th>plugin-hostd, a una cadena</th>\\n<th>omx-clap-host</th>\\n<th>plugin-hostd, un worker cadascun</th>\\n</tr>\\n</thead>\\n<tbody>\\n<tr>\\n<td>2</td>\\n<td>44,8 ms</td>\\n<td>55,9 ms</td>\\n<td>72,4 ms</td>\\n<td>79,5 ms</td>\\n</tr>\\n<tr>\\n<td>4</td>\\n<td>98 ms</td>\\n<td>73 ms</td>\\n<td>137 ms</td>\\n<td>154 ms</td>\\n</tr>\\n<tr>\\n<td>7</td>\\n<td>189 ms</td>\\n<td>96 ms</td>\\n<td>234 ms</td>\\n<td>272 ms</td>\\n</tr>\\n</tbody>\\n</table>\\n<p>mod-host és el més ràpid per afegir dos plugins a un amfitrió en marxa; a partir de quatre, ho és la cadena. Un worker propi\\ncosta uns 40 ms per plugin: el procés i el seu client JACK.</p>\\n<h2 id=\\"instruments\\">Instruments</h2>\\n<p>Una instància amb 1, 8 i 16 notes premudes; càrrega DSP i PSS:</p>\\n<table>\\n<thead>\\n<tr>\\n<th>instrument</th>\\n<th>plugin-hostd</th>\\n<th>mod-host</th>\\n</tr>\\n</thead>\\n<tbody>\\n<tr>\\n<td>mda Piano</td>\\n<td>0,6 / 2,0 / 3,5 %, 29 MB</td>\\n<td>0,6 / 2,0 / 3,5 %, 72 MB</td>\\n</tr>\\n<tr>\\n<td>Odin 2</td>\\n<td>3,6 / 11,8 / 21,3 %, 89 MB</td>\\n<td>3,8 / 11,7 / 21,0 %, 132 MB</td>\\n</tr>\\n<tr>\\n<td>Surge XT (CLAP a plugin-hostd, LV2 a mod-host)</td>\\n<td>1,8 / 4,2 / 6,9 %, 68 MB</td>\\n<td>2,0 / 4,1 / 6,9 %, 112 MB</td>\\n</tr>\\n</tbody>\\n</table>\\n<p>La mateixa càrrega DSP als dos amfitrions i entre 43 i 44 MB menys de memòria a plugin-hostd. ZynAddSubFX i sfizz corren com\\na programes JACK propis, com els fa córrer Zynthian, sense cap dels dos amfitrions: ZynAddSubFX amb Analog Pad 1 a 0,6 / 1,6\\n/ 2,6 %, 90 MB; sfizz amb el piano Salamander a 0,9 / 2,9 / 5,1 %, de 86 a 119 MB. Cap dels cinc no ofereix un grup de fils.\\nUna repetició d'Odin 2 a plugin-hostd amb una nota va tenir un xrun. Com fan servir els nuclis els instruments és a\\n<a href=\\"/ca/notes/instruments-on-a-pi-5\\">Instruments en una Pi 5</a>.</p>\\n<h2 id=\\"on-se-n-va-el-temps-de-la-cadena\\">On se'n va el temps de la cadena</h2>\\n<p>perf sobre el fil d'àudio del worker, 24 plugins en una sola cadena, mesurat amb versions que porten símbols: els plugins i\\nlibm se'n queden entre el 88 i el 92 %. El codi del mateix amfitrió en pren entre un 4 i un 7 %: les còpies de l'adaptador\\nLV2 (1,9 % quan tots els plugins són LV2), les còpies a l'entrada i la sortida de la cadena (prop de l'1 %), la feina de\\ncontrol i d'esdeveniments de l'adaptador (prop de l'1 % en LV2) i les proteccions de l'etapa amb la limitació (prop del 0,5\\n%). El nucli del sistema i libjack en prenen el 0,5 %, on mod-host, amb la mateixa cadena, hi passa entre el 10 i el 14 %\\nde les seves mostres, repartides entre els seus 24 clients JACK. El símbol més pesant és <code>tanhf</code> a omx-drive, del 14 al 15\\n%.</p>\\n<h2 id=\\"moltes-cadenes-alhora\\">Moltes cadenes alhora</h2>\\n<p>Una prova de càrrega anterior, amb plugin-hostd 0.13.1 i el servidor JACK del mateix aparell a 48000 Hz i 256 mostres, va\\nmantenir cadenes de quatre plugins LV2 amb 1, 2, 4, 8 i 16 cadenes, 60 s cada nivell. Amb 16 cadenes, els processos\\namfitrions feien servir el 70,6 % d'un nucli agrupats (un worker per cadena, 60 plugins), el 100,8 % sols (un worker per\\nplugin) i el 82,3 % amb jalv (64 plugins); la PSS era de 224,2, 359,3 i 2745,6 MB. Agrupats i sols van arribar a 16 cadenes\\nsense cap límit; jalv s'hi va aturar per memòria, amb 2 xruns.</p>\\n<h2 id=\\"qualificacio-a-l-aparell\\">Qualificació a l'aparell</h2>\\n<p>Amb el paquet de registres de qualificació omx-qualification-rpi5-zynthian-vangelis 2026110101: 1602 plugins (1341 LV2, 261 CLAP); 1079 qualificats\\ndins del procés i 306 aïllats; 93 han fallat, 46 s'han penjat i 13 s'han refusat; 27 sense mesura, cadascun amb el seu motiu.\\nTots els paquets s'instal·len des del canal i <code>dpkg -V</code> no hi troba res canviat; cadascun dels cinc instruments d'abans sona\\namb les seves notes.</p>\\n<h2 id=\\"el-que-encara-no-s-ha-mesurat\\">El que encara no s'ha mesurat</h2>\\n<ul>\\n<li>L'àudio a través d'una cadena en un Zynthian amb una interfície d'àudio i la latència mesurada en àudio per a cada\\namfitrió: totes dues coses necessiten un bucle de retorn a través de la interfície.</li>\\n<li>El cost per bloc de cada plugin al quàntum del mateix Zynthian (128 i 256 mostres): la sonda de qualificació només\\ncronometra blocs de 512 mostres.</li>\\n<li>L'estimació de cost que un editor de cadenes demanaria al dimoni abans d'inserir un plugin.</li>\\n</ul>\\n"}`),n={en:e,ca:t};export{t as ca,n as default,e as en};