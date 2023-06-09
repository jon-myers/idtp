<template>
<div class='outer'>
  <div class='controlsBox'>
    <div class='controlsRow'>
      <label class='big'>Hierarchical Depth</label>
      <select 
        v-model='numLayers' 
        @change='updateMeter'
        >
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
        v-model.number='pulseDivisions[i][kIdx]'
        @change='updateMeter'
        >
        <option v-for='j in 8'>{{ j+1 }}</option>
      </select>
    </div>
  </div>
  <div class='controlsBox'>
    <div class='controlsRow'>
      <label>Tempo</label>
      <input 
        type='number' 
        min='20' 
        max='300' 
        step='1' 
        v-model='tempo'
        @input='updateMeter'
        />
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
      <input 
        type='number' 
        min='1' 
        max='1000' 
        step='1' 
        v-model='cycles'
        @input='updateMeter'
        />
    </div>
    <div class='controlsRow'>
      <label>Start</label>
      {{ getStartTime() }}
    </div>
    <div class='controlsRow'>
      <label>Duration</label>
      {{ getDuration() }}
    </div>
    <div class='controlsRow'>
      <button @click='insertMeter' v-if='!meterSelected'>
        Insert New Meter
      </button>
    </div>
  </div>
  <div class='controlsBox'>
    <div class='titleRow'>Layer Visibility</div>
    <div class='controlsRow'>
      <label>max: {{ maxLayer }}</label>
      <input 
        type='range' 
        min='0' 
        max='3' 
        step='1' 
        v-model.number='maxLayer' 
        @input='updateVisibility'/>
    </div>
  </div>
</div>
</template>

<script lang='ts'>

import { Meter } from '@/js/meter.ts';
import { h } from 'vue';

import { 
  selectAll as d3SelectAll,
  select as d3Select,
 } from 'd3';

type MeterControlsDataType = {
  numLayers: number,
  layerCompounds: number[],
  pulseDivisions: number[][],
  tempo: number,
  tempoSlider: number,
  minTempo: number,
  maxTempo: number,
  cycles: number,
  meter?: Meter,
  meterSelected: boolean,
  maxLayer: number,
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
      meter: undefined,
      meterSelected: false,
      maxLayer: 3,
    }
  },
  props: ['height', 'playerHeight'],
  methods: {
    increaseCompounds(i: number) {
      this.layerCompounds[i]++;
      this.updateMeter();
    },

    decreaseCompounds(i: number) {
      this.layerCompounds[i]--;
      this.updateMeter();
    },

    removeMeter() {
      const piece = this.$parent!.$parent!.piece;
      this.$parent!.$parent!.removeMeter(this.meter.uniqueId);
      const meterIdx = piece.meters.indexOf(this.meter!);
      if (meterIdx !== -1) {
        piece.meters.splice(meterIdx, 1);
        this.meterSelected = false;
      }
    },

    async updateMeter() {
      if (this.meter !== undefined) {
        const startTime = this.meter!.startTime;
        await this.removeMeter();
        this.insertMeter(undefined, startTime)
      }
    },

    updateVisibility() {
      for (let i = 1; i <= 4; i++) {
        const selects = d3SelectAll(`.layer_${i}`)
          .filter((d, idx: number, nodes) => { 
            return !d3Select(nodes[idx]).classed('overlay')
        })
          .style('opacity', this.maxLayer >= i ? 1 : 0)
      }
    },

    assignData() {
      if (this.meter === undefined) {
        throw new Error('Meter is undefined');
      }
      this.numLayers = this.meter.hierarchy.length;
      this.cycles = this.meter.repetitions;
      this.tempo = this.meter.tempo;
      const logTempoDiff = Math.log(this.maxTempo) - Math.log(this.minTempo);
      const logTempoOffset = Math.log(this.tempo) - Math.log(this.minTempo);
      this.tempoSlider = logTempoOffset / logTempoDiff;

      this.meter.hierarchy.map((layer, i) => {
        if (typeof layer === 'number') {
          this.layerCompounds[i] = 1;
          this.pulseDivisions[i][0] = layer;
        } else {
          this.layerCompounds[i] = layer.length;
          layer.map((div, j) => {
            this.pulseDivisions[i][j] = div;
          })
        }
      })
    },

    updateTempo() {
      const logMin = Math.log(this.minTempo);
      const logMax = Math.log(this.maxTempo);
      const logTempo = logMin + (logMax - logMin) * this.tempoSlider;
      this.tempo = Math.round(Math.exp(logTempo));
      this.updateMeter();
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

    getStartTime() {
      if (this.meter !== undefined) {
        return this.displayTime(this.meter.startTime);
      } else {
        const editor = this.$parent!.$parent!;
        return this.displayTime(editor.currentTime)
      }
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

    insertMeter(_, startTime_?: number) {
      const editor = this.$parent!.$parent!;
      const startTime = startTime_ !== undefined ? 
                        startTime_ : 
                        editor.currentTime;
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
      editor.piece.addMeter(meter);
      editor.unsavedChanges = true;
      editor.addMetricGrid(true);
      editor.selectedMeter = meter;
      this.meterSelected = true;
      editor.meterMode = true;
      editor.selectMeter(meter.allPulses[0].uniqueId)
      


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