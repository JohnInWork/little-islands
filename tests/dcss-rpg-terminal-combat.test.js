import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import { awardHeroExperience } from '../tools/dcss-rpg-progression.js';
import { createEmptyEquipment, resolveHeroDamage } from '../tools/dcss-rpg-rules.js';
import { createSkillState } from '../tools/dcss-rpg-skills.js';
import { createSwordRhythmState } from '../tools/dcss-rpg-swords.js';

const runtimeSource = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');

// Execute the actual runtime entry points without importing the browser renderer.
// No rewriting of function bodies or source-pattern assertions: regressions in
// their guards, ordering or state mutations are exercised by real calls below.
function runtimeFunction(name) {
  const start = runtimeSource.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing runtime function ${name}`);
  const end = runtimeSource.indexOf('\nfunction ', start + 1);
  assert.ok(end > start, `Missing function boundary after ${name}`);
  return runtimeSource.slice(start, end);
}

function combatRuntime() {
  const metrics = { experienceAwards: 0, saves: 0, endScreens: [] };
  const hero = {
    x: 64, y: 64, hp: 12, maxHp: 100, level: 1, xp: 0, power: 1,
    skills: createSkillState(), dead: false, path: [{ x: 128, y: 64 }],
    pendingAttack: { targetId: 'monster-1-0', damage: 50 }, targetAngle: 0,
  };
  const context = vm.createContext({
    playSound: () => false,
    // Weapon techniques are pure modules; the sandbox only needs them to be quiet.
    heroSteadySeconds: 0,
    findIsVisible: () => true,
    refreshVisibleSecrets: () => {},
    visibleSecretIds: new Set(),
    heroSightRadius: () => 5.2,
    heroRevealRadius: () => 4,
    isSecretFind: () => false,
    currentDarkvisionProfile: () => ({ rank: 0, radiusBonus: 0 }),
    currentStealthProfile: () => ({ rank: 0, visionPercent: 0, noisePercent: 0 }),
    currentSecretSearchProfile: () => ({ rank: 0, radius: 0 }),
    stealthVisionRadius: (vision) => vision,
    stealthNoiseRadius: (radius) => radius,
    discoverSecrets: () => [],
    currentDaggerProfile: () => ({ rank: 0, ambushPercent: 0, backstabPercent: 0 }),
    currentBluntProfile: () => ({ rank: 0, armorBreakPercent: 0, armorBreakSeconds: 0, interruptStunSeconds: 0 }),
    currentSpearProfile: () => ({ rank: 0, reach: 0, interceptPercent: 0, holdSeconds: 0, cooldownSeconds: 0 }),
    currentMarksmanProfile: () => ({ rank: 0, aimSeconds: 0, aimBonusPercent: 0, pierceTargets: 0 }),
    currentMobilityProfile: () => ({ rank: 0, speedPercent: 0, seconds: 0 }),
    heroDodgeBoost: 0,
    resolveSpearGuard: () => {},
    applyBluntAftermath: () => {},
    showDaggerStrikeImpact: () => {},
    rewardHeroEvasion: () => {},
    accumulateSteadiness: () => 0,
    tickDodgeBoost: () => 0,
    dodgeSpeedMultiplier: () => 1,
    mobilityProfile: () => ({ rank: 0, speedPercent: 0, seconds: 0 }),
    refreshDodgeBoost: () => 0,
    daggerProfile: () => ({ rank: 0, ambushPercent: 0, backstabPercent: 0 }),
    resolveDaggerStrike: () => ({ percent: 0, kind: null }),
    applyStrikeBonus: (damage) => damage,
    bluntProfile: () => ({ rank: 0, armorBreakPercent: 0, armorBreakSeconds: 0, interruptStunSeconds: 0 }),
    resolveBluntStrike: () => ({ armorBreakPercent: 0, armorBreakSeconds: 0, interrupt: false, stunSeconds: 0 }),
    refreshArmorBreak: (current) => current ?? null,
    tickArmorBreak: (current) => current ?? null,
    armorBreakMultiplier: () => 1,
    spearProfile: () => ({ rank: 0, reach: 0, interceptPercent: 0, holdSeconds: 0, cooldownSeconds: 0 }),
    spearInterception: () => ({ triggered: false, damagePercent: 0, holdSeconds: 0, cooldownSeconds: 0 }),
    interceptionDamage: () => 0,
    marksmanProfile: () => ({ rank: 0, aimSeconds: 0, aimBonusPercent: 0, pierceTargets: 0 }),
    resolveMarksmanShot: () => ({ aimed: false, bonusPercent: 0, pierceTargets: 0 }),
    selectPiercedTargets: () => [],
    stopAmbient: () => {},
    startAmbient: () => {},
    setAmbientLevel: () => {},
    hero,
    runStatus: 'playing',
    run: { status: 'playing', floor: { defeated: [] }, stats: { kills: 0, activeSeconds: 0, killerId: null } },
    projectiles: [{ targetId: 'monster-1-0', damage: 50 }],
    selected: createEmptyEquipment(),
    itemInstances: new Map(),
    gold: 0,
    deathTimer: 0,
    dungeon: { objective: null },
    TILE: 64,
    ARTIFACT_PATH: 'artifact.png',
    artifactAvailable: () => true,
    currentHeroCombat: () => ({ guard: 0 }),
    currentHeroStats: () => ({ defense: 0, maxHp: 100 }),
    currentHeroMagic: () => ({}),
    createSwordRhythmState,
    swordRhythmState: createSwordRhythmState(),
    resolveHeroDamage,
    resolveKillRecovery: ({ hp }) => ({ hp, healed: 0 }),
    awardHeroExperience: (options) => {
      metrics.experienceAwards += 1;
      return awardHeroExperience(options);
    },
    goldRewardForMonster: () => 1,
    combatImpactProfile: () => ({ particles: 0, waveSize: 0, shake: 0, hitStop: 0, staggers: false }),
    persistRun: () => { metrics.saves += 1; },
    showRunEndScreen: (result) => { metrics.endScreens.push(result); },
    burst: () => {},
    addImpactWave: () => {},
    addCombatGlyph: () => {},
    addBloodImpact: () => {},
    beginHitStop: () => {},
    showLevelUpCelebration: () => {},
    showLootToast: () => {},
    updateHud: () => {},
    updateBossHud: () => {},
  });
  const entryPoints = ['damageMonster', 'defeatMonster', 'damageHero', 'gainExperience', 'completeVictory'];
  vm.runInContext(entryPoints.map(runtimeFunction).join('\n'), context, { timeout: 1000 });
  return { context, metrics };
}

function targetMonster() {
  return { instanceId: 'monster-1-0', x: 128, y: 64, hp: 3, dead: 0, xp: 6, tier: 1 };
}

function assertNoTerminalCombat(context, metrics) {
  const monster = targetMonster();
  const beforeMonster = structuredClone(monster);
  const beforeHero = structuredClone(context.hero);
  const beforeRewards = { xp: metrics.experienceAwards, gold: context.gold, saves: metrics.saves };
  assert.doesNotThrow(() => context.damageMonster(monster, 50, '#ffffff', { projectile: true }));
  assert.doesNotThrow(() => context.defeatMonster(monster));
  assert.equal(context.damageHero(50, { direct: true, subtle: true }), null);
  assert.deepEqual(monster, beforeMonster);
  assert.deepEqual(structuredClone(context.hero), beforeHero);
  assert.deepEqual(context.run.floor.defeated, []);
  assert.deepEqual({ xp: metrics.experienceAwards, gold: context.gold, saves: metrics.saves }, beforeRewards);
}

test('lethal damage clears in-flight attacks and later hits cannot award postmortem XP or freeze the loop', () => {
  const { context, metrics } = combatRuntime();
  const hit = context.damageHero(50, { direct: true, subtle: true });
  assert.equal(hit.dead, true);
  assert.equal(context.hero.hp, 0);
  assert.equal(context.hero.dead, true);
  assert.equal(context.runStatus, 'dead');
  assert.equal(context.projectiles.length, 0);
  assert.equal(context.hero.pendingAttack, null);
  assert.equal(context.hero.path.length, 0);
  assert.equal(metrics.saves, 1);
  assertNoTerminalCombat(context, metrics);
});

test('victory clears attacks and prevents any further hero or monster combat mutations', () => {
  const { context, metrics } = combatRuntime();
  context.completeVictory();
  assert.equal(context.runStatus, 'victory');
  assert.equal(context.run.status, 'victory');
  assert.equal(context.hero.dead, false);
  assert.equal(context.projectiles.length, 0);
  assert.equal(context.hero.pendingAttack, null);
  assert.deepEqual(metrics.endScreens, ['victory']);
  assertNoTerminalCombat(context, metrics);
});

test('zero HP blocks combat even before the terminal flags have been set', () => {
  const { context, metrics } = combatRuntime();
  context.hero.hp = 0;
  assert.equal(context.runStatus, 'playing');
  assert.equal(context.hero.dead, false);
  assertNoTerminalCombat(context, metrics);
});

test('the same runtime entry points still defeat a monster and award XP once during play', () => {
  const { context, metrics } = combatRuntime();
  const monster = targetMonster();
  context.damageMonster(monster, 50, '#ffffff', { projectile: true });
  assert.ok(monster.dead > 0);
  assert.equal(context.hero.xp, 6);
  assert.equal(metrics.experienceAwards, 1);
  assert.deepEqual(context.run.floor.defeated, [monster.instanceId]);
  assert.equal(context.gold, 1);
  context.defeatMonster(monster);
  assert.equal(metrics.experienceAwards, 1);
  assert.equal(context.hero.xp, 6);
});
