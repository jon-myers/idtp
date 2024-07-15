<template>
  <div class='container' ref='container'>
  </div>
</template>

<script lang='ts'>

import { defineComponent, ref, onMounted, defineExpose } from 'vue'
import { RenderCall } from '@/ts/types'

export default defineComponent({
  name: 'SpectrogramLayer',
  props: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
  },
  setup(props, { emit}) {
    const maxCanvasWidth = 1000;
    const container = ref<HTMLDivElement | null>(null);
    const canvases = ref<HTMLCanvasElement[]>([]);
    const ctxs = ref<CanvasRenderingContext2D[]>([]);
    const canvasIdxMap = new Map<HTMLCanvasElement, number>();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const canvas = entry.target as HTMLCanvasElement;
        const idx = canvasIdxMap.get(canvas)!;
        if (entry.isIntersecting) {
          const startX = maxCanvasWidth * idx;
          const width = Math.min(maxCanvasWidth, props.width - startX);
          const renderCall = { canvasIdx: idx, startX, width } as RenderCall;
          emit('render', renderCall)
        } else {
          // console.log('not intersecting');
        }
      });
    }, {
      root: container.value,
      rootMargin: '0px',
      threshold: 0.0
    })

    const resetObserver = () => {
      observer.disconnect();
      canvases.value.forEach((canvas) => {
        observer.observe(canvas);
      });
    }

    onMounted(() => {
      if (container.value) {
        const numCanvases = Math.ceil(props.width / maxCanvasWidth);


        for (let i = 0; i < numCanvases; i++) {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(maxCanvasWidth, props.width - i * maxCanvasWidth);
          canvas.height = props.height;
          container.value.appendChild(canvas);
          canvases.value.push(canvas);
          ctxs.value.push(canvas.getContext('2d') as CanvasRenderingContext2D);
          canvasIdxMap.set(canvas, i);
          observer.observe(canvas);
        }
      }
    });

    // defineExpose({ resetObserver });

    return {
      container,
      canvases,
      ctxs,
      resetObserver
    }
  }
})
</script>


<style scoped>
.container {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  white-space: nowrap;
}

</style>