// =====================================================================
//  ROGUELIKE: tiradas de cartas (UpgradePool), pantalla de elección (UpgradeScreen), altar de ámbar,
//  historial de builds y álbum. Los efectos de cada mejora están en ROGUE_CONFIG/UPGRADES y se leen con game.stat().
// =====================================================================
// Iconos 8 × 8 por categoría (o = contorno, a = color de la rareza, b = brillo)
const UP_ICONS = {
  roar:   ["..oo....", ".oaao.o.", "oaaaao.o", "oabaaoo.", "oaaaao.o", ".oaao.o.", "..oo....", "........"],
  move:   ["....oo..", "...oaao.", "..oaao..", ".oaaao..", "oaabao..", ".ooaao..", "...oao..", "....o..."],
  def:    [".oooooo.", "oaaaaaao", "oabaaaao", "oabaaaao", "oaaaaaao", ".oaaaao.", "..oaao..", "...oo..."],
  power:  ["....ooo.", "...oaao.", "..oaao..", ".oaaaaoo", "ooooaao.", "...oao..", "..oao...", "..oo...."],
  eco:    ["..oooo..", ".oaaaao.", "oaabbaao", "oabaaaao", "oabaaaao", "oaabbaao", ".oaaaao.", "..oooo.."],
  boss:   ["o.o..o.o", "oaoooaao", "oaaaaaao", "oabaabao", "oaaaaaao", "oaoaoaao", ".oaaaao.", "..oooo.."],
  mount:  ["........", "....oo..", "...oaao.", "oooaaaao", "oaaaabao", "oaaaaaao", ".oo..oo.", ".oo..oo."],
  egg:    ["...oo...", "..oaao..", ".oaabao.", ".oaaaao.", "oaaaaaao", "oaaaaaao", ".oaaaao.", "..oooo.."],
  legend: ["o..oo..o", "oaoaaoao", "oaaaaaao", ".oabbao.", ".oaaaao.", "oaaaaaao", "oaaaaaao", "oooooooo"],
  pact:   ["...oo...", "..oaao..", ".oabaao.", "oaabaaao", "oaaaaaao", ".oaaaao.", "..oaao..", "...oo..."],
  syn:    ["...o....", "..oao...", "ooaaaooo", "oaaabaao", ".oaaaao.", ".oaoaao.", "oao.oao.", "oo...oo."],
};
const PACT_COLOR = "#ff3b3b", SYN_COLOR = "#ff7ad0";
function drawUpIcon(c, cat, col, sc, x = 0, y = 0) {
  const rows = UP_ICONS[cat] || UP_ICONS.eco;
  rows.forEach((r, j) => { for (let i = 0; i < 8; i++) { const ch = r[i]; if (ch === ".") continue;
    c.fillStyle = ch === "o" ? "#16111f" : ch === "b" ? "#ffffff" : col; c.fillRect(x + i * sc, y + j * sc, sc, sc); } });
}
const upColor = u => ROGUE_CONFIG.RARITY[u.rarity].color;
const RARITY_ORDER = ["comun", "rara", "epica", "legendaria"];

// ---------- Tiradas ----------
class UpgradePool {
  constructor(game) { this.game = game; }
  // Probabilidad de cada rareza (cambia con los jefes derrotados y el árbol)
  odds(maxRarity) {
    const g = this.game, b = g.build, R = ROGUE_CONFIG, k = b.bossesBeaten, bonus = g.stat("rarityBonus");
    const o = {};
    for (const r of RARITY_ORDER) o[r] = R.RARITY_ODDS[r] + (R.ODDS_PER_BOSS[r] || 0) * k;
    o.epica += bonus; o.legendaria += bonus; o.comun -= bonus * 2;
    o.comun = Math.max(R.MIN_COMMON, o.comun);
    if (k < R.LEGENDARY_AFTER_BOSSES) o.legendaria = 0;
    if (maxRarity) for (const r of RARITY_ORDER) if (RARITY_ORDER.indexOf(r) > RARITY_ORDER.indexOf(maxRarity)) o[r] = 0;
    const sum = RARITY_ORDER.reduce((s, r) => s + Math.max(0, o[r]), 0);
    for (const r of RARITY_ORDER) o[r] = Math.max(0, o[r]) / sum;
    return o;
  }
  available(u) { const b = this.game.build; return b.level(u.id) < (u.max || 1); }
  roll(n, { maxRarity = null, forceLegend = false } = {}) {
    const g = this.game, odds = this.odds(maxRarity), out = [];
    const free = UPGRADES.filter(u => this.available(u));
    for (let i = 0; i < n; i++) {
      const left = free.filter(u => !out.includes(u)); if (!left.length) break;
      let rarity = "comun";
      if (forceLegend && i === 0 && left.some(u => u.rarity === "legendaria")) rarity = "legendaria";
      else { let r = Math.random(); for (const k of RARITY_ORDER) { r -= odds[k]; if (r <= 0) { rarity = k; break; } } }
      // Si no queda ninguna de esa rareza, se baja (y si no, se sube) hasta encontrar una
      const order = [rarity, ...RARITY_ORDER.slice(0, RARITY_ORDER.indexOf(rarity)).reverse(), ...RARITY_ORDER.slice(RARITY_ORDER.indexOf(rarity) + 1)];
      for (const r of order) {
        if (odds[r] === 0 && r !== rarity) continue;
        const opts = left.filter(u => u.rarity === r); if (opts.length) { out.push(choice(opts)); break; }
      }
    }
    if (forceLegend) g.build.forceLegend = false;
    return out;
  }
}

// ---------- Altar de ámbar (objeto del camino) ----------
class AmberAltar {
  constructor(lane, x) { this.lane = lane; this.x = x; this.t = 0; this.taken = false; }
  hitbox() { return { x: this.x - 22, y: 0, w: 44, h: 64 }; }
  draw(c) {
    const t = this.t, glow = 0.35 + 0.2 * Math.sin(t * 5);
    c.fillStyle = `rgba(255,170,40,${glow})`; c.beginPath(); c.ellipse(0, -40, 46, 54, 0, 0, Math.PI * 2); c.fill();
    const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
    R(-24, -18, 48, 18, "#16111f"); R(-21, -15, 42, 15, "#6a5a4a"); R(-21, -15, 42, 3, "#9a8a7a");      // pedestal
    R(-15, -24, 30, 9, "#16111f"); R(-12, -21, 24, 6, "#7a6a5a");
    const fy = -52 + Math.sin(t * 3) * 4;                                                                 // gema de ámbar flotando
    R(-12, fy - 15, 24, 30, "#16111f"); R(-9, fy - 12, 18, 24, "#ff9a1a"); R(-6, fy - 9, 9, 9, "#ffd05a"); R(-6, fy - 9, 3, 3, "#ffffff");
    R(-3, fy - 18, 6, 3, "#16111f"); R(-3, fy + 15, 6, 3, "#16111f");
    for (let i = 0; i < 4; i++) { const a = t * 2 + i * Math.PI / 2; R(Math.cos(a) * 30 - 2, fy + Math.sin(a) * 12 - 2, 4, 4, "#ffe9a8"); }
  }
}

// ---------- Gestor: cuándo hay elecciones, altar, checkpoints, Elegido, historial y álbum ----------
class RogueManager {
  constructor(game) { this.g = game; this.pool = new UpgradePool(game); this.screen = new UpgradeScreen(game, this); this.reset(); }
  reset() { this.pending = []; this.delay = 0; this.altar = null; this.altarPlan = {}; }
  get enabled() { return !this.g.versus && !this.g.tutorial && !this.g.netRace; }
  // Al empezar la partida (desde el nivel 1 o un checkpoint)
  startRun(startLevel) {
    if (!this.enabled) return;
    if (this.g.save.data.allUpgrades) {   // código secreto: empieza con todas las mejoras a su nivel máximo
      const b = this.g.build;
      for (const u of UPGRADES) { b.levels[u.id] = u.max || 1; b.order.push(u.id); }
      for (const s of SYNERGIES) if (b.synergyReady(s)) b.synergies.push(s.id);
      b.cache = {}; return;
    }
    const g = this.g, free = Math.floor((startLevel - 1) / ROGUE_CONFIG.CHECKPOINT_PICKS_PER);
    for (let i = 0; i < free; i++) this.queue("free", 1.2);
    if (g.stat("chosenStart")) {   // árbol: Elegido
      const c = UPGRADES.filter(u => u.rarity === "comun"); const u = choice(c);
      g.build.add(u.id); g.build.picks--; g.floatText(g.player.laneT, g.player.x + 40, g.player.y + 140, `ELEGIDO: ${u.name.toUpperCase()}`, upColor(u), 18);
    }
  }
  queue(kind, delay = 0) { if (!this.enabled) return; this.pending.push(kind); this.delay = Math.max(this.delay, delay); }
  onLevelStart(level) {
    const g = this.g; if (!this.enabled) return;
    if (level > 1 && g.eggsInLevel(level - 1) >= CONFIG.EGGS_PER_LEVEL) this.queue("egg", 1.2);   // nivel perfecto de huevos
    if (g.build.pacts.length < ROGUE_CONFIG.MAX_PACTS && Math.random() < ROGUE_CONFIG.ALTAR_CHANCE)
      this.altarPlan[level] = { at: rand(120, 330), done: false };   // lejos del boss (a los 500) y del portal
  }
  wantsAltar() {
    const g = this.g, p = this.altarPlan[g.level.level]; if (!p || p.done) return false;
    const inLevel = g.distScore - (g.level.level - 1) * CONFIG.POINTS_PER_LEVEL;
    if (inLevel < p.at || inLevel > CONFIG.BOSS_AT_IN_LEVEL - 120) return false;
    return !this.altar && !g.bosses.active && !g.mounts.active && !g.mounts.pickup && !g.level.portal;
  }
  // Lo llama el generador como el de las monturas. Devuelve los px que ocupa
  spawnHook() {
    if (!this.enabled || !this.wantsAltar()) return 0;
    this.altarPlan[this.g.level.level].done = true;
    this.altar = new AmberAltar(randInt(0, 1), SPAWN_X + MOUNT_CONFIG.CLEAR_PX);
    return MOUNT_CONFIG.CLEAR_PX * 2 + 60;
  }
  debugAltar() { this.altar = new AmberAltar(this.g.player.logicalLane, PLAYER_X + 520); }
  update(dt) {
    const g = this.g, sp = g.effectiveSpeed * (g.effects.slowmo > 0 ? CONFIG.SLOWMO_FACTOR : 1);
    if (this.altar) {
      const A = this.altar; A.t += dt; A.x -= sp * dt;
      if (!A.tipped && A.x < W - 120) { A.tipped = true; g.tips.show("altar"); }
      const pl = g.player;
      if (!A.taken && A.lane === pl.logicalLane && pl.hitboxes().some(b => overlap(b, A.hitbox()))) {
        A.taken = true; g.sfx.portal(); g.flashT = 0.25;
        const offer = PACTS.filter(p => !g.build.pacts.includes(p.id));
        if (offer.length && g.build.pacts.length < ROGUE_CONFIG.MAX_PACTS) this.screen.openPact(choice(offer));
      }
      if (A.taken || A.x < -80) this.altar = null;
    }
    if (!this.pending.length || g.state !== "playing") return;
    if ((this.delay -= dt) > 0) return;
    if (g.bosses.phase === "warning" || (g.bosses.boss && g.bosses.boss.state === "fight")) return;   // nunca en mitad de un combate
    const kind = this.pending.shift();
    this.screen.openChoice(kind);
  }
  drawLane(c, lane) {
    const A = this.altar; if (!A || A.lane !== lane) return;
    c.save(); applyLane(c, lane); c.translate(A.x, 0); drawShadow(c, 0, 50, 0); A.draw(c); c.restore();
  }
  // Coste de barajar: 50, 100, 200… (Tarifa plana: siempre 50; Regateo: −25 % por nivel)
  rerollCost() {
    const g = this.g, R = ROGUE_CONFIG;
    const base = g.stat("rerollFlat") ? R.REROLL_FLAT : R.REROLL_BASE * Math.pow(2, g.build.rerolls);
    return Math.max(1, Math.round(base * (1 - g.stat("rerollDiscount"))));
  }
  // Álbum y logros al coger una mejora
  onUpgradeAdded(u) {
    const al = this.album; al.ups[u.id] = 1; this.g.save.save();
    const legends = Object.keys(this.g.build.levels).filter(id => UPGRADE_BY_ID[id].rarity === "legendaria").length;
    this.g.ach.event("upgradePicked", { id: u.id, rarity: u.rarity, distinct: Object.keys(al.ups).length, legends });
  }
  get album() { return this.g.save.data.album; }
  // Historial: últimas 20 partidas
  recordRun() {
    const g = this.g, s = g.save.data, b = g.build;
    s.buildHistory.unshift({ date: new Date().toISOString(), mode: g.mode.id, score: g.score, level: g.level.level, bosses: g.runBosses,
      ups: { ...b.levels }, order: b.order.slice(), pacts: b.pacts.slice(), syn: b.synergies.slice() });
    s.buildHistory.length = Math.min(s.buildHistory.length, 20);
  }
}

// ---------- Pantalla de elección de mejora y de pacto ----------
class UpgradeScreen {
  constructor(game, rogue) {
    this.g = game; this.rogue = rogue; this.cards = []; this.sel = 0; this.kind = null; this.pact = null;
    const $ = id => document.getElementById(id);
    this.el = $("upgrade"); this.box = $("upCards"); this.title = $("upTitle"); this.sub = $("upSub"); this.coinsEl = $("upCoins"); this.buildEl = $("upBuild");
    this.rerollBtn = $("upReroll"); this.skipBtn = $("upSkip");
    this.rerollBtn.addEventListener("click", e => { e.currentTarget.blur(); this.reroll(); });
    this.skipBtn.addEventListener("click", e => { e.currentTarget.blur(); this.skip(); });
  }
  get visible() { return !this.el.classList.contains("hidden"); }
  open() { const g = this.g; g.pausedFrom = g.state; g.state = "choice"; this.el.classList.remove("hidden"); g.sfx.levelUp(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
  close() { const g = this.g; this.el.classList.add("hidden"); this.kind = null; this.pact = null; if (g.state === "choice") { g.state = "playing"; g.grace = Math.max(g.grace, 0.8); } }
  openChoice(kind) {
    const g = this.g, R = ROGUE_CONFIG;
    this.kind = kind;
    const n = kind === "egg" ? R.EGG_CARDS : R.CARDS + (kind === "boss" && g.stat("extraCard") ? 1 : 0);
    this.n = n; this.maxRarity = kind === "egg" ? "rara" : null;
    this.title.textContent = kind === "egg" ? "¡NIVEL PERFECTO! ELIGE UNA MEJORA" : kind === "free" ? "MEJORA GRATIS DEL CHECKPOINT" : "ELIGE UNA MEJORA";
    this.cards = this.rogue.pool.roll(n, { maxRarity: this.maxRarity, forceLegend: g.build.forceLegend });
    if (!this.cards.length) { this.g.floatText(g.player.laneT, g.player.x + 40, g.player.y + 120, "¡YA LO TIENES TODO!", "#ffd23f", 20); return; }
    this.sel = 0; this.open(); this.render(true);
    if (g.tips) g.tips.show("upgrade");
  }
  openPact(p) {
    this.kind = "pact"; this.pact = p; this.sel = 0;
    this.title.textContent = "ALTAR DE ÁMBAR · ¿ACEPTAS EL PACTO?";
    this.open(); this.render(true);
    if (this.g.tips) this.g.tips.show("altar");
  }
  render(anim) {
    const g = this.g, b = g.build, pact = this.kind === "pact";
    this.box.innerHTML = "";
    if (pact) {
      const p = this.pact, el = document.createElement("div");
      el.className = "up-card pact" + (anim ? " flip" : "");
      el.innerHTML = `<canvas width="40" height="40"></canvas><b>${p.name}</b><span class="up-rar" style="color:${PACT_COLOR}">PACTO</span>
        <p class="good">✔ ${p.good}</p><p class="bad">✘ ${p.bad}</p><small>Dura toda la partida · máx. ${ROGUE_CONFIG.MAX_PACTS} pactos</small>`;
      drawUpIcon(el.querySelector("canvas").getContext("2d"), "pact", PACT_COLOR, 5);
      this.box.appendChild(el);
      this.sub.textContent = "Una ventaja fuerte con una desventaja.";
      this.rerollBtn.innerHTML = `✔ Aceptar <kbd>W</kbd>`; this.skipBtn.innerHTML = `✘ Rechazar <kbd>Q</kbd>`;
      this.rerollBtn.disabled = false; this.rerollBtn.classList.toggle("sel", this.sel === 0); this.skipBtn.classList.toggle("sel", this.sel === 1);
    } else {
      this.cards.forEach((u, i) => {
        const l = b.level(u.id), col = upColor(u), syn = SYNERGIES.filter(s => !b.synergies.includes(s.id) && s.need.some(([id]) => id === u.id) && b.synergyReady(s, u.id));
        const el = document.createElement("div");
        el.className = "up-card" + (i === this.sel ? " sel" : "") + (anim ? " flip" : "");
        el.style.setProperty("--rc", col); el.style.animationDelay = anim ? `${i * 0.08}s` : "0s";
        el.innerHTML = `<canvas width="40" height="40"></canvas><b>${u.name}</b><span class="up-rar" style="color:${col}">${ROGUE_CONFIG.RARITY[u.rarity].name.toUpperCase()} · ${ROGUE_CONFIG.CATS[u.cat]}</span>
          <p>${u.desc(l + 1)}</p>${u.max > 1 ? `<small>${l ? `Nivel ${l} → ${l + 1}` : `Nivel 1`} (máx. ${u.max})</small>` : ""}
          ${syn.map(s => `<span class="up-syn">SINERGIA: ${s.name.toUpperCase()}</span>`).join("")}<kbd>${i + 1}</kbd>`;
        drawUpIcon(el.querySelector("canvas").getContext("2d"), u.cat, col, 5);
        el.addEventListener("click", () => this.pick(i));
        el.addEventListener("mouseenter", () => { this.sel = i; this.box.querySelectorAll(".up-card").forEach((c, k) => c.classList.toggle("sel", k === i)); });
        this.box.appendChild(el);
      });
      const cost = this.rogue.rerollCost();
      this.sub.textContent = this.kind === "egg" ? "Has recogido los 2 huevos del nivel: elige una (Común o Rara)." : `Rarezas: ${this.oddsText()}`;
      this.rerollBtn.innerHTML = `Barajar · <span class="coin"></span> ${cost} <kbd>R</kbd>`; this.rerollBtn.disabled = g.runCoinsInt < cost;
      this.skipBtn.innerHTML = `Saltar · +${ROGUE_CONFIG.SKIP_COINS} <kbd>Q</kbd>`;
      this.rerollBtn.classList.remove("sel"); this.skipBtn.classList.remove("sel");
    }
    this.coinsEl.textContent = g.runCoinsInt;
    this.buildEl.innerHTML = buildIconsHtml(b);
    this.buildEl.querySelectorAll("canvas[data-cat]").forEach(cv => drawUpIcon(cv.getContext("2d"), cv.dataset.cat, cv.dataset.col, 2));
  }
  oddsText() {
    const o = this.rogue.pool.odds(this.maxRarity);
    return RARITY_ORDER.filter(r => o[r] > 0).map(r => `${ROGUE_CONFIG.RARITY[r].name} ${Math.round(o[r] * 100)} %`).join(" · ");
  }
  move(d) {
    if (this.kind === "pact") { this.sel = d < 0 ? 0 : 1; }
    else this.sel = clamp(this.sel + d, 0, this.cards.length - 1);
    this.g.sfx.click(); this.render(false);
  }
  confirm() { if (this.kind === "pact") return this.sel === 0 ? this.accept() : this.reject(); this.pick(this.sel); }
  pick(i) {
    const u = this.cards[i]; if (!u || this.kind === "pact") return;
    const g = this.g; g.sfx.perfect();
    this.close();
    g.build.add(u.id);
    g.floatText(g.player.laneT, g.player.x + 40, g.player.y + 140, `${u.name.toUpperCase()}${g.build.level(u.id) > 1 ? " NV " + g.build.level(u.id) : ""}`, upColor(u), 20);
  }
  reroll() {
    const g = this.g;
    if (this.kind === "pact") return this.accept();
    const cost = this.rogue.rerollCost(); if (g.runCoinsInt < cost) { g.sfx.denied(); return; }
    g.runCoins -= cost; g.build.rerolls++; g.sfx.toss(); g.ach.event("coinsSpent", { n: cost, on: "reroll" });
    this.cards = this.rogue.pool.roll(this.n, { maxRarity: this.maxRarity, forceLegend: g.build.forceLegend }); this.sel = 0; this.render(true);
  }
  skip() {
    const g = this.g;
    if (this.kind === "pact") return this.reject();
    g.addRunCoins(ROGUE_CONFIG.SKIP_COINS); g.build.skipped++; g.sfx.coin();
    g.ach.event("upgradeSkipped", { skipped: g.build.skipped, picks: g.build.picks });
    this.close();
    g.floatText(g.player.laneT, g.player.x + 40, g.player.y + 140, `+${ROGUE_CONFIG.SKIP_COINS} MONEDAS`, "#ffd23f", 20);
  }
  accept() {
    const g = this.g, p = this.pact; this.close(); g.build.addPact(p.id);
    g.sfx.bossDefeat(); g.addShake(0.4, 8); g.flashT = 0.3;
    this.rogue.album.pacts[p.id] = 1; g.save.save();
    g.bossBanner = { t: 2.4, text: p.name.toUpperCase(), sub: `${p.good} · ${p.bad}`, color: PACT_COLOR };
  }
  reject() { this.close(); this.g.sfx.click(); }
}
// Fila de iconos del build (pantalla de elección, pausa y Game Over)
function buildIconsHtml(b, withText = false) {
  const items = [];
  for (const id of Object.keys(b.levels || b.ups || {})) {
    const u = UPGRADE_BY_ID[id]; if (!u) continue; const l = (b.levels || b.ups)[id];
    items.push(`<span class="bi" title="${u.name}"><canvas width="16" height="16" data-cat="${u.cat}" data-col="${upColor(u)}"></canvas>${l > 1 ? `<i>${l}</i>` : ""}${withText ? `<em><b style="color:${upColor(u)}">${u.name}${l > 1 ? " " + l : ""}</b> ${u.desc(l)}</em>` : ""}</span>`);
  }
  for (const id of b.synergies || b.syn || []) { const s = SYNERGIES.find(x => x.id === id); if (s) items.push(`<span class="bi syn" title="${s.name}"><canvas width="16" height="16" data-cat="syn" data-col="${SYN_COLOR}"></canvas>${withText ? `<em><b style="color:${SYN_COLOR}">Sinergia ${s.name}</b> ${s.desc}</em>` : ""}</span>`); }
  for (const id of b.pacts || []) { const p = PACT_BY_ID[id]; if (p) items.push(`<span class="bi pact" title="${p.name}"><canvas width="16" height="16" data-cat="pact" data-col="${PACT_COLOR}"></canvas>${withText ? `<em><b style="color:${PACT_COLOR}">${p.name}</b> ✔ ${p.good} · ✘ ${p.bad}</em>` : ""}</span>`); }
  return items.length ? items.join("") : `<small class="touch-hint">Sin mejoras todavía</small>`;
}
function paintBuildIcons(root) { root.querySelectorAll("canvas[data-cat]").forEach(cv => drawUpIcon(cv.getContext("2d"), cv.dataset.cat, cv.dataset.col, 2)); }
// Iconos del build en el marcador (abajo a la izquierda, sin tapar el juego)
function drawBuildHud(c, g) {
  const b = g.build; let x = 12; const y = H - 30;
  const list = [...Object.keys(b.levels).map(id => [UPGRADE_BY_ID[id].cat, upColor(UPGRADE_BY_ID[id]), b.levels[id], null]),
    ...b.synergies.map(() => ["syn", SYN_COLOR, 1, null]), ...b.pacts.map(() => ["pact", PACT_COLOR, 1, PACT_COLOR])];
  for (const [cat, col, l, border] of list) {
    if (x > 330) break;
    c.fillStyle = border || UI_T.line; c.fillRect(x - 2, y - 2, 20, 20); c.fillStyle = UI_T.panel; c.fillRect(x, y, 16, 16);
    drawUpIcon(c, cat, col, 2, x, y);
    if (l > 1) { c.font = '10px "Raptor Pixel Display", monospace'; c.textAlign = "right"; c.textBaseline = "alphabetic"; c.fillStyle = UI_T.line; c.fillText(l, x + 19, y + 19); c.fillStyle = "#ffffff"; c.fillText(l, x + 18, y + 18); }
    x += 22;
  }
}

// ---------- Historial de builds y álbum (pantallas del menú) ----------
class BuildHistory {
  constructor(game) {
    this.g = game; const $ = id => document.getElementById(id);
    this.el = $("history"); this.list = $("histList");
    $("histBack").addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); this.close(); });
  }
  get visible() { return !this.el.classList.contains("hidden"); }
  open(from) {
    this.from = from; const h = this.g.save.data.buildHistory, MN = { normal: "Normal", easy: "Fácil", hard: "Difícil" };
    this.list.innerHTML = h.length ? h.map((r, i) => `<div class="hist">
      <div class="hist-head"><b>#${i + 1} · ${fmtNum(r.score)} pts</b><small>${new Date(r.date).toLocaleDateString(I18N.locale)} · ${MN[r.mode] || r.mode} · nivel ${r.level} · ${r.bosses} jefe${r.bosses === 1 ? "" : "s"}</small></div>
      <div class="build-row">${buildIconsHtml({ ups: r.ups, syn: r.syn, pacts: r.pacts }, true)}</div></div>`).join("")
      : `<p class="touch-hint">Todavía no hay partidas. ¡Juega una!</p>`;
    paintBuildIcons(this.list);
    this.el.classList.remove("hidden");
  }
  close() { this.el.classList.add("hidden"); if (this.from === "over") this.g.ui.showOver(); else this.g.showMenu(); }
}
class UpgradeAlbum {
  constructor(game) {
    this.g = game; const $ = id => document.getElementById(id);
    this.el = $("album"); this.grid = $("albumGrid"); this.count = $("albumCount");
    $("albumBack").addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); this.close(); });
  }
  get visible() { return !this.el.classList.contains("hidden"); }
  open() {
    const A = this.g.save.data.album, cell = (seen, cat, col, name, sub, desc) => `<div class="alb${seen ? "" : " locked"}"><canvas width="32" height="32" data-cat="${cat}" data-col="${seen ? col : "#4a4560"}"></canvas>
      <div><b>${seen ? name : "???"}</b><small style="color:${seen ? col : ""}">${sub}</small><small>${seen ? desc : "Elígela alguna vez para verla"}</small></div></div>`;
    const ups = UPGRADES.map(u => cell(A.ups[u.id], u.cat, upColor(u), u.name, `${ROGUE_CONFIG.RARITY[u.rarity].name} · ${ROGUE_CONFIG.CATS[u.cat]}`, u.desc(u.max || 1)));
    const syn = SYNERGIES.map(s => cell(A.syn[s.id], "syn", SYN_COLOR, s.name, "Sinergia: " + s.need.map(([id, l]) => UPGRADE_BY_ID[id].name + (l > 1 ? ` nv ${l}` : "")).join(" + "), s.desc));
    const pacts = PACTS.map(p => cell(A.pacts[p.id], "pact", PACT_COLOR, p.name, "Pacto del altar", `✔ ${p.good} · ✘ ${p.bad}`));
    const n = Object.keys(A.ups).length + Object.keys(A.syn).length + Object.keys(A.pacts).length, total = UPGRADES.length + SYNERGIES.length + PACTS.length;
    this.count.textContent = `${n}/${total}`;
    this.grid.innerHTML = `<h3 class="shop-sec">Mejoras</h3><div class="alb-grid">${ups.join("")}</div><h3 class="shop-sec">Sinergias</h3><div class="alb-grid">${syn.join("")}</div><h3 class="shop-sec">Pactos</h3><div class="alb-grid">${pacts.join("")}</div>`;
    this.grid.querySelectorAll("canvas[data-cat]").forEach(cv => drawUpIcon(cv.getContext("2d"), cv.dataset.cat, cv.dataset.col, 4));
    this.el.classList.remove("hidden");
  }
  close() { this.el.classList.add("hidden"); this.g.showMenu(); }
}
// Flecha de Olfato de nido: señala el siguiente huevo que aún no está en pantalla
function drawEggArrow(c, g) {
  const e = g.eggs.filter(e => !e.taken && e.x > W - 30).sort((a, b) => a.x - b.x)[0]; if (!e) return;
  const p = toScreen(e.lane, W - 40, e.y), y = clamp(p.y, 60, H - 40), k = 0.6 + 0.4 * Math.sin(g.time * 8);
  c.save(); c.translate(W - 26 + Math.sin(g.time * 8) * 3, y); c.globalAlpha = k;
  c.fillStyle = UI_T.line; c.beginPath(); c.moveTo(16, 0); c.lineTo(-8, -14); c.lineTo(-8, 14); c.closePath(); c.fill();
  c.fillStyle = "#fff3c4"; c.beginPath(); c.moveTo(11, 0); c.lineTo(-5, -9); c.lineTo(-5, 9); c.closePath(); c.fill();
  c.restore(); drawEggPixels(c, W - 48, y, 1.2);
}

