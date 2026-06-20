import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
import { test } from 'node:test';

import { inspect, install, uninstall } from '../lib/installer.js';

const execFile = promisify(execFileCallback);
const CLI = join(process.cwd(), 'bin', 'workflow.js');

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

const WORKFLOW_SKILLS = [
  'workflow-new',
  'workflow-confirm',
  'workflow-plan',
  'workflow-exec',
  'workflow-check',
  'workflow-archive',
];

async function assertWorkflowSkills(target, expected) {
  for (const skill of WORKFLOW_SKILLS) {
    assert.equal(
      await exists(join(target, '.codex', 'skills', skill, 'SKILL.md')),
      expected,
      `expected ${skill} to ${expected ? 'exist' : 'be absent'}`,
    );
  }
}

test('full install creates the project workflow file and reports workflowInstalled', async () => {
  await withTarget(async (target) => {
    const result = await install({ target });

    assert.equal(result.workflowInstalled, true);
    assert.equal(await exists(join(target, '.workflow', 'project.md')), true);
    await assertWorkflowSkills(target, true);
  });
});

test('default install preserves an existing workflow file', async () => {
  await withTarget(async (target) => {
    const projectFile = join(target, '.workflow', 'project.md');
    await mkdir(join(target, '.workflow'), { recursive: true });
    await writeFile(projectFile, 'business-specific workflow\n');

    await install({ target });

    assert.equal(await readFile(projectFile, 'utf8'), 'business-specific workflow\n');
  });
});

test('force install overwrites an existing template file', async () => {
  await withTarget(async (target) => {
    const projectFile = join(target, '.workflow', 'project.md');
    await mkdir(join(target, '.workflow'), { recursive: true });
    await writeFile(projectFile, 'outdated template\n');

    await install({ target, force: true });

    assert.notEqual(await readFile(projectFile, 'utf8'), 'outdated template\n');
  });
});

test('force install overwrites an existing managed workflow skill', async () => {
  await withTarget(async (target) => {
    const skillFile = join(target, '.codex', 'skills', 'workflow-new', 'SKILL.md');
    const sourceFile = join('skills', 'workflow-new', 'SKILL.md');
    await install({ target });
    await writeFile(skillFile, 'outdated managed skill\n');

    await install({ target, force: true });

    assert.equal(await readFile(skillFile, 'utf8'), await readFile(sourceFile, 'utf8'));
  });
});

test('skillsOnly installs skills without creating a workflow directory', async () => {
  await withTarget(async (target) => {
    const result = await install({ target, skillsOnly: true });

    assert.equal(result.workflowInstalled, false);
    assert.equal(await exists(join(target, '.workflow', 'project.md')), false);
    await assertWorkflowSkills(target, true);
  });
});

test('Claude target installs only project Claude skills', async () => {
  await withTarget(async (target) => {
    await install({ target, skillsOnly: true, targetPlatform: 'claude' });
    for (const skill of WORKFLOW_SKILLS) {
      assert.equal(await exists(join(target, '.claude', 'skills', skill, 'SKILL.md')), true);
    }
    await assertWorkflowSkills(target, false);
  });
});

test('initOnly installs the workflow without installing managed skills', async () => {
  await withTarget(async (target) => {
    const result = await install({ target, initOnly: true });

    assert.equal(result.workflowInstalled, true);
    assert.equal(await exists(join(target, '.workflow', 'project.md')), true);
    await assertWorkflowSkills(target, false);
  });
});

test('inspect does not write and reports missing managed files', async () => {
  await withTarget(async (target) => {
    const entriesBefore = await readdir(target);
    assert.equal(await exists(join(target, '.workflow', 'project.md')), false);
    await assertWorkflowSkills(target, false);

    const report = await inspect({ target });

    assert.equal(await exists(join(target, '.workflow', 'project.md')), false);
    await assertWorkflowSkills(target, false);
    assert.deepEqual(await readdir(target), entriesBefore);
    assert.ok(report.missing.includes('.workflow/project.md'));
  });
});

test('uninstall removes managed workflow contents but preserves custom skills and business files', async () => {
  await withTarget(async (target) => {
    const customSkill = join(target, '.codex', 'skills', 'custom', 'SKILL.md');
    const businessFile = join(target, 'README.md');
    await mkdir(join(target, '.codex', 'skills', 'custom'), { recursive: true });
    await writeFile(customSkill, '# Custom skill\n');
    await writeFile(businessFile, '# Business project\n');
    await install({ target });
    await assertWorkflowSkills(target, true);

    const result = await uninstall({ target });

    assert.equal(result.workflowUninstalled, true);
    assert.equal(await exists(join(target, '.workflow', 'project.md')), false);
    await assertWorkflowSkills(target, false);
    assert.equal(await readFile(customSkill, 'utf8'), '# Custom skill\n');
    assert.equal(await readFile(businessFile, 'utf8'), '# Business project\n');
  });
});

test('uninstall preserves project workflow records while removing managed template files', async () => {
  await withTarget(async (target) => {
    const requirement = join(target, '.workflow', 'requirements', 'REQ-0001.md');
    await install({ target });
    await mkdir(join(target, '.workflow', 'requirements'), { recursive: true });
    await writeFile(requirement, '# User requirement\n');

    await uninstall({ target, initOnly: true });

    assert.equal(await exists(requirement), true);
    assert.equal(await exists(join(target, '.workflow', 'project.md')), false);
  });
});

test('install rejects the user home directory as a target', async () => {
  await assert.rejects(install({ target: homedir() }), /home directory/i);
});

test('install rejects a symlink that resolves to the user home directory', async () => {
  await withTarget(async (target) => {
    const home = join(target, 'simulated-home');
    const symlinkTarget = join(target, 'project-link');
    await mkdir(home);
    await symlink(home, symlinkTarget);

    await assert.rejects(install({ target: symlinkTarget, homeDir: home }), /home directory/i);
    assert.equal(await exists(join(home, '.workflow')), false);
  });
});

test('install rejects workflow and skills output symlinks', async () => {
  await withTarget(async (target) => {
    const outside = join(target, 'outside');
    await mkdir(outside);
    await symlink(outside, join(target, '.workflow'));
    await assert.rejects(install({ target, initOnly: true }), /symbolic link/i);
    await rm(join(target, '.workflow'));

    await symlink(outside, join(target, '.codex'));
    await assert.rejects(install({ target, skillsOnly: true }), /symbolic link/i);
    await rm(join(target, '.codex'));

    await mkdir(join(target, '.codex'));
    await symlink(outside, join(target, '.codex', 'skills'));
    await assert.rejects(install({ target, skillsOnly: true }), /symbolic link/i);
    assert.equal(await exists(join(outside, 'project.md')), false);
  });
});

test('CLI supports install modes, check, uninstall confirmation, and help', async () => {
  await withTarget(async (target) => {
    const help = await execFile(process.execPath, [CLI, '--help'], { cwd: target });
    assert.match(help.stdout, /Usage:/);

    await execFile(process.execPath, [CLI, '--init-only'], { cwd: target });
    assert.equal(await exists(join(target, '.workflow', 'project.md')), true);
    await assert.rejects(
      execFile(process.execPath, [CLI, '--uninstall'], { cwd: target }),
      /--yes/,
    );

    await execFile(process.execPath, [CLI, '--skills-only'], { cwd: target });
    await assertWorkflowSkills(target, true);
    await execFile(process.execPath, [CLI, '--check'], { cwd: target });
    await execFile(process.execPath, [CLI, '--uninstall', '--yes'], { cwd: target });

    await assert.rejects(execFile(process.execPath, [CLI, '--check'], { cwd: target }), { code: 1 });
  });
});
