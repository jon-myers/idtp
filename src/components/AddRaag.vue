<template>
<div class='main'>
  <div class='inputRow'>
    <label>Raag:</label>
    <div class='inputCol'>
      <select v-model='selectedRaag'>
        <option v-for='raag in raags' :key='raag'>{{raag}}</option>
      </select>
      <input 
        type='text' 
        v-if='selectedRaag === "Other (specify)"'
        v-model='newAddedRaag'>
    </div>
    <label>Number of Sections: </label>
    <select class='small' v-model='numSections'>
      <option v-for='i in 6' :key='i'>{{i}}</option>
    </select>
  </div>
  <div class='inputRow'>
    <label>Performance Sections: </label>
    <div class='inputCol' v-for='sec in Number(numSections)' :key='sec'>
      <select v-model='selectedPSections[sec-1]' class='pSecs' @change='updatePerformanceSections(sec-1)'>
        <option v-for='pSec in performanceSections' :key='pSec'>{{pSec}}</option>
      </select>
      <input 
        type='text' 
        v-if='addPSectionVisibility[sec-1]' 
        v-model='newAddedPSections[sec-1]'>
    </div>
  </div>
  <div class='inputRow'>
    <label>Timings: </label>
    <div class='inputCol timings' v-for='(s, sec) in Number(numSections)' :key='s'>
      <div class='timingRow timings'>
        <label>start: </label>
        <input 
          type='text' 
          inputmode='numeric' 
          v-model='pSectionTimings[Number(sec)].start.hours'
          v-if='$parent.duration && $parent.duration >= 3600'
          maxlength='2'>
        <span v-if='$parent.duration && $parent.duration >= 3600'>:</span>
        <input 
          type='text' 
          inputmode='numeric'
          v-model='pSectionTimings[Number(sec)].start.minutes'
          @change='leadingZeros($event, Number(sec), "start", "minutes")'
          maxlength='2'>
        <span>:</span>
        <input 
          type='text' 
          inputmode='numeric'
          v-model='pSectionTimings[Number(sec)].start.seconds'
          @change='leadingZeros($event, Number(sec), "start", "seconds")'
          maxlength='2'>
      </div>
      <div class='timingRow timings'>
        <label>end: </label>
        <input 
          type='text' 
          inputmode='numeric'
          v-model='pSectionTimings[Number(sec)].end.hours'
          v-if='$parent.duration && $parent.duration >= 3600'
          maxlength='2'>
        <span v-if='$parent.duration && $parent.duration >= 3600'>:</span>
        <input 
          type='text' 
          inputmode='numeric'
          v-model='pSectionTimings[Number(sec)].end.minutes'
          @change='leadingZeros($event, Number(sec), "end", "minutes")'
          maxlength='2'><span>:</span>
        <input 
          type='text' 
          inputmode='numeric'
          v-model='pSectionTimings[Number(sec)].end.seconds'
          @change='leadingZeros($event, Number(sec), "end", "seconds")'
          maxlength='2'>
      </div>
    </div>
  </div>
</div>
</template>
<script>
import {
  getRagaNames,
  getPerformanceSections
} from '@/js/serverCalls.js';

export default {
  name: 'AddRaag',

  data() {
    return {
      raags: undefined,
      selectedRaag: undefined,
      performanceSections: undefined,
      selectedPSection: undefined,
      selectedPSections: [undefined, undefined, undefined, undefined, undefined, undefined],
      addPSectionVisibility: [false, false, false, false, false, false],
      numSections: 1,
      pSectionTimings: [{ 
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
        }, {
          start: { hours: '00', minutes: '00', seconds: '00' },
          end: { hours: '00', minutes: '00', seconds: '00' }
        }, {
          start: { hours: '00', minutes: '00', seconds: '00' },
          end: { hours: '00', minutes: '00', seconds: '00' }
        }
      ], 
      newAddedRaag: undefined,
      newAddedPSections: [undefined, undefined, undefined, undefined, undefined, undefined, undefined]
    }
  },

  async mounted() {

    this.raags = await getRagaNames()
    this.raags.push('Unknown', 'Other (specify)')
    this.performanceSections = await getPerformanceSections();
    this.performanceSections.push('Unknown', 'Other (specify)')

  },

  methods: {

    updatePerformanceSections(i) {
      if (this.selectedPSections[i] === 'Other (specify)') {
        this.addPSectionVisibility[i] = true
      } else {
        this.addPSectionVisibility[i] = false
      }
    },
    
    leadingZeros(input, secNum, position, timeType) {
      if(!isNaN(input.target.value) && input.target.value.length === 1) {
        input.target.value = '0' + input.target.value;
      }
      if (input.target.value > 59) {
        input.target.value = 59
      }
      this.pSectionTimings[secNum][position][timeType] = input.target.value
      
    }

  }
}
</script>

<style scoped>
label {
  width: 120px;
  text-align: right;
}

.inputRow {
  width: 100%;
  height: 50px;
  display: flex;
  flex-direction: row;
  align-items: center
}

select {
  margin-left: 10px;
  width: 120px;
}

.small {
  width: 40px;
}

.pSecs {
  width: 120px;
}

.inputCol {
  width: 140px;
  min-width: 140px;
  height: 50px;
  display: flex;
  flex-direction: column;
  /* align-items: center; */
  justify-content: center;

}

.inputCol>input {
  width: 112px;
  margin-left: 10px;
}

.timings {
  width: 140px;
  min-width: 140px;
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
}

.timingRow {
  display: flex;
  flex-direction: row;
  width: 140px;
  min-width: 140px;
  max-width: 140px;
}

select {
  background-color: #2f3830;
  color: white;
}

input {
  background-color: #2f3830;
  color: white;
}
</style>
