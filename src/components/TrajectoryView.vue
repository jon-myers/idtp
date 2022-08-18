<template>
<div class='main' v-if='piece' ref='main'>
  <div class='phraseBox' v-for='(phrase, pIdx) in piece.phrases' :key='pIdx'>
    <div class='phraseRow'>
      <button @click='handlePhraseInsert(pIdx, "left")'>Insert Left</button>
      <div class='phraseLabelBox'>
        <span class='phraseLabel'>{{'Phrase '+(phrase.pieceIdx+1)}}</span>
        <button class='delete' @click='handlePhraseDelete(pIdx)'>Delete</button>
      </div>
      <button @click='handlePhraseInsert(pIdx, "right")'>Insert Right</button>
    </div>
    <div class='trajRow'>
      <div
          class='trajBox'
          v-for='(traj, tIdx) in phrase.trajectories'    
          :key='tIdx'
          @mouseenter='startHoverTraj(pIdx, tIdx)'
          @mouseleave='stopHoverTraj()'
          :id='"_"+((phrase.trajectories.length - 1) - tIdx)'
          :ref='`p${pIdx}t${tIdx}`'>
        <div class='trajLabel'>{{'Trajectory '+(traj.num+1)}}</div>
        <span class='smaller'>
          {{ getTimeString(traj, phrase) }}
        </span>
        <span class='name'>{{traj.name}}</span>
        <div class='editRow' v-if='traj.id !== 12'>
          <input
              type='checkbox'
              class='pluckCheck'
              v-model='pluckVals[pIdx][tIdx]'
              @change='updatePluck(pIdx, tIdx)' />
          <div
              class='selectCol'
              v-for='(pitch, pitchIdx) in traj.pitches'
              :key='pitchIdx'>
            <select
                v-model='noteVals[pIdx][tIdx][pitchIdx].swara'
                @change='changePitch(pIdx, tIdx, pitchIdx)'>
              <option v-for='(sl, slIdx) in displaySargamLetters' :key='slIdx'>
                {{ sl }}
              </option>
            </select>
            <select
                v-model='noteVals[pIdx][tIdx][pitchIdx].oct'
                @change='changePitch(pIdx, tIdx, pitchIdx)'>
              <option v-for='(oct, octIdx) in octChoices' :key='octIdx'>
                {{oct}}
              </option>
            </select>
          </div>
        </div>
        <div class='editRow'>
          <button @click='handleInsert(pIdx, tIdx, "left")'>Insert Left</button>
          <button @click='handleInsert(pIdx, tIdx, "right")'>Insert Right</button>
        </div>
        <div class='editRow'>
          <button @click='handleInsert(pIdx, tIdx, "replace")'>Replace</button>
          <button @click='deleteTraj(pIdx, tIdx)'>Delete</button>
        </div>
      </div>
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
  // Raga,
} from '@/js/classes.js';

// import NewTrajectory from '@/components/NewTrajectory.vue';

export default {
  name: 'TrajectoryView',

  data() {
    return {
      piece: undefined,
      currentHover: undefined,
      octChoices: [2, 1, 0, -1, -2],
      noteVals: undefined,
      pluckVals: undefined,
      newTrajLoc: [0, 0]

    }
  },
  components: {
    // NewTrajectory
  },

  computed: {
    displaySargamLetters() {
      return [...this.piece.raga.sargamLetters].reverse()
    },

  },

  mounted() {
    this.piece = this.$parent.$refs.transcription.piece;
    this.setNoteVals();
    this.setPluckVals();



    this.emitter.on('trajHighlight', trajRef => {
      if (trajRef && trajRef === 'off') {
        if (this.trajRef) this.$refs[this.trajRef][0].style.backgroundColor = 'lightgrey';
        this.trajRef = undefined
      } else if (trajRef) {
        if (this.trajRef) this.$refs[this.trajRef][0].style.backgroundColor = 'lightgrey';
        this.trajRef = trajRef;
        this.$refs[this.trajRef][0].style.backgroundColor = 'white';
      } else {
        this.$refs[this.trajRef][0].style.backgroundColor = 'lightgrey';
        this.trajRef = undefined;
      }
      if (this.$refs[this.trajRef]) {
        const elem = this.$refs[this.trajRef][0];
        const main = this.$refs.main;
        const posLeft = elem.offsetLeft;
        const scrollLeft = main.scrollLeft;
        const posRight = elem.offsetLeft + elem.getBoundingClientRect().width;
        const scrollRight = main.scrollLeft + main.getBoundingClientRect().width;
        if (posLeft < scrollLeft) {
          this.$refs.main.scrollLeft = posLeft;
        } else if (posRight > scrollRight) {
          this.$refs.main.scrollLeft = posRight - main.getBoundingClientRect().width;
        }
      }
    })

    this.emitter.on('changedTimings', () => {
      this.$forceUpdate()
    }),

    this.emitter.on('newPiece', piece => {
      this.piece = piece
    })
    
    this.emitter.on('reDraw', () => {
      this.setNoteVals();
      this.setPluckVals();
      this.$forceUpdate();
    })
  },

  beforeUnmount() {
    this.emitter.off('newPiece')
    this.emitter.off('trajHighlight')
  },

  watch: {
    currentHover() {
      this.emitter.emit('trajHover', this.currentHover)
    }
  },


  methods: {
    
    handlePhraseDelete(pIdx) {
      this.piece.phrases = this.piece.phrases.filter((_, i) => i !== pIdx);
      this.piece.durArrayFromPhrases();
      this.piece.updateStartTimes();
      this.emitter.emit('reDraw', 'computedTrick')
      
    },
    
    handlePhraseInsert(pIdx, type) {
      const newPIdx = type === 'left'? Number(pIdx) : Number(pIdx) + 1;
      this.emitter.emit('newTrajObj', {
        pIdx: newPIdx,
        tIdx: undefined,
        type: 'newPhrase'
      })
      this.$parent.showNewTrajectory = true  
    },
    
    handleInsert(pIdx, tIdx, type) {
      let sendPIdx;
      let sendTIdx;
      if (type === 'left' || type === 'replace') {
        sendPIdx = Number(pIdx);
        sendTIdx = Number(tIdx);
      } else {      
        sendPIdx = Number(pIdx);
        sendTIdx = Number(tIdx) + 1;        
      }
      const obj = { pIdx: sendPIdx, tIdx: sendTIdx, type: type };
      this.emitter.emit('newTrajObj', obj);
      this.$parent.showNewTrajectory = true;
    },

    setNoteVals() {
      this.noteVals = this.piece.phrases.map(phrase => {
        return phrase.trajectories.map(traj => {
          return traj.pitches.map(p => {
            const swara = p.sargamLetter;
            const oct = p.oct;
            return {
              swara: swara,
              oct: oct
            }
          })
        })
      });
    },

    setPluckVals() {
      this.pluckVals = this.piece.phrases.map(phrase => {
        return phrase.trajectories.map(traj => {
          if (traj.articulations[0] && traj.articulations[0].name === 'pluck') {
            return true
          } else {
            return false
          }
        })
      });
    },

    deleteTraj(pIdx, tIdx) {
      const phrase = this.piece.phrases[pIdx];
      const newTrajs = phrase.trajectories.filter(traj => traj.num !== Number(tIdx));
      this.piece.phrases[pIdx].trajectories = newTrajs;
      this.piece.phrases[pIdx].durArrayFromTrajectories();
      this.piece.phrases[pIdx].assignStartTimes();
      this.piece.phrases[pIdx].assignTrajNums();
      this.piece.durArrayFromPhrases();
      this.piece.updateStartTimes();
      this.emitter.emit('deletedTraj')
      this.setNoteVals();
      this.setPluckVals();
      this.$forceUpdate();
    },

    getTimeString(traj, phrase) {
      const start = Math.round(phrase.startTime + traj.startTime);
      const end = Math.round(phrase.startTime + traj.startTime + traj.durTot);
      let startSecs = Math.round(start % 60);
      let endSecs = Math.round(end % 60);
      if (startSecs.toString().length === 1) startSecs = '0' + startSecs;
      if (endSecs.toString().length === 1) endSecs = '0' + endSecs;
      const startString = `${Math.floor(start / 60)}:${startSecs}`;
      const endString = `${Math.floor(end / 60)}:${endSecs}`;
      return `(${startString} - ${endString})`;
    },

    startHoverTraj(pIdx, tIdx) {
      this.currentHover = [pIdx, tIdx];
    },

    stopHoverTraj() {
      this.currentHover = undefined;
    },

    changePitch(pIdx, tIdx, pitchIdx) {
      const traj = this.piece.phrases[pIdx].trajectories[tIdx];
      const noteVal = this.noteVals[pIdx][tIdx][pitchIdx];
      const newPitches = traj.pitches.map((p, idx) => {
        return idx === pitchIdx ? new Pitch({
          swara: noteVal.swara,
          oct: Number(noteVal.oct),
          fundamental: this.piece.raga.fundamental
        }) : p;
      });
      const trajObj = traj.getSpawnObj();
      trajObj.pitches = newPitches;
      const newTraj = new Trajectory(trajObj);
      const phraseObj = this.piece.phrases[pIdx].getSpawnObj();
      phraseObj.trajectories[tIdx] = newTraj;
      const newPhrase = new Phrase(phraseObj);
      const pieceObj = this.piece.getSpawnObj();
      pieceObj.phrases[pIdx] = newPhrase;
      const newPiece = new Piece(pieceObj);
      this.piece = newPiece;
      this.emitter.emit('reDraw');
      this.$forceUpdate();
    },

    updatePluck(pIdx, tIdx) {
      const traj = this.piece.phrases[pIdx].trajectories[tIdx];
      const pluckVal = this.pluckVals[pIdx][tIdx];
      if (pluckVal) {
        traj.articulations[0] = new Articulation()
      } else {
        delete traj.articulations[0]
      }

      this.emitter.emit('reDraw')
    }




  }
}
</script>
<style scoped>
.main {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 250px;
  /* border: 1px solid black; */
  overflow: auto
}

.phraseRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  /* white-space: nowrap;  */
  /* width: 2000px; */
}

.phraseBox {
  border-right: 1px solid black;
  border-bottom: 1px solid black;
  border-top: 1px solid black;
  width: 1000%;
  /* padding: 5px; */
  /* width: 2000px; */
  /* overflow: scroll; */
  display: flex;
  flex-direction: column;
  /* white-space: nowrap; */
}

.trajRow {
  display: flex;
  flex-direction: row;
  /* min-width: 100%; */
  /* width: 100%; */
  height: 100%;
  /* justify-content: left; */
  /* align-items: flex-start; */
  /* flex-grow: auto */
  /* flex: 1 1 auto */
  /* border-bottom: 1px solid black; */
  /* padding-right: 50px; */
}

.trajBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  height: calc(100% - 10px);
  min-height: calc(100% - 10px);
  max-height: calc(100% - 10px);
  padding-left: 5px;
  padding-right: 5px;
  padding-top: 5px;
  padding-bottom: 5px;
  background-color: lightgrey;
  width: calc(100% - 10px)
}

.trajBox:not(#_0) {
  border-right: 1px solid black;
  width: calc(100% - 11px)
}

.trajBox:hover {
  background-color: white !important
}

.phraseRow {
  border-bottom: 1px solid black;
  height: 80px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.phraseLabelBox {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.phraseLabel {
  /* border-bottom: 1px solid black; */
  /* height: 50px; */
  /* display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center; */
  font-weight: bold;
  white-space: nowrap;
}

.trajLabel {
  font-weight: bold;
  display: flex;
  /* width: 200px; */
  /* min-width: 0; */
  /* min-width: 0; */
  /* display: inline-block; */
  /* flex-direction: row; */
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.editRow {
  /* width: 100%; */
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
  margin-top: 5px;
  /* margin-left: 5px; */
  /* flex: 1 1 auto; */
  /* padding-left: 5px; */
  /* padding-right: 5px; */

}

.name {
  white-space: nowrap
    /* height: 40px; */
}

select {
  margin-left: 5px;
  margin-right: 5px;
  width: 40px;
}

.pluckCheck {
  margin-left: 5px;
  margin-right: 5px;
}

button {
  margin-left: 5px;
  margin-right: 5px;
  white-space: nowrap;
}

button.delete { 
  width: 80px;
}

.selectCol {
  display: flex;
  flex-direction: column;
  width: 40px;
}

/* span {
  display: inline-block;
  width: 100%;
  min-width: 100%;
} */
</style>
