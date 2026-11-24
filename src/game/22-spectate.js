// =====================================================================
//  Modo espectador (online): al caer sigues a un compañero que sigue vivo (◀ ▶ para cambiar).
//  Quien está siendo observado envía ~8 veces por segundo lo que tiene delante (obstáculos y jefe);
//  el espectador lo reconstruye y lo mueve entre mensajes. Tu partida se guarda aparte y vuelve si revives.
// =====================================================================
const SPEC_CONFIG = { SEND_MS: 120, AHEAD: W + 160 };
const SPEC_KIND = { ground: "g", rock: "r", flyer: "f", stalactite: "s" }, SPEC_KIND_R = { g: "ground", r: "rock", f: "flyer", s: "stalactite" };
// Obstáculo → [id, tipo, carril, x, parámetros, estilo, velocidad extra]
function specEncode(o) {
  let p = "";
  if (o.kind === "ground") p = (Object.keys(GROUND_SIZES).find(k => GROUND_SIZES[k].w === o.pw && GROUND_SIZES[k].h === o.h) || "small") + o.count;
  else if (o.kind === "rock") p = o.size;
  else if (o.kind === "flyer") p = o.diver ? "mid*" : Object.keys(FLYER_HEIGHTS).find(k => FLYER_HEIGHTS[k] === o.y) || "mid";
  return [o.nid, SPEC_KIND[o.kind] || "s", o.lane, Math.round(o.x), p, o.style, Math.round(o.extra || 0)];
}
function specDecode(a) {
  const [id, k, lane, x, p, style, extra] = a, kind = SPEC_KIND_R[k] || "stalactite", ps = String(p || "");
  let opts = {};
  if (kind === "ground") { const m = /^([a-z]+)(\d*)$/.exec(ps) || []; opts = { size: GROUND_SIZES[m[1]] ? m[1] : "small", count: clamp(+m[2] || 1, 1, 4) }; }
  else if (kind === "rock") opts = { size: ROCK_SIZES[ps] ? ps : "small" };
  else if (kind === "flyer") { const h = ps.replace("*", ""); opts = { h: FLYER_HEIGHTS[h] != null ? h : "mid", diver: ps.includes("*") }; }
  const o = new Obstacle(kind, lane ? 1 : 0, +x || 0, opts, { obstacles: { ground: style, rock: style, flyer: style } });
  o.nid = id; o.extra = +extra || 0; return o;
}
Object.assign(NetPlay.prototype, {
  // ----- Quien es observado -----
  onWatch(d) {
    if (!this.watchers) this.watchers = new Set();
    if (d.t === this.uid) this.watchers.add(d.u); else this.watchers.delete(d.u);
  },
  specSend(now) {
    const g = this.g; if (!this.room || !this.watchers || !this.watchers.size || g.state !== "playing" || now - (this.lastSpec || 0) < SPEC_CONFIG.SEND_MS) return;
    for (const u of this.watchers) if (!this.members[u] || !this.remotes[u] || this.remotes[u].left) this.watchers.delete(u);
    if (!this.watchers.size) return;
    this.lastSpec = now; this.nidSeq = this.nidSeq || 0;
    const p = g.player, o = [];
    for (const ob of g.obstacles) if (!ob.dead && ob.x < PLAYER_X + SPEC_CONFIG.AHEAD && ob.x + ob.w > -60) { if (!ob.nid) ob.nid = ++this.nidSeq; o.push(specEncode(ob)); }
    const B = g.bosses.boss, b = B && B.state !== "leave" ? [B.name, B.hp, B.maxHp] : null;
    this.lastSend = now;   // este mensaje también vale como estado
    this.room.send("spec", { u: this.uid, d: Math.round(g.distance), l: Math.round(p.laneT * 100) / 100, y: Math.round(p.y), sl: p.sliding ? 1 : 0, s: g.score, dead: 0, lv: g.level.level, o, b });
  },
  // ----- Espectador -----
  onSpec(d) {
    this.onState(d);   // posición, carril y puntos (como un mensaje normal)
    const S = this.spec, g = this.g; if (!S || d.u !== S.u || this.mode !== "racing") return;
    const seen = new Set();
    for (const a of d.o || []) {
      let o = S.obs.get(a[0]);
      if (!o) { o = specDecode(a); S.obs.set(a[0], o); g.obstacles.push(o); } else o.x = a[3];
      seen.add(a[0]);
    }
    for (const [id, o] of S.obs) if (!seen.has(id)) { if (o.x > PLAYER_X - 20 && o.x < W) g.puff(o.x + o.w / 2, o.y || 0, o.lane, 8, "#ffffff"); S.obs.delete(id); }   // roto por su rugido
    g.obstacles = g.obstacles.filter(o => S.obs.has(o.nid));
    S.boss = d.b || null; S.lv = d.lv;
    const bi = Math.max(0, (d.lv || 1) - 1) % BIOMES.length; if (g.level.cur !== bi) g.level.setBiome(bi);
  },
  specAlive() { return Object.values(this.remotes || {}).filter(r => !r.dead && !r.left); },
  startSpectate(u) {
    const g = this.g;
    if (!this.spec) {   // guarda tu partida tal cual (vuelve si revives)
      this.spec = { u: null, obs: new Map(), boss: null, board: false, stash: { obstacles: g.obstacles, coinsArr: g.coinsArr, powerups: g.powerups, eggs: g.eggs, hatches: g.hatches, biome: g.level.cur, portal: g.level.portal, boss: g.bosses.boss, scroll: g.scroll } };
      g.coinsArr = []; g.powerups = []; g.eggs = []; g.hatches = []; g.level.portal = null; g.bosses.boss = null;
    }
    if (this.spec.u === u) return;
    this.spec.u = u; this.spec.obs.clear(); this.spec.boss = null; g.obstacles = [];
    if (this.room) this.room.send("watch", { u: this.uid, t: u });
  },
  stopSpectate(restore = true) {
    const S = this.spec, g = this.g; if (!S) return;
    this.spec = null; if (this.room) this.room.send("watch", { u: this.uid, t: null });
    if (restore) { const st = S.stash; Object.assign(g, { obstacles: st.obstacles, coinsArr: st.coinsArr, powerups: st.powerups, eggs: st.eggs, hatches: st.hatches, scroll: st.scroll }); g.level.portal = st.portal; g.bosses.boss = st.boss; g.level.cur = g.level.prev = st.biome; g.level.fade = 1; }
    g.netScreen.specBar(null);
  },
  specCycle(dir) {
    const alive = this.specAlive(); if (!this.spec || alive.length < 1) return;
    const i = alive.findIndex(r => r.u === this.spec.u), next = alive[(i + dir + alive.length) % alive.length];
    this.spec.board = false; this.startSpectate(next.u); this.g.sfx.click(); this.waitView();
  },
  toggleBoard() { if (!this.spec) return; this.spec.board = !this.spec.board; this.g.sfx.click(); this.waitView(); },
  // Qué se ve mientras estás fuera: el compañero que sigues (con una barra abajo) o la clasificación
  waitView() {
    const g = this.g; if (this.mode !== "racing" || g.state !== "over" || !g.overShown) return;
    const alive = this.specAlive();
    if (alive.length) { if (!this.spec || !alive.some(r => r.u === this.spec.u)) this.startSpectate(alive.sort((a, b) => this.remoteDist(b) - this.remoteDist(a))[0].u); }
    else if (this.spec) this.stopSpectate();
    if (!this.spec || this.spec.board) g.netScreen.showWaiting(); else g.netScreen.res.classList.add("hidden");
    g.netScreen.specBar(this.spec);
  },
  updateSpectate(dt) {
    const S = this.spec, g = this.g, r = S && this.remotes[S.u]; if (!S) return;
    if (!r || r.dead || r.left) { this.waitView(); return; }
    const v = r.t > r.pt ? clamp((r.d - r.pd) / (r.t - r.pt) * 1000, 0, 3000) : 0;
    for (const o of g.obstacles) o.update(dt, v, g);
    g.obstacles = g.obstacles.filter(o => o.x + o.w > DESPAWN_X || !S.obs.delete(o.nid));
    g.scroll = this.remoteDist(r);
  },
});

