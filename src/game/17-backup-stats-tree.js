// =====================================================================
//  SaveBackup: copia de seguridad de TODO el progreso (monedas, skins, diseños, checkpoints, logros,
//  estadísticas, árbol, historial, álbum, consejos y opciones) como código de texto o archivo.
//  Formato: "DINO" + versión + "." + base64(deflate(JSON)) + "." + suma de comprobación (FNV-1a de 32 bits, hex).
// =====================================================================
const BACKUP_CONFIG = {
  VERSION: 1,               // versión del formato de la copia (si cambia el guardado, sube y se añade una conversión en migrate)
  REMIND_DAYS: 7,           // días sin exportar antes del aviso del menú
  UNDO_KEY: SAVE_KEY + ".antesDeImportar",
};
function fnv1a(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); }
const b64FromBytes = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
const bytesFromB64 = b64 => Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
async function deflate(text, inflate = false) {
  const bytes = inflate ? text : new TextEncoder().encode(text);
  if (typeof CompressionStream === "undefined") return null;   // navegador sin compresión: se guarda sin comprimir
  const cs = inflate ? new DecompressionStream("deflate-raw") : new CompressionStream("deflate-raw");
  const out = new Response(new Blob([bytes]).stream().pipeThrough(cs));
  return inflate ? await out.text() : new Uint8Array(await out.arrayBuffer());
}
class SaveBackup {
  constructor(game) {
    this.g = game; const $ = id => document.getElementById(id);
    this.el = $("backup"); this.code = $("bkCode"); this.msg = $("bkMsg"); this.sum = $("bkSummary"); this.file = $("bkFile");
    const bind = (id, fn) => $(id).addEventListener("click", e => { game.sfx.click(); e.currentTarget.blur(); fn(); });
    bind("bkBack", () => this.close());
    bind("bkExport", () => this.exportCode());
    bind("bkCopy", () => this.copy());
    bind("bkDownload", () => this.download());
    bind("bkImport", () => this.check(this.code.value));
    bind("bkFileBtn", () => this.file.click());
    bind("bkConfirm", () => this.apply());
    bind("bkCancel", () => { this.pending = null; this.sum.classList.add("hidden"); this.say(""); });
    bind("bkUndo", () => this.undo());
    this.file.addEventListener("change", () => { const f = this.file.files[0]; if (!f) return; f.text().then(t => { this.code.value = t.trim(); this.check(t); }); this.file.value = ""; });
  }
  get visible() { return !this.el.classList.contains("hidden"); }
  open() { this.pending = null; this.sum.classList.add("hidden"); this.code.value = ""; this.say(""); this.refreshUndo(); this.el.classList.remove("hidden"); }
  close() { this.el.classList.add("hidden"); this.g.showMenu(); }
  say(text, kind = "") { this.msg.textContent = text; this.msg.className = "bk-msg " + kind; }
  refreshUndo() { let has = false; try { has = !!platform.load(BACKUP_CONFIG.UNDO_KEY); } catch (e) {} document.getElementById("bkUndo").classList.toggle("hidden", !has); }
  // ----- Exportar -----
  async makeCode() {
    const s = this.g.save; s.save();
    const json = JSON.stringify({ version: BACKUP_CONFIG.VERSION, date: new Date().toISOString(), data: s.data });
    const z = await deflate(json).catch(() => null);
    const body = z ? "z" + b64FromBytes(z) : "j" + b64FromBytes(new TextEncoder().encode(json));
    return `DINO${BACKUP_CONFIG.VERSION}.${body}.${fnv1a(body)}`;
  }
  async exportCode() {
    this.code.value = await this.makeCode();
    this.markExported(); this.say(`Código listo (${fmtNum(this.code.value.length)} caracteres). Cópialo o descárgalo y guárdalo en un sitio seguro.`, "ok");
  }
  markExported() { this.g.save.data.lastExport = new Date().toISOString(); this.g.save.save(); }
  async copy() {
    if (!this.code.value.startsWith("DINO")) await this.exportCode();
    try { await navigator.clipboard.writeText(this.code.value); this.say("Copiado al portapapeles.", "ok"); }
    catch (e) { this.code.select(); try { document.execCommand("copy"); this.say("Copiado al portapapeles.", "ok"); } catch (e2) { this.say("No se ha podido copiar: selecciona el código y cópialo a mano.", "err"); } }
    this.markExported();
  }
  async download() {
    const code = this.code.value.startsWith("DINO") ? this.code.value : await this.makeCode();
    const d = new Date(), name = `dino-runner-guardado-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.txt`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([code], { type: "text/plain" })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    this.code.value = code; this.markExported(); this.say(`Descargado: ${name}`, "ok");
  }
  // ----- Importar -----
  // Devuelve { data } o lanza un Error con un mensaje claro (no toca nada)
  static async decode(text) {
    const t = String(text || "").replace(/\s+/g, "");
    const m = /^DINO(\d+)\.([zj][A-Za-z0-9+/=]+)\.([0-9a-f]{8})$/.exec(t);
    if (!m) throw new Error("Eso no parece un código de Dino Runner (debe empezar por «DINO» y estar completo).");
    const ver = +m[1], body = m[2];
    if (fnv1a(body) !== m[3]) throw new Error("El código está dañado o incompleto (la suma de comprobación no coincide). No se ha cambiado nada.");
    if (ver > BACKUP_CONFIG.VERSION) throw new Error(`Este código es de una versión más nueva del juego (formato ${ver}). Actualiza el juego para cargarlo.`);
    let json;
    try { json = body[0] === "z" ? await deflate(bytesFromB64(body.slice(1)), true) : new TextDecoder().decode(bytesFromB64(body.slice(1))); }
    catch (e) { throw new Error("No se ha podido descomprimir el código. No se ha cambiado nada."); }
    let obj; try { obj = JSON.parse(json); } catch (e) { throw new Error("El contenido del código no es válido. No se ha cambiado nada."); }
    if (!obj || typeof obj.data !== "object") throw new Error("El código no contiene un guardado. No se ha cambiado nada.");
    return SaveBackup.migrate(obj);
  }
  // Conversión de formatos antiguos (versión → versión actual)
  static migrate(obj) {
    if ((obj.version || 1) < 1) obj.version = 1;
    return obj;
  }
  static summary(d) {
    const n = v => fmtNum(Number(v) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const skins = Array.isArray(d.owned) ? d.owned.length : 1, achs = d.ach && d.ach.unlocked ? Object.keys(d.ach.unlocked).length : 0;
    const rec = d.records ? Math.max(d.records.normal || 0, d.records.easy || 0, d.records.hard || 0) : 0;
    return [`${n(d.coins)} monedas`, `${skins} skin${skins === 1 ? "" : "s"}`, `${achs} logro${achs === 1 ? "" : "s"}`, `${n(d.fossils)} fósiles`, `${(d.checkpoints || []).length} checkpoints`, `récord ${n(rec)}`, `${n(d.eggWallet)} huevos`].join(", ");
  }
  async check(text) {
    this.sum.classList.add("hidden"); this.pending = null;
    try {
      const obj = await SaveBackup.decode(text);
      this.pending = obj;
      document.getElementById("bkSumText").textContent = `Guardado del ${new Date(obj.date).toLocaleString(I18N.locale)}: ${SaveBackup.summary(obj.data)}.`;
      this.sum.classList.remove("hidden"); this.say("Código correcto. Revisa el resumen y confirma.", "ok");
    } catch (e) { this.say(e.message, "err"); this.g.sfx.denied(); }
  }
  apply() {
    if (!this.pending) return;
    try {
      const cur = platform.load(SAVE_KEY);   // copia del progreso actual para poder deshacer
      if (cur) platform.save(BACKUP_CONFIG.UNDO_KEY, cur);
      platform.save(SAVE_KEY, JSON.stringify(this.pending.data));
    } catch (e) { this.say("No se ha podido escribir en el almacenamiento del navegador.", "err"); return; }
    this.say("¡Progreso cargado! Reiniciando…", "ok"); setTimeout(() => location.reload(), 400);
  }
  undo() {
    try {
      const prev = platform.load(BACKUP_CONFIG.UNDO_KEY); if (!prev) return;
      platform.save(SAVE_KEY, prev); platform.remove(BACKUP_CONFIG.UNDO_KEY);
    } catch (e) { this.say("No se ha podido restaurar.", "err"); return; }
    this.say("Guardado anterior restaurado. Reiniciando…", "ok"); setTimeout(() => location.reload(), 400);
  }
  // Aviso del menú: 7 días sin exportar y progreso importante
  needsReminder() {
    if (!BUILD.backup) return false;   // en CrazyGames el progreso lo guarda la plataforma
    const d = this.g.save.data, since = d.lastExport || d.firstPlay; if (!since) return false;
    const days = (Date.now() - new Date(since).getTime()) / 864e5;
    const big = d.coins >= 1000 || d.owned.length > 2 || Object.keys(d.ach.unlocked).length >= 5 || d.completed >= 3 || (d.fossils || 0) >= 10;
    return big && days >= BACKUP_CONFIG.REMIND_DAYS;
  }
}

// =====================================================================
//  StatsManager: estadísticas permanentes (save.data.stats). Se alimenta de los mismos eventos que los logros
//  (AchievementManager.event le pasa cada evento antes de filtrar) y tiene su pantalla con pestañas y gráficos.
// =====================================================================
const RARITY_RANK = { comun: 1, rara: 2, epica: 3, legendaria: 4 };
const fmtInt = v => String(Math.round(Number(v) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, I18N.lang === "es" ? "." : ",");   // miles: 1.234 · 1,234
const fmtTime = s => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return h ? `${h} h ${m} min` : m ? `${m} min ${s % 60} s` : `${s} s`; };
class StatsManager {
  constructor(game) {
    this.g = game; this.tab = "general"; this.resetArm = 0; this.fight = null;
    const $ = id => document.getElementById(id);
    this.el = $("statsScr"); this.body = $("stBody"); this.resetBtn = $("stReset");
    $("stBack").addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); this.close(); });
    this.resetBtn.addEventListener("click", e => { e.currentTarget.blur(); this.resetClick(); });
    const tabs = $("stTabs");
    for (const [k, name] of [["general", "General"], ["jefes", "Jefes"], ["monturas", "Monturas"], ["roguelike", "Roguelike"], ["otros", "Otros"]]) {
      const b = document.createElement("button"); b.className = "tab"; b.dataset.t = k; b.textContent = name;
      b.addEventListener("click", () => { game.sfx.click(); this.tab = k; this.render(); }); tabs.appendChild(b);
    }
  }
  get s() { const d = this.g.save.data; return d.stats || (d.stats = {}); }
  // Acceso a contadores anidados: o("move").jumps++
  o(k) { const s = this.s; return s[k] || (s[k] = {}); }
  inc(obj, k, n = 1) { obj[k] = (obj[k] || 0) + n; }
  boss(id) { const B = this.o("bosses"); return B[id] || (B[id] = { faced: 0, wins: 0, losses: 0, best: 0, hearts: 0, ended: 0, corrupt: 0, gold: 0 }); }
  mount(id) { const M = this.o("mounts"); return M[id] || (M[id] = { uses: 0, time: 0, lost: 0 }); }
  endFight(id, lost) { if (!this.fight || this.fight.id !== id) return; const B = this.boss(id); B.hearts += this.fight.hearts; B.ended++; if (lost) B.losses++; this.fight = null; }
  event(type, d = {}) {
    const g = this.g; if (g.tutorial) return;
    const s = this.s, mv = () => this.o("move");
    switch (type) {
      case "runStart": this.inc(this.o("games"), g.mode.id); break;
      case "jump": this.inc(mv(), "jumps"); break;
      case "doubleJump": this.inc(mv(), "doubleJumps"); break;
      case "slide": this.inc(mv(), "slides"); break;
      case "stomp": this.inc(mv(), "stomps"); break;
      case "laneChange": this.inc(mv(), "lanes"); break;
      case "roar": this.inc(mv(), "roars"); break;
      case "superRoar": this.inc(mv(), "superRoars"); break;
      case "roarKill": this.inc(mv(), "destroyed"); break;
      case "nearMiss": this.inc(mv(), "nearMiss"); break;
      case "eggCollected": this.inc(s, "eggs"); break;
      case "levelReached": s.maxLevel = Math.max(s.maxLevel || 1, d.level); break;
      case "coinsEarned": this.inc(s, "coinsEarned", d.n); break;
      case "coinsSpent": this.inc(this.o("spent"), d.on || "otros", d.n); break;
      case "purchase": {
        const n = d.kind === "skin" ? d.skin.price : d.kind === "checkpoint" ? g.checkpoints.price(d.level) : d.kind === "editor" ? CONFIG.EDITOR_PRICE : ["hat", "hats", "trails", "roars", "pets"].includes(d.kind) ? d.price : 0;
        if (n) this.inc(this.o("spent"), "shop", n);
        break;
      }
      case "rouletteSpin": {
        const R = this.o("roulette"); this.inc(R, "spins"); this.inc(R, "bet", d.bet); this.inc(this.o("spent"), "roulette", d.bet);
        if (d.win > d.bet) this.inc(R, "won", d.win - d.bet); else this.inc(R, "lost", d.bet - d.win);
        if (d.mult === d.top) this.inc(R, "jackpots");
        break;
      }
      case "freeSpin": this.inc(this.o("roulette"), "free"); break;
      // Jefes
      case "bossStart": { const B = this.boss(d.id); B.faced++; this.fight = { id: d.id, hearts: 0 }; break; }
      case "heartLost": if (d.boss && this.fight) this.fight.hearts++; break;
      case "bossDefeated": {
        const B = this.boss(d.id); B.wins++; if (d.time && (!B.best || d.time < B.best)) B.best = Math.round(d.time * 10) / 10;
        if (d.tier === 1) B.corrupt++; if (d.tier >= 2) B.gold++;
        this.endFight(d.id, false); break;
      }
      case "bossLost": this.endFight(d.id, true); break;
      // Monturas
      case "mountUsed": this.mount(d.id).uses++; break;
      case "mountTime": this.mount(d.id).time += d.t; break;
      case "mountLost": this.mount(d.id).lost++; break;
      // Roguelike
      case "upgradePicked": {
        const R = this.o("rogue"); this.inc(this.o("picks"), d.id);
        R.bestRarity = Math.max(R.bestRarity || 0, RARITY_RANK[d.rarity] || 0); break;
      }
      case "synergy": this.inc(this.o("rogue"), "synergies"); break;
      case "pact": this.inc(this.o("rogue"), "pacts"); break;
    }
  }
  // Fin de partida (la llama Game.bankRun): tiempo, distancia, puntuaciones, muerte, skin y mejor build
  runEnd() {
    const g = this.g; if (g.tutorial) return;
    const s = this.s, score = g.score;
    if (g.versus) { if (g.state !== "over") return; const V = this.o("versus"), [a, b] = [g.player.score, g.p2.score]; this.inc(V, "games"); this.inc(V, a === b ? "draws" : a > b ? "p1" : "p2"); this.inc(s, "time", g.runTime); return; }
    this.inc(s, "time", g.runTime); this.inc(s, "distance", g.distScore); this.inc(this.o("skins"), g.skinId, g.runTime);
    s.maxLevel = Math.max(s.maxLevel || 1, g.level.level);
    const best = this.o("best"); best[g.mode.id] = Math.max(best[g.mode.id] || 0, score);
    s.last = [...(s.last || []), score].slice(-20);
    if (g.state === "over") {
      const D = this.o("deaths"); this.inc(D, "total"); this.inc(this.o("deathBy"), g.deathCause || "Obstáculo"); this.inc(this.o("deathBiome"), g.level.biome.id);
      if (g.bosses.phase === "fight" && g.bosses.pending) this.endFight(BOSS_IDS[g.bosses.pending.type], true);
    }
    const R = this.o("rogue");
    if (!R.bestBuild || score > R.bestBuild.score) R.bestBuild = { score, ...g.build.summary() };
  }
  // ----- Pantalla -----
  get visible() { return !this.el.classList.contains("hidden"); }
  open() { this.resetArm = 0; this.render(); this.el.classList.remove("hidden"); }
  close() { this.el.classList.add("hidden"); this.g.showMenu(); }
  resetClick() {
    const g = this.g; this.resetArm++;
    if (this.resetArm === 1) { this.resetBtn.textContent = "¿Seguro? Se borrarán las estadísticas"; g.sfx.denied(); return; }
    if (this.resetArm === 2) { this.resetBtn.textContent = "Última confirmación: pulsa otra vez"; g.sfx.denied(); return; }
    g.save.data.stats = {}; g.save.save(); this.resetArm = 0; g.sfx.shieldBreak(); this.render();   // monedas, skins y logros no se tocan
  }
  big(label, value, col = "") { return `<div><small>${label}</small><b${col ? ` style="color:${col}"` : ""}>${value}</b></div>`; }
  render() {
    const s = this.s, g = this.g;
    document.querySelectorAll("#stTabs .tab").forEach(b => b.classList.toggle("active", b.dataset.t === this.tab));
    this.resetBtn.textContent = "Reiniciar estadísticas";
    const games = this.o("games"), total = (games.normal || 0) + (games.easy || 0) + (games.hard || 0) + (games.random || 0), best = this.o("best"), sp = this.o("spent"), mv = this.o("move");
    let html = "";
    if (this.tab === "general") {
      html = `<div class="stats st-big">${this.big("PARTIDAS", fmtInt(total))}${this.big("TIEMPO JUGADO", fmtTime(s.time))}${this.big("DISTANCIA", fmtInt(s.distance) + " pts")}${this.big("NIVEL MÁS ALTO", s.maxLevel || 1)}
        ${this.big("MEJOR NORMAL", fmtInt(best.normal), UI_T.go)}${this.big("MEJOR FÁCIL", fmtInt(best.easy), UI_T.info)}${this.big("MEJOR DIFÍCIL", fmtInt(best.hard), UI_T.danger)}${this.big("MEJOR ALEATORIO", fmtInt(best.random), "#c9a6ff")}
        ${this.big("MONEDAS GANADAS", fmtInt(s.coinsEarned), UI_T.gold)}${this.big("MONEDAS GASTADAS", fmtInt((sp.shop || 0) + (sp.roulette || 0) + (sp.reroll || 0)), UI_T.gold)}${this.big("HUEVOS", fmtInt(s.eggs))}</div>
        <p class="touch-hint">Gastadas: tienda ${fmtInt(sp.shop)} · ruleta ${fmtInt(sp.roulette)} · barajar cartas ${fmtInt(sp.reroll)}</p>
        <h3>Puntuación de las últimas 20 partidas</h3><canvas class="st-chart" data-chart="last" width="760" height="170"></canvas>
        <h3>Movimiento</h3><table class="st-table"><tr>${["Saltos", "Dobles saltos", "Deslizamientos", "Pisotones", "Cambios de carril", "Rugidos", "Súper rugidos", "Destruidos", "Por los pelos"].map(x => `<th>${x}</th>`).join("")}</tr>
        <tr>${["jumps", "doubleJumps", "slides", "stomps", "lanes", "roars", "superRoars", "destroyed", "nearMiss"].map(k => `<td>${fmtInt(mv[k])}</td>`).join("")}</tr></table>
        <h3>Muertes: ${fmtInt(this.o("deaths").total)} · qué te mata más</h3><canvas class="st-chart" data-chart="deaths" width="760" height="190"></canvas>
        <h3>Dónde mueres más</h3><canvas class="st-chart" data-chart="biomes" width="760" height="150"></canvas>`;
    } else if (this.tab === "jefes") {
      const B = this.o("bosses");
      html = `<h3>Victorias por jefe</h3><canvas class="st-chart" data-chart="bosses" width="760" height="190"></canvas>
        <table class="st-table"><tr><th></th><th>Jefe</th><th>Combates</th><th>Victorias</th><th>Derrotas</th><th>% victoria</th><th>Mejor tiempo</th><th>♥ perdidos (media)</th><th>Corrupta</th><th>Dorada</th></tr>
        ${BOSS_IDS.map((id, i) => { const b = B[id] || {}; const fin = (b.wins || 0) + (b.losses || 0);
          return `<tr><td><canvas class="st-boss" data-boss="${i}" width="96" height="40"></canvas></td><td>${b.faced || i < BOSS_COUNT ? BOSS_NAMES[i] : "???"}</td><td>${fmtInt(b.faced)}</td><td>${fmtInt(b.wins)}</td><td>${fmtInt(b.losses)}</td>
          <td>${fin ? Math.round(b.wins / fin * 100) + " %" : "—"}</td><td>${b.best ? fmtNum(b.best) + " s" : "—"}</td><td>${b.ended ? fmtNum(Math.round(b.hearts / b.ended * 10) / 10) : "—"}</td><td>${fmtInt(b.corrupt)}</td><td>${fmtInt(b.gold)}</td></tr>`; }).join("")}</table>
        <p class="touch-hint">Corrupta = boss reforzado de la segunda vuelta · Dorada = tercera vuelta o más.</p>`;
    } else if (this.tab === "monturas") {
      const M = this.o("mounts");
      html = `<table class="st-table"><tr><th></th><th>Montura</th><th>Bioma</th><th>Veces usada</th><th>Tiempo total</th><th>Perdida por un golpe</th></tr>
        ${MOUNT_BIOMES.map(b => { const m = MOUNT_CONFIG.mounts[b], x = M[m.id] || {}, bi = BIOMES.find(z => z.id === b);
          return `<tr><td><canvas class="st-mount" data-mount="${m.id}" width="64" height="40"></canvas></td><td>${m.name}</td><td>${bi ? bi.name : b}</td><td>${fmtInt(x.uses)}</td><td>${fmtTime(x.time)}</td><td>${fmtInt(x.lost)}</td></tr>`; }).join("")}</table>`;
    } else if (this.tab === "roguelike") {
      const R = this.o("rogue"), P = this.o("picks"), top = Object.entries(P).sort((a, b) => b[1] - a[1]), fav = top[0] && UPGRADE_BY_ID[top[0][0]];
      const rr = Object.keys(RARITY_RANK).find(k => RARITY_RANK[k] === R.bestRarity), bb = R.bestBuild;
      html = `<div class="stats st-big">${this.big("MEJORA MÁS ELEGIDA", fav ? `${fav.name} ×${top[0][1]}` : "—", fav ? upColor(fav) : "")}${this.big("RAREZA MÁS ALTA", rr ? ROGUE_CONFIG.RARITY[rr].name : "—", rr ? ROGUE_CONFIG.RARITY[rr].color : "")}
        ${this.big("SINERGIAS ACTIVADAS", fmtInt(R.synergies), SYN_COLOR)}${this.big("PACTOS ACEPTADOS", fmtInt(R.pacts), PACT_COLOR)}</div>
        <h3>Mejor build${bb ? ` (${fmtInt(bb.score)} pts)` : ""}</h3><div class="build-row st-build">${bb ? buildIconsHtml({ ups: bb.ups, syn: bb.syn, pacts: bb.pacts }, true) : `<small class="touch-hint">Todavía no hay ninguna</small>`}</div>
        <h3>Mejoras más elegidas</h3><canvas class="st-chart" data-chart="picks" width="760" height="170"></canvas>`;
    } else {
      const R = this.o("roulette"), V = this.o("versus"), SK = Object.entries(this.o("skins")).sort((a, b) => b[1] - a[1]), fav = SK[0] && SkinCatalog.get(SK[0][0]);
      html = `<h3>Ruleta</h3><div class="stats st-big">${this.big("GIROS", fmtInt(R.spins))}${this.big("APOSTADO", fmtInt(R.bet), UI_T.gold)}${this.big("GANADO", "+" + fmtInt(R.won), UI_T.go)}${this.big("PERDIDO", "−" + fmtInt(R.lost), UI_T.danger)}${this.big("JACKPOTS", fmtInt(R.jackpots), UI_T.weak)}${this.big("GIROS GRATIS", fmtInt(R.free))}</div>
        <h3>Multijugador (el «rival» de este juego)</h3><div class="stats st-big">${this.big("CARRERAS", fmtInt(V.games))}${this.big("GANA J1", fmtInt(V.p1), UI_T.go)}${this.big("GANA J2", fmtInt(V.p2), UI_T.info)}${this.big("EMPATES", fmtInt(V.draws))}</div>
        <h3>Skins más usados</h3><div class="st-skin">${fav ? `<canvas id="stSkin" width="200" height="120"></canvas><div><b>${fav.name}</b><small>${fmtTime(SK[0][1])} en partida</small></div>` : `<small class="touch-hint">Juega una partida para empezar a contar</small>`}</div>
        <table class="st-table">${SK.slice(0, 8).map(([id, t]) => `<tr><td>${SkinCatalog.get(id) ? SkinCatalog.get(id).name : id}</td><td>${fmtTime(t)}</td></tr>`).join("")}</table>`;
    }
    this.body.innerHTML = html;
    this.body.querySelectorAll("canvas[data-chart]").forEach(cv => this.chart(cv, cv.dataset.chart));
    this.body.querySelectorAll("canvas.st-mount").forEach(cv => { const c = cv.getContext("2d"); c.imageSmoothingEnabled = false; drawMountIcon(c, cv.dataset.mount, 32, 24, 0, 0.75); });
    this.body.querySelectorAll("canvas.st-boss").forEach(cv => { try { const c = cv.getContext("2d"); DEMOS.boss(c, 0, { w: 96, h: 40, arg: cv.dataset.boss, state: {} }, g); } catch (e) {} });
    paintBuildIcons(this.body);
    const sc = document.getElementById("stSkin"); if (sc && SK0(this)) drawSkinPreview(sc.getContext("2d"), SK0(this), { tick: 0, speed: 2, trail: null, acc: 0 }, 200, 120, 4);
  }
  // Gráficos sencillos en canvas
  chart(cv, kind) {
    const c = cv.getContext("2d"), W2 = cv.width, H2 = cv.height, s = this.s, pad = 34;
    c.fillStyle = "#14101f"; c.fillRect(0, 0, W2, H2);
    c.font = '10px "Raptor Pixel Display", monospace'; c.textBaseline = "middle";
    const bars = (items, color) => {
      if (!items.length) { c.fillStyle = UI_T.dim; c.textAlign = "center"; c.fillText("Sin datos todavía", W2 / 2, H2 / 2); return; }
      const max = Math.max(...items.map(x => x[1]), 1), rowH = Math.min(26, (H2 - 10) / items.length);
      items.forEach(([label, v, col], i) => {
        const y = 6 + i * rowH, w = Math.round((W2 - 240) * v / max);
        c.fillStyle = UI_T.text; c.textAlign = "right"; c.fillText(label.length > 24 ? label.slice(0, 23) + "…" : label, 196, y + rowH / 2);
        c.fillStyle = col || color; c.fillRect(204, y + 3, Math.max(2, w), rowH - 6);
        c.fillStyle = "rgba(255,255,255,0.3)"; c.fillRect(204, y + 3, Math.max(2, w), 2);
        c.fillStyle = UI_T.text; c.textAlign = "left"; c.fillText(fmtInt(v), 210 + w, y + rowH / 2);
      });
    };
    if (kind === "last") {
      const L = s.last || [];
      if (L.length < 2) { c.fillStyle = UI_T.dim; c.textAlign = "center"; c.fillText(L.length ? `Una partida: ${fmtInt(L[0])} pts` : "Sin datos todavía", W2 / 2, H2 / 2); return; }
      const max = Math.max(...L, 1), x = i => pad + i * (W2 - pad * 2) / (L.length - 1), y = v => H2 - 20 - (H2 - 40) * v / max;
      c.strokeStyle = "#3a2f50"; c.lineWidth = 1; for (let k = 0; k <= 4; k++) { const yy = 20 + (H2 - 40) * k / 4; c.beginPath(); c.moveTo(pad, yy); c.lineTo(W2 - pad, yy); c.stroke(); }
      c.strokeStyle = UI_T.go; c.lineWidth = 3; c.beginPath(); L.forEach((v, i) => i ? c.lineTo(x(i), y(v)) : c.moveTo(x(i), y(v))); c.stroke();
      L.forEach((v, i) => { c.fillStyle = v === max ? UI_T.weak : UI_T.go; c.fillRect(x(i) - 3, y(v) - 3, 6, 6); });
      c.fillStyle = UI_T.dim; c.textAlign = "left"; c.fillText(fmtInt(max), 4, 20); c.fillText("0", 4, H2 - 20);
      c.textAlign = "center"; c.fillText("más antigua → más reciente", W2 / 2, H2 - 7);
    } else if (kind === "deaths") bars(Object.entries(this.o("deathBy")).sort((a, b) => b[1] - a[1]).slice(0, 7), UI_T.danger);
    else if (kind === "biomes") bars(Object.entries(this.o("deathBiome")).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, v]) => { const b = BIOMES.find(z => z.id === id); return [b ? b.name : id, v, b ? b.accent : null]; }), UI_T.roar);
    else if (kind === "bosses") { const B = this.o("bosses"); bars(BOSS_IDS.map((id, i) => [BOSS_NAMES[i], (B[id] || {}).wins || 0]).filter(x => x[1] > 0), UI_T.go); }
    else if (kind === "picks") bars(Object.entries(this.o("picks")).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, v]) => [UPGRADE_BY_ID[id] ? UPGRADE_BY_ID[id].name : id, v, UPGRADE_BY_ID[id] ? upColor(UPGRADE_BY_ID[id]) : null]), UI_T.gold);
  }
}
function SK0(st) { const e = Object.entries(st.o("skins")).sort((a, b) => b[1] - a[1])[0]; return e && SkinCatalog.exists(e[0]) ? e[0] : null; }

// =====================================================================
//  SkillTree: árbol de mejoras permanentes pagado con fósiles (save.data.tree / save.data.fossils).
//  Sus efectos entran en la partida por el mismo game.stat() del roguelike (RunBuild.sources), sin código aparte.
// =====================================================================
const TREE_ICON = { superv: "def", poder: "roar", fortuna: "eco", destino: "legend" };
// Hueso de ámbar (icono de los fósiles) en pixel art
const FOSSIL_ICON = ["oo....oo", "oaooooao", ".oaaaao.", "..obao..", "..oaao..", ".oaaaao.", "oaooooao", "oo....oo"];
function drawFossil(c, x, y, sc) { FOSSIL_ICON.forEach((r, j) => { for (let i = 0; i < 8; i++) { const ch = r[i]; if (ch === ".") continue; c.fillStyle = ch === "o" ? "#16111f" : ch === "b" ? "#fff3c4" : "#ffb02e"; c.fillRect(x + i * sc, y + j * sc, sc, sc); } }); }
const fossilHtml = () => `<canvas class="fossil-ico" width="16" height="16" data-fossil="1"></canvas>`;
function paintFossils(root) { root.querySelectorAll("canvas[data-fossil]").forEach(cv => drawFossil(cv.getContext("2d"), 0, 0, 2)); }

class SkillTree {
  constructor(game) {
    this.g = game; this.resetArm = 0;
    const $ = id => document.getElementById(id);
    this.el = $("tree"); this.box = $("treeBox"); this.lines = $("treeLines"); this.info = $("treeInfo"); this.walletEl = $("treeFossils"); this.resetBtn = $("treeReset");
    $("treeBack").addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); this.close(); });
    this.resetBtn.addEventListener("click", e => { e.currentTarget.blur(); this.resetClick(); });
  }
  get d() { return this.g.save.data; }
  level(id) { return this.d.tree[id] || 0; }
  node(id) { return TREE_NODES.find(n => n.id === id); }
  // Un nodo se puede comprar si el anterior de su rama tiene al menos nivel 1 (el primero cuelga de la Raíz, gratis)
  reachable(n) { const br = TREE_CONFIG.branches.find(b => b.id === n.branch); return n.index === 0 || this.level(br.nodes[n.index - 1].id) >= 1; }
  cost(n) { const l = this.level(n.id); return l >= n.max ? null : n.cost[l]; }
  spent() { let s = 0; for (const n of TREE_NODES) for (let i = 0; i < this.level(n.id); i++) s += n.cost[i]; return s; }
  get total() { return TREE_NODES.reduce((s, n) => s + n.cost.reduce((a, b) => a + b, 0), 0); }
  buy(id) {
    const g = this.g, n = this.node(id), c = this.cost(n);
    if (c == null || !this.reachable(n) || this.d.fossils < c) { g.sfx.denied(); return false; }
    this.d.fossils -= c; this.d.tree[id] = this.level(id) + 1; g.save.save(); g.sfx.buy();
    g.build.cache = {};   // los stats del árbol cambian
    g.ach.event("treeBuy", { complete: this.completeBranches(), all: TREE_NODES.every(x => this.level(x.id) >= x.max) });
    this.render(id); return true;
  }
  completeBranches() { return TREE_CONFIG.branches.filter(b => b.nodes.every(n => this.level(n.id) >= n.max)).length; }
  resetCost() { return this.d.treeResets ? TREE_CONFIG.RESET_COST : 0; }
  resetClick() {
    const g = this.g, spent = this.spent(), cost = this.resetCost();
    if (!spent) { g.sfx.denied(); return; }
    if (this.d.coins < cost) { g.sfx.denied(); this.say(`Necesitas ${cost} monedas para reiniciar el árbol.`); return; }
    if (++this.resetArm < 2) { this.resetBtn.textContent = `¿Seguro? Recuperas ${spent} fósiles${cost ? ` por ${cost} monedas` : " (gratis)"}`; g.sfx.denied(); return; }
    this.d.coins -= cost; this.d.fossils += spent; this.d.tree = {}; this.d.treeResets++; this.resetArm = 0;
    if (cost) g.ach.event("coinsSpent", { n: cost, on: "shop" });
    g.save.save(); g.build.cache = {}; g.sfx.shieldBreak(); this.render(); this.say(`Árbol reiniciado: +${spent} fósiles.`);
  }
  say(t) { this.info.innerHTML = `<p>${t}</p>`; }
  open() { this.resetArm = 0; this.el.classList.remove("hidden"); this.render(); }
  close() { this.el.classList.add("hidden"); this.g.showMenu(); }
  get visible() { return !this.el.classList.contains("hidden"); }
  // Raíz abajo en el centro y 4 ramas hacia arriba; las líneas se dibujan en un canvas detrás de los nodos
  render(focus) {
    const d = this.d;
    this.walletEl.innerHTML = `${fossilHtml()} ${d.fossils} fósiles`;
    this.resetBtn.textContent = this.resetCost() ? `Reiniciar árbol (${TREE_CONFIG.RESET_COST} monedas)` : "Reiniciar árbol (gratis la primera vez)";
    this.box.querySelectorAll(".tnode").forEach(e => e.remove());
    const cols = TREE_CONFIG.branches.length;
    TREE_CONFIG.branches.forEach((br, bi) => {
      br.nodes.forEach((n, i) => {
        const l = this.level(n.id), c = this.cost(n), ok = this.reachable(n), max = l >= n.max;
        const el = document.createElement("button");
        el.className = "tnode" + (max ? " max" : l ? " some" : "") + (ok ? "" : " locked") + (c != null && ok && d.fossils >= c ? " afford" : "");
        el.style.setProperty("--bc", br.color); el.style.left = `${(bi + 0.5) / cols * 100}%`; el.style.bottom = `${88 + i * 92}px`;
        el.innerHTML = `<canvas width="24" height="24"></canvas><b>${n.name}</b><small>Nv ${l}/${n.max}${max ? " · MÁX" : ` · ${fossilHtml()} ${c}`}</small>`;
        el.title = n.desc(Math.max(1, l));
        drawUpIcon(el.querySelector("canvas").getContext("2d"), TREE_ICON[br.id], ok ? br.color : "#4a4560", 3);
        el.addEventListener("click", () => { this.g.sfx.click(); this.select(n.id); });
        el.addEventListener("dblclick", () => this.buy(n.id));
        el.dataset.id = n.id; this.box.appendChild(el);
      });
    });
    paintFossils(this.el);
    this.drawLines();
    this.select(focus || this.sel || TREE_NODES[0].id, true);
  }
  select(id, quiet) {
    this.sel = id; const n = this.node(id), l = this.level(id), c = this.cost(n), ok = this.reachable(n), d = this.d;
    this.box.querySelectorAll(".tnode").forEach(e => e.classList.toggle("sel", e.dataset.id === id));
    const br = TREE_CONFIG.branches.find(b => b.id === n.branch);
    const why = c == null ? "Nivel máximo" : !ok ? `Necesitas «${br.nodes[n.index - 1].name}» a nivel 1` : d.fossils < c ? `Te faltan ${c - d.fossils} fósiles` : "";
    this.info.innerHTML = `<h3 style="color:${br.color}">${br.name} · ${n.name} <small>(nivel ${l}/${n.max})</small></h3>
      <p>${l ? `Ahora: ${n.desc(l)}` : "Sin comprar."}${c != null ? `<br>Siguiente nivel: ${n.desc(l + 1)}` : ""}</p>
      <div class="actions"><button class="btn primary" id="treeBuy" ${why ? "disabled" : ""}>${c == null ? "Completado" : `Comprar · ${fossilHtml()} ${c}`}</button><small class="touch-hint">${why}</small></div>`;
    paintFossils(this.info);
    const b = document.getElementById("treeBuy"); if (b) b.addEventListener("click", e => { e.currentTarget.blur(); this.buy(id); });
  }
  drawLines() {
    const cv = this.lines, rect = this.box.getBoundingClientRect(), w = Math.max(320, Math.round(rect.width || 860)), h = this.box.offsetHeight || 480;
    cv.width = w; cv.height = h; const c = cv.getContext("2d"), cols = TREE_CONFIG.branches.length;
    c.clearRect(0, 0, w, h); c.lineWidth = 6; c.lineCap = "square";
    const rootX = w / 2, rootY = h - 40;
    TREE_CONFIG.branches.forEach((br, bi) => {
      const x = (bi + 0.5) / cols * w;
      br.nodes.forEach((n, i) => {
        const y = h - (88 + i * 92) - 30, py = i === 0 ? rootY : h - (88 + (i - 1) * 92) - 30, px = i === 0 ? rootX : x, on = this.level(n.id) > 0;
        c.strokeStyle = "#0e0b16"; c.lineWidth = 10; c.beginPath(); c.moveTo(px, py); if (i === 0) c.lineTo(x, py - 20); c.lineTo(x, y); c.stroke();
        c.strokeStyle = on ? br.color : "#3d3160"; c.lineWidth = 5; c.beginPath(); c.moveTo(px, py); if (i === 0) c.lineTo(x, py - 20); c.lineTo(x, y); c.stroke();
      });
    });
    // Raíz (gratis)
    c.fillStyle = "#0e0b16"; c.fillRect(rootX - 46, rootY - 20, 92, 40); c.fillStyle = "#5fd15a"; c.fillRect(rootX - 43, rootY - 17, 86, 34);
    c.font = '10px "Raptor Pixel Display", monospace'; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#16111f"; c.fillText("RAÍZ", rootX, rootY + 1);
  }
}
// Fósiles de una partida (los llama Game.bankRun). Devuelve { total, lines } para el Game Over
function fossilsForRun(g) {
  const F = TREE_CONFIG.FOSSILS, lines = [];
  const levels = Math.max(0, g.level.level - g.startLevel), tiers = g.runBossTiers || [];
  if (levels) lines.push([`${levels} nivel${levels > 1 ? "es" : ""} completado${levels > 1 ? "s" : ""}`, levels * F.LEVEL]);
  const nb = tiers.filter(t => !t).length, nc = tiers.filter(t => t === 1).length, ng = tiers.filter(t => t >= 2).length;
  if (nb) lines.push([`${nb} jefe${nb > 1 ? "s" : ""}`, nb * F.BOSS]);
  if (nc) lines.push([`${nc} jefe${nc > 1 ? "s" : ""} Corrupto${nc > 1 ? "s" : ""}`, nc * F.BOSS_CORRUPT]);
  if (ng) lines.push([`${ng} jefe${ng > 1 ? "s" : ""} Dorado${ng > 1 ? "s" : ""}`, ng * F.BOSS_GOLD]);
  const ns = g.build.synergies.length; if (ns) lines.push([`${ns} sinergia${ns > 1 ? "s" : ""}`, ns * F.SYNERGY]);
  if (g.newRecord) lines.push(["nuevo récord", F.RECORD]);
  let total = lines.reduce((s, l) => s + l[1], 0);
  if (g.mode.id === "easy" && total) { const t2 = Math.ceil(total * F.EASY_MULT); lines.push(["modo Fácil: la mitad", t2 - total]); total = t2; }
  return { total, lines };
}

