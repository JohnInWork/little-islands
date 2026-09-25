import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { LOOT_CATALOG } from '../tools/dcss-rpg-content.js';
import { fittedSpriteRect, opaquePixelBounds } from '../tools/dcss-rpg-item-sprites.js';

function rgba(width, height, pixels) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y, alpha = 255] of pixels) data[(y * width + x) * 4 + 3] = alpha;
  return { width, height, data };
}

test('transparent padding is removed without clipping the visible item', () => {
  const bounds = opaquePixelBounds(rgba(32, 32, [
    [11, 17], [20, 17], [11, 21], [20, 21], [15, 19],
  ]));
  assert.deepEqual(bounds, { x: 11, y: 17, width: 10, height: 5, empty: false });
});

test('tiny belts and square rings fill the same readable ground-loot footprint', () => {
  assert.deepEqual(fittedSpriteRect({ x: 11, y: 17, width: 10, height: 5 }, 44), {
    sourceX: 11,
    sourceY: 17,
    sourceWidth: 10,
    sourceHeight: 5,
    drawWidth: 44,
    drawHeight: 22,
  });
  assert.deepEqual(fittedSpriteRect({ x: 17, y: 17, width: 15, height: 15 }, 44), {
    sourceX: 17,
    sourceY: 17,
    sourceWidth: 15,
    sourceHeight: 15,
    drawWidth: 44,
    drawHeight: 44,
  });
});

test('a fully transparent or malformed sprite has a safe deterministic result', () => {
  assert.deepEqual(opaquePixelBounds(rgba(4, 3, [])), {
    x: 0,
    y: 0,
    width: 4,
    height: 3,
    empty: true,
  });
  assert.throws(() => opaquePixelBounds({ width: 32, height: 32, data: [] }), /incomplete/);
  assert.throws(() => fittedSpriteRect({ x: 0, y: 0, width: 0, height: 4 }), /positive integer/);
});

test('runtime trims every floor-loot sprite by alpha instead of special-casing item ids', async () => {
  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(source, /floorLootSpritePaths = new Set/);
  assert.match(source, /opaquePixelBounds\(readbackContext\.getImageData/);
  assert.match(source, /const isBelt = displayItem\.slot === 'belt'/);
  // Пояс лежит на полу: качание ему не передаётся (см. «ничто неподвижное не парит»).
  assert.match(source, /if \(isBelt\) drawGroundBelt\(position, rarity, 0\)/);
  // Пол рисует ту же картинку, что и остальной интерфейс (`floorPicture` →
  // `itemPicture`); отдельно только золото — кучкой по сумме, без обрезки.
  assert.match(source, /const picture = floorPicture\(displayItem\)/);
  assert.match(source, /\? \(isBelt \? 18 : 44\) \* \(displayItem\.visualScale \?\? 1\)/);
  assert.match(source, /drawSprite\(picture\.path, x, y, size, \{/);
  assert.doesNotMatch(source, /displayItem\.id === ['"](?:regeneration-ring|iron-belt)['"]/);
});

test('rings use recognisable jewellery sprites instead of status-effect pictograms', () => {
  const rings = LOOT_CATALOG.filter(({ slot }) => slot === 'ring1' || slot === 'ring2');
  assert.equal(rings.length, 7);
  // The `i-*` sprites in the ring folder are status-effect pictograms, not
  // jewellery. The library ships two actual rings, so the slot is small and
  // what growth there is went to amulets, where the art exists.
  assert.ok(rings.every(({ icon }) => !/\/i-[a-z-]+\.png$/.test(icon)), 'a pictogram is not a ring');
  assert.ok(rings.every(({ icon }) => /ring|octoring|tourmaline|ruby|shadows/.test(icon)));
  assert.equal(new Set(rings.map(({ icon }) => icon)).size, rings.length);
});
