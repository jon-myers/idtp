// const plt = require('matplotnode');
// const _ = require('lodash');
import findLastIndex from 'lodash/findLastIndex';

// import { getRaagRule } from '@/js/serverCalls.js';

const isObject = argument => typeof argument === 'object' && argument !== null;

const getStarts = durArray => {
  const cumsum = (sum => value => sum += value)(0);
  return [0].concat(durArray.slice(0, durArray.length - 1)).map(cumsum)
};

const getEnds = durArray => {
  const cumsum = (sum => value => sum += value)(0);
  return durArray.map(cumsum)
}

class Pitch {

  constructor({
    swara = 'sa',
    oct = 0,
    raised = true,
    fundamental = 261.63,
    ratios = [
      1,
      [2 ** (1 / 12), 2 ** (2 / 12)],
      [2 ** (3 / 12), 2 ** (4 / 12)],
      [2 ** (5 / 12), 2 ** (6 / 12)],
      2 ** (7 / 12),
      [2 ** (8 / 12), 2 ** (9 / 12)],
      [2 ** (10 / 12), 2 ** (11 / 12)]
    ]
  } = {}) {
    // """
    // swara: str or int, can be either sargam or number from 0 - 6 as follows
    //   0 - sa
    //   1 - re
    //   2 - ga
    //   3 - ma
    //   4 - pa
    //   5 - dha
    //   6 - ni
    // oct: integer, positive or negative. Center is assumed to be, the sa in
    //   the center of the sitar, [get approx freq here]
    // raised: boolean, if true, then pitch is suddha (or tivra, for ma),
    //   otherwise, komal (or suddha, for ma)
    // fundamental: float, frequency (in hz) of center sa
    // """
    this.sargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni'];
    const sargamLetters = this.sargam.map(s => s.slice(0, 1));
    this.ratios = ratios;
    if (typeof(raised) != 'boolean') {
      throw new SyntaxError(`invalid raised type, must be boolean: ${raised}`)
    } else {
      this.raised = raised
    }
    if (typeof(swara) === 'string') {
      if (swara.length === 2 && swara[1] === "̲") {
        if (!sargamLetters.includes(swara[0].toLowerCase())) {
          throw new SyntaxError(`invalid swara string: "${swara}"`)
        } else {
          this.swara = sargamLetters.indexOf(swara[0].toLowerCase())
          this.raised = false
        }
      }
      else if (swara.length > 1) {
        if (!this.sargam.includes(swara.toLowerCase())) {
          throw new SyntaxError(`invalid swara string: "${swara}"`)
        } else {
          this.swara = this.sargam.indexOf(swara.toLowerCase())
        }
      } else if (swara.length === 1) {
        if (!sargamLetters.includes(swara.toLowerCase())) {
          throw new SyntaxError(`invalid swara string: "${swara}"`)
        } else {
          this.swara = sargamLetters.indexOf(swara.toLowerCase())
        }
      }
    } else if (typeof(swara) === 'number') {
      if (swara < 0 || swara > this.sargam.length - 1) {
        throw new SyntaxError(`invalid swara number: ${swara}`)
      } else {
        this.swara = swara
      }
    } else {
      throw new SyntaxError(`invalad swara type: ${swara}, ${typeof(swara)}`)
    }

    if (typeof(oct) != 'number') {
      throw new SyntaxError(`invalid oct type: ${oct}`)
    } else if (!Number.isInteger(oct)) {
      throw new SyntaxError(`invalid oct number type, must be integer: ${oct}`)
    } else {
      this.oct = oct
    }

    if (typeof(fundamental) != 'number') {
      throw new SyntaxError(`invalid fundamental type, must be float: ${fundamental}`)
    }
    //   else if (Number.isInteger(fundamental)) {
    //   throw new SyntaxError(`invalid fundamental type, must be float: ${fundamental}`)
    // }
    else {
      this.fundamental = fundamental
    }
    const ratio = this.swara == 0 || this.swara == 4 ?
      this.ratios[this.swara] :
      this.ratios[this.swara][Number(this.raised)];
    this.frequency = ratio * this.fundamental * (2 ** this.oct);
  }

  get sargamLetter() {
    let s = this.sargam[this.swara].slice(0,1);
    if (this.raised) {
      s = s.toUpperCase()
    }
    // this is gilding the lily, for now, just lowercase/ uppercase is better
    // if (this.swara !== 0 && this.swara !== 4 && this.raised === false) {
    //   s = s + '\u0332'
    // }
    return s
  }

  get octavedSargamLetter() {
    let s = this.sargamLetter;
    if (this.oct === -2) {
      s = s + '\u0324'
    } else if (this.oct === -1) {
      s = s + '\u0323'
    } else if (this.oct === 1) {
      s = s + '\u0307'
    } else if (this.oct === 2) {
      s = s + '\u0308'
    }
    return s
  }

  toJSON() {
    return {
      swara: this.swara,
      raised: this.raised,
      oct: this.oct,
      ratios: this.ratios
    }
  }
}

class Articulation {
  // pluck, hammer-off, hammer-on, slide, pluck, dampen
  constructor({
    name = 'pluck',
    stroke = undefined
  } = {}) {
    this.name = name
    if (stroke !== undefined) this.stroke = stroke
  }
}

class Chikari {
  constructor({
    pitches = [
      new Pitch({
        'swara': 's',
        'oct': 2
      }),
      new Pitch({
        'swara': 's',
        'oct': 1
      }),
      new Pitch({
        'swara': 'p',
        'oct': 0
      }),
      new Pitch({
        'swara': 'g',
        'oct': 0
      })
    ],
    fundamental = new Pitch().fundamental

  } = {}) {
    this.fundamental = fundamental;
    this.pitches = pitches.map(pitch => {
      pitch.fundamental = this.fundamental;
      return pitch
    })
  }
}

class Trajectory {
  // archetypal motion from pitch to pitch, or through series of pitches

  constructor({
    id = 0,
    pitches = [new Pitch()],
    durTot = 1.0,
    durArray = undefined,
    slope = undefined,
    articulations = undefined,
    num = undefined,
    name = undefined,
    fundID12 = undefined,
    vibObj = undefined,
    instrumentation = 'Sitar',
    vowel = undefined,
    startConsonant = undefined,
    endConsonant = undefined,
  } = {}) {
    if (typeof(id) === 'number' && Number.isInteger(id)) {
      this.id = id
    } else {
      throw new SyntaxError(`invalid id type, must be int: ${id}`)
    }

    if (Array.isArray(pitches) && pitches.length > 0 && pitches.every(p => p instanceof Pitch)) {
      this.pitches = pitches
    } else if (pitches.length === 0) {
      this.pitches = pitches
    } else {
      throw new SyntaxError(`invalid pitches type, must be array of Pitch: ${pitches}`)
    }

    if (typeof(durTot) === 'number') {
      this.durTot = durTot
    } else {
      throw new SyntaxError(`invalid durTot type, must be number: ${durTot}`)
    }

    const condition = Array.isArray(durArray) && durArray.every(a => typeof(a) === 'number');
    if (durArray === undefined || condition) {
      this.durArray = durArray
    } else {
      throw new SyntaxError(`invalid durArray type, must be array of numbers: ${durArray}`)
    }

    if (slope === undefined) {
      this.slope = 2
    } else if (typeof(slope) === 'number') {
      this.slope = slope
    } else {
      throw new SyntaxError(`invalid slope type, must be number: ${slope}`)
    }
    if (vibObj === undefined) {
      this.vibObj = {
        periods: 8,
        vertOffset: 0,
        initUp: true,
        extent: 0.05
      }
    } else {
      this.vibObj = vibObj
    }

    this.articulations = articulations === undefined ? {
      0: new Articulation({
        name: 'pluck',
        stroke: 'd'
      })
    } : articulations;

    if (typeof(this.articulations) !== 'object') {
      throw new SyntaxError(`invalid articulations type, must be object: ${articulations}`)
    }
    this.freqs = this.pitches.map(p => p.frequency);
    this.logFreqs = this.freqs.map(f => Math.log2(f));
    this.num = num;
    this.name = name;
    this.name = this.name_;
    this.ids = [];
    for (let i = 0; i < 14; i++) {
      if (i !== 11) {
        this.ids.push(this[`id${i}`].bind(this))
      } else {
        this.ids.push(this.id7.bind(this))
      }
    }
    this.fundID12 = fundID12;
    this.instrumentation = instrumentation;
    this.structuredNames = {
      fixed: 0,
      bend: {
        simple: 1,
        'sloped start': 2,
        'sloped end': 3,
        ladle: 4,
        'reverse ladle': 5,
        yoyo: 6,
      },
      krintin: {
        'krintin': 7,
        'krintin slide': 8,
        'krintin slide hammer': 9,
        'spiffy krintin slide hammer': 10
      },
      slide: 11,
      silent: 12,
      vibrato: 13
    };
    this.vowel = vowel;
    this.startConsonant = startConsonant;
    this.endConsonant = endConsonant;

    if (this.startConsonant !== undefined) {
      this.articulations['0.00'] = new Articulation({
        name: 'consonant',
        stroke: this.startConsonant
      })
    }

    if (this.endConsonant !== undefined) {
      this.articulations['1.00'] = new Articulation({
        name: 'consonant',
        stroke: this.endConsonant
      })
    }

    // adding proper articulations here, although it feels like it could be
    // done better. Gonna get tricky, because other stuff is done in the compute
    // in each id.]
    if (this.id < 4) {
      this.durArray = [1]
    } else if (this.durArray === undefined && this.id === 4) {
      this.durArray = [1 / 3, 2 / 3]
    } else if (this.durArray === undefined && this.id === 5) {
      this.durArray = [2 / 3, 1 / 3]
    } else if (this.durArray === undefined && this.id === 6) {
      this.durArray = Array.from({
        length: this.logFreqs.length - 1
      }, () => {
        return 1 / (this.logFreqs.length - 1)
      })
    } else if (this.id === 7) {
      if (this.durArray === undefined) this.durArray = [0.2, 0.8];
      const starts = getStarts(this.durArray);
      this.articulations[starts[1]] = new Articulation({
        name: this.logFreqs[1] >= this.logFreqs[0] ? 'hammer-on' : 'hammer-off'
      });
    } else if (this.id === 8) {
      if (this.durArray === undefined) this.durArray = [1 / 3, 1 / 3, 1 / 3];
      const starts = getStarts(this.durArray);
      this.articulations[starts[1]] = new Articulation({
        name: 'hammer-off'
      });
      this.articulations[starts[2]] = new Articulation({
        name: 'slide'
      });
    } else if (this.id === 9) {
      if (this.durArray === undefined) this.durArray = [1 / 4, 1 / 4, 1 / 4, 1 / 4];
      const starts = getStarts(this.durArray);
      this.articulations[starts[1]] = new Articulation({
        name: 'hammer-off'
      });
      this.articulations[starts[2]] = new Articulation({
        name: 'slide'
      });
      this.articulations[starts[3]] = new Articulation({
        name: 'hammer-on'
      });
    } else if (this.id === 10) {
      if (this.durArray === undefined) this.durArray = [...Array(6)].fill(1 / 6)
      const starts = getStarts(this.durArray);
      this.articulations[starts[1]] = new Articulation({
        name: 'slide'
      });
      this.articulations[starts[2]] = new Articulation({
        name: 'hammer-on'
      });
      this.articulations[starts[3]] = new Articulation({
        name: 'hammer-off'
      });
      this.articulations[starts[4]] = new Articulation({
        name: 'slide'
      });
      this.articulations[starts[5]] = new Articulation({
        name: 'hammer-on'
      });
    } else if (this.id === 11) {
      if (this.durArray === undefined || this.durArray.length === 1) {
        this.durArray = [0.5, 0.5]
      }
      const starts = getStarts(this.durArray);
      this.articulations[starts[1]] = new Articulation({
        name: 'slide'
      });
    }
    this.durArray?.forEach((d, idx) => {
      if (d === 0) {
        console.log('removing zero dur')
        // console.log(this.logFreqs, this.pitches, this.freqs)
        this.durArray.splice(idx, 1)
        this.logFreqs.splice(idx + 1, 1);
        this.pitches.splice(idx + 1, 1);
        this.freqs.splice(idx + 1, 1);
        // console.log(this.logFreqs, this.pitches, this.freqs)
      }
    })

  }

  // get freqs() {
  //   return this.pitches.map(p => p.frequency)
  // }

  // get logFreqs() {
  //   return this.pitches.map(p => Math.log2(p.frequency))
  // }

  get name_() {
    // eventually this will replace regular `name`, just testing for now
    const names = [
      'Fixed',
      'Bend: Simple',
      'Bend: Sloped Start',
      'Bend: Sloped End',
      'Bend: Ladle',
      'Bend: Reverse Ladle',
      'Bend: Yoyo',
      'Krintin',
      'Krintin Slide',
      'Krintin Slide Hammer',
      'Spiffy Krintin Slide Hammer',
      'Slide',
      'Silent',
      'Vibrato'
    ];
    return names[this.id]
  }

  realignPitches() {
    this.logFreqs = this.pitches.map(p => Math.log2(p.frequency));
    this.freqs = this.pitches.map(p => p.frequency);
  }


  compute(x, logScale = false) {
    const value = this.ids[this.id](x);
    return logScale ? Math.log2(value) : value;
  }

  getStarts(durArray) {
    const cumsum = (sum => value => sum += value)(0);
    return [0].concat(durArray.slice(0, durArray.length - 1)).map(cumsum)
  }

  // x is always beteen zero and one

  id0(x, lf = undefined) { // steady state
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    return 2 ** logFreqs[0]
  }

  id1(x, lf = undefined) { // half cosine interpolation
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    const piX = (Math.cos(Math.PI * (x + 1)) / 2) + 0.5;
    const diff = logFreqs[1] - logFreqs[0];
    return 2 ** (piX * diff + logFreqs[0])

  }

  id2(x, lf = undefined, sl = undefined) { // asymptotic approach
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    const slope = sl === undefined ? this.slope : sl;
    const a = logFreqs[0];
    const b = logFreqs[1];
    const logFreqOut = (a - b) * ((1 - x) ** slope) + b;
    return 2 ** logFreqOut
  }

  id3(x, lf = undefined, sl = undefined) { // reverse asymptotic approach
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    const slope = sl === undefined ? this.slope : sl;
    const a = logFreqs[0];
    const b = logFreqs[1];
    const logFreqOut = (b - a) * (x ** slope) + a;
    return 2 ** logFreqOut
  }

  id4(x, lf = undefined, sl = undefined, da = undefined) { // ladle
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    const slope = sl === undefined ? this.slope : sl;
    let durArray = da === undefined ? this.durArray : da;
    if (durArray === undefined) durArray = [1 / 3, 2 / 3];
    const bend0 = x => this.id2(x, logFreqs.slice(0, 2), slope);
    const bend1 = x => this.id1(x, logFreqs.slice(1, 3));
    const out0 = x => bend0(x / durArray[0]);
    const out1 = x => bend1((x - durArray[0]) / (durArray[1]));
    const out = x => x < durArray[0] ? out0(x) : out1(x);
    return out(x)
  }

  id5(x, lf = undefined, sl = undefined, da = undefined) { // reverse ladle, or 'setup'
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    const slope = sl === undefined ? this.slope : sl;
    let durArray = da === undefined ? this.durArray : da;
    if (durArray === undefined) durArray = [2 / 3, 1 / 3];
    const bend0 = x => this.id1(x, logFreqs.slice(0, 2));
    const bend1 = x => this.id3(x, logFreqs.slice(1, 3), slope);
    const out0 = x => bend0(x / durArray[0]);
    const out1 = x => bend1((x - durArray[0]) / (durArray[1]));
    const out = x => x < durArray[0] ? out0(x) : out1(x);
    return out(x)
  }


  id6(x, lf = undefined, da = undefined) { // yoyo // make this one so it can be any length
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    let durArray = da === undefined ? this.durArray : da;

    if (durArray === undefined) {
      durArray = Array.from({
        length: logFreqs.length - 1
      }, () => 1 / (logFreqs.length - 1))
    }
    const bends = Array.from({
      length: logFreqs.length - 1
    }, (_, i) => {
      return x => this.id1(x, logFreqs.slice(i, i + 2))
    });

    const outs = Array.from({
      length: logFreqs.length - 1
    }, (_, i) => {
      let durSum = i === 0 ? 0 : durArray.slice(0, i).reduce((a, b) => a + b, 0);
      // durSum = [0].concat(durSum);
      // durSum = durSum.slice(0, durSum.length-1);
      // const durSum = durArray.slice(0, i).reduce((a, b) => a + b);
      return x => bends[i]((x - durSum) / durArray[i])
    });
    const out = x => {
      const starts = getStarts(durArray);
      const index = findLastIndex(starts, s => x >= s);
      return outs[index](x)
    };
    return out(x)
  }

  id7(x, lf = undefined, da = undefined) { // simple krintin
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    let durArray = da === undefined ? this.durArray : da;
    if (durArray === undefined) durArray = [0.5, 0.5];
    const out = x < durArray[0] ? logFreqs[0] : logFreqs[1];
    return 2 ** out
  }

  id8(x, lf = undefined, da = undefined) { // krintin slide
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    let durArray = da === undefined ? this.durArray : da;
    if (durArray === undefined) durArray = [1 / 3, 1 / 3, 1 / 3];
    const starts = getStarts(durArray);
    const index = findLastIndex(starts, s => x >= s);
    return 2 ** logFreqs[index]
  }

  id9(x, lf = undefined, da = undefined) { // krintin slide hammer
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    let durArray = da === undefined ? this.durArray : da;
    if (durArray === undefined) durArray = [1 / 4, 1 / 4, 1 / 4, 1 / 4];
    const starts = getStarts(durArray);
    const index = findLastIndex(starts, s => x >= s);
    return 2 ** logFreqs[index]
  }

  id10(x, lf = undefined, da = undefined) { // fancy krintin slide hammer
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    let durArray = da === undefined ? this.durArray : da;
    if (durArray === undefined) durArray = [...Array(6)].map((_, i) => i / 6);
    const starts = getStarts(durArray);
    const index = findLastIndex(starts, s => x >= s);
    return 2 ** logFreqs[index]
  }
  // eslint-disable-next-line no-unused-vars
  id12(x) {
    return this.fundID12
  }

  id13(x) {
    // vib object includes: periods, vertOffset, initUp, extent
    
    const periods = this.vibObj.periods;
    let vertOffset = this.vibObj.vertOffset;
    const initUp = this.vibObj.initUp;
    const extent = this.vibObj.extent;
    if (Math.abs(vertOffset) > extent / 2) {
      vertOffset = Math.sign(vertOffset) * extent / 2;
    }
    let out = Math.cos(x * 2 * Math.PI * periods + initUp * Math.PI);
    if (x < 1 / (2 * periods)) {
      const start = this.logFreqs[0];
      const end = Math.log2(this.id13(1 / (2 * periods)));
      const middle = (end + start) / 2;
      const ext = Math.abs(end - start) / 2;
      out = out * ext + middle;
      return 2 ** out
    } else if (x > 1 - 1 / (2 * periods)) {
      const start = Math.log2(this.id13(1 - 1 / (2 * periods)));
      const end = this.logFreqs[0];
      const middle = (end + start) / 2;
      const ext = Math.abs(end - start) / 2;
      out = out * ext + middle;
      return 2 ** out
    } else {
      return 2 ** (out * extent / 2 + vertOffset + this.logFreqs[0])
    }
  }

  removeConsonant(start=true) {
    if (start) {
      this.startConsonant = undefined;
      const art = this.articulations['0.00'];
      if (art && art.name === 'consonant') {
        delete this.articulations['0.00'];
      }
    } else {
      this.endConsonant = undefined;
      const art = this.articulations['1.00'];
      if (art && art.name === 'consonant') {
        delete this.articulations['1.00'];
      }
    }
  }

  addConsonant(consonant, start=true) {
    const art = new Articulation({
      name: 'consonant',
      stroke: consonant
    });
    if (start) {
      this.startConsonant = consonant;
      this.articulations['0.00'] = art;
    } else {
      this.endConsonant = consonant;
      this.articulations['1.00'] = art;
    }
  }

  changeConsonant(consonant, start=true) {
    if (start) {
      this.startConsonant = consonant;
      this.articulations['0.00'].stroke = consonant;
    } else {
      this.endConsonant = consonant;
      this.articulations['1.00'].stroke = consonant;
    }
  }


  toJSON() {
    return {
      id: this.id,
      pitches: this.pitches,
      durTot: this.durTot,
      durArray: this.durArray,
      slope: this.slope,
      articulations: this.articulations,
      startTime: this.startTime,
      num: this.num,
      name: this.name,
      fundID12: this.fundID12,
      vibObj: this.vibObj,
      instrumentation: this.instrumentation,
      vowel: this.vowel,
      startConsonant: this.startConsonant,
      endConsonant: this.endConsonant,
    }
  }
  // skip id 11, same code as id 7, just different articulation
}


class Phrase {

  constructor({
    trajectories = [],
    durTot = undefined,
    durArray = undefined,
    chikaris = {},
    raga = undefined,
    startTime = undefined,
    trajectoryGrid = undefined,
    instrumentation = ['Sitar']
  } = {}) {

    this.startTime = startTime;
    this.raga = raga;
    // this.trajectories = trajectories;
    if (trajectoryGrid !== undefined) {
      this.trajectoryGrid = trajectoryGrid;
    } else {
      this.trajectoryGrid = [trajectories];
    }
    if (this.trajectories.length === 0) {
      if (durTot === undefined) {
        this.durTot = 1;
        this.durArray = [];
      } else {
        this.durTot = durTot;
        this.durArray = []
      }
    } else {
      this.durTotFromTrajectories();
      this.durArrayFromTrajectories();
      if (durTot !== undefined && this.durTot !== durTot) {
        this.trajectories.forEach(t => t.durTot = t.durTot * durTot / this.durTot);
        this.durTot = durTot;
      }
      if (durArray !== undefined && this.durArray !== durArray) {
        this.trajectories.forEach((t, i) => {
          t.durTot = t.durTot * durArray[i] / this.durArray[i]
        })
        this.durArray = durArray;
        this.durTotFromTrajectories()
      }
    }
    this.chikaris = chikaris;
    this.assignStartTimes();
    this.assignTrajNums();
    this.instrumentation = instrumentation;
  }

  assignPhraseIdx() {
    this.trajectories.forEach(traj => traj.phraseIdx = this.pieceIdx)
  }

  assignTrajNums() {
    this.trajectories.forEach((traj, i) => traj.num = i)
  }

  durTotFromTrajectories() {
    this.durTot = this.trajectories.map(t => t.durTot).reduce((a, b) => a + b, 0)
  }

  durArrayFromTrajectories() {
    this.durTotFromTrajectories();
    this.durArray = this.trajectories.map(t => t.durTot / this.durTot);
  }

  compute(x, logScale = false) {
    if (this.durArray.length === 0) {
      return null
    } else {
      const starts = getStarts(this.durArray);
      const index = findLastIndex(starts, s => x >= s);
      const innerX = (x - starts[index]) / this.durArray[index];
      const traj = this.trajectories[index];
      return traj.compute(innerX, logScale)
    }
  }

  realignPitches() {
    this.trajectories.forEach(traj => {
      traj.pitches = traj.pitches.map(p => {
        p.ratios = this.raga.stratifiedRatios;
        return new Pitch(p)
      })
      traj.realignPitches()
    })
  }

  assignStartTimes() {
    const starts = getStarts(this.durArray).map(s => s * this.durTot)
    this.trajectories.forEach((traj, i) => {
      traj.startTime = starts[i]
    })
  }

  consolidateSilentTrajs() {
    // within phrase, if there are ever two or more silent trajectories in a 
    // row, consolidate them into one.
    let chain = false;
    let start = undefined;
    const delIdxs = [];
    this.trajectories.forEach((traj, i) => {
      if (traj.id === 12) {
        if (chain === false) {
          start = i;
          chain = true
        }
        if (i === this.trajectories.length - 1) {
          const extraDur = this.trajectories
            .slice(start+1)
            .map(t => t.durTot)
            .reduce((a, b) => a + b, 0);
          this.trajectories[start].durTot += extraDur;
          const dIdxs = [...Array(this.trajectories.length - start - 1)]
            .map((_, i) => i + start + 1);
          delIdxs.push(...dIdxs)
        }
      } else {
        if (chain === true) {
          const extraDur = this.trajectories
            .slice(start+1, i)
            .map(t => t.durTot)
            .reduce((a, b) => a + b, 0);
          const dIdxs = [...Array(i - (start+1))].map((_, i) => i + start + 1);
          this.trajectories[start].durTot += extraDur;
          delIdxs.push(...dIdxs);
          chain = false;
          start = undefined;
        }
      }
    });
    const newTrajs = this.trajectories.filter(traj => !delIdxs.includes(traj.num));
    // this.trajectories = newTrajs;
    this.trajectoryGrid[0] = newTrajs;
    this.durArrayFromTrajectories();
    this.assignStartTimes();
    this.assignTrajNums();
  }

  get trajectories() {
    return this.trajectoryGrid[0]
  }

  get swara() {
    const swara = [];
    this.trajectories.forEach(traj => {
      if (traj.id !== 12) {
        if (traj.durArray.length === traj.pitches.length - 1) {
          traj.pitches.slice(0, traj.pitches.length - 1).forEach((pitch, i) => {
            const obj = {};
            obj.pitch = pitch;
            obj.time = this.startTime + traj.startTime + getStarts(traj.durArray)[i] * traj.durTot;
            swara.push(obj)
          })
        } else {
          traj.pitches.forEach((pitch, i) => {
            const obj = {};
            obj.pitch = pitch;
            obj.time = this.startTime + traj.startTime + getStarts(traj.durArray)[i] * traj.durTot;
            swara.push(obj)
          })
        }
      }
    });
    return swara
  }

  toJSON() {
    return {
      // trajectories: this.trajectories,
      durTot: this.durTot,
      durArray: this.durArray,
      chikaris: this.chikaris,
      // connected: this.connected,
      raga: this.raga,
      startTime: this.startTime,
      trajectoryGrid: this.trajectoryGrid,
      instrumentation: this.instrumentation
    }
  }

  toNoteViewPhrase() {
    const pitches = [];
    this.trajectories.forEach(traj => {
      if (traj.id !== 0) {
        traj.pitches.forEach(pitch => pitches.push(pitch))
      } else if (Object.keys(traj.articulations) > 0) {
        traj.pitches.forEach(pitch => pitches.push(pitch))
      }
    })
    const nvPhrase = new NoteViewPhrase({
      pitches: pitches,
      durTot: this.durTot,
      raga: this.raga,
      startTime: this.startTime
    });
    return nvPhrase
  }

  offsetChikaris(deltaTime, initChikaris) {
    this.chikaris = Object.assign({}, initChikaris);
    const keys = Object.keys(this.chikaris);
    keys.forEach(key => {
      const newKey = (Number(key) - deltaTime).toFixed(2);
      if (key !== newKey) {
        Object.defineProperty(this.chikaris, newKey,
          Object.getOwnPropertyDescriptor(this.chikaris, key));
        delete this.chikaris[key]
      }
    })
  }
  
  reset() {
    this.durArrayFromTrajectories();
    this.assignStartTimes();
    this.assignPhraseIdx();
    this.assignTrajNums();
  }
}

class NoteViewPhrase {
  constructor({
    pitches = [],
    durTot = undefined,
    raga = undefined,
    startTime = undefined
  } = {}) {
    this.pitches = pitches;
    this.durTot = durTot;
    this.raga = raga;
    this.startTime = startTime;
  }
}


class Piece {

  constructor({
    phrases = [],
    durTot = undefined,
    durArray = undefined,
    raga = new Raga('Yaman'),
    title = 'untitled',
    performers = [],
    dateCreated = new Date(),
    dateModified = new Date(),
    location = 'Santa Cruz',
    transcriber = 'Anonymous User',
    _id = undefined,
    audioID = undefined,
    audio_DB_ID = undefined,
    userID = undefined,
    name = undefined,
    familyName = undefined,
    givenName = undefined,
    permissions = undefined,
    sectionStarts = undefined,
    instrumentation = ['Sitar'],
  } = {}) {
    this.phrases = phrases;
    this.raga = raga;
    if (this.phrases.length === 0) {
      if (durTot === undefined) {
        this.durTot = 1;
        this.durArray = [];
      } else {
        this.durTot = durTot;
        this.durArray = []
      }
    } else {
      this.durTotFromPhrases();
      this.durArrayFromPhrases();
      if (durTot !== undefined && this.durTot !== durTot) {
        this.phrases.forEach(p => p.durTot = p.durTot * durTot / this.durTot);
        this.durTot = durTot;
      }
      if (durArray !== undefined && this.durArray !== durArray) {
        this.phrases.forEach((p, i) => {
          p.durTot = p.durTot * durArray[i] / this.durArray[i]
        })
        this.durArray = durArray;
        this.durTotFromPhrases();
      }

      this.updateStartTimes()
    }
    this.putRagaInPhrase();
    this.title = title;
    this.performers = performers;
    this.dateCreated = dateCreated;
    this.dateModified = dateModified;
    this.location = location;
    this.transcriber = transcriber;
    this._id = _id;
    this.audioID = audioID;
    this.audio_DB_ID = audio_DB_ID;
    this.userID = userID;
    this.permissions = permissions;
    this.name = name;
    this.familyName = familyName;
    this.givenName = givenName;
    if (sectionStarts === undefined) {
      this.sectionStarts = [0];
    } else {
      this.sectionStarts = sectionStarts;
    }
    this.instrumentation = instrumentation;
    // this is really confusing becuase id12 is silent. The current solution 
    // is to just skip that number; so 12 listed below is really id13
    this.possibleTrajs = {
      'Sitar': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 
      'Vocal (M)': [0, 1, 2, 3, 4, 5, 6, 12],
      'Vocal (F)': [0, 1, 2, 3, 4, 5, 6, 12],
      'Bansuri': [0, 1, 2, 3, 4, 5, 6, 12],
      'Esraj': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      'Sarangi': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      'Rabab': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      'Santoor': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      'Sarod': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      'Shehnai': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      'Surbahar': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      'Veena (Saraswati)': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      'Veena (Vichitra)': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      'Veena, Rudra (Bin)': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      'Violin': [0, 1, 2, 3, 4, 5, 6, 12],
      'Harmonium': [0, 12],
    }
  }

  putRagaInPhrase() {
    this.phrases.forEach(p => p.raga = this.raga)
  }

  get durStarts() {
    const starts = getStarts(this.durArray.map(d => d * this.durTot));
    return starts
  }

  get trajIdxs() {
    return this.possibleTrajs[this.instrumentation[0]]
  }

  updateStartTimes() {
    this.phrases.forEach((p, i) => {
      p.startTime = this.durStarts[i];
      p.pieceIdx = i;
      p.assignPhraseIdx();
    })
  }

  durTotFromPhrases() {
    this.durTot = this.phrases.map(p => p.durTot).reduce((a, b) => a + b, 0)
  }

  durArrayFromPhrases() {
    this.durTotFromPhrases();
    this.durArray = this.phrases.map(p => p.durTot / this.durTot);
    this.updateStartTimes();
  }

  realignPitches() {
    this.phrases.forEach(p => p.realignPitches())
  }

  get sections() {
    const sections = [];
    this.sectionStarts.forEach((s, i) => {
      if (i === this.sectionStarts.length - 1) {
        sections.push(this.phrases.slice(s))
      } else {
        sections.push(this.phrases.slice(s, this.sectionStarts[i + 1]))
      }
    });
    return sections
  }


  toJSON() {
    return {
      phrases: this.phrases,
      raga: this.raga,
      durTot: this.durTot,
      durArray: this.durArray,
      title: this.title,
      performers: this.performers,
      dateCreated: this.dateCreated,
      dateModified: this.dateModified,
      location: this.location,
      transcriber: this.transcriber,
      _id: this._id,
      audioID: this.audioID,
      userID: this.userID,
      permissions: this.permissions,
      name: this.name,
      familyName: this.familyName,
      givenName: this.givenName,
      sectionStarts: this.sectionStarts,
      instrumentation: this.instrumentation,
    }
  }

}

const yamanRuleSet = {
  sa: true,
  re: {
    lowered: false,
    raised: true
  },
  ga: {
    lowered: false,
    raised: true
  },
  ma: {
    lowered: false,
    raised: true
  },
  pa: true,
  dha: {
    lowered: false,
    raised: true
  },
  ni: {
    lowered: false,
    raised: true
  }
}

class Raga {

  constructor({
    name = 'Yaman',
    fundamental = 261.63,
    ruleSet = yamanRuleSet,
    ratios = undefined,
  } = {}) {

    this.name = name;
    this.ruleSet = ruleSet;
    this.fundamental = fundamental;
    this.tuning = {
      sa: 2 ** (0 / 12),
      re: {
        lowered: 2 ** (1 / 12),
        raised: 2 ** (2 / 12)
      },
      ga: {
        lowered: 2 ** (3 / 12),
        raised: 2 ** (4 / 12)
      },
      ma: {
        lowered: 2 ** (5 / 12),
        raised: 2 ** (6 / 12)
      },
      pa: 2 ** (7 / 12),
      dha: {
        lowered: 2 ** (8 / 12),
        raised: 2 ** (9 / 12)
      },
      ni: {
        lowered: 2 ** (10 / 12),
        raised: 2 ** (11 / 12)
      }
    };
    if (ratios === undefined) {
      this.ratios = this.setRatios(this.ruleSet)
    } else {
      this.ratios = ratios
    }
    
  }

  get sargamLetters() {
    const initSargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni'];
    const sl = [];
    initSargam.forEach(s => {
      if (isObject(this.ruleSet[s])) {
        if (this.ruleSet[s].lowered) sl.push(s.slice(0, 1));
        if (this.ruleSet[s].raised) sl.push(s.slice(0, 1).toUpperCase());
      } else if (this.ruleSet[s]) {
        sl.push(s.slice(0, 1).toUpperCase())
      }
    });
    return sl
  }

  setRatios(ruleSet) {
    const sargam = Object.keys(ruleSet);
    const ratios = [];
    sargam.forEach(s => {
      if (typeof(this.tuning[s]) === 'number' && ruleSet[s]) {
        ratios.push(this.tuning[s]);
      } else {
        if (ruleSet[s].lowered) ratios.push(this.tuning[s].lowered);
        if (ruleSet[s].raised) ratios.push(this.tuning[s].raised);
      }
    })
    return ratios;
  }

  getPitches({ low=100, high=800 } = {}) {
    const sargam = Object.keys(this.ruleSet);
    const pitches = [];
    sargam.forEach(s => {
      if (typeof(this.ruleSet[s]) === 'boolean' && this.ruleSet[s]) {
        const freq = this.tuning[s] * this.fundamental;
        const octsBelow = Math.ceil(Math.log2(low/freq));
        const octsAbove = Math.floor(Math.log2(high/freq));
        for (let i = octsBelow; i <= octsAbove; i++) {
          pitches.push(new Pitch({ 
            swara: s, 
            oct: i, 
            fundamental: this.fundamental,
            ratios: this.stratifiedRatios,
          }))
        }
      } else {
        if (this.ruleSet[s].lowered) {
          const freq = this.tuning[s].lowered * this.fundamental;
          const octsBelow = Math.ceil(Math.log2(low/freq));
          const octsAbove = Math.floor(Math.log2(high/freq));
          for (let i = octsBelow; i <= octsAbove; i++) {
            pitches.push(new Pitch({ 
              swara: s, 
              oct: i, 
              raised: false, 
              fundamental: this.fundamental,
              ratios: this.stratifiedRatios, 
            }))
          }
        }
        if (this.ruleSet[s].raised) {
          const freq = this.tuning[s].raised * this.fundamental;
          const octsBelow = Math.ceil(Math.log2(low/freq));
          const octsAbove = Math.floor(Math.log2(high/freq));
          for (let i = octsBelow; i <= octsAbove; i++) {
            pitches.push(new Pitch({ 
              swara: s, 
              oct: i, 
              raised: true, 
              fundamental: this.fundamental,
              ratios: this.stratifiedRatios, 
            }))
          }
        }
      }
    });
    pitches.sort((a, b) => a.frequency - b.frequency)
    return pitches
  }

  get stratifiedRatios() {
    const sargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni'];
    const ratios = [];
    let ct = 0;
    sargam.forEach((s, sIdx) => {
      if (typeof(this.ruleSet[s]) === 'boolean') {
        if (this.ruleSet[s]) {
          ratios.push(this.ratios[ct]);
          ct++;
        } else {
          ratios.push(this.tuning[s])
        }
      } else {
        ratios.push([]);
        if (this.ruleSet[s].lowered) {
          ratios[sIdx].push(this.ratios[ct]);
          ct++;
        } else {
          ratios[sIdx].push(this.tuning[s].lowered)
        }
        if (this.ruleSet[s].raised) {
          ratios[sIdx].push(this.ratios[ct]);
          ct++;
        } else {
          ratios[sIdx].push(this.tuning[s].raised)
        }
      } 
    });
    return ratios
  }


  get tarafs() {
    const templates = {
      'Yaman': [
        new Pitch({ swara: 'ni', oct: -1, raised: true, fundamental: this.fundamental }), // 1
        new Pitch({ swara: 'pa', oct: -1, fundamental: this.fundamental }), // 2
        new Pitch({ swara: 'sa', oct: 0, fundamental: this.fundamental }), // 3
        new Pitch({ swara: 'sa', oct: 0, fundamental: this.fundamental }), // 4
        new Pitch({ swara: 're', oct: 0, raised: true, fundamental: this.fundamental }), // 5
        new Pitch({ swara: 'ga', oct: 0, raised: true, fundamental: this.fundamental }), // 6
        new Pitch({ swara: 'ma', oct: 0, raised: true, fundamental: this.fundamental }), // 7
        new Pitch({ swara: 'pa', oct: 0, fundamental: this.fundamental }), // 8
        new Pitch({ swara: 'dha', oct: 0, raised: true, fundamental: this.fundamental }), // 9
        new Pitch({ swara: 'ni', oct: 0 , raised: true, fundamental: this.fundamental }), // 10
        new Pitch({ swara: 'sa', oct: 1, fundamental: this.fundamental }), // 11
        new Pitch({ swara: 're', oct: 1, raised: true, fundamental: this.fundamental }), // 12
        new Pitch({ swara: 'ga', oct: 1, raised: true, fundamental: this.fundamental }), // 13
      ]
    };
    return templates[this.name]
  }

  get chikariPitches() {
    // const templates = {
    //   'Yaman': [
    //     new Pitch({ swara: 's', oct: 2, fundamental: this.fundamental }),
    //     new Pitch({ swara: 's', oct: 1, fundamental: this.fundamental }),
    //     new Pitch({ swara: 'p', oct: 0, fundamental: this.fundamental }),
    //     new Pitch({ swara: 'p', oct: 0, fundamental: this.fundamental })
    //   ],
    //   'Bageshri': [
    //     new Pitch({ swara: 's', oct: 2, fundamental: this.fundamental }),
    //     new Pitch({ swara: 's', oct: 1, fundamental: this.fundamental }),
    //     new Pitch({ swara: 'd', oct: 0, raised: true, fundamental: this.fundamental }),
    //     new Pitch({ swara: 'm', oct: 0, raised: false, fundamental: this.fundamental })
    //   ],
    //   'Jaijaivanti': [
    //     new Pitch({ swara: 's', oct: 2, fundamental: this.fundamental }),
    //     new Pitch({ swara: 's', oct: 1, fundamental: this.fundamental }),
    //     new Pitch({ swara: 'p', oct: 0, fundamental: this.fundamental }),
    //     new Pitch({ swara: 'g', oct: 0, raised: true, fundamental: this.fundamental })
    //   ],
    //   'Hemant': [
    //     new Pitch({ swara: 's', oct: 2, fundamental: this.fundamental }),
    //     new Pitch({ swara: 's', oct: 1, fundamental: this.fundamental }),
    //     new Pitch({ swara: 'd', oct: 0, raised: true, fundamental: this.fundamental }),
    //     new Pitch({ swara: 'm', oct: 0, raised: false, fundamental: this.fundamental })
    //   ],
    // };
    // return templates[this.name]

    return [
      new Pitch({ swara: 's', oct: 2, fundamental: this.fundamental }),
      new Pitch({ swara: 's', oct: 1, fundamental: this.fundamental }),
    ]
  }

  getFrequencies({
    low = 100,
    high = 800
  } = {}) {
    // returns all oct instances of raga's pitches that are between low and high
    const baseFreqs = this.ratios.map(r => r * this.fundamental);
    const freqs = [];
    baseFreqs.forEach(f => {
      const lowExp = Math.ceil(Math.log2(low / f));
      const highExp = Math.floor(Math.log2(high / f));
      const range = [...Array(highExp - lowExp + 1).keys()].map(i => i + lowExp);
      const exps = range.map(r => 2.0 ** r);
      const additionalFreqs = exps.map(exp => f * exp);
      freqs.push(...additionalFreqs)
    });
    freqs.sort((a, b) => (a - b));
    return freqs;
  }

  get sargamNames() {
    const names = [];
    const sargam = Object.keys(this.ruleSet);
    sargam.forEach(s => {
      if (typeof(this.ruleSet[s]) === 'object') {
        const obj = this.ruleSet[s];
        if (obj.raised) {
          const str = s.charAt(0).toUpperCase() + s.slice(1);
          names.push(str)
        }
        if (obj.lowered) {
          const str = s.charAt(0).toLowerCase() + s.slice(1);
          names.push(str)
        }
      } else {
        if (this.ruleSet[s]) {
          const str = s.charAt(0).toUpperCase() + s.slice(1);
          names.push(str)
        }
      }
    });
    return names

  }

  toJSON() {
    return {
      name: this.name,
      fundamental: this.fundamental,
      ratios: this.ratios,
    }
  }
}

export { 
  Pitch,
  Trajectory,
  Phrase,
  Piece,
  Articulation,
  Chikari,
  Raga,
  getStarts,
  getEnds
}
