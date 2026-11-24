/* DinoSkinsEngine — motor de skins de velociraptor en pixel art (canvas 2D, sin dependencias).
   Uso: DinoSkinsEngine.init(datosJSON); luego drawDino(...) en cada frame del juego. */
(function (root) {
  var W = 24, H = 20, WD = 32;
  var RB = ["#ff3b5c", "#ff9f1c", "#ffd23f", "#3ddc84", "#41b8ff", "#8a5cff"];
  var DATA = null, byId = {};

  function init(data) { DATA = data; byId = {}; data.skins.forEach(function (s) { byId[s.id] = s; }); return api; }
  function get(id) { return byId[id]; }

  // Devuelve una matriz 20×24 de letras de paleta ('.' = transparente).
  function compose(spriteId, frame) {
    var spr = DATA.sprites[spriteId], fr = spr.frames[frame] || spr.frames.idle;
    if (fr.full) return fr.full.map(function (r) { return (r + "................................").slice(0, WD).split(""); });
    var rows = spr.body.concat(fr.legs).map(function (r) { return (r + "........................").slice(0, W).split(""); });
    if (fr.top) {
      var off = fr.top[0];
      fr.top[1].forEach(function (r, i) { for (var j = 0; j < Math.min(r.length, W); j++) if (r[j] !== ".") rows[off + i][j] = r[j]; });
    }
    return rows;
  }

  // Frame de carrera para un tick: los skins normales alternan run1/run2 cada 2 ticks;
  // los que definen `run` (p. ej. el Supremo) recorren su ciclo completo, 1 frame por tick, con rebote `dy`.
  function runFrame(skinId, tick) {
    var s = byId[skinId], cyc = s.run || ["run1", "run1", "run2", "run2"];
    var f = cyc[tick % cyc.length], fr = DATA.sprites[s.sprite].frames[f] || {};
    return { frame: f, dy: fr.dy || 0 };
  }

  // Dibuja un frame en el origen nativo (ox, oy); cada píxel mide sc px de pantalla. t = tick de animación.
  // opts.tint: pinta la silueta de un color plano (para ecos). opts.alpha: opacidad.
  var SPR_CACHE = new Map();
  function clearSpriteCache() { SPR_CACHE.clear(); }
  function drawSprite(ctx, skinId, frame, ox, oy, sc, t, opts) {
    var s = byId[skinId]; if (!s) return;
    var an = (s.fx || {}).anim || {}; opts = opts || {}; t = t || 0;
    if (an.type === "ghost" && !opts.tint) return drawSpriteRaw(ctx, skinId, frame, ox, oy, sc, t, opts);
    var animated = !opts.tint && (an.type === "twinkle" || an.type === "pulse" || an.type === "rainbow" || an.type === "shine");
    var pal = s.pal, sig = s.sprite; for (var k in pal) sig += pal[k];
    var key = skinId + "|" + frame + "|" + (opts.tint || "") + "|" + (animated ? t % 720 : 0) + "|" + sig;
    var cv = SPR_CACHE.get(key);
    if (!cv) {
      if (SPR_CACHE.size > 3000) SPR_CACHE.clear();
      cv = document.createElement("canvas"); cv.width = WD; cv.height = H + 8;
      drawSpriteRaw(cv.getContext("2d"), skinId, frame, 0, 4, 1, t, { tint: opts.tint });
      SPR_CACHE.set(key, cv);
    }
    ctx.save(); if (opts.alpha != null) ctx.globalAlpha = opts.alpha; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, ox * sc, (oy - 4) * sc, WD * sc, (H + 8) * sc);
    ctx.restore();
  }
  function drawSpriteRaw(ctx, skinId, frame, ox, oy, sc, t, opts) {
    var s = byId[skinId], fx = s.fx || {}, an = fx.anim || {}; t = t || 0; opts = opts || {};
    var fr = DATA.sprites[s.sprite].frames[frame] || {};
    oy += fr.dy || 0;
    ctx.save();
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    if (an.type === "ghost" && !opts.tint) { ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t / 3); oy += Math.round(Math.sin(t / 4) * 1.5) - 2; }
    compose(s.sprite, frame).forEach(function (row, y) {
      row.forEach(function (c, x) {
        if (c === ".") return;
        var col = s.pal[c] || "#ff00ff";
        if (opts.tint) col = opts.tint;
        else if (an.type === "twinkle" && c === an.key) col = an.colors[(x * 3 + y * 5 + t) % an.colors.length];
        else if (an.type === "pulse" && c === an.key) col = an.colors[t % an.colors.length];
        else if (an.type === "rainbow" && (c === "b" || c === "s")) col = RB[((Math.floor((x + y) / 2) - t) % 6 + 6) % 6];
        else if (an.type === "shine") {
          var band = (((x + y) - t * 2) % an.period + an.period) % an.period;
          if ((c === "b" || c === "s") && band < 2) col = an.colors[band];
          if (c === an.key) col = an.keyColors[(x + t) % an.keyColors.length];
        }
        ctx.fillStyle = col;
        ctx.fillRect((ox + x) * sc, (oy + y) * sc, sc, sc);
      });
    });
    ctx.restore();
  }

  // ---------- Estela y ecos (partículas en píxeles nativos) ----------
  function Trail(skinId) { this.id = skinId; this.p = []; this.hist = []; }
  Trail.prototype.emit = function (ox, oy, t, step, frame) {
    var s = byId[this.id], fx = s.fx || {}, tr = fx.trail, R = Math.random, p = this.p;
    step = step || 2;
    if (fx.echo) { this.hist.unshift({ frame: frame, oy: oy }); this.hist.length = Math.min(this.hist.length, fx.echo.colors.length * fx.echo.every + 1); }
    if (fx.sparks && t % 3 === 0) for (var k = 0; k < 2; k++) p.push({ x: ox + 6 + R() * 14, y: oy + 2 + R() * 14, vx: 0, vy: 0, life: 3, max: 3, c: fx.sparks, shape: R() < .5 ? "plus" : "px", still: true });
    if (!tr) return;
    var C = tr.colors;
    if (tr.type === "rainbow") {
      for (var i = 0; i < 6; i++) p.push({ x: ox + 1, y: oy + 9 + i, vx: 0, vy: 0, life: 26, max: 26, c: C[i], w: step + 1 });
    } else if (tr.type === "snow") {
      if (t % 2 === 0) p.push({ x: ox + 1 + R() * 4, y: oy + 8 + R() * 6, vx: .15, vy: .2 + R() * .2, life: 30, max: 30, c: C[Math.floor(R() * C.length)], shape: R() < .4 ? "plus" : "px" });
    } else if (tr.type === "fire") {
      for (var j = 0; j < 2; j++) p.push({ x: ox + R() * 4, y: oy + 8 + R() * 5, vx: .3, vy: -.25 - R() * .35, life: 14 + R() * 6, max: 20, fire: true, shape: R() < .3 ? "big" : "px" });
    } else if (tr.type === "sparkle") {
      p.push({ x: ox + R() * 8, y: oy + 3 + R() * 13, vx: .2, vy: 0, life: 16, max: 16, c: C[Math.floor(R() * C.length)], shape: "plus", blink: true });
    } else if (tr.type === "stars") {
      p.push({ x: ox + R() * 5, y: oy + 6 + R() * 10, vx: 0, vy: 0, life: 34, max: 34, c: C[Math.floor(R() * C.length)], shape: R() < .35 ? "plus" : "px", blink: true });
    } else if (tr.type === "prism") {
      // Cinta arcoíris que nace en la punta de la cola (x < ox) y solo se alarga hacia atrás
      var sh = Math.floor(t / 3) % C.length, wy = Math.round(Math.sin(t * 0.5) * 1);
      for (var pi = 0; pi < 6; pi++) p.push({ x: ox - 2, y: oy + 7 + pi + wy, vx: 0, vy: 0, life: 11, max: 11, c: C[(pi + sh) % C.length], w: step + 1 });
      if (t % 3 === 0) p.push({ x: ox - 3 - R() * 6, y: oy + 6 + R() * 8, vx: 0, vy: -.2 - R() * .2, life: 12, max: 12, c: R() < .5 ? "#ffffff" : C[Math.floor(R() * C.length)], shape: "plus", blink: true });
    } else if (tr.type === "aura") {
      p.push({ x: ox + 4 + R() * 18, y: oy + 18 - R() * 3, vx: step * .9, vy: -.35 - R() * .3, life: 18, max: 18, c: C[Math.floor(R() * C.length)], shape: R() < .3 ? "plus" : "px", blink: true });
      if (t % 2 === 0) p.push({ x: ox, y: oy + 8 + R() * 6, vx: 0, vy: 0, life: 20, max: 20, c: C[Math.floor(R() * C.length)], shape: "plus", blink: true });
    }
  };
  Trail.prototype.step = function (scroll) {
    this.p.forEach(function (q) { if (!q.still) q.x -= scroll - q.vx; q.y += q.vy; q.life--; });
    this.p = this.p.filter(function (q) { return q.life > 0; });
  };
  Trail.prototype.draw = function (ctx, sc, t) {
    var tr = (byId[this.id].fx || {}).trail || {}, a0 = ctx.globalAlpha;
    this.p.forEach(function (q, i) {
      var f = q.life / q.max, col = q.c;
      if (q.fire) { var C = tr.colors; col = C[Math.min(C.length - 1, Math.floor((1 - f) * C.length))]; }
      if (q.blink && (i + t) % 4 === 0) return;
      ctx.globalAlpha = a0 * (q.w ? Math.min(1, f * 1.6) : Math.min(1, .35 + f));
      ctx.fillStyle = col;
      var x = Math.round(q.x), y = Math.round(q.y);
      if (q.w) ctx.fillRect(x * sc, y * sc, q.w * sc, sc);
      else if (q.shape === "plus" && f > .3) { ctx.fillRect((x - 1) * sc, y * sc, 3 * sc, sc); ctx.fillRect(x * sc, (y - 1) * sc, sc, 3 * sc); }
      else if (q.shape === "big") ctx.fillRect(x * sc, y * sc, 2 * sc, 2 * sc);
      else ctx.fillRect(x * sc, y * sc, sc, sc);
    });
    ctx.globalAlpha = a0;
  };
  // Ecos: siluetas de frames anteriores detrás del raptor (solo skins con fx.echo).
  Trail.prototype.drawEchoes = function (ctx, ox, sc, t) {
    var s = byId[this.id], e = (s.fx || {}).echo; if (!e) return;
    for (var i = e.colors.length - 1; i >= 0; i--) {
      var h = this.hist[(i + 1) * e.every]; if (!h) continue;
      drawSprite(ctx, this.id, h.frame, ox - e.gap * (i + 1), h.oy, sc, t, { tint: e.colors[i], alpha: e.alpha[i] });
    }
  };

  // Todo en una llamada: ecos + estela + raptor. state = {trail, tick, speed}; devuelve el frame usado.
  // Llamar una vez por tick de animación (80–110 ms), no por requestAnimationFrame.
  function drawDino(ctx, skinId, ox, groundY, sc, state, jumpY, dead) {
    var tick = state.tick, frame, dy = 0;
    if (dead) frame = "idle"; else if (jumpY > 0) frame = "jump"; else if (state.duck) frame = tick % 4 < 2 ? "duck1" : "duck2"; else { var rf = runFrame(skinId, tick); frame = rf.frame; }
    var oy = Math.round(groundY - H + 1 - (jumpY || 0));
    var tr = state.trail || (state.trail = new Trail(skinId));
    if (!dead) { tr.step(state.speed || 2); tr.emit(ox, oy, tick, state.speed || 2, frame); }
    tr.drawEchoes(ctx, ox, sc, tick);
    tr.draw(ctx, sc, tick);
    drawSprite(ctx, skinId, frame, ox, oy, sc, tick);
    return frame;
  }

  var api = { W: W, H: H, init: init, get: get, compose: compose, runFrame: runFrame, drawSprite: drawSprite, clearSpriteCache: clearSpriteCache, Trail: Trail, drawDino: drawDino,
    get skins() { return DATA ? DATA.skins : []; } };
  root.DinoSkinsEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
