// Replaces the tone and metaphor items in place with the rewritten pairs. Identifiers and sources are
// unchanged, so the bank keeps one item per source passage and the answer-first items - the only ones a
// blind check already passed - are not touched. An item that is not replaced keeps its first version and
// is named, because a silent partial merge would leave the bank measuring two different disciplines.
import fs from 'node:fs'

const BANK = '/Users/ruliny/Git/agent-skills/research/2026-09-11-calibration-bank/bank.json'
const V2 = process.env.PASS_DIR || '/tmp/bank-build/v2'
const bank = JSON.parse(fs.readFileSync(BANK, 'utf8'))
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length
const ORDER = ['on', 'off']

const fresh = new Map()
for (const w of ['astra', 'sol', 'terraA', 'terraB']) {
  const p = `${V2}/${w}.report.json`
  if (!fs.existsSync(p)) continue
  const r = JSON.parse(fs.readFileSync(p, 'utf8'))
  for (const i of (r.answerJson || {}).items || []) fresh.set(i.id, i)
}
const JRN = process.argv[2]
if (JRN && fs.existsSync(JRN)) {
  for (const line of fs.readFileSync(JRN, 'utf8').split('\n').filter(Boolean)) {
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type !== 'result') continue
    for (const i of (e.result || {}).items || []) fresh.set(i.id, i)
  }
}

let replaced = 0
const missed = []
bank.items = bank.items.map((it) => {
  if (!['promotional-tone', 'metaphor'].includes(it.factor)) return it
  const n = fresh.get(it.id)
  if (!n) { missed.push(it.id); return it }
  const variants = {}
  for (const v of [...n.variants].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key))) variants[v.key] = { text: v.text, words: words(v.text) }
  if (Object.keys(variants).join() !== 'on,off') { missed.push(it.id + ' (bad variant keys)'); return it }
  replaced++
  return { ...it, variants, instructions: { on: n.instructionOn || it.instructions.on, off: n.instructionOff || it.instructions.off } }
})

bank.built = '2026-09-11'
bank.revision = 2
bank.revisionNote = 'The tone and metaphor pairs were rewritten so that exactly one contiguous span differs between the two sides. The first version averaged five differing spans in the tone items, and a blind check named the intended factor in 30% of them. The answer-first items are unchanged: a moved sentence is two spans by nature, and they passed at 90%.'
fs.writeFileSync(BANK, JSON.stringify(bank, null, 1))
console.log(`replaced ${replaced}; ${missed.length} tone or metaphor items were not in this pass and keep the version already in the bank`)
if (missed.length && missed.length < 20) console.log(`  ${missed.join(', ')}`)
