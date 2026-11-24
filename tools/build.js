// =====================================================================
//  Construye el juego a partir de src/:
//    node tools/build.js            → index.html (versión web: GitHub Pages, app instalable, online)
//    node tools/build.js crazygames → build/crazygames/ (lo que se sube a CrazyGames)
//    node tools/build.js all        → las dos
//  El juego entero queda en UN archivo HTML (CSS, gráficos, fuentes y código dentro), sin nada externo.
// =====================================================================
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), SRC = path.join(ROOT, "src");
const read = p => fs.readFileSync(path.join(SRC, p), "utf8");
const list = dir => fs.readdirSync(path.join(SRC, dir)).filter(f => f.endsWith(".js")).sort().map(f => dir + "/" + f);

// Qué cambia en cada versión (el juego lo lee en window.DR_BUILD)
const TARGETS = {
  web: { out: "index.html", flags: { target: "web", online: true, pwa: true, links: true, backup: true } },
  crazygames: { out: "build/crazygames/index.html", flags: { target: "crazygames", online: false, pwa: false, links: false, backup: false } },
};

function build(name) {
  const T = TARGETS[name];
  // src/game/*.js va dentro de una única función (todo el juego en un ámbito privado)
  const game = list("game").map(read).join("");
  // Archivos que solo van en la versión web (herramientas de portada y grabación)
  const webOnly = name === "web" ? list("web-only").map(read).join("") : "";
  const html = read("head.html").replace("<!-- @build -->", `<script>window.DR_BUILD = ${JSON.stringify(T.flags)};</script>`) +
    "<style>\n" + read("css/style.css") + "</style>\n</head>\n<body>\n" +
    read("body.html") +
    "<script>\n" + read("platform.js") + "</script>\n" +
    "<script>\n" + read("engine/skins-engine.js") + "</script>\n" +
    "<!-- Kit Dino Runner: datos de skins -->\n<script>\n" + read("engine/skins-data.js") + "</script>\n" +
    "<!-- Juego -->\n<script>\n(() => {\n\"use strict\";\n\n" + game + webOnly + "})();\n</script>\n</body>\n</html>\n";
  const out = path.join(ROOT, T.out);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, filterTarget(html, name));
  console.log(`OK ${T.out}  ${(html.length / 1024 / 1024).toFixed(2)} MB`);
  if (name === "crazygames") report(path.dirname(out));
}
// Bloques marcados solo para una versión:  /*@web*/ … /*@end*/  o  <!--@web--> … <!--@end-->
function filterTarget(html, name) {
  return html.replace(/(?:\/\*|<!--)@(web|crazygames)(?:\*\/|-->)([\s\S]*?)(?:\/\*|<!--)@end(?:\*\/|-->)/g, (m, t, body) => (t === name ? body : ""));
}
// Tamaño total y número de archivos del paquete
function report(dir) {
  let n = 0, bytes = 0;
  const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), s = fs.statSync(p); if (s.isDirectory()) walk(p); else { n++; bytes += s.size; } } };
  walk(dir);
  console.log(`   Paquete ${path.relative(ROOT, dir)}: ${n} archivo(s), ${(bytes / 1024 / 1024).toFixed(2)} MB`);
}

const arg = process.argv[2] || "web";
for (const t of arg === "all" ? Object.keys(TARGETS) : [arg]) {
  if (!TARGETS[t]) { console.error("Versión desconocida: " + t); process.exit(1); }
  build(t);
}
