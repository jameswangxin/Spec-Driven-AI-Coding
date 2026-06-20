import { cp, lstat, mkdir, readdir, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE_ROOT = join(ROOT, 'template', 'workflow');
const SKILLS_ROOT = join(ROOT, 'skills');
const WORKFLOW_SKILLS = [
  'workflow-new', 'workflow-confirm', 'workflow-plan',
  'workflow-exec', 'workflow-check', 'workflow-archive',
];

function targetPaths(target, homeDir) {
  if (typeof target !== 'string' || target.trim() === '') {
    throw new TypeError('target must be a non-empty path');
  }
  const base = resolve(target);
  if (base === resolve(homeDir ?? homedir())) {
    throw new Error('Refusing to install into the user home directory');
  }
  return { base, workflow: join(base, '.workflow'), skills: join(base, '.codex', 'skills') };
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

async function copySource(source, destination, force) {
  const entry = await lstat(source);
  if (entry.isSymbolicLink()) throw new Error(`Refusing symbolic-link source: ${source}`);
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

async function skillState(paths) {
  const installed = [];
  const missing = [];
  for (const name of WORKFLOW_SKILLS) {
    ((await present(join(paths.skills, name, 'SKILL.md'))) ? installed : missing).push(name);
  }
  return { installed, missing };
}

export async function inspect({ target, homeDir } = {}) {
  const paths = targetPaths(target, homeDir);
  const skills = await skillState(paths);
  const workflowInstalled = await present(join(paths.workflow, 'project.md'));
  return {
    target: paths.base,
    workflowInstalled,
    skillsInstalled: skills.installed,
    missing: [
      ...(workflowInstalled ? [] : ['.workflow/project.md']),
      ...skills.missing.map((name) => `.codex/skills/${name}/SKILL.md`),
    ],
  };
}

export async function install({ target, force = false, skillsOnly = false, initOnly = false, homeDir } = {}) {
  if (skillsOnly && initOnly) throw new Error('skillsOnly and initOnly cannot be used together');
  const paths = targetPaths(target, homeDir);
  if (!skillsOnly) {
    const templateMappings = [
      { source: ['scaffold'], destination: [] },
      { source: ['document-templates'], destination: ['templates'] },
      { source: ['governance', 'checks'], destination: ['checks'] },
      { source: ['governance', 'schema'], destination: ['schema'] },
      { source: ['integrations'], destination: ['integrations'] },
    ];
    for (const mapping of templateMappings) {
      await copySource(
        sourcePath(TEMPLATE_ROOT, ...mapping.source),
        join(paths.workflow, ...mapping.destination),
        force,
      );
    }
  }
  if (!initOnly) {
    for (const name of WORKFLOW_SKILLS) {
      await copySource(sourcePath(SKILLS_ROOT, name), join(paths.skills, name), false);
    }
  }
  return inspect({ target: paths.base, homeDir });
}

export async function uninstall({ target, skillsOnly = false, initOnly = false, homeDir } = {}) {
  if (skillsOnly && initOnly) throw new Error('skillsOnly and initOnly cannot be used together');
  const paths = targetPaths(target, homeDir);
  let workflowUninstalled = false;
  if (!skillsOnly && await present(paths.workflow)) {
    await rm(paths.workflow, { recursive: true, force: true });
    workflowUninstalled = true;
  }
  if (!initOnly) {
    for (const name of WORKFLOW_SKILLS) {
      const directory = join(paths.skills, name);
      if (await present(join(directory, 'SKILL.md'))) await rm(directory, { recursive: true, force: true });
    }
  }
  return { target: paths.base, workflowUninstalled, ...(await skillState(paths)) };
}
