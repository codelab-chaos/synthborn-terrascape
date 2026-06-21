import { apiFetch } from '../platform/api-client.ts';
function normalizeNpcKey(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function stripRuntimeSuffix(value) {
  if (typeof value !== 'string') return null;
  return value.replace(/_(Wander|Patrol|Fighter|Archer|Scout|Soldier)$/i, '');
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function isPassiveMobCategory(category, attackDamage) {
  if (typeof attackDamage === 'number' && attackDamage > 0) {
    return false;
  }
  if (['passive', 'livestock', 'critter', 'flying', 'swimming'].some((value) => category.includes(value))) {
    return true;
  }
  return attackDamage === null && ['creature', 'avian', 'fish'].some((value) => category.includes(value));
}

export function createNpcCatalog({ logClientEvent }) {
  let loaded = false;
  const detailsById = new Map();
  const aliases = new Map();

  async function load() {
    try {
      const response = await apiFetch('/npc-details.json');
      if (!response.ok) {
        throw new Error(`NPC details request failed: ${response.status}`);
      }
      const data = await response.json();
      detailsById.clear();
      aliases.clear();
      for (const entry of Object.values(data.entries ?? {})) {
        if (!entry?.id) continue;
        detailsById.set(entry.id, entry);
        for (const alias of entry.aliases ?? []) {
          aliases.set(normalizeNpcKey(alias), entry);
        }
        aliases.set(normalizeNpcKey(entry.id), entry);
        aliases.set(normalizeNpcKey(entry.label), entry);
        aliases.set(normalizeNpcKey(entry.appearance), entry);
      }
      loaded = true;
      logClientEvent('npc_details_loaded', {
        roles: detailsById.size,
        aliases: aliases.size,
      });
    } catch (error) {
      loaded = false;
      console.warn('NPC details lookup failed', error);
      logClientEvent('npc_details_failed', { error: error?.message ?? error });
    }
  }

  function enrich(mob, id) {
    const details = resolve(mob);
    const category = String(mob.category ?? details?.categoryPath ?? '').toLowerCase();
    const maxHealth = firstFiniteNumber(mob.maxHealth, mob.maxHp, details?.maxHealth, mob.hp, mob.health);
    const rawAttackDamage = firstFiniteNumber(mob.attackDamage, mob.damage, details?.attackDamage);
    const passiveCard = isPassiveMobCategory(category, rawAttackDamage);
    const attackDamage = passiveCard ? 0 : rawAttackDamage;
    return {
      ...mob,
      id,
      details,
      label: details?.label ?? mob.label ?? mob.type ?? id,
      maxHealth,
      hp: firstFiniteNumber(mob.health, mob.hp, maxHealth),
      attackDamage,
      iconUrl: details?.icon ? `/${details.icon}` : mob.iconUrl,
      passiveCard,
    };
  }

  function resolve(mob) {
    const candidates = [
      mob.id,
      mob.type,
      mob.label,
      mob.role,
      mob.appearance,
      stripRuntimeSuffix(mob.type),
      stripRuntimeSuffix(mob.label),
    ].filter(Boolean);
    for (const candidate of candidates) {
      const exact = detailsById.get(candidate);
      if (exact) return exact;
      const alias = aliases.get(normalizeNpcKey(candidate));
      if (alias) return alias;
    }
    return null;
  }

  function state() {
    return {
      loaded,
      entries: detailsById.size,
      aliases: aliases.size,
    };
  }

  return { load, enrich, state };
}
