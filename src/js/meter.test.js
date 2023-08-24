import { expect, test } from 'vitest';
import { Meter } from './meter';

test('meter works', () => {
  const m = new Meter();
  expect(m).toBeInstanceOf(Meter);
  expect(m.realTimes).toEqual([
    0, 0.25, 0.5, 0.75, 
    1, 1.25, 1.5, 1.75,
    2, 2.25, 2.5, 2.75, 
    3, 3.25, 3.5, 3.75])
})