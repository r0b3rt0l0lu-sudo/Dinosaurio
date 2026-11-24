// =====================================================================
//  UI: marcador en el canvas y pantallas HTML (menú, jugar, pausa, game over)
// =====================================================================
// Colores de la interfaz (tokens de la propuesta de Claude Design)
const UI_T = { line: "#0e0b16", panel: "rgba(35,27,56,0.88)", pill: "rgba(16,12,26,0.78)", bevel: "#574a82", text: "#fbf3e4", dim: "#b3a7cc",
  go: "#5fd15a", gold: "#ffb938", info: "#5fb4ff", roar: "#ff9a3c", danger: "#ff3b3b", weak: "#ffd23f" };
const fmtNum = n => I18N.lang === "es" ? String(n).replace(".", ",") : String(n);   // decimales: 1,5 en español · 1.5 en inglés
const HEART = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
function drawHeart(c, x, y, full) {
  HEART.forEach((row, r) => { for (let i = 0; i < row.length; i++) if (row[i] === "X") {
    c.fillStyle = "#15161c"; c.fillRect(x + i * 3 - 1, y + r * 3 - 1, 5, 5);
  } });
  HEART.forEach((row, r) => { for (let i = 0; i < row.length; i++) if (row[i] === "X") {
    c.fillStyle = full ? (r === 1 && i === 1 ? "#ffb3b3" : "#ff3b5c") : "#4a4d55"; c.fillRect(x + i * 3, y + r * 3, 3, 3);
  } });
}
class UI {
  constructor(game) {
    this.game = game;
    const $ = id => document.getElementById(id);
    this.$ = $; this.menu = $("menu"); this.over = $("over"); this.play = $("play"); this.pause = $("pause");
    const bind = (id, fn) => $(id).addEventListener("click", e => { game.sfx.unlock(); game.sfx.click(); e.currentTarget.blur(); fn(); });
    bind("btnPlay", () => game.openPlay());
    bind("btnShop", () => game.openShop("menu"));
    bind("btnRoulette", () => game.openRoulette("menu"));
    bind("btnAch", () => game.openAchievements("menu"));
    bind("btnAlbum", () => game.openAlbum());
    bind("btnBackup", () => game.openBackup());
    bind("btnStats", () => game.openStats());
    bind("btnTree", () => game.openTree());
    bind("btnSeason", () => game.openSeason());
    bind("btnDaily", () => game.startDaily());
    bind("btnDailyRank", () => { game.ranking.mode = "daily"; game.openRanking(); });
    bind("btnRanking", () => game.openRanking());
    bind("btnOverRank", () => { game.ranking.mode = g_rankMode(game); game.openRanking(); });
    bind("btnCode", () => { const b = $("codeBox"); b.classList.toggle("hidden"); $("codeMsg").textContent = ""; if (!b.classList.contains("hidden")) $("codeInput").focus(); });
    bind("codeOk", () => this.redeem());
    $("codeInput").addEventListener("keydown", e => { if (e.key === "Enter") this.redeem(); });
    bind("btnAllUps", () => { const s = game.save.data; s.allUpgrades = !s.allUpgrades; game.save.save(); this.updateCode(); });
    bind("btnTutorial", () => game.startTutorial());
    bind("btnTips", () => { game.tips.toggle(); this.updateTips(); });
    bind("btnTipsReset", () => { game.tips.resetSeen(); this.$("btnTipsReset").querySelector("b").textContent = "✔ Consejos reiniciados"; });
    this.menu.querySelectorAll("[data-sub]").forEach(b => b.addEventListener("click", e => { game.sfx.unlock(); game.sfx.click(); e.currentTarget.blur(); this.menuPanel(b.dataset.sub); }));
    this.menu.querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", e => { e.currentTarget.blur(); this.menuBack(); }));
    bind("bkRemind", () => game.openBackup());
    this.menuBg = $("menuBg");
    bind("btnHistory", () => game.openHistory("over"));
    bind("btnMenuHistory", () => game.openHistory("menu"));
    bind("btnManual", () => game.openManual("menu"));
    bind("btnControls", () => game.openControls());
    $("helpCtrl").addEventListener("click", e => { e.preventDefault(); e.currentTarget.blur(); if (game.state === "over" && game.netRace) return; game.sfx.click(); game.openControls(); });
    bind("btnMute", () => game.toggleMute());
    bind("btnLang", () => game.setLang(I18N.lang === "es" ? "en" : "es"));
    bind("btnVibrate", () => { const d = game.save.data; d.vibrate = !d.vibrate; game.save.save(); this.updateMute(); if (d.vibrate) game.vibrate(40); });
    bind("btnRetry", () => game.retryWithAd());
    bind("btnAdDouble", () => game.adDoubleCoins());
    bind("btnVersus", () => game.openPlay(true));
    bind("btnOnline", () => game.openNet());
    bind("btnOverShop", () => game.openShop("over"));
    bind("btnMenu", () => game.showMenu());
    bind("btnGo", () => this.versusSel ? game.startVersus(this.selMode) : game.start(this.selMode, this.selLevel));
    bind("playBack", () => game.showMenu());
    bind("btnResume", () => game.setPaused(false));
    bind("btnPauseManual", () => game.openManual("pause"));
    bind("btnPauseCtrl", () => game.openControls("pause"));
    bind("btnPauseMenu", () => game.showMenu());
    this.play.querySelectorAll(".mode").forEach(b => b.addEventListener("click", () => { game.sfx.click(); this.selMode = b.dataset.mode; this.showPlay(true); }));
    const E = CONFIG.EASY;
    $("descNormal").textContent = `El reto completo: 1 vida, bosses con toda su vida y monedas ×1. Récord propio.`;
    $("descEasy").textContent = `${E.LIVES} vidas, ${Math.round((1 - E.START_SPEED_MULT) * 100)} % más lento, bosses con ${Math.round(E.BOSS_HP_MULT * 100)} % de vida. Monedas y huevos ×${fmtNum(E.COIN_VALUE)}.`;
    const H = CONFIG.HARD;
    $("descHard").textContent = `Para expertos: ${Math.round((H.START_SPEED_MULT - 1) * 100)} % más rápido, menos power-ups, rugido de ${H.ROAR_COOLDOWN} s y bosses con ${Math.round(H.BOSS_HP_MULT * 100)} % de vida. Monedas y huevos ×${fmtNum(H.COIN_VALUE)}.`;
    $("descRandom").textContent = `Dificultad Normal, pero cada nivel trae una regla sorpresa (${RANDOM_MODS.length} posibles): gravedad lunar, niebla, carriles cruzados, lluvia de oro… Récord propio.`;
    this.descN = $("descNormal").textContent; this.descE = $("descEasy").textContent; this.descH = $("descHard").textContent;
    this.selMode = game.mode.id; this.selLevel = 1;
    this.updateMute();
  }
  // Código secreto: desbloquea todas las mejoras (árbol completo, álbum completo y todas las mejoras en cada partida)
  redeem() {
    const g = this.game, inp = this.$("codeInput"), msg = this.$("codeMsg"), code = inp.value.trim();
    if (code === SECRET_CODE) {
      unlockAllUpgrades(g); inp.value = ""; g.sfx.jackpot(); g.flashT = 0.4;
      msg.className = "bk-msg ok"; msg.textContent = "¡Código correcto! Todo desbloqueado: skins, editor, checkpoints, pase, logros, árbol, álbum, nivel secreto y todas las mejoras en cada partida.";
      if (g.shop.refresh) g.shop.refresh(); g.ach.wallet();
    } else { g.sfx.denied(); msg.className = "bk-msg err"; msg.textContent = code ? "Código incorrecto." : "Escribe un código."; }
    this.updateCode(); this.showMenuInfo && this.showMenuInfo();
  }
  updateCode() {
    const s = this.game.save.data, b = this.$("btnAllUps");
    b.classList.toggle("hidden", !s.codeUsed); b.querySelector("b").textContent = s.allUpgrades ? "Todas las mejoras: SÍ" : "Todas las mejoras: NO";
  }
  updateTips() { const off = this.game.save.data.tips.off; this.$("btnTips").querySelector("b").textContent = off ? "Consejos: NO" : "Consejos: SÍ"; this.$("btnTipsReset").querySelector("b").textContent = "Volver a ver los consejos"; }
  updateMute() {
    const m = this.game.sfx.muted, v = this.game.save.data.vibrate;
    this.$("btnMute").querySelector("b").textContent = m ? "Sonido: NO" : "Sonido: SÍ"; this.$("btnMute").querySelector("i").textContent = m ? "🔇" : "🔊";
    this.$("btnVibrate").querySelector("b").textContent = v ? "Vibración: SÍ" : "Vibración: NO";
    this.$("btnLang").querySelector("b").textContent = "Idioma: " + I18N.LANGS[I18N.lang].name;
  }
  // Submenús de la portada
  menuPanel(id = "mmMain") {
    if (id === "mmDaily") this.$("dailyBox").innerHTML = this.game.dailyRace.panelHtml();   // carrera diaria: regla, marcas e historial
    for (const p of this.menu.querySelectorAll(".mm-panel")) p.classList.toggle("hidden", p.id !== id);
    this.menuSub = id === "mmMain" ? null : id; this.menu.classList.toggle("sub-open", !!this.menuSub);
    const first = this.menu.querySelector(`#${id} .mm-btn, #${id} .mm-tile`); if (first && this.game.state === "menu" && id !== "mmMain") first.focus({ preventScroll: true });
  }
  menuBack() { if (this.menuSub) { this.game.sfx.click(); this.menuPanel(); } }
  menuFocus(d) {   // flechas: moverse entre los botones visibles
    const list = [...this.menu.querySelectorAll(".mm-panel:not(.hidden) button")], i = list.indexOf(document.activeElement);
    const n = list[(i < 0 ? (d > 0 ? -1 : 0) : i) + d < 0 ? list.length - 1 : ((i < 0 ? (d > 0 ? -1 : 0) : i) + d) % list.length];
    if (n) n.focus();
  }
  showMenu(keepSub = false) {
    const g = this.game, s = g.save.data, sk = SkinCatalog.get(g.skinId);
    this.$("menuHiN").textContent = s.records.normal; this.$("menuHiE").textContent = s.records.easy; this.$("menuHiH").textContent = s.records.hard; this.$("menuHiR").textContent = s.records.random;
    this.$("menuCoins").textContent = s.coins; this.$("menuEggs").textContent = s.eggWallet; this.$("menuSkin").textContent = sk ? sk.name : "—";
    this.$("menuAch").textContent = `${g.ach.unlockedCount}/${ACHIEVEMENTS.length} conseguidos`;
    this.$("menuBest").textContent = fmtInt(Math.max(s.records.normal, s.records.easy, s.records.hard, s.records.random));
    const al = s.album, nAl = Object.keys(al.ups).length + Object.keys(al.syn).length + Object.keys(al.pacts).length;
    this.$("menuAlbum").textContent = `${nAl}/${UPGRADES.length + SYNERGIES.length + PACTS.length} descubiertas`;
    // Avisos (puntos) en los submenús: giro gratis, nodo del árbol que puedes comprar, copia pendiente
    const spin = g.roulette.freeAvailable, tree = TREE_NODES.some(n => { const c = g.tree.cost(n); return c != null && g.tree.reachable(n) && s.fossils >= c; }), bk = g.backup.needsReminder();
    this.$("menuSpin").textContent = spin ? "¡Giro gratis disponible!" : "Apuesta monedas del juego";
    this.$("menuTree").textContent = tree ? "¡Puedes comprar un nodo!" : `${s.fossils} fósiles`;
    for (const [id, on] of [["dotSpin", spin], ["dotShop", spin], ["dotTree", tree], ["dotProg", tree], ["dotBackup", bk]]) this.$(id).classList.toggle("hidden", !on);
    const dr = g.dailyRace; this.$("menuDaily").textContent = dr.rewardPending ? `${dr.rule.icon} ¡Premio esperando!` : `Mejor hoy ${fmtInt(dr.d.best)} · 🔥${dr.streak}`;
    this.$("dotDaily").classList.toggle("hidden", !dr.rewardPending);
    const sd = g.season.d; this.$("menuSeason").textContent = `Nivel ${sd.tier}/${SEASON_CONFIG.TIERS}`; this.$("dotSeason").classList.toggle("hidden", sd.seen >= sd.tier);
    this.updateCode(); this.$("codeBox").classList.add("hidden");
    paintFossils(this.menu); this.menuPanel(keepSub && this.menuSub ? this.menuSub : "mmMain");
    this.$("menuFossils").textContent = s.fossils; this.updateTips();
    this.$("debugHint").classList.toggle("hidden", !DEBUG);
    this.$("bkRemind").classList.toggle("hidden", !g.backup.needsReminder());
    this.hideAll(); this.menu.classList.remove("hidden");
  }
  // Pantalla "Jugar": modo + nivel inicial (checkpoints comprados)
  showPlay(keep, versus = this.versusSel) {
    const g = this.game;
    this.versusSel = !!versus;   // la misma pantalla sirve para elegir la dificultad del multijugador
    if (!keep) { this.selMode = versus ? (this.vsMode || "normal") : (MODES[g.save.data.lastMode] ? g.save.data.lastMode : "normal"); this.selLevel = 1; }
    if (versus) this.vsMode = this.selMode;
    this.$("playTitle").textContent = versus ? "Multijugador · elige dificultad" : "Elige modo";
    this.$("vsHint").classList.toggle("hidden", !versus);
    this.$("startBox").classList.toggle("hidden", !!versus);
    if (versus && this.selMode === "random") this.selMode = "normal";
    this.play.querySelector(".mode.random").classList.toggle("hidden", !!versus);   // el multijugador no tiene modo Aleatorio
    this.play.querySelectorAll(".mode").forEach(b => b.classList.toggle("sel", b.dataset.mode === this.selMode));
    const box = this.$("startLevels"), levels = g.checkpoints.startLevels();
    box.innerHTML = "";
    for (const l of levels) {
      const b = document.createElement("button");
      b.className = "lvl" + (l === this.selLevel ? " sel" : "");
      b.innerHTML = `Nivel ${l}<small>${biomeOfLevel(l).name} · ${(l - 1) * CONFIG.POINTS_PER_LEVEL} pts</small>`;
      b.addEventListener("click", () => { g.sfx.click(); this.selLevel = l; this.showPlay(true); });
      box.appendChild(b);
    }
    this.$("noCheckpoints").classList.toggle("hidden", levels.length > 1 || !!versus);
    this.$("descNormal").textContent = versus ? "1 vida cada uno, velocidad normal. Monedas ×1." : this.descN;
    this.$("descEasy").textContent = versus ? `${CONFIG.EASY.LIVES} vidas cada uno, ${Math.round((1 - CONFIG.EASY.START_SPEED_MULT) * 100)} % más lento y obstáculos más separados. Monedas ×${fmtNum(CONFIG.EASY.COIN_VALUE)}.` : this.descE;
    this.$("descHard").textContent = versus ? `1 vida cada uno, ${Math.round((CONFIG.HARD.START_SPEED_MULT - 1) * 100)} % más rápido, obstáculos más juntos y rugido de ${CONFIG.HARD.ROAR_COOLDOWN} s. Monedas ×${fmtNum(CONFIG.HARD.COIN_VALUE)}.` : this.descH;
    this.hideAll(); this.play.classList.remove("hidden");
  }
  showPause() {
    const g = this.game, box = this.$("pauseBuild");
    box.classList.toggle("hidden", g.versus);
    const L = g.level; this.$("pauseInfo").textContent = `${g.daily ? "Carrera diaria" : g.versus ? "Multijugador" : g.mode.name} · Nivel ${L.level} · ${L.biome.name} · ${fmtInt(g.versus ? g.distScore : g.score)} puntos`;
    if (!g.versus) { box.innerHTML = `<h3>Tu build</h3><div class="build-list">${buildIconsHtml(g.build, true)}</div>`; paintBuildIcons(box); }
    this.hideAll(); this.pause.classList.remove("hidden");
  }
  showOver() {
    const g = this.game, s = g.save.data;
    // Anuncio opcional de ×2 monedas: solo si hay anuncios (con bloqueador o sin SDK no aparece) y has ganado monedas
    const adOk = platform.adsEnabled && !g.netRace && !g.versus && !g.tutorial && g.runCoinsInt > 0 && !g.adDoubled;
    this.$("btnAdDouble").classList.toggle("hidden", !adOk); if (adOk) this.$("btnAdDouble").textContent = `🎬 ×2 monedas (+${g.runCoinsInt})`;
    this.$("adMsg").classList.add("hidden");
    this.$("overSolo").classList.toggle("hidden", g.versus); this.$("overVs").classList.toggle("hidden", !g.versus);
    this.$("overAchList").classList.toggle("hidden", g.versus);
    this.$("overBuild").classList.toggle("hidden", g.versus); this.$("overFossils").classList.toggle("hidden", g.versus); this.$("overSeason").classList.toggle("hidden", g.versus); this.$("btnHistory").classList.toggle("hidden", g.versus);
    if (g.versus) {   // resultado del multijugador
      const [a, b] = [g.player, g.p2], win = a.score === b.score ? 0 : a.score > b.score ? 1 : 2;
      this.$("overTitle").textContent = win ? `¡GANA EL JUGADOR ${win}!` : "¡EMPATE!";
      this.$("overTitle").style.color = win === 1 ? UI_T.go : win === 2 ? UI_T.info : UI_T.weak;
      this.$("overModeLbl").textContent = `MULTIJUGADOR · ${g.mode.name.toUpperCase()} · NIVEL ${g.level.level} · ${g.level.biome.name.toUpperCase()}`;
      const card = (p, keys) => `<div class="${p.num === win ? "win" : ""}"><small>JUGADOR ${p.num} · ${keys}</small><b>${p.score}</b><small>PUNTOS · <span class="coin"></span> ${Math.floor(p.coins + 1e-6)}</small><span>${SkinCatalog.get(p.skinId) ? SkinCatalog.get(p.skinId).name : ""}</span></div>`;
      this.$("overVs").innerHTML = card(a, "WASD") + card(b, "FLECHAS") + `<p class="touch-hint">Las monedas de los dos (${g.runCoinsInt}) van a tu monedero: ahora tienes <span class="coin"></span> ${s.coins}.</p>`;
      this.hideAll(); this.over.classList.remove("hidden"); return;
    }
    this.$("overTitle").textContent = "GAME OVER"; this.$("overTitle").style.color = "";
    const D = g.daily ? g.dailyResult : null, rec = D ? g.dailyRace.d.best : s.records[g.mode.id];
    this.countUp(this.$("overScore"), g.score, g.newRecord || (D && D.best && !D.first));
    this.$("overCause").textContent = g.deathCause ? `💀 Te eliminó: ${g.deathCause}` : "";
    const F = g.runFossils, of = this.$("overFossils");
    of.innerHTML = F && F.total ? `${fossilHtml()} +${F.total} fósiles <small>(${F.lines.map(([t, n]) => `${I18N.t(t)} ${n >= 0 ? "+" : ""}${n}`).join(" · ")})</small>` : `${fossilHtml()} Sin fósiles esta vez <small>(completa niveles y derrota jefes)</small>`;
    paintFossils(of);
    // Pase de temporada: la barra se llena desde donde estaba antes de la partida
    const sp = this.$("overSeason"), sd = g.season.d, max = sd.tier >= SEASON_CONFIG.TIERS, ups = (g.runSeason || []).length;
    const to = max ? 100 : Math.round(sd.xp / g.season.need() * 100), from = ups || !g.seasonBefore ? 0 : Math.round(g.seasonBefore.frac * 100);
    const O = g.online, rk = !BUILD.online ? "" : O.nick ? (g.save.data.allUpgrades ? "🌍 Con «Todas las mejoras» no cuenta para el ranking" : `🌍 Enviado al ranking mundial como <b>${escapeHtml(O.nick)}</b>`) : "🌍 Elige un apodo en el ranking para competir con todo el mundo";
    sp.innerHTML = `<div class="os-head"><span>🎟️ Pase · nivel <b>${sd.tier}</b>/${SEASON_CONFIG.TIERS}</span><span class="os-xp">+${g.runXP || 0} XP</span></div><div class="bar ss-bar"><i style="width:${from}%"></i></div>${ups ? `<p class="os-up">¡SUBES DE NIVEL! ${g.runSeason.map(x => x.txt).join(" · ")}</p>` : ""}${rk ? `<p class="os-rank">${rk}</p>` : ""}`;
    const bar = sp.querySelector("i"); requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = to + "%"; }));
    // Carrera diaria
    const od = this.$("overDaily"); od.classList.toggle("hidden", !D);
    if (D) od.innerHTML = `<b>📅 Carrera diaria · ${g.randomMod ? g.randomMod.icon + " " + g.randomMod.name : ""}</b><span>Mejor hoy: <b>${fmtInt(g.dailyRace.d.best)}</b> · Intento ${g.dailyRace.d.attempts} · Racha ${g.dailyRace.streak} 🔥</span>${D.reward ? `<span class="od-reward">🎁 Premio del día: <span class="coin"></span> +${D.reward.coins} y +${D.reward.xp} XP</span>` : ""}`;
    const ob = this.$("overBuild"); ob.innerHTML = `<h3>Build final</h3><div class="build-row">${buildIconsHtml(g.build)}</div>`; paintBuildIcons(ob); this.$("overLevel").textContent = g.level.level;
    this.$("overCoins").textContent = g.runCoinsInt; this.$("overWallet").textContent = s.coins; this.$("overHi").textContent = rec;
    const isRec = D ? D.best && !D.first : g.newRecord;
    this.$("overRecord").textContent = D ? "¡MEJOR MARCA DEL DÍA!" : "¡NUEVO RÉCORD!";
    this.$("overRecord").classList.toggle("hidden", !isRec);
    this.$("overToBeat").textContent = isRec ? "" : D && D.first ? "Primera marca del día: ¡ahora intenta superarla!" : rec > g.score ? `A ${fmtInt(rec - g.score)} puntos de ${D ? "tu mejor marca de hoy" : "tu récord"}` : "";
    this.$("overBosses").textContent = g.runBosses; this.$("overEggs").textContent = g.runEggs;
    this.$("overModeLbl").textContent = D ? `CARRERA DIARIA · ${fmtDay(g.dailyRace.today).toUpperCase()}` : g.mode.label;
    const list = g.ach.runUnlocked;
    this.$("overAch").textContent = list.length;
    this.$("overAchList").innerHTML = list.length ? "🏆 " + list.map(a => a.name).join(" · ") : "";
    this.hideAll(); this.over.classList.remove("hidden");
  }
  // Marcador que sube de 0 a la puntuación final
  countUp(el, n, pop) {
    const t0 = performance.now(), dur = clamp(n / 4, 400, 1100); el.classList.remove("pop");
    const step = now => { const k = Math.min(1, (now - t0) / dur); el.textContent = fmtInt(Math.round(n * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); else if (pop) el.classList.add("pop"); };
    requestAnimationFrame(step);
  }
  hideAll() { for (const el of [this.menu, this.over, this.play, this.pause]) el.classList.add("hidden"); }

  // ----- Canvas (estilo «Expedición arcade»: paneles oscuros, borde de 2 px, sombra dura) -----
  text(c, str, x, y, size, color = "#fbf3e4", align = "left") {
    c.font = `${Math.round(size)}px "Raptor Pixel Display", monospace`; c.textAlign = align; c.textBaseline = "middle";
    const o = Math.max(1, Math.round(size / 8));
    c.lineJoin = "miter"; c.lineWidth = Math.max(2, size / 5); c.strokeStyle = UI_T.line;
    c.strokeText(str, x, y); c.fillStyle = UI_T.line; c.fillText(str, x + o, y + o);
    c.fillStyle = color; c.fillText(str, x, y);
  }
  // Panel biselado: fondo, borde de 2 px, brillo arriba y sombra dura de 4 px
  panel(c, x, y, w, h, bg = UI_T.panel) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    c.fillStyle = "rgba(14,11,22,0.55)"; c.fillRect(x + 4, y + 4, w, h);
    c.fillStyle = UI_T.line; c.fillRect(x - 2, y - 2, w + 4, h + 4);
    if (bg === UI_T.panel) {   // degradado vertical con brillo arriba (v19)
      const k = x + "," + y + "," + h; this.grads = this.grads || {};
      let g = this.grads[k]; if (!g) { g = this.grads[k] = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "rgba(58,45,92,0.94)"); g.addColorStop(1, "rgba(24,18,40,0.92)"); }
      c.fillStyle = g;
    } else c.fillStyle = bg;
    c.fillRect(x, y, w, h);
    c.fillStyle = UI_T.bevel; c.fillRect(x, y, w, 2);
    c.fillStyle = "rgba(255,255,255,0.06)"; c.fillRect(x, y + 2, w, 2);
    c.fillStyle = "rgba(255,185,56,0.85)"; c.fillRect(x, y, 6, 2); c.fillRect(x, y, 2, 6); c.fillRect(x + w - 6, y + h - 2, 6, 2); c.fillRect(x + w - 2, y + h - 6, 2, 6);   // esquinas doradas
  }
  // Píldora con texto (avisos del HUD)
  pill(c, str, cx, cy, size, fg, bg = UI_T.pill) {
    c.font = `${Math.round(size)}px "Raptor Pixel Display", monospace`;
    const w = Math.ceil(c.measureText(str).width) + 24, h = size + 12;
    c.fillStyle = UI_T.line; c.fillRect(Math.round(cx - w / 2) - 2, Math.round(cy - h / 2) - 2, w + 4, h + 4);
    c.fillStyle = bg; c.fillRect(Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = fg; c.fillText(str, cx, cy + 1);
  }
  draw(c) {
    const g = this.game;
    if (g.hideHud) return;   // portadas y modo grabación: solo el juego, sin marcador
    if (["playing", "paused", "over", "choice", "tip"].includes(g.state)) this.drawHud(c);
    if (g.tutorial && ["playing", "paused", "tip"].includes(g.state)) g.tutorial.draw(c, this);
    if (g.state === "playing" || g.state === "paused") { this.drawBanner(c); this.drawBossScreens(c); }
  }
  drawBossScreens(c) {
    const g = this.game, B = g.bosses;
    if (B.phase === "warning") {
      c.fillStyle = `rgba(255,59,59,${0.12 + 0.1 * Math.sin(g.time * 12)})`; c.fillRect(0, 0, W, H);
      c.fillStyle = "rgba(14,11,22,0.7)"; c.fillRect(0, 100, W, 104);
      c.fillStyle = UI_T.danger; c.fillRect(0, 100, W, 4); c.fillRect(0, 200, W, 4);
      if (Math.floor(g.time * 6) % 2 === 0) this.text(c, "¡PELIGRO!", W / 2, 140, 48, UI_T.danger, "center");
      this.text(c, `Se acerca: ${BOSS_NAMES[B.pending.type]}${B.pending.tier ? " (reforzado)" : ""}`.toUpperCase(), W / 2, 182, 14, UI_T.text, "center");
    }
    const bb = g.bossBanner;
    if (bb) {
      c.globalAlpha = clamp(bb.t / 0.4, 0, 1);
      c.fillStyle = "rgba(14,11,22,0.7)"; c.fillRect(0, 212, W, 72);
      c.fillStyle = bb.color; c.fillRect(0, 212, W, 2); c.fillRect(0, 282, W, 2);
      this.text(c, bb.text, W / 2, 238, 28, bb.color, "center");
      this.text(c, bb.sub, W / 2, 266, 13, UI_T.text, "center");
      c.globalAlpha = 1;
    }
  }
  drawBossBar(c) {
    const b = this.game.bosses.boss, w = 320, x = Math.round(W / 2 - w / 2), y = 40;
    this.text(c, b.name.toUpperCase() + (b.cycle ? ` +${b.cycle}` : ""), W / 2, 20, 14, "#ff8a9a", "center");
    c.fillStyle = UI_T.line; c.fillRect(x - 5, y - 5, w + 10, 24);
    c.fillStyle = "#14101f"; c.fillRect(x - 3, y - 3, w + 6, 20);
    c.fillStyle = "#3a2f50"; c.fillRect(x, y, w, 14);
    const fw = Math.round(w * b.hp / b.maxHp);
    c.fillStyle = b.flash > 0 ? "#ffffff" : b.vuln > 0 ? UI_T.weak : UI_T.danger; c.fillRect(x, y, fw, 14);
    c.fillStyle = "rgba(255,255,255,0.35)"; c.fillRect(x, y, fw, 2);
    c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(x, y + 11, fw, 3);
    for (let i = 1; i < 10; i++) { c.fillStyle = "rgba(14,11,22,0.35)"; c.fillRect(x + Math.round(w * i / 10), y, 2, 14); }
    this.text(c, `${b.hp}/${b.maxHp}`, x - 34, y + 7, 11, UI_T.text, "center");
    if (b.state === "fight") this.pill(c, `${Math.ceil(Math.max(0, CONFIG.BOSS_MAX_TIME - b.fightT))}s`, x + w + 32, y + 7, 10, UI_T.text);
    if (b.vuln > 0 && Math.floor(this.game.time * 8) % 2 === 0) this.pill(c, "¡VULNERABLE!", W / 2, y + 34, 11, "#16111f", UI_T.weak);
    const hint = b.hudHint();
    if (hint && b.state === "fight") this.pill(c, hint.toUpperCase(), W / 2, H - 18, 10, UI_T.weak);   // abajo, para no tapar los power-ups
    const hearts = this.game.bossHearts;   // corazones extra del combate (árbol, mejoras y pactos)
    for (let i = 0; i < hearts; i++) { c.save(); c.translate(x + w - 18 - i * 22, y + 26); c.scale(0.7, 0.7); drawHeart(c, 0, 0, true); c.restore(); }
  }
  drawHud(c) {
    const g = this.game, L = g.level;
    if (g.versus) return this.drawVersusHud(c);
    // Panel de puntuación (arriba a la izquierda)
    this.panel(c, 10, 10, 196, 76);
    c.textBaseline = "middle"; c.textAlign = "left";
    c.font = '10px "Raptor Pixel Display", monospace'; c.fillStyle = UI_T.dim; c.fillText("PUNTOS", 20, 24);
    c.font = '20px "Raptor Pixel Display", monospace'; c.fillStyle = UI_T.text; c.fillText(pad(g.score), 84, 25);
    c.font = '10px "Raptor Pixel Display", monospace'; c.fillStyle = UI_T.dim; c.fillText("RÉCORD", 20, 46);
    c.fillStyle = "#ffe9a8"; c.fillText(pad(g.daily ? g.dailyRace.d.best : g.save.record(g.mode.id)), 84, 46);
    c.fillStyle = UI_T.line; c.fillRect(17, 60, 182, 2);
    c.fillStyle = UI_T.line; c.beginPath(); c.arc(26, 74, 8, 0, Math.PI * 2); c.fill();
    c.fillStyle = UI_T.gold; c.beginPath(); c.arc(26, 74, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ffe29a"; c.fillRect(23, 70, 2, 4);
    c.font = '14px "Raptor Pixel Display", monospace'; c.fillStyle = UI_T.gold; c.fillText(String(g.runCoinsInt), 38, 75);
    drawEggPixels(c, 128, 73, 1.4);
    c.fillStyle = "#fff3c4"; c.fillText(`${g.eggsInLevel(L.level)}/${CONFIG.EGGS_PER_LEVEL}`, 142, 75);

    const B = g.bosses;
    if (B.boss && B.boss.state !== "leave") this.drawBossBar(c);
    else {
      this.text(c, `NIVEL ${L.level} · ${L.biome.name.toUpperCase()}`, W / 2, 22, 16, L.biome.accent, "center");
      // Cuenta atrás hasta el boss del nivel
      const left = B.nextAt - g.distScore, lvl = Math.floor(B.nextAt / CONFIG.POINTS_PER_LEVEL) + 1;
      if (!B.active && !g.tutorial && (!g.netRace || g.netCoop) && !g.net.spec && left >= 0 && lvl === L.level) this.pill(c, `BOSS: ${B.nameOf(lvl).toUpperCase()} EN ${left} PTS`, W / 2, 48, 10, "#ff8a9a");
    }
    if (g.randomMod) this.pill(c, `${g.daily ? "📅 DIARIA · " + g.randomMod.icon : "🎲"} ${g.randomMod.name.toUpperCase()}`, W / 2, B.boss && B.boss.state !== "leave" ? 98 : 74, 10, "#e4d0ff", "rgba(80,40,140,0.85)");
    const Wt = g.weather;   // clima: icono y nombre (al empezar, también qué cambia)
    if (Wt.def && Wt.k > 0.05) { c.globalAlpha = Wt.k; this.pill(c, `${Wt.def.icon} ${Wt.def.name.toUpperCase()}${Wt.announce > 0 ? " · " + Wt.def.desc.toUpperCase() : ""}`, W / 2, (B.boss && B.boss.state !== "leave" ? 98 : 74) + (g.randomMod ? 24 : 0), 10, "#e8f4ff", "rgba(30,60,110,0.85)"); c.globalAlpha = 1; }
    if (DEBUG) this.text(c, "DEBUG · 1–9, 0 nivel · B boss", W / 2, H - 42, 10, "#ff8a8a", "center");

    // Modo: vidas (Fácil) o aviso (Difícil)
    let y = 112;
    if (g.mode.id === "easy") {
      for (let i = 0; i < g.mode.lives; i++) drawHeart(c, 14 + i * 26, 96, i < g.lives);
      this.text(c, g.mode.label, 24 + g.mode.lives * 26, 106, 10, UI_T.info);
      y = 136;
    } else if (g.mode.id === "hard") {
      this.pill(c, g.mode.label, 64, 104, 10, "#ffffff", UI_T.danger);
      y = 136;
    }
    // Power-ups activos con barra de tiempo
    for (const type of POWERUP_TYPES) {
      const rem = g.effects[type]; if (rem <= 0) continue;
      const info = POWERUPS[type], frac = clamp(rem / (g.effectMax[type] || 1), 0, 1);
      c.fillStyle = UI_T.line; c.beginPath(); c.arc(26, y, 14, 0, Math.PI * 2); c.fill();
      c.fillStyle = UI_T.panel; c.beginPath(); c.arc(26, y, 12, 0, Math.PI * 2); c.fill();
      drawIcon(c, type, 26, y, 7);
      c.fillStyle = UI_T.line; c.fillRect(44, y - 6, 108, 12);
      c.fillStyle = "#3a2f50"; c.fillRect(46, y - 4, 104, 8);
      c.fillStyle = info.color; c.fillRect(46, y - 4, Math.round(104 * frac), 8);
      this.text(c, `${info.name.toUpperCase()} ${rem.toFixed(1)}s`, 160, y, 10, UI_T.text);
      y += 28;
    }
    const M = g.mounts.active;   // montura: icono y tiempo que le queda (parpadea en los 2 últimos segundos)
    if (M) {
      const frac = clamp(M.timeLeft / M.duration, 0, 1), blink = M.timeLeft < 2 && Math.floor(g.time * 8) % 2 === 0;
      c.fillStyle = UI_T.line; c.beginPath(); c.arc(26, y, 14, 0, Math.PI * 2); c.fill();
      c.fillStyle = blink ? "#ffffff" : UI_T.panel; c.beginPath(); c.arc(26, y, 12, 0, Math.PI * 2); c.fill();
      drawMountIcon(c, M.id, 26, y + 2, g.time, 0.55);
      c.fillStyle = UI_T.line; c.fillRect(44, y - 6, 108, 12);
      c.fillStyle = "#3a2f50"; c.fillRect(46, y - 4, 104, 8);
      c.fillStyle = blink ? "#ffffff" : M.cfg.icon; c.fillRect(46, y - 4, Math.round(104 * frac), 8);
      this.text(c, `${M.name.toUpperCase()} ${Math.max(0, M.timeLeft).toFixed(1)}s${M.armor ? " ♦" + M.armor : ""}`, 160, y, 10, UI_T.text);
      y += 28;
    }
    this.drawFuryBar(c);
    drawBuildHud(c, g);
    if (g.stat("eggArrow")) drawEggArrow(c, g);

    if (!g.touchMode) this.drawRoarRing(c, W - 48, 46, g.roarCd, g.roarCdMax || g.mode.roarCooldown, g.controls.label("roar"), "RUGIDO");   // en el móvil la recarga se ve en el botón 📢 (y aquí va la pausa)
    if (g.netRace) {   // carrera online: posiciones, trampas y cuenta atrás
      g.net.drawHud(c, this);
      if (g.netWait > 0) {
        c.fillStyle = "rgba(14,11,22,0.45)"; c.fillRect(0, 0, W, H);
        const n = Math.ceil(g.netWait - 0.5), k = (g.netWait - 0.5) % 1;
        this.text(c, n > 0 ? String(n) : "¡YA!", W / 2, H / 2 - 10, 72 + 30 * Math.max(0, k), n > 0 ? UI_T.weak : UI_T.go, "center");
        this.text(c, g.netCoop ? "COOPERATIVO · DERROTAD A LOS JEFES JUNTOS" : "CARRERA ONLINE · GANA QUIEN LLEGUE MÁS LEJOS", W / 2, H / 2 + 50, 12, UI_T.text, "center");
      }
    }
  }
  // Barra de furia (debajo del rugido). Llena: E lanza el súper rugido
  drawFuryBar(c) {
    const g = this.game, F = g.fury, x = W - 170, y = 98, w = 156, full = F.full && !g.bosses.active;
    c.fillStyle = UI_T.line; c.fillRect(x - 2, y - 2, w + 4, 14);
    c.fillStyle = "#3a2f50"; c.fillRect(x, y, w, 10);
    const fw = Math.round(w * (F.full ? 1 : F.v / FURY_CONFIG.MAX));
    c.fillStyle = full ? (Math.floor(g.time * 8) % 2 ? "#ffd23f" : "#ff3b3b") : F.full ? "#8a6a4a" : "#ff9a3c"; c.fillRect(x, y, fw, 10);
    c.fillStyle = "rgba(255,255,255,0.35)"; c.fillRect(x, y, fw, 2);
    for (let i = 1; i < 4; i++) { c.fillStyle = "rgba(14,11,22,0.4)"; c.fillRect(x + Math.round(w * i / 4), y, 2, 10); }
    const lbl = full ? `¡SÚPER RUGIDO! (E)${F.charges > 1 ? " ×" + F.charges : ""}` : F.full ? "FURIA LLENA (TRAS EL JEFE)" : "FURIA";
    this.text(c, lbl, x + w, y + 20, 10, full ? "#ffd23f" : UI_T.dim, "right");
    if (F.flash > 0) { c.globalAlpha = F.flash; c.fillStyle = "#ffffff"; c.fillRect(x - 2, y - 2, w + 4, 14); c.globalAlpha = 1; }
  }
  // Marcador del multijugador: puntos y rugido de cada raptor
  drawVersusHud(c) {
    const g = this.game, L = g.level;
    this.panel(c, 10, 10, 250, 76);
    c.textBaseline = "middle"; c.textAlign = "left";
    [g.player, g.p2].forEach((p, i) => {
      if (g.mode.lives > 1 && !p.dead) for (let k = 0; k < g.mode.lives; k++) { c.save(); c.translate(178 + k * 24, 26 + i * 26 - 8); c.scale(0.8, 0.8); drawHeart(c, 0, 0, k < p.lives); c.restore(); }
      const y = 26 + i * 26, col = i ? UI_T.info : UI_T.go;
      c.fillStyle = col; c.fillRect(20, y - 7, 30, 14);
      c.font = '10px "Raptor Pixel Display", monospace'; c.fillStyle = "#16111f"; c.textAlign = "center"; c.fillText("J" + p.num, 35, y + 1);
      c.textAlign = "left"; c.font = '20px "Raptor Pixel Display", monospace'; c.fillStyle = p.dead ? UI_T.dim : UI_T.text;
      c.fillText(pad(p.dead ? p.score : g.distScore), 60, y + 1);
      if (p.dead) { c.font = '10px "Raptor Pixel Display", monospace'; c.fillStyle = UI_T.danger; c.fillText("K.O.", 190, y + 1); }
    });
    c.fillStyle = UI_T.line; c.fillRect(17, 62, 236, 2);
    c.fillStyle = UI_T.gold; c.beginPath(); c.arc(26, 75, 6, 0, Math.PI * 2); c.fill();
    c.font = '14px "Raptor Pixel Display", monospace'; c.fillStyle = UI_T.gold; c.fillText(String(g.runCoinsInt), 38, 76);
    c.font = '10px "Raptor Pixel Display", monospace'; c.fillStyle = UI_T.dim; c.fillText(`MULTIJUGADOR · ${g.mode.name.toUpperCase()}`, 96, 76);
    this.text(c, `NIVEL ${L.level} · ${L.biome.name.toUpperCase()}`, W / 2, 22, 16, L.biome.accent, "center");
    this.drawRoarRing(c, W - 118, 46, g.player.roarCd, g.player.roarCdMax, g.controls.label("roar", "vs1"), "J1 RUGIDO", UI_T.go);
    this.drawRoarRing(c, W - 48, 46, g.p2.roarCd, g.p2.roarCdMax, g.controls.label("roar", "vs2"), "J2 RUGIDO", UI_T.info);
  }
  drawRoarRing(c, cx, cy, cd, cdMax, key, label, labelCol) {
    const g = this.game, r = 26, ready = cd <= 0;
    c.fillStyle = UI_T.line; c.beginPath(); c.arc(cx, cy, r + 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = UI_T.panel; c.beginPath(); c.arc(cx, cy, r + 4, 0, Math.PI * 2); c.fill();
    c.lineWidth = 6; c.lineCap = "butt"; c.strokeStyle = "#3a2f50"; c.beginPath(); c.arc(cx, cy, r - 3, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = ready ? (Math.floor(g.time * 4) % 2 ? UI_T.roar : "#ffc078") : UI_T.roar;
    c.beginPath(); c.arc(cx, cy, r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cd / (cdMax || 1))); c.stroke();
    if (ready) { c.fillStyle = UI_T.roar; c.beginPath(); c.arc(cx, cy, r - 9, 0, Math.PI * 2); c.fill(); }
    const kt = ready ? key : String(Math.ceil(cd));   // teclas largas (Espacio, Intro…) en letra más pequeña
    c.font = `${kt.length > 3 ? 9 : kt.length > 1 ? 13 : 20}px "Raptor Pixel Display", monospace`; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = ready ? "#16111f" : UI_T.text; c.fillText(kt.length > 5 ? kt.slice(0, 4) + "." : kt, cx, cy + 1);
    this.text(c, label, cx, cy + r + 16, 10, labelCol || (ready ? UI_T.roar : UI_T.dim), "center");
  }
  drawBanner(c) {
    const L = this.game.level; if (L.banner <= 0) return;
    const e = CONFIG.LEVEL_BANNER_TIME - L.banner;
    const a = clamp(Math.min(e / 0.25, L.banner / 0.4), 0, 1), sc = 1 + 0.3 * Math.max(0, 1 - e / 0.25);
    c.save(); c.globalAlpha = a; c.translate(W / 2, 140); c.scale(sc, sc);
    const h = L.bannerSub ? 112 : 96;
    c.fillStyle = "rgba(14,11,22,0.68)"; c.fillRect(-W / 2, -50, W, h);
    c.fillStyle = L.biome.accent; c.fillRect(-W / 2, -50, W, 3); c.fillRect(-W / 2, -50 + h - 3, W, 3);
    this.text(c, `¡NIVEL ${L.level}! ${L.biome.name.toUpperCase()}`, 0, -14, 36, L.biome.accent, "center");
    if (L.bannerSub) this.text(c, L.bannerSub.toUpperCase(), 0, 26, 14, "#fff3c4", "center");
    else this.text(c, this.game.versus ? "MULTIJUGADOR" : this.game.mode.id !== "normal" ? this.game.mode.label : "¡A CORRER!", 0, 26, 14, this.game.mode.id === "hard" ? UI_T.danger : UI_T.text, "center");
    c.restore();
  }
}

