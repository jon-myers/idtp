<template>
  <div class='maint'>
    <div class='audioEventInputs'>
      <div class='inputPairCol'>
        <div class='inputPair'>
          <label>Event Name: </label><input type='text' v-model='eventName'>
        </div>
        <div class='inputPair'>
          <label>Event Type: </label>
          <div class='eventTypeCol'>
            <select v-model='selectedEventType'>
              <option v-for='option in eventTypes' :key='option'>
                {{option}}
              </option>
            </select>
            <input type='text' v-if='addEventTypeVisibility'>
          </div>
        </div>
      </div>
      <div class='inputPairCol two'>
        <div class='inputPair'>
          <label class='recLabel'>Recordings: </label>
          <select class='recSelect' v-model='numRecordings'>
            <option v-for='i in 20' :key='i'>{{i}}</option>
          </select>
        </div>
        <button @click='saveMetadata'>Save</button>
      </div>
    </div>
    <div class='inputPair three'>
      <label class='big'>Recording {{selectedRecording}}</label>
      <button :disabled='leftIsDisabled' @click='decrementSelectedRecording'>
        &lt;
      </button>
      <button :disabled='rightIsDisabled' @click='incrementSelectedRecording'>
        &gt;
      </button>
    </div>
    <AddAudioFile 
      v-for='(recording, idx) in Number(numRecordings)' 
      :key='recording'
      v-show='selectedRecording === recording'
      :ref='`audioFile${idx}`'
      />
    
    <div class='closeWindow' @click='closeWindow'>
      <span class='close-x'></span>
    </div>
  
  </div>
</template>
<script>

import AddAudioFile from '@/components/AddAudioFile.vue';
import { 
  getEventTypes, 
  initializeAudioEvent, 
  cleanEmptyDoc, 
  saveAudioMetadata ,
  getAudioEvent,
} from '@/js/serverCalls.js';

const capFirst = string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const structuredTime = dur => {
  const hours = String(Math.floor(dur / 3600));
  const minutes = leadingZeros(Math.floor((dur % 3600) / 60));
  const seconds = leadingZeros(dur % 60);
  return { hours: hours, minutes: minutes, seconds: seconds }
}

const leadingZeros = int => {
  if (int < 10) {
    return '0'+int
  } else {
    return String(int)
  }
}

export default {
  name: 'AddAudioEvent',
  
  data() {
    return {
      eventTypes: undefined,
      numRecordings: 1,
      keyElems: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      selectedRecording: 1,
      leftIsDisabled: true,
      rightIsDisabled: true,
      selectedEventType: 'Unknown',
      addEventTypeVisibility: false,
      uniqueId: undefined,
      eventName: undefined,
      audioEvent: undefined,
    }
  },
  
  watch: {
    numRecordings(newVal) {
      if (this.selectedRecording < newVal) {
        this.rightIsDisabled = false
      } else {
        this.rightIsDisabled = true
      }
    },
  
    selectedRecording(newVal) {
      this.rightIsDisabled = newVal >= this.numRecordings
      if (newVal > 1) {
        this.leftIsDisabled = false
      } else {
        this.leftIsDisabled = true
      }
    },
  
    selectedEventType(newVal) {
      this.addEventTypeVisibility = newVal === 'Other (specify)'
    }
  },
  
  beforeUnmount() {
    cleanEmptyDoc(this.uniqueId)
  },
  
  async mounted() {
    if (this.extUniqueId === undefined) {
      const idObj = await initializeAudioEvent();
      this.uniqueId = idObj.insertedId
    } else {
      this.uniqueId = this.extUniqueId
      this.audioEvent = await getAudioEvent(this.uniqueId)
      
      this.refillForm()
      
      // here's where you auto fill everything from
    }
    
    this.eventTypes = await getEventTypes()
    await this.eventTypes.push('Other (specify)');  
  },
  
  
  components: {
    AddAudioFile
  },
  
  props: ['extUniqueId'],
  
  methods: {
    
    closeWindow() {
      this.$parent.showAddEvent = false;
      this.$parent.editingId = undefined;
      cleanEmptyDoc(this.uniqueId)
    },
    
    incrementSelectedRecording() {
      this.selectedRecording = this.selectedRecording + 1
    },
    
    decrementSelectedRecording() {
      this.selectedRecording = this.selectedRecording - 1
    },
    
    makeAllRecsObj() {
      const recordings = {};
      for (let i = 0; i < this.numRecordings; i++) {
        recordings[i] = this.$refs[`audioFile${i}`][0].makeRecordingObject()
      }
      return recordings
      //test this, then send it up to the cloud!!
    },
    
    makeUpdates() {
      // translate AllRecsObj into mongo update syntax
      const allRecsObj = this.makeAllRecsObj();
      const updates = {};
      Object.keys(allRecsObj).forEach(key => {
        updates[`recordings.${key}.musicians`] = allRecsObj[key]['musicians'];
        updates[`recordings.${key}.date`] = allRecsObj[key]['date'];
        updates[`recordings.${key}.location`] = allRecsObj[key]['location'];
        updates[`recordings.${key}.raags`] = allRecsObj[key]['raags'];
        updates[`recordings.${key}.octOffset`] = 0;
      });
      updates['name'] = this.eventName;
      updates['event type'] = this.selectedEventType
      return updates
    }, 
    
    async saveMetadata() {
      console.log('saving')
      const saveMsg = await saveAudioMetadata(this.uniqueId, this.makeUpdates())
      console.log(saveMsg)
    },
    
    refillForm() {
      this.eventName = this.audioEvent.name;
      this.selectedEventType = this.audioEvent['event type'];
      this.numRecordings = Object.keys(this.audioEvent.recordings).length;
      this.$nextTick(() => {
        for (let i=0; i < this.numRecordings; i++) {
          const rec = this.audioEvent.recordings[i];
          const recElem = this.$refs[`audioFile${i}`][0];
          recElem.audioFileId = rec.audioFileId;
          recElem.uploadDone = true;
          recElem.processingDone = true;
          recElem.numPerformers = Object.keys(rec.musicians).length;
          
          Object.keys(rec.musicians).forEach((name, idx) => {
            const musician = rec.musicians[name]
            recElem.selectedMusicians[idx] = name;
            recElem.selectedInstruments[idx] = musician.instrument;
            recElem.gharana[idx] = musician.gharana;
            recElem.selectedRoles[idx] = musician.role;
          });
          Object.keys(rec.location).forEach(placeType => {
            recElem[`selected${capFirst(placeType)}`] = rec.location[placeType]
          });
          Object.keys(rec.date).forEach(dateType => {
            recElem[`selected${capFirst(dateType)}`] = rec.date[dateType]
          });
          recElem.numRaags = Object.keys(rec.raags).length;
          this.$nextTick(() => {
            Object.keys(rec.raags).forEach((raagName, idx) => {
              const raag = rec.raags[raagName];
              const raagString = `raag${idx}`;
              recElem.raagTimings[idx].start = structuredTime(raag.start);
              recElem.raagTimings[idx].end = structuredTime(raag.end);
              
              const raagElem = recElem.$refs[raagString][0];
              raagElem.selectedRaag = raagName;
              const pSecs = raag['performance sections'];
              raagElem.numSections = Object.keys(pSecs).length;
              this.$nextTick(() => {
                Object.keys(pSecs).forEach((pSecName, pIdx) => {
                  raagElem.selectedPSections[pIdx] = pSecName;
                  const pSec = raag['performance sections'][pSecName];
                  const start = structuredTime(pSec.start);
                  const end = structuredTime(pSec.end);
                  raagElem.pSectionTimings[pIdx].start = start;
                  raagElem.pSectionTimings[pIdx].end = end;
                })
              })
            })
          })
        }
      })
    }
  }
}
</script>

<style scoped>

.maint {
  background-color: #202621;
  border: 1px solid white;
  z-index: 2;
  color: white
}

.closeWindow {
  position: absolute;
  width: 30px;
  height: 30px;
  background-color: black;
  right: 0;
  top: 0;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.close-x {
        display: inline-block;
        width: 20px;
        height: 20px;
        /* border: 7px solid #f56b00; */
        background:
            linear-gradient(45deg, rgba(0,0,0,0) 0%,rgba(0,0,0,0) 43%,#fff 45%,#fff 55%,rgba(0,0,0,0) 57%,rgba(0,0,0,0) 100%),
            linear-gradient(135deg, rgba(0,0,0,0) 0%,rgba(0,0,0,0) 43%,#fff 45%,#fff 55%, rgba(0,0,0,0) 57%, rgba(0,0,0,0) 100%);
}

.audioEventInputs {
  width: 100%;
  height: 100px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  border-bottom: 1px solid grey;
}

.inputPairCol {
  width: 350px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
}

.two {
  width: 200px
}

.inputPair {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left
}

.three {
  width: 350px;
  max-width: 350px;
  height: 50px;
  font-size: 30px;
  justify-content: space-evenly;
}



.recSelect {
  width: 50px;
}



label {
  padding-right: 5px;
  width: 120px;
  text-align: right
}

.big {
  width: 200px;
}

input {
  width: 194px;
}

select {
  width: 200px;
  background-color: #2f3830;
  color: white;
}

button {
  width: 50px;
  background-color: #2f3830;
  color: white;
}

input {
  background-color: #2f3830;
  color: white;
}

.eventTypeCol {
  display: flex;
  flex-direction: column;
  width: 200px;
  height: 100%;
}

input[type=file]::file-selector-button {
  background-color: #2f3830;
  color: white;
}

</style>
