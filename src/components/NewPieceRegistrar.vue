<template>
  <div class="formContainer">
    <div class="formRow">
      <label>Title</label>
      <input v-model="title"/>
    </div>
    <div class="formRow">
      <label>Transcriber</label>
      <input v-model="transcriber"/>
    </div>
    <div class="formRow">
      <label>Raga</label>
      <input v-model="raga"/>
    </div>
    <div class='formRow'>
      <label>Recording</label>
      <select v-model='aeIdx'>
        <option 
          v-for='(ae, i) in allAudioEvents' 
          :key='ae.name'
          :value='i'>
          {{ae.name}}
        </option>
      </select>
      <select class='c2' v-model='recording' v-if='aeIdx >= 0'>
        <option 
          v-for='(recIdx, i) in Object.keys(allAudioEvents[aeIdx].recordings)'
          :key='i'
          :value='recIdx'
          >{{getShorthand(allAudioEvents[aeIdx].recordings[recIdx])}}</option>
      </select>
    </div>
    <div class='buttonRow'>
      <button @click="makeNewPiece">submit</button>
      <button @click="cancel">cancel</button>
    </div>
  </div>
  
</template>
<script>

import { getAllAudioEventMetadata } from '@/js/serverCalls.js';

export default {
  name: 'NewPieceRegistrar',
  data() {
    return {
      title: undefined,
      transcriber: undefined,
      raga: undefined,
      allAudioEvents: undefined,
      aeIdx: undefined,
      recording: undefined
    }
  },
  
  async mounted() {
    this.allAudioEvents = await getAllAudioEventMetadata();
  },
  
  watch: {
    aeIdx() {
      this.recording = undefined
    },
    
    recording(newVal) {
      if (newVal) {
        const ae = this.allAudioEvents[this.aeIdx];
        const raags = ae.recordings[newVal].raags;
        const keys = Object.keys(raags);
        if (keys.length === 1) {
          this.raga = keys[0]
        } else if (keys.length > 1) {
          this.raga = keys.filter(key => raags[key].start === 0)[0]
        }
        
      }
    }
  },
  
  methods: {
    
    makeNewPiece() {
      const newPieceInfo = {
        title: this.title,
        transcriber: this.transcriber,
        raga: this.raga,
      }
      if (this.aeIdx && this.recording) {
        const ae = this.allAudioEvents[this.aeIdx];
        newPieceInfo.audioID = ae.recordings[this.recording].audioFileId
      }
      this.emitter.emit('newPieceInfo', newPieceInfo);
      this.emitter.emit('closeModal');
    },
    
    cancel() {
      this.emitter.emit('closeModal')
    },
    
    getShorthand(rec) {
      const out = [];
      const raagNames = Object.keys(rec.raags);
      raagNames.forEach(rn => {
        out.push(rn, ' - ');
        const pSecs = Object.keys(rec.raags[rn]['performance sections']);
        pSecs.forEach((pSec, i) => {
          out.push(pSec, i !== pSecs.length - 1 ? ', ' : '; ');
        })
      })
      return out.join('')
    }
  }
}
</script>

<style scoped>

.formContainer {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
}

.formRow {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
}

label {
  /* padding-left: 20px;
  padding-right: 20px; */
  width: 100px;
  display: flex;
  flex-direction: row;
  justify-content: left;
  padding-left: 20px;
}

input {
  width: 200px;
}

button {
  width: 80px;
  height: 25px;
  cursor: pointer;
}

.buttonRow {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  width: 100%;
}

select {
  width: 208px;
}

.c2 {
  margin-left: 5px;
}


</style>
