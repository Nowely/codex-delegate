// Splits the bank's single-factor pairs into batches for a blind manipulation check. The checker sees
// two texts and nothing else: no factor name, no instruction, no variant key, and the sides shuffled
// by a seeded permutation so the intended "on" side is not always A.
import fs from 'node:fs'

const bank = JSON.parse(fs.readFileSync('/tmp/bank-build/bank.json', 'utf8'))
const single = bank.items.filter((i) => i.type === 'single-factor')
const DIR = '/tmp/bank-build/check'
fs.rmSync(DIR, { recursive: true, force: true })
fs.mkdirSync(DIR, { recursive: true })

let s = 20260911
const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)

// The item id names the factor — astra-tone-1, opusB-metaphor-4 — so it cannot travel with the pair.
// The checker gets an opaque token and the mapping stays here.
const key = []
const shown = single.map((it, n) => {
  const flip = rand() < 0.5
  const token = 'p' + String(n + 1).padStart(3, '0')
  key.push({ token, id: it.id, factor: it.factor, engine: it.engine, aIs: flip ? 'off' : 'on' })
  return { pair: token, a: flip ? it.variants.off.text : it.variants.on.text, b: flip ? it.variants.on.text : it.variants.off.text }
})

const N = 10
const batches = Array.from({ length: N }, () => [])
shown.forEach((x, i) => batches[i % N].push(x))
batches.forEach((b, i) => fs.writeFileSync(`${DIR}/batch-${i + 1}.json`, JSON.stringify(b, null, 1)))
fs.writeFileSync(`${DIR}/key.json`, JSON.stringify(key, null, 1))

// A batch that carried a factor name would answer the question it was sent to ask. The patterns are the
// ones that can only be labels: a bare "instruction" or "--answer-json" is the documentation's own prose
// and appears in the passages, so matching those cried wolf on every run.
const LABEL = /"factor"|"instruction|promotional-tone|-tone-\d|-metaphor-\d|-answer-\d|"key"\s*:\s*"(on|off)"/
const leak = fs.readdirSync(DIR).filter((f) => f.startsWith('batch')).filter((f) => LABEL.test(fs.readFileSync(`${DIR}/${f}`, 'utf8')))
console.log(`${single.length} pairs -> ${N} batches of ~${batches[0].length}`)
console.log(leak.length ? `LEAK in ${leak.join(', ')}` : 'no factor name, instruction or variant key appears in any batch')
