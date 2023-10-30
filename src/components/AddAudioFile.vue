<template>
  <div class='mainInner'>
    <div class='topRow'>
      <label>Select File:</label>
      <input type='file' ref='file'>
      <button 
        class='uploadButton' 
        @click='handleFileUpload' 
        v-if='uploadDone === processingDone'>
        Upload
      </button>
      <div class='progressContainer' v-if='!uploadDone'>
        <div class='progress'></div>
      </div>
      <label v-if='uploadDone && !processingDone'>Processing ...</label>
      <audio 
        controls 
        v-if='processingDone' 
        ref='audio' 
        @canplaythrough='loaded'>
        <source 
          :src='`https://swara.studio/audio/mp3/${audioFileId}.mp3`' 
          type='audio/mpeg'>
      </audio>
    </div>
    <div class='topRow'>
      <label>Number of Performers: </label>
      <select v-model='numPerformers' class='small'>
        <option v-for='(_, num) in Array.from({length: 6})' :key='num'>
          {{num+1}}
        </option>
      </select>
      <label v-if='audioLoaded'>duration: {{displayDuration}}</label>
    </div>
    <div class='topRow'>
      <label>Musician: </label>
      <div 
        class='inputCol' 
        v-for='(_, x) in Array.from({length: Number(numPerformers)})' 
        :key='x'>
        <select v-model='selectedMusicians[x]' @change='updateMusicians(x)'>
          <option v-for='name in allMusicians' :key='name'>{{name}}</option>
        </select>
        <input 
          type='text' 
          v-if='addMusicianVisibilty[x]' 
          v-model='newAddedMusicians[x]'>
      </div>
      
      
    </div>
    <div class='topRow'>
      <label>Instrument:</label>
      <div 
        class='inputCol' 
        v-for='(_, x) in Array.from({length: Number(numPerformers)})' 
        :key='x'>
        <select 
          v-model='selectedInstruments[x]' 
          @change='updateOtherInstruments(x)'>
          <option v-for='name in allInstruments' :key='name'>{{name}}</option>
        </select>
        <input 
          type='text' 
          v-if='addOtherInstrumentVisibility[x]' 
          v-model='newAddedInstruments[x]'>
      </div>  
    </div>
    
    <div class='topRow'>
      <label>Role: </label>
      <div 
        class='inputCol' 
        v-for='(_, x) in Array.from({length: Number(numPerformers)})' 
        :key='x'>
        <select v-model='selectedRoles[x]'>
          <option v-for='role in possibleRoles' :key='role'>{{role}}</option>
        </select>
      </div>
    </div>
    <div class='topRow'>
      <label>Gharana: </label>
      <div class='inputCol' v-for='(i, idx) in Number(numPerformers)' :key='i'>
        <span v-if='gharana[idx] !== null'>{{gharana[idx]}}</span>
        <input 
          type='text' 
          v-if='gharana[idx] === null' 
          v-model='newAddedGharanas[idx]'>
      </div>
    </div>
    <div class='topRow'>
      <label>Location: </label>
      <select v-model='selectedContinent' @change='undefineCities'>
        <option v-for='continent in getContinents' :key='continent'>
          {{continent}}
        </option>
      </select>
      <div class='inputCol'>
        <select v-model='selectedCountry' v-if='selectedContinent'>
          <option v-for='country in getCountries' :key='country'>
            {{country}}
          </option>
        </select>
        <input 
          type='text' 
          v-if='selectedCountry === "Other (specify)"'
          v-model='newAddedCountry'>
      </div>
      <div class='inputCol'>
        <select v-model='selectedCity' v-if='selectedCountry'>
          <option v-for='city in getCities' :key='city'>{{city}}</option>
        </select>
        <input 
          type='text' 
          v-if='selectedCity === "Other (specify)"'
          v-model='newAddedCity'>
      </div>
    </div>
    <div class='topRow'>
      <label>Date:</label>
      <select v-model='selectedYear' class='medium'>
        <option v-for='year in getYears' :key='year'>{{year}}</option>      
      </select>
      <select v-model='selectedMonth'>
        <option v-for='month in months' :key='month'>{{month}}</option>
      </select>
      <select v-model='selectedDay' class='small'>
        <option v-for='day in possibleDays' :key='day'>{{day}}</option>
      </select>
    </div>
    <div class='topRow last'>
      <label>Number of Raags:</label>
      <select v-model='numRaags'>
        <option v-for='i in 4' :key='i'>{{i}}</option>
      </select>
    </div>
    <div class='topRow big'>
      <label>Raag {{selectedRaag}}</label>
      <button :disabled='leftIsDisabled' @click='decrementSelectedRaag'>
        &lt;
      </button>
      <button :disabled='rightIsDisabled' @click='incrementSelectedRaag'>
        &gt;
      </button>
      <label class='normal'>Timings: </label>
      <div class='timingCol'>
        <div class='timingRow timings'>
          <label>start: </label>
          <input 
            type='text' 
            inputmode='numeric' 
            v-model='raagTimings[Number(selectedRaag)-1].start.hours'
            v-if='duration && duration >= 3600'
            maxlength='2'>
          <span v-if='duration && duration >= 3600'>:</span>
          <input 
            type='text' 
            inputmode='numeric'
            v-model='raagTimings[Number(selectedRaag)-1].start.minutes'
            @change='leadingZeros($event, selectedRaag, "start", "minutes")'
            maxlength='2'>
          <span>:</span>
          <input 
            type='text' 
            inputmode='numeric'
            v-model='raagTimings[Number(selectedRaag)-1].start.seconds'
            @change='leadingZeros($event, selectedRaag, "start", "seconds")'
            maxlength='2'>
        </div>
        <div class='timingRow timings'>
          <label>end: </label>
          <input 
            type='text' 
            inputmode='numeric' 
            v-model='raagTimings[Number(selectedRaag)-1].end.hours'
            v-if='duration && duration >= 3600'
            maxlength='2'>
          <span v-if='duration && duration >= 3600'>:</span>
          <input 
            type='text' 
            inputmode='numeric'
            v-model='raagTimings[Number(selectedRaag)-1].end.minutes'
            @change='leadingZeros($event, selectedRaag, "end", "minutes")'
            maxlength='2'>
          <span>:</span>
          <input 
            type='text' 
            inputmode='numeric'
            v-model='raagTimings[Number(selectedRaag)-1].end.seconds'
            @change='leadingZeros($event, selectedRaag, "end", "seconds")'
            maxlength='2'>
        </div>
      </div>
    </div>
    <AddRaag 
      v-for='raag in Number(numRaags)' 
      v-show='raag === selectedRaag' 
      :key='raag' 
      class='addRaag'
      :ref='`raag${raag-1}`'
      :parentDuration='duration'/>
  </div>
</template>
<script lang='ts'>

import { 
  getSortedMusicians, 
  getGharana, 
  getRagaNames, 
  getInstruments,
  getLocationObject,
  uploadFile
} from '@/js/serverCalls.ts';

import AddRaag from '@/components/AddRaag.vue';

import type { LocationType } from '@/js/serverCalls.ts';
import { AddAudioEventDataType, RaagType } from '@/components/AddAudioEvent.vue';
import type { AddRaagDataType } from '@/components/AddRaag.vue';

type RaagTimingType = {
  start: {
    hours: string,
    minutes: string,
    seconds: string
  },
  end: {
    hours: string,
    minutes: string,
    seconds: string
  }
}

type RecObjType = {
  musicians: {
    [key: string]: {
      instrument: string,
      role: string,
      gharana: string
    }
  },
  date: {
    year: string,
    month: string,
    day: string
  },
  location: {
    continent: string,
    country: string,
    city: string
  },
  raags: {
    [key: string]: RaagType
  }
}

export type { RecObjType };

type AddAudioFileDataType = {
  allMusicians?: string[];
  selectedMusician?: string;
  selectedMusicians: (string | undefined)[];
  selectedInstruments: (string | undefined)[];
  selectedRoles: (string | undefined)[];
  addMusicianVisibilty: boolean[];
  addOtherInstrumentVisibility: boolean[];
  newAddedMusicians: (string | undefined)[];
  newAddedInstruments: (string | undefined)[];
  gharana: (string | undefined)[];
  newAddedGharanas: (string | undefined)[];
  ragaNames?: string[];
  melodyInstruments?: string[];
  addMelodyInstrument: boolean;
  allInstruments?: string[];
  addInstrument: boolean;
  selectedSoloInstrument?: string;
  selectedCountry?: string;
  selectedCity?: string;
  location?: LocationType;
  selectedContinent?: string;
  addCountryVisibility: boolean;
  addCityVisibility: boolean;
  selectedYear?: string;
  selectedMonth?: string;
  selectedDay?: string;
  numPerformers: number;
  numRaags: number;
  progressPercent: number;
  progressWidth: number;
  selectedRaag: number;
  leftIsDisabled: boolean;
  rightIsDisabled: boolean;
  months: string[];
  possibleRoles: string[];
  audioFileId?: string;
  uploadDone: boolean;
  processingDone: boolean;
  duration?: number;
  audioLoaded: boolean;
  displayDuration?: string;
  raagTimings: RaagTimingType[];
  newAddedCountry?: string;
  newAddedCity?: string;
}

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, function(char) {
    return char.toUpperCase();
  });
}

export default {
  name: 'AddAudioFile',

  props: {
    parentId: {
      type: String,
      // required: true
    }
  },
  
  data(): AddAudioFileDataType {
    return {
      allMusicians: undefined,
      selectedMusician: undefined,
      selectedMusicians: Array(6).fill(undefined),
      selectedInstruments: Array(6).fill(undefined),
      selectedRoles: Array(6).fill(undefined),
      // addMusicianVisibility: false,
      addMusicianVisibilty: Array(6).fill(false),
      addOtherInstrumentVisibility: Array(6).fill(false),
      newAddedMusicians: Array(6).fill(undefined),
      newAddedInstruments: Array(6).fill(undefined),
      gharana: Array(6).fill(undefined),
      newAddedGharanas: Array(6).fill(undefined),
      ragaNames: undefined,
      melodyInstruments: undefined,
      addMelodyInstrument: false,
      allInstruments: undefined,
      addInstrument: false,
      selectedSoloInstrument: undefined,
      location: undefined,
      selectedContinent: undefined,
      selectedCountry: undefined,
      selectedCity: undefined,
      addCountryVisibility: false,
      addCityVisibility: false,
      selectedYear: undefined,
      selectedMonth: undefined,
      selectedDay: undefined,
      numPerformers: 1,
      numRaags: 1,
      progressPercent: 0,
      progressWidth: 0,
      selectedRaag: 1,
      leftIsDisabled: true,
      rightIsDisabled: true,
      months: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ], 
      possibleRoles: ['Soloist', 'Accompanist', 'Percussionist', 'Drone'],
      audioFileId: undefined,
      uploadDone: false,
      processingDone: false,
      duration: undefined,
      audioLoaded: false,
      displayDuration: undefined,
      raagTimings: [
        { 
          start: { hours: '00', minutes: '00', seconds: '00' },
          end: { hours: '00', minutes: '00', seconds: '00' }
        }, { 
          start: { hours: '00', minutes: '00', seconds: '00' },
          end: { hours: '00', minutes: '00', seconds: '00' }
        }, { 
          start: { hours: '00', minutes: '00', seconds: '00' },
          end: { hours: '00', minutes: '00', seconds: '00' }
        }, { 
          start: { hours: '00', minutes: '00', seconds: '00' },
          end: { hours: '00', minutes: '00', seconds: '00' }
        },
      ],
      newAddedCountry: undefined,
      newAddedCity: undefined
    }
  },
  
  components: {
    AddRaag
  },

  mounted() {
    getSortedMusicians()
      .then(result => {
        this.allMusicians = result;
        if (this.allMusicians === undefined) {
          throw new Error('Could not get musicians')
        } else {
          this.allMusicians.push('Unknown', 'Other (specify)')
        }
        
      })
  
    getRagaNames()
      .then(result => {
        this.ragaNames = result;
        this.ragaNames.push('Unknown', 'Other (specify)')
      })
  
    getInstruments(true)
      .then(result => {
        this.melodyInstruments = result;
        this.melodyInstruments.push('Unknown', 'Other (specify)')
      })
  
    getInstruments(false)
      .then(result => {
        this.allInstruments = result;
        this.allInstruments.push('Unknown', 'Other (specify)')
      })
  
    getLocationObject()
      .then(result => {
        this.location = result
      })
  
  
  },
  
  computed: {
  
    
    getCountries() {
      if (this.selectedContinent && this.location) {
        const countries = Object.keys(this.location[this.selectedContinent]);
        return countries.concat(['Unknown', 'Other (specify)'])
      } else {
        return ['Unknown', 'Other (specify)']
      }
    },
    
    getContinents() {
      return this.location ? Object.keys(this.location) : [];
    },
  
    getCities() {
      const sCont = this.selectedContinent;
      const loc = this.location;
      const sCoun = this.selectedCountry;
      if (sCont && loc && sCoun && loc[sCont][sCoun]) {
        const cities = loc[sCont][sCoun];
        return cities.concat(['Unknown', 'Other (specify)'])
      } else {
        return ['Unknown', 'Other (specify)']
      }
    },
  
    getYears() {
      const stop = (new Date()).getFullYear();
      const start = 1903;
      const len = { length: stop - start + 1 };
      const out: (string | number)[] = Array.from(len, (_, i) => start + i);
      out.push('Unknown')
      return out
    },
  
    possibleDays() {
      if (this.selectedMonth) {
        const monthNum = this.months.indexOf(this.selectedMonth) + 1
        return (new Date(Number(this.selectedYear), monthNum, 0)).getDate()
      } else {
        return 31
      }
      
    },
    
  
  },
  
  watch: {
    
    
    selectedSoloInstrument(newVal) {
      if (newVal === 'Other (specify)') {
        this.addMelodyInstrument = true
      } else {
        this.addMelodyInstrument = false
      }
    },
    
    numRaags(newVal) {
      this.rightIsDisabled = this.selectedRaag >= newVal;
      if (newVal < this.selectedRaag) {
        this.selectedRaag = 1
      }
    },
    
    selectedRaag(newVal) {
      this.rightIsDisabled = newVal >= this.numRaags;
      this.leftIsDisabled = newVal === 1
    },

    
  },
  
  methods: {
    
    leadingZeros(input: Event, 
                 secNum: number, 
                 position: 'start' | 'end', 
                 timeType: 'hours' | 'minutes' | 'seconds') {
      secNum = Number(secNum) - 1;
      const target = input.target as HTMLInputElement;
      if(!isNaN(Number(target.value)) && target.value.length === 1) {
        target.value = '0' + target.value;
      }
      if (target && Number(target.value) > 59) {
        target.value = '59'
      }
      this.raagTimings[secNum][position][timeType] = target.value
    },
    
    displayTime(dur: number) {
      const hours = Math.floor(dur / 3600);
      let minutes: string | number = Math.floor((dur - hours * 3600) / 60);
      let seconds: string | number = dur % 60;
      if (seconds.toString().length === 1) seconds = '0' + seconds;
      if (hours !== 0) {
        if (minutes.toString().length === 1) minutes = '0' + minutes;
        return ([hours, minutes, seconds]).join(':')
      } else {
        return minutes + ':' + seconds 
      }
    },
    
    loaded() {
      const audio = this.$refs.audio as HTMLAudioElement;
      this.duration = Math.round(audio.duration);
      this.audioLoaded = true;
      this.displayDuration = this.displayTime(this.duration);
    },
    
    incrementSelectedRaag() {
      this.selectedRaag = this.selectedRaag + 1
    },
    
    decrementSelectedRaag() {
      this.selectedRaag = this.selectedRaag - 1
    },
    
    onProgress(percent: number) {
      this.progressWidth = 150 * percent / 100;
      if (percent === 100) this.uploadDone = true
    },
    
    undefineCities() {
      this.selectedCountry = undefined;
      this.selectedCity = undefined;
    },
    
    updateMusicians(i: number) {
      if (this.selectedMusicians[i] === 'Other (specify)') {
        this.addMusicianVisibilty[i] = true;
        this.gharana[i] = undefined;
      } else {
        this.addMusicianVisibilty[i] = false;
        if (this.selectedMusicians[i] !== 'Unknown') {
          getGharana(this.selectedMusicians[i] as string)
            .then(result => this.gharana[i] = result)
        }
      }
      
    },
    
    updateOtherInstruments(i: number) {
      if (this.selectedInstruments[i] === 'Other (specify)') {
        this.addOtherInstrumentVisibility[i] = true
      } else{
        this.addOtherInstrumentVisibility[i] = false
      }
    },
    
    handleFileUpload() {
      const id = this.parentId;
      if (id === undefined) {
        throw new Error('no parentId')
      }
      const idx = Number(this.$.vnode.key) - 1;
      const fileElem = this.$refs.file as HTMLInputElement;
      if (fileElem.files === null) {
        throw new Error('No file selected!')
      }
      const file = fileElem.files[0];
      this.processingDone = false;
      this.uploadDone = false;
      this.progressWidth = 0;
      if (file.type.slice(0, 5) === 'audio') {
        uploadFile(file, this.onProgress, id, idx)
          .then(res => {
            this.audioFileId = res.data.audioFileId;
            this.processingDone = true;
            console.log(res.message)
          })
      } else {
        console.log('not an audio file!')
      }      
    },
    
    makeRaagObject() {
      const raagsObj: { [key: string]: RaagType } = {};
      for (let i = 0; i < this.numRaags; i++) {
        const arr = this.$refs[`raag${i}`] as typeof AddRaag;
        const elem = arr[0];
        const key = elem.selectedRaag === 'Other (specify)' ?
                    elem.newAddedRaag :
                    elem.selectedRaag ;
        const pSecs: { [key: string]: RaagType } = {};
        for (let j = 0; j < elem.numSections; j++) {
          const pSecName = elem.selectedPSections[j] === 'Other (specify)' ?
                           elem.newAddedPSections[j] :
                           elem.selectedPSections[j] ;
          pSecs[pSecName] = {
            start: this.getSeconds(elem.pSectionTimings[j].start),
            end: this.getSeconds(elem.pSectionTimings[j].end)
          }
        }       
        const obj = { 
          start: this.getSeconds(this.raagTimings[i].start),
          end: this.getSeconds(this.raagTimings[i].end),
          'performance sections': pSecs
        };
        raagsObj[key] = obj
      }
      return raagsObj
    },
    
    makeRecordingObject() {
      const recObj = {} as RecObjType;
      recObj.musicians = {}
      for (let i = 0; i < this.numPerformers; i++) {
        let key = this.selectedMusicians[i] === 'Other (specify)' ?
                    this.newAddedMusicians[i] :
                    this.selectedMusicians[i] ;
        key = capitalizeWords(key!);
        const inst = this.selectedInstruments[i] === 'Other (specify)' ?
                     this.newAddedInstruments[i] :
                     this.selectedInstruments[i] ;
        const gharana = this.gharana[i] === null ?
                        this.newAddedGharanas[i] :
                        this.gharana[i] ;
        console.log(this.gharana[i])
        console.log(key, inst, gharana, this.selectedRoles[i])
        recObj.musicians[key] = {
          instrument: inst,
          role: this.selectedRoles[i]!,
          gharana: gharana
        }
      }
      // if (this.selectedYear === undefined ||
      //     this.selectedMonth === undefined ||
      //     this.selectedDay === undefined) {
      //   throw new Error('Date is undefined!')
      // }
      recObj.date = {
        year: this.selectedYear,
        month: this.selectedMonth,
        day: this.selectedDay
      };
      const selectedCountry = this.selectedCountry === 'Other (specify)' ?
                              this.newAddedCountry :
                              this.selectedCountry ;
      const selectedCity = this.selectedCity === 'Other (specify)' ?
                           this.newAddedCity :
                           this.selectedCity ;
      // if (this.selectedContinent === undefined ||
      //     selectedCountry === undefined ||
      //     selectedCity === undefined) {
      //   throw new Error('Location is undefined!')
      // }
      recObj.location = {
        continent: this.selectedContinent,
        country: selectedCountry,
        city: selectedCity
      };
      recObj.raags = this.makeRaagObject();
      return recObj
    },
    
    getSeconds(obj: {hours: string, minutes: string, seconds: string}) {
      const hrs = Number(obj.hours) * 3600;
      const mins = Number(obj.minutes) * 60;
      const secs = Number(obj.seconds);
      return hrs + mins + secs
    }
  }
}
</script>

<style scoped>

.topRow {
  /* width: 400px; */
  height: 50px;
  display: flex;
  flex-direction: row;
  align-items: center;
  /* justify-content: center; */
  
  
}

.inputCol {
  width: 100px;
  min-width: 100px;
  height: 50px;
  display: flex;
  flex-direction: column;
  /* align-items: center; */
  justify-content: center;
  margin-right: 10px;
  
}

select {
  width: 100px;
  min-width: 100px;
  margin-right: 10px;
  background-color: #2f3830;
  color: white;
}

label {
  width: 120px;
  min-width: 100px;
  text-align: right;
  margin-right: 10px;
}

span {
  text-align: left;
}

.uploadButton {
  margin-left: 10px;
}

.progressContainer {
    width: 150px;
    height: 20px;
    background-color: white;
    border: 1px solid black;
    margin-left: 10px;
}

.progress {
  width: v-bind(progressWidth+'px');
  height: 20px;
  background-color: lightblue;
}

.big {
  font-size: 30px;
}

.big > label {
  width: 150px;
}

.big > button {
  width: 50px;
  margin: 5px;
}

.last {
  border-bottom: 1px solid grey
}

.addRaag {
  width: 100%;
  height: 100px;
  z-index: 1
}

.small {
  width: 40px !important;
  max-width: 40px !important;
  min-width: 40px !important;
}

.medium {
  width: 60px !important;
  max-width: 60px !important;
  min-width: 60px !important;
}

audio {
  margin-left: 10px;
}

.normal {
  font-size: 16px;
}

.timings {
  width: 140px;
  min-width: 140px;
  font-size: 16px;
}

.timings > input {
  width: 17px;
  
}
.timings > label {
  margin-right: 10px;
  width: 40px;
  min-width: 40px;
}
.timings > span {
  width: 8px;
  text-align: center
}

.timingRow {
  display: flex;
  flex-direction: row;
  width: 140px;
  min-width: 140px;
  max-width: 140px;
}

.timingCol {
  display: flex;
  flex-direction: column;
  width: 140px;
}

button {
  background-color: #2f3830;
  color: white;
}

input {
  background-color: #2f3830;
  color: white;
}

.mainInner {
  color: white;
}
</style>
