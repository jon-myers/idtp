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
          <div class='backgroundLayer'></div>
          <SpectrogramLayer
            :width='scaledWidth'
            :height='scaledHeight'
            :showSpectrogram='showSpectrogram'
            ref='spectrogramLayer'
            />
          <MelographLayer
            v-if='yScale !== null && xScale !== null'
            :width='scaledWidth'
            :height='scaledHeight'
            :showMelograph='showMelograph'
            :color='melographColor'
            :audioID='piece.audioID'
            :xScale='xScale'
            :yScale='yScale'
            ref='melographLayer'
            />
            <TranscriptionLayer
              v-if='
                yScale !== null && 
                xScale !== null && 
                scrollingContainer !== null
                '
              :width='scaledWidth'
              :height='scaledHeight'
              :showTranscription='showTranscription'
              :xScale='xScale'
              :yScale='yScale'
              :lowOctOffset='lowOctOffset'
              :highOctOffset='highOctOffset'
              :piece='piece'
              :sargamLineColor='sargamLineColor'
              :minDrawDur='minDrawDur'
              :trajColor='trajColor'
              :selTrajColor='selTrajColor'
              :scrollX='scrollX'
              :clientWidth='clientWidth'
              :showSargam='showSargam'
              :showSargamLines='showSargamLines'
              :showPhonemes='showPhonemes'
              :phonemeRepresentation='phonemeRepresentation'
            />
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
  onBeforeUnmount, 
  watch, 
  PropType,
  computed,
} from 'vue';
import { debounce } from 'lodash';

import SpectrogramLayer from '@/comps/editor/renderer/SpectrogramLayer.vue';
import XAxis from '@/comps/editor/renderer/XAxis.vue';
import YAxis from '@/comps/editor/renderer/YAxis.vue';
import MelographLayer from '@/comps/editor/renderer/MelographLayer.vue';
import TranscriptionLayer from '@/comps/editor/renderer/TranscriptionLayer.vue';
import { Piece } from '@/js/classes.ts';
import * as d3 from 'd3';


export default defineComponent({
  name: 'Renderer',
  components: {
    SpectrogramLayer,
    MelographLayer,
    XAxis,
    YAxis,
    TranscriptionLayer
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
    },
    showSpectrogram: {
      type: Boolean,
      required: true
    },
    backgroundColor: {
      type: String,
      required: true
    },
    axisColor: {
      type: String,
      required: true
    },
    showMelograph: {
      type: Boolean,
      required: true
    },
    melographColor: {
      type: String,
      required: true
    },
    showTranscription: {
      type: Boolean,
      required: true
    },
    sargamLineColor: {
      type: String,
      required: true
    },
    trajColor: {
      type: String,
      required: true
    },
    selTrajColor: {
      type: String,
      required: true
    },
    showSargam: {
      type: Boolean,
      required: true
    },
    showSargamLines: {
      type: Boolean,
      required: true
    },
    showPhonemes: {
      type: Boolean,
      required: true
    },
    phonemeRepresentation: {
      type: String,
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
    const yAxis = ref<HTMLDivElement | null>(null);
    const xAxis = ref<HTMLDivElement | null>(null);
    const minDrawDur = ref(0.01);
    // const scrollX = ref(0); // between 0 and 1
    const scrollX = computed(() => {
      if (!scrollingContainer.value) return 0;
      const scrollWidth = scrollingContainer.value.scrollWidth;
      const scrollLeft = scrollingContainer.value.scrollLeft;
      return scrollLeft / (scrollWidth - scrollingContainer.value.clientWidth);
      
    })
    const clientWidth = ref(0);

    let isXScrolling = false;
    let isYScrolling = false;
    let rafId: number | null = null;

    const cssVars = computed(() => ({
      '--yAxWidth': `${props.yAxWidth}px`,
      '--xAxHeight': `${props.xAxHeight}px`,
      '--scaledWidth': `${props.scaledWidth}px`,
      '--scaledHeight': `${props.scaledHeight}px`,
      '--scrollBarWidth': `${scrollBarWidth.value}px`,
      '--scrollBarHeight': `${scrollBarHeight.value}px`,
      '--backgroundColor': props.backgroundColor
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
        xScale.value = d3.scaleLinear()
          .domain([0, props.piece.durTot!])
          .range([0, props.scaledWidth]);
      }
    })

    const reScaleY = () => {
      if (yScale.value) {
        const raga = props.piece.raga;
        const saFreq = raga.fundamental;
        const logSaFreq = Math.log2(saFreq);
        const logMax = logSaFreq + props.highOctOffset;
        const logMin = logSaFreq - props.lowOctOffset;
        yScale.value.domain([logMax, logMin]);
      }
    };

    const updateClientWidth = () => {
      if (scrollingContainer.value) {
        clientWidth.value = scrollingContainer.value.clientWidth;
        // scrollX.value = scrollingContainer.value.scrollLeft / 
        //   (scrollingContainer.value.scrollWidth - scrollingContainer.value.clientWidth);
      }
      yAxisContainer.value!.scrollTop = scrollingContainer.value!.scrollTop;
      xAxisContainer.value!.scrollLeft = scrollingContainer.value!.scrollLeft;
    }

    watch([() => props.lowOctOffset, () => props.highOctOffset], () => {
      reScaleY();
    });

    onMounted(async () => {
      updateClientWidth();
      scrollingContainer.value?.addEventListener('scroll', () => {
        if (!isXScrolling && !isYScrolling) {
          isXScrolling = true;
          isYScrolling = true;
          xAxisContainer.value!.scrollLeft = scrollingContainer.value!.scrollLeft;
          yAxisContainer.value!.scrollTop = scrollingContainer.value!.scrollTop;
          isXScrolling = false;
          isYScrolling = false
        };
        const scrollWidth = scrollingContainer.value!.scrollWidth;
        const scrollLeft = scrollingContainer.value!.scrollLeft;
        // scrollX.value = scrollLeft / 
        //   (scrollWidth - scrollingContainer.value!.clientWidth);

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
      window.addEventListener('resize', updateClientWidth);
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
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', updateClientWidth);
    });
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
      zoomOutY,
      zoomInY,
      zoomOutX,
      zoomInX,
      yAxis,
      xAxis,
      reScaleY,
      minDrawDur,
      scrollX,
      clientWidth
    }
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

.backgroundLayer {
  width: var(--scaledWidth);
  height: var(--scaledHeight);
  background-color: var(--backgroundColor);
  position: absolute;
}

</style>