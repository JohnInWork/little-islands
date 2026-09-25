import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import { materializeItemAffixes } from '../tools/dcss-rpg-affixes.js';
import { itemSpriteVariants } from '../tools/dcss-rpg-equipment-visuals.js';
import { materialFilter } from '../tools/dcss-rpg-materials.js';
import {
  GOLD_PILE_PATHS,
  GOLD_PILE_TIERS,
  floorPicture,
  goldPilePath,
  itemPicture,
} from '../tools/dcss-rpg-item-picture.js';
import { requiredAssetPaths } from '../tools/dcss-rpg-required-assets.js';
import { CAMP_FIRE_FRAMES } from '../tools/dcss-rpg-camp.js';
import { createDungeonEnvironment } from '../tools/dcss-rpg-environment.js';
import { contextActionModel } from '../tools/dcss-rpg-context-actions.js';

const assetRoot = new URL('../public/assets/dcss-preview/', import.meta.url);
const adapter = () => readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');

/**
 * Иван: шлем на полу золотой, на кнопке «что рядом» серебряный, в плашке
 * «подобрал» — третий. Одна вещь — одна картинка: силуэт и материал одного
 * экземпляра одинаковы на полу, после подбора, после перезагрузки и после
 * подбора в рюкзак, где такой uid уже был (`loot-3-5#2`).
 */
test('one floor item is one picture: floor, pickup, backpack and reload agree', () => {
  let checked = 0;
  let recoloured = 0;
  for (const seed of [3, 11, 29, 777]) {
    for (let depth = 1; depth <= 12; depth += 1) {
      for (const spawn of generateDungeon({ seed, depth }).loot) {
        const definition = lootById(spawn.id);
        if (!definition?.slot || itemSpriteVariants(definition).length < 2) continue;
        // On the floor: the definition the runtime builds from the spawn.
        const floor = materializeItemAffixes(definition, spawn);
        // Picked up: `addInventoryItem` spreads it and adds the uid.
        const picked = { ...floor, uid: spawn.instanceId };
        const pickedAgain = { ...floor, uid: `${spawn.instanceId}#2` };
        // Reloaded: only the saved record comes back.
        const reloaded = materializeItemAffixes(definition, {
          id: spawn.id,
          uid: spawn.instanceId,
          affixIds: spawn.affixIds ?? [],
          ...(spawn.materialId ? { materialId: spawn.materialId } : {}),
        });
        const expected = itemPicture(floor);
        assert.deepEqual(itemPicture(picked), expected, `${spawn.instanceId} changed when picked up`);
        assert.deepEqual(itemPicture(pickedAgain), expected, `${spawn.instanceId}#2 changed silhouette`);
        assert.deepEqual(itemPicture(reloaded), expected, `${spawn.instanceId} changed after reload`);
        const onFloor = floorPicture(floor);
        assert.equal(onFloor.path, expected.path);
        assert.equal(onFloor.filter, expected.filter);
        assert.equal(expected.filter, materialFilter(spawn.materialId ?? null) ?? null);
        checked += 1;
        if (expected.filter) recoloured += 1;
      }
    }
  }
  assert.ok(checked > 20, `only ${checked} multi-silhouette items were checked`);
  assert.ok(recoloured > 0, 'no checked item carried a material recolour');
});

test('every place the adapter shows an item draws the same itemPicture', async () => {
  const source = await adapter();
  // One helper paints an <img>: sprite and material together.
  assert.match(source, /function spriteForItem\(item\) \{\n\s+return itemPicture\(item\)\?\.path \?\? null;/);
  assert.match(source, /const filter = itemPicture\(item\)\?\.filter \?\? null;/);
  // Floor.
  assert.match(source, /const picture = floorPicture\(displayItem\)/);
  // Toast after pickup: the item's own picture, not the catalogue icon.
  assert.match(source, /if \(definition && !definition\.gold\) paintItemIcon\(toastIcon, displayItem\)/);
  // «Что рядом»: the button and the card get the material too.
  assert.match(source, /icon: spriteForItem\(вещь\),/);
  assert.match(source, /paintMaterial\(icon, contextTargetItem\(target\)\)/);
  assert.match(source, /paintMaterial\(contextActionIcon, contextTargetItem\(contextTarget\)\)/);
  // Backpack, item card, worn slots, merchant and chest.
  assert.ok((source.match(/paintItemIcon\(/g) ?? []).length >= 8);
  // Nobody reaches around the helper any more.
  assert.doesNotMatch(source, /spriteUrl\(displayItem\.icon\)/);
  assert.doesNotMatch(source, /\bitemSpriteFor\(/);
  assert.doesNotMatch(source, /materialSpriteFilter/);
  const css = await readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8');
  for (const selector of [
    '.interact-action > img',
    '.context-action-header > img',
    '.loot-toast img',
    '.item-detail-portrait img',
    '.merchant-item img',
    '.chest-transfer-item > img,',
    '.pack-item img',
    '.inventory-equipment-slot img',
  ]) {
    const start = css.indexOf(selector.endsWith(',') ? selector : `${selector} {`);
    assert.ok(start >= 0, selector);
    assert.match(css.slice(start, css.indexOf('}', start)), /var\(--material-filter/, selector);
  }
});

/**
 * Иван: «золото на полу — кучками, а не одной огромной монетой». Монета
 * интерфейса остаётся в кошельке и плашках; на полу — кучка DCSS по сумме.
 */
test('floor gold is a pile chosen by amount, the interface keeps its coin', () => {
  assert.deepEqual(GOLD_PILE_TIERS.map(({ id }) => id), ['small', 'medium', 'large']);
  assert.equal(new Set(GOLD_PILE_PATHS).size, 3);
  for (const path of GOLD_PILE_PATHS) {
    assert.match(path, /^item\/gold\/\d+\.png$/);
    assert.ok(existsSync(new URL(path, assetRoot)), `${path} is not shipped`);
    assert.ok(requiredAssetPaths().includes(path), `${path} is never loaded`);
  }
  assert.equal(goldPilePath(1), GOLD_PILE_TIERS[0].path);
  assert.equal(goldPilePath(10), GOLD_PILE_TIERS[0].path);
  assert.equal(goldPilePath(11), GOLD_PILE_TIERS[1].path);
  assert.equal(goldPilePath(21), GOLD_PILE_TIERS[1].path);
  assert.equal(goldPilePath(22), GOLD_PILE_TIERS[2].path);
  assert.equal(goldPilePath(5000), GOLD_PILE_TIERS[2].path);
  assert.equal(goldPilePath(undefined), GOLD_PILE_TIERS[0].path);

  const coin = lootById('coin-cache');
  assert.equal(coin.icon, 'licensed/7soul-icons/coin-gold.png', 'the interface coin stays');
  // The real floors: shallow gold is small, deep gold is large, never the coin.
  const tiersByDepth = new Map();
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    for (const depth of [1, 5, 9, 10]) {
      for (const spawn of generateDungeon({ seed, depth }).loot.filter(({ id }) => id === 'coin-cache')) {
        const picture = floorPicture(materializeItemAffixes(coin, spawn));
        assert.equal(picture.trim, false, 'a pile is drawn whole, so its size in the tile shows');
        assert.notEqual(picture.path, coin.icon);
        tiersByDepth.set(depth, new Set([...(tiersByDepth.get(depth) ?? []), picture.path]));
      }
    }
  }
  assert.deepEqual([...(tiersByDepth.get(1) ?? [])], [GOLD_PILE_TIERS[0].path]);
  assert.deepEqual([...(tiersByDepth.get(5) ?? [])], [GOLD_PILE_TIERS[1].path]);
  assert.deepEqual([...(tiersByDepth.get(9) ?? [])], [GOLD_PILE_TIERS[2].path]);
  assert.deepEqual([...(tiersByDepth.get(10) ?? [])], [GOLD_PILE_TIERS[2].path]);
});

/** Иван: «отмычки и набор сапёра на полу огромные». Рюкзак не трогаем. */
test('lockpicks and the sapper kit lie small on the floor, same icon in the pack', async () => {
  for (const id of ['lockpick-set', 'sapper-kit']) {
    const item = lootById(id);
    assert.ok(item.floorScale >= 0.5 && item.floorScale < 0.8, `${id} floorScale ${item.floorScale}`);
    assert.match(item.icon, /^licensed\/game-icons\//);
    assert.equal(itemPicture(item).path, item.icon, 'the backpack icon is unchanged');
  }
  const scaled = LOOT_CATALOG.filter(({ floorScale }) => floorScale !== undefined);
  for (const item of scaled) assert.ok(item.floorScale >= 0.5 && item.floorScale <= 2.5, item.id);
  const source = await adapter();
  assert.match(source, /'loot', presentation\.id, 'icon', iconPath, presentation\.floorScale \?\? 1, -7,/);
});

/** Иван: «костёр для готовки должен быть нашим деревянным». */
test('every fire the hero cooks on is the wooden campfire', () => {
  const card = contextActionModel({ target: { kind: 'campfire', rawMeatCount: 1 }, language: 'ru' });
  assert.equal(card.icon, CAMP_FIRE_FRAMES[0]);
  let fires = 0;
  for (const branch of ['deep', 'surface', 'vaults']) {
    for (let seed = 1; seed <= 6; seed += 1) {
      for (let depth = 1; depth <= 12; depth += 1) {
        const environment = createDungeonEnvironment(generateDungeon({ seed, depth, branch }));
        for (const prop of environment.props.filter(({ interactionId }) => interactionId === 'campfire')) {
          fires += 1;
          // The inn's pot over its hearth is the landlord's kitchen, not a
          // campfire in the dungeon, and it stays the inn's cooking site.
          const wooden = CAMP_FIRE_FRAMES.includes(prop.path) || /hearth\/cauldron/.test(prop.path);
          assert.ok(wooden, `${branch} ${seed}/${depth}: cooking on ${prop.path}`);
          assert.doesNotMatch(prop.path, /makhleb/);
        }
      }
    }
  }
  assert.ok(fires > 100);
});
