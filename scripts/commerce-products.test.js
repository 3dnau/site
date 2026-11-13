import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assignCommerceIdentifiers, countCommerceContent, validateCommerceContent } from './commerce-products.js'

function fixture () {
  const root = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'commerce-content-'))
  mkdirSync(join(root, 'content/product'), { recursive: true })
  mkdirSync(join(root, 'content/category'), { recursive: true })
  mkdirSync(join(root, 'scripts'), { recursive: true })
  writeFileSync(join(root, 'scripts/commerce-identities.json'), JSON.stringify({ schemaVersion: 1, nextSku: 1, entries: [] }))
  writeFileSync(join(root, 'content/product/item.es.md'), '---\ntitle: Producto\nprice: 10.50\n---\nContenido\n')
  writeFileSync(join(root, 'content/product/item.en.md'), '---\ntitle: Product\nprice: 10.50\n---\nContent\n')
  writeFileSync(join(root, 'content/category/biology.es.md'), '---\ntitle: Biología\n---\n')
  writeFileSync(join(root, 'content/category/_index.es.md'), '---\ntitle: Categorías\n---\n')
  return root
}

test('assigns one stable ID and namespaced SKU to each translated product, fail-closed by default', () => {
  const root = fixture()
  try {
    assert.deepEqual(assignCommerceIdentifiers({ root, apply: true }), { updated: 2, products: 1, categories: 1 })
    const spanish = readFileSync(join(root, 'content/product/item.es.md'), 'utf8')
    const english = readFileSync(join(root, 'content/product/item.en.md'), 'utf8')
    const id = spanish.match(/^commerce_id: (.+)$/m)?.[1]
    const sku = spanish.match(/^sku: (.+)$/m)?.[1]
    assert.match(id, /^[0-9a-f-]{36}$/i)
    assert.equal(sku, '3DNAU-0001')
    assert.equal(english.match(/^commerce_id: (.+)$/m)?.[1], id)
    assert.equal(english.match(/^sku: (.+)$/m)?.[1], sku)
    assert.match(spanish, /^commerce_active: false$/m)
    assert.deepEqual(validateCommerceContent(root), { products: 1, categories: 1 })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('validation rejects duplicate commercial identities across entries', () => {
  const root = fixture()
  try {
    assignCommerceIdentifiers({ root, apply: true, active: true })
    const source = readFileSync(join(root, 'content/product/item.es.md'), 'utf8')
    writeFileSync(join(root, 'content/product/second.es.md'), source)
    assert.throws(() => validateCommerceContent(root), /duplicate_commerce_id|duplicate_sku/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('counts content entries, excluding collection indexes', () => {
  const root = fixture()
  try {
    assert.deepEqual(countCommerceContent(root), { products: 1, categories: 1 })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('retains survivors and tombstones after cloning, allocates above high-watermark and rejects reuse', () => {
  const root = fixture()
  try {
    assignCommerceIdentifiers({ root, apply: true })
    const registryPath = join(root, 'scripts/commerce-identities.json')
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
    const survivor = readFileSync(join(root, 'content/product/item.es.md'), 'utf8')
    const tombstone = { key: 'deleted', commerce_id: '0b438fc3-1f8a-4ac9-aeed-3bc7b198e76b', sku: '3DNAU-0025', retired: true }
    const secondTombstone = { key: 'deleted-vegetal', commerce_id: '538ca008-5dc8-4183-b549-9f3914ba6ce9', sku: '3DNAU-0026', retired: true }
    registry.entries.push(tombstone, secondTombstone)
    registry.nextSku = 58
    writeFileSync(registryPath, JSON.stringify(registry))
    const newPath = join(root, 'content/product/new.es.md')
    const blank = '---\ntitle: New product\n---\n'
    writeFileSync(newPath, blank)
    assignCommerceIdentifiers({ root, apply: false })
    assert.equal(readFileSync(newPath, 'utf8'), blank)
    assert.equal(JSON.parse(readFileSync(registryPath, 'utf8')).nextSku, 58)
    assignCommerceIdentifiers({ root, apply: true })
    assert.equal(readFileSync(join(root, 'content/product/item.es.md'), 'utf8'), survivor)
    const added = readFileSync(newPath, 'utf8')
    assert.match(added, /^sku: 3DNAU-0058$/m)
    assert.match(added, /^commerce_id: [0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/m)
    assert.deepEqual(validateCommerceContent(root), { products: 2, categories: 1 })
    assignCommerceIdentifiers({ root, apply: true })
    assert.equal(readFileSync(newPath, 'utf8'), added)
    for (const retired of [tombstone, secondTombstone]) {
      for (const field of ['commerce_id', 'sku']) {
        writeFileSync(newPath, added.replace(new RegExp(`^${field}: .+$`, 'm'), `${field}: ${retired[field]}`))
        assert.throws(() => validateCommerceContent(root), /identity_ownership_mismatch_or_retired/)
        assert.throws(() => assignCommerceIdentifiers({ root, apply: true }), /identity_ownership_mismatch_or_retired/)
      }
    }
    writeFileSync(newPath, added)
    const changedSku = added.replace('sku: 3DNAU-0058', 'sku: 3DNAU-0001')
    writeFileSync(newPath, changedSku)
    assert.throws(() => validateCommerceContent(root), /duplicate_sku/)
    assert.throws(() => assignCommerceIdentifiers({ root, apply: true }), /duplicate_sku/)
    const before = readFileSync(registryPath, 'utf8')
    writeFileSync(newPath, blank)
    const latePath = join(root, 'content/product/zzz.es.md')
    writeFileSync(latePath, '---\ntitle: Invalid\ncommerce_id: invalid\n---\n')
    assert.throws(() => assignCommerceIdentifiers({ root, apply: true }), /commerce_id_required/)
    assert.equal(readFileSync(newPath, 'utf8'), blank)
    assert.equal(readFileSync(registryPath, 'utf8'), before)
    rmSync(latePath)
    // Existing reservation recovers an interrupted content write without a new identity.
    assignCommerceIdentifiers({ root, apply: true })
    assert.equal(readFileSync(newPath, 'utf8'), added)
    rmSync(newPath)
    assert.throws(() => validateCommerceContent(root), /identity_retirement_required/)
    assignCommerceIdentifiers({ root, apply: true })
    assert.deepEqual(validateCommerceContent(root), { products: 1, categories: 1 })
    writeFileSync(newPath, added)
    assert.throws(() => assignCommerceIdentifiers({ root, apply: true }), /retired_identity/)
    assert.throws(() => validateCommerceContent(root), /identity_ownership_mismatch_or_retired/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
