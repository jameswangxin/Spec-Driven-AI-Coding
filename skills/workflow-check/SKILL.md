---
name: workflow-check
description: Use when an implemented .workflow requirement needs verification against its acceptance criteria, governance checklist, or schema before it can be closed.
---

# Verify a workflow requirement

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`.
   - Read the target `REQ-*` file.
   - Read `.workflow/plans/REQ-xxxx-plan.md` or the documented skip rationale.
   - Read `.workflow/implementations/REQ-xxxx-implementation.md`.
   - Read any referenced `CAP-*` files.
   - Read `.workflow/checks/workflow-checklist.md`.

2. **Assert preconditions**
   - Before verification, run:
     `workflow-template --assert-status REQ-xxxx --status implemented`
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`.

3. **Verify**
   - Check required files, frontmatter identity/status/history/dates, planning-risk rules, allowed status transition, links, and active/current pointers.
   - Compare actual changes and recorded test evidence with every acceptance criterion.
   - Report gaps precisely and leave the REQ `implemented` until they are corrected.

4. **Validate and sync**
   - After modifying any `.workflow/` file, run `workflow-template --validate`.
   - If validation fails, fix the records before transitioning status.
   - When every applicable check passes, change `implemented -> verified`, append dated history, update dates and `.workflow/index.md`.

Verification records evidence; it never erases failures, risks, or deviations.
