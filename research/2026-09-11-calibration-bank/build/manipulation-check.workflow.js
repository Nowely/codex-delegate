export const meta = {
  name: 'terse-bank-manipulation-check',
  description: 'Ten blind checkers say what differs inside each pair, to test whether the items are single-factored',
  phases: [{ title: 'Check', detail: 'one haiku per batch of twelve pairs, blind to the intended factor' }],
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdicts'],
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['pair', 'described', 'category', 'detectability', 'worseSide'],
        properties: {
          pair: { type: 'string' },
          described: { type: 'string' },
          category: {
            type: 'string',
            enum: [
              'one side claims a benefit where the other states a plain fact',
              'one uses a figure of speech where the other is plain',
              'the main point sits in a different position',
              'one is noticeably longer',
              'one is simply written better',
              'the two differ in more than one of these at once',
              'no difference worth noticing',
              'something else',
            ],
          },
          detectability: { type: 'string', enum: ['obvious', 'noticeable', 'subtle', 'invisible'] },
          worseSide: { type: 'string', enum: ['a', 'b', 'neither'] },
        },
      },
    },
  },
}

phase('Check')

const BATCHES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const results = await parallel(BATCHES.map((n) => () =>
  agent(
    `Read /tmp/bank-build/check/batch-${n}.json. It holds twelve pairs of short technical prose. Each pair is ` +
    `two versions of the same passage: one thing was varied deliberately, everything else was meant to stay put.\n\n` +
    `For each pair, in this order:\n\n` +
    `1. FIRST write, in your own words, what actually differs between a and b. Do this before you look at the ` +
    `category list. Be specific — name the words or the move, not "the style".\n` +
    `2. THEN pick the single category closest to what you just described. If two things changed at once, say so ` +
    `with the "more than one" category rather than picking the bigger one.\n` +
    `3. Say how hard the difference is to spot: obvious, noticeable, subtle, or invisible.\n` +
    `4. Say whether one side is simply worse written than the other, independently of what was varied. ` +
    `"neither" is the right answer when both are competent, and it should be the common answer.\n\n` +
    `You are not being asked which one you prefer, and you are not being told what was varied. Do not guess at ` +
    `the purpose of the exercise. A pair where you genuinely see no difference is a useful finding — report it ` +
    `as such rather than inventing one.\n\n` +
    `Return one verdict per pair, using the pair token exactly as it appears in the file. Write no files.`,
    { label: `check:batch-${n}`, phase: 'Check', model: 'haiku', schema: SCHEMA }
  ).then((r) => (r && Array.isArray(r.verdicts) ? r.verdicts : []))
))

const all = results.filter(Boolean).flat()
log(`${all.length} verdicts from ${results.filter(Boolean).length} checkers`)
return { verdicts: all }
