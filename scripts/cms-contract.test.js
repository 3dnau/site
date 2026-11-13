// Run from the project root after `sh do build`: CMS contract specific to 3DNAU.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { parse } from 'yaml'

const configPath = fs.readdirSync('public/admin').find(name => /^config\..*\.yml$/.test(name))
// Generated engine YAML intentionally reuses many trusted local anchors.
const config = parse(fs.readFileSync(path.join('public/admin', configPath), 'utf8'), { maxAliasCount: -1 })

function fieldsNamed (name) {
  const fields = []
  const visit = value => {
    if (!value || typeof value !== 'object') return
    if (value.name === name) fields.push(value)
    for (const child of Object.values(value)) visit(child)
  }
  visit(config)
  return fields
}

test('CMS writes to 3dnau/site main without triggering CI on each save', () => {
  assert.equal(config.backend.repo, '3dnau/site')
  assert.equal(config.backend.branch, 'main')
  assert.equal(config.backend.skip_ci, true)
  assert.equal(config.site_url, 'https://3dnau.com/')
})

test('commerce fields are editable and optional in the CMS', () => {
  for (const name of ['commerce_id', 'sku', 'commerce_active', 'commerce_quote']) {
    const fields = fieldsNamed(name)
    assert.ok(fields.length > 0, name)
    for (const field of fields) assert.equal(field.required, false, name)
  }
})
