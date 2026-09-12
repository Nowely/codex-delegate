from pathlib import Path
import difflib, hashlib, json, re, subprocess
HERE = Path(__file__).resolve().parent
data = json.loads((HERE / "audit-data.json").read_text())
repo = Path(data["repository"])
original = (HERE / "00-original.md").read_text()
final = (HERE / "README.md").read_text()
lines = final.splitlines()
BT = chr(96)

def line_of(needle):
    found = [i + 1 for i, s in enumerate(lines) if needle in s]
    if not found:
        raise ValueError(f"Missing anchor: {needle!r}")
    return found[0]

def ref_link(ref):
    name, span = ref.rsplit(":", 1)
    first = span.split("-")[0]
    return f"[{ref}]({repo / name}:{first})"

refs = set()
for c in data["claims"]:
    c["readme_line"] = line_of(c["anchor"])
    for ref in c["sources"]:
        name, span = ref.rsplit(":", 1)
        first, _, last = span.partition("-")
        first, last = int(first), int(last or first)
        source = repo / name
        assert source.is_file(), ref
        count = len(source.read_text().splitlines())
        assert 1 <= first <= last <= count, ref
        refs.add(ref)
for repair in data["repairs"]:
    repair["readme_lines"] = [line_of(a) for a in repair["anchors"]]
data["headings"] = [s for s in lines if s.startswith("#")]
chain_files = ["00-original.md", "01-reader-pass.md", "02-writing-pass.md", "03-prerequisite-pass.md", "README.md"]
data["word_counts"] = {f: len((HERE / f).read_text().split()) for f in chain_files}
for i, stage in enumerate(data["passes"], 1):
    stage["words_before"] = data["word_counts"][chain_files[i - 1]]
    stage["words_after"] = data["word_counts"][chain_files[i]]
    stage["delta_words"] = stage["words_after"] - stage["words_before"]

def table(text):
    ls = text.splitlines()
    start = ls.index("| Call | Codex may |")
    end = start
    while end < len(ls) and ls[end].startswith("|"):
        end += 1
    return "\n".join(ls[start:end])
assert table(original) == table(final)
assert (repo / "README.md").read_bytes() == (HERE / "00-original.md").read_bytes()
status = subprocess.run(["git", "status", "--porcelain=v1"], cwd=repo, capture_output=True, text=True, check=True)
assert not status.stdout, status.stdout

def slug(s):
    s = re.sub(r"^#+\s*", "", s).lower()
    s = re.sub(r"[^\w\s-]", "", s)
    return re.sub(r"\s", "-", s)
local_links = []
for m in re.finditer(r"\[[^\]]+\]\(([^)]+)\)", final):
    target = m.group(1)
    if "://" in target:
        continue
    file, _, anchor = target.partition("#")
    dest = repo / file if file else HERE / "README.md"
    assert dest.exists(), target
    if anchor:
        anchors = {slug(s) for s in dest.read_text().splitlines() if s.startswith("#")}
        assert anchor in anchors, (target, sorted(anchors))
    local_links.append(target)
assert final.count("\n" + BT * 3) % 2 == 0

ranges = [
(1,9,"Replaced","Any-work framing; removed receipt/task-success guarantees; retained per-call rights and observed-event reporting."),
(13,21,"Removed and consolidated","Deleted the Goal manifesto, repeated rationales, no-configuration promise and cannot-report-doing-nothing guarantee. Retained actual defaults, rights and limits where chosen."),
(23,26,"Moved and shortened","Orchestration now follows result inspection; describes skill instructions and user invocation."),
(28,37,"Moved and clarified","Cleanup now has a dedicated heading and coverage table; retained numbered consent, four removable/four retained kinds and record-only liveness."),
(41,56,"Rebuilt","Numeric Node 22 requirement; CLI baseline 0.153.4 is a warning-only pin; optional config removed from prerequisites; CI/temp behavior moved to relevant decisions."),
(60,78,"Consolidated","Recommends one plugin route; retains install/update commands. Removes duplicate shell-install spelling and repeated skill-name prose."),
(80,97,"Moved and shortened","Source install is optional; keeps mkdir, links, export and one names table, but cuts the explanatory fresh-account story."),
(99,114,"Rebuilt","States absolute state requirement/precedence and complete source export. Removes fixed-path and uninstall/permission-mode guarantees not established by this checkout; retains conditional folder-access guidance."),
(116,129,"Moved and qualified","Checks moved below first use; preserves root location, skipped cases, version check and separate live opt-ins instead of an unconditional no-model/cost promise."),
(131,135,"Shortened","Keeps the repository/plugin-root and symlink-resolution instruction; cuts the explanatory ls-versus-Node anecdote."),
(139,145,"Moved and completed","Terminal example is optional, stack-neutral, and includes its own state assignment."),
(148,153,"Corrected","Replaces exit-0-means-command-ran and receipt-validation wording with the actual command-item floor, waivers and metadata-only receipt check."),
(155,163,"Moved and qualified","Normal Claude first use precedes optional shell use; preserves prompt/report contracts, modes and no-clobber behavior; missing report stays unknown."),
(174,178,"Reworded, substance kept","All-readable-path exposure, default network, no allowlist and separate provider search remain directly beside the rights table."),
(182,185,"Corrected","Removes the false no-registry/no-collector assertion and unconditional lifetime/delivery wording; documents limits, best-effort interruption and job records."),
(189,206,"Consolidated and corrected","Trust claims now sit with report inspection. Removes process-always-zero and receipt-per-run absolutes; keeps verifier privileges, proxies, sandbox assertions and optional host-home behavior."),
(210,216,"Scoped to dated evidence","Replaces current/universal upstream claims with the local 2026-08-31 comparison, plugin 1.0.6 and Codex 0.150.1; keeps the reference to advantages and defects."),
(220,226,"Scoped","Keeps relevant browser/Node/network/concurrency limits as the reference's tested setup; avoids universal browser and current experimental-label claims without a local CLI check."),
(230,242,"Rebuilt","Retains full-schema history and commit hash; supplies extraction prerequisite and moves pruning before conformance to match unused-file rejection."),
(247,263,"Consolidated","Layout becomes a compact purpose/file table; full-schema operational history remains only in the upgrade recipe."),
(266,277,"Consolidated","Replaces canonical-homes rhetoric and duplicated paths with one files-and-references table."),
(281,290,"Removed and linked","Removes confidence/age/adversarial-review rhetoric and blanket mutation guarantees; keeps coverage, change history and MIT license pointers without claiming fresh test results.")
]
def rationale(start,end):
    opts=[(kind,why) for a,b,kind,why in ranges if a <= start <= b]
    if not opts:
        opts=[(kind,why) for a,b,kind,why in ranges if not(end<a or start>b)]
    assert opts,(start,end)
    return opts[0]
cuts=[]
for m in re.finditer(r"\S[\s\S]*?(?=\n\s*\n|\Z)",original):
    passage=m.group(0).rstrip()
    words=len(passage.split())
    if words<20 or passage in final:
        continue
    start=original.count("\n",0,m.start())+1
    end=start+passage.count("\n")
    kind,why=rationale(start,end)
    cuts.append(dict(original_start=start,original_end=end,words=words,disposition=kind,reason=why,original_passage=passage))
data["cut_ledger"]=cuts
diff_parts=[]
for left,right in zip(chain_files,chain_files[1:]):
    diff_parts.extend(difflib.unified_diff((HERE/left).read_text().splitlines(keepends=True),
        (HERE/right).read_text().splitlines(keepends=True),fromfile=left,tofile=right))
(HERE/"chain.diff").write_text("".join(diff_parts))
(HERE/"README.diff").write_text("".join(difflib.unified_diff(original.splitlines(keepends=True),
    final.splitlines(keepends=True),fromfile="checkout/README.md",tofile="temporary/README.md")))
cut_lines=["# Cut ledger","",
"Every original paragraph or block of at least 20 whitespace-delimited words that is no longer verbatim in the final README is listed below. A moved or rewritten block is labelled as such; its word count is the original block size, not a net deletion count.",""]
for n,c in enumerate(cuts,1):
    cut_lines += [f"## {n}. Original README.md:{c['original_start']}-{c['original_end']} — {c['words']} words",
        "",f"**{c['disposition']}.** {c['reason']}","","Original passage:","",
        BT*4+"markdown",c["original_passage"],BT*4,""]
(HERE/"cut-ledger.md").write_text("\n".join(cut_lines))
audit=["# README rewrite audit","",f"Repository: {repo} at {data['revision']}. The checkout was not edited.","",
"The deliverable is README.md in this temporary directory. Intermediate drafts show the ordered chain; only the final README is proposed for use.","","## The four passes",""]
for s in data["passes"]:
    audit += [f"### Part {s['part']}: {s['name']}","",
        f"{s['file']}: {s['words_before']} → {s['words_after']} words ({s['delta_words']:+d}).","",s["changes"],""]
audit += ["## Invisible prerequisites",""]
for n,(name,text) in enumerate(data["inventory"],1):
    audit.append(f"{n}. **{name}.** {text}")
audit += ["","## Six reader repairs",""]
for r in data["repairs"]:
    places=", ".join(f"README.md:{n}" for n in r["readme_lines"])
    audit += [f"{r['reader']}. **{r['question']}** {r['change']} Locations: {places}.",""]
audit += ["## Behavior claim ledger","",
"README locations below refer to the final temporary file. Source paths refer to the unchanged checkout. Code supports implementation behavior; skills support instructions given to Claude. Host CLI recipes and historical measurements are labelled. Citation existence checks are not runtime verification.",""]
for c in data["claims"]:
    audit += [f"### {c['id']} — README.md:{c['readme_line']}","",c["claim"]+".","",
        "Sources: "+"; ".join(ref_link(ref) for ref in c["sources"])+"."]
    if c["qualification"]:
        audit += ["",c["qualification"]]
    audit.append("")
audit += ["## Conditions retained at decisions",""]
for anchor,reason in data["kept"]:
    audit.append(f"- README.md:{line_of(anchor)} — {reason}")
audit += ["","## Cuts of at least 20 words","",
f"cut-ledger.md contains all {len(cuts)} replaced, moved or removed source blocks with original text, line span, word count and disposition. README.diff is the complete original-to-final diff; chain.diff contains all four transformations.","","## Limits and tensions",""]
audit += ["- "+item for item in data["limitations"]]
validation=dict(
kind="documentation structural audit; not a project test run",
original_words=len(original.split()),final_words=len(final.split()),
original_lines=len(original.splitlines()),final_lines=len(final.splitlines()),
word_delta=len(final.split())-len(original.split()),
claims_with_checked_source_spans=len(data["claims"]),distinct_source_spans_checked=len(refs),
local_markdown_link_occurrences_checked=len(local_links),
invisible_prerequisites=len(data["inventory"]),reader_repair_entries=len(data["repairs"]),
rights_table_lines_unchanged=len(table(original).splitlines()),
substantial_replaced_or_removed_blocks=len(cuts),
source_readme_sha256=hashlib.sha256((repo/"README.md").read_bytes()).hexdigest(),
original_snapshot_matches_source=True,git_status_porcelain=status.stdout,fenced_blocks_balanced=True,
project_tests_run=0,live_reader_experiments_run=0,model_calls_run=0)
data["validation"]=validation
(HERE/"audit.json").write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n")
(HERE/"audit.md").write_text("\n".join(audit)+"\n")
(HERE/"validation.json").write_text(json.dumps(validation,indent=2)+"\n")
print(json.dumps(validation,indent=2))
print("Cut ledger:")
for c in cuts:
    print(f"{c['original_start']}-{c['original_end']}: {c['words']} words; {c['disposition']}")
