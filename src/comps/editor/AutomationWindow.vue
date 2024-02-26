<!-- :style='{ 
      top: y + "px", 
      left: x + "px",
      width: width + "px",
      height: height + "px" 
      }' -->

<template>
  <div 
    class='autoWindow'

    
    >
  </div>
</template>

<script lang='ts'>
import { defineComponent, PropType } from 'vue';
import { Automation, Trajectory } from '@/js/classes.ts';

type AutomationWindowDataType = {
  width: number,
  height: number,
}

export default defineComponent({
  name: 'AutomationWindow',
  data(): AutomationWindowDataType {
    return {
      width: 300,
      height: 200,
    }
  },
  props: {
    trajectories: {
      type: Array as PropType<Trajectory[]>,
      required: true
    },
    x: {
      type: Number,
      required: true
    },
    y: {
      type: Number,
      required: true
    },
  },
  methods: {

  }
})

</script>

<style scoped>

.autoWindow {
  position: absolute;
  background-color: white;
  border: 1px solid black;
  box-sizing: border-box;
  width: v-bind(width + 'px');
  height: v-bind(height + 'px');
  top: v-bind(y + 'px');
  left: v-bind(x + 'px');
  z-index: 1
}
</style>
