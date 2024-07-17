<template>
  <div 
    class='outerSpecSettings' 
    :style='dynamicStyle'
    ref='outerSpecSettings'
    >
    <div class='col'>
      <div class='rowBox'>
        <label>Colormap</label>
        <SwatchSelect 
          :initCMap='initCMap'
          v-model='cMapName'
        />
        <button @click='updateColorMap'>Update</button>
      </div>
      <div class='rowBox'>
        <label>Intensity Power</label>
        <input 
          type='number' v-model='intensityPower'
          min='1' max='5' step=0.1 
          />
          <button @click='updateIntensity'>Update</button>
      </div>
        
    </div>
  </div>
</template>

<script lang='ts'>
import { 
  defineComponent, 
  ref,
  PropType,
  computed,
} from 'vue';
import { getWorker } from '@/ts/workers/workerManager.ts'
import { CMap } from '@/ts/types.ts';
import SwatchSelect from '@/comps/SwatchSelect.vue';

export default defineComponent({
  name: 'SpectrogramControls',
  components: {
    SwatchSelect
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
    const swatches = ref<SVGSVGElement[]>([]);
    const initCMap = ref<CMap>(CMap.Viridis);
    const dynamicStyle = computed(() => ({
      '--height': `${props.height}px`,
      '--playerHeight': `${props.playerHeight}px`
    }))
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

    const updateColorMap = () => {
      const processOptions = {
        type: 'color',
        newCMap: cMapName.value,
      }
      spectrogramWorker.postMessage({
        msg: 'process',
        payload: processOptions
      })
    }

    const updateIntensity = () => {
      const processOptions = {
        type: 'power',
        newPower: intensityPower.value
      }
      spectrogramWorker.postMessage({
        msg: 'process',
        payload: processOptions
      })
    }
    
    
    return {
      intensityPower,
      lowOctOffset,
      highOctOffset,
      cMapName,
      dynamicStyle,
      cMapEnum,
      swatches,
      initCMap,
      updateColorMap,
      updateIntensity
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
  margin: 0px;
  width: 140px;
  min-width: 140px;
}

.col > select {
  width: 100px;
}

.col > input {
  width: 40px;
}

.rowBox {
  width: 100%;
  max-height: 100px;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  box-sizing: border-box;
  border-right: 1px solid white;
  border-bottom: 1px solid white;
}
</style>