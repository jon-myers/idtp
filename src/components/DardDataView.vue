<template>
<div class='ddvOuter'>
  <div class='rowBox' v-if='pieceLoaded'>
    <div 
      class='phrase' 
      v-for='phrase in piece.phrases' 
      :key='phrase.pieceIdx'
      :style="{width: allWidths[phrase.pieceIdx]+'px'}"
      >
      <span class='swaraRow'>
        {{'Phrase ' + (Number(phrase.pieceIdx) + 1)}}
      </span>
      <span class='swaraRow'>
        <span class='swara' v-for='(swara, idx) in phrase.swara'
        :key='idx'>{{getLetters(swara)}}</span>
      </span>
      <span class='swaraRow'>
        <span class='swara' v-for='(swara, idx) in phrase.swara'
        :key='idx'>{{swara.pitch.swara + 1}}</span>
      </span>
      <span class='swaraRow'>
        <span class='swara' v-for='(_, idx) in phrase.swara'
        :key='idx'>{{reduceSwara(phrase.swara, 1)[idx]}}</span>
      </span>
      <span class='chunkSwaraRow'>
        <div 
          class='chunks' 
          v-for='(chunk, idx) in chunks(phrase.swara)' 
          :key='idx' 
          :id='"p"+(chunks(phrase.swara).length - idx)'
          >
          <span class='chunkSpan' v-for='(ch, chIdx) in chunk' :key='chIdx'>
            {{ch}}
          </span>
        </div>
      </span>
      
    
    </div>
  </div>
</div>
</template>

<script>
import {
  Piece,
  Phrase,
  Trajectory,
  Pitch,
  Articulation,
  Raga,
} from '@/js/classes.mjs';

import { getRaagRule } from '@/js/serverCalls.mjs';

// import savedPiece from '@/assets/piece2.JSON';
// import * as d3 from 'd3';

export default {
  name: 'DardDataView',
  data() {
    return {
      horizSize: 25,
      totWidth: 3000,
      rowHeight: 25,
      pieceLoaded: false
    }
  },

  mounted() {
    this.piece = this.$parent.$refs.transcription.piece
    this.pieceLoaded = true
    // this.getPieceFromJson(savedPiece);
    this.getTotWidth();

  },
  
  computed: {
    
    
    
  },

  methods: {
    
    combine(pitchLetter, oct) {
      let add = '';
      if (oct === -2) {
        add = '\u0324'
      } else if (oct === -1) {
        add = '\u0323'
      } else if (oct === 1) {
        add = '\u0775'
      } else if (oct === 2) {
        add = '\u0308'
      }
      return pitchLetter + add
    },
    
    getLetters(swara) {
      const oct = swara.pitch.oct;
      const pitchLetter = this.piece.raga.sargamLetters[swara.pitch.swara]
      return this.combine(pitchLetter, oct)
    },
    
    chunks(swara) {
      return this.chunkifySwara(swara, 1)
    },
    
    reduceSwara(swara, offset) {
      const ofs = offset === undefined ? 0 : offset;
      
      return swara.map((s, i) => {
        if (i > 0 && swara[i-1].pitch.swara === s.pitch.swara) {
          return ''
        } else {
          return this.combine(s.pitch.swara + ofs, s.pitch.oct)
        }
      })
    },
    
    chunkifySwara(swara, offset) {
      // chops swara into non repeating bits
      const ofs = offset === undefined ? 0 : offset;
      let arr = this.reduceSwara(swara, ofs).filter(a => a !== '')
      const out = [];
      let current = [];
      arr.forEach((s, i) => {
        if (current.includes(s)) {
          out.push([...current]);
          current = [s]
        } else {
          current.push(s)
        }
        if (i === arr.length-1) out.push([...current])
      })
      return out
    },
    
    async getPieceFromJson(piece) {
      piece.phrases.forEach(phrase => {
        phrase.trajectories.forEach(traj => {
          traj.pitches = traj.pitches.map(pitch => new Pitch(pitch));
          const artKeys = Object.keys(traj.articulations);
          const artEntries = artKeys.map(key => traj.articulations[key]);
          const artObj = {};
          artKeys.forEach((key, i) => {
            artObj[key] = new Articulation(artEntries[i]);
          });
          traj.articulations = artObj;
          if (phrase.instrumentation) {
            traj.instrumentation = phrase.instrumentation[0];
          }
        });
        if (phrase.trajectoryGrid) {
          phrase.trajectoryGrid[0] = phrase.trajectories.map(traj => {
            return new Trajectory(traj)
          })
        } else {
          phrase.trajectories = phrase.trajectories.map(traj => {
            return new Trajectory(traj)
          });
        };
        if (piece.instrumentation) {
          phrase.instrumentation = piece.instrumentation;
        }
      });
      piece.phrases = piece.phrases.map(phrase => new Phrase(phrase));
      const rsRes = await getRaagRule(piece.raga.name);
      piece.raga.ruleSet = rsRes.rules;
      piece.raga = new Raga(piece.raga);
      this.piece = new Piece(piece);
      this.pieceLoaded = true
    },

    getTotWidth() {
      this.allWidths = this.piece.phrases.map(phrase => {
        return phrase.swara.length * this.horizSize
      })
      this.totWidth = this.allWidths.reduce((a, b) => a + b, 0)
    }
  }
}
</script>

<style scoped>
.ddvOuter {
  width: 100%;
  height: 200px;
  border-top: 1px solid black;
  border-bottom: 1px solid black;
  overflow: scroll
}

.rowBox {
  width: v-bind(totWidth + 'px');
  height: 100%;
  display: flex;
  flex-direction: row;
}

.phrase {
  height: 100%;
  border-right: 1px solid black;
  display: flex;
  flex-direction: column;
  align-items: left;
  justify-content: center;
}

.swaraRow {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: 100%;
  border-bottom: 1px solid black;
  justify-content: center;
}

.swara {
  width: v-bind(horizSize+'px')
}

.chunks:not(#p1) {
  border-right: 1px solid black;
}

.chunks {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 100%;
  justify-content: space-evenly;
}



.chunkSwaraRow {
  display: flex;
  flex-direction: row;
  height: 100%;
}

</style>
