import fs from 'node:fs'
const ROOT = '/Users/ruliny/Git/agent-skills/'
const prose = [
  'plugins/codex-delegate/CHANGELOG.md','plugins/codex-delegate/README.md','plugins/codex-delegate/RELEASING.md',
  'plugins/codex-delegate/evals/README.md','plugins/codex-delegate/skills/orchestrate/SKILL.md',
  'plugins/codex-delegate/skills/seat/SKILL.md','plugins/codex-delegate/skills/cleanup/SKILL.md',
  'plugins/codex-delegate/skills/seat/references/environment-and-internals.md',
  'plugins/codex-delegate/skills/seat/references/incidents.md','plugins/codex-delegate/skills/seat/references/parity.md',
  'plugins/codex-delegate/skills/seat/references/why-not-the-plugin.md',
  'plugins/codex-delegate/skills/seat/references/result-gates.md',
  'plugins/codex-delegate/skills/seat/references/adversarial-review.md',
  'research/2026-09-10-chain/chain/cut-ledger.md','research/2026-09-10-chain/chain/audit.md',
  'research/2026-09-10-chain/chain/README.md','research/2026-09-10-chain/chain/invisible-prerequisites.md',
]
const code = ['plugins/codex-delegate/skills/seat/scripts/driver.mjs','plugins/codex-delegate/skills/seat/scripts/cleanup.mjs',
  'plugins/codex-delegate/skills/seat/scripts/attach-pasted.mjs','plugins/codex-delegate/evals/fake-app-server.mjs',
  'plugins/codex-delegate/evals/lock.test.mjs','plugins/codex-delegate/evals/fidelity.test.mjs']

// 120 single-factor items = 5 engines x 24 = 5 engines x 8 per factor. Weight = share of the 120.
const W = [
  {id:'astra',  engine:'gpt-6-astra',   per:8, w:4, cc:3},
  {id:'sol',    engine:'gpt-5.6-sol',   per:8, w:4, cc:3},
  {id:'terraA', engine:'gpt-5.6-terra', per:4, w:2, cc:2},
  {id:'terraB', engine:'gpt-5.6-terra', per:4, w:2, cc:1},
  {id:'opusA',  engine:'claude-opus-5', per:4, w:2, cc:2},
  {id:'opusB',  engine:'claude-opus-5', per:4, w:2, cc:1},
  {id:'sonA',   engine:'claude-sonnet-5', per:2, w:1, cc:0},
  {id:'sonB',   engine:'claude-sonnet-5', per:2, w:1, cc:0},
  {id:'sonC',   engine:'claude-sonnet-5', per:2, w:1, cc:0},
  {id:'sonD',   engine:'claude-sonnet-5', per:2, w:1, cc:0},
]
const slots = W.flatMap(x => Array(x.w).fill(x.id))
const out = Object.fromEntries(W.map(x => [x.id, {prose:[], code:[]}]))
let k = 0
for (const f of prose) {
  const n = fs.readFileSync(ROOT + f, 'utf8').split('\n').length
  for (let s = 1; s <= n; s += 40) out[slots[k++ % slots.length]].prose.push(`${f}:${s}-${Math.min(s+39,n)}`)
}
const ccSlots = W.filter(x => x.cc).flatMap(x => Array(x.cc).fill(x.id))
let c = 0
for (const f of code) {
  const n = fs.readFileSync(ROOT + f, 'utf8').split('\n').length
  for (let s = 1; s <= n; s += 200) { if (c < ccSlots.length) out[ccSlots[c++]].code.push(`${f}:${s}-${Math.min(s+199,n)}`) }
}
let tot = 0, perFactor = {}
for (const x of W) {
  const o = out[x.id]
  const ln = o.prose.reduce((a,r)=>{const[a1,b1]=r.split(':')[1].split('-');return a+(+b1-+a1+1)},0)
  tot += x.per*3
  perFactor[x.engine] = (perFactor[x.engine]||0) + x.per
  console.log(`${x.id.padEnd(7)} ${x.engine.padEnd(16)} ${x.per*3} items (${x.per}/factor) + ${x.cc} code  |  ${String(o.prose.length).padStart(2)} blocks, ${ln} lines`)
}
console.log('\nsingle-factor total', tot, '| per engine per factor:', perFactor)
const all = Object.values(out).flatMap(o=>[...o.prose,...o.code])
console.log('blocks', all.length, 'distinct', new Set(all).size, new Set(all).size===all.length?'DISJOINT':'OVERLAP')
fs.writeFileSync('/tmp/partition.json', JSON.stringify({workers:W, assignment:out}, null, 1))
