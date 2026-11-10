import { randomUUID } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseDocument } from 'yaml'

export const SKU_PREFIX = '3DNAU'
const PRODUCT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SKU = new RegExp(`^${SKU_PREFIX}-\\d{4,}$`)
const LANGUAGE = /\.[a-z]{2}(?:-[a-z]{2})?\.md$/i

function files (directory) {
  try {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return files(path)
      return entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('_') ? [path] : []
    }).sort()
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

function pageKey (root, type, filename) {
  return relative(join(root, 'content', type), filename).replace(LANGUAGE, '')
}

function readPage (filename) {
  const text = readFileSync(filename, 'utf8')
  const opening = text.match(/^---\r?\n/)
  if (!opening) throw new Error(`${filename}: missing_front_matter`)
  const closing = /\r?\n---(?=\r?\n|$)/.exec(text.slice(opening[0].length))
  if (!closing) throw new Error(`${filename}: missing_front_matter_end`)
  const document = parseDocument(text.slice(opening[0].length, opening[0].length + closing.index), { uniqueKeys: true })
  if (document.errors.length) throw new Error(`${filename}: invalid_front_matter`)
  const values = document.toJS()
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error(`${filename}: front_matter_mapping_required`)
  return { filename, text, values, closeIndex: opening[0].length + closing.index }
}

function groupedPages (root, type) {
  const groups = new Map()
  for (const filename of files(resolve(root, 'content', type))) {
    const key = pageKey(root, type, filename)
    groups.set(key, [...(groups.get(key) || []), readPage(filename)])
  }
  return groups
}

function sharedValue (records, key, defaultValue) {
  const present = records.map(record => record.values[key]).filter(value => value !== undefined)
  if (present.some(value => JSON.stringify(value) !== JSON.stringify(present[0]))) throw new Error(`${records[0].filename}: translated_${key}_mismatch`)
  return present.length ? present[0] : defaultValue
}

function writeFields (record, fields) {
  const additions = Object.entries(fields).filter(([key]) => record.values[key] === undefined)
  if (!additions.length) return false
  const yaml = additions.map(([key, value]) => `${key}: ${typeof value === 'string' ? value : String(value)}`).join('\n')
  writeFileSync(record.filename, `${record.text.slice(0, record.closeIndex)}\n${yaml}${record.text.slice(record.closeIndex)}`)
  return true
}

function validateGroups (products) {
  const ids = new Map()
  const skus = new Map()
  for (const [key, records] of products) {
    const id = sharedValue(records, 'commerce_id')
    const sku = sharedValue(records, 'sku')
    const active = sharedValue(records, 'commerce_active')
    const quote = sharedValue(records, 'commerce_quote', false)
    if (!PRODUCT_ID.test(id || '')) throw new Error(`${records[0].filename}: commerce_id_required`)
    if (!SKU.test(sku || '')) throw new Error(`${records[0].filename}: ${SKU_PREFIX}_sku_required`)
    if (typeof active !== 'boolean') throw new Error(`${records[0].filename}: commerce_active_boolean_required`)
    if (typeof quote !== 'boolean') throw new Error(`${records[0].filename}: commerce_quote_boolean_required`)
    const idKey = id.toLowerCase()
    if (ids.has(idKey) && ids.get(idKey) !== key) throw new Error(`${records[0].filename}: duplicate_commerce_id`)
    if (skus.has(sku) && skus.get(sku) !== key) throw new Error(`${records[0].filename}: duplicate_sku`)
    ids.set(idKey, key)
    skus.set(sku, key)
  }
}

function readRegistry (root) {
  const registry = JSON.parse(readFileSync(join(root, 'scripts/commerce-identities.json'), 'utf8'))
  if (registry.schemaVersion !== 1 || !Number.isSafeInteger(registry.nextSku) || registry.nextSku < 1 || !Array.isArray(registry.entries)) throw new Error('invalid_identity_registry')
  const keys = new Set()
  const ids = new Set()
  const skus = new Set()
  for (const entry of registry.entries) {
    const number = Number(entry.sku?.slice(SKU_PREFIX.length + 1))
    if (typeof entry.key !== 'string' || !entry.key || !PRODUCT_ID.test(entry.commerce_id || '') || !SKU.test(entry.sku || '') || typeof entry.retired !== 'boolean' || !Number.isSafeInteger(number) || number < 1 || number >= registry.nextSku) throw new Error('invalid_identity_registry_entry')
    if (keys.has(entry.key) || ids.has(entry.commerce_id.toLowerCase()) || skus.has(entry.sku)) throw new Error('duplicate_identity_registry_entry')
    keys.add(entry.key)
    ids.add(entry.commerce_id.toLowerCase())
    skus.add(entry.sku)
  }
  return registry
}

function validateOwnership (products, registry) {
  validateGroups(products)
  // ponytail: O(n²) ownership scan; index the registry if large catalogues need it.
  for (const [key, records] of products) {
    const entry = registry.entries.find(entry => entry.key === key)
    if (!entry || entry.retired || entry.commerce_id !== sharedValue(records, 'commerce_id') || entry.sku !== sharedValue(records, 'sku')) throw new Error(`${key}: identity_ownership_mismatch_or_retired`)
  }
  if (registry.entries.some(entry => !entry.retired && !products.has(entry.key))) throw new Error('identity_retirement_required_run_assign')
}

export function countCommerceContent (root = process.cwd()) {
  return {
    products: groupedPages(root, 'product').size,
    categories: groupedPages(root, 'category').size
  }
}

export function validateCommerceContent (root = process.cwd()) {
  const products = groupedPages(root, 'product')
  validateOwnership(products, readRegistry(root))
  return { products: products.size, categories: groupedPages(root, 'category').size }
}

export function assignCommerceIdentifiers ({ root = process.cwd(), apply = false, active = false } = {}) {
  const products = groupedPages(root, 'product')
  const registry = readRegistry(root)
  const planned = new Map()
  const writes = []
  let updated = 0
  for (const [key, records] of products) {
    let entry = registry.entries.find(entry => entry.key === key)
    if (entry?.retired) throw new Error(`${key}: retired_identity`)
    if (!entry) {
      const sku = sharedValue(records, 'sku') || `${SKU_PREFIX}-${String(registry.nextSku).padStart(4, '0')}`
      const number = Number(sku.slice(SKU_PREFIX.length + 1))
      if (!SKU.test(sku) || !Number.isSafeInteger(number) || number < registry.nextSku) throw new Error(`${key}: sku_below_high_watermark`)
      entry = { key, commerce_id: sharedValue(records, 'commerce_id') || randomUUID(), sku, retired: false }
      registry.entries.push(entry)
      registry.nextSku = number + 1
      if (!Number.isSafeInteger(registry.nextSku)) throw new Error('sku_exhausted')
    }
    const fields = {
      commerce_id: sharedValue(records, 'commerce_id', entry.commerce_id),
      sku: sharedValue(records, 'sku', entry.sku),
      commerce_active: sharedValue(records, 'commerce_active', active)
    }
    planned.set(key, records.map(record => ({ ...record, values: { ...fields, ...record.values } })))
    for (const record of records) {
      const missing = Object.fromEntries(Object.entries(fields).filter(([key]) => record.values[key] === undefined))
      if (Object.keys(missing).length) writes.push({ record, missing })
    }
  }
  for (const entry of registry.entries) if (!products.has(entry.key)) entry.retired = true
  validateOwnership(planned, registry)
  const ids = registry.entries.map(entry => entry.commerce_id.toLowerCase())
  const skus = registry.entries.map(entry => entry.sku)
  if (new Set(ids).size !== ids.length || new Set(skus).size !== skus.length) throw new Error('duplicate_identity_registry_entry')
  if (apply) {
    // Reserve identities before content writes; rerunning assign recovers interrupted additions.
    writeFileSync(join(root, 'scripts/commerce-identities.json'), `${JSON.stringify(registry, null, 2)}\n`)
    for (const { record, missing } of writes) if (writeFields(record, missing)) updated++
  }
  return { updated, ...countCommerceContent(root) }
}

function main () {
  const [command = 'validate', ...args] = process.argv.slice(2)
  const apply = args.includes('--apply')
  const active = args.includes('--active')
  const root = process.cwd()
  if (command === 'count') {
    process.stdout.write(`${JSON.stringify(countCommerceContent(root))}\n`)
  } else if (command === 'assign') {
    const result = assignCommerceIdentifiers({ root, apply, active })
    process.stdout.write(`${JSON.stringify({ mode: apply ? 'applied' : 'dry-run', ...result })}\n`)
  } else if (command === 'validate') {
    process.stdout.write(`${JSON.stringify(validateCommerceContent(root))}\n`)
  } else {
    process.stderr.write('Usage: node scripts/commerce-products.js [count|assign [--apply] [--active]|validate]\n')
    process.exitCode = 2
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
