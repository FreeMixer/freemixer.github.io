var e={slug:`chains-plugins-in-series-in-one-worker`,order:40,title:`"Chains: plugins in series in one worker, and a crashed member quarantined"`,summary:`A chain runs a strip's plugins in order inside one worker process, so they wake once per cycle instead of once each; when a member crashes, it alone is quarantined and the rest of the chain goes on.`,measured:`plugin-hostd with omx-clap-host, October 2026.`,topic:`host`,toc:[{id:`why`,title:`Why`},{id:`the-verbs`,title:`The verbs`},{id:`which-members-can-share-a-chain`,title:`Which members can share a chain`},{id:`what-the-worker-is-told`,title:`What the worker is told`},{id:`a-crash`,title:`A crash`},{id:`lv2-chains-under-require-pins`,title:`LV2 chains under require_pins`}],html:`<h2 id="why">Why</h2>
<p>omx-clap-host gives every plugin its own JACK client, and every client is a node of the graph with its own wake-up per
cycle. Most of a cycle's time goes on those wake-ups, not on the plugins (see
<a href="/notes/one-jack-client-for-a-chain">One JACK client for a chain</a>). A strip that runs four plugins in series wakes four
nodes. omx-clap-host can run a chain of plugins in one client and call them in order inside one process callback; it must
be told which instances form a chain and in what order, and the daemon must put them in one worker.</p>
<p>A chain shares one process, so one member's crash would take the others down. plugin-hostd exists to isolate crashes: the
member that crashed leaves the chain and the rest go on.</p>
<h2 id="the-verbs">The verbs</h2>
<pre><code>chain &lt;chain&gt; &lt;instance&gt; [&lt;instance&gt; ...]                resp 0
chain_clear &lt;chain&gt;                                      resp 0
chain_get &lt;chain&gt;                                        resp 0 &lt;worker&gt; &lt;declared&gt; &lt;running&gt;
</code></pre>
<p><code>chain</code> declares the members in order; they must be instances an <code>add</code> made. The chain gets one worker, of place
<code>chain:&lt;chain&gt;</code>. Each member leaves the worker it was in: its state is saved, its <code>remove</code> goes to that worker, and the new
worker replays it like a respawn: the add, the state, the verb ledger and the connections, in that order. Declaring a chain
again gives it the new order; a member left out goes back to a worker of its own. <code>chain_clear</code> gives every member a
worker of its own and forgets the chain.</p>
<p><code>chain_get</code> reads a chain back: its worker, its members in the declared order, and the members its worker runs now. A
quarantined member is in the declared list and not in the running one. It is the controller's check that an add, a move
or a remove landed.</p>
<p>A chain declared again while its worker is up keeps that worker, and the members that stay are not restarted. A member
left out goes to a worker of its own; a new member leaves its old worker and joins the running one with its add, its state
alone, its verbs and its connections; and the worker is sent the new order. A move, a new order with no member joining or
leaving, sends the order and nothing else. The chain is formed again from scratch only when its worker is not up, when a
member is split out or rejoining, or when a joining LV2 member needs a bundle the running worker's world was not built
with.</p>
<h2 id="which-members-can-share-a-chain">Which members can share a chain</h2>
<p><code>clap</code> and <code>lv2-clap</code> are two rows of one program, omx-clap-host, and both run chains in one client, so a CLAP member and
an LV2 member (through the LV2 adapter) form one chain. Members of two programs (LV2 on mod-host with CLAP) are refused
with <code>CHAIN_MIXED_FORMAT</code>.</p>
<p>A refusal changes nothing:</p>
<table>
<thead>
<tr>
<th>code</th>
<th>when</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>CHAIN_UNKNOWN_INSTANCE</code></td>
<td>a member that no <code>add</code> made</td>
</tr>
<tr>
<td><code>CHAIN_DUPLICATE</code></td>
<td>the same instance twice in the list</td>
</tr>
<tr>
<td><code>CHAIN_INSTANCE_BUSY</code></td>
<td>a member already in another chain</td>
</tr>
<tr>
<td><code>CHAIN_MIXED_FORMAT</code></td>
<td>members that one worker program does not run together</td>
</tr>
<tr>
<td><code>PLACEMENT_INVALID</code></td>
<td>a member whose plugin may not share a worker while <code>require_pins</code> is on</td>
</tr>
<tr>
<td><code>NO_SUCH_CHAIN</code></td>
<td><code>chain_clear</code> of a chain no <code>chain</code> declared</td>
</tr>
</tbody>
</table>
<p>A chain of one is valid: one isolated plugin is a chain like any other.</p>
<h2 id="what-the-worker-is-told">What the worker is told</h2>
<p>A worker that runs chains in one client is sent the same <code>chain</code> line after the adds of its replay. A worker that does not
(mod-host) holds the members in one process, and its connections give the order. Bypass, parameters and every instance
verb still name one instance by its own number; the daemon routes them to the chain's worker.</p>
<h2 id="a-crash">A crash</h2>
<p>A chain's worker is a pool to the supervisor, which attributes a death the same way:</p>
<ul>
<li>When the death names a culprit (the verb in flight, or a recent suspect), the culprit is quarantined
(<code>instance_quarantined &lt;instance&gt; &lt;worker&gt;</code>) and moved to a worker of its own. The chain's worker is respawned with the
other members in their order, and <code>chain_formed &lt;chain&gt; &lt;worker&gt; &lt;instance&gt;,...</code> names the order that runs now.</li>
<li>When it names none, the members are split, each into a worker of its own. The member that dies again on its own is the
culprit: it is quarantined, and the others rejoin the chain in their order.</li>
</ul>
<p>A quarantined member keeps its place in the declared order. <code>quarantine_clear</code> puts it back, and the chain's worker is
formed again with every member that is not quarantined. <code>remove</code> of a member takes it out of the chain; a chain whose last
member is removed is forgotten.</p>
<h2 id="lv2-chains-under-require-pins">LV2 chains under require_pins</h2>
<p>An LV2 pin holds only in a world narrowed to the plugin's own bundle. A chain's worker therefore gets a world narrowed to
the union of its members' bundles, so that each member's pin still holds in it. A member whose bundle is not found leaves
the world unbuilt rather than widening it, and <code>chain</code> refuses that chain with <code>PLACEMENT_INVALID</code> before anything moves.</p>
<p>A world narrowed to one member's bundle is the failure to avoid: in a bench of eight LV2 plugins chained through the
adapter, a member in an <code>LV2_PATH</code> of a single bundle answered <code>resp -101</code> (no plugin of that uri). A test forms a chain of
two LV2 members, checks that the worker's <code>LV2_PATH</code> holds exactly the two bundles, and a sabotage that narrows the world to
the first bundle must turn it red.</p>
`},t={slug:`chains-plugins-in-series-in-one-worker`,order:40,title:`"Cadenes: plugins en sèrie en un sol worker i el membre que falla, en quarantena"`,summary:`Una cadena fa córrer en ordre els plugins d'un canal dins d'un sol procés worker, de manera que es desperten una vegada per cicle i no una cadascun; quan un membre falla, només aquest queda en quarantena i la resta de la cadena continua.`,measured:`plugin-hostd amb omx-clap-host, octubre del 2026.`,topic:`host`,toc:[{id:`per-que`,title:`Per què`},{id:`els-verbs`,title:`Els verbs`},{id:`quins-membres-poden-compartir-una-cadena`,title:`Quins membres poden compartir una cadena`},{id:`que-se-li-diu-al-worker`,title:`Què se li diu al worker`},{id:`una-fallada`,title:`Una fallada`},{id:`cadenes-lv2-amb-require-pins`,title:`Cadenes LV2 amb require_pins`}],html:`<h2 id="per-que">Per què</h2>
<p>omx-clap-host dona a cada plugin el seu propi client JACK i cada client és un node del graf amb el seu propi despertar a
cada cicle. La major part del temps d'un cicle se'n va en aquests despertars, no pas en els plugins (vegeu
<a href="/ca/notes/one-jack-client-for-a-chain">Un sol client JACK per a una cadena</a>). Un canal amb quatre plugins en sèrie
desperta quatre nodes. omx-clap-host pot fer córrer una cadena de plugins en un sol client i cridar-los en ordre dins d'una
sola crida de procés; cal dir-li quines instàncies formen una cadena i en quin ordre i el dimoni les ha de posar en un sol
worker.</p>
<p>Una cadena comparteix un procés, de manera que la fallada d'un membre s'enduria els altres. plugin-hostd existeix per aïllar
fallades: el membre que ha fallat surt de la cadena i la resta continua.</p>
<h2 id="els-verbs">Els verbs</h2>
<pre><code>chain &lt;chain&gt; &lt;instance&gt; [&lt;instance&gt; ...]                resp 0
chain_clear &lt;chain&gt;                                      resp 0
chain_get &lt;chain&gt;                                        resp 0 &lt;worker&gt; &lt;declared&gt; &lt;running&gt;
</code></pre>
<p><code>chain</code> declara els membres en ordre; han de ser instàncies creades amb <code>add</code>. La cadena té un sol worker, de lloc
<code>chain:&lt;chain&gt;</code>. Cada membre deixa el worker on era: se'n desa l'estat, el seu <code>remove</code> va a aquell worker i el worker nou
el reprodueix com en un reinici: l'addició, l'estat, el registre de verbs i les connexions, en aquest ordre. Tornar a
declarar una cadena li dona l'ordre nou; un membre que hi queda fora torna a un worker propi. <code>chain_clear</code> dona a cada
membre un worker propi i oblida la cadena.</p>
<p><code>chain_get</code> llegeix una cadena: el seu worker, els membres en l'ordre declarat i els que el worker fa córrer ara. Un membre
en quarantena és a la llista declarada i no a la que corre. És la comprovació del controlador que una addició, un moviment
o una retirada han arribat.</p>
<p>Una cadena que es torna a declarar mentre el seu worker està en marxa conserva aquell worker i els membres que s'hi queden
no es reinicien. Un membre que en surt va a un worker propi; un membre nou deixa el seu worker antic i s'afegeix al que
corre amb la seva addició, només el seu estat, els seus verbs i les seves connexions; i al worker se li envia l'ordre nou.
Un moviment, un ordre nou sense cap membre que entri ni surti, envia l'ordre i res més. La cadena només es torna a formar de
zero quan el seu worker no està en marxa, quan un membre se n'ha separat o s'hi torna a afegir o quan un membre LV2 que
s'hi afegeix necessita un paquet amb què no es va construir el món del worker en marxa.</p>
<h2 id="quins-membres-poden-compartir-una-cadena">Quins membres poden compartir una cadena</h2>
<p><code>clap</code> i <code>lv2-clap</code> són dues files d'un mateix programa, omx-clap-host i totes dues fan córrer cadenes en un sol client;
per tant un membre CLAP i un membre LV2 (a través de l'adaptador LV2) formen una sola cadena. Els membres de dos programes
(LV2 a mod-host amb CLAP) es refusen amb <code>CHAIN_MIXED_FORMAT</code>.</p>
<p>Un refús no canvia res:</p>
<table>
<thead>
<tr>
<th>codi</th>
<th>quan</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>CHAIN_UNKNOWN_INSTANCE</code></td>
<td>un membre que cap <code>add</code> no ha creat</td>
</tr>
<tr>
<td><code>CHAIN_DUPLICATE</code></td>
<td>la mateixa instància dues vegades a la llista</td>
</tr>
<tr>
<td><code>CHAIN_INSTANCE_BUSY</code></td>
<td>un membre que ja és en una altra cadena</td>
</tr>
<tr>
<td><code>CHAIN_MIXED_FORMAT</code></td>
<td>membres que un mateix programa worker no fa córrer junts</td>
</tr>
<tr>
<td><code>PLACEMENT_INVALID</code></td>
<td>un membre el plugin del qual no pot compartir worker mentre <code>require_pins</code> està activat</td>
</tr>
<tr>
<td><code>NO_SUCH_CHAIN</code></td>
<td><code>chain_clear</code> d'una cadena que cap <code>chain</code> no ha declarat</td>
</tr>
</tbody>
</table>
<p>Una cadena d'un sol membre és vàlida: un plugin aïllat és una cadena com qualsevol altra.</p>
<h2 id="que-se-li-diu-al-worker">Què se li diu al worker</h2>
<p>A un worker que fa córrer cadenes en un sol client se li envia la mateixa línia <code>chain</code> després de les addicions de la
reproducció. Un worker que no ho fa (mod-host) té els membres en un sol procés i les connexions en donen l'ordre. El
bypass, els paràmetres i tots els verbs d'instància continuen anomenant una instància pel seu número; el dimoni els
encamina al worker de la cadena.</p>
<h2 id="una-fallada">Una fallada</h2>
<p>Per al supervisor, el worker d'una cadena és un grup de workers compartit i atribueix una mort de la mateixa manera:</p>
<ul>
<li>Quan la mort assenyala un culpable (el verb en curs o un sospitós recent), el culpable queda en quarantena
(<code>instance_quarantined &lt;instance&gt; &lt;worker&gt;</code>) i passa a un worker propi. El worker de la cadena es reinicia amb els altres
membres en el seu ordre i <code>chain_formed &lt;chain&gt; &lt;worker&gt; &lt;instance&gt;,...</code> diu l'ordre que corre ara.</li>
<li>Quan no n'assenyala cap, els membres se separen, cadascun en un worker propi. El membre que torna a morir tot sol és el
culpable: queda en quarantena i els altres tornen a la cadena en el seu ordre.</li>
</ul>
<p>Un membre en quarantena conserva el seu lloc en l'ordre declarat. <code>quarantine_clear</code> el torna a posar i el worker de la
cadena es torna a formar amb tots els membres que no són en quarantena. <code>remove</code> d'un membre el treu de la cadena; una
cadena a la qual es treu l'últim membre s'oblida.</p>
<h2 id="cadenes-lv2-amb-require-pins">Cadenes LV2 amb require_pins</h2>
<p>Una empremta LV2 només és vàlida en un món reduït al paquet del mateix plugin. Per això el worker d'una cadena rep un món
reduït a la unió dels paquets dels seus membres, de manera que l'empremta de cada membre hi continua sent vàlida. Un membre
el paquet del qual no es troba deixa el món sense construir en lloc d'eixamplar-lo i <code>chain</code> refusa la cadena amb
<code>PLACEMENT_INVALID</code> abans que res no es mogui.</p>
<p>Un món reduït al paquet d'un sol membre és la fallada que cal evitar: en un banc de proves de vuit plugins LV2 encadenats
a través de l'adaptador, un membre amb un <code>LV2_PATH</code> d'un sol paquet responia <code>resp -101</code> (cap plugin amb aquell uri). Una
prova forma una cadena de dos membres LV2, comprova que l'<code>LV2_PATH</code> del worker té exactament els dos paquets i un sabotatge
que redueix el món al primer paquet l'ha de fer sortir vermella.</p>
`},n={en:e,ca:t};export{t as ca,n as default,e as en};