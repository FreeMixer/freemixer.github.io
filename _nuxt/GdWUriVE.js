var e={slug:`one-worker-per-chain-or-one-process-per-plugin`,order:100,title:`"One worker per chain or one process per plugin: the trade-offs"`,summary:`Grouping a chain into one worker saves most of the memory and much of the CPU that one process per plugin spends, and a crash still costs only the plugin that crashed; the price is that plugins sharing a process must be trusted, which is what qualification decides.`,measured:`Raspberry Pi 5 with Zynthian, 48 kHz, 256 frames, October and November 2026; the versions are named with each figure.`,topic:`zynthian`,toc:[{id:`what-grouping-buys`,title:`What grouping buys`},{id:`what-it-costs`,title:`What it costs`},{id:`clap-hosting`,title:`CLAP hosting`},{id:`qualification-and-pins`,title:`Qualification and pins`},{id:`mod-host-compatibility`,title:`mod-host compatibility`},{id:`packaging`,title:`Packaging`},{id:`what-is-not-done`,title:`What is not done`}],html:`<p>plugin-hostd runs a chain in one worker process (grouped) or each plugin in a worker of its own. Zynthian's own hosts sit at
either end: jalv runs one process per plugin, mod-host every plugin in one process. The figures are in
<a href="/notes/plugin-hostd-on-a-raspberry-pi-5">plugin-hostd on a Raspberry Pi 5</a> and on the <a href="/benchmarks">benchmarks page</a>; they
measure the daemon directly on a private JACK graph, not through Zynthian's engine.</p>
<h2 id="what-grouping-buys">What grouping buys</h2>
<ul>
<li><strong>Memory.</strong> 24 plugins in one chain take 64.1 MB of proportional memory, against 183.1 MB with one worker per plugin and
109.4 MB under mod-host (plugin-hostd 0.15.9). Under jalv, 24 plugins took 993.6 MB (plugin-hostd 0.15.4). On a 4 GB Pi this is the difference that grows with the chain.</li>
<li><strong>CPU.</strong> The grouped chain has the lowest DSP load of the hosts measured: 12.51 % for the 24, against 17.76 % with one
worker per plugin and 15.02 % under mod-host.</li>
<li><strong>Fewer wake-ups.</strong> One JACK client runs the whole chain. With 16 plugins, the grouped chain made 6023 context switches in
20 s, against 84 099 with one worker per plugin and 72 292 under mod-host.</li>
<li><strong>Crash containment.</strong> A lost worker is restarted by the daemon with the links it made itself, in about 340 ms; jalv and
mod-host lose the process and nothing brings the plugin back. Inside a chain, a member that aborts leaves the others
playing (see <a href="/notes/chains-plugins-in-series-in-one-worker">Chains</a>). Links made from outside, as Zynthian's routing is,
are not restored by the daemon.</li>
</ul>
<h2 id="what-it-costs">What it costs</h2>
<ul>
<li><strong>A shared process must be trusted.</strong> A plugin that corrupts memory instead of crashing cleanly can take the chain with it.
Qualification is the guard: a plugin that fails the real-time safety sweep is isolated (it runs in a worker of its own and
is never grouped), and one that crashes, hangs or fails to load is not offered.</li>
<li><strong>Isolation has its own cost.</strong> Each isolated plugin is one more worker, one more process and one more JACK client: the
one-worker-per-plugin figures above. On the device, 306 of 1602 plugins qualify as isolated.</li>
<li><strong>Adding to a chain.</strong> Added into the chain's worker, 24 plugins take 549 ms cold against mod-host's 1459 ms, and from four
plugins on a warm add is faster than mod-host's; mod-host adds two plugins to a running host faster (44.8 ms against
55.9 ms).</li>
<li><strong>Latency</strong> is only the latency the clients declare (none for these plugins). A measured round trip per host needs a
loopback through an audio interface, and has not been taken.</li>
</ul>
<h2 id="clap-hosting">CLAP hosting</h2>
<p>Zynthian has no CLAP host of its own: jalv and mod-host host LV2 only. plugin-hostd hosts CLAP in its worker,
omx-clap-host, and LV2 through the same worker's LV2 adapter, so a chain can mix the two.</p>
<ul>
<li>Every one of OpenMixer's own plugins sweeps clean in both formats.</li>
<li>The CLAP and LV2 builds of one plugin are not interchangeable in cost: at 192 kHz and 512 frames, the LV2 build of one
chorus costs 592.2 ns per sample at the median against 0.85 for its CLAP build. The reason is not established.</li>
<li>CLAP behind MOD-UI does not carry over: MOD-UI reads LV2 descriptions, so CLAP ports, parameters, presets and MIDI maps
do not reach it. Zynthian's plugin-hostd engine does not go through MOD-UI.</li>
</ul>
<h2 id="qualification-and-pins">Qualification and pins</h2>
<p>Every plugin on the device is measured once, and plugin-hostd reads the result as a pin per binary: a plugin whose files
change is measured again.</p>
<ul>
<li>Three classes: <strong>suitable</strong>; <strong>isolated</strong>, a plugin that fails the real-time safety sweep, run in a worker of its own and
never grouped; and <strong>unsuitable</strong>, a plugin that crashes, hangs, fails to load or breaks the host.</li>
<li>LV2 suitability came out the same for jalv, mod-host and plugin-hostd's worker, so qualification does not shrink what
Zynthian offers for LV2: it isolates the plugins found allocating, locking or calling into the kernel on the audio thread,
and leaves out the ones that crash or hang.</li>
<li>A plugin plugin-hostd refuses stays on jalv, listed in its menu: nothing the user has disappears.</li>
<li>Cost is not part of any verdict yet: the probe times 512-frame blocks only, so the menus' cost tags are not from Zynthian's
own quantum.</li>
<li>A full qualification of every plugin on a Pi 5 takes about six hours. It runs once per plugin set, not at boot, and a
package carries the records of a known set so a fresh device probes only what differs.</li>
</ul>
<h2 id="mod-host-compatibility">mod-host compatibility</h2>
<p>plugin-hostd speaks mod-host's protocol on its port, so MOD-UI and Zynthian code written for mod-host talk to it unchanged.
In a session driven through MOD-UI, 130 of 135 replies were identical. The five that differed: <code>connect</code> to the
<code>mod-monitor</code> client (no worker owns it), <code>feature_enable aggregated-midi</code> (a worker started later never hears it), and
<code>preset_load</code> of a user preset after a pedalboard reload. Feedback differs by worker: <code>transport</code> was reported six times
instead of once. The protocol and every verb are in the <a href="/projects/plugin-hostd-protocol/protocol">plugin-hostd-protocol reference</a>.</p>
<h2 id="packaging">Packaging</h2>
<p>The packages come from the OpenMixer apt repository for Debian 13 arm64: plugin-hostd, omx-clap-host, omx-plugins and
omx-panel. ZynthianOS Vangelis ships Python 3.13, on which MOD-UI's install recipe did not build; the change that makes it
build is offered to Zynthian. A second apt source is a cost for an image: a mirror, keys, and a release cadence that is not
Zynthian's.</p>
<h2 id="what-is-not-done">What is not done</h2>
<ul>
<li>A listening test through an audio interface: the plugins are measured digitally at JACK ports on the Pi, and the
sample-by-sample round trip of a chain ran in containers.</li>
<li>The cost grid at the hosts' own quantums (128, 256 and 1024 frames).</li>
<li>A cost estimate at Zynthian's quantum before an insert.</li>
<li>The MOD-UI engine on plugin-hostd, measured on the device.</li>
</ul>
`},t={slug:`one-worker-per-chain-or-one-process-per-plugin`,order:100,title:`"Un worker per cadena o un procés per plugin: els pros i els contres"`,summary:`Agrupar una cadena en un sol worker estalvia la major part de la memòria i bona part de la CPU que gasta un procés per plugin i una fallada continua costant només el plugin que ha fallat; el preu és que cal refiar-se dels plugins que comparteixen procés i això és el que decideix la qualificació.`,measured:`Raspberry Pi 5 amb Zynthian, 48 kHz, 256 mostres, octubre i novembre del 2026; les versions s'indiquen amb cada xifra.`,topic:`zynthian`,toc:[{id:`que-hi-guanyes-agrupant`,title:`Què hi guanyes agrupant`},{id:`que-costa`,title:`Què costa`},{id:`allotjar-clap`,title:`Allotjar CLAP`},{id:`qualificacio-i-empremtes`,title:`Qualificació i empremtes`},{id:`compatibilitat-amb-mod-host`,title:`Compatibilitat amb mod-host`},{id:`paquets`,title:`Paquets`},{id:`el-que-no-esta-fet`,title:`El que no està fet`}],html:`<p>plugin-hostd fa córrer una cadena en un sol procés worker (agrupada) o cada plugin en un worker propi. Els amfitrions del
mateix Zynthian són als dos extrems: jalv fa córrer un procés per plugin, mod-host tots els plugins en un sol procés. Les
xifres són a <a href="/ca/notes/plugin-hostd-on-a-raspberry-pi-5">plugin-hostd en una Raspberry Pi 5</a> i a la <a href="/ca/benchmarks">pàgina de bancs de
proves</a>; mesuren el dimoni directament en un graf JACK privat, no a través del motor de Zynthian.</p>
<h2 id="que-hi-guanyes-agrupant">Què hi guanyes agrupant</h2>
<ul>
<li><strong>Memòria.</strong> 24 plugins en una sola cadena ocupen 64,1 MB de memòria proporcional, contra 183,1 MB amb un worker per
plugin i 109,4 MB amb mod-host (plugin-hostd 0.15.9). Amb jalv, 24 plugins van ocupar 993,6 MB (plugin-hostd 0.15.4). En una Pi de 4 GB, aquesta és la diferència que creix amb la cadena.</li>
<li><strong>CPU.</strong> La cadena agrupada té la càrrega DSP més baixa dels amfitrions mesurats: un 12,51 % per als 24, contra un 17,76 %
amb un worker per plugin i un 15,02 % amb mod-host.</li>
<li><strong>Menys despertars.</strong> Un sol client JACK fa córrer tota la cadena. Amb 16 plugins, la cadena agrupada va fer 6023 canvis de
context en 20 s, contra 84 099 amb un worker per plugin i 72 292 amb mod-host.</li>
<li><strong>Contenció de fallades.</strong> El dimoni reinicia un worker perdut amb els enllaços que ell mateix havia fet, en uns 340 ms;
jalv i mod-host perden el procés i res no torna el plugin. Dins d'una cadena, un membre que avorta deixa els altres
sonant (vegeu <a href="/ca/notes/chains-plugins-in-series-in-one-worker">Cadenes</a>). Els enllaços fets des de fora, com els de
l'encaminament de Zynthian, el dimoni no els restableix.</li>
</ul>
<h2 id="que-costa">Què costa</h2>
<ul>
<li><strong>Cal refiar-se d'un procés compartit.</strong> Un plugin que corromp la memòria en lloc de fallar netament es pot endur la
cadena. La qualificació n'és la protecció: un plugin que no supera l'escombratge de seguretat en temps real queda aïllat
(corre en un worker propi i no s'agrupa mai) i un que falla, es penja o no es carrega no s'ofereix.</li>
<li><strong>L'aïllament també té el seu cost.</strong> Cada plugin aïllat és un worker més, un procés més i un client JACK més: les xifres
d'un worker per plugin d'abans. A l'aparell, 306 dels 1602 plugins es qualifiquen com a aïllats.</li>
<li><strong>Afegir a una cadena.</strong> Afegits al worker de la cadena, 24 plugins triguen 549 ms en fred contra els 1459 ms de mod-host
i a partir de quatre plugins una addició en calent és més ràpida que la de mod-host; mod-host afegeix dos plugins a un
amfitrió en marxa més de pressa (44,8 ms contra 55,9 ms).</li>
<li><strong>La latència</strong> és només la que declaren els clients (cap per a aquests plugins). Una anada i tornada mesurada per a cada
amfitrió necessita un bucle de retorn a través d'una interfície d'àudio i no s'ha fet.</li>
</ul>
<h2 id="allotjar-clap">Allotjar CLAP</h2>
<p>Zynthian no té un amfitrió CLAP propi: jalv i mod-host només allotgen LV2. plugin-hostd allotja CLAP al seu worker,
omx-clap-host i LV2 a través de l'adaptador LV2 del mateix worker, de manera que una cadena pot barrejar tots dos formats.</p>
<ul>
<li>Tots els plugins d'OpenMixer superen nets l'escombratge en tots dos formats.</li>
<li>Les versions CLAP i LV2 d'un mateix plugin no són intercanviables pel que fa al cost: a 192 kHz i 512 mostres, la versió
LV2 d'un chorus costa 592,2 ns per mostra de mediana contra 0,85 la seva versió CLAP. No se n'ha establert el motiu.</li>
<li>CLAP darrere de MOD-UI no funciona: MOD-UI llegeix descripcions LV2, de manera que els ports, els paràmetres, els presets
i les assignacions MIDI de CLAP no hi arriben. El motor plugin-hostd de Zynthian no passa per MOD-UI.</li>
</ul>
<h2 id="qualificacio-i-empremtes">Qualificació i empremtes</h2>
<p>Cada plugin de l'aparell es mesura una vegada i plugin-hostd en llegeix el resultat com una empremta per binari: un plugin
els fitxers del qual canvien es torna a mesurar.</p>
<ul>
<li>Tres classes: <strong>apte</strong>; <strong>aïllat</strong>, un plugin que no supera l'escombratge de seguretat en temps real, que corre en un
worker propi i no s'agrupa mai; i <strong>no apte</strong>, un plugin que falla, es penja, no es carrega o fa fallar l'amfitrió.</li>
<li>L'aptitud dels LV2 va sortir igual per a jalv, mod-host i el worker de plugin-hostd, de manera que la qualificació no
redueix el que Zynthian ofereix en LV2: aïlla els plugins que reserven memòria, es bloquegen o criden el nucli al fil
d'àudio i deixa fora els que fallen o es pengen.</li>
<li>Un plugin que plugin-hostd refusa es queda a jalv, llistat al seu menú: no desapareix res del que té l'usuari.</li>
<li>El cost encara no forma part de cap veredicte: la sonda només cronometra blocs de 512 mostres, de manera que les
etiquetes de cost dels menús no són del quàntum del mateix Zynthian.</li>
<li>Una qualificació completa de tots els plugins en una Pi 5 triga unes sis hores. Es fa una vegada per conjunt de plugins,
no en arrencar i un paquet porta els registres d'un conjunt conegut perquè un aparell nou només sondegi el que és
diferent.</li>
</ul>
<h2 id="compatibilitat-amb-mod-host">Compatibilitat amb mod-host</h2>
<p>plugin-hostd parla el protocol de mod-host al seu port, de manera que MOD-UI i el codi de Zynthian escrit per a mod-host hi
parlen sense canvis. En una sessió conduïda a través de MOD-UI, 130 de les 135 respostes van ser idèntiques. Les cinc que
diferien: <code>connect</code> al client <code>mod-monitor</code> (cap worker no n'és el propietari), <code>feature_enable aggregated-midi</code> (un worker
engegat després no ho sent mai) i <code>preset_load</code> d'un preset d'usuari després de recarregar un pedalboard. El retorn canvia
per worker: <code>transport</code> es va comunicar sis vegades en lloc d'una. El protocol i tots els verbs són a la <a href="/projects/plugin-hostd-protocol/protocol">referència de
plugin-hostd-protocol</a>.</p>
<h2 id="paquets">Paquets</h2>
<p>Els paquets vénen del repositori apt d'OpenMixer per a Debian 13 arm64: plugin-hostd, omx-clap-host, omx-plugins i
omx-panel. ZynthianOS Vangelis porta Python 3.13, amb el qual la recepta d'instal·lació de MOD-UI no compilava; el canvi que
la fa compilar s'ha ofert a Zynthian. Una segona font apt és un cost per a una imatge: una rèplica, claus i un ritme de
versions que no és el de Zynthian.</p>
<h2 id="el-que-no-esta-fet">El que no està fet</h2>
<ul>
<li>Una prova d'escolta a través d'una interfície d'àudio: els plugins es mesuren digitalment als ports de JACK a la Pi i
l'anada i tornada mostra a mostra d'una cadena es va fer en contenidors.</li>
<li>La graella de costos als quàntums propis dels amfitrions (128, 256 i 1024 mostres).</li>
<li>Una estimació de cost al quàntum de Zynthian abans d'inserir un plugin.</li>
<li>El motor MOD-UI sobre plugin-hostd, mesurat a l'aparell.</li>
</ul>
`},n={en:e,ca:t};export{t as ca,n as default,e as en};