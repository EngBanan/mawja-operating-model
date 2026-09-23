import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// Pass a generated TypeScript project with its pinned npm dependencies installed.
const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
assert.ok(process.argv[2], 'Usage: node tests/test_prompt_configuration.mjs <generated-typescript-project>');
const dependencies = join(resolve(process.argv[2]), 'node_modules');
for (const name of ['tsx', 'typescript']) assert.ok(existsSync(join(dependencies, name, 'package.json')), `Install ${name} in the runtime project first`);
const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  GIT_AUTHOR_NAME: 'Mawja Test', GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'Mawja Test', GIT_COMMITTER_EMAIL: 'test@example.invalid', NO_COLOR: '1' };
const tool = 'scripts/conductor/wave-prompt.ts';

function run(cwd, cmd, args, expected = 0) {
  const result = spawnSync(cmd, args, { cwd, env, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  assert.ifError(result.error);
  const output = (result.stdout + result.stderr).replace(/\x1b\[[0-9;]*m/g, '');
  if (expected !== null) assert.equal(result.status, expected, `${cmd} ${args.join(' ')}\n${output}`);
  return { status: result.status, output, stdout: result.stdout };
}

function fixture(t, { autocrlf = 'false', attributes = '', configPath = 'tsconfig.json' } = {}) {
  const parent = mkdtempSync(join(tmpdir(), 'mawja-config-'));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const cwd = join(parent, 'project with spaces');
  run(source, process.execPath, ['examples/create.mjs', 'typescript', cwd]);
  const git = (...args) => run(cwd, 'git', args).stdout.trim();
  const put = (path, contents) => { mkdirSync(dirname(join(cwd, path)), { recursive: true }); writeFileSync(join(cwd, path), contents); };
  git('init', '-b', 'main');
  git('config', 'core.autocrlf', autocrlf);
  if (attributes) put('.gitattributes', attributes);
  if (configPath !== 'tsconfig.json') {
    put(configPath, '{"compilerOptions":{"strict":true}}\n');
    const config = JSON.parse(readFileSync(join(cwd, 'tsconfig.json'), 'utf8'));
    config.extends = './' + configPath;
    put('tsconfig.json', JSON.stringify(config, null, 2) + '\n');
  }
  symlinkSync(dependencies, join(cwd, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  run(cwd, process.execPath, ['--import', 'tsx', 'scripts/conductor/check-types-baseline.ts', '--init']);
  if (autocrlf !== 'false') {
    const path = join(cwd, configPath);
    writeFileSync(path, readFileSync(path, 'utf8').replace(/\r?\n/g, '\r\n'));
  }
  const paths = git('ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean);
  git('add', '--', ...paths);
  git('commit', '-m', 'Set up configuration fixture');
  run(parent, 'git', ['init', '--bare', 'remote.git']);
  git('remote', 'add', 'origin', join(parent, 'remote.git'));
  git('push', '-u', 'origin', 'main');
  return { cwd, parent, git, put, configPath };
}
function wave(f, args, expected = 0) { return run(f.cwd, process.execPath, ['--import', 'tsx', tool, ...args], expected); }
function fill(f, path) {
  const file = join(f.cwd, path);
  writeFileSync(file, readFileSync(file, 'utf8').replace(/⟪[^⟫]*⟫/g, 'Verify this isolated configuration fixture; no deployment.'));
}
function ready(f) {
  wave(f, ['--new', '--slug=config']);
  fill(f, 'WAVE_PROMPT_CONFIG.md');
  assert.match(wave(f, ['--check', 'WAVE_PROMPT_CONFIG.md']).output, /Ready to issue/);
}
function blocked(f) {
  assert.match(wave(f, ['--new', '--slug=blocked'], 1).output, /checker configuration not committed/);
  assert.equal(existsSync(join(f.cwd, 'WAVE_PROMPT_BLOCKED.md')), false);
  wave(f, ['--new', '--slug=forced', '--force']);
  fill(f, 'WAVE_PROMPT_FORCED.md');
  const result = wave(f, ['--check', 'WAVE_PROMPT_FORCED.md'], 1);
  assert.match(result.output, /checker configuration not committed/);
  assert.match(result.output, /Not ready to issue/);
}
function crlf(f) {
  const path = join(f.cwd, f.configPath);
  writeFileSync(path, readFileSync(path, 'utf8').replace(/\r?\n/g, '\r\n'));
}

for (const autocrlf of ['false', 'input', 'true']) {
  test(`committed configuration passes with core.autocrlf=${autocrlf}`, (t) => {
    const f = fixture(t, { autocrlf });
    if (autocrlf !== 'false') crlf(f);
    assert.equal(f.git('status', '--porcelain'), '');
    ready(f);
  });
}

test('Git checkout produces CRLF with text eol=crlf attributes', (t) => {
  const f = fixture(t, { attributes: 'tsconfig.json text eol=crlf\n' });
  rmSync(join(f.cwd, 'tsconfig.json'));
  f.git('checkout', '--', 'tsconfig.json');
  assert.ok(readFileSync(join(f.cwd, 'tsconfig.json'), 'utf8').includes('\r\n'));
  assert.equal(f.git('status', '--porcelain'), '');
  ready(f);
});

test('nested configuration with spaces accepts Git-recognized CRLF', (t) => {
  const f = fixture(t, { autocrlf: 'true', configPath: 'config files/base.json' });
  crlf(f);
  assert.equal(f.git('status', '--porcelain'), '');
  ready(f);
});

test('EOL changes remain uncommitted when Git normalization is disabled', (t) => {
  const f = fixture(t, { autocrlf: 'false', attributes: 'tsconfig.json -text\n' });
  crlf(f);
  blocked(f);
});

for (const flag of [null, '--skip-worktree', '--assume-unchanged']) {
  test(`real configuration changes block generation and readiness${flag ? ' with ' + flag : ''}`, (t) => {
    const f = fixture(t, { autocrlf: 'true' });
    if (flag) f.git('update-index', flag, 'tsconfig.json');
    appendFileSync(join(f.cwd, 'tsconfig.json'), '\n ');
    if (flag) assert.equal(f.git('status', '--porcelain'), '');
    blocked(f);
    // Restoring bytes, without changing the index flags, must restore readiness.
    f.put('tsconfig.json', run(f.cwd, 'git', ['show', 'HEAD:tsconfig.json']).stdout.replace(/\r?\n/g, '\r\n'));
    ready(f);
  });
}

test('ignored uncommitted checker configuration still blocks', (t) => {
  const f = fixture(t);
  f.git('rm', '--cached', 'tsconfig.json');
  appendFileSync(join(f.cwd, '.gitignore'), '\ntsconfig.json\n');
  f.git('add', '--', '.gitignore');
  f.git('commit', '-m', 'Ignore checker configuration');
  f.git('push');
  assert.equal(f.git('status', '--porcelain'), '');
  blocked(f);
});

test('a clean filter cannot hide a real configuration change', (t) => {
  const f = fixture(t, { attributes: 'tsconfig.json filter=hide-change\n' });
  f.put('filter.cjs', 'let data="";process.stdin.on("data",b=>data+=b);process.stdin.on("end",()=>process.stdout.write(data.replace(/"strict": false/g,\'"strict": true\')));\n');
  f.git('add', '--', 'filter.cjs');
  f.git('commit', '-m', 'Add fixture clean filter');
  f.git('config', 'filter.hide-change.clean', 'node filter.cjs');
  f.git('push');
  const path = join(f.cwd, 'tsconfig.json');
  const before = readFileSync(path, 'utf8');
  assert.ok(before.includes('"strict": true'));
  f.put('tsconfig.json', before.replace('"strict": true', '"strict": false'));
  assert.equal(f.git('hash-object', '--path=tsconfig.json', 'tsconfig.json'), f.git('rev-parse', 'HEAD:tsconfig.json'));
  blocked(f);
  f.put('tsconfig.json', before);
  ready(f);
});

test('a linked configuration file cannot certify an external target', { skip: process.platform === 'win32' && 'file symlinks require Windows privileges' }, (t) => {
  const f = fixture(t);
  const path = join(f.cwd, 'tsconfig.json');
  const outside = join(f.parent, 'outside.json');
  writeFileSync(outside, readFileSync(path));
  rmSync(path);
  symlinkSync(outside, path);
  f.git('add', '--', 'tsconfig.json');
  f.git('commit', '-m', 'Link external configuration');
  f.git('push');
  blocked(f);
});
