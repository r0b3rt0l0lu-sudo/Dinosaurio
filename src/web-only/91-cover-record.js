// =====================================================================
//  Material para CrazyGames (solo en la versión web; NO va en el paquete que se sube):
//    ?cover=wide | tall | square   → portada 1920×1080, 800×1200 u 800×800 lista para descargar en PNG
//    ?record=1[&w=1920&h=1080]     → modo grabación para los vídeos (sin cursor, sin menús, piloto automático)
//  Nada de esto toca tu partida guardada (lo que cambia solo existe mientras la página está abierta).
// =====================================================================
const MEDIA = { cover: DEBUG_PARAMS.get("cover"), record: DEBUG_PARAMS.get("record") === "1" };
const COVER_SIZES = { wide: [1920, 1080], tall: [800, 1200], square: [800, 800] };

// Prepara una escena del Volcán (nivel 3) con el Fénix (estela de fuego) y sin tocar el guardado
function mediaScene(level = 3) {
  const g = game, s = g.save.data;
  platform.save = () => true;                          // no se guarda nada de lo que pase aquí
  s.tutorialDone = true; s.tips.off = true; s.muted = true; g.sfx.muted = true;
  if (!s.owned.includes("fenix")) s.owned.push("fenix"); s.equipped = "fenix"; s.pet = null;
  g.hitPlayer = () => false;                            // nunca pierde (el vídeo no se corta)
  g.start("normal", 1); if (level > 1) { g.jumpToLevel(level); g.onLevelStart(level); } g.onSkinChanged();
  g.closeScreens(); g.login.el.classList.add("hidden");
}
// Avanza la simulación t segundos (fotogramas de 60 Hz) con una función opcional en cada fotograma
function simulate(t, each) { for (let i = 0, n = Math.round(t * 60); i < n; i++) { advance(1 / 60); if (each) each(i / 60); } }
// Dibuja el juego a la altura pedida en un lienzo aparte (pixel art nítido, sin marcador)
function renderWorld(height) {
  const g = game, oc = document.createElement("canvas"); oc.width = Math.round(height * W / H); oc.height = height;
  const keep = [g.ctx, g.dpr, g.vignette, g.fogGrad];
  g.ctx = oc.getContext("2d"); g.ctx.imageSmoothingEnabled = false; g.dpr = height / H; g.vignette = null; g.fogGrad = null; g.hideHud = true;
  try { g.draw(); } finally { [g.ctx, g.dpr, g.vignette, g.fogGrad] = keep; }
  return oc;
}
// Título «DINO RUNNER» con la fuente del juego (único texto permitido en las portadas)
function drawTitle(c, cx, top, size, stacked) {
  c.save(); c.textAlign = "center"; c.textBaseline = "top"; c.imageSmoothingEnabled = false;
  const word = (t, x, y, px, col) => {
    c.font = `${px}px "Raptor Pixel Display", monospace`;
    const sh = Math.round(px / 12);
    c.fillStyle = "#0e0b16"; for (const [dx, dy] of [[-sh, 0], [sh, 0], [0, -sh], [0, sh], [sh * 1.4, sh * 1.4]]) c.fillText(t, x + dx, y + dy);
    c.fillStyle = col; c.fillText(t, x, y);
  };
  if (stacked) { word("DINO", cx, top, size, "#ffb938"); word("RUNNER", cx, top + size * 0.95, Math.round(size * 0.78), "#5fd15a"); }
  else {   // en horizontal, las dos palabras en una línea
    c.font = `${size}px "Raptor Pixel Display", monospace`; const wd = c.measureText("DINO").width, gap = size * 0.35;
    c.font = `${Math.round(size * 0.78)}px "Raptor Pixel Display", monospace`; const wr = c.measureText("RUNNER").width, x0 = cx - (wd + gap + wr) / 2;
    word("DINO", x0 + wd / 2, top, size, "#ffb938"); word("RUNNER", x0 + wd + gap + wr / 2, top + size * 0.2, Math.round(size * 0.78), "#5fd15a");
  }
  c.restore();
}
// Escena congelada con el raptor en lo alto de un salto delante del Golem de lava
function coverScene() {
  mediaScene(3);
  const g = game;
  simulate(2.5); g.bosses.force(); simulate(4);
  g.obstacles = g.obstacles.filter(o => o.x > PLAYER_X + 260); g.floaters = []; g.coinsArr = g.coinsArr.filter(c => c.x > PLAYER_X + 120);
  g.player.jump(); simulate(0.32);
  g.frozen = true;
}
function makeCover(kind) {
  const [CW, CH] = COVER_SIZES[kind] || COVER_SIZES.wide, g = game;
  const world = renderWorld(CH), sc = CH / H;
  const focus = (PLAYER_X + 60) * sc;   // el raptor queda a un tercio del ancho
  const sx = clamp(Math.round(focus - CW * (kind === "wide" ? 0.3 : 0.38)), 0, world.width - CW);
  const out = document.createElement("canvas"); out.width = CW; out.height = CH; const c = out.getContext("2d"); c.imageSmoothingEnabled = false;
  c.drawImage(world, sx, 0, CW, CH, 0, 0, CW, CH);
  const sizeT = kind === "wide" ? 150 : kind === "tall" ? 120 : 104;
  drawTitle(c, CW / 2, Math.round(CH * (kind === "tall" ? 0.06 : 0.05)), sizeT, kind !== "wide");
  return out;
}
if (MEDIA.cover) {
  document.fonts.ready.then(() => {
    coverScene();
    const kind = COVER_SIZES[MEDIA.cover] ? MEDIA.cover : "wide", out = makeCover(kind), [CW, CH] = COVER_SIZES[kind];
    document.body.classList.add("media-mode");
    const wrap = document.createElement("div"); wrap.id = "coverOut";
    const a = document.createElement("a"); a.textContent = `⬇ Descargar portada ${CW}×${CH} (PNG)`; a.download = `dino-runner-portada-${CW}x${CH}.png`; a.href = out.toDataURL("image/png");
    out.style.maxWidth = "100%"; out.style.maxHeight = "80vh";
    wrap.append(out, a); document.body.appendChild(wrap);
  });
}

// ---------- Modo grabación ----------
// Piloto automático: mira lo que viene en su carril y salta, se desliza, cambia de carril o ruge
function autopilot() {
  const g = game, p = g.player; if (g.state !== "playing" || p.mount) return;
  const sp = g.effectiveSpeed || 400, lane = p.logicalLane;
  let next = null;
  for (const o of g.obstacles) if (!o.dead && o.lane === lane && o.x + o.w > p.x + 10 && (!next || o.x < next.x)) next = o;
  if (!next) return;
  const d = next.x - (p.x + 60), t = d / sp;
  if (next.kind === "flyer") {
    if (next.y >= 80) return;                                      // pájaro alto: se pasa por debajo
    if (next.y >= 20) { if (t < 0.35 && p.onGround) { p.downHeld = true; p.slide(); } return; }   // medio: deslizarse
  }
  if (next.kind === "stalactite") { if (t < 0.35 && p.onGround) { p.downHeld = true; p.slide(); } return; }
  p.downHeld = false;
  if (next.destructible && g.roarCd <= 0 && t < 0.55 && t > 0.2) { g.roar(); return; }
  const other = 1 - lane, blocked = g.obstacles.some(o => !o.dead && o.lane === other && Math.abs(o.x - next.x) < 160);
  if (next.h > 90 && !blocked && t < 0.6) { p.changeLane(other ? 1 : -1); return; }   // muro alto: cambiar de carril
  if (p.onGround && t < 0.26 && t > 0) p.jump();
  else if (!p.onGround && p.jumps === 1 && next.h > 60 && p.vy < 0 && t < 0.15) p.jump();   // doble salto para lo alto
}
if (MEDIA.record) {
  const fw = +DEBUG_PARAMS.get("w") || 0, fh = +DEBUG_PARAMS.get("h") || 0;
  document.body.classList.add("media-mode", "record-mode");
  const frame = document.createElement("div"); frame.id = "recFrame"; document.body.appendChild(frame);
  const stage = document.getElementById("stage"); frame.appendChild(stage);
  const card = document.createElement("canvas"); card.id = "recCard"; frame.appendChild(card);
  const ttl = document.createElement("canvas"); ttl.id = "recTitle"; frame.appendChild(ttl);   // título en la franja de arriba (vídeo vertical)
  // Tamaño del cuadro: el pedido (w×h) o la ventana; el juego llena el alto y se recorta por la derecha
  const layout = () => {
    const vw = innerWidth, vh = innerHeight, FW = fw || vw, FH = fh || vh, k = Math.min(1, vw / FW, vh / FH);
    Object.assign(frame.style, { width: FW + "px", height: FH + "px", transform: `scale(${k})` });
    const tall = FH > FW, worldH = tall ? Math.round(FW * 1.6 / 2.5) : FH;   // en vertical, el juego en una franja ancha
    stage.style.width = Math.round(worldH * 2.5) + "px"; stage.style.top = tall ? Math.round((FH - worldH) / 2) + "px" : "0px";
    frame.classList.toggle("tall", tall); card.width = FW; card.height = FH;
    ttl.width = FW; ttl.height = tall ? Math.round((FH - worldH) / 2) : 0; ttl.style.display = tall ? "block" : "none";
    if (tall) { const t = ttl.getContext("2d"); t.clearRect(0, 0, ttl.width, ttl.height); const sz = Math.round(Math.min(FW / 5.2, ttl.height / 2.1)); drawTitle(t, FW / 2, Math.round((ttl.height - sz * 1.75) / 2), sz, true); }
  };
  addEventListener("resize", layout);
  document.fonts.ready.then(() => {
    layout();
    // 1) portada (2,5 s) — 2) Volcán con el Fénix y piloto automático — 3) jefe — 4) portal al mundo siguiente
    coverScene(); const cv = makeCover(innerHeight > innerWidth || fh > fw ? (fw && fh && Math.abs(fw / fh - 1) < 0.1 ? "square" : "tall") : "wide");
    const cx = card.getContext("2d"); cx.imageSmoothingEnabled = false;
    const sc = Math.max(card.width / cv.width, card.height / cv.height); cx.drawImage(cv, (card.width - cv.width * sc) / 2, (card.height - cv.height * sc) / 2, cv.width * sc, cv.height * sc);
    game.frozen = false; mediaScene(3); game.hideHud = true; game.resize();
    const t0 = performance.now(); let bossHit = 0, portal = false;
    const tick = () => {
      requestAnimationFrame(tick);
      const t = (performance.now() - t0) / 1000;
      card.style.opacity = t < 2.5 ? 1 : Math.max(0, 1 - (t - 2.5) / 0.4);
      if (t < 2.5) { game.frozen = true; return; } game.frozen = false;
      const g = game, B = g.bosses;
      if (g.state === "choice") g.rogue.screen.skip();   // la elección de mejora no se graba (se salta sola)
      if (g.state === "tip") g.tips.close();
      autopilot();
      if (t > 5.5 && !B.active && !B.done && !portal) { g.bosses.force(); B.done = true; }
      if (B.boss && B.boss.state === "fight" && t - bossHit > 1.4) { bossHit = t; g.roarAnim = 0.4; g.sfx.roar(); B.boss.damage(Math.ceil(B.boss.maxHp / 4), "roar"); }
      if (B.done && !B.active && !portal && t > 9) { portal = true; g.distance = g.level.boundary - 420; g.obstacles = []; }
    };
    tick();
  });
}
