<template>
<div class='amplitudeMeter'>
  <div class='barLabel' ref='barLabel'>{{ db.toFixed(1) + ' dB' }}</div>
  <div class='amplitudeMeterBarContainer'>
    <div class='amplitudeMeterBar'>
    </div>
    
  </div>
</div>

</template>
<script lang='ts'>
import { defineComponent, ref, PropType } from 'vue';

type AmplitudeMeterDataType = {
  barHeight: number,
  animationFrameId?: number,
  db: number,
  labelHeight: number,
}

export default defineComponent({
  props: {
    analyserNode: {
      type: AnalyserNode,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
  },

  data(): AmplitudeMeterDataType {
    return {
      animationFrameId: undefined,
      barHeight: 50,
      db: 0,
      labelHeight: 20,
    }
  },

  mounted() {
    this.animationFrameId = requestAnimationFrame(this.updateBarHeight);
  },

  methods: {

    currentMaxAmp() {
      const floatArr = new Float32Array(this.analyserNode.fftSize);
      this.analyserNode.getFloatTimeDomainData(floatArr);
      const min = Math.log(2 ** -7);
      const maxAmp = Math.max(...floatArr);
      const maxLogAmp = Math.log(maxAmp);
      //get decibels
      this.db = 20 * Math.log10(maxAmp / 1);
      const barLabel = this.$refs.barLabel as HTMLElement;
      if (this.db > 0) {
        if (!barLabel.classList.contains('red')) {
          barLabel.classList.add('red');
        }
      } else {
        if (barLabel.classList.contains('red')) {
          barLabel.classList.remove('red');
        }
      }
      // scaled from 0 to 1
      const scaled = (maxLogAmp - min) / (0 - min);
      return scaled;
    },

    updateBarHeight() {
      let maxAmp = this.currentMaxAmp();
      if (maxAmp > 1) {
        maxAmp = 1;
      }
      this.barHeight = maxAmp * (this.height - this.labelHeight);
      this.animationFrameId = requestAnimationFrame(this.updateBarHeight);
    }
  }
})
</script>
<style scoped>
.amplitudeMeter {
  width: 50px;
  height: v-bind(height + 'px');
  background-color: #000;
  border: 1px solid #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;

}

.amplitudeMeterBar {
  width: 100%;
  height: v-bind(barHeight + 'px');
  min-height: v-bind(barHeight + 'px');
  background-color: green;
}

.barLabel {
  color: #fff;
  font-size: 10px;
  height: v-bind(labelHeight + 'px');
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-bottom: 1px solid #fff;
  box-sizing: border-box;
  
}

.barLabel.red {
  background-color: red;

}

.amplitudeMeterBarContainer {
  width: 100%;
  height: v-bind(height - labelHeight + 'px');
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}
</style>