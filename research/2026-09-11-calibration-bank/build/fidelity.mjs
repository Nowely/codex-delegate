// An engine can return a well-formed item whose source line numbers point nowhere near its text.
// Nothing in the schema catches that, so overlap of content words is measured here.
import fs from 'node:fs'
const ROOT = '/Users/ruliny/Git/agent-skills/'
const bank = JSON.parse(fs.readFileSync('/tmp/bank-build/bank.json', 'utf8'))
const STOP = new Set('the a an and or of to in is are it its that this for with on at by as be not from was were has have had he she they you we i do does did can may will would should must if then when where which who what how'.split(' '))
const bag = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)))
const rows = []
for (const it of bank.items) {
  const m = /^(.*):(\d+)-(\d+)$/.exec(it.source)
  if (!m) continue
  const L = fs.readFileSync(ROOT + m[1], 'utf8').split('\n')
  const src = bag(L.slice(+m[2] - 1, +m[3]).join(' '))
  const txt = bag(Object.values(it.variants).map((v) => v.text).join(' '))
  const shared = [...txt].filter((w) => src.has(w)).length
  rows.push({ id: it.id, r: txt.size ? shared / txt.size : 0, n: src.size })
}
rows.sort((a, b) => a.r - b.r)
const bad = rows.filter((x) => x.r < 0.25)
console.log(`${rows.length} items checked; median content-word overlap with the cited lines ${(rows[Math.floor(rows.length / 2)].r).toFixed(2)}`)
console.log(`below 0.25: ${bad.length}`)
bad.forEach((x) => console.log(`  ${x.id}  ${x.r.toFixed(2)} (source had ${x.n} content words)`))
