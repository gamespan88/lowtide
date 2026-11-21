// audio.js — every sound in LOWTIDE is synthesised with WebAudio: no files, no network.
// Footsteps change with the surface underfoot, warden footsteps fade with distance, and a
// quiet detuned pad loops under the abbey. M mutes the master gain.

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambientNodes = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.startAmbient();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  blip(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  noise(dur, vol = 0.15, freq = 1200, delay = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
  }

  step(surface) {
    if (surface === 'water') { this.noise(0.12, 0.10, 700); return; }
    if (surface === 'vent') { this.noise(0.05, 0.04, 2400); return; }
    this.noise(0.05, 0.055, 900);
  }

  guardStep(distanceTiles) {
    const v = Math.max(0, 0.16 * (1 - distanceTiles / 9));
    if (v > 0.01) this.noise(0.06, v, 500);
  }

  coin() { this.blip(2093, 0.09, 'square', 0.06); this.blip(2637, 0.14, 'square', 0.05, null, 0.07); }
  splash() { this.noise(0.22, 0.16, 600); }
  sniff() { this.noise(0.09, 0.10, 1800); this.noise(0.09, 0.08, 1600, 0.13); }
  bark() { this.blip(300, 0.1, 'sawtooth', 0.14, 140); this.blip(320, 0.1, 'sawtooth', 0.12, 150, 0.14); }
  sting() { this.blip(880, 0.25, 'triangle', 0.22, 660); }
  bell() { this.blip(1175, 0.7, 'sine', 0.2); this.blip(1175, 0.7, 'sine', 0.12, null, 0.35); }
  pickup() { this.blip(1320, 0.1, 'sine', 0.14); this.blip(1760, 0.16, 'sine', 0.12, null, 0.08); }
  caught() { this.blip(392, 0.4, 'sawtooth', 0.18, 196); }

  startAmbient() {
    if (!this.ctx || this.ambientNodes) return;
    const g = this.ctx.createGain();
    g.gain.value = 0.035;
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    o1.type = 'sine'; o1.frequency.value = 110;
    o2.type = 'sine'; o2.frequency.value = 110 * 1.5 + 2;
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.07; lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain).connect(g.gain);
    o1.connect(g); o2.connect(g); g.connect(this.master);
    o1.start(); o2.start(); lfo.start();
    this.ambientNodes = { o1, o2, lfo, g };
  }
}
