import { add } from '../../app/calc.js';

if (add(2, 3) !== 5) throw new Error('addition behavior');
if (add(-2, 3) !== 1) throw new Error('signed addition behavior');
console.log('Addition guard passed.');
