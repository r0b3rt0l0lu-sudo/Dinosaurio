// Exporta las traducciones a una hoja de cálculo para revisarlas: node tools/i18n-export.js
// Crea store/crazygames/traducciones.csv (se abre con Excel, LibreOffice o Google Sheets).
const fs = require("fs"), path = require("path"), vm = require("vm");
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/i18n/en.js"), "utf8"), ctx);
const q = s => '"' + String(s).replace(/"/g, '""').replace(/\n\s*/g, " ") + '"';
const rows = Object.entries(ctx.window.I18N_EN).sort((a, b) => a[0].localeCompare(b[0], "es"));
const out = path.join(__dirname, "../store/crazygames/traducciones.csv");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, "﻿Español;English\n" + rows.map(([es, en]) => q(es) + ";" + q(en)).join("\n") + "\n");
console.log(`${rows.length} traducciones → ${path.relative(process.cwd(), out)}`);
