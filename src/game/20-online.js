// =====================================================================
//  Online (Supabase): apodo, ranking mundial y guardado en la nube con código.
//  Sin dependencias: habla con la API REST de Supabase con fetch. Inicio de sesión anónimo (sin correo).
//  Si no hay conexión el juego sigue igual: las puntuaciones esperan en una cola y se envían más tarde.
// =====================================================================
const ONLINE_CONFIG = {
  URL: "https://jlvlupdvfyrrofydrocz.supabase.co",
  KEY: "sb_publishable_XN4kZ5WfWx1YHYR8DF-i5w_Tq5lQqL_",   // clave pública (la seguridad la ponen las reglas de la base de datos)
  SESSION_KEY: "dinoRunner.online", QUEUE_KEY: "dinoRunner.scoreQueue", TIMEOUT: 9000, TOP: 50,
};
const RANK_MODES = [["daily", "📅 Diaria de hoy"], ["normal", "Normal"], ["hard", "Difícil"], ["easy", "Fácil"], ["random", "🎲 Aleatorio"]];
class Online {
  constructor(game) {
    this.g = game; this.sess = null; this.queue = [];
    try { this.sess = JSON.parse(platform.load(ONLINE_CONFIG.SESSION_KEY) || "null"); } catch (e) {}
    try { this.queue = JSON.parse(platform.load(ONLINE_CONFIG.QUEUE_KEY) || "[]"); } catch (e) {}
    if (!Array.isArray(this.queue)) this.queue = [];
    if (!BUILD.online) return;   // versión sin online (CrazyGames): nunca se conecta a ningún servidor
    addEventListener("online", () => this.flush());
    setTimeout(() => this.flush(), 3000);
  }
  get nick() { return this.g.save.data.nick || ""; }
  get uid() { return this.sess && this.sess.user && this.sess.user.id; }
  persist() { try { platform.save(ONLINE_CONFIG.SESSION_KEY, JSON.stringify(this.sess)); platform.save(ONLINE_CONFIG.QUEUE_KEY, JSON.stringify(this.queue.slice(-30))); } catch (e) {} }
  // Petición a Supabase (con tiempo límite). auth = enviar la sesión del jugador
  async req(path, { method = "GET", body, auth = true, prefer } = {}, retry = true) {
    if (!BUILD.online) throw new Error("Online no disponible en esta versión.");
    if (auth) await this.ensureSession();
    const headers = { apikey: ONLINE_CONFIG.KEY, "Content-Type": "application/json" };
    if (auth && this.sess) headers.Authorization = "Bearer " + this.sess.access_token;
    if (prefer) headers.Prefer = prefer;
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ONLINE_CONFIG.TIMEOUT);
    let r;
    try { r = await fetch(ONLINE_CONFIG.URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal }); }
    catch (e) { throw new Error("Sin conexión con el servidor."); }
    finally { clearTimeout(to); }
    if (r.status === 401 && auth && retry) { this.sess = null; this.persist(); return this.req(path, { method, body, auth, prefer }, false); }
    const txt = await r.text(); let js = null; try { js = txt ? JSON.parse(txt) : null; } catch (e) {}
    if (!r.ok) throw new Error((js && (js.message || js.msg || js.error_description || js.error)) || `Error ${r.status}`);
    return js;
  }
  // Sesión anónima: se crea la primera vez y se renueva sola
  async ensureSession() {
    const now = Date.now() / 1000;
    if (this.sess && this.sess.access_token && (this.sess.expires_at || 0) - 60 > now) return;
    const auth = async (path, body) => {
      const s = await this.req(path, { method: "POST", body, auth: false });
      if (!s || !s.access_token) throw new Error("No se ha podido iniciar sesión.");
      this.sess = { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || now + (s.expires_in || 3600), user: { id: s.user && s.user.id } };
      this.persist();
    };
    if (this.sess && this.sess.refresh_token) { try { return await auth("/auth/v1/token?grant_type=refresh_token", { refresh_token: this.sess.refresh_token }); } catch (e) { if (/conexión/.test(e.message)) throw e; } }
    try { await auth("/auth/v1/signup", { data: {} }); }
    catch (e) { throw new Error(/anonymous|disabled/i.test(e.message) ? "El inicio de sesión anónimo está desactivado en el servidor." : e.message); }
  }
  // ----- Apodo -----
  static cleanNick(n) { return String(n || "").trim().replace(/\s+/g, " ").slice(0, 16); }
  async setNick(n) {
    n = Online.cleanNick(n);
    if (n.length < 3) throw new Error("El apodo necesita al menos 3 caracteres.");
    if (!/^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ _.-]+$/.test(n)) throw new Error("Usa solo letras, números, espacios, puntos, guiones o guion bajo.");
    await this.ensureSession();
    await this.req("/rest/v1/profiles", { method: "POST", body: { id: this.uid, nickname: n }, prefer: "resolution=merge-duplicates,return=minimal" });
    this.g.save.data.nick = n; this.g.save.save(); this.flush();
    return n;
  }
  // ----- Puntuaciones -----
  // Al acabar una partida (Game.bankRun). Solo si tienes apodo y no juegas con «todas las mejoras» del código
  submitRun(g) {
    if (!BUILD.online) return;
    if (!this.nick || g.versus || g.tutorial || g.netRace || g.save.data.allUpgrades || g.score <= 0) return;
    const mode = g.daily ? "daily" : g.mode.id, day = g.daily ? g.dailyRace.today : dayKey();
    this.queue.push({ p_mode: mode, p_day: day, p_score: Math.floor(g.score), p_level: Math.min(99, g.level.level), p_seconds: Math.round(g.runTime * 10) / 10 });
    this.persist(); this.flush();
  }
  async flush() {
    if (this.flushing || !this.queue.length || !this.nick) return;
    this.flushing = true;
    try {
      while (this.queue.length) {
        try { await this.req("/rest/v1/rpc/submit_score", { method: "POST", body: this.queue[0] }); this.queue.shift(); this.persist(); }
        catch (e) {
          if (/rápido/.test(e.message)) { setTimeout(() => this.flush(), 16000); break; }   // límite de frecuencia: se reintenta
          if (/conexión|sesión|Error 5/.test(e.message)) break;                            // sin red: se queda en la cola
          this.queue.shift(); this.persist();                                              // rechazada (imposible o día pasado)
        }
      }
    } finally { this.flushing = false; }
  }
  leaderboard(mode) { return this.req("/rest/v1/rpc/leaderboard", { method: "POST", body: { p_mode: mode, p_day: mode === "daily" ? this.g.dailyRace.today : null, p_limit: ONLINE_CONFIG.TOP }, auth: !!this.sess }); }
  async myRank(mode) { if (!this.sess) return null; const r = await this.req("/rest/v1/rpc/my_rank", { method: "POST", body: { p_mode: mode, p_day: mode === "daily" ? this.g.dailyRace.today : null } }); return r && r[0]; }
  // ----- Nube -----
  async upload() {
    this.g.save.save();
    const code = await this.req("/rest/v1/rpc/cloud_upload", { method: "POST", body: { p_data: this.g.save.data } });
    this.g.save.data.cloudCode = code; this.g.save.data.cloudAt = new Date().toISOString(); this.g.save.save();
    return code;
  }
  async download(code) {
    const r = await this.req("/rest/v1/rpc/cloud_download", { method: "POST", body: { p_code: code }, auth: false });
    if (!r || !r[0]) throw new Error("No hay ningún guardado con ese código. Revisa que esté bien escrito.");
    return { version: BACKUP_CONFIG.VERSION, date: r[0].updated_at, data: r[0].data };
  }
}
const fmtCloudCode = c => String(c || "").replace(/(.{4})(.{4})(.*)/, "$1-$2-$3");
// =====================================================================
//  Pantalla de ranking mundial: pestañas por modo, top 50, tu puesto y tu apodo
// =====================================================================
class RankingScreen {
  constructor(game) {
    this.g = game; const $ = id => document.getElementById(id);
    this.el = $("ranking"); this.list = $("rkList"); this.msg = $("rkMsg"); this.me = $("rkMe"); this.nick = $("rkNick"); this.mode = "daily";
    $("rkBack").addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); this.close(); });
    $("rkNickOk").addEventListener("click", e => { e.currentTarget.blur(); this.saveNick(); });
    this.nick.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") this.saveNick(); });
    const tabs = $("rkTabs");
    for (const [id, name] of RANK_MODES) { const b = document.createElement("button"); b.className = "tab"; b.dataset.mode = id; b.textContent = name;
      b.addEventListener("click", () => { game.sfx.click(); this.load(id); }); tabs.appendChild(b); }
  }
  get visible() { return !this.el.classList.contains("hidden"); }
  open() { this.nick.value = this.g.online.nick; this.el.classList.remove("hidden"); this.load(this.mode); }
  close() { this.el.classList.add("hidden"); this.g.showMenu(); }
  say(t, k = "") { this.msg.textContent = t; this.msg.className = "bk-msg " + k; }
  async saveNick() {
    this.say("Guardando…");
    try { const n = await this.g.online.setNick(this.nick.value); this.nick.value = n; this.say(`¡Listo, ${n}! Tus partidas ya cuentan para el ranking.`, "ok"); this.g.sfx.buy(); this.load(this.mode); }
    catch (e) { this.say(e.message, "err"); this.g.sfx.denied(); }
  }
  async load(mode) {
    this.mode = mode; const O = this.g.online;
    this.el.querySelectorAll("#rkTabs .tab").forEach(t => t.classList.toggle("active", t.dataset.mode === mode));
    this.list.innerHTML = `<p class="touch-hint">Cargando…</p>`; this.me.textContent = "";
    if (!O.nick) this.say("Elige un apodo para aparecer en el ranking (tus partidas se envían al acabar).");
    try {
      const rows = await O.leaderboard(mode); if (this.mode !== mode) return;
      this.list.innerHTML = rows && rows.length ? `<table class="rk-table"><tr><th>#</th><th>Jugador</th><th>Puntos</th><th>Nivel</th></tr>${rows.map(r =>
        `<tr class="${r.is_me ? "me" : ""}${r.rank <= 3 ? " top" + r.rank : ""}"><td>${r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</td><td>${escapeHtml(r.nickname)}</td><td>${fmtInt(r.score)}</td><td>${r.level}</td></tr>`).join("")}</table>`
        : `<p class="touch-hint">Todavía no hay puntuaciones${mode === "daily" ? " hoy" : ""}. ¡Sé el primero!</p>`;
      const me = await O.myRank(mode).catch(() => null);
      if (this.mode === mode) this.me.textContent = me && me.score != null ? `Tu puesto: ${me.rank} de ${me.total} · tu mejor marca: ${fmtInt(me.score)}` : O.nick ? "Aún no tienes puntuación aquí." : "";
      if (O.nick && O.queue.length) this.say(`${O.queue.length} partida(s) esperando para enviarse.`);
    } catch (e) { if (this.mode === mode) { this.list.innerHTML = ""; this.say(`No se ha podido cargar el ranking: ${e.message}`, "err"); } }
  }
}
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const g_rankMode = g => g.daily ? "daily" : RANK_MODES.some(([m]) => m === g.mode.id) ? g.mode.id : "normal";
// Guardado en la nube dentro de la pantalla Guardar / Cargar (reutiliza el resumen y la confirmación de la copia de seguridad)
SaveBackup.prototype.setupCloud = function () {
  const g = this.g, $ = id => document.getElementById(id), msg = $("cloudMsg"), say = (t, k = "") => { msg.textContent = t; msg.className = "bk-msg " + k; };
  const show = () => { const c = g.save.data.cloudCode; $("cloudCode").innerHTML = c ? `Tu código: <b>${fmtCloudCode(c)}</b>${g.save.data.cloudAt ? ` <small>(subido el ${new Date(g.save.data.cloudAt).toLocaleString(I18N.locale)})</small>` : ""}` : ""; };
  const oldOpen = this.open.bind(this); this.open = () => { oldOpen(); show(); say(""); };
  $("cloudIn").addEventListener("keydown", e => e.stopPropagation());
  $("cloudUp").addEventListener("click", async e => {
    e.currentTarget.blur(); g.sfx.click(); say("Subiendo…");
    try { const c = await g.online.upload(); show(); say(`¡Subido! Apunta tu código: ${fmtCloudCode(c)}`, "ok"); g.sfx.buy(); this.markExported && this.markExported(); }
    catch (err) { say(`No se ha podido subir: ${err.message}`, "err"); g.sfx.denied(); }
  });
  $("cloudDown").addEventListener("click", async e => {
    e.currentTarget.blur(); g.sfx.click(); const code = $("cloudIn").value.trim();
    if (code.replace(/[^A-Za-z0-9]/g, "").length < 10) { say("Escribe el código completo (10 letras y números).", "err"); return; }
    say("Buscando…");
    try {
      const obj = await g.online.download(code); this.pending = obj;
      $("bkSumText").textContent = `Guardado en la nube del ${new Date(obj.date).toLocaleString(I18N.locale)}: ${SaveBackup.summary(obj.data)}.`;
      this.sum.classList.remove("hidden"); say("Encontrado. Revisa el resumen de arriba y confirma para cargarlo.", "ok");
      this.sum.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch (err) { say(err.message, "err"); g.sfx.denied(); }
  });
};

