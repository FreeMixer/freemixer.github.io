var e={slug:`how-a-plugins-memory-is-judged`,order:10,title:`How a plugin's memory is judged`,summary:`A plugin's memory is measured per instance, watched for growth, bounded by a hard limit and judged against each host's budget, so that no plugin is qualified as good on a host it would hurt.`,measured:`plugin-qualify, October 2026. The Raspberry Pi budgets are provisional until read on a Pi.`,topic:`qualify`,toc:[{id:`footprint-per-instance`,title:`Footprint per instance`},{id:`growth-over-time`,title:`Growth over time`},{id:`a-hard-limit`,title:`A hard limit`},{id:`a-verdict-per-host-profile`,title:`A verdict per host profile`},{id:`what-is-not-measured-yet`,title:`What is not measured yet`}],html:`<p>A plugin's memory is judged, never merely recorded: a plugin must not be qualified as good on a host it would hurt,
a Raspberry Pi included. Four pieces do it: a footprint per instance, a check for growth over time, a hard limit, and a
verdict per host profile.</p>
<h2 id="footprint-per-instance">Footprint per instance</h2>
<p>Beside the cost of each rate, the record carries how far the resident set grew, in KB: after instantiate, after
activate, at rest after processing, and with notes held for an instrument (at the same count as the cost), and what a
second instance added.</p>
<p>Each rate's footprint is taken by a child process forked before any instance exists, so no earlier instance has grown
the process, and a plugin that dies there costs that rate its figure and nothing else. For CLAP, what loading the
<code>.clap</code> took is added to the first instance; an LV2 plugin is loaded by its first instantiate. A figure not taken is
absent, never 0, and the record says why.</p>
<p>Two figures come out of it, written beside the raw ones so that a client adds up the same numbers the verdict read:</p>
<ul>
<li><code>firstInstanceKb</code>: the most one instance held at any step, with everything its instances share.</li>
<li><code>perInstanceKb</code>: what one more instance costs: the second instance's own part, plus the voices (notes held less at
rest). With no second instance measured nothing separates what is shared, so it is the whole of the first.</li>
</ul>
<p>The second instance is measured to the end of its first blocks, not only to instantiate: a plugin that allocates at
activate would otherwise read as free.</p>
<p>The child does not inherit the probe's memory lock. A footprint read under the lock would count every page the plugin
mapped, not what it touched.</p>
<h2 id="growth-over-time">Growth over time</h2>
<p>A rate whose memory keeps climbing past a ceiling fails its soak with the reason <code>leaks</code>. The prober reads the resident
set after a warm-up and again halfway from there to the end; the growth is worked out from the halfway reading to the
highest, per minute of audio. Measuring only the second half is what tells a library that finished loading late from a
leak.</p>
<p>The ceiling is 10 MB per minute. It ships provisional, is tightened from measurements, and the verdict's reason says
<code>provisional</code>.</p>
<h2 id="a-hard-limit">A hard limit</h2>
<p>Two limits, each with its own job:</p>
<ul>
<li><strong>plugin-hostd enforces <code>memory.max</code></strong> (cgroup v2) on the supervised probe child. The kernel counts what the plugin
really holds and kills its tree at the limit; the outcome is <code>probe.memory-limit</code>, read from <code>memory.events</code>. A machine
with no delegated controller falls back to <code>RLIMIT_DATA</code> and says so in the record.</li>
<li><strong>plugin-qualify enforces <code>RLIMIT_AS</code></strong> on the processes it starts itself. It is set to all the machine's RAM: the far
bound of a run rather than its budget, since address space is what a plugin reserves, not what it touches. It is off
for a sanitizer build, which reserves far more than it uses. The first refused allocation ends the child with the
outcome <code>memory-limit-exceeded</code>.</li>
</ul>
<p>Either way the cell carries its outcome and the limit, the record is written, and the other cells are judged. A host
whose own cell hit the limit is <code>unknown</code> there, in the memory dimension.</p>
<h2 id="a-verdict-per-host-profile">A verdict per host profile</h2>
<p>A host profile's budget holds a per-instance share and a whole-console figure. A profile with no budget declared reads
nothing here, which is not a budget of 0: <code>jalv</code>, <code>mod-host</code> and <code>omx-clap-host</code> are general hosts on no particular
machine. Memory is a dimension of the verdict with its own codes (<code>hosting.memory.*</code>) and can decide on its own.</p>
<p><code>perInstanceKb</code> is read against the instance's share and <code>firstInstanceKb</code> against the whole console's, so a sampler with
a large shared library can fit a small host once and is still read correctly for two. Per cell, the worst standing wins:</p>
<table>
<thead>
<tr>
<th>what was read</th>
<th>rating</th>
<th>code</th>
</tr>
</thead>
<tbody>
<tr>
<td>a figure above a ceiling</td>
<td><code>unsuitable</code></td>
<td><code>hosting.memory.above-ceiling</code> (with <code>provisional</code> when the ceiling is)</td>
</tr>
<tr>
<td>no figure, or a reason beside the figures</td>
<td><code>unknown</code></td>
<td><code>hosting.memory.unmeasured</code></td>
</tr>
<tr>
<td>under a measured budget</td>
<td><code>suitable</code></td>
<td><code>hosting.memory.within-ceiling</code></td>
</tr>
<tr>
<td>under a provisional budget</td>
<td><code>conditional</code></td>
<td><code>hosting.memory.within-provisional-ceiling</code></td>
</tr>
</tbody>
</table>
<p>A plugin under a provisional budget is therefore not qualified there: the figure and the ceiling are stated, and the
verdict does not say the plugin fits. Only a measured budget does that.</p>
<p><strong>The console</strong> profile is sized for a 30 GiB machine: 16 GiB for the plugins of a console, the rest for the engine and
the system, and 4 GiB for one instance, which is also what the probe bounds a run by.</p>
<p><strong>A Raspberry Pi</strong>: the 4 GB and 8 GB profiles have the shape of <code>omx-clap-host</code>, which is what runs a plugin on a Pi. Their
cells are what Zynthian sets a Pi to: 48000 Hz and 128 frames on a Pi 5 with the V5 kit, 256 frames on a Pi 4 and the
other kits. Wider sweeps (44.1 to 192 kHz, 128 to 1024 frames) are benchmark cells for comparing hosts, and no plugin is
judged at them. The budget is all the board's RAM but 1 GiB for the system and Zynthian's interface, and an instance's
share an eighth of that: 3 GiB and 384 MiB on 4 GB, 7 GiB and 896 MiB on 8 GB. These are provisional until read on a Pi.</p>
<p>Since a missing figure reads as <code>unknown</code>, a console that upgrades reads every plugin as <code>unknown</code> until it has been
measured again. That is the rule at work: nothing says the old figures still fit.</p>
<h2 id="what-is-not-measured-yet">What is not measured yet</h2>
<p>A CLAP plugin's growth over time: the CLAP prober has no continuous render yet, so <code>leaks</code> applies to LV2 plugins only and a
CLAP plugin reads <code>unsoaked</code>. The footprint itself is measured for both formats.</p>
`},t={slug:`how-a-plugins-memory-is-judged`,order:10,title:`Com es jutja la memòria d'un plugin`,summary:`La memòria d'un plugin es mesura per instància, es vigila si creix, es limita amb un límit dur i es jutja contra el pressupost de cada amfitrió, perquè cap plugin no es qualifiqui de bo en un amfitrió al qual faria mal.`,measured:`plugin-qualify, octubre del 2026. Els pressupostos de la Raspberry Pi són provisionals fins que es llegeixin en una Pi.`,topic:`qualify`,toc:[{id:`petjada-per-instancia`,title:`Petjada per instància`},{id:`creixement-en-el-temps`,title:`Creixement en el temps`},{id:`un-limit-dur`,title:`Un límit dur`},{id:`un-veredicte-per-perfil-d-amfitrio`,title:`Un veredicte per perfil d'amfitrió`},{id:`el-que-encara-no-es-mesura`,title:`El que encara no es mesura`}],html:`<p>La memòria d'un plugin es jutja, no només s'enregistra: un plugin no s'ha de qualificar de bo en un amfitrió al
qual faria mal i una Raspberry Pi també ho és. Ho fan quatre peces: una petjada per instància, una comprovació del
creixement en el temps, un límit dur i un veredicte per perfil d'amfitrió.</p>
<h2 id="petjada-per-instancia">Petjada per instància</h2>
<p>Al costat del cost de cada freqüència, el registre diu quant ha crescut la memòria resident, en KB: després
d'instanciar, després d'activar, en repòs després de processar i, per a un instrument, amb notes premudes (al mateix
nombre que el cost) i què hi ha afegit una segona instància.</p>
<p>La petjada de cada freqüència la pren un procés fill creat abans que existeixi cap instància, de manera que cap
instància anterior no ha fet créixer el procés i un plugin que hi mor només fa perdre la xifra d'aquella freqüència.
En CLAP, el que ha costat carregar el <code>.clap</code> se suma a la primera instància; un plugin LV2 es carrega amb la primera
instanciació. Una xifra que no s'ha pres no hi és, mai no val 0 i el registre en diu el motiu.</p>
<p>En surten dues xifres, escrites al costat de les brutes perquè un client sumi els mateixos nombres que ha llegit el
veredicte:</p>
<ul>
<li><code>firstInstanceKb</code>: el màxim que ha ocupat una instància en qualsevol pas, amb tot el que comparteixen les seves
instàncies.</li>
<li><code>perInstanceKb</code>: el que costa una instància més: la part pròpia de la segona instància, més les veus (notes premudes
menys repòs). Sense una segona instància mesurada no hi ha res que separi el que es comparteix i és tota la primera.</li>
</ul>
<p>La segona instància es mesura fins al final dels seus primers blocs, no només fins a instanciar-la: altrament, un
plugin que reserva memòria en activar-se semblaria gratuït.</p>
<p>El fill no hereta el bloqueig de memòria de la sonda. Una petjada llegida amb el bloqueig comptaria cada pàgina que el
plugin ha mapat, no les que ha tocat.</p>
<h2 id="creixement-en-el-temps">Creixement en el temps</h2>
<p>Una freqüència la memòria de la qual continua pujant per sobre d'un sostre no supera la prova de durada, amb el motiu
<code>leaks</code>. La sonda llegeix la memòria resident després d'un escalfament i un altre cop a mig camí fins al final; el
creixement es calcula de la lectura del mig a la més alta, per minut d'àudio. Mesurar només la segona meitat és el que
distingeix una biblioteca que ha acabat de carregar tard d'una fuita.</p>
<p>El sostre és de 10 MB per minut. És provisional, s'ajusta a partir de mesures i el motiu del veredicte diu
<code>provisional</code>.</p>
<h2 id="un-limit-dur">Un límit dur</h2>
<p>Dos límits, cadascun amb la seva feina:</p>
<ul>
<li><strong>plugin-hostd aplica <code>memory.max</code></strong> (cgroup v2) al fill de la sonda que supervisa. El nucli compta el que el plugin
ocupa de debò i en mata l'arbre al límit; el resultat és <code>probe.memory-limit</code>, llegit de <code>memory.events</code>. Una màquina
sense el controlador delegat recorre a <code>RLIMIT_DATA</code> i ho diu al registre.</li>
<li><strong>plugin-qualify aplica <code>RLIMIT_AS</code></strong> als processos que engega ell mateix. Val tota la memòria de la màquina: la fita
llunyana d'una execució més que no pas el seu pressupost, perquè l'espai d'adreces és el que un plugin reserva, no
el que toca. No s'aplica en una compilació amb sanititzadors, que reserva molt més del que fa servir. La primera
reserva refusada acaba el fill amb el resultat <code>memory-limit-exceeded</code>.</li>
</ul>
<p>En tots dos casos la cel·la porta el seu resultat i el límit, el registre s'escriu i les altres cel·les es jutgen. Un
amfitrió la cel·la del qual ha tocat el límit hi és <code>unknown</code>, en la dimensió de memòria.</p>
<h2 id="un-veredicte-per-perfil-d-amfitrio">Un veredicte per perfil d'amfitrió</h2>
<p>El pressupost d'un perfil d'amfitrió té una part per instància i una xifra per a tota la consola. Un perfil sense
pressupost no hi llegeix res, que no vol dir un pressupost de 0: <code>jalv</code>, <code>mod-host</code> i <code>omx-clap-host</code> són amfitrions
generals que no corresponen a cap màquina concreta. La memòria és una dimensió del veredicte amb els seus propis codis
(<code>hosting.memory.*</code>) i pot decidir tota sola.</p>
<p><code>perInstanceKb</code> es llegeix contra la part d'una instància i <code>firstInstanceKb</code> contra la de tota la consola, de manera que
un mostrejador amb una biblioteca compartida gran pot cabre una vegada en un amfitrió petit i es llegeix bé per a dues.
Per cel·la, mana la pitjor situació:</p>
<table>
<thead>
<tr>
<th>què s'ha llegit</th>
<th>qualificació</th>
<th>codi</th>
</tr>
</thead>
<tbody>
<tr>
<td>una xifra per sobre d'un sostre</td>
<td><code>unsuitable</code></td>
<td><code>hosting.memory.above-ceiling</code> (amb <code>provisional</code> quan el sostre ho és)</td>
</tr>
<tr>
<td>cap xifra o un motiu al costat de les xifres</td>
<td><code>unknown</code></td>
<td><code>hosting.memory.unmeasured</code></td>
</tr>
<tr>
<td>dins d'un pressupost mesurat</td>
<td><code>suitable</code></td>
<td><code>hosting.memory.within-ceiling</code></td>
</tr>
<tr>
<td>dins d'un pressupost provisional</td>
<td><code>conditional</code></td>
<td><code>hosting.memory.within-provisional-ceiling</code></td>
</tr>
</tbody>
</table>
<p>Un plugin dins d'un pressupost provisional, doncs, no hi queda qualificat: es diuen la xifra i el sostre i el
veredicte no diu que el plugin hi cap. Només ho fa un pressupost mesurat.</p>
<p><strong>El perfil de consola</strong> és per a una màquina de 30 GiB: 16 GiB per als plugins d'una consola, la resta per al motor i
el sistema i 4 GiB per a una instància, que és també la fita amb què la sonda limita una execució.</p>
<p><strong>Una Raspberry Pi</strong>: els perfils de 4 GB i 8 GB tenen la forma d'<code>omx-clap-host</code>, que és el que fa córrer un plugin en
una Pi. Les seves cel·les són les que Zynthian configura en una Pi: 48000 Hz i 128 mostres en una Pi 5 amb el kit V5, 256
mostres en una Pi 4 i els altres kits. Els escombratges més amplis (de 44,1 a 192 kHz, de 128 a 1024 mostres) són cel·les
de banc de proves per comparar amfitrions i cap plugin no s'hi jutja. El pressupost és tota la memòria de la placa
menys 1 GiB per al sistema i la interfície de Zynthian i la part d'una instància n'és una vuitena: 3 GiB i 384 MiB en 4
GB, 7 GiB i 896 MiB en 8 GB. Són provisionals fins que es llegeixin en una Pi.</p>
<p>Com que una xifra que falta es llegeix <code>unknown</code>, una consola que s'actualitza llegeix tots els plugins com a
<code>unknown</code> fins que s'han tornat a mesurar. És la regla en acció: res no diu que les xifres antigues encara hi càpiguen.</p>
<h2 id="el-que-encara-no-es-mesura">El que encara no es mesura</h2>
<p>El creixement en el temps d'un plugin CLAP: la sonda CLAP encara no fa una renderització contínua, de manera que
<code>leaks</code> només s'aplica als plugins LV2 i un plugin CLAP es llegeix <code>unsoaked</code>. La petjada es mesura en tots dos
formats.</p>
`},n={en:e,ca:t};export{t as ca,n as default,e as en};