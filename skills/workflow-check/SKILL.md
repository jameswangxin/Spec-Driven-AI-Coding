---
name: workflow-check
description: Use when an implemented .workflow requirement needs verification against its acceptance criteria, governance checklist, or schema before it can be closed.
---

# Verify a workflow requirement

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`, the target `REQ-*`, its plan or documented skip rationale, implementation record, referenced `CAP-*` records, and `.workflow/checks/workflow-checklist.md`.

2. **Assert preconditions**
   - Run `workflow-template --assert-status REQ-xxxx --status implemented`.
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`.

3. **Verify**
   - Check required files, frontmatter identity/status/history/dates, planning-risk rules, allowed status transition, links, and active/current pointers. Treat actual files and command output as evidence; plans and summaries are not evidence of completion.
   - Compare actual changes and recorded test evidence with every acceptance criterion. Require command, result, and note; when tests cannot run, require documented reason, alternative evidence, and residual risk.
   - Report gaps precisely and leave the REQ `implemented` until they are corrected. Do not claim validation based on planned commands or assumed results.

4. **Validate and sync**
   - After modifying any `.workflow/` file, run `workflow-template --validate`; fix validation failures before transitioning status.
   - When every applicable check passes, change `implemented -> verified`, append dated history, update dates and `.workflow/index.md`.

Verification records evidence; it never erases failures, risks, or deviations. If the target is not `implemented`, an acceptance criterion lacks evidence, or a required check cannot run without a documented alternative, stop and leave the status unchanged.
