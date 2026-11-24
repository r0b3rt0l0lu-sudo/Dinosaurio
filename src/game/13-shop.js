// =====================================================================
//  Shop: pestañas Skins (catálogo del kit + exclusivas + mis diseños), Checkpoints y Editor
// =====================================================================
const rarityTag = r => `<span class="rarity" style="background:${RARITY_COLORS[r] || "#ccc"}">${r}</span>`;
class Shop {
  constructor(game) {
    this.game = game; this.returnTo = "menu"; this.cards = []; this.tab = "skins";
    const $ = id => document.getElementById(id);
    this.el = $("shop"); this.walletEl = $("shopWallet"); this.walletNum = $("walletNum");
    $("shopBack").addEventListener("click", e => { game.sfx.click(); e.currentTarget.blur(); this.close(); });
    $("shopRoulette").addEventListener("click", e => { game.sfx.click(); e.currentTarget.blur(); game.openRoulette("shop"); });
    this.el.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => { game.sfx.click(); this.setTab(t.dataset.tab); }));
    // Checkpoints: uno por nivel a partir del 2
    this.cpCards = [];
    for (const level of game.checkpoints.levels()) {
      const b = biomeOfLevel(level), card = document.createElement("div");
      card.className = "cp";
      card.innerHTML = `<div class="cp-thumb" style="background:linear-gradient(${b.pal.skyTop},${b.pal.skyBot} 60%,${b.pal.band} 60%)">${level}</div>
        <div class="cp-name">Nivel ${level} – ${b.name}</div>
        <div class="skin-price"><span class="coin"></span> ${game.checkpoints.price(level)}</div>
        <div class="cp-info"></div><button class="btn small"></button><div class="toast">¡Comprado!</div>`;
      const entry = { level, card, btn: card.querySelector("button"), info: card.querySelector(".cp-info") };
      entry.btn.addEventListener("click", e => { e.currentTarget.blur(); this.buyCheckpoint(entry); });
      card.addEventListener("animationend", ev => { if (ev.target === card) card.classList.remove("bought", "denied"); });
      $("cpGrid").appendChild(card); this.cpCards.push(entry);
    }
    // Skins de la tienda, en el orden del kit (DinoSkinsEngine.skins)
    for (const skin of SkinCatalog.shop) this.makeCard($("skinGrid"), skin.id, "shop");
    for (const skin of EXCLUSIVE_SKINS) this.makeCard($("exclGrid"), skin.id, "exclusive");
    for (const skin of SEASON_SKINS) this.makeCard($("seasonGrid"), skin.id, "season");
    for (const skin of EGG_SKINS) this.makeCard($("eggSkinGrid"), skin.id, "egg");
    // Accesorios (3 huecos), estelas, rugidos y mascotas: tarjetas con vista previa animada
    this.items = [];
    for (const [slot] of HAT_SLOTS) for (const h of HATS.filter(x => x.slot === slot)) this.makeItem($("hatGrid-" + slot), "hats", h, { hat: { [slot]: h.id }, trailFx: null });
    for (const t of SHOP_TRAILS) this.makeItem($("trailGrid"), "trails", t, { hat: null, trailFx: t.id });
    for (const r of SHOP_ROARS) this.makeItem($("roarGrid"), "roars", r, { hat: null, trailFx: null, roar: r });
    for (const p of PET_SPECIES.slice().sort((a, b) => a.price - b.price)) this.makeItem($("petGrid"), "pets", p, {});
    this.petEditor = new PetEditor(game, this);
    this.eggs = new EggShop(game, this);
    this.designGrid = $("designGrid");
    this.editor = new SkinEditor(game, this);
  }
  makeCard(parent, id, kind) {
    const skin = SkinCatalog.get(id), featured = id === "emperador-solar";
    const card = document.createElement("div"); card.className = "skin" + (featured ? " featured" : "") + (kind === "exclusive" ? " excl" : "");
    card.style.setProperty("--rc", RARITY_COLORS[skin.rarity] || "#d6d3cb");   // color de la rareza en el borde
    const w = featured ? 240 : 120;
    const ach = kind === "exclusive" ? ACHIEVEMENTS.find(a => a.id === skin.unlockedBy) : null;
    card.innerHTML = `<canvas width="${w}" height="84"></canvas>
      <div class="skin-name">${skin.name}</div>
      <div class="skin-tags">${rarityTag(skin.rarity)}</div>
      ${skin.fx && skin.fx.label ? `<div class="fx-label">✦ ${skin.fx.label}</div>` : ""}
      ${roarStyle(id) ? `<div class="fx-label roar-label">🔊 ${roarStyle(id).name}</div>` : ""}
      ${kind === "shop" ? `<div class="skin-price">${skin.price ? `<span class="coin"></span> ${skin.price}` : "Gratis"}</div>` : ""}
      ${ach ? `<div class="skin-lock">🔒 Consíguela con el logro «${ach.name}»</div>` : ""}
      ${kind === "season" ? `<div class="skin-lock">🎟️ Nivel ${skin.season} del pase de temporada</div>` : ""}
      ${kind === "egg" ? `<div class="skin-lock">🥚 Sale de: ${EGG_TYPES.filter(t => t.odds[skin.tier - 1] > 0).map(t => t.name.replace(/^Huevo (de )?/, "")).join(", ")}</div>` : ""}
      <button class="btn small"></button><div class="toast">¡Comprada!</div>`;
    const canvas = card.querySelector("canvas"), btn = card.querySelector("button"), ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const entry = { id, kind, card, btn, ctx, w, st: { tick: randInt(0, 7), speed: 2, trail: null, advance: true } };
    btn.addEventListener("click", e => { e.currentTarget.blur(); this.action(entry); });
    card.addEventListener("animationend", ev => { if (ev.target === card) card.classList.remove("bought", "denied"); });
    parent.appendChild(card); this.cards.push(entry);
    return entry;
  }
  // "Mis diseños": se reconstruye al guardar en el editor
  buildDesigns() {
    this.cards = this.cards.filter(e => e.kind !== "design");
    this.designGrid.innerHTML = "";
    const d = this.game.save.data.designs;
    for (let i = 0; i < CONFIG.EDITOR_SLOTS; i++) {
      if (d[i]) this.makeCard(this.designGrid, "design-" + i, "design");
      else {
        const card = document.createElement("div"); card.className = "skin empty";
        card.innerHTML = `<div class="empty-slot">Ranura ${i + 1} vacía</div><div class="fx-label">${this.game.save.data.editor ? "Crea un diseño en la pestaña Editor" : `Compra el editor (${CONFIG.EDITOR_PRICE} monedas)`}</div>`;
        this.designGrid.appendChild(card);
      }
    }
  }
  get visible() { return !this.el.classList.contains("hidden"); }
  open(from) { if (from !== "back") this.returnTo = from; this.game.state = "shop"; this.buildDesigns(); this.setTab(this.tab); this.el.classList.remove("hidden"); }
  setTab(tab) {
    this.tab = tab;
    this.el.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
    for (const [id, t] of [["skinsPane", "skins"], ["hatPane", "hats"], ["fxPane", "fx"], ["petPane", "pets"], ["cpPane", "checkpoints"], ["editorPane", "editor"], ["eggPane", "eggs"]]) document.getElementById(id).classList.toggle("hidden", tab !== t);
    if (tab === "editor") this.editor.open();
    this.refresh();
  }
  flashWallet() { this.walletEl.classList.remove("flash"); void this.walletEl.offsetWidth; this.walletEl.classList.add("flash"); }
  confirmAnim(card) { card.classList.remove("bought"); void card.offsetWidth; card.classList.add("bought"); }
  buyCheckpoint(e) {
    const g = this.game;
    g.sfx.unlock();
    if (g.checkpoints.buy(e.level)) { g.sfx.buy(); this.confirmAnim(e.card); this.flashWallet(); g.ach.event("purchase", { kind: "checkpoint", level: e.level }); }
    else { g.sfx.denied(); e.card.classList.add("denied"); }
    this.refresh();
  }
  close() {
    this.el.classList.add("hidden"); this.editor.close();
    if (this.returnTo === "over") { this.game.state = "over"; this.game.ui.showOver(); }
    else this.game.showMenu();
  }
  refresh() {
    const s = this.game.save, eq = this.game.skinId;
    this.walletNum.textContent = s.data.coins;
    for (const e of this.cards) {
      const skin = SkinCatalog.get(e.id); if (!skin) continue;
      const owned = s.owns(e.id), equipped = eq === e.id, affordable = s.data.coins >= skin.price, excl = e.kind === "exclusive" || e.kind === "egg" || e.kind === "season";
      e.card.classList.toggle("equipped", equipped);
      e.card.classList.toggle("locked", !owned && (excl || !affordable));
      e.btn.classList.toggle("primary", owned && !equipped);
      e.btn.classList.toggle("gold", !owned && !excl && affordable);
      e.btn.classList.toggle("equipped", equipped);
      e.btn.disabled = equipped || (!owned && (excl || !affordable));
      e.btn.textContent = equipped ? "Equipada" : owned ? "Equipar" : excl ? "🔒 Bloqueada" : affordable ? "Comprar" : "Bloqueada";
      const lock = e.card.querySelector(".skin-lock"); if (lock) lock.classList.toggle("hidden", owned);
    }
    const cp = this.game.checkpoints;
    for (const e of this.cpCards) {
      const owned = cp.owned(e.level), unlocked = cp.unlocked(e.level), affordable = s.data.coins >= cp.price(e.level);
      e.card.classList.toggle("owned", owned);
      e.card.classList.toggle("locked", !owned && !unlocked);
      e.btn.classList.toggle("gold", !owned && unlocked && affordable);
      e.btn.classList.toggle("equipped", owned);
      e.btn.disabled = owned || !unlocked || !affordable;
      e.btn.textContent = owned ? "Comprado" : !unlocked ? "🔒 Bloqueado" : affordable ? "Comprar" : "Sin monedas suficientes";
      e.info.textContent = owned ? "Elígelo en «Jugar»." : !unlocked ? `Completa el nivel ${e.level - 1} para desbloquear` : `Empieza con ${(e.level - 1) * CONFIG.POINTS_PER_LEVEL} puntos.`;
    }
    for (const e of this.items) {
      const own = this.ownsItem(e), on = this.isOn(e), can = s.data.coins >= e.it.price;
      e.card.classList.toggle("equipped", on); e.card.classList.toggle("locked", !own && !can);
      e.btn.className = "btn small" + (on ? "" : own ? " primary" : can ? " gold" : "");
      e.btn.disabled = !own && !can;
      e.btn.textContent = on ? "Quitar" : own ? (e.kind === "pets" ? "Elegir" : e.kind === "hats" ? "Ponérselo" : "Equipar") : can ? "Comprar" : "Sin monedas suficientes";
      e.card.querySelector(".skin-price").classList.toggle("hidden", own);
    }
    this.petEditor.refresh();
    this.editor.refresh();
    this.eggs.refresh();
  }
  makeItem(parent, kind, it, st) {
    const card = document.createElement("div"); card.className = "skin item " + kind;
    const ab = kind === "pets" && PET_ABILITIES[it.ab];
    if (kind === "pets") card.style.setProperty("--rc", RARITY_COLORS[it.rarity] || "#d6d3cb");
    const extra = kind === "pets" ? `<div class="skin-tags">${rarityTag(it.rarity)}</div><div class="fx-label">${it.desc}</div>${ab ? `<div class="fx-label pet-ab">${ab.icon} ${ab.desc(it.cd)}</div>` : ""}` : kind === "roars" ? `<div class="fx-label roar-label">🔊 ${{ fire: "Fuego", ice: "Hielo", bolt: "Rayos", shards: "Cristales", ghost: "Ecos", stars: "Estrellas", rainbow: "Arcoíris", sun: "Destello solar", prism: "Prisma" }[it.type] || ""}${it.wings ? " · alas" : ""}</div>` : `<div class="fx-label">${it.desc || ""}</div>`;
    card.innerHTML = `<canvas width="120" height="84"></canvas><div class="skin-name">${it.name}</div>${extra}
      <div class="skin-price"><span class="coin"></span> ${it.price}</div><button class="btn small"></button><div class="toast">¡Comprado!</div>`;
    const e = { kind, it, card, btn: card.querySelector("button"), ctx: card.querySelector("canvas").getContext("2d"), st: Object.assign({ tick: randInt(0, 7), speed: 2, trail: null, advance: true }, st) };
    e.ctx.imageSmoothingEnabled = false;
    e.btn.addEventListener("click", ev => { ev.currentTarget.blur(); this.itemAction(e); });
    card.addEventListener("animationend", ev => { if (ev.target === card) card.classList.remove("bought", "denied"); });
    parent.appendChild(card); this.items.push(e); return e;
  }
  ownsItem(e) { const d = this.game.save.data; return e.kind === "hats" ? d.hats.includes(e.it.id) : d[e.kind].includes(e.it.id); }
  isOn(e) {
    const d = this.game.save.data;
    return e.kind === "hats" ? d.acc[e.it.slot] === e.it.id : e.kind === "trails" ? d.trail === e.it.id : e.kind === "roars" ? d.roar === e.it.id : !!d.pet && d.pet.id === e.it.id;
  }
  itemAction(e) {
    const g = this.game, s = g.save, on = this.isOn(e); g.sfx.unlock();
    if (this.ownsItem(e)) { if (e.kind === "hats") s.equipHat(e.it.slot, on ? null : e.it.id); else s.equipItem(e.kind, on ? null : e.it.id); g.sfx.click(); if (e.kind === "pets") g.pets.tag = 3; }
    else if (e.kind === "hats" ? s.buyHat(e.it) : s.buyItem(e.kind, e.it)) { g.sfx.buy(); this.confirmAnim(e.card); this.flashWallet(); g.ach.event("purchase", { kind: e.kind, price: e.it.price }); }
    else { g.sfx.denied(); e.card.classList.add("denied"); }
    this.refresh();
  }
  action(e) {
    const g = this.game, s = g.save, skin = SkinCatalog.get(e.id);
    g.sfx.unlock();
    if (s.owns(e.id)) { s.equip(e.id); g.onSkinChanged(); g.sfx.click(); }
    else if (e.kind === "shop" && s.buy(skin)) {
      g.sfx.buy(); this.confirmAnim(e.card); this.flashWallet();
      g.ach.event("purchase", { kind: "skin", skin });
    } else { g.sfx.denied(); e.card.classList.add("denied"); }
    this.refresh();
  }
  // Vistas previas animadas: solo mientras la tienda está abierta y solo se repintan en cada tick del motor
  update(dt) {
    if (this.tab === "skins" || this.tab === "eggs") {
      const list = this.cards.filter(e => (e.kind === "egg") === (this.tab === "eggs"));
      tickStates(list.map(e => e.st), dt);
      for (const e of list) if (e.st.advance) drawSkinPreview(e.ctx, e.id, e.st, e.w, 84, 3);
      if (this.tab === "eggs") this.eggs.update(dt);
    } else if (this.tab === "hats" || this.tab === "fx" || this.tab === "pets") {
      const kinds = { hats: ["hats"], fx: ["trails", "roars"], pets: ["pets"] }[this.tab], list = this.items.filter(e => kinds.includes(e.kind));
      tickStates(list.map(e => e.st), dt);
      for (const e of list) if (e.st.advance) {
        if (e.kind === "pets") { drawPetPreview(e.ctx, { id: e.it.id }, e.st, 120, 84, 4); e.st.advance = false; continue; }
        if (e.kind === "hats") e.st.duck = e.st.tick % 24 >= 18;
        drawSkinPreview(e.ctx, this.game.skinId, e.st, 120, 84, 3);
      }
      if (this.tab === "pets") this.petEditor.update(dt);
    } else if (this.tab === "editor") this.editor.update(dt);
  }
}

// =====================================================================
//  SkinEditor: crea velociraptores propios con el mismo formato que SKINS_DATA
//  (sprite base + paleta + fondo/suelo + fx opcional) y los guarda en 3 ranuras.
// =====================================================================
const PATTERN_NAMES = {
  "raptor": "Liso", "raptor-spots": "Manchas", "raptor-zombie": "Costuras", "raptor-crystal": "Cristales",
  "raptor-bolt": "Rayo", "raptor-cracks": "Grietas", "raptor-frost": "Escarcha", "raptor-flame": "Llamas",
  "raptor-stars": "Estrellas", "raptor-supreme": "Supremo",
};
const PAL_NAMES = { o: "Contorno", b: "Cuerpo", s: "Sombra", l: "Brillo", a: "Vientre", x: "Detalle", y: "Garras", e: "Ojo", p: "Pupila", c: "Extra 1", d: "Extra 2", f: "Extra 3", g: "Extra 4" };
const EXTRA_COLORS = { c: "#ff3b3b", d: "#41b8ff", f: "#ffd23f", g: "#ffffff" };
const bodyOf = spriteId => spriteGrid(SKINS_DATA.sprites[spriteId], "idle").slice(0, 16).map(r => r.slice(0, 24).join(""));
const PX_TOOLS = [["pen", "✏️ Lápiz"], ["erase", "🧽 Goma"], ["fill", "🪣 Rellenar"], ["pick", "💧 Cuentagotas"], ["mirror", "↔️ Voltear"], ["clear", "🗑️ Borrar todo"]];
const EDITOR_COLORS = ["#1c1b19", "#3a2a1a", "#6b4a2b", "#c8a06a", "#f3e2b8", "#ffffff", "#8a93a6", "#3b4163",
                       "#2e6b2a", "#6cc25a", "#b8f06a", "#41b8ff", "#1a4fb0", "#8a5cff", "#ff5cc8", "#ff3b3b",
                       "#ff9f1c", "#ffd23f"];
// Letras de paleta que usa un sprite (cuerpo, patas y piezas superiores de todos sus frames)
function spriteLetters(spriteId, pixels) {
  const sp = SKINS_DATA.sprites[spriteId], set = new Set(), add = r => { for (const ch of r) if (ch !== ".") set.add(ch); };
  (pixels || sp.body).forEach(add);
  if (pixels) { for (const f of ["run1", "run2", "idle", "jump"]) sp.frames[f].legs.forEach(add); return PIXEL_LETTERS.split("").filter(k => set.has(k)); }
  for (const f of Object.values(sp.frames)) { (f.legs || []).forEach(add); if (f.top) f.top[1].forEach(add); }
  return "obslaxyep".split("").filter(k => set.has(k));
}
class SkinEditor {
  constructor(game, shop) {
    this.game = game; this.shop = shop; this.slot = 0; this.undo = []; this.work = null; this.dirty = false;
    const $ = id => document.getElementById(id);
    this.root = $("editorPane"); this.lockBox = $("edLocked"); this.box = $("edBox");
    this.canvas = $("edPreview"); this.ctx = this.canvas.getContext("2d"); this.ctx.imageSmoothingEnabled = false;
    this.lockCanvas = $("edLockPreview"); this.lockCtx = this.lockCanvas.getContext("2d"); this.lockCtx.imageSmoothingEnabled = false;
    this.st = { tick: 0, speed: 2, trail: null }; this.jumpT = 0;
    this.lockSt = { tick: 0, speed: 2, trail: null };
    $("edPrice").textContent = CONFIG.EDITOR_PRICE;
    $("edBuy").addEventListener("click", e => { e.currentTarget.blur(); this.buy(); });
    $("edRandom").addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); this.randomize(); });
    $("edUndo").addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); this.doUndo(); });
    $("edReset").addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); this.load(this.slot); });
    $("edSave").addEventListener("click", e => { e.currentTarget.blur(); this.saveSlot(); });
    this.nameInput = $("edName");
    this.nameInput.addEventListener("input", () => { this.work.name = this.nameInput.value.slice(0, 18); this.dirty = true; });
    this.nameInput.addEventListener("keydown", e => e.stopPropagation());
    this.msg = $("edMsg");
  }
  get owned() { return this.game.save.data.editor; }
  // Patrones permitidos: los de skins Común y Raro siempre; los de skins de rareza superior solo si tienes uno de esos skins
  patterns() {
    const s = this.game.save, out = [];
    for (const sp of Object.keys(PATTERN_NAMES)) {
      const users = [...SkinCatalog.shop, ...EXCLUSIVE_SKINS].filter(k => k.sprite === sp);
      const basic = users.some(k => k.rarity === "Común" || k.rarity === "Raro");
      const via = users.find(k => s.owns(k.id));
      out.push({ id: sp, ok: basic || !!via, need: basic ? null : users.map(k => k.name).join(" o ") });
    }
    return out;
  }
  // Efectos disponibles: los de skins Épico o Legendario que ya tienes
  effects() {
    const s = this.game.save;
    return SkinCatalog.shop.filter(k => (k.rarity === "Épico" || k.rarity === "Legendario") && k.fx && s.owns(k.id))
      .map(k => ({ id: k.id, label: `${k.fx.label} (${k.name})`, fx: k.fx }));
  }
  defaultDesign(slot) {
    const base = SkinCatalog.get(CONFIG.DEFAULT_SKIN);
    return { name: `Mi raptor ${slot + 1}`, sprite: base.sprite, pal: Object.assign({}, EXTRA_COLORS, base.pal), bg: base.bg || "#1e2a1c", ground: base.ground || "#6cc25a", fx: null, fxFrom: "", pixels: bodyOf(base.sprite) };
  }
  open() { if (!this.work) this.load(this.slot); this.render(); }
  close() { SkinCatalog.preview = null; SkinCatalog.rebuild(); }
  load(slot) {
    this.slot = slot; this.undo = [];
    const d = this.game.save.data.designs[slot];
    this.work = d ? JSON.parse(JSON.stringify(d)) : this.defaultDesign(slot);
    if (!validPixels(this.work.pixels)) this.work.pixels = bodyOf(this.work.sprite);   // diseños antiguos: el dibujo sale de su patrón
    for (const k in EXTRA_COLORS) if (!this.work.pal[k]) this.work.pal[k] = EXTRA_COLORS[k];
    this.dirty = false; this.msg.textContent = ""; this.apply(); this.render();
  }
  snapshot() { this.undo.push(JSON.stringify(this.work)); if (this.undo.length > 40) this.undo.shift(); this.dirty = true; }
  doUndo() { if (!this.undo.length) return; this.work = JSON.parse(this.undo.pop()); this.apply(); this.render(); }
  // Registra el diseño en el motor como skin temporal "editor-preview" (se dibuja con drawDino como cualquier otro)
  apply() {
    const w = this.work, sk = designSkin(w, "preview");
    sk.id = "editor-preview"; SE.clearSpriteCache();
    SkinCatalog.preview = sk; SkinCatalog.rebuild();
    this.st.trail = null;
  }
  set(fn) { this.snapshot(); fn(this.work); this.apply(); this.render(); }
  randomize() {
    const pats = this.patterns().filter(p => p.ok), fxs = this.effects();
    this.set(w => {
      w.sprite = choice(pats).id; w.pixels = bodyOf(w.sprite);
      for (const k of spriteLetters(w.sprite)) w.pal[k] = choice(EDITOR_COLORS);
      w.pal.o = choice(["#1c1b19", "#3a2a1a", "#0b0c14", "#2a0608"]); w.pal.e = "#ffffff"; w.pal.p = w.pal.o;
      w.bg = choice(["#14161f", "#1e2a1c", "#2a1a0e", "#0b1a33", "#20233a", "#2a0d12", "#0b0820"]);
      w.ground = choice(EDITOR_COLORS.slice(8));
      if (fxs.length && Math.random() < 0.5) { const f = choice(fxs); w.fx = JSON.parse(JSON.stringify(f.fx)); w.fxFrom = f.id; } else { w.fx = null; w.fxFrom = ""; }
    });
  }
  buy() {
    const g = this.game, d = g.save.data;
    g.sfx.unlock();
    if (d.editor || d.coins < CONFIG.EDITOR_PRICE) { g.sfx.denied(); return; }
    d.coins -= CONFIG.EDITOR_PRICE; d.editor = true; g.save.save(); g.sfx.buy();
    g.ach.event("purchase", { kind: "editor" });
    this.shop.flashWallet(); this.shop.buildDesigns(); this.shop.refresh(); this.render();
  }
  saveSlot() {
    const g = this.game, s = g.save;
    if (!this.owned) return;
    const w = this.work;
    w.name = (this.nameInput.value || w.name || `Mi raptor ${this.slot + 1}`).trim().slice(0, 18);
    const clean = { name: w.name, sprite: w.sprite, pal: Object.assign({}, w.pal), bg: w.bg, ground: w.ground, fx: w.fx ? JSON.parse(JSON.stringify(w.fx)) : null, fxFrom: w.fxFrom || "", pixels: w.pixels.slice() };
    s.data.designs[this.slot] = clean; s.save();
    SkinCatalog.designs = s.data.designs.map((x, i) => x && designSkin(x, i));
    SkinCatalog.rebuild(); SE.clearSpriteCache();
    if (g.skinId === "design-" + this.slot) g.onSkinChanged();
    g.sfx.buy(); this.dirty = false;
    this.msg.textContent = `Guardado en la ranura ${this.slot + 1}. Equípalo en «Skins › Mis diseños».`;
    g.ach.event("designSaved");
    this.shop.buildDesigns(); this.shop.refresh(); this.render();
  }
  refresh() {
    const d = this.game.save.data, b = document.getElementById("edBuy");
    b.disabled = d.editor || d.coins < CONFIG.EDITOR_PRICE;
    b.textContent = d.coins < CONFIG.EDITOR_PRICE ? "Sin monedas suficientes" : "Comprar editor";
  }
  // Construye los controles (se llama al cambiar algo)
  render() {
    if (!this.root) return;
    const owned = this.owned;
    this.lockBox.classList.toggle("hidden", owned); this.box.classList.toggle("hidden", !owned);
    if (!owned) return;
    const w = this.work, g = this.game, $ = id => document.getElementById(id);
    // Ranuras
    const slots = $("edSlots"); slots.innerHTML = "";
    for (let i = 0; i < CONFIG.EDITOR_SLOTS; i++) {
      const d = g.save.data.designs[i], b = document.createElement("button");
      b.className = "tab" + (i === this.slot ? " active" : "");
      b.textContent = d ? d.name : `Ranura ${i + 1} (vacía)`;
      b.addEventListener("click", () => { g.sfx.click(); this.load(i); });
      slots.appendChild(b);
    }
    this.nameInput.value = w.name;
    // Patrones
    const pats = $("edPatterns"); pats.innerHTML = "";
    for (const p of this.patterns()) {
      const b = document.createElement("button");
      b.className = "chip" + (p.id === w.sprite ? " sel" : "");
      b.disabled = !p.ok; b.title = p.ok ? "" : `Necesitas: ${p.need}`;
      b.textContent = (p.ok ? "" : "🔒 ") + PATTERN_NAMES[p.id];
      b.addEventListener("click", () => { g.sfx.click(); this.set(x => { x.sprite = p.id; x.pixels = bodyOf(p.id); }); });
      pats.appendChild(b);
    }
    // Colores de la paleta (solo las letras que usa el sprite)
    const cols = $("edColors"); cols.innerHTML = "";
    const row = (label, value, onPick) => {
      const r = document.createElement("div"); r.className = "ed-row";
      r.innerHTML = `<span class="ed-lbl">${label}</span>`;
      const sw = document.createElement("div"); sw.className = "swatches";
      for (const col of EDITOR_COLORS) {
        const b = document.createElement("button"); b.className = "sw" + (col.toLowerCase() === String(value).toLowerCase() ? " sel" : "");
        b.style.background = col; b.title = col;
        b.addEventListener("click", () => onPick(col));
        sw.appendChild(b);
      }
      const inp = document.createElement("input"); inp.type = "color"; inp.value = /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff";
      inp.addEventListener("change", () => onPick(inp.value));
      sw.appendChild(inp); r.appendChild(sw); cols.appendChild(r);
    };
    this.renderPixels();
    for (const k of spriteLetters(w.sprite, w.pixels)) row(PAL_NAMES[k] || k, w.pal[k] || "#ff00ff", col => this.set(x => { x.pal[k] = col; }));
    row("Fondo", w.bg, col => this.set(x => { x.bg = col; }));
    row("Suelo", w.ground, col => this.set(x => { x.ground = col; }));
    // Efecto
    const fx = $("edFx"); fx.innerHTML = "";
    const opts = [{ id: "", label: "Ninguno" }, ...this.effects()];
    for (const o of opts) {
      const b = document.createElement("button"); b.className = "chip" + ((w.fxFrom || "") === o.id ? " sel" : "");
      b.textContent = o.label;
      b.addEventListener("click", () => { g.sfx.click(); this.set(x => { x.fx = o.fx ? JSON.parse(JSON.stringify(o.fx)) : null; x.fxFrom = o.id; }); });
      fx.appendChild(b);
    }
    if (opts.length === 1) { const p = document.createElement("span"); p.className = "fx-label"; p.textContent = "Consigue skins Épicos o Legendarios para desbloquear sus efectos."; fx.appendChild(p); }
    $("edUndo").disabled = !this.undo.length;
  }
  // ----- Dibujo píxel a píxel -----
  setupPixels() {
    if (this.pxReady) return; this.pxReady = true;
    const cv = document.getElementById("edPixels"); this.pxCv = cv; this.pxCtx = cv.getContext("2d"); this.tool = "pen"; this.brush = "b";
    const cell = e => { const r = cv.getBoundingClientRect(); return { x: Math.floor((e.clientX - r.left) / r.width * 24), y: Math.floor((e.clientY - r.top) / r.height * 20) }; };
    cv.addEventListener("pointerdown", e => {
      e.preventDefault(); const c = cell(e); if (c.y >= 16 || c.x < 0 || c.x >= 24 || c.y < 0) return;
      if (this.tool === "pick") { const ch = this.work.pixels[c.y][c.x]; if (ch !== ".") { this.brush = ch; this.tool = "pen"; } this.render(); return; }
      this.snapshot(); this.painting = true; try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      if (this.tool === "fill") { this.flood(c.x, c.y, this.brush); this.painting = false; this.apply(); this.render(); return; }
      this.paint(c.x, c.y);
    });
    cv.addEventListener("pointermove", e => { if (this.painting) { const c = cell(e); this.paint(c.x, c.y); } });
    const end = () => { if (!this.painting) return; this.painting = false; this.apply(); this.render(); };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  }
  setPx(x, y, ch) { const r = this.work.pixels[y]; if (!r || x < 0 || x >= 24 || r[x] === ch) return false; this.work.pixels[y] = r.slice(0, x) + ch + r.slice(x + 1); return true; }
  paint(x, y) { if (y >= 16) return; if (this.setPx(x, y, this.tool === "erase" ? "." : this.brush)) { this.apply(); this.drawPixels(); } }
  flood(x, y, ch) {
    const from = this.work.pixels[y][x]; if (from === ch) return;
    const q = [[x, y]];
    while (q.length) { const [a, b] = q.pop(); if (b < 0 || b >= 16 || a < 0 || a >= 24 || this.work.pixels[b][a] !== from) continue; this.setPx(a, b, ch); q.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); }
  }
  renderPixels() {
    this.setupPixels(); const g = this.game, $ = id => document.getElementById(id);
    const tools = $("edTools"); tools.innerHTML = "";
    for (const [id, label] of PX_TOOLS) {
      const b = document.createElement("button"); b.className = "chip" + (this.tool === id ? " sel" : ""); b.textContent = label;
      b.addEventListener("click", () => {
        g.sfx.click();
        if (id === "mirror") this.set(w => { w.pixels = w.pixels.map(r => r.split("").reverse().join("")); });
        else if (id === "clear") this.set(w => { w.pixels = w.pixels.map(() => ".".repeat(24)); });
        else { this.tool = id; this.render(); }
      });
      tools.appendChild(b);
    }
    const br = $("edBrushes"); br.innerHTML = "";
    for (const k of PIXEL_LETTERS) {
      const b = document.createElement("button"); b.className = "px-brush" + (this.brush === k && this.tool !== "erase" ? " sel" : "");
      b.style.setProperty("--c", this.work.pal[k] || "#ff00ff"); b.title = PAL_NAMES[k]; b.innerHTML = `<i></i><span>${PAL_NAMES[k]}</span>`;
      b.addEventListener("click", () => { g.sfx.click(); this.brush = k; if (this.tool === "erase" || this.tool === "pick") this.tool = "pen"; this.render(); });
      br.appendChild(b);
    }
    this.drawPixels();
  }
  drawPixels() {
    const c = this.pxCtx, w = this.work, S = 16, legs = (SKINS_DATA.sprites[w.sprite] || SKINS_DATA.sprites.raptor).frames.idle.legs;
    c.clearRect(0, 0, 384, 320);
    for (let y = 0; y < 20; y++) for (let x = 0; x < 24; x++) {   // cuadrícula de ajedrez = transparente
      c.fillStyle = (x + y) % 2 ? "#2a2140" : "#231b38"; c.fillRect(x * S, y * S, S, S);
      const ch = y < 16 ? w.pixels[y][x] : (legs[y - 16] || "")[x] || ".";
      if (ch !== ".") { c.globalAlpha = y < 16 ? 1 : 0.4; c.fillStyle = w.pal[ch] || "#ff00ff"; c.fillRect(x * S, y * S, S, S); c.globalAlpha = 1; }
    }
    c.fillStyle = "rgba(255,255,255,.06)"; for (let i = 1; i < 24; i++) c.fillRect(i * S, 0, 1, 320); for (let i = 1; i < 20; i++) c.fillRect(0, i * S, 384, 1);
    c.fillStyle = "rgba(255,210,63,.7)"; c.fillRect(0, 16 * S - 1, 384, 2);
  }
  // Vista previa grande: corre y salta cada pocos segundos
  update(dt) {
    if (!this.owned) {
      tickStates([this.lockSt], dt);
      if (this.lockSt.advance) { drawSkinPreview(this.lockCtx, "rubi", this.lockSt, 200, 120, 4); }
      return;
    }
    if (!SE.get("editor-preview")) this.apply();
    this.jumpT = (this.jumpT + dt) % 3;
    const k = this.jumpT - 2, jumpY = k > 0 && k < 0.8 ? Math.round(Math.sin(k / 0.8 * Math.PI) * 7) : 0;
    tickStates([this.st], dt); this.st.duck = this.jumpT > 1 && this.jumpT < 1.7;   // también se ve agachado
    if (this.st.advance) drawSkinPreview(this.ctx, "editor-preview", this.st, 240, 150, 5, jumpY);
  }
}

// Vista previa de una mascota corriendo (tienda y editor de mascota)
function drawPetPreview(c, pet, st, w, h, sc) {
  const sp = PET_BY_ID[pet.id]; if (!sp) return;
  c.fillStyle = "#2f3658"; c.fillRect(0, 0, w, h); const gy = h - 10;
  c.fillStyle = "#4a5282"; c.fillRect(0, gy, w, 3);
  c.globalAlpha = 0.35; for (let i = 0; i < 5; i++) c.fillRect(mod(i * 31 - st.tick * 6, w + 10) - 10, gy + 5, 6, 2); c.globalAlpha = 1;
  const t = st.tick * CONFIG.SKIN_TICK, cx = w / 2, cy = gy - 6 * sc - (sp.fly ? 26 : 0);
  // Aura y efectos propios (fuego del fénix, brillos del cristal…)
  const kinds = []; if (pet.aura && pet.aura !== "none") kinds.push(pet.aura); if (sp.flame) kinds.push("fuego"); if (sp.sparkle) kinds.push("chispas");
  st.fx = st.fx || []; const dt = CONFIG.SKIN_TICK;
  if (kinds.length) for (let i = 0; i < kinds.length * 2; i++) { const p = petAuraParticle(choice(kinds), cx, cy, pet.accent || sp.accent); p.x += (p.vx < -40 ? 10 : 0); st.fx.push(p); }
  for (const p of st.fx) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; } st.fx = st.fx.filter(p => p.t < p.life).slice(-60);
  const back = p => p.kind === "fuego" || p.kind === "arcoiris" || p.kind === "sombra";
  for (const p of st.fx) if (back(p)) drawAuraParticle(c, p);
  c.save(); c.translate(Math.round(w / 2 - 8 * sc), gy); drawPetSprite(c, pet, t, sc, 0); c.restore();
  for (const p of st.fx) if (!back(p)) drawAuraParticle(c, p);
}
// =====================================================================
//  PetEditor: personaliza la mascota elegida (nombre, color del cuerpo y color de detalle)
// =====================================================================
class PetEditor {
  constructor(game, shop) {
    this.g = game; this.shop = shop; const $ = id => document.getElementById(id);
    this.box = $("petCustom"); this.cv = $("petPreview"); this.ctx = this.cv.getContext("2d"); this.ctx.imageSmoothingEnabled = false;
    this.name = $("petName"); this.st = { tick: 0, speed: 2 };
    this.name.addEventListener("keydown", e => e.stopPropagation());
    this.name.addEventListener("input", () => { const p = game.save.data.pet; if (p) { p.name = this.name.value.slice(0, 14); game.save.save(); } });
    $("petNone").addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); game.save.equipItem("pets", null); shop.refresh(); });
  }
  swatches(el, value, pick) {
    el.innerHTML = "";
    for (const col of PET_COLORS) {
      const b = document.createElement("button"); b.className = "sw" + (col.toLowerCase() === String(value).toLowerCase() ? " sel" : ""); b.style.background = col; b.title = col;
      b.addEventListener("click", () => { this.g.sfx.click(); pick(col); }); el.appendChild(b);
    }
    const inp = document.createElement("input"); inp.type = "color"; inp.value = value; inp.addEventListener("change", () => pick(inp.value)); el.appendChild(inp);
  }
  refresh() {
    const p = this.g.save.data.pet; this.box.classList.toggle("hidden", !p); if (!p) return;
    if (document.activeElement !== this.name) this.name.value = p.name || "";
    const set = (k, v) => { p[k] = v; this.g.save.save(); this.refresh(); };
    this.swatches(document.getElementById("petBody"), p.body, v => set("body", v));
    this.swatches(document.getElementById("petAccent"), p.accent, v => set("accent", v));
    const sp = PET_BY_ID[p.id], ab = PET_ABILITIES[sp.ab];
    document.getElementById("petSpecies").innerHTML = `${sp.name} ${rarityTag(sp.rarity)}${ab ? ` · ${ab.icon} ${ab.name}: ${ab.desc(sp.cd)}` : ""}`;
    const chips = (id, list, cur, key) => { const el = document.getElementById(id); el.innerHTML = "";
      for (const [v, name, icon] of list) { const b = document.createElement("button"); b.className = "chip" + (v === (cur || list[0][0]) ? " sel" : ""); b.textContent = (icon ? icon + " " : "") + name;
        b.addEventListener("click", e => { e.currentTarget.blur(); this.g.sfx.click(); set(key, v); }); el.appendChild(b); } };
    chips("petPattern", PET_PATTERNS, p.pattern, "pattern");
    chips("petAura", PET_AURAS, p.aura, "aura");
  }
  update(dt) { const p = this.g.save.data.pet; if (!p) return; tickStates([this.st], dt); if (this.st.advance) { drawPetPreview(this.ctx, p, this.st, 240, 120, 6); this.st.advance = false; } }
}

// =====================================================================
//  EggShop: pestaña «Huevos» de la tienda. Los huevos se compran con huevos bonus recogidos
//  en los mapas y, al abrirse, dan una skin que solo sale de ellos (EGG_SKINS).
// =====================================================================
// Huevo grande con la paleta de su tipo; crack = 0…1 grietas
function drawBigEgg(c, x, y, s, pal, crack = 0) {
  const ox = x - EGG_ROWS[0].length * s / 2, oy = y - EGG_ROWS.length * s / 2;
  EGG_ROWS.forEach((row, r) => { for (let i = 0; i < row.length; i++) { const col = pal[row[i]]; if (col) { c.fillStyle = col; c.fillRect(Math.round(ox + i * s), Math.round(oy + r * s), Math.ceil(s), Math.ceil(s)); } } });
  if (crack > 0) {
    c.fillStyle = pal.o; const n = Math.ceil(crack * 7);
    for (let i = 0; i < n; i++) c.fillRect(Math.round(ox + (2 + i) * s), Math.round(oy + (4 + (i % 2)) * s), Math.ceil(s), Math.ceil(s * 0.6));
  }
}
const eggPct = v => `${Math.round(v * 100)} %`;
class EggShop {
  constructor(game, shop) {
    this.game = game; this.shop = shop; this.hatch = null; this.t = 0;
    const $ = id => document.getElementById(id);
    this.walletEl = $("eggWallet"); this.box = $("eggHatch"); this.canvas = $("eggCanvas"); this.ctx = this.canvas.getContext("2d");
    this.result = $("eggResult"); this.ok = $("eggOk");
    this.ok.addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); this.box.classList.add("hidden"); this.hatch = null; shop.refresh(); });
    this.cards = EGG_TYPES.map(type => {
      const card = document.createElement("div"); card.className = "egg-card";
      const odds = type.odds.map((p, i) => p > 0 ? `${["Común", "Rara", "Legendaria"][i]} ${eggPct(p)}` : "").filter(Boolean).join(" · ");
      card.innerHTML = `<canvas width="90" height="96"></canvas><div class="skin-name">${type.name}</div>
        <div class="egg-price"><span class="egg-ico"></span> ${type.price} huevos</div><div class="fx-label">${odds}</div><button class="btn small"></button>`;
      const entry = { type, card, ctx: card.querySelector("canvas").getContext("2d"), btn: card.querySelector("button") };
      entry.btn.addEventListener("click", e => { e.currentTarget.blur(); this.buy(entry); });
      $("eggTypes").appendChild(card);
      return entry;
    });
  }
  get wallet() { return this.game.save.data.eggWallet; }
  refresh() {
    this.walletEl.textContent = this.wallet;
    for (const e of this.cards) {
      const ok = this.wallet >= e.type.price;
      e.btn.disabled = !ok || !!this.hatch; e.btn.classList.toggle("gold", ok);
      e.btn.textContent = ok ? "Abrir" : `Te faltan ${e.type.price - this.wallet}`;
      e.card.classList.toggle("locked", !ok);
    }
  }
  // Elige la skin: nivel según las probabilidades del huevo; si ya tienes todas las de ese nivel, otra que no tengas
  roll(type) {
    const s = this.game.save, r = Math.random();
    let tier = 1, acc = 0;
    for (let i = 0; i < 3; i++) { acc += type.odds[i]; if (r < acc) { tier = i + 1; break; } }
    const free = k => !s.owns(k.id);
    let pool = EGG_SKINS.filter(k => k.tier === tier && free(k));
    if (!pool.length) pool = EGG_SKINS.filter(k => type.odds[k.tier - 1] > 0 && free(k)).sort((a, b) => b.tier - a.tier);
    return pool.length ? choice(pool) : null;
  }
  buy(e) {
    const g = this.game, s = g.save;
    g.sfx.unlock();
    if (this.hatch || s.data.eggWallet < e.type.price) { g.sfx.denied(); return; }
    s.data.eggWallet -= e.type.price;
    const skin = this.roll(e.type), refund = skin ? 0 : e.type.price * CONFIG.EGG_REPEAT_COINS;
    if (skin) s.give(skin.id); else s.data.coins += refund;
    s.save(); g.sfx.buy();
    this.hatch = { t: 0, type: e.type, skin, refund, st: { tick: 0, speed: 2, trail: null, advance: true }, shown: false };
    this.result.innerHTML = ""; this.ok.classList.add("hidden"); this.box.classList.remove("hidden");
    this.refresh(); this.shop.flashWallet();
  }
  update(dt) {
    this.t += dt;
    for (const e of this.cards) {   // huevos de la tienda balanceándose
      const c = e.ctx; c.clearRect(0, 0, 90, 96); c.save(); c.translate(45, 52); c.rotate(Math.sin(this.t * 2 + e.type.price) * 0.08);
      drawBigEgg(c, 0, 0, 6, e.type.pal); c.restore();
    }
    const h = this.hatch; if (!h) return;
    h.t += dt;
    const c = this.ctx, W2 = 300, H2 = 200;
    c.imageSmoothingEnabled = false;
    if (h.t < 1.6) {   // se agita y se agrieta
      c.fillStyle = "#171225"; c.fillRect(0, 0, W2, H2);
      const k = h.t / 1.6, wob = Math.sin(h.t * (10 + k * 30)) * 0.08 * (0.4 + k);
      c.save(); c.translate(W2 / 2, H2 / 2 + 8); c.rotate(wob); drawBigEgg(c, 0, 0, 10, h.type.pal, k); c.restore();
      if (Math.floor(h.t * 8) % 4 === 0 && !h.tick) { h.tick = true; this.game.sfx.tick(); } else if (Math.floor(h.t * 8) % 4) h.tick = false;
    } else {
      if (!h.shown) {
        h.shown = true; this.game.sfx.egg();
        const sk = h.skin;
        this.result.innerHTML = sk
          ? `<b>¡${sk.name}!</b>${rarityTag(sk.rarity)}${sk.fx && sk.fx.label ? `<small>✦ ${sk.fx.label}</small>` : ""}${roarStyle(sk.id) ? `<small>🔊 ${roarStyle(sk.id).name}</small>` : ""}<small>Ya es tuya: equípala en la lista de abajo.</small>`
          : `<b>Ya tienes todas sus skins</b><small>Te devolvemos ${h.refund} monedas.</small>`;
        this.ok.classList.remove("hidden"); this.shop.refresh();
      }
      if (h.skin) {
        tickStates([h.st], dt);
        drawSkinPreview(c, h.skin.id, h.st, W2, H2, 5);
        const k = Math.max(0, 1 - (h.t - 1.6) / 0.5);   // destello al abrirse
        if (k > 0) { c.fillStyle = `rgba(255,255,255,${k})`; c.fillRect(0, 0, W2, H2); }
      } else { c.fillStyle = "#171225"; c.fillRect(0, 0, W2, H2); drawEggHalves(c, W2 / 2, H2 / 2, Math.min(1, (h.t - 1.6) / 0.8), 10); }
    }
  }
}

