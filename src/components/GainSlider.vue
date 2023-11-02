<template>
  <input 
    type='range' 
    min='0' 
    max='1' 
    step='0.01' 
    v-model='gain'
    @input='updateGain'
    />
</template>
<script lang='ts'>
import { defineComponent, ref, PropType } from 'vue';

type GainSliderDataType = {
  gain: number
}

export default defineComponent({
  name: 'GainSlider',
  props: {
    gainNode: {
      type: GainNode,
      required: true
    },
    lag: {
      type: Number,
      required: true,
    },
    ac: {
      type: AudioContext,
      required: true
    }
  },

  setup(props) {
    const gain = ref(0);

    const now = () => {
      return props.ac.currentTime;
    };

    const updateGain = () => {
      const curGain = props.gainNode.gain.value;
      // rest of your logic here
      const gainParam = props.gainNode.gain;
      gainParam.setValueAtTime(curGain, now());
      gainParam.linearRampToValueAtTime(gain.value, now() + props.lag);
    };

    return {
      gain,
      now,
      updateGain
    };
  }

  // data(): GainSliderDataType {
  //   return {
  //     gain: 0
  //   }
  // },

  // methods: {

  //   now() {
  //     return this.ac.currentTime;
  //   },

  //   updateGain() {
  //     const curGain = this.gainNode.gain.value;
  //     const gainParam = this.gainNode.gain;
  //     gainParam.setValueAtTime(curGain, this.now());
  //     gainParam.linearRampToValueAtTime(this.gain, this.now() + this.lag);

  //   }
  // }
})
</script>