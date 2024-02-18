<template>
</template>

<script lang='ts'>

import { defineComponent, PropType } from 'vue'

export default defineComponent({
  name: 'SarangiSynth',
  data() {
    return {
      freq: 400
    }
  },
  props: {
    ac: {
      type: Object as PropType<AudioContext>,
      required: true
    },
  },
  mounted() {
    this.del1 = this.ac.createDelay(1);
    this.del2 = this.ac.createDelay(1);

  }
})
</script>