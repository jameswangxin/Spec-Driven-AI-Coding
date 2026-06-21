import { cp, lstat, mkdir, readdir, realpath, rm, rmdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE_ROOT = join(ROOT, 'template', 'workflow');
const DOCS_TEMPLATE_ROOT = join(ROOT, 'template', 'docs');
const SKILLS_ROOT = join(ROOT, 'skills');
const WORKFLOW_SKILLS = [
  'workflow-new', 'workflow-confirm', 'workflow-plan',
  'workflow-exec', 'workflow-check', 'workflow-archive',
];
const TEMPLATE_MAPPINGS = [
  { source: ['scaffold'], destination: [] },
  { source: ['document-templates'], destination: ['templates'] },
  { source: ['governance', 'checks'], destination: ['checks'] },
  { source: ['governance', 'schema'], destination: ['schema'] },
  { source: ['integrations'], destination: ['integrations'] },
];

async function canonicalPath(path) {
  const requested = resolve(path);
  const missing = [];
  let existing = requested;

  while (true) {
    try {
      return resolve(await realpath(existing), ...missing.reverse());
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = dirname(existing);
      if (parent === existing) throw error;
      missing.push(basename(existing));
      existing = parent;
    }
  }
}

async function targetPaths(target, homeDir) {
  if (typeof target !== 'string' || target.trim() === '') {
    throw new TypeError('target must be a non-empty path');
  }
  const base = await canonicalPath(target);
  if (base === await canonicalPath(homeDir ?? homedir())) {
    throw new Error('Refusing to install into the user home directory');
  }
  return {
    base,
    workflow: join(base, '.workflow'),
    docs: join(base, 'docs'),
    codex: join(base, '.codex'),
    skills: join(base, '.codex', 'skills'),
    claude: join(base, '.claude'),
    claudeSkills: join(base, '.claude', 'skills'),
  };
}

function sourcePath(root, ...parts) {
  const candidate = resolve(root, ...parts);
  if (relative(root, candidate).startsWith('..')) {
    throw new Error('Source path escapes the package root');
  }
  return candidate;
}

async function present(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function rejectSymbolicLink(path) {
  try {
    if ((await lstat(path)).isSymbolicLink()) {
      throw new Error(`Refusing symbolic link output path: ${path}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
}

async function assertSafeOutputPaths(paths, { workflow, docs, skills }) {
  if (workflow) await rejectSymbolicLink(paths.workflow);
  if (docs) await rejectSymbolicLink(paths.docs);
  if (skills) {
    await rejectSymbolicLink(paths.codex);
    await rejectSymbolicLink(paths.skills);
  }
}

async function assertSafeClaudePaths(paths) {
  await rejectSymbolicLink(paths.claude);
  await rejectSymbolicLink(paths.claudeSkills);
}

async function copySource(source, destination, force) {
  const entry = await lstat(source);
  if (entry.isSymbolicLink()) throw new Error(`Refusing symbolic-link source: ${source}`);
  await rejectSymbolicLink(destination);
  if (!entry.isDirectory()) {
    if (force || !(await present(destination))) {
      await mkdir(dirname(destination), { recursive: true });
      await cp(source, destination, { force });
    }
    return;
  }
  await mkdir(destination, { recursive: true });
  for (const child of await readdir(source)) {
    await copySource(sourcePath(source, child), join(destination, child), force);
  }
}

async function removeManagedSource(source, destination) {
  const entry = await lstat(source);
  if (entry.isDirectory()) {
    let removed = false;
    for (const child of await readdir(source)) {
      removed = (await removeManagedSource(sourcePath(source, child), join(destination, child))) || removed;
    }
    try {
      await rmdir(destination);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTEMPTY') return removed;
      throw error;
    }
  }
  if (!(await present(destination))) return false;
  await rm(destination, { force: true });
  return true;
}

async function skillState(paths, platform = 'codex') {
  const root = platform === 'claude' ? paths.claudeSkills : paths.skills;
  const installed = [];
  const missing = [];
  for (const name of WORKFLOW_SKILLS) {
    ((await present(join(root, name, 'SKILL.md'))) ? installed : missing).push(name);
  }
  return { installed, missing };
}

export async function inspect({ target, homeDir, targetPlatform = 'codex' } = {}) {
  const paths = await targetPaths(target, homeDir);
  if (!['codex', 'claude', 'all'].includes(targetPlatform)) throw new Error('targetPlatform must be codex, claude, or all');
  const skills = await skillState(paths, targetPlatform === 'claude' ? 'claude' : 'codex');
  const workflowInstalled = await present(join(paths.workflow, 'project.md'));
  const docsScaffold = [
    'docs/changes',
    'docs/changes/archive',
    'docs/specs',
  ];
  return {
    target: paths.base,
    workflowInstalled,
    skillsInstalled: skills.installed,
    missing: [
      ...(workflowInstalled ? [] : ['.workflow/project.md']),
      ...(await Promise.all(docsScaffold.map((path) => present(join(paths.base, path))))).flatMap((installed, index) => (
        installed ? [] : [docsScaffold[index]]
      )),
      ...skills.missing.map((name) => `.${targetPlatform === 'claude' ? 'claude' : 'codex'}/skills/${name}/SKILL.md`),
    ],
  };
}

export async function install({ target, force = false, skillsOnly = false, initOnly = false, homeDir, targetPlatform = 'codex', withClaudeMd = false } = {}) {
  if (skillsOnly && initOnly) throw new Error('skillsOnly and initOnly cannot be used together');
  const paths = await targetPaths(target, homeDir);
  await assertSafeOutputPaths(paths, { workflow: !skillsOnly, docs: !skillsOnly, skills: !initOnly });
  if (!initOnly && (targetPlatform === 'claude' || targetPlatform === 'all')) await assertSafeClaudePaths(paths);
  if (!skillsOnly) {
    for (const mapping of TEMPLATE_MAPPINGS) {
      await copySource(
        sourcePath(TEMPLATE_ROOT, ...mapping.source),
        join(paths.workflow, ...mapping.destination),
        force,
      );
    }
    await copySource(sourcePath(DOCS_TEMPLATE_ROOT, 'scaffold'), paths.docs, force);
  }
  if (!['codex', 'claude', 'all'].includes(targetPlatform)) throw new Error('targetPlatform must be codex, claude, or all');
  if (!initOnly) {
    for (const name of WORKFLOW_SKILLS) {
      if (targetPlatform === 'codex' || targetPlatform === 'all') {
        await copySource(sourcePath(SKILLS_ROOT, name), join(paths.skills, name), force);
      }
      if (targetPlatform === 'claude' || targetPlatform === 'all') {
        await copySource(sourcePath(SKILLS_ROOT, name), join(paths.claudeSkills, name), force);
      }
    }
  }
  if (withClaudeMd) {
    const guide = join(paths.base, 'CLAUDE.md');
    if (!(await present(guide))) await writeFile(guide, '# Project workflow\n\n@.workflow/project.md\n@.workflow/current.md\n\nUse `.workflow/` as the only requirement, plan, implementation, and verification record.\n');
  }
  return inspect({ target: paths.base, homeDir, targetPlatform });
}

export async function uninstall({ target, skillsOnly = false, initOnly = false, homeDir, targetPlatform = 'codex' } = {}) {
  if (skillsOnly && initOnly) throw new Error('skillsOnly and initOnly cannot be used together');
  const paths = await targetPaths(target, homeDir);
  await assertSafeOutputPaths(paths, { workflow: !skillsOnly, docs: !skillsOnly, skills: !initOnly });
  if (!initOnly && (targetPlatform === 'claude' || targetPlatform === 'all')) await assertSafeClaudePaths(paths);
  let workflowUninstalled = false;
  if (!skillsOnly) {
    for (const mapping of TEMPLATE_MAPPINGS) {
      workflowUninstalled = (await removeManagedSource(
        sourcePath(TEMPLATE_ROOT, ...mapping.source),
        join(paths.workflow, ...mapping.destination),
      )) || workflowUninstalled;
    }
    workflowUninstalled = (await removeManagedSource(
      sourcePath(DOCS_TEMPLATE_ROOT, 'scaffold'),
      paths.docs,
    )) || workflowUninstalled;
  }
  if (!initOnly && (targetPlatform === 'codex' || targetPlatform === 'all')) {
    for (const name of WORKFLOW_SKILLS) {
      const directory = join(paths.skills, name);
      if (await present(join(directory, 'SKILL.md'))) await rm(directory, { recursive: true, force: true });
    }
  }
  if (!initOnly && (targetPlatform === 'claude' || targetPlatform === 'all')) {
    for (const name of WORKFLOW_SKILLS) await rm(join(paths.claudeSkills, name), { recursive: true, force: true });
  }
  return { target: paths.base, workflowUninstalled, ...(await skillState(paths, targetPlatform === 'claude' ? 'claude' : 'codex')) };
}
