import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { LOOT_CATALOG } from '../tools/dcss-rpg-content.js';
import { equipmentVisualProblems } from '../tools/dcss-rpg-equipment-visuals.js';
import { assertEquipmentCatalog } from '../tools/dcss-rpg-rules.js';
import { SKILL_CATALOG } from '../tools/dcss-rpg-skill-content.js';
import {
  createSkillState,
  deriveSkillCapabilities,
  isSkillReady,
  learnSkill,
} from '../tools/dcss-rpg-skills.js';
import { applyStrikeBonus, daggerProfile, isBehindTarget, resolveDaggerStrike } from '../tools/dcss-rpg-daggers.js';
import {
  armorBreakMultiplier,
  bluntProfile,
  refreshArmorBreak,
  resolveBluntStrike,
  tickArmorBreak,
} from '../tools/dcss-rpg-blunt.js';
import { interceptionDamage, spearInterception, spearProfile } from '../tools/dcss-rpg-spears.js';
import {
  accumulateSteadiness,
  marksmanProfile,
  resolveMarksmanShot,
  selectPiercedTargets,
} from '../tools/dcss-rpg-marksmanship.js';
import { dodgeSpeedMultiplier, mobilityProfile, refreshDodgeBoost, tickDodgeBoost } from '../tools/dcss-rpg-mobility.js';

const TECHNIQUES = ['daggers', 'blunt-weapons', 'spears', 'marksmanship', 'mobility'];

/** Capabilities of a hero who trained the given techniques to the given ranks. */
function capabilitiesFor(...trained) {
  let state = createSkillState(12);
  for (const [skillId, rank] of trained) {
    for (let step = 0; step < rank; step += 1) {
      const result = learnSkill({ state, heroLevel: 12, runStatus: 'playing', skillId, expectedRank: step });
      assert.equal(result.ok, true, `${skillId} rank ${step + 1}: ${result.reason}`);
      state = result.state;
    }
  }
  // Capabilities are zero-filled for every key, so two separate hero states can
  // never be merged with a spread: train one hero in everything instead.
  return deriveSkillCapabilities(state);
}

const capabilitiesAt = (skillId, rank) => capabilitiesFor([skillId, rank]);

const weaponOf = (family) => LOOT_CATALOG.find((item) => item.weaponFamily === family);

test('all five weapon techniques are ready and every family they need has real weapons', () => {
  for (const id of TECHNIQUES) {
    assert.equal(isSkillReady(id), true, id);
    assert.equal(SKILL_CATALOG.find((skill) => skill.id === id).category, 'combat');
  }
  const counts = new Map();
  for (const item of LOOT_CATALOG) {
    if (!item.weaponFamily) continue;
    counts.set(item.weaponFamily, (counts.get(item.weaponFamily) ?? 0) + 1);
  }
  for (const family of ['dagger', 'blunt', 'spear', 'bow']) {
    assert.ok(counts.get(family) >= 2, `${family} has ${counts.get(family) ?? 0} weapons`);
  }
  assert.doesNotThrow(() => assertEquipmentCatalog(LOOT_CATALOG));
  assert.deepEqual(equipmentVisualProblems(LOOT_CATALOG), []);
});

test('a technique only answers to its own family, and rank zero is silent', () => {
  const caps = capabilitiesFor(['daggers', 3], ['blunt-weapons', 3]);
  assert.equal(daggerProfile(weaponOf('dagger'), caps).rank, 3);
  assert.equal(daggerProfile(weaponOf('sword'), caps).rank, 0, 'a sword never ambushes');
  assert.equal(daggerProfile(null, caps).rank, 0);
  assert.equal(bluntProfile(weaponOf('blunt'), caps).rank, 3);
  assert.equal(bluntProfile(weaponOf('axe'), caps).rank, 0);
  assert.equal(daggerProfile(weaponOf('dagger'), {}).rank, 0, 'an untrained hero gets nothing');
  assert.equal(spearProfile(weaponOf('spear'), capabilitiesAt('spears', 1)).reach, weaponOf('spear').combat.range);
  assert.equal(marksmanProfile(weaponOf('bow'), capabilitiesAt('marksmanship', 1)).rank, 1);
  assert.equal(marksmanProfile(weaponOf('spear'), capabilitiesAt('marksmanship', 3)).rank, 0);
});

test('daggers pay for surprise and for standing behind, never for a fair duel', () => {
  const profile = daggerProfile(weaponOf('dagger'), capabilitiesAt('daggers', 2));
  assert.deepEqual(profile, { rank: 2, ambushPercent: 95, backstabPercent: 40 });
  const unaware = resolveDaggerStrike({ profile, awareOfAttacker: false, attackerX: 5, targetX: 0, targetFacing: 1 });
  assert.deepEqual(unaware, { percent: 95, kind: 'ambush' }, 'an unaware target is an ambush from any side');
  const behind = resolveDaggerStrike({ profile, attackerX: 0, targetX: 10, targetFacing: 1 });
  assert.deepEqual(behind, { percent: 40, kind: 'backstab' });
  const front = resolveDaggerStrike({ profile, attackerX: 20, targetX: 10, targetFacing: 1 });
  assert.deepEqual(front, { percent: 0, kind: null });
  assert.equal(isBehindTarget({ attackerX: 10, targetX: 10, facing: 1 }), false, 'the same tile is not behind');
  assert.equal(isBehindTarget({ attackerX: 0, targetX: 10, facing: 0 }), false);
  assert.equal(applyStrikeBonus(10, 95), 20);
  assert.equal(applyStrikeBonus(1, 40), 1, 'a bonus never rounds a hit down');
  assert.equal(applyStrikeBonus(0, 95), 0);
  assert.equal(resolveDaggerStrike({ profile: daggerProfile(weaponOf('sword'), {}) }).percent, 0);
});

test('blunt weapons break armour for everyone and hold a windup from the second rank', () => {
  const first = bluntProfile(weaponOf('blunt'), capabilitiesAt('blunt-weapons', 1));
  assert.equal(resolveBluntStrike({ profile: first, targetWindingUp: true }).interrupt, false, 'rank one only bruises');
  const second = bluntProfile(weaponOf('blunt'), capabilitiesAt('blunt-weapons', 2));
  const held = resolveBluntStrike({ profile: second, targetWindingUp: true });
  assert.equal(held.interrupt, true);
  assert.equal(held.stunSeconds, 0.2);
  assert.equal(resolveBluntStrike({ profile: second, targetWindingUp: false }).interrupt, false, 'nothing to interrupt');
  const third = bluntProfile(weaponOf('blunt'), capabilitiesAt('blunt-weapons', 3));
  const outcome = resolveBluntStrike({ profile: third, targetWindingUp: true });
  assert.equal(outcome.stunSeconds, 0.5);
  let mark = refreshArmorBreak(null, outcome);
  assert.deepEqual(mark, { percent: 30, remaining: 6 });
  assert.equal(armorBreakMultiplier(mark), 1.3);
  mark = refreshArmorBreak(mark, resolveBluntStrike({ profile: first }));
  assert.deepEqual(mark, { percent: 30, remaining: 6 }, 'a weaker hit never lowers the mark');
  mark = tickArmorBreak(mark, 5.5);
  assert.equal(Math.round(mark.remaining * 10) / 10, 0.5);
  assert.equal(tickArmorBreak(mark, 1), null, 'the mark heals over');
  assert.equal(armorBreakMultiplier(null), 1);
  assert.equal(refreshArmorBreak(null, { armorBreakPercent: 0, armorBreakSeconds: 0 }), null);
});

test('a spear answers the step into its reach, once per creature per cooldown', () => {
  const profile = spearProfile(weaponOf('spear'), capabilitiesAt('spears', 2));
  assert.equal(profile.reach, 2);
  const entering = spearInterception({ profile, previousDistance: 2.6, distance: 1.8 });
  assert.deepEqual(entering, { triggered: true, damagePercent: 75, holdSeconds: 0.35, cooldownSeconds: 2.6 });
  assert.equal(spearInterception({ profile, previousDistance: 1.9, distance: 1.4 }).triggered, false, 'already inside');
  assert.equal(spearInterception({ profile, previousDistance: 4, distance: 3 }).triggered, false, 'still out of reach');
  assert.equal(
    spearInterception({ profile, previousDistance: 2.6, distance: 1.8, cooldownRemaining: 0.4 }).triggered,
    false,
    'the thrust is on cooldown',
  );
  assert.equal(spearInterception({ profile: spearProfile(weaponOf('sword'), {}), previousDistance: 9, distance: 1 }).triggered, false);
  assert.equal(interceptionDamage(9, 75), 7);
  assert.equal(interceptionDamage(1, 55), 1, 'a thrust always lands for something');
  assert.equal(interceptionDamage(9, 0), 0);
});

test('a bow rewards stillness and, from the second rank, the rank behind the target', () => {
  const profile = marksmanProfile(weaponOf('bow'), capabilitiesAt('marksmanship', 3));
  assert.deepEqual(profile, { rank: 3, aimSeconds: 0.8, aimBonusPercent: 90, pierceTargets: 2 });
  assert.equal(accumulateSteadiness(0.5, 0.2, false), 0.7);
  assert.equal(accumulateSteadiness(0.9, 0.2, true), 0, 'one step empties the aim');
  assert.equal(accumulateSteadiness(9.9, 5, false), 10, 'and it never grows without bound');
  assert.deepEqual(resolveMarksmanShot({ profile, steadySeconds: 0.3 }), { aimed: false, bonusPercent: 0, pierceTargets: 2 });
  assert.deepEqual(resolveMarksmanShot({ profile, steadySeconds: 0.8 }), { aimed: true, bonusPercent: 90, pierceTargets: 2 });
  assert.equal(resolveMarksmanShot({ profile: marksmanProfile(weaponOf('bow'), capabilitiesAt('marksmanship', 1)), steadySeconds: 9 }).pierceTargets, 0);
  const origin = { x: 0, y: 0 };
  const target = { x: 3, y: 0, instanceId: 'front' };
  const line = selectPiercedTargets({
    origin,
    target,
    candidates: [
      { x: 7, y: 0, instanceId: 'far' },
      { x: 4, y: 3, instanceId: 'aside' },
      { x: 5, y: 0.2, instanceId: 'near' },
      { x: 1, y: 0, instanceId: 'behind-the-shooter' },
      { x: 6, y: 0, instanceId: 'dead', dead: 0.4 },
    ],
    pierceTargets: 2,
  });
  assert.deepEqual(line.map(({ instanceId }) => instanceId), ['near', 'far']);
  assert.deepEqual(selectPiercedTargets({ origin, target, candidates: [{ x: 5, y: 0 }], pierceTargets: 0 }), []);
  assert.deepEqual(selectPiercedTargets({ origin, target: null, candidates: [], pierceTargets: 2 }), []);
});

test('mobility turns a read telegraph into speed, with a ceiling', () => {
  const profile = mobilityProfile(capabilitiesAt('mobility', 3));
  assert.deepEqual(profile, { rank: 3, speedPercent: 45, seconds: 2 });
  assert.equal(mobilityProfile({}).rank, 0);
  const boost = refreshDodgeBoost(0, profile);
  assert.equal(boost, 2);
  assert.equal(dodgeSpeedMultiplier(boost, profile), 1.45);
  assert.equal(dodgeSpeedMultiplier(0, profile), 1, 'no dodge, no burst');
  assert.equal(refreshDodgeBoost(3.5, profile), 3.5, 'a fresh dodge never shortens a longer burst');
  assert.equal(refreshDodgeBoost(9, profile), 4, 'and the burst is capped');
  assert.equal(tickDodgeBoost(2, 0.5), 1.5);
  assert.equal(tickDodgeBoost(0.2, 0.5), 0);
});

test('the runtime carries every technique from the equipped weapon to the blow', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  for (const bridge of ['currentDaggerProfile', 'currentBluntProfile', 'currentSpearProfile', 'currentMarksmanProfile', 'currentMobilityProfile']) {
    assert.match(runtime, new RegExp(`function ${bridge}\\(`), bridge);
  }
  assert.match(runtime, /dagger: currentDaggerProfile\(\),\s+blunt: currentBluntProfile\(\),\s+marksman: currentMarksmanProfile\(\),/);
  assert.match(runtime, /awareOfAttacker: \(monster\.alerted \?\? 0\) > 0/, 'an ambush needs a creature that has not noticed the hero');
  assert.match(runtime, /primaryDamage = applyStrikeBonus\(primaryDamage, daggerBonus\.percent\);/);
  assert.match(runtime, /const amplified = Math\.max\(1, Math\.round\(damage \* armorBreakMultiplier\(monster\.armorBreak\)\)\);/);
  assert.match(runtime, /if \(blunt && monster\.hp > 0\) applyBluntAftermath\(monster, blunt\);/);
  assert.match(runtime, /monster\.armorBreak = tickArmorBreak\(monster\.armorBreak, delta\);/);
  assert.match(runtime, /resolveSpearGuard\(monster, guardDistanceBefore, Math\.hypot/);
  assert.match(runtime, /monster\.spearGuardCooldown = Math\.max\(0, \(monster\.spearGuardCooldown \?\? 0\) - delta\);/);
  assert.match(runtime, /heroSteadySeconds = accumulateSteadiness\(heroSteadySeconds, delta, hero\.path\.length > 0\);/);
  assert.match(runtime, /launchHeroProjectile\(monster, shotDamage, pending\.combat, pending\.color, shot\);/);
  assert.match(runtime, /pierceTargets: projectile\.pierceTargets,[\s\S]*damageMonster\(behind, projectileDamage/);
  assert.match(runtime, /addCombatGlyph\(monster\.attackTargetX, monster\.attackTargetY, '!', '#899392'\);\s+rewardHeroEvasion\(\);/);
  assert.match(runtime, /dodgeSpeedMultiplier\(heroDodgeBoost, currentMobilityProfile\(\)\)/);
});
