/**
 * Бот, который играет в DNG Codex целиком — в настоящем браузере.
 *
 * Аудит забега (`run-audit.mjs`) проверяет генератор; этот скрипт проверяет
 * игру: интерфейс, бой, сундуки, переходы, смерть и победу. Бот видит
 * состояние через служебный режим `?qa=1`, ходит кликами мыши по клеткам — тем
 * же путём, что касание игрока, — а всё остальное делает кнопками интерфейса.
 * Каждая ошибка страницы, пропавший файл, застревание и смерть записываются
 * со снимком экрана и состоянием героя.
 *
 * Usage:
 *   node scripts/qa-bot.mjs [--runs=3] [--speed=4] [--minutes=20] [--base=http://127.0.0.1:5173] [--god]
 *                           [--seed=N] [--headed]
 *
 * Нужен глобальный Playwright (`npm i -g playwright`) и запущенный dev-сервер.
 * Отчёт: output/qa/<время>/report.md, report.json и снимки.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'));

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  return [key, value ?? true];
}));
const RUNS = Number(args.runs ?? 3);
const SPEED = Number(args.speed ?? 4);
const MINUTES = Number(args.minutes ?? 20);
const BASE = String(args.base ?? 'http://127.0.0.1:5173');
const FIRST_SEED = args.seed ? Number(args.seed) : 1000 + Math.floor(Math.random() * 1e6);
const HEADED = Boolean(args.headed);
const GOD = Boolean(args.god);
const CLASS = args.class === undefined ? null : Number(args.class);

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = resolve('output/qa', stamp);
mkdirSync(outDir, { recursive: true });

const WALKABLE = new Set(['.', '~', 'D']);
const key = (x, y) => `${x},${y}`;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** Кратчайший пеший путь по сетке (4 стороны), как ходит герой. */
function bfs(grid, from, goal, { passable = (x, y) => WALKABLE.has(grid[y]?.[x]) } = {}) {
  const start = key(from.x, from.y);
  const prev = new Map([[start, null]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i += 1) {
    const cell = queue[i];
    if (goal(cell)) {
      const path = [];
      let at = key(cell.x, cell.y);
      while (at) {
        const [x, y] = at.split(',').map(Number);
        path.unshift({ x, y });
        at = prev.get(at);
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cell.x + dx;
      const ny = cell.y + dy;
      const k = key(nx, ny);
      if (prev.has(k) || !passable(nx, ny)) continue;
      prev.set(k, key(cell.x, cell.y));
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

async function playRun(browser, runIndex) {
  const seed = FIRST_SEED + runIndex * 7919;
  const archetype = CLASS ?? runIndex % 4;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const log = {
    seed, archetype, result: null, depthReached: 0, level: 1, minutes: 0,
    errors: [], missing: [], stuck: [], floors: [], deaths: [], notes: [],
  };
  const shot = async (name) => {
    const file = `run${runIndex}-${name}.png`;
    await page.screenshot({ path: join(outDir, file) }).catch(() => {});
    return file;
  };
  let currentDepth = 0;
  const firstSeen = new Set();
  page.on('pageerror', (error) => {
    const entry = { at: Date.now(), message: error.message, depth: currentDepth };
    // Стек и снимок — только у первой такой ошибки: остальные — её эхо.
    if (!firstSeen.has(error.message)) {
      firstSeen.add(error.message);
      entry.stack = String(error.stack ?? '').split('\n').slice(0, 6).join(' | ');
      shot(`error-${firstSeen.size}`).then((file) => { entry.screenshot = file; });
    }
    log.errors.push(entry);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') log.errors.push({ at: Date.now(), message: message.text() });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) log.missing.push(`${response.status()} ${response.url()}`);
  });

  const url = `${BASE}/tools/dcss.html?qa=1&speed=${SPEED}&seed=${seed}${GOD ? '&god=1' : ''}`;
  await page.goto(url);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('little-islands:2d:item-language:v1', 'ru'); });
  await page.goto(url);
  await page.waitForFunction(() => window.__dngQA?.state().ready, null, { timeout: 30000 });
  await page.click('#start-game');
  await page.waitForTimeout(500);
  const cards = await page.$$('#character-creation button');
  await cards[archetype].click();
  await page.click('#confirm-creation');
  await page.waitForTimeout(1500);

  const started = Date.now();
  let floorStarted = Date.now();
  let lastDepth = null;
  let lastCell = null;
  let lastMoveAt = Date.now();
  const badTargets = new Set();
  let wanderNoise = 0;
  let lastCareAt = 0;
  let lastCastAt = 0;
  let lastClick = null;
  const pickupTries = new Map();
  let lastBagUsed = -1;
  const triedGear = new Set();

  const state = () => page.evaluate(() => window.__dngQA.state());
  const click = async (selector) => {
    const handle = await page.$(selector);
    if (!handle || !(await handle.isVisible()) || !(await handle.isEnabled())) return false;
    await handle.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(120);
    return true;
  };

  while (Date.now() - started < MINUTES * 60_000) {
    let st;
    try {
      st = await state();
    } catch (error) {
      log.errors.push({ at: Date.now(), message: `state() failed: ${error.message}` });
      await sleep(500);
      continue;
    }
    currentDepth = st.depth;
    log.depthReached = Math.max(log.depthReached, st.depth);
    log.level = st.hero.level;

    if (st.runStatus !== 'playing' || ['dead', 'victory', 'retired'].includes(st.screen)) {
      log.result = st.runStatus;
      await page.waitForTimeout(2500);
      const file = await shot(`end-${st.runStatus}`);
      if (st.runStatus === 'dead') {
        const cause = await page.$eval('#run-summary', (node) => node.innerText).catch(() => '');
        log.deaths.push({ depth: st.depth, level: st.hero.level, summary: cause, screenshot: file });
      }
      break;
    }

    if (st.depth !== lastDepth) {
      if (lastDepth !== null) log.floors.push({ depth: lastDepth, seconds: Math.round((Date.now() - floorStarted) / 1000) });
      lastDepth = st.depth;
      floorStarted = Date.now();
      badTargets.clear();
    }

    // Окна поверх игры: с каждым бот поступает как игрок, которому оно не нужно.
    if (st.screen === 'context') {
      const buttons = await page.$$('#context-action-list button:not([disabled])');
      let pressed = false;
      for (const button of buttons) {
        const text = (await button.innerText()).toLowerCase();
        if (/напасть|душ|украсть|сдаться|оскорб|продать/.test(text)) continue;
        await button.click({ timeout: 2000 }).catch(() => {});
        pressed = true;
        break;
      }
      if (!pressed) await click('#close-context-actions');
      await page.waitForTimeout(200);
      continue;
    }
    if (st.screen === 'chest') {
      const items = await page.$$('#chest-storage-list button:not([disabled])');
      if (items[0]) await items[0].click({ timeout: 2000 }).catch(() => {});
      else await click('#close-chest-container');
      await page.waitForTimeout(150);
      continue;
    }
    // Меню и выбор героя: бот начинает или продолжает забег, как игрок.
    if (st.screen === 'menu') {
      log.notes.push(`floor ${st.depth}: found the main menu while playing`);
      if (!(await click('#start-game'))) await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      continue;
    }
    if (st.screen === 'creation') {
      const heroes = await page.$$('#character-creation button');
      if (heroes[archetype]) await heroes[archetype].click({ timeout: 1500 }).catch(() => {});
      await click('#confirm-creation');
      await page.waitForTimeout(800);
      continue;
    }
    if (!['game'].includes(st.screen)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      const after = await state();
      if (after.screen === st.screen && st.screen !== 'game') {
        for (const selector of ['#close-merchant-shop', '#close-floor-map', '#close-lore', '#close-item-detail', '#close-inventory', '#close-character-sheet']) {
          if (await click(selector)) break;
        }
      }
      continue;
    }

    // Очки уровня: вкладываются сразу, пока герой бодр.
    if (st.hero.skillPoints > 0 && Math.random() < 0.3) {
      await click('#character-sheet-button');
      await page.waitForTimeout(250);
      /*
       * Урон растёт только от характеристики оружия (26.09.2026), поэтому
       * бот, как живой игрок, через очко кладёт её: воин — сила, маг —
       * интеллект, лучник и разведчик — ловкость. Остальное — в навыки.
       */
      const weaponAttribute = ['strength', 'intelligence', 'agility', 'agility'][archetype] ?? 'strength';
      const raise = await page.$$(`.character-attribute-raise[data-attribute="${weaponAttribute}"]:not([disabled])`);
      const skills = st.hero.level % 2 === 0 && raise.length
        ? []
        : await page.$$('#character-skill-groups button:not([disabled])');
      let spent = false;
      for (const button of skills) {
        await button.click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(120);
        if (await click('#character-skill-learn')) { spent = true; break; }
        await click('#character-skill-cancel');
      }
      if (!spent && raise.length) {
        await raise[0].click({ timeout: 1500 }).catch(() => {});
      }
      await click('#close-character-sheet');
      continue;
    }

    // Найденное снаряжение надевают, как сделал бы любой игрок: ржавый меч до
    // конца забега — это не стиль игры, а ошибка бота.
    if (st.bag.used !== lastBagUsed) {
      lastBagUsed = st.bag.used;
      await click('#bag');
      await page.waitForTimeout(250);
      const labels = await page.$$eval('#pack-grid button', (nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));
      for (const [index, label] of labels.entries()) {
        if (!/Оружие|Доспех|Щит|Шлем|Сапоги|Обувь|Перчатки|Плащ|Кольцо|Амулет|Пояс/.test(label)) continue;
        if (triedGear.has(label)) continue;
        triedGear.add(label);
        const buttons = await page.$$('#pack-grid button');
        await buttons[index]?.click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(150);
        const action = await page.$eval('#item-detail-action', (node) => node.innerText).catch(() => '');
        if (/Надеть/i.test(action)) await click('#item-detail-action');
        await click('#close-item-detail');
        break;
      }
      await click('#close-inventory');
      continue;
    }

    // Лечение и еда из рюкзака, когда плохо.
    const hpShare = st.hero.hp / Math.max(1, st.hero.maxHp);
    // Нечем лечиться — идём дальше раненым, а не открываем рюкзак каждый шаг.
    if ((hpShare < 0.5 || st.hero.hunger < 8 * 60) && Date.now() - lastCareAt > 20_000) {
      lastCareAt = Date.now();
      await click('#bag');
      await page.waitForTimeout(250);
      const labels = await page.$$eval('#pack-grid button', (nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));
      const want = hpShare < 0.5 ? /Лечение/ : /Сытость/;
      const index = labels.findIndex((label) => want.test(label));
      if (index >= 0) {
        const buttons = await page.$$('#pack-grid button');
        await buttons[index].click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(150);
        await click('#item-detail-action');
      }
      await click('#close-item-detail');
      await click('#close-inventory');
      if (index < 0 && hpShare < 0.25 && !log.notes.some((note) => note.startsWith(`floor ${st.depth}: low health`))) {
        log.notes.push(`floor ${st.depth}: low health (${st.hero.hp}/${st.hero.maxHp}) and nothing to heal with`);
      }
      continue;
    }

    // Вещь под ногами берут кнопкой «что рядом», как игрок. С полным рюкзаком
    // и после двух неудач подряд её оставляют лежать.
    const bagFull = st.bag.used >= st.bag.capacity;
    if (st.nearby === 'loot' && !bagFull) {
      const here = key(st.hero.x, st.hero.y);
      pickupTries.set(here, (pickupTries.get(here) ?? 0) + 1);
      if (pickupTries.get(here) <= 2) {
        await page.keyboard.press('KeyE');
        await page.waitForTimeout(200);
        continue;
      }
      for (const item of st.loot) if (Math.abs(item.x - st.hero.x) + Math.abs(item.y - st.hero.y) <= 1) badTargets.add(key(item.x, item.y));
    }
    if (bagFull && !log.notes.some((note) => note.startsWith('backpack full'))) log.notes.push(`backpack full on floor ${st.depth}`);

    // Куда идти: страж, враг рядом, вещь, сундук, край тумана, выход.
    const revealed = new Set(st.revealed);
    const grid = st.grid;
    const hero = { x: st.hero.x, y: st.hero.y };
    const passable = (x, y) => WALKABLE.has(grid[y]?.[x]) && revealed.has(key(x, y));
    const hostile = st.monsters.filter((monster) => !monster.neutral);
    const dist = (a) => Math.abs(a.x - hero.x) + Math.abs(a.y - hero.y);
    let goal = null;
    let reason = '';
    // Осторожный игрок не бежит на каждого, кого видит: он дерётся с тем, кто
    // уже рядом, и колдует, пока враг подходит.
    const near = hostile.filter((monster) => dist(monster) <= 2).sort((a, b) => dist(a) - dist(b))[0];
    const approaching = hostile.some((monster) => dist(monster) <= 5);
    if (approaching && Date.now() - lastCastAt > 1500) {
      lastCastAt = Date.now();
      for (const keyName of ['Digit1', 'Digit2', 'Digit3']) await page.keyboard.press(keyName);
      await page.waitForTimeout(80);
      const aiming = await state();
      if (aiming.screen === 'ability-targeting') {
        const foe = hostile.sort((a, b) => dist(a) - dist(b))[0];
        const point = await page.evaluate(({ x, y }) => window.__dngQA.cellToScreen(x, y), foe);
        await page.mouse.click(point.x, point.y);
      }
    }
    if (near) { goal = near; reason = `fight ${near.id}`; }
    if (!goal) {
      const loot = bagFull ? null : st.loot.filter((item) => !badTargets.has(key(item.x, item.y))).sort((a, b) => dist(a) - dist(b))[0];
      if (loot) { goal = loot; reason = `loot ${loot.id}`; }
    }
    if (!goal) {
      const find = st.finds.filter((item) => !badTargets.has(key(item.x, item.y))).sort((a, b) => dist(a) - dist(b))[0];
      if (find) {
        if (dist(find) <= 1) {
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(200);
          badTargets.add(key(find.x, find.y));
          continue;
        }
        goal = find; reason = `find ${find.id}`;
      }
    }
    const onFloorFor = (Date.now() - floorStarted) / 1000;
    if (!goal && onFloorFor < 150) {
      const frontier = bfs(grid, hero, (cell) => !badTargets.has(key(cell.x, cell.y))
        && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !revealed.has(key(cell.x + dx, cell.y + dy))
          && grid[cell.y + dy]?.[cell.x + dx] !== undefined && grid[cell.y + dy][cell.x + dx] !== '#'), { passable });
      if (frontier && frontier.length > 1) { goal = frontier.at(-1); reason = 'explore'; }
    }
    if (!goal && st.guardianAlive) {
      const boss = st.monsters.find((monster) => monster.boss);
      if (boss) { goal = boss; reason = 'guardian'; }
    }
    if (!goal) { goal = st.exit; reason = 'exit'; }

    // Путь и клик по дальней видимой клетке пути.
    // На вещь наступают — подбор срабатывает только так; к врагу и сундуку
    // достаточно подойти вплотную.
    const exact = reason === 'explore' || reason === 'exit' || reason.startsWith('loot');
    const target = (cell) => cell.x === goal.x && cell.y === goal.y
      || (!exact && Math.abs(cell.x - goal.x) + Math.abs(cell.y - goal.y) <= 1);
    // Касание игрока обходит сундуки и прочие находки — путь бота тоже.
    const findCells = new Set(st.finds.map((find) => key(find.x, find.y)));
    const throughDark = reason === 'exit' || reason === 'guardian';
    const path = bfs(grid, hero, target, {
      passable: (x, y) => WALKABLE.has(grid[y]?.[x])
        && !findCells.has(key(x, y))
        && (throughDark || revealed.has(key(x, y)) || (x === goal.x && y === goal.y)),
    });
    if (!path) {
      badTargets.add(key(goal.x, goal.y));
      if (reason === 'exit') {
        log.notes.push(`floor ${st.depth}: exit not reachable over explored floor`);
        await shot(`noexit-d${st.depth}`);
        floorStarted -= 60_000;
      }
      continue;
    }
    const steps = path.slice(1, 8).filter((cell) => revealed.has(key(cell.x, cell.y)));
    let clicked = false;
    for (let i = steps.length - 1; i >= 0; i -= 1) {
      const point = await page.evaluate(({ x, y }) => window.__dngQA.cellToScreen(x, y), steps[i]);
      if (!point.onScreen) continue;
      await page.mouse.click(point.x, point.y);
      clicked = true;
      lastClick = { cell: steps[i], point };
      break;
    }
    if (!clicked && path.length <= 1 && reason === 'exit') {
      // Стоит на выходе. Шаг этаж больше не меняет: спуск — кнопка «что
      // рядом» и кнопка в карточке. Вглубь, если выбор есть; иначе первая
      // доступная (в городе — пещеры).
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(150);
      const pressed = await page.evaluate(() => {
        const list = [...document.querySelectorAll('.context-action-button:not(:disabled)')];
        const pick = list.find((button) => ['go-down', 'descend', 'goDeep'].includes(button.dataset.action)) ?? list[0];
        pick?.click();
        return pick?.dataset.action ?? null;
      });
      if (!pressed) await page.keyboard.press('Escape');
    }

    const cellKey = key(hero.x, hero.y);
    if (cellKey !== lastCell) {
      lastCell = cellKey;
      lastMoveAt = Date.now();
    } else if (Date.now() - lastMoveAt > 12_000 && !near) {
      const file = await shot(`stuck-d${st.depth}-${st.stuck?.length ?? log.stuck.length}`);
      // Что видит игра: есть ли у неё путь к кликнутой клетке и идёт ли герой.
      const diag = lastClick
        ? await page.evaluate(({ x, y }) => ({
          gamePath: window.__dngQA.pathLength(x, y),
          heroPath: window.__dngQA.state().hero.pathLength,
          nearby: window.__dngQA.state().nearby,
          under: document.elementFromPoint(window.__dngQA.cellToScreen(x, y).x, window.__dngQA.cellToScreen(x, y).y)?.id
            || document.elementFromPoint(window.__dngQA.cellToScreen(x, y).x, window.__dngQA.cellToScreen(x, y).y)?.className,
        }), lastClick.cell)
        : null;
      log.stuck.push({ depth: st.depth, cell: hero, reason, goal, clicked: lastClick, diag, screen: st.screen, screenshot: file });
      badTargets.add(key(goal.x, goal.y));
      lastMoveAt = Date.now();
      wanderNoise += 1;
      if (wanderNoise > 6) {
        log.notes.push(`floor ${st.depth}: gave up after repeated stalls`);
        break;
      }
    }
    await sleep(160);
  }
  if (!log.result) log.result = 'timeout';
  log.minutes = Math.round((Date.now() - started) / 600) / 100;
  await shot('last');
  await context.close();
  return log;
}

// Без GPU безголовый браузер не создаёт WebGL, и игра стоит на загрузке —
// программный рендер SwiftShader это обходит. Браузер свой на каждый забег:
// упавший забег не должен унести с собой остальные.
const launch = () => chromium.launch({
  headless: !HEADED,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const runs = [];
for (let index = 0; index < RUNS; index += 1) {
  const browser = await launch();
  let log;
  try {
    log = await playRun(browser, index);
  } catch (error) {
    log = { seed: FIRST_SEED + index * 7919, archetype: CLASS ?? index % 4, result: 'crashed', depthReached: 0, level: 0, minutes: 0,
      errors: [{ at: Date.now(), message: `bot crashed: ${error.message}` }], missing: [], stuck: [], floors: [], deaths: [], notes: [] };
  }
  await browser.close().catch(() => {});
  runs.push(log);
  console.log(`run ${index}: seed ${log.seed} class ${log.archetype} → ${log.result} at floor ${log.depthReached}, level ${log.level}, ${log.minutes} min; errors ${log.errors.length}, 404 ${log.missing.length}, stalls ${log.stuck.length}`);
  writeReport();
}

function writeReport() {
writeFileSync(join(outDir, 'report.json'), JSON.stringify(runs, null, 2));
const lines = [`# QA bot — ${stamp}`, '', `speed ×${SPEED}, ${MINUTES} min cap per run`, ''];
for (const [index, log] of runs.entries()) {
  lines.push(`## Run ${index}: seed ${log.seed}, class #${log.archetype} → **${log.result}** at floor ${log.depthReached}, level ${log.level}, ${log.minutes} min`);
  if (log.floors.length) lines.push(`- seconds per floor: ${log.floors.map((floor) => `${floor.depth}:${floor.seconds}`).join(' ')}`);
  for (const death of log.deaths) lines.push(`- death on ${death.depth} at level ${death.level}: ${death.summary.replace(/\n/g, ' · ')} (${death.screenshot})`);
  const counted = new Map();
  for (const error of log.errors) counted.set(error.message, (counted.get(error.message) ?? 0) + 1);
  for (const [message, count] of counted) {
    const first = log.errors.find((error) => error.message === message);
    lines.push(`- ERROR ×${count} (first on floor ${first.depth ?? '?'}${first.screenshot ? `, ${first.screenshot}` : ''}): ${message.slice(0, 300)}`);
    if (first.stack) lines.push(`  - stack: ${first.stack.slice(0, 600)}`);
  }
  for (const missing of [...new Set(log.missing)]) lines.push(`- MISSING: ${missing}`);
  for (const stall of log.stuck) lines.push(`- stall on ${stall.depth} at ${stall.cell.x},${stall.cell.y} going for ${stall.reason}; clicked ${stall.clicked ? `${stall.clicked.cell.x},${stall.clicked.cell.y}` : 'nothing'}; game path ${stall.diag?.gamePath ?? '-'}, hero path ${stall.diag?.heroPath ?? '-'}, under the pointer ${stall.diag?.under ?? '-'}, nearby ${stall.diag?.nearby ?? '-'} (${stall.screenshot})`);
  for (const note of log.notes) lines.push(`- note: ${note}`);
  lines.push('');
}
writeFileSync(join(outDir, 'report.md'), lines.join('\n'));
}
console.log(`report → ${join(outDir, 'report.md')}`);
