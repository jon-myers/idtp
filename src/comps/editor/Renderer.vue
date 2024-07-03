<template>
  <div class='renderMain' ref='renderMain' :style='cssVars'>
    <div 
      class='scrollingContainer' 
      ref='scrollingContainer'
      @scroll.native='scrollHandler'
      >
      <canvas id='hiddenCanvas' ></canvas>
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

export default defineComponent({
  name: 'Renderer',
  computed: {
    cssVars() {
      return {
        '--yAxWidth': `${this.yAxWidth}px`,
        '--xAxHeight': `${this.xAxHeight}px`,
      };
    }
  },
  props: {
    specCanvas: {
      type: Object as PropType<HTMLCanvasElement | undefined>,
      required: true,
    },
    yAxWidth: {
      type: Number,
      required: true,
    },
    xAxHeight: {
      type: Number,
      required: true,
    },
  },
  setup(props, { emit }) {

    // const renderMain = ref<HTMLDivElement | null>(null);
    const scrollingContainer = ref<HTMLDivElement | null>(null);

    const scrollHandler = () => {
      const el = scrollingContainer.value!;
      const width = el.clientWidth;
      const pxlLeft = el.scrollLeft;
      const pxlRight = pxlLeft + width;
      const xLeft = pxlLeft / el.scrollWidth;
      const xRight = pxlRight / el.scrollWidth;
      emit('xRangeInView', [xLeft, xRight]);

    }

    watch(() => props.specCanvas, (canvas) => {
      if (canvas !== undefined) {
        canvas.style.display = 'block';
        scrollingContainer.value?.appendChild(canvas);
      }
    })

    return {
      scrollingContainer,
      scrollHandler,
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
  position: relative;
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

</style>