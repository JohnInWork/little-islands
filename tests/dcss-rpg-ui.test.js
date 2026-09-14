import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const cssUrl = new URL('../tools/dcss.css', import.meta.url);
const htmlUrl = new URL('../tools/dcss.html', import.meta.url);
const runtimeUrl = new URL('../tools/dcss.js', import.meta.url);

test('the 2D RPG interface uses quiet flat pixel blocks instead of ornamental frames', async () => {
  const css = await readFile(cssUrl, 'utf8');
  const frame = css.match(/\.pixel-frame\s*{(?<body>[^}]*)}/)?.groups?.body ?? '';

  assert.match(css, /--pixel-unit:\s*4px/);
  assert.match(frame, /border:\s*var\(--pixel-unit\) solid var\(--frame-mid\)/);
  assert.match(frame, /background:\s*var\(--coal\)/);
  assert.match(frame, /box-shadow:\s*4px 4px 0 var\(--frame-black\)/);
  assert.doesNotMatch(frame, /background-image|clip-path|inset/);
  assert.match(css, /\.portrait\s*{\s*display:\s*none/);
  assert.match(css, /\.doll-aura\s*{\s*display:\s*none/);
  assert.match(css, /\.inventory\s*{[^}]*background:\s*rgb\(3 5 6 \/ 96%\)/s);
  assert.doesNotMatch(css, /border-radius\s*:/);
});

test('the main touch surfaces share the frame and health stays visibly segmented', async () => {
  const html = await readFile(htmlUrl, 'utf8');

  for (const requiredClass of [
    'hud pixel-frame',
    'depth pixel-frame',
    'move-control pixel-frame',
    'bag-button pixel-frame',
    'boss-hud pixel-frame',
    'inventory-shell pixel-frame',
    'run-end-card pixel-frame',
  ]) {
    assert.match(html, new RegExp(`class=["'][^"']*${requiredClass}`));
  }

  assert.equal((html.match(/<div class="health">[\s\S]*?<\/div>/)?.[0].match(/<i><\/i>/g) ?? []).length, 6);
  assert.equal((html.match(/data-inventory-filter=/g) ?? []).length, 6);
});

test('one large pixel control combines arrow taps, holds, joystick drags and map taps', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.match(html, /id="move-control"[\s\S]*role="group"/);
  assert.equal((html.match(/data-move="(?:up|right|down|left)"/g) ?? []).length, 4);
  assert.match(css, /\.move-direction\s*{[^}]*width:\s*48px[^}]*height:\s*48px/s);
  assert.match(css, /\.move-control\s*{[^}]*touch-action:\s*none/s);
  assert.match(runtime, /function queueDirectionalMove\(direction\)/);
  assert.match(runtime, /moveControl\.addEventListener\('pointermove'/);
  assert.match(runtime, /canvas\.addEventListener\('pointerdown', moveFromPointer\)/);
  assert.doesNotMatch(html, /id="gesture"/);
});

test('the touch joystick stays transparent at rest and gains contrast only while used', async () => {
  const css = await readFile(cssUrl, 'utf8');
  const idle = css.match(/\.move-control\s*{(?<body>[^}]*)}/)?.groups?.body ?? '';
  const active = css.match(/\.move-control\[data-active='true'\]\s*{(?<body>[^}]*)}/)?.groups?.body ?? '';

  assert.match(idle, /background:\s*rgb\(8 13 14 \/ 24%\)/);
  assert.match(idle, /border-color:\s*rgb\(117 130 131 \/ 42%\)/);
  assert.match(idle, /opacity:\s*0\.52/);
  assert.match(active, /background:\s*rgb\(8 13 14 \/ 58%\)/);
  assert.match(active, /border-color:\s*rgb\(163 178 178 \/ 82%\)/);
  assert.match(active, /opacity:\s*0\.94/);
  assert.match(css, /\.move-control:focus-within\s*{[^}]*opacity:\s*0\.92/s);
  assert.match(css, /\.move-direction:focus-visible\s*{[^}]*outline:\s*4px solid/s);
});

test('the dungeon background uses a real WebGL layer instead of painted wall extrusion', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.match(html, /<canvas id="world-3d"/);
  assert.match(css, /#world-3d\s*{[^}]*z-index:\s*0/s);
  assert.match(runtime, /createDungeonWorld3D/);
  assert.match(runtime, /dungeonWorld3D\.syncActors/);
  assert.match(runtime, /dungeonWorld3D\.unprojectGround/);
  assert.doesNotMatch(runtime, /function drawWallDepth|WALL_RISE/);
});

test('the backpack control uses a coarse pixel sprite instead of a smooth CSS silhouette', async () => {
  const [html, css] = await Promise.all([readFile(htmlUrl, 'utf8'), readFile(cssUrl, 'utf8')]);
  const glyph = css.match(/\.bag-glyph\s*{(?<body>[^}]*)}/)?.groups?.body ?? '';

  assert.match(html, /<svg[\s\S]*class="bag-glyph"[\s\S]*viewBox="0 0 10 10"/);
  assert.match(html, /shape-rendering="crispEdges"/);
  assert.match(html, /class="bag-pixel-buckle"/);
  assert.match(glyph, /width:\s*40px/);
  assert.match(glyph, /image-rendering:\s*pixelated/);
  assert.doesNotMatch(glyph, /clip-path|border-radius/);
});

test('inventory items expose a nested detail dialog through one tap', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.match(html, /id="item-detail"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(css, /\.item-detail\[aria-hidden='false'\]/);
  assert.match(runtime, /openItemDetail\(item, entry\)/);
  assert.doesNotMatch(runtime, /lastPackTapIndex|shouldOpenDetails/);
  assert.match(runtime, /if \(closeItemDetail\(\)\) return/);
});

test('loot and inventory expose translated item identity before opening full details', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  for (const id of [
    'loot-name',
    'loot-rarity',
    'loot-slot',
    'loot-effect',
    'inventory-title',
    'inventory-count',
    'item-detail-action',
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.doesNotMatch(html, /id=["']item-detail-language["']/);
  assert.match(css, /\.loot-toast\s*{[^}]*width:\s*min\(380px, calc\(100vw - 24px\)\)/s);
  assert.match(css, /\.pack-item-copy\s*{/);
  assert.match(css, /\.pack-item\.inventory-row\s*{[^}]*grid-template-columns:\s*56px minmax\(0, 1fr\) auto/s);
  assert.match(runtime, /itemPresentation\(item, itemDetailLanguage/);
  assert.match(runtime, /lootName\.textContent = presentation\.name/);
  assert.match(runtime, /name\.textContent = presentation\.name/);
  assert.match(runtime, /effect\.textContent = `\$\{presentation\.primaryEffect\.icon\}/);
  assert.match(runtime, /lootToastQueue\.push/);
});

test('equipped items live at the top of the same list and use the same detail dialog', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.doesNotMatch(html, /class="doll-panel"|id="paperdoll"/);
  assert.match(css, /\.pack-item\.inventory-row\.equipped-item-row/);
  assert.match(runtime, /let selectedEquipmentSlot = null/);
  assert.match(runtime, /button\.dataset\.equippedSlot = entry\.slot/);
  assert.match(runtime, /selection\.source === 'equipment'/);
  assert.match(runtime, /unequipItem\(currentItemState\(\), selection\.slot\)/);
});

test('backpack follows a Pathos-like grouped list with large category filters', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.match(html, /id="inventory-filters"[\s\S]*aria-label="Фильтр предметов"/);
  assert.equal((html.match(/data-inventory-filter=/g) ?? []).length, 6);
  assert.match(html, /data-inventory-filter="all"[^>]*aria-pressed="true"/);
  assert.match(css, /\.inventory-filters\s*{[^}]*grid-template-columns:\s*repeat\(6,/s);
  assert.match(css, /\.inventory-section-title\s*{[^}]*position:\s*sticky/s);
  assert.match(css, /\.pack-item\.inventory-row\s*{/);
  assert.match(css, /\.pack-item-copy strong[\s\S]*text-overflow:\s*ellipsis/);
  assert.doesNotMatch(html, /data-pack-view|id="selection-card"/);
  assert.doesNotMatch(runtime, /INVENTORY_VIEW_KEY|setInventoryView/);
  assert.match(runtime, /inventorySections\(\{/);
  assert.match(runtime, /copy\.className = 'pack-item-copy'/);
  assert.match(runtime, /presentation\.primaryEffect\.text/);
  assert.match(runtime, /inventoryFilterButtons\.forEach/);
  assert.doesNotMatch(runtime, /itemDetailLanguageButton/);
});

test('atmosphere is rendered on a pixel grid without smooth fullscreen noise', async () => {
  const [css, runtime] = await Promise.all([
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.doesNotMatch(css, /fractalNoise/);
  assert.match(css, /shape-rendering='crispEdges'/);
  assert.match(css, /animation:\s*pixel-grain[^;]*steps\(2, end\)/);
  assert.match(runtime, /atmosphereCanvas\.width[\s\S]*PIXEL_EFFECT_SCALE/);
  assert.match(runtime, /atmosphereContext\.imageSmoothingEnabled = false/);
  assert.match(runtime, /drawGroundMist\(false\)[\s\S]*drawLighting\(\)[\s\S]*drawGroundMist\(true\)/);
  assert.match(runtime, /mistAnchors = createMistAnchors\(dungeon\)/);
  assert.doesNotMatch(runtime, /worldToScreen\(hero\.x, hero\.y\)\.x/);
});
