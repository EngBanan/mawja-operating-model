import { add } from '../app/calc.js';

for (const [a, b, expected] of [[0, 0, 0], [2, 3, 5], [-2, 3, 1], [-2, -3, -5]]) {
  if (add(a, b) !== expected) throw new Error('calculator addition result');
}
console.log('Calculator tests passed.');
