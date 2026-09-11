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

let session = { bank: bank.bank || path.basename(BANK), fingerprint: fingerprint(bank), participant: WHO, seed: SEED, started: new Date().toISOString(), answers: [], breaks: [] }
if (fs.existsSync(OUT)) {
  session = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  if (session.seed !== SEED) {
    console.error(`the existing session used seed ${session.seed}; resume with --seed ${session.seed}`)
    process.exit(2)
  }
  if (session.fingerprint && session.fingerprint !== fingerprint(bank)) {
    console.error('the bank has changed since this session started; answers are keyed by position and would realign to different items. Start a new session file.')
    process.exit(2)
  }
  session.fingerprint ??= fingerprint(bank)
  console.log(`resuming: ${session.answers.length} of ${order.length} answered`)
}
const startedThisSitting = session.answers.length

// Written 285 times. A truncating write that dies mid-way leaves JSON that the next resume
// cannot parse, which costs the whole run rather than one answer.
const save = () => {
  fs.writeFileSync(OUT + '.tmp', JSON.stringify(session, null, 2))
  fs.renameSync(OUT + '.tmp', OUT)
}

// Answers are keyed by position in the order, and the order comes from the bank. An edited bank
// silently realigns yesterday's answers to different items, so a resume must refuse one.
function fingerprint(b){ return b.items.map((i) => i.id).join('|').length + ':' + b.items.length + ':' + b.items.map((i) => i.id).join(',').slice(0, 200) }

function optionOrder(t){ return shuffle(Object.entries(t.item.variants), rng(SEED + t.trial)).map(([k]) => k) }

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
  if (!t) return { done: true, answered: session.answers.length, total: order.length, sitting: session.answers.length - startedThisSitting }
  if (t.item.type === 'code-comment') {
    const opts = shuffle(Object.entries(t.item.variants), rng(SEED + t.trial))
    return {
      done: false, trial: t.trial, kind: 'three', type: t.item.type,
      answered: session.answers.length, total: order.length, sitting: session.answers.length - startedThisSitting,
      code: t.item.code || '', options: opts.map(([, v]) => (typeof v === 'string' ? v : v.text)),
    }
  }
  const l = sideText(t, 'left'), r = sideText(t, 'right')
  return {
    done: false, trial: t.trial, kind: 'pair', type: t.item.type,
    answered: session.answers.length, total: order.length, sitting: session.answers.length - startedThisSitting,
    left: typeof l === 'string' ? l : l.text, right: typeof r === 'string' ? r : r.text,
  }
}

// --- the page --------------------------------------------------------------------------------------

const PAGE = String.raw`<!doctype html><html lang="en"><meta charset="utf-8">
<title>calibration</title>
<style>
 :root{--fg:#1a1a1a;--dim:#5f5f5f;--faint:#767676;--line:#dcdcdc;--edge:#8f8f8f;
       --pick:#0b5fff;--onpick:#fff;--bg:#fbfbfa;--panel:#fff}
 @media (prefers-color-scheme:dark){:root{--fg:#e8e8e8;--dim:#9b9b9b;--faint:#9a9a9a;--line:#4a4a4a;--edge:#767676;
       --pick:#6ea8ff;--onpick:#151515;--bg:#151515;--panel:#1c1c1c}}
 @media (prefers-reduced-motion:reduce){*{transition:none!important}}
 *{box-sizing:border-box}
 body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
      display:flex;justify-content:center;padding:5vh 20px 60px}
 .wrap{width:100%;max-width:1000px}
 .vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
 .top{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--faint);margin-bottom:12px}
 .top button{border:0;background:0;color:var(--dim);font:inherit;cursor:pointer;padding:4px 8px;margin:-4px -8px}
 .top button:hover{color:var(--fg)}
 fieldset{border:0;margin:0;padding:0}
 .pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
 .three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
 .opt{border:1px solid var(--edge);border-radius:9px;padding:14px 16px;cursor:pointer;background:var(--panel);
      display:flex;flex-direction:column;align-items:stretch;overflow-wrap:anywhere;transition:box-shadow .08s}
 .opt:hover{border-color:var(--fg)}
 .opt:focus-within{outline:2px solid var(--pick);outline-offset:2px}
 .opt.sel{box-shadow:inset 0 0 0 3px var(--pick)}
 .opt .k{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);margin-bottom:8px;
         display:flex;align-items:center;gap:6px}
 .opt.sel .k::after{content:"— chosen";letter-spacing:0;text-transform:none;color:var(--pick)}
 .opt p{margin:0 0 .6em;max-width:64ch}.opt p:last-child{margin-bottom:0}
 .opt code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.88em;background:rgba(128,128,128,.16);padding:.1em .3em;border-radius:3px}
 .rest{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin-top:12px}
 .rest .opt{padding:12px 16px;flex-direction:row;align-items:center;gap:8px;font-size:14px;color:var(--fg)}
 pre{background:var(--panel);border:1px solid var(--line);padding:12px 14px;border-radius:8px;overflow-x:auto;
     font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin:0 0 10px}
 .extras{margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}
 .extras legend, .exhint{font-size:13px;color:var(--faint);padding:0}
 .exrow{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:8px}
 .exrow label{font-size:14px;color:var(--fg);display:flex;gap:7px;align-items:center;cursor:pointer;padding:4px 0}
 .exrow button.link{border:0;background:0;color:var(--dim);font:inherit;font-size:14px;cursor:pointer;
                    text-decoration:underline;padding:5px 6px;margin:-5px -6px}
 textarea{display:none;width:100%;margin-top:10px;min-height:56px;border:1px solid var(--edge);border-radius:8px;
          padding:10px 12px;font:inherit;font-size:14px;background:var(--panel);color:inherit;resize:vertical}
 textarea.on{display:block}
 .act{margin-top:18px;display:flex;gap:14px;align-items:center}
 .go{background:var(--pick);color:var(--onpick);border:0;border-radius:7px;padding:9px 22px;font:inherit;font-size:15px;cursor:pointer}
 .go[disabled]{opacity:.4;cursor:default}
 .keys{margin-top:18px;font-size:12.5px;color:var(--faint)}
 .keys kbd{font:inherit;border:1px solid var(--line);border-radius:4px;padding:0 4px}
 .msg{margin-top:14px;padding:10px 14px;border:1px solid var(--pick);border-radius:8px;font-size:14px}
 .centre{padding:12vh 0;text-align:center;color:var(--dim);font-size:17px}
 .centre button{margin-top:18px}
</style>
<div id="live" aria-live="polite" aria-atomic="true" class="vh"></div>
<div class="wrap" id="wrap"></div>
<script>
var $ = function(s){ return document.querySelector(s) }
var cur = null, choice = null, flags = {loserAlsoGood:false, bothWeak:false}
var note = '', noteOpen = false, shown = 0, busy = false, paused = false, msg = '', resumed = false
var DRAFT = 'terse-draft'

function esc(t){ return t.replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c] }) }
function md(t){
  return t.split(/\n{2,}/).map(function(p){
    return '<p>' + esc(p).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\x60(.+?)\x60/g,'<code>$1</code>').replace(/\n/g,'<br>') + '</p>'
  }).join('')
}
function saveDraft(){
  try { sessionStorage.setItem(DRAFT, JSON.stringify({t:cur&&cur.trial, choice:choice, flags:flags, note:note})) } catch(e){}
}
function clearDraft(){ try { sessionStorage.removeItem(DRAFT) } catch(e){} }

// Selection changes touch classes only. Rebuilding the container would drop focus on every
// keystroke, and it is what used to copy one item's note onto the next.
function sync(){
  var opts = document.querySelectorAll('.opt')
  for (var i = 0; i < opts.length; i++){
    var on = opts[i].dataset.v === choice
    opts[i].classList.toggle('sel', on)
    var r = opts[i].querySelector('input[type=radio]'); if (r) r.checked = on
  }
  var f1 = $('#f1'), f2 = $('#f2')
  if (f1) f1.checked = flags.loserAlsoGood
  if (f2) f2.checked = flags.bothWeak
  var go = $('#go'); if (go) go.disabled = !choice
  var hint = $('#exhint'); if (hint) hint.textContent = choice ? '' : 'Optional flags and a note become available once you choose.'
  var ex = $('#extras'); if (ex) ex.style.visibility = choice ? 'visible' : 'hidden'
  saveDraft()
}
function pick(v){ if (paused) return; choice = v; sync() }
function toggle(f){ if (!choice) return; flags[f] = !flags[f]; sync() }
function openNote(){ if (!choice) return; noteOpen = true; var c = $('#comment'); c.classList.add('on'); c.focus() }

function draw(){
  if (paused){
    $('#wrap').innerHTML = '<div class="centre">Paused — ' + cur.answered + ' answers saved.<br>'
      + 'Your current choice is kept.<br><button class="go" onclick="resume()">resume</button></div>'
    return
  }
  if (cur.done){
    $('#wrap').innerHTML = '<div class="centre">Done — ' + cur.answered + ' answers recorded.<br>You can close this tab.</div>'
    return
  }
  var h = '<h1 id="hd" tabindex="-1" class="vh">Item ' + (cur.answered + 1) + '</h1>'
    + '<div class="top"><span>' + cur.answered + ' saved of ' + cur.total
    + (cur.sitting ? ' · ' + cur.sitting + ' this sitting' : '') + '</span>'
    + '<span><button onclick="undo()">undo last</button> <button onclick="pause()">pause</button></span></div>'
    + '<fieldset><legend class="vh">Which reads better?</legend>'

  if (cur.kind === 'three'){
    h += '<pre>' + esc(cur.code) + '</pre><div class="three">'
    for (var i = 0; i < cur.options.length; i++)
      h += '<div class="opt" data-v="o' + i + '" onclick="pick(\'o' + i + '\')">'
         + '<div class="k"><input type="radio" name="c" tabindex="-1"> option ' + (i + 1) + '</div>'
         + md(cur.options[i]) + '</div>'
    h += '</div>'
  } else {
    h += '<div class="pair">'
       + '<div class="opt" data-v="left" onclick="pick(\'left\')"><div class="k"><input type="radio" name="c" tabindex="-1"> left</div>' + md(cur.left) + '</div>'
       + '<div class="opt" data-v="right" onclick="pick(\'right\')"><div class="k"><input type="radio" name="c" tabindex="-1"> right</div>' + md(cur.right) + '</div>'
       + '</div>'
  }
  h += '<div class="rest">'
     + '<div class="opt" data-v="tie" onclick="pick(\'tie\')"><input type="radio" name="c" tabindex="-1"> they are equal</div>'
     + '<div class="opt" data-v="unjudgeable" onclick="pick(\'unjudgeable\')"><input type="radio" name="c" tabindex="-1"> can\'t judge / both unacceptable</div>'
     + '</div></fieldset>'

  h += '<fieldset class="extras"><legend>Optional — add any, or skip</legend>'
     + '<div class="exhint" id="exhint"></div>'
     + '<div id="extras"><div class="exrow">'
     + '<label><input type="checkbox" id="f1" onchange="toggle(\'loserAlsoGood\')"> the other one was also good</label>'
     + '<label><input type="checkbox" id="f2" onchange="toggle(\'bothWeak\')"> both were weak</label>'
     + '<button class="link" onclick="openNote()">add a note</button>'
     + '</div><label class="vh" for="comment">Note</label>'
     + '<textarea id="comment" oninput="note=this.value;saveDraft()" placeholder="why? — optional"></textarea>'
     + '</div></fieldset>'

  h += '<div class="act"><button class="go" id="go" onclick="submit()" disabled>next</button></div>'
     + (msg ? '<div class="msg">' + esc(msg) + '</div>' : '')
     + '<div class="keys"><kbd>←</kbd> <kbd>→</kbd> choose · <kbd>e</kbd> equal · <kbd>u</kbd> can\'t judge · '
     + (cur.kind === 'three' ? '<kbd>1</kbd>–<kbd>3</kbd> choose · ' : '<kbd>1</kbd> <kbd>2</kbd> flags · ')
     + '<kbd>c</kbd> note · <kbd>⏎</kbd> next · <kbd>ctrl</kbd>+<kbd>z</kbd> undo</div>'

  $('#wrap').innerHTML = h
  $('#comment').value = note
  if (noteOpen) $('#comment').classList.add('on')
  sync()
  $('#hd').focus()
  scrollTo(0, 0)
}

function load(){
  fetch('/api/next').then(function(r){ return r.json() }).then(function(c){
    var fresh = !cur || cur.trial !== c.trial
    cur = c
    if (fresh){ choice = null; flags = {loserAlsoGood:false, bothWeak:false}; note = ''; noteOpen = false; clearDraft() }
    var d = null
    try { d = JSON.parse(sessionStorage.getItem(DRAFT) || 'null') } catch(e){}
    if (d && d.t === c.trial){ choice = d.choice; flags = d.flags || flags; note = d.note || ''; resumed = true }
    shown = Date.now(); busy = false
    draw()
    $('#live').textContent = 'Item ' + (c.answered + 1) + ' of ' + c.total
  })
}
function submit(){
  if (!choice || busy || paused) return
  busy = true; msg = ''
  fetch('/api/answer', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({
    trial: cur.trial, choice: choice, flags: flags, comment: note, ms: Date.now() - shown, resumed: resumed })})
  .then(function(r){
    if (!r.ok){ busy = false; msg = 'NOT SAVED — stop and check the terminal before answering anything else.'; draw(); return null }
    return r.json()
  }).then(function(j){
    if (!j) return
    if (j.duplicate){ busy = false; msg = 'That item was already answered — another tab is open. Close this one.'; draw(); return }
    resumed = false; clearDraft(); load()
  }).catch(function(){ busy = false; msg = 'NOT SAVED — the server did not answer.'; draw() })
}
function undo(){
  if (busy || paused) return
  if (!confirm('Remove the last saved answer?')) return
  busy = true
  fetch('/api/undo', {method:'POST'}).then(function(){ clearDraft(); cur = null; load() })
}
function pause(){
  fetch('/api/break', {method:'POST'}).then(function(){ paused = true; saveDraft(); draw() })
}
function resume(){ paused = false; shown = Date.now(); resumed = true; draw() }

addEventListener('visibilitychange', function(){ if (!document.hidden && !paused){ shown = Date.now(); resumed = true } })
addEventListener('beforeunload', function(e){ if (choice || note) e.preventDefault() })
addEventListener('keydown', function(e){
  if (!cur || cur.done || e.altKey) return
  var inText = e.target.tagName === 'TEXTAREA'
  if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')){ e.preventDefault(); return undo() }
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter'){ e.preventDefault(); return submit() }
  if (e.metaKey || e.ctrlKey) return
  if (inText){ if (e.key === 'Escape') e.target.blur(); return }
  if (paused){ if (e.key === 'Enter'){ e.preventDefault(); resume() } return }
  var k = e.key.toLowerCase()
  if (e.key === 'ArrowLeft' && cur.kind === 'pair') pick('left')
  else if (e.key === 'ArrowRight' && cur.kind === 'pair') pick('right')
  else if (k === 'e') pick('tie')
  else if (k === 'u') pick('unjudgeable')
  else if (k >= '1' && k <= '3' && cur.kind === 'three') pick('o' + (Number(k) - 1))
  else if (k === '1' && cur.kind === 'pair') toggle('loserAlsoGood')
  else if (k === '2' && cur.kind === 'pair') toggle('bothWeak')
  else if (k === 'c'){ e.preventDefault(); openNote() }
  else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON'){ e.preventDefault(); submit() }
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
  if (req.url === '/api/next') { res.setHeader('cache-control', 'no-store'); return json(res, present(nextTrial())) }
  if (req.url === '/api/undo' && req.method === 'POST') {
    const gone = session.answers.pop()
    if (gone) save()
    return json(res, { ok: true, undone: gone ? gone.trial : null })
  }
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
      presentedOptions: t.item.type === 'code-comment' ? optionOrder(t) : null,
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
