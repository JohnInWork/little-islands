import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CLEANSING_BY_RANK,
  CLEANSING_HEAL_PERCENT,
  CLEANSING_SALT_ITEM_ID,
  cleansingProfile,
  cleansingRefusalText,
  cleansingReport,
  resolveCleansing,
} from '../tools/dcss-rpg-cleansing.js';
import {
  SCROLL_VARIANTS,
  arcanaProfile,
  knownScrollVariants,
  scrollVariant,
  scrollVariantLabel,
} from '../tools/dcss-rpg-scrolls.js';
import { ACTOR_EFFECT_IDS, createActorEffects } from '../tools/dcss-rpg-effects.js';
import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import { SKILL_CAPABILITY_LIMITS, SKILL_IMPLEMENTATIONS, SKILL_SYSTEMS, createSkillState, deriveSkillCapabilities, learnSkill } from '../tools/dcss-rpg-skills.js';
import { skillById } from '../tools/dcss-rpg-skill-content.js';
import { spellById, spellHealing } from '../tools/dcss-rpg-spells.js';
import { itemDetails } from '../tools/dcss-rpg-item-details.js';

const effects = (source) => ({ ...createActorEffects(), ...source });

test('the ritual takes off only what the school knows how to take off', () => {
  assert.deepEqual(cleansingProfile({}), { rank: 0, cleared: CLEANSING_BY_RANK[0], healPercent: 0 });
  for (const rank of [1, 2, 3]) {
    const profile = cleansingProfile({ cleansingRank: rank });
    assert.equal(profile.rank, rank);
    assert.deepEqual(profile.cleared, CLEANSING_BY_RANK[rank]);
    assert.equal(profile.healPercent, CLEANSING_HEAL_PERCENT[rank]);
  }
  // Every treatable condition is a real condition the runtime can carry.
  for (const id of CLEANSING_BY_RANK[3]) assert.ok(ACTOR_EFFECT_IDS.includes(id), id);

  const novice = resolveCleansing({
    effects: effects({ poison: 6, burning: 5 }),
    hp: 10,
    maxHp: 40,
    profile: cleansingProfile({}),
  });
  assert.deepEqual(novice.cleared, ['poison']);
  assert.equal(novice.effects.burning, 5, 'an untaught hand leaves the fire burning');
  assert.equal(novice.hp, 10, 'and mends nothing');

  const master = resolveCleansing({
    effects: effects({ poison: 6, burning: 5, chilled: 3 }),
    hp: 10,
    maxHp: 40,
    profile: cleansingProfile({ cleansingRank: 3 }),
  });
  assert.deepEqual(master.cleared, ['poison', 'burning', 'chilled']);
  assert.equal(master.hp, 16);
  assert.equal(cleansingReport(master), 'Отравление, Горение, Озноб · +6');
});

test('a clean hero never spends the salt', () => {
  const refused = resolveCleansing({ effects: effects(), profile: cleansingProfile({ cleansingRank: 3 }) });
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'nothing-to-clear');
  assert.equal(cleansingRefusalText('nothing-to-clear'), 'Очищать нечего');
  assert.equal(cleansingReport(refused), 'Очищать нечего');
  // The healing is capped by the wound, not by the rank.
  const topped = resolveCleansing({
    effects: effects({ poison: 2 }),
    hp: 39,
    maxHp: 40,
    profile: cleansingProfile({ cleansingRank: 3 }),
  });
  assert.equal(topped.hp, 40);
  assert.equal(topped.healed, 1);
});

test('Cleansing and Arcana are learnable skills with live systems behind them', () => {
  for (const id of ['cleansing', 'arcana']) {
    assert.ok(SKILL_IMPLEMENTATIONS[id], `${id} has an implementation`);
    for (const system of skillById(id).requiresSystems) {
      assert.ok(SKILL_SYSTEMS.includes(system), `${system} is connected`);
    }
    for (const rank of SKILL_IMPLEMENTATIONS[id].capabilitiesByRank) {
      for (const [key, value] of Object.entries(rank)) {
        assert.ok(SKILL_CAPABILITY_LIMITS[key], `${key} has a declared limit`);
        assert.ok(Number.isInteger(value), `${key} stays an integer in the save`);
      }
    }
  }
  let state = createSkillState(9);
  for (let rank = 0; rank < 3; rank += 1) {
    const learned = learnSkill({
      state,
      heroLevel: 9,
      runStatus: 'playing',
      skillId: 'cleansing',
      expectedRank: rank,
      attributes: { strength: 40, agility: 40, intelligence: 40 },
    });
    assert.equal(learned.ok, true, `rank ${rank + 1} is reachable`);
    state = learned.state;
  }
  assert.equal(deriveSkillCapabilities(state).cleansingRank, 3);
  // The school that cleans also mends: Mending Light is the same ladder.
  assert.ok(spellHealing('mending-light', 8, 3) > spellHealing('mending-light', 8, 0));
});

test('the salt, the scrolls and the books are complete catalogue items', () => {
  const salt = lootById(CLEANSING_SALT_ITEM_ID);
  assert.equal(salt.useEffect.type, 'cleanse-ritual');
  assert.ok(salt.stack > 1, 'a reagent is carried by the handful');
  for (const id of ['flame-scroll', 'frost-scroll', 'insight-scroll', 'cleansing-salt', 'book-of-purity', 'book-of-splinters']) {
    const item = lootById(id);
    assert.ok(item, id);
    for (const language of ['ru', 'en']) {
      const details = itemDetails(item, language);
      assert.ok(details.name.length > 0, `${id} has a ${language} name`);
      assert.ok(!details.name.startsWith('item'), `${id} is not a raw path in ${language}`);
    }
  }
  assert.equal(lootById('book-of-purity').bookEffect.spellId, 'purging-light');
  assert.equal(lootById('book-of-splinters').bookEffect.spellId, 'arcane-splinter');
  assert.equal(spellById('purging-light').kind, 'purge');
  assert.equal(spellById('arcane-splinter').schoolId, 'arcana');
  assert.ok(spellById('arcane-splinter').cooldown < spellById('ember-bolt').cooldown, 'the splinter is the cheap shot');
  // Nothing in the catalogue may carry an effect the runtime cannot perform.
  const supported = new Set([
    'heal', 'food', 'power', 'camp', 'bandage', 'home-travel', 'blink', 'target-effect',
    'cleanse-ritual', 'flame-burst', 'frost-bind', 'insight', 'coat', 'unbind',
  ]);
  for (const item of LOOT_CATALOG) {
    if (!item.useEffect) continue;
    assert.ok(supported.has(item.useEffect.type), `${item.id}: ${item.useEffect.type}`);
  }
});

test('Arcana is a second reading of a page, and only a scholar sees it', () => {
  const none = arcanaProfile({});
  assert.deepEqual(knownScrollVariants(none), [], 'without the school every scroll has one use');
  assert.equal(scrollVariant('flame-scroll', none), null);

  const novice = arcanaProfile({ arcanaRank: 1, scrollVariantTier: 1 });
  assert.deepEqual(knownScrollVariants(novice).map(({ itemId }) => itemId), ['blink-scroll', 'insight-scroll']);
  const scholar = arcanaProfile({ arcanaRank: 3, scrollVariantTier: 3 });
  assert.equal(knownScrollVariants(scholar).length, Object.keys(SCROLL_VARIANTS).length);

  // Every variant belongs to a real scroll and reads as a complete effect.
  for (const [itemId, variant] of Object.entries(SCROLL_VARIANTS)) {
    const item = lootById(itemId);
    assert.ok(item, itemId);
    assert.equal(item.kind, 'scroll');
    assert.equal(variant.effect.type, item.useEffect.type, `${itemId} keeps its family`);
    assert.ok(variant.tier >= 1 && variant.tier <= 3);
    assert.ok(scrollVariantLabel(itemId, 'ru').length > 0);
    assert.ok(scrollVariantLabel(itemId, 'en').length > 0);
  }
  assert.ok(SCROLL_VARIANTS['blink-scroll'].effect.range > lootById('blink-scroll').useEffect.range);
  assert.ok(SCROLL_VARIANTS['flame-scroll'].effect.radius > lootById('flame-scroll').useEffect.radius);
  assert.equal(SCROLL_VARIANTS['frost-scroll'].effect.freeze, true);
  assert.equal(SCROLL_VARIANTS['insight-scroll'].effect.whole, true);
});

test('the runtime performs both readings and the ritual through the modules', async () => {
  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const uses = (needle) => assert.ok(source.includes(needle), needle);
  uses("from './dcss-rpg-cleansing.js'");
  uses("from './dcss-rpg-scrolls.js'");
  uses("effect?.type === 'cleanse-ritual'");
  uses('function burnAroundHero(');
  uses('function bindAroundHero(');
  uses('function revealFromScroll(');
  uses("usedSpell.kind === 'purge'");
  uses("usedSpell.schoolId === 'arcana'");
  uses('function variantForItem(');
  uses("!run.knowledge.identifiedItemIds.includes(item.id)");
  uses('scrollVariant(item.id, arcanaProfile(currentSkillCapabilities()))');
  uses('useConsumable(selection.item, selection.index, variantEffect)');
  const markup = await readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8');
  assert.ok(markup.includes('id="item-detail-variant"'), 'the second reading has its own button');
});
