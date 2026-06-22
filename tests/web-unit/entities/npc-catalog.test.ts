import assert from 'node:assert/strict';
import test from 'node:test';

import { createNpcCatalog } from '../../../web/src/entities/npc-catalog.ts';

function makeCatalog() {
  const events: Array<{ name: string; payload: unknown }> = [];
  const catalog = createNpcCatalog({
    logClientEvent: (name: string, payload: unknown) => {
      events.push({ name, payload });
    },
  });
  return { catalog, events };
}

function withFetch(handler: (url: string) => unknown, fn: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => handler(String(url))) as typeof fetch;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

test('initial state is unloaded with empty maps', () => {
  const { catalog } = makeCatalog();
  assert.deepEqual(catalog.state(), { loaded: false, entries: 0, aliases: 0 });
});

test('load populates details and aliases', async () => {
  const { catalog, events } = makeCatalog();
  await withFetch(
    () => ({
      ok: true,
      json: async () => ({
        entries: {
          a: {
            id: 'Goblin',
            label: 'Goblin Grunt',
            appearance: 'GoblinAppearance',
            icon: 'icons/goblin.png',
            aliases: ['Gob', 'GoblinAlt'],
            maxHealth: 40,
            attackDamage: 6,
            categoryPath: 'hostile/humanoid',
          },
          skipped: { label: 'no id here' },
        },
      }),
    }),
    async () => {
      await catalog.load();
    },
  );
  const state = catalog.state();
  assert.equal(state.loaded, true);
  assert.equal(state.entries, 1);
  assert.ok(state.aliases >= 1);
  assert.ok(events.some((e) => e.name === 'npc_details_loaded'));
});

test('load handles non-ok response by logging failure', async () => {
  const { catalog, events } = makeCatalog();
  await withFetch(
    () => ({ ok: false, status: 503, json: async () => ({}) }),
    async () => {
      await catalog.load();
    },
  );
  assert.equal(catalog.state().loaded, false);
  assert.ok(events.some((e) => e.name === 'npc_details_failed'));
});

test('enrich resolves details by id and exposes derived fields', async () => {
  const { catalog } = makeCatalog();
  await withFetch(
    () => ({
      ok: true,
      json: async () => ({
        entries: {
          a: {
            id: 'Goblin',
            label: 'Goblin Grunt',
            icon: 'icons/goblin.png',
            maxHealth: 40,
            attackDamage: 6,
            categoryPath: 'hostile/humanoid',
          },
        },
      }),
    }),
    async () => {
      await catalog.load();
    },
  );
  const enriched = catalog.enrich({ type: 'Goblin', x: 1, y: 2, z: 3 }, 'Goblin:1:2:3');
  assert.equal(enriched.id, 'Goblin:1:2:3');
  assert.equal(enriched.label, 'Goblin Grunt');
  assert.equal(enriched.maxHealth, 40);
  assert.equal(enriched.attackDamage, 6);
  assert.equal(enriched.iconUrl, '/icons/goblin.png');
  assert.equal(enriched.passiveCard, false);
  assert.ok(enriched.details);
});

test('enrich marks passive categories and zeroes damage', async () => {
  const { catalog } = makeCatalog();
  await withFetch(
    () => ({ ok: true, json: async () => ({ entries: {} }) }),
    async () => {
      await catalog.load();
    },
  );
  const enriched = catalog.enrich(
    { type: 'Cow', category: 'passive/livestock', health: 12 },
    'Cow:0',
  );
  assert.equal(enriched.passiveCard, true);
  assert.equal(enriched.attackDamage, 0);
  assert.equal(enriched.hp, 12);
  // label falls back to type when no details
  assert.equal(enriched.label, 'Cow');
});

test('enrich without details uses mob iconUrl and label fallbacks', () => {
  const { catalog } = makeCatalog();
  const enriched = catalog.enrich(
    { type: 'Unknown', iconUrl: '/custom.png', attackDamage: 9, category: 'hostile' },
    'id-1',
  );
  assert.equal(enriched.iconUrl, '/custom.png');
  assert.equal(enriched.attackDamage, 9);
  assert.equal(enriched.passiveCard, false);
  assert.equal(enriched.label, 'Unknown');
  assert.equal(enriched.id, 'id-1');
});

test('enrich resolves via alias and stripped runtime suffix', async () => {
  const { catalog } = makeCatalog();
  await withFetch(
    () => ({
      ok: true,
      json: async () => ({
        entries: {
          a: {
            id: 'Skeleton',
            label: 'Skeleton',
            aliases: ['BoneGuy'],
            attackDamage: 4,
            categoryPath: 'hostile',
          },
        },
      }),
    }),
    async () => {
      await catalog.load();
    },
  );
  // resolves stripping the _Archer runtime suffix
  const enriched = catalog.enrich({ type: 'Skeleton_Archer' }, 'sk-1');
  assert.equal(enriched.label, 'Skeleton');
  assert.ok(enriched.details);

  // resolves through normalized alias ('BoneGuy' -> 'boneguy')
  const aliasEnriched = catalog.enrich({ type: 'BONEGUY' }, 'sk-2');
  assert.ok(aliasEnriched.details);
});

test('enrich keeps creature passive only when damage unknown', () => {
  const { catalog } = makeCatalog();
  const passive = catalog.enrich({ type: 'Deer', category: 'creature' }, 'd-1');
  assert.equal(passive.passiveCard, true);
  const armed = catalog.enrich({ type: 'Deer', category: 'creature', attackDamage: 3 }, 'd-2');
  assert.equal(armed.passiveCard, false);
});
