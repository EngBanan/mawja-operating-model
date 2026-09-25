// Copyright (c) 2026 Banan Abu Zahar. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runner = join(source, 'scripts', 'run-checks.mjs');
const runnerBytes = readFileSync(runner);
// Acceptance mutations (each is exercised by a targeted CLI regression):
// allow reuse by default -> fresh/default case; ignore the off switch -> switch case;
// accept a failed latest attempt -> off-path failure case; omit project inputs -> source case;
// accept skipped results -> skip case; omit age check -> expired case;
// omit final evidence validation -> later-stage corruption cases;
// omit signal checkpoints -> all-reused SIGTERM case;
// permit .git symlink targets -> excluded Git input case.
// Unaffected positive controls retain normal fresh and explicit reuse behavior.
// These cases use the real CLI, Git and filesystem.
// Fixture control lives outside fingerprinted inputs to simulate a failed execution on
// otherwise matching inputs. This intentional nondeterminism is test machinery only.
const program = `import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const control = JSON.parse(readFileSync('.git/control.json', 'utf8'));
const report = process.env.MAWJA_CHECK_REPORT;
let cases = [{id:'addition',status:'passed'}];
const out = {version:1, token:process.env.MAWJA_CHECK_TOKEN, cases};
if (control.mode === 'fail') process.exit(1);
if (control.mode === 'sleep') await new Promise(r => setTimeout(r, 15000));
if (control.mode === 'skip') cases[0].status = 'skipped';
if (control.mode === 'bad') cases[0].status = 'failed';
if (control.mode === 'missing') out.cases = [];
if (control.mode === 'extra') cases.push({id:'other',status:'passed'});
if (control.mode === 'duplicate') cases.push({...cases[0]});
if (control.mode === 'token') out.token = 'old-token';
if (control.mode === 'absent') process.exit(0);
if (control.mode === 'malformed') {writeFileSync(report, '{'); process.exit(0);}
if (control.mode === 'drift') writeFileSync('input.txt', 'changed');
if (control.mode === 'restore') {const old = readFileSync('input.txt'); writeFileSync('input.txt','changed'); writeFileSync('input.txt',old);}
if (control.mode === 'delayed-drift') {await new Promise(r => setTimeout(r, 150)); writeFileSync('input.txt','changed');}
writeFileSync(report, JSON.stringify(out));
console.log('fixture executed');
`;
const cleanEnv = () => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
  return { ...env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    GIT_AUTHOR_NAME: 'Mawja Test', GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'Mawja Test', GIT_COMMITTER_EMAIL: 'test@example.invalid' };
};
function fixture(t, mutate = () => {}) {
  const directory = mkdtempSync(join(tmpdir(), 'mawja-checks-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const env = cleanEnv();
  const git = (...args) => {
    const r = spawnSync('git', args, { cwd: directory, env, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr); return r.stdout;
  };
  git('init', '-b', 'main');
  writeFileSync(join(directory, 'check.mjs'), program);
  writeFileSync(join(directory, 'input.txt'), 'original');
  writeFileSync(join(directory, '.gitignore'), 'ignored.txt\n');
  writeFileSync(join(directory, 'run-checks.mjs'), runnerBytes);
  const config = {version:1, allowReuse:true, maxAgeSeconds:3600, scope:'Calculator addition behavior', externalInputs:[],
    checks:[{id:'calc', command:['node','check.mjs'], timeoutSeconds:2, reuse:'local-read-only', cases:['addition']}]};
  mutate(config, directory);
  writeFileSync(join(directory, 'checks.json'), JSON.stringify(config));
  git('add', 'check.mjs', 'input.txt', 'run-checks.mjs', '.gitignore', 'checks.json');
  git('commit', '-m', 'Create check fixture');
  const control = mode => writeFileSync(join(directory, '.git', 'control.json'), JSON.stringify({mode}));
  control('pass');
  const state = join(directory, '.git', 'mawja-checks');
  const run = (reuse = false, extra = {}) => spawnSync(process.execPath,
    [join(directory, 'run-checks.mjs'), 'checks.json', ...(reuse ? ['--reuse'] : [])],
    {cwd:directory, env:{...env,...extra}, encoding:'utf8', timeout:15000});
  const last = () => JSON.parse(readFileSync(join(state, 'latest.json'), 'utf8'));
  return {directory, env, git, run, control, state, last, config};
}
function passed(r, executed, reused) {
  assert.ifError(r.error);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, new RegExp(`Executed: ${executed}; previous verified results: ${reused}\\.`));
}
function failed(r, message) {
  assert.ifError(r.error);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, message);
  assert.doesNotMatch(r.stdout, /Required checks accepted/);
}

test('fresh is the default; explicit reuse retains original evidence and age', t => {
  const f = fixture(t);
  passed(f.run(), 1, 0);
  const original = f.last().results[0];
  passed(f.run(true), 0, 1);
  assert.equal(f.last().results[0].started, original.started);
  assert.equal(f.last().results[0].directory, original.directory);
  passed(f.run(), 1, 0);
  assert.notEqual(f.last().results[0].directory, original.directory);
});
test('tracked off switch overrides --reuse', t => {
  const f = fixture(t, c => {c.allowReuse=false;});
  passed(f.run(),1,0); passed(f.run(true),1,0);
});
test('checks marked never execute on every attempt', t => {
  const f = fixture(t, c => {c.checks[0].reuse='never';});
  passed(f.run(),1,0); passed(f.run(true),1,0);
});
for (const mode of ['fail','skip','bad','missing','extra','duplicate','token','absent','malformed','sleep']) {
  test(`${mode} execution with reuse off invalidates an older success`, t => {
    const f = fixture(t);
    passed(f.run(),1,0);
    f.control(mode);
    const r = f.run();
    assert.equal(r.status,1,r.stdout+r.stderr);
    assert.equal(f.last().status,'failed');
    f.control('pass');
    passed(f.run(true),1,0);
  });
}
for (const change of ['source','untracked','ignored','environment','commit','index','ref','git-config','runner']) {
  test(`${change} changes force fresh execution`, t => {
    const f = fixture(t);
    passed(f.run(),1,0);
    let env = {};
    if (change==='source') writeFileSync(join(f.directory,'input.txt'),'new');
    if (change==='untracked') writeFileSync(join(f.directory,'new.txt'),'new');
    if (change==='ignored') writeFileSync(join(f.directory,'ignored.txt'),'new');
    if (change==='environment') env={CHECK_SETTING:'changed'};
    if (change==='commit') f.git('commit','--allow-empty','-m','New identity');
    if (change==='index') f.git('update-index','--assume-unchanged','input.txt');
    if (change==='ref') f.git('branch','comparison');
    if (change==='git-config') f.git('config','mawja.changed','yes');
    if (change==='runner') writeFileSync(join(f.directory,'run-checks.mjs'),readFileSync(runner,'utf8')+'\n// change\n');
    passed(f.run(true,env),1,0);
  });
}
for (const mode of ['drift','restore']) {
  test(`${mode} during execution blocks acceptance and invalidates old success`, t => {
    const f = fixture(t); passed(f.run(),1,0); f.control(mode);
    failed(f.run(),/Inputs changed during the check/);
    f.control('pass'); passed(f.run(true),1,0);
  });
}
for (const corruption of ['missing-log','changed-report','expired','future','running','failed','invalid-json','missing-latest']) {
  test(`${corruption} evidence is not reusable`, t => {
    const f = fixture(t); passed(f.run(),1,0);
    const record = f.last();
    const directory = join(f.state,'attempts',record.results[0].directory);
    if(corruption==='missing-log') rmSync(join(directory,'stdout.log'));
    if(corruption==='changed-report') writeFileSync(join(directory,'result.json'),'{}');
    if(corruption==='expired') record.results[0].started=Date.now()-4000*1000;
    if(corruption==='future') record.results[0].finished=Date.now()+10000;
    if(corruption==='running' || corruption==='failed') record.status=corruption;
    writeFileSync(join(f.state,'latest.json'),JSON.stringify(record));
    if(corruption==='invalid-json') writeFileSync(join(f.state,'latest.json'),'{');
    if(corruption==='missing-latest') rmSync(join(f.state,'latest.json'));
    passed(f.run(true),1,0);
  });
}
test('invalid configuration blocks checks and cannot preserve an old success', t => {
  const f=fixture(t); passed(f.run(),1,0);
  const old=readFileSync(join(f.directory,'checks.json'));
  writeFileSync(join(f.directory,'checks.json'),'{}');
  failed(f.run(),/Invalid runner configuration/);
  writeFileSync(join(f.directory,'checks.json'),old);
  passed(f.run(true),1,0);
});
test('a later required failure rejects the whole attempt including reused checks', t => {
  const f=fixture(t,c=>c.checks.push({...c.checks[0],id:'required',reuse:'never'}));
  passed(f.run(),2,0);
  f.control('fail');
  const r=f.run(true);
  failed(r,/Check failed or interrupted: required/);
  assert.match(r.stdout,/calc: previous verified result/);
  assert.equal(f.last().status,'failed');
  f.control('pass'); passed(f.run(true),2,0);
});
test('input changes in a later stage reject prior reused results at finalization', t => {
  const f=fixture(t,c=>c.checks.push({...c.checks[0],id:'required',reuse:'never'}));
  passed(f.run(),2,0); f.control('drift');
  const r=f.run(true); failed(r,/Inputs changed during the check/);
  assert.match(r.stdout,/calc: previous verified result/);
});
test('exclusive lock blocks overlapping attempts without disturbing the first', t => {
  const f=fixture(t); passed(f.run(),1,0);
  mkdirSync(join(f.state,'lock'));
  const old=readFileSync(join(f.state,'latest.json'),'utf8');
  failed(f.run(true),/Runner locked/);
  assert.equal(readFileSync(join(f.state,'latest.json'),'utf8'),old);
  rmSync(join(f.state,'lock'),{recursive:true});
});
test('environment values are not stored in receipt metadata', t => {
  const f=fixture(t); passed(f.run(false,{PRIVATE_TEST_VALUE:'secret-must-not-appear'}),1,0);
  assert.doesNotMatch(readFileSync(join(f.state,'latest.json'),'utf8'),/secret-must-not-appear|PRIVATE_TEST_VALUE/);
});
test('external dependency bytes participate in the fingerprint', t => {
  const external=mkdtempSync(join(tmpdir(),'mawja-input-'));
  t.after(()=>rmSync(external,{recursive:true,force:true}));
  writeFileSync(join(external,'dependency.txt'),'first');
  const f=fixture(t,c=>c.externalInputs=[external]);
  passed(f.run(),1,0);
  writeFileSync(join(external,'dependency.txt'),'second');
  passed(f.run(true),1,0);
});
test('undeclared external symlinks fail closed', {skip:process.platform==='win32'}, t => {
  const f=fixture(t); passed(f.run(),1,0);
  const external=mkdtempSync(join(tmpdir(),'mawja-undeclared-'));
  t.after(()=>rmSync(external,{recursive:true,force:true}));
  writeFileSync(join(external,'input'),'unknown');
  symlinkSync(join(external,'input'),join(f.directory,'external-link'));
  failed(f.run(true),/External symlink/);
});

test('SIGTERM interrupts the check and prevents later reuse', {skip:process.platform==='win32'}, async t => {
  const f=fixture(t); passed(f.run(),1,0); f.control('sleep');
  const child=spawn(process.execPath,[join(f.directory,'run-checks.mjs'),'checks.json'],{cwd:f.directory,env:f.env,stdio:'ignore'});
  const ended=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
  const deadline=Date.now()+10000;
  while (Date.now()<deadline) {
    try {
      const attempt=f.last();
      if(attempt.status==='running' && existsSync(join(f.state,'attempts',attempt.id,'calc','stdout.log'))) break;
    } catch {}
    await new Promise(resolve=>setTimeout(resolve,20));
  }
  child.kill('SIGTERM');
  const result=await ended;
  assert.equal(result.code,1);
  assert.equal(f.last().status,'failed');
  assert.equal(existsSync(join(f.state,'lock')),false);
  f.control('pass'); passed(f.run(true),1,0);
});

test('declared external symlink targets are fingerprinted', {skip:process.platform==='win32'}, t => {
  const external=mkdtempSync(join(tmpdir(),'mawja-linked-input-'));
  t.after(()=>rmSync(external,{recursive:true,force:true}));
  writeFileSync(join(external,'package.txt'),'first');
  const f=fixture(t,c=>c.externalInputs=[external]);
  symlinkSync(external,join(f.directory,'linked-package'));
  passed(f.run(),1,0); passed(f.run(true),0,1);
  writeFileSync(join(external,'package.txt'),'second');
  passed(f.run(true),1,0);
});

test('evidence deleted by a later stage rejects a previously reused result', t => {
  const f=fixture(t,(c,directory)=>{
    writeFileSync(join(directory,'later.mjs'),`import {readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const control=JSON.parse(readFileSync('.git/control.json','utf8'));
if(control.remove) rmSync(control.remove);
writeFileSync(process.env.MAWJA_CHECK_REPORT,JSON.stringify({version:1,token:process.env.MAWJA_CHECK_TOKEN,cases:[{id:'addition',status:'passed'}]}));`);
    c.checks.push({...c.checks[0],id:'later',command:['node','later.mjs'],reuse:'never'});
  });
  passed(f.run(),2,0);
  const old=f.last().results[0];
  writeFileSync(join(f.directory,'.git','control.json'),JSON.stringify({mode:'pass',remove:join(f.state,'attempts',old.directory,'stdout.log')}));
  const r=f.run(true); failed(r,/Check evidence expired or changed before finalization/);
  assert.match(r.stdout,/calc: previous verified result/);
  assert.equal(f.last().status,'failed');
});

test('a symlink into excluded Git administration is not a captured input', {skip:process.platform==='win32'}, t => {
  const f=fixture(t); passed(f.run(),1,0);
  const target=join(f.directory,'.git','hidden-input');
  writeFileSync(target,'original');
  symlinkSync(target,join(f.directory,'git-link'));
  failed(f.run(true),/External symlink/);
});

test('SIGTERM in an all-reused attempt cannot finalize a success', {skip:process.platform==='win32'}, async t => {
  const f=fixture(t); passed(f.run(),1,0);
  const child=spawn(process.execPath,[join(f.directory,'run-checks.mjs'),'checks.json','--reuse'],{cwd:f.directory,env:f.env,stdio:['ignore','pipe','pipe']});
  let output=''; let sent=false;
  child.stdout.on('data',chunk=>{
    output+=chunk;
    if(!sent && output.includes('Reuse: requested')) {sent=true;child.kill('SIGTERM');}
  });
  const code=await new Promise(resolve=>child.once('exit',resolve));
  assert.ok(sent,'interrupt sent at the measured reuse boundary');
  assert.equal(code,1,output);
  assert.doesNotMatch(output,/Required checks accepted/);
  assert.equal(f.last().status,'failed');
  passed(f.run(true),1,0);
});

test('later-stage corruption also rejects fresh evidence', t => {
  const f=fixture(t,(c,directory)=>{
    writeFileSync(join(directory,'later.mjs'),`import {readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const latest=JSON.parse(readFileSync('.git/mawja-checks/latest.json','utf8'));
rmSync(join('.git/mawja-checks/attempts',latest.id,'calc','stdout.log'));
writeFileSync(process.env.MAWJA_CHECK_REPORT,JSON.stringify({version:1,token:process.env.MAWJA_CHECK_TOKEN,cases:[{id:'addition',status:'passed'}]}));`);
    c.checks.push({...c.checks[0],id:'later',command:['node','later.mjs'],reuse:'never'});
  });
  failed(f.run(),/Check evidence expired or changed before finalization/);
  assert.equal(f.last().status,'failed');
});

const pythonCommand=process.platform==='win32'?'python':'python3';
const hasPython=spawnSync(pythonCommand,['--version'],{encoding:'utf8',timeout:5000}).status===0;
test('Python virtual environments retain their invocation path', {skip:!hasPython}, t => {
  const f=fixture(t,(c,directory)=>{
    const venv=join(directory,'.venv');
    const made=spawnSync(pythonCommand,['-m','venv','--without-pip',venv],{encoding:'utf8',timeout:30000});
    assert.equal(made.status,0,made.stderr);
    const python=join(venv,process.platform==='win32'?'Scripts':'bin',process.platform==='win32'?'python.exe':'python');
    writeFileSync(join(directory,'venv_check.py'),`import json, os, sys\nfrom pathlib import Path\nassert sys.prefix == ${JSON.stringify(venv)}, (sys.prefix, sys.base_prefix)\nPath(os.environ['MAWJA_CHECK_REPORT']).write_text(json.dumps({'version':1,'token':os.environ['MAWJA_CHECK_TOKEN'],'cases':[{'id':'addition','status':'passed'}]}))\n`);
    c.checks[0].command=[python,'-B','venv_check.py'];
  });
  passed(f.run(),1,0); passed(f.run(true),0,1);
});
