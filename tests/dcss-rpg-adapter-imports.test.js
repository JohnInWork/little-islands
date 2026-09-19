import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

/**
 * The adapter is thirteen thousand lines and the only module that touches the
 * DOM, so nothing in the test suite loads it: `document` does not exist under
 * `node --test`, and the bundler is happy to ship a free identifier because a
 * free identifier is legal JavaScript right up to the moment it runs.
 *
 * That combination hid four real bugs at once. `sleep`, `restPresentation`,
 * `restStage`, `advanceRest`, `canSpendSkillPoints` and `restCopy` were written
 * into `dcss.js` with no import of `dcss-rpg-rest.js` anywhere in the file, and
 * so were `createCompanionParty` — inside the function that takes a hire — and
 * `isMercenary`. Tests passed, the build passed, and the first hero to sleep,
 * hire anybody or simply have their rest drawn on the HUD would have hit a
 * ReferenceError.
 *
 * This is the cheap check that closes that hole: every name a rule module
 * exports, if the adapter uses it as a bare identifier, must be imported there
 * or declared there. It is grep, not a type checker, and that is the point —
 * it costs nothing and it catches the one mistake nothing else can see.
 */

const IDENTIFIER_BEFORE = "(?<![.\\w$'\"`])";

async function adapterSource() {
  return readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
}

function importedNames(source) {
  const names = new Set();
  for (const block of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'[^']+'/g)) {
    for (const raw of block[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/).pop().trim();
      if (name) names.add(name);
    }
  }
  for (const block of source.matchAll(/import\s+(\w+)\s+from/g)) names.add(block[1]);
  return names;
}

function declaredNames(source) {
  const names = new Set();
  for (const match of source.matchAll(/^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm)) names.add(match[1]);
  for (const match of source.matchAll(/^\s*(?:const|let|var)\s+(\w+)/gm)) names.add(match[1]);
  return names;
}

test('every rule-module export the adapter calls is actually imported there', async () => {
  const adapter = await adapterSource();
  const known = new Set([...importedNames(adapter), ...declaredNames(adapter)]);

  const directory = new URL('../tools/', import.meta.url);
  const modules = (await readdir(directory)).filter((name) => /^dcss-rpg-[\w-]+\.js$/.test(name));
  assert.ok(modules.length > 50, 'the rule modules are where the game lives');

  const missing = [];
  for (const file of modules) {
    const source = await readFile(new URL(file, directory), 'utf8');
    for (const match of source.matchAll(/^export\s+(?:const|function|class|let)\s+(\w+)/gm)) {
      const name = match[1];
      if (known.has(name)) continue;
      // Called, read as a property owner, or passed along: any of those needs
      // the binding to exist. A name that merely appears inside a string or
      // after a dot belongs to something else and is not our business.
      if (new RegExp(`${IDENTIFIER_BEFORE}${name}\\s*[({.,)\\];]`).test(adapter)) {
        missing.push(`${name} — used in tools/dcss.js, exported by tools/${file}, imported nowhere`);
      }
    }
  }
  assert.deepEqual(missing, [], `\n${missing.join('\n')}\n`);
});

/**
 * And the mirror of it: a name imported and never used is dead weight the next
 * reader has to check. This one is a warning rather than a wall — it only fails
 * on imports from the rule modules, where the list is ours to keep tidy.
 */
test('the adapter does not carry imports it never uses', async () => {
  const adapter = await adapterSource();
  const unused = [];
  for (const block of adapter.matchAll(/import\s*\{([^}]*)\}\s*from\s*'(\.\/dcss-rpg-[\w-]+\.js)'/g)) {
    for (const raw of block[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/).pop().trim();
      if (!name) continue;
      const uses = adapter.match(new RegExp(`\\b${name}\\b`, 'g')) ?? [];
      // One occurrence is the import line itself.
      if (uses.length <= 1) unused.push(`${name} (from ${block[2]})`);
    }
  }
  assert.deepEqual(unused, [], `\n${unused.join('\n')}\n`);
});
