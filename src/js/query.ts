import { instantiatePiece } from './analysis.ts';
import { Piece, Pitch, Trajectory, Group } from './classes.ts';


type CategoryType = (
  'trajectoryID' |
  'pitch' |
  'vowel' |
  'startingConsonant' |
  'endingConsonant' |
  'anyConsonant'
)
class Query {
  trajectories: Trajectory[][] = [];
  phraseIdxs: number[] = [];
  instrumentIdx: number;
  identifier: (number | string | { phraseIdx: number, trajIdx: number })[] = [];
  sequenceLength?: number;
  repetition: boolean;
  piece: Piece;
  consonant?: string;
  vowel?: string;
  trajectoryID?: number;
  pitch?: Pitch;
  designator: 'includes' | 'excludes' | 'startsWith' | 'endsWith'; 
  category: CategoryType;
  type: (
    'phrase' |
    'group' |
    'sequenceOfTrajectories' |
    'connectedSequenceOfTrajectories'
  );

  private constructor(piece: Piece, {
    type = 'phrase',
    designator = 'includes',
    category = 'trajectoryID',
    pitch = undefined,
    sequenceLength = undefined,
    trajectoryID = undefined,
    vowel = undefined,
    consonant = undefined,
  }: {
    type?: (
    'phrase' | 
    'group' | 
    'sequenceOfTrajectories' | 
    'connectedSequenceOfTrajectories'
    ),
    designator?: 'includes' | 'excludes' | 'startsWith' | 'endsWith',
    category?: CategoryType,
    pitch?: Pitch,
    sequenceLength?: number,
    trajectoryID?: number,
    vowel?: string,
    consonant?: string
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
    this.type = type;
    if (type === 'sequenceOfTrajectories') {
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
    }
    this.allTypeFilters();
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
      }
      if (bool) {
        this.identifier.push(group.id);
      }
      return bool;
    });
    this.trajectories = filteredGroups.map(group => group.trajectories);
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
    if (this.type === 'phrase') {
      this.phraseFilter();
    } else if (this.type === 'group') {
      this.groupFilter();
    } else if (this.type === 'sequenceOfTrajectories') {
      this.sequenceOfTrajectoriesFilter();
    } else if (this.type === 'connectedSequenceOfTrajectories') {
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

  public static async create({
    transcriptionID = '63445d13dc8b9023a09747a6',
    type = 'phrase',
    designator = 'includes',
    category = 'trajectoryID',
    pitch = undefined,
    sequenceLength = undefined,
    trajectoryID = undefined,
    vowel = undefined,
    consonant = undefined,
  }: {
    type?: (
      'phrase' | 
      'group' | 
      'sequenceOfTrajectories' | 
      'connectedSequenceOfTrajectories'
    ),
    transcriptionID?: string,
    designator?: 'includes' | 'excludes' | 'startsWith' | 'endsWith',
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
        type, 
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
}

const pitch = new Pitch({ swara: 'ma', oct: 0 });

const transcriptionID = '645ff354deeaf2d1e33b3c44';// beghum akhtar - babul mora
Query.create({ 
  type: 'connectedSequenceOfTrajectories', 
  category: 'anyConsonant', 
  designator: 'includes',
  transcriptionID,
  consonant: 'la',
  vowel: 'a',
  pitch,
  trajectoryID: 1,
  sequenceLength: 23,
})
  .then(q => {
    if (q !== undefined) {
      console.log(q.trajectories.length)
      console.log(q.identifier)
    }
  });
