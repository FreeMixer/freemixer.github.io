var e={slug:`audio-layouts-and-how-the-host-judges-the-fit`,order:120,title:`"Audio layouts: every port a plugin declares, and how the host judges the fit"`,summary:`The host used to admit a mono or stereo main pair and refuse everything else, which left out 84 of 975 LV2 plugins that mod-host hosts. Now the library describes every audio port a plugin declares, and whoever runs the plugin judges whether it can carry that layout, refusing by name rather than folding a layout down.`,measured:`The LV2 plugins installed on one Fedora 44 machine (975), October 2026; the design of omx-clap-core's audio layouts.`,topic:`core`,toc:[{id:`the-gap`,title:`The gap`},{id:`the-decision`,title:`The decision`},{id:`what-the-survey-found`,title:`What the survey found`},{id:`why-these-rules`,title:`Why these rules`},{id:`where-the-rules-are`,title:`Where the rules are`},{id:`how-it-is-proven`,title:`How it is proven`}],html:`<h2 id="the-gap">The gap</h2>
<p>The host admitted one main input and one main output of the same width, mono or stereo, plus up to eight auxiliary inputs
and outputs of one or two channels, and refused everything else. Of the 975 LV2 plugins installed on one machine, that
refused 84 that mod-host hosts:</p>
<ul>
<li>51 with inputs beyond the main pair: side chains, mixers, meters, matrix mixers and patchbays, up to 64 inputs;</li>
<li>33 whose main pair differs in width, or whose outputs are more than the pair: mono reverbs with a stereo tail, crossovers
with band outputs, a 34-output instrument.</li>
</ul>
<p>A CLAP plugin with a surround or ambisonic main port was refused the same way, and the host never read the extensions that
describe such ports or offer other layouts.</p>
<h2 id="the-decision">The decision</h2>
<p>Every layout a plugin declares is supported:</p>
<ul>
<li>inputs beyond the main one are auxiliary inputs, silent until something binds them;</li>
<li>a main port of any width is carried where the carrier has that many channels;</li>
<li>a layout the carrier cannot carry is refused with a named code, never silently and never folded down;</li>
<li>a mono output on a stereo strip is carried to both sides, as a mono input is.</li>
</ul>
<p>What keeps this small is one principle: <strong>the library describes, the carrier judges.</strong> The host library and the LV2 adapter
admit any audio layout within declared limits and describe it completely: every port, its channels, its kind, its channel
map. Whoever runs the plugin on a lane of a given width reads that description and decides what it can carry. The console's
native lane is two channels wide and refuses a wider main port, as before; omx-clap-host under JACK can carry any width as
ports.</p>
<h2 id="what-the-survey-found">What the survey found</h2>
<p>The shapes behind the 84, and the reading that admits each:</p>
<ul>
<li><strong>A declared main group plus other ports.</strong> Side-chain compressors, multichannel mixers, A/B testers, oscilloscopes and
spectrum analysers, true-stereo reverbs and crossovers declare which port group is the main one; every other port is
auxiliary.</li>
<li><strong>Groups, but no main group.</strong> The first group in port order is taken as the main port: a plugin with two mono groups gets
one as main and the other as auxiliary.</li>
<li><strong>No groups at all, more than two ports.</strong> When the other side's main port is exactly as wide, the side is one main port
of that width: surround meters, matrix mixers, multichannel loudness meters, N-to-N patchbays. Otherwise the first two
ports are the main pair and the rest are mono auxiliary ports: crossfaders with two pairs, three-input compressors, an
encoder with extra centre and surround inputs.</li>
<li><strong>Mono in, stereo out.</strong> Thirteen true-stereo reverbs and six splitters have main ports of different widths; their two
outputs are the main pair, which is also what mod-host presents.</li>
</ul>
<p>The limits come from what the survey measured, plus a margin: a port of up to 64 channels, and up to 64 auxiliary ports per
side (a 64-channel patchbay, a 24-channel loudness meter, an instrument with 34 outputs, a sampler with 98 outputs as 49
stereo groups). No installed plugin declared a surround or ambisonic group; those are exercised by test fixtures.</p>
<h2 id="why-these-rules">Why these rules</h2>
<ul>
<li><strong>Deterministic from what the plugin says.</strong> The rules never guess a layout the plugin did not declare. A plugin that means
a wider main declares a port group.</li>
<li><strong>Nothing folded down.</strong> A 5.1 plugin heard as its first two channels would be a silent loss; it is refused by name
instead, where the carrier cannot take six channels.</li>
<li><strong>Nothing changes for what worked.</strong> A mono or stereo plugin on a stereo lane behaves as before, bit for bit, and the JACK
port names of the main pair stay as they were.</li>
<li><strong>Ambisonics without a declared normalisation.</strong> LV2 port groups state no normalisation, so a full-order ambisonic group is
presented as ACN ordering with SN3D normalisation, the AmbiX convention, and the description says it is assumed.
Mixed-order groups, which a CLAP ambisonic port cannot express, are carried as discrete channels.</li>
<li><strong>Alternative layouts are asked for, not imposed.</strong> A plugin that offers other layouts can be asked, before activation, for
the one the carrier has (a reverb offering mono-in and stereo-in takes the strip's); a plugin that cannot keeps its declared
layout, and the carrier judges that.</li>
<li><strong>Layout changes are not answered by a restart.</strong> A plugin that rescans its ports is reported once; the carrier describes
it again while inactive and activates it again.</li>
</ul>
<h2 id="where-the-rules-are">Where the rules are</h2>
<p>The rules themselves (which ports are main and which auxiliary, the LV2 group types and their channel maps, the CLAP
extensions read, the JACK port names, the limits and the refusal codes) are in <a href="https://github.com/FreeMixer/omx-clap-core/blob/main/doc/reference.md">the host library's reference</a>.</p>
<h2 id="how-it-is-proven">How it is proven</h2>
<p>Test fixtures, LV2 and CLAP, one per shape: a main group with two stereo auxiliary groups, two mono groups without a main,
ungrouped 4 to 4 and 4 to 2, mono in with a stereo main output, a main pair with three band outputs, 5.1, first-order and
mixed-order ambisonics, a 64-port side and a 65-port one, plugins with alternative layouts. Each asserts the description and
a value through the ports. Sabotaged, the tests go red: restoring the equal-width refusal turns the mono-in, stereo-out
plugins red, and dropping the auxiliary binding turns the side-chain test red. Every mono and stereo plugin stays
bit-identical through the adapter.</p>
`},t={slug:`audio-layouts-and-how-the-host-judges-the-fit`,order:120,title:`"Disposicions d'àudio: cada port que declara un plugin i com jutja l'amfitrió si hi cap"`,summary:`Abans l'amfitrió admetia una parella principal mono o estèreo i refusava tota la resta, cosa que deixava fora 84 dels 975 plugins LV2 que mod-host allotja. Ara la biblioteca descriu cada port d'àudio que declara un plugin i qui fa córrer el plugin jutja si pot portar aquella disposició i la refusa pel nom en lloc de reduir-la.`,measured:`Els plugins LV2 instal·lats en una màquina Fedora 44 (975), octubre del 2026; el disseny de les disposicions d'àudio d'omx-clap-core.`,topic:`core`,toc:[{id:`la-mancanca`,title:`La mancança`},{id:`la-decisio`,title:`La decisió`},{id:`que-va-trobar-la-revisio`,title:`Què va trobar la revisió`},{id:`per-que-aquestes-regles`,title:`Per què aquestes regles`},{id:`on-son-les-regles`,title:`On són les regles`},{id:`com-es-demostra`,title:`Com es demostra`}],html:`<h2 id="la-mancanca">La mancança</h2>
<p>L'amfitrió admetia una entrada principal i una sortida principal de la mateixa amplada, mono o estèreo, més fins a vuit
entrades i sortides auxiliars d'un o dos canals i refusava tota la resta. Dels 975 plugins LV2 instal·lats en una màquina,
això en refusava 84 que mod-host allotja:</p>
<ul>
<li>51 amb entrades més enllà de la parella principal: cadenes laterals, mescladors, vúmetres, mescladors matricials i patchbays,
fins a 64 entrades;</li>
<li>33 la parella principal dels quals té amplades diferents o amb més sortides que la parella: reverbs mono amb una cua
estèreo, divisors de bandes amb sortides per banda, un instrument de 34 sortides.</li>
</ul>
<p>Un plugin CLAP amb un port principal envolupant o ambisònic es refusava igual i l'amfitrió no llegia mai les extensions que
descriuen aquests ports o n'ofereixen altres disposicions.</p>
<h2 id="la-decisio">La decisió</h2>
<p>S'admet qualsevol disposició que declari un plugin:</p>
<ul>
<li>les entrades més enllà de la principal són entrades auxiliars, en silenci fins que alguna cosa les connecta;</li>
<li>un port principal de qualsevol amplada es porta allà on el portador té prou canals;</li>
<li>una disposició que el portador no pot portar es refusa amb un codi amb nom, mai en silenci ni reduint-la;</li>
<li>una sortida mono en un canal estèreo es porta als dos costats, com una entrada mono.</li>
</ul>
<p>El que manté això petit és un principi: <strong>la biblioteca descriu, el portador jutja.</strong> La biblioteca de l'amfitrió i
l'adaptador LV2 admeten qualsevol disposició d'àudio dins dels límits declarats i la descriuen sencera: cada port, els seus
canals, el seu tipus, el seu mapa de canals. Qui fa córrer el plugin en un carril d'una certa amplada llegeix aquesta
descripció i decideix què pot portar. El carril natiu de la consola té dos canals i refusa un port principal més ample, com
abans; omx-clap-host amb JACK pot portar qualsevol amplada com a ports.</p>
<h2 id="que-va-trobar-la-revisio">Què va trobar la revisió</h2>
<p>Les formes que hi ha darrere dels 84 i la lectura que admet cadascuna:</p>
<ul>
<li><strong>Un grup principal declarat més altres ports.</strong> Els compressors amb cadena lateral, els mescladors multicanal, els
comparadors A/B, els oscil·loscopis i analitzadors d'espectre, les reverbs estèreo reals i els divisors de bandes declaren
quin grup de ports és el principal; tots els altres ports són auxiliars.</li>
<li><strong>Grups, però cap grup principal.</strong> El primer grup en l'ordre dels ports es pren com a port principal: un plugin amb dos
grups mono en té un de principal i l'altre d'auxiliar.</li>
<li><strong>Cap grup, més de dos ports.</strong> Quan el port principal de l'altre costat té exactament la mateixa amplada, el costat és un
sol port principal d'aquella amplada: vúmetres envolupants, mescladors matricials, mesuradors de sonoritat multicanal,
patchbays de N a N. Si no, els dos primers ports són la parella principal i la resta són ports auxiliars mono:
encreuadors amb dues parelles, compressors de tres entrades, un codificador amb entrades de centre i envolupant de més.</li>
<li><strong>Entrada mono, sortida estèreo.</strong> Tretze reverbs estèreo reals i sis divisors tenen ports principals d'amplades diferents;
les seves dues sortides són la parella principal, que és també el que presenta mod-host.</li>
</ul>
<p>Els límits surten del que va mesurar la revisió, amb un marge: un port de fins a 64 canals i fins a 64 ports auxiliars per
costat (un patchbay de 64 canals, un mesurador de sonoritat de 24 canals, un instrument de 34 sortides, un
mostrejador de 98 sortides com a 49 grups estèreo). Cap plugin instal·lat no declarava un grup envolupant ni ambisònic; aquests
es proven amb peces de prova.</p>
<h2 id="per-que-aquestes-regles">Per què aquestes regles</h2>
<ul>
<li><strong>Deterministes a partir del que diu el plugin.</strong> Les regles no endevinen mai una disposició que el plugin no ha declarat.
Un plugin que vol un port principal més ample declara un grup de ports.</li>
<li><strong>Res no es redueix.</strong> Un plugin 5.1 que se sentís només pels seus dos primers canals seria una pèrdua silenciosa; en lloc
d'això es refusa pel nom, allà on el portador no pot prendre sis canals.</li>
<li><strong>No canvia res del que ja funcionava.</strong> Un plugin mono o estèreo en un carril estèreo es comporta com abans, bit a bit i
els noms dels ports JACK de la parella principal no canvien.</li>
<li><strong>Ambisònica sense normalització declarada.</strong> Els grups de ports LV2 no declaren cap normalització, de manera que un grup
ambisònic d'ordre complet es presenta amb ordenació ACN i normalització SN3D, la convenció AmbiX i la descripció diu que
és suposada. Els grups d'ordre mixt, que un port ambisònic CLAP no pot expressar, es porten com a canals separats.</li>
<li><strong>Les disposicions alternatives es demanen, no s'imposen.</strong> A un plugin que ofereix altres disposicions se li pot demanar,
abans d'activar-lo, la que té el portador (una reverb que ofereix entrada mono i entrada estèreo pren la del canal); un
plugin que no pot conserva la disposició declarada i el portador la jutja.</li>
<li><strong>Els canvis de disposició no es responen amb un reinici.</strong> Un plugin que torna a explorar els seus ports es comunica una
vegada; el portador el torna a descriure mentre és inactiu i el torna a activar.</li>
</ul>
<h2 id="on-son-les-regles">On són les regles</h2>
<p>Les regles mateixes (quins ports són principals i quins auxiliars, els tipus de grup LV2 i els seus mapes de canals, les
extensions CLAP que es llegeixen, els noms dels ports JACK, els límits i els codis de refús) són a <a href="https://github.com/FreeMixer/omx-clap-core/blob/main/doc/reference.md">la referència de la
biblioteca de l'amfitrió</a>.</p>
<h2 id="com-es-demostra">Com es demostra</h2>
<p>Peces de prova, LV2 i CLAP, una per forma: un grup principal amb dos grups auxiliars estèreo, dos grups mono sense principal,
sense grups de 4 a 4 i de 4 a 2, entrada mono amb un grup de sortida principal estèreo, una parella principal amb tres
sortides de banda, 5.1, ambisònica de primer ordre i d'ordre mixt, un costat de 64 ports i un de 65, plugins amb disposicions
alternatives. Cadascuna comprova la descripció i un valor a través dels ports. Amb sabotatge, les proves surten vermelles:
tornar a posar el refús d'amplades iguals posa en vermell els plugins d'entrada mono i sortida estèreo i treure la connexió
auxiliar posa en vermell la prova de cadena lateral. Tots els plugins mono i estèreo continuen sent idèntics bit a bit a
través de l'adaptador.</p>
`},n={en:e,ca:t};export{t as ca,n as default,e as en};