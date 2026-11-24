// =====================================================================
//  Roulette: ruleta de monedas del juego (apuesta) + giro gratis diario
//  El tamaño de cada casilla es proporcional a su probabilidad (p / nº de casillas de ese valor).
// =====================================================================
const ROULETTE_COLORS = { 0: "#3a3f55", 0.5: "#4f6fb0", 1.5: "#3aa35a", 2: "#e0a526", 5: "#ff3b5c" };
const FREE_COLORS = ["#4a90d9", "#3aa35a", "#e0a526", "#ff8a3d", "#6a5acd"];
const rouletteEV = () => CONFIG.ROULETTE_ODDS.reduce((a, o) => a + o.p * o.mult, 0);
class Roulette {
  constructor(game) {
    this.game = game; this.returnTo = "menu";
    const $ = id => document.getElementById(id);
    this.el = $("roulette"); this.card = this.el.querySelector(".card");
    this.canvas = $("wheel"); this.ctx = this.canvas.getContext("2d");
    this.walletBox = $("rWalletBox"); this.walletNum = $("rWallet"); this.betEl = $("rBet"); this.msg = $("rMsg");
    this.spinBtn = $("rSpin"); this.freeBtn = $("rFree"); this.freeInfo = $("rFreeInfo"); this.modeLabel = $("rModeLabel");
    this.bet = CONFIG.ROULETTE_MIN_BET; this.rot = 0; this.anim = null; this.wheel = "bet"; this.infoT = 0; this.lossStreak = 0;
    // Rueda de apuesta: se intercalan las casillas para que los valores iguales no queden juntos
    const odds = CONFIG.ROULETTE_ODDS, left = odds.map(o => o.slots || 1), order = [];
    for (let n = left.reduce((a, b) => a + b, 0); n > 0; n--) {
      let best = -1;
      odds.forEach((o, i) => { if (left[i] > 0 && order[order.length - 1] !== o && (best < 0 || left[i] > left[best])) best = i; });
      if (best < 0) best = left.findIndex(x => x > 0);
      order.push(odds[best]); left[best]--;
    }
    this.betSegs = Roulette.layout(order.map(o => ({ value: o.mult, weight: o.p / (o.slots || 1), label: "x" + fmtNum(o.mult), color: ROULETTE_COLORS[o.mult] || "#8a4fd6" })));
    // Rueda del giro gratis: una casilla por premio, con tamaño según su probabilidad (mínimo visible)
    this.freeSegs = Roulette.layout(CONFIG.FREE_SPIN_PRIZES.map((p, i) => ({ value: p.skin ? "skin" : p.coins, weight: Math.max(0.06, p.p),
      label: p.skin ? "SKIN" : String(p.coins), color: p.skin ? "#b05ad8" : FREE_COLORS[i % FREE_COLORS.length] })));
    $("rBack").addEventListener("click", e => { game.sfx.click(); e.currentTarget.blur(); this.close(); });
    this.el.querySelectorAll("[data-bet]").forEach(b => b.addEventListener("click", e => { e.currentTarget.blur(); this.changeBet(b.dataset.bet); }));
    this.spinBtn.addEventListener("click", e => { e.currentTarget.blur(); this.spin(); });
    this.freeBtn.addEventListener("click", e => { e.currentTarget.blur(); this.freeSpin(); });
    $("rTable").innerHTML = odds.map(o => `<span style="color:${ROULETTE_COLORS[o.mult]}">■</span><span>x${fmtNum(o.mult)}: ${Math.round(o.p * 100)} %</span>`).join("");
    $("rNote").textContent = `Solo monedas del juego, nunca dinero real. De media devuelve el ${Math.round(rouletteEV() * 100)} % de lo apostado, pero en ${Math.round((odds.filter(o => o.mult < 1).reduce((a, o) => a + o.p, 0)) * 100)} de cada 100 tiradas pierdes monedas.`;
  }
  static layout(list) {
    const total = list.reduce((a, s) => a + s.weight, 0);
    let a = 0;
    for (const s of list) { const w = s.weight / total * Math.PI * 2; s.a0 = a; s.a1 = a + w; s.narrow = w < 0.5; a += w; }
    return list;
  }
  get segs() { return this.wheel === "bet" ? this.betSegs : this.freeSegs; }
  get visible() { return !this.el.classList.contains("hidden"); }
  get spinning() { return !!this.anim; }
  open(from) {
    this.returnTo = from; this.wheel = "bet"; this.msg.textContent = ""; this.msg.className = "r-msg";
    this.refresh(); this.el.classList.remove("hidden");
  }
  close() {
    if (this.spinning) return;
    this.el.classList.add("hidden");
    if (this.returnTo === "shop") this.game.openShop("back"); else this.game.showMenu();
  }
  maxBet() { return Math.min(CONFIG.ROULETTE_MAX_BET, this.game.save.data.coins); }
  changeBet(kind) {
    if (this.spinning) return;
    const MIN = CONFIG.ROULETTE_MIN_BET, cap = Math.max(MIN, this.maxBet());
    this.game.sfx.click(); this.wheel = "bet";
    if (kind === "reset") this.bet = MIN;
    else if (kind === "max") this.bet = cap;
    else this.bet = Math.min(cap, this.bet + Number(kind));
    this.refresh();
  }
  today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  get dailyAvailable() { return this.game.save.data.lastFreeSpin !== this.today(); }
  // Árbol (Racha de suerte): un giro gratis extra cada semana
  get weeklyAvailable() { const w = this.game.save.data.lastWeeklySpin; return !!this.game.stat("weeklySpin") && (!w || Date.now() - new Date(w).getTime() >= 7 * 864e5); }
  get freeAvailable() { return this.dailyAvailable || this.weeklyAvailable; }
  refresh() {
    const d = this.game.save.data, MIN = CONFIG.ROULETTE_MIN_BET;
    this.bet = clamp(this.bet, MIN, Math.max(MIN, this.maxBet()));
    this.walletNum.textContent = d.coins; this.betEl.textContent = this.bet;
    this.modeLabel.textContent = this.wheel === "bet" ? "APUESTA" : "GIRO GRATIS";
    this.spinBtn.disabled = this.spinning || d.coins < MIN || this.bet > d.coins;
    this.spinBtn.textContent = d.coins < MIN ? `Girar (mín. ${MIN})` : "Girar";
    this.el.querySelectorAll("[data-bet]").forEach(b => { b.disabled = this.spinning; });
    this.freeBtn.disabled = this.spinning || !this.freeAvailable;
    this.updateFreeInfo();
  }
  updateFreeInfo() {
    if (this.dailyAvailable) { this.freeInfo.textContent = "¡Tienes un giro gratis disponible hoy!" + (this.weeklyAvailable ? " (y el semanal de Racha de suerte)" : ""); return; }
    if (this.weeklyAvailable) { this.freeInfo.textContent = "¡Giro gratis semanal de Racha de suerte disponible!"; return; }
    const now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), sec = Math.max(0, Math.floor((next - now) / 1000));
    const hh = String(Math.floor(sec / 3600)).padStart(2, "0"), mm = String(Math.floor(sec / 60) % 60).padStart(2, "0"), ss = String(sec % 60).padStart(2, "0");
    this.freeInfo.textContent = `Próximo giro gratis en ${hh}:${mm}:${ss}`;
  }
  pick(list) {
    let r = Math.random() * list.reduce((a, o) => a + o.p, 0);
    for (const o of list) { r -= o.p; if (r <= 0) return o; }
    return list[list.length - 1];
  }
  spin() {
    const g = this.game, d = g.save.data;
    if (this.spinning) return;
    if (d.coins < CONFIG.ROULETTE_MIN_BET || this.bet > d.coins) { g.sfx.denied(); return; }
    g.sfx.unlock(); d.coins -= this.bet; g.save.save(); this.wheel = "bet";
    const bet = this.bet, o = this.pick(CONFIG.ROULETTE_ODDS);   // el resultado se decide aquí; la animación solo lo muestra
    this.msg.textContent = `Apuestas ${bet}…`; this.msg.className = "r-msg";
    this.startSpin(choice(this.betSegs.filter(s => s.value === o.mult)), () => this.payout(bet, o.mult));
  }
  freeSpin() {
    const g = this.game;
    if (this.spinning || !this.freeAvailable) return;
    if (this.dailyAvailable) g.save.data.lastFreeSpin = this.today(); else g.save.data.lastWeeklySpin = new Date().toISOString();
    g.sfx.unlock(); g.save.save(); this.wheel = "free";
    g.ach.event("freeSpin");
    const prize = this.pick(CONFIG.FREE_SPIN_PRIZES), value = prize.skin ? "skin" : prize.coins;
    this.msg.textContent = "Giro gratis…"; this.msg.className = "r-msg";
    this.startSpin(this.freeSegs.find(s => s.value === value), () => this.award(prize));
  }
  // La rueda se detiene exactamente dentro de la casilla elegida (flecha arriba)
  startSpin(seg, done) {
    const target = seg.a0 + (seg.a1 - seg.a0) * rand(0.2, 0.8), TAU = Math.PI * 2;
    const desired = mod(-Math.PI / 2 - target, TAU), from = this.rot;
    this.anim = { from, to: from + TAU * 5 + mod(desired - from, TAU), t: 0, done, last: this.segIndexAt(from) };
    this.refresh();
  }
  segIndexAt(rot) { const a = mod(-Math.PI / 2 - rot, Math.PI * 2); return this.segs.findIndex(s => a >= s.a0 && a < s.a1); }
  update(dt) {
    if ((this.infoT -= dt) <= 0) { this.infoT = 0.5; if (!this.spinning) this.updateFreeInfo(); }
    const A = this.anim; if (!A) return;
    A.t += dt;
    const k = Math.min(1, A.t / CONFIG.ROULETTE_SPIN_TIME);
    this.rot = A.from + (A.to - A.from) * (1 - Math.pow(1 - k, 3));   // desaceleración suave
    const idx = this.segIndexAt(this.rot);
    if (idx !== A.last) { A.last = idx; this.game.sfx.tick(); }
    if (k >= 1) { this.anim = null; A.done(); this.refresh(); }
  }
  flashWallet() { this.walletBox.classList.remove("flash"); void this.walletBox.offsetWidth; this.walletBox.classList.add("flash"); }
  setMsg(text, cls) { this.msg.textContent = text; this.msg.className = "r-msg " + cls; }
  payout(bet, mult) {
    const g = this.game, win = Math.floor(bet * mult), top = Math.max(...CONFIG.ROULETTE_ODDS.map(o => o.mult));
    g.save.data.coins += win; g.save.save(); this.flashWallet();
    if (mult === 0) { this.setMsg(`Has perdido ${bet} monedas`, "lose"); g.sfx.denied(); }
    else if (mult < 1) { this.setMsg(`x${fmtNum(mult)}: recuperas ${win} de ${bet} monedas`, "lose"); g.sfx.coin(); }
    else if (mult === top) { this.setMsg(`¡JACKPOT x${fmtNum(mult)}! +${win} monedas`, "jackpot"); this.jackpot(); }
    else { this.setMsg(`¡x${fmtNum(mult)}! +${win} monedas`, "win"); g.sfx.buy(); }
    g.ach.event("rouletteSpin", { bet, mult, win, top });
  }
  award(prize) {
    const g = this.game, s = g.save;
    if (prize.skin) {
      const missing = SkinCatalog.shop.filter(k => (k.rarity === "Común" || k.rarity === "Raro") && !s.owns(k.id));
      if (missing.length) {
        const sk = choice(missing); s.give(sk.id);
        this.setMsg(`¡Premio gordo! Nuevo skin: ${sk.name}`, "jackpot"); this.jackpot();
        g.ach.event("purchase", { kind: "gift", skin: sk }); return;
      }
      prize = { coins: 100 };
    }
    s.data.coins += prize.coins; s.save(); this.flashWallet();
    this.setMsg(`Giro gratis: +${prize.coins} monedas`, "win"); g.sfx.buy();
    g.ach.event("coinsEarned", { n: prize.coins });
  }
  jackpot() {
    this.game.sfx.jackpot();
    this.card.classList.remove("shake"); void this.card.offsetWidth; this.card.classList.add("shake");
    for (let i = 0; i < 45; i++) {
      const c = document.createElement("div"); c.className = "coin-rain";
      c.style.left = rand(0, 100) + "vw"; c.style.animationDuration = rand(1.2, 2.4) + "s"; c.style.animationDelay = rand(0, 0.7) + "s";
      document.body.appendChild(c); setTimeout(() => c.remove(), 3400);
    }
  }
  draw() {
    const c = this.ctx, S = this.canvas.width, R = S / 2 - 44, cx = S / 2, cy = S / 2 + 12, rot = this.rot, TAU = Math.PI * 2;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, S, S);
    c.fillStyle = "#0b0c14"; c.beginPath(); c.arc(cx, cy, R + 26, 0, TAU); c.fill();
    c.fillStyle = "#3b4163"; c.beginPath(); c.arc(cx, cy, R + 16, 0, TAU); c.fill();
    for (const s of this.segs) {
      c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, s.a0 + rot, s.a1 + rot); c.closePath();
      c.fillStyle = s.color; c.fill(); c.strokeStyle = "#0b0c14"; c.lineWidth = 5; c.stroke();
      c.save(); c.translate(cx, cy); c.rotate((s.a0 + s.a1) / 2 + rot);
      c.font = `bold ${s.narrow ? 28 : 40}px "Raptor Pixel Display", monospace`; c.textAlign = "right"; c.textBaseline = "middle";
      c.lineWidth = 7; c.strokeStyle = "#0b0c14"; c.strokeText(s.label, R - 18, 0); c.fillStyle = "#ffffff"; c.fillText(s.label, R - 18, 0);
      c.restore();
    }
    const blink = Math.floor(this.game.time * (this.spinning ? 12 : 3));
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU;
      c.fillStyle = (i + blink) % 2 ? "#ffe14d" : "#7a5a10";
      c.beginPath(); c.arc(cx + Math.cos(a) * (R + 16), cy + Math.sin(a) * (R + 16), 7, 0, TAU); c.fill();
    }
    c.fillStyle = "#0b0c14"; c.beginPath(); c.arc(cx, cy, 58, 0, TAU); c.fill();
    c.fillStyle = "#1b1e2e"; c.beginPath(); c.arc(cx, cy, 50, 0, TAU); c.fill();
    c.strokeStyle = "#f7c948"; c.lineWidth = 6; c.stroke();
    c.font = 'bold 26px "Raptor Pixel Display", monospace'; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#f7c948";
    c.fillText(this.wheel === "bet" ? "DINO" : "GRATIS", cx, cy);
    c.beginPath(); c.moveTo(cx - 26, cy - R - 44); c.lineTo(cx + 26, cy - R - 44); c.lineTo(cx, cy - R + 12); c.closePath();
    c.fillStyle = "#ff3b3b"; c.fill(); c.lineWidth = 5; c.strokeStyle = "#0b0c14"; c.stroke();
  }
}

// =====================================================================
//  AchievementManager: recibe eventos del juego, actualiza estadísticas y desbloquea logros.
//  También gestiona la pantalla de logros y las notificaciones en la esquina.
// =====================================================================
const ACH_ICONS = {   // iconos pixel art 8 × 8 por categoría (o = contorno, a = color, b = brillo)
  carrera:   ["..oooo..", ".oaaaao.", "oaabbaao", "oaabbaao", ".oaaaao.", "..oaao..", ".oaaaao.", "oooooooo"],
  jefes:     ["o.o..o.o", "oaoooaao", "oaaaaaao", "oabaabao", "oaaaaaao", "oaaaaaao", ".oaaaao.", "..oooo.."],
  habilidad: ["....ooo.", "...oaao.", "..oaao..", ".oaaaooo", "ooobaao.", "..oaao..", ".oaao...", ".ooo...."],
  coleccion: ["..oooo..", ".oaaaao.", "oaabbaao", "oabaabao", "oabaabao", "oaabbaao", ".oaaaao.", "..oooo.."],
  ruleta:    ["..oooo..", ".oabbao.", "oaaobaao", "obooooao", "oaooooao", "oaabaabo", ".oabaao.", "..oooo.."],
  modos:     [".oo..oo.", "oaaooaao", "oabaaaao", "oaaaaaao", ".oaaaao.", "..oaao..", "...oo...", "........"],
  monturas:  ["........", "....oo..", "...oaao.", "oooaaaao", "oaaaabao", "oaaaaaao", ".oo..oo.", ".oo..oo."],
  roguelike: ["..oooo..", ".oaaaao.", "oaoaaoao", "oaaaaaao", "oaobboao", ".oaaaao.", "..oaao..", "...oo..."],
  arbol:     ["...oo...", "..oaao..", ".oaaaao.", "oaabaaao", ".oaaaao.", "...oo...", "...oo...", "..oooo.."],
  pase:      ["oooooooo", "oaaaaaao", "oabaabao", "oaaaaaao", "oaaaaaao", "oabaabao", "oaaaaaao", "oooooooo"],
  secretos:  ["..oooo..", ".oaaaao.", ".oo..oao", "....oao.", "...oao..", "...oo...", "........", "...oo..."],
};
const ACH_COLORS = { carrera: "#9be07a", jefes: "#ff6b6b", habilidad: "#41b8ff", coleccion: "#ffd23f", ruleta: "#c9a6ff", modos: "#ff9de6", monturas: "#7df9ff", roguelike: "#ffb938", pase: "#ff5ce1", arbol: "#5fd15a", secretos: "#ff8a3d" };
function drawAchIcon(c, cat, sc) {
  const rows = ACH_ICONS[cat], col = ACH_COLORS[cat];
  rows.forEach((r, y) => { for (let x = 0; x < 8; x++) { const ch = r[x]; if (ch === ".") continue;
    c.fillStyle = ch === "o" ? "#1c1b19" : ch === "b" ? "#ffffff" : col; c.fillRect(x * sc, y * sc, sc, sc); } });
}
class AchievementManager {
  constructor(game) {
    this.game = game; this.queue = []; this.toastT = 0; this.filter = "todos"; this.runUnlocked = []; this.resetArm = 0; this.dirty = false; this.saveT = 0;
    const $ = id => document.getElementById(id);
    this.el = $("achievements"); this.grid = $("achGrid"); this.toastBox = $("toasts");
    $("achBack").addEventListener("click", e => { game.sfx.click(); e.currentTarget.blur(); this.close(); });
    this.resetBtn = $("achReset");
    this.resetBtn.addEventListener("click", e => { e.currentTarget.blur(); this.resetClick(); });
    const f = $("achFilters");
    for (const [k, name] of [["todos", "Todos"], ...Object.entries(ACH_CATS)]) {
      const b = document.createElement("button"); b.className = "tab" + (k === this.filter ? " active" : ""); b.dataset.f = k; b.textContent = name;
      b.addEventListener("click", () => { game.sfx.click(); this.filter = k; this.render(); });
      f.appendChild(b);
    }
  }
  get data() { return this.game.save.data.ach; }
  get stats() { return this.data.stats; }
  get unlockedCount() { return ACHIEVEMENTS.filter(a => this.data.unlocked[a.id]).length; }
  get visible() { return !this.el.classList.contains("hidden"); }
  has(id) { return !!this.data.unlocked[id]; }
  stat(k) { return this.stats[k] || 0; }
  add(k, n = 1) { this.stats[k] = this.stat(k) + n; this.dirty = true; this.checkStat(k); }
  max(k, v) { if (v > this.stat(k)) { this.stats[k] = v; this.dirty = true; this.checkStat(k); } }
  checkStat(k) { for (const a of ACHIEVEMENTS) if (a.stat === k && this.stat(k) >= a.goal) this.unlock(a.id); }
  // Evento central: todo el juego informa aquí de lo que pasa
  event(type, d = {}) {
    if (this.game.versus) return;                       // en multijugador no se consiguen logros
    if (this.game.tutorial) { this.game.tutorial.onEvent(type, d); return; }   // el tutorial escucha los eventos (sin logros ni estadísticas)
    if (this.game.statsMgr) this.game.statsMgr.event(type, d);   // las estadísticas usan los mismos eventos
    if (DEBUG) return;                                  // con el modo prueba no se consiguen logros
    const g = this.game, easy = g.mode.id === "easy", hard = g.mode.id === "hard", normal = !easy, run = g.run;   // los logros «solo Normal» también valen en Difícil
    switch (type) {
      case "runStart":
        this.runUnlocked = []; this.add("games");
        break;
      case "jump": this.add("jumps"); break;
      case "roarKill": this.add("roarKills"); break;
      case "levelReached":
        this.max("bestBiomes", run.biomes.size);
        if (d.level > BIOMES.length) this.unlock("vuelta-al-mundo");
        if (d.secret) this.unlock("camino-perfecto");
        if (easy && d.level >= 2) this.unlock("aprendiz");
        if (normal && d.level >= 4) this.unlock("sin-red");
        if (hard && d.level >= 4) this.unlock("sin-piedad");
        if (d.level >= 5 && g.build.pacts.length >= 2) this.unlock("alma-vendida");
        break;
      case "score": {
        const s = d.score;
        this.max("bestScore", s);
        if (normal) this.max("bestScoreNormal", s);
        this.max("bestNoPowerups", s - run.lastPowerup);
        this.max("bestNoRoar", s - run.lastRoar);
        this.max("bestNoLane", s - run.lastLane);
        break;
      }
      case "powerup": this.max("bestPowerupTypes", run.powerupTypes.size); break;
      case "coinCollected": this.max("bestRunCoins", g.runCoinsInt); break;
      case "eggCollected": {
        this.add("eggs"); this.max("bestRunCoins", g.runCoinsInt);
        if (g.eggsInLevel(d.level) >= CONFIG.EGGS_PER_LEVEL) this.unlock("nivel-perfecto");
        let all = true; for (let l = 1; l <= 6; l++) if (g.eggsInLevel(l) < CONFIG.EGGS_PER_LEVEL) all = false;
        if (all) this.unlock("nido-completo");
        break;
      }
      case "bossDefeated": {
        this.add("bossesTotal");
        this.max("bossTypes", new Set(g.save.data.bossesDefeated.filter(x => BOSS_IDS.includes(x))).size);
        if (d.flawless) this.unlock("sin-rasguno");
        if (d.id === "nave") this.unlock("apagon");
        if (d.id === "rex") this.unlock("rex-prismatico");
        if (hard) this.unlock("pesadilla");
        if (normal && [...g.bosses.defeatedRun].filter(x => x !== "rex").length >= BOSS_COUNT) this.unlock("tirano");
        this.max("bestRunCoins", g.runCoinsInt);
        break;
      }
      case "purchase": {
        const s = g.save;
        if (d.kind === "skin") {
          this.add("skinsBought");
          if (d.skin.rarity === "Legendario") this.unlock("legendario");
        }
        if (d.skin && d.skin.id === "emperador-solar") this.unlock("majestad");
        if (d.kind === "checkpoint") this.unlock("atajo");
        this.max("shopSkins", SkinCatalog.shop.filter(k => s.owns(k.id)).length);
        this.wallet();
        break;
      }
      case "designSaved": this.unlock("disenador"); break;
      case "coinsEarned": this.add("coinsEarned", d.n); this.wallet(); break;
      case "rouletteSpin":
        this.unlock("primera-apuesta");
        if (d.mult === d.top) this.unlock("jackpot");
        this.lossStreak = d.mult < 1 ? (this.lossStreak || 0) + 1 : 0;
        this.max("bestLossStreak", this.lossStreak);
        if (d.bet >= CONFIG.ROULETTE_MAX_BET && d.mult > 1) this.unlock("todo-o-nada");
        if (d.win > 0) this.add("coinsEarned", d.win);
        this.wallet();
        break;
      case "freeSpin": this.add("freeSpinDays"); break;
      case "manualSection": {
        const seen = new Set(this.stats.manualSeen || []); seen.add(d.index);
        this.stats.manualSeen = [...seen]; this.max("manualSections", seen.size);
        break;
      }
      case "closeCall": this.unlock("por-los-pelos"); break;
      case "mountUsed": {
        const used = new Set(this.stats.mountsUsed || []); used.add(d.id);
        this.stats.mountsUsed = [...used]; this.max("mountTypes", used.size);
        break;
      }
      case "mountEnd": this.add("mountsClean"); break;
      case "meteorPerfectJump": this.add("meteorPerfect"); break;
      case "boardTrick": this.add("boardTricks"); break;
      case "treeBuy": this.unlock("primera-raiz"); if (d.complete >= 1) this.unlock("rama-completa"); if (d.all) this.unlock("arbol-milenario"); break;
      case "upgradePicked":
        this.add("upgradesPicked"); this.max("upgradeTypes", d.distinct);
        if (d.legends >= 3) this.unlock("leyenda-viviente");
        break;
      case "upgradeSkipped": if (d.picks === 0 && g.build.bossesBeaten >= 3) this.unlock("asceta"); break;
      case "synergy": this.add("synergies"); this.max("synergyTypes", Object.keys(g.save.data.album.syn).length); break;
      case "pact": this.add("pacts"); if (g.level.level >= 5 && g.build.pacts.length >= 2) this.unlock("alma-vendida"); break;
      case "wallet": this.wallet(); break;
    }
  }
  wallet() { this.max("maxWallet", this.game.save.data.coins); }
  unlock(id) {
    if (DEBUG || this.has(id)) return;
    const a = ACHIEVEMENTS.find(x => x.id === id); if (!a) return;
    const s = this.game.save;
    this.data.unlocked[id] = new Date().toISOString();
    s.data.coins += a.reward;
    if (a.skin) s.give(a.skin);
    this.runUnlocked.push(a); this.queue.push(a); this.dirty = true;
    s.save();
    if (id !== "raptor-completo" && ACHIEVEMENTS.every(x => x.id === "raptor-completo" || this.has(x.id))) this.unlock("raptor-completo");
    this.max("maxWallet", s.data.coins);
    if (this.visible) this.render();
  }
  // Notificaciones en cola (esquina superior derecha, sin pausar el juego)
  update(dt) {
    if ((this.saveT += dt) > 2 && this.dirty) { this.saveT = 0; this.dirty = false; this.game.save.save(); }
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.toastBox.innerHTML = ""; return; }
    const a = this.queue.shift(); if (!a) return;
    this.toastT = 2.8;
    this.toastBox.innerHTML = `<div class="ach-toast"><canvas width="24" height="24"></canvas><div><small>${a.title || "¡Logro desbloqueado!"}</small><b>${a.name}</b><span>${a.line || `+${a.reward} monedas${a.skin ? " · skin exclusivo" : ""}`}</span></div></div>`;
    drawAchIcon(this.toastBox.querySelector("canvas").getContext("2d"), a.cat, 3);
    this.game.sfx.perfect();
  }
  open(from) { this.returnTo = from; this.resetArm = 0; this.render(); this.el.classList.remove("hidden"); }
  close() { this.el.classList.add("hidden"); this.game.showMenu(); }
  resetClick() {
    const g = this.game;
    this.resetArm++;
    if (this.resetArm === 1) { this.resetBtn.textContent = "¿Seguro? Se borrarán todos los logros"; g.sfx.denied(); return; }
    if (this.resetArm === 2) { this.resetBtn.textContent = "Última confirmación: pulsa otra vez"; g.sfx.denied(); return; }
    // Reinicio: logros, estadísticas y skins exclusivos (las monedas no se tocan)
    const s = g.save;
    s.data.ach = { unlocked: {}, stats: {} };
    s.data.owned = s.data.owned.filter(id => !EXCLUSIVE_SKINS.some(k => k.id === id));
    if (!s.owns(s.data.equipped)) { s.data.equipped = CONFIG.DEFAULT_SKIN; g.onSkinChanged(); }
    s.save(); this.resetArm = 0; g.sfx.shieldBreak(); this.render();
  }
  progress(a) {
    if (this.has(a.id)) return a.goal ? [a.goal, a.goal] : [1, 1];
    if (!a.goal) return [0, 1];
    return [Math.min(a.goal, this.stat(a.stat)), a.goal];
  }
  render() {
    const n = this.unlockedCount, total = ACHIEVEMENTS.length;
    document.getElementById("achCount").textContent = `Logros: ${n}/${total} (${Math.round(n / total * 100)} %)`;
    this.resetBtn.textContent = "Reiniciar progreso";
    document.querySelectorAll("#achFilters .tab").forEach(b => b.classList.toggle("active", b.dataset.f === this.filter));
    this.grid.innerHTML = "";
    for (const a of ACHIEVEMENTS) {
      if (this.filter !== "todos" && a.cat !== this.filter) continue;
      const got = this.has(a.id), hidden = a.secret && !got, [v, goal] = this.progress(a);
      const card = document.createElement("div"); card.className = "ach" + (got ? " got" : " locked");
      const date = got ? new Date(this.data.unlocked[a.id]).toLocaleDateString("es-ES") : "";
      const skin = a.skin && SkinCatalog.get(a.skin);
      card.innerHTML = `<canvas width="32" height="32"></canvas><div class="ach-body">
        <b>${hidden ? "???" : a.name}</b><small>${hidden ? "Logro secreto" : a.desc}${a.normalOnly ? " · <i>solo Normal o Difícil</i>" : ""}</small>
        <div class="ach-meta"><span class="coin"></span> ${a.reward}${skin ? ` + skin «${skin.name}»` : ""} ${got ? `<span class="ach-date">✔ ${date}</span>` : ""}</div>
        ${a.goal && !hidden ? `<div class="bar"><i style="width:${v / goal * 100}%"></i></div><small>${v}/${goal}</small>` : ""}</div>`;
      drawAchIcon(card.querySelector("canvas").getContext("2d"), hidden ? "secretos" : a.cat, 4);
      this.grid.appendChild(card);
    }
  }
}

