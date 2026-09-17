/**
 * Floor map: a pure view-model over the cells the hero has already revealed.
 * The runtime feeds the grid, the revealed set and plain markers; this module
 * decides what is drawable, keeps zoom/pan inside sane bounds and converts
 * taps back into cells. Nothing here touches DOM, canvas or the save.
 */

export const FLOOR_MAP_ZOOM = Object.freeze({
  min: 3,
  max: 32,
  fitMax: 18,
  factor: 1.25,
});

const CELL_KINDS = Object.freeze({ '#': 'wall', '.': 'floor', D: 'door', '~': 'water' });

const SIGHT_ONLY_KINDS = Object.freeze(['monster', 'boss', 'wildlife']);

export const FLOOR_MAP_MARKER_KINDS = Object.freeze([
  'hero',
  'exit',
  'sanctuary',
  'door',
  'door-open',
  'chest',
  'crystal',
  'grave',
  'altar',
  'merchant',
  'campfire',
  'trap',
  'loot',
  ...SIGHT_ONLY_KINDS,
]);

/** One flat colour per kind, from the UI palette; the renderer draws shapes. */
export const FLOOR_MAP_COLORS = Object.freeze({
  background: '#070a0c',
  floor: '#2f393c',
  water: '#2b4f66',
  wall: '#7d8889',
  door: '#a9885a',
  'door-open': '#6f5d40',
  hero: '#f1e8d1',
  exit: '#d0b45e',
  sanctuary: '#63b5b4',
  chest: '#d9bd67',
  crystal: '#7fc8d2',
  grave: '#b45c58',
  altar: '#e0c06a',
  merchant: '#d1b35c',
  campfire: '#d88447',
  trap: '#c59663',
  loot: '#b18a48',
  monster: '#d6524c',
  boss: '#ff8a66',
  wildlife: '#b69062',
});

export const FLOOR_MAP_MARKER_SHAPES = Object.freeze({
  hero: 'hero',
  exit: 'stairs',
  door: 'door',
  'door-open': 'door',
  monster: 'dot',
  boss: 'dot',
  wildlife: 'dot',
  trap: 'cross',
  loot: 'small',
  sanctuary: 'ring',
});

const COPY = Object.freeze({
  ru: Object.freeze({
    title: (depthLabel) => `Карта этажа ${depthLabel}`,
    open: (depthLabel) => `Открыть карту этажа ${depthLabel}`,
    canvas: 'Разведанная часть этажа',
    hint: 'Тап по клетке: идти. Щипок или колесо: масштаб.',
    close: 'Закрыть карту',
    center: 'К герою',
    zoomIn: 'Приблизить',
    zoomOut: 'Отдалить',
    empty: 'Пока ничего не разведано',
  }),
  en: Object.freeze({
    title: (depthLabel) => `Floor map ${depthLabel}`,
    open: (depthLabel) => `Open floor map ${depthLabel}`,
    canvas: 'Explored part of the floor',
    hint: 'Tap a cell to travel. Pinch or scroll to zoom.',
    close: 'Close map',
    center: 'Centre on hero',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    empty: 'Nothing explored yet',
  }),
});

export function floorMapCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

const isCell = (value) => Number.isInteger(value?.x) && Number.isInteger(value?.y);

function parseKey(key) {
  if (typeof key !== 'string') return null;
  const [x, y] = key.split(',').map(Number);
  return Number.isInteger(x) && Number.isInteger(y) ? { x, y } : null;
}

/**
 * Builds the drawable snapshot. Only revealed cells become `cells`; markers
 * outside the revealed area are dropped, and sight-only markers (monsters,
 * fauna) need an explicit `visible: true` from the runtime's line of sight.
 */
export function createFloorMapModel({ grid, revealed, hero, markers = [] } = {}) {
  if (!Array.isArray(grid) || grid.length === 0 || grid[0].length === 0) {
    throw new TypeError('Floor map requires a dungeon grid');
  }
  if (!revealed || typeof revealed[Symbol.iterator] !== 'function') {
    throw new TypeError('Floor map requires revealed cells');
  }
  if (!isCell(hero)) throw new TypeError('Floor map requires the hero cell');
  if (!Array.isArray(markers)) throw new TypeError('Floor map markers must be an array');

  const revealedKeys = new Set();
  const cells = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const key of revealed) {
    const cell = parseKey(key);
    if (!cell || revealedKeys.has(key)) continue;
    const glyph = grid[cell.y]?.[cell.x];
    if (glyph === undefined) continue;
    revealedKeys.add(key);
    cells.push(Object.freeze({ x: cell.x, y: cell.y, kind: CELL_KINDS[glyph] ?? 'floor' }));
    minX = Math.min(minX, cell.x);
    minY = Math.min(minY, cell.y);
    maxX = Math.max(maxX, cell.x);
    maxY = Math.max(maxY, cell.y);
  }
  cells.sort((a, b) => a.y - b.y || a.x - b.x);

  const placed = markers
    .filter((marker) => (
      marker
      && FLOOR_MAP_MARKER_KINDS.includes(marker.kind)
      && marker.kind !== 'hero'
      && isCell(marker)
      && revealedKeys.has(`${marker.x},${marker.y}`)
      && (!SIGHT_ONLY_KINDS.includes(marker.kind) || marker.visible === true)
    ))
    .map((marker) => Object.freeze({
      x: marker.x,
      y: marker.y,
      kind: marker.kind,
      muted: marker.muted === true,
    }));
  placed.push(Object.freeze({ x: hero.x, y: hero.y, kind: 'hero', muted: false }));

  return Object.freeze({
    width: grid[0].length,
    height: grid.length,
    bounds: cells.length === 0
      ? null
      : Object.freeze({
          minX,
          minY,
          maxX,
          maxY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        }),
    cells: Object.freeze(cells),
    markers: Object.freeze(placed),
    hero: Object.freeze({ x: hero.x, y: hero.y }),
  });
}

export function clampFloorMapZoom(zoom) {
  if (!Number.isFinite(zoom)) return FLOOR_MAP_ZOOM.min;
  return Math.min(FLOOR_MAP_ZOOM.max, Math.max(FLOOR_MAP_ZOOM.min, Math.round(zoom)));
}

function validViewport(viewport) {
  return viewport && Number.isFinite(viewport.width) && Number.isFinite(viewport.height)
    && viewport.width > 0 && viewport.height > 0;
}

/** Keeps at least a margin of the explored area inside the viewport. */
export function clampFloorMapPan({ view, bounds, viewport, margin = 48 } = {}) {
  if (!validViewport(viewport) || !view) throw new TypeError('Pan clamp requires a view and viewport');
  if (!bounds) return Object.freeze({ zoom: view.zoom, pan: Object.freeze({ ...view.pan }) });
  const { zoom } = view;
  const contentLeft = bounds.minX * zoom;
  const contentRight = (bounds.maxX + 1) * zoom;
  const contentTop = bounds.minY * zoom;
  const contentBottom = (bounds.maxY + 1) * zoom;
  const keep = Math.min(margin, (bounds.width * zoom) / 2, (bounds.height * zoom) / 2);
  const x = Math.min(viewport.width - contentLeft - keep, Math.max(keep - contentRight, view.pan.x));
  const y = Math.min(viewport.height - contentTop - keep, Math.max(keep - contentBottom, view.pan.y));
  return Object.freeze({ zoom, pan: Object.freeze({ x: Math.round(x), y: Math.round(y) }) });
}

/** Initial view: the whole explored area centred, never larger than fitMax px per cell. */
export function fitFloorMapView({ bounds, viewport, padding = 24 } = {}) {
  if (!validViewport(viewport)) throw new TypeError('Floor map fit requires a viewport');
  if (!bounds) {
    return Object.freeze({
      zoom: FLOOR_MAP_ZOOM.fitMax,
      pan: Object.freeze({ x: Math.round(viewport.width / 2), y: Math.round(viewport.height / 2) }),
    });
  }
  const usableWidth = Math.max(1, viewport.width - padding * 2);
  const usableHeight = Math.max(1, viewport.height - padding * 2);
  const zoom = Math.min(
    FLOOR_MAP_ZOOM.fitMax,
    clampFloorMapZoom(Math.floor(Math.min(usableWidth / bounds.width, usableHeight / bounds.height))),
  );
  const pan = {
    x: Math.round((viewport.width - bounds.width * zoom) / 2 - bounds.minX * zoom),
    y: Math.round((viewport.height - bounds.height * zoom) / 2 - bounds.minY * zoom),
  };
  return Object.freeze({ zoom, pan: Object.freeze(pan) });
}

export function centerFloorMapView({ view, cell, viewport, bounds = null } = {}) {
  if (!view || !isCell(cell) || !validViewport(viewport)) throw new TypeError('Centre requires view, cell and viewport');
  const pan = {
    x: viewport.width / 2 - (cell.x + 0.5) * view.zoom,
    y: viewport.height / 2 - (cell.y + 0.5) * view.zoom,
  };
  return clampFloorMapPan({ view: { zoom: view.zoom, pan }, bounds, viewport });
}

/** Zooms so the world point under `anchor` (canvas px) stays under it. */
export function zoomFloorMapView({ view, factor, anchor, viewport, bounds = null } = {}) {
  if (!view || !Number.isFinite(factor) || factor <= 0 || !validViewport(viewport)) {
    throw new TypeError('Zoom requires a view, a positive factor and a viewport');
  }
  const nextZoom = clampFloorMapZoom(view.zoom * factor);
  if (nextZoom === view.zoom) return clampFloorMapPan({ view, bounds, viewport });
  const point = anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)
    ? anchor
    : { x: viewport.width / 2, y: viewport.height / 2 };
  const ratio = nextZoom / view.zoom;
  const pan = {
    x: point.x - (point.x - view.pan.x) * ratio,
    y: point.y - (point.y - view.pan.y) * ratio,
  };
  return clampFloorMapPan({ view: { zoom: nextZoom, pan }, bounds, viewport });
}

export function panFloorMapView({ view, dx, dy, viewport, bounds = null } = {}) {
  if (!view || !Number.isFinite(dx) || !Number.isFinite(dy)) throw new TypeError('Pan requires a view and deltas');
  return clampFloorMapPan({
    view: { zoom: view.zoom, pan: { x: view.pan.x + dx, y: view.pan.y + dy } },
    bounds,
    viewport,
  });
}

export function floorMapCellAt({ view, point } = {}) {
  if (!view || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new TypeError('Cell lookup requires a view and a point');
  }
  return Object.freeze({
    x: Math.floor((point.x - view.pan.x) / view.zoom),
    y: Math.floor((point.y - view.pan.y) / view.zoom),
  });
}

/** What a tap on the map should do; the runtime routes only on 'travel'. */
export function floorMapTapAction({ model, cell } = {}) {
  if (!model || !isCell(cell)) return 'unknown';
  if (cell.x === model.hero.x && cell.y === model.hero.y) return 'hero';
  const known = model.cells.find((candidate) => candidate.x === cell.x && candidate.y === cell.y);
  if (!known) return 'unknown';
  return known.kind === 'wall' ? 'blocked' : 'travel';
}
