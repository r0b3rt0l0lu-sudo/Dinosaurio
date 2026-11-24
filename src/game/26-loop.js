// =====================================================================
//  Bucle principal: requestAnimationFrame con PASO FIJO de simulación.
//  La lógica (física, salto, velocidad, temporizadores, obstáculos) avanza siempre en pasos de 1/240 s,
//  así el juego se comporta igual a 30, 60, 144 o 165 Hz. El dibujo va aparte, una vez por fotograma.
// =====================================================================
const LOOP_CONFIG = {
  STEP: 1 / 240,      // s por actualización lógica (240 por segundo: sin tirones en monitores de 144/165 Hz)
  MAX_FRAME: 0.1,     // s máximos por fotograma: al volver de otra pestaña no se atraviesan obstáculos
  MAX_STEPS: 30,      // tope de actualizaciones por fotograma (si el ordenador va muy lento)
};
let last = performance.now(), loopErrors = 0, simAcc = 0;
// Avanza la simulación el tiempo real de un fotograma (en pasos fijos)
function advance(frameS) {
  simAcc += clamp(frameS, 0, LOOP_CONFIG.MAX_FRAME);
  let n = 0;
  while (simAcc >= LOOP_CONFIG.STEP && n < LOOP_CONFIG.MAX_STEPS) { game.update(LOOP_CONFIG.STEP); simAcc -= LOOP_CONFIG.STEP; n++; }
  if (n >= LOOP_CONFIG.MAX_STEPS) simAcc = 0;   // demasiado atrasado: se descarta el resto en vez de acumularlo
}
function loop(now) {
  requestAnimationFrame(loop);   // se pide el siguiente fotograma primero: un error no puede congelar el juego
  if (game.frozen) { last = now; return; }   // imagen congelada (generador de portadas)
  const frameS = Math.max(0, (now - last) / 1000);   // nunca negativo (el primer fotograma puede llegar «antes»)
  if (!document.hidden && now > last) game.frameStat(now - last);
  last = Math.max(last, now);
  try { advance(frameS); game.draw(); syncGameplay(); updateTouchButtons(); }
  catch (e) { if (loopErrors++ < 5) console.error("Error en el bucle del juego:", e); }
}
// Avisa a la plataforma de cuándo se está jugando de verdad (no en menús, pausa, cuenta atrás ni anuncios)
function syncGameplay() {
  const active = game.state === "playing" && !(game.netWait > 0) && !document.hidden && !platform.adBusy;
  if (active !== platform.isPlaying) active ? platform.gameplayStart() : platform.gameplayStop();
}
requestAnimationFrame(loop);
// Arranque de la plataforma: la carga termina cuando ya se ve la portada
platform.init().then(() => requestAnimationFrame(() => platform.loadingStop()));
