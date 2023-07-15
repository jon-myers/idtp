import { instantiatePiece } from './analysis.ts';
import { Piece, Pitch, Trajectory, Group } from './classes.ts';

class Query {
  trajectories: Trajectory[][] = [];
  phraseIdxs: number[] = [];
  instrumentIdx: number;
  identifier: (number | string | { phraseIdx: number, trajIdx: number })[] = [];
  sequenceLength?: number;
  repetition: boolean;

  private constructor(piece: Piece, {
    type = 'phrase',
    designator = 'includes',
    category = 'trajectoryID',
    pitch = undefined,
    sequenceLength = undefined,
    trajectoryID = undefined,
    vowel = undefined
  }: {
    type?: (
    'phrase' | 
    'group' | 
    'sequenceOfTrajectories' | 
    'connectedSequenceOfTrajectories'
    ),
    designator?: 'includes' | 'excludes' | 'startsWith' | 'endsWith',
    category?: 'trajectoryID'| 'pitch' | 'vowel',
    pitch?: Pitch,
    sequenceLength?: number,
    trajectoryID?: number,
    vowel?: string
  } = {}) {
    this.identifier = [];
    this.instrumentIdx = 0;
    this.repetition = false;
    if (category === 'pitch') {
      if (pitch === undefined) {
        throw new Error('Pitch is required when category is pitch');
      }
      if (type === 'phrase') {
        const phrases = piece.phrases;
        const filteredPhrases = phrases.filter(phrase => {
          const nPitches = phrase.allPitches(this.repetition)
            .map(pitch => pitch.numberedPitch);
          const boolean = this.pitchDifferentiate(pitch, designator, nPitches)
          return boolean;
        });
        this.trajectories = filteredPhrases.map(phrase => phrase.trajectories);
        this.identifier = filteredPhrases.map(phrase => phrase.pieceIdx!);
      } else if (type === 'group') {
        const groups = piece.allGroups({ instrumentIdx: this.instrumentIdx });
        const filteredGroups = groups.filter(group => {
          const nPitches = group.allPitches(this.repetition)
            .map(pitch => pitch.numberedPitch);
          const boolean = this.pitchDifferentiate(pitch, designator, nPitches)
          if (boolean) {
            this.identifier.push(group.id);
          }
          return boolean;
        });
        this.trajectories = filteredGroups.map(group => group.trajectories);
      } else if (type === 'sequenceOfTrajectories') {
        if (sequenceLength === undefined) {
          throw new Error('sequenceLength is required when type is ' + 
            'sequenceOfTrajectories');
        }
        const allTrajs = piece.allTrajectories(this.instrumentIdx);
        this.trajectories = [];
        for (let i = 0; i < allTrajs.length - sequenceLength + 1; i++) {
          const trajSeq = allTrajs.slice(i, i + sequenceLength);
          const pitches = trajSeq.map(traj => traj.pitches).flat();
          let nPitches = pitches.map(pitch => pitch.numberedPitch);
          if (!this.repetition) {
            // no immidiate repetition
            let lastPitch: number | undefined = undefined;
            nPitches = nPitches.filter(pitch => {
              if (pitch === lastPitch) {
                return false;
              }
              lastPitch = pitch;
              return true;
            });
          }
          const boolean = this.pitchDifferentiate(pitch, designator, nPitches);
          if (boolean) {
            this.trajectories.push(trajSeq);
            const idObj = {
              phraseIdx: trajSeq[0].phraseIdx!,
              trajIdx: trajSeq[0].num!
            }
            this.identifier.push(idObj);
          }
        }
      } else if (type === 'connectedSequenceOfTrajectories') {
        const allTrajs = piece.allTrajectories(this.instrumentIdx);
        const subGroups = this.splitTrajsBySilences(allTrajs);
        subGroups.forEach(trajs => {
          let nPitches = trajs.map(traj => traj.pitches).flat()
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
          const boolean = this.pitchDifferentiate(pitch, designator, nPitches);
          if (boolean) {
            this.trajectories.push(trajs);
            const idObj = {
              phraseIdx: trajs[0].phraseIdx!,
              trajIdx: trajs[0].num!
            }
            this.identifier.push(idObj);
          }
        });
      }
    } else if (category === 'trajectoryID') {
      if (trajectoryID === undefined) {
        throw new Error('trajectoryID is required when category is trajectoryID');
      }
      if (type === 'phrase') {
        const phrases = piece.phrases;
        const filteredPhrases = phrases.filter(phrase => {
          const trajs = phrase.trajectories;
          const boolean = this.trajIDDifferentiate(trajectoryID, designator, trajs);
          return boolean
        })
        this.trajectories = filteredPhrases.map(phrase => phrase.trajectories);
        this.identifier = filteredPhrases.map(phrase => phrase.pieceIdx!);
      } else if (type === 'group') {
        const groups = piece.allGroups({ instrumentIdx: this.instrumentIdx });
        const filteredGroups = groups.filter(group => {
          const trajs = group.trajectories;
          const boolean = this.trajIDDifferentiate(trajectoryID, designator, trajs);
          if (boolean) {
            this.identifier.push(group.id);
          }
          return boolean;
        })
        this.trajectories = filteredGroups.map(group => group.trajectories);
      } else if (type === 'sequenceOfTrajectories') {
        if (sequenceLength === undefined) {
          throw new Error('sequenceLength is required when type is ' + 
            'sequenceOfTrajectories');
        }
        const allTrajs = piece.allTrajectories(this.instrumentIdx);
        this.trajectories = [];
        for (let i = 0; i < allTrajs.length - sequenceLength + 1; i++) {
          const trajSeq = allTrajs.slice(i, i + sequenceLength);
          const boolean = this.trajIDDifferentiate(trajectoryID, designator, trajSeq);
          if (boolean) {
            this.trajectories.push(trajSeq);
            const idObj = {
              phraseIdx: trajSeq[0].phraseIdx!,
              trajIdx: trajSeq[0].num!
            }
            this.identifier.push(idObj);
          }
        }
      } else if (type === 'connectedSequenceOfTrajectories') {
        const allTrajs = piece.allTrajectories(this.instrumentIdx);
        const subGroups = this.splitTrajsBySilences(allTrajs)
        subGroups.forEach(trajs => {
          const boolean = this.trajIDDifferentiate(trajectoryID, designator, trajs);
          if (boolean) {
            this.trajectories.push(trajs);
            const idObj = {
              phraseIdx: trajs[0].phraseIdx!,
              trajIdx: trajs[0].num!
            }
            this.identifier.push(idObj);
          }
        });
      }
    } else if (category === 'vowel') {
      const inst = piece.instrumentation[this.instrumentIdx];
      if (!(inst === 'Vocal (F)' || inst === 'Vocal (M)')) {
        throw new Error('category vowel is only for vocal instruments');
      }
      if (vowel === undefined) {
        throw new Error('vowel is required when category is vowel');
      }
      if (type === 'phrase') {
        const phrases = piece.phrases;
        const filteredPhrases = phrases.filter(phrase => {
          const trajs = phrase.trajectories;
          const vowels = trajs.map(traj => traj.vowel);
          return this.vowelDifferentiate(vowel, designator, vowels);
        });
        this.trajectories = filteredPhrases.map(phrase => phrase.trajectories);
        this.identifier = filteredPhrases.map(phrase => phrase.pieceIdx!);
      } else if (type === 'group') {
        const groups = piece.allGroups({ instrumentIdx: this.instrumentIdx });
        const filteredGroups = groups.filter(group => {
          const trajs = group.trajectories;
          const vowels = trajs.map(traj => traj.vowel);
          const boolean = this.vowelDifferentiate(vowel, designator, vowels);
          if (boolean) {
            this.identifier.push(group.id);
          }
          return boolean;
        });
        this.trajectories = filteredGroups.map(group => group.trajectories);
      } else if (type === 'sequenceOfTrajectories') {
        if (sequenceLength === undefined) {
          throw new Error('sequenceLength is required when type is ' + 
            'sequenceOfTrajectories');
        }
        const allTrajs = piece.allTrajectories(this.instrumentIdx);
        this.trajectories = [];
        for (let i = 0; i < allTrajs.length - sequenceLength + 1; i++) {
          const trajSeq = allTrajs.slice(i, i + sequenceLength);
          const vowels = trajSeq.map(traj => traj.vowel);
          const boolean = this.vowelDifferentiate(vowel, designator, vowels);
          if (boolean) {
            this.trajectories.push(trajSeq);
            const idObj = {
              phraseIdx: trajSeq[0].phraseIdx!,
              trajIdx: trajSeq[0].num!
            }
            this.identifier.push(idObj);
          }
        }
      } else if (type === 'connectedSequenceOfTrajectories') {
        const allTrajs = piece.allTrajectories(this.instrumentIdx);
        const subGroups = this.splitTrajsBySilences(allTrajs)
        subGroups.forEach(trajs => {
          const vowels = trajs.map(traj => traj.vowel);
          const boolean = this.vowelDifferentiate(vowel, designator, vowels);
          if (boolean) {
            this.trajectories.push(trajs);
            const idObj = {
              phraseIdx: trajs[0].phraseIdx!,
              trajIdx: trajs[0].num!
            }
            this.identifier.push(idObj);
          }
        });
      }
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

  public static async create({
    transcriptionID = '63445d13dc8b9023a09747a6',
    type = 'phrase',
    designator = 'includes',
    category = 'trajectoryID',
    pitch = undefined,
    sequenceLength = undefined,
    trajectoryID = undefined,
    vowel = undefined,
  }: {
    type?: (
      'phrase' | 
      'group' | 
      'sequenceOfTrajectories' | 
      'connectedSequenceOfTrajectories'
    ),
    transcriptionID?: string,
    designator?: 'includes' | 'excludes' | 'startsWith' | 'endsWith',
    category?: 'trajectoryID'| 'pitch' | 'vowel',
    pitch?: Pitch,
    sequenceLength?: number,
    trajectoryID?: number,
    vowel?: string,
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
        vowel
      };
      return new Query(piece, queryObj);
    } catch (error) {
      console.log(error);
    }
  }
}

// const pitch = new Pitch({ swara: 'ga', oct: 0 });

const transcriptionID = '645ff354deeaf2d1e33b3c44';// beghum akhtar - babul mora
Query.create({ 
  type: 'phrase', 
  category: 'vowel', 
  designator: 'startsWith',
  trajectoryID: 13,
  transcriptionID,
  vowel: 'ō'
})
  .then(q => {
    if (q !== undefined) {
      console.log(q.trajectories.length)
      console.log(q.identifier)
    }
  });
