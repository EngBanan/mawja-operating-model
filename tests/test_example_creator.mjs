import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const license = readFileSync(join(source, 'LICENSE'), 'utf8');

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'mawja-creator-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function create(checkout, language, destination) {
  const result = spawnSync(process.execPath, [join(checkout, 'examples', 'create.mjs'), language, destination], { encoding: 'utf8' });
  assert.ifError(result.error);
  return result;
}

for (const language of ['typescript', 'javascript', 'python']) {
  test(`${language} project includes notices for the example and portable toolkit`, (t) => {
    const destination = join(fixture(t), 'project');
    const result = create(source, language, destination);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(join(destination, 'LICENSE'), 'utf8'), license);
    assert.equal(readFileSync(join(destination, 'scripts', 'conductor', 'LICENSE'), 'utf8'), license);
    assert.equal(JSON.parse(readFileSync(join(destination, 'package.json'), 'utf8')).license, 'MIT');
    const extension = { typescript: 'ts', javascript: 'js', python: 'py' }[language];
    assert.ok(existsSync(join(destination, 'app', `calc.${extension}`)));
    assert.ok(existsSync(join(destination, 'scripts', 'conductor', 'wave-prompt.ts')));
    if (language === 'python') assert.ok(existsSync(join(destination, 'scripts', 'conductor', 'check-python-baseline.py')));
  });
}

for (const state of ['missing', 'empty']) {
  test(`${state} source license fails before creating the destination`, (t) => {
    const root = fixture(t);
    const checkout = join(root, 'source');
    mkdirSync(checkout);
    for (const directory of ['examples', 'scripts']) {
      cpSync(join(source, directory), join(checkout, directory), { recursive: true });
    }
    if (state === 'empty') writeFileSync(join(checkout, 'LICENSE'), '');
    const destination = join(root, 'project');
    const result = create(checkout, 'typescript', destination);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /LICENSE/);
    assert.equal(existsSync(destination), false);
  });
}

test('an existing project and its license are preserved', (t) => {
  const destination = join(fixture(t), 'project');
  mkdirSync(destination);
  writeFileSync(join(destination, 'LICENSE'), 'Existing project license\n');
  const result = create(source, 'typescript', destination);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /already exists/);
  assert.deepEqual(readdirSync(destination), ['LICENSE']);
  assert.equal(readFileSync(join(destination, 'LICENSE'), 'utf8'), 'Existing project license\n');
});
