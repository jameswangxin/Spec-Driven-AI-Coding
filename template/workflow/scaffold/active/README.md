# Active workflow entries

Use this directory only when multiple requirements are in progress at the same time.

Each active entry should point to one change package under `docs/changes/` and should not duplicate business content.

Example:

```markdown
# REQ-0001 active context

- Proposal: `docs/changes/REQ-0001-short-title/proposal.md`
- Design: `docs/changes/REQ-0001-short-title/design.md`
- Tasks: `docs/changes/REQ-0001-short-title/tasks.md`
- Branch: `req-0001-short-title`
- Verification: `npm test`
```

Recommended reading order:

1. `.workflow/project.md`
2. `.workflow/playbook.md`
3. this active entry
4. proposal, design, tasks, implementation, and verification files in the linked change package

Delete the active entry after the change is archived, canceled, or superseded.
