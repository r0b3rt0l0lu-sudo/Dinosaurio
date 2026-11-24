// =====================================================================
//  MONTURAS: una por bioma. El raptor se sube unos segundos y cambian sus controles y su física.
//  Mount (base) + 10 subclases, MountPickup (icono en el camino) y MountManager.
//  Coordenadas: las del carril (y = altura sobre el suelo). El arte se dibuja en px de arte (×3).
// =====================================================================
const MS = 3;   // px lógicos por píxel de arte (igual que el raptor)
// Rectángulo en px de arte con el origen abajo a la izquierda (y hacia arriba)
function ma(c, col, ox, oy, x, y, w, h) { c.fillStyle = col; c.fillRect(Math.round(ox + x * MS), Math.round(oy - (y + h) * MS), w * MS, h * MS); }
// Raptor montado con su skin (frame idle o jump) con los pies a la altura feetY (px)
function drawRider(c, g, frame, feetY, dx = 0, clip = 0) {
  const id = g.skinId; if (!SE.get(id)) return;
  c.save();
  if (clip) { c.beginPath(); c.rect(-100, -feetY - 400, 400, 400 - clip); c.clip(); }   // sentado: la parte de abajo queda dentro
  SE.drawSprite(c, id, frame, dx / MS, Math.round(-SE.H - feetY / MS), MS, g.player.skinState.tick);
  c.restore();
}
class Mount {
  constructor(game, cfg, biome) {
    this.g = game; this.cfg = cfg; this.id = cfg.id; this.biome = biome; this.name = cfg.name;
    this.t = 0; this.y = 0; this.vy = 0; this.onGround = true; this.inv = MOUNT_CONFIG.MOUNT_INVULN;
    const easy = game.mode.id === "easy" ? MOUNT_CONFIG.EASY_DURATION_MULT : 1;
    this.duration = this.timeLeft = (cfg.duration * easy + game.stat("mountDurAdd")) * game.stat("mountDurMult");
    this.armor = game.stat("mountArmor"); this.coinMult = 1; this.baseSpeed = cfg.speed; this.laneTime = CONFIG.LANE_SWITCH_TIME;
    this.deck = 12; this.width = 28; this.riderH = 54; this.frame = "idle";
  }
  get pl() { return this.g.player; }
  get speedMult() { return this.baseSpeed; }
  get invulnerable() { return this.inv > 0; }
  get warn() { return MOUNT_CONFIG.WARN_TIME * (this.g.mode.id === "easy" ? MOUNT_CONFIG.EASY_WARN_MULT : 1) * this.g.stat("teleMult"); }
  canChangeLane() { return true; }
  canRoar() { return this.cfg.roar === true; }
  passesThrough() { return false; }
  destroys() { return false; }
  onDestroy() {}
  onPass() {}
  jump() {}
  down() {}
  spawn() { return false; }      // generador propio de obstáculos (true = ya ha generado este tramo)
  allowPattern() { return true; }
  gapMult() { return 1; }
  // Salto genérico (sin doble salto)
  doJump(v) { if (this.onGround) { this.vy = v * this.g.stat("jumpMult"); this.onGround = false; this.g.sfx.jump(); this.g.ach.event("jump"); } }
  physics(dt, grav = 1) {
    if (this.onGround) return;
    this.vy -= CONFIG.GRAVITY * grav * dt; this.y += this.vy * dt;
    if (this.y <= 0) { this.y = 0; this.vy = 0; this.onGround = true; this.land(); }
  }
  land() { this.g.puff(this.pl.x + 36, 0, this.pl.logicalLane, 6, this.g.level.biome.pal.bandEdge); }
  update(dt) {
    this.t += dt; this.inv = Math.max(0, this.inv - dt);
    this.step(dt);
    const p = this.pl; p.y = this.y + this.deck; p.onGround = this.onGround && this.y <= 0; p.vy = this.vy;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) this.end();
  }
  step(dt) { this.physics(dt); }
  end() { this.g.mounts.dismount("time"); }
  // Caja de la montura + caja del raptor (las estelas y efectos no cuentan)
  hitboxes() {
    const x = this.pl.x, w = this.width * MS, mx = x + 36 - w / 2;
    return [{ x: mx + 4, y: this.y, w: w - 8, h: this.deck }, { x: x + 24, y: this.y + this.deck, w: 27, h: this.riderH }];
  }
  draw(c) {
    const g = this.g, blink = (this.inv > 0 || g.grace > 0) && Math.floor(g.time * 14) % 2 === 0;
    drawShadow(c, 36, this.width * MS * 0.8, Math.max(0, this.y));
    c.save(); if (blink) c.globalAlpha = 0.4;
    const ox = 36 - this.width * MS / 2;
    this.drawBehind(c, ox, -this.y);
    this.drawRiderPart(c);
    this.drawBody(c, ox, -this.y);
    c.restore();
  }
  drawBehind() {}
  drawRiderPart(c) { drawRider(c, this.g, this.frame, this.y + this.deck); }
  drawBody() {}
}

// ---------- 1. Tabla de arena (Desierto) ----------
class SandBoard extends Mount {
  constructor(g, cfg, b) { super(g, cfg, b); this.width = 28; this.deck = 12; }
  jump() { if (this.onGround) { this.doJump(CONFIG.JUMP_VELOCITY * MOUNT_CONFIG.BOARD_JUMP); this.g.sfx.mountFx("board"); } }
  get crouch() { return this.pl.downHeld; }
  step(dt) {
    this.physics(dt, MOUNT_CONFIG.BOARD_GRAVITY);
    if (this.onGround && Math.random() < dt * 30) this.g.particles.push(new Particle(this.pl.logicalLane, this.pl.x + rand(-6, 10), 2, rand(-200, -80), rand(40, 160), 0.4, "#e9c48a", rand(2, 4)));
  }
  land() { super.land(); for (let i = 0; i < 12; i++) this.g.particles.push(new Particle(this.pl.logicalLane, this.pl.x + 36 + rand(-30, 30), 2, rand(-160, 160), rand(60, 220), 0.5, "#e9c48a", rand(3, 5))); }
  onPass(o) {   // truco: pasar por encima de un cactus en el aire
    if (!this.onGround && o.kind === "ground") {
      const n = MOUNT_CONFIG.BOARD_TRICK_COINS; this.g.addRunCoins(n); this.g.sfx.coin();
      this.g.floatText(this.pl.laneT, this.pl.x + 40, this.y + 110, `¡TRUCO! +${n}`, "#ffd23f", 20); this.g.ach.event("boardTrick");
    }
  }
  hitboxes() { const b = super.hitboxes(); if (this.crouch) b[1].h = 24; return b; }
  drawRiderPart(c) {
    if (!this.crouch) return drawRider(c, this.g, this.onGround ? "idle" : "jump", this.y + this.deck, 4);
    c.save(); c.translate(0, -(this.y + this.deck)); c.scale(1.1, 0.6); c.translate(0, this.y + this.deck); drawRider(c, this.g, "idle", this.y + this.deck, 4); c.restore();
  }
  drawBody(c, ox, oy) {
    ma(c, "#5a2a10", ox, oy, 1, 0, 26, 1); ma(c, "#5a2a10", ox, oy, 0, 1, 28, 2); ma(c, "#5a2a10", ox, oy, 2, 3, 24, 1);
    ma(c, "#c8783a", ox, oy, 1, 1, 26, 2); ma(c, "#f0b060", ox, oy, 2, 2, 23, 1); ma(c, "#d8402a", ox, oy, 6, 1, 3, 2); ma(c, "#d8402a", ox, oy, 19, 1, 3, 2);
    ma(c, "#fff0d0", ox, oy, 25, 2, 2, 1);
  }
}

// ---------- 2. Tronco por el río (Selva) ----------
class RiverLog extends Mount {
  constructor(g, cfg, b) { super(g, cfg, b); this.width = 32; this.deck = 24; this.water = "river"; this.crocT = 0; }
  jump() { this.doJump(CONFIG.JUMP_VELOCITY); }
  destroys(o) { return (o.kind === "ground" && o.h <= 46) || (o.kind === "rock" && o.size === "small" && !o.falling); }
  onDestroy() { this.g.addShake(0.12, 3); this.g.sfx.mountFx("log"); for (let i = 0; i < 8; i++) this.g.particles.push(new Particle(this.pl.logicalLane, this.pl.x + 70, rand(5, 30), rand(-100, 300), rand(100, 300), 0.6, choice(["#7a4a24", "#c89a6a"]), rand(3, 5))); }
  // Entre los patrones normales salen cocodrilos (avisan con burbujas)
  spawn() {
    if (Math.random() < 0.4) { this.g.mounts.addHazard({ kind: "croc", lane: randInt(0, 1), x: SPAWN_X, y: 0, w: 66, h: 26, warn: this.warn, name: "Cocodrilo" }); return 380; }
    return false;
  }
  drawBody(c, ox, oy) {
    const bob = Math.round(Math.sin(this.t * 6)) * MS;
    ma(c, "#3a2010", ox, oy + bob, 0, 0, 32, 8); ma(c, "#7a4a24", ox, oy + bob, 1, 1, 30, 6); ma(c, "#9a6232", ox, oy + bob, 2, 5, 26, 1);
    ma(c, "#c89a6a", ox, oy + bob, 28, 1, 3, 6); ma(c, "#7a4a24", ox, oy + bob, 29, 3, 1, 2);
    for (let i = 4; i < 26; i += 6) ma(c, "#5a3418", ox, oy + bob, i, 2, 3, 1);
    ma(c, "#4f9a3a", ox, oy + bob, 8, 7, 4, 1); ma(c, "#4f9a3a", ox, oy + bob, 17, 1, 3, 1);
    if (this.onGround) { ma(c, "#e8fbff", ox, oy, -1 - (Math.floor(this.t * 8) % 3), 0, 2, 1); ma(c, "#e8fbff", ox, oy, 33 + (Math.floor(this.t * 8) % 2), 0, 2, 1); }
  }
}

// ---------- 3. Roca flotante sobre la lava (Volcán) ----------
class LavaRock extends Mount {
  constructor(g, cfg, b) { super(g, cfg, b); this.width = 26; this.deck = 30; this.onGround = false; this.y = 30; }
  step(dt) {
    const p = this.pl, target = p.upHeld ? MOUNT_CONFIG.LAVA_SPEED : p.downHeld ? -MOUNT_CONFIG.LAVA_SPEED : -MOUNT_CONFIG.LAVA_SINK;
    this.vy = lerp(this.vy, target, Math.min(1, dt * 6));
    this.y = clamp(this.y + this.vy * dt, 0, MOUNT_CONFIG.LAVA_MAX_Y);
    this.onGround = this.y <= 0;
    if (Math.random() < dt * 25) this.g.particles.push(new Particle(p.logicalLane, p.x + 36 + rand(-20, 20), this.y, rand(-80, 40), rand(-140, -40), 0.4, choice(["#ff6a1a", "#ffb000"]), rand(2, 4), 0));
  }
  jump() {}
  passesThrough(o) { return this.y > 10 && o.kind !== "flyer" && o.kind !== "stalactite" && o.h <= 70; }   // vuela por encima de lo bajo
  // Generador propio: chorros de lava desde el suelo y rocas que caen desde arriba, siempre con un hueco
  spawn() {
    const M = this.g.mounts, lane = randInt(0, 1), hg = Math.random() < 0.25 ? 0 : Math.round(rand(50, 130));
    if (hg) M.addHazard({ kind: "geyser", lane, x: SPAWN_X, y: 0, w: 40, h: hg, warn: this.warn + 0.2, name: "Chorro de lava" });
    const rb = hg + 150;
    if (rb < 270 && (!hg || Math.random() < 0.7)) M.addHazard({ kind: "lavafall", lane, x: SPAWN_X + 4, y: rb, w: 46, h: 360 - rb, warn: this.warn + 0.1, destructible: true, name: "Roca volcánica" });
    else if (!hg) M.addHazard({ kind: "geyser", lane, x: SPAWN_X, y: 0, w: 40, h: 110, warn: this.warn + 0.2, name: "Chorro de lava" });
    return 320 + Math.random() * 120;
  }
  drawBody(c, ox, oy) {
    ma(c, "#1a0e0c", ox, oy, 2, 0, 22, 10); ma(c, "#1a0e0c", ox, oy, 0, 3, 26, 6);
    ma(c, "#3c2c2a", ox, oy, 1, 4, 24, 4); ma(c, "#3c2c2a", ox, oy, 3, 1, 20, 8); ma(c, "#5a443e", ox, oy, 4, 8, 16, 1);
    const glow = Math.floor(this.t * 6) % 2 ? "#ff6a1a" : "#ffb000";
    ma(c, glow, ox, oy, 6, 3, 2, 1); ma(c, glow, ox, oy, 8, 2, 1, 1); ma(c, glow, ox, oy, 17, 4, 2, 1); ma(c, glow, ox, oy, 12, 1, 3, 1);
  }
}

// ---------- 4. Trineo (Glaciar) ----------
class Sled extends Mount {
  constructor(g, cfg, b) { super(g, cfg, b); this.width = 30; this.deck = 12; this.riderH = 42; this.laneTime = MOUNT_CONFIG.SLED_LANE_TIME; this.coinMult = MOUNT_CONFIG.SLED_COIN_MULT; }
  jump() { this.doJump(CONFIG.JUMP_VELOCITY * MOUNT_CONFIG.SLED_JUMP); }
  gapMult() { return 1.4; }
  step(dt) {
    this.physics(dt);
    if (this.onGround && Math.random() < dt * 40) for (const dx of [-12, 30]) this.g.particles.push(new Particle(this.pl.logicalLane, this.pl.x + dx, 1, -this.g.effectiveSpeed * 0.9, 0, 0.3, "#ffffff", 2, 0));
  }
  drawRiderPart(c) { drawRider(c, this.g, "idle", this.y + this.deck - 6, 4, 0); }
  drawBody(c, ox, oy) {
    ma(c, "#3a4a6a", ox, oy, 0, 0, 30, 1); ma(c, "#3a4a6a", ox, oy, 28, 1, 2, 3); ma(c, "#c8d4e8", ox, oy, 1, 0, 27, 1);
    ma(c, "#1e3a5a", ox, oy, 3, 1, 1, 2); ma(c, "#1e3a5a", ox, oy, 22, 1, 1, 2);
    ma(c, "#7a1e1e", ox, oy, 1, 3, 25, 5); ma(c, "#c83a2a", ox, oy, 2, 4, 23, 3); ma(c, "#ff7a5a", ox, oy, 2, 6, 23, 1); ma(c, "#ffe14d", ox, oy, 24, 4, 1, 3);
  }
}

// ---------- 5. Meteorito domado (Noche) ----------
class TamedMeteor extends Mount {
  constructor(g, cfg, b) { super(g, cfg, b); this.width = 24; this.deck = 36; this.onGround = false; this.y = 0; this.jumped = false; this.frame = "jump"; }
  get invulnerable() { return true; }
  canRoar() { return false; }
  destroys() { return true; }
  onDestroy() { this.g.sfx.mountFx("meteor"); this.g.addShake(0.15, 4); this.g.burst(this.pl.logicalLane, this.pl.x + 80, this.y + 40, ["#ff8a2a", "#ffd05a", "#ffffff"], 10); }
  get falling() { return this.timeLeft < 1.5; }
  step(dt) {
    const target = this.falling ? Math.max(0, MOUNT_CONFIG.METEOR_HEIGHT * (this.timeLeft / 1.5)) : MOUNT_CONFIG.METEOR_HEIGHT;
    this.y = lerp(this.y, target, Math.min(1, dt * 5));
    this.g.mounts.smashHazards(this.pl.logicalLane, this.pl.x + 90);
    if (Math.random() < dt * 60) this.g.particles.push(new Particle(this.pl.logicalLane, this.pl.x + rand(-10, 20), this.y + rand(10, 40), rand(-500, -250), rand(-40, 60), 0.35, choice(["#ff8a2a", "#ffd05a", "#ff3b3b"]), rand(3, 6), 0));
  }
  jump() {   // salto final: hay que acertar la ventana
    if (!this.falling || this.jumped) return;
    this.jumped = true;
    const [a, b] = MOUNT_CONFIG.METEOR_JUMP_WINDOW, ok = this.timeLeft >= a && this.timeLeft <= b, g = this.g;
    if (ok) {
      const n = MOUNT_CONFIG.METEOR_PERFECT_COINS; g.addRunCoins(n); g.fury.add(MOUNT_CONFIG.METEOR_PERFECT_FURY); g.sfx.perfect();
      g.floatText(this.pl.laneT, this.pl.x + 40, this.y + 120, `¡ATERRIZAJE PERFECTO! +${n}`, "#ffd23f", 20); g.ach.event("meteorPerfectJump");
      g.mounts.dismount("time");
    } else { g.floatText(this.pl.laneT, this.pl.x + 40, this.y + 120, "¡DEMASIADO PRONTO!", "#ff6b6b", 20); g.mounts.dismount("hit"); }
  }
  end() { this.g.floatText(this.pl.laneT, this.pl.x + 40, 120, "¡TARDE!", "#ff6b6b", 20); this.g.mounts.dismount("hit"); }
  drawBehind(c, ox, oy) {
    for (let i = 0; i < 5; i++) { c.globalAlpha = 0.5 - i * 0.08; ma(c, i % 2 ? "#ffd05a" : "#ff6a1a", ox, oy, -4 - i * 4, 4 + (i % 2), 6, 8 - i); }
    c.globalAlpha = 1;
  }
  drawRiderPart(c) { drawRider(c, this.g, "jump", this.y + this.deck - 6, -2); }
  drawBody(c, ox, oy) {
    ma(c, "#1e120a", ox, oy, 4, 0, 16, 16); ma(c, "#1e120a", ox, oy, 1, 3, 22, 10);
    ma(c, "#7a5a40", ox, oy, 5, 1, 14, 14); ma(c, "#7a5a40", ox, oy, 2, 4, 20, 8); ma(c, "#a07a58", ox, oy, 6, 10, 8, 3);
    const gl = Math.floor(this.t * 10) % 2 ? "#ff8a2a" : "#ffd05a";
    ma(c, gl, ox, oy, 9, 5, 3, 1); ma(c, gl, ox, oy, 12, 4, 1, 3); ma(c, gl, ox, oy, 16, 8, 2, 1);
    if (this.falling) {   // indicador de la ventana de salto
      const [a, b] = MOUNT_CONFIG.METEOR_JUMP_WINDOW, inW = this.timeLeft >= a && this.timeLeft <= b;
      c.font = '14px "Raptor Pixel Display", monospace'; c.textAlign = "center"; c.fillStyle = inW ? "#5fd15a" : "#ff3b3b";
      c.fillText(inW ? "¡SALTA! (W)" : "¡PREPÁRATE!", 36, oy - this.deck - 80);
      c.fillStyle = "#0e0b16"; c.fillRect(-4, oy - this.deck - 74, 80, 8); c.fillStyle = "#3a2f50"; c.fillRect(-2, oy - this.deck - 72, 76, 4);
      const x0 = -2 + 76 * (1 - b / 1.5), x1 = -2 + 76 * (1 - a / 1.5); c.fillStyle = "#5fd15a"; c.fillRect(x0, oy - this.deck - 72, x1 - x0, 4);
      c.fillStyle = "#ffffff"; c.fillRect(-2 + 76 * (1 - this.timeLeft / 1.5) - 1, oy - this.deck - 76, 2, 12);
    }
  }
}

// ---------- 6. Tortuga gigante (Playa) ----------
class GiantTurtle extends Mount {
  constructor(g, cfg, b) { super(g, cfg, b); this.width = 30; this.deck = 36; this.hide = 0; this.hideCd = 0; }
  jump() { if (!this.hide) this.doJump(CONFIG.JUMP_VELOCITY * MOUNT_CONFIG.TURTLE_JUMP); }
  down(on) {
    if (!on || this.hide > 0 || this.hideCd > 0) return;
    this.hide = MOUNT_CONFIG.TURTLE_HIDE; this.hideCd = MOUNT_CONFIG.TURTLE_HIDE_CD; this.g.sfx.mountFx("turtle");
  }
  get invulnerable() { return this.inv > 0 || this.hide > 0; }
  destroys(o) { return this.onGround && ((o.kind === "ground" && o.h <= 46) || (o.kind === "rock" && o.size === "small")); }
  onDestroy() { this.g.sfx.stomp(); this.g.addShake(0.1, 3); }
  spawn() {
    if (Math.random() < 0.35) { this.g.mounts.addHazard({ kind: "wave", lane: randInt(0, 1), x: SPAWN_X + 80, y: 0, w: 70, h: 60, vx: -140, warn: this.warn, name: "Ola" }); return 420; }
    return false;
  }
  step(dt) { this.hide = Math.max(0, this.hide - dt); this.hideCd = Math.max(0, this.hideCd - dt); this.physics(dt, 1.3); }
  hitboxes() { const b = super.hitboxes(); return this.hide > 0 ? [b[0]] : b; }
  drawRiderPart(c) { if (!this.hide) drawRider(c, this.g, "idle", this.y + this.deck, 2); }
  drawBody(c, ox, oy) {
    const step = this.onGround ? Math.round(Math.sin(this.t * 8)) : 0, hidden = this.hide > 0;
    if (!hidden) { ma(c, "#2a5a3a", ox, oy, 4 + step, 0, 4, 4); ma(c, "#2a5a3a", ox, oy, 22 - step, 0, 4, 4); ma(c, "#2a5a3a", ox, oy, 26, 5, 4, 4); ma(c, "#ffffff", ox, oy, 28, 7, 1, 1); ma(c, "#0e0b16", ox, oy, 29, 7, 1, 1); }
    ma(c, "#1e3a24", ox, oy, 1, 3, 26, 10); ma(c, "#1e3a24", ox, oy, 4, 13, 20, 1);
    ma(c, "#3aa878", ox, oy, 2, 4, 24, 8); ma(c, "#2a7a58", ox, oy, 2, 4, 24, 2);
    for (const [x, y] of [[5, 7], [12, 9], [19, 7], [9, 5], [16, 5]]) ma(c, "#7ad8a8", ox, oy, x, y, 3, 2);
    if (this.hideCd > 0 && !hidden) { ma(c, "#0e0b16", ox, oy, 6, 15, 16, 1); ma(c, "#ffd23f", ox, oy, 6, 15, Math.round(16 * (1 - this.hideCd / MOUNT_CONFIG.TURTLE_HIDE_CD)), 1); }
  }
}

// ---------- 7. Seta saltarina (Bosque de setas) ----------
class BounceMushroom extends Mount {
  constructor(g, cfg, b) { super(g, cfg, b); this.width = 18; this.deck = 54; this.onGround = false; this.vy = MOUNT_CONFIG.SHROOM_BOUNCE * 0.6; }
  jump() {}
  down(on) { if (on && !this.onGround) { this.cut = true; this.vy = Math.min(this.vy, -200); } }
  step(dt) {
    const p = this.pl, rising = this.vy > 0;
    const grav = this.cut ? CONFIG.FAST_FALL_MULT : rising && p.upHeld ? MOUNT_CONFIG.SHROOM_HOLD_GRAVITY : 1;
    this.physics(dt, grav);
    this.frame = this.vy > 0 ? "jump" : "idle";
  }
  land() { this.bounce(); }
  bounce() {
    const g = this.g; this.cut = false; this.onGround = false; this.vy = MOUNT_CONFIG.SHROOM_BOUNCE * g.stat("jumpMult");
    g.sfx.mountFx("shroom");
    for (let i = 0; i < 8; i++) g.particles.push(new Particle(this.pl.logicalLane, this.pl.x + 36 + rand(-20, 20), 4, rand(-120, 120), rand(60, 200), 0.6, choice(["#ff7ad0", "#7df9ff", "#ffe14d"]), rand(2, 4), 300));
  }
  canChangeLane() { return true; }
  destroys(o) { const hb = o.hitbox(); return this.vy < 0 && this.y >= hb.y + hb.h - 30; }   // cae encima: lo aplasta
  onDestroy() {
    const g = this.g, n = MOUNT_CONFIG.SHROOM_STOMP_COINS; g.addRunCoins(n); g.sfx.stomp();
    g.floatText(this.pl.laneT, this.pl.x + 40, this.y + 120, `¡PLAF! +${n}`, "#ff7ad0", 20); g.ach.event("mushroomStomp"); this.bounce();
  }
  hitboxes() { const x = this.pl.x; return [{ x: x + 12, y: this.y, w: 48, h: this.deck }, { x: x + 24, y: this.y + this.deck, w: 27, h: 54 }]; }
  drawBody(c, ox, oy) {
    const sq = this.onGround ? 1 : 0;
    ma(c, "#b4a2c0", ox, oy, 6, 0, 6, 10 - sq); ma(c, "#f2e8f2", ox, oy, 7, 1, 2, 8 - sq);
    ma(c, "#7a1a4a", ox, oy, 0, 10 - sq, 18, 6); ma(c, "#7a1a4a", ox, oy, 2, 16 - sq, 14, 2);
    ma(c, "#ff7ad0", ox, oy, 1, 11 - sq, 16, 4); ma(c, "#ff7ad0", ox, oy, 3, 15 - sq, 12, 2); ma(c, "#ffb8e8", ox, oy, 4, 16 - sq, 6, 1);
    for (const x of [3, 8, 13]) ma(c, "#ffffff", ox, oy, x, 13 - sq, 2, 1);
    for (let x = 1; x < 17; x += 3) ma(c, Math.floor(this.t * 6) % 2 ? "#7df9ff" : "#ffe14d", ox, oy, x, 10 - sq, 1, 1);
  }
}

// ---------- 8. Delfín (Océano) ----------
class Dolphin extends Mount {
  constructor(g, cfg, b) { super(g, cfg, b); this.width = 32; this.deck = 24; this.water = "sea"; this.dive = 0; this.diveCd = 0; this.onGround = false; this.vy = MOUNT_CONFIG.DOLPHIN_ARC; }
  get under() { return this.y < -4; }
  canRoar() { return !this.under; }
  jump() { if (this.y < 40 && !this.under && this.vy < 600) { this.vy = MOUNT_CONFIG.DOLPHIN_JUMP * this.g.stat("jumpMult"); this.g.sfx.mountFx("dolphin"); this.g.ach.event("jump"); } }
  step(dt) {
    const p = this.pl, M = MOUNT_CONFIG;
    this.diveCd = Math.max(0, this.diveCd - dt);
    const diving = p.downHeld && this.diveCd <= 0 && this.dive < M.DOLPHIN_DIVE_MAX;
    if (diving) {
      this.dive += dt; this.vy = 0; this.y = lerp(this.y, -M.DOLPHIN_DEPTH - 40, Math.min(1, dt * 8));
      if (this.dive >= M.DOLPHIN_DIVE_MAX) this.diveCd = M.DOLPHIN_DIVE_CD;
      if (Math.random() < dt * 20) this.g.particles.push(new Particle(p.logicalLane, p.x + rand(10, 70), this.y + rand(10, 60), rand(-60, 20), rand(40, 100), 0.6, "#bfeaff", rand(2, 4), -200));
    } else {
      if (this.dive > 0 && !p.downHeld) { if (this.dive >= 0.2) this.diveCd = Math.max(this.diveCd, M.DOLPHIN_DIVE_CD * 0.5); this.dive = 0; }
      if (this.y < 0 && this.vy <= 0) this.vy = M.DOLPHIN_ARC * 0.8;   // sale del agua
      this.vy -= CONFIG.GRAVITY * dt; this.y += this.vy * dt;
      if (this.y <= 0 && this.vy < 0) { this.y = 0; this.vy = M.DOLPHIN_ARC; this.g.sfx.mountFx("splash"); this.g.puff(p.x + 40, 0, p.logicalLane, 6, "#e8fbff"); }   // arcos automáticos
    }
    this.onGround = false;
  }
  // Bajo el agua solo cuenta lo que está sumergido
  hitboxes() {
    const b = super.hitboxes();
    if (!this.under) return b;
    return b.filter(r => r.y < 0).map(r => ({ ...r, h: Math.min(r.h, -r.y) }));
  }
  spawn() {
    const M = this.g.mounts, lane = randInt(0, 1), r = Math.random();
    if (r < 0.38) M.addHazard({ kind: "jelly", lane, x: SPAWN_X, y: 0, w: 34, h: 34, destructible: true, name: "Medusa" });
    else if (r < 0.66) M.addHazard({ kind: "net", lane, x: SPAWN_X, y: 0, w: 60, h: 50, name: "Red" });
    else {
      M.addHazard({ kind: "shark", lane, x: SPAWN_X + 60, y: -84, w: 78, h: 64, vx: -60, warn: this.warn + 0.3, name: "Tiburón" });
      for (let i = 0; i < 4; i++) this.g.coinsArr.push(new Coin(1 - lane, SPAWN_X + i * 34, -40));   // monedas bajo el agua
    }
    return 300 + Math.random() * 120;
  }
  draw(c) {
    if (this.under) { c.save(); c.globalAlpha = 0.65; c.filter = "hue-rotate(180deg) saturate(0.6) brightness(0.9)"; }
    super.draw(c);
    if (this.under) c.restore();
  }
  drawBody(c, ox, oy) {
    const fl = Math.floor(this.t * 8) % 2;
    ma(c, "#1a3a5a", ox, oy, 2, 2, 26, 8); ma(c, "#1a3a5a", ox, oy, 26, 4, 6, 4); ma(c, "#1a3a5a", ox, oy, 0, 3 + fl, 4, 6 - fl);
    ma(c, "#5ab0e8", ox, oy, 3, 3, 24, 6); ma(c, "#5ab0e8", ox, oy, 27, 5, 4, 2); ma(c, "#dff4ff", ox, oy, 6, 3, 18, 2);
    ma(c, "#1a3a5a", ox, oy, 12, 10, 5, 2); ma(c, "#0e0b16", ox, oy, 25, 7, 1, 1); ma(c, "#ffffff", ox, oy, 24, 7, 1, 1);
  }
}

// ---------- 9. Ataúd con ruedas (Cementerio) ----------
class CoffinCart extends Mount {
  constructor(g, cfg, b) { super(g, cfg, b); this.width = 30; this.deck = 18; this.riderH = 30; }
  get speedMult() { return this.baseSpeed * (this.pl.downHeld ? MOUNT_CONFIG.COFFIN_BRAKE : 1); }
  jump() { this.doJump(CONFIG.JUMP_VELOCITY * MOUNT_CONFIG.COFFIN_JUMP); }
  passesThrough(o) { return o.kind === "flyer" || (o.kind === "ground" && o.h <= 46); }   // atraviesa fantasmas y lápidas pequeñas
  spawn() {
    if (Math.random() < 0.35) { this.g.mounts.addHazard({ kind: "skull", lane: randInt(0, 1), x: SPAWN_X, y: 0, w: 30, h: 30, vx: -160, destructible: true, name: "Calavera rodante" }); return 360; }
    return false;
  }
  step(dt) {
    this.physics(dt);
    if (this.pl.downHeld && this.onGround && Math.random() < dt * 30) this.g.particles.push(new Particle(this.pl.logicalLane, this.pl.x - 6, 2, rand(-80, 0), rand(30, 90), 0.3, "#ffd05a", 2));
  }
  drawRiderPart(c) { drawRider(c, this.g, "idle", this.y + this.deck - 6, 6, 0); }
  drawBody(c, ox, oy) {
    const r = Math.floor(this.t * 12) % 2;
    for (const wx of [3, 22]) { ma(c, "#0e0b16", ox, oy, wx, 0, 5, 4); ma(c, "#5a5a6a", ox, oy, wx + 1, 1, 3, 2); ma(c, "#b4b8c2", ox, oy, wx + 1 + r, 1, 1, 2); }
    ma(c, "#1a0e0a", ox, oy, 0, 3, 30, 3); ma(c, "#1a0e0a", ox, oy, 2, 6, 26, 1);
    ma(c, "#6a4a3a", ox, oy, 1, 4, 28, 2); ma(c, "#8a6a52", ox, oy, 3, 5, 24, 1); ma(c, "#d8c8a0", ox, oy, 13, 4, 1, 2); ma(c, "#d8c8a0", ox, oy, 12, 5, 3, 1);
  }
  drawBehind(c, ox, oy) { ma(c, "#3a2418", ox, oy, 0, 6, 4, 4); ma(c, "#6a4a3a", ox, oy, 1, 7, 2, 2); }
}

// ---------- 10. Cohete (Luna) ----------
class Rocket extends Mount {
  constructor(g, cfg, b) { super(g, cfg, b); this.width = 14; this.deck = 0; this.onGround = false; this.y = 40; this.vy = 200; this.stun = 0; this.frame = "jump"; }
  jump() {
    if (this.stun > 0) return;
    this.vy = MOUNT_CONFIG.ROCKET_IMPULSE; this.g.sfx.mountFx("rocket");
    for (let i = 0; i < 6; i++) this.g.particles.push(new Particle(this.pl.logicalLane, this.pl.x + 60, this.y, rand(-80, 80), rand(-260, -120), 0.35, choice(["#ff8a2a", "#ffd05a", "#ffffff"]), rand(3, 5), 0));
  }
  step(dt) {
    const M = MOUNT_CONFIG; this.stun = Math.max(0, this.stun - dt);
    this.vy -= CONFIG.GRAVITY * M.ROCKET_GRAVITY * dt; this.y += this.vy * dt;
    if (this.y > M.ROCKET_CEIL) { this.y = M.ROCKET_CEIL; this.vy = -Math.abs(this.vy) * 0.5; this.stun = M.ROCKET_STUN; this.g.addShake(0.15, 4); this.g.sfx.denied(); }
    if (this.y < 0) { this.y = 0; this.vy = Math.abs(this.vy) * 0.5 + 120; this.stun = M.ROCKET_STUN; this.g.addShake(0.15, 4); this.g.sfx.denied(); }
    this.onGround = this.y <= 0;
  }
  passesThrough(o) { return this.y > 5 && o.kind === "ground"; }
  hitboxes() { const x = this.pl.x; return [{ x: x + 40, y: this.y, w: 36, h: 72 }, { x: x + 6, y: this.y + 12, w: 30, h: 50 }]; }
  // Generador propio: meteoritos arriba y satélites abajo con un hueco vertical
  spawn() {
    const M = this.g.mounts, lane = randInt(0, 1), gc = rand(70, 190), gap = 130;
    if (gc - gap / 2 > 20) M.addHazard({ kind: "satellite", lane, x: SPAWN_X, y: 0, w: 44, h: Math.round(gc - gap / 2), name: "Satélite" });
    M.addHazard({ kind: "meteors", lane, x: SPAWN_X + 2, y: Math.round(gc + gap / 2), w: 44, h: 420, destructible: true, name: "Meteoritos" });
    return 300 + Math.random() * 100;
  }
  drawRiderPart(c) { drawRider(c, this.g, "jump", this.y + 10, -6); }
  drawBody(c, ox, oy) {
    const x0 = ox + 22, fl = Math.floor(this.t * 14) % 2;
    ma(c, fl ? "#ffd05a" : "#ff6a1a", x0, oy, 4, -4 - fl, 6, 4 + fl); ma(c, "#ffffff", x0, oy, 6, -2, 2, 2);
    ma(c, "#0e0b16", x0, oy, 2, 0, 10, 20); ma(c, "#0e0b16", x0, oy, 4, 20, 6, 3); ma(c, "#0e0b16", x0, oy, 0, 0, 14, 5);
    ma(c, "#e8eaf0", x0, oy, 3, 1, 8, 18); ma(c, "#e8eaf0", x0, oy, 5, 19, 4, 3); ma(c, "#ff3b5c", x0, oy, 1, 1, 12, 3); ma(c, "#ff3b5c", x0, oy, 5, 21, 4, 2);
    ma(c, "#5ae0ff", x0, oy, 5, 12, 4, 4); ma(c, "#c8fcff", x0, oy, 5, 14, 2, 2); ma(c, "#b4b8c2", x0, oy, 9, 2, 1, 16);
    if (this.stun > 0 && Math.floor(this.t * 10) % 2) ma(c, "#ffe14d", x0, oy, 2, 26, 10, 1);
  }
}
const MOUNT_CLASSES = { board: SandBoard, log: RiverLog, lavarock: LavaRock, sled: Sled, meteor: TamedMeteor, turtle: GiantTurtle, shroom: BounceMushroom, dolphin: Dolphin, coffin: CoffinCart, rocket: Rocket };
const MOUNT_BIOMES = Object.keys(MOUNT_CONFIG.mounts);

// Obstáculos especiales de las monturas (coordenadas del carril)
function drawMountHazard(c, h, t) {
  const warn = h.t < h.warn, x = Math.round(h.x), top = -(h.y + h.h);
  const R = (col, xx, yy, w, hh) => { c.fillStyle = col; c.fillRect(Math.round(xx), Math.round(yy), Math.round(w), Math.round(hh)); };
  switch (h.kind) {
    case "croc":
      if (warn) { for (let i = 0; i < 4; i++) R("#bfeaff", x + 10 + i * 12 + Math.sin(t * 9 + i) * 3, -6 - ((t * 40 + i * 9) % 20), 5, 5); return; }
      R("#16301a", x, top, h.w, h.h); R("#3a7a3a", x + 2, top + 2, h.w - 4, h.h - 6); R("#5aa04a", x + 2, top + 2, h.w - 4, 4);
      R("#ffffff", x + 8, top + 2, 6, 6); R("#0e0b16", x + 10, top + 4, 3, 3); for (let i = 18; i < h.w - 4; i += 8) R("#ffffff", x + i, top + h.h - 6, 4, 4); return;
    case "geyser":
      if (warn) { R(`rgba(255,106,26,${0.4 + 0.4 * Math.sin(t * 20)})`, x - 4, -8, h.w + 8, 8); for (let i = 0; i < 3; i++) R("#ffb000", x + 6 + i * 12, -10 - ((t * 60 + i * 7) % 16), 5, 5); return; }
      R("#7a1a08", x - 2, top, h.w + 4, h.h); R("#ff6a1a", x + 2, top, h.w - 4, h.h); R("#ffd05a", x + 12, top, h.w - 24, h.h);
      for (let i = 0; i < 3; i++) R("#fff0a0", x + 6 + i * 12, top - 4 - Math.abs(Math.sin(t * 12 + i)) * 10, 6, 6); return;
    case "lavafall":
      if (warn) { R(`rgba(255,59,59,${0.3 + 0.3 * Math.sin(t * 18)})`, x - 4, -6, h.w + 8, 6); R("#3a2c2a", x, -(h.y + h.h) + (1 - h.t / h.warn) * -200, h.w, h.h); return; }
      R("#1a0e0c", x - 2, top, h.w + 4, h.h + 2); R("#3c2c2a", x, top, h.w, h.h); R("#5a443e", x + 4, -h.y - 14, h.w - 8, 4);
      R(Math.floor(t * 8) % 2 ? "#ff6a1a" : "#ffb000", x + 10, -h.y - 24, 6, 4); return;
    case "wave":
      if (warn) { for (let i = 0; i < 6; i++) R("#ffffff", x + i * 12, -4 - (i % 2) * 4, 8, 3); return; }
      R("#1a6a9a", x, top + 10, h.w, h.h - 10); R("#3ec8d8", x + 4, top + 14, h.w - 8, h.h - 14); R("#ffffff", x, top + 6, h.w, 8); R("#ffffff", x + h.w - 20, top, 20, 8); return;
    case "jelly":
      R("#7a3a8a", x, top, h.w, 18); R("#e8a8f0", x + 2, top + 2, h.w - 4, 12); R("#ffffff", x + 6, top + 4, 6, 4);
      for (let i = 0; i < 4; i++) R("#e8a8f0", x + 4 + i * 8, top + 18 + Math.sin(t * 6 + i) * 2, 3, 14); return;
    case "net":
      R("#5a3a1a", x, top, 4, h.h); R("#5a3a1a", x + h.w - 4, top, 4, h.h);
      for (let yy = top + 4; yy < -2; yy += 8) R("#d8c8a0", x + 2, yy, h.w - 4, 2);
      for (let xx = x + 8; xx < x + h.w - 4; xx += 10) R("#d8c8a0", xx, top + 2, 2, h.h - 4);
      R("#c84a2a", x - 4, top - 6, h.w + 8, 6); return;
    case "shark":
      if (warn || h.t < h.warn + 0.01) { R("#5a6a7a", x + 30, -14, 10, 14); R("#5a6a7a", x + 26, -6, 18, 6); return; }
      c.globalAlpha = 0.85; R("#2a3a4a", x, top, h.w, h.h - 20); R("#6a7a8a", x + 4, top + 4, h.w - 8, h.h - 30); R("#e8eef4", x + 8, top + h.h - 34, h.w - 20, 8);
      R("#2a3a4a", x + 30, top - 14, 14, 14); R("#ffffff", x + 10, top + 10, 5, 5); R("#0e0b16", x + 11, top + 11, 3, 3); c.globalAlpha = 1; return;
    case "skull": {
      const r = Math.floor(t * 10) % 2;
      R("#16161e", x, top, h.w, h.h); R("#e8dcc0", x + 2, top + 2, h.w - 4, h.h - 4); R("#16161e", x + 6 + r * 2, top + 8, 6, 6); R("#16161e", x + 16 + r * 2, top + 8, 6, 6); R("#16161e", x + 8, top + 20, 12, 3); return;
    }
    case "satellite":
      R("#0e0b16", x + 18, top, 8, h.h); R("#b4b8c2", x + 20, top, 4, h.h);
      R("#0e0b16", x, top, h.w, 16); R("#3a5ad0", x + 2, top + 2, 16, 12); R("#3a5ad0", x + 26, top + 2, 16, 12); R("#e8eaf0", x + 18, top + 2, 8, 12);
      if (Math.floor(t * 3) % 2) R("#ff3b3b", x + 20, top - 4, 4, 4); return;
    case "meteors":
      for (let yy = -h.y - 26, i = 0; yy > -h.y - h.h; yy -= 40, i++) {
        const dx = (i % 2) * 8; R("#1e120a", x + dx, yy, 34, 30); R("#7a5a40", x + dx + 2, yy + 2, 30, 26); R("#a07a58", x + dx + 4, yy + 4, 12, 8);
        R(Math.floor(t * 8 + i) % 2 ? "#ff8a2a" : "#ffd05a", x + dx + 18, yy + 14, 6, 4);
      }
      return;
  }
}

// Icono de montura en el camino (burbuja brillante con la montura en pequeño)
class MountPickup {
  constructor(game, biome, lane, x) { this.g = game; this.biome = biome; this.cfg = MOUNT_CONFIG.mounts[biome]; this.lane = lane; this.x = x; this.y = 30; this.t = 0; this.taken = false; }
  hitbox() { return { x: this.x - 26, y: this.y - 26 + Math.sin(this.t * 4) * 4, w: 52, h: 52 }; }
  draw(c) {
    const cy = -(this.y + Math.sin(this.t * 4) * 4), col = this.cfg.icon, a = 0.35 + 0.25 * Math.sin(this.t * 6);
    c.fillStyle = rgbaHex(col, a); c.beginPath(); c.arc(0, cy, 34, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(255,255,255,0.85)"; c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(0, cy, 26, 0, Math.PI * 2); c.fill(); c.stroke();
    drawMountIcon(c, this.cfg.id, 0, cy, this.t);
    c.fillStyle = "#ffffff"; c.fillRect(-14, cy - 18, 5, 5);
  }
}
// Montura en miniatura (icono del camino, del marcador y del manual)
function drawMountIcon(c, id, cx, cy, t = 0, s = 1) {
  const fake = { g: { player: { skinState: { tick: 0 } }, skinId: "" }, t, onGround: true, hide: 0, hideCd: 0, y: 0, stun: 0, falling: false, timeLeft: 9 };
  const cls = MOUNT_CLASSES[id], w = { board: 28, log: 32, lavarock: 26, sled: 30, meteor: 24, turtle: 30, shroom: 18, dolphin: 32, coffin: 30, rocket: 14 }[id];
  c.save(); c.translate(cx, cy); c.scale(0.5 * s, 0.5 * s);
  const ox = -w * MS / 2 - (id === "rocket" ? 22 * MS : 0) + (id === "rocket" ? 7 * MS : 0), oy = (id === "shroom" ? 9 : id === "rocket" ? 12 : 5) * MS;
  cls.prototype.drawBody.call(fake, c, ox, oy);
  c.restore();
}

// =====================================================================
//  MountManager: decide cuándo aparece el icono, monta, baja y gestiona los obstáculos especiales
// =====================================================================
class MountManager {
  constructor(game) { this.g = game; this.reset(); }
  reset() { this.active = null; this.pickup = null; this.hazards = []; this.plan = {}; this.leaving = null; this.water = 0; this.waterKind = null; this.debugIdx = 0; }
  // Al empezar un nivel: ¿aparecerá una montura y en qué punto?
  planLevel(level) {
    const g = this.g; if (g.versus || g.tutorial) return;
    if (Math.random() >= g.stat("mountChance")) return;
    const [a, b] = MOUNT_CONFIG.WINDOW, P = CONFIG.POINTS_PER_LEVEL, bossAt = CONFIG.BOSS_AT_IN_LEVEL;
    // Si cae en los puntos anteriores al boss, se adelanta al tramo libre de antes; si cae detrás, sale al terminar la pelea
    let at = rand(a, b) * P;
    if (at >= bossAt - MOUNT_CONFIG.BOSS_MARGIN && at <= bossAt + 60) at = rand(a * P, Math.max(a * P, bossAt - MOUNT_CONFIG.BOSS_MARGIN));
    this.plan[level] = { at, done: false };
  }
  wantsPickup() {
    const g = this.g, p = this.plan[g.level.level]; if (!p || p.done) return false;
    const inLevel = g.distScore - (g.level.level - 1) * CONFIG.POINTS_PER_LEVEL, toBoss = CONFIG.BOSS_AT_IN_LEVEL - inLevel;
    if (g.level.biome.id === "santuario") return false;   // el santuario no tiene montura
    if (inLevel < p.at || this.active || this.pickup || g.bosses.active || g.level.portal || (g.rogue && g.rogue.altar)) return false;
    if (toBoss > 0 && toBoss < MOUNT_CONFIG.BOSS_MARGIN) return false;
    return true;
  }
  // Lo llama el generador cuando toca un nuevo tramo. Devuelve los px que ocupa (o 0 si no ha hecho nada)
  spawnHook() {
    const g = this.g;
    if (this.wantsPickup()) {
      const biome = g.level.biome.id;
      this.pickup = new MountPickup(g, MOUNT_CONFIG.mounts[biome] ? biome : "desert", randInt(0, 1), SPAWN_X + MOUNT_CONFIG.CLEAR_PX);
      this.plan[g.level.level].done = true;
      return MOUNT_CONFIG.CLEAR_PX * 2 + 40;
    }
    if (this.active) { const n = this.active.spawn(); if (n) return n; }
    return 0;
  }
  give(biome) {   // montar (también desde el modo prueba)
    const g = this.g, cfg = MOUNT_CONFIG.mounts[biome]; if (!cfg || this.active) return;
    const M = new MOUNT_CLASSES[cfg.id](g, cfg, biome), p = g.player;
    p.slideTime = 0; p.fastFall = false; p.jumps = 0; p.glideT = 0;
    if (p.y > 0 && M.onGround !== false) { M.y = 0; }
    this.active = M; this.leaving = null;
    if (M.water) { this.waterKind = M.water; }
    g.sfx.mountUp(); g.flashT = Math.max(g.flashT, 0.15); g.sfx.mountFx(cfg.id);
    g.bossBanner = { t: 1.6, text: cfg.name.toUpperCase(), sub: cfg.control, color: cfg.icon };
    g.ach.event("mountUsed", { id: cfg.id });
    if (g.tips) g.tips.show("mount", cfg);
  }
  // reason: "time" | "hit" | "boss"
  dismount(reason) {
    const g = this.g, M = this.active; if (!M) return;
    const p = g.player, gm = g.stat("graceMult");
    this.active = null; this.leaving = { M, t: 0, reason, lane: p.laneT, y: M.y };
    p.y = Math.max(0, M.y + M.deck * 0.5); p.onGround = false; p.vy = reason === "hit" ? 480 : 650; p.jumps = 1; p.fastFall = false; p.laneTime = CONFIG.LANE_SWITCH_TIME;
    g.grace = Math.max(g.grace, (reason === "hit" ? MOUNT_CONFIG.HIT_INVULN : MOUNT_CONFIG.END_INVULN) * gm);
    const sh = g.stat("mountEndShield"); if (sh) { g.effects.shield = g.effectMax.shield = Math.max(g.effects.shield, sh); }
    if (reason === "hit") { g.sfx.mountLost(); g.addShake(0.3, 6); g.floatText(p.laneT, p.x + 40, p.y + 100, "¡MONTURA PERDIDA!", "#ff6b6b", 20); g.ach.event("mountLost", { id: M.id }); }
    else { g.sfx.mountDown(); g.ach.event("mountEnd", { id: M.id }); }
    g.ach.event("mountTime", { id: M.id, t: M.duration - Math.max(0, M.timeLeft) });
  }
  onHit() {
    const g = this.g, M = this.active; if (!M) return;
    if (M.armor > 0) { M.armor--; M.inv = 1; g.sfx.shieldBreak(); g.floatText(g.player.laneT, g.player.x + 40, M.y + 120, "¡BLINDADA!", "#7df9ff", 20); return; }
    this.dismount("hit");
  }
  addHazard(o) { this.hazards.push(Object.assign({ t: 0, warn: 0, vx: 0, destructible: false, dead: false }, o)); }
  clearHazards(xMax) { for (const h of this.hazards) if (h.x < xMax && h.destructible !== null) { h.dead = true; this.g.burst(h.lane, h.x + h.w / 2, h.y + Math.min(h.h, 80) / 2, ["#ffffff", "#ffd05a"], 8); } }
  smashHazards(lane, x) { for (const h of this.hazards) if (!h.dead && h.lane === lane && h.x < x && h.x + h.w > x - 120 && h.t >= h.warn) { h.dead = true; this.g.burst(lane, h.x + h.w / 2, 40, ["#ff8a2a", "#ffd05a"], 10); this.g.sfx.smash(); } }
  roarHits(w, x0, x1) { for (const h of this.hazards) if (!h.dead && h.destructible && h.t >= h.warn && (w.both || h.lane === w.lane) && h.x < x1 && h.x + h.w > x0) { h.dead = true; this.g.burst(h.lane, h.x + h.w / 2, h.y + 20, ["#ffffff", "#ffd05a"], 8); this.g.sfx.smash(); } }
  update(gdt, dt) {
    const g = this.g, sp = g.effectiveSpeed;
    const wantWater = this.active && this.active.water;
    this.water = clamp(this.water + (wantWater ? dt : -dt) / 0.5, 0, 1);
    if (this.water === 0 && !wantWater) this.waterKind = null;
    if (this.pickup) { const P = this.pickup; P.t += dt; P.x -= sp * gdt; if (P.x < -80 || P.taken) this.pickup = null; }
    for (const h of this.hazards) { h.t += gdt; h.x += (h.vx - sp) * gdt; }
    this.hazards = this.hazards.filter(h => !h.dead && h.x + h.w > -200);
    if (this.leaving && (this.leaving.t += dt) > 0.8) this.leaving = null;
  }
  // Recoger el icono y chocar con obstáculos especiales. Devuelve true si el jugador muere.
  collide(pl, boxes) {
    const g = this.g, lane = pl.logicalLane, hits = b => boxes.some(a => overlap(a, b));
    const P = this.pickup;
    if (P && !P.taken && P.lane === lane && hits(P.hitbox())) { P.taken = true; this.give(P.biome); }
    for (const h of this.hazards) {
      if (h.dead || h.t < h.warn || h.lane !== lane || h.hitDone) continue;
      if (!hits({ x: h.x, y: h.y, w: h.w, h: h.h })) continue;
      if (this.active && this.active.invulnerable) { if (this.active instanceof TamedMeteor) h.dead = true; continue; }
      if (g.grace > 0 || g.effects.turbo > 0) continue;
      h.hitDone = true; g.lastHitBy = h.name || "Obstáculo especial";
      if (g.hitPlayer(pl)) return true;
    }
    return false;
  }
  drawLane(c, lane) {
    const g = this.g;
    if (this.pickup && this.pickup.lane === lane) { c.save(); applyLane(c, lane); c.translate(this.pickup.x, 0); this.pickup.draw(c); c.restore(); }
    for (const h of this.hazards) if (h.lane === lane) { c.save(); applyLane(c, lane); drawMountHazard(c, h, g.time); c.restore(); }
    const L = this.leaving;
    if (L && Math.round(L.lane) === lane) {   // la montura se va por detrás (o sale despedida)
      const k = L.t / 0.8;
      c.save(); applyLane(c, L.lane); c.globalAlpha = 1 - k;
      c.translate(g.player.x - k * 220, -(L.reason === "hit" ? 140 * k - 260 * k * k : 0) - (L.y || 0) * (1 - k));
      if (L.reason === "hit") { c.translate(36, -20); c.rotate(-k * 3); c.translate(-36, 20); }
      L.M.drawBody(c, 36 - L.M.width * MS / 2, 0);
      c.restore();
    }
  }
  // Río (tronco) o mar (delfín): el suelo se convierte en agua
  drawWater(c) {
    if (this.water <= 0) return;
    const g = this.g, k = this.water, sea = this.waterKind === "sea", t = g.time;
    c.save(); c.globalAlpha = k * 0.92;
    c.fillStyle = sea ? "#1a628c" : "#2a7a8a"; c.fillRect(-10, 214, W + 20, H - 204);
    c.fillStyle = sea ? "#3ec8d8" : "#4aa8a0";
    for (const [gy, s] of [[236, 0.8], [318, 1]]) c.fillRect(-10, Math.round(gy - 22 * s), W + 20, Math.round(22 * s));
    c.fillStyle = "#e8fbff";
    for (const [gy, s] of [[236, 0.8], [318, 1]]) for (let x = -mod(g.scroll * s, 40); x < W; x += 40) c.fillRect(Math.round(x + Math.sin(t * 3 + x) * 3), Math.round(gy - 22 * s + 2), 14, 2);
    c.globalAlpha = k * 0.5; c.fillStyle = "#ffffff";
    for (let x = -mod(g.scroll * 0.9, 70); x < W; x += 70) c.fillRect(Math.round(x), 214 + Math.round(Math.sin(t * 2 + x) * 2), 30, 2);
    c.restore();
  }
  // Modo prueba: M da la montura del bioma; Shift + M recorre las 10
  debugGive(cycle) {
    if (this.active) this.dismount("time");
    const biome = cycle ? MOUNT_BIOMES[this.debugIdx++ % MOUNT_BIOMES.length] : this.g.level.biome.id;
    this.give(MOUNT_CONFIG.mounts[biome] ? biome : "desert");
  }
}

