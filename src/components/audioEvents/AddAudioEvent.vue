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
            <option v-for='i in 20' :key='i' :value='i-1'>{{i-1}}</option>
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
      :parentId='uniqueId'
      />
    
    <div class='closeWindow' @click='closeWindow'>
      <span class='close-x'></span>
    </div>
  
  </div>
</template>
<script lang='ts'>

import AddAudioFile from '@/components/audioEvents/AddAudioFile.vue';
import { 
  getEventTypes, 
  initializeAudioEvent, 
  cleanEmptyDoc, 
  saveAudioMetadata ,
  getAudioEvent,
} from '@/js/serverCalls.ts';

import { defineComponent } from 'vue';
 
const capFirst = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const structuredTime = (dur: number) => {
  const hours = String(Math.floor(dur / 3600));
  const minutes = leadingZeros(Math.floor((dur % 3600) / 60));
  const seconds = leadingZeros(dur % 60);
  return { hours: hours, minutes: minutes, seconds: seconds }
}

const leadingZeros = (int: number) => {
  if (int < 10) {
    return '0'+int
  } else {
    return String(int)
  }
}

type AddAudioEventDataType = {
  eventTypes?: string[],
  numRecordings: number,
  keyElems: number[],
  selectedRecording: number,
  leftIsDisabled: boolean,
  rightIsDisabled: boolean,
  selectedEventType: string,
  addEventTypeVisibility: boolean,
  uniqueId?: string,
  eventName?: string,
  audioEvent?: AudioEventType,
}

export type { AddAudioEventDataType, MusicianType }

type MusicianType = {
  instrument?: string,
  role?: 'Soloist' | 'Accompanist' | 'Percussionist' | 'Drone',
  gharana?: string
}

import type { RecObjType } from '@/components/audioEvents/AddAudioFile.vue';

type PSecType = {
  end: number,
  start: number
}

type RaagType = {
  end: number,
  start: number,
  'performance sections'?: {
    [key: string]: PSecType
  }
}

type RecType = {
  audioFileId: string,
  date: {
    day: number,
    month: string,
    year: number
  },
  duration: number,
  location: {
    city: string,
    country: string,
    continent: string
  },
  musicians: {
    [key: string]: MusicianType
  },
  octOffset: number,
  raags: {
    [key: string]: RaagType
  },
  saEstimate: number,
  saVerified: boolean,
  _id?: string,
  parentID?: string,
  parentTitle?: string,
  parentTrackNumber?: string,
  explicitPermissions?: {
    edit: string[],
    view: string[]
  },
  dateModified: string | Date,
}

type AudioEventType = {
  'event type': string,
  name: string,
  permissions: string,
  userID: string,
  _id: string,
  recordings: {
    [key: number]: RecType
  },
  visible?: boolean,
  explicitPermissions?: {
    edit: string[],
    view: string[]
  }
}

export type { AudioEventType, RecType, RaagType, PSecType }

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, function(char) {
    return char.toUpperCase();
  });
}

export default defineComponent({
  name: 'AddAudioEvent',
  
  data(): AddAudioEventDataType {
    return {
      eventTypes: undefined,
      numRecordings: 0,
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
  
  async beforeUnmount() {
    try {
      if (this.uniqueId !== undefined) {
        await cleanEmptyDoc(this.uniqueId)
      }      
    } catch (err) {
      console.log(err)
    }
  },

  
  async mounted() {
    if (this.extUniqueId === undefined) {
      if (this.userID === undefined) {
        throw new Error('this.userID is undefined')
      }
      const idObj = await initializeAudioEvent(this.userID);
      this.uniqueId = idObj.insertedId
    } else {
      this.uniqueId = this.extUniqueId
      this.audioEvent = await getAudioEvent(this.uniqueId)
      if (this.audioEvent === undefined) {
        throw new Error('Could not find audio event')
      } else {
        this.refillForm()
      }
      
      
      
      // here's where you auto fill everything from
    }
    
    this.eventTypes = await getEventTypes()
    await this.eventTypes.push('Other (specify)');  
  },
  
  
  components: {
    AddAudioFile
  },
  
  props: {
    extUniqueId: String,
    userID: {
      type: String,
    }
  },
  
  methods: {
    
    async closeWindow() {
      this.$emit('reset-parent')
      try {
        if (this.uniqueId) await cleanEmptyDoc(this.uniqueId)
      } catch (err) {
        console.log(err)
      }
      
    },
    
    incrementSelectedRecording() {
      this.selectedRecording = this.selectedRecording + 1
    },
    
    decrementSelectedRecording() {
      this.selectedRecording = this.selectedRecording - 1
    },
    
    makeAllRecsObj() {
      const recordings: { [key: number]: RecObjType } = {};
      for (let i = 0; i < this.numRecordings; i++) {
        const arr = this.$refs[`audioFile${i}`] as typeof AddAudioFile[];
        const addAF = arr[0];
        recordings[i] = addAF.makeRecordingObject()
      }
      return recordings
      //test this, then send it up to the cloud!!
    },
    
    makeUpdates() {
      // translate AllRecsObj into mongo update syntax
      const allRecsObj = this.makeAllRecsObj();
      const updates: {
        [key: string]: any
      } = {};
      Object.keys(allRecsObj).forEach(key => {
        const k = Number(key);
        updates[`recordings.${key}.musicians`] = allRecsObj[k]['musicians'];
        updates[`recordings.${key}.date`] = allRecsObj[k]['date'];
        updates[`recordings.${key}.location`] = allRecsObj[k]['location'];
        updates[`recordings.${key}.raags`] = allRecsObj[k]['raags'];
        updates[`recordings.${key}.octOffset`] = 0;
      });
      updates['name'] = this.eventName;
      updates['event type'] = this.selectedEventType
      return updates
    },

    makeAddedMusicians() {
      const addedMusicans: {
        "Initial Name": string,
        "Full Name": string,
        Instrument?: string,
        Gender?: 'M' | 'F',
        "Last Name": string,
        "First Name": string,
        "Middle Name": string,
      }[] = [];
      const audioFileRefs = Object.keys(this.$refs);
      audioFileRefs.forEach(afr => {
        const afComp = (this.$refs[afr] as typeof AddAudioFile[])[0];
        console.log(afr, afComp, afComp.newAddedMusicians);
        afComp.newAddedMusicians.forEach((mus: string, mIdx: number) => {
          if (mus !== undefined) {
            const capMus = capitalizeWords(mus);
            const splitName = capMus.split(' ');
            const obj: {
              "Initial Name": string,
              "Full Name": string,
              "Last Name": string,
              Instrument?: string,
              Gender?: 'M' | 'F',
              "First Name": string,
              "Middle Name": string,
            } = {
              'Initial Name': capMus,
              'Full Name': capMus,
              'Last Name': splitName.slice(-1)[0],
              'First Name': '',
              'Middle Name': '',
            };
            if (splitName.length >= 2) {
              obj['First Name'] = splitName[0];
            }
            if (splitName.length >= 3) {
              obj['Middle Name'] = splitName[1];
            }
            const inst = afComp.selectedInstruments[mIdx];
            if (inst !== undefined) {
              if (inst !== 'Other (specify)') {
                if (inst === 'Vocal (M)') {
                  obj.Instrument = 'Vocal';
                  obj.Gender = 'M';
                } else if (inst === 'Vocal (F)') {
                  obj.Instrument = 'Vocal';
                  obj.Gender = 'F';
                } else {
                  obj.Instrument = inst;
                }
              } else {
                obj.Instrument = afComp.newAddedInstruments[mIdx];
              }
            }
            addedMusicans.push(obj);
          }
        })
      });
      return addedMusicans
    },
    
    async saveMetadata() {
      console.log('saving')
      if (!this.uniqueId) {
        throw new Error('uniqueId is undefined')
      }
      const ups = this.makeUpdates();
      const muss = this.makeAddedMusicians();
      const saveMsg = await saveAudioMetadata(this.uniqueId, ups, muss)
      console.log(saveMsg)
    },
    
    refillForm() {
      if (this.audioEvent === undefined) {
        throw new Error('audioEvent is undefined')
      } 
      this.eventName = this.audioEvent.name;
      this.selectedEventType = this.audioEvent['event type'];
      this.numRecordings = Object.keys(this.audioEvent.recordings).length;
      this.$nextTick(() => {
        if (this.audioEvent === undefined) {
          throw new Error('audioEvent is undefined')
        }
        for (let i=0; i < this.numRecordings; i++) {
          const rec = this.audioEvent.recordings[i];
          const arr = this.$refs[`audioFile${i}`] as Array<typeof AddAudioFile>;
          const recElem = arr[0];
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
          const locKeys = Object.keys(rec.location) as Array<keyof typeof rec.location>;
          locKeys.forEach((placeType) => {
            recElem[`selected${capFirst(placeType)}`] = rec.location[placeType];
          });
          const dateKeys = Object.keys(rec.date) as Array<keyof typeof rec.date>;
          dateKeys.forEach(dateType => {
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
              if (pSecs === undefined) {
                throw new Error('pSecs is undefined')
              }
              raagElem.numSections = Object.keys(pSecs).length;
              this.$nextTick(() => {
                Object.keys(pSecs).forEach((pSecName, pIdx) => {
                  raagElem.selectedPSections[pIdx] = pSecName;
                  const pSec = pSecs[pSecName];
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
})
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
            linear-gradient(45deg, rgba(0,0,0,0) 0%,rgba(0,0,0,0) 43%,
              #fff 45%,#fff 55%,rgba(0,0,0,0) 57%,rgba(0,0,0,0) 100%),
            linear-gradient(135deg, rgba(0,0,0,0) 0%,rgba(0,0,0,0) 43%,
              #fff 45%,#fff 55%, rgba(0,0,0,0) 57%, rgba(0,0,0,0) 100%);
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
