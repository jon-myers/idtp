import { durationsOfFixedPitches } from './classes.ts';
import { 
  Pitch, 
  Trajectory, 
  Phrase,
  Piece,
  Articulation,
  Chikari, 
  Raga,
  Group,
  getStarts,
  pitchNumberToChroma
} from './classes.ts';
import { getPiece, getRaagRule } from './serverCalls.ts';
const testQueryId = '63445d13dc8b9023a09747a6';
// const Pitch: typeof Pitch_ = Pitch_;
// type PieceType = {
//   phrases: PhraseType[],
//   durTot: number | undefined,
//   durArray: number[] | undefined,
//   raga: RagaType,
//   title: string,
//   performers: string[],
//   dateCreated: Date,
//   dateModifed: Date,
//   location: string,
//   transcriber: string,
//   _id: string | undefined,
//   audioID: string | undefined,
//   audio_DB_ID: string | undefined,
//   userID: string | undefined,
//   name: string | undefined,
//   family_name: string | undefined,
//   given_name: string | undefined,
//   permissions: string | undefined,
//   sectionStarts: number[] | undefined,
//   instrumentation: string[] | undefined,
//   durArrayFromPhrases(): void,
// }

// type SplitSargamType = {
//   lowered: boolean,
//   raised: boolean
// }

// type RagaType = {
//   name: string,
//   fundamental: number,
//   ruleSet: {
//     sa: boolean,
//     re: SplitSargamType,
//     ga: SplitSargamType,
//     ma: SplitSargamType,
//     pa: boolean,
//     dha: SplitSargamType,
//     ni: SplitSargamType
//   },
//   ratios: number[] | undefined,
//   stratifiedRatios: (number | number[])[] | undefined
// }

// type PhraseType = {
//   trajectories: TrajectoryType[],
//   durTot: number | undefined,
//   durArray: number[] | undefined,
//   chikaris: object,
//   raga: RagaType | undefined,
//   startTime: number | undefined,
//   trajectoryGrid: (TrajectoryType[])[] | undefined,
//   instrumentation: string[] | undefined,
//   groupsGrid: (object[])[] | undefined,
//   consolidateSilentTrajs(): void,
//   // swara: 
// }

// type TrajectoryType = {
//   id: number,
//   pitches: PitchType[],
//   durTot: number,
//   durArray: number[] | undefined,
//   slope: number | undefined,
//   articulations: object | undefined,
//   num: number | undefined,
//   name: string | undefined,
//   fundID12: number | undefined,
//   vibObj: object | undefined,
//   instrumentation: string,
//   vowel: string | undefined,
//   startConsonant: string | undefined,
//   endConsonant: string | undefined,
//   groupId: number | undefined,
// }

// type PitchType = {
//   new (pitch: PitchType): PitchType,
//   swara: string,
//   oct: number,
//   raised: boolean,
//   fundamental: number,
//   ratios: (number | number[])[] | undefined,
// }

// type GroupType = {
//   trajectories: TrajectoryType[],
//   id: string | undefined,
// }

const instantiatePiece = async (queryId = testQueryId)=> {
  let piece = await getPiece(queryId);
  const rsRes = await getRaagRule(piece.raga.name);
  piece.raga.ruleSet = rsRes.rules;
  piece.raga = new Raga(piece.raga);
  piece.phrases.forEach((phrase)=> {
    let pt = phrase.trajectoryGrid ? 
             phrase.trajectoryGrid[0] :
             phrase.trajectories ;
    pt.forEach((traj) => {
      traj.pitches = traj.pitches.map((pitch) => {
        pitch.fundamental = piece.raga.fundamental;
        pitch.ratios = piece.raga.stratifiedRatios;
        return new Pitch(pitch)
      });
      const artKeys = Object.keys(traj.articulations);
      const artEntries = artKeys.map(key => traj.articulations[key]);
      const artObj: { [key: string]: Articulation } = {};
      artKeys.forEach((key, i) => {
        artObj[key] = new Articulation(artEntries[i]);
      });
      traj.articulations = artObj;
      if (traj.id === 12 && traj.fundID12 !== piece.raga.fundamental) {
        traj.fundID12 = piece.raga.fundamental;
      }
      if (traj.id === 12 && Object.keys(traj.articulations).length > 0) {
        traj.articulations = {};
      }
      if (piece.instrumentation) {
        traj.instrumentation = piece.instrumentation[0];
      }
    });
    if (phrase.trajectoryGrid) {
      phrase.trajectoryGrid[0] = pt.map(traj => new Trajectory(traj))
    } else {
      phrase.trajectories = pt.map(traj => new Trajectory(traj));
      // I think thes shoudn't really exist anymore, but I guess I should go 
      // through all pieces and make sure they're all the new format.
    }
    if (phrase.groupsGrid !== undefined) {
      phrase.groupsGrid.forEach(groups => {
        groups.forEach((group)=> {
          group.trajectories.forEach((traj, idx) => {
            if (traj.num === undefined) {
              throw new Error('traj.num is undefined');
            }
            const tIdx = traj.num;
            const realTraj = phrase.trajectoryGrid[0][tIdx];
            group.trajectories[idx] = realTraj;
          })
        })
      })
    }
    const chikariKeys = Object.keys(phrase.chikaris);
    const chikariEntries = chikariKeys.map(key => phrase.chikaris[key]);
    const chikariObj: { [key: string]: Chikari } = {};
    chikariKeys.forEach((key, i) => {
      chikariObj[key] = new Chikari(chikariEntries[i]);
    });
    phrase.chikaris = chikariObj;
    if (piece.instrumentation) {
      phrase.instrumentation = piece.instrumentation;
    }
  });
  piece.phrases = piece.phrases.map(phrase => new Phrase(phrase));
  piece = new Piece(piece);
  piece.phrases.forEach(phrase => {
    phrase.consolidateSilentTrajs()
  });
  piece.durArrayFromPhrases();
  piece.sectionStarts = [...new Set(piece.sectionStarts)]
  return piece
}

class PitchCounter {
  constructor(pitches) {
    this.pitches = pitches;
  }

  sargamCount(proportion=false) {
    const pitchDict = {};
    this.pitches.forEach(pitch => {
      const sargam = pitch.sargam[pitch.swara];
      if (pitchDict[sargam]) {
        pitchDict[sargam] += 1;
      } else {
        pitchDict[sargam] = 1;
      }
    })
    if (proportion) {
      const total = this.pitches.length;
      const keys = Object.keys(pitchDict);
      keys.forEach(key => {
        pitchDict[key] = pitchDict[key]/total;
      })
    }
    return pitchDict
  }

  scaleDegreeCount(proportion=false) {
    const pitchDict = {};
    this.pitches.forEach(pitch => {
      if (pitchDict[pitch.swara]) {
        pitchDict[pitch.swara] += 1;
      } else {
        pitchDict[pitch.swara] = 1;
      }
    })
    if (proportion) {
      const total = this.pitches.length;
      const keys = Object.keys(pitchDict);
      keys.forEach(key => {
        pitchDict[key] = pitchDict[key]/total;
      })
    }
    return pitchDict
  }

  pitchNumberCount(proportion=false) {
    const pitchDict = {};
    this.pitches.forEach(pitch => {
      const pitchNum = pitch.numberedPitch;
      if (pitchDict[pitchNum]) {
        pitchDict[pitchNum] += 1;
      } else {
        pitchDict[pitchNum] = 1;
      }
    })
    if (proportion) {
      const total = this.pitches.length;
      const keys = Object.keys(pitchDict);
      keys.forEach(key => {
        pitchDict[key] = pitchDict[key]/total;
      })
    }
    return pitchDict
  }

 octavedScaleDegreeCount(proportion=false) {
    const pitchDict = {};
    this.pitches.forEach(pitch => {
      if (!pitchDict[pitch.oct]) {
        pitchDict[pitch.oct] = {};
      }
      if (pitchDict[pitch.oct][pitch.swara]) {
        pitchDict[pitch.oct][pitch.swara] += 1;
      } else {
        pitchDict[pitch.oct][pitch.swara] = 1;
      }
    })
    if (proportion) {
      const total = this.pitches.length;
      const keys = Object.keys(pitchDict);
      keys.forEach(key => {
        const subKeys = Object.keys(pitchDict[key]);
        subKeys.forEach(subKey => {
          pitchDict[key][subKey] = pitchDict[key][subKey]/total;
        })
      })
    }
    return pitchDict
  }

  pitchChromaCount(proportion=false) {
    const pitchDict = {};
    this.pitches.forEach(pitch => {
      const chroma = pitch.chroma;
      if (pitchDict[chroma]) {
        pitchDict[chroma] += 1;
      } else {
        pitchDict[chroma] = 1;
      }
    })
    if (proportion) {
      const total = this.pitches.length;
      const keys = Object.keys(pitchDict);
      keys.forEach(key => {
        pitchDict[key] = pitchDict[key]/total;
      })
    }
    return pitchDict
  }

  octavedPitchChromaCount(proportion=false) {
    const pitchDict = {};
    this.pitches.forEach(pitch => {
      if (!pitchDict[pitch.oct]) {
        pitchDict[pitch.oct] = {};
      }
      if (pitchDict[pitch.oct][pitch.chroma]) {
        pitchDict[pitch.oct][pitch.chroma] += 1;
      } else {
        pitchDict[pitch.oct][pitch.chroma] = 1;
      }
    })
    if (proportion) {
      const total = this.pitches.length;
      const keys = Object.keys(pitchDict);
      keys.forEach(key => {
        const subKeys = Object.keys(pitchDict[key]);
        subKeys.forEach(subKey => {
          pitchDict[key][subKey] = pitchDict[key][subKey]/total;
        })
      })
    }
    return pitchDict
  }
}

const phraseRange = (piece: Piece) => {
  return piece.phrases.map(phrase => phrase.getRange())
}

const PitchTimes = (trajs: Trajectory[], { outputType = 'pitchNumber' } = {}) => { // outputs pitches as pitchNumbers
  // returns a list of all pitches in trajs, and the cumulative times at which 
  // they begin, calculated based on summing durtot as we go.
  // silences are included: instead of pitch, just the string 'silence'.
  // outputType can be 'pitchNumber', 'chroma', 'scaleDegree', or 'sargamLetter'
  let pitchTimes: { 
    time: number, 
    pitch: string | number, 
    articulation: boolean 
  }[] = [];
  let startTime = 0;
  trajs.forEach((traj, tIdx) => {
    const art = traj.articulations[0] || traj.articulations['0.00'];
    if (traj.id === 12) {
      const obj = { time: startTime, pitch: 'silence', articulation: false };
      pitchTimes.push(obj);
      startTime += traj.durTot;
    } else {
      traj.pitches.forEach((pitch, pIdx) => {       
        const obj = { 
          time: startTime, 
          pitch: pitch.numberedPitch,
          articulation: pIdx === 0 && (art !== undefined)
        };
        pitchTimes.push(obj);
        if (pIdx < traj.pitches.length - 1) {
          if (traj.durArray === undefined) {
            throw new Error('traj.durArray is undefined')
          }
          startTime += traj.durArray[pIdx] * traj.durTot;
        }
      })
    }
  })
  // filter out duplicates time + pitch
  pitchTimes = pitchTimes.filter((obj, idx, arr) => {
    if (idx === arr.length - 1) {
      return true
    } else {
      const c1 = obj.pitch === pitchTimes[idx+1].pitch;
      const c2 = obj.time === pitchTimes[idx+1].time;
      return !(c1 && c2)
    }
  })
  // now if there are adjacent with the same time but different pitch, 
  // filter out the first one
  pitchTimes = pitchTimes.filter((obj, idx) => {
    if (idx === 0 || idx === pitchTimes.length - 1) {
      return true
    } else {
      return obj.time !== pitchTimes[idx+1].time;
    }
  })
  if (outputType === 'chroma') {
    pitchTimes.forEach(pt => {
      if (pt.pitch !== 'silence') {
        if (typeof pt.pitch !== 'number') {
          throw new Error('pitch is not a number')
        }
        pt.pitch = pitchNumberToChroma(pt.pitch)
      }
    })
  }
  return pitchTimes
}

const durationsOfPitchOnsets = (trajs: Trajectory[], { 
  outputType = 'pitchNumber', // pitchNumber, chroma, scaleDegree, sargamLetter
  countType = 'cumulative',
  excludeSilence = true,
  maxSilence = 5,
 } = {}) => {
  let pitchTimes = PitchTimes(trajs);
  if (outputType === 'chroma') {
    pitchTimes.forEach(pt => {
      if (pt.pitch !== 'silence') {
        if (typeof pt.pitch !== 'number') {
          throw new Error('pitch is not a number')
        }
        pt.pitch = pitchNumberToChroma(pt.pitch)
      }
    })
  }
  // remove latter of adjacent items where pitch is equal
  pitchTimes = pitchTimes.filter((obj, idx) => {
    if (idx === 0) {
      return true
    } else {
      return obj.pitch !== pitchTimes[idx-1].pitch;
    }
  })
  const durations: { dur: number, pitch: string | number }[] = [];
  const endTime = trajs.reduce((sum, traj) => sum + traj.durTot, 0);
  const ends = pitchTimes.map(obj => obj.time).slice(1).concat([endTime]);
  pitchTimes.forEach((obj, idx) => {
    const newObj = { dur: ends[idx] - obj.time, pitch: obj.pitch };
    durations.push(newObj);
  })
  // if dur of silence is less than maxSilence, add it to the previous pitch
  let condensedDurations: { dur: number, pitch: string | number }[] = [];
  durations.forEach((obj, idx) => {
    if (obj.pitch === 'silence') {
      if (idx === 0) {
        condensedDurations.push(obj)
      } else if (obj.dur < maxSilence) {
        condensedDurations[condensedDurations.length - 1].dur += obj.dur;
      } else {
        condensedDurations[condensedDurations.length - 1].dur += maxSilence;
        obj.dur -= maxSilence;
        condensedDurations.push(obj);
      }
    } else {
      condensedDurations.push(obj);
    }
  });

  // pitchDurations is an object whose keys are the pitches, and whose values 
  // are the summed durations
  const pitchDurations: { [key: string | number]: number } = {};
  condensedDurations.forEach(obj => {
    if (pitchDurations[obj.pitch]) {
      pitchDurations[obj.pitch] += obj.dur;
    } else {
      pitchDurations[obj.pitch] = obj.dur;
    }
  })
  if (excludeSilence) {
    delete pitchDurations['silence'];
    condensedDurations = condensedDurations
      .filter(obj => obj.pitch !== 'silence');
  }
  if (countType === 'proportional') {
    const total = condensedDurations.reduce((sum, obj) => sum + obj.dur, 0);
    const keys = Object.keys(pitchDurations);
    keys.forEach(key => {
      pitchDurations[key] = pitchDurations[key]/total;
    })
    return pitchDurations
  }
}

const segmentByDuration = (piece: Piece, { 
  // options for type are 'left', 'right', and 'rounded' indicating which 
  // direction border trajs get pushed.
  duration = 10,
  type = 'rounded',
  inst = 0,
  removeEmpty = true 
}: {
  duration?: number,
  type?: 'left' | 'right' | 'rounded',
  inst?: number,
  removeEmpty?: boolean
} = {}) => {
  if (piece.durTot === undefined) {
    throw new Error('piece.durTot is undefined')
  } 
  const numSegments = Math.ceil(piece.durTot / duration);
  let segments: Trajectory[][] = [...Array(numSegments)].map(() => []);
  const trajs = piece.allTrajectories(inst);
  const trajDurs = trajs.map(traj => traj.durTot);
  const starts = getStarts(trajDurs);
  trajs.forEach((traj, i) => {
    const start = starts[i];
    const end = start + traj.durTot;
    let segmentIdx;
    if (Math.floor(start / duration) === Math.floor(end / duration) ) {
      segmentIdx = Math.floor(start / duration);
    } else if (type === 'left') {
      segmentIdx = Math.floor(start / duration);
    } else if (type === 'right') {
      segmentIdx = Math.floor(end / duration);
    } else { // (type === 'rounded')
      const center = (start + end) / 2;
      segmentIdx = Math.floor(center / duration);
    }
    if (!(i === trajs.length - 1 && traj.id === 12)) {
      segments[segmentIdx].push(traj);
    }
  })
  if (removeEmpty) {
    segments = segments.filter((segment, sIdx) => {
      const out = segment.length > 0;
      return out
    });
  }
  return segments
}

const patternCounter = (trajs: Trajectory[], { 
  size = 2, 
  maxLagTime = 3,
  sort = true,
  outputType = 'pitchNumber',
  targetPitch = undefined,
  minSize = 1,
}: {
  size?: number,
  maxLagTime?: number,
  sort?: boolean,
  outputType?: string,
  targetPitch?: number | string,
  minSize?: number,
} = {}) => {
  const pitchTimes = PitchTimes(trajs, { outputType: outputType });
  // For all adjacent pitchs duplicates in pitchTimes list, remove all 
  // second instances, unless articulation on second adjacent pitch is === true
  pitchTimes.forEach((obj, idx) => {
    if (idx === 0) {
      return true
    } else {
      if (obj.pitch === pitchTimes[idx-1].pitch) {
        if (obj.articulation === true) {
          return true
        } else {
          pitchTimes.splice(idx, 1);
        }
      }
    }
  })
  const endTime = trajs.reduce((sum, traj) => sum + traj.durTot, 0);
  const ends = pitchTimes.map(obj => obj.time).slice(1).concat([endTime]);
  const durations = pitchTimes.map((obj, idx) => {
    return { 
      dur: ends[idx] - obj.time, 
      pitch: obj.pitch, 
      articulation: obj.articulation 
    }
  })
  


  // if dur of silence is less than maxLagTime, add it to the previous pitch
  let condensedDurations: { dur: number, pitch: string | number }[] = [];
  durations.forEach((obj, idx) => {
    if (obj.pitch === 'silence') {
      if (idx === 0) {
        condensedDurations.push(obj)
      } else if (obj.dur < maxLagTime) {
        condensedDurations[condensedDurations.length - 1].dur += obj.dur;
      } else {
        condensedDurations[condensedDurations.length - 1].dur += maxLagTime;
        obj.dur -= maxLagTime;
        condensedDurations.push(obj);
      }
    } else {
      condensedDurations.push(obj );
    }
  });
  const patterns: { [key: number | string]: number | {} } = {};
  let subPattern: (string | number)[] = [];
  condensedDurations.forEach(obj => {
    if (obj.pitch === 'silence') {
      subPattern = [];
    } else if (subPattern.length < size) {
      subPattern.push(obj.pitch);
    } else {
      subPattern.shift();
      subPattern.push(obj.pitch);
      let sel = patterns;
      subPattern.forEach((pitch, pIdx, arr) => {
        if (sel[pitch] === undefined) {
          sel[pitch] = pIdx === arr.length - 1 ? 0 : {};
        }
        if (pIdx === arr.length - 1) {
          sel[pitch] += 1
        }
        sel = sel[pitch];
      })
    }
  })
  // now, create a list of objects from patterns, where each object has a 
  // 'pattern' key, an array of the nested keys, and a 'count' key, the nested value
  let out = [];
  const recurse = (obj, pattern = []) => {
    const keys = Object.keys(obj);
    keys.forEach(key => {
      if (typeof obj[key] === 'number') {
        out.push({ pattern: pattern.concat([Number(key)]), count: obj[key] });
      } else {
        recurse(obj[key], pattern.concat([Number(key)]));
      }
    })
  }
  recurse(patterns);
  if (sort) {
    out.sort((a, b) => b.count - a.count);
  }
  if (targetPitch !== undefined) {
    // at end of pattern
    out = out.filter(o => o.pattern[o.pattern.length - 1] === targetPitch);
  }
  out = out.filter(o => o.count >= minSize)
  return out
  // return patterns
}

const argSort = (arr: number[]) => {
  const indices = [...arr.keys()].sort((a, b) => arr[a] - arr[b]);
  return indices
}
const chromaSeqToCondensedPitchNums = (chromaSeq: number[]) => {
  // given an array of chroma pitches, (potentially) shift some of them up or
  // down by an octave such that the max difference between any two elements is
  // minimized

  // then sort
  const sortIdxs = argSort(chromaSeq)
  const dblArgSort = argSort(sortIdxs);
  const sorted = sortIdxs.map(idx => chromaSeq[idx]);

  // find dif between all adjacent elements; as well as dif between last element
  // shifted down an octave and first element
  const difs = sorted.map((pitch, idx) => {
    if (idx === sorted.length - 1) {
      return sorted[0] - (pitch - 12);
    } else {
      return sorted[idx + 1] - pitch;
    }
  })

  // everything above the max diff idx gets shifted down an octave
  const maxDifIdx = difs.indexOf(Math.max(...difs));
  const out = sorted.map((pitch, idx) => {
    if (idx > maxDifIdx) {
      return pitch - 12;
    } else {
      return pitch;
    }
  })
  const unsorted = dblArgSort.map(idx => out[idx]);
  return unsorted
}

const analyze = async () => {
  const seq = [0, 2, 11, 7, 0, 9, 11];
  const out = chromaSeqToCondensedPitchNums(seq);
  console.log(out)
}


// analyze();

export { 
  instantiatePiece, 
  segmentByDuration, 
  durationsOfPitchOnsets,
  patternCounter,
  chromaSeqToCondensedPitchNums
}