// =====================================================================
//  i18n.js — idiomas del juego (español e inglés).
//
//  Cómo funciona (sin tener que tocar cada pantalla):
//    · El texto en ESPAÑOL hace de «clave». Las traducciones están en i18n/en.js: { "Jugar": "Play", … }.
//    · Lo que se ve en pantalla se traduce al vuelo:
//        - menús y pantallas (HTML): cada texto nuevo o cambiado se traduce en cuanto aparece;
//        - lo dibujado en el lienzo del juego (marcador, avisos, jefes…): al dibujarlo.
//    · Los números se respetan solos: "Nivel 3" usa la entrada "Nivel {0}"... o "Nivel 1" (cualquier número vale).
//    · {0}, {1}… en una clave = «cualquier texto» (nombres, cantidades); se colocan en la traducción
//      donde estén {0}, {1}… y también se traducen si son textos conocidos (p. ej. el nombre de una skin).
//    · Si falta una traducción se ve el español (nunca se rompe nada). Con ?i18n=missing se listan las que faltan.
//  Para el código: I18N.t("texto") traduce a mano (p. ej. antes de partir un texto en líneas).
// =====================================================================
(function () {
  "use strict";
  const DICTS = { es: null, en: window.I18N_EN || {} };   // es = el propio texto
  const LANGS = { es: { name: "Español", locale: "es-ES", html: "es" }, en: { name: "English", locale: "en-US", html: "en" } };
  const SENT = n => "⟦" + n + "⟧", SENT_RE = /⟦(\d+)⟧/g;   // ⟦0⟧: hueco para un número
  const HAS_LETTERS = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¡¿]/;
  let lang = "es", exact = new Map(), norm = new Map(), keys = null, upper = null, patterns = [], missing = new Map();

  // Prepara el diccionario: números → huecos, versiones en MAYÚSCULAS y patrones con {0}
  function compile(dict) {
    keys = new Map(); upper = new Map(); patterns = [];
    const add = (k, v) => {
      // Los números sueltos pasan a ser huecos ⟦n⟧ (los {0}, {1}… se respetan tal cual)
      const nums = []; const nk = k.replace(/\{\d+\}|\d+/g, m => m[0] === "{" ? m : (nums.push(m), SENT(nums.length - 1)));
      let nv = v; nums.forEach((m, i) => { nv = nv.replace(new RegExp("(^|[^\\d{])" + m + "(?![\\d}])"), (all, pre) => pre + SENT(i)); });
      if (/\{\d+\}/.test(nk)) {   // patrón con huecos de texto
        for (const [kk, vv] of [[nk, nv], [nk.toUpperCase(), upperKeepHoles(nv)]]) {
          const lit = kk.replace(/\{\d+\}/g, "").length; if (!lit) continue;
          const order = []; const re = new RegExp("^" + kk.split(/(\{\d+\})/).map(p => { const m = /^\{(\d+)\}$/.exec(p); if (m) { order.push(+m[1]); return "([\\s\\S]+?)"; } return p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("") + "$");
          patterns.push({ re, order, v: vv, lit });
        }
      } else { keys.set(nk, nv); const u = nk.toUpperCase(); if (u !== nk && !keys.has(u)) upper.set(u, upperKeepHoles(nv)); }
    };
    for (const k in dict) if (typeof dict[k] === "string") add(k, dict[k]);
    patterns.sort((a, b) => b.lit - a.lit);   // los más concretos primero
  }
  const upperKeepHoles = s => s.replace(/(<[^>]*>)|([^<]+)/g, (m, tag, txt) => tag || txt.toUpperCase()).replace(/\{(\d+)\}/g, "{$1}");
  // Traduce un texto ya «normalizado» (con ⟦n⟧ en vez de números). null = no hay traducción
  function lookup(s) {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2];
    if (!core || !HAS_LETTERS.test(core)) return s;
    let v = keys.get(core);
    if (v === undefined) v = upper.get(core);
    if (v === undefined) for (const p of patterns) {
      const r = p.re.exec(core); if (!r) continue;
      v = p.v.replace(/\{(\d+)\}/g, (all, i) => { const cap = r[p.order.indexOf(+i) + 1]; if (cap === undefined) return all; const t = lookup(cap); return t === null ? cap : t; });
      break;
    }
    return v === undefined ? null : m[1] + v + m[3];
  }
  // Traduce cualquier texto que vaya a verse
  function tr(s) {
    if (lang === "es" || typeof s !== "string" || !s || !HAS_LETTERS.test(s)) return s;
    let r = exact.get(s); if (r !== undefined) return r;
    const nums = []; const n = s.replace(/\d+/g, d => (nums.push(d), SENT(nums.length - 1)));
    let tpl = norm.get(n);
    if (tpl === undefined) {
      tpl = lookup(n);
      if (tpl === null) { tpl = n; if (I18N.collect) missing.set(n.replace(SENT_RE, "{n}"), (missing.get(n.replace(SENT_RE, "{n}")) || 0) + 1); }
      if (norm.size > 4000) norm.clear(); norm.set(n, tpl);
    }
    r = nums.length ? tpl.replace(SENT_RE, (m, i) => nums[i] !== undefined ? nums[i] : m) : tpl;
    if (exact.size > 3000) exact.clear(); exact.set(s, r);
    return r;
  }

  // ---------- Lienzo: se traduce al dibujar y al medir (para que los textos ocupen lo que deben) ----------
  const CP = CanvasRenderingContext2D.prototype, fill = CP.fillText, stroke = CP.strokeText, measure = CP.measureText;
  CP.fillText = function (t, ...a) { return fill.call(this, lang === "es" ? t : tr(String(t)), ...a); };
  CP.strokeText = function (t, ...a) { return stroke.call(this, lang === "es" ? t : tr(String(t)), ...a); };
  CP.measureText = function (t) { return measure.call(this, lang === "es" ? t : tr(String(t))); };

  // ---------- Pantallas HTML ----------
  const ORIG = new WeakMap();        // texto o HTML original (español) de cada nodo traducido
  const INLINE = new Set(["B", "I", "EM", "STRONG", "KBD", "SPAN", "SMALL", "BR", "CODE", "SUP", "SUB", "U", "S", "MARK"]);
  const SKIP = new Set(["SCRIPT", "STYLE", "CANVAS", "TEXTAREA", "INPUT", "SELECT", "OPTION", "svg"]);
  const ATTRS = ["placeholder", "title", "aria-label"];
  let observer = null, busy = false;
  // ¿Se puede traducir el elemento entero como un solo texto (frase con <b>, <kbd>…)? Solo si nadie guarda referencias dentro
  function wholeOk(el) {
    if (!el.firstElementChild || el.dataset.noi18n !== undefined) return false;
    let text = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.data.trim()) text = true;
    if (!text) return false;
    for (const d of el.querySelectorAll("*")) if (!INLINE.has(d.tagName) || d.id || d.dataset.k !== undefined) return false;
    return true;
  }
  function doText(node) {
    let o = ORIG.get(node);
    if (o === undefined || (node.data !== o.es && node.data !== o.tr)) { o = { es: node.data, tr: null }; ORIG.set(node, o); }
    const t = lang === "es" ? o.es : tr(o.es); o.tr = t; if (node.data !== t) node.data = t;
  }
  function doAttrs(el) {
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const key = "i18n" + a.replace(/-/g, ""), cur = el.getAttribute(a);
      if (el.dataset[key] === undefined || (cur !== el.dataset[key] && cur !== el.dataset[key + "Tr"])) el.dataset[key] = cur;
      const t = lang === "es" ? el.dataset[key] : tr(el.dataset[key]); el.dataset[key + "Tr"] = t; if (cur !== t) el.setAttribute(a, t);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { if (root.parentNode && !SKIP.has(root.parentNode.nodeName)) doText(root); return; }
    if (root.nodeType !== 1 || SKIP.has(root.nodeName) || root.dataset.noi18n !== undefined) return;
    doAttrs(root);
    let o = ORIG.get(root);
    if (o && root.innerHTML !== o.tr && root.innerHTML !== o.es) { ORIG.delete(root); o = undefined; }   // el juego lo ha cambiado
    if (!o && wholeOk(root)) o = { es: root.innerHTML, tr: root.innerHTML };
    if (o) {   // frase entera (con <b>, <kbd>…) traducida de una vez
      const t = lang === "es" ? o.es : tr(o.es);
      if (lang === "es" || t !== o.es) { ORIG.set(root, o); o.tr = t; if (root.innerHTML !== t) root.innerHTML = t; return; }
      ORIG.delete(root);   // no hay traducción de la frase entera: se traduce trozo a trozo
    }
    for (const c of root.childNodes) walk(c);
  }
  function apply(root = document.body) {
    if (!root) return;
    busy = true; try { walk(root); } finally { busy = false; if (observer) observer.takeRecords(); }
    document.documentElement.lang = LANGS[lang].html;
  }
  function watch() {
    if (observer || !window.MutationObserver) return;
    observer = new MutationObserver(list => {
      if (busy) return; busy = true;
      try {
        for (const m of list) {
          if (m.type === "characterData") walk(m.target);
          else if (m.type === "attributes") { if (m.target.nodeType === 1) doAttrs(m.target); }
          else { const p = m.target; if (ORIG.has(p) && p.nodeType === 1) walk(p); else for (const n of m.addedNodes) walk(n); }
        }
      } finally { busy = false; observer.takeRecords(); }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  const I18N = {
    LANGS, collect: /[?&]i18n=missing/.test(location.search),
    get lang() { return lang; },
    get locale() { return LANGS[lang].locale; },
    // Idioma a partir de un código como "es-ES" o "en-US": español si empieza por «es», si no inglés
    pick(code) { return /^es\b/i.test(String(code || "")) ? "es" : "en"; },
    setLang(l) {
      l = LANGS[l] ? l : "en"; if (l === lang && keys) { apply(); return; }
      lang = l; exact.clear(); norm.clear(); compile(DICTS.en);
      apply(); watch();
      if (I18N.onChange) I18N.onChange(lang);
    },
    t(s, vars) { let r = tr(s); if (vars) r = r.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)); return r; },
    apply,
    missing: () => [...missing.keys()].sort(),
  };
  compile(DICTS.en);
  window.I18N = I18N;
})();
