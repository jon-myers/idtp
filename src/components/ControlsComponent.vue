<template>
<div class='controls'>
  <div class='innerBox'>
    <div class='paramBox' v-if='transComp && transComp.piece && transComp.piece.audio_DB_ID'>
      <div class='param'>Spectrogram Opacity</div>
      <input
        type='range'
        class='opacity'
        v-model='opacity'
        id='opacity'
        @input='sendOpacity'
        min='0.0'
        max='1.0'
        step='0.05'
      >
    </div>
    <div class='paramBox shorter' v-if='transComp && transComp.piece'>
      <div class='buttons'>
        <button @click='reset'>Reset</button>
        <button @click='toggleAudio'>
          {{['Play', 'Pause'][Number(playing)]}}
        </button>
      </div>
    </div>
    <div class='paramBox taller'>
      <label v-if='transComp && transComp.piece && transComp.piece.audio_DB_ID'>Recording Vol</label>
      <input
        v-if='transComp && transComp.piece && transComp.piece.audio_DB_ID'
        type='range'
        class='slider'
        v-model='recordingVolume'
        @input='sendRecordingVolume'
        min='0.0'
        max='1.0'
        step='0.05'
      >
      <label>Synth Vol</label>
      <input
        type='range'
        class='slider'
        v-model='synthVolume'
        @input='sendSynthVolume'
        min='0.0'
        max='1.0'
        step='0.05'
      >
      <label>Damping</label>
      <input
        type='range'
        class='slider'
        v-model='damping'
        @input='sendDamping'
        min='0.0'
        max='1.0'
        step='0.05'
      >
    </div>
    <div class='paramBox'>
      <div class='viewRow'>
        <span>Note Data</span>
        <input
          type='checkbox'
          class='checkbox'
          v-model='noteDataChecked'
          @change='changeNoteData'
        />
      </div>
      <div class='viewRow'>
        <span>Trajectories</span>
        <input
          type='checkbox'
          class='checkbox'
          v-model='trajectoriesChecked'
          @change='changeTraj'
          step='0.01'
        />
      </div>
    </div>
    <div class='paramBox shorter'>
      <button @click='savePiece'>Save</button>
    </div>
    <div class='paramBox'>
      <label>Total Duration</label>
      <div class='inputRow'>
        <input
          class='numberBox'
          type='number'
          v-model='durTot'
          :min='audioDurTot'
          ref='audioNumber'
          @change='changeAudioNumber'/>
          <button @click='changeAudioNumber'>enter</button>
      </div>
    </div>
  </div>
  <TrajSelectPanel v-if='showTrajSelector'/>
</div>

</template>

<script>

import TrajSelectPanel from '@/components/TrajSelectPanel.vue';

export default {
  name: 'ControlsComponent',
  data() {
    return {
      opacity: '0',
      playing: false,
      noteDataChecked: false,
      trajectoriesChecked: true,
      durTot: undefined,
      audioDurTot: undefined,
      audioLoaded: false,
      recordingVolume: 0.0,
      synthVolume: 1.0,
      damping: 0.5,
      showTrajSelector: false,
    }
  },
  
  components: {
    TrajSelectPanel
  },

  mounted() {
    this.transComp = this.$parent.$refs.transcription;
    this.durTot = this.transComp.durTot;

    this.emitter.on('audioDurTot',adt => {
      this.audioDurTot = adt;
      this.audioLoaded = true
    })
    
    this.emitter.on('toggleTrajSel', trajSelBool => {
      this.showTrajSelector = trajSelBool
    })
    
    this.emitter.on('durTot', durTot => {
      this.durTot = durTot
    })
    
  },

  computed: {

  },

  methods: {

    submit() {
      console.log('submitted')
    },

    changeAudioNumber() {
      if (this.durTot < this.audioDurTot) {
        this.durTot = this.audioDurTot.toFixed(2)
      }
      this.transComp = this.$parent.$refs.transcription;
      this.$refs.audioNumber.value = this.durTot;
      this.transComp.durTot = this.durTot;
      this.emitter.emit('reDraw', 'computedTrick')
    },

    async getAudioElement(audioComp) {
      return audioComp.audioElement
    },

    savePiece() {
      this.emitter.emit('savePiece')
    }, 

    changeNoteData() {
      this.emitter.emit('showNoteData', this.noteDataChecked)
    },

    changeTraj() {
      this.emitter.emit('showTrajectories', this.trajectoriesChecked)
    },

    sendOpacity() {
      this.emitter.emit('opacity', this.opacity)
    },

    toggleAudio() {
      // order matters here! First emit should be before the playing state 
      // change; second emit should be after.
      this.emitter.emit('toggleAudio', this.playing);
      this.playing = !this.playing;
      this.emitter.emit('playing', this.playing);
    },

    reset() {
      this.emitter.emit('setTime', 0)
    },

    sendRecordingVolume() {
      this.emitter.emit('recordingVolume', this.recordingVolume)
    },

    sendSynthVolume() {
      this.emitter.emit('synthVolume', this.synthVolume)
    },
    
    sendDamping() {
      this.emitter.emit('damping', this.damping)
    }
  }
}
</script>

<style scoped>

.controls {
  display: flex;
  flex-direction: column;
  justify-content: top;
  align-items: center;
  /* overflow-y: auto;
  overflow-x: none; */
  width: 100%;
  /* height: 600px; */
}

.innerBox {
  height: 600px;
  overflow-y: auto;
  overflow-x: none;
  width: 100%;
}

.paramBox {
  width: 100%;
  height: 80px;
  border-bottom: 1px solid black;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.param {

}

.taller {
  height: 140px;
}

.shorter {
  height: 50px;
}

button {
  display: inline-block;
  width: fit-content
}

.buttons {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
}

.opacity {
  width: 100px;
}

.viewRow {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
}

.numberBox {
  width: 50px;
}

.slider {
  width: 100px;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
}

.inputRow {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
}

</style>
