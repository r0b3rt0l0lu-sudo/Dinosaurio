// =====================================================================
//  Manual: secciones navegables con mini animaciones. Los números salen de CONFIG y de los datos del kit.
// =====================================================================
const pct = v => `${Math.round(v * 100)} %`;
const secs = v => `${fmtNum(Math.round(v * 10) / 10)} s`;
const demo = (name, label, arg = "", wide = false) =>
  `<div class="m-demo${wide ? " wide" : ""}"><canvas data-demo="${name}" data-arg="${arg}" data-w="${wide ? 260 : 160}" data-h="${wide ? 104 : 100}"></canvas>${label}</div>`;
const GROUND_NAMES = { cactus: "Cactus", log: "Tronco", obsidian: "Pincho de obsidiana", iceblock: "Bloque de hielo", crystal: "Cristal", neon: "Barrera de neón", tomb: "Lápida", driftlog: "Tronco de playa", coral: "Coral", icecrystal: "Cristal lunar" };
const ROCK_NAMES = { rock: "Roca", mossrock: "Roca musgosa", lavarock: "Roca volcánica", icerock: "Roca helada", meteor: "Meteorito", crate: "Caja metálica", sandrock: "Roca de arenisca" };
const FLYER_NAMES = { ptero: "Pterodáctilo", drone: "Dron", fish: "Pez payaso", gull: "Gaviota", bat: "Murciélago" };
for (const k in BIRD_TYPES) FLYER_NAMES["bird-" + k] = BIRD_TYPES[k].name;
const stars = n => "★".repeat(n) + "☆".repeat(Math.max(0, 4 - n));
const kbd = k => `<kbd>${k}</kbd>`;
// Cada boss se vence de una forma distinta (ver setRules en sus clases)
const BOSS_GUIDE = [
  { how: "<b>Pisotón</b>: cuando clave el aguijón en tu carril, salta, cámbiate en el aire y cae encima con S (3 de daño). El rugido no le hace nada.",
    attacks: ["<b>Cola</b>: sombra roja con «!» en tu carril → cambia de carril.", "<b>Pinchos</b>: flecha roja → salta o cambia de carril."],
    tip: "Es el boss para aprender el pisotón: esquiva la cola y cae sobre el aguijón antes de que lo saque." },
  { how: "<b>Rugido</b>: cuando apoye la cabeza en el otro carril, ponte en ese carril y ruge (E) — 2 de daño. Durante esta pelea el rugido recarga mucho más rápido. ¡Su cabeza tiene pinchos: no la pises!",
    attacks: ["<b>Mordisco desde arriba</b>: sombra con «!» → deslízate o cambia de carril.", "<b>Veneno</b>: flecha roja → bajo: salta · medio: deslízate."],
    tip: "Ten el rugido listo: en cuanto veas la cabeza apoyada, cámbiate y ruge." },
  { how: "<b>Devolverle las rocas</b>: ruge (E) cuando una roca esté a punto de caer sobre ti en tu carril — la devuelves y le hace 3 de daño. Su puño quema: no lo pises.",
    attacks: ["<b>Rocas en arco</b>: diana roja → devuélvelas o cambia de carril.", "<b>Puñetazo</b>: sombra con «!» → cambia de carril."],
    tip: "No te apartes de las rocas: espera en su diana y ruge en el último momento." },
  { how: "<b>Saltar por encima</b>: cuando embista por tu carril, NO te cambies: sáltalo en el momento justo y le haces 3 de daño al pasar sobre su lomo.",
    attacks: ["<b>Embestida</b>: flecha roja en tu carril → sáltala.", "<b>Suelo congelado</b> tras la embestida.", "<b>Fragmentos de hielo</b>: flecha roja → salta o cambia de carril."],
    tip: "Salta cuando esté a un cuerpo de distancia: estarás en lo alto justo cuando pase." },
  { how: "<b>Cabezazo</b>: a veces pasa rasante brillando (flecha a media altura). Salta y golpéale desde abajo (3 de daño). Pisarle o rugirle no sirve.",
    attacks: ["<b>Picado</b>: sombra en tu carril → bajo: salta · medio: deslízate.", "<b>Plumas</b>: flecha roja → salta o deslízate."],
    tip: "Cuando brille, quédate en su carril y salta un instante antes de que llegue." },
  { how: "<b>Voltear y pisar</b>: cuando apoye la pinza, ruge (E) desde cualquier carril para darle la vuelta; luego salta a su carril y cae encima con S (3 de daño). Sin voltearla, su caparazón aguanta el pisotón.",
    attacks: ["<b>Pinzazo</b>: sombra con «!» → cambia de carril.", "<b>Burbujas</b>: flecha roja → bajas: salta · medias: deslízate."],
    tip: "Rugido primero, pisotón después: la pinza volteada se queda quieta un buen rato." },
  { how: "<b>Setas explosivas</b>: aparecen rombos con «!» en el suelo cada pocos segundos. Pasa por encima de ellos (4 de daño cada uno). Su piel es venenosa: no lo toques.",
    attacks: ["<b>Salto aplastante</b>: diana roja en tu carril → cámbiate.", "<b>Lengua</b>: línea roja a media altura → deslízate."],
    tip: "Mira dónde sale cada seta y cámbiate a ese carril sin dejar de esquivar sus saltos." },
  { how: "<b>Corte</b>: cuando apoye un tentáculo en el otro carril, deslízate (S) y cámbiate a ese carril deslizándote: le cortas 3 de vida. Si entras corriendo, el tentáculo te golpea.",
    attacks: ["<b>Tentáculo</b>: sombra con «!» → cambia de carril.", "<b>Barrido</b>: flecha a ras de suelo → salta.", "<b>Tinta</b>: diana roja → cambia de carril."],
    tip: "S primero y luego A/D: el deslizamiento dura lo justo para entrar en su carril." },
  { how: "<b>Escudo y pisotón</b>: tiene un escudo de almas de 3 cargas. Devuélvele fuegos o huesos con el rugido (E) para romperlo; con el escudo roto (9 s), pisa su cráneo cuando muerda (4 de daño).",
    attacks: ["<b>Fuegos fantasma</b>: flecha roja → devuélvelos con E.", "<b>Huesos en arco</b>: diana → devuélvelos o cámbiate.", "<b>Mordisco</b>: sombra con «!» → cambia de carril."],
    tip: "Primero sé paciente con los reflejos; en cuanto el escudo caiga, ve a por el cráneo antes de que se regenere." },
  { how: "<b>Tres fases</b> (boss final): fase 1, devuelve las mininaves con el rugido · fase 2, cuando aterrice en el otro carril, písale la cúpula · fase 3, cuando pase rasante brillando, golpéala desde abajo de un salto. Tienes más tiempo que con los demás.",
    attacks: ["<b>Rayo abductor</b>: sombra con «!» → cambia de carril.", "<b>Láser</b>: línea roja → abajo: salta · en medio: deslízate · arriba: NO saltes.", "<b>Mininaves</b>: diana roja."],
    tip: "Es el examen final: usa lo que aprendiste con el Golem, el Escorpión y el Pterodáctilo." },
];
const MANUAL_SECTIONS = [
  { title: "Cómo se juega", html: () => `
    <p>Tu velociraptor corre solo. Esquiva obstáculos, recoge monedas y llega lo más lejos posible. Cada ${CONFIG.PX_PER_POINT} px recorridos suman 1 punto
    y cada ${CONFIG.POINTS_PER_LEVEL} puntos cambias de nivel y de bioma.</p>
    <div class="m-demos">${demo("run", "Correr y recoger monedas")}${demo("egg", "Huevo bonus")}</div>
    <ul>
      <li><b>Monedas</b>: van a tu monedero permanente al acabar la partida. Sirven para la tienda y la ruleta.</li>
      <li><b>Huevos bonus</b>: en cada nivel hay exactamente ${CONFIG.EGGS_PER_LEVEL}, uno en cada mitad, en sitios difíciles (encima de un doble salto o en el otro carril justo después de un obstáculo). Valen ${CONFIG.EGG_VALUE} monedas (${CONFIG.EGG_VALUE * CONFIG.EASY.COIN_VALUE} en Fácil, ${CONFIG.EGG_VALUE * CONFIG.HARD.COIN_VALUE} en Difícil). El imán no los atrae: si no los coges, se pierden.</li>
      <li><b>Bosses</b>: hay ${CONFIG.LEVELS.length} niveles (hasta ${CONFIG.LEVELS.length * CONFIG.POINTS_PER_LEVEL} puntos) y a mitad de cada uno (a los ${CONFIG.BOSS_AT_IN_LEVEL} puntos del nivel) llega un boss que te ataca mientras sigues corriendo. Tienes ${CONFIG.BOSS_MAX_TIME} s para vencerlo; si no, se retira sin premio.</li>
      <li>En Normal y en Difícil un golpe es Game Over; en Fácil tienes ${CONFIG.EASY.LIVES} vidas.</li>
    </ul>` },
  { title: "Controles", html: () => `
    <table><tr><th>Tecla</th><th>Acción</th></tr>
      <tr><td>${kbd(game.controls.labels("jump"))}</td><td>Saltar. Otra vez en el aire = doble salto.</td></tr>
      <tr><td>${kbd(game.controls.labels("slide"))}</td><td>En el suelo: deslizarse (${secs(CONFIG.SLIDE_DURATION)}). En el aire: caída rápida.</td></tr>
      <tr><td>${kbd(game.controls.labels("laneUp"))}</td><td>Ir al carril de arriba.</td></tr>
      <tr><td>${kbd(game.controls.labels("laneDown"))}</td><td>Ir al carril de abajo.</td></tr>
      <tr><td>${kbd(game.controls.labels("roar"))}</td><td>Rugido (recarga ${secs(CONFIG.ROAR_COOLDOWN)}, ${secs(CONFIG.EASY.ROAR_COOLDOWN)} en Fácil, ${secs(CONFIG.HARD.ROAR_COOLDOWN)} en Difícil). Con la <b>barra de furia</b> llena: <b>súper rugido</b>, que destruye todo lo que hay en pantalla.</td></tr>
      <tr><td>${kbd(game.controls.labels("pause"))}</td><td>Pausa (también congela los combates).</td></tr>
      <tr><td>${kbd("M")}</td><td>Silenciar.</td></tr>
    </table>
    <p>Son las teclas que tienes ahora: cámbialas en <b>Opciones → 🎮 Controles</b> (WASD, flechas, las dos o las que quieras; también las del multijugador local). ${BUILD.esc ? "Espacio también salta y Esc siempre pausa." : "Espacio también salta y P pausa."} Las teclas funcionan en mayúsculas y minúsculas. En la elección de mejora: ${kbd("A")}/${kbd("D")} elegir carta, ${kbd("W")} cogerla, ${kbd("R")} barajar y ${kbd("Q")} saltar. Montado, cada montura cambia lo que hacen ${kbd("W")} y ${kbd("S")} (mira la sección Monturas).</p>
    <h4>Furia</h4>
    <p>La barra de furia (debajo del rugido) se llena esquivando por los pelos (+${FURY_CONFIG.NEAR_MISS}), recogiendo huevos (+${FURY_CONFIG.EGG}), destruyendo con el rugido (+${FURY_CONFIG.ROAR_KILL}) y dañando a los bosses (+${FURY_CONFIG.BOSS_HIT}). Si pasas ${FURY_CONFIG.DECAY_AFTER} s sin sumar, se va vaciando. Durante los combates contra jefes el súper rugido no se puede usar.</p>
    <h4>Móvil</h4>
    <p>Toca la pantalla para saltar y desliza hacia abajo para deslizarte o caer rápido. Los botones de abajo cambian de carril y rugen (se ocultan en los combates).</p>
    <h4>Bosses</h4>
    <div class="tip">Contra los bosses se usan los mismos controles: esquiva con salto, deslizamiento y carriles, y hazles daño con el <b>pisotón</b> (S al caer sobre su punto débil) y el <b>rugido</b> (E).</div>` },
  { title: "Movimientos", html: () => `
    <div class="m-demos">${demo("jump", "Salto (W)")}${demo("double", "Doble salto (W, W)")}${demo("slide", "Deslizarse (S)")}${demo("fastfall", "Caída rápida (S en el aire)")}${demo("lanes", "Carriles (A / D)")}${demo("roar", "Rugido (E)")}</div>
    <table><tr><th>Movimiento</th><th>Cuándo usarlo</th></tr>
      <tr><td>Salto</td><td>Cactus, rocas pequeñas y pájaros bajos.</td></tr>
      <tr><td>Doble salto</td><td>Rocas altas, cactus dobles y para coger huevos en lo alto. Solo uno por salto.</td></tr>
      <tr><td>Deslizamiento</td><td>Pájaros a media altura y estalactitas. La hitbox se reduce a la mitad.</td></tr>
      <tr><td>Caída rápida</td><td>Bajar antes al suelo para reaccionar al siguiente obstáculo. Si mantienes S, aterrizas deslizándote. Cayendo sobre el punto débil de un boss es un <b>pisotón</b> (${CONFIG.BOSS_DMG_STOMP} de daño).</td></tr>
      <tr><td>Carriles</td><td>Cambian en ${secs(CONFIG.LANE_SWITCH_TIME)}. Úsalos cuando un carril está bloqueado por un muro.</td></tr>
      <tr><td>Rugido</td><td>Onda de ${CONFIG.ROAR_RANGE} px en tu carril: destruye rocas y pájaros, <b>no</b> cactus ni estalactitas.</td></tr>
    </table>` },
  { title: "Obstáculos", html: g => `
    <p>Todos los biomas tienen los mismos tipos de obstáculo, con aspecto propio:</p>
    <table><tr><th>Tipo</th><th>¿Se destruye?</th><th>Cómo esquivarlo</th></tr>
      <tr><td>Suelo (cactus, tronco, obsidiana, hielo, cristal, coral, lápida)</td><td>No (solo con turbo)</td><td>Saltar o cambiar de carril.</td></tr>
      <tr><td>Rocas (arenisca, roca, musgo, volcánica, helada, meteorito)</td><td>Sí: rugido o turbo</td><td>Saltar (las altas con doble salto) o rugir.</td></tr>
      <tr><td>Voladores (uno por bioma: buitre, guacamayo, pájaro de fuego, búho nival, cuervo, gaviota, polilla, pez payaso, murciélago, dron y ave de cristal)</td><td>Sí: rugido o turbo</td><td>Bajos: saltar. Medios: deslizarse. Altos: pasar por debajo.</td></tr>
      <tr><td>Estalactitas (Glaciar)</td><td>No</td><td>Deslizarse o cambiar de carril.</td></tr>
      <tr><td>Muro (obstáculo alto + pájaro)</td><td>No</td><td>Cambiar de carril.</td></tr>
    </table>
    <div class="m-demos">${BIOMES.map((b, i) => [b, i]).filter(([b], k, a) => a.findIndex(([x]) => x.obstacles.ground === b.obstacles.ground) === k).map(([b, i]) => demo("obst", `${GROUND_NAMES[b.obstacles.ground]} (${b.name})`, `${i}:ground`)).join("")}
      ${demo("obst", "Roca", "0:rock")}${demo("obst", "Pterodáctilo", "0:flyer")}${demo("obst", "Gaviota", "5:flyer")}${demo("obst", "Pez payaso", "7:flyer")}${demo("obst", "Murciélago", "8:flyer")}${demo("obst", "Dron", "9:flyer")}${demo("obst", "Estalactita", "3:stalactite")}</div>
    <p>Desde el nivel ${CONFIG.FAST_BIRD_LEVEL} hay pájaros más rápidos y otros que cambian de altura. Siempre existe al menos una forma de pasar cada patrón.</p>` },
  { title: "Power-ups", html: () => `
    <p>Aparecen al azar entre obstáculos. No puede haber dos del mismo tipo activos. Al empezar la pelea contra un boss a veces aparece un escudo o un turbo de ayuda.</p>
    <table><tr><th>Icono</th><th>Power-up</th><th>Efecto</th><th>Duración</th></tr>
      <tr><td>${demo("power", "", "shield")}</td><td>Escudo</td><td>Burbuja que absorbe un golpe.</td><td>${secs(CONFIG.SHIELD_DURATION)} o un golpe</td></tr>
      <tr><td>${demo("power", "", "magnet")}</td><td>Imán</td><td>Atrae las monedas cercanas (${CONFIG.MAGNET_RADIUS} px). No atrae huevos.</td><td>${secs(CONFIG.MAGNET_DURATION)}</td></tr>
      <tr><td>${demo("power", "", "slowmo")}</td><td>Cámara lenta</td><td>El juego va al ${pct(CONFIG.SLOWMO_FACTOR)}.</td><td>${secs(CONFIG.SLOWMO_DURATION)}</td></tr>
      <tr><td>${demo("power", "", "turbo")}</td><td>Turbo</td><td>Velocidad ×${CONFIG.TURBO_MULT} e invencible: destruye lo que toca (y hace ${CONFIG.BOSS_DMG_TURBO} de daño a los bosses).</td><td>${secs(CONFIG.TURBO_DURATION)}</td></tr>
    </table>
    <p>En Fácil aparecen un ${pct(CONFIG.EASY.POWERUP_CHANCE_MULT - 1)} más y duran un ${pct(CONFIG.EASY.POWERUP_DURATION_MULT - 1)} más; en Difícil, un ${pct(1 - CONFIG.HARD.POWERUP_CHANCE_MULT)} menos y duran un ${pct(1 - CONFIG.HARD.POWERUP_DURATION_MULT)} menos.</p>` },
  { title: "Niveles y biomas", html: () => `
    <p>Cada ${CONFIG.POINTS_PER_LEVEL} puntos subes de nivel: +${pct(CONFIG.SPEED_PER_LEVEL)} de velocidad (máx. ${CONFIG.MAX_SPEED} px/s),
    obstáculos más seguidos, ambos carriles ocupados desde el nivel ${CONFIG.BOTH_LANES_LEVEL}, pájaros rápidos desde el ${CONFIG.FAST_BIRD_LEVEL} y algo menos de power-ups.
    Hay ${CONFIG.LEVELS.length} niveles, cada uno con su bioma y su boss. Al completar el nivel ${CONFIG.LEVELS.length} (${CONFIG.LEVELS.length * CONFIG.POINTS_PER_LEVEL} puntos) el viaje vuelve a empezar con la dificultad acumulada y bosses aún más fuertes.</p>
    <p><b>Portal:</b> al final de cada nivel aparece un portal con el nombre del bioma siguiente. El camino hasta él queda libre de obstáculos: crúzalo y llegarás al nuevo mapa.</p>
    <div class="m-demos">${BIOMES.map((b, i) => { const L = CONFIG.LEVELS[i]; return demo("biome", `${i + 1}. ${b.name} (${i * CONFIG.POINTS_PER_LEVEL}–${(i + 1) * CONFIG.POINTS_PER_LEVEL - 1})<br>Boss: ${BOSS_NAMES[L.boss]}${L.tier ? " (reforzado)" : ""}`, i); }).join("")}</div>
    <p>La Noche estrellada tiene más filas de monedas.</p>` },
  { title: "Bosses", html: () => `
    <p>A mitad de cada nivel (${CONFIG.BOSS_AT_IN_LEVEL}, ${CONFIG.BOSS_AT_IN_LEVEL + CONFIG.POINTS_PER_LEVEL}, ${CONFIG.BOSS_AT_IN_LEVEL + 2 * CONFIG.POINTS_PER_LEVEL}…) sale «¡PELIGRO!» y llega un boss. Te ataca mientras sigues corriendo (no salen obstáculos normales).
    Tienes ${CONFIG.BOSS_MAX_TIME} s (el boss final, más): si lo vences ganas +${CONFIG.BOSS_COINS} monedas y +${CONFIG.BOSS_POINTS} puntos; si no, se retira sin premio.</p>
    <div class="tip warn"><b>Cada boss se vence de una forma distinta</b>: pisotón, rugido, devolver proyectiles, saltar por encima, cabezazo, voltear y pisar, trampas, deslizarse, romper un escudo… La forma de dañar al boss actual aparece abajo en la pantalla durante la pelea. El turbo le hace ${CONFIG.BOSS_DMG_TURBO} de daño a cualquiera.</div>
    <div class="tip">Señales: sombra roja con «!» = golpe desde arriba · flecha roja = algo viene por ese carril · línea parpadeante = láser · diana = proyectil en arco.</div>
    ${BOSS_NAMES.slice(0, BOSS_COUNT).map((n, i) => { const lv = CONFIG.LEVELS.map((L, k) => L.boss === i ? `nivel ${k + 1} (${BIOMES[k].name}${L.tier ? ", reforzado" : ""})` : "").filter(Boolean).join(" y ");
      return `<h4>${i + 1}. ${n}</h4>
      <div class="m-demos">${demo("boss", n, i, true)}</div>
      <p><b>Aparece en:</b> ${lv}. Vida base: ${Math.round(CONFIG.BOSS_HP * BOSS_HP_MULTS[i])} (Fácil: la mitad; Difícil: +${pct(CONFIG.HARD.BOSS_HP_MULT - 1)}).</p>
      <div class="tip"><b>Cómo dañarle:</b> ${BOSS_GUIDE[i].how}</div>
      <ul>${BOSS_GUIDE[i].attacks.map(a => `<li>${a}</li>`).join("")}</ul>
      <div class="tip warn"><b>Furia (${i === 9 ? "al entrar en la fase 3" : `al ${Math.round(CONFIG.BOSS_FURY_AT * 100)} % de vida; ${Math.round(CONFIG.EASY.BOSS_FURY_AT * 100)} % en Fácil`}):</b> se pone roja, ataca un ${Math.round((CONFIG.BOSS_FURY_SPEED - 1) * 100)} % más rápido y con avisos más cortos. ${BOSS_FURY_GUIDE[i]}</div>
      <p><b>Estrategia:</b> ${BOSS_GUIDE[i].tip}</p>`; }).join("")}
    <p>Después del nivel ${CONFIG.LEVELS.length} los bosses vuelven reforzados: en cada vuelta tienen +${pct(CONFIG.BOSS_HP_PER_CYCLE)} de vida, atacan un ${pct(CONFIG.BOSS_SPEED_PER_CYCLE)} más rápido y dan +${CONFIG.BOSS_COINS_PER_CYCLE} monedas por cada refuerzo.</p>` },
  { title: "Modos", html: () => { const E = CONFIG.EASY, H = CONFIG.HARD; return `
    <table><tr><th></th><th>Normal</th><th>Fácil</th><th>Difícil</th></tr>
      <tr><td>Velocidad inicial</td><td>100 %</td><td>${pct(E.START_SPEED_MULT)}</td><td>${pct(H.START_SPEED_MULT)}</td></tr>
      <tr><td>Aumento por nivel</td><td>+${pct(CONFIG.SPEED_PER_LEVEL)}</td><td>+${pct(E.SPEED_PER_LEVEL)}</td><td>+${pct(H.SPEED_PER_LEVEL)}</td></tr>
      <tr><td>Huecos entre obstáculos</td><td>100 %</td><td>${pct(E.GAP_MULT)}</td><td>${pct(H.GAP_MULT)}</td></tr>
      <tr><td>Obstáculos en ambos carriles</td><td>desde el nivel ${CONFIG.BOTH_LANES_LEVEL}</td><td>desde el nivel ${E.BOTH_LANES_LEVEL}</td><td>desde el nivel ${H.BOTH_LANES_LEVEL}</td></tr>
      <tr><td>Pájaros rápidos</td><td>desde el nivel ${CONFIG.FAST_BIRD_LEVEL}</td><td>desde el nivel ${CONFIG.FAST_BIRD_LEVEL}</td><td>desde el nivel ${H.FAST_BIRD_LEVEL}</td></tr>
      <tr><td>Vidas</td><td>1</td><td>${E.LIVES} (y ${secs(E.HIT_INVULN)} de invencibilidad)</td><td>${H.LIVES}</td></tr>
      <tr><td>Power-ups</td><td>normal</td><td>+${pct(E.POWERUP_CHANCE_MULT - 1)} frecuencia y duración</td><td>−${pct(1 - H.POWERUP_CHANCE_MULT)} frecuencia, −${pct(1 - H.POWERUP_DURATION_MULT)} duración</td></tr>
      <tr><td>Rugido</td><td>${secs(CONFIG.ROAR_COOLDOWN)}</td><td>${secs(E.ROAR_COOLDOWN)}</td><td>${secs(H.ROAR_COOLDOWN)}</td></tr>
      <tr><td>Bosses</td><td>vida completa, ventana de ${secs(CONFIG.BOSS_VULN_TIME)}</td><td>${pct(E.BOSS_HP_MULT)} de vida, ventana de ${secs(E.BOSS_VULN_TIME)}, avisos ×${fmtNum(E.BOSS_TELEGRAPH_MULT)}</td><td>${pct(H.BOSS_HP_MULT)} de vida, +${pct(H.BOSS_SPEED_MULT - 1)} de velocidad, ventana de ${secs(H.BOSS_VULN_TIME)}, avisos ×${fmtNum(H.BOSS_TELEGRAPH_MULT)}</td></tr>
      <tr><td>Monedas y huevos</td><td>×1</td><td>×${fmtNum(E.COIN_VALUE)}</td><td>×${fmtNum(H.COIN_VALUE)}</td></tr>
      <tr><td>Récord</td><td colspan="3">Cada modo guarda el suyo.</td></tr>
    </table>
    <p>Los bosses se vencen igual en los tres modos: solo cambian su vida, su velocidad y el tiempo que tienes para dañarlos.</p>
    <h4>Multijugador (2 jugadores en el mismo teclado)</h4>
    <p>Al pulsar «Multijugador» eliges la dificultad: Normal (1 vida cada uno), Fácil (${CONFIG.EASY.LIVES} vidas cada uno, más lento) o Difícil (1 vida, más rápido y con obstáculos más juntos). Sin jefes, power-ups ni huevos. Cada raptor tiene su carril y sus vidas; los dos carriles reciben los mismos obstáculos al mismo tiempo. Gana quien aguante más: cuando cae uno, el otro sigue corriendo hasta que también cae. Las monedas de los dos van a tu monedero; no cuenta para récords ni logros.</p>
    <table><tr><th></th><th>Jugador 1 (carril de arriba)</th><th>Jugador 2 (carril de abajo)</th></tr>
      <tr><td>Saltar / doble salto</td><td>${kbd("W")}</td><td>${kbd("↑")}</td></tr>
      <tr><td>Deslizarse / caída rápida</td><td>${kbd("S")}</td><td>${kbd("↓")}</td></tr>
      <tr><td>Rugido</td><td>${kbd("E")} o ${kbd("D")}</td><td>${kbd("→")} o ${kbd("Intro")}</td></tr>
      <tr><td>Lanzar trampa al rival</td><td>${kbd("A")}</td><td>${kbd("←")}</td></tr>
    </table>
    <h4>Trampas</h4>
    <p>Cada ${secs(CONFIG.TRAP_RECHARGE)} ganas una trampa (puedes guardar ${CONFIG.TRAP_MAX} y lanzar como mucho ${CONFIG.TRAP_TOTAL} en toda la partida); la que tienes preparada se ve junto a tu etiqueta J1/J2. Al lanzarla aparece en el carril del rival con una banderita de quién la puso:</p>
    <ul>${TRAP_TYPES.map(t => `<li><b>${t.name}</b>: ${t.id === "ink" ? `le deja el carril a oscuras ${secs(CONFIG.TRAP_INK_TIME)}` : `obliga a ${t.tip}`}.</li>`).join("")}</ul>
    <p>No se pueden lanzar mientras se ve el portal de cambio de nivel.</p>`; } },
  { title: "Tienda", html: () => { const R = ["Común", "Raro", "Épico", "Legendario", "Supremo"]; return `
    <h4>Skins</h4><p>${SkinCatalog.shop.length} velociraptores, solo estéticos:</p>
    <table><tr><th>Rareza</th><th>Precios</th><th>Qué tienen</th></tr>
    ${R.map(r => { const l = SkinCatalog.shop.filter(k => k.rarity === r), p = l.map(k => k.price);
      return `<tr><td>${rarityTag(r)}</td><td>${Math.min(...p)}–${Math.max(...p)}</td><td>${{ "Común": "Colores nuevos", "Raro": "Patrones nuevos", "Épico": "Animación propia", "Legendario": "Animación + estela", "Supremo": "Todo a la vez" }[r]} (${l.length})</td></tr>`; }).join("")}</table>
    <div class="m-demos">${R.map(r => { const k = SkinCatalog.shop.find(s => s.rarity === r); return demo("skin", k.name, k.id); }).join("")}</div>
    <p>Hay además ${EXCLUSIVE_SKINS.length} skins exclusivos que solo se consiguen con logros.</p>
    <h4>Huevos</h4><p>Los huevos bonus que recoges en los mapas se guardan en tu monedero de huevos. En la pestaña «Huevos» de la tienda los gastas en huevos que, al abrirse, te dan una de las ${EGG_SKINS.length} skins que solo salen de ellos:</p>
    <ul>${EGG_TYPES.map(t => `<li><b>${t.name}</b> (${t.price} huevos): ${t.odds.map((p, i) => p > 0 ? `${["común", "rara", "legendaria"][i]} ${Math.round(p * 100)} %` : "").filter(Boolean).join(", ")}.</li>`).join("")}</ul>
    <p>Nunca te sale una skin repetida mientras queden otras de ese huevo; si ya las tienes todas, te devuelve ${CONFIG.EGG_REPEAT_COINS} monedas por cada huevo gastado.</p>
    <h4>Rugidos especiales</h4><p>Los skins Épicos, Legendarios, el Supremo y los exclusivos tienen un <b>rugido propio</b> y una pose animada al rugir: ${Object.entries(ROAR_STYLES).filter(([id]) => SkinCatalog.get(id)).map(([id, r]) => `${SkinCatalog.get(id).name}: ${r.name.toLowerCase()}`).join(" · ")}. Los diseños del editor heredan el rugido del efecto que elijas. Es solo estético: el alcance y el daño no cambian.</p>
    <h4>Checkpoints</h4><p>Empieza al inicio de un nivel. Precio: ${CONFIG.CHECKPOINT_PRICE_STEP} × (nivel − 1). Se desbloquean al completar el nivel anterior y sirven en todos los modos.</p>
    <h4>Editor de skins</h4><p>Cuesta ${CONFIG.EDITOR_PRICE} monedas una sola vez. Dibuja tu raptor <b>píxel a píxel</b> (lápiz, goma, rellenar, cuentagotas, voltear y borrar todo) con 13 colores de paleta que puedes cambiar cuando quieras, o empieza desde una plantilla. Elige fondo, suelo y efecto y guárdalo en una de sus ${CONFIG.EDITOR_SLOTS} ranuras. Las patas se animan solas y la pose agachada se genera a partir de tu dibujo. Las plantillas y efectos de skins Épicos o superiores solo están disponibles si tienes esos skins.</p>
    <h4>Accesorios</h4><p>En la pestaña <b>🎩 Accesorios</b>, con 3 huecos (uno de cada a la vez): ${HAT_SLOTS.map(([k, n]) => `<b>${n}</b>: ${HATS.filter(h => h.slot === k).map(h => `${h.name} (${h.price})`).join(", ")}`).join(". ")}. Se ponen encima de cualquier skin y te siguen al correr, saltar y agacharte.</p>
    <h4>Estelas y rugidos</h4><p>En <b>✨ Estelas y rugidos</b>. Estelas: ${SHOP_TRAILS.map(t => `${t.name} (${t.price})`).join(", ")}. Rugidos: ${SHOP_ROARS.map(r => `${r.name} (${r.price})`).join(", ")}. Valen para cualquier skin: la estela se suma a la del skin y el rugido sustituye al suyo (solo cambia el aspecto).</p>
    <h4>Mascotas</h4><p>En <b>🐾 Mascotas</b> hay ${PET_SPECIES.length} especies de cuatro rarezas. Corren por el carril del medio, saltan cuando saltas, parpadean y celebran lo que te traen. Todas te traen monedas; algunas además buscan huevos o lanzan fuego:</p>
    <table><tr><th>Mascota</th><th>Rareza</th><th>Precio</th><th>Habilidad</th></tr>${PET_SPECIES.slice().sort((a, b) => a.price - b.price).map(p => `<tr><td>${p.name}</td><td>${p.rarity}</td><td>${p.price}</td><td>${PET_ABILITIES[p.ab].icon} ${PET_ABILITIES[p.ab].desc(p.cd)}</td></tr>`).join("")}</table>
    <p>Personalízala gratis: nombre, color del cuerpo y de los detalles, <b>estampado</b> (${PET_PATTERNS.map(p => p[1].toLowerCase()).join(", ")}) y <b>aura</b> (${PET_AURAS.slice(1).map(a => a[1].toLowerCase()).join(", ")}). Las legendarias brillan con su propio halo.</p>`; } },
  { title: "Ruleta", html: () => { const O = CONFIG.ROULETTE_ODDS; return `
    <p>Apuesta monedas del juego (mín. ${CONFIG.ROULETTE_MIN_BET}, máx. ${CONFIG.ROULETTE_MAX_BET}). El resultado se decide con estas probabilidades y la rueda se para exactamente en esa casilla;
    el tamaño de cada casilla se parece a su probabilidad.</p>
    <table><tr><th>Multiplicador</th><th>Probabilidad</th><th>Con 100 monedas</th></tr>
      ${O.map(o => `<tr><td>x${fmtNum(o.mult)}${o.mult === 5 ? " (JACKPOT)" : ""}</td><td>${pct(o.p)}</td><td>${Math.floor(100 * o.mult)}</td></tr>`).join("")}</table>
    <div class="tip">De media la ruleta devuelve el ${pct(rouletteEV())} de lo apostado, pero es muy irregular: en el ${pct(O.filter(o => o.mult < 1).reduce((a, o) => a + o.p, 0))} de las tiradas pierdes monedas. Solo son monedas del juego.</div>
    <h4>Giro gratis diario</h4><p>Una vez al día, sin apostar: ${CONFIG.FREE_SPIN_PRIZES.filter(p => !p.skin).map(p => p.coins).join(", ")} monedas o, con un ${pct(CONFIG.FREE_SPIN_PRIZES.find(p => p.skin).p)} de probabilidad, un skin Común o Raro que no tengas.</p>`; } },
  { title: "Logros", html: () => `
    <p>Hay ${ACHIEVEMENTS.length} logros en ${Object.keys(ACH_CATS).length} categorías. Cada uno da monedas y algunos, un skin exclusivo. Cuentan en todos los modos salvo los marcados «solo Normal o Difícil».
    Cuando consigues uno aparece un aviso en la esquina sin pausar el juego.</p>
    <ul>
      <li><b>Carrera</b>: llega lejos y visita los ${BIOMES.length} biomas.</li>
      <li><b>Jefes</b>: derrota a los ${BOSS_COUNT} bosses, y mejor sin recibir golpes.</li>
      <li><b>Habilidad</b>: salta mucho, ruge mucho… o aguanta sin rugir, sin power-ups o sin cambiar de carril.</li>
      <li><b>Colección</b>: ahorra, compra skins, recoge huevos y usa la tienda.</li>
      <li><b>Ruleta</b> y <b>Modos</b>: prueba la ruleta, el giro diario y los tres modos (y termina el tutorial).</li>
      <li><b>Roguelike</b>: elige mejoras, activa sinergias, acepta pactos… o gana sin coger nada.</li>
      <li><b>Árbol</b>: compra nodos con fósiles hasta completar el árbol.</li>
      <li><b>Monturas</b>: prueba las ${MOUNT_BIOMES.length} monturas, aterriza bien del meteorito y haz trucos con la tabla.</li>
      <li><b>Secretos</b>: hay ${ACHIEVEMENTS.filter(a => a.secret).length} logros ocultos. Aparecen como «???» hasta que los consigues.</li>
    </ul>
    <p>Con el modo prueba (DEBUG) activo no se consiguen logros. En la pantalla de logros puedes reiniciar el progreso (pide doble confirmación).</p>` },
  { title: "Monturas", html: () => `
    <p>En cada nivel hay un ${pct(MOUNT_CONFIG.CHANCE)} de probabilidad de que aparezca <b>un icono de montura</b> (una burbuja brillante) entre el ${pct(MOUNT_CONFIG.WINDOW[0])} y el ${pct(MOUNT_CONFIG.WINDOW[1])} del nivel.
    Nunca sale cerca de un boss (${MOUNT_CONFIG.BOSS_MARGIN} puntos antes) ni con otra montura activa. Tócalo para subirte: cambian tus controles y tu física durante unos segundos.</p>
    <ul>
      <li><b>Un golpe montado</b> no te elimina: pierdes la montura y tienes ${secs(MOUNT_CONFIG.HIT_INVULN)} de invencibilidad. Si tienes escudo, el escudo lo absorbe primero.</li>
      <li>Al acabarse el tiempo saltas al suelo con ${secs(MOUNT_CONFIG.END_INVULN)} de invencibilidad. Si llega un boss, te bajas solo.</li>
      <li>Montado sigues cogiendo monedas, huevos y power-ups, y la furia se sigue llenando. En Fácil duran un ${pct(MOUNT_CONFIG.EASY_DURATION_MULT - 1)} más.</li>
    </ul>
    <table><tr><th></th><th>Montura</th><th>Controles</th><th>Destruye / atraviesa</th><th>Cuidado con</th></tr>
    ${MOUNT_BIOMES.map(b => { const m = MOUNT_CONFIG.mounts[b], G = MOUNT_GUIDE[m.id], bi = BIOMES.find(x => x.id === b);
      return `<tr><td>${demo("mount", "", m.id)}</td><td><b>${m.name}</b><br><small>${bi ? bi.name : b} · ${m.duration} s · velocidad ×${m.speed}</small></td><td>${G.controls}</td><td>${G.breaks}</td><td>${G.avoid}<br><small>💡 ${G.tip}</small></td></tr>`; }).join("")}
    </table>` },
  { title: "Mejoras y pactos", html: () => { const R = ROGUE_CONFIG, O = R.RARITY_ODDS; return `
    <p>Cada partida construye un raptor distinto: eliges <b>mejoras temporales</b> que solo duran esa partida (tu «build»). Las monedas, skins, logros y récords siguen siendo permanentes.
    Funciona en todos los modos de un jugador (no en el multijugador).</p>
    <ul>
      <li><b>Tras cada boss derrotado</b>: «ELIGE UNA MEJORA» con ${R.CARDS} cartas. ${kbd("A")}/${kbd("D")} para elegir y ${kbd("W")} para cogerla (o tócala).</li>
      <li><b>Barajar</b> ${kbd("R")}: cambia las cartas. Cuesta monedas de la partida: ${R.REROLL_BASE}, ${R.REROLL_BASE * 2}, ${R.REROLL_BASE * 4}… <b>Saltar</b> ${kbd("Q")}: no coges nada y ganas ${R.SKIP_COINS} monedas.</li>
      <li><b>Nivel perfecto</b>: si recoges los ${CONFIG.EGGS_PER_LEVEL} huevos de un nivel, al pasar de nivel eliges entre ${R.EGG_CARDS} cartas Comunes o Raras.</li>
      <li><b>Checkpoints</b>: si empiezas en un nivel avanzado, recibes 1 elección gratis por cada ${R.CHECKPOINT_PICKS_PER} niveles saltados.</li>
      <li><b>Altar de ámbar</b> (${pct(R.ALTAR_CHANCE)} por nivel): tócalo y te ofrece un <b>pacto</b>: una ventaja fuerte con una desventaja para toda la partida. Máximo ${R.MAX_PACTS} pactos.</li>
    </ul>
    <h4>Rarezas</h4>
    <table><tr><th>Rareza</th><th>Probabilidad al empezar</th></tr>
      ${RARITY_ORDER.map(r => `<tr><td style="color:${R.RARITY[r].color}">${R.RARITY[r].name}</td><td>${pct(O[r])}</td></tr>`).join("")}</table>
    <p>Por cada boss derrotado, Común baja ${Math.round(-R.ODDS_PER_BOSS.comun * 100)} puntos y Épica y Legendaria suben ${Math.round(R.ODDS_PER_BOSS.epica * 100)} (Común nunca baja del ${pct(R.MIN_COMMON)}).
    Las Legendarias no salen hasta derrotar a ${R.LEGENDARY_AFTER_BOSSES} bosses. Algunas mejoras tienen niveles (se pueden coger varias veces).</p>
    <h4>Sinergias</h4>
    <table><tr><th>Sinergia</th><th>Necesitas</th><th>Efecto extra</th></tr>
      ${SYNERGIES.map(x => `<tr><td>${x.name}</td><td>${x.need.map(([id, l]) => UPGRADE_BY_ID[id].name + (l > 1 ? ` (nivel ${l})` : "")).join(" + ")}</td><td>${x.desc}</td></tr>`).join("")}</table>
    <h4>Pactos del altar</h4>
    <table><tr><th>Pacto</th><th>Ventaja</th><th>Desventaja</th></tr>
      ${PACTS.map(p => `<tr><td>${p.name}</td><td>${p.good}</td><td>${p.bad}</td></tr>`).join("")}</table>
    <div class="tip"><b>Consejos</b><br>· No gastes todas las monedas en barajar al principio: el precio se duplica y los bosses de más adelante dan mejores cartas.<br>
    · Busca una sinergia (las cartas que la completan llevan la etiqueta «SINERGIA») en vez de coger un poco de todo.<br>
    · Un pacto compensa si tu build ya tapa su desventaja: el Pacto del silencio con Furia rápida, el de la bestia si llevas Presa fácil…<br>
    · En la pausa ves todo tu build con sus descripciones; en el menú tienes el <b>Álbum</b> y el <b>Historial</b> de tus últimas 20 partidas.</div>`; } },
  { title: "Pase de temporada", html: () => `
    <p>El <b>pase de temporada</b> (${SEASON_CONFIG.NAME}) es gratis y sin dinero real. Cada partida da XP: puntos ÷ ${SEASON_CONFIG.XP.PER_POINTS}, +${SEASON_CONFIG.XP.BOSS} por jefe, +${SEASON_CONFIG.XP.LEVEL} por nivel, +${SEASON_CONFIG.XP.EGG} por huevo y +${SEASON_CONFIG.XP.SYNERGY} por sinergia (×${fmtNum(SEASON_CONFIG.MODE_MULT.hard)} en Difícil, ×${fmtNum(SEASON_CONFIG.MODE_MULT.easy)} en Fácil).</p>
    <p>Tiene ${SEASON_CONFIG.TIERS} niveles. Cada uno da su recompensa al momento (monedas, huevos o fósiles) y los niveles 10, 20 y 30 dan skins exclusivas.
    La del nivel ${SEASON_CONFIG.TIERS}, <b>Prisma Celestial</b>, es la mejor del juego: cambia de color sin parar, lleva halo, bufanda y gemas en órbita, deja una estela prismática y tiene su propio rugido.</p>
    <div class="m-demos">${SEASON_SKINS.map(k => demo("skin", k.name + ` (nivel ${k.season})`, k.id)).join("")}</div>` },
  { title: "Modo Aleatorio", html: () => `
    <p>Dificultad Normal, pero cada nivel trae una <b>regla sorpresa</b> que se anuncia al empezar el nivel (y se ve arriba en el marcador). Tiene su propio récord.</p>
    <table><tr><th>Regla</th><th>Qué hace</th></tr>${RANDOM_MODS.map(m => `<tr><td>${m.icon} ${m.name}</td><td>${m.desc}</td></tr>`).join("")}</table>
    <div class="tip">Dicen que quien recorre los 10 niveles de un tirón, sin caer ni una sola vez, encuentra un portal dorado…</div>` },
  { title: "Multijugador online", html: () => `
    <p>En <b>Multijugador → 🌐 Online</b> corres contra 1–3 personas a la vez, cada una en su móvil u ordenador (necesitas conexión y un apodo).</p>
    <ul><li><b>Partida rápida</b>: te empareja con quien esté buscando partida (espera ${NET_CONFIG.QUICK_WAIT} s por si entra alguien más).</li>
      <li><b>Crear sala</b>: te da un código de 4 letras para tus amigos; entran con <b>Unirse a una sala</b>. Cuando todos estáis listos, el anfitrión (👑) pulsa Empezar.</li>
      <li>Todos corréis <b>el mismo recorrido</b> en Normal desde el nivel 1, sin mejoras roguelike y sin el árbol (igualdad para todos). Cada jugador tiene <b>un color</b>: los demás se ven como fantasmas con el contorno y la etiqueta de su color, y tu raptor lleva encima la marca <b>TÚ</b>. Si compartís carril, el fantasma se vuelve más transparente para que siempre sepas cuál eres. Si se alejan, una flecha indica la distancia.</li>
      <li>El anfitrión elige el <b>modo</b> en la sala:</li></ul>
    <p><b>🏁 Carrera</b> (sin jefes): gana quien llegue más lejos.</p>
    <ul><li>Cada ${NET_CONFIG.TRAP_EVERY} s ganas una <b>trampa</b> (puedes guardar ${NET_CONFIG.TRAP_MAX} y lanzar como mucho <b>${NET_CONFIG.TRAP_TOTAL} por carrera</b>; el marcador dice cuántas te quedan): <kbd>Q</kbd> o el botón 🎯 la lanza al rival que va justo por delante de ti (o al primero si vas en cabeza).</li>
      <li><b>💨 Rebufo</b>: si vas en el mismo carril justo detrás de un rival, corres un ${Math.round((NET_CONFIG.DRAFT_SPEED - 1) * 100)} % más rápido para alcanzarle.</li>
      <li>Premios: ${NET_CONFIG.PRIZE_COINS.map((c, i) => `${i + 1}º ${c} monedas`).join(", ")} y XP del pase.</li></ul>
    <p><b>🤝 Cooperativo</b> (con jefes): jugáis en equipo.</p>
    <ul><li>Cada jefe tiene más vida (+${Math.round(NET_CONFIG.BOSS_HP_PER_PLAYER * 100)} % por cada compañero), pero <b>el daño de todos se suma</b>: cuando un compañero golpea, verás su nombre y el daño sobre tu jefe.</li>
      <li>Si caes, no se acaba: <b>te levantas</b> en cuanto tu equipo derrota a un jefe o a los ${NET_CONFIG.REVIVE} s (si queda alguien en pie), con escudo y el camino despejado.</li>
      <li><kbd>Q</kbd> / 🎁 regala un <b>escudo</b> de ${NET_CONFIG.GIFT_TIME} s al compañero que va más atrasado.</li>
      <li>La partida acaba cuando cae todo el equipo.</li></ul>
    <p><b>👁 Modo espectador</b>: cuando caes (en los dos modos) la cámara sigue a un compañero que siga vivo y ves sus obstáculos y su jefe en directo. Cambia de jugador con ◀ ▶ (o tus teclas de carril) y mira la clasificación con 🏆 (o <kbd>T</kbd>). Si revives en el cooperativo, vuelves a tu partida.</p>
    <ul><li>Resultados: El premio depende de la puntuación del equipo y de los jefes derrotados; el que más daño hizo es el <b>MVP</b> ⭐.</li></ul>
    <p>Después puedes pedir la revancha en la misma sala.</p>` },
  { title: "Clima", html: () => `
    <p>A mitad de nivel puede llegar el <b>clima</b> del bioma. Dura unos segundos, se anuncia en el marcador y cambia algo del juego mientras dura (no en multijugador ni durante los jefes):</p>
    <table><tr><th>Bioma</th><th>Clima</th><th>Efecto</th></tr>${Object.entries(WEATHER).map(([b, w]) => `<tr><td>${(BIOMES.find(x => x.id === b) || {}).name || b}</td><td>${w.icon} ${w.name}</td><td>${w.desc}</td></tr>`).join("")}</table>` },
  { title: "Carrera diaria", html: () => `
    <p>En la portada, <b>📅 Carrera diaria</b>: cada día hay un recorrido nuevo, <b>el mismo para todos</b> (obstáculos, monturas, altares y cartas de mejora salen de una semilla con la fecha). Se juega en Normal desde el nivel 1 con una <b>regla del día</b> fija toda la partida (una de las del modo Aleatorio).</p>
    <ul><li>Intentos ilimitados: cuenta tu <b>mejor marca del día</b> (tiene su propio récord y no toca el del modo Normal).</li>
      <li>El primer intento de cada día da <b>${DAILY_CONFIG.COINS} monedas y ${DAILY_CONFIG.XP} XP</b> del pase, +${DAILY_CONFIG.STREAK_COINS} monedas por cada día de <b>racha</b> (hasta ${DAILY_CONFIG.STREAK_MAX} días).</li>
      <li>El panel muestra la regla, tus intentos, la racha y un gráfico de tus marcas de los últimos 7 días.</li></ul>` },
  { title: "Árbol de mejoras", html: () => { const F = TREE_CONFIG.FOSSILS; return `
    <p>Mejoras <b>permanentes</b> que se aplican al empezar cada partida (en todos los modos de un jugador). Se pagan con <b>fósiles</b>, una moneda aparte que no compite con la tienda.</p>
    <table><tr><th>Cómo se ganan los fósiles (al acabar la partida)</th><th>Fósiles</th></tr>
      <tr><td>Cada nivel completado</td><td>${F.LEVEL}</td></tr><tr><td>Cada boss derrotado (Corrupto · Dorado)</td><td>${F.BOSS} (${F.BOSS_CORRUPT} · ${F.BOSS_GOLD})</td></tr>
      <tr><td>Cada sinergia activada</td><td>${F.SYNERGY}</td></tr><tr><td>Superar tu récord</td><td>${F.RECORD}</td></tr></table>
    <p>En Fácil ganas la mitad (redondeando hacia arriba). El Game Over te dice cuántos has ganado y por qué.</p>
    ${TREE_CONFIG.branches.map(b => `<h4 style="color:${b.color}">Rama ${b.name}</h4><ul>${b.nodes.map(n => `<li><b>${n.name}</b> (máx. ${n.max}, coste ${n.cost.join("/")}): ${n.desc(n.max)}</li>`).join("")}</ul>`).join("")}
    <p>Un nodo solo se puede comprar si el anterior de su rama tiene al menos nivel 1 (los primeros cuelgan de la Raíz, gratis). <b>Reiniciar árbol</b> devuelve todos los fósiles gastados: gratis la primera vez y después ${TREE_CONFIG.RESET_COST} monedas.</p>`; } },
  { title: "Estadísticas", html: () => `
    <p>En el menú, <b>📊 Estadísticas</b> guarda todo lo que haces, con 5 pestañas:</p>
    <ul><li><b>General</b>: partidas, tiempo, distancia, récords por modo, monedas ganadas y gastadas, movimientos, qué te mata más y en qué bioma, y un gráfico de tus últimas 20 partidas.</li>
      <li><b>Jefes</b>: combates, victorias, derrotas, % de victoria, mejor tiempo, corazones perdidos de media y victorias en forma Corrupta y Dorada.</li>
      <li><b>Monturas</b>: veces usada, tiempo total y veces perdida por un golpe.</li>
      <li><b>Roguelike</b>: mejora más elegida, rareza más alta, sinergias, pactos y tu mejor build.</li>
      <li><b>Otros</b>: ruleta, multijugador y skins más usados.</li></ul>
    <p>«Reiniciar estadísticas» pide doble confirmación y no toca monedas, skins ni logros.</p>` },
  { title: "Copia de seguridad", html: () => `
    <p>En el menú, <b>💾 Guardar / Cargar</b>:</p>
    <ul><li><b>Exportar</b>: crea un código de texto con TODO tu progreso (monedas, skins, diseños, checkpoints, logros, estadísticas, árbol, historial, álbum, consejos y opciones). Cópialo o descárgalo como archivo <i>dino-runner-guardado-AAAA-MM-DD.txt</i>.</li>
      <li><b>Importar</b>: pega un código o elige un archivo. Si está dañado verás un error y no se cambia nada. Antes de sobrescribir verás un resumen y tendrás que confirmar.</li>
      <li><b>Deshacer</b>: antes de importar se guarda tu progreso anterior; «Restaurar el guardado anterior» lo recupera.</li></ul>
    <p>Si pasan ${BACKUP_CONFIG.REMIND_DAYS} días sin exportar y tienes bastante progreso, el menú te lo recordará.</p>` },
  { title: "Tutorial y consejos", html: () => `
    <p>El <b>tutorial</b> es un nivel de práctica en el Desierto donde no puedes perder: enseña a saltar y hacer doble salto, deslizarte, la caída rápida, los carriles, el rugido, a coger monedas, power-ups y huevos, y el súper rugido. Al terminarlo por primera vez ganas ${TUTORIAL_CONFIG.REWARD} monedas y el logro «Graduado».</p>
    <p>Los <b>consejos</b> salen la primera vez que ves algo nuevo (un boss, la forma furiosa, un boss Corrupto, cada montura, el altar de ámbar, la primera elección de mejora y la furia llena). Puedes desactivarlos o volver a verlos desde el menú.</p>
    <div class="actions"><button class="btn primary" data-act="tutorial">🎓 Repetir el tutorial</button></div>` },
  { title: "Guía para ser PRO", html: () => `
    <ul>
      <li><b>Guarda el rugido para los pájaros</b>: las rocas fáciles se saltan; los pájaros rápidos no perdonan.</li>
      <li><b>Usa la caída rápida</b> (S en el aire) para volver antes al suelo y reaccionar al siguiente obstáculo.</li>
      <li><b>Cambia de carril antes de saltar</b>: así ves con tiempo lo que viene en el otro carril.</li>
      <li><b>Aprende las señales de los bosses</b>: sombra = golpe desde arriba, flecha = viene por el carril, línea = láser, diana = arco.</li>
      <li><b>Cambia de estrategia en cada boss</b>: lee el mensaje de abajo al empezar la pelea; lo que funciona con uno no le hace nada al siguiente.</li>
      <li><b>Practica el «¡PERFECTO!»</b> (rugir justo cuando un proyectil te va a dar): es la clave contra el Golem, el Rey de los huesos y la Nave nodriza.</li>
      <li><b>Ve a por los huevos solo si el camino es seguro</b>: ${CONFIG.EGG_VALUE} monedas no valen una partida.</li>
      <li><b>Checkpoint o legendario</b>: un checkpoint ahorra tiempo pero no da monedas. Cómpralo si un nivel se te atasca; si lo que quieres es un Legendario (${Math.min(...SkinCatalog.shop.filter(k => k.rarity === "Legendario").map(k => k.price))}+), ahorra y juega desde el nivel 1.</li>
      <li><b>Farmear monedas</b>: modo Normal (monedas ×1), coge el imán, derrota bosses (+${CONFIG.BOSS_COINS} cada uno) y recoge huevos.</li>
      <li><b>Practica los bosses nuevos en Fácil</b> antes de enfrentarte a ellos en Normal.</li>
    </ul>` },
];

// Fichas de las monturas (el resto de datos sale de MOUNT_CONFIG)
const MOUNT_GUIDE = {
  board:    { controls: "W salto largo · S agacharse · E ruge", breaks: "—", avoid: "Lo de siempre, pero todo llega antes (velocidad ×1,4)", tip: "Saltar por encima de un cactus es un ¡TRUCO! (+5 monedas)." },
  log:      { controls: "W salta · E ruge", breaks: "Arrolla cactus y rocas pequeñas", avoid: "Cocodrilos (burbujas antes de asomar), troncos y rocas grandes", tip: "No saltes lo pequeño: el tronco lo rompe." },
  lavarock: { controls: "W mantenido sube · S mantenido baja · E ruge", breaks: "Vuela por encima de lo bajo", avoid: "Chorros de lava y rocas que caen: busca el hueco", tip: "Sin pulsar nada la roca baja despacio." },
  sled:     { controls: "W salto bajo · cambio de carril lento", breaks: "—", avoid: "Todo llega al doble de rápido", tip: "Monedas ×2: cambia de carril con antelación." },
  meteor:   { controls: "A/D carril · W al final: ¡SALTA!", breaks: "TODO (invencible)", avoid: "Saltar tarde o pronto: sales despedido", tip: "Salta cuando el aviso se ponga verde: +monedas y furia." },
  turtle:   { controls: "W salto pesado · S se esconde (1 s, cada 3 s)", breaks: "Pisa cactus y rocas pequeñas", avoid: "Olas (escóndete o cambia de carril) y pájaros", tip: "Escondido es inmune a todo." },
  shroom:   { controls: "Rebota sola · W mantenido más alto · S corta el rebote", breaks: "Aplasta lo que pisa al caer (+10)", avoid: "Chocar de lado contra lo alto", tip: "Usa S para caer justo encima de los obstáculos." },
  dolphin:  { controls: "Arcos solos · W salto alto · S bucea (máx. 2 s)", breaks: "—", avoid: "Medusas (bucea), redes (salta) y tiburones (no bucees cuando veas la aleta)", tip: "Hay monedas bajo el agua. Bajo el agua no puedes rugir." },
  coffin:   { controls: "W salto bajo · S frena · E ruge", breaks: "Atraviesa fantasmas, pájaros y lápidas pequeñas", avoid: "Tumbas grandes y calaveras rodantes", tip: "Frena para cuadrar el salto con las calaveras." },
  rocket:   { controls: "W impulso hacia arriba (tipo flappy)", breaks: "Pasa por encima de lo del suelo", avoid: "Meteoritos y satélites: siempre hay un hueco", tip: "Tocar el techo o el suelo te deja 1 s sin control." },
};
// Mini animaciones del manual (coordenadas lógicas del canvas)
function demoGround(c, w, h, gy) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#2f3658"); g.addColorStop(1, "#4a5282");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = "#262b45"; c.fillRect(0, gy, w, h - gy); c.fillStyle = "#5a638f"; c.fillRect(0, gy, w, 2);
}
// Raptor del jugador con drawSprite (sc = píxeles por píxel nativo); pies en (x, bottom)
function demoRaptor(c, g, x, bottom, frame, t, sc = 2, squash = false) {
  const id = g.skinId, tick = Math.floor(t / CONFIG.SKIN_TICK), f = frame || SE.runFrame(id, tick).frame;
  c.save(); c.translate(Math.round(x), Math.round(bottom - SE.H * sc));
  SE.drawSprite(c, id, squash ? (tick % 4 < 2 ? "duck1" : "duck2") : f, 0, 0, sc, tick); c.restore();   // agachado: pose propia
}
const DEMOS = {
  run(c, t, d, g) { demoGround(c, d.w, d.h, 86); drawCactus(c, 260 - mod(t * 120, 300), 56, 16, 30); demoRaptor(c, g, 14, 86, null, t);
    c.fillStyle = "#f7c948"; for (let i = 0; i < 3; i++) { const x = mod(200 + i * 30 - t * 120, 300) - 20; c.beginPath(); c.arc(x, 60, 5, 0, 7); c.fill(); } },
  egg(c, t, d) { demoGround(c, d.w, d.h, 88); const k = mod(t, 2.4);
    if (k < 1.6) { c.save(); c.translate(d.w / 2, 54 + Math.sin(t * 3) * 2); c.globalAlpha = 0.35 + 0.25 * Math.sin(t * 5); c.fillStyle = "#fff6c8"; c.beginPath(); c.ellipse(0, 0, 20, 24, 0, 0, 7); c.fill(); c.globalAlpha = 1; c.rotate(Math.sin(t * 3) * 0.12); drawEggPixels(c, 0, 0, 3); c.restore(); }
    else { const u = (k - 1.6) / 0.8; drawEggHalves(c, d.w / 2, 54, u, 3); c.font = 'bold 16px "Raptor Pixel Display"'; c.textAlign = "center"; c.fillStyle = "#ffd23f"; c.fillText(`+${CONFIG.EGG_VALUE}`, d.w / 2, 30 - u * 14); c.textAlign = "left"; } },
  jump(c, t, d, g) { const k = mod(t, 1.6) / 1.6, y = k > 0.3 && k < 0.75 ? Math.sin((k - 0.3) / 0.45 * Math.PI) * 44 : 0;
    demoGround(c, d.w, d.h, 88); drawCactus(c, 170 - k * 190, 58, 16, 30); demoRaptor(c, g, 10, 88 - y, y ? "jump" : null, t); },
  double(c, t, d, g) { const k = mod(t, 2) / 2; let y = 0;
    if (k > 0.2 && k < 0.45) y = Math.sin((k - 0.2) / 0.25 * Math.PI / 2) * 30; else if (k >= 0.45 && k < 0.8) y = 30 + Math.sin((k - 0.45) / 0.35 * Math.PI) * 26 - (k - 0.45) / 0.35 * 30;
    demoGround(c, d.w, d.h, 88); c.fillStyle = "#8b9099"; c.fillRect(165 - k * 200, 38, 22, 50); c.fillStyle = "#4a4d55"; c.fillRect(165 - k * 200, 38, 22, 4);
    demoRaptor(c, g, 10, 88 - y, y ? "jump" : null, t); if (k > 0.44 && k < 0.5) { c.fillStyle = "#fff"; c.fillRect(18, 88 - y + 2, 20, 3); } },
  slide(c, t, d, g) { const k = mod(t, 1.6) / 1.6, bx = 170 - k * 200, sliding = bx < 90 && bx > -20;
    demoGround(c, d.w, d.h, 88); c.save(); c.translate(bx, 44); c.scale(0.5, 0.5); drawSkinSprite(c, BIRD_SPRITES.vulture[Math.floor(t * 11) % 4], 0, 0); c.restore();
    demoRaptor(c, g, 8, 88, null, t, 2, sliding); },
  fastfall(c, t, d, g) { const k = mod(t, 1.8) / 1.8; let y = 0;
    if (k < 0.35) y = Math.sin(k / 0.35 * Math.PI / 2) * 50; else if (k < 0.5) y = 50 * (1 - (k - 0.35) / 0.15);
    demoGround(c, d.w, d.h, 88); demoRaptor(c, g, 20, 88 - y, y ? "jump" : null, t);
    if (k >= 0.35 && k < 0.5) { c.fillStyle = "#ffe9a8"; for (let i = 0; i < 3; i++) c.fillRect(30 + i * 10, 88 - y - 56, 2, 10); c.font = 'bold 12px "Raptor Pixel Display"'; c.fillText("S", 90, 30); } },
  lanes(c, t, d, g) { demoGround(c, d.w, d.h, 60); c.fillStyle = "#5a638f"; c.fillRect(0, 88, d.w, 2);
    const k = mod(t, 2) / 2, u = k < 0.5 ? clamp((k - 0.3) / 0.1, 0, 1) : 1 - clamp((k - 0.8) / 0.1, 0, 1);
    demoRaptor(c, g, lerp(22, 14, u), lerp(60, 88, u), null, t, u > 0.5 ? 2 : 1.5);
    c.font = 'bold 12px "Raptor Pixel Display"'; c.fillStyle = "#ffe9a8"; c.fillText(k < 0.5 ? "D ▼" : "A ▲", 120, 20); },
  roar(c, t, d, g) { const k = mod(t, 1.8) / 1.8; demoGround(c, d.w, d.h, 88); demoRaptor(c, g, 4, 88, "idle", t);
    if (k < 0.4) { c.fillStyle = "#8b9099"; c.fillRect(120, 68, 24, 20); c.fillStyle = "#4a4d55"; c.fillRect(120, 68, 24, 3); }
    if (k > 0.25 && k < 0.6) { const r = (k - 0.25) / 0.35 * 110; c.strokeStyle = `rgba(255,210,150,${1 - (k - 0.25) / 0.35})`; c.lineWidth = 3; c.beginPath(); c.arc(54, 62, r, -0.9, 0.9); c.stroke(); }
    if (k >= 0.4 && k < 0.7) { c.fillStyle = "#8b9099"; for (let i = 0; i < 6; i++) c.fillRect(126 + i * 4 + (k - 0.4) * 60 * (i % 2 ? 1 : -1), 70 - (k - 0.4) * 80 + i * 3, 5, 5); } },
  obst(c, t, d, g) {
    if (!d.state.o) {
      const [bi, kind] = d.arg.split(":"), biome = g.level.biomes[+bi];
      d.state.o = new Obstacle(kind, 1, 0, { size: kind === "rock" ? "small" : "big", count: 1, h: "mid" }, biome);
      if (kind === "flyer") d.state.o.y = 20;
    }
    const o = d.state.o; o.t += 1 / 60; demoGround(c, d.w, d.h, 90);
    const s = o.kind === "stalactite" ? 0.3 : 0.8;
    c.save(); c.translate(d.w / 2 - o.w * s / 2, 90); c.scale(s, s); o.draw(c); c.restore(); },
  power(c, t, d) { demoGround(c, d.w, d.h, 90); const y = 48 + Math.sin(t * 4) * 4, col = POWERUPS[d.arg].color;
    c.globalAlpha = 0.35; c.fillStyle = col; c.beginPath(); c.arc(d.w / 2, y, 30, 0, 7); c.fill(); c.globalAlpha = 1;
    c.fillStyle = "rgba(255,255,255,0.9)"; c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(d.w / 2, y, 22, 0, 7); c.fill(); c.stroke();
    drawIcon(c, d.arg, d.w / 2, y, 12); },
  mount(c, t, d) { demoGround(c, d.w, d.h, 84); drawMountIcon(c, d.arg, d.w / 2, 70 + Math.sin(t * 5) * 2, t, 1.1); },
  biome(c, t, d, g) { c.save(); c.scale(d.w / W, d.h / H); g.level.biomes[+d.arg].draw(c, g, 1); c.restore(); },
  skin(c, t, d) { if (!d.state.st) d.state.st = { tick: 0, speed: 2, trail: null, acc: 0 }; const st = d.state.st;
    tickStates([st], 1 / 60); drawSkinPreview(c, d.arg, st, d.w, d.h, 3); },
  // Boss sobre el bioma donde aparece por primera vez
  boss(c, t, d, g) {
    const i = +d.arg, bi = CONFIG.LEVELS.findIndex(L => L.boss === i);
    if (!d.state.boss) { const b = new BOSS_CLASSES[i](g, 0); b.state = "fight"; b.away = 0; for (let k = 0; k < 30; k++) { b.t += 0.05; b.updateBody(0.05); } d.state.boss = b; }
    const b = d.state.boss;
    c.save(); c.scale(d.w / W, d.h / H); g.level.biomes[bi].draw(c, g, 1);
    if (i === 0) c.translate(170, 0);
    b.drawSky(c); b.drawLayer(c, 0); b.drawLayer(c, 1); c.restore(); },
};

ACHIEVEMENTS.find(a => a.id === "estudiante").goal = MANUAL_SECTIONS.length;   // el logro sigue al número de secciones
class Manual {
  constructor(game) {
    this.game = game; this.page = 0; this.returnTo = "menu"; this.demos = [];
    const $ = id => document.getElementById(id);
    this.el = $("manual"); this.index = $("mIndex"); this.content = $("mContent"); this.pageEl = $("mPage");
    this.prevBtn = $("mPrev"); this.nextBtn = $("mNext");
    MANUAL_SECTIONS.forEach((sec, i) => {
      const b = document.createElement("button"); b.textContent = `${i + 1}. ${sec.title}`;
      b.addEventListener("click", () => { game.sfx.click(); this.show(i); });
      this.index.appendChild(b);
    });
    this.prevBtn.addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); this.show(this.page - 1); });
    this.nextBtn.addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); this.show(this.page + 1); });
    $("mBack").addEventListener("click", e => { e.currentTarget.blur(); game.sfx.click(); this.close(); });
  }
  get visible() { return !this.el.classList.contains("hidden"); }
  open(from) { this.returnTo = from; this.el.classList.remove("hidden"); this.show(this.page); }
  close() {
    this.el.classList.add("hidden"); this.demos = [];
    if (this.returnTo === "pause") this.game.ui.showPause(); else this.game.showMenu();
  }
  show(i) {
    const n = MANUAL_SECTIONS.length;
    this.page = clamp(i, 0, n - 1);
    const sec = MANUAL_SECTIONS[this.page];
    this.content.innerHTML = `<h3>${this.page + 1}. ${sec.title}</h3>` + sec.html(this.game);
    [...this.index.children].forEach((b, k) => b.classList.toggle("active", k === this.page));
    this.pageEl.textContent = `${this.page + 1} / ${n}`;
    this.prevBtn.disabled = this.page === 0; this.nextBtn.disabled = this.page === n - 1;
    this.demos = [...this.content.querySelectorAll("canvas[data-demo]")].map(cv => {
      const w = +cv.dataset.w, h = +cv.dataset.h, k = 2; cv.width = w * k; cv.height = h * k;
      return { ctx: cv.getContext("2d"), fn: DEMOS[cv.dataset.demo], k, arg: cv.dataset.arg, w, h, state: {} };
    });
    this.el.querySelector(".card").scrollTop = 0;
    const tb = this.content.querySelector("[data-act=tutorial]");
    if (tb) tb.addEventListener("click", () => { this.game.sfx.click(); this.el.classList.add("hidden"); this.demos = []; this.game.startTutorial(); });
    this.game.ach.event("manualSection", { index: this.page });
  }
  update(dt) { for (const d of this.demos) if (d.state.boss) { d.state.boss.t += dt; d.state.boss.updateBody(dt); } }
  drawDemos(t) {
    for (const d of this.demos) {
      const c = d.ctx; c.setTransform(d.k, 0, 0, d.k, 0, 0); c.imageSmoothingEnabled = false; c.clearRect(0, 0, d.w, d.h);
      try { d.fn(c, t, d, this.game); } catch (e) { /* una demo rota no debe romper el manual */ }
    }
  }
}

