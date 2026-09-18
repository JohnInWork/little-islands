import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ARMOR_SLOTS,
  PLAIN_REFORGE,
  REFORGE_ESSENCE_COST,
  REFORGE_IDS,
  REFORGE_KINDS,
  REFORGE_STEPS,
  WEAPON_SLOTS,
  applyReforge,
  armorSmithProfile,
  canReforge,
  nextReforge,
  reforgeFamily,
  reforgeItem,
  reforgeLabel,
  reforgeOptions,
  smithingRefusalText,
  validateReforgeState,
  weaponSmithProfile,
} from '../tools/dcss-rpg-smithing.js';
import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import {
  SKILL_CAPABILITY_LIMITS,
  SKILL_IMPLEMENTATIONS,
  SKILL_SYSTEMS,
} from '../tools/dcss-rpg-skills.js';
import { skillById } from '../tools/dcss-rpg-skill-content.js';
import { SAVE_VERSION, advanceRunFloor, createRun, validateRun } from '../tools/dcss-rpg-core.js';

const blade = () => LOOT_CATALOG.find(({ slot, stats }) => slot === 'hand1' && stats?.attack);
const coat = () => LOOT_CATALOG.find(({ slot, stats }) => slot === 'body' && stats?.defense);

test('every shape is a real trade: one number up, one number down', () => {
  for (const id of REFORGE_IDS) {
    const kind = REFORGE_KINDS[id];
    assert.ok(['weapon', 'armor'].includes(kind.family), id);
    assert.ok(reforgeLabel(id, 'ru').length > 0);
    assert.ok(reforgeLabel(id, 'en').length > 0);
    for (let rank = 1; rank <= 3; rank += 1) {
      const step = REFORGE_STEPS[id][rank];
      const values = Object.values(step);
      assert.equal(values.length, 2, `${id} moves exactly two numbers`);
      assert.ok(values.some((value) => value > 0), `${id} gives something`);
      assert.ok(values.some((value) => value < 0), `${id} takes something`);
    }
  }
  assert.equal(reforgeLabel(PLAIN_REFORGE.id, 'ru'), 'Как было');
  // The ladder pays a better smith with a cheaper fire, never a stronger one.
  assert.ok(REFORGE_ESSENCE_COST[2] <= REFORGE_ESSENCE_COST[1]);
});

test('a smith only touches what their craft covers', () => {
  assert.equal(reforgeFamily(blade()), 'weapon');
  assert.equal(reforgeFamily(coat()), 'armor');
  assert.equal(reforgeFamily(lootById('bread')), null, 'a loaf is not gear');
  for (const slot of WEAPON_SLOTS) assert.ok(typeof slot === 'string');
  for (const slot of ARMOR_SLOTS) assert.ok(typeof slot === 'string');

  const weapon = weaponSmithProfile({ weaponsmithingRank: 1 });
  const armor = armorSmithProfile({ armorsmithingRank: 1 });
  assert.deepEqual(reforgeOptions({ item: blade(), armor }).map(({ id }) => id), [], 'an armourer cannot rehang a blade');
  assert.deepEqual(reforgeOptions({ item: blade(), weapon }).map(({ id }) => id), ['heavy', 'swift']);
  assert.deepEqual(reforgeOptions({ item: coat(), armor }).map(({ id }) => id), ['plated', 'nimble']);
  assert.equal(canReforge({ item: blade(), kind: 'plated', weapon }).reason, 'wrong-shape');
  assert.equal(canReforge({ item: lootById('bread'), kind: 'heavy', weapon }).reason, 'not-gear');
  assert.equal(canReforge({ item: { ...blade(), artifactPowerId: 'echo' }, kind: 'heavy', weapon }).reason, 'artifact');
  assert.equal(canReforge({ item: blade(), kind: 'heavy', weapon: weaponSmithProfile({}) }).reason, 'rank-required');
  assert.equal(canReforge({ item: blade(), kind: 'heavy', essence: 0, weapon }).reason, 'no-essence');
  assert.equal(smithingRefusalText('no-essence'), 'Не хватает эссенции');
});

test('one button walks the ring and always comes back to plain steel', () => {
  const weapon = weaponSmithProfile({ weaponsmithingRank: 2 });
  const base = blade();
  const shapes = [];
  let item = base;
  let carried = null;
  for (let step = 0; step < 3; step += 1) {
    const next = nextReforge({ item, weapon });
    const result = reforgeItem({ item, kind: next.id, essence: 9, weapon });
    assert.equal(result.ok, true, next.id);
    shapes.push(next.id);
    carried = result.reforge;
    item = { ...applyReforge(base, { reforge: carried }), reforge: carried };
  }
  assert.deepEqual(shapes, ['heavy', 'swift', 'plain']);
  assert.equal(carried, null, 'plain steel keeps no shape at all');
  assert.deepEqual(applyReforge(base, { reforge: null }).stats, base.stats, 'and the numbers come back');

  // The trade itself, on a real blade.
  const heavy = applyReforge(base, { reforge: { kind: 'heavy', rank: 2 } });
  assert.equal(heavy.stats.attack, base.stats.attack + REFORGE_STEPS.heavy[2].attack);
  assert.ok(heavy.stats.attackSpeed < (base.stats.attackSpeed ?? 0) + 0.001);
  assert.equal(canReforge({ item: heavy, kind: 'heavy', essence: 9, weapon }).reason, 'already-shaped');
});

test(`save v${SAVE_VERSION} carries the shape, and refuses one that does not fit`, () => {
  const run = createRun(9101);
  const sword = run.items.find((item) => lootById(item.id)?.slot === 'hand1');
  assert.ok(sword, 'the hero starts with something to hammer');
  assert.equal(validateRun(run), true);

  sword.reforge = { kind: 'heavy', rank: 2 };
  assert.equal(validateRun(run), true);
  assert.deepEqual(advanceRunFloor(run).items.find(({ uid }) => uid === sword.uid).reforge, { kind: 'heavy', rank: 2 });

  sword.reforge = { kind: 'plated', rank: 2 };
  assert.equal(validateRun(run), false, 'armour shapes do not fit a blade');
  sword.reforge = { kind: 'heavy', rank: 9 };
  assert.equal(validateRun(run), false);
  sword.reforge = { kind: 'heavy' };
  assert.equal(validateRun(run), false, 'the rank is part of the record');
  delete sword.reforge;
  assert.equal(validateRun(run), true);
  assert.equal(validateReforgeState(blade(), {}), true, 'no shape is a valid shape');
});

test('both smithing skills are wired and the runtime hammers through the module', async () => {
  for (const id of ['weaponsmithing', 'armorsmithing']) {
    assert.ok(SKILL_IMPLEMENTATIONS[id], id);
    for (const system of skillById(id).requiresSystems) {
      assert.ok(SKILL_SYSTEMS.includes(system), `${system} is connected`);
    }
    for (const rank of SKILL_IMPLEMENTATIONS[id].capabilitiesByRank) {
      for (const [key, value] of Object.entries(rank)) {
        assert.ok(SKILL_CAPABILITY_LIMITS[key], `${key} has a declared limit`);
        assert.ok(Number.isInteger(value), `${key} stays an integer`);
      }
    }
  }
  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const uses = (needle) => assert.ok(source.includes(needle), needle);
  uses("from './dcss-rpg-smithing.js'");
  uses('function reforgeSelectedItem(');
  uses('function reforgeActionFor(');
  uses('applyReforge(');
  const markup = await readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8');
  assert.ok(markup.includes('id="item-detail-craft"'), 'the hammer has its own button');
});
