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
  parleyRoll,
  parleyTollPrice,
  parleyWaresPrice,
  resolveParley,
  PARLEY_BET_PRIZE,
  PARLEY_WARES,
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

/**
 * Пари и слепая покупка решаются жребием — и жребий не переигрывается.
 *
 * Иначе игрок сохранится, купит, посмотрит и перезагрузится, пока не выпадет
 * хорошее: выбора не останется, останется процедура. Бросок выводится из сида
 * забега, глубины и того, кто спрашивает, — и при той же тройке он тот же.
 */
test('жребий один и тот же при каждой загрузке', () => {
  for (const seed of [1, 7, 4242]) {
    for (const depth of [3, 9]) {
      const первый = parleyRoll(seed, depth, 'eustachio');
      assert.equal(первый, parleyRoll(seed, depth, 'eustachio'), 'бросок переигрывается');
      assert.ok(первый >= 0 && первый < 1, 'бросок вне отрезка');
      assert.notEqual(первый, parleyRoll(seed, depth, 'crazy-yiuf'), 'у двоих один жребий');
    }
  }
  assert.throws(() => parleyRoll(-1, 3, 'eustachio'), TypeError);

  // И оба ответа в пари ведут к разным исходам при одном и том же жребии.
  const исходы = ['left', 'right'].map((option) => resolveParley({
    monsterId: 'crazy-yiuf', option, depth: 5, seed: 7,
  }));
  assert.equal(исходы.filter(({ hostile }) => hostile).length, 1, 'угадали оба или ни один');
  const выигрыш = исходы.find(({ hostile }) => !hostile);
  assert.equal(выигрыш.grantsItemId, PARLEY_BET_PRIZE);
  assert.equal(выигрыш.leaves, true);
  const проигрыш = исходы.find(({ hostile }) => hostile);
  assert.equal(проигрыш.grantsItemId, null);
  assert.ok(проигрыш.damageMultiplier > 1, 'проигравшему пари Юф не стал опаснее');

  // Не играть — не проиграть: Юф остаётся стоять и не злится.
  const мимо = resolveParley({ monsterId: 'crazy-yiuf', option: 'refuse', depth: 5, seed: 7 });
  assert.equal(мимо.hostile, false);
  assert.equal(мимо.leaves, false);
});

test('слепая покупка отдаёт то настоящее, то пустышку — и всегда что-то', () => {
  const куплено = new Set();
  for (let seed = 1; seed <= 200; seed += 1) {
    const итог = resolveParley({ monsterId: 'eustachio', option: 'buy', depth: 5, seed, gold: 9999 });
    assert.equal(итог.goldDelta, -parleyWaresPrice(5));
    assert.equal(итог.leaves, true);
    assert.equal(итог.hostile, false, 'торговец полез драться');
    assert.ok(итог.grantsItemId, 'золото ушло, а вещи нет');
    куплено.add(итог.grantsItemId);
  }
  assert.ok(куплено.has(PARLEY_WARES.junk), 'пустышка не выпадает никогда');
  assert.ok(
    PARLEY_WARES.real.some((id) => куплено.has(id)),
    'настоящее не выпадает никогда',
  );
  // Каждое настоящее — из списка, а не выдумано на месте.
  for (const id of куплено) {
    assert.ok(id === PARLEY_WARES.junk || PARLEY_WARES.real.includes(id), id);
  }

  const бедный = parleyModel({ monsterId: 'eustachio', depth: 5, gold: 0 });
  assert.equal(бедный.options[0].enabled, false);
  assert.equal(бедный.options[1].enabled, true, 'пройти мимо нельзя');
  assert.equal(resolveParley({ monsterId: 'eustachio', option: 'refuse', depth: 5 }).hostile, false);
});

test('полный рюкзак не съедает золото за вещь, которую некуда положить', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');
  assert.match(
    runtime,
    /if \(result\.grantsItemId && backpackItems\.filter\(Boolean\)\.length >= currentBackpackCapacity\(\)\)/,
  );
  // И жребий адаптер берёт у забега, а не у случайности кадра.
  assert.match(runtime, /seed: run\.seed,/);
});

/**
 * Догнал — вернул.
 *
 * Иван: «если он у тебя какой-нибудь важный предмет навсегда заберёт, это не
 * круто по отношению к игроку». Значит убитый вор обязан отдать унесённое
 * целиком — со своими свойствами, а не как новую копию предмета того же вида.
 * Проверяется настоящая функция адаптера, вырезанная из него и запущенная в
 * песочнице: правило живёт там, где им пользуются.
 */
test('убитый вор возвращает украденное со всеми свойствами', async () => {
  const vm = await import('node:vm');
  const источник = await readFile(runtimeUrl, 'utf8');
  const вырезать = (имя) => {
    const начало = источник.indexOf(`function ${имя}(`);
    assert.ok(начало >= 0, `нет функции ${имя}`);
    return источник.slice(начало, источник.indexOf('\n}\n', начало) + 3);
  };
  const записи = [];
  const record = {
    id: 'flame-blade',
    uid: 'stolen-7',
    affixIds: ['keen'],
    artifactPowerId: 'ember',
    artifactCurseId: null,
  };
  const context = vm.createContext({
    THIEF_MONSTER_ID: 'maurice',
    run: { thief: { record, floors: 2 } },
    backpackItems: [null, null],
    currentBackpackCapacity: () => 6,
    currentItemState: () => ({ items: [], inventory: [], equipment: {} }),
    applyItemState: (state) => { context.применено = state; },
    itemInstances: new Map(),
    itemPresentation: () => ({ name: 'Пламенный клинок' }),
    presentedItem: (item) => item,
    itemDetailLanguage: 'ru',
    showLootToast: (_icon, text) => записи.push(text),
  });
  vm.runInContext(`${вырезать('recoverStolenItem')}\nconst THIEF_COPY = ${JSON.stringify({
    ru: { recovered: null, full: null },
  })};`, context);
  // Копия реплик: в песочнице функции из объекта не переживают JSON.
  vm.runInContext(`
    const thiefCopy = () => ({
      recovered: (item) => 'вернулось: ' + item,
      full: 'рюкзак полон',
    });
    recoverStolenItem({ id: 'maurice', spritePath: 'x.png' });
  `, context);

  assert.equal(context.run.thief, null, 'вор всё ещё держит добычу');
  // Через realm песочницы прототипы разные, поэтому сравниваем по содержимому.
  assert.equal(JSON.stringify(context.применено.items), JSON.stringify([record]), 'вернулась не та вещь');
  assert.equal(JSON.stringify(context.применено.inventory), JSON.stringify(['stolen-7']));
  assert.equal(записи.length, 1);

  // Полный рюкзак — вещь не пропадает, а ждёт: `run.thief` остаётся.
  const тесный = vm.createContext({ ...context, применено: null });
  тесный.run = { thief: { record, floors: 2 } };
  тесный.backpackItems = new Array(6).fill({ uid: 'x' });
  vm.runInContext(`
    const thiefCopy = () => ({ recovered: (item) => 'вернулось: ' + item, full: 'рюкзак полон' });
    ${вырезать('recoverStolenItem')}
    recoverStolenItem({ id: 'maurice', spritePath: 'x.png' });
  `, тесный);
  assert.ok(тесный.run.thief, 'добыча пропала вместе с местом в рюкзаке');
  assert.equal(тесный.применено, null, 'вещь всё-таки положили в полный рюкзак');
});

test('вор идёт следом, пока держит чужое', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');
  // Его ставит адаптер, а не жребий: иначе догнать было бы делом удачи.
  assert.match(runtime, /function thiefOnFloor\(level, spawned\)/);
  assert.match(runtime, /if \(!run\.thief \|\| isCityDepth\(level\.depth\)\) return \[\];/);
  assert.match(runtime, /`monster-\$\{level\.depth\}-thief`/);
  // Крадёт только из рюкзака: оружие в руке и надетое он не трогает.
  const кража = runtime.slice(runtime.indexOf('function robHero('));
  assert.ok(кража.includes('backpackItems.filter(Boolean)'), 'вор полез не в рюкзак');
  assert.equal(кража.slice(0, кража.indexOf('\n}\n')).includes("equippedItem("), false, 'вор снимает надетое');
  // И смерть возвращает: вызов стоит там же, где записывается победа.
  assert.match(runtime, /run\.stats\.kills \+= 1;\s*\n\s*recoverStolenItem\(monster\);/);
});
