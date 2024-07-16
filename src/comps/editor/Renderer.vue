<template>
  <div class='renderMain' ref='renderMain' :style='cssVars'>
    <div 
      class='scrollingContainer' 
      ref='scrollingContainer'
      >
      <div class='layersContainer'>
        <SpectrogramLayer
          :width='scaledWidth'
          :height='scaledHeight'
          ref='spectrogramLayer'
          />
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

    // const renderMain = ref<HTMLDivElement | null>(null);
    const scrollingContainer = ref<HTMLDivElement | null>(null);

    // onMounted(() => {
    //   console.log(props.scaledWidth, props.scaledHeight)
    // })
    return {
      scrollingContainer,
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

</style>