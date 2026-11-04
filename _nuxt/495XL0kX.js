var e={slug:`why-lv2-plugins-on-zynthian-need-inferred-port-groups`,order:60,title:`Why most LV2 plugins on a Zynthian need inferred port groups`,summary:`Half the LV2 plugins installed on a Zynthian have more than four controls and no port groups, so the touchscreen cuts them into screens of four in port order. A generated bundle that replaces the plugin's own description, never its files, can add groups that every Zynthian consumer reads.`,measured:`A Raspberry Pi 5 running ZynthianOS Vangelis-2610.1, October 2026.`,topic:`zynthian`,toc:[{id:`the-measured-gap`,title:`The measured gap`},{id:`where-each-zynthian-consumer-reads`,title:`Where each Zynthian consumer reads`},{id:`why-an-added-bundle-cannot-complement-a-plugin`,title:`Why an added bundle cannot complement a plugin`},{id:`the-channel-that-works-a-replacing-bundle`,title:`The channel that works: a replacing bundle`},{id:`which-groups`,title:`Which groups`},{id:`when-a-proxy-is-needed-instead`,title:`When a proxy is needed instead`},{id:`what-proves-it-on-the-device`,title:`What proves it on the device`}],html:`<h2 id="the-measured-gap">The measured gap</h2>
<p>On a Zynthian image (ZynthianOS Vangelis-2610.1) 1243 installed LV2 plugins have controls, and only 105 of them declare
port groups. 623 have no groups and more than four controls, so the touchscreen cuts them into screens of four, in port
order, whatever the controls are.</p>
<h2 id="where-each-zynthian-consumer-reads">Where each Zynthian consumer reads</h2>
<ul>
<li><strong>MOD-UI</strong> finds a MOD GUI in any loaded file whose subject is the plugin's URI. That is why a generated, separate GUI
bundle already works.</li>
<li><strong>The touchscreen engine</strong> reads ports through lilv. On each port it reads <code>pg:group</code>, and on the group node
<code>lv2:symbol</code> (required: without it every port falls into one &quot;params&quot; group), <code>lv2:name</code> (falling back to <code>rdfs:label</code>)
and <code>lv2:displayPriority</code>. Screens of four are cut per group, sorted by display priority. It never reads <code>pg:mainInput</code>,
<code>lv2:portGroups</code>, <code>units:unit</code> or <code>rdfs:comment</code> on a port, and no layout file keyed by plugin URI or port symbol exists.
The plugin's name, type, category and description are cached per URI after the first scan, so a changed description
needs a regenerate from the web configuration.</li>
</ul>
<h2 id="why-an-added-bundle-cannot-complement-a-plugin">Why an added bundle cannot complement a plugin</h2>
<p>lilv ignores a second bundle that declares a plugin it already loaded (&quot;Duplicate plugin ... ignored&quot;), and a plugin's
ports are anonymous nodes, so a separate file has nothing stable to attach <code>pg:group</code> to. Tried on a small envelope plugin,
the groups stayed empty.</p>
<h2 id="the-channel-that-works-a-replacing-bundle">The channel that works: a replacing bundle</h2>
<p>lilv's duplicate rule is a version comparison, not a flat refusal: a second bundle for the same URI <strong>replaces</strong> the one
already loaded when its <code>lv2:minorVersion</code> or <code>lv2:microVersion</code> is newer; an equal or older one is dropped. The test that
found empty groups had used an equal version.</p>
<p>So, for a plugin OpenMixer does not own, the complement is a generated bundle that:</p>
<ul>
<li>restates the plugin's own description in full (every port, every parameter, as the plugin states it), read through the
Turtle parser, never retyped;</li>
<li>keeps <code>lv2:binary</code> pointing at the plugin's installed library: no shim;</li>
<li>raises <code>lv2:microVersion</code> by one over the installed value, so lilv loads it and drops the original;</li>
<li>adds group nodes, each with <code>lv2:symbol</code>, <code>lv2:name</code> and <code>lv2:displayPriority</code>, attached to the restated ports <strong>by port
symbol</strong>: symbols are stable, blank nodes are not;</li>
<li>is marked with a file beside it, so a later run tells its own output from the plugin's bundle and never touches the
plugin's installed files.</li>
</ul>
<p>Deleting the marked bundle restores the original: lilv has nothing newer to prefer and loads the plugin's own files again.
A plugin that already declares its own groups is left alone, with no marker and nothing generated.</p>
<h2 id="which-groups">Which groups</h2>
<p>The groups are inferred automatically, over every installed plugin at install time, never laid out by hand per plugin. The
rules, in order: the plugin's own partial groups; <code>lv2:designation</code>; a shared name or symbol prefix (&quot;Band 1 …&quot;, <code>b1_</code>);
a shared unit; a contiguous run of port indexes; the plugin's own MOD GUI layout when it has one. A plugin the rules cannot
group with confidence gets no complement at all, never a guessed layout.</p>
<p>The rules and the bundle writer are specified by omx-panel: <a href="/projects/omx-panel/group-inference">group inference</a> and
<a href="/projects/omx-panel/lv2-complement">the LV2 complement</a>.</p>
<h2 id="when-a-proxy-is-needed-instead">When a proxy is needed instead</h2>
<p>A proxy bundle, with its own URI, ports and groups and a shim forwarding audio, parameters and state to plugin-hostd, is
only the exception: for a plugin whose description the Turtle reader cannot parse, whose version field is already at its
ceiling, or whose files declare more than one subject for the same URI.</p>
<h2 id="what-proves-it-on-the-device">What proves it on the device</h2>
<ol>
<li>lilv, loaded after the generator, sees the inferred groups on a matched plugin, and the original bundle lost the
replace.</li>
<li>Zynthian's port reader returns those groups, and the touchscreen shows the expected screens.</li>
<li>A plugin that declares its own full groups loads exactly as before: no marker, the same bytes.</li>
<li>Deleting a marked bundle brings back the plugin's original files.</li>
<li>A complemented plugin still runs through plugin-hostd unchanged: add, parameters and state behave as for any LV2
plugin.</li>
</ol>
`},t={slug:`why-lv2-plugins-on-zynthian-need-inferred-port-groups`,order:60,title:`Per què la majoria dels plugins LV2 d'un Zynthian necessiten grups de ports inferits`,summary:`La meitat dels plugins LV2 instal·lats en un Zynthian tenen més de quatre controls i cap grup de ports i la pantalla tàctil els talla en pantalles de quatre en l'ordre dels ports. Un paquet generat que substitueix la descripció del plugin, mai els seus fitxers, hi pot afegir grups que llegeixen tots els consumidors de Zynthian.`,measured:`Una Raspberry Pi 5 amb ZynthianOS Vangelis-2610.1, octubre del 2026.`,topic:`zynthian`,toc:[{id:`la-mancanca-mesurada`,title:`La mancança mesurada`},{id:`on-llegeix-cada-consumidor-de-zynthian`,title:`On llegeix cada consumidor de Zynthian`},{id:`per-que-un-paquet-afegit-no-pot-completar-un-plugin`,title:`Per què un paquet afegit no pot completar un plugin`},{id:`el-canal-que-funciona-un-paquet-que-substitueix`,title:`El canal que funciona: un paquet que substitueix`},{id:`quins-grups`,title:`Quins grups`},{id:`quan-cal-un-intermediari`,title:`Quan cal un intermediari`},{id:`que-ho-demostra-a-l-aparell`,title:`Què ho demostra a l'aparell`}],html:`<h2 id="la-mancanca-mesurada">La mancança mesurada</h2>
<p>En una imatge de Zynthian (ZynthianOS Vangelis-2610.1) hi ha 1243 plugins LV2 instal·lats amb controls i només 105
declaren grups de ports. 623 no tenen grups i tenen més de quatre controls, de manera que la pantalla tàctil els talla en
pantalles de quatre, en l'ordre dels ports, siguin quins siguin els controls.</p>
<h2 id="on-llegeix-cada-consumidor-de-zynthian">On llegeix cada consumidor de Zynthian</h2>
<ul>
<li><strong>MOD-UI</strong> troba una MOD GUI en qualsevol fitxer carregat el subjecte del qual és l'URI del plugin. Per això ja funciona
un paquet de GUI generat a part.</li>
<li><strong>El motor de la pantalla tàctil</strong> llegeix els ports a través de lilv. En cada port llegeix <code>pg:group</code> i en el node del
grup <code>lv2:symbol</code> (obligatori: sense ell tots els ports cauen en un sol grup &quot;params&quot;), <code>lv2:name</code> (o, si no hi és,
<code>rdfs:label</code>) i <code>lv2:displayPriority</code>. Les pantalles de quatre es tallen per grup, ordenades per prioritat de
visualització. Mai no llegeix <code>pg:mainInput</code>, <code>lv2:portGroups</code>, <code>units:unit</code> ni <code>rdfs:comment</code> en un port i no existeix
cap fitxer de disposició indexat per URI de plugin o per símbol de port. El nom, el tipus, la categoria i la descripció
del plugin es desen per URI després de la primera exploració, de manera que una descripció canviada necessita una
regeneració des de la configuració web.</li>
</ul>
<h2 id="per-que-un-paquet-afegit-no-pot-completar-un-plugin">Per què un paquet afegit no pot completar un plugin</h2>
<p>lilv ignora un segon paquet que declara un plugin que ja ha carregat (&quot;Duplicate plugin ... ignored&quot;) i els ports d'un
plugin són nodes anònims, de manera que un fitxer a part no té res d'estable on lligar <code>pg:group</code>. Provat amb un petit
plugin d'envolupant, els grups van quedar buits.</p>
<h2 id="el-canal-que-funciona-un-paquet-que-substitueix">El canal que funciona: un paquet que substitueix</h2>
<p>La regla dels duplicats de lilv és una comparació de versions, no un refús pla: un segon paquet per al mateix URI
<strong>substitueix</strong> el que ja s'ha carregat quan el seu <code>lv2:minorVersion</code> o <code>lv2:microVersion</code> és més nou; un d'igual o més
antic es descarta. La prova que va trobar els grups buits feia servir una versió igual.</p>
<p>Per tant, per a un plugin que no és d'OpenMixer, el paquet complementari és un paquet generat que:</p>
<ul>
<li>reprodueix sencera la descripció del plugin (cada port, cada paràmetre, tal com els declara el plugin), llegida amb
l'analitzador de Turtle, mai reescrita a mà;</li>
<li>manté <code>lv2:binary</code> apuntant a la biblioteca instal·lada del plugin: cap intermediari;</li>
<li>augmenta en un el <code>lv2:microVersion</code> instal·lat, perquè lilv el carregui i descarti l'original;</li>
<li>afegeix nodes de grup, cadascun amb <code>lv2:symbol</code>, <code>lv2:name</code> i <code>lv2:displayPriority</code>, lligats als ports reproduïts <strong>pel
símbol del port</strong>: els símbols són estables, els nodes anònims no;</li>
<li>porta un fitxer de marca al costat, perquè una execució posterior distingeixi la seva sortida del paquet del plugin i no
toqui mai els fitxers instal·lats del plugin.</li>
</ul>
<p>Esborrar el paquet marcat restaura l'original: lilv no té res de més nou per preferir i torna a carregar els fitxers del
plugin. Un plugin que ja declara els seus propis grups es deixa tal com és, sense marca i sense generar res.</p>
<h2 id="quins-grups">Quins grups</h2>
<p>Els grups s'infereixen automàticament, sobre tots els plugins instal·lats en el moment d'instal·lar, mai amb una disposició
feta a mà per a cada plugin. Les regles, per ordre: els grups parcials del mateix plugin; <code>lv2:designation</code>; un prefix
comú de nom o de símbol (&quot;Band 1 …&quot;, <code>b1_</code>); una unitat comuna; una tirada contigua d'índexs de port; la disposició de la
MOD GUI del plugin si en té. Un plugin que les regles no poden agrupar amb seguretat no rep cap paquet complementari, mai una
disposició endevinada.</p>
<p>Les regles i l'escriptor del paquet els especifica omx-panel: <a href="/projects/omx-panel/group-inference">inferència de grups</a> i
<a href="/projects/omx-panel/lv2-complement">el paquet complementari LV2</a>.</p>
<h2 id="quan-cal-un-intermediari">Quan cal un intermediari</h2>
<p>Un paquet intermediari, amb URI, ports i grups propis i una capa que reenvia l'àudio, els paràmetres i l'estat a
plugin-hostd, és només l'excepció: per a un plugin la descripció del qual l'analitzador de Turtle no pot llegir, el camp de
versió del qual ja és al màxim o els fitxers del qual declaren més d'un subjecte per al mateix URI.</p>
<h2 id="que-ho-demostra-a-l-aparell">Què ho demostra a l'aparell</h2>
<ol>
<li>lilv, carregat després del generador, veu els grups inferits en un plugin que ha coincidit amb les regles i el paquet
original ha perdut la substitució.</li>
<li>El lector de ports de Zynthian retorna aquests grups i la pantalla tàctil mostra les pantalles esperades.</li>
<li>Un plugin que declara tots els seus grups es carrega exactament com abans: sense marca, els mateixos bytes.</li>
<li>Esborrar un paquet marcat torna els fitxers originals del plugin.</li>
<li>Un plugin completat així continua corrent per plugin-hostd sense canvis: l'addició, els paràmetres i l'estat funcionen com
en qualsevol plugin LV2.</li>
</ol>
`},n={en:e,ca:t};export{t as ca,n as default,e as en};