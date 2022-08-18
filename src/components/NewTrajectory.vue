<template>
<div class='main'>
  <div class='selectionRow'>
    <div class='selectionPack'>
      <label>Type: </label>
      <select v-model='keyName'>
        <option v-for='name in Object.keys(traj.structuredNames)' :key='name'>
          {{name}}
        </option>
      </select>
      <select v-model='extraKeyName' v-if='showExtra(keyName)'>
        <option v-for='oth in Object.keys(traj.structuredNames[keyName])' :key='oth'>
          {{oth}}
        </option>
      </select>
    </div>
    
  </div>

  <div class='selectionRow' v-if='keyName && keyName !== "silent"'>
    <div class='selPackCol'>
      <div class='selectionPack'>
        <label>Swara: </label>
        <select class='lower' v-for='(p, idx) in numNotes' v-model='swara[idx]' :key='idx'>
          <option v-for='letter in sargamLetters' :key='letter'>
            {{ letter }}
          </option>
        </select>
        <button class='iter' v-if='extraKeyName === "yoyo"' @click='addNumNotes'>+</button>
      </div>

      <div class='selectionPack'>
        <label>Octave: </label>
        <select class='lower' v-for='(p, idx) in numNotes' v-model='oct[idx]' :key='idx'>
          <option v-for='octChoice in octChoices' :key='octChoice'>
            {{ octChoice }}
          </option>
        </select>
        <button class='iter' v-if='extraKeyName === "yoyo"' @click='subNumNotes'>-</button>
      </div>
    </div>
  </div>
  
  <div class='selectionRow' v-if='keyName'>
    <label v-if='keyName !== "silent"'>Pluck: </label>
    <input v-if='keyName !== "silent"' type='checkbox' v-model='pluckCheck'/>
    <label class='number'>Duration: </label>
    <input type='number' v-model='duration'/>
  </div>
  <div class='selectionRow button' v-if='keyName'>
    <button @click='enter'>enter</button>
  </div>
</div>
</template>
<script>
import {
  Trajectory,
  Articulation, 
  Pitch,
  Phrase
} from '@/js/classes.js';
export default {
  name: 'NewTrajectory',

  data() {
    return {
      piece: undefined,
      raga: undefined,
      traj: new Trajectory(),
      octChoices: [2, 1, 0, -1, -2],
      keyName: undefined,
      extraKeyName: undefined,
      numNotes: 1,
      swara: ['s'],
      oct: [0],
      pluckCheck: true,
      duration: 1.0,
      newTrajObj: undefined
    }
  },

  mounted() {
    this.piece = this.$parent.$refs.transcription.piece;
    this.raga = this.piece.raga;
    this.emitter.on('newTrajObj', newTrajObj => {
      this.newTrajObj = newTrajObj
    })


  },

  watch: {
    numNotes() {
      this.swara = [...Array(this.numNotes)].fill('s');
      this.oct = [...Array(this.numNotes)].fill(0)
    },

    keyName() {
      this.extraKeyName = undefined;
      if (this.keyName === 'fixed') {
        this.numNotes = 1;
      } else if (this.keyName === 'bend' || this.keyName === 'slide') {
        this.numNotes = 2;
      } else if (this.keyName === 'silent') {
        this.numNotes = 0
      }
    },
    
    extraKeyName() {
      const ex = this.extraKeyName;
      if (ex) {
        if (ex === 'sloped start' || ex === 'sloped end' || ex === 'krintin') {
          this.numNotes = 2
        } else if (
          ex === 'ladle' || 
          ex === 'reverse ladle' ||
          ex === 'krintin slide') {
          this.numNotes = 3
        } else if (ex === 'krintin slide hammer') {
          this.numNotes = 4
        } else if (ex === 'spiffy krintin slide hammer') {
          this.numNotes = 6
        }
      }
      
    }
  },

  computed: {
    
    
    
    sargamLetters() {
      return [...this.raga.sargamLetters].reverse()
    }

  },

  methods: {
    
    _reset() {
      this.keyName = undefined;
      this.extraKeyName = undefined; 
      this.numNotes = 1;
      this.swara = ['s'];
      this.oct = [0];
      this.pluckCheck = true;
      this.duration = 1.0;
      this.newTrajObj = undefined;
    },
    
    showExtra(keyName) {
      return keyName && (keyName === "bend" || keyName === 'krintin')
    },
    
    addNumNotes() {
      this.numNotes++
    },
    
    subNumNotes() {
      if (this.numNotes > 2) this.numNotes--
    },
    
    enter() {
      const pIdx = this.newTrajObj.pIdx;
      const tIdx = this.newTrajObj.tIdx;
      const sn = this.traj.structuredNames;
      const id = typeof sn[this.keyName] === 'number' ? 
                 sn[this.keyName] :
                 sn[this.keyName][this.extraKeyName];
      
      const pitches = this.swara.map((s, i) => {
        const unicodeAdd = s.slice(1);
        const raised = unicodeAdd === '\u0332' ? false : true;
        return new Pitch({ 
          swara: s.slice(0, 1), 
          oct: Number(this.oct[i]), 
          raised: raised,
          fundamental: this.piece.raga.fundamental
          })
      })
      
      const arts = this.pluckCheck ? 
        {0: new Articulation({name: 'pluck', stroke: 'd'})} :
        {};
      console.log('pitches', pitches)
      const newTraj = new Trajectory({
        id: id, 
        pitches: pitches,
        durTot: this.duration,
        articulations: arts,  
      })
      if (id === 12) {
        newTraj.fundID12 = this.piece.raga.fundamental
      }
      
      if (this.newTrajObj.type !== 'newPhrase') {
        if (this.newTrajObj.type === 'left' || this.newTrajObj.type === 'right') {
          this.piece.phrases[pIdx].trajectories.splice(tIdx, 0, newTraj);
        } else if (this.newTrajObj.type === 'replace') {
          this.piece.phrases[pIdx].trajectories.splice(tIdx, 1, newTraj);
        }
        this.piece.phrases[pIdx].durArrayFromTrajectories();
        this.piece.phrases[pIdx].assignStartTimes();
        this.piece.phrases[pIdx].assignTrajNums();
        this.piece.durArrayFromPhrases();
        this.piece.updateStartTimes();
      } else {
        const newPhrase = new Phrase({ trajectories: [newTraj]});
        this.piece.phrases.splice(pIdx, 0, newPhrase);
        this.piece.durArrayFromPhrases();
        this.piece.updateStartTimes();
        // durTot
      }
      
      
      this.emitter.emit('reDraw');
      this.$parent.showNewTrajectory = false;
      this._reset();
    }
  }
}
</script>

<style scoped>
.main {
  /* background-color: purple; */
  width: 400px;
  height: 200px;
  min-height: 200px;
  border-bottom: 1px solid black;
  border-right: 1px solid black;
  border-left: 1px solid black;
}

.selectionRow {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  height: 50px;
}

label {
  display: inline-block;
  width: 60px;
  text-align: right;
  margin-right: 5px;
  margin-left: 5px;
}

select.lower {
  width: 40px;
}

.rightArrow {
  width: 26px;
  height: 12px;
  /* background-color: rgba(12, 12, 13, 0.1);
  border-radius: 5px;
  border: 1px solid darkgrey; */
}

.selPackCol {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* width: 200px; */
  /* max-width: 150px; */
}

.selectionPack {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.iter {
  width: 21px;
  height: 21px;
  margin-left: 5px;
}

input[type=number] {
  -moz-appearance: textfield;
  width: 30px;
}

label.number {
  width: 70px;
}



</style>
