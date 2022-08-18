// const plt = require('matplotnode');
const _ = require('lodash');

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
    fundamental = 261.63
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
    this.ratios = [
      1,
      [2 ** (1 / 12), 2 ** (2 / 12)],
      [2 ** (3 / 12), 2 ** (4 / 12)],
      [2 ** (5 / 12), 2 ** (6 / 12)],
      2 ** (7 / 12),
      [2 ** (8 / 12), 2 ** (9 / 12)],
      [2 ** (10 / 12), 2 ** (11 / 12)]
    ];
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
    this.frequency = ratio * this.fundamental * (2 ** this.oct)
  }

  get sargamLetter() {
    let s = this.sargam[this.swara].slice(0,1);
    if (this.swara !== 0 && this.swara !== 4 && this.raised === false) {
      s = s + '\u0332'
    }
    return s
  }

  toJSON() {
    return {
      swara: this.swara,
      raised: this.raised,
      oct: this.oct
    }
  }
}

class Articulation {
  // pluck, hammer-off, hammer-on, slide, pluck
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
    fundID12 = undefined
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
    for (let i = 0; i < 13; i++) {
      if (i !== 11) {
        this.ids.push(this[`id${i}`].bind(this))
      } else {
        this.ids.push(this.id7.bind(this))
      }
    }
    this.fundID12 = fundID12;
    // 'Fixed',
    // 'Bend: Simple',
    // 'Bend: Sloped Start',
    // 'Bend: Sloped End',
    // 'Bend: Ladle',
    // 'Bend: Reverse Ladle',
    // 'Bend: Yoyo',
    // 'Krintin',
    // 'Krintin Slide',
    // 'Krintin Slide Hammer',
    // 'Spiffy Krintin Slide Hammer',
    // 'Slide'
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
      silent: 12
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
        name: 'hammer-off'
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
      if (this.durArray === undefined) this.durArray = [0.5, 0.5];
      const starts = getStarts(this.durArray);
      this.articulations[starts[1]] = new Articulation({
        name: 'slide'
      });
    }

  }

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
      'Silent'
    ];
    return names[this.id]
  }


  compute(x, logScale = false) {
    const value = this.ids[this.id](x)
    return logScale ? Math.log2(value) : value;
  }

  getStarts(durArray) {
    const cumsum = (sum => value => sum += value)(0);
    return [0].concat(durArray.slice(0, durArray.length - 1)).map(cumsum)
  }

  // returns an object which can be put in to create a new traj
  getSpawnObj() {
    const obj = {};
    obj.id = this.id;
    obj.pitches = this.pitches;
    obj.durTot = this.durTot;
    obj.durArray = this.durArray;
    obj.slope = this.slope;
    obj.articulations = this.articulations;
    obj.num = this.num;
    obj.name = this.name;
    obj.fundID12 = this.fundID12;
    return obj
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
      const index = _.findLastIndex(starts, s => x >= s);
      if (!outs[index]) {
        console.log('')
      }
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
    const index = _.findLastIndex(starts, s => x >= s);
    return 2 ** logFreqs[index]
  }

  id9(x, lf = undefined, da = undefined) { // krintin slide hammer
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    let durArray = da === undefined ? this.durArray : da;
    if (durArray === undefined) durArray = [1 / 4, 1 / 4, 1 / 4, 1 / 4];
    const starts = getStarts(durArray);
    const index = _.findLastIndex(starts, s => x >= s);
    return 2 ** logFreqs[index]
  }

  id10(x, lf = undefined, da = undefined) { // fancy krintin slide hammer
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    let durArray = da === undefined ? this.durArray : da;
    if (durArray === undefined) durArray = [...Array(6)].map((_, i) => i / 6);
    const starts = getStarts(durArray);
    const index = _.findLastIndex(starts, s => x >= s);
    return 2 ** logFreqs[index]
  }
  // eslint-disable-next-line no-unused-vars
  id12(x) {
    return this.fundID12
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
      fundID12: this.fundID12
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
    connected = undefined,
    raga = undefined,
    startTime = undefined
  } = {}) {

    this.startTime = startTime;
    this.raga = raga;
    this.trajectories = trajectories;
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

    if (connected === undefined) {
      if (this.trajectories.length < 2) {
        this.connected = undefined
      } else {
        const arr = Array.from({
          length: this.trajectories.length - 1
        });
        const a = this.trajectories;
        this.connected = arr.map((_, i) => a[i].compute(1) === a[i + 1].compute(0))
      }
    } else {
      this.connected = connected
    }

    this.assignStartTimes();
    this.assignTrajNums();
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
      const index = _.findLastIndex(starts, s => x >= s);
      const innerX = (x - starts[index]) / this.durArray[index];
      const traj = this.trajectories[index];
      if (!traj) {
        console.log()
      }
      return traj.compute(innerX, logScale)
    }
  }

  assignStartTimes() {
    const starts = getStarts(this.durArray).map(s => s * this.durTot)
    this.trajectories.forEach((traj, i) => {
      traj.startTime = starts[i]
    })
  }

  get swara() {
    const swara = [];
    this.trajectories.forEach((traj, trajIdx) => {
      if (traj.id !== 12) {
        if (traj.durArray.length === traj.pitches.length - 1) {
          traj.pitches.slice(0, traj.pitches.length - 1).forEach((pitch, i) => {
            const obj = {};
            obj.pitch = pitch;
            obj.time = this.startTime + traj.startTime + getStarts(traj.durArray)[i] * traj.durTot;
            swara.push(obj)
          });
          if (!this.connected || !this.connected[trajIdx]) {
            const obj = {};
            obj.pitch = traj.pitches[traj.pitches.length - 1];
            obj.time = this.startTime + traj.startTime + traj.durTot - 0.05;
            swara.push(obj)
          }
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

  getSpawnObj() {
    const obj = {};
    obj.trajectories = this.trajectories;
    obj.durTot = this.durTot;
    obj.durArray = this.durArray;
    obj.chikaris = this.chikaris;
    obj.connected = this.connected;
    obj.raga = this.raga;
    obj.startTime = this.startTime;
    return obj;
  }

  toJSON() {
    return {
      trajectories: this.trajectories,
      durTot: this.durTot,
      durArray: this.durArray,
      chikaris: this.chikaris,
      connected: this.connected,
      raga: this.raga,
      startTime: this.startTime
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
    audio_DB_ID = undefined
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
    this.audio_DB_ID = audio_DB_ID

  }

  putRagaInPhrase() {
    this.phrases.forEach(p => p.raga = this.raga)
  }

  get durStarts() {
    const starts = getStarts(this.durArray.map(d => d * this.durTot));
    return starts
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

  getSpawnObj() {
    const obj = {};
    obj.phrases = this.phrases;
    obj.durTot = this.durTot;
    obj.durArray = this.durArray;
    obj.raga = this.raga;
    obj.title = this.title;
    obj.perofmers = this.performers;
    obj.dateCreated = this.dateCreated;
    obj.location = this.location;
    obj.transcriber = this.transcriber;
    obj._id = this._id;
    obj.audioID = this.audioID;
    return obj
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
      audioID: this.audioID
    }
  }

}

class Raga {

  constructor({
    name = 'Yaman',
    fundamental = 261.63
  } = {}) {

    const ruleSets = {
      'Yaman': {
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
      },
      'Malkuans': {
        sa: true,
        re: {
          lowered: false,
          raised: false
        },
        ga: {
          lowered: true,
          raised: false
        },
        ma: {
          lowered: true,
          raised: false
        },
        pa: false,
        dha: {
          lowered: true,
          raised: false
        },
        ni: {
          lowered: true,
          raised: false
        }
      },
      'Bageshri': {
        sa: true,
        re: {
          lowered: false,
          raised: true
        },
        ga: {
          lowered: true,
          raised: false
        },
        ma: {
          lowered: true,
          raised: false
        },
        pa: true,
        dha: {
          lowered: false,
          raised: true
        },
        ni: {
          lowered: true,
          raised: true
        }
      },
    };



  this.name = name;
  this.ruleSet = ruleSets[this.name];
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
  this.setRatios(ruleSets[name])
}

get sargamLetters() {
  const initSargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni'];
  const sl = [];
  initSargam.forEach(s => {
    if (isObject(this.ruleSet[s])) {
      if (this.ruleSet[s].lowered) sl.push(s.slice(0, 1) + '\u0332');
      if (this.ruleSet[s].raised) sl.push(s.slice(0, 1));
    } else if (this.ruleSet[s]) {
      sl.push(s.slice(0, 1))
    }
  });
  return sl
}

setRatios(ruleSet) {
  const sargam = Object.keys(ruleSet);
  this.ratios = [];
  sargam.forEach(s => {
    if (typeof(this.tuning[s]) === 'number' && ruleSet[s]) {
      this.ratios.push(this.tuning[s]);
    } else {
      if (ruleSet[s].lowered) this.ratios.push(this.tuning[s].lowered);
      if (ruleSet[s].raised) this.ratios.push(this.tuning[s].raised);
    }
  })
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
        pitches.push(new Pitch({ swara: s, oct: i, fundamental: this.fundamental }))
      }
    } else {
      if (this.ruleSet[s].lowered) {
        const freq = this.tuning[s].lowered * this.fundamental;
        const octsBelow = Math.ceil(Math.log2(low/freq));
        const octsAbove = Math.floor(Math.log2(high/freq));
        for (let i = octsBelow; i <= octsAbove; i++) {
          pitches.push(new Pitch({ swara: s, oct: i, raised: false, fundamental: this.fundamental }))
        }
      }
      if (this.ruleSet[s].raised) {
        const freq = this.tuning[s].raised * this.fundamental;
        const octsBelow = Math.ceil(Math.log2(low/freq));
        const octsAbove = Math.floor(Math.log2(high/freq));
        for (let i = octsBelow; i <= octsAbove; i++) {
          pitches.push(new Pitch({ swara: s, oct: i, raised: true, fundamental: this.fundamental }))
        }
      }
    }
  });
  pitches.sort((a, b) => a.frequency - b.frequency)
  return pitches
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
  const templates = {
    'Yaman': [
      new Pitch({ swara: 's', oct: 2, fundamental: this.fundamental }),
      new Pitch({ swara: 's', oct: 1, fundamental: this.fundamental }),
      new Pitch({ swara: 'p', oct: 0, fundamental: this.fundamental }),
      new Pitch({ swara: 'p', oct: 0, fundamental: this.fundamental })
    ],
    'Bageshri': [
      new Pitch({ swara: 's', oct: 2, fundamental: this.fundamental }),
      new Pitch({ swara: 's', oct: 1, fundamental: this.fundamental }),
      new Pitch({ swara: 'd', oct: 0, raised: true, fundamental: this.fundamental }),
      new Pitch({ swara: 'm', oct: 0, raised: false, fundamental: this.fundamental })
    ]
  };
  return templates[this.name]
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
    fundamental: this.fundamental
  }
}
}



exports.Pitch = Pitch
exports.Trajectory = Trajectory
exports.Phrase = Phrase
exports.Piece = Piece
exports.Articulation = Articulation
exports.Chikari = Chikari
exports.Raga = Raga
exports.getStarts = getStarts
exports.getEnds = getEnds


/////////


//
// const p = new Piece();
// console.log(JSON.stringify(p))
// const jsonString = JSON.stringify(p);


// const phrase_ = p
// console.log(traj)
// console.log(JSON.stringify(p))
// console.log(JSON.stringify(pitch))
// const x = new Array(100).fill(0).map((x, i) => i);
// const y = new Array(100).fill(0).map((x, i) => phrase.compute(i/100, logScale=true))
// //
// plt.plot(x, y)
// //
// plt.save("test.png");
