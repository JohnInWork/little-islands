import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  PORTAL_PATH,
  canOpenPortal,
  createPortalState,
  openPortalAt,
  portalAnchoredDepths,
  portalCopy,
  portalMouthOn,
  validatePortalState,
} from '../tools/dcss-rpg-portal.js';
import {
  createRun,
  generateDungeon,
  travelRunToDepth,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { cityPortalCell } from '../tools/dcss-rpg-city.js';

/**
 * «Телепорт открыт сразу и он бесконечный» — and the second half, which
 * arrived after the first build refused a second portal: «надо чтобы можно
 * было новый открыть и чтобы старый закрывался — мы делаем не душную игру».
 *
 * Replacing costs nothing, and that is the point worth writing down: the
 * portal you replace is always one you walked away from yourself, on a floor
 * you already left. The way back from where you are standing cannot be taken
 * away, because that is the portal you are opening.
 */
test('a portal is always available, never runs out, and a new one replaces the old', () => {
  // Nothing to buy, nothing to carry: standing in the dungeon is the whole
  // requirement, whether or not one is already open somewhere.
  assert.deepEqual(canOpenPortal({ depth: 1 }), { ok: true, reason: 'ready' });
  assert.deepEqual(canOpenPortal({ depth: 40 }), { ok: true, reason: 'ready' });
  assert.deepEqual(
    canOpenPortal({ depth: 40, portal: { depth: 9, x: 1, y: 1 } }),
    { ok: true, reason: 'ready' },
    'an open portal makes the key refuse',
  );

  // The city is what a portal is for, so it cannot be opened there.
  assert.equal(canOpenPortal({ depth: 0 }).reason, 'in-city');
  assert.equal(canOpenPortal({ depth: 3, status: 'dead' }).reason, 'not-playing');

  const first = openPortalAt({ depth: 9, x: 4, y: 5 });
  assert.equal(first.ok, true);
  assert.equal(first.reason, 'opened');
  assert.equal(first.replaced, null, 'the first one replaced something');
  assert.deepEqual(first.portal, { depth: 9, x: 4, y: 5 });

  // The second one opens, and takes the first one's place.
  const second = openPortalAt({ depth: 14, x: 10, y: 10, portal: first.portal });
  assert.equal(second.ok, true);
  assert.equal(second.reason, 'replaced', 'a replacement passes for a first opening');
  assert.deepEqual(second.portal, { depth: 14, x: 10, y: 10 });
  assert.deepEqual(second.replaced, first.portal, 'nothing says the old one went out');
  // And there is still only one: the pin follows it to the new floor.
  assert.deepEqual([...portalAnchoredDepths(second.portal)], [14]);

  for (const language of ['ru', 'en']) {
    const copy = portalCopy(language);
    assert.ok(copy.open.length > 0);
    assert.ok(copy.replaced.length > 0, `${language}: nothing to say when one closes`);
    assert.equal(copy.refusal['already-open'], undefined, 'the refusal is still written');
  }
  assert.notEqual(portalCopy('ru').open, portalCopy('en').open);
  assert.notEqual(portalCopy('ru').replaced, portalCopy('en').replaced);

  // Opening one where it already stands is not a replacement: nothing went
  // out anywhere, so nothing is announced.
  const again = openPortalAt({ depth: 14, x: 10, y: 10, portal: second.portal });
  assert.equal(again.reason, 'opened');
  assert.equal(again.replaced, null);
});

test('a portal is two coordinates, and anything else is no portal at all', () => {
  assert.equal(createPortalState(null), null);
  assert.equal(createPortalState({ depth: 0, x: 1, y: 1 }), null, 'the city end is derived, not stored');
  assert.equal(createPortalState({ depth: 2, x: -1, y: 1 }), null);
  assert.equal(createPortalState({ depth: 2.5, x: 1, y: 1 }), null);
  assert.equal(createPortalState('somewhere'), null);

  assert.equal(validatePortalState(null), true);
  assert.equal(validatePortalState(undefined), true, 'a save from before portals has none');
  assert.equal(validatePortalState({ depth: 3, x: 1, y: 2 }), true);
  assert.equal(validatePortalState({ depth: 3, x: 1, y: 2, extra: 1 }), false);
  assert.equal(validatePortalState({ depth: 0, x: 1, y: 2 }), false);

  const open = { depth: 6, x: 3, y: 4 };
  assert.deepEqual(portalMouthOn(open, 6), { end: 'dungeon', x: 3, y: 4 });
  assert.deepEqual(portalMouthOn(open, 0), { end: 'city' });
  assert.equal(portalMouthOn(open, 5), null, 'a portal is not on every floor');
  assert.equal(portalMouthOn(null, 6), null);
});

/**
 * The question the whole design turns on. Ivan: «игрок вошёл в портал, появился
 * в городе и пошёл кушать или чай пить, игра закрылась — а потом он продолжает
 * играть, а телепорта обратно нет, и ему придётся идти сорок этажей вниз
 * заново». So: walk in, be saved, be reloaded, and walk back out.
 */
test('the way back survives the city, the save and the reload', () => {
  const seed = 4242;
  let run = createRun(seed);
  // Down to nine, then open one and step into town.
  for (let depth = 2; depth <= 9; depth += 1) run = travelRunToDepth(run, depth);
  assert.equal(run.depth, 9);
  const here = { x: run.hero.x, y: run.hero.y };
  const opened = openPortalAt({ depth: run.depth, x: here.x, y: here.y, portal: run.portal });
  assert.equal(opened.ok, true);
  run = { ...run, portal: opened.portal };
  assert.equal(validateRun(run), true, 'an open portal makes the save invalid');

  const town = travelRunToDepth(run, 0, cityPortalCell(generateDungeon({ seed, depth: 0 })));
  assert.equal(town.depth, 0);
  // Leaving never spends it: the ring is still standing on the ninth floor.
  assert.deepEqual(town.portal, { depth: 9, x: here.x, y: here.y });
  // And the floor it stands on is pinned, so nine floors of work are not
  // quietly rebuilt while the hero is buying bread.
  assert.ok(Object.keys(town.floors).includes('9'), 'the floor with the portal was forgotten');

  // The tea. Everything the game knows goes through JSON and comes back.
  const reloaded = JSON.parse(JSON.stringify(town));
  assert.equal(validateRun(reloaded), true, 'the saved town does not load');
  assert.deepEqual(reloaded.portal, town.portal, 'the way back did not survive the save');
  assert.ok(Object.keys(reloaded.floors).includes('9'));

  // And back through, to the very cell it was opened on.
  const back = travelRunToDepth(reloaded, reloaded.portal.depth, {
    x: reloaded.portal.x,
    y: reloaded.portal.y,
  });
  assert.equal(back.depth, 9);
  assert.equal(back.hero.x, here.x);
  assert.equal(back.hero.y, here.y);
  assert.equal(validateRun(back), true);
});

test('the far floor is pinned however far the hero walks from it', () => {
  const portal = { depth: 12, x: 5, y: 5 };
  assert.deepEqual([...portalAnchoredDepths(portal)], [12]);
  assert.deepEqual([...portalAnchoredDepths(null)], []);

  // Walking down from the portal's floor keeps its archive; the floors in
  // between fall out of memory as they always did.
  let run = createRun(77);
  for (let depth = 2; depth <= 12; depth += 1) run = travelRunToDepth(run, depth);
  run = { ...run, portal, floor: { ...run.floor, collected: [] } };
  for (let depth = 13; depth <= 20; depth += 1) run = travelRunToDepth(run, depth);
  assert.equal(run.depth, 20);
  assert.ok(Object.keys(run.floors).includes('12'), 'the portal floor was forgotten');
});

/**
 * Городской конец портала стоит на площади.
 *
 * Стоял он у ворот вниз — и это било с двух сторон. Игрок, поднявшийся наверх
 * другими воротами, находил кольцо у чужого выхода: «иду как бы в другой
 * проход, и там стоит портал, хотя его там как бы быть не должно». А
 * вернувшись своим порталом, оказывался в углу и шёл искать проход через весь
 * город — этим забег и кончился: «подхожу к порталу и не могу улететь
 * обратно». Иван: «давай сделаем, чтобы портал появлялся в центре города».
 */
test('the town end stands on the plaza, and the same place every time', async () => {
  for (const seed of [1, 6, 42, 4242]) {
    const town = generateDungeon({ seed, depth: 0 });
    const cell = cityPortalCell(town);
    assert.ok(cell, `seed ${seed}: the town has nowhere to put a portal`);
    assert.deepEqual(cell, cityPortalCell(town), 'the town end wanders');
    const plaza = town.city.blocks.find(({ kind }) => kind === 'plaza').interior;
    assert.ok(
      cell.x >= plaza.x && cell.x < plaza.x + plaza.w && cell.y >= plaza.y && cell.y < plaza.y + plaza.h,
      `seed ${seed}: портал встал не на площади`,
    );
    assert.equal(town.grid[cell.y][cell.x], '.', `seed ${seed}: the town end is in a wall`);
  }
  assert.equal(cityPortalCell(null), null);
  assert.equal(cityPortalCell({ gates: {} }), null);

  // The picture ships, and both mouths use it: it is one portal.
  const preview = new URL('../public/assets/dcss-preview/', import.meta.url);
  const { existsSync } = await import('node:fs');
  assert.ok(existsSync(new URL(PORTAL_PATH, preview)), `${PORTAL_PATH} does not ship`);
});

test('coming back is what closes it, and leaving never does', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const step = runtime.slice(runtime.indexOf('function stepThroughPortal()'));
  const body = step.slice(0, step.indexOf('\nfunction '));
  // Spent on arrival, never on departure: nothing that goes wrong in between
  // can eat the way home.
  assert.match(body, /if \(!goingHome\) run\.portal = null;/);
  assert.ok(!/run\.portal = null;[\s\S]*travelRunToDepth/.test(body), 'it is closed before the trip');
  // The button exists and is hidden in town — and never refuses because a
  // portal is already open: «мы делаем не душную игру».
  assert.match(runtime, /openPortalButton\.addEventListener\('click', openHeroPortal\)/);
  assert.match(runtime, /openPortalButton\.hidden = isCityDepth\(dungeon\.depth\)/);
  const button = runtime.slice(runtime.indexOf('function updatePortalButton()'));
  const buttonBody = button.slice(0, button.indexOf('\nfunction '));
  assert.doesNotMatch(buttonBody, /portal: run\.portal/, 'the key still looks at the open portal');
  // Opening on top of one says so, because a ring goes out where nobody sees.
  const open = runtime.slice(runtime.indexOf('function openHeroPortal()'));
  assert.match(open.slice(0, open.indexOf('\nfunction ')), /result\.reason === 'replaced'/);
  // And it is drawn on whichever floor it stands on, standing on the ground.
  assert.match(runtime, /id: 'marker:portal'/);
  assert.match(runtime, /screenOffsetY: visual\.offsetY \+ groundLift\(60 \* visual\.scale\)/);
});
