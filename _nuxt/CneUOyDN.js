var e={slug:`instruments-on-a-pi-5`,order:90,title:`"Instruments on a Pi 5: Surge XT voices across the cores"`,summary:`An instrument that computes every voice on one core sets the polyphony a Pi 5 can play, however idle the other cores are. Surge XT does not split its voices into tasks, so the cores it can use come from running each instrument in a worker of its own, spread over the audio cores.`,measured:`Raspberry Pi 5 (4 GB) with ZynthianOS Vangelis, 48 kHz, 256 frames, October 2026; Surge XT 1.4.0, plugin-hostd 0.13.1 with omx-clap-host 0.23.2, and jalv.`,topic:`zynthian`,toc:[{id:`why-voices-need-cores`,title:`Why voices need cores`},{id:`what-a-clap-host-can-do-about-it`,title:`What a CLAP host can do about it`},{id:`what-surge-xt-does-with-it`,title:`What Surge XT does with it`},{id:`what-was-proven`,title:`What was proven`},{id:`the-numbers`,title:`The numbers`},{id:`other-instruments`,title:`Other instruments`},{id:`what-was-missing-at-the-time`,title:`What was missing at the time`},{id:`what-was-not-shown`,title:`What was not shown`}],html:`<h2 id="why-voices-need-cores">Why voices need cores</h2>
<p>A Zynthian is played. When a pad patch holds 16 notes, each with its own oscillators, filters and envelopes, every voice is
computed in every audio block, and the block has a deadline: 5.3 ms at 48 kHz and 256 frames. A Pi 5 has four cores. If one
instrument computes all its voices on one core, that core sets the polyphony the Pi can play before the first xrun,
however idle the other three are.</p>
<h2 id="what-a-clap-host-can-do-about-it">What a CLAP host can do about it</h2>
<p>CLAP's thread-pool extension (<code>clap.thread-pool</code>) lets a plugin split its block into tasks (one per voice, or per group of
voices) and ask the host to run them (<code>request_exec</code>). The host decides where they run. omx-clap-core spreads them over
real-time helper threads, one per core the worker may use, each pinned to its core and parked between cycles; the tasks are
handed out by one atomic counter, the audio thread takes its share, and the call returns when the last task is done, with
no allocation, lock or system call on that path (see the <a href="/projects/omx-clap-core/thread-pool">thread pool reference</a>).</p>
<p>The pool is not a global switch. It is given per plugin, by its qualification: a plugin that is real-time safe and asks for
the pool gets helper threads; a plugin with real-time violations is hosted isolated, in a worker of its own, on the serial
path. A task that allocates or locks on a helper thread would stall the other cores' deadline too, so the measurement that
admits a plugin to a shared worker is the same one that admits it to the pool.</p>
<h2 id="what-surge-xt-does-with-it">What Surge XT does with it</h2>
<p>Nothing. Surge XT 1.4.0 does not offer <code>clap.thread-pool</code> and its source never calls <code>request_exec</code>; none of the 489
plugin descriptors on the device names the thread pool either. So on the Pi, Surge XT's voices run on one core whatever the
host does: one host thread from 3 % of a core at one voice to 39 % at 64 voices.</p>
<p>What does use the cores for instruments is separate workers. plugin-hostd runs each instrument (or each chain) in a worker
process of its own, and JACK runs independent clients in parallel. Four Surge XT instances in four workers, each holding 16
notes, ran on the four cores at 14 to 15 % each, 64 voices in all, at a JACK DSP load of 17.6 %; one instance playing 64
voices loaded JACK at 39.7 %. The <code>placement</code> setting makes the spreading the host's decision: workers across the audio
cores, the daemon kept off them.</p>
<p>The cost of placement is one process per instrument; what it buys is the other three cores for three more instruments.</p>
<h2 id="what-was-proven">What was proven</h2>
<p>Surge XT as CLAP, played by plugin-hostd, and as LV2 by jalv, the way Zynthian's stock path plays it. An instrument probe
sends a scripted MIDI scenario into the instrument's note input and measures its outputs window by window: peak and RMS
level, pitch, brightness and JACK xruns. No window of any run had an xrun.</p>
<table>
<thead>
<tr>
<th>proof</th>
<th>plugin-hostd, Surge XT CLAP</th>
<th>jalv, Surge XT LV2</th>
</tr>
</thead>
<tbody>
<tr>
<td>it plays</td>
<td>C4 at 261.4 Hz, -13.5 dBFS peak</td>
<td>the same</td>
</tr>
<tr>
<td>velocity</td>
<td>with velocity sensitivity on, velocity 20, 64 and 127 give -53.9, -37.3 and -13.5 dBFS</td>
<td>not set (jalv cannot set the parameter at start)</td>
</tr>
<tr>
<td>polyphony</td>
<td>1, 8, 16, 32, 48 and 64 notes held, all sounding (limit raised to 64)</td>
<td>1 to 32 at the default limit</td>
</tr>
<tr>
<td>voice stealing</td>
<td>default limit 16: 32 notes cost what 16 do</td>
<td>the same</td>
</tr>
<tr>
<td>pitch bend</td>
<td>A4 440.0 Hz, full up 494.0 Hz, full down 392.0 Hz, back to 440.0 Hz</td>
<td>440.0, 494.0, 392.0, 441.0 Hz</td>
</tr>
<tr>
<td>sustain (CC 64)</td>
<td>released: silent; released under the pedal: -13.5 dBFS; pedal up: silent</td>
<td>the same</td>
</tr>
<tr>
<td>all notes off</td>
<td>8 notes, CC 123: silent 1.5 s later; the <code>all_notes_off</code> verb: silent</td>
<td>CC 123: silent</td>
</tr>
<tr>
<td>mod wheel (CC 1)</td>
<td>a patch routing the wheel to the filter: brightness 0.029 at 0, 0.300 at 127, 0.025 back at 0</td>
<td>0.033, 0.300, 0.025</td>
</tr>
<tr>
<td>MPE</td>
<td>zone set by the MPE configuration message; a note on member channel 2 at 440 Hz; a full bend on another channel leaves it; a quarter-range bend on its own channel: 880 Hz (the 48-semitone range)</td>
<td>440, 440, 880 Hz</td>
</tr>
<tr>
<td>native window</td>
<td>Surge XT's own window maps on the Pi's display in 664 ms on request</td>
<td></td>
</tr>
</tbody>
</table>
<h2 id="the-numbers">The numbers</h2>
<p>CPU of the host thread that runs Surge XT (percent of one core over a 4 s window, ±1 to 2 %), JACK's DSP load, notes held:</p>
<table>
<thead>
<tr>
<th>notes</th>
<th>plugin-hostd, limit 16 (default)</th>
<th>plugin-hostd, limit 64</th>
<th>jalv, limit 16 (default)</th>
</tr>
</thead>
<tbody>
<tr>
<td>1</td>
<td>3 %, DSP 3.7</td>
<td>2 %, DSP 3.5</td>
<td>3 %, DSP 3.6</td>
</tr>
<tr>
<td>8</td>
<td>6 %, DSP 7.0</td>
<td>6 %, DSP 7.0</td>
<td>6 %, DSP 6.7</td>
</tr>
<tr>
<td>16</td>
<td>10 %, DSP 11.3</td>
<td>10 %, DSP 11.3</td>
<td>9 %, DSP 10.4</td>
</tr>
<tr>
<td>32</td>
<td>10 %, DSP 11.3</td>
<td>19 %, DSP 20.2</td>
<td>9 %, DSP 10.5</td>
</tr>
<tr>
<td>48</td>
<td></td>
<td>29 %, DSP 29.7</td>
<td></td>
</tr>
<tr>
<td>64</td>
<td></td>
<td>39 %, DSP 39.7</td>
<td></td>
</tr>
<tr>
<td>4 instances × 16</td>
<td>14 to 15 % on each of the four cores, DSP 17.6</td>
<td></td>
<td></td>
</tr>
</tbody>
</table>
<p>The same instrument costs the same in both hosts, within a point at every note count. From the request to the instrument's
ports in JACK, plugin-hostd answered <code>add</code> in 580 to 585 ms over five runs; jalv's ports appeared 1.85 and 1.98 s after it
was started.</p>
<p>Qualification rated Surge XT isolated for both host profiles, on real-time safety: 410 966 allocations and 115 032 locks on
the audio thread over the parameter sweep, 18 884 and 98 304 under notes. Isolated is a way of hosting, not a refusal:
Surge XT runs, in a worker of its own, and is never grouped with real-time safe plugins. Its cost at 512 frames is a median
of about 2.1 µs per sample at every rate (about 10 % of a core at 48 kHz), with a 95th percentile of 27 to 37 µs per sample
in the note-on blocks.</p>
<h2 id="other-instruments">Other instruments</h2>
<p>At 48 kHz and 256 frames, read digitally at JACK ports. FluidSynth and Pianoteq run on their own, with their own threads:</p>
<table>
<thead>
<tr>
<th>instrument</th>
<th>busy threads</th>
<th>JACK DSP %</th>
<th>xruns per window</th>
</tr>
</thead>
<tbody>
<tr>
<td>Surge XT, one instance, 64 voices, through plugin-hostd</td>
<td>1</td>
<td>27.5</td>
<td>0</td>
</tr>
<tr>
<td>Surge XT, four instances, 16 voices each, through plugin-hostd</td>
<td>4, one per worker</td>
<td>18.8</td>
<td>0</td>
</tr>
<tr>
<td>FluidSynth, 1200 voices, <code>cpu-cores=1</code></td>
<td>1</td>
<td>68</td>
<td>0 to 1</td>
</tr>
<tr>
<td>FluidSynth, 1200 voices, <code>cpu-cores=2</code></td>
<td>2</td>
<td>36</td>
<td>0</td>
</tr>
<tr>
<td>FluidSynth, 1200 voices, <code>cpu-cores=4</code></td>
<td>4</td>
<td>19</td>
<td>0</td>
</tr>
<tr>
<td>Pianoteq 9.2.1 trial, 64 notes, <code>multicore=4</code></td>
<td>4</td>
<td>44 to 49</td>
<td>0 to 1</td>
</tr>
</tbody>
</table>
<h2 id="what-was-missing-at-the-time">What was missing at the time</h2>
<p>Measured with plugin-hostd 0.13.1 and omx-clap-host 0.23.2:</p>
<ul>
<li>Surge XT's own file names hold a space (<code>Surge XT.clap</code>, and a percent-encoded LV2 binary), which the host did not
accept: every proof above used a link without the space.</li>
<li>Presets: the CLAP path listed no factory presets, and a preset file whose path holds a space was not loaded.</li>
<li>The engine paged through all 775 parameters; Surge's five remote-control pages were read by the host and not shown.</li>
<li>No CLAP extension carries Surge's modulation matrix; its own window does.</li>
</ul>
<h2 id="what-was-not-shown">What was not shown</h2>
<p>The first xrun (no run reached it: 64 voices on one instance took 39 % of a core); the effect of the thread pool, which Surge
XT does not use; parameter modulation events, tuning and state context; anything at another rate or block size than 48 kHz
and 256 frames.</p>
`},t=JSON.parse(`{"slug":"instruments-on-a-pi-5","order":90,"title":"\\"Instruments en una Pi 5: les veus de Surge XT als nuclis\\"","summary":"Un instrument que calcula totes les veus en un sol nucli fixa la polifonia que pot tocar una Pi 5, per desocupats que estiguin els altres nuclis. Surge XT no divideix les veus en tasques, de manera que els nuclis que pot aprofitar venen de fer córrer cada instrument en un worker propi, repartits pels nuclis d'àudio.","measured":"Raspberry Pi 5 (4 GB) amb ZynthianOS Vangelis, 48 kHz, 256 mostres, octubre del 2026; Surge XT 1.4.0, plugin-hostd 0.13.1 amb omx-clap-host 0.23.2 i jalv.","topic":"zynthian","toc":[{"id":"per-que-les-veus-necessiten-nuclis","title":"Per què les veus necessiten nuclis"},{"id":"que-hi-pot-fer-un-amfitrio-clap","title":"Què hi pot fer un amfitrió CLAP"},{"id":"que-hi-fa-surge-xt","title":"Què hi fa Surge XT"},{"id":"que-s-ha-demostrat","title":"Què s'ha demostrat"},{"id":"les-xifres","title":"Les xifres"},{"id":"altres-instruments","title":"Altres instruments"},{"id":"el-que-faltava-en-aquell-moment","title":"El que faltava en aquell moment"},{"id":"el-que-no-s-ha-mostrat","title":"El que no s'ha mostrat"}],"html":"<h2 id=\\"per-que-les-veus-necessiten-nuclis\\">Per què les veus necessiten nuclis</h2>\\n<p>Un Zynthian es toca. Quan un so de pad manté 16 notes, cadascuna amb els seus oscil·ladors, filtres i envolupants, cada veu\\nes calcula a cada bloc d'àudio i el bloc té un termini: 5,3 ms a 48 kHz i 256 mostres. Una Pi 5 té quatre nuclis. Si un\\ninstrument calcula totes les veus en un sol nucli, aquell nucli fixa la polifonia que la Pi pot tocar abans del primer xrun,\\nper desocupats que estiguin els altres tres.</p>\\n<h2 id=\\"que-hi-pot-fer-un-amfitrio-clap\\">Què hi pot fer un amfitrió CLAP</h2>\\n<p>L'extensió de grup de fils de CLAP (<code>clap.thread-pool</code>) permet a un plugin dividir el seu bloc en tasques (una per veu o\\nper grup de veus) i demanar a l'amfitrió que les faci córrer (<code>request_exec</code>). L'amfitrió decideix on corren. omx-clap-core\\nles reparteix entre fils auxiliars de temps real, un per cada nucli que pot fer servir el worker, cadascun fixat al seu\\nnucli i aturat entre cicles; les tasques es reparteixen amb un sol índex atòmic que cada fil incrementa, el fil d'àudio en fa la seva part i\\nla crida torna quan s'acaba l'última tasca, sense cap reserva de memòria, bloqueig ni crida al sistema en aquest camí\\n(vegeu la <a href=\\"/projects/omx-clap-core/thread-pool\\">referència del grup de fils</a>).</p>\\n<p>El grup de fils no és un interruptor global. Es dona plugin a plugin, segons la seva qualificació: un plugin segur en temps\\nreal que demana el grup rep fils auxiliars; un plugin amb violacions de temps real s'allotja aïllat, en un worker propi,\\npel camí en sèrie. Una tasca que reserva memòria o es bloqueja en un fil auxiliar també endarreriria el termini dels altres\\nnuclis i per això la mesura que admet un plugin en un worker compartit és la mateixa que l'admet al grup de fils.</p>\\n<h2 id=\\"que-hi-fa-surge-xt\\">Què hi fa Surge XT</h2>\\n<p>Res. Surge XT 1.4.0 no ofereix <code>clap.thread-pool</code> i el seu codi no crida mai <code>request_exec</code>; cap dels 489 descriptors de\\nplugin de l'aparell no esmenta tampoc el grup de fils. Per tant, a la Pi, les veus de Surge XT corren en un sol nucli faci\\nel que faci l'amfitrió: un fil de l'amfitrió que va del 3 % d'un nucli amb una veu al 39 % amb 64 veus.</p>\\n<p>El que fa servir els nuclis per als instruments són workers separats. plugin-hostd fa córrer cada instrument (o cada cadena)\\nen un procés worker propi i JACK fa córrer en paral·lel els clients independents. Quatre instàncies de Surge XT en quatre\\nworkers, cadascuna amb 16 notes, van córrer als quatre nuclis entre el 14 i el 15 % cadascuna, 64 veus en total, amb una\\ncàrrega DSP de JACK del 17,6 %; una sola instància tocant 64 veus carregava JACK al 39,7 %. El paràmetre <code>placement</code> fa\\nque el repartiment sigui una decisió de l'amfitrió: workers repartits pels nuclis d'àudio, amb el dimoni fora d'aquests\\nnuclis.</p>\\n<p>El preu del repartiment és un procés per instrument; el que en treus són els altres tres nuclis per a tres instruments més.</p>\\n<h2 id=\\"que-s-ha-demostrat\\">Què s'ha demostrat</h2>\\n<p>Surge XT com a CLAP, tocat per plugin-hostd i com a LV2 per jalv, com el toca el camí de sèrie de Zynthian. Una sonda\\nd'instrument envia un escenari MIDI preparat a l'entrada de notes de l'instrument i en mesura les sortides finestra a\\nfinestra: nivell de pic i RMS, to, brillantor i xruns de JACK. Cap finestra de cap execució no va tenir cap xrun.</p>\\n<table>\\n<thead>\\n<tr>\\n<th>prova</th>\\n<th>plugin-hostd, Surge XT CLAP</th>\\n<th>jalv, Surge XT LV2</th>\\n</tr>\\n</thead>\\n<tbody>\\n<tr>\\n<td>sona</td>\\n<td>C4 a 261,4 Hz, pic de -13,5 dBFS</td>\\n<td>el mateix</td>\\n</tr>\\n<tr>\\n<td>velocitat</td>\\n<td>amb la sensibilitat a la velocitat activada, les velocitats 20, 64 i 127 donen -53,9, -37,3 i -13,5 dBFS</td>\\n<td>no s'ha configurat (jalv no pot fixar el paràmetre en arrencar)</td>\\n</tr>\\n<tr>\\n<td>polifonia</td>\\n<td>1, 8, 16, 32, 48 i 64 notes premudes, totes sonant (límit pujat a 64)</td>\\n<td>d'1 a 32 amb el límit per defecte</td>\\n</tr>\\n<tr>\\n<td>robatori de veus</td>\\n<td>límit per defecte de 16: 32 notes costen el mateix que 16</td>\\n<td>el mateix</td>\\n</tr>\\n<tr>\\n<td>inflexió de to</td>\\n<td>A4 440,0 Hz, a dalt del tot 494,0 Hz, a baix del tot 392,0 Hz, de tornada a 440,0 Hz</td>\\n<td>440,0, 494,0, 392,0, 441,0 Hz</td>\\n</tr>\\n<tr>\\n<td>sosteniment (CC 64)</td>\\n<td>deixada anar: silenci; deixada anar amb el pedal: -13,5 dBFS; pedal amunt: silenci</td>\\n<td>el mateix</td>\\n</tr>\\n<tr>\\n<td>totes les notes fora</td>\\n<td>8 notes, CC 123: silenci 1,5 s després; el verb <code>all_notes_off</code>: silenci</td>\\n<td>CC 123: silenci</td>\\n</tr>\\n<tr>\\n<td>roda de modulació (CC 1)</td>\\n<td>un so que porta la roda al filtre: brillantor 0,029 a 0, 0,300 a 127, 0,025 de tornada a 0</td>\\n<td>0,033, 0,300, 0,025</td>\\n</tr>\\n<tr>\\n<td>MPE</td>\\n<td>zona definida pel missatge de configuració MPE; una nota al canal membre 2 a 440 Hz; una inflexió completa en un altre canal no la mou; una inflexió d'un quart del rang al seu canal: 880 Hz (el rang de 48 semitons)</td>\\n<td>440, 440, 880 Hz</td>\\n</tr>\\n<tr>\\n<td>finestra pròpia</td>\\n<td>la finestra de Surge XT apareix a la pantalla de la Pi en 664 ms, quan es demana</td>\\n<td></td>\\n</tr>\\n</tbody>\\n</table>\\n<h2 id=\\"les-xifres\\">Les xifres</h2>\\n<p>CPU del fil de l'amfitrió que fa córrer Surge XT (percentatge d'un nucli en una finestra de 4 s, ±1 a 2 %), càrrega DSP de\\nJACK, notes premudes:</p>\\n<table>\\n<thead>\\n<tr>\\n<th>notes</th>\\n<th>plugin-hostd, límit 16 (per defecte)</th>\\n<th>plugin-hostd, límit 64</th>\\n<th>jalv, límit 16 (per defecte)</th>\\n</tr>\\n</thead>\\n<tbody>\\n<tr>\\n<td>1</td>\\n<td>3 %, DSP 3,7</td>\\n<td>2 %, DSP 3,5</td>\\n<td>3 %, DSP 3,6</td>\\n</tr>\\n<tr>\\n<td>8</td>\\n<td>6 %, DSP 7,0</td>\\n<td>6 %, DSP 7,0</td>\\n<td>6 %, DSP 6,7</td>\\n</tr>\\n<tr>\\n<td>16</td>\\n<td>10 %, DSP 11,3</td>\\n<td>10 %, DSP 11,3</td>\\n<td>9 %, DSP 10,4</td>\\n</tr>\\n<tr>\\n<td>32</td>\\n<td>10 %, DSP 11,3</td>\\n<td>19 %, DSP 20,2</td>\\n<td>9 %, DSP 10,5</td>\\n</tr>\\n<tr>\\n<td>48</td>\\n<td></td>\\n<td>29 %, DSP 29,7</td>\\n<td></td>\\n</tr>\\n<tr>\\n<td>64</td>\\n<td></td>\\n<td>39 %, DSP 39,7</td>\\n<td></td>\\n</tr>\\n<tr>\\n<td>4 instàncies × 16</td>\\n<td>del 14 al 15 % a cadascun dels quatre nuclis, DSP 17,6</td>\\n<td></td>\\n<td></td>\\n</tr>\\n</tbody>\\n</table>\\n<p>El mateix instrument costa el mateix als dos amfitrions, amb menys d'un punt de diferència a cada nombre de notes. De la\\npetició als ports de l'instrument a JACK, plugin-hostd va respondre <code>add</code> en 580 a 585 ms en cinc execucions; els ports de\\njalv van aparèixer 1,85 i 1,98 s després d'engegar-lo.</p>\\n<p>La qualificació va classificar Surge XT com a aïllat per als dos perfils d'amfitrió, per la seguretat en temps real: 410 966\\nreserves de memòria i 115 032 bloquejos al fil d'àudio durant l'escombratge de paràmetres, 18 884 i 98 304 amb notes. Aïllat\\nés una manera d'allotjar, no un refús: Surge XT corre, en un worker propi i no s'agrupa mai amb plugins segurs en temps\\nreal. El seu cost a 512 mostres té una mediana d'uns 2,1 µs per mostra a totes les freqüències (prop del 10 % d'un nucli a\\n48 kHz), amb un percentil 95 de 27 a 37 µs per mostra als blocs on comencen notes.</p>\\n<h2 id=\\"altres-instruments\\">Altres instruments</h2>\\n<p>A 48 kHz i 256 mostres, llegit digitalment als ports de JACK. FluidSynth i Pianoteq corren pel seu compte, amb els seus fils:</p>\\n<table>\\n<thead>\\n<tr>\\n<th>instrument</th>\\n<th>fils ocupats</th>\\n<th>DSP de JACK %</th>\\n<th>xruns per finestra</th>\\n</tr>\\n</thead>\\n<tbody>\\n<tr>\\n<td>Surge XT, una instància, 64 veus, a través de plugin-hostd</td>\\n<td>1</td>\\n<td>27,5</td>\\n<td>0</td>\\n</tr>\\n<tr>\\n<td>Surge XT, quatre instàncies, 16 veus cadascuna, a través de plugin-hostd</td>\\n<td>4, un per worker</td>\\n<td>18,8</td>\\n<td>0</td>\\n</tr>\\n<tr>\\n<td>FluidSynth, 1200 veus, <code>cpu-cores=1</code></td>\\n<td>1</td>\\n<td>68</td>\\n<td>de 0 a 1</td>\\n</tr>\\n<tr>\\n<td>FluidSynth, 1200 veus, <code>cpu-cores=2</code></td>\\n<td>2</td>\\n<td>36</td>\\n<td>0</td>\\n</tr>\\n<tr>\\n<td>FluidSynth, 1200 veus, <code>cpu-cores=4</code></td>\\n<td>4</td>\\n<td>19</td>\\n<td>0</td>\\n</tr>\\n<tr>\\n<td>Pianoteq 9.2.1 de prova, 64 notes, <code>multicore=4</code></td>\\n<td>4</td>\\n<td>de 44 a 49</td>\\n<td>de 0 a 1</td>\\n</tr>\\n</tbody>\\n</table>\\n<h2 id=\\"el-que-faltava-en-aquell-moment\\">El que faltava en aquell moment</h2>\\n<p>Mesurat amb plugin-hostd 0.13.1 i omx-clap-host 0.23.2:</p>\\n<ul>\\n<li>Els noms de fitxer de Surge XT contenen un espai (<code>Surge XT.clap</code> i un binari LV2 codificat amb percentatges), que\\nl'amfitrió no acceptava: totes les proves d'abans van fer servir un enllaç sense l'espai.</li>\\n<li>Presets: el camí CLAP no llistava cap preset de fàbrica i un fitxer de preset amb un espai al camí no es carregava.</li>\\n<li>El motor passava pels 775 paràmetres; l'amfitrió llegia les cinc pàgines de control remot de Surge però no es mostraven.</li>\\n<li>Cap extensió CLAP no porta la matriu de modulació de Surge; la seva finestra pròpia sí.</li>\\n</ul>\\n<h2 id=\\"el-que-no-s-ha-mostrat\\">El que no s'ha mostrat</h2>\\n<p>El primer xrun (cap execució no hi va arribar: 64 veus en una instància van prendre el 39 % d'un nucli); l'efecte del grup\\nde fils, que Surge XT no fa servir; els esdeveniments de modulació de paràmetres, l'afinació i el context d'estat; res a\\ncap altra freqüència o mida de bloc que no sigui 48 kHz i 256 mostres.</p>\\n"}`),n={en:e,ca:t};export{t as ca,n as default,e as en};