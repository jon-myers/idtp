<template>
  <div 
    class='outerSpecSettings' 
    :style='dynamicStyle'
    ref='outerSpecSettings'
    >
    <div class='col'>
      <label>Colormap</label>
      <select v-model='cMapName'>
        <option v-for='(val, key) in cMapEnum' :value='val' :key='key'>
          {{ key }}
        </option>
      </select>
      <label>Intensity Power</label>
      <input 
        type='number' v-model='intensityPower'
        min='1' max='5' step=0.1 
        />
    </div>
    <div class='col'>
      <button @click='render'>Render</button>
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
import * as d3CMap from 'd3-scale-chromatic';
import pako from 'pako';
import { CMap } from '@/ts/types.ts';

export default defineComponent({
  name: 'SpectrogramControls',
  props: {
    height: {
      type: Number,
      required: true
    },
    playerHeight: {
      type: Number,
      required: true
    },
    audioID: {
      type: String,
      required: true
    },
    saFreq: {
      type: Number,
      required: true
    },
    scaledWidth: {
      type: Number,
      required: true
    },
    scaledHeight: {
      type: Number,
      required: true
    },
    xRangeInView: {
      type: Array as PropType<number[]>,
      required: true,
      validator: (value: any): value is [number, number] => value.length === 2,
    }
  },
  setup(props, { emit }) {
    // defining reactive references
    const croppedData = ref<Uint8Array[]>([]);
    const croppedDataShape = ref<[number, number]>([0, 0]);
    const intensityPower = ref(1);
    const lowOctOffset = ref(1.1);
    const highOctOffset = ref(2.1);
    // const power = ref(1);
    const cMapName = ref<CMap>(CMap.Viridis);
    const numCols = ref(50)
    const cMapEnum = ref(CMap);

    // defining internal variables
    let extShape = [0, 0];
    let extData: Uint8Array[] = [];
    let hiddenCanvas = document.createElement('canvas');
    const scaledCanvas = document.createElement('canvas');
    // const scaledCanvas = document.querySelector('#hiddenCanvas')! as HTMLCanvasElement;
    const scaledCtx = scaledCanvas.getContext('2d')!;
    const extRange = [75, 2400];
    let cMapObj = d3CMap[cMapName.value]; 

    const dynamicStyle = computed(() => ({
      '--height': `${props.height}px`,
      '--playerHeight': `${props.playerHeight}px`
    }))
    
    watch(cMapName, (newVal) => {
      cMapObj = d3CMap[newVal];
    });

    const resetCanvas = () => {
      const shape = croppedDataShape.value;      
      hiddenCanvas.width = shape[1];
      hiddenCanvas.height = shape[0];
      resetScaledCanvas();
    };

    const resetScaledCanvas = () => {
      const shape = croppedDataShape.value;
      const maxWidth = 65535;
      const width = Math.min(props.scaledWidth, maxWidth);
      scaledCanvas.width = width;
      scaledCanvas.height = props.scaledHeight;
      const xScale = props.scaledWidth / shape[1];
      const yScale = props.scaledHeight / shape[0];
      scaledCtx.scale(xScale, yScale);
    };
    
    const cropData = (logMin: number, logMax: number) => {
      const extLogMin = Math.log2(extRange[0]);
      const extLogMax = Math.log2(extRange[1]);
      const extHeight = extShape[0];
      let yMin = (logMin - extLogMin) / (extLogMax - extLogMin) * extHeight;
      let yMax = (logMax - extLogMin) / (extLogMax - extLogMin) * extHeight;
      yMin = Math.round(yMin);
      yMax = Math.round(yMax);
      const newHeight = yMax - yMin;
      croppedData.value = extData.slice(extHeight - yMax, extHeight - yMin);
      croppedDataShape.value = [newHeight, extShape[1]];    
    }

    const render = () => {
      adjustPower();
      startWorker();
    }

    const adjustPower = () => {
      console.log(intensityPower.value)
      if (intensityPower.value === 1) {
        return
      }
      let globalMax = 0;
      croppedData.value.forEach(arr => {
        const max = Math.max(...arr);
        if (max > globalMax) {
          globalMax = max;
        }
      });
      const maxVal = Math.pow(globalMax, intensityPower.value);
      croppedData.value = croppedData.value.map(arr => {
        const newArr = new Uint8Array(arr.length);
        for (let i = 0; i < arr.length; i++) {
          const adjustedVal = (Math.pow(arr[i], intensityPower.value) / maxVal) * 255;
          newArr[i] = Math.min(255, Math.max(0, Math.round(adjustedVal)));
        }
        return newArr;
      })
    };

    const loadSpectrogramData = async () => {
      const dirUrl = `https://swara.studio/spec_data/${props.audioID}`;
      try {
        const res = await fetch(dirUrl + '/spec_data.gz');
        const buf = await res.arrayBuffer();
        const shape = await fetch(dirUrl + '/spec_shape.json');
        const shapeJson = await shape.json();
        extShape = shapeJson.shape;
        const linearData = pako.inflate(new Uint8Array(buf));
        for (let i = 0; i < extShape[0]; i++) {
          const width = extShape[1];
          const slice = linearData.slice(i * width, (i + 1) * width);
          extData.push(slice);
        }
      } catch (error) {
        console.error('Error fetching spectrogram data:', error);
      }
    };
    const workerURL = new URL('@/ts/workers/spectrogramWorker.ts', import.meta.url)
    const spectrogramWorker = new Worker(workerURL, { 
      type: 'module' 
    });
    
    spectrogramWorker.onmessage = (e: MessageEvent<{ 
      start: number,
      imgBitmap: ImageBitmap,
    }>) => {
      const height = croppedDataShape.value[0];
      const cWidth = numCols.value;
      scaledCtx.drawImage(e.data.imgBitmap, 0, 0, cWidth, height, 
      e.data.start, 0, cWidth, height);
    }

    const startWorker = () => {
      console.log('starting worker: ', performance.now());
      
      spectrogramWorker.postMessage({
        // offscreenCanvas: offscreenCanvas,
        cMapName: cMapName.value,
        croppedData: Array.from(croppedData.value),
        croppedDataShape: Array.from(croppedDataShape.value),
        numCols: numCols.value,
        xRangeInView: Array.from(props.xRangeInView),
      });
    }

    onMounted(async () => {
      // const ost = document.querySelector('.outerSpecSettings')!;
      // ost.appendChild(hiddenCanvas);
      try {
        // emit canvas
        // console.log('before emit scaledCanvas: ', performance.now());
        // console.log(scaledCanvas)
        // console.log('after emit scaledCanvas: ', performance.now());
        // emit('specCanvas', scaledCanvas);
        await loadSpectrogramData();
        const logSa = Math.log2(props.saFreq);
        const low = logSa - lowOctOffset.value;
        const high = logSa + highOctOffset.value;
        cropData(low, high);
        resetCanvas();
        adjustPower();
        startWorker();
      } catch (error) {
        console.error('Error mounting spectrogram controls:', error);
      }
    })
    
    return {
      intensityPower,
      lowOctOffset,
      highOctOffset,
      cMapName,
      numCols,
      dynamicStyle,
      croppedData,
      croppedDataShape,
      cMapEnum,
      startWorker,
      // adjustPower
      render,
    }
  }
})

</script>

<style scoped>

.outerSpecSettings {
  background-color: #202621;
  height: var(--height);
  position: absolute;
  right: 0px;
  bottom: var(--playerHeight);
  color: white;
  z-index: -1;
  display: flex;
  flex-direction: row;
  align-items: top;
  justify-content: top;
}

.col {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 10px;
  width: 150px;
  min-width: 150px;
}

.col > select {
  width: 100px;
}

.col > input {
  width: 40px;
}
</style>