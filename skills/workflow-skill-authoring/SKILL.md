---
name: workflow-skill-authoring
description: Use when creating or revising a project-local workflow Skill, especially when its trigger, scope, safety gate, or evidence requirements are unclear.
---

# Author project-local workflow Skills

Use this Skill only for the definitions under `skills/`. `.workflow/` remains the record for work performed by those Skills.

1. Inspect the closest existing Skill, `.workflow/project.md`, `.workflow/playbook.md`, and the relevant template, checklist, schema, or integration rule before editing.
2. Define one action boundary: trigger, required source records, permitted state changes, required evidence, and the condition that must stop or escalate work. Keep `description` limited to when the Skill should trigger.
3. Make the smallest change that preserves the workflow state machine and avoids creating a second record of truth. Do not duplicate global Superpowers content or add a new Skill when a local rule or template is sufficient.
4. Run `bash skills/validate-skills.sh`. When the change belongs to an active requirement, exercise the changed gate against one representative requirement or fixture and record the observed result in that requirement's implementation record.

Never claim a Skill is valid merely because its prose reads well: report the validation command and its result.
