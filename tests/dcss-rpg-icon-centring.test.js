/**
 * Значок в кнопке стоит по центру.
 *
 * Иван: «почему то многие иконки не по центру в кнопках как эта например».
 * Замер показал две разные причины, и ни одна не видна при чтении правила.
 *
 * 1. Картинка шире своей клетки. Grid перестаёт центрировать элемент, который
 *    не помещается в свою область, и прижимает его к началу — иначе срезало бы
 *    верх и лево. `place-items: center` при этом честно стоит в правиле и
 *    ничего не делает, поэтому глазами причина не находится: смещение ровно
 *    половина того, на сколько картинка вылезла.
 * 2. Файл — не иконка, а угловая накладка. В библиотеке DCSS `i-*.png` кладут
 *    на угол картинки предмета, поэтому содержимое 9–15 пикселей лежит в углу
 *    прозрачного холста 32×32. Как самостоятельный значок такой файл рисуется
 *    в углу кнопки, и никакая вёрстка это не исправит.
 */

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import test from 'node:test';
import { opaquePixelBounds } from '../tools/dcss-rpg-item-sprites.js';

const ASSETS = new URL('../public/assets/dcss-preview/', import.meta.url);
const CSS = new URL('../tools/dcss.css', import.meta.url);

/** Размер холста из IHDR — читается у любого PNG, хоть палитрового. */
function pngSize(bytes) {
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'не PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** Ровно столько, сколько нужно тесту: 8-битный RGBA без чересстрочности. */
function decodePng(bytes) {
  const { width, height } = pngSize(bytes);
  const [depth, colour, , , interlace] = bytes.subarray(24, 29);
  assert.equal(depth, 8, 'ожидались восемь бит на канал');
  assert.equal(colour, 6, 'ожидался RGBA');
  assert.equal(interlace, 0, 'чересстрочный PNG тест не читает');

  const parts = [];
  for (let at = 8; at + 8 <= bytes.length;) {
    const length = bytes.readUInt32BE(at);
    const type = bytes.toString('ascii', at + 4, at + 8);
    if (type === 'IDAT') parts.push(bytes.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  const raw = inflateSync(Buffer.concat(parts));

  const bpp = 4;
  const stride = width * bpp;
  const data = new Uint8ClampedArray(width * height * bpp);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let x = 0; x < stride; x += 1) {
      const a = x >= bpp ? data[y * stride + x - bpp] : 0;
      const b = y > 0 ? data[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? data[(y - 1) * stride + x - bpp] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      data[y * stride + x] = value & 0xff;
    }
  }
  return { width, height, data };
}

/** Насколько непрозрачная часть картинки уехала от центра холста, в пикселях. */
function inkOffset(image) {
  const bounds = opaquePixelBounds(image);
  return {
    dx: bounds.x + bounds.width / 2 - image.width / 2,
    dy: bounds.y + bounds.height / 2 - image.height / 2,
  };
}

test('угловая накладка библиотеки не может быть самостоятельным значком', async () => {
  const sources = await Promise.all(
    ['dcss.js', 'dcss.html', 'dcss-rpg-content.js', 'dcss-rpg-spells.js', 'dcss-rpg-effects.js',
      'dcss-rpg-equipment-visuals.js', 'dcss-rpg-required-assets.js']
      .map((name) => readFile(new URL(`../tools/${name}`, import.meta.url), 'utf8')),
  );
  const badges = sources.flatMap((source) => source.match(/item\/[a-z]+\/i-[a-z_]+\.png/g) ?? []);
  assert.deepEqual([...new Set(badges)], [], 'вместо накладки нужен собранный значок из derived/icon/');
});

test('каждый собранный значок — квадрат 32×32 с содержимым по центру', async () => {
  const folder = new URL('derived/icon/', ASSETS);
  const files = (await readdir(folder)).filter((name) => name.endsWith('.png'));
  assert.ok(files.length >= 28, `значков всего ${files.length}`);
  for (const name of files) {
    const image = decodePng(await readFile(new URL(name, folder)));
    assert.deepEqual([image.width, image.height], [32, 32], `${name}: холст не 32×32`);
    const { dx, dy } = inkOffset(image);
    assert.ok(Math.abs(dx) <= 1 && Math.abs(dy) <= 1, `${name}: содержимое смещено на ${dx}, ${dy}`);
  }
});

test('пустой слот показывает предмет, а не слой бумажной куклы', async () => {
  const markup = await readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8');
  const slots = [...markup.matchAll(/class="inventory-equipment-slot slot-[a-z-]+"[\s\S]{0,220}?src="\.\.\/assets\/dcss-preview\/([^"]+)"/g)];
  assert.equal(slots.length, 11, 'слотов снаряжения одиннадцать');
  for (const [, path] of slots) {
    assert.doesNotMatch(path, /^player\//, `${path}: это слой куклы, а не картинка предмета`);
    const { width, height } = pngSize(await readFile(new URL(path, ASSETS)));
    assert.equal(width, height, `${path}: холст не квадратный`);
  }
});

test('значок кнопки не шире своей клетки', async () => {
  const css = await readFile(CSS, 'utf8');
  const variable = (name) => {
    const found = css.match(new RegExp(`${name}:\\s*(\\d+)px`));
    return found ? Number(found[1]) : null;
  };
  const declaration = (selector, property) => {
    const block = css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.>*]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
    assert.ok(block, `не нашлось правило ${selector}`);
    const found = block[1].match(new RegExp(`\\n\\s*${property}:\\s*([^;]+);`));
    return found ? found[1].trim() : null;
  };
  /** Первое число в объявлении, в пикселях; `var(--x)` разворачивается. */
  const pixels = (value) => {
    if (value == null) return null;
    const asVariable = value.match(/var\((--[a-z-]+)\)/);
    if (asVariable) return variable(asVariable[1]);
    const asNumber = value.match(/(\d+(?:\.\d+)?)px/);
    return asNumber ? Number(asNumber[1]) : null;
  };

  const border = variable('--pixel-unit');
  assert.equal(border, 4);
  // Клетка значка — это либо вся кнопка без рамки и отступов, либо, если
  // кнопка стала строкой, первая колонка её сетки: подпись рядом не даёт
  // картинке места, она даёт его тексту.
  const cellOf = (selector) => {
    const columns = declaration(selector, 'grid-template-columns');
    if (columns != null) return pixels(columns);
    return pixels(declaration(selector, 'width'))
      - 2 * border
      - 2 * pixels(declaration(selector, 'padding'));
  };
  for (const [button, icon] of [['.open-portal', '.open-portal img'], ['.interact-action', '.interact-action > img']]) {
    const cell = cellOf(button);
    const drawn = pixels(declaration(icon, 'width'));
    assert.ok(
      Number.isFinite(cell) && Number.isFinite(drawn),
      `${button}: не прочиталась геометрия (клетка ${cell}, картинка ${drawn})`,
    );
    assert.ok(
      drawn <= cell,
      `${button}: клетка ${cell}px, картинка ${drawn}px — grid прижмёт её в угол на ${(drawn - cell) / 2}px`,
    );
  }
});
