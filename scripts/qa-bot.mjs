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
 *   node scripts/qa-bot.mjs [--runs=3] [--speed=4] [--minutes=20] [--base=http://127.0.0.1:5173]
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
  const archetype = runIndex % 4;
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
  page.on('pageerror', (error) => log.errors.push({ at: Date.now(), message: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') log.errors.push({ at: Date.now(), message: message.text() });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) log.missing.push(`${response.status()} ${response.url()}`);
  });

  const url = `${BASE}/tools/dcss.html?qa=1&speed=${SPEED}&seed=${seed}`;
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
    log.depthReached = Math.max(log.depthReached, st.depth);
    log.level = st.hero.level;

    if (st.runStatus !== 'playing' || ['dead', 'victory', 'retired'].includes(st.screen)) {
      log.result = st.runStatus;
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
      const raise = await page.$$('.character-attribute-raise:not([disabled])');
      const skills = await page.$$('#character-skill-groups button:not([disabled])');
      let spent = false;
      for (const button of skills) {
        await button.click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(120);
        if (await click('#character-skill-learn')) { spent = true; break; }
        await click('#character-skill-cancel');
      }
      if (!spent && raise.length) {
        await raise[runIndex % raise.length].click({ timeout: 1500 }).catch(() => {});
      }
      await click('#close-character-sheet');
      continue;
    }

    // Лечение и еда из рюкзака, когда плохо.
    const hpShare = st.hero.hp / Math.max(1, st.hero.maxHp);
    if (hpShare < 0.4 || st.hero.hunger < 8 * 60) {
      await click('#bag');
      await page.waitForTimeout(250);
      const labels = await page.$$eval('#pack-grid button', (nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));
      const want = hpShare < 0.4 ? /Лечение/ : /Сытость/;
      const index = labels.findIndex((label) => want.test(label));
      if (index >= 0) {
        const buttons = await page.$$('#pack-grid button');
        await buttons[index].click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(150);
        await click('#item-detail-action');
      }
      await click('#close-item-detail');
      await click('#close-inventory');
      if (index < 0 && hpShare < 0.25) log.notes.push(`floor ${st.depth}: low health (${st.hero.hp}/${st.hero.maxHp}) and nothing to heal with`);
      continue;
    }

    // Куда идти: страж, враг рядом, вещь, сундук, край тумана, выход.
    const revealed = new Set(st.revealed);
    const grid = st.grid;
    const hero = { x: st.hero.x, y: st.hero.y };
    const passable = (x, y) => WALKABLE.has(grid[y]?.[x]) && revealed.has(key(x, y));
    const hostile = st.monsters.filter((monster) => !monster.neutral);
    const dist = (a) => Math.abs(a.x - hero.x) + Math.abs(a.y - hero.y);
    let goal = null;
    let reason = '';
    const near = hostile.filter((monster) => dist(monster) <= 6).sort((a, b) => dist(a) - dist(b))[0];
    if (near) { goal = near; reason = `fight ${near.id}`; }
    if (!goal) {
      const loot = st.loot.filter((item) => !badTargets.has(key(item.x, item.y))).sort((a, b) => dist(a) - dist(b))[0];
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
    const target = (cell) => cell.x === goal.x && cell.y === goal.y
      || (reason !== 'explore' && reason !== 'exit' && Math.abs(cell.x - goal.x) + Math.abs(cell.y - goal.y) <= 1);
    const path = bfs(grid, hero, target, { passable: (x, y) => WALKABLE.has(grid[y]?.[x]) && (revealed.has(key(x, y)) || (x === goal.x && y === goal.y)) });
    if (!path) {
      badTargets.add(key(goal.x, goal.y));
      if (reason === 'exit') {
        log.notes.push(`floor ${st.depth}: exit not reachable over explored floor`);
        await shot(`noexit-d${st.depth}`);
        floorStarted -= 60_000;
      }
      continue;
    }
    const steps = path.slice(1, 8);
    let clicked = false;
    for (let i = steps.length - 1; i >= 0; i -= 1) {
      const point = await page.evaluate(({ x, y }) => window.__dngQA.cellToScreen(x, y), steps[i]);
      if (!point.onScreen) continue;
      await page.mouse.click(point.x, point.y);
      clicked = true;
      break;
    }
    if (!clicked && path.length <= 1 && reason === 'exit') {
      // Стоит на выходе, а спуск не случился: развилка или запертая лестница.
      await page.keyboard.press('KeyE');
    }

    const cellKey = key(hero.x, hero.y);
    if (cellKey !== lastCell) {
      lastCell = cellKey;
      lastMoveAt = Date.now();
    } else if (Date.now() - lastMoveAt > 12_000 && !near) {
      const file = await shot(`stuck-d${st.depth}-${st.stuck?.length ?? log.stuck.length}`);
      log.stuck.push({ depth: st.depth, cell: hero, reason, goal, screen: st.screen, screenshot: file });
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
// программный рендер SwiftShader это обходит.
const browser = await chromium.launch({
  headless: !HEADED,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const runs = [];
for (let index = 0; index < RUNS; index += 1) {
  const log = await playRun(browser, index);
  runs.push(log);
  console.log(`run ${index}: seed ${log.seed} class ${log.archetype} → ${log.result} at floor ${log.depthReached}, level ${log.level}, ${log.minutes} min; errors ${log.errors.length}, 404 ${log.missing.length}, stalls ${log.stuck.length}`);
}
await browser.close();

writeFileSync(join(outDir, 'report.json'), JSON.stringify(runs, null, 2));
const lines = [`# QA bot — ${stamp}`, '', `speed ×${SPEED}, ${MINUTES} min cap per run`, ''];
for (const [index, log] of runs.entries()) {
  lines.push(`## Run ${index}: seed ${log.seed}, class #${log.archetype} → **${log.result}** at floor ${log.depthReached}, level ${log.level}, ${log.minutes} min`);
  if (log.floors.length) lines.push(`- seconds per floor: ${log.floors.map((floor) => `${floor.depth}:${floor.seconds}`).join(' ')}`);
  for (const death of log.deaths) lines.push(`- death on ${death.depth} at level ${death.level}: ${death.summary.replace(/\n/g, ' · ')} (${death.screenshot})`);
  for (const error of log.errors) lines.push(`- ERROR: ${error.message}`);
  for (const missing of [...new Set(log.missing)]) lines.push(`- MISSING: ${missing}`);
  for (const stall of log.stuck) lines.push(`- stall on ${stall.depth} at ${stall.cell.x},${stall.cell.y} going for ${stall.reason} (${stall.screenshot})`);
  for (const note of log.notes) lines.push(`- note: ${note}`);
  lines.push('');
}
writeFileSync(join(outDir, 'report.md'), lines.join('\n'));
console.log(`report → ${join(outDir, 'report.md')}`);
