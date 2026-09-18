import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { isCityDepth } from '../tools/dcss-rpg-city.js';

import { contextActionModel } from '../tools/dcss-rpg-context-actions.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import {
  MAX_FINDS_PER_FLOOR,
  SECRETS_PER_FLOOR,
  SECRET_CATALOG,
  findById,
  isSecretFind,
  resolveFindInteraction,
} from '../tools/dcss-rpg-finds.js';
import { createSkillState, deriveSkillCapabilities, isSkillReady, learnSkill } from '../tools/dcss-rpg-skills.js';
import {
  BASE_REVEAL_RADIUS,
  BASE_SIGHT_RADIUS,
  darkvisionProfile,
  discoverSecrets,
  heroRevealRadius,
  heroSightRadius,
  secretSearchProfile,
  stealthNoiseRadius,
  stealthProfile,
  stealthVisionRadius,
} from '../tools/dcss-rpg-scouting.js';

function capabilitiesAt(skillId, rank) {
  let state = createSkillState(12);
  for (let step = 0; step < rank; step += 1) {
    const result = learnSkill({ state, heroLevel: 12, runStatus: 'playing', skillId, expectedRank: step });
    assert.equal(result.ok, true, `${skillId} rank ${step + 1}: ${result.reason}`);
    state = result.state;
  }
  return deriveSkillCapabilities(state);
}

test('the three scouting techniques are ready and nineteen skills now work', () => {
  for (const id of ['darkvision', 'secret-search', 'stealth']) assert.equal(isSkillReady(id), true, id);
  assert.equal(BASE_REVEAL_RADIUS, 4);
  assert.equal(BASE_SIGHT_RADIUS, 5.2);
});

test('darkvision widens the fog and the distance a creature reads at', () => {
  assert.deepEqual(darkvisionProfile({}), { rank: 0, radiusBonus: 0 });
  assert.equal(heroRevealRadius(darkvisionProfile({})), 4, 'an untrained hero keeps the base radius');
  assert.equal(heroSightRadius(darkvisionProfile({})), 5.2);
  for (const [rank, bonus] of [[1, 1], [2, 2], [3, 3]]) {
    const profile = darkvisionProfile(capabilitiesAt('darkvision', rank));
    assert.deepEqual(profile, { rank, radiusBonus: bonus });
    assert.equal(heroRevealRadius(profile), 4 + bonus);
    assert.equal(Math.round(heroSightRadius(profile) * 10) / 10, 5.2 + bonus);
  }
});

test('stealth shortens enemy sight and muffles what the hero does', () => {
  assert.deepEqual(stealthProfile({}), { rank: 0, visionPercent: 0, noisePercent: 0 });
  assert.equal(stealthVisionRadius(6, stealthProfile({})), 6, 'no skill, no difference');
  assert.equal(stealthNoiseRadius(9, stealthProfile({})), 9);
  const third = stealthProfile(capabilitiesAt('stealth', 3));
  assert.deepEqual(third, { rank: 3, visionPercent: 45, noisePercent: 65 });
  assert.equal(Math.round(stealthVisionRadius(6, third) * 100) / 100, 3.3);
  assert.equal(Math.round(stealthNoiseRadius(9, third) * 100) / 100, 3.15);
  assert.equal(stealthVisionRadius(1.4, third), 1, 'a creature always sees its own tile');
  assert.equal(stealthVisionRadius(0, third), 0);
  assert.equal(stealthNoiseRadius(0, third), 0);
  const first = stealthProfile(capabilitiesAt('stealth', 1));
  assert.ok(stealthVisionRadius(6, first) > stealthVisionRadius(6, third), 'higher ranks hide better');
});

test('a hidden stash exists on almost every floor and only a searcher sees it', () => {
  assert.equal(SECRETS_PER_FLOOR, 1);
  assert.equal(MAX_FINDS_PER_FLOOR, 5);
  assert.deepEqual(SECRET_CATALOG.map(({ id }) => id), ['buried-stash']);
  assert.equal(isSecretFind({ id: 'buried-stash' }), true);
  assert.equal(isSecretFind({ id: 'ancient-altar' }), false);
  assert.equal(findById('buried-stash').wave, 'secret');
  let placed = 0;
  let dungeonFloors = 0;
  for (let seed = 1; seed <= 200; seed += 1) {
    const depth = 1 + (seed % 9);
    // A city has no earth to bury anything under.
    if (isCityDepth(depth)) continue;
    dungeonFloors += 1;
    const level = generateDungeon({ seed, depth });
    const stashes = level.finds.filter(({ id }) => id === 'buried-stash');
    assert.ok(stashes.length <= SECRETS_PER_FLOOR);
    if (stashes.length === 0) continue;
    placed += 1;
    const [stash] = stashes;
    assert.equal(level.grid[stash.y][stash.x], '.');
    assert.ok(stash.rewardGold >= 14 + depth * 5, 'a stash is worth the point spent on it');
    assert.equal(stash.riskDamage, 0, 'a stash is safe; the cost was the skill');
    assert.equal(level.finds.filter(({ roomIndex }) => roomIndex === stash.roomIndex).length, 1);
    assert.deepEqual(generateDungeon({ seed, depth }).finds, level.finds);
  }
  assert.ok(placed > dungeonFloors * 0.85, `stash placed on ${placed} of ${dungeonFloors} dungeon floors`);
});

test('the search radius decides what is noticed, nearest first', () => {
  assert.deepEqual(secretSearchProfile({}), { rank: 0, radius: 0 });
  const profile = secretSearchProfile(capabilitiesAt('secret-search', 2));
  assert.deepEqual(profile, { rank: 2, radius: 3 });
  const hero = { x: 10, y: 10 };
  const secrets = [
    { instanceId: 'far', x: 20, y: 10 },
    { instanceId: 'near', x: 11, y: 10 },
    { instanceId: 'edge', x: 12, y: 12 },
  ];
  assert.deepEqual(discoverSecrets({ profile, hero, secrets }), ['near']);
  assert.deepEqual(
    discoverSecrets({ profile: secretSearchProfile(capabilitiesAt('secret-search', 3)), hero, secrets }),
    ['near', 'edge'],
  );
  assert.deepEqual(discoverSecrets({ profile, hero, secrets, known: ['near'] }), []);
  assert.deepEqual(discoverSecrets({ profile: secretSearchProfile({}), hero, secrets }), [], 'no skill, no secrets');
  assert.deepEqual(discoverSecrets({ profile, hero: null, secrets }), []);
});

test('digging a stash pays gold without a scratch, and only the dig action works', () => {
  const level = generateDungeon({ seed: 3, depth: 5 });
  const stash = level.finds.find(({ id }) => id === 'buried-stash');
  assert.ok(stash, 'seed 3 depth 5 carries a stash');
  const hero = { x: stash.x + 1, y: stash.y, hp: 20, maxHp: 40, power: 3, effects: {} };
  const dug = resolveFindInteraction({
    find: stash,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero,
    gold: 5,
    action: 'dig',
    actor: { gold: 5, vitals: { hp: 20, maxHp: 40, effects: {} } },
  });
  assert.equal(dug.ok, true);
  assert.equal(dug.damage, 0);
  assert.equal(dug.rewardGold, stash.rewardGold);
  assert.equal(dug.state.gold, 5 + stash.rewardGold);
  assert.deepEqual(dug.state.resolvedFindIds, [stash.instanceId]);
  const wrong = resolveFindInteraction({
    find: stash,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero,
    gold: 5,
    action: 'defile',
    actor: { gold: 5, vitals: { hp: 20, maxHp: 40, effects: {} } },
  });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, 'action');
  const model = contextActionModel({ target: { kind: 'find', ...stash }, actor: { gold: 5, vitals: {} }, language: 'ru' });
  assert.equal(model.interactionId, 'buried-stash');
  assert.equal(model.name, 'Тайник под плитой');
  assert.deepEqual(model.actions.map(({ label }) => label), ['Осмотреть', 'Раскопать']);
  assert.equal(contextActionModel({ target: { kind: 'find', ...stash }, actor: { gold: 5, vitals: {} }, language: 'en' }).actions[1].label, 'Dig out');
});

test('the runtime hides a stash until it is noticed and feeds the new radii everywhere', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /function findIsVisible\(find\) \{\s+return !isSecretFind\(find\) \|\| visibleSecretIds\.has\(find\.instanceId\);/);
  assert.match(runtime, /function refreshVisibleSecrets\(\)[\s\S]*discoverSecrets\(\{[\s\S]*profile: currentSecretSearchProfile\(\)/);
  assert.match(runtime, /updateHeroTerrain\(\);\s+refreshVisibleSecrets\(\);/);
  assert.match(runtime, /findDefinitions = createFindDefinitions\(dungeon\);\s+visibleSecretIds\.clear\(\);/);
  for (const gate of [
    /findDefinitions\s+\.filter\(findIsVisible\)/,
    /findDefinitions\.filter\(findIsVisible\)\.map\(\(find\) => \(\{/,
    /if \(!find\.resolved && findIsVisible\(find\)\)/,
  ]) {
    assert.match(runtime, gate, String(gate));
  }
  assert.match(runtime, /function currentRevealRadius\(\)[\s\S]*heroRevealRadius\(currentDarkvisionProfile\(\)\)[\s\S]*revealAround\(revealed, world, heroCell, currentRevealRadius\(\)\)/);
  assert.match(runtime, /<= heroSightRadius\(currentDarkvisionProfile\(\)\)/);
  assert.match(runtime, /stealthVisionRadius\(monster\.vision, currentStealthProfile\(\)\)[\s\S]{0,90}?distanceToHero > TILE \* sight/);
  assert.match(runtime, /const heard = stealthNoiseRadius\(radiusInTiles, currentStealthProfile\(\)\);/);
  assert.doesNotMatch(runtime, /revealAround\(revealed, world, heroCell, 4\)/, 'no hard-coded fog radius remains');
});
