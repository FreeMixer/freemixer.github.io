var e=`omx-plugins`,t=`6d452d917352f7134be9937c71f6ecc89d43b916`,n=[{slug:``,src:`README.md`,title:`omx-plugins`,source:`https://github.com/FreeMixer/omx-plugins/blob/6d452d917352f7134be9937c71f6ecc89d43b916/README.md`,toc:[{id:`the-plugins`,title:`The plugins`},{id:`parameters`,title:`Parameters`},{id:`factory-presets`,title:`Factory presets`},{id:`install`,title:`Install`},{id:`licence`,title:`Licence`}],html:`<h1 id="omx-plugins">omx-plugins</h1>
<p>The effects of the OpenMixer console, as plugins you can load
in any host: <strong>CLAP</strong> for Bitwig, REAPER, Carla, openmixer and every other CLAP host, and <strong>LV2</strong> for
Ardour, Carla, MOD and Zynthian, the MOD GUI included.</p>
<p>The DSP inside each one is the console's own (the <a href="https://github.com/FreeMixer/omx-dsp">omx-dsp</a>
library), so a plugin sounds the same in your DAW as on the desk, sample for sample. Each plugin is
drawn from one declaration: its CLAP parameters, its LV2 ports and its MOD GUI cannot disagree.</p>
<h2 id="the-plugins">The plugins</h2>
<table>
<thead>
<tr>
<th>Plugin</th>
<th>CLAP id</th>
<th>LV2 URI</th>
<th>What it does</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>omx balancer</strong></td>
<td><code>org.openmixer.balancer</code></td>
<td><code>urn:openmixer:balancer</code></td>
<td>Walks four bands slowly toward a target tone, so a mix settles toward a pink-noise balance without chasing notes.</td>
</tr>
<tr>
<td><strong>omx chorus</strong></td>
<td><code>org.openmixer.chorus</code></td>
<td><code>urn:openmixer:chorus</code></td>
<td>The console's chorus: up to four voices read one modulated delay line, the right leg's sweep offset by the spread, mixed with the dry signal.</td>
</tr>
<tr>
<td><strong>omx clipper</strong></td>
<td><code>org.openmixer.clipper</code></td>
<td><code>urn:openmixer:clipper</code></td>
<td>Clips the peaks at a ceiling, with drive in front and an adjustable softness of the bend.</td>
</tr>
<tr>
<td><strong>omx comp</strong></td>
<td><code>org.openmixer.comp</code></td>
<td><code>urn:openmixer:comp</code></td>
<td>The console's compressor: threshold, ratio and knee set how hard it holds the level down, attack and release how fast, with makeup gain and a dry/wet mix. Kind picks the RMS detector (Compressor) or the peak detector (Limiter), and detector oversampling can run the control path at 4x; detector topology has it hear the input (feedforward) or its own output (feedback). Its detector can listen to a key routed to its sidechain input instead, through a high-pass, a low-pass and a tilt, on the louder leg, the mid or the side, with a hold; key listen puts what the detector hears on the output, and duck holds the reduction to a set depth. The DSP is omx-dsp's &lt;omxdsp/fx/omx_comp_instance.h&gt;, the console's own compressor.</td>
</tr>
<tr>
<td><strong>omx deesser</strong></td>
<td><code>org.openmixer.deesser</code></td>
<td><code>urn:openmixer:deesser</code></td>
<td>The console's de-esser: a detector on a band around the sibilance drives the compressor's gain computer, and the reduction lands on that band alone or on the whole signal.</td>
</tr>
<tr>
<td><strong>omx delay</strong></td>
<td><code>org.openmixer.delay</code></td>
<td><code>urn:openmixer:delay</code></td>
<td>Stereo delay up to 2000 ms: feedback through a tone filter that darkens each repeat, ping-pong, wet/dry mix. Zero latency, real-time safe.</td>
</tr>
<tr>
<td><strong>omx drive</strong></td>
<td><code>org.openmixer.drive</code></td>
<td><code>urn:openmixer:drive</code></td>
<td>The console's drive: one waveshaper (soft, tape, tube or exciter) run inside the console's 4x oversampler, on the full band, the lows, the highs or a tilt, with drive, character, wet/dry mix and trim. Stereo, real-time safe.</td>
</tr>
<tr>
<td><strong>omx dyneq</strong></td>
<td><code>org.openmixer.dyneq</code></td>
<td><code>urn:openmixer:dyneq</code></td>
<td>A six-band dynamic EQ: each band is an EQ bell or shelf whose gain also moves with the level of its own band, cutting above a threshold (down) or lifting below it (up), held to a range, so a harsh or boomy band is tamed only while it is too loud.</td>
</tr>
<tr>
<td><strong>omx eq8</strong></td>
<td><code>org.openmixer.eq8</code></td>
<td><code>urn:openmixer:eq8</code></td>
<td>The console's channel EQ in its 8-band form: 8 parametric bands (bell, shelves, notch, all-pass) plus high- and low-pass filters at 12 or 24 dB/oct. Stereo, zero latency.</td>
</tr>
<tr>
<td><strong>omx eq16</strong></td>
<td><code>org.openmixer.eq16</code></td>
<td><code>urn:openmixer:eq16</code></td>
<td>The console's channel EQ in its 16-band form: 16 parametric bands (bell, shelves, notch, all-pass) plus high- and low-pass filters at 12 or 24 dB/oct. Stereo, zero latency.</td>
</tr>
<tr>
<td><strong>omx eq32</strong></td>
<td><code>org.openmixer.eq32</code></td>
<td><code>urn:openmixer:eq32</code></td>
<td>The console's channel EQ in its 32-band form: 32 parametric bands (bell, shelves, notch, all-pass) plus high- and low-pass filters at 12 or 24 dB/oct. Stereo, zero latency.</td>
</tr>
<tr>
<td><strong>omx flanger</strong></td>
<td><code>org.openmixer.flanger</code></td>
<td><code>urn:openmixer:flanger</code></td>
<td>The console's flanger: one modulated short delay with signed feedback, swept by one oscillator and mixed with the dry signal.</td>
</tr>
<tr>
<td><strong>omx geq</strong></td>
<td><code>org.openmixer.geq</code></td>
<td><code>urn:openmixer:geq</code></td>
<td>The console's 31-band graphic EQ: one fader per ISO third-octave band, 20 Hz to 20 kHz, ±15 dB each, designed in double precision so the lowest bands hold their shape at 192 kHz. Stereo, zero latency.</td>
</tr>
<tr>
<td><strong>omx glue</strong></td>
<td><code>org.openmixer.glue</code></td>
<td><code>urn:openmixer:glue</code></td>
<td>A bus compressor with the detents of a classic console: stepped ratio, attack and release, a key filter and a dry mix.</td>
</tr>
<tr>
<td><strong>omx keyed-gate</strong></td>
<td><code>org.openmixer.keyed-gate</code></td>
<td><code>urn:openmixer:keyed-gate</code></td>
<td>The console's channel gate with a sidechain key: the detector listens to the key your host routes to it, or to the signal itself. One gain for both legs, so the stereo image never shifts. Real-time safe.</td>
</tr>
<tr>
<td><strong>omx limiter</strong></td>
<td><code>org.openmixer.limiter</code></td>
<td><code>urn:openmixer:limiter</code></td>
<td>The precision limiter: a look-ahead, true-peak, stereo-linked brickwall.</td>
</tr>
<tr>
<td><strong>omx loudlevel</strong></td>
<td><code>org.openmixer.loudlevel</code></td>
<td><code>urn:openmixer:loudlevel</code></td>
<td>Holds a signal at a loudness target by moving its gain slowly, with a gate so pauses are left alone.</td>
</tr>
<tr>
<td><strong>omx multiband</strong></td>
<td><code>org.openmixer.multiband</code></td>
<td><code>urn:openmixer:multiband</code></td>
<td>A multiband compressor: two to five bands split by Linkwitz-Riley crossovers, each band its own compressor with threshold, ratio, attack, release, make-up, solo and bypass, then a mix and an output gain, for in-ear mixes, vocals and playback buses.</td>
</tr>
<tr>
<td><strong>omx phaser</strong></td>
<td><code>org.openmixer.phaser</code></td>
<td><code>urn:openmixer:phaser</code></td>
<td>The console's phaser: identical all-pass sections swept in octaves by one oscillator, with feedback around the chain and a wet/dry mix.</td>
</tr>
<tr>
<td><strong>omx pitch</strong></td>
<td><code>org.openmixer.pitch</code></td>
<td><code>urn:openmixer:pitch</code></td>
<td>The console's pitch shifter: shifts both channels up or down by semitones and cents, without changing their length, mixed with the dry signal.</td>
</tr>
<tr>
<td><strong>omx plosive</strong></td>
<td><code>org.openmixer.plosive</code></td>
<td><code>urn:openmixer:plosive</code></td>
<td>Softens the p pops and hard t and k consonants of a voice, cutting each only while it bursts.</td>
</tr>
<tr>
<td><strong>omx reverb</strong></td>
<td><code>org.openmixer.reverb</code></td>
<td><code>urn:openmixer:reverb</code></td>
<td>The console's reverb: room, plate, hall, reverse and gated algorithms with pre-delay, size, damping, width and low and high cuts, mixed with the dry signal.</td>
</tr>
<tr>
<td><strong>omx rotary</strong></td>
<td><code>org.openmixer.rotary</code></td>
<td><code>urn:openmixer:rotary</code></td>
<td>The console's rotary speaker: a drum rotor on the low band and a horn rotor on the high band, with stop, slow and fast speeds, mixed with the dry signal.</td>
</tr>
<tr>
<td><strong>omx spring</strong></td>
<td><code>org.openmixer.spring</code></td>
<td><code>urn:openmixer:spring</code></td>
<td>A spring reverb: a delay, a chain of all-passes and a darkening loop, with decay, length, tension and damping.</td>
</tr>
<tr>
<td><strong>omx strip</strong></td>
<td><code>org.openmixer.strip</code></td>
<td><code>urn:openmixer:strip</code></td>
<td>The console's channel strip in one plugin: input trim, HPF/LPF, gate, four-band EQ and compressor, in the desk's order or any other. Stereo, real-time safe.</td>
</tr>
<tr>
<td><strong>omx suboct</strong></td>
<td><code>org.openmixer.suboct</code></td>
<td><code>urn:openmixer:suboct</code></td>
<td>Adds a note one or two octaves below a single played line, by dividing its pitch, with a tracking range and a gate for quiet input.</td>
</tr>
<tr>
<td><strong>omx transient</strong></td>
<td><code>org.openmixer.transient</code></td>
<td><code>urn:openmixer:transient</code></td>
<td>The console's transient designer: more or less attack and sustain, from two envelope contrasts, with no threshold to set.</td>
</tr>
<tr>
<td><strong>omx tremolo</strong></td>
<td><code>org.openmixer.tremolo</code></td>
<td><code>urn:openmixer:tremolo</code></td>
<td>The console's tremolo and auto-pan: one oscillator turned into a level change on both legs, or into a left-right pan.</td>
</tr>
<tr>
<td><strong>omx upward</strong></td>
<td><code>org.openmixer.upward</code></td>
<td><code>urn:openmixer:upward</code></td>
<td>Lifts what is quiet toward a threshold, by a ratio and up to a limit, and leaves the loud alone.</td>
</tr>
</tbody>
</table>
<h3 id="omx-balancer">omx balancer</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Amount</td>
<td>0 to 100 %, whole steps</td>
<td>0 %</td>
</tr>
<tr>
<td>Range</td>
<td>1 to 12 dB</td>
<td>3 dB</td>
</tr>
<tr>
<td>Speed</td>
<td>0.1 to 6 dB</td>
<td>0.5 dB</td>
</tr>
<tr>
<td>Slope</td>
<td>-6 to 0 dB/oct</td>
<td>-3 dB/oct</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-chorus">omx chorus</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Spread</td>
<td>0 to 0.5</td>
<td>0</td>
</tr>
<tr>
<td>Rate</td>
<td>0.05 to 8 Hz</td>
<td>0.6 Hz</td>
</tr>
<tr>
<td>Depth</td>
<td>0 to 12 ms</td>
<td>4 ms</td>
</tr>
<tr>
<td>Voices</td>
<td>1 to 4, whole steps</td>
<td>3</td>
</tr>
<tr>
<td>Mix</td>
<td>0 to 100 %</td>
<td>35 %</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-clipper">omx clipper</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Drive</td>
<td>0 to 24 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Ceiling</td>
<td>-24 to 0 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Softness</td>
<td>0 to 100 %, whole steps</td>
<td>0 %</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-comp">omx comp</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Threshold</td>
<td>-60 to 0 dB, whole steps</td>
<td>-18 dB</td>
</tr>
<tr>
<td>Ratio</td>
<td>1 to 20</td>
<td>4</td>
</tr>
<tr>
<td>Knee</td>
<td>0 to 24 dB</td>
<td>6 dB</td>
</tr>
<tr>
<td>Attack</td>
<td>0.1 to 100 ms</td>
<td>5 ms</td>
</tr>
<tr>
<td>Release</td>
<td>5 to 3000 ms, whole steps</td>
<td>200 ms</td>
</tr>
<tr>
<td>Makeup</td>
<td>0 to 24 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Mix</td>
<td>0 to 100 %, whole steps</td>
<td>100 %</td>
</tr>
<tr>
<td>Kind</td>
<td>Compressor / Limiter</td>
<td>Compressor</td>
</tr>
<tr>
<td>Detector Oversampling</td>
<td>Auto / Off / 4x</td>
<td>Auto</td>
</tr>
<tr>
<td>Detector Topology</td>
<td>Feedforward / Feedback</td>
<td>Feedforward</td>
</tr>
<tr>
<td>Key Source</td>
<td>Self / Sidechain</td>
<td>Self</td>
</tr>
<tr>
<td>Key HP</td>
<td>0 to 2000 Hz, whole steps</td>
<td>0 Hz</td>
</tr>
<tr>
<td>Key LP</td>
<td>0 to 20000 Hz, whole steps</td>
<td>0 Hz</td>
</tr>
<tr>
<td>Key Tilt</td>
<td>-6 to 6 dB/oct</td>
<td>0 dB/oct</td>
</tr>
<tr>
<td>Key Listen</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Hold</td>
<td>0 to 2000 ms, whole steps</td>
<td>0 ms</td>
</tr>
<tr>
<td>Detect Link</td>
<td>Linked / Mid / Side / Max</td>
<td>Linked</td>
</tr>
<tr>
<td>Duck</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Duck Range</td>
<td>-40 to 0 dB, whole steps</td>
<td>-12 dB</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-deesser">omx deesser</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Freq</td>
<td>2000 to 16000 Hz, whole steps</td>
<td>7000 Hz</td>
</tr>
<tr>
<td>Width</td>
<td>0.25 to 4 oct</td>
<td>1 oct</td>
</tr>
<tr>
<td>Threshold</td>
<td>-60 to 0 dB</td>
<td>-30 dB</td>
</tr>
<tr>
<td>Ratio</td>
<td>1 to 20</td>
<td>4</td>
</tr>
<tr>
<td>Range</td>
<td>-24 to 0 dB</td>
<td>-12 dB</td>
</tr>
<tr>
<td>Attack</td>
<td>0.1 to 50 ms</td>
<td>1 ms</td>
</tr>
<tr>
<td>Release</td>
<td>5 to 500 ms, whole steps</td>
<td>60 ms</td>
</tr>
<tr>
<td>Mode</td>
<td>Split / Wideband</td>
<td>Split</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-delay">omx delay</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Time</td>
<td>0 to 2000 ms, whole steps</td>
<td>300 ms</td>
</tr>
<tr>
<td>Feedback</td>
<td>0 to 0.99</td>
<td>0.3</td>
</tr>
<tr>
<td>Mix (wet)</td>
<td>0 to 1</td>
<td>0.3</td>
</tr>
<tr>
<td>Tone (0 bright, 1 dark repeats)</td>
<td>0 to 1</td>
<td>0.3</td>
</tr>
<tr>
<td>Ping-pong</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Taps (engaged read taps of the one delay line)</td>
<td>1 to 4, whole steps</td>
<td>1</td>
</tr>
<tr>
<td>Tap 1 gain</td>
<td>0 to 1</td>
<td>1</td>
</tr>
<tr>
<td>Tap 1 pan (left to right)</td>
<td>-1 to 1</td>
<td>0</td>
</tr>
<tr>
<td>Tap 2 time (a share of the delay time)</td>
<td>1/4 to 3</td>
<td>1/2</td>
</tr>
<tr>
<td>Tap 2 gain</td>
<td>0 to 1</td>
<td>0.7</td>
</tr>
<tr>
<td>Tap 2 pan (left to right)</td>
<td>-1 to 1</td>
<td>-0.5</td>
</tr>
<tr>
<td>Tap 3 time (a share of the delay time)</td>
<td>1/4 to 3</td>
<td>3/4</td>
</tr>
<tr>
<td>Tap 3 gain</td>
<td>0 to 1</td>
<td>0.5</td>
</tr>
<tr>
<td>Tap 3 pan (left to right)</td>
<td>-1 to 1</td>
<td>0.5</td>
</tr>
<tr>
<td>Tap 4 time (a share of the delay time)</td>
<td>1/4 to 3</td>
<td>3/2</td>
</tr>
<tr>
<td>Tap 4 gain</td>
<td>0 to 1</td>
<td>0.35</td>
</tr>
<tr>
<td>Tap 4 pan (left to right)</td>
<td>-1 to 1</td>
<td>0</td>
</tr>
</tbody>
</table>
<p>With one tap the delay is the single-tap echo. Raising Taps adds the second to fourth reads of the same line, each with its own time, gain and pan; the feedback comes from the longest engaged tap, so a pattern repeats as a whole.</p>
<p>Plus the host's bypass. The tone filter holds the same corner at every sample rate, so a session
moved from 48 to 96 kHz sounds the same.</p>
<h3 id="omx-drive">omx drive</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Drive</td>
<td>0 to 36 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Character</td>
<td>-1 to 1</td>
<td>0</td>
</tr>
<tr>
<td>Band Frequency</td>
<td>20 to 20000 Hz, whole steps</td>
<td>2000 Hz</td>
</tr>
<tr>
<td>Mix</td>
<td>0 to 100 %</td>
<td>100 %</td>
</tr>
<tr>
<td>Trim</td>
<td>-24 to 12 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Curve</td>
<td>Soft / Tape / Tube / Exciter</td>
<td>Soft</td>
</tr>
<tr>
<td>Band</td>
<td>Full / Low / High / Tilt</td>
<td>Full</td>
</tr>
<tr>
<td>Auto Gain</td>
<td>off / on</td>
<td>on</td>
</tr>
<tr>
<td>Stereo Link</td>
<td>off / on</td>
<td>on</td>
</tr>
<tr>
<td>HF Roll-off</td>
<td>Off / 12 kHz / 16 kHz</td>
<td>Off</td>
</tr>
<tr>
<td>Oversampling</td>
<td>1 / 2 / 4</td>
<td>4</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-dyneq">omx dyneq</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Band 1 On</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 2 On</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 3 On</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 4 On</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 5 On</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 6 On</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 1 Type</td>
<td>Bell / Low Shelf / High Shelf</td>
<td>Bell</td>
</tr>
<tr>
<td>Band 2 Type</td>
<td>Bell / Low Shelf / High Shelf</td>
<td>Bell</td>
</tr>
<tr>
<td>Band 3 Type</td>
<td>Bell / Low Shelf / High Shelf</td>
<td>Bell</td>
</tr>
<tr>
<td>Band 4 Type</td>
<td>Bell / Low Shelf / High Shelf</td>
<td>Bell</td>
</tr>
<tr>
<td>Band 5 Type</td>
<td>Bell / Low Shelf / High Shelf</td>
<td>Bell</td>
</tr>
<tr>
<td>Band 6 Type</td>
<td>Bell / Low Shelf / High Shelf</td>
<td>Bell</td>
</tr>
<tr>
<td>Band 1 Freq</td>
<td>20 to 20000 Hz, whole steps</td>
<td>40 Hz</td>
</tr>
<tr>
<td>Band 2 Freq</td>
<td>20 to 20000 Hz, whole steps</td>
<td>125 Hz</td>
</tr>
<tr>
<td>Band 3 Freq</td>
<td>20 to 20000 Hz, whole steps</td>
<td>400 Hz</td>
</tr>
<tr>
<td>Band 4 Freq</td>
<td>20 to 20000 Hz, whole steps</td>
<td>1250 Hz</td>
</tr>
<tr>
<td>Band 5 Freq</td>
<td>20 to 20000 Hz, whole steps</td>
<td>4000 Hz</td>
</tr>
<tr>
<td>Band 6 Freq</td>
<td>20 to 20000 Hz, whole steps</td>
<td>12500 Hz</td>
</tr>
<tr>
<td>Band 1 Gain</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Band 2 Gain</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Band 3 Gain</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Band 4 Gain</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Band 5 Gain</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Band 6 Gain</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Band 1 Q</td>
<td>0.3 to 8</td>
<td>1</td>
</tr>
<tr>
<td>Band 2 Q</td>
<td>0.3 to 8</td>
<td>1</td>
</tr>
<tr>
<td>Band 3 Q</td>
<td>0.3 to 8</td>
<td>1</td>
</tr>
<tr>
<td>Band 4 Q</td>
<td>0.3 to 8</td>
<td>1</td>
</tr>
<tr>
<td>Band 5 Q</td>
<td>0.3 to 8</td>
<td>1</td>
</tr>
<tr>
<td>Band 6 Q</td>
<td>0.3 to 8</td>
<td>1</td>
</tr>
<tr>
<td>Band 1 Dynamics</td>
<td>Off / Down / Up</td>
<td>Off</td>
</tr>
<tr>
<td>Band 2 Dynamics</td>
<td>Off / Down / Up</td>
<td>Off</td>
</tr>
<tr>
<td>Band 3 Dynamics</td>
<td>Off / Down / Up</td>
<td>Off</td>
</tr>
<tr>
<td>Band 4 Dynamics</td>
<td>Off / Down / Up</td>
<td>Off</td>
</tr>
<tr>
<td>Band 5 Dynamics</td>
<td>Off / Down / Up</td>
<td>Off</td>
</tr>
<tr>
<td>Band 6 Dynamics</td>
<td>Off / Down / Up</td>
<td>Off</td>
</tr>
<tr>
<td>Band 1 Threshold</td>
<td>-60 to 0 dB</td>
<td>-30 dB</td>
</tr>
<tr>
<td>Band 2 Threshold</td>
<td>-60 to 0 dB</td>
<td>-30 dB</td>
</tr>
<tr>
<td>Band 3 Threshold</td>
<td>-60 to 0 dB</td>
<td>-30 dB</td>
</tr>
<tr>
<td>Band 4 Threshold</td>
<td>-60 to 0 dB</td>
<td>-30 dB</td>
</tr>
<tr>
<td>Band 5 Threshold</td>
<td>-60 to 0 dB</td>
<td>-30 dB</td>
</tr>
<tr>
<td>Band 6 Threshold</td>
<td>-60 to 0 dB</td>
<td>-30 dB</td>
</tr>
<tr>
<td>Band 1 Ratio</td>
<td>1 to 20</td>
<td>2</td>
</tr>
<tr>
<td>Band 2 Ratio</td>
<td>1 to 20</td>
<td>2</td>
</tr>
<tr>
<td>Band 3 Ratio</td>
<td>1 to 20</td>
<td>2</td>
</tr>
<tr>
<td>Band 4 Ratio</td>
<td>1 to 20</td>
<td>2</td>
</tr>
<tr>
<td>Band 5 Ratio</td>
<td>1 to 20</td>
<td>2</td>
</tr>
<tr>
<td>Band 6 Ratio</td>
<td>1 to 20</td>
<td>2</td>
</tr>
<tr>
<td>Band 1 Range</td>
<td>-24 to 12 dB</td>
<td>-6 dB</td>
</tr>
<tr>
<td>Band 2 Range</td>
<td>-24 to 12 dB</td>
<td>-6 dB</td>
</tr>
<tr>
<td>Band 3 Range</td>
<td>-24 to 12 dB</td>
<td>-6 dB</td>
</tr>
<tr>
<td>Band 4 Range</td>
<td>-24 to 12 dB</td>
<td>-6 dB</td>
</tr>
<tr>
<td>Band 5 Range</td>
<td>-24 to 12 dB</td>
<td>-6 dB</td>
</tr>
<tr>
<td>Band 6 Range</td>
<td>-24 to 12 dB</td>
<td>-6 dB</td>
</tr>
<tr>
<td>Band 1 Attack</td>
<td>0.5 to 100 ms</td>
<td>5 ms</td>
</tr>
<tr>
<td>Band 2 Attack</td>
<td>0.5 to 100 ms</td>
<td>5 ms</td>
</tr>
<tr>
<td>Band 3 Attack</td>
<td>0.5 to 100 ms</td>
<td>5 ms</td>
</tr>
<tr>
<td>Band 4 Attack</td>
<td>0.5 to 100 ms</td>
<td>5 ms</td>
</tr>
<tr>
<td>Band 5 Attack</td>
<td>0.5 to 100 ms</td>
<td>5 ms</td>
</tr>
<tr>
<td>Band 6 Attack</td>
<td>0.5 to 100 ms</td>
<td>5 ms</td>
</tr>
<tr>
<td>Band 1 Release</td>
<td>5 to 3000 ms, whole steps</td>
<td>100 ms</td>
</tr>
<tr>
<td>Band 2 Release</td>
<td>5 to 3000 ms, whole steps</td>
<td>100 ms</td>
</tr>
<tr>
<td>Band 3 Release</td>
<td>5 to 3000 ms, whole steps</td>
<td>100 ms</td>
</tr>
<tr>
<td>Band 4 Release</td>
<td>5 to 3000 ms, whole steps</td>
<td>100 ms</td>
</tr>
<tr>
<td>Band 5 Release</td>
<td>5 to 3000 ms, whole steps</td>
<td>100 ms</td>
</tr>
<tr>
<td>Band 6 Release</td>
<td>5 to 3000 ms, whole steps</td>
<td>100 ms</td>
</tr>
<tr>
<td>Band 1 Listen</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 2 Listen</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 3 Listen</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 4 Listen</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 5 Listen</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 6 Listen</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Mix</td>
<td>0 to 100 %, whole steps</td>
<td>100 %</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-eq8">omx eq8</h3>
<table>
<thead>
<tr>
<th>Section</th>
<th>Parameters</th>
</tr>
</thead>
<tbody>
<tr>
<td>High-pass</td>
<td>on/off, 20 to 1000 Hz, whole steps; slope 12 dB/oct / 24 dB/oct</td>
</tr>
<tr>
<td>Low-pass</td>
<td>on/off, 1000 to 20000 Hz, whole steps; slope 12 dB/oct / 24 dB/oct</td>
</tr>
<tr>
<td>Bands 1 to 8</td>
<td>each on/off, type, frequency (20 to 20000 Hz, whole steps), gain (-15 to 15 dB), Q (0.3 to 116; its top for a notch only)</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass, which is the whole EQ's switch. Every band and filter starts off, so a freshly loaded instance passes the
signal untouched.</p>
<h3 id="omx-eq16">omx eq16</h3>
<table>
<thead>
<tr>
<th>Section</th>
<th>Parameters</th>
</tr>
</thead>
<tbody>
<tr>
<td>High-pass</td>
<td>on/off, 20 to 1000 Hz, whole steps; slope 12 dB/oct / 24 dB/oct</td>
</tr>
<tr>
<td>Low-pass</td>
<td>on/off, 1000 to 20000 Hz, whole steps; slope 12 dB/oct / 24 dB/oct</td>
</tr>
<tr>
<td>Bands 1 to 16</td>
<td>each on/off, type, frequency (20 to 20000 Hz, whole steps), gain (-15 to 15 dB), Q (0.3 to 116; its top for a notch only)</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass, which is the whole EQ's switch. Every band and filter starts off, so a freshly loaded instance passes the
signal untouched.</p>
<h3 id="omx-eq32">omx eq32</h3>
<table>
<thead>
<tr>
<th>Section</th>
<th>Parameters</th>
</tr>
</thead>
<tbody>
<tr>
<td>High-pass</td>
<td>on/off, 20 to 1000 Hz, whole steps; slope 12 dB/oct / 24 dB/oct</td>
</tr>
<tr>
<td>Low-pass</td>
<td>on/off, 1000 to 20000 Hz, whole steps; slope 12 dB/oct / 24 dB/oct</td>
</tr>
<tr>
<td>Bands 1 to 32</td>
<td>each on/off, type, frequency (20 to 20000 Hz, whole steps), gain (-15 to 15 dB), Q (0.3 to 116; its top for a notch only)</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass, which is the whole EQ's switch. Every band and filter starts off, so a freshly loaded instance passes the
signal untouched.</p>
<h3 id="omx-flanger">omx flanger</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Rate</td>
<td>0.05 to 5 Hz</td>
<td>0.25 Hz</td>
</tr>
<tr>
<td>Depth</td>
<td>0 to 5 ms</td>
<td>2 ms</td>
</tr>
<tr>
<td>Feedback</td>
<td>-0.95 to 0.95</td>
<td>0.6</td>
</tr>
<tr>
<td>Mix</td>
<td>0 to 100 %</td>
<td>50 %</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-geq">omx geq</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>20 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>25 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>31.5 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>40 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>50 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>63 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>80 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>100 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>125 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>160 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>200 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>250 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>315 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>400 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>500 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>630 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>800 Hz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>1 kHz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>1.25 kHz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>1.6 kHz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>2 kHz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>2.5 kHz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>3.15 kHz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>4 kHz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>5 kHz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>6.3 kHz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>8 kHz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>10 kHz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>12.5 kHz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>16 kHz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>20 kHz</td>
<td>-15 to 15 dB</td>
<td>0 dB</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-glue">omx glue</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Threshold</td>
<td>-40 to 0 dB</td>
<td>-10 dB</td>
</tr>
<tr>
<td>Ratio</td>
<td>2:1 / 4:1 / 10:1</td>
<td>2:1</td>
</tr>
<tr>
<td>Attack</td>
<td>0.1 ms / 0.3 ms / 1 ms / 3 ms / 10 ms / 30 ms</td>
<td>10 ms</td>
</tr>
<tr>
<td>Release</td>
<td>0.1 s / 0.3 s / 0.6 s / 1.2 s / Auto</td>
<td>Auto</td>
</tr>
<tr>
<td>Makeup</td>
<td>0 to 24 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Key High-pass</td>
<td>0 to 500 Hz, whole steps</td>
<td>0 Hz</td>
</tr>
<tr>
<td>Mix</td>
<td>0 to 100 %, whole steps</td>
<td>100 %</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-keyed-gate">omx keyed-gate</h3>
<p>The console's gate, keyed: the stereo signal is gated while the detector listens to a second, mono
input, the <strong>key</strong> (an LV2 sidechain port; in CLAP a second input port). With nothing routed to the
key, or <strong>Key</strong> set to Self, it is the ordinary self-keyed gate.</p>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Key</td>
<td>Self / Sidechain</td>
<td>Sidechain</td>
</tr>
<tr>
<td>Threshold</td>
<td>-80 to 0 dB</td>
<td>-40 dB</td>
</tr>
<tr>
<td>Ratio</td>
<td>1 to 100</td>
<td>16</td>
</tr>
<tr>
<td>Range</td>
<td>-90 to 0 dB</td>
<td>-90 dB</td>
</tr>
<tr>
<td>Attack</td>
<td>0 to 500 ms</td>
<td>1 ms</td>
</tr>
<tr>
<td>Release</td>
<td>0 to 5000 ms</td>
<td>100 ms</td>
</tr>
<tr>
<td>Knee start</td>
<td>-80 to 0 dB, whole steps</td>
<td>-43 dB</td>
</tr>
<tr>
<td>Knee end</td>
<td>-80 to 0 dB, whole steps</td>
<td>-37 dB</td>
</tr>
<tr>
<td>Hold</td>
<td>0 to 2000 ms, whole steps</td>
<td>10 ms</td>
</tr>
<tr>
<td>Hysteresis</td>
<td>0 to 24 dB</td>
<td>3 dB</td>
</tr>
<tr>
<td>Key high-pass</td>
<td>0 to 20000 Hz, whole steps</td>
<td>0 Hz</td>
</tr>
<tr>
<td>Key low-pass</td>
<td>0 to 20000 Hz, whole steps</td>
<td>0 Hz</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass. An attack under 0.5 ms engages the 4x detector path, which adds 72 frames
of latency, reported to the host; otherwise the latency is zero. Its LV2 URI, ports and defaults
are those of the keyed gate bundle the OpenMixer console used to ship, so a session saved with that
bundle loads this one.</p>
<h3 id="omx-limiter">omx limiter</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Ceiling</td>
<td>-12 to 0 dBFS</td>
<td>-1 dBFS</td>
</tr>
<tr>
<td>Lookahead</td>
<td>0.5 to 5 ms</td>
<td>1.5 ms</td>
</tr>
<tr>
<td>Release</td>
<td>1 to 1000 ms, whole steps</td>
<td>50 ms</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-loudlevel">omx loudlevel</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Target</td>
<td>-40 to -6 dB</td>
<td>-23 dB</td>
</tr>
<tr>
<td>Range</td>
<td>0 to 24 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Speed</td>
<td>0.1 to 6 dB</td>
<td>1 dB</td>
</tr>
<tr>
<td>Gate</td>
<td>-70 to -30 dB, whole steps</td>
<td>-50 dB</td>
</tr>
<tr>
<td>Window</td>
<td>Momentary / Short-term</td>
<td>Short-term</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-multiband">omx multiband</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Bands</td>
<td>2 / 3 / 4 / 5</td>
<td>3</td>
</tr>
<tr>
<td>Crossover 1</td>
<td>40 to 16000 Hz, whole steps</td>
<td>200 Hz</td>
</tr>
<tr>
<td>Crossover 2</td>
<td>40 to 16000 Hz, whole steps</td>
<td>2000 Hz</td>
</tr>
<tr>
<td>Crossover 3</td>
<td>40 to 16000 Hz, whole steps</td>
<td>5000 Hz</td>
</tr>
<tr>
<td>Crossover 4</td>
<td>40 to 16000 Hz, whole steps</td>
<td>6400 Hz</td>
</tr>
<tr>
<td>Band 1 Threshold</td>
<td>-60 to 0 dB</td>
<td>-20 dB</td>
</tr>
<tr>
<td>Band 2 Threshold</td>
<td>-60 to 0 dB</td>
<td>-20 dB</td>
</tr>
<tr>
<td>Band 3 Threshold</td>
<td>-60 to 0 dB</td>
<td>-20 dB</td>
</tr>
<tr>
<td>Band 4 Threshold</td>
<td>-60 to 0 dB</td>
<td>-20 dB</td>
</tr>
<tr>
<td>Band 5 Threshold</td>
<td>-60 to 0 dB</td>
<td>-20 dB</td>
</tr>
<tr>
<td>Band 1 Ratio</td>
<td>1 to 20</td>
<td>2</td>
</tr>
<tr>
<td>Band 2 Ratio</td>
<td>1 to 20</td>
<td>2</td>
</tr>
<tr>
<td>Band 3 Ratio</td>
<td>1 to 20</td>
<td>2</td>
</tr>
<tr>
<td>Band 4 Ratio</td>
<td>1 to 20</td>
<td>2</td>
</tr>
<tr>
<td>Band 5 Ratio</td>
<td>1 to 20</td>
<td>2</td>
</tr>
<tr>
<td>Band 1 Attack</td>
<td>0.1 to 200 ms</td>
<td>10 ms</td>
</tr>
<tr>
<td>Band 2 Attack</td>
<td>0.1 to 200 ms</td>
<td>10 ms</td>
</tr>
<tr>
<td>Band 3 Attack</td>
<td>0.1 to 200 ms</td>
<td>10 ms</td>
</tr>
<tr>
<td>Band 4 Attack</td>
<td>0.1 to 200 ms</td>
<td>10 ms</td>
</tr>
<tr>
<td>Band 5 Attack</td>
<td>0.1 to 200 ms</td>
<td>10 ms</td>
</tr>
<tr>
<td>Band 1 Release</td>
<td>10 to 2000 ms, whole steps</td>
<td>150 ms</td>
</tr>
<tr>
<td>Band 2 Release</td>
<td>10 to 2000 ms, whole steps</td>
<td>150 ms</td>
</tr>
<tr>
<td>Band 3 Release</td>
<td>10 to 2000 ms, whole steps</td>
<td>150 ms</td>
</tr>
<tr>
<td>Band 4 Release</td>
<td>10 to 2000 ms, whole steps</td>
<td>150 ms</td>
</tr>
<tr>
<td>Band 5 Release</td>
<td>10 to 2000 ms, whole steps</td>
<td>150 ms</td>
</tr>
<tr>
<td>Band 1 Makeup</td>
<td>0 to 24 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Band 2 Makeup</td>
<td>0 to 24 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Band 3 Makeup</td>
<td>0 to 24 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Band 4 Makeup</td>
<td>0 to 24 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Band 5 Makeup</td>
<td>0 to 24 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Band 1 Solo</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 2 Solo</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 3 Solo</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 4 Solo</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 5 Solo</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 1 Bypass</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 2 Bypass</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 3 Bypass</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 4 Bypass</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Band 5 Bypass</td>
<td>off / on</td>
<td>off</td>
</tr>
<tr>
<td>Mix</td>
<td>0 to 100 %, whole steps</td>
<td>100 %</td>
</tr>
<tr>
<td>Output</td>
<td>-24 to 24 dB</td>
<td>0 dB</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-phaser">omx phaser</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Rate</td>
<td>0.05 to 5 Hz</td>
<td>0.5 Hz</td>
</tr>
<tr>
<td>Base</td>
<td>50 to 2000 Hz, whole steps</td>
<td>200 Hz</td>
</tr>
<tr>
<td>Depth</td>
<td>0 to 6 oct</td>
<td>4 oct</td>
</tr>
<tr>
<td>Stages</td>
<td>2 to 12, whole steps</td>
<td>6</td>
</tr>
<tr>
<td>Feedback</td>
<td>-0.9 to 0.9</td>
<td>0.4</td>
</tr>
<tr>
<td>Mix</td>
<td>0 to 100 %</td>
<td>50 %</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-pitch">omx pitch</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Semitones</td>
<td>-12 to 12 st, whole steps</td>
<td>0 st</td>
</tr>
<tr>
<td>Cents</td>
<td>-50 to 50 cents, whole steps</td>
<td>0 cents</td>
</tr>
<tr>
<td>Mix</td>
<td>0 to 100 %</td>
<td>100 %</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-plosive">omx plosive</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Consonant Cut</td>
<td>0 to 24 dB</td>
<td>6 dB</td>
</tr>
<tr>
<td>Consonant Sensitivity</td>
<td>0 to 30 dB</td>
<td>16 dB</td>
</tr>
<tr>
<td>Consonant Recovery</td>
<td>2 to 50 ms</td>
<td>8 ms</td>
</tr>
<tr>
<td>Consonant Band</td>
<td>1000 to 12000 Hz, whole steps</td>
<td>4000 Hz</td>
</tr>
<tr>
<td>Consonant Band Width</td>
<td>0.5 to 4 oct</td>
<td>2 oct</td>
</tr>
<tr>
<td>Pop Cut</td>
<td>0 to 24 dB</td>
<td>12 dB</td>
</tr>
<tr>
<td>Pop Sensitivity</td>
<td>0 to 30 dB</td>
<td>16 dB</td>
</tr>
<tr>
<td>Pop Recovery</td>
<td>10 to 200 ms, whole steps</td>
<td>40 ms</td>
</tr>
<tr>
<td>Pop Corner</td>
<td>60 to 300 Hz, whole steps</td>
<td>150 Hz</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-reverb">omx reverb</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Plate Mod Depth</td>
<td>0 to 400 %, whole steps</td>
<td>100 %</td>
</tr>
<tr>
<td>Mix</td>
<td>0 to 1</td>
<td>0.3</td>
</tr>
<tr>
<td>Size</td>
<td>0 to 1</td>
<td>0.7</td>
</tr>
<tr>
<td>Damping</td>
<td>0 to 1</td>
<td>0.5</td>
</tr>
<tr>
<td>Width</td>
<td>0 to 1</td>
<td>1</td>
</tr>
<tr>
<td>Predelay</td>
<td>0 to 100 ms, whole steps</td>
<td>0 ms</td>
</tr>
<tr>
<td>Lowcut</td>
<td>0 to 20000 Hz, whole steps</td>
<td>0 Hz</td>
</tr>
<tr>
<td>Highcut</td>
<td>0 to 20000 Hz, whole steps</td>
<td>20000 Hz</td>
</tr>
<tr>
<td>Reverse</td>
<td>50 to 500 ms, whole steps</td>
<td>300 ms</td>
</tr>
<tr>
<td>Hold</td>
<td>10 to 2000 ms, whole steps</td>
<td>120 ms</td>
</tr>
<tr>
<td>Release</td>
<td>1 to 500 ms, whole steps</td>
<td>20 ms</td>
</tr>
<tr>
<td>Gate Threshold</td>
<td>-80 to 0 dBFS, whole steps</td>
<td>-40 dBFS</td>
</tr>
<tr>
<td>Algorithm</td>
<td>Room / Plate / Hall / Reverse / Gated</td>
<td>Room</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-rotary">omx rotary</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Horn Slow</td>
<td>0.1 to 2 Hz</td>
<td>0.8 Hz</td>
</tr>
<tr>
<td>Horn Fast</td>
<td>3 to 10 Hz</td>
<td>6.8 Hz</td>
</tr>
<tr>
<td>Drum Slow</td>
<td>0.1 to 2 Hz</td>
<td>0.7 Hz</td>
</tr>
<tr>
<td>Drum Fast</td>
<td>3 to 10 Hz</td>
<td>5.9 Hz</td>
</tr>
<tr>
<td>Accel</td>
<td>0.25 to 4 x</td>
<td>1 x</td>
</tr>
<tr>
<td>Balance</td>
<td>-100 to 100 %, whole steps</td>
<td>0 %</td>
</tr>
<tr>
<td>Mix</td>
<td>0 to 100 %</td>
<td>100 %</td>
</tr>
<tr>
<td>Speed</td>
<td>Stop / Slow / Fast</td>
<td>Slow</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-spring">omx spring</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Decay</td>
<td>0.5 to 8 s</td>
<td>2 s</td>
</tr>
<tr>
<td>Length</td>
<td>20 to 60 ms, whole steps</td>
<td>35 ms</td>
</tr>
<tr>
<td>Tension</td>
<td>0 to 100 %, whole steps</td>
<td>50 %</td>
</tr>
<tr>
<td>Damping</td>
<td>1000 to 10000 Hz, whole steps</td>
<td>4000 Hz</td>
</tr>
<tr>
<td>Mix</td>
<td>0 to 100 %, whole steps</td>
<td>0 %</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-strip">omx strip</h3>
<p>Five stages, each omx-dsp's instance face of the console's own kernel, run one after the other; each has its own switch:</p>
<table>
<thead>
<tr>
<th>Stage</th>
<th>Parameters</th>
</tr>
</thead>
<tbody>
<tr>
<td>Input</td>
<td>on/off; Trim, a click-free ramp to each new gain</td>
</tr>
<tr>
<td>Filters</td>
<td>on/off; HPF and LPF, each on/off, its frequency, 12 or 24 dB/oct</td>
</tr>
<tr>
<td>Gate</td>
<td>on/off, threshold, ratio, range, attack, release, knee start and end, hold, hysteresis</td>
</tr>
<tr>
<td>EQ</td>
<td>on/off; four bands, each on/off, type (bell, low or high shelf, notch, all-pass 1st or 2nd order), frequency, gain, Q</td>
</tr>
<tr>
<td>Comp</td>
<td>on/off, threshold, ratio, knee, attack, release, make-up, kind (compressor: RMS detector; limiter: peak), mix, detector oversampling (auto, off, 4x)</td>
</tr>
</tbody>
</table>
<p><strong>Order</strong> (0 to 119) picks the order of the five stages: 0 is the desk's input &gt; filters &gt; gate &gt; EQ &gt;
comp, and the rest follow in lexicographic order (1 is input &gt; filters &gt; gate &gt; comp &gt; EQ, ... 119 is
comp &gt; EQ &gt; gate &gt; filters &gt; input). Plus the host's bypass. The latency reported is the sum of the
stages': the gate's and the compressor's 4x detector paths while they are engaged, else zero.</p>
<p>0.3.0 changed the parameter list (the Input and Filters switches, the gate's knee, hold and hysteresis, the compressor's kind, mix and detector oversampling, five-stage orders): a session saved with 0.2.0 does not load as it was, though at 0.2.0's settings the strip sounds the same, sample for sample.</p>
<h3 id="omx-suboct">omx suboct</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Range</td>
<td>Low / Mid / High</td>
<td>Low</td>
</tr>
<tr>
<td>Oct1</td>
<td>0 to 100 %</td>
<td>100 %</td>
</tr>
<tr>
<td>Oct2</td>
<td>0 to 100 %</td>
<td>0 %</td>
</tr>
<tr>
<td>Dry</td>
<td>0 to 100 %</td>
<td>100 %</td>
</tr>
<tr>
<td>Track Gate</td>
<td>-80 to -20 dBFS</td>
<td>-50 dBFS</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-transient">omx transient</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Attack</td>
<td>-24 to 24 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Sustain</td>
<td>-24 to 24 dB</td>
<td>0 dB</td>
</tr>
<tr>
<td>Attack Time</td>
<td>2 to 50 ms</td>
<td>10 ms</td>
</tr>
<tr>
<td>Sustain Time</td>
<td>50 to 2000 ms, whole steps</td>
<td>250 ms</td>
</tr>
<tr>
<td>Output</td>
<td>-24 to 12 dB</td>
<td>0 dB</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-tremolo">omx tremolo</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Rate</td>
<td>0.1 to 20 Hz</td>
<td>4 Hz</td>
</tr>
<tr>
<td>Depth</td>
<td>0 to 100 %</td>
<td>50 %</td>
</tr>
<tr>
<td>Mix</td>
<td>0 to 100 %</td>
<td>100 %</td>
</tr>
<tr>
<td>Mode</td>
<td>Tremolo / Pan</td>
<td>Tremolo</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h3 id="omx-upward">omx upward</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Range</th>
<th>Default</th>
</tr>
</thead>
<tbody>
<tr>
<td>Threshold</td>
<td>-70 to 0 dB</td>
<td>-40 dB</td>
</tr>
<tr>
<td>Ratio</td>
<td>1 to 10</td>
<td>1</td>
</tr>
<tr>
<td>Range</td>
<td>0 to 24 dB</td>
<td>6 dB</td>
</tr>
<tr>
<td>Attack</td>
<td>0.1 to 100 ms</td>
<td>5 ms</td>
</tr>
<tr>
<td>Release</td>
<td>5 to 3000 ms, whole steps</td>
<td>200 ms</td>
</tr>
</tbody>
</table>
<p>Plus the host's bypass.</p>
<h2 id="parameters">Parameters</h2>
<p><a href="https://github.com/FreeMixer/omx-plugins/blob/6d452d917352f7134be9937c71f6ecc89d43b916/docs/plugins/README.md">docs/plugins/README.md</a> lists every plugin with a page of its own: its ids, its audio ports, the
pages a host shows (LV2 port groups, CLAP modules) and a table of every parameter with its unit, range, default,
steps or values and flags. The pages are generated from the declarations by <code>tools/params-doc.mjs</code> (<code>make params-doc</code>),
and <code>make check-params-doc</code> fails when a committed page differs from what they say.</p>
<h2 id="factory-presets">Factory presets</h2>
<p>Every plugin ships a set of factory presets, one JSON file each, in <code>presets/&lt;plugin id&gt;/&lt;preset id&gt;.json</code>
(for example <code>presets/org.openmixer.drive/amp-tube.json</code>). The <code>omx-plugins</code> package installs them
read only under <code>/usr/share/omx/presets/</code>, where the console's preset library lists them as the
factory group. A file names the plugin, the preset's id and name, and every parameter by symbol,
unit and plain value (a choice also by its label); no value leaves its declared range.
<code>tools/gen-presets.mjs</code> writes the files and <code>make presets</code> checks them.</p>
<h2 id="install">Install</h2>
<p>On <strong>Fedora</strong>, from the FreeMixer package channel:</p>
<pre><code class="language-sh">sudo dnf install https://www.openmixer.org/rpm/openmixer-release.noarch.rpm
sudo dnf install omx-plugins
</code></pre>
<p>On <strong>Debian</strong> bookworm or trixie, <strong>Raspberry Pi OS</strong> and <strong>Zynthian</strong>:</p>
<pre><code class="language-sh">curl -fsSLO https://www.openmixer.org/deb/openmixer-release.deb &amp;&amp; sudo apt install ./openmixer-release.deb
sudo apt install omx-plugins
</code></pre>
<p><code>omx-plugins</code> installs both formats. To take only the one your host loads, install
<code>omx-plugins-clap</code> (CLAP hosts) or <code>omx-plugins-lv2</code> (LV2 hosts) instead. The plugins land where
hosts look without configuration (<code>/usr/lib/clap</code> on every distribution, the path the CLAP specification gives; <code>/usr/lib64/lv2</code> on Fedora,
<code>/usr/lib/lv2</code> on Debian). Rescan plugins in your host and look for the <strong>omx</strong> plugins under openmixer.</p>
<p>Every release also carries the packages on its
<a href="https://github.com/FreeMixer/omx-plugins/releases">GitHub release page</a>, and for a Zynthian without
the apt channel, <code>omx-plugins-zynthian-&lt;version&gt;-arm64.tar.gz</code>: copy its <code>lv2/</code> bundles into
<code>/zynthian/zynthian-plugins/lv2</code> and rescan the LV2 plugins from Zynthian's admin menu.</p>
<p>Projects that build on the plugins' parameters and instance code install the headers instead of
copying them: <code>omx-plugins-devel</code> on Fedora, <code>omx-plugins-dev</code> on Debian (they land in
<code>/usr/include/omx-plugins</code>). Each plugin's descriptor, its parameters in omx-contract's words, is in
<code>omx-plugins-contract</code>, which <code>omx-plugins</code> and the devel package require: files in omx-contract's
contract directory (<code>/usr/share/omx-contract/contract.d/3/omx-plugins/</code>) that a host reads at run time.
The code of each unit the param-contract extension serves is omx-contract's (<code>3/omx-contract/param-contract.json</code>).
The devel package carries <code>libomxplugins.a</code> (<code>pkg-config omxplugins</code>):
every plugin's CLAP face in one static library, for a host that runs them in its own process
without loading <code>.clap</code> files. <code>&lt;omx-plugins/omx_clap_static.h&gt;</code> lists their entries by CLAP id:</p>
<pre><code class="language-c">#include &lt;omx-plugins/omx_clap_static.h&gt;

const clap_plugin_entry_t *e = omx_clap_static_find(&quot;org.openmixer.delay&quot;);
e-&gt;init(&quot;&quot;);
const clap_plugin_factory_t *f = e-&gt;get_factory(CLAP_PLUGIN_FACTORY_ID);
const clap_plugin_t *delay = f-&gt;create_plugin(f, host, &quot;org.openmixer.delay&quot;);
</code></pre>
<p><code>OMX_CLAP_STATIC_PLUGINS</code> (<code>OMX_CLAP_STATIC_COUNT</code> rows of <code>{id, entry}</code>) walks them all, and
<code>omx_clap_static_entry</code> is all of them behind one CLAP entry and one plugin factory.</p>
<p>To build from source, see <a href="https://github.com/FreeMixer/omx-plugins/blob/6d452d917352f7134be9937c71f6ecc89d43b916/BUILDING.md">BUILDING.md</a>.</p>
<h2 id="licence">Licence</h2>
<p>GPL-3.0-or-later. See <a href="https://github.com/FreeMixer/omx-plugins/blob/6d452d917352f7134be9937c71f6ecc89d43b916/LICENSE">LICENSE</a>.</p>
`}],r={repo:e,commit:t,pages:n};export{t as commit,r as default,n as pages,e as repo};