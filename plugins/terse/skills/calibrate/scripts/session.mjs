#!/usr/bin/env node
// Runs one calibration session over a local page. The side mapping never leaves this process:
// the browser is handed "left" and "right" and answers in those terms, so nothing in the page,
// its source or its devtools reveals which side carries which variant.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const args = new Map()
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1])

const BANK = args.get('bank')
const OUT = args.get('out')
const WHO = args.get('participant') || 'unnamed'
const SEED = Number(args.get('seed') || 1)
const PORT = Number(args.get('port') || 8788)

if (!BANK || !OUT) {
  console.error(`usage: session.mjs --bank <bank.json> --out <session.json> [--participant NAME] [--seed N] [--port N]

  --bank         the item bank; see references/item-bank.md
  --out          the session file, written after every answer and resumed from if it exists
  --participant  recorded in the session file; one file per person per bank
  --seed         the order is generated from this and recorded, so a session is reproducible`)
  process.exit(2)
}

const rng = (s) => () => {
  s |= 0; s = (s + 0x6D2B79F5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const shuffle = (xs, rand) => {
  const a = xs.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// --- the order, and the side balance that the arithmetic assumes ---------------------------------

const LATIN = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]

function buildOrder(bank, seed) {
  const rand = rng(seed)
  const byFactor = new Map()
  for (const item of bank.items) {
    const k = item.factor || item.type
    if (!byFactor.has(k)) byFactor.set(k, [])
    byFactor.get(k).push(item)
  }

  // Exact side balance within each factor: the first half of a shuffled factor puts the
  // on-variant left, the second half puts it right. Coin flips do not do this - with six
  // items they land one variant on the same side five times or more in 22% of banks.
  const trials = []
  for (const [factor, items] of byFactor) {
    const shuffled = shuffle(items, rand)
    shuffled.forEach((item, i) => {
      trials.push({ item, factor, onLeft: i < Math.ceil(shuffled.length / 2) })
    })
  }

  // Interleave factors through the six orders, so no factor sits entirely early or entirely late.
  const keys = [...byFactor.keys()]
  const queues = new Map(keys.map((k) => [k, trials.filter((t) => t.factor === k)]))
  const ordered = []
  let round = 0
  while (ordered.length < trials.length) {
    const seq = LATIN[round % LATIN.length]
    for (const idx of seq) {
      const k = keys[idx % keys.length]
      const q = queues.get(k)
      if (q && q.length) ordered.push(q.shift())
    }
    for (const k of keys) {
      const q = queues.get(k)
      if (q && q.length && !LATIN[round % LATIN.length].includes(keys.indexOf(k))) ordered.push(q.shift())
    }
    round++
  }

  // Repeats: same item, opposite side, never adjacent to the original.
  const repeats = ordered.filter((t) => t.item.repeat).slice(0, bank.repeats ?? 5)
  for (const r of repeats) {
    const first = ordered.indexOf(r)
    const at = Math.min(ordered.length, first + 8 + Math.floor(rand() * 6))
    ordered.splice(at, 0, { ...r, onLeft: !r.onLeft, isRepeatOf: first })
  }

  return ordered.map((t, i) => ({ ...t, trial: i }))
}

// --- state ---------------------------------------------------------------------------------------

const bank = JSON.parse(fs.readFileSync(BANK, 'utf8'))
const order = buildOrder(bank, SEED)

let session = { bank: bank.bank || path.basename(BANK), participant: WHO, seed: SEED, started: new Date().toISOString(), answers: [], breaks: [] }
if (fs.existsSync(OUT)) {
  session = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  if (session.seed !== SEED) {
    console.error(`the existing session used seed ${session.seed}; resuming with --seed ${session.seed}`)
    process.exit(2)
  }
  console.log(`resuming: ${session.answers.length} of ${order.length} answered`)
}

const save = () => fs.writeFileSync(OUT, JSON.stringify(session, null, 2))

const nextTrial = () => {
  const done = new Set(session.answers.map((a) => a.trial))
  return order.find((t) => !done.has(t.trial))
}

const sideText = (t, side) => {
  const v = t.item.variants
  if (t.item.type === 'code-comment') return null
  const onKey = Object.keys(v)[0]
  const offKey = Object.keys(v)[1]
  const left = t.onLeft ? onKey : offKey
  const right = t.onLeft ? offKey : onKey
  return v[side === 'left' ? left : right]
}

const present = (t) => {
  if (!t) return { done: true, answered: session.answers.length, total: order.length }
  if (t.item.type === 'code-comment') {
    const opts = shuffle(Object.entries(t.item.variants), rng(SEED + t.trial))
    presentedOptions.set(t.trial, opts.map(([k]) => k))
    return {
      done: false, trial: t.trial, kind: 'three', type: t.item.type,
      answered: session.answers.length, total: order.length,
      code: t.item.code || '', options: opts.map(([, v]) => (typeof v === 'string' ? v : v.text)),
    }
  }
  const l = sideText(t, 'left'), r = sideText(t, 'right')
  return {
    done: false, trial: t.trial, kind: 'pair', type: t.item.type,
    answered: session.answers.length, total: order.length,
    left: typeof l === 'string' ? l : l.text, right: typeof r === 'string' ? r : r.text,
  }
}
const presentedOptions = new Map()

// --- the page --------------------------------------------------------------------------------------

const PAGE = String.raw`<!doctype html><html lang="en"><meta charset="utf-8">
<title>calibration</title>
<style>
 :root{--fg:#1a1a1a;--dim:#6b6b6b;--line:#d8d8d8;--pick:#0b5fff;--bg:#fbfbfa}
 @media (prefers-color-scheme:dark){:root{--fg:#e8e8e8;--dim:#9a9a9a;--line:#3a3a3a;--pick:#6ea8ff;--bg:#161616}}
 *{box-sizing:border-box}
 body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
 header{display:flex;justify-content:space-between;align-items:center;padding:10px 20px;border-bottom:1px solid var(--line);font-size:13px;color:var(--dim)}
 main{max-width:1180px;margin:0 auto;padding:24px 20px 96px}
 .pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}
 .three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
 .opt{border:1px solid var(--line);border-radius:10px;padding:18px 20px;cursor:pointer;background:transparent;text-align:left;color:inherit;font:inherit}
 .opt:hover{border-color:var(--dim)}
 .opt.sel{border-color:var(--pick);box-shadow:0 0 0 1px var(--pick)}
 .opt .k{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--dim);margin-bottom:10px}
 .opt p{margin:0 0 .7em}.opt p:last-child{margin-bottom:0}
 .opt code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em;background:rgba(128,128,128,.14);padding:.1em .3em;border-radius:3px}
 pre{background:rgba(128,128,128,.1);padding:14px 16px;border-radius:8px;overflow-x:auto;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin:0 0 18px}
 .row{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;align-items:center}
 button.alt{border:1px solid var(--line);background:transparent;color:var(--dim);border-radius:8px;padding:7px 13px;cursor:pointer;font:inherit;font-size:13px}
 button.alt.sel{border-color:var(--pick);color:var(--pick)}
 label.flag{font-size:13px;color:var(--dim);display:flex;gap:6px;align-items:center;cursor:pointer}
 textarea{width:100%;margin-top:14px;min-height:64px;border:1px solid var(--line);border-radius:8px;padding:11px 13px;font:inherit;font-size:14px;background:transparent;color:inherit;resize:vertical}
 footer{position:fixed;bottom:0;left:0;right:0;background:var(--bg);border-top:1px solid var(--line);padding:12px 20px;display:flex;justify-content:space-between;align-items:center}
 .hint{font-size:12px;color:var(--dim)}
 .go{background:var(--pick);color:#fff;border:0;border-radius:8px;padding:9px 20px;font:inherit;cursor:pointer}
 .go[disabled]{opacity:.35;cursor:default}
 .done{text-align:center;padding:80px 20px;color:var(--dim)}
</style>
<header><span id="where"></span><span><button class="alt" id="pause">pause</button></span></header>
<main id="main"></main>
<footer><span class="hint">← left · → right · <kbd>t</kbd> equal · <kbd>u</kbd> can't judge · <kbd>c</kbd> comment · <kbd>enter</kbd> next</span><button class="go" id="go" disabled>next</button></footer>
<script>
const $ = (s) => document.querySelector(s)
let cur = null, choice = null, flags = {loserAlsoGood:false, bothWeak:false}, shown = 0
const md = (t) => t.split(/\n{2,}/).map(p =>
  '<p>' + p.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\x60(.+?)\x60/g,'<code>$1</code>')
    .replace(/\n/g,'<br>') + '</p>').join('')

function pick(v){ choice = v; render(); $('#go').disabled = false }

function render(){
  if (cur.done){ $('#main').innerHTML = '<div class="done"><p>Done — ' + cur.answered + ' answers recorded.</p><p>You can close this tab.</p></div>'; $('#where').textContent=''; $('footer').style.display='none'; return }
  $('#where').textContent = (cur.answered + 1) + ' of ' + cur.total
  const sel = (v) => choice === v ? ' sel' : ''
  let body = ''
  if (cur.kind === 'three'){
    body = '<pre>' + cur.code.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])) + '</pre><div class="three">' +
      cur.options.map((o,i) => '<button class="opt' + sel('o'+i) + '" onclick="pick(\'o'+i+'\')"><div class="k">option ' + (i+1) + '</div>' + md(o) + '</button>').join('') + '</div>'
  } else {
    body = '<div class="pair">' +
      '<button class="opt' + sel('left') + '" onclick="pick(\'left\')"><div class="k">left</div>' + md(cur.left) + '</button>' +
      '<button class="opt' + sel('right') + '" onclick="pick(\'right\')"><div class="k">right</div>' + md(cur.right) + '</button></div>'
  }
  body += '<div class="row">' +
    '<button class="alt' + sel('tie') + '" onclick="pick(\'tie\')">genuinely equal</button>' +
    '<button class="alt' + sel('unjudgeable') + '" onclick="pick(\'unjudgeable\')">can\'t judge / both unacceptable</button>' +
    '<label class="flag"><input type="checkbox" id="f1"' + (flags.loserAlsoGood?' checked':'') + '> the other one was also good</label>' +
    '<label class="flag"><input type="checkbox" id="f2"' + (flags.bothWeak?' checked':'') + '> both were weak</label></div>' +
    '<textarea id="comment" placeholder="why? — optional, never required"></textarea>'
  $('#main').innerHTML = body
  $('#f1').onchange = e => flags.loserAlsoGood = e.target.checked
  $('#f2').onchange = e => flags.bothWeak = e.target.checked
}

async function load(){
  cur = await (await fetch('/api/next')).json()
  choice = null; flags = {loserAlsoGood:false, bothWeak:false}; shown = Date.now()
  $('#go').disabled = true
  render()
}
async function submit(){
  if (!choice) return
  await fetch('/api/answer', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({
    trial: cur.trial, choice, flags, comment: ($('#comment')||{}).value || '', ms: Date.now() - shown })})
  load()
}
$('#go').onclick = submit
$('#pause').onclick = async () => { await fetch('/api/break', {method:'POST'}); alert('Break recorded. Close the tab; resume with the same command.') }
addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA' && e.key !== 'Enter') return
  if (e.key === 'ArrowLeft' && cur.kind === 'pair') pick('left')
  else if (e.key === 'ArrowRight' && cur.kind === 'pair') pick('right')
  else if (e.key === 't') pick('tie')
  else if (e.key === 'u') pick('unjudgeable')
  else if (e.key === 'c') { e.preventDefault(); $('#comment').focus() }
  else if (e.key === 'Enter') { e.preventDefault(); submit() }
})
load()
</script></html>`

// --- server ----------------------------------------------------------------------------------------

const json = (res, body) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)) }

// Nothing a request can contain may end the process. A session is hours long and lives only in
// this server's memory between saves; a bad payload costs one answer, never the run.
const server = http.createServer(async (req, res) => {
 try {
  if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(PAGE) }
  if (req.url === '/api/next') return json(res, present(nextTrial()))
  if (req.url === '/api/break' && req.method === 'POST') {
    session.breaks.push({ at: new Date().toISOString(), afterAnswers: session.answers.length }); save(); return json(res, { ok: true })
  }
  if (req.url === '/api/answer' && req.method === 'POST') {
    let raw = ''
    for await (const c of req) raw += c
    let a
    try { a = JSON.parse(raw) } catch { res.writeHead(400, { 'content-type': 'application/json' }); return res.end('{"error":"unparseable body"}') }
    const t = order.find((x) => x.trial === a.trial)
    if (!t) { res.writeHead(400, { 'content-type': 'application/json' }); return res.end('{"error":"unknown trial"}') }
    if (session.answers.some((x) => x.trial === a.trial)) return json(res, { ok: true, duplicate: true })
    session.answers.push({
      trial: a.trial, itemId: t.item.id, factor: t.factor, type: t.item.type,
      onLeft: t.onLeft, isRepeatOf: t.isRepeatOf ?? null,
      presentedOptions: presentedOptions.get(a.trial) ?? null,
      choice: a.choice, flags: a.flags, comment: a.comment, ms: a.ms, at: new Date().toISOString(),
    })
    save()
    const left = session.answers.length, total = order.length
    process.stdout.write(`\r${left}/${total} answered`)
    return json(res, { ok: true })
  }
  res.writeHead(404); res.end()
 } catch (err) {
  console.error('\nrequest failed, session intact:', err.message)
  try { res.writeHead(500, { 'content-type': 'application/json' }); res.end('{"error":"see the server log"}') } catch {}
 }
})

process.on('uncaughtException', (e) => console.error('\nuncaught, session intact:', e.message))

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}/`
  console.log(`${order.length} trials, seed ${SEED}, writing ${OUT}`)
  console.log(url)
  if (process.platform === 'darwin') spawn('open', [url], { stdio: 'ignore', detached: true }).unref()
})
