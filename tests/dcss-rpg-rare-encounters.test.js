import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  RARE_ENCOUNTER_CHANCE,
  RARE_ENCOUNTER_MIN_DISTANCE,
  RARE_ENCOUNTERS,
  RARE_ENCOUNTER_KINDS,
  RARE_MONSTERS,
  RARE_MONSTER_IDS,
  RARE_MONSTER_NAMES,
  beastChanceAt,
  rareEncounterById,
  rareEncountersFor,
  rollRareEncounter,
} from '../tools/dcss-rpg-rare-encounters.js';
import {
  MONSTER_CATALOG,
  MONSTER_HABITATS,
  RUN_BRANCHES,
  monsterById,
} from '../tools/dcss-rpg-content.js';
import { createRng, generateDungeon, mixSeed } from '../tools/dcss-rpg-core.js';
import { floorScaling, monsterEligibleForFloor } from '../tools/dcss-rpg-scaling.js';
import { requiredAssetPaths } from '../tools/dcss-rpg-required-assets.js';
import { RUN_END_SOURCE_NAMES } from '../tools/dcss-rpg-run-summary.js';

const preview = new URL('../public/assets/dcss-preview/', import.meta.url);
const rngFor = (index, salt = 0x5245) => createRng(mixSeed(index, salt));

test('редкое существо — законная запись каталога, но обычный пул его не берёт', () => {
  assert.ok(RARE_MONSTERS.length >= 40, `редких всего ${RARE_MONSTERS.length}`);
  for (const monster of RARE_MONSTERS) {
    assert.equal(monster.unique, true, `${monster.id} попадёт в обычный пул`);
    assert.ok(MONSTER_HABITATS.includes(monster.habitat), monster.id);
    assert.ok(existsSync(new URL(monster.path, preview)), `${monster.id}: нет ${monster.path}`);
    assert.ok(requiredAssetPaths().includes(monster.path), `${monster.path} не грузится`);
    const name = RUN_END_SOURCE_NAMES[monster.id];
    assert.ok(name?.ru && name?.en, `${monster.id} без имени`);
    assert.equal(name.ru, RARE_MONSTER_NAMES[monster.id].ru);
    assert.equal(monsterById(monster.id)?.id, monster.id, `${monster.id} не в каталоге`);
    // Потолок тира редким не писан — на то они и редкие.
    for (const depth of [1, 5, 18]) {
      assert.equal(
        monsterEligibleForFloor(monster, floorScaling(depth)),
        false,
        `${monster.id} пролез в обычный пул на глубине ${depth}`,
      );
    }
  }
  assert.equal(new Set(RARE_MONSTER_IDS).size, RARE_MONSTER_IDS.length);
  // Профиль угрозы каталог требует уникальным, и редкие продолжают нумерацию
  // второй волны — иначе совпадения были бы делом времени.
  const threats = MONSTER_CATALOG.map(({ threat }) => JSON.stringify(threat));
  assert.equal(new Set(threats).size, threats.length, 'два одинаковых профиля угрозы');
});

test('у каждой дороги есть кого встретить, и чудовище может прийти с первого этажа', () => {
  for (const kind of RARE_ENCOUNTERS.map(({ kind }) => kind)) {
    assert.ok(RARE_ENCOUNTER_KINDS.includes(kind), kind);
  }
  for (const branch of RUN_BRANCHES) {
    const early = rareEncountersFor(branch, 2);
    const late = rareEncountersFor(branch, 18);
    assert.ok(early.some(({ kind }) => kind === 'beast'), `${branch}: чудовище не приходит рано`);
    assert.ok(early.some(({ kind }) => kind === 'named'), `${branch}: именных нет на втором этаже`);
    // Пул не растёт, а **сменяется**: слабый именной перестаёт встречаться
    // тогда же, когда перестаёт быть событием, и его место занимает следующий.
    const namedAt = (list) => list.filter(({ kind }) => kind === 'named').map(({ monsterId }) => monsterId);
    const shared = namedAt(late).filter((id) => namedAt(early).includes(id));
    assert.deepEqual(shared, [], `${branch}: на восемнадцатом те же именные, что на втором`);
    assert.ok(namedAt(late).length >= 3, `${branch}: внизу всего ${namedAt(late).length} именных`);
    // Чужая дорога своих не отдаёт.
    for (const entry of [...early, ...late]) {
      assert.ok(entry.habitat === 'any' || entry.habitat === branch, `${entry.id} на ${branch}`);
    }
  }
  assert.deepEqual(rareEncountersFor('deep', 0), []);
  assert.equal(rareEncounterById('rare:xtahua')?.monsterId, 'xtahua');
  assert.equal(rareEncounterById('нет такого'), null);
});

/**
 * Первый заход делил один бросок между всеми видами встреч, и на дороге, где
 * именных врагов ещё нет по глубине, весь бросок доставался драконам —
 * восемнадцать процентов этажей вместо «безумно редко». Шансы абсолютные.
 */
test('дракон редок одинаково на всякой дороге, и именной от него не зависит', () => {
  assert.ok(beastChanceAt(1) < beastChanceAt(18), 'глубже не опаснее');
  assert.ok(beastChanceAt(18) < 0.04, 'чудовище перестало быть редкостью');
  const N = 12000;
  for (const branch of RUN_BRANCHES) {
    for (const depth of [2, 9, 18]) {
      let beasts = 0;
      let named = 0;
      for (let index = 0; index < N; index += 1) {
        const entry = rollRareEncounter({ rng: rngFor(index, 0x5245 + depth), branch, depth });
        if (!entry) continue;
        if (entry.kind === 'beast') beasts += 1;
        else named += 1;
      }
      const beastRate = beasts / N;
      const namedRate = named / N;
      const expected = beastChanceAt(depth);
      assert.ok(
        Math.abs(beastRate - expected) < 0.008,
        `${branch}/${depth}: чудовищ ${(beastRate * 100).toFixed(2)}% вместо ${(expected * 100).toFixed(2)}%`,
      );
      assert.ok(
        Math.abs(namedRate - RARE_ENCOUNTER_CHANCE.named) < 0.03,
        `${branch}/${depth}: именных ${(namedRate * 100).toFixed(1)}%`,
      );
    }
  }
  assert.throws(() => rollRareEncounter({ branch: 'deep', depth: 1 }), TypeError);
});

test('встреча стоит на этаже, далеко от входа и не в тихой комнате', () => {
  let placed = 0;
  let floors = 0;
  for (let seed = 1; seed <= 260; seed += 1) {
    for (const depth of [2, 5, 9, 14, 18]) {
      const level = generateDungeon({ seed, depth, branch: 'deep' });
      floors += 1;
      const again = generateDungeon({ seed, depth, branch: 'deep' });
      assert.deepEqual(again.rareEncounter, level.rareEncounter, 'встреча не воспроизводится');
      if (!level.rareEncounter) continue;
      placed += 1;
      const { x, y, instanceId, monsterId } = level.rareEncounter;
      // Стоит на полу и действительно посажена — а не обещана и потеряна.
      assert.equal(level.grid[y][x], '.', 'встреча в стене');
      const spawn = level.monsters.find((monster) => monster.instanceId === instanceId);
      assert.ok(spawn, `${monsterId} обещан и не посажен`);
      assert.equal(spawn.id, monsterId);
      assert.deepEqual({ x: spawn.x, y: spawn.y }, { x, y });
      // Не под ногами на входе: у встречи должно быть время стать решением.
      const away = Math.abs(x - level.spawn.x) + Math.abs(y - level.spawn.y);
      assert.ok(away >= RARE_ENCOUNTER_MIN_DISTANCE, `встреча в ${away} шагах от входа`);
      // Комната торговца тихая нарочно.
      for (const merchant of level.merchants) {
        const room = level.rooms[merchant.roomIndex];
        const inside = x >= room.x && x < room.x + room.width
          && y >= room.y && y < room.y + room.height;
        assert.equal(inside, false, 'встреча встала в комнате торговца');
      }
      // И не на лестнице, не на вратах, не поверх чего-то ещё.
      assert.notDeepEqual({ x, y }, { x: level.exit.x, y: level.exit.y });
      if (level.branchGate) assert.notDeepEqual({ x, y }, { x: level.branchGate.x, y: level.branchGate.y });
      const here = (list) => list.filter((item) => item.x === x && item.y === y).length;
      assert.equal(here(level.finds) + here(level.loot) + here(level.events), 0, 'встреча стоит на чём-то');
      assert.equal(level.monsters.filter((m) => m.x === x && m.y === y).length, 1, 'двое в одной клетке');
    }
  }
  assert.ok(placed / floors > 0.1 && placed / floors < 0.3, `встреч ${placed} на ${floors} этажей`);
});

test('у опасной встречи есть примета, и адаптер её показывает', async () => {
  for (const entry of RARE_ENCOUNTERS) {
    const monster = RARE_MONSTERS.find(({ id }) => id === entry.monsterId);
    if (entry.kind === 'beast' || monster.tier >= 8) {
      assert.ok(entry.omen?.ru && entry.omen?.en, `${entry.id} приходит без предупреждения`);
      assert.notEqual(entry.omen.ru, entry.omen.en);
      // Примета говорит, что стоит насторожиться, и не называет, кого именно.
      assert.doesNotMatch(entry.omen.ru, new RegExp(RARE_MONSTER_NAMES[entry.monsterId].ru, 'i'));
    } else {
      assert.equal(entry.omen, null, `${entry.id} пугает зря`);
    }
  }
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /function showOmenNote\(copy\) \{/);
  assert.match(runtime, /showOmenNote\(dungeon\.rareEncounter\?\.omen\);/);
  // Показывается при входе на этаж, после того как этаж собран.
  const replace = runtime.slice(runtime.indexOf('function replaceFloor(nextDepth'));
  assert.ok(
    replace.indexOf('dungeonEnvironment = createDungeonEnvironment') < replace.indexOf('showOmenNote('),
    'примета показывается раньше, чем этаж собран',
  );
});

/**
 * Торговец стоит на 86% этажей, и до 20.09.2026 на всех этажах это был один
 * и тот же человек — тот же спрайт, что у разбойника со спуска. Лицо должно
 * принадлежать варианту и никому из врагов.
 */
test('у каждого торговца своё лицо, и ни одно не принадлежит врагу', async () => {
  const { MERCHANT_ACTOR_PATH, MERCHANT_ACTOR_PATHS, MERCHANT_VARIANTS, merchantActorPath } =
    await import('../tools/dcss-rpg-merchant.js');
  const enemies = new Set(MONSTER_CATALOG.map(({ path }) => path));
  const faces = Object.values(MERCHANT_VARIANTS).map(({ id }) => merchantActorPath(id));
  assert.equal(new Set(faces).size, faces.length, 'два варианта торговца на одно лицо');
  for (const face of [...faces, MERCHANT_ACTOR_PATH]) {
    assert.equal(enemies.has(face), false, `${face} — это лицо врага`);
    assert.ok(existsSync(new URL(face, preview)), `${face} не поставляется`);
    assert.ok(requiredAssetPaths().includes(face), `${face} не грузится`);
    assert.ok(MERCHANT_ACTOR_PATHS.includes(face), `${face} нет в списке лиц`);
  }
  // И на самих этажах стоят именно они.
  const seen = new Set();
  for (let seed = 1; seed <= 120; seed += 1) {
    for (const depth of [3, 7, 11]) {
      for (const merchant of generateDungeon({ seed, depth, branch: 'deep' }).merchants) {
        assert.equal(merchant.actorPath, merchantActorPath(merchant.variantId));
        seen.add(merchant.actorPath);
      }
    }
  }
  assert.equal(seen.size, faces.length, `на этажах встретилось ${seen.size} лиц из ${faces.length}`);
});
