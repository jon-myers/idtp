import { expect, test } from 'vitest';
import { Meter } from './meter';

test('meter reset tempo for hierarchy.length === 1', () => {
  const m = new Meter();
  expect(m).toBeInstanceOf(Meter);
  expect(m.realTimes).toEqual([
    0, 0.25, 0.5, 0.75, 
    1, 1.25, 1.5, 1.75,
    2, 2.25, 2.5, 2.75, 
    3, 3.25, 3.5, 3.75]);
  const a = new Meter({ hierarchy: [4] });
  expect(a.realTimes).toEqual([0, 1, 2, 3])
  const lastPulse = a.allPulses[a.allPulses.length - 1];
  a.offsetPulse(lastPulse, -0.5)
  expect(a.realTimes).toEqual([0, 1, 2, 2.5])
  a.resetTempo();
  expect(a.realTimes).toEqual([0, 1, 2, 2.5])
  a.growCycle();
  const times = [0, 1, 2, 2.5, 10/3, 25/6, 30/6, 35/6 ];
  a.realTimes.forEach((rt, i) => {
    expect(rt).toBeCloseTo(times[i], 8)
  })

  const b = new Meter({ hierarchy: [[2, 2]] });
  expect(b.realTimes).toEqual([0, 1, 2, 3]);
  const bLastPulse = b.allPulses[b.allPulses.length - 1];
  b.offsetPulse(bLastPulse, -0.5)
  expect(b.realTimes).toEqual([0, 1, 2, 2.5]);
  b.resetTempo();
  expect(b.realTimes).toEqual([0, 1, 2, 2.5]);
  b.growCycle();
  b.realTimes.forEach((rt, i) => {
    expect(rt).toBeCloseTo(times[i], 8)
  })

})

test('meter reset tempo for more compplicated single layer hierarchy', () => {
  const a = new Meter({ hierarchy: [7] });
  const b = new Meter({ hierarchy: [[2, 2, 3]] });
  expect(a.realTimes).toEqual(b.realTimes);
  const aLastPulse = a.allPulses[a.allPulses.length - 1];
  const bLastPulse = b.allPulses[b.allPulses.length - 1];
  const aThirdPulse = a.allPulses[2];
  const bThirdPulse = b.allPulses[2];
  a.offsetPulse(aThirdPulse, 0.1)
  b.offsetPulse(bThirdPulse, 0.1)
  a.offsetPulse(aLastPulse, -0.5)
  b.offsetPulse(bLastPulse, -0.5)
  expect(a.realTimes).toEqual(b.realTimes);
  a.resetTempo();
  b.resetTempo();
  a.realTimes.forEach((rt, i) => {
    expect(rt).toBeCloseTo(b.realTimes[i], 8)
  })
  a.growCycle();
  b.growCycle();
  a.realTimes.forEach((rt, i) => {
    expect(rt).toBeCloseTo(b.realTimes[i], 8)
  })
})