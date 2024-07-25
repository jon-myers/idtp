<template>
  <div class='tranContainer' ref='tranContainer' :style='dynamicStyle'>
    <svg ref='tranSvg'></svg>
  </div>
</template>

<script lang='ts'>

import { 
  defineComponent, 
  ref, 
  onMounted, 
  watch, 
  computed,
  PropType
} from 'vue';
import * as d3 from 'd3';

import { Piece } from '@/js/classes.ts';

export default defineComponent({
  name: 'TranscriptionLayer',
  props: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
    showTranscription: {
      type: Boolean,
      required: true
    }, 
    xScale: {
      type: Function,
      required: true
    },
    yScale: {
      type: Function,
      required: true
    },
    piece: {
      type: Object as PropType<Piece>,
      required: true
    },
    lowOctOffset: {
      type: Number,
      required: true
    },
    highOctOffset: {
      type: Number,
      required: true
    },
    sargamLineColor: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const tranContainer = ref<HTMLDivElement | null>(null);
    const tranSvg = ref<SVGSVGElement | null>(null);

    const dynamicStyle = computed(() => {
      return {
        '--opacity': props.showTranscription ? 1 : 0,
        '--width': `${props.width}px`,
        '--height': `${props.height}px`
      }
    })
    const logMin = computed(() => {
      return Math.log2(props.piece.raga.fundamental) - props.lowOctOffset;
    })
    const logMax = computed(() => {
      return Math.log2(props.piece.raga.fundamental) + props.highOctOffset;
    })
    const sargamVals = computed(() => {
      return props.piece.raga.getFrequencies({
        low: 2 ** logMin.value,
        high: 2 ** logMax.value
      }).map(freq => Math.log2(freq))
    });
    const visPitches = computed(() => {
      return props.piece.raga.getPitches({
        low: 2 ** logMin.value,
        high: 2 ** logMax.value
      })
    });
    watch(() => props.sargamLineColor, () => {
      updateSargamLineColor();
    });
    watch(() => props.height, () => {
      if (tranSvg.value) {
        d3.select(tranSvg.value)
          .attr('height', props.height)
        updateSargamLineSpacing();
      }
    });
    watch(() => props.width, () => {
      if (tranSvg.value) {
        d3.select(tranSvg.value)
          .attr('width', props.width)
        updateSargamLineWidth();
      }
    });

    const updateSargamLineSpacing = () => {
      if (tranSvg.value) {
        d3.select(tranSvg.value)
          .selectAll('line')
          .data(sargamVals.value)
          .attr('y1', d => props.yScale(d))
          .attr('y2', d => props.yScale(d))
      }
    }

    const updateSargamLineWidth = () => {
      if (tranSvg.value) {
        d3.select(tranSvg.value)
          .selectAll('line')
          .attr('x2', props.width)
      }
    }

    const updateSargamLineColor = () => {
      if (tranSvg.value) {
        d3.select(tranSvg.value)
          .selectAll('line')
          .attr('stroke', props.sargamLineColor)
      }
    }

    const addSargamLines = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
      const saFilter = (logFreq: number) => {
        const logSa = Math.log2(props.piece.raga.fundamental);
        return (logFreq - logSa) % 1 === 0
      }
      const paFilter = (idx: number) => {
        return visPitches.value[idx].swara === 4
      };
      const strokeWidth = (s: number, idx: number) => {
        return saFilter(s) || paFilter(idx) ? 2 : 1
      }
      svg.selectAll('line')
        .data(sargamVals.value)
        .enter()
        .append('line')
        .attr('x1', 0)
        .attr('x2', props.width)
        .attr('y1', d => props.yScale(d))
        .attr('y2', d => props.yScale(d))
        .attr('stroke', 'grey')
        .attr('stroke-width', (d, i) => strokeWidth(d, i))
    }

    onMounted(() => {
      if (tranSvg.value) {
        const svg = d3.select(tranSvg.value);
        svg
          .attr('width', props.width)
          .attr('height', props.height)
        addSargamLines(svg);
      }
    })


    return { 
      dynamicStyle,
      tranContainer,
      tranSvg, 
    }
  }
})
</script>

<style scopred>
.tranContainer {
  opacity: var(--opacity);
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  width: var(--width);
  height: var(--height);
}
</style>