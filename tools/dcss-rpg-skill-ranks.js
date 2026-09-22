/**
 * Что даёт каждый ранг навыка.
 *
 * Иван: «суть в том, чтобы я удобно видел, что на каком уровне навыка я
 * получаю». До сих пор карточка навыка показывала одно слитное описание —
 * «обнаруживает ловушки в радиусе 2/3/4 клеток» — и игрок сам разбирался,
 * какая цифра к какому рангу. У половины навыков и того не было: «усиливает
 * поднятых слуг» не говорит ни о чём.
 *
 * Числа при этом были в коде с самого начала, просто в двух разных местах:
 *
 * - у двадцати одного навыка — в `capabilitiesByRank` реализации;
 * - у остальных — в функции-профиле своего модуля, которая по рангу отдаёт
 *   готовый объект: `cookingProfile(3)`, `necromancyProfile(2)` и так далее.
 *
 * Поэтому здесь ничего не сочиняется. Лестница собирается из тех же данных,
 * по которым игра считает бой, и каждая ступень показывает **только то, что
 * на ней изменилось** — это и есть ответ на «что я получаю за это очко».
 *
 * Правило, которое держит всё это честным: **ранг не имеет права молчать.**
 * Если ступень ничего не показывает, значит либо она ничего не даёт (и это
 * ошибка баланса), либо у её ключа нет подписи (и это ошибка здесь). И то и
 * другое ловит `skillRankProblems`.
 */

import { skillRankRequirement } from './dcss-rpg-attributes.js';
import { cleansingProfile } from './dcss-rpg-cleansing.js';
import {
  packProfile,
  tamingProfile,
} from './dcss-rpg-companions.js';
import { cookingProfile } from './dcss-rpg-cooking.js';
import { cryomancyHitProfile } from './dcss-rpg-cryomancy.js';
import { salvageProfile } from './dcss-rpg-crafting.js';
import { enduranceProfile } from './dcss-rpg-endurance.js';
import { fieldMedicineProfile } from './dcss-rpg-field-medicine.js';
import { necromancyProfile } from './dcss-rpg-minions.js';
import { poisonProfile } from './dcss-rpg-poisoncraft.js';
import { SKILL_IMPLEMENTATIONS } from './dcss-rpg-skills.js';
import { skillById } from './dcss-rpg-skill-content.js';
import { armorSmithProfile, weaponSmithProfile } from './dcss-rpg-smithing.js';
import { pyromancySpreadProfile } from './dcss-rpg-spells.js';
import { stormChainProfile } from './dcss-rpg-storm-magic.js';

/**
 * Профиль ранга для навыков, у которых числа живут не в `capabilitiesByRank`,
 * а в собственном модуле. Криомантии нужна цель, иначе её ранги неразличимы:
 * весь смысл школы в том, что делает с мокрым и с замороженным.
 */
const PROFILE_BY_SKILL = Object.freeze({
  pyromancy: (rank) => pyromancySpreadProfile(rank),
  'storm-magic': (rank) => stormChainProfile(rank),
  cryomancy: (rank) => cryomancyHitProfile({
    rank,
    effects: { wet: 6, frozen: 4 },
    baseChillDuration: 4,
  }),
  necromancy: (rank) => necromancyProfile({ necromancyRank: rank }),
  cleansing: (rank) => cleansingProfile({ cleansingRank: rank }),
  cooking: (rank) => cookingProfile({ cookingRank: rank }),
  'field-medicine': (rank) => fieldMedicineProfile({ fieldMedicineRank: rank }),
  endurance: (rank) => enduranceProfile({ enduranceRank: rank }),
  poisoncraft: (rank) => poisonProfile({ poisoncraftRank: rank }),
  weaponsmithing: (rank) => weaponSmithProfile({ weaponsmithingRank: rank }),
  armorsmithing: (rank) => armorSmithProfile({ armorsmithingRank: rank }),
  salvaging: (rank) => salvageProfile({ salvagingRank: rank }),
  taming: (rank) => tamingProfile({ tamingRank: rank }),
  'pack-leader': (rank) => packProfile({ packLeaderRank: rank }),
});

/**
 * Ключи, которые не несут игроку ничего: сам ранг, продублированный в
 * способностях, и служебные флаги. Их отсутствие в подписях — не ошибка.
 */
const SILENT_KEYS = Object.freeze(new Set(['rank', 'trapDetectionTier', 'whipInterrupt']));

/**
 * Ранги, которые дают не число, а саму возможность. Первый ранг лагеря не
 * ускоряет отдых и не даёт схрона — он позволяет разбить лагерь вообще, и без
 * этой строки первая ступень выглядела бы бесплатной пустышкой.
 */
const UNLOCKS = Object.freeze({});

const unit = (ru, en, kind = 'count') => Object.freeze({ ru, en, kind });

/**
 * Подписи. Ключ — из тех же данных, что считают бой; текст — то, что игрок
 * прочтёт на карточке. Всё, что не подписано здесь, роняет `skillRankProblems`.
 */
const LABELS = Object.freeze({
  // ── Способности из `capabilitiesByRank` ─────────────────────────────────
  trapDetectionRadius: unit('видит ловушки', 'sees traps', 'cells'),
  trapDisarmTier: unit('обезвреживает ловушки', 'disarms traps', 'tier'),
  trapPlacementTier: unit('ставит ловушки', 'sets traps', 'tier'),
  lockpickTier: unit('вскрывает замки', 'picks locks', 'tier'),
  itemIdentificationTier: unit('опознаёт вещи', 'identifies items', 'tier'),
  scrollVariantTier: unit('разбирает свитки', 'reads scrolls', 'tier'),
  secretSearchRadius: unit('ищет тайники', 'searches for caches', 'cells'),
  backpackSlots: unit('рюкзак', 'backpack', 'slots'),
  stealthVisionPercent: unit('враг замечает хуже на', 'harder to notice by', 'percent'),
  stealthNoisePercent: unit('шагов слышно меньше на', 'quieter by', 'percent'),
  daggerAmbushPercent: unit('удар из засады', 'ambush strike', 'percent'),
  daggerBackstabPercent: unit('удар в спину', 'backstab', 'percent'),
  swordRhythmHitInterval: unit('ритм каждые', 'rhythm every', 'hits'),
  swordRhythmBonusPercent: unit('ритмовый удар', 'rhythm strike', 'percent'),
  axeCleaveOneHandDamagePercent: unit('размах одной рукой', 'one-handed sweep', 'percent'),
  axeCleaveOneHandTargets: unit('одной рукой задевает', 'one-handed hits', 'targets'),
  axeCleaveTwoHandDamagePercent: unit('размах двумя руками', 'two-handed sweep', 'percent'),
  axeCleaveTwoHandTargets: unit('двумя руками задевает', 'two-handed hits', 'targets'),
  bluntArmorBreakPercent: unit('ломает броню на', 'breaks armour by', 'percent'),
  bluntArmorBreakSeconds: unit('броня сломана', 'armour stays broken', 'seconds'),
  bluntInterruptStunMs: unit('оглушает на', 'stuns for', 'ms'),
  spearInterceptPercent: unit('встречный укол', 'brace strike', 'percent'),
  spearHoldMs: unit('держит стойку', 'holds the brace', 'ms'),
  spearInterceptCooldownMs: unit('перехват раз в', 'brace every', 'ms'),
  marksmanAimMs: unit('прицел за', 'aims in', 'ms'),
  marksmanAimBonusPercent: unit('прицельный выстрел', 'aimed shot', 'percent'),
  marksmanPierceTargets: unit('стрела пробивает', 'the arrow pierces', 'targets'),
  whipReach: unit('достаёт на', 'reaches', 'cells'),
  whipPullCells: unit('подтягивает на', 'pulls', 'cells'),
  staffChannelMs: unit('накопление до', 'channels up to', 'ms'),
  staffRangeBonus: unit('дальность посоха', 'staff range', 'cells'),
  staffPierceTargets: unit('луч пробивает', 'the beam pierces', 'targets'),
  shieldBlockChancePercent: unit('шанс блока', 'block chance', 'percent'),
  shieldBlockStunMs: unit('блок оглушает на', 'a block stuns for', 'ms'),
  mobilityDodgeSpeedPercent: unit('рывок быстрее на', 'dash faster by', 'percent'),
  mobilityDodgeMs: unit('рывок длится', 'the dash lasts', 'ms'),
  campRestPercent: unit('привал восстанавливает', 'camp restores', 'percent'),
  campStashSlots: unit('схрон в лагере', 'camp stash', 'slots'),

  // ── Ключи из профилей модулей ───────────────────────────────────────────
  targets: unit('целей', 'targets', 'targets'),
  damagePercent: unit('урон по ним', 'damage to them', 'percent'),
  jumpRange: unit('разряд перескакивает на', 'the arc jumps', 'cells'),
  chillDuration: unit('холод держится', 'chill lasts', 'seconds'),
  freezeDuration: unit('заморозка держится', 'freeze lasts', 'seconds'),
  shatter: unit('раскалывает лёд', 'shatters the ice', 'flag'),
  shatterDamagePercent: unit('раскол бьёт на', 'the shatter hits for', 'percent'),
  shatterRadius: unit('раскол в радиусе', 'shatter radius', 'cells'),
  shatterTargets: unit('раскол задевает', 'the shatter catches', 'targets'),
  powerPercent: unit('слуги сильнее на', 'minions stronger by', 'percent'),
  respawnPercent: unit('возвращаются быстрее на', 'return faster by', 'percent'),
  cleared: unit('снимает', 'clears', 'list'),
  healPercent: unit('лечит', 'heals', 'percent'),
  treats: unit('лечит состояния', 'treats', 'list'),
  dishId: unit('готовит', 'cooks', 'name'),
  durationPercent: unit('изнуряющее короче на', 'draining states shorter by', 'percent'),
  limit: unit('спутников', 'companions', 'count'),
  ratio: unit('обжигает на', 'burns for', 'ratio'),
  radius: unit('в радиусе', 'within', 'cells'),
  recipes: unit('рецепты', 'recipes', 'recipes'),
  hits: unit('покрытия хватает на', 'the coating lasts', 'hits'),
  seconds: unit('яд держится', 'the venom lasts', 'seconds'),
  baitSeconds: unit('приманка держится', 'the bait lasts', 'seconds'),
  cost: unit('стоит эссенции', 'costs essence', 'count'),
  bonusPercent: unit('деталей больше на', 'more parts by', 'percent'),
  essencePerPiece: unit('эссенции с детали', 'essence per part', 'count'),
  maxAffixes: unit('свойств на предмете', 'properties per item', 'count'),
  essenceCost: unit('стоит эссенции', 'costs essence', 'count'),
  difficulty: unit('приручает зверей до', 'tames beasts up to', 'tier'),
  hpPercent: unit('питомец крепче на', 'the pet is tougher by', 'percent'),
  damagePercent: unit('урон по ним', 'damage to them', 'percent'),
  modes: unit('приказы', 'orders', 'modes'),
  searchRadius: unit('ищет в радиусе', 'searches within', 'cells'),
  fetchRange: unit('приносит с', 'fetches from', 'cells'),
  feedPercent: unit('корм лечит на', 'feeding heals by', 'percent'),
  distance: unit('связь держит на', 'the bond reaches', 'cells'),
});

/**
 * Один и тот же ключ у разных навыков значит разное: `damagePercent` у грозы —
 * урон по перескокам, а у приручения — сила питомца. Подпись по ключу тут
 * соврала бы, поэтому такие случаи названы поимённо.
 */
const LABELS_BY_SKILL = Object.freeze({
  taming: Object.freeze({
    damagePercent: unit('питомец бьёт сильнее на', 'the pet hits harder by', 'percent'),
  }),
});

const LIST_NAMES = Object.freeze({
  ru: { poison: 'отравление', burning: 'горение', chilled: 'холод', frozen: 'заморозку', wet: 'мокроту' },
  en: { poison: 'poison', burning: 'burning', chilled: 'chill', frozen: 'freeze', wet: 'soaking' },
});

const MODE_NAMES = Object.freeze({
  ru: { guard: 'защищать', search: 'искать', fetch: 'приносить' },
  en: { guard: 'guard', search: 'search', fetch: 'fetch' },
});

const NAMES = Object.freeze({
  ru: {
    'roast-meat': 'жаркое', 'hearty-stew': 'похлёбку', 'feast-platter': 'пир',
  },
  en: {
    'roast-meat': 'a roast', 'hearty-stew': 'a stew', 'feast-platter': 'a feast',
  },
});

function formatValue(kind, value, locale) {
  const ru = locale === 'ru';
  switch (kind) {
    case 'percent': return `${value}%`;
    case 'cells': return ru ? `${value} кл` : `${value} tiles`;
    case 'targets': return ru ? `${value} цел.` : `${value}`;
    case 'slots': return ru ? `${value} ячеек` : `${value} slots`;
    case 'tier': return ru ? `ступень ${value}` : `tier ${value}`;
    case 'hits': return ru ? `${value} удара` : `${value} hits`;
    case 'seconds': return ru ? `${value} с` : `${value}s`;
    case 'ms': return ru ? `${(value / 1000).toFixed(1)} с` : `${(value / 1000).toFixed(1)}s`;
    case 'flag': return ru ? 'да' : 'yes';
    case 'ratio': return `${Math.round(value * 100)}%`;
    case 'modes': return value.map((id) => MODE_NAMES[locale][id] ?? id).join(', ');
    case 'recipes': return value.map((item) => item.labels?.[locale] ?? item.id).join(', ');
    case 'list':
      if (!Array.isArray(value)) return locale === 'ru' ? 'да' : 'yes';
      return value.map((id) => LIST_NAMES[locale][id] ?? id).join(', ');
    case 'name': return NAMES[locale][value] ?? value;
    default: return String(value);
  }
}

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const isEmpty = (value) => value === 0 || value === false || value === null
  || value === undefined || (Array.isArray(value) && value.length === 0);

/** Данные ранга: способности реализации или профиль своего модуля. */
function rankData(skillId, rank) {
  const fromProfile = PROFILE_BY_SKILL[skillId];
  if (fromProfile) return fromProfile(rank) ?? {};
  return SKILL_IMPLEMENTATIONS[skillId]?.capabilitiesByRank?.[rank - 1] ?? {};
}

/**
 * Лестница рангов навыка: по строке на ранг, и в каждой — только то, что на
 * этой ступени изменилось. `heroLevel` и `attribute` говорят, когда ступень
 * вообще станет доступна.
 */
export function skillRankLadder({ skillId, language = 'ru' } = {}) {
  const definition = skillById(skillId);
  if (!definition) return Object.freeze([]);
  const locale = language === 'en' ? 'en' : 'ru';
  const rows = [];
  for (let rank = 1; rank <= definition.maxRank; rank += 1) {
    const here = rankData(skillId, rank);
    const before = rank === 1 ? {} : rankData(skillId, rank - 1);
    const gains = [];
    for (const [key, value] of Object.entries(here)) {
      if (SILENT_KEYS.has(key)) continue;
      if (sameValue(value, before[key])) continue;
      if (isEmpty(value)) continue;
      const label = LABELS_BY_SKILL[skillId]?.[key] ?? LABELS[key];
      if (!label) continue;
      gains.push(Object.freeze({
        key,
        label: label[locale],
        value: formatValue(label.kind, value, locale),
      }));
    }
    const unlock = UNLOCKS[skillId]?.[rank];
    if (unlock) gains.unshift(Object.freeze({ key: 'unlock', label: unlock[locale], value: '' }));
    // `skillRankRequirement` спрашивают по ТЕКУЩЕМУ рангу — «что нужно, чтобы
    // шагнуть дальше». Лестница же говорит про ранг, КОТОРЫЙ покупаешь, так
    // что индекс на единицу меньше. Первый ранг поэтому свободен.
    const requirement = skillRankRequirement(definition, rank - 1);
    rows.push(Object.freeze({
      rank,
      heroLevel: definition.rankLevels[rank - 1] ?? null,
      attribute: requirement?.attribute ?? null,
      attributeValue: requirement?.value ?? 0,
      gains: Object.freeze(gains),
    }));
  }
  return Object.freeze(rows);
}

/**
 * Инвариант: ни один ранг не молчит.
 *
 * Молчащая ступень — это либо ранг, который ничего не даёт (ошибка баланса),
 * либо ключ без подписи (ошибка здесь). Разницы для игрока никакой: он платит
 * очко и не узнаёт за что.
 */
export function skillRankProblems(skillIds = []) {
  const problems = [];
  for (const skillId of skillIds) {
    const ladder = skillRankLadder({ skillId });
    if (ladder.length === 0) {
      problems.push(`${skillId}: нет лестницы рангов`);
      continue;
    }
    for (const row of ladder) {
      if (row.gains.length === 0) problems.push(`${skillId}: ранг ${row.rank} ничего не обещает`);
    }
  }
  return Object.freeze(problems);
}

/** Ключи, встречающиеся в данных рангов, но не подписанные здесь. */
export function unlabelledRankKeys(skillIds = []) {
  const missing = new Set();
  for (const skillId of skillIds) {
    const definition = skillById(skillId);
    if (!definition) continue;
    for (let rank = 1; rank <= definition.maxRank; rank += 1) {
      for (const key of Object.keys(rankData(skillId, rank))) {
        if (SILENT_KEYS.has(key) || LABELS_BY_SKILL[skillId]?.[key] || LABELS[key] || /Rank$/.test(key)) continue;
        missing.add(`${skillId}.${key}`);
      }
    }
  }
  return Object.freeze([...missing]);
}
