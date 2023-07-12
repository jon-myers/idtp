import { instantiatePiece } from './analysis.mjs';


class Query {

  constructor({
    transcriptionID = '63445d13dc8b9023a09747a6',
    type = 'phrases',
    designator = 'includes',
    category = 'trajectoryID',


  }: {
    type?: string,
    transcriptionID?: string,
    designator?: 'includes' | 'excludes' | 'startsWith' | 'endsWith',
    category?: 'trajectoryID'| 'swara'

  } = {}) {
    const piece = instantiatePiece(transcriptionID);
    console.log(piece)
  }
}