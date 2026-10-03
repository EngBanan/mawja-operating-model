# 03 · The verification, on the branch

A shortened verification example for the [fictional notes app](README.md). The tool runs automatic checks in steps ①, ③ and ⑤. The Conductor completes the guard runs, introduces an independent fault in ② and checks the requested behavior in ④.

The verifier uses `CODE_DIRS = ["src"]` for this example. The branch changes the following files; the decision is still a proposal in the report:

```text
$ git diff --name-only 3f9c2a1...wave/w3-atomic-save
PROGRESS/TECHNICAL_DEBT.md
package.json
scripts/governance/check-save-atomic.ts
src/cli.ts
src/store.ts
```

## What the tool did

The Conductor inspects the branch hook evidence for critical and change-specific checks on the reported commit, then checks out the branch and runs the task-specific store and shape tests in the reviewer's environment as part of step ①. This independent review does not add a full branch suite. These regression checks are separate from the independent command for step ④.

```
$ git switch wave/w3-atomic-save
$ npm run test:store
41 passing
$ npm run test:store-shape
Shape checks passed
$ npm run wave:verify -- --base=3f9c2a1 --branch=wave/w3-atomic-save

🔍 Conductor's check: wave/w3-atomic-save vs 3f9c2a1
   5 files changed · 2 code · 1 gates · 0 tests · 1 docs
   ⑤ ✅ The tree is clean
   ③ ✅ Types 2/2 · crash class zero (3 guarded codes)
   ① The wave's guards (1)
      ✅ test:save-atomic
   ⑤ ✅ The tree is clean after automatic commands
   ② Independent mutation: required from the Conductor.
      ☐ test:save-atomic
   ④ Verify the central claim independently.
      ☐ Write your own command and pass it with --claim, or run it separately.
✅ Automatic checks green for the commands run. Complete any remaining guard-file runs in ①, every mutation in ②, and the independent judgment in ④.
```

## What the Conductor did: step ②

The Executor replaced rename with a direct write. The Conductor instead corrupts the temporary file before the rename. The mutation changes the guarded behaviour, not the guard. A saved copy restores the exact source even if it was not recoverable from Git.

```
$ cp src/store.ts src/store.ts.before-mutation
$ python3 -c 'from pathlib import Path; p=Path("src/store.ts"); s=p.read_text(); old="writeFileSync(tmp, data)"; assert s.count(old)==1; p.write_text(s.replace(old, "writeFileSync(tmp, data.slice(0, -1))"))'
$ npm run test:save-atomic
🔴 notes.json failed to parse after kill 7 of 50: Unexpected end of JSON input
$ mv src/store.ts.before-mutation src/store.ts
$ npm run test:save-atomic
✅ 50 kills, 50 parseable files
$ git status --porcelain
```

The last command prints nothing. The guard caught a corrupt result even though the rename still ran; the source was then restored and the tree checked again.

## What the Conductor did: step ④

The claim is that an interrupted save leaves a complete, readable file on the supported local filesystem. The Conductor runs a separate process-interruption smoke probe through the CLI. Use a dedicated evidence directory outside any live workspace. The probe creates its own home directory and initializes the example app's JSON array there; no other writer runs. This POSIX example assumes the fictional CLI resolves its data directory from HOME. Verify that contract for the real application before running it.

```python
import json
import os
import signal
import subprocess
import tempfile
import time
import uuid
from pathlib import Path

# Set to a durable evidence directory owned by this review.
evidence = Path(os.environ["MAWJA_EVIDENCE_DIR"]).resolve()
assert evidence.is_dir()
with tempfile.TemporaryDirectory(prefix="notes-probe-", dir=evidence) as owned:
    env = dict(os.environ, HOME=owned)
    path = Path(owned) / ".keep" / "notes.json"
    path.parent.mkdir()
    path.write_text("[]")

    def read_notes():
        notes = json.loads(path.read_text())
        assert isinstance(notes, list) and all(isinstance(n, str) for n in notes)
        return notes

    before = read_notes()
    control = f"save control {uuid.uuid4()}"
    subprocess.run(["keep", "add", control], env=env, check=True)
    assert read_notes() == before + [control]

    interrupted = 0
    for i in range(20):
        before = read_notes()
        note = f"interruption probe {uuid.uuid4()}"
        process = subprocess.Popen(["keep", "add", note], env=env)
        try:
            time.sleep(0.01)
            if process.poll() is None:
                process.kill()
            code = process.wait()
        finally:
            if process.poll() is None:
                process.kill()
                process.wait()
        after = read_notes()
        if code == -signal.SIGKILL:
            interrupted += 1
            assert after in (before, before + [note])
        else:
            assert code == 0, f"CLI failed with exit {code}"
            assert after == before + [note]
    assert interrupted > 0, "No process was interrupted; this run tested no interruption."
    print(f"{interrupted} interrupted processes; every result was a complete old or new file.")
```

The probe first proves a successful save, rejects CLI failures, and checks the complete old or new contents after each attempt. It also refuses success if no process was interrupted. A process may be killed during CLI startup: this smoke probe does not establish that execution reached the write boundary. It does not prove atomic saving, every timing boundary, power-loss durability, or that an unfinished note was saved. A claim about interruption during the write itself requires synchronization on a verified write-boundary signal. The automatic guard and the Conductor's different mutation provide additional evidence about the partial-write failure. The Owner sees these limits with the recommendation.

## Structure review

The Conductor inspects the actual store and CLI diff, checks the supplied structure measurements and confirms that persistence decisions remain in the store. The review also covers temporary-file cleanup and error paths; a passing atomicity probe alone does not establish those properties.

## The verdict

| Step | Result |
|---|---|
| ① guards | the inherited regression checks and the newly discovered guard passed |
| ② mutation | the Conductor's different mutation failed on file parsing, then restoration passed |
| ③ types | 2/2, crash class zero |
| ④ claim | the CLI probe checked readability on a local disk, within the stated limits |
| ⑤ tree | clean after automatic commands and after restoring the mutation |

The Conductor confirms the evidence for debt #7, merges, writes the wave log, and records decision #10. Before publishing the integrated revision, the project hook runs full `npm run check`; the Conductor checks its result and retains the complete output. A failure blocks publication and requires correction and new applicable evidence. Network-filesystem support is a deliberate deferral F3 in `PROGRESS/FUTURE_ENHANCEMENTS.md`, with the trigger "first user requiring a network filesystem"; power-loss durability remains explicitly outside the promise. The wave is medium sensitivity. The report recommends "ship after the next backup"; the Owner decides when it ships.

---

[Previous: 02 · Implementation report](02-the-report.md) · [Workflow example index](README.md)
