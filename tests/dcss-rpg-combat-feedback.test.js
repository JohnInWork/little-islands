import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { MONSTER_CATALOG } from '../tools/dcss-rpg-content.js';

const byId = new Map(MONSTER_CATALOG.map((monster) => [monster.id, monster]));

test('organic monsters expose restrained blood palettes while incorporeal enemies stay bloodless', () => {
  for (const id of ['goblin', 'bat', 'orc', 'spider', 'wolf', 'ogre', 'wyvern', 'ice-dragon']) {
    assert.match(byId.get(id)?.bloodColor ?? '', /^#[0-9a-f]{6}$/i, id);
  }
  for (const id of ['ghost', 'flying-skull', 'lich', 'smoke-demon', 'balrug']) {
    assert.equal(byId.get(id)?.bloodColor, undefined, id);
  }
  assert.notEqual(byId.get('spider').bloodColor, byId.get('goblin').bloodColor);
  assert.notEqual(byId.get('ice-dragon').bloodColor, byId.get('goblin').bloodColor);
});

test('combat feedback keeps blood transient, bounded and beneath readable hit glyphs', async () => {
  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(source, /if \(!actor\.bloodColor\) return;/);
  assert.match(source, /if \(bloodStains\.length > 36\) bloodStains\.shift\(\);/);
  assert.ok(source.indexOf('drawBloodStains();') < source.indexOf('drawLoot();'));
  assert.ok(source.indexOf('drawBloodDrops();') < source.indexOf('drawCombatGlyphs();'));
});
