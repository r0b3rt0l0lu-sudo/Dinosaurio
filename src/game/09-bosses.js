// =====================================================================
//  BossManager: a mitad de cada nivel avisa con "¡PELIGRO!" y saca al boss del nivel,
//  que ataca mientras el raptor sigue corriendo (clases Boss de más abajo).
//  Si no se le vence en CONFIG.BOSS_MAX_TIME s, se retira sin premio.
// =====================================================================
const BOSS_IDS = ["escorpion", "serpiente", "golem", "mamut", "ptero", "cangrejo", "sapo", "kraken", "huesos", "nave"];
class BossManager {
  constructor(game) { this.game = game; this.reset(); }
  reset() { this.boss = null; this.phase = null; this.warn = 0; this.pending = null; this.hitTaken = false; this.defeatedRun = new Set(); this.syncTo(1); }
  get active() { return this.phase !== null; }
  // Siguiente boss a los BOSS_AT_IN_LEVEL puntos del nivel indicado (o del siguiente si ya se ha pasado)
  syncTo(level) { this.nextAt = (level - 1) * CONFIG.POINTS_PER_LEVEL + CONFIG.BOSS_AT_IN_LEVEL; }
  info(level) {
    if (level === SECRET_CONFIG.LEVEL && this.game.run.secret) return { type: BOSS_COUNT, tier: 0, level, secret: true };   // jefe secreto
    const d = levelDef(level); return { type: d.boss, tier: d.tier + Math.floor((level - 1) / CONFIG.LEVELS.length), level };
  }
  nameOf(level) { return BOSS_NAMES[this.info(level).type]; }
  startWarning() {
    const g = this.game, level = Math.floor(this.nextAt / CONFIG.POINTS_PER_LEVEL) + 1;
    this.pending = this.info(level);
    do this.nextAt += CONFIG.POINTS_PER_LEVEL; while (this.nextAt <= g.distScore);
    this.phase = "warning"; this.warn = CONFIG.BOSS_WARNING_TIME; g.sfx.bossWarn();
    g.mounts.dismount("boss");   // si va montado, se baja al llegar el jefe
  }
  // gdt = tiempo de juego (cámara lenta), dt = tiempo real
  update(gdt, dt) {
    const g = this.game;
    if (!this.phase) { if (g.distScore >= this.nextAt) this.startWarning(); return; }
    if (this.phase === "warning") {
      this.warn -= dt;
      if (this.warn <= 0) {
        this.boss = new BOSS_CLASSES[this.pending.type](g, this.pending.tier);
        this.phase = "fight"; this.hitTaken = false;
        g.bossHearts = g.stat("bossHearts") + g.pendingHeart; g.pendingHeart = 0;   // corazones extra para este combate
        g.ach.event("bossStart", { id: BOSS_IDS[this.pending.type], tier: this.pending.tier });
        g.tips.show("boss"); if (this.pending.tier) g.tips.show("corrupt");
        if (Math.random() < CONFIG.BOSS_POWERUP_CHANCE) {   // ayuda opcional al empezar la pelea
          const types = ["shield", "turbo"].filter(t => g.effects[t] <= 0);
          if (types.length) g.powerups.push(new PowerUp(choice(types), randInt(0, 1), 1050));
        }
      }
      return;
    }
    this.boss.update(gdt);
    if (this.boss.done) {
      this.boss = null; this.phase = null;
      g.spawner.nextAt = g.distance + g.speed * 1.0;   // breve respiro antes de volver a los obstáculos
    }
  }
  // Modo prueba: lanzar ya el boss del nivel actual
  force() {
    const g = this.game;
    if (this.phase || g.state !== "playing") return false;
    this.syncTo(g.level.level); this.startWarning(); this.warn = 0.5; return true;
  }
}

// =====================================================================
//  BOSSES — piezas comunes
//  Todos los ataques golpean la "columna" del dino (x fija) en un carril.
//  Tras cada ataque el boss apoya su punto débil (limb) en esa columna durante
//  la ventana de vulnerabilidad: se puede pisar, rugirle o esquivarlo.
// =====================================================================
const COL_X = PLAYER_X - 2, COL_W = 60;
const BOSS_NAMES = ["Escorpión gigante", "Serpiente de lianas", "Golem de lava", "Mamut de hielo", "Pterodáctilo sombra"];
const LASER = { low: { y: 0, h: 22 }, mid: { y: 40, h: 22 }, high: { y: 84, h: 28 } };
function toScreen(laneT, x, y) { const p = laneProj(laneT); return { x: VANISH_X + (x - VANISH_X) * p.s, y: p.gy - y * p.s, s: p.s }; }
// Rectángulo en coordenadas de carril (y = altura sobre el suelo)
function B(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(-y - h), Math.round(w), Math.round(h)); }
// Bloque con contorno y volumen: luz arriba, sombra abajo y en el lado derecho
function BO(c, out, col, x, y, w, h, o = 3) {
  B(c, out, x - o, y - o, w + 2 * o, h + 2 * o); B(c, col, x, y, w, h);
  if (w < 8 || h < 8 || col[0] !== "#") return;
  const hh = Math.max(2, Math.round(h * 0.16)), ww = Math.max(2, Math.round(w * 0.1));
  B(c, shadeHex(col, -0.22), x + w - ww, y, ww, h);
  B(c, shadeHex(col, -0.3), x, y, w, hh);
  B(c, shadeHex(col, 0.28), x, y + h - hh, w - ww, hh);
}
function bezier(a, b, ctl, u) {
  return { x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * ctl.x + u * u * b.x, y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * ctl.y + u * u * b.y };
}
// Cadena de bloques en pantalla (colas, brazos, cuerpos de serpiente)
function drawChain(c, a, b, ctl, n, s0, s1, out, cols, leaf) {
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = bezier(a, b, ctl, u), s = lerp(s0, s1, u);
    c.fillStyle = out; c.fillRect(p.x - s / 2 - 2, p.y - s / 2 - 2, s + 4, s + 4);
    c.fillStyle = cols[i % cols.length]; c.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    if (leaf && i % 3 === 1) { c.fillStyle = leaf; c.fillRect(p.x + s / 2, p.y - 4, 8, 5); }
  }
}

// Dibujo de proyectiles y peligros de los bosses (coordenadas de carril)
function drawSpikeHaz(c, h) {
  B(c, h.color, h.x, h.y, h.w, 8); B(c, h.hi, h.x + 2, h.y + 2, h.w - 4, 4);
  B(c, h.color, h.x + 4, h.y + 8, h.w - 8, 8); B(c, h.color, h.x + 7, h.y + 16, h.w - 14, 8); B(c, "#ffffff", h.x + 9, h.y + 24, 4, 4);
}
function drawRockHaz(c, h) {
  BO(c, "#1a1010", "#5a3a32", h.x, h.y, h.w, h.h);
  B(c, "#ff6a1a", h.x + 6, h.y + 8, 6, 4); B(c, "#ffb000", h.x + 16, h.y + 18, 5, 5);
  for (let i = 1; i < 4; i++) { c.globalAlpha = 0.4 - i * 0.1; B(c, "#ff6a1a", h.x + h.w + i * 10, h.y + h.h / 2 + i * 8, 10, 10); }
  c.globalAlpha = 1;
}
function drawMissileHaz(c, h) {
  BO(c, "#1b1f2a", "#c9d0dc", h.x, h.y + 9, h.w, 12, 2); B(c, "#ff4fd8", h.x, h.y + 9, 6, 12);
  B(c, "#ffb000", h.x + h.w, h.y + 11, 8 + Math.random() * 8, 8);
}
function drawVenomHaz(c, h) { BO(c, "#1f4a1c", "#8bdc3a", h.x, h.y, h.w, h.h, 2); B(c, "#e8ffb0", h.x + 3, h.y + h.h - 6, 5, 3); }
function drawFeatherHaz(c, h) { B(c, "#6a3aa0", h.x - 2, h.y + 2, h.w + 4, h.h - 4); B(c, "#140a24", h.x, h.y, h.w - 6, h.h); B(c, "#ff3355", h.x, h.y + 4, 4, 4); }
function drawLaserHaz(c, h) {
  c.fillStyle = "rgba(255,79,216,0.35)"; c.fillRect(h.x, -(h.y + h.h) - 6, h.w, h.h + 12);
  c.fillStyle = "#ff4fd8"; c.fillRect(h.x, -(h.y + h.h), h.w, h.h);
  c.fillStyle = "#ffe0f8"; c.fillRect(h.x, -(h.y + h.h * 0.7), h.w, h.h * 0.35);
}
function drawFrostHaz(c, h) {
  c.fillStyle = "rgba(210,245,255,0.85)"; c.fillRect(h.x, -6, h.w, 8);
  c.fillStyle = "#e8fbff"; for (let x = h.x + 6; x < h.x + h.w; x += 14) { c.fillRect(x, -h.h, 3, h.h); c.fillRect(x - 3, -h.h + 7, 9, h.h - 7); }
}
function drawPteroShadow(c, cx, cy, s, flap, folded) {
  c.save(); c.translate(cx, cy); c.scale(s, s);
  const D = "#140a24", E = "#6a3aa0", R = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  if (folded) { R(E, -24, -16, 44, 20); R(D, -22, -14, 40, 16); }
  else for (let i = 0; i < 5; i++) {
    const wx = 8 + i * 12, wy = -6 - flap * i * 6, hh = 10 - i;
    R(E, wx - 1, wy - 1, 14, hh + 2); R(D, wx, wy, 12, hh); R(E, -wx - 13, wy - 1, 14, hh + 2); R(D, -wx - 12, wy, 12, hh);
  }
  R(E, -24, -8, 50, 16); R(D, -22, -6, 46, 12);
  R(E, -46, -15, 26, 15); R(D, -44, -13, 22, 11); R(D, -60, -8, 18, 4); R(D, -26, -24, 10, 10);
  R("#ff3355", -38, -11, 5, 4); R(D, 22, -2, 20, 4);
  c.restore();
}

// Peligro genérico: proyectiles, golpes, láseres, suelo congelado… (coordenadas de carril)
class Hazard {
  constructor(o) {
    Object.assign(this, { lane: 1, x: 0, y: 0, w: 20, h: 20, vx: 0, vy: 0, g: 0, life: Infinity, t: 0,
      harmful: true, projectile: false, reflectable: false, destructible: false, scroll: false, isBody: false,
      dead: false, reflected: false, onUpdate: null, onLand: null, draw: null }, o);
    this.laneT = this.lane;
  }
  box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  update(dt, game, boss) {
    this.t += dt;
    if (this.reflected) {   // vuela de vuelta hacia el boss
      const tg = boss.target(), dx = tg.x - this.x, dy = tg.y - this.y, d = Math.hypot(dx, dy) || 1, step = 1100 * dt;
      this.laneT = lerp(this.laneT, tg.laneT, Math.min(1, dt * 6));
      if (d <= step + 12) { this.dead = true; boss.onReflectHit(); return; }
      this.x += dx / d * step; this.y += dy / d * step;
      return;
    }
    this.vy -= this.g * dt;
    this.x += (this.vx - (this.scroll ? game.effectiveSpeed : 0)) * dt;
    this.y += this.vy * dt;
    if (this.onUpdate) this.onUpdate(this, dt, game);
    if (this.g && this.y <= 0 && this.vy < 0 && this.onLand) this.onLand(this, game);
    if (this.t >= this.life || this.x < -300 || this.x > 1500) this.dead = true;
  }
}

// =====================================================================
//  Boss (clase base): estados, ventana de vulnerabilidad, daño, trampas y dibujo común
// =====================================================================
class Boss {
  constructor(game, cycle, name, hpMult = 1) {
    this.game = game; this.cycle = cycle; this.name = name;
    this.speedMul = (1 + CONFIG.BOSS_SPEED_PER_CYCLE * cycle) * game.mode.bossSpeedMult;
    this.maxHp = Math.max(1, Math.round(CONFIG.BOSS_HP * hpMult * (1 + CONFIG.BOSS_HP_PER_CYCLE * cycle) * game.mode.bossHpMult * game.stat("bossHpMult")));
    this.hp = this.maxHp;
    this.coins = CONFIG.BOSS_COINS + CONFIG.BOSS_COINS_PER_CYCLE * cycle;
    this.state = "enter"; this.stateT = 0; this.fightT = 0; this.t = 0; this.away = 1; this.done = false;
    this.hazards = []; this.teles = []; this.traps = []; this.fx = []; this.timers = [];
    this.vuln = 0; this.flash = 0; this.limb = null; this.stomped = false; this.turboCd = 0;
    this.trapTimes = CONFIG.BOSS_TRAP_TIMES.slice();
    this.colors = ["#ffffff"]; this.trapKind = "quicksand"; this.trapColor = "#ffffff";
    // Reglas de daño: cada boss solo se puede dañar de ciertas formas (ver setRules en cada clase)
    this.rules = { stomp: true, roar: true, reflect: true, trap: true, turbo: true };
    this.dmg = { stomp: CONFIG.BOSS_DMG_STOMP, roar: CONFIG.BOSS_DMG_ROAR, reflect: CONFIG.BOSS_DMG_REFLECT, trap: CONFIG.BOSS_DMG_TRAP, turbo: CONFIG.BOSS_DMG_TURBO };
    this.limbHurts = false;                      // pisar el punto débil hace daño al jugador (pinchos, lava…)
    this.reflectDist = CONFIG.REFLECT_DISTANCE;  // distancia para devolver un proyectil con el rugido
    this.roarCdMult = 1;                         // recarga del rugido durante esta pelea
    this.vulnMult = 1;                           // duración de la ventana de vulnerabilidad
    this.maxTime = CONFIG.BOSS_MAX_TIME;
    this.hint = "";
    // Forma furiosa (al bajar de CONFIG.BOSS_FURY_AT de vida): más rápido, avisos más cortos y una mecánica nueva
    this.fury = false; this.furyAt = game.stat("bossFuryAt"); this.furyHint = ""; this.furyT = 0;
  }
  setRules(r, hint) { Object.assign(this.rules, r); if (!this.rules.trap) this.trapTimes = []; if (hint) this.hint = hint; }
  hintText() { return this.hint; }
  hudHint() { return this.furyT > 0 && this.furyHint ? "¡FURIA! " + this.furyHint : this.hintText(); }
  enterFury() {
    this.fury = true; this.furyT = CONFIG.BOSS_FURY_HINT_TIME; this.speedMul *= CONFIG.BOSS_FURY_SPEED;
    this.game.addShake(0.5, 9); this.game.sfx.bossWarn();
    const tg = this.target(); this.game.floatText(tg.laneT, tg.x, tg.y + 60, "¡FURIA!", "#ff3b3b", 34);
    this.onFury();
    this.game.tips.show("fury");
  }
  onFury() {}
  canStomp() { return this.rules.stomp; }
  onReflectHit() { if (this.rules.reflect) this.damage(this.dmg.reflect, "reflect"); else this.game.floatText(0, this.target().x, this.target().y + 40, "¡NO LE AFECTA!", "#cccccc", 18); }
  roarHitLimb(L) { if (this.rules.roar) this.damage(this.dmg.roar, "roar", { laneT: L.lane, x: L.x + L.w / 2, y: L.y + L.h }); }
  extraCollide() { return false; }   // colisiones propias de cada boss (devuelve true si el jugador muere)
  onLimbTouch() { return false; }    // contacto propio con el punto débil (true = ya gestionado)
  say(text, color = "#ffd23f", size = 22, laneT = this.p.logicalLane, x = this.p.x + 40, y = this.p.y + 100) { this.game.floatText(laneT, x, y, text, color, size); }
  get p() { return this.game.player; }
  after(d, fn) { this.timers.push({ t: d, fn }); }
  tele(d) { const m = this.game.mode.bossTeleMult * (this.fury ? CONFIG.BOSS_FURY_TELEGRAPH : 1) * this.game.stat("teleMult"); return Math.max(CONFIG.BOSS_TELEGRAPH_MIN * m, d * CONFIG.BOSS_TELEGRAPH * m / this.speedMul); }
  warn(lane, kind, dur, o = {}) { this.teles.push({ lane, kind, dur, t: 0, x: COL_X, y: 0, w: COL_W, h: 0, ...o }); }
  addHazard(o) { const h = new Hazard(o); this.hazards.push(h); return h; }
  setState(s) { this.state = s; this.stateT = 0; }

  // Deja el punto débil apoyado en la columna del dino y abre la ventana de vulnerabilidad
  rest(lane, box, extra = 0, onEnd) {
    if (this.state !== "fight") return;
    const vt = this.game.mode.bossVulnTime * this.vulnMult * this.game.stat("bossVulnMult");
    this.limb = { lane, ...box }; this.vuln = vt; this.stomped = false;
    this.after(vt, () => { this.limb = null; this.vuln = 0; if (onEnd) onEnd(); });
    this.after(vt + extra + CONFIG.BOSS_ATTACK_GAP / this.speedMul, () => { if (this.state === "fight") this.attack(); });
  }
  // Proyectil en arco que cae en la columna del dino (rocas, misiles)
  lob(lane, x0, y0, T, draw) {
    const g = 1500, x1 = COL_X + 14;
    return this.addHazard({ lane, x: x0, y: y0, w: 30, h: 30, vx: (x1 - x0) / T, vy: -y0 / T + 0.5 * g * T, g, life: T + 0.5,
      projectile: true, reflectable: true, destructible: true, draw,
      onLand: (h, game) => { h.dead = true; game.burst(lane, h.x + 15, 6, this.colors, 10); game.addShake(0.12, 3); } });
  }
  // Pincho que cae del cielo delante del dino y se acerca por el suelo
  dropSpike(lane, color, hi, draw = drawSpikeHaz) {
    const d = this.tele(0.6);
    this.warn(lane, "arrow", d, { y: 10 });
    this.after(d, () => this.addHazard({ lane, x: 680, y: 240, w: 22, h: 28, vy: -100, g: 2000, color, hi,
      projectile: true, reflectable: true, destructible: true, draw,
      onLand: (h, game) => { h.y = 0; h.vy = 0; h.g = 0; h.scroll = true; game.puff(h.x + 11, 0, lane, 6, hi); } }));
  }

  update(dt) {
    this.t += dt; this.stateT += dt;
    this.furyT = Math.max(0, this.furyT - dt);
    this.flash = Math.max(0, this.flash - dt); this.turboCd = Math.max(0, this.turboCd - dt);
    const due = [];
    for (const tm of this.timers) { tm.t -= dt; if (tm.t <= 0) due.push(tm); }
    if (due.length) { this.timers = this.timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn()); }
    for (const h of this.hazards) h.update(dt, this.game, this);
    this.hazards = this.hazards.filter(h => !h.dead);
    for (const w of this.teles) w.t += dt;
    this.teles = this.teles.filter(w => w.t < w.dur);
    const sp = this.game.effectiveSpeed;
    for (const tr of this.traps) { tr.t += dt; tr.x -= sp * dt; }
    this.traps = this.traps.filter(tr => !tr.used && tr.x > -120);
    for (const f of this.fx) { f.t += dt; if (!f.hit && f.t >= 0.45) { f.hit = true; this.game.addShake(0.3, 8); this.damage(this.dmg.trap, "trap"); } }
    this.fx = this.fx.filter(f => f.t < 0.9);

    if (this.state === "enter") {
      this.away = 1 - easeInOut(clamp(this.stateT / CONFIG.BOSS_ENTER_TIME, 0, 1));
      if (this.stateT >= CONFIG.BOSS_ENTER_TIME) { this.setState("fight"); this.after(0.4, () => this.attack()); }
    } else if (this.state === "fight") {
      this.fightT += dt;
      if (this.trapTimes.length && this.fightT >= this.trapTimes[0]) {
        this.trapTimes.shift(); this.traps.push({ lane: randInt(0, 1), x: 1000, w: 54, t: 0, used: false });
      }
      if (this.fightT >= this.maxTime) this.retreat();
    } else if (this.state === "leave") {
      this.away = easeInOut(clamp(this.stateT / 1.5, 0, 1));
      if (this.stateT >= 1.6) this.done = true;
    } else if (this.state === "defeat") {
      if (Math.random() < dt * 14) { const c = this.target(); this.game.burst(c.lane, c.x + rand(-60, 60), c.y + rand(-30, 30), this.colors, 8); }
      if (this.stateT >= 1.8) this.done = true;
    }
    this.updateBody(dt);
  }
  clearAttacks() { this.timers = []; this.hazards = this.hazards.filter(h => h.reflected); this.teles = []; this.traps = []; this.limb = null; this.vuln = 0; }
  retreat() { this.clearAttacks(); this.setState("leave"); this.game.onBossRetreat(this); }
  defeat() { this.clearAttacks(); this.setState("defeat"); this.game.onBossDefeated(this); }
  damage(n, kind, at) {
    if (this.state !== "fight" || this.hp <= 0) return false;
    const g = this.game, pt = at || this.target();
    if (kind !== "test" && kind !== "team" && Math.random() < g.stat("critChance")) { n *= 2; g.floatText(pt.laneT, pt.x, pt.y + 70, "¡CRÍTICO!", "#ff9a3c", 22); }
    g.fury.add(FURY_CONFIG.BOSS_HIT); g.ach.event("bossHit", { n, kind });
    this.hp = Math.max(0, this.hp - n); this.flash = 0.3;
    g.sfx.bossHit(); g.addShake(0.2, 5);
    g.floatText(pt.laneT, pt.x, pt.y + 30, `-${n}`, "#ffffff", 28);
    g.burst(Math.round(pt.laneT), pt.x, pt.y, this.colors, 14);
    if (this.hp <= 0) this.defeat();
    else if (!this.fury && this.hp <= this.maxHp * this.furyAt) this.enterFury();
    return true;
  }
  turboHit(at) { if (this.turboCd > 0 || !this.rules.turbo) return; this.turboCd = 1; this.damage(this.dmg.turbo, "turbo", at); }
  breakHazard(h) { h.dead = true; this.game.burst(h.lane, h.x + h.w / 2, h.y + h.h / 2, this.colors, 8); this.game.sfx.smash(); }
  triggerTrap(tr) {
    if (tr.used || this.state !== "fight") return;
    tr.used = true; this.fx.push({ t: 0, hit: false }); this.game.sfx.trap();
    this.game.floatText(tr.lane, tr.x + tr.w / 2, 90, "¡TRAMPA!", this.trapColor, 20);
  }

  // Colisiones con el jugador. Devuelve true si el jugador ha muerto.
  collide(pl) {
    const g = this.game, lane = pl.logicalLane, boxes = pl.hitboxes(), turbo = g.effects.turbo > 0;
    const hits = b => boxes.some(a => overlap(a, b));
    if (this.extraCollide(pl, lane, boxes, hits)) return true;
    for (const h of this.hazards) {
      if (h.dead || h.reflected || !h.harmful || h.lane !== lane || !hits(h.box())) continue;
      if (turbo) { if (h.isBody) this.turboHit({ laneT: lane, x: h.x + h.w / 2, y: h.y + h.h / 2 }); else if (h.projectile || h.destructible) this.breakHazard(h); continue; }
      if (h.projectile) this.breakHazard(h);
      if (g.hitPlayer()) return true;
    }
    const L = this.limb;
    if (L && L.lane === lane && hits(L)) {
      const at = { laneT: lane, x: L.x + L.w / 2, y: L.y + L.h };
      if (turbo) this.turboHit(at);
      else if (this.onLimbTouch(pl, at, L)) { /* regla propia del boss */ }
      else if (pl.vy < 0 && pl.prevY >= L.y + L.h - 10) {       // cae desde arriba sobre el punto débil
        if (this.limbHurts) { pl.y = L.y + L.h; pl.bounce(); g.floatText(lane, pl.x + 30, pl.y + 90, "¡AY!", "#ff6b6b", 22); if (g.hitPlayer()) return true; }
        else {
          if (pl.fastFall && !this.stomped) {
            this.stomped = true;
            if (this.canStomp()) { g.sfx.stomp(); g.floatText(lane, pl.x + 30, pl.y + 90, "¡PISOTÓN!", "#ffd23f", 22); this.damage(this.dmg.stomp, "stomp", at); }
            else { g.sfx.denied(); g.floatText(lane, pl.x + 30, pl.y + 90, "¡CLANG!", "#cccccc", 20); }
          }
          pl.y = L.y + L.h; pl.bounce();
        }
      } else if (g.hitPlayer()) return true;                   // tocar otra parte del boss
    }
    for (const tr of this.traps) if (!tr.used && tr.lane === lane && pl.x + 50 > tr.x && pl.x + 10 < tr.x + tr.w) this.triggerTrap(tr);
    return false;
  }
  // Al empezar un rugido: devuelve los proyectiles que están a punto de alcanzar al dino
  onRoar(lane) {
    if (!this.rules.reflect) return;
    const pl = this.p, front = pl.x + 56;
    for (const h of this.hazards) {
      if (!h.reflectable || h.reflected || h.dead || h.lane !== lane) continue;
      const dx = h.x - front;
      if (dx > -h.w - 30 && dx < this.reflectDist && h.y < pl.y + 130) {
        h.reflected = true; h.harmful = false; this.game.sfx.perfect();
        this.game.floatText(lane, pl.x + 70, pl.y + 100, "¡PERFECTO!", "#7df9ff", 24);
      }
    }
  }
  // Cada frame de la onda del rugido: rompe proyectiles, daña si es vulnerable, activa trampas
  roarWave(w, x0, x1) {
    for (const h of this.hazards)
      if (!h.dead && !h.reflected && h.destructible && h.lane === w.lane && h.x < x1 && h.x + h.w > x0) this.breakHazard(h);
    const L = this.limb;
    if (!w.bossHit && this.vuln > 0 && L && L.lane === w.lane && L.x < x1 && L.x + L.w > x0) {
      w.bossHit = true; this.roarHitLimb(L);
    }
    if (!this.rules.trap) return;
    for (const tr of this.traps) if (!tr.used && tr.lane === w.lane && tr.x < x1 && tr.x + tr.w > x0) this.triggerTrap(tr);
  }

  // ----- Dibujo -----
  drawSky() {}
  drawGround(c, lane) {
    for (const w of this.teles) if (w.lane === lane) { c.save(); applyLane(c, lane); this.drawTele(c, w); c.restore(); }
    for (const tr of this.traps) if (tr.lane === lane) { c.save(); applyLane(c, lane); this.drawTrap(c, tr); c.restore(); }
  }
  drawLayer(c, lane) {
    c.save();
    if (this.flash > 0 && Math.floor(this.flash * 30) % 2 === 0) c.filter = "brightness(3)";
    else if (this.vuln > 0) c.filter = `brightness(${1.15 + 0.12 * Math.sin(this.t * 18)})`;
    if (this.state === "defeat") c.globalAlpha = clamp(1 - this.stateT / 1.8, 0, 1);
    this.drawBody(c, lane);
    c.restore();
    for (const h of this.hazards) if ((h.laneT < 0.5 ? 0 : 1) === lane && h.draw) { c.save(); applyLane(c, h.laneT); h.draw(c, h); c.restore(); }
    const L = this.limb;
    if (L && L.lane === lane && this.vuln > 0) {   // marca del punto débil
      c.save(); applyLane(c, lane);
      const top = -(L.y + L.h), a = 0.6 + 0.4 * Math.sin(this.t * 14), bob = Math.sin(this.t * 8) * 4, cx = L.x + L.w / 2;
      c.strokeStyle = `rgba(255,230,80,${a})`; c.lineWidth = 3; c.strokeRect(L.x - 2, top - 3, L.w + 4, 9);
      c.fillStyle = `rgba(255,230,80,${a})`;
      c.beginPath(); c.moveTo(cx - 11, top - 34 + bob); c.lineTo(cx + 11, top - 34 + bob); c.lineTo(cx, top - 18 + bob); c.closePath(); c.fill();
      c.restore();
    }
  }
  bang(c, x, y) {
    c.font = 'bold 30px "Raptor Pixel Display", monospace'; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = 5; c.strokeStyle = "#15161c"; c.strokeText("!", x, y); c.fillStyle = "#ff3b3b"; c.fillText("!", x, y);
  }
  drawTele(c, w) {
    const k = clamp(w.t / w.dur, 0, 1), blink = Math.floor(w.t * 10) % 2 === 0, cx = w.x + w.w / 2;
    if (w.kind === "shadow" || w.kind === "target") {
      c.fillStyle = `rgba(90,0,0,${0.25 + 0.35 * k})`;
      c.beginPath(); c.ellipse(cx, 0, (w.w / 2 + 12) * (0.4 + 0.6 * k), 8, 0, 0, Math.PI * 2); c.fill();
      if (w.kind === "target") {
        c.strokeStyle = "#ff3b3b"; c.lineWidth = 3;
        c.beginPath(); c.ellipse(cx, 0, w.w / 2 + 10, 9, 0, 0, Math.PI * 2); c.stroke();
        c.fillStyle = "#ff3b3b"; c.fillRect(cx - 1, -12, 2, 24);
      }
      if (blink) this.bang(c, cx, -130);
    } else if (w.kind === "arrow") {
      if (blink) {
        const x = 820, y = -(w.y + 16);
        c.fillStyle = "#ff3b3b"; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 28, y - 16); c.lineTo(x + 28, y + 16); c.closePath(); c.fill();
        this.bang(c, x + 50, y);
      }
    } else if (w.kind === "line") {
      c.fillStyle = `rgba(255,59,92,${0.1 + 0.2 * k})`; c.fillRect(0, -(w.y + w.h), w.x2, w.h);
      if (blink) { c.fillStyle = "#ff3b5c"; c.fillRect(0, -(w.y + w.h / 2) - 1, w.x2, 3); }
    } else if (w.kind === "frost") {
      c.fillStyle = `rgba(210,245,255,${0.7 * k})`; c.fillRect(0, -6, 430 * k, 10);
    } else if (w.kind === "fire") {
      c.fillStyle = `rgba(255,90,20,${0.3 + 0.5 * k})`; c.fillRect(0, -6, 430 * k, 10);
      if (blink) this.bang(c, 215, -60);
    }
  }
  drawTrap(c, tr) {
    const bob = Math.sin(this.t * 6) * 4, cx = tr.x + tr.w / 2;
    c.fillStyle = "rgba(0,0,0,0.35)"; c.fillRect(tr.x - 3, -5, tr.w + 6, 9);
    c.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(this.t * 5)); c.fillStyle = this.trapColor; c.fillRect(tr.x, -6, tr.w, 6); c.globalAlpha = 1;
    c.save(); c.translate(cx, -42 + bob); c.rotate(Math.PI / 4);
    c.fillStyle = "#15161c"; c.fillRect(-14, -14, 28, 28); c.fillStyle = this.trapColor; c.fillRect(-11, -11, 22, 22); c.restore();
    c.fillStyle = "#15161c"; c.fillRect(cx - 2, -52 + bob, 4, 11); c.fillRect(cx - 2, -38 + bob, 4, 4);
  }
  // Efecto de la trampa del escenario golpeando al boss (en pantalla)
  drawFx(c) {
    for (const f of this.fx) {
      const k = f.t / 0.9, tg = this.target(), T = toScreen(tg.laneT, tg.x, tg.y), G = toScreen(tg.laneT, tg.x, 0);
      c.save();
      switch (this.trapKind) {
        case "quicksand":
          for (let i = 0; i < 4; i++) {
            c.strokeStyle = `rgba(170,120,60,${0.9 - i * 0.18})`; c.lineWidth = 5;
            c.beginPath(); c.ellipse(G.x, G.y, (40 + i * 24) * Math.min(1, k * 2), 8 + i * 3, 0, 0, Math.PI * 2); c.stroke();
          }
          break;
        case "log": {
          const y = k < 0.5 ? lerp(-60, T.y - 20, k / 0.5) : T.y - 20;
          c.fillStyle = "#3b2412"; c.fillRect(T.x - 64, y - 15, 128, 30); c.fillStyle = "#7a4f2a"; c.fillRect(T.x - 62, y - 13, 124, 26);
          c.fillStyle = "#c89a5c"; c.fillRect(T.x + 50, y - 11, 10, 22); c.fillStyle = "#4f9a3a"; c.fillRect(T.x - 40, y - 17, 18, 5);
          break;
        }
        case "geyser": {
          const hh = Math.min(1, k * 2.2) * (G.y - T.y + 90);
          c.fillStyle = "#ff6a1a"; c.fillRect(G.x - 24, G.y - hh, 48, hh); c.fillStyle = "#ffd05a"; c.fillRect(G.x - 10, G.y - hh, 20, hh);
          break;
        }
        case "stalactite": {
          const y = k < 0.5 ? lerp(-90, T.y - 20, k / 0.5) : T.y - 20;
          c.fillStyle = "#6fb0d8"; c.beginPath(); c.moveTo(T.x - 26, y - 80); c.lineTo(T.x + 26, y - 80); c.lineTo(T.x, y + 20); c.closePath(); c.fill();
          c.fillStyle = "#e8f7ff"; c.beginPath(); c.moveTo(T.x - 12, y - 76); c.lineTo(T.x + 4, y - 76); c.lineTo(T.x - 2, y); c.closePath(); c.fill();
          break;
        }
        case "spore": {   // seta explosiva
          for (let i = 0; i < 10; i++) {
            const a = i / 10 * Math.PI * 2, r = 20 + k * 120;
            c.fillStyle = i % 2 ? "#ff7ad0" : "#7df9ff"; c.globalAlpha = 1 - k;
            c.fillRect(T.x + Math.cos(a) * r - 6, T.y + Math.sin(a) * r * 0.6 - 6, 12, 12);
          }
          c.globalAlpha = 1; c.fillStyle = "#d23a4a"; c.beginPath(); c.ellipse(G.x, G.y - 30 * Math.min(1, k * 3), 50, 26, 0, Math.PI, 0); c.fill();
          break;
        }
        case "meteor": {
          const u = Math.min(1, k / 0.5), x = lerp(T.x + 320, T.x, u), y = lerp(-60, T.y, u);
          for (let i = 1; i < 6; i++) { c.globalAlpha = 0.5 - i * 0.08; c.fillStyle = "#ffb000"; c.fillRect(x + i * 18 - 8, y - i * 11 - 8, 16, 16); }
          c.globalAlpha = 1; c.fillStyle = "#ff6a1a"; c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.fill();
          c.fillStyle = "#ffd05a"; c.beginPath(); c.arc(x - 4, y - 4, 9, 0, Math.PI * 2); c.fill();
          break;
        }
        case "lightning": {
          const px = T.x - 170;
          c.fillStyle = "#3a3f55"; c.fillRect(px - 4, G.y - 170, 8, 170); c.fillRect(px - 22, G.y - 170, 44, 6);
          c.fillStyle = "#ffe600"; c.fillRect(px - 6, G.y - 176, 12, 6);
          if (k > 0.3 && Math.floor(f.t * 20) % 2 === 0) {
            c.strokeStyle = "#fff6a0"; c.lineWidth = 4; c.beginPath(); c.moveTo(px, G.y - 170);
            for (let i = 1; i <= 6; i++) c.lineTo(lerp(px, T.x, i / 6) + rand(-10, 10), lerp(G.y - 170, T.y, i / 6) + rand(-12, 12));
            c.stroke();
          }
          break;
        }
      }
      if (k > 0.5) { c.globalAlpha = 1 - (k - 0.5) / 0.5; c.strokeStyle = "#ffffff"; c.lineWidth = 4; c.beginPath(); c.arc(T.x, T.y, 20 + (k - 0.5) * 160, 0, Math.PI * 2); c.stroke(); }
      c.restore();
    }
  }
}

// ---------------------------------------------------------------------
// 1. Desierto — Escorpión gigante: persigue por detrás; clava la cola en un carril
//    y lanza pinchos que caen delante del dino.
// ---------------------------------------------------------------------
class ScorpionBoss extends Boss {
  constructor(game, cycle) {
    super(game, cycle, BOSS_NAMES[0], 1);
    this.colors = ["#b5542a", "#5a2210", "#e07a3f"]; this.trapKind = "quicksand"; this.trapColor = "#d9a35e";
    this.bx = -380; this.tip = { laneT: 0.5, x: 170, y: 200 }; this.tipTo = { ...this.tip }; this.idleTip = true; this.fast = false;
    this.setRules({ roar: false, reflect: false, trap: false }, "PISOTÓN: cuando clave el aguijón, salta y cae encima con S");
  }
  target() { return { lane: 1, laneT: 0.5, x: this.bx + 100, y: 40 }; }
  updateBody(dt) {
    this.bx = -120 - this.away * 260 + Math.sin(this.t * 3) * 6 - (this.state === "defeat" ? this.stateT * 40 : 0);
    if (this.idleTip) this.tipTo = { laneT: 0.5, x: 175 + Math.sin(this.t * 2) * 10, y: 195 + Math.sin(this.t * 3) * 8 - this.away * 100 };
    const k = Math.min(1, dt * (this.fast ? 30 : 7));
    for (const key of ["laneT", "x", "y"]) this.tip[key] = lerp(this.tip[key], this.tipTo[key], k);
  }
  clearAttacks() { super.clearAttacks(); this.idleTip = true; this.fast = false; }
  attack() { if (Math.random() < 0.45) this.strike(this.p.lane); else this.volley(); }
  strike(lane) {   // solo se esquiva cambiando de carril
    const d = this.tele(0.85);
    this.idleTip = false; this.fast = false; this.tipTo = { laneT: lane, x: 160, y: 240 };
    this.warn(lane, "shadow", d);
    this.after(d, () => {
      this.fast = true; this.tipTo = { laneT: lane, x: 158, y: 4 };
      this.addHazard({ lane, x: COL_X, y: 0, w: COL_W, h: 320, life: 0.18, isBody: true });
      this.game.addShake(0.15, 4); this.game.puff(160, 0, lane, 10, "#d8c08a");
      this.rest(lane, { x: COL_X, y: 0, w: COL_W, h: 30 }, 0, () => { this.idleTip = true; this.fast = false; });
    });
  }
  volley() {
    const n = 2 + Math.min(2, this.cycle), gap = 0.7 / this.speedMul;
    for (let i = 0; i < n; i++) this.after(i * gap, () => this.dropSpike(i % 2 ? 1 - this.p.lane : this.p.lane, "#5a2210", "#e07a3f"));
    this.after(n * gap + 0.9, () => this.strike(1 - this.p.lane));
  }
  drawBody(c, lane) {
    if ((this.tip.laneT < 0.5 ? 0 : 1) !== lane) return;
    const x = this.bx, t = this.t, leg = Math.sin(t * 14) * 3;
    c.save(); applyLane(c, 0.5);
    for (let i = 0; i < 4; i++) { const lx = x + 40 + i * 32, up = i % 2 ? leg : -leg; B(c, "#3a1408", lx, 0, 5, 22 + up); B(c, "#3a1408", lx - 8, 0, 12, 4); }
    BO(c, "#3a1408", "#b5542a", x + 20, 18, 150, 40);
    for (let i = 0; i < 5; i++) B(c, "#8a3a1a", x + 32 + i * 28, 18, 4, 40);
    B(c, "#e07a3f", x + 24, 50, 142, 6);
    BO(c, "#3a1408", "#c4602e", x + 160, 20, 36, 32);
    B(c, "#ffd23f", x + 184, 42, 5, 5); B(c, "#ffd23f", x + 174, 44, 4, 4);
    const open = Math.abs(Math.sin(t * 4)) * 6;
    BO(c, "#3a1408", "#b5542a", x + 192, 28, 18, 10, 2);
    BO(c, "#3a1408", "#c4602e", x + 206, 36 + open * 0.5, 14, 8, 2); BO(c, "#3a1408", "#c4602e", x + 206, 16 - open * 0.5, 14, 8, 2);
    c.restore();
    // Cola segmentada (pantalla) y aguijón (carril)
    const b = toScreen(0.5, x + 30, 56), tp = toScreen(this.tip.laneT, this.tip.x, this.tip.y + 40);
    drawChain(c, b, tp, { x: (b.x + tp.x) / 2 - 30, y: Math.min(b.y, tp.y) - 120 }, 10, 22 * tp.s, 14 * tp.s, "#3a1408", ["#b5542a", "#c4602e"]);
    c.save(); applyLane(c, this.tip.laneT);
    const sx = this.tip.x, sy = this.tip.y;
    BO(c, "#3a1408", "#e07a3f", sx - 16, sy + 12, 32, 24); B(c, "#ffd23f", sx - 8, sy + 26, 6, 4);
    B(c, "#1a0a04", sx - 4, sy, 8, 12); B(c, "#1a0a04", sx - 2, sy - 4, 4, 4);
    c.restore();
  }
}

// ---------------------------------------------------------------------
// 2. Selva — Serpiente de lianas: cuelga de los árboles y ataca desde arriba
//    (hay que deslizarse o cambiar de carril); también escupe veneno.
// ---------------------------------------------------------------------
class SerpentBoss extends Boss {
  constructor(game, cycle) {
    super(game, cycle, BOSS_NAMES[1], 1);
    this.colors = ["#3f8f3a", "#1f4a1c", "#8bdc3a"]; this.trapKind = "log"; this.trapColor = "#c89a5c";
    this.head = { laneT: 0.5, x: 420, y: 480 }; this.headTo = { ...this.head }; this.idle = true; this.fast = false;
    this.setRules({ stomp: false, reflect: false, trap: false }, "RUGIDO: ponte en su carril cuando apoye la cabeza y ruge (E). ¡Pisarla pincha!");
    this.limbHurts = true; this.dmg.roar = 2; this.roarCdMult = 0.45;
  }
  target() { return { lane: this.head.laneT < 0.5 ? 0 : 1, laneT: this.head.laneT, x: this.head.x, y: this.head.y + 20 }; }
  updateBody(dt) {
    if (this.idle) this.headTo = { laneT: 0.5, x: 400 + Math.sin(this.t * 1.1) * 60, y: 165 + Math.sin(this.t * 1.7) * 18 + this.away * 320 + (this.state === "defeat" ? this.stateT * 150 : 0) };
    const k = Math.min(1, dt * (this.fast ? 28 : 6));
    for (const key of ["laneT", "x", "y"]) this.head[key] = lerp(this.head[key], this.headTo[key], k);
  }
  clearAttacks() { super.clearAttacks(); this.idle = true; this.fast = false; }
  attack() { const r = Math.random(); if (r < 0.45) this.strike(this.p.lane, true); else if (r < 0.75) this.double(); else this.spit(); }
  strike(lane, rest) {   // golpe desde arriba a media altura: deslizarse o cambiar de carril
    const d = this.tele(0.9);
    this.idle = false; this.fast = false; this.headTo = { laneT: lane, x: 160, y: 210 };
    this.warn(lane, "shadow", d);
    this.after(d, () => {
      this.fast = true; this.headTo = { laneT: lane, x: 160, y: 42 };
      this.addHazard({ lane, x: COL_X, y: 40, w: COL_W, h: 300, life: 0.3, isBody: true });
      this.game.sfx.hiss();
    });
    this.after(d + 0.32, () => {
      if (!rest) { this.fast = false; this.headTo = { laneT: lane, x: 240, y: 200 }; return; }
      // Descansa en el carril donde NO está el dino (si se deslizó debajo, no le cae encima)
      const L = 1 - this.p.lane;
      this.headTo = { laneT: L, x: 330, y: 2 };   // un poco por delante: ponte en su carril y ruge
      this.rest(L, { x: 300, y: 0, w: 62, h: 32 }, 0, () => { this.idle = true; this.fast = false; });
    });
  }
  double() {
    const A = this.p.lane;
    this.strike(A, false);
    this.after(this.tele(0.9) + 0.45, () => this.strike(1 - A, true));
  }
  spit() {   // bolas de veneno a ras de suelo o a media altura
    const L = this.p.lane, n = 2 + Math.min(1, this.cycle), gap = 0.55 / this.speedMul;
    this.idle = false; this.fast = false; this.headTo = { laneT: L, x: 420, y: 60 };
    for (let i = 0; i < n; i++) this.after(0.4 + i * gap, () => {
      const lane = i % 2 ? 1 - L : L, hy = Math.random() < 0.5 ? 6 : 40, d = this.tele(0.5);
      this.headTo = { laneT: lane, x: 420, y: hy + 10 };
      this.warn(lane, "arrow", d, { y: hy });
      this.after(d, () => { this.game.sfx.hiss(); this.addHazard({ lane, x: 390, y: hy, w: 22, h: 14, vx: -560 * Math.sqrt(this.speedMul),
        projectile: true, reflectable: true, destructible: true, draw: drawVenomHaz }); });
    });
    this.after(0.4 + n * gap + 1.2, () => this.strike(this.p.lane, true));
  }
  drawBody(c, lane) {
    if ((this.head.laneT < 0.5 ? 0 : 1) !== lane) return;
    const a = { x: 520 + Math.sin(this.t * 0.8) * 20, y: -30 }, h = toScreen(this.head.laneT, this.head.x + 20, this.head.y + 26);
    drawChain(c, a, h, { x: (a.x + h.x) / 2 + 90, y: (a.y + h.y) / 2 - 10 }, 16, 16 * h.s, 22 * h.s, "#1f4a1c", ["#3f8f3a", "#5aa845"], "#8bdc3a");
    c.save(); applyLane(c, this.head.laneT);
    const x = this.head.x, y = this.head.y;
    BO(c, "#1f4a1c", "#3f8f3a", x - 30, y, 62, 30);
    B(c, "#5aa845", x - 26, y + 22, 54, 5); B(c, "#8bdc3a", x - 10, y + 4, 30, 3);
    B(c, "#ffe14d", x - 18, y + 14, 8, 7); B(c, "#15161c", x - 15, y + 14, 2, 7);
    B(c, "#ffffff", x - 28, y - 4, 4, 6); B(c, "#ffffff", x - 16, y - 4, 4, 6);
    for (let i = 0; i < 6; i++) { B(c, "#1f4a1c", x - 24 + i * 10, y + 30, 6, 6); B(c, "#e8ffb0", x - 23 + i * 10, y + 34, 4, 6); }   // pinchos
    if (Math.floor(this.t * 6) % 2) { B(c, "#e53935", x - 46, y + 8, 16, 3); B(c, "#e53935", x - 50, y + 5, 4, 9); }
    c.restore();
  }
}

// ---------------------------------------------------------------------
// 3. Volcán — Golem de lava: lanza rocas en arco (se rompen con el rugido)
//    y golpea el suelo con el puño.
// ---------------------------------------------------------------------
class GolemBoss extends Boss {
  constructor(game, cycle) {
    super(game, cycle, BOSS_NAMES[2], 1.15);
    this.colors = ["#4a3430", "#ff6a1a", "#1a1010"]; this.trapKind = "geyser"; this.trapColor = "#ff6a1a";
    this.gx = 1060; this.fist = { laneT: 0, x: 1040, y: 60 }; this.fistTo = { ...this.fist }; this.idle = true; this.fast = false;
    this.setRules({ stomp: false, roar: false, trap: false }, "DEVUÉLVELE LAS ROCAS: ruge (E) justo antes de que caigan. ¡Su puño quema!");
    this.limbHurts = true; this.dmg.reflect = 3; this.reflectDist = 110; this.roarCdMult = 0.4;
  }
  target() { return { lane: 0, laneT: 0, x: this.gx + 65, y: 100 }; }
  updateBody(dt) {
    this.gx = 640 + this.away * 420 + (this.state === "defeat" ? Math.sin(this.t * 40) * 3 : 0);
    if (this.idle) this.fistTo = { laneT: 0, x: this.gx - 24, y: 66 + Math.sin(this.t * 2) * 6 };
    const k = Math.min(1, dt * (this.fast ? 30 : 7));
    for (const key of ["laneT", "x", "y"]) this.fist[key] = lerp(this.fist[key], this.fistTo[key], k);
  }
  clearAttacks() { super.clearAttacks(); this.idle = true; this.fast = false; }
  attack() { if (Math.random() < 0.72) this.toss(); else this.slam(this.p.lane); }
  toss() {
    const n = 2 + Math.min(2, this.cycle), gap = 0.6 / this.speedMul, T = 1.15 / Math.sqrt(this.speedMul);
    for (let i = 0; i < n; i++) this.after(i * gap, () => {
      const L = i === 0 ? this.p.lane : randInt(0, 1);
      this.warn(L, "target", T); this.game.sfx.toss();
      this.lob(L, this.gx + 10, 150, T, drawRockHaz);
    });
    this.after((n - 1) * gap + T + 0.4, () => this.slam(1 - this.p.lane));
  }
  slam(lane) {   // puñetazo que cubre toda la altura: cambiar de carril
    const d = this.tele(0.85);
    this.idle = false; this.fast = false; this.fistTo = { laneT: lane, x: 152, y: 170 };
    this.warn(lane, "shadow", d);
    this.after(d, () => {
      this.fast = true; this.fistTo = { laneT: lane, x: 152, y: 0 };
      this.addHazard({ lane, x: COL_X, y: 0, w: COL_W, h: 320, life: 0.18, isBody: true });
      this.game.addShake(0.2, 6); this.game.sfx.stomp(); this.game.puff(160, 0, lane, 12, "#ff6a1a");
      this.rest(lane, { x: COL_X, y: 0, w: COL_W, h: 36 }, 0, () => { this.idle = true; this.fast = false; if (this.fury) this.burn(lane); });
    });
  }
  drawBody(c, lane) {
    const x = this.gx, glow = `rgb(255,${110 + Math.floor(60 * Math.sin(this.t * 6))},26)`;
    if (lane === 0) {
      c.save(); applyLane(c, 0);
      BO(c, "#1a1010", "#3a2a28", x + 15, 0, 34, 52); BO(c, "#1a1010", "#3a2a28", x + 85, 0, 34, 52);
      BO(c, "#1a1010", "#4a3430", x + 120, 70, 26, 72);
      BO(c, "#1a1010", "#4a3430", x, 50, 135, 100);
      B(c, glow, x + 20, 70, 4, 50); B(c, glow, x + 24, 96, 20, 4); B(c, glow, x + 100, 60, 4, 60); B(c, glow, x + 86, 120, 16, 4);
      B(c, "#ffb000", x + 55, 88, 28, 28); B(c, "#fff0a0", x + 62, 95, 14, 14);
      BO(c, "#1a1010", "#4a3430", x + 40, 150, 56, 40);
      B(c, glow, x + 48, 168, 12, 6); B(c, glow, x + 72, 168, 12, 6); B(c, "#1a1010", x + 52, 156, 32, 4);
      c.restore();
    }
    if ((this.fist.laneT < 0.5 ? 0 : 1) !== lane) return;
    const s = toScreen(0, x + 10, 130), f = toScreen(this.fist.laneT, this.fist.x + 10, this.fist.y + 26);
    drawChain(c, s, f, { x: (s.x + f.x) / 2, y: Math.min(s.y, f.y) - 30 }, 7, 26 * f.s, 22 * f.s, "#1a1010", ["#4a3430", "#3a2a28"]);
    c.save(); applyLane(c, this.fist.laneT);
    const fx = this.fist.x, fy = this.fist.y;
    BO(c, "#1a1010", "#5a3a32", fx - 16, fy, 56, 36);
    for (let i = 0; i < 4; i++) B(c, glow, fx - 12 + i * 13, fy + 28, 8, 5);
    c.restore();
  }
}

// ---------------------------------------------------------------------
// 4. Glaciar — Mamut de hielo: embiste por un carril y congela el suelo;
//    también hace caer fragmentos de hielo.
// ---------------------------------------------------------------------
class MammothBoss extends Boss {
  constructor(game, cycle) {
    super(game, cycle, BOSS_NAMES[3], 1.1);
    this.colors = ["#a9cde6", "#2c4a63", "#e8f7ff"]; this.trapKind = "stalactite"; this.trapColor = "#bfe8ff";
    this.mx = 1150; this.laneT = 1; this.laneTo = 1; this.mode = "idle"; this.hz = null; this.jumped = false;
    this.setRules({ stomp: false, roar: false, reflect: false, trap: false }, "SALTA POR ENCIMA: quédate en su carril y sáltale cuando embista");
  }
  // Daño al pasar por encima de su lomo mientras embiste por tu carril
  extraCollide(pl, lane) {
    if (this.mode !== "charge" || this.jumped || lane !== this.chargeLane) return false;
    const bx = this.mx, px = pl.x + 24;
    if (px + 27 > bx && px < bx + 150 && pl.y >= 70) {
      this.jumped = true; this.game.sfx.stomp();
      this.say("¡SALTO!", "#7df9ff");
      this.damage(3, "jump", { laneT: lane, x: bx + 75, y: 84 });
    }
    return false;
  }
  target() { return { lane: this.laneT < 0.5 ? 0 : 1, laneT: this.laneT, x: this.mx + 75, y: 50 }; }
  clearAttacks() { super.clearAttacks(); this.mode = "idle"; }
  updateBody(dt) {
    this.laneT = lerp(this.laneT, this.laneTo, Math.min(1, dt * 8));
    if (this.mode === "idle" || this.mode === "prep") this.mx = lerp(this.mx, 700 + this.away * 450, Math.min(1, dt * 5));
    else if (this.mode === "charge") {
      this.mx -= CONFIG.MAMMOTH_CHARGE_SPEED * this.speedMul * dt;
      if (this.fury && !this.swerved && this.mx < 560) {   // furia: cambia de carril a mitad de la embestida
        this.swerved = true; this.chargeLane = this.laneTo = 1 - this.chargeLane; if (this.hz) this.hz.lane = this.chargeLane;
        this.game.sfx.stomp(); this.game.addShake(0.15, 4);
      }
      if (this.mx <= COL_X - 45) {
        this.mx = COL_X - 45; this.mode = "dazed"; if (this.hz) this.hz.dead = true;
        this.game.addShake(0.3, 7); this.game.sfx.stomp();
        const lane = this.chargeLane;
        this.rest(lane, { x: this.mx, y: 0, w: 150, h: 84 }, CONFIG.MAMMOTH_FREEZE_TIME, () => { this.mode = "back"; this.freeze(lane); });
      }
    } else if (this.mode === "back") {
      this.mx += 900 * dt;
      if (this.mx >= 700) { this.mx = 700; this.mode = "idle"; }
    }
  }
  attack() { if (Math.random() < 0.8) this.charge(this.p.lane); else this.shards(); }
  charge(lane) {   // cambiar de carril o saltar por encima; al acabar queda aturdido
    const d = this.tele(0.95);
    this.laneTo = lane; this.chargeLane = lane; this.mode = "prep"; this.jumped = false; this.swerved = false;
    this.warn(lane, "arrow", d, { y: 40 }); if (this.fury) this.warn(1 - lane, "arrow", d + 0.4, { y: 40 }); this.game.sfx.stomp();
    this.after(d, () => {
      this.mode = "charge";
      this.hz = this.addHazard({ lane, x: this.mx, y: 0, w: 150, h: 84, isBody: true, life: 5, onUpdate: h => { h.x = this.mx; } });
    });
  }
  freeze(lane) {
    this.warn(lane, "frost", 0.5);
    this.after(0.5, () => this.addHazard({ lane, x: 0, y: 0, w: 430, h: 16, life: CONFIG.MAMMOTH_FREEZE_TIME - 0.5, draw: drawFrostHaz }));
  }
  shards() {
    const n = 3 + Math.min(1, this.cycle), gap = 0.6 / this.speedMul;
    this.game.sfx.stomp(); this.game.addShake(0.2, 4);
    for (let i = 0; i < n; i++) this.after(i * gap, () => this.dropSpike(i % 2 ? 1 - this.p.lane : this.p.lane, "#6fb0d8", "#e8f7ff"));
    this.after(n * gap + 0.9, () => this.charge(this.p.lane));
  }
  drawBody(c, lane) {
    if ((this.laneT < 0.5 ? 0 : 1) !== lane) return;
    const x = this.mx, moving = this.mode === "charge" || this.mode === "back", step = moving ? Math.sin(this.t * 30) * 4 : 0;
    c.save(); applyLane(c, this.laneT);
    for (let i = 0; i < 4; i++) BO(c, "#2c4a63", "#6f9ab8", x + 18 + i * 32, 0, 20, 26 + (i % 2 ? step : -step), 2);
    BO(c, "#2c4a63", "#a9cde6", x + 10, 22, 140, 62);
    B(c, "#e6f4ff", x + 20, 72, 118, 8); B(c, "#8fb9d6", x + 20, 30, 118, 6);
    B(c, "#e8f7ff", x + 60, 84, 8, 10); B(c, "#e8f7ff", x + 80, 84, 10, 16); B(c, "#e8f7ff", x + 102, 84, 8, 8);
    BO(c, "#2c4a63", "#a9cde6", x - 20, 40, 50, 44);
    B(c, this.mode === "prep" || this.mode === "charge" ? "#ff3b3b" : "#15161c", x - 6, 66, 6, 5);
    B(c, "#8fb9d6", x - 26, 8, 12, 36); B(c, "#8fb9d6", x - 32, 8, 8, 8);
    B(c, "#ffffff", x - 44, 30, 28, 6); B(c, "#ffffff", x - 48, 36, 6, 8);
    if (this.mode === "dazed") for (let i = 0; i < 3; i++) {
      const a = this.t * 6 + i * 2.1; B(c, "#ffe14d", x + 10 + Math.cos(a) * 26, 96 + Math.sin(a) * 6, 6, 6);
    }
    c.restore();
  }
}

// ---------------------------------------------------------------------
// 5. Noche — Pterodáctilo sombra: vuela en círculos, hace picados
//    y dispara plumas; se posa para descansar.
// ---------------------------------------------------------------------
class ShadowPteroBoss extends Boss {
  constructor(game, cycle) {
    super(game, cycle, BOSS_NAMES[4], 1);
    this.colors = ["#140a24", "#6a3aa0", "#ff3355"]; this.trapKind = "meteor"; this.trapColor = "#ff8a2a";
    this.a = 0; this.mode = "sky"; this.k = 0; this.wp = { laneT: 1, x: 0, y: 0 }; this.glideHit = false;
    this.setRules({ stomp: false, roar: false, reflect: false, trap: false }, "CABEZAZO: cuando pase rasante brillando, salta y golpéale desde abajo");
  }
  // Vuelo rasante: si el raptor le alcanza desde abajo, recibe daño
  extraCollide(pl, lane, boxes) {
    if (this.mode !== "glide" || this.glideHit || lane !== Math.round(this.wp.laneT)) return false;
    const a = boxes[0], b = { x: this.wp.x + 5, y: this.wp.y, w: 92, h: 34 };
    if (overlap(a, b) && a.y < b.y) {
      this.glideHit = true; this.game.sfx.stomp(); this.say("¡CABEZAZO!", "#ffd23f");
      this.damage(3, "headbutt", { laneT: lane, x: b.x + 45, y: b.y });
    }
    return false;
  }
  skyPos() { return { x: 560 + Math.cos(this.a) * 170, y: 95 + Math.sin(this.a) * 35 - this.away * 280 + (this.state === "defeat" ? this.stateT * 160 : 0) }; }
  target() {
    if (this.mode === "sky") { const s = this.skyPos(); return { lane: 0, laneT: 0, x: VANISH_X + (s.x - VANISH_X) / LANES[0].s, y: (LANES[0].y - s.y) / LANES[0].s }; }
    return { lane: this.wp.laneT < 0.5 ? 0 : 1, laneT: this.wp.laneT, x: this.wp.x + 45, y: this.wp.y + 20 };
  }
  clearAttacks() { super.clearAttacks(); this.mode = "sky"; }
  updateBody(dt) {
    this.a += dt * 1.3 * this.speedMul;
    const wp = this.wp;
    if (this.mode === "dive") {
      this.k += dt / (0.8 / this.speedMul);
      const k = this.k, h = this.diveH;
      if (k < 0.6) { const u = k / 0.6; wp.x = 700 - 580 * u; wp.y = 260 - (260 - h) * (1 - (1 - u) * (1 - u)); }
      else { const u = (k - 0.6) / 0.4; wp.x = 120 - 420 * u; wp.y = h + 120 * u * u; }
      if (k >= 1) this.mode = "sky";
    } else if (this.mode === "glide") {
      wp.x -= 520 * this.speedMul * dt; wp.y = this.glideHit ? wp.y + 260 * dt : 100 + Math.sin(this.t * 6) * 4;
      if (wp.x < -260) this.mode = "sky";
    } else if (this.mode === "land") {
      this.k = Math.min(1, this.k + dt / 0.35);
      wp.x = lerp(400, 104, this.k); wp.y = lerp(200, 0, this.k);
    } else if (this.mode === "takeoff") {
      this.k += dt / 0.6; wp.x += 320 * dt; wp.y += 420 * dt;
      if (this.k >= 1) this.mode = "sky";
    }
  }
  attack() {
    const r = Math.random(), glide = () => this.glide();
    if (r < 0.4) this.dive(this.p.lane, choice(["low", "mid"]), glide);
    else if (r < 0.7) this.feathers();
    else this.dive(this.p.lane, "low", () => this.dive(this.p.lane, "mid", glide));
  }
  glide() {   // pasa rasante (no hace daño): es el momento de golpearle desde abajo
    const lane = this.p.lane, d = this.tele(0.9), dur = 1300 / (520 * this.speedMul);
    this.warn(lane, "arrow", d, { y: 100 }); this.game.sfx.screech();
    this.after(d, () => { this.mode = "glide"; this.glideHit = false; this.wp = { laneT: lane, x: 950, y: 100 }; });
    this.after(d + dur + CONFIG.BOSS_ATTACK_GAP / this.speedMul, () => { if (this.mode === "glide") this.mode = "sky"; if (this.state === "fight") this.attack(); });
  }
  dive(lane, h, then) {   // bajo: saltar · medio: deslizarse · o cambiar de carril
    const d = this.tele(0.9), dur = 0.8 / this.speedMul;
    this.warn(lane, "shadow", d); this.game.sfx.screech();
    this.after(d, () => {
      this.mode = "dive"; this.k = 0; this.diveH = h === "low" ? 0 : 38; this.wp = { laneT: lane, x: 700, y: 260 };
      this.addHazard({ lane, x: 700, y: 0, w: 90, h: 30, isBody: true, life: dur, onUpdate: z => { z.x = this.wp.x; z.y = this.wp.y; } });
    });
    this.after(d + dur + 0.3, then);
  }
  perch(lane) {   // se posa en el otro carril: momento de pisarle
    const d = this.tele(0.8);
    this.warn(lane, "shadow", d);
    this.after(d, () => { this.mode = "land"; this.k = 0; this.wp = { laneT: lane, x: 400, y: 200 }; });
    this.after(d + 0.35, () => {
      this.addHazard({ lane, x: 104, y: 0, w: 96, h: 44, life: 0.15, isBody: true });
      this.game.addShake(0.15, 4);
      this.rest(lane, { x: 104, y: 0, w: 96, h: 44 }, 0, () => { this.mode = "takeoff"; this.k = 0; });
    });
  }
  feathers() {
    const n = 3 + Math.min(1, this.cycle), gap = 0.6 / this.speedMul, d = this.tele(0.55);
    this.game.sfx.screech();
    for (let i = 0; i < n; i++) this.after(i * gap, () => {
      const lane = i % 2 ? 1 - this.p.lane : this.p.lane, hy = Math.random() < 0.5 ? 6 : 40;
      this.warn(lane, "arrow", d, { y: hy });
      this.after(d, () => this.addHazard({ lane, x: 900, y: hy, w: 34, h: 12, vx: -700 * Math.sqrt(this.speedMul),
        projectile: true, reflectable: true, destructible: true, draw: drawFeatherHaz }));
    });
    this.after(n * gap + d + 1.2, () => this.glide());
  }
  drawSky(c) {
    if (this.mode !== "sky") return;
    c.save();
    if (this.flash > 0 && Math.floor(this.flash * 30) % 2 === 0) c.filter = "brightness(3)";
    if (this.state === "defeat") c.globalAlpha = clamp(1 - this.stateT / 1.8, 0, 1);
    const s = this.skyPos(); drawPteroShadow(c, s.x, s.y, 1.4, Math.sin(this.t * 8), false);
    c.restore();
  }
  drawBody(c, lane) {
    if (this.mode === "sky" || (this.wp.laneT < 0.5 ? 0 : 1) !== lane) return;
    c.save(); applyLane(c, this.wp.laneT);
    if (this.mode === "glide" && !this.glideHit) {   // brillo: está a tiro
      c.fillStyle = `rgba(255,225,77,${0.25 + 0.15 * Math.sin(this.t * 12)})`;
      c.beginPath(); c.ellipse(this.wp.x + 50, -(this.wp.y + 18), 80, 30, 0, 0, Math.PI * 2); c.fill();
    }
    drawPteroShadow(c, this.wp.x + 50, -(this.wp.y + 20), 1.15, Math.sin(this.t * 10), this.mode === "land" && this.k >= 1);
    c.restore();
  }
}

const BOSS_CLASSES = [ScorpionBoss, SerpentBoss, GolemBoss, MammothBoss, ShadowPteroBoss];



// =====================================================================
//  Bosses de los niveles 6–10 (mismas reglas que los anteriores: avisos, punto débil,
//  pisotón, rugido, «¡PERFECTO!», turbo y trampa)
// =====================================================================
BOSS_NAMES.push("Rey cangrejo", "Sapo gigante", "Kraken abisal", "Rey de los huesos", "Nave nodriza");
const BOSS_HP_MULTS = [1, 1, 1.15, 1.1, 1, 1.15, 1.1, 1.2, 1.25, 1.35];   // multiplicador de vida de cada boss (para el manual)

// Proyectiles y peligros nuevos (coordenadas de carril)
function drawBubbleHaz(c, h) {
  c.fillStyle = "#1a4a7a"; c.beginPath(); c.arc(h.x + h.w / 2, -(h.y + h.h / 2), h.w / 2 + 2, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#8fd8ff"; c.beginPath(); c.arc(h.x + h.w / 2, -(h.y + h.h / 2), h.w / 2, 0, Math.PI * 2); c.fill();
  B(c, "#ffffff", h.x + 5, h.y + h.h - 9, 5, 4);
}
function drawTongueHaz(c, h) { B(c, "#7a1030", h.x, h.y + 4, h.w, h.h - 8); B(c, "#ff5c8a", h.x, h.y + 7, h.w, h.h - 14); BO(c, "#7a1030", "#ff5c8a", h.x - 6, h.y, 18, h.h, 2); }
function drawInkHaz(c, h) { BO(c, "#05040c", "#2a1a4a", h.x, h.y, h.w, h.h); B(c, "#6a4aa0", h.x + 6, h.y + h.h - 10, 8, 4); }
function drawSweepHaz(c, h) {
  BO(c, "#2a0a3a", "#8a3aa0", h.x, h.y, h.w, h.h);
  for (let i = 0; i < 4; i++) B(c, "#e0a0ff", h.x + 8 + i * 18, h.y + 3, 7, 7);
}
function drawBoneHaz(c, h) {
  B(c, "#2a2418", h.x + 4, h.y + 10, h.w - 8, 10); B(c, "#e8dcc0", h.x + 6, h.y + 12, h.w - 12, 6);
  BO(c, "#2a2418", "#e8dcc0", h.x, h.y + 4, 10, 22, 2); BO(c, "#2a2418", "#e8dcc0", h.x + h.w - 10, h.y + 4, 10, 22, 2);
}
function drawWispHaz(c, h) {
  c.globalAlpha = 0.5; B(c, "#6aff8a", h.x + 8, h.y - 2, h.w, h.h + 4); c.globalAlpha = 1;
  BO(c, "#0a3a1a", "#6aff8a", h.x, h.y, h.w - 10, h.h, 2); B(c, "#ffffff", h.x + 4, h.y + 4, 5, 5);
}
function drawBeamHaz(c, h) {
  c.fillStyle = "rgba(110,255,140,0.28)"; c.fillRect(h.x - 8, -(h.y + h.h), h.w + 16, h.h);
  c.fillStyle = "rgba(200,255,210,0.55)"; c.fillRect(h.x + 10, -(h.y + h.h), h.w - 20, h.h);
  for (let i = 0; i < 6; i++) { c.fillStyle = "#e8ffe8"; c.fillRect(h.x + 6 + (i * 13) % h.w, -(h.y + ((h.t * 400 + i * 50) % h.h)), 4, 4); }
}
function drawSaucer(c, cx, cy, s, t) {
  c.save(); c.translate(cx, cy); c.scale(s, s);
  const R = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  R("#0b0c14", -62, -8, 124, 26); R("#8792ab", -60, -6, 120, 22); R("#c9d0dc", -56, -6, 112, 6); R("#56607a", -44, 12, 88, 8);
  R("#0b0c14", -30, -34, 60, 28); R("#7df9ff", -28, -32, 56, 26); R("#e8ffff", -20, -28, 16, 8);
  for (let i = 0; i < 6; i++) R((Math.floor(t * 6) + i) % 2 ? "#ffe14d" : "#ff3b5c", -50 + i * 20, 4, 8, 6);
  c.restore();
}
function drawSaucerHaz(c, h) { c.save(); c.translate(h.x + h.w / 2, -(h.y + h.h / 2)); drawSaucer(c, 0, 0, 0.28, h.t); c.restore(); }

// ---------------------------------------------------------------------
// 6. Playa tropical — Rey cangrejo: pinzazo desde arriba (cambia de carril)
//    y burbujas a ras de suelo o a media altura.
// ---------------------------------------------------------------------
class CrabBoss extends Boss {
  constructor(game, cycle) {
    super(game, cycle, BOSS_NAMES[5], 1.15);
    this.colors = ["#e0452e", "#7a1a10", "#ffb08a"]; this.trapKind = "log"; this.trapColor = "#c89a5c";
    this.cx = 1060; this.claw = { laneT: 0, x: 1040, y: 60 }; this.clawTo = { ...this.claw }; this.idle = true; this.fast = false; this.flipped = false;
    this.setRules({ reflect: false, trap: false }, "VOLTEA Y PISA: ruge (E) cuando apoye la pinza para voltearla y luego cae sobre ella con S");
    this.vulnMult = 2; this.roarCdMult = 0.6;
  }
  canStomp() { return this.flipped; }
  // La pinza es enorme: el rugido la voltea desde cualquier carril
  roarWave(w, x0, x1) {
    super.roarWave(w, x0, x1);
    const L = this.limb;
    if (!w.bossHit && this.vuln > 0 && L && L.x < x1 && L.x + L.w > x0) { w.bossHit = true; this.roarHitLimb(L); }
  }
  roarHitLimb() { if (!this.flipped) { this.flipped = true; this.game.sfx.perfect(); this.say("¡VOLTEADA!", "#ff9ad0"); } }
  target() { return { lane: 0, laneT: 0, x: this.cx + 75, y: 60 }; }
  clearAttacks() { super.clearAttacks(); this.idle = true; this.fast = false; }
  updateBody(dt) {
    this.cx = 640 + this.away * 420 + Math.sin(this.t * 6) * 6 + (this.state === "defeat" ? Math.sin(this.t * 40) * 3 : 0);
    if (this.idle) this.clawTo = { laneT: 0, x: this.cx - 30, y: 56 + Math.sin(this.t * 3) * 6 };
    const k = Math.min(1, dt * (this.fast ? 30 : 7));
    for (const key of ["laneT", "x", "y"]) this.claw[key] = lerp(this.claw[key], this.clawTo[key], k);
  }
  attack() { if (Math.random() < 0.5) this.pinch(this.p.lane); else this.bubbles(); }
  pinch(lane) {   // golpe de toda la altura: cambiar de carril
    const d = this.tele(0.85);
    this.idle = false; this.fast = false; this.clawTo = { laneT: lane, x: 150, y: 170 };
    this.warn(lane, "shadow", d);
    this.after(d, () => {
      this.fast = true; this.clawTo = { laneT: lane, x: 150, y: 0 };
      this.addHazard({ lane, x: COL_X, y: 0, w: COL_W, h: 320, life: 0.18, isBody: true });
      this.game.addShake(0.2, 5); this.game.sfx.stomp(); this.game.puff(160, 0, lane, 12, "#bfe6ff");
      this.flipped = false;
      this.rest(lane, { x: COL_X, y: 0, w: COL_W, h: 34 }, 0, () => { this.idle = true; this.fast = false; this.flipped = false; });
    });
  }
  bubbles() {   // bajas: saltar · medias: deslizarse · o devolverlas con E
    const L = this.p.lane, n = 3 + Math.min(1, this.cycle), gap = 0.55 / this.speedMul;
    for (let i = 0; i < n; i++) this.after(0.2 + i * gap, () => {
      const lane = i % 2 ? 1 - L : L, hy = Math.random() < 0.5 ? 6 : 40, d = this.tele(0.5);
      this.warn(lane, "arrow", d, { y: hy });
      this.after(d, () => { this.game.sfx.hiss(); this.addHazard({ lane, x: 880, y: hy, w: 24, h: 24, vx: -540 * Math.sqrt(this.speedMul),
        projectile: true, reflectable: true, destructible: true, draw: drawBubbleHaz }); });
    });
    this.after(0.2 + n * gap + 1.1, () => this.pinch(1 - this.p.lane));
  }
  drawBody(c, lane) {
    const x = this.cx, walk = Math.sin(this.t * 12) * 3;
    if (lane === 0) {
      c.save(); applyLane(c, 0);
      for (let i = 0; i < 3; i++) {   // patas
        const lx = x + 20 + i * 40, up = i % 2 ? walk : -walk;
        BO(c, "#5a1208", "#c23a24", lx, 0, 8, 34 + up, 2); BO(c, "#5a1208", "#c23a24", lx - 12, 26 + up, 20, 8, 2);
      }
      BO(c, "#5a1208", "#e0452e", x, 30, 150, 62);
      B(c, "#ff7a5a", x + 10, 80, 130, 8); B(c, "#ffb08a", x + 30, 86, 60, 4);
      for (let i = 0; i < 4; i++) B(c, "#a82a18", x + 22 + i * 32, 46 + (i % 2) * 10, 10, 8);
      B(c, "#5a1208", x + 40, 36, 44, 6);
      for (const ex of [x + 36, x + 70]) {   // ojos con pedúnculo
        B(c, "#5a1208", ex, 92, 6, 24); BO(c, "#5a1208", "#ffffff", ex - 4, 114, 14, 14, 2); B(c, "#15161c", ex - 2, 118, 6, 7);
      }
      BO(c, "#5a1208", "#e0452e", x + 140, 44, 30, 22); BO(c, "#5a1208", "#ff7a5a", x + 164, 58, 18, 10, 2);   // pinza pequeña
      c.restore();
    }
    if ((this.claw.laneT < 0.5 ? 0 : 1) !== lane) return;
    const s = toScreen(0, x + 10, 70), f = toScreen(this.claw.laneT, this.claw.x + 16, this.claw.y + 20);
    drawChain(c, s, f, { x: (s.x + f.x) / 2, y: Math.min(s.y, f.y) - 30 }, 7, 18 * f.s, 16 * f.s, "#5a1208", ["#e0452e", "#c23a24"]);
    c.save(); applyLane(c, this.claw.laneT);
    const cx = this.claw.x, cy = this.claw.y, open = this.fast ? 2 : 8 + Math.sin(this.t * 5) * 3;
    if (this.flipped) {   // pinza volteada: barriga blanda al aire
      BO(c, "#5a1208", "#ffb08a", cx - 18, cy, 62, 22); B(c, "#ffe0d0", cx - 10, cy + 14, 46, 5);
      for (let i = 0; i < 3; i++) { const a = this.t * 7 + i * 2.1; B(c, "#ffe14d", cx + 12 + Math.cos(a) * 24, cy + 36 + Math.sin(a) * 6, 6, 6); }
    } else {
      BO(c, "#5a1208", "#e0452e", cx - 18, cy + 14 + open, 62, 20);
      BO(c, "#5a1208", "#ff7a5a", cx - 20, cy, 40, 12);
      B(c, "#ffb08a", cx - 12, cy + 30 + open, 44, 4);
      B(c, "#ffffff", cx - 4, cy + 24 + open, 10, 3);
    }
    c.restore();
  }
}

// ---------------------------------------------------------------------
// 7. Bosque de setas — Sapo gigante: salta hasta tu carril (diana: cámbiate)
//    y dispara la lengua a media altura (deslízate). Tras aterrizar se queda quieto.
// ---------------------------------------------------------------------
class FrogBoss extends Boss {
  constructor(game, cycle) {
    super(game, cycle, BOSS_NAMES[6], 1.1);
    this.colors = ["#4caf50", "#1f3a14", "#d8f0a0"]; this.trapKind = "log"; this.trapColor = "#ff5c8a";
    this.frogX = 1100; this.frogY = 0; this.laneT = 1; this.laneTo = 1; this.mode = "idle"; this.k = 0; this.tongue = 0;
    this.setRules({ stomp: false, roar: false, reflect: false, trap: true }, "SETAS EXPLOSIVAS: pasa por encima de cada rombo «!» para que le estalle");
    this.trapKind = "spore"; this.limbHurts = true; this.trapTimes = [2.5, 6.5, 10.5, 14.5, 18.5, 22.5, 26.5];
  }
  target() { return { lane: this.laneT < 0.5 ? 0 : 1, laneT: this.laneT, x: this.frogX + 50, y: this.frogY + 30 }; }
  clearAttacks() { super.clearAttacks(); if (this.mode !== "back") this.mode = this.frogX < 500 ? "back" : "idle"; }
  updateBody(dt) {
    this.laneT = lerp(this.laneT, this.laneTo, Math.min(1, dt * 8));
    this.tongue = Math.max(0, this.tongue - dt);
    if (this.mode === "idle") { this.frogX = lerp(this.frogX, 680 + this.away * 450, Math.min(1, dt * 5)); this.frogY = Math.abs(Math.sin(this.t * 3)) * 10; }
    else if (this.mode === "leap") {
      this.k = Math.min(1, this.k + dt / this.leapT);
      this.frogX = lerp(this.x0, this.leapX ?? COL_X - 20, this.k); this.frogY = 4 * 230 * this.k * (1 - this.k);
      if (this.k >= 1) this.land();
    } else if (this.mode === "back") {
      this.frogX += 650 * dt; this.frogY = Math.abs(Math.sin(this.frogX / 60)) * 50;
      if (this.frogX >= 680) { this.frogX = 680; this.frogY = 0; this.mode = "idle"; }
    } else if (this.mode === "rest") this.frogY = 0;
  }
  attack() { if (Math.random() < 0.55) this.leap(this.p.lane); else this.lick(); }
  leap(lane, farX) {
    const d = this.tele(0.8);
    if (farX === undefined) this.warn(lane, "target", d + 0.5); else { this.warn(0, "arrow", d + 0.4, { y: 0 }); this.warn(1, "arrow", d + 0.4, { y: 0 }); }
    this.game.sfx.toss();
    this.after(d, () => { this.mode = "leap"; this.k = 0; this.x0 = this.frogX; this.leapT = 0.55 / Math.sqrt(this.speedMul); this.laneTo = lane; this.leapLane = lane; this.leapX = farX; });
  }
  land() {
    const lane = this.leapLane;
    if (this.leapX !== undefined) {   // furia: aterrizaje lejos con onda expansiva en los dos carriles
      this.mode = "hold"; this.frogY = 0; this.leapX = undefined;
      this.game.addShake(0.3, 7); this.game.sfx.stomp(); this.game.puff(this.frogX + 50, 0, lane, 14, "#6cc25a");
      for (const L of [0, 1]) this.addHazard({ lane: L, x: this.frogX - 10, y: 0, w: 34, h: 16, vx: -560 * Math.sqrt(this.speedMul), life: 2, draw: drawWaveHaz });
      return;
    }
    this.mode = "rest"; this.frogY = 0;
    this.addHazard({ lane, x: COL_X, y: 0, w: COL_W, h: 320, life: 0.18, isBody: true });
    this.game.addShake(0.3, 7); this.game.sfx.stomp(); this.game.puff(170, 0, lane, 14, "#6cc25a");
    this.rest(lane, { x: COL_X - 20, y: 0, w: 110, h: 56 }, 0, () => { this.mode = "back"; });
  }
  lick() {   // lengua a media altura en tu carril: deslízate
    const L = this.p.lane, d = this.tele(0.8), b = LASER.mid;
    this.laneTo = L;
    this.warn(L, "line", d, { y: b.y, h: b.h, x2: this.frogX });
    this.after(d, () => {
      this.tongue = 0.45; this.game.sfx.hiss();
      this.addHazard({ lane: L, x: COL_X - 40, w: this.frogX - (COL_X - 40), y: b.y, h: b.h, life: 0.42, draw: drawTongueHaz });
    });
    this.after(d + 0.9, () => this.leap(this.p.lane));
  }
  drawBody(c, lane) {
    if ((this.laneT < 0.5 ? 0 : 1) !== lane) return;
    const x = this.frogX, y = this.frogY, air = y > 4, O = "#1f3a14";
    c.save(); applyLane(c, this.laneT);
    if (!air) drawShadow(c, x + 55, 120, 0);
    BO(c, O, "#3f8f3a", x + 70, y, 36, air ? 14 : 22, 2);                // pata trasera
    BO(c, O, "#4caf50", x, y + 8, 110, 56);                                 // cuerpo
    B(c, "#d8f0a0", x + 8, y + 10, 70, 16);                                 // barriga
    for (const [sx, sy] of [[60, 48], [82, 36], [92, 54]]) B(c, "#2f7a33", x + sx, y + sy, 10, 7);
    BO(c, O, "#3f8f3a", x + 6, y, 18, air ? 10 : 16, 2);                    // pata delantera
    for (const ex of [x + 8, x + 40]) { BO(c, O, "#4caf50", ex, y + 56, 24, 20); B(c, "#ffe14d", ex + 4, y + 62, 16, 10); B(c, "#15161c", ex + 6, y + 64, 6, 8); }
    B(c, O, x, y + 28, 60, 4);                                              // boca
    if (this.tongue > 0) B(c, "#ff5c8a", x - 6, y + 22, 16, 8);
    c.restore();
  }
}

// ---------------------------------------------------------------------
// 8. Fondo marino — Kraken abisal: la cabeza asoma arriba; los tentáculos golpean
//    desde arriba (cámbiate), barren el suelo (salta) y escupe tinta en arco.
// ---------------------------------------------------------------------
class KrakenBoss extends Boss {
  constructor(game, cycle) {
    super(game, cycle, BOSS_NAMES[7], 1.2);
    this.colors = ["#8a3aa0", "#2a0a3a", "#e0a0ff"]; this.trapKind = "stalactite"; this.trapColor = "#7df9ff";
    this.tip = { laneT: 0.5, x: 600, y: 420 }; this.tipTo = { ...this.tip }; this.idle = true; this.fast = false; this.cut = false;
    this.setRules({ stomp: false, roar: false, reflect: false, trap: false }, "CORTE: deslízate (S) y cámbiate al carril del tentáculo apoyado");
  }
  onLimbTouch(pl, at) {
    if (!pl.sliding) return false;
    if (!this.cut) { this.cut = true; this.game.sfx.smash(); this.say("¡CORTE!", "#7df9ff"); this.damage(3, "slide", at); }
    return true;
  }
  headPos() { return { x: 690 + Math.sin(this.t * 0.9) * 30, y: 70 + Math.sin(this.t * 1.7) * 8 - this.away * 220 + (this.state === "defeat" ? this.stateT * 140 : 0) }; }
  target() {
    if (!this.idle) return { lane: this.tip.laneT < 0.5 ? 0 : 1, laneT: this.tip.laneT, x: this.tip.x, y: this.tip.y + 20 };
    const s = this.headPos(); return { lane: 0, laneT: 0, x: VANISH_X + (s.x - VANISH_X) / LANES[0].s, y: (LANES[0].y - s.y) / LANES[0].s };
  }
  clearAttacks() { super.clearAttacks(); this.idle = true; this.fast = false; }
  updateBody(dt) {
    if (this.idle) this.tipTo = { laneT: 0.5, x: 560 + Math.sin(this.t * 1.3) * 40, y: 170 + Math.sin(this.t * 2) * 20 + this.away * 300 };
    const k = Math.min(1, dt * (this.fast ? 28 : 6));
    for (const key of ["laneT", "x", "y"]) this.tip[key] = lerp(this.tip[key], this.tipTo[key], k);
  }
  attack() { const r = Math.random(); if (r < 0.5) this.slam(this.p.lane); else if (r < 0.75) this.ink(); else this.sweep(); }
  slam(lane) {
    const d = this.tele(0.85);
    this.idle = false; this.fast = false; this.tipTo = { laneT: lane, x: 160, y: 220 };
    this.warn(lane, "shadow", d);
    this.after(d, () => {
      this.fast = true; this.tipTo = { laneT: lane, x: 160, y: 0 };
      this.addHazard({ lane, x: COL_X, y: 0, w: COL_W, h: 320, life: 0.18, isBody: true });
      this.game.addShake(0.2, 5); this.game.sfx.stomp(); this.game.puff(160, 0, lane, 12, "#8fd8ff");
      this.cut = false;
      this.rest(lane, { x: COL_X, y: 0, w: COL_W, h: 30 }, 0, () => { this.idle = true; this.fast = false; });
    });
  }
  ink() {   // tinta en arco: cambia de carril o rómpela con E
    const n = 2 + Math.min(2, this.cycle), gap = 0.6 / this.speedMul, T = 1.15 / Math.sqrt(this.speedMul);
    for (let i = 0; i < n; i++) this.after(i * gap, () => {
      const L = i === 0 ? this.p.lane : randInt(0, 1);
      this.warn(L, "target", T); this.game.sfx.toss();
      this.lob(L, 760, 260, T, drawInkHaz);
    });
    this.after((n - 1) * gap + T + 0.4, () => this.slam(1 - this.p.lane));
  }
  sweep() {   // tentáculo a ras de suelo por tu carril: salta
    const L = this.p.lane, d = this.tele(0.7);
    this.warn(L, "arrow", d, { y: 0 });
    this.after(d, () => this.addHazard({ lane: L, x: 900, y: 0, w: 90, h: 26, vx: -620 * Math.sqrt(this.speedMul), draw: drawSweepHaz }));
    this.after(d + 1.4, () => this.slam(1 - this.p.lane));
  }
  drawSky(c) {
    const h = this.headPos(), t = this.t;
    c.save();
    if (this.flash > 0 && Math.floor(this.flash * 30) % 2 === 0) c.filter = "brightness(3)";
    if (this.state === "defeat") c.globalAlpha = clamp(1 - this.stateT / 1.8, 0, 1);
    const R = (col, x, y, w, hh) => { c.fillStyle = col; c.fillRect(Math.round(h.x + x), Math.round(h.y + y), w, hh); };
    for (let i = 0; i < 5; i++) { const sw = Math.sin(t * 2 + i) * 6; R("#2a0a3a", -58 + i * 26 + sw, 40, 16, 50); R("#8a3aa0", -56 + i * 26 + sw, 40, 12, 46); }
    R("#2a0a3a", -72, -54, 144, 100); R("#8a3aa0", -68, -50, 136, 92); R("#a85ac0", -60, -44, 60, 20);
    for (const ex of [-44, 16]) { R("#2a0a3a", ex, 0, 30, 24); R("#ffe14d", ex + 2, 2, 26, 20); R("#15161c", ex + 10, 4 + Math.sin(t * 3) * 3, 8, 14); }
    for (let i = 0; i < 4; i++) R("#e0a0ff", -50 + i * 30, -30 + (i % 2) * 10, 8, 8);
    c.restore();
  }
  drawBody(c, lane) {
    if ((this.tip.laneT < 0.5 ? 0 : 1) !== lane) return;
    const h = this.headPos(), a = { x: h.x - 40, y: h.y + 80 }, tp = toScreen(this.tip.laneT, this.tip.x, this.tip.y + 20);
    drawChain(c, a, tp, { x: (a.x + tp.x) / 2 + 60, y: Math.min(a.y, tp.y) - 20 }, 14, 22 * tp.s, 14 * tp.s, "#2a0a3a", ["#8a3aa0", "#a85ac0"], "#e0a0ff");
    c.save(); applyLane(c, this.tip.laneT);
    BO(c, "#2a0a3a", "#8a3aa0", this.tip.x - 20, this.tip.y, 44, 24); B(c, "#e0a0ff", this.tip.x - 14, this.tip.y + 4, 8, 6); B(c, "#e0a0ff", this.tip.x + 6, this.tip.y + 4, 8, 6);
    c.restore();
  }
}

// ---------------------------------------------------------------------
// 9. Cementerio — Rey de los huesos: T-rex esqueleto. Muerde desde arriba (cámbiate),
//    lanza huesos en arco y fuegos fantasma a ras de suelo o a media altura.
// ---------------------------------------------------------------------
class BoneRexBoss extends Boss {
  constructor(game, cycle) {
    super(game, cycle, BOSS_NAMES[8], 1.25);
    this.colors = ["#e8dcc0", "#2a2418", "#6aff8a"]; this.trapKind = "lightning"; this.trapColor = "#6aff8a";
    this.bx = 1070; this.skull = { laneT: 0, x: 1050, y: 120 }; this.skullTo = { ...this.skull }; this.idle = true; this.fast = false; this.jaw = 0;
    this.shield = 3; this.shieldDown = 0;
    this.setRules({ roar: false, reflect: true, trap: false });
    this.dmg.stomp = 4; this.reflectDist = 90; this.roarCdMult = 0.4;
  }
  hintText() { return this.shield > 0 ? `ESCUDO (${this.shield}): devuélvele fuegos o huesos con E para romperlo` : "¡ESCUDO ROTO! Pisa su cráneo cuando muerda (S)"; }
  canStomp() { return this.shield === 0; }
  onReflectHit() {
    if (this.shield > 0) {
      this.shield--; this.flash = 0.2; this.game.sfx.shieldBreak();
      const tg = this.target(); this.game.floatText(0, tg.x, tg.y + 40, this.shield ? `ESCUDO ${this.shield}` : "¡ESCUDO ROTO!", "#6aff8a", 22);
      if (!this.shield) this.shieldDown = 9;
    } else this.damage(2, "reflect");
  }
  target() { return { lane: 0, laneT: 0, x: this.bx + 60, y: 90 }; }
  clearAttacks() { super.clearAttacks(); this.idle = true; this.fast = false; }
  updateBody(dt) {
    this.bx = 650 + this.away * 420 + (this.state === "defeat" ? Math.sin(this.t * 40) * 3 : 0);
    this.jaw = Math.max(0, this.jaw - dt);
    if (this.shieldDown > 0 && (this.shieldDown -= dt) <= 0 && this.state === "fight") { this.shield = 3; this.say("¡ESCUDO REGENERADO!", "#6aff8a", 18, 0, this.bx, 140); }
    if (this.idle) this.skullTo = { laneT: 0, x: this.bx - 40, y: 118 + Math.sin(this.t * 2.5) * 6 };
    const k = Math.min(1, dt * (this.fast ? 30 : 7));
    for (const key of ["laneT", "x", "y"]) this.skull[key] = lerp(this.skull[key], this.skullTo[key], k);
  }
  attack() { const r = Math.random(); if (this.shield > 0) { if (r < 0.55) this.wisps(); else this.bones(); } else if (r < 0.6) this.bite(this.p.lane); else this.wisps(); }
  bite(lane) {
    const d = this.tele(0.85);
    this.idle = false; this.fast = false; this.skullTo = { laneT: lane, x: 150, y: 180 }; this.jaw = d;
    this.warn(lane, "shadow", d);
    this.after(d, () => {
      this.fast = true; this.skullTo = { laneT: lane, x: 150, y: 0 };
      this.addHazard({ lane, x: COL_X, y: 0, w: COL_W, h: 320, life: 0.18, isBody: true });
      this.game.addShake(0.2, 6); this.game.sfx.stomp(); this.game.puff(160, 0, lane, 12, "#e8dcc0");
      this.rest(lane, { x: COL_X, y: 0, w: COL_W, h: 38 }, 0, () => { this.idle = true; this.fast = false; });
    });
  }
  bones() {
    const n = 2 + Math.min(2, this.cycle), gap = 0.55 / this.speedMul, T = 1.1 / Math.sqrt(this.speedMul);
    for (let i = 0; i < n; i++) this.after(i * gap, () => {
      const L = i === 0 ? this.p.lane : randInt(0, 1);
      this.warn(L, "target", T); this.game.sfx.toss();
      this.lob(L, this.bx + 30, 170, T, drawBoneHaz);
    });
    this.after((n - 1) * gap + T + 0.4, () => this.bite(1 - this.p.lane));
  }
  wisps() {
    const n = 3 + Math.min(1, this.cycle), gap = 0.55 / this.speedMul, d = this.tele(0.55);
    this.game.sfx.screech();
    for (let i = 0; i < n; i++) this.after(i * gap, () => {
      const lane = i % 2 ? 1 - this.p.lane : this.p.lane, hy = Math.random() < 0.5 ? 6 : 40;
      this.warn(lane, "arrow", d, { y: hy });
      this.after(d, () => this.addHazard({ lane, x: 880, y: hy, w: 34, h: 16, vx: -640 * Math.sqrt(this.speedMul),
        projectile: true, reflectable: true, destructible: true, draw: drawWispHaz }));
    });
    this.after(n * gap + d + 1.1, () => this.bite(1 - this.p.lane));
  }
  drawBody(c, lane) {
    const x = this.bx, O = "#2a2418", Bn = "#e8dcc0", Sh = "#9a8c70", glow = Math.floor(this.t * 5) % 2 ? "#6aff8a" : "#b8ffc8";
    if (lane === 0) {
      c.save(); applyLane(c, 0);
      for (const lx of [x + 40, x + 100]) { BO(c, O, Bn, lx, 0, 12, 60, 2); BO(c, O, Bn, lx - 10, 0, 26, 6, 2); B(c, Sh, lx + 2, 28, 8, 4); }
      for (let i = 0; i < 8; i++) BO(c, O, Bn, x + 130 + i * 16, 80 - i * 4, 14, 10, 2);   // cola
      BO(c, O, Bn, x + 20, 104, 130, 12, 2);                                                     // columna
      for (let i = 0; i < 6; i++) BO(c, O, Bn, x + 30 + i * 18, 60 + (i % 2) * 4, 8, 44, 2);    // costillas
      BO(c, O, Bn, x + 10, 58, 110, 6, 2);
      BO(c, O, Bn, x - 6, 80, 22, 8, 2); BO(c, O, Bn, x - 10, 70, 8, 12, 2);                     // bracito
      c.globalAlpha = 0.35 + 0.2 * Math.sin(this.t * 4); B(c, "#6aff8a", x + 40, 70, 70, 30); c.globalAlpha = 1;
      if (this.shield > 0) {   // escudo de almas
        c.strokeStyle = `rgba(106,255,138,${0.5 + 0.3 * Math.sin(this.t * 6)})`; c.lineWidth = 4;
        c.beginPath(); c.ellipse(x + 80, -100, 130, 110, 0, 0, Math.PI * 2); c.stroke();
        for (let i = 0; i < this.shield; i++) B(c, "#6aff8a", x + 50 + i * 24, 210, 14, 14);
      }
      c.restore();
    }
    if ((this.skull.laneT < 0.5 ? 0 : 1) !== lane) return;
    const s = toScreen(0, x + 20, 110), f = toScreen(this.skull.laneT, this.skull.x + 40, this.skull.y + 30);
    drawChain(c, s, f, { x: (s.x + f.x) / 2, y: Math.min(s.y, f.y) - 30 }, 7, 14 * f.s, 12 * f.s, O, [Bn, Sh]);
    c.save(); applyLane(c, this.skull.laneT);
    const sx = this.skull.x, sy = this.skull.y, open = this.jaw > 0 ? 10 : 3;
    BO(c, O, Bn, sx - 20, sy + 14 + open, 80, 34);                   // cráneo
    BO(c, O, Bn, sx - 20, sy, 70, 12);                               // mandíbula
    for (let i = 0; i < 5; i++) { B(c, "#ffffff", sx - 16 + i * 12, sy + 12, 5, 6 + open); }
    B(c, O, sx + 20, sy + 30 + open, 16, 12); B(c, glow, sx + 24, sy + 33 + open, 8, 6);
    B(c, Sh, sx - 10, sy + 20 + open, 40, 4);
    c.restore();
  }
}

// ---------------------------------------------------------------------
// 10. Luna — Nave nodriza (boss final): rayo abductor (cámbiate), láseres a
//     distintas alturas y mininaves en arco. Aterriza en el otro carril para recargar.
// ---------------------------------------------------------------------
class UfoBoss extends Boss {
  constructor(game, cycle) {
    super(game, cycle, BOSS_NAMES[9], 1.35);
    this.colors = ["#8792ab", "#7df9ff", "#ffe14d"]; this.trapKind = "meteor"; this.trapColor = "#ff8a2a";
    this.a = 0; this.mode = "sky"; this.k = 0; this.wp = { laneT: 1, x: 0, y: 0 }; this.glideHit = false; this.lastPhase = 1;
    this.setRules({ roar: false, trap: false });
    this.reflectDist = 90; this.roarCdMult = 0.5; this.maxTime = CONFIG.BOSS_MAX_TIME + 15;
  }
  get phase() { return this.hp > this.maxHp * 2 / 3 ? 1 : this.hp > this.maxHp / 3 ? 2 : 3; }
  hintText() {
    return ["", "FASE 1: devuélvele las mininaves con el rugido (E)", "FASE 2: cuando aterrice, písale la cúpula (S)", "FASE 3: cuando pase rasante, golpéala desde abajo de un salto"][this.phase];
  }
  canStomp() { return this.phase === 2; }
  onRoar(lane) { if (this.phase === 1) super.onRoar(lane); }
  onReflectHit() { if (this.phase === 1) this.damage(2, "reflect"); }
  damage(n, kind, at) {
    const r = super.damage(n, kind, at);
    if (r && this.hp > 0 && this.phase !== this.lastPhase) { this.lastPhase = this.phase; this.say(`¡FASE ${this.phase}!`, "#ff3b5c", 30, 0, 450, 150); this.game.addShake(0.4, 8); }
    return r;
  }
  extraCollide(pl, lane, boxes) {
    if (this.mode !== "glide" || this.glideHit || this.phase !== 3 || lane !== Math.round(this.wp.laneT)) return false;
    const a = boxes[0], b = { x: this.wp.x + 5, y: this.wp.y, w: 110, h: 40 };
    if (overlap(a, b) && a.y < b.y) { this.glideHit = true; this.game.sfx.stomp(); this.say("¡CABEZAZO!"); this.damage(3, "headbutt", { laneT: lane, x: b.x + 55, y: b.y }); }
    return false;
  }
  skyPos() { return { x: 560 + Math.cos(this.a) * 160, y: 112 + Math.sin(this.a * 2) * 14 - this.away * 260 + (this.state === "defeat" ? this.stateT * 160 : 0) }; }
  target() {
    if (this.mode === "sky") { const s = this.skyPos(); return { lane: 0, laneT: 0, x: VANISH_X + (s.x - VANISH_X) / LANES[0].s, y: (LANES[0].y - s.y) / LANES[0].s }; }
    return { lane: this.wp.laneT < 0.5 ? 0 : 1, laneT: this.wp.laneT, x: this.wp.x + 55, y: this.wp.y + 25 };
  }
  clearAttacks() { super.clearAttacks(); this.mode = "sky"; }
  updateBody(dt) {
    this.a += dt * 1.1 * this.speedMul;
    const wp = this.wp;
    if (this.mode === "land") { this.k = Math.min(1, this.k + dt / 0.45); wp.x = lerp(420, 110, this.k); wp.y = lerp(220, 0, this.k); }
    else if (this.mode === "glide") { wp.x -= 500 * this.speedMul * dt; wp.y = this.glideHit ? wp.y + 260 * dt : 104; if (wp.x < -260) this.mode = "sky"; }
    else if (this.mode === "takeoff") { this.k += dt / 0.6; wp.x += 300 * dt; wp.y += 420 * dt; if (this.k >= 1) this.mode = "sky"; }
  }
  attack() {
    const r = Math.random(), ph = this.phase, next = () => this.attack();
    if (ph === 1) { if (r < 0.65) this.drones(next); else this.laser(next); }
    else if (ph === 2) { const land = () => this.land(1 - this.p.lane); if (r < 0.5) this.beam(this.p.lane, land); else this.laser(land); }
    else { const glide = () => this.glide(); if (r < 0.5) this.beam(this.p.lane, glide); else this.laser(glide); }
  }
  glide() {   // fase 3: pasa rasante; golpéala desde abajo
    const lane = this.p.lane, d = this.tele(0.9), dur = 1300 / (500 * this.speedMul);
    this.warn(lane, "arrow", d, { y: 104 }); this.game.sfx.laser();
    this.after(d, () => { this.mode = "glide"; this.glideHit = false; this.wp = { laneT: lane, x: 950, y: 104 }; });
    this.after(d + dur + CONFIG.BOSS_ATTACK_GAP / this.speedMul, () => { if (this.mode === "glide") this.mode = "sky"; if (this.state === "fight") this.attack(); });
  }
  beam(lane, then) {   // rayo abductor de toda la altura: cambiar de carril
    const d = this.tele(0.9);
    this.warn(lane, "shadow", d); this.game.sfx.laser();
    this.after(d, () => this.addHazard({ lane, x: COL_X - 10, y: 0, w: COL_W + 20, h: 320, life: 0.55, draw: drawBeamHaz }));
    this.after(d + 0.8, then);
  }
  laser(then) {   // bajo: saltar · medio: deslizarse · alto: no saltar
    const d = this.tele(0.8), both = Math.random() < 0.5, first = both ? choice(["low", "mid"]) : choice(["low", "mid", "high"]);
    const plan = both ? [[0, first], [1, first === "low" ? "mid" : "low"]] : [[this.p.lane, first]];
    for (const [L, hk] of plan) {
      const b = LASER[hk];
      this.warn(L, "line", d, { y: b.y, h: b.h, x2: 900 });
      this.after(d, () => this.addHazard({ lane: L, x: 0, w: 900, y: b.y, h: b.h, life: 0.42, draw: drawLaserHaz }));
    }
    this.after(d, () => { this.game.sfx.laser(); this.game.addShake(0.15, 3); });
    this.after(d + 0.8, then);
  }
  drones(then) {
    const n = 2 + Math.min(2, this.cycle), gap = 0.5 / this.speedMul, T = 1.1 / Math.sqrt(this.speedMul);
    for (let i = 0; i < n; i++) this.after(i * gap, () => {
      const L = i === 0 ? this.p.lane : randInt(0, 1);
      this.warn(L, "target", T); this.game.sfx.toss();
      this.lob(L, 700, 260, T, drawSaucerHaz);
    });
    this.after((n - 1) * gap + T + 0.6, then);
  }
  land(lane) {   // aterriza en el otro carril: momento de pisarla
    const d = this.tele(0.8);
    this.warn(lane, "shadow", d);
    this.after(d, () => { this.mode = "land"; this.k = 0; this.wp = { laneT: lane, x: 420, y: 220 }; });
    this.after(d + 0.45, () => {
      this.addHazard({ lane, x: 110, y: 0, w: 110, h: 44, life: 0.15, isBody: true });
      this.game.addShake(0.2, 5); this.game.sfx.stomp();
      this.rest(lane, { x: 110, y: 0, w: 110, h: 44 }, 0, () => { this.mode = "takeoff"; this.k = 0; });
    });
  }
  drawSky(c) {
    if (this.mode !== "sky") return;
    c.save();
    if (this.flash > 0 && Math.floor(this.flash * 30) % 2 === 0) c.filter = "brightness(3)";
    if (this.state === "defeat") c.globalAlpha = clamp(1 - this.stateT / 1.8, 0, 1);
    const s = this.skyPos(); drawSaucer(c, s.x, s.y, 1.2, this.t);
    c.restore();
  }
  drawBody(c, lane) {
    if (this.mode === "sky" || (this.wp.laneT < 0.5 ? 0 : 1) !== lane) return;
    c.save(); applyLane(c, this.wp.laneT);
    if (this.mode === "glide" && !this.glideHit) {
      c.fillStyle = `rgba(255,225,77,${0.25 + 0.15 * Math.sin(this.t * 12)})`;
      c.beginPath(); c.ellipse(this.wp.x + 55, -(this.wp.y + 26), 90, 34, 0, 0, Math.PI * 2); c.fill();
    }
    drawSaucer(c, this.wp.x + 55, -(this.wp.y + 26), 0.95, this.t);
    c.restore();
  }
}
BOSS_CLASSES.push(CrabBoss, FrogBoss, KrakenBoss, BoneRexBoss, UfoBoss);

// =====================================================================
//  Forma furiosa: al bajar de CONFIG.BOSS_FURY_AT de vida cada boss añade una mecánica nueva
//  que obliga a cambiar de estrategia. La forma de dañarle no cambia.
// =====================================================================
function drawPuddleHaz(c, h) {
  c.fillStyle = "#1f4a1c"; c.fillRect(Math.round(h.x - 2), -10, h.w + 4, 10);
  c.fillStyle = "#8bdc3a"; c.fillRect(Math.round(h.x), -8, h.w, 8);
  c.fillStyle = "#e8ffb0"; c.fillRect(Math.round(h.x + 6), -8, 8, 2); c.fillRect(Math.round(h.x + h.w - 14), -6, 4, 2);
}
function drawFireHaz(c, h) {
  for (let x = h.x; x < h.x + h.w; x += 12) {
    const f = 8 + Math.abs(Math.sin(h.t * 9 + x * 0.3)) * 8;
    c.fillStyle = "#7a1a08"; c.fillRect(Math.round(x), -Math.round(f) - 2, 12, Math.round(f) + 2);
    c.fillStyle = "#ff6a1a"; c.fillRect(Math.round(x + 2), -Math.round(f), 8, Math.round(f));
    c.fillStyle = "#ffd05a"; c.fillRect(Math.round(x + 4), -Math.round(f * 0.5), 4, Math.round(f * 0.5));
  }
}
function drawWaveHaz(c, h) {
  c.fillStyle = "#1f3a14"; c.fillRect(Math.round(h.x - 2), -(h.h + 2), h.w + 4, h.h + 2);
  c.fillStyle = "#6cc25a"; c.fillRect(Math.round(h.x), -h.h, h.w, h.h);
  c.fillStyle = "#d8f0a0"; c.fillRect(Math.round(h.x), -h.h, h.w, 4);
}
// Ataca primero en un carril sin quedarse apoyado (para encadenar con el ataque normal)
function furyFeint(b, lane, set) {
  const d = b.tele(0.85);
  b.warn(lane, "shadow", d);
  set(lane, false);
  b.after(d, () => { set(lane, true); b.addHazard({ lane, x: COL_X, y: 0, w: COL_W, h: 320, life: 0.18, isBody: true }); b.game.addShake(0.15, 4); b.game.sfx.stomp(); });
  return d;
}
function furyAttack(Cls, fn) {
  const old = Cls.prototype.attack;
  Cls.prototype.attack = function () { return this.fury ? fn.call(this) : old.call(this); };
}

// 1. Escorpión: pinchos en los dos carriles a la vez (hay que saltarlos) y doble coletazo
ScorpionBoss.prototype.onFury = function () { this.furyHint = "pinchos en los dos carriles: sáltalos. ¡Y golpea dos veces!"; };
furyAttack(ScorpionBoss, function () {
  if (Math.random() < 0.5) {
    const gap = 0.9 / this.speedMul;
    for (let i = 0; i < 2; i++) this.after(i * gap, () => { this.dropSpike(0, "#5a2210", "#e07a3f"); this.dropSpike(1, "#5a2210", "#e07a3f"); });
    this.after(2 * gap + 0.9, () => this.strike(1 - this.p.lane));
  } else {
    const A = this.p.lane, d = furyFeint(this, A, (L, down) => { this.idleTip = false; this.fast = down; this.tipTo = { laneT: L, x: down ? 158 : 160, y: down ? 4 : 240 }; });
    this.after(d + 0.35, () => this.strike(1 - A));
  }
});

// 2. Serpiente: escupe charcos de veneno que avanzan por el suelo (sáltalos)
SerpentBoss.prototype.onFury = function () { this.furyHint = "deja charcos de veneno en el suelo: sáltalos"; };
furyAttack(SerpentBoss, function () {
  if (Math.random() < 0.4) return this.double();
  const L = this.p.lane, n = 3, gap = 0.6 / this.speedMul;
  this.idle = false; this.fast = false; this.headTo = { laneT: L, x: 420, y: 60 };
  for (let i = 0; i < n; i++) this.after(0.3 + i * gap, () => {
    const lane = i % 2 ? 1 - L : L, d = this.tele(0.5);
    this.headTo = { laneT: lane, x: 420, y: 20 };
    this.warn(lane, "arrow", d, { y: 0 });
    this.after(d, () => { this.game.sfx.hiss(); this.addHazard({ lane, x: 400, y: 0, w: 46, h: 10, scroll: true, life: 5, draw: drawPuddleHaz }); });
  });
  this.after(0.3 + n * gap + 1.1, () => this.strike(this.p.lane, true));
});

// 3. Golem: su puño deja el carril ardiendo unos segundos (sal de ese carril)
GolemBoss.prototype.onFury = function () { this.furyHint = "su puño deja el carril ardiendo: sal de él"; };
GolemBoss.prototype.burn = function (lane) {
  this.warn(lane, "fire", 0.5);
  this.after(0.5, () => this.addHazard({ lane, x: 0, y: 0, w: 430, h: 14, life: 2.5, draw: drawFireHaz }));
};

// 4. Mamut: en furia cambia de carril a mitad de la embestida (ver updateBody): no te apartes, sáltale
MammothBoss.prototype.onFury = function () { this.furyHint = "cambia de carril al embestir: no te apartes, sáltale"; };

// 5. Pterodáctilo: lluvia de plumas que caen y avanzan por el suelo, y picados en zigzag
ShadowPteroBoss.prototype.onFury = function () { this.furyHint = "lluvia de plumas: salta las que caen en tu carril"; };
furyAttack(ShadowPteroBoss, function () {
  if (Math.random() < 0.5) {
    const n = 4, gap = 0.5 / this.speedMul; this.game.sfx.screech();
    for (let i = 0; i < n; i++) this.after(i * gap, () => this.dropSpike(i % 2 ? 1 - this.p.lane : this.p.lane, "#140a24", "#6a3aa0", drawFeatherHaz));
    this.after(n * gap + 1, () => this.glide());
  } else { const A = this.p.lane; this.dive(A, "low", () => this.dive(1 - A, "mid", () => this.glide())); }
});

// 6. Rey cangrejo: burbujas que rebotan (pasa por debajo o sáltalas a tiempo) y doble pinzazo
CrabBoss.prototype.onFury = function () { this.furyHint = "burbujas que rebotan: pasa por debajo o sáltalas a tiempo"; };
furyAttack(CrabBoss, function () {
  if (Math.random() < 0.5) {
    const L = this.p.lane, n = 3, gap = 0.6 / this.speedMul;
    for (let i = 0; i < n; i++) this.after(0.2 + i * gap, () => {
      const lane = i % 2 ? 1 - L : L, d = this.tele(0.5);
      this.warn(lane, "arrow", d, { y: 30 });
      this.after(d, () => { this.game.sfx.hiss(); this.addHazard({ lane, x: 880, y: 6, w: 24, h: 24, vx: -480 * Math.sqrt(this.speedMul),
        projectile: true, reflectable: true, destructible: true, draw: drawBubbleHaz, onUpdate: h => { h.y = 6 + Math.abs(Math.sin(h.t * 4.5)) * 70; } }); });
    });
    this.after(0.2 + n * gap + 1.2, () => this.pinch(1 - this.p.lane));
  } else {
    const A = this.p.lane, d = furyFeint(this, A, (L, down) => { this.idle = false; this.fast = down; this.clawTo = { laneT: L, x: 150, y: down ? 0 : 170 }; });
    this.after(d + 0.35, () => this.pinch(1 - A));
  }
});

// 7. Sapo: tres saltos encadenados; los dos primeros aterrizan lejos con una onda por el suelo (salta)
FrogBoss.prototype.onFury = function () { this.furyHint = "ondas al aterrizar: salta cuando lleguen"; };
furyAttack(FrogBoss, function () {
  const hop = () => this.leap(randInt(0, 1), 470);
  const T = this.tele(0.8) + 0.55 / Math.sqrt(this.speedMul) + 0.5;
  hop(); this.after(T, hop); this.after(2 * T, () => this.leap(this.p.lane));
});

// 8. Kraken: su tinta deja media pantalla a oscuras unos segundos (guíate por los avisos)
KrakenBoss.prototype.onFury = function () { this.furyHint = "su tinta te deja a oscuras: guíate por los avisos"; this.dark = 0; };
furyAttack(KrakenBoss, function () {
  const r = Math.random();
  if (r < 0.45) { const T = 1.15 / Math.sqrt(this.speedMul); this.ink(); this.after(T, () => { this.dark = 3.5; this.game.sfx.hiss(); }); }
  else if (r < 0.7) this.sweep(); else this.slam(this.p.lane);
});
{
  const up = KrakenBoss.prototype.updateBody, fx = KrakenBoss.prototype.drawFx;
  KrakenBoss.prototype.updateBody = function (dt) { up.call(this, dt); if (this.dark > 0) this.dark = Math.max(0, this.dark - dt); };
  KrakenBoss.prototype.drawFx = function (c) {
    fx.call(this, c);
    if (!(this.dark > 0) || this.state !== "fight") return;
    const a = Math.min(1, this.dark / 0.5) * 0.9;
    c.fillStyle = `rgba(8,4,20,${a})`; c.fillRect(360, 0, W - 360, H);
    c.fillStyle = `rgba(8,4,20,${a * 0.6})`; c.fillRect(300, 0, 60, H);
    for (const lane of [0, 1]) for (const w of this.teles) if (w.lane === lane) { c.save(); applyLane(c, lane); this.drawTele(c, w); c.restore(); }
  };
}

// 9. Rey de los huesos: el escudo vuelve una vez con 3 cargas y los fuegos fantasma cambian a tu carril
BoneRexBoss.prototype.onFury = function () {
  this.furyHint = "los fuegos fantasma te persiguen: sáltalos o devuélvelos";
  if (this.shield === 0) { this.shield = 3; this.shieldDown = 0; }
};
furyAttack(BoneRexBoss, function () {
  if (this.shield === 0 && Math.random() < 0.5) return this.bite(this.p.lane);
  const n = 3 + Math.min(1, this.cycle), gap = 0.6 / this.speedMul, d = this.tele(0.55);
  this.game.sfx.screech();
  for (let i = 0; i < n; i++) this.after(i * gap, () => {
    const lane = i % 2 ? 1 - this.p.lane : this.p.lane, hy = Math.random() < 0.5 ? 6 : 40;
    this.warn(lane, "arrow", d, { y: hy });
    this.after(d, () => this.addHazard({ lane, x: 880, y: hy, w: 34, h: 16, vx: -560 * Math.sqrt(this.speedMul),
      projectile: true, reflectable: true, destructible: true, draw: drawWispHaz,
      onUpdate: (h, dt) => { if (!h.homed && h.x < 560) { h.homed = true; h.lane = this.p.lane; } h.laneT = lerp(h.laneT, h.lane, Math.min(1, dt * 10)); } }));
  });
  this.after(n * gap + d + 1.1, () => this.bite(1 - this.p.lane));
});

// 10. Nave nodriza: en la fase 3 (su furia) el rayo abductor te levanta; pulsa S (caída rápida) para soltarte
{
  const ctor = UfoBoss;
  ctor.prototype.onFury = function () { this.furyHint = "rayo abductor: si te atrapa, pulsa S para soltarte"; };
  const up = ctor.prototype.updateBody, ex = ctor.prototype.extraCollide;
  ctor.prototype.updateBody = function (dt) {
    up.call(this, dt);
    if (this.furyAt !== 1 / 3) this.furyAt = 1 / 3;   // la furia de la nave es su fase 3
    if (this.tractor && (this.tractor.t += dt) >= this.tractor.dur) this.tractor = null;
  };
  ctor.prototype.extraCollide = function (pl, lane, boxes) {
    const tr = this.tractor;
    if (tr && !tr.free && lane === tr.lane && this.state === "fight") {
      if (pl.fastFall && !pl.onGround) { tr.free = true; this.say("¡LIBRE!", "#7df9ff"); }
      else {
        pl.onGround = false; pl.vy = Math.max(pl.vy, 300);
        if (pl.y > 190) { tr.free = true; if (this.game.hitPlayer()) return true; }
      }
    }
    return ex.call(this, pl, lane, boxes);
  };
  furyAttack(ctor, function () {
    const glide = () => this.glide();
    if (this.phase < 3) return this.laser(() => this.attack());
    if (Math.random() < 0.55) {
      const lane = this.p.lane, d = this.tele(0.9);
      this.warn(lane, "shadow", d); this.game.sfx.laser();
      this.after(d, () => {
        this.tractor = { lane, t: 0, dur: 1.6, free: false };
        this.addHazard({ lane, x: COL_X - 10, y: 0, w: COL_W + 20, h: 320, life: 1.6, harmful: false, draw: drawBeamHaz });
      });
      this.after(d + 1.9, glide);
    } else this.laser(glide);
  });
}

// Textos del manual: la mecánica nueva de cada boss en furia
const BOSS_FURY_GUIDE = [
  "Lanza pinchos en los dos carriles a la vez (cambiar de carril ya no sirve: sáltalos o rómpelos con E) y da un coletazo falso antes del de verdad.",
  "Escupe charcos de veneno que avanzan por el suelo: sáltalos.",
  "Cada puñetazo deja el carril ardiendo unos segundos: sal de ese carril.",
  "Cambia de carril a mitad de la embestida: si te apartas, te alcanza. Quédate y sáltale.",
  "Lluvia de plumas que caen y avanzan por el suelo (sáltalas) y picados en zigzag entre carriles.",
  "Burbujas que rebotan entre el suelo y media altura: pasa cuando estén arriba o sáltalas cuando bajen. Además, pinzazo falso antes del de verdad.",
  "Tres saltos seguidos: los dos primeros aterrizan lejos y mandan una onda por el suelo de los dos carriles. Salta cuando llegue.",
  "Su tinta deja media pantalla a oscuras: las flechas rojas siguen viéndose, guíate por ellas.",
  "El escudo vuelve una vez con 3 cargas y los fuegos fantasma cambian a tu carril a mitad de camino: sáltalos o devuélvelos con E.",
  "En la fase 3 el rayo abductor te levanta del suelo: pulsa S (caída rápida) para soltarte antes de llegar arriba.",
];

