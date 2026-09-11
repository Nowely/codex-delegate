import fs from 'node:fs'
const R = '/Users/ruliny/Git/agent-skills/research/2026-09-10-chain/chain/'
const REL = 'research/2026-09-10-chain/chain/'
function sec(f, head) {
  const L = fs.readFileSync(R + f, 'utf8').split('\n')
  const s = L.findIndex((l) => l === '## ' + head)
  if (s < 0) throw new Error('no section ' + head + ' in ' + f)
  let e = s + 1; while (e < L.length && !/^## /.test(L[e])) e++
  return { text: L.slice(s + 1, e).join('\n').trim(), from: s + 1, to: e }
}
const PAIRS = [
  ['Rights, per call', 'Rights, per call'],
  ['Trust and verification', 'How to check the work'],
  ['Why not the official plugin', 'Why this driver'],
  ['The run’s lifetime', 'Stop or continue a run'],
  ['Limitations', 'Checks and compatibility'],
  ['Layout', 'Files and references'],
  ['After a codex upgrade', 'After a codex upgrade'],
]
const w = (s) => s.split(/\s+/).filter(Boolean).length
const items = []
PAIRS.forEach(([ha, hb], n) => {
  let a, b
  try { a = sec('00-original.md', ha) } catch { a = sec('00-original.md', ha.replace('’', "'")) }
  b = sec('03-prerequisite-pass.md', hb)
  items.push({
    id: `whole-${n + 1}`, type: 'whole-text', factor: '',
    source: `${REL}00-original.md:${a.from}-${a.to}`,
    rewriteOf: `${REL}03-prerequisite-pass.md:${b.from}-${b.to}`,
    engine: 'none-extracted', code: '',
    instructions: { before: 'the section as it stood on 2026-09-10', after: 'the same section after the audit-and-revise chain ran on it' },
    variants: { before: { text: a.text, words: w(a.text) }, after: { text: b.text, words: w(b.text) } },
  })
  console.log(`whole-${n + 1}  ${String(w(a.text)).padStart(3)}w -> ${String(w(b.text)).padStart(3)}w   ${ha}  ->  ${hb}`)
})
fs.writeFileSync('/tmp/bank-build/whole-text.json', JSON.stringify(items, null, 1))
