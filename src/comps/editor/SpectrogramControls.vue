<template>
  <div 
    class='outerSpecSettings' 
    :style='dynamicStyle'
    ref='outerSpecSettings'
    >
    <div class='col'>
      <label>Colormap</label>
      <SelectComponent 
        :svgs='swatches'
        />
      <!-- <select v-model='cMapName'>
        <option v-for='(val, key) in cMapEnum' :value='val' :key='key'>
          {{ key }}
        </option>
      </select> -->
      <label>Intensity Power</label>
      <input 
        type='number' v-model='intensityPower'
        min='1' max='5' step=0.1 
        />
        
    </div>
    <!-- <div class='col'>
      <button @click='render'>Render</button>
    </div> -->
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
import { getWorker } from '@/ts/workers/workerManager.ts'
import { CMap } from '@/ts/types.ts';
import * as d3 from 'd3';
import SelectComponent from '@/comps/SelectComponent.vue';

const createSwatches = (): string[] => {
  // for every color map in the enum CMap,
  // create a swatch with the color map applied
  // and return an array of the swatches
  const width = 100;
  const height = 20;
  const swatches: string[] = [];
  for (const [key, value] of Object.entries(CMap)) {
    const swatchSVG = d3.create('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('xmlns', 'http://www.w3.org/2000/svg');
    const n = 100;
    const colorScale = d3CMap[value];
    const data = Array.from({ length: n }, (_, i) => i / (n-1));
    swatchSVG.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d, i) => i)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', d => colorScale(d));
    const svgString = new XMLSerializer().serializeToString(swatchSVG.node()!);
    swatches.push(svgString)    
  }
  return swatches;
}

export default defineComponent({
  name: 'SpectrogramControls',
  components: {
    SelectComponent
  },
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
      type: Number as PropType<number>,
      required: true,
      validator: (value: number) => Number.isInteger(value)
    },
    scaledHeight: {
      type: Number as PropType<number>,
      required: true,
      validator: (value: number) => Number.isInteger(value)
    },
    xRangeInView: {
      type: Array as PropType<number[]>,
      required: true,
      validator: (value: any): value is [number, number] => value.length === 2,
    }
  },
  setup(props, { emit }) {
    const intensityPower = ref(1);
    const lowOctOffset = ref(1.1);
    const highOctOffset = ref(2.1);
    const cMapName = ref<CMap>(CMap.Viridis);
    const cMapEnum = ref(CMap);
    const swatch = ref<SVGSVGElement | null>(null);
    const swatches = ref<SVGSVGElement[]>([]);

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

    const spectrogramWorker = getWorker();
    const logSa = Math.log2(props.saFreq);
    const low = logSa - lowOctOffset.value;
    const high = logSa + highOctOffset.value;

    const processOptions = {
      type: 'initial',
      logMin: low,
      logMax: high,
      newScaledShape: [props.scaledHeight, props.scaledWidth],
      audioID: props.audioID,
      newVerbose: true
    }

    spectrogramWorker.postMessage({
      msg: 'process',
      payload: processOptions
    })
    
    // spectrogramWorker.onmessage = (e) => {
    //   console.log(e.data)
    // }

    onMounted(async () => {
      try {
        swatches.value = createSwatches();
        

      } catch (error) {
        console.error('Error mounting spectrogram controls:', error);
      }
    })
    
    return {
      intensityPower,
      lowOctOffset,
      highOctOffset,
      cMapName,
      dynamicStyle,
      cMapEnum,
      swatches,
      swatch
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