import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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

  assert.equal((html.match(/<div class="health"[^>]*>[\s\S]*?<\/div>/)?.[0].match(/<i><\/i>/g) ?? []).length, 6);
  assert.equal((html.match(/data-inventory-filter=/g) ?? []).length, 5);
});

test('hunger and rest are read as words and answer a tap, like every other state', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);
  // «Индикаторы голода и сна не читаются» — a 6px bar with ◆ beside it said
  // neither how full the hero was nor what being hungry costs.
  for (const id of ['hunger-meter', 'rest-meter']) {
    const tag = html.match(new RegExp(`<[a-z]+ id="${id}"[^>]*>`))?.[0] ?? '';
    assert.match(tag, /^<button /, `${id} is not pressable`);
    assert.match(tag, /type="button"/);
    assert.match(tag, /class="[^"]*tappable/, `${id} does not look pressable either`);
  }
  /**
   * Слово сменилось картинкой. Иван: «не нравится, что голод и сон написаны
   * словами — надо иконки в нашем стиле». Прежний ромбик «◆» не читался
   * потому, что был текстовым значком, а не рисунком; кусок мяса и палатка
   * называют шкалу без единой буквы, а СКОЛЬКО осталось по-прежнему говорит
   * полоска — она для того и выросла во всю ширину.
   */
  const { requiredAssetPaths } = await import('../tools/dcss-rpg-required-assets.js');
  const loaded = requiredAssetPaths();
  for (const id of ['hunger-icon', 'rest-icon']) {
    const tag = html.match(new RegExp(`<img id="${id}"[^>]*>`))?.[0] ?? '';
    assert.ok(tag, `${id} is not an image`);
    assert.match(tag, /class="[^"]*meter-icon/, `${id} has no size of its own`);
    // Пустой alt: имя состояния живёт в `aria-label` кнопки, и повторять его
    // на картинке значило бы читать его дважды подряд.
    assert.match(tag, /alt=""/, `${id} repeats what the button already says`);
    const source = tag.match(/src="\.\.\/assets\/dcss-preview\/([^"]+)"/)?.[1] ?? '';
    assert.ok(source, `${id} has no picture`);
    assert.ok(existsSync(new URL(`../public/assets/dcss-preview/${source}`, import.meta.url)), `${source} does not ship`);
    assert.ok(loaded.includes(source), `${source} is never loaded`);
  }
  // Слов в шкалах больше нет вовсе.
  assert.doesNotMatch(runtime, /hungerLabel|restLabel/, 'the word is still being written');
  // Но состояние по-прежнему называется — голосом кнопки.
  assert.match(runtime, /hungerMeter\.setAttribute\('aria-label', presentation\.ariaLabel\)/);
  assert.match(runtime, /restMeter\.setAttribute\('aria-label', rest\.ariaLabel\)/);
  const meters = html.match(/<button id="hunger-meter"[\s\S]*?<\/button>[\s\S]*?<\/button>/)?.[0] ?? '';
  assert.doesNotMatch(meters, /[◆☾]/, 'the glyphs nobody could read are gone');
  // A bar you can count beats a bar you squint at, and health already proved it.
  assert.match(css, /\.hunger-meter > i::after/);
  assert.match(css, /repeating-linear-gradient/);
  // Pressing it prints the same sentence the state badges print.
  assert.match(runtime, /hungerMeter\.addEventListener\('click'/);
  assert.match(runtime, /restMeter\.addEventListener\('click'/);
  assert.match(runtime, /function meterNote\(/);
  // And the row is no longer hidden from anything that reads the screen aloud.
  assert.doesNotMatch(html, /<div class="vitals" aria-hidden/);
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
  // Левая полка: рюкзак внизу, кнопки взаимодействия на ступень выше. Своей
  // кнопки у святилища больше нет — оно стало обычным взаимодействием с окном,
  // потому что вся его суть (сколько лечит и почём) в значок не помещалась.
  assert.match(css, /--dock-button:\s*66px/);
  assert.match(css, /--dock-step:\s*calc\(var\(--dock-button\) \+ var\(--dock-gap\)\)/);
  assert.match(dock, /\.bag-button\s*{[^}]*left:\s*var\(--dock-edge\)[^}]*bottom:\s*var\(--dock-floor\)/s);
  assert.match(dock, /\.interact-action\s*{[^}]*left:\s*var\(--dock-edge\)[^}]*bottom:\s*calc\(var\(--dock-floor\) \+ var\(--dock-step\)\)/s);
  assert.doesNotMatch(css, /sanctuary-action/);
  // Right track: one spell column; centre track stays the centred joystick.
  assert.match(dock, /\.spell-bar\s*{[^}]*right:\s*max\(12px[^}]*bottom:\s*var\(--dock-floor\)[^}]*transform:\s*none/s);
  assert.doesNotMatch(css, /\.spell-bar\s*{[^}]*right:\s*50%/s);
  assert.doesNotMatch(css, /\.spell-bar\s*{[^}]*grid-template-columns:\s*repeat\(3/s);
  // Feedback leaves the thumb zone: toasts sit under the HUD at the top.
  assert.match(css, /\.loot-toast\s*{[^}]*top:\s*max\(158px/s);
  assert.doesNotMatch(css, /\.loot-toast\s*{[^}]*bottom:\s*max\(1\dpx/s);
  // Narrow phones shrink the side buttons instead of letting tracks touch.
  assert.match(dock, /@media \(max-width: 344px\)[\s\S]*--dock-button:\s*60px/s);
  assert.match(dock, /@media \(orientation: landscape\) and \(max-height: 520px\)[\s\S]*--dock-floor:\s*max\(10px/s);
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

/**
 * Кнопки подписаны значками, а не символами шрифта.
 *
 * Было ▶ ↻ ◆ ✦ ⚙ ♥ ♪ ◎ ☠ ✧ — типографские знаки, которые рядом с пиксельным
 * миром читались как случайный шрифт. Рюкзак был нарисован клетками вручную, и
 * Иван сказал прямо: «он у нас сейчас не очень». Выбран набор game-icons.net:
 * сплошные силуэты, нарисованные ровно для инвентарей и панелей.
 *
 * Значок работает маской, а не картинкой: цвет берётся из `currentColor`, и
 * потому он гаснет вместе с выключенной кнопкой и желтеет на выбранной — без
 * второго файла на каждое состояние.
 */
test('значки интерфейса — маски из набора, а не символы шрифта', async () => {
  const [html, css] = await Promise.all([readFile(htmlUrl, 'utf8'), readFile(cssUrl, 'utf8')]);

  // Рюкзак — та же общая механика, что у остальных кнопок.
  assert.match(html, /<i class="ui-icon bag-glyph" data-icon="backpack"/);
  assert.ok(!html.includes('bag-pixel-buckle'), 'нарисованный вручную рюкзак остался в разметке');

  const общее = css.match(/\.ui-icon\s*{(?<body>[^}]*)}/)?.groups?.body ?? '';
  assert.match(общее, /background:\s*currentColor/, 'значок перестал краситься цветом кнопки');
  assert.match(общее, /mask-size:\s*contain/);

  // Каждый значок в разметке обязан иметь и файл, и правило маски.
  const имена = [...new Set([...html.matchAll(/data-icon="([a-z-]+)"/g)].map((m) => m[1]))];
  assert.ok(имена.length >= 12, `значков всего ${имена.length} — подмена не доехала`);
  for (const имя of имена) {
    assert.ok(css.includes(`.ui-icon[data-icon='${имя}']`), `${имя}: нет правила маски`);
    assert.ok(css.includes(`../assets/icons/${имя}.svg`), `${имя}: маска не указывает на файл`);
    await access(new URL(`../public/assets/icons/${имя}.svg`, import.meta.url));
  }

  /*
   * Ни одного шрифтового значка на кнопках. Ромб `◆` из списка исключён
   * намеренно: он остался разделителем между «Уровень 1» и «Этаж I», а это
   * типографика, а не иконка. Золото в шапке лавки ромбом быть перестало.
   */
  for (const знак of ['▶', '↻', '✦', '⚙', '♥', '♪', '◎', '☠', '✧']) {
    assert.ok(!html.includes(знак), `в разметке остался символ ${знак}`);
  }
  assert.match(
    html,
    /id="merchant-shop-gold"[^>]*>\s*<img class="text-icon" src="[^"]*coin-gold\.png"/,
    'в лавке золото снова обозначено ромбом',
  );
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
  // A toast is a line of news, not a third of the screen.
  assert.match(css, /\.loot-toast\s*{[^}]*width:\s*min\(340px, calc\(100vw - 24px\)\)/s);
  assert.match(css, /\.loot-toast\s*{[^}]*min-height:\s*56px/s);
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

test('every reachable thing gets its own thumb-reachable button, stacked upward', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  // The column is the anchored thing now; the buttons inside it are made one per
  // reachable target. The game used to answer «what is nearby» with one thing
  // and stop looking, so a hero between a chest, a companion and a door could
  // only touch the chest.
  assert.match(html, /id="interact-actions"/);
  assert.match(css, /\.interact-actions\s*{[^}]*left:\s*var\(--dock-edge\)[^}]*flex-direction:\s*column-reverse/s);
  assert.match(css, /\.interact-action\s*{[^}]*width:\s*var\(--dock-button\)[^}]*height:\s*var\(--dock-button\)/s);
  assert.match(css, /@media \(orientation: landscape\)[\s\S]*\.interact-action\s*{[^}]*left:\s*max\(12px[^}]*bottom:\s*max\(86px/s);
  assert.match(runtime, /function updateInteractionUi\(\)/);
  assert.match(runtime, /const targets = ready[\s\S]*\? nearbyContextTargets\(\)\.slice\(0, INTERACT_COLUMN_LIMIT\)/);
  assert.match(runtime, /button\.addEventListener\('click', \(\) => openContextActions\(target\)\)/);
  // And the first of them is still what the keyboard and the old code reach.
  assert.match(runtime, /function nearbyContextTarget\(\) \{\s*return nearbyContextTargets\(\)\[0\] \?\? null;/);
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
  assert.match(css, /\.spell-bar\s*{[^}]*right:\s*max\(12px[^}]*bottom:\s*var\(--dock-floor\)[^}]*grid-template-rows:\s*repeat\(3, var\(--dock-button\)\)/s);
  assert.match(css, /\.spell-bar\[data-empty='true'\]\s*{[^}]*display:\s*none/s);
  assert.match(runtime, /spellBar\.dataset\.empty = String\(model\.slots\.every\(\(slot\) => slot\.empty\)\)/);
  assert.match(runtime, /button\.addEventListener\('click', \(\) => castPreparedSpell/);

  for (const [footerClass, closeId] of [
    ['appearance-actions', 'close-appearance'],
    ['context-action-footer', 'close-context-actions'],
    ['merchant-shop-footer', 'close-merchant-shop'],
    ['chest-container-footer', 'close-chest-container'],
    ['character-sheet-actions', 'close-character-sheet'],
    ['floor-map-actions', 'close-floor-map'],
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
  assert.match(runtime, /takeChestItem\(\{\s*command, container, uid, items: state\.items/);
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
  assert.match(runtime, /function beginBlinkTargeting\(itemUid, effectOverride = null\)/);
  assert.match(runtime, /performAbilityTargetAtCell\(Math\.floor\(target\.x \/ TILE\), Math\.floor\(target\.y \/ TILE\)\)/);
  assert.match(runtime, /position\.x - halfWidth < 0[\s\S]*position\.x \+ halfWidth > viewportWidth/);
  assert.match(runtime, /TARGETED_SPELL_KINDS\.includes\(usedSpell\.kind\) && usedSpell\.targetMode === 'actor' && !explicitTarget/);
  assert.match(runtime, /selection\.item\.useEffect\?\.type === 'blink'[\s\S]*beginBlinkTargeting\(selection\.item\.uid, variantEffect\)/);
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

/**
 * A refusal must not look like a gift.
 *
 * The full backpack was announced on exactly the card a pickup uses: same icon,
 * same name, same rarity marks, one small line changed. So the player read the
 * card as «taken», walked on, and found the thing still lying where it was —
 * which reads as an item that cannot be picked up rather than as a full bag.
 */
test('the toast that says no does not look like the toast that says yes', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /lootToast\.dataset\.refused = String\(value === 'full'\)/);
  const styles = await readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8');
  const refused = styles.slice(styles.indexOf(".loot-toast[data-refused='true']"));
  assert.ok(refused.length > 0, 'the refusal has no look of its own');
  assert.match(refused, /--rarity: #b4635c/, 'the edge keeps the colour of the thing it refused');
  assert.match(refused, /text-decoration: line-through/, 'the name is not struck through');
});

/** The body of a top-level function, from its header to the closing brace in column one. */
function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is gone`);
  const end = source.indexOf('\n}', start);
  return source.slice(start, end);
}

test('tapping a creature talks to it instead of walking through it', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');
  const finder = functionBody(runtime, 'contextTargetAtCell');
  const kinds = [...finder.matchAll(/kind: '([a-z-]+)'/g)].map(([, kind]) => kind);
  assert.deepEqual(
    kinds.sort(),
    ['companion', 'guard', 'house-deed', 'parley', 'priest', 'recruiter', 'tavern-hire', 'wildlife'],
    'everything on the map that can be spoken to should answer a tap',
  );

  // Reading a creature's pixel position as a grid one puts it a hundred cells
  // away, so the tap would always route instead of ever opening the panel.
  const adjacency = functionBody(runtime, 'contextTargetIsAdjacent');
  const pixelActors = adjacency.slice(0, adjacency.indexOf('const x ='));
  for (const kind of kinds) {
    assert.ok(pixelActors.includes(`'${kind}'`), `${kind} is not read as an actor by the reach test`);
  }

  // The tap and the button column must name the same targets, or one of them lies.
  const column = functionBody(runtime, 'nearbyContextTargets');
  for (const kind of kinds) {
    assert.ok(column.includes(`add('${kind}'`), `${kind} answers a tap but never gets a button`);
  }

  // An enemy is not on the list: a tap on one is a swing, not a conversation.
  assert.ok(!finder.includes("kind: 'enemy'"));
  assert.ok(finder.includes('!person.provoked'), 'a guard who has drawn on you is a fight');

  const tap = functionBody(runtime, 'moveFromPointer');
  const called = tap.indexOf('contextTargetAtCell(');
  assert.notEqual(called, -1, 'the world tap never asks who is standing there');
  assert.ok(called < tap.indexOf('requestHeroMove('), 'the hero walks before anyone is asked');
  assert.ok(tap.includes('routeHeroBesideCell('), 'a creature out of reach should be walked up to');
});

test('everything the hero can reach is reached by one rule, diagonals included', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');
  const finders = [
    'nearbyMerchant', 'nearbyCampfire', 'nearbyCampProp', 'nearbyDetectedTrap',
    'nearbyCityGate', 'nearbyGuard', 'nearbyWildlife', 'nearbyCompanion', 'nearbyDoor',
  ];
  for (const name of finders) {
    const body = functionBody(runtime, name);
    // A Manhattan sum is a diamond, not a neighbourhood: it drops the four
    // diagonal cells that the panel behind the button counts as adjacent.
    assert.doesNotMatch(
      body,
      /Math\.abs\([^)]*\)\s*\+\s*Math\.abs\(/,
      `${name} measures reach as a diamond and hides diagonal neighbours`,
    );
    assert.match(body, /cellStepDistance\(/, `${name} does not use the shared reach rule`);
  }
});

test('a state is read in a window, not in a note that erases itself', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);
  // «Пускай открывается модалка на всё окно, чтобы нормально почитать, а не
  // вот это вот маленькое окошко». The corner line is gone entirely.
  for (const source of [html, css, runtime]) {
    assert.ok(!source.includes('hero-effect-note'), 'the little note is still there');
  }
  for (const id of ['lore', 'lore-title', 'lore-subtitle', 'lore-icon', 'lore-body', 'close-lore']) {
    assert.ok(html.includes(`id="${id}"`), `${id} is missing`);
  }
  // A modal, held to the same promises as the item window beside it.
  const tag = html.match(/<section\s+id="lore"[\s\S]*?>/)[0];
  assert.match(tag, /role="dialog"/);
  assert.match(tag, /aria-modal="true"/);
  assert.match(tag, /aria-hidden="true"/);
  assert.match(css, /\.lore\[aria-hidden='false'\]/);
  // It floats above the shop and the bag, both of which can be underneath it.
  const layer = (selector) => Number(css.match(new RegExp(`\\${selector} \\{[\\s\\S]*?z-index: (\\d+)`))[1]);
  assert.ok(layer('.lore') > layer('.item-detail'), 'the reading window sits under the item window');
  assert.ok(layer('.item-detail') > layer('.merchant-shop'), 'the item window sits under the shop');

  // Everything that used to print a sentence now opens the window.
  assert.match(runtime, /function openLore\(\{ title/);
  assert.match(runtime, /badge\.addEventListener\('click', \(\) => openLore\(\{/);
  assert.match(runtime, /function openMeterLore\(/);
  assert.match(runtime, /hungerMeter\.addEventListener\('click', \(\) => \{\s*openMeterLore\(/);
  assert.match(runtime, /restMeter\.addEventListener\('click', \(\) => \{\s*openMeterLore\(/);
  // And it closes the way every other window closes.
  assert.match(runtime, /closeLoreButton\.addEventListener\('click', closeLore\)/);
  assert.match(runtime, /event\.code === 'Escape' && loreIsOpen\(\)/);
});

/**
 * «Интерфейс перегружен» — разбор показал, что часть перегруза была не
 * замыслом, а отсутствием одной строки в стилях.
 *
 * Браузерное `[hidden] { display: none }` живёт на нулевой специфичности, и
 * любой `.класс { display: grid }` его перебивает. Шесть узлов игра честно
 * прятала кодом, а экран их всё равно показывал: карточку навыка до выбора,
 * панель заклинаний без единого заклинания, условия забега, кнопку «Начать
 * заново», кнопку портала в городе и вкладки рюкзака.
 */
test('атрибут hidden сильнее любого класса', async () => {
  const css = await readFile(cssUrl, 'utf8');
  assert.match(css, /\[hidden\] \{\s*display: none !important;\s*\}/);
  // И правило стоит рано: позже него идут сотни классов с display, и порядок
  // важен только для одинаковой специфичности — но !important снимает и это,
  // поэтому проверяем сам факт, а не место.
  const html = await readFile(htmlUrl, 'utf8');
  for (const id of ['character-spells', 'inventory-filters', 'open-portal']) {
    assert.ok(html.includes(`id="${id}"`), `${id} исчез из разметки`);
  }
});

/**
 * «Над двумя предметами висели семь управляющих кнопок.» Фильтр по двум
 * вещам не экономит ни одного движения — он только занимает верх экрана.
 */
test('фильтры рюкзака появляются, когда в рюкзаке есть что искать', async () => {
  const { INVENTORY_CONTROLS_THRESHOLD, inventoryControlsUseful } =
    await import('../tools/dcss-rpg-inventory-ui.js');
  assert.equal(inventoryControlsUseful(0), false);
  assert.equal(inventoryControlsUseful(INVENTORY_CONTROLS_THRESHOLD - 1), false);
  assert.equal(inventoryControlsUseful(INVENTORY_CONTROLS_THRESHOLD), true);
  assert.equal(inventoryControlsUseful(null), false);
  const runtime = await readFile(runtimeUrl, 'utf8');
  assert.match(runtime, /inventoryFilters\.hidden = !controls;/);
  assert.match(runtime, /inventoryViewSwitcher\.hidden = !controls;/);
  // Спрятанная вкладка не имеет права оставить рюкзак отфильтрованным: вещи
  // пропали бы, а кнопки, которая это объяснит, на экране больше нет.
  assert.match(runtime, /if \(!controls && inventoryFilter !== 'all'\) \{/);
});

/** Объяснение по запросу: двести тридцать пять знаков не висят всегда. */
test('описание характеристики раскрывается тапом', async () => {
  const [runtime, css] = await Promise.all([readFile(runtimeUrl, 'utf8'), readFile(cssUrl, 'utf8')]);
  assert.match(runtime, /name\.className = 'character-attribute-name';/);
  assert.match(runtime, /name\.setAttribute\('aria-expanded', String\(openAttributeId === id\)\);/);
  assert.match(runtime, /description\.hidden = openAttributeId !== id;/);
  // Повторный тап закрывает — иначе раскрытое уже не убрать.
  assert.match(runtime, /openAttributeId = openAttributeId === id \? null : id;/);
  assert.match(css, /\.character-attribute-name\[aria-expanded='true'\]/);
});

/**
 * «Давай уберём обводку в интерфейсе, чтобы она разгрузила его.» Совсем снять
 * нельзя: рамка отличает нажимаемое от ненажимаемого, и это правило Иван
 * просил раньше — «полоска здоровья и кнопка рюкзака носили одинаковую рамку».
 */
test('панель носит волосяную линию, клавиша — рамку', async () => {
  const css = await readFile(cssUrl, 'utf8');
  const rule = css.slice(css.indexOf('.pixel-frame:not(.tappable):not(button) {'));
  const body = rule.slice(0, rule.indexOf('}'));
  assert.ok(body, 'панели снова обведены как клавиши');
  // Ширина рамки не трогается: она в потоке, и три пикселя с каждой стороны
  // сдвинули бы все выверенные размеры панелей.
  assert.doesNotMatch(body, /border-width|border:/, 'рамка меняет размер панели');
  assert.match(body, /border-color: var\(--coal\);/);
  assert.match(body, /box-shadow: inset 0 0 0 1px/);
  // А клавиша по-прежнему клавиша: своя рамка и губа тени под ней.
  assert.match(css, /\.pixel-frame \{\s*border: var\(--pixel-unit\) solid var\(--frame-mid\);/);
  assert.match(css, /\.tappable \{/);
});

/**
 * «Эта кнопка ломается в городе — надо ставить иконку домика.» Ломалась
 * буквально: значок размером с римскую цифру, а в городе `romanDepth` отдаёт
 * слово «ГОРОД» — пять букв в квадрате под одну-две.
 */
test('в городе на значке этажа домик, а не слово', async () => {
  const [runtime, html] = await Promise.all([readFile(runtimeUrl, 'utf8'), readFile(htmlUrl, 'utf8')]);
  const tag = html.match(/<img id="depth-home"[^>]*>/)?.[0] ?? '';
  assert.ok(tag, 'домика нет в разметке');
  assert.match(tag, /alt=""/, 'домик читается вслух поверх подписи кнопки');
  assert.match(tag, /hidden/, 'домик видно и вне города');
  const source = tag.match(/src="\.\.\/assets\/dcss-preview\/([^"]+)"/)?.[1] ?? '';
  assert.ok(existsSync(new URL(`../public/assets/dcss-preview/${source}`, import.meta.url)), `${source} не поставляется`);
  const { requiredAssetPaths } = await import('../tools/dcss-rpg-required-assets.js');
  assert.ok(requiredAssetPaths().includes(source), `${source} не грузится`);
  // Цифра и домик меняются местами, а не накладываются друг на друга.
  assert.match(runtime, /numeral\.textContent = inCity \? '' : romanDepth\(dungeon\.depth\);/);
  assert.match(runtime, /numeral\.hidden = inCity;/);
  assert.match(runtime, /depthHome\.hidden = !inCity;/);
});

/** Подвал рюкзака не держит места под кнопку, которой сейчас нет. */
test('«Получить» появляется только во время разбора, «Разбор» — только когда есть что разбирать', async () => {
  const [runtime, css] = await Promise.all([readFile(runtimeUrl, 'utf8'), readFile(cssUrl, 'utf8')]);
  const hidden = css.slice(css.indexOf('#salvage-confirm {'));
  assert.match(hidden.slice(0, hidden.indexOf('}')), /display: none;/, 'кнопка держит место, будучи прозрачной');
  assert.match(css, /\[data-salvage='true'\] #salvage-confirm \{\s*display: inline-flex;/);
  assert.match(runtime, /salvageButton\.hidden = carried === 0;/);
  // Слово «Разбор» на телефоне вернулось: место освободилось.
  const narrow = css.slice(css.indexOf('#salvage-confirm strong {'));
  assert.doesNotMatch(narrow.slice(0, 80), /#salvage strong/, 'подпись «Разбор» снова скрыта');
});

/**
 * Выбор класса и сборка своего — два шага, а не одно окно.
 *
 * Сначала было всё сразу: четыре готовых героя и под ними три строки
 * характеристик с сорока навыками. Иван: «надо разделить выбор класса — сначала
 * выбор класса и в этом выборе кнопка „Создать свой“, и только потом уже
 * создавать свой класс, а не мешать это всё в одно окно».
 */
test('экран создания героя разделён на два шага', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');
  const разметка = await readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8');
  const стили = await readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8');

  // Шаг записан на карточке, и по нему прячется половина экрана.
  assert.match(runtime, /creationCard\.dataset\.step = creationStep;/);
  assert.match(стили, /\[data-step='archetypes'\] \.creation-custom/);
  assert.match(стили, /\[data-step='custom'\] \.creation-archetypes/);
  assert.match(разметка, /id="creation-open-custom"/);

  /*
   * «Начать» на первом шаге ждёт выбора.
   *
   * Иначе её можно было бы нажать, не выбрав никого, — и забег начинался бы
   * героем без единого очка, хотя очки игроку предлагали.
   */
  assert.match(runtime, /confirmCreationButton\.disabled = !свой && !model\.archetypes\.some/);
  // «Назад» со второго шага возвращает к выбору, а не закрывает всё окно.
  assert.match(runtime, /function backFromCreation\(\)/);
  assert.match(runtime, /if \(creationStep !== 'custom'\) return closeCharacterCreation\(\);/);
});
