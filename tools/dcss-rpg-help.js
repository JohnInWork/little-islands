/**
 * Справка: управление и правила, собранные в одном экране меню.
 *
 * Иван 23.09.2026: «в меню игры где-нибудь сверху справа сделать кнопку со
 * знаком вопроса… и там вот сделать управление и всякое вот такое обучение.
 * В игре не надо ничего обучать». Поэтому подсказок поверх подземелья нет —
 * игрок сам открывает справку, когда ему нужно, и закрывает, когда понял.
 *
 * Модуль чистый: двуязычный текст и готовая к отрисовке модель. Числа берутся
 * из тех же правил, что двигают игру, — справка не может разойтись с ними
 * молча, как это однажды случилось с голодом.
 */

import { STARVATION_DAMAGE_PERCENT, STARVATION_TICK_SECONDS } from './dcss-rpg-hunger.js';
import { FLOORS_PER_CHAPTER, STORY_CHAPTERS, STORY_DEPTH } from './dcss-rpg-run.js';
import { SPELL_SLOT_COUNT } from './dcss-rpg-spells.js';
import { STASH_PER_FLOOR, STASH_PER_KILL } from './dcss-rpg-stash.js';

const entry = (term, text) => Object.freeze({ term, text });

const section = ({ id, ru, en }) => Object.freeze({
  id,
  ru: Object.freeze({ title: ru.title, entries: Object.freeze(ru.entries) }),
  en: Object.freeze({ title: en.title, entries: Object.freeze(en.entries) }),
});

export const HELP_SECTIONS = Object.freeze([
  section({
    id: 'controls',
    ru: {
      title: 'Управление',
      entries: [
        entry('Касание', 'Коснись разведанного пола — герой сам дойдёт туда кратчайшим путём.'),
        entry('Крестовина', 'Нажми или удерживай стрелку внизу экрана. Центр крестовины можно тянуть в любую сторону.'),
        entry('Клавиатура', 'WASD или стрелки — шаг. E или пробел — действие рядом. 1, 2, 3 — заклинания. M — карта. Esc — пауза и закрыть окно.'),
        entry('Бой', 'Бой идёт сам: подойди к врагу, и герой бьёт, пока тот рядом. Вещь с пола берут кнопкой «что рядом» — на ней нарисована сама вещь.'),
      ],
    },
    en: {
      title: 'Controls',
      entries: [
        entry('Tap', 'Tap any explored floor and the hero walks there by the shortest path.'),
        entry('D-pad', 'Press or hold an arrow at the bottom of the screen. The centre of the pad can be dragged in any direction.'),
        entry('Keyboard', 'WASD or arrows to step. E or Space for the action nearby. 1, 2, 3 cast spells. M opens the map. Esc pauses and closes windows.'),
        entry('Combat', 'Fighting is automatic: walk up to an enemy and the hero keeps striking while it stays close. Pick an item up with the “what’s nearby” button — it shows the item itself.'),
      ],
    },
  }),
  section({
    id: 'screen',
    ru: {
      title: 'Экран',
      entries: [
        entry('Плашка сверху', 'Красные клетки — здоровье. Ниже сытость и бодрость. Монета — золото этого забега.'),
        entry('Портрет', 'Характеристики и навыки. Число на портрете — сколько очков можно вложить прямо сейчас.'),
        entry('Римская цифра', 'Номер этажа и его карта: там видно, что уже разведано и где выход.'),
        entry('Справа', 'Пауза и портал в город.'),
        entry('Снизу слева', 'Арка — «что рядом»: открыть сундук, поговорить, спуститься. Мешок — рюкзак и снаряжение.'),
      ],
    },
    en: {
      title: 'The screen',
      entries: [
        entry('Top panel', 'Red squares are health. Below them are satiety and rest. The coin is this run’s gold.'),
        entry('Portrait', 'Attributes and skills. The number on the portrait is how many points you can spend right now.'),
        entry('Roman numeral', 'The floor number and its map: what you have explored and where the way down is.'),
        entry('Right side', 'Pause and the portal to town.'),
        entry('Bottom left', 'The arch is “what’s nearby”: open a chest, talk, go down the stairs. The bag is your backpack and gear.'),
      ],
    },
  }),
  section({
    id: 'survival',
    ru: {
      title: 'Выживание',
      entries: [
        entry('Голод', `Сытость тратится, пока ты действуешь. Голодный герой слабеет, а с пустым желудком теряет ${STARVATION_DAMAGE_PERCENT}% здоровья каждые ${STARVATION_TICK_SECONDS} с, пока не поест. Еда ещё и лечит.`),
        entry('Бодрость', 'Уставший герой видит хуже и не может вкладывать очки. Выспаться можно у костра со спальником, в таверне или в своём доме.'),
        entry('Лечение', 'Зелья, еда и заклинания очищения. Каменный алтарь лечит даром, но выпить из него снова можно не сразу. Он есть в городе, а в подземелье попадается редко. В тишине, когда за героем никто не гонится, раны понемногу затягиваются сами.'),
      ],
    },
    en: {
      title: 'Survival',
      entries: [
        entry('Hunger', `Satiety drains while you act. A hungry hero weakens, and on an empty stomach loses ${STARVATION_DAMAGE_PERCENT}% health every ${STARVATION_TICK_SECONDS}s until they eat. Food heals, too.`),
        entry('Rest', 'A tired hero sees less and cannot spend points. Sleep at a campfire with a bedroll, at the tavern or in your own house.'),
        entry('Healing', 'Potions, food and cleansing spells. The stone altar heals for free, but not again straight away. There is one in town, and they are rare below. In quiet, with nothing chasing the hero, wounds slowly close by themselves.'),
      ],
    },
  }),
  section({
    id: 'growth',
    ru: {
      title: 'Развитие',
      entries: [
        entry('Уровень', 'Опыт за врагов даёт уровни, а каждый уровень — очко. Его можно вложить в характеристику или в навык.'),
        entry('Урон', 'Удар растёт от оружия и от его характеристики: сила — мечи, топоры, дробящее; ловкость — кинжалы, копья, луки, пращи; интеллект — посохи. Больше урон ниоткуда не берётся.'),
        entry('Навыки', 'У каждого навыка три ранга. Старшие ранги ждут уровня героя, а некоторые — ещё силы, ловкости или интеллекта.'),
        entry('Магия', `Школа магии — тоже навык: каждый ранг открывает новые заклинания. Держать под рукой можно ${SPELL_SLOT_COUNT}.`),
        entry('Книги', 'Прочитанная книга поднимает навык до конца забега и не тратит очко.'),
      ],
    },
    en: {
      title: 'Growth',
      entries: [
        entry('Level', 'Experience from enemies brings levels, and every level brings a point. Spend it on an attribute or a skill.'),
        entry('Damage', 'A hit grows with the weapon and its attribute: strength for swords, axes and maces; agility for daggers, spears, bows and slings; intelligence for staves. Damage comes from nowhere else.'),
        entry('Skills', 'Each skill has three ranks. Higher ranks wait for the hero’s level, and some also for strength, agility or intelligence.'),
        entry('Magic', `A school of magic is a skill too: every rank opens new spells. You can keep ${SPELL_SLOT_COUNT} at hand.`),
        entry('Books', 'A book you read raises a skill for the rest of the run without spending a point.'),
      ],
    },
  }),
  section({
    id: 'dungeon',
    ru: {
      title: 'Сундуки и ловушки',
      entries: [
        entry('Сундуки', 'Каждый сундук заперт. Открывает одна отмычка или редкий ключ; мастер-ключ открывает любой. Бывают ловушки, проклятия и мимики.'),
        entry('Ловушки', 'Обезвредить ловушку можно набором сапёра. На третьем ранге навыка «Ловушки» набор не нужен.'),
        entry('Гробницы', 'Осквернённая гробница отдаёт золото, но печать ранит, а иногда из неё встаёт мумия. На первых этажах от неё лучше бежать.'),
        entry('Уникальные силы', 'Полёт, невидимость и другие силы артефактов выпадают не больше одного раза за забег.'),
      ],
    },
    en: {
      title: 'Chests and traps',
      entries: [
        entry('Chests', 'Every chest is locked. One lockpick or a rare key opens it; the master key opens any. Some are trapped, cursed or mimics.'),
        entry('Traps', 'A sapper kit disarms a trap. At the third rank of the Traps skill you no longer need the kit.'),
        entry('Tombs', 'A defiled tomb gives up its gold, but the seal wounds and sometimes a mummy rises. On the first floors, run.'),
        entry('Unique powers', 'Flight, invisibility and the other artifact powers turn up no more than once per run.'),
      ],
    },
  }),
  section({
    id: 'run',
    ru: {
      title: 'Забег',
      entries: [
        entry('Дорога', `${STORY_DEPTH} этажей в ${STORY_CHAPTERS} главах по ${FLOORS_PER_CHAPTER}. Последний этаж главы стережёт страж, и выход открывается только после него.`),
        entry('Город', 'Над подземельем город: торговцы, таверна, храм и дом, который можно купить. Из подземелья туда ведёт портал.'),
        entry('Смерть', 'Смерть заканчивает забег, и вещи пропадают. Остаётся только то, что забег заработал.'),
        entry('Снаряжение', `За каждый этаж ${STASH_PER_FLOOR} монет в копилку, за каждого убитого — ${STASH_PER_KILL}. На них в меню «Снаряжение» покупают припасы на следующий забег.`),
      ],
    },
    en: {
      title: 'The run',
      entries: [
        entry('The road', `${STORY_DEPTH} floors in ${STORY_CHAPTERS} chapters of ${FLOORS_PER_CHAPTER}. A guardian holds the last floor of each chapter, and the way on opens only once it falls.`),
        entry('Town', 'Above the dungeon is a town: merchants, a tavern, a temple and a house you can buy. A portal leads there from below.'),
        entry('Death', 'Death ends the run, and your things are lost. Only what the run earned stays.'),
        entry('Outfit', `Every floor puts ${STASH_PER_FLOOR} coins in the stash, every kill ${STASH_PER_KILL}. Spend them in the Outfit menu on supplies for the next run.`),
      ],
    },
  }),
]);

const COPY = Object.freeze({
  ru: Object.freeze({ title: 'Как играть', open: 'Как играть', close: 'Закрыть справку' }),
  en: Object.freeze({ title: 'How to play', open: 'How to play', close: 'Close help' }),
});

/** Готовая к отрисовке модель: адаптеру остаётся разложить её по блокам. */
export function helpModel(language = 'ru') {
  const locale = language === 'en' ? 'en' : 'ru';
  const copy = COPY[locale];
  return Object.freeze({
    language: locale,
    title: copy.title,
    open: copy.open,
    close: copy.close,
    sections: Object.freeze(HELP_SECTIONS.map((item) => Object.freeze({
      id: item.id,
      title: item[locale].title,
      entries: item[locale].entries,
    }))),
  });
}
