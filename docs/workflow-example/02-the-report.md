# 02 · Implementation report

An example Executor report for the [fictional notes app](README.md). The reviewer checks the delivered behavior, mutation evidence and stated limitations.

```
🛑 Wave W3: Atomic save is ready.
   Branch: wave/w3-atomic-save   Commit: b71e04d
   Delivered: save() writes notes.json.tmp and renames it over notes.json;
              the CLI waits for save before reporting success.
              test:save-atomic checks file readability across 50 process kills.
              Debt #7 marked closed with evidence for the Conductor to confirm.
              Proposed decision #10: save by same-directory temporary file and
              rename on the supported local filesystem.
   Measurements changed since task preparation: live gates 3 → 4;
              open debt 2 → 1; next free number remains #9.
   Guard + mutation: replaced rename with a direct write; the guard failed to
              parse the file in 3 of 50 kills. Restored; the guard passed.
   What I could not measure: power loss and filesystems without atomic rename,
              including network mounts. The guard ran on a local disk only.
              A note interrupted before save completes may be absent.
   AI call cost: 0.42 USD
   ⇒ For the owner: interrupted saves kept the file readable in the local-disk
              checks. This does not promise the last unfinished note is saved.
              Recommendation: ship after the next backup.
```

Review points:

- **Mutation evidence.** The Conductor must introduce a different relevant fault.
- **Unverified behavior.** Check the unsupported conditions and the limit on saving an unfinished note.
- **Counter changes.** Verify that the added guard and closed debt account for the reported counts.

---

[Previous: 01 · Task prompt](01-the-prompt.md) · [Workflow example index](README.md) · [Next: 03 · The verification, on the branch](03-the-verification.md)
