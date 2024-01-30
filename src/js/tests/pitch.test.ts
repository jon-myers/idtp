import { expect, test } from 'vitest';
import { Pitch } from '../classes';

test('defaultPitch', () => {
  const p = new Pitch();
  expect(p).toBeInstanceOf(Pitch);
  expect(p.swara).toEqual(0);
  expect(p.oct).toEqual(0);
  expect(p.raised).toEqual(true);
  expect(p.fundamental).toEqual(261.63);
  const ratios = [
    1, 
    [2 ** (1 / 12), 2 ** (2 / 12)],
    [2 ** (3 / 12), 2 ** (4 / 12)],
    [2 ** (5 / 12), 2 ** (6 / 12)],
    2 ** (7 / 12),
    [2 ** (8 / 12), 2 ** (9 / 12)],
    [2 ** (10 / 12), 2 ** (11 / 12)]
  ]
  expect(p.ratios).toEqual(ratios);
  expect(p.logOffset).toEqual(0);
  expect(p.frequency).toEqual(261.63);
  expect(p.nonOffsetFrequency).toEqual(261.63);
  const logFreq = Math.log2(261.63);
  expect(p.nonOffsetLogFreq).toEqual(logFreq);
  expect(p.sargamLetter).toEqual('S');
  expect(p.octavedSargamLetter).toEqual('S');
  expect(p.numberedPitch).toEqual(0);
  expect(p.chroma).toEqual(0);
  expect(p.logFreq).toEqual(logFreq);
  expect(p.toJSON()).toEqual({
    swara: 0,
    raised: true,
    oct: 0,
    ratios: ratios,
    fundamental: 261.63,
    logOffset: 0,
  })
});

test('swaraInput', () => {
  const saTest = (p: Pitch) => {
    const saFreq = 261.63;
    const saLogFreq = Math.log2(saFreq);
    expect(p.swara).toEqual(0);
    expect(p.frequency).toEqual(saFreq);
    expect(p.logFreq).toEqual(saLogFreq);
    expect(p.sargamLetter).toEqual('S');
    expect(p.raised).toEqual(true);
  };
  const reLoweredTest = (p: Pitch) => {
    const reFreq = 277.19;
    const reLogFreq = Math.log2(reFreq);
    expect (p.swara).toEqual(1);
    expect(p.frequency).toBeCloseTo(reFreq);
    expect(p.logFreq).toBeCloseTo(reLogFreq);
    expect(p.sargamLetter).toEqual('r');
  }
  const reRaisedTest = (p: Pitch) => {
    const reFreq = 293.67;
    const reLogFreq = Math.log2(reFreq);
    expect (p.swara).toEqual(1);
    expect(p.frequency).toBeCloseTo(reFreq);
    expect(p.logFreq).toBeCloseTo(reLogFreq);
    expect(p.sargamLetter).toEqual('R');
  }
  const gaLoweredTest = (p: Pitch) => {
    const gaFreq = 311.13;
    const gaLogFreq = Math.log2(gaFreq);
    expect (p.swara).toEqual(2);
    expect(p.frequency).toBeCloseTo(gaFreq);
    expect(p.logFreq).toBeCloseTo(gaLogFreq);
    expect(p.sargamLetter).toEqual('g');
  }
  const gaRaisedTest = (p: Pitch) => {
    const gaFreq = 329.63;
    const gaLogFreq = Math.log2(gaFreq);
    expect (p.swara).toEqual(2);
    expect(p.frequency).toBeCloseTo(gaFreq);
    expect(p.logFreq).toBeCloseTo(gaLogFreq);
    expect(p.sargamLetter).toEqual('G');
  }
  const maLoweredTest = (p: Pitch) => {
    const maFreq = 349.23;
    const maLogFreq = Math.log2(maFreq);
    expect (p.swara).toEqual(3);
    expect(p.frequency).toBeCloseTo(maFreq);
    expect(p.logFreq).toBeCloseTo(maLogFreq);
    expect(p.sargamLetter).toEqual('m');
  }
  const maRaisedTest = (p: Pitch) => {
    const maFreq = 370;
    const maLogFreq = Math.log2(maFreq);
    expect (p.swara).toEqual(3);
    expect(p.frequency).toBeCloseTo(maFreq);
    expect(p.logFreq).toBeCloseTo(maLogFreq);
    expect(p.sargamLetter).toEqual('M');
  }
  const paTest = (p: Pitch) => {
    const paFreq = 392;
    const paLogFreq = Math.log2(paFreq);
    expect (p.swara).toEqual(4);
    expect(p.frequency).toBeCloseTo(paFreq);
    expect(p.logFreq).toBeCloseTo(paLogFreq);
    expect(p.sargamLetter).toEqual('P');
    expect(p.raised).toEqual(true);
  }
  const dhaLoweredTest = (p: Pitch) => {
    const dhaFreq = 415.31;
    const dhaLogFreq = Math.log2(dhaFreq);
    expect (p.swara).toEqual(5);
    expect(p.frequency).toBeCloseTo(dhaFreq);
    expect(p.logFreq).toBeCloseTo(dhaLogFreq);
  }
  const dhaRaisedTest = (p: Pitch) => {
    const dhaFreq = 440.01;
    const dhaLogFreq = Math.log2(dhaFreq);
    expect (p.swara).toEqual(5);
    expect(p.frequency).toBeCloseTo(dhaFreq);
    expect(p.logFreq).toBeCloseTo(dhaLogFreq);
  }
  const niLoweredTest = (p: Pitch) => {
    const niFreq = 466.17;
    const niLogFreq = Math.log2(niFreq);
    expect (p.swara).toEqual(6);
    expect(p.frequency).toBeCloseTo(niFreq);
    expect(p.logFreq).toBeCloseTo(niLogFreq);
  }
  const niRaisedTest = (p: Pitch) => {
    const niFreq = 493.89;
    const niLogFreq = Math.log2(niFreq);
    expect (p.swara).toEqual(6);
    expect(p.frequency).toBeCloseTo(niFreq);
    expect(p.logFreq).toBeCloseTo(niLogFreq);
  }


  let p = new Pitch({ swara: 'Sa' })
  saTest(p);
  p = new Pitch({ swara: 'sa' })
  saTest(p);
  p = new Pitch({ swara: 's' })
  saTest(p);
  p = new Pitch({ swara: 'S' })
  saTest(p);
  p = new Pitch({ swara: 0 })
  saTest(p);
  p = Pitch.fromPitchNumber(0);
  saTest(p);
  // shouldn't matter if you pass it raised = false, will still be the same
  p = new Pitch({ swara: 'Sa', raised: false })
  saTest(p);

  p = new Pitch({ swara: 'Re', raised: false })
  reLoweredTest(p);
  p = new Pitch({ swara: 're', raised: false })
  reLoweredTest(p);
  p = new Pitch({ swara: 'r', raised: false })
  reLoweredTest(p);
  p = new Pitch({ swara: 'R', raised: false })
  reLoweredTest(p);
  p = new Pitch({ swara: 1, raised: false })
  reLoweredTest(p);
  p = Pitch.fromPitchNumber(1);
  reLoweredTest(p);

  p = new Pitch({ swara: 're' })
  reRaisedTest(p);
  p = new Pitch({ swara: 'Re' })
  reRaisedTest(p);
  p = new Pitch({ swara: 'r' })
  reRaisedTest(p);
  p = new Pitch({ swara: 'R'})
  reRaisedTest(p);
  p = new Pitch({ swara: 1 })
  reRaisedTest(p);
  p = Pitch.fromPitchNumber(2);
  reRaisedTest(p);

  p = new Pitch({ swara: 'ga', raised: false })
  gaLoweredTest(p);
  p = new Pitch({ swara: 'Ga', raised: false })
  gaLoweredTest(p);
  p = new Pitch({ swara: 'g', raised: false })
  gaLoweredTest(p);
  p = new Pitch({ swara: 'G', raised: false })
  gaLoweredTest(p);
  p = new Pitch({ swara: 2, raised: false })
  gaLoweredTest(p);
  p = Pitch.fromPitchNumber(3);
  gaLoweredTest(p);

  p = new Pitch({ swara: 'ga' })
  gaRaisedTest(p);
  p = new Pitch({ swara: 'Ga' })
  gaRaisedTest(p);
  p = new Pitch({ swara: 'g' })
  gaRaisedTest(p);
  p = new Pitch({ swara: 'G' })
  gaRaisedTest(p);
  p = new Pitch({ swara: 2 })
  gaRaisedTest(p);
  p = Pitch.fromPitchNumber(4);
  gaRaisedTest(p);

  p = new Pitch({ swara: 'ma', raised: false })
  maLoweredTest(p);
  p = new Pitch({ swara: 'Ma', raised: false })
  maLoweredTest(p);
  p = new Pitch({ swara: 'm', raised: false })
  maLoweredTest(p);
  p = new Pitch({ swara: 'M', raised: false })
  maLoweredTest(p);
  p = new Pitch({ swara: 3, raised: false })
  maLoweredTest(p);
  p = Pitch.fromPitchNumber(5);
  maLoweredTest(p);

  p = new Pitch({ swara: 'ma' })
  maRaisedTest(p);
  p = new Pitch({ swara: 'Ma' })
  maRaisedTest(p);
  p = new Pitch({ swara: 'm' })
  maRaisedTest(p);
  p = new Pitch({ swara: 'M' })
  maRaisedTest(p);
  p = new Pitch({ swara: 3 })
  maRaisedTest(p);
  p = Pitch.fromPitchNumber(6);
  maRaisedTest(p);

  p = new Pitch({ swara: 'pa' })
  paTest(p);
  p = new Pitch({ swara: 'Pa' })
  paTest(p);
  p = new Pitch({ swara: 'p' })
  paTest(p);
  p = new Pitch({ swara: 'P' })
  paTest(p);
  p = new Pitch({ swara: 4 })
  paTest(p);
  p = Pitch.fromPitchNumber(7);
  paTest(p);

  // shouldn't matter if you pass it raised = false, will still be the same
  p = new Pitch({ swara: 'pa', raised: false })
  paTest(p);

  p = new Pitch({ swara: 'dha', raised: false })
  dhaLoweredTest(p);
  p = new Pitch({ swara: 'Dha', raised: false })
  dhaLoweredTest(p);
  p = new Pitch({ swara: 'd', raised: false })
  dhaLoweredTest(p);
  p = new Pitch({ swara: 'D', raised: false })
  dhaLoweredTest(p);
  p = new Pitch({ swara: 5, raised: false })
  dhaLoweredTest(p);
  p = Pitch.fromPitchNumber(8);
  dhaLoweredTest(p);

  p = new Pitch({ swara: 'dha' })
  dhaRaisedTest(p);
  p = new Pitch({ swara: 'Dha' })
  dhaRaisedTest(p);
  p = new Pitch({ swara: 'd' })
  dhaRaisedTest(p);
  p = new Pitch({ swara: 'D' })
  dhaRaisedTest(p);
  p = new Pitch({ swara: 5 })
  dhaRaisedTest(p);
  p = Pitch.fromPitchNumber(9);
  dhaRaisedTest(p);

  p = new Pitch({ swara: 'ni', raised: false })
  niLoweredTest(p);
  p = new Pitch({ swara: 'Ni', raised: false })
  niLoweredTest(p);
  p = new Pitch({ swara: 'n', raised: false })
  niLoweredTest(p);
  p = new Pitch({ swara: 'N', raised: false })
  niLoweredTest(p);
  p = new Pitch({ swara: 6, raised: false })
  niLoweredTest(p);
  p = Pitch.fromPitchNumber(10);
  niLoweredTest(p);

  p = new Pitch({ swara: 'ni' })
  niRaisedTest(p);
  p = new Pitch({ swara: 'Ni' })
  niRaisedTest(p);
  p = new Pitch({ swara: 'n' })
  niRaisedTest(p);
  p = new Pitch({ swara: 'N' })
  niRaisedTest(p);
  p = new Pitch({ swara: 6 })
  niRaisedTest(p);
  p = Pitch.fromPitchNumber(11);
  niRaisedTest(p);
})

test('octaveInput', () => {
  // Only really expecting -2 - 2 to work
  let p = new Pitch({ swara: 'Sa', oct: -2 })
  const saDown2 = 'S' + '\u0324';
  const saDown1 = 'S' + '\u0323';
  const saPlus1 = 'S' + '\u0307';
  const saPlus2 = 'S' + '\u0308';
  expect(p.oct).toEqual(-2);
  expect(p.octavedSargamLetter).toEqual(saDown2);
  p.setOct(-1)
  expect(p.oct).toEqual(-1);
  expect(p.octavedSargamLetter).toEqual(saDown1);
  p.setOct(0)
  expect(p.oct).toEqual(0);
  expect(p.octavedSargamLetter).toEqual('S');
  p.setOct(1)
  expect(p.oct).toEqual(1);
  expect(p.octavedSargamLetter).toEqual(saPlus1);
  p.setOct(2)
  expect(p.oct).toEqual(2);
  expect(p.octavedSargamLetter).toEqual(saPlus2);

})

