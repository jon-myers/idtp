<template>
<div class='outer'>
  <div class='controlsBox'>
    <div class='controlsRow'>
      <label class='big'>Hierarchical Depth</label>
      <select v-model='numLayers'>
        <option value='1'>1</option>
        <option value='2'>2</option>
        <option value='3'>3</option>
        <option value='4'>4</option>
      </select>
    </div>
    <div class='controlsRow' v-for='(n, i) in Number(numLayers)' :key='n'>
      <label>Layer {{ i }}</label>
      <div class='buttonCol'>
        <button 
          :disabled='layerCompounds[i] === 4' 
          @click='increaseCompounds(i)'
          >+</button>
        <button 
          :disabled='layerCompounds[i] === 1'
          @click='decreaseCompounds(i)'
          >-</button>
      </div>
      <select 
        v-for='k, kIdx in layerCompounds[i]' 
        v-model='pulseDivisions[i][kIdx]'
        >
        <option v-for='j in 8'>{{ j+1 }}</option>
      </select>
      
    </div>
    
  </div>
  <div class='controlsBox'>
    <div class='controlsRow'>
      <label>Tempo</label>
      <input type='number' min='20' max='300' step='1' v-model='tempo' />
      <input 
        type='range' 
        min='0' 
        max='1' 
        step='0.001' 
        v-model='tempoSlider'
        @input='updateTempo'
        />
    </div>
    <div class='controlsRow'>
      <label>Cycles</label>
      <input type='number' min='1' max='1000' step='1' v-model='cycles' />
    </div>
    <div class='controlsRow'>
      <label>Duration</label>
      {{ getDuration() }}
    </div>
    <div class='controlsRow'>
      <button @click='insertMeter'>Insert Meter</button>
    </div>
  </div>
</div>
</template>

<script lang='ts'>

import { Meter } from '@/js/meter.ts';
import { h } from 'vue';

type MeterControlsDataType = {
  numLayers: number,
  layerCompounds: number[],
  pulseDivisions: number[][],
  tempo: number,
  tempoSlider: number,
  minTempo: number,
  maxTempo: number,
  cycles: number,
  meter?: Meter
}

export default {
  name: 'MeterControls',
  data(): MeterControlsDataType {
    return {
      numLayers: 2,
      layerCompounds: [1, 1, 1, 1],
      pulseDivisions: [
        [4, 2, 2, 2],
        [4, 2, 2, 2],
        [4, 2, 2, 2],
        [4, 2, 2, 2]
      ],
      tempo: 60,
      tempoSlider: 0.5,
      minTempo: 20,
      maxTempo: 300,
      cycles: 1,
      meter: undefined
    }
  },
  props: ['height', 'playerHeight'],
  methods: {
    increaseCompounds(i: number) {
      this.layerCompounds[i]++
    },

    decreaseCompounds(i: number) {
      this.layerCompounds[i]--
    },

    updateTempo() {
      const logMin = Math.log(this.minTempo);
      const logMax = Math.log(this.maxTempo);
      const logTempo = logMin + (logMax - logMin) * this.tempoSlider;
      this.tempo = Math.round(Math.exp(logTempo));
    },

    sum(arr: number[]) {
      return arr.reduce((a, b) => a + b, 0);
    }, 

    getDuration() {
      const relDivs = this.pulseDivisions[0].slice(0, this.layerCompounds[0]);
      const pulsesPer = this.sum(relDivs);
      const dur = (this.cycles * (60 / this.tempo) * pulsesPer);
      return this.displayTime(dur)
    },

    displayTime(dur: number) {
      const hours = Math.floor(dur / 3600);
      let minutes: number | string = Math.floor((dur - hours * 3600) / 60);
      let seconds: number | string = Math.round(dur % 60);
      if (seconds.toString().length === 1) seconds = '0' + seconds;
      if (hours !== 0) {
        if (minutes.toString().length === 1) minutes = '0' + minutes;
        return ([hours, minutes, seconds]).join(':')
      } else {
        return minutes + ':' + seconds 
      }
    },

    insertMeter() {
      const startTime: number = this.$parent!.$parent!.currentTime;
      const hierarchy: (number | number[])[] = [];
      for (let i = 0; i < this.numLayers; i++) {
        if (this.layerCompounds[i] === 1) {
          hierarchy.push(this.pulseDivisions[i][0])
        } else {
          const layer = this.pulseDivisions[i].slice(0, this.layerCompounds[i]);
          hierarchy.push(layer)
        }
      }
      const meter = new Meter({
        hierarchy,
        startTime,
        tempo: this.tempo,
        repetitions: this.cycles,
      });
      this.$parent!.$parent!.piece.addMeter(meter);
      this.$parent!.$parent!.unsavedChanges = true;

    }
  },
}

</script>

<style scoped>
.outer {
  background-color: #202621;
  height: v-bind(height + 'px');
  position: absolute;
  right: 0px;
  bottom: v-bind(playerHeight + 'px');
  color: white;
  z-index: -1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.controlsRow {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  width: 250px;
  height: 40px;
}

label {
  width: 60px;
  min-width: 60px;
  margin-right: 10px;
  text-align: right;
}

.big {
  width: 150px;
}

select {
  height: 20px;
  margin-left: 5px;
}

.controlsBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
  /* margin: 10px; */
  width: 260px;
  height: 100%;
  border-right: 1px solid white
}

.buttonCol {
  display: flex;
  flex-direction: column;
  width: 30px;
}

.buttonCol > button {
  height: 17px;
  width: 25px;
}

button {
  cursor: pointer;
}

.buttonCol > button:disabled {
  cursor: auto;
}
/* input type number */
input[type=number] {
  width: 45px;
  max-width: 45px;
  min-width: 45px;
  cursor: pointer
}

input[type=range] {
  margin-left: 5px;
  margin-right: 5px;
  width: 100%;
  cursor: pointer
}

select {
  cursor: pointer
}

</style>