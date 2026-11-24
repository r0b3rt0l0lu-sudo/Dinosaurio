// =====================================================================
//  Obstacle. Tipos abstractos (iguales en todos los biomas, mismas hitboxes):
//   ground (indestructible), rock (destructible), flyer (destructible), stalactite (glaciar)
//  El "style" depende del bioma en el que aparece.
// =====================================================================
const ROCK_PAL = {
  rock:     ["#4a4d55", "#8b9099", "#b9bec7", "#5b5f68"],
  mossrock: ["#3a4038", "#7c8577", "#a9b3a3", "#4f574b"],
  lavarock: ["#140c0c", "#3a2622", "#5a3a32", "#ff6a1a"],
  icerock:  ["#4f6f88", "#a8c8dc", "#e6f6ff", "#6f93ad"],
  meteor:   ["#20140e", "#5a3a28", "#8a5a3a", "#ff8a2a"],
};
const STYLE_COLORS = {
  cactus: ["#3f9a3c", "#1f6b2c", "#6cc25a"], log: ["#7a4f2a", "#3b2412", "#c89a5c"],
  obsidian: ["#2e1f3a", "#ff6a1a", "#120a18"], iceblock: ["#a8def5", "#eaffff", "#5fa8d0"],
  crystal: ["#9a6cf0", "#e6d6ff", "#3a1f6a"], neon: ["#ff4fd8", "#3ff0ff", "#3a3f55"],
  rock: ROCK_PAL.rock, mossrock: [...ROCK_PAL.mossrock, "#4f9a3a"], lavarock: ROCK_PAL.lavarock,
  icerock: ROCK_PAL.icerock, meteor: ROCK_PAL.meteor, crate: ["#6a6f7e", "#ffcc00", "#2c2f3a"],
  ptero: ["#9b59b6", "#5e2d73", "#f5b041"], drone: ["#8a93a6", "#2c2f3a", "#ff3b5c"],
  stalactite: ["#bfe8ff", "#ffffff", "#6fb0d8"],
  fish: ["#ff9a2e", "#ffe14d", "#7a3a10"], tomb: ["#7a7e8a", "#b4b8c2", "#3a3e4a"],
};

class Obstacle {
  constructor(kind, lane, x, opts, biome) {
    this.kind = kind; this.lane = lane; this.x = x; this.dead = false; this.t = Math.random() * 10; this.extra = 0; this.fall = 0;
    const ob = biome.obstacles;
    if (kind === "ground") {
      const d = GROUND_SIZES[opts.size];
      this.style = ob.ground; this.count = opts.count || 1; this.pw = d.w;
      this.w = d.w * this.count + 4 * (this.count - 1); this.h = d.h; this.y = 0;
    } else if (kind === "rock") {
      const d = ROCK_SIZES[opts.size];
      this.style = ob.rock; this.size = opts.size; this.w = d.w; this.h = d.h; this.y = 0;
      const r = seededRandom(randInt(1, 1e6)), n = opts.size === "tall" ? 6 : 3;
      this.bands = Array.from({ length: n }, (_, i) => {
        const narrow = i === 0 ? 0.2 : i === 1 ? 0.08 : 0;
        return { l: narrow + r() * 0.06, r: 1 - narrow - r() * 0.06, top: i / n };
      });
      this.cracks = Array.from({ length: n + 1 }, () => ({ x: 0.2 + r() * 0.6, y: r(), len: 6 + r() * 10 }));
      this.falling = this.style === "meteor" && opts.size === "small";   // los meteoritos caen del cielo
      this.fall = this.falling ? 1 : 0;
    } else if (kind === "flyer") {
      this.style = ob.flyer; this.w = 66; this.h = 36; this.y = FLYER_HEIGHTS[opts.h];
      this.diver = !!opts.diver; this.phase = rand(0, Math.PI * 2);
    } else {   // stalactite: cuelga desde arriba hasta la altura de un pájaro medio
      this.style = "stalactite"; this.w = 36; this.h = 218; this.y = 42;
    }
  }
  get destructible() { return this.kind === "rock" || this.kind === "flyer"; }
  get colors() { return STYLE_COLORS[this.style] || ["#ffffff"]; }
  hitbox() {
    switch (this.kind) {
      case "flyer":  return { x: this.x + 4, y: this.y + 8, w: 54, h: 15 };
      case "ground": return { x: this.x + 3, y: 0, w: this.w - 6, h: this.h - 4 };
      case "rock":   return { x: this.x + 4, y: this.fall * 280, w: this.w - 8, h: this.h - 4 };
      default:       return { x: this.x + 8, y: 44, w: this.w - 16, h: 216 };
    }
  }
  update(dt, speed, game) {
    this.x -= (speed + this.extra) * dt;
    this.t += dt;
    if (this.diver) this.y = FLYER_HEIGHTS.mid + (FLYER_HEIGHTS.high - FLYER_HEIGHTS.mid) * (0.5 + 0.5 * Math.sin(this.t * 2.6 + this.phase));
    if (this.falling) {
      this.fall = clamp((this.x - 620) / 420, 0, 1);
      if (this.fall === 0) {
        this.falling = false;
        for (let i = 0; i < 12; i++) game.particles.push(new Particle(this.lane, this.x + rand(0, this.w), 4, rand(-200, 200), rand(100, 300), 0.6, choice(["#ff8a2a", "#5a3a28", "#ffd05a"]), rand(2, 5)));
      }
    }
  }
  draw(ctx) {
    switch (this.kind) {
      case "flyer":
        drawShadow(ctx, 30, 40, this.y + 60);
        if (this.style === "drone") this.drawDrone(ctx);
        else if (this.style === "fish") this.drawFish(ctx);
        else { const spr = BIRD_SPR[Math.floor(this.t * 7) % 2]; drawSkinSprite(ctx, spr, 0, -this.y - spr.h, 0); }
        break;
      case "ground":
        drawShadow(ctx, this.w / 2, this.w + 10, 0);
        for (let i = 0; i < this.count; i++) this.drawGround(ctx, i * (this.pw + 4), -this.h, this.pw, this.h);
        break;
      case "rock":
        if (this.fall > 0) {
          const fx = this.fall * 160, fy = this.fall * 280;
          for (let i = 1; i < 7; i++) {
            ctx.globalAlpha = 0.5 - i * 0.06; ctx.fillStyle = i < 3 ? "#ffd05a" : "#ff6a1a";
            ctx.fillRect(fx + this.w / 2 + i * 12, -fy - this.h / 2 - i * 20, 14 - i, 14 - i);
          }
          ctx.globalAlpha = 1; ctx.save(); ctx.translate(fx, -fy); this.drawRock(ctx); ctx.restore();
        } else { drawShadow(ctx, this.w / 2, this.w + 12, 0); this.drawRock(ctx); }
        break;
      default: this.drawStalactite(ctx);
    }
  }
  drawGround(ctx, x, top, w, h) {
    switch (this.style) {
      case "cactus": return drawCactus(ctx, x, top, w, h);
      case "log": return drawLog(ctx, x, top, w, h);
      case "obsidian":
        drawSpike(ctx, x, top, w, h, "#120a18", "#2e1f3a", "#4a3560", 0.3);
        ctx.fillStyle = `rgba(255,106,26,${0.6 + 0.4 * Math.sin(this.t * 5)})`;
        for (let yy = top + 10, i = 0; yy < -4; yy += 6, i++) ctx.fillRect(x + w / 2 + (i % 2 ? -2 : 0), yy, 2, 6);
        return;
      case "iceblock": return drawIceBlock(ctx, x, top, w, h);
      case "crystal":
        drawSpike(ctx, x, top + h * 0.4, w * 0.45, h * 0.6, "#2a1450", "#7a4fd6", "#c9b0ff", 0.3);
        drawSpike(ctx, x + w * 0.55, top + h * 0.3, w * 0.45, h * 0.7, "#2a1450", "#7a4fd6", "#c9b0ff", 0.3);
        drawSpike(ctx, x + w * 0.2, top, w * 0.6, h, "#2a1450", "#9a6cf0", "#e6d6ff", 0.25);
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(this.t * 4)})`; ctx.fillRect(x + w / 2 - 1, top + 4, 2, 2);
        return;
      case "neon": return drawNeon(ctx, x, top, w, h, this.t);
      case "tomb": return drawTomb(ctx, x, top, w, h);
    }
  }
  drawRock(ctx) {
    if (this.style === "crate") return drawCrate(ctx, this.w, this.h);
    const [dark, mid, light, crack] = ROCK_PAL[this.style];
    const n = this.bands.length, bh = this.h / n;
    const band = b => [this.w * b.l, -this.h + b.top * this.h, this.w * (b.r - b.l), bh + 1];
    ctx.fillStyle = dark; for (const b of this.bands) { const [x, y, w, h] = band(b); ctx.fillRect(x - 2, y - 2, w + 4, h + 2); }
    ctx.fillStyle = mid;  for (const b of this.bands) { const [x, y, w, h] = band(b); ctx.fillRect(x, y, w, h); }
    ctx.fillStyle = light; for (const b of this.bands) { const [x, y, , h] = band(b); ctx.fillRect(x + 2, y + 2, 4, h - 4); }
    if (this.style === "mossrock") { const [x, y, w] = band(this.bands[0]); ctx.fillStyle = "#4f9a3a"; ctx.fillRect(x - 2, y - 3, w + 4, 5); ctx.fillRect(x + 4, y + 2, 4, 6); }
    const glow = this.style === "lavarock" || this.style === "meteor";
    ctx.fillStyle = glow ? `rgb(255,${120 + Math.floor(60 * Math.sin(this.t * 6))},30)` : crack;
    for (const c of this.cracks) {
      const cx = Math.round(this.w * c.x), cy = Math.round(-this.h + 6 + c.y * (this.h - 12));
      ctx.fillRect(cx, cy, 2, c.len * 0.5); ctx.fillRect(cx + 2, cy + c.len * 0.5, 2, c.len * 0.5);
    }
  }
  drawDrone(ctx) {
    const top = -this.y - this.h, r = Math.abs(Math.sin(this.t * 40)), wr = 4 + 20 * r;
    ctx.fillStyle = "#1a1c28"; ctx.fillRect(4, top + 8, 58, 4); ctx.fillRect(9, top + 5, 3, 5); ctx.fillRect(54, top + 5, 3, 5);
    ctx.fillStyle = "#bfc6d4"; ctx.fillRect(10.5 - wr / 2, top + 3, wr, 2); ctx.fillRect(55.5 - wr / 2, top + 3, wr, 2);
    ctx.fillStyle = "#2c2f3a"; ctx.fillRect(14, top + 12, 38, 16);
    ctx.fillStyle = "#8a93a6"; ctx.fillRect(16, top + 14, 34, 12);
    ctx.fillStyle = "#c9d0dc"; ctx.fillRect(16, top + 14, 34, 3);
    ctx.fillStyle = mod(this.t * 3, 1) < 0.5 ? "#ff3b5c" : "#7a1020"; ctx.fillRect(18, top + 19, 8, 5);
    ctx.fillStyle = "#3ff0ff"; ctx.fillRect(28, top + 28, 10, 2);
  }
  drawFish(ctx) {
    const top = -this.y - this.h, f = Math.sin(this.t * 12) * 3, R = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x, top + y, w, h); };
    R("#7a3a10", 4, 6, 50, 26); R("#ff9a2e", 6, 8, 46, 22); R("#ffe14d", 10, 22, 36, 6);
    R("#7a3a10", 50, 4 + f, 16, 30 - 2 * f); R("#ff9a2e", 52, 6 + f, 12, 26 - 2 * f);
    R("#ffffff", 12, 12, 8, 8); R("#15161c", 13, 14, 4, 5); R("#7a3a10", 4, 20, 6, 3);
    R("#ffffff", 24, 10, 3, 18); R("#ffffff", 36, 10, 3, 18);
  }
  drawStalactite(ctx) {
    const w = this.w, top = -262, tip = -42, steps = 12, len = tip - top, sh = len / steps;
    ctx.fillStyle = "#6fb0d8"; ctx.fillRect(-12, top - 10, w + 24, 12);
    ctx.fillStyle = "#e8f7ff"; ctx.fillRect(-10, top - 8, w + 20, 8);
    const band = i => { const bw = w * (1 - i / steps * 0.85); return [(w - bw) / 2, top + i * sh, bw, sh + 1]; };
    ctx.fillStyle = "#6fb0d8"; for (let i = 0; i < steps; i++) { const [x, y, bw, h] = band(i); ctx.fillRect(x - 2, y, bw + 4, h + (i === steps - 1 ? 2 : 0)); }
    ctx.fillStyle = "#cdeeff"; for (let i = 0; i < steps; i++) { const [x, y, bw, h] = band(i); ctx.fillRect(x, y, bw, h); }
    ctx.fillStyle = "#ffffff"; for (let i = 0; i < steps - 2; i++) { const [x, y, , h] = band(i); ctx.fillRect(x + 2, y, 3, h); }
    if (mod(this.t, 1.5) < 0.8) { ctx.fillStyle = "#bfe8ff"; ctx.fillRect(w / 2 - 1, tip + 4 + mod(this.t, 1.5) * 20, 2, 3); }
  }
}

// Dibujo de piezas de obstáculos (coordenadas locales, suelo en y = 0)
function drawTomb(ctx, x, top, w, h) {
  const R = (col, xx, yy, ww, hh) => { ctx.fillStyle = col; ctx.fillRect(Math.round(xx), Math.round(yy), Math.round(ww), Math.round(hh)); };
  R("#3a3e4a", x - 2, top + 8, w + 4, h - 6); R("#3a3e4a", x + 4, top + 2, w - 8, 8);
  R("#7a7e8a", x, top + 10, w, h - 10); R("#7a7e8a", x + 6, top + 4, w - 12, 8); R("#b4b8c2", x + 3, top + 12, 4, h - 16);
  R("#3a3e4a", x + w / 2 - 2, top + 16, 4, 16); R("#3a3e4a", x + w / 2 - 7, top + 21, 14, 4);
  R("#4f7a3a", x - 3, -4, w + 6, 4);
}
function drawCactus(ctx, x, top, w, h) {
  const u = 2, R = v => Math.round(v / u) * u;
  const tw = R(w * 0.42), tx = x + R((w - tw) / 2), armW = R(w * 0.22);
  const la = top + R(h * 0.34), lh = R(h * 0.28), ra = top + R(h * 0.2), rh = R(h * 0.26);
  const parts = [
    [tx, top, tw, h],
    [x, la, armW, lh], [x, la + lh - armW, tx - x + u, armW],
    [x + w - armW, ra, armW, rh], [tx + tw - u, ra + rh - armW, x + w - armW - (tx + tw) + 2 * u, armW],
  ];
  ctx.fillStyle = "#1f6b2c"; for (const p of parts) ctx.fillRect(p[0] - u, p[1] - u, p[2] + 2 * u, p[3] + 2 * u);
  ctx.fillStyle = "#3f9a3c"; for (const p of parts) ctx.fillRect(p[0], p[1], p[2], p[3]);
  ctx.fillStyle = "#6cc25a"; ctx.fillRect(tx + u, top + 2 * u, u, h - 4 * u);
  ctx.fillStyle = "#1f6b2c";
  for (let yy = top + 8; yy < -6; yy += 12) { ctx.fillRect(tx + tw - 2 * u, yy, u, u); ctx.fillRect(tx - u, yy + 6, u, u); }
}
function drawLog(ctx, x, top, w, h) {
  ctx.fillStyle = "#3b2412"; ctx.fillRect(x - 2, top - 2, w + 4, h + 2);
  ctx.fillStyle = "#7a4f2a"; ctx.fillRect(x, top, w, h);
  ctx.fillStyle = "#5a3718"; for (let i = 4; i < w - 2; i += 6) ctx.fillRect(x + i, top + 7, 2, h - 9);
  ctx.fillStyle = "#c89a5c"; ctx.fillRect(x + 2, top, w - 4, 5);
  ctx.fillStyle = "#9a6c3a"; ctx.fillRect(x + Math.round(w / 2) - 3, top + 1, 6, 3);
  ctx.fillStyle = "#4f9a3a"; ctx.fillRect(x - 2, top + 5, 6, 4); ctx.fillRect(x + w - 5, top + Math.round(h * 0.45), 7, 3);
  ctx.fillStyle = "#3b2412"; ctx.fillRect(x - 5, -4, 6, 4); ctx.fillRect(x + w - 1, -4, 6, 4);
}
function drawSpike(ctx, x, top, w, h, outline, fill, hi, minFrac) {
  const steps = Math.max(3, Math.round(h / 8)), bh = h / steps;
  const band = i => { const bw = Math.max(2, w * (minFrac + (1 - minFrac) * (i + 1) / steps)); return [x + (w - bw) / 2, top + i * bh, bw, bh + 1]; };
  ctx.fillStyle = outline; for (let i = 0; i < steps; i++) { const [bx, by, bw, b] = band(i); ctx.fillRect(bx - 2, by - 1, bw + 4, b + 1); }
  ctx.fillStyle = fill;    for (let i = 0; i < steps; i++) { const [bx, by, bw, b] = band(i); ctx.fillRect(bx, by, bw, b); }
  ctx.fillStyle = hi;      for (let i = 0; i < steps; i++) { const [bx, by, bw, b] = band(i); ctx.fillRect(bx + 1, by, Math.max(1, bw * 0.2), b); }
}
function drawIceBlock(ctx, x, top, w, h) {
  const n = Math.max(1, Math.round(h / w)), bh = h / n;
  for (let i = 0; i < n; i++) {
    const by = top + i * bh;
    ctx.fillStyle = "#5fa8d0"; ctx.fillRect(x - 2, by - 2, w + 4, bh + 2);
    ctx.fillStyle = "#a8def5"; ctx.fillRect(x, by, w, bh - 1);
    ctx.fillStyle = "#eaffff"; ctx.fillRect(x + 2, by + 2, w - 8, 3); ctx.fillRect(x + 2, by + 2, 3, bh - 8);
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fillRect(x + w - 9, by + 6, 3, 3);
  }
}
function drawNeon(ctx, x, top, w, h, t) {
  ctx.fillStyle = "#1a1c28"; ctx.fillRect(x - 1, top - 1, 6, h + 1); ctx.fillRect(x + w - 5, top - 1, 6, h + 1);
  ctx.fillStyle = "#3a3f55"; ctx.fillRect(x, top, 4, h); ctx.fillRect(x + w - 4, top, 4, h);
  for (let yy = top + 5, i = 0; yy < -6; yy += 12, i++) {
    const col = i % 2 ? "#3ff0ff" : "#ff4fd8";
    ctx.globalAlpha = 0.3 * (0.7 + 0.3 * Math.sin(t * 8 + i)); ctx.fillStyle = col; ctx.fillRect(x + 1, yy - 3, w - 2, 9);
    ctx.globalAlpha = 1; ctx.fillRect(x + 4, yy, w - 8, 3);
  }
  ctx.fillStyle = mod(t * 2, 1) < 0.5 ? "#ff3b3b" : "#5a1010"; ctx.fillRect(x, top - 4, 4, 3); ctx.fillRect(x + w - 4, top - 4, 4, 3);
}
function drawCrate(ctx, w, h) {
  const n = h > 60 ? 3 : 1, ch = h / n;
  for (let i = 0; i < n; i++) {
    const cy = -h + i * ch;
    ctx.fillStyle = "#2c2f3a"; ctx.fillRect(-1, cy - 1, w + 2, ch + 1);
    ctx.fillStyle = "#6a6f7e"; ctx.fillRect(2, cy + 2, w - 4, ch - 3);
    ctx.fillStyle = "#ffcc00"; ctx.fillRect(2, cy + ch / 2 - 3, w - 4, 6);
    ctx.fillStyle = "#1a1a1a"; for (let sx = 4; sx < w - 5; sx += 8) ctx.fillRect(sx, cy + ch / 2 - 3, 3, 6);
    ctx.fillStyle = "#b9bec7"; ctx.fillRect(4, cy + 4, 2, 2); ctx.fillRect(w - 6, cy + 4, 2, 2); ctx.fillRect(4, cy + ch - 6, 2, 2); ctx.fillRect(w - 6, cy + ch - 6, 2, 2);
  }
}

// =====================================================================
//  Coin y PowerUp
// =====================================================================
class Coin {
  constructor(lane, x, y) { this.lane = lane; this.laneT = lane; this.x = x; this.y = y; this.t = Math.random() * 6; this.taken = false; this.magnet = false; }
  hitbox() { return { x: this.x - 11, y: this.y - 11, w: 22, h: 22 }; }
  update(dt, speed, game) {
    this.t += dt;
    if (this.magnet) {
      const p = game.player.center, dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
      const v = Math.min(d / Math.max(dt, 1e-4), 950);
      this.x += dx / d * v * dt; this.y += dy / d * v * dt;
      this.laneT = lerp(this.laneT, game.player.laneT, Math.min(1, dt * 12));
    } else this.x -= speed * dt;
  }
  draw(ctx) {
    const r = 9, sx = Math.abs(Math.cos(this.t * 4));
    ctx.fillStyle = "#f7c948"; ctx.strokeStyle = "#b7791f"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -this.y, Math.max(1.5, r * sx), r, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (sx > 0.4) { ctx.fillStyle = "#fff3b0"; ctx.fillRect(-1, -this.y - 5, 2, 10); }
  }
}

class PowerUp {
  constructor(type, lane, x) { this.type = type; this.lane = lane; this.x = x; this.y = 34; this.t = 0; this.taken = false; }
  get bob() { return Math.sin(this.t * 4) * 4; }
  hitbox() { return { x: this.x - 16, y: this.y + this.bob - 16, w: 32, h: 32 }; }
  update(dt, speed) { this.x -= speed * dt; this.t += dt; }
  draw(ctx) {
    const cy = -(this.y + this.bob), col = POWERUPS[this.type].color;
    drawShadow(ctx, 0, 26, this.y + 20);
    ctx.globalAlpha = 0.3 + 0.15 * Math.sin(this.t * 8); ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, cy, 22, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, cy, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    drawIcon(ctx, this.type, 0, cy, 9);
  }
}

// =====================================================================
//  Patrones de obstáculos.
//  t = segundos entre la llegada al dino de cada elemento (se respeta también
//  con pájaros rápidos). A/B = carriles aleatorios. lvl = nivel mínimo.
//  El comentario de cada patrón indica al menos una forma de superarlo.
// =====================================================================
const G = (t, lane, size, count = 1) => ({ t, lane, o: "ground", size, count });
const R = (t, lane, size) => ({ t, lane, o: "rock", size });
const F = (t, lane, h, extra = {}) => ({ t, lane, o: "flyer", h, ...extra });
const S = (t, lane) => ({ t, lane, o: "stalactite" });
const ARC = (t, lane) => ({ t, lane, c: "arc" });
const LINE = (t, lane, n) => ({ t, lane, c: "line", n });

const PATTERNS = [
  // Nivel 1
  { lvl: 1, w: 3, build: A => [G(0, A, "small"), ARC(0, A)] },                          // saltar
  { lvl: 1, w: 2, build: A => [G(0, A, "big")] },                                       // saltar
  { lvl: 1, w: 2, build: A => [R(0, A, "small"), ARC(0, A)] },                          // saltar o rugir
  { lvl: 1, w: 1, build: A => [G(0, A, "small", randInt(2, 3))] },                      // salto largo
  { lvl: 1, w: 2, build: A => [F(0, A, choice(["low", "mid"]))] },                      // saltar (bajo), deslizarse (medio) o rugir
  { lvl: 1, w: 1, build: A => [F(0, A, "high"), LINE(-0.1, A, 4)] },                    // seguir sin saltar
  // Nivel 2
  { lvl: 2, w: 2, build: A => [G(0, A, "small"), G(0.85, A, "big")] },                  // dos saltos
  { lvl: 2, w: 3, build: A => [G(0, A, "small"), F(0.95, A, "mid")] },                  // saltar y luego deslizarse
  { lvl: 2, w: 3, build: (A, B) => [G(0, A, "tall", 2), F(0, A, "wall"), LINE(-0.1, B, 6)] }, // muro: cambiar de carril
  { lvl: 2, w: 2, build: A => [R(0, A, "tall")] },                                      // salto preciso, doble salto o rugido
  { lvl: 2, w: 2, build: A => [R(0, A, "small"), F(0.9, A, "low")] },                   // dos saltos o rugido
  // Nivel 3: obstáculos simultáneos en ambos carriles
  { lvl: 3, w: 2, build: (A, B) => [G(0, A, "big"), G(0, B, "small", 2)] },             // saltar en cualquiera
  { lvl: 3, w: 3, build: (A, B) => [G(0, A, "big"), F(0, B, "mid")] },                  // saltar (A) o deslizarse (B)
  { lvl: 3, w: 2, build: () => [F(0, 0, "mid"), F(0, 1, "mid")] },                      // deslizarse
  { lvl: 3, w: 2, build: (A, B) => [R(0, A, "tall"), G(0, B, "big")] },                 // rugir (A) o saltar (B)
  { lvl: 3, w: 3, build: (A, B) => [G(0, A, "tall", 2), F(0, A, "wall"), G(0, B, "small"), F(0.95, B, "mid")] }, // carril B: saltar y deslizarse
  { lvl: 3, w: 2, build: (A, B) => [R(0, A, "tall"), F(0, B, "low"), G(0.9, B, "big")] }, // rugir (A) o dos saltos (B)
  // Nivel 4: pájaros rápidos o que cambian de altura (entre medio y alto)
  { lvl: 4, w: 2, build: A => [F(0, A, choice(["low", "mid"]), { fast: true })] },     // igual que el normal, con menos tiempo
  { lvl: 4, w: 3, build: A => [F(0, A, "mid", { diver: true })] },                      // deslizarse siempre funciona
  { lvl: 4, w: 2, build: (A, B) => [F(0, A, "mid", { diver: true }), G(0, B, "big")] }, // deslizarse (A) o saltar (B)
  { lvl: 4, w: 2, build: () => [F(0, 0, "mid", { fast: true }), F(0, 1, "mid", { fast: true })] }, // deslizarse
  { lvl: 4, w: 2, build: (A, B) => [G(0, A, "small"), F(1.0, A, "mid", { fast: true }), R(0, B, "small"), F(0.9, B, "low", { fast: true })] }, // A: saltar+deslizarse, B: dos saltos o rugido
  // Especiales del glaciar: estalactitas colgantes (indestructibles)
  { lvl: 1, w: 3, biome: "glacier", build: A => [S(0, A)] },                            // deslizarse o cambiar de carril
  { lvl: 1, w: 2, biome: "glacier", build: A => [S(0, A), G(0.95, A, "small")] },       // deslizarse y luego saltar
  { lvl: 3, w: 2, biome: "glacier", build: (A, B) => [S(0, A), G(0, B, "big")] },       // deslizarse (A) o saltar (B)
];


// Patrones que se pueden superar sin cambiar de carril (los únicos del multijugador)
const _solo = new Map();
function soloPattern(p) {
  if (!_solo.has(p)) _solo.set(p, p.build(0, 1).every(it => it.lane === 0 && it.h !== "wall"));
  return _solo.get(p);
}
class Spawner {
  constructor(game) { this.game = game; this.reset(); }
  reset() { this.nextAt = CONFIG.FIRST_SPAWN_DISTANCE; this.last = null; this.plans = {}; }
  update() {
    const g = this.game;
    if (g.distance + (SPAWN_X - PLAYER_X) > g.level.portalAt() - CONFIG.PORTAL_CLEAR && g.distance < g.level.portalAt()) return;   // camino libre hasta el portal
    if (g.distance < this.nextAt) return;
    if (!g.versus && !g.tutorial) {   // montura: icono en el camino o generador propio de la montura
      const n = g.mounts.spawnHook() || g.rogue.spawnHook();   // altar de ámbar: igual que el icono de montura
      if (n > 0) { this.nextAt = g.distance + n; return; }
    }
    this.spawnPattern();
  }
  // Plan de huevos de un nivel: uno en cada tramo de CONFIG.EGG_WINDOWS
  plan(lvl = this.game.level.level) {
    return this.plans[lvl] || (this.plans[lvl] = { level: lvl, spawned: 0, at: CONFIG.EGG_WINDOWS.slice(0, CONFIG.EGGS_PER_LEVEL).map(([a, b]) => rand(a, b) * CONFIG.POINTS_PER_LEVEL) });
  }
  spawnPattern() {
    const g = this.game, L = g.level, biome = L.biome;
    let pool = PATTERNS.filter(p => g.mode.patternLevel(p) <= L.level && (!p.biome || p.biome === (biome.patternBiome || biome.id)) && (!g.versus || soloPattern(p)));
    const M = g.mounts.active;
    if (M) { const mp = pool.filter(p => M.allowPattern(p)); if (mp.length) pool = mp; }
    if (pool.length > 1) pool = pool.filter(p => p !== this.last);
    // Los patrones más avanzados pesan más cuando están disponibles
    const weights = pool.map(p => p.w * (1 + 0.35 * (p.lvl - 1)) * (p.biome ? 1.5 : 1));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0), p = pool[0];
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { p = pool[i]; break; } }
    this.last = p;

    const A = Math.random() < 0.5 ? 0 : 1, B = 1 - A, sp = g.speed;
    const travel = (SPAWN_X - PLAYER_X) / sp;   // s que tarda el suelo en llegar al raptor
    let end = 0;
    const placed = [];
    let items = p.build(A, B);
    // Multijugador: los dos carriles reciben exactamente los mismos obstáculos y monedas
    if (g.versus) items = items.flatMap(it => [{ ...it, lane: 0 }, { ...it, lane: 1 }]);
    for (const it of items) {
      const x = SPAWN_X + it.t * sp;
      if (it.o) {
        const o = new Obstacle(it.o, it.lane, x, it, biome);
        if (o.kind === "flyer") {
          // Los pájaros vuelan más rápido: se colocan para que lleguen justo en el tiempo t del patrón
          o.extra = L.flyerExtra(it.fast);
          o.x = PLAYER_X + (sp + o.extra) * (travel + it.t);
        }
        g.obstacles.push(o); placed.push({ o, it, x }); end = Math.max(end, it.t * sp + o.w);
      } else if (it.c === "arc") {
        if (Math.random() < CONFIG.COIN_ARC_CHANCE)
          for (let i = -2; i <= 2; i++) g.coinsArr.push(new Coin(it.lane, x + 16 + i * 30, 70 + (1 - (i * i) / 5) * 70));
      } else if (it.c === "line") {
        for (let i = 0; i < it.n; i++) g.coinsArr.push(new Coin(it.lane, x + i * 34, 22));
        end = Math.max(end, it.t * sp + it.n * 34);
      }
    }
    if (!g.versus) this.tryEgg(placed, A, B, sp);
    const gapS = L.gapSeconds() * g.mode.gapMult * (M ? M.gapMult() : 1) / (g.versus ? 1 : g.stat("obstacleFreq"));
    const gap = (gapS + Math.random() * CONFIG.GAP_RANDOM * (gapS / CONFIG.GAP_START)) * sp;
    this.nextAt = g.distance + end + gap;

    // Extras en el hueco hasta el siguiente patrón (zona libre de obstáculos)
    const midX = SPAWN_X + end + gap * 0.5;
    let puLane = -1;
    if (!g.versus && g.distScore >= CONFIG.POWERUP_MIN_SCORE && Math.random() < Math.min(0.6, L.powerupChance() * g.mode.powerupChanceMult * (g.versus ? 1 : g.stat("powerupFreq")))) {
      const types = POWERUP_TYPES.filter(t => g.effects[t] <= 0 && !g.powerups.some(pu => pu.type === t) && !(t === "shield" && g.stat("noShieldPowerup")));
      if (types.length) { puLane = randInt(0, 1); g.powerups.push(new PowerUp(choice(types), puLane, midX)); }
    }
    const coinChance = CONFIG.COIN_LINE_CHANCE + (biome.id === "night" ? CONFIG.NIGHT_COIN_BONUS : 0);   // la Noche tiene más monedas
    if (gap > 220 && Math.random() < coinChance) {
      const lane = puLane >= 0 ? 1 - puLane : randInt(0, 1);
      const n = Math.min(CONFIG.COIN_LINE_MAX, Math.floor(gap * 0.6 / 34));
      for (const l of g.versus ? [0, 1] : [lane]) for (let i = 0; i < n; i++) g.coinsArr.push(new Coin(l, midX - n * 17 + i * 34, 22));
    }
  }
  // Huevos bonus en sitios que exigen habilidad: encima de un obstáculo (hace falta doble salto)
  // o en el otro carril justo después de un obstáculo (hay que cambiar de carril a tiempo).
  tryEgg(placed, A, B, sp) {
    const g = this.game, cur = g.level.level;
    if (g.bosses.active || !placed.length) return;
    // Si un boss largo ha ocupado el final del nivel anterior, su huevo pendiente sale ahora (sigue contando para ese nivel)
    let plan = null;
    for (const l of [cur - 1, cur]) {
      const p = l === cur ? this.plan(l) : this.plans[l];
      if (p && p.spawned < p.at.length && g.distScore - (l - 1) * CONFIG.POINTS_PER_LEVEL >= p.at[p.spawned]) { plan = p; break; }
    }
    if (!plan) return;
    const blocked = new Set(placed.filter(q => q.it.h === "wall" || q.o.kind === "stalactite" || q.it.diver).map(q => q.o.lane));
    const options = [];
    const base = placed.find(q => (q.o.kind === "ground" || q.o.kind === "rock") && !blocked.has(q.o.lane));
    if (base) options.push(() => new BonusEgg(base.o.lane, base.x + base.o.w / 2, 250));
    const lanes = new Set(placed.map(q => q.o.lane));
    if (lanes.size === 1) { const first = placed[0]; options.push(() => new BonusEgg(1 - first.o.lane, first.x + first.o.w + 0.35 * sp, 30)); }
    if (!options.length) return;
    const egg = choice(options)(); egg.level = plan.level;
    g.eggs.push(egg); plan.spawned++;
  }
}

// =====================================================================
//  LevelManager: nivel, bioma actual, fundido y parámetros de dificultad.
//  Durante un boss el cambio de nivel espera.
// =====================================================================
class LevelManager {
  constructor(game) {
    this.game = game;
    this.biomes = BIOMES.map((d, i) => new Biome(d, i));
    this.biomes.push(new Biome(SECRET_BIOME, BIOMES.length));   // índice 10: nivel secreto
    this.cur = 0; this.prev = 0; this.fade = 1;
    this.reset();
  }
  reset() { this.level = 1; this.banner = 0; this.bannerSub = ""; this.portal = null; this.warp = 0; this.setBiome(0); }
  get biome() { return this.biomes[this.cur]; }
  setBiome(i) { if (i === this.cur) return; this.prev = this.cur; this.cur = i; this.fade = 0; }
  jumpTo(level) { this.portal = null; this.warp = 0; this.level = level; this.setBiome((level - 1) % BIOMES.length); this.fade = 1; }   // checkpoints
  // Final del nivel en px de recorrido
  get boundary() { return this.level * CONFIG.POINTS_PER_LEVEL * CONFIG.PX_PER_POINT; }
  // Dónde está (o estará) el portal: el generador deja libre el tramo anterior
  portalAt() { return this.portal ? this.portal.at : this.boundary; }
  // Al acercarse el final del nivel aparece un portal; el nivel cambia cuando el raptor lo cruza.
  // (Si un boss largo ha pasado del límite, el portal sale delante en cuanto termina la pelea.)
  check() {
    const g = this.game;
    if (!this.portal && g.distance + CONFIG.PORTAL_SHOW_DISTANCE >= this.boundary)
      this.portal = { at: Math.max(this.boundary, g.distance + CONFIG.PORTAL_MIN_AHEAD), next: this.level === SECRET_CONFIG.LEVEL - 1 && g.secretOk() ? BIOMES.length : this.level % BIOMES.length };
    if (this.portal && g.distance >= this.portal.at) {
      this.portal = null;
      const eggs = g.onLevelComplete(this.level);
      this.level++;
      const secret = this.level === SECRET_CONFIG.LEVEL && g.secretOk();   // camino perfecto: portal dorado al nivel secreto
      if (secret) g.run.secret = true;
      this.setBiome(secret ? BIOMES.length : (this.level - 1) % BIOMES.length);   // tras el último bioma vuelve a empezar el ciclo
      this.warp = CONFIG.PORTAL_WARP_TIME;
      this.banner = CONFIG.LEVEL_BANNER_TIME; this.bannerSub = g.versus ? "¡Más rápido!" : `Huevos del nivel ${this.level - 1}: ${eggs}/${CONFIG.EGGS_PER_LEVEL}`;
      if (secret) { this.bannerSub = "¡NIVEL SECRETO! Has completado los 10 niveles sin morir"; g.flashT = 0.6; g.sfx.jackpot(); g.bossBanner = null; }
      g.sfx.levelUp(); g.sfx.portal(); g.addShake(0.3, 5); g.ach.event("levelReached", { level: this.level, secret });
      g.mounts.dismount("time"); g.mounts.hazards = [];   // la montura se queda en su bioma
      g.onLevelStart(this.level);
    }
  }
  // Portal (ocupa los dos carriles) y destello al cruzarlo
  drawPortal(c) {
    const g = this.game, P = this.portal;
    if (P) {
      const wx = PLAYER_X + 40 + (P.at - g.distance), b = this.biomes[P.next], acc = b.accent, t = g.time;
      const p0 = toScreen(0, wx, 0), p1 = toScreen(1, wx, 0), cx = (p0.x + p1.x) / 2, top = p0.y - 120, bot = p1.y + 4, cy = (top + bot) / 2, ry = (bot - top) / 2, rx = 46;
      if (cx < W + 120) {
        c.save();
        c.globalAlpha = 0.35; c.fillStyle = acc; c.beginPath(); c.ellipse(cx, cy, rx + 26, ry + 18, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1; c.fillStyle = "#0e0b16"; c.beginPath(); c.ellipse(cx, cy, rx + 6, ry + 6, 0, 0, Math.PI * 2); c.fill();
        // interior: anillos que giran hacia el centro con los colores del bioma siguiente
        const cols = [b.pal.skyTop, b.pal.skyBot, acc, "#ffffff"];
        for (let i = 0; i < 6; i++) {
          const k = ((t * 0.9 + i / 6) % 1), s = 1 - k;
          c.fillStyle = cols[i % cols.length]; c.globalAlpha = 0.25 + 0.6 * k;
          c.beginPath(); c.ellipse(cx, cy, rx * s, ry * s, 0, 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;
        for (let i = 0; i < 14; i++) {   // chispas en espiral
          const a = t * 3 + i * 0.45, r = (i / 14);
          c.fillStyle = i % 2 ? acc : "#ffffff"; c.fillRect(Math.round(cx + Math.cos(a) * rx * r) - 2, Math.round(cy + Math.sin(a) * ry * r) - 2, 4, 4);
        }
        c.strokeStyle = acc; c.lineWidth = 4; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = "#ffffff"; c.lineWidth = 2; c.setLineDash([8, 8]); c.lineDashOffset = -t * 60; c.beginPath(); c.ellipse(cx, cy, rx + 3, ry + 3, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
        g.ui.text(c, b.name.toUpperCase(), cx, top - 18, 12, acc, "center");
        c.restore();
      }
    }
    if (this.warp > 0) {   // destello en espiral al cruzar
      const k = this.warp / CONFIG.PORTAL_WARP_TIME, acc = this.biome.accent;
      c.save(); c.globalAlpha = k * 0.85; c.fillStyle = acc; c.fillRect(0, 0, W, H);
      c.globalAlpha = k; c.fillStyle = "#ffffff";
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + g.time * 4, r = (1 - k) * 520; c.fillRect(Math.round(PLAYER_X + 40 + Math.cos(a) * r) - 4, Math.round(250 + Math.sin(a) * r * 0.5) - 4, 8, 8); }
      c.restore();
    }
  }
  tick(dt) {
    if (this.warp > 0) this.warp = Math.max(0, this.warp - dt);
    if (this.fade < 1) this.fade = Math.min(1, this.fade + dt / CONFIG.BIOME_FADE_TIME);
    if (this.banner > 0) this.banner -= dt;
  }
  targetSpeed() {
    const prog = clamp((this.game.distScore - (this.level - 1) * CONFIG.POINTS_PER_LEVEL) / CONFIG.POINTS_PER_LEVEL, 0, 1), m = this.game.mode;
    return Math.min(CONFIG.MAX_SPEED, CONFIG.BASE_SPEED * m.startSpeedMult * (1 + m.speedPerLevel * (this.level - 1)) * (1 + CONFIG.SPEED_IN_LEVEL * prog));
  }
  gapSeconds() { return Math.max(CONFIG.GAP_MIN, CONFIG.GAP_START * Math.pow(CONFIG.GAP_FACTOR_PER_LEVEL, this.level - 1)); }
  powerupChance() { return Math.max(CONFIG.POWERUP_MIN_CHANCE, CONFIG.POWERUP_CHANCE * Math.pow(CONFIG.POWERUP_FACTOR_PER_LEVEL, this.level - 1)); }
  flyerExtra(fast) { return CONFIG.BIRD_EXTRA_SPEED + (fast && this.level >= this.game.mode.fastBirdLevel ? CONFIG.FAST_BIRD_BONUS : 0); }
  drawBackground(c) {
    if (this.fade < 1) { this.biomes[this.prev].draw(c, this.game, 1); this.biomes[this.cur].draw(c, this.game, this.fade); }
    else this.biome.draw(c, this.game, 1);
  }
}

