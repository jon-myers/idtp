<template>
  <div class='outerSpecSettings' :style='dynamicStyle'>
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
import { rgb } from 'd3-color';

enum CMap {
  Blues = 'interpolateBlues',
  BrBG = 'interpolateBrBG',
  BuGn = 'interpolateBuGn',
  BuPu = 'interpolateBuPu',
  Cividis = 'interpolateCividis',
  Cool = 'interpolateCool',
  CubehelixDefault = 'interpolateCubehelixDefault',
  GnBu = 'interpolateGnBu',
  Greens = 'interpolateGreens',
  Greys = 'interpolateGreys',
  Inferno = 'interpolateInferno',
  Magma = 'interpolateMagma',
  OrRd = 'interpolateOrRd',
  Oranges = 'interpolateOranges',
  PRGn = 'interpolatePRGn',
  PiYG = 'interpolatePiYG',
  Plasma = 'interpolatePlasma',
  PuBu = 'interpolatePuBu',
  PuBuGn = 'interpolatePuBuGn',
  PuOr = 'interpolatePuOr',
  PuRd = 'interpolatePuRd',
  Purples = 'interpolatePurples',
  Rainbow = 'interpolateRainbow',
  RdBu = 'interpolateRdBu',
  RdGy = 'interpolateRdGy',
  RdPu = 'interpolateRdPu',
  RdYlBu = 'interpolateRdYlBu',
  RdYlGn = 'interpolateRdYlGn',
  Reds = 'interpolateReds',
  Sinebow = 'interpolateSinebow',
  Spectral = 'interpolateSpectral',
  Turbo = 'interpolateTurbo',
  Viridis = 'interpolateViridis',
  Warm = 'interpolateWarm',
  YlGn = 'interpolateYlGn',
  YlGnBu = 'interpolateYlGnBu',
  YlOrBr = 'interpolateYlOrBr',
  YlOrRd = 'interpolateYlOrRd'  
}

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
    const power = ref(1);
    const cMapName = ref<CMap>(CMap.Viridis);
    const numCols = ref(50)

    // defining internal variables
    let extShape = [0, 0];
    let extData: Uint8Array[] = [];
    let hiddenCanvas = document.createElement('canvas');
    let hiddenCtx = hiddenCanvas.getContext('2d')!;
    let imgData: ImageData | undefined = undefined;
    const scaledCanvas = document.createElement('canvas');
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
      imgData = hiddenCtx.createImageData(shape[1], shape[0]);
      resetScaledCanvas();
    };

    const resetScaledCanvas = () => {
      const shape = croppedDataShape.value;
      scaledCanvas.width = props.scaledWidth;
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
      // resetScaledCanvas(); 
    }

    const adjustPower = () => {
      if (power.value === 1) {
        return
      }
      let globalMax = 0;
      croppedData.value.forEach(arr => {
        const max = Math.max(...arr);
        if (max > globalMax) {
          globalMax = max;
        }
      });
      const maxVal = Math.pow(globalMax, power.value);
      croppedData.value = croppedData.value.map(arr => {
        const newArr = new Uint8Array(arr.length);
        for (let i = 0; i < arr.length; i++) {
          const adjustedVal = (Math.pow(arr[i], power.value) / maxVal) * 255;
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

    const update = (start: number) => {
      const c1 = (x: number) => x < start + numCols.value;
      const c2 = (x: number) => x < croppedDataShape.value[1];
      for (let x = start; c1(x) && c2(x); x++) {
        for (let i = 0; i < croppedDataShape.value[0]; i++) {
          const idx = (i * croppedDataShape.value[1] + x) * 4;
          const colorObj = rgb(cMapObj(croppedData.value[i][x] / 255));
          imgData!.data[idx] = colorObj.r;
          imgData!.data[idx + 1] = colorObj.g;
          imgData!.data[idx + 2] = colorObj.b;
          imgData!.data[idx + 3] = 255;
        }
      }
      const width = croppedDataShape.value[1];
      const height = croppedDataShape.value[0];
      const cWidth = numCols.value;
      hiddenCtx.putImageData(imgData!, 0, 0, start, 0, cWidth, width);
      scaledCtx.drawImage(hiddenCanvas, start, 0, cWidth, height, start, 0, 
                          cWidth, height);
    };

    const updateColumns = async (start: number) => {
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          update(start);
          resolve();
        });
      });
    }

    const convertToImage = () => {
      
      const start = performance.now();
      console.log('Converting to image: ', start )
      const dataUrl = scaledCanvas.toDataURL();
      const svgNS = 'http://www.w3.org/2000/svg';
      const img = document.createElementNS(svgNS, 'image');
      img.setAttributeNS(null, 'href', dataUrl);
      img.setAttributeNS(null, 'x', '0');
      img.setAttributeNS(null, 'y', '0');
      img.setAttributeNS(null, 'width', scaledCanvas.width.toString());
      img.setAttributeNS(null, 'height', scaledCanvas.height.toString());
      console.log('Time to convert to image:', performance.now() - start);
      console.log('end time:', performance.now())
      return img;
    }

    const updateAllCols = async () => {
      const tot = Math.ceil(croppedDataShape.value[1] / numCols.value);
      let startIs = Array.from({length: tot}, (_, i) => i);
      const leftPropI = Math.floor(props.xRangeInView[0] * tot);
      const rightPropI = Math.ceil(props.xRangeInView[1] * tot);
      const desiredSeg = startIs.slice(leftPropI, rightPropI);
      const initSeg = startIs.slice(0, leftPropI);
      const endSeg = startIs.slice(rightPropI);
      startIs = [...desiredSeg, ...initSeg, ...endSeg];
      try {
        for (const startI of startIs) {
          await updateColumns(startI * numCols.value);
        }
      } catch (error) {
        console.error('Error updating columns:', error);
      }
    }

    // const emit = defineEmits(['specCanvas']);

    onMounted(async () => {
      try {
        // emit canvas
        emit('specCanvas', scaledCanvas);
        await loadSpectrogramData();
        const logSa = Math.log2(props.saFreq);
        const low = logSa - lowOctOffset.value;
        const high = logSa + highOctOffset.value;
        cropData(low, high);
        resetCanvas();
        adjustPower();
        await updateAllCols();
        // convertToImage();
      } catch (error) {
        console.error('Error mounting spectrogram controls:', error);
      }
    })
    
    return {
      intensityPower,
      lowOctOffset,
      highOctOffset,
      power,
      cMapName,
      numCols,
      updateAllCols,
      dynamicStyle,
      croppedData,
      croppedDataShape,
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
  flex-direction: column;
  align-items: center;
  justify-content: top;
}
</style>