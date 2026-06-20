---
name: workflow-plan
description: Use when an accepted .workflow requirement needs a technical plan or a documented decision that a plan may be skipped.
---

# Plan a workflow requirement

Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`, the accepted `REQ-*`, and referenced `CAP-*` records before planning.

Risk gate: a plan is mandatory when complexity is `medium` or `complex`, or `risk_tags` contains `data`, `security`, `migration`, `external-api`, `architecture`, or `cross-module`. A simple low-risk exception must record `plan_required: false` and a specific `plan_reason` in the requirement.

1. For a required plan, create `.workflow/plans/REQ-xxxx-plan.md` from the plan template: goals, non-goals, scope, design alternatives, data flow, interface/data changes, compatibility, migration, rollback, risks, and test strategy.
2. For an exception, record the justified skip in the REQ; do not create a fictional plan.
3. Obtain required user approval for the solution before implementation unless implementation authority already exists.
4. Change `accepted -> planned`, append dated history, update `updated_at`, `.workflow/index.md`, and the current/active pointer.

Never bypass the risk gate or move a draft requirement to planned.
