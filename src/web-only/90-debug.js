// =====================================================================
//  Modo de depuración (?debug=1): prueba de física a distintas tasas de refresco.
//  Simula fotogramas de 30, 60, 144 y 165 Hz con el MISMO bucle del juego (advance) y mide
//  la altura máxima del salto y la distancia recorrida en 10 s. Los valores deben coincidir.
//  Solo va en la versión web: no se incluye en el paquete de CrazyGames.
// =====================================================================
const DEBUG_PARAMS = new URLSearchParams(location.search);
// Una prueba: partida limpia en Normal, sin obstáculos ni consejos, salto y 10 s corriendo
function physicsTest(hz) {
  const g = game, keepTips = g.save.data.tips.off, frame = 1 / hz;
  g.save.data.tips.off = true; g.start("normal", 1);
  g.effects.shield = 1e9; g.grace = 1e9; g.spawner.nextAt = 1e12; g.bosses.nextAt = 1e9;
  simAcc = 0;
  const run = s => { for (let i = 0, n = Math.round(s * hz); i < n; i++) { advance(frame); g.obstacles = []; g.coinsArr = []; } };
  run(0.5);                                    // arranque
  // La altura se mide tras cada paso de simulación (no solo al final de cada fotograma)
  let top = 0; const upd = g.update; g.update = function (dt) { upd.call(this, dt); top = Math.max(top, this.player.y); };
  g.jump();
  try { for (let i = 0, n = Math.round(1.5 * hz); i < n; i++) { advance(frame); g.obstacles = []; } } finally { g.update = upd; }
  const d0 = g.distance; run(10);
  g.save.data.tips.off = keepTips;
  return { hz, jump: top, dist: g.distance - d0 };
}
if (DEBUG_PARAMS.get("debug") === "1") {
  window.__physicsTest = physicsTest;
  const box = document.createElement("div");
  box.id = "debugBox";
  box.style.cssText = "position:fixed;left:8px;top:8px;z-index:9999;background:rgba(14,11,22,.94);color:#f3ecd8;font:12px monospace;padding:10px 12px;border:2px solid #ffd23f;max-width:360px";
  box.innerHTML = `<b>DEBUG · prueba de física</b><br><button id="dbgRun" style="margin:6px 0;font:12px monospace">Probar 30 / 60 / 144 / 165 FPS</button><div id="dbgOut">Pulsa el botón (tarda unos segundos)</div>`;
  document.body.appendChild(box);
  document.getElementById("dbgRun").addEventListener("click", e => {
    e.currentTarget.blur(); const out = document.getElementById("dbgOut"); out.textContent = "Probando…";
    setTimeout(() => {
      const rows = [30, 60, 144, 165].map(physicsTest);
      game.showMenu();
      const same = k => rows.every(r => Math.abs(r[k] - rows[0][k]) < 0.01);
      out.innerHTML = `<table style="border-collapse:collapse">${"<tr><th>FPS</th><th>&nbsp;Salto (px)</th><th>&nbsp;Distancia 10 s (px)</th></tr>"}${rows.map(r => `<tr><td>${r.hz}</td><td align=right>${r.jump.toFixed(2)}</td><td align=right>${r.dist.toFixed(1)}</td></tr>`).join("")}</table>` +
        `<div style="margin-top:6px;color:${same("jump") && same("dist") ? "#5fd15a" : "#ff6b6b"}">${same("jump") && same("dist") ? "✔ Iguales en todas las tasas" : "✘ Hay diferencias"}</div>`;
    }, 30);
  });
}
