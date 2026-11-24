// =====================================================================
//  Biome: dibuja cielo, parallax, suelo y decoración de un bioma
// =====================================================================
class Biome {
  constructor(def, index) {
    Object.assign(this, def);
    this.deco = def.deco || [];
    const seed = index * 101 + 7;
    this.farRidge = makeRidge(seed, 960, def.far.step, def.far.min, def.far.max, def.far.rough);
    this.nearRidge = makeRidge(seed + 50, 1100, def.near.step, def.near.min, def.near.max, def.near.rough);
    const r = seededRandom(seed + 99);
    if (this.has("trees")) {
      this.trees = [];
      for (let x = 10; x < 1150; x += 60 + r() * 80) this.trees.push({ x, h: 40 + r() * 50, w: 8 + Math.round(r() * 6), cr: 20 + r() * 14 });
    }
    if (this.has("lianas")) {
      this.lianas = [];
      for (let x = 20; x < 1080; x += 50 + r() * 90) this.lianas.push({ x, len: 30 + r() * 90 });
    }
    if (this.has("city")) {
      this.farTile = this.renderBuildings(seed, 1000, 60, 160, 40, 90, this.pal.far, 0.35);
      this.nearTile = this.renderBuildings(seed + 3, 1100, 30, 100, 50, 120, this.pal.near, 0.2);
    }
  }
  has(d) { return this.deco.includes(d); }
  // Pre-renderiza una franja de edificios con ventanas de neón (se repite en mosaico)
  renderBuildings(seed, tile, minH, maxH, minW, maxW, color, lit) {
    const cv = document.createElement("canvas"); cv.width = tile; cv.height = 220;
    const c = cv.getContext("2d"), r = seededRandom(seed), P = this.pal;
    let x = 0;
    while (x < tile - minW) {
      const w = Math.min(Math.round(minW + r() * (maxW - minW)), tile - x), h = Math.round(minH + r() * (maxH - minH)), top = 220 - h;
      c.fillStyle = color; c.fillRect(x, top, w, h);
      c.fillStyle = r() < 0.5 ? P.neonA : P.neonB; c.fillRect(x, top, w, 2);
      for (let wy = top + 7; wy < 214; wy += 9)
        for (let wx = x + 4; wx < x + w - 5; wx += 7)
          if (r() < lit) { const q = r(); c.fillStyle = q < 0.4 ? P.neonA : q < 0.75 ? P.neonB : "#ffe9a8"; c.globalAlpha = 0.85; c.fillRect(wx, wy, 3, 4); c.globalAlpha = 1; }
      if (r() < 0.3) { c.fillStyle = "#1a1c28"; c.fillRect(x + w / 2 - 1, top - 14, 2, 14); c.fillStyle = "#ff3b3b"; c.fillRect(x + w / 2 - 2, top - 16, 4, 3); }
      x += w + Math.round(4 + r() * 10);
    }
    return cv;
  }
  draw(c, g, alpha) {
    if (alpha <= 0) return;
    const P = this.pal, t = g.time, sc = g.scroll;
    c.save(); c.globalAlpha = alpha;
    // Cielo
    const sky = c.createLinearGradient(0, 0, 0, 215);
    sky.addColorStop(0, P.skyTop); sky.addColorStop(1, P.skyBot);
    c.fillStyle = sky; c.fillRect(-10, -10, W + 20, 232);
    if (this.stars) {
      c.fillStyle = "#ffffff";
      for (const s of g.stars) { c.globalAlpha = alpha * (0.55 + 0.45 * Math.sin(t * s.tw + s.ph)); c.fillRect(s.x, s.y, s.s, s.s); }
      c.globalAlpha = alpha;
    }
    if (this.sky === "sun" || this.sky === "paleSun") {
      const pale = this.sky === "paleSun";
      c.fillStyle = pale ? "rgba(255,255,255,0.4)" : "rgba(255,240,170,0.35)";
      c.beginPath(); c.arc(760, 64, 40, 0, Math.PI * 2); c.fill();
      c.fillStyle = pale ? "#ffffff" : "#fff0a0"; c.beginPath(); c.arc(760, 64, 26, 0, Math.PI * 2); c.fill();
    } else if (this.sky === "earth") {
      c.fillStyle = "rgba(90,160,255,0.18)"; c.beginPath(); c.arc(760, 70, 44, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#2a6ad0"; c.beginPath(); c.arc(760, 70, 32, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#3aa35a"; c.fillRect(742, 56, 16, 10); c.fillRect(750, 66, 10, 12); c.fillRect(768, 60, 12, 8); c.fillRect(770, 80, 8, 6);
      c.fillStyle = "#ffffff"; c.fillRect(746, 48, 20, 3); c.fillRect(766, 90, 14, 3);
    } else if (this.sky === "moon") {
      c.fillStyle = "rgba(241,239,216,0.15)"; c.beginPath(); c.arc(760, 64, 34, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#f1efd8"; c.beginPath(); c.arc(760, 64, 22, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#d3cfb2"; c.fillRect(750, 55, 6, 6); c.fillRect(764, 68, 5, 5); c.fillRect(758, 72, 3, 3);
    }
    if (this.has("shooting")) this.drawShootingStars(c, t, alpha);
    if (this.has("aurora")) this.drawAurora(c, t, alpha);
    if (this.clouds) for (const cl of g.clouds) drawCloud(c, cl.x, cl.y, cl.w, this.clouds);
    // Capas de parallax
    if (this.has("volcano")) this.drawVolcano(c, sc, t, alpha);
    if (this.ridges !== false) drawRidge(c, this.farRidge, 214, sc * 0.05, P.far, this.far.cap && P.cap);
    { const hz = c.createLinearGradient(0, 110, 0, 216); hz.addColorStop(0, rgbaHex(P.skyBot, 0)); hz.addColorStop(1, rgbaHex(P.skyBot, 0.45)); c.fillStyle = hz; c.fillRect(-10, 110, W + 20, 106); }
    if (this.farTile) this.drawTile(c, this.farTile, sc * 0.08, 214);
    if (this.trees) this.drawTrees(c, sc * 0.18);
    if (this.ridges !== false) drawRidge(c, this.nearRidge, 222, sc * 0.15, P.near, this.near.cap && P.cap);
    if (this.nearTile) this.drawTile(c, this.nearTile, sc * 0.22, 218);
    if (this.has("lava")) {
      c.fillStyle = P.lava; c.fillRect(-10, 204, W + 20, 9);
      c.fillStyle = P.lavaHi;
      for (let i = 0; i < 30; i++) c.fillRect(Math.round(mod(i * 67 - sc * 0.2 + Math.sin(t * 2 + i) * 4, W + 20) - 10), 205 + (i % 3) * 2, 6, 2);
    }
    // Suelo y carriles
    c.fillStyle = P.ground; c.fillRect(-10, 212, W + 20, H - 202);
    const glow = this.has("sparkle") || this.id === "volcano" || this.id === "graveyard";
    for (let i = 0; i < 2; i++) {
      const { y: gy, s } = LANES[i];
      c.fillStyle = P.band; c.fillRect(-10, gy - 14 * s, W + 20, 26 * s);
      c.fillStyle = P.bandHi; c.fillRect(-10, gy - 14 * s, W + 20, 2 * s);
      c.fillStyle = P.bandEdge; c.fillRect(-10, gy + 12 * s, W + 20, 3 * s);
      c.fillStyle = P.pebble;
      for (const pb of g.pebbles) {
        if (pb.lane !== i) continue;
        const wx = mod(pb.x - sc, 1200) - 150, sx = Math.round(VANISH_X + (wx - VANISH_X) * s), sy = Math.round(gy + pb.dy * s);
        if (glow) c.globalAlpha = alpha * (0.35 + 0.65 * Math.abs(Math.sin(t * 3 + pb.x)));
        c.fillRect(sx, sy, Math.ceil(pb.w * s), Math.ceil(2 * s));
        if (glow && this.has("sparkle") && pb.w > 5) c.fillRect(sx + 2, sy - 2, 2, 6);   // destellos del hielo
      }
      c.globalAlpha = alpha;
    }
    { const gg = c.createLinearGradient(0, 212, 0, H); gg.addColorStop(0, "rgba(255,255,255,0.05)"); gg.addColorStop(0.5, "rgba(0,0,0,0)"); gg.addColorStop(1, "rgba(0,0,0,0.3)"); c.fillStyle = gg; c.fillRect(-10, 212, W + 20, H - 202); }
    for (let i = 0; i < 2; i++) { const { y: gy, s } = LANES[i]; c.fillStyle = "rgba(0,0,0,0.18)"; c.fillRect(-10, gy + 15 * s, W + 20, 4 * s); }
    if (this.lianas) this.drawLianas(c, sc * 0.6, t);
    c.restore();
  }
  drawTile(c, tile, offset, baseY) {
    const off = mod(offset, tile.width);
    for (let k = 0; k < 2; k++) c.drawImage(tile, Math.floor(k * tile.width - off), baseY - tile.height);
  }
  drawTrees(c, offset) {
    const P = this.pal, off = mod(offset, 1200);
    for (let k = 0; k < 2; k++) for (const tr of this.trees) {
      const x = Math.round(k * 1200 - off + tr.x); if (x < -60 || x > W + 60) continue;
      const base = 216, top = base - tr.h, cr = Math.round(tr.cr), cx = x + tr.w / 2;
      c.fillStyle = P.trunk; c.fillRect(x, Math.round(top), tr.w, Math.round(tr.h));
      c.fillStyle = P.canopy;
      c.fillRect(Math.round(cx - cr), Math.round(top - cr * 0.9), cr * 2, Math.round(cr * 1.1));
      c.fillRect(Math.round(cx - cr * 0.6), Math.round(top - cr * 1.5), Math.round(cr * 1.2), Math.round(cr * 0.8));
      c.fillStyle = P.canopyHi; c.fillRect(Math.round(cx - cr * 0.5), Math.round(top - cr * 1.35), Math.round(cr * 0.6), 4);
    }
  }
  drawLianas(c, offset, t) {
    const P = this.pal, off = mod(offset, 1100);
    for (let k = 0; k < 2; k++) for (const l of this.lianas) {
      const x = Math.round(k * 1100 - off + l.x); if (x < -10 || x > W + 10) continue;
      const sway = Math.round(Math.sin(t * 1.3 + l.x) * 2), len = Math.round(l.len);
      c.fillStyle = P.liana; c.fillRect(x, -10, 3, len + 10); c.fillRect(x + sway, len - 6, 3, 8);
      c.fillStyle = P.canopyHi;
      for (let y = 8, i = 0; y < len; y += 14, i++) c.fillRect(x + (i % 2 ? 3 : -4), y, 4, 3);
    }
  }
  drawVolcano(c, sc, t, alpha) {
    const P = this.pal, cx = Math.round(mod(640 - sc * 0.02, 1300) - 200);
    c.fillStyle = P.far;
    for (let i = 0; i < 17; i++) { const hw = 150 - i * 8; c.fillRect(cx - hw, 214 - (i + 1) * 8, hw * 2, 9); }
    c.fillStyle = P.lava; c.fillRect(cx - 18, 78, 36, 4);
    c.fillRect(cx - 6, 82, 4, 40); c.fillRect(cx + 8, 86, 3, 60);
    for (let k = 0; k < 4; k++) {
      const ph = mod(t * 0.25 + k / 4, 1);
      c.globalAlpha = alpha * (1 - ph) * 0.5; c.fillStyle = "#5a4a4a";
      c.beginPath(); c.arc(cx + ph * 30, 72 - ph * 70, 6 + ph * 16, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = alpha;
  }
  // Aurora boreal del Glaciar (bandas pixeladas que ondulan)
  drawAurora(c, t, alpha) {
    const cols = ["#3ddc84", "#41e1ff", "#8a5cff"];
    for (let b = 0; b < 3; b++) {
      c.fillStyle = cols[b];
      for (let x = 0; x < W; x += 6) {
        const y = 40 + b * 16 + Math.sin(x * 0.012 + t * 0.6 + b) * 14 + Math.sin(x * 0.03 - t * 0.9) * 5;
        c.globalAlpha = alpha * (0.14 + 0.1 * Math.sin(x * 0.02 + t + b));
        c.fillRect(x, Math.round(y), 6, 18);
      }
    }
    c.globalAlpha = alpha;
  }
  drawShootingStars(c, t, alpha) {
    const period = 1.8, idx = Math.floor(t / period), ph = (t % period) / 0.7;
    if (ph >= 1) return;
    const x0 = 150 + hash(idx) * 650, y0 = 15 + hash(idx, 7) * 80;
    for (let j = 0; j < 9; j++) {
      c.globalAlpha = alpha * (1 - j / 9) * (1 - ph * 0.5); c.fillStyle = j < 2 ? "#ffffff" : "#b8c8ff";
      c.fillRect(Math.round(x0 - ph * 160 + j * 5), Math.round(y0 + ph * 60 - j * 2), 3, 2);
    }
    c.globalAlpha = alpha;
  }
}
function drawCloud(c, x, y, w, color) {
  c.fillStyle = color; x = Math.round(x); y = Math.round(y); w = Math.round(w);
  c.fillRect(x, y + 8, w, 10);
  c.fillRect(x + Math.round(w * 0.12), y + 2, Math.round(w * 0.42), 8);
  c.fillRect(x + Math.round(w * 0.45), y - 4, Math.round(w * 0.32), 12);
  c.fillStyle = "rgba(0,0,0,0.1)"; c.fillRect(x, y + 15, w, 3);
  c.fillStyle = "rgba(255,255,255,0.35)"; c.fillRect(x + Math.round(w * 0.5), y - 4, Math.round(w * 0.2), 2);
}


// =====================================================================
//  Escenarios «Expedición arcade» (maquetas de Claude Design): cada bioma se pinta con capas de pixel art
//  pre-renderizadas a media resolución (1 píxel de la capa = 2 px lógicos) y se escalan sin suavizado.
//  Cielo en bandas con tramado, siluetas lejanas, objetos medios y un suelo con carriles marcados.
// =====================================================================
const SCENE_PAL = {
  desert:    { skyTop: "#4a7fbe", skyMid: "#e9b98e", skyBot: "#fbe2b4", far: "#d3a68c", near: "#c49468", ground: "#ecd29b", band: "#e3c58d", bandHi: "#f6e3b7", bandEdge: "#c4a06a", pebble: "#d2b07c", accent: "#ffb35c" },
  jungle:    { skyTop: "#8fc7a0", skyMid: "#cfe8b8", skyBot: "#eef6d8", far: "#7fae84", near: "#3c6a3e", ground: "#3b2c1e", band: "#4a6a32", bandHi: "#6f9446", bandEdge: "#2c3f1e", pebble: "#5a4630", accent: "#9be07a" },
  volcano:   { skyTop: "#1e0c10", skyMid: "#5a1c14", skyBot: "#8a3418", far: "#2c1412", near: "#1a0c0c", ground: "#2e2220", band: "#3c2c28", bandHi: "#5a4038", bandEdge: "#1a1210", pebble: "#a8481c", accent: "#ff9a5a" },
  glacier:   { skyTop: "#08142c", skyMid: "#16305a", skyBot: "#2a4f80", far: "#3a5c88", near: "#6a90b8", ground: "#a8d4ef", band: "#c4e4f6", bandHi: "#eef8ff", bandEdge: "#7aa8cc", pebble: "#e8f6ff", accent: "#9ce8ff" },
  night:     { skyTop: "#040619", skyMid: "#121842", skyBot: "#2a2c5e", far: "#161a3a", near: "#20203e", ground: "#28263f", band: "#33304e", bandHi: "#4a4670", bandEdge: "#18162a", pebble: "#5a5690", accent: "#c6b8ff" },
  beach:     { skyTop: "#4ab6ea", skyMid: "#9ad8f2", skyBot: "#d8f4ff", far: "#6abfb0", near: "#5a9a5a", ground: "#f2dca6", band: "#e8cf92", bandHi: "#fbeccb", bandEdge: "#cfb070", pebble: "#f6b8a8", accent: "#ffffff" },
  mushroom:  { skyTop: "#1e0e3a", skyMid: "#5a2c80", skyBot: "#9a5ab0", far: "#4a2a6a", near: "#3a2252", ground: "#3a2830", band: "#4e3466", bandHi: "#6e4c8a", bandEdge: "#24162e", pebble: "#7a5a8a", accent: "#ff9ad8" },
  ocean:     { skyTop: "#031a30", skyMid: "#0c3a5e", skyBot: "#1a628c", far: "#0e3452", near: "#1a4a5a", ground: "#bfae84", band: "#b09e74", bandHi: "#d4c8a0", bandEdge: "#8a7a56", pebble: "#e8a8c0", accent: "#7df9ff" },
  graveyard: { skyTop: "#06070f", skyMid: "#141a24", skyBot: "#253232", far: "#141a1e", near: "#0e1214", ground: "#1e1e24", band: "#2a2a32", bandHi: "#3e3e48", bandEdge: "#121216", pebble: "#3a4a3e", accent: "#8affa8" },
  moon:      { skyTop: "#020208", skyMid: "#06061a", skyBot: "#10122a", far: "#4a4e5c", near: "#6a6e7a", ground: "#8e929c", band: "#a2a6b0", bandHi: "#c4c8d0", bandEdge: "#6a6e78", pebble: "#5e626c", accent: "#ffffff" },
};
const SCENE_AMBIENT = {
  jungle: ["#8bc75a", "#c9a640"], volcano: ["#8a7a78", "#ff8a3a"], glacier: ["#ffffff"], mushroom: ["#ff7ad0", "#7df9ff", "#ffe14d"],
  ocean: ["#bfeaff", "#6ab0d0"], graveyard: ["#6aff8a"],
};
for (const b of BIOMES) {
  const P = SCENE_PAL[b.id]; if (!P) continue;
  Object.assign(b.pal, P); b.accent = P.accent;
  if (SCENE_AMBIENT[b.id]) b.ambientColors = SCENE_AMBIENT[b.id];
}

// ---- Primitivas de pixel art (sobre la capa a media resolución) ----
const SC_TW = 600, SC_H = 110;                  // capas de 1200 × 220 px lógicos
const scCanvas = (w, h) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; return cv; };
function mixHex(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
const _scPat = {};
function scDither(c, col, phase = 0) {          // tramado en damero (1 píxel de capa)
  const k = col + phase;
  if (!_scPat[k]) { const cv = scCanvas(2, 2), x = cv.getContext("2d"); x.fillStyle = col; x.fillRect(phase, 0, 1, 1); x.fillRect(1 - phase, 1, 1, 1); _scPat[k] = cv; }
  return c.createPattern(_scPat[k], "repeat");
}
const _scPatL = {};
function scDitherL(c, col) {                    // tramado en damero de 2 px lógicos (para el contexto principal)
  if (!_scPatL[col]) { const cv = scCanvas(4, 4), x = cv.getContext("2d"); x.fillStyle = col; x.fillRect(0, 0, 2, 2); x.fillRect(2, 2, 2, 2); _scPatL[col] = c.createPattern(cv, "repeat"); }
  return _scPatL[col];
}
function pR(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function pCircle(c, col, cx, cy, r) {
  c.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); c.fillRect(Math.round(cx - hw), Math.round(cy + dy), hw * 2 + 1, 1); }
}
function pEllipse(c, col, cx, cy, rx, ry, top = false) {   // top = solo la mitad superior
  c.fillStyle = col;
  for (let dy = -ry; dy <= (top ? 0 : ry); dy++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)))); c.fillRect(Math.round(cx - hw), Math.round(cy + dy), hw * 2 + 1, 1); }
}
function pRing(c, fill, cx, cy, r0, r1) {      // anillo (para halos tramados)
  c.fillStyle = fill;
  for (let dy = -r1; dy <= r1; dy++) {
    const o = Math.round(Math.sqrt(Math.max(0, r1 * r1 - dy * dy))), i = Math.abs(dy) < r0 ? Math.round(Math.sqrt(r0 * r0 - dy * dy)) : 0;
    if (i === 0) c.fillRect(Math.round(cx - o), Math.round(cy + dy), o * 2 + 1, 1);
    else { c.fillRect(Math.round(cx - o), Math.round(cy + dy), o - i, 1); c.fillRect(Math.round(cx + i + 1), Math.round(cy + dy), o - i, 1); }
  }
}
// Silueta continua (mosaico sin cortes): suma de senos con periodos que dividen el ancho de la capa
function pRidge(c, col, base, mid, amps, step = 2, seed = 1, edge) {
  const r = seededRandom(seed), ph = amps.map(() => r() * Math.PI * 2);
  for (let x = 0; x < SC_TW; x += step) {
    let h = mid; amps.forEach(([k, a], i) => h += a * Math.sin(2 * Math.PI * k * x / SC_TW + ph[i]));
    const top = Math.round(base - h);
    pR(c, col, x, top, step, base - top + 2);
    if (edge) pR(c, edge, x, top, step, 1);
  }
}
// Dibuja un objeto en x y en sus copias del mosaico
const wrapX = (x, fn) => { for (const o of [-SC_TW, 0, SC_TW]) fn(x + o); };

// ---- Cielo: bandas con transición tramada + astro ----
function scSky(P, extra) {
  const cv = scCanvas(450, SC_H), c = cv.getContext("2d"), n = 9, bh = 12;
  const colAt = i => { const t = i / (n - 1); return t < 0.5 ? mixHex(P.skyTop, P.skyMid, t * 2) : mixHex(P.skyMid, P.skyBot, (t - 0.5) * 2); };
  for (let i = 0; i < n; i++) pR(c, colAt(i), 0, i * bh, 450, bh + 2);
  for (let i = 1; i < n; i++) { c.fillStyle = scDither(c, colAt(i)); c.fillRect(0, i * bh - 2, 450, 2); c.fillStyle = scDither(c, colAt(i - 1)); c.fillRect(0, i * bh, 450, 1); }
  if (extra) extra(c);
  return cv;
}
function scSun(c, x, y, r, core, rim, halo) {
  c.save(); c.globalAlpha = 0.55; pRing(c, scDither(c, halo), x, y, r + 1, r + 9); c.restore();
  pRing(c, scDither(c, halo), x, y, r + 1, r + 4);
  pCircle(c, rim, x, y, r); pCircle(c, core, x - 1, y - 1, r - 3);
}
function scMoon(c, x, y, r, col, crater, halo) {
  pRing(c, scDither(c, halo), x, y, r + 1, r + 6);
  pCircle(c, col, x, y, r);
  pCircle(c, crater, x - 5, y - 4, 3); pCircle(c, crater, x + 5, y + 4, 2); pCircle(c, crater, x + 2, y - 7, 1);
}
function scRays(c, col, xs, len = 80) {        // rayos de luz diagonales tramados
  c.fillStyle = scDither(c, col);
  for (const x0 of xs) for (let y = 0; y < len; y++) c.fillRect(Math.round(x0 - y * 0.55), y, 5, 1);
}
function scStarsStatic(c, seed, n, cols, yMax = 90) {
  const r = seededRandom(seed);
  for (let i = 0; i < n; i++) { c.fillStyle = cols[Math.floor(r() * cols.length)]; c.fillRect(Math.floor(r() * 450), Math.floor(r() * yMax), 1, 1); }
}

// ---- Piezas de escenario (coordenadas de capa: suelo del horizonte en y = 106) ----
const HZ = 106;
function scMesa(c, P, x, w, h) {
  const top = HZ - h, sh = shadeHex(P.far, -0.12), li = shadeHex(P.far, 0.12), st = shadeHex(P.far, -0.06);
  for (let y = top; y < HZ + 2; y++) {
    const grow = Math.round((y - top) * 0.18), x0 = x - grow, ww = w + grow * 2;
    pR(c, P.far, x0, y, ww, 1);
    pR(c, sh, x0 + ww - Math.max(3, Math.round(ww * 0.14)), y, Math.max(3, Math.round(ww * 0.14)), 1);
    if ((y - top) % 7 === 5) pR(c, st, x0 + 2, y, ww - 6, 1);
  }
  pR(c, li, x, top, w, 1);
}
function scBush(c, x, col) { pEllipse(c, col, x, HZ - 2, 7, 5, true); pR(c, shadeHex(col, -0.25), x - 6, HZ - 2, 13, 2); pR(c, shadeHex(col, 0.2), x - 3, HZ - 6, 3, 1); }
function scSkull(c, x) { pR(c, "#f4ead2", x, HZ - 4, 6, 3); pR(c, "#f4ead2", x - 2, HZ - 6, 2, 2); pR(c, "#f4ead2", x + 6, HZ - 6, 2, 2); pR(c, "#7a5a3a", x + 1, HZ - 3, 1, 1); pR(c, "#7a5a3a", x + 4, HZ - 3, 1, 1); }
function scRibs(c, x) { for (let i = 0; i < 4; i++) pR(c, "#f4ead2", x + i * 3, HZ - 3, 1, 3); pR(c, "#f4ead2", x, HZ - 1, 11, 1); }
function scTree(c, x, h, cols, trunk) {         // copa orgánica en 2–3 tonos
  pR(c, trunk, x - 2, HZ - h + 10, 4, h - 10);
  const cy = HZ - h, [base, hi, dk] = cols;
  pCircle(c, dk, x, cy + 5, 13); pCircle(c, base, x - 9, cy + 2, 10); pCircle(c, base, x + 9, cy + 3, 10); pCircle(c, base, x, cy - 4, 12);
  pCircle(c, hi, x - 4, cy - 7, 6); pCircle(c, hi, x - 12, cy - 1, 4);
  pR(c, dk, x - 16, cy + 12, 32, 2);
}
function scPalm(c, x, h, lean) {
  let px = x, py = HZ;
  for (let i = 0; i < h; i++) { const k = i / h, xx = Math.round(x + lean * k * k * h * 0.35); pR(c, i % 4 === 0 ? "#b07a40" : "#8a5a2a", xx - 1, HZ - i, 3, 1); px = xx; py = HZ - i; }
  const fr = [[-1, -0.25], [-0.85, 0.15], [-0.45, 0.5], [0.45, 0.5], [0.85, 0.15], [1, -0.25], [0.15, -0.6]];
  for (const [dx, dy] of fr) for (let j = 0; j < 14; j++) {
    const fx = Math.round(px + dx * j), fy = Math.round(py + dy * j + (j * j) * 0.045);
    pR(c, "#2f9a3a", fx, fy, 2, 2); if (j % 3 === 1) pR(c, "#6cd05a", fx, fy - 1, 1, 1); if (j % 2 === 0 && j > 3) pR(c, "#1f7a2a", fx, fy + 1, 1, 2);
  }
  pR(c, "#5a3a1a", px - 1, py, 3, 2);
}
function scMushroom(c, x, h, rx, col) {
  const stem = "#d8c8d8", ry = Math.round(rx * 0.42), cy = HZ - h;
  pR(c, stem, x - 3, cy, 7, h); pR(c, "#b4a2c0", x + 2, cy, 2, h); pR(c, "#f2e8f2", x - 2, cy + 2, 1, h - 4);
  pEllipse(c, shadeHex(col, -0.25), x, cy + 1, rx, ry, true); pR(c, shadeHex(col, -0.25), x - rx, cy, rx * 2 + 1, 3);
  pEllipse(c, col, x, cy - 1, rx - 1, ry - 1, true); pEllipse(c, shadeHex(col, 0.25), x - Math.round(rx * 0.3), cy - ry + 2, Math.round(rx * 0.35), 1);
  for (let i = -rx + 3; i < rx - 2; i += 4) pR(c, shadeHex(col, 0.65), x + i, cy + 2, 1, 1);           // borde luminoso
  for (let i = -rx + 6; i < rx - 4; i += 7) pR(c, "#fff4ff", x + i, cy - Math.round(ry * 0.5), 2, 1);   // lunares
}
function scDeadTree(c, x, h, col) {
  pR(c, col, x, HZ - h, 2, h);
  const br = [[0.35, -1, 9], [0.55, 1, 8], [0.75, -1, 6], [0.85, 1, 5]];
  for (const [k, d, l] of br) for (let j = 0; j < l; j++) pR(c, col, x + d * j + (d > 0 ? 1 : 0), Math.round(HZ - h * k - j * 0.6), 1, 1);
}
function scDome(c, x, r) { pEllipse(c, "#c4c8d0", x, HZ, r, Math.round(r * 0.7), true); pEllipse(c, "#e8eaf0", x - Math.round(r * 0.3), HZ - Math.round(r * 0.4), Math.round(r * 0.3), 1); pR(c, "#8e929c", x - r, HZ - 1, r * 2 + 1, 1); pR(c, "#5e626c", x + 2, HZ - 3, 2, 3); }

// ---- Definición de capas por bioma (f = factor de parallax) ----
const SCENES = {
  desert: P => ({
    sky: scSky(P, c => scSun(c, 380, 30, 16, "#fff8e6", "#ffe7a8", "#fff1c4")),
    layers: [
      { f: 0.04, draw: c => { const r = seededRandom(11); for (let x = 20; x < SC_TW; x += 90 + r() * 70) { const w = 26 + r() * 30, h = 34 + r() * 30; wrapX(x, xx => scMesa(c, P, xx, w, h)); } } },
      { f: 0.1, draw: c => { pRidge(c, mixHex(P.near, P.ground, 0.55), HZ + 2, 12, [[2, 4], [5, 2], [9, 1]], 2, 5, mixHex(P.near, "#ffffff", 0.45)); } },
      { f: 0.3, draw: c => { const r = seededRandom(17); for (let x = 10; x < SC_TW; x += 40 + r() * 50) { const k = r(); wrapX(x, xx => k < 0.55 ? scBush(c, xx, "#b07a48") : k < 0.8 ? scSkull(c, xx) : scRibs(c, xx)); } } },
    ],
  }),
  jungle: P => ({
    sky: scSky(P, c => { scSun(c, 375, 26, 13, "#fbfff0", "#eef8d8", "#f8fde8"); scRays(c, "#f6fce6", [330, 360, 420, 445], 100); }),
    layers: [
      { f: 0.04, draw: c => pRidge(c, mixHex(P.far, P.skyBot, 0.35), HZ + 2, 24, [[2, 8], [3, 5], [7, 2]], 2, 21) },
      { f: 0.16, draw: c => {
        const r = seededRandom(23);
        for (let x = 6; x < SC_TW; x += 48 + r() * 30) { const h = 46 + r() * 22; wrapX(x, xx => scTree(c, xx, h, ["#5c9662", "#7cb27c", "#4a7f52"], "#4a5236")); }
        pR(c, "#cfe2bc", 0, HZ - 12, SC_TW, 14); c.fillStyle = scDither(c, "#cfe2bc"); c.fillRect(0, HZ - 14, SC_TW, 2);
        const r2 = seededRandom(29); for (let i = 0; i < 420; i++) pR(c, r2() < 0.7 ? "#f6fbe8" : "#f2c8d8", Math.floor(r2() * SC_TW), HZ - 1 - Math.floor(r2() * 13), 1, 1);
      } },
    ],
  }),
  volcano: P => ({
    sky: scSky(P, c => scStarsStatic(c, 31, 26, ["#ff9a5a", "#ffd0a0"], 70)),
    layers: [
      { f: 0.02, draw: c => {
        const cx = 300, body = "#4a2420", lit = "#5e2c22", dk = "#38181a";
        for (let y = 26; y < HZ + 2; y++) { const hw = 12 + Math.round((y - 26) * 1.75); pR(c, body, cx - hw, y, hw * 2, 1); pR(c, lit, cx - hw, y, Math.round(hw * 0.55), 1); pR(c, dk, cx + Math.round(hw * 0.55), y, Math.round(hw * 0.45), 1); }
        pR(c, "#ff6a2a", cx - 12, 25, 24, 2); pR(c, "#ffb35c", cx - 8, 25, 16, 1);
        let lx = cx + 1; for (let y = 27; y < HZ - 4; y++) { if (y % 6 === 0) lx += (y % 12 ? 1 : -1) + (y > 60 ? 1 : 0); pR(c, "#ff5a1a", lx, y, 2, 1); if (y % 3 === 0) pR(c, "#ffb35c", lx, y, 1, 1); }
        pRidge(c, "#2a1412", HZ + 2, 10, [[3, 6], [7, 3]], 2, 37);
      } },
      { f: 0.08, draw: c => {
        for (let x = 0; x < SC_TW; x++) { const g = 0.5 + 0.5 * Math.sin(x * 0.21); pR(c, g > 0.6 ? "#ffb35c" : "#ff7a2a", x, HZ - 3, 1, 1); }
        pR(c, "#ff5a1a", 0, HZ - 2, SC_TW, 3);
        const r = seededRandom(41); for (let x = 0; x < SC_TW; x += 6 + Math.floor(r() * 10)) { const w = 3 + Math.floor(r() * 6); pEllipse(c, "#1a0e0c", x, HZ - 2, w, 2, true); }
      } },
    ],
    anim: (c, g, a, sc) => {      // humo del cráter (sigue al volcán)
      const cx = mod(600 - sc * 0.02, 1200);
      for (const ox of [cx, cx - 1200]) for (let k = 0; k < 5; k++) {
        const ph = mod(g.time * 0.22 + k / 5, 1); c.globalAlpha = a * (1 - ph) * 0.55; c.fillStyle = scDitherL(c, "#6a5a5a");
        const s = Math.round(8 + ph * 26); c.fillRect(Math.round(ox + ph * 40 - s / 2), Math.round(46 - ph * 60), s, Math.round(s * 0.7));
      }
      c.globalAlpha = a;
    },
  }),
  glacier: P => ({
    sky: scSky(P),
    layers: [
      { f: 0.03, draw: c => pRidge(c, "#2c4a78", HZ + 2, 34, [[2, 10], [5, 6], [11, 2]], 2, 43, "#8ab4dc") },
      { f: 0.1, draw: c => {
        const r = seededRandom(47);
        for (let x = 30; x < SC_TW; x += 80 + r() * 60) { const h = 34 + r() * 26, w = 18 + r() * 10; wrapX(x, xx => {
          for (let y = 0; y < h; y++) { const hw = Math.round((y / h) * w); pR(c, "#4a74a6", xx - hw, HZ - h + y, hw * 2 + 1, 1); pR(c, "#7ea6d2", xx - hw, HZ - h + y, hw + 1, 1); }
          pR(c, "#eef8ff", xx - 1, HZ - h, 2, 3);
        }); }
        pRidge(c, "#5a84b4", HZ + 2, 6, [[4, 3], [9, 2]], 2, 53, "#b4d4f0");
      } },
    ],
    anim: (c, g, a) => {          // aurora tramada en tres bandas
      const cols = ["#3ddc84", "#3ab8c8", "#8a5cff"];
      for (let b = 0; b < 3; b++) {
        c.fillStyle = scDitherL(c, cols[b]);
        for (let x = 0; x < W; x += 6) {
          const y = 26 + b * 12 + Math.sin(x * 0.01 + g.time * 0.5 + b) * 12 + Math.sin(x * 0.027 - g.time * 0.8) * 4;
          c.globalAlpha = a * (0.55 + 0.25 * Math.sin(x * 0.02 + g.time + b)); c.fillRect(x, Math.round(y / 2) * 2, 6, 10);
        }
      }
      c.globalAlpha = a;
    },
  }),
  night: P => ({
    sky: scSky(P, c => {
      c.fillStyle = scDither(c, "#2a3070"); for (let y = 0; y < 90; y++) c.fillRect(Math.round(40 + y * 3.2), y, 70, 1);
      const r = seededRandom(59); for (let i = 0; i < 520; i++) { const y = Math.floor(r() * 90), x = Math.round(40 + y * 3.2 + r() * 80 - 5); pR(c, r() < 0.2 ? "#ffffff" : "#8a90d0", x, y, 1, 1); }
      scStarsStatic(c, 61, 60, ["#ffffff", "#c6b8ff"]);
      scMoon(c, 380, 30, 14, "#f4f0d0", "#d8d2b0", "#6a6aa8");
    }),
    layers: [
      { f: 0.03, draw: c => pRidge(c, "#1c1f44", HZ + 2, 22, [[2, 7], [5, 4]], 2, 67, "#2c3060") },
      { f: 0.12, draw: c => {
        const r = seededRandom(71);
        for (let x = 40; x < SC_TW; x += 100 + r() * 80) { const h = 50 + r() * 14; wrapX(x, xx => { pR(c, "#14142a", xx - 1, HZ - h + 8, 3, h - 8); pCircle(c, "#20203e", xx, HZ - h, 10); pCircle(c, "#20203e", xx - 7, HZ - h + 4, 7); pCircle(c, "#2c2c52", xx - 3, HZ - h - 4, 4); }); }
        for (let i = 0; i < 4; i++) pR(c, "#4a4e88", 380 + i, HZ - 4 + i * 2, 16 - i * 4 + 4, 1);
      } },
    ],
    anim: (c, g, a) => {          // luciérnagas
      for (let i = 0; i < 14; i++) {
        const on = Math.sin(g.time * (1.5 + hash(i) * 2) + i * 2) > 0.2; if (!on) continue;
        const x = mod(hash(i, 3) * 1100 - g.scroll * 0.25 + Math.sin(g.time + i) * 20, 1000) - 50, y = 120 + hash(i, 5) * 200 + Math.sin(g.time * 1.3 + i) * 10;
        c.fillStyle = "#d8ff8a"; c.globalAlpha = a; c.fillRect(Math.round(x), Math.round(y), 4, 4);
        c.globalAlpha = a * 0.25; c.fillRect(Math.round(x) - 2, Math.round(y) - 2, 8, 8);
      }
      c.globalAlpha = a;
    },
  }),
  beach: P => ({
    sky: scSky(P, c => scSun(c, 380, 30, 16, "#fffef4", "#fff7d8", "#ffffff")),
    layers: [
      { f: 0.03, draw: c => {
        const r = seededRandom(73); for (let x = 60; x < SC_TW; x += 140 + r() * 120) { const w = 40 + r() * 40; wrapX(x, xx => { pEllipse(c, "#6abfb0", xx, HZ - 8, w, 7, true); pEllipse(c, "#88d4c0", xx - w * 0.3, HZ - 12, w * 0.4, 2, true); }); }
        pR(c, "#3ec8d8", 0, HZ - 8, SC_TW, 10); pR(c, "#2aa8c8", 0, HZ - 4, SC_TW, 6);
        for (let x = 0; x < SC_TW; x += 4) pR(c, "#ffffff", x, HZ - 6, 2, 1);
        c.fillStyle = scDither(c, "#bff4ff"); c.fillRect(0, HZ - 1, SC_TW, 2); pR(c, "#ffffff", 0, HZ + 1, SC_TW, 1);
      } },
      { f: 0.2, draw: c => { const r = seededRandom(79); for (let x = 30; x < SC_TW; x += 110 + r() * 40) { const h = 54 + r() * 14, l = r() < 0.5 ? -1 : 1; wrapX(x, xx => scPalm(c, xx, h, l)); } } },
    ],
  }),
  mushroom: P => ({
    sky: scSky(P, c => scStarsStatic(c, 83, 50, ["#ffffff", "#ffd0f0", "#7df9ff"], 70)),
    layers: [
      { f: 0.03, draw: c => { pRidge(c, "#4a2a6a", HZ + 2, 22, [[2, 8], [6, 4]], 2, 89, "#6a4a8a"); c.fillStyle = scDither(c, "#5a3480"); c.fillRect(0, HZ - 12, SC_TW, 6); } },
      { f: 0.14, draw: c => {
        const r = seededRandom(97), cols = ["#c84a8a", "#3a90b8", "#b0a040"];
        for (let x = 12; x < SC_TW; x += 34 + r() * 30) { const h = 22 + r() * 46, rx = 9 + Math.round(r() * 16), col = cols[Math.floor(r() * 3)]; wrapX(x, xx => scMushroom(c, xx, h, rx, col)); }
      } },
      { f: 0.3, draw: c => { const r = seededRandom(101); for (let x = 0; x < SC_TW; x += 2 + Math.floor(r() * 4)) { const h = 2 + Math.floor(r() * 5); pR(c, r() < 0.5 ? "#3a8a4a" : "#2a6a3a", x, HZ - h, 1, h); if (h > 4) pR(c, "#3a8a4a", x + 1, HZ - h, 1, 1); } } },
    ],
  }),
  ocean: P => ({
    sky: scSky(P, c => scRays(c, "#2a7aa8", [80, 170, 300, 400], 104)),
    layers: [
      { f: 0.03, draw: c => {
        pRidge(c, "#0e3452", HZ + 2, 26, [[2, 9], [5, 4]], 2, 103, "#1a4a6e");
        const x = 280; pR(c, "#123c5a", x, HZ - 46, 3, 40); pR(c, "#123c5a", x - 12, HZ - 38, 27, 2);
        for (let y = 0; y < 14; y++) pR(c, "#123c5a", x - 30 + y, HZ - 14 + y, 62 - y * 2, 1);
      } },
      { f: 0.14, draw: c => {
        const r = seededRandom(107);
        for (let x = 4; x < SC_TW; x += 18 + r() * 30) { const h = 12 + Math.floor(r() * 20), ph = r() * 6; wrapX(x, xx => { for (let y = 0; y < h; y++) pR(c, y % 6 < 3 ? "#2a8a5a" : "#38a868", Math.round(xx + Math.sin(y * 0.5 + ph) * 1.5), HZ - y, 1, 1); }); }
        const r2 = seededRandom(109); for (let x = 10; x < SC_TW; x += 30 + r2() * 40) wrapX(x, xx => { pR(c, "#e8a8c0", xx - 2, HZ - 2, 1, 2); pR(c, "#e8a8c0", xx, HZ - 3, 1, 3); pR(c, "#e8a8c0", xx + 2, HZ - 2, 1, 2); pR(c, "#c87898", xx - 2, HZ, 5, 1); });
      } },
    ],
  }),
  graveyard: P => ({
    sky: scSky(P, c => { scStarsStatic(c, 113, 50, ["#ffffff", "#b8ffc8"]); scMoon(c, 380, 30, 15, "#e8f0d8", "#c8d4b8", "#2e4038"); }),
    layers: [
      { f: 0.03, draw: c => {
        pRidge(c, "#141a1e", HZ + 2, 18, [[2, 6], [4, 3]], 2, 127);
        const x = 220, d = "#10161a"; pR(c, d, x, HZ - 30, 40, 30); for (let y = 0; y < 12; y++) pR(c, d, x - 4 + y, HZ - 42 + y, 48 - y * 2, 1);
        pR(c, d, x + 30, HZ - 54, 8, 24); pR(c, d, x + 33, HZ - 66, 2, 12); pR(c, d, x + 30, HZ - 62, 8, 2); pR(c, "#2a3a2a", x + 16, HZ - 10, 6, 10);
      } },
      { f: 0.1, draw: c => { const r = seededRandom(131); for (let x = 50; x < SC_TW; x += 130 + r() * 80) { const h = 30 + r() * 14; wrapX(x, xx => scDeadTree(c, xx, h, "#0e1214")); } } },
      { f: 0.25, draw: c => {
        c.fillStyle = scDither(c, "#3a6a4a"); c.fillRect(0, HZ - 6, SC_TW, 8);
        for (let x = 0; x < SC_TW; x += 4) { pR(c, "#0a0c10", x, HZ - 11, 1, 11); pR(c, "#0a0c10", x, HZ - 12, 1, 1); }
        pR(c, "#0a0c10", 0, HZ - 9, SC_TW, 1); pR(c, "#0a0c10", 0, HZ - 3, SC_TW, 1);
      } },
    ],
  }),
  moon: P => ({
    sky: scSky(P, c => {
      scStarsStatic(c, 137, 70, ["#ffffff", "#c8d0ff"]);
      const x = 380, y = 34, r = 18; pCircle(c, "#2a6ad0", x, y, r);
      pEllipse(c, "#3aa35a", x - 7, y - 3, 6, 4); pEllipse(c, "#3aa35a", x + 4, y + 8, 4, 3); pR(c, "#ffffff", x - 6, y - 13, 10, 1); pR(c, "#ffffff", x + 2, y + 13, 6, 1);
      c.fillStyle = scDither(c, "#0e1c40"); for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(r * r - dy * dy)); c.fillRect(x + Math.round(hw * 0.3), y + dy, hw - Math.round(hw * 0.3) + 1, 1); }
    }),
    layers: [
      { f: 0.03, draw: c => { pRidge(c, "#4a4e5c", HZ + 2, 30, [[2, 9], [4, 5], [9, 2]], 2, 139, "#6a6e7c"); c.fillStyle = scDither(c, "#3a3e4a"); c.fillRect(0, HZ - 14, SC_TW, 8); } },
      { f: 0.12, draw: c => {
        wrapX(110, x => { scDome(c, x, 10); scDome(c, x + 26, 6); });
        wrapX(170, x => { pR(c, "#b4b8c2", x, HZ - 34, 1, 34); pR(c, "#b4b8c2", x - 3, HZ - 26, 7, 1); });
        wrapX(330, x => scDome(c, x, 12));
        wrapX(430, x => { pR(c, "#d8dce4", x, HZ - 26, 1, 26); pR(c, "#ffffff", x + 1, HZ - 26, 12, 7); pR(c, "#3a5ad0", x + 1, HZ - 26, 4, 3); });
      } },
    ],
    anim: (c, g, a, sc) => {      // luz roja de la antena
      if (Math.floor(g.time * 2) % 2) return;
      const x = mod(340 - sc * 0.12, 1200); for (const ox of [x, x - 1200]) { c.fillStyle = "#ff3b3b"; c.fillRect(Math.round(ox) - 1, 142, 4, 4); }
    },
  }),
};

// ---- Marcas en el suelo (entre carriles), en coordenadas lógicas ----
const SCENE_DECALS = {
  volcano: (c, x, y, s) => { c.fillStyle = "#c8481c"; for (let i = 0; i < 4; i++) c.fillRect(Math.round(x + i * 6 * s), Math.round(y - (i % 2) * 2 * s), Math.ceil(4 * s), Math.ceil(2 * s)); },
  glacier: (c, x, y, s) => { c.fillStyle = "#7aa8cc"; for (let i = 0; i < 6; i++) c.fillRect(Math.round(x + i * 4 * s), Math.round(y - (i % 2) * 2 * s), Math.ceil(4 * s), Math.ceil(2 * s)); },
  beach: (c, x, y, s) => { c.fillStyle = "#f6a898"; c.fillRect(Math.round(x), Math.round(y), Math.ceil(6 * s), Math.ceil(2 * s)); c.fillRect(Math.round(x + 2 * s), Math.round(y - 2 * s), Math.ceil(2 * s), Math.ceil(2 * s)); },
  moon: (c, x, y, s) => { c.fillStyle = "#6e727c"; c.fillRect(Math.round(x), Math.round(y), Math.ceil(28 * s), Math.ceil(4 * s)); c.fillStyle = "#b4b8c2"; c.fillRect(Math.round(x + 4 * s), Math.round(y + 4 * s), Math.ceil(20 * s), Math.ceil(2 * s)); c.fillRect(Math.round(x + 2 * s), Math.round(y - 2 * s), Math.ceil(24 * s), Math.ceil(2 * s)); },
  ocean: (c, x, y, s) => { c.fillStyle = "#a8c8d8"; c.fillRect(Math.round(x), Math.round(y), Math.ceil(2 * s), Math.ceil(2 * s)); c.fillRect(Math.round(x + 10 * s), Math.round(y - 6 * s), Math.ceil(2 * s), Math.ceil(2 * s)); },
  mushroom: (c, x, y, s) => { c.fillStyle = "#ffe14d"; c.fillRect(Math.round(x), Math.round(y), Math.ceil(2 * s), Math.ceil(2 * s)); },
  jungle: (c, x, y, s) => { c.fillStyle = "#5a4630"; c.fillRect(Math.round(x), Math.round(y), Math.ceil(4 * s), Math.ceil(2 * s)); c.fillStyle = "#c9a640"; c.fillRect(Math.round(x + 14 * s), Math.round(y - 4 * s), Math.ceil(2 * s), Math.ceil(2 * s)); },
};

// Recorre posiciones de mundo repetidas cada `period` y las proyecta en un carril de escala s
function laneRepeat(sc, s, period, fn) {
  const x0 = VANISH_X - VANISH_X / s, x1 = VANISH_X + (W - VANISH_X) / s;
  for (let wx = Math.floor((x0 + sc) / period) * period - sc; wx < x1 + period; wx += period) fn(VANISH_X + (wx - VANISH_X) * s, Math.round((wx + sc) / period));
}

function buildScene(b) {
  const def = SCENES[b.id] && SCENES[b.id](b.pal); if (!def) return null;
  for (const L of def.layers) { L.cv = scCanvas(SC_TW, SC_H); L.draw(L.cv.getContext("2d")); }
  return def;
}

const _oldBiomeDraw = Biome.prototype.draw;
Biome.prototype.draw = function (c, g, alpha) {
  if (alpha <= 0) return;
  const S = this.scene !== undefined ? this.scene : (this.scene = buildScene(this));
  if (!S) return _oldBiomeDraw.call(this, c, g, alpha);
  const P = this.pal, t = g.time, sc = g.scroll;
  c.save(); c.globalAlpha = alpha; c.imageSmoothingEnabled = false;
  c.drawImage(S.sky, 0, 0, 900, SC_H * 2);
  if (this.stars) {
    c.fillStyle = "#ffffff";
    for (const s of g.stars) { if (s.y > 180) continue; c.globalAlpha = alpha * (0.4 + 0.6 * Math.max(0, Math.sin(t * s.tw + s.ph))); c.fillRect(Math.round(s.x / 2) * 2, Math.round(s.y / 2) * 2, 2, 2); }
    c.globalAlpha = alpha;
  }
  if (this.has("shooting")) this.drawShootingStars(c, t, alpha);
  if (S.anim && this.id === "glacier") S.anim(c, g, alpha, sc);
  if (this.clouds && (this.id === "desert" || this.id === "beach")) for (const cl of g.clouds) if (cl.y < 90) scCloud(c, cl.x, cl.y, cl.w * 0.7);
  for (const L of S.layers) {
    const off = mod(sc * L.f, SC_TW * 2);
    for (let k = 0; k < 2; k++) c.drawImage(L.cv, Math.floor(k * SC_TW * 2 - off), 0, SC_TW * 2, SC_H * 2);
    if (L === S.layers[0] && S.anim && this.id === "volcano") S.anim(c, g, alpha, sc);
  }
  if (S.anim && this.id !== "glacier" && this.id !== "volcano") S.anim(c, g, alpha, sc);
  if (this.id === "volcano") {   // destellos de la franja de lava
    c.fillStyle = "#ffe0a0";
    for (let i = 0; i < 24; i++) { c.globalAlpha = alpha * (0.5 + 0.5 * Math.sin(t * 3 + i)); c.fillRect(Math.round(mod(i * 83 - sc * 0.08, W + 20) - 10), 206 + (i % 2) * 2, 4, 2); }
    c.globalAlpha = alpha;
  }
  // Suelo y carriles
  pR(c, P.ground, -10, 212, W + 20, H - 202);
  pR(c, P.bandEdge, -10, 212, W + 20, 2);
  const glow = this.id === "glacier" || this.id === "graveyard" || this.id === "volcano";
  for (let i = 0; i < 2; i++) {
    const { y: gy, s } = LANES[i], top = Math.round(gy - 22 * s);
    pR(c, P.band, -10, top, W + 20, gy - top);
    pR(c, P.bandHi, -10, top, W + 20, 2);
    pR(c, P.bandEdge, -10, gy - 1, W + 20, 3);
    c.fillStyle = P.bandHi; laneRepeat(sc, s, 26, x => c.fillRect(Math.round(x), Math.round(gy - 11 * s), 2, 2));
    c.fillStyle = P.pebble;
    for (const pb of g.pebbles) {
      if (pb.lane !== i) continue;
      const wx = mod(pb.x - sc, 1200) - 150, sx = Math.round(VANISH_X + (wx - VANISH_X) * s), sy = Math.round(gy + 6 + Math.abs(pb.dy) * 2.6 * s);
      if (glow) c.globalAlpha = alpha * (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + pb.x)));
      c.fillRect(sx, sy, Math.ceil(Math.min(4, pb.w) * s), 2);
    }
    c.globalAlpha = alpha;
  }
  const dec = SCENE_DECALS[this.id];
  if (dec) { laneRepeat(sc, 0.9, 230, (x, n) => dec(c, x + hash(n) * 80, 262 + Math.round(hash(n, 2) * 3) * 6, 0.9)); laneRepeat(sc, 1.08, 260, (x, n) => dec(c, x + hash(n, 9) * 90, 334 + Math.round(hash(n, 4) * 2) * 6, 1.08)); }
  { const gg = c.createLinearGradient(0, 300, 0, H); gg.addColorStop(0, "rgba(0,0,0,0)"); gg.addColorStop(1, "rgba(0,0,0,0.18)"); c.fillStyle = gg; c.fillRect(-10, 300, W + 20, H - 290); }
  if (this.lianas) this.drawLianas(c, sc * 0.6, t);
  c.restore();
};
function scCloud(c, x, y, w) {
  x = Math.round(x / 2) * 2; y = Math.round(y / 2) * 2; w = Math.round(w / 2) * 2;
  pR(c, "#ffffff", x, y + 6, w, 8); pR(c, "#ffffff", x + Math.round(w * 0.2 / 2) * 2, y, Math.round(w * 0.5 / 2) * 2, 8);
  pR(c, "#dfe8f2", x, y + 12, w, 2);
}

// =====================================================================
//  Obstáculos con el estilo de las maquetas: contorno oscuro, 3 tonos y detalles por bioma.
//  Solo cambia el dibujo: tamaños e hitboxes son los mismos de siempre.
// =====================================================================
Object.assign(BIOMES.find(b => b.id === "desert").obstacles, { rock: "sandrock" });
Object.assign(BIOMES.find(b => b.id === "beach").obstacles, { ground: "driftlog", flyer: "gull" });
Object.assign(BIOMES.find(b => b.id === "ocean").obstacles, { ground: "coral" });
Object.assign(BIOMES.find(b => b.id === "graveyard").obstacles, { flyer: "bat" });
Object.assign(BIOMES.find(b => b.id === "moon").obstacles, { ground: "icecrystal" });
// [contorno, base, luz, sombra]
const BOULDER_PAL = {
  rock:     ["#1e1c26", "#6e6e7a", "#9c9ca8", "#4c4c58"],
  sandrock: ["#2a1a10", "#8a6440", "#b08a60", "#6a4a2c"],
  mossrock: ["#16201a", "#6a707a", "#959ba4", "#4a5058"],
  lavarock: ["#0e0808", "#3c2c2a", "#5a443e", "#261a18"],
  icerock:  ["#14243c", "#6c8cac", "#a8c8e2", "#4c6c8c"],
  meteor:   ["#1e120a", "#7a5a40", "#a07a58", "#563c28"],
};
Object.assign(STYLE_COLORS, {
  sandrock: ["#8a6440", "#b08a60", "#2a1a10"], driftlog: ["#a88a60", "#4a3420", "#e0c898"],
  coral: ["#d8406a", "#ff7a9a", "#3a0a1a"], icecrystal: ["#4ad8e8", "#c0fbff", "#0e2a3a"],
  gull: ["#ffffff", "#9aa4b4", "#ff9a2e"], bat: ["#2a1a3a", "#4a3060", "#ff3b5c"],
});
const oR = (ctx, col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

// Roca redondeada (rellena exactamente el rectángulo x, top, w, h)
function drawBoulder(ctx, x, top, w, h, pal, moss, seed) {
  const [ol, base, lt, dk] = pal, u = 2, rows = [];
  for (let y = 0; y < h; y += u) {
    const k = Math.abs(2 * (y + u / 2) / h - 1), f = y > h * 0.7 ? Math.max(0.86, Math.pow(1 - Math.pow(k, 2.6), 1 / 2.6)) : Math.pow(1 - Math.pow(k, 2.6), 1 / 2.6);
    const hw = Math.max(u, Math.round(w / 2 * f / u) * u); rows.push([y, hw]);
  }
  const cx = x + w / 2;
  for (const [y, hw] of rows) oR(ctx, ol, cx - hw - u, top + y - (y === 0 ? u : 0), hw * 2 + 2 * u, u + (y === 0 ? u : 0));
  for (const [y, hw] of rows) {
    if (hw <= u) continue;
    const yy = top + y, t = y / h;
    oR(ctx, base, cx - hw + (y === 0 ? u : 0), yy + (y === 0 ? u : 0), hw * 2 - (y === 0 ? 2 * u : 0), u);
    if (t < 0.6) oR(ctx, lt, cx - hw + u, yy, Math.round(hw * 0.7 / u) * u, u);
    oR(ctx, dk, cx + hw - Math.round(hw * 0.45 / u) * u, yy, Math.round(hw * 0.45 / u) * u, u);
    if (t > 0.78) oR(ctx, dk, cx - hw, yy, hw * 2, u);
  }
  oR(ctx, "rgba(255,255,255,0.5)", cx - w * 0.22, top + h * 0.18, 4, 2);
  const r = seededRandom(seed || 7);
  for (let i = 0; i < 3; i++) oR(ctx, dk, cx - w * 0.25 + r() * w * 0.4, top + h * (0.35 + r() * 0.35), 2, 2);
  if (moss) {
    const mh = Math.round(h * 0.3 / u) * u;
    for (const [y, hw] of rows) { if (y >= mh || hw <= u) continue; oR(ctx, y < u * 2 ? "#8ad06a" : "#5aa04a", cx - hw, top + y, hw * 2, u); }
    for (let i = -w / 2 + 4; i < w / 2 - 4; i += 6) oR(ctx, "#5aa04a", cx + i, top + mh, 2, 2 + (Math.abs(i) % 4));
  }
}

const _obDrawRock = Obstacle.prototype.drawRock;
Obstacle.prototype.drawRock = function (ctx) {
  const pal = BOULDER_PAL[this.style]; if (!pal) return _obDrawRock.call(this, ctx);
  const seed = Math.round((this.cracks[0] ? this.cracks[0].x : 0.5) * 1000), moss = this.style === "mossrock";
  if (this.h > 60) {   // roca alta: tres cantos apilados (de abajo arriba)
    const H = this.h, parts = [[-0.42, 0.42, 1], [-0.74, 0.36, 0.84], [-1, 0.3, 0.68]];
    parts.forEach(([y0, hh, ww], i) => { const w = Math.round(this.w * ww / 2) * 2, h = Math.round(hh * H / 2) * 2; drawBoulder(ctx, (this.w - w) / 2, Math.round(y0 * H / 2) * 2, w, h, pal, moss && i === 2, seed + i * 13); });
  } else drawBoulder(ctx, 0, -this.h, this.w, this.h, pal, moss, seed);
  if (this.style === "lavarock" || this.style === "meteor") {   // grietas incandescentes
    ctx.fillStyle = `rgb(255,${130 + Math.floor(60 * Math.sin(this.t * 6))},40)`;
    for (const c of this.cracks.slice(0, 3)) { const cx = Math.round(this.w * c.x / 2) * 2, cy = Math.round((-this.h + 8 + c.y * (this.h - 16)) / 2) * 2; ctx.fillRect(cx, cy, 2, 4); ctx.fillRect(cx + 2, cy + 4, 2, 4); }
  }
};

function drawCactusV7(ctx, x, top, w, h) {
  const u = 2, Rn = v => Math.round(v / u) * u;
  const tw = Rn(w * 0.44), tx = x + Rn((w - tw) / 2), armW = Rn(w * 0.22);
  const la = top + Rn(h * 0.34), lh = Rn(h * 0.28), ra = top + Rn(h * 0.2), rh = Rn(h * 0.26);
  const parts = [[tx, top, tw, h], [x, la, armW, lh], [x, la + lh - armW, tx - x + u, armW], [x + w - armW, ra, armW, rh], [tx + tw - u, ra + rh - armW, x + w - armW - (tx + tw) + 2 * u, armW]];
  ctx.fillStyle = "#123c1c"; for (const p of parts) ctx.fillRect(p[0] - u, p[1] - u, p[2] + 2 * u, p[3] + 2 * u);
  ctx.fillStyle = "#3a9a3a"; for (const p of parts) ctx.fillRect(p[0], p[1], p[2], p[3]);
  ctx.fillStyle = "#26722c"; ctx.fillRect(tx + tw - 2 * u, top, 2 * u, h); ctx.fillRect(x + armW - u, la, u, lh); ctx.fillRect(x + w - u, ra, u, rh);
  ctx.fillStyle = "#6cc25a"; ctx.fillRect(tx + u, top + u, u, h - 2 * u); ctx.fillRect(x + u, la + u, u, lh - armW);
  ctx.fillStyle = "#d8f0b0"; for (let yy = top + 6; yy < -6; yy += 10) { ctx.fillRect(tx - u, yy, u, u); ctx.fillRect(tx + tw, yy + 5, u, u); }
  const flower = (fx, fy) => { oR(ctx, "#ff7aa8", fx - 2, fy - 2, 6, 4); oR(ctx, "#ffb8d0", fx, fy - 4, 2, 2); oR(ctx, "#ffe14d", fx, fy - 2, 2, 2); };
  flower(tx + tw / 2 - 1, top); if (h > 50) flower(x + armW / 2 - 1, la);
}
function drawStump(ctx, x, top, w, h, light) {
  const [ol, bark, dk, cap, ring, moss] = light ? ["#3a2614", "#a88a60", "#7a5e3c", "#e0c898", "#b89a6a", "#6aa84a"] : ["#24140a", "#7a5232", "#55361c", "#c89a6a", "#8a6440", "#4f9a3a"];
  oR(ctx, ol, x - 2, top - 2, w + 4, h + 2);
  oR(ctx, bark, x, top, w, h); oR(ctx, dk, x + w - 6, top, 6, h); oR(ctx, shadeHex(bark, 0.15), x + 2, top + 6, 2, h - 8);
  for (let yy = top + 12, i = 0; yy < -4; yy += 10, i++) oR(ctx, dk, x + 4 + (i % 2) * 6, yy, Math.round(w * 0.4), 2);
  oR(ctx, cap, x, top, w, 6); oR(ctx, ring, x + 4, top + 2, w - 8, 2); oR(ctx, dk, x + w / 2 - 1, top + 2, 2, 2); oR(ctx, ol, x, top + 6, w, 2);
  oR(ctx, moss, x + w - 6, top + Math.round(h * 0.45), 6, 6); oR(ctx, moss, x - 2, top + Math.round(h * 0.7), 4, 4);
  oR(ctx, ol, x - 4, -2, w + 8, 2);
}
function drawShards(ctx, x, top, w, h, [ol, base, lt, dk], t) {
  const shard = (sx, sw, sh, cut) => {
    const st = -sh;
    for (let y = st; y < 0; y += 2) {
      const k = (y - st) / sh, ww = Math.max(2, Math.round(sw * Math.min(1, 0.35 + k * 1.6) / 2) * 2), xx = sx + (sw - ww) / 2 + (cut && k < 0.3 ? 2 : 0);
      oR(ctx, ol, xx - 2, y, ww + 4, 2); oR(ctx, base, xx, y, ww, 2); oR(ctx, lt, xx, y, Math.max(2, ww * 0.35), 2); oR(ctx, dk, xx + ww - 2, y, 2, 2);
    }
    oR(ctx, ol, sx + sw / 2 - 2, st - 2, 4, 2);
  };
  shard(x - 2, w * 0.45, h * 0.6, true); shard(x + w * 0.58, w * 0.45, h * 0.72, false); shard(x + w * 0.18, w * 0.6, h, true);
  oR(ctx, "#ffffff", x + w * 0.42, top + 6, 2, 2);
  if (Math.sin(t * 4) > 0.3) { oR(ctx, "#ffffff", x + w * 0.4, top + 10, 6, 2); oR(ctx, "#ffffff", x + w * 0.4 + 2, top + 8, 2, 6); }
}
function drawObsidian(ctx, x, top, w, h, t) {
  drawSpike(ctx, x, top, w, h, "#0e0b16", "#1e1e3a", "#34345a", 0.25);
  ctx.fillStyle = `rgba(255,${110 + Math.floor(50 * Math.sin(t * 5))},30,1)`;
  for (let yy = top + 14, i = 0; yy < -6; yy += 10, i++) { const vx = x + w / 2 + (i % 2 ? -4 : 2); ctx.fillRect(vx, yy, 2, 4); ctx.fillRect(vx + (i % 2 ? 2 : -2), yy + 4, 2, 4); }
}
function drawIceBlockV7(ctx, x, top, w, h) {
  const n = Math.max(1, Math.round(h / w)), bh = Math.round(h / n / 2) * 2;
  for (let i = 0; i < n; i++) {
    const by = top + i * bh;
    oR(ctx, "#1e3a5a", x - 2, by - 2, w + 4, bh + 2);
    oR(ctx, "#a8daf2", x, by, w, bh - 2); oR(ctx, "#2a4a6a", x, by, w, 4); oR(ctx, "#eef8ff", x, by + 4, w, 2);
    oR(ctx, "#7ab4d8", x + w - 6, by + 6, 6, bh - 8);
    oR(ctx, "#ffffff", x + 4, by + 10, 2, 6); oR(ctx, "#ffffff", x + 6, by + 8, 2, 2);
    oR(ctx, "#5a94c0", x + w - 12, by + bh - 12, 2, 4); oR(ctx, "#5a94c0", x + w - 10, by + bh - 8, 2, 2);
  }
}
function drawCoral(ctx, x, top, w, h) {
  const ol = "#3a0a1a", base = "#d8406a", lt = "#ff8aa8", cx = Math.round((x + w / 2) / 2) * 2, sw = 8;
  const seg = (sx, sy, ex, ey) => { const n = Math.max(1, Math.round(Math.hypot(ex - sx, ey - sy) / 2)); for (let i = 0; i <= n; i++) { const px = sx + (ex - sx) * i / n, py = sy + (ey - sy) * i / n; oR(ctx, ol, px - sw / 2 - 2, py - 2, sw + 4, 4); } };
  const fill = (sx, sy, ex, ey) => { const n = Math.max(1, Math.round(Math.hypot(ex - sx, ey - sy) / 2)); for (let i = 0; i <= n; i++) { const px = sx + (ex - sx) * i / n, py = sy + (ey - sy) * i / n; oR(ctx, base, px - sw / 2, py - 1, sw, 2); oR(ctx, lt, px - sw / 2, py - 1, 2, 2); } };
  const fork = top + h * 0.5, L = [[cx, 0, cx, fork], [cx, fork, x + 2, top + 6], [cx, fork, x + w - 2, top + 6], [x + w * 0.2, top + h * 0.3, x + w * 0.2 - 2, top + 2]];
  for (const s of L) seg(...s); for (const s of L) fill(...s);
  oR(ctx, ol, cx - 8, -2, 16, 2);
}
function drawTombV7(ctx, x, top, w, h) {
  const ol = "#16161e";
  oR(ctx, ol, x - 2, top + 6, w + 4, h - 4); oR(ctx, ol, x + 2, top + 2, w - 4, 6); oR(ctx, ol, x + 6, top - 2, w - 12, 4);
  oR(ctx, "#8a8e9a", x, top + 8, w, h - 8); oR(ctx, "#8a8e9a", x + 4, top + 4, w - 8, 4); oR(ctx, "#8a8e9a", x + 8, top, w - 16, 4);
  oR(ctx, "#b4b8c2", x + 2, top + 8, 4, h - 12); oR(ctx, "#b4b8c2", x + 8, top + 2, 6, 2);
  oR(ctx, "#5e626c", x + w - 6, top + 8, 6, h - 8);
  oR(ctx, "#3e424c", x + w / 2 - 2, top + 12, 4, 18); oR(ctx, "#3e424c", x + w / 2 - 7, top + 17, 14, 4);
  oR(ctx, "#4f8a3a", x - 4, -4, w + 8, 4); oR(ctx, "#6ab04a", x + 2, -8, 6, 4); oR(ctx, "#6ab04a", x + w - 8, -6, 4, 2);
}

const _obDrawGround = Obstacle.prototype.drawGround;
Obstacle.prototype.drawGround = function (ctx, x, top, w, h) {
  switch (this.style) {
    case "cactus": return drawCactusV7(ctx, x, top, w, h);
    case "log": return drawStump(ctx, x, top, w, h, false);
    case "driftlog": return drawStump(ctx, x, top, w, h, true);
    case "obsidian": return drawObsidian(ctx, x, top, w, h, this.t);
    case "iceblock": return drawIceBlockV7(ctx, x, top, w, h);
    case "crystal": return drawShards(ctx, x, top, w, h, ["#1e1030", "#8a5ce0", "#c8a8ff", "#5a34a0"], this.t);
    case "icecrystal": return drawShards(ctx, x, top, w, h, ["#0e2a3a", "#4ad8e8", "#c8fcff", "#2a98b8"], this.t);
    case "coral": return drawCoral(ctx, x, top, w, h);
    case "tomb": return drawTombV7(ctx, x, top, w, h);
  }
  return _obDrawGround.call(this, ctx, x, top, w, h);
};

// Voladores nuevos: gaviota (playa) y murciélago (cementerio); pez payaso y dron redibujados
const _obDraw = Obstacle.prototype.draw;
Obstacle.prototype.draw = function (ctx) {
  if (this.kind === "flyer" && (this.style === "gull" || this.style === "bat")) {
    drawShadow(ctx, 30, 40, this.y + 60);
    return this.style === "gull" ? this.drawGull(ctx) : this.drawBat(ctx);
  }
  return _obDraw.call(this, ctx);
};
Obstacle.prototype.drawGull = function (ctx) {
  const top = -this.y - this.h, up = Math.floor(this.t * 7) % 2 === 0, R = (col, x, y, w, h) => oR(ctx, col, x, top + y, w, h);
  R("#1e2230", 6, 16, 44, 12); R("#ffffff", 8, 18, 40, 8); R("#d8dee8", 10, 24, 34, 2);
  R("#1e2230", 2, 14, 10, 8); R("#ffffff", 4, 16, 8, 6); R("#15161c", 6, 17, 2, 2); R("#ff9a2e", -4, 18, 8, 3);
  R("#1e2230", 46, 18, 14, 6); R("#ffffff", 48, 20, 10, 2);
  if (up) { R("#1e2230", 20, 2, 18, 16); R("#9aa4b4", 22, 4, 14, 14); R("#ffffff", 24, 6, 8, 12); R("#15161c", 34, 2, 4, 4); }
  else { R("#1e2230", 20, 24, 18, 12); R("#9aa4b4", 22, 26, 14, 8); R("#15161c", 34, 32, 4, 4); }
};
Obstacle.prototype.drawBat = function (ctx) {
  const top = -this.y - this.h, up = Math.floor(this.t * 9) % 2 === 0, R = (col, x, y, w, h) => oR(ctx, col, x, top + y, w, h);
  const wing = (dir) => {
    const bx = dir < 0 ? 4 : 40;
    if (up) { R("#0e0814", bx, 4, 22, 14); R("#3a2450", bx + 2, 6, 18, 10); R("#4a3060", bx + (dir < 0 ? 2 : 10), 6, 8, 4); for (let i = 0; i < 3; i++) R("#0e0814", bx + 2 + i * 7, 16, 4, 4); }
    else { R("#0e0814", bx, 16, 22, 14); R("#3a2450", bx + 2, 18, 18, 8); for (let i = 0; i < 3; i++) R("#0e0814", bx + 2 + i * 7, 26, 4, 4); }
  };
  wing(-1); wing(1);
  R("#0e0814", 24, 10, 18, 18); R("#2a1a3a", 26, 12, 14, 14); R("#0e0814", 24, 6, 4, 6); R("#0e0814", 38, 6, 4, 6);
  R("#ff3b5c", 28, 16, 3, 3); R("#ff3b5c", 35, 16, 3, 3); R("#e8e0f0", 30, 22, 2, 2); R("#e8e0f0", 34, 22, 2, 2);
};
Obstacle.prototype.drawFish = function (ctx) {
  const top = -this.y - this.h, f = Math.round(Math.sin(this.t * 12) * 2) * 2, R = (col, x, y, w, h) => oR(ctx, col, x, top + y, w, h);
  R("#1a0e08", 46, 4 + f, 18, 28 - 2 * f); R("#ff8a1e", 48, 6 + f, 14, 24 - 2 * f); R("#1a0e08", 56, 10 + f, 2, 16 - 2 * f);
  R("#1a0e08", 4, 6, 46, 26); R("#1a0e08", 8, 4, 36, 30);
  R("#ff8a1e", 6, 8, 42, 22); R("#ff8a1e", 10, 6, 32, 26); R("#ffb04a", 10, 8, 30, 4);
  for (const sx of [16, 30]) { R("#1a0e08", sx - 2, 6, 8, 26); R("#ffffff", sx, 6, 4, 26); }
  R("#ffffff", 8, 12, 6, 6); R("#15161c", 8, 14, 4, 4); R("#1a0e08", 22, 32, 10, 2); R("#ff8a1e", 22, 30, 8, 2);
};
Obstacle.prototype.drawDrone = function (ctx) {
  const top = -this.y - this.h, r = Math.abs(Math.sin(this.t * 40)), wr = Math.round((6 + 22 * r) / 2) * 2, R = (col, x, y, w, h) => oR(ctx, col, x, top + y, w, h);
  R("#0e0b16", 2, 6, 62, 4); R("#5e6474", 4, 6, 58, 2); R("#bfc6d4", 10 - wr / 2, 2, wr, 2); R("#bfc6d4", 56 - wr / 2, 2, wr, 2);
  R("#0e0b16", 30, 10, 6, 4);
  R("#0e0b16", 10, 16, 46, 10); R("#0e0b16", 16, 14, 34, 14); R("#8a93a6", 12, 18, 42, 6); R("#c9d0dc", 18, 16, 30, 2);
  R("#0e0b16", 22, 10, 22, 8); R("#5ae0ff", 24, 12, 18, 6); R("#c8fcff", 26, 12, 6, 2);
  R(mod(this.t * 3, 1) < 0.5 ? "#ff3b5c" : "#7a1020", 31, 28, 4, 4);
  ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.t * 6); R("#5ae0ff", 20, 30, 26, 6); ctx.globalAlpha = 1;
};

// =====================================================================
//  Voladores nuevos (v19): un pájaro distinto por bioma, en pixel art de 22 × 12 (×3) y aleteo de 4 fotogramas.
//  Cuerpo común + alas + detalles propios (cresta, cola larga, brillo…). Miran a la izquierda, hacia el raptor.
// =====================================================================
const BIRD_BODY = [
  "......................",
  "......................",
  "......................",
  "..kkkk................",
  ".khhhhk...............",
  "khwehhhkkkkkkkkk......",
  "yyhhhhaaaaaaaaaakkkk..",
  ".ykhhaaaaaaaaaaaatttkk",
  "..kkccccccccaaaattttk.",
  "....kkcccccccaakkkkk..",
  "......kkkkkkkk........",
  "......................",
];
const BIRD_WINGS = {
  up: [
    "...........kkkk.......",
    "..........kfffgk......",
    ".........kffgggk......",
    "........kffgggk.......",
    ".......kfffggk........",
    ".......kffffk.........",
    "........kkkk..........",
  ],
  mid: [
    "......................", "......................", "......................", "......................",
    "......kkkkkkkkkkkkkk..",
    ".....kffffffffggggggk.",
    "......kkkkkkkkkkkkkk..",
  ],
  down: [
    "......................", "......................", "......................", "......................", "......................",
    "......................", "......................", "......................",
    ".......kffffk.........",
    ".......kfffggk........",
    "........kffgggk.......",
    ".........kkkkk........",
  ],
};
const BIRD_CYCLE = ["up", "mid", "down", "mid"];
// Tipos: paleta + detalles (filas que se superponen; "." no pinta)
const BIRD_TYPES = {
  vulture: { name: "Buitre", pal: { k: "#2a1a10", h: "#f0a0a0", w: "#ffffff", e: "#15161c", y: "#e8c040", a: "#6a4428", c: "#f3e8d0", t: "#4a2e18", f: "#5a3a22", g: "#c08a52" },
    extra: ["......................", "......................", "......................", "......................", "......................", ".......cc.............", "......cc..............", ".......c..............", "......................"] },
  parrot: { name: "Guacamayo", pal: { k: "#1a0e12", h: "#e8342e", w: "#ffffff", e: "#15161c", y: "#f3e8d0", a: "#e8342e", c: "#ffd23f", t: "#2f7ad8", f: "#2f7ad8", g: "#3ddc84" },
    extra: ["......................", "......................", "......................", "......................", "......................", "......................", "......................", "..................kttk", "..................tttk", "...................ttk", "....................kk", "......................"] },
  phoenix: { name: "Pájaro de fuego", pal: { k: "#2a0606", h: "#ff9a1e", w: "#ffffff", e: "#15161c", y: "#ffd23f", a: "#ff5a1e", c: "#ffd23f", t: "#ff3b1e", f: "#ff3b1e", g: "#ffd23f" }, glow: "#ff9a3c",
    extra: ["......................", "..y...................", ".yhy..................", "..h..................."] },
  owl: { name: "Búho nival", pal: { k: "#2a3a52", h: "#ffffff", w: "#ffd23f", e: "#15161c", y: "#3a3a3a", a: "#f4f8ff", c: "#ffffff", t: "#c8d8ea", f: "#e8f0fa", g: "#9ab4d0" },
    extra: ["......................", "......................", ".k..k.................", ".kk.kk................", "......................", "......................", "......................", "......................", "......t.t.t..........."] },
  crow: { name: "Cuervo", pal: { k: "#06040c", h: "#1e1a2e", w: "#ff3b5c", e: "#ff3b5c", y: "#3a3448", a: "#1e1a2e", c: "#2e2844", t: "#1e1a2e", f: "#16121f", g: "#3e3866" }, glow: "#ff3b5c" },
  gull: { name: "Gaviota", pal: { k: "#1e2230", h: "#ffffff", w: "#ffffff", e: "#15161c", y: "#ff9a2e", a: "#ffffff", c: "#e2e8f0", t: "#1e2230", f: "#9aa4b4", g: "#3a4052" } },
  moth: { name: "Polilla luminosa", pal: { k: "#1a0a26", h: "#ffb3f0", w: "#7df9ff", e: "#15161c", y: "#ffb3f0", a: "#c86ad8", c: "#ffe1fb", t: "#c86ad8", f: "#7df9ff", g: "#ff7ad0" }, glow: "#7df9ff",
    extra: ["......................", "......................", "......................", "...k..................", "..k...................", "......................"] },
  bat: { name: "Murciélago", pal: { k: "#0e0814", h: "#3a2450", w: "#ff3b5c", e: "#ff3b5c", y: "#e8e0f0", a: "#2a1a3a", c: "#4a3060", t: "#2a1a3a", f: "#3a2450", g: "#5a3a78" },
    extra: ["......................", "......................", "......................", "......................", "..k..k................", "......................", "..y...................", "......................"] },
  crystal: { name: "Ave de cristal", pal: { k: "#2a1450", h: "#c8fcff", w: "#ffffff", e: "#ff5ce1", y: "#ffd23f", a: "#7df9ff", c: "#ffffff", t: "#ff5ce1", f: "#c9a6ff", g: "#ffffff" }, glow: "#ff5ce1", prism: true },
};
const WINGSPAN = {
  up: ["......................", ".kk................kk.", ".kfk..............kfk.", ".kffk....k..k....kffk.", "..kffkk..kkkk..kkffk..", "..kfffgkkhhhhkkgfffk..",
       "...kffgkhwhhwhkgffk...", "...kfgk.khhhhk.kgfk...", "....kk...kyyk...kk....", "..........kk..........", "......................", "......................"],
  mid: ["......................", "......................", "......................", "......................", ".........k..k.........", ".........kkkk.........",
        "kkkkkkkkkhhhhkkkkkkkkk", "kfffffggkwhhwkggfffffk", ".kfkfkfkkhhhhkkfkfkfk.", ".........kyyk.........", "..........kk..........", "......................"],
  down: ["......................", "......................", "......................", "......................", ".........k..k.........", ".........kkkk.........",
         "...kkkk.khhhhk.kkkk...", "..kfffgkkwhhwkkgfffk..", ".kffgggkhhhhhhkgggffk.", ".kfk.kfk.kyyk.kfk.kfk.", ".kk...kk..kk..kk...kk.", "......................"],
};
Object.assign(BIRD_TYPES, {
  bat: { name: "Murciélago", span: true, pal: { k: "#0e0814", h: "#2a1a3a", w: "#ff3b5c", e: "#ff3b5c", y: "#e8e0f0", f: "#3a2450", g: "#5a3a78" } },
  moth: { name: "Polilla luminosa", span: true, glow: "#7df9ff", pal: { k: "#1a0a26", h: "#ffb3f0", w: "#15161c", e: "#15161c", y: "#ffe1fb", f: "#c86ad8", g: "#7df9ff" },
    extra: ["......................", "......................", "........k....k........", ".........k..k........."] },
});
function birdFrames(type) {
  const T = BIRD_TYPES[type];
  if (T.span) return BIRD_CYCLE.map(pose => { const g = WINGSPAN[pose].map(r => r.split("")); (T.extra || []).forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ".") g[y][x] = ch; })); return g.map(r => r.join("")); });
  return BIRD_CYCLE.map(pose => {
    const g = BIRD_BODY.map(r => r.split(""));
    const over = (rows, keepOutline) => rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== "." && g[y]) g[y][x] = ch; }));
    if (pose !== "down") over(BIRD_WINGS[pose]); else over(BIRD_WINGS.down);
    if (T.extra) over(T.extra);
    return g.map(r => r.join(""));
  });
}
// Cada bioma con su volador (el fondo marino sigue con el pez payaso y la base lunar con el dron)
const BIRD_BY_BIOME = { desert: "vulture", jungle: "parrot", volcano: "phoenix", glacier: "owl", night: "crow", beach: "gull", mushroom: "moth", graveyard: "bat", santuario: "crystal" };
for (const b of BIOMES) if (BIRD_BY_BIOME[b.id]) b.obstacles.flyer = "bird-" + BIRD_BY_BIOME[b.id];
const BIRD_SPRITES = {};
for (const k in BIRD_TYPES) BIRD_SPRITES[k] = birdFrames(k).map(rows => compileSprite(rows, BIRD_TYPES[k].pal));
const _obDrawBird = Obstacle.prototype.draw;
Obstacle.prototype.draw = function (ctx) {
  const type = this.kind === "flyer" && typeof this.style === "string" && this.style.startsWith("bird-") ? this.style.slice(5) : null;
  if (!type || !BIRD_SPRITES[type]) return _obDrawBird.call(this, ctx);
  const T = BIRD_TYPES[type], fr = BIRD_SPRITES[type], i = Math.floor(this.t * 11) % fr.length, spr = fr[i], top = -this.y - spr.h;
  const bob = (i === 0 ? -2 : i === 2 ? 2 : 0);   // sube y baja un poco con cada aletazo
  drawShadow(ctx, 30, 40, this.y + 60);
  if (T.glow) {   // brillo suave (fuego, polilla luminosa, cristal, ojos del cuervo)
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = T.glow;
    for (const [r, al] of [[34, 0.07], [24, 0.09], [14, 0.1]]) { ctx.globalAlpha = al * (1 + 0.3 * Math.sin(this.t * 8)); ctx.beginPath(); ctx.ellipse(33, top + 20 + bob, r * 1.4, r, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  drawSkinSprite(ctx, spr, 0, top + bob);
  if (type === "phoenix" && Math.floor(this.t * 20) % 2 === 0) { ctx.fillStyle = choice(["#ffd23f", "#ff9a1e", "#ff3b1e"]); ctx.fillRect(60 + rand(0, 12), top + 20 + rand(-6, 6), 3, 3); }   // brasas
  if (T.prism) { ctx.fillStyle = "#ffffff"; const k = Math.floor(this.t * 6) % 4; ctx.fillRect(18 + k * 9, top + 18 + bob, 3, 3); }                                    // destello del cristal
};

// Hitboxes retocadas (v17): un poco más pequeñas que el dibujo para que solo cuenten los choques que se ven
Obstacle.prototype.hitbox = function () {
  switch (this.kind) {
    case "flyer":  return { x: this.x + 8, y: this.y + 9, w: 46, h: 13 };                    // sin las puntas de las alas
    case "ground": return { x: this.x + 5, y: 0, w: this.w - 10, h: this.h - 6 };            // sin los bordes de los brazos
    case "rock":   return { x: this.x + 6, y: this.fall * 280, w: this.w - 12, h: this.h - 7 };   // roca redondeada: sin las esquinas
    default:       return { x: this.x + 10, y: 50, w: this.w - 20, h: 210 };                 // estalactita: sin la punta
  }
};

const BOSS_ART_DATA = {"cangrejo":{"piv":{"boss":"cangrejo","nombre":"Rey cangrejo","mapa":"beach","mira":"izquierda","estados":{"reposo":"cuerpo reposo/reposo_b + pinza reposo","pinzazo":"pinza abierta (sube) → apoyada (golpea)","pinza apoyada":"pinza apoyada","pinza volteada":"pinza volteada","herido":"cuerpo herido"},"escala":"1 px de arte = 3 px lógicos; dibujar con vecino más cercano","piezas":{"cuerpo":{"archivos":{"reposo":"cuerpo_reposo.png","reposo_b":"cuerpo_reposo_b.png","herido":"cuerpo_herido.png"},"tamano_arte":[50,21],"tamano_logico":[150,63],"pivote_arte":[26,20],"pivote_logico":[78,60],"emisivos":{"reposo":["#fff08a","#ffffff","#aef6ff"],"reposo_b":["#fff08a","#ffffff","#aef6ff"],"herido":["#fff08a","#ffffff","#aef6ff"]},"nota":"Ojos en pedúnculos, corona y 3 pares de patas. Pivote = centro de la base"},"segmento_brazo":{"archivos":{"unico":"segmento_brazo.png"},"tamano_arte":[7,6],"tamano_logico":[21,18],"pivote_arte":[3,3],"pivote_logico":[9,9],"emisivos":{},"nota":"Eslabón del brazo de la pinza"},"pinza":{"archivos":{"reposo":"pinza_reposo.png","abierta":"pinza_abierta.png","apoyada":"pinza_apoyada.png","volteada":"pinza_volteada.png"},"tamano_arte":[21,11],"tamano_logico":[63,33],"pivote_arte":[19,5],"pivote_logico":[57,15],"emisivos":{},"punto_debil_en_estados":["volteada"],"nota":"Pinza gigante 62×34 lógicos; pivote = muñeca (derecha). «volteada» enseña la barriga rosa = VULNERABLE al pisotón"}},"cadenas":{"brazo":{"ancla":"cuerpo","punto_ancla":[6,10],"segmentos":4,"piezas":["segmento_brazo","segmento_brazo","segmento_brazo","segmento_brazo"],"pieza_final":"pinza"}}},"files":{"cuerpo_herido.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAVCAYAAAAElr0/AAACoElEQVR42s1WP2gaURj/PREpt+QKDkUFnaRIqDc0Ih2Ks0NIlk6BdOrQgHSxw2WOgy5SyA0OBSWU4hLoIB2lg4RK4QxGitMp6lAcLhCOEoTXwbzL3WlOzz+pP5DH3Xff9/1+3/e+5wNWDEopXca+KMgqg3GeJzpJ7fYvcWrfGFADAICqWX2lanZsuFtXndu9ymDH/qcI8xzaqjYWsZUGVUEB4NyTxv51DthKA9c5bJQQ0cdPVDbh96KtdscPBsL7tznTu2m+RmQGKlnbjFiTn0ji5Ec/ZSAmLFXdzukZClddR8KIE/JG4p3TM1u/an+IhN+7sB0AgkcHAICimEdb1WxFkVkirOSr/SEAQNhNIBoXJgStyx7c2QZigi7KKobYdeFEEh+sfPDowLYr67RX+0O9Q0wQsevCrO3zPxHc2Uan3kThqovMQCUuu4HbZHTqTX0bAoDL2o0wz80lggVZ92qHhN+LMM9B9PF0+tZ6m0Sn3nzwpJkniRWHmQ8oinnHfizftBOOzUpmoBK3XduMztZKHX757IyRcunIp/G1BP5X05R3Gp+5Tq0wz+kVmSChXK5/EEIvTPmKYl7nM/PUmjYzwm4CABCNC2hcyIjGhUcbapavcSEDAORv1an/I65Z952y8gflUkUPuujKfsvEKZcqeMZ5IKs3zq4oSc5Npb0YfrcH+DFQIas3EIQAAODN61dr7wbfVVCotvS8stwD4/Op1UNFGxFHt18moqKNSKWmIMm56buQAgB6UGMiY3L9nvbxPY6zkimuLPeQigTwPOwzxWE2aS92vztqCklybsqKmooEgFaPMjFLXeMZYaNA09asKfcdz0rU9MzQ6tHUXbGMPoy0ERVtRNDq0VQkoH8/F5Kcm35/GaJWgk7fP0aef0vfEpTIlAnjAAAAAElFTkSuQmCC","cuerpo_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAVCAYAAAAElr0/AAACn0lEQVR42s1WPWgaYRh+Pjmk3JIrOBQVdJIiod7QiHQozg4hWToF0qlDA9LFDpc5DrpIITc4FJRQikugw9FROkioFM5gpDidog7F4QLBoQhfB/Nd7vRyev6keeD4uHvvfd/ned/vD1gzKKV0Ffuy8KwzGO99Qp3IzrM/GlATAIDqOWOkem5iuB3XnZtbZ7DjwFNEBB5tfTQRsZUB1UEB4Nybwf51HtjKANd5PCohkl+YqWwy4ENb705eTIT3/+Yt3+x8zcgOdOKGC1mF+Ikszf70UwXi4krV7ZyeoXjVdSWMuCFvJt45PXP0q/aHSAZ8S9sBIHR0AAAoSQW09ZGjKDJPxDT5an8IABB3k4glxBlBm7KHdraBuGiImhZDnLpwIkv3Vj50dODYlU3aq/2h0SEmiDh1Yd70+Z8I7WyjU2+ieNVFdqATj9OCe8zo1JvGNJw52SW/QCMCv5AIFmTToxOSAR8iAg/JL1D7qfU2hU69ee9Os0iSaRxmP6AkFVz7sXx2OxxbK9mBTjintpmdpyt1+OWzO0bapSufxtcyhF9NS147PgvtWhGBNyoyQ0K73PxCCL+w5CtJBYPP3F3Lbs2Iu0kAQCwhonGhIpYQH2xRs3yNCxUAoH6r2p4jnnn3nYr2B5WyYgRddmTPKnEqZQXPeC9U/cbdFSXFc1Tei+N3e4AfAx2qfgNRDAIA3rx+tfFuCF0NxWrLyKuqPTA+n1o9KKMxcXX7ZSKU0ZgoNQ0pnqPvwhoAGEHNiczJjXvax/c4zsmWuKraQzoaxPOI3xKH2eS9+N3sqGkkxXOUFTUdDQKtHmViVrrGM8JmgZapWdPuOp6TqeWdodWj6dtimX0YaTOU0Zig1aPpaND4fyGkeI5+fxmm0wTdfn+IPP8AUmoUuzuDyNMAAAAASUVORK5CYII=","cuerpo_reposo_b.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAVCAYAAAAElr0/AAACoElEQVR42s1WP2gaURj/nRyhHIVcwUkFnRwkNDc0EjoEZ4eSLJ0CdsrQQMhih8usgy4SiINDwRBK6RLoIB06iIOUSuESjMhNp+jRweEFxKEEXgd7j/Pucnr+Sf3B8bj73vd9v9/3vffuAUsGpZQuYp8XvmUGEzaeUTey0+xrA2oCAFCSYyMlubHh37js3Pwyg50FXyAqClDJaCxiMw1KQAHgeiONg/s8sJkG7vNYKyFyQLRVNhH0QyXd8YuJ8MGf/MQ3J18zsjrhvHDhFiGeKcr2ST8VIC4tVN3OxRVKd11Pwjgv5M3EOxdXrn7V/gCJoH9uOwCEjw8BAGW5AJWMXEVx00RYyVf7AwCA9CaB7V3JJmhV9vDOFhCXmCirGM6tC5mi/Gjlw8eHrl1Zpb3aH7AOGYI4ty5MWz7/E+GdLXQaTZTuusjqhPO5bbh1RqfRZMvQ9meXAyKNisJMIowgqx7dkAj6ERUFyAGROi+td0l0Gs1HT5pZkliRyp6iLBc8+xn5nE44Y69kdcLxbm0zO1srlfr00Rsj7daTz83nS4i/mhN5nfjMdGpFRYFVxEZCu139Roi8nMhXlguMz9RTy2nPpLKnuPmhYHtXYuNTwZwXAJSvVcf/iG/afUclI5zliizovKPxLBLny2UFCSkCAEgKPPV0RUkKPC3ux1GqtqCQISQpBAB4u/d65d34/b2O81aP5VSUHiTxOfYCImo6gUKGqIweuKm3X7MI1qW6xiUFnh5FNJs4RemhuB8HALRVfYJE5sN71lkzDB/zfEXp4SQWQk0nOImFcK70GGFgSI8SMdR0Mt813qzetgTrGmdutyGwMnrgKnVtPClXpMY8a7Haqs6IsTmtHjXEWNFWdW+tTQo8/fYqQq3r0ev3p8jzF/o8DrNSC2sMAAAAAElFTkSuQmCC","pinza_abierta.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAALCAYAAACQy8Z9AAABDklEQVR42p2ToW7DMBRFjweLwjoZFVQB+wCDgOF+wcBIeUBVbN7gqWC4IfuGwKEAf8FkFRRFCjMK9cDk1Enaqt0ltvWe73vv+lr474Mvc836syCgzDXWdf25aJwIey0TzwhxHEAcXqRfF1uwJyZQalJg9/UxSInjgVxomfg0mfVJq1RS2YZVKgGYZ6ovAIAxtLVhnql+BWhrw94cKRonRDzSRi2pbDMocC9CI3tzZKDFWK80mf2LWNxK0jLxu+07bW0eIn66RTjQ8k5CYNppIAuvXOb6YQnO/ssWnpMbkMUYu+KSlpVtsK77I9XZwr+9Zjz/2H6E2Jvh0S4ViN1iXXe2VNzptV9yzXZxA+HOL/vplAtiibnYAAAAAElFTkSuQmCC","pinza_apoyada.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAALCAYAAACQy8Z9AAABE0lEQVR42pWRoU/DQBTGf7cQxDJxDtJMTFVMVSwVEwsSRdAY/MSCQpxv9bIQ/Ax/AAqBQFWcmr5UoJrVnSC1h2rXLu22fuYlL9/7vZf3CQDlSceR4swKWnSJ90p50kUf64YpX7+BTl0b9Ni7XSoUuDpc7B9n7stk3PseZb2ZhxCGtErr1naeaDY6Jc6sEGo+cdHrkq06XFBfcKlK/0anCAA1nzh+bWXw5bCxoC/4bBjRyxN5onuBB2ddXb/tAAKHSxvX1RLeLlXvF4gS6Mshz+9xBTpWPbxT1dgCUQKDhzt2nz8VxNiCnf0DIJCjRnhdKmcGC09ibMH+O8HYgtvhNcYWLDxJIEespmOAqn+qAqymY/4BiRKRB3GaI9AAAAAASUVORK5CYII=","pinza_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAALCAYAAACQy8Z9AAABEUlEQVR42p2TrU7EQBSFvyEEgaqDjEKQhvAAI1agK1EIDOgKgh6/1ZsND7A1aGSfoGKegEwqUBPqRtUWAdPtDtvsz3UzOTnn3nPPFVom/fx9AUCZa6zvGFfhvBi/tUx6oooxYnUre4Cn5/v1r1IAtIs3lqbZIAgNhBo3EshPbXLGw90MlKLMNVkqqVYfg0hMgjG0teFipmhrM+Da2oBp+sJ5IbRM+hd1TWVdPBVZKtm3KuvIUsnSNIgpn4LQMcRiChCE5q+Pv6MdQHyyE/W3tH0JASbjMo7ZoRZseDredJnrf0ub8jj8V9Zhfcew/e+blMtPO4wQH0GanG8VGKfG+o7CebHu9CqBL7/zkrbFLw7/D1aikwvGhf4dAAAAAElFTkSuQmCC","pinza_volteada.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAALCAYAAACQy8Z9AAABB0lEQVR42pWTIWzCQBSGvyMoVB2kqmJppmgVIRUEtaAmZ+fJQlATRYNAoQgWFEFOTS6IBtmilqoqMonCdoLcUeBK4Tfv8t697/57uRNo5HtWqsu/tTxW60BXYhQkQq6FDjacznhIyZbBeKrgIgtUsGRLtAkBcJrufWCrTrRcsFoHR6cKmIGFXz+8j/o8qmgTUrpMZp3N/QlY9bOGIiBAyfesdPjZJVouVMFpurivbW3DrSgNHa9vGmmv8cTfs33TiRxJkeOyXFT7H1QL5lX7jSFOcDovV7V511cHnjn9jnd0bDM3ShXtOz0p00gBbKOS61Q25ineH64ffxauk21UVKP2V+32AuAfdCKE2bmOGxwAAAAASUVORK5CYII=","segmento_brazo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAGCAYAAAAPDoR2AAAAd0lEQVR42l2JoQ3DMBAA76OiIOMfwLNklo5gXuOADtCSzhBYVOARXsWWwh6ZflGrqIdOdwJQNAVATjPmA4DaXU5FU1weKwC0BsD+atDeIfG8xb5eObJZZ8nKdD+XXziOzTpSNEVOM/+YD6baXcwH5oMlK1+v3eUDJVk34RGQ3/sAAAAASUVORK5CYII="}},"comun":{"piv":{"piezas":{"pincho":{"archivo":"pincho.png","tamano_arte":[9,5],"tamano_logico":[27,15],"pivote_arte":[4,2],"nota":"Escorpión: pinchos que caen"},"veneno":{"archivo":"veneno.png","tamano_arte":[9,6],"tamano_logico":[27,18],"pivote_arte":[4,3],"nota":"Serpiente: veneno verde"},"roca_lava":{"archivo":"roca_lava.png","tamano_arte":[10,10],"tamano_logico":[30,30],"pivote_arte":[5,5],"nota":"Golem: roca de lava"},"fragmento_hielo":{"archivo":"fragmento_hielo.png","tamano_arte":[10,7],"tamano_logico":[30,21],"pivote_arte":[5,3],"nota":"Mamut: fragmentos de hielo"},"pluma":{"archivo":"pluma.png","tamano_arte":[10,6],"tamano_logico":[30,18],"pivote_arte":[5,3],"nota":"Pterodáctilo: plumas"},"burbuja":{"archivo":"burbuja.png","tamano_arte":[7,7],"tamano_logico":[21,21],"pivote_arte":[3,3],"nota":"Cangrejo: burbujas"},"tinta":{"archivo":"tinta.png","tamano_arte":[10,8],"tamano_logico":[30,24],"pivote_arte":[5,4],"nota":"Kraken: tinta"},"hueso":{"archivo":"hueso.png","tamano_arte":[11,5],"tamano_logico":[33,15],"pivote_arte":[5,2],"nota":"Rey de los huesos: huesos en arco"},"fuego_fantasma":{"archivo":"fuego_fantasma.png","tamano_arte":[7,9],"tamano_logico":[21,27],"pivote_arte":[3,4],"nota":"Rey de los huesos: fuegos fantasma"},"mininave":{"archivo":"mininave.png","tamano_arte":[13,6],"tamano_logico":[39,18],"pivote_arte":[6,3],"nota":"Nave: mininaves"},"laser_tramo":{"archivo":"laser_tramo.png","tamano_arte":[8,3],"tamano_logico":[24,9],"pivote_arte":[4,1],"nota":"Nave: láser rosa (tramo que se repite en horizontal)"},"rayo_tramo":{"archivo":"rayo_tramo.png","tamano_arte":[24,4],"tamano_logico":[72,12],"pivote_arte":[12,2],"nota":"Nave: rayo abductor verde (tramo que se repite en vertical)"},"aviso_sombra":{"archivo":"aviso_sombra.png","tamano_arte":[20,8],"tamano_logico":[60,24],"pivote_arte":[10,4],"nota":"Aviso: sombra roja con «!» (golpe desde arriba)"},"aviso_flecha":{"archivo":"aviso_flecha.png","tamano_arte":[12,9],"tamano_logico":[36,27],"pivote_arte":[6,4],"nota":"Aviso: flecha roja (algo viene por ese carril)"},"aviso_diana":{"archivo":"aviso_diana.png","tamano_arte":[13,13],"tamano_logico":[39,39],"pivote_arte":[6,6],"nota":"Aviso: diana roja (proyectil en arco)"},"aviso_linea":{"archivo":"aviso_linea.png","tamano_arte":[8,2],"tamano_logico":[24,6],"pivote_arte":[4,1],"nota":"Aviso: línea roja parpadeante (láser); tramo de 8 px de arte que se repite"}}},"files":{"aviso_diana.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAANCAYAAABy6+R8AAAAnElEQVR42p1SQQ7EIAgEsg/ws3Kg53rAR88eKgZteymJCcjMwESZHgLuiJxVee//HsG1EvVOVCuBCG9kgjsAAO6AO6yUmcf9K8FKuZ2dKJPZOx2tzfI0m/nR2rXuCIE7qNZlchAyMbzCHbJPmcAhFHWeJgFYmkMo16fZFBJW5bxvBmaPIcSqLHnfm/nscfP97Z0WYiYnkYzjL3/vD6DxrYTRglvVAAAAAElFTkSuQmCC","aviso_flecha.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAJCAYAAAAGuM1UAAAAUUlEQVR42pWPSQ7AMAgDh4ovh0eQR9NDKxQ1a+eEhI0xDAj3YML1RwygnbiUZ4bOKGaSwnCPJW+ytldPUDGTjG+Nte7d+daiuH5LjcoeJc12N9wxSz+CqkGDAAAAAElFTkSuQmCC","aviso_linea.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAACCAYAAABllJ3tAAAAGUlEQVR42mP839X1nwEJMJaVMSLzmRgIAADv5gQEb6xrLwAAAABJRU5ErkJggg==","aviso_sombra.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAICAYAAAD5nd/tAAAAWElEQVR42q2RQQrAMAgEV+kD8t7e43fdHySXFEIxxNLMzUUHUSBBG2R6ryi8S2nZ3EgJhSvJjnnOSNE/skiup2QPcnJDANDosG+qO6r7VmakyJcvryRz3QHKrCczHB7iUQAAAABJRU5ErkJggg==","burbuja.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAYAAADEUlfTAAAALklEQVR42oWOMQoAQAjDEv//59504CCarYWUQiNJenYqAVSLBSfrU6qjdc2yvX2RnBAFThYfDAAAAABJRU5ErkJggg==","fragmento_hielo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAYAAAAxrNxjAAAAlUlEQVR42mNggAI5r4r/cl4V/198//8/a8WN/zA+AzKAKXjx/f///S/+o7BhihnlvCr+n1rbznD9IwMGWH3gJkOogzpDfFIlA5NPXAJORQwMDAzxSZUMj7Z1MDK//MbT8IdflkFbQYRh9YGbcJqBgYFhy6IFDI+2dTAyMDAwMMLc6BOXgGIisiK4QphiZIXIihgYGBgAZfxTB/ltx3IAAAAASUVORK5CYII=","fuego_fantasma.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAJCAYAAAD+WDajAAAAN0lEQVR42mNgIAZs+H/i/4b/J/4jizERpQsGkE3A0OnPYI5dFzKA24+uAMPYjQwnUWisDkPmAwBWu0312r44ZwAAAABJRU5ErkJggg==","hueso.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAFCAYAAACTphZWAAAAXklEQVR42mPQUpH4v2JW1X8tFYn/DFgAsjzLvh0r4BJNXfMwNFy9/Zzh5d2DCJ3/vz34/+LOgf8rZlXhpLVUJP4zrphV9d/ByY3hwL5dDE1d8zCcUVeWxACTZyDFzQDsGktQRCrnmQAAAABJRU5ErkJggg==","laser_tramo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAADCAYAAACuyE5IAAAAHklEQVR42mP8f+HVfwY8gPH///94FbAwXHyNT54BAJpUCXerlLxnAAAAAElFTkSuQmCC","mininave.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAGCAYAAAAYLBS/AAAAsUlEQVR42mNgQAdWXv8ZrLz+1/78/x/GZsALrLz+w4DUrANwGl0jIwMDA4OUgsH/Z1JSDFIJZXCJ3B+vGSZziML5zxZ0MUg9e8bw7MEFRgYpBYP/7z5+/98+afX/dx+/wzE63y+i7H/7pNX/pRQM/jO2T1r9//ix0wwbnVQYtioZM1y+do/h+LHTDJZWpij0xnlWDFuPyTJcvnaPgVFKweB/blE1w/FjpxmIAWdO7GIAALklcZkqrTJUAAAAAElFTkSuQmCC","pincho.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAFCAYAAACXU8ZrAAAALklEQVR42mNgwAE+7Pj//8OO//8ZGBgYWJAFkRXxuzMwfNwJYTMxUAKQrSMKAACpNhRFomX2kwAAAABJRU5ErkJggg==","pluma.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAYAAAD68A/GAAAAWElEQVR42mNgIBIw4pJ4ceD/fwyF6IIwYBbgyCAjpMZw4dE6BkZ0RTDJJ+9uMbz5coWBgYGB4dufN4yMDAwMDFwsIv8N5IJQJGEKMKzhYhH5z8Ui8h+XmwFehyQOWGscMgAAAABJRU5ErkJggg==","rayo_tramo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAECAYAAACUY/8YAAAAOUlEQVR42mNkgIIL/x/8Z6AiMGBUYGRgYGBgQpfQZ5CnCo0BLvx/8P//////YTQMkMNHDg1GWgcRAMC4WFF96nQ+AAAAAElFTkSuQmCC","roca_lava.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAA10lEQVR42o2QsYrCQBRFz2QVLGRBhCCpJEWKhYWYysLC0jKVX7BdGqvU1vb+x3xCCoVUIXWKkMYBs7BIsEgXm51ZZS281Xtw3jtwBb9x3gcdT6KaVgAIDW3Wq39QpWrkIUM1rehpSCYpAOFybuZjbAMB8pB1YvcVdjJJOcY2kRySFyW+5wIwdWxkkuJ7LpbWRHLIPrziey55URq13i3ALPewjj6yKlUb3T08dWz0E4C30/l7u5x9PMA//U9kkjIZj8iLkqq+/NUTLgKjeaiovqCaVohXC78BI3toGyFDPcQAAAAASUVORK5CYII=","tinta.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAICAYAAADA+m62AAAAPElEQVR42mNgIBIwInNEBLT+I/PffLjGCBNjxKYAG2Ai1momYkxjYGBgYHrz4RojIUVvPlxjZKKar2FsANgiEVm4W2fOAAAAAElFTkSuQmCC","veneno.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAGCAYAAAARx7TFAAAAN0lEQVR42mNgIAIwwhh3/s/6D2OrMKYxYqi883/Wf2QA0wCjWbAZr8yQynDnP8N/GE2USUS5CQCk0ztrlLpG/QAAAABJRU5ErkJggg=="}},"escorpion":{"piv":{"boss":"escorpion","nombre":"Escorpión gigante","mapa":"desert","mira":"derecha","estados":{"reposo":"cuerpo reposo/reposo_b + aguijon reposo","cola preparada":"aguijon preparado (cola alzada)","aguijón clavado (vulnerable)":"aguijon clavado","herido":"cuerpo herido","derrota":"cuerpo derrota (boca arriba), sin cola"},"escala":"1 px de arte = 3 px lógicos; dibujar con vecino más cercano","piezas":{"cuerpo":{"archivos":{"reposo":"cuerpo_reposo.png","reposo_b":"cuerpo_reposo_b.png","herido":"cuerpo_herido.png","derrota":"cuerpo_derrota.png"},"tamano_arte":[63,19],"tamano_logico":[189,57],"pivote_arte":[0,18],"pivote_logico":[0,54],"emisivos":{"reposo":["#ffc0a0","#ffffff"],"reposo_b":["#ffc0a0","#ffffff"]},"nota":"Base: esquina inferior izquierda (pies). Entra por la izquierda, detrás del raptor."},"segmento_cola_g":{"archivos":{"unico":"segmento_cola_g.png"},"tamano_arte":[7,7],"tamano_logico":[21,21],"pivote_arte":[3,3],"pivote_logico":[9,9],"emisivos":{},"nota":"Segmento de la cola; pivote = centro"},"segmento_cola_m":{"archivos":{"unico":"segmento_cola_m.png"},"tamano_arte":[6,6],"tamano_logico":[18,18],"pivote_arte":[3,3],"pivote_logico":[9,9],"emisivos":{},"nota":"Segmento de la cola; pivote = centro"},"segmento_cola_p":{"archivos":{"unico":"segmento_cola_p.png"},"tamano_arte":[5,5],"tamano_logico":[15,15],"pivote_arte":[2,2],"pivote_logico":[6,6],"emisivos":{},"nota":"Segmento de la cola; pivote = centro"},"aguijon":{"archivos":{"reposo":"aguijon_reposo.png","preparado":"aguijon_preparado.png","clavado":"aguijon_clavado.png"},"tamano_arte":[11,8],"tamano_logico":[33,24],"pivote_arte":[3,3],"pivote_logico":[9,9],"emisivos":{"reposo":["#f0b8ff","#ffffff"],"preparado":["#f0b8ff","#ffffff"],"clavado":["#f0b8ff"]},"punto_debil_en_estados":["clavado"],"nota":"Pieza final de la cola; pivote = donde se une al último segmento. «clavado» = PUNTO DÉBIL (el juego añade contorno y flecha amarilla)"},"pinza":{"archivos":{"reposo":"pinza_reposo.png","abierta":"pinza_abierta.png"},"tamano_arte":[12,9],"tamano_logico":[36,27],"pivote_arte":[1,4],"pivote_logico":[3,12],"emisivos":{},"nota":"Pinzas delante de la cabeza; pivote = muñeca"}},"cadenas":{"cola":{"ancla":"cuerpo","punto_ancla":[3,4],"segmentos":10,"piezas":["segmento_cola_g","segmento_cola_g","segmento_cola_g","segmento_cola_m","segmento_cola_m","segmento_cola_m","segmento_cola_m","segmento_cola_p","segmento_cola_p","segmento_cola_p"],"tamanos_logicos":"22 → 14","pieza_final":"aguijon","nota":"La cola sale de la parte trasera-alta del cuerpo y se arquea por encima hacia la derecha."},"pinzas":{"ancla":"cuerpo","punto_ancla":[60,10],"segmentos":0,"pieza_final":"pinza","nota":"Dos pinzas: una en (60,7) y otra en (60,13) del cuerpo."}}},"files":{"aguijon_clavado.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAICAYAAAAvOAWIAAAAjElEQVR42mNkgAIrMY7/MLaDDB/DgSefYFyGY69+MDIwMDAwwhTu6oqDSx7ccoRBW02UQURNnaFt0gaGA08+MRx79YOR0UqM47+DDB+DtZIIw9F7bxjQAUz8wJNPDCxQK/4zMDAwlLW9RFF4dI42XCHMKShu/rDj//8PO/7/h4kh+4UF3RPIAJsYbQAAg0I97Wv/+6sAAAAASUVORK5CYII=","aguijon_preparado.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAICAYAAAAvOAWIAAAAsklEQVR42m2QoQ6CYBSFv98ZSM7ASCYiNiM4NRqMPILjITTzFgYfQjZsyoQ3sP7JxAjoCLRrgqFw0gnfPefeCx25liEMqIxFAMZd6LiyCRMtWV6rBuA/rToHUp0DOSwsiXxHylhadYdGjblfHni2SaoL0tOc97W/jop8p1eX6gLPNvH2T6ZbpdrkMNGsd0tSXbQgQJjoHxBAuZYhm9mkV3l7fcjyWg0e6VqGRL4jjR964ReTX1OzkOyi1wAAAABJRU5ErkJggg==","aguijon_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAICAYAAAAvOAWIAAAAhUlEQVR42mNkgAIrMY7/MPaxVz8YGbAAFpjCXV1xDAwMDAxtkzYwMDAw/MemgQWm8OCWIwxH771hYGBgYNi26DuDgAem4UwOMnwMB7ccYWBgYGCwVhKBS3zY8f8/huIDTz7BTYTRDAwMDPzuEA3ImligbsMw5eNOBgYBD0YUtzCSEhokAQCKGTahgiNykgAAAABJRU5ErkJggg==","cuerpo_derrota.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAAATCAYAAAAnMdWSAAACT0lEQVR42t1XMWvbUBD+JEoQIQ2hGOHBhGKMyahJNmpo8wOE6dAsHjKFTBlLloZszRA6FJPJP8BDaoopHoInOzhCeBKhpFCEKUVDESIUNxjhoa+DkfKsSNSyFUvtB49Dd+/u3Xd3D56ACLC+zBJaxuUfFmwUxOWnaxMyLv+Fkl9fZsm+kIZmDQEAmjVEmESi9g+LR/N2vqHfwLgd4fvwNwOMSLz+C+q8U3UvXuaeILOy9NfuPZT/Qu+8Xyfi9A8DZp7OZ1aWYNyOsJnnXX33qwk/vRdB+2bxn2Xkp77zZSFNvAfvC2k09BtctyoTe5u1Oi7aVwCA6umhbzxL13FWPYvE3y8/AKhpP5iZydMB/ZI42DtC6+O7e/qiKEAuv8LB3lFg4mpPw7ef9oP4OwUEQOhCSDxHFNNmAsc+iLCl6/cOSOVyvvqk2dWehkpdxVZmFW1j4NoV02ZYmnj19BDOsnTdXV6oPc0N7Hx7ZRx2Or9mrY4UhiiuEdR2C+MJ2C2gdbKDrcwqJJ4jDE2cJqr2NBRFwVdGhcemiV88H1k8Oj9ZzOO40sD7z3fdvn5dQPX8y93Yl4U0KUkbUxOUxXxkyXaaXbyQNyOLRRdSFvMT8TvNLrY/9V37h1IWbudL0sZUJDvNLpIKupB+edL240pjTF7iOdI62flnSM6Ly741HnuJ58ib51lc9i08y6Zc+T8Td3iyimkzby/6roKuTJBMekenkW1jMH7bOwVoGwN3hQmUdOnwofkpps0EPgElnvP9q3KuSBJBP2JoKKbt+8L7AyPqJVZTZ4k6AAAAAElFTkSuQmCC","cuerpo_herido.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAAATCAYAAAAnMdWSAAACw0lEQVR42u1Xv2vbQBh9EsYYY4wISihFpEYUhyYdTCkt2CX1FDpkCB26FDxmKqVD6ZBAt2ToVDJ08JC/wYMpJUNRQuzZQ+MSY4QJmmxhhBFBGGN1MHe9s+SftRMX8i3yx3fP9753d9I74C7uYqJYjwbcYfXkSsi9Tfw4ERh3YHIl5FpOh+YJOQLApgSkEP9XaSUKABzBeeLLrY4wSrRi3RHYXBhX8bQSxe7rpzQ3agYAQIkp2DsuIiYFsfd+h9bNyiUAQI6v4fAoBwBzxZdMG1IogJMvGd/GT/PnODjTORGE/sb7wYdHOeSqTXz/tEUnZOPbzysAQPbzG0qYjeyP35T4vPGsaABwUWmgoJtIqTI24stUSM1ooVh3BKG/cbNyiYtKAxvxZW7iE63smVjTLY44wS0aHgB2Xz3ics1oQWAbP82f02JBN8eemMUtEv7rrxbNPzyOenJx0MshpcpDX4BpVRpaXwR8+eNz1LMZ1LMZTw4AgeRKyN3fVD3qEeUHBVF+UNw2npx5VBoDc7FYd4SDMx0vt1/8NytPGo9JQd8tPyqIsPTMp5UoNyEZULPavkRZAn5EbwKfViVsPXvQW9EpBBDJd08zWnRC8nkAgLdP7vtuMUIothT23aI3gdd0C3J8beqVF1n30y8AeZZMmxJgiRACbANsIylVRkE3uQZmhSdPYoAmCSLsWA6vWHeE9WjA7VlKnvhfeypyFpUQZ62p5XRnjk+rEmrNa248+d3/ZGua0fJ6+37/y3tnmxOmZNoAALvThRIJYufhEnLVJmckqB2129iOSYhJIdQsB5puzQRPbO0kW97j8Ka51ZHLBACshkVXiQQpUSUS9Ai5Ghbdd4l7yFWbMOw2rq67M8OTHbu/qQ78TBIxfb39vwZpICGHka9ZHDm/BgfVp8VPeqsLzLL5Hpm2O6pOGpg1ftix9Ys/ELmONPiyF4gAAAAASUVORK5CYII=","cuerpo_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAAATCAYAAAAnMdWSAAAC30lEQVR42u1XMWvbQBh9MsYIY4wIiilFpEYUB5IllNLBLomnTBlChy6FdutUOmTIEEM3Z/CQIYQOGVryDzwYUzIUOcSasyQlJgg3aHKEEUYNwpioQ7jznSU7dmonKeQt8sfp6d77fHd6Ah7xiJEwFw97g8bTCdG7T/4wCA97YzoherbbofWCHAPgUAGSyD8qq8QBgBM4Sf5JqyPc1DS94QpsLQzb8awSx8c3L2lt1k0AgJJUsPFNR1KKYOPzKh23aqcAADk1i83tIgBMlH9kOZDEMPYL7wONV0qHyB8YXBOEXuO95M3tIopnTZTXl+mELL7+PAcA7H55SwWz2P3xiwqfNJ9tGgAc1y5QNSxkVBnzqWnaSM1sQW+4gtBr3Kqd4rh2gfnUNDfxvnbim1gzbE444T0EPgBUDQv5rQLKOwWuzq2tQzNbEFjjldIhfXDVsIaemOU9JH5+qwAsfQAqe8itrfvqUL/DIaPKAw/ArCoNHH8I/PJOAajs4U9d99UAEE4nRC+3qPq6RzrfD6Tz/XDffILf+9/pNuitQ3rDFfIHBpZWXv83/zwxnpQigUueBWucPQTpaZ9OiF5WiXMTkhvqdjtQKCsgSOhd8LOqhOVXz3wGh0HVsK73vN5wBc1s0QnJ6wEA3r14GrjEiKDkVDRwid4FXzNsyKnZWxkH0D3wghpArkeWQwWwQogA1gBrJKPKqBoWZ2BcfHIlAWgUkMYOlfD0hivMxcPedaTkhXfjaYiLqEQ4G01t92rs/Kwqod685O4nv3uv7JhmtvzZvjf/8tnZ4RpzZDkAAKdzBSUWwerzKRTPmt19aba6cdRpYyUpISmJqNsuNMMeC5/E2lGWvC/h3earjnxMAMBMNOQpsQgVqsQivkbOREPep4UnKJ41YTptnF9ejY1PVmxuUe37miTNDMz2/wpiYEGOolS3OXFBBvuN35Y/6lddeJzmr8W0vZvGiYFx8wdt2yD8BcAWn2oeV3r+AAAAAElFTkSuQmCC","cuerpo_reposo_b.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAAATCAYAAAAnMdWSAAAC10lEQVR42u1XsWrbUBQ9MsKIYIwIiilFtEYUB5IllNLBKYmnTBlChy6FdutUOmTIEEM3Z/CQIYQOGVryBx5MKBmKHGLNWZISY4QbNDnCCKMGYULUIbyX9yTZtVM7cSFnkS5XR/ecq6enK+ABDxgIM0nR75XPpiT/Pvn9QOz3wmxK8h3vksZzSgKASwXIEn+rnJoEAE7gKPkn7Uvhb00zmp7AxkK/Hc+pSXx4/YLGVsMCAKhpFetfDaTlONY/rdC8XTsFACiZaWxslQBgpPwj24Usidgvvos0XikfonBgck0QgsaD5I2tEkr1FvbWlmhBFl9+nAEAdj6/oYJZ7Hz/SYWPms82DQCOa+eomjbmNQWzmSnaSN1qw2h6ghA0btdOcVw7x2xmiiu8r5+ECuumwwknvHHgA0DVtFHYLGJvu8jF+dU16FYbAmu8Uj6kN66adt+FWd448QubRWDxPVDZRX51LRTHum0O85rScwPMaXLP/Djw97aLQGUXvxtGKAYAMZuS/PyCFuoe6Xw3kM53w33zCX7tf6OvQTCOGU1PKByYWFx+9d88eWI8LccjlzwL1ji7CdLdPpuS/Jya5AqSCxpOJ1IoKyBK6F3wc5qMpZdPQwb7QdW0r995o+kJutWmBcnnAQDePn8cucSIoPTkROQSvQu+bjpQMtO3Mg7gZsOLagA5HtkuFcAKIQJYA6yReU1B1bQ5A8PikyMZgAYBaWxfE57R9ISZpOhfj5S88JvxNMaNqEQ4O5o63tXQ+TlNRqN1wV1PzoNHNqdb7fBsH5x/+dnZ5RpzZLv03L28wnJaRlqW0HA8WgAALLcDNRHHyrNJlOotOqMPg0/G2kGWfGjCu81fHfmZIHgyEfM/zj1Cqd6C5XZwdnElsDk1EadmEmIMw+STFZtf0Lp+JkkzI2f7f0VQICuezc8pEyg3nK752/IH/asTh2n+WkyHGuiWHxW/12sbhT/Ab6U0VbKWsAAAAABJRU5ErkJggg==","pinza_abierta.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAJCAYAAAAGuM1UAAAAo0lEQVR42oWQIQ7CQBBF3zYrqpAbBBpFOEAVsqfgHBswSE7AASoqq1cSmu4JVqERTSWqblGTlLBZvpr8eTPzM/BHlSljdJf4OO5jZcqol43UwNBY+rbDhREALfDQ2OSFJQygBO7bLjngwsj99QbAT7PSufwC+2lW4hU5OKUC4Hy6fUEujNS7NamHKDEOm9XPNsl+rbdY98RPs1K5t0r2ypRR6g8kKUlEKOOD7QAAAABJRU5ErkJggg==","pinza_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAJCAYAAAAGuM1UAAAAiElEQVR42mNgIAJYiXH8txLj+M/AwMDAgiyIS8PRRRUM1VXTGBgYGP6zwBQfXVSB0waoYgYGBgYGRpjiw8vWYVW848oLhgNPPjEwMDAwHHv1g5EFn9thio+9+sEIE2PCpxgbYEJ2I0zRjisvGDx0JLBqYIR52kGGD0MS3TlwDbiCFV0xAwMDAwDX+zZp3nQ87gAAAABJRU5ErkJggg==","segmento_cola_g.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAYAAADEUlfTAAAAcElEQVR42mNkYGBgsBLj+M+ABo69+sHIaCXG8X9ZijlccNaO6wzWSiIMrYfuMTBuDdH6f/TeGxRdaR6aDFdvvWZg/LIgDcPIg1uOMBy994aBBcawVhJBoRkYGBgYrcQ4/lfbKTGgG33gyScGRnyuBQBCyjF0efhDzAAAAABJRU5ErkJggg==","segmento_cola_m.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAGCAYAAADgzO9IAAAAa0lEQVR42mNkYGBgsBLj+M+ABI69+sHIYiXG8f/oogoGBgYGhsPL1jHsuPKCgYGB4T/j1hCt/0fvvYGrrsoLYGibtIGB5ei9NwxVeQFwibZJGxgYGBgYGK3EOP47yPAhW8Fw4MknBkZclgMAz60idGAjvy4AAAAASUVORK5CYII=","segmento_cola_p.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAXElEQVR42mNkYGBgsBLj+M8ABcde/WBktBLj+O8gw8fAwMDAYK0kwtB66B4D49YQrf/2PjYMDAwMDG2TNjBYK4kwMFqJcfyvtlNiOHrvDQMDAwPDgSefGBixmQkAvUkY5ida0JEAAAAASUVORK5CYII="}},"golem":{"piv":{"boss":"golem","nombre":"Golem de lava","mapa":"volcano","mira":"izquierda","estados":{"reposo":"cabeza reposo + nucleo reposo + puno reposo","lanzar roca":"cabeza enfadado + nucleo brillo + puno cerrado + roca","puñetazo":"puno cerrado bajando","puño apoyado (quema)":"puno ardiendo","herido":"cuerpo herido + cabeza herido + nucleo apagado"},"escala":"1 px de arte = 3 px lógicos; dibujar con vecino más cercano","piezas":{"cuerpo":{"archivos":{"reposo":"cuerpo_reposo.png","herido":"cuerpo_herido.png"},"tamano_arte":[45,33],"tamano_logico":[135,99],"pivote_arte":[22,32],"pivote_logico":[66,96],"emisivos":{"reposo":["#ff9a2e"]},"nota":"Pivote = centro de la base (cadera). El núcleo va encima, en (22,18)"},"nucleo":{"archivos":{"reposo":"nucleo_reposo.png","brillo":"nucleo_brillo.png","apagado":"nucleo_apagado.png"},"tamano_arte":[9,9],"tamano_logico":[27,27],"pivote_arte":[4,4],"pivote_logico":[12,12],"emisivos":{"reposo":["#ff9a2e","#ffe066"],"brillo":["#ff9a2e","#ffe066","#fff08a","#ffffff"]},"nota":"Núcleo brillante 28×28 lógicos; pivote = centro. «brillo» al cargar ataques, «apagado» al recibir daño"},"cabeza":{"archivos":{"reposo":"cabeza_reposo.png","enfadado":"cabeza_enfadado.png","herido":"cabeza_herido.png"},"tamano_arte":[19,13],"tamano_logico":[57,39],"pivote_arte":[9,12],"pivote_logico":[27,36],"emisivos":{"reposo":["#ff9a2e"],"enfadado":["#ff9a2e","#fff08a"],"herido":["#ff9a2e"]},"nota":"Pivote = cuello (centro abajo)"},"pierna":{"archivos":{"unico":"pierna.png"},"tamano_arte":[11,17],"tamano_logico":[33,51],"pivote_arte":[5,0],"pivote_logico":[15,0],"emisivos":{"unico":["#ff9a2e"]},"nota":"Dos piernas bajo el cuerpo; pivote = cadera (centro arriba)"},"segmento_brazo":{"archivos":{"unico":"segmento_brazo.png"},"tamano_arte":[8,8],"tamano_logico":[24,24],"pivote_arte":[4,4],"pivote_logico":[12,12],"emisivos":{"unico":["#ff9a2e"]},"nota":"Eslabón del brazo-cadena; pivote = centro"},"puno":{"archivos":{"reposo":"puno_reposo.png","cerrado":"puno_cerrado.png","ardiendo":"puno_ardiendo.png"},"tamano_arte":[19,12],"tamano_logico":[57,36],"pivote_arte":[16,6],"pivote_logico":[48,18],"emisivos":{"reposo":["#ff9a2e"],"cerrado":["#ff9a2e"],"ardiendo":["#ff9a2e","#ffe066"]},"nota":"Puño 56×36 lógicos; pivote = muñeca (lado derecho). «ardiendo» = puño apoyado: QUEMA, no pisar"},"roca":{"archivos":{"unico":"roca.png"},"tamano_arte":[10,10],"tamano_logico":[30,30],"pivote_arte":[5,5],"pivote_logico":[15,15],"emisivos":{"unico":["#ff9a2e"]},"nota":"Roca que lanza (y que el raptor devuelve con el rugido)"}},"cadenas":{"brazo":{"ancla":"cuerpo","punto_ancla":[4,10],"segmentos":5,"piezas":["segmento_brazo","segmento_brazo","segmento_brazo","segmento_brazo","segmento_brazo"],"pieza_final":"puno","nota":"Brazo izquierdo (hacia el jugador). El derecho puede ser igual y quedarse quieto."}}},"files":{"cabeza_enfadado.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAANCAYAAABLjFUnAAABX0lEQVR42p2TP0tCURjGf1ccRO5wiMvlYiJncJBo8AM0NDgENTZE+AGCFgeJpsYWoc9gQ9EHaJAmcYoGcVBwkLhJhIjIHS5yiYu3pSPeP4b0wOHA+573eZ/34T0aCcgJERyW93g4d2O53asxX46jJdWloyQAtxdn3D09c/9+EiswxBwgAGKk2jqR0LOk0ym2ge8vcdxFiHBV6X17CF3HcRfomSy+v8T3l1QrB6ujYiVZwPU8pGWyk80EoTFzQgS10yMA2r0hfXtM3jD4nM0AaLY6ALieR94weO0P2ZcFeiOb+cLTEj1rtjoM+rXQOI16F2mZ2JMpH6PrUO648ggjO1CjbmWQPZluFQ8pk5bJZfUFaRkhtUpZo979s2k63m32e6YxBco7aZnJZMr8dm8YKhzcGBsVNN5KK+J1pKIebOoahXpXLsrVsms5IYJyUSaarLyK3lGo5dXWv9F/oVbjByBipAqD3AUdAAAAAElFTkSuQmCC","cabeza_herido.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAANCAYAAABLjFUnAAABIElEQVR42p1TMUsDMRT+IplEJEM4wumQoUPplNmhdOzg6CBOjo5O/gRHf0M7FPoDHDqW/oKbSgeR4FCO45AMxfVczPXykkPxg/Agee/L+77HY0ggF6KZmBEWd4fo7eLpA3vnWKqOUxIAeH64xcvyFfP366hAik8AaABEpKxLJM5OwfkJ/oJLKVG82YAw6Ox+OoYta2glfyWbrTZpmbkQzePNFOtiBwBYF1tolcGWFSZm1H7QvU8h0uQTj7Em8UhkBrr1OZJpywrmPCQ3ZthKom8F6TAg0yqDUDLwbLbatNLM1TgkI77xWGb9c6pIuu9QqyzpGafm+0IqqU967wBsWfX+SuHzukNguRCNGejkuL1XNFK4wxf2zjHWXaP/wm/BN2JRhzGY+Z1CAAAAAElFTkSuQmCC","cabeza_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAANCAYAAABLjFUnAAABK0lEQVR42mNkwAKkBAT+OxhoMSyN+oIhJ132iOHZhw+M2PSxoBvCwMDA0JYRwdC3YgvDwns+GBpEBN4xMDAw/GdgYMAwlBHZIAEeLgYWFiYGYoCMiAjDhTsPUAxEcVmChx3DgxdvGBQkRAgatmDHIezelBIQ+F8Q4sFw4MINhgcvXqEocDDQgltw4MI1vBaguOzBi1cMV+tQXZW9CUIfuHANQ857FhMDw50H/2FeJRhAChIiGK5FthynyxQkxBiyN4mghNmCHYcYFCTEGB68eMXQfUoLzbhDuA2D2PYGil9huAAW6AoSYtjDDDnwkTWihw8y6D6lgTU2mdDDAJetmGEJUWegogBP7IxSAgL/DVQUsAYyLKzQaXTw4cs3hmcfPjAyImcjcgEsaQAAPTqBXuQ/WJkAAAAASUVORK5CYII=","cuerpo_herido.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC0AAAAhCAYAAABN2CLhAAAD10lEQVR42u2YMWvbQBTH/zaegjEahBDBGGE0BONBZCwmZAilU8nQoUM+QIcOnUo/Qcd8howZM2QImUSGkKGDCMZ4CEUYE4TQcAThqbQdlHe+k+6kc9wOhR6Ew5Lu3e/+9967dwH+t3+87VrWr79lu6Ob8JGx1jZgVncHALTvTezrWDoqANvqShOKg8TvPr17o50sTjIAgOfalXdnVzda++U5DoMRwmgmfduij75+eM8HfV8kAIDhwMXp+SUylkMFSmAvbZ5r4+zqBixfSc/LLMOBCwC4vrtHGM3QIuDviwQPjyn8XUfqAWAaL9C3bRwGe1uDNi3g88lbXN/dVzj8XQcXt98w9gZonX358Ov67r7R6DRe4ORo8leg4yRDnKQcuImjbWJ0Gi8w3vmJs6ubPw5NwEHPjAOAGfTYG2C6aiPoAXGSSv68TS8CT1ftRpXH3sAcmlYIQFJke/C1wn3bhr/rmCl9en5ppDQAsB2nMWusd0Ludd8BQPDqAHGS4uL2mySQVumM5fzD8gDxeRGExUTWKsVhsFcLbHW7WnD6Le6a5zr48eNnZV5Vz/P084Gy9mFhASdHE4TRfH3arVJET8VEIsjY95QKLZMMLM8r3we9QmXRdpyk6HT0XpuxvMjT4oERRnMsswwnRxPpWVmpoAdYwxEPJh0wANxN5+jbNgen8eWFiznbc+0KCx1EHRVYWVkVMBkPoxnGvodljZ/3bRvLLEPfLmBE97BcuxIjlFkAYDLeQxjNJRdT7kMdsBg8zzWEUSNwqkUoqFW1ibqGceqh9UetU/u7ri2zjG8xuYhQPBkcQoLSge9pldW5hjUc8S2zut1a1xCVLkrWrqRu0GtWWxQo8D20o4dYmb7qVkqTeK4DlufoG0xKSh9P9vmWm7qIOH/0EJu5hyqv1h0cdUqLym3iIkY+LSvrSAFI7kTPl0nGlWxSWhnUPZOALGWP8krJd0VDnutwXy4rwPKcZwcCpD8R+OPx68qCTV1EUvqRsRbLV3yQynebbioq8LLCInAluEqnok5plq/wyFirIwKG0Yxvl4mhMoDn2jie7COM5mD5CseT/cbc3/ROFTsdXXCYF/GpNI52I/AHtTA0zlQQ7Yn4EmC5vk6NLr2qmNlE6Ur2EF1DVxtT77kOoqei6iN4GTxVPlsfULNa++I8jf+sMTEkgVOZ+QweCVuvAhaD3HSeWqWt4WijQohfDIYjnr7Eu6TokwS8abFVVrpdjeTZi27VYTQrwF4dIHoqwA+D0dbVYaNP04q26amKowtCOVbo/UvsU+PXrcD3Ns4em5a129qnw+U30yv4S8akCbkAAAAASUVORK5CYII=","cuerpo_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC0AAAAhCAYAAABN2CLhAAAD6klEQVR42u2XsWsbMRTGPwdPxYMp4jiCMaLcEBxDTWYPGUIpFEqGDh0yh4A7dCqlg4cMWQL9Azpl7FhMAyHTkaGE0OEaYuMhlMOYcBwi3HBkKmkHV4p0J93JcTsUKjDCd9LTT5/ee3oH/G//eFuu13/+LdtV04JXSVJZBKxeewAAxvc29k0sVR0AqdeUBeVJ8rjXL54aFwsjBgCgLsm9Ozg6MdrPrrHeacEPRsrYCh+0t/NSTPo+iQAAj5ou3n/8DJak0IFysPs26hIcHJ0gSW+U51mWR00XAHB8eg4/GKHCgb9PIlxexfCWHaUHgItwggYhWO+sLAxatoE3W89xfHqe4/CWHXz68hVt2kTl4O3Oz+PT81KjF+EEWxvdvwIdRgxhFAvgMo4lG6MX4QTf3j3EwdHJH4fmwMM+seIAYAfdpk083rvGsE8QRrHiz4v0MvDjvetSldu0aQ/NdwhAUWRx8DuFG4TAW3bslH7/8bOV0gDw7MNSada4Owm1N40DgP2zFsIoxqcvXxWBjEqzJBUDsxPk57MgnC10uH2L9c5KIXC9VjOC8//yqVHXwY8ft7l1db3I078vFLEjeQNbG134wVj8P9y+xeouA3UdBaTtUa1C04ghSdPc+GGfYP+spdgOoxjVqtlrWZLO8rR8YfjBGFPGsLXRVZ5llRr2CXoDRwSTCRgATi/GaBAiwPn87MblnE1dkmPhF1FVB5ZVVgfMjfvBCG2PYlrg5w1CMGUMDTKDkd2jNyC5GOGZBQC67RX4wVhxMe05FAHLwfO7hrBqHJzXIjyodbWJvoZxiqHNV61T+L+oTRkTR8xdRCqeLC4hSemOR43KmlyjN3DEkdVrtULXkJWelaw1Rd1hn5SqLQvU8SiWgstQm76KdsoXoa6DJE3RsFiUK73ZXRNHbusi8vrBZWjnHrq8WnRxFCktKzePi1j5tKqsowQgdyf+fBoxoWSZ0jr7Ni6Syx7ZnXLflQ1R1xG+nFUgSVORHTgg/8nArzaf5DZs6yKK0ldJUknSGzFJ57tlXyo68KzCMnAWJHsrmpRO0htcJUmlKgP6wUgcl42hLAB1CTa7a/CDMZL0BpvdtdLcX/ZOFztVU3DYF/GxMo+fRsdrFsLwebaCGG/E+wCr9XVs9dGri5l5lM5lD9k1TLUx76nrYHWX4XD7VsCr4LH22d0FNSq0L69TCF1WzMs9P+LVXSY2LH+SmYDlILddpxC6N3DmKoS4wd7AEekrCy6Xo/cptkqV5kc2b/ODEcIoxv5ZC6u7DMM+wXqntXB1WOrTfEeL9LyK4x8I2Vjh7+9jnzfxudXx6NzZY96ydlH7/HL5BdDxLQ4q4MHSAAAAAElFTkSuQmCC","nucleo_apagado.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJCAYAAADgkQYQAAAAQElEQVR42mNgQANRWlL/0cUY8Ukuu/aMkYGBgYEJlwJkcSYGIgAjLlOQARPMXlxg2bVnjERZx4TsC1y+YyAmnAAKaRWqiVbv8gAAAABJRU5ErkJggg==","nucleo_brillo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJCAYAAADgkQYQAAAAdklEQVR42mNkQAL/Z+n9h7EZ0y4xwthMKArcLCAcNwsUDUwoCnadYGAIi4HQyAr/z9L7//9B2v//s/T+///Q9f////8QGkmcEa46LIaBgb8U4cCP3QwMq5YgucnNAiLwsRtVAcyNWK1E4jOgex+uEE0BIzHhBABXnmakZv1zWgAAAABJRU5ErkJggg==","nucleo_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJCAYAAADgkQYQAAAAWUlEQVR42mNkQAL/Z+n9h7EZ0y4xwtgsKArcLJA0MPyHKWTCpoCBgYGBwc0CbjIjVgXIYNcJiEmEAHGKGNMuMTLsOoHTKsa0S4xMcO+iK4QqYGBgYGAkJpwAGy8lZs/I03IAAAAASUVORK5CYII=","pierna.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAARCAYAAAAL4VbbAAAA3ElEQVR42mMU4uL472JmxIAPnLhyg+HLt28MTAwEwIkrN+BsJlwSMCAjIoKp+MmLNygaYPwnb95gUfzmDcPDNhkGGRERhMIXb7CbDANHizgYZCQQCrCaLCMiwmDd9wOvm1kwTZCBOwOvydicgtPN2JyC1WRkEL6MB+4UnCbDTEEOY4ImIytANplRiIvjv4acHIoCHQU5hisPHqEY8OXbNwYWDjYOhgAb1FR34MINhpwANzh/wY5DDH/+/GNg1JKR+q8gIcbw4MUrBkI0o5SAwH8BHi5CKZXhw5dvDADaqnDroujDAgAAAABJRU5ErkJggg==","puno_ardiendo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAMCAYAAACA0IaCAAABRElEQVR42p2TsUtCURTGfzcaIhwu4iAvEGmKh5ijRIM0ODk0xYPWeDQ7NLgEDY7+AW4t4djg5OQUDg36EMcQB3F4xB0erbfheW89s4f1weXynXPPOfB956K7Zc03GO5Iqbed394D7JuA8APhSKkNf3w7YxODUQBE6G5ZH90tEg2FHwhhAo6Uun3rAdDp9SkVC0znix9302vQ6fXtHaqIpVICQJhGtYrLdB5PyxwcUsznduamoXCk1DmZYdLK8l+ctt8JVRRr1vQa3A9XHBfyDEYB81WIf3lhdUrjMfqxAbWKuxYWnl9eAVDRh9UujZs6gFrFZW84nlGvlgEoFQsAPNxcWRMAzksnCW7ygNVtOJ5hNTNubcOkleX6KbM1b+pCFX25mWpCvQqDUar4S6XiPbNbXK/+3cr1kMTSbn6NXSH8wPb4BBe0vQqMIp5ZAAAAAElFTkSuQmCC","puno_cerrado.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAMCAYAAACA0IaCAAABH0lEQVR42pWTIWvDQBTHf1cixqgIJWJUlDBZyqicLBNTFVMjMDvGdOXMYGIyH2PkA0RFRUZ2IVRNHBFhIuLEUZuZ5biuuUHPPP533O/97957Asea+n7nOmuUEkP7ngvw/hwNguIkBeiGwMIG9YA4SVmEMypZO+MmWhMnKa3SBihsUFaUVLJmfHZOeBFQyRrAqQEqWRug9xf0+TL59aqBifXAY/2aXxog0B382SKc8fAB8rvl6e4GgKwonfqrKY1bAG+1nJMVpZ0Bpff2Zzt1b6CSNavlnFG+3XF7fWUOAN4e700R/tO2gXy7Q0x9vwv8sclw6urvtUozapQSrdKmikrvT4p2NQ/6zHa4idZON3YfHvXZ0AQE/tgJa5UeHK0f9TLOBtmPBx8AAAAASUVORK5CYII=","puno_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAMCAYAAACA0IaCAAABDElEQVR42p2TIU/EMBTHf71MEDKxXCYIYlmQl4WcRF4QKATyEjxBIzE45D4G2QeYmkLOskwimokFUVHRYIeALuWuDReeefm3ye/9+/qeIBCnSTKF7kathe88CgGe77deUFnVAJMPLFyQBZRVTZFn9HII5oftNWVVo7SZgcIFNW1HLwfio2Pyk5ReDgBBDdDLYQZGu6C3x+WPVwMsnQfu66fXsxkITL96VuQZty8gPxR3N5cANG0X1O9jN7sFiDbrFU3buRXQ5tNtdlBbA70c2KxXCPeZNq4uzg/W1oDS5huWJjFFnvHfsJ+wGLUWSpu5gtuDvwC7v7mwg+cDHpL35sy3AWkSB10pbbyr9QVXecwHUs1Z5wAAAABJRU5ErkJggg==","roca.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAA10lEQVR42o2QsYrCQBRFz2QVLGRBhCCpJEWKhYWYysLC0jKVX7BdGqvU1vb+x3xCCoVUIXWKkMYBs7BIsEgXm51ZZS281Xtw3jtwBb9x3gcdT6KaVgAIDW3Wq39QpWrkIUM1rehpSCYpAOFybuZjbAMB8pB1YvcVdjJJOcY2kRySFyW+5wIwdWxkkuJ7LpbWRHLIPrziey55URq13i3ALPewjj6yKlUb3T08dWz0E4C30/l7u5x9PMA//U9kkjIZj8iLkqq+/NUTLgKjeaiovqCaVohXC78BI3toGyFDPcQAAAAASUVORK5CYII=","segmento_brazo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAm0lEQVR42mWPKw7DMBBEn6OCyCqyDAIswyo4IKA4Z+vZeoCC0FoLDFZFkVXmgnxaqUt2pbczmjEAzrYVYBoHJCtzSgC8ytsYZ9s6jQMAkpXQeQDuj5mlFE5sI1kR1fXeNkCz24oqz1sgdJ7gV5c+Rsy1v9T9O3QeyV+1qNLMKa1A9Q8upWCcbevZ2gME748MSymY35p9jIdyr/kBTaFLTkEjBMkAAAAASUVORK5CYII="}},"huesos":{"piv":{"boss":"huesos","nombre":"Rey de los huesos","mapa":"graveyard","mira":"izquierda","estados":{"reposo":"craneo reposo + mandibula cerrada + escudo cargas_3","mordisco":"craneo mordisco + mandibula abierta","cráneo apoyado":"craneo apoyado","escudo activo / roto":"escudo cargas_3/2/1 → roto","herido":"cuerpo herido + craneo herido"},"escala":"1 px de arte = 3 px lógicos; dibujar con vecino más cercano","piezas":{"cuerpo":{"archivos":{"reposo":"cuerpo_reposo.png","herido":"cuerpo_herido.png"},"tamano_arte":[40,24],"tamano_logico":[120,72],"pivote_arte":[20,23],"pivote_logico":[60,69],"emisivos":{},"nota":"Patas, costillas y columna. Cola desde (38,6); cuello desde (4,3). Pivote = centro de la base"},"vertebra_g":{"archivos":{"unico":"vertebra_g.png"},"tamano_arte":[5,5],"tamano_logico":[15,15],"pivote_arte":[2,2],"pivote_logico":[6,6],"emisivos":{}},"vertebra_m":{"archivos":{"unico":"vertebra_m.png"},"tamano_arte":[4,4],"tamano_logico":[12,12],"pivote_arte":[2,2],"pivote_logico":[6,6],"emisivos":{}},"vertebra_p":{"archivos":{"unico":"vertebra_p.png"},"tamano_arte":[3,3],"tamano_logico":[9,9],"pivote_arte":[1,1],"pivote_logico":[3,3],"emisivos":{}},"bracito":{"archivos":{"unico":"bracito.png"},"tamano_arte":[6,5],"tamano_logico":[18,15],"pivote_arte":[5,0],"pivote_logico":[15,0],"emisivos":{},"nota":"Bracito bajo el cuello, en (6,9) del cuerpo"},"craneo":{"archivos":{"reposo":"craneo_reposo.png","mordisco":"craneo_mordisco.png","apoyado":"craneo_apoyado.png","herido":"craneo_herido.png"},"tamano_arte":[27,11],"tamano_logico":[81,33],"pivote_arte":[25,6],"pivote_logico":[75,18],"emisivos":{"reposo":["#b0ffc8","#ffffff"],"mordisco":["#b0ffc8","#ffffff"],"apoyado":["#b0ffc8","#ffffff"],"herido":["#b0ffc8"]},"punto_debil_en_estados":["apoyado"],"nota":"Cráneo 80×34 lógicos, con corona y ojo verde; pivote = unión con el cuello (derecha). «apoyado» con el escudo roto = VULNERABLE a pisarlo"},"mandibula":{"archivos":{"cerrada":"mandibula_cerrada.png","abierta":"mandibula_abierta.png"},"tamano_arte":[23,4],"tamano_logico":[69,12],"pivote_arte":[21,0],"pivote_logico":[63,0],"emisivos":{},"nota":"Mandíbula 70×12 lógicos bajo el cráneo, en (2,10); «abierta» = baja 4 px de arte al morder"},"escudo":{"archivos":{"cargas_3":"escudo_cargas_3.png","cargas_2":"escudo_cargas_2.png","cargas_1":"escudo_cargas_1.png","roto":"escudo_roto.png"},"tamano_arte":[61,45],"tamano_logico":[183,135],"pivote_arte":[30,22],"pivote_logico":[90,66],"emisivos":{"cargas_3":["#b0ffc8","#ffffff"],"cargas_2":["#b0ffc8","#ffffff"],"cargas_1":["#b0ffc8","#ffffff"],"roto":["#b0ffc8"]},"nota":"Escudo de almas (elipse) centrado en el pecho; un orbe por carga. «roto» = discontinuo"}},"cadenas":{"cuello":{"ancla":"cuerpo","punto_ancla":[4,3],"segmentos":4,"piezas":["vertebra_g","vertebra_g","vertebra_g","vertebra_g"],"pieza_final":"craneo"},"cola":{"ancla":"cuerpo","punto_ancla":[38,6],"segmentos":8,"piezas":["vertebra_m","vertebra_m","vertebra_m","vertebra_m","vertebra_p","vertebra_p","vertebra_p","vertebra_p"],"pieza_final":null}}},"files":{"bracito.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAFCAYAAABmWJ3mAAAAM0lEQVR42mNgQANaKhL/V8yq+s+gpSLxX0tF4j+yoJaKxH+GF3cOwDlwQZgqZEkMc9EFARevJAXSSGVGAAAAAElFTkSuQmCC","craneo_apoyado.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAALCAYAAACOAvbOAAABfUlEQVR42q2TP0gCYRjGf9efQTCtSZFIQyeJhhpqCBIHcWtvEHE0aJKGhAoHCQNbo+AIacg2h5YbjnNsdMgCFUzCvMHBydGGuPPUO+nfAx/v+x3P9z7f83wc/BDBgHugLSvcXx8PjDztrGAc8h2x59qH3quNMoos6ftQOILL4xuSbV6KN2kyOZFqvSPMakLiVZYlxzyHBwnLmr28g/4baquC3SbwWHoAIJnKc3F+iiJLrK1vorab2BcWUVsVfKt+vB4H1ZfamRAMuAfG206D2ijrvSJLJFN5AMSeQsIZAqDbeUVtNyfOKrLEnNWgUDhiKWqMTuwp7LE1FLR5gaYpf8ZsUDKVH81+DMaLJJwhSjzpzqbx9RiNzlwen2kU49B4wY0o3V5/IiFLZ9oHRZZQ282RvVXVeN1en+JN2lRowtnJUYL/wPg7a2+vyBKZnPjlbHsnTOu9/efq8u+aJqD9Z0Iw4B7E96PEYnEKhdtfV4CVZY/uKpMT9b5a7wgAn7xrB+aXgHZ3AAAAAElFTkSuQmCC","craneo_herido.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAALCAYAAACOAvbOAAABUklEQVR42q1TPUvDQBh+Il06dUwJYgN2yujkIBg6lP4DQaSUDA6ZQwcLDhkz5AdYCNLJ/gPJEC5/wK1BaANRJE2GDJkyxkHuTPOhVn3geN/37rn34zkO2BNSv5vT1YSHu5u8yKN3uX0LrdZbFse+C+LYLJYHQ/CC+Hmh3cNyPoNuWPA2EdeiSX5SbLXeAtkL4jAAL4iskKqZ8J4eQRwbF1fX7Dz2XciDIQBAN6ycK3f7FWLfZT5xbKiaWeEk0TPiMKjsE8dGqykR7agORemslDBf6chAuwcgqOUf1CVSNXNX+xKKjSgdma3v+EzG4mS8INZKUQblSScjJGlWUahxMrpBHBtxGOzETZbykjTDcj6rLVSZ7Haq4D9Qfmf69sSxoRvWx2SnZwO8voV/tvzxea0C9J9xUr+bTy5HGI8nWCzuf20B4OhQYFPphsV8bxNxAPAOs4n8fYoZeBcAAAAASUVORK5CYII=","craneo_mordisco.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAALCAYAAACOAvbOAAABXElEQVR42q2Tv0sCYRzGPxcuTo4nEink5NhSQ9DhIG6NQYSIQ4OzNCQ03HiDf0DCEU45tsUNx+vY0qYEKljE6Q0OTo7XEO/rrzvJ6oHj+37vnu+P53k52BG5bDKQTxQe72+DZZ6s1XYd1O2PVe4POwjXUbmRL6CnMouCeJp2s45p2fQGEy0mm/xkWLc/hvk7vjdCT2XUoGqtQe/1GeE6XFxdq+/+sIORLwBgWnagrW+7Df6wo87CdajWGgDYM0ElYQAwnbzhe6ONWuE6xKIayY3CsGydPROcc7wYGE8Do1D+Xlijaq2x6v0alhepJAyeeFHKtvGVjcvK9FQm1Ip1SF7uqMh0Nt9wKFKZfCFcB98breRRUfKmszntZj100Iayu5sK/4H1e5Z3L1wH07K/lZ2c5vn49P4c9cOzUAfkf6blssmgfFmkVCrTaj38OgIc7KeUKtOy1bk3mGgAX4ODAypZlNfJAAAAAElFTkSuQmCC","craneo_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAALCAYAAACOAvbOAAABXElEQVR42q2Tv0sCYRzGPxcuTo4nEink5NhSQ9DhIG6NQYSIQ4OzNCQ03HiDf0DCEU45tsUNx+vY0qYEKljE6Q0OTo7XEO/rrzvJ6oHj+37vnu+P53k52BG5bDKQTxQe72+DZZ6s1XYd1O2PVe4POwjXUbmRL6CnMouCeJp2s45p2fQGEy0mm/xkWLc/hvk7vjdCT2XUoGqtQe/1GeE6XFxdq+/+sIORLwBgWnagrW+7Df6wo87CdajWGgDYM0ElYQAwnbzhe6ONWuE6xKIayY3CsGydPROcc7wYGE8Do1D+Xlijaq2x6v0alhepJAyeeFHKtvGVjcvK9FQm1Ip1SF7uqMh0Nt9wKFKZfCFcB98breRRUfKmszntZj100Iayu5sK/4H1e5Z3L1wH07K/lZ2c5vn49P4c9cOzUAfkf6blssmgfFmkVCrTaj38OgIc7KeUKtOy1bk3mGgAX4ODAypZlNfJAAAAAElFTkSuQmCC","cuerpo_herido.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAYCAYAAACIhL/AAAAClUlEQVR42s1Wz2sTQRT+0kaIUBZdKQ1BGoWcchM8CMpWKoj/gCKiGHPQ4FFEYcUYc8hhKR5LiLDkEMKaY8UQJJQ0h1IPQkHcHLKVECRuEQSx9/HSGWY32eysuwcfDMv33vz49s2b9x7wn0vMrchmkiSqzU3LjkVKMJtJkvZWwzHBnoyRTK0GxvZkjHxBDU08zpPTqxW0DCfB1bMpAEC/3w+M9WoFo28WLl1ZZ/u1jAbqzQ4RJT3lQb1aYX/+dfgD796+QFnTQ+Hx98nUwYqiMM8fk55JOO5W5gsqMS07FmUsug+nOr1aYZ7P3bmBW7fvsjChPDw3zWaSxKiphBKVpYQDu+1+2OsMfmjFHBt7XX3uWmQzSWJbPcckWUoQL7sfFhE3YQBYmLegt/3RsXhz44mDJG8XwSJpiR9TMeiWq+vXAQBlTScUb24Aj5++IV52LxxFTvS9Zh7LUoLwmI6w1+yWxXnGZXmplE5JePXyOdrtTgkA0ikJa5cv4PP+ADw+n17B/heLYXMwdMw3B8PSz19Hr0OXulleLD7Lo6zpcFeZeRWHFz7PBb3qRb8Jy/JS6f69mzgtncAZ+RTaH97P/ALA0Z/fM+2KouDRwwe4tnYRu7ufAnkyJhqLNJl6iaIoLOnOs9ebnX+rxSJdCa2h7pI2r2JQoVUiqMSDLqDkZpH38gz/io9rvXDaWQiScnhyZU13XJXfgS2j4RsGoQjy4iYnEiL1ZsfzlYcmSFPN4cFOJAVAr1aEO/cFUQ+UNR0rqXOREMwXVEQag+xvT6YBANsdA3zHIdKhtLcasCfjKX0k9ZiKUVOJbfWIUVMZ9uv3RmaXjMwu2evqrM+jOq2Y8yUplGYOD3ZY60S/fKrxe728BH3FfwF2MQkd6MYWcgAAAABJRU5ErkJggg==","cuerpo_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAYCAYAAACIhL/AAAACZUlEQVR42s1Wz4vTQBT+ulsPwlK0smwIslXoqTfBg6BkZQXZf0ARUaw9aP8ChYi19tBD/oLQhaGHUmKPuxiClKXbw7LeBDF7aFZKkZpFEMS9j5edIUnzc5ODHwzhzSQzX968974H/OfIeScqZYFmtblp2blMCVbKAtV3eq4X7PkMgrie2LbnM9TqcmrieSc5orYx0NwE16+KAIDxeJzYJmob0+8Wbt3Z5PsNtB66fYPGJb3gQaK2+Z9/m/zEh+03aCkklT37MV84WJIk7vkz0r6E897JWl2mpmXnsoxF7+Fsjqht7vnq4y08fPSEhwnjEbhppSxQrSNTRjStHXSGcyiNKh+HQxL6LSplgdrWyHVgGjsOvIQXrtiL0d6nTO3zlKVQgnc37wMAWgqhae0samKqa2Yj7TV7sRy2uFpcaZbEAt69fQ1dN5oAUBIL2Lh9A+bRxGVfL63hy1crcN08mjR//T59n1rq/LzYeFVDSyHwqkyY4jjhrHNJr3o56oXV4krz2dMHuFy4gCvFS9A/7vo+AeD07x/fdUmS8PLFc9zbuImDg8+JPJmLG4usmAZBkiRedMPWu33jfFocJ/2ZhnolLUwxGJhKJEU+6QeMnB/5IM84s/hM62OXnaUkJcdJrqUQ11VFHTjQepFhkIqgE15ycUKk2zcCszw1QVZqTo73MxEAorZjd+5LcT3QUgjWxGuZEKzVZWQag/xvL5YAAHuGBmfHEadD0Xd6sOezhflM9JhB68jUtkZU68jcjur3puaQTs0hPRwS3uexOaVRjSQZq8ycHO/z1ok9naUmKnudSJrF/wDqfgNT+7G6GwAAAABJRU5ErkJggg==","escudo_cargas_1.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAAAtCAYAAAAdtGNyAAABHklEQVR42u1awQ3DIAwElJ3aLdpR6RZ0KveFZCECKAViDvuVEBR83AEGbM1k8xQoLXvbpzVI5ilQBOopUM7491yn9LZjJJORQc7kx3zNyzwMf+f1eQeIVkLKUI2tWL+l3lkbIoC2gO2hnpwSpk9Gsxuf3nY6Kd2ttKGylwJ0mn9SgQ7zVzrDQ/xdjeW//BaxJg5YUmEk3QXH6mBb8DhkwOi4Jgx8FGzoEuD49h3Tuwz0iNPtKG9lWplWppVpLOAakWlEprss3WlBYNrh5OQoVVz53vjyieiWkxfqubdDAq93Wb1+tM2t5dmaB38/XZIQfCZCTVLQOSe1UK+XQ+Kyi2odUFNC7bk17eqKdU+ey4WungLFcv5cAg+XOnm3/QASRxZQkZcyhgAAAABJRU5ErkJggg==","escudo_cargas_2.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAAAtCAYAAAAdtGNyAAABOElEQVR42u1a2w3DIAyEqjs1WzSj0i3oVO6XJYvSmKbgGmN/5YGEjzuIo3MMwpEgQ/lsj1sMliJBBgSaIEMt6PvaovSO60gmkUHK5CM8wz3cAr2n4+kCqFZCyRDHFo5vGfdpDhVAW8D2UE9NCeKHkfTk4nOXh9K/lTZU9lqAiuWnFeiwfLUzPCTf2Vj+KW8V38QBn1Qzku6CY3awLXgulgFbxyWw8a1gsy4Bim/dPb3KRkeclxXl7Uw70860M20LuFdkXpH5X9b0EWsrYsVFbPbDLEgBD67SFa3uaUsnOXVGy3gDvcctmjPJOdAU/Mxso+9N/e+vDoJZHY7TeS/nZc3C+ND8lvKnjyRkvhOBk5TpnhOumOmVkLruIm4BOCVw161tV2eie/NcrZpLkAGf0+sj8NarQvF4AY+ZI+shLU9hAAAAAElFTkSuQmCC","escudo_cargas_3.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAAAtCAYAAAAdtGNyAAABPUlEQVR42u2aQRLCIAxFoeOd9BZ6VLwFniquMpOhULACTUKyqrUOefxPS028mxwBIqTnXv7hnaYIEAFBA0TIBf0+Nym94zZSSVSQKvl2H/d0d0c/0+vpBLB2QqpQTS28vuW60hgsQFtge7gn54TpN6PZg08fO70pXe20obbnAjotP66gw/LlrvCQfKWp/FfeLJ6JAx6paizdhUM6bAvPphlYO9eEha+FTbsFKN+6a3qVhY6c24r2NqVNaVPalNYFbjsy25HZW5b48KUZ0VBJLPHsCnhYXMMfSITH3JGFFgl3azoHLzWO8t9WXNM7aLRCaglp8TNH+vep1ArH6byXq2WVZpC7wsP2sOrr00cWUt+JULOU6p6T2qtbr4TYdRfVJqDmhNpxa9vVmejePJfbqweIgOfp8RG8utbJq+MLBGMTCx7c2cYAAAAASUVORK5CYII=","escudo_roto.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAAAtCAYAAAAdtGNyAAAAiUlEQVR42u3asQ3AIAxEUcT+w2QMtnIGiJI0VoLhXYko/O3zFYjWKF9HjHg6P2LE3Z1yoBkgyzQk2zElp6nrRevgOFYG/K+6YQk4ewyYTBnftNCdx+3zutrS3p2jN4GW3hJckIHmZDLlYsBbvyYCVzdowEt2UcCp41vQaT7e2Hv5cQV5+0lIyToB2XC3feQpdbcAAAAASUVORK5CYII=","mandibula_abierta.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAECAYAAABlaKSVAAAAR0lEQVR42mPUUpH4z0AjwPjg2p7/J47sY7CwcWKgFs3AwMCwasUSiOEMDAwML549YpCQkqMKfejQIQYGBgYGllUrltAqVBgAKIdKMRqPOkYAAAAASUVORK5CYII=","mandibula_cerrada.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAECAYAAABlaKSVAAAAUUlEQVR42mN8cG3P/xNH9jFY2DgxUItmYGBgePHsEQPjg2t7/sM4ElJyVKEZGBgYDh06xMDEwMDAsGrFEgZq0ocOHWJgYGBgYOyqS/jPQCMAALZ/X9c1vYBOAAAAAElFTkSuQmCC","vertebra_g.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAATklEQVR42mPQUpH4r6Ui8f/FnQP/YWyG/1CwYlYVnGZiYGBgWDm7mkFBSYWB4ftDBgYGBgZmTenfDQwMDAzu3iEMK5fMYmBgYGBgwGYmACPZLCcqBK8IAAAAAElFTkSuQmCC","vertebra_m.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAS0lEQVR42gXBsQ2AMAxFwZ8tXCLkKlMgCoZiFCZghhSR2cMgyjDF407VDYCRQXWjAHz3pehNy7qpjAyiN02z631Sqm6MDM5jp7rxA0PpJZIR9fLVAAAAAElFTkSuQmCC","vertebra_p.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAJklEQVR42mPQUpH4v2JW1X8tFYn/jCtmVf1XUFJheHDvDgMDsgwAQxgQx4vRXMgAAAAASUVORK5CYII="}},"kraken":{"piv":{"boss":"kraken","nombre":"Kraken abisal","mapa":"ocean","mira":"izquierda","estados":{"cabeza en reposo":"cabeza reposo","tentáculo arriba":"punta reposo (cadena alzada)","golpe":"cabeza enfadado + punta golpe","tentáculo apoyado (se corta)":"punta apoyada → cortada","herido":"cabeza herido"},"escala":"1 px de arte = 3 px lógicos; dibujar con vecino más cercano","piezas":{"cabeza":{"archivos":{"reposo":"cabeza_reposo.png","enfadado":"cabeza_enfadado.png","herido":"cabeza_herido.png"},"tamano_arte":[48,33],"tamano_logico":[144,99],"pivote_arte":[26,0],"pivote_logico":[78,0],"emisivos":{"reposo":["#b0fff2","#ffffff","#fff08a","#ffffff"],"enfadado":["#b0fff2","#ffffff","#fff08a","#ffffff"],"herido":["#b0fff2","#ffffff","#fff08a","#ffffff"]},"nota":"Cabeza 144×100 lógicos asomando arriba a la derecha, con 5 tentáculos colgando. Pivote = centro arriba"},"segmento_g":{"archivos":{"unico":"segmento_g.png"},"tamano_arte":[7,7],"tamano_logico":[21,21],"pivote_arte":[3,3],"pivote_logico":[9,9],"emisivos":{}},"segmento_m":{"archivos":{"unico":"segmento_m.png"},"tamano_arte":[6,6],"tamano_logico":[18,18],"pivote_arte":[3,3],"pivote_logico":[9,9],"emisivos":{}},"segmento_p":{"archivos":{"unico":"segmento_p.png"},"tamano_arte":[5,5],"tamano_logico":[15,15],"pivote_arte":[2,2],"pivote_logico":[6,6],"emisivos":{}},"punta":{"archivos":{"reposo":"punta_reposo.png","golpe":"punta_golpe.png","apoyada":"punta_apoyada.png","cortada":"punta_cortada.png"},"tamano_arte":[15,8],"tamano_logico":[45,24],"pivote_arte":[14,3],"pivote_logico":[42,9],"emisivos":{},"punto_debil_en_estados":["apoyada"],"nota":"Punta 44×24 lógicos; pivote = unión (derecha). «apoyada» = VULNERABLE al corte deslizándose; «cortada» tras el corte"},"barredor":{"archivos":{"unico":"barredor.png"},"tamano_arte":[30,9],"tamano_logico":[90,27],"pivote_arte":[29,2],"pivote_logico":[87,6],"emisivos":{},"nota":"Tentáculo barredor 90×26 lógicos (a ras de suelo)"},"tinta":{"archivos":{"unico":"tinta.png"},"tamano_arte":[10,8],"tamano_logico":[30,24],"pivote_arte":[5,4],"pivote_logico":[15,12],"emisivos":{},"nota":"Mancha de tinta"}},"cadenas":{"tentaculo_largo":{"ancla":"cabeza","punto_ancla":[12,26],"segmentos":14,"piezas":["segmento_g","segmento_g","segmento_g","segmento_g","segmento_m","segmento_m","segmento_m","segmento_m","segmento_m","segmento_p","segmento_p","segmento_p","segmento_p","segmento_p"],"pieza_final":"punta"}}},"files":{"barredor.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAJCAYAAAAl45yBAAAAqElEQVR42mNkoCHQ4rL6D2PPq1sHF2/qqGBgpJVF6JbdOHGDgYGBgWHVgQUMDAwM5FuMbgm6RQwMDAybFq3AqvfCswv4LcZmOC5L8FmEbikDAwMDI6mGk2IJsmUGUgYoNOOJjhf/aWU4jMYGGE90vPjf1FGBUxOxND7w4NctTIu9BBL+UyNFYzMcBq59O8aINQHB8IMF//+Ty2dgYGB4sOA/iifQ+cgAALOZibZvPcpbAAAAAElFTkSuQmCC","cabeza_enfadado.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAhCAYAAACfiCi5AAAEBUlEQVR42tVYQWgTQRR9m6oHa+heWkJRWBBD6KHMqRYL4qmUCq14WHKyLUIOHgI9BEIORXuQQrDHHnKojSCUgKUK9uDJS4v2NKcQFoSV0lqr1Q1CDvUQD+mMs7sz2WySFh0Iszsz/897///58zcautSGLt+qs+etlW3ffKlQhJmacb2v0YJrTbm2o4XdVzsL0PT9x79A360DAMz9RWCu7JInd27y51xuHtTZDU1G6xboUqGIeDzhtroAfhpRvMYvkGKUE2TzAGCOJzmpMGS0sOBllrasCqhNQQwiJWGOJ4HnQ1LwMs+IHmJkVCS0MFbfWtl2hYcIvhkQBkYGXuYZmX7mES+RSKtWZ+Atq8IVi+CnEQWeD7k2FvtSocjfWbhgrszBi/Niz8LrqbmMWZJyhXAgAQa+VChy8PF4gvcAQAwCa2yDA2Gbi+tkvTmehGVVOPig9QBAbeojobUCvpUmbnSWjZ21NVpAubajad0Af95NJBFpR/i8wfoSgkH4eCSM9ZmQV6lqvFMjNNNLDAKij7TuAabE3F90WaBd8EFy3v1U85Gw4KcRRXz7vmvcqTkwdANOzXHVOzI9bJ2hG4EeFffz6mWkerzhQ/QRHH/66loc02M4dA5xceMnvj+8DmtsA5WDChL9Cdg/bLy1h7D6bA+jN0bx8lURMT0mJRDTYxgeJohGrqByWIGhG7B/2Ej0JzA8THB8/F26n3hPeElqsjPw1FxWpkQzNYNcbh7EIMhsHTUG+zJANQ8AyE8OBHryZXnQN6eSM1MzymxIbSoPIbFK9LZcbh4AGuD7Mo3Bar7x3JdBZutIGkYu8EyOkW8i1wy88gwwkFJy4oGq5tE7sIDegQXugW7LBenzESjXdjTq7Pqqyk7vgW7fH6zAU2YhVqipmEtjtprH582M1O3tygUZo0e24NvvvSf7x0ePJxJ3QW3qyyrs/WrvI/R/uYa3dASfNzOoVsaagmhXTnqPnH4jaEHV6CxJ8dqj24VcWDkv+MCLrFzb0dZowXXzym5R9oGiumVVfatyKvAAcCGIdYMEGvW37c4mjNhZ9LIDK/siC/1NTPQRJYFOm0pfOp0FALx5sY5Nu+QiEaqcZik2nc76ahlmNVXvzUayXtRHnV3+Y+Dpgd9Ikbbz8EGjMOMbtRDHQfGeTmfh1Bwe56KlZeBbOgNKdw8SrvR0ozoA3DNMTD1IcnezNktSuD01AQBYXMrCPrFc+u4ZJhaXsi3t1xUC9IDCPrF4PHJr2ahPIeklhzWK+u2pCQ7e9z+PjfrqwoaShHe/jkPoX2ltEXjzYh3/g1zTdPph6bA+qc/Wxf9oVONnJddRCDU7cOcpp3XiBeNSHGSQ8GxjXIo3zqPskHZZjq37A9kHbmKU/F5aAAAAAElFTkSuQmCC","cabeza_herido.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAhCAYAAACfiCi5AAADj0lEQVR42tVYPWjbQBT+5JQMKSaegvGkSQRPN6WQQugUQganZBCGQu0sHg0ZDMZDBg8hEMiYwUNjBwLBQ0gzZOjUxab1dJMImpQhJmRyKTUlizo4d9XPnX78R/vAPFmn9973vXv37iQFU5Ls0rrNrm9PO77xdqMFvVRw/W/ShusZY9hV4sZVZgGafv3+F+iXSwCA/lAH9gyXPXn3hl/Xavugg15sMsq0QLcbLWjaqjvrDvA7SOIzfoK0kpwgGwcAfTPPScUho8QFL8q0ad6BWhREJUIS+mYeOMsKwYtmxjlDjIyMhBIn67enHVd5OMEHAWFgROBFMyPyz2bESyQRNesMvGneccdO8DtIAmdZV2Cnbjda/D8rF+wZHLxz3KlZeR3qJyiSkquEQwkw8O1Gi4PXtFWuAYCoBObbKw6EBXc+J9L6Zh6mecfBhz0PANSiPhJKFPBRxBlolsLWWpM2YAy7ijIN8PMWJ4nEOMbzButrCCrh9xfiZJ8ZPQ4ekU6l5wZeFC+dSgO/F6LPAHOmP9RBVDI38LJ4bDwR19kOktA6u9BLBX7fq6P6k9nJ4nnLyNeFskvrNkmtSRkTlUDr7IK0kqjV9vnYhZHBh2zf5zyspoPsvPG8Jc38KKI1cKifSFuiXipw8BdGZnRzuQL8OAYAHG+vhIKPY6eXCtJuSC0qJhDUQn0gBHJ/XZFmLK5dWDJeiQZrtX1pGThb2OuVA9/4r6f6VO2kZ6sXfz4CL4clW9fywjJy1nCcoOPaBfmjg568C7GDmoi5r2aXK6FlMK5dWDICz0JFUuLdIGiBVW6fcH9dcZ06g2RcO1frfXlHUMJOo2EkJjnIxbXzgg/dyIxhV2nShmsBijYg9oIi26BkOqqdDLy0C/lJYHT+ttybDSM2Cy1asKI3stjvxCS1JiUwqcj8lctVAMDN+SWurbaLRKzjtDHsKnTQQ7lchZpSXVPNsibT3m4k0k5/dNDjPwae9v1JSozdh/t0RIIFilDHYfVeLlcxGA54nTszLQIfaQ1IpztDuFO2+QHAe1VH7mOeTzeTIilhI7cFAKgfVWE9my5/71Ud9aNqpHhTIUD7FNazyeuRZ8uCnUPeSw5NCnsjt8XB+77zWLA/HVxJSXjjTVxC/4qMReDm/BL/g11gO/129Ghvp4q28xuN7P6s7CYqoaAFN087ZZJZUBc1kAzh3UZd1EbrUbRIp2zHnvsDC9xHt8/lfZIAAAAASUVORK5CYII=","cabeza_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAhCAYAAACfiCi5AAADpUlEQVR42tVYP0hbQRj/vVgcKqFZKiG08KYgmW6yoCCdRCxEcXgECk1cMnQIOARCBmkziCA4OmSoRhAkg1ihDp26JLRON4XwpifFVCyFSCEUO6RDvOv7c5f3XvIS2oNwybv7vu/3+/7dvSgIaCQeznXZ9/O9mmO9Wq5Ay6Ytvw9o2bKn0akrfu0qowBNP335C/TjMQBAuyoB6w2LPHn+jH8vFjdA2xe+yShBga6WK4jHZ6xeN4FfQRjv8ROkEuYE2ToAaIspTsoPGcUveJGndb0JalAQlQhJaIspYD8hBC+KjDlCjIyMhOLH6+d7NUt6mMH3A8LAiMCLIiPSzyJiJxLy6nUGXtebXLEZ/ArCwH7CYtg8V8sV/pulC9YbHLx53Tyz9NrSdpEhWUsKuxJg4KvlCgcfj8/wGQCISqDPn3AgzLh5n2jWFlPQ9SYH77YfAKhBHSQUL+C9DLOhUQ5Wawe0jEanrihBgB/3MJMIDSI8brCOhqAS/nzCj/eZ0HX7GtFIdGzgRfaikSjwa8J7BJgy7aoEopKxgZfZY+shv8pWEEa8tgYtm+bP7bNXfTI5mT17Gjm6UOLhXJdEZqWMiUoQr62BVMIoFjf42lEjhpeJlkO5W073k7Pbs6c006OIamBL25W2RC2b5uCPGjHH+s7ytCt4P3JaNi3thtSg4hQy3xLtww5+anoTU9ObvcVHeeTPbxzhFoH3KtcPvLQGzOkhamGDjKALn+lzEGh06gptXzhulcOeA0GfH+yCJ+1C7KImYy7M2dsdXJ7mhWEfVM7NGROiDd9/f3179ePmzdLMC1CDig8RAE+mXuPxt6f4QGdxeZrHbXO+L4hB5YQt+P4dQXG7jWZIlre0oC9yfuXs4F0PskanrhzQsuXuITqA2AuK7ICSzV7lZOAB4IEb6x4J9O7fhrWbMGKjmEUFK3oj8/1OTCKzUgJBtEaRvlyuAAA4OzzGqVG1kPB1nWYtNpcrQI2ollAzr8lmezcSzWZ9tH3BPww8bTmdFBq4D7dojwQz5CGP3fI9lyug3WnzPDd7WgTeUw1Iwx0jXOm9oS4ArKoakq9SPNxsZEgWC8klAEBpuwDjTrfoW1U1lLYLnuwFQoC2KIw7necj95aBbhIpOzkcUHQXkkscvON/HgPdd5snUhJ2e0On0L8yBiJwdniM/0Gubzv9vH3dXY5kuub/aGTPRyU3VAr1K7hxyinDREGdjIPECO826mS8V4+iIg1Yju37A9dTNWWD9/DRAAAAAElFTkSuQmCC","punta_apoyada.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAICAYAAAAm06XyAAAAjUlEQVR42mNkIBFocVn9Z2BgYAhQCGNgJFXTvLp1DAwMDAxNHRX4NcM0IGvatGgFw4VnFxgYGBgwNWPTANOEDC48u8DAiKwYXUNTRwWDgZQBigYDKQOEzSc6XvxHNh1dAQMDA04+E8yGpo4KhrSyfBSF0ybMx8tn9BJI+P/g1y0GBgYGhmvfjqF4gxAfAKmSUyB42AhcAAAAAElFTkSuQmCC","punta_cortada.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAICAYAAAAm06XyAAAAaElEQVR42mNgIANocVn9Z2BgYGAhR2OAQhgDwwOG/4ykao66kvX/g803BgMpAwZGUjXC2B9svjEwMZAJDKQMyNd84dkF0jQv05nGyMDAwJC3pY6BgYGBgZlUG/8uYG1gfPif4cTbQwwAA18b/hbJKzEAAAAASUVORK5CYII=","punta_golpe.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAICAYAAAAm06XyAAAAqUlEQVR42pWQIQ7CQBBF3xJUFboKXbW6R0AQFEERjlGFqKpEISFBoRAcgiBXIapWNZwAUbMImM3upgi+mfz35yeTUfypIisdwGK6RKUQ4PG6qaECwGF7AaBuKsYSCLyezmBxYVkyyU1nAFD35ul86av5ehWdGmYi05lPuW4qdK6jQOfazyEOoGaTjT8xDEKlXPzI9i22b6MF8fvdMeKp//ntIiudzJSLfwNNYmEPc6EL8AAAAABJRU5ErkJggg==","punta_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAICAYAAAAm06XyAAAAlUlEQVR42mNkIBFocVn9Z2BgYAhQCGNgJEUDAwMDw7y6dQwMDAwMTR0VDIzIErgATAMDAwPDpkUrGC48u8DAwMDAwHii4wVBzZsWrcAQu/DsAgMLzAkGUgYMF55dwEoja4CJMzAwMDB6CSQQtBlZAzKf6cGvWwwwPG3CfDjbQMqAYdqE+Sga0fmM+EL42rdjKAGKzgcAmxpRYAm4zi0AAAAASUVORK5CYII=","segmento_g.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAYAAADEUlfTAAAAfUlEQVR42n2OIQ6EMBREX5vNCo6AQq1AVXM4NBKFXBIUWUE2HIIgvyKkqqrhBCtqimsQZJ8ZMW+SUQBlVkWA4vnCBQvA9lvUo8yq+K4nAPZ1B8BaAUdUa3PEeRi5Il4wuUFzg8kN4gU9DyPiJS2uqb/uk8yu7VPhgkX9e3sC3Wc5GkMdbO4AAAAASUVORK5CYII=","segmento_m.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAGCAYAAADgzO9IAAAAkUlEQVR42jXNoQrCQBjA8f+cGg4E47hkMixdvkfwKXwSWVw0GRWWhkFkj2CQBcNhMGvw+IKmwRAMn8nfC/wAyI3XthRdTJeaG68Aw9x43a4ONFWNsw4iAJq0pWhT1QCEGHDWEWIgjZdXkU0yAKQTpBMA0tHAFJ/+i3TCZr3jeX3Qvk8k/3w2nuOs43jfc+vPyQ+evzcUPFOCBgAAAABJRU5ErkJggg==","segmento_p.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAZElEQVR42mPU4rL6z8DAwBCgEMaw4cEqBgYGBgaGEx0v/p/oePHfSyABTjOe6Hjxv6mjggEZMD8786aBgYGBYdqE+QxPLz1kePH5BQMzKxNXw4e/bxm+Xv3CsOHBKoYPf98yAAAzRCvBOxT26QAAAABJRU5ErkJggg==","tinta.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAICAYAAADA+m62AAAAPElEQVR42mNgIBIwInNEBLT+I/PffLjGCBNjxKYAG2Ai1momYkxjYGBgYHrz4RojIUVvPlxjZKKar2FsANgiEVm4W2fOAAAAAElFTkSuQmCC"}},"mamut":{"piv":{"boss":"mamut","nombre":"Mamut de hielo","mapa":"glacier","mira":"izquierda","estados":{"reposo":"cabeza reposo","preparar embestida":"cabeza carga","embestida":"cabeza carga + patas a/b alternando","aturdido":"cabeza aturdido + estrellas","herido":"cuerpo herido"},"escala":"1 px de arte = 3 px lógicos; dibujar con vecino más cercano","piezas":{"cuerpo":{"archivos":{"reposo":"cuerpo_reposo.png","herido":"cuerpo_herido.png"},"tamano_arte":[50,21],"tamano_logico":[150,63],"pivote_arte":[25,20],"pivote_logico":[75,60],"emisivos":{},"nota":"Pivote = centro de la base. Cabeza en (2,6), patas en x 8/18/32/42"},"cabeza":{"archivos":{"reposo":"cabeza_reposo.png","carga":"cabeza_carga.png","aturdido":"cabeza_aturdido.png"},"tamano_arte":[17,15],"tamano_logico":[51,45],"pivote_arte":[15,6],"pivote_logico":[45,18],"emisivos":{"reposo":["#dcffff"],"carga":["#ffb0b0"]},"nota":"Pivote = cuello (derecha). «carga» = ojo ROJO (prepara/embiste)"},"colmillo":{"archivos":{"unico":"colmillo.png"},"tamano_arte":[10,6],"tamano_logico":[30,18],"pivote_arte":[9,1],"pivote_logico":[27,3],"emisivos":{},"nota":"Se dibuja delante de la cabeza en (4,9); pivote = raíz"},"pata":{"archivos":{"a":"pata_a.png","b":"pata_b.png"},"tamano_arte":[6,10],"tamano_logico":[18,30],"pivote_arte":[3,0],"pivote_logico":[9,0],"emisivos":{},"nota":"4 patas; pivote = cadera. Alterna a/b al embestir"},"estrellas":{"archivos":{"unico":"estrellas.png"},"tamano_arte":[13,5],"tamano_logico":[39,15],"pivote_arte":[6,4],"pivote_logico":[18,12],"emisivos":{"unico":["#ffffff","#ffffff"]},"nota":"Aturdido: gira sobre la cabeza"}},"cadenas":{}},"files":{"cabeza_aturdido.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAPCAYAAAACsSQRAAAB1ElEQVR42oWTz0sbQRSAvzW5lISNgRwq6BKC9NIf9JCDWsmpYFF6KtRLDpWQi6de4q2lNH9Aeio9tAoSBIWCUI0rCYJliTksQbQNociy3WoVKahroSkV0kOZdeNm6bvMDDPzve89ZiR8Qkk+aL989abr3kJxiaa+gaWrEkDw6oFb45m2fXyAHwBgaHRETNuWrkqBq4Bn+Tzfjs4JyRHWVlRu37npgUR7ZUJyhNZFkD8EXgTcgMr7t7wulph8/JAPy6sA7O58JiRHODm1OTm1WVtRCckRAPqVAVoXQXq66U4NJ8hk02izzxkaHaGmVQGcUYRY97gtNhuHAMxtGUwNJ5jbMph+dI9MNk1NqzJfyHFdUUjE+zt602Gyuv7RMREgEfOFHDOFRX8TERNjKQCMs1/OKOwE4MiyMMz9/5uICwLgTpDJpp1yPCYzhUXisTDxWBh+/uBGX6+n4RNjKSeRx8T+/pV4LIxpmpimyV6zQV/0mgciAAvFJf+eAOw1G74v1V1STatemih377efTD91DAAGkyk2G4cd6sJElCRATX3j8u8IwL7xBbv1u+tFsa5rZepaGfv4AEtXpSBARS05AGu7IrH973O5Lepa2Zl/Kr2T3Ht/AQfs3Fj83W5VAAAAAElFTkSuQmCC","cabeza_carga.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAPCAYAAAACsSQRAAABz0lEQVR42oWTz2vTYBjHP1kLTjLSDXpwMrMisos/GLLDmKUnpcMxPAyqhx2EsstOXtabKO4PiCfx0F1GGTYgCG5dxspYpZQiYQd/lB5ESuboHMJGnFBxUC++Idlr2AOBvOR5P+/n+yRRCCl9bLL77PnL/z5bKZg07S0c21IAoqcbrt3Ndt2DPcIAAOPJCXHbdWxLiZwGPF5cZHf/J6oWY33V4vqNqxJkoF9D1WJ0TqL8IfI04geUX+d5UShxPzPN2zdrAHz88BlVi3F45HJ45LK+aqFqMQCG9Et0TqJyHIDM7nsykyMAPDmOU6/WGE9OUK/WAn1i3eO3qDTaAKiZB17j/MwtsnOz1Ks1lo0FLug6lxNDgdn0+MlrG+8A+GW+kuyWjQVyRjHcRNRUOgXA9/Q97xJ2ArDvOHxtfTvbJGcUqTTaHsB/QHZu1osjmeSMIol4H4l4Hxz/YGSwX4o0lU55B0kmn0pLyraZB6DVavGl2WBw4LwEEYCVgimb6KO3uw/nH3mAsPJHEq89EMcPuDKWotJoB9SFiYgkQE17C8X74f7ZlK0Sbuc3N5N3QmexU90EwD3Yw7EtJfDFlq0SAFrvObbNPNrFYWmjmKF/318pC87uLo8+uQAAAABJRU5ErkJggg==","cabeza_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAPCAYAAAACsSQRAAAB1klEQVR42oWTz0sbQRxH3yaBIgkbhRwM2CWU0kutSPUgVnIqWCo9FdqLh0Lw4slLciuU+gdsT20P9hJSIYIgVOOWBCFlG3JYgth2CUVku/6ISEFZC41USA9l1o3r0oGFGeY7b95ndkYioCmjDzovX729cm6xsETT2MA2NAkgcrlg8GGm4xztEwQAGJsYF92ObWhS+DLg+fw8u4enROU466sad4Zu+yB9vTJROU77PMIfwi/CXkBleYHXhRJPnzziw8oaAF+2vhGV4xyfOByfOKyvakTlOAADynXa5xF/HICRu0lG3mQByL//TF2vMTYxTl2vddWJcchrUTVbAAxd63ELZx/fIzMzTV2vkVez9CsKN1IDXWcT8pLXPn4CYOvst88ur2bJqcVgE9GmJtMAxNoXn7ATgEPbZsfa+79JTi1SNVsuwLtBZmbajeMzyalFUokYqUQMfv3kVrLXF2lqMu1u5DNxDn6QSsSwLAvLsthumiT7enwQAVgsLAWfCcB20wy8qd5I4rcDhJTh+51ns3OuAcDN0TRVs9WlLkxEJAFqGhsXl00A9na+47TPrlwoxg29TEMv4xztYxuaFAGoaCUXYG9WJDb/PS6vRUMvu/2vpXeSd+4vJhDWYR8FwVwAAAAASUVORK5CYII=","colmillo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAYAAAD68A/GAAAAZ0lEQVR42o2OuwmAMBgGT3AaC2vHyAQhpMw+2ikhCxhX0Ca2Fq7zW8UXCF593wNnlfCBs0qcVZLmKKU2BkAAuiEWWQBo+xGAdZkog/doY6jq5gzchczZkOV9S4/54P0l3ufe5Du/OQC/myiYFBqqlAAAAABJRU5ErkJggg==","cuerpo_herido.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAVCAYAAAAElr0/AAAC9ElEQVR42tWXT2gTQRTGv41FvCl4KoS0SumhFA+lSGlDWoTQklAPFtqLByUWpPdKEeKhuXjbQi8FEwhpKFgJSHWDS4qaZak9lAiSJloxTZbIBiu0SiHH9aCzzuwfsmli1Q/C7L59M+/9mPdmN0Cb5QksaLW6pr2qaZonsKB5Bid+/mj74IT2ICmb7Xb+gQWtUdyOVpLuD4SYAN+/fNavn7z+gMX7dwEApXIVc1MjKH77ZV9aAQAsLq1gLblu8gfA2J2IayXxzVRUv77HP0ZNUdAzdp2Zc9V9DmvJ9ZbtzxNxKOmH3IlB6OTpxAFAPayDj28AAK75hlAqV3G52834lMpVAGjZvpZcx/udl1B2XnBNgRAAOnn1sM74GCH+tLblLVuYDjsIAmBM3ghRUxSUym6choa8w+RSM8K47CDUwzqyBRUAsKcemcbguA8AEJq9iW1561RAtuUtJPh5jN24ZepXlxVEtqBaJk+PgighOO6DIEoMTLuh6HUT/DyyBRXBcR8GvH4GxmUF0UiCKKHb424IY4Sye+7Ej0AQGWG4ZiFo7RZLKCtVvcxG+zoBANmCitijpKm2G+2W0S/Bz+vP7HITRAk5OXOyF6IgSnqjD3mH0dt5AXvqEROMJEFD0bbdYglzUyNMolZ+TvIAgDP9gZAWjkRQOTh2DNLb04WPnyqYmZ7Es6cC8vs19PZ0MT6Vg2NUDo4hiBJmpifxNvcOb4pVnD1/EQDgvXIJuf2vDf2c5HFn9jZc+XSMi4TDelk4Fd0bNUWxnW/nRw6NZtez2pFIOPy7Rwa8fr3Wm9VoX6ej/mq3H90jHH1qtQLzN0Qg8ukYpx+/+XSMy8mZ/xKC+daiXy6r0WVTDf/LEPoLkZTVZiqKzVQUfHwDgigxxxt9f9ojHZ+2WX799gdC2mp0GXx8A6TEyM7Qk8npQsZ2y7i+VRzjbpi+tYzlRCBycgY5OcMsSoKQ4O0arXaFju/ojxXpE0Jrd0804PW3fUesDhy7fGj9ALFKd9TOxZeJAAAAAElFTkSuQmCC","cuerpo_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAVCAYAAAAElr0/AAACpklEQVR42tVXT4gSURj/TQl1q+uC60aIh/AkSyyt2BKIy0gdWqhLhwUJYm8dXCQoavfSbRb2spCCuCKsIYQ1kiiVMoiHxS7m9gdEBmNkIaxYMIh4HbY3+2Z0ym10wB/I9+bzzfu+H7/3fe8NMGI4+Ajp9Ah53SHEwUeIY3bx8Mf6ZxfJg6TU7zeaz0fIv+LazCTt5kOaAN/3P6vjp28+YO3eHQBAs9XGytI89r798W9sAQDWNraQSqb75gPQ+IcBZybxYiaqjleFHXRkGc6Fa5p3LtpPI5VMm/a/SMQh5x5z/02ETZ5NHACUbg9CPAsAuOKbQ7PVxvlzds2cZqsNAKb9qWQa73dfQd59yR2LCCXAJq90e5o5ehLjRlWqGJKxGZGgBPTJ60l0ZBnNlh1WYM57iQ6JnswJIxJKt4dSQwEAfFS+9tm7y4d7OHT7FqpSxRIiVamChBDGwvXlvno9OYhEqaHgy8EPAPirdTlnIObLuHnjKp4/E2F3TKMqVWB3TI80ebpuQgij1FDgcs7g4KcNv06debj/6e0jjSIsieMgGPBBzJc1yozDUhJsXI/XryrDmSGhx+ULUwCAUkNB7EnStBoJIayOjXIT82XUpIK5A1EPNhibxKB57/aaWFmaH3o9IxJq+3XzIXJ/fR1WwzV1Vm0eZiDmywgGfKPdWlaDKlKTCkfFvirsYNIQDPi0B2I9F+MAEP2fk6BITSqgnotxqiL1XIyrSYWJJKG5a7En5XZ0cySFaBUJ9UB08yHi8fpRzERRzEQhxLMQ82VNe2OfrbZsfNY38Pbr5kNkO7oJIZ4F3WJUGfZlepJTO44CZtcfFEevRt+lUb+dKImaVEBNKmgWpUHYBjEKO0gVNv5QH1a0Tihbo2cKj9c/ckUGNRyjfFj8BkPvEKIZ9duXAAAAAElFTkSuQmCC","estrellas.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAFCAYAAACeuGYRAAAAJ0lEQVR42mNgYGBg+P///38GJECIzwQTIJZmYGBgYGIgF5DqPLIAAPDDL9Vq5xinAAAAAElFTkSuQmCC","pata_a.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAKCAYAAACXDi8zAAAAZElEQVR42mPQ8Ur+/+L7fxQc17biPwsDFDx//52BgYGBoX/BJgYGBgYGJpjErecfGG49/8Dg7W6HKgEDW3cewi5Bmo6tOw+h6jh47TlcJYxmrJu15T+6cXt2bGNg2bNjGwM2AAAmdzT6HMKFewAAAABJRU5ErkJggg==","pata_b.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAKCAYAAACXDi8zAAAAW0lEQVR42mOUM/H43zRhBgMyWLZkFQMTAxpYtmQVAwMDA0Li3oMnDPcePGGwsLFClYCBE0eOYZcgTceJI8dQddx78ASuEkYz1s3a8h/duD07tjGw7NmxjQEbAABXfSPpiscjAwAAAABJRU5ErkJggg=="}},"nave":{"piv":{"boss":"nave","nombre":"Nave nodriza","mapa":"moon","mira":"izquierda","estados":{"vuelo":"platillo fase1 + cupula normal + luces on/off alternando","disparo":"canon disparo","rayo abductor":"emisor + proyectil rayo","aterrizada":"patas aterrizada","fases 1-2-3":"platillo fase1/fase2/fase3","herida":"platillo herido + luces alerta"},"escala":"1 px de arte = 3 px lógicos; dibujar con vecino más cercano","piezas":{"platillo":{"archivos":{"fase1":"platillo_fase1.png","fase2":"platillo_fase2.png","fase3":"platillo_fase3.png","herido":"platillo_herido.png"},"tamano_arte":[41,9],"tamano_logico":[123,27],"pivote_arte":[20,4],"pivote_logico":[60,12],"emisivos":{"fase3":["#ff9a9a"],"herido":["#ff9a9a"]},"nota":"Platillo 124×26 lógicos; pivote = centro. fase2 con grietas, fase3 pierde una placa y enseña un chispazo rojo"},"cupula":{"archivos":{"normal":"cupula_normal.png","agrietada":"cupula_agrietada.png","brillante":"cupula_brillante.png"},"tamano_arte":[20,9],"tamano_logico":[60,27],"pivote_arte":[10,8],"pivote_logico":[30,24],"emisivos":{"brillante":["#fff6b0"]},"punto_debil_en_estados":["agrietada","brillante"],"nota":"Cúpula 60×28 lógicos sobre el platillo en (20,0). Fase 2: pisarla («agrietada» tras el golpe). Fase 3: «brillante» al pasar rasante"},"luz":{"archivos":{"on":"luz_on.png","off":"luz_off.png","alerta":"luz_alerta.png"},"tamano_arte":[3,3],"tamano_logico":[9,9],"pivote_arte":[1,1],"pivote_logico":[3,3],"emisivos":{"on":["#fff6b0","#ffffff"],"alerta":["#ff9a9a","#ffffff"]},"nota":"6 luces en x 6,12,18,24,30,36 del platillo (y 4); parpadean"},"patas":{"archivos":{"aterrizada":"patas_aterrizada.png"},"tamano_arte":[41,8],"tamano_logico":[123,24],"pivote_arte":[20,0],"pivote_logico":[60,0],"emisivos":{},"nota":"Al aterrizar, bajo el platillo"},"canon":{"archivos":{"reposo":"canon_reposo.png","disparo":"canon_disparo.png"},"tamano_arte":[8,4],"tamano_logico":[24,12],"pivote_arte":[7,1],"pivote_logico":[21,3],"emisivos":{"disparo":["#ffd0ea","#ffffff"]},"nota":"Cañón láser bajo el platillo (izquierda)"},"emisor":{"archivos":{"rayo":"emisor_rayo.png"},"tamano_arte":[8,3],"tamano_logico":[24,9],"pivote_arte":[4,0],"pivote_logico":[12,0],"emisivos":{"rayo":["#d0ffe0"]},"nota":"Emisor del rayo abductor bajo el centro"}},"cadenas":{}},"files":{"canon_disparo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAECAYAAACzzX7wAAAAXElEQVR42mNkYGBg+H/h1X8GBgYG9ZgwBhePEAYY2LNjDQPj/wuv/jPoi0JELr5myF6yiuHJk0cMN66cYmBgYGBgYsACblw5xaChY8bAwMDAwIhshX9HD1wnDAAAtwIeuYufxBwAAAAASUVORK5CYII=","canon_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAECAYAAACzzX7wAAAAVklEQVR42m3NIRJFUACF4c8bQZJkWTCiIAsWYJkWIFiBfINsREnSSPfNC++r/5w5CXTd8MB53fphFC3zJI0RijwDx7Hbwgo+/tjCqqpbkPxeFGXzXUYvddEWMNPUcjsAAAAASUVORK5CYII=","cupula_agrietada.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAJCAYAAAAywQxIAAABEElEQVR42o1SPWvDMBQ8gwmlU2eVQmdPmbVEWZWldPSSgCE/IZu7dOuU+QVB/SPc1fJQ06l4yNS9mbu6FF4X2/WHTPpAHE86TveO52GqpOZuG2cpHperPqd48fCvkpqHJciO+uGnAOC7XPFriofvv2uT5FCScH0AovUCJsmB5yeIzQ4ngN1upea4YhYNkm2RmDiggMNjyIIsC6lZ1FO8/TDHFTvc1oShaHgM+XJ20UPR4Ta8RtBvxeoxTZIjylKY5QpRluJm9gFVKewPe9y938Nuv0aRR+sFDIATwL7zsSOq6AplUWIu5yiLEsAtPh0Zj0btZtZDqTmgoD1tLBN8D1Kz2OwmN6hxrCTBFtuzG/cLKxH8reZDM5AAAAAASUVORK5CYII=","cupula_brillante.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAJCAYAAAAywQxIAAABBklEQVR42q2PvUrDUBiGnzSC9xDvoC7FRThLMjild9AlQsBRnNzqNRw6dDghQ29AuqRTwXRo0C2D1+DsJEQsn0M4TZM24OALh+/nvLznOQ59UqEcjrK+w7kxbU+xcviTVChdeSY/mruPApydopJtxtuuXmU7SBcbAmW4SCCOfMZuXVPgA+Q07QHVtGqOZ3IxYmRohjJ5n4hn8tb9609dLcygi/z03fSW7OH8npEasbx6JlCGsdt47A+sBnu6bXYUBhBcBuhqBoCuZpRFybXbhogjH+/2EVQoLUIbki42xJFfhyQaneh93+e3clChTF+y1rKrQBnKogTgk3mvL458HAD5Wgr/pF/P+qs9cAxwcwAAAABJRU5ErkJggg==","cupula_normal.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAJCAYAAAAywQxIAAABC0lEQVR42o2SMU7DQBBFnx0k7uDcIDQRDdI2Nq1zgzSOZEGJqNIlDRdYpaBYy0UugGhMi11gUbogV6CmdQQaCuM4dhyFL61mZ+dL83Z3LI5J+bKfLl4THq4nbU/+YvEvKV+6ckx6kHebApz1UclbwnLbHMfrDE8ZhhGEgQtUMQY+Qfpp96gWZbMck4oRIyMzkunHVByTturv31WsYewuch/Z/fkdYzXm+fIJTxkmg8aT/FS+WvaOrueaAN6Fhy5XAOhyRZEXXA3aEGHg4szmoHyxj/1L/VY60uhI7/Z9ahP+0Q2jrFWM1xlh4PLFIwBFXgCwudmw3B766tGyUL44s/nJSfKUIc1vT/p+ATuJsiPl9S36AAAAAElFTkSuQmCC","emisor_rayo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAADCAYAAACuyE5IAAAALUlEQVR42mPMKpnynwEH2LNjDQOjmo4DTgUMDAwMjNy8Ev+PfjqBVdKaz4IBAEhWClUvBlQcAAAAAElFTkSuQmCC","luz_alerta.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAIElEQVR42k3JMQEAIAAEIQarWurLnqusgLbgtOVekX8e9ogMY8m84noAAAAASUVORK5CYII=","luz_off.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAG0lEQVR42mNgYGBgsLLy+M/AwMDACGPAAUwAAGjdBTOEESoIAAAAAElFTkSuQmCC","luz_on.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAHklEQVR42mNgYGBg+P9tw38GGOP/////UQQYGBgYAGpsEo3h3N4ZAAAAAElFTkSuQmCC","patas_aterrizada.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAICAYAAABkkNZlAAAA7UlEQVR42mNkIBJw80r8j0+vYWBgYGDYs2MNw9OHNxi+fn7BSIp+aXkNBhePEJL1szCQCMhxIAMDA8PXzy8Ynz5k+L9nxxoGmgBuXon/WSVT/qvpOPzn5pX4Tw2z/CLKiDaLidhopmYIPHnyiOHGlVMMzt5xDMQ4lIkUw8mJZmzRvnfrIgYNHTOGG1dOEaUHq4VSCgb/GRgYGD6+fcEgLa8BdyC/sATDswcXGCkNSSkFg/8f375gcPaOY7hx5RTcbAYGBqzms2Az4MrF41gNT0ivZzjDwPCfEoeSYz7W3D1z4RaG48dOM9AKkGo+AIXMfEhFYlVZAAAAAElFTkSuQmCC","platillo_fase1.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAJCAYAAACvzAXAAAABFUlEQVR42mNkwAGkFAz+o4tduXicgRogIb2e4cyJXRjizx5cYMSmnhGXw7A56NjpawzUBFamWjgdjuxgRmTHITts5sItDPQGulpKDFamWigOfvbgAiOjlILBf5jjqOGw48dOM1hamVLFwZev3WOY3NfKwJRbVM2QkF6P14HHj52mKY0NXL52j+H4sdMMuUXVDIxSCgb/c4uq4SGAHhL4DMIGblw5xaChY0aSHnT7YO5gYGBgOHNiF2qaNLFwQ9EIUygjI0e0hU+ePCJa/Z4da+AeQrYP5jhYmmRBzklnGBj+YwsZ5BAihiZVvYaOGcPxY6fx525c5eTHty8YGBgYGKTlNWiWo58+vMHAwMDAwC8sgbOcBADr1r1SzTdK4AAAAABJRU5ErkJggg==","platillo_fase2.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAJCAYAAACvzAXAAAABjklEQVR42rWUv0sCYRzGn5faG1ri9EyaRAwcNPL+gCBbBCEca2pyaayhMFpbLogkkIbAoKGhIaS1O+luMDzESey8jjIqFNrEa4g7XvVeO7Ce5cu99/B+P+/z/iBgiAtGreEx7VHGX2hjaw9quTQybjYrxM1PWGBuQJJSmxgwf3aJhBDHYngBQjzMBKeBCQ1Hg52e3wAAZEkBACSE+MSAsqRA1TVkM5uu/21wGthsVgjhglHLhrPBaDh7UllSPIF68YnFAhOUBq7WGhCPDjG1kxP3j08u8PrxNWDieR+Mlon06hrEYgFmp41+twee90GWFGYFAKNljvX1uz1c35ec+dzUfvuELClIr2dAuGDUym7vOgkMJ0EnCgCxQGRsAnXtAaHIkqftV3UN+dwBqrXGyE44fculwTMZW15xzLTR7w/8JGToUHUNKSHJbGwYuuP/TXe3V86C6H42nH0mp+mbpAKWWzJ0QikhCcPQnW+3Svu9VllSxt9u1jvZeX8BAPjmQ/gvPT/VAQAzs3PMd/IbBY30O4alA68AAAAASUVORK5CYII=","platillo_fase3.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAJCAYAAACvzAXAAAABuklEQVR42rWUsUsbURzHP0fdFCq4SOJpkA4iChmMNLd0kaJ2EeyQUSenLI46VOyfkIJUBFEoKATsoBKCHb0LuRtaPEIm0fMMsRAhlmzqOZR7PPUuBtTf8uPefX/v97nvu99TCIlILO49XLP/GLxEzMx9wSrkH61XTn4rQXolDCwISDdLzwZcXdsmqSUYHuxHSwyGgsvAbTKcDPZ9YxcAQzcBSGqJZwMauonl2CS1BEelY45Kx/d6dHR0MjA0CoAFXr1WpfGvqiiRWNzz4XwwudBybNKpWQzdbAm0FV1ma510avZRHUDZLjI2/hkA13X4tbfJm4XlzNK3lR9cXDbuFalqFPeswvTEJzJb61Tqf7m9ukZVoxi6GZoB3LNKU93t1TU/D/NiP7nfYeoD+7UbDnJZdnfWaO96hxKJxb30/KJw4KETsqMAI71DTV0q20VxZE+F5disLn8Vxy73E5pC/v/g+P/kyPuP4qUPDNDT0yvstxybKW0ytLHrOkL/VBzksuKD5H4+nD9AbfIkWeAFOSM7NKVN4rqOeA7Ksr7VbOhm6HQrze7Jeq0KQLRvgNeK89MyAG+7ukPvyTsqngQUiQv/jQAAAABJRU5ErkJggg==","platillo_herido.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAJCAYAAACvzAXAAAABnklEQVR42rWUP0gCURzHv0ftDS3hvyQaRAwcVPLGhqBaAiEcc6lBXBprKIzWlgsiCaQhKGgoaAhp7U68GwwPkQax8zrKqFBoCdGGesfT+4NgfZcf/N733vvwvd97DCzk8Aa7/T35XsBfaHV9G1I+Z+hrtSJj5meswMyAeLE8NGDm+BxRNowZ/xTYsN8SnAZmaDga7OjkGgAg8CIAIMqGhwYUeBGSIiMVT5iuE3AaWKsVGcbhDXYJHAGj4cimAi8OBDqIjzvLWoLSwKVyFdz+HkY209zOweEpXt4/e0xutxNqXUNsYQncWRZas4FOqw232wmBFy0rAKh1zdbXabVxeZfT9zNT4/UDAi8ithIH4/AGu6mNLT2B/iToRAEg5AnYJlCRC0isJfXv7CQpMjLpXZTKVcOf0M/N53pnMjQ7r5tpo8vl+UlIVSApMpbZRaiqgqu56YHnMfnwZejd3lzAF4gYziNwZCZH6ZskAV2zZEj1BSI6YEUuIPkLP4gIENmnvwq8aH+7rd7J5tszAMA56cN/6emxAgAYG5+wfCe/AYXP64p8B7tdAAAAAElFTkSuQmCC"}},"ptero":{"piv":{"boss":"ptero","nombre":"Pterodáctilo sombra","mapa":"night","mira":"izquierda","estados":{"vuelo":"vuelo_1 → vuelo_2 → vuelo_3 → vuelo_2 (cada 6 frames)","picado":"picado","rasante brillante":"rasante","herido":"herido"},"escala":"1 px de arte = 3 px lógicos; dibujar con vecino más cercano","piezas":{"cuerpo":{"archivos":{"vuelo_1":"cuerpo_vuelo_1.png","vuelo_2":"cuerpo_vuelo_2.png","vuelo_3":"cuerpo_vuelo_3.png","picado":"cuerpo_picado.png","rasante":"cuerpo_rasante.png","herido":"cuerpo_herido.png"},"tamano_arte":[50,22],"tamano_logico":[150,66],"pivote_arte":[25,11],"pivote_logico":[75,33],"emisivos":{"vuelo_1":["#e8c0ff","#ffc0c8","#ffffff"],"vuelo_2":["#ffc0c8","#e8c0ff","#ffffff"],"vuelo_3":["#ffc0c8","#ffffff","#e8c0ff"],"picado":["#e8c0ff","#ffc0c8","#ffffff"],"rasante":["#ffc0c8","#ffffff","#fff08a"],"herido":["#e8c0ff"]},"punto_debil_en_estados":["rasante"],"nota":"Sprite completo (envergadura 150 lógicos). Pivote = centro del cuerpo. «rasante» brillante = VULNERABLE (cabezazo desde abajo)"}},"cadenas":{}},"files":{"cuerpo_herido.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAWCAYAAACCAs+RAAACKklEQVR42u1Wv2vbQBh9CsIYEVwNwgQjjDCJBuPBeMhgTHBLJ9MheOiUKQRTOmXKXxDyB2QItEPo1KFDyRA6dKmH0CFD0BA6qCVoMMIUE5QQRBGGr0M55WQZ/4h8KiV9i+4+ifu+p/e+uwP+45FDy5RJxLpLaZMwtYYQMlKaKphaA/bgDIPgm/TP2UjLlOnta4vqhQ6JstXCFMnKuViBy0s6DnbeAwDenRwJV0JaBInt9cNI7LN9jL2Xh7AsC5bzNRU7SUlJbFS2cWGfhjFVKcDzXZjqMwBIrScelCCXNSgYXkNXq3BvzyPvGuVX4fiqd4GeZ+HX8FZixNk4dSK5rBHz/1Z7FwDQPTtFU9+K2YrB813cBT/v+yaTj8wZFkFOnkZCz6/C0E0YhhnGHceG07PHFs9DVQqomS+wqlTD7/g5AHyw9gEgsVIzK9KotSLFMwR+AM93w95QlcLcRYwq9xClpHn6Ylyc9YrnuxEl5kVJr8WUYuRmIbSQxlNkjarFNj4evwEAVFprEYVGlRqNT3vyG4YwIv0uhUqtNKVwd1rO5Mf2DK8cw+Wn76i01mJxYYr0HaIV40+x4whMPe0n7Fr8esbzJ3B+3IDlEoJ+l4hPmvQqM2rRotqkJDlmKr7fJaqXOqTImrDLHyNTL3WIz5vIWvwC65tPMbi7BAD4w4HQKwf7UdViG71rG+cnXzDJxjOpUC91qKg2haowiRCfP5HlFFn7KyTmzf8bMu5B8AH1zG8AAAAASUVORK5CYII=","cuerpo_picado.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAWCAYAAACCAs+RAAACWUlEQVR42s2VP2jbQBjFn4wwRgQhignBCCNMMcV0EBnaYgw1HTqEDCVDhlBKCMFLls4hQ4eQwWMpGUumDKEEDyGDCdQBE9IM5oYMRjFBFGGMKcY1QTXC5DrdERkbO7YV6QOhk+4Q76f3/REQgJDEKGXrezgIIcz3vqwW+Prb6Q6uCj+xkBUEBCUkMUrZlV8r07iSpelEjkal5zSdyNG4kqX5tTJNJ3L8uVGidNj3RL8g9PgKPrz5xP/0cmodADAnSwCAcOceplkDAFgtY6QTvoDYvT8C+X1Mmcjl1DpqNuH7t1YFbbsO0rjgEKPC11yLiDLdePXVBdEPc+c0YZ79HVkXIb8hisZ3LpzdGURy4d1YEL450g/RH227DgC4Pr0Zu0OFggzxmAgFEeLOaQLAo+aFECQIBjBuXTxp+42IMp0LqUhGMwPFK1KMQ3R7HaFRonSSyS14DhGex6q+AwAuN1gasVTq9jpTafHMkWg4Rfc2DwEAB4V96Fp6aC1MC+GJIyyV9jYPQQgBMS+ga2nuxkOIWQB40rUiokxVRXdBDOtKs4SYKQgtXVJV0dG26zgo7HMn+ruSFxBTp5Yc0ajTa+HfWRF4+xo4/4Wt7SpqNsGtVcF8+AWaTtXVlbyqSWES8WydWVzCFSlCkWK4+ZHH1nbVVQuKFIPVJjMr6KlBHor/uPKZvy+VT6CpSRjGNd4nN3BEdl1z4SkARoIMEm+aBkzLGHheffYSFePEs2KeCESOaDSzuATTMqCpSS7eatb4GafXAht2R2R35nPBE0dYdLqmMGhy+wnA4j+jsXBinsmlcAAAAABJRU5ErkJggg==","cuerpo_rasante.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAWCAYAAACCAs+RAAACSklEQVR42u2WP2gTcRTHPxfCUY4QQjlCKaEEKTeUDsFBSygqGXRxKB1KBilSpEK7OHUoGRzEoToUKYIOQTqIiEgGKbSDOLShU7khSDmhZDiOEo9wyHHIEXIOJWcvCbVpmkAx3+Xxe79/7/v7vvfuYID/HLI44fXi3FC/SSjydE/ICP1UQZGn0cxdTPe7cOXSSBYnvLdLqpceXfR6lVaXpshQONoSYCSU4Pmj9wC8K7zuuRLCZZBIxFLcVRZ8346WZ2XuFaqqopaLfUknoVsStyYX2F7Pcu/JBwCO9AMsx0CJZQD6VhMX6lrRoaTXUGJ7PQu3b7K9nmVcSgEQk0aJxCUq7iF2XT8zBZshhWXvwop41lpHm5eXRAC+7X7BdVx+fFpjefWQHS0fWGc5BrZb+Vs3YjwwbuB37ZfQIJEam2XvYLxzIlJY9p7OFQLOwv4mn7++YTbzGKt2BMCd6fv+fLmsUda1E3/igV8X7XAtcd1XakfLB8YAH9Vn/DQWA3teLKVbzmnEtLm6F/BvbOUw7dIJETkySWJYCSyYmZqnsL/JzNQ8G1s5ItFw20ArZtlPJ8sxiEmjHb+m5RgoIxn0qkZiWEGvav7c6bhSI2nU46I/1qsapl3CqZmCL+nDGy9Rj4uBw07b1EiaZLJV8o2tHGK4juUYvu8iZNop1Uyu2QKtRFJjs4GX6ASmXaKOG6iF0wp1a91a6My7fSLddAsAp2YKzW05IsbPvd92K7Rb32gMIcR/3n3u/t5pZ7vUj11s5Wr9mw0wwAC9wx/Bshs4CLCjQwAAAABJRU5ErkJggg==","cuerpo_vuelo_1.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAWCAYAAACCAs+RAAAC40lEQVR42u2WT2jTUBzHP5UQSimljFCKFAlSi5Qeyi6OMXDsoDB2GB7GDjJkDDx48eRh7CAiO3gaMgR3GNrDEJHRgxS2g9thK2MHyaHIyESKhFJGKUVKkFAaD5rYP0nbuD9e9oXwyEte3u/zvt+XBBwUECQzIEjmtfC4Wd41Tf6jWusICJJrLT6ngU9nsgBkDzJoVZXD7A4A0XGf76JBrIV8tvgWpZxH+b4JgN6o+FxBLIhi8WvXA5Vyns3116cGksSkWTG++Ho5oDcqPgsgs7YPYNcky3FWc0tU6oU2mC4QKZgiNpTomkCrqsSGEqeCkcSkmZDGUCt7OMFY81sJyKztkz3IdNUB9AbpBwMwPTLHam7JU9wkMWkC9ILojJEsxweGcAQZBEarqkwlH/SNmwWwvLDBm+yrLginGHUWPwgEwBWnQXqj4qvUC/bg1odpVZVDZQdZjqNVVe7NP7RX0y+E7EMSk+bywkZPCCmYohViNbfE5qfXpKOjniBcHennzPTInL1yWlVFFJrcSczb17fVdZ7MvERRFJRi3jFObjFKR0dRynlPEH1B3GCsja9VVW7KabZWZrn7+B0A37TP1PQSifAEgA3h9jZyi5IXCNdo9YpZaysKTbZWZuH2LbZWZokH0gAMJ6YIRgKcGEfUm5prjKzv1GkhBnIk5JdNgEajjhRMATA1OQ3A7t5HDN3g+MMLHi0esa2ut42t6SUKuWP7PDV5g0R0wrV4y2VLg0L0BQn5ZTMWiSPHEsjy32gViypF7feE47H79r5w0vXYsO3Utrredg7wXnluw7WCeIHw5MjY8KRdfKsM3aCmlwgHrtqtV9X0UptTlXqBJgY/Gz/ODqQTqAukUSUWTlPTS3bfv8A4OVU3TgAGAjqTn0C/EGqDDIqRNoc6ners79dqNaUvzLn8zfqFkBkUI139VnGdqhsnON3vxRHhPED+TOwYRau4Qe73skcuVJ0RvNSlLnVx+gVIKgy07g7hfAAAAABJRU5ErkJggg==","cuerpo_vuelo_2.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAWCAYAAACCAs+RAAACZklEQVR42u2WMWgTURjHfxdCKCGEUEIJ4ZAi5YbSIXRRStGSQUE6SIfSQRyKKFgHJ4fSQaQ4OFUphXYokkFEJGSQQIpoh7YUh3KDSDkhBDlCCSGcEg45Qs8h3nnJXdLYNgEx/+V473333v933/e+BPr6zxUNjJrd2NfXawgpOtkVGKGXWZCikyjlHcrGF+GfK6NoYNTcuC+bE/G7ZrfK6twyMuAPuwyGfCJP77wC4GVmreuZEM4DQowkuCbN23NbyiaPZl8gyzJyYa8n5SScFeLK2Dy5lTmuP3wNQF49QNOLSJEkQM/uhB/gaNtsWbuxKcFlIjwwbBq1CmIkQW5lDq5eIrcCC4uH5DlgXJq2oarHagP4z9qPU0O18ykE/VHz8WzGtZDZT5HeXPd86cnGcwC2d95h6AZf3z5jYfGQLWWzIU7Ti1SN0p97Exiyx4X3308Fk9rYdfmUv6XrIIkLM/aCWlEA+CR/ZCZ5D62WB2BqctqOKRQUCmo9bkq8Zd8LL10UxxkJJuwY5xjgjbyMFEty8/LttgCZ/RTpD+ukFnfJ7Kdsn+XqZ/RauV42VlZWs0uIgxJqReHBjWVWs0v2MxT2ex5QKhcAiATjaHqRSDD+119Z04tIsaRtzinLjzgokYhNIB/t2WO1orhBoqGxlgdZmwwPj7jWVrNLBPzHaHrRnjsNTKtMecE51QBiwbT8YWsDaW12jNFwF5wZas5U8/xJT1WT8RHwPFuvlYWO2287SOdmzu4UCgy54ixzzaoaJbzircbQSafzdwLSbPQk/T7YE97ZxU6KP0ur7qq8/sr01VdfvdEvhtUwSl0Z6FYAAAAASUVORK5CYII=","cuerpo_vuelo_3.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAWCAYAAACCAs+RAAAChElEQVR42u2VT4gSURzHv7OIyCAmMYgsgwzizmHxIF4CkZKIAunkIWTZk4RBddhTh9jj0sGTxBK0B4k9RESEhxCUIA8W0SHmILHMwuJhELFBZBmGZZBeJ5+OOrr+GSG2HwyP92X4vffh+/u9H/A/rnhwzm1iR96NdUOIXNwWGGadLohcHLJag2r8Yv65MuKc2+TosURim1liV1mtzBGXwzN2QfcGjxcP3wIA3hRf2e4EswoI3hvBXTFDtYpcwLMHLyFJEqTGt7WUE7MsxM1wBuV8Gvf23gEAzpSf6OpNiN7bALC2nljo1fK4BNJ3opxPA7duoJxPI8RGAABR8T7cPhZt4wTaH2VqCa7NEY9LGDt8N7UHAKjWPsHQDZx+yOHJ8xNU5ILpv67ehGa0B33j9Jn2/bjonTO2gnhcAuF9IQi8CEEQqd5oyGgoMgAgwe/SvpgUQT5KnarIBdMeAN5LB9CM9tIwl3YkHk3Syw+HoRvo6k142U26zhujzi3iFDNPX0zSjV4HbqfPpC0CY+XUZYGWrk3WwRHOHcaP4heqhZNbJodGnRrVZ61KV5oJsxRIq0qoS/4Ewwy/TqMu9Z3q6s0xvV46RTi5Naav3JFWgxC/MLioFcDMaW/xam3AiUgghY+F11QT7lzDRe+cGT176WhVCel/uZ0aCXgThHVwc82FaXOEdXAkFsyS3E6NxIJZMnzeSpp9ONHx0VcAwGFpH6pWh95TVzqxWQdHIoEUlI6Mp8kDHJb2Tb1n5b4lyKTLA0Dx+zGUjmwLxCQY/rqIiD8GQQjNhGKsIFKZRzTZ8GonhBWM0hnML1Wr4+zz7zEYZloyAODcYVMSuyEmwahanepW5/8F04Rsbl+fwNwAAAAASUVORK5CYII="}},"sapo":{"piv":{"boss":"sapo","nombre":"Sapo gigante","mapa":"mushroom","mira":"izquierda","estados":{"sentado":"sentado","salto (aire)":"salto","aterrizaje":"aterrizaje","lengua":"lengua + cadena de lengua","herido":"herido"},"escala":"1 px de arte = 3 px lógicos; dibujar con vecino más cercano","piezas":{"cuerpo":{"archivos":{"sentado":"cuerpo_sentado.png","salto":"cuerpo_salto.png","aterrizaje":"cuerpo_aterrizaje.png","lengua":"cuerpo_lengua.png","herido":"cuerpo_herido.png"},"tamano_arte":[37,19],"tamano_logico":[111,57],"pivote_arte":[18,18],"pivote_logico":[54,54],"emisivos":{"sentado":["#fff08a","#f0b0ff","#ffffff"],"salto":["#fff08a","#f0b0ff","#ffffff"],"aterrizaje":["#fff08a","#f0b0ff","#ffffff"],"lengua":["#fff08a","#f0b0ff","#ffffff"],"herido":["#fff08a","#f0b0ff","#ffffff"]},"nota":"Cuerpo 110×56 lógicos. Verrugas moradas brillantes = piel venenosa (no tocar). Pivote = centro de la base"},"lengua_segmento":{"archivos":{"unico":"lengua_segmento.png"},"tamano_arte":[3,3],"tamano_logico":[9,9],"pivote_arte":[1,1],"pivote_logico":[3,3],"emisivos":{},"nota":"Se repite en línea desde la boca (2,9)"},"lengua_punta":{"archivos":{"unico":"lengua_punta.png"},"tamano_arte":[5,5],"tamano_logico":[15,15],"pivote_arte":[4,2],"pivote_logico":[12,6],"emisivos":{}}},"cadenas":{"lengua":{"ancla":"cuerpo","punto_ancla":[2,9],"segmentos":"variable (hasta 30)","piezas":["lengua_segmento"],"pieza_final":"lengua_punta"}}},"files":{"cuerpo_aterrizaje.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACUAAAATCAYAAAAXvcSzAAAC5ElEQVR42u2VTUgUYRjHf5MSQqWLCElKLouBmMp40Gwz0E4ahn1cQrwWkbdQiQ4invwIiSDwGCGySmB+BNGlRWUY3YOLISwIw2ysi8X4sYEosTkdbKaZ2R2/6BL0wPKw78fz/ub/f94Z+B//cAiHLSjy5+nOsaikCcdd89eiyJ+nB7RePaD16k3jt81shbCuKX0mmjkd6FEj8yCgvsl2egYDACx3tnDrk4QSUinvqIWBOR2gb7Kd4VkZJaSy3NnC5f4RfFVeFKAI9JOoJxwFSn0eAWD7Ww+jyT2W1r5QkX8RwAQy1sTHdugvbjPrWNd9Hpg7ksWZJ5V4eFYGQAmp5lh8bIecZuiceEV/cRtLK3HejUj4qrwYqhrRMxgwlXTCCW6NbdhixFS9n9Hknm1MCan7Vv3OU/V+EsEOPtT2mQpK1Yu06nfSPljFpQssrcRNBQ04IZ1lViWcBawgUvUi/oVK83/Xk/s2S6XqRXKaITGBqVy6aL1eQ89ggO1gjKikCYITyE0JZ1gP9C9UpsxbwQ3lnHWdoYRUtoOx1J5ygighlZmuoZQCSeZJTFwh2TDPTIN9XtuNcLf/BbAP7NO9tvrpLLU+uGCoVN5Ra5uwgkzLQ9SIdcjhoC3nZZWg7UbIyypxvRAGoFU5N0sNQWz2XQufdS3eFe9GDgfTztWIda77jAd4E1swAYaFcdtlsDqzHYzZoc7UFeKr8vK68amt8LQ8xMebQdeDX24E0HYjB4JllZWYfWW9NM7L4vFk/+mpqKQJRaArAI3YDqkR62jaeHSgRQcBOcMKlNMMEvtgHk82kZElTjnfsN74FtPyUEpBbTfi+jvMOmczG5b5FypJTMDjH/dMIIAMZ6F16I7mnuZ8RgKA2JpKYb4XORw8djb2Z5WVmN/QzfiWmUXRx/ufY6iqxmo4xo0HV/m6nkh9o+eKHv1caS4FYiGr4RgFYiEPq33H/gy93dxKbWL1u63uajiWdu8vc933B8LGNXUAAAAASUVORK5CYII=","cuerpo_herido.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACUAAAATCAYAAAAXvcSzAAAC8ElEQVR42q2WP0gbURzHvycOBW0bJINoMOHQIraGlyESrrGETlUsrUuHkKF0KAUXKSrFQmmFgonFoZOjQwixFGJEinRpqBpCDmpIEQLC8ZQ0ZDhsLdh2EK+D3ONecndJSn/L7+X9+f0+7/fnXQQ0ELfk1GrnDrOq0Oqe/yZuyakl1UUtqS5qQ/OEaSOEcc9E6j7TZqDNSrsdUHRjBvHtHBSZYn8ujOuxBES/BwoAN6ABQHRjBgvLSQDA/lwYdz9locgUw7NBYGnnnyIoNIJaWE5ify7M5p+XKRt7u/s4IF3Wzs5RrB7B293H2Yxv5/B1aachoC1UR8gF+qZUtzb95REbFw8qUGTK9lXe/Uasf4pb9w70cBepBayFE+yiVKwesbnXLg/Wzs4vHFWPUDyocGcUmSI7soer94CTNBDrn2LAot9zATTQwyCLBxVERgNYWE7iNFPmwAS7WjJKZDRQN2d0yFIkpLAVjLJazI7sIaJN2taQIlMOTGgGyMqQmUM9ClaRawasrRkgRaZ1WncYF1KsZhSZcimLaJM4SQNbwSgHpNsxiuj3oCPkgltyam3NAJhpKe/DSfpCryeylvti/VPcRfULWfll6XNLTm14Nmh6AwD4/GKlpcdvM7eC999/cPZEv6dhSvUIC8b03Sx0Wjp6e5zEZs4cbiLwpCGgXTPowABwminzUB0hF0S/B6tjz+oMfxzP2AKrf0qW67lCBpduDLI01jaD3ix6sbcbX1c3oCkAMAbOSYCEMHFsHY1GQLVS253xdApS3geH4wqqv874b99hVhXGr3VqrTq2kwAJmYKJfg+kvA9Z7EHK+0CIiN31AgbDXrRZAeiGzAw2I2bnFZmadrEOBAClRLEe6sMqFZ5OvzQ1bAXaaJ+xnoxAhIggRASlKnqJy/rb10Uc2p352+z37noBrx7faik1Ooj+D8IohIhsTKmKb4UyeomL06ZQl4e66owZD5YSRQSIAw8ehth7pLc11970Z53DZuQvnQsY9rZwRlkAAAAASUVORK5CYII=","cuerpo_lengua.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACUAAAATCAYAAAAXvcSzAAADBUlEQVR42q2V30tTYRjHP0cjREk3kTjo0MNAkLBxbpQxHIyu+nGhQoSsXXjVHxAVUSC2Owl20VV01cWQBYJLuqibOmCNgReNhWAJchxrjFo5s1mEuS7kPZ2zs61j+sDh5bzv87zv5zzf93mORBMbCPRU55ZuEI0l8I4obKzoeEcU3t1/bfGbW7pBfDltrG+s6FS0vG2/zVRJwoFJToBWb4WN+bt5HZ/cb/Gt9Xmyt0+2mLP4RWMJC2gzwBNOyDtOzwBQ+RTFJ/eTLeaMtex6weZjrJn8JsIBCINP7icaSzAA1UZwLY2yhEPbWNEt79vaTQtMcj5lWc8Wc0yEA1x9dIWzN8cYCPRUa8+TGskGEF9O4xvsBTCkyBZzZNcL+AZ7Sc6nmAgHSM6n8I4oxKVFusZh+yk8H5sjGktYMiXizGMk6DekFVmT6gHFl9OHypC5COLSogUoNfqWSHXS0X4CrPUoQKnRt7zqfQGAu88FQHtw0wLUNQ6X3k/RHtwkm8sb8cJfmLvPReXkPu2/92ZbGh34r1EcGJcWiQT9xrxoHwCR6qQhpfjY2n3qZV4yZ6oj5HF6vw2pItVJ2wFmSWeuT9mAGkkqJDSgwu1K04p78DXhCPZZ+iELW+W6d86cYXMxiMwKsGOHagTYrBjM4BUt76x5Civ9XDsUlF8NQUZjwQQE1K3OpnfKO6Lw+MLtIwOZLZ3RWNgq163eWikrWv5vR99MlSSlUOay20Xp55rtOYr51RCX3S4iQb8hVW11RmMJXK5Odnb37B394rRSvTIdOkj9MVk6o9E2PGTrgWbJVNXLm2SGPtVDa+0G65nyvV+UZ7tk8MgK6YyGR1b+C0TEm4FE4xRAqupFlt28SWYAKLzU7VAAX2B2u1ikSz54zxd1C6CTUcS1DQ8RjSUsIFuFsgGj6yXK5V065U52it/49fmHXb5u1VU9f+ecZU7XS1wb9TrOUm2fMkskTEj1MZO3jXWhTp3ptm1oDlybz+JXrf+u1Q/f6Qh5qGh5dnb3GAr76h7oxP4AdNf43vcpRm0AAAAASUVORK5CYII=","cuerpo_salto.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACUAAAATCAYAAAAXvcSzAAADK0lEQVR42rWWQUgbQRSG/7VSRGuzhlAWkyYhIIRiw1JQQmog9NRaqXoRSXPI0VNPWkoLYnOTQg49iaceQkhBMBUP7amLtmFpDi5bLLZCiGGV0IYYsREpqdtD2XEn2aSrbR+EJTNv5n37vzdvh0ELcwVs6vzKNGLxFDwDbuSyeXgG3Pj47B3lN78yjcS6SOZz2TyqgtKw306mxMCEMWaANh+GyfgTJQ8f56R8631e1k4gFwuUXyyeokBbAbabIe+6MgsAqH6Nwcc5IRcLZE7e3mvwIXM6v7FwAAgDPs6JWDwFF6A2g2trphJMWi6bp/4fCDMUTDqZoeblYgFj4QDuL07g+swQXAGbWh+PaZY2AEisi/D19QIASYVcLEDe3oOvrxfpZAZj4QDSyQw8A24kmGVYRoGDV8DroXnE4ilKKW2d/hkJ+klqNdUYI6DEungmhfSHIMEsU0CZwQ1E1HFT+2lgF/4GKDO4gbe9bwAAPXYWANAZ3KGALKPA3c+T6AzuQC4oZL3mr1mPnUX14gk6f9bm2s5aO3ogyyiQYJYRCfrJuNY+ACCijpNUai9bv4+R8m1mAIw20gJG1HGijN5PS6kRUGZwg4DrS4AqdFfApnaFHC2VWptdMKXoqriApf2KYc3pFdYfBj1QLps/LXRXwKbelC41Dfa8nMKqaAw24p/6I2Crw6AHrwoK3TzvFaZIK3hx5xEZLx1v4YF1sinwSHkKpeOthnE/HwIkAUs6IACGp1OvLKWUlsK12YWGILYOb1MoIyC9iZKApf2K4emtT2VVUOg+NRx1qxPR0O83/McmSgI6+r1U0denUutTDR39f4DVAxm1gaqg4PCohrJUOW2emm1Llac/UJmzcICDc0OUBDg497lAtPX1CvXYWQLE8x5wXA+cfhfar3aj+u2gsXlaeVZlh29g8UMOoiSQAOd9dvR7DfsYy14Gz3uQz5fIb1dS4A37Gj/IVp5Vbz++hfdpCXbega2kDD/PYiJqPp31bUCfIs0Oj2rwhn3YlRTYeQf1NITqvmY9XfypjLJUYYaj7pbXmc0v39EVchjeOJtd7Kw8qwKAPh4A/AJoKwaCC/Nq8wAAAABJRU5ErkJggg==","cuerpo_sentado.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACUAAAATCAYAAAAXvcSzAAADI0lEQVR42rWVT0jbUBzHv9ExRDfbShnBFlsKQhmu5GIpnYWy0/7I1ItI14On4WknHWMDcb3JoIedZKcdSulAsBMP22ULOkugB0OG0E0osWQlbJ3WbXUizuwgyfKStIv787s88t7v/d7nfX+/9wuFFuaLupX55Wmk0jkEBv0oF0UEBv14++gN4Te/PI3MGqetl4siGqxkirddqFGwYZQdoM27CW3+gSQiRPcRvkafZ0fHEOQK4ZdK5wjQVoBn7JB3XZgFADQ+phCi+yDIFW1N2KqafLQ1nd9oIgokgBDdh1Q6Bx+gNINra6YSbFq5KBLfe+wMAZPPFoh1Qa5gNBHFrSfjuDQzBF/UrRjPo5qlDQAyaxxC/b0AoKVCkCsQtqoI9fciny1gNBFFPltAYNCPDLUExwiw9xx4MTSPVDpHKKXu04/JWERLraoaZQWUWeNOpZD+EWSoJQKoEN5AUhmzFU8Fa/8boEJ4A697XwIAXB4nAKAztk0AOUaAG+8m0BnbhlCRtP2qv2oujxONs8fo/HE013ba2tEDOUaADLWEZCyizavtAwCSypiWSvWyxjhWyrfZAbAKpB6YVMY0ZfR+akqtgArhDQ1cXwJEofuibqUr7m2p1Orsgi1FV7gFLO7WLWtOr7D+MeiBykXxV6H7om7lMn+u6WGPd3JY4azBhiNTvwVs9Rj04A1WIpvnzcqU1gqeXrunzdcOSrjTM9EUeHhnCrWDkmk+wsQBnsWiDgiA5evUK0sopaZwdXbBdIi7I9gUygpIbxzPYnG3bvl6jalssBLZp65P+pXxyfjJDf+xcTyLjoEgUfTGVDqd3ShlBXNH/x9gRiCrNsAwAazneXgYL9qNAbb4+sND1OccNOCl/eB4Fl7a/0cg6n6jQi6PUwNimABo2oX1PA8AqL4SzVAA8BmY25NlOOiTb0kWCUA7o7qvYyCIVDpHgOxW6xqMKNZQr++jm+7GV/kLDj99N6evh3EqV+9fIeZEsYbb4YBtlYx9Sp8i1dRUfeAl02gJdf5ijymgfmMpKyDCkP+uzfff0BX3osFK+Lp/hGAiZHmgHfsJ9GL+tkOptxUAAAAASUVORK5CYII=","lengua_punta.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAW0lEQVR42k3IIRJAQBiG4RdtZ9xAcARZ0fcoTiE7grTZAeTdKv1Z0wzjDJ/EeOKDd7UUohSiYtvLu1qZQhTrxiuZkfOTzADI0zR/0TUNAMV5X0NFCcB+HIy28AAcwSMD2wMDkAAAAABJRU5ErkJggg==","lengua_segmento.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAI0lEQVR42mP8v+DAfwYGBgaGU7cYmGCMgxcuMDDBGAwMDAwAEf0NEhgWoYkAAAAASUVORK5CYII="}},"serpiente":{"piv":{"boss":"serpiente","nombre":"Serpiente de lianas","mapa":"jungle","mira":"izquierda","estados":{"colgando":"cabeza reposo","ataque desde arriba":"cabeza ataque","escupir veneno":"cabeza escupir","cabeza apoyada (vulnerable)":"cabeza apoyada","herida":"cabeza herida"},"escala":"1 px de arte = 3 px lógicos; dibujar con vecino más cercano","piezas":{"segmento_g":{"archivos":{"liso":"segmento_g_liso.png","hoja":"segmento_g_hoja.png"},"tamano_arte":[7,7],"tamano_logico":[21,21],"pivote_arte":[3,3],"pivote_logico":[9,9],"emisivos":{},"nota":"Segmento del cuerpo; pivote = centro"},"segmento_m":{"archivos":{"liso":"segmento_m_liso.png","hoja":"segmento_m_hoja.png"},"tamano_arte":[6,6],"tamano_logico":[18,18],"pivote_arte":[3,3],"pivote_logico":[9,9],"emisivos":{},"nota":"Segmento del cuerpo; pivote = centro"},"segmento_p":{"archivos":{"liso":"segmento_p_liso.png","hoja":"segmento_p_hoja.png"},"tamano_arte":[5,5],"tamano_logico":[15,15],"pivote_arte":[2,2],"pivote_logico":[6,6],"emisivos":{},"nota":"Segmento del cuerpo; pivote = centro"},"cabeza":{"archivos":{"reposo":"cabeza_reposo.png","ataque":"cabeza_ataque.png","escupir":"cabeza_escupir.png","apoyada":"cabeza_apoyada.png","herida":"cabeza_herida.png"},"tamano_arte":[21,11],"tamano_logico":[63,33],"pivote_arte":[19,4],"pivote_logico":[57,12],"emisivos":{"reposo":["#fff08a"],"ataque":["#fff08a"],"escupir":["#fff08a","#dcff9a","#ffffff"]},"punto_debil_en_estados":["apoyada"],"nota":"Pivote = nuca (lado derecho, donde se une al último segmento). Pinchos DEBAJO: no se puede pisar. «apoyada» = vulnerable al rugido"}},"cadenas":{"cuerpo":{"ancla":"arriba-derecha de la pantalla","segmentos":16,"piezas":["segmento_p","segmento_p","segmento_p","segmento_p","segmento_p","segmento_m","segmento_m","segmento_m","segmento_m","segmento_m","segmento_m","segmento_g","segmento_g","segmento_g","segmento_g","segmento_g"],"tamanos_logicos":"16 → 22 (del techo hacia la cabeza)","pieza_final":"cabeza","nota":"Alterna «liso» y «hoja» (1 de cada 3 con hoja)."}}},"files":{"cabeza_apoyada.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAALCAYAAACQy8Z9AAABEElEQVR42mNkIALwafH8J6Tm07UvjDA2IzGG1W7Sw2vgls0MDOdnX4IbzojPNTDDpuQ9got5l2G3QFHmA8OUvEcM7x98gLiUT4vnPzbXbNnMwPBg9yOG13vewMUSdjkxXD3/AaerH+x+xMAIM3DLZlQJBVc5OK1tKMCgKPMBxSIFVzmsBjIwMCAMnZKHMIhYgGwxssEs6DadXDaFKAMfvLjAUL59F4bP4C41TNVj8OZmw9BoZ+fAcOjQAZx8GNj69RfcwPcPPjAwfbr2hfH87EsMW7/+Ypi64Q6Dn1kBA8MzBbgB+Pgw9d4f1Rikn7EwvH/wAXuS0mETgQhIQWP4mQBO/pUHf+Dqj114wMhASwAAeK+T/j59GfIAAAAASUVORK5CYII=","cabeza_ataque.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAALCAYAAACQy8Z9AAABUklEQVR42rWSP0hCURTGfy+kIUUMosFCrkuDhNjiKG9xqqS5lhxaxakmHYK2BgebmnMWNYJcRFBoSYlsCrw8SiIEX5ENIdhgPtTnv6Vvueccvvvj49yrMIfsHlt3lufz6Uvp18o8sK0jLzKvIYIudnbNvlwWKpcPBlyZliaW8ZLLQiG8Z8zOm2nqLw4T2L2uk4xotKSOpQ+MZbxjE8i8BmGwrsZpv58CUKvoJm+tAiLogjxY7B5bd1k4SEa0qTvrAwFjFaOS+R5D2V8SXYCrdp0Dq5vRuqR2EEGXAepfBIbmg2DLrFe9SyV7RZihU75VObm5HUpuSjpJvoQw6kBApVgsmDzX7R8D2JI6C6lvqeREk9czJyW1Q7ycwHesErk/xJcQhPxRaAgDONhfpJ8J+aNsf2yw1rDQkvr4L7W5uNIbOP9euOGY2D/KjuEvV6XCf+oX4XuVIg9dI5oAAAAASUVORK5CYII=","cabeza_escupir.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAALCAYAAACQy8Z9AAABYklEQVR42rWSP0hCURTGfy8eDSliEA0W8iRosBBrcAwXp/7QXEsOriINBYEOQU0NDjY15xxqBLmIoNCSEdlUeJGSiMBX9BpCsMHeJXtWLp3lfufw3R8f516FPsrhtbf/8rxcvyqmVvqBzUR8iHwdLeRmYdHqy2WhcnAp4cpvaeIZH7ksFMLLcrb3dETtzmkBe8Z1UtE6TaGjmsB4xtczgcjXIQy20QTG4zYA1Ypu8VYroIXckAfV4bW3hzUnqWj9152ZQECu4nuJfIehrAxp7W1jiwkirNo8ABwaNalLwRZayC1B5kWga/4VrJrAWw56JjxLpzoiTNcpHi7YPDntSm5JmrDt9oT6k5rUc3NBisWCxXNsvEtgU+gMpN+EMju1zv2Oi1KwRaKcxL8RJHq+hj+psRSIQUOTwK/9/tENS4EY88+TjDVUmkLv/aWmB0c6A9fnCzecP/ZXoiX95Quh8J/1AVqHmyJNDZvsAAAAAElFTkSuQmCC","cabeza_herida.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAALCAYAAACQy8Z9AAABTklEQVR42rWSvWvCYBDGn1fEpSFk6NQGSZYOUgINpGMoBV2E/gUO7dBVujk5OGZPu7g4dS5+UDBFikOhCCpSMhV8CRIKLZiKLlKwQ5qA+VCX3nLv3T387u7lCHYwNsOstmlm5px4b7ILrHCnQuQdjCccRN4J6ZoNYFAd+XCyaZpyXcJ4wqGW6+CyfY5aroOKKWM84UJgkXegFy1MqeNOymaYVbkuRU5ADQtCNo1eqQ9Fk7d+FTUsEA/YbKwXhGwa1LAAAJ9PX1A0Gb1SHxVThl5061FAAEgEE0EPAIomgxoWFM0Fxum8Rslgp9d7PXqvq3VPP4YoPbYjNyNshlmdXEvI76VCHFU9Q7f7HBt71losfeCUOkjMzDkZVEdoLZa4fXjHxekNYAs+YFPs6fPfRzi0k5hSJ/qkjlP7buLg7x5tLjZ+oz++/mVICf7TfgFjjaVyR5ArtQAAAABJRU5ErkJggg==","cabeza_reposo.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAALCAYAAACQy8Z9AAABPUlEQVR42rWSv0vDQBzF30no0lI6iINKiYtDkYCLY+nSqSr+Cx1cHKqbUx2cHevUwc25NCmCWUIHwSml2EyCX0IJIkJiaZYgxEHvPJq2ZvFN93337nPf+8GQQvlSLv4rM3GmjI9ZGtjusQYyXajVIvYPkjlDB+z2UMDZsm6aXQ2GDlj1I+FdvXfwMi4kwFubAVoNFz4FUDiw2dXmdkCmC9SB7NoFwrdLAMDIDhLZkQ2o1SJgAgoHGvpvgB+VTFd4HCjPz4rnWb6Ui+U7k0Fc3J+dl30ZzKhyElvk4OY0ApkuHm9baT4E6HWA87t7sYm8oei0ls0kFpbLFfT71sKaqxdGAuhTgJWJM2V2e4heGOG684zDvTPAUwVgWc3ztY9tbHgKfArmf6mdzOq3sf7zwl5hYf1EnyL/MCCG/9QXvaKmvexrA4QAAAAASUVORK5CYII=","segmento_g_hoja.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAYAAADEUlfTAAAAl0lEQVR42m2OoQrCUBiFv19uvIxZjOMG04IPsCIIexC7LNitFkFBljQs+AbWPYFJMJgMl4vJsiEmyzWM3eQpBw4fH0cAolR7gKGJaWyLihUAEqXar84TAMrCsdgnAFTbF7J5ZL4sHACX9ZjZ4UkfBWDyjj7pL/PlKFhkusu8rV0AAGzdmQbX4w2TJ2Hou7Et8u8twPv+kR9Q4DHKXAthfQAAAABJRU5ErkJggg==","segmento_g_liso.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAYAAADEUlfTAAAAkklEQVR42n2OIQ7CMABFXxtk08AFlgpUxRIsArdbYLG7wSwGu2CQu8FatxNMkSBQiKYX2EJQM0UsARTy5b+fPAGgrUoAK7NkCCMAz/tLSG1Vqtqcqs0B2J93bA452qokTo9tqssIQH9c06iJuoyYImMBYIoMgEZNeDdz6CLSOwjd/PQO4Mvyerl9zN9hCCPiX+0bmas4HFHctfgAAAAASUVORK5CYII=","segmento_m_hoja.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAGCAYAAADgzO9IAAAAh0lEQVR42j2NIQvCQBhA34HxOE7zsU0wTRCsFwXLfovsH1gNrsmSP2NqMpgFs2lhHPYdYv8MMl98PHgAmFxL1XpJCycm1zLxVpTJtWybBXUZ2BwSAG4PUFXrpS4D992M1fHFgEoLJ9k6Yb60TF0E4HyCUd9FuP6qyz4A0HcRNczHmf3L9/Ojvur3K1Fc22+NAAAAAElFTkSuQmCC","segmento_m_liso.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAGCAYAAADgzO9IAAAAe0lEQVR42j3NIQ6DMBhA4dekamka5glUoEqyZHYew2F2g5mJGSwnwfYEKBRTEw0XoFnm/6liv+TlAWC9keFzk7ovxXojANp6I4/pwnjfcF0FAQDRGedXwzOdACCAqvtSXFfRXgvWJRHDBoDeY8r5gXtMqDw/u+LA7/un/mJDK58+wk/vAAAAAElFTkSuQmCC","segmento_p_hoja.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAaUlEQVR42jXBIQrCUAAA0Df2g0HEcywIVg9g0mPMc9gFL7CwQ2jzDn4YWLaFYVTEFYvlm3wvmxXTBMtyIVaNMA+yQ79K5xObLVAfHwIMl7u6m/jL2z7tYb0rfL655/UlvIcR3OIoVg34AeibH1H3vfU0AAAAAElFTkSuQmCC","segmento_p_liso.png":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAYElEQVR42mPk0+L5z8DAwGCYqsdwfvYlBgYGBgbmluMmDZ95xBlWOrIxCMSLMFw+/pOBiYGBgeHB7kcMi3l+MUzJe8TAwMDAwCjvJfOfAQ0wvX/wgeH9gw8MCq5yDDA2AJ36HnXB9SneAAAAAElFTkSuQmCC"}}};
// =====================================================================
//  BossSprite: los 10 jefes dibujados por piezas (JEFES_PIEZAS.md).
//  1 px de arte = 3 px lógicos; cada pieza se coloca por su pivote en el punto donde el código
//  ya ponía esa parte. Solo cambia el dibujo: lógica, tiempos, cajas de choque y carriles son los mismos.
//  Mientras las imágenes no han cargado se usa el dibujo anterior.
// =====================================================================
const BA = {};
for (const id in BOSS_ART_DATA) {
  BA[id] = {};
  for (const f in BOSS_ART_DATA[id].files) { const im = new Image(); im.src = BOSS_ART_DATA[id].files[f]; BA[id][f] = im; }
}
const _baReady = {};
function baReady(id) {
  if (_baReady[id]) return true;
  return (_baReady[id] = Object.values(BA[id]).every(im => im.complete && im.naturalWidth > 0) && Object.values(BA.comun).every(im => im.complete && im.naturalWidth > 0));
}
const baPart = (id, piece) => BOSS_ART_DATA[id].piv.piezas[piece];
function baImg(id, piece, state) {
  const P = baPart(id, piece);
  return BA[id][P.archivos ? (P.archivos[state] || Object.values(P.archivos)[0]) : piece + ".png"];
}
// Dibuja una pieza con su pivote en (x, y) (coordenadas del lienzo actual); s = escala extra (carril de arriba, cielo…)
let baFury = false;   // el boss que se dibuja está en forma furiosa: piezas recoloreadas en rojo
const _baFuryCache = new Map();
function baFuryImg(im) {
  let cv = _baFuryCache.get(im);
  if (!cv) {
    cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height;
    const x = cv.getContext("2d"); x.drawImage(im, 0, 0);
    x.globalCompositeOperation = "source-atop"; x.fillStyle = "rgba(255,30,20,0.38)"; x.fillRect(0, 0, cv.width, cv.height);
    _baFuryCache.set(im, cv);
  }
  return cv;
}
function baDraw(c, id, piece, state, x, y, s = 1) {
  let im = baImg(id, piece, state); if (!im) return;
  if (baFury) im = baFuryImg(im);
  const [px, py] = baPart(id, piece).pivote_arte, k = 3 * s;
  c.imageSmoothingEnabled = false;
  c.drawImage(im, Math.round(x - px * k), Math.round(y - py * k), Math.round(im.width * k), Math.round(im.height * k));
}
// Punto (ax, ay) en px de arte de una pieza cuyo pivote está en (x, y)
function baAt(id, piece, ax, ay, x, y, s = 1) { const [px, py] = baPart(id, piece).pivote_arte; return { x: x + (ax - px) * 3 * s, y: y + (ay - py) * 3 * s }; }
// Cadena de eslabones en pantalla: del ancla `a` a la pieza final `b` (curva con control `ctl`), escala de sA a sB
function baChain(c, id, pieces, a, b, ctl, sA, sB, state) {
  // Los eslabones van del más grueso (ancla) al más fino; si la cadena es larga se repiten para que no queden huecos
  let len = 0, prev = a;
  for (let i = 1; i <= 16; i++) { const p = bezier(a, b, ctl, i / 16); len += Math.hypot(p.x - prev.x, p.y - prev.y); prev = p; }
  const size = Math.min(...pieces.map(pc => baPart(id, pc).tamano_logico[0])) * Math.min(sA, sB);
  const n = Math.max(pieces.length, Math.ceil(len / (size * 0.8)));
  for (let i = 0; i < n; i++) {
    const u = i / n, p = bezier(a, b, ctl, u), k = Math.min(pieces.length - 1, Math.floor(i * pieces.length / n));
    baDraw(c, id, pieces[k], typeof state === "function" ? state(k) : state, p.x, p.y, lerp(sA, sB, u));
  }
}
const baChainPieces = (id, ch) => BOSS_ART_DATA[id].piv.cadenas[ch].piezas;
// Proyectil o aviso común centrado en (x, y)
function baCommon(c, name, x, y, sx = 1, sy = sx) {
  const im = BA.comun[name + ".png"]; if (!im || !im.complete) return;
  c.imageSmoothingEnabled = false;
  c.drawImage(im, Math.round(x - im.width * 1.5 * sx), Math.round(y - im.height * 1.5 * sy), Math.round(im.width * 3 * sx), Math.round(im.height * 3 * sy));
}
// Sustituye el dibujo de una clase de jefe manteniendo el anterior como respaldo
function baPatch(Cls, method, id, fn) {
  const old = Cls.prototype[method];
  Cls.prototype[method] = function (...a) {
    if (!baReady(id)) return old.apply(this, a);
    baFury = !!this.fury; try { return fn.apply(this, a); } finally { baFury = false; }
  };
}
const baHurt = b => b.flash > 0;
const baVuln = b => !!(b.limb && b.vuln > 0);

// ---------- 1. Escorpión gigante (mira a la derecha, entra por detrás) ----------
baPatch(ScorpionBoss, "drawBody", "escorpion", function (c, lane) {
  if ((this.tip.laneT < 0.5 ? 0 : 1) !== lane) return;
  const id = "escorpion", t = this.t, def = this.state === "defeat";
  const bp = { x: this.bx + 30, y: 0 };
  const bodySt = def ? "derrota" : baHurt(this) ? "herido" : Math.floor(t * 3) % 2 ? "reposo_b" : "reposo";
  const claw = Math.sin(t * 4) > 0 ? "abierta" : "reposo";
  c.save(); applyLane(c, 0.5);
  const p1 = baAt(id, "cuerpo", 60, 7, bp.x, bp.y), p2 = baAt(id, "cuerpo", 60, 13, bp.x, bp.y);
  if (!def) baDraw(c, id, "pinza", claw, p1.x, p1.y);
  baDraw(c, id, "cuerpo", bodySt, bp.x, bp.y);
  if (!def) baDraw(c, id, "pinza", claw, p2.x, p2.y);
  c.restore();
  if (def) return;
  const an = baAt(id, "cuerpo", 3, 4, bp.x, bp.y), b = toScreen(0.5, an.x, -an.y), tp = toScreen(this.tip.laneT, this.tip.x, this.tip.y + 15);
  baChain(c, id, baChainPieces(id, "cola"), b, tp, { x: (b.x + tp.x) / 2 - 30, y: Math.min(b.y, tp.y) - 120 }, b.s, tp.s, "unico");
  baDraw(c, id, "aguijon", baVuln(this) ? "clavado" : this.idleTip ? "reposo" : "preparado", tp.x, tp.y, tp.s);
});

// ---------- 2. Serpiente de lianas ----------
baPatch(SerpentBoss, "drawBody", "serpiente", function (c, lane) {
  if ((this.head.laneT < 0.5 ? 0 : 1) !== lane) return;
  const id = "serpiente", x = this.head.x, y = this.head.y;
  const a = { x: 520 + Math.sin(this.t * 0.8) * 20, y: -30 }, h = toScreen(this.head.laneT, x + 26, y + 18);
  baChain(c, id, baChainPieces(id, "cuerpo"), a, h, { x: (a.x + h.x) / 2 + 90, y: (a.y + h.y) / 2 - 10 }, h.s * 0.9, h.s, i => i % 3 === 1 ? "hoja" : "liso");
  const st = baHurt(this) ? "herida" : baVuln(this) ? "apoyada" : !this.idle && this.headTo.x === 420 ? "escupir" : !this.idle ? "ataque" : "reposo";
  c.save(); applyLane(c, this.head.laneT); baDraw(c, id, "cabeza", st, x + 26, -(y + 18)); c.restore();
});

// ---------- 3. Golem de lava ----------
baPatch(GolemBoss, "drawBody", "golem", function (c, lane) {
  const id = "golem", x = this.gx, bp = { x: x + 67, y: -48 };
  const tossing = this.teles.some(w => w.kind === "target");
  if (lane === 0) {
    c.save(); applyLane(c, 0);
    for (const lx of [x + 32, x + 102]) baDraw(c, id, "pierna", "unico", lx, -50);
    baDraw(c, id, "cuerpo", baHurt(this) ? "herido" : "reposo", bp.x, bp.y);
    const core = baAt(id, "cuerpo", 22, 18, bp.x, bp.y);
    baDraw(c, id, "nucleo", baHurt(this) ? "apagado" : tossing || !this.idle ? "brillo" : "reposo", core.x, core.y);
    const neck = baAt(id, "cuerpo", 22, 1, bp.x, bp.y);
    baDraw(c, id, "cabeza", baHurt(this) ? "herido" : tossing || !this.idle ? "enfadado" : "reposo", neck.x, neck.y);
    c.restore();
  }
  if ((this.fist.laneT < 0.5 ? 0 : 1) !== lane) return;
  const an = baAt(id, "cuerpo", 4, 10, bp.x, bp.y), s = toScreen(0, an.x, -an.y), f = toScreen(this.fist.laneT, this.fist.x + 31, this.fist.y + 18);
  baChain(c, id, baChainPieces(id, "brazo"), s, f, { x: (s.x + f.x) / 2, y: Math.min(s.y, f.y) - 30 }, s.s, f.s, "unico");
  const st = baVuln(this) ? "ardiendo" : this.idle ? "reposo" : "cerrado";
  c.save(); applyLane(c, this.fist.laneT); baDraw(c, id, "puno", st, this.fist.x + 31, -(this.fist.y + 18)); c.restore();
});

// ---------- 4. Mamut de hielo ----------
baPatch(MammothBoss, "drawBody", "mamut", function (c, lane) {
  if ((this.laneT < 0.5 ? 0 : 1) !== lane) return;
  const id = "mamut", x = this.mx, moving = this.mode === "charge" || this.mode === "back", bp = { x: x + 80, y: -24 };
  c.save(); applyLane(c, this.laneT);
  [8, 18, 32, 42].forEach((ax, i) => { const p = baAt(id, "cuerpo", ax, 19, bp.x, bp.y); baDraw(c, id, "pata", moving && (Math.floor(this.t * 12) + i) % 2 ? "b" : "a", p.x, p.y); });
  baDraw(c, id, "cuerpo", baHurt(this) ? "herido" : "reposo", bp.x, bp.y);
  const hp = baAt(id, "cuerpo", 2, 6, bp.x, bp.y), dazed = this.mode === "dazed";
  baDraw(c, id, "cabeza", dazed ? "aturdido" : this.mode === "prep" || this.mode === "charge" ? "carga" : "reposo", hp.x, hp.y);
  const tk = baAt(id, "cabeza", 4, 9, hp.x, hp.y);
  baDraw(c, id, "colmillo", "unico", tk.x, tk.y);
  if (dazed) baDraw(c, id, "estrellas", "unico", hp.x - 20 + Math.sin(this.t * 6) * 6, hp.y - 30);
  c.restore();
});

// ---------- 5. Pterodáctilo sombra ----------
function baPteroState(b) {
  if (baHurt(b)) return "herido";
  if (b.mode === "glide" && !b.glideHit) return "rasante";
  if (b.mode === "dive") return "picado";
  return ["vuelo_1", "vuelo_2", "vuelo_3", "vuelo_2"][Math.floor(b.t * 10) % 4];
}
baPatch(ShadowPteroBoss, "drawSky", "ptero", function (c) {
  if (this.mode !== "sky") return;
  c.save();
  if (this.flash > 0 && Math.floor(this.flash * 30) % 2 === 0) c.filter = "brightness(3)";
  if (this.state === "defeat") c.globalAlpha = clamp(1 - this.stateT / 1.8, 0, 1);
  const s = this.skyPos(); baDraw(c, "ptero", "cuerpo", baPteroState(this), s.x, s.y, 1.2);
  c.restore();
});
baPatch(ShadowPteroBoss, "drawBody", "ptero", function (c, lane) {
  if (this.mode === "sky" || (this.wp.laneT < 0.5 ? 0 : 1) !== lane) return;
  c.save(); applyLane(c, this.wp.laneT);
  if (this.mode === "glide" && !this.glideHit) {
    c.fillStyle = `rgba(255,225,77,${0.2 + 0.12 * Math.sin(this.t * 12)})`;
    c.beginPath(); c.ellipse(this.wp.x + 50, -(this.wp.y + 18), 80, 30, 0, 0, Math.PI * 2); c.fill();
  }
  baDraw(c, "ptero", "cuerpo", baPteroState(this), this.wp.x + 50, -(this.wp.y + 20), 0.85);
  c.restore();
});

// ---------- 6. Rey cangrejo ----------
baPatch(CrabBoss, "drawBody", "cangrejo", function (c, lane) {
  const id = "cangrejo", x = this.cx, bp = { x: x + 78, y: -3 };
  if (lane === 0) {
    c.save(); applyLane(c, 0);
    baDraw(c, id, "cuerpo", baHurt(this) ? "herido" : Math.floor(this.t * 4) % 2 ? "reposo_b" : "reposo", bp.x, bp.y);
    c.restore();
  }
  if ((this.claw.laneT < 0.5 ? 0 : 1) !== lane) return;
  const an = baAt(id, "cuerpo", 6, 10, bp.x, bp.y), s = toScreen(0, an.x, -an.y), f = toScreen(this.claw.laneT, this.claw.x + 39, this.claw.y + 19);
  baChain(c, id, baChainPieces(id, "brazo"), s, f, { x: (s.x + f.x) / 2, y: Math.min(s.y, f.y) - 30 }, s.s, f.s, "unico");
  const st = this.flipped ? "volteada" : baVuln(this) || this.fast ? "apoyada" : this.idle ? "reposo" : "abierta";
  c.save(); applyLane(c, this.claw.laneT); baDraw(c, id, "pinza", st, this.claw.x + 39, -(this.claw.y + 19)); c.restore();
});

// ---------- 7. Sapo gigante ----------
baPatch(FrogBoss, "drawBody", "sapo", function (c, lane) {
  if ((this.laneT < 0.5 ? 0 : 1) !== lane) return;
  const x = this.frogX, y = this.frogY, air = y > 4;
  const st = baHurt(this) ? "herido" : this.tongue > 0 ? "lengua" : air ? "salto" : this.mode === "rest" ? "aterrizaje" : "sentado";
  c.save(); applyLane(c, this.laneT);
  if (!air) drawShadow(c, x + 55, 120, 0);
  baDraw(c, "sapo", "cuerpo", st, x + 55, -(y + 3));
  c.restore();
});
drawTongueHaz = function (c, h) {   // lengua: eslabones desde la boca y la punta al final
  const cy = -(h.y + h.h / 2);
  for (let x = h.x + h.w; x > h.x + 12; x -= 9) baDraw(c, "sapo", "lengua_segmento", "unico", x, cy);
  baDraw(c, "sapo", "lengua_punta", "unico", h.x + 12, cy);
};

// ---------- 8. Kraken abisal ----------
baPatch(KrakenBoss, "drawSky", "kraken", function (c) {
  const h = this.headPos();
  c.save();
  if (this.flash > 0 && Math.floor(this.flash * 30) % 2 === 0) c.filter = "brightness(3)";
  if (this.state === "defeat") c.globalAlpha = clamp(1 - this.stateT / 1.8, 0, 1);
  baDraw(c, "kraken", "cabeza", baHurt(this) ? "herido" : this.idle ? "reposo" : "enfadado", h.x, h.y - 54);
  c.restore();
});
baPatch(KrakenBoss, "drawBody", "kraken", function (c, lane) {
  if ((this.tip.laneT < 0.5 ? 0 : 1) !== lane) return;
  const id = "kraken", h = this.headPos(), a = baAt(id, "cabeza", 12, 26, h.x, h.y - 54), tp = toScreen(this.tip.laneT, this.tip.x + 22, this.tip.y + 15);
  baChain(c, id, baChainPieces(id, "tentaculo_largo"), a, tp, { x: (a.x + tp.x) / 2 + 60, y: Math.min(a.y, tp.y) - 20 }, 1, tp.s, "unico");
  const st = this.cut && baVuln(this) ? "cortada" : baVuln(this) ? "apoyada" : this.fast ? "golpe" : "reposo";
  c.save(); applyLane(c, this.tip.laneT); baDraw(c, id, "punta", st, this.tip.x + 22, -(this.tip.y + 15)); c.restore();
});
drawSweepHaz = function (c, h) { const im = BA.kraken["barredor.png"]; c.imageSmoothingEnabled = false; c.drawImage(im, Math.round(h.x), Math.round(-(h.y + h.h)), im.width * 3, im.height * 3); };
drawInkHaz = function (c, h) { baCommon(c, "tinta", h.x + h.w / 2, -(h.y + h.h / 2)); };

// ---------- 9. Rey de los huesos ----------
baPatch(BoneRexBoss, "drawBody", "huesos", function (c, lane) {
  const id = "huesos", x = this.bx, bp = { x: x + 75, y: -3 };
  if (lane === 0) {
    c.save(); applyLane(c, 0);
    const ta = baAt(id, "cuerpo", 38, 6, bp.x, bp.y), tail = baChainPieces(id, "cola");
    tail.forEach((pc, i) => baDraw(c, id, pc, "unico", ta.x + 12 + i * 13, ta.y + 4 + i * 3 + Math.sin(this.t * 3 + i * 0.6) * 2));
    baDraw(c, id, "cuerpo", baHurt(this) ? "herido" : "reposo", bp.x, bp.y);
    const arm = baAt(id, "cuerpo", 6, 9, bp.x, bp.y);
    baDraw(c, id, "bracito", "unico", arm.x, arm.y);
    const sh = this.shield > 0 ? `cargas_${this.shield}` : this.shieldDown > 0 ? "roto" : null;
    if (sh) { c.save(); c.globalAlpha *= 0.85 + 0.15 * Math.sin(this.t * 6); baDraw(c, id, "escudo", sh, bp.x, bp.y - 63); c.restore(); }
    c.restore();
  }
  if ((this.skull.laneT < 0.5 ? 0 : 1) !== lane) return;
  const nk = baAt(id, "cuerpo", 4, 3, bp.x, bp.y), s = toScreen(0, nk.x, -nk.y), sx = this.skull.x, sy = this.skull.y, f = toScreen(this.skull.laneT, sx + 54, sy + 28);
  baChain(c, id, baChainPieces(id, "cuello"), s, f, { x: (s.x + f.x) / 2, y: Math.min(s.y, f.y) - 30 }, s.s, f.s, "unico");
  const bite = this.jaw > 0, st = baHurt(this) ? "herido" : baVuln(this) ? "apoyado" : bite ? "mordisco" : "reposo";
  c.save(); applyLane(c, this.skull.laneT);
  const m = baAt(id, "craneo", 23, 10, sx + 54, -(sy + 28));
  baDraw(c, id, "mandibula", bite ? "abierta" : "cerrada", m.x, m.y);
  baDraw(c, id, "craneo", st, sx + 54, -(sy + 28));
  c.restore();
});
drawBoneHaz = function (c, h) { baCommon(c, "hueso", h.x + h.w / 2, -(h.y + h.h / 2)); };
drawWispHaz = function (c, h) { baCommon(c, "fuego_fantasma", h.x + h.w / 2, -(h.y + h.h / 2)); };

// ---------- 10. Nave nodriza ----------
function baUfo(b, c, cx, cy, s) {
  const id = "nave", ph = b.phase, hurt = baHurt(b);
  const laser = b.teles.some(w => w.kind === "line") || b.hazards.some(h => h.draw === drawLaserHaz);
  const beam = b.hazards.some(h => h.draw === drawBeamHaz);
  if (b.mode === "land" && b.k >= 1) { const p = baAt(id, "platillo", 20, 8, cx, cy, s); baDraw(c, id, "patas", "aterrizada", p.x, p.y, s); }
  const cn = baAt(id, "platillo", 8, 8, cx, cy, s); baDraw(c, id, "canon", laser ? "disparo" : "reposo", cn.x, cn.y, s);
  if (beam) { const e = baAt(id, "platillo", 20, 8, cx, cy, s); baDraw(c, id, "emisor", "rayo", e.x, e.y, s); }
  const dome = ph === 3 ? (b.mode === "glide" && !b.glideHit ? "brillante" : "agrietada") : "normal";
  const dp = baAt(id, "platillo", 20, 0, cx, cy, s); baDraw(c, id, "cupula", dome, dp.x, dp.y, s);
  baDraw(c, id, "platillo", hurt ? "herido" : "fase" + ph, cx, cy, s);
  [6, 12, 18, 24, 30, 36].forEach((lx, i) => { const p = baAt(id, "platillo", lx, 4, cx, cy, s); baDraw(c, id, "luz", hurt ? "alerta" : (Math.floor(b.t * 6) + i) % 2 ? "on" : "off", p.x, p.y, s); });
}
baPatch(UfoBoss, "drawSky", "nave", function (c) {
  if (this.mode !== "sky") return;
  c.save();
  if (this.flash > 0 && Math.floor(this.flash * 30) % 2 === 0) c.filter = "brightness(3)";
  if (this.state === "defeat") c.globalAlpha = clamp(1 - this.stateT / 1.8, 0, 1);
  const s = this.skyPos(); baUfo(this, c, s.x, s.y, 1.2);
  c.restore();
});
baPatch(UfoBoss, "drawBody", "nave", function (c, lane) {
  if (this.mode === "sky" || (this.wp.laneT < 0.5 ? 0 : 1) !== lane) return;
  c.save(); applyLane(c, this.wp.laneT);
  if (this.mode === "glide" && !this.glideHit && this.phase === 3) {
    c.fillStyle = `rgba(255,225,77,${0.2 + 0.12 * Math.sin(this.t * 12)})`;
    c.beginPath(); c.ellipse(this.wp.x + 55, -(this.wp.y + 26), 90, 34, 0, 0, Math.PI * 2); c.fill();
  }
  baUfo(this, c, this.wp.x + 55, -(this.wp.y + 14), 0.9);
  c.restore();
});
drawSaucerHaz = function (c, h) { baCommon(c, "mininave", h.x + h.w / 2, -(h.y + h.h / 2)); };
drawLaserHaz = function (c, h) {
  c.fillStyle = "rgba(255,79,216,0.3)"; c.fillRect(h.x, -(h.y + h.h) - 6, h.w, h.h + 12);
  const im = BA.comun["laser_tramo.png"]; c.imageSmoothingEnabled = false;
  for (let x = h.x; x < h.x + h.w; x += 24) c.drawImage(im, Math.round(x), Math.round(-(h.y + h.h)), 24, Math.round(h.h));
};
drawBeamHaz = function (c, h) {
  const im = BA.comun["rayo_tramo.png"]; c.imageSmoothingEnabled = false;
  c.globalAlpha = 0.85 + 0.15 * Math.sin(h.t * 20);
  for (let y = h.y - mod(h.t * 300, 36); y < h.y + h.h; y += 36) c.drawImage(im, Math.round(h.x - 4), Math.round(-(y + 36)), Math.round(h.w + 8), 36);
  c.globalAlpha = 1;
};

// ---------- Proyectiles comunes ----------
drawSpikeHaz = function (c, h) { baCommon(c, h.color === "#6fb0d8" ? "fragmento_hielo" : "pincho", h.x + h.w / 2, -(h.y + h.h / 2)); };
drawRockHaz = function (c, h) {
  for (let i = 1; i < 4; i++) { c.globalAlpha = 0.4 - i * 0.1; B(c, "#ff6a1a", h.x + h.w + i * 10, h.y + h.h / 2 + i * 8, 10, 10); }
  c.globalAlpha = 1; baCommon(c, "roca_lava", h.x + h.w / 2, -(h.y + h.h / 2));
};
drawVenomHaz = function (c, h) { baCommon(c, "veneno", h.x + h.w / 2, -(h.y + h.h / 2)); };
drawFeatherHaz = function (c, h) { baCommon(c, "pluma", h.x + h.w / 2, -(h.y + h.h / 2)); };
drawBubbleHaz = function (c, h) { baCommon(c, "burbuja", h.x + h.w / 2, -(h.y + h.h / 2)); };

// ---------- Avisos (siempre rojos) ----------
const _baTele = Boss.prototype.drawTele;
Boss.prototype.drawTele = function (c, w) {
  if (!baReady("comun")) return _baTele.call(this, c, w);
  const k = clamp(w.t / w.dur, 0, 1), blink = Math.floor(w.t * 10) % 2 === 0, cx = w.x + w.w / 2;
  if (w.kind === "shadow") { c.globalAlpha = 0.55 + 0.45 * k; baCommon(c, "aviso_sombra", cx, -10, 0.6 + 0.5 * k, 0.6 + 0.5 * k); c.globalAlpha = 1; }
  else if (w.kind === "target") {
    c.fillStyle = `rgba(90,0,0,${0.25 + 0.35 * k})`; c.beginPath(); c.ellipse(cx, 0, (w.w / 2 + 12) * (0.4 + 0.6 * k), 8, 0, 0, Math.PI * 2); c.fill();
    if (blink || k > 0.6) baCommon(c, "aviso_diana", cx, -20, 1, 1);
  } else if (w.kind === "arrow") { if (blink) baCommon(c, "aviso_flecha", 840, -(w.y + 16)); }
  else if (w.kind === "line") {
    c.fillStyle = `rgba(255,59,92,${0.1 + 0.2 * k})`; c.fillRect(0, -(w.y + w.h), w.x2, w.h);
    if (blink) { const im = BA.comun["aviso_linea.png"]; c.imageSmoothingEnabled = false; for (let x = 0; x < w.x2; x += 24) c.drawImage(im, x, Math.round(-(w.y + w.h / 2) - 3), 24, 6); }
  } else _baTele.call(this, c, w);
};

