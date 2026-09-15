import {
  ARTIFACT_PATH,
  EVENT_CATALOG,
  EXIT_PATH,
  FINAL_GATE_PATH,
  LOOT_CATALOG,
  MONSTER_CATALOG,
  SANCTUARY_PATH,
} from './dcss-rpg-content.js';
import { FIND_CATALOG } from './dcss-rpg-finds.js';
import { itemDetails } from './dcss-rpg-item-details.js';
import { PASSIVE_CREATURE_CATALOG } from './dcss-rpg-passive.js';
import { DISARMED_TRAP_PATH } from './dcss-rpg-trap-disarming.js';
import { PLAYER_TRAP_PATH } from './dcss-rpg-player-traps.js';
import { IDENTIFICATION_APPEARANCES } from './dcss-rpg-identification.js';
import {
  createVisualOverrides,
  loadVisualOverrides,
  removeVisualOverride,
  resolveVisualBinding,
  saveVisualOverrides,
  setVisualOverride,
  validateVisualOverrides,
  visualBindingKey,
} from './dcss-rpg-visual-overrides.js';

const assetRoot = new URL('../assets/dcss-preview/', document.baseURI);
const manifestUrl = new URL('sprite-manifest.json', assetRoot);
const assetUrl = (path) => new URL(path, assetRoot).href;
const PAGE_SIZE = 120;

document.querySelector('#preview-stage').style.setProperty(
  '--floor-preview',
  `url("${assetUrl('dngn/floor/grey_dirt4.png')}")`,
);

const CATEGORY_LABELS = Object.freeze({
  all: 'Все',
  find: 'Находки',
  event: 'События',
  trap: 'Ловушки',
  loot: 'Предметы',
  monster: 'Враги',
  passive: 'Животные',
  system: 'Особые',
});

const KIND_LABELS = Object.freeze({
  find: 'НАХОДКА',
  event: 'СОБЫТИЕ',
  trap: 'ЛОВУШКА',
  loot: 'ПРЕДМЕТ',
  monster: 'ВРАГ',
  passive: 'ЖИВОТНОЕ',
  system: 'ОСОБЫЙ ОБЪЕКТ',
});

const ASSET_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'all', label: 'Все' }),
  Object.freeze({ id: 'dngn', label: 'Подземелье' }),
  Object.freeze({ id: 'item', label: 'Предметы' }),
  Object.freeze({ id: 'mon', label: 'Монстры' }),
  Object.freeze({ id: 'player', label: 'Герой' }),
  Object.freeze({ id: 'effect', label: 'Эффекты' }),
]);

const SEARCH_SYNONYMS = Object.freeze({
  сундук: 'box chest coffer cache container misc_box cmski wooden pharaoh pirate jade ruby',
  ящик: 'box chest cache container',
  ловушка: 'trap blade net needle pressure plate shaft spear dart arrow bolt',
  капкан: 'trap net pressure plate blade',
  меч: 'sword blade falchion rapier scimitar',
  топор: 'axe hand_axe battleaxe executioner',
  броня: 'armour armor plate mail robe leather',
  кольцо: 'ring jewellery jewelry',
  амулет: 'amulet jewellery jewelry',
  дверь: 'door gate sealed runed',
  алтарь: 'altar shrine',
  могила: 'grave tomb sarcophagus crypt',
  статуя: 'statue idol column',
  фонтан: 'fountain wellspring',
  монстр: 'mon monster demon undead animal',
  гоблин: 'goblin',
});

const eventNames = Object.freeze({
  fountain: 'Фонтан',
  'blood-altar': 'Кровавый алтарь',
  'blade-trap': 'Клинковая ловушка',
  sarcophagus: 'Саркофаг',
});

const monsterNames = Object.freeze({
  goblin: 'Гоблин',
  bat: 'Летучая мышь',
  'zombie-rat': 'Крыса-зомби',
  gnoll: 'Гнолл',
  orc: 'Орк',
  spider: 'Паук',
  'orc-priest': 'Орк-жрец',
  wolf: 'Волк',
  'orc-warrior': 'Орк-воин',
  ghost: 'Призрак',
  'zombie-hound': 'Гончая-зомби',
  ogre: 'Огр',
  'ashen-guardian': 'Пепельный страж',
  'sanctum-guardian': 'Страж святилища',
  'depth-warden': 'Страж глубин',
  'orc-wizard': 'Орк-колдун',
  vampire: 'Вампир',
  'crimson-imp': 'Багровый бес',
  'flying-skull': 'Летающий череп',
  'hell-hound': 'Адская гончая',
  'vampire-knight': 'Рыцарь-вампир',
  'smoke-demon': 'Демон дыма',
  wyvern: 'Виверна',
  lich: 'Лич',
  'ice-dragon': 'Ледяной дракон',
  balrug: 'Балруг',
  'golden-dragon': 'Золотой дракон',
});

const passiveNames = Object.freeze({
  sheep: 'Овца',
  hog: 'Кабан',
  yak: 'Як',
});

const findPrefixes = Object.freeze({
  'sealed-cache': ['licensed/cmski-chests/', 'item/misc/', 'dngn/vaults/', 'player/hand1/misc/'],
  'crystal-vein': ['item/misc/', 'dngn/altars/'],
  'forgotten-grave': ['dngn/vaults/', 'dngn/statues/'],
});

const eventPrefixes = Object.freeze({
  fountain: ['dngn/blue_fountain'],
  'blood-altar': ['dngn/altars/'],
  'blade-trap': ['dngn/traps/'],
  sarcophagus: ['dngn/vaults/'],
});

const specialEntities = Object.freeze([
  Object.freeze({
    kind: 'trap', id: 'player-armed', channel: 'world', label: 'Установленный капкан',
    path: PLAYER_TRAP_PATH, scale: 1, offsetY: 5, prefixes: ['dngn/traps/'],
  }),
  Object.freeze({
    kind: 'trap', id: 'player-spent', channel: 'world', label: 'Сработавший капкан',
    path: PLAYER_TRAP_PATH, scale: 0.86, offsetY: 5, prefixes: ['dngn/traps/'],
  }),
  Object.freeze({
    kind: 'trap', id: 'disarmed', channel: 'world', label: 'Обезвреженная ловушка',
    path: DISARMED_TRAP_PATH, scale: 1, offsetY: 5, prefixes: ['dngn/traps/'],
  }),
  Object.freeze({
    kind: 'system', id: 'sanctuary', channel: 'world', label: 'Святилище',
    path: SANCTUARY_PATH, scale: 1, offsetY: -5, prefixes: ['dngn/altars/', 'dngn/statues/'],
  }),
  Object.freeze({
    kind: 'system', id: 'exit', channel: 'world', label: 'Спуск на следующий этаж',
    path: EXIT_PATH, scale: 1, offsetY: 0, prefixes: ['dngn/gateways/'],
  }),
  Object.freeze({
    kind: 'system', id: 'final-gate', channel: 'world', label: 'Финальные врата',
    path: FINAL_GATE_PATH, scale: 1, offsetY: 0, prefixes: ['dngn/gateways/'],
  }),
  Object.freeze({
    kind: 'system', id: 'artifact', channel: 'world', label: 'Финальный артефакт',
    path: ARTIFACT_PATH, scale: 1, offsetY: -8, prefixes: ['item/misc/', 'dngn/altars/'],
  }),
  Object.freeze({
    kind: 'system', id: 'door-panel', channel: 'world', label: 'Дверь подземелья',
    path: 'dngn/doors/closed_door.png', scale: 1, offsetY: 0, adjustable: false,
    prefixes: ['dngn/doors/'],
  }),
  Object.freeze({
    kind: 'loot', id: 'unidentified-potion', channel: 'icon', label: 'Неопознанное зелье',
    path: IDENTIFICATION_APPEARANCES.potion[0].icon, scale: 1, offsetY: -7, prefixes: ['item/potion/'],
  }),
  Object.freeze({
    kind: 'loot', id: 'unidentified-scroll', channel: 'icon', label: 'Неопознанный свиток',
    path: IDENTIFICATION_APPEARANCES.scroll[0].icon, scale: 1, offsetY: -7, prefixes: ['item/scroll/'],
  }),
  Object.freeze({
    kind: 'loot', id: 'unidentified-wand', channel: 'icon', label: 'Неопознанный жезл',
    path: IDENTIFICATION_APPEARANCES.wand[0].icon, scale: 1, offsetY: -7, prefixes: ['item/wand/'],
  }),
  Object.freeze({
    kind: 'loot', id: 'unidentified-book', channel: 'icon', label: 'Неопознанная книга',
    path: IDENTIFICATION_APPEARANCES.book[0].icon, scale: 1, offsetY: -7, prefixes: ['item/book/'],
  }),
]);

function humanize(id) {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function itemName(item) {
  try {
    return itemDetails(item, 'ru').name;
  } catch {
    return humanize(item.id);
  }
}

function defineEntity(entity) {
  const channel = entity.channel ?? (entity.kind === 'loot' ? 'icon' : 'world');
  return Object.freeze({
    ...entity,
    channel,
    key: visualBindingKey(entity.kind, entity.id, channel),
    scale: entity.scale ?? 1,
    offsetY: entity.offsetY ?? 0,
    adjustable: entity.adjustable !== false,
    prefixes: Object.freeze(entity.prefixes ?? []),
  });
}

const entities = Object.freeze([
  ...FIND_CATALOG.map((entry) => defineEntity({
    kind: 'find', id: entry.id, label: entry.copy.ru.name, path: entry.path,
    scale: 1, offsetY: entry.screenOffsetY, prefixes: findPrefixes[entry.id] ?? ['dngn/'],
  })),
  ...EVENT_CATALOG.map((entry) => defineEntity({
    kind: 'event', id: entry.id, label: eventNames[entry.id] ?? humanize(entry.id), path: entry.path,
    scale: 1, offsetY: entry.id === 'blade-trap' ? 3 : -5,
    prefixes: eventPrefixes[entry.id] ?? ['dngn/'],
  })),
  ...specialEntities.map(defineEntity),
  ...LOOT_CATALOG.map((entry) => defineEntity({
    kind: 'loot', id: entry.id, label: itemName(entry), path: entry.icon,
    scale: 1, offsetY: -7, prefixes: ['item/'],
  })),
  ...MONSTER_CATALOG.map((entry) => defineEntity({
    kind: 'monster', id: entry.id, label: monsterNames[entry.id] ?? humanize(entry.id), path: entry.path,
    scale: 1, offsetY: -10, prefixes: ['mon/'],
  })),
  ...PASSIVE_CREATURE_CATALOG.map((entry) => defineEntity({
    kind: 'passive', id: entry.id, label: passiveNames[entry.id] ?? humanize(entry.id), path: entry.path,
    scale: 1, offsetY: -9, prefixes: ['mon/animals/'],
  })),
].sort((left, right) => {
  const categoryOrder = ['find', 'event', 'trap', 'loot', 'monster', 'passive', 'system'];
  return categoryOrder.indexOf(left.kind) - categoryOrder.indexOf(right.kind)
    || left.label.localeCompare(right.label, 'ru');
}));

const elements = {
  spriteTotal: document.querySelector('#sprite-total'),
  overrideTotal: document.querySelector('#override-total'),
  entitySearch: document.querySelector('#entity-search'),
  entityFilters: document.querySelector('#entity-filters'),
  entityCount: document.querySelector('#entity-count'),
  entityList: document.querySelector('#entity-list'),
  selectedKind: document.querySelector('#selected-kind'),
  selectedName: document.querySelector('#selected-name'),
  selectedId: document.querySelector('#selected-id'),
  bindingState: document.querySelector('#binding-state'),
  previewStage: document.querySelector('#preview-stage'),
  previewSprite: document.querySelector('#preview-sprite'),
  scaleControl: document.querySelector('#scale-control'),
  scaleOutput: document.querySelector('#scale-output'),
  offsetControl: document.querySelector('#offset-control'),
  offsetOutput: document.querySelector('#offset-output'),
  selectedPath: document.querySelector('#selected-path'),
  copyPath: document.querySelector('#copy-path'),
  resetSelected: document.querySelector('#reset-selected'),
  assetSearch: document.querySelector('#asset-search'),
  compatibleOnly: document.querySelector('#compatible-only'),
  assetFilters: document.querySelector('#asset-filters'),
  assetCount: document.querySelector('#asset-count'),
  assetGrid: document.querySelector('#asset-grid'),
  loadMore: document.querySelector('#load-more'),
  saveStatus: document.querySelector('#save-status'),
  importFile: document.querySelector('#import-file'),
  importBindings: document.querySelector('#import-bindings'),
  exportBindings: document.querySelector('#export-bindings'),
  resetAll: document.querySelector('#reset-all'),
  entityTemplate: document.querySelector('#entity-template'),
  assetTemplate: document.querySelector('#asset-template'),
};

let draft = loadVisualOverrides();
let assetPaths = [];
let assetPathSet = new Set();
let selectedEntity = entities.find(({ key }) => key === decodeURIComponent(location.hash.slice(1)))
  ?? entities.find(({ id }) => id === 'sealed-cache')
  ?? entities[0];
let entityCategory = 'all';
let assetCategory = 'all';
let visibleAssetCount = PAGE_SIZE;
let statusTimer = 0;

function currentBinding() {
  return resolveVisualBinding(draft, selectedEntity.key, selectedEntity);
}

function isChanged(entity) {
  return Boolean(draft.bindings[entity.key]);
}

function setStatus(message, tone = 'saved') {
  clearTimeout(statusTimer);
  elements.saveStatus.dataset.tone = tone;
  elements.saveStatus.querySelector('strong').textContent = message;
  statusTimer = window.setTimeout(() => {
    elements.saveStatus.dataset.tone = '';
    elements.saveStatus.querySelector('strong').textContent = 'Все изменения хранятся только в этом браузере';
  }, 2600);
}

function persistDraft(message = 'Выбор сохранён — перезагрузи игру для проверки') {
  const saved = saveVisualOverrides(draft);
  elements.overrideTotal.textContent = String(Object.keys(draft.bindings).length);
  setStatus(saved ? message : 'Браузер запретил локальное сохранение', saved ? 'saved' : 'error');
}

function createFilterChip(id, label, selected, onSelect) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'filter-chip';
  button.dataset.filter = id;
  button.setAttribute('aria-pressed', String(selected));
  button.textContent = label;
  button.addEventListener('click', () => onSelect(id));
  return button;
}

function renderEntityFilters() {
  elements.entityFilters.replaceChildren(...Object.entries(CATEGORY_LABELS).map(([id, label]) =>
    createFilterChip(id, label, entityCategory === id, (next) => {
      entityCategory = next;
      renderEntityFilters();
      renderEntities();
    })));
}

function renderAssetFilters() {
  elements.assetFilters.replaceChildren(...ASSET_CATEGORIES.map(({ id, label }) =>
    createFilterChip(id, label, assetCategory === id, (next) => {
      assetCategory = next;
      visibleAssetCount = PAGE_SIZE;
      renderAssetFilters();
      renderAssets();
    })));
}

function normalizedSearch(value) {
  const query = value.trim().toLowerCase();
  return query.split(/\s+/).filter(Boolean).map((token) => [
    token,
    ...(SEARCH_SYNONYMS[token]?.split(' ') ?? []),
  ]);
}

function filteredEntities() {
  const query = elements.entitySearch.value.trim().toLowerCase();
  return entities.filter((entity) =>
    (entityCategory === 'all' || entity.kind === entityCategory)
    && (!query || `${entity.label} ${entity.id} ${entity.path}`.toLowerCase().includes(query)));
}

function selectEntity(entity, { focus = false } = {}) {
  selectedEntity = entity;
  visibleAssetCount = PAGE_SIZE;
  history.replaceState(null, '', `#${encodeURIComponent(entity.key)}`);
  renderEntities();
  renderPreview();
  renderAssets();
  if (focus) elements.previewStage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderEntities() {
  const filtered = filteredEntities();
  elements.entityCount.textContent = `${filtered.length} из ${entities.length}`;
  const fragment = document.createDocumentFragment();
  for (const entity of filtered) {
    const row = elements.entityTemplate.content.firstElementChild.cloneNode(true);
    const binding = resolveVisualBinding(draft, entity.key, entity);
    row.dataset.key = entity.key;
    row.dataset.changed = String(isChanged(entity));
    row.setAttribute('aria-selected', String(entity.key === selectedEntity.key));
    row.setAttribute('aria-label', `${entity.label}, ${KIND_LABELS[entity.kind]}`);
    row.querySelector('img').src = assetUrl(binding.path);
    row.querySelector('strong').textContent = entity.label;
    row.querySelector('small').textContent = `${CATEGORY_LABELS[entity.kind]} · ${entity.id}`;
    row.addEventListener('click', () => selectEntity(entity, { focus: innerWidth <= 720 }));
    fragment.append(row);
  }
  elements.entityList.replaceChildren(fragment);
}

function renderPreview() {
  const binding = currentBinding();
  const changed = isChanged(selectedEntity);
  elements.selectedKind.textContent = KIND_LABELS[selectedEntity.kind];
  elements.selectedName.textContent = selectedEntity.label;
  elements.selectedId.textContent = selectedEntity.key;
  elements.bindingState.textContent = changed ? 'ИЗМЕНЕНО' : 'ОРИГИНАЛ';
  elements.bindingState.dataset.changed = String(changed);
  elements.previewSprite.src = assetUrl(binding.path);
  elements.previewSprite.alt = `Спрайт: ${selectedEntity.label}`;
  elements.previewStage.style.setProperty('--sprite-scale', String(binding.scale));
  elements.previewStage.style.setProperty('--sprite-offset', `${binding.offsetY}px`);
  elements.scaleControl.value = String(Math.round(binding.scale * 100));
  elements.offsetControl.value = String(binding.offsetY);
  elements.scaleControl.disabled = !selectedEntity.adjustable;
  elements.offsetControl.disabled = !selectedEntity.adjustable;
  elements.scaleControl.closest('label').dataset.disabled = String(!selectedEntity.adjustable);
  elements.offsetControl.closest('label').dataset.disabled = String(!selectedEntity.adjustable);
  elements.scaleOutput.textContent = `${Math.round(binding.scale * 100)}%`;
  elements.offsetOutput.textContent = `${binding.offsetY > 0 ? '+' : ''}${binding.offsetY} px`;
  elements.selectedPath.textContent = binding.path;
  elements.selectedPath.title = binding.path;
  elements.resetSelected.disabled = !changed;
}

function compatibleWithSelection(path) {
  return selectedEntity.prefixes.length === 0
    || selectedEntity.prefixes.some((prefix) => path.startsWith(prefix));
}

function filteredAssets() {
  const termGroups = normalizedSearch(elements.assetSearch.value);
  return assetPaths.filter((path) => {
    const root = path.split('/')[0];
    if (assetCategory !== 'all' && root !== assetCategory) return false;
    if (elements.compatibleOnly.checked && !compatibleWithSelection(path)) return false;
    const normalizedPath = path.toLowerCase();
    if (
      termGroups.length > 0
      && !termGroups.every((group) => group.some((term) => normalizedPath.includes(term)))
    ) return false;
    return true;
  });
}

function assetLabel(path) {
  return humanize(path.split('/').at(-1).replace(/\.png$/i, ''));
}

function selectAsset(path) {
  const binding = currentBinding();
  draft = setVisualOverride(draft, selectedEntity.key, { ...binding, path });
  persistDraft();
  renderEntities();
  renderPreview();
  renderAssets();
}

function renderAssets() {
  const filtered = filteredAssets();
  const visible = filtered.slice(0, visibleAssetCount);
  const selectedPath = currentBinding().path;
  elements.assetCount.textContent = `${filtered.length} найдено · ${Math.min(visible.length, filtered.length)} показано`;
  const fragment = document.createDocumentFragment();
  for (const path of visible) {
    const tile = elements.assetTemplate.content.firstElementChild.cloneNode(true);
    tile.dataset.path = path;
    tile.setAttribute('aria-selected', String(path === selectedPath));
    tile.setAttribute('aria-label', `${assetLabel(path)}. ${path}`);
    tile.title = path;
    const image = tile.querySelector('img');
    image.src = assetUrl(path);
    image.alt = '';
    image.addEventListener('error', () => tile.dataset.broken = 'true', { once: true });
    tile.querySelector('.asset-name').textContent = assetLabel(path);
    tile.querySelector('.asset-folder').textContent = path.split('/').slice(0, -1).join('/');
    tile.addEventListener('click', () => selectAsset(path));
    fragment.append(tile);
  }
  elements.assetGrid.replaceChildren(fragment);
  elements.loadMore.hidden = visible.length >= filtered.length;
}

function updateCurrentBinding(patch) {
  if (!selectedEntity.adjustable) return;
  const binding = { ...currentBinding(), ...patch };
  draft = setVisualOverride(draft, selectedEntity.key, binding);
  persistDraft('Размер и посадка сохранены');
  renderPreview();
  renderEntities();
}

elements.entitySearch.addEventListener('input', renderEntities);
elements.assetSearch.addEventListener('input', () => {
  visibleAssetCount = PAGE_SIZE;
  renderAssets();
});
elements.compatibleOnly.addEventListener('change', () => {
  visibleAssetCount = PAGE_SIZE;
  renderAssets();
});
elements.scaleControl.addEventListener('input', () => {
  const scale = Number(elements.scaleControl.value) / 100;
  elements.previewStage.style.setProperty('--sprite-scale', String(scale));
  elements.scaleOutput.textContent = `${Math.round(scale * 100)}%`;
});
elements.scaleControl.addEventListener('change', () => {
  updateCurrentBinding({ scale: Number(elements.scaleControl.value) / 100 });
});
elements.offsetControl.addEventListener('input', () => {
  const offsetY = Number(elements.offsetControl.value);
  elements.previewStage.style.setProperty('--sprite-offset', `${offsetY}px`);
  elements.offsetOutput.textContent = `${offsetY > 0 ? '+' : ''}${offsetY} px`;
});
elements.offsetControl.addEventListener('change', () => {
  updateCurrentBinding({ offsetY: Number(elements.offsetControl.value) });
});
elements.loadMore.addEventListener('click', () => {
  visibleAssetCount += PAGE_SIZE;
  renderAssets();
});
elements.resetSelected.addEventListener('click', () => {
  draft = removeVisualOverride(draft, selectedEntity.key);
  persistDraft('Для сущности возвращён оригинальный спрайт');
  renderEntities();
  renderPreview();
  renderAssets();
});
elements.copyPath.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentBinding().path);
    setStatus('Путь скопирован');
  } catch {
    setStatus('Не удалось скопировать путь', 'error');
  }
});
elements.exportBindings.addEventListener('click', () => {
  const blob = new Blob([`${JSON.stringify(draft, null, 2)}\n`], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'dng-codex-visual-bindings.json';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
  setStatus('JSON с визуальными привязками экспортирован');
});
elements.importBindings.addEventListener('click', () => elements.importFile.click());
elements.importFile.addEventListener('change', async () => {
  const [file] = elements.importFile.files;
  elements.importFile.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!validateVisualOverrides(parsed)) throw new TypeError('invalid');
    if (
      assetPathSet.size === 0
      || Object.values(parsed.bindings).some(({ path }) => !assetPathSet.has(path))
    ) throw new TypeError('missing-sprite');
    draft = createVisualOverrides(parsed.bindings);
    persistDraft('JSON импортирован — привязки применены');
    renderEntities();
    renderPreview();
    renderAssets();
  } catch (error) {
    setStatus(
      error?.message === 'missing-sprite'
        ? 'В JSON есть спрайт, которого нет в локальной библиотеке'
        : 'Файл не является корректной схемой DNG Codex',
      'error',
    );
  }
});
elements.resetAll.addEventListener('click', () => {
  if (!confirm('Вернуть оригинальные спрайты для всех сущностей?')) return;
  draft = createVisualOverrides();
  persistDraft('Все визуальные замены удалены');
  renderEntities();
  renderPreview();
  renderAssets();
});

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if (event.key === '/') {
    event.preventDefault();
    elements.entitySearch.focus();
  } else if (event.key.toLowerCase() === 'f') {
    event.preventDefault();
    elements.assetSearch.focus();
  }
});

async function initialize() {
  renderEntityFilters();
  renderAssetFilters();
  renderEntities();
  renderPreview();
  elements.overrideTotal.textContent = String(Object.keys(draft.bindings).length);
  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`Manifest ${response.status}`);
    const manifest = await response.json();
    if (manifest.version !== 1 || !Array.isArray(manifest.paths)) throw new TypeError('Invalid manifest');
    assetPaths = manifest.paths;
    assetPathSet = new Set(assetPaths);
    elements.spriteTotal.textContent = String(manifest.count ?? assetPaths.length);
    renderAssets();
  } catch {
    elements.spriteTotal.textContent = '0';
    elements.assetCount.textContent = 'Каталог не загрузился. Запусти npm run sprites:manifest.';
    setStatus('Не удалось загрузить каталог спрайтов', 'error');
  }
}

initialize();
