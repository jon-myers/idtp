<template>
  <div 
    class='outerSpecSettings' 
    :style='dynamicStyle'
    ref='outerSpecSettings'
    >
    <div class='col'>
      <div class='titleBox'>
        <label>Spectrogram</label>
      </div>
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
    <div class='col'>
      <div class='titleBox'>
        <label>"Sa" Frequency</label>
      </div>
      <div class='rowBox'>
        <div class='row'>
          <input 
          type='number' 
          v-model='saFreqDisplay'
          min='100' 
          max='400' 
          step='1' 
          @change='handleSaFreqChange'
          />
          <input 
            type='range' 
            v-model='logSaFreq' 
            :min='Math.log2(150)' 
            :max='Math.log2(600)' 
            step=0.001
            @input='handleLogSaFreqChange'
          />
        </div>
        <div class='row'>
          <label>Gain</label>
          <input
            type='range'
            v-model='saGain'
            min='0'
            max='1'
            step='0.001'
          />
        </div>
      </div>
      <div class='rowBox'>
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
    const saFreq = ref(props.saFreq);
    const logSaFreq = ref(Math.log2(props.saFreq));
    const saGain = ref(0);

    const saFreqDisplay = computed({
      get: () => saFreq.value.toFixed(0),
      set: (newVal) => {
        saFreq.value = parseFloat(newVal);
      }
    })


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
    };

    const handleLogSaFreqChange = () => {
      saFreq.value = Math.pow(2, logSaFreq.value);
    }

    const handleSaFreqChange = () => {
      logSaFreq.value = Math.log2(saFreq.value);
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
      updateIntensity,
      saFreq,
      logSaFreq,
      handleLogSaFreqChange,
      handleSaFreqChange,
      saFreqDisplay,
      saGain
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
  width: 180px;
  min-width: 180px;
  border-right: 1px solid white;
}

.col > select {
  width: 100px;
}

.col > input {
  width: 40px;
}

.rowBox {
  width: 100%;
  max-height: 80px;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  box-sizing: border-box;
  border-top: 1px solid white;
}

.titleBox {
  height: 40px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2em;
}

.row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
  width: 100%;
}

.row > input[type='range'] {
  width: 90px;
  box-sizing: border-box;
}

.row > input[type='number'] {
  width: 45px;
  box-sizing: border-box;
}

.row > label {
  width: 45px;
  box-sizing: border-box
}
</style>