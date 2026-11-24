// =====================================================================
//  Game: estado, bucle, colisiones y dibujo
//  Estados: menu · play · playing · paused · over · shop · roulette · manual · achievements
// =====================================================================
// Estados con el fondo animado de la portada
const MENU_STATES = ["menu", "play", "shop", "roulette", "manual", "achievements", "album", "backup", "stats", "tree", "season", "ranking", "net", "controls"];
class Game {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.sfx = new Sfx(); this.save = new SaveManager();
    this.mode = MODES[this.save.data.lastMode] || MODES.normal; this.startLevel = 1; this.lives = 1;
    this.run = this.newRun();
    this.versus = false; this.p2SkinId = CONFIG.DEFAULT_SKIN;   // multijugador: J1 (WASD, carril de arriba) contra J2 (flechas, carril de abajo)
    this.player = new Player(this); this.p2 = new Player(this, 2); this.spawner = new Spawner(this); this.level = new LevelManager(this);
    this.bosses = new BossManager(this);
    this.build = new RunBuild(this); this.fury = new FuryMeter(this); this.mounts = new MountManager(this); this.tutorial = null;
    this.checkpoints = new CheckpointManager(this.save);
    this.sfx.muted = this.save.data.muted;
    this.ach = new AchievementManager(this);
    this.ui = new UI(this); this.shop = new Shop(this); this.roulette = new Roulette(this); this.manual = new Manual(this);
    this.rogue = new RogueManager(this); this.history = new BuildHistory(this); this.album = new UpgradeAlbum(this);
    this.backup = new SaveBackup(this); this.statsMgr = new StatsManager(this); this.controls = new Controls(this); this.tree = new SkillTree(this); this.tips = new TipManager(this); this.season = new SeasonPass(this);
    this.dailyRace = new DailyRace(this); this.daily = false;   // carrera diaria
    this.weather = new WeatherManager(this); this.pets = new PetManager(this);   // clima y mascota
    this.online = new Online(this); this.ranking = new RankingScreen(this); this.backup.setupCloud();
    this.net = new NetPlay(this); this.netScreen = new NetScreen(this); this.netRace = false;   // multijugador online   // ranking mundial y nube (Supabase)
    this.tutSkip = document.getElementById("tutSkip");
    this.tutSkip.addEventListener("click", e => { e.currentTarget.blur(); this.sfx.click(); this.skipTutorial(); });
    this.state = "menu"; this.time = 0; this.scroll = 0; this.touchMode = false; this.pausedFrom = "playing";
    this.clouds = Array.from({ length: 6 }, () => ({ x: rand(0, W), y: rand(20, 120), w: rand(50, 110) }));
    this.stars = Array.from({ length: 50 }, () => ({ x: rand(0, W), y: rand(0, 190), s: Math.random() < 0.2 ? 3 : 2, tw: rand(1, 4), ph: rand(0, 6) }));
    this.pebbles = Array.from({ length: 70 }, () => ({ x: rand(0, 1200), dy: rand(-10, 9), w: rand(2, 7), lane: randInt(0, 1) }));
    this.ambient = []; this.ambientAcc = 0; this.scoreT = 0;
    this.resize(); addEventListener("resize", () => this.resize());
    this.reset();
    this.ach.wallet();
  }
  // El canvas se dibuja a la resolución real de la pantalla (no se estira una imagen de 900 × 360)
  // Rendimiento: la resolución interna tiene un tope (RENDER.MAX_PX) y baja sola si el equipo no llega a 60 fps
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3), cssW = this.canvas.clientWidth || W;
    const q = RENDER.LEVELS[this.quality || 0];
    const px = Math.round(clamp(cssW * dpr, W, RENDER.MAX_PX) * q);
    if (this.canvas.width !== px) { this.canvas.width = px; this.canvas.height = Math.round(px * H / W); }
    this.dpr = this.canvas.width / W; this.cssW = cssW;
  }
  newRun() { return { clean: true, secret: false, biomes: new Set(), eggs: {}, powerupTypes: new Set(), lastPowerup: 0, lastRoar: 0, lastLane: 0 }; }
  reset() {
    this.runTime = 0; this.distance = 0; this.runCoins = 0; this.runEggs = 0; this.speed = CONFIG.BASE_SPEED * this.mode.startSpeedMult; this.lives = this.mode.lives;
    this.effectMax = { shield: 1, magnet: 1, slowmo: 1, turbo: 1 };
    this.obstacles = []; this.coinsArr = []; this.powerups = []; this.particles = []; this.eggs = []; this.hatches = [];
    this.effects = { shield: 0, magnet: 0, slowmo: 0, turbo: 0 };
    this.grace = 0; this.roarCd = 0; this.roarWave = null; this.roarAnim = 0; this.flashT = 0; this.shake = 0; this.shakeMag = 0; this.shakeDur = 1;
    this.overTime = 0; this.overShown = false; this.newRecord = false; this.banked = false;
    this.bossBanner = null; this.runBosses = 0; this.floaters = []; this.runBossTiers = []; this.runFossils = null; this.deathCause = null; this.dailyResult = null;
    this.run = this.newRun();
    this.player.reset(); this.p2.reset(); this.spawner.reset(); this.level.reset(); this.bosses.reset();
    // Roguelike, furia y monturas
    this.build.reset(); this.fury.reset(this.versus ? 0 : this.stat("furyStart")); this.mounts.reset();
    this.bossHearts = 0; this.pendingHeart = 0; this.bonusScore = 0; this.timeCd = 0; this.echoT = 0; this.echoWave = null; this.superWave = null;
    this.ghosts = [{ x: 120, cd: 0 }, { x: 200, cd: 0 }]; this.randomMod = null; this.netWait = 0;
    if (this.rogue) { this.rogue.reset(); this.rogue.screen.el.classList.add("hidden"); }
    if (this.weather) { this.weather.reset(); this.pets.reset(); }
  }
  stat(k) { return this.build.stat(k); }
  // Avisos del roguelike (RunBuild)
  onUpgradeAdded(u) { this.ach.event("upgrade", { id: u.id, rarity: u.rarity }); if (this.rogue) this.rogue.onUpgradeAdded(u); }
  onPactAdded(p) { this.ach.event("pact", { id: p.id }); }
  onSynergy(s) {
    this.save.data.album.syn[s.id] = 1;
    this.bossBanner = { t: 2.4, text: `¡SINERGIA! ${s.name.toUpperCase()}`, sub: s.desc, color: "#ff7ad0" };
    this.sfx.jackpot(); this.ach.event("synergy", { id: s.id });
  }
  // Puntuación: distancia + bonus (el Pacto de la prisa da ×1,5)
  get score() { return this.distScore + Math.floor(this.bonusScore); }
  // Valor de una moneda (modo, mejoras, montura)
  get coinValue() { return this.mode.coinValue * (this.versus ? 1 : this.stat("coinMult")) * (this.mounts.active ? this.mounts.active.coinMult : 1); }
  addRunCoins(n) { this.runCoins += n; }
  // Skin equipado (si el guardado apunta a uno que ya no existe, se usa el de por defecto)
  get skinId() { const id = this.save.data.equipped; return SkinCatalog.exists(id) && this.save.owns(id) ? id : CONFIG.DEFAULT_SKIN; }
  onSkinChanged() { this.player.skinState.trail = null; }
  get players() { return this.versus ? [this.player, this.p2] : [this.player]; }
  // Skin del J2: otro skin comprado o, si no hay, uno distinto del catálogo
  pickP2Skin() {
    const own = SkinCatalog.shop.find(k => k.id !== this.skinId && this.save.owns(k.id));
    return own ? own.id : (SkinCatalog.shop.find(k => k.id !== this.skinId) || { id: CONFIG.DEFAULT_SKIN }).id;
  }
  get distScore() { return Math.floor(this.distance / CONFIG.PX_PER_POINT); }
  get effectiveSpeed() {
    const M = this.mounts && this.mounts.active, mods = this.versus ? 1 : this.stat("speedMult") * (M ? M.speedMult : this.stat("unmountedSpeed"));
    return this.speed * (this.effects.turbo > 0 ? CONFIG.TURBO_MULT : 1) * mods;
  }
  get runCoinsInt() { return Math.floor(this.runCoins + 1e-6); }
  eggsInLevel(l) { return this.run.eggs[l] || 0; }

  // ----- Estados -----
  closeScreens() {
    this.ui.hideAll();
    for (const el of [this.shop.el, this.roulette.el, this.manual.el, this.ach.el, this.history.el, this.album.el, this.rogue.screen.el, this.backup.el, this.statsMgr.el, this.tree.el, this.season.el, this.ranking.el, this.netScreen.el, this.netScreen.res, this.controls.el]) el.classList.add("hidden");
  }
  showMenu() {
    if (["playing", "paused", "choice", "tip"].includes(this.state) || (this.state === "over" && !this.banked)) this.bankRun();   // al abandonar se guardan las monedas
    const fromSub = MENU_STATES.includes(this.state) && this.state !== "menu" && this.state !== "play" || this.history.visible;   // vuelve al submenú de donde vino
    if (this.net && (this.netRace || this.net.mode !== "idle")) this.net.leaveAll();   // salir del online
    this.versus = false; this.daily = false; this.netRace = this.netCoop = this.netDraft = false; this.endTutorial(); this.reset(); this.state = "menu"; this.closeScreens(); this.ui.showMenu(fromSub);
  }
  // ----- Tutorial (nivel de práctica) -----
  // Nivel secreto: partida completa desde el nivel 1 sin morir (ni perder vidas ni revivir)
  secretOk() { return !this.versus && !this.tutorial && !this.netRace && (this.save.data.secretUnlocked || (this.startLevel === 1 && this.run.clean)); }
  get firstTime() { const s = this.save.data; return !s.tutorialDone && !s.records.normal && !s.records.easy && !s.records.hard; }
  startTutorial() {
    this.sfx.unlock();
    if (["playing", "paused", "choice", "tip"].includes(this.state)) this.bankRun();
    this.versus = false; this.daily = false; this.netRace = this.netCoop = this.netDraft = false; this.mode = MODES.normal; this.startLevel = 1;
    this.tutorial = new Tutorial(this);
    this.reset(); this.fury.reset(0); this.state = "playing"; this.closeScreens();
    this.level.banner = 0; this.bosses.nextAt = 1e9; this.tutSkip.classList.remove("hidden");
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  finishTutorial() {
    const s = this.save.data, first = !s.tutorialRewarded;
    s.tutorialDone = true;
    if (first) { s.tutorialRewarded = true; s.coins += TUTORIAL_CONFIG.REWARD; }
    this.save.save(); this.ach.unlock("graduado");
    this.showMenu();
  }
  skipTutorial() { this.save.data.tutorialDone = true; this.save.save(); this.showMenu(); }
  endTutorial() { this.tutorial = null; if (this.tutSkip) this.tutSkip.classList.add("hidden"); if (this.tips) this.tips.el.classList.add("hidden"); }
  openPlay(versus = false) {
    if (!versus && this.firstTime) return this.startTutorial();   // la primera vez: nivel de práctica
    this.state = "play"; this.closeScreens(); this.ui.showPlay(false, versus); }
  // Empieza una partida en un modo y (opcionalmente) desde un checkpoint
  start(modeId = this.mode.id, startLevel = this.startLevel, daily = false) {
    this.sfx.unlock();
    if (["playing", "paused", "choice", "tip"].includes(this.state)) this.bankRun();
    this.versus = false; this.daily = daily; this.netRace = this.netCoop = this.netDraft = false; this.endTutorial();
    if (daily) { modeId = "normal"; startLevel = 1; }   // carrera diaria: Normal desde el nivel 1
    this.mode = MODES[modeId] || MODES.normal; if (!daily) { this.save.data.lastMode = this.mode.id; this.save.save(); }
    if (startLevel > 1 && !this.checkpoints.owned(startLevel)) startLevel = 1;
    this.startLevel = startLevel;
    this.reset(); this.state = "playing"; this.closeScreens();
    if (daily) {   // mismo recorrido para todos hoy y regla del día fija toda la partida
      this.dailyRace.begin(); this.randomMod = this.dailyRace.rule; this.build.cache = {};
    }
    if (startLevel > 1) this.jumpToLevel(startLevel);
    this.run.biomes.add(this.level.biome.id);
    this.run.lastPowerup = this.run.lastRoar = this.run.lastLane = this.distScore;
    this.level.banner = CONFIG.LEVEL_BANNER_TIME; this.level.bannerSub = daily ? `📅 Carrera diaria · ${this.randomMod.icon} ${this.randomMod.name}: ${this.randomMod.desc}` : "";
    this.ach.event("runStart");
    this.onLevelStart(this.level.level);
    this.rogue.startRun(startLevel);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  // Multijugador local sin jefes: J1 en el carril de arriba (WASD) y J2 en el de abajo (flechas)
  startVersus(modeId = this.versus ? this.mode.id : CONFIG.VERSUS_MODE) {
    this.sfx.unlock();
    if (["playing", "paused", "choice", "tip"].includes(this.state)) this.bankRun();
    this.versus = true; this.daily = false; this.netRace = this.netCoop = this.netDraft = false; this.endTutorial(); this.mode = MODES[modeId] || MODES.normal; this.startLevel = 1;
    this.p2SkinId = this.pickP2Skin();
    this.reset(); this.player.setLane(0); this.p2.setLane(1);
    for (const p of this.players) p.lives = this.mode.lives;   // Fácil: 3 vidas por raptor
    this.state = "playing"; this.closeScreens();
    this.level.banner = CONFIG.LEVEL_BANNER_TIME; this.level.bannerSub = "J1: W · S · E · A trampa      J2: ↑ · ↓ · → · ← trampa";
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  // Carrera online: Normal desde el nivel 1, sin jefes ni mejoras, con el recorrido de la semilla de la sala
  startNet(seed, coop = false) {
    this.sfx.unlock();
    if (["playing", "paused", "choice", "tip"].includes(this.state)) this.bankRun();
    this.versus = false; this.daily = false; this.netRace = true; this.endTutorial(); this.mode = MODES.normal; this.startLevel = 1;
    this.reset(); this.netRace = true; this.netCoop = !!coop; this.netDraft = false; this.build.cache = {};
    this.netRng = { spawn: mulberry32(seed), mount: mulberry32(seed ^ 0x51ed27), rogue: mulberry32(seed ^ 0xa5a5a5), pool: mulberry32(seed ^ 0x3c6ef3), weather: mulberry32(seed ^ 0x7f4a7c) };
    this.state = "playing"; this.closeScreens(); this.netWait = NET_CONFIG.COUNTDOWN;
    this.run.lastPowerup = this.run.lastRoar = this.run.lastLane = 0;
    this.level.banner = 0; this.level.bannerSub = "";
    this.ach.event("runStart"); this.onLevelStart(1);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  // Carrera online ganada (eres el último y ya vas primero): se acaba como una partida normal, sin choque
  netFinish() {
    if (this.state !== "playing") return;
    this.state = "over"; this.overTime = 0; this.overShown = false; this.sfx.victory(); this.net.onLocalDeath();   // las monedas se guardan al cerrar la carrera
  }
  // Cooperativo: el equipo te levanta (tras un jefe derrotado o pasados unos segundos)
  netRevive() {
    if (!this.netRace || this.state !== "over") return;
    const p = this.player;
    this.obstacles = this.obstacles.filter(o => o.x > PLAYER_X + 700);   // despeja el camino
    p.y = 0; p.vy = 0; p.onGround = true; p.slideTime = 0; p.dead = false;
    this.state = "playing"; this.overShown = false; this.overTime = 0; this.lives = 1; this.grace = 3;
    this.effects.shield = this.effectMax.shield = 3;
    this.netScreen.res.classList.add("hidden"); this.netScreen.el.classList.add("hidden");
    this.floatText(p.laneT, p.x + 40, 150, "¡DE VUELTA!", UI_T.go, 24); this.sfx.powerup();
  }
  // Cooperativo: un compañero te regala un escudo
  receiveGift(type, from) {
    if (this.state !== "playing" || !(type in this.effects)) return;
    this.effects[type] = this.effectMax[type] = NET_CONFIG.GIFT_TIME;
    this.floatText(this.player.laneT, this.player.x + 40, this.player.y + 120, `🎁 ${String(from || "").toUpperCase()} TE PROTEGE`, UI_T.info, 16); this.sfx.powerup();
  }
  // Trampa que te lanza un rival online (aparece en tu carril, delante de ti)
  receiveNetTrap(typeId, from) {
    if (this.state !== "playing") return;
    const p = this.player, lane = p.lane, biome = this.level.biome, type = TRAP_TYPES.find(t => t.id === typeId) || TRAP_TYPES[0];
    if (type.id === "ink") p.ink = CONFIG.TRAP_INK_TIME;
    else {
      let x = CONFIG.TRAP_DISTANCE;
      for (const o of this.obstacles) if (o.lane === lane && !o.dead && o.x < x + 200 && o.x + o.w > x - 200) x = Math.max(x, o.x + o.w + 200);
      const o = type.id === "wall" ? new Obstacle("ground", lane, x, { size: "small", count: 2 }, biome) : type.id === "bird" ? new Obstacle("flyer", lane, x, { h: "mid" }, biome) : new Obstacle("rock", lane, x, { size: "tall" }, biome);
      if (o.kind === "flyer") o.extra = this.level.flyerExtra(false);
      o.trapBy = 2; o.trapName = String(from || "").slice(0, 3).toUpperCase(); this.obstacles.push(o);
    }
    this.sfx.trap(); this.floatText(p.laneT, p.x + 40, p.y + 110, `¡TRAMPA DE ${String(from || "RIVAL").toUpperCase()}! ${type.name.toUpperCase()}`, UI_T.info, 18);
  }
  retry() { if (this.netRace) return; if (this.versus) this.startVersus(); else if (this.tutorial) this.startTutorial(); else if (this.daily) this.startDaily(); else this.start(); }
  startDaily() { this.start("normal", 1, true); }
  // Coloca la partida al inicio de un nivel (checkpoints y modo prueba), con su velocidad y bioma
  jumpToLevel(level, extraPoints = 0) {
    this.distance = ((level - 1) * CONFIG.POINTS_PER_LEVEL + extraPoints) * CONFIG.PX_PER_POINT;
    this.level.jumpTo(level); this.scroll = this.distance; this.bosses.syncTo(level);
    this.speed = this.level.targetSpeed(); this.spawner.reset(); this.spawner.nextAt = this.distance + CONFIG.FIRST_SPAWN_DISTANCE;
  }
  openShop(from) { this.state = "shop"; this.closeScreens(); this.shop.open(from); }
  openRoulette(from) { this.state = "roulette"; this.closeScreens(); this.roulette.open(from); }
  openManual(from) { if (from !== "pause") this.state = "manual"; this.closeScreens(); this.manual.open(from); }
  openHistory(from) { this.closeScreens(); this.history.open(from); }
  openSeason() { this.state = "season"; this.closeScreens(); this.season.open(); }
  openNet() { this.state = "net"; this.closeScreens(); this.netScreen.open(); }
  openRanking() { this.state = "ranking"; this.closeScreens(); this.ranking.open(); }
  openTree() { this.state = "tree"; this.closeScreens(); this.tree.open(); }
  openControls(from) {   // desde la pausa no se abandona la partida
    if (["choice", "tip"].includes(this.state)) return;
    if (from !== "pause" && ["playing", "paused"].includes(this.state)) { if (this.state === "playing") this.setPaused(true); from = "pause"; }
    if (from !== "pause") this.state = "controls"; this.closeScreens(); this.controls.open(from); }
  openStats() { this.state = "stats"; this.closeScreens(); this.statsMgr.open(); }
  openBackup() { this.state = "backup"; this.closeScreens(); this.backup.open(); }
  openAlbum() { this.state = "album"; this.closeScreens(); this.album.open(); }
  openAchievements(from) { this.state = "achievements"; this.closeScreens(); this.ach.open(from); }
  setPaused(on) {
    if (on && this.state === "playing") {
      this.state = "paused"; this.ui.showPause();
    } else if (!on && this.state === "paused") {
      this.state = "playing"; this.ui.hideAll(); this.manual.el.classList.add("hidden"); this.controls.el.classList.add("hidden");
    }
  }
  togglePause() { this.setPaused(this.state === "playing"); }
  // Idioma del juego (se recuerda; null = el del jugador)
  setLang(l) { this.save.data.lang = l; this.save.save(); I18N.setLang(l); this.sfx.click(); }
  // Vibración corta en el móvil (se puede desactivar en Opciones)
  vibrate(ms) { if (this.save.data.vibrate && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }
  toggleMute() { this.sfx.muted = !this.sfx.muted; this.save.data.muted = this.sfx.muted; this.save.save(); this.ui.updateMute(); }
  jump() {   // W, toque o clic
    this.sfx.unlock();
    if (this.state === "playing") this.player.jump();
  }
  primary() {   // toque / clic en el canvas: saltar o reanudar
    if (this.state === "paused") { if (!this.manual.visible) this.setPaused(false); }
    else this.jump();
  }
  roar() {
    if (this.state !== "playing" || this.netWait > 0) return;
    const boss = this.bosses.boss, M = this.mounts.active;
    if (this.fury.full && !this.bosses.active) return this.superRoar();   // con la furia llena: súper rugido
    if (this.roarCd > 0) return;
    if (this.stat("noRoar")) { this.sfx.denied(); this.floatText(this.player.laneT, this.player.x + 40, this.player.y + 100, "SOLO SÚPER RUGIDO", "#cccccc", 16); return; }
    if (M && !M.canRoar()) { this.sfx.denied(); return; }
    const cd = this.stat("roarNoCd") ? 1 : this.stat("roarCooldown");
    this.roarCd = this.roarCdMax = cd * (boss && boss.state === "fight" ? boss.roarCdMult : 1);   // algunos bosses se vencen a rugidos
    this.roarWave = { t: 0, lane: this.player.logicalLane, style: roarStyleFor(this.skinId), range: this.stat("roarRange"), both: !!this.stat("roarBothLanes"), back: !!this.stat("roarBack") };
    if (this.stat("roarEcho")) this.echoT = 0.5;
    this.roarAnim = 0.6; this.addShake(0.35, 7); this.sfx.roar();
    const st = this.roarWave.style, pl = this.player;
    if (st) {   // rugido especial: chispas con los colores del skin
      const grav = { fire: -500, stars: 0, ghost: -120, sun: 150, bolt: 0 }[st.type] ?? 1200;
      for (let i = 0; i < 34; i++) this.particles.push(new Particle(pl.logicalLane, pl.x + 66, pl.y + rand(20, 60), rand(150, 650), rand(-150, 350), rand(0.4, 0.9), choice(st.colors), rand(3, 7), grav));
      if (st.flash) this.flashT = 0.3;
      this.sfx.roarSpecial(st.type);
    }
    this.run.lastRoar = this.distScore; this.ach.event("roar");
    if (this.bosses.boss) this.bosses.boss.onRoar(this.player.logicalLane);
  }
  // Súper rugido: destruye todos los obstáculos de la pantalla en los dos carriles (también cactus)
  superRoar() {
    if (!this.fury.use()) return;
    const pl = this.player;
    for (const o of this.obstacles) if (!o.dead && o.x < W + 60) this.destroy(o, true);
    this.mounts.clearHazards(W + 60);
    this.superWave = { t: 0 }; this.flashT = 0.35; this.addShake(0.6, 12); this.roarAnim = 0.6;
    this.sfx.roar(); this.sfx.superRoar();
    for (let i = 0; i < 40; i++) this.particles.push(new Particle(randInt(0, 1), pl.x + 60, pl.y + rand(10, 80), rand(200, 900), rand(-200, 400), rand(0.5, 1), choice(["#ff9a3c", "#ffd23f", "#ffffff", "#ff3b3b"]), rand(4, 8)));
    const tb = this.stat("superRoarTurbo"); if (tb) { this.effects.turbo = this.effectMax.turbo = tb; }
    this.floatText(pl.laneT, pl.x + 60, pl.y + 120, "¡SÚPER RUGIDO!", "#ff9a3c", 30);
    this.ach.event("superRoar");
  }
  // Onda de rugido (principal o eco): destruye en su carril (o en los dos) por delante y, con Rugido doble, por detrás
  roarHits(w, dt) {
    const pl = this.player; w.t += dt;
    const k = Math.min(1, w.t / CONFIG.ROAR_WAVE_TIME), reach = pl.x + 70 + w.range * k, back = pl.x - w.range * 0.6 * k;
    for (const o of this.obstacles) {
      if (o.dead || (!w.both && o.lane !== w.lane)) continue;
      if (!(o.destructible || (this.stat("roarCactus") && o.kind === "ground" && o.h <= 64))) continue;   // Rugido cortante: solo cactus bajos
      const r = o.lane === w.lane ? reach : pl.x + 70 + (reach - pl.x - 70) * 0.6;                           // Rugido de carril: 60 % en el otro
      if ((o.x < r && o.x + o.w > pl.x) || (w.back && o.lane === w.lane && o.x + o.w > back && o.x < pl.x)) { this.destroy(o, true); this.fury.add(FURY_CONFIG.ROAR_KILL); }
    }
    this.mounts.roarHits(w, pl.x, reach);
    if (this.bosses.boss) this.bosses.boss.roarWave(w, pl.x, reach);
    return w.t <= CONFIG.ROAR_WAVE_TIME + 0.2;
  }
  // Aterrizar con caída rápida (Pisotón sísmico)
  onStompLand(p) {
    this.ach.event("stomp");
    if (!this.stat("stompWave")) return;
    for (const o of this.obstacles) if (!o.dead && o.lane === p.logicalLane && o.x < p.x + 200 && o.x + o.w > p.x - 40 && o.kind !== "flyer" && o.kind !== "stalactite" && o.h <= 70) this.destroy(o, true);
    this.addShake(0.2, 6); this.puff(p.x + 40, 0, p.logicalLane, 20, "#ffe9a8"); this.sfx.stomp();
  }
  // Rugido de un raptor en multijugador (cada uno con su recarga)
  roarP(p) {
    if (this.state !== "playing" || p.dead || p.roarCd > 0) return;
    p.roarCd = p.roarCdMax = this.mode.roarCooldown;
    p.roarWave = { t: 0, lane: p.logicalLane, style: p.num === 1 ? roarStyleFor(p.skinId) : roarStyle(p.skinId) };
    p.roarAnim = 0.6; this.addShake(0.25, 5); this.sfx.roar();
    const st = p.roarWave.style;
    if (st) { for (let i = 0; i < 24; i++) this.particles.push(new Particle(p.logicalLane, p.x + 66, p.y + rand(20, 60), rand(150, 650), rand(-150, 350), rand(0.4, 0.9), choice(st.colors), rand(3, 7))); this.sfx.roarSpecial(st.type); }
  }
  // Multijugador: lanza la trampa preparada al carril del rival
  throwTrap(p) {
    if (this.state !== "playing" || !this.versus || p.dead) return;
    const rival = p === this.player ? this.p2 : this.player;
    if (p.thrown >= CONFIG.TRAP_TOTAL) { this.sfx.denied(); this.floatText(p.laneT, p.x + 40, p.y + 110, `J${p.num}: ¡SIN TRAMPAS!`, "#ff8a8a", 14); return; }
    if (rival.dead || p.traps <= 0 || this.level.portal) { this.sfx.denied(); return; }
    const type = TRAP_TYPES[p.nextTrap], lane = rival.lane, biome = this.level.biome;
    if (type.id === "ink") rival.ink = CONFIG.TRAP_INK_TIME;
    else {
      let x = CONFIG.TRAP_DISTANCE;   // sin solaparse con otros obstáculos de ese carril
      for (const o of this.obstacles) if (o.lane === lane && !o.dead && o.x < x + 200 && o.x + o.w > x - 200) x = Math.max(x, o.x + o.w + 200);
      const o = type.id === "wall" ? new Obstacle("ground", lane, x, { size: "small", count: 2 }, biome)
        : type.id === "bird" ? new Obstacle("flyer", lane, x, { h: "mid" }, biome)
        : new Obstacle("rock", lane, x, { size: "tall" }, biome);
      if (o.kind === "flyer") o.extra = this.level.flyerExtra(false);
      o.trapBy = p.num; this.obstacles.push(o);
    }
    p.traps--; p.thrown++; p.nextTrap = (p.nextTrap + randInt(1, TRAP_TYPES.length - 1)) % TRAP_TYPES.length;
    this.sfx.toss(); this.sfx.trap();
    this.floatText(rival.laneT, rival.x + 40, rival.y + 110, `¡TRAMPA DE J${p.num}! ${type.name.toUpperCase()}`, p.num === 1 ? UI_T.go : UI_T.info, 18);
  }
  // Recibir un golpe: el turbo y la invulnerabilidad lo ignoran y el escudo lo absorbe. Devuelve true si muere.
  hitPlayer(pl = this.player) {
    if (this.versus) {   // multijugador: una sola vida por raptor; la partida acaba cuando caen los dos
      if (this.state !== "playing" || pl.dead || pl.grace > 0) return false;
      if (pl.lives > 1) {   // Fácil: pierde una vida y parpadea unos segundos
        pl.lives--; pl.grace = this.mode.hitInvuln; this.sfx.lifeLost(); this.addShake(0.25, 5);
        this.floatText(pl.laneT, pl.x + 30, pl.y + 90, `J${pl.num} -1 VIDA`, "#ff6b6b", 22);
        return false;
      }
      pl.lives = 0; pl.dead = true; pl.score = this.distScore; this.sfx.hit(); this.addShake(0.3, 6);
      const c = pl.center, sk = SkinCatalog.get(pl.skinId), cols = sk ? [sk.pal.b, sk.pal.o, "#ffffff"] : ["#ffffff"];
      for (let i = 0; i < 20; i++) this.particles.push(new Particle(pl.logicalLane, c.x, c.y, rand(-250, 250), rand(100, 500), rand(0.5, 1), choice(cols), rand(3, 6)));
      this.floatText(pl.laneT, pl.x + 30, pl.y + 100, `¡J${pl.num} K.O.!`, "#ff6b6b", 24);
      if (this.players.every(p => p.dead)) this.gameOver();
      return true;
    }
    if (this.state !== "playing" || this.effects.turbo > 0 || this.grace > 0) return false;
    if (this.tutorial) return this.tutorial.onHit();                                  // tutorial: los golpes solo hacen retroceder
    if (this.stat("laneGhost") && pl.laneProgress < 1) return false;                  // Cambio fantasma
    const M = this.mounts.active;
    if (M && M.invulnerable) return false;
    this.bosses.hitTaken = true;
    if (this.effects.shield > 0) { this.effects.shield = 0; this.grace = CONFIG.HIT_GRACE * this.stat("graceMult"); this.sfx.shieldBreak(); this.addShake(0.2, 5); return false; }
    if (M) { this.mounts.onHit(); return false; }                                     // montado: se pierde la montura, no la partida
    if (this.bosses.phase === "fight" && this.bossHearts > 0) {                      // corazones extra en los combates
      this.bossHearts--; this.grace = 1.5 * this.stat("graceMult"); this.sfx.lifeLost(); this.addShake(0.3, 6);
      this.floatText(pl.laneT, pl.x + 30, pl.y + 90, "-1 ♥", "#ff6b6b", 24); this.ach.event("heartLost", { boss: true });
      return false;
    }
    if (this.lives > 1) {   // modo Fácil: se pierde una vida y hay unos segundos de invencibilidad
      this.lives--; this.run.clean = false; this.grace = this.mode.hitInvuln; this.sfx.lifeLost(); this.addShake(0.3, 6);
      this.floatText(this.player.laneT, this.player.x + 30, this.player.y + 90, "-1 VIDA", "#ff6b6b", 22);
      this.ach.event("heartLost");
      return false;
    }
    const b = this.build, second = this.stat("secondChance") > b.used.secondChance, resu = this.stat("resurrection") && !b.used.resurrection;
    if (second || resu) {   // Segunda oportunidad / Resurrección (si tienes las dos, la segunda da +1 corazón en el siguiente jefe)
      this.run.clean = false;
      if (second) { b.used.secondChance++; if (resu) { b.used.resurrection = 1; this.pendingHeart++; } }
      else b.used.resurrection = 1;
      this.grace = 2 * this.stat("graceMult"); this.sfx.perfect(); this.addShake(0.4, 8); this.flashT = 0.3;
      this.floatText(pl.laneT, pl.x + 30, pl.y + 100, second ? "¡SEGUNDA OPORTUNIDAD!" : "¡RESURRECCIÓN!", "#ffd23f", 22);
      this.ach.event("revive");
      return false;
    }
    this.deathCause = this.bosses.phase === "fight" ? BOSS_NAMES[this.bosses.pending.type] : (this.lastHitBy || "Obstáculo");
    this.lives = 0; this.gameOver(); return true;
  }
  floatText(laneT, x, y, text, color = "#ffffff", size = 22) { this.floaters.push({ laneT, x, y, text, color, size, t: 0 }); }

  // ----- Niveles, huevos y jefes -----
  onLevelComplete(level) {
    if (!this.versus) this.save.markCompleted(level);     // desbloquea el checkpoint del nivel siguiente (no en multijugador)
    this.run.biomes.add(biomeOfLevel(level + 1).id);
    if (level % CONFIG.LEVELS.length === 0) {   // 10 000 puntos: los 10 niveles completados
      this.bossBanner = { t: 4, text: `¡HAS COMPLETADO LOS ${CONFIG.LEVELS.length} NIVELES!`, sub: "El viaje vuelve a empezar, más difícil", color: "#ffd23f" };
      this.sfx.jackpot();
    }
    const it = this.versus ? 0 : this.stat("interest");   // mejora Interés
    if (it > 0) { const n = Math.min(this.stat("interestCap"), Math.floor(this.runCoins * it)); if (n > 0) { this.addRunCoins(n); this.floatText(this.player.laneT, this.player.x + 40, this.player.y + 130, `INTERÉS +${n}`, "#ffd23f", 20); } }
    return this.eggsInLevel(level);
  }
  // Al empezar cada nivel (y la partida)
  onLevelStart(level) {
    if (this.mode.id === "random" && !this.versus && !this.tutorial) {   // modo Aleatorio: nueva regla sorpresa
      const pool = RANDOM_MODS.filter(m => !this.randomMod || m.id !== this.randomMod.id);
      this.randomMod = choice(pool); this.build.cache = {};
      this.level.bannerSub = `${this.randomMod.icon} ${this.randomMod.name}: ${this.randomMod.desc}`;
    }
    const sh = this.versus ? 0 : this.stat("startShield");   // Escudo inicial
    if (sh > 0) { this.effects.shield = this.effectMax.shield = sh; }
    this.mounts.planLevel(level); this.weather.planLevel(level);
    if (this.rogue) this.rogue.onLevelStart(level);
  }
  // Llamados por la clase Boss
  onBossDefeated(b) {
    const B = this.bosses, id = BOSS_IDS[B.pending.type], coins = Math.round(b.coins * this.mode.coinValue * this.stat("bossCoinMult"));
    this.runCoins += coins; this.runBosses++; this.runBossTiers.push(B.pending.secret ? 2 : B.pending.tier || 0);
    if (B.pending.secret) { this.season.addXP(SECRET_CONFIG.SEASON_XP); this.save.data.secretBeaten = (this.save.data.secretBeaten || 0) + 1; }
    this.distance += CONFIG.BOSS_POINTS * CONFIG.PX_PER_POINT;
    const s = this.save.data;
    if (!s.bossesDefeated.includes(id)) s.bossesDefeated.push(id);
    B.defeatedRun.add(id); this.save.save();
    this.sfx.bossDefeat(); this.addShake(0.6, 10); this.vibrate(60);
    if (this.netCoop) this.net.onLocalBossDefeated();   // avisa al equipo (y levanta a los caídos)
    this.bossBanner = B.pending.secret ? { t: 4, text: "¡JEFE SECRETO DERROTADO!", sub: `+${fmtNum(coins)} monedas · +${SECRET_CONFIG.SEASON_XP} XP del pase · ¡Eres una leyenda!`, color: "#ff5ce1" }
      : { t: 2.5, text: this.netCoop ? "¡JEFE DERROTADO EN EQUIPO!" : "¡BOSS DERROTADO!", sub: `+${fmtNum(coins)} monedas · +${CONFIG.BOSS_POINTS} puntos`, color: "#ffd23f" };
    this.ach.event("bossDefeated", { id, flawless: !B.hitTaken, fury: b.fury, tier: B.pending.tier, time: b.fightT });
    this.build.bossesBeaten++;
    if (this.rogue) this.rogue.queue("boss", 2.6);   // tras la animación de victoria: ELIGE UNA MEJORA
  }
  onBossRetreat(b) { this.ach.event("bossLost", { id: BOSS_IDS[this.bosses.pending.type], time: b ? b.fightT : 0 }); this.bossBanner = { t: 2, text: "El boss se retira", sub: "Sin premio… ¡la próxima vez!", color: "#cccccc" }; }
  burst(lane, x, y, colors, n) {
    for (let i = 0; i < n; i++) this.particles.push(new Particle(Math.round(clamp(lane, 0, 1)), x + rand(-12, 12), y + rand(-12, 12), rand(-260, 260), rand(100, 460), rand(0.4, 0.8), choice(colors), rand(3, 6)));
  }
  // Modo prueba: ir directamente al inicio de un bioma
  debugJump(i) {
    this.start(this.mode.id, 1);
    this.jumpToLevel(i + 1, 5);
    this.bosses.syncTo(i + 1);
    this.mounts.reset(); this.onLevelStart(i + 1);
    this.run.biomes.add(this.level.biome.id);
    this.level.banner = CONFIG.LEVEL_BANNER_TIME;
  }
  addShake(dur, mag) { this.shake = Math.max(this.shake, dur); this.shakeDur = Math.max(this.shake, dur); this.shakeMag = Math.max(this.shakeMag, mag); }
  puff(x, y, lane, n, color) {
    for (let i = 0; i < n; i++) this.particles.push(new Particle(lane, x + rand(-10, 10), y + rand(0, 6), rand(-120, 80), rand(40, 180), rand(0.25, 0.45), color, rand(2, 5), 600));
  }
  destroy(o, byRoar) {
    o.dead = true; this.sfx.smash();
    const hb = o.hitbox(), cols = o.colors;
    const top = Math.min(hb.y + hb.h, 160);
    for (let i = 0; i < 18; i++)
      this.particles.push(new Particle(o.lane, rand(hb.x, hb.x + hb.w), rand(hb.y, top), rand(-120, 320), rand(150, 600), rand(0.5, 0.9), choice(cols), rand(3, 7)));
    if (byRoar) this.ach.event("roarKill");
  }
  activate(pu) {
    const dur = this.mode.powerupDur(pu.type) * (this.versus ? 1 : this.stat("powerupDurMult") * (pu.type === "shield" ? this.stat("graceMult") : 1));
    pu.taken = true; this.effects[pu.type] = this.effectMax[pu.type] = dur; this.sfx.powerup();
    this.puff(pu.x, pu.y, pu.lane, 14, POWERUPS[pu.type].color);
    this.run.lastPowerup = this.distScore; this.run.powerupTypes.add(pu.type);
    this.ach.event("powerup", { type: pu.type });
  }
  takeEgg(e, lane) {
    e.taken = true;
    const value = Math.round(CONFIG.EGG_VALUE * this.mode.coinValue * this.stat("eggMult")), lvl = e.level || this.level.level;
    if (this.stat("eggFullFury")) this.fury.add(FURY_CONFIG.MAX); else this.fury.add(FURY_CONFIG.EGG);
    this.runCoins += value; this.runEggs++;
    this.run.eggs[lvl] = (this.run.eggs[lvl] || 0) + 1;
    this.sfx.egg();
    this.hatches.push({ lane, x: e.x, y: e.y, t: 0 });
    this.floatText(lane, e.x, e.y + 30, `+${fmtNum(value)}`, "#ffd23f", 26);
    for (let i = 0; i < 12; i++) this.particles.push(new Particle(lane, e.x, e.y, rand(-200, 200), rand(80, 360), rand(0.4, 0.8), choice(["#f3e2b8", "#fffdf2", "#8a5a2a", "#ffe27a"]), rand(2, 5), 900));
    this.ach.event("eggCollected", { level: lvl });
  }
  // Pasa las monedas de la partida al monedero y guarda récords (una sola vez por partida)
  bankRun() {
    if (this.banked) return;
    this.banked = true;
    const s = this.save.data, earned = this.runCoinsInt;
    s.coins += earned; s.eggWallet += this.runEggs;   // los huevos recogidos se gastan en la tienda de huevos
    this.statsMgr.runEnd();
    const sd = this.season.d; this.seasonBefore = { tier: sd.tier, frac: sd.tier >= SEASON_CONFIG.TIERS ? 1 : sd.xp / this.season.need() };
    this.runXP = this.tutorial ? 0 : this.season.xpForRun(this);
    if (this.daily && !this.versus && !this.tutorial) {   // carrera diaria: mejor marca del día, racha y premio del primer intento
      this.dailyResult = this.dailyRace.finish(this.score);
      if (this.dailyResult.reward) this.runXP += this.dailyResult.reward.xp;
    }
    this.runSeason = this.season.addXP(this.runXP);   // pase de temporada
    if (this.versus) { this.save.save(); return; }   // en multijugador no hay récords ni logros
    if (this.tutorial) { this.save.save(); return; }
    this.rogue.recordRun();
    if (!this.daily && !this.netRace && this.score > s.records[this.mode.id]) { s.records[this.mode.id] = this.score; this.newRecord = true; }   // la diaria tiene su propia marca
    this.runFossils = fossilsForRun(this); s.fossils += this.runFossils.total;   // árbol de mejoras
    this.save.save();
    this.ach.event("score", { score: this.score });
    this.ach.event("runEnd", { score: this.score });
    this.ach.event("coinsEarned", { n: earned });
    this.save.save();
    this.online.submitRun(this);   // ranking mundial (si tienes apodo)
  }
  gameOver() {
    this.state = "over"; this.overTime = 0; this.overShown = false; this.sfx.hit(); this.sfx.defeat(); this.addShake(0.4, 8);
    if (this.versus) { this.sfx.victory(); this.bankRun(); return; }
    const c = this.player.center, sk = SkinCatalog.get(this.skinId), cols = sk ? [sk.pal.b, sk.pal.o, "#ffffff"] : ["#ffffff"];
    for (let i = 0; i < 20; i++) this.particles.push(new Particle(this.player.logicalLane, c.x, c.y, rand(-250, 250), rand(100, 500), rand(0.5, 1), choice(cols), rand(3, 6)));
    this.vibrate(150);
    if (this.netRace) { this.net.onLocalDeath(); return; }   // online: se guarda al cerrar la carrera (en cooperativo puedes volver)
    this.bankRun();
  }

  // ----- Actualización (dt en segundos) -----
  update(dt) {
    this.time += dt; this.net.update(dt);
    this.tick60 = Math.floor(this.time * 60) !== Math.floor((this.time - dt) * 60);   // un «tic» de 1/60 s (efectos que salen una vez por tic)
    updatePrismSkins(this.time); this.season.update(dt);
    this.level.tick(dt);
    this.ach.update(dt);
    if (this.roulette.visible) this.roulette.update(dt);
    if (this.shop.visible) this.shop.update(dt);
    if (this.manual.visible) this.manual.update(dt);
    this.sfx.setMusic(musicFor(this));   // música propia de cada bioma (y de la portada y el jefe secreto)
    if (this.state !== "paused") {
      for (const f of this.floaters) f.t += dt;
      this.floaters = this.floaters.filter(f => f.t < 1.1);
      for (const h of this.hatches) h.t += dt;
      this.hatches = this.hatches.filter(h => h.t < 0.8);
      if (this.bossBanner && (this.bossBanner.t -= dt) <= 0) this.bossBanner = null;
    }
    const cloudSpeed = 10 + (this.state === "playing" ? this.effectiveSpeed * 0.03 : 4);
    for (const cl of this.clouds) { cl.x -= cloudSpeed * dt; if (cl.x < -cl.w - 20) { cl.x = W + rand(10, 200); cl.y = rand(20, 120); } }
    if (this.shake > 0) { this.shake -= dt; if (this.shake <= 0) this.shakeMag = 0; }
    this.updateAmbient(this.state === "paused" ? 0 : dt);

    if (MENU_STATES.includes(this.state)) {
      this.scroll += 120 * dt; this.player.anim += dt; this.player.tickSkin(dt, 120); this.updateParticles(dt); this.pets.update(dt, false);
      if ((this.menuT = (this.menuT || 0) + dt) > 8) { this.menuT = 0; this.level.setBiome((this.level.cur + 1) % BIOMES.length); }   // la portada recorre los biomas
      return;
    }
    if (this.state === "over") {
      this.overTime += dt; this.updateParticles(dt);
      if (!this.overShown && this.overTime > 0.7) { this.overShown = true; if (this.netRace) { if (this.net.mode === "done") this.net.showResult(); else this.net.waitView(); } else this.ui.showOver(); }
      if (this.netRace && this.overShown && this.net.mode === "racing" && (this.netRefresh = (this.netRefresh || 0) + dt) > 0.5) { this.netRefresh = 0; this.net.waitView(); }
      if (this.netRace && this.net.spec) this.net.updateSpectate(dt);   // espectando a un compañero
      return;
    }
    if (this.state !== "playing") return;
    if (this.netWait > 0) {   // cuenta atrás de la carrera online
      const before = Math.ceil(this.netWait); this.netWait -= dt; const now = Math.ceil(this.netWait);
      if (now !== before) { if (now > 0) this.sfx.tick(); else this.sfx.powerup(); }
      this.player.tickSkin(dt, 0); return;
    }

    // Temporizadores en tiempo real (no les afecta la cámara lenta)
    for (const k of POWERUP_TYPES) {
      if (this.effects[k] > 0) { this.effects[k] = Math.max(0, this.effects[k] - dt); if (k === "turbo" && this.effects[k] === 0) this.grace = CONFIG.HIT_GRACE; }
    }
    this.grace = Math.max(0, this.grace - dt); this.runTime += dt;
    this.roarCd = Math.max(0, this.roarCd - dt);
    this.fury.update(dt);
    if (this.superWave && (this.superWave.t += dt) > 0.7) this.superWave = null;
    this.roarAnim = Math.max(0, this.roarAnim - dt); this.flashT = Math.max(0, this.flashT - dt);

    const gdt = dt * (this.effects.slowmo > 0 ? CONFIG.SLOWMO_FACTOR : 1);   // tiempo de juego
    this.speed += (this.level.targetSpeed() - this.speed) * Math.min(1, gdt * CONFIG.SPEED_SMOOTHING);
    const sp = this.effectiveSpeed;
    this.distance += sp * gdt; this.scroll = this.distance;
    const sm = this.versus ? 1 : this.stat("scoreMult"); if (sm !== 1) this.bonusScore += (sm - 1) * sp * gdt / CONFIG.PX_PER_POINT;
    for (const p of this.players) p.tickSkin(dt, sp * (gdt / Math.max(dt, 1e-6)));   // px nativos por tick (con cámara lenta y turbo)

    for (const p of this.players) {
      if (!p.dead) p.update(gdt);
      else { p.deadT += dt; p.x -= sp * gdt; }   // el raptor eliminado se queda atrás
    }
    if (!this.versus) this.mounts.update(gdt, dt);
    if (this.tutorial) { this.tutorial.update(gdt, dt); }
    else if (this.versus || (this.netRace && !this.netCoop)) { this.level.check(); this.spawner.update(); }   // multijugador (local u online): sin jefes
    else if (!this.bosses.active) {
      this.level.check();                                    // durante un boss el cambio de nivel espera
      this.bosses.update(gdt, dt);                           // a mitad de nivel: "¡PELIGRO!" y llega el boss
      if (!this.bosses.active) this.spawner.update();        // durante un boss no hay obstáculos normales
    } else this.bosses.update(gdt, dt);
    for (const o of this.obstacles) o.update(gdt, sp, this);
    for (const c of this.coinsArr) c.update(gdt, sp, this);
    for (const p of this.powerups) p.update(gdt, sp);
    for (const e of this.eggs) e.update(gdt, sp);
    this.updateParticles(gdt);

    if (this.effects.turbo > 0 && this.tick60) {
      const p = this.player;
      this.particles.push(new Particle(p.logicalLane, p.x + 10, p.y + rand(8, p.sliding ? 22 : 50), rand(-400, -250), rand(-30, 30), 0.3, choice(["#ffb000", "#ff6a00", "#fff2a8"]), rand(3, 6), 0));
    }

    if (this.versus) for (const p of this.players) {   // rugidos de los dos raptores
      p.roarCd = Math.max(0, p.roarCd - dt); p.roarAnim = Math.max(0, p.roarAnim - dt); p.grace = Math.max(0, p.grace - dt);
      p.ink = Math.max(0, p.ink - dt);
      if (!p.dead && p.traps < CONFIG.TRAP_MAX && p.traps + p.thrown < CONFIG.TRAP_TOTAL && (p.trapT += dt) >= CONFIG.TRAP_RECHARGE) { p.traps++; p.trapT = 0; this.sfx.tick(); }
      const w = p.roarWave; if (!w) continue;
      w.t += dt;
      const reach = p.x + 70 + CONFIG.ROAR_RANGE * Math.min(1, w.t / CONFIG.ROAR_WAVE_TIME);
      for (const o of this.obstacles) if (!o.dead && o.destructible && o.lane === w.lane && o.x < reach && o.x + o.w > p.x) this.destroy(o, true);
      if (w.t > CONFIG.ROAR_WAVE_TIME + 0.2) p.roarWave = null;
    }
    // Onda del rugido: destruye rocas y pájaros delante del raptor en su carril (no cactus ni estalactitas)
    if (this.roarWave && !this.roarHits(this.roarWave, dt)) this.roarWave = null;
    if (this.echoT > 0 && (this.echoT -= dt) <= 0 && this.state === "playing") {   // Eco: se repite con la mitad de alcance
      const w0 = this.roarWave || {};
      this.echoWave = { t: 0, lane: this.player.logicalLane, style: roarStyleFor(this.skinId), range: this.stat("roarRange") / 2, both: !!this.stat("roarBothLanes"), back: !!this.stat("roarEchoBack"), echo: true };
      this.sfx.roar();
    }
    if (this.echoWave && !this.roarHits(this.echoWave, dt)) this.echoWave = null;
    if (!this.versus) this.updatePerks(dt, gdt);
    if (this.netRace) this.player.ink = Math.max(0, (this.player.ink || 0) - dt);   // trampa de tinta online
    this.weather.update(dt); this.pets.update(gdt, true);   // clima del bioma y mascota (te trae monedas)

    if (this.versus) { for (const p of this.players) if (!p.dead && this.state === "playing") this.checkCollisions(p); }
    else this.checkCollisions();

    this.obstacles = this.obstacles.filter(o => !o.dead && o.x + o.w > DESPAWN_X);
    this.coinsArr = this.coinsArr.filter(c => !c.taken && c.x > DESPAWN_X);
    this.powerups = this.powerups.filter(p => !p.taken && p.x > DESPAWN_X);
    this.eggs = this.eggs.filter(e => !e.taken && e.x > DESPAWN_X);
    if ((this.scoreT -= dt) <= 0) { this.scoreT = 0.25; this.ach.event("score", { score: this.score }); }
  }
  // Efectos de mejoras con estado propio: Raptor del tiempo, Manada fantasma, Nido seguro
  updatePerks(dt, gdt) {
    const pl = this.player;
    if (this.stat("timeRaptor")) {
      this.timeCd = Math.max(0, this.timeCd - dt);
      if (this.timeCd <= 0 && this.effects.slowmo <= 0 && this.grace <= 0) {
        const boxes = pl.hitboxes(), ahead = this.effectiveSpeed * 0.16;
        for (const o of this.obstacles) {
          if (o.dead || o.lane !== pl.logicalLane) continue;
          const hb = o.hitbox(), moved = { x: hb.x - ahead, y: hb.y, w: hb.w + ahead, h: hb.h };
          if (hb.x > pl.x + 10 && boxes.some(a => overlap(a, moved))) { this.effects.slowmo = this.effectMax.slowmo = 1; this.timeCd = 15; this.floatText(pl.laneT, pl.x + 40, pl.y + 110, "¡RAPTOR DEL TIEMPO!", "#9b5cff", 18); break; }
        }
      }
    }
    if (this.stat("ghostPack")) for (const gh of this.ghosts) {
      gh.cd = Math.max(0, gh.cd - dt);
      if (gh.cd > 0) continue;
      const gx = pl.x + gh.x;
      for (const o of this.obstacles) if (!o.dead && o.lane === pl.logicalLane && o.x < gx + 40 && o.x + o.w > gx) { this.destroy(o, true); gh.cd = 8; break; }
    }
    if (this.stat("eggSafe")) for (const e of this.eggs) if (!e.taken && !e.returned && e.x < pl.x - 40) { e.returned = true; e.x = pl.x + this.effectiveSpeed * 2; }   // Nido seguro: el huevo vuelve 2 s después
    if (this.rogue) this.rogue.update(dt);
  }
  updateParticles(dt) {
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => p.life > 0);
    if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
  }
  updateAmbient(dt) {
    const biome = this.level.biome, kind = biome.ambient, rate = { ash: 40, snow: 30, leaves: 3, bubbles: 12, spores: 10 }[kind] || 0;
    this.ambientAcc += dt * rate;
    while (this.ambientAcc >= 1) {
      this.ambientAcc -= 1;
      const a = { x: rand(0, W + 200), y: -6, kind, ph: rand(0, 6) };
      if (kind === "ash")    Object.assign(a, { vx: rand(-60, -20), vy: rand(30, 70), size: rand(1.5, 3), color: Math.random() < 0.25 ? "#ff8a3d" : "#8a7f7a" });
      if (kind === "snow")   Object.assign(a, { vx: rand(-40, -10), vy: rand(25, 60), size: rand(2, 3.5), color: "#ffffff" });
      if (kind === "leaves") Object.assign(a, { vx: rand(-80, -40), vy: rand(20, 45), size: 4, color: choice(["#4fa650", "#2f7a3c", "#8bc34a"]) });
      if (kind === "bubbles") Object.assign(a, { y: H + 6, vx: rand(-40, -15), vy: rand(-70, -35), size: rand(3, 6), color: "#bff8ff" });   // suben
      if (kind === "spores")  Object.assign(a, { y: rand(-6, H * 0.6), vx: rand(-50, -20), vy: rand(-10, 15), size: rand(2, 4), color: choice(biome.ambientColors || ["#ffffff"]) });
      this.ambient.push(a);
    }
    for (const a of this.ambient) { a.x += (a.vx + Math.sin(this.time * 2 + a.ph) * (a.kind === "leaves" ? 30 : 8)) * dt; a.y += a.vy * dt; }
    this.ambient = this.ambient.filter(a => a.y < H + 10 && a.y > -20 && a.x > -20);
  }
  checkCollisions(pl = this.player) {
    const lane = pl.logicalLane, boxes = pl.hitboxes();
    const hits = b => boxes.some(a => overlap(a, b));
    for (const o of this.obstacles) {
      if (o.dead || o.lane !== lane) continue;
      const hb = o.hitbox();
      if (!hits(hb)) {
        // "Por los pelos": distancia vertical mínima mientras el obstáculo pasa por debajo/encima del raptor
        for (const a of boxes) if (a.x < hb.x + hb.w && a.x + a.w > hb.x) {
          const gap = Math.max(a.y - (hb.y + hb.h), hb.y - (a.y + a.h));
          o.minGap = Math.min(o.minGap == null ? Infinity : o.minGap, gap);
        }
        if (!o.passed && hb.x + hb.w < boxes[0].x) {
          o.passed = true;
          if (pl.mount) pl.mount.onPass(o);
          this.fury.add(FURY_CONFIG.PASS + (o.kind === "flyer" && pl.sliding && !this.versus ? this.stat("slideFury") : 0));
          if (o.minGap != null && o.minGap >= 0 && o.minGap < FURY_CONFIG.NEAR_MISS_PX) {   // esquiva por los pelos
            this.fury.add(FURY_CONFIG.NEAR_MISS); this.ach.event("nearMiss");
            const inv = this.versus ? 0 : this.stat("nearMissInvuln"); if (inv) this.grace = Math.max(this.grace, inv);
            if (o.minGap < 5) this.ach.event("closeCall");
          }
        }
        continue;
      }
      o.passed = true; o.minGap = null;
      if (this.effects.turbo > 0) { this.destroy(o); this.addShake(0.15, 4); continue; }
      const M = pl.mount;
      if (M && M.passesThrough(o)) { o.ghosted = true; continue; }
      if (M && M.destroys(o)) { M.onDestroy(o); this.destroy(o); continue; }
      if (this.grace > 0) continue;
      this.lastHitBy = obstacleCause(o);
      if (this.hitPlayer(pl)) return;
      this.destroy(o);   // el escudo o la vida perdida rompen el obstáculo
    }
    if (!this.versus && this.bosses.boss && this.bosses.boss.collide(pl)) return;
    if (!this.versus && this.mounts.collide(pl, boxes)) return;
    const c0 = pl.center;
    for (const c of this.coinsArr) {
      if (c.taken) continue;
      const mr = this.versus ? (this.effects.magnet > 0 ? CONFIG.MAGNET_RADIUS : 0) : this.stat("midas") ? 0 : this.effects.magnet > 0 ? CONFIG.MAGNET_RADIUS : this.stat("naturalMagnet");
      if (mr > 0 && !c.magnet && Math.hypot(c.x - c0.x, c.y - c0.y) < mr && c.x > pl.x - 20) c.magnet = true;
      const got = c.magnet ? Math.hypot(c.x - c0.x, c.y - c0.y) < 26 : (c.lane === lane && hits(c.hitbox()));
      if (got) {
        const v = this.versus ? this.mode.coinValue : this.coinValue;
        c.taken = true; this.runCoins += v; pl.coins += v; this.sfx.coin();
        for (let i = 0; i < 6; i++) this.particles.push(new Particle(lane, c.x, c.y, rand(-120, 120), rand(60, 260), 0.4, choice(["#ffe27a", "#fff3b0", "#f7c948"]), rand(2, 4), 900));
        this.ach.event("coinCollected");
      }
    }
    for (const e of this.eggs) if (!e.taken && e.lane === lane && hits(e.hitbox())) this.takeEgg(e, lane);   // el imán no atrae huevos
    for (const p of this.powerups) if (!p.taken && p.lane === lane && hits(p.hitbox())) this.activate(p);
  }

  // ----- Dibujo -----
  // Fondo de la portada: el bioma (cambia cada pocos segundos) y el raptor corriendo, a pantalla completa
  drawMenuBg() {
    const cv = this.ui.menuBg, k = Math.min(window.devicePixelRatio || 1, RENDER.MENU_MAX_PX / innerWidth) * RENDER.LEVELS[this.quality || 0], cw = Math.round(innerWidth * k), ch = Math.round(innerHeight * k);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const c = cv.getContext("2d"), s = Math.max(cw / W, ch / H), tx = clamp(cw / 2 - 200 * s, cw - W * s, 0), ty = ch - H * s;
    c.setTransform(s, 0, 0, s, tx, ty); c.imageSmoothingEnabled = false;
    this.level.drawBackground(c);
    const p = this.player; this.pets.draw(c); this.drawEntity(c, p.laneT, p.x, () => p.draw(c));
    for (const a of this.ambient) { c.fillStyle = a.color; c.globalAlpha = 0.8; c.fillRect(Math.round(a.x), Math.round(a.y), a.size, a.size); }
    c.globalAlpha = 1;
  }
  // Calidad automática: mide el tiempo entre fotogramas y ajusta la resolución
  frameStat(dtMs) {
    const R = RENDER; this.slowRuns = this.slowRuns || 0; this.fAcc = (this.fAcc || 0) + dtMs; this.fN = (this.fN || 0) + 1;
    if (this.fN < R.SAMPLE) return;
    const avg = this.fAcc / this.fN; this.fAcc = 0; this.fN = 0; this.fpsAvg = 1000 / avg;
    const q = this.quality || 0;
    if (avg > R.SLOW_MS && q < R.LEVELS.length - 1) { if (++this.slowRuns >= R.SLOW_RUNS) { this.quality = q + 1; this.slowRuns = 0; this.fastRuns = 0; this.resize(); } return; }
    this.slowRuns = 0;
    if (avg < R.FAST_MS && q > 0) { if (++this.fastRuns >= R.UP_AFTER) { this.quality = q - 1; this.fastRuns = 0; this.resize(); } }
    else this.fastRuns = 0;
  }
  draw() {
    if (this.netRace !== this.netCls) { this.netCls = this.netRace; document.body.classList.toggle("net-race", this.netRace); }   // botón táctil de trampa
    const bgOn = MENU_STATES.includes(this.state);   // portada y todas las pantallas del menú: fondo animado a pantalla completa
    if (bgOn !== this.menuBgOn) { this.menuBgOn = bgOn; this.ui.menuBg.classList.toggle("hidden", !bgOn); }
    if (bgOn) {   // el canvas del juego queda tapado: solo se dibujan el fondo y los canvas propios de cada pantalla
      this.drawMenuBg();
      if (this.roulette.visible) this.roulette.draw();
      if (this.manual.visible) this.manual.drawDemos(this.time);
      return;
    }
    const c = this.ctx;
    if (this.canvas.clientWidth && this.canvas.clientWidth !== this.cssW) this.resize();
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.imageSmoothingEnabled = false;
    c.save();
    if (this.shake > 0) { const m = this.shakeMag * clamp(this.shake / (this.shakeDur || 1), 0, 1); c.translate(rand(-m, m), rand(-m, m)); }
    this.level.drawBackground(c);
    this.weather.drawBack(c);   // rayos de luz, meteoritos y relámpagos
    this.mounts.drawWater(c);   // río o mar de las monturas de agua
    const boss = this.bosses.boss;
    if (boss) boss.drawSky(c);
    this.drawLane(c, 0);
    this.pets.draw(c);   // la mascota corre por el carril del medio
    this.drawLane(c, 1);
    this.net.drawGhosts(c);   // rivales online
    if (this.versus || this.netRace) for (const p of this.players) if (p.ink > 0) {   // trampa de tinta: oscurece el carril de ese raptor por delante
      const a = Math.min(1, p.ink / 0.4) * 0.92, y0 = p.lane === 0 ? 150 : 246, y1 = p.lane === 0 ? 246 : 352;
      c.fillStyle = `rgba(10,6,24,${a})`; c.fillRect(300, y0, W - 300, y1 - y0);
      c.fillStyle = `rgba(10,6,24,${a * 0.5})`; c.fillRect(250, y0, 50, y1 - y0);
      for (let i = 0; i < 6; i++) { c.fillStyle = `rgba(90,60,160,${a * 0.6})`; c.fillRect(300 + ((i * 97 + this.time * 40) % (W - 300)), y0 + 10 + (i * 23) % (y1 - y0 - 20), 10, 6); }
    }
    for (const a of this.ambient) { c.fillStyle = a.color; c.globalAlpha = a.kind === "ash" ? 0.8 : 0.9; c.fillRect(Math.round(a.x), Math.round(a.y), a.size, a.size); }
    c.globalAlpha = 1;
    if (boss) boss.drawFx(c);
    if (["playing", "paused", "over"].includes(this.state)) this.level.drawPortal(c);
    for (const f of this.floaters) {
      const p = toScreen(f.laneT, f.x, f.y);
      c.globalAlpha = clamp(1 - (f.t - 0.7) / 0.4, 0, 1);
      this.ui.text(c, f.text, p.x, p.y - f.t * 45, f.size, f.color, "center");
    }
    c.globalAlpha = 1;
    this.weather.drawFront(c);   // lluvia, arena, nieve, niebla…
    c.restore();

    if (!this.vignette) { const v = c.createRadialGradient(W / 2, H * 0.55, H * 0.45, W / 2, H * 0.55, W * 0.62);   // viñeta suave (se crea una vez)
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.28)"); this.vignette = v; }
    c.fillStyle = this.vignette; c.fillRect(0, 0, W, H);
    if (this.effects.slowmo > 0) {
      const g = c.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.65);
      g.addColorStop(0, "rgba(120,90,255,0.05)"); g.addColorStop(1, "rgba(80,50,200,0.35)");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    if (!this.versus && this.stat("fog") && ["playing", "paused", "choice", "tip"].includes(this.state)) {   // Niebla
      if (!this.fogGrad) { const f = c.createLinearGradient(380, 0, 700, 0); f.addColorStop(0, "rgba(200,205,215,0)"); f.addColorStop(1, "rgba(200,205,215,0.93)"); this.fogGrad = f; }
      c.fillStyle = this.fogGrad; c.fillRect(380, 0, W - 380, H);
    }
    if (this.flashT > 0) { c.fillStyle = `rgba(255,240,180,${this.flashT * 1.6})`; c.fillRect(0, 0, W, H); }   // destello del rugido solar
    if (this.effects.turbo > 0 && this.state === "playing") {
      c.fillStyle = "rgba(255,255,255,0.35)";
      for (let i = 0; i < 10; i++) c.fillRect(rand(0, W), rand(20, H - 20), rand(40, 140), 2);
    }
    this.ui.draw(c);
    if (this.roulette.visible) this.roulette.draw();
    if (this.manual.visible) this.manual.drawDemos(this.time);
    this.tips.drawCanvas(this.time);
  }
  drawEntity(c, laneT, x, fn) { c.save(); applyLane(c, laneT); c.translate(x, 0); fn(); c.restore(); }
  drawLane(c, lane) {
    const boss = this.bosses.boss;
    if (boss) boss.drawGround(c, lane);
    for (const p of this.powerups) if (p.lane === lane) this.drawEntity(c, lane, p.x, () => p.draw(c));
    for (const o of this.obstacles) if (o.lane === lane) this.drawEntity(c, lane, o.x, () => {
      o.draw(c);
      if (o.trapBy) {   // banderita de quién puso la trampa
        const top = -(o.kind === "flyer" ? o.y + o.h : o.h) - 22, cx = o.w / 2, col = o.trapBy === 1 ? UI_T.go : UI_T.info;
        const tw = o.trapName ? 40 : 30; c.fillStyle = UI_T.line; c.fillRect(cx - tw / 2, top - 9, tw, 18); c.fillStyle = col; c.fillRect(cx - tw / 2 + 2, top - 7, tw - 4, 14);
        c.font = '10px "Raptor Pixel Display", monospace'; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#16111f"; c.fillText(o.trapName || "J" + o.trapBy, cx, top + 1);
      }
    });
    for (const k of this.coinsArr) if ((k.laneT < 0.5 ? 0 : 1) === lane) this.drawEntity(c, k.laneT, k.x, () => k.draw(c));
    for (const e of this.eggs) if (e.lane === lane) this.drawEntity(c, lane, e.x, () => e.draw(c));
    for (const h of this.hatches) if (h.lane === lane) this.drawEntity(c, lane, h.x, () => drawEggHalves(c, 0, -h.y, h.t / 0.8, 3));
    if (boss) boss.drawLayer(c, lane);
    if (!this.versus) { this.mounts.drawLane(c, lane); this.rogue.drawLane(c, lane); }
    if (!this.versus && lane === this.player.logicalLane && this.stat("ghostPack")) for (const gh of this.ghosts) {   // Manada fantasma
      const pl = this.player; SE.drawSprite(c, this.skinId, "run", Math.round((pl.x + gh.x) / 3), Math.round(-SE.H), 3, this.player.skinState.tick, { tint: "#7fd0ff", alpha: gh.cd > 0 ? 0.18 : 0.5 });
    }
    if (!this.net.spec) for (const p of this.players) if ((p.laneT < 0.5 ? 0 : 1) === lane) this.drawEntity(c, p.laneT, p.x, () => p.draw(c));
    const pl = this.player;
    c.save(); applyLane(c, lane);
    for (const p of this.particles) if (p.lane === lane) p.draw(c);
    c.globalAlpha = 1;
    if (this.versus) for (const p of this.players) {
      const w = p.roarWave; if (!w || w.lane !== lane) continue;
      const prog = Math.min(1, w.t / CONFIG.ROAR_WAVE_TIME), alpha = 1 - clamp((w.t - CONFIG.ROAR_WAVE_TIME * 0.6) / 0.35, 0, 1);
      drawRoarFx(c, w.style, p.x + 66, -(p.y + (p.sliding ? 18 : 42)), (CONFIG.ROAR_RANGE + 20) * prog, alpha, this.time);
    }
    for (const w of this.versus ? [] : [this.roarWave, this.echoWave]) if (w && (w.lane === lane || w.both)) {
      const prog = Math.min(1, w.t / CONFIG.ROAR_WAVE_TIME), alpha = 1 - clamp((w.t - CONFIG.ROAR_WAVE_TIME * 0.6) / 0.35, 0, 1);
      const ox = pl.x + 66, oy = -(pl.y + (pl.sliding ? 18 : 42));
      if (w.style && w.style.type === "ghost")   // rugido espectral: ecos del raptor avanzan con la onda
        for (let k = 1; k <= 3; k++) SE.drawSprite(c, this.skinId, "jump", Math.round((pl.x + prog * 90 * k) / 3), Math.round(-SE.H - pl.y / 3), 3, 0, { tint: w.style.colors[k % 3], alpha: alpha * 0.35 });
      drawRoarFx(c, w.style, ox, oy, ((w.range || CONFIG.ROAR_RANGE) + 20) * prog, alpha * (w.echo ? 0.6 : 1), this.time);
      if (w.back) { c.save(); c.translate(pl.x + 10, oy); c.scale(-1, 1); drawRoarFx(c, null, 0, 0, (w.range || CONFIG.ROAR_RANGE) * 0.6 * prog, alpha * 0.5, this.time); c.restore(); }
    }
    if (this.superWave) {   // súper rugido: onda que barre toda la pantalla
      const k = this.superWave.t / 0.7, r = k * (W + 200);
      c.strokeStyle = `rgba(255,154,60,${1 - k})`; c.lineWidth = 14 * (1 - k) + 2;
      c.beginPath(); c.arc(pl.x + 60, -(pl.y + 40), r, -Math.PI / 2, Math.PI / 2); c.stroke();
      c.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.7})`; c.lineWidth = 3;
      c.beginPath(); c.arc(pl.x + 60, -(pl.y + 40), r * 0.85, -Math.PI / 2, Math.PI / 2); c.stroke();
    }
    c.restore();
  }
}

