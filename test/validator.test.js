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

test('rejects numeric reviewer and approver items', async () => {
  const req = requirement().replace('plan_reason: No implementation plan needed', 'plan_reason: No implementation plan needed\nreviewers: [42]\napprovers:\n  - 7');
  const result = await validateWorkflow(await fixture({ req }));
  assert.ok(codes(result).includes('WF_REQ_SCHEMA_INVALID'));
});

test('rejects extra keys in a history entry', async () => {
  const req = requirement().replace('    note: Created', '    note: Created\n    unexpected: value');
  const result = await validateWorkflow(await fixture({ req }));
  assert.ok(codes(result).includes('WF_REQ_SCHEMA_INVALID'));
});

test('rejects bare collection keys instead of treating them as empty arrays', async () => {
  const req = requirement()
    .replace('risk_tags: []', 'risk_tags:')
    .replace('references: []', 'references:')
    .replace('capabilities:\n  - CAP-0001', 'capabilities:');
  const cap = capability().replace('updated_by:\n  - REQ-0001', 'updated_by:');
  const result = await validateWorkflow(await fixture({ req, caps: { 'CAP-0001.md': cap } }));
  assert.ok(codes(result).includes('WF_REQ_SCHEMA_INVALID'));
  assert.ok(codes(result).includes('WF_CAP_SCHEMA_INVALID'));
});

test('rejects duplicate top-level and history mapping keys', async () => {
  const duplicateTopLevel = requirement().replace('title: Example requirement', 'title: Example requirement\ntitle: Repeated title');
  const topLevel = await validateWorkflow(await fixture({ req: duplicateTopLevel }));
  assert.ok(codes(topLevel).includes('WF_FRONTMATTER_INVALID'));

  const duplicateHistoryKey = requirement().replace('    note: Created', '    note: Created\n    note: Repeated note');
  const history = await validateWorkflow(await fixture({ req: duplicateHistoryKey }));
  assert.ok(codes(history).includes('WF_FRONTMATTER_INVALID'));
});

test('rejects impossible ISO calendar dates', async () => {
  const invalidCreated = await validateWorkflow(await fixture({ req: requirement().replace('created_at: 2026-01-01', 'created_at: 2026-02-31') }));
  assert.ok(codes(invalidCreated).includes('WF_REQ_SCHEMA_INVALID'));

  const invalidUpdated = await validateWorkflow(await fixture({ req: requirement().replace('updated_at: 2026-01-02', 'updated_at: 2026-13-01') }));
  assert.ok(codes(invalidUpdated).includes('WF_UPDATED_AT_INVALID'));
});

test('accepts valid ISO dates in years below 0100', async () => {
  const req = requirement().replace('created_at: 2026-01-01', 'created_at: 0099-12-31').replaceAll('2026-01-02', '0099-12-31').replaceAll('2026-01-01', '0099-12-31');
  const result = await validateWorkflow(await fixture({ req }));
  assert.equal(result.valid, true);
});
