import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { generateDungeon, revealAround } from '../tools/dcss-rpg-core.js';
import {
  FLOOR_MAP_COLORS,
  FLOOR_MAP_MARKER_KINDS,
  FLOOR_MAP_ZOOM,
  centerFloorMapView,
  clampFloorMapZoom,
  createFloorMapModel,
  fitFloorMapView,
  floorMapCellAt,
  floorMapCopy,
  floorMapTapAction,
  panFloorMapView,
  zoomFloorMapView,
  floorMapLegend,
} from '../tools/dcss-rpg-floor-map.js';

const VIEWPORT = Object.freeze({ width: 360, height: 520 });

function exploredFixture(seed = 41, depth = 2) {
  const dungeon = generateDungeon({ seed, depth });
  const revealed = new Set();
  revealAround(revealed, dungeon.grid, dungeon.spawn, 4);
  return { dungeon, revealed, hero: dungeon.spawn };
}

test('the map shows only revealed cells and drops markers the hero has not seen', () => {
  const { dungeon, revealed, hero } = exploredFixture();
  const farAway = dungeon.exit;
  const nearby = [...revealed].map((key) => key.split(',').map(Number)).find(([x, y]) => (
    dungeon.grid[y][x] === '.' && (x !== hero.x || y !== hero.y)
  ));
  const model = createFloorMapModel({
    grid: dungeon.grid,
    revealed,
    hero,
    markers: [
      { kind: 'exit', x: farAway.x, y: farAway.y },
      { kind: 'loot', x: nearby[0], y: nearby[1] },
      { kind: 'monster', x: nearby[0], y: nearby[1] },
      { kind: 'monster', x: nearby[0], y: nearby[1], visible: true },
      { kind: 'altar', x: nearby[0], y: nearby[1], muted: true },
      { kind: 'nonsense', x: nearby[0], y: nearby[1] },
    ],
  });
  assert.equal(model.cells.length, revealed.size);
  assert.ok(model.cells.every(({ x, y }) => revealed.has(`${x},${y}`)));
  assert.ok(model.cells.every(({ kind }) => ['floor', 'wall', 'door'].includes(kind)));
  assert.ok(model.cells.some(({ kind }) => kind === 'wall'));
  assert.equal(revealed.has(`${farAway.x},${farAway.y}`), false, 'the exit starts unexplored');
  assert.deepEqual(model.markers.map(({ kind }) => kind), ['loot', 'monster', 'altar', 'hero']);
  assert.equal(model.markers.find(({ kind }) => kind === 'altar').muted, true);
  assert.deepEqual(model.markers.at(-1), { x: hero.x, y: hero.y, kind: 'hero', muted: false });
  assert.ok(model.bounds.width >= 5 && model.bounds.height >= 5);
  assert.ok(Object.isFrozen(model) && Object.isFrozen(model.cells) && Object.isFrozen(model.markers));
  for (let index = 1; index < model.cells.length; index += 1) {
    const previous = model.cells[index - 1];
    const cell = model.cells[index];
    assert.ok(previous.y < cell.y || (previous.y === cell.y && previous.x < cell.x), 'cells are ordered');
  }
});

test('a fully revealed floor keeps its exit, doors and every registered kind drawable', () => {
  const dungeon = generateDungeon({ seed: 7, depth: 3 });
  const revealed = new Set();
  dungeon.grid.forEach((row, y) => [...row].forEach((_glyph, x) => revealed.add(`${x},${y}`)));
  const markers = [
    { kind: 'exit', ...dungeon.exit },
    ...dungeon.doors.map((door) => ({ kind: 'door', x: door.x, y: door.y })),
    ...dungeon.finds.map((find) => ({ kind: 'chest', x: find.x, y: find.y })),
    ...dungeon.monsters.map((monster) => ({ kind: 'monster', x: monster.x, y: monster.y, visible: true })),
  ];
  const model = createFloorMapModel({ grid: dungeon.grid, revealed, hero: dungeon.spawn, markers });
  assert.equal(model.cells.length, dungeon.grid.length * dungeon.grid[0].length);
  assert.ok(model.cells.some(({ kind }) => kind === 'door'));
  assert.equal(model.markers.filter(({ kind }) => kind === 'monster').length, dungeon.monsters.length);
  assert.ok(model.markers.some(({ kind }) => kind === 'exit'));
  assert.deepEqual(model.bounds, {
    minX: 0, minY: 0, maxX: dungeon.grid[0].length - 1, maxY: dungeon.grid.length - 1,
    width: dungeon.grid[0].length, height: dungeon.grid.length,
  });
  for (const kind of FLOOR_MAP_MARKER_KINDS) assert.ok(FLOOR_MAP_COLORS[kind], `${kind} has a colour`);
  assert.throws(() => createFloorMapModel({ grid: [], revealed, hero: dungeon.spawn }), TypeError);
  assert.throws(() => createFloorMapModel({ grid: dungeon.grid, revealed, hero: { x: 1.5, y: 2 } }), TypeError);
});

test('the initial view fits the explored area on a phone and never exceeds the fit cap', () => {
  const { dungeon, revealed, hero } = exploredFixture();
  const model = createFloorMapModel({ grid: dungeon.grid, revealed, hero });
  const view = fitFloorMapView({ bounds: model.bounds, viewport: VIEWPORT });
  assert.ok(Number.isInteger(view.zoom));
  assert.ok(view.zoom >= FLOOR_MAP_ZOOM.min && view.zoom <= FLOOR_MAP_ZOOM.fitMax);
  const left = view.pan.x + model.bounds.minX * view.zoom;
  const right = view.pan.x + (model.bounds.maxX + 1) * view.zoom;
  assert.ok(left >= 0 && right <= VIEWPORT.width, 'explored width fits horizontally');
  assert.ok(Math.abs(left - (VIEWPORT.width - right)) <= view.zoom, 'roughly centred');

  const huge = { minX: 0, minY: 0, maxX: 199, maxY: 199, width: 200, height: 200 };
  assert.equal(fitFloorMapView({ bounds: huge, viewport: VIEWPORT }).zoom, FLOOR_MAP_ZOOM.min);
  const empty = fitFloorMapView({ bounds: null, viewport: VIEWPORT });
  assert.equal(empty.zoom, FLOOR_MAP_ZOOM.fitMax);
  assert.throws(() => fitFloorMapView({ bounds: model.bounds, viewport: { width: 0, height: 10 } }), TypeError);
});

test('zooming keeps the anchored point fixed and pan never loses the explored area', () => {
  const { dungeon, revealed, hero } = exploredFixture();
  const model = createFloorMapModel({ grid: dungeon.grid, revealed, hero });
  const view = fitFloorMapView({ bounds: model.bounds, viewport: VIEWPORT });
  const anchor = { x: 120, y: 200 };
  const before = floorMapCellAt({ view, point: anchor });
  const zoomed = zoomFloorMapView({ view, factor: FLOOR_MAP_ZOOM.factor ** 3, anchor, viewport: VIEWPORT, bounds: model.bounds });
  assert.ok(zoomed.zoom > view.zoom);
  assert.deepEqual(floorMapCellAt({ view: zoomed, point: anchor }), before);

  const maxed = zoomFloorMapView({ view, factor: 1000, viewport: VIEWPORT, bounds: model.bounds });
  assert.equal(maxed.zoom, FLOOR_MAP_ZOOM.max);
  assert.equal(clampFloorMapZoom(0.2), FLOOR_MAP_ZOOM.min);
  assert.equal(clampFloorMapZoom(99), FLOOR_MAP_ZOOM.max);

  const thrown = panFloorMapView({ view, dx: -100000, dy: 100000, viewport: VIEWPORT, bounds: model.bounds });
  const contentRight = thrown.pan.x + (model.bounds.maxX + 1) * thrown.zoom;
  const contentTop = thrown.pan.y + model.bounds.minY * thrown.zoom;
  assert.ok(contentRight >= 1, 'a sliver of the map stays on screen after a wild drag');
  assert.ok(contentTop <= VIEWPORT.height - 1);

  const centred = centerFloorMapView({ view: zoomed, cell: hero, viewport: VIEWPORT, bounds: model.bounds });
  const heroCenter = {
    x: centred.pan.x + (hero.x + 0.5) * centred.zoom,
    y: centred.pan.y + (hero.y + 0.5) * centred.zoom,
  };
  assert.ok(Math.abs(heroCenter.x - VIEWPORT.width / 2) <= centred.zoom);
  assert.ok(Math.abs(heroCenter.y - VIEWPORT.height / 2) <= centred.zoom);
});

test('taps route only to known walkable cells', () => {
  const { dungeon, revealed, hero } = exploredFixture();
  const model = createFloorMapModel({ grid: dungeon.grid, revealed, hero });
  const floor = model.cells.find(({ kind, x, y }) => kind === 'floor' && (x !== hero.x || y !== hero.y));
  const wall = model.cells.find(({ kind }) => kind === 'wall');
  assert.equal(floorMapTapAction({ model, cell: hero }), 'hero');
  assert.equal(floorMapTapAction({ model, cell: floor }), 'travel');
  assert.equal(floorMapTapAction({ model, cell: wall }), 'blocked');
  assert.equal(floorMapTapAction({ model, cell: { x: dungeon.exit.x, y: dungeon.exit.y } }), 'unknown');
  assert.equal(floorMapTapAction({ model, cell: { x: -3, y: 2 } }), 'unknown');
  const view = fitFloorMapView({ bounds: model.bounds, viewport: VIEWPORT });
  const point = { x: view.pan.x + (floor.x + 0.4) * view.zoom, y: view.pan.y + (floor.y + 0.6) * view.zoom };
  assert.deepEqual(floorMapCellAt({ view, point }), { x: floor.x, y: floor.y });
});

test('map copy is bilingual and the runtime binds the map through the depth tile', async () => {
  const ru = floorMapCopy('ru');
  const en = floorMapCopy('en');
  assert.equal(ru.title('III'), 'Карта этажа III');
  assert.equal(en.title('III'), 'Floor map III');
  assert.equal(ru.open('I'), 'Открыть карту этажа I');
  assert.ok(ru.hint.length > 10 && en.hint.length > 10);
  assert.ok(ru.close && ru.center && ru.zoomIn && ru.zoomOut && en.close && en.center);

  const [runtime, html, css] = await Promise.all([
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /<button id="floor-map-button" class="depth pixel-frame tappable" type="button"/);
  assert.match(html, /id="floor-map"[\s\S]*id="floor-map-canvas"[\s\S]*class="floor-map-actions"[\s\S]*id="close-floor-map"[\s\S]*id="floor-map-center"[\s\S]*id="floor-map-zoom-out"[\s\S]*id="floor-map-zoom-in"/);
  assert.match(runtime, /function openFloorMap\(\)/);
  assert.match(runtime, /function closeFloorMap\(\{ restoreFocus = true \} = \{\}\)/);
  assert.match(runtime, /createFloorMapModel\(\{/);
  assert.match(runtime, /event\.code === 'KeyM'/);
  assert.match(runtime, /event\.code === 'Escape' && uiScreen === 'map'/);
  assert.match(runtime, /floorMapTapAction\(\{ model: floorMapModel, cell \}\) === 'travel'/);
  assert.match(runtime, /requestHeroMove\(cell\.x \+ 0\.5, cell\.y \+ 0\.5\)/);
  assert.match(runtime, /hasLineOfSight\(world, heroCell, \{ x, y \}\)/);
  assert.match(css, /\[data-screen='map'\] \.floor-map\s*{[^}]*visibility:\s*visible/s);
  assert.match(css, /\.floor-map-canvas\s*{[^}]*touch-action:\s*none/s);
  assert.match(css, /\[data-screen='map'\] \.move-control/);
});

/**
 * The map drew fourteen kinds of thing as coloured shapes and never said which
 * was which, so the only way to learn that the orange cross is a trap was to
 * walk onto one.
 */
test('the map can say what its marks mean, and the way up is one of them', () => {
  // The way back up had a shape and a place, but the kind was never allowed
  // through the filter: the runtime pushed the marker and the map dropped it.
  assert.ok(FLOOR_MAP_MARKER_KINDS.includes('ascent'), 'the way up is invisible again');
  assert.ok(FLOOR_MAP_COLORS.ascent, 'the way up has no colour of its own');
  const model = createFloorMapModel({
    grid: [['#', '#', '#'], ['#', '.', '#'], ['#', '#', '#']],
    revealed: new Set(['1,1']),
    hero: { x: 1, y: 1 },
    markers: [{ kind: 'ascent', x: 1, y: 1 }],
  });
  assert.equal(model.markers.filter(({ kind }) => kind === 'ascent').length, 1, 'the map still drops it');

  for (const language of ['ru', 'en']) {
    const legend = floorMapLegend(language);
    assert.ok(legend.length >= 15, `${language}: too few marks explained`);
    for (const row of legend) {
      assert.ok(row.label.length > 1, `${row.kind}/${language} has no name`);
      assert.match(row.color, /^#[0-9a-f]{3,8}$/i, `${row.kind} has no colour`);
      assert.ok(typeof row.shape === 'string' && row.shape.length > 0, `${row.kind} has no shape`);
    }
    // Every mark the map can draw is a mark the legend explains.
    const explained = new Set(legend.map(({ kind }) => kind));
    for (const kind of FLOOR_MAP_MARKER_KINDS) {
      assert.ok(explained.has(kind), `${kind} is drawn and never explained`);
    }
    assert.ok(floorMapCopy(language).legend.length > 4);
    assert.ok(floorMapCopy(language).legendClose.length > 4);
  }
  assert.notDeepEqual(
    floorMapLegend('ru').map(({ label }) => label),
    floorMapLegend('en').map(({ label }) => label),
  );
});
