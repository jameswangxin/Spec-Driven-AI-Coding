#!/usr/bin/env node
import { parseArgs } from 'node:util';

import { inspect, install, uninstall } from '../lib/installer.js';
import { assertStatus, syncCurrent, syncIndex, validateWorkflow } from '../lib/validator.js';

const HELP = `Usage: workflow-template [options]

Install and operate the workflow template in the current directory.
  --skills-only          Install only managed workflow skills
  --target <platform>    Select codex, claude, or all (default: codex)
  --with-claude-md       Create a minimal CLAUDE.md only when absent
  --init-only            Install only .workflow template files
  --check                Report managed installation files
  --validate             Validate workflow records and references
  --sync-index           Rebuild managed index tables from workflow records
  --sync-current [id]    Synchronize current context; optionally select REQ-xxxx
  --assert-status [id]   Assert a requirement is in an allowed status
  --status <status>      Allowed status for --assert-status (repeatable)
  --format <format>      Output human or json (default: human)
  --uninstall --yes      Remove managed files
  --help                 Show this help`;

function parse(argv) {
  const normalizedArgs = [];
  for (let index = 0; index < argv.length; index += 1) {
    normalizedArgs.push(argv[index]);
    if (argv[index] === '--sync-current' && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      normalizedArgs.push(`--sync-current-id=${argv[index + 1]}`);
      index += 1;
    }
    if (argv[index] === '--assert-status' && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      normalizedArgs.push(`--assert-status-id=${argv[index + 1]}`);
      index += 1;
    }
  }
  const { values, positionals } = parseArgs({
    args: normalizedArgs,
    allowPositionals: false,
    options: {
      help: { type: 'boolean' },
      'skills-only': { type: 'boolean' },
      'init-only': { type: 'boolean' },
      check: { type: 'boolean' },
      validate: { type: 'boolean' },
      'sync-index': { type: 'boolean' },
      'sync-current': { type: 'boolean' },
      'sync-current-id': { type: 'string' },
      'assert-status': { type: 'boolean' },
      'assert-status-id': { type: 'string' },
      status: { type: 'string', multiple: true },
      uninstall: { type: 'boolean' },
      yes: { type: 'boolean' },
      'with-claude-md': { type: 'boolean' },
      target: { type: 'string', default: 'codex' },
      format: { type: 'string', default: 'human' },
    },
  });
  if (positionals.length > 0) throw new Error(`Unexpected argument: ${positionals[0]}`);
  if (!['codex', 'claude', 'all'].includes(values.target)) throw new Error('--target must be codex, claude, or all');
  if (!['human', 'json'].includes(values.format)) throw new Error('--format must be human or json');
  const commands = ['check', 'validate', 'sync-index', 'sync-current', 'assert-status', 'uninstall'].filter((key) => values[key] !== undefined && values[key] !== false);
  if (commands.length > 1) throw new Error('Only one operation command may be used at a time');
  if (commands.length > 0 && (values['skills-only'] || values['init-only'])) throw new Error('Operation commands cannot be combined with install mode options');
  return { ...values, command: commands[0] };
}

function print(value, format) {
  if (format === 'json') console.log(JSON.stringify(value, null, 2));
  else console.log(value);
}

try {
  const options = parse(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
  } else if (options.command === 'validate') {
    const report = await validateWorkflow(`${process.cwd()}/.workflow`);
    if (options.format === 'json') print(report, options.format);
    else if (report.valid) print('Workflow validation passed.', options.format);
    else for (const item of report.diagnostics) print(`${item.severity.toUpperCase()} ${item.code} ${item.path}: ${item.message}`, options.format);
    if (!report.valid) process.exitCode = 1;
  } else if (options.command === 'sync-index') {
    await syncIndex(`${process.cwd()}/.workflow`);
    print('Workflow index synchronized.', options.format);
  } else if (options.command === 'sync-current') {
    await syncCurrent(`${process.cwd()}/.workflow`, options['sync-current-id']);
    print('Workflow current context synchronized.', options.format);
  } else if (options.command === 'assert-status') {
    if (!options['assert-status-id']) throw new Error('--assert-status requires a REQ-xxxx argument');
    if (!options.status || options.status.length === 0) throw new Error('--assert-status requires at least one --status');
    await assertStatus(`${process.cwd()}/.workflow`, options['assert-status-id'], options.status);
    print(`Requirement ${options['assert-status-id']} status is allowed.`, options.format);
  } else if (options.command === 'check') {
    const report = await inspect({ target: process.cwd(), targetPlatform: options.target });
    print(report, 'json');
    if (report.missing.length > 0) process.exitCode = 1;
  } else if (options.command === 'uninstall') {
    if (!options.yes) throw new Error('--uninstall requires --yes');
    print(await uninstall({ target: process.cwd(), targetPlatform: options.target }), 'json');
  } else {
    print(await install({
      target: process.cwd(), skillsOnly: options['skills-only'], initOnly: options['init-only'],
      targetPlatform: options.target, withClaudeMd: options['with-claude-md'],
    }), 'json');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
