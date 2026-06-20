---
name: workflow-confirm
description: Use when a draft .workflow requirement needs clarification, acceptance, or a decision about whether it is ready for planning.
---

# Confirm a workflow requirement

Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`, and the target `REQ-*` before changing it. Treat `.workflow/` as the unique record of the decision.

1. Resolve terms, rules, relevant modules, data flow, permissions, security, consistency, boundaries, and observable acceptance criteria.
2. Put unresolved material questions in **待确认问题** and ask the user. Keep the requirement `draft` until they answer.
3. After explicit confirmation, change only `draft -> accepted`; append a dated `history` entry with the confirmation reason, update `updated_at`, and update `.workflow/index.md` and the current/active pointer.
4. Record any non-mainline transition with reason, impact, and next step. Never silently rewrite original requirements.

Acceptance means intent and boundaries are understood; it is not authorization to implement.
