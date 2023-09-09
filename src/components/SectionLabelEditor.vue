<template>
  <div class='outerSecLabel'>
    {{`Section ${sectionNum}`  }}
  </div>
</template>

<script lang='ts'>

import { defineComponent, PropType } from 'vue';

export default defineComponent({
  name: 'SectionLabelEditor',
  data() {
    return {

    }
  },
  props: {
    sectionNum: {
      type: Number,
      required: true
    },
  }
})
</script>

<style scoped>

.outerSecLabel {
  background-color: red;
  box-sizing: border-box;
  width: 300px;
  min-width: 300px;
  border: 1px solid black;
  height: 100%;
  
}
</style>
