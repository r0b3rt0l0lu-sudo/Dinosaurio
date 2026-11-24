// =====================================================================
//  Carrera diaria: el mismo recorrido para todos durante el día (semilla = fecha), dificultad Normal desde
//  el nivel 1 y una «regla del día» fija toda la partida. Intentos ilimitados; cuenta la mejor marca.
//  El primer intento de cada día da premio (más con racha de días seguidos).
// =====================================================================
const DAILY_CONFIG = { COINS: 200, XP: 300, STREAK_COINS: 40, STREAK_MAX: 7, HISTORY: 14 };
function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
const fmtDay = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(I18N.locale, { weekday: "short", day: "numeric", month: "short" }); };
// Ejecuta fn con Math.random sustituido por un generador con semilla
function withRng(rng, fn) { const r = Math.random; Math.random = rng; try { return fn(); } finally { Math.random = r; } }

class DailyRace {
  constructor(game) { this.g = game; this.rng = null; }
  get d() {
    const s = this.g.save.data;
    if (!s.daily) s.daily = { date: "", best: 0, attempts: 0, streak: 0, lastDay: "", bestEver: 0, days: 0, history: [] };
    const d = s.daily, k = dayKey(); if (d.date !== k) { d.date = k; d.best = 0; d.attempts = 0; }
    return d;
  }
  get today() { return dayKey(); }
  get seed() { return hashStr("dino-runner-diaria-" + this.today); }
  // Regla del día (una de las del modo Aleatorio, la misma para todos)
  get rule() { const r = mulberry32(this.seed ^ 0x9e3779b9); r(); return RANDOM_MODS[Math.floor(r() * RANDOM_MODS.length)]; }
  get rewardPending() { return this.d.lastDay !== this.today; }
  // Racha vigente: días seguidos jugando (se pierde si ayer no jugaste)
  get streak() { const d = this.d; return d.lastDay === this.today || d.lastDay === yesterdayKey() ? d.streak : 0; }
  get nextReward() { return DAILY_CONFIG.COINS + DAILY_CONFIG.STREAK_COINS * (Math.min(this.streak + 1, DAILY_CONFIG.STREAK_MAX) - 1); }
  // Empieza un intento: un generador con semilla para cada sistema (así no se descuadran entre ellos)
  begin() {
    const s = this.seed;
    this.rng = { spawn: mulberry32(s), mount: mulberry32(s ^ 0x51ed27), rogue: mulberry32(s ^ 0xa5a5a5), pool: mulberry32(s ^ 0x3c6ef3), weather: mulberry32(s ^ 0x7f4a7c) };
    this.d.attempts++; this.g.save.save();
  }
  // Al acabar (Game.bankRun): mejor marca del día, racha y premio del primer intento
  finish(score) {
    const d = this.d, today = this.today, out = { best: score > d.best, first: d.attempts <= 1, reward: null, prev: d.best };
    if (out.best) d.best = score;
    d.bestEver = Math.max(d.bestEver || 0, d.best);
    if (d.lastDay !== today) {
      out.reward = { coins: this.nextReward, xp: DAILY_CONFIG.XP };
      d.streak = d.lastDay === yesterdayKey() ? d.streak + 1 : 1; d.lastDay = today; d.days = (d.days || 0) + 1;
      this.g.save.data.coins += out.reward.coins;
    }
    const h = d.history.find(x => x.date === today); if (h) h.best = d.best; else d.history.unshift({ date: today, best: d.best });
    d.history = d.history.slice(0, DAILY_CONFIG.HISTORY);
    this.g.ach.unlock("madrugador"); if (d.streak >= 7) this.g.ach.unlock("racha-semanal");
    this.rng = null; return out;
  }
  // Panel del menú: regla del día, mejor marca, racha e historial de los últimos 7 días
  panelHtml() {
    const d = this.d, r = this.rule, st = this.streak, hist = [];
    for (let i = 6; i >= 0; i--) { const x = new Date(); x.setDate(x.getDate() - i); const k = dayKey(x), h = d.history.find(y => y.date === k); hist.push({ k, v: h ? h.best : 0, today: i === 0 }); }
    const max = Math.max(1, ...hist.map(h => h.v));
    return `<div class="dl-head"><b>📅 ${fmtDay(this.today)}</b><small>Mismo recorrido para todos hoy · Normal desde el nivel 1</small></div>
      <div class="dl-rule"><i>${r.icon}</i><div><small>REGLA DEL DÍA</small><b>${r.name}</b><span>${r.desc}</span></div></div>
      <div class="dl-stats"><div><small>MEJOR HOY</small><b>${fmtInt(d.best)}</b></div><div><small>INTENTOS</small><b>${d.attempts}</b></div><div><small>RACHA</small><b>${st} 🔥</b></div><div><small>MEJOR MARCA</small><b>${fmtInt(d.bestEver || 0)}</b></div></div>
      <div class="dl-reward">${this.rewardPending ? `🎁 Premio del primer intento: <b><span class="coin"></span> ${this.nextReward}</b> y <b>${DAILY_CONFIG.XP} XP</b> del pase` : "✔ Premio de hoy conseguido · vuelve mañana para seguir la racha"}</div>
      <div class="dl-hist">${hist.map(h => `<div class="${h.today ? "today" : ""}"><i style="height:${Math.round(h.v / max * 100)}%"></i><small>${fmtDay(h.k).split(" ")[0].replace(",", "")}</small></div>`).join("")}</div>`;
  }
}
// Las partes del juego que deciden el recorrido usan el generador del día (carrera diaria) o el de la sala (carrera online)
for (const [proto, name, key] of [[Spawner.prototype, "update", "spawn"], [MountManager.prototype, "planLevel", "mount"], [RogueManager.prototype, "onLevelStart", "rogue"], [UpgradePool.prototype, "roll", "pool"], [WeatherManager.prototype, "planLevel", "weather"]]) {
  const f = proto[name];
  proto[name] = function (...a) { const g = this.game || this.g, R = g && (g.netRace ? g.netRng : g.daily && g.dailyRace.rng); return R ? withRng(R[key], () => f.apply(this, a)) : f.apply(this, a); };
}

// =====================================================================
//  Mascotas: corren por el carril del medio, entre los dos carriles, un poco por detrás del raptor.
//  Se personalizan (especie, color del cuerpo, color de detalle y nombre) y cada pocos segundos te traen una moneda.
// =====================================================================
const PET_CONFIG = { CD: 3, RANGE: 280, SCALE: 3, BEHIND: 64 };
// Especies de mascota: 2 fotogramas de 16 × 12 (o = contorno, b = cuerpo, s = sombra, l = vientre, a = detalle, e = ojo, p = pupila)
const PET_SPECIES = [
  { id: "raptorin", name: "Raptorín", price: 500, desc: "Una cría de raptor que te imita", body: "#6cc25a", accent: "#ffd23f",
    frames: [[
      "................",
      "..........oooo..",
      ".........obbbbo.",
      ".........obbepbo",
      ".........obbbbbo",
      "..oo....obbbaoo.",
      ".obbo..obbbbo...",
      "..obbbbbbbllo...",
      "...osbbbbllo....",
      "....oosssbo.....",
      ".....obo.obo....",
      ".....oao..oao...",
    ], [
      "................",
      "..........oooo..",
      ".........obbbbo.",
      ".........obbepbo",
      ".........obbbbbo",
      "..oo....obbbaoo.",
      ".obbo..obbbbo...",
      "..obbbbbbbllo...",
      "...osbbbbllo....",
      "....oosssbo.....",
      "......obobo.....",
      "......oaoao.....",
    ]] },
  { id: "trici", name: "Trici", price: 800, desc: "Triceratops bebé con su gola", body: "#ff9a3c", accent: "#fff3c4",
    frames: [[
      "................",
      "................",
      "..........oo.o..",
      "........ooaoao..",
      ".......oaaobbbo.",
      "..oooooaabbbepbo",
      ".obbbbbbbbbbbbbo",
      "obbbbbbbbbbbbbo.",
      "osbbbbbbbbllbo..",
      ".osssssssslloo..",
      "..obo.obo.obo...",
      "..oao.oao.oao...",
    ], [
      "................",
      "................",
      "..........oo.o..",
      "........ooaoao..",
      ".......oaaobbbo.",
      "..oooooaabbbepbo",
      ".obbbbbbbbbbbbbo",
      "obbbbbbbbbbbbbo.",
      "osbbbbbbbbllbo..",
      ".osssssssslloo..",
      "...obo.obo.obo..",
      "...oao.oao.oao..",
    ]] },
  { id: "huevito", name: "Huevito", price: 600, desc: "Un huevo que aún no ha nacido… pero corre", body: "#f3e2b8", accent: "#6cc25a",
    frames: [[
      "................",
      "......oooo......",
      ".....obbbbo.....",
      "....obbabbbo....",
      "....obbbbepo....",
      "...obaabbbbbo...",
      "...obbbbbbabo...",
      "...obbbobbbbo...",
      "...osbbbobbso...",
      "....ossssssbo...",
      ".....oaooao.....",
      "....oao..oao....",
    ], [
      "................",
      "................",
      "......oooo......",
      ".....obbbbo.....",
      "....obbabbbo....",
      "....obbbbepo....",
      "...obaabbbbbo...",
      "...obbbbbbabo...",
      "...obbbobbbbo...",
      "...osbbbobbso...",
      "....ossssssbo...",
      ".....oaooao.....",
    ]] },
  { id: "anky", name: "Anky", price: 900, desc: "Anquilosaurio bebé con maza en la cola", body: "#8a6a4a", accent: "#e8d8b0",
    frames: [[
      "................",
      "................",
      "................",
      "......oaoaoao...",
      ".oo..oabababao..",
      "oaao.obbbbbbbboo",
      "oaaoobbbbbbbbepo",
      ".oobbbbbbbbbbbbo",
      "...osbbbbbbllbo.",
      "....ossssslloo..",
      ".....obo..obo...",
      ".....oao..oao...",
    ], [
      "................",
      "................",
      "................",
      "......oaoaoao...",
      ".oo..oabababao..",
      "oaao.obbbbbbbboo",
      "oaaoobbbbbbbbepo",
      ".oobbbbbbbbbbbbo",
      "...osbbbbbbllbo.",
      "....ossssslloo..",
      "......obo.obo...",
      "......oao.oao...",
    ]] },
  { id: "ptero", name: "Pterín", price: 1100, desc: "Pterodáctilo bebé: va volando", body: "#5fb4ff", accent: "#ffd23f", fly: true,
    frames: [[
      "....oo..........",
      "...obbo.........",
      "...obbbo...oo...",
      "....obbbo.obbo..",
      ".....obbbobepoaa",
      "......obbbbbboo.",
      ".....oobbbllo...",
      "....obbbbbbo....",
      "...obbbsoo......",
      "...oo.oo........",
      "................",
      "................",
    ], [
      "................",
      "................",
      "................",
      "...........oo...",
      "..........obbo..",
      "..........bepoaa",
      ".oooooooobbbboo.",
      "obbbbbbbbbbllo..",
      ".oossbbbbbbbo...",
      "...oossbbbo.....",
      ".......oo.......",
      "................",
    ]] },
];
// Especies nuevas: más variedad, rarezas y habilidades
const NEW_PET_SPECIES = [
  { id: "estegui", name: "Estegui", price: 1200, rarity: "Raro", desc: "Estegosaurio bebé con placas brillantes", body: "#4fa3a5", accent: "#ffb938", ab: "coin", cd: 2.6,
    frames: [[
      "................",
      "................",
      ".....oo.oo......",
      "....oaooaoo.....",
      "...oaaoaaoaoo...",
      "..obbbbbbbbbboo.",
      ".obbbbbbbbbbbepo",
      "aobbbbbbbbbbbbbo",
      "oaosbbbbbbbllboo",
      ".o.ossssssllbo..",
      "....obo..obo....",
      "....oao..oao....",
    ], [
      "................",
      "................",
      ".....oo.oo......",
      "....oaooaoo.....",
      "...oaaoaaoaoo...",
      "..obbbbbbbbbboo.",
      ".obbbbbbbbbbbepo",
      "aobbbbbbbbbbbbbo",
      "oaosbbbbbbbllboo",
      ".o.ossssssllbo..",
      ".....obo..obo...",
      ".....oao..oao...",
    ]] },
  { id: "gelatina", name: "Gelatina", price: 700, rarity: "Común", desc: "Un blandiblú de ámbar que bota sin parar", body: "#ffb938", accent: "#ff5c8a", ab: "coin", cd: 3, bouncy: true,
    frames: [[
      "................",
      "................",
      "................",
      "......oooo......",
      "....oobbbboo....",
      "...obwwbbbbbo...",
      "..obwbbbbbbbbo..",
      "..obbbepbbepbo..",
      "..obbbbbbbbbbo..",
      "..obbbbbaabbbo..",
      "..osbbbbbbbbso..",
      "...oooooooooo...",
    ], [
      "................",
      "................",
      "................",
      "................",
      ".....oooooo.....",
      "...oobwwbbbboo..",
      "..obwbbbbbbbbbo.",
      ".obbbepbbbepbbo.",
      ".obbbbbbbbbbbbo.",
      ".obbbbbbaabbbbo.",
      ".osbbbbbbbbbbso.",
      "..oooooooooooo..",
    ]] },
  { id: "mamut", name: "Mamutín", price: 1600, rarity: "Raro", desc: "Cría de mamut lanudo con colmillos", body: "#8a5a3a", accent: "#f3e2b8", ab: "egg", cd: 3,
    frames: [[
      "................",
      "....ooooooo.....",
      "...obbbbbbbo....",
      "..obbbbbbbbboo..",
      ".obbbbbbbbbbbbo.",
      ".obsbbbbbbbbepbo",
      ".obbbbbbbbbbbbbo",
      ".osbbbbbbbbbaabo",
      "..osbbbbbbbboabo",
      "..osssssssbbo.bo",
      "...obo..obo...oo",
      "...oao..oao.....",
    ], [
      "................",
      "....ooooooo.....",
      "...obbbbbbbo....",
      "..obbbbbbbbboo..",
      ".obbbbbbbbbbbbo.",
      ".obsbbbbbbbbepbo",
      ".obbbbbbbbbbbbbo",
      ".osbbbbbbbbbaabo",
      "..osbbbbbbbboabo",
      "..osssssssbbo.bo",
      "....obo..obo..oo",
      "....oao..oao....",
    ]] },
  { id: "fantasmin", name: "Fantasmín", price: 2200, rarity: "Épico", desc: "Un fantasmita que flota a tu lado", body: "#e8ecff", accent: "#ff7ab8", ab: "egg", cd: 3, fly: true, ghost: true,
    frames: [[
      "................",
      ".....oooooo.....",
      "....obbbbbbo....",
      "...obllbbbbbo...",
      "..obllbbbbbbbo..",
      "..oblbbpbbpbbo..",
      "..obbbbpbbpbbo..",
      "..obbabbbbbabo..",
      "..obbbbbaabbbo..",
      "..obbbbbbbbbbo..",
      "..obbobbbobbbo..",
      "...oo.ooo.ooo...",
    ], [
      "................",
      ".....oooooo.....",
      "....obbbbbbo....",
      "...obllbbbbbo...",
      "..obllbbbbbbbo..",
      "..oblbbpbbpbbo..",
      "..obbbbpbbpbbo..",
      "..obbabbbbbabo..",
      "..obbbbbaabbbo..",
      "..obbbbbbbbbbo..",
      "..obbbobbbobbo..",
      "..ooo.ooo.ooo...",
    ]] },
  { id: "robo", name: "Robo-rex", price: 2600, rarity: "Épico", desc: "Mini raptor robot con visor láser", body: "#9aa4b8", accent: "#3ddcff", ab: "fire", cd: 2.4, robot: true,
    frames: [[
      "..........a.....",
      "..........o.....",
      ".........ooooo..",
      "........obbbbbo.",
      "........obaaabo.",
      "........obbbbbbo",
      "..o....obkkkboo.",
      ".obo..obbbbbo...",
      "..obbbbbkbkbo...",
      "...okbkbbbbo....",
      "....oko.oko.....",
      "....oao.oao.....",
    ], [
      "..........a.....",
      "..........o.....",
      ".........ooooo..",
      "........obbbbbo.",
      "........obaaabo.",
      "........obbbbbbo",
      "..o....obkkkboo.",
      ".obo..obbbbbo...",
      "..obbbbbkbkbo...",
      "...okbkbbbbo....",
      ".....okoko......",
      ".....oaoao......",
    ]] },
  { id: "dragon", name: "Dragoncito", price: 3200, rarity: "Épico", desc: "Escupe fuego a las rocas y pájaros", body: "#5fd15a", accent: "#ff9a3c", ab: "fire", cd: 3, fly: true,
    frames: [[
      "....oo..........",
      "...oaao...oo.o..",
      "..oaaao..obbobo.",
      "..oaaaoooobbbbbo",
      "...oaaobbbbbepbo",
      "....oabbbbbbbbbo",
      ".o..obbbbbbblloo",
      "oao.obbbbbbllo..",
      ".oaobbbbbllloo..",
      "..ooobsssslo....",
      ".....oo.oo......",
      "................",
    ], [
      "................",
      "..........oo.o..",
      ".........obbobo.",
      ".....ooooobbbbbo",
      "....obbbbbbbepbo",
      "...oabbbbbbbbbbo",
      ".o.oaaabbbbblloo",
      "oaooaaaabbbllo..",
      ".oaooaaaobllloo.",
      "..o.ooaaosslo...",
      "......ooooo.....",
      "................",
    ]] },
  { id: "cristal", name: "Cristalito", price: 5500, rarity: "Legendario", desc: "Gólem de cristal: brilla y te trae huevos y monedas", body: "#9be7ff", accent: "#ff7ae0", ab: "egg", cd: 2, sparkle: true,
    frames: [[
      "................",
      "......o..o......",
      ".....oao.oao....",
      "....oabbobbao...",
      "...oabbbbbbbao..",
      "...obllbbbbbbo..",
      "...oblbepbepbo..",
      "...obbbbbbbbbo..",
      "....obbbaabbo...",
      "....osbbbbbso...",
      ".....oo..oo.....",
      ".....ao..ao.....",
    ], [
      "................",
      "................",
      "......o..o......",
      ".....oao.oao....",
      "....oabbobbao...",
      "...oabbbbbbbao..",
      "...obllbbbbbbo..",
      "...oblbepbepbo..",
      "...obbbbbbbbbo..",
      "....obbbaabbo...",
      "....osbbbbbso...",
      "....oao..oao....",
    ]] },
  { id: "fenix", name: "Fénix", price: 8000, rarity: "Legendario", desc: "Ave de fuego: quema obstáculos y deja una estela de llamas", body: "#ff5a2a", accent: "#ffd23f", ab: "fire", cd: 2, fly: true, flame: true,
    frames: [[
      "................",
      "...........oo...",
      "..........obbo..",
      "...oo....obepoa.",
      "..oaao..obbbboo.",
      ".oaaaaoobbbbbo..",
      "..oaaaabbbbbo...",
      "aa.oaabbbbbo....",
      ".aaaobbbllo.....",
      "..aaaasbbo......",
      "...aa.oo........",
      "................",
    ], [
      "................",
      "...........oo...",
      "..........obbo..",
      ".........obepoa.",
      "........obbbboo.",
      "..oooooobbbbbo..",
      ".oaaaaaabbbbo...",
      "aaoaaaabbbbo....",
      ".aaaoaabbllo....",
      "..aaaaooobbo....",
      "...aa...oo......",
      "................",
    ]] },
];
// Especies nuevas (v26): rarezas, habilidades y efectos propios
PET_SPECIES.push(...NEW_PET_SPECIES);
// Rareza y habilidad de las especies originales
{
  const meta = { raptorin: ["Común", "coin", 3], trici: ["Común", "coin", 3], huevito: ["Común", "egg", 3.2], anky: ["Raro", "coin", 2.6], ptero: ["Raro", "coin", 2.6] };
  for (const p of PET_SPECIES) if (meta[p.id]) { const [r, ab, cd] = meta[p.id]; p.rarity = p.rarity || r; p.ab = p.ab || ab; p.cd = p.cd || cd; }
}
const PET_BY_ID = Object.fromEntries(PET_SPECIES.map(p => [p.id, p]));
const PET_COLORS = ["#6cc25a", "#3ddc84", "#2e6b2a", "#4fa3a5", "#5fb4ff", "#1a4fb0", "#9be7ff", "#8a5cff", "#ff5cc8", "#ff7ab8", "#ff3b3b", "#ff5a2a", "#ff9a3c", "#ffd23f", "#f3e2b8", "#8a6a4a", "#3a2a1a", "#ffffff", "#9aa4b8", "#1c1b19"];
// Habilidades: todas traen monedas; algunas además huevos o fuego contra obstáculos
const PET_ABILITIES = {
  coin: { icon: "🪙", name: "Recolectora", desc: cd => `Te trae una moneda cercana cada ${cd} s` },
  egg:  { icon: "🥚", name: "Buscahuevos", desc: cd => `Monedas cada ${cd} s y te trae los huevos que se te escapan` },
  fire: { icon: "🔥", name: "Lanzallamas", desc: cd => `Monedas cada ${cd} s y quema una roca o pájaro de tu carril cada ${PET_CONFIG.FIRE_CD} s` },
};
PET_CONFIG.FIRE_CD = 12; PET_CONFIG.FIRE_RANGE = 560; PET_CONFIG.EGG_CD = 6;
// Estampados del cuerpo y auras (gratis para cualquier mascota)
const PET_PATTERNS = [["liso", "Liso"], ["rayas", "Rayas"], ["manchas", "Manchas"], ["degradado", "Degradado"], ["estrellas", "Estrellas"], ["arcoiris", "Arcoíris"], ["galaxia", "Galaxia"]];
const PET_AURAS = [["none", "Ninguna", ""], ["chispas", "Chispas", "✨"], ["corazones", "Corazones", "💖"], ["fuego", "Fuego", "🔥"], ["burbujas", "Burbujas", "🫧"], ["nieve", "Nieve", "❄️"], ["notas", "Música", "🎵"], ["arcoiris", "Arcoíris", "🌈"], ["sombra", "Sombra", "🌑"]];
const PET_PATTERN_IDS = PET_PATTERNS.map(p => p[0]), PET_AURA_IDS = PET_AURAS.map(a => a[0]);
const _petCache = new Map();
// Lienzo de 16 × 12 con los colores, el estampado y (si parpadea) los ojos cerrados. Se cachea.
function petCanvas(id, body, accent, f, pattern = "liso", blink = false) {
  const k = id + body + accent + f + pattern + (blink ? 1 : 0); let cv = _petCache.get(k); if (cv) return cv;
  const sp = PET_BY_ID[id]; if (!sp) return null;
  cv = document.createElement("canvas"); cv.width = 16; cv.height = 12; const c = cv.getContext("2d");
  const pal = { o: "#1a1424", b: body, s: shadeHex(body, -0.3), l: shadeHex(body, 0.45), a: accent, e: "#ffffff", p: "#15161c", w: "#ffffff", k: shadeHex(body, -0.55) };
  const rainbow = ["#ff5c6c", "#ff9a3c", "#ffd23f", "#5fd15a", "#5fb4ff", "#8a5cff"];
  const bodyCol = (x, y) => {   // estampado sobre los píxeles del cuerpo
    switch (pattern) {
      case "rayas": return x % 4 < 2 ? body : shadeHex(body, -0.22);
      case "manchas": return (x * 7 + y * 5) % 11 < 2 ? accent : body;
      case "degradado": return y < 5 ? shadeHex(body, 0.25) : y > 8 ? shadeHex(body, -0.2) : body;
      case "estrellas": return (x * 11 + y * 7) % 17 === 0 ? "#ffffff" : (x * 3 + y * 5) % 13 === 0 ? accent : body;
      case "arcoiris": return rainbow[Math.floor(x / 16 * 6) % 6];
      case "galaxia": return (x * 13 + y * 7) % 19 === 0 ? "#ffffff" : (x * 5 + y * 11) % 23 === 0 ? accent : y % 3 === 0 ? "#2a1f5a" : "#1c1540";
      default: return body;
    }
  };
  const n = sp.frames.length;
  sp.frames[(((f | 0) % n) + n) % n].forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === ".") return;
    if (blink && (ch === "e" || ch === "p")) ch = "s";
    c.fillStyle = ch === "b" ? bodyCol(x, y) : pal[ch] || "#f0f"; c.fillRect(x, y, 1, 1);
  }));
  if (_petCache.size > 300) _petCache.clear();
  _petCache.set(k, cv); return cv;
}
// Dibuja una mascota con los pies en (0, 0). st = { land, blink } (aplastado al aterrizar, parpadeo)
function drawPetSprite(c, pet, t, sc = PET_CONFIG.SCALE, y = 0, st = {}) {
  const sp = PET_BY_ID[pet.id]; if (!sp) return;
  const f = Math.floor(t * (sp.fly ? 6 : sp.bouncy ? 4 : 10)) % 2, blink = !sp.robot && (t % 3.2) > 3.05;
  const cv = petCanvas(pet.id, pet.body || sp.body, pet.accent || sp.accent, f, pet.pattern, blink);
  const fy = sp.fly ? 26 + Math.sin(t * 4) * 4 : sp.bouncy ? Math.abs(Math.sin(t * 6)) * 10 : 0;
  const sq = sp.bouncy ? 1 + (fy < 2 ? 0.12 : -0.04) : 1 + (st.land || 0) * 0.25;   // aplastado al tocar el suelo
  const w = 16 * sc * sq, h = 12 * sc / sq, x0 = (16 * sc - w) / 2, top = Math.round(-h - y - fy);
  c.save(); c.imageSmoothingEnabled = false;
  if (sp.rarity === "Legendario") {   // halo de las legendarias
    const g = c.createRadialGradient(8 * sc, top + h / 2, 2, 8 * sc, top + h / 2, 12 * sc);
    g.addColorStop(0, hexA(pet.accent || sp.accent, 0.45)); g.addColorStop(1, hexA(pet.accent || sp.accent, 0));
    c.fillStyle = g; c.fillRect(-6 * sc, top - 6 * sc, 28 * sc, h + 12 * sc);
  }
  if (sp.ghost) c.globalAlpha *= 0.72 + Math.sin(t * 3) * 0.12;
  c.drawImage(cv, Math.round(x0), top, Math.round(w), Math.round(h));
  if (sp.robot && Math.floor(t * 3) % 2) { c.fillStyle = "#ffffff"; c.fillRect(10 * sc, top, sc, sc); }   // luz de la antena
  c.restore();
}
function hexA(hex, a) { const n = parseInt(String(hex).slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
// Partículas de aura (coordenadas de pantalla)
function petAuraParticle(kind, x, y, accent) {
  const p = { kind, x: x + rand(-14, 14), y: y + rand(-16, 10), vx: rand(-20, 20), vy: rand(-40, -15), t: 0, life: rand(0.6, 1.1), s: rand(2, 4), col: accent };
  switch (kind) {
    case "chispas": p.col = choice(["#ffffff", "#fff3b0", accent]); p.vy = rand(-20, 5); break;
    case "corazones": p.col = choice(["#ff5c8a", "#ff8ab8", "#ff3b6b"]); p.vy = rand(-45, -25); break;
    case "fuego": p.col = choice(["#ff5a2a", "#ff9a3c", "#ffd23f"]); p.vx = rand(-90, -50); p.vy = rand(-50, -20); p.life = rand(0.3, 0.6); p.s = rand(3, 6); break;
    case "burbujas": p.col = "#bff8ff"; p.vy = rand(-35, -15); p.s = rand(3, 6); break;
    case "nieve": p.col = "#ffffff"; p.vy = rand(10, 30); p.vx = rand(-40, -10); break;
    case "notas": p.col = choice(["#ffd23f", "#5fb4ff", "#ff7ae0"]); p.vy = rand(-40, -20); p.vx = rand(-30, 10); break;
    case "arcoiris": p.col = choice(["#ff5c6c", "#ff9a3c", "#ffd23f", "#5fd15a", "#5fb4ff", "#8a5cff"]); p.vx = rand(-120, -80); p.vy = rand(-5, 5); p.life = 0.45; p.s = 4; break;
    case "sombra": p.col = choice(["#2a1f3d", "#3d2a5a", "#160f24"]); p.vx = rand(-60, -30); p.vy = rand(-25, -5); p.s = rand(4, 7); break;
  }
  return p;
}
function drawAuraParticle(c, p) {
  const k = p.t / p.life, a = k < 0.2 ? k * 5 : 1 - (k - 0.2) / 0.8, x = Math.round(p.x), y = Math.round(p.y), s = Math.round(p.s);
  c.globalAlpha = clamp(a, 0, 1); c.fillStyle = p.col;
  switch (p.kind) {
    case "chispas": c.fillRect(x - s, y, s * 2 + 1, 1); c.fillRect(x, y - s, 1, s * 2 + 1); break;   // destello en cruz
    case "corazones": c.fillRect(x - 2, y - 2, 2, 2); c.fillRect(x + 1, y - 2, 2, 2); c.fillRect(x - 2, y, 5, 1); c.fillRect(x - 1, y + 1, 3, 1); c.fillRect(x, y + 2, 1, 1); break;
    case "burbujas": c.strokeStyle = p.col; c.lineWidth = 1; c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.stroke(); c.fillStyle = "#ffffff"; c.fillRect(x - 1, y - s + 1, 1, 1); break;
    case "notas": c.fillRect(x, y - 5, 1, 6); c.fillRect(x - 2, y, 3, 2); c.fillRect(x + 1, y - 5, 2, 1); break;
    default: c.fillRect(x - s / 2, y - s / 2, s, s);
  }
  c.globalAlpha = 1;
}
class PetManager {
  constructor(game) { this.g = game; this.reset(); }
  get pet() { const p = this.g.save.data.pet; return p && PET_BY_ID[p.id] ? p : null; }
  get sp() { const p = this.pet; return p && PET_BY_ID[p.id]; }
  get on() { return !!this.pet && !this.g.versus && !this.g.tutorial; }
  reset() { this.y = 0; this.vy = 0; this.t = 0; this.cd = PET_CONFIG.CD; this.beams = []; this.wasJump = false; this.hopDelay = 0; this.tag = 3; this.fx = []; this.fxAcc = 0; this.land = 0; this.fireCd = PET_CONFIG.FIRE_CD / 2; this.eggCd = 2; this.shots = []; this.happy = 0; }
  get x() { return this.g.player.x - PET_CONFIG.BEHIND; }
  // Animación (también en la portada) y, durante la partida, sus habilidades
  update(dt, playing) {
    if (!this.on || !(dt > 0)) return;
    const sp = this.sp, pet = this.pet;
    this.t += dt; this.tag = Math.max(0, this.tag - dt); this.land = Math.max(0, this.land - dt * 5); this.happy = Math.max(0, this.happy - dt);
    const pl = this.g.player, jumping = pl.y > 2 && pl.vy > 0;
    if (jumping && !this.wasJump) this.hopDelay = 0.12;   // salta un poco después que tú
    this.wasJump = jumping;
    if (this.hopDelay > 0 && (this.hopDelay -= dt) <= 0 && this.y <= 0) this.vy = 560;
    if (this.y > 0 || this.vy > 0) { this.vy -= 2000 * dt; this.y = Math.max(0, this.y + this.vy * dt); if (this.y === 0) { this.vy = 0; this.land = 1; } }
    for (const b of this.beams) b.t += dt; this.beams = this.beams.filter(b => b.t < 0.35);
    // Partículas: aura elegida y efectos propios de la especie
    const kinds = [];
    if (pet.aura && pet.aura !== "none") kinds.push(pet.aura);
    if (sp.flame) kinds.push("fuego"); if (sp.sparkle) kinds.push("chispas");
    if (kinds.length) {
      this.fxAcc += dt * 14 * kinds.length; const at = this.anchor();
      while (this.fxAcc >= 1) { this.fxAcc -= 1; this.fx.push(petAuraParticle(choice(kinds), at.x, at.y, pet.accent || sp.accent)); }
    }
    for (const p of this.fx) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.fx = this.fx.filter(p => p.t < p.life); if (this.fx.length > 120) this.fx.splice(0, this.fx.length - 120);
    for (const s of this.shots) s.t += dt;
    if (!playing) { this.shots = []; return; }
    const g = this.g;
    // Bolas de fuego que ya han llegado
    for (const s of this.shots) if (s.t >= s.dur && !s.hit) { s.hit = true; if (!s.o.dead && g.obstacles.includes(s.o)) { g.destroy(s.o, true); g.floatText(s.o.lane, s.o.x, 120, "¡FUEGO!", "#ff9a3c", 14); } }
    this.shots = this.shots.filter(s => s.t < s.dur + 0.1);
    if (sp.ab === "fire" && (this.fireCd -= dt) <= 0) {
      let best = null;
      for (const o of g.obstacles) if (!o.dead && o.destructible && o.lane === pl.logicalLane && o.x > pl.x + 60 && o.x < pl.x + PET_CONFIG.FIRE_RANGE && (!best || o.x < best.x)) best = o;
      if (best) { this.fireCd = PET_CONFIG.FIRE_CD; const from = this.anchor(); this.shots.push({ o: best, from, t: 0, dur: 0.28 }); g.sfx.toss(); this.happy = 0.6; }
      else this.fireCd = 0.25;
    }
    if (sp.ab === "egg" && (this.eggCd -= dt) <= 0) {
      const e = g.eggs.find(e => !e.taken && e.x > this.x && e.x < this.x + PET_CONFIG.RANGE);
      if (e) { this.eggCd = PET_CONFIG.EGG_CD; this.beams.push({ from: toScreen(e.lane, e.x, e.y), t: 0, egg: true }); g.takeEgg(e, e.lane); this.happy = 0.8; }
      else this.eggCd = 0.3;
    }
    if ((this.cd -= dt) > 0) return;
    let best = null;
    for (const c of g.coinsArr) if (!c.taken && c.x > this.x && c.x < this.x + PET_CONFIG.RANGE && (!best || c.x < best.x)) best = c;
    if (!best) { this.cd = 0.3; return; }
    best.taken = true; const v = g.coinValue; g.runCoins += v; g.sfx.coin();
    this.beams.push({ from: toScreen(best.laneT, best.x, best.y), t: 0 });
    this.cd = sp.cd || PET_CONFIG.CD; this.happy = 0.4; g.ach.event("coinCollected");
  }
  // Centro de la mascota en pantalla
  anchor() { const sp = this.sp, fy = sp && sp.fly ? 26 : 0; return toScreen(0.5, this.x + 24, 18 + this.y + fy); }
  // En el carril del medio (entre los dos), con su sombra
  draw(c) {
    if (!this.on || this.g.net.spec) return; const pet = this.pet, x = this.x;
    for (const p of this.fx) if (p.kind === "fuego" || p.kind === "arcoiris" || p.kind === "sombra") drawAuraParticle(c, p);   // estelas por detrás
    c.save(); applyLane(c, 0.5); c.translate(x, 0);
    drawShadow(c, 24, 36 * (1 - Math.min(0.5, this.y / 120)), this.y);
    drawPetSprite(c, pet, this.t, PET_CONFIG.SCALE, this.y + (this.happy > 0 ? Math.abs(Math.sin(this.happy * 12)) * 6 : 0), { land: this.land });
    c.restore();
    for (const p of this.fx) if (!(p.kind === "fuego" || p.kind === "arcoiris" || p.kind === "sombra")) drawAuraParticle(c, p);
    const to = toScreen(0.5, x + 24, 20 + this.y);
    for (const b of this.beams) {   // la moneda (o el huevo) vuela hasta la mascota
      const k = b.t / 0.35, px = b.from.x + (to.x - b.from.x) * k, py = b.from.y + (to.y - b.from.y) * k - Math.sin(k * Math.PI) * 30;
      if (b.egg) { c.fillStyle = "#f3e2b8"; c.beginPath(); c.ellipse(px, py, 7, 9, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "#fffdf2"; c.fillRect(px - 3, py - 5, 2, 3); continue; }
      c.fillStyle = "#ffd23f"; c.beginPath(); c.arc(px, py, 6 * (1 - k * 0.4), 0, Math.PI * 2); c.fill();
      c.fillStyle = "#fff3b0"; c.fillRect(px - 2, py - 3, 2, 3);
    }
    for (const s of this.shots) {   // bola de fuego hacia el obstáculo
      const k = Math.min(1, s.t / s.dur), o = s.o, tp = toScreen(o.lane, o.x + o.w / 2, (o.kind === "flyer" ? o.y : 0) + o.h / 2);
      const px = s.from.x + (tp.x - s.from.x) * k, py = s.from.y + (tp.y - s.from.y) * k - Math.sin(k * Math.PI) * 24;
      c.fillStyle = "#ff5a2a"; c.beginPath(); c.arc(px, py, 9, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#ffd23f"; c.beginPath(); c.arc(px, py, 5, 0, Math.PI * 2); c.fill();
      for (let i = 1; i < 4; i++) { c.globalAlpha = 0.5 - i * 0.12; c.fillStyle = "#ff9a3c"; c.beginPath(); c.arc(px - (tp.x - s.from.x) * 0.06 * i, py - (tp.y - s.from.y) * 0.06 * i, 7 - i, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1;
    }
    if (this.tag > 0 && pet.name) {   // su nombre al empezar
      c.globalAlpha = Math.min(1, this.tag); this.g.ui.pill(c, pet.name.toUpperCase(), to.x, to.y - 52, 9, "#fff3c4"); c.globalAlpha = 1;
    }
  }
}

