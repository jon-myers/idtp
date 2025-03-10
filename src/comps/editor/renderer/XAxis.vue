<template>
  <div class='xAxis' :style='dynamicStyle'>
    <svg ref='axSvg'></svg>

  </div>
</template>

<script lang='ts'>
import { 
  defineComponent, 
  ref, 
  computed, 
  PropType, 
  onMounted,
  watch
} from 'vue';
import * as d3 from 'd3';
import { getContrastingTextColor } from '@/ts/utils.ts';

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
    },
    axisColor: {
      type: String,
      required: true
    },
  },
  setup(props, { emit }) {
    const xAxisContainer = ref<HTMLDivElement | null>(null);
    const axSvg = ref<SVGSVGElement | null>(null);
    const regionStartPxl = ref<number | undefined>(undefined);
    const regionEndPxl = ref<number | undefined>(undefined);  
    
    
    const textColor = computed(() => getContrastingTextColor(props.axisColor));

    watch(() => props.axisColor, newColor => {
      if (axSvg.value) {
        const svg = d3.select(axSvg.value)
        svg
          .selectAll('rect')
          .attr('fill', newColor)
        svg
          .selectAll('text')
          .style('fill', textColor.value)
        svg
          .selectAll('.tick line')
          .attr('stroke', textColor.value)
      }
    })

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
    let integerTicks: number[] = [];
    for (let i = durInterval; i < maxVal; i += durInterval) {
      integerTicks.push(i);
    }

    const axis = ref(d3.axisTop(props.scale)
      .tickValues(integerTicks)
      .tickFormat(d => structuredTime(d as number))
      .tickPadding(5)
    );

    const resetAxis = () => {
      const scaleDomain = props.scale.domain();
      const maxVal = scaleDomain[1];
      const minInterTickPxls = 40;
      const durTot = props.scale.domain()[1];
      const durTotPxls = props.scale(durTot);
      const interval = durTotPxls / minInterTickPxls;
      const durInterval = Math.ceil(durTot / interval);
      integerTicks = [];
      for (let i = durInterval; i < maxVal; i += durInterval) {
        integerTicks.push(i);
      }
      axis.value = d3.axisTop(props.scale)
        .tickValues(integerTicks)
        .tickFormat(d => structuredTime(d as number))
        .tickPadding(5)

      const svg = d3.select(axSvg.value)
      svg.selectAll('*').remove();
      svg
        .attr('width', props.scaledWidth)
        .attr('height', props.height)
      svg.append('rect')
        .attr('width', props.scaledWidth)
        .attr('height', props.height)
        .attr('fill', props.axisColor)
        .on('mousedown', handleMouseDown)
        .on('mouseup', handleMouseUp)
        .on('mouseout', handleMouseUp)
      svg.append('g')
        .attr('transform', `translate(0, ${props.height})`)
        .call(axis.value)
        .selectAll('text')
        .style('fill', textColor.value)
        .style('pointer-events', 'none')
      svg.selectAll('.tick line')
        .style('stroke', textColor.value)
    }

    watch(() => props.scaledWidth, () => {
      if (axSvg.value) {
        d3.select(axSvg.value)
          .attr('width', props.scaledWidth)
        resetAxis();
      }
    });

    const dynamicStyle = computed(() => {
      return {
        '--scaledWidth': `${props.scaledWidth}px`,
        '--height': `${props.height}px`,
      }
    });

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      regionStartPxl.value = e.offsetX;
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (regionStartPxl.value === undefined) {
        return
      }
      if (e.offsetX < regionStartPxl.value) {
        regionEndPxl.value = regionStartPxl.value;
        regionStartPxl.value = e.offsetX;
      } else {
        regionEndPxl.value = e.offsetX;
      }
      emit('update:region', [regionStartPxl.value, regionEndPxl.value]);
      regionStartPxl.value = undefined;
      regionEndPxl.value = undefined;
    };

    onMounted(() => {
      // put the axis on the axSvg
      if (axSvg.value) {
        const svg = d3.select(axSvg.value)
          .attr('width', props.scaledWidth)
          .attr('height', props.height)
        svg.append('rect')
          .attr('width', props.scaledWidth)
          .attr('height', props.height)
          .attr('fill', props.axisColor)
          .on('mousedown', handleMouseDown)
          .on('mouseup', handleMouseUp)
          .on('mouseout', handleMouseUp)
        svg.append('g')
          .attr('transform', `translate(0, ${props.height})`)
          .call(axis.value)
          .selectAll('text')
          .style('fill', textColor.value)
          .style('pointer-events', 'none')
        svg.selectAll('.tick line')
          .attr('stroke', textColor.value)   
      }
    })

    return {
      xAxisContainer,
      dynamicStyle,
      axSvg,
      integerTicks,
      regionStartPxl,
      regionEndPxl
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
