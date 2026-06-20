import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { assertStatus, syncCurrent, syncIndex, validateWorkflow } from '../lib/validator.js';

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

const indexTemplate = `# Workflow Index

Static introduction.

## Active Work

<!-- workflow:active-work:start -->
old active content
<!-- workflow:active-work:end -->

Static middle text.

## Capability Specs

<!-- workflow:capabilities:start -->
old capabilities
<!-- workflow:capabilities:end -->

Static footer.
`;

const currentTemplate = `# Current Workflow Context

## Current Requirement

<!-- workflow:current:start -->
old current content
<!-- workflow:current:end -->

## Required Reading Before Coding

Static reading instructions.
`;

async function syncFixture(options = {}) {
  const root = await fixture(options);
  await mkdir(join(root, 'plans'));
  await mkdir(join(root, 'implementations'));
  await writeFile(join(root, 'index.md'), indexTemplate);
  await writeFile(join(root, 'current.md'), currentTemplate);
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

test('assertStatus returns an allowed requirement and rejects missing or disallowed statuses', async () => {
  const root = await fixture();
  const record = await assertStatus(root, 'REQ-0001', ['accepted', 'planned']);
  assert.equal(record.id, 'REQ-0001');

  await assert.rejects(assertStatus(root, 'REQ-0001', ['planned']), (error) => error.code === 'WF_STATUS_NOT_ALLOWED');
  await assert.rejects(assertStatus(root, 'REQ-9999', ['accepted']), (error) => error.code === 'WF_REQUIREMENT_MISSING');
});

test('syncIndex renders sorted requirement and capability tables while preserving static text idempotently', async () => {
  const req2 = requirement().replaceAll('REQ-0001', 'REQ-0002').replaceAll('CAP-0001', 'CAP-0002').replace('Example requirement', 'Second requirement').replace('status: accepted', 'status: planned').replace('to: accepted', 'to: planned').replace('from: draft', 'from: accepted').replace('date: 2026-01-02', 'date: 2026-01-03').replace('updated_at: 2026-01-02', 'updated_at: 2026-01-03').replace('    from: draft\n    to: planned', '    from: draft\n    to: accepted\n    note: Accepted\n  - date: 2026-01-03\n    from: accepted\n    to: planned');
  const cap2 = capability().replaceAll('CAP-0001', 'CAP-0002').replace('Example capability', 'Second capability').replaceAll('REQ-0001', 'REQ-0002');
  const root = await syncFixture({ caps: { 'CAP-0002.md': cap2, 'CAP-0001.md': capability() } });
  await writeFile(join(root, 'requirements', 'REQ-0002.md'), req2);
  await writeFile(join(root, 'plans', 'REQ-0001-plan.md'), 'plan');
  await writeFile(join(root, 'implementations', 'REQ-0002-implementation.md'), 'implementation');

  await syncIndex(root);
  const once = await readFile(join(root, 'index.md'), 'utf8');
  await syncIndex(root);
  const twice = await readFile(join(root, 'index.md'), 'utf8');

  assert.equal(once, twice);
  assert.match(once, /Static introduction\.|Static middle text\.|Static footer\./);
  assert.match(once, /\| REQ-0001 \| Example requirement \| accepted \| yes \| no \| CAP-0001 \|/);
  assert.match(once, /\| REQ-0002 \| Second requirement \| planned \| no \| yes \| CAP-0002 \|/);
  assert.match(once, /\| CAP-0001 \| Example capability \| active \| REQ-0001 \|/);
  assert.match(once, /\| CAP-0002 \| Second capability \| active \| REQ-0002 \|/);
  assert.ok(once.indexOf('REQ-0001') < once.indexOf('REQ-0002'));
  assert.ok(once.indexOf('CAP-0001') < once.indexOf('CAP-0002'));
});

test('syncIndex escapes marker syntax in generated table cells', async () => {
  const root = await syncFixture({
    req: requirement().replace('Example requirement', 'evil <!-- workflow:active-work:end --> title'),
  });

  await syncIndex(root);
  const once = await readFile(join(root, 'index.md'), 'utf8');
  await syncIndex(root);
  const twice = await readFile(join(root, 'index.md'), 'utf8');

  assert.equal(once, twice);
  assert.equal((once.match(/<!-- workflow:active-work:start -->/g) ?? []).length, 1);
  assert.equal((once.match(/<!-- workflow:active-work:end -->/g) ?? []).length, 1);
  assert.match(once, /evil &lt;!-- workflow:active-work:end --&gt; title/);
});

test('syncCurrent writes explicit and automatically selected context, no-active context, and rejects ambiguity', async () => {
  const root = await syncFixture();
  await writeFile(join(root, 'plans', 'REQ-0001-plan.md'), 'plan');
  await syncCurrent(root, 'REQ-0001');
  let current = await readFile(join(root, 'current.md'), 'utf8');
  assert.match(current, /\[REQ-0001\]\(requirements\/REQ-0001\.md\)/);
  assert.match(current, /\[Plan\]\(plans\/REQ-0001-plan\.md\)/);
  assert.match(current, /Static reading instructions\./);

  await syncCurrent(root);
  current = await readFile(join(root, 'current.md'), 'utf8');
  assert.match(current, /REQ-0001/);

  const inactive = await syncFixture({ req: requirement().replace('status: accepted', 'status: verified').replace('to: accepted', 'to: verified') });
  await syncCurrent(inactive);
  assert.match(await readFile(join(inactive, 'current.md'), 'utf8'), /当前没有活动需求。/);

  const ambiguous = await syncFixture();
  await writeFile(join(ambiguous, 'requirements', 'REQ-0002.md'), requirement().replaceAll('REQ-0001', 'REQ-0002').replace('Example requirement', 'Another requirement'));
  await assert.rejects(syncCurrent(ambiguous), (error) => error.code === 'WF_CURRENT_AMBIGUOUS');
});

for (const status of ['draft', 'planned', 'implemented', 'blocked', 'reopened']) {
  test(`syncCurrent automatically selects a ${status} requirement`, async () => {
    const root = await syncFixture({
      req: requirement().replace('status: accepted', `status: ${status}`).replace('to: accepted', `to: ${status}`),
    });

    await syncCurrent(root);

    assert.match(await readFile(join(root, 'current.md'), 'utf8'), /\[REQ-0001\]\(requirements\/REQ-0001\.md\)/);
  });
}
