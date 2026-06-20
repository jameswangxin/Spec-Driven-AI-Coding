import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { inspect, install, uninstall } from '../lib/installer.js';

async function withTarget(run) {
  const target = await mkdtemp(join(tmpdir(), 'workflow-template-installer-'));

  try {
    await run(target);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

test('full install creates the project workflow file and reports workflowInstalled', async () => {
  await withTarget(async (target) => {
    const result = await install(target);

    assert.equal(result.workflowInstalled, true);
    assert.equal(await exists(join(target, '.workflow', 'project.md')), true);
  });
});

test('default install preserves an existing workflow file', async () => {
  await withTarget(async (target) => {
    const projectFile = join(target, '.workflow', 'project.md');
    await mkdir(join(target, '.workflow'), { recursive: true });
    await writeFile(projectFile, 'business-specific workflow\n');

    await install(target);

    assert.equal(await readFile(projectFile, 'utf8'), 'business-specific workflow\n');
  });
});

test('force install overwrites an existing template file', async () => {
  await withTarget(async (target) => {
    const projectFile = join(target, '.workflow', 'project.md');
    await mkdir(join(target, '.workflow'), { recursive: true });
    await writeFile(projectFile, 'outdated template\n');

    await install(target, { force: true });

    assert.notEqual(await readFile(projectFile, 'utf8'), 'outdated template\n');
  });
});

test('skillsOnly installs skills without creating a workflow directory', async () => {
  await withTarget(async (target) => {
    const result = await install(target, { skillsOnly: true });

    assert.equal(result.workflowInstalled, false);
    assert.equal(await exists(join(target, '.workflow', 'project.md')), false);
  });
});

test('initOnly installs the workflow without creating the skills directory', async () => {
  await withTarget(async (target) => {
    const result = await install(target, { initOnly: true });

    assert.equal(result.workflowInstalled, true);
    assert.equal(await exists(join(target, '.workflow', 'project.md')), true);
    assert.equal(await exists(join(target, '.agents', 'skills')), false);
  });
});

test('inspect does not write and reports missing managed files', async () => {
  await withTarget(async (target) => {
    const report = await inspect(target);

    assert.equal(await exists(join(target, '.workflow', 'project.md')), false);
    assert.ok(report.missing.includes('.workflow/project.md'));
  });
});

test('uninstall removes managed workflow contents but preserves custom skills and business files', async () => {
  await withTarget(async (target) => {
    const customSkill = join(target, '.agents', 'skills', 'custom', 'SKILL.md');
    const businessFile = join(target, 'README.md');
    await mkdir(join(target, '.agents', 'skills', 'custom'), { recursive: true });
    await writeFile(customSkill, '# Custom skill\n');
    await writeFile(businessFile, '# Business project\n');
    await install(target);

    const result = await uninstall(target);

    assert.equal(result.workflowUninstalled, true);
    assert.equal(await exists(join(target, '.workflow', 'project.md')), false);
    assert.equal(await readFile(customSkill, 'utf8'), '# Custom skill\n');
    assert.equal(await readFile(businessFile, 'utf8'), '# Business project\n');
  });
});

test('install rejects the user home directory as a target', async () => {
  await assert.rejects(install(homedir()), /home directory/i);
});
