// Collects what the ten writers returned into one bank file. Codex seats answer through a report;
// Claude agents answer through the workflow journal. Neither is trusted about word counts.
import fs from 'node:fs'
import path from 'node:path'

const OUT = '/tmp/bank-build'
const ENGINE = { astra: 'gpt-6-astra', sol: 'gpt-5.6-sol', terraA: 'gpt-5.6-terra', terraB: 'gpt-5.6-terra',
  opusA: 'claude-opus-5', opusB: 'claude-opus-5', sonA: 'claude-sonnet-5', sonB: 'claude-sonnet-5',
  sonC: 'claude-sonnet-5', sonD: 'claude-sonnet-5' }

const words = (s) => s.trim().split(/\s+/).filter(Boolean).length
const collected = []
const report = []

for (const w of ['astra', 'sol', 'terraA', 'terraB']) {
  const p = `${OUT}/${w}.report.json`
  if (!fs.existsSync(p)) { report.push(`${w}: no report`); continue }
  const r = JSON.parse(fs.readFileSync(p, 'utf8'))
  const items = (r.answerJson || {}).items || []
  report.push(`${w}: exit ${r.exitCode}, ${items.length} items`)
  collected.push(...items.map((i) => ({ ...i, _w: w })))
}

// The workflow journal records each agent's return value, but only its start line carries the label.
const JRN = process.argv[2]
if (JRN && fs.existsSync(JRN)) {
  const label = new Map()
  for (const line of fs.readFileSync(JRN, 'utf8').split('\n').filter(Boolean)) {
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'started') label.set(e.agentId, String(e.label || '').replace(/^write:/, ''))
    if (e.type !== 'result') continue
    const id = label.get(e.agentId)
    const items = e.result && Array.isArray(e.result.items) ? e.result.items : []
    if (!ENGINE[id]) { report.push(`unmapped agent ${e.agentId}`); continue }
    report.push(`${id}: ${items.length} items`)
    collected.push(...items.map((i) => ({ ...i, _w: id })))
  }
}

// Array-of-variants was the shape a strict schema could hold for both item types; the session tool
// reads an object keyed by variant, so it is converted here rather than in ten different places.
// session.mjs picks the two sides by INSERTION ORDER — Object.keys(variants)[0] and [1] — and balances
// left against right on that position. Engines returned the pair in whichever order they liked, so a
// canonical order is imposed here; without it the exact side balance is computed over the wrong thing.
const ORDER = ['on', 'off', 'keep', 'rewrite', 'delete']
const items = collected.map((i) => {
  const variants = {}
  for (const v of [...i.variants].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key))) variants[v.key] = { text: v.text, words: words(v.text) }
  const out = { id: i.id, type: i.type, source: i.source, engine: ENGINE[i._w] || i._w, variants }
  if (i.type === 'single-factor') { out.factor = i.factor; out.instructions = { on: i.instructionOn, off: i.instructionOff } }
  if (i.type === 'code-comment' && i.code) out.code = i.code
  return out
})

items.push(...JSON.parse(fs.readFileSync(`${OUT}/whole-text.json`, 'utf8')).map((i) => {
  const { rewriteOf, ...rest } = i
  return { ...rest, rewriteOf }
}))

// Repeats are a diagnostic of the person's own consistency, spread across factors rather than drawn
// from whichever block sorts first. The bank NOMINATES more candidates than it needs and the session
// order picks from them: which items fall late enough to have no room for a copy is not knowable here,
// and flagging exactly five left two of them unplaceable.
const F = ['promotional-tone', 'metaphor', 'answer-first']
const WANT = 5
const picked = new Set()
for (const f of F) {
  const c = items.filter((i) => i.factor === f)
  for (const n of [0, 1, 2, 3].map((k) => Math.floor((k + 0.5) * c.length / 4))) if (c[n]) picked.add(c[n].id)
}
for (const id of picked) items.find((i) => i.id === id).repeat = true

const bank = {
  bank: 'terse-calibration-1',
  built: '2026-09-11',
  repeats: WANT,
  frame: 'English project documentation in Nowely/agent-skills. Discovery sources are plugins/codex-delegate and research/2026-09-10-chain/chain; plugins/terse and research/2026-09-11-terse-survey are held out, pinned at commit d66a2ef.',
  engines: [...new Set(items.map((i) => i.engine))],
  items,
}
fs.writeFileSync(`${OUT}/bank.json`, JSON.stringify(bank, null, 1))
console.log(report.join('\n'))
console.log(`\n${items.length} items -> ${OUT}/bank.json   (${picked.size} nominated, ${WANT} to be placed)`)
