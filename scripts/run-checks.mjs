#!/usr/bin/env node
// Copyright (c) 2026 Banan Abu Zahar. SPDX-License-Identifier: MIT
import {
  closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync,
  readdirSync, readlinkSync, realpathSync, renameSync, rmSync, writeFileSync,
} from 'node:fs';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { arch, hostname, release, platform } from 'node:os';
import { delimiter, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const usage = 'Usage: node scripts/conductor/run-checks.mjs <config.json> [--reuse]';
const script = fileURLToPath(import.meta.url);
const digest = (data) => createHash('sha256').update(data).digest('hex');
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const inside = (root, file) => { const r = relative(root, file); return !r || (!isAbsolute(r) && r !== '..' && !r.startsWith('..' + sep)); };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
const text = (value) => typeof value === 'string' && value.length > 0 && !/[\x00-\x1f]/.test(value);
const ensure = (ok, message) => { if (!ok) throw new Error(message); };
const atomic = (file, value) => {
  const temporary = file + '.' + randomUUID();
  writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  renameSync(temporary, file);
};
const args = process.argv.slice(2);
if (args.length === 1 && ['--help', '-h'].includes(args[0])) { console.log(usage); process.exit(0); }
let state, latest, lock, attempt, child;
let ownsLock = false;
let interrupted = false;
let root;

function git(...command) {
  const result = spawnSync('git', ['--no-optional-locks', ...command], {
    cwd: root || process.cwd(), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, LC_ALL: 'C', GIT_OPTIONAL_LOCKS: '0' }, timeout: 30000,
  });
  ensure(!result.error && result.status === 0, 'Git measurement failed: ' + command[0]);
  return result.stdout;
}
function configAt(file) {
  const c = json(file);
  ensure(exact(c, ['version', 'allowReuse', 'maxAgeSeconds', 'scope', 'externalInputs', 'checks'])
    && c.version === 1 && typeof c.allowReuse === 'boolean' && text(c.scope)
    && Number.isInteger(c.maxAgeSeconds) && c.maxAgeSeconds >= 1 && c.maxAgeSeconds <= 21600
    && Array.isArray(c.externalInputs) && c.externalInputs.every(text)
    && Array.isArray(c.checks) && c.checks.length > 0, 'Invalid runner configuration');
  const ids = new Set();
  for (const check of c.checks) {
    ensure(exact(check, ['id', 'command', 'timeoutSeconds', 'reuse', 'cases'])
      && typeof check.id === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(check.id) && !ids.has(check.id)
      && Array.isArray(check.command) && check.command.length >= 2 && check.command.every(text)
      && Number.isInteger(check.timeoutSeconds) && check.timeoutSeconds >= 1 && check.timeoutSeconds <= 7200
      && ['never', 'local-read-only'].includes(check.reuse)
      && Array.isArray(check.cases) && check.cases.length > 0 && check.cases.every(text)
      && new Set(check.cases).size === check.cases.length, 'Invalid check configuration');
    ids.add(check.id);
  }
  return c;
}
function executable(name) {
  if (name === 'node') return realpathSync(process.execPath);
  const paths = isAbsolute(name) || name.includes('/') || name.includes('\\')
    ? [resolve(root, name)]
    : (process.env.PATH || process.env.Path || '').split(delimiter).filter(Boolean).map(p => resolve(p, name));
  for (const p of paths) {
    for (const suffix of process.platform === 'win32' ? ['', '.exe'] : ['']) {
      if (existsSync(p + suffix) && lstatSync(realpathSync(p + suffix)).isFile()) {
        const real = realpathSync(p + suffix);
        ensure(!/\.(bat|cmd|ps1)$/i.test(real), 'Use a runtime executable, not a shell wrapper');
        return p + suffix;
      }
    }
  }
  throw new Error('Executable not found: ' + name);
}

// Content and filesystem change metadata are separate. The latter detects write/restore
// during an attempt; receipts match content, paths and metadata conservatively as well.
function tree(directory, excludeGit = false, captured = []) {
  const content = createHash('sha256');
  const stability = createHash('sha256');
  let count = 0;
  function visit(file, name) {
    const before = lstatSync(file, { bigint: true });
    const stamp = s => [s.dev, s.ino, s.mode, s.size, s.mtimeNs, s.ctimeNs].map(String).join(':');
    stability.update(JSON.stringify([name, stamp(before)]));
    if (before.isSymbolicLink()) {
      const target = realpathSync(file);
      const local = inside(directory, target) && !(excludeGit && inside(join(directory, '.git'), target));
      ensure(local || captured.some(p => inside(p, target)), 'External symlink cannot be fingerprinted: ' + name);
      content.update(JSON.stringify([name, 'link', readlinkSync(file)]));
    } else if (before.isDirectory()) {
      content.update(JSON.stringify([name, 'directory', String(before.mode)]));
      for (const item of readdirSync(file).sort()) {
        if (excludeGit && name === '' && item === '.git') continue;
        visit(join(file, item), name ? name + '/' + item : item);
      }
    } else if (before.isFile()) {
      content.update(JSON.stringify([name, 'file', String(before.mode), String(before.size)]));
      content.update(readFileSync(file));
      count++;
    } else throw new Error('Unsupported input file: ' + name);
    ensure(stamp(before) === stamp(lstatSync(file, { bigint: true })), 'Input changed while reading: ' + name);
  }
  visit(directory, '');
  return { content: content.digest('hex'), stability: stability.digest('hex'), count };
}
function fileInput(file, captured = []) {
  const stat = lstatSync(file, { bigint: true });
  if (stat.isDirectory()) return tree(file, false, captured);
  ensure(stat.isFile(), 'External input must be a regular file or directory');
  const bytes = readFileSync(file);
  const after = lstatSync(file, { bigint: true });
  ensure(stat.ctimeNs === after.ctimeNs && stat.mtimeNs === after.mtimeNs && stat.size === after.size, 'External input changed while reading');
  return { content: digest(bytes), stability: [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeNs, stat.ctimeNs].map(String).join(':') };
}
function fingerprint(c, binaries, key) {
  const external = c.externalInputs.map(p => realpathSync(resolve(root, p)));
  const captured = [...external, ...binaries.map(p => realpathSync(p)), realpathSync(process.execPath)];
  const project = tree(root, true, captured);
  const head = git('rev-parse', 'HEAD').trim();
  const env = Object.keys(process.env).sort().map(k => [k, process.env[k]]);
  const data = {
    root, project, head, config: c, runner: digest(readFileSync(script)),
    git: digest(git('ls-files', '-v', '--stage', '-z') + git('for-each-ref', '--format=%(refname) %(objectname)')
      + git('rev-parse', '--abbrev-ref', 'HEAD') + git('config', '--null', '--list', '--show-origin')),
    runtime: [process.version, process.versions, platform(), release(), arch(), hostname()],
    environment: createHmac('sha256', key).update(JSON.stringify(env)).digest('hex'),
    binaries: [process.execPath, ...binaries].map(p => [p, realpathSync(p), fileInput(realpathSync(p))]),
    external: external.map(p => [p, fileInput(p, captured)]),
  };
  return { hash: digest(JSON.stringify(data)), head, files: project.count };
}
function reportValid(value, check, token) {
  ensure(exact(value, ['version', 'token', 'cases']) && value.version === 1 && value.token === token
    && Array.isArray(value.cases) && value.cases.length === check.cases.length, 'Incomplete check report: ' + check.id);
  const seen = new Set();
  for (const item of value.cases) {
    ensure(exact(item, ['id', 'status']) && check.cases.includes(item.id) && !seen.has(item.id)
      && item.status === 'passed', 'Failed, skipped, duplicate or unexpected case: ' + check.id);
    seen.add(item.id);
  }
}
function evidenceValid(record, check, now, c, fp, enforceAge = true) {
  try {
    ensure(record.fingerprint === fp.hash && record.commit === fp.head
      && Number.isFinite(record.finished) && Number.isFinite(record.started)
      && record.started <= record.finished && record.finished <= now
      && (!enforceAge || now - record.started <= c.maxAgeSeconds * 1000), 'Receipt age or inputs');
    ensure(typeof record.directory === 'string' && /^[a-f0-9-]{36}\/[a-z][a-z0-9-]*$/.test(record.directory), 'Receipt path');
    const directory = join(state, 'attempts', record.directory);
    for (const name of ['stdout.log', 'stderr.log', 'result.json']) {
      const file = join(directory, name);
      ensure(lstatSync(file).isFile() && !lstatSync(file).isSymbolicLink()
        && digest(readFileSync(file)) === record.evidence[name], 'Receipt evidence');
    }
    reportValid(json(join(directory, 'result.json')), check, record.token);
    return true;
  } catch { return false; }
}
function stopChild() {
  if (!child || !child.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', timeout: 10000 });
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
  }
}
async function execute(check, binary, cwd, directory, token) {
  mkdirSync(directory);
  const stdout = openSync(join(directory, 'stdout.log'), 'wx', 0o600);
  const stderr = openSync(join(directory, 'stderr.log'), 'wx', 0o600);
  try {
    return await new Promise((resolvePromise, reject) => {
      let timedOut = false;
      child = spawn(binary, check.command.slice(1), {
        cwd, shell: false, detached: process.platform !== 'win32',
        stdio: ['ignore', stdout, stderr],
        env: { ...process.env, TSX_DISABLE_CACHE: '1', MAWJA_CHECK_REPORT: join(directory, 'result.json'), MAWJA_CHECK_TOKEN: token },
      });
      const timer = setTimeout(() => { timedOut = true; stopChild(); }, check.timeoutSeconds * 1000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('close', (code, signal) => {
        clearTimeout(timer);
        child = undefined;
        if (timedOut || interrupted || signal || code !== 0) reject(new Error('Check failed or interrupted: ' + check.id));
        else resolvePromise();
      });
    });
  } finally { closeSync(stdout); closeSync(stderr); }
}

async function checkpoint() {
  // Synchronous hashing and an all-reused attempt must still observe queued signals.
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  ensure(!interrupted, 'Runner interrupted');
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { interrupted = true; stopChild(); });
try {
  // Locate and invalidate the previous attempt before configuration validation, even
  // when reuse is disabled. A running/failed latest record never falls back to older successes.
  root = realpathSync(git('rev-parse', '--show-toplevel').trim());
  const gitdir = realpathSync(git('rev-parse', '--absolute-git-dir').trim());
  state = join(gitdir, 'mawja-checks');
  ensure(!existsSync(state) || !lstatSync(state).isSymbolicLink(), 'State directory must not be a symlink');
  mkdirSync(state, { recursive: true, mode: 0o700 });
  lock = join(state, 'lock');
  try { mkdirSync(lock); } catch { throw new Error('Runner locked. Stop all check processes before removing ' + lock); }
  ownsLock = true;
  atomic(join(lock, 'owner.json'), { pid: process.pid, host: hostname(), started: Date.now() });
  latest = join(state, 'latest.json');
  let previous;
  try { previous = json(latest); } catch { previous = null; }
  attempt = { version: 1, id: randomUUID(), status: 'running', started: Date.now(), results: [] };
  atomic(latest, attempt);
  ensure(args.length >= 1 && args.length <= 2 && (args.length === 1 || args[1] === '--reuse'), usage);
  const configFile = realpathSync(resolve(process.cwd(), args[0]));
  ensure(inside(root, configFile) && !inside(gitdir, configFile), 'Configuration must be in the project');
  const c = configAt(configFile);
  const configPath = relative(root, configFile).split(sep).join('/');
  const committed = git('show', 'HEAD:' + configPath);
  ensure(committed.replace(/\r\n/g, '\n') === readFileSync(configFile, 'utf8').replace(/\r\n/g, '\n'), 'Commit the runner configuration before using it');
  ensure(!git('ls-files', '--stage').split('\n').some(line => line.startsWith('160000 ')), 'Submodules need a separate runner configuration');
  const keyFile = join(state, 'key');
  if (!existsSync(keyFile)) writeFileSync(keyFile, randomBytes(32), { flag: 'wx', mode: 0o600 });
  const key = readFileSync(keyFile);
  ensure(key.length === 32, 'Invalid local fingerprint key');
  const binaries = c.checks.map(check => executable(check.command[0]));
  const fp = fingerprint(c, binaries, key);
  const enabled = args[1] === '--reuse' && c.allowReuse;
  console.log('Reuse: ' + (enabled ? 'requested' : 'off (fresh checks)'));
  console.log('Commit: ' + fp.head + '; inputs: ' + fp.hash + '; files: ' + fp.files);
  const attemptDir = join(state, 'attempts', attempt.id);
  mkdirSync(attemptDir, { recursive: true });
  for (let index = 0; index < c.checks.length; index++) {
    const check = c.checks[index];
    await checkpoint();
    ensure(fingerprint(c, binaries, key).hash === fp.hash, 'Inputs changed during the attempt');
    const old = previous?.version === 1 && previous.status === 'passed' && Array.isArray(previous.results) && previous.fingerprint === fp.hash
      ? previous.results?.find(r => r.id === check.id) : undefined;
    if (enabled && check.reuse === 'local-read-only' && old && evidenceValid(old, check, Date.now(), c, fp)) {
      attempt.results.push({ ...old, mode: 'reused' });
      console.log(check.id + ': previous verified result; original ' + new Date(old.started).toISOString()
        + '; evidence ' + join(state, 'attempts', old.directory));
      continue;
    }
    const started = Date.now();
    const directory = join(attemptDir, check.id);
    const token = randomUUID();
    await execute(check, binaries[index], root, directory, token);
    reportValid(json(join(directory, 'result.json')), check, token);
    ensure(fingerprint(c, binaries, key).hash === fp.hash, 'Inputs changed during the check');
    const evidence = Object.fromEntries(['stdout.log', 'stderr.log', 'result.json'].map(n => [n, digest(readFileSync(join(directory, n)))]));
    attempt.results.push({ id: check.id, mode: 'executed', token, started, finished: Date.now(),
      fingerprint: fp.hash, commit: fp.head, directory: attempt.id + '/' + check.id, evidence });
    console.log(check.id + ': executed; all ' + check.cases.length + ' cases passed; evidence ' + directory);
  }
  ensure(!interrupted && fingerprint(c, binaries, key).hash === fp.hash, 'Inputs changed before finalization');
  for (const result of attempt.results) {
    const check = c.checks.find(item => item.id === result.id);
    ensure(evidenceValid(result, check, Date.now(), c, fp, result.mode === 'reused'), 'Check evidence expired or changed before finalization');
  }
  await checkpoint();
  attempt.status = 'passed';
  attempt.fingerprint = fp.hash;
  attempt.finished = Date.now();
  atomic(join(attemptDir, 'summary.json'), attempt);
  atomic(latest, attempt);
  await checkpoint();
  console.log('Required checks accepted. Executed: ' + attempt.results.filter(r => r.mode === 'executed').length
    + '; previous verified results: ' + attempt.results.filter(r => r.mode === 'reused').length + '.');
} catch (error) {
  if (ownsLock && attempt && latest) {
    attempt.status = 'failed';
    attempt.finished = Date.now();
    try {
      const directory = join(state, 'attempts', attempt.id);
      if (existsSync(directory)) atomic(join(directory, 'summary.json'), attempt);
      atomic(latest, attempt);
    } catch { /* A remaining running record also blocks reuse. */ }
  }
  console.error(error.message);
  if (state) console.error('Evidence directory: ' + state);
  process.exitCode = 1;
} finally {
  if (ownsLock) rmSync(lock, { recursive: true, force: true });
}
