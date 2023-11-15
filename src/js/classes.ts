import { findLastIndex } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { Meter } from './meter.ts';

const initSectionCategorization = (): SecCatType => {
  return {
    "Pre-Chiz Alap": {
      "Pre-Chiz Alap": false
    },
    "Alap": {
      "Alap": false,
      "Jor": false,
      "Alap-Jhala": false
    },
    "Composition Type": {
      "Dhrupad": false,
      "Bandish": false,
      "Thumri": false,
      "Ghazal": false,
      "Qawwali": false,
      "Dhun": false,
      "Tappa": false,
      "Bhajan": false,
      "Kirtan": false,
      "Kriti": false,
      "Masitkhani Gat": false,
      "Razakhani Gat": false,
      "Ferozkhani Gat": false,
    },
    "Comp.-section/Tempo": {
      "Ati Vilambit": false,
      "Vilambit": false,
      "Madhya": false,
      "Drut": false,
      "Ati Drut": false,
      "Jhala": false,
    },
    "Tala": {
      "Ektal": false,
      "Tintal": false,
      "Rupak": false,
    },
    "Improvisation": {
      "Improvisation": false,
    },
    "Other": {
      "Other": false,
    },
    "Top Level": "None"
  }
}

const initPhraseCategorization = (): PhraseCatType => {
  return {
    "Phrase": {
      "Mohra": false,
      "Mukra": false,
      "Asthai": false,
      "Antara": false,
      "Manjha": false,
      "Abhog": false,
      "Sanchari": false,
      "Jhala": false
    },
    "Elaboration": {
      "Vistar": false,
      "Barhat": false,
      "Prastar": false,
      "Bol Banao": false,
      "Bol Alap": false,
      "Bol Bandt": false,
      "Behlava": false,
      "Gat-kari": false,
      "Tan (Sapat)": false,
      "Tan (Gamak)": false,
      "Laykari": false,
      "Tihai": false,
      "Chakradar": false,
    },
    "Vocal Articulation": {
      "Bol": false,
      "Non-Tom": false,
      "Tarana": false,
      "Aakar": false,
      "Sargam": false
    },
    "Instrumental Articulation": {
      "Bol": false,
      "Non-Bol": false
    },
    "Incidental": {
      "Talk/Conversation": false,
        "Praise ('Vah')": false,
        "Tuning": false,
        "Pause": false,
    }
  }
}

const chromaToScaleDegree = (chroma: number): [number, boolean] => {
    let scaleDegree = 0;
    let raised = true;
    switch (chroma) {
      case 0:
        scaleDegree = 0;
        raised = true;
        break;
      case 1:
        scaleDegree = 1;
        raised = false;
        break;
      case 2:
        scaleDegree = 1;
        raised = true;
        break;
      case 3:
        scaleDegree = 2;
        raised = false;
        break;
      case 4:
        scaleDegree = 2;
        raised = true;
        break;
      case 5:
        scaleDegree = 3;
        raised = false;
        break;
      case 6:
        scaleDegree = 3;
        raised = true;
        break;
      case 7:
        scaleDegree = 4;
        raised = true;
        break;
      case 8:
        scaleDegree = 5;
        raised = false;
        break;
      case 9:
        scaleDegree = 5;
        raised = true;
        break;
      case 10:
        scaleDegree = 6;
        raised = false;
        break;
      case 11:
        scaleDegree = 6;
        raised = true;
        break;
    }
    return [scaleDegree, raised]
  }

const pitchNumberToChroma = (pitchNumber: number) => {
  let chroma = pitchNumber % 12;
  while (chroma < 0) {
    chroma += 12;
  }
  return chroma
}

/**
 * Generates an array of evenly spaced values between startValue and stopValue.
 * The number of values in the array is determined by cardinality.
 *
 * @param {number} startValue - The start value of the sequence.
 * @param {number} stopValue - The end value of the sequence.
 * @param {number} cardinality - The number of values to generate.
 * @returns {number[]} An array of evenly spaced values.
 */
const linSpace = (startValue: number, stopValue: number, cardinality: number) => {
  var arr = [];
  var step = (stopValue - startValue) / (cardinality - 1);
  for (var i = 0; i < cardinality; i++) {
    arr.push(startValue + (step * i));
  }
  return arr;
};

type OutputType = 'pitchNumber' | 'chroma' | 'pitch' | 'pitchClass';

/**
 * Calculates the durations of fixed pitches in a set of trajectories.
 *
 * @param {Trajectory[]} trajs - An array of Trajectory objects.
 * @param {Object} options - An object containing optional parameters.
 * @param {number} options.inst - The instrument number. Default is 0.
 * @param {OutputType} options.outputType - The type of output. Can be 'pitchNumber', 'chroma', 'pitch', or 'pitchClass'. Default is 'pitchNumber'.
 * @param {'cumulative' | 'proportional'} options.countType - The type of count. Can be 'cumulative' or 'proportional'. Default is 'cumulative'.
 *
 * @returns {NumObj} An object where the keys are pitch numbers and the values are their corresponding durations.
 *
 * @throws {SyntaxError} If the durations of fixed pitches in a trajectory is not an object.
 */
const durationsOfFixedPitches = (trajs: Trajectory[], {
  inst = 0, 
  outputType = 'pitchNumber',
  countType = 'cumulative'  // 'cumulative' or 'proportional'
}: {
  inst?: number,
  outputType?: OutputType,
  countType?: 'cumulative' | 'proportional'
} = {}) => {
  const pitchDurs: NumObj = {};
  trajs.forEach(traj => {
    const trajPitchDurs = traj.durationsOfFixedPitches({ 
      outputType: outputType,
    });
    if (typeof trajPitchDurs !== 'object' || trajPitchDurs === null) {
      throw new SyntaxError(`invalid trajPitchDurs type, must be object: ` +
        `${trajPitchDurs}`)
    }
    Object.keys(trajPitchDurs).forEach(pitchNumber => {
      if (pitchDurs[pitchNumber]) {
        pitchDurs[pitchNumber] += trajPitchDurs[pitchNumber];
      } else {
        pitchDurs[pitchNumber] = trajPitchDurs[pitchNumber];
      }
    })
  })
  if (countType === 'cumulative') {
    return pitchDurs
  } else if (countType === 'proportional') {
    let totalDuration = 0;
    Object.keys(pitchDurs).forEach(pitchNumber => {
      totalDuration += pitchDurs[pitchNumber];
    })
    Object.keys(pitchDurs).forEach(pitchNumber => {
      pitchDurs[pitchNumber] /= totalDuration;
    })
    return pitchDurs
  }
}



const isObject = (argument: any) => {
  return typeof argument === 'object' && argument !== null
}

// const cumsum: (value: number) => number = (sum => value => sum += value)(0);

// const cumsum = (sum => value => sum += value)(0);

const getStarts = (durArray: number[]) => {
  const cumsum: (value: number) => number = (sum => value => sum += value)(0);
  return [0].concat(durArray.slice(0, durArray.length - 1)).map(cumsum)
};

const getEnds = (durArray: number[]) => {
  const cumsum: (value: number) => number = (sum => value => sum += value)(0);
  return durArray.map(cumsum)
}

class Pitch {
  sargam: string[];
  ratios: (number | number[])[];
  raised: boolean;
  swara: string | number = 'sa';
  oct: number;
  fundamental: number;
  logOffset: number;

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
    ],
    logOffset = 0
  }: {
    swara?: string | number,
    oct?: number,
    raised?: boolean,
    fundamental?: number,
    ratios?: (number | number[])[]
    logOffset?: number
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
    this.logOffset = logOffset;
    this.sargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni'];
    const sargamLetters = this.sargam.map(s => s.slice(0, 1));
    this.ratios = ratios;
    this.ratios.forEach(r => {
      if (Array.isArray(r)) {
        r.forEach(subR => {
          if (subR === undefined) {
            throw new SyntaxError(`invalid ratio type, must be float: ${subR}`)
          }
        })
      } else {
        if (r === undefined) {
          throw new SyntaxError(`invalid ratio type, must be float: ${r}`)
        }
      }
    })
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
    if (typeof(this.swara) !== 'number') {
      throw new SyntaxError(`invalid swara type: ${this.swara}`)
    }

    if (typeof(oct) != 'number') {
      throw new SyntaxError(`invalid oct type: ${oct}`)
    } else if (!Number.isInteger(oct)) {
      throw new SyntaxError(`invalid oct number type, must be integer: ${oct}`)
    } else {
      this.oct = oct
    }

    if (typeof(fundamental) != 'number') {
      throw new SyntaxError(`invalid fundamental type, ` + 
        `must be float: ${fundamental}`)
    }
    else {
      this.fundamental = fundamental
    }
    // let ratio;
    // if (this.swara === 0 || this.swara === 4) {
    //   ratio = this.ratios[this.swara]
    //   if (typeof ratio !== 'number') {
    //     throw new SyntaxError(`invalid ratio type, must be float: ${ratio}`)
    //   }
    // } else {
    //   const nestedRatios = this.ratios[this.swara];
    //   if (typeof nestedRatios !== 'object') {
    //     throw new SyntaxError(`invalid nestedRatios type, ` + 
    //       `must be array: ${nestedRatios}`)
    //   }
    //   ratio = nestedRatios[Number(this.raised)]
    // }
    // this.frequency = ratio * this.fundamental * (2 ** this.oct);
  }

  static fromPitchNumber(pitchNumber: number, fundamental: number  = 261.63) {
    const oct = Math.floor(pitchNumber / 12);
    let chroma = pitchNumber % 12;
    while (chroma < 0) {
      chroma += 12
    }
    let scaleDegree, raised;
    [scaleDegree, raised] = chromaToScaleDegree(chroma);
    return new Pitch({ 
      swara: scaleDegree,
      oct: oct,
      raised: raised,
      fundamental: fundamental
    })
  }

  get frequency() {
    let ratio;
    if (this.swara === 0 || this.swara === 4) {
      ratio = this.ratios[this.swara]
      if (typeof ratio !== 'number') {
        throw new SyntaxError(`invalid ratio type, must be float: ${ratio}`)
      }
    } else {
      if (typeof this.swara !== 'number') {
        throw new SyntaxError(`invalid swara type, must be number: ${this.swara}`)
      }
      const nestedRatios = this.ratios[this.swara];
      if (typeof nestedRatios !== 'object') {
        throw new SyntaxError(`invalid nestedRatios type, ` + 
          `must be array: ${nestedRatios}`)
      }
      ratio = nestedRatios[Number(this.raised)]
    }
    return ratio * this.fundamental * (2 ** this.oct) * (2 ** this.logOffset);
  }

  get nonOffsetFrequency() {

    let ratio;
    if (this.swara === 0 || this.swara === 4) {
      ratio = this.ratios[this.swara]
      if (typeof ratio !== 'number') {
        throw new SyntaxError(`invalid ratio type, must be float: ${ratio}`)
      }
    } else {
      if (typeof this.swara !== 'number') {
        throw new SyntaxError(`invalid swara type, must be number: ${this.swara}`)
      }
      const nestedRatios = this.ratios[this.swara];
      if (typeof nestedRatios !== 'object') {
        throw new SyntaxError(`invalid nestedRatios type, ` + 
          `must be array: ${nestedRatios}`)
      }
      ratio = nestedRatios[Number(this.raised)]
    }
    return ratio * this.fundamental * (2 ** this.oct);
  }

  get nonOffsetLogFreq() {
    return Math.log2(this.nonOffsetFrequency)
  }

  setOct(newOct: number) {
    this.oct = newOct;
    let ratio;
    if (this.swara === 0 || this.swara === 4) {
      ratio = this.ratios[this.swara]
      if (typeof ratio !== 'number') {
        throw new SyntaxError(`invalid ratio type, must be float: ${ratio}`)
      }
    } else {
      if (typeof(this.swara) !== 'number') {
        throw new SyntaxError(`invalid swara type: ${this.swara}`)
      }
      const nestedRatios = this.ratios[this.swara];
      if (typeof nestedRatios !== 'object') {
        throw new SyntaxError(`invalid nestedRatios type, ` + 
          `must be array: ${nestedRatios}`)
      }
      ratio = nestedRatios[Number(this.raised)]
    }
    // this.frequency = ratio * this.fundamental * (2 ** this.oct);
  }

  get sargamLetter() {
    let s = this.sargam[this.swara as number].slice(0,1);
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


  get numberedPitch(): number { 
    // something like a midi pitch, but centered on 0 instead of 60
    if (this.swara === 0) {
      return this.oct * 12 + 0
    } else if (this.swara === 1) {
      return this.oct * 12 + 1 + Number(this.raised)
    } else if (this.swara === 2) {
      return this.oct * 12 + 3 + Number(this.raised)
    } else if (this.swara === 3) {
      return this.oct * 12 + 5 + Number(this.raised)
    } else if (this.swara === 4) {
      return this.oct * 12 + 7
    } else if (this.swara === 5) {
      return this.oct * 12 + 8 + Number(this.raised)
    } else if (this.swara === 6) {
      return this.oct * 12 + 10 + Number(this.raised)
    } else {
      throw new SyntaxError(`invalid swara: ${this.swara}`)
    }

  }

  get chroma() {
    let np = this.numberedPitch;
    while (np < 0) {
      np += 12
    }
    return np % 12
  }

  get logFreq() {
    return Math.log2(this.frequency)
  }


  toJSON() {
    return {
      swara: this.swara,
      raised: this.raised,
      oct: this.oct,
      ratios: this.ratios,
      fundamental: this.fundamental,
      logOffset: this.logOffset,
    }
  }
}

type ArtNameType = (
  'pluck' | 'hammer-off' | 'hammer-on' | 'slide' | 'dampen' | 'consonant'
)

class Articulation {
  name: ArtNameType;
  stroke: string | undefined;
  hindi: string | undefined;
  ipa: string | undefined;
  engTrans: string | undefined;

  // pluck, hammer-off, hammer-on, slide, pluck, dampen
  constructor({
    name = 'pluck',
    stroke = undefined,
    hindi = undefined,
    ipa = undefined,
    engTrans = undefined,
  }: {
    name?: ArtNameType,
    stroke?: string,
    hindi?: string,
    ipa?: string,
    engTrans?: string,
  } = {}) {
    this.name = name
    if (stroke !== undefined) this.stroke = stroke;
    if (hindi !== undefined) this.hindi = hindi;
    if (ipa !== undefined) this.ipa = ipa;
    if (engTrans !== undefined) this.engTrans = engTrans;
  }
}

class Chikari {
  fundamental: number;
  pitches: Pitch[];
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

type VibObjType = {
  periods: number;
  vertOffset: number;
  initUp: boolean;
  extent: number;
}

type IdType = 'id0' | 'id1' | 'id2' | 'id3' | 'id4' | 'id5' | 'id6' | 'id7' |
  'id8' | 'id9' | 'id10' | 'id12' | 'id13';

type IdFunction =
  ((x: number, lf?: number[], sl?: number, da?: number[]) => number) |
  ((x: number, lf?: number[], da?: number[]) => number) |
  ((x: number, lf?: number[], sl?: number) => number) |
  ((x: number, lf?: number[]) => number) |
  ((x: number) => number);

class Trajectory {
  // archetypal motion from pitch to pitch, or through series of pitches
  id: number;
  pitches: Pitch[];
  durTot: number;
  durArray?: number[];
  slope: number;
  articulations: { [key: string]: Articulation };
  num: number | undefined;
  name: string | undefined;
  fundID12: number | undefined;
  vibObj: VibObjType;
  instrumentation: string;
  vowel: string | undefined;
  vowelIpa: string | undefined;
  vowelHindi: string | undefined;
  vowelEngTrans: string | undefined;
  startConsonant: string | undefined;
  startConsonantHindi: string | undefined;
  startConsonantIpa: string | undefined;
  startConsonantEngTrans: string | undefined;
  endConsonant: string | undefined;
  endConsonantHindi: string | undefined;
  endConsonantIpa: string | undefined;
  endConsonantEngTrans: string | undefined;
  groupId?: string;
  // freqs: number[];
  // logFreqs: number[];
  ids: IdFunction[];
  structuredNames: object;
  cIpas: string[];
  cIsos: string[];
  cHindis: string[];
  cEngTrans: string[];
  vIpas: string[];
  vIsos: string[];
  vHindis: string[];
  vEngTrans: string[];
  startTime: number | undefined;
  phraseIdx: number | undefined;
  names: string[];

  get freqs() {
    return this.pitches.map(p => p.frequency)
  }

  get logFreqs() {
    return this.pitches.map(p => Math.log2(p.frequency))
  }

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
    vowelIpa = undefined,
    vowelHindi = undefined,
    vowelEngTrans = undefined,
    startConsonant = undefined,
    startConsonantHindi = undefined,
    startConsonantIpa = undefined,
    startConsonantEngTrans = undefined,
    endConsonant = undefined,
    endConsonantHindi = undefined,
    endConsonantIpa = undefined,
    endConsonantEngTrans = undefined,
    groupId = undefined,
  }: {
    id?: number,
    pitches?: Pitch[],
    durTot?: number,
    durArray?: number[],
    slope?: number,
    articulations?: { [key: string]: Articulation } | {},
    num?: number,
    name?: string,
    fundID12?: number,
    vibObj?: VibObjType,
    instrumentation?: string,
    vowel?: string,
    vowelIpa?: string,
    vowelHindi?: string,
    vowelEngTrans?: string,
    startConsonant?: string,
    startConsonantHindi?: string,
    startConsonantIpa?: string,
    startConsonantEngTrans?: string,  
    endConsonant?: string,
    endConsonantHindi?: string,
    endConsonantIpa?: string,
    endConsonantEngTrans?: string,
    groupId?: string,
  } = {}) {
    this.names = [
      'Fixed',
      'Bend: Simple',
      'Bend: Sloped Start',
      'Bend: Sloped End',
      'Bend: Ladle',
      'Bend: Reverse Ladle',
      'Bend: Simple Multiple',
      'Krintin',
      'Krintin Slide',
      'Krintin Slide Hammer',
      'Dense Krintin Slide Hammer',
      'Slide',
      'Silent',
      'Vibrato'
    ];
    if (typeof(id) === 'number' && Number.isInteger(id)) {
      this.id = id
    } else {
      throw new SyntaxError(`invalid id type, must be int: ${id}`)
    }
    let isArr = Array.isArray(pitches);
    if (isArr && pitches.length > 0 && pitches.every(p => p instanceof Pitch)) {
      this.pitches = pitches
    } else if (pitches.length === 0) {
      this.pitches = pitches
    } else {
      throw new SyntaxError('invalid pitches type, must be array of Pitch: ' + 
        `${pitches}`)
    }

    if (typeof(durTot) === 'number') {
      this.durTot = durTot
    } else {
      throw new SyntaxError(`invalid durTot type, must be number: ${durTot}`)
    }
    this.durArray = durArray;

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
      '0.00': new Articulation({
        name: 'pluck',
        stroke: 'd'
      })
    } : articulations;

    if (typeof(this.articulations) !== 'object') {
      throw new SyntaxError(`invalid articulations type, must be object: ` + 
        `${articulations}`)
    }
    // this.freqs = this.pitches.map(p => p.frequency);
    // this.logFreqs = this.freqs.map(f => Math.log2(f));
    this.num = num;
    this.name = name;
    this.name = this.name_;
    this.ids = [];
    for (let i = 0; i < 14; i++) {
      if (i !== 11) {
        const key: IdType = `id${i.toString()}` as IdType;
        this.ids.push(this[key].bind(this))
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
    this.vowelIpa = vowelIpa;
    this.vowelHindi = vowelHindi;
    this.vowelEngTrans = vowelEngTrans;
    this.startConsonant = startConsonant;
    this.startConsonantHindi = startConsonantHindi;
    this.startConsonantIpa = startConsonantIpa;
    this.startConsonantEngTrans = startConsonantEngTrans;
    this.endConsonant = endConsonant;
    this.endConsonantHindi = endConsonantHindi;
    this.endConsonantIpa = endConsonantIpa;
    this.endConsonantEngTrans = endConsonantEngTrans;
    this.groupId = groupId;
    

    if (this.startConsonant !== undefined) {
      this.articulations['0.00'] = new Articulation({
        name: 'consonant',
        stroke: this.startConsonant,
        hindi: this.startConsonantHindi,
        ipa: this.startConsonantIpa
      })
    }

    if (this.endConsonant !== undefined) {
      this.articulations['1.00'] = new Articulation({
        name: 'consonant',
        stroke: this.endConsonant,
        hindi: this.endConsonantHindi,
        ipa: this.endConsonantIpa
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
      if (this.durArray === undefined) this.durArray = [0.25, 0.25, 0.25, 0.25];
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
      if (this.durArray === undefined || (Array.isArray(this.durArray) && this.durArray.length === 1)) {
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
        this.durArray!.splice(idx, 1)
        this.logFreqs.splice(idx + 1, 1);
        this.pitches.splice(idx + 1, 1);
        this.freqs.splice(idx + 1, 1);
      }
    })

    const vox = ['Vocal (M)', 'Vocal (F)'];
    if (vox.includes(this.instrumentation)) {
      const keys = Object.keys(this.articulations)
      keys?.forEach(k => {
        if (this.articulations[k].name === 'pluck') {
          delete this.articulations[k]
        }
      })
    }
    this.cIpas = ['k', 'kʰ', 'g', 'gʱ', 'ŋ', 'c', 'cʰ', 'ɟ', 'ɟʱ', 'ɲ', 'ʈ', 
      'ʈʰ', 'ɖ', 'ɖʱ', 'n', 't', 'tʰ', 'd', 'dʱ', 'n̪', 'p', 'pʰ', 'b', 'bʱ', 
      'm', 'j', 'r', 'l', 'v', 'ʃ', 'ʂ', 's', 'h'];
    this.cIsos = ['ka', 'kha', 'ga', 'gha', 'ṅa', 'ca', 'cha', 'ja', 'jha', 
      'ña', 'ṭa', 'ṭha', 'ḍa', 'ḍha', 'na', 'ta', 'tha', 'da', 'dha', 'na', 
      'pa', 'pha', 'ba', 'bha', 'ma', 'ya', 'ra', 'la', 'va', 'śa', 'ṣa', 'sa', 
      'ha'];
    this.cHindis = ['क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ', 'ट', 
      'ठ', 'ड', 'ढ', 'न', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ़', 'ब', 'भ', 'म', 'य', 
      'र', 'ल', 'व', 'श', 'ष', 'स', 'ह'];
    this.cEngTrans = ['k', 'kh', 'g', 'gh', 'ṅ', 'c', 'ch', 'j', 'jh', 'ñ', 'ṭ', 
      'ṭh', 'ḍ', 'ḍh', 'n', 't', 'th', 'd', 'dh', 'n', 'p', 'ph', 'b', 'bh', 
      'm', 'y', 'r', 'l', 'v', 'ś', 'ṣ', 's', 'h'];
    this.vIpas = ['ə', 'aː', 'ɪ', 'iː', 'ʊ', 'uː', 'eː', 'ɛː', 'oː', 'ɔː'];
    this.vIsos = ['a', 'ā', 'i', 'ī', 'u', 'ū', 'ē', 'ai', 'ō', 'au'];
    this.vHindis = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ'];
    this.vEngTrans = ['a', 'ā', 'i', 'ī', 'u', 'ū', 'ē', 'ai', 'ō', 'au'];

    this.convertCIsoToHindiAndIpa()
  }

  get minFreq() {
    return Math.min(...this.freqs)
  }

  get maxFreq() {
    return Math.max(...this.freqs)
  }

  get endTime() {
    if (this.startTime === undefined) return undefined
    return this.startTime + this.durTot
  }


  get name_() {
    // eventually this will replace regular `name`, just testing for now
    
    return this.names[this.id]
  }

  /**
    * Computes the value of a function identified by its id at a given point.
    * 
    * @param x - The point (on a scale from 0 to 1) at which the function is evaluated.
    * @param logScale - A boolean indicating whether the result should be in logarithmic scale. Default is false.
    * 
    * @returns The value of the function at point x. If logScale is true, the result is in logarithmic scale.
    */
  compute(x: number, logScale = false) {
    const value = this.ids[this.id](x);
    return logScale ? Math.log2(value) : value;
  }

  // x is always beteen zero and one

  id0(x: number, lf?: number[]): number { // steady state
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    return 2 ** logFreqs[0]
  }

  id1(x: number, lf?: number[]): number { // half cosine interpolation
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    const piX = (Math.cos(Math.PI * (x + 1)) / 2) + 0.5;
    const diff = logFreqs[1] - logFreqs[0];
    return 2 ** (piX * diff + logFreqs[0])

  }

  id2(x: number, lf?: number[], sl?: number): number { // asymptotic approach
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    const slope = sl === undefined ? this.slope : sl;
    const a = logFreqs[0];
    const b = logFreqs[1];
    const logFreqOut = (a - b) * ((1 - x) ** slope) + b;
    return 2 ** logFreqOut
  }

  id3(x: number, lf?: number[], sl?: number): number { // reverse asymptotic approach
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    const slope = sl === undefined ? this.slope : sl;
    const a = logFreqs[0];
    const b = logFreqs[1];
    const logFreqOut = (b - a) * (x ** slope) + a;
    return 2 ** logFreqOut
  }

  id4(x: number, lf?: number[], sl?: number, da?: number[]): number { // ladle
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    const slope = sl === undefined ? this.slope : sl;
    let durArray = da === undefined ? this.durArray : da;
    if (durArray === undefined) durArray = [1 / 3, 2 / 3];
    const bend0 = (x: number) => this.id2(x, logFreqs.slice(0, 2), slope);
    const bend1 = (x: number) => this.id1(x, logFreqs.slice(1, 3));
    const out0 = (x: number) => bend0(x / durArray![0]);
    const out1 = (x: number) => bend1((x - durArray![0]) / (durArray![1]));
    const out = (x: number) => x < durArray![0] ? out0(x) : out1(x);
    return out(x)
  }

  id5(x: number, lf?: number[], sl?: number, da?: number[]): number { 
    // reverse ladle, or 'setup'
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    const slope = sl === undefined ? this.slope : sl;

    let durArray: number[] | undefined = da === undefined ? this.durArray : da;
    durArray = durArray || [1 / 3, 2 / 3];
    if (typeof(durArray) === 'undefined') {
      durArray = [2 / 3, 1 / 3];
    }

    const bend0 = (x: number) => this.id1(x, logFreqs.slice(0, 2));
    const bend1 = (x: number) => this.id3(x, logFreqs.slice(1, 3), slope);
    const out0 = (x: number) => bend0(x / durArray![0]);
    const out1 = (x: number) => bend1((x - durArray![0]) / (durArray![1]));
    const out = (x: number) => x < durArray![0] ? out0(x) : out1(x);
    return out(x)
  }


  id6(x: number, lf?: number[], da?: number[]): number { 
    // yoyo // make this one so it can be any length
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
      return (x: number) => this.id1(x, logFreqs.slice(i, i + 2))
    });

    const outs = Array.from({
      length: logFreqs.length - 1
    }, (_, i) => {
      let durSum = i === 0 ? 
        0 : 
        durArray!.slice(0, i).reduce((a, b) => a + b, 0);
      return (x: number) => bends[i]((x - durSum) / durArray![i])
    });
    const out = (x: number) => {
      const starts = getStarts(durArray!);
      const index = findLastIndex(starts, s => x >= s);
      if (index === -1) {
        console.log(outs, index)
      }
      return outs[index](x)
    };
    return out(x)
  }

  id7(x: number, lf?: number[], da?: number[]): number { // simple krintin
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    let durArray = da === undefined ? this.durArray : da;
    if (durArray === undefined) durArray = [0.5, 0.5];
    const out = x < durArray[0] ? logFreqs[0] : logFreqs[1];
    return 2 ** out
  }

  id8(x: number, lf?: number[], da?: number[]): number { // krintin slide
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    let durArray = da === undefined ? this.durArray : da;
    if (durArray === undefined) durArray = [1 / 3, 1 / 3, 1 / 3];
    const starts = getStarts(durArray);
    const index = findLastIndex(starts, s => x >= s);
    return 2 ** logFreqs[index]
  }

  id9(x: number, lf?: number[], da?: number[]): number { // krintin slide hammer
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    let durArray = da === undefined ? this.durArray : da;
    if (durArray === undefined) durArray = [1 / 4, 1 / 4, 1 / 4, 1 / 4];
    const starts = getStarts(durArray);
    const index = findLastIndex(starts, s => x >= s);
    return 2 ** logFreqs[index]
  }

  id10(x: number, lf?: number[], da?: number[]): number { // fancy krintin slide hammer
    const logFreqs = lf === undefined ? this.logFreqs : lf;
    let durArray = da === undefined ? this.durArray : da;
    if (durArray === undefined) durArray = [...Array(6)].map((_, i) => i / 6);
    const starts = getStarts(durArray);
    const index = findLastIndex(starts, s => x >= s);
    return 2 ** logFreqs[index]
  }
  // eslint-disable-next-line no-unused-vars
  id12(x: number): number {
    return this.fundID12!
  }

  id13(x: number): number {
    // vib object includes: periods, vertOffset, initUp, extent
    
    const periods = this.vibObj.periods;
    let vertOffset = this.vibObj.vertOffset;
    const initUp = this.vibObj.initUp;
    const extent = this.vibObj.extent;
    if (Math.abs(vertOffset) > extent / 2) {
      vertOffset = Math.sign(vertOffset) * extent / 2;
    }
    let out = Math.cos(x * 2 * Math.PI * periods + Number(initUp) * Math.PI);
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
      this.startConsonantHindi = undefined;
      this.startConsonantIpa = undefined;
      this.startConsonantEngTrans = undefined;
      const art = this.articulations['0.00'];
      if (art && art.name === 'consonant') {
        delete this.articulations['0.00'];
      }
    } else {
      this.endConsonant = undefined;
      this.endConsonantHindi = undefined;
      this.endConsonantIpa = undefined;
      this.endConsonantEngTrans = undefined;
      const art = this.articulations['1.00'];
      if (art && art.name === 'consonant') {
        delete this.articulations['1.00'];
      }
    }
  }

  addConsonant(consonant: string, start=true) {
    const idx = this.cIsos.indexOf(consonant);
    const hindi = this.cHindis[idx];
    const ipa = this.cIpas[idx];
    const engTrans = this.cEngTrans[idx];
    const art = new Articulation({
      name: 'consonant',
      stroke: consonant,
      hindi: hindi,
      ipa: ipa,
      engTrans: engTrans,
    });
    if (start) {
      this.startConsonant = consonant;
      this.startConsonantHindi = hindi;
      this.startConsonantIpa = ipa;
      this.startConsonantEngTrans = engTrans
      this.articulations['0.00'] = art;
    } else {
      this.endConsonant = consonant;
      this.endConsonantHindi = hindi;
      this.endConsonantIpa = ipa;
      this.endConsonantEngTrans = engTrans;
      this.articulations['1.00'] = art;
    }
  }

  changeConsonant(consonant: string, start=true) {
    const idx = this.cIsos.indexOf(consonant);
    const hindi = this.cHindis[idx];
    const ipa = this.cIpas[idx];
    const engTrans = this.cEngTrans[idx];
    if (start) {
      this.startConsonant = consonant;
      this.startConsonantHindi = hindi;
      this.startConsonantIpa = ipa;
      this.startConsonantEngTrans = engTrans;
      const art = this.articulations['0.00'];
      art.stroke = consonant;
      art.hindi = hindi;
      art.ipa = ipa;
      art.engTrans = engTrans;
    } else {
      this.endConsonant = consonant;
      this.endConsonantHindi = hindi;
      this.endConsonantIpa = ipa;
      this.endConsonantEngTrans = engTrans;
      const art = this.articulations['1.00'];
      art.stroke = consonant;
      art.hindi = hindi;
      art.ipa = ipa;
      art.engTrans = engTrans;
    }
  }

  durationsOfFixedPitches({ outputType = 'pitchNumber' }: 
    { outputType?: string } = {} ): NumObj {
    const pitchDurs: NumObj = {};
    switch (this.id.toString()) {
      case '0':
      case '13': 
        pitchDurs[this.pitches[0].numberedPitch] = this.durTot;
        break
      case '1':
      case '2':
      case '3':
        if (this.pitches[0].numberedPitch === this.pitches[1].numberedPitch) {
          pitchDurs[this.pitches[0].numberedPitch] = this.durTot;
        }
        break
      case '4':
      case '5':
        let p0 = this.pitches[0].numberedPitch;
        let p1 = this.pitches[1].numberedPitch;
        let p2 = this.pitches[2].numberedPitch;
        if (p0 === p1) {
          pitchDurs[p0] = this.durTot * this.durArray![0];
        } else if (p1 === p2) {
          if (pitchDurs[p1]) {
            pitchDurs[p1] += this.durTot * this.durArray![1];
          } else {
            pitchDurs[p1] = this.durTot * this.durArray![1];
          }
        }
        break
      case '6':
        let lastNum: number | undefined = undefined;
        this.pitches.forEach((p, i) => {
          const num = p.numberedPitch;
          if (num === lastNum) {
            if (pitchDurs[num]) {
              pitchDurs[num] += this.durTot * this.durArray![i-1];
            } else {
              pitchDurs[num] = this.durTot * this.durArray![i-1];
            }
          }
          lastNum = num;
        });
        break
      case '7':
      case '8':
      case '9':
      case '10':
      case '11':
        this.pitches.forEach((p, i) => {
          const num = p.numberedPitch;
          if (this.durArray![i] !== undefined) {
            if (pitchDurs[num]) {
              pitchDurs[num] += this.durTot * this.durArray![i];
            } else {
              pitchDurs[num] = this.durTot * this.durArray![i];
            }
          }
        });
        break
    }
    if (outputType === 'pitchNumber') {
      return pitchDurs
    } else if (outputType === 'chroma') {
      const altPitchDurs: {[key: number]: number } = {};
      Object.keys(pitchDurs).forEach(p => {
        let chromaPitch = pitchNumberToChroma(Number(p))
        altPitchDurs[chromaPitch] = pitchDurs[p];
      });
      return altPitchDurs
    } else if (outputType === 'scaleDegree') {
      const altPitchDurs: { [key: number]: number } = {};
      Object.keys(pitchDurs).forEach(p => {
        const chromaPitch = pitchNumberToChroma(Number(p));
        const scaleDegree = chromaToScaleDegree(chromaPitch)[0];
        altPitchDurs[scaleDegree] = pitchDurs[p];
      });
      return altPitchDurs
    } else if (outputType === 'sargamLetter') {
      const altPitchDurs: NumObj = {};
      Object.keys(pitchDurs).forEach(p => {
        const sargamLetter = Pitch.fromPitchNumber(Number(p)).sargamLetter;
        altPitchDurs[sargamLetter] = pitchDurs[p];
      });
      return altPitchDurs
    } else {
      throw new Error('outputType not recognized')
    }
  }

  convertCIsoToHindiAndIpa() {
    // if the consonants and vowels are in cIso_15919, add fields for hindi and 
    // ipa. If that works, delete the cIso_15919 fields.

    const keys = Object.keys(this.articulations);
    keys.forEach(key => {
      const art = this.articulations[key];
      if (art.name === 'consonant') {
        if (typeof(art.stroke) !== 'string') {
          throw new Error('stroke is not a string')
        }
        const cIso = art.stroke;
        const idx = this.cIsos.indexOf(cIso);
        if (!art['hindi']) {
          art['hindi'] = this.cHindis[idx];
        } 
        if (!art['ipa']) {
          art['ipa'] = this.cIpas[idx];
        }
        if (!art['engTrans']) {
          art['engTrans'] = this.cEngTrans[idx];
        }
      }
    })
    if (this.startConsonant !== undefined) {
      const cIso = this.startConsonant;
      const idx = this.cIsos.indexOf(cIso);
      if (!this.startConsonantHindi) {
        this.startConsonantHindi = this.cHindis[idx];
      }
      if (!this.startConsonantIpa) {
        this.startConsonantIpa = this.cIpas[idx];
      }
      if (!this.startConsonantEngTrans) {
        this.startConsonantEngTrans = this.cEngTrans[idx];
      }
    }
    if (this.endConsonant !== undefined) {
      const cIso = this.endConsonant;
      const idx = this.cIsos.indexOf(cIso);
      if (!this.endConsonantHindi) {
        this.endConsonantHindi = this.cHindis[idx];
      }
      if (!this.endConsonantIpa) {
        this.endConsonantIpa = this.cIpas[idx];
      }
      if (!this.endConsonantEngTrans) {
        this.endConsonantEngTrans = this.cEngTrans[idx];
      }
    }
    if (this.vowel !== undefined) {
      const vIso = this.vowel;
      const idx = this.vIsos.indexOf(vIso);
      if (!this.vowelHindi) {
        this.vowelHindi = this.vHindis[idx];
      }
      if (!this.vowelIpa) {
        this.vowelIpa = this.vIpas[idx];
      }
      if (!this.vowelEngTrans) {
        this.vowelEngTrans = this.vEngTrans[idx];
      }
    }
  }

  updateVowel(vIso: string) {
    const idx = this.vIsos.indexOf(vIso);
    this.vowel = vIso;
    this.vowelHindi = this.vHindis[idx];
    this.vowelIpa = this.vIpas[idx];
    this.vowelEngTrans = this.vEngTrans[idx];
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
      startConsonantHindi: this.startConsonantHindi,
      startConsonantIpa: this.startConsonantIpa,
      startConsonantEngTrans: this.startConsonantEngTrans,
      endConsonant: this.endConsonant,
      endConsonantHindi: this.endConsonantHindi,
      endConsonantIpa: this.endConsonantIpa,
      endConsonantEngTrans: this.endConsonantEngTrans,
      groupId: this.groupId
    }
  }

  static names() {
    const traj = new Trajectory();
    return traj.names
  }
  // skip id 11, same code as id 7, just different articulation
}



class Group { 
  trajectories: Trajectory[];
  id: string;



  
  //  a group of adjacent trajectories, cloneable for copy and paste
  // takes the trajectories as input (they should have already been tested for 
  // adjacency, but testing again just in case).
  // this will sit in in the phrase object, within a `groupsGrid` nested array. 
  // A reference to this group, via ID, will be held in each relevent trajectory.
  // (if we held the group itself in the traj, we would get circularity ...)

  // when reconstructing this upon loading the piece from JSON, need to make 
  // sure that the trajectories involved are the same real ones.


  constructor({
    trajectories = [],
    id = undefined,
  }: {
    trajectories?: Trajectory[],
    id?: string,
  } = {}) {
    this.trajectories = trajectories;

    this.trajectories.sort((a, b) => {
      if (a.num === undefined || b.num === undefined) {
        throw new Error('Trajectory must have a num')
      }
      return a.num - b.num
    });
    if (this.trajectories.length < 2) {
      throw new Error('Group must have at least 2 trajectories')
    }
    if (!this.testForAdjacency()) {
      throw new Error('Trajectories are not adjacent')
    }
    
    if (id === undefined) {
      id = uuidv4();
    }
    this.id = id;
    this.trajectories.forEach(traj => {
      traj.groupId = this.id;
    })
  }

  get minFreq() {
    const out = Math.min(...this.trajectories.map(t => t.minFreq));
    return out
  }

  get maxFreq() {
    const out = Math.max(...this.trajectories.map(t => t.maxFreq));
    return out
  }

  allPitches(repetition: boolean = true) {
    let allPitches: Pitch[] = [];
    this.trajectories.forEach(traj => {
      if (traj.id !== 12) {
        allPitches.push(...traj.pitches)
      }
    });
    if (!repetition) {
      allPitches = allPitches.filter((pitch, i) => {
        const c1 = i === 0;
        const c2 = pitch.swara === allPitches[i-1]?.swara;
        const c3 = pitch.oct === allPitches[i-1]?.oct;
        const c4 = pitch.raised === allPitches[i-1]?.raised;
        return c1 || !(c2 && c3 && c4)
      })
    }
    return allPitches
  }

  testForAdjacency() {
    const uniquePIdxs = [...new Set(this.trajectories.map(t => t.phraseIdx))];
    if (uniquePIdxs.length === 1) {
      this.trajectories.sort((a, b) => {
        if (a.num === undefined || b.num === undefined) {
          throw new Error('Trajectory must have a num')
        }
        return a.num - b.num
      });
      const nums = this.trajectories.map(t => {
        if (t.num === undefined) {
          throw new Error('Trajectory must have a num')
        }
        return t.num
      });
      const diffs = nums.slice(1).map((num, nIdx) => {
          return num - nums[nIdx];
      })
      return diffs.every(diff => diff === 1)
    } else {
      return false
    }
  }

  addTraj(traj: Trajectory) {
    this.trajectories.push(traj);
    this.trajectories.sort((a, b) => {
      if (a.num === undefined || b.num === undefined) {
        throw new Error('Trajectory must have a num')
      }
      return a.num - b.num
    });
    if (!this.testForAdjacency()) {
      throw new Error('Trajectories are not adjacent')
    }
    traj.groupId = this.id;
  }

  toJSON() {
    return {
      trajectories: this.trajectories,
      id: this.id
    }
  }
}

type PhraseCatType = {
  "Phrase": {
    "Mohra": boolean,
    "Mukra": boolean,
    "Asthai": boolean,
    "Antara": boolean,
    "Manjha": boolean,
    "Abhog": boolean,
    "Sanchari": boolean,
    "Jhala": boolean
  },
  "Elaboration": {
    "Vistar": boolean,
    "Barhat": boolean,
    "Prastar": boolean,
    "Bol Banao": boolean,
    "Bol Alap": boolean,
    "Bol Bandt": boolean,
    "Behlava": boolean,
    "Gat-kari": boolean,
    "Tan (Sapat)": boolean,
    "Tan (Gamak)": boolean,
    "Laykari": boolean,
    "Tihai": boolean,
    "Chakradar": boolean,
  },
  "Vocal Articulation": {
    "Bol": boolean,
    "Non-Tom": boolean,
    "Tarana": boolean,
    "Aakar": boolean,
    "Sargam": boolean
  },
  "Instrumental Articulation": {
    "Bol": boolean,
    "Non-Bol": boolean
  },
  "Incidental": {
    "Talk/Conversation": boolean,
      "Praise ('Vah')": boolean,
      "Tuning": boolean,
      "Pause": boolean,
  }
}

type SecCatType = {
  "Pre-Chiz Alap": {
    "Pre-Chiz Alap": boolean,
  },
  "Alap": {
    "Alap": boolean,
    "Jor": boolean,
    "Alap-Jhala": boolean,
  },
  "Composition Type": {
    "Dhrupad": boolean,
    "Bandish": boolean,
    "Thumri": boolean,
    "Ghazal": boolean,
    "Qawwali": boolean,
    "Dhun": boolean,
    "Tappa": boolean,
    "Bhajan": boolean,
    "Kirtan": boolean,
    "Kriti": boolean,
    "Masitkhani Gat": boolean,
    "Razakhani Gat": boolean,
    "Ferozkhani Gat": boolean,
  },
  "Comp.-section/Tempo": {
    "Ati Vilambit": boolean,
    "Vilambit": boolean,
    "Madhya": boolean,
    "Drut": boolean,
    "Ati Drut": boolean,
    "Jhala": boolean,
  },
  "Tala": {
    "Ektal": boolean,
    "Tintal": boolean,
    "Rupak": boolean
  },
  "Improvisation": {
    "Improvisation": boolean,
  },
  "Other": {
    "Other": boolean,
  },
  "Top Level": (
    "Pre-Chiz Alap" | 
    "Alap" | 
    "Composition" | 
    "Improvisation" | 
    "Other" |
    "None"
  )
}


class Phrase {
  startTime?: number;
  raga?: Raga;
  trajectoryGrid: Trajectory[][];
  instrumentation: string[];
  groupsGrid: Group[][];
  durTot?: number;
  durArray?: number[];
  chikaris: { [key: string]: Chikari };
  pieceIdx?: number;
  categorizationGrid: PhraseCatType[];
  
  constructor({
    trajectories = [],
    durTot = undefined,
    durArray = undefined,
    chikaris = {},
    raga = undefined,
    startTime = undefined,
    trajectoryGrid = undefined,
    instrumentation = ['Sitar'],
    groupsGrid = undefined,
    categorizationGrid = undefined,
  }: {
    trajectories?: Trajectory[],
    durTot?: number,
    durArray?: number[],
    chikaris?: { [key: string]: Chikari },
    raga?: Raga,
    startTime?: number,
    trajectoryGrid?: Trajectory[][],
    instrumentation?: string[],
    groupsGrid?: Group[][],
    categorizationGrid?: PhraseCatType[],
  } = {}) {

    this.startTime = startTime;
    this.raga = raga;
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
        this.trajectories.forEach(t => {
          t.durTot = t.durTot * durTot / this.durTot!
        });
        this.durTot = durTot;
      }
      if (durArray !== undefined && this.durArray !== durArray) {
        this.trajectories.forEach((t, i) => {
          t.durTot = t.durTot * durArray[i] / this.durArray![i]
        })
        this.durArray = durArray;
        this.durTotFromTrajectories()
      }
    }
    this.chikaris = chikaris;
    this.assignStartTimes();
    this.assignTrajNums();
    this.instrumentation = instrumentation;
    if (groupsGrid !== undefined) {
      this.groupsGrid = groupsGrid;
    } else {
      this.groupsGrid = this.instrumentation.map(() => []);
    }
    this.categorizationGrid = categorizationGrid || [];
    if (this.categorizationGrid.length === 0) {
      for (let i = 0; i < this.trajectoryGrid.length; i++) {
        this.categorizationGrid.push(initPhraseCategorization())
      }
    }
    if (this.categorizationGrid[0].Elaboration['Bol Alap'] === undefined) {
      this.categorizationGrid.forEach(cat => {
        cat.Elaboration['Bol Alap'] = false;
      })
    }
  }

  getGroups(idx = 0) {
    if (this.groupsGrid[idx] !== undefined) {
      return this.groupsGrid[idx]
    } else {
      throw new Error('No groups for this index')
    }
  }

  getGroupFromId(id: string) {
    const allGroups: Group[] = [];
    this.groupsGrid.forEach(groups => allGroups.push(...groups));
    return allGroups.find(g => g.id === id)
  }

  assignPhraseIdx() {
    this.trajectories.forEach(traj => traj.phraseIdx = this.pieceIdx)
  }

  assignTrajNums() {
    this.trajectories.forEach((traj, i) => traj.num = i)
  }

  durTotFromTrajectories() {
    this.durTot = this.trajectories
      .map(t => t.durTot)
      .reduce((a, b) => a + b, 0)
  }

  durArrayFromTrajectories() {
    this.durTotFromTrajectories();
    this.durArray = this.trajectories.map(t => t.durTot / this.durTot!);
  }

  compute(x: number, logScale = false) {
    if (this.durArray === undefined ) {
      throw new Error('durArray is undefined')
    }
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
        p.ratios = this.raga!.stratifiedRatios;
        return new Pitch(p)
      })
    })
  }

  assignStartTimes() {
    if (this.durArray === undefined) {
      throw new Error('durArray is undefined')
    }
    if (this.durTot === undefined) {
      throw new Error('durTot is undefined')
    }
    const starts = getStarts(this.durArray).map(s => s * this.durTot!)
    this.trajectories.forEach((traj, i) => {
      traj.startTime = starts[i]
    })
  }

  getRange() {
    // returns an object with the lowest and highest pitches in the phrase
    const allPitches = this.trajectories.map(t => t.pitches).flat();
    allPitches.sort((a, b) => a.frequency - b.frequency);
    let low = allPitches[0];
    let high = allPitches[allPitches.length - 1];
    const low_ = {
      frequency: low?.frequency,
      swara: low?.swara,
      oct: low?.oct,
      raised: low?.raised,
      numberedPitch: low?.numberedPitch,
    };
    const high_ = {
      frequency: high?.frequency,
      swara: high?.swara,
      oct: high?.oct,
      raised: high?.raised,
      numberedPitch: high?.numberedPitch,
    }
    return {
      min: low_,
      max: high_
    }
  }

  consolidateSilentTrajs() {
    // within phrase, if there are ever two or more silent trajectories in a 
    // row, consolidate them into one.
    let chain = false;
    let start: number | undefined = undefined;
    const delIdxs: number[] = [];
    this.trajectories.forEach((traj, i) => {
      if (traj.id === 12) {
        if (chain === false) {
          start = i;
          chain = true
        }
        if (i === this.trajectories.length - 1) {
          if (start === undefined) {
            throw new Error('start is undefined')
          }
          const extraDur = this.trajectories
            .slice(start+1)
            .map(t => t.durTot)
            .reduce((a, b) => a + b, 0);
          this.trajectories[start].durTot += extraDur;
          const dIdxs = [...Array(this.trajectories.length - start - 1)]
            .map((_, i) => i + start! + 1);
          delIdxs.push(...dIdxs)
        }
      } else {
        if (chain === true) {
          if (start === undefined) {
            throw new Error('start is undefined')
          }
          const extraDur = this.trajectories
            .slice(start+1, i)
            .map(t => t.durTot)
            .reduce((a, b) => a + b, 0);
          const dIdxs = [...Array(i - (start+1))].map((_, i) => i + start! + 1);
          this.trajectories[start].durTot += extraDur;
          delIdxs.push(...dIdxs);
          chain = false;
          start = undefined;
        }
      }
    });
    const newTs = this.trajectories.filter(traj => {
      if (traj.num === undefined) {
        throw new Error('traj.num is undefined')
      }
      return !delIdxs.includes(traj.num)
    });
    // this.trajectories = newTrajs;
    this.trajectoryGrid[0] = newTs;
    this.durArrayFromTrajectories();
    this.assignStartTimes();
    this.assignTrajNums();
  }

  get trajectories() {
    return this.trajectoryGrid[0]
  }

  get swara() {
    const swara: object[] = [];
    if (this.startTime === undefined) {
      throw new Error('startTime is undefined')
    }
    this.trajectories.forEach(traj => {
      if (traj.id !== 12) {
        if (traj.durArray === undefined) {
          throw new Error('traj.durArray is undefined')
        }
        if (traj.startTime === undefined) {
          throw new Error('traj.startTime is undefined')
        }
        if (traj.durArray.length === traj.pitches.length - 1) {
          traj.pitches.slice(0, traj.pitches.length - 1).forEach((pitch, i) => {
            const st = this.startTime! + traj.startTime!;
            const obj = {
              pitch: pitch,
              time: st + getStarts(traj.durArray!)[i] * traj.durTot
            };       
            swara.push(obj)
          })
        } else {
          traj.pitches.forEach((pitch, i) => {
            const st = this.startTime! + traj.startTime!;
            const obj = {
              pitch: pitch,
              time: st + getStarts(traj.durArray!)[i] * traj.durTot
            };
            obj.pitch = pitch;
            swara.push(obj)
          })
        }
      }
    });
    return swara
  }

  allPitches(repetition: boolean = true) {
    let allPitches: Pitch[] = [];
    this.trajectories.forEach(traj => {
      if (traj.id !== 12) {
        allPitches.push(...traj.pitches)
      }
    });
    if (!repetition) {
      allPitches = allPitches.filter((pitch, i) => {
        const c1 = i === 0;
        const c2 = pitch.swara === allPitches[i-1]?.swara;
        const c3 = pitch.oct === allPitches[i-1]?.oct;
        const c4 = pitch.raised === allPitches[i-1]?.raised;
        return c1 || !(c2 && c3 && c4)
      })
    }
    return allPitches
  }

  firstTrajIdxs() {
    // returns the indexes of each traj that non-silent and 1) is the first of 
    // the phrase, or 2) is preceded by a silent traj, or 3) has a starting 
    // consonant, or 4) follows a traj that has an ending consonant, or 5) is a
    // different vowel than the previous non silent traj
    // for the purpose of displaying vowels in vocal notation
    const idxs: number[] = [];
    let ct = 0;
    let silentTrigger = false;
    let lastVowel: string | undefined = undefined;
    let endConsonantTrigger: boolean | undefined = undefined;
    this.trajectories.forEach((traj, tIdx) => {
      if (traj.id !== 12) {
        const c1 = ct === 0;
        const c2 = silentTrigger;
        const c3 = traj.startConsonant !== undefined;
        const c4 = endConsonantTrigger;
        const c5 = traj.vowel !== lastVowel;
        if (c1 || c2 || c3 || c4 || c5) {
          idxs.push(tIdx);
        }
        ct += 1;
        endConsonantTrigger = traj.endConsonant !== undefined;
        lastVowel = traj.vowel;
      }
      silentTrigger = traj.id === 12;
    });
    return idxs
  }

  toJSON() {
    return {
      durTot: this.durTot,
      durArray: this.durArray,
      chikaris: this.chikaris,
      raga: this.raga,
      startTime: this.startTime,
      trajectoryGrid: this.trajectoryGrid,
      instrumentation: this.instrumentation,
      groupsGrid: this.groupsGrid,
      categorizationGrid: this.categorizationGrid,
    }
  }

  toNoteViewPhrase() {
    const pitches: Pitch[] = [];
    this.trajectories.forEach(traj => {
      if (traj.id !== 0) {
        traj.pitches.forEach(pitch => pitches.push(pitch))
      } else if (Object.keys(traj.articulations).length > 0) {
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
  
  reset() {
    this.durArrayFromTrajectories();
    this.assignStartTimes();
    this.assignPhraseIdx();
    this.assignTrajNums();
  }
}

class NoteViewPhrase {
  pitches: Pitch[];
  durTot?: number;
  raga?: Raga;
  startTime?: number;

  constructor({
    pitches = [],
    durTot = undefined,
    raga = undefined,
    startTime = undefined
  }: {
    pitches?: Pitch[],
    durTot?: number,
    raga?: Raga,
    startTime?: number
  } = {}) {
    this.pitches = pitches;
    this.durTot = durTot;
    this.raga = raga;
    this.startTime = startTime;
  }
}

class Piece {
  phrases: Phrase[];
  durTot?: number;
  durArray?: number[];
  raga: Raga;
  title: string;
  performers: string[];
  dateCreated: Date;
  dateModified: Date;
  location: string;
  transcriber: string;
  _id?: string;
  audioID?: string;
  audio_DB_ID?: string;
  userID?: string;
  name?: string;
  family_name?: string;
  given_name?: string;
  permissions?: string;
  sectionStarts?: number[];
  instrumentation: string[];
  possibleTrajs: { [key: string]: number[] };
  meters: Meter[];
  sectionCategorization: SecCatType[];


  constructor({
    phrases = [],
    durTot = undefined,
    durArray = undefined,
    raga = new Raga(),
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
    family_name = undefined,
    given_name = undefined,
    permissions = undefined,
    sectionStarts = undefined,
    instrumentation = ['Sitar'],
    meters = [],
    sectionCategorization = undefined,
  }: {
    phrases?: Phrase[],
    durTot?: number,
    durArray?: number[],
    raga?: Raga,
    title?: string,
    performers?: string[],
    dateCreated?: Date,
    dateModified?: Date,
    location?: string,
    transcriber?: string,
    _id?: string,
    audioID?: string,
    audio_DB_ID?: string,
    userID?: string,
    name?: string,
    family_name?: string,
    given_name?: string,
    permissions?: string,
    sectionStarts?: number[],
    instrumentation?: string[],
    meters?: Meter[],
    sectionCategorization?: SecCatType[],
  } = {}) {
    this.meters = meters;
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
        this.phrases.forEach(p => {
          if (p.durTot === undefined) {
            throw new Error('p.durTot is undefined')
          }
          p.durTot = p.durTot * durTot / this.durTot!
        });
        this.durTot = durTot;
      }
      if (durArray !== undefined && this.durArray !== durArray) {
        this.phrases.forEach((p, i) => {
          if (p.durTot === undefined) {
            throw new Error('p.durTot is undefined')
          }
          p.durTot = p.durTot * durArray[i] / this.durArray![i]
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
    this.family_name = family_name;
    this.given_name = given_name;
    if (sectionStarts === undefined) {
      this.sectionStarts = [0];
    } else {
      this.sectionStarts = sectionStarts.sort((a, b) => a - b);
    }
    this.instrumentation = instrumentation;
    // this is really confusing becuase id12 is silent. The current solution 
    // is to just skip that number; so 12 listed below is really id13
    this.possibleTrajs = {
      'Sitar': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 
      'Vocal (M)': [0, 1, 2, 3, 4, 5, 6, 12, 13],
      'Vocal (F)': [0, 1, 2, 3, 4, 5, 6, 12, 13],
      'Bansuri': [0, 1, 2, 3, 4, 5, 6, 12, 13],
      'Esraj': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      'Sarangi': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      'Rabab': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      'Santoor': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      'Sarod': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      'Shehnai': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      'Surbahar': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      'Veena (Saraswati)': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      'Veena (Vichitra)': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      'Veena, Rudra (Bin)': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      'Violin': [0, 1, 2, 3, 4, 5, 6, 12, 13],
      'Harmonium': [0, 12, 13],
    }
    if (sectionCategorization !== undefined) {
      this.sectionCategorization = sectionCategorization;
      this.sectionCategorization.forEach(c => {
        if (c['Improvisation'] === undefined) {
          c['Improvisation'] = { "Improvisation": false }
        }
        if (c['Other'] === undefined) {
          c['Other'] = { "Other": false }
        }
        if (c['Top Level'] === undefined) {
          const com = c['Composition Type'];
          let comSecTemp = c['Comp.-section/Tempo'];
          if (comSecTemp === undefined) {
            comSecTemp = c['Composition-section/Tempo']
          }
          const tala = c['Tala'];
          const improv = c['Improvisation'];
          const other = c['Other'];
          const someTrue = (obj: object) => {
            return Object.values(obj).some(v => v)
          };
          if (c['Pre-Chiz Alap']['Pre-Chiz Alap']) {
            c['Top Level'] = 'Pre-Chiz Alap'
          } else if (someTrue(c['Alap'])) {
            c['Top Level'] = 'Alap'
          } else if (someTrue(com) || someTrue(comSecTemp) || someTrue(tala)) {
            c['Top Level'] = 'Composition'
          } else if (improv['Improvisation']) {
            c['Top Level'] = 'Improvisation'
          } else if (other['Other']) {
            c['Top Level'] = 'Other'
          } else {
            c['Top Level'] = 'None'
          }
        }
        if (c['Comp.-section/Tempo'] === undefined) {
          c['Comp.-section/Tempo'] = c['Composition-section/Tempo'];
          delete c['Composition-section/Tempo']
        }
      })
    } else {
      this.sectionCategorization = this.sectionStarts.map(() => {
        return initSectionCategorization()
      })
    }
    if (this.sectionStarts.length > this.sectionCategorization.length) {
      const diff = this.sectionStarts.length - this.sectionCategorization.length;
      for (let i = 0; i < diff; i++) {
        this.sectionCategorization.push(initSectionCategorization())
      }
    }
  }

  putRagaInPhrase() {
    this.phrases.forEach(p => p.raga = this.raga)
  }

  addMeter(meter: Meter) {
    if (this.meters.length === 0) {
      this.meters.push(meter);
    } else {
      const start = meter.startTime;
      const end = start + meter.durTot;
      this.meters.forEach(m => {
        const c1 = m.startTime <= start && m.startTime + m.durTot >= start;
        const c2 = m.startTime < end && m.startTime + m.durTot > end;
        const c3 = m.startTime > start && m.startTime + m.durTot < end;
        if (c1 || c2 || c3) {
          throw new Error('meters overlap')
        }
      })
      this.meters.push(meter);
    }
  }

  removeMeter(meter: Meter) {
    const idx = this.meters.indexOf(meter);
    this.meters.splice(idx, 1);
  }

  get durStarts() {
    if (this.durArray === undefined) {
      throw new Error('durArray is undefined')
    }
    if (this.durTot === undefined) {
      throw new Error('durTot is undefined')
    }
    const starts = getStarts(this.durArray.map(d => d * this.durTot!));
    return starts
  }

  get trajIdxs() {
    return this.possibleTrajs[this.instrumentation[0]]
  }

  allGroups({ instrumentIdx = 0 }: { instrumentIdx?: number } = {}) {
    const allGroups: Group[] = [];
    this.phrases.forEach(p => {
      allGroups.push(...p.getGroups(instrumentIdx))
    });
    return allGroups

  }

  updateStartTimes() {
    this.phrases.forEach((p, i) => {
      p.startTime = this.durStarts[i];
      p.pieceIdx = i;
      p.assignPhraseIdx();
    })
  }

  durTotFromPhrases() {
    this.durTot = this.phrases.map(p => p.durTot as number).reduce((a, b) => {
      if (a === undefined || b === undefined) {
        throw new Error('a or b is undefined')
      }
      return a + b
    }, 0)
  }

  durArrayFromPhrases() {
    this.durTotFromPhrases();
    this.durArray = this.phrases.map(p => {
      if (p.durTot === undefined) {
        throw new Error('p.durTot is undefined')
      } else if (isNaN(p.durTot)) {
        const removes = p.trajectories.filter(t => isNaN(t.durTot))
        removes.forEach(r => {
          const idx = p.trajectories.indexOf(r);
          p.trajectories.splice(idx, 1)
        })
        p.durTot = p.trajectories.map(t => {
          return t.durTot
        }).reduce((a, b) => a + b, 0)
      }
      return p.durTot / this.durTot!
    });
    this.updateStartTimes();
  }

  realignPitches() {
    this.phrases.forEach(p => p.realignPitches())
  }

  get sections() {
    const sections: Section[] = [];
    this.sectionStarts!.sort((a, b) => a - b)
    this.sectionStarts!.forEach((s, i) => {
      let slice;
      if (i === this.sectionStarts!.length - 1) {
        slice = this.phrases.slice(s)
        // sections.push(this.phrases.slice(s))
      } else {
        slice = this.phrases.slice(s, this.sectionStarts![i + 1])
        // sections.push(this.phrases.slice(s, this.sectionStarts[i + 1]))
      }
      sections.push(new Section({ 
        phrases: slice, 
        categorization: this.sectionCategorization[i] 
      }))
    });
    return sections
  }

  allPitches({ repetition=true, pitchNumber=false } = {}) {
    let allPitches: Pitch[] = [];
    this.phrases.forEach(p => allPitches.push(...p.allPitches()));
    if (!repetition) {
      allPitches = allPitches.filter((pitch, i) => {
        if (typeof pitch === 'number') {
          throw new Error('pitch is a number')
        }
        const c1 = i === 0;
        const lastP = allPitches[i-1];
        if (typeof lastP === 'number') {
          throw new Error('lastP is a number')
        }
        const c2 = pitch.swara === lastP?.swara;
        const c3 = pitch.oct === lastP?.oct;
        const c4 = pitch.raised === lastP?.raised;
        return c1 || !(c2 && c3 && c4)
      })
    }
    if (pitchNumber) {
      const allPitchNumbers = allPitches.map((p) => {
        if (typeof p === 'number') {
          throw new Error('p is a number')
        }
        return p.numberedPitch
      })
      return allPitchNumbers
    } else {
      return allPitches
    }
  }

  get highestPitchNumber() {
    return Math.max(...this.allPitches({ pitchNumber: true }) as number[]);
  }

  get lowestPitchNumber() {
    return Math.min(...this.allPitches({ pitchNumber: true }) as number[])
  }

  allTrajectories(inst = 0) {
    const allTrajectories: Trajectory[] = [];
    this.phrases.forEach(p => allTrajectories.push(...p.trajectoryGrid[inst]));
    return allTrajectories
  }

  durationsOfFixedPitches({ 
    inst = 0, 
    outputType = 'pitchNumber' }: {
      inst?: number,
      outputType?: OutputType
    } = {}) {
    const trajs = this.allTrajectories(inst);
    return durationsOfFixedPitches(trajs, { 
      inst: inst, 
      outputType: outputType 
    })
  }

  proportionsOfFixedPitches({ 
    inst = 0, 
    outputType = 'pitchNumber' 
  }: {
    inst?: number,
    outputType?: OutputType
  } = {}) {
    const pitchDurs = this.durationsOfFixedPitches({ 
      inst: inst,
      outputType: outputType
    })!;
    let totalDur = 0;
    Object.keys(pitchDurs).forEach(key => {
      totalDur += pitchDurs[key];
    });
    const pitchProps: NumObj = {};
    for (let key in pitchDurs) {
      pitchProps[key] = pitchDurs[key] / totalDur;
    }
    return pitchProps
  }

  get phraseStarts() {
    return this.phrases.map(p => p.startTime)
  }

  setDurTot(durTot: number) {
    let lastPhrase: Phrase = this.phrases[this.phrases.length - 1];
    while (lastPhrase.durTot === 0) {
      this.phrases.pop();
      this.durTotFromPhrases();
      this.durArrayFromPhrases();
      lastPhrase = this.phrases[this.phrases.length - 1];
    }
    const trajs = lastPhrase.trajectories;
    const lastTraj: Trajectory = trajs[trajs.length - 1];
    if (lastTraj.id !== 12) {
      throw new Error('lastTraj is not silent')
    } else {
      const extraDur = durTot - this.durTot!;
      lastTraj.durTot += extraDur;
      lastPhrase.durTotFromTrajectories();
      lastPhrase.durArrayFromTrajectories();
      // this.durTot = durTot;
      this.durArrayFromPhrases();
      this.updateStartTimes();
    }
  }

  pulseFromId(id: string) {
    const allPulses = this.meters.map(m => m.allPulses).flat();
    const pulse = allPulses.find(p => p.uniqueId === id);
    return pulse
  }

  sIdxFromPIdx(pIdx: number) {
    // section index from phrase index
    const ss = this.sectionStarts!;
    const sIdx = ss.length - 1 - ss.slice().reverse().findIndex(s => pIdx >= s);
    return sIdx
  }

  pIdxFromGroup(g: Group) {
    const pIdx = this.phrases.findIndex(p => {
      let bool = false;
      p.groupsGrid.forEach(gg => {
        if (gg.includes(g)) {
          bool = true
        }
      })
      return bool
    });
    return pIdx
  }

  sIdxFromGroup(g: Group) {
    const pIdx = this.pIdxFromGroup(g);
    const sIdx = this.sIdxFromPIdx(pIdx);
    return sIdx
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
      family_name: this.family_name,
      given_name: this.given_name,
      sectionStarts: this.sectionStarts,
      instrumentation: this.instrumentation,
      meters: this.meters,
      sectionCategorization: this.sectionCategorization,
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

class Section {
  phrases: Phrase[];
  categorization: SecCatType;

  constructor({
    phrases = [],
    categorization = undefined
  }: {
    phrases?: Phrase[],
    categorization?: SecCatType
  } = {}) {
    this.phrases = phrases;
    if (categorization !== undefined) {
      this.categorization = categorization;
    } else {
      this.categorization = initSectionCategorization();
    }
  }

  allPitches(repetition=true) {
    let pitches: Pitch[] = [];
    this.phrases.forEach(p => pitches.push(...p.allPitches(true)));
    if (!repetition) {
      pitches = pitches.filter((pitch, i) => {
        const c1 = i === 0;
        const c2 = pitch.swara === pitches[i-1]?.swara;
        const c3 = pitch.oct === pitches[i-1]?.oct;
        const c4 = pitch.raised === pitches[i-1]?.raised;
        return c1 || !(c2 && c3 && c4)
      })
    }
    return pitches
  }

  get trajectories() {
    const trajectories: Trajectory[] = [];
    this.phrases.forEach(p => trajectories.push(...p.trajectories));
    return trajectories
  }
}

type BoolObj = { [key: string]: boolean };
type NumObj = { [key: string]: number };
type RuleSetType = {[key: string]: (boolean | BoolObj) };
type TuningType = { [key: string]: number | NumObj };


class Raga {
  name: string;
  fundamental: number;
  ruleSet: RuleSetType;
  tuning: TuningType;
  ratios: number[];

  constructor({
    name = 'Yaman',
    fundamental = 261.63,
    ruleSet = yamanRuleSet,
    ratios = undefined,
  }: {
    name?: string,
    fundamental?: number,
    ruleSet?: RuleSetType,
    ratios?: number[]
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
    if (ratios === undefined || ratios.length !== this.ruleSetNumPitches)  {
      this.ratios = this.setRatios(this.ruleSet)
    } else {
      this.ratios = ratios
    }
    // this.ratios = this.setRatios(this.ruleSet)
    
  }

  get sargamLetters() {
    const initSargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni'];
    const sl: string[] = [];
    initSargam.forEach(s => {
      if (isObject(this.ruleSet[s])) {
        const ruleSet = this.ruleSet[s] as BoolObj;
        if (ruleSet.lowered) sl.push(s.slice(0, 1));
        if (ruleSet.raised) sl.push(s.slice(0, 1).toUpperCase());
      } else if (this.ruleSet[s]) {
        sl.push(s.slice(0, 1).toUpperCase())
      }
    });
    return sl
  }

  get ruleSetNumPitches() {
    let numPitches = 0;
    const keys = Object.keys(this.ruleSet);
    keys.forEach(key => {
      if (typeof(this.ruleSet[key]) === 'boolean') {
        if (this.ruleSet[key]) {
          numPitches += 1;
        }
      } else {
        const ruleSet = this.ruleSet[key] as BoolObj;
        if (ruleSet.lowered) numPitches += 1;
        if (ruleSet.raised) numPitches += 1;
      }
    })
    return numPitches
  }

  pitchNumberToSargamLetter(pitchNumber: number) {
    const oct = Math.floor(pitchNumber / 12);
    let out;
    let chroma = pitchNumber % 12;
    while (chroma < 0) chroma += 12;
    let scaleDegree, raised;
    [scaleDegree, raised] = chromaToScaleDegree(chroma);
    const sargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni'][scaleDegree];
    if (typeof this.ruleSet[sargam] === 'boolean') {
      if (this.ruleSet[sargam]) {
        out = sargam.slice(0, 1).toUpperCase()
      }
    } else {
      const ruleSet = this.ruleSet[sargam] as BoolObj;
      if (ruleSet[raised ? 'raised' : 'lowered']) {
        out = raised ? sargam.slice(0, 1).toUpperCase() : sargam.slice(0, 1)
      }
    }
    return out
  }

  getPitchNumbers(low: number, high: number) { // returns all pitch numbers, inclusive
    let pitchNumbers = [];
    for (let i = low; i <= high; i++) {
      const oct = Math.floor(i / 12);
      let chroma = i % 12;
      while (chroma < 0) chroma += 12;
      let scaleDegree, raised;
      [scaleDegree, raised] = chromaToScaleDegree(chroma);
      const sargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni'][scaleDegree];
      if (typeof this.ruleSet[sargam] === 'boolean') {
        if (this.ruleSet[sargam]) {
          pitchNumbers.push(i);
        }
      } else {
        const ruleSet = this.ruleSet[sargam] as BoolObj;
        if (ruleSet[raised ? 'raised' : 'lowered']) {
          pitchNumbers.push(i);
        }
      }
    }
    return pitchNumbers
  }

  pitchNumberToScaleNumber(pitchNumber: number) {
    // as opposed to scale degree. This is just 0 - x, depending on how many 
    // pitches are in the raga
    const oct = Math.floor(pitchNumber / 12);
    let chroma = pitchNumber % 12;
    while (chroma < 0) chroma += 12;
    const mainOct = this.getPitchNumbers(0, 11);
    const idx = mainOct.indexOf(chroma);
    if (idx === -1) {
      throw new Error('pitchNumberToScaleNumber: pitchNumber not in raga')
    }
    return idx + oct * mainOct.length
  }

  scaleNumberToPitchNumber(scaleNumber: number) {
    const mainOct = this.getPitchNumbers(0, 11);
    const oct = Math.floor(scaleNumber / mainOct.length);
    while (scaleNumber < 0) scaleNumber += mainOct.length;
    const chroma = mainOct[scaleNumber % mainOct.length];
    return chroma + oct * 12
  }

  scaleNumberToSargamLetter(scaleNumber: number) {
    const pn = this.scaleNumberToPitchNumber(scaleNumber);
    return this.pitchNumberToSargamLetter(pn)
  }

  setRatios(ruleSet: RuleSetType) {
    const sargam = Object.keys(ruleSet);
    const ratios: number[] = [];
    sargam.forEach(s => {
      if (typeof(this.tuning[s]) === 'number' && ruleSet[s]) {
        ratios.push(this.tuning[s] as number);
      } else {
        const ruleSet = this.ruleSet[s] as BoolObj;
        const tuning = this.tuning[s] as NumObj;
        if (ruleSet.lowered) ratios.push(tuning.lowered);
        if (ruleSet.raised) ratios.push(tuning.raised);
      }
    })
    return ratios;
  }

  getPitches({ low=100, high=800 } = {}) {
    const sargam = Object.keys(this.ruleSet);
    const pitches: Pitch[] = [];
    sargam.forEach(s => {
      if (typeof(this.ruleSet[s]) === 'boolean' && this.ruleSet[s]) {
        const freq = this.tuning[s] as number * this.fundamental;
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
        if ((this.ruleSet[s] as BoolObj).lowered) {
          const freq = (this.tuning[s] as NumObj).lowered * this.fundamental;
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
        if ((this.ruleSet[s] as BoolObj).raised) {
          const freq = (this.tuning[s] as NumObj).raised * this.fundamental;
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
    const ratios: (number | number[])[] = [];
    let ct = 0;
    sargam.forEach((s, sIdx) => {
      if (typeof(this.ruleSet[s]) === 'boolean') {
        if (this.ruleSet[s]) {
          ratios.push(this.ratios[ct]);
          ct++;
        } else {
          ratios.push(this.tuning[s] as number)
        }
      } else {
        ratios.push([]);
        if ((this.ruleSet[s] as BoolObj).lowered) {
          (ratios[sIdx] as number[]).push(this.ratios[ct]);
          ct++;
        } else {
          (ratios[sIdx] as number[]).push((this.tuning[s] as NumObj).lowered)
        }
        if ((this.ruleSet[s] as BoolObj).raised) {
          (ratios[sIdx] as number[]).push(this.ratios[ct]);
          ct++;
        } else {
          (ratios[sIdx] as number[]).push((this.tuning[s] as NumObj).raised)
        }
      } 
    });
    return ratios
  }

  get chikariPitches() {
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
    const freqs: number[] = [];
    baseFreqs.forEach(f => {
      const lowExp = Math.ceil(Math.log2(low / f));
      const highExp = Math.floor(Math.log2(high / f));
      let range = [...Array(highExp - lowExp + 1).keys()].map(i => i + lowExp);
      const exps = range.map(r => 2.0 ** r);
      const additionalFreqs = exps.map(exp => f * exp);
      freqs.push(...additionalFreqs)
    });
    freqs.sort((a, b) => (a - b));
    return freqs;
  }

  get sargamNames() {
    const names: string[] = [];
    const sargam = Object.keys(this.ruleSet);
    sargam.forEach(s => {
      if (typeof(this.ruleSet[s]) === 'object') {
        const obj = this.ruleSet[s] as BoolObj;
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
  Section,
  getStarts,
  getEnds,
  Group,
  durationsOfFixedPitches,
  pitchNumberToChroma,
  linSpace,
  initSectionCategorization
}

export type {
  RuleSetType,
  VibObjType,
  PhraseCatType,
  SecCatType
}