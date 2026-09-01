# Pasted images: attach-pasted.mjs selection and validation

    --list                  the last 10 image-bearing human turns: uuid, timestamp, count,
                            stored WxH, first 80 characters. Writes nothing.
    --pasted-turn <uuid>    take that turn instead (repeatable; selected turns are emitted in
                            timestamp order)
    --pasted-pick 1,3-4     1-based indices within ONE selected turn
    --pasted-allow-old      permit a turn >12h older than the session's newest record

There is deliberately **no offset selector** (`back:2`, `--turns N`): machine records — task
notifications, the skill loader's own injections, tool results — share the `user` type and interleave
with yours, and a message queued while you compose the call shifts the count. An offset therefore
selects a *different* image with no error. Copy a uuid from `--list`, which a human can check at a
glance. Record uuids are also **not** stable across sessions: a resumed session copies earlier turns
into its own file with fresh ids, which is what the 12-hour reach-back guard is for.

Each image is validated before anything is written (media type against the record, magic bytes against
the media type, 10 MB each / 25 MB across the whole selection / 20 images), lands at
`~/.codex-delegate/pasted/<pid>-<random>/NN-<sha>.<ext>` (the source type's extension — png, jpg, gif
or webp) mode 0600 in a 0700 directory, and is removed when the run ends. The stderr receipt names
each image — turn, timestamp, the turn's text, index, stored dimensions, size, sha256, path — and says
out loud that it goes to the model provider.

The destination is deliberately not `$TMPDIR`: that is the read level's one writable root, so the very
seat being shown the images could edit them. Two facts before asking for pixel coordinates: Claude Code
**downscales** a paste to at most ~2000 px before storing it (its own meta records say "Multiply
coordinates by 1.73 to map to the original"), so the receipt's `WxH` is the space the seat answers in;
and the images carry no names, so a prompt that says "the first screenshot" must number them itself —
the driver adds no sentence of its own to a prompt you wrote.
