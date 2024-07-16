<template>
  <div class='renderMain' ref='renderMain' :style='cssVars'>
    <div class='wrapper'>
      <div class='xAxisContainer' ref='xAxisContainer'>
        <div class='xAxis'></div>
      </div>
      <div class='yAxisContainer' ref='yAxisContainer'>
        <div class='yAxis'></div>
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

export default defineComponent({
  name: 'Renderer',
  components: {
    SpectrogramLayer,
  },
  computed: {
    cssVars() {
      return {
        '--yAxWidth': `${this.yAxWidth}px`,
        '--xAxHeight': `${this.xAxHeight}px`,
        '--scaledWidth': `${this.scaledWidth}px`,
        '--scaledHeight': `${this.scaledHeight}px`,
        '--scrollBarWidth': `${this.scrollBarWidth}px`,
        '--scrollBarHeight': `${this.scrollBarHeight}px`,
      };
    }
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
  },
  setup(props, { emit }) {
    const layersContainer = ref<HTMLDivElement | null>(null);
    const xAxisContainer = ref<HTMLDivElement | null>(null);
    const yAxisContainer = ref<HTMLDivElement | null>(null);
    const scrollingContainer = ref<HTMLDivElement | null>(null);
    const scrollBarWidth = ref(10);
    const scrollBarHeight = ref(10);
    let isXScrolling = false;
    let isYScrolling = false;

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
      })
      xAxisContainer.value?.addEventListener('scroll', () => {
        if (!isXScrolling) {
          isXScrolling = true;
          scrollingContainer.value!.scrollLeft = xAxisContainer.value!.scrollLeft
          isXScrolling = false;
        }
      })

      yAxisContainer.value?.addEventListener('scroll', () => {
        if (!isYScrolling) {
          isYScrolling = true;
          scrollingContainer.value!.scrollTop = yAxisContainer.value!.scrollTop
          isYScrolling = false;
        }
      })

    })
    return {
      scrollingContainer,
      layersContainer,
      xAxisContainer,
      yAxisContainer,
      scrollBarWidth,
      scrollBarHeight,
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
}

.xAxis {
  width: var(--scaledWidth);
  height: var(--xAxHeight);
  background: linear-gradient(0.25turn, #e66465, #9198e5);
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

.yAxis {
  width: var(--yAxWidth);
  height: var(--scaledHeight);
  background: linear-gradient(#e66465, #9198e5);
}



.wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

</style>