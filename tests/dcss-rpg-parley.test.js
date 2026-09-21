import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  PARLEY_ENCOUNTERS,
  PARLEY_IDS,
  parleyBlessingHeal,
  parleyFor,
  parleyModel,
  parleyRewardGold,
  parleyTollPrice,
  resolveParley,
} from '../tools/dcss-rpg-parley.js';
import { RARE_MONSTER_IDS, RARE_ENCOUNTER_CHANCE } from '../tools/dcss-rpg-rare-encounters.js';
import { MONSTER_CATALOG } from '../tools/dcss-rpg-content.js';

const runtimeUrl = new URL('../tools/dcss.js', import.meta.url);

/**
 * Разговор ведут те, кто в игре есть.
 *
 * Именные приходят из каталога редких встреч, а не из этого модуля. Реплика,
 * написанная для того, кого не существует, не упадёт нигде: она просто никогда
 * не покажется, и заметить это будет неоткуда.
 */
test('каждый разговор принадлежит существу, которое правда встречается', () => {
  assert.ok(PARLEY_IDS.length >= 4);
  for (const id of PARLEY_IDS) {
    assert.ok(RARE_MONSTER_IDS.includes(id), `${id}: разговор есть, а встречи нет`);
    const запись = MONSTER_CATALOG.find((monster) => monster.id === id);
    assert.ok(запись, `${id}: нет в каталоге существ`);
    /*
     * Разговорчивый обязан быть нейтральным.
     *
     * Иван: «не делать так, что у игрока идеальный забег, но его убил очень
     * сильный враг просто из ниоткуда». Враждебный по умолчанию нападёт
     * раньше, чем герой успеет что-то ответить, и разговор станет надписью на
     * трупе.
     */
    assert.equal(запись.neutral, true, `${id}: нападает раньше, чем заговорит`);
  }
  assert.equal(parleyFor('нет такого'), null);
});

test('мытарь просит по глубине, и бедному он это объясняет', () => {
  assert.ok(parleyTollPrice(1) < parleyTollPrice(9), 'цена не растёт с глубиной');
  const богатый = parleyModel({ monsterId: 'blork-the-orc', depth: 5, gold: 9999 });
  const бедный = parleyModel({ monsterId: 'blork-the-orc', depth: 5, gold: 0 });
  assert.equal(богатый.price, parleyTollPrice(5));
  assert.equal(богатый.options[0].enabled, true);
  assert.equal(бедный.options[0].enabled, false);
  // Отказ доступен всегда: разговор не должен становиться тупиком.
  assert.equal(бедный.options.at(-1).id, 'refuse');
  assert.equal(бедный.options.at(-1).enabled, true);
  assert.match(бедный.options[0].hint, /\{gold\}/, 'цена без монеты — просто число');

  const оплата = resolveParley({ monsterId: 'blork-the-orc', option: 'pay', depth: 5, gold: 9999 });
  assert.equal(оплата.goldDelta, -parleyTollPrice(5));
  assert.equal(оплата.leaves, true, 'взял плату и остался стоять на дороге');
  assert.equal(оплата.hostile, false);

  const отказ = resolveParley({ monsterId: 'blork-the-orc', option: 'refuse', depth: 5, gold: 0 });
  assert.equal(отказ.hostile, true);
  assert.equal(отказ.goldDelta, 0);

  // Заплатить нечем — и ответ не проходит, а не проходит молча в минус.
  const нечем = resolveParley({ monsterId: 'blork-the-orc', option: 'pay', depth: 5, gold: 0 });
  assert.equal(нечем.ok, false);
  assert.ok(нечем.reason.length > 0);
});

test('огр берёт то, что в руке, и с пустыми руками разговор другой', () => {
  const вооружён = parleyModel({ monsterId: 'urug', depth: 6, weaponName: 'Ржавый меч' });
  assert.match(вооружён.options[0].label, /Ржавый меч/);
  assert.equal(вооружён.options[0].enabled, true);

  const безоружен = parleyModel({ monsterId: 'urug', depth: 6, weaponName: '' });
  assert.equal(безоружен.options[0].enabled, false);
  assert.equal(безоружен.options[1].enabled, true, 'безоружному оставили только тупик');

  const отдал = resolveParley({ monsterId: 'urug', option: 'give', depth: 6, weaponName: 'Ржавый меч' });
  assert.equal(отдал.takesWeapon, true);
  assert.equal(отдал.leaves, true);
  assert.equal(отдал.hostile, false);
  assert.match(отдал.message, /Ржавый меч/);

  assert.equal(resolveParley({ monsterId: 'urug', option: 'give', depth: 6, weaponName: '' }).ok, false);
  assert.equal(resolveParley({ monsterId: 'urug', option: 'refuse', depth: 6 }).hostile, true);
});

test('кто не мешал, того можно не трогать — и он за это платит', () => {
  const мирно = resolveParley({ monsterId: 'saint-roka', option: 'leave', depth: 8 });
  assert.equal(мирно.heal, parleyBlessingHeal(8));
  assert.equal(мирно.hostile, false);
  // Рока никуда не уходит: он и не стоял на дороге.
  assert.equal(мирно.leaves, false);
  assert.equal(resolveParley({ monsterId: 'saint-roka', option: 'refuse', depth: 8 }).hostile, true);
});

/**
 * Улитка — единственная встреча, которая не может кончиться боем.
 *
 * Иван просил среди именных и что-нибудь смешное. Шутка перестаёт быть шуткой,
 * если за отказ покормить бьют, поэтому у неё одной `hostileOnRefusal` ложно.
 */
test('улитка платит за еду и не дерётся за отказ', () => {
  const сытая = resolveParley({ monsterId: 'gastronok', option: 'give', depth: 4, foodCount: 2 });
  assert.equal(сытая.goldDelta, parleyRewardGold(4));
  assert.equal(сытая.takesFood, true);
  assert.equal(сытая.leaves, true);

  const обиженная = resolveParley({ monsterId: 'gastronok', option: 'refuse', depth: 4, foodCount: 0 });
  assert.equal(обиженная.hostile, false, 'улитка полезла драться');
  assert.equal(обиженная.leaves, false);

  assert.equal(resolveParley({ monsterId: 'gastronok', option: 'give', depth: 4, foodCount: 0 }).ok, false);
  assert.equal(PARLEY_ENCOUNTERS.gastronok.hostileOnRefusal, false);
});

test('неизвестное существо и неизвестный ответ — ошибка, а не тихий пропуск', () => {
  assert.throws(() => parleyModel({ monsterId: 'нет такого' }), TypeError);
  assert.throws(() => parleyModel({ monsterId: 'urug', depth: -1 }), TypeError);
  assert.throws(() => resolveParley({ monsterId: 'urug', option: 'обнять' }), TypeError);
});

/**
 * Именные — редкость, а не расписание.
 *
 * Иван: «это всё-таки реально должны быть редкие события, а не так, что каждую
 * катку ты встречаешь по три штуки». Проверяется число: комментарий об этом
 * молчит ровно до тех пор, пока кто-нибудь не поднимет шанс обратно.
 */
test('именной встречается редко', () => {
  assert.ok(RARE_ENCOUNTER_CHANCE.named <= 0.08, 'именные снова на каждом забеге по трое');
  assert.ok(RARE_ENCOUNTER_CHANCE.named > 0, 'именных не стало вовсе');
});

test('адаптер спрашивает разговор раньше драки и применяет его исход', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');
  // Кнопка разговора стоит выше остальных: с тем, кто заговорил, сначала говорят.
  const column = runtime.slice(runtime.indexOf('function nearbyContextTargets'));
  assert.ok(
    column.indexOf("add('parley'") < column.indexOf("add('guard'"),
    'драка предлагается раньше разговора',
  );
  // Уже ответивший из списка пропадает: карточка не открывается дважды.
  assert.match(runtime, /parleyFor\(monster\.id\)\s*\n\s*&& monster\.dead === 0\s*\n\s*&& !monster\.provoked/);
  // Исход применяется целиком, а не наполовину.
  for (const кусок of ['result.takesWeapon', 'result.takesFood', 'result.goldDelta', 'result.heal', 'result.hostile', 'result.leaves']) {
    assert.ok(runtime.includes(кусок), `${кусок} не применяется`);
  }
  // Договорившийся уходит и записывается ушедшим сразу.
  assert.match(runtime, /function sendNamedAway\(monster\) \{/);
  assert.match(runtime, /run\.floor\.defeated\.push\(monster\.instanceId\)/);
});
