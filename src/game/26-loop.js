// =====================================================================
//  Bucle principal: requestAnimationFrame + delta time
// =====================================================================
let last = performance.now(), loopErrors = 0;
function loop(now) {
  requestAnimationFrame(loop);   // se pide el siguiente fotograma primero: un error no puede congelar el juego
  const dt = clamp((now - last) / 1000, 0, 0.05);   // nunca negativo (el primer fotograma puede llegar «antes») y sin saltos grandes
  if (!document.hidden && now > last) game.frameStat(now - last);
  last = Math.max(last, now);
  try { game.update(dt); game.draw(); }
  catch (e) { if (loopErrors++ < 5) console.error("Error en el bucle del juego:", e); }
}
requestAnimationFrame(loop);
