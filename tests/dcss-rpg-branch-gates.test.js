import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  BRANCH_DIFFICULTY,
  BRANCH_GATES,
  BRANCH_GATE_PATHS,
  BRANCH_RUNES,
  BRANCH_RUNE_PATHS,
  BRANCH_STAIRS,
  BRANCH_STAIR_PATHS,
  branchRune,
  branchDifficulty,
  branchGateCopy,
  branchGateFor,
  gatesInto,
} from '../tools/dcss-rpg-branch-gates.js';
import { RUN_BRANCHES } from '../tools/dcss-rpg-content.js';
import { DUNGEON_THEME_CATALOG } from '../tools/dcss-rpg-room-plans.js';
import {
  createRun,
  enterBranchThroughGate,
  generateDungeon,
  travelRunToDepth,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { requiredAssetPaths } from '../tools/dcss-rpg-required-assets.js';

/**
 * «Из самого нижнего этажа этого спуска, когда там ветка заканчивается, там
 * идёт проход в ад <...> чтобы сверху был проход в какие-нибудь катакомбы.»
 */
test('a road can end in another road, and one has a side door partway along', () => {
  const hell = BRANCH_GATES.find(({ to }) => to === 'hell');
  const crypt = BRANCH_GATES.find(({ to }) => to === 'crypt');
  assert.ok(hell && crypt, 'hell and the catacombs have no mouths');
  assert.equal(hell.from, 'deep', 'the gate of hell is not at the end of the descent');
  assert.equal(crypt.from, 'surface', 'the catacombs are not entered from above');

  for (const gate of BRANCH_GATES) {
    assert.ok(RUN_BRANCHES.includes(gate.from) && RUN_BRANCHES.includes(gate.to));
    assert.notEqual(gate.from, gate.to, 'a gate onto the road it stands on');
    // A gate always leads somewhere harder: otherwise it is a shortcut, not a
    // decision about where to go.
    assert.ok(
      branchDifficulty(gate.to) > branchDifficulty(gate.from),
      `${gate.id} leads somewhere easier`,
    );
    // And both ends are real places with places of their own to be.
    for (const branch of [gate.from, gate.to]) {
      assert.ok(
        DUNGEON_THEME_CATALOG.some((theme) => theme.branch === branch),
        `${branch} has nowhere to be`,
      );
    }
  }

  assert.equal(branchGateFor('deep', hell.depth)?.to, 'hell');
  assert.equal(branchGateFor('deep', hell.depth - 1), null, 'the gate is on every floor');
  assert.equal(branchGateFor('hell', 1), null, 'hell leads on to something else again');
  assert.deepEqual(gatesInto('hell').map(({ id }) => id), [hell.id]);

  for (const language of ['ru', 'en']) {
    const copy = branchGateCopy(hell, language);
    assert.ok(copy.name.length > 0 && copy.description.length > 0 && copy.enter.length > 0);
  }
  assert.notEqual(branchGateCopy(hell, 'ru').name, branchGateCopy(hell, 'en').name);
  assert.equal(branchGateCopy(null), null);
});

test('the gate stands on the floor, with that road’s own mouth for a picture', () => {
  const loaded = requiredAssetPaths();
  const preview = new URL('../public/assets/dcss-preview/', import.meta.url);
  for (const path of BRANCH_GATE_PATHS) {
    assert.ok(existsSync(new URL(path, preview)), `${path} does not ship`);
    assert.ok(loaded.includes(path), `${path} is never loaded`);
  }
  // Two roads, two different mouths: the picture is how the player knows.
  assert.equal(new Set(BRANCH_GATE_PATHS).size, BRANCH_GATES.length);

  for (const gate of BRANCH_GATES) {
    let placed = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const level = generateDungeon({ seed, depth: gate.depth, branch: gate.from });
      if (!level.branchGate) continue;
      placed += 1;
      assert.equal(level.branchGate.to, gate.to);
      assert.equal(level.grid[level.branchGate.y][level.branchGate.x], '.', 'the gate is in a wall');
      // Never under the hero's feet on arrival, and never on the stairs.
      assert.notDeepEqual(
        { x: level.branchGate.x, y: level.branchGate.y },
        { x: level.spawn.x, y: level.spawn.y },
      );
      assert.notDeepEqual(
        { x: level.branchGate.x, y: level.branchGate.y },
        { x: level.exit.x, y: level.exit.y },
      );
    }
    assert.ok(placed >= 18, `${gate.id} only appeared on ${placed} of 20 floors`);
  }
  // And no other floor carries one.
  for (const depth of [1, 5, 12]) {
    assert.equal(generateDungeon({ seed: 3, depth, branch: 'deep' }).branchGate, null);
  }
});

/**
 * Врата ведут вниз, а не в начало.
 *
 * Пока новая дорога начиналась со своего первого этажа, самая страшная дверь в
 * игре вела на самый лёгкий пол: герой час грыз двенадцатый этаж, входил — и
 * получал монстров вдвое слабее тех, что остались позади, с потолком тира три
 * вместо семи. Хуже того, до конца дороги ему снова было идти с первого этажа,
 * потому что финал считается по глубине, а не по ветке.
 */
test('за вратами лежит следующий этаж, а не первый', () => {
  let run = createRun(21);
  for (let depth = 2; depth <= 6; depth += 1) run = travelRunToDepth(run, depth);
  assert.equal(run.branch, 'deep');
  assert.equal(run.depth, 6);
  const moved = enterBranchThroughGate(run, 'hell');
  assert.equal(moved.branch, 'hell');
  assert.equal(moved.depth, 7, 'счёт этажей сквозной: ад продолжает спуск, а не начинает заново');

  // Правило держится на любой глубине, в том числе на той, где стоят врата.
  let глубокий = createRun(22);
  for (let depth = 2; depth <= 18; depth += 1) глубокий = travelRunToDepth(глубокий, depth);
  assert.equal(enterBranchThroughGate(глубокий, 'hell').depth, 19);
  assert.equal(enterBranchThroughGate(глубокий, 'crypt').depth, 19);
  // The descent's floors are gone: a road is a place you are on, not a stack,
  // and keeping them would mean climbing out of hell onto floor eighteen.
  assert.deepEqual(moved.floors, {}, `the descent came along: ${Object.keys(moved.floors).join(',')}`);
  assert.equal(validateRun(moved), true);
  // The hero themselves is untouched: a road is a place, not a new run.
  assert.equal(moved.hero.level, run.hero.level);
  assert.equal(moved.gold, run.gold);
  // Asking for the road you are already on changes nothing.
  assert.equal(enterBranchThroughGate(moved, 'hell'), moved);
  assert.throws(() => enterBranchThroughGate(moved, 'nowhere'));
});

/**
 * «Чтобы для каждой из этих веток были свои входы и выходы текстурки — чтобы
 * игрок понимал, что это вход в какое-то новое прям подземелье.»
 */
test('every road has its own stairs, and its two are never confusable', () => {
  const loaded = requiredAssetPaths();
  const preview = new URL('../public/assets/dcss-preview/', import.meta.url);
  assert.deepEqual(Object.keys(BRANCH_STAIRS).sort(), [...RUN_BRANCHES].sort());
  for (const [branch, stairs] of Object.entries(BRANCH_STAIRS)) {
    for (const side of ['down', 'up']) {
      const path = stairs[side];
      assert.ok(path, `${branch} has no way ${side}`);
      assert.ok(existsSync(new URL(path, preview)), `${path} does not ship`);
      assert.ok(loaded.includes(path), `${path} is never loaded`);
    }
    // The two stand on the same floor, and the screen is a phone.
    assert.notEqual(stairs.down, stairs.up, `${branch} draws both its stairs the same`);
  }
  // A road's way down is its own: that picture is how the player knows the
  // place changed. Two roads may share a way *back*, since no one ever sees
  // two roads at once — but nobody may share a descent.
  const downs = Object.values(BRANCH_STAIRS).map(({ down }) => down);
  assert.equal(new Set(downs).size, downs.length, 'two roads go down through the same door');
  assert.equal(
    BRANCH_STAIR_PATHS.length,
    new Set(Object.values(BRANCH_STAIRS).flatMap(({ down, up }) => [down, up])).size,
  );
  // And a gate into a road never looks like that road's own stairs, or the
  // player would read «дальше вниз» where the game means «другое место».
  for (const gate of BRANCH_GATES) {
    assert.equal(BRANCH_STAIR_PATHS.includes(gate.path), false, `${gate.id} is drawn as a stair`);
  }
});

test('the runtime draws the stairs of the road the run is on', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  // Resolved once per road rather than per frame, and keyed so that a player
  // who overrides «the stair» still overrides it everywhere.
  assert.match(runtime, /function branchStairVisuals\(id, side\) \{/);
  assert.match(runtime, /runtimeVisual\('system', id, 'world', stairs\[side\], 1, 0\)/);
  assert.match(runtime, /const exitVisual = \(\) => exitVisuals\[run\?\.branch\] \?\? exitVisuals\.deep;/);
  assert.match(runtime, /const ascentVisual = \(\) => ascentVisuals\[run\?\.branch\] \?\? ascentVisuals\.deep;/);
  // Nothing may reach for one fixed picture any more: the toasts, the marker
  // and the boss reward all go through the road's own stair.
  assert.doesNotMatch(runtime, /\bEXIT_PATH\b/, 'the adapter still hard-codes one stair down');
  assert.doesNotMatch(runtime, /\bASCENT_PATH\b/, 'the adapter still hard-codes one stair up');
  assert.match(runtime, /path: exitVisual\(\)\.path/);
  assert.match(runtime, /path: ascentVisual\(\)\.path/);
});

/**
 * «Давай чтобы в конце каждой ветки был свой босс.» Он там стоял с самого
 * начала — четвёртый страж лестницы, на двадцать четвёртом этаже, — и не
 * значил ничего: приз и победа были прописаны на восемнадцатом, а дальше
 * лестница вела в пустоту.
 */
test('дорога кончается дважды, и у второго конца своя руна', async () => {
  const {
    BEYOND_ROAD_DEPTH, GUARDIAN_LADDERS, STORY_DEPTH,
    canClaimFinalArtifact, chapterGuardianForDepth, roadEndingAt,
  } = await import('../tools/dcss-rpg-run.js');

  assert.equal(BEYOND_ROAD_DEPTH, 24);
  assert.equal(roadEndingAt(STORY_DEPTH), 'road');
  assert.equal(roadEndingAt(BEYOND_ROAD_DEPTH), 'beyond');
  for (const depth of [1, 6, 12, 17, 19, 23, 25, 30, 36]) {
    assert.equal(roadEndingAt(depth), null, `эт.${depth} внезапно что-то заканчивает`);
  }
  // Забрать приз можно ровно на двух глубинах и только со сбитым стражем.
  for (const depth of [STORY_DEPTH, BEYOND_ROAD_DEPTH]) {
    assert.equal(canClaimFinalArtifact({ depth, status: 'playing', bossDefeated: true }), true);
    assert.equal(canClaimFinalArtifact({ depth, status: 'playing', bossDefeated: false }), false);
    assert.equal(canClaimFinalArtifact({ depth, status: 'victory', bossDefeated: true }), false);
  }
  assert.equal(canClaimFinalArtifact({ depth: 30, status: 'playing', bossDefeated: true }), false);

  const loaded = requiredAssetPaths();
  const preview = new URL('../public/assets/dcss-preview/', import.meta.url);
  assert.deepEqual(Object.keys(BRANCH_RUNES).sort(), [...RUN_BRANCHES].sort());
  for (const branch of RUN_BRANCHES) {
    // На двадцать четвёртом каждой ветки стоит ЕЁ четвёртый страж.
    const guardian = chapterGuardianForDepth(BEYOND_ROAD_DEPTH, branch);
    assert.equal(guardian.ending, 'beyond');
    assert.equal(guardian.monsterId, GUARDIAN_LADDERS[branch][3]);
    assert.notEqual(guardian.monsterId, chapterGuardianForDepth(STORY_DEPTH, branch).monsterId);

    const rune = branchRune(branch);
    assert.ok(rune.name.ru && rune.name.en && rune.name.ru !== rune.name.en, branch);
    assert.ok(existsSync(new URL(rune.path, preview)), `${rune.path} не поставляется`);
    assert.ok(loaded.includes(rune.path), `${rune.path} не грузится`);
  }
  // Руна у каждой дороги своя: приз про место, а не про забег.
  assert.equal(BRANCH_RUNE_PATHS.length, RUN_BRANCHES.length);
  const names = RUN_BRANCHES.map((branch) => branchRune(branch).name.ru);
  assert.equal(new Set(names).size, names.length);
  assert.equal(branchRune('нет такой'), BRANCH_RUNES.deep);
});

test('лестница второго конца обещает руну, а не артефакт', async () => {
  const { contextActionModel } = await import('../tools/dcss-rpg-context-actions.js');
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  for (const language of ['ru', 'en']) {
    const road = contextActionModel({ target: { kind: 'road-end', ending: 'road' }, language });
    const beyond = contextActionModel({
      target: {
        kind: 'road-end',
        ending: 'beyond',
        prizeIcon: BRANCH_RUNES.hell.path,
        prizeName: BRANCH_RUNES.hell.name[language],
      },
      language,
    });
    assert.notEqual(beyond.name, road.name, `${language}: оба конца называются одинаково`);
    assert.equal(beyond.name, BRANCH_RUNES.hell.name[language]);
    assert.equal(beyond.icon, BRANCH_RUNES.hell.path);
    const claim = (model) => model.actions.find(({ id }) => id === 'claim');
    // Кнопка обещает тот приз, который лежит: «Забрать артефакт» над руной —
    // это враньё картинкой и словом сразу.
    assert.notEqual(claim(beyond).label, claim(road).label, `${language}: кнопка обещает одно и то же`);
    assert.ok(claim(beyond).label.length > 0 && claim(beyond).hint.length > 0);
    // Уйти глубже можно с обоих: победа остаётся выбором, а не развязкой.
    assert.ok(beyond.actions.some(({ id }) => id === 'descend'));
  }
  // Адаптер берёт приз по глубине, а не по одному зашитому артефакту.
  assert.match(runtime, /function roadPrize\(\) \{/);
  assert.match(runtime, /roadEndingAt\(dungeon\.depth\) !== 'beyond'/);
  assert.match(runtime, /const rune = branchRune\(dungeon\.branch\);/);
  assert.match(runtime, /ending: roadEndingAt\(dungeon\.depth\),/);
  assert.match(runtime, /showLootToast\(\{ path: roadPrize\(\)\.path, rarity: 3 \}/);
});

/**
 * «Чтобы адская ветка была сложной, реально <...> чтобы там другие ветки были
 * попроще, другие посложнее, и логично их нужно расставить.»
 */
test('every road is harder than the one it opens off, and hell hardest of all', () => {
  const order = ['surface', 'deep', 'vaults', 'crypt', 'hell'];
  for (const branch of order) {
    assert.ok(BRANCH_DIFFICULTY[branch] > 0, `${branch} has no difficulty`);
  }
  assert.ok(BRANCH_DIFFICULTY.surface < BRANCH_DIFFICULTY.deep, 'the open country is not the gentle one');
  assert.ok(BRANCH_DIFFICULTY.deep < BRANCH_DIFFICULTY.crypt);
  assert.equal(
    Math.max(...Object.values(BRANCH_DIFFICULTY)),
    BRANCH_DIFFICULTY.hell,
    'something is harder than hell',
  );
  assert.equal(branchDifficulty('nowhere'), 1, 'an unknown road should be ordinary');

  // And it is felt on the floor, not just written in a table: the same depth
  // on a harder road carries more.
  const crowd = (branch) => {
    let total = 0;
    for (let seed = 1; seed <= 10; seed += 1) {
      total += generateDungeon({ seed, depth: 5, branch }).monsters.length;
    }
    return total / 10;
  };
  const gentle = crowd('surface');
  const ordinary = crowd('deep');
  const worst = crowd('hell');
  assert.ok(ordinary > gentle, `the descent (${ordinary}) is no worse than the meadow (${gentle})`);
  assert.ok(worst > ordinary, `hell (${worst}) is no worse than the descent (${ordinary})`);
});

test('the runtime draws the gate and offers exactly one way through it', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const registry = await readFile(new URL('../tools/dcss-rpg-context-actions.js', import.meta.url), 'utf8');
  assert.match(runtime, /id: 'marker:branch-gate'/, 'the gate is invisible');
  assert.match(runtime, /path: dungeon\.branchGate\.path/, 'every road’s mouth looks the same');
  const finder = runtime.slice(runtime.indexOf('function nearbyBranchGate() {'));
  assert.match(finder.slice(0, finder.indexOf('\n}')), /cellStepDistance\(cell, dungeon\.branchGate\) <= 1/);
  assert.match(registry, /id: 'branch-gate',\s*\n\s*command: 'branch-gate',/);
  assert.match(runtime, /'branch-gate'\(\{ target \}\)[\s\S]{0,220}?enterBranch\(target\.value\.to\)/);
  const move = runtime.slice(runtime.indexOf('function enterBranch(branch) {'));
  const body = move.slice(0, move.indexOf('\nfunction '));
  assert.match(body, /enterBranchThroughGate\(captureRun\(\), branch\)/);
  assert.match(body, /replaceFloor\(run\.depth\)/);
  assert.match(body, /persistRun\(\);/);
});

/**
 * Дорога, с которой некуда идти дальше, — это тупик, а не дорога.
 *
 * У городских ворот игрок выбирает из трёх: пещеры, поверхность, подвалы. У
 * первых двух был выход дальше — врата ада и спуск в катакомбы, — а подвалы
 * кончались ничем: дошёл до дна и возвращайся тем же путём. Костница на
 * двенадцатом этаже это закрывает.
 *
 * Тест сторожит не саму костницу, а правило: с каждой дороги, которую
 * предлагают у ворот, должен быть ход дальше.
 */
test('с каждой дороги от городских ворот есть ход дальше', () => {
  for (const branch of ['deep', 'surface', 'vaults']) {
    const выходы = BRANCH_GATES.filter((gate) => gate.from === branch);
    assert.ok(выходы.length > 0, `с дороги «${branch}» некуда идти дальше`);
    for (const gate of выходы) {
      assert.ok(
        branchDifficulty(gate.to) > branchDifficulty(branch),
        `${gate.id} ведёт туда, где легче`,
      );
      assert.ok(Number.isInteger(gate.depth) && gate.depth >= 1 && gate.depth <= 18);
    }
  }
  // Костница: подвалы упираются в неё и выходят в катакомбы.
  const ossuary = BRANCH_GATES.find(({ id }) => id === 'ossuary-door');
  assert.ok(ossuary, 'костница пропала');
  assert.equal(ossuary.from, 'vaults');
  assert.equal(ossuary.to, 'crypt');
  assert.equal(ossuary.depth, 12);
  // И у неё своя картинка: одинаковых ворот в игре быть не должно.
  assert.equal(new Set(BRANCH_GATES.map(({ path }) => path)).size, BRANCH_GATES.length);
});

/**
 * Победа на втором конце дороги — тоже победа.
 *
 * Проверка сохранения знала один финал: восемнадцатый этаж и его хранитель.
 * Руна ветки на двадцать четвёртом объявляла победу на экране, а `persistRun`
 * молча отказывался записать такой забег — проверка считала его невозможным.
 * Игрок выигрывал и, вернувшись, обнаруживал себя живым перед той же руной.
 */
test('сейв принимает победу на обоих концах дороги', async () => {
  const { createRun, generateDungeon, validateRun } = await import('../tools/dcss-rpg-core.js');
  const { STORY_DEPTH, BEYOND_ROAD_DEPTH } = await import('../tools/dcss-rpg-run.js');

  // Забег собирается сразу на нужном этаже: состояние этажа обязано отвечать
  // тому, где герой стоит, иначе проверка отвергнет сейв ещё до статуса.
  const победа = (depth, убит = `monster-${depth}-boss`) => {
    const run = createRun(11, generateDungeon({ seed: 11, depth }));
    run.status = 'victory';
    run.floor = { ...run.floor, defeated: [убит] };
    return validateRun(run);
  };

  assert.equal(победа(STORY_DEPTH), true, 'написанная дорога перестала засчитываться');
  assert.equal(победа(BEYOND_ROAD_DEPTH), true, 'руна за концом дороги не засчитывается');
  // Без стража этажа победы нет ни там, ни там.
  assert.equal(победа(STORY_DEPTH, 'monster-18-3'), false);
  assert.equal(победа(BEYOND_ROAD_DEPTH, 'monster-24-3'), false);
  // И посреди дороги победы не бывает вовсе.
  assert.equal(победа(17), false);
  assert.equal(победа(20), false);
});
