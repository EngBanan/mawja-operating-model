import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
assert.ok(process.argv[2], 'Usage: node tests/test_tool_contracts.mjs <generated-typescript-project>');
const dependencies = join(resolve(process.argv[2]), 'node_modules');
assert.ok(existsSync(join(dependencies, 'tsx/package.json')));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  GIT_AUTHOR_NAME: 'Mawja Test', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_NAME: 'Mawja Test', GIT_COMMITTER_EMAIL: 'test@example.invalid', NO_COLOR: '1' });
function run(cwd, cmd, args, expected = 0) {
  const p = spawnSync(cmd, args, { cwd, env, encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
  assert.ifError(p.error);
  const output = p.stdout + p.stderr;
  if (expected !== null) assert.equal(p.status, expected, `${cmd} ${args.join(' ')}\n${output}`);
  return { ...p, output };
}
function fixture(t, { rules = null, sources = ['PROJECT.md'], realTypes = false } = {}) {
  const parent = mkdtempSync(join(tmpdir(), 'mawja-contract-'));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const cwd = join(parent, 'project with spaces');
  run(source, process.execPath, ['examples/create.mjs', 'typescript', cwd]);
  const put = (path, content) => { mkdirSync(dirname(join(cwd, path)), { recursive: true }); writeFileSync(join(cwd, path), content); };
  const git = (...args) => run(cwd, 'git', args).stdout.trim();
  const configure = (file, key, value) => {
    const path = join(cwd, 'scripts/conductor', file + '.ts');
    const before = readFileSync(path, 'utf8');
    const pattern = new RegExp('^const ' + key + '(?::[^=\\n]+)? = .*$', 'm');
    assert.match(before, pattern);
    writeFileSync(path, before.replace(pattern, () => `const ${key} = ${JSON.stringify(value)}`));
  };
  git('init', '-b', 'main');
  // The dependency source belongs to this test session. Ignore the link as well as directories.
  put('.gitignore', readFileSync(join(cwd, '.gitignore'), 'utf8') + '\nnode_modules\n');
  symlinkSync(dependencies, join(cwd, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  if (!realTypes) {
    put('measurement.cjs', 'console.log(JSON.stringify({ok:true,count:0,baseline:0,crashClass:["syntax"],crashHits:0,configurationFiles:["tsconfig.json"]}))\n');
    for (const name of ['wave-prompt', 'verify-wave']) configure(name, 'TYPES_CMD', 'node measurement.cjs');
    put('scripts/conductor/types-baseline.json', '{"ceiling":0,"files":{},"measured":"fixture"}\n');
  }
  if (rules !== null) {
    put('PROJECT.md', rules);
    configure('wave-prompt', 'RULE_SOURCES', sources);
  }
  const paths = git('ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean);
  git('add', '--', ...paths);
  git('commit', '-m', 'Initialize isolated contract fixture');
  run(parent, 'git', ['init', '--bare', 'remote.git']);
  git('remote', 'add', 'origin', join(parent, 'remote.git'));
  git('push', '-u', 'origin', 'main');
  const tool = (name, args, expected = 0) => run(cwd, process.execPath, ['--import', 'tsx', `scripts/conductor/${name}.ts`, ...args], expected);
  return { cwd, parent, git, put, configure, tool };
}
const rules = '<!-- mawja:rules:start -->\nUse only the owned test service.\n<!-- mawja:rules:end -->\n';
function generate(f) {
  f.tool('wave-prompt', ['--new', '--slug=contract']);
  const path = join(f.cwd, 'WAVE_PROMPT_CONTRACT.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace(/⟪[^⟫]*⟫/g, 'Not applicable for this isolated tool contract fixture.'));
  return path;
}

test('counter reports registration, including zero, without claiming enforcement', (t) => {
  const f = fixture(t);
  let result = f.tool('count-gates', []);
  assert.match(result.output, /\(3 registered guard commands/);
  assert.match(result.output, /wiring and fault detection are not verified/);
  f.put('package.json', '{"scripts":{"build":"node build.cjs"}}');
  assert.match(f.tool('count-gates', []).output, /\(0 registered guard commands/);
});

test('prompt includes committed rules and accepts a forwarded separator', (t) => {
  const f = fixture(t, { rules });
  const path = generate(f);
  assert.match(readFileSync(path, 'utf8'), /Use only the owned test service/);
  assert.match(f.tool('wave-prompt', ['--check', '--', path]).output, /Ready to issue/);
  writeFileSync(path, readFileSync(path, 'utf8').replace('Use only the owned test service.', 'Use any available service.'));
  assert.match(f.tool('wave-prompt', ['--check', path], 1).output, /Project rule excerpts differ/);
  writeFileSync(path, readFileSync(path, 'utf8').replace('Use any available service.', 'Use only the owned test service.'));
  assert.match(f.tool('wave-prompt', ['--check', path]).output, /Ready to issue/);
});

for (const [name, content] of [
  ['missing markers', 'A project rule.'],
  ['empty block', '<!-- mawja:rules:start -->\n<!-- mawja:rules:end -->'],
  ['duplicate block', rules + rules],
  ['reversed markers', '<!-- mawja:rules:end -->text<!-- mawja:rules:start -->'],
]) test(`invalid rule source fails: ${name}`, (t) => {
  const f = fixture(t, { rules: content });
  assert.match(f.tool('wave-prompt', ['--new', '--slug=bad'], 2).output, /CONFIG/);
  assert.equal(existsSync(join(f.cwd, 'WAVE_PROMPT_BAD.md')), false);
});

test('uncommitted rules cannot certify a ready prompt', (t) => {
  const f = fixture(t, { rules });
  const path = generate(f);
  f.put('PROJECT.md', rules.replace('owned test', 'other test'));
  assert.match(f.tool('wave-prompt', ['--check', path], 1).output, /not committed/);
});

test('rule paths cannot read outside the repository even with force', (t) => {
  const f = fixture(t, { rules, sources: ['../outside.md'] });
  writeFileSync(join(f.parent, 'outside.md'), rules);
  assert.match(f.tool('wave-prompt', ['--new', '--slug=bad', '--force'], 2).output, /inside the repository/);
});

test('legacy guard labels remain readable and sources are optional', (t) => {
  const f = fixture(t);
  f.put('legacy-count.cjs', 'console.log("(2 live gates")\n');
  f.configure('wave-prompt', 'GATES_CMD', 'node legacy-count.cjs');
  f.git('add', '--', 'legacy-count.cjs', 'scripts/conductor/wave-prompt.ts');
  f.git('commit', '-m', 'Use legacy counting adapter'); f.git('push');
  const path = generate(f);
  assert.match(f.tool('wave-prompt', ['--check', path]).output, /Ready to issue/);
});

test('claim cwd is explicit; default root and failure propagation are preserved', (t) => {
  const f = fixture(t);
  f.put('claim.cjs', 'console.log("root claim");\n');
  f.put('package with spaces/claim.cjs', 'console.log("package claim");\n');
  f.put('package with spaces/failure.cjs', 'console.error("intended behavior failure"); process.exitCode=7;\n');
  f.git('add', '--', 'claim.cjs', 'package with spaces');
  f.git('commit', '-m', 'Add independent claim fixtures');
  f.git('switch', '-c', 'wave/claim');
  const args = ['--base=main', '--claim=node claim.cjs'];
  assert.match(f.tool('verify-wave', args).output, /root claim/);
  assert.match(f.tool('verify-wave', [...args, '--claim-cwd=package with spaces']).output, /package claim/);
  assert.match(f.tool('verify-wave', ['--base=main', '--claim=node failure.cjs', '--claim-cwd=package with spaces'], 1).output, /intended behavior failure/);
  assert.match(f.tool('verify-wave', [...args, '--claim-cwd=missing'], 2).output, /not a directory/);
  assert.match(f.tool('verify-wave', [...args, '--claim-cwd=claim.cjs'], 2).output, /not a directory/);
  assert.match(f.tool('verify-wave', ['--claim-cwd=.'], 2).output, /requires --claim/);
});

test('large real TypeScript diagnostic JSON drains to a slow pipe reader', async (t) => {
  const f = fixture(t, { realTypes: true });
  f.tool('check-types-baseline', ['--init']);
  const count = 1800;
  f.put('app/broken.ts', Array.from({ length: count }, (_, i) => `export const broken${i} = ;`).join('\n') + '\n');
  const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/conductor/check-types-baseline.ts', '--json'], { cwd: f.cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '', paused = false;
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
    if (!paused) { paused = true; child.stdout.pause(); setTimeout(() => child.stdout.resume(), 250); }
  });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const timeout = setTimeout(() => child.kill(), 60000);
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
  clearTimeout(timeout);
  assert.equal(code, 1, stderr);
  const result = JSON.parse(stdout);
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'crash-class');
  assert.equal(result.syntaxDiagnostics.length, count);
  assert.equal(result.syntaxDiagnostics.at(-1).line, count);
  assert.ok(stdout.length > 100000, 'exercise output exceeding a small pipe buffer');
  assert.equal(result.crashHits, count);
});


test('kit and changelog identify the authoritative framework version', () => {
  const version = readFileSync(join(source, 'VERSION'), 'utf8').trim();
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.ok(readFileSync(join(source, 'AGENT_GOVERNANCE_KIT.md'), 'utf8').includes(`**Framework version: ${version}**`));
  assert.match(readFileSync(join(source, 'docs/CHANGELOG.md'), 'utf8'), new RegExp('^## ' + version.replace(/\./g, '\\.') + ' · ', 'm'));
});

test('unconfigured shared defaults run real measurements and require project reading instructions', (t) => {
  const f = fixture(t, { realTypes: true });
  for (const name of ['wave-prompt', 'verify-wave']) cpSync(join(source, 'scripts', name + '.ts'), join(f.cwd, 'scripts/conductor', name + '.ts'));
  f.tool('check-types-baseline', ['--init']);
  const measured = JSON.parse(f.tool('check-types-baseline', ['--json']).stdout);
  assert.equal(measured.count, 0, 'new toolkit code must type-check without adding a budget');
  f.git('add', '--', 'scripts/conductor/wave-prompt.ts', 'scripts/conductor/verify-wave.ts', 'scripts/conductor/types-baseline.json');
  f.git('commit', '-m', 'Use raw shared tool defaults'); f.git('push');
  f.tool('wave-prompt', ['--new', '--slug=defaults']);
  const path = join(f.cwd, 'WAVE_PROMPT_DEFAULTS.md');
  assert.match(readFileSync(path, 'utf8'), /TODO: authoritative project rules/);
  assert.match(f.tool('wave-prompt', ['--check', path], 1).output, /gap/);
  writeFileSync(path, readFileSync(path, 'utf8').replace(/⟪[^⟫]*⟫/g, 'Read PROJECT.md; this is an isolated configuration test.'));
  assert.match(f.tool('wave-prompt', ['--check', path]).output, /Ready to issue/);
});


test('counter upgrade requires migrating legacy configuration, then generation recovers', (t) => {
  const f = fixture(t);
  const path = join(f.cwd, 'scripts/conductor/wave-prompt.ts');
  const current = readFileSync(path, 'utf8');
  const pattern = /^const GATES_COUNT_RE = .*$/m;
  writeFileSync(path, current.replace(pattern, () => String.raw`const GATES_COUNT_RE = /\((\d+)\s+live gates/`));
  f.git('add', '--', 'scripts/conductor/wave-prompt.ts'); f.git('commit', '-m', 'Keep old counter regex'); f.git('push');
  assert.match(f.tool('wave-prompt', ['--new', '--slug=contract'], 2).output, /could not read a gate count/);
  writeFileSync(path, current);
  f.git('add', '--', 'scripts/conductor/wave-prompt.ts'); f.git('commit', '-m', 'Apply documented counter migration'); f.git('push');
  const prompt = generate(f);
  assert.match(f.tool('wave-prompt', ['--check', prompt]).output, /Ready to issue/);
});
