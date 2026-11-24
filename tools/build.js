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
    "<script>\n" + read("i18n/en.js") + "</script>\n" +
    "<script>\n" + read("i18n/i18n.js") + "</script>\n" +
    "<script>\n" + read("platform.js") + "</script>\n" +
    "<script>\n" + read("engine/skins-engine.js") + "</script>\n" +
    "<!-- Kit Dino Runner: datos de skins -->\n<script>\n" + read("engine/skins-data.js") + "</script>\n" +
    "<!-- Juego -->\n<script>\n(() => {\n\"use strict\";\n\n" + game + webOnly + "})();\n</script>\n</body>\n</html>\n";
  const out = path.join(ROOT, T.out);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, filterTarget(html, name));
  console.log(`OK ${T.out}  ${(html.length / 1024 / 1024).toFixed(2)} MB`);
  if (name === "crazygames") { report(path.dirname(out)); zipDir(path.dirname(out), path.join(ROOT, "build", "dino-runner-crazygames.zip")); }
}
// ZIP del paquete (para subirlo de una vez a CrazyGames). Sin dependencias: ZIP clásico con compresión «deflate»
function zipDir(dir, zipPath) {
  const zlib = require("zlib"), files = [], walk = (d, rel) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), r = rel ? rel + "/" + f : f; fs.statSync(p).isDirectory() ? walk(p, r) : files.push([r, fs.readFileSync(p)]); } };
  walk(dir, "");
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const parts = [], central = []; let off = 0;
  for (const [name, data] of files) {
    const nm = Buffer.from(name), comp = zlib.deflateRawSync(data, { level: 9 }), crc = crc32(data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nm.length, 26);
    parts.push(h, nm, comp);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(off, 42);
    central.push(c, nm); off += 30 + nm.length + comp.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  fs.writeFileSync(zipPath, Buffer.concat([...parts, cd, end]));
  console.log(`   ZIP para subir: ${path.relative(ROOT, zipPath)} (${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(2)} MB)`);
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
