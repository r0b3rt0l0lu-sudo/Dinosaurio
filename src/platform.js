// =====================================================================
//  platform.js — la ÚNICA parte del juego que habla con la plataforma (CrazyGames).
//  El resto del juego solo llama a estas funciones; si mañana cambia la plataforma, solo se toca este archivo.
//
//  ESTADO ACTUAL: funciona SIN el SDK de CrazyGames.
//    · Guardado en localStorage del navegador.
//    · Idioma del navegador; móvil según el tipo de puntero.
//    · Anuncios: no hay (los botones de anuncio se ocultan y el juego sigue igual).
//
//  PARA CONECTAR EL SDK (con la documentación oficial delante: https://docs.crazygames.com):
//    1. En src/head.html, en el bloque marcado «@crazygames», descomenta la etiqueta <script> del SDK (TODO 1).
//    2. Aquí abajo pon USE_SDK = true y completa cada TODO con la llamada real.
//    3. Cuando quieras anuncios (fase Full Launch), pon ADS = true.
//  Los nombres que aparecen en los TODO son orientativos (no los he podido comprobar): usa los de la documentación.
// =====================================================================
(function () {
  "use strict";
  const BUILD = window.DR_BUILD || { target: "web" };
  const USE_SDK = false;   // ← interruptor del SDK de CrazyGames (desactivado)
  const ADS = false;       // ← interruptor de anuncios (desactivado hasta la fase Full Launch)
  const sdk = () => (USE_SDK && window.CrazyGames && window.CrazyGames.SDK) || null;

  // Almacén local (puede fallar en modo privado o con las cookies bloqueadas: nunca rompe el juego)
  const local = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  let playing = false, loading = false, adBusy = false;

  const platform = {
    target: BUILD.target,
    get adsEnabled() { return ADS && !!sdk() && !platform.adblock; },
    adblock: false,
    // Avisos para el juego: silenciar el audio SOLO cuando el anuncio empieza de verdad
    onAdAudio: null,   // función(silenciar: true|false) que pone el juego

    // ---------- Arranque ----------
    async init() {
      if (!sdk()) return;
      try {
        // TODO 2 · Inicializar el SDK (p. ej. await SDK.init()) antes de usar nada más.
        // TODO 3 · Comprobar si hay bloqueador de anuncios y guardarlo en platform.adblock.
      } catch (e) { console.warn("SDK de CrazyGames no disponible:", e); }
    },

    // ---------- Partida activa (el jugador está jugando de verdad) ----------
    gameplayStart() {
      if (playing) return; playing = true;
      if (sdk()) { /* TODO 4 · Avisar de que empieza el juego activo (gameplay start). */ }
    },
    gameplayStop() {
      if (!playing) return; playing = false;
      if (sdk()) { /* TODO 5 · Avisar de que se para el juego activo (gameplay stop): pausa, muerte, menús. */ }
    },
    get isPlaying() { return playing; },

    // ---------- Carga ----------
    loadingStart() {
      if (loading) return; loading = true;
      if (sdk()) { /* TODO 6 · Avisar de que empieza la carga (loading start). */ }
    },
    loadingStop() {
      if (!loading) return; loading = false;
      if (sdk()) { /* TODO 7 · Avisar de que ha terminado la carga (loading stop). */ }
    },

    // ---------- Idioma y dispositivo ----------
    // Código de idioma del jugador, p. ej. "es-ES" o "en-US"
    getLocale() {
      if (sdk()) { /* TODO 8 · Devolver el idioma que da el SDK (información del sistema / usuario: «locale»). */ }
      return (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    },
    // ¿Móvil o tableta?
    isMobile() {
      if (sdk()) { /* TODO 9 · Devolver si el SDK dice que el dispositivo es móvil o tableta (información del sistema). */ }
      try { return matchMedia("(pointer: coarse)").matches && !matchMedia("(hover: hover)").matches; } catch (e) { return false; }
    },

    // ---------- Guardado (texto) ----------
    save(key, value) {
      if (sdk()) { /* TODO 10 · Guardar con el módulo de datos del SDK (además de localStorage, o en su lugar). */ }
      return local.set(key, String(value));
    },
    load(key) {
      if (sdk()) { /* TODO 11 · Leer con el módulo de datos del SDK (si devuelve algo, usarlo). */ }
      return local.get(key);
    },
    remove(key) {
      if (sdk()) { /* TODO 12 · Borrar con el módulo de datos del SDK. */ }
      local.del(key);
    },

    // ---------- Anuncios ----------
    // Anuncio a mitad de partida: SIEMPRE se resuelve (haya anuncio, error o bloqueador)
    showMidgameAd() {
      if (!platform.adsEnabled || adBusy) return Promise.resolve();
      adBusy = true;
      return new Promise(resolve => {
        const done = () => { adBusy = false; if (platform.onAdAudio) platform.onAdAudio(false); resolve(); };
        try {
          // TODO 13 · Pedir un anuncio «midgame» al SDK con estos avisos:
          //   al empezar el anuncio  → if (platform.onAdAudio) platform.onAdAudio(true);
          //   al terminar            → done();
          //   si hay error o no hay  → done();
          done();
        } catch (e) { done(); }
      });
    },
    // Anuncio con recompensa: se resuelve a true (visto entero) o false (error, sin anuncio o bloqueador)
    showRewardedAd() {
      if (!platform.adsEnabled || adBusy) return Promise.resolve(false);
      adBusy = true;
      return new Promise(resolve => {
        const end = ok => { adBusy = false; if (platform.onAdAudio) platform.onAdAudio(false); resolve(ok); };
        try {
          // TODO 14 · Pedir un anuncio «rewarded» al SDK con estos avisos:
          //   al empezar el anuncio  → if (platform.onAdAudio) platform.onAdAudio(true);
          //   al terminar bien       → end(true);
          //   si hay error o no hay  → end(false);
          end(false);
        } catch (e) { end(false); }
      });
    },
    get adBusy() { return adBusy; },
  };
  window.platform = platform;
})();
