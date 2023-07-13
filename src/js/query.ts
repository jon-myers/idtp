import { instantiatePiece } from './analysis.ts';
import { Piece, Pitch, Trajectory } from './classes.ts';

class Query {
  trajectories: Trajectory[][] = [];
  phraseIdxs: number[] = [];

  private constructor(piece: Piece, {
    type = 'phrase',
    designator = 'includes',
    category = 'trajectoryID',
    pitch = undefined,
  }: {
    type?: 'phrase' | 'group' | 'sequencyOfTrajectories',
    designator?: 'includes' | 'excludes' | 'startsWith' | 'endsWith',
    category?: 'trajectoryID'| 'pitch',
    pitch?: Pitch
  } = {}) {
    if (category === 'pitch') {
      if (pitch === undefined) {
        throw new Error('Pitch is required when category is pitch');
      }
      if (type === 'phrase') {
        console.log('got here')
        const phrases = piece.phrases;
        const filteredPhrases = phrases.filter(phrase => {
          const numberedPitches = phrase.allPitches(false)
            .map(pitch => pitch.numberedPitch);
          if (designator === 'includes') {
            return numberedPitches.includes(pitch.numberedPitch);
          } else if (designator === 'excludes') {
            return !numberedPitches.includes(pitch.numberedPitch);
          } else if (designator === 'startsWith') {
            return numberedPitches[0] === pitch.numberedPitch;
          } else if (designator === 'endsWith') {
            return numberedPitches[numberedPitches.length - 1] === pitch.numberedPitch;
          }
        });
        this.trajectories = filteredPhrases.map(phrase => phrase.trajectories);
        this.phraseIdxs = filteredPhrases.map(phrase => phrase.pieceIdx!);   
      }  
    }
  }
  

  public static async create({
    transcriptionID = '63445d13dc8b9023a09747a6',
    type = 'phrase',
    designator = 'includes',
    category = 'trajectoryID',
    pitch = undefined
  }: {
    type?: 'phrase' | 'group' | 'sequencyOfTrajectories',
    transcriptionID?: string,
    designator?: 'includes' | 'excludes' | 'startsWith' | 'endsWith',
    category?: 'trajectoryID'| 'pitch',
    pitch?: Pitch
  } = {}) {
    try {
      const piece = await instantiatePiece(transcriptionID);
      const queryObj = { type, designator, category, pitch };
      return new Query(piece, queryObj);
    } catch (error) {
      console.log(error);
    }
  }


}

const pitch = new Pitch({ oct: -1 });
Query.create({ category: 'pitch', designator: 'includes', pitch })
  .then(q => {
    if (q !== undefined) {
      console.log(q.phraseIdxs)
    }
  });
