<template>
  <div class='renderMain' ref='renderMain' :style='cssVars'>
    <div class='wrapper'>
      <div class='xAxisContainer' ref='xAxisContainer'>
        <XAxis
          v-if='xScale !== null'
          :scaledWidth='scaledWidth'
          :height='xAxHeight'
          :scale='xScale'
          :axisColor='axisColor'
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
          :axisColor='axisColor'
          ref='yAxis'/>
        <!-- <div class='yAxis'></div> -->
      </div>
      <div class='verticalZoomControls'>
        <div @click='zoomInY' class='zoomIn'>+</div>
        <div @click='zoomOutY' class='zoomOut'>-</div>
      </div>
      <div class='horizontalZoomControls'>
        <div @click='zoomOutX' class='zoomOut'>-</div>
        <div @click='zoomInX' class='zoomIn'>+</div>
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
    const scrollBarWidth = ref(15);
    const scrollBarHeight = ref(15);
    const xScale = ref<d3.ScaleLinear<number, number> | null>(null);
    const yScale = ref<d3.ScaleLinear<number, number> | null>(null);
    const axisColor = ref<String>('#c4b18b');
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

    const zoomOutY = () => emit('zoomOutY');
    const zoomInY = () => emit('zoomInY');
    const zoomOutX = () =>  emit('zoomOutX');
    const zoomInX = () => emit('zoomInX');

    watch(() => props.scaledHeight, () => {
      if (yScale.value) {
        yScale.value.range([0, props.scaledHeight]);
      }
    })

    watch(() => props.scaledWidth, () => {
      if (xScale.value) {
        xScale.value.range([0, props.scaledWidth]);
      }
    })

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
      axisColor,
      zoomOutY,
      zoomInY,
      zoomOutX,
      zoomInX,
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
  width: var(--scrollBarWidth);
  height: var(--scrollBarHeight);
}

.scrollingContainer::-webkit-scrollbar-thumb {
  background-color: #888;
  border-radius: var(--scrollBarWidth);
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

.verticalZoomControls {
  position: absolute;
  top: 0;
  left: calc(100% - var(--scrollBarWidth));
  width: var(--scrollBarWidth);
  height: var(--xAxHeight);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  background-color:lightgray;
  color: black;
  box-sizing: border-box;
}

.verticalZoomControls > * {
  width: 100%;
  height: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-sizing: border-box;
}

.verticalZoomControls > *:hover {
  background-color: darkgray;
}

.verticalZoomControls > .zoomOut {
  border-top: 1px solid black;
  border-bottom: 1px solid black;
}

.horizontalZoomControls {
  position: absolute;
  top: calc(100% - var(--scrollBarHeight));
  left: 0;
  width: var(--yAxWidth);
  height: var(--scrollBarHeight);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
  background-color:lightgray;
  color: black;
  box-sizing: border-box;
}

.horizontalZoomControls > * {
  width: 50%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-sizing: border-box;
  border-right: 1px solid black;
}

.horizontalZoomControls > *:hover {
  background-color: darkgray;
}

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