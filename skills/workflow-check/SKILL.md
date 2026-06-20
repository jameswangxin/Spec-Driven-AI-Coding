---
name: workflow-check
description: Use when an implemented .workflow requirement needs verification against its acceptance criteria, governance checklist, or schema before it can be closed.
---

# Verify a workflow requirement

Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`, the target `REQ-*`, its plan/skip rationale, implementation record, and referenced capabilities. Use `.workflow/checks/workflow-checklist.md` and the requirement schema as the acceptance gate.

1. Check required files, frontmatter identity/status/history/dates, planning-risk rules, allowed status transition, links, and active/current pointers.
2. Compare actual changes and recorded test evidence with every acceptance criterion. Require command, result, and note; when tests cannot run, require documented reason, alternative evidence, and residual risk.
3. Report gaps precisely and leave the REQ `implemented` until they are corrected. Do not claim validation based on planned commands or assumed results.
4. When every applicable check passes, change `implemented -> verified`, append dated history, update dates and `.workflow/index.md`.

Verification records evidence; it never erases failures, risks, or deviations.
