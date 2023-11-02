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
      const gainParam = props.gainNode.gain;
      const min = 2 ** -7;
      const max = 1;
      const scaled = min * (max / min) ** gain.value;
      gainParam.setValueAtTime(curGain, now());
      gainParam.linearRampToValueAtTime(scaled, now() + props.lag);
    };

    return {
      gain,
      now,
      updateGain
    };
  }
})
</script>