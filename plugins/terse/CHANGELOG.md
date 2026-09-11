# Changelog

Hand-written per release from the tagged git log. Dates are the tagged commit dates; detailed
forensics remain in the repository references and release notes.

## Unreleased

### Added

- The plugin, with two user-invoked skills. `audit` measures a document: it builds a reader profile,
  derives an answer key from the code, sends one fresh reader per question through the `.md` files and
  scores them. `revise` repairs what the audit measured, through a small bake-off judged on those
  failures. Neither writes into the audited repository without the user's word.
- Both skills carry `disable-model-invocation: true`. They spend real tokens and hold opinions about
  the text; the user decides when they run.
- The method they carry was measured on one repository on 2026-09-10, and the reference files keep the
  dates and numbers. What was measured and what was not is marked in place.
- `references/prior-art.md`, a survey of the field taken on 2026-09-11: forty-one candidates, eight read
  in full, twenty approaches worth taking with the file and line each lives at, and the thirty-three
  candidates that were not opened. It sits outside `skills/`, so no skill pulls it into context. It
  records two findings against this plugin's own published numbers, and the fact that Anthropic's
  `doc-coauthoring` skill already tests a document with a fresh reader.
