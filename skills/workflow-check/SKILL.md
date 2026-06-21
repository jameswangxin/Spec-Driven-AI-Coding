---
name: workflow-check
description: Use when an implemented docs/changes proposal needs verification before it can be archived.
---

# Verify a workflow change package

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`, target `proposal.md`, `design.md` or skip rationale, `tasks.md`, `implementation.md`, incremental `specs/`, and `.workflow/checks/workflow-checklist.md`.

2. **Assert preconditions**
   - Run `workflow-template --assert-status REQ-xxxx --status implemented`.
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`.

3. **Verify**
   - Check required files, frontmatter identity/status/history/dates, planning-risk rules, allowed status transition, links, and active/current pointers. Treat actual files and command output as evidence; designs and summaries are not evidence of completion.
   - Compare actual changes and recorded test evidence with every acceptance criterion and task. Require command, result, and note; when tests cannot run, require documented reason, alternative evidence, and residual risk.
   - Create or update `verification.md` with actual command output, result, uncovered risks, and follow-up items.
   - Report gaps precisely and leave the proposal `implemented` until they are corrected.

4. **Validate and sync**
   - Run `workflow-template --validate`; fix validation failures before transitioning status.
   - When every applicable check passes, change `implemented -> verified`, append dated history, update dates and `.workflow/index.md`.

Verification records evidence; it never erases failures, risks, or deviations. If an acceptance criterion lacks evidence or a required check cannot run without a documented alternative, stop and leave the status unchanged.
