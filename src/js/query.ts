import { instantiatePiece } from './analysis.ts';
import { Piece, Pitch, Trajectory, Group } from './classes.ts';


type CategoryType = (
  'trajectoryID' |
  'pitch' |
  'vowel' |
  'startingConsonant' |
  'endingConsonant' |
  'anyConsonant' |
  'pitchSequenceStrict' |
  'pitchSequenceLoose'
)

type DesignatorType = 'includes' | 'excludes' | 'startsWith' | 'endsWith';

type SegmentationType = (
  'phrase' |
  'group' |
  'sequenceOfTrajectories' |
  'connectedSequenceOfTrajectories'
)

type QueryType = {
  category: CategoryType,
  designator: DesignatorType,
  pitch?: Pitch,
  trajectoryID?: number,
  vowel?: string,
  consonant?: string,
  pitchSequence?: Pitch[],
}

type MultipleReturnType = [
  Trajectory[][], 
  (number | string | { phraseIdx: number, trajIdx: number })[],
  QueryAnswerType[],
];


type QueryAnswerType = {
  trajectories: Trajectory[],
  identifier: (number | string | { phraseIdx: number, trajIdx: number }),
  title: string,
  startTime: number,
  endTime: number,
  duration: number,
  segmentation: SegmentationType,
}

const findSequenceIndexes = (sequence: number[], longerSequence: number[]) => {
  const indexes: number[] = [];
  const startIndex = longerSequence.indexOf(sequence[0]);
  if (startIndex !== -1) {
    let match = true;
    for (let i = 1; i < sequence.length; i++) {
      if (longerSequence[startIndex + i] !== sequence[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      indexes.push(startIndex);
    }
    for (let i = startIndex + 1; i < longerSequence.length; i++) {
      if (longerSequence[i] === sequence[0]) {
        let match = true;
        for (let j = 1; j < sequence.length; j++) {
          if (longerSequence[i + j] !== sequence[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          indexes.push(i);
        }
      }
    }
  }
  return indexes;
}

const testLooseSequenceIndexes = (sequence: number[], longerSequence: number[]) => {
  let ct = 0;
  let out = false;
  let firstIdx: number | undefined = undefined;
  let lastIdx: number | undefined = undefined;
  for (let i = 0; i < longerSequence.length; i++) {
    const el = longerSequence[i];
    if (el === sequence[ct]) {
      if (ct === 0) {
        firstIdx = i;
      }
      ct++;
    }
    if (ct > sequence.length - 1) {
      out = true;
      lastIdx = i;
      break;
    }
  }
  return { truth: out, firstIdx: firstIdx, lastIdx: lastIdx };
};




class Query {
  trajectories: Trajectory[][] = [];
  phraseIdxs: number[] = [];
  instrumentIdx: number;
  identifier: (number | string | { phraseIdx: number, trajIdx: number })[] = [];
  stringifiedIdentifier: string[] = [];
  sequenceLength?: number;
  repetition: boolean;
  piece: Piece;
  consonant?: string;
  vowel?: string;
  trajectoryID?: number;
  pitch?: Pitch;
  designator: DesignatorType; 
  category: CategoryType;
  segmentation: SegmentationType;
  maxDur: number = 60;
  minDur: number = 0;
  startTimes: number[];
  pitchSequence?: Pitch[];
  // queryAnswers: QueryAnswerType[];


  private constructor(piece: Piece, {
    segmentation = 'phrase',
    designator = 'includes',
    category = 'trajectoryID',
    pitch = undefined,
    sequenceLength = undefined,
    trajectoryID = undefined,
    vowel = undefined,
    consonant = undefined,
    maxDur = 60,
    minDur = 0,
    pitchSequence = undefined,
  }: {
    segmentation?: SegmentationType,
    designator?: DesignatorType,
    category?: CategoryType,
    pitch?: Pitch,
    sequenceLength?: number,
    trajectoryID?: number,
    vowel?: string,
    consonant?: string,
    maxDur?: number,
    minDur?: number,
    pitchSequence?: Pitch[],
  } = {}) {
    this.category = category;
    this.designator = designator;
    this.trajectoryID = trajectoryID;
    this.consonant = consonant;
    this.pitch = pitch;
    this.vowel = vowel;
    this.piece = piece;
    this.identifier = [];
    this.trajectories = [];
    this.instrumentIdx = 0;
    this.repetition = false;
    this.sequenceLength = sequenceLength;
    this.segmentation = segmentation;
    this.maxDur = maxDur;
    this.minDur = minDur;
    this.pitchSequence = pitchSequence;
    if (segmentation === 'sequenceOfTrajectories') {
      if (sequenceLength === undefined) {
        throw new Error('sequenceLength is required when type is ' + 
          'sequenceOfTrajectories');
      }
    }
    const c1 = category === 'startingConsonant';
    const c2 = category === 'endingConsonant';
    const c3 = category === 'anyConsonant';
    const consonantsCondition = c1 || c2 || c3;
    if (category === 'pitch') {
      if (pitch === undefined) {
        throw new Error('Pitch is required when category is pitch');
      }
    } else if (category === 'trajectoryID') {
      if (trajectoryID === undefined) {
        throw new Error('trajectoryID is required when category is trajectoryID');
      }
    } else if (category === 'vowel') {
      const inst = piece.instrumentation[this.instrumentIdx];
      if (!(inst === 'Vocal (F)' || inst === 'Vocal (M)')) {
        throw new Error('category vowel is only for vocal instruments');
      }
      if (vowel === undefined) {
        throw new Error('vowel is required when category is vowel');
      }
    } else if (consonantsCondition) {
      const inst = piece.instrumentation[this.instrumentIdx];
      if (!(inst === 'Vocal (F)' || inst === 'Vocal (M)')) {
        throw new Error('category consonant is only for vocal instruments');
      }
      if (consonant === undefined) {
        throw new Error('consonant is required when category is consonant');
      }
    } else if (category === 'pitchSequenceStrict') {
      if (this.pitchSequence === undefined) {
        throw new Error('pitchSequence is required when category is pitchSequence');
      }
    }
    this.allTypeFilters();
    this.filterByDuration();
    this.stringifiedIdentifier = this.identifier.map(id => JSON.stringify(id));
    this.startTimes = this.trajectories.map(traj => {
      const phrase = this.piece.phrases[traj[0].phraseIdx!];
      return traj[0].startTime! + phrase.startTime!;
    });
  }

  private phraseFilter() {
    const phrases = this.piece.phrases;
    const filteredPhrases = phrases.filter(phrase => {
      const trajs = phrase.trajectories;
      if (this.category === 'pitch') {
        const trialArr = phrase.allPitches(this.repetition)
          .map(pitch => pitch.numberedPitch);
        return this.pitchDifferentiate(this.pitch!, this.designator, trialArr);
      } else if (this.category === 'trajectoryID') {
        const trialArr = phrase.trajectories;
        return this.trajIDDifferentiate(this.trajectoryID!, this.designator, trialArr);
      } else if (this.category === 'vowel') {
        const trialArr = phrase.trajectories.map(traj => traj.vowel);
        return this.vowelDifferentiate(this.vowel!, this.designator, trialArr);
      } else if (this.category === 'startingConsonant') {
        const trialArr = phrase.trajectories.map(traj => traj.startConsonant);
        return this.consonantDifferentiate(this.consonant!, this.designator, trialArr);
      } else if (this.category === 'endingConsonant') {
        const trialArr = phrase.trajectories.map(traj => traj.endConsonant);
        return this.consonantDifferentiate(this.consonant!, this.designator, trialArr);
      } else if (this.category === 'anyConsonant') {
        const trialArr: (string | undefined)[] = [];
        phrase.trajectories.forEach(traj => {
          trialArr.push(traj.startConsonant);
          trialArr.push(traj.endConsonant);
        })
        return this.consonantDifferentiate(this.consonant!, this.designator, trialArr);
      } else if (this.category === 'pitchSequenceStrict') {
        const trialArr = phrase.allPitches(this.repetition)
          .map(pitch => pitch.numberedPitch);
        return this.pitchSeqStrictDifferentiate(this.pitchSequence!, this.designator, trialArr);
      } else if (this.category === 'pitchSequenceLoose') {
        const trialArr = phrase.allPitches(this.repetition)
          .map(pitch => pitch.numberedPitch);
        return this.pitchSeqLooseDifferentiate(this.pitchSequence!, this.designator, trialArr);
      } 
    });
    this.trajectories = filteredPhrases.map(phrase => phrase.trajectories);
    this.identifier = filteredPhrases.map(phrase => phrase.pieceIdx!);
  }

  private groupFilter() {
    const groups = this.piece.allGroups({ instrumentIdx: this.instrumentIdx });
    const filteredGroups = groups.filter(group => {
      let bool = false;
      if (this.category === 'pitch') {
        const trialArr = group.allPitches(this.repetition)
          .map(pitch => pitch.numberedPitch);
        bool = this.pitchDifferentiate(this.pitch!, this.designator, trialArr);
      } else if (this.category === 'trajectoryID') {
        const trialArr = group.trajectories;
        bool = this.trajIDDifferentiate(this.trajectoryID!, this.designator, trialArr);
      } else if (this.category === 'vowel') {
        const trialArr = group.trajectories.map(traj => traj.vowel);
        bool = this.vowelDifferentiate(this.vowel!, this.designator, trialArr);
      } else if (this.category === 'startingConsonant') {
        const trialArr = group.trajectories.map(traj => traj.startConsonant);
        bool = this.consonantDifferentiate(this.consonant!, this.designator, trialArr);
      } else if (this.category === 'endingConsonant') {
        const trialArr = group.trajectories.map(traj => traj.endConsonant);
        bool = this.consonantDifferentiate(this.consonant!, this.designator, trialArr);
      } else if (this.category === 'anyConsonant') {
        const trialArr: (string | undefined)[] = [];
        group.trajectories.forEach(traj => {
          trialArr.push(traj.startConsonant);
          trialArr.push(traj.endConsonant);
        })
        bool = this.consonantDifferentiate(this.consonant!, this.designator, trialArr);
      } else if (this.category === 'pitchSequenceStrict') {
        const trialArr = group.allPitches(this.repetition)
          .map(pitch => pitch.numberedPitch);
        bool = this.pitchSeqStrictDifferentiate(this.pitchSequence!, this.designator, trialArr);
      } else if (this.category === 'pitchSequenceLoose') {
        const trialArr = group.allPitches(this.repetition)
          .map(pitch => pitch.numberedPitch);
        bool = this.pitchSeqLooseDifferentiate(this.pitchSequence!, this.designator, trialArr);
      }
      if (bool) {
        this.identifier.push(group.id);
      }
      return bool;
    });
    this.trajectories = filteredGroups.map(group => group.trajectories);
  }

  public get queryAnswers() {
    return this.trajectories.map((trajs, tIdx) => {
      const startPhrase = this.piece.phrases[trajs[0].phraseIdx!];
      const startTime = trajs[0].startTime! + startPhrase.startTime!;
      const endPhrase = this.piece.phrases[trajs[trajs.length - 1].phraseIdx!];
      const endTime = trajs[trajs.length - 1].endTime! + endPhrase.startTime!;
      const duration = endTime - startTime;
      let title: string = '';
      if (this.segmentation === 'phrase') {
        title = 'Phrase ' + startPhrase.pieceIdx
      } else if (this.segmentation === 'group') {
        const group = startPhrase.getGroupFromId(trajs[0].groupId!);
        if (group === undefined) throw new Error('group is undefined');
        const groupIdx = startPhrase.groupsGrid[0].indexOf(group);
        title = `Phrase ${startPhrase.pieceIdx} Group ${groupIdx}`;
      } else if (this.segmentation === 'sequenceOfTrajectories') {
        const pIdxs = trajs.map(t => t.phraseIdx!);
        const phraseIdxs = [...new Set(pIdxs)];
        const firstTIdx = trajs[0].num;
        const lastTIdx = trajs[trajs.length - 1].num;
        if (phraseIdxs.length === 1) {
          title = `Phrase ${phraseIdxs[0]} Traj ${firstTIdx}-${lastTIdx}`;
        } else {
          title = `Phrase ${phraseIdxs[0]} Traj ${firstTIdx} - Phrase ` + 
            `${phraseIdxs[phraseIdxs.length - 1]} Traj ${lastTIdx} `
        }
      } else if (this.segmentation === 'connectedSequenceOfTrajectories') {
        const pIdxs = trajs.map(t => t.phraseIdx!);
        const phraseIdxs = [...new Set(pIdxs)];
        const firstTIdx = trajs[0].num;
        const lastTIdx = trajs[trajs.length - 1].num;
        if (phraseIdxs.length === 1) {
          title = `Phrase ${phraseIdxs[0]} Traj ${firstTIdx}-${lastTIdx}`;
        } else {
          title = `Phrase ${phraseIdxs[0]} Traj ${firstTIdx} - Phrase ` + 
            `${phraseIdxs[phraseIdxs.length - 1]} Traj ${lastTIdx} `
        }
      }
      return {
        title,
        startTime,
        endTime,
        duration,
        trajectories: trajs,
        identifier: this.identifier[tIdx],
        segmentation: this.segmentation,
      }
    })
  }

  private sequenceOfTrajectoriesFilter() {
    const allTrajs = this.piece.allTrajectories(this.instrumentIdx);
    for (let i = 0; i < allTrajs.length - this.sequenceLength! + 1; i++) {
      const trajSeq = allTrajs.slice(i, i + this.sequenceLength!);
      let boolean = false;
      if (this.category === 'pitch') {
        const pitches = trajSeq.map(traj => traj.pitches).flat();
        let nPitches = pitches.map(pitch => pitch.numberedPitch);
        if (!this.repetition) {
          let lastPitch: number | undefined = undefined;
          nPitches = nPitches.filter(pitch => {
            if (pitch === lastPitch) {
              return false;
            }
            lastPitch = pitch;
            return true;
          });
        }
        boolean = this.pitchDifferentiate(this.pitch!, this.designator, nPitches);
      } else if (this.category === 'trajectoryID') {
        boolean = this.trajIDDifferentiate(this.trajectoryID!, this.designator, trajSeq);
      } else if (this.category === 'vowel') {
        const vowels = trajSeq.map(traj => traj.vowel);
        boolean = this.vowelDifferentiate(this.vowel!, this.designator, vowels);
      } else if (this.category === 'startingConsonant') {
        const consonants = trajSeq.map(traj => traj.startConsonant);
        boolean = this.consonantDifferentiate(this.consonant!, this.designator, consonants);
      } else if (this.category === 'endingConsonant') {
        const consonants = trajSeq.map(traj => traj.endConsonant);
        boolean = this.consonantDifferentiate(this.consonant!, this.designator, consonants);
      } else if (this.category === 'anyConsonant') {
        const consonants: (string | undefined)[] = [];
        trajSeq.forEach(traj => {
          consonants.push(traj.startConsonant);
          consonants.push(traj.endConsonant);
        })
        boolean = this.consonantDifferentiate(this.consonant!, this.designator, consonants);
      } else if (this.category === 'pitchSequenceStrict') {
        const pitches = trajSeq.map(traj => traj.pitches).flat();
        let nPitches = pitches.map(pitch => pitch.numberedPitch);
        if (!this.repetition) {
          let lastPitch: number | undefined = undefined;
          nPitches = nPitches.filter(pitch => {
            if (pitch === lastPitch) {
              return false;
            }
            lastPitch = pitch;
            return true;
          });
        };
        boolean = this.pitchSeqStrictDifferentiate(this.pitchSequence!, this.designator, nPitches);
      } else if (this.category === 'pitchSequenceLoose') {
        const pitches = trajSeq.map(traj => traj.pitches).flat();
        let nPitches = pitches.map(pitch => pitch.numberedPitch);
        if (!this.repetition) {
          let lastPitch: number | undefined = undefined;
          nPitches = nPitches.filter(pitch => {
            if (pitch === lastPitch) {
              return false;
            }
            lastPitch = pitch;
            return true;
          });
        }
        boolean = this.pitchSeqLooseDifferentiate(this.pitchSequence!, this.designator, nPitches);
      }
      if (boolean) {
        this.trajectories.push(trajSeq);
        const idObj = {
          phraseIdx: trajSeq[0].phraseIdx!,
          trajIdx: trajSeq[0].num!
        }
        this.identifier.push(idObj);
      }
    }
  }

  private connectedSequenceOfTrajectoriesFilter() {
    const allTrajs = this.piece.allTrajectories(this.instrumentIdx);
    const splitTrajs = this.splitTrajsBySilences(allTrajs);
    splitTrajs.forEach(trajSeq => {
      let boolean = false;
      if (this.category === 'pitch') {
        let nPitches = trajSeq.map(traj => traj.pitches).flat()
          .map(pitch => pitch.numberedPitch);
        if (!this.repetition) {
          let lastPitch: number | undefined = undefined;
          nPitches = nPitches.filter(pitch => {
            if (pitch === lastPitch) {
              return false;
            }
            lastPitch = pitch;
            return true;
          });
        }
        boolean = this.pitchDifferentiate(this.pitch!, this.designator, nPitches);
      } else if (this.category === 'trajectoryID') {
        boolean = this.trajIDDifferentiate(this.trajectoryID!, this.designator, trajSeq);
      } else if (this.category === 'vowel') {
        const vowels = trajSeq.map(traj => traj.vowel);
        boolean = this.vowelDifferentiate(this.vowel!, this.designator, vowels);
      } else if (this.category === 'startingConsonant') {
        const consonants = trajSeq.map(traj => traj.startConsonant);
        boolean = this.consonantDifferentiate(this.consonant!, this.designator, consonants);
      } else if (this.category === 'endingConsonant') {
        const consonants = trajSeq.map(traj => traj.endConsonant);
        boolean = this.consonantDifferentiate(this.consonant!, this.designator, consonants);
      } else if (this.category === 'anyConsonant') {
        const consonants: (string | undefined)[] = [];
        trajSeq.forEach(traj => {
          consonants.push(traj.startConsonant);
          consonants.push(traj.endConsonant);
        })
        boolean = this.consonantDifferentiate(this.consonant!, this.designator, consonants);
      } else if (this.category === 'pitchSequenceStrict') {
        let nPitches = trajSeq.map(traj => traj.pitches).flat()
          .map(pitch => pitch.numberedPitch);
        if (!this.repetition) {
          let lastPitch: number | undefined = undefined;
          nPitches = nPitches.filter(pitch => {
            if (pitch === lastPitch) {
              return false;
            }
            lastPitch = pitch;
            return true;
          });
        };
        boolean = this.pitchSeqStrictDifferentiate(this.pitchSequence!, this.designator, nPitches);
      } else if (this.category === 'pitchSequenceLoose') {
        let nPitches = trajSeq.map(traj => traj.pitches).flat()
          .map(pitch => pitch.numberedPitch);
        if (!this.repetition) {
          let lastPitch: number | undefined = undefined;
          nPitches = nPitches.filter(pitch => {
            if (pitch === lastPitch) {
              return false;
            }
            lastPitch = pitch;
            return true;
          });
        }
        boolean = this.pitchSeqLooseDifferentiate(this.pitchSequence!, this.designator, nPitches);
      }
      if (boolean) {
        this.trajectories.push(trajSeq);
        const idObj = {
          phraseIdx: trajSeq[0].phraseIdx!,
          trajIdx: trajSeq[0].num!
        }
        this.identifier.push(idObj);
      }
    })
  }

  private allTypeFilters() {
    if (this.segmentation === 'phrase') {
      this.phraseFilter();
    } else if (this.segmentation === 'group') {
      this.groupFilter();
    } else if (this.segmentation === 'sequenceOfTrajectories') {
      this.sequenceOfTrajectoriesFilter();
    } else if (this.segmentation === 'connectedSequenceOfTrajectories') {
      this.connectedSequenceOfTrajectoriesFilter();
    }
  }

  private splitTrajsBySilences(trajectories: Trajectory[]) {
    return trajectories.reduce((acc, traj) => {
      if (traj.id === 12) {
        acc.push([]);
      } else {
        acc[acc.length - 1].push(traj);
      }
      return acc;
    }, [[]] as Trajectory[][]);
  }

  private pitchDifferentiate(pitch: Pitch, designator: string, nPitches: number[]) {
    let boolean: boolean = false;
    if (designator === 'includes') {
      boolean = nPitches.includes(pitch.numberedPitch);
    } else if (designator === 'excludes') {
      boolean = !nPitches.includes(pitch.numberedPitch);
    } else if (designator === 'startsWith') {
      boolean = nPitches[0] === pitch.numberedPitch;
    } else if (designator === 'endsWith') {
      boolean = nPitches[nPitches.length - 1] === pitch.numberedPitch;
    }
    return boolean;
  }

  private pitchSeqStrictDifferentiate(pitchSeq: Pitch[], designator: string, nPitches: number[]) {
    let boolean: boolean = false;
    const numPitchSeq = pitchSeq.map(pitch => pitch.numberedPitch);
    if (designator === 'includes') {
      boolean = findSequenceIndexes(numPitchSeq, nPitches).length > 0;
    } else if (designator === 'excludes') {
      boolean = findSequenceIndexes(numPitchSeq, nPitches).length === 0;
    } else if (designator === 'startsWith') {
      boolean = numPitchSeq.every((pitch, idx) => pitch === nPitches[idx]);
    } else if (designator === 'endsWith') {
      const startIdx = nPitches.length - numPitchSeq.length;
      boolean = numPitchSeq.every((pitch, idx) => pitch === nPitches[startIdx + idx]);
    }
    return boolean;
  }

  private pitchSeqLooseDifferentiate(pitchSeq: Pitch[], designator: string, nPitches: number[]) {
    let boolean: boolean = false;
    const numPitchSeq = pitchSeq.map(pitch => pitch.numberedPitch);
    if (designator === 'includes') {
      const looseObj = testLooseSequenceIndexes(numPitchSeq, nPitches);
      boolean = looseObj.truth;
    } else if (designator === 'exclues') {
      const looseObj = testLooseSequenceIndexes(numPitchSeq, nPitches);
      boolean = !looseObj.truth;
    } else if (designator === 'startsWith') {
      const looseObj = testLooseSequenceIndexes(numPitchSeq, nPitches);
      boolean = looseObj.truth && looseObj.firstIdx === 0;
    } else if (designator === 'endsWith') {
      const looseObj = testLooseSequenceIndexes(numPitchSeq, nPitches);
      boolean = looseObj.truth && looseObj.lastIdx === nPitches.length - 1;
    }
    return boolean;
  }

  /**
    * Differentiates a trajectory ID based on a given designator.
    * 
    * @param {number} trajID - The trajectory ID to differentiate.
    * @param {string} designator - The designator to use for differentiation. 
    *                              It can be 'includes', 'excludes', 'startsWith', or 'endsWith'.
    * @param {Trajectory[]} trajectories - The array of trajectories to check against.
    * 
    * @returns {boolean} - Returns true if the trajectory ID matches the condition specified by the designator, false otherwise.
    */
  private trajIDDifferentiate(trajID: number, designator: string, trajectories: Trajectory[]) {
    let boolean: boolean = false;
    if (designator === 'includes') {
      boolean = trajectories.some(traj => traj.id === trajID);
    } else if (designator === 'excludes') {
      boolean = !trajectories.some(traj => traj.id === trajID);
    } else if (designator === 'startsWith') {
      boolean = trajectories[0].id === trajID;
    } else if (designator === 'endsWith') {
      boolean = trajectories[trajectories.length - 1].id === trajID;
    }
    return boolean;
  }

  private vowelDifferentiate(vowel: string, designator: string, vowels: (string | undefined)[]) {
    let boolean: boolean = false;
    if (designator === 'includes') {
      boolean = vowels.includes(vowel);
    } else if (designator === 'excludes') {
      boolean = !vowels.includes(vowel);
    } else if (designator === 'startsWith') {
      boolean = vowels[0] === vowel;
    } else if (designator === 'endsWith') {
      boolean = vowels[vowels.length - 1] === vowel;
    }
    return boolean;
  }

  private consonantDifferentiate(consonant: string, designator: string, 
            consonants: (string | undefined)[]) {
    let boolean: boolean = false;
    if (designator === 'includes') {
      boolean = consonants.includes(consonant);
    } else if (designator === 'excludes') {
      boolean = !consonants.includes(consonant);
    } else if (designator === 'startsWith') {
      boolean = consonants[0] === consonant;
    }
    return boolean;
  }

  private filterByDuration() {
    const removeIdxs = [] as number[];
    this.trajectories.map((trajSeq, tIdx) => {
      const firstPhrase = this.piece.phrases[trajSeq[0].phraseIdx!];
      const start = trajSeq[0].startTime! + firstPhrase.startTime!;
      const lastPIdx = trajSeq[trajSeq.length - 1].phraseIdx!;
      const lastPhrase = this.piece.phrases[lastPIdx];
      const end = trajSeq[trajSeq.length - 1].endTime! + lastPhrase.startTime!;
      if (end - start > this.maxDur) {
        removeIdxs.push(tIdx);
      }
      if (end - start < this.minDur) {
        removeIdxs.push(tIdx);
      }
    });
    this.trajectories = this.trajectories.filter((_, tIdx) => {
      return !removeIdxs.includes(tIdx)
    });
    this.identifier = this.identifier.filter((_, tIdx) => {
      return !removeIdxs.includes(tIdx)
    });

  }

  public static async single({
    transcriptionID = '63445d13dc8b9023a09747a6',
    segmentation = 'phrase',
    designator = 'includes',
    category = 'trajectoryID',
    pitch = undefined,
    sequenceLength = undefined,
    trajectoryID = undefined,
    vowel = undefined,
    consonant = undefined,
  }: {
    segmentation?: SegmentationType,
    transcriptionID?: string,
    designator?: DesignatorType,
    category?: CategoryType,
    pitch?: Pitch,
    sequenceLength?: number,
    trajectoryID?: number,
    vowel?: string,
    consonant?: string,
  } = {}) {
    try {
      const piece = await instantiatePiece(transcriptionID);
      const queryObj = { 
        segmentation, 
        designator, 
        category, 
        pitch, 
        sequenceLength,
        trajectoryID,
        vowel,
        consonant,
      };
      return new Query(piece, queryObj);
    } catch (error) {
      console.log(error);
    }
  }

  public static async multiple(queries: QueryType[] = [], {
    transcriptionID = '63445d13dc8b9023a09747a6',
    piece = undefined,
    segmentation = 'phrase',
    sequenceLength = undefined,
    minDur = 0,
    maxDur = 60,
    every = true // if false, then any (in other words, all vs. any)
  }: MultipleOptionType = {}): Promise<MultipleReturnType> {
    if (queries.length === 0) {
      throw new Error('No queries provided');
    }
    let outputTrajectories: Trajectory[][] = [];
    let outputIdentifiers: string[] = [];
    let queryAnswers: QueryAnswerType[] = [];
    let nonStringifiedOutputIdentifiers: (number | string | { phraseIdx: number, trajIdx: number })[] = [];
    try {
      if (piece === undefined) {
        piece = await instantiatePiece(transcriptionID);
      }
      const queryObjs = queries.map(query => {
        return { 
          segmentation, 
          designator: query.designator, 
          category: query.category, 
          pitch: query.pitch, 
          sequenceLength: sequenceLength,
          trajectoryID: query.trajectoryID,
          vowel: query.vowel,
          consonant: query.consonant,
          pitchSequence: query.pitchSequence,
          minDur,
          maxDur,
        };
      });
      const answers = queryObjs.map((queryObj: QueryType ) => {
        return new Query(piece!, queryObj)
      });
      if (every) { // only selects trajectories that are in all answers
        outputIdentifiers = answers.reduce((acc, answer) => {
          const ids = answer.stringifiedIdentifier.filter(id => acc.includes(id));
          return ids.length > 0 ? ids : [];
        }, answers[0].stringifiedIdentifier);
        const idxs = outputIdentifiers.map(id => {
          return answers[0].stringifiedIdentifier.indexOf(id);
        });
        outputTrajectories = idxs.map(idx => answers[0].trajectories[idx]);
        nonStringifiedOutputIdentifiers = idxs.map(idx => answers[0].identifier[idx]);
        queryAnswers = idxs.map(idx => answers[0].queryAnswers[idx]);

      } else { // selects trajectories that are in any answer
        const startTimes = [] as number[];
        answers.forEach(answer => {
          answer.stringifiedIdentifier.forEach((sID,  sIDidx) => {
            if (!outputIdentifiers.includes(sID)) {
              outputIdentifiers.push(sID);
              outputTrajectories.push(answer.trajectories[sIDidx]);
              nonStringifiedOutputIdentifiers.push(answer.identifier[sIDidx]);
              queryAnswers.push(answer.queryAnswers[sIDidx]);
              startTimes.push(answer.startTimes[sIDidx]);
            }
          })
        })
        const sortIdxs = Array.from({length: startTimes.length}, (_, i) => i);
        sortIdxs.sort((a, b) => startTimes[a] - startTimes[b]);
        outputTrajectories = sortIdxs.map(idx => outputTrajectories[idx]);
        nonStringifiedOutputIdentifiers = sortIdxs.map(idx => nonStringifiedOutputIdentifiers[idx]);
        queryAnswers = sortIdxs.map(idx => queryAnswers[idx]);
      }   
    } catch (error) {
      console.log(error);
    }
    return [outputTrajectories, nonStringifiedOutputIdentifiers, queryAnswers];
  }
}

type MultipleOptionType = {
  transcriptionID?: string,
  segmentation?: SegmentationType,
  sequenceLength?: number,
  piece?: Piece,
  minDur?: number,
  maxDur?: number,
  every?: boolean,
}

const query_1 = {
  designator: 'includes' as DesignatorType,
  category: 'pitch' as CategoryType,
  pitch: new Pitch({ swara: 'sa', oct: 0 }),
  // consonant: 'ma',
}

const query_2 = {
  designator: 'includes' as DesignatorType,
  category: 'pitchSequenceStrict' as CategoryType,
  pitchSequence: [
    new Pitch({ swara: 'dha', oct: -1}), 
    new Pitch({ swara: 'sa'}),
    new Pitch({ swara: 'ni', oct: -1}),
    new Pitch({ swara: 'sa'}),
  ],
}

Query.multiple([query_1, query_2], { 
  segmentation: 'phrase',
})
  .then(q => {
    console.log(q)
  })

  export { Query }

  export type { 
    QueryType, 
    MultipleOptionType, 
    SegmentationType,
    CategoryType,
    DesignatorType,
    QueryAnswerType
  }