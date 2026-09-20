/**
 * Геймпад достаёт до всего, до чего достаёт палец.
 *
 * Иван: «мы можем дальше делать фичи для основной игры, и всё это будет
 * нормально работать?» Будет — но ровно до тех пор, пока список кнопок, по
 * которым ходит выбор стика, не начнёт отставать от разметки. Отстанет он
 * молча: новая кнопка появится, пальцем нажмётся, а стиком до неё будет не
 * добраться, и никакой тест этого не заметит.
 *
 * Поэтому списка нет вовсе: выбор берёт все видимые кнопки экрана игры. Класс
 * тоже не годится в опору — у подсказки новичку своё оформление, и вешать на
 * неё чужой класс ради доступности значит платить видом за ввод. Эти тесты
 * сторожат сам приём, чтобы он не выродился обратно в перечисление.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const runtimeUrl = new URL('../tools/dcss.js', import.meta.url);
const markupUrl = new URL('../tools/dcss.html', import.meta.url);

test('выбор стика ищет кнопки по разметке, а не по списку имён', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');
  const body = runtime.match(/function padTargets\(\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(body, 'не нашлась функция выбора целей для геймпада');
  assert.match(body, /querySelectorAll\('button'\)/);
  // Перечисление имён кнопок вернуло бы ту самую мину, ради которой всё это.
  for (const name of ['bagButton', 'characterSheetButton', 'depthBadge', 'openPortalButton']) {
    assert.doesNotMatch(body, new RegExp(name), `${name} снова вписан руками`);
  }
  // Стрелки ходьбы в выбор не попадают: ходьба на крестовине, и выбирать
  // стиком кнопку «влево», чтобы нажать её крестиком, — две кнопки вместо одной.
  assert.match(body, /data-move/);
});

test('кнопки игрового экрана отсеиваются по видимости, а не по классу', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');
  const body = runtime.match(/function padTargets\(\) \{([\s\S]*?)\n\}/)?.[1];
  // Невидимое, выключенное и схлопнутое в точку выбирать нельзя: иначе стик
  // уводит золотую рамку в пустоту, и игрок жмёт крестик в никуда.
  for (const guard of ['hidden', 'disabled', 'inert', 'checkVisibility', 'opacityProperty']) {
    assert.match(body, new RegExp(guard), `выбор не проверяет ${guard}`);
  }
  assert.match(body, /width < 4 \|\| box\.height < 4/, 'схлопнутая кнопка остаётся целью');
});
