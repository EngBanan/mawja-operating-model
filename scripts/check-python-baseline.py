#!/usr/bin/env python3
"""Measure Python syntax and mypy diagnostics against per-file type budgets.

Run from a Git checkout with Python 3.10+ and the documented mypy version.
Exit codes: 0 passing, 1 policy violation, 2 invalid setup or incomplete check.
"""
import argparse
import ast
import collections
import datetime
import json
from pathlib import Path
import re
import subprocess
import sys

# CONFIG: edit this block
# Paths are relative to the Git root containing this script.
SOURCE_DIRS = ['app', 'scripts/governance', 'tests']
BASELINE_FILE = 'scripts/conductor/types-baseline.json'
MYPY = [sys.executable, '-B', '-m', 'mypy']
MYPY_CONFIG = 'mypy.ini'
CRASH_CLASS = ['syntax', 'name-defined', 'used-before-def', 'import-not-found', 'attr-defined:import-from']
# END CONFIG


def fail(message):
    print(json.dumps({'ok': False, 'kind': 'config', 'error': message}))
    raise SystemExit(2)


def invoke(args, root):
    try:
        return subprocess.run(args, cwd=root, text=True, capture_output=True, timeout=90)
    except (OSError, subprocess.TimeoutExpired) as exc:
        fail(f'checker did not finish: {exc}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--init', action='store_true', help='create the first snapshot')
    mode.add_argument('--update', action='store_true', help='lower existing type budgets')
    parser.add_argument('--json', action='store_true', help='emit JSON for a measurement (default)')
    options = parser.parse_args()
    try:
        root = Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], cwd=Path(__file__).resolve().parent, text=True).strip())
    except (OSError, subprocess.CalledProcessError):
        fail('script is not in a Git repository')
    if not SOURCE_DIRS or any(not isinstance(folder, str) or not folder for folder in SOURCE_DIRS):
        fail("configure at least one nonempty source directory")
    files = []
    for folder in SOURCE_DIRS:
        directory = root / folder
        if not directory.is_dir():
            fail(f'missing source directory: {folder}')
        found = sorted(directory.rglob('*.py'))
        if not found:
            fail(f'no Python inputs under {folder}')
        files.extend(found)
    paths = sorted(set(p.relative_to(root).as_posix() for p in files))
    for path in paths:
        if not (root / path).resolve().is_relative_to(root):
            fail(f'Python input resolves outside the repository: {path}')
    if not (root / MYPY_CONFIG).is_file():
        fail(f'missing mypy config: {MYPY_CONFIG}')
    diagnostics = []
    parsed_sources = {}

    def missing_import(d):
        # attr-defined also covers normal object/module access. Only the
        # unresolved or unexported symbol in `from ... import ...` is fatal.
        if d['code'] != 'attr-defined':
            return False
        match = re.match(r'Module "[^"]+" (?:has no attribute|does not explicitly export attribute) "([^"]+)"', d['message'])
        if not match:
            return False
        path = root / d['file']
        if path not in parsed_sources:
            try:
                parsed_sources[path] = ast.parse(path.read_bytes(), filename=str(path))
            except (OSError, SyntaxError, ValueError) as exc:
                fail(f'cannot classify import diagnostic: {exc}')
        return any(isinstance(node, ast.ImportFrom)
                   and (node.lineno, node.col_offset) <= (d['line'], d['column'] - 1)
                   <= (node.end_lineno, node.end_col_offset)
                   and any(alias.name == match[1] for alias in node.names)
                   for node in ast.walk(parsed_sources[path]))

    for path in paths:
        try:
            compile((root / path).read_bytes(), path, 'exec', dont_inherit=True)
        except (SyntaxError, ValueError) as exc:
            diagnostics.append({'file': path, 'code': 'syntax', 'message': str(exc)})
    phase = 'syntax-only' if diagnostics else 'mypy'
    if not diagnostics:
        command = MYPY + ['--config-file', MYPY_CONFIG, '--no-incremental', '--no-pretty', '--no-color-output', '--show-column-numbers', '--show-error-codes', *paths]
        run = invoke(command, root)
        if run.returncode not in (0, 1):
            fail(f'checker did not complete normally: exit {run.returncode}: {run.stdout}{run.stderr}')
        if run.stderr.strip():
            fail(f'unexpected checker stderr: {run.stderr}')
        summary = None
        for line in run.stdout.splitlines():
            m = re.fullmatch(r'(.+?):(\d+):(\d+): error: (.*)  \[([\w-]+)\]', line)
            if m:
                path = Path(m[1])
                try:
                    path = (root / path).resolve().relative_to(root).as_posix()
                except ValueError:
                    fail(f'diagnostic outside project: {m[1]}')
                diagnostics.append({'file': path, 'line': int(m[2]), 'column': int(m[3]), 'code': m[5], 'message': m[4]})
            elif re.fullmatch(r'.+?:\d+(?::\d+)?: note: .*', line):
                continue
            elif re.fullmatch(r'Success: no issues found in \d+ source files?', line) or re.fullmatch(r'Found \d+ errors? in \d+ files? \(checked \d+ source files?\)', line):
                if summary is not None:
                    fail('duplicate checker summary')
                summary = line
            elif line.strip():
                fail(f'unreadable checker output: {line}')
        if summary is None:
            fail('missing completed checker summary')
        reported = re.search(r'^Found (\d+) errors?', summary)
        count = int(reported[1]) if reported else 0
        checked = int(re.search(r'(\d+) source files?', summary)[1])
        if count != len(diagnostics) or checked < len(paths) or (run.returncode == 0) != (count == 0):
            fail(f'inconsistent checker result: {summary}; exit={run.returncode}; parsed={len(diagnostics)}; inputs={len(paths)}')
    counts = dict(sorted(collections.Counter(d['file'] for d in diagnostics).items()))
    count = len(diagnostics)
    crash = sum(d['code'] in CRASH_CLASS or missing_import(d) for d in diagnostics)
    snapshot = root / BASELINE_FILE
    writing = options.init or options.update
    if writing and crash:
        fail('refusing snapshot with crash-class errors: ' + json.dumps(diagnostics))
    new = {'ceiling': count, 'files': counts, 'measured': datetime.date.today().isoformat()}
    if options.init:
        if snapshot.exists():
            fail('snapshot already exists; use --update after reducing errors')
        snapshot.parent.mkdir(parents=True, exist_ok=True)
        snapshot.write_text(json.dumps(new, indent=2) + '\n')
        print(f'snapshot written: ceiling {count} · {len(counts)} file budget(s)')
        return
    try:
        base = json.loads(snapshot.read_text())
        if (not isinstance(base, dict)
                or type(base.get('ceiling')) is not int or base['ceiling'] < 0
                or not isinstance(base.get('files'), dict)
                or not all(isinstance(k, str) and type(v) is int and v >= 0
                           for k, v in base['files'].items())):
            fail('invalid snapshot: budgets must be non-negative integers')
    except (OSError, ValueError, KeyError, TypeError):
        fail('missing or invalid snapshot; restore a valid snapshot, or use --init if none exists')
    over = [f'{p}: {n} > {base["files"].get(p, 0)}' for p, n in counts.items() if n > base['files'].get(p, 0)]
    if options.update:
        if count > base['ceiling'] or over:
            fail('refusing to raise ceiling or file budget: ' + '; '.join(over))
        snapshot.write_text(json.dumps(new, indent=2) + '\n')
        print(f'ceiling {base["ceiling"]} → {count}')
        return
    kind = 'crash-class' if crash else 'file-ratchet' if over else 'regression' if count > base['ceiling'] else None
    print(json.dumps({'ok': kind is None, 'kind': kind, 'count': count, 'baseline': base['ceiling'], 'crashClass': CRASH_CLASS, 'crashHits': crash, 'filesOverBudget': over, 'checkedFiles': paths, 'phase': phase, 'diagnostics': diagnostics, 'configurationFiles': [str(root / MYPY_CONFIG)]}))
    raise SystemExit(1 if kind else 0)


if __name__ == '__main__':
    try:
        main()
    except OSError as exc:
        fail(f'cannot read or write project files: {exc}')
