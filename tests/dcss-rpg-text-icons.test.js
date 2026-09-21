import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

import { landmarkOutcomeSummary } from '../tools/dcss-rpg-finds.js';

const adapterUrl = new URL('../tools/dcss.js', import.meta.url);

/**
 * Золото и здоровье — рисунками, остальное словами.
 *
 * Карточка обещаний была набрана типографскими значками: «+26● · −10 ❤ · шум
 * на весь этаж». Иван: «тут максимально непонятно, что эти кнопки означают,
 * какая-то иконка… если даёт золото — нарисуем наше золото, если хилит —
 * сердечко наше, красное; „снимает эффекты“ можно оставить текстом».
 *
 * Правила остаются чистым текстом и ставят метки `{gold}` и `{heal}`; картинки
 * подставляет переходник — он один имеет право трогать DOM.
 */
test('правила ставят метки, а не типографские значки', () => {
  const итог = landmarkOutcomeSummary(
    { costGold: 15, rewardGold: 26, heal: 7, damage: 10, cleanse: true },
    'ru',
  );
  assert.match(итог, /\{gold\}/, 'золото перестало быть меткой');
  assert.match(итог, /\{heal\}/, 'здоровье перестало быть меткой');
  assert.ok(!/[●❤]/.test(итог), `в строке остались шрифтовые значки: «${итог}»`);
  // Словесная часть остаётся словами: её рисовать нечем и незачем.
  assert.match(итог, /снимает эффекты/);
});

test('переходник знает обе картинки, и обе лежат на диске', async () => {
  const runtime = await readFile(adapterUrl, 'utf8');
  const блок = runtime.slice(runtime.indexOf('const TEXT_ICONS = Object.freeze({'));
  assert.match(блок.slice(0, 400), /gold: Object\.freeze\(\{ path: GOLD_ICON_PATH/);
  const пути = ['licensed/7soul-icons/coin-gold.png', 'derived/hud/heart.png'];
  assert.match(runtime, /const GOLD_ICON_PATH = 'licensed\/7soul-icons\/coin-gold\.png';/);
  assert.match(блок.slice(0, 400), /heal: Object\.freeze\(\{ path: 'derived\/hud\/heart\.png'/);
  for (const путь of пути) {
    await access(new URL(`../public/assets/dcss-preview/${путь}`, import.meta.url));
  }
  // Монета — та же, что в кошельке наверху: два разных золота сбивают сильнее,
  // чем одно непонятное.
  const html = await readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8');
  assert.match(html, /purse-coin" src="[^"]*licensed\/7soul-icons\/coin-gold\.png"/);

  /*
   * Кучки золота из `item/gold/` рисуют добычу на полу — под углом, крупинками.
   * В строке ростом в восемнадцать точек такая кучка расплывается в пятно.
   * Иван: «что у нас за какая-то некрасивая иконка золота». Монета анфас из
   * CC0-набора 7Soul1 читается в любом размере, и теперь она одна на всём
   * интерфейсе: строка обещаний, кошелёк, сундук, всплывающие подписи.
   */
  assert.ok(!runtime.includes('item/gold/16.png'), 'в интерфейсе осталась кучка золота с пола');
});

test('подписи кнопок проходят через подстановку, а не через голый текст', async () => {
  const runtime = await readFile(adapterUrl, 'utf8');
  for (const место of [
    'fillTextWithIcons(contextActionDescription, model.description)',
    'fillTextWithIcons(label, action.label)',
    'fillTextWithIcons(hint, action.hint)',
    'fillTextWithIcons(itemDetailAction,',
  ]) {
    assert.ok(runtime.includes(место), `не подставляется: ${место}`);
  }
  // Читалке экрана метка не нужна — ей нужны слова.
  assert.match(runtime, /function textIconsToWords/);
  assert.match(runtime, /aria-label', textIconsToWords\(/);
});
