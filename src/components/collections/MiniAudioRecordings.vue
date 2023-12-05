<template>
  <div class='miniARMain'>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue';
import type { RecType } from '@/components/audioEvents/AddAudioEvent.vue';
export default defineComponent({
  name: 'MiniAudioRecordings',
  props: {
    audioRecoridngs: {
      type: Array as PropType<RecType[]>,
      required: true
    }
  }
  
})
</script>
<style scoped>
</style>