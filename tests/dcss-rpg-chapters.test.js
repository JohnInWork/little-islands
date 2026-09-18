import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

import { isCityDepth } from '../tools/dcss-rpg-city.js';

import { MONSTER_CATALOG, monsterById } from '../tools/dcss-rpg-content.js';
import { generateDungeon, isWalkableCell } from '../tools/dcss-rpg-core.js';
import { FLOORS_PER_CHAPTER, FINAL_DEPTH } from '../tools/dcss-rpg-run.js';
import { RUN_END_SOURCE_NAMES } from '../tools/dcss-rpg-run-summary.js';
import { floorScaling, monsterEligibleForFloor } from '../tools/dcss-rpg-scaling.js';
import { ACTOR_EFFECT_IDS } from '../tools/dcss-rpg-effects.js';
import { CHAPTER_WEATHER, chapterWeather } from '../tools/dcss-rpg-visuals.js';
import { DUNGEON_THEME_CATALOG, dungeonThemeFor } from '../tools/dcss-rpg-room-plans.js';

const chapterOf = (depth) => Math.floor((depth - 1) / FLOORS_PER_CHAPTER) + 1;
const signatures = MONSTER_CATALOG.filter(({ chapter }) => Number.isInteger(chapter));

test('every chapter past the first has one signature creature with a mechanic of its own', async () => {
  // One per chapter per branch: the crypts keep the revenant, the marshes get
  // the naga, and the siren belongs to the water either side of the gate.
  assert.deepEqual(signatures.map(({ id }) => id).sort(), ['moor-naga', 'siren', 'tomb-revenant']);
  assert.deepEqual(signatures.map(({ chapter }) => chapter).sort(), [2, 2, 3]);
  for (const monster of signatures) {
    assert.ok(monster.hp > 0 && monster.damage > 0 && monster.xp > 0, monster.id);
    assert.ok(RUN_END_SOURCE_NAMES[monster.id]?.ru && RUN_END_SOURCE_NAMES[monster.id]?.en, monster.id);
    await access(new URL(`../public/assets/dcss-preview/${monster.path}`, import.meta.url));
  }
  const revenant = monsterById('tomb-revenant');
  assert.deepEqual(revenant.burst, { id: 'poison', duration: 5, radius: 1.7, color: '#9fb06a' });
  assert.ok(ACTOR_EFFECT_IDS.includes(revenant.burst.id));
  assert.ok(revenant.speed < 0.8, 'the revenant is slow');
  assert.ok(revenant.threat.pursuit >= 9, 'and relentless');
  const siren = monsterById('siren');
  assert.equal(siren.pull, 1);
  assert.equal(siren.spawn, 'water');
  assert.deepEqual(siren.terrain, { water: 1.3, land: 0 }, 'the siren never leaves the water');
  assert.equal(siren.inflicts.id, 'wet');
  await access(new URL(`../public/assets/dcss-preview/${siren.waterPath}`, import.meta.url));
});

test('a signature creature belongs to its chapter alone and never joins the shared pool', () => {
  for (let depth = 1; depth <= FINAL_DEPTH; depth += 1) {
    const scaling = floorScaling(depth);
    for (const monster of signatures) {
      assert.equal(monsterEligibleForFloor(monster, scaling), false, `${monster.id} stays out of the pool`);
    }
  }
  const seen = new Map();
  for (let depth = 1; depth <= FINAL_DEPTH; depth += 1) {
    // The city is not a chapter floor: no signature creature lives there.
    if (isCityDepth(depth)) continue;
    for (let seed = 1; seed <= 40; seed += 1) {
      const level = generateDungeon({ seed, depth });
      const placed = level.monsters.filter(({ id }) => Number.isInteger(monsterById(id).chapter));
      for (const spawn of placed) {
        const definition = monsterById(spawn.id);
        assert.equal(definition.chapter, chapterOf(depth), `${spawn.id} on floor ${depth}`);
        assert.match(spawn.instanceId, /-(chapter|water)-\d+$/, 'seated by its own stream');
        assert.equal(isWalkableCell(level.grid, spawn.x, spawn.y), true);
        if (!definition.spawn) {
          assert.equal(level.grid[spawn.y][spawn.x], '.', 'a land creature keeps dry feet');
          assert.ok(
            Math.abs(spawn.x - level.spawn.x) + Math.abs(spawn.y - level.spawn.y) >= 7,
            'and never waits on the doorstep',
          );
        }
        seen.set(`${definition.chapter}:${spawn.id}`, (seen.get(`${definition.chapter}:${spawn.id}`) ?? 0) + 1);
      }
      assert.deepEqual(generateDungeon({ seed, depth }).monsters, level.monsters, 'placement is deterministic');
    }
  }
  assert.ok(seen.get('2:tomb-revenant') > 60, `the revenant showed up ${seen.get('2:tomb-revenant') ?? 0} times`);
  assert.ok(seen.get('3:siren') > 20, `the siren showed up ${seen.get('3:siren') ?? 0} times`);
  assert.equal(seen.size, 2);
});

test('each chapter breathes its own air', () => {
  for (const theme of DUNGEON_THEME_CATALOG) {
    assert.ok(CHAPTER_WEATHER[theme.atmosphereId], `weather for ${theme.atmosphereId}`);
  }
  // Which air a chapter breathes is now the run's own, so the promise is that
  // the three chapters of a run never breathe the same air — not that floor one
  // is always ash.
  for (const seed of [0, 5, 31, 404]) {
    const chapters = [1, 5, 7].map((depth) => chapterWeather(dungeonThemeFor(seed, depth).atmosphereId));
    assert.equal(
      new Set(chapters.map(({ driftX, driftY }) => `${driftX}:${driftY}`)).size,
      3,
      `seed ${seed}: two chapters share a wind`,
    );
  }
  const sand = chapterWeather('ochre');
  const snow = chapterWeather('ice');
  assert.ok(sand.driftX > chapterWeather('slate').driftX, 'sand races sideways');
  assert.ok(snow.driftY > sand.driftY, 'snow falls');
  for (const weather of Object.values(CHAPTER_WEATHER)) {
    assert.ok(weather.sway >= 0 && weather.sway <= 40);
    assert.ok(weather.alpha > 0 && weather.alpha <= 2);
    assert.ok(Object.isFrozen(weather));
  }
  assert.equal(chapterWeather('unknown'), CHAPTER_WEATHER.slate);
});

test('the runtime blooms the death cloud, answers the song and paints the weather', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /function burstEffectAround\(source\)[\s\S]*applyHeroStatus\(id, duration\)[\s\S]*applyActorEffect\(other\.effects, id, duration\)/);
  assert.match(runtime, /playSound\('kill'\);\s+if \(monster\.burst\) burstEffectAround\(monster\);/);
  assert.match(runtime, /function dragHeroToward\(source\)[\s\S]*hero\.path = \[\{ x: \(cell\.x \+ 0\.5\) \* TILE, y: \(cell\.y \+ 0\.5\) \* TILE \}\]/);
  assert.match(runtime, /if \(hit && monster\.pull > 0\) dragHeroToward\(monster\);/);
  assert.match(runtime, /isHeroWalkable\(x, y\)\s+&& !heroBlockingCells\(\)\.has/, 'the pull respects walls and bodies');
  assert.match(runtime, /const weather = chapterWeather\(biomeThemeFor\(dungeon\.themeId\)\.palette\);/);
  assert.match(runtime, /drift \* weather\.driftX[\s\S]*drift \* weather\.driftY \+ sway/);
  assert.match(runtime, /\* weather\.alpha;/);
});
