import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { validateWorkflow } from '../lib/validator.js';

const requirement = (overrides = '') => `---
id: REQ-0001
title: Example requirement
status: accepted
complexity: simple
risk_tags: []
plan_required: false
plan_reason: No implementation plan needed
created_at: 2026-01-01
updated_at: 2026-01-02
references: []
capabilities:
  - CAP-0001
history:
  - date: 2026-01-01
    from: null
    to: draft
    note: Created
  - date: 2026-01-02
    from: draft
    to: accepted
    note: Accepted
${overrides}---
`;

const capability = (overrides = '') => `---
id: CAP-0001
title: Example capability
status: active
introduced_by: REQ-0001
updated_by:
  - REQ-0001
${overrides}---
`;

async function fixture({ reqName = 'REQ-0001.md', req = requirement(), caps = { 'CAP-0001.md': capability() } } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'workflow-validator-'));
  await mkdir(join(root, 'requirements'));
  await mkdir(join(root, 'capabilities'));
  await writeFile(join(root, 'requirements', reqName), req);
  await Promise.all(Object.entries(caps).map(([name, content]) => writeFile(join(root, 'capabilities', name), content)));
  return root;
}

const codes = (result) => result.diagnostics.map(({ code }) => code);

test('accepts a valid workflow', async () => {
  const result = await validateWorkflow(await fixture());
  assert.equal(result.valid, true);
  assert.equal(result.requirements.length, 1);
  assert.equal(result.capabilities.length, 1);
});

test('rejects an illegal draft to planned transition', async () => {
  const req = requirement().replace('status: accepted', 'status: planned').replace('to: accepted', 'to: planned');
  const result = await validateWorkflow(await fixture({ req }));
  assert.ok(codes(result).includes('WF_STATUS_TRANSITION_INVALID'));
});

test('rejects missing and deprecated capabilities', async () => {
  const missing = await validateWorkflow(await fixture({ caps: {} }));
  assert.ok(codes(missing).includes('WF_CAPABILITY_MISSING'));

  const deprecated = await validateWorkflow(await fixture({ caps: { 'CAP-0001.md': capability().replace('status: active', 'status: deprecated') } }));
  assert.ok(codes(deprecated).includes('WF_CAPABILITY_DEPRECATED'));
});

test('rejects a filename that does not match frontmatter id', async () => {
  const result = await validateWorkflow(await fixture({ reqName: 'REQ-9999.md' }));
  assert.ok(codes(result).includes('WF_FILENAME_ID_MISMATCH'));
});

test('rejects history whose final status differs from current status', async () => {
  const result = await validateWorkflow(await fixture({ req: requirement().replace('status: accepted', 'status: planned') }));
  assert.ok(codes(result).includes('WF_HISTORY_STATUS_MISMATCH'));
});

test('rejects invalid optional requirement field types', async () => {
  const req = requirement().replace('plan_reason: No implementation plan needed', 'plan_reason: No implementation plan needed\nowner:\n  - not-a-scalar\nreviewers: reviewer\napprovers:\n  - 42');
  const result = await validateWorkflow(await fixture({ req }));
  assert.ok(codes(result).includes('WF_REQ_SCHEMA_INVALID'));
});

test('rejects extra keys in a history entry', async () => {
  const req = requirement().replace('    note: Created', '    note: Created\n    unexpected: value');
  const result = await validateWorkflow(await fixture({ req }));
  assert.ok(codes(result).includes('WF_REQ_SCHEMA_INVALID'));
});
