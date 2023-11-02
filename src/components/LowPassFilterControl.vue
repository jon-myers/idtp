<template>
  <div class='outer'>
    <div class='box'>
      <label>Freq: {{ freq.toFixed() + ' hz.' }} </label>
      <input 
        type='range' 
        min='0' 
        max='1' 
        step='0.001' 
        v-model='freqSlider'
        @input='updateFreq'
        />
    </div>
    <div class='box'>
      <label>Q: {{ q.toFixed(2) }} </label>
      <input 
        type='range' 
        min='0' 
        max='1' 
        step='0.001' 
        v-model='qSlider'
        @input='updateQ'
        />
    </div>
  </div>
</template>

<script lang='ts'>
import { defineComponent } from 'vue';

type LowPassFilterControlDataType = {
  freqSlider: number,
  freq: number,
  qSlider: number,
  q: number,
}

export default defineComponent({
  data(): LowPassFilterControlDataType {
    return {
      freqSlider: 0.5,
      qSlider: 0.5,
      freq: 800,
      q: 1,
    }
  },
  props: {
    filterNode: {
      type: BiquadFilterNode,
      required: true
    },
    ac: {
      type: AudioContext,
      required: true
    },
    lag: {
      type: Number,
      required: true
    }
  },
  methods: {

    now() {
      return this.ac.currentTime;
    },

    updateFreq() {
      const min = 200;
      this.freq = min * 2 ** (this.freqSlider * 4);
      const curFreq = this.filterNode.frequency.value;
      const freqParam = this.filterNode.frequency;
      freqParam.setValueAtTime(curFreq, this.now());
      freqParam.exponentialRampToValueAtTime(this.freq, this.now() + this.lag);
    },

    updateQ() {
      const min = 0.001;
      const max = 1000;
      this.q = min * 2 ** (this.qSlider * Math.log2(max / min));
      const curQ = this.filterNode.Q.value;
      const qParam = this.filterNode.Q;
      qParam.setValueAtTime(curQ, this.now());
      qParam.linearRampToValueAtTime(this.q, this.now() + this.lag);
    }
  }
})
</script>
<style scoped>

.outer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  padding: 10px;
}

.box {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: top;
  align-items: center;
}

input[type=range] {
  appearance: slider-vertical;
  width: 30px;
  height: 110px;
}

label {
  min-height: 30px;
  font-size: 14px;
}
</style>