// =====================================================================
//  Recompensa diaria: la primera vez que abres el juego cada día recoges un premio.
//  Racha de 7 días (si faltas un día, vuelve al día 1). Se ve el premio de cada día, sin trucos ni sorpresas.
//  No sale la primera vez que se juega (para entrar a jugar directamente).
// =====================================================================
const LOGIN_REWARDS = [
  { coins: 50 }, { coins: 75 }, { coins: 100 }, { coins: 125 }, { coins: 150 }, { coins: 200 }, { coins: 300, eggs: 2 },
];
class LoginReward {
  constructor(game) {
    this.g = game; const $ = id => document.getElementById(id);
    this.el = $("loginScr"); this.list = $("loginDays"); this.sub = $("loginSub");
    $("loginGet").addEventListener("click", e => { e.currentTarget.blur(); this.collect(); });
  }
  get d() { const s = this.g.save.data; return s.login || (s.login = { last: "", streak: 0 }); }
  get visible() { return !this.el.classList.contains("hidden"); }
  // Día de la racha que toca hoy (1–7)
  get day() { const d = this.d; return d.last === yesterdayKey() ? (d.streak % LOGIN_REWARDS.length) + 1 : 1; }
  get pending() { const s = this.g.save.data; return this.d.last !== dayKey() && s.tutorialDone && !BUILD_IS_RECORDING(); }
  // Se llama al volver a la portada
  check() { if (this.pending && this.g.state === "menu") this.open(); }
  open() {
    const today = this.day;
    this.sub.textContent = `Día ${today} de ${LOGIN_REWARDS.length} · si faltas un día, la racha vuelve al día 1`;
    this.list.innerHTML = LOGIN_REWARDS.map((r, i) => `<div class="login-day${i + 1 < today ? " done" : i + 1 === today ? " today" : ""}">
      <small>Día ${i + 1}</small><b><span class="coin"></span> ${r.coins}</b>${r.eggs ? `<em>+${r.eggs} 🥚</em>` : ""}</div>`).join("");
    this.el.classList.remove("hidden"); this.g.sfx.click();
  }
  collect() {
    const g = this.g, d = this.d, s = g.save.data, day = this.day, r = LOGIN_REWARDS[day - 1];
    if (d.last === dayKey()) { this.el.classList.add("hidden"); return; }
    d.streak = day === 1 ? 1 : d.streak + 1; d.last = dayKey();
    s.coins += r.coins; if (r.eggs) s.eggWallet += r.eggs;
    g.save.save(); g.sfx.jackpot();
    this.el.classList.add("hidden");
    g.ach.queue.push({ title: "🎁 Recompensa diaria", name: `+${r.coins} monedas` + (r.eggs ? ` · +${r.eggs} 🥚` : ""), line: `Día ${day} de ${LOGIN_REWARDS.length}`, cat: "coleccion" });
    g.ui.showMenu(true);
  }
}
// En el modo grabación (?record=1) no sale nada que tape el juego
const BUILD_IS_RECORDING = () => /[?&]record=1/.test(location.search);
