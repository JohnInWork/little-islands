import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const cssUrl = new URL('../tools/dcss.css', import.meta.url);
const htmlUrl = new URL('../tools/dcss.html', import.meta.url);
const runtimeUrl = new URL('../tools/dcss.js', import.meta.url);
const landingUrl = new URL('../index.html', import.meta.url);
const manifestRuUrl = new URL('../public/manifest.webmanifest', import.meta.url);
const manifestEnUrl = new URL('../public/manifest.en.webmanifest', import.meta.url);

test('the product name is consistent across the landing page and both PWA manifests', async () => {
  const [landing, manifestRuSource, manifestEnSource] = await Promise.all([
    readFile(landingUrl, 'utf8'),
    readFile(manifestRuUrl, 'utf8'),
    readFile(manifestEnUrl, 'utf8'),
  ]);
  const manifestRu = JSON.parse(manifestRuSource);
  const manifestEn = JSON.parse(manifestEnSource);

  assert.match(landing, /<title>DNG Codex/);
  assert.equal(manifestRu.name, 'DNG Codex');
  assert.equal(manifestRu.short_name, 'DNG Codex');
  assert.equal(manifestEn.name, 'DNG Codex');
  assert.equal(manifestEn.short_name, 'DNG Codex');
  assert.doesNotMatch(landing, /Little Islands|Маленькие острова/i);
});

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
  assert.equal((html.match(/data-inventory-filter=/g) ?? []).length, 5);
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
  const finalResponsive = css.slice(css.indexOf('Final responsive authority'));
  assert.match(finalResponsive, /@media \(max-width: 900px\)[\s\S]*?\.move-control\s*{[^}]*left:\s*50%[^}]*transform:\s*translateX\(-50%\)/s);
});

test('the thumb dock keeps spells, movement and object actions in three separate tracks', async () => {
  const css = await readFile(cssUrl, 'utf8');
  const dock = css.slice(css.indexOf('Thumb dock — final responsive authority'));
  assert.ok(dock.length > 0, 'the dock block must close the stylesheet');
  // Left track: bag at the bottom, interact above it, sanctuary heal above both.
  assert.match(dock, /\.bag-button\s*{[^}]*left:\s*max\(12px[^}]*bottom:\s*max\(12px/s);
  assert.match(dock, /\.interact-action\s*{[^}]*left:\s*max\(12px[^}]*bottom:\s*max\(88px/s);
  assert.match(dock, /\.sanctuary-action\s*{[^}]*left:\s*max\(12px[^}]*bottom:\s*max\(170px/s);
  // Right track: one spell column; centre track stays the centred joystick.
  assert.match(dock, /\.spell-bar\s*{[^}]*right:\s*max\(12px[^}]*bottom:\s*max\(12px[^}]*transform:\s*none/s);
  assert.doesNotMatch(css, /\.spell-bar\s*{[^}]*right:\s*50%/s);
  assert.doesNotMatch(css, /\.spell-bar\s*{[^}]*grid-template-columns:\s*repeat\(3/s);
  // Feedback leaves the thumb zone: toasts sit under the HUD at the top.
  assert.match(css, /\.loot-toast\s*{[^}]*top:\s*max\(158px/s);
  assert.doesNotMatch(css, /\.loot-toast\s*{[^}]*bottom:\s*max\(1\dpx/s);
  // Narrow phones shrink the side buttons instead of letting tracks touch.
  assert.match(dock, /@media \(max-width: 344px\)[\s\S]*\.bag-button,\s*\.interact-action\s*{[^}]*width:\s*60px/s);
  assert.match(dock, /@media \(orientation: landscape\) and \(max-height: 520px\)[\s\S]*\.spell-bar\s*{[^}]*bottom:\s*max\(10px/s);
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
  assert.match(runtime, /itemPresentation\(displayItem, itemDetailLanguage/);
  assert.match(runtime, /lootName\.textContent = presentation\.name/);
  assert.match(runtime, /name\.textContent = presentation\.name/);
  assert.match(runtime, /effect\.textContent = `\$\{presentation\.primaryEffect\.icon\}/);
  assert.match(runtime, /lootToastQueue\.push/);
});

test('all equipment slots frame a live inventory paper doll and use the same detail dialog', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.match(html, /id="inventory-paperdoll"/);
  assert.match(html, /id="inventory-equipment-slots"/);
  assert.equal((html.match(/<button class="inventory-equipment-slot/g) ?? []).length, 11);
  for (const slot of ['cloak', 'head', 'amulet', 'body', 'hand1', 'gloves', 'hand2', 'ring1', 'ring2', 'belt', 'boots']) {
    assert.match(html, new RegExp(`data-equip="${slot}"`));
  }
  assert.match(css, /\.inventory-paperdoll-panel\s*{/);
  assert.match(css, /\.inventory-equipment-slot\s*{/);
  assert.match(css, /\.inventory-paperdoll-panel \.slot-head/);
  assert.match(css, /\.inventory-paperdoll-panel \.slot-belt/);
  assert.match(runtime, /let selectedEquipmentSlot = null/);
  assert.match(runtime, /for \(const button of inventoryEquipmentButtons\)/);
  assert.match(runtime, /button\.dataset\.equippedSlot = slot/);
  assert.match(runtime, /button\.classList\.toggle\('empty', !item\)/);
  assert.match(runtime, /drawPaperDollTo\(inventoryPaperContext, inventoryPaperdoll\)/);
  assert.match(runtime, /selection\.source === 'equipment'/);
  assert.match(runtime, /unequipItem\(currentItemState\(\), selection\.slot\)/);
});

test('backpack offers persistent grid and table views below the hero preview', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.match(html, /id="inventory-filters"[\s\S]*aria-label="Фильтр предметов"/);
  assert.equal((html.match(/data-inventory-filter=/g) ?? []).length, 5);
  assert.match(html, /data-inventory-filter="all"[^>]*aria-pressed="true"/);
  assert.match(html, /data-pack-view="grid"[^>]*aria-pressed="true"/);
  assert.match(html, /data-pack-view="table"[^>]*aria-pressed="false"/);
  assert.match(css, /\.inventory-filters\s*{[^}]*grid-template-columns:\s*repeat\(5,/s);
  assert.match(css, /\.inventory-section-title\s*{[^}]*position:\s*sticky/s);
  assert.match(css, /\.pack-item\.inventory-row\s*{/);
  assert.match(css, /\.pack-item-copy strong[\s\S]*text-overflow:\s*ellipsis/);
  assert.doesNotMatch(html, /id="selection-card"/);
  assert.match(runtime, /const INVENTORY_VIEW_KEY = 'dng-codex:inventory-view:v1'/);
  assert.match(runtime, /localStorage\.setItem\(INVENTORY_VIEW_KEY, inventoryView\)/);
  assert.match(runtime, /function setInventoryView\(view\)/);
  assert.match(runtime, /includeEquipped: false/);
  assert.match(runtime, /inventorySections\(\{/);
  assert.match(runtime, /copy\.className = 'pack-item-copy'/);
  assert.match(runtime, /presentation\.primaryEffect\.text/);
  assert.match(runtime, /inventoryViewButtons\.forEach/);
  assert.match(runtime, /inventoryFilterButtons\.forEach/);
  assert.doesNotMatch(runtime, /itemDetailLanguageButton/);
});

test('inventory list only pans vertically on touch screens', async () => {
  const css = await readFile(cssUrl, 'utf8');
  const packGridRules = [...css.matchAll(/(?:^|\n)\.pack-grid\s*{(?<body>[^}]*)}/g)]
    .map((match) => match.groups?.body ?? '');

  assert.ok(packGridRules.length >= 1);
  for (const rule of packGridRules) {
    assert.match(rule, /width:\s*100%/);
    assert.match(rule, /max-width:\s*100%/);
    assert.match(rule, /overflow-x:\s*hidden/);
    assert.match(rule, /overflow-y:\s*auto/);
    assert.match(rule, /overscroll-behavior-x:\s*none/);
    assert.match(rule, /touch-action:\s*pan-y/);
  }
  assert.match(css, /\.pack-item\.inventory-row\s*{[^}]*max-width:\s*100%[^}]*min-width:\s*0/s);
});

test('a thumb-reachable contextual button appears for any adjacent registered object', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.match(html, /id="interact-action"[\s\S]*id="interact-action-icon"/);
  assert.match(css, /\.interact-action\s*{[^}]*left:\s*max\(12px[^}]*bottom:\s*max\(88px[^}]*width:\s*72px[^}]*height:\s*72px/s);
  assert.match(css, /\[data-screen='game'\] \.interact-action:not\(\[hidden\]\)/);
  assert.match(css, /@media \(orientation: landscape\)[\s\S]*\.interact-action\s*{[^}]*left:\s*max\(12px[^}]*bottom:\s*max\(86px/s);
  assert.match(runtime, /function updateInteractionUi\(\)/);
  assert.match(runtime, /const target = ready[\s\S]*\? nearbyContextTarget\(\)/);
  assert.match(runtime, /interactActionButton\.addEventListener\('click', openNearbyContextActions\)/);
  assert.match(runtime, /function startGameFromMenu\(\)[\s\S]*updateInteractionUi\(\)[\s\S]*startGameButton\.blur\(\)/);
  assert.match(runtime, /if \(heroCellKey !== lastHeroCell\)[\s\S]*updateInteractionUi\(\)/);
});

test('three manual spell buttons and every modal close action live in the thumb zone', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.equal((html.match(/data-spell-slot="[0-2]"/g) ?? []).length, 3);
  assert.match(html, /id="spell-bar"[\s\S]*data-spell-slot="0"[\s\S]*data-spell-slot="1"[\s\S]*data-spell-slot="2"/);
  assert.match(html, /id="spell-bar"[^>]*data-empty="true"/);
  assert.match(css, /\.spell-bar\s*{[^}]*right:\s*max\(12px[^}]*bottom:\s*max\(12px[^}]*grid-template-rows:\s*repeat\(3, 56px\)/s);
  assert.match(css, /\.spell-bar\[data-empty='true'\]\s*{[^}]*display:\s*none/s);
  assert.match(runtime, /spellBar\.dataset\.empty = String\(model\.slots\.every\(\(slot\) => slot\.empty\)\)/);
  assert.match(runtime, /button\.addEventListener\('click', \(\) => castPreparedSpell/);

  for (const [footerClass, closeId] of [
    ['appearance-actions', 'close-appearance'],
    ['context-action-footer', 'close-context-actions'],
    ['merchant-shop-footer', 'close-merchant-shop'],
    ['chest-container-footer', 'close-chest-container'],
    ['character-sheet-actions', 'close-character-sheet'],
    ['inventory-actions', 'close-inventory'],
    ['item-detail-actions', 'close-item-detail'],
  ]) {
    assert.match(
      html,
      new RegExp(`<footer class="${footerClass}">[\\s\\S]*?id="${closeId}"[\\s\\S]*?</footer>`),
    );
  }
});

test('opened chests use a persistent two-way mobile container instead of instant loot', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.match(html, /id="chest-container"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(html, /id="chest-storage-list"[\s\S]*id="chest-backpack-list"/);
  assert.match(html, /<footer class="chest-container-footer">[\s\S]*id="close-chest-container"/);
  assert.match(css, /\[data-screen='chest'\] \.chest-container/);
  assert.match(css, /\.chest-transfer-list\s*{[^}]*overflow-x:\s*hidden[^}]*overflow-y:\s*auto[^}]*touch-action:\s*pan-y/s);
  assert.match(css, /@media \(orientation: landscape\), \(min-width: 640px\)[\s\S]*grid-template-columns:\s*repeat\(2,/s);
  assert.match(runtime, /function openChestContainerUi\(find\)/);
  assert.match(runtime, /function transactChestItem\(direction, uid\)/);
  assert.match(runtime, /takeChestItem\(\{ command, container, uid, items: state\.items/);
  assert.match(runtime, /storeChestItem\(\{ command, container, uid, items: state\.items/);
  assert.match(runtime, /if \(find\.id !== 'sealed-cache'\) gold = result\.state\.gold/);
  assert.match(runtime, /if \(event\.code === 'Escape' && uiScreen === 'chest'\)/);
});

test('merchant UI exposes two purses and persistent buyback through command events', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.match(html, /class="merchant-shop-wallets"[\s\S]*id="merchant-shop-gold"[\s\S]*id="merchant-shop-funds"/);
  assert.match(css, /\.merchant-shop-wallets\s*{[^}]*display:\s*flex/s);
  assert.match(runtime, /MERCHANT_COMMANDS[\s\S]*buybackMerchantItem[\s\S]*merchantStateFor/);
  assert.match(runtime, /nextGameCommand\(MERCHANT_COMMANDS\.buy/);
  assert.match(runtime, /nextGameCommand\(MERCHANT_COMMANDS\.sell/);
  assert.match(runtime, /nextGameCommand\(MERCHANT_COMMANDS\.buyback/);
  assert.match(runtime, /applyGameEvents\(result\.events\)/);
});

test('targeted spells and scrolls share one explicit thumb-safe targeting screen', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.match(html, /id="ability-targeting"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(html, /id="ability-targeting-targets"/);
  assert.match(html, /id="cancel-ability-targeting"/);
  assert.match(css, /\.cancel-ability-targeting\s*{[^}]*bottom:\s*max\(14px[^}]*width:\s*58px[^}]*height:\s*58px/s);
  assert.match(css, /\.ability-targeting-target\s*{[^}]*pointer-events:\s*auto[^}]*touch-action:\s*manipulation/s);
  assert.match(runtime, /function openAbilityTargeting\(nextState\)/);
  assert.match(runtime, /function beginSpellTargeting\(slotIndex, spell, targets\)/);
  assert.match(runtime, /function beginBlinkTargeting\(itemUid\)/);
  assert.match(runtime, /performAbilityTargetAtCell\(Math\.floor\(target\.x \/ TILE\), Math\.floor\(target\.y \/ TILE\)\)/);
  assert.match(runtime, /position\.x - halfWidth < 0[\s\S]*position\.x \+ halfWidth > viewportWidth/);
  assert.match(runtime, /usedSpell\.kind === 'projectile' && usedSpell\.targetMode === 'actor' && !explicitTarget/);
  assert.match(runtime, /selection\.item\.useEffect\?\.type === 'blink'[\s\S]*beginBlinkTargeting\(selection\.item\.uid\)/);
  const blinkRuntime = runtime.slice(
    runtime.indexOf('function performBlinkTarget(target)'),
    runtime.indexOf('function performAbilityTarget(target)'),
  );
  assert.ok(blinkRuntime.indexOf('const result = resolveBlink({') < blinkRuntime.indexOf('backpackItems.splice(itemIndex, 1)'));
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
