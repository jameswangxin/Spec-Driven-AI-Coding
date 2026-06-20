import { readdir, readFile } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

const REQUIREMENT_STATUSES = new Set(['draft', 'accepted', 'planned', 'implemented', 'verified', 'archived', 'blocked', 'canceled', 'reopened', 'superseded']);
const CAPABILITY_STATUSES = new Set(['draft', 'active', 'deprecated', 'superseded']);
const COMPLEXITIES = new Set(['simple', 'medium', 'complex']);
const RISK_TAGS = new Set(['data', 'security', 'migration', 'external-api', 'architecture', 'cross-module']);
const TRANSITIONS = {
  draft: new Set(['accepted', 'canceled', 'superseded']),
  accepted: new Set(['planned', 'blocked', 'canceled', 'superseded']),
  planned: new Set(['implemented', 'blocked', 'canceled', 'superseded']),
  implemented: new Set(['verified', 'blocked', 'canceled']),
  blocked: new Set(['accepted', 'planned', 'implemented']),
  verified: new Set(['archived', 'reopened']),
  reopened: new Set(['planned', 'implemented', 'verified']),
};
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function scalar(value) {
  const text = value.trim();
  if (text === 'null') return null;
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text === '[]') return [];
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  if (text.startsWith('[') && text.endsWith(']')) return text.slice(1, -1).trim() === '' ? [] : text.slice(1, -1).split(',').map((item) => scalar(item));
  if (/^-?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
    const number = Number(text);
    if (Number.isFinite(number)) return number;
  }
  return text;
}

function parseFrontmatter(source) {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s|$)/);
  if (!match) throw new Error('Expected YAML frontmatter enclosed by ---');
  const lines = match[1].split(/\r?\n/);
  const data = {};
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    const keyMatch = line.match(/^([^\s:#][^:]*):(?:\s*(.*))?$/);
    if (!keyMatch) throw new Error(`Unsupported frontmatter syntax: ${line}`);
    const [, key, rawValue = ''] = keyMatch;
    if (rawValue !== '') {
      data[key.trim()] = scalar(rawValue);
      continue;
    }
    const items = [];
    while (index + 1 < lines.length && /^\s+/.test(lines[index + 1])) {
      index += 1;
      const item = lines[index];
      const arrayMatch = item.match(/^\s+-\s*(.*)$/);
      if (!arrayMatch) throw new Error(`Unsupported nested frontmatter syntax: ${item}`);
      const first = arrayMatch[1];
      const objectMatch = first.match(/^([^:]+):\s*(.*)$/);
      if (!objectMatch) {
        items.push(scalar(first));
        continue;
      }
      const object = { [objectMatch[1].trim()]: scalar(objectMatch[2]) };
      while (index + 1 < lines.length && /^\s{4,}/.test(lines[index + 1])) {
        index += 1;
        const property = lines[index].match(/^\s+([^:]+):\s*(.*)$/);
        if (!property) throw new Error(`Unsupported object frontmatter syntax: ${lines[index]}`);
        object[property[1].trim()] = scalar(property[2]);
      }
      items.push(object);
    }
    data[key.trim()] = items;
  }
  return data;
}

const isDate = (value) => typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');

function schemaError(diagnostics, path, code) {
  diagnostics.push({ code, path, message: 'Frontmatter does not match the required schema.', severity: 'error' });
}

function validateRequirementSchema(record, diagnostics) {
  const value = record.data;
  const historyKeys = new Set(['date', 'from', 'to', 'note']);
  const historyOk = Array.isArray(value.history) && value.history.length > 0 && value.history.every((entry) => entry && typeof entry === 'object' && Object.keys(entry).every((key) => historyKeys.has(key)) && isDate(entry.date) && (typeof entry.from === 'string' || entry.from === null) && typeof entry.to === 'string' && entry.to.length > 0 && typeof entry.note === 'string' && entry.note.trim().length > 0);
  const optionalFieldsOk = (!Object.hasOwn(value, 'owner') || typeof value.owner === 'string' || value.owner === null) && (!Object.hasOwn(value, 'reviewers') || isStringArray(value.reviewers)) && (!Object.hasOwn(value, 'approvers') || isStringArray(value.approvers));
  const valid = /^REQ-\d{4}$/.test(value.id) && typeof value.title === 'string' && value.title.trim() && REQUIREMENT_STATUSES.has(value.status) && COMPLEXITIES.has(value.complexity) && Array.isArray(value.risk_tags) && value.risk_tags.every((tag) => RISK_TAGS.has(tag)) && new Set(value.risk_tags).size === value.risk_tags.length && typeof value.plan_required === 'boolean' && typeof value.plan_reason === 'string' && value.plan_reason.trim() && isDate(value.created_at) && isDate(value.updated_at) && isStringArray(value.references) && isStringArray(value.capabilities) && value.capabilities.every((cap) => /^CAP-\d{4}$/.test(cap)) && historyOk && optionalFieldsOk;
  if (!valid) schemaError(diagnostics, record.path, 'WF_REQ_SCHEMA_INVALID');
}

function validateCapabilitySchema(record, diagnostics) {
  const value = record.data;
  const valid = /^CAP-\d{4}$/.test(value.id) && typeof value.title === 'string' && value.title.trim() && CAPABILITY_STATUSES.has(value.status) && /^REQ-\d{4}$/.test(value.introduced_by) && isStringArray(value.updated_by) && value.updated_by.every((id) => /^REQ-\d{4}$/.test(id)) && new Set(value.updated_by).size === value.updated_by.length;
  if (!valid) schemaError(diagnostics, record.path, 'WF_CAP_SCHEMA_INVALID');
}

function validateHistory(record, diagnostics) {
  const { history, status, updated_at } = record.data;
  if (!Array.isArray(history) || history.length === 0) return;
  const first = history[0];
  if (!first || first.from !== null || first.to !== 'draft') {
    diagnostics.push({ code: 'WF_HISTORY_STATUS_MISMATCH', path: record.path, message: 'The first history entry must transition from null to draft.', severity: 'error' });
  }
  for (let index = 1; index < history.length; index += 1) {
    const previous = history[index - 1];
    const current = history[index];
    if (!previous || !current || current.from !== previous.to) diagnostics.push({ code: 'WF_HISTORY_STATUS_MISMATCH', path: record.path, message: 'Each history entry must start at the previous entry status.', severity: 'error' });
    if (previous && current && !TRANSITIONS[previous.to]?.has(current.to)) diagnostics.push({ code: 'WF_STATUS_TRANSITION_INVALID', path: record.path, message: `Invalid requirement transition: ${previous.to} -> ${current.to}.`, severity: 'error' });
  }
  if (history.at(-1)?.to !== status) diagnostics.push({ code: 'WF_HISTORY_STATUS_MISMATCH', path: record.path, message: 'The final history status must equal the current status.', severity: 'error' });
  const dates = history.map((entry) => entry?.date).filter(isDate).sort();
  if (!isDate(updated_at) || (dates.length > 0 && updated_at < dates.at(-1))) diagnostics.push({ code: 'WF_UPDATED_AT_INVALID', path: record.path, message: 'updated_at must be a valid date on or after the latest history date.', severity: 'error' });
}

async function loadRecords(directory) {
  let files;
  try { files = await readdir(directory, { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return Promise.all(files.filter((entry) => entry.isFile() && extname(entry.name) === '.md').map(async (entry) => {
    const path = join(directory, entry.name);
    const source = await readFile(path, 'utf8');
    try { return { path, filename: basename(entry.name, '.md'), data: parseFrontmatter(source) }; }
    catch (error) { return { path, filename: basename(entry.name, '.md'), error }; }
  }));
}

export async function validateWorkflow(workflowRoot) {
  const diagnostics = [];
  const [requirements, capabilities] = await Promise.all([loadRecords(join(workflowRoot, 'requirements')), loadRecords(join(workflowRoot, 'capabilities'))]);
  for (const record of [...requirements, ...capabilities]) {
    if (record.error) diagnostics.push({ code: 'WF_FRONTMATTER_INVALID', path: record.path, message: record.error.message, severity: 'error' });
  }
  for (const record of requirements.filter((item) => !item.error)) {
    validateRequirementSchema(record, diagnostics);
    if (record.filename !== record.data.id) diagnostics.push({ code: 'WF_FILENAME_ID_MISMATCH', path: record.path, message: `Filename ${record.filename} must match id ${record.data.id}.`, severity: 'error' });
    validateHistory(record, diagnostics);
  }
  for (const record of capabilities.filter((item) => !item.error)) {
    validateCapabilitySchema(record, diagnostics);
    if (record.filename !== record.data.id) diagnostics.push({ code: 'WF_FILENAME_ID_MISMATCH', path: record.path, message: `Filename ${record.filename} must match id ${record.data.id}.`, severity: 'error' });
  }
  const capabilitiesById = new Map(capabilities.filter((item) => !item.error).map((item) => [item.data.id, item.data]));
  for (const requirement of requirements.filter((item) => !item.error && Array.isArray(item.data.capabilities))) {
    for (const capabilityId of requirement.data.capabilities) {
      const capability = capabilitiesById.get(capabilityId);
      if (!capability) diagnostics.push({ code: 'WF_CAPABILITY_MISSING', path: requirement.path, message: `Referenced capability ${capabilityId} does not exist.`, severity: 'error' });
      else if (capability.status === 'deprecated') diagnostics.push({ code: 'WF_CAPABILITY_DEPRECATED', path: requirement.path, message: `Referenced capability ${capabilityId} is deprecated.`, severity: 'error' });
    }
  }
  return { valid: diagnostics.length === 0, diagnostics, requirements: requirements.filter((item) => !item.error).map(({ data }) => data), capabilities: capabilities.filter((item) => !item.error).map(({ data }) => data) };
}
