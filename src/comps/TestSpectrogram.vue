<template>
  <div class='topConatiner'>
    <div class='top'>
      <h1>TestSpectrogram</h1>
      <!-- <div class='scaled-canvas-container'>
      </div> -->
      <SpectrogramLayer
        :width='scaledWidth'
        :height='scaledHeight'
        ref='spectrogramLayer'
        @render='renderCanvas'
      />
      <div class='controls-container'>
        <div class='controls'>
          <div class='controls-row'>
            <label>Sa Freq</label>
            <input type='number' v-model='saFreq'>
            <button @click='updateSa(saFreq)'>Update sa / lims</button>
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
            <button @click='updateColorMap'>Update Color Map</button>
          </div>
          <div class='controls-row'>
            <select v-model='selectedCMapString'>
              <option 
                v-for='(cMap, i) in cMaps'
                :key='i'
                :value='cMap'
                >{{cMap}}</option>
            </select>
          </div>
          <div class='controls-title-row'>
            <label>Intensity Power</label>
            <button @click='updateIntensity'>Update Intensity</button>
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
            <button @click='updateScale'>Update Scale</button>
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
    </div>
  </div>
</template>
<script lang='ts'>
import { defineComponent } from 'vue';
import * as cMap from 'd3-scale-chromatic';
import SpectrogramLayer from '@/comps/editor/renderer/SpectrogramLayer.vue';
import { RenderCall } from '@/ts/types.ts';

(function() {
  if (typeof global === 'undefined') {
    (window as any).global = window;
  }
})();

const isSequentialScheme = (key: string) => {
  return key.startsWith('interpolate');
}
const sequentialSchemes = Object.keys(cMap).filter(isSequentialScheme);
// console.log(sequentialSchemes);
import { rgb } from 'd3-color';
import pako from 'pako';
// import * as tf from '@tensorflow/tfjs';
import ndarray from 'ndarray';
import { NdArray } from 'ndarray';
import ops from 'ndarray-ops';
// import resample from 'ndarray-resample';




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
  canvas?: HTMLCanvasElement,
  ndArrData?: NdArray,
  croppedNdrData?: NdArray,
  ndrScaledData?: NdArray,
  worker?: Worker,
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
      scaledWidth: 21000,
      scaledHeight: 600,
      canvas: undefined,
      ndArrData: undefined,
      croppedNdrData: undefined,
      ndrScaledData: undefined,
      worker: undefined
    }
  },

  async mounted() {
    const workerURL = new URL('@/ts/workers/spectrogramWorker2.ts', import.meta.url);
    this.worker = new Worker(workerURL, { type: 'module' });
    const logSa = Math.log2(this.saFreq);
    const low = logSa - this.lowOctOffset;
    const high = logSa + this.highOctOffset;

    const processOptions = {
      type: 'initial',
      logMin: low,
      logMax: high,
      newScaledShape: [this.scaledHeight, this.scaledWidth],
      audioID: "63f79ab44ffa426afde2f685",
      newVerbose: true
    };

    this.worker.postMessage({
      msg: 'process',
      payload: processOptions
    });

    this.worker.onmessage = (e) => {
      if (e.data.msg === 'render') {
        const imgData = e.data.payload as ImageData;
        const canvasIdx = e.data.canvasIdx as number;
        const sLayer = this.$refs.spectrogramLayer as typeof SpectrogramLayer;
        sLayer.ctxs[canvasIdx].putImageData(imgData, 0, 0);
      } else {
        console.log(e.data);
      }
    }
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

  components: {
    SpectrogramLayer
  },

  methods: {

    renderCanvas({ canvasIdx, startX, width }: RenderCall) {
      // send a signal to the worker to request the img data associated with x 
      // and width. If the worker is not done yet, then wait for it to finish.
        // console.log('renderCanvas', startX, width);
      this.worker?.postMessage({
        msg: 'requestRenderData',
        payload: {
          startX,
          width,
          canvasIdx
        }
      });
    },

    ndArrWay(oneDData: Uint8Array, shape: [number, number]) {
      this.ndArrData = ndarray(oneDData, shape);
      const logSa = Math.log2(this.saFreq);
      const low = logSa - this.lowOctOffset;
      const high = logSa + this.highOctOffset;
      this.ndrSetNewLims(low, high);
      this.ndrRescale();
      console.log(this.ndrScaledData);
      this.ndrAdjustPower();
      this.ndrUpdateAll();
    },

    xRangeInView(): [number, number] {
      const canvasContainer = document.querySelector('.scaled-canvas-container') as HTMLElement;
      const rect = canvasContainer.getBoundingClientRect();
      const viewLeft = canvasContainer.scrollLeft;
      const viewRight = viewLeft + rect.width;
      const canvas = this.$refs.ndrScaledCanvas as HTMLCanvasElement;
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

    ndrAdjustPower() {
      console.log(this.intensityPower)
      
      if (this.intensityPower === 1) {
        return
      }
      let globalMax = ops.sup(this.ndrScaledData!);
      console.log(globalMax)
      const maxVal = Math.pow(globalMax, this.intensityPower);

      // ops.powseq(this.ndrScaledData!, this.intensityPower);
      // ops.divseq(this.ndrScaledData!, maxVal / 255);


      // adjust intensity, scaled to global max
      // let adjustedData = ndarray(this.ndrScaledData!.data, this.ndrScaledData!.shape);
      // console.log(this.ndrScaledData);
      // ops.powseq(this.ndrScaledData, this.intensityPower);
      // ops.divseq(this.ndrScaledData, maxVal / 255);
      // ops.mulseq(this.ndrScaledData, 255);
      const adjust = (x: number) => {
        return (Math.pow(x, this.intensityPower) / maxVal) * 255;
      }
      this.ndrScaledData!.data = (this.ndrScaledData!.data as number[]).map(adjust);


      // this.ndrScaledData = this.ndrScaledData;
      console.log(this.ndrScaledData);

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
      const numCols = 20;
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

      const processOptions = {
        type: 'crop',
        logMin: newLogMin,
        logMax: newLogMax,
      }
      this.worker?.postMessage({
        msg: 'process',
        payload: processOptions
      });
      // reset observer
      const sLayer = this.$refs.spectrogramLayer as typeof SpectrogramLayer;
      sLayer.resetObserver();
    },

    updateColorMap() {
      const processOptions = {
        type: 'color',
        newCMap: this.selectedCMapString
      };
      this.worker?.postMessage({
        msg: 'process',
        payload: processOptions
      });
      const sLayer = this.$refs.spectrogramLayer as typeof SpectrogramLayer;
      sLayer.resetObserver();

    },

    updateIntensity() {
      const processOptions = {
        type: 'power',
        newPower: this.intensityPower
      };
      this.worker?.postMessage({
        msg: 'process',
        payload: processOptions
      });
      const sLayer = this.$refs.spectrogramLayer as typeof SpectrogramLayer;
      sLayer.resetObserver();

    },

    updateScale() {
      const processOptions = {
        type: 'scale',
        newScaledShape: [this.scaledHeight, this.scaledWidth]
      };
      this.worker?.postMessage({
        msg: 'process',
        payload: processOptions
      });
      const sLayer = this.$refs.spectrogramLayer as typeof SpectrogramLayer;
      sLayer.resetCanvases();


    },

    setNewLims(logMin: number, logMax: number) {
      let startTime = performance.now();
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
      // this.setUpCanvas(this.croppedShapeData.shape);
      this.croppedData = this.adjustPower(this.croppedData, this.intensityPower);
      console.log('setNewLims', performance.now() - startTime);
    },

    ndrSetNewLims(logMin: number, logMax: number) {
      let startTime = performance.now();
      const oldLogMin = Math.log2(this.extRange[0]);
      const oldLogMax = Math.log2(this.extRange[1]);
      const oldHeight = this.shapeData.shape[0];
      let yMin = (logMin - oldLogMin) / (oldLogMax - oldLogMin) * oldHeight;
      let yMax = (logMax - oldLogMin) / (oldLogMax - oldLogMin) * oldHeight;
      yMin = Math.round(yMin);
      yMax = Math.round(yMax);
      const newHeight = yMax - yMin;

      // crop the ndarray
      this.croppedNdrData = this.ndArrData!
        .lo(oldHeight - yMax, 0)
        .hi(newHeight, this.shapeData.shape[1]);
      console.log('ndrSetNewLims', performance.now() - startTime);
    },

    ndrRescale() {
      let startTime = performance.now();
      this.ndrScaledData = this.bilinearRescale(this.croppedNdrData!);
      console.log('ndrRescale', performance.now() - startTime);
    },

    async ndrUpdateAll() {
      const numCols = 50;
      const tot = Math.ceil(this.croppedShapeData.shape[1] / numCols);
      let startIs = Array.from({length: tot}, (_, i) => i);
      const [leftProp, rightProp] = this.xRangeInView();
      const leftPropI = Math.floor(leftProp * tot);
      const rightPropI = Math.ceil(rightProp * tot);
      const desiredSeg = startIs.slice(leftPropI, rightPropI);
      const initSeg = startIs.slice(0, leftPropI);
      const endSeg = startIs.slice(rightPropI);
      startIs = desiredSeg.concat(initSeg, endSeg);
      for (const startI of startIs) {
        await this.ndrUpdateColumns(startI * numCols, numCols);
      }

    },

    async ndrUpdateColumns(
      startIdx: number, 
      numColumns: number, 
      selectedCMap: (x: number) => string = cMap[this.selectedCMapString]
    ) {
      if (!this.ndrScaledCtx) {
        throw new Error('Could not get canvas context');
      }   
      const update = (selectedCMap: (x: number) => string) => {
        for (let x = startIdx; x < startIdx + numColumns && x < this.scaledWidth; x++) {
          for (let i = 0; i < this.scaledHeight; i++) {
            const idx = (i * this.scaledWidth + x) * 4;
            const color = selectedCMap(this.ndrScaledData!.get(i, x) / 255);
            const colorObj = rgb(color);
            
            this.ndrImgData!.data[idx] = colorObj.r;
            this.ndrImgData!.data[idx + 1] = colorObj.g;
            this.ndrImgData!.data[idx + 2] = colorObj.b;
            this.ndrImgData!.data[idx + 3] = 255;
          }
        }

        this.ndrScaledCtx!.putImageData(this.ndrImgData!, 0, 0, startIdx, 0, numColumns, this.scaledHeight);
        // draw sa
        const logSa = Math.log2(this.saFreq);
        const logMin = logSa - this.lowOctOffset;
        const logMax = logSa + this.highOctOffset;
        const y = this.scaledHeight - (logSa - logMin) / (logMax - logMin) * this.scaledHeight;

        this.ndrScaledCtx!.strokeStyle = 'red';
        this.ndrScaledCtx!.beginPath();
        this.ndrScaledCtx!.moveTo(startIdx, y);
        this.ndrScaledCtx!.lineTo(startIdx + numColumns, y);
        this.ndrScaledCtx!.stroke();
        // const canvas = this.$refs.canvas as HTMLCanvasElement;
        // this.scaledCtx!.drawImage(canvas, 0, 0);
        // this.scaledCtx!.drawImage(this.canvas!, startIdx, 0, numColumns, shape[0], startIdx, 0, numColumns, shape[0]);

        
      };
      return new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          update(selectedCMap);
          resolve();
        });
      });


    },

    bilinearRescale(inputArr: NdArray) {
      const [inputHeight, inputWidth] = inputArr.shape;
      const { scaledWidth, scaledHeight } = this;
      console.log(inputHeight, scaledHeight, inputWidth, scaledWidth)
      const outputArr = ndarray(new Uint8Array(scaledHeight * scaledWidth), [scaledHeight, scaledWidth]);
      const xScale = scaledWidth > 1 ? (inputWidth - 1) / (scaledWidth - 1) : 0;
      const yScale = scaledHeight > 1 ? (inputHeight - 1) / (scaledHeight - 1) : 0;
      console.log(xScale, yScale)

      for (let i = 0; i < scaledHeight; i++) {
        for (let j = 0; j < scaledWidth; j++) {
          const x_l = Math.floor(j * xScale);
          const x_h = Math.ceil(j * xScale);
          const y_l = Math.floor(i * yScale);
          const y_h = Math.ceil(i * yScale);

          const xWeight = j * xScale - x_l;
          const yWeight = i * yScale - y_l;

          const a = inputArr.get(y_l, x_l);
          const b = inputArr.get(y_l, x_h);
          const c = inputArr.get(y_h, x_l);
          const d = inputArr.get(y_h, x_h);

          const pxl = a * (1 - xWeight) * (1 - yWeight) +
            b * xWeight * (1 - yWeight) +
            c * (1 - xWeight) * yWeight +
            d * xWeight * yWeight;
          outputArr.set(i, j, pxl);
        }
      }
      return outputArr;
    },


  

    // bilinearRescale(inputArr: NdArray) {
    //   const [inputHeight, inputWidth] = inputArr.shape;
    //   const { scaledWidth, scaledHeight } = this;
    //   const outputArr = ndarray(new Uint8Array(scaledHeight * scaledWidth), [scaledHeight, scaledWidth]);
    //   const xScale = scaledWidth / inputWidth;
    //   const yScale = scaledHeight / inputHeight;
    //   for (let i = 0; i < scaledHeight; i++) {
    //     for (let j = 0; j < scaledWidth; j++) {
    //       const x = j * xScale;
    //       const y = i * yScale;
    //       const x0 = Math.floor(x);
    //       const x1 = Math.ceil(x);
    //       const y0 = Math.floor(y);
    //       const y1 = Math.ceil(y);
    //       const xFrac = x - x0;
    //       const yFrac = y - y0;
    //       const tl = inputArr.get(y0, x0);
    //       const tr = inputArr.get(y0, x1);
    //       const bl = inputArr.get(y1, x0);
    //       const br = inputArr.get(y1, x1);
    //       const top = tl + (tr - tl) * xFrac;
    //       const bottom = bl + (br - bl) * xFrac;
    //       const val = top + (bottom - top) * yFrac;
    //       outputArr.set(i, j, val);
    //     }
    //   }
    //   return outputArr;
    // },

    setUpCanvas(shape: [number, number]) {
      // const canvas = this.$refs.canvas as HTMLCanvasElement;
      // this.canvas = document.createElement('canvas');
      // this.ctx = this.canvas.getContext('2d');
      // this.canvas.width = shape[1];
      // this.canvas.height = shape[0];
      // if (!this.ctx) {
      //   throw new Error('Could not get canvas context');
      // }
      // this.imgData = this.ctx.createImageData(shape[1], shape[0]);
      // const scaledCanvas = this.$refs.scaledCanvas as HTMLCanvasElement;
      // this.scaledCtx = scaledCanvas.getContext('2d');
      // scaledCanvas.width = this.scaledWidth;
      // scaledCanvas.height = this.scaledHeight;
      // const xScale = this.scaledWidth / shape[1];
      // const yScale = this.scaledHeight / shape[0];
      // this.scaledCtx!.scale(xScale, yScale);

      const ndrScaledCanvas = this.$refs.ndrScaledCanvas as HTMLCanvasElement;
      this.ndrScaledCtx = ndrScaledCanvas.getContext('2d');
      ndrScaledCanvas.width = this.scaledWidth;
      ndrScaledCanvas.height = this.scaledHeight;
      this.ndrImgData = this.ndrScaledCtx.createImageData(this.scaledWidth, this.scaledHeight);

      
    },

    // async

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
  height: v-bind(scaledHeight + 'px');
  min-height: v-bind(scaledHeight + 'px')
  /* overflow-y: hidden; */

}

.controls-container {
  position: relative;
  display: inline-block;
  overflow-y: scroll;
  height: 200px;

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
  height: 1200px;
  overflow-y: scroll
  /* overflow-y: scroll; */
  /* height: 700px; */
  /* position: relative; */
}
.topContainer {
  overflow-y: scroll;
  max-height: calc(100vh - 40px);
  position: relative;


}
</style>