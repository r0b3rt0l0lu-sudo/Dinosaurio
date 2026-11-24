// =====================================================================
//  Particle
// =====================================================================
class Particle {
  constructor(lane, x, y, vx, vy, life, color, size, grav = 1400) {
    Object.assign(this, { lane, x, y, vx, vy, life, max: life, color, size, grav });
  }
  update(dt) {
    this.vy -= this.grav * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.y < 0 && this.grav > 0) { this.y = 0; this.vy *= -0.3; this.vx *= 0.7; }
    this.life -= dt;
  }
  draw(ctx) {
    ctx.globalAlpha = clamp(this.life / this.max, 0, 1); ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, -this.y - this.size / 2, this.size, this.size);
  }
}


// =====================================================================
//  Player: el raptor. Sprite de 24 × 20 píxeles nativos a escala CONFIG.RAPTOR_SCALE.
//  Hitbox: columnas 8–16 y filas 2–19 del sprite (cuerpo); al deslizarse, una caja baja.
// =====================================================================
class Player {
  constructor(game, num = 1) { this.game = game; this.num = num; this.skinState = { tick: 0, speed: 2, trail: null, hat: num === 1 ? undefined : null, trailFx: num === 1 ? undefined : null }; this.reset(); }   // el J2 va sin accesorio
  reset() {
    this.x = PLAYER_X; this.y = 0; this.vy = 0; this.prevY = 0;
    this.onGround = true; this.jumps = 0; this.fastFall = false; this.slideTime = 0; this.downHeld = false;
    this.lane = 1; this.laneFrom = 1; this.laneT = 1; this.laneProgress = 1;
    this.anim = 0; this.dustTimer = 0; this.tickAcc = 0; this.advance = true;
    this.skinState.trail = null;
    // Multijugador: cada raptor tiene su rugido, sus monedas y su puntuación
    this.dead = false; this.deadT = 0; this.lives = 1; this.grace = 0; this.score = 0; this.coins = 0; this.downHeld = false;
    this.roarCd = 0; this.roarCdMax = 1; this.roarWave = null; this.roarAnim = 0;
    this.traps = 0; this.thrown = 0; this.trapT = 0; this.nextTrap = randInt(0, TRAP_TYPES.length - 1); this.ink = 0;
    this.upHeld = false; this.glideT = 0; this.laneTime = CONFIG.LANE_SWITCH_TIME;
  }
  get mount() { return this.num === 1 && this.game.mounts ? this.game.mounts.active : null; }
  get maxJumps() { const g = this.game; return g.versus ? 2 : 1 + (g.stat("noDoubleJump") ? 0 : g.stat("airJumps")); }
  setLane(l) { this.lane = this.laneFrom = this.laneT = l; this.laneProgress = 1; }
  get skinId() { return this.num === 2 ? this.game.p2SkinId : this.game.skinId; }
  get sliding() { return this.slideTime > 0 && this.onGround; }
  get logicalLane() { return this.laneT < 0.5 ? 0 : 1; }
  get center() { return { x: this.x + 38, y: this.y + (this.sliding ? 12 : 27) }; }

  jump() {
    const g = this.game, M = this.mount; if (g.netWait > 0) return;   // cuenta atrás online
    if (M) return M.jump();   // montado: cada montura decide qué hace W
    const k = g.versus ? 1 : g.stat("jumpMult");
    if (this.onGround) {
      this.vy = CONFIG.JUMP_VELOCITY * k; this.onGround = false; this.jumps = 1; this.slideTime = 0; this.fastFall = false; this.glideT = 0;
      g.sfx.jump(); g.ach.event("jump");
    } else if (this.jumps < this.maxJumps) {
      this.vy = CONFIG.DOUBLE_JUMP_VELOCITY * k; this.jumps++; this.fastFall = false;
      g.sfx.doubleJump(); g.puff(this.x + 30, this.y, this.logicalLane, 10, "#ffffff"); g.ach.event("jump"); g.ach.event("doubleJump");
      const bonus = g.versus ? 0 : g.stat("airJumpCoins");   // sinergia Bailarín
      if (bonus) { g.addRunCoins(bonus, true); g.floatText(this.laneT, this.x + 30, this.y + 90, `+${bonus}`, "#ffd23f", 18); }
    }
  }
  slide() {
    const M = this.mount; if (this.game.netWait > 0) return; if (M) return M.down(true);
    if (this.onGround) {
      if (!this.sliding) { this.game.sfx.slide(); this.game.ach.event("slide"); }
      this.slideTime = CONFIG.SLIDE_DURATION * (this.game.versus ? 1 : this.game.stat("slideMult"));
    } else { if (!this.fastFall) this.game.ach.event("fastFall"); this.fastFall = true; }
  }
  changeLane(dir) {
    if (this.game.versus || this.game.netWait > 0) return;   // en multijugador cada raptor tiene su carril
    if (this.game.stat("swapLanes")) dir = -dir;   // modo Aleatorio: carriles cruzados
    const target = clamp(this.lane + dir, 0, 1), M = this.mount;
    if (target === this.lane || (M && !M.canChangeLane())) return;
    this.laneTime = M ? M.laneTime : CONFIG.LANE_SWITCH_TIME * (this.game.versus ? 1 : this.game.stat("laneTimeMult"));   // la lluvia lo hace más lento
    this.laneFrom = this.laneT; this.lane = target; this.laneProgress = 0;
    this.game.sfx.lane(); this.game.ach.event("laneChange");
    if (!M) { const g = this.game; g.puff(this.x + 30, this.y, Math.round(this.laneFrom), 7, "#ffffff");   // impulso: polvo y líneas de velocidad
      for (let i = 0; i < 5; i++) g.particles.push(new Particle(Math.round(this.laneFrom), this.x + rand(0, 30), this.y + rand(10, 50), rand(-420, -260), 0, 0.22, "rgba(255,255,255,0.8)", 2, 0)); }
  }
  bounce() {   // rebote al caer sobre un boss (permite volver a hacer doble salto)
    this.vy = 720; this.onGround = false; this.jumps = 1; this.fastFall = false; this.slideTime = 0;
  }
  // Reloj de animación del skin (independiente de los fps)
  tickSkin(dt, worldSpeed) {
    this.tickAcc += dt;
    if (this.tickAcc >= CONFIG.SKIN_TICK) {
      this.tickAcc %= CONFIG.SKIN_TICK;
      this.skinState.tick++; this.advance = true;
      this.skinState.speed = Math.max(1, worldSpeed * CONFIG.SKIN_TICK / CONFIG.RAPTOR_SCALE);   // px nativos por tick
    }
  }
  update(dt) {
    const g = this.game;
    this.prevY = this.y;
    this.anim += dt;
    if (this.laneProgress < 1) {
      this.laneProgress = Math.min(1, this.laneProgress + dt / this.laneTime);
      if (this.laneProgress >= 1 && !this.mount) { g.puff(this.x + 36, Math.max(0, this.y), this.lane, 8, g.level.biome.pal.bandEdge); }   // aterriza en el carril nuevo
      this.laneT = lerp(this.laneFrom, this.lane, easeInOut(this.laneProgress));
    }
    const M = this.mount;
    if (M) { M.update(dt); return; }   // montado: la montura mueve al raptor
    if (!this.onGround) {
      // Planeo: mantener W tras el último salto hace caer despacio (máx. 1,5 s)
      const gliding = !g.versus && g.stat("glide") && this.upHeld && this.vy < 0 && this.jumps >= this.maxJumps && this.glideT < 1.5;
      if (gliding) { this.glideT += dt; this.vy = Math.max(this.vy - CONFIG.GRAVITY * 0.15 * dt, -110); }
      else this.vy -= CONFIG.GRAVITY * (this.fastFall ? CONFIG.FAST_FALL_MULT : 1) * (g.versus ? 1 : g.stat("gravityMult")) * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        const stomp = this.fastFall;
        this.y = 0; this.vy = 0; this.onGround = true; this.jumps = 0; this.glideT = 0;
        if (this.fastFall && this.downHeld) this.slideTime = CONFIG.SLIDE_DURATION;  // S mantenida: aterriza deslizándose
        this.fastFall = false;
        g.puff(this.x + 36, 0, this.logicalLane, 6, g.level.biome.pal.bandEdge);
        if (stomp && this.num === 1) g.onStompLand(this);
      }
    }
    if (this.slideTime > 0) this.slideTime -= dt;
    this.dustTimer -= dt;
    if (this.onGround && this.dustTimer <= 0) {
      this.dustTimer = this.sliding ? 0.03 : 0.12;
      g.particles.push(new Particle(this.logicalLane, this.x + 26, 2, rand(-160, -60), rand(40, 120), 0.35, g.level.biome.pal.bandEdge, rand(2, 4)));
    }
  }
  hitboxes() {
    if (this.mount) return this.mount.hitboxes();
    const x = this.x, y = this.y, S = CONFIG.RAPTOR_SCALE;
    if (this.sliding) return [{ x: x + 20, y, w: 56, h: 20 }];     // agachado: cuerpo aplastado
    // Tres cajas ajustadas al sprite (patas, cuerpo y cabeza); la cola no cuenta. La primera es la de más a la izquierda.
    return [{ x: x + 22, y, w: 22, h: 14 }, { x: x + 28, y: y + 14, w: 22, h: 26 }, { x: x + 38, y: y + 40, w: 28, h: 15 }];
  }
  draw(ctx) {
    const g = this.game, dead = g.state === "over" || this.dead, S = CONFIG.RAPTOR_SCALE, id = this.skinId;
    const roarAnim = g.versus ? this.roarAnim : g.roarAnim, roarWave = g.versus ? this.roarWave : g.roarWave;
    if (this.mount) { this.mount.draw(ctx); this.drawExtras(ctx); return; }
    // Cambio de carril: pequeño salto en arco, estiramiento e inclinación hacia el carril de destino (solo visual)
    const lk = this.laneProgress < 1 ? Math.sin(Math.PI * this.laneProgress) : 0, ldir = Math.sign(this.lane - this.laneFrom) || 0, hop = lk * 12;
    drawShadow(ctx, 36, 54 * (1 - lk * 0.25), this.y + hop);
    const blinking = (g.versus ? this.grace : g.grace) > 0 && !dead && Math.floor(g.grace * 14) % 2 === 0;
    const jumpY = this.y / S, adv = this.advance; this.advance = false;
    ctx.save();
    if (blinking) ctx.globalAlpha = 0.3;
    if (g.effects.turbo > 0) {   // estela de velocidad del turbo (decorativa)
      const frame = jumpY > 0 ? "jump" : this.sliding ? "duck1" : SE.runFrame(id, this.skinState.tick).frame, oy = Math.round(-SE.H - jumpY);
      SE.drawSprite(ctx, id, frame, -5, oy, S, this.skinState.tick, { alpha: 0.25 });
      SE.drawSprite(ctx, id, frame, -10, oy, S, this.skinState.tick, { alpha: 0.12 });
    }
    if (lk > 0 && !dead) { ctx.translate(36, -hop); ctx.rotate(ldir * 0.1 * lk); ctx.scale(1 - 0.06 * lk, 1 + 0.1 * lk); ctx.translate(-36, 0); }
    this.skinState.duck = this.sliding && !dead;   // agachado: pose propia de cada skin (fotogramas duck1/duck2)
    if (roarAnim > 0 && !dead && !this.sliding) {   // pose de rugido (con aura en los skins de rugido especial)
      const k = roarPose(ctx, roarWave && roarWave.style, 1 - roarAnim / 0.6, 40, -(this.y + 34), 1);
      const tilt = roarWave && roarWave.style ? 0.2 : 0.08;
      ctx.translate(30, -this.y); ctx.rotate(-tilt * k); ctx.scale(1 + 0.08 * k, 1 + 0.08 * k); ctx.translate(-30, this.y);
    }
    drawRaptor(ctx, id, this.skinState, jumpY, dead, adv);
    ctx.restore();
    this.drawExtras(ctx);
  }
  drawExtras(ctx) {
    const g = this.game;
    const cy = -(this.y + (this.sliding ? 14 : 30));
    if (g.effects.shield > 0) {
      const rem = g.effects.shield;
      if (rem > 1.5 || Math.floor(rem * 8) % 2 === 0) {
        const r = 46 + Math.sin(g.time * 6) * 2;
        ctx.fillStyle = "rgba(90,170,255,0.16)"; ctx.strokeStyle = "rgba(160,210,255,0.9)"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(38, cy, r * (this.sliding ? 1.2 : 1), r * (this.sliding ? 0.65 : 1), 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillRect(10, cy - 20, 6, 6);
      }
    }
    if (g.versus) {   // etiqueta J1 / J2 sobre la cabeza
      const ty = -(this.y + (this.sliding ? 40 : 82)), col = this.num === 1 ? UI_T.go : UI_T.info;
      ctx.fillStyle = UI_T.line; ctx.fillRect(22, ty - 9, 32, 18); ctx.fillStyle = this.dead ? "#5a5468" : col; ctx.fillRect(24, ty - 7, 28, 14);
      ctx.font = '10px "Raptor Pixel Display", monospace'; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#16111f";
      ctx.fillText(this.dead ? "K.O." : "J" + this.num, 38, ty + 1);
      if (!this.dead) {   // trampa preparada (o carga) junto a la etiqueta
        ctx.fillStyle = UI_T.line; ctx.fillRect(56, ty - 9, 44, 18); ctx.fillStyle = UI_T.panel; ctx.fillRect(58, ty - 7, 40, 14);
        if (this.traps > 0) {
          drawTrapIcon(ctx, TRAP_TYPES[this.nextTrap].id, 66, ty);
          ctx.fillStyle = UI_T.weak; ctx.textAlign = "left"; ctx.fillText("×" + this.traps, 76, ty + 1);
        } else if (this.thrown >= CONFIG.TRAP_TOTAL) { ctx.fillStyle = "#8a8098"; ctx.textAlign = "center"; ctx.fillText("—", 78, ty + 1); }   // ya no le quedan
        else { ctx.fillStyle = "#3a2f50"; ctx.fillRect(60, ty - 2, 36, 4); ctx.fillStyle = UI_T.roar; ctx.fillRect(60, ty - 2, Math.round(36 * this.trapT / CONFIG.TRAP_RECHARGE), 4); }
      }
    }
    if (g.effects.magnet > 0) drawIcon(ctx, "magnet", 38, -(this.y + (this.sliding ? 44 : 84)) + Math.sin(g.time * 5) * 2, 7);
    if (g.netRace && !this.dead && g.state !== "over") {   // online: marca «TÚ» de tu color para no confundirte con los fantasmas
      const ty = -(this.y + (this.sliding ? 50 : 96)) + Math.sin(g.time * 4) * 2, col = g.net.myColor;
      ctx.fillStyle = UI_T.line; ctx.fillRect(24, ty - 9, 28, 16); ctx.fillStyle = col; ctx.fillRect(26, ty - 7, 24, 12);
      ctx.beginPath(); ctx.moveTo(32, ty + 7); ctx.lineTo(44, ty + 7); ctx.lineTo(38, ty + 13); ctx.closePath(); ctx.fill();
      ctx.font = '10px "Raptor Pixel Display", monospace'; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#16111f"; ctx.fillText("TÚ", 38, ty);
    }
  }
}

// =====================================================================
//  BonusEgg: huevo de raptor (2 por nivel). El imán no lo atrae.
// =====================================================================
class BonusEgg {
  constructor(lane, x, y) { this.lane = lane; this.x = x; this.y = y; this.t = Math.random() * 5; this.taken = false; }
  hitbox() { return { x: this.x - 14, y: this.y - 16, w: 28, h: 32 }; }
  update(dt, speed) { this.x -= speed * dt; this.t += dt; }
  draw(ctx) {
    const wob = Math.sin(this.t * 3) * 0.12, pulse = 0.35 + 0.25 * Math.sin(this.t * 5);
    drawShadow(ctx, 0, 24, this.y);
    ctx.save(); ctx.translate(0, -this.y);
    ctx.globalAlpha = pulse; ctx.fillStyle = "#fff6c8";
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.rotate(wob); drawEggPixels(ctx, 0, 0, 3);
    ctx.restore();
  }
}
// Huevo pixel art (centro en x, y). s = tamaño del píxel.
const EGG_ROWS = ["...oooo...", "..ocwwco..", ".occcwcco.", ".ocmcccco.", "occccmccco", "ocmccccmco", "occccccmco", "occmccccco", ".occcccmo.", "..occcco..", "...oooo..."];
const EGG_PAL = { o: "#5a3a1a", c: "#f3e2b8", w: "#fffdf2", m: "#8a5a2a" };
function drawEggPixels(ctx, x, y, s) {
  const ox = x - EGG_ROWS[0].length * s / 2, oy = y - EGG_ROWS.length * s / 2;
  EGG_ROWS.forEach((row, r) => { for (let i = 0; i < row.length; i++) { const col = EGG_PAL[row[i]]; if (col) { ctx.fillStyle = col; ctx.fillRect(ox + i * s, oy + r * s, s + 0.3, s + 0.3); } } });
}

// Huevo abriéndose: la mitad de arriba sale despedida (u = 0…1)
function drawEggHalves(ctx, x, y, u, s) {
  const ox = x - EGG_ROWS[0].length * s / 2, oy = y - EGG_ROWS.length * s / 2, cut = 5;
  ctx.save(); ctx.globalAlpha = clamp(1.4 - u, 0, 1);
  EGG_ROWS.forEach((row, r) => {
    const top = r < cut, dx = top ? -u * 10 * s / 3 : 0, dy = top ? -u * 14 * s / 3 : 0;
    for (let i = 0; i < row.length; i++) { const col = EGG_PAL[row[i]]; if (!col) continue;
      ctx.fillStyle = col; ctx.fillRect(ox + i * s + dx, oy + r * s + dy, s + 0.3, s + 0.3); }
  });
  ctx.fillStyle = "#ffe27a";
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, r = 6 + u * 22; ctx.fillRect(x + Math.cos(a) * r - 1.5, y - 4 + Math.sin(a) * r - 1.5, 3, 3); }
  ctx.restore();
}

// Icono pequeño de cada trampa del multijugador (centro en x, y)
function drawTrapIcon(c, id, x, y) {
  const R = (col, dx, dy, w, h) => { c.fillStyle = col; c.fillRect(Math.round(x + dx), Math.round(y + dy), w, h); };
  if (id === "wall") { R("#1f6b2c", -6, -6, 4, 12); R("#3f9a3c", -5, -5, 2, 10); R("#1f6b2c", 1, -6, 4, 12); R("#3f9a3c", 2, -5, 2, 10); }
  else if (id === "bird") { R("#5e2d73", -6, -2, 12, 4); R("#9b59b6", -4, -1, 8, 2); R("#5e2d73", -2, -6, 4, 4); R("#f5b041", -8, -1, 2, 2); }
  else if (id === "rock") { R("#2a2830", -5, -6, 10, 12); R("#8b9099", -4, -5, 8, 10); R("#b9bec7", -3, -4, 3, 3); }
  else { R("#0e0b16", -6, -4, 12, 8); R("#2a1a4a", -5, -3, 10, 6); R("#6a4aa0", -3, -2, 3, 2); }
}

// =====================================================================
//  RunBuild: mejoras de la partida (roguelike), sinergias, pactos y árbol permanente.
//  Todo el juego lee sus valores con game.stat("clave"): parte del valor base y aplica, en orden,
//  el árbol de mejoras, las mejoras de la partida, las sinergias y los pactos.
// =====================================================================
const STAT_ONE = new Set(["jumpMult", "slideMult", "powerupDurMult", "furyRate", "coinMult", "eggMult", "bossCoinMult", "bossVulnMult",
  "bossHpMult", "mountDurMult", "obstacleFreq", "speedMult", "scoreMult", "unmountedSpeed", "graceMult", "teleMult", "superRoarUses", "airJumps", "gravityMult", "powerupFreq", "laneTimeMult"]);
function statBase(g, k) {
  switch (k) {
    case "roarRange": return CONFIG.ROAR_RANGE;
    case "roarCooldown": return g.mode.roarCooldown;
    case "bossFuryAt": return g.mode.bossFuryAt;
    case "mountChance": return MOUNT_CONFIG.CHANCE;
  }
  return STAT_ONE.has(k) ? 1 : 0;
}
const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));
const PACT_BY_ID = Object.fromEntries(PACTS.map(p => [p.id, p]));
const TREE_NODES = TREE_CONFIG.branches.flatMap(b => b.nodes.map((n, i) => Object.assign(n, { branch: b.id, index: i })));
class RunBuild {
  constructor(game) { this.game = game; this.reset(); }
  reset() {
    this.levels = {}; this.order = []; this.pacts = []; this.synergies = []; this.cache = {};
    this.skipped = 0; this.picks = 0; this.rerolls = 0; this.bossesBeaten = 0; this.forceLegend = false;
    this.used = { secondChance: 0, resurrection: 0, despertar: 0 };
  }
  level(id) { return this.levels[id] || 0; }
  has(id) { return this.level(id) > 0; }
  add(id) {
    this.levels[id] = this.level(id) + 1; this.order.push(id); this.picks++; this.cache = {};
    this.game.onUpgradeAdded(UPGRADE_BY_ID[id]);
    this.checkSynergies();
  }
  addPact(id) { if (!this.pacts.includes(id)) { this.pacts.push(id); this.cache = {}; this.game.onPactAdded(PACT_BY_ID[id]); } }
  synergyReady(s, extra) {   // extra = mejora que se añadiría (para la etiqueta SINERGIA de las cartas)
    return s.need.every(([id, lv]) => this.level(id) + (id === extra ? 1 : 0) >= lv);
  }
  checkSynergies() {
    for (const s of SYNERGIES) if (!this.synergies.includes(s.id) && this.synergyReady(s)) {
      this.synergies.push(s.id); this.cache = {}; this.game.onSynergy(s);
    }
  }
  *sources() {
    const g = this.game, tree = g.save.data.tree || {};
    if (!g.versus && !g.tutorial && !g.netRace) for (const n of TREE_NODES) if (tree[n.id]) yield [n.mod, tree[n.id]];
    for (const id in this.levels) yield [UPGRADE_BY_ID[id].mod, this.levels[id]];
    for (const id of this.synergies) yield [SYNERGIES.find(s => s.id === id).mod, 1];
    for (const id of this.pacts) yield [PACT_BY_ID[id].mod, 1];
    if (g.randomMod && !g.versus) yield [g.randomMod.mod, 1];   // modo Aleatorio: regla del nivel
    if (g.weather && g.weather.active && g.weather.def.mod) yield [g.weather.def.mod, 1];   // clima del bioma
    if (g.netCoop) yield [{ bossHpMult: v => v * (1 + NET_CONFIG.BOSS_HP_PER_PLAYER * (g.net.teamN - 1)) }, 1];   // cooperativo: jefes más duros cuantos más seáis
    if (g.netDraft) yield [{ speedMult: v => v * NET_CONFIG.DRAFT_SPEED }, 1];   // rebufo en la carrera online
  }
  stat(k) {
    if (k in this.cache) return this.cache[k];
    let v = statBase(this.game, k);
    for (const [mod, l] of this.sources()) if (mod[k]) v = mod[k](v, l);
    const C = ROGUE_CONFIG.CAPS;   // topes de equilibrio
    if (k === "roarRange") v = Math.min(v, CONFIG.ROAR_RANGE * C.roarRangeMult);
    else if (k === "bossHpMult") v = Math.max(v, C.bossHpMultMin);
    else if (C[k] != null) v = Math.min(v, C[k]);
    return (this.cache[k] = v);
  }
  // Para el álbum y el historial
  summary() { return { ups: { ...this.levels }, pacts: this.pacts.slice(), syn: this.synergies.slice() }; }
}

// =====================================================================
//  Barra de furia y súper rugido (no se usa durante los combates contra jefes)
// =====================================================================
class FuryMeter {
  constructor(game) { this.game = game; this.reset(); }
  reset(start = 0) { this.v = start * FURY_CONFIG.MAX; this.idle = 0; this.charges = 0; this.flash = 0; this.wasFull = false; }
  get full() { return this.charges > 0; }
  add(n) {
    const g = this.game; if (g.versus || n <= 0) return;
    this.idle = 0;
    if (this.full) return;
    this.v = Math.min(FURY_CONFIG.MAX, this.v + n * g.stat("furyRate"));
    if (this.v >= FURY_CONFIG.MAX) { this.charges = g.stat("superRoarUses"); this.flash = 1; g.sfx.furyFull(); g.ach.event("furyFull"); if (!g.bosses.active) g.tips.show("superRoar"); }
  }
  update(dt) {
    const g = this.game;
    this.flash = Math.max(0, this.flash - dt);
    if (this.full) return;
    this.idle += dt;
    if (this.idle > FURY_CONFIG.DECAY_AFTER && !g.stat("furyNoDecay")) this.v = Math.max(0, this.v - FURY_CONFIG.DECAY_RATE * dt);
  }
  // Consume una carga; devuelve true si había
  use() {
    const g = this.game, b = g.build;
    if (!this.full) return false;
    if (g.stat("despertar") && !b.used.despertar) { b.used.despertar = 1; return true; }   // el primero no vacía la barra
    this.charges--;
    if (this.charges <= 0) { this.v = 0; this.idle = 0; }
    return true;
  }
}

