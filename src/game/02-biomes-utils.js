// =====================================================================
//  BIOMAS — uno por nivel (se repiten en ciclo). Paleta, fondo y obstáculos propios.
// =====================================================================
const BIOMES = [
  { id: "desert", name: "Desierto", accent: "#ffd35a", sky: "sun", clouds: "#ffffff",
    pal: { skyTop: "#5fb4ea", skyBot: "#fde9b8", far: "#e8c07e", near: "#d9a35e", ground: "#ecd49a", band: "#dcbf80", bandHi: "#f6e6b8", bandEdge: "#b08f50", pebble: "#c2a468" },
    far: { min: 30, max: 90, rough: 0.18, step: 12 }, near: { min: 10, max: 45, rough: 0.14, step: 10 },
    obstacles: { ground: "cactus", rock: "rock", flyer: "ptero" } },
  { id: "jungle", name: "Selva", accent: "#7be07a", sky: "sun", clouds: "#f2fff0", ambient: "leaves", deco: ["trees", "lianas"],
    pal: { skyTop: "#bfe3a0", skyBot: "#e8f6d6", far: "#6aa860", near: "#3f7d3f", ground: "#3a2a1a", band: "#2e6b2a", bandHi: "#4f9a3a", bandEdge: "#1d5423", pebble: "#4f9a3a",
           trunk: "#4a3420", canopy: "#2f7a3c", canopyHi: "#4fa650", liana: "#2f6b2a" },
    far: { min: 40, max: 100, rough: 0.3, step: 14 }, near: { min: 14, max: 40, rough: 0.2, step: 10 },
    obstacles: { ground: "log", rock: "mossrock", flyer: "ptero" } },
  { id: "volcano", name: "Volcán", accent: "#ff7a2a", sky: "none", clouds: "#3a2426", ambient: "ash", deco: ["volcano", "lava"],
    pal: { skyTop: "#3a1410", skyBot: "#7a2a14", far: "#3a1c1e", near: "#1e1214", ground: "#3b2a28", band: "#4a3430", bandHi: "#6a4a40", bandEdge: "#221816", pebble: "#ff7a2a",
           lava: "#ff6a1a", lavaHi: "#ffd05a" },
    far: { min: 30, max: 110, rough: 0.5, step: 12 }, near: { min: 10, max: 40, rough: 0.45, step: 8 },
    obstacles: { ground: "obsidian", rock: "lavarock", flyer: "ptero" } },
  { id: "glacier", name: "Glaciar", accent: "#9fe4ff", sky: "none", stars: true, ambient: "snow", deco: ["sparkle", "aurora"],
    pal: { skyTop: "#0b1a33", skyBot: "#1d3a66", far: "#2c4f80", near: "#3d6a9e", ground: "#9fd8ff", band: "#bfe6ff", bandHi: "#ffffff", bandEdge: "#6fa8d0", pebble: "#ffffff", cap: "#e8f6ff" },
    far: { min: 40, max: 130, rough: 0.5, step: 12, cap: true }, near: { min: 12, max: 50, rough: 0.3, step: 10, cap: true },
    obstacles: { ground: "iceblock", rock: "icerock", flyer: "ptero" } },
  { id: "night", name: "Noche estrellada", accent: "#c8b8ff", sky: "moon", stars: true, deco: ["shooting"],
    pal: { skyTop: "#050820", skyBot: "#262a5c", far: "#1a1f45", near: "#11152e", ground: "#2c2a45", band: "#34325a", bandHi: "#4a4880", bandEdge: "#1b1a30", pebble: "#6a68b0" },
    far: { min: 30, max: 90, rough: 0.2, step: 12 }, near: { min: 10, max: 40, rough: 0.15, step: 10 },
    obstacles: { ground: "crystal", rock: "meteor", flyer: "ptero" } },
  { id: "beach", name: "Playa tropical", accent: "#ffe14d", sky: "sun", clouds: "#ffffff", deco: ["trees", "lava"],
    pal: { skyTop: "#3fb8f0", skyBot: "#c8f0ff", far: "#6ad0a0", near: "#3aa878", ground: "#f3dca0", band: "#ead08a", bandHi: "#fff4d0", bandEdge: "#c8a860", pebble: "#ffffff",
           trunk: "#8a5a2a", canopy: "#2f9a3a", canopyHi: "#6cd05a", lava: "#1a8fd0", lavaHi: "#e8fbff" },
    far: { min: 20, max: 60, rough: 0.2, step: 14 }, near: { min: 8, max: 30, rough: 0.2, step: 10 },
    obstacles: { ground: "log", rock: "rock", flyer: "ptero" } },
  { id: "mushroom", name: "Bosque de setas", accent: "#ff7ad0", sky: "moon", clouds: "#6a4a8a", ambient: "spores", ambientColors: ["#ff7ad0", "#7df9ff", "#ffe14d"], deco: ["trees"],
    pal: { skyTop: "#2a1450", skyBot: "#a85ac0", far: "#4a2a6a", near: "#3a1f58", ground: "#3a2a1a", band: "#5a3a7a", bandHi: "#c9a6ff", bandEdge: "#2a1a3a", pebble: "#ff7ad0",
           trunk: "#f3e2b8", canopy: "#d23a4a", canopyHi: "#ffffff" },
    far: { min: 30, max: 90, rough: 0.3, step: 14 }, near: { min: 10, max: 40, rough: 0.25, step: 10 },
    obstacles: { ground: "log", rock: "mossrock", flyer: "ptero" } },
  { id: "ocean", name: "Fondo marino", accent: "#7df9ff", sky: "none", ambient: "bubbles", deco: ["sparkle"],
    pal: { skyTop: "#04203a", skyBot: "#1a6a9a", far: "#0e3a5a", near: "#0a2c48", ground: "#c8b88a", band: "#d8c89a", bandHi: "#fff4d0", bandEdge: "#8a7a50", pebble: "#ff9ad0" },
    far: { min: 40, max: 110, rough: 0.45, step: 12 }, near: { min: 12, max: 44, rough: 0.35, step: 10 },
    obstacles: { ground: "crystal", rock: "mossrock", flyer: "fish" } },
  { id: "graveyard", name: "Cementerio encantado", accent: "#6aff8a", sky: "moon", stars: true, ambient: "spores", ambientColors: ["#6aff8a", "#b8ffc8"], deco: ["shooting"],
    pal: { skyTop: "#0a0a18", skyBot: "#2a3a3a", far: "#1a2020", near: "#121818", ground: "#1e1e24", band: "#2e2e36", bandHi: "#5a6a5a", bandEdge: "#0e0e14", pebble: "#6aff8a" },
    far: { min: 30, max: 90, rough: 0.3, step: 12 }, near: { min: 10, max: 40, rough: 0.25, step: 8 },
    obstacles: { ground: "tomb", rock: "rock", flyer: "ptero" } },
  { id: "moon", name: "Base lunar", accent: "#c9d0dc", sky: "earth", stars: true, deco: ["shooting"],
    pal: { skyTop: "#000004", skyBot: "#0a0a20", far: "#5a5e6a", near: "#7a7e8a", ground: "#9a9ea8", band: "#b4b8c2", bandHi: "#e8eaf0", bandEdge: "#6a6e7a", pebble: "#5a5e6a", cap: "#e8eaf0" },
    far: { min: 30, max: 100, rough: 0.4, step: 12, cap: true }, near: { min: 10, max: 40, rough: 0.3, step: 10 },
    obstacles: { ground: "crystal", rock: "meteor", flyer: "drone" } },
];

// =====================================================================
//  Constantes de escena (no afectan al balance)
// =====================================================================
const W = 900, H = 360;
const PX = 3;                                            // tamaño de un píxel de sprite
const VANISH_X = W / 2;                                  // punto de fuga de la perspectiva
const LANES = [ { y: 236, s: 0.8 }, { y: 318, s: 1 } ];  // 0 = carril de arriba (fondo), 1 = de abajo
const PLAYER_X = 130;
const SPAWN_X = 1180;
const DESPAWN_X = -250;
const SAVE_KEY = "dinoRunner.save.v2";

const GROUND_SIZES = { small: { w: 24, h: 46 }, big: { w: 32, h: 64 }, tall: { w: 34, h: 86 } };
const ROCK_SIZES   = { small: { w: 44, h: 32 }, tall: { w: 48, h: 112 } };
const FLYER_HEIGHTS = { low: 0, mid: 34, high: 90, wall: 92 };   // altura sobre el suelo

const POWERUPS = {
  shield: { name: "Escudo",       color: "#4aa3ff", dur: () => CONFIG.SHIELD_DURATION },
  magnet: { name: "Imán",         color: "#ff4d6d", dur: () => CONFIG.MAGNET_DURATION },
  slowmo: { name: "Cámara lenta", color: "#a88bff", dur: () => CONFIG.SLOWMO_DURATION },
  turbo:  { name: "Turbo",        color: "#ffb000", dur: () => CONFIG.TURBO_DURATION },
};
const POWERUP_TYPES = Object.keys(POWERUPS);

// =====================================================================
//  Utilidades
// =====================================================================
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const choice = arr => arr[Math.floor(Math.random() * arr.length)];
const mod = (v, m) => ((v % m) + m) % m;
const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const pad = (n, l = 6) => String(Math.max(0, n)).padStart(l, "0");
const hash = (a, b = 0, c = 0) => (((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) >>> 0) % 1000 / 1000;
function seededRandom(seed) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function makeRidge(seed, tile, step, minH, maxH, rough) {
  const r = seededRandom(seed), pts = []; let h = (minH + maxH) / 2;
  for (let x = 0; x < tile; x += step) { h = clamp(h + (r() - 0.5) * (maxH - minH) * rough, minH, maxH); pts.push(h); }
  const n = pts.length, blend = Math.min(8, n >> 1);   // funde el final con el inicio para que el mosaico sea continuo
  for (let i = 0; i < blend; i++) pts[n - 1 - i] = lerp(pts[n - 1 - i], pts[i], 1 - i / blend);
  return { pts, step, tile };
}
function drawRidge(c, r, baseY, offset, color, capColor) {
  const off = mod(offset, r.tile);
  for (let k = 0; k < 2; k++) {
    const ox = k * r.tile - off;
    for (let i = 0; i < r.pts.length; i++) {
      const x = ox + i * r.step; if (x > W + 10 || x + r.step < -10) continue;
      const h = r.pts[i], top = Math.floor(baseY - h);
      c.fillStyle = color; c.fillRect(Math.floor(x), top, r.step + 1, Math.ceil(h) + 4);
      if (capColor && h > 40) { c.fillStyle = capColor; c.fillRect(Math.floor(x), top, r.step + 1, Math.round((h - 30) * 0.18)); }
    }
  }
}

// Perspectiva: cada carril tiene una línea de suelo y una escala.
function laneProj(t) { return { gy: lerp(LANES[0].y, LANES[1].y, t), s: lerp(LANES[0].s, LANES[1].s, t) }; }
// Deja el contexto en coordenadas de mundo del carril: x = x de mundo, y hacia arriba = negativa.
function applyLane(ctx, t) { const p = laneProj(t); ctx.translate(VANISH_X * (1 - p.s), p.gy); ctx.scale(p.s, p.s); }


// =====================================================================
//  Sprites propios de obstáculos (pterodáctilo): mapas de letras → rectángulos
// =====================================================================
function compileSprite(rows, pal) {
  const runs = [];
  rows.forEach((row, y) => {
    let cur = null, sx = 0, len = 0;
    const flush = () => { if (cur) runs.push([cur, sx, y, len]); cur = null; len = 0; };
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]] || null;
      if (col !== cur) { flush(); if (col) { cur = col; sx = x; len = 1; } } else if (col) len++;
    }
    flush();
  });
  return { runs, w: Math.max(...rows.map(r => r.length)) * PX, h: rows.length * PX };
}
function drawSkinSprite(ctx, spr, x, y) {
  for (const [col, rx, ry, rw] of spr.runs) { ctx.fillStyle = col; ctx.fillRect(x + rx * PX, y + ry * PX, rw * PX, PX + 0.4); }
}
const BIRD_PAL = { p: "#9b59b6", q: "#5e2d73", b: "#f5b041", w: "#ffffff", k: "#15161c" };
const BIRD_SPR = [
  compileSprite([
    "........q.............", "........qq............", ".......qpq............", "......qppq............",
    ".bb..qpppq............", "bbbqqppppqqqqqq.......", ".bqpwkpppppppppqqq....", "..qqpppppppppppppq....",
    ".....qqppppppqqq......", ".......qqpq...........", "......................", "......................",
  ], BIRD_PAL),
  compileSprite([
    "......................", "......................", "......................", "......................",
    ".bb...................", "bbbqqqqqqqqqqqq.......", ".bqpwkpppppppppqqq....", "..qqpppppppppppppq....",
    ".....qqpppppqqq.......", "......qppq............", "......qpq.............", "......qq..............",
  ], BIRD_PAL),
];

// Utilidades de color (sombreado de bosses y fondos)
const _shadeCache = {};
function hexRgb(hex) { const n = parseInt(hex.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function shadeHex(hex, f) {   // f > 0 aclara hacia blanco, f < 0 oscurece hacia negro
  const k = hex + f; if (_shadeCache[k]) return _shadeCache[k];
  const [r, g, b] = hexRgb(hex), t = f > 0 ? 255 : 0, a = Math.abs(f);
  return (_shadeCache[k] = "#" + [r, g, b].map(v => Math.round(v + (t - v) * a).toString(16).padStart(2, "0")).join(""));
}
const rgbaHex = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };

