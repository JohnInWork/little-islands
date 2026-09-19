import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ONBOARDING_HINTS,
  ONBOARDING_HINT_IDS,
  ONBOARDING_KEY,
  advanceOnboarding,
  createOnboardingState,
  dismissOnboarding,
  markOnboardingSeen,
  onboardingComplete,
  onboardingHintCopy,
  onboardingProblems,
  parseOnboardingState,
  serializeOnboardingState,
} from '../tools/dcss-rpg-onboarding.js';

const quiet = { depth: 1, inGame: true };

test('the catalog is five ordered first-floor hints with valid signals and short bilingual copy', () => {
  assert.deepEqual(onboardingProblems(), []);
  assert.deepEqual(ONBOARDING_HINT_IDS, ['move', 'enemy', 'loot', 'interact', 'exit', 'city']);
  assert.ok(Object.isFrozen(ONBOARDING_HINTS) && Object.isFrozen(ONBOARDING_HINTS[0]));
  for (const id of ONBOARDING_HINT_IDS) {
    const ru = onboardingHintCopy(id, 'ru');
    const en = onboardingHintCopy(id, 'en');
    assert.ok(ru.title && ru.text && en.title && en.text, id);
    assert.notEqual(ru.text, en.text, id);
    assert.equal(ru.dismiss, 'Понятно');
    assert.equal(en.skip, 'Hide hints');
    assert.match(ru.ariaLabel, /^Подсказка: /);
    assert.ok(Object.isFrozen(ru));
  }
  assert.equal(onboardingHintCopy('nope'), null);
  assert.equal(onboardingHintCopy('move', 'de').title, 'Движение', 'unknown languages fall back to Russian');
});

test('state is a strict localStorage document that survives garbage and unknown ids', () => {
  assert.equal(ONBOARDING_KEY, 'dng-codex:onboarding:v1');
  assert.deepEqual(createOnboardingState(), { seen: [], dismissed: false });
  assert.deepEqual(createOnboardingState({ seen: ['exit', 'bogus', 'move', 'move'], dismissed: 'yes' }), { seen: ['move', 'exit'], dismissed: false });
  assert.deepEqual(parseOnboardingState('{"seen":["loot"],"dismissed":true}'), { seen: ['loot'], dismissed: true });
  assert.deepEqual(parseOnboardingState('[1]'), { seen: [], dismissed: false });
  assert.deepEqual(parseOnboardingState('nope'), { seen: [], dismissed: false });
  assert.deepEqual(parseOnboardingState(null), { seen: [], dismissed: false });
  assert.equal(serializeOnboardingState({ seen: ['enemy'], dismissed: false }), '{"seen":["enemy"],"dismissed":false}');
  const seen = markOnboardingSeen(createOnboardingState(), 'enemy');
  assert.deepEqual(seen, { seen: ['enemy'], dismissed: false });
  assert.deepEqual(markOnboardingSeen(seen, 'enemy'), seen, 'marking twice changes nothing');
  assert.deepEqual(markOnboardingSeen(seen, 'bogus'), seen);
  assert.deepEqual(dismissOnboarding(seen), { seen: ONBOARDING_HINT_IDS, dismissed: true });
  assert.equal(onboardingComplete(seen), false);
  assert.equal(onboardingComplete(dismissOnboarding(seen)), true);
  assert.equal(onboardingComplete({ seen: ONBOARDING_HINT_IDS }), true);
  assert.ok(Object.isFrozen(seen) && Object.isFrozen(seen.seen));
});

test('hints appear in order on the first floor, complete on their own signals and never return', () => {
  let state = createOnboardingState();
  let step = advanceOnboarding(state, quiet);
  assert.equal(step.hintId, 'move', 'the first hint needs nothing but a playable run');
  assert.equal(step.changed, false);
  step = advanceOnboarding(step.state, { ...quiet, enemyVisible: true });
  assert.equal(step.hintId, 'move', 'earlier hints keep priority');
  step = advanceOnboarding(step.state, { ...quiet, moved: true, enemyVisible: true });
  assert.equal(step.hintId, 'enemy', 'moving completes the first hint by itself');
  assert.deepEqual(step.state.seen, ['move']);
  assert.equal(step.changed, true);
  step = advanceOnboarding(step.state, { ...quiet, moved: true, engaged: true, lootVisible: false });
  assert.equal(step.hintId, null, 'no hint when nothing is due');
  assert.deepEqual(step.state.seen, ['move', 'enemy']);
  step = advanceOnboarding(step.state, { ...quiet, moved: true, exitRevealed: true, interactAvailable: true });
  assert.equal(step.hintId, 'interact', 'later hints do not wait for earlier ones that are not due');
  state = markOnboardingSeen(step.state, 'interact');
  step = advanceOnboarding(state, { ...quiet, exitRevealed: true });
  assert.equal(step.hintId, 'exit');
  step = advanceOnboarding(step.state, { depth: 2, inGame: true, descended: true, lootVisible: true });
  assert.equal(step.hintId, null, 'nothing shows below the first floor');
  assert.deepEqual(step.state.seen, ['move', 'enemy', 'interact', 'exit'], 'descending still completes the stairs hint');
  step = advanceOnboarding(step.state, { ...quiet, lootVisible: true, moved: true });
  assert.equal(step.hintId, 'loot', 'a later first floor shows only what was never seen');
  assert.equal(advanceOnboarding(step.state, { ...quiet, inGame: false, lootVisible: true }).hintId, null, 'dead or ended runs show nothing');
  const dismissed = advanceOnboarding(dismissOnboarding(step.state), { ...quiet, lootVisible: true });
  assert.equal(dismissed.hintId, null);
  assert.equal(dismissed.changed, false);
  assert.ok(Object.isFrozen(step));
});

test('the runtime evaluates signals on the game screen, persists the state and renders a dismissable panel', async () => {
  const [runtime, html, css] = await Promise.all([
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
  ]);
  assert.match(runtime, /parseOnboardingState\(localStorage\.getItem\(ONBOARDING_KEY\)\)/);
  assert.match(runtime, /localStorage\.setItem\(ONBOARDING_KEY, serializeOnboardingState\(onboardingState\)\)/);
  assert.match(runtime, /function currentOnboardingSignals\(\)[\s\S]*depth: dungeon\.depth,[\s\S]*moved: playerHasActed,[\s\S]*pickedUp: run\.floor\.collected\.length > 0,[\s\S]*interactAvailable: interactActions\.childElementCount > 0,[\s\S]*exitRevealed: revealed\.has\(`\$\{dungeon\.exit\.x\},\$\{dungeon\.exit\.y\}`\),[\s\S]*descended: dungeon\.depth > 1,/);
  assert.match(runtime, /if \(hitStop === 0\) updateWorld\(delta\);\s+\}\s+updateOnboarding\(time\);/, 'evaluated each frame on the game screen only');
  assert.match(runtime, /const result = advanceOnboarding\(onboardingState, currentOnboardingSignals\(\)\);/);
  assert.match(runtime, /onboardingDismissButton\.addEventListener\('click', dismissOnboardingHint\);/);
  assert.match(runtime, /onboardingSkipButton\.addEventListener\('click', skipOnboarding\);/);
  assert.match(runtime, /onboardingInteracted = true;/);
  assert.match(runtime, /renderOnboardingHint\(\);\s+updateHud\(\);\s*\}/, 'language changes re-render the visible hint');
  assert.match(html, /id="onboarding-hint"[\s\S]*id="onboarding-title"[\s\S]*id="onboarding-text"[\s\S]*id="onboarding-skip"[\s\S]*id="onboarding-dismiss"/);
  assert.match(css, /\[data-screen\]:not\(\[data-screen='game'\]\) \.onboarding-hint/);
  assert.match(css, /\.loot-toast\.visible ~ \.onboarding-hint/, 'the loot toast wins while it is visible');
});

test('the city hint waits for the city and no first-floor hint follows the hero there', () => {
  const city = { depth: 4, inGame: true, inCity: true };
  // On the first floor the city hint is out of reach, whatever the signals say.
  const onFloorOne = advanceOnboarding({ seen: [], dismissed: false }, { depth: 1, inGame: true, inCity: true });
  assert.equal(onFloorOne.hintId, 'move', 'the first floor teaches the first floor');

  const seenBasics = { seen: ['move', 'enemy', 'loot', 'interact', 'exit'], dismissed: false };
  assert.equal(advanceOnboarding(seenBasics, city).hintId, 'city');
  assert.equal(
    advanceOnboarding(seenBasics, { depth: 5, inGame: true, inCity: false }).hintId,
    null,
    'an ordinary floor says nothing',
  );
  assert.equal(
    advanceOnboarding({ seen: [], dismissed: false }, city).hintId,
    'city',
    'a hero who skipped the basics still hears about the city',
  );
  const bought = advanceOnboarding(seenBasics, { ...city, houseOwned: true });
  assert.ok(bought.state.seen.includes('city'), 'buying the house answers the hint');
  assert.equal(bought.hintId, null);

  const copy = onboardingHintCopy('city', 'ru');
  assert.equal(copy.title, 'Город');
  assert.match(copy.text, /участок продаётся/i);
  assert.equal(onboardingHintCopy('city', 'en').title, 'The city');
});
