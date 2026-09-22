import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { isCityDepth } from '../tools/dcss-rpg-city.js';

import { lootById } from '../tools/dcss-rpg-content.js';
import {
  PROCEDURAL_ARTIFACT_CURSES,
  PROCEDURAL_ARTIFACT_POWERS,
  artifactCursePresentation,
  eligibleArtifactPowers,
  artifactDepthOnRoad,
  guaranteedArtifactDepth,
  owesArtifact,
  materializeProceduralArtifact,
  proceduralArtifactName,
  ARTIFACT_CACHE_VARIANTS,
  ARTIFACT_MIN_DEPTH,
  cacheCanHoldArtifact,
  rollCacheArtifact,
  rollProceduralArtifact,
  validateProceduralArtifactState,
} from '../tools/dcss-rpg-artifacts.js';
import { materializeItemAffixes } from '../tools/dcss-rpg-affixes.js';
import {
  SAVE_KEY,
  SAVE_VERSION,
  createRun,
  generateDungeon,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { itemDetails } from '../tools/dcss-rpg-item-details.js';
import { generatedItemDescription } from '../tools/dcss-rpg-item-description.js';
import {
  INVISIBILITY_REVEAL_SECONDS,
  VAMPIRISM_RATIO,
  equipmentMagic,
  resolveVampiricRecovery,
} from '../tools/dcss-rpg-magic.js';
import { itemPowerScore } from '../tools/dcss-rpg-scaling.js';
import { STORY_DEPTH } from '../tools/dcss-rpg-run.js';

/**
 * The point of the catalogue is that a kind of thing has its own powers.
 *
 * Before this it did not: flight and invisibility were tagged `equipment`,
 * which is everything, so a sword had three possible powers and a helmet had
 * the same three with one swapped. Two artefacts of different kinds read the
 * same, and the generator was not combining anything.
 */
test('every kind of thing has its own powers, and enough of them to be a draw', () => {
  const idsFor = (id) => eligibleArtifactPowers(lootById(id)).map((power) => power.id);
  const sword = idsFor('long-sword');
  const helm = idsFor('iron-helm');
  const ring = idsFor('fire-ring');

  // Each kind has a real choice, not a coin toss.
  for (const [what, ids] of [['меч', sword], ['шлем', helm], ['кольцо', ring]]) {
    assert.ok(ids.length >= 4, `${what}: только ${ids.length} возможных сил`);
  }
  // And the kinds do not overlap: a sword is not a helmet with a different icon.
  assert.equal(sword.some((id) => helm.includes(id)), false, 'меч и шлем делят силу');
  assert.equal(sword.some((id) => ring.includes(id)), false, 'меч и кольцо делят силу');
  assert.equal(helm.some((id) => ring.includes(id)), false, 'шлем и кольцо делят силу');

  // The two that are about the wearer rather than the tool live on jewellery:
  // a ring of invisibility makes sense and an invisible sword does not.
  assert.ok(ring.includes('invisibility') && ring.includes('flight'));
  assert.equal(sword.includes('invisibility'), false);
  assert.ok(sword.includes('vampirism'));

  // Every power is binary or a named magnitude, and every one of them is a
  // field the aggregator actually reads — never a suffix with nothing behind it.
  for (const power of PROCEDURAL_ARTIFACT_POWERS) {
    assert.ok(power.tags.length > 0, power.id);
    assert.ok(Object.keys(power.magic).length > 0, `${power.id} обещает и ничего не делает`);
  }
  assert.ok(PROCEDURAL_ARTIFACT_CURSES.length >= 7);
  assert.equal(
    validateProceduralArtifactState(lootById('fire-ring'), { artifactPowerId: 'vampirism' }),
    false,
  );
});

test('artifact rolls are seeded, varied and use one fixed power plus at most one curse', () => {
  const item = lootById('long-sword');
  const input = { seed: 441, depth: 2, item, instanceId: 'loot-2-0', guaranteed: true };
  assert.deepEqual(rollProceduralArtifact(input), rollProceduralArtifact(input));
  const outcomes = Array.from({ length: 240 }, (_, index) => rollProceduralArtifact({
    ...input,
    instanceId: `loot-2-${index}`,
  }));
  assert.ok(new Set(outcomes.map(({ artifactPowerId }) => artifactPowerId)).size >= 3);
  assert.ok(outcomes.some(({ artifactCurseId }) => artifactCurseId));
  assert.ok(outcomes.some(({ artifactCurseId }) => artifactCurseId === null));
  assert.ok(outcomes.every(({ artifactPowerId, artifactCurseId }) => (
    typeof artifactPowerId === 'string'
    && (artifactCurseId === null || typeof artifactCurseId === 'string')
  )));
  assert.throws(() => rollProceduralArtifact({ ...input, rate: 3.01 }), /Artifact rate/);
});

test('an artifact is never lying on the floor: it is always inside a cache that cost something', () => {
  let runsWithOne = 0;
  let totalArtifacts = 0;
  let runs = 0;
  for (let seed = 1; seed <= 180; seed += 1) {
    const scheduledDepth = guaranteedArtifactDepth(seed, STORY_DEPTH);
    assert.ok(scheduledDepth >= ARTIFACT_MIN_DEPTH && scheduledDepth <= STORY_DEPTH);
    let runArtifacts = 0;
    for (let depth = 1; depth <= STORY_DEPTH; depth += 1) {
      // The city sells; it does not scatter artifacts on the street.
      if (isCityDepth(depth)) continue;
      const dungeon = generateDungeon({ seed, depth });
      // The complaint this rule answers: an artifact in the first room, free.
      assert.equal(
        dungeon.loot.filter(({ artifactPowerId }) => artifactPowerId).length,
        0,
        `seed ${seed}, floor ${depth}: an artifact was lying on the floor`,
      );
      // Read the caches the way the game does. Building them by hand here once
      // hid a real bug: `dungeon.seed` is the FLOOR seed, so the schedule
      // computed from it pointed at the wrong floor and the promise went unpaid.
      const caches = createRun(seed, dungeon).floor.chests;
      assert.equal(dungeon.artifactFloor, depth === scheduledDepth, `seed ${seed}, floor ${depth}`);
      let here = 0;
      for (const cache of caches) {
        const found = (cache.items ?? []).filter(({ artifactPowerId }) => artifactPowerId);
        assert.ok(found.length <= 1, `seed ${seed}, floor ${depth}: one cache, one artifact`);
        assert.ok(found.every(({ affixIds }) => affixIds.length === 0));
        if (found.length === 0) continue;
        // The container it came out of must be one that asked something of the
        // hero: a lock, a trap, a curse, or a mouth with teeth.
        const find = dungeon.finds.find(({ instanceId }) => instanceId === cache.findId);
        assert.ok(
          ARTIFACT_CACHE_VARIANTS.includes(find.cacheVariant),
          `seed ${seed}, floor ${depth}: artifact in a ${find.cacheVariant} cache`,
        );
        assert.ok(depth >= ARTIFACT_MIN_DEPTH, 'the first floor never holds an artifact');
        here += 1;
      }
      // The floor that owes the run its artifact always pays.
      if (depth === scheduledDepth) assert.equal(here, 1, `seed ${seed}: the promise went unpaid`);
      runArtifacts += here;
    }
    assert.ok(runArtifacts >= 1, `seed ${seed}: a run with no artifact at all`);
    if (runArtifacts === 1) runsWithOne += 1;
    totalArtifacts += runArtifacts;
    runs += 1;
  }
  // One is promised; a second is luck, not a schedule.
  assert.ok(runsWithOne / runs > 0.6, `only ${runsWithOne} of ${runs} runs found exactly one`);
  assert.ok(totalArtifacts / runs < 1.6, `artifacts are still routine: ${(totalArtifacts / runs).toFixed(2)} per run`);
});

test('the cache rule refuses every container that asked nothing of the hero', () => {
  const bases = [lootById('long-sword'), lootById('fire-ring')];
  const input = { seed: 9, depth: 4, findId: 'find-4-2', items: bases };
  assert.equal(rollCacheArtifact({ ...input, cacheVariant: 'locked', rate: 0 }), null);
  assert.equal(rollCacheArtifact({ ...input, cacheVariant: 'unlocked', guaranteed: true }), null);
  assert.equal(rollCacheArtifact({ ...input, depth: 1, cacheVariant: 'locked', guaranteed: true }), null);
  for (const variant of ARTIFACT_CACHE_VARIANTS) {
    const rolled = rollCacheArtifact({ ...input, cacheVariant: variant, guaranteed: true });
    assert.ok(rolled?.artifactPowerId, `${variant} must be able to hold one`);
  }
  // A cache with nothing wearable in it has nothing to turn into an artifact.
  assert.equal(
    rollCacheArtifact({ ...input, items: [lootById('bread-ration')], cacheVariant: 'mimic', guaranteed: true }),
    null,
  );
  assert.equal(cacheCanHoldArtifact({ depth: 4, cacheVariant: 'trapped' }), true);
  assert.equal(cacheCanHoldArtifact({ depth: 4, cacheVariant: 'unlocked' }), false);
  assert.throws(() => rollCacheArtifact({ ...input, cacheVariant: 'locked', findId: '' }), /find id/);
});

test('materialization generates gold-tier bilingual gear without handwritten item lore', () => {
  const definition = lootById('long-sword');
  const record = {
    uid: 'crimson-test',
    affixIds: [],
    artifactPowerId: 'vampirism',
    artifactCurseId: 'burden',
  };
  const item = materializeProceduralArtifact(materializeItemAffixes(definition, record), record);
  assert.equal(item.rarity, 3);
  assert.equal(item.magic.vampirism, true);
  assert.equal(item.stats.moveSpeed, (definition.stats.moveSpeed ?? 0) - 0.14);
  assert.equal(proceduralArtifactName(item, 'Длинный меч', 'ru'), 'Проклятие: Длинный меч Алой Жажды');
  assert.equal(proceduralArtifactName(item, 'Long Sword', 'en'), 'Cursed Long Sword of Crimson Thirst');
  assert.deepEqual(artifactCursePresentation(item, 'ru'), {
    id: 'burden', label: 'Тяжесть', text: '−14% скорости движения',
  });
  assert.equal(itemDetails(item, 'ru').rarity, 'Артефакт');
  assert.match(generatedItemDescription(item, 'ru').summary, /Вампиризм.*Проклятие: Тяжесть/);
  assert.match(generatedItemDescription(item, 'en').summary, /Vampirism.*Curse: Burden/);
  assert.ok(itemPowerScore(item) > itemPowerScore({ ...item, rarity: 0, magic: undefined }));
});

test('equipped artifact powers derive once and vampirism heals only real dealt damage', () => {
  const flight = { uid: 'flight', magic: { flight: true } };
  const hidden = { uid: 'hidden', magic: { invisibility: true } };
  const blade = { uid: 'blade', magic: { vampirism: true } };
  const magic = equipmentMagic(
    { boots: 'flight', ring1: 'hidden', hand1: 'blade' },
    [flight, hidden, blade],
  );
  assert.equal(magic.flight, true);
  assert.equal(magic.invisibility, true);
  assert.equal(magic.vampirism, true);
  assert.equal(VAMPIRISM_RATIO, 0.2);
  assert.equal(INVISIBILITY_REVEAL_SECONDS, 3);
  // Ответ несёт и остаток секундной копилки; без неё он бесконечен, и правило
  // работает как прежде — это нужно тем, кто считает один удар вне времени.
  assert.deepEqual(
    resolveVampiricRecovery({ hp: 40, maxHp: 100, damage: 27, magic }),
    { hp: 45, healed: 5, budget: Infinity },
  );
  assert.deepEqual(
    resolveVampiricRecovery({ hp: 99, maxHp: 100, damage: 27, magic }),
    { hp: 100, healed: 1, budget: Infinity },
  );
  assert.deepEqual(
    resolveVampiricRecovery({ hp: 40, maxHp: 100, damage: 27, magic: { vampirism: false } }),
    { hp: 40, healed: 0, budget: Infinity },
  );
});

test('v21 artifacts and gold migrate while v20 hidden sanctity is discarded', () => {
  const legacyArtifactRun = createRun(2121);
  legacyArtifactRun.version = 21;
  legacyArtifactRun.shards = 13;
  delete legacyArtifactRun.gold;
  const blade = legacyArtifactRun.items.find(({ uid }) => uid === 'starter-sword');
  blade.artifactPowerId = 'vampirism';
  blade.artifactCurseId = 'frailty';
  legacyArtifactRun.hero.hp = 82;
  const artifactMigration = migrateLegacyRun(legacyArtifactRun);
  const migratedArtifact = artifactMigration.items.find(({ uid }) => uid === 'starter-sword');
  assert.equal(SAVE_VERSION, 51);
  assert.equal(SAVE_KEY, 'dng-codex:rpg:v51');
  assert.equal(artifactMigration.gold, 13);
  assert.equal(Object.hasOwn(artifactMigration, 'shards'), false);
  assert.equal(migratedArtifact.artifactPowerId, 'vampirism');
  assert.equal(migratedArtifact.artifactCurseId, 'frailty');
  assert.equal(validateRun(artifactMigration), true);

  const legacy = createRun(2020);
  legacy.version = 20;
  legacy.generatorVersion = 5;
  legacy.contentVersion = 10;
  for (const item of legacy.items) {
    delete item.artifactPowerId;
    delete item.artifactCurseId;
  }
  const oldBlade = legacy.items.find(({ uid }) => uid === 'starter-sword');
  oldBlade.affixIds = ['forceful'];
  oldBlade.sanctity = 'cursed';
  oldBlade.sanctityKnown = false;
  const migrated = migrateLegacyRun(legacy);
  const migratedBlade = migrated.items.find(({ uid }) => uid === 'starter-sword');
  assert.deepEqual(migratedBlade.affixIds, ['forceful']);
  assert.equal(Object.hasOwn(migratedBlade, 'sanctity'), false);
  assert.equal(Object.hasOwn(migratedBlade, 'sanctityKnown'), false);
  assert.equal(migratedBlade.artifactPowerId, null);
  assert.equal(migratedBlade.artifactCurseId, null);
  assert.equal(validateRun(migrated), true);
});

test('runtime connects every artefact power to movement, AI and combat', () => {
  const runtime = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /world\[y\]\[x\] === '\.' \|\| world\[y\]\[x\] === '~'/, 'water is walkable for everyone; flight only skips the wet penalty');
  assert.match(runtime, /event\.id === 'blade-trap' && currentHeroMagic\(\)\.flight/);
  assert.match(runtime, /function isHeroConcealed\(\)/);
  assert.match(runtime, /hero\.invisibilityReveal = INVISIBILITY_REVEAL_SECONDS/);
  assert.match(runtime, /if \(isHeroConcealed\(\)\)[\s\S]*monster\.alerted = 0/);
  assert.match(runtime, /resolveVampiricRecovery\(\{/);
  // A hero hit carries what the weapon IS, one snapshot taken when the blow is
  // thrown, instead of a row of booleans that grows with every new power.
  assert.match(runtime, /weaponMagic: pending\.weaponMagic/);
  assert.match(runtime, /weaponMagic: projectile\.weaponMagic/);
  /*
   * Запрещён именно прежний булев флаг на герое, а не слово целиком: копилка
   * вампиризма — `vampiricPool` — как раз и живёт в адаптере, потому что она
   * про время, а не про предмет.
   */
  assert.doesNotMatch(runtime, /hero\.vampiric|heroVampiric|isVampiric/, 'the old single-purpose flag is gone');
  // And the powers are read where damage actually lands.
  assert.match(runtime, /function applyWeaponPowers\(/);
  assert.match(runtime, /applyWeaponPowers\(monster, \{ dealt, weaponMagic/);
  assert.match(runtime, /function executionDamage\(/);
});

/**
 * One artefact was owed per run while a run had an end. The descent does not
 * have one any more, so the debt is owed once per road: floors one to eighteen
 * owe one, nineteen to thirty-six owe the next, and so on down. A hero who
 * never leaves is not walking through a desert, and a hero who goes four times
 * as deep does not collect four times the luck — the schedule is a promise, not
 * a rate.
 */
test('the artefact is promised once per road, however many roads a hero walks', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    for (let road = 0; road < 5; road += 1) {
      const owed = [];
      for (let step = 1; step <= STORY_DEPTH; step += 1) {
        const depth = road * STORY_DEPTH + step;
        if (owesArtifact(seed, depth, STORY_DEPTH)) owed.push(depth);
      }
      assert.equal(owed.length, 1, `seed ${seed}, road ${road}: owed ${owed.length}`);
      assert.ok(owed[0] >= road * STORY_DEPTH + ARTIFACT_MIN_DEPTH, 'never on the road’s first floor');
    }
    // And the second road does not repeat the first one's floor for everyone.
    assert.equal(owesArtifact(seed, 0, STORY_DEPTH), false, 'the city owes nothing');
    assert.equal(owesArtifact(seed, 1, STORY_DEPTH), false, 'nor does the first floor');
  }
  const secondRoadFloors = new Set(
    Array.from({ length: 300 }, (_v, index) => artifactDepthOnRoad(index + 1, STORY_DEPTH + 1, STORY_DEPTH)),
  );
  assert.ok(secondRoadFloors.size > 8, 'every hero would find the second one on the same floor');
});

/**
 * Сапоги Лёгкого Шага — единственная вещь в игре, которая ускоряет героя.
 *
 * Скорость задумывалась заклинанием грозовой школы, потом числом на любой
 * вещи — Иван остановил и то и другое: «нет, флагом. Это уникальное свойство
 * типа сапоги, быстрой скорости. Это артефакт, он очень крутой». Отсюда три
 * требования, которые и проверяются: свойство есть только на сапогах, оно
 * булево (вторая пара ничего не прибавит), и прибавка одна на всю игру.
 */
test('лёгкий шаг живёт только на сапогах и ничего не складывает', async () => {
  const { LOOT_CATALOG } = await import('../tools/dcss-rpg-content.js');
  const { SWIFT_STEP_PERCENT, equipmentMagic, MAGIC_MAGNITUDES } = await import('../tools/dcss-rpg-magic.js');

  const power = PROCEDURAL_ARTIFACT_POWERS.find(({ id }) => id === 'swift-step');
  assert.ok(power, 'силы нет вовсе');
  assert.deepEqual([...power.tags], ['boots'], 'скорость может выпасть не на сапогах');
  assert.deepEqual(power.magic, { swiftness: true }, 'свойство перестало быть флагом');
  assert.equal(MAGIC_MAGNITUDES.includes('swiftness'), false, 'флаг попал в числовые свойства');

  const boots = LOOT_CATALOG.filter(({ slot }) => slot === 'boots');
  assert.ok(boots.length >= 5, 'сапог в каталоге слишком мало, чтобы сила находилась');
  for (const item of boots) {
    assert.ok(eligibleArtifactPowers(item).some(({ id }) => id === 'swift-step'), item.id);
  }
  for (const item of LOOT_CATALOG.filter(({ slot }) => slot && slot !== 'boots')) {
    assert.equal(
      eligibleArtifactPowers(item).some(({ id }) => id === 'swift-step'),
      false,
      `${item.id}: скорость выпала не на сапогах`,
    );
  }

  // Флаг не копится: две вещи со свойством дают ровно столько же, сколько одна.
  const one = equipmentMagic({ boots: 'a' }, [{ uid: 'a', magic: { swiftness: true } }]);
  const two = equipmentMagic(
    { boots: 'a', cloak: 'b' },
    [{ uid: 'a', magic: { swiftness: true } }, { uid: 'b', magic: { swiftness: true } }],
  );
  assert.equal(one.swiftness, true);
  assert.equal(two.swiftness, one.swiftness);
  assert.ok(SWIFT_STEP_PERCENT > 0 && SWIFT_STEP_PERCENT <= 30, 'прибавка вне разумного');

  // Переходник умножает скорость на неё и ни на что больше.
  const runtime = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /return currentHeroMagic\(\)\.swiftness \? 1 \+ SWIFT_STEP_PERCENT \/ 100 : 1;/);
  assert.match(runtime, /heroSwiftness\(\) \*\n\s*currentConditions\(\)\.heroSpeedScale/);
});
