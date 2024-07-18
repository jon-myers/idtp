<template>
  <div class='xAxis' :style='dynamicStyle'>
    <svg ref='axSvg'></svg>

  </div>
</template>

<script lang='ts'>
import { defineComponent, ref, computed, PropType, onMounted } from 'vue';
import * as d3 from 'd3';

export default defineComponent({
  name: 'XAxis',
  props: {
    scaledWidth: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
    scale: {
      type: Function as PropType<d3.ScaleLinear<number, number>>,
      required: true
    }
  },
  setup(props) {
    const xAxisContainer = ref<HTMLDivElement | null>(null);
    const axSvg = ref<SVGSVGElement | null>(null);

    // select axSvg and set its width and height
    
    
    const scaleDomain = props.scale.domain();
    const maxVal = scaleDomain[1];
    const integerTicks = Array.from({ length: maxVal }, (_, i) => i);

    const axis = ref(d3.axisTop(props.scale)
      .tickValues(integerTicks)
      .tickSize(0)
      .tickPadding(5)
    );





    const dynamicStyle = computed(() => {
      return {
        '--scaledWidth': `${props.scaledWidth}px`,
        '--height': `${props.height}px`,
      }
    });

    onMounted(() => {
      // put the axis on the axSvg
      if (axSvg.value) {
        const svg = d3.select(axSvg.value)
          .attr('width', props.scaledWidth)
          .attr('height', props.height)
        svg.append('g')
          .attr('transform', `translate(0, ${props.height})`)
          .call(axis.value)
          .selectAll('text')
          .style('fill', 'black')
      }


    })







   



    return {
      xAxisContainer,
      dynamicStyle,
      axSvg,
    }
  }
})

</script>
<style scoped>

.xAxis {
  width: var(--scaledWidth);
  height: var(--height);
  background-color: #f0f0f0;
}

</style>