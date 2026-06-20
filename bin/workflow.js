#!/usr/bin/env node
import { inspect, install, uninstall } from '../lib/installer.js';

const HELP = `Usage: workflow-template [--skills-only | --init-only] [--check | --uninstall --yes]

Install the workflow template and managed workflow skills in the current directory.
  --skills-only  Install only managed workflow skills
  --init-only    Install only .workflow template files
  --check        Report managed files; exits 1 when any are missing
  --uninstall    Remove managed files (requires --yes)
  --yes          Confirm uninstall
  --help         Show this help`;

function parse(argv) {
  const flags = new Set(argv);
  const allowed = new Set(['--help', '--skills-only', '--init-only', '--check', '--uninstall', '--yes']);
  for (const flag of flags) if (!allowed.has(flag)) throw new Error(`Unknown option: ${flag}`);
  if (flags.has('--help')) return { help: true };
  if (flags.has('--check') && (flags.has('--uninstall') || flags.has('--skills-only') || flags.has('--init-only'))) {
    throw new Error('--check cannot be combined with install or uninstall options');
  }
  if (flags.has('--uninstall') && (flags.has('--skills-only') || flags.has('--init-only'))) {
    throw new Error('--uninstall cannot be combined with install mode options');
  }
  return {
    check: flags.has('--check'),
    uninstall: flags.has('--uninstall'),
    yes: flags.has('--yes'),
    skillsOnly: flags.has('--skills-only'),
    initOnly: flags.has('--init-only'),
  };
}

try {
  const options = parse(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
  } else if (options.check) {
    const report = await inspect({ target: process.cwd() });
    console.log(JSON.stringify(report, null, 2));
    if (report.missing.length > 0) process.exitCode = 1;
  } else if (options.uninstall) {
    if (!options.yes) throw new Error('--uninstall requires --yes');
    console.log(JSON.stringify(await uninstall({ target: process.cwd() }), null, 2));
  } else {
    console.log(JSON.stringify(await install({
      target: process.cwd(),
      skillsOnly: options.skillsOnly,
      initOnly: options.initOnly,
    }), null, 2));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
