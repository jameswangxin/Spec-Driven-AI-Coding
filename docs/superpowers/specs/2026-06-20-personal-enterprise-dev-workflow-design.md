# Personal Enterprise Development Workflow Design

## Purpose

This project defines a lightweight, project-local workflow protocol for personal enterprise-grade development. It separates "what is required" from "how it will be implemented" so an Agent can read stable context before coding.

The workflow must support:

- Numbered requirements with status and meaningful history.
- Plans before medium, complex, or high-risk implementation work.
- Traceable implementation scope, test results, and residual risks.
- Future requirements referencing prior requirements and reusable capability specs.

## Chosen Approach

Use a single `.workflow/` directory as the source of truth. This keeps the protocol easy to copy into any repository while preserving enough structure to become a skill package or CLI later.

```text
.workflow/
  index.md
  current.md
  requirements/
    REQ-0001.md
  plans/
    REQ-0001-plan.md
  implementations/
    REQ-0001-implementation.md
  capabilities/
    CAP-0001.md
  templates/
    requirement.md
    plan.md
    implementation.md
    capability.md
```

## Core Files

### `.workflow/index.md`

`index.md` is the long-lived overview. It tracks requirements, status, references, capability specs, and important workflow notes.

It should be readable by both humans and Agents. It is not a full database; detailed context stays in the individual requirement, plan, implementation, and capability files.

### `.workflow/current.md`

`current.md` is the fixed Agent entry point before coding. It should identify:

- The current requirement.
- Required files to read before work.
- Allowed scope.
- Out-of-scope areas.
- Known risks.
- Required verification.

Agents must start from `current.md`, then follow links to the relevant requirement, plan, implementation record, and capability specs.

## Requirement Model

Requirements use a single increasing ID sequence:

```text
REQ-0001
REQ-0002
REQ-0003
```

Each requirement lives in `.workflow/requirements/REQ-0001.md` and contains fixed frontmatter plus human-readable context.

```yaml
---
id: REQ-0001
title: Establish agent workflow context
status: draft
complexity: medium
risk_tags: [architecture]
created_at: 2026-06-20
updated_at: 2026-06-20
references: []
capabilities: []
history:
  - date: 2026-06-20
    from: null
    to: draft
    note: Initial creation
---
```

Supported requirement statuses:

```text
draft -> accepted -> planned -> implemented -> verified -> archived
```

Status meanings:

- `draft`: the requirement is still being shaped.
- `accepted`: scope and intent are clear enough to plan or implement.
- `planned`: the required plan exists, or the requirement explicitly does not need one.
- `implemented`: code changes are complete and implementation details are recorded.
- `verified`: tests or equivalent verification have passed and are recorded.
- `archived`: the requirement is closed but remains available for reference.

History should record important status transitions and scope changes. It should not record every wording edit.

## Planning Rule

Each requirement has:

- `complexity: simple|medium|complex`
- `risk_tags: []`

A plan is required when either condition is true:

- `complexity` is `medium` or `complex`.
- `risk_tags` includes `data`, `security`, `migration`, `external-api`, `architecture`, or `cross-module`.

Simple requirements without high-risk tags may skip a plan, but the requirement must record `plan_required: false` and explain why.

Plans live in `.workflow/plans/REQ-0001-plan.md`. A plan must cover:

- Goal.
- Non-goals.
- Change scope.
- Design decisions.
- Test strategy.
- Risks and rollback.

Plans should define implementation boundaries without becoming code-level instructions.

## Implementation Record

Each requirement has at most one implementation record:

```text
.workflow/implementations/REQ-0001-implementation.md
```

The record is append-only in spirit. It tracks all implementation work associated with that requirement.

Required sections:

- Scope changed.
- Commits or pull requests.
- Tests.
- Risks.
- Follow-ups.

Example:

```markdown
# REQ-0001 Implementation

## Scope Changed
- `src/auth/*`: added login flow
- `tests/auth/*`: covered success and failure paths

## Commits / PRs
- commit: pending
- PR: pending

## Tests
- `npm test -- auth`: passed
- `npm run lint`: passed

## Risks
- Token expiration strategy only covers the baseline path.

## Follow-ups
- REQ-0002: add refresh token support
```

Before a requirement enters `implemented`, its implementation record must exist.

Before a requirement enters `verified`, the `Tests` section must include the actual commands and results. If tests could not run, the record must explain why, describe substitute verification, and list residual risk.

## Capability Specs

Capability specs describe reusable system capabilities, constraints, or interface agreements. They are separate from requirements:

- A requirement says what change should be delivered.
- A capability spec says what the system can now do and how future work can reuse it.

Capability IDs use their own sequence:

```text
CAP-0001
CAP-0002
```

Capability specs live in `.workflow/capabilities/CAP-0001.md`.

```yaml
---
id: CAP-0001
title: Agent pre-coding context entry point
status: active
introduced_by: REQ-0001
updated_by: []
---
```

Capability specs should include:

- Boundary.
- Usage.
- Dependencies.
- Constraints.
- Example references.

Requirements may reference prior requirements and capabilities:

```yaml
references:
  - REQ-0001
capabilities:
  - CAP-0001
```

This allows future Agents to reuse established behavior without depending on chat history.

## Templates

The initial protocol provides four templates:

- `.workflow/templates/requirement.md`
- `.workflow/templates/plan.md`
- `.workflow/templates/implementation.md`
- `.workflow/templates/capability.md`

Templates should include only required structure and short prompts. They should not become large forms.

## Agent Rules

Agents must follow these rules:

- If the requirement file is missing, create a draft requirement first and do not start implementation in the same step.
- If the requirement status is not at least `accepted`, do not start implementation.
- If a plan is required but missing, create the plan first and do not start implementation in the same step.
- If tests cannot run, record the reason, substitute verification, and residual risk in the implementation record.
- If the needed code change exceeds `current.md` scope, update the plan or split a new requirement before continuing.

## Workflow Checks

The first version uses human-checkable rules. Later, these can become CLI validation commands.

Manual checks:

- Requirement IDs are unique and increasing.
- Status values are valid.
- Medium, complex, or high-risk requirements have plans.
- Simple requirements that skip plans explain why.
- Implementation records include scope, tests, risks, and follow-ups.
- Referenced `REQ-*` and `CAP-*` files exist.
- `current.md` points to the active requirement and required context.

## Out of Scope

The initial design does not include:

- A CLI implementation.
- Automatic state transitions.
- Generated reports.
- Integration with GitHub issues, pull requests, or CI.
- Multi-user review and approval workflows.

These can be added after the file protocol is stable.
