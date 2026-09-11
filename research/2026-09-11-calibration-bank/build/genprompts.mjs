import fs from 'node:fs'
const P = JSON.parse(fs.readFileSync('/tmp/partition.json', 'utf8'))
const OUT = '/tmp/bank-build'

const FACTORS = `
A. factor "promotional-tone"  —  ${'off'}: "state what it does"   ${'on'}: "state what it does and why it is good"
   HARD CONSTRAINT: the two sides must match in word count within 10%. Length is a known confound:
   annotators have been measured picking the longer text 62% of the time. If the justified version runs
   long, tighten it until it matches. Do not pad the short side to compensate.

B. factor "metaphor"  —  ${'on'}: "use the literal phrase where one exists"   ${'off'}: no constraint on figurative language
   The two sides must ACTUALLY differ: the off side has to contain a figure of speech the on side replaces
   with a plain phrase. If a passage reads literally under both instructions, pick a different passage.

C. factor "answer-first"  —  ${'on'}: "open with the answer"   ${'off'}: "open with situation, complication, question"
   Same facts in both, same order of nothing else — only the position of the conclusion moves.`

function prompt(w, a) {
  const n = w.per
  return `You are writing items for a blind paired-comparison instrument. It measures which forms of writing
one particular person prefers. You are one of five independent writing engines working on disjoint
source material; you will not see what the others write, and that is deliberate.

Repository root: /Users/ruliny/Git/agent-skills

YOUR SOURCE BLOCKS. Read these and only these. Every other file in the repository is out of bounds
for this task, because another engine has been assigned it and two items built on one passage would
break the instrument's arithmetic.

${a.prose.map((b) => '  ' + b).join('\n')}

WHAT TO PRODUCE

${n * 3} single-factor items: ${n} for each of the three factors below.${w.cc ? `\nPlus ${w.cc} code-comment items from your code blocks, described at the end.` : ''}

For each single-factor item:

 1. Pick a DISTINCT source passage from your blocks — a self-contained stretch of prose, roughly 40 to 80
    words, that makes one point. Never build two items on the same passage. Record it as file:line-line.
 2. Rewrite that passage TWICE, once under each instruction of the factor. Both versions carry the same
    facts and the same content. Each side is 40 to 60 words.
 3. Both sides must be prose a competent technical writer could have shipped. An item where one side is
    visibly worse is a wasted item: the person will simply pick the better-written one and the factor
    registers nothing. Vary the difficulty — some pairs should be close.
 4. Count the words of each side and record the counts. Do not estimate them.

THE FACTORS
${FACTORS}

OUTPUT. Return ONE JSON object, {"items":[...]}, matching the schema you were given. One element per
item. No commentary, no file.

A single-factor item:

{"id":"${w.id}-tone-1","type":"single-factor","factor":"promotional-tone",
 "source":"plugins/codex-delegate/README.md:41-48","code":"",
 "instructionOn":"state what it does and why it is good","instructionOff":"state what it does",
 "variants":[{"key":"on","text":"...","words":52},{"key":"off","text":"...","words":50}]}

Factor names exactly: promotional-tone, metaphor, answer-first. Id prefixes ${w.id}-tone-,
${w.id}-metaphor-, ${w.id}-answer-. The "code" field is an empty string on these items.
${w.cc ? `
CODE-COMMENT ITEMS, three ways. From your code blocks:

${a.code.map((b) => '  ' + b).join('\n')}

Take a fragment of two to eight lines that carries a comment. The item offers three ways to write it:
the comment as it stands, a rewritten comment, and no comment at all.

{"id":"${w.id}-cc-1","type":"code-comment","factor":"","source":"...:120-126",
 "code":"<the fragment with the COMMENT LINE REMOVED, real newlines>",
 "instructionOn":"","instructionOff":"",
 "variants":[{"key":"keep","text":"// the comment exactly as written","words":8},
             {"key":"rewrite","text":"// your rewrite","words":11},
             {"key":"delete","text":"(no comment)","words":0}]}

At least one of your code-comment items must be a fragment where deleting the comment is the right
call — a comment that restates what the line already says. Do not mark which one; the third option
has to be a real option in some items and a bad one in others.
` : ''}
TWO THINGS NOT TO DO

Do not write down which side you expect the reader to prefer, anywhere, in any field. A file that
carries your prediction contaminates the measurement it was built for.

Do not invent source text. Every item is built on a real passage from your assigned blocks, and the
source field must point at the lines it came from.`
}

for (const w of P.workers) {
  fs.writeFileSync(`${OUT}/${w.id}.prompt.txt`, prompt(w, P.assignment[w.id]))
}
console.log(P.workers.map((w) => `${w.id}: ${fs.statSync(`${OUT}/${w.id}.prompt.txt`).size} bytes, ${w.per * 3} items + ${w.cc} cc`).join('\n'))
