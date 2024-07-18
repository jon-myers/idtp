<template>
  <div class='renderMain' ref='renderMain' :style='cssVars'>
    <div class='wrapper'>
      <div class='xAxisContainer' ref='xAxisContainer'>
        <XAxis
          v-if='xScale !== null'
          :scaledWidth='scaledWidth'
          :height='xAxHeight'
          :scale='xScale'
          ref='xAxis'/>
      </div>
      <div class='yAxisContainer' ref='yAxisContainer'>
        <YAxis
          v-if='yScale !== null'
          :scaledHeight='scaledHeight'
          :width='yAxWidth'
          :scale='yScale'
          :raga='piece.raga'
          :highOctOffset='highOctOffset'
          :lowOctOffset='lowOctOffset'
          ref='yAxis'/>
        <!-- <div class='yAxis'></div> -->
      </div>
      <div 
        class='scrollingContainer' 
        ref='scrollingContainer'
        >
        <div class='layersContainer' ref='layersContainer'>
          <SpectrogramLayer
            :width='scaledWidth'
            :height='scaledHeight'
            ref='spectrogramLayer'
            />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang='ts'>
import { 
  defineComponent, 
  ref, 
  onMounted, 
  watch, 
  PropType,
  computed,
} from 'vue';

import SpectrogramLayer from '@/comps/editor/renderer/SpectrogramLayer.vue';
import XAxis from '@/comps/editor/renderer/XAxis.vue';
import YAxis from '@/comps/editor/renderer/YAxis.vue';
import { Piece } from '@/js/classes.ts';
import * as d3 from 'd3';


export default defineComponent({
  name: 'Renderer',
  components: {
    SpectrogramLayer,
    XAxis,
    YAxis,
  },
  // computed: {
  //   cssVars() {
  //     return {
  //       '--yAxWidth': `${this.yAxWidth}px`,
  //       '--xAxHeight': `${this.xAxHeight}px`,
  //       '--scaledWidth': `${this.scaledWidth}px`,
  //       '--scaledHeight': `${this.scaledHeight}px`,
  //       '--scrollBarWidth': `${this.scrollBarWidth}px`,
  //       '--scrollBarHeight': `${this.scrollBarHeight}px`,
  //     };
  //   }
  // },
  props: {
    yAxWidth: {
      type: Number,
      required: true,
    },
    xAxHeight: {
      type: Number,
      required: true,
    },
    scaledWidth: {
      type: Number as PropType<number>,
      required: true,
      validator: (value: number) => Number.isInteger(value)
    },
    scaledHeight: {
      type: Number as PropType<number>,
      required: true,
      validator: (value: number) => Number.isInteger(value)
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
    }
  },
  setup(props, { emit }) {
    const layersContainer = ref<HTMLDivElement | null>(null);
    const xAxisContainer = ref<HTMLDivElement | null>(null);
    const yAxisContainer = ref<HTMLDivElement | null>(null);
    const scrollingContainer = ref<HTMLDivElement | null>(null);
    const scrollBarWidth = ref(10);
    const scrollBarHeight = ref(10);
    const xScale = ref<d3.ScaleLinear<number, number> | null>(null);
    const yScale = ref<d3.ScaleLinear<number, number> | null>(null);
    let isXScrolling = false;
    let isYScrolling = false;

    const cssVars = computed(() => ({
      '--yAxWidth': `${props.yAxWidth}px`,
      '--xAxHeight': `${props.xAxHeight}px`,
      '--scaledWidth': `${props.scaledWidth}px`,
      '--scaledHeight': `${props.scaledHeight}px`,
      '--scrollBarWidth': `${scrollBarWidth.value}px`,
      '--scrollBarHeight': `${scrollBarHeight.value}px`,
    }));

    onMounted(() => {
      scrollingContainer.value?.addEventListener('scroll', () => {
        if (!isXScrolling && !isYScrolling) {
          isXScrolling = true;
          isYScrolling = true;
          xAxisContainer.value!.scrollLeft = scrollingContainer.value!.scrollLeft
          yAxisContainer.value!.scrollTop = scrollingContainer.value!.scrollTop
          isXScrolling = false;
          isYScrolling = false
        }
      });
      xAxisContainer.value?.addEventListener('scroll', () => {
        if (!isXScrolling) {
          isXScrolling = true;
          scrollingContainer.value!.scrollLeft = xAxisContainer.value!.scrollLeft
          isXScrolling = false;
        }
      });
      yAxisContainer.value?.addEventListener('scroll', () => {
        if (!isYScrolling) {
          isYScrolling = true;
          scrollingContainer.value!.scrollTop = yAxisContainer.value!.scrollTop
          isYScrolling = false;
        }
      });
      console.log(props.piece)
      const durTot = props.piece.durTot;
      if (durTot === undefined) {
        throw new Error('durTot is undefined');
      }
      xScale.value = d3.scaleLinear()
        .domain([0, durTot])
        .range([0, props.scaledWidth]);
      const raga = props.piece.raga;
      const saFreq = raga.fundamental;
      const logSaFreq = Math.log2(saFreq);
      const logMax = logSaFreq + props.highOctOffset;
      const logMin = logSaFreq - props.lowOctOffset;


      yScale.value = d3.scaleLinear()
        .domain([logMax, logMin])
        .range([0, props.scaledHeight]);




    })
    return {
      scrollingContainer,
      layersContainer,
      xAxisContainer,
      yAxisContainer,
      scrollBarWidth,
      scrollBarHeight,
      xScale,
      yScale,
      cssVars,
    };

  }
});

</script>

<style scoped>

.scrollingContainer {
  width: calc(100% - var(--yAxWidth));
  height: calc(100% - var(--xAxHeight));
  top: var(--xAxHeight);
  left: var(--yAxWidth);
  overflow-x: scroll;
  overflow-y: scroll;
  position: absolute;
  box-sizing: border-box;
  scrollbar-width: auto;
}

.scrollingContainer::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.scrollingContainer::-webkit-scrollbar-thumb {
  background-color: #888;
  border-radius: 10px;
}

.scrollingContainer::-webkit-scrollbar-track {
  background-color: lightgrey;
}

.layersContainer {
  position: absolute;
  top: 0;
  left: 0;;

}

.layersContainer > * {
  position: absolute;
  top: 0;
  left: 0;
}

.xAxisContainer {
  position: sticky;
  top: 0;
  left: var(--yAxWidth);
  /* background: linear-gradient(0.25turn, #e66465, #9198e5); */
  width: calc(100% - var(--yAxWidth) - var(--scrollBarWidth));
  height: var(--xAxHeight);
  overflow-x: scroll;
  overflow-y: hidden;
}

/* .xAxis {
  width: var(--scaledWidth);
  height: var(--xAxHeight);
  background: linear-gradient(0.25turn, #e66465, #9198e5);
} */

.yAxisContainer {
  position: sticky;
  left: 0;
  top: var(--xAxHeight);
  width: var(--yAxWidth);
  height: calc(100% - var(--xAxHeight) - var(--scrollBarHeight));
  overflow-y: scroll;
}

.yAxisContainer::-webkit-scrollbar {
  width: 0;
}

.xAxisContainer::-webkit-scrollbar {
  height: 0;
}





.wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

</style>