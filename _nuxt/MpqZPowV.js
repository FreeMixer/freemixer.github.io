var e={slug:`pins-on-first-use`,order:30,title:`"Pins on first use: how plugin-hostd trusts a plugin binary"`,summary:`plugin-hostd records the hash of a plugin's files and of its parameter layout the first time the plugin is added, checks them on every later add, and refuses loudly when they change, so that a standalone host gets pins without a controller sending them.`,measured:`plugin-hostd 0.3.0 and later.`,topic:`host`,toc:[{id:`why`,title:`Why`},{id:`settings`,title:`Settings`},{id:`one-line-format`,title:`One line format`},{id:`first-use`,title:`First use`},{id:`a-change`,title:`A change`},{id:`the-pins-file-of-plugin-qualify`,title:`The pins file of plugin-qualify`},{id:`a-format-neutral-host`,title:`A format-neutral host`}],html:`<h2 id="why">Why</h2>
<p>While <code>require_pins</code> is on, an unpinned plugin is refused (-508), so a standalone user's first <code>add</code> would fail unless a
controller sent <code>pin_set</code> first. A host that does not pin by itself would have to turn <code>require_pins</code> off, and then no
pin is checked at all. So the pin is taken on first use and kept, and any change after that is loud.</p>
<p>An external plugin carries no pins of its own, and its qualification record is evidence, not a pin. A pins file is shipped
only for the binaries of OpenMixer's own packages, and a record whose verdict is <code>refused</code> refuses an add.</p>
<h2 id="settings">Settings</h2>
<table>
<thead>
<tr>
<th>key</th>
<th>default</th>
<th>meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>pin_mode</code></td>
<td><code>first-use</code></td>
<td><code>strict</code> or <code>first-use</code>, read only while <code>require_pins</code> is 1</td>
</tr>
<tr>
<td><code>pin_store</code></td>
<td>empty</td>
<td>the file the learned pins are kept in; empty means <code>$XDG_STATE_HOME/plugin-hostd/pins</code>, else <code>$HOME/.local/state/plugin-hostd/pins</code></td>
</tr>
<tr>
<td><code>pin_file</code></td>
<td>empty</td>
<td>a pins file loaded at startup, written by <code>plugin-qualify --all --pins</code></td>
</tr>
</tbody>
</table>
<p><code>require_pins 0</code> still means no pin is checked. <code>strict</code> is the earlier behaviour: a plugin with no pin is refused with
-508. A host that pins by itself sets <code>pin_mode strict</code>.</p>
<h2 id="one-line-format">One line format</h2>
<p>The pin store, the pins file and the <code>pin_set</code> verb carry the same line:</p>
<pre><code>pin_set &lt;uri&gt; &lt;path&gt;=&lt;sha256&gt;[,&lt;path&gt;=&lt;sha256&gt;...] &lt;scheme&gt;:&lt;sha256&gt; [verdict=&lt;word&gt;]
</code></pre>
<ul>
<li>In a file the leading <code>pin_set</code> is optional, <code>#</code> starts a comment and blank lines are skipped.</li>
<li>The layout word is <code>-</code> while the layout has not been learned. <code>pin_set</code> as a verb refuses <code>-</code>.</li>
<li><code>verdict=</code> is the qualification verdict of the pinned bytes: <code>in-process</code>, <code>isolated</code> or <code>refused</code>. Absent means not
qualified.</li>
</ul>
<p>The store holds only the pins the daemon learned or accepted. A pin that arrived by <code>pin_set</code> or <code>pin_file</code> is the
controller's: it is not written to the store, and it replaces a stored one of the same uri while the daemon runs. The store
is written to a temporary file in the same directory and renamed, mode 0600.</p>
<h2 id="first-use">First use</h2>
<p>An <code>add</code> in <code>first-use</code> mode, with no pin for the uri:</p>
<ol>
<li>The daemon collects the files the format loads for the plugin, hashes them over open descriptors and records a pin with
layout <code>-</code> and no verdict. Nothing is accepted from a failed collection: the add is refused with -509 and no pin is
recorded.</li>
<li>The instance is placed in a worker of its own, whatever the placement asked. Sharing a process needs a verdict of
<code>in-process</code> on the pin, and a learned pin has none.</li>
<li>Once the worker accepted the add, the daemon asks it for the parameter layout (<code>pin_layout &lt;instance&gt;</code>), records it in
the pin and writes the store. A worker that does not know the verb leaves the layout at <code>-</code>; the files are still
checked on every later add.</li>
</ol>
<p>Later adds check the stored pin as <code>strict</code> does: the files are hashed before any worker sees the add, and the layout is
handed to the worker with <code>pin_expect</code>. A replayed add (a respawned worker) never learns: it checks the pin it has.</p>
<h2 id="a-change">A change</h2>
<ul>
<li>Files differ: the add answers -509. Layout differs: the worker refuses and the add answers -510. In both modes the
daemon emits <code>pin_changed &lt;uri&gt; files</code> or <code>pin_changed &lt;uri&gt; layout</code> on the feedback port.</li>
<li>The pin stays as it was. Nothing loads the changed plugin until the controller decides.</li>
<li><code>pin_accept &lt;uri&gt;</code> takes the new pin: the files are collected and hashed again, recorded with layout <code>-</code> and without the
verdict, so the next add learns the new layout and places the instance in a worker of its own. In <code>strict</code> mode it is
refused: a host that pins by itself changes a pin with <code>pin_set</code>.</li>
</ul>
<p>Accepting never makes a plugin in-process: that stays a decision of qualification.</p>
<h2 id="the-pins-file-of-plugin-qualify">The pins file of plugin-qualify</h2>
<p><code>plugin-qualify --all --pins &lt;file&gt;</code> writes the same line, with <code>verdict=</code>, for every plugin it qualified. The daemon loads
it at start with <code>pin_file</code>; a line it cannot parse stops the start and names the line. One command scans, qualifies and
pins what is installed; a corrupted hash in the file makes the add answer -509.</p>
<h2 id="a-format-neutral-host">A format-neutral host</h2>
<p>The daemon keeps one table of formats, and a format is one row of it:</p>
<table>
<thead>
<tr>
<th>capability</th>
<th>meaning</th>
<th>lv2</th>
<th>clap</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>name</code></td>
<td>the word <code>policy_set</code>, <code>worker_env</code> and <code>worker_list</code> use</td>
<td>lv2</td>
<td>clap</td>
</tr>
<tr>
<td><code>prefix</code>, <code>strip_prefix</code></td>
<td>how a uri says it is this format, and whether the worker gets it without</td>
<td><code>lv2:</code> stripped, also the default for a bare uri</td>
<td><code>clap:</code> kept</td>
</tr>
<tr>
<td><code>worker</code></td>
<td>the program, from the settings</td>
<td><code>mod_host</code></td>
<td><code>clap_host</code></td>
</tr>
<tr>
<td><code>pin_collect</code></td>
<td>the root and the files the host loads for a uri</td>
<td>the bundle's manifest, binary and seeAlso files</td>
<td>the <code>.clap</code> file</td>
</tr>
<tr>
<td><code>layout_check</code></td>
<td>the worker takes <code>pin_expect</code> and <code>pin_layout</code></td>
<td>no</td>
<td>yes</td>
</tr>
<tr>
<td><code>world_scope</code></td>
<td>what the worker's world is made of</td>
<td>one bundle (narrowed)</td>
<td>none</td>
</tr>
<tr>
<td><code>pin_pool</code></td>
<td>whether a pin lets the plugin share a worker</td>
<td>no</td>
<td>yes</td>
</tr>
</tbody>
</table>
<p>The protocol names no format where it means a capability. A test registers a third format at run time and takes it
through add, <code>param_set</code>, <code>pin_set</code>, <code>pin_check</code> and remove with the protocol untouched; a row with a capability missing is
refused with a named reason, so the test goes red instead of the daemon compiling it silently.</p>
<p>What a standalone host does with an <code>in-process</code> verdict is the host's decision: the verdict travels in the pin.</p>
`},t={slug:`pins-on-first-use`,order:30,title:`"Empremtes al primer ús: com plugin-hostd es refia del binari d'un plugin"`,summary:`plugin-hostd enregistra el resum dels fitxers d'un plugin i de la disposició dels seus paràmetres la primera vegada que s'afegeix, els comprova en cada addició posterior i ho refusa en veu alta quan canvien; així un amfitrió autònom té empremtes sense que cap controlador les hi enviï.`,measured:`plugin-hostd 0.3.0 i posteriors.`,topic:`host`,toc:[{id:`per-que`,title:`Per què`},{id:`parametres`,title:`Paràmetres`},{id:`un-sol-format-de-linia`,title:`Un sol format de línia`},{id:`primer-us`,title:`Primer ús`},{id:`un-canvi`,title:`Un canvi`},{id:`el-fitxer-d-empremtes-de-plugin-qualify`,title:`El fitxer d'empremtes de plugin-qualify`},{id:`un-amfitrio-neutral-quant-al-format`,title:`Un amfitrió neutral quant al format`}],html:`<h2 id="per-que">Per què</h2>
<p>Mentre <code>require_pins</code> està activat, un plugin sense empremta es refusa (-508): el primer <code>add</code> d'un usuari autònom
fallaria si cap controlador no hagués enviat abans <code>pin_set</code>. Un amfitrió que no fa empremtes pel seu compte hauria de
desactivar <code>require_pins</code> i aleshores no es comprovaria cap empremta. Per això l'empremta es pren al primer ús i es
conserva i qualsevol canvi posterior es fa sentir.</p>
<p>Un plugin extern no porta empremtes pròpies i el seu registre de qualificació és una prova, no una empremta. Només es
distribueix un fitxer d'empremtes per als binaris dels paquets d'OpenMixer i un registre amb el veredicte <code>refused</code>
refusa l'addició.</p>
<h2 id="parametres">Paràmetres</h2>
<table>
<thead>
<tr>
<th>clau</th>
<th>per defecte</th>
<th>significat</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>pin_mode</code></td>
<td><code>first-use</code></td>
<td><code>strict</code> o <code>first-use</code>; només es llegeix mentre <code>require_pins</code> val 1</td>
</tr>
<tr>
<td><code>pin_store</code></td>
<td>buit</td>
<td>el fitxer on es guarden les empremtes apreses; buit vol dir <code>$XDG_STATE_HOME/plugin-hostd/pins</code>, si no <code>$HOME/.local/state/plugin-hostd/pins</code></td>
</tr>
<tr>
<td><code>pin_file</code></td>
<td>buit</td>
<td>un fitxer d'empremtes que es carrega en arrencar, escrit per <code>plugin-qualify --all --pins</code></td>
</tr>
</tbody>
</table>
<p><code>require_pins 0</code> continua volent dir que no es comprova cap empremta. <code>strict</code> és el comportament d'abans: un plugin sense
empremta es refusa amb -508. Un amfitrió que fa empremtes pel seu compte posa <code>pin_mode strict</code>.</p>
<h2 id="un-sol-format-de-linia">Un sol format de línia</h2>
<p>El magatzem d'empremtes, el fitxer d'empremtes i el verb <code>pin_set</code> porten la mateixa línia:</p>
<pre><code>pin_set &lt;uri&gt; &lt;path&gt;=&lt;sha256&gt;[,&lt;path&gt;=&lt;sha256&gt;...] &lt;scheme&gt;:&lt;sha256&gt; [verdict=&lt;word&gt;]
</code></pre>
<ul>
<li>En un fitxer el <code>pin_set</code> inicial és opcional, <code>#</code> comença un comentari i les línies buides se salten.</li>
<li>La paraula de disposició és <code>-</code> mentre la disposició no s'ha après. <code>pin_set</code> com a verb refusa <code>-</code>.</li>
<li><code>verdict=</code> és el veredicte de qualificació dels bytes amb empremta: <code>in-process</code>, <code>isolated</code> o <code>refused</code>. Si no hi és, el
plugin no està qualificat.</li>
</ul>
<p>El magatzem només guarda les empremtes que el dimoni ha après o acceptat. Una empremta arribada per <code>pin_set</code> o <code>pin_file</code>
és del controlador: no s'escriu al magatzem i, mentre el dimoni corre, substitueix la que hi hagi guardada del mateix uri.
El magatzem s'escriu en un fitxer temporal del mateix directori i es reanomena, amb permisos 0600.</p>
<h2 id="primer-us">Primer ús</h2>
<p>Un <code>add</code> en mode <code>first-use</code> sense empremta per a l'uri:</p>
<ol>
<li>El dimoni recull els fitxers que el format carrega per al plugin, en calcula el resum sobre descriptors oberts i
enregistra una empremta amb disposició <code>-</code> i sense veredicte. D'una recollida fallida no s'accepta res: l'addició es
refusa amb -509 i no s'enregistra cap empremta.</li>
<li>La instància es col·loca en un worker propi, demani el que demani la col·locació. Compartir procés demana el veredicte
<code>in-process</code> a l'empremta i una empremta apresa no en té.</li>
<li>Quan el worker ha acceptat l'addició, el dimoni li demana la disposició dels paràmetres (<code>pin_layout &lt;instance&gt;</code>), la
desa a l'empremta i escriu el magatzem. Un worker que no coneix el verb deixa la disposició a <code>-</code>; els fitxers es
continuen comprovant en cada addició posterior.</li>
</ol>
<p>Les addicions posteriors comproven l'empremta guardada com fa <code>strict</code>: els fitxers es resumeixen abans que cap worker vegi
l'addició i la disposició es passa al worker amb <code>pin_expect</code>. Una addició repetida (un worker que es reinicia) mai no
aprèn: comprova l'empremta que té.</p>
<h2 id="un-canvi">Un canvi</h2>
<ul>
<li>Si els fitxers són diferents, l'addició respon -509. Si la disposició és diferent, el worker la refusa i l'addició
respon -510. En tots dos modes el dimoni emet <code>pin_changed &lt;uri&gt; files</code> o <code>pin_changed &lt;uri&gt; layout</code> pel port de retorn.</li>
<li>L'empremta es queda com estava. Res no carrega el plugin canviat fins que el controlador decideix.</li>
<li><code>pin_accept &lt;uri&gt;</code> pren l'empremta nova: els fitxers es tornen a recollir i resumir, s'enregistren amb disposició <code>-</code> i
sense veredicte, de manera que la propera addició aprèn la nova disposició i col·loca la instància en un worker propi. En
mode <code>strict</code> es refusa: un amfitrió que fa empremtes pel seu compte canvia una empremta amb <code>pin_set</code>.</li>
</ul>
<p>Acceptar mai no fa que un plugin vagi dins del procés: això continua sent una decisió de la qualificació.</p>
<h2 id="el-fitxer-d-empremtes-de-plugin-qualify">El fitxer d'empremtes de plugin-qualify</h2>
<p><code>plugin-qualify --all --pins &lt;file&gt;</code> escriu la mateixa línia, amb <code>verdict=</code>, per a cada plugin que ha qualificat. El dimoni
el carrega en arrencar amb <code>pin_file</code>; una línia que no pot llegir n'atura l'arrencada i en diu el número. Una sola ordre
explora, qualifica i fa l'empremta del que hi ha instal·lat; un resum corromput al fitxer fa que l'addició respongui -509.</p>
<h2 id="un-amfitrio-neutral-quant-al-format">Un amfitrió neutral quant al format</h2>
<p>El dimoni té una sola taula de formats i un format n'és una fila:</p>
<table>
<thead>
<tr>
<th>capacitat</th>
<th>significat</th>
<th>lv2</th>
<th>clap</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>name</code></td>
<td>la paraula que fan servir <code>policy_set</code>, <code>worker_env</code> i <code>worker_list</code></td>
<td>lv2</td>
<td>clap</td>
</tr>
<tr>
<td><code>prefix</code>, <code>strip_prefix</code></td>
<td>com diu un uri que és d'aquest format i si el worker el rep sense el prefix</td>
<td><code>lv2:</code> tret; també és el format d'un uri sense prefix</td>
<td><code>clap:</code> conservat</td>
</tr>
<tr>
<td><code>worker</code></td>
<td>el programa, segons els paràmetres</td>
<td><code>mod_host</code></td>
<td><code>clap_host</code></td>
</tr>
<tr>
<td><code>pin_collect</code></td>
<td>l'arrel i els fitxers que l'amfitrió carrega per a un uri</td>
<td>el manifest, el binari i els fitxers seeAlso del paquet</td>
<td>el fitxer <code>.clap</code></td>
</tr>
<tr>
<td><code>layout_check</code></td>
<td>el worker accepta <code>pin_expect</code> i <code>pin_layout</code></td>
<td>no</td>
<td>sí</td>
</tr>
<tr>
<td><code>world_scope</code></td>
<td>de què està fet el món del worker</td>
<td>un paquet (reduït)</td>
<td>res</td>
</tr>
<tr>
<td><code>pin_pool</code></td>
<td>si l'empremta deixa el plugin compartir worker</td>
<td>no</td>
<td>sí</td>
</tr>
</tbody>
</table>
<p>El protocol no anomena cap format quan es refereix a una capacitat. Una prova registra un tercer format en temps
d'execució i el porta per <code>add</code>, <code>param_set</code>, <code>pin_set</code>, <code>pin_check</code> i <code>remove</code> sense tocar el protocol; una fila a la qual
falta una capacitat es refusa amb un motiu explícit, de manera que la prova surt vermella en lloc que el dimoni la compili
en silenci.</p>
<p>El que fa un amfitrió autònom amb un veredicte <code>in-process</code> és decisió seva: el veredicte viatja a l'empremta.</p>
`},n={en:e,ca:t};export{t as ca,n as default,e as en};