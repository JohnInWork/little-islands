/**
 * Ambient scenes — the dungeon getting on with its life while the hero watches.
 *
 * A scene is a moment, not a state: nobody fights it, nobody loots it, and it is
 * never written to the save. Walk out of the floor and back, and it is gone.
 *
 * Two things pull against each other here and both are deliberate:
 *
 * - **Scenes have to be rare.** One in five or six floors, and never two on the
 *   same floor. Something seen every corridor is scenery, not a surprise.
 * - **A rare unexplained thing reads as a bug.** So every scene says its own
 *   name, and every scene the player has ever witnessed is listed in the run
 *   records. A glitch does not turn up in a list of things you have seen.
 *
 * This module owns the catalogue, the roll and the choreography. It does not
 * know where the room is, what the sprites look like on screen, or how loud the
 * sound is: the adapter stages the scene inside a box it chooses and asks here,
 * frame by frame, who stands where.
 */

export const AMBIENT_VERSION = 1;

/**
 * Rarity, as two rolls on entering a floor: the eye first, the ear only if the
 * eye came up empty. Together they leave **five floors in six** with nothing at
 * all, which is about three scenes in a full run — few enough that seeing one is
 * worth telling somebody about, and few enough that a particular one stays rare
 * across whole runs.
 */
export const AMBIENT_SIGHT_CHANCE = 0.1;
export const AMBIENT_SOUND_CHANCE = 0.07;

/**
 * Never in the first seconds. A scene that greets you at the stairs reads as
 * scripted, and a scripted surprise is not one.
 */
export const AMBIENT_DELAY = Object.freeze({ min: 22, max: 95 });

/** What a scene needs from the floor before it can be staged at all. */
export const AMBIENT_NEEDS = Object.freeze(['none', 'room', 'lit', 'door', 'water']);

const scene = (definition) => Object.freeze({
  ...definition,
  phases: Object.freeze(definition.phases.map((phase) => Object.freeze({ ...phase }))),
  sprites: Object.freeze([...(definition.sprites ?? [])]),
  quarry: Object.freeze([...(definition.quarry ?? [])]),
  line: Object.freeze({ ...definition.line }),
});

/** Total seconds a scene lives, summed from its own phases. */
const spanOf = (phases) => phases.reduce((total, phase) => total + phase.seconds, 0);

/** Eased 0→1, so nothing starts or stops with a jerk. */
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** A fade that rises, holds and falls inside one phase. */
const breathe = (t, rise = 0.2, fall = 0.25) => {
  if (t < rise) return ease(t / rise);
  if (t > 1 - fall) return ease((1 - t) / fall);
  return 1;
};

export const AMBIENT_SCENES = Object.freeze([
  scene({
    id: 'ghost',
    kind: 'sight',
    needs: 'none',
    colour: '#9fb6d8',
    sound: 'ambient-hush',
    // Two shrouds, chosen by the floor. One player telling another what they saw
    // should not be able to describe it exactly.
    sprites: ['mon/undead/ghost.png', 'mon/undead/phantom.png'],
    phases: [{ id: 'drift', seconds: 7.5 }],
    line: { ru: 'Мимо проходит призрак', en: 'A ghost drifts past' },
  }),
  scene({
    id: 'bats',
    kind: 'sight',
    needs: 'room',
    colour: '#a79a86',
    sound: 'ambient-wings',
    sprites: ['mon/animals/bat.png'],
    phases: [{ id: 'flight', seconds: 3.6 }],
    line: { ru: 'Стая мышей прошивает комнату', en: 'Bats rip across the room' },
  }),
/*
 * Кто с кем дерётся.
 *
 * Стороны были одной кучей спрайтов, из которой брались двое подряд, — и в
 * дуэли уникальный торговец Джозеф добивал кобольда. Иван: «я бы хотел
 * заложить правило, что какой-то гуманоид, мыслящий — огр, орк, наёмник —
 * против какого-то животного: против волка, против вепря и так далее».
 *
 * Правило теперь в самой форме сцены: `sprites` — это те, кто побеждает, а
 * `quarry` — те, кого добивают. Смешаться они не могут, потому что берутся из
 * разных списков.
 *
 * Разница между дуэлью и потасовкой — размер участников: в первой сходятся
 * крупные, во второй мелочь. Иначе это была бы одна сцена с двумя таймингами.
 */
  scene({
    id: 'duel',
    kind: 'sight',
    needs: 'room',
    colour: '#c9a35e',
    sound: 'hit-blade',
    // Мыслящие: наёмник, орк-воин, огр.
    sprites: ['mon/unique/edmund.png', 'mon/orc_warrior.png', 'mon/ogre.png'],
    // Звери, которые им попались.
    quarry: ['mon/animals/wolf.png', 'derived/mon/boar.png', 'mon/animals/black_bear.png'],
    // He is already winning when you see him, and he leaves at once. A fight you
    // could join and cannot reach is a promise the game has no way to keep.
    /*
     * Уходит он бегом, а не уплывает.
     *
     * Уход занимал две с половиной секунды на две с половиной клетки — клетка
     * в секунду, вчетверо медленнее шага героя. Иван: «он не убежал быстро
     * куда-нибудь, чтобы игрок подумал, что это реально НПС, а просто улетел в
     * стену дешёвой анимацией». Те же клетки за восемь десятых — это уже бег,
     * и к концу его он успевает погаснуть в темноте, а не упереться в стену.
     */
    phases: [
      { id: 'fight', seconds: 3.4 },
      { id: 'kill', seconds: 1.1 },
      { id: 'flee', seconds: 0.8 },
    ],
    line: { ru: 'Кто-то добил своего и ушёл', en: 'Someone finished a kill and left' },
  }),
  scene({
    id: 'brawl',
    kind: 'sight',
    needs: 'room',
    colour: '#b0714d',
    sound: 'hit-blade',
    // Та же пара, только мельче: гоблин, гнолл, кобольд против мелкой живности.
    sprites: ['mon/goblin.png', 'mon/gnoll.png', 'mon/kobold.png'],
    quarry: ['mon/animals/jackal.png', 'mon/animals/wolf_spider.png', 'mon/animals/giant_newt.png'],
    phases: [
      { id: 'fight', seconds: 3.8 },
      { id: 'kill', seconds: 1.1 },
      { id: 'flee', seconds: 0.9 },
    ],
    line: { ru: 'Двое не поделили этаж', en: 'Two of them fell out over the floor' },
  }),
  scene({
    id: 'hauler',
    kind: 'sight',
    needs: 'room',
    colour: '#8c8f6d',
    sound: 'ambient-drag',
    sprites: ['mon/unique/urug.png', 'licensed/lpc-tavern/deco/basket.png'],
    // Четыре клетки за три секунды — шаг человека с ношей. Было шесть с
    // половиной, и это выглядело не «тащит», а «едет по стеклу».
    phases: [{ id: 'haul', seconds: 3 }],
    line: { ru: 'Кто-то уволок свою добычу', en: 'Something hauled its haul away' },
  }),
  scene({
    id: 'draught',
    kind: 'sight',
    needs: 'lit',
    colour: '#6f8fa0',
    sound: 'ambient-gust',
    sprites: [],
    // Four beats, and the third is the one Ivan asked for: the room sits in the
    // dark with smoke coming off dead wicks before anything relights.
    phases: [
      { id: 'gust', seconds: 0.55 },
      { id: 'out', seconds: 0.7 },
      { id: 'smoke', seconds: 4 },
      { id: 'relight', seconds: 1.5 },
    ],
    line: { ru: 'Сквозняк гасит огонь', en: 'A draught puts the fire out' },
  }),
  scene({
    id: 'cave-in',
    kind: 'sight',
    needs: 'none',
    colour: '#93877a',
    sound: 'ambient-rumble',
    sprites: [],
    phases: [
      { id: 'rumble', seconds: 0.9 },
      { id: 'fall', seconds: 1.3 },
      { id: 'settle', seconds: 1.8 },
    ],
    line: { ru: 'С потолка сыплется', en: 'The ceiling sheds' },
  }),
  scene({
    id: 'far-door',
    kind: 'sight',
    needs: 'door',
    colour: '#8f7f66',
    sound: 'door',
    sprites: [],
    phases: [{ id: 'swing', seconds: 3.2 }],
    line: { ru: 'Вдалеке сама открылась дверь', en: 'A door opened by itself' },
  }),
  scene({
    id: 'fireflies',
    kind: 'sight',
    needs: 'water',
    colour: '#c2d59a',
    sound: 'ambient-hush',
    // No sprite: a firefly is a moving point of light, and the game already
    // draws those. The library's only glow tile is a soft square and reads as
    // a smudge at this size.
    sprites: [],
    phases: [
      { id: 'gather', seconds: 3.2 },
      { id: 'hover', seconds: 4.5 },
      { id: 'scatter', seconds: 2.2 },
    ],
    line: { ru: 'Над водой собрались светляки', en: 'Fireflies gather over the water' },
  }),
  scene({
    id: 'scream',
    kind: 'sound',
    needs: 'none',
    colour: '#a86a6a',
    sound: 'ambient-scream',
    sprites: [],
    phases: [{ id: 'cry', seconds: 3 }],
    line: { ru: 'Где-то далеко кричат', en: 'Somebody screams, far off' },
  }),
  scene({
    id: 'steps',
    kind: 'sound',
    needs: 'none',
    colour: '#8d8d96',
    sound: 'ambient-steps',
    sprites: [],
    phases: [{ id: 'walk', seconds: 5.5 }],
    line: { ru: 'За стеной кто-то идёт рядом', en: 'Someone walks along, behind the wall' },
  }),
  scene({
    id: 'drip',
    kind: 'sound',
    needs: 'none',
    colour: '#7d93a0',
    sound: 'ambient-drip',
    sprites: [],
    phases: [{ id: 'echo', seconds: 5 }],
    line: { ru: 'В пустом коридоре капает', en: 'Water drips in an empty corridor' },
  }),
]);

const BY_ID = new Map(AMBIENT_SCENES.map((entry) => [entry.id, entry]));

export const AMBIENT_SCENE_IDS = Object.freeze(AMBIENT_SCENES.map(({ id }) => id));

export function ambientSceneById(id) {
  return BY_ID.get(id) ?? null;
}

/** Every sprite a scene can ask for, so the preloader fetches them once. */
export function allAmbientAssetPaths() {
  return Object.freeze([...new Set(AMBIENT_SCENES.flatMap(({ sprites }) => sprites))]);
}

/** Every sound a scene can ask for. */
export function allAmbientSoundIds() {
  return Object.freeze([...new Set(AMBIENT_SCENES.map(({ sound }) => sound).filter(Boolean))]);
}

export function ambientSceneDuration(id) {
  const entry = ambientSceneById(id);
  return entry ? spanOf(entry.phases) : 0;
}

// The roll is its own little generator rather than the run's: a floor must show
// the same scene every time it is rebuilt from the same seed, whatever else the
// game has drawn from the shared stream in between.
function rollValue(seed, depth, salt) {
  let value = (Math.imul(seed >>> 0, 0x9e3779b1) ^ Math.imul(depth + 1, 0x85ebca6b) ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 4294967296;
}

/**
 * At most one scene per floor, decided the moment the hero arrives.
 *
 * `possible` is the adapter's answer to "what could this floor actually stage" —
 * there is no point promising a draught where nothing is burning. Sights are
 * asked for first because they are the rarer and better prize; if the eye rolls
 * nothing, or the floor can stage no sight at all, the ear gets its turn.
 */
export function scheduleAmbientScene({ seed = 0, depth = 1, possible = [] } = {}) {
  if (!Number.isFinite(seed) || !Number.isFinite(depth)) return null;
  const staged = AMBIENT_SCENES.filter(({ id }) => possible.includes(id));
  if (staged.length === 0) return null;

  for (const [kind, chance, salt] of [['sight', AMBIENT_SIGHT_CHANCE, 11], ['sound', AMBIENT_SOUND_CHANCE, 29]]) {
    const pool = staged.filter((entry) => entry.kind === kind);
    if (pool.length === 0) continue;
    if (rollValue(seed, depth, salt) >= chance) continue;
    const chosen = pool[Math.floor(rollValue(seed, depth, salt + 1) * pool.length) % pool.length];
    const spread = AMBIENT_DELAY.max - AMBIENT_DELAY.min;
    return Object.freeze({
      id: chosen.id,
      kind: chosen.kind,
      at: AMBIENT_DELAY.min + rollValue(seed, depth, salt + 2) * spread,
      variant: Math.floor(rollValue(seed, depth, salt + 3) * 1000),
      duration: spanOf(chosen.phases),
    });
  }
  return null;
}

/** Which beat of the scene a given moment falls in, and how far through it is. */
export function ambientPhaseAt(id, elapsed) {
  const entry = ambientSceneById(id);
  if (!entry || !Number.isFinite(elapsed)) return null;
  if (elapsed < 0) return null;
  let start = 0;
  for (let index = 0; index < entry.phases.length; index += 1) {
    const phase = entry.phases[index];
    if (elapsed < start + phase.seconds) {
      return Object.freeze({
        id: phase.id,
        index,
        progress: (elapsed - start) / phase.seconds,
        overall: elapsed / spanOf(entry.phases),
      });
    }
    start += phase.seconds;
  }
  return null;
}

/**
 * How brightly the lights a draught reaches are still burning, 1 down to 0 and
 * back. Anything else asking gets 1, because most scenes have no business
 * touching the lights.
 */
export function ambientLightScale(id, elapsed) {
  if (id !== 'draught') return 1;
  const phase = ambientPhaseAt(id, elapsed);
  if (!phase) return 1;
  if (phase.id === 'gust') return 1 - phase.progress * 0.25;
  if (phase.id === 'out') return 0.75 * (1 - ease(phase.progress));
  if (phase.id === 'smoke') return 0;
  if (phase.id === 'relight') return ease(phase.progress);
  return 1;
}

/** How thick the smoke off a dead wick is right now, 0 to 1. */
export function ambientSmokeScale(id, elapsed) {
  if (id !== 'draught') return 0;
  const phase = ambientPhaseAt(id, elapsed);
  if (!phase) return 0;
  if (phase.id === 'out') return ease(phase.progress);
  if (phase.id === 'smoke') return 1 - ease(Math.max(0, (phase.progress - 0.55) / 0.45)) * 0.7;
  if (phase.id === 'relight') return 0.3 * (1 - ease(phase.progress));
  return 0;
}

/**
 * Who stands where, in the scene's own unit box: `u` runs along whatever the
 * adapter decided is the long way, `v` across it, both 0…1. The adapter owns the
 * geometry, this owns the timing — so the same walk reads the same in a wide
 * hall and in a corridor.
 */
/**
 * Шаг — тот же, каким ходят живые монстры.
 *
 * Актёры сцен ехали по комнате, не переставляя ног: сдвиг по горизонтали и
 * постоянная высота. Иван про такую сцену: «он не убежал быстро куда-нибудь,
 * а просто улетел в стену дешёвой анимацией». Настоящий монстр в игре при
 * ходьбе приседает на `-|sin(шаг × 8)| × 2.2` — здесь то же число и та же
 * формула, чтобы фоновая сцена двигалась по правилам игры, а не по своим.
 */
export function ambientWalkBob(distance) {
  if (!Number.isFinite(distance)) return 0;
  return -Math.abs(Math.sin(distance * Math.PI * 8)) * 2.2;
}

export function ambientActors(id, elapsed, variant = 0) {
  const entry = ambientSceneById(id);
  const phase = ambientPhaseAt(id, elapsed);
  if (!entry || !phase) return Object.freeze([]);
  const pick = (values, salt = 0) => values[(variant + salt) % values.length];

  if (id === 'ghost') {
    const t = phase.progress;
    return Object.freeze([Object.freeze({
      key: 'ghost',
      sprite: pick(entry.sprites),
      u: t,
      v: 0.5 + Math.sin(t * Math.PI * 1.6) * 0.09,
      // Barely there on purpose: a ghost you can read clearly is a monster.
      opacity: breathe(t, 0.18, 0.3) * 0.34,
      facing: 1,
      size: 74,
      lift: Math.sin(t * Math.PI * 3.1) * 4 - 6,
    })]);
  }

  if (id === 'bats') {
    const t = phase.progress;
    return Object.freeze([0, 1, 2, 3].map((index) => {
      const lead = t * 1.22 - index * 0.07;
      return Object.freeze({
        key: `bat-${index}`,
        sprite: entry.sprites[0],
        u: lead,
        v: 0.34 + index * 0.1 + Math.sin(lead * Math.PI * 2.4 + index) * 0.13,
        opacity: lead <= 0 || lead >= 1 ? 0 : breathe(lead, 0.08, 0.12),
        facing: 1,
        size: 44,
        lift: -16 + Math.sin(lead * Math.PI * 5 + index * 1.3) * 7,
      });
    }));
  }

  if (id === 'duel' || id === 'brawl') {
    /*
     * Победитель — всегда из мыслящих, проигравший — всегда зверь.
     *
     * Второй берётся не соседним числом, а через длину первого списка: иначе
     * пары ходили бы парами — первый с первым, второй со вторым, — и из девяти
     * сочетаний игрок увидел бы три.
     */
    const winner = entry.sprites[variant % entry.sprites.length];
    const loser = entry.quarry[
      Math.floor(variant / entry.sprites.length) % entry.quarry.length
    ];
    // They trade blows on a beat rather than sliding: a fight is a rhythm.
    const beat = Math.sin(elapsed * 9.5);
    let winnerU = 0.42 + beat * 0.03;
    let loserU = 0.58 - beat * 0.03;
    // Nobody blinks into the middle of a room. They are already fighting when
    // the scene begins, so they arrive the way a thing at the edge of your light
    // arrives — over half a second, not between two frames.
    const arrival = phase.id === 'fight' ? ease(Math.min(1, phase.progress / 0.16)) : 1;
    let loserOpacity = arrival;
    let winnerOpacity = arrival;
    if (phase.id === 'kill') {
      loserOpacity = 1 - ease(phase.progress);
      winnerU = 0.44;
      loserU = 0.58;
    } else if (phase.id === 'flee') {
      loserOpacity = 0;
      // Ровно до конца проверенного отрезка и ни клеткой дальше: за ним пол
      // никто не проверял, и там начинается стена.
      winnerU = 0.44 + ease(phase.progress) * 0.56;
      /*
       * Уходит он в темноту, а не в воздух.
       *
       * Раньше победитель начинал таять на шестой десятой пути — посреди
       * освещённого пятна, — и это читалось не как уход, а как поломка. Иван:
       * «мне не нравится анимация, как уходит монстр, она не такая, как
       * обычно у NPC, это даже кажется каким-то багом». Теперь он гаснет на
       * последней четверти, когда уже у края света.
       */
      winnerOpacity = 1 - ease(Math.max(0, (phase.progress - 0.76) / 0.24));
    }
    const actors = [Object.freeze({
      key: 'winner',
      sprite: winner,
      u: winnerU,
      v: 0.5,
      opacity: winnerOpacity,
      facing: 1,
      size: id === 'duel' ? 78 : 72,
      /*
       * Уходящий шагает, а не скользит.
       *
       * Высота была постоянной, и победитель уезжал вбок, как картинка по
       * стеклу: всё живое в игре при ходьбе подпрыгивает шагом, а он один —
       * нет. Тот же шаг, той же формы, что у героя и монстров.
       */
      lift: -10 + (phase.id === 'flee' ? -Math.abs(Math.sin(phase.progress * Math.PI * 6)) * 3 : 0),
    })];
    if (loserOpacity > 0) {
      actors.push(Object.freeze({
        key: 'loser',
        sprite: loser,
        u: loserU,
        v: 0.5,
        opacity: loserOpacity,
        facing: -1,
        size: 70,
        lift: -10 + (phase.id === 'kill' ? ease(phase.progress) * 8 : 0),
      }));
    }
    return Object.freeze(actors);
  }

  if (id === 'hauler') {
    const t = phase.progress;
    const fade = breathe(t, 0.1, 0.16);
    return Object.freeze([
      Object.freeze({
        key: 'hauler',
        sprite: entry.sprites[0],
        u: t,
        v: 0.5,
        opacity: fade,
        facing: 1,
        size: 74,
        // Тащит, а не едет: шаг тот же, каким ходят живые монстры.
        lift: -10 + ambientWalkBob(t),
      }),
      Object.freeze({
        key: 'haul',
        // The basket trails a step behind, which is what dragging looks like.
        sprite: entry.sprites[1],
        u: t - 0.075,
        v: 0.53,
        opacity: fade * 0.95,
        facing: 1,
        size: 44,
        // Короб подпрыгивает вдвое слабее и не в такт: его волокут, он не идёт.
        lift: -2 + ambientWalkBob(t - 0.075) * 0.5,
      }),
    ]);
  }

  if (id === 'fireflies') {
    const count = 7;
    return Object.freeze(Array.from({ length: count }, (unused, index) => {
      const swirl = elapsed * 0.9 + (index / count) * Math.PI * 2;
      const spread = phase.id === 'gather'
        ? 1 - ease(phase.progress) * 0.72
        : phase.id === 'scatter'
          ? 0.28 + ease(phase.progress) * 1.3
          : 0.28;
      const alpha = phase.id === 'gather'
        ? ease(phase.progress)
        : phase.id === 'scatter'
          ? 1 - ease(phase.progress)
          : 0.75 + Math.sin(elapsed * 3 + index) * 0.25;
      return Object.freeze({
        key: `fly-${index}`,
        sprite: null,
        spark: true,
        u: 0.5 + Math.cos(swirl) * spread * 0.4,
        v: 0.5 + Math.sin(swirl * 1.3) * spread * 0.3,
        opacity: Math.max(0, alpha) * 0.85,
        facing: 1,
        size: 22,
        lift: -14 + Math.sin(elapsed * 2.2 + index * 1.7) * 6,
      });
    }));
  }

  return Object.freeze([]);
}

/** The line the scene says about itself, in the player's language. */
export function ambientLine(id, language = 'ru') {
  const entry = ambientSceneById(id);
  if (!entry) return '';
  return entry.line[language === 'en' ? 'en' : 'ru'];
}

export function ambientCopy(language = 'ru') {
  return language === 'en'
    ? Object.freeze({
      title: 'Seen in passing',
      progress: (seen, total) => `${seen} of ${total}`,
      empty: 'The dungeon has not shown you anything yet.',
      unseen: 'Not yet seen',
    })
    : Object.freeze({
      title: 'Что ты видел',
      progress: (seen, total) => `${seen} из ${total}`,
      empty: 'Подземелье пока ничего тебе не показало.',
      unseen: 'Ещё не видел',
    });
}

export function validateAmbientSeen(seen) {
  if (!Array.isArray(seen)) return false;
  if (seen.length > AMBIENT_SCENE_IDS.length) return false;
  if (new Set(seen).size !== seen.length) return false;
  return seen.every((id) => AMBIENT_SCENE_IDS.includes(id));
}

export function rememberAmbientScene(seen, id) {
  const known = validateAmbientSeen(seen) ? seen : [];
  if (!ambientSceneById(id) || known.includes(id)) return Object.freeze([...known]);
  // Kept in catalogue order so the records screen never reshuffles itself.
  return Object.freeze(AMBIENT_SCENE_IDS.filter((entry) => entry === id || known.includes(entry)));
}

/**
 * The records list. Everything the player has met is named; everything else is
 * one grey line, so the page says "there is more" without saying what.
 */
export function ambientSeenModel(seen, language = 'ru') {
  const copy = ambientCopy(language);
  const known = validateAmbientSeen(seen) ? seen : [];
  return Object.freeze({
    title: copy.title,
    progress: copy.progress(known.length, AMBIENT_SCENE_IDS.length),
    empty: known.length === 0 ? copy.empty : '',
    entries: Object.freeze(AMBIENT_SCENES.map((entry) => Object.freeze({
      id: entry.id,
      seen: known.includes(entry.id),
      colour: entry.colour,
      text: known.includes(entry.id) ? ambientLine(entry.id, language) : copy.unseen,
    }))),
  });
}
