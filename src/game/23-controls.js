// =====================================================================
//  Controles configurables (Opciones → Controles): cada acción admite dos teclas.
//  Grupos: «1 jugador» (también online) y «Multijugador local» (J1 y J2 comparten teclado, sin repetir teclas).
// =====================================================================
const CONTROL_ACTIONS = {
  solo: [["jump", "Saltar · doble salto · planear"], ["slide", "Deslizarse · caída rápida"], ["laneUp", "Carril de arriba"], ["laneDown", "Carril de abajo"], ["roar", "Rugido · súper rugido"], ["trap", "Trampa / escudo (online)"], ["pause", "Pausa"]],
  vs1: [["jump", "Saltar"], ["slide", "Deslizarse"], ["roar", "Rugido"], ["trap", "Trampa"]],
  vs2: [["jump", "Saltar"], ["slide", "Deslizarse"], ["roar", "Rugido"], ["trap", "Trampa"]],
};
const CONTROL_PRESETS = {
  wasd:   { name: "WASD", desc: "W saltar · S deslizarse · A/D carril · E rugido",
            solo: { jump: ["w", ""], slide: ["s", ""], laneUp: ["a", ""], laneDown: ["d", ""], roar: ["e", ""], trap: ["q", ""], pause: ["p", ""] } },
  arrows: { name: "Flechas", desc: "↑ saltar · ↓ deslizarse · ←/→ carril · Espacio rugido",
            solo: { jump: ["ArrowUp", ""], slide: ["ArrowDown", ""], laneUp: ["ArrowLeft", ""], laneDown: ["ArrowRight", ""], roar: ["Space", ""], trap: ["q", "ShiftRight"], pause: ["p", ""] } },
  both:   { name: "WASD + flechas", desc: "Las dos a la vez: juega como te resulte más cómodo",
            solo: { jump: ["w", "ArrowUp"], slide: ["s", "ArrowDown"], laneUp: ["a", "ArrowLeft"], laneDown: ["d", "ArrowRight"], roar: ["e", "Space"], trap: ["q", "ShiftRight"], pause: ["p", ""] } },
};
const CONTROL_VS_DEFAULT = {
  vs1: { jump: ["w", ""], slide: ["s", ""], roar: ["e", "d"], trap: ["a", "q"] },
  vs2: { jump: ["ArrowUp", ""], slide: ["ArrowDown", ""], roar: ["ArrowRight", "Enter"], trap: ["ArrowLeft", ""] },
};
const CONTROL_RESERVED = ["Escape", "m", "Tab"];   // Esc (pausa / volver), M (sonido) y Tab no se pueden asignar
const KEY_NAMES = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", Space: "Espacio", Enter: "Intro", Escape: "Esc", Backspace: "Retroceso",
  ShiftLeft: "Mayús izq.", ShiftRight: "Mayús der.", ControlLeft: "Ctrl izq.", ControlRight: "Ctrl der.", AltLeft: "Alt", AltRight: "Alt Gr", CapsLock: "Bloq Mayús",
  Insert: "Insert", Delete: "Supr", Home: "Inicio", End: "Fin", PageUp: "Re Pág", PageDown: "Av Pág" };
// Nombre visible de cada tecla. Las letras se guardan por posición (QWERTY); si el navegador lo permite, se muestra la letra
// de TU teclado (en AZERTY la tecla de saltar se ve como «Z»)
const KEY_LAYOUT = new Map();
try { if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => { m.forEach((v, k) => KEY_LAYOUT.set(k, v)); if (window.__game) window.__game.controls.applyLabels(); }).catch(() => {}); } catch (e) {}
const keyName = k => !k ? "—" : KEY_NAMES[k] || (/^[a-z]$/.test(k) ? (KEY_LAYOUT.get("Key" + k.toUpperCase()) || k).toUpperCase() : k.length === 1 ? k.toUpperCase() : k.replace(/^Key|^Digit|^Numpad/, "").replace(/^(.)/, m => m.toUpperCase()));
const clone = o => JSON.parse(JSON.stringify(o));

class Controls {
  constructor(game) {
    this.g = game; this.tab = "solo"; this.wait = null; this.msg = "";
    const $ = id => document.getElementById(id);
    this.el = $("ctrlScr"); this.body = $("ctrlBody");
    $("ctrlBack").addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); this.close(); });
    for (const b of document.querySelectorAll("#ctrlTabs .tab")) b.addEventListener("click", () => { game.sfx.click(); this.tab = b.dataset.t; this.wait = null; this.msg = ""; this.render(); });
    // Esperando una tecla: se captura antes que el juego
    addEventListener("keydown", e => {
      if (!this.wait || !this.visible) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const k = keyOf(e);
      if (k === "Escape") { this.wait = null; this.msg = ""; this.render(); return; }
      if (k === "Backspace" || k === "Delete") { this.set(this.wait.set, this.wait.act, this.wait.slot, ""); return; }
      if (CONTROL_RESERVED.includes(k)) { this.msg = `${keyName(k)} está reservada (no se puede asignar).`; this.g.sfx.denied(); this.render(); return; }
      this.set(this.wait.set, this.wait.act, this.wait.slot, k);
    }, true);
    this.rebuild(); this.applyLabels();
  }
  get visible() { return !this.el.classList.contains("hidden"); }
  open(from) { this.returnTo = from; this.wait = null; this.msg = ""; this.render(); this.el.classList.remove("hidden"); }
  close() { this.wait = null; this.el.classList.add("hidden"); if (this.returnTo === "pause") this.g.ui.showPause(); else this.g.showMenu(); }
  // Configuración guardada (con valores por defecto y sin datos raros)
  get cfg() {
    const s = this.g.save.data;
    if (!s.controls || typeof s.controls !== "object") s.controls = {};
    const c = s.controls, ok = v => Array.isArray(v) && v.length === 2 && v.every(k => typeof k === "string" && k.length < 24);
    if (!c.preset || !CONTROL_PRESETS[c.preset] && c.preset !== "custom") c.preset = "both";
    for (const set of ["solo", "vs1", "vs2"]) {
      const def = set === "solo" ? CONTROL_PRESETS.both.solo : CONTROL_VS_DEFAULT[set];
      if (!c[set] || typeof c[set] !== "object") c[set] = clone(def);
      for (const [a] of CONTROL_ACTIONS[set]) if (!ok(c[set][a])) c[set][a] = def[a].slice();
    }
    if (!c.qTrap) {   // (v27) la Q lanza trampas también en configuraciones guardadas antes, si está libre
      c.qTrap = 1;
      const addQ = (sets, set) => { const used = sets.some(s => CONTROL_ACTIONS[s].some(([a]) => c[s][a].includes("q"))), t = c[set].trap;
        if (!used) { if (!t[0]) t[0] = "q"; else if (!t[1]) t[1] = "q"; } };
      addQ(["solo"], "solo"); addQ(["vs1", "vs2"], "vs1");
    }
    return c;
  }
  // Mapa tecla → acción de cada grupo (se recalcula al cambiar algo)
  rebuild() {
    const c = this.cfg; this.map = {};
    for (const set of ["solo", "vs1", "vs2"]) { const m = this.map[set] = {}; for (const [a] of CONTROL_ACTIONS[set]) for (const k of c[set][a]) if (k) m[k] = a; }
  }
  action(k, set = "solo") { return this.map[set][k] || null; }
  keys(act, set = "solo") { return this.cfg[set][act].filter(Boolean); }
  label(act, set = "solo") { const k = this.keys(act, set); return k.length ? keyName(k[0]) : "—"; }
  labels(act, set = "solo") { const k = this.keys(act, set); return k.length ? k.map(keyName).join(" / ") : "—"; }
  // Asigna una tecla y la quita de cualquier otra acción del mismo grupo
  set(set, act, slot, k) {
    const c = this.cfg, group = set === "solo" ? ["solo"] : ["vs1", "vs2"];
    if (k) for (const s of group) for (const [a] of CONTROL_ACTIONS[s]) c[s][a] = c[s][a].map((x, i) => (x === k && !(s === set && a === act && i === slot) ? "" : x));
    c[set][act][slot] = k;
    if (set === "solo") c.preset = "custom";
    if (!c[set][act][0] && c[set][act][1]) c[set][act] = [c[set][act][1], ""];   // la principal nunca vacía si hay otra
    this.wait = null; this.msg = k ? `${keyName(k)} → ${CONTROL_ACTIONS[set].find(x => x[0] === act)[1]}` : "Tecla quitada";
    this.g.save.save(); this.rebuild(); this.applyLabels(); this.g.sfx.click(); this.render();
  }
  usePreset(id) {
    const c = this.cfg; c.solo = clone(CONTROL_PRESETS[id].solo); c.preset = id;
    this.msg = `Preajuste «${CONTROL_PRESETS[id].name}»`; this.g.save.save(); this.rebuild(); this.applyLabels(); this.g.sfx.click(); this.render();
  }
  resetVs(swap) {
    const c = this.cfg;
    if (swap) { const t = c.vs1; c.vs1 = c.vs2; c.vs2 = t; this.msg = "J1 y J2 intercambiados"; }
    else { c.vs1 = clone(CONTROL_VS_DEFAULT.vs1); c.vs2 = clone(CONTROL_VS_DEFAULT.vs2); this.msg = "Controles por defecto"; }
    this.g.save.save(); this.rebuild(); this.applyLabels(); this.g.sfx.click(); this.render();
  }
  // Textos de ayuda con las teclas elegidas (<kbd data-k="jump"> o data-k="vs2.roar")
  applyLabels() {
    for (const el of document.querySelectorAll("[data-k]")) { const [a, b] = el.dataset.k.split("."), set = b ? a : "solo", act = b || a; el.textContent = el.dataset.all ? this.labels(act, set) : this.label(act, set); }
  }
  render() {
    const c = this.cfg, h = [];
    for (const b of document.querySelectorAll("#ctrlTabs .tab")) b.classList.toggle("sel", b.dataset.t === this.tab);
    const row = (set, act, name) => `<div class="ctrl-row"><span>${name}</span>${[0, 1].map(i => { const k = c[set][act][i], w = this.wait && this.wait.set === set && this.wait.act === act && this.wait.slot === i;
      return `<button class="ctrl-key${w ? " wait" : ""}${k ? "" : " empty"}" data-set="${set}" data-act="${act}" data-slot="${i}">${w ? "Pulsa una tecla…" : k ? keyName(k) : i ? "+ otra" : "—"}</button>`; }).join("")}</div>`;
    if (this.tab === "solo") {
      h.push(`<div class="ctrl-presets">${Object.entries(CONTROL_PRESETS).map(([id, p]) => `<button class="btn${c.preset === id ? " sel" : ""}" data-preset="${id}"><b>${p.name}</b><small>${p.desc}</small></button>`).join("")}</div>`);
      h.push(`<div class="ctrl-list">${CONTROL_ACTIONS.solo.map(([a, n]) => row("solo", a, n)).join("")}</div>`);
      h.push(`<p class="touch-hint">${c.preset === "custom" ? "✏️ Personalizado · " : ""}Pulsa una casilla y luego la tecla que quieras. <kbd>Retroceso</kbd> la quita · <kbd>Esc</kbd> cancela. Esc siempre pausa y M silencia.</p>`);
    } else {
      h.push(`<div class="ctrl-vs">${["vs1", "vs2"].map((s, i) => `<div><h3>J${i + 1} · carril de ${i ? "abajo" : "arriba"}</h3><div class="ctrl-list">${CONTROL_ACTIONS[s].map(([a, n]) => row(s, a, n)).join("")}</div></div>`).join("")}</div>`);
      h.push(`<div class="actions"><button class="btn" data-vs="swap">⇄ Intercambiar J1 y J2</button><button class="btn ghost" data-vs="reset">Restablecer</button></div>`);
    }
    if (this.msg) h.push(`<p class="bk-msg ok">${escapeHtml(this.msg)}</p>`);
    this.body.innerHTML = h.join("");
    for (const b of this.body.querySelectorAll(".ctrl-key")) b.addEventListener("click", e => { e.currentTarget.blur(); this.g.sfx.click(); this.wait = { set: b.dataset.set, act: b.dataset.act, slot: +b.dataset.slot }; this.msg = ""; this.render(); });
    for (const b of this.body.querySelectorAll("[data-preset]")) b.addEventListener("click", e => { e.currentTarget.blur(); this.usePreset(b.dataset.preset); });
    for (const b of this.body.querySelectorAll("[data-vs]")) b.addEventListener("click", e => { e.currentTarget.blur(); this.resetVs(b.dataset.vs === "swap"); });
  }
}

// Causa de un golpe (estadística «qué te mata más»)
function obstacleCause(o) {
  if (o.kind === "flyer") return FLYER_NAMES[o.style] || "Pájaro";
  if (o.kind === "rock") return ROCK_NAMES[o.style] || "Roca";
  if (o.kind === "stalactite") return "Estalactita";
  return GROUND_NAMES[o.style] || "Obstáculo";
}
// Sonido del portal entre niveles
Sfx.prototype.portal = function () { this.tone(220, 1760, 0.55, "sine", 0.06); this.tone(330, 2640, 0.45, "triangle", 0.04, 0.08); this.noise(0.5, 0.06, 3000, "highpass", 0.1); };
// Furia y monturas
Sfx.prototype.furyFull = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, null, 0.12, "square", 0.05, i * 0.06)); };
Sfx.prototype.superRoar = function () { this.tone(90, 40, 0.8, "sawtooth", 0.12); this.noise(0.7, 0.16, 900, "lowpass", 0.05); this.tone(1200, 300, 0.5, "triangle", 0.05, 0.05); };
Sfx.prototype.mountUp = function () { [392, 523, 659, 784].forEach((f, i) => this.tone(f, null, 0.1, "triangle", 0.07, i * 0.05)); };
Sfx.prototype.mountDown = function () { [659, 523, 392].forEach((f, i) => this.tone(f, null, 0.1, "triangle", 0.05, i * 0.06)); };
Sfx.prototype.mountLost = function () { this.tone(400, 90, 0.4, "square", 0.08); this.noise(0.25, 0.1, 1200, "lowpass"); };
Sfx.prototype.mountFx = function (id) {
  const f = { board: [500, 900], log: [140, 90], lavarock: [120, 260], sled: [900, 1300], meteor: [80, 40], turtle: [200, 140], shroom: [300, 700], dolphin: [800, 1400], splash: [1500, 500], coffin: [180, 120], rocket: [300, 900] }[id];
  if (!f) return;
  if (id === "splash" || id === "sled") this.noise(0.2, 0.06, 3000, "highpass"); else this.tone(f[0], f[1], 0.18, id === "meteor" ? "sawtooth" : "triangle", 0.06);
};
