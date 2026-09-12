import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createWorld } from './world.js';
import { createActor } from './actors.js';
import { createUI, icon } from './ui.js';

const APP_BASE = new URL(import.meta.env.BASE_URL, document.baseURI);
const SAVE_KEY = 'little-islands:v1';
const NEIGHBOURS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.querySelector('#scene');
const clamp = THREE.MathUtils.clamp;
const ease = t => t * t * (3 - 2 * t);
function readSave() {
  for (const key of [SAVE_KEY, `${SAVE_KEY}:backup`]) {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (!data || data.version !== 1) continue;
      if (['level', 'coins', 'attackUp', 'hpUp', 'potionUp'].some(k => !Number.isFinite(data[k]) || data[k] < 0 || data[k] > 1e6)) continue;
      if (!Number.isInteger(data.level) || data.level < 1) continue;
      if (data.run && (!Number.isFinite(data.run.hp) || !Number.isFinite(data.run.potions) || !Array.isArray(data.run.cleared))) data.run = null;
      return data;
    } catch { /* Recover from the previous save, or start safely. */ }
  }
  return { version: 1, level: 1, coins: 0, attackUp: 0, hpUp: 0, potionUp: 0, muted: false, run: null };
}
const state = readSave();
const maxHp = () => 24 + state.hpUp * 4;
const attack = () => 4 + state.attackUp;
const freshRun = () => ({ hp: maxHp(), potions: 2 + state.potionUp, cleared: [], enemyHp: {}, currentKey: null, won: false, ended: false, earned: 0 });
state.run ||= freshRun();
state.run.earned ||= 0;
state.run.enemyHp ||= {};
const costs = () => ({ attack: 8 + state.attackUp * 5, hp: 8 + state.hpUp * 5, potion: 12 + state.potionUp * 8 });
function save() {
  try {
    const previous = localStorage.getItem(SAVE_KEY);
    if (previous) localStorage.setItem(`${SAVE_KEY}:backup`, previous);
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch { /* Storage can be disabled; the current run remains playable. */ }
}

let audioContext;
function sound(kind) {
  if (state.muted) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const palettes = {
      tap: [[420, 0, .05, .018]], hit: [[110, 0, .09, .05], [67, .02, .1, .035]],
      mine: [[890, 0, .07, .035], [1420, .015, .06, .018]],
      coin: [[740, 0, .13, .035], [1110, .065, .17, .027]],
      heal: [[440, 0, .22, .025], [554, .08, .23, .025], [659, .16, .3, .025]],
      skill: [[180, 0, .2, .04], [360, .045, .2, .03], [720, .09, .2, .02]],
      win: [[523, 0, .3, .03], [659, .13, .3, .03], [784, .26, .3, .03], [1047, .4, .6, .03]],
      defeat: [[220, 0, .3, .03], [165, .2, .45, .025]],
    };
    for (const [frequency, delay, duration, volume] of palettes[kind] || palettes.tap) {
      const osc = audioContext.createOscillator(), gain = audioContext.createGain();
      osc.type = kind === 'hit' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(frequency, audioContext.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(frequency * (kind === 'hit' ? .35 : .99), audioContext.currentTime + delay + duration);
      gain.gain.setValueAtTime(0, audioContext.currentTime + delay);
      gain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + delay + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + delay + duration);
      osc.connect(gain).connect(audioContext.destination);
      osc.start(audioContext.currentTime + delay); osc.stop(audioContext.currentTime + delay + duration + .02);
    }
  } catch { /* Audio is optional and starts with a player gesture. */ }
}

let world, hero;
let phase = 'loading', paused = false, simulationTime = 0;
let phaseTime = 0, targetKey = null, nextTargetKey = null, movement = null;
let route = [], currentEnemy = null, heroStrike = 0, enemyStrike = 0, hitQueued = [];
let actionProgress = 0, skillCooldown = 0, impact = 0, portalTime = 0;
let loadingGeneration = 0, uiClock = 0, lastUiCooldown = 0, firstTap = false;
const enemies = new Map(), pins = new Map();
const pinLayer = document.createElement('div'); pinLayer.id = 'world-pins'; document.body.append(pinLayer);
const ui = createUI({
  onHeal: heal, onSkill: useSkill,
  onMute: () => { state.muted = !state.muted; save(); refreshUI(); if (!state.muted) sound('coin'); },
  onPause: () => { if (phase === 'loading') return; paused = true; ui.showPause(); },
  onResume: () => { paused = false; ui.hidePause(); },
  onRestart: () => { paused = false; ui.hidePause(); state.run = freshRun(); save(); loadIsland(); },
  onNext: () => { if (phase !== 'result') return; if (state.run.won) state.level++; state.run = freshRun(); save(); loadIsland(); },
  onUpgrade: upgrade,
});

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.65 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.07;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b8d9d4'); scene.fog = new THREE.Fog('#b8d9d4', 38, 85);
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, .1, 100);
const cameraTarget = new THREE.Vector3(0, .25, -.2), baseCamera = new THREE.Vector3(0, 17, 12);
camera.position.copy(baseCamera); camera.lookAt(cameraTarget);
scene.add(new THREE.HemisphereLight('#e8f5ff', '#687f50', 1.4));
const sun = new THREE.DirectionalLight('#fff0d6', 2.5);
sun.position.set(-7, 13, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 35 });
sun.shadow.bias = -.0005; sun.shadow.normalBias = .035; sun.shadow.radius = 4; sun.shadow.blurSamples = 8; scene.add(sun);
const rim = new THREE.DirectionalLight('#c6e8ff', 1.1); rim.position.set(5, 8, -9); scene.add(rim);
const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
const environmentTarget = pmrem.fromScene(room, .05);
scene.environment = environmentTarget.texture; scene.environmentIntensity = .22;
room.dispose(); pmrem.dispose();
const actorRoot = new THREE.Group(), fxRoot = new THREE.Group(); scene.add(actorRoot, fxRoot);
const particles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.065, 0), new THREE.MeshBasicMaterial(), 180);
particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage); particles.frustumCulled = false; fxRoot.add(particles);
const particleData = [], dummy = new THREE.Object3D(), tempColor = new THREE.Color(), rings = [];
const ringGeometry = new THREE.RingGeometry(.42, .49, 48);
const selectedRing = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: '#fff3b8', transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false }));
selectedRing.rotation.x = -Math.PI / 2; selectedRing.visible = false; scene.add(selectedRing);
const heroRing = new THREE.Mesh(new THREE.RingGeometry(.26, .32, 36), new THREE.MeshBasicMaterial({ color: '#fff3c1', transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide }));
heroRing.rotation.x = -Math.PI / 2; heroRing.visible = false; scene.add(heroRing);
const routeRoot = new THREE.Group(); scene.add(routeRoot);
const dotGeometry = new THREE.SphereGeometry(.052, 5, 4), dotMaterial = new THREE.MeshBasicMaterial({ color: '#fff5ce', transparent: true, opacity: .8 });
const routeDots = Array.from({ length: 32 }, () => { const dot = new THREE.Mesh(dotGeometry, dotMaterial); dot.visible = false; routeRoot.add(dot); return dot; });

function burst(position, color = '#ffcf55', count = 16, size = 1) {
  for (let i = 0; i < count; i++) {
    if (particleData.length >= 180) particleData.shift();
    const angle = Math.random() * Math.PI * 2;
    particleData.push({ p: position.clone().add(new THREE.Vector3(0, .4, 0)), v: new THREE.Vector3(Math.cos(angle) * (1 + Math.random()), 1.5 + Math.random() * 2, Math.sin(angle) * (1 + Math.random())), life: .4 + Math.random() * .5, age: 0, color, size });
  }
}
function ripple(position, color = '#ffe9a1', scale = 1.5) {
  const mesh = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2; mesh.position.copy(position); mesh.position.y += .07;
  fxRoot.add(mesh); rings.push({ mesh, age: 0, duration: .5, scale });
}
function screenPoint(position, height = 0) {
  const p = position.clone(); p.y += height; p.project(camera);
  return { x: (p.x * .5 + .5) * innerWidth, y: (-p.y * .5 + .5) * innerHeight };
}
function floating(position, text, color) { ui.floatText({ ...screenPoint(position, 1.8), text: String(text), color }); }
function face(actor, position, dt = 1) {
  const d = position.clone().sub(actor.root.position); if (d.lengthSq() < .0001) return;
  const angle = Math.atan2(d.x, d.z), delta = Math.atan2(Math.sin(angle - actor.root.rotation.y), Math.cos(angle - actor.root.rotation.y));
  actor.root.rotation.y += delta * Math.min(1, dt * 14);
}
function ground(key) { return world.tiles.get(key).position.clone(); }
function kills() { return world ? world.enemyKeys.filter(k => state.run.cleared.includes(k)).length : 0; }
function refreshUI() {
  lastUiCooldown = skillCooldown;
  ui.update({ hp: Math.max(0, state.run.hp), maxHp: maxHp(), coins: state.coins, level: state.level,
    kills: kills(), totalKills: 3, potions: state.run.potions, attack: attack(), muted: state.muted,
    skillCooldown, skillMaxCooldown: 7, canSkill: phase === 'combat', busy: ['combat', 'gather', 'opening'].includes(phase),
    action: phase === 'combat' ? 'fight' : phase === 'gather' ? 'mine' : phase === 'opening' ? 'chest' : null, actionProgress });
}
function makePin(key, kind, label, height = .95) {
  const anchor = document.createElement('div'); anchor.style.position = 'absolute';
  const button = document.createElement('button'); button.type = 'button'; button.className = 'world-pin';
  button.style.transform = 'translate(-50%,-100%)';
  button.dataset.kind = kind; button.dataset.key = key; button.setAttribute('aria-label', label); button.innerHTML = icon(kind);
  button.addEventListener('pointerdown', e => e.stopPropagation());
  button.addEventListener('click', e => { e.stopPropagation(); chooseTarget(key); });
  anchor.append(button); pinLayer.append(anchor); pins.set(key, { button, anchor, height });
}
function updatePins() {
  if (!world) return;
  for (const [key, pin] of pins) {
    const cleared = state.run.cleared.includes(key), isPortal = key === world.portalKey;
    pin.button.hidden = (cleared && !isPortal) || ['loading', 'portal', 'result'].includes(phase);
    const prop = world.props.get(key);
    const pinPosition = prop && ['resource', 'chest'].includes(prop.type) ? prop.object.getWorldPosition(new THREE.Vector3()) : ground(key);
    const p = screenPoint(pinPosition, pin.height);
    pin.anchor.style.transform = `translate3d(${p.x}px,${p.y}px,0)`;
    pin.button.classList.toggle('is-target', targetKey === key);
    pin.button.classList.toggle('is-locked', isPortal && kills() < 3);
    pin.button.setAttribute('aria-disabled', String(isPortal && kills() < 3));
    if (isPortal) pin.button.setAttribute('aria-label', kills() < 3 ? `Портал: побеждено ${kills()} из 3 стражей` : 'Перейти на следующий остров');
  }
  const hint = document.querySelector('.tap-hint');
  if (hint && !hint.hidden) {
    const firstEnemy = [...enemies.values()].find(enemy => !enemy.dead);
    if (firstEnemy) { const p = screenPoint(firstEnemy.actor.root.position, 1.55); hint.style.left = `${p.x + 18}px`; hint.style.top = `${p.y}px`; hint.style.bottom = 'auto'; }
  }
}
function findPath(start, end) {
  const queue = [start], previous = new Map([[start, null]]);
  for (let index = 0; index < queue.length; index++) {
    const key = queue[index]; if (key === end) break;
    const [q, r] = key.split(',').map(Number);
    for (const [dq, dr] of NEIGHBOURS) {
      const next = `${q + dq},${r + dr}`;
      if (previous.has(next) || !world.tiles.get(next)?.walkable) continue;
      if (next !== end && enemies.has(next) && !enemies.get(next).dead) continue;
      previous.set(next, key); queue.push(next);
    }
  }
  if (!previous.has(end)) return [];
  const path = []; for (let key = end; key !== start; key = previous.get(key)) path.unshift(key); return path;
}
function chooseTarget(key) {
  if (!world || paused || ['loading', 'result', 'portal', 'defeat'].includes(phase) || !world.tiles.get(key)?.walkable) return;
  sound('tap'); firstTap = true; ui.hint(false);
  if (key === world.portalKey && kills() < 3) {
    ripple(ground(key), '#aecac5', 1.5);
    for (const [enemyKey, enemy] of enemies) if (!enemy.dead) pins.get(enemyKey)?.button.animate([{ scale: '1' }, { scale: '1.2' }, { scale: '1' }], { duration: 450 });
    return;
  }
  if (phase === 'combat' && key === currentEnemy?.key) return;
  if (phase === 'walking' && movement) { nextTargetKey = key; targetKey = key; updateSelection(); return; }
  startRoute(key);
}
function updateSelection() {
  if (!targetKey) { selectedRing.visible = false; return; }
  selectedRing.position.copy(ground(targetKey)); selectedRing.position.y += .04; selectedRing.visible = true;
}
function startRoute(key) {
  hitQueued = [];
  if (currentEnemy && !currentEnemy.dead) currentEnemy.actor.play('idle'); currentEnemy = null;
  const path = findPath(state.run.currentKey, key);
  if (!path.length && key !== state.run.currentKey) { ripple(ground(key), '#e39377'); return; }
  targetKey = key; route = path; nextTargetKey = null; phase = 'walking'; updateSelection();
  if (!route.length && hero.root.position.distanceTo(ground(key)) > .12 && !enemies.get(key)?.dead && !enemies.has(key)) {
    movement = { from: hero.root.position.clone(), end: ground(key), key, t: 0, contact: false, duration: .25 }; hero.play('walk', { loop: true });
  } else if (!route.length) arrive(); else nextStep();
}
function nextStep() {
  if (!route.length) { movement = null; arrive(); return; }
  const key = route.shift(), end = ground(key), from = hero.root.position.clone(), enemy = enemies.get(key);
  if (enemy && !enemy.dead) end.addScaledVector(from.clone().sub(end).setY(0).normalize(), .83);
  movement = { from, end, key, contact: enemy && !enemy.dead, t: 0, duration: Math.max(.22, from.distanceTo(end) / 3.1) };
  hero.play('walk', { speed: 1.25, loop: true }); drawRoute();
}
function drawRoute() {
  for (const dot of routeDots) dot.visible = false;
  const steps = [hero.root.position.clone(), ...(movement ? [movement.end] : []), ...route.map(ground)]; let index = 0;
  for (let i = 1; i < steps.length; i++) for (let j = 1; j <= 3 && index < routeDots.length; j++) {
    const dot = routeDots[index++]; dot.position.lerpVectors(steps[i - 1], steps[i], j / 4); dot.position.y = .52; dot.visible = true;
  }
}
function arrive() {
  routeDots.forEach(dot => dot.visible = false); phaseTime = 0; actionProgress = 0; hero.play('idle');
  const key = targetKey;
  if (enemies.has(key) && !enemies.get(key).dead) {
    currentEnemy = enemies.get(key); phase = 'combat'; heroStrike = .1; enemyStrike = 1.15;
    face(hero, currentEnemy.actor.root.position); face(currentEnemy.actor, hero.root.position);
  } else if (world.resourceKeys.includes(key) && !state.run.cleared.includes(key)) {
    phase = 'gather'; hero.play('mine', { loop: true, speed: 1.4 });
    const prop = world.props.get(key)?.object; if (prop) face(hero, prop.getWorldPosition(new THREE.Vector3()));
  } else if (world.chestKeys.includes(key) && !state.run.cleared.includes(key)) {
    phase = 'opening'; hero.play('interact', { speed: 1.3 });
    const prop = world.props.get(key)?.object; if (prop) face(hero, prop.getWorldPosition(new THREE.Vector3()));
  } else if (key === world.campKey && !state.run.cleared.includes(key)) {
    state.run.hp = maxHp(); state.run.potions = Math.min(2 + state.potionUp, state.run.potions + 1); state.run.cleared.push(key);
    world.useCamp?.(); sound('heal'); burst(hero.root.position, '#b9ffb2', 28); ripple(hero.root.position, '#a3e4a6', 2); floating(hero.root.position, '+', '#daffbd'); idle();
  } else if (key === world.portalKey && kills() === 3) {
    phase = 'portal'; portalTime = 0; hero.play('celebrate'); sound('win'); burst(hero.root.position, '#fff0a8', 60, 1.5);
  } else idle();
  save(); refreshUI();
}
function idle() {
  phase = 'idle'; targetKey = null; movement = null; selectedRing.visible = false; hero.play('idle'); actionProgress = 0; save(); refreshUI();
}
function damageEnemy(enemy, amount, special = false) {
  if (enemy.dead || phase === 'result') return;
  enemy.hp -= amount; state.run.enemyHp[enemy.key] = Math.max(0, enemy.hp); enemy.actor.flash?.('#ffffff');
  floating(enemy.actor.root.position, `−${amount}`, special ? '#fff1b4' : '#fffdf3');
  burst(enemy.actor.root.position, special ? '#ffcf5c' : '#ffecb9', special ? 24 : 9, special ? 1.3 : .7);
  sound('hit'); impact = reduced ? 0 : special ? .13 : .035;
  if (enemy.hp <= 0) {
    enemy.dead = true; enemy.deathTime = 0; enemy.actor.play('death');
    award(enemy.boss ? 7 : 3, enemy.actor.root.position); state.run.cleared.push(enemy.key);
    if (currentEnemy === enemy) { state.run.currentKey = enemy.key; currentEnemy = null; hitQueued = []; hero.play('celebrate'); phase = 'celebrating'; phaseTime = 0; }
    if (kills() === 3) { world.setPortal(true); sound('coin'); ripple(ground(world.portalKey), '#97ffe3', 2.8); burst(ground(world.portalKey), '#8fffe1', 35); }
    save();
  }
  refreshUI();
}
function damageHero(amount) {
  if (phase !== 'combat' || !currentEnemy || currentEnemy.dead) return;
  state.run.hp = Math.max(0, state.run.hp - amount); hero.flash?.('#ffc9bd'); burst(hero.root.position, '#fca781', 8, .7);
  floating(hero.root.position, `−${amount}`, '#ffbfae'); impact = reduced ? 0 : .06; sound('hit');
  if (state.run.hp === 0) { phase = 'defeat'; phaseTime = 0; hitQueued = []; hero.play('death'); currentEnemy.actor.play('idle'); sound('defeat'); save(); }
  refreshUI();
}
function award(amount, position) {
  state.coins += amount; state.run.earned += amount; floating(position, `+${amount}`, '#ffe19b'); burst(position, '#ffce62', 20); sound('coin'); refreshUI();
}
function heal() {
  if (!hero || paused || ['loading', 'result', 'portal', 'defeat'].includes(phase) || state.run.potions <= 0 || state.run.hp >= maxHp()) return;
  const amount = Math.min(maxHp() - state.run.hp, Math.ceil(maxHp() * .5)); state.run.hp += amount; state.run.potions--;
  sound('heal'); burst(hero.root.position, '#a8ffc8', 30); ripple(hero.root.position, '#a4f2c3', 2); floating(hero.root.position, `+${amount}`, '#b9ffcb'); save(); refreshUI();
}
function useSkill() {
  if (!hero || paused || skillCooldown > 0 || phase !== 'combat') return;
  const targets = [...enemies.values()].filter(e => !e.dead && e.actor.root.position.distanceTo(hero.root.position) < 2.9);
  if (!targets.length) { ripple(hero.root.position, '#d9f5dd', 2); return; }
  skillCooldown = 7; sound('skill'); hero.play('attack', { speed: 1.7, restart: true });
  ripple(hero.root.position, '#fff0b6', 5.5); burst(hero.root.position, '#ffe0a1', 32);
  targets.forEach(enemy => damageEnemy(enemy, attack() * 2, true)); refreshUI();
}
function result(won) { phase = 'result'; selectedRing.visible = false; state.run.won = won; state.run.ended = true; save(); ui.showResult(resultData(won)); refreshUI(); }
function resultData(won = state.run.won) {
  return { won, coinsEarned: state.run.earned, level: state.level, coins: state.coins, attack: attack(), maxHp: maxHp(), upgradeCosts: costs(), upgradeGains: { attack: 1, hp: 4, potion: 1 } };
}
function upgrade(kind) {
  if (phase !== 'result' || !['attack', 'hp', 'potion'].includes(kind)) return;
  const cost = costs()[kind]; if (state.coins < cost) return;
  state.coins -= cost; state[`${kind}Up`]++; hero.setTier?.(state.attackUp);
  sound('heal'); save(); refreshUI(); ui.updateResult(resultData());
}

async function loadIsland() {
  const generation = ++loadingGeneration;
  phase = 'loading'; paused = false; targetKey = null; nextTargetKey = null; route = []; movement = null;
  currentEnemy = null; hitQueued = []; skillCooldown = 0; actionProgress = 0;
  selectedRing.visible = false; routeDots.forEach(d => d.visible = false); ui.hideResult(); ui.hidePause(); ui.loading(.05);
  pins.clear(); pinLayer.replaceChildren();
  for (const enemy of enemies.values()) { actorRoot.remove(enemy.actor.root); enemy.actor.dispose(); }
  enemies.clear(); if (world) { scene.remove(world.root); world.dispose(); world = null; }
  particleData.length = 0; for (const ring of rings) { fxRoot.remove(ring.mesh); ring.mesh.material.dispose(); } rings.length = 0;
  try {
    const newWorld = await createWorld({ scene, level: state.level, seed: state.level * 891 + 37 });
    if (generation !== loadingGeneration) { newWorld.dispose(); return; }
    world = newWorld; if (!world.root.parent) scene.add(world.root); ui.loading(.5);
    if (!hero) { hero = await createActor('hero'); actorRoot.add(hero.root); }
    state.run.cleared = state.run.cleared.filter(key => world.tiles.has(key));
    state.run.currentKey = world.tiles.has(state.run.currentKey) ? state.run.currentKey : world.entranceKey;
    hero.root.scale.setScalar(1); hero.root.position.copy(ground(state.run.currentKey)); hero.root.rotation.y = Math.PI; hero.play('idle'); hero.setTier?.(state.attackUp);
    for (let index = 0; index < world.enemyKeys.length; index++) {
      const key = world.enemyKeys[index]; if (state.run.cleared.includes(key)) continue;
      const boss = index === 2, actor = await createActor('enemy', { variant: index + state.level, boss });
      actor.root.position.copy(ground(key)); actor.root.rotation.y = .25 + index * .8; actorRoot.add(actor.root);
      const hp = (boss ? 16 : 9) + Math.floor((state.level - 1) * (boss ? 2.1 : 1.4));
      const savedHp = state.run.enemyHp[key];
      enemies.set(key, { key, actor, hp: Number.isFinite(savedHp) && savedHp > 0 ? Math.min(hp, savedHp) : hp, maxHp: hp, damage: (boss ? 3 : 2) + Math.floor((state.level - 1) / 4), dead: false, boss });
      makePin(key, 'skull', boss ? 'Страж острова: сразиться' : 'Скелет: сразиться', boss ? 2.35 : 1.85); ui.loading(.65 + index * .1);
    }
    for (const key of world.resourceKeys) { makePin(key, 'pickaxe', 'Добыть кристаллы'); if (state.run.cleared.includes(key)) world.hitResource(key, 1); }
    for (const key of world.chestKeys) { makePin(key, 'chest', 'Открыть сундук'); if (state.run.cleared.includes(key)) world.openChest(key); }
    makePin(world.campKey, 'fire', 'Костёр: восстановить здоровье и одно зелье', 1.2);
    makePin(world.portalKey, 'portal', 'Портал на следующий остров', 2.5); world.setPortal(kills() === 3);
    phase = 'idle'; resize(); refreshUI(); ui.ready(); ui.hint(state.level === 1 && !state.run.cleared.length && !firstTap);
    if (state.run.won) result(true); else if (state.run.ended || state.run.hp <= 0) result(false); save();
    if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.ready.then(registration => {
      if (registration.scope === APP_BASE.href) cacheGameResources(registration.active);
    }).catch(() => {});
  } catch (error) {
    console.error('Island could not load:', error);
    const fallback = document.createElement('button'); fallback.className = 'load-retry'; fallback.innerHTML = `${icon('arrow')}<span>Повторить загрузку</span>`;
    fallback.addEventListener('click', () => { fallback.remove(); loadIsland(); }); document.body.append(fallback);
  }
}

const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(); let pointerStart = null;
canvas.addEventListener('pointerdown', event => { pointerStart = { x: event.clientX, y: event.clientY }; });
canvas.addEventListener('pointerup', event => {
  if (!world || !pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 12) return; pointerStart = null;
  pointer.set(event.clientX / innerWidth * 2 - 1, -(event.clientY / innerHeight) * 2 + 1); raycaster.setFromCamera(pointer, camera);
  const clickedEnemy = raycaster.intersectObjects([...enemies.values()].filter(e => !e.dead).map(e => e.actor.root), true)[0];
  if (clickedEnemy) {
    let ancestor = clickedEnemy.object;
    while (ancestor && !ancestor.userData.actorType) ancestor = ancestor.parent;
    const enemy = [...enemies.values()].find(e => e.actor.root === ancestor);
    if (enemy) { chooseTarget(enemy.key); return; }
  }
  const clickedProp = raycaster.intersectObjects([...world.props.values()].filter(p => p.object.visible).map(p => p.object), true)[0];
  if (clickedProp?.object.userData.tileKey) { chooseTarget(clickedProp.object.userData.tileKey); return; }
  const point = new THREE.Vector3(); if (!raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -.46), point)) return;
  let nearest = null, distance = Infinity;
  for (const [key, tile] of world.tiles) { if (!tile.walkable) continue; const d = tile.position.distanceToSquared(point); if (d < distance) { nearest = key; distance = d; } }
  if (distance < 1.15) chooseTarget(nearest);
});
canvas.addEventListener('pointercancel', () => { pointerStart = null; });
window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLButtonElement || event.repeat) return;
  if (event.code === 'Space') { event.preventDefault(); useSkill(); } if (event.code === 'KeyH') heal();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); if (audioContext?.state === 'running') audioContext.suspend(); } });
window.addEventListener('pagehide', save);
function resize() {
  const aspect = innerWidth / innerHeight, height = innerWidth < 700 ? Math.max(15.5, 12.6 / aspect) : Math.max(innerHeight < 800 ? 17 : 16, 15 / aspect);
  camera.left = -height * aspect / 2; camera.right = height * aspect / 2; camera.top = height / 2; camera.bottom = -height / 2;
  camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); updatePins();
}
window.addEventListener('resize', resize); resize();

function tickGameplay(dt) {
  phaseTime += dt; skillCooldown = Math.max(0, skillCooldown - dt);
  if (phase === 'walking' && movement) {
    movement.t += dt / movement.duration; const t = clamp(movement.t, 0, 1);
    hero.root.position.lerpVectors(movement.from, movement.end, ease(t)); face(hero, movement.end, dt);
    if (t >= 1) { if (!movement.contact) state.run.currentKey = movement.key; if (nextTargetKey) startRoute(nextTargetKey); else nextStep(); }
  }
  if (phase === 'combat' && currentEnemy && !currentEnemy.dead) {
    heroStrike -= dt; enemyStrike -= dt; face(hero, currentEnemy.actor.root.position, dt); face(currentEnemy.actor, hero.root.position, dt);
    actionProgress = 1 - currentEnemy.hp / currentEnemy.maxHp;
    if (heroStrike <= 0) { heroStrike = .9; hero.play('attack', { speed: 1.35, restart: true }); hitQueued.push({ wait: .24, type: 'enemy', enemy: currentEnemy, amount: attack() }); }
    if (enemyStrike <= 0) { enemyStrike = currentEnemy.boss ? 1.2 : 1.45; currentEnemy.actor.play('attack', { speed: 1.2, restart: true }); hitQueued.push({ wait: .32, type: 'hero', enemy: currentEnemy, amount: currentEnemy.damage }); }
  }
  // Shift a due batch before applying hits: death can safely clear the remaining queue.
  hitQueued.forEach(hit => { hit.wait -= dt; });
  const due = hitQueued.filter(hit => hit.wait <= 0); hitQueued = hitQueued.filter(hit => hit.wait > 0);
  for (const hit of due) { if (hit.enemy.dead || phase !== 'combat') continue; if (hit.type === 'enemy') damageEnemy(hit.enemy, hit.amount); else damageHero(hit.amount); }
  if (phase === 'gather') {
    const before = Math.floor((phaseTime - dt) / .55), after = Math.floor(phaseTime / .55); actionProgress = clamp(phaseTime / 1.75, 0, 1);
    if (after > before && after <= 3) { world.hitResource(targetKey, after / 3); burst(ground(targetKey), '#a8ead9', 12); sound('mine'); }
    if (phaseTime >= 1.65) { state.run.cleared.push(targetKey); award(4, hero.root.position); idle(); }
  }
  if (phase === 'opening') {
    actionProgress = clamp(phaseTime / 1.3, 0, 1);
    if (phaseTime >= .55) { world.openChest(targetKey); state.run.cleared.push(targetKey); award(5 + (state.level % 3), hero.root.position); idle(); }
  }
  if (phase === 'celebrating' && phaseTime > .6) idle();
  if (phase === 'defeat' && phaseTime > 1.4) result(false);
  if (phase === 'portal') { portalTime += dt; if (portalTime > .7) { hero.root.scale.setScalar(Math.max(.01, 1 - (portalTime - .7) * 1.4)); if (portalTime > 1.45) result(true); } }
  for (const enemy of enemies.values()) if (enemy.dead) { enemy.deathTime += dt; if (enemy.deathTime > 1) enemy.actor.root.scale.setScalar(Math.max(.001, 1 - (enemy.deathTime - 1) * 2)); if (enemy.deathTime > 1.5) enemy.actor.root.visible = false; }
}
let previousTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate); const dt = Math.min((now - previousTime) / 1000, .05); previousTime = now; if (document.hidden) return;
  const activeDt = paused ? 0 : dt; simulationTime += activeDt;
  if (world && hero && phase !== 'loading') {
    if (!paused && phase !== 'result') tickGameplay(activeDt);
    hero.update(activeDt, simulationTime); for (const enemy of enemies.values()) enemy.actor.update(activeDt, simulationTime);
    world.update(activeDt, simulationTime); updatePins();
    heroRing.visible = !['defeat', 'portal', 'result'].includes(phase); heroRing.position.copy(hero.root.position); heroRing.position.y += .025;
  }
  for (let i = particleData.length - 1; i >= 0; i--) { const p = particleData[i]; p.age += activeDt; if (p.age >= p.life) { particleData.splice(i, 1); continue; } p.v.y -= activeDt * 6; p.p.addScaledVector(p.v, activeDt); }
  particleData.forEach((p, i) => { dummy.position.copy(p.p); dummy.scale.setScalar(Math.max(.01, (1 - p.age / p.life) * p.size)); dummy.rotation.set(p.age * 5, p.age * 7, 0); dummy.updateMatrix(); particles.setMatrixAt(i, dummy.matrix); particles.setColorAt(i, tempColor.set(p.color)); });
  particles.count = particleData.length; particles.instanceMatrix.needsUpdate = true; if (particles.instanceColor) particles.instanceColor.needsUpdate = true;
  for (let i = rings.length - 1; i >= 0; i--) { const ring = rings[i]; ring.age += activeDt; const t = ring.age / ring.duration; ring.mesh.scale.setScalar(.4 + ease(clamp(t, 0, 1)) * ring.scale); ring.mesh.material.opacity = (1 - t) * .7; if (t >= 1) { fxRoot.remove(ring.mesh); ring.mesh.material.dispose(); rings.splice(i, 1); } }
  if (selectedRing.visible) selectedRing.scale.setScalar(reduced ? 1 : 1 + Math.sin(simulationTime * 5) * .07);
  impact *= Math.exp(-dt * 16); camera.position.copy(baseCamera);
  if (!reduced && impact > .001) { camera.position.x += Math.sin(now * .08) * impact; camera.position.y += Math.cos(now * .061) * impact; } camera.lookAt(cameraTarget);
  uiClock += dt; if (uiClock > .08 && (['combat', 'gather', 'opening'].includes(phase) || skillCooldown > 0 || lastUiCooldown > 0)) { refreshUI(); uiClock = 0; } renderer.render(scene, camera);
}
requestAnimationFrame(animate); loadIsland();
function cacheGameResources(worker) {
  const urls = performance.getEntriesByType('resource').map(entry => entry.name).filter(url => url.startsWith(APP_BASE.href));
  worker?.postMessage({ type: 'CACHE_GAME', urls });
}
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // A newly activated worker may replace an earlier root deployment. Warm the
  // new scope's cache again after it claims this page, including loaded models.
  navigator.serviceWorker.addEventListener('controllerchange', () => cacheGameResources(navigator.serviceWorker.controller));
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', APP_BASE), { scope: APP_BASE.href }).catch(() => {});
  });
}
if (import.meta.env.DEV) Object.defineProperty(window, '__islands', { get: () => ({ phase, paused, level: state.level, hp: state.run.hp, maxHp: maxHp(), coins: state.coins, attack: attack(), potions: state.run.potions, currentKey: state.run.currentKey, targetKey, kills: kills(), cleared: [...state.run.cleared], skillCooldown, enemies: [...enemies.values()].map(e => ({ key: e.key, hp: e.hp, dead: e.dead, boss: e.boss })), render: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures } }) });
