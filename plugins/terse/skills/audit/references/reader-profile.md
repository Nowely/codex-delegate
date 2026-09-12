# Who reads this

The profile is the first part of the chain and it does two jobs. Here it chooses the questions the
measurement asks. In `rewrite` it is the brief the rewrite is written to. One artifact, both times, which
is why it is written once and carried in the run file rather than re-derived.

## Where to get it

Not from the documentation. The documentation is what is being measured; a profile drawn from it agrees
with it by construction and the measurement becomes a mirror.

| Section | Where the answer comes from |
|---|---|
| What it is, in one sentence, without jargon | the code's entry points, not the tagline |
| The reader | who opens issues, who the install instructions assume, who the user says they are |
| What brings them here | the problem the code solves, stated as the pain that precedes it |
| What they would otherwise use | competitors and workarounds named in issues, docs or the user's words |
| Why this instead | the difference a user can check, not the difference the author is proud of |
| Their words, not ours | issue titles, search terms, the user's phrasing — in their languages |
| What earns their trust | which evidence the project can actually show a sceptic |
| Voice | the constraints on sentences, terms and emphasis for this audience |

Ask the user for anything the repository cannot answer. One round of questions, then show the profile
and take corrections. Do not start the truth pass on an unconfirmed profile.

## Three traps

**Narrowing the subject to sound concrete.** A tool that takes any work becomes a tool for "coding
work", and the first reader repeats the narrowing back. Measured: that was reader one's wrong answer on
2026-09-10, taken straight from `README.md:3`.

**Assuming an engineer.** Write the constraint explicitly when it holds — *nothing may assume a
language, a framework or a stack* — or every later step quietly reintroduces it.

**Writing a persona.** Age, job title and a name for the reader change nothing downstream. What changes
downstream is the decision they must make in the next minute. Keep the sections that feed a question.

## A worked example

This is the profile used in the 2026-09-10 run, unedited. Note the length: it fits on one screen, and
every line of it is load-bearing for some later question.

    # Who reads this project's documentation

    ## What it is, in one sentence, without jargon
    A Claude Code plugin that lets Claude hand a piece of work to OpenAI Codex running
    beside it, decides per call what Codex may touch, and returns a record of what
    actually happened.

    ## The reader
    Works inside Claude Code already. Solo, or leading a small team; nobody procures
    this, they install it themselves and decide alone in about a minute.
    Mid to senior, and has already formed opinions about where an AI agent is
    unreliable.
    NOT NECESSARILY AN ENGINEER. Nothing may assume a language, a framework or a stack.

    ## What brings them here
    - Claude is confidently wrong in ways Claude cannot see from the inside.
    - Getting a second model's opinion means leaving the session, re-pasting context,
      losing the thread.
    - Giving an agent write access is frightening; they want to know what it may touch
      before it runs, not after.
    - They cannot tell whether an agent did the work or only reported that it did.

    ## What they would otherwise use
    OpenAI's own codex plugin, whose hardcoded approval policy fails on managed
    machines; exec-based skills; or a second terminal and copy-paste.

    ## Why this instead
    Rights declared per call. The exit code comes from the stream of events, not from
    a process that always exits 0. Claude's own agents and Codex agents in one job.

    ## Their words, not ours
    "have codex review this", "get a second opinion", "second implementation",
    "через codex", "вторая имплементация", "панель ревьюеров".

    ## What earns their trust
    Seeing which commands actually ran. A default that writes nothing of theirs.
    No dependencies to install.

    ## Voice
    Short sentences, one decision each. No manifesto and no aphorisms. No capitals for
    emphasis. A term appears only after the reader has a reason to care about it. Never
    narrow the subject to sound concrete: this takes any work, not only code.

The six questions that followed traced this reader's path end to end: what is this, what must I install,
how do I run it the first time, what may it touch, how do I know the work happened, how do I remove what
it left. Two of them come straight off the pain bullets — fear of write access became *what may it
touch*, and not knowing whether an agent worked became *how do I know the work happened*. The rest come
from the path itself, because a reader who cannot install it never reaches the pain that brought them.
