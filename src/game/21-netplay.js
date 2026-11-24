// =====================================================================
//  Multijugador online (Supabase Realtime, sin servidor propio)
//  Carrera en paralelo: todos corren el MISMO recorrido (semilla compartida) y cada móvil simula su partida.
//  Por el canal de la sala viajan: quién está (presence), la salida, la posición de cada raptor (~8 veces por
//  segundo) y las trampas. Los rivales se ven como fantasmas. Gana quien llegue más lejos.
// =====================================================================
const NET_CONFIG = { MAX: 4, SEND_MS: 200, JOIN_WAIT: 3000, AUTO_START: 7, COUNTDOWN: 3.5, TRAP_EVERY: 8, TRAP_MAX: 2, TRAP_TOTAL: 6, QUICK_WAIT: 4, HEARTBEAT: 25000,
  PRIZE_COINS: [150, 80, 50, 30], PRIZE_XP: [80, 50, 30, 20],
  DRAFT_MIN: 30, DRAFT_MAX: 260, DRAFT_SPEED: 1.1,            // rebufo: ir justo detrás de un rival en tu carril
  BOSS_HP_PER_PLAYER: 0.6, REVIVE: 15, GIFT_TIME: 6,          // cooperativo: vida extra del jefe por jugador, revivir y regalos
  COLORS: ["#ffd23f", "#5fb4ff", "#ff5ce1", "#ff9a3c"] };
// ---------- Cliente mínimo de Supabase Realtime (protocolo Phoenix, JSON vsn 1.0.0) ----------
class RealtimeClient {
  constructor(url) { this.url = url; this.ws = null; this.ref = 0; this.chans = new Map(); this.waits = new Map(); }
  connect() {
    if (this.ws && this.ws.readyState <= 1) return this.ready;
    this.ready = new Promise((res, rej) => {
      let ws; try { ws = new WebSocket(this.url); } catch (e) { rej(new Error("No se ha podido conectar.")); return; }
      this.ws = ws; const to = setTimeout(() => { rej(new Error("Sin conexión con el servidor.")); try { ws.close(); } catch (e) {} }, 9000);
      ws.onopen = () => { clearTimeout(to); res(); };
      ws.onerror = () => { clearTimeout(to); rej(new Error("Sin conexión con el servidor.")); };
      ws.onclose = () => { clearInterval(this.hb); for (const c of this.chans.values()) c.emit("close", {}); this.chans.clear(); };
      ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; }
        if (m.event === "phx_reply" && this.waits.has(m.ref)) { this.waits.get(m.ref)(m.payload); this.waits.delete(m.ref); }
        const c = this.chans.get(m.topic); if (c) c.handle(m); };
      this.hb = setInterval(() => this.push("phoenix", "heartbeat", {}), NET_CONFIG.HEARTBEAT);
    });
    return this.ready;
  }
  push(topic, event, payload, wait) {
    const ref = String(++this.ref);
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ topic, event, payload, ref, join_ref: (this.chans.get(topic) || {}).joinRef || null }));
    return wait ? new Promise(r => { this.waits.set(ref, r); setTimeout(() => { if (this.waits.has(ref)) { this.waits.delete(ref); r({ status: "timeout" }); } }, 8000); }) : null;
  }
  async channel(name, key) {
    await this.connect();
    const topic = "realtime:" + name, c = new RealtimeChannel(this, topic, key); this.chans.set(topic, c);
    c.joinRef = String(this.ref + 1);
    const r = await this.push(topic, "phx_join", { config: { broadcast: { ack: false, self: false }, presence: { key, enabled: true }, private: false } }, true);
    if (!r || r.status !== "ok") {
      this.chans.delete(topic);
      const why = r && r.response && (r.response.reason || r.response.message);
      throw new Error(r && r.status === "timeout" ? "El servidor no responde. Revisa tu conexión." : `No se ha podido entrar en la sala${why ? ` (${why})` : ""}.`);
    }
    return c;
  }
  close() { try { if (this.ws) this.ws.close(); } catch (e) {} this.ws = null; }
}
class RealtimeChannel {
  constructor(rt, topic, key) { this.rt = rt; this.topic = topic; this.key = key; this.subs = {}; this.presence = {}; }
  on(ev, fn) { (this.subs[ev] = this.subs[ev] || []).push(fn); return this; }
  emit(ev, p) { for (const f of this.subs[ev] || []) f(p); }
  handle(m) {
    if (m.event === "broadcast" && m.payload) this.emit("b:" + m.payload.event, m.payload.payload || {});
    else if (m.event === "presence_state") { this.presence = {}; for (const k in m.payload) this.presence[k] = m.payload[k].metas.slice(-1)[0]; this.emit("presence", this.presence); }
    else if (m.event === "presence_diff") {
      for (const k in m.payload.leaves || {}) { const gone = m.payload.leaves[k].metas.map(x => x.phx_ref); if (this.presence[k] && gone.includes(this.presence[k].phx_ref)) delete this.presence[k]; }
      for (const k in m.payload.joins || {}) this.presence[k] = m.payload.joins[k].metas.slice(-1)[0];
      this.emit("presence", this.presence);
    } else if (m.event === "phx_close" || m.event === "phx_error") this.emit("close", {});
  }
  send(event, payload) { this.rt.push(this.topic, "broadcast", { type: "broadcast", event, payload }); }
  track(meta) { return this.rt.push(this.topic, "presence", { type: "presence", event: "track", payload: meta }, true); }
  leave() { this.rt.push(this.topic, "phx_leave", {}); this.rt.chans.delete(this.topic); }
}
const roomCode = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)]).join("");
const NET_MODES = {
  race: { icon: "🏁", name: "Carrera", desc: "Todos contra todos: gana quien llegue más lejos. Sin jefes. Trampas para el rival de delante y rebufo si vas justo detrás de alguien." },
  coop: { icon: "🤝", name: "Cooperativo", desc: "En equipo y con jefes: el daño de todos se suma (el jefe tiene más vida). Si caes, te levantas cuando tu equipo derrota a un jefe o a los 15 s. Regalos de escudo para los compañeros." },
};
// ---------- Lógica de la partida online ----------
class NetPlay {
  constructor(game) {
    this.g = game; this.rt = null; this.room = null; this.lobby = null; this.code = ""; this.mode = "idle";   // idle | quick | room | racing | done
    this.members = {}; this.remotes = {}; this.ready = false; this.traps = 0; this.trapT = 0; this.lastSend = 0;
    this.roomMode = "race"; this.coop = false; this.colors = {};
    this.uidLocal = "p-" + Math.random().toString(36).slice(2, 10);
  }
  get uid() { return this.uidLocal; }   // uno por pestaña: dos pestañas del mismo navegador son dos jugadores distintos
  get nick() { return this.g.online.nick || "Raptor"; }
  get url() { return window.__RT_URL || `${ONLINE_CONFIG.URL.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${ONLINE_CONFIG.KEY}&vsn=1.0.0`; }
  get myColor() { return this.colors[this.uid] || NET_CONFIG.COLORS[0]; }
  get teamN() { return 1 + Object.keys(this.remotes).length; }
  sortedMembers() { return Object.values(this.members).sort((a, b) => (b.c || 0) - (a.c || 0) || a.j - b.j || (a.u < b.u ? -1 : 1)); }
  get host() { const l = this.sortedMembers(); return !!l[0] && l[0].u === this.uid; }
  // Modo de la sala: lo elige el anfitrión (viaja en su ficha)
  get hostMode() { const h = this.sortedMembers()[0]; return h && NET_MODES[h.m] ? h.m : "race"; }
  // Mi ficha en la sala. Los diseños del editor no existen en otros móviles: se envía la skin por defecto
  meta() {
    const s = this.g.save.data, sk = /^(design-|editor-)/.test(this.g.skinId) ? CONFIG.DEFAULT_SKIN : this.g.skinId;
    return { u: this.uid, n: this.nick, sk, h: Object.assign({}, s.acc), ready: this.ready, j: this.joinedAt, c: this.creator ? 1 : 0, m: this.roomMode, racing: this.mode === "racing" };
  }
  setRoomMode(m) { if (!this.host || !NET_MODES[m]) return; this.roomMode = m; if (this.room) this.room.track(this.meta()); this.render(); }
  async ensureRt() { if (!this.rt) this.rt = new RealtimeClient(this.url); await this.rt.connect(); }
  // ----- Salas -----
  async createRoom() { return this.joinRoom(roomCode(), true); }
  async joinRoom(code, creating = false, auto = false) {
    code = String(code || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    if (code.length !== 4) throw new Error("El código de sala tiene 4 letras.");
    if (this.mode === "quick" && !auto) this.stopQuick();
    await this.ensureRt(); if (this.room) this.leaveRoom();
    this.code = code; this.joinedAt = Date.now(); this.ready = auto; this.creator = creating; this.members = {}; this.remotes = {}; this.expect = auto ? this.expect : 0;
    if (creating && !auto) this.roomMode = this.roomMode || "race";
    let gotState; const stateIn = new Promise(r => { gotState = r; });
    const ch = this.room = await this.rt.channel("dino-room-" + code, this.uid);
    ch.on("presence", p => { gotState(); this.onPresence(p); });
    ch.on("b:start", d => this.onStart(d));
    ch.on("b:st", d => this.onState(d));
    ch.on("b:trap", d => { if (d.to === this.uid && this.mode === "racing") this.g.receiveNetTrap(d.type, d.n); });
    ch.on("b:gift", d => { if (d.to === this.uid && this.mode === "racing") this.g.receiveGift(d.type, d.n); });
    ch.on("b:bdmg", d => this.onTeamDamage(d));
    ch.on("b:bdef", d => this.onTeamBoss(d));
    ch.on("b:spec", d => this.onSpec(d));      // modo espectador
    ch.on("b:watch", d => this.onWatch(d));
    ch.on("close", () => this.onLost(ch));
    await Promise.race([stateIn, new Promise(r => setTimeout(r, NET_CONFIG.JOIN_WAIT))]);   // quién hay ya en la sala
    const others = Object.values(this.members).filter(m => m.u !== this.uid);
    if (others.some(m => m.racing)) { this.leaveRoom(); throw new Error("Esa sala ya está jugando una partida. Espera a que acabe."); }
    if (others.length >= NET_CONFIG.MAX) { this.leaveRoom(); throw new Error("La sala está llena (máximo 4)."); }
    this.mode = "room"; await ch.track(this.meta()); this.render();
  }
  leaveRoom() { if (this.room) { const r = this.room; this.room = null; try { r.leave(); } catch (e) {} } this.members = {}; this.mode = "idle"; this.code = ""; this.expect = 0; clearTimeout(this.autoT); }
  // Conexión perdida: en la sala se vuelve al inicio; en partida, sigue y al acabar se dan los resultados conocidos
  onLost(ch) {
    if (this.room !== ch) return;
    this.room = null; this.lost = true;
    if (this.mode === "racing") { this.g.floatText(this.g.player.laneT, this.g.player.x + 40, 170, "SIN CONEXIÓN CON LA SALA", "#ff8a8a", 16); for (const r of Object.values(this.remotes)) if (!r.dead) { r.dead = true; r.left = true; } this.checkEnd(); }
    else { this.mode = "idle"; this.say("Se ha perdido la conexión con la sala.", "err"); this.render(); }
  }
  leaveAll() { this.stopSpectate(false); this.leaveRoom(); this.stopQuick(); if (this.rt) { this.rt.close(); this.rt = null; } this.g.netRace = false; this.g.netCoop = false; this.g.netDraft = false; }
  setReady(v) { this.ready = v; if (this.room) this.room.track(this.meta()); this.render(); this.maybeAutoStart(); }
  onPresence(p) {
    this.members = {}; for (const k in p) if (p[k] && p[k].u) this.members[k] = p[k];
    if (!this.host) this.roomMode = this.hostMode;
    if (this.mode === "racing") for (const id in this.remotes) if (!this.members[id] && !this.remotes[id].left) { const r = this.remotes[id]; r.dead = true; r.left = true; this.checkEnd(); }
    this.render(); this.maybeAutoStart();
  }
  // Partida rápida: el anfitrión arranca solo cuando todos los emparejados han entrado y están listos
  maybeAutoStart() {
    if (!this.host || this.mode !== "room" || !this.expect) return;
    const l = Object.values(this.members);
    if (l.length >= this.expect && l.every(m => m.ready)) { this.expect = 0; clearTimeout(this.autoT); this.startRace(); }
    else if (!this.autoT) this.autoT = setTimeout(() => {   // si alguien del emparejamiento no llega, se empieza con los que hay
      this.autoT = null; if (this.mode === "room" && this.host && this.expect && Object.keys(this.members).length >= 2) { this.expect = 0; this.startRace(); }
    }, NET_CONFIG.AUTO_START * 1000);
  }
  startRace() {
    const l = this.sortedMembers(); if (!this.host || l.length < 2) return;
    const d = { seed: (Math.random() * 2 ** 31) | 0, players: l.map(m => m.u), mode: this.roomMode };
    this.room.send("start", d); this.onStart(d);
  }
  onStart(d) {
    if (!d.players || !d.players.includes(this.uid) || this.mode === "racing") return;
    this.mode = "racing"; this.ready = false; this.result = null; this.traps = 1; this.thrown = 0; this.trapT = 0; this.finishedSent = false; this.lost = false; this.expect = 0; clearTimeout(this.autoT);
    this.coop = d.mode === "coop"; this.roomMode = d.mode || "race";
    this.remotes = {}; this.colors = {}; this.teamDmg = {}; this.applied = {}; this.dmgBy = {}; this.bossLv = new Set(); this.down = false; this.reviveT = 0; this.revives = 0; this.watchers = new Set(); this.spec = null;
    d.players.forEach((u, i) => { this.colors[u] = NET_CONFIG.COLORS[i % NET_CONFIG.COLORS.length]; this.dmgBy[u] = 0; });
    for (const u of d.players) if (u !== this.uid) { const m = this.members[u] || {}; this.remotes[u] = { u, n: m.n || "Rival", sk: m.sk, h: m.h || {}, d: 0, pd: 0, t: performance.now(), pt: performance.now(), l: 0, y: 0, sl: 0, s: 0, dead: false, st: { tick: 0, speed: 2, trail: null, trailFx: null } }; }
    this.g.closeScreens(); this.g.startNet(d.seed, this.coop);
    if (this.room) this.room.track(this.meta());
  }
  // ----- Durante la partida -----
  update(dt) {
    if (this.mode !== "racing") return;
    const g = this.g, now = performance.now(), dead = g.state === "over";
    if (!dead && g.netWait <= 0 && this.traps < NET_CONFIG.TRAP_MAX && this.traps + this.thrown < NET_CONFIG.TRAP_TOTAL && (this.trapT += dt) >= NET_CONFIG.TRAP_EVERY) { this.traps++; this.trapT = 0; g.sfx.tick(); }
    if (this.coop) {
      // Daño del equipo al jefe del nivel: se aplica a mi jefe en cuanto está peleando
      const B = g.bosses.boss, lv = g.level.level, pend = (this.teamDmg[lv] || 0) - (this.applied[lv] || 0);
      if (B && B.state === "fight" && B.hp > 0 && pend > 0) { this.applied[lv] = (this.applied[lv] || 0) + pend; B.damage(Math.ceil(pend), "team"); }
      // Revivir: a los pocos segundos si queda alguien de pie
      if (dead && this.down && Object.values(this.remotes).some(r => !r.dead) && (this.reviveT -= dt) <= 0) this.revive();
    } else {
      // Rebufo: un rival justo delante en tu carril te arrastra
      const p = g.player, myD = g.distance, draft = !dead && g.netWait <= 0 && Object.values(this.remotes).some(r => !r.dead && Math.abs(r.l - p.laneT) < 0.35 && (this.remoteDist(r) - myD) > NET_CONFIG.DRAFT_MIN && (this.remoteDist(r) - myD) < NET_CONFIG.DRAFT_MAX);
      if (draft !== !!g.netDraft) { g.netDraft = draft; g.build.cache = {}; }
    }
    if (!this.room) return;
    this.specSend(now);   // alguien me está mirando: le mando lo que tengo delante
    if (now - this.lastSend >= NET_CONFIG.SEND_MS && (!this.finishedSent || this.coop)) { this.sendState(); this.checkWin(); }
  }
  // Envía mi posición (al caer, una vez más con la puntuación)
  sendState() {
    const g = this.g, p = g.player, dead = g.state === "over"; if (!this.room) { if (dead) this.finishedSent = true; return; }
    this.lastSend = performance.now(); if (dead) this.finishedSent = true;
    this.room.send("st", { u: this.uid, d: Math.round(g.distance), l: Math.round(p.laneT * 100) / 100, y: Math.round(p.y), sl: p.sliding ? 1 : 0, s: g.score, dead: dead ? 1 : 0, lv: g.level.level });
  }
  onState(d) {
    const r = this.remotes[d.u]; if (!r || this.mode !== "racing" || r.left) return;
    const now = performance.now(); if (d.d < r.d - 5) return;   // mensaje viejo que llega tarde
    r.pd = r.d; r.pt = r.t; r.d = d.d; r.t = now; r.l = d.l; r.y = d.y; r.sl = d.sl; r.s = d.s; r.lv = d.lv;
    const g = this.g;
    if (d.dead && !r.dead) { r.dead = true; g.floatText(g.player.laneT, g.player.x + 40, 160, this.coop ? `¡${r.n.toUpperCase()} HA CAÍDO!` : `¡${r.n.toUpperCase()} ELIMINADO!`, "#ff8a8a", 16); this.checkEnd(); }
    else if (!d.dead && r.dead && this.coop) { r.dead = false; g.floatText(g.player.laneT, g.player.x + 40, 160, `¡${r.n.toUpperCase()} HA VUELTO!`, UI_T.go, 16); }
  }
  // Trampas (o escudos) que aún puedes lanzar en esta partida, contando las que tienes preparadas
  get trapsLeft() { return NET_CONFIG.TRAP_TOTAL - (this.thrown || 0); }
  // Distancia estimada de un rival ahora mismo (extrapola entre mensajes)
  remoteDist(r) { if (r.dead) return r.d; const v = r.t > r.pt ? (r.d - r.pd) / (r.t - r.pt) : 0; return r.d + Math.max(0, v) * Math.min(400, performance.now() - r.t); }
  // Botón de acción (Q / 🎯): trampa al rival de delante en la carrera, escudo para el compañero más atrasado en el cooperativo
  throwTrap() {
    const g = this.g; if (this.mode !== "racing" || g.state !== "playing" || g.netWait > 0 || !this.room) return;
    const alive = Object.values(this.remotes).filter(r => !r.dead);
    if (this.trapsLeft <= 0) { g.sfx.denied(); g.floatText(g.player.laneT, g.player.x + 40, g.player.y + 120, this.coop ? "¡YA NO TE QUEDAN ESCUDOS!" : "¡YA NO TE QUEDAN TRAMPAS!", "#ff8a8a", 14); return; }
    if (!alive.length || this.traps <= 0) { g.sfx.denied(); return; }
    this.thrown++;   // cuenta para el máximo de la partida
    if (this.coop) {
      const target = alive.sort((a, b) => this.remoteDist(a) - this.remoteDist(b))[0]; this.traps--;
      this.room.send("gift", { to: target.u, type: "shield", n: this.nick });
      g.sfx.powerup(); g.floatText(g.player.laneT, g.player.x + 40, g.player.y + 120, `ESCUDO PARA ${target.n.toUpperCase()}`, UI_T.go, 16);
      return;
    }
    const me = g.distance, ahead = alive.filter(r => this.remoteDist(r) >= me).sort((a, b) => this.remoteDist(a) - this.remoteDist(b));
    const target = ahead[0] || alive.sort((a, b) => this.remoteDist(b) - this.remoteDist(a))[0];
    const type = choice(TRAP_TYPES).id; this.traps--;
    this.room.send("trap", { to: target.u, type, n: this.nick });
    g.sfx.toss(); g.floatText(g.player.laneT, g.player.x + 40, g.player.y + 120, `TRAMPA PARA ${target.n.toUpperCase()}`, UI_T.weak, 16);
  }
  // ----- Cooperativo: jefes compartidos -----
  sendBossDmg(n) {
    if (!this.coop || this.mode !== "racing" || n <= 0) return;
    const lv = this.g.level.level; this.dmgBy[this.uid] = (this.dmgBy[this.uid] || 0) + n;
    if (this.room) this.room.send("bdmg", { u: this.uid, lv, a: n });
  }
  onTeamDamage(d) {
    if (!this.coop || this.mode !== "racing" || d.u === this.uid) return;
    this.teamDmg[d.lv] = (this.teamDmg[d.lv] || 0) + d.a; this.dmgBy[d.u] = (this.dmgBy[d.u] || 0) + d.a;
    const r = this.remotes[d.u], B = this.g.bosses.boss;
    if (r && B && B.state === "fight" && this.g.level.level === d.lv) { const pt = B.target(); this.g.floatText(pt.laneT, pt.x, pt.y + 60, `${r.n.toUpperCase()} -${d.a}`, this.colors[d.u], 16); }
  }
  onLocalBossDefeated() {
    if (!this.coop || this.mode !== "racing") return;
    const lv = this.g.level.level; this.bossLv.add(lv);
    if (this.room) this.room.send("bdef", { u: this.uid, lv });
  }
  onTeamBoss(d) {
    if (!this.coop || this.mode !== "racing") return;
    const first = !this.bossLv.has(d.lv); this.bossLv.add(d.lv);
    if (this.down && this.g.state === "over") { this.revive(); return; }   // ¡el equipo te levanta!
    const r = this.remotes[d.u]; if (first && r) this.g.floatText(this.g.player.laneT, this.g.player.x + 40, 190, `¡${r.n.toUpperCase()} HA TUMBADO AL JEFE!`, UI_T.weak, 16);
  }
  revive() {
    if (!this.down || this.mode !== "racing") return;
    this.stopSpectate(); this.down = false; this.revives++; this.finishedSent = false; this.g.netRevive(); this.sendState();
  }
  onLocalDeath() {
    if (this.mode !== "racing") return;
    this.sendState();
    if (this.coop) { this.down = true; this.reviveT = NET_CONFIG.REVIVE; }
    this.checkEnd();
  }
  // Carrera: el último que queda gana en cuanto supera a todos
  checkWin() {
    const g = this.g, rs = Object.values(this.remotes);
    if (this.coop || this.mode !== "racing" || g.state !== "playing" || !rs.length || rs.some(r => !r.dead)) return;
    if (g.score > Math.max(...rs.map(r => r.s))) { g.floatText(g.player.laneT, g.player.x + 40, 150, "¡ERES EL ÚLTIMO EN PIE!", UI_T.weak, 22); g.netFinish(); }
  }
  standings() {
    const g = this.g, me = { u: this.uid, n: this.nick, s: g.score, dead: g.state === "over", me: true, d: g.distance, dmg: this.dmgBy[this.uid] || 0 };
    return [me, ...Object.values(this.remotes).map(r => ({ u: r.u, n: r.n, s: r.s, dead: r.dead, left: r.left, d: this.remoteDist(r), dmg: this.dmgBy[r.u] || 0 }))].sort((a, b) => b.s - a.s);
  }
  checkEnd() {
    if (this.mode !== "racing") return;
    if (this.g.state !== "over" || Object.values(this.remotes).some(r => !r.dead)) { this.renderWait(); return; }
    if (this.coop && !this.lost && !this.endConfirm) {   // el cooperativo espera un momento por si alguien se acaba de levantar
      this.endConfirm = setTimeout(() => { this.endConfirm = null; if (this.mode === "racing" && this.g.state === "over" && Object.values(this.remotes).every(r => r.dead)) this.finish(); else this.renderWait(); }, 1500);
      return;
    }
    if (!this.coop || this.lost) this.finish();
  }
  finish() {
    if (this.mode !== "racing") return;
    this.stopSpectate(); this.mode = "done"; clearTimeout(this.endConfirm); this.endConfirm = null;
    const g = this.g, list = this.standings(), place = list.findIndex(x => x.me), n = list.length, lost = !!this.lost;
    g.bankRun();   // las monedas de la partida (en online se guardan al final)
    let coins = 0, xp = 0, team = 0;
    if (this.coop) {
      team = list.reduce((a, p) => a + p.s, 0);
      if (!lost && n > 1) { coins = Math.min(400, Math.round(team / 25)) + 60 * this.bossLv.size; xp = Math.min(250, Math.round(team / 40)) + 40 * this.bossLv.size; }
    } else if (!lost && n > 1) { coins = NET_CONFIG.PRIZE_COINS[place] || 0; xp = NET_CONFIG.PRIZE_XP[place] || 0; }
    const s = g.save; s.data.coins += coins; const ups = g.season.addXP(xp);
    if (!this.coop) s.data.netWins = (s.data.netWins || 0) + (place === 0 && n > 1 && !lost ? 1 : 0);
    s.save();
    this.result = { list, place, coins, xp, ups, lost, coop: this.coop, team, bosses: this.bossLv.size };
    if (this.room) this.room.track(this.meta());
    this.showResult();
  }
  // ----- Pantallas -----
  say(t, k = "") { const m = document.getElementById("netMsg"); if (m) { m.textContent = t; m.className = "bk-msg " + k; } }
  render() { if (this.g.netScreen) this.g.netScreen.render(); }
  renderWait() { this.waitView(); }
  showResult() { this.g.netScreen.showResult(this.result); }
  // ----- Partida rápida (sala de espera común; siempre en modo Carrera) -----
  async quickMatch() {
    await this.ensureRt(); this.stopQuick(); if (this.room) this.leaveRoom();
    this.mode = "quick"; this.joinedAt = Date.now(); this.roomMode = "race";
    const lb = this.lobby = await this.rt.channel("dino-lobby", this.uid);
    lb.on("presence", p => this.onLobby(p));
    lb.on("b:match", d => { if (d.members.includes(this.uid) && this.mode === "quick") this.goMatch(d); });
    await lb.track({ u: this.uid, n: this.nick, j: this.joinedAt });
    this.render();
  }
  onLobby(p) {
    const list = Object.values(p).filter(m => m && m.u).sort((a, b) => a.j - b.j || (a.u < b.u ? -1 : 1));
    this.lobbyCount = list.length; this.render();
    if (!list.length || list[0].u !== this.uid || list.length < 2) { clearTimeout(this.mmTimer); this.mmTimer = null; return; }
    const go = () => { if (this.mode !== "quick" || !this.lobby) return; const cur = Object.values(this.lobby.presence).filter(m => m && m.u).sort((a, b) => a.j - b.j);
      if (cur.length < 2) return; const d = { code: roomCode(), members: cur.slice(0, NET_CONFIG.MAX).map(m => m.u), host: this.uid }; this.lobby.send("match", d); this.goMatch(d); };
    if (list.length >= NET_CONFIG.MAX) { clearTimeout(this.mmTimer); go(); }
    else if (!this.mmTimer) this.mmTimer = setTimeout(go, NET_CONFIG.QUICK_WAIT * 1000);   // espera unos segundos por si entra alguien más
  }
  async goMatch(d) {
    this.stopQuick(); this.expect = d.members.length;
    try { await this.joinRoom(d.code, d.host === this.uid, true); this.say("¡Rival encontrado! Empezando…", "ok"); }
    catch (e) { this.say(e.message, "err"); }
  }
  stopQuick() { clearTimeout(this.mmTimer); this.mmTimer = null; if (this.lobby) { try { this.lobby.leave(); } catch (e) {} this.lobby = null; } if (this.mode === "quick") this.mode = "idle"; }
  // ----- Dibujo de los rivales: semitransparentes, con el contorno de su color y su apodo -----
  drawGhosts(c) {
    if (this.mode !== "racing" && this.mode !== "done") return;
    const g = this.g, S = CONFIG.RAPTOR_SCALE, sp = this.spec, tgt = sp && this.remotes[sp.u], myD = tgt ? this.remoteDist(tgt) : g.distance, pl = tgt ? { x: PLAYER_X, laneT: clamp(tgt.l, 0, 1) } : g.player;   // espectando: la cámara sigue al compañero
    const order = Object.values(this.remotes).map((r, idx) => [r, idx]); if (tgt) order.sort((a, b) => (a[0] === tgt) - (b[0] === tgt));   // el que sigues, encima
    order.forEach(([r, idx]) => {
      if (r.left) return;
      const x = pl.x + (this.remoteDist(r) - myD), lane = clamp(r.l, 0, 1), sk = SE.get(r.sk) ? r.sk : CONFIG.DEFAULT_SKIN, col = this.colors[r.u] || "#ffffff";
      if (x < -60 || x > W + 10) {   // fuera de la pantalla: flecha con la distancia
        if (r.dead) return;
        const right = x > W, pts = Math.round(Math.abs(this.remoteDist(r) - myD) / CONFIG.PX_PER_POINT);
        g.ui.pill(c, `${right ? "" : "◀ "}${r.n} ${right ? "+" : "-"}${pts}${right ? " ▶" : ""}`, right ? W - 90 : 90, 230 + idx * 24, 9, "#16111f", col);
        return;
      }
      const overlap = r !== tgt && Math.abs(lane - pl.laneT) < 0.35 && Math.abs(x - pl.x) < 60;   // encima de ti: más transparente
      r.st.tick = Math.floor(g.time / CONFIG.SKIN_TICK); r.st.duck = !!r.sl; r.st.hat = r.h || null;
      const jumpY = r.y / S, frame = r.dead ? "idle" : jumpY > 0 ? "jump" : r.sl ? (r.st.tick % 4 < 2 ? "duck1" : "duck2") : SE.runFrame(sk, r.st.tick).frame, oy = Math.round(-1 - SE.H + 1 - jumpY);
      c.save(); applyLane(c, lane); c.translate(x, 0);
      const a = r.dead ? 0.2 : r === tgt ? 0.92 : overlap ? 0.28 : 0.45;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) SE.drawSprite(c, sk, frame, dx * 0.7, oy + dy * 0.7, S, r.st.tick, { tint: col, alpha: a + 0.25 });   // contorno de su color
      c.globalAlpha = a; drawRaptor(c, sk, r.st, jumpY, r.dead, false);
      c.restore();
      const tp = toScreen(lane, x + 36, r.y + (r.sl ? 50 : 90) + idx * 20 + (overlap ? 26 : 0));   // etiquetas escalonadas; si va encima de ti, más arriba
      g.ui.pill(c, (r === tgt ? "👁 " : "") + r.n.toUpperCase() + (r.dead ? (this.coop ? " 💤" : " ✖") : ""), clamp(tp.x, 70, W - 70), tp.y, 9, "#16111f", r.dead ? "#8a8098" : col);
    });
  }
  // Marcador (a la derecha): posiciones en la carrera, estado del equipo en el cooperativo
  drawHud(c, ui) {
    const g = this.g; if (this.mode !== "racing" && this.mode !== "done") return;
    const list = this.standings(), x = W - 210, y = 132, h = 18 * list.length + 30 + (this.coop ? 18 : 0);
    ui.panel(c, x, y, 196, h);
    ui.text(c, this.coop ? `🤝 EQUIPO · SALA ${this.code}` : `🏁 CARRERA · SALA ${this.code}`, x + 10, y + 12, 9, UI_T.dim);
    list.forEach((p, i) => {
      const yy = y + 30 + i * 18, col = p.dead ? "#8a8098" : UI_T.text, dot = this.colors[p.u] || "#fff";
      c.fillStyle = UI_T.line; c.fillRect(x + 8, yy - 6, 12, 12); c.fillStyle = dot; c.fillRect(x + 10, yy - 4, 8, 8);
      ui.text(c, `${this.coop ? "" : i + 1 + "º "}${p.n.slice(0, 10)}${p.me ? " (tú)" : ""}${p.dead ? (this.coop ? " 💤" : " ✖") : ""}`, x + 26, yy, 10, p.me ? UI_T.weak : col);
      ui.text(c, fmtInt(p.s), x + 186, yy, 10, p.me ? UI_T.weak : col, "right");
    });
    if (this.coop) ui.text(c, `JEFES DERROTADOS: ${this.bossLv.size} · EQUIPO ${fmtInt(list.reduce((a, p) => a + p.s, 0))}`, x + 10, y + h - 12, 9, UI_T.weak);
    const ty = y + h + 18, key = this.g.touchMode ? "" : " · " + this.g.controls.label("trap");
    const left = this.trapsLeft, txt = left <= 0 ? (this.coop ? "🎁 SIN ESCUDOS" : "🎯 SIN TRAMPAS") : `${this.coop ? "🎁 ESCUDOS" : "🎯 TRAMPAS"} ×${this.traps}${key} · QUEDAN ${left}`;
    ui.pill(c, txt, x + 98, ty, 9, this.traps ? "#16111f" : UI_T.dim, this.traps ? (this.coop ? UI_T.go : UI_T.weak) : UI_T.pill);
    const sb = this.spec && this.spec.boss;
    if (sb) {   // espectando un combate: vida del jefe del compañero
      const bw = 320, bx = Math.round(W / 2 - bw / 2), by = 40;
      ui.text(c, "⚔ " + String(sb[0] || "JEFE").toUpperCase(), W / 2, 20, 14, "#ff8a9a", "center");
      c.fillStyle = UI_T.line; c.fillRect(bx - 5, by - 5, bw + 10, 24); c.fillStyle = "#3a2f50"; c.fillRect(bx, by, bw, 14);
      c.fillStyle = "#ff5c6c"; c.fillRect(bx, by, Math.round(bw * clamp(sb[1] / Math.max(1, sb[2]), 0, 1)), 14);
    }
    if (g.netDraft && g.state === "playing") ui.pill(c, "💨 ¡REBUFO! +10 % VELOCIDAD", W / 2, H - 40, 10, "#16111f", UI_T.info);
  }
}
// Daño a los jefes: en el cooperativo se comparte con el equipo (el daño que llega del equipo no se reenvía)
const _bossDamageNet = Boss.prototype.damage;
Boss.prototype.damage = function (n, kind, at) {
  const h0 = this.hp, r = _bossDamageNet.call(this, n, kind, at);
  if (r && kind !== "team" && this.game.netCoop) this.game.net.sendBossDmg(h0 - this.hp);
  return r;
};
// ---------- Pantalla Online (apodo, partida rápida, crear / unirse a sala, sala de espera) y resultados ----------
class NetScreen {
  constructor(game) {
    this.g = game; const $ = id => document.getElementById(id), net = game.net;
    this.el = $("net"); this.res = $("netResult");
    const bind = (id, fn) => $(id).addEventListener("click", async e => { e.currentTarget.blur(); game.sfx.unlock(); game.sfx.click(); try { await fn(); } catch (err) { net.say(err.message, "err"); game.sfx.denied(); this.render(); } });
    bind("netBack", () => this.close());
    bind("netNickOk", async () => {
      const n = Online.cleanNick($("netNick").value);
      if (n.length < 3) throw new Error("El apodo necesita al menos 3 caracteres.");
      game.save.data.nick = n; game.save.save(); net.say(`¡Hola, ${n}!`, "ok"); this.render();
      game.online.setNick(n).catch(() => {});   // también para el ranking (si el servidor lo permite)
    });
    bind("netQuick", async () => { this.needNick(); net.say("Buscando rival…"); await net.quickMatch(); });
    bind("netCreate", async () => { this.needNick(); await net.createRoom(); net.say("Sala creada. Elige el modo y pasa el código a tus amigos.", "ok"); });
    bind("netJoin", async () => { this.needNick(); await net.joinRoom($("netCodeIn").value);
      if (Object.keys(net.members).length < 2) net.say("No hay nadie en esa sala todavía: comprueba el código o espera a tus amigos.", "err"); else net.say("¡Dentro! Pulsa «Estoy listo».", "ok"); });
    bind("netCancel", () => { net.stopQuick(); net.say(""); this.render(); });
    bind("netReady", () => net.setReady(!net.ready));
    bind("netModeRace", () => net.setRoomMode("race"));
    bind("netModeCoop", () => net.setRoomMode("coop"));
    bind("netStart", () => { if (Object.keys(net.members).length < 2) throw new Error("Hacen falta al menos 2 jugadores."); net.startRace(); });
    bind("netLeave", () => { net.leaveRoom(); net.say(""); this.render(); });
    bind("nrAgain", () => { if (!net.room) { net.leaveAll(); this.g.showMenu(); return; } this.res.classList.add("hidden"); net.mode = "room"; net.ready = false; game.netRace = false; game.netCoop = false; game.netDraft = false; game.state = "net"; game.reset(); game.closeScreens(); this.el.classList.remove("hidden"); if (net.room) net.room.track(net.meta()); this.render(); });
    bind("nrSpec", () => net.toggleBoard());
    bind("specPrev", () => net.specCycle(-1));
    bind("specNext", () => net.specCycle(1));
    bind("specBoard", () => net.toggleBoard());
    bind("nrExit", () => { this.res.classList.add("hidden"); net.leaveAll(); game.showMenu(); });
    for (const id of ["netNick", "netCodeIn"]) $(id).addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") $(id === "netNick" ? "netNickOk" : "netJoin").click(); });
  }
  get visible() { return !this.el.classList.contains("hidden"); }
  // Si has escrito el apodo pero no has pulsado Guardar, se guarda solo
  needNick() {
    if (this.g.online.nick) return;
    const n = Online.cleanNick(document.getElementById("netNick").value);
    if (n.length < 3) throw new Error("Primero elige un apodo (mínimo 3 caracteres).");
    this.g.save.data.nick = n; this.g.save.save(); this.g.online.setNick(n).catch(() => {});
  }
  open() { document.getElementById("netNick").value = this.g.online.nick; this.el.classList.remove("hidden"); this.render(); }
  close() { this.g.net.leaveAll(); this.el.classList.add("hidden"); this.g.showMenu(); }
  render() {
    const net = this.g.net, $ = id => document.getElementById(id), inRoom = net.mode === "room" && !!net.room;
    $("netHome").classList.toggle("hidden", inRoom); $("netRoom").classList.toggle("hidden", !inRoom);
    $("netSearching").classList.toggle("hidden", net.mode !== "quick");
    if (net.mode === "quick") $("netSearchTxt").textContent = `Buscando rival… (${Math.max(0, (net.lobbyCount || 1) - 1)} esperando)`;
    if (!inRoom) return;
    $("netCode").textContent = net.code;
    const mode = net.host ? net.roomMode : net.hostMode, M = NET_MODES[mode];
    for (const [id, m] of [["netModeRace", "race"], ["netModeCoop", "coop"]]) { const b = $(id); b.classList.toggle("sel", mode === m); b.disabled = !net.host && mode !== m; }
    $("netModeDesc").textContent = `${M.icon} ${M.desc}${net.host ? "" : " (lo elige el anfitrión)"}`;
    const list = net.sortedMembers(), box = $("netPlayers"); box.innerHTML = "";
    list.forEach((m, i) => {
      const d = document.createElement("div"); d.className = "net-p" + (m.ready ? " ready" : "") + (m.u === net.uid ? " me" : "");
      d.style.setProperty("--pc", NET_CONFIG.COLORS[i % NET_CONFIG.COLORS.length]);
      d.innerHTML = `<canvas width="96" height="60"></canvas><b>${escapeHtml(m.n)}${i === 0 ? " 👑" : ""}${m.u === net.uid ? " (tú)" : ""}</b><small>${m.ready ? "✔ Listo" : "Esperando…"}</small>`;
      const cv = d.querySelector("canvas"), x = cv.getContext("2d"); x.imageSmoothingEnabled = false;
      drawSkinPreview(x, SE.get(m.sk) ? m.sk : CONFIG.DEFAULT_SKIN, { tick: 3, speed: 2, trail: null, hat: m.h || null, trailFx: null }, 96, 60, 2);
      box.appendChild(d);
    });
    for (let i = list.length; i < NET_CONFIG.MAX; i++) { const d = document.createElement("div"); d.className = "net-p empty"; d.innerHTML = "<small>Hueco libre</small>"; box.appendChild(d); }
    $("netReady").textContent = net.ready ? "✔ Listo (quitar)" : "Estoy listo";
    $("netStart").classList.toggle("hidden", !net.host);
    $("netStart").disabled = list.length < 2 || !list.every(m => m.ready);
    $("netRoomHint").textContent = net.host ? (list.length < 2 ? "Esperando a que entre alguien con el código…" : list.every(m => m.ready) ? "¡Todos listos! Pulsa Empezar." : "Esperando a que todos estén listos…") : "El anfitrión (👑) empezará la partida cuando todos estéis listos.";
  }
  showWaiting() {
    const net = this.g.net, $ = id => document.getElementById(id);
    if (net.coop) {
      const anyAlive = Object.values(net.remotes).some(r => !r.dead);
      $("nrTitle").textContent = "¡HAS CAÍDO!";
      $("nrSub").textContent = anyAlive ? `Te levantas en ${Math.max(0, Math.ceil(net.reviveT))} s o en cuanto tu equipo derrote a un jefe` : "Todo el equipo ha caído…";
    } else { $("nrTitle").textContent = "¡ELIMINADO!"; $("nrSub").textContent = "Esperando a que terminen los demás…"; }
    $("nrList").innerHTML = net.standings().map((p, i) => `<div class="${p.me ? "me" : ""}" style="--pc:${net.colors[p.u] || "#fff"}"><b>${net.coop ? "●" : i + 1 + "º"}</b><span>${escapeHtml(p.n)}</span><em>${fmtInt(p.s)}</em><small>${p.dead ? (p.left ? "se fue" : net.coop ? "💤 caído" : "✖") : "🏃 corriendo"}</small></div>`).join("");
    $("nrActions").classList.add("hidden"); $("nrSpec").classList.toggle("hidden", !net.spec); this.res.classList.remove("hidden");
  }
  // Barra del modo espectador (abajo, sobre el juego)
  specBar(spec) {
    const net = this.g.net, $ = id => document.getElementById(id), bar = $("specBar"), r = spec && net.remotes[spec.u];
    bar.classList.toggle("hidden", !r || spec.board);
    if (!r) return;
    const alive = net.specAlive().length;
    bar.style.setProperty("--pc", net.colors[r.u] || "#fff");
    $("specName").textContent = r.n;
    $("specInfo").textContent = `${fmtInt(r.s)} pts` + (net.coop && net.down ? ` · te levantas en ${Math.max(0, Math.ceil(net.reviveT))} s` : "");
    $("specPrev").disabled = $("specNext").disabled = alive < 2;
  }
  showResult(r) {
    const $ = id => document.getElementById(id), n = r.list.length, net = this.g.net;
    if (r.coop) {
      const mvp = r.list.slice().sort((a, b) => b.dmg - a.dmg)[0];
      $("nrTitle").textContent = r.lost ? "CONEXIÓN PERDIDA" : "¡BUEN TRABAJO, EQUIPO!";
      $("nrSub").textContent = r.lost ? "Se cortó la conexión con la sala: la partida no cuenta (las monedas recogidas sí)."
        : `Equipo: ${fmtInt(r.team)} puntos · ${r.bosses} jefe${r.bosses === 1 ? "" : "s"} derrotado${r.bosses === 1 ? "" : "s"} · +${r.coins} monedas · +${r.xp} XP${r.ups.length ? " · ¡subes de nivel en el pase!" : ""}`;
      $("nrList").innerHTML = r.list.map(p => `<div class="${p.me ? "me" : ""}" style="--pc:${net.colors[p.u] || "#fff"}"><b>${mvp && mvp.u === p.u && mvp.dmg > 0 ? "⭐" : "●"}</b><span>${escapeHtml(p.n)}${mvp && mvp.u === p.u && mvp.dmg > 0 ? " · MVP" : ""}</span><em>${fmtInt(p.s)}</em><small>${p.left ? "se fue" : `💥 ${p.dmg} al jefe`}</small></div>`).join("");
    } else {
      $("nrTitle").textContent = r.lost ? "CONEXIÓN PERDIDA" : n < 2 ? "FIN DE LA CARRERA" : r.place === 0 ? "¡HAS GANADO!" : `${r.place + 1}º PUESTO`;
      $("nrSub").textContent = r.lost ? "Se cortó la conexión con la sala: la carrera no cuenta (las monedas recogidas sí)." : n < 2 ? "Te has quedado solo en la sala." : `+${r.coins} monedas · +${r.xp} XP del pase${r.ups.length ? " · ¡subes de nivel en el pase!" : ""}`;
      $("nrList").innerHTML = r.list.map((p, i) => `<div class="${p.me ? "me" : ""} p${i + 1}" style="--pc:${net.colors[p.u] || "#fff"}"><b>${["🥇", "🥈", "🥉", "4º"][i] || i + 1 + "º"}</b><span>${escapeHtml(p.n)}</span><em>${fmtInt(p.s)}</em><small>${p.left ? "se fue" : ""}</small></div>`).join("");
    }
    $("nrSpec").classList.add("hidden"); $("nrAgain").classList.toggle("hidden", !net.room);   // sin conexión no hay revancha
    $("nrActions").classList.remove("hidden"); this.res.classList.remove("hidden");
    if (!r.lost && (r.coop || (r.place === 0 && n > 1))) this.g.sfx.jackpot();
  }
}

