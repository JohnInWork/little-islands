import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  BAIT_SECONDS,
  COATING_HITS,
  COATING_SECONDS,
  POISON_BAIT_ITEM_ID,
  POISON_VIAL_ITEM_ID,
  baitImpact,
  canCoat,
  canPlaceBait,
  coatWeapon,
  createCoatingState,
  poisonProfile,
  poisonRefusalText,
  spendCoating,
  validateCoatingState,
} from '../tools/dcss-rpg-poisoncraft.js';
import {
  BAIT_POISON_SECONDS,
  PLACED_TRAP_KINDS,
  PLAYER_BAIT_KIND,
  placePlayerTrap,
  triggerPlayerTrap,
  validPlacedTrap,
} from '../tools/dcss-rpg-player-traps.js';
import { lootById } from '../tools/dcss-rpg-content.js';
import {
  SKILL_CAPABILITY_LIMITS,
  SKILL_IMPLEMENTATIONS,
  SKILL_SYSTEMS,
} from '../tools/dcss-rpg-skills.js';
import { skillById } from '../tools/dcss-rpg-skill-content.js';
import { SAVE_VERSION, advanceRunFloor, createRun, validateRun } from '../tools/dcss-rpg-core.js';

const blade = { slot: 'hand1' };

test('a coating is a handful of strikes, not a bigger number', () => {
  assert.deepEqual(poisonProfile({}), { rank: 0, hits: 0, seconds: 0, baitSeconds: 0 });
  assert.equal(canCoat({ weapon: blade, profile: poisonProfile({}), vials: 9 }).reason, 'rank-required');

  const profile = poisonProfile({ poisoncraftRank: 2 });
  assert.equal(profile.hits, COATING_HITS[2]);
  assert.equal(profile.seconds, COATING_SECONDS[2]);
  assert.equal(canCoat({ weapon: null, profile, vials: 1 }).reason, 'no-weapon');
  assert.equal(canCoat({ weapon: blade, profile, vials: 0 }).reason, 'no-vial');
  assert.equal(
    canCoat({ weapon: blade, profile, vials: 1, coating: { hits: 2, seconds: 4 } }).reason,
    'already-coated',
  );
  assert.equal(poisonRefusalText('no-vial'), 'Нужен флакон яда');

  const coated = coatWeapon({ weapon: blade, profile, vials: 1 });
  assert.equal(coated.ok, true);
  assert.deepEqual(coated.coating, { hits: COATING_HITS[2], seconds: COATING_SECONDS[2] });

  // Every strike spends one charge, and the last one leaves the edge clean.
  let coating = coated.coating;
  for (let hit = 1; hit <= COATING_HITS[2]; hit += 1) {
    const spent = spendCoating(coating);
    assert.equal(spent.applied, true, `hit ${hit}`);
    assert.equal(spent.seconds, COATING_SECONDS[2]);
    coating = spent.coating;
  }
  assert.equal(coating, null, 'the venom runs out');
  assert.equal(spendCoating(coating).applied, false);
  assert.ok(poisonProfile({ poisoncraftRank: 3 }).hits > profile.hits);
});

test('the bait is a placed thing that bites with venom instead of steel', () => {
  assert.deepEqual([...PLACED_TRAP_KINDS], ['jaw', 'bait']);
  assert.equal(lootById(POISON_BAIT_ITEM_ID).placeableTrap, PLAYER_BAIT_KIND);
  assert.equal(lootById(POISON_VIAL_ITEM_ID).useEffect.type, 'coat');
  assert.equal(canPlaceBait({ profile: poisonProfile({}), baits: 1 }).reason, 'rank-required');
  assert.equal(canPlaceBait({ profile: poisonProfile({ poisoncraftRank: 1 }), baits: 0 }).reason, 'no-bait');
  assert.equal(baitImpact(poisonProfile({ poisoncraftRank: 2 })).seconds, BAIT_SECONDS[2]);

  const grid = ['#####', '#...#', '#...#', '#####'].map((row) => [...row]);
  const placed = placePlayerTrap({
    runStatus: 'playing',
    depth: 1,
    hero: { x: 2, y: 1, hp: 10 },
    target: { x: 2, y: 2 },
    capabilities: { poisoncraftRank: 2, trapPlacementTier: 0 },
    itemCount: 2,
    grid,
    revealedCells: ['2,2'],
    kind: PLAYER_BAIT_KIND,
  });
  assert.equal(placed.ok, true, 'a poisoner needs no trapping skill');
  assert.equal(placed.trap.kind, PLAYER_BAIT_KIND);
  assert.equal(placed.event.itemId, POISON_BAIT_ITEM_ID);
  assert.equal(validPlacedTrap(placed.trap, 1), true, 'and the save will accept it');

  // The same hands cannot lay a jaw trap without the trapper's craft.
  assert.equal(
    placePlayerTrap({
      runStatus: 'playing',
      depth: 1,
      hero: { x: 2, y: 1, hp: 10 },
      target: { x: 2, y: 2 },
      capabilities: { poisoncraftRank: 2, trapPlacementTier: 0 },
      itemCount: 2,
      grid,
      revealedCells: ['2,2'],
    }).reason,
    'skill-required',
  );

  const bitten = triggerPlayerTrap({
    trap: placed.trap,
    target: { instanceId: 'monster-1-1', ownerId: 'monster:1', hp: 20 },
  });
  assert.equal(bitten.ok, true);
  assert.equal(bitten.poisonSeconds, BAIT_POISON_SECONDS[2]);
  assert.ok(bitten.damage <= 2, 'a bait is venom, not a blade');
  assert.equal(bitten.trap.state, 'spent');
});

test(`save v${SAVE_VERSION} carries the venom on the blade`, () => {
  const run = createRun(6001);
  assert.equal(run.hero.coating, null);
  assert.equal(validateRun(run), true);

  run.hero.coating = { hits: 4, seconds: 6 };
  assert.equal(validateRun(run), true);
  assert.deepEqual(advanceRunFloor(run).hero.coating, { hits: 4, seconds: 6 }, 'it goes down the stairs');

  assert.equal(validateCoatingState(null), true);
  assert.equal(validateCoatingState({ hits: 0, seconds: 4 }), false, 'a spent coating is no coating');
  assert.equal(validateCoatingState({ hits: 4 }), false);
  assert.equal(validateCoatingState({ hits: 4, seconds: 4, kind: 'venom' }), false);
  assert.equal(createCoatingState({ hits: 4, seconds: 0 }), null);
  assert.equal(validateRun({ ...run, hero: { ...run.hero, coating: { hits: -1, seconds: 4 } } }), false);
});

test('Poisoncraft is wired to both of its systems and to the runtime', async () => {
  assert.ok(SKILL_IMPLEMENTATIONS.poisoncraft);
  for (const system of skillById('poisoncraft').requiresSystems) {
    assert.ok(SKILL_SYSTEMS.includes(system), `${system} is connected`);
  }
  assert.deepEqual(SKILL_CAPABILITY_LIMITS.poisoncraftRank, [0, 3]);

  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const uses = (needle) => assert.ok(source.includes(needle), needle);
  uses("from './dcss-rpg-poisoncraft.js'");
  uses('function applyWeaponCoating(');
  uses("effect?.type === 'coat'");
  uses('kind: item.id === POISON_BAIT_ITEM_ID ? PLAYER_BAIT_KIND : PLAYER_TRAP_KIND,');
  uses('result.poisonSeconds > 0');
});
