<template>
  <div class='top'>
    <h1>TestSpectrogram</h1>
    <div class='scaled-canvas-container'>
      <canvas ref='scaledCanvas'></canvas>
    </div>
    <div class='controls'>
      <div class='controls-row'>
        <label>Sa Freq</label>
        <input type='number' v-model='saFreq' @change='updateLims'>
        <button @click='updateSa(saFreq)'>Update</button>
      </div>
      <div class='controls-title-row'>
        <label>Limits as octave offsets from Sa</label>
      </div>
      <div class='controls-row'>
        <label>High oct offset</label>
        <input 
          type='number' 
          v-model='highOctOffset'
          step='0.01'
          :max='highOctMaxOffset'
          min='0'>
      </div>
      <div class='controls-row'>
        <label>Low oct offset</label>
        <input 
          type='number'
          v-model.number='lowOctOffset' 
          step='0.01'
          :max='lowOctMaxOffset'
          min='0'
          >
      </div>
      <div class='controls-title-row'>
        <label>Colormap</label>
      </div>
      <div class='controls-row'>
        <select 
          v-model='selectedCMapString'
          @change='updateSa(saFreq)'
          >
          <option 
            v-for='(cMap, i) in cMaps'
            :key='i'
            :value='cMap'
            >{{cMap}}</option>
        </select>
      </div>
      <div class='controls-title-row'>
        <label>Intensity Power</label>
      </div>
      <div class='controls-row'>
        <input 
          type='number'
          v-model.number='intensityPower'
          step='0.1'
          min='0'
          max='5'
          >
      </div>
      <div class='controls-title-row'>
        <label>Rescale Canvas</label>
      </div>
      <div class='controls-row'>
        <label>Width</label>
        <input 
          type='number'
          v-model.number='scaledWidth'
          step='100'
          min='100'
          >
      </div>
      <div class='controls-row'>
        <label>Height</label>
        <input 
          type='number'
          v-model.number='scaledHeight'
          step='100'
          min='100'
          >
      </div>
    </div>
  </div>
</template>
<script lang='ts'>
import { defineComponent } from 'vue';
import * as cMap from 'd3-scale-chromatic';

const isSequentialScheme = (key: string) => {
  return key.startsWith('interpolate');
}
const sequentialSchemes = Object.keys(cMap).filter(isSequentialScheme);
console.log(sequentialSchemes);
import { rgb } from 'd3-color';
import pako from 'pako';
// import * as tf from '@tensorflow/tfjs';


type TestSpectrogramDataType = {
  imgData?: ImageData,
  ctx?: CanvasRenderingContext2D | null,
  scaledCtx?: CanvasRenderingContext2D | null,
  data: Uint8Array[],
  croppedData: Uint8Array[],
  testLastTime: number,
  saFreq: number,
  extRange: [number, number],
  logOffset: number,
  shapeData: {shape: [number, number]},
  croppedShapeData: { shape: [number, number] },
  lowOctOffset: number,
  highOctOffset: number,
  cMaps: string[],
  selectedCMapString: string,
  intensityPower: number,
  scaledWidth: number,
  scaledHeight: number,
  canvas?: HTMLCanvasElement
}
export default defineComponent({
  name: 'TestSpectrogram',
  data(): TestSpectrogramDataType {
    return {
      imgData: undefined,
      ctx: undefined,
      scaledCtx: undefined,
      data: [],
      croppedData: [],
      testLastTime: 0,
      saFreq: 368,
      extRange: [75, 2400],
      logOffset: 0.1,
      shapeData: {shape: [0, 0]},
      croppedShapeData: { shape: [0, 0] },
      lowOctOffset: 1.1,
      highOctOffset: 2.1,
      cMaps: sequentialSchemes,
      selectedCMapString: 'interpolateViridis',
      intensityPower: 1,
      scaledWidth: 3000,
      scaledHeight: 350,
      canvas: undefined
    }
  },

  async mounted() {
    const res = await fetch('https://swara.studio/test/tall_test.gz');
    const buf = await res.arrayBuffer();
    const shape = await fetch('https://swara.studio/test/tall_test_shape.json');
    this.shapeData = await shape.json() as {shape: [number, number]};
    const oneDData = pako.inflate(new Uint8Array(buf));
    for (let i = 0; i < this.shapeData.shape[0]; i++) {
      const slice = oneDData.slice(i * this.shapeData.shape[1], (i + 1) * this.shapeData.shape[1]);
      this.data.push(slice);
    }
    const logSa = Math.log2(this.saFreq);
    const low = logSa - this.lowOctOffset;
    const high = logSa + this.highOctOffset;
    this.setNewLims(low, high);
    this.setUpCanvas(this.croppedShapeData.shape);
    await this.updateAllCols(this.croppedShapeData.shape);
  },

  computed: {
    
    highOctMaxOffset() {
      const full = Math.log2(this.extRange[1] / this.saFreq);
      return Math.floor(full * 100) / 100;
    },

    lowOctMaxOffset() {
      const full = Math.log2(this.saFreq / this.extRange[0]);
      return Math.floor(full * 100) / 100;
    }

  },

  methods: {

    xRangeInView(): [number, number] {
      const canvasContainer = document.querySelector('.scaled-canvas-container') as HTMLElement;
      const rect = canvasContainer.getBoundingClientRect();
      const viewLeft = canvasContainer.scrollLeft;
      const viewRight = viewLeft + rect.width;
      const canvas = this.$refs.scaledCanvas as HTMLCanvasElement;
      const leftProp = viewLeft / canvas.width;
      const rightProp = viewRight / canvas.width;
      return [leftProp, rightProp];
    },

    adjustPower(croppedData: Uint8Array[], power: number) {
      if (power === 1) {
        return croppedData;
      }
      // find global max
      let globalMax: number = 0;
      croppedData.forEach(arr => {
        const max = Math.max(...arr);
        if (max > globalMax) {
          globalMax = max;
        }
      });
      const maxVal = Math.pow(globalMax, power);
      // adjust intensity, scaled to global max
      return croppedData.map(arr => {
        const newArr = new Uint8Array(arr.length);
        for (let i = 0; i < arr.length; i++) {
          const adjustedVal = (Math.pow(arr[i], power) / maxVal) * 255;
          newArr[i] = Math.min(255, Math.max(0, Math.round(adjustedVal)));
        }
        return newArr;
      });
    },

    updateLims() {
      if (this.highOctOffset > this.highOctMaxOffset) {
        this.highOctOffset = this.highOctMaxOffset;
      }
      if (this.lowOctOffset > this.lowOctMaxOffset) {
        this.lowOctOffset = this.lowOctMaxOffset;
      }
    },

    async updateAllCols(shape: [number, number]) {
      const numCols = 50;
      const tot = Math.ceil(shape[1] / numCols);
      let startIs = Array.from({length: tot}, (_, i) => i);
      const [leftProp, rightProp] = this.xRangeInView();
      const leftPropI = Math.floor(leftProp * tot);
      const rightPropI = Math.ceil(rightProp * tot);
      const desiredSeg = startIs.slice(leftPropI, rightPropI);
      const initSeg = startIs.slice(0, leftPropI);
      const endSeg = startIs.slice(rightPropI);
      startIs = desiredSeg.concat(initSeg, endSeg);
      for (const startI of startIs) {
        await this.updateColumns(shape, startI * numCols, numCols);
      }
    },

    async updateSa(freq: number) {
      this.saFreq = freq;
      const logSa = Math.log2(this.saFreq);
      const newLogMin = logSa - this.lowOctOffset;
      const newLogMax = logSa + this.highOctOffset;
      this.setNewLims(newLogMin, newLogMax);
      await this.updateAllCols(this.croppedShapeData.shape);
    },

    setNewLims(logMin: number, logMax: number) {
      const oldLogMin = Math.log2(this.extRange[0]);
      const oldLogMax = Math.log2(this.extRange[1]);
      const oldHeight = this.shapeData.shape[0];
      let yMin = (logMin - oldLogMin) / (oldLogMax - oldLogMin) * oldHeight;
      let yMax = (logMax - oldLogMin) / (oldLogMax - oldLogMin) * oldHeight;
      yMin = Math.round(yMin);
      yMax = Math.round(yMax);
      const newHeight = yMax - yMin;
      this.croppedData = this.data.slice(oldHeight - yMax, oldHeight - yMin);
      this.croppedShapeData.shape = [newHeight, this.shapeData.shape[1]];
      this.setUpCanvas(this.croppedShapeData.shape);
      this.croppedData = this.adjustPower(this.croppedData, this.intensityPower);
    },

    setUpCanvas(shape: [number, number]) {
      // const canvas = this.$refs.canvas as HTMLCanvasElement;
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.canvas.width = shape[1];
      this.canvas.height = shape[0];
      if (!this.ctx) {
        throw new Error('Could not get canvas context');
      }
      this.imgData = this.ctx.createImageData(shape[1], shape[0]);
      const scaledCanvas = this.$refs.scaledCanvas as HTMLCanvasElement;
      this.scaledCtx = scaledCanvas.getContext('2d');
      scaledCanvas.width = this.scaledWidth;
      scaledCanvas.height = this.scaledHeight;
      const xScale = this.scaledWidth / shape[1];
      const yScale = this.scaledHeight / shape[0];
      this.scaledCtx!.scale(xScale, yScale);
      
    },

    async updateColumns(
      shape: [number, number], 
      startIdx: number, 
      numColumns: number,
      selectedCMap: (x: number) => string = cMap[this.selectedCMapString]
    ){
      if (!this.ctx) {
        throw new Error('Could not get canvas context');
      }   
      const update = (selectedCMap: (x: number) => string) => {
        for (let x = startIdx; x < startIdx + numColumns && x < shape[1]; x++) {
          for (let i = 0; i < shape[0]; i++) {
            const idx = (i * shape[1] + x) * 4;
            const color = selectedCMap(this.croppedData[i][x] / 255);
            const colorObj = rgb(color);
            
            this.imgData!.data[idx] = colorObj.r;
            this.imgData!.data[idx + 1] = colorObj.g;
            this.imgData!.data[idx + 2] = colorObj.b;
            this.imgData!.data[idx + 3] = 255;
          }
        }

        this.ctx!.putImageData(this.imgData!, 0, 0, startIdx, 0, numColumns, shape[0]);
        // draw sa
        const logSa = Math.log2(this.saFreq);
        const logMin = logSa - this.lowOctOffset;
        const logMax = logSa + this.highOctOffset;
        const y = shape[0] - (logSa - logMin) / (logMax - logMin) * shape[0];

        this.ctx!.strokeStyle = 'red';
        this.ctx!.beginPath();
        this.ctx!.moveTo(startIdx, y);
        this.ctx!.lineTo(startIdx + numColumns, y);
        this.ctx!.stroke();
        // const canvas = this.$refs.canvas as HTMLCanvasElement;
        // this.scaledCtx!.drawImage(canvas, 0, 0);
        this.scaledCtx!.drawImage(this.canvas!, startIdx, 0, numColumns, shape[0], startIdx, 0, numColumns, shape[0]);
      };
      return new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          update(selectedCMap);
          resolve();
        });
      });
    }

  }
})
</script>
<style scoped>

img {
  height: 500px;
  display: block;
  filter: brightness(50%) contrast(150%) sepia(100%) hue-rotate(-50deg);

}

.img-container {
  position: relative;
  display: inline-block;
}

.canvas-container {
  position: relative;
  display: inline-block;
  overflow: scroll;
}

.scaled-canvas-container {
  position: relative;
  display: inline-block;
  overflow-x: scroll;
  /* overflow-y: hidden; */

}

.controls {
  display: flex;
  flex-direction: column;
}

.controls-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.controls-row > * {
  margin-right: 5px;
  margin-left: 5px;
}


.controls-row > input {
  width: 45px;
} 

.controls-title-row {
  margin-top: 10px;
  margin-bottom: 5px;
  font-size: 1.2em;
  font-weight: bold;
  text-align: left;
}

.controls-title-row > label {
  margin-right: 5px;
  margin-left: 5px;
}

.top {
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: scroll;
  /* height: 700px; */
  /* position: relative; */
}
</style>