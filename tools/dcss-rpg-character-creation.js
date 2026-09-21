/**
 * Кем выйти из ворот.
 *
 * Иван: «когда начинаешь игру, ты либо создаёшь персонажа и вкидываешь два
 * очка характеристик и выбираешь два навыка, либо берёшь готовый пресет —
 * например, пресет мага, воина или лучника».
 *
 * До сих пор все забеги начинались одинаково: три по три в характеристиках,
 * ни одного навыка, ржавый меч. Первые десять минут у всех были одни и те же,
 * и «кем я играю» выяснялось этажу к пятому — когда выпадало что-нибудь.
 *
 * Два правила, на которых это держится:
 *
 * - **Готовый герой — это заполненный свой.** Пресет не даёт ничего, чего
 *   нельзя собрать руками: те же два очка и те же два навыка. Значит выбор
 *   между ними — про удобство, а не про силу, и никто не чувствует, что
 *   «правильный» вариант один.
 * - **Выбор ничего не запирает.** Взявший меч может потом выучить магию: это
 *   начало забега, а не класс. Всё, что делает создание, — решает, с чего он
 *   начнёт.
 */

import { ATTRIBUTE_BASE, ATTRIBUTE_IDS } from './dcss-rpg-attributes.js';
import { skillById } from './dcss-rpg-skill-content.js';
import { SKILL_CREATION_POINTS } from './dcss-rpg-skills.js';

/** Сколько очков раздаёт создание. Одинаково и своему герою, и готовому. */
export const CREATION_ATTRIBUTE_POINTS = 2;
export const CREATION_SKILL_POINTS = SKILL_CREATION_POINTS;

/*
 * Кем можно выйти, не выбирая ничего вручную.
 *
 * У каждого — картинка, имя, два очка и два навыка. Прозы на карточке нет:
 * Иван про первую версию — «какой-то текст лишний, типа „меч и щит, бьёт в
 * ближнем бою“; вот это не нужно. Нужна просто иконка, название и
 * характеристики». Меч на карточке говорит то же самое и не занимает четырёх
 * строк.
 */
export const BUILD_ARCHETYPES = Object.freeze([
  Object.freeze({
    id: 'warrior',
    icon: 'item/weapon/long_sword1.png',
    attributes: Object.freeze({ strength: 2, agility: 0, intelligence: 0 }),
    skillIds: Object.freeze(['swords', 'shield']),
    spellIds: Object.freeze([]),
    ru: Object.freeze({
      name: 'Воин',
      line: 'Меч и щит. Бьёт в ближнем бою и умеет держать удар.',
    }),
    en: Object.freeze({
      name: 'Warrior',
      line: 'Sword and shield. Fights up close and knows how to take a hit.',
    }),
  }),
  Object.freeze({
    id: 'mage',
    icon: 'item/book/light_brown.png',
    attributes: Object.freeze({ strength: 0, agility: 0, intelligence: 2 }),
    skillIds: Object.freeze(['pyromancy', 'arcana']),
    // Единственный, кто выходит со заклинанием: без него магу нечего делать
    // до первой книги, а книга может не выпасть за весь забег.
    spellIds: Object.freeze(['ember-bolt']),
    ru: Object.freeze({
      name: 'Маг',
      line: 'Огонь с расстояния. Начинает с уголька и знает, как учить книги.',
    }),
    en: Object.freeze({
      name: 'Mage',
      line: 'Fire at a distance. Starts with a bolt and knows how to read books.',
    }),
  }),
  Object.freeze({
    id: 'archer',
    icon: 'item/weapon/ranged/shortbow1.png',
    attributes: Object.freeze({ strength: 0, agility: 2, intelligence: 0 }),
    skillIds: Object.freeze(['marksmanship', 'mobility']),
    spellIds: Object.freeze([]),
    ru: Object.freeze({
      name: 'Лучник',
      line: 'Стреляет и не даёт себя догнать. Награда за то, что стоишь смирно.',
    }),
    en: Object.freeze({
      name: 'Archer',
      line: 'Shoots, and is hard to catch. Rewards standing still.',
    }),
  }),
  Object.freeze({
    id: 'scout',
    icon: 'item/armour/cloak1_leather.png',
    attributes: Object.freeze({ strength: 0, agility: 1, intelligence: 1 }),
    skillIds: Object.freeze(['stealth', 'secret-search']),
    spellIds: Object.freeze([]),
    ru: Object.freeze({
      name: 'Разведчик',
      line: 'Проходит мимо драк и находит то, мимо чего проходят другие.',
    }),
    en: Object.freeze({
      name: 'Scout',
      line: 'Walks past fights and finds what everyone else walks past.',
    }),
  }),
]);

export const BUILD_ARCHETYPE_IDS = Object.freeze(BUILD_ARCHETYPES.map(({ id }) => id));

export function buildArchetypeById(id) {
  return BUILD_ARCHETYPES.find((archetype) => archetype.id === id) ?? null;
}

const emptyAttributes = () => ({ strength: 0, agility: 0, intelligence: 0 });

/** Герой, которого никто не собирал: всё по нулям, оба очка не потрачены. */
export function createEmptyBuild() {
  return Object.freeze({
    archetypeId: null,
    attributes: Object.freeze(emptyAttributes()),
    skillIds: Object.freeze([]),
    spellIds: Object.freeze([]),
  });
}

/** Готовый герой — это заполненный свой, и собирается он тем же путём. */
export function createArchetypeBuild(id) {
  const archetype = buildArchetypeById(id);
  if (!archetype) throw new TypeError(`Unknown build archetype: ${id}`);
  return Object.freeze({
    archetypeId: archetype.id,
    attributes: Object.freeze({ ...archetype.attributes }),
    skillIds: Object.freeze([...archetype.skillIds]),
    spellIds: Object.freeze([...archetype.spellIds]),
  });
}

/**
 * Собранный руками.
 *
 * Недобранные очки — не ошибка: игрок вправе выйти с одним навыком и одним
 * очком в запасе, и оба останутся при нём как обычные непотраченные очки.
 * Ошибка — потратить больше, чем дано.
 */
export function createCustomBuild({ attributes = {}, skillIds = [] } = {}) {
  const собрано = emptyAttributes();
  for (const id of ATTRIBUTE_IDS) {
    const value = attributes[id];
    if (value === undefined) continue;
    if (!Number.isInteger(value) || value < 0) throw new TypeError('Attribute points must be whole and positive');
    собрано[id] = value;
  }
  const сумма = ATTRIBUTE_IDS.reduce((total, id) => total + собрано[id], 0);
  if (сумма > CREATION_ATTRIBUTE_POINTS) throw new TypeError('Too many attribute points spent');
  if (!Array.isArray(skillIds) || skillIds.length > CREATION_SKILL_POINTS) {
    throw new TypeError('Too many starting skills chosen');
  }
  if (new Set(skillIds).size !== skillIds.length) throw new TypeError('A skill cannot be chosen twice');
  for (const id of skillIds) {
    if (!skillById(id)) throw new TypeError(`Unknown starting skill: ${id}`);
  }
  return Object.freeze({
    archetypeId: null,
    attributes: Object.freeze(собрано),
    skillIds: Object.freeze([...skillIds]),
    spellIds: Object.freeze([]),
  });
}

export function validateBuild(build) {
  if (build === undefined || build === null) return true;
  if (typeof build !== 'object' || Array.isArray(build)) return false;
  if (build.archetypeId !== null && !buildArchetypeById(build.archetypeId)) return false;
  if (!build.attributes || typeof build.attributes !== 'object') return false;
  let сумма = 0;
  for (const id of ATTRIBUTE_IDS) {
    const value = build.attributes[id];
    if (!Number.isInteger(value) || value < 0) return false;
    сумма += value;
  }
  if (сумма > CREATION_ATTRIBUTE_POINTS) return false;
  if (!Array.isArray(build.skillIds) || build.skillIds.length > CREATION_SKILL_POINTS) return false;
  if (new Set(build.skillIds).size !== build.skillIds.length) return false;
  if (build.skillIds.some((id) => !skillById(id))) return false;
  if (!Array.isArray(build.spellIds)) return false;
  return true;
}

/** Характеристики, с которыми герой выходит: база плюс вложенное при создании. */
export function buildAttributes(build) {
  const вложено = validateBuild(build) && build ? build.attributes : emptyAttributes();
  return Object.freeze(Object.fromEntries(
    ATTRIBUTE_IDS.map((id) => [id, ATTRIBUTE_BASE + (вложено[id] ?? 0)]),
  ));
}

/** Первые ступени выбранных навыков. Остальные очки остаются непотраченными. */
export function buildSkillRanks(build) {
  const выбрано = validateBuild(build) && build ? build.skillIds : [];
  return Object.freeze(Object.fromEntries(выбрано.map((id) => [id, 1])));
}

/** Сколько очков навыков осталось в кармане после создания. */
export function buildSkillPointsLeft(build) {
  const выбрано = validateBuild(build) && build ? build.skillIds.length : 0;
  return CREATION_SKILL_POINTS - выбрано;
}

/**
 * Что показать на экране создания.
 *
 * Модель отдаёт и готовых героев, и состояние собираемого своего — один и тот
 * же экран, потому что это один и тот же выбор. Кнопка «Начать» доступна
 * всегда: герой с неистраченными очками — законный герой, а не недоделанный.
 */
export function buildScreenModel({ build = createEmptyBuild(), language = 'ru' } = {}) {
  const locale = language === 'en' ? 'en' : 'ru';
  const вложено = validateBuild(build) && build ? build.attributes : emptyAttributes();
  const выбрано = validateBuild(build) && build ? build.skillIds : [];
  const потраченоОчков = ATTRIBUTE_IDS.reduce((total, id) => total + (вложено[id] ?? 0), 0);
  return Object.freeze({
    archetypes: Object.freeze(BUILD_ARCHETYPES.map((archetype) => Object.freeze({
      id: archetype.id,
      name: archetype[locale].name,
      icon: archetype.icon,
      chosen: build?.archetypeId === archetype.id,
      attributes: Object.freeze({ ...archetype.attributes }),
      skills: Object.freeze(archetype.skillIds.map((id) => skillById(id)?.name?.[locale] ?? id)),
    }))),
    attributePointsLeft: CREATION_ATTRIBUTE_POINTS - потраченоОчков,
    skillPointsLeft: CREATION_SKILL_POINTS - выбрано.length,
    attributes: Object.freeze(Object.fromEntries(
      ATTRIBUTE_IDS.map((id) => [id, ATTRIBUTE_BASE + (вложено[id] ?? 0)]),
    )),
    skillIds: Object.freeze([...выбрано]),
    custom: build?.archetypeId === null,
  });
}

/** Добавить или снять очко характеристики, не выходя за отпущенные два. */
export function adjustBuildAttribute(build, attributeId, step) {
  if (!ATTRIBUTE_IDS.includes(attributeId)) throw new TypeError(`Unknown attribute: ${attributeId}`);
  if (step !== 1 && step !== -1) throw new TypeError('Attribute step must be one point');
  const основа = validateBuild(build) && build ? build : createEmptyBuild();
  const собрано = { ...emptyAttributes(), ...основа.attributes };
  const следующее = (собрано[attributeId] ?? 0) + step;
  if (следующее < 0) return основа;
  собрано[attributeId] = следующее;
  const сумма = ATTRIBUTE_IDS.reduce((total, id) => total + собрано[id], 0);
  if (сумма > CREATION_ATTRIBUTE_POINTS) return основа;
  // Тронул руками — значит герой свой, даже если начинал с готового.
  return Object.freeze({
    archetypeId: null,
    attributes: Object.freeze(собрано),
    skillIds: Object.freeze([...основа.skillIds]),
    spellIds: Object.freeze([...основа.spellIds]),
  });
}

/** Взять навык или отказаться от него. Больше двух не берётся. */
export function toggleBuildSkill(build, skillId) {
  if (!skillById(skillId)) throw new TypeError(`Unknown starting skill: ${skillId}`);
  const основа = validateBuild(build) && build ? build : createEmptyBuild();
  const выбрано = [...основа.skillIds];
  const где = выбрано.indexOf(skillId);
  if (где >= 0) выбрано.splice(где, 1);
  else if (выбрано.length < CREATION_SKILL_POINTS) выбрано.push(skillId);
  else return основа;
  return Object.freeze({
    archetypeId: null,
    attributes: Object.freeze({ ...emptyAttributes(), ...основа.attributes }),
    skillIds: Object.freeze(выбрано),
    spellIds: Object.freeze([...основа.spellIds]),
  });
}
