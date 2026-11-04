var e={slug:`from-a-plugin-file-to-a-page`,order:70,title:`From a plugin file to a page on the screen`,summary:`Five stages turn a CLAP or LV2 file into a menu row with its figures, controller pages and a MOD GUI on a Zynthian. Each stage has one owner, writes one artefact in a fixed place, and the stages after it read that artefact and nothing else.`,measured:`plugin-hostd, plugin-qualify and omx-panel on a Raspberry Pi 5 with Zynthian, October 2026.`,topic:`zynthian`,toc:[{id:`1-scan-and-describe`,title:`1. Scan and describe`},{id:`2-qualify`,title:`2. Qualify`},{id:`3-pins`,title:`3. Pins`},{id:`4-layout`,title:`4. Layout`},{id:`5-read-on-the-device`,title:`5. Read on the device`}],html:`<p>An instrument on a Zynthian is a file on the disk: a CLAP or LV2 binary. What the player sees is a row in a menu with its
figures, a chain with a MIDI input, controller pages with knobs, a MOD GUI, and a footer saying what the chain will cost.
Five stages turn one into the other. Each stage has one owner, writes one artefact in a fixed place, and what comes after
reads that artefact and nothing else.</p>
<p>The running example is an instrument: <a href="https://github.com/DISTRHO/Kars">Kars</a>, an LV2 plucked-string synth, in the
captures from the device; Surge XT (CLAP) where its figures matter; and an effect once, to show where the layout differs.</p>
<p><img src="/technical-notes/from-a-plugin-file-to-a-page/from-file-to-page.svg" alt="The five stages, the artefact each writes and the surfaces that read them"></p>
<h2 id="1-scan-and-describe">1. Scan and describe</h2>
<p><strong>Owner:</strong> plugin-hostd. <strong>Writes:</strong> the descriptor, one JSON document per plugin binary under
<code>/var/lib/omx/descriptors</code>, named <code>&lt;id&gt;@&lt;version&gt;-&lt;hash&gt;.json</code>.</p>
<p>The daemon loads the plugin once in the matching host (omx-clap-host for CLAP and for the LV2 plugins its adapter takes,
mod-host for the rest) and reads everything the plugin declares: id and version, audio and MIDI ports, every parameter with
symbol, name, unit, range, default, steps or enumeration, flags, declared latency, and the extensions it supports.</p>
<p>For an instrument the descriptor says what an effect's does not: a MIDI input port, and so the notes it takes, its
parameters and its presets. Kars's descriptor has the three parameters the engine later shows on its one page: Sustain,
Release and Volume.</p>
<p>The descriptor must fit the contract: omx-contract defines the vocabulary (units, port kinds, scopes, outcome codes), and a
scan that finds an unknown unit or field is refused, not invented. OpenMixer's own plugins skip the scan: their parameters
are written once in a declaration, and a generator writes the descriptor, the LV2 bundle, the CLAP parameters and the
parameter reference from it.</p>
<h2 id="2-qualify">2. Qualify</h2>
<p><strong>Owner:</strong> plugin-qualify. <strong>Writes:</strong> the qualification record, <code>&lt;plugin&gt;@&lt;version&gt;-&lt;hash&gt;.&lt;offer&gt;.qualification.json</code>,
with the probe output it judged beside it, under <code>/var/lib/omx/qualification</code>.</p>
<p>The probe runs the plugin at every cell of a grid (44.1, 48, 96 and 192 kHz times blocks of 128, 256, 512 and 1024
frames) and writes the record: the checksums of the binary's files, the cost per block, declared and measured latency,
real-time safety under the interposer, or a reason code for each cell that did not run. For an instrument the probe holds
a set of notes while it measures, so the cost is the cost with those voices sounding.</p>
<p>A verdict for each host follows: suitable, isolated (it runs in a worker of its own and is never grouped), or unsuitable.
Kars is rated suitable for omx-clap-host, real-time safe under a parameter sweep and under notes, hosted isolated. The Pi's
figures are in <a href="/notes/plugin-hostd-on-a-raspberry-pi-5">plugin-hostd on a Raspberry Pi 5</a>, and Surge XT's in
<a href="/notes/instruments-on-a-pi-5">Instruments on a Pi 5</a>.</p>
<h2 id="3-pins">3. Pins</h2>
<p><strong>Owner:</strong> plugin-qualify. <strong>Writes:</strong> <code>/var/lib/omx/qualified.pins</code>, one line per plugin.</p>
<p>From the records, one line per plugin says what plugin-hostd may host and how (see
<a href="/notes/pins-on-first-use">Pins on first use</a>). The daemon loads the pins as its only source of permission, and its
planner reads them to group workers and to place them on cores. An instrument is never put into a chain's shared worker,
so a fault or a late buffer in a voice cannot reach the effects after it.</p>
<p>That is also what the cores need. Surge XT 1.4.0 ignores CLAP's thread-pool extension, so one instrument is one audio
thread. Several instruments use several cores when each is in its own worker and the workers are spread over the audio
cores, with the daemon kept off them.</p>
<h2 id="4-layout">4. Layout</h2>
<p><strong>Owner:</strong> omx-panel. <strong>Writes:</strong> the pages, computed from the descriptor by <code>omx-panel layout --descriptor</code>; the record
keeps the layout scheme and hash it was judged against.</p>
<p>The layout turns a descriptor's parameters into pages: sections become groups, and every control gets a stable key. The
same layout drives the engine's controller pages in Zynthian, the MOD GUI generated for MOD-UI, and the bundle that adds
groups to third-party LV2 plugins (see <a href="/notes/why-lv2-plugins-on-zynthian-need-inferred-port-groups">Why most LV2 plugins on a Zynthian need inferred port
groups</a>).</p>
<p>Kars has one group of three knobs, and so one page, &quot;Controls&quot;. An effect lays out differently: OpenMixer's equaliser
puts each band on a page of its own.</p>
<h2 id="5-read-on-the-device">5. Read on the device</h2>
<p><strong>Owner:</strong> Zynthian's user interface, with the daemon. <strong>Writes:</strong> nothing; it reads.</p>
<p>The interface reads the pins for its menus, the records for latency, real-time safety and cost on each row, and the layout
for the pages. Before an insert it asks the daemon's <code>estimate</code> verb what the chain will cost. Nothing is computed twice:
the descriptor for parameters, the record for figures, the pin for permission, the layout for pages.</p>
<p>On the device, for Kars, the plugin menu row with its tier, latency (measured and declared frames) and real-time safety:</p>
<p><img src="/technical-notes/from-a-plugin-file-to-a-page/list-by-tier.png" alt="The plugin menu, sorted by tier"></p>
<p>the engine's controller page:</p>
<p><img src="/technical-notes/from-a-plugin-file-to-a-page/controller-page-1-controls.png" alt="The controller page of Kars"></p>
<p>the MOD GUI from the same layout:</p>
<p><img src="/technical-notes/from-a-plugin-file-to-a-page/modgui-pedalboard.png" alt="The MOD GUI of Kars on a pedalboard"></p>
<p>and the chain with the instrument:</p>
<p><img src="/technical-notes/from-a-plugin-file-to-a-page/chain-view-kars-zamcomp.png" alt="A chain with Kars and a compressor"></p>
<p>A fresh device does not repeat the long stage. A package ships the records and pins of a known plugin set, keyed by
checksums, so a fresh device applies them and probes only what differs.</p>
`},t={slug:`from-a-plugin-file-to-a-page`,order:70,title:`D'un fitxer de plugin a una pàgina a la pantalla`,summary:`Cinc etapes converteixen un fitxer CLAP o LV2 en una fila de menú amb les seves xifres, pàgines de controls i una MOD GUI en un Zynthian. Cada etapa té un sol responsable, escriu un sol artefacte en un lloc fix i les etapes següents llegeixen aquest artefacte i res més.`,measured:`plugin-hostd, plugin-qualify i omx-panel en una Raspberry Pi 5 amb Zynthian, octubre del 2026.`,topic:`zynthian`,toc:[{id:`1-explorar-i-descriure`,title:`1. Explorar i descriure`},{id:`2-qualificar`,title:`2. Qualificar`},{id:`3-empremtes`,title:`3. Empremtes`},{id:`4-disposicio`,title:`4. Disposició`},{id:`5-llegir-a-l-aparell`,title:`5. Llegir a l'aparell`}],html:`<p>Un instrument en un Zynthian és un fitxer al disc: un binari CLAP o LV2. El que veu qui toca és una fila en un menú amb les
seves xifres, una cadena amb una entrada MIDI, pàgines de controls amb potenciòmetres, una MOD GUI i un peu de pàgina que
diu què costarà la cadena. Cinc etapes converteixen l'un en l'altre. Cada etapa té un sol responsable, escriu un sol
artefacte en un lloc fix i el que ve després llegeix aquest artefacte i res més.</p>
<p>L'exemple és un instrument: <a href="https://github.com/DISTRHO/Kars">Kars</a>, un sintetitzador LV2 de corda pinçada, a les captures
de l'aparell; Surge XT (CLAP) on importen les seves xifres; i un efecte una vegada, per mostrar on canvia la disposició.</p>
<p><img src="/technical-notes/from-a-plugin-file-to-a-page/from-file-to-page.svg" alt="Les cinc etapes, l'artefacte que escriu cadascuna i les superfícies que els llegeixen"></p>
<h2 id="1-explorar-i-descriure">1. Explorar i descriure</h2>
<p><strong>Responsable:</strong> plugin-hostd. <strong>Escriu:</strong> el descriptor, un document JSON per binari de plugin a
<code>/var/lib/omx/descriptors</code>, amb el nom <code>&lt;id&gt;@&lt;version&gt;-&lt;hash&gt;.json</code>.</p>
<p>El dimoni carrega el plugin una vegada a l'amfitrió que li correspon (omx-clap-host per a CLAP i per als plugins LV2 que
pren el seu adaptador, mod-host per a la resta) i en llegeix tot el que declara: l'identificador i la versió, els ports
d'àudio i MIDI, cada paràmetre amb símbol, nom, unitat, rang, valor per defecte, passos o enumeració, indicadors, la
latència declarada i les extensions que admet.</p>
<p>Per a un instrument, el descriptor diu el que no diu el d'un efecte: un port d'entrada MIDI i per tant les notes que
accepta, els seus paràmetres i els seus presets. El descriptor de Kars té els tres paràmetres que el motor mostra després a
la seva única pàgina: Sustain, Release i Volume.</p>
<p>El descriptor ha d'encaixar amb el contracte: omx-contract en defineix el vocabulari (unitats, tipus de port, àmbits,
codis de resultat) i una exploració que troba una unitat o un camp desconeguts es refusa, no s'inventa. Els plugins
d'OpenMixer se salten l'exploració: els seus paràmetres s'escriuen una sola vegada en una declaració i un generador n'escriu
el descriptor, el paquet LV2, els paràmetres CLAP i la referència de paràmetres.</p>
<h2 id="2-qualificar">2. Qualificar</h2>
<p><strong>Responsable:</strong> plugin-qualify. <strong>Escriu:</strong> el registre de qualificació,
<code>&lt;plugin&gt;@&lt;version&gt;-&lt;hash&gt;.&lt;offer&gt;.qualification.json</code>, amb la sortida de la sonda que ha jutjat al costat, a
<code>/var/lib/omx/qualification</code>.</p>
<p>La sonda fa córrer el plugin a cada cel·la d'una graella (44,1, 48, 96 i 192 kHz per blocs de 128, 256, 512 i 1024
mostres) i n'escriu el registre: els resums dels fitxers del binari, el cost per bloc, la latència declarada i la mesurada,
la seguretat en temps real sota l'interposador o un codi de motiu per a cada cel·la que no ha corregut. Per a un
instrument, la sonda manté unes quantes notes premudes mentre mesura, de manera que el cost és el cost amb aquelles veus
sonant.</p>
<p>En surt un veredicte per a cada amfitrió: apte, aïllat (corre en un worker propi i no s'agrupa mai) o no apte. Kars queda
apte per a omx-clap-host, segur en temps real amb un escombratge de paràmetres i amb notes, allotjat aïllat. Les xifres de
la Pi són a <a href="/ca/notes/plugin-hostd-on-a-raspberry-pi-5">plugin-hostd en una Raspberry Pi 5</a> i les de Surge XT a
<a href="/ca/notes/instruments-on-a-pi-5">Instruments en una Pi 5</a>.</p>
<h2 id="3-empremtes">3. Empremtes</h2>
<p><strong>Responsable:</strong> plugin-qualify. <strong>Escriu:</strong> <code>/var/lib/omx/qualified.pins</code>, una línia per plugin.</p>
<p>A partir dels registres, una línia per plugin diu què pot allotjar plugin-hostd i com (vegeu
<a href="/ca/notes/pins-on-first-use">Empremtes al primer ús</a>). El dimoni carrega les empremtes com a única font de permís i el seu
planificador les llegeix per agrupar workers i col·locar-los en nuclis. Un instrument mai no es posa al worker compartit
d'una cadena, de manera que una fallada o un búfer tardà d'una veu no poden arribar als efectes que la segueixen.</p>
<p>És també el que necessiten els nuclis. Surge XT 1.4.0 no fa cas de l'extensió de grup de fils de CLAP, de manera que un
instrument és un fil d'àudio. Uns quants instruments fan servir uns quants nuclis quan cadascun és en el seu worker i els
workers es reparteixen pels nuclis d'àudio, amb el dimoni fora d'aquests nuclis.</p>
<h2 id="4-disposicio">4. Disposició</h2>
<p><strong>Responsable:</strong> omx-panel. <strong>Escriu:</strong> les pàgines, calculades a partir del descriptor amb
<code>omx-panel layout --descriptor</code>; el registre guarda l'esquema i el resum de la disposició amb què s'ha jutjat.</p>
<p>La disposició converteix els paràmetres d'un descriptor en pàgines: les seccions esdevenen grups i cada control rep una
clau estable. La mateixa disposició governa les pàgines de controls del motor a Zynthian, la MOD GUI generada per a MOD-UI
i el paquet que afegeix grups als plugins LV2 de tercers (vegeu <a href="/ca/notes/why-lv2-plugins-on-zynthian-need-inferred-port-groups">Per què la majoria dels plugins LV2 d'un Zynthian
necessiten grups de ports inferits</a>).</p>
<p>Kars té un grup de tres potenciòmetres i per tant una sola pàgina, &quot;Controls&quot;. Un efecte es disposa d'una altra manera:
l'equalitzador d'OpenMixer posa cada banda en una pàgina pròpia.</p>
<h2 id="5-llegir-a-l-aparell">5. Llegir a l'aparell</h2>
<p><strong>Responsable:</strong> la interfície de Zynthian, amb el dimoni. <strong>Escriu:</strong> res; llegeix.</p>
<p>La interfície llegeix les empremtes per als seus menús, els registres per a la latència, la seguretat en temps real i el
cost de cada fila i la disposició per a les pàgines. Abans d'inserir un plugin pregunta al verb <code>estimate</code> del dimoni què
costarà la cadena. Res no es calcula dues vegades: el descriptor per als paràmetres, el registre per a les xifres,
l'empremta per al permís, la disposició per a les pàgines.</p>
<p>A l'aparell, per a Kars, la fila del menú de plugins amb el seu nivell, la latència (mostres mesurades i declarades) i la
seguretat en temps real:</p>
<p><img src="/technical-notes/from-a-plugin-file-to-a-page/list-by-tier.png" alt="El menú de plugins, ordenat per nivell"></p>
<p>la pàgina de controls del motor:</p>
<p><img src="/technical-notes/from-a-plugin-file-to-a-page/controller-page-1-controls.png" alt="La pàgina de controls de Kars"></p>
<p>la MOD GUI a partir de la mateixa disposició:</p>
<p><img src="/technical-notes/from-a-plugin-file-to-a-page/modgui-pedalboard.png" alt="La MOD GUI de Kars en un pedalboard"></p>
<p>i la cadena amb l'instrument:</p>
<p><img src="/technical-notes/from-a-plugin-file-to-a-page/chain-view-kars-zamcomp.png" alt="Una cadena amb Kars i un compressor"></p>
<p>Un aparell nou no repeteix l'etapa llarga. Un paquet porta els registres i les empremtes d'un conjunt de plugins conegut,
indexats per resums, de manera que un aparell nou els aplica i només sondeja el que és diferent.</p>
`},n={en:e,ca:t};export{t as ca,n as default,e as en};