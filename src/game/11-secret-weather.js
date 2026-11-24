// =====================================================================
//  NIVEL SECRETO (nivel 11): solo aparece si completas los 10 niveles desde el nivel 1 sin morir
//  (sin perder vidas en Fácil y sin usar Segunda oportunidad ni Resurrección). Bioma «Santuario prismático»
//  y jefe secreto «Rex Prismático»: tres fases que examinan pisotón, rugido reflejo y salto.
// =====================================================================
const SECRET_CONFIG = {
  LEVEL: 11,                 // número del nivel secreto
  BOSS_HP_MULT: 1.7,         // vida respecto a un boss normal
  EXTRA_TIME: 25,            // s extra de combate
  COINS: 800,                // monedas por vencerlo
  SEASON_XP: 1500,           // XP del pase por vencerlo
  BITE_DMG: 3, REFLECT_DMG: 2, JUMP_DMG: 3,
};
const SECRET_BIOME = { id: "santuario", name: "Santuario prismático", accent: "#ff9de6", sky: "none", stars: true, ambient: "spores", ambientColors: ["#ff5ce1", "#7df9ff", "#ffd23f", "#9b5cff"], deco: ["shooting"],
  patternBiome: "night",
  pal: { skyTop: "#05020f", skyMid: "#1c0a3a", skyBot: "#3a1468", far: "#2a1450", near: "#3a1c6a", ground: "#2a1a44", band: "#3c2860", bandHi: "#ff9de6", bandEdge: "#160c2a", pebble: "#7df9ff", accent: "#ff9de6" },
  far: { min: 30, max: 100, rough: 0.4, step: 12 }, near: { min: 10, max: 40, rough: 0.3, step: 10 },
  obstacles: { ground: "crystal", rock: "icerock", flyer: "bird-crystal" } };
BOSS_NAMES.push("Rex Prismático");
BOSS_IDS.push("rex");
const BOSS_COUNT = 10;   // jefes normales (el secreto no cuenta para «los 10 bosses»)

// ---- Escenario del santuario (capas pixel art como los demás biomas) ----
function scCrystal(c, x, h, w, col, hi) {   // cristal vertical con punta
  for (let y = 0; y < h; y++) { const ww = y < w ? y + 1 : w; pR(c, col, x - Math.floor(ww / 2), HZ - h + y, ww, 1); }
  pR(c, hi, x - 1, HZ - h + Math.floor(w / 2), 1, Math.max(2, h - w));
}
SCENES.santuario = P => ({
  sky: scSky(P, c => {
    scStarsStatic(c, 211, 90, ["#ffffff", "#ffd0f0", "#c8f8ff"]);
    const cols = ["#ff3b5c", "#ff9f1c", "#ffd23f", "#3ddc84", "#41b8ff", "#8a5cff"];   // aurora arcoíris tramada
    cols.forEach((col, i) => { c.fillStyle = scDither(c, col, i % 2); for (let x = 0; x < 450; x++) c.fillRect(x, Math.round(26 + i * 3 + Math.sin(x / 38 + i * 0.5) * 9), 1, 2); });
    const x = 380, y = 30;   // gran prisma flotante en el cielo
    for (let k = 0; k < 16; k++) pR(c, k < 8 ? "#e8e0ff" : "#b8a8f0", x - k, y - 16 + k, 1 + k * 2, 1);
    for (let k = 0; k < 10; k++) pR(c, "#8a78d8", x - 15 + k * 1.5, y + k, 31 - k * 3, 1);
    cols.forEach((col, i) => pR(c, col, x + 16, y + i * 2, 40, 2));
  }),
  layers: [
    { f: 0.03, draw: c => { pRidge(c, "#2a1450", HZ + 2, 34, [[2, 10], [5, 6], [11, 2]], 2, 223, "#4a2a80"); const r = seededRandom(229); for (let x = 30; x < SC_TW; x += 70 + r() * 60) wrapX(x, xx => scCrystal(c, xx, 26 + r() * 30, 7, "#3a1c6a", "#7a5ac0")); } },
    { f: 0.12, draw: c => { const r = seededRandom(233), cols = ["#ff5ce1", "#7df9ff", "#ffd23f", "#9b5cff"]; for (let x = 40; x < SC_TW; x += 90 + r() * 70) { const col = cols[Math.floor(r() * 4)]; wrapX(x, xx => { scCrystal(c, xx, 20 + r() * 26, 6, col, "#ffffff"); scCrystal(c, xx + 7, 12 + r() * 10, 4, shadeHex(col, -0.3), "#ffffff"); }); } } },
    { f: 0.25, draw: c => { c.fillStyle = scDither(c, "#5a2a8a"); c.fillRect(0, HZ - 6, SC_TW, 8); for (let x = 0; x < SC_TW; x += 9) { pR(c, x % 27 ? "#7df9ff" : "#ff5ce1", x, HZ - 9 - (x % 4), 1, 4 + (x % 4)); } } },
  ],
  anim: (c, g, a) => {   // destellos flotantes
    for (let i = 0; i < 18; i++) { const x = mod(i * 97 - g.scroll * 0.06 + Math.sin(g.time + i) * 10, W + 20) - 10, y = 60 + (i * 53) % 140 + Math.sin(g.time * 2 + i) * 6;
      c.globalAlpha = a * (0.4 + 0.6 * Math.abs(Math.sin(g.time * 3 + i))); c.fillStyle = ["#ff5ce1", "#7df9ff", "#ffd23f", "#ffffff"][i % 4]; c.fillRect(Math.round(x), Math.round(y), 2, 2); }
    c.globalAlpha = a;
  },
});
function drawPrismHaz(c, h) {   // cristal escupido / prisma rodante
  const hue = (h.t * 400) % 360, col = hslHex(hue, 90, 65), x = h.x, y = -(h.y + h.h);
  c.save(); c.translate(x + h.w / 2, y + h.h / 2); c.rotate(h.spin ? h.t * -10 : 0);
  c.fillStyle = "#140a2e"; c.beginPath(); c.moveTo(0, -h.h / 2 - 3); c.lineTo(h.w / 2 + 3, 0); c.lineTo(0, h.h / 2 + 3); c.lineTo(-h.w / 2 - 3, 0); c.closePath(); c.fill();
  c.fillStyle = col; c.beginPath(); c.moveTo(0, -h.h / 2); c.lineTo(h.w / 2, 0); c.lineTo(0, h.h / 2); c.lineTo(-h.w / 2, 0); c.closePath(); c.fill();
  c.fillStyle = "rgba(255,255,255,0.7)"; c.fillRect(-h.w / 6, -h.h / 3, h.w / 6, h.h / 3);
  c.restore();
}
function drawPrismLaser(c, h) {
  const cols = ["#ff3b5c", "#ff9f1c", "#ffd23f", "#3ddc84", "#41b8ff", "#8a5cff"], bh = h.h / cols.length;
  c.globalAlpha = 0.4; c.fillStyle = "#ffffff"; c.fillRect(h.x, -(h.y + h.h) - 6, h.w, h.h + 12); c.globalAlpha = 1;
  cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(h.x, -(h.y + h.h) + i * bh, h.w, bh + 0.5); });
}

class PrismRexBoss extends Boss {
  constructor(game, cycle) {
    super(game, cycle, BOSS_NAMES[10], SECRET_CONFIG.BOSS_HP_MULT);
    this.colors = ["#ff5ce1", "#7df9ff", "#ffd23f", "#9b5cff", "#ffffff"]; this.trapKind = "quicksand"; this.trapColor = "#ff9de6";
    this.rx = 1100; this.head = { laneT: 0.5, x: 520, y: 150 }; this.headTo = { ...this.head }; this.idleHead = true; this.fast = false; this.jaw = 0; this.lastPhase = 1; this.rolls = [];
    this.setRules({ roar: false, trap: false });
    this.maxTime = CONFIG.BOSS_MAX_TIME + SECRET_CONFIG.EXTRA_TIME; this.reflectDist = 95; this.roarCdMult = 0.5;
    this.coins = SECRET_CONFIG.COINS;
  }
  get phase() { return this.hp > this.maxHp * 2 / 3 ? 1 : this.hp > this.maxHp / 3 ? 2 : 3; }
  hintText() { return ["", "FASE 1: esquiva el mordisco y PISA su mandíbula (S) cuando la apoye", "FASE 2: DEVUÉLVELE los cristales con el rugido (E) justo antes de que caigan", "FASE 3: SALTA por encima de los prismas rodantes"][this.phase]; }
  canStomp() { return this.phase === 1; }
  onRoar(lane) { if (this.phase === 2) super.onRoar(lane); }
  onReflectHit() { if (this.phase === 2) this.damage(SECRET_CONFIG.REFLECT_DMG, "reflect"); }
  damage(n, kind, at) {
    if (kind === "stomp") n = SECRET_CONFIG.BITE_DMG;
    const r = super.damage(n, kind, at);
    if (r && this.hp > 0 && this.phase !== this.lastPhase) {
      this.lastPhase = this.phase; this.clearAttacks(); this.say(`¡FASE ${this.phase}!`, "#ff5ce1", 32, 0, 450, 150); this.game.addShake(0.5, 10); this.game.flashT = 0.3;
      this.after(1.2, () => { if (this.state === "fight") this.attack(); });
    }
    return r;
  }
  // Prismas rodantes: daño al saltar por encima
  extraCollide(pl, lane) {
    for (const h of this.hazards) {
      if (!h.roll || h.jumped || h.dead || h.lane !== lane) continue;
      const px = pl.x + 24;
      if (px + 27 > h.x && px < h.x + h.w && pl.y >= h.h - 4) { h.jumped = true; h.harmful = false; this.game.sfx.stomp(); this.say("¡SALTO!", "#7df9ff"); this.damage(SECRET_CONFIG.JUMP_DMG, "jump", { laneT: lane, x: h.x + h.w / 2, y: h.h + 20 }); }
    }
    return false;
  }
  target() { return { lane: Math.round(this.head.laneT), laneT: this.head.laneT, x: this.head.x + 40, y: this.head.y + 20 }; }
  clearAttacks() { super.clearAttacks(); this.idleHead = true; this.fast = false; }
  updateBody(dt) {
    this.rx = 660 + this.away * 520 + Math.sin(this.t * 1.6) * 6 + (this.state === "defeat" ? this.stateT * 60 : 0);
    if (this.idleHead) this.headTo = { laneT: 0.5, x: this.rx - 120 + Math.sin(this.t * 2) * 12, y: 150 + Math.sin(this.t * 2.6) * 10 };
    const k = Math.min(1, dt * (this.fast ? 28 : 6));
    for (const key of ["laneT", "x", "y"]) this.head[key] = lerp(this.head[key], this.headTo[key], k);
    this.jaw = lerp(this.jaw, this.fast || !this.idleHead ? 1 : 0.15 + 0.1 * Math.sin(this.t * 4), Math.min(1, dt * 10));
  }
  attack() {
    if (this.state !== "fight") return;
    const ph = this.phase, r = Math.random();
    if (ph === 1) { if (r < 0.7) this.bite(this.p.lane); else this.laser(() => this.bite(this.p.lane)); }
    else if (ph === 2) { if (r < 0.7) this.crystals(); else this.laser(() => this.crystals()); }
    else { if (r < 0.65) this.roll(); else this.laser(() => this.roll()); }
  }
  bite(lane) {   // mordisco: cámbiate de carril; luego apoya la mandíbula en ese carril (písala)
    const d = this.tele(0.85);
    this.idleHead = false; this.fast = false; this.headTo = { laneT: lane, x: COL_X - 10, y: 170 };
    this.warn(lane, "shadow", d); this.game.sfx.bossWarn();
    this.after(d, () => {
      this.fast = true; this.headTo = { laneT: lane, x: COL_X - 10, y: 0 };
      this.addHazard({ lane, x: COL_X - 10, y: 0, w: COL_W + 20, h: 300, life: 0.2, isBody: true });
      this.game.addShake(0.25, 6); this.game.burst(lane, COL_X + 30, 10, this.colors, 14);
      this.rest(lane, { x: COL_X - 10, y: 0, w: COL_W + 20, h: 34 }, 0, () => { this.idleHead = true; this.fast = false; });
    });
  }
  crystals() {   // cristales en arco que hay que devolver con el rugido
    const n = 3 + (this.fury ? 1 : 0), gap = 0.55 / this.speedMul, T = 1.15 / Math.sqrt(this.speedMul);
    for (let i = 0; i < n; i++) this.after(i * gap, () => {
      const L = i === 0 ? this.p.lane : randInt(0, 1);
      this.warn(L, "target", T); this.game.sfx.toss(); this.jaw = 1;
      this.lob(L, this.head.x, this.head.y + 20, T, drawPrismHaz);
    });
    this.after((n - 1) * gap + T + 0.8, () => this.attack());
  }
  roll() {   // prismas rodantes por tu carril: sáltalos (daño) o cámbiate
    const lane = this.p.lane, d = this.tele(0.9), n = this.fury ? 2 : 1;
    this.warn(lane, "arrow", d, { y: 20 }); this.game.sfx.stomp();
    for (let i = 0; i < n; i++) this.after(d + i * 0.75 / this.speedMul, () => {
      const L = i === 0 ? lane : 1 - lane;
      this.addHazard({ lane: L, x: 900, y: 0, w: 46, h: 46, vx: -520 * this.speedMul, life: 4, roll: true, spin: true, draw: drawPrismHaz });
    });
    this.after(d + n * 0.75 / this.speedMul + 1.6, () => this.attack());
  }
  laser(then) {   // rayo prismático de los ojos: bajo = saltar · medio = deslizarse
    const d = this.tele(0.8), hk = choice(["low", "mid"]), lane = this.p.lane, b = LASER[hk];
    this.warn(lane, "line", d, { y: b.y, h: b.h, x2: 900 }); this.jaw = 1;
    this.after(d, () => { this.addHazard({ lane, x: 0, w: 900, y: b.y, h: b.h, life: 0.45, draw: drawPrismLaser }); this.game.sfx.laser(); this.game.addShake(0.15, 3); });
    this.after(d + 0.9, then);
  }
  // Dibujo: cuerpo de cristal (carril central) + cuello encadenado + cabeza que muerde
  hue(o = 0) { return hslHex(this.t * 60 + o, 85, 60); }
  drawBody(c, lane) {
    if (lane === 0) {   // cuerpo detrás, en el carril de arriba
      const x = this.rx, t = this.t, step = Math.sin(t * 7) * 6, D = "#140a2e";
      c.save(); applyLane(c, 0.5);
      const tail = [[x + 150, 70], [x + 230, 90], [x + 300, 100], [x + 360, 104]];
      tail.forEach(([tx, ty], i) => BO(c, D, this.hue(30 + i * 20), tx, ty - 16 + Math.sin(t * 3 + i) * 4, 70 - i * 10, 34 - i * 6));
      for (const [lx, ph] of [[x + 30, step], [x + 110, -step]]) { BO(c, D, this.hue(200), lx, 0, 34, 70 + ph); BO(c, D, this.hue(220), lx - 10, 0, 50, 12); }
      BO(c, D, this.hue(0), x, 60, 170, 110);
      for (let i = 0; i < 6; i++) { const sx = x + 14 + i * 26, sh = 24 + (i % 2) * 10; B(c, D, sx - 2, 168, 22, sh + 2); B(c, this.hue(i * 60), sx, 168, 18, sh); B(c, "#ffffff", sx + 4, 172, 4, sh - 8); }
      B(c, this.hue(90), x + 20, 70, 130, 14); B(c, "rgba(255,255,255,0.45)", x + 26, 140, 80, 8);
      BO(c, D, this.hue(330), x - 22, 110 + Math.sin(t * 5) * 4, 30, 12, 2);   // bracito
      c.restore();
    }
    // cuello (cadena en pantalla) y cabeza en su carril
    const sh = toScreen(0.5, this.rx + 10, 150), hp = toScreen(this.head.laneT, this.head.x + 70, this.head.y + 40);
    if (lane === Math.round(this.head.laneT)) {
      drawChain(c, sh, hp, { x: (sh.x + hp.x) / 2 + 20, y: Math.min(sh.y, hp.y) - 50 }, 9, 30 * hp.s, 24 * hp.s, "#140a2e", [this.hue(10), this.hue(50), this.hue(90)]);
      c.save(); applyLane(c, this.head.laneT);
      const hx = this.head.x, hy = this.head.y, j = this.jaw * 16, D = "#140a2e";
      BO(c, D, this.hue(0), hx, hy + 22 + j * 0.2, 96, 40);                      // cráneo
      BO(c, D, this.hue(20), hx - 6, hy + 4 - j, 78, 18);                       // mandíbula inferior (se abre)
      for (let i = 0; i < 6; i++) { B(c, "#ffffff", hx + 4 + i * 12, hy + 22, 5, 7); B(c, "#ffffff", hx + 2 + i * 12, hy + 12 - j, 5, 6); }
      B(c, D, hx + 58, hy + 44, 18, 12); B(c, this.fury ? "#ff3b3b" : "#fff6b0", hx + 60, hy + 46, 14, 8); B(c, "#ffffff", hx + 62, hy + 50, 4, 3);   // ojo
      for (let i = 0; i < 4; i++) { const cx = hx + 40 + i * 14, ch = 14 + (i % 2) * 8; B(c, D, cx - 1, hy + 62, 10, ch + 1); B(c, this.hue(120 + i * 50), cx, hy + 62, 8, ch); }   // cuernos de cristal
      c.restore();
    }
  }
}
BOSS_CLASSES.push(PrismRexBoss);

// =====================================================================
//  Clima: cada bioma tiene su fenómeno (lluvia, tormenta de arena, ventisca, niebla…). Aparece a mitad de nivel
//  durante unos segundos, se anuncia en el marcador y cambia algo del juego mientras dura (no en multijugador).
// =====================================================================
const WEATHER_CONFIG = { CHANCE: 0.8, START: [60, 260], DURATION: [18, 28], FADE: 1.4, MAX_P: 160 };
const WEATHER = {
  desert:    { id: "arena", name: "Tormenta de arena", icon: "🌪️", desc: "se ve menos a lo lejos · puntos ×1,2", kind: "sand", haze: [168, 112, 50], mod: { scoreMult: v => v * 1.2 } },
  jungle:    { id: "lluvia", name: "Lluvia", icon: "🌧️", desc: "el suelo resbala: cambiar de carril es más lento", kind: "rain", mod: { laneTimeMult: v => v * 1.35 } },
  volcano:   { id: "calor", name: "Ola de calor", icon: "🔥", desc: "la furia se llena un 50 % más rápido", kind: "heat", mod: { furyRate: v => v * 1.5 } },
  glacier:   { id: "ventisca", name: "Ventisca", icon: "❄️", desc: "viento en contra: saltas un poco menos", kind: "blizzard", haze: [230, 240, 255], mod: { jumpMult: v => v * 0.92 } },
  night:     { id: "tormenta", name: "Tormenta eléctrica", icon: "⛈️", desc: "los rayos atraen monedas: ×1,25", kind: "storm", mod: { coinMult: v => v * 1.25 } },
  beach:     { id: "chubasco", name: "Chubasco tropical", icon: "🌦️", desc: "suelo mojado: cambiar de carril es más lento", kind: "rain", mod: { laneTimeMult: v => v * 1.25 } },
  mushroom:  { id: "esporas", name: "Lluvia de esporas", icon: "✨", desc: "esporas mágicas: el doble de power-ups", kind: "spores", mod: { powerupFreq: v => v * 2 } },
  ocean:     { id: "corriente", name: "Corriente marina", icon: "🌊", desc: "a favor: +12 % de velocidad y puntos ×1,15", kind: "current", mod: { speedMult: v => v * 1.12, scoreMult: v => v * 1.15 } },
  graveyard: { id: "niebla", name: "Niebla espesa", icon: "🌫️", desc: "casi no se ve nada · puntos ×1,25", kind: "fog", haze: [170, 190, 180], mod: { scoreMult: v => v * 1.25 } },
  moon:      { id: "meteoros", name: "Lluvia de meteoritos", icon: "☄️", desc: "polvo de estrellas: monedas ×1,5", kind: "meteors", mod: { coinMult: v => v * 1.5 } },
};
class WeatherManager {
  constructor(game) { this.g = game; this.reset(); }
  reset() { this.plan = {}; this.def = null; this.on = false; this.k = 0; this.timer = 0; this.p = []; this.flash = 0; this.bolt = null; this.boltCd = 3; this.announce = 0; this.wasActive = false; }
  get active() { return !!this.def && this.k > 0.5 && !this.g.versus && !this.g.tutorial; }
  // Al empezar cada nivel (lo llama Game.onLevelStart; en la carrera diaria usa la semilla del día)
  planLevel(level) {
    const g = this.g, def = WEATHER[g.level.biome.id];
    if (g.tutorial || !def || Math.random() >= WEATHER_CONFIG.CHANCE) return;
    const [a, b] = WEATHER_CONFIG.START, [c, d] = WEATHER_CONFIG.DURATION;
    this.plan[level] = { at: rand(a, b), dur: rand(c, d), done: false };
  }
  update(dt) {
    const g = this.g, L = g.level, pl = this.plan[L.level], inLevel = g.distScore - (L.level - 1) * CONFIG.POINTS_PER_LEVEL;
    if (pl && !pl.done && !this.on && inLevel >= pl.at && !g.bosses.active && !L.portal) {
      pl.done = true; this.on = true; this.def = WEATHER[L.biome.id]; this.timer = pl.dur; this.announce = 3.5;
      if (this.def) g.sfx.tone(this.def.kind === "storm" || this.def.kind === "rain" ? 220 : 520, null, 0.3, "triangle", 0.04);
    }
    if (this.on && ((this.timer -= dt) <= 0 || g.bosses.active || L.portal || !this.def || WEATHER[L.biome.id] !== this.def)) this.on = false;
    this.k = clamp(this.k + (this.on ? 1 : -1) * dt / WEATHER_CONFIG.FADE, 0, 1);
    if (this.k <= 0 && !this.on) this.def = null;
    this.announce = Math.max(0, this.announce - dt);
    if (this.active !== this.wasActive) { this.wasActive = this.active; g.build.cache = {}; }   // los efectos entran y salen de la build
    this.tickParticles(dt);
  }
  // ----- Partículas y efectos -----
  tickParticles(dt) {
    const d = this.def, k = this.k; this.flash = Math.max(0, this.flash - dt * 2.5);
    if (this.bolt && (this.bolt.t -= dt) <= 0) this.bolt = null;
    if (d && k > 0) {
      const R = { rain: 70, storm: 90, sand: 170, blizzard: 90, heat: 14, spores: 16, current: 18, fog: 0, meteors: 1.2 }[d.kind] || 0;
      this.acc = (this.acc || 0) + dt * R * k;
      while (this.acc >= 1 && this.p.length < WEATHER_CONFIG.MAX_P) { this.acc--; this.p.push(this.spawn(d.kind)); }
      if ((d.kind === "storm" || d.kind === "rain") && (this.boltCd -= dt) <= 0) {   // relámpagos
        this.boltCd = d.kind === "storm" ? rand(2.2, 4.5) : rand(6, 11);
        if (k > 0.6) { this.flash = 0.5; const x = rand(200, W - 60); this.bolt = { t: 0.18, pts: Array.from({ length: 6 }, (_, i) => [x + rand(-24, 24), i * 26]) }; this.g.sfx.noise(0.6, 0.05, 400, "lowpass"); }
      }
    }
    for (const q of this.p) { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; if (q.kind === "spore") q.x += Math.sin(q.life * 3 + q.ph) * 20 * dt; }
    this.p = this.p.filter(q => q.life > 0 && q.x > -60 && q.x < W + 80 && q.y < H + 20 && q.y > -40);
  }
  spawn(kind) {
    switch (kind) {
      case "rain": case "storm": return { kind: "rain", x: rand(0, W + 200), y: -10, vx: -160, vy: rand(620, 760), life: 2, len: rand(10, 16) };
      case "sand": return { kind: "sand", x: W + 10, y: rand(0, H), vx: -rand(600, 900), vy: rand(-20, 40), life: 2, w: rand(8, 22), c: choice(["#c89048", "#a8702e", "#e8b868", "#8a5a24"]) };
      case "blizzard": return { kind: "snow", x: W + 10, y: rand(-20, H), vx: -rand(380, 620), vy: rand(40, 120), life: 3, s: rand(2, 4) };
      case "heat": return { kind: "ember", x: rand(0, W), y: H + 5, vx: rand(-30, 10), vy: -rand(60, 140), life: 4, c: choice(["#ffd23f", "#ff9a1e", "#ff5a1e"]) };
      case "spores": return { kind: "spore", x: rand(0, W), y: H + 5, vx: -rand(20, 60), vy: -rand(30, 70), life: 7, ph: rand(0, 6), c: choice(["#ff7ad0", "#7df9ff", "#ffe14d", "#c9a6ff"]) };
      case "current": return { kind: "bubble", x: W + 10, y: rand(140, H - 10), vx: -rand(260, 420), vy: -rand(5, 25), life: 4, s: rand(3, 6) };
      case "meteors": return { kind: "meteor", x: rand(W * 0.3, W + 150), y: -20, vx: -rand(320, 480), vy: rand(200, 300), life: 2.2 };
    }
    return { kind: "none", x: 0, y: 0, vx: 0, vy: 0, life: 0 };
  }
  // Por detrás de los carriles: rayos de luz, meteoritos y relámpagos en el cielo
  drawBack(c) {
    const d = this.def, k = this.k; if (!d || k <= 0) return;
    if (d.kind === "current") {
      c.save(); c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) { const x = ((i * 220 + this.g.time * 30) % (W + 300)) - 150; c.globalAlpha = 0.06 * k; c.fillStyle = "#bff8ff";
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 70, 0); c.lineTo(x - 60, H); c.lineTo(x - 140, H); c.fill(); }
      c.restore();
    }
    if (d.kind === "heat") { c.globalAlpha = 0.18 * k; c.fillStyle = "#ff6a1a"; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    for (const q of this.p) if (q.kind === "meteor") {
      c.globalAlpha = k; c.strokeStyle = "#ffd9a0"; c.lineWidth = 2; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x + 40, q.y - 25); c.stroke();
      c.fillStyle = "#ffffff"; c.fillRect(q.x - 2, q.y - 2, 4, 4); c.globalAlpha = 1;
    }
    if (this.bolt) {
      c.strokeStyle = "#f4f0ff"; c.lineWidth = 3; c.globalAlpha = 0.9; c.beginPath();
      this.bolt.pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.globalAlpha = 1;
    }
  }
  // Por delante: lluvia, arena, nieve, esporas, burbujas y la neblina que tapa lo que viene
  drawFront(c) {
    const d = this.def, k = this.k; if (!d || k <= 0) return;
    if (d.kind === "rain" || d.kind === "storm") { c.fillStyle = `rgba(20,30,60,${0.22 * k})`; c.fillRect(0, 0, W, H); }
    if (d.kind === "sand") { c.fillStyle = `rgba(176,118,52,${0.3 * k})`; c.fillRect(0, 0, W, H); }
    if (d.kind === "blizzard") { c.fillStyle = `rgba(220,235,255,${0.18 * k})`; c.fillRect(0, 0, W, H); }
    for (const q of this.p) {
      if (q.kind === "rain") { c.globalAlpha = 0.55 * k; c.strokeStyle = "#cfe4ff"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - q.len * 0.22, q.y - q.len); c.stroke(); }
      else if (q.kind === "sand") { c.globalAlpha = 0.8 * k; c.fillStyle = q.c; c.fillRect(q.x, q.y, q.w, 3); }
      else if (q.kind === "snow") { c.globalAlpha = 0.9 * k; c.fillStyle = "#ffffff"; c.fillRect(q.x, q.y, q.s, q.s); }
      else if (q.kind === "ember") { c.globalAlpha = Math.min(1, q.life) * k; c.fillStyle = q.c; c.fillRect(q.x, q.y, 3, 3); }
      else if (q.kind === "spore") { c.globalAlpha = (0.5 + 0.5 * Math.sin(q.life * 6 + q.ph)) * k; c.fillStyle = q.c; c.fillRect(q.x, q.y, 3, 3); }
      else if (q.kind === "bubble") { c.globalAlpha = 0.6 * k; c.strokeStyle = "#e8fbff"; c.lineWidth = 1.5; c.beginPath(); c.arc(q.x, q.y, q.s, 0, Math.PI * 2); c.stroke(); }
    }
    c.globalAlpha = 1;
    if (d.haze) {   // neblina: tapa la parte derecha (lo que se acerca)
      const [r, g, b] = d.haze, a = (d.kind === "fog" ? 0.85 : 0.6) * k;
      if (!this.hazeGrad || this.hazeKey !== d.id + Math.round(a * 20)) {
        const gr = c.createLinearGradient(420, 0, 760, 0); gr.addColorStop(0, `rgba(${r},${g},${b},0)`); gr.addColorStop(1, `rgba(${r},${g},${b},${a})`);
        this.hazeGrad = gr; this.hazeKey = d.id + Math.round(a * 20);
      }
      c.fillStyle = this.hazeGrad; c.fillRect(420, 0, W - 420, H);
      if (d.kind === "fog") for (let i = 0; i < 4; i++) {   // bancos de niebla que se mueven
        c.globalAlpha = 0.25 * k; c.fillStyle = `rgb(${r},${g},${b})`;
        c.fillRect(((i * 260 - this.g.time * 40) % (W + 260) + W + 260) % (W + 260) - 200, 210 + i * 32, 240, 14);
      }
      c.globalAlpha = 1;
    }
    if (this.flash > 0) { c.fillStyle = `rgba(240,240,255,${this.flash * 0.6})`; c.fillRect(0, 0, W, H); }
  }
}

