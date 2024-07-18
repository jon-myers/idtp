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

    const leadingZeros = (int: number) => {
      if (int < 10) {
        return '0' + int
      } else {
        return String(int)
      }
    }
    const structuredTime = (dur: number) => {
      const hours = String(Math.floor(dur / 3600));
      let minutes = Math.floor((dur % 3600) / 60);
      const seconds = leadingZeros(dur % 60);
      if (Number(hours) > 0) {
        return `${hours}:${leadingZeros(minutes)}:${seconds}`
      } else {
        return `${String(minutes)}:${seconds}`
      }
    };
    
    const scaleDomain = props.scale.domain();
    const maxVal = scaleDomain[1];
    const minInterTickPxls = 40;
    const durTot = props.scale.domain()[1];
    const durTotPxls = props.scale(durTot);
    const interval = durTotPxls / minInterTickPxls;
    const durInterval = Math.ceil(durTot / interval);
    const integerTicks: number[] = [];
    for (let i = durInterval; i < maxVal; i += durInterval) {
      integerTicks.push(i);
    }

    const axis = ref(d3.axisTop(props.scale)
      .tickValues(integerTicks)
      .tickFormat(d => structuredTime(d as number))
      // .tickSize(0)
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