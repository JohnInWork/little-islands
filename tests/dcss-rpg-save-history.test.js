import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  LEGACY_SAVE_KEYS,
  SAVE_VERSION,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';

/*
 * Настоящие сохранения прошлых версий, а не сегодняшний забег с подменённым
 * номером. Каждый снимок записан кодом той версии (`createRun` из коммита, где
 * эта версия была текущей). Подделка проходила тесты, пока миграция молча
 * выбрасывала все забеги v47–v50: у подделки уже были три характеристики.
 */
function fixture(name) {
  return JSON.parse(readFileSync(new URL(`./fixtures/saves/${name}.json`, import.meta.url), 'utf8'));
}

test('every save version that ever shipped has a key the loader still reads', () => {
  for (let version = 22; version < SAVE_VERSION; version += 1) {
    assert.ok(
      LEGACY_SAVE_KEYS.some((key) => key.endsWith(`:v${version}`)),
      `save key v${version} is missing, so that run is silently lost`,
    );
  }
});

for (const version of [47, 48, 49, 50]) {
  test(`a fresh v${version} run survives the update`, () => {
    const legacy = fixture(`fresh-v${version}`);
    assert.equal(legacy.version, version);
    const migrated = migrateLegacyRun(legacy);
    assert.equal(migrated.version, SAVE_VERSION);
    assert.ok(validateRun(migrated));
    assert.equal(migrated.seed, legacy.seed);
    assert.equal(migrated.gold, legacy.gold);
    assert.equal(migrated.hero.attributes.intelligence, legacy.hero.intelligence);
    assert.equal(migrated.hero.intelligence, undefined);
  });
}

for (const version of [47, 50]) {
  test(`a v${version} run with retired skills and a retired power keeps its worth`, () => {
    const legacy = fixture(`retired-v${version}`);
    const migrated = migrateLegacyRun(legacy);
    assert.ok(validateRun(migrated));
    // Два ранга снятых навыков вернулись очками к одному неистраченному.
    assert.equal(migrated.hero.skills.points, legacy.hero.skills.points + 2);
    assert.equal(migrated.hero.skills.ranks.darkvision, undefined);
    assert.equal(migrated.hero.skills.ranks.alchemy, undefined);
    assert.equal(migrated.gold, 321);
    const tunic = migrated.items.find((item) => item.uid === 'rich-tunic');
    assert.ok(tunic, 'the item itself stays with the hero');
    assert.equal(tunic.artifactPowerId, null);
    assert.equal(migrated.items.length, legacy.items.length);
  });
}
