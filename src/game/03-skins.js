// =====================================================================
//  SkinCatalog: skins del kit + exclusivos de logros + diseños propios, todo en el motor DinoSkinsEngine
// =====================================================================
const SE = window.DinoSkinsEngine;
// ---------------------------------------------------------------------
//  Estelas y rugidos comprables: se equipan aparte y valen para cualquier skin (la estela se suma a la del skin
//  y el rugido comprado sustituye al suyo). Las estelas usan el motor del kit con «skins fantasma» trailfx-*.
// ---------------------------------------------------------------------
let TRAIL_EQUIPPED = null, ROAR_EQUIPPED = null;
const SHOP_TRAILS = [
  { id: "nieve", name: "Copos de nieve", price: 600, desc: "Nieve que cae detrás de ti", trail: { type: "snow", colors: ["#ffffff", "#c7f0ff", "#8fd3ff"] } },
  { id: "llamas", name: "Llamas", price: 700, desc: "Fuego naranja que sube", trail: { type: "fire", colors: ["#fff3b0", "#ffd23f", "#ff9f1c", "#ff5a1f"] } },
  { id: "confeti", name: "Confeti", price: 800, desc: "Destellos de colores", trail: { type: "sparkle", colors: ["#ff3b5c", "#ffd23f", "#3ddc84", "#41b8ff", "#ff5ce1"] } },
  { id: "llamas-azules", name: "Llamas azules", price: 1000, desc: "El fuego más caliente", trail: { type: "fire", colors: ["#e0fbff", "#7df9ff", "#41b8ff", "#1a4fb0"] } },
  { id: "estrellas", name: "Polvo de estrellas", price: 1100, desc: "Estrellas que parpadean", trail: { type: "stars", colors: ["#ffffff", "#ffe14d", "#8fd3ff"] } },
  { id: "aura", name: "Aura esmeralda", price: 1300, desc: "Energía verde que te rodea", trail: { type: "aura", colors: ["#3ddc84", "#b8ffc8", "#ffffff"] } },
  { id: "arcoiris", name: "Arcoíris", price: 1700, desc: "La estela clásica de 6 colores", trail: { type: "rainbow", colors: ["#ff3b5c", "#ff9f1c", "#ffd23f", "#3ddc84", "#41b8ff", "#8a5cff"] } },
  { id: "prisma", name: "Cinta prismática", price: 2300, desc: "Arcoíris que va rotando con destellos", trail: { type: "prism", colors: ["#ff3b5c", "#ff9f1c", "#ffd23f", "#3ddc84", "#41b8ff", "#8a5cff"] } },
];
const SHOP_ROARS = [
  { id: "r-fuego", name: "Rugido de fuego", price: 800, type: "fire", colors: ["#ffd23f", "#ff7a1a", "#ff3d00"] },
  { id: "r-hielo", name: "Rugido helado", price: 800, type: "ice", colors: ["#ffffff", "#c7f0ff", "#8fd3ff"] },
  { id: "r-rayo", name: "Rugido eléctrico", price: 1000, type: "bolt", colors: ["#41e1ff", "#ffffff", "#1a8fff"] },
  { id: "r-cristal", name: "Rugido de cristal", price: 1000, type: "shards", colors: ["#b07cf0", "#e4d0ff", "#ffffff", "#7e45c9"] },
  { id: "r-fantasma", name: "Rugido espectral", price: 1300, type: "ghost", colors: ["#e8ecff", "#a9b8ff", "#ffffff"] },
  { id: "r-estelar", name: "Rugido estelar", price: 1400, type: "stars", colors: ["#ffffff", "#5ce1ff", "#ff8fd8", "#8a5cff"] },
  { id: "r-arcoiris", name: "Rugido arcoíris", price: 1800, type: "rainbow", colors: ["#ff3b5c", "#ff9f1c", "#ffd23f", "#3ddc84", "#41b8ff", "#8a5cff"] },
  { id: "r-dragon", name: "Rugido del dragón", price: 2200, type: "fire", colors: ["#e0ffe8", "#a0ffd0", "#2ac07a", "#ffe14d"], wings: true },
  { id: "r-solar", name: "Rugido solar", price: 2600, type: "sun", colors: ["#ffffff", "#ffe680", "#ffc629", "#ff3df2"], flash: true, wings: true },
];
const TRAIL_BY_ID = Object.fromEntries(SHOP_TRAILS.map(t => [t.id, t])), SHOP_ROAR_BY_ID = Object.fromEntries(SHOP_ROARS.map(r => [r.id, r]));
const TRAIL_SKINS = SHOP_TRAILS.map(t => ({ id: "trailfx-" + t.id, name: t.name, sprite: "raptor", rarity: "Común", price: 0, pal: {}, fx: { trail: t.trail }, hidden: true }));
// ---------------------------------------------------------------------
//  Pose agachada: se genera a partir del dibujo de cada sprite (cabeza adelantada y baja, cuerpo tumbado,
//  patas flexionadas que alternan como al correr), así cada skin conserva sus manchas, crestas y cristales.
// ---------------------------------------------------------------------
const DUCK_W = 32;
function spriteGrid(spr, frame) {
  const fr = spr.frames[frame] || spr.frames.idle;
  if (fr.full) return fr.full.map(r => (r + ".".repeat(DUCK_W)).slice(0, DUCK_W).split(""));
  const rows = spr.body.concat(fr.legs).map(r => (r + ".".repeat(24)).slice(0, 24).split(""));
  if (fr.top) fr.top[1].forEach((r, i) => { for (let j = 0; j < Math.min(r.length, 24); j++) if (r[j] !== ".") rows[fr.top[0] + i][j] = r[j]; });
  return rows;
}
function duckGrid(spr, legsFrame) {
  const G = spriteGrid(spr, "idle"), L = spriteGrid(spr, legsFrame), out = Array.from({ length: 20 }, () => Array(DUCK_W).fill("."));
  const put = (y, x, c, force) => { if (c !== "." && y >= 0 && y < 20 && x >= 0 && x < DUCK_W && (force || out[y][x] === "." || out[y][x] === "o")) out[y][x] = c; };
  const solid = c => c !== "." && c !== "o";
  for (let y = 1; y <= 6; y++) for (let x = 11; x < 24; x++) put(y + 9, x + 8, G[y][x], true);            // cabeza
  for (let y = 9; y <= 15; y++) for (let x = 0; x < 20; x++) {                                               // cuerpo y cola
    let c = G[y][x]; if (y <= 10 && x >= 8 && x <= 16 && c === "a") c = "b";
    if (y === 9 && x >= 3 && "oba.".includes(c)) continue; put(y + 2, x, c);
  }
  for (let y = 6; y <= 8; y++) for (let x = 0; x < 10; x++) if (!"ob.".includes(G[y][x])) put(y + 3, x, G[y][x]);   // crestas de la espalda
  for (let y = 12; y <= 14; y++) for (let x = 14; x <= 20; x++) if (!solid(out[y][x])) out[y][x] = "b";               // cuello
  put(15, 19, "o", true); put(15, 20, "a", true); put(15, 21, "a", true); put(16, 21, "o", true); put(16, 22, "a", true);   // bracito
  [L[16], L[18]].forEach((row, i) => row.forEach((c, x) => put(18 + i, x + 1, c)));                         // patas flexionadas
  const o2 = out.map(r => r.slice());
  for (let y = 0; y < 20; y++) for (let x = 0; x < DUCK_W; x++) if (out[y][x] === ".")
    for (const [a, b] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const c = (out[y + a] || [])[x + b]; if (c && solid(c) && !"xy".includes(c)) { o2[y][x] = "o"; break; } }
  return o2.map(r => r.join(""));
}
function addDuckFrames(spr) { spr.frames.duck1 = { full: duckGrid(spr, "run1") }; spr.frames.duck2 = { full: duckGrid(spr, "run2") }; }
for (const k in SKINS_DATA.sprites) addDuckFrames(SKINS_DATA.sprites[k]);
// Desplazamiento de los accesorios cuando el raptor va agachado (en píxeles del sprite)
const DUCK_HEAD = { x: 8, y: 9 }, DUCK_BACK = { x: 1, y: 3 };
const SkinCatalog = {
  base: SKINS_DATA.skins.map(s => s.id === CONFIG.DEFAULT_SKIN ? Object.assign({}, s, { price: 0 }) : s),
  designs: [],
  preview: null,
  // Vuelve a registrar todos los skins en el motor (al guardar un diseño o cambiar la vista previa del editor)
  rebuild() {
    const extra = this.designs.filter(Boolean);
    if (this.preview) extra.push(this.preview);
    SE.init({ sprites: SKINS_DATA.sprites, skins: [...this.base, ...EXCLUSIVE_SKINS, ...EGG_SKINS, ...SEASON_SKINS, ...TRAIL_SKINS, ...extra] });
  },
  get shop() { return this.base; },                 // los 16 skins de la tienda, en orden
  get(id) { return SE.get(id); },
  exists(id) { return !!SE.get(id); },
};
SkinCatalog.rebuild();
const levelDef = l => CONFIG.LEVELS[(l - 1) % CONFIG.LEVELS.length];

// Dibuja el raptor con el motor del kit. Solo avanza la estela y la animación cuando advance = true
// (una vez por tick de CONFIG.SKIN_TICK); el resto de frames repinta el mismo estado.
// Origen: pies en y = 0 (coordenadas del carril), x = borde izquierdo del sprite.
function drawRaptor(ctx, id, st, jumpY, dead, advance, sc = CONFIG.RAPTOR_SCALE, ox = 0, groundY = -1) {
  if (!SE.get(id)) return;
  const acc = SKIN_ACCESSORIES[id], oy = Math.round(groundY - SE.H + 1 - jumpY);
  st.duck = !!st.duck && !dead && !(jumpY > 0);
  const frame = dead ? "idle" : jumpY > 0 ? "jump" : st.duck ? (st.tick % 4 < 2 ? "duck1" : "duck2") : SE.runFrame(id, st.tick).frame;
  const shifted = (fn, d) => { ctx.save(); if (st.duck) ctx.translate(d.x * sc, d.y * sc); fn(); ctx.restore(); };   // save/restore: los adornos no cambian la opacidad del resto
  const eq = st.hat === null ? null : (st.hat || HAT_EQUIPPED);   // accesorios: { head, back, feet } (null = sin accesorios)
  if (st.trailFx !== null) drawShopTrail(ctx, st, ox, oy, sc, frame, advance && !dead);     // estela comprada
  if (eq && eq.back) drawHat(ctx, eq.back, id, ox, oy, sc, st.tick, frame, st.duck);   // espalda: por detrás del raptor
  if (acc && acc.back) shifted(() => acc.back(ctx, ox, oy, sc, st.tick, frame), DUCK_BACK);
  if (advance) {
    SE.drawDino(ctx, id, ox, groundY, sc, st, jumpY, dead);
    if (st.trail && st.trail.p.length > CONFIG.TRAIL_MAX) st.trail.p.splice(0, st.trail.p.length - CONFIG.TRAIL_MAX);
  } else {
    const tr = st.trail || (st.trail = new SE.Trail(id));
    tr.drawEchoes(ctx, ox, sc, st.tick); tr.draw(ctx, sc, st.tick);
    SE.drawSprite(ctx, id, frame, ox, oy, sc, st.tick);
  }
  if (acc && acc.front) shifted(() => acc.front(ctx, ox, oy, sc, st.tick, frame), DUCK_HEAD);
  if (eq && eq.feet) drawHat(ctx, eq.feet, id, ox, oy, sc, st.tick, frame, st.duck);
  if (eq && eq.head) drawHat(ctx, eq.head, id, ox, oy, sc, st.tick, frame, st.duck);
}
// =====================================================================
//  Skins del pase de temporada: color que cambia (Prisma Celestial) y accesorios animados
//  Coordenadas de los accesorios en píxeles del sprite (24 × 20), relativas a su esquina (ox, oy).
// =====================================================================
function hslHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return "#" + [f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
}
const PRISM = { hue: 0, step: -1 };
// Cada fotograma: el Prisma Celestial gira por todo el arcoíris (48 tonos; el motor cachea cada tono)
function updatePrismSkins(time) {
  const step = Math.floor(time * 9) % 48; if (step === PRISM.step) return;
  PRISM.step = step; const h = PRISM.hue = step * 7.5, s = SE.get("prisma-celestial"); if (!s) return;
  Object.assign(s.pal, { b: hslHex(h, 88, 62), s: hslHex(h, 80, 44), l: hslHex(h, 95, 86), a: hslHex(h + 150, 90, 58), x: hslHex(h + 60, 100, 78), y: hslHex(h + 210, 85, 62), o: hslHex(h + 250, 60, 12), p: hslHex(h + 250, 60, 12) });
  s.bg = hslHex(h + 240, 55, 9);
}
const P_ = (c, col, ox, oy, sc, x, y, w = 1, h = 1) => { c.fillStyle = col; c.fillRect((ox + x) * sc, (oy + y) * sc, w * sc, h * sc); };
const SKIN_ACCESSORIES = {
  "prisma-celestial": {
    // Por detrás: aura suave, capa real ondeando y las gemas que pasan por detrás de la órbita
    back(c, ox, oy, sc, t, frame) {
      const h = PRISM.hue;
      // Cinta arcoíris: nace en la punta de la cola y se va estrechando hacia atrás; siempre sigue al raptor (también al saltar)
      const RB6 = ["#ff3b5c", "#ff9f1c", "#ffd23f", "#3ddc84", "#41b8ff", "#8a5cff"], LEN = 20;
      for (let j = 0; j < LEN; j += 1) {
        const fade = 1 - j / LEN, wy = Math.sin(t * 0.55 - j * 0.45) * (0.3 + j * 0.06);
        c.globalAlpha = 0.95 * fade;
        for (let i = 0; i < 6; i++) P_(c, RB6[(i + Math.floor(t / 3)) % 6], ox, oy, sc, 1 - j, 7.5 + i * 0.75 + wy, 1, 0.75);
      }
      c.globalAlpha = 1;
      for (let k = 0; k < 3; k++) { const q = (t * 2 + k * 7) % 20; c.globalAlpha = 1 - q / 20; const x = -2 - q, y = 6 + ((k * 5 + Math.floor(t / 4)) % 8);   // destellos sobre la cinta
        P_(c, "#ffffff", ox, oy, sc, x - 1, y, 3, 1); P_(c, "#ffffff", ox, oy, sc, x, y - 1, 1, 3); }
      c.globalAlpha = 1;
      // Dos siluetas de colores justo detrás (velocidad), en el mismo fotograma y altura que el raptor
      if (frame) for (let k = 2; k >= 1; k--) SE.drawSprite(c, "prisma-celestial", frame, ox - k * 3, oy, sc, t, { tint: hslHex(h + 120 * k, 95, 65), alpha: 0.32 / k });
      const cx = (ox + 13) * sc, cy = (oy + 10) * sc, r = (14 + Math.sin(t * 0.4) * 1.2) * sc;
      const g = c.createRadialGradient(cx, cy, 2 * sc, cx, cy, r);
      g.addColorStop(0, rgbaHex(hslHex(h + 30, 100, 72), 0.3)); g.addColorStop(1, rgbaHex(hslHex(h + 90, 100, 60), 0));
      c.fillStyle = g; c.fillRect(cx - r, cy - r, r * 2, r * 2);
      // Capa real: forma suave que cae de los hombros y ondea con la carrera (degradado + ribete dorado)
      const X = x => (ox + x) * sc, Y = y => (oy + y) * sc, w1 = Math.sin(t * 0.8) * 0.8, w2 = Math.sin(t * 0.8 - 1.4) * 1.2;
      const top = [[12, 5], [8, 4.6 + w1 * 0.4], [4, 5.2 + w1], [0.5, 6.4 + w2]], bot = [[0, 9.6 + w2], [4, 9 + w1], [8, 8.4 + w1 * 0.4], [11.5, 8]];
      const cg = c.createLinearGradient(X(12), Y(5), X(0), Y(10));
      cg.addColorStop(0, hslHex(h + 200, 80, 38)); cg.addColorStop(1, hslHex(h + 240, 85, 58));
      c.beginPath(); c.moveTo(X(top[0][0]), Y(top[0][1]));
      for (let i = 1; i < top.length; i++) c.lineTo(X(top[i][0]), Y(top[i][1]));
      for (const [x, y] of bot) c.lineTo(X(x), Y(y));
      c.closePath(); c.fillStyle = cg; c.fill();
      c.lineWidth = Math.max(1, sc * 0.6); c.strokeStyle = hslHex(h + 250, 60, 12); c.stroke();
      c.beginPath(); c.moveTo(X(bot[0][0]), Y(bot[0][1])); for (const [x, y] of bot) c.lineTo(X(x), Y(y)); c.strokeStyle = "#ffd23f"; c.lineWidth = Math.max(1, sc * 0.7); c.stroke();
      this.gems(c, ox, oy, sc, t, false);
    },
    // Delante: halo de dos tonos con destellos que giran, gemas de la parte delantera y brillo de la corona
    front(c, ox, oy, sc, t) {
      const h = PRISM.hue, bob = Math.sin(t * 0.5) * 0.7, hx = (ox + 16.5) * sc, hy = (oy - 3.2 + bob) * sc;
      c.lineWidth = sc * 2.4; c.strokeStyle = rgbaHex(hslHex(h + 60, 100, 70), 0.35);
      c.beginPath(); c.ellipse(hx, hy, 4.8 * sc, 1.4 * sc, 0, 0, Math.PI * 2); c.stroke();
      c.lineWidth = Math.max(1, sc * 0.8); c.strokeStyle = hslHex(h + 60, 100, 82);
      c.beginPath(); c.ellipse(hx, hy, 4.6 * sc, 1.25 * sc, 0, 0, Math.PI * 2); c.stroke();
      for (let k = 0; k < 2; k++) {   // dos destellos que recorren el halo
        const a = t * 0.35 + k * Math.PI; P_(c, "#ffffff", ox, oy, sc, 16 + Math.cos(a) * 4.6, -3.7 + bob + Math.sin(a) * 1.25, 1, 1);
      }
      this.gems(c, ox, oy, sc, t, true);
      const tw = t % 8;   // destello en forma de estrella sobre la corona
      if (tw < 3) { const k = tw === 1 ? 2 : 1, x = 15 + (Math.floor(t / 8) % 3) * 2, y = -0.5; P_(c, "#ffffff", ox, oy, sc, x - k, y, 2 * k + 1, 1); P_(c, "#ffffff", ox, oy, sc, x, y - k, 1, 2 * k + 1); }
    },
    gems(c, ox, oy, sc, t, front) {   // tres gemas en órbita (las de atrás quedan tapadas por el raptor)
      const h = PRISM.hue;
      for (let k = 0; k < 3; k++) {
        const a = t * 0.22 + k * Math.PI * 2 / 3, inFront = Math.sin(a) > 0; if (inFront !== front) continue;
        const x = 12 + Math.cos(a) * 14, y = 9 + Math.sin(a) * 4.5, col = hslHex(h + k * 120, 95, front ? 64 : 48);
        c.globalAlpha = front ? 0.35 : 0.2;   // pequeña estela de la gema
        for (let j = 1; j <= 2; j++) { const b = a - j * 0.12; P_(c, col, ox, oy, sc, 12 + Math.cos(b) * 14, 9 + Math.sin(b) * 4.5, 1, 1); }
        c.globalAlpha = front ? 1 : 0.7;   // gema en rombo con contorno fino y brillo blanco
        const gx = (ox + x + 0.5) * sc, gy = (oy + y + 0.5) * sc, R = 1.9 * sc;
        c.beginPath(); c.moveTo(gx, gy - R); c.lineTo(gx + R * 0.8, gy); c.lineTo(gx, gy + R); c.lineTo(gx - R * 0.8, gy); c.closePath();
        c.fillStyle = col; c.fill(); c.lineWidth = Math.max(1, sc * 0.45); c.strokeStyle = hslHex(h + k * 120, 70, 18); c.stroke();
        P_(c, "#ffffff", ox, oy, sc, x - 0.2, y - 0.6, 0.7, 0.7);
      }
      c.globalAlpha = 1;
    },
  },
  "eclipse-prisma": {
    back(c, ox, oy, sc, t) {
      const cx = (ox + 13) * sc, cy = (oy + 9) * sc, r = 14 * sc, g = c.createRadialGradient(cx, cy, 3 * sc, cx, cy, r);
      g.addColorStop(0, "rgba(255,92,225,0.32)"); g.addColorStop(1, "rgba(65,225,255,0)"); c.fillStyle = g; c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    },
    front(c, ox, oy, sc, t) {   // corona de eclipse: aro negro con borde de luz y luna en órbita
      const bob = Math.sin(t * 0.5) * 0.6;
      c.fillStyle = "#ffd23f"; c.beginPath(); c.arc((ox + 17) * sc, (oy - 4 + bob) * sc, 3.2 * sc, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#05020c"; c.beginPath(); c.arc((ox + 17.6) * sc, (oy - 4.3 + bob) * sc, 2.8 * sc, 0, Math.PI * 2); c.fill();
      const a = t * 0.3, mx = 12 + Math.cos(a) * 13, my = 9 + Math.sin(a) * 4;
      c.globalAlpha = Math.sin(a) > 0 ? 1 : 0.5; P_(c, "#e8e0ff", ox, oy, sc, mx, my, 2, 2); P_(c, "#7b5cff", ox, oy, sc, mx + 1, my, 1, 1); c.globalAlpha = 1;
    },
  },
  "cristal-temporada": {
    front(c, ox, oy, sc, t) {   // fragmento de cristal flotando sobre la cabeza
      const y = -5 + Math.sin(t * 0.45) * 1.2, cols = ["#7df9ff", "#ffd0f0", "#fff6b0"], col = cols[Math.floor(t / 4) % 3];
      P_(c, "#1a1430", ox, oy, sc, 16, y - 1, 3, 5); P_(c, col, ox, oy, sc, 16.5, y - 0.5, 2, 4); P_(c, "#ffffff", ox, oy, sc, 16.5, y, 1, 1);
    },
  },
};
// =====================================================================
//  Rugidos especiales: los skins Épicos, Legendarios, Supremos y exclusivos rugen con su propio efecto
//  y hacen una pose animada (se alzan con un aura). Los diseños heredan el rugido del efecto elegido.
// =====================================================================
const ROAR_STYLES = {
  "amatista":         { name: "Rugido de cristal",   type: "shards",  colors: ["#b07cf0", "#e4d0ff", "#ffffff", "#7e45c9"] },
  "voltio":           { name: "Rugido eléctrico",    type: "bolt",    colors: ["#41e1ff", "#ffffff", "#1a8fff"] },
  "fantasma":         { name: "Rugido espectral",    type: "ghost",   colors: ["#e8ecff", "#a9b8ff", "#ffffff"] },
  "lava-raptor":      { name: "Rugido de magma",     type: "fire",    colors: ["#ffd23f", "#ff7a1a", "#ff3d00"] },
  "glaciar-eterno":   { name: "Rugido helado",       type: "ice",     colors: ["#ffffff", "#c7f0ff", "#8fd3ff"] },
  "fenix":            { name: "Rugido del fénix",    type: "fire",    colors: ["#fff3b0", "#ffd23f", "#ff9f1c", "#ff5a1f"], wings: true },
  "diamante":         { name: "Rugido de diamante",  type: "shards",  colors: ["#ffffff", "#a8f0ff", "#ffd6f5", "#fff6b0"] },
  "galaxia":          { name: "Rugido cósmico",      type: "stars",   colors: ["#ffffff", "#5ce1ff", "#ff8fd8", "#8a5cff"] },
  "arcoiris":         { name: "Rugido arcoíris",     type: "rainbow", colors: ["#ff3b5c", "#ff9f1c", "#ffd23f", "#3ddc84", "#41b8ff", "#8a5cff"] },
  "emperador-solar":  { name: "Rugido solar",        type: "sun",     colors: ["#ffffff", "#ffe680", "#ffc629", "#ff3df2"], flash: true, wings: true },
  "corona-campeon":   { name: "Rugido del campeón",  type: "sun",     colors: ["#fff3c4", "#ffc629", "#ff3b3b"], flash: true },
  "rey-jefes":        { name: "Rugido del tirano",   type: "bolt",    colors: ["#e6b8ff", "#c04bff", "#ff5cf0"] },
  "fosil-legendario": { name: "Rugido de ámbar",     type: "shards",  colors: ["#ffe8a0", "#ffb627", "#ff8c00"] },
  "opalo":            { name: "Rugido de ópalo",     type: "shards",  colors: ["#9ad8ff", "#ffd0f0", "#fff6b0"] },
  "medusa":           { name: "Rugido abisal",       type: "ghost",   colors: ["#7df9ff", "#ff7ad0", "#e0ffff"] },
  "magma-negro":      { name: "Rugido de magma negro", type: "fire",  colors: ["#ff8ac0", "#ff3b8a", "#c04bff"] },
  "dragon-jade":      { name: "Rugido del dragón",   type: "fire",    colors: ["#e0ffe8", "#a0ffd0", "#2ac07a", "#ffe14d"], wings: true },
  "aurora":           { name: "Rugido boreal",       type: "ice",     colors: ["#3ddc84", "#41e1ff", "#8a5cff"] },
  "prisma-celestial": { name: "Rugido prismático",   type: "prism",   colors: ["#ff3b5c", "#ff9f1c", "#ffd23f", "#3ddc84", "#41b8ff", "#8a5cff", "#ff5ce1"], flash: true, wings: true },
  "eclipse-prisma":   { name: "Rugido del eclipse",  type: "stars",   colors: ["#ffd23f", "#ff5ce1", "#7b5cff", "#41e1ff"], flash: true, wings: true },
  "cristal-temporada": { name: "Rugido de cristal prismático", type: "shards", colors: ["#7df9ff", "#ffd0f0", "#fff6b0", "#c8b8ff"] },
  "nebulosa":         { name: "Rugido de nebulosa",  type: "stars",   colors: ["#ffffff", "#ff8fd8", "#5ce1ff", "#c8a0ff"], flash: true },
};
// Rugido que usa el jugador: el comprado y equipado o, si no, el del skin
function roarStyleFor(id) { return SHOP_ROAR_BY_ID[ROAR_EQUIPPED] || roarStyle(id); }
// Estela comprada: un emisor aparte del motor que sigue al raptor (st.trailFx: id forzado, null = ninguna)
function drawShopTrail(ctx, st, ox, oy, sc, frame, advance) {
  const id = st.trailFx || TRAIL_EQUIPPED; if (!id || !TRAIL_BY_ID[id]) return;
  if (!st.trail2 || st.trail2.id !== "trailfx-" + id) st.trail2 = new SE.Trail("trailfx-" + id);
  const tr = st.trail2;
  if (advance) { tr.step(st.speed || 2); tr.emit(ox + (st.duck ? 0 : 0), oy + (st.duck ? 4 : 0), st.tick, st.speed || 2, frame); if (tr.p.length > CONFIG.TRAIL_MAX) tr.p.splice(0, tr.p.length - CONFIG.TRAIL_MAX); }
  tr.draw(ctx, sc, st.tick);
}
function roarStyle(id) {
  const s = SE.get(id); if (!s) return null;
  return ROAR_STYLES[id] || (s.custom && ROAR_STYLES[s.fxFrom]) || null;
}
// Onda del rugido con el estilo del skin. (ox, oy) = boca del raptor; r = radio actual; coordenadas locales (y hacia abajo)
function drawRoarFx(c, style, ox, oy, r, alpha, t) {
  const C = style ? style.colors : ["#ffd2a0", "#ffe0c0", "#fff0e0"];
  const multi = style && (style.type === "rainbow" || style.type === "prism");
  for (let k = 0; k < (multi ? C.length : 3); k++) {
    const rr = r - k * (multi ? 8 : 26); if (rr <= 4) continue;
    c.strokeStyle = style ? rgbaHex(C[k % C.length], alpha * (0.95 - k * 0.12)) : `rgba(255,${200 + k * 20},${140 + k * 40},${alpha * (0.9 - k * 0.25)})`;
    c.lineWidth = style ? (style.type === "sun" ? 9 - k : 6 - k * 0.6) : 5 - k;
    c.beginPath(); c.arc(ox, oy, rr, -0.9, 0.9); c.stroke();
  }
  if (!style) return;
  const n = 9, R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
  c.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const a = -0.85 + 1.7 * i / (n - 1), px = ox + Math.cos(a) * r, py = oy + Math.sin(a) * r, col = C[(i + Math.floor(t * 10)) % C.length];
    switch (style.type) {
      case "fire": R(px - 4, py - 6 - (t * 60 + i * 7) % 14, 8, 8, col); R(px - 2, py - 14 - (t * 80 + i * 5) % 16, 4, 4, C[0]); break;
      case "ice": R(px - 2, py - 8, 4, 16, col); R(px - 8, py - 2, 16, 4, col); break;
      case "shards": c.save(); c.translate(px, py); c.rotate(a + t * 6); R(-3, -8, 6, 16, col); c.restore(); break;
      case "stars": R(px - 1, py - 6, 3, 13, col); R(px - 6, py - 1, 13, 3, col); break;
      case "bolt": if (i % 2 === 0) { c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(px, py - 14); c.lineTo(px + 6, py - 4); c.lineTo(px - 4, py + 2); c.lineTo(px + 4, py + 14); c.stroke(); } break;
      case "ghost": c.globalAlpha = alpha * 0.5; R(px - 6, py - 6, 12, 12, col); c.globalAlpha = alpha; break;
      case "sun": R(px - 4, py - 4, 8, 8, col); c.strokeStyle = rgbaHex(C[1], alpha * 0.6); c.lineWidth = 2; c.beginPath(); c.moveTo(ox, oy); c.lineTo(px, py); c.stroke(); break;
      case "rainbow": R(px - 3, py - 3, 6, 6, col); break;
      case "prism": {   // prismas que giran y rayos de luz de todos los colores
        c.save(); c.translate(px, py); c.rotate(t * 5 + i); R(-5, -5, 10, 10, col); R(-2, -8, 4, 16, "#ffffff"); c.restore();
        c.strokeStyle = rgbaHex(C[(i + 3) % C.length], alpha * 0.7); c.lineWidth = 2; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(a) * r * 1.15, oy + Math.sin(a) * r * 1.15); c.stroke();
        break;
      }
    }
  }
  c.globalAlpha = 1;
}
// Pose del rugido: el raptor se alza y aparece un aura con los colores del skin (k = 0…1 del tiempo de pose)
function roarPose(c, style, k, cx, cy, sc = 1) {
  const s = Math.sin(Math.min(1, k) * Math.PI);
  if (style) {
    const g = c.createRadialGradient(cx, cy, 4 * sc, cx, cy, 70 * sc);
    g.addColorStop(0, rgbaHex(style.colors[1] || style.colors[0], 0.55 * s)); g.addColorStop(1, rgbaHex(style.colors[0], 0));
    c.fillStyle = g; c.fillRect(cx - 80 * sc, cy - 80 * sc, 160 * sc, 160 * sc);
    if (style.wings) {   // alas de luz (Fénix, Emperador Solar)
      c.fillStyle = rgbaHex(style.colors[2] || style.colors[1], 0.7 * s);
      for (let i = 0; i < 4; i++) { c.fillRect(cx - (14 + i * 12) * sc, cy - (26 + i * 9) * s * sc, 10 * sc, 8 * sc); c.fillRect(cx - (8 + i * 12) * sc, cy - (14 + i * 7) * s * sc, 10 * sc, 6 * sc); }
    }
  }
  return s;   // el que llama inclina y escala al raptor con este valor
}
// Vista previa animada (tienda, editor, manual): fondo del skin + suelo + raptor corriendo
// Los skins con rugido especial rugen cada pocos segundos en la vista previa.
function drawSkinPreview(c, id, st, w, h, sc, jumpY = 0) {
  const s = SE.get(id); if (!s) return;
  c.fillStyle = s.bg || "#2f3658"; c.fillRect(0, 0, w, h);
  const gy = h - 10, style = st.roar !== undefined ? st.roar : roarStyle(id), rk = (st.tick % 46) / 8;   // ~0,7 s de rugido cada ~4 s
  c.fillStyle = s.ground || "#3a4166"; c.fillRect(0, gy, w, 3);
  c.globalAlpha = 0.35; for (let i = 0; i < 5; i++) c.fillRect(mod(i * 31 - st.tick * 6, w + 10) - 10, gy + 5, 6, 2); c.globalAlpha = 1;
  const x0 = Math.round((w - SE.W * sc) / 2) - sc * 2, roaring = style && rk < 1 && !jumpY;
  c.save();
  if (roaring) {
    const k = roarPose(c, style, rk, x0 + 12 * sc, gy - 10 * sc, sc / 3);
    c.translate(x0 + 12 * sc, gy); c.rotate(-0.16 * k); c.scale(1 + 0.1 * k, 1 + 0.1 * k); c.translate(-12 * sc, 0);
  } else c.translate(x0, gy);
  drawRaptor(c, id, st, jumpY, false, st.advance, sc, 0, -1);
  c.restore();
  if (roaring) drawRoarFx(c, style, x0 + 22 * sc, gy - 14 * sc, rk * w * 0.55, 1 - rk * 0.6, st.tick * 0.09);
  st.advance = false;
}
// Reloj de ticks compartido por las vistas previas
function tickStates(states, dt, speed = 2) {
  for (const st of states) {
    st.acc = (st.acc || 0) + dt;
    if (st.acc >= CONFIG.SKIN_TICK) { st.acc -= CONFIG.SKIN_TICK; st.tick++; st.speed = speed; st.advance = true; }
  }
}
// =====================================================================
//  Accesorios equipables en 3 huecos: CABEZA, ESPALDA y ZAPATILLAS. Se ponen encima de cualquier skin y siguen
//  al raptor al correr, saltar y agacharse. Coordenadas en píxeles del sprite (24 × 20); se compran en la tienda.
//  anchor = dónde se dibuja (head / neck / back); slot = hueco que ocupa.
// =====================================================================
let HAT_EQUIPPED = { head: null, back: null, feet: null };
const HAT_SLOTS = [["head", "🎩 Cabeza"], ["back", "🎒 Espalda"], ["feet", "👟 Zapatillas"]];
const HAT_LINE = "#1a1424";
const HATS = [
  // Cabeza
  { id: "gorra", name: "Gorra roja", price: 300, slot: "head", anchor: "head", desc: "Visera hacia delante, estilo corredor",
    parts: () => [["#d63a3a", 14, -1, 6, 2], ["#a52630", 19, 0, 5, 1], ["#ff7a7a", 15, -1, 2, 1], ["#ffffff", 16, -2, 2, 1]] },
  { id: "pajarita", name: "Pajarita", price: 350, slot: "head", anchor: "neck", desc: "Elegancia hasta en la carrera",
    parts: t => [["#d63a3a", 12, 8, 2, 3], ["#d63a3a", 16, 8, 2, 3], ["#ff7a7a", 14, 9, 2, 1], ["#ff9a9a", 12, 8, 1, 1]] },
  { id: "gafas", name: "Gafas de sol", price: 450, slot: "head", anchor: "head", desc: "Demasiado guay para mirar atrás",
    parts: t => [["#16111f", 15, 3, 4, 2], ["#16111f", 19, 3, 3, 2], ["#16111f", 13, 3, 2, 1], [t % 12 < 2 ? "#ffffff" : "#7fd0ff", 16, 3, 1, 1], [t % 12 < 2 ? "#ffffff" : "#7fd0ff", 20, 3, 1, 1]] },
  { id: "fiesta", name: "Gorro de fiesta", price: 600, slot: "head", anchor: "head", desc: "Cada partida es una celebración",
    parts: t => [["#ff5ce1", 14, -1, 6, 2], ["#ffd23f", 15, -3, 4, 2], ["#5fb4ff", 16, -5, 2, 2], ["#ffffff", 16 + (t % 8 < 4 ? 0 : 1), -6, 1, 1], ["#ffffff", 15, -1, 1, 1], ["#ffffff", 18, -1, 1, 1], ["#ffffff", 17, -3, 1, 1]] },
  { id: "chistera", name: "Sombrero de copa", price: 900, slot: "head", anchor: "head", desc: "Un raptor con clase",
    parts: () => [["#16111f", 13, 0, 9, 1], ["#2a2140", 15, -5, 5, 5], ["#d63a3a", 15, -1, 5, 1], ["#574a82", 16, -4, 1, 3]] },
  { id: "auriculares", name: "Auriculares", price: 1100, slot: "head", anchor: "head", desc: "Con notas que salen al ritmo",
    parts: t => { const n = t % 16, ny = -2 - Math.floor((t % 8) / 2);
      return [["#2a2140", 14, -1, 6, 1], ["#2a2140", 13, 0, 1, 1], ["#2a2140", 20, 0, 1, 1], ["#5fd15a", 12, 1, 2, 3], ["#9bf08f", 12, 1, 1, 1],
        ...(n < 8 ? [["#ffd23f", 22, ny, 1, 2], ["#ffd23f", 23, ny, 1, 1]] : [["#5fb4ff", 9, ny + 1, 1, 2], ["#5fb4ff", 10, ny + 1, 1, 1]])]; } },
  { id: "corona", name: "Corona real", price: 1500, slot: "head", anchor: "head", desc: "Para el rey de la carrera, con brillo",
    parts: t => { const sh = t % 20; return [["#ffb938", 14, -1, 6, 2], ["#ffb938", 14, -3, 1, 2], ["#ffb938", 16, -2, 2, 1], ["#ffb938", 19, -3, 1, 2], ["#ff3b5c", 16, -1, 1, 1], ["#41b8ff", 18, -1, 1, 1],
      ...(sh < 6 ? [["#ffffff", 14 + sh, -1, 1, 1]] : [])]; } },
  // Espalda
  { id: "bufanda", name: "Bufanda al viento", price: 750, slot: "back", anchor: "neck", desc: "Ondea detrás de ti al correr",
    parts: t => { const w = Math.round(Math.sin(t * 0.8)), w2 = Math.round(Math.sin(t * 0.8 + 1.5));
      return [["#ff9a3c", 11, 7, 7, 2], ["#ffffff", 13, 7, 1, 2], ["#ffffff", 16, 7, 1, 2], ["#ff9a3c", 8, 8 + w, 3, 2], ["#ffffff", 9, 8 + w, 1, 2], ["#ff9a3c", 5, 9 + w2, 3, 2], ["#ffd23f", 4, 10 + w2, 1, 1]]; } },
  { id: "mochila", name: "Mochila de aventura", price: 650, slot: "back", anchor: "back", desc: "Con saco de dormir enrollado",
    parts: () => [["#3f7d3f", 4, 6, 5, 5], ["#5fa85a", 5, 7, 2, 2], ["#2a5a2a", 4, 9, 5, 1], ["#c8a06a", 4, 4, 5, 2], ["#8a6a3a", 6, 4, 1, 2]] },
  { id: "capa", name: "Capa de héroe", price: 1300, slot: "back", anchor: "back", desc: "Roja, larga y ondeando",
    parts: t => { const w = Math.round(Math.sin(t * 0.7)); return [["#d63a3a", 6, 6, 5, 3], ["#d63a3a", 3, 8 + w, 5, 3], ["#b02a30", 0, 10 + w, 4, 2], ["#ffd23f", 9, 6, 2, 1]]; } },
  { id: "alas", name: "Alas de ángel", price: 2000, slot: "back", anchor: "back", desc: "Aletean mientras corres",
    parts: t => { const u = t % 4 < 2; return u ? [["#ffffff", 5, 2, 5, 2], ["#ffffff", 3, 4, 6, 2], ["#e2ecff", 2, 6, 6, 2], ["#c8d8f0", 4, 8, 4, 1]]
      : [["#ffffff", 4, 6, 6, 2], ["#ffffff", 2, 8, 6, 2], ["#e2ecff", 1, 10, 5, 2], ["#c8d8f0", 3, 12, 3, 1]]; } },
  { id: "jetpack", name: "Mochila cohete", price: 2500, slot: "back", anchor: "back", desc: "Llamas animadas en la espalda",
    parts: t => [["#8a93a8", 4, 6, 4, 5], ["#d63a3a", 4, 6, 4, 1], ["#c7cedb", 5, 7, 1, 3], ["#5a6278", 4, 11, 4, 1],
      ["#ffd23f", 4, 12, 4, 1 + (t % 2)], ["#ff6a00", 5, 13 + (t % 2), 2, 1 + ((t >> 1) % 2)]] },
  // Zapatillas: se dibujan sobre los pies de cada fotograma (main, detalle, suela)
  { id: "deportivas", name: "Deportivas rojas", price: 400, slot: "feet", desc: "Para correr más ligero", shoe: () => ["#e23b3b", "#ffffff", "#f3f3f3"] },
  { id: "botas", name: "Botas de nieve", price: 600, slot: "feet", desc: "Con borde de pelo", shoe: () => ["#8a5a32", "#ffffff", "#3a2414"] },
  { id: "patines", name: "Patines", price: 900, slot: "feet", desc: "Ruedas que giran", shoe: t => ["#41b8ff", "#ffffff", t % 2 ? "#ffd23f" : "#ff9a1e"], wheels: true },
  { id: "doradas", name: "Zapatillas doradas", price: 1400, slot: "feet", desc: "Brillan a cada paso", shoe: t => ["#ffb938", t % 6 < 2 ? "#ffffff" : "#ffe08a", "#c77a12"] },
  { id: "luces", name: "Zapatillas de luces", price: 1800, slot: "feet", desc: "La suela cambia de color", shoe: t => ["#2a2140", "#ffffff", ["#ff3b5c", "#ffd23f", "#3ddc84", "#41b8ff", "#ff5ce1"][t % 5]] },
];
const HAT_BY_ID = Object.fromEntries(HATS.map(h => [h.id, h]));
const HAT_DUCK = { head: DUCK_HEAD, neck: { x: 5, y: 5 }, back: { x: 0, y: 3 } };
// Pies de un fotograma: tramos de "y" (garras) en las filas de las patas, cacheados por sprite y fotograma
const _feet = {};
function feetOf(spriteId, frame) {
  const k = spriteId + "|" + frame; if (_feet[k]) return _feet[k];
  const spr = SKINS_DATA.sprites[spriteId]; if (!spr) return [];
  const G = spriteGrid(spr, frame), out = [];
  for (let y = 15; y < 20; y++) { let x0 = -1; for (let x = 0; x <= G[y].length; x++) { const f = G[y][x] === "y"; if (f && x0 < 0) x0 = x; if (!f && x0 >= 0) { out.push([x0, x - 1, y]); x0 = -1; } } }
  return (_feet[k] = out);
}
// Dibuja un accesorio: primero el contorno oscuro de todas las piezas y después los colores (se lee bien sobre cualquier skin)
function drawHat(c, id, skinId, ox, oy, sc, t, frame, duck) {
  const h = HAT_BY_ID[id]; if (!h) return;
  const sk = SE.get(skinId), spr = sk && SKINS_DATA.sprites[sk.sprite], dy = (spr && spr.frames[frame] && spr.frames[frame].dy) || 0;
  let parts;
  if (h.slot === "feet") {   // zapatillas: cubren cada pie, puntera hacia delante y suela debajo
    const [m, a, so] = h.shoe(t || 0); parts = [];
    for (const [x0, x1, y] of feetOf(sk.sprite, frame)) {
      parts.push([m, x0, y - 1, x1 - x0 + 2, 2], [a, x0, y - 1, 1, 1], [so, x0, y + 1, x1 - x0 + 2, 1]);
      if (h.wheels) parts.push(["#16111f", x0, y + 2, 1, 1], ["#16111f", x1 + 1, y + 2, 1, 1]);
    }
    if (!parts.length) return;
    const X = ox, Y = oy + dy; c.fillStyle = HAT_LINE;
    for (const [, x, y, w, hh] of parts) c.fillRect((X + x - 1) * sc, (Y + y) * sc, (w + 2) * sc, hh * sc);
    for (const [col, x, y, w, hh] of parts) { c.fillStyle = col; c.fillRect((X + x) * sc, (Y + y) * sc, w * sc, hh * sc); }
    return;
  }
  const d = duck ? HAT_DUCK[h.anchor] : { x: 0, y: 0 };
  parts = h.parts(t || 0); const X = ox + d.x, Y = oy + dy + d.y;
  c.fillStyle = HAT_LINE;
  for (const [, x, y, w, hh] of parts) c.fillRect((X + x - 1) * sc, (Y + y - 1) * sc, (w + 2) * sc, (hh + 2) * sc);
  for (const [col, x, y, w, hh] of parts) { c.fillStyle = col; c.fillRect((X + x) * sc, (Y + y) * sc, w * sc, hh * sc); }
}

function drawShadow(ctx, cx, w, heightAbove) {
  const k = clamp(1 - heightAbove / 220, 0.35, 1);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath(); ctx.ellipse(cx, 2, w * 0.5 * k, 5 * k, 0, 0, Math.PI * 2); ctx.fill();
}

// Iconos de power-up (objeto recogible e interfaz)
function drawIcon(c, type, x, y, s) {
  c.save(); c.translate(x, y); c.lineJoin = "round";
  if (type === "shield") {
    c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.85, -s * 0.6); c.lineTo(s * 0.75, s * 0.2);
    c.quadraticCurveTo(s * 0.5, s * 0.8, 0, s * 1.05); c.quadraticCurveTo(-s * 0.5, s * 0.8, -s * 0.75, s * 0.2);
    c.lineTo(-s * 0.85, -s * 0.6); c.closePath();
    c.fillStyle = "#4aa3ff"; c.fill(); c.lineWidth = s * 0.18; c.strokeStyle = "#e8f4ff"; c.stroke();
    c.fillStyle = "#bfe0ff"; c.fillRect(-s * 0.15, -s * 0.6, s * 0.3, s * 1.1);
  } else if (type === "magnet") {
    c.lineWidth = s * 0.5; c.strokeStyle = "#ff4d6d";
    c.beginPath(); c.moveTo(-s * 0.55, -s * 0.75); c.lineTo(-s * 0.55, 0);
    c.arc(0, 0, s * 0.55, Math.PI, 0, true); c.lineTo(s * 0.55, -s * 0.75); c.stroke();
    c.fillStyle = "#f0f0f0"; c.fillRect(-s * 0.8, -s * 1.05, s * 0.5, s * 0.4); c.fillRect(s * 0.3, -s * 1.05, s * 0.5, s * 0.4);
  } else if (type === "slowmo") {
    c.fillStyle = "#a88bff"; c.fillRect(-s * 0.8, -s, s * 1.6, s * 0.28); c.fillRect(-s * 0.8, s * 0.72, s * 1.6, s * 0.28);
    c.beginPath(); c.moveTo(-s * 0.6, -s * 0.72); c.lineTo(s * 0.6, -s * 0.72); c.lineTo(s * 0.08, 0);
    c.lineTo(s * 0.6, s * 0.72); c.lineTo(-s * 0.6, s * 0.72); c.lineTo(-s * 0.08, 0); c.closePath();
    c.fillStyle = "#ece6ff"; c.fill();
    c.beginPath(); c.moveTo(-s * 0.45, s * 0.72); c.lineTo(s * 0.45, s * 0.72); c.lineTo(0, s * 0.25); c.closePath();
    c.fillStyle = "#ffd36b"; c.fill();
  } else if (type === "turbo") {
    c.beginPath(); c.moveTo(s * 0.25, -s); c.lineTo(-s * 0.6, s * 0.15); c.lineTo(-s * 0.05, s * 0.15);
    c.lineTo(-s * 0.25, s); c.lineTo(s * 0.6, -s * 0.2); c.lineTo(s * 0.05, -s * 0.2); c.closePath();
    c.fillStyle = "#ffb000"; c.fill(); c.lineWidth = s * 0.14; c.strokeStyle = "#fff3c4"; c.stroke();
  }
  c.restore();
}


