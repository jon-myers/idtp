<template>
  <div class='yAxis' :style='dynamicStyle'>
    <svg ref='aySvg'></svg>
  </div>
</template>

<script lang='ts'>
import { defineComponent, ref, computed, PropType, onMounted } from 'vue';
import * as d3 from 'd3';
import { Raga } from '@/js/classes.ts';

export default defineComponent({
  name: 'YAxis',
  props: {
    scaledHeight: {
      type: Number,
      required: true
    },
    width: {
      type: Number,
      required: true
    },
    scale: {
      type: Function as PropType<d3.ScaleLinear<number, number>>,
      required: true
    },
    raga: {
      type: Object as PropType<Raga>,
      required: true
    },
    highOctOffset: {
      type: Number,
      required: true
    },
    lowOctOffset: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    const yAxisContainer = ref<HTMLDivElement | null>(null);
    const aySvg = ref<SVGSVGElement | null>(null);

    // const saFreq = props.raga.fundamental;
    // const logSaFreq = Math.log2(saFreq);

    


    const dynamicStyle = computed(() => {
      return {
        '--scaledHeight': `${props.scaledHeight}px`,
        '--width': `${props.width}px`
      }
    });

    const saFreq = props.raga.fundamental;
    const logSaFreq = Math.log2(saFreq);
    const logMax = logSaFreq + props.highOctOffset;
    const logMin = logSaFreq - props.lowOctOffset;
    const sargamFreqs = props.raga.getFrequencies({
      low: 2 ** logMin,
      high: 2 ** logMax
    });
    const ticks = sargamFreqs.map(freq => Math.log2(freq));
    const tickLabels = props.raga.getPitches({
      low: 2 ** logMin,
      high: 2 ** logMax
    }).map(p => p.octavedSargamLetter);
    console.log(ticks, tickLabels)

    const axis = ref(d3.axisLeft(props.scale)
      .tickValues(ticks)
      .tickFormat((d, i) => tickLabels[i])
      .tickPadding(5))

    onMounted(() => {
      if (aySvg.value) {
        console.log(axis.value)
        const svg = d3.select(aySvg.value)
          .attr('width', props.width)
          .attr('height', props.scaledHeight)
        svg.append('g')
          .attr('transform', `translate(${props.width}, 0)`)
          .call(axis.value)
          .selectAll('text')
          .style('fill', 'black')
      }
    })
    return {
      dynamicStyle,
      aySvg,
      yAxisContainer
    }
  }
})

</script>

<style scoped>

.yAxis {
  width: var(--width);
  height: var(--scaledHeight);
  background-color: #f0f0f0;
  overflow-y: hidden
}
</style>

