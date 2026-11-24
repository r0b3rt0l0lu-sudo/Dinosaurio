// =====================================================================
//  Sonido (Web Audio API, todo sintetizado)
// =====================================================================
class Sfx {
  constructor() { this.ctx = null; this.muted = false; this.noiseBuf = null; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const len = Math.floor(this.ctx.sampleRate * 0.6);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  }
  tone(f1, f2, dur, type = "square", vol = 0.06, delay = 0) {
    if (this.muted || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol, freq = 1000, type = "lowpass", delay = 0) {
    if (this.muted || !this.ctx || !this.noiseBuf) return;
    const c = this.ctx, t = c.currentTime + delay;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(c.destination); src.start(t); src.stop(t + dur + 0.02);
  }
  jump()        { this.tone(380, 760, 0.12, "square", 0.05); }
  doubleJump()  { this.tone(560, 1150, 0.12, "square", 0.05); }
  slide()       { this.noise(0.18, 0.12, 1800, "bandpass"); }
  lane()        { this.tone(300, 420, 0.06, "triangle", 0.06); }
  coin()        { this.tone(988, null, 0.06, "square", 0.04); this.tone(1319, null, 0.12, "square", 0.04, 0.06); }
  roar()        { this.tone(170, 55, 0.6, "sawtooth", 0.12); this.tone(120, 45, 0.6, "square", 0.05); this.noise(0.55, 0.25, 700); }
  smash()       { this.noise(0.25, 0.25, 1200); this.tone(200, 80, 0.15, "square", 0.05); }
  hit()         { this.noise(0.35, 0.3, 900); this.tone(220, 55, 0.45, "sawtooth", 0.1); }
  powerup()     { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, null, 0.1, "square", 0.045, i * 0.06)); }
  shieldBreak() { this.tone(900, 200, 0.25, "triangle", 0.1); this.noise(0.2, 0.15, 3000, "highpass"); }
  levelUp()     { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, null, 0.14, "square", 0.05, i * 0.08)); this.tone(1568, null, 0.35, "triangle", 0.07, 0.42); }
  buy()         { this.tone(1319, null, 0.08, "square", 0.05); this.tone(1760, null, 0.08, "square", 0.05, 0.08); this.tone(2093, null, 0.25, "square", 0.05, 0.16); }
  click()       { this.tone(660, null, 0.05, "square", 0.035); }
  denied()      { this.tone(200, 140, 0.2, "square", 0.06); }
  bossWarn()    { for (let i = 0; i < 6; i++) this.tone(i % 2 ? 880 : 600, null, 0.26, "square", 0.05, i * 0.3); }
  bossHit()     { this.tone(320, 110, 0.18, "square", 0.08); this.noise(0.12, 0.2, 2500, "highpass"); }
  bossDefeat()  { this.noise(0.9, 0.3, 600); this.tone(300, 40, 0.8, "sawtooth", 0.1); [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, null, 0.16, "square", 0.05, 0.5 + i * 0.09)); }
  perfect()     { [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, null, 0.08, "square", 0.05, i * 0.04)); }
  trap()        { this.tone(180, 900, 0.3, "triangle", 0.08); this.noise(0.3, 0.2, 1500); }
  laser()       { this.tone(1400, 180, 0.4, "sawtooth", 0.05); }
  hiss()        { this.noise(0.3, 0.15, 5000, "highpass"); }
  screech()     { this.tone(1500, 500, 0.35, "sawtooth", 0.04); }
  toss()        { this.tone(220, 120, 0.15, "triangle", 0.07); }
  stomp()       { this.tone(90, 40, 0.25, "sine", 0.15); this.noise(0.15, 0.2, 400); }
  tick()        { this.tone(1800, null, 0.025, "square", 0.03); }
  lifeLost()    { this.tone(440, 110, 0.4, "square", 0.08); }
  jackpot()     { [523, 659, 784, 1047, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, null, 0.14, "square", 0.06, i * 0.09)); this.noise(0.6, 0.15, 6000, "highpass", 0.2); }

  egg()         { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, null, 0.09, "triangle", 0.07, i * 0.05)); this.noise(0.12, 0.1, 5000, "highpass", 0.18); }
  victory()     { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, null, 0.15, "square", 0.05, i * 0.1)); this.tone(1568, null, 0.5, "triangle", 0.07, 0.72); }
  defeat()      { [392, 330, 262, 196].forEach((f, i) => this.tone(f, f * 0.97, 0.22, "square", 0.05, 0.15 + i * 0.18)); }
  roarSpecial(type) {   // capa extra de sonido para los rugidos especiales
    if (type === "fire") this.noise(0.6, 0.18, 400);
    else if (type === "ice" || type === "shards") [1568, 2093, 2637].forEach((f, i) => this.tone(f, null, 0.12, "triangle", 0.04, 0.05 + i * 0.06));
    else if (type === "bolt") { this.noise(0.3, 0.2, 5000, "highpass"); this.tone(1200, 200, 0.3, "sawtooth", 0.04); }
    else if (type === "stars" || type === "rainbow") [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, null, 0.1, "square", 0.03, 0.05 + i * 0.05));
    else if (type === "ghost") this.tone(600, 200, 0.7, "sine", 0.06);
    else if (type === "prism") { [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, f * 1.5, 0.3, i % 2 ? "triangle" : "square", 0.04, i * 0.05)); this.noise(0.6, 0.1, 7000, "highpass", 0.05); }
    else if (type === "sun") { [523, 784, 1047, 1568].forEach((f, i) => this.tone(f, null, 0.25, "triangle", 0.05, i * 0.04)); this.noise(0.5, 0.12, 6000, "highpass"); }
  }

  // ---- Música en bucle (tranquila en carrera, intensa con los bosses) ----
  setMusic(mode) {
    if (mode === this.musicMode) return;
    this.musicMode = mode; this.step = 0; this.nextNote = 0;
    if (!mode) { clearInterval(this.musicTimer); this.musicTimer = null; return; }
    if (!this.musicTimer) this.musicTimer = setInterval(() => this.scheduleMusic(), 40);
  }
  scheduleMusic() {
    const c = this.ctx, pat = MUSIC[this.musicMode];
    if (!c || !pat) return;
    if (this.muted || this.nextNote < c.currentTime) this.nextNote = c.currentTime + 0.05;
    if (this.muted) return;
    while (this.nextNote < c.currentTime + 0.2) { pat.play(this, this.step++, this.nextNote); this.nextNote += pat.step; }
  }
  note(f, dur, type, vol, at) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, at);
    g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(c.destination); o.start(at); o.stop(at + dur + 0.02);
  }
  kick(at) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(40, at + 0.12);
    g.gain.setValueAtTime(0.14, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
    o.connect(g).connect(c.destination); o.start(at); o.stop(at + 0.16);
  }
  hat(at) {
    const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noiseBuf; f.type = "highpass"; f.frequency.value = 7000;
    g.gain.setValueAtTime(0.04, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
    src.connect(f).connect(g).connect(c.destination); src.start(at); src.stop(at + 0.05);
  }
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const MUSIC = {
  calm: { step: 0.16, play(s, i, at) {
    const bass = [45, 0, 52, 0, 48, 0, 52, 0, 43, 0, 50, 0, 47, 0, 50, 0][i % 16];
    if (bass) s.note(mtof(bass), 0.3, "triangle", 0.05, at);
    const mel = [69, 0, 0, 72, 0, 0, 76, 0, 74, 0, 0, 72, 0, 0, 71, 0, 69, 0, 0, 72, 0, 0, 79, 0, 77, 0, 76, 0, 74, 0, 72, 0][i % 32];
    if (mel) s.note(mtof(mel), 0.18, "square", 0.015, at);
  } },
  boss: { step: 0.1, play(s, i, at) {
    s.note(mtof([40, 40, 52, 40, 40, 52, 40, 43, 38, 38, 50, 38, 41, 41, 53, 43][i % 16]), 0.09, "square", 0.04, at);
    if (i % 4 === 0) s.kick(at);
    if (i % 2 === 1) s.hat(at);
    const lead = [64, 0, 67, 0, 70, 0, 69, 67, 64, 0, 62, 0, 64, 0, 0, 0][i % 16];
    if (lead && Math.floor(i / 16) % 2) s.note(mtof(lead + 12), 0.08, "sawtooth", 0.015, at);
  } },
};


