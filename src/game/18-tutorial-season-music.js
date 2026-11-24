// =====================================================================
//  Tutorial interactivo (nivel de práctica en el Desierto, sin poder morir) y TipManager (consejos la primera vez).
// =====================================================================
const TUTORIAL_CONFIG = {
  REWARD: 100,              // monedas al terminarlo (solo la primera vez)
  SPEED_MULT: 0.8,          // velocidad del nivel de práctica respecto a la normal
  RESPAWN_DELAY: 0.9,       // s entre intentos
  SPAWN_AHEAD: 640,         // px por delante del raptor a los que aparece cada obstáculo de práctica
};
// Cada paso espera a que se cumplan sus eventos (need) y a superar su obstáculo sin golpe
const TUTORIAL_STEPS = [
  { keys: ["jump"], text: "Pulsa {jump} para saltar el cactus", need: ["jump"], spawn: t => t.ground("small", 1) },
  { keys: ["jump", "jump"], text: "En el aire, pulsa {jump} otra vez: ¡doble salto! Lo necesitas para lo largo", need: ["doubleJump"], spawn: t => t.ground("big", 3) },
  { keys: ["slide"], text: "Pulsa {slide} para deslizarte bajo el pájaro", need: ["slide"], spawn: t => t.flyer() },
  { keys: ["jump", "slide"], text: "Salta el cactus y, ya en el aire, pulsa {slide}: caída rápida", need: ["fastFall"], spawn: t => t.ground("small", 1) },
  { keys: ["laneUp", "laneDown"], text: "Pulsa {laneUp} (arriba) o {laneDown} (abajo) para cambiar de carril y esquivar el muro", need: ["laneChange"], spawn: t => t.wall() },
  { keys: ["roar"], text: "Pulsa {roar}: el rugido rompe la roca", need: ["roarKill"], spawn: t => t.rock(), kill: true },
  { keys: [], text: "Coge las monedas, el power-up y el huevo", need: ["coinCollected", "powerup", "eggCollected"], spawn: t => t.goodies(), free: true },
  { keys: ["roar"], text: "Rompe rocas con {roar} para llenar la FURIA (arriba a la derecha). Llena: {roar} = ¡SÚPER RUGIDO!", need: ["superRoar"], spawn: t => t.rock(), kill: true, fury: true },
];
class Tutorial {
  constructor(game) { this.g = game; this.step = 0; this.t = 0; this.wait = 1.4; this.seen = new Set(); this.objs = []; this.done = false; this.msgT = 0; this.msg = ""; this.flash = 0; }
  get cur() { return TUTORIAL_STEPS[this.step]; }
  onEvent(type) { if (!this.done) this.seen.add(type); if (type === "furyFull") this.say(`¡FURIA LLENA! Pulsa ${this.g.controls.label("roar")}`, "#ff9a3c"); }
  say(t, col = "#ffd23f") { this.msg = t; this.msgCol = col; this.msgT = 1.6; }
  // Golpe: solo hace retroceder (nunca se pierde)
  onHit() {
    const g = this.g, pl = g.player;
    if (g.grace > 0) return false;
    g.grace = 1.2; g.sfx.lifeLost(); g.addShake(0.25, 5); this.failed = true;
    for (const o of g.obstacles) if (o.tut && !o.passed) { o.dead = true; g.puff(o.x, 0, o.lane, 10, "#ffffff"); }
    pl.x = PLAYER_X - 40;   // retrocede un poco y vuelve a su sitio
    this.say("¡Casi! Prueba otra vez", "#ff8a8a");
    return false;
  }
  // ----- Obstáculos de práctica -----
  get lane() { return this.g.player.lane; }
  get x0() { return PLAYER_X + TUTORIAL_CONFIG.SPAWN_AHEAD; }
  add(o) { o.tut = true; this.g.obstacles.push(o); this.objs.push(o); return o; }
  ground(size, count) { return [this.add(new Obstacle("ground", this.lane, this.x0, { size, count }, this.g.level.biome))]; }
  rock() { return [this.add(new Obstacle("rock", this.lane, this.x0, { size: "small" }, this.g.level.biome))]; }
  flyer() { const o = new Obstacle("flyer", this.lane, this.x0, { h: "mid" }, this.g.level.biome); o.extra = 0; return [this.add(o)]; }
  wall() {
    const b = this.g.level.biome, f = new Obstacle("flyer", this.lane, this.x0, { h: "wall" }, b); f.extra = 0;
    return [this.add(new Obstacle("ground", this.lane, this.x0, { size: "tall", count: 2 }, b)), this.add(f)];
  }
  goodies() {
    const g = this.g, l = this.lane, x = this.x0;
    for (let i = 0; i < 5; i++) g.coinsArr.push(new Coin(l, x + i * 34, 22));
    if (!this.seen.has("powerup")) g.powerups.push(new PowerUp("magnet", l, x + 260));
    if (!this.seen.has("eggCollected")) { const e = new BonusEgg(l, x + 420, 30); e.level = 1; g.eggs.push(e); }
    return [];
  }
  update(gdt, dt) {
    const g = this.g; this.t += dt; this.msgT = Math.max(0, this.msgT - dt); this.flash = Math.max(0, this.flash - dt);
    g.speed = CONFIG.BASE_SPEED * TUTORIAL_CONFIG.SPEED_MULT;
    const pl = g.player; if (pl.x < PLAYER_X) pl.x = Math.min(PLAYER_X, pl.x + 60 * dt);
    if (this.done) { if ((this.endT -= dt) <= 0) g.finishTutorial(); return; }
    const S = this.cur;
    if (S.fury) { if (g.roarCd > 1) g.roarCd = 1; if (!g.fury.full && g.fury.v < 60) g.fury.v = 60; }
    // ¿Superado?
    const behind = o => o.passed || o.x + o.w < PLAYER_X - 10;   // ya ha quedado atrás (también si estaba en el otro carril)
    const alive = this.objs.filter(o => !o.dead && !behind(o));
    const cleared = this.objs.length > 0 && alive.length === 0 && !this.failed && (S.kill ? this.objs.every(o => o.dead) : this.objs.every(behind));
    if (S.need.every(n => this.seen.has(n)) && (S.free || cleared)) return this.next();
    // Nuevo intento cuando no queda nada de práctica delante
    const extrasLeft = S.free && (g.coinsArr.length || g.powerups.length || g.eggs.length);
    if (!alive.length && !extrasLeft) {
      if (this.objs.length && !this.failed && !S.free) { this.say(S.kill ? "¡Rómpela con E!" : "Usa la acción que se pide", "#ff8a8a"); }
      if ((this.wait -= dt) <= 0) { this.objs = []; this.failed = false; if (!S.free) for (const n of S.need) if (n !== "superRoar" || !S.fury) this.seen.delete(n); S.spawn(this); this.wait = TUTORIAL_CONFIG.RESPAWN_DELAY; }
    }
  }
  next() {
    const g = this.g; this.step++; this.objs = []; this.failed = false; this.wait = 1.2; this.seen.clear(); this.flash = 0.6;
    g.sfx.perfect(); this.say("¡BIEN!", "#5fd15a");
    if (this.step >= TUTORIAL_STEPS.length) { this.done = true; this.endT = 2.6; g.sfx.levelUp(); g.bossBanner = { t: 2.6, text: "¡TUTORIAL COMPLETADO!", sub: "Ya sabes todo lo básico: ¡a por el récord!", color: "#5fd15a" }; }
  }
  // Panel de instrucciones con las teclas dibujadas
  draw(c, ui) {
    const g = this.g; if (this.done) return;
    const S = this.cur, w = 500, x = 214, y = 50;   // entre el marcador de puntos y el rugido
    c.fillStyle = "rgba(14,11,22,0.85)"; c.fillRect(x, y, w, 66); c.fillStyle = this.flash > 0 ? "#5fd15a" : UI_T.weak; c.fillRect(x, y, w, 3);
    ui.text(c, `TUTORIAL ${this.step + 1}/${TUTORIAL_STEPS.length}`, x + 12, y + 16, 10, UI_T.dim);
    let kx = x + 12;
    for (const k of S.keys) {   // tecla dibujada (parpadea)
      const on = Math.floor(this.t * 3) % 2 === 0, kl = g.controls.label(k), kw = Math.max(28, kl.length * 9 + 10);   // tecla elegida en Controles
      c.fillStyle = UI_T.line; c.fillRect(kx, y + 26, kw, 26); c.fillStyle = on ? UI_T.weak : "#3d3160"; c.fillRect(kx + 2, y + 28, kw - 4, 20); c.fillStyle = "rgba(0,0,0,0.3)"; c.fillRect(kx + 2, y + 44, kw - 4, 4);
      ui.text(c, kl, kx + kw / 2, y + 38, kl.length > 2 ? 10 : 14, on ? "#16111f" : UI_T.text, "center"); kx += kw + 6;
    }
    c.font = '10px "Raptor Pixel Display", monospace';   // texto en una o dos líneas
    const words = S.text.replace(/\{(\w+)\}/g, (m, a) => g.controls.label(a)).toUpperCase().split(" "), lines = [""], maxW = x + w - kx - 16;
    for (const wd of words) { const t = lines[lines.length - 1] ? lines[lines.length - 1] + " " + wd : wd; if (c.measureText(t).width > maxW && lines[lines.length - 1]) lines.push(wd); else lines[lines.length - 1] = t; }
    lines.slice(0, 3).forEach((l, i, a) => ui.text(c, l, kx + 6, y + 40 + (i - (a.length - 1) / 2) * 14, 10, UI_T.text));
    if (S.free) {   // lista de lo que falta coger
      const parts = [["coinCollected", "MONEDAS"], ["powerup", "POWER-UP"], ["eggCollected", "HUEVO"]].map(([k, n]) => (this.seen.has(k) ? "✔ " : "· ") + n).join("   ");
      ui.text(c, parts, x + w - 12, y + 16, 10, UI_T.go, "right");
    }
    if (this.msgT > 0) { c.globalAlpha = Math.min(1, this.msgT * 2); ui.text(c, this.msg, W / 2, 140, 20, this.msgCol, "center"); c.globalAlpha = 1; }
  }
}

// =====================================================================
//  TipManager: la primera vez que aparece algo, una pausa breve con un consejo de una línea y un dibujo
// =====================================================================
const TIPS = {
  boss: { text: "Llega un boss: el ROJO avisa de su ataque; el AMARILLO marca su punto débil. Mira abajo cómo se vence.", draw: "boss" },
  fury: { text: "¡Forma furiosa! A media vida el boss acelera y estrena un ataque nuevo: lee el aviso de abajo.", draw: "fury" },
  corrupt: { text: "Boss Corrupto (reforzado): más vida y más rápido. Da más monedas y fósiles.", draw: "fury" },
  altar: { text: "Un altar de ámbar: tócalo para recibir un PACTO (ventaja fuerte con desventaja). Puedes rechazarlo.", draw: "altar" },
  upgrade: { text: "Elige una mejora para esta partida. Las cartas con «SINERGIA» se combinan con lo que ya tienes.", draw: "card" },
  superRoar: { text: "¡Furia llena! Pulsa E para el SÚPER RUGIDO: destruye todo lo que hay en pantalla.", draw: "furybar" },
};
class TipManager {
  constructor(game) {
    this.g = game; const $ = id => document.getElementById(id);
    this.el = $("tip"); this.textEl = $("tipText"); this.cv = $("tipCanvas");
    $("tipOk").addEventListener("click", e => { e.currentTarget.blur(); this.close(); });
  }
  get d() { return this.g.save.data.tips; }
  get visible() { return !this.el.classList.contains("hidden"); }
  // key: identificador del consejo · data: datos extra (montura)
  show(key, data) {
    const g = this.g; if (this.d.off || g.versus || g.tutorial || g.netRace) return;
    const id = key === "mount" ? "mount-" + data.id : key;
    if (this.d.seen[id] || this.visible) return;
    this.d.seen[id] = 1; g.save.save();
    const tip = key === "mount" ? { text: `${data.name.toUpperCase()}: ${data.control}`, draw: "mount", mount: data.id } : TIPS[key]; if (!tip) return;
    this.tip = tip; this.textEl.textContent = tip.text;
    this.prev = g.state; if (g.state === "playing") g.state = "tip";
    this.el.classList.remove("hidden"); g.sfx.tick(); this.t = 0;
  }
  close() {
    const g = this.g; this.el.classList.add("hidden");
    if (g.state === "tip") { g.state = this.prev === "choice" ? "choice" : "playing"; g.grace = Math.max(g.grace, 0.6); }
  }
  // Dibujo del consejo (se anima en el bucle)
  drawCanvas(time) {
    if (!this.visible || !this.tip) return;
    const c = this.cv.getContext("2d"), w = this.cv.width, h = this.cv.height, k = this.tip.draw;
    c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.fillStyle = "#14101f"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#2f2549"; c.fillRect(0, h - 22, w, 22);
    if (k === "mount") drawMountIcon(c, this.tip.mount, w / 2, h - 34 + Math.sin(time * 5) * 2, time, 1.3);
    else if (k === "altar") { c.save(); c.translate(w / 2, h - 22); const A = new AmberAltar(0, 0); A.t = time; A.draw(c); c.restore(); }
    else if (k === "card") { for (let i = 0; i < 3; i++) { const x = w / 2 - 60 + i * 42, col = [ROGUE_CONFIG.RARITY.comun.color, ROGUE_CONFIG.RARITY.rara.color, ROGUE_CONFIG.RARITY.epica.color][i]; c.fillStyle = "#16111f"; c.fillRect(x - 2, 14 - (i === 1 ? 6 : 0), 40, 56); c.fillStyle = col; c.fillRect(x, 16 - (i === 1 ? 6 : 0), 36, 52); c.fillStyle = "#2f2549"; c.fillRect(x + 3, 19 - (i === 1 ? 6 : 0), 30, 46); drawUpIcon(c, ["roar", "move", "power"][i], col, 3, x + 6, 26 - (i === 1 ? 6 : 0)); } }
    else if (k === "furybar") { const f = (Math.sin(time * 3) + 1) / 2; c.fillStyle = "#16111f"; c.fillRect(20, 38, w - 40, 18); c.fillStyle = "#3a2f50"; c.fillRect(22, 40, w - 44, 14); c.fillStyle = f > 0.9 ? "#ffd23f" : "#ff9a3c"; c.fillRect(22, 40, (w - 44) * Math.min(1, f * 1.1), 14); }
    else {   // boss: sombra roja de aviso + rombo amarillo de punto débil
      const p = (Math.sin(time * 6) + 1) / 2;
      c.fillStyle = `rgba(255,59,59,${0.35 + 0.4 * p})`; c.beginPath(); c.ellipse(w * 0.32, h - 22, 34, 9, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#ff3b3b"; c.font = '20px "Raptor Pixel Display", monospace'; c.textAlign = "center"; c.fillText("!", w * 0.32, h - 36);
      c.save(); c.translate(w * 0.7, h - 46); c.rotate(Math.PI / 4); c.fillStyle = "#16111f"; c.fillRect(-13, -13, 26, 26); c.fillStyle = k === "fury" ? "#ff3b3b" : "#ffd23f"; c.fillRect(-10, -10, 20, 20); c.restore();
    }
  }
  resetSeen() { this.d.seen = {}; this.g.save.save(); }
  toggle() { this.d.off = !this.d.off; this.g.save.save(); }
}

// =====================================================================
//  SeasonPass: pase de temporada gratuito. Cada partida da XP; cada nivel del pase entrega su recompensa
//  automáticamente (monedas, huevos, fósiles y, en los niveles 10, 20 y 30, las skins exclusivas).
// =====================================================================
class SeasonPass {
  constructor(game) {
    this.g = game; const $ = id => document.getElementById(id);
    this.el = $("season"); this.track = $("seasonTrack"); this.bar = $("seasonBar"); this.lvlEl = $("seasonLvl"); this.xpEl = $("seasonXp"); this.prev = $("seasonPreview"); this.info = $("seasonInfo");
    $("seasonBack").addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); this.close(); });
    this.st = { tick: 0, speed: 2, trail: null, acc: 0, advance: true };
  }
  get d() { const s = this.g.save.data; if (!s.season || s.season.id !== SEASON_CONFIG.ID) s.season = { id: SEASON_CONFIG.ID, xp: 0, tier: 0, seen: 0 }; return s.season; }
  get visible() { return !this.el.classList.contains("hidden"); }
  get tier() { return this.d.tier; }
  // XP que falta para el siguiente nivel
  need(t = this.d.tier) { return SEASON_CONFIG.XP_TIER(t + 1); }
  // XP de una partida (la llama Game.bankRun)
  xpForRun(g) {
    const X = SEASON_CONFIG.XP;
    if (g.versus) return Math.floor(g.distScore / X.VERSUS_PER_POINTS);
    const levels = Math.max(0, g.level.level - g.startLevel);
    const xp = g.score / X.PER_POINTS + g.runBosses * X.BOSS + levels * X.LEVEL + g.runEggs * X.EGG + g.build.synergies.length * X.SYNERGY;
    return Math.round(xp * (SEASON_CONFIG.MODE_MULT[g.mode.id] || 1));
  }
  addXP(n) {
    const d = this.d, got = []; if (n <= 0 || d.tier >= SEASON_CONFIG.TIERS) return got;
    d.xp += n;
    while (d.tier < SEASON_CONFIG.TIERS && d.xp >= this.need()) { d.xp -= this.need(); d.tier++; got.push(this.grant(d.tier)); }
    if (d.tier >= SEASON_CONFIG.TIERS) d.xp = 0;
    this.g.save.save(); return got;
  }
  grant(t) {
    const s = this.g.save, r = seasonReward(t);
    if (r.kind === "coins") s.data.coins += r.n;
    else if (r.kind === "eggs") s.data.eggWallet += r.n;
    else if (r.kind === "fossils") s.data.fossils += r.n;
    else if (r.kind === "skin") s.give(r.id);
    const txt = this.rewardText(r);
    this.g.ach.queue.push({ title: `Pase · nivel ${t}`, name: txt, line: r.kind === "skin" ? "¡Equípala en la tienda!" : "Recompensa del pase de temporada", cat: "pase" });
    if (t >= SEASON_CONFIG.TIERS) this.g.ach.unlock("era-prismatica");
    return { t, r, txt };
  }
  rewardText(r) {
    if (r.kind === "coins") return `${r.n} monedas`;
    if (r.kind === "eggs") return `${r.n} huevos`;
    if (r.kind === "fossils") return `${r.n} fósiles`;
    const sk = SkinCatalog.get(r.id); return `Skin «${sk ? sk.name : r.id}»`;
  }
  // ----- Pantalla -----
  open() {
    const d = this.d; d.seen = d.tier; this.g.save.save();
    this.lvlEl.textContent = `Nivel ${d.tier}/${SEASON_CONFIG.TIERS}`;
    const max = d.tier >= SEASON_CONFIG.TIERS;
    this.xpEl.textContent = max ? "¡Pase completado!" : `${d.xp} / ${this.need()} XP para el nivel ${d.tier + 1}`;
    this.bar.style.width = `${max ? 100 : Math.round(d.xp / this.need() * 100)}%`;
    this.track.innerHTML = "";
    for (let t = 1; t <= SEASON_CONFIG.TIERS; t++) {
      const r = seasonReward(t), got = t <= d.tier, el = document.createElement("div");
      el.className = "ss-tier" + (got ? " got" : "") + (t === d.tier + 1 ? " next" : "") + (r.kind === "skin" ? " skin" : "");
      const ico = r.kind === "coins" ? `<span class="coin"></span>` : r.kind === "eggs" ? `<span class="egg-ico"></span>` : r.kind === "fossils" ? `<canvas class="fossil-ico" width="16" height="16" data-fossil="1"></canvas>` : `<canvas class="ss-skin" width="96" height="60" data-skin="${r.id}"></canvas>`;
      el.innerHTML = `<small>${t}</small>${ico}<b>${r.kind === "skin" ? SkinCatalog.get(r.id).name : this.rewardText(r)}</b>${got ? `<i>✔</i>` : ""}`;
      this.track.appendChild(el);
    }
    paintFossils(this.track);
    this.skinCards = [...this.track.querySelectorAll("canvas[data-skin]")].map(cv => ({ cv, id: cv.dataset.skin, st: { tick: randInt(0, 7), speed: 2, trail: null, acc: 0, advance: true } }));
    const final = SkinCatalog.get("prisma-celestial");
    this.info.innerHTML = `<b>${final.name}</b><small>${final.fx.label}</small><small>🔊 ${roarStyle("prisma-celestial").name}</small><small>${this.g.save.owns("prisma-celestial") ? "✔ ¡Ya es tuya!" : `Recompensa del nivel ${SEASON_CONFIG.TIERS}`}</small>`;
    this.el.classList.remove("hidden");
    const nx = this.track.querySelector(".next") || this.track.lastElementChild; if (nx) nx.scrollIntoView({ inline: "center", block: "nearest" });
  }
  close() { this.el.classList.add("hidden"); this.g.showMenu(); }
  update(dt) {
    if (!this.visible) return;
    tickStates([this.st, ...(this.skinCards || []).map(s => s.st)], dt);
    const c = this.prev.getContext("2d"); c.imageSmoothingEnabled = false;
    drawSkinPreview(c, "prisma-celestial", this.st, this.prev.width, this.prev.height, 7);
    for (const s of this.skinCards || []) { const x = s.cv.getContext("2d"); x.imageSmoothingEnabled = false; drawSkinPreview(x, s.id, s.st, s.cv.width, s.cv.height, 2); }
  }
}

// =====================================================================
//  Música por bioma: cada bioma tiene su propia melodía en bucle (escala, tempo, instrumentos y batería),
//  más una para la portada y una épica para el jefe secreto. Todo con osciladores (sin archivos de audio).
// =====================================================================
Sfx.prototype.snare = function (at) {
  const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = this.noiseBuf; f.type = "bandpass"; f.frequency.value = 1800;
  g.gain.setValueAtTime(0.06, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
  src.connect(f).connect(g).connect(c.destination); src.start(at); src.stop(at + 0.13);
};
Sfx.prototype.tom = function (at, f0 = 180) {
  const c = this.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, at + 0.16);
  g.gain.setValueAtTime(0.08, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
  o.connect(g).connect(c.destination); o.start(at); o.stop(at + 0.2);
};
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygianDom: [0, 1, 4, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], harmMinor: [0, 2, 3, 5, 7, 8, 11], pentaMaj: [0, 2, 4, 7, 9], pentaMin: [0, 3, 5, 7, 10], whole: [0, 2, 4, 6, 8, 10] };
// Pista generada a partir de grados de la escala (null = silencio)
function makeTrack(o) {
  const sc = SCALES[o.scale], n = sc.length;
  const deg = (d, oct) => o.root + sc[((d % n) + n) % n] + 12 * (Math.floor(d / n) + oct);
  return { step: o.step, play(s, i, at) {
    const b = o.bass[i % o.bass.length]; if (b != null) s.note(mtof(deg(b, -1)), o.bassDur || o.step * 1.8, o.bassWave || "triangle", o.bassVol || 0.05, at);
    const m = o.mel[i % o.mel.length]; if (m != null) s.note(mtof(deg(m, 1)), o.melDur || o.step * 1.2, o.melWave || "square", o.melVol || 0.016, at);
    if (o.arp) { const a = o.arp[i % o.arp.length]; if (a != null) s.note(mtof(deg(a, 1 + (o.arpOct || 0))), o.arpDur || o.step * 0.9, o.arpWave || "sine", o.arpVol || 0.012, at); }
    const d = o.drums ? o.drums[i % o.drums.length] : "."; if (d === "k") s.kick(at); else if (d === "h") s.hat(at); else if (d === "s") s.snare(at); else if (d === "t") s.tom(at, o.tomF || 180); else if (d === "x") { s.kick(at); s.hat(at); }
  } };
}
const _ = null;
const BIOME_MUSIC = {
  menu: { step: 0.17, root: 57, scale: "major", bass: [0, _, _, _, 4, _, _, _, 5, _, _, _, 3, _, 4, _],
    mel: [4, _, 5, _, 6, _, 4, _, 3, _, 2, _, 1, _, _, _, 2, _, 3, _, 4, _, 7, _, 6, _, 5, _, 4, _, _, _], arp: [0, 2, 4, 2], arpOct: 1, arpVol: 0.007, drums: "k...h...k.k.h..." },
  desert: { step: 0.15, root: 52, scale: "phrygianDom", bass: [0, _, 0, _, 1, _, 0, _, 0, _, 0, _, 6, _, 5, _],
    mel: [4, _, 5, 4, 2, _, 1, _, 2, _, 4, _, 1, 0, _, _, 4, _, 5, 6, 7, _, 6, 5, 4, _, 2, _, 1, _, 0, _], melWave: "triangle", melVol: 0.02, drums: "t.h.t.hht.h.t.h." , tomF: 150 },
  jungle: { step: 0.14, root: 55, scale: "pentaMaj", bass: [0, _, _, 0, 2, _, 3, _, 0, _, _, 0, 4, _, 3, _],
    mel: [5, 6, 7, _, 6, 5, 3, _, 5, _, 6, 5, 3, 2, _, _, 2, 3, 5, _, 3, 2, 0, _, 2, _, 3, 2, 0, _, _, _], melWave: "sine", melVol: 0.022, melDur: 0.12, drums: "t.ttk.t.t.ttk.th", tomF: 220 },
  volcano: { step: 0.12, root: 40, scale: "minor", bass: [0, 0, _, 0, 0, _, 3, 0, 0, 0, _, 0, 5, _, 4, _], bassWave: "sawtooth", bassVol: 0.045, bassDur: 0.12,
    mel: [7, _, _, 6, 7, _, 9, _, 8, _, 7, _, 5, _, _, _, 7, _, _, 6, 7, _, 10, _, 9, _, 8, _, 7, _, _, _], melVol: 0.018, drums: "k.hsk.hsk.hsk.ss" },
  glacier: { step: 0.2, root: 60, scale: "lydian", bass: [0, _, _, _, _, _, _, _, 4, _, _, _, _, _, _, _], bassWave: "sine", bassDur: 1.4,
    mel: [7, _, _, 9, _, _, 11, _, _, _, 10, _, 9, _, _, _, 7, _, _, 6, _, _, 4, _, _, _, 6, _, 7, _, _, _], melWave: "sine", melVol: 0.025, melDur: 0.9, arp: [0, 4, 7, 11], arpOct: 1, arpVol: 0.006, drums: "................h.......h......." },
  night: { step: 0.16, root: 50, scale: "dorian", bass: [0, _, _, _, 0, _, 4, _, 3, _, _, _, 3, _, 2, _],
    mel: [_, 4, _, 5, _, 6, 7, _, _, 6, _, 5, 4, _, _, _, _, 2, _, 3, _, 4, 6, _, 5, _, 4, _, 3, _, _, _], melWave: "triangle", melVol: 0.02, arp: [0, 2, 4, 6, 4, 2], arpVol: 0.007, drums: "k.......h.......k...k...h......." },
  beach: { step: 0.15, root: 60, scale: "major", bass: [0, _, 4, _, 0, _, 4, _, 3, _, 0, _, 4, _, 1, _],
    mel: [_, 4, 4, _, 5, 4, 2, _, _, 2, 2, _, 4, 2, 0, _, _, 4, 4, _, 5, 7, 5, _, 4, _, 2, _, 1, _, 0, _], melWave: "triangle", melVol: 0.024, melDur: 0.14, arp: [_, 2, _, 4, _, 2, _, 4], arpWave: "square", arpVol: 0.006, drums: "k.h.t.h.k.h.t.hh", tomF: 260 },
  mushroom: { step: 0.17, root: 58, scale: "whole", bass: [0, _, _, 2, _, _, 4, _, 0, _, _, 3, _, _, 5, _], bassWave: "sine",
    mel: [6, _, 7, _, 8, _, 7, 6, 5, _, _, _, 4, _, 5, _, 6, _, 8, _, 9, _, 8, 7, 6, _, _, _, 5, _, _, _], melWave: "sine", melVol: 0.024, melDur: 0.4, arp: [0, 3, 1, 4], arpOct: 2, arpVol: 0.005, drums: "k.....h...k...h." },
  ocean: { step: 0.19, root: 50, scale: "pentaMin", bass: [0, _, _, _, _, _, 3, _, 2, _, _, _, _, _, 1, _], bassWave: "sine", bassDur: 1,
    mel: [5, _, _, 6, _, _, 7, _, _, _, 6, _, 5, _, _, _, 3, _, _, 4, _, _, 5, _, _, _, 4, _, 3, _, _, _], melWave: "sine", melVol: 0.024, melDur: 0.7, arp: [0, 2, 4, 2], arpOct: 1, arpVol: 0.005, drums: "........h.......", },
  graveyard: { step: 0.17, root: 45, scale: "harmMinor", bass: [0, _, _, 0, _, _, 4, _, 5, _, _, 5, _, _, 4, _], bassWave: "square", bassVol: 0.03,
    mel: [7, _, 8, _, 7, _, 6, _, 7, _, _, _, 4, _, _, _, 5, _, 6, _, 5, _, 4, _, 2, _, 3, _, 4, _, _, _], melWave: "triangle", melVol: 0.022, melDur: 0.3, arp: [0, 2, 4, 6], arpWave: "square", arpVol: 0.004, drums: "k.......s.......k.k.....s......." },
  moon: { step: 0.11, root: 48, scale: "minor", bass: [0, _, 0, _, 0, _, 0, _, 5, _, 5, _, 6, _, 6, _], bassWave: "square", bassVol: 0.03, bassDur: 0.1,
    mel: [7, _, _, _, 9, _, _, _, 10, _, 9, _, 7, _, _, _, 5, _, _, _, 6, _, _, _, 7, _, 6, _, 4, _, _, _], melWave: "triangle", melVol: 0.02, melDur: 0.3, arp: [0, 2, 4, 7, 4, 2], arpWave: "square", arpVol: 0.007, arpOct: 1, drums: "k.h.k.h.k.h.k.hh" },
  santuario: { step: 0.13, root: 57, scale: "lydian", bass: [0, _, 0, _, 4, _, 4, _, 5, _, 5, _, 1, _, 1, _], bassVol: 0.05,
    mel: [7, _, 9, _, 11, _, 9, 10, 11, _, 13, _, 11, _, _, _, 12, _, 11, _, 9, _, 7, 8, 9, _, 11, _, 7, _, _, _], melWave: "square", melVol: 0.017, arp: [0, 2, 4, 6, 7, 6, 4, 2], arpVol: 0.008, arpOct: 1, drums: "k.h.s.h.k.hks.hh" },
  "boss-rex": { step: 0.09, root: 45, scale: "harmMinor", bass: [0, 0, 7, 0, 0, 7, 0, 5, 6, 6, 13, 6, 4, 4, 11, 4], bassWave: "sawtooth", bassVol: 0.04, bassDur: 0.08,
    mel: [7, _, 9, _, 10, _, 9, 7, 6, _, 7, _, 4, _, _, _, 7, _, 9, _, 11, _, 12, 11, 10, _, 9, _, 7, _, _, _], melVol: 0.02, arp: [0, 2, 4, 6], arpVol: 0.008, arpOct: 1, drums: "kshskshskshskssx" },
};
for (const k in BIOME_MUSIC) MUSIC[k === "menu" || k === "boss-rex" ? k : "b-" + k] = makeTrack(BIOME_MUSIC[k]);
// Qué pista suena en cada momento
function musicFor(g) {
  if (g.state === "menu" || g.state === "play") return "menu";
  if (g.state !== "playing" && g.state !== "choice" && g.state !== "tip") return null;
  if (g.bosses.active) return g.bosses.pending && g.bosses.pending.secret ? "boss-rex" : "boss";
  const k = "b-" + g.level.biome.id; return MUSIC[k] ? k : "calm";
}

