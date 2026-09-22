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
  HERO_REVEAL_RADIUS,
  HERO_SIGHT_RADIUS,
  discoverSecrets,
  secretSearchProfile,
  stealthNoiseRadius,
  stealthProfile,
  stealthVisionRadius,
} from '../tools/dcss-rpg-scouting.js';

function capabilitiesAt(skillId, rank) {
  let state = createSkillState(12);
  for (let step = 0; step < rank; step += 1) {
    const result = learnSkill({ state, heroLevel: 12, runStatus: 'playing', skillId, expectedRank: step, attributes: { strength: 40, agility: 40, intelligence: 40 } });
    assert.equal(result.ok, true, `${skillId} rank ${step + 1}: ${result.reason}`);
    state = result.state;
  }
  return deriveSkillCapabilities(state);
}

test('the two scouting techniques are ready and the radius is one number', () => {
  for (const id of ['secret-search', 'stealth']) assert.equal(isSkillReady(id), true, id);
  assert.equal(HERO_REVEAL_RADIUS, 4);
  assert.equal(HERO_SIGHT_RADIUS, 5.2);
});

/**
 * Темнозрения нет, и прибавлять к радиусу больше нечему.
 *
 * Навык давал одну-три клетки сверх зрения, шлем «совиный глаз» — ещё две.
 * Обещал он «вижу в темноте», а темноты как признака в игре нет: есть туман
 * неизвестного и вуаль поверх видимого. Иван: «убираем просто вообще такой
 * эффект из игры, это лишнее» — и радиус стал числом, а не суммой.
 */
test('темнозрения нет ни в навыках, ни в силах вещей', async () => {
  const scouting = await import('../tools/dcss-rpg-scouting.js');
  assert.equal('darkvisionProfile' in scouting, false, 'разведка всё ещё считает темнозрение');
  const { skillById } = await import('../tools/dcss-rpg-skill-content.js');
  assert.equal(skillById('darkvision'), null, 'навык всё ещё в списке');
  const { PROCEDURAL_ARTIFACT_POWERS } = await import('../tools/dcss-rpg-artifacts.js');
  assert.equal(
    PROCEDURAL_ARTIFACT_POWERS.some(({ id }) => id === 'darkvision'), false, 'совиный глаз всё ещё падает',
  );
  const { MAGIC_MAGNITUDES } = await import('../tools/dcss-rpg-magic.js');
  assert.equal(MAGIC_MAGNITUDES.includes('darkvision'), false, 'свойство вещи всё ещё читают');
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
  assert.deepEqual(model.actions.map(({ label }) => label), ['Раскопать']);
  assert.equal(contextActionModel({ target: { kind: 'find', ...stash }, actor: { gold: 5, vitals: {} }, language: 'en' }).actions[0].label, 'Dig out');
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
  /*
   * Что видно — то и разведано.
   *
   * Радиус памяти был меньше радиуса зрения, и между ними жила полоса: клетку
   * видно на экране, а игра считает её неразведанной. Тычок туда не делал
   * ничего, а путь мимо неё уходил в обход по освещённому. Теперь память
   * считается по зрению, и полосы нет.
   */
  assert.match(runtime, /function currentRevealRadius\(\)[\s\S]*HERO_SIGHT_RADIUS[\s\S]*revealAround\(revealed, world, heroCell, currentRevealRadius\(\)\)/);
  assert.match(runtime, /<= HERO_SIGHT_RADIUS/);
  assert.match(runtime, /stealthVisionRadius\(monster\.vision, currentStealthProfile\(\)\)[\s\S]{0,90}?distanceToHero > TILE \* sight/);
  assert.match(runtime, /const heard = stealthNoiseRadius\(radiusInTiles, currentStealthProfile\(\)\)[\s\S]{0,140}?magic\.clamour/);
  assert.doesNotMatch(runtime, /revealAround\(revealed, world, heroCell, 4\)/, 'no hard-coded fog radius remains');
});
