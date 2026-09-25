#!/usr/bin/env node
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const examples = dirname(fileURLToPath(import.meta.url));
const source = dirname(examples);
const usage = 'Usage: node examples/create.mjs <typescript|javascript|python> <new-directory>';

function fail(message) {
  console.error(message);
  process.exit(2);
}
const args = process.argv.slice(2);
if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
  console.log(usage);
  process.exit(0);
}
if (args.length !== 2 || !['typescript', 'javascript', 'python'].includes(args[0])) fail(usage);
const [language, input] = args;
if (!input.trim() || /[\x00-\x1f\x7f]/.test(input)) fail('Choose a directory path without control characters.');

function configure(text, key, value) {
  const pattern = new RegExp('^const ' + key + '(?::[^=\\n]+)? = .*$', 'm');
  if (!pattern.test(text)) throw new Error('Missing toolkit configuration: ' + key);
  return text.replace(pattern, () => 'const ' + key + ' = ' + value);
}

try {
  const requested = resolve(input);
  const parent = realpathSync(dirname(requested));
  const destination = join(parent, basename(requested));
  if (/[\x00-\x1f\x7f]/.test(destination)) fail('Choose a directory path without control characters.');
  try {
    lstatSync(destination);
    fail('The destination already exists. Choose a new directory.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const insideSource = relative(realpathSync(source), destination);
  if (!insideSource || (!insideSource.startsWith('..' + sep) && insideSource !== '..')) {
    fail('Choose a directory outside the Mawja checkout.');
  }
  const git = spawnSync('git', ['-C', parent, 'rev-parse', '--absolute-git-dir'], { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
  if (git.error) throw new Error('Git is required. Install Git and retry.');
  if (git.status === 0) fail('Choose a directory outside an existing Git repository.');
  if (git.status !== 128 || !git.stderr.includes('not a git repository')) {
    fail('Could not determine whether the parent directory belongs to a Git repository.');
  }
  // Read the license and configure the toolkit before creating destination files.
  const license = readFileSync(join(source, 'LICENSE'), 'utf8');
  if (!license.trim()) throw new Error('Mawja LICENSE is empty. Restore the source checkout and retry.');
  const tools = new Map();
  for (const name of ['wave-prompt', 'verify-wave', 'check-types-baseline', 'check-debt-ledger', 'count-gates']) {
    let text = readFileSync(join(source, 'scripts', name + '.ts'), 'utf8');
    if (['wave-prompt', 'verify-wave'].includes(name)) {
      text = configure(text, 'TYPES_CMD', JSON.stringify(language === 'python'
        ? 'python -B scripts/conductor/check-python-baseline.py --json'
        : 'node --import tsx scripts/conductor/check-types-baseline.ts --json'));
    }
    if (name === 'wave-prompt') {
      text = configure(text, 'GATES_CMD', JSON.stringify('node --import tsx scripts/conductor/count-gates.ts'));
      text = configure(text, 'FIXED_READS', JSON.stringify('`PROJECT.md` (project rules)'));
      if (language !== 'typescript') {
        text = configure(text, 'MEASURED_EXT', language === 'python'
          ? String.raw`/\.(ts|tsx|mts|cts|py)$/` : String.raw`/\.(ts|tsx|mts|cts|js)$/`);
        text = configure(text, 'TYPE_LABEL', JSON.stringify(language === 'python' ? 'mypy + Python syntax' : 'tsc (checkJs)'));
      }
    }
    if (name === 'verify-wave') {
      for (const [key, value] of Object.entries({ CODE_DIRS: ['app'], GUARD_DIRS: ['scripts/governance'], TEST_DIRS: ['tests'] })) {
        text = configure(text, key, JSON.stringify(value));
      }
      if (language !== 'typescript') {
        const endings = language === 'python'
          ? { CODE_END: '\\.py', GUARD_END: '\\.py', TEST_END: '\\.py' }
          : { CODE_END: '\\.js', GUARD_END: '\\.js', TEST_END: '\\.(test|spec)\\.js' };
        for (const [key, value] of Object.entries(endings)) {
          text = configure(text, key, JSON.stringify(value));
        }
      }
    }
    tools.set(name + '.ts', text);
  }
  tools.set('run-checks.mjs', readFileSync(join(source, 'scripts', 'run-checks.mjs'), 'utf8'));
  if (language === 'python') {
    tools.set('check-python-baseline.py', readFileSync(join(source, 'scripts', 'check-python-baseline.py'), 'utf8'));
  }
  const sharedReadme = join(examples, 'shared', 'README.md');
  const customReadme = existsSync(join(examples, language, 'README.md'));
  mkdirSync(destination);
  for (const directory of ['shared', language]) {
    cpSync(join(examples, directory), destination, {
      recursive: true, force: false, errorOnExist: true,
      filter: (file) => !customReadme || file !== sharedReadme,
    });
  }
  writeFileSync(join(destination, 'LICENSE'), license, { flag: 'wx' });
  const conductor = join(destination, 'scripts', 'conductor');
  mkdirSync(conductor, { recursive: true });
  writeFileSync(join(conductor, 'LICENSE'), license, { flag: 'wx' });
  for (const [name, text] of tools) writeFileSync(join(conductor, name), text, { flag: 'wx' });
  console.log('Created ' + language + ' example at ' + destination);
  console.log('Open README.md in the new project for the setup commands. Run those commands from the new project directory.');
} catch (error) {
  fail(error.message);
}
