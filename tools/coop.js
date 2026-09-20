/**
 * DNG Codex вдвоём: отдельный клиент на двух героев.
 *
 * Иван: «мне надо, чтобы мы вдвоём полноценно играли и развивали каждый своего
 * героя, просто локально, на одном экране телевизора, на геймпадах. Сохранять
 * или делать кнопку в меню пока не надо — просто дай мини отдельный клиент,
 * который мы запустим и сразу начнём играть».
 *
 * Отсюда три решения, которые определяют всё остальное.
 *
 * - **Отдельный клиент, а не режим.** Основная игра написана про одного героя:
 *   камера, рюкзак, смерть и сохранение знают, что он один. Второго туда можно
 *   вставить только сломав всё это; здесь же героя два с первой строки.
 * - **Правила берём готовые, интерфейс пишем свой.** Этаж, монстры, добыча и
 *   их числа приходят из тех же модулей, что и в основной игре, — они чистые и
 *   покрыты тестами. Новое здесь только то, чего в однопользовательской игре
 *   не бывает: два кошелька, два опыта, подъём упавшего и лестница на двоих.
 * - **Ни меню, ни сохранения.** Страница открылась, геймпады подключились —
 *   игра идёт. Всё, что можно отложить, отложено.
 *
 * Камера держит обоих в кадре и отъезжает, когда они расходятся: разделённый
 * экран на телевизоре делит и внимание, а вдвоём смотреть надо в одно место.
 */

import { generateDungeon, isWalkableCell } from './dcss-rpg-core.js';
import { createMonsterStates } from './dcss-rpg-rules.js';
import { biomeThemeFor } from './dcss-rpg-visuals.js';
import { lootById } from './dcss-rpg-content.js';
import {
  COOP_HERO_LOOKS,
  MONSTER_DAMAGE_SCALE,
  REVIVE_SECONDS,
  awardKill,
  canDescend,
  coopHeroStats,
  createCoopHero,
  levelFromExperience,
  partyAlive,
  reviveHero,
  tickRevive,
} from './dcss-rpg-coop.js';
import { assignPads, createPadState, readPad } from './dcss-rpg-gamepad.js';

const TILE = 64;
const ASSETS = '../assets/dcss-preview/';
const HERO_LOOK = COOP_HERO_LOOKS;
const HERO_COLOUR = ['#d6bd62', '#7fc7a4'];
const STAIR_PATH = 'dngn/gateways/enter_depths.png';

const canvas = document.querySelector('#world');
const context = canvas.getContext('2d');
const notice = document.querySelector('#notice');
const noticeTitle = document.querySelector('#notice-title');
const noticeText = document.querySelector('#notice-text');
const depthLabel = document.querySelector('#depth');
const panels = [1, 2].map((slot) => ({
  root: document.querySelector(`.party[data-slot='${slot}']`),
  health: document.querySelector(`#p${slot}-health`),
  healthText: document.querySelector(`#p${slot}-health-text`),
  xp: document.querySelector(`#p${slot}-xp`),
  xpText: document.querySelector(`#p${slot}-xp-text`),
  gold: document.querySelector(`#p${slot}-gold`),
  kills: document.querySelector(`#p${slot}-kills`),
}));

const images = new Map();
const pads = [createPadState(), createPadState()];
const seed = (Math.random() * 0xffffffff) >>> 0;

let depth = 1;
let dungeon = null;
let monsters = [];
let loot = [];
let party = [];
let running = false;
let previous = performance.now();
let shake = 0;

/** Картинку просят по пути и получают её же, сколько бы раз ни спросили. */
async function image(path) {
  if (images.has(path)) return images.get(path);
  const sprite = new Image();
  sprite.decoding = 'async';
  const ready = new Promise((resolve) => {
    sprite.addEventListener('load', () => resolve(sprite), { once: true });
    // Недостающая картинка не должна ронять этаж: рисуем пустоту и идём дальше.
    sprite.addEventListener('error', () => resolve(null), { once: true });
  });
  sprite.src = ASSETS + path;
  images.set(path, ready);
  return ready;
}

const drawn = (path) => {
  const entry = images.get(path);
  return entry instanceof Promise ? null : entry ?? null;
};

/** Ждём только то, что нужно этому этажу: клиент должен стартовать быстро. */
async function loadFloorAssets() {
  const theme = biomeThemeFor(dungeon.themeId);
  const paths = new Set([
    ...theme.floors,
    ...theme.walls,
    ...HERO_LOOK.flat(),
    STAIR_PATH,
    ...monsters.map(({ spritePath, path }) => spritePath ?? path),
    ...loot.map(({ definition }) => definition.icon).filter(Boolean),
  ]);
  const ready = await Promise.all([...paths].map(async (path) => [path, await image(path)]));
  for (const [path, sprite] of ready) images.set(path, sprite);
}

function lootOnFloor(level) {
  return level.loot.map((entry) => {
    const definition = lootById(entry.id);
    return definition
      ? { instanceId: entry.instanceId, definition, x: (entry.x + 0.5) * TILE, y: (entry.y + 0.5) * TILE }
      : null;
  }).filter(Boolean);
}

/**
 * Что даёт поднятая вещь.
 *
 * В основной игре это делают слоты, аффиксы и материалы; здесь их нет, и
 * подменять их упрощённой копией — врать. Поэтому правило одно и видимое:
 * оружие прибавляет удар по своей редкости, съедобное лечит сразу, золото
 * идёт в карман. Всё прочее поднимается и лежит.
 */
function applyPickup(hero, definition) {
  if (definition.gold) {
    hero.gold += Math.max(1, definition.amount ?? 6);
    return 'gold';
  }
  const heal = definition.useEffect?.type === 'heal' ? definition.useEffect.amount ?? 0 : 0;
  if (heal > 0) {
    const { maxHp } = coopHeroStats(hero);
    hero.hp = Math.min(maxHp, hero.hp + heal);
    return 'heal';
  }
  const attack = definition.slot === 'hand1' ? 2 + (definition.rarity ?? 0) * 2 : 0;
  hero.pack = [...hero.pack, { id: definition.id, attack }];
  return attack > 0 ? 'weapon' : 'keep';
}

function enterFloor(nextDepth) {
  depth = nextDepth;
  dungeon = generateDungeon({ seed, depth, branch: 'deep' });
  monsters = createMonsterStates(dungeon, TILE);
  loot = lootOnFloor(dungeon);
  for (const hero of party) {
    hero.x = (dungeon.spawn.x + 0.5 + (hero.slot === 1 ? -0.6 : 0.6)) * TILE;
    hero.y = (dungeon.spawn.y + 0.5) * TILE;
  }
  depthLabel.textContent = `Этаж ${'I'.repeat(Math.min(3, depth))}${depth > 3 ? ` ${depth}` : ''}`;
  return loadFloorAssets();
}

const walkable = (x, y) => isWalkableCell(dungeon.grid, Math.floor(x / TILE), Math.floor(y / TILE));

/** Движение с проверкой по осям: об стену скользят, а не залипают в ней. */
function moveActor(actor, dx, dy) {
  if (dx !== 0 && walkable(actor.x + dx, actor.y)) actor.x += dx;
  if (dy !== 0 && walkable(actor.x, actor.y + dy)) actor.y += dy;
  if (dx !== 0) actor.facing = dx < 0 ? -1 : 1;
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function nearestHero(from) {
  const alive = party.filter((hero) => hero.downed === 0);
  if (alive.length === 0) return null;
  return alive.reduce((best, hero) => (distance(from, hero) < distance(from, best) ? hero : best));
}

function heroAttack(hero) {
  if (hero.attackCooldown > 0 || hero.downed > 0) return;
  const stats = coopHeroStats(hero);
  const target = monsters
    .filter((monster) => monster.dead === 0 && distance(hero, monster) <= TILE * 0.95)
    .sort((a, b) => distance(hero, a) - distance(hero, b))[0];
  if (!target) return;
  hero.attackCooldown = 0.42;
  target.hp -= stats.attack;
  target.hit = 0.18;
  shake = Math.max(shake, 3);
  if (target.hp > 0) return;
  target.dead = 0.01;
  const mate = party.find((other) => other !== hero);
  awardKill({
    killer: hero,
    assist: mate,
    xp: target.xp ?? 4,
    gold: 2 + depth,
    nearby: Boolean(mate) && mate.downed === 0 && distance(hero, mate) <= TILE * 6,
  });
}

function updateHeroes(delta) {
  const list = assignPads([...(navigator.getGamepads?.() ?? [])]);
  const assigned = [list.hero, list.companion];
  notice.hidden = Boolean(list.hero && list.companion);
  for (const [index, hero] of party.entries()) {
    hero.attackCooldown = Math.max(0, hero.attackCooldown - delta);
    hero.hitFlash = Math.max(0, hero.hitFlash - delta);
    const pad = assigned[index];
    const { direction, edge } = readPad(pads[index], pad, delta);
    if (hero.downed > 0) continue;
    const stats = coopHeroStats(hero);
    if (direction) {
      const speed = stats.speed * TILE * delta;
      const dx = direction === 'left' ? -speed : direction === 'right' ? speed : 0;
      const dy = direction === 'up' ? -speed : direction === 'down' ? speed : 0;
      moveActor(hero, dx, dy);
    }
    if (edge.has('cross')) heroAttack(hero);
  }
}

function updateRevives(delta) {
  for (const hero of party) {
    if (hero.downed === 0) continue;
    const helper = party.find((other) => other !== hero && other.downed === 0);
    const close = helper && distance(hero, helper) <= TILE * 1.4;
    const tick = tickRevive({ downed: hero, helper: close ? helper : null, delta });
    hero.revives = tick.reviving ? tick.progress : close ? hero.revives : 0;
    if (tick.revived) reviveHero(hero);
  }
}

function updateMonsters(delta) {
  for (const monster of monsters) {
    if (monster.dead > 0) {
      monster.dead += delta;
      continue;
    }
    monster.hit = Math.max(0, (monster.hit ?? 0) - delta);
    monster.attackCooldown = Math.max(0, (monster.attackCooldown ?? 0) - delta);
    const target = nearestHero(monster);
    if (!target) continue;
    const gap = distance(monster, target);
    if (gap > (monster.vision ?? 6) * TILE) continue;
    if (gap <= TILE * 0.9) {
      if (monster.attackCooldown > 0) continue;
      monster.attackCooldown = 1 / (monster.attackRate ?? 1);
      const stats = coopHeroStats(target);
      const blow = (monster.damage ?? 4) * MONSTER_DAMAGE_SCALE - stats.defense;
      target.hp -= Math.max(1, Math.round(blow));
      target.hitFlash = 0.25;
      shake = Math.max(shake, 5);
      if (target.hp <= 0) {
        target.hp = 0;
        target.downed = 0.01;
        target.revives = 0;
      }
      continue;
    }
    const step = (monster.speed ?? 1) * TILE * delta * 0.5;
    const angle = Math.atan2(target.y - monster.y, target.x - monster.x);
    moveActor(monster, Math.cos(angle) * step, Math.sin(angle) * step);
  }
  monsters = monsters.filter((monster) => monster.dead === 0 || monster.dead < 0.8);
}

function updateLoot() {
  for (const hero of party) {
    if (hero.downed > 0) continue;
    const index = loot.findIndex((entry) => distance(entry, hero) <= TILE * 0.55);
    if (index < 0) continue;
    applyPickup(hero, loot[index].definition);
    loot.splice(index, 1);
  }
}

async function updateStairs() {
  const onStair = (hero) => (
    Math.floor(hero.x / TILE) === dungeon.exit.x && Math.floor(hero.y / TILE) === dungeon.exit.y
  );
  if (!canDescend({ party, onStair })) return;
  running = false;
  await enterFloor(depth + 1);
  running = true;
}

/** Камера держит обоих: отъезжает, когда расходятся, и не лезет за край. */
function camera() {
  const alive = party.filter((hero) => hero.downed === 0);
  const seen = alive.length > 0 ? alive : party;
  const midX = seen.reduce((total, hero) => total + hero.x, 0) / seen.length;
  const midY = seen.reduce((total, hero) => total + hero.y, 0) / seen.length;
  const spread = party.length > 1 ? distance(party[0], party[1]) : 0;
  const fit = Math.min(canvas.width, canvas.height) / (spread + TILE * 9);
  const scale = Math.max(0.55, Math.min(1.6, fit));
  return { x: midX, y: midY, scale };
}

function drawSprite(path, x, y, size) {
  const sprite = drawn(path);
  if (!sprite) return;
  context.drawImage(sprite, Math.round(x - size / 2), Math.round(y - size), size, size);
}

function render() {
  const view = camera();
  const { width, height } = canvas;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = '#05080a';
  context.fillRect(0, 0, width, height);
  context.translate(width / 2, height / 2);
  context.scale(view.scale, view.scale);
  const jitter = shake > 0 ? (Math.random() - 0.5) * shake : 0;
  context.translate(-view.x + jitter, -view.y + jitter);

  const theme = biomeThemeFor(dungeon.themeId);
  const span = Math.ceil(Math.max(width, height) / view.scale / TILE / 2) + 2;
  const centreX = Math.floor(view.x / TILE);
  const centreY = Math.floor(view.y / TILE);
  for (let y = centreY - span; y <= centreY + span; y += 1) {
    for (let x = centreX - span; x <= centreX + span; x += 1) {
      const cell = dungeon.grid[y]?.[x];
      if (cell === undefined) continue;
      const set = cell === '#' ? theme.walls : theme.floors;
      const path = set[(x * 7 + y * 13) % set.length];
      const sprite = drawn(path);
      if (sprite) context.drawImage(sprite, x * TILE, y * TILE, TILE, TILE);
      else {
        context.fillStyle = cell === '#' ? '#1b2124' : '#2a2320';
        context.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  drawSprite(STAIR_PATH, (dungeon.exit.x + 0.5) * TILE, (dungeon.exit.y + 1) * TILE, TILE);

  for (const entry of loot) drawSprite(entry.definition.icon, entry.x, entry.y + TILE * 0.35, TILE * 0.7);

  for (const monster of monsters) {
    context.globalAlpha = monster.dead > 0 ? Math.max(0, 1 - monster.dead / 0.8) : 1;
    if (monster.hit > 0) {
      context.fillStyle = 'rgb(214 96 92 / 55%)';
      context.fillRect(monster.x - TILE * 0.4, monster.y - TILE, TILE * 0.8, TILE);
    }
    drawSprite(monster.spritePath ?? monster.path, monster.x, monster.y + TILE * 0.4, TILE);
    context.globalAlpha = 1;
  }

  for (const [index, hero] of party.entries()) {
    /*
     * Метка игрока, а не украшение.
     *
     * На этаже ходят человекоподобные монстры в одежде, и через полтора метра
     * от телевизора свой герой неотличим от орка. Поэтому под ногами лежит
     * цветное кольцо с тёмной обводкой, а над головой стоит цифра: цвет ищут
     * глазами быстро, цифру читают, когда сомневаются.
     */
    context.save();
    context.globalAlpha = hero.downed > 0 ? 0.4 : 1;
    context.beginPath();
    context.ellipse(hero.x, hero.y + TILE * 0.32, 20, 7, 0, 0, Math.PI * 2);
    context.fillStyle = HERO_COLOUR[index];
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = '#05080a';
    context.stroke();
    context.restore();
    if (hero.hitFlash > 0) {
      context.fillStyle = 'rgb(214 96 92 / 60%)';
      context.fillRect(hero.x - TILE * 0.35, hero.y - TILE * 0.9, TILE * 0.7, TILE * 0.9);
    }
    context.globalAlpha = hero.downed > 0 ? 0.45 : 1;
    for (const layer of HERO_LOOK[index]) drawSprite(layer, hero.x, hero.y + TILE * 0.28, TILE);
    context.globalAlpha = 1;
    context.save();
    context.font = 'bold 15px ui-monospace, monospace';
    context.textAlign = 'center';
    context.fillStyle = '#05080a';
    context.fillRect(hero.x - 13, hero.y - TILE * 1.02, 26, 17);
    context.fillStyle = HERO_COLOUR[index];
    context.fillText(`P${hero.slot}`, hero.x, hero.y - TILE * 1.02 + 13);
    context.restore();
    if (hero.downed > 0) {
      const share = Math.min(1, hero.revives / REVIVE_SECONDS);
      context.fillStyle = '#1b2225';
      context.fillRect(hero.x - 22, hero.y - TILE * 1.26, 44, 6);
      context.fillStyle = HERO_COLOUR[index];
      context.fillRect(hero.x - 22, hero.y - TILE * 1.26, 44 * share, 6);
    }
  }
  context.setTransform(1, 0, 0, 1, 0, 0);
}

function renderHud() {
  for (const [index, hero] of party.entries()) {
    const panel = panels[index];
    const stats = coopHeroStats(hero);
    const progress = levelFromExperience(hero.xp);
    const hp = Math.max(0, Math.round(hero.hp));
    panel.health.style.width = `${(hp / stats.maxHp) * 100}%`;
    panel.healthText.textContent = `${hp}/${stats.maxHp}`;
    panel.xp.style.width = progress.need > 0 ? `${(progress.into / progress.need) * 100}%` : '100%';
    panel.xpText.textContent = progress.need > 0
      ? `ур. ${progress.level} · ${progress.into}/${progress.need}`
      : `ур. ${progress.level}`;
    panel.gold.textContent = `${hero.gold}●`;
    panel.kills.textContent = `${hero.kills} ✕`;
    panel.root.dataset.down = String(hero.downed > 0);
  }
}

function frame(now) {
  const delta = Math.min(0.05, Math.max(0, (now - previous) / 1000));
  previous = now;
  if (running && dungeon) {
    updateHeroes(delta);
    updateRevives(delta);
    updateMonsters(delta);
    updateLoot();
    updateStairs();
    shake = Math.max(0, shake - delta * 24);
    if (!partyAlive(party)) {
      running = false;
      noticeTitle.textContent = 'Отряд пал';
      noticeText.textContent = `Дошли до ${depth} этажа. Обновите страницу, чтобы начать заново.`;
      notice.hidden = false;
    }
    render();
    renderHud();
  }
  requestAnimationFrame(frame);
}

function resize() {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
}

async function start() {
  resize();
  window.addEventListener('resize', resize);
  party = [createCoopHero({ slot: 1 }), createCoopHero({ slot: 2 })];
  await enterFloor(1);
  running = true;
  requestAnimationFrame(frame);
}

start();
