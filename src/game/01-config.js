// =====================================================================
//  CONSTANTES DE BALANCE — ajusta aquí dificultad, jefes, economía y logros
// =====================================================================
const CONFIG = {
  // --- Velocidad (píxeles por segundo) ---
  BASE_SPEED: 380,           // velocidad base del nivel 1
  SPEED_PER_LEVEL: 0.10,     // +10 % de la velocidad base por cada nivel
  SPEED_IN_LEVEL: 0.05,      // aceleración suave dentro de un nivel (+5 % al final del nivel)
  MAX_SPEED: 900,            // límite máximo para que siga siendo jugable
  SPEED_SMOOTHING: 1.5,      // rapidez con la que la velocidad alcanza su objetivo
  BIRD_EXTRA_SPEED: 50,      // los pájaros vuelan algo más rápido que el suelo
  FAST_BIRD_LEVEL: 4,        // nivel desde el que aparecen pájaros rápidos y que cambian de altura
  FAST_BIRD_BONUS: 170,      // velocidad extra de los pájaros rápidos
  BOTH_LANES_LEVEL: 3,       // Normal: nivel desde el que hay obstáculos en ambos carriles

  // --- Física del raptor ---
  GRAVITY: 2600,             // px/s²
  JUMP_VELOCITY: 920,        // impulso del salto
  DOUBLE_JUMP_VELOCITY: 820, // impulso del doble salto
  FAST_FALL_MULT: 3.2,       // gravedad extra con S en el aire
  SLIDE_DURATION: 0.6,       // s de deslizamiento
  LANE_SWITCH_TIME: 0.2,     // s de la animación de cambio de carril
  RAPTOR_SCALE: 3,           // px de pantalla por píxel del sprite (24 × 20 → 72 × 60)
  SKIN_TICK: 0.09,           // s por tick de animación del motor de skins (80–110 ms)
  TRAIL_MAX: 150,            // partículas máximas de estela por skin

  // --- Rugido ---
  ROAR_COOLDOWN: 6,          // s de recarga
  ROAR_RANGE: 280,           // alcance en px por delante del raptor
  ROAR_WAVE_TIME: 0.3,       // s que tarda la onda en llegar al alcance máximo

  // --- Power-ups ---
  SHIELD_DURATION: 5,        // s (o hasta absorber un golpe)
  MAGNET_DURATION: 8,        // s (no atrae huevos)
  MAGNET_RADIUS: 260,        // px de atracción
  SLOWMO_DURATION: 5,        // s
  SLOWMO_FACTOR: 0.5,        // 0.5 = el juego va al 50 %
  TURBO_DURATION: 4,         // s
  TURBO_MULT: 2,             // multiplicador de velocidad en turbo
  HIT_GRACE: 1.0,            // s de invulnerabilidad tras romper el escudo o acabar el turbo
  POWERUP_CHANCE: 0.16,      // probabilidad de power-up tras cada patrón (nivel 1)
  POWERUP_FACTOR_PER_LEVEL: 0.85, // multiplicador de esa probabilidad por nivel (aparecen menos)
  POWERUP_MIN_CHANCE: 0.05,  // probabilidad mínima
  POWERUP_MIN_SCORE: 80,     // puntos antes de que empiecen a salir

  // --- Niveles y biomas ---
  POINTS_PER_LEVEL: 1000,    // puntos por nivel
  LEVEL_BANNER_TIME: 2,      // s que se muestra el aviso de nivel
  BIOME_FADE_TIME: 1,        // s del fundido entre biomas

  // --- Generación de obstáculos ---
  FIRST_SPAWN_DISTANCE: 600, // px antes del primer obstáculo
  GAP_START: 1.3,            // s de hueco entre patrones en el nivel 1
  GAP_FACTOR_PER_LEVEL: 0.9, // el hueco se multiplica por esto en cada nivel (obstáculos más frecuentes)
  GAP_MIN: 0.55,             // hueco mínimo en s
  GAP_RANDOM: 0.5,           // s aleatorios extra de hueco

  // --- Monedas, huevos y puntuación ---
  COIN_ARC_CHANCE: 0.6,      // prob. de arco de monedas sobre un obstáculo saltable
  COIN_LINE_CHANCE: 0.4,     // prob. de fila de monedas en cada hueco
  NIGHT_COIN_BONUS: 0.35,    // prob. extra de filas de monedas en la Noche estrellada (tramo de respiro)
  COIN_LINE_MAX: 6,          // monedas máximas por fila
  PX_PER_POINT: 40,          // px recorridos por punto
  EGGS_PER_LEVEL: 2,         // huevos bonus por nivel
  EGG_VALUE: 50,             // monedas por huevo (en Fácil se multiplica por EASY.COIN_VALUE)
  EGG_WINDOWS: [[0.15, 0.4], [0.55, 0.8]], // tramo del nivel (0–1) en el que aparece cada huevo

  // --- Niveles: 10 niveles de 1000 puntos (0–10 000), cada uno con su bioma y su boss ---
  // boss = índice en BOSS_CLASSES (0 escorpión, 1 serpiente, 2 golem, 3 mamut, 4 pterodáctilo, 5 cangrejo, 6 sapo, 7 kraken, 8 huesos, 9 nave)
  // tier = refuerzo del boss (0 = normal). Tras el nivel 10 se repite todo con +1 de refuerzo.
  LEVELS: [
    { biome: "desert",    boss: 0, tier: 0 },   //  1 · 0–999      Escorpión gigante
    { biome: "jungle",    boss: 1, tier: 0 },   //  2 · 1000–1999  Serpiente de lianas
    { biome: "volcano",   boss: 2, tier: 0 },   //  3              Golem de lava
    { biome: "glacier",   boss: 3, tier: 0 },   //  4              Mamut de hielo
    { biome: "night",     boss: 4, tier: 0 },   //  5              Pterodáctilo sombra
    { biome: "beach",     boss: 5, tier: 0 },   //  6              Rey cangrejo
    { biome: "mushroom",  boss: 6, tier: 0 },   //  7              Sapo gigante
    { biome: "ocean",     boss: 7, tier: 0 },   //  8              Kraken abisal
    { biome: "graveyard", boss: 8, tier: 0 },   //  9              Rey de los huesos
    { biome: "moon",      boss: 9, tier: 0 },   // 10 · 9000–9999  Nave nodriza (boss final)
  ],

  // --- Bosses (a mitad de cada nivel: 500, 1500, 2500…); se lucha contra ellos sin dejar de correr ---
  BOSS_AT_IN_LEVEL: 500,     // puntos dentro del nivel en los que llega el boss
  BOSS_WARNING_TIME: 2,      // s de aviso "¡PELIGRO!"
  BOSS_ENTER_TIME: 1.5,      // s de animación de entrada (sin ataques)
  BOSS_MAX_TIME: 40,         // s máximos de pelea; después el boss se retira sin premio
  BOSS_HP: 12,               // vida base (cada boss tiene un multiplicador propio)
  BOSS_HP_PER_CYCLE: 0.5,    // +50 % de vida por cada punto de refuerzo
  BOSS_SPEED_PER_CYCLE: 0.2, // +20 % de rapidez de ataque por cada punto de refuerzo
  BOSS_TELEGRAPH: 1,         // multiplicador de los avisos de ataque (más alto = más tiempo para reaccionar)
  BOSS_TELEGRAPH_MIN: 0.45,  // s mínimos de aviso de un ataque
  BOSS_VULN_TIME: 1.5,       // s de ventana de vulnerabilidad tras cada ataque
  PORTAL_SHOW_DISTANCE: 900, // px antes del final del nivel en los que aparece el portal
  PORTAL_MIN_AHEAD: 500,     // si el nivel ya ha terminado (tras un boss largo), el portal sale a esta distancia
  PORTAL_CLEAR: 260,         // px libres de obstáculos antes del portal
  PORTAL_WARP_TIME: 0.8,     // s del destello al cruzarlo
  EGG_REPEAT_COINS: 20,      // si ya tienes todas las skins de un huevo: monedas por cada huevo gastado
  TRAP_RECHARGE: 6,          // multijugador: s para ganar una trampa
  TRAP_MAX: 2,               // trampas acumulables
  TRAP_TOTAL: 6,             // trampas que puede lanzar cada jugador en toda la partida
  TRAP_INK_TIME: 3,          // s que la tinta oscurece el carril del rival
  TRAP_DISTANCE: 780,        // x de pantalla donde aparece la trampa en el carril del rival
  VERSUS_MODE: "normal",    // multijugador: velocidad y dificultad de este modo (sin jefes, power-ups ni huevos)
  BOSS_FURY_AT: 0.5,         // forma furiosa al bajar a este % de vida: añade la mecánica nueva de cada boss
  BOSS_FURY_SPEED: 1.25,     // en furia ataca un 25 % más rápido
  BOSS_FURY_TELEGRAPH: 0.8,  // y sus avisos duran un 20 % menos
  BOSS_FURY_HINT_TIME: 5,    // s que se muestra el aviso de la mecánica nueva
  BOSS_ATTACK_GAP: 0.7,      // s de pausa entre ataques
  BOSS_DMG_ROAR: 1,          // daño del rugido (solo si es vulnerable y está a su alcance)
  BOSS_DMG_STOMP: 3,         // daño del pisotón sobre el punto débil
  BOSS_DMG_REFLECT: 2,       // daño de un proyectil devuelto con el rugido
  BOSS_DMG_TURBO: 3,         // daño al chocar con turbo
  BOSS_DMG_TRAP: 4,          // daño de la trampa del escenario
  REFLECT_DISTANCE: 40,      // px máximos entre el proyectil y el raptor para devolverlo ("¡PERFECTO!")
  BOSS_TRAP_TIMES: [9, 19],  // s de pelea en los que aparece una trampa
  BOSS_COINS: 100,           // monedas por derrotar a un boss
  BOSS_COINS_PER_CYCLE: 50,  // monedas extra por punto de refuerzo
  BOSS_POINTS: 250,          // puntos por derrotar a un boss
  BOSS_POWERUP_CHANCE: 0.5,  // prob. de que aparezca un escudo o turbo al empezar la pelea
  MAMMOTH_CHARGE_SPEED: 1100,// px/s de la embestida del mamut
  MAMMOTH_FREEZE_TIME: 1.6,  // s que el suelo queda congelado tras la embestida

  // --- Modo Fácil (se aplica en lugar de los valores normales) ---
  EASY: {
    START_SPEED_MULT: 0.75,     // velocidad inicial un 25 % menor
    SPEED_PER_LEVEL: 0.05,      // +5 % por nivel (en vez de SPEED_PER_LEVEL)
    GAP_MULT: 1.35,             // huecos entre obstáculos un 35 % más largos
    BOTH_LANES_LEVEL: 5,        // obstáculos en ambos carriles desde este nivel (Normal: 3)
    LIVES: 3,                   // vidas por partida
    HIT_INVULN: 2,              // s de invencibilidad tras perder una vida
    POWERUP_CHANCE_MULT: 1.5,   // power-ups un 50 % más frecuentes
    POWERUP_DURATION_MULT: 1.5, // y duran un 50 % más
    ROAR_COOLDOWN: 4,           // s de recarga del rugido
    BOSS_HP_MULT: 0.5,          // bosses con la mitad de vida
    BOSS_VULN_TIME: 2.5,        // s de ventana de vulnerabilidad
    BOSS_TELEGRAPH_MULT: 1.5,   // avisos de ataque un 50 % más largos
    BOSS_FURY_AT: 0.3,          // la forma furiosa empieza al 30 % de vida
    COIN_VALUE: 0.5,            // monedas, huevos y premios de bosses valen la mitad
  },

  // --- Modo Difícil (se aplica en lugar de los valores normales) ---
  HARD: {
    START_SPEED_MULT: 1.2,      // velocidad inicial un 20 % mayor
    SPEED_PER_LEVEL: 0.12,      // +12 % por nivel
    GAP_MULT: 0.8,              // huecos entre obstáculos un 20 % más cortos
    BOTH_LANES_LEVEL: 2,        // obstáculos en ambos carriles desde el nivel 2
    FAST_BIRD_LEVEL: 2,         // pájaros rápidos desde el nivel 2
    LIVES: 1,                   // un golpe y fuera
    POWERUP_CHANCE_MULT: 0.6,   // power-ups un 40 % menos frecuentes
    POWERUP_DURATION_MULT: 0.75,// y duran un 25 % menos
    ROAR_COOLDOWN: 8,           // s de recarga del rugido
    BOSS_HP_MULT: 1.25,         // bosses con un 25 % más de vida
    BOSS_SPEED_MULT: 1.15,      // bosses un 15 % más rápidos
    BOSS_VULN_TIME: 1.1,        // s de ventana de vulnerabilidad
    BOSS_TELEGRAPH_MULT: 0.75,  // avisos de ataque un 25 % más cortos
    COIN_VALUE: 1.5,            // monedas, huevos y premios de bosses valen ×1,5
  },

  // --- Tienda ---
  DEFAULT_SKIN: "selva-camuflaje", // gratis y equipado por defecto
  CHECKPOINT_PRICE_STEP: 500,// precio = CHECKPOINT_PRICE_STEP × (nivel − 1): Nivel 2 = 500, Nivel 3 = 1000…
  CHECKPOINT_LEVELS: 10,     // hasta qué nivel se venden checkpoints
  EDITOR_PRICE: 10000,       // precio del editor de skins
  EDITOR_SLOTS: 3,           // ranuras de diseños propios

  // --- Ruleta (solo monedas del juego) ---
  ROULETTE_MIN_BET: 10,
  ROULETTE_MAX_BET: 500,
  ROULETTE_SPIN_TIME: 3.2,   // s que dura el giro
  // Probabilidad (p) y nº de casillas (slots). El tamaño de cada casilla es proporcional a p / slots.
  ROULETTE_ODDS: [
    { mult: 0,   p: 0.32, slots: 3 },   // pierdes todo
    { mult: 0.5, p: 0.25, slots: 2 },   // recuperas la mitad
    { mult: 1.5, p: 0.23, slots: 1 },
    { mult: 2,   p: 0.15, slots: 1 },
    { mult: 5,   p: 0.05, slots: 1 },   // JACKPOT
  ],
  FREE_SPIN_PRIZES: [        // giro gratis diario
    { coins: 10,  p: 0.35 },
    { coins: 25,  p: 0.30 },
    { coins: 50,  p: 0.20 },
    { coins: 100, p: 0.12 },
    { skin: true, p: 0.03 },  // skin Común o Raro no comprado (si ya los tienes: 100 monedas)
  ],

  // --- Modo prueba ---
  DEBUG_COINS: 5000,         // monedas que da el modo prueba
};

// Modo prueba: 5000 monedas, todos los niveles completados, teclas 1–9 y 0 = nivel y B = boss del nivel actual.
// Con DEBUG activo no se consiguen logros.
const DEBUG = false;

// =====================================================================
//  LOGROS — recompensas en monedas (y skins exclusivos). cat: carrera, jefes, habilidad, coleccion, ruleta, modos, secretos
//  goal + stat = logro con barra de progreso. normalOnly = solo en modo Normal o Difícil. secret = oculto hasta conseguirlo.
// =====================================================================
const ACHIEVEMENTS = [
  // Carrera
  { id: "primeros-pasos", cat: "carrera", name: "Primeros pasos", desc: "Consigue 100 puntos en una partida", reward: 10, goal: 100, stat: "bestScore" },
  { id: "corredor", cat: "carrera", name: "Corredor", desc: "Consigue 1000 puntos en una partida", reward: 50, goal: 1000, stat: "bestScore" },
  { id: "maratoniano", cat: "carrera", name: "Maratoniano", desc: "Consigue 5000 puntos en una partida", reward: 200, goal: 5000, stat: "bestScore" },
  { id: "leyenda-jurasica", cat: "carrera", name: "Leyenda jurásica", desc: "Consigue 10000 puntos en una partida (Normal o Difícil)", reward: 1000, skin: "corona-campeon", goal: 10000, stat: "bestScoreNormal", normalOnly: true },
  { id: "explorador", cat: "carrera", name: "Explorador", desc: "Visita los 10 biomas en una partida", reward: 300, goal: 10, stat: "bestBiomes" },
  { id: "vuelta-al-mundo", cat: "carrera", name: "Vuelta al mundo", desc: "Completa los 10 niveles y vuelve al Desierto", reward: 500 },
  // Jefes
  { id: "primer-trofeo", cat: "jefes", name: "Primer trofeo", desc: "Derrota a tu primer boss", reward: 50, goal: 1, stat: "bossesTotal" },
  { id: "cazador-jefes", cat: "jefes", name: "Cazador de jefes", desc: "Derrota a los 10 bosses distintos (en cualquier partida)", reward: 500, goal: 10, stat: "bossTypes" },
  { id: "sin-rasguno", cat: "jefes", name: "Sin un rasguño", desc: "Derrota a un boss sin recibir ningún golpe", reward: 150 },
  { id: "apagon", cat: "jefes", name: "Apagón", desc: "Derrota a la Nave nodriza", reward: 400 },
  { id: "exterminador", cat: "jefes", name: "Exterminador", desc: "Derrota 25 bosses en total", reward: 800, goal: 25, stat: "bossesTotal" },
  { id: "tirano", cat: "jefes", name: "Tirano", desc: "Derrota a los 10 bosses en una misma partida (Normal o Difícil)", reward: 1500, skin: "rey-jefes", normalOnly: true },
  // Habilidad
  { id: "saltarin", cat: "habilidad", name: "Saltarín", desc: "Salta 500 veces en total", reward: 50, goal: 500, stat: "jumps" },
  { id: "rugido-destructor", cat: "habilidad", name: "Rugido destructor", desc: "Destruye 200 obstáculos con el rugido", reward: 150, goal: 200, stat: "roarKills" },
  { id: "sin-poderes", cat: "habilidad", name: "Sin poderes", desc: "Recorre 2000 puntos sin coger power-ups", reward: 300, goal: 2000, stat: "bestNoPowerups" },
  { id: "pacifista", cat: "habilidad", name: "Pacifista", desc: "Recorre 1500 puntos sin usar el rugido", reward: 200, goal: 1500, stat: "bestNoRoar" },
  { id: "carril-fijo", cat: "habilidad", name: "Carril fijo", desc: "Recorre 1000 puntos sin cambiar de carril", reward: 150, goal: 1000, stat: "bestNoLane" },
  // Colección
  { id: "ahorrador", cat: "coleccion", name: "Ahorrador", desc: "Ten 1000 monedas a la vez", reward: 50, goal: 1000, stat: "maxWallet" },
  { id: "millonario", cat: "coleccion", name: "Millonario", desc: "Gana 10000 monedas en total", reward: 500, goal: 10000, stat: "coinsEarned" },
  { id: "iman-humano", cat: "coleccion", name: "Imán humano", desc: "Consigue 100 monedas en una partida", reward: 100, goal: 100, stat: "bestRunCoins" },
  { id: "nido-encontrado", cat: "coleccion", name: "Nido encontrado", desc: "Recoge tu primer huevo", reward: 20, goal: 1, stat: "eggs" },
  { id: "cazatesoros", cat: "coleccion", name: "Cazatesoros", desc: "Recoge 25 huevos en total", reward: 150, goal: 25, stat: "eggs" },
  { id: "nivel-perfecto", cat: "coleccion", name: "Nivel perfecto", desc: "Recoge los 2 huevos de un mismo nivel", reward: 100 },
  { id: "nido-completo", cat: "coleccion", name: "Nido completo", desc: "Recoge todos los huevos de los niveles 1 al 6 en una partida", reward: 800 },
  { id: "fashionista", cat: "coleccion", name: "Fashionista", desc: "Compra 5 skins", reward: 200, goal: 5, stat: "skinsBought" },
  { id: "legendario", cat: "coleccion", name: "Legendario", desc: "Compra tu primer skin Legendario", reward: 300 },
  { id: "majestad", cat: "coleccion", name: "Majestad", desc: "Consigue el Emperador Solar", reward: 1000 },
  { id: "coleccionista", cat: "coleccion", name: "Coleccionista", desc: "Consigue todos los skins de la tienda", reward: 2000, goal: 16, stat: "shopSkins" },
  { id: "atajo", cat: "coleccion", name: "Atajo", desc: "Compra tu primer checkpoint", reward: 50 },
  { id: "disenador", cat: "coleccion", name: "Diseñador", desc: "Guarda tu primer diseño propio", reward: 100 },
  { id: "powerup-master", cat: "coleccion", name: "Power-up máster", desc: "Usa los 4 power-ups en una partida", reward: 150, goal: 4, stat: "bestPowerupTypes" },
  // Ruleta
  { id: "primera-apuesta", cat: "ruleta", name: "Primera apuesta", desc: "Haz tu primera apuesta", reward: 10 },
  { id: "jackpot", cat: "ruleta", name: "¡JACKPOT!", desc: "Consigue un x5 en la ruleta", reward: 100 },
  { id: "mala-racha", cat: "ruleta", name: "Mala racha", desc: "Pierde 3 apuestas seguidas", reward: 25, goal: 3, stat: "bestLossStreak" },
  { id: "fiel-al-giro", cat: "ruleta", name: "Fiel al giro", desc: "Usa el giro gratis en 7 días distintos", reward: 200, goal: 7, stat: "freeSpinDays" },
  // Modos
  { id: "aprendiz", cat: "modos", name: "Aprendiz", desc: "Completa el nivel 1 en modo Fácil", reward: 20 },
  { id: "sin-red", cat: "modos", name: "Sin red", desc: "Completa el nivel 3 en modo Normal o Difícil", reward: 150 },
  { id: "sin-piedad", cat: "modos", name: "Sin piedad", desc: "Completa el nivel 3 en modo Difícil", reward: 400 },
  { id: "pesadilla", cat: "modos", name: "Pesadilla", desc: "Derrota a un boss en modo Difícil", reward: 300 },
  { id: "graduado", cat: "modos", name: "Graduado", desc: "Termina el tutorial", reward: 50 },
  { id: "estudiante", cat: "modos", name: "Estudiante", desc: "Abre todas las secciones del manual", reward: 50, goal: 12, stat: "manualSections" },
  // Monturas
  { id: "jinete", cat: "monturas", name: "Jinete", desc: "Usa 5 monturas distintas", reward: 200, goal: 5, stat: "mountTypes" },
  { id: "domador-total", cat: "monturas", name: "Domador total", desc: "Usa las 10 monturas", reward: 600, goal: 10, stat: "mountTypes" },
  { id: "aterrizaje-perfecto", cat: "monturas", name: "Aterrizaje perfecto", desc: "Salta a tiempo del meteorito 5 veces", reward: 200, goal: 5, stat: "meteorPerfect" },
  { id: "surfista", cat: "monturas", name: "Surfista", desc: "Haz 10 trucos con la tabla de arena", reward: 150, goal: 10, stat: "boardTricks" },
  { id: "sin-rasgunos", cat: "monturas", name: "Sin rasguños", desc: "Termina 10 monturas sin perderlas por un golpe", reward: 250, goal: 10, stat: "mountsClean" },
  // Roguelike
  { id: "primera-eleccion", cat: "roguelike", name: "Primera elección", desc: "Elige tu primera mejora", reward: 20, goal: 1, stat: "upgradesPicked" },
  { id: "coleccionista-poder", cat: "roguelike", name: "Coleccionista de poder", desc: "Elige 25 mejoras distintas en total", reward: 300, goal: 25, stat: "upgradeTypes" },
  { id: "sinergico", cat: "roguelike", name: "Sinérgico", desc: "Activa una sinergia", reward: 100, goal: 1, stat: "synergies" },
  { id: "maestro-sinergias", cat: "roguelike", name: "Maestro de sinergias", desc: "Activa las 7 sinergias (en cualquier partida)", reward: 600, goal: 7, stat: "synergyTypes" },
  { id: "pacto-ambar", cat: "roguelike", name: "Pacto con el ámbar", desc: "Acepta un pacto", reward: 50, goal: 1, stat: "pacts" },
  { id: "alma-vendida", cat: "roguelike", name: "Alma vendida", desc: "Llega al nivel 5 con 2 pactos activos", reward: 400 },
  { id: "leyenda-viviente", cat: "roguelike", name: "Leyenda viviente", desc: "Ten 3 mejoras Legendarias a la vez", reward: 800 },
  { id: "asceta", cat: "roguelike", name: "Asceta", desc: "Derrota a 3 jefes saltando todas las elecciones", reward: 300 },
  // Árbol
  { id: "primera-raiz", cat: "arbol", name: "Primera raíz", desc: "Compra tu primer nodo del árbol", reward: 50 },
  { id: "rama-completa", cat: "arbol", name: "Rama completa", desc: "Completa una rama entera del árbol", reward: 300 },
  { id: "arbol-milenario", cat: "arbol", name: "Árbol milenario", desc: "Completa el árbol", reward: 1500 },
  { id: "madrugador", cat: "modos", name: "Madrugador", desc: "Termina tu primera carrera diaria", reward: 100 },
  { id: "racha-semanal", cat: "modos", name: "Racha semanal", desc: "Juega la carrera diaria 7 días seguidos", reward: 600 },
  { id: "era-prismatica", cat: "coleccion", name: "Era prismática", desc: "Completa los 30 niveles del pase de temporada", reward: 1000 },
  // Secretos
  { id: "por-los-pelos", cat: "secretos", secret: true, name: "Por los pelos", desc: "Esquiva un obstáculo a menos de 5 px", reward: 100 },
  { id: "todo-o-nada", cat: "secretos", secret: true, name: "Todo o nada", desc: "Apuesta el máximo en la ruleta y gana", reward: 150 },
  { id: "constancia", cat: "secretos", secret: true, name: "Constancia", desc: "Juega 100 partidas", reward: 300, goal: 100, stat: "games" },
  { id: "camino-perfecto", cat: "secretos", secret: true, name: "Camino perfecto", desc: "Completa los 10 niveles sin morir y entra en el nivel secreto", reward: 500 },
  { id: "rex-prismatico", cat: "secretos", secret: true, name: "Rey de reyes", desc: "Derrota al jefe secreto del nivel 11", reward: 2000 },
  { id: "raptor-completo", cat: "secretos", secret: true, name: "Raptor completo", desc: "Consigue todos los demás logros", reward: 5000, skin: "fosil-legendario" },
];
const ACH_CATS = { carrera: "Carrera", jefes: "Jefes", habilidad: "Habilidad", coleccion: "Colección", ruleta: "Ruleta", modos: "Modos", monturas: "Monturas", roguelike: "Roguelike", arbol: "Árbol", secretos: "Secretos" };

// Skins exclusivos de logros (mismo formato que SKINS_DATA, reutilizando sprites del kit)
const EXCLUSIVE_SKINS = [
  { id: "corona-campeon", name: "Corona de campeón", rarity: "Exclusiva", price: 0, sprite: "raptor-supreme", exclusive: true, unlockedBy: "leyenda-jurasica",
    pal: { o: "#2a0608", b: "#ffc629", s: "#c8201f", l: "#fff3c4", a: "#e8401c", x: "#ffe680", y: "#ff3b3b", e: "#ffffff", p: "#2a0608" },
    bg: "#2a0d12", ground: "#ffc629",
    fx: { anim: { type: "pulse", key: "x", colors: ["#ffe680", "#ffffff", "#ffc629", "#ff3b3b"] }, label: "Corona que late" } },
  { id: "rey-jefes", name: "Rey de los jefes", rarity: "Exclusiva", price: 0, sprite: "raptor-bolt", exclusive: true, unlockedBy: "tirano",
    pal: { o: "#050308", b: "#1a1024", s: "#0b0612", l: "#3a2250", a: "#c04bff", x: "#c04bff", y: "#e6b8ff", e: "#e6b8ff", p: "#050308" },
    bg: "#0b0612", ground: "#c04bff",
    fx: { anim: { type: "pulse", key: "x", colors: ["#c04bff", "#ff5cf0", "#ffffff", "#8a2be2"] }, sparks: "#e6b8ff", label: "Neón que chisporrotea" } },
  { id: "fosil-legendario", name: "Fósil legendario", rarity: "Exclusiva", price: 0, sprite: "raptor-cracks", exclusive: true, unlockedBy: "raptor-completo",
    pal: { o: "#3a2412", b: "#e8dcc0", s: "#bfae8a", l: "#fff6e0", a: "#d9a441", x: "#ffb627", y: "#ffe8a0", e: "#ffb627", p: "#3a2412" },
    bg: "#2a1a0e", ground: "#d9a441",
    fx: { anim: { type: "pulse", key: "x", colors: ["#ffb627", "#ffe8a0", "#ff8c00", "#ffe8a0"] }, trail: { type: "sparkle", colors: ["#ffb627", "#ffe8a0", "#fff6e0", "#ff8c00"] }, label: "Ámbar que brilla" } },
];
// Trampas del multijugador (A el J1, ← el J2): aparecen en el carril del rival
const TRAP_TYPES = [
  { id: "wall", name: "Doble obstáculo", tip: "salto largo" },
  { id: "bird", name: "Pájaro", tip: "deslízate" },
  { id: "rock", name: "Roca gigante", tip: "doble salto o rugido" },
  { id: "ink",  name: "Tinta", tip: "le deja el carril a oscuras" },
];
// Huevos de la tienda: se pagan con huevos bonus recogidos en los mapas y dan skins que solo salen de ellos.
// odds = probabilidad de cada nivel de skin (1 = común, 2 = rara, 3 = legendaria)
const EGG_TYPES = [
  { id: "arena",    name: "Huevo de arena",   price: 15, odds: [0.7, 0.25, 0.05], pal: { o: "#5a3a1a", c: "#e9c48a", w: "#fff1d0", m: "#b07a3a" } },
  { id: "cristal",  name: "Huevo de cristal", price: 40, odds: [0.3, 0.5, 0.2],   pal: { o: "#1e2a5a", c: "#8fd3ff", w: "#ffffff", m: "#b07cf0" } },
  { id: "dorado",   name: "Huevo dorado",     price: 80, odds: [0, 0.4, 0.6],     pal: { o: "#5a3a00", c: "#ffc629", w: "#fff6c0", m: "#ff8c00" } },
];
const EGG_TIER_NAMES = ["", "Huevo común", "Huevo raro", "Huevo legendario"];
const EGG_SKINS = [
  { id: "cascaron", name: "Cascarón", tier: 1, sprite: "raptor-spots",
    pal: { o: "#3a2412", b: "#f3e2b8", s: "#d8c090", l: "#fffdf2", a: "#fff6e0", x: "#8a5a2a", y: "#e6dcc0", e: "#ffffff", p: "#3a2412" }, bg: "#fff6e0", ground: "#c8a06a" },
  { id: "musgo-pantano", name: "Musgo de pantano", tier: 1, sprite: "raptor",
    pal: { o: "#0e1a14", b: "#2f6a5a", s: "#1f4a3e", l: "#6ac0a0", a: "#a8c890", x: "#1f4a3e", y: "#d8e0b0", e: "#ffe14d", p: "#0e1a14" }, bg: "#e0f0e0", ground: "#2f6a5a" },
  { id: "coral-rosado", name: "Coral rosado", tier: 1, sprite: "raptor-spots",
    pal: { o: "#3a0e1e", b: "#ff8aa8", s: "#d85a80", l: "#ffd0dc", a: "#fff0d8", x: "#2aa8a8", y: "#ffe8c0", e: "#ffffff", p: "#3a0e1e" }, bg: "#fff0f4", ground: "#2aa8a8" },
  { id: "opalo", name: "Ópalo", tier: 2, sprite: "raptor-crystal",
    pal: { o: "#2a2440", b: "#e8e0ff", s: "#b8b0e0", l: "#ffffff", a: "#fff0f8", x: "#9ad8ff", y: "#ffe0f0", e: "#ff8fd8", p: "#2a2440" }, bg: "#2a2440", ground: "#9ad8ff",
    fx: { anim: { type: "twinkle", key: "x", colors: ["#9ad8ff", "#ffd0f0", "#fff6b0", "#c8ffd8"] }, label: "Brillos de ópalo" } },
  { id: "medusa", name: "Medusa", tier: 2, sprite: "raptor-stars",
    pal: { o: "#0a1a3a", b: "#7df9ff", s: "#3ac0e0", l: "#e0ffff", a: "#c8f8ff", x: "#ff7ad0", y: "#e0ffff", e: "#ffffff", p: "#0a1a3a" }, bg: "#04203a", ground: "#7df9ff",
    fx: { anim: { type: "ghost" }, label: "Flota como una medusa" } },
  { id: "magma-negro", name: "Magma negro", tier: 2, sprite: "raptor-cracks",
    pal: { o: "#050308", b: "#1e1428", s: "#120a18", l: "#3a2a4a", a: "#2a1a30", x: "#ff3b8a", y: "#ffb0d8", e: "#ff3b8a", p: "#050308" }, bg: "#120a18", ground: "#ff3b8a",
    fx: { anim: { type: "pulse", key: "x", colors: ["#ff3b8a", "#c04bff", "#ff8ac0", "#c04bff"] }, label: "Grietas de magma morado" } },
  { id: "dragon-jade", name: "Dragón de jade", tier: 3, sprite: "raptor-flame",
    pal: { o: "#04140c", b: "#2ac07a", s: "#1a8a54", l: "#a0ffd0", a: "#e0ffe8", x: "#ffe14d", y: "#e0ffe8", e: "#ffe14d", p: "#04140c" }, bg: "#04140c", ground: "#2ac07a",
    fx: { anim: { type: "pulse", key: "x", colors: ["#ffe14d", "#a0ffd0", "#2ac07a", "#a0ffd0"] }, trail: { type: "fire", colors: ["#e0ffe8", "#a0ffd0", "#2ac07a", "#1a8a54"] }, label: "Estela de fuego de jade" } },
  { id: "aurora", name: "Aurora", tier: 3, sprite: "raptor-frost",
    pal: { o: "#08142c", b: "#3ddc84", s: "#2aa86a", l: "#c8ffe0", a: "#e0f8ff", x: "#8a5cff", y: "#e0f8ff", e: "#41e1ff", p: "#08142c" }, bg: "#08142c", ground: "#3ddc84",
    fx: { anim: { type: "twinkle", key: "x", colors: ["#3ddc84", "#41e1ff", "#8a5cff", "#ffffff"] }, trail: { type: "snow", colors: ["#3ddc84", "#41e1ff", "#8a5cff"] }, label: "Estela de aurora boreal" } },
  { id: "nebulosa", name: "Nebulosa", tier: 3, sprite: "raptor-stars",
    pal: { o: "#0a0420", b: "#5a2a9a", s: "#3a1a6a", l: "#ff8fd8", a: "#c8a0ff", x: "#ffffff", y: "#ffd0f0", e: "#ffffff", p: "#0a0420" }, bg: "#0a0420", ground: "#ff8fd8",
    fx: { anim: { type: "twinkle", key: "x", colors: ["#ffffff", "#ff8fd8", "#5ce1ff", "#ffe14d"] }, trail: { type: "stars", colors: ["#ffffff", "#ff8fd8", "#5ce1ff", "#c8a0ff"] }, label: "Estela de estrellas" } },
].map(k => Object.assign(k, { rarity: EGG_TIER_NAMES[k.tier], price: 0, exclusive: true, egg: true }));
const RARITY_COLORS = { "Huevo común": "#f3e2b8", "Huevo raro": "#8fd3ff", "Huevo legendario": "#ffc629", "Común": "#d6d3cb", "Raro": "#9cc9ff", "Épico": "#c9a6ff", "Legendario": "#ffd23f", "Supremo": "#ff9de6", "Exclusiva": "#ff8a8a", "Diseño": "#9be07a", "Pase": "#ff5ce1" };

// =====================================================================
//  DifficultyMode: valores de cada modo (Normal / Fácil / Difícil) leídos de CONFIG
// =====================================================================
class DifficultyMode {
  constructor(id) {
    const M = id === "easy" ? CONFIG.EASY : id === "hard" ? CONFIG.HARD : null, v = (k, def) => M && M[k] !== undefined ? M[k] : def;
    this.id = id; this.name = id === "easy" ? "Fácil" : id === "hard" ? "Difícil" : id === "random" ? "Aleatorio" : "Normal";
    this.label = "MODO " + this.name.toUpperCase();
    this.startSpeedMult = v("START_SPEED_MULT", 1);
    this.speedPerLevel = v("SPEED_PER_LEVEL", CONFIG.SPEED_PER_LEVEL);
    this.gapMult = v("GAP_MULT", 1);
    this.bothLanesLevel = v("BOTH_LANES_LEVEL", CONFIG.BOTH_LANES_LEVEL);
    this.fastBirdLevel = v("FAST_BIRD_LEVEL", CONFIG.FAST_BIRD_LEVEL);
    this.lives = v("LIVES", 1);
    this.hitInvuln = v("HIT_INVULN", CONFIG.HIT_GRACE);
    this.powerupChanceMult = v("POWERUP_CHANCE_MULT", 1);
    this.powerupDurMult = v("POWERUP_DURATION_MULT", 1);
    this.roarCooldown = v("ROAR_COOLDOWN", CONFIG.ROAR_COOLDOWN);
    this.bossHpMult = v("BOSS_HP_MULT", 1);
    this.bossSpeedMult = v("BOSS_SPEED_MULT", 1);
    this.bossVulnTime = v("BOSS_VULN_TIME", CONFIG.BOSS_VULN_TIME);
    this.bossTeleMult = v("BOSS_TELEGRAPH_MULT", 1);
    this.bossFuryAt = v("BOSS_FURY_AT", CONFIG.BOSS_FURY_AT);
    this.coinValue = v("COIN_VALUE", 1);
  }
  // Los patrones de nivel ≥ 3 (ambos carriles y más difíciles) se retrasan en Fácil y se adelantan en Difícil
  patternLevel(p) { return p.lvl >= CONFIG.BOTH_LANES_LEVEL ? Math.max(CONFIG.BOTH_LANES_LEVEL - 1, p.lvl + (this.bothLanesLevel - CONFIG.BOTH_LANES_LEVEL)) : p.lvl; }
  powerupDur(type) { return POWERUPS[type].dur() * this.powerupDurMult; }
}
const MODES = { normal: new DifficultyMode("normal"), easy: new DifficultyMode("easy"), hard: new DifficultyMode("hard"), random: new DifficultyMode("random") };


// =====================================================================
//  FURIA, MONTURAS, ROGUELIKE Y ÁRBOL — constantes de balance (todos son valores de partida)
// =====================================================================
const FURY_CONFIG = {
  MAX: 100,                 // barra llena
  PASS: 1.5,                // cada obstáculo superado limpiamente (equilibrio: ~1 súper rugido por minuto jugando bien)
  NEAR_MISS: 15,            // esquivar por los pelos (menos de NEAR_MISS_PX)
  NEAR_MISS_PX: 12,
  EGG: 30,                  // recoger un huevo
  ROAR_KILL: 12,            // cada obstáculo destruido con el rugido
  BOSS_HIT: 10,             // dañar a un boss
  DECAY_AFTER: 15,          // s sin sumar furia antes de empezar a vaciarse
  DECAY_RATE: 3,            // puntos por segundo al vaciarse
};

// --- Rendimiento ---
const RENDER = {
  MAX_PX: 2880,             // ancho máximo del lienzo en píxeles reales (resolución nativa hasta 4K)
  MENU_MAX_PX: 3840,        // ancho máximo del fondo animado de la portada
  LEVELS: [1, 0.8],         // calidad automática: como mucho baja al 80 % (antes llegaba al 50 % y se veía peor)
  SAMPLE: 120,              // fotogramas por medición
  SLOW_MS: 28,              // solo baja si va de verdad lento (< ~36 fps)…
  SLOW_RUNS: 3,             // …durante 3 mediciones seguidas (así no se activa con pantallas a 30/50 Hz o tirones puntuales)
  FAST_MS: 20,              // y vuelve a la máxima calidad en cuanto puede
  UP_AFTER: 2,
};

// --- Monturas (una por bioma). duration en s; speed = multiplicador de la velocidad del juego ---
const MOUNT_CONFIG = {
  CHANCE: 0.75,             // probabilidad de que aparezca una montura en un nivel (equilibrio: 0,6 → 0,75; el jefe a mitad de nivel deja poco hueco)
  WINDOW: [0.15, 0.75],     // tramo del nivel en el que puede aparecer
  BOSS_MARGIN: 300,         // puntos antes de un boss en los que nunca aparece
  CLEAR_PX: 150,            // px libres antes y después del icono
  MOUNT_INVULN: 0.3,        // s invencible al montarse
  END_INVULN: 1,            // s invencible al bajarse por tiempo
  HIT_INVULN: 1.5,          // s invencible al perderla por un golpe
  EASY_DURATION_MULT: 1.5,  // modo Fácil: duran un 50 % más
  EASY_WARN_MULT: 1.5,      // y los avisos de sus obstáculos especiales duran un 50 % más
  WARN_TIME: 0.9,           // s de aviso de los obstáculos especiales (cocodrilos, chorros, olas, tiburones…)
  mounts: {
    desert:    { id: "board",    name: "Tabla de arena",   duration: 8,  speed: 1.4, control: "W salta largo · S agacharse",          roar: true,  icon: "#e9c48a" },
    jungle:    { id: "log",      name: "Tronco por el río", duration: 8, speed: 1,   control: "W salta · arrolla lo pequeño",          roar: true,  icon: "#8a5a2a" },
    volcano:   { id: "lavarock", name: "Roca flotante",    duration: 8,  speed: 1,   control: "W sube · S baja",                       roar: true,  icon: "#ff6a1a" },
    glacier:   { id: "sled",     name: "Trineo",           duration: 8,  speed: 1.6, control: "¡No se puede frenar! Monedas ×2",       roar: true,  icon: "#c4e4f6" },
    night:     { id: "meteor",   name: "Meteorito domado", duration: 6,  speed: 1.6, control: "Lo destruye todo · W al final: ¡SALTA!", roar: false, icon: "#ff8a2a" },
    beach:     { id: "turtle",   name: "Tortuga gigante",  duration: 10, speed: 0.7, control: "S para esconderte",                     roar: true,  icon: "#3aa878" },
    mushroom:  { id: "shroom",   name: "Seta saltarina",   duration: 8,  speed: 1,   control: "Rebota sola · W más alto · S corta",    roar: true,  icon: "#ff7ad0" },
    ocean:     { id: "dolphin",  name: "Delfín",           duration: 8,  speed: 1,   control: "W salto alto · S para bucear",          roar: "surface", icon: "#5ab0e8" },
    graveyard: { id: "coffin",   name: "Ataúd con ruedas", duration: 8,  speed: 1.2, control: "S frena · atraviesa fantasmas",         roar: true,  icon: "#6a4a3a" },
    moon:      { id: "rocket",   name: "Cohete",           duration: 8,  speed: 1,   control: "W impulso hacia arriba",                roar: true,  icon: "#ff3b5c" },
  },
  BOARD_JUMP: 0.846, BOARD_GRAVITY: 0.651,   // salto un 30 % más largo y un 10 % más alto
  BOARD_TRICK_COINS: 5,
  SLED_LANE_TIME: 0.35, SLED_JUMP: 0.8, SLED_COIN_MULT: 2,
  METEOR_HEIGHT: 60, METEOR_JUMP_WINDOW: [0.25, 0.85], METEOR_PERFECT_COINS: 50, METEOR_PERFECT_FURY: 30,
  TURTLE_JUMP: 0.75, TURTLE_HIDE: 1, TURTLE_HIDE_CD: 3,
  SHROOM_BOUNCE: 860, SHROOM_HOLD_GRAVITY: 0.6,  SHROOM_STOMP_COINS: 10,
  DOLPHIN_ARC: 520, DOLPHIN_JUMP: 1000, DOLPHIN_DIVE_MAX: 2, DOLPHIN_DIVE_CD: 1, DOLPHIN_DEPTH: 46,
  COFFIN_BRAKE: 0.6, COFFIN_JUMP: 0.75,
  ROCKET_GRAVITY: 0.4, ROCKET_IMPULSE: 520, ROCKET_CEIL: 240, ROCKET_STUN: 0.6,
  LAVA_MAX_Y: 180, LAVA_SPEED: 320, LAVA_SINK: 90,
};

// --- Roguelike: mejoras temporales por partida ---
// rareza: comun · rara · epica · legendaria. mod[stat](valor, nivel) devuelve el valor modificado.
const ROGUE_CONFIG = {
  RARITY_ODDS: { comun: 0.60, rara: 0.28, epica: 0.10, legendaria: 0.02 },
  ODDS_PER_BOSS: { comun: -0.02, epica: 0.01, legendaria: 0.01 },   // por cada jefe derrotado en la partida
  MIN_COMMON: 0.30,
  LEGENDARY_AFTER_BOSSES: 2,
  CARDS: 3, EGG_CARDS: 2,
  REROLL_BASE: 50,          // barajar: 50, 100, 200… (se duplica)
  REROLL_FLAT: 30,          // con Tarifa plana
  SKIP_COINS: 100,          // saltar la elección
  ALTAR_CHANCE: 0.25,       // probabilidad de altar de ámbar por nivel
  MAX_PACTS: 2,
  CHECKPOINT_PICKS_PER: 2,  // 1 elección gratis por cada 2 niveles saltados con un checkpoint
  RARITY: {
    comun:      { name: "Común",      color: "#b3a7cc" },
    rara:       { name: "Rara",       color: "#5fb4ff" },
    epica:      { name: "Épica",      color: "#9b5cff" },
    legendaria: { name: "Legendaria", color: "#ffb938" },
  },
  // Topes (equilibrio): ninguna combinación de mejoras, pactos y árbol puede pasar de aquí
  CAPS: { coinMult: 3, critChance: 0.45, roarRangeMult: 2, furyRate: 3.5, eggMult: 3, bossHearts: 4, bossHpMultMin: 0.6, mountDurAdd: 6 },
  CATS: { roar: "Rugido", move: "Movimiento", def: "Defensa", power: "Power-ups y furia", eco: "Economía", boss: "Jefes", mount: "Monturas", egg: "Huevos", legend: "Legendarias" },
};
const pctS = v => `${Math.round(v * 100)} %`;
const UPGRADES = [
  // Rugido
  { id: "rugido-amplio", name: "Rugido amplio", rarity: "comun", cat: "roar", max: 3, desc: l => `+${20 * l} % de alcance del rugido`, mod: { roarRange: (v, l) => v * (1 + 0.2 * l) } },
  { id: "garganta-hierro", name: "Garganta de hierro", rarity: "comun", cat: "roar", max: 3, desc: l => `−${fmtNum(0.75 * l)} s de recarga del rugido (mín. 2 s)`, mod: { roarCooldown: (v, l) => Math.max(2, v - 0.75 * l) } },
  { id: "rugido-doble", name: "Rugido doble", rarity: "rara", cat: "roar", desc: () => "El rugido sale hacia delante y hacia atrás", mod: { roarBack: () => 1 } },
  { id: "eco", name: "Eco", rarity: "rara", cat: "roar", desc: () => "El rugido se repite 0,5 s después con la mitad de alcance", mod: { roarEcho: () => 1 } },
  { id: "rugido-carril", name: "Rugido de carril", rarity: "epica", cat: "roar", desc: () => "El rugido también llega al otro carril (con el 60 % del alcance)", mod: { roarBothLanes: () => 1 } },
  { id: "rugido-cortante", name: "Rugido cortante", rarity: "epica", cat: "roar", desc: () => "El rugido también destruye cactus y obstáculos de suelo bajos (no los altos)", mod: { roarCactus: () => 1 } },
  // Movimiento
  { id: "patas-ligeras", name: "Patas ligeras", rarity: "comun", cat: "move", max: 2, desc: l => `+${10 * l} % de altura de salto`, mod: { jumpMult: (v, l) => v * (1 + 0.1 * l) } },
  { id: "triple-salto", name: "Triple salto", rarity: "rara", cat: "move", desc: () => "Un salto extra en el aire", mod: { airJumps: v => v + 1 } },
  { id: "planeo", name: "Planeo", rarity: "rara", cat: "move", desc: () => "Mantén W tras el último salto para caer despacio 1,5 s", mod: { glide: () => 1 } },
  { id: "deslizamiento-largo", name: "Deslizamiento largo", rarity: "comun", cat: "move", desc: () => "El deslizamiento dura el doble y pasar deslizándote bajo un pájaro da +10 de furia", mod: { slideMult: v => v * 2, slideFury: () => 10 } },
  { id: "cambio-fantasma", name: "Cambio fantasma", rarity: "rara", cat: "move", desc: () => "Eres invencible mientras cambias de carril", mod: { laneGhost: () => 1 } },
  { id: "pisoton-sismico", name: "Pisotón sísmico", rarity: "epica", cat: "move", desc: () => "La caída rápida lanza una onda al aterrizar que destruye los obstáculos bajos cercanos", mod: { stompWave: () => 1 } },
  // Defensa
  { id: "piel-dura", name: "Piel dura", rarity: "rara", cat: "def", max: 2, desc: l => `Empiezas cada combate de jefe con +${l} corazón${l > 1 ? "es" : ""}`, mod: { bossHearts: (v, l) => v + l } },
  { id: "segunda-oportunidad", name: "Segunda oportunidad", rarity: "epica", cat: "def", desc: () => "La primera vez que perderías, sobrevives con 2 s de invencibilidad", mod: { secondChance: v => v + 1 } },
  { id: "escudo-inicial", name: "Escudo inicial", rarity: "comun", cat: "def", desc: () => "Al empezar cada nivel recibes un escudo de 3 s", mod: { startShield: v => Math.max(v, 3) } },
  { id: "esquiva-perfecta", name: "Esquiva perfecta", rarity: "rara", cat: "def", desc: () => "Esquivar por los pelos da 0,5 s de invencibilidad", mod: { nearMissInvuln: () => 0.5 } },
  // Power-ups y furia
  { id: "powerups-duraderos", name: "Power-ups duraderos", rarity: "comun", cat: "power", max: 3, desc: l => `+${20 * l} % de duración de los power-ups`, mod: { powerupDurMult: (v, l) => v * (1 + 0.2 * l) } },
  { id: "iman-natural", name: "Imán natural", rarity: "rara", cat: "power", desc: () => "Imán permanente de corto alcance (la mitad que el power-up)", mod: { naturalMagnet: () => CONFIG.MAGNET_RADIUS / 2 } },
  { id: "furia-rapida", name: "Furia rápida", rarity: "comun", cat: "power", max: 2, desc: l => `La furia se llena un ${25 * l} % más rápido`, mod: { furyRate: (v, l) => v * (1 + 0.25 * l) } },
  { id: "furia-eterna", name: "Furia eterna", rarity: "epica", cat: "power", desc: () => "La barra de furia ya no se vacía con el tiempo y se llena un 15 % más rápido", mod: { furyNoDecay: () => 1, furyRate: v => v * 1.15 } },
  { id: "doble-super", name: "Doble súper rugido", rarity: "legendaria", cat: "power", desc: () => "Con la barra llena, el súper rugido se puede usar dos veces", mod: { superRoarUses: () => 2 } },
  // Economía
  { id: "bolsillos-grandes", name: "Bolsillos grandes", rarity: "comun", cat: "eco", max: 3, desc: l => `+${10 * l} % de monedas`, mod: { coinMult: (v, l) => v * (1 + 0.1 * l) } },
  { id: "huevos-dorados", name: "Huevos dorados", rarity: "rara", cat: "eco", desc: () => "Los huevos bonus valen el doble", mod: { eggMult: v => v * 2 } },
  { id: "interes", name: "Interés", rarity: "rara", cat: "eco", desc: () => "Al pasar de nivel ganas un 5 % de tus monedas de la partida (máx. 100)", mod: { interest: () => 0.05, interestCap: () => 100 } },
  { id: "tarifa-plana", name: "Tarifa plana", rarity: "comun", cat: "eco", desc: () => "Barajar de nuevo cuesta siempre 30", mod: { rerollFlat: () => 1 } },
  { id: "tesoro-jefe", name: "Tesoro del jefe", rarity: "epica", cat: "eco", desc: () => "Los jefes dan un 50 % más de monedas", mod: { bossCoinMult: v => v * 1.5 } },
  // Jefes
  { id: "ojo-cazador", name: "Ojo de cazador", rarity: "comun", cat: "boss", desc: () => "Las ventanas de vulnerabilidad de los jefes duran un 50 % más", mod: { bossVulnMult: v => v * 1.5 } },
  { id: "golpe-critico", name: "Golpe crítico", rarity: "rara", cat: "boss", desc: () => "Cada golpe al jefe tiene un 20 % de quitar el doble", mod: { critChance: v => Math.max(v, 0.2) } },
  { id: "calma", name: "Calma", rarity: "rara", cat: "boss", desc: () => "La forma furiosa de los jefes empieza al 30 % de vida", mod: { bossFuryAt: v => Math.min(v, 0.3) } },
  { id: "presa-facil", name: "Presa fácil", rarity: "epica", cat: "boss", desc: () => "Los jefes empiezan con un 20 % menos de vida", mod: { bossHpMult: v => v * 0.8 } },
  // Monturas
  { id: "jinete-experto", name: "Jinete experto", rarity: "comun", cat: "mount", max: 2, desc: l => `Las monturas duran +${2 * l} s`, mod: { mountDurAdd: (v, l) => v + 2 * l } },
  { id: "establo", name: "Establo", rarity: "rara", cat: "mount", desc: () => "Siempre aparece una montura en cada nivel", mod: { mountChance: () => 1 } },
  { id: "montura-blindada", name: "Montura blindada", rarity: "epica", cat: "mount", desc: () => "La montura aguanta un golpe antes de perderse", mod: { mountArmor: v => v + 1 } },
  // Huevos (el rival no existe en este juego: «Pies de liebre» se cambia por una de huevos)
  { id: "nido-dorado", name: "Nido dorado", rarity: "comun", cat: "egg", desc: () => "Cada huevo recogido llena también la furia al máximo", mod: { eggFullFury: () => 1 } },
  { id: "olfato-nido", name: "Olfato de nido", rarity: "rara", cat: "egg", desc: () => "Una flecha señala el siguiente huevo y los huevos valen un 50 % más", mod: { eggArrow: () => 1, eggMult: v => v * 1.5 } },
  // Legendarias
  { id: "corazon-trex", name: "Corazón de T-Rex", rarity: "legendaria", cat: "legend", desc: () => "+1 corazón en jefes, rugido con un 50 % más de alcance y que destruye cactus bajos", mod: { bossHearts: v => v + 1, roarRange: v => v * 1.5, roarCactus: () => 1 } },
  { id: "raptor-tiempo", name: "Raptor del tiempo", rarity: "legendaria", cat: "legend", desc: () => "Cámara lenta de 1 s cuando un obstáculo está a punto de golpearte (recarga 15 s)", mod: { timeRaptor: () => 1 } },
  { id: "midas", name: "Midas", rarity: "legendaria", cat: "legend", desc: () => "Todas las monedas valen el doble, pero el imán ya no funciona", mod: { coinMult: v => v * 2, midas: () => 1 } },
  { id: "manada-fantasma", name: "Manada fantasma", rarity: "legendaria", cat: "legend", desc: () => "Dos raptores fantasma corren delante y destruyen el primer obstáculo que tocan cada 8 s", mod: { ghostPack: () => 1 } },
];
// Sinergias: se activan solas al tener todas sus piezas
const SYNERGIES = [
  { id: "tormenta", name: "Tormenta", need: [["rugido-doble", 1], ["eco", 1]], desc: "El eco también sale en las dos direcciones", mod: { roarEchoBack: () => 1 } },
  { id: "bailarin", name: "Bailarín", need: [["triple-salto", 1], ["planeo", 1]], desc: "Cada salto en el aire da +2 monedas", mod: { airJumpCoins: () => 2 } },
  { id: "fortaleza", name: "Fortaleza", need: [["piel-dura", 1], ["escudo-inicial", 1]], desc: "El escudo inicial dura 6 s", mod: { startShield: () => 6 } },
  { id: "avaricia", name: "Avaricia", need: [["bolsillos-grandes", 3], ["interes", 1]], desc: "El interés sube al 10 % (máx. 200)", mod: { interest: () => 0.1, interestCap: () => 200 } },
  { id: "cazador-nato", name: "Cazador nato", need: [["ojo-cazador", 1], ["golpe-critico", 1]], desc: "El crítico sube al 35 %", mod: { critChance: v => Math.max(v, 0.35) } },
  { id: "furia-imparable", name: "Furia imparable", need: [["furia-rapida", 2], ["furia-eterna", 1]], desc: "El súper rugido además da 2 s de turbo", mod: { superRoarTurbo: () => 2 } },
  { id: "domador", name: "Domador", need: [["jinete-experto", 2], ["montura-blindada", 1]], desc: "Al bajar de una montura ganas un escudo de 3 s", mod: { mountEndShield: () => 3 } },
];
// Pactos del altar de ámbar: ventaja fuerte con desventaja para toda la partida
const PACTS = [
  { id: "pacto-sangre", name: "Pacto de sangre", good: "+2 corazones en los jefes", bad: "El escudo (power-up) ya no aparece", mod: { bossHearts: v => v + 2, noShieldPowerup: () => 1 } },
  { id: "pacto-oro", name: "Pacto del oro", good: "Monedas ×1,6", bad: "Los obstáculos aparecen un 25 % más a menudo", mod: { coinMult: v => v * 1.6, obstacleFreq: v => v * 1.25 } },
  { id: "pacto-bestia", name: "Pacto de la bestia", good: "Rugido casi sin recarga (1 s)", bad: "Los jefes tienen un 30 % más de vida", mod: { roarNoCd: () => 1, bossHpMult: v => v * 1.3 } },
  { id: "pacto-prisa", name: "Pacto de la prisa", good: "Puntuación ×1,25", bad: "El juego va un 20 % más rápido y pierdes el doble salto", mod: { speedMult: v => v * 1.2, scoreMult: v => v * 1.25, noDoubleJump: () => 1 } },
  { id: "pacto-silencio", name: "Pacto del silencio", good: "La furia se llena 2,5 veces más rápido", bad: "El rugido normal desaparece (solo queda el súper rugido)", mod: { furyRate: v => v * 2.5, noRoar: () => 1 } },
  { id: "pacto-jinete", name: "Pacto del jinete", good: "Monturas en cada nivel y duran el doble", bad: "Sin montura vas un 10 % más lento", mod: { mountChance: () => 1, mountDurMult: v => v * 2, unmountedSpeed: v => v * 0.9 } },
];

// --- Árbol de mejoras permanentes (se paga con fósiles) ---
const TREE_CONFIG = {
  FOSSILS: { LEVEL: 2, BOSS: 3, BOSS_CORRUPT: 5, BOSS_GOLD: 8, SYNERGY: 2, RECORD: 5, EASY_MULT: 0.5 },   // equilibrio: ~20–30 partidas buenas para completar el árbol
  RESET_COST: 500,          // monedas para reiniciar el árbol (la primera vez es gratis)
  branches: [
    { id: "superv", name: "Supervivencia", color: "#5fd15a", nodes: [
      { id: "escamas", name: "Escamas", max: 3, cost: [3, 6, 10], desc: l => `+${8 * l} % de duración del escudo y de la invencibilidad`, mod: { graceMult: (v, l) => v * (1 + 0.08 * l) } },
      { id: "corazon-extra", name: "Corazón extra", max: 1, cost: [22], desc: () => "+1 corazón en los combates de jefe", mod: { bossHearts: v => v + 1 } },
      { id: "instinto", name: "Instinto", max: 2, cost: [8, 14], desc: l => `Los avisos de jefes y obstáculos especiales duran +${10 * l} %`, mod: { teleMult: (v, l) => v * (1 + 0.1 * l) } },
      { id: "resurreccion", name: "Resurrección", max: 1, cost: [30], desc: () => "Una vez por partida, al morir revives con 2 s de invencibilidad", mod: { resurrection: () => 1 } },
    ] },
    { id: "poder", name: "Poder", color: "#ff9a3c", nodes: [
      { id: "pulmones", name: "Pulmones", max: 3, cost: [3, 6, 10], desc: l => `−${fmtNum(0.3 * l)} s de recarga del rugido`, mod: { roarCooldown: (v, l) => Math.max(2, v - 0.3 * l) } },
      { id: "furia-innata", name: "Furia innata", max: 2, cost: [6, 12], desc: l => `Empiezas con la furia al ${25 * l} %`, mod: { furyStart: (v, l) => 0.25 * l } },
      { id: "garras", name: "Garras", max: 2, cost: [10, 18], desc: l => `+${7 * l} % de probabilidad de golpe doble a los jefes`, mod: { critChance: (v, l) => v + 0.07 * l } },
      { id: "despertar", name: "Despertar", max: 1, cost: [30], desc: () => "El primer súper rugido de cada partida no vacía la barra", mod: { despertar: () => 1 } },
    ] },
    { id: "fortuna", name: "Fortuna", color: "#ffb938", nodes: [
      { id: "ojo-brillo", name: "Ojo para el brillo", max: 3, cost: [3, 6, 10], desc: l => `+${5 * l} % de monedas`, mod: { coinMult: (v, l) => v * (1 + 0.05 * l) } },
      { id: "nido-seguro", name: "Nido seguro", max: 1, cost: [10], desc: () => "Los huevos aparecen 2 s más y no se pierden si te golpean cerca", mod: { eggSafe: () => 1 } },
      { id: "regateo", name: "Regateo", max: 2, cost: [8, 14], desc: l => `−${25 * l} % de coste al barajar cartas`, mod: { rerollDiscount: (v, l) => 0.25 * l } },
      { id: "racha-suerte", name: "Racha de suerte", max: 1, cost: [25], desc: () => "+1 giro gratis semanal en la ruleta", mod: { weeklySpin: () => 1 } },
    ] },
    { id: "destino", name: "Destino", color: "#9b5cff", nodes: [
      { id: "carta-extra", name: "Carta extra", max: 1, cost: [12], desc: () => "Las elecciones tras un jefe muestran 4 cartas", mod: { extraCard: () => 1 } },
      { id: "sangre-antigua", name: "Sangre antigua", max: 3, cost: [6, 10, 16], desc: l => `+${l} punto${l > 1 ? "s" : ""} de probabilidad de Épica y Legendaria`, mod: { rarityBonus: (v, l) => 0.01 * l } },
      { id: "domador-arbol", name: "Domador", max: 2, cost: [6, 12], desc: l => `Las monturas duran +${fmtNum(1.5 * l)} s`, mod: { mountDurAdd: (v, l) => v + 1.5 * l } },
      { id: "elegido", name: "Elegido", max: 1, cost: [35], desc: () => "Empiezas cada partida con una mejora Común aleatoria", mod: { chosenStart: () => 1 } },
    ] },
  ],
};

// --- Modo Aleatorio: dificultad Normal + una regla sorpresa distinta en cada nivel ---
const RANDOM_MODS = [
  { id: "luna", name: "Gravedad lunar", icon: "🌙", desc: "Saltas más alto y caes despacio", mod: { gravityMult: v => v * 0.55, jumpMult: v => v * 0.8 } },
  { id: "turbo", name: "Turbo loco", icon: "⚡", desc: "Todo va un 30 % más rápido · puntos ×1,3", mod: { speedMult: v => v * 1.3, scoreMult: v => v * 1.3 } },
  { id: "oro", name: "Lluvia de oro", icon: "🪙", desc: "Monedas ×2", mod: { coinMult: v => v * 2 } },
  { id: "rugido", name: "Rugido infinito", icon: "📢", desc: "El rugido recarga en 1,2 s", mod: { roarCooldown: () => 1.2 } },
  { id: "furia", name: "Furia desatada", icon: "🔥", desc: "La furia se llena el triple de rápido", mod: { furyRate: v => v * 3 } },
  { id: "estampida", name: "Estampida", icon: "🐢", desc: "Montura asegurada y dura un 50 % más", mod: { mountChance: () => 1, mountDurMult: v => v * 1.5 } },
  { id: "niebla", name: "Niebla", icon: "🌫️", desc: "Ves menos por delante · puntos ×1,25", mod: { fog: () => 1, scoreMult: v => v * 1.25 } },
  { id: "cruzados", name: "Carriles cruzados", icon: "🔀", desc: "A y D están intercambiadas", mod: { swapLanes: () => 1, scoreMult: v => v * 1.15 } },
  { id: "regalos", name: "Lluvia de power-ups", icon: "🎁", desc: "Salen el triple de power-ups", mod: { powerupFreq: v => v * 3 } },
  { id: "pluma", name: "Pies de pluma", icon: "🪶", desc: "Triple salto y saltos un 15 % más altos", mod: { airJumps: v => v + 1, jumpMult: v => v * 1.15 } },
  { id: "caos", name: "Caos", icon: "🌀", desc: "Obstáculos un 30 % más a menudo · puntos ×1,4", mod: { obstacleFreq: v => v * 1.3, scoreMult: v => v * 1.4 } },
  { id: "paseo", name: "Paseo", icon: "🌼", desc: "Un 20 % más lento · monedas ×1,5", mod: { speedMult: v => v * 0.8, coinMult: v => v * 1.5 } },
];

// --- Código secreto ---
const SECRET_CODE = "P1kach0$6767";
function unlockAllUpgrades(g) {
  const s = g.save.data;
  for (const n of TREE_NODES) s.tree[n.id] = n.max;                                  // árbol de mejoras completo
  for (const h of HATS) if (!s.hats.includes(h.id)) s.hats.push(h.id);                // todos los accesorios, estelas, rugidos y mascotas
  for (const t of SHOP_TRAILS) if (!s.trails.includes(t.id)) s.trails.push(t.id);
  for (const r of SHOP_ROARS) if (!s.roars.includes(r.id)) s.roars.push(r.id);
  for (const p of PET_SPECIES) if (!s.pets.includes(p.id)) s.pets.push(p.id);
  for (const u of UPGRADES) s.album.ups[u.id] = 1;                                    // álbum completo
  for (const x of SYNERGIES) s.album.syn[x.id] = 1;
  for (const p of PACTS) s.album.pacts[p.id] = 1;
  s.codeUsed = true; s.allUpgrades = true;
  // …y TODO lo demás
  const ids = [...SKINS_DATA.skins.map(k => k.id), ...EXCLUSIVE_SKINS.map(k => k.id), ...EGG_SKINS.map(k => k.id), ...SEASON_SKINS.map(k => k.id)];
  for (const id of ids) if (!s.owned.includes(id)) s.owned.push(id);                 // todas las skins (tienda, logros, huevos y pase)
  s.editor = true;                                                                     // editor de skins
  s.completed = Math.max(s.completed, CONFIG.CHECKPOINT_LEVELS);                       // todos los checkpoints
  for (let l = 2; l <= CONFIG.CHECKPOINT_LEVELS; l++) if (!s.checkpoints.includes(l)) s.checkpoints.push(l);
  s.season = { id: SEASON_CONFIG.ID, xp: 0, tier: SEASON_CONFIG.TIERS, seen: SEASON_CONFIG.TIERS };   // pase completo
  const now = new Date().toISOString();
  for (const a of ACHIEVEMENTS) if (!s.ach.unlocked[a.id]) s.ach.unlocked[a.id] = now;  // todos los logros (sin avisos)
  s.bossesDefeated = [...new Set([...s.bossesDefeated, ...BOSS_IDS])];
  s.secretUnlocked = true;                                                             // nivel secreto siempre abierto
  s.tutorialDone = true;
  s.coins += 99999; s.eggWallet += 999; s.fossils += 999;                              // monedas, huevos y fósiles de sobra
  g.build.cache = {}; g.save.save();
}

// --- Pase de temporada (gratis, sin dinero real): se sube jugando ---
const SEASON_CONFIG = {
  ID: 1, NAME: "Temporada 1 · Era Prismática", TIERS: 30,
  XP_TIER: t => 180 + t * 12,           // XP para pasar del nivel t al t+1 (≈ 8 800 XP en total, unas 35–45 partidas)
  XP: { PER_POINTS: 8, BOSS: 50, LEVEL: 30, EGG: 15, SYNERGY: 20, VERSUS_PER_POINTS: 12 },   // XP = puntos / PER_POINTS + …
  MODE_MULT: { easy: 0.75, normal: 1, hard: 1.3, random: 1.15 },
};
// Recompensa de cada nivel del pase (1–30). Los niveles 10, 20 y 30 dan skins exclusivas.
function seasonReward(t) {
  if (t === 30) return { kind: "skin", id: "prisma-celestial" };
  if (t === 20) return { kind: "skin", id: "eclipse-prisma" };
  if (t === 10) return { kind: "skin", id: "cristal-temporada" };
  if (t % 5 === 0) return { kind: "eggs", n: 10 + t / 5 * 2 };
  if (t % 3 === 0) return { kind: "fossils", n: 4 + Math.floor(t / 6) };
  return { kind: "coins", n: 100 + t * 15 };
}
// Skins del pase (las tres mejores del juego; la del nivel 30 cambia de color, lleva accesorios, estela y rugido propios)
const SEASON_SKINS = [
  { id: "cristal-temporada", name: "Cristal de temporada", rarity: "Pase", season: 10, sprite: "raptor-crystal",
    pal: { o: "#1a1430", b: "#c8b8ff", s: "#8a78d8", l: "#ffffff", a: "#e0f0ff", x: "#7df9ff", y: "#ffd0f0", e: "#ff8fd8", p: "#1a1430" }, bg: "#1a1430", ground: "#7df9ff",
    fx: { anim: { type: "twinkle", key: "x", colors: ["#7df9ff", "#ffd0f0", "#fff6b0", "#c8ffd8", "#c8b8ff"] }, trail: { type: "sparkle", colors: ["#7df9ff", "#ffd0f0", "#ffffff"] }, label: "Cristal que destella y fragmento flotante" } },
  { id: "eclipse-prisma", name: "Eclipse prismático", rarity: "Pase", season: 20, sprite: "raptor-stars",
    pal: { o: "#000000", b: "#1a1030", s: "#0c0618", l: "#4a2a80", a: "#2a1a50", x: "#ff5ce1", y: "#ffd23f", e: "#ffd23f", p: "#000000" }, bg: "#05020c", ground: "#ff5ce1",
    fx: { anim: { type: "pulse", key: "x", colors: ["#ff5ce1", "#7b5cff", "#41e1ff", "#7b5cff"] }, trail: { type: "stars", colors: ["#ff5ce1", "#41e1ff", "#ffd23f", "#ffffff"] },
      echo: { colors: ["#ff5ce1", "#7b5cff", "#41e1ff"], alpha: [0.45, 0.3, 0.16], gap: 5, every: 1 }, label: "Corona de eclipse, ecos y estela de estrellas" } },
  { id: "prisma-celestial", name: "Prisma Celestial", rarity: "Pase", season: 30, sprite: "raptor-supreme", run: ["run1s", "run2s", "run3s", "run4s"],
    pal: { o: "#140a2e", b: "#ff5ce1", s: "#c03aa8", l: "#ffd8f8", a: "#41e1ff", x: "#fff6b0", y: "#7b5cff", e: "#ffffff", p: "#140a2e" }, bg: "#0c0620", ground: "#ffffff",
    fx: { label: "Cambia de color sin parar · halo, capa real y gemas en órbita · cinta arcoíris pegada a la cola" } },   // la cinta y las siluetas se dibujan en sus accesorios (siempre detrás)
];

