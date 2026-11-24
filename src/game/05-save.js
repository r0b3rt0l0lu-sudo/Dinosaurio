// =====================================================================
//  SaveManager: todo el progreso en una sola clave (platform.save / platform.load; compatible con partidas antiguas)
// =====================================================================
class SaveManager {
  constructor() {
    this.data = {
      records: { normal: 0, easy: 0, hard: 0, random: 0 }, coins: 0, owned: [CONFIG.DEFAULT_SKIN], equipped: CONFIG.DEFAULT_SKIN,
      completed: 0, checkpoints: [], lastFreeSpin: "", muted: false, lastMode: "normal",
      bossesDefeated: [], editor: false, eggWallet: 0, eggsMigrated: true, designs: Array(CONFIG.EDITOR_SLOTS).fill(null),
      ach: { unlocked: {}, stats: {} },
      buildHistory: [], album: { ups: {}, syn: {}, pacts: {} },
      // Update: copia de seguridad, estadísticas, árbol (fósiles) y tutorial/consejos
      version: 1, firstPlay: new Date().toISOString(), lastExport: "",
      stats: {}, tree: {}, fossils: 0, treeResets: 0, lastWeeklySpin: "",
      tips: { seen: {}, off: false }, tutorialDone: false, tutorialRewarded: false,
      season: { id: 1, xp: 0, tier: 0, seen: 0 }, codeUsed: false, allUpgrades: false,
      hats: [], acc: { head: null, back: null, feet: null },   // accesorios comprados y equipados (3 huecos)
      trails: [], trail: null, roars: [], roar: null, pets: [], pet: null,   // estelas, rugidos y mascota
      lang: null, vibrate: true,   // idioma elegido (null = el del jugador) y vibración en el móvil
    };
    this.load();
    if (DEBUG) {
      this.data.coins = Math.max(this.data.coins, CONFIG.DEBUG_COINS); this.data.eggWallet = Math.max(this.data.eggWallet, 200);
      this.data.completed = Math.max(this.data.completed, CONFIG.CHECKPOINT_LEVELS);
      this.save();
    }
  }
  load() {
    try {
      const raw = platform.load(SAVE_KEY);
      if (raw) {
        const d = JSON.parse(raw), num = v => Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
        if (d.records) { this.data.records.normal = num(d.records.normal); this.data.records.easy = num(d.records.easy); this.data.records.hard = num(d.records.hard); this.data.records.random = num(d.records.random); }
        else if (Number.isFinite(d.hi)) this.data.records.normal = num(d.hi);
        this.data.coins = num(d.coins);                                   // las monedas se conservan siempre
        this.data.completed = num(d.completed);
        if (Array.isArray(d.checkpoints)) this.data.checkpoints = [...new Set(d.checkpoints.filter(l => Number.isInteger(l) && l >= 2))];
        if (typeof d.lastFreeSpin === "string") this.data.lastFreeSpin = d.lastFreeSpin;
        this.data.muted = !!d.muted;
        if (d.lang === "es" || d.lang === "en") this.data.lang = d.lang;
        if (d.vibrate === false) this.data.vibrate = false;
        if (MODES[d.lastMode]) this.data.lastMode = d.lastMode;
        if (Array.isArray(d.bossesDefeated)) this.data.bossesDefeated = d.bossesDefeated.filter(id => typeof id === "string");
        this.data.editor = !!d.editor;
        if (Array.isArray(d.designs)) for (let i = 0; i < CONFIG.EDITOR_SLOTS; i++) {
          const x = d.designs[i];
          if (x && x.sprite && SKINS_DATA.sprites[x.sprite] && x.pal) { if (!validPixels(x.pixels)) delete x.pixels; this.data.designs[i] = x; }
        }
        if (d.ach && typeof d.ach === "object") this.data.ach = { unlocked: d.ach.unlocked || {}, stats: d.ach.stats || {} };
        const obj = v => v && typeof v === "object" && !Array.isArray(v);
        if (typeof d.firstPlay === "string") this.data.firstPlay = d.firstPlay;
        if (typeof d.lastExport === "string") this.data.lastExport = d.lastExport;
        if (typeof d.lastWeeklySpin === "string") this.data.lastWeeklySpin = d.lastWeeklySpin;
        if (obj(d.stats)) this.data.stats = d.stats;
        if (obj(d.tree)) for (const n of TREE_NODES) if (Number.isInteger(d.tree[n.id])) this.data.tree[n.id] = clamp(d.tree[n.id], 0, n.max);
        this.data.fossils = num(d.fossils); this.data.treeResets = num(d.treeResets);
        if (obj(d.tips)) this.data.tips = { seen: obj(d.tips.seen) ? d.tips.seen : {}, off: !!d.tips.off };
        if (obj(d.season)) this.data.season = { id: num(d.season.id) || 1, xp: num(d.season.xp), tier: Math.min(num(d.season.tier), 30), seen: num(d.season.seen) };
        if (obj(d.daily)) { const y = d.daily; this.data.daily = { date: typeof y.date === "string" ? y.date : "", best: num(y.best), attempts: num(y.attempts), streak: num(y.streak), lastDay: typeof y.lastDay === "string" ? y.lastDay : "", bestEver: num(y.bestEver), days: num(y.days),
          history: Array.isArray(y.history) ? y.history.filter(h => h && typeof h.date === "string").map(h => ({ date: h.date, best: num(h.best) })).slice(0, 14) : [] }; }
        if (Array.isArray(d.hats)) this.data.hats = [...new Set(d.hats.filter(h => HAT_BY_ID[h]))];
        if (typeof d.hat === "string" && this.data.hats.includes(d.hat)) this.data.acc[HAT_BY_ID[d.hat].slot] = d.hat;   // guardados de la v19 (un solo accesorio)
        if (obj(d.acc)) for (const [k] of HAT_SLOTS) { const h = HAT_BY_ID[d.acc[k]]; if (h && h.slot === k && this.data.hats.includes(h.id)) this.data.acc[k] = h.id; }
        if (Array.isArray(d.trails)) this.data.trails = d.trails.filter(t => TRAIL_BY_ID[t]);
        if (this.data.trails.includes(d.trail)) this.data.trail = d.trail;
        if (Array.isArray(d.roars)) this.data.roars = d.roars.filter(t => SHOP_ROAR_BY_ID[t]);
        if (this.data.roars.includes(d.roar)) this.data.roar = d.roar;
        if (Array.isArray(d.pets)) this.data.pets = d.pets.filter(t => PET_BY_ID[t]);
        if (obj(d.pet) && this.data.pets.includes(d.pet.id)) { const hx = v => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
          this.data.pet = { id: d.pet.id, body: hx(d.pet.body) ? d.pet.body : PET_BY_ID[d.pet.id].body, accent: hx(d.pet.accent) ? d.pet.accent : PET_BY_ID[d.pet.id].accent, name: String(d.pet.name || PET_BY_ID[d.pet.id].name).slice(0, 14),
            pattern: PET_PATTERN_IDS.includes(d.pet.pattern) ? d.pet.pattern : "liso", aura: PET_AURA_IDS.includes(d.pet.aura) ? d.pet.aura : "none" }; }
        for (const k of ["nick", "cloudCode", "cloudAt"]) if (typeof d[k] === "string") this.data[k] = d[k].slice(0, 40);
        this.data.secretUnlocked = !!d.secretUnlocked;
        this.data.codeUsed = !!d.codeUsed; this.data.allUpgrades = !!d.allUpgrades;
        this.data.tutorialDone = !!d.tutorialDone; this.data.tutorialRewarded = !!d.tutorialRewarded;
        if (Array.isArray(d.buildHistory)) this.data.buildHistory = d.buildHistory.filter(r => r && typeof r === "object").slice(0, 20);
        if (d.album && typeof d.album === "object") for (const k of ["ups", "syn", "pacts"]) if (d.album[k] && typeof d.album[k] === "object") this.data.album[k] = d.album[k];
        this.data.eggWallet = num(d.eggWallet); this.data.eggsMigrated = !!d.eggsMigrated;
        // Partidas anteriores a la tienda de huevos: los huevos ya recogidos pasan al monedero de huevos
        if (!this.data.eggsMigrated) { this.data.eggWallet += num(this.data.ach.stats.eggs); this.data.eggsMigrated = true; }
        SkinCatalog.designs = this.data.designs.map((x, i) => x && designSkin(x, i));
        SkinCatalog.rebuild();
        // Skins: se descartan los ids que ya no existen (catálogo antiguo) sin tocar las monedas
        if (Array.isArray(d.owned)) this.data.owned = [...new Set([CONFIG.DEFAULT_SKIN, ...d.owned.filter(id => SkinCatalog.exists(id) && !id.startsWith("design-"))])];
        if (typeof d.equipped === "string" && SkinCatalog.exists(d.equipped) && this.owns(d.equipped)) this.data.equipped = d.equipped;
      }
    } catch (e) { /* datos corruptos o almacenamiento bloqueado: se usan los valores por defecto */ }
    SkinCatalog.designs = this.data.designs.map((x, i) => x && designSkin(x, i));
    SkinCatalog.rebuild(); this.syncCosmetics();
  }
  save() { try { platform.save(SAVE_KEY, JSON.stringify(this.data)); } catch (e) {} }
  record(modeId) { return this.data.records[modeId] || 0; }
  markCompleted(level) { if (level > this.data.completed) { this.data.completed = level; this.save(); } }
  owns(id) {
    if (id.startsWith("design-")) return !!this.data.designs[+id.slice(7)];
    return this.data.owned.includes(id);
  }
  give(id) { if (!this.data.owned.includes(id)) { this.data.owned.push(id); this.save(); } }
  buy(skin) {
    if (this.owns(skin.id) || skin.exclusive || this.data.coins < skin.price) return false;
    this.data.coins -= skin.price; this.data.owned.push(skin.id); this.save(); return true;
  }
  equip(id) { if (this.owns(id) && SkinCatalog.exists(id)) { this.data.equipped = id; this.save(); } }
  // Accesorios
  // Lo equipado se copia a variables globales que lee el dibujo del raptor
  syncCosmetics() { HAT_EQUIPPED = Object.assign({}, this.data.acc); TRAIL_EQUIPPED = this.data.trail; ROAR_EQUIPPED = this.data.roar; }
  ownsHat(id) { return this.data.hats.includes(id); }
  buyHat(h) { if (this.ownsHat(h.id) || this.data.coins < h.price) return false; this.data.coins -= h.price; this.data.hats.push(h.id); this.equipHat(h.slot, h.id); return true; }
  equipHat(slot, id) { const h = HAT_BY_ID[id]; this.data.acc[slot] = h && h.slot === slot && this.ownsHat(id) ? id : null; this.syncCosmetics(); this.save(); }
  // Estelas, rugidos y mascotas: kind = "trails" | "roars" | "pets"
  buyItem(kind, it) {
    if (this.data[kind].includes(it.id) || this.data.coins < it.price) return false;
    this.data.coins -= it.price; this.data[kind].push(it.id); this.equipItem(kind, it.id); return true;
  }
  equipItem(kind, id) {
    const own = id && this.data[kind].includes(id);
    if (kind === "trails") this.data.trail = own ? id : null;
    else if (kind === "roars") this.data.roar = own ? id : null;
    else if (kind === "pets") { const sp = PET_BY_ID[id]; const prev = this.data.pet || {};   // el estampado y el aura se conservan al cambiar de especie
      this.data.pet = own ? { id, body: sp.body, accent: sp.accent, name: (prev.name && prev.id === id) ? prev.name : sp.name, pattern: prev.pattern || "liso", aura: prev.aura || "none" } : null; }
    this.syncCosmetics(); this.save();
  }
  addCoins(n) { this.data.coins += n; this.save(); }
}
// Un diseño del editor convertido al formato de SKINS_DATA
function designSkin(d, slot) {
  const s = { id: "design-" + slot, name: d.name || `Diseño ${slot + 1}`, rarity: "Diseño", price: 0, sprite: d.sprite,
    pal: Object.assign({}, d.pal), bg: d.bg, ground: d.ground, fx: d.fx ? JSON.parse(JSON.stringify(d.fx)) : undefined, fxFrom: d.fxFrom || "", custom: true };
  if (validPixels(d.pixels)) {   // dibujo píxel a píxel: sprite propio con las patas animadas de la plantilla
    const B = SKINS_DATA.sprites[d.sprite] || SKINS_DATA.sprites.raptor, sid = "dz-" + slot, spr = { body: d.pixels.slice(), frames: {} };
    for (const f of ["run1", "run2", "idle", "jump"]) spr.frames[f] = { legs: B.frames[f].legs.slice() };
    addDuckFrames(spr); SKINS_DATA.sprites[sid] = spr; s.sprite = sid; s.base = d.sprite;
    return s;
  }
  const src = SKINS_DATA.skins.find(k => k.sprite === d.sprite && k.run);   // el sprite Supremo tiene un ciclo de carrera propio
  if (src) s.run = src.run.slice();
  return s;
}
// Dibujo del editor: 16 filas de 24 letras de paleta ("." = transparente)
const PIXEL_LETTERS = "obslaxyepcdfg";
function validPixels(px) { return Array.isArray(px) && px.length === 16 && px.every(r => typeof r === "string" && r.length === 24 && /^[.obslaxyepcdfg]+$/.test(r)); }


// =====================================================================
//  CheckpointManager: empezar la partida al inicio de un nivel ya superado
// =====================================================================
class CheckpointManager {
  constructor(save) { this.save = save; }
  price(level) { return CONFIG.CHECKPOINT_PRICE_STEP * (level - 1); }
  unlocked(level) { return this.save.data.completed >= level - 1; }
  owned(level) { return this.save.data.checkpoints.includes(level); }
  levels() { const out = []; for (let l = 2; l <= CONFIG.CHECKPOINT_LEVELS; l++) out.push(l); return out; }
  startLevels() { return [1, ...this.save.data.checkpoints.slice().sort((a, b) => a - b)]; }
  buy(level) {
    const d = this.save.data;
    if (this.owned(level) || !this.unlocked(level) || d.coins < this.price(level)) return false;
    d.coins -= this.price(level); d.checkpoints.push(level); this.save.save(); return true;
  }
}
const biomeOfLevel = level => BIOMES[(level - 1) % BIOMES.length];

