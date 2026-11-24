// =====================================================================
//  Entrada: teclado, gestos táctiles y botones en pantalla
// =====================================================================
platform.loadingStart();
const game = new Game(document.getElementById("game"));
platform.onAdAudio = on => game.sfx.adMute(on);   // el audio se para solo mientras un anuncio está en pantalla
// Idioma: el elegido en Opciones o, si no, el del jugador (español si su idioma es español; si no, inglés)
I18N.onChange = () => { game.ui.updateMute(); game.controls.applyLabels(); };
I18N.setLang(game.save.data.lang || I18N.pick(platform.getLocale()));
window.__game = game; window.__Obstacle = Obstacle; window.__applyLane = applyLane; window.__dbg = { HATS, drawRaptor, SE, SKINS_DATA }; // útil para depurar desde la consola
game.showMenu();

// Letra pulsada en minúscula (acepta mayúsculas, Bloq Mayús y Mayús)
const KEY_CODES = { KeyW: "w", KeyA: "a", KeyS: "s", KeyD: "d", KeyE: "e", KeyP: "p", KeyM: "m", KeyT: "t", KeyB: "b" };
// Las letras se leen por su POSICIÓN en el teclado (e.code): en un teclado AZERTY la tecla Z (donde la W) salta,
// Q (donde la A) va al carril de arriba, etc. El nombre que se muestra es el de tu teclado (ver keyName en Controles).
const keyOf = e => (e.code === "Space" ? "Space" : /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase()
  : e.key && e.key.length === 1 && e.key !== " " ? e.key.toLowerCase() : KEY_CODES[e.code] || e.code);
const C = game.controls;   // teclas configurables (Opciones → Controles)
addEventListener("keydown", e => {
  const k = keyOf(e), st = game.state;
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;           // escribir el nombre de un diseño
  // Si el foco está en un botón, Espacio/Enter lo pulsan (comportamiento normal del navegador)
  if ((e.code === "Space" || e.code === "Enter") && e.target.closest && e.target.closest("button")) return;
  // Acción de la tecla según los controles elegidos (por defecto: W saltar · S deslizarse · A/D carril · E rugido · P pausa, y también las flechas)
  const act = C.action(k), a1 = game.versus ? C.action(k, "vs1") : null, a2 = game.versus ? C.action(k, "vs2") : null;
  if ("wasde".includes(k) && k.length === 1) e.preventDefault();
  if ((k.startsWith("Arrow") || act || a1 || a2) && ["playing", "paused", "over"].includes(st)) e.preventDefault();   // las flechas y el espacio no mueven la página
  if (game.versus) {   // mantener pulsado: deslizarse / caída rápida y planear
    if (a1 === "slide") game.player.downHeld = true; if (a1 === "jump") game.player.upHeld = true;
    if (a2 === "slide") game.p2.downHeld = true; if (a2 === "jump") game.p2.upHeld = true;
  } else { if (act === "slide") game.player.downHeld = true; if (act === "jump") game.player.upHeld = true; }   // planeo y monturas (roca de lava, seta)
  if (e.repeat) return;
  if (DEBUG && k === "m" && st === "playing" && !game.versus) { game.mounts.debugGive(e.shiftKey); return; }   // M: montura del bioma · Mayús+M: recorre las 10
  if (k === "m") { game.toggleMute(); return; }
  if (game.manual.visible) {
    if (k === "Escape") game.manual.close();
    else if (k === "a" || act === "laneUp") game.manual.show(game.manual.page - 1);
    else if (k === "d" || act === "laneDown") game.manual.show(game.manual.page + 1);
    return;
  }
  if (game.roulette.visible) { if (k === "Escape") game.roulette.close(); return; }
  if (game.history.visible) { if (k === "Escape") game.history.close(); return; }
  if (game.album.visible) { if (k === "Escape") game.album.close(); return; }
  if (game.tree.visible) { if (k === "Escape") game.tree.close(); return; }
  if (game.statsMgr.visible) { if (k === "Escape") game.statsMgr.close(); return; }
  if (game.netScreen.visible) { if (k === "Escape") game.netScreen.close(); return; }
  if (game.ranking.visible) { if (k === "Escape") game.ranking.close(); return; }
  if (game.backup.visible) { if (k === "Escape") game.backup.close(); return; }
  if (game.controls.visible) { if (k === "Escape") game.controls.close(); return; }
  if (game.tips.visible) { if (["w", "Enter", "Escape", "ArrowUp"].includes(k) || e.code === "Space" || act === "jump") game.tips.close(); return; }
  if (st === "choice") {   // elección de mejora o pacto: A/D o flechas + W/Intro, R barajar, Q saltar, 1–4 directa
    const S = game.rogue.screen;
    if (k === "a" || k === "ArrowLeft" || act === "laneUp") S.move(-1);
    else if (k === "d" || k === "ArrowRight" || act === "laneDown") S.move(1);
    else if (k === "w" || k === "ArrowUp" || k === "Enter" || e.code === "Space" || act === "jump") S.confirm();
    else if (k === "r") S.reroll();
    else if (k === "q") S.skip();
    else if (/^Digit[1-4]$/.test(e.code) && S.kind !== "pact") S.pick(+e.code[5] - 1);
    return;
  }
  if (DEBUG && st === "playing" && !game.versus) {   // modo prueba del roguelike
    if (k === "u") { if (e.shiftKey) { const u = choice(UPGRADES.filter(u => game.rogue.pool.available(u))); if (u) game.build.add(u.id); } else game.rogue.screen.openChoice("boss"); return; }
    if (k === "l") { game.build.forceLegend = true; game.floatText(game.player.laneT, game.player.x + 40, 200, "LEGENDARIA EN LA SIGUIENTE TIRADA", "#ffb938", 16); return; }
    if (k === "k") { game.rogue.debugAltar(); return; }
  }
  if (game.ach.visible) { if (k === "Escape") game.ach.close(); return; }
  if (DEBUG && /^Digit[0-9]$/.test(e.code) && ["menu", "play", "over", "playing", "paused"].includes(st)) { game.debugJump((+e.code[5] + 9) % 10); return; }   // 1–9 y 0 = nivel 10
  if (DEBUG && k === "b" && st === "playing") { game.bosses.force(); return; }
  if (st === "menu") {
    if (k === "w") game.openPlay();
    else if (k === "t") game.openShop("menu");
    else if (k === "Escape") game.ui.menuBack();
    else if (k === "ArrowDown" || k === "ArrowUp" || k === "ArrowLeft" || k === "ArrowRight") { e.preventDefault(); game.ui.menuFocus(k === "ArrowDown" || k === "ArrowRight" ? 1 : -1); }
  } else if (st === "play") {
    if (k === "w" || act === "jump") { if (game.ui.versusSel) game.startVersus(game.ui.selMode); else game.start(game.ui.selMode, game.ui.selLevel); }
    else if (k === "Escape") game.showMenu();
  } else if (st === "shop") {
    if (k === "Escape") game.shop.close();
  } else if (st === "over") {
    if (game.overTime < 0.7) return;
    if (game.netRace) {   // online: se usan los botones del podio; caído, ◀ ▶ cambian a quién espectas y T muestra la clasificación
      const N = game.net;
      if (N.mode === "racing") { if (act === "laneUp" || k === "ArrowLeft") N.specCycle(-1); else if (act === "laneDown" || k === "ArrowRight") N.specCycle(1); else if (k === "t") N.toggleBoard(); }
      if (k === "Escape" && N.mode !== "racing") { N.leaveAll(); game.showMenu(); }
      return;
    }
    if (k === "w" || act === "jump") game.retry();
    else if (k === "t") game.openShop("over");
    else if (k === "Escape") game.showMenu();
  } else if (st === "paused") {
    if (k === "p" || k === "Escape" || k === "w" || act === "pause" || act === "jump") game.setPaused(false);
  } else if (st === "playing" && game.versus) {
    // Multijugador local — por defecto J1: W saltar · S deslizarse · E/D rugido · A trampa   J2: ↑ · ↓ · →/Intro · ←
    for (const [a, p] of [[a1, game.player], [a2, game.p2]]) switch (a) {
      case "jump": p.jump(); break;
      case "slide": p.slide(); break;
      case "roar": game.roarP(p); break;
      case "trap": game.throwTrap(p); break;
    }
    if (k === "Escape" || (!a1 && !a2 && act === "pause")) game.setPaused(true);
  } else if (st === "playing") {
    switch (k === "Escape" ? "pause" : act) {
      case "jump": game.jump(); break;
      case "slide": game.player.slide(); break;
      case "laneUp": game.player.changeLane(-1); break;     // carril de arriba
      case "laneDown": game.player.changeLane(1); break;    // carril de abajo
      case "roar": game.roar(); break;
      case "trap": if (game.netRace) game.net.throwTrap(); break;   // online: trampa al rival / escudo al compañero
      case "pause": game.setPaused(true); break;
    }
  }
});
addEventListener("keyup", e => {
  const k = keyOf(e), pl = game.player, p2 = game.p2;
  if (game.versus) { const a1 = C.action(k, "vs1"), a2 = C.action(k, "vs2"); if (a1 === "slide") pl.downHeld = false; if (a1 === "jump") pl.upHeld = false; if (a2 === "slide") p2.downHeld = false; if (a2 === "jump") p2.upHeld = false; }
  else { const a = C.action(k); if (a === "slide") pl.downHeld = false; if (a === "jump") pl.upHeld = false; }
});

// Móvil (opción A): tocar en cualquier sitio = saltar AL INSTANTE (al apoyar el dedo) · mantener = planear ·
// deslizar ↓ = deslizarse (si acabas de saltar con ese mismo toque, el salto se anula) · botones ▲ ▼ 📢 abajo y ❚❚ arriba.
// Cada dedo cuenta por separado: un segundo dedo es un segundo salto (doble salto), nunca bloquea ni duplica.
const touches = new Map();   // identificador del dedo → { y0, t0, done }
const inUI = e => e.target.closest && e.target.closest(".overlay, button, #specBar");
function enableTouchMode() { if (!game.touchMode) { game.touchMode = true; document.body.classList.add("touch"); } }
if (platform.isMobile()) enableTouchMode();
document.addEventListener("touchstart", e => {
  enableTouchMode();
  if (inUI(e)) return;
  if (game.state !== "playing" && game.state !== "paused") return;
  e.preventDefault(); game.sfx.unlock();
  for (const t of e.changedTouches) { touches.set(t.identifier, { y0: t.clientY, t0: performance.now(), done: false }); game.primary(); }
  game.player.upHeld = true;
}, { passive: false });
document.addEventListener("touchmove", e => {
  if (!touches.size || inUI(e)) return;
  e.preventDefault();
  for (const t of e.changedTouches) {
    const s = touches.get(t.identifier); if (!s || s.done) continue;
    if (t.clientY - s.y0 > 30) {   // deslizar hacia abajo
      s.done = true; if (game.state !== "playing") continue;
      const pl = game.player; if (performance.now() - s.t0 < 250) pl.cancelJump();
      pl.downHeld = true; pl.slide();
    }
  }
}, { passive: false });
// iOS: si el audio quedó en pausa (al volver de segundo plano), se reanuda dentro del siguiente gesto del jugador
for (const ev of ["touchend", "click", "keydown"]) document.addEventListener(ev, () => {
  const c = game.sfx.ctx; if (c && c.state !== "running" && !game.sfx.adMuted) { const p = c.resume(); if (p && p.catch) p.catch(() => {}); }
}, { passive: true });
const touchEnd = e => {
  for (const t of e.changedTouches) touches.delete(t.identifier);
  if (!e.touches.length) { touches.clear(); game.player.downHeld = false; game.player.upHeld = false; }
};
document.addEventListener("touchend", touchEnd);
document.addEventListener("touchcancel", touchEnd);
// El botón de pausa va arriba a la derecha, sobre el juego (en su sitio no se dibuja el anillo del rugido en el móvil)
document.getElementById("stage").appendChild(document.querySelector("#touch .t-pause"));
// El botón del rugido muestra la recarga y brilla cuando está listo
const roarBtn = document.querySelector("#touch .roar");
function updateTouchButtons() {
  if (!game.touchMode) return;
  const max = game.roarCdMax || game.mode.roarCooldown || 1, cd = game.state === "playing" ? Math.max(0, game.roarCd) : 0;
  roarBtn.style.setProperty("--cd", (cd / max).toFixed(3)); roarBtn.classList.toggle("ready", cd <= 0 || game.fury.full);
}
document.getElementById("stage").addEventListener("mousedown", () => { if (!game.touchMode) game.primary(); });

document.querySelectorAll("#touch button, #stage > .t-pause").forEach(b => b.addEventListener("pointerdown", e => {
  e.preventDefault(); e.stopPropagation(); game.sfx.unlock();
  const playing = game.state === "playing";
  switch (b.dataset.act) {
    case "laneUp": if (playing) game.player.changeLane(-1); break;
    case "laneDown": if (playing) game.player.changeLane(1); break;
    case "roar": if (game.versus) game.roarP(game.player); else game.roar(); break;
    case "trap": if (playing && game.netRace) game.net.throwTrap(); break;
    case "pause": game.togglePause(); break;
  }
}));

/*@web*/// App instalable (PWA): service worker y botón «Instalar app» (solo cuando se abre desde una dirección web; no existe en CrazyGames)
let installPrompt = null;
const isStandalone = () => matchMedia("(display-mode: fullscreen)").matches || matchMedia("(display-mode: standalone)").matches || navigator.standalone;
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; });
addEventListener("appinstalled", () => { installPrompt = null; document.getElementById("installSub").textContent = "¡Instalada! Búscala en tu pantalla de inicio"; });
if (isStandalone()) document.body.classList.add("app");
document.getElementById("btnInstall").addEventListener("click", async e => {
  e.currentTarget.blur(); game.sfx.click(); const sub = document.getElementById("installSub");
  if (isStandalone()) { sub.textContent = "Ya estás jugando con la app instalada"; return; }
  if (installPrompt) { installPrompt.prompt(); const r = await installPrompt.userChoice; installPrompt = null; sub.textContent = r.outcome === "accepted" ? "¡Instalando!" : "Instalación cancelada"; return; }
  if (!location.protocol.startsWith("http")) { sub.textContent = "Abre el juego desde su dirección web (no como archivo) para instalarlo"; return; }
  sub.textContent = /iphone|ipad|ipod/i.test(navigator.userAgent) ? "En Safari: Compartir → «Añadir a pantalla de inicio»" : "Menú del navegador (⋮) → «Instalar aplicación» o «Añadir a pantalla de inicio»";
});
// En la app instalada, el primer toque pide pantalla completa y gira a horizontal si el móvil lo permite
document.addEventListener("pointerdown", () => {
  if (!isStandalone() || document.fullscreenElement) return;
  const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape").catch(() => {})).catch(() => {});
}, { once: true });
/*@end*/
document.addEventListener("visibilitychange", () => { if (document.hidden && game.state === "playing") game.setPaused(true); });

