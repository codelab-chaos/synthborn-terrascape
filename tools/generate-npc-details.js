#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const worldviewRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(worldviewRoot, '..', '..');
const serverRoot = path.join(repoRoot, '_Assets', 'Server');
const rolesRoot = path.join(repoRoot, '_Assets', 'Server', 'NPC', 'Roles');
const iconsRoot = path.join(repoRoot, '_Assets', 'Common', 'Icons', 'ModelsGenerated');
const labelsPath = path.join(
  repoRoot,
  'mods',
  'SynthOverseer',
  'src',
  'main',
  'resources',
  'synthoverseer',
  'lang',
  'en-US-labels.properties',
);
const outputPath = path.join(
  worldviewRoot,
  'src',
  'main',
  'resources',
  'web',
  'npc-details.json',
);

const FIELD_NAMES = [
  'Appearance',
  'MaxHealth',
  'MaxSpeed',
  'ViewRange',
  'ViewSector',
  'HearingRange',
  'AlertedRange',
  'Attack',
  'AttackDistance',
  'DropList',
  'FlockArray',
  'AttitudeGroup',
  'MemoriesCategory',
  'MemoriesNameOverride',
  'NameTranslationKey',
  'IsTameable',
  'TameRoleChange',
  'Timid',
];

function main() {
  if (!fs.existsSync(rolesRoot)) {
    throw new Error(`Missing roles root: ${rolesRoot}`);
  }
  if (!fs.existsSync(iconsRoot)) {
    throw new Error(`Missing generated icon root: ${iconsRoot}`);
  }

  const labels = readLabels();
  const iconFiles = readIconFiles();
  const roles = readRoles();
  const assetIndex = readAssetIndex();
  const resolvedAssets = new Map();
  const resolved = new Map();
  const entries = {};

  for (const id of Array.from(roles.keys()).sort()) {
    const role = resolveRole(id, roles, resolved, new Set());
    if (!role) continue;
    const entry = buildEntry(id, role, roles.get(id), iconFiles, labels, assetIndex, resolvedAssets);
    entries[id] = entry;
  }

  const table = {
    generatedAt: new Date().toISOString(),
    source: {
      roles: slash(path.relative(repoRoot, rolesRoot)),
      icons: slash(path.relative(repoRoot, iconsRoot)),
      labels: slash(path.relative(repoRoot, labelsPath)),
    },
    counts: {
      roles: Object.keys(entries).length,
      icons: iconFiles.size,
      withIcon: Object.values(entries).filter((entry) => entry.icon).length,
      withMaxHealth: Object.values(entries).filter((entry) => typeof entry.maxHealth === 'number').length,
      withAttackDamage: Object.values(entries).filter((entry) => typeof entry.attackDamage === 'number').length,
    },
    entries,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(table, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${slash(path.relative(repoRoot, outputPath))}`);
  console.log(JSON.stringify(table.counts));
}

function readIconFiles() {
  const files = new Map();
  for (const file of walkFiles(iconsRoot, '.png')) {
    const name = path.basename(file, '.png');
    files.set(normalizeId(name), {
      source: file,
      webPath: `mob-icons/${path.basename(file)}`,
    });
  }
  return files;
}

function readLabels() {
  const labels = new Map();
  if (!fs.existsSync(labelsPath)) return labels;
  for (const line of fs.readFileSync(labelsPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equals = line.indexOf('=');
    if (equals < 1) continue;
    labels.set(line.slice(0, equals).trim(), line.slice(equals + 1).trim());
  }
  return labels;
}

function readRoles() {
  const roles = new Map();
  for (const file of walkFiles(rolesRoot, '.json')) {
    const id = path.basename(file, '.json');
    const relativePath = slash(path.relative(repoRoot, file));
    try {
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      roles.set(id, {
        id,
        file,
        relativePath,
        categoryPath: slash(path.dirname(path.relative(rolesRoot, file))),
        json,
      });
    } catch (error) {
      console.warn(`Skipping invalid JSON ${relativePath}: ${error.message}`);
    }
  }
  return roles;
}

function readAssetIndex() {
  const assets = new Map();
  for (const root of [
    path.join(serverRoot, 'Item'),
    path.join(serverRoot, 'Projectiles'),
    path.join(serverRoot, 'ProjectileConfigs'),
  ]) {
    if (!fs.existsSync(root)) continue;
    for (const file of walkFiles(root, '.json')) {
      const id = path.basename(file, '.json');
      const relativePath = slash(path.relative(repoRoot, file));
      try {
        const json = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!assets.has(id)) {
          assets.set(id, { id, file, relativePath, json });
        }
      } catch (error) {
        console.warn(`Skipping invalid JSON ${relativePath}: ${error.message}`);
      }
    }
  }
  return assets;
}

function resolveRole(id, roles, cache, stack) {
  if (cache.has(id)) return cache.get(id);
  const role = roles.get(id);
  if (!role) return null;
  if (stack.has(id)) {
    console.warn(`Skipping recursive role reference: ${Array.from(stack).join(' -> ')} -> ${id}`);
    return null;
  }

  stack.add(id);
  const referenceId = typeof role.json.Reference === 'string' ? role.json.Reference : null;
  const base = referenceId ? resolveRole(referenceId, roles, cache, stack) : null;
  const own = materializeRoleJson(role.json);
  const resolved = deepMerge(base ?? {}, own);
  stack.delete(id);
  cache.set(id, resolved);
  return resolved;
}

function resolveAsset(id, assets, cache, stack) {
  if (cache.has(id)) return cache.get(id);
  const asset = assets.get(id);
  if (!asset) return null;
  if (stack.has(id)) {
    console.warn(`Skipping recursive asset reference: ${Array.from(stack).join(' -> ')} -> ${id}`);
    return null;
  }

  stack.add(id);
  const parentId = typeof asset.json.Parent === 'string' ? asset.json.Parent : null;
  const base = parentId ? resolveAsset(parentId, assets, cache, stack) : null;
  const resolved = deepMerge(base ?? {}, asset.json);
  stack.delete(id);
  cache.set(id, resolved);
  return resolved;
}

function materializeRoleJson(json) {
  const parameters = json.Parameters ?? {};
  const modify = json.Modify ?? {};
  const materialized = deepClone(modify);
  for (const [key, value] of Object.entries(materialized)) {
    if (value && typeof value === 'object' && value.Compute) {
      materialized[key] = parameterValue(parameters[value.Compute]);
    }
  }
  for (const [key, value] of Object.entries(parameters)) {
    if (materialized[key] === undefined) {
      materialized[key] = parameterValue(value);
    }
  }
  return materialized;
}

function buildEntry(id, resolved, sourceRole, iconFiles, labels, assetIndex, resolvedAssets) {
  const fields = {};
  for (const field of FIELD_NAMES) {
    fields[field] = normalizeFieldValue(resolved[field]);
  }

  const aliases = unique([
    id,
    fields.Appearance,
    fields.MemoriesNameOverride,
    stripRuntimeSuffix(id),
    stripRuntimeSuffix(fields.Appearance),
    ...(Array.isArray(fields.FlockArray) ? fields.FlockArray : []),
  ].filter(Boolean));

  const icon = findIcon(aliases, iconFiles);
  const attackDamage = firstFiniteNumber(maxBaseDamage(resolved), maxAttackAssetDamage(fields.Attack, assetIndex, resolvedAssets));

  return compactObject({
    id,
    label: displayLabel(id, fields, labels),
    categoryPath: sourceRole.categoryPath,
    reference: sourceRole.json.Reference ?? null,
    appearance: fields.Appearance ?? null,
    icon,
    aliases,
    maxHealth: numberOrNull(fields.MaxHealth),
    attackDamage,
    attack: fields.Attack ?? null,
    attackDistance: numberOrNull(fields.AttackDistance),
    maxSpeed: numberOrNull(fields.MaxSpeed),
    viewRange: numberOrNull(fields.ViewRange),
    hearingRange: numberOrNull(fields.HearingRange),
    dropList: fields.DropList ?? null,
    flock: Array.isArray(fields.FlockArray) ? fields.FlockArray : null,
    attitudeGroup: fields.AttitudeGroup ?? null,
    memoriesCategory: fields.MemoriesCategory ?? null,
    tameable: booleanOrNull(fields.IsTameable),
    tameRoleChange: fields.IsTameable === true ? fields.TameRoleChange ?? null : null,
    timid: booleanOrNull(fields.Timid),
    nameTranslationKey: fields.NameTranslationKey ?? null,
    source: slash(path.relative(repoRoot, sourceRole.file)),
  });
}

function parameterValue(value) {
  if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'Value')) {
    return deepClone(value.Value);
  }
  return deepClone(value);
}

function normalizeFieldValue(value) {
  if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'Value')) {
    return normalizeFieldValue(value.Value);
  }
  if (value && typeof value === 'object' && value.Compute) {
    return null;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }
  return value === undefined ? null : value;
}

function maxBaseDamage(root) {
  let max = null;
  visit(root, (value, key) => {
    if (key !== 'BaseDamage' || !value || typeof value !== 'object') return;
    const sum = Object.values(value)
      .filter((item) => typeof item === 'number' && Number.isFinite(item))
      .reduce((total, item) => total + item, 0);
    if (sum > 0) {
      max = max === null ? sum : Math.max(max, sum);
    }
  });
  return max;
}

function maxAttackAssetDamage(attackId, assets, resolvedAssets) {
  if (typeof attackId !== 'string' || attackId.trim() === '') return null;
  return maxReferencedAssetDamage(attackId, assets, resolvedAssets, new Set(), 0);
}

function maxReferencedAssetDamage(id, assets, resolvedAssets, seen, depth) {
  if (depth > 12 || seen.has(id)) return null;
  seen.add(id);

  const asset = resolveAsset(id, assets, resolvedAssets, new Set());
  if (!asset) return null;
  let max = maxAssetDamage(asset);
  for (const childId of referencedAssetIds(asset, assets)) {
    const childMax = maxReferencedAssetDamage(childId, assets, resolvedAssets, seen, depth + 1);
    if (typeof childMax === 'number') {
      max = max === null ? childMax : Math.max(max, childMax);
    }
  }
  return max;
}

function maxAssetDamage(root) {
  let max = maxBaseDamage(root);
  visit(root, (value, key) => {
    if (key !== 'Damage' || typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return;
    max = max === null ? value : Math.max(max, value);
  });
  return max;
}

function referencedAssetIds(root, assets) {
  const ids = new Set();
  visit(root, (value, key) => {
    if (typeof value !== 'string' || value.trim() === '') return;
    if (key === 'Parent') return;
    if (assets.has(value)) {
      ids.add(value);
    }
  });
  return Array.from(ids);
}

function visit(value, visitor, key = '') {
  visitor(value, key);
  if (Array.isArray(value)) {
    for (const item of value) visit(item, visitor);
  } else if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      visit(childValue, visitor, childKey);
    }
  }
}

function findIcon(aliases, iconFiles) {
  for (const alias of aliases) {
    const exact = iconFiles.get(normalizeId(alias));
    if (exact) return exact.webPath;
  }
  for (const alias of aliases) {
    const normalized = normalizeId(alias);
    if (!normalized) continue;
    for (const [iconKey, icon] of iconFiles) {
      if (iconKey.startsWith(`${normalized}_`)) return icon.webPath;
    }
  }
  return null;
}

function displayLabel(id, fields, labels) {
  for (const key of [id, fields.Appearance, fields.MemoriesNameOverride]) {
    if (typeof key === 'string' && labels.has(key)) {
      return labels.get(key);
    }
  }
  if (typeof fields.NameTranslationKey === 'string') {
    const match = fields.NameTranslationKey.match(/(?:server\.)?npcRoles\.([^.]+)\.name/);
    if (match) return prettify(match[1]);
  }
  return prettify(id);
}

function stripRuntimeSuffix(value) {
  if (typeof value !== 'string') return null;
  return value
    .replace(/_(Wander|Patrol)$/i, '')
    .replace(/_(Fighter|Archer|Scout|Soldier)$/i, '_$1');
}

function normalizeId(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function prettify(value) {
  return String(value ?? 'NPC').replace(/_/g, ' ');
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function booleanOrNull(value) {
  return typeof value === 'boolean' ? value : null;
}

function compactObject(object) {
  const result = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function unique(values) {
  return Array.from(new Set(values));
}

function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepMerge(base, override) {
  const result = deepClone(base);
  for (const [key, value] of Object.entries(override ?? {})) {
    if (isPlainObject(result[key]) && isPlainObject(value)) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = deepClone(value);
    }
  }
  return result;
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function walkFiles(root, extension) {
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) {
        files.push(fullPath);
      }
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function slash(value) {
  return value.replace(/\\/g, '/');
}

main();
