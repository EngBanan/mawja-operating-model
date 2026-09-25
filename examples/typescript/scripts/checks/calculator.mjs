// Copyright (c) 2026 Banan Abu Zahar. SPDX-License-Identifier: MIT
import { writeFileSync } from 'node:fs';
import { add } from '../../app/calc.js';

const inputs = [
  ['zero', 0, 0, 0],
  ['positive', 2, 3, 5],
  ['mixed-sign', -2, 3, 1],
  ['negative', -2, -3, -5],
];
const cases = inputs.map(([id, a, b, expected]) => ({
  id, status: add(a, b) === expected ? 'passed' : 'failed',
}));
if (!process.env.MAWJA_CHECK_REPORT || !process.env.MAWJA_CHECK_TOKEN) {
  throw new Error('Run this check through checks:run.');
}
writeFileSync(process.env.MAWJA_CHECK_REPORT, JSON.stringify({
  version: 1, token: process.env.MAWJA_CHECK_TOKEN, cases,
}));
console.log(JSON.stringify(cases));
if (cases.some(c => c.status !== 'passed')) process.exitCode = 1;
