var e={slug:`plugins-that-change-a-callee-saved-register`,order:20,title:`Plugins that change a callee-saved register`,summary:`A plugin that returns with a callee-saved register changed breaks its host later and somewhere else. The host core now guards every plugin call, records the first change, and the qualification offers such a plugin isolated only.`,measured:`Raspberry Pi 5 (Debian 13, arm64) and an x86-64 desktop, October 2026; omx-clap-core 0.26.2.`,topic:`qualify`,toc:[{id:`what-happens`,title:`What happens`},{id:`how-it-was-found`,title:`How it was found`},{id:`the-guard`,title:`The guard`},{id:`what-is-done-with-such-a-plugin`,title:`What is done with such a plugin`},{id:`what-the-guard-does-not-show`,title:`What the guard does not show`},{id:`how-to-see-it-again`,title:`How to see it again`}],html:`<h2 id="what-happens">What happens</h2>
<p>Every calling convention gives a callee registers it must hand back as it found them:</p>
<ul>
<li>aarch64: x19 to x28, d8 to d15, FPCR</li>
<li>x86-64: rbx, rbp, r12 to r15, MXCSR's control bits, the x87 control word</li>
</ul>
<p>A caller may keep a value in one of them across the call. A plugin that returns with one changed replaces that value
without anything crashing at the time. The damage shows later, somewhere else.</p>
<h2 id="how-it-was-found">How it was found</h2>
<p>Four limiter plugins of one LV2 collection, measured on a Raspberry Pi 5, returned from <code>run()</code> with d14 and d15 changed,
from block 227 of the measurer's control sweep on, in 386 of its calls. The measurer kept its sample rate in d15. Its next
instance was opened at 0 Hz, the plugin sized a buffer from that rate and wrote through a NULL pointer: each of the four was
recorded as a crash (SIGSEGV).</p>
<p>Built at -O0, where the compiler keeps its locals in memory rather than in those registers, the measurer ran them to the
end. At -O2 it crashed every time. That difference is the mark of a clobbered register.</p>
<h2 id="the-guard">The guard</h2>
<p>The host core calls every plugin function through one guard, <code>omx_abi_call6</code> (<code>abi_guard.S</code>):</p>
<ul>
<li>it saves the callee-saved registers, calls, compares, and puts them back;</li>
<li>it records the first call that changed any: the registers, the plugin function and the run block.</li>
</ul>
<p>Its cost is 14 to 15 ns per call on a Raspberry Pi 5 and 5.6 ns on an x86-64 desktop. For 24 plugins at 48 kHz in
256-frame blocks that is 0.36 µs of each 5,333 µs block.</p>
<p>The LV2 measurer makes every plugin call through the same guard, <code>lilv_plugin_instantiate</code> and <code>lilv_instance_free</code>
included. Its record carries <code>abi</code>, for example:</p>
<pre><code>{&quot;clobbered&quot;:true,&quot;registers&quot;:[&quot;d14&quot;,&quot;d15&quot;],&quot;call&quot;:&quot;run&quot;,&quot;block&quot;:227,&quot;calls&quot;:386}
</code></pre>
<p>A plugin that never clobbered reads <code>{&quot;clobbered&quot;:false}</code>.</p>
<h2 id="what-is-done-with-such-a-plugin">What is done with such a plugin</h2>
<p>The verdict is <code>hosting.stability.callee-saved-clobbered</code>, rated conditional: the plugin is offered isolated only, in a
worker of its own, never in-process in the console and never in a shared chain. The guard keeps the host's own frame
whole; it does not protect the state of other plugins in the same process.</p>
<p>A worker reports <code>abi_clobber &lt;instance&gt; &lt;mask&gt; &lt;registers&gt; &lt;call&gt; &lt;block&gt;</code> on its feedback port, once per instance, and
plugin-hostd then moves the instance, with its state, to a worker of its own.</p>
<p>Under the guard the four limiters measure to the end: no allocation in <code>run()</code>, and every rate sounds. Their figures from
before the guard may have been corrupted and are not used.</p>
<h2 id="what-the-guard-does-not-show">What the guard does not show</h2>
<p>A plugin that crashed without the guard and runs to the end with it, recording no clobber, is not proven clean: the guard
changes the measurer's stack frame and may hide a memory fault. And a plugin that still crashes under the guard and at -O0
has its cause elsewhere.</p>
<h2 id="how-to-see-it-again">How to see it again</h2>
<p>The test fixture <code>native/fixtures/lv2-gain.c</code> of plugin-qualify, built with <code>-DFIXTURE_ABI_BREAKER</code>, returns from its third
<code>run()</code> with x19 and d15 changed (rbx and r15 on x86-64), in assembly, after the C <code>run()</code> has returned. The test
<code>src/lv2-measure-native.test.ts</code> measures it to the end and checks the record.</p>
`},t={slug:`plugins-that-change-a-callee-saved-register`,order:20,title:`Plugins que canvien un registre que el cridat ha de preservar`,summary:`Un plugin que torna amb un registre preservat canviat fa fallar l'amfitrió més tard i en un altre lloc. Ara el nucli de l'amfitrió protegeix cada crida a un plugin, n'enregistra el primer canvi i la qualificació només ofereix aquest plugin aïllat.`,measured:`Raspberry Pi 5 (Debian 13, arm64) i un ordinador x86-64, octubre del 2026; omx-clap-core 0.26.2.`,topic:`qualify`,toc:[{id:`que-passa`,title:`Què passa`},{id:`com-es-va-trobar`,title:`Com es va trobar`},{id:`la-proteccio`,title:`La protecció`},{id:`que-es-fa-amb-un-plugin-aixi`,title:`Què es fa amb un plugin així`},{id:`el-que-la-proteccio-no-demostra`,title:`El que la protecció no demostra`},{id:`com-tornar-ho-a-veure`,title:`Com tornar-ho a veure`}],html:`<h2 id="que-passa">Què passa</h2>
<p>Cada convenció de crides dona al cridat uns registres que ha de tornar tal com els ha trobat:</p>
<ul>
<li>aarch64: de x19 a x28, de d8 a d15, FPCR</li>
<li>x86-64: rbx, rbp, de r12 a r15, els bits de control de l'MXCSR, la paraula de control de l'x87</li>
</ul>
<p>El qui crida hi pot guardar un valor durant la crida. Un plugin que torna amb un d'aquests registres canviat en substitueix
el valor sense que res no falli en aquell moment. El dany es veu més tard, en un altre lloc.</p>
<h2 id="com-es-va-trobar">Com es va trobar</h2>
<p>Quatre plugins limiters d'una mateixa col·lecció LV2, mesurats en una Raspberry Pi 5, tornaven de <code>run()</code> amb d14 i d15
canviats, a partir del bloc 227 de l'escombratge de controls del mesurador, en 386 de les seves crides. El mesurador guardava
la freqüència de mostratge a d15. La instància següent es va obrir a 0 Hz, el plugin va dimensionar un búfer a partir
d'aquella freqüència i va escriure a través d'un punter NULL: cadascun dels quatre es va enregistrar com una fallada
(SIGSEGV).</p>
<p>Compilat a -O0, on el compilador guarda les variables locals a la memòria i no en aquests registres, el mesurador els va
fer córrer fins al final. A -O2 fallava cada vegada. Aquesta diferència és el senyal d'un registre trepitjat.</p>
<h2 id="la-proteccio">La protecció</h2>
<p>El nucli de l'amfitrió crida cada funció d'un plugin a través d'una sola protecció, <code>omx_abi_call6</code> (<code>abi_guard.S</code>):</p>
<ul>
<li>desa els registres preservats, crida, compara i els torna a posar;</li>
<li>enregistra la primera crida que n'ha canviat algun: els registres, la funció del plugin i el bloc.</li>
</ul>
<p>Costa de 14 a 15 ns per crida en una Raspberry Pi 5 i 5,6 ns en un ordinador x86-64. Per a 24 plugins a 48 kHz en blocs
de 256 mostres, són 0,36 µs de cada bloc de 5.333 µs.</p>
<p>El mesurador LV2 fa totes les crides al plugin a través de la mateixa protecció, també <code>lilv_plugin_instantiate</code> i
<code>lilv_instance_free</code>. El seu registre porta <code>abi</code>, per exemple:</p>
<pre><code>{&quot;clobbered&quot;:true,&quot;registers&quot;:[&quot;d14&quot;,&quot;d15&quot;],&quot;call&quot;:&quot;run&quot;,&quot;block&quot;:227,&quot;calls&quot;:386}
</code></pre>
<p>Un plugin que no ha trepitjat mai cap registre hi diu <code>{&quot;clobbered&quot;:false}</code>.</p>
<h2 id="que-es-fa-amb-un-plugin-aixi">Què es fa amb un plugin així</h2>
<p>El veredicte és <code>hosting.stability.callee-saved-clobbered</code>, qualificat de condicional: el plugin només s'ofereix aïllat, en
un worker propi, mai dins del procés de la consola ni en una cadena compartida. La protecció manté sencer el marc de
l'amfitrió; no protegeix l'estat dels altres plugins del mateix procés.</p>
<p>Un worker ho comunica pel seu port de retorn, <code>abi_clobber &lt;instance&gt; &lt;mask&gt; &lt;registers&gt; &lt;call&gt; &lt;block&gt;</code>, una vegada per
instància i aleshores plugin-hostd trasllada la instància, amb el seu estat, a un worker propi.</p>
<p>Amb la protecció, els quatre limiters es mesuren fins al final: cap reserva de memòria a <code>run()</code> i totes les freqüències
sonen. Les seves xifres d'abans de la protecció poden estar corrompudes i no es fan servir.</p>
<h2 id="el-que-la-proteccio-no-demostra">El que la protecció no demostra</h2>
<p>Un plugin que fallava sense la protecció i arriba al final amb ella, sense enregistrar cap canvi, no queda demostrat net: la
protecció canvia el marc de pila del mesurador i pot amagar un error de memòria. I un plugin que encara falla amb la
protecció i a -O0 té la causa en un altre lloc.</p>
<h2 id="com-tornar-ho-a-veure">Com tornar-ho a veure</h2>
<p>La peça de prova <code>native/fixtures/lv2-gain.c</code> de plugin-qualify, compilada amb <code>-DFIXTURE_ABI_BREAKER</code>, torna del seu tercer
<code>run()</code> amb x19 i d15 canviats (rbx i r15 en x86-64), en assemblador, després que el <code>run()</code> de C hagi tornat. La prova
<code>src/lv2-measure-native.test.ts</code> el mesura fins al final i en comprova el registre.</p>
`},n={en:e,ca:t};export{t as ca,n as default,e as en};