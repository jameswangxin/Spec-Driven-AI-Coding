---
name: workflow-confirm
description: Use when a draft docs/changes proposal needs clarification, acceptance, or a decision about whether it is ready for design.
---

# Confirm a workflow change proposal

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`, and the target `docs/changes/REQ-xxxx-title/proposal.md`.

2. **Assert preconditions**
   - Run `workflow-template --assert-status REQ-xxxx --status draft`.
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`.

3. **Clarify and confirm**
   - Resolve terms, rules, relevant modules, data flow, permissions, security, consistency, boundaries, and observable acceptance criteria.
   - Put unresolved material questions in **待确认问题** and ask the user. Keep the proposal `draft` until they answer; do not infer approval from silence, a partial answer, or an implementation request.
   - After explicit confirmation, check that every acceptance criterion is observable and that the stated scope has a boundary. Change only `draft -> accepted`; append a dated history entry with the confirmation reason, update `updated_at`, `.workflow/index.md`, and the current/active pointer.
   - Record any non-mainline transition with reason, impact, and next step. Never silently rewrite original requirements.

4. **Validate and sync**
   - Run `workflow-template --validate`; fix validation failures before continuing.
   - Run `workflow-template --sync-index` and `workflow-template --sync-current REQ-xxxx` when this is the current work item.

Acceptance means intent and boundaries are understood; it is not authorization to implement. If the target is not `draft`, required source records are missing, or a material question remains, stop and report the gate that prevented promotion.
