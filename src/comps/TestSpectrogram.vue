<template>
  <div>
    <h1>TestSpectrogram</h1>
    <canvas ref='canvas'></canvas>
  </div>
</template>
<script lang='ts'>
import { defineComponent } from 'vue';
import * as cMap from 'd3-scale-chromatic';
import { rgb } from 'd3-color';
// import img from '@/assets/gray.webp';
import pako from 'pako';
// import * as tf from '@tensorflow/tfjs';


type TestSpectrogramDataType = {
  imgData?: ImageData,
  ctx?: CanvasRenderingContext2D | null,
  data: Uint8Array[]
}
export default defineComponent({
  name: 'TestSpectrogram',
  data(): TestSpectrogramDataType {
    return {
      imgData: undefined,
      ctx: undefined,
      data: []
    }
  },

  async mounted() {
    const res = await fetch('https://swara.studio/test/test.gz');
    const buf = await res.arrayBuffer();
    const shape = await fetch('https://swara.studio/test/test_shape.json');
    const shapeData = await shape.json() as {shape: [number, number]};
    const oneDData = pako.inflate(new Uint8Array(buf));

    let max = 0
    for (let i = 0; i < shapeData.shape[0]; i++) {
      const slice = oneDData.slice(i * shapeData.shape[1], (i + 1) * shapeData.shape[1]);

      this.data.push(slice);
      max = Math.max(max, ...this.data[i]);
    }
    console.log('max', max);
    this.setUpCanvas(shapeData.shape);
    this.updateCanvas(shapeData.shape)

    // this.drawOnCanvas(this.data, shapeData.shape);
    
  },

  methods: {

    setUpCanvas(shape: [number, number]) {
      const canvas = this.$refs.canvas as HTMLCanvasElement;
      this.ctx = canvas.getContext('2d');
      canvas.width = shape[1];
      canvas.height = shape[0];
      if (!this.ctx) {
        throw new Error('Could not get canvas context');
      }
      this.imgData = this.ctx.createImageData(shape[1], shape[0]);
      console.log('done setting up')
    },

    
    // updateCanvas(shape: [number, number]) {
    //   if (!this.ctx) {
    //     throw new Error('Could not get canvas context');
    //   }
    //   let idx = 0;
    //   let j = 0; // Initialize column index

    //   const updateColumn = () => {
    //     for (let i = 0; i < shape[0]; i++) {
    //       idx = (i * shape[1] + j) * 4;
    //       const color = rgb(cMap.interpolateViridis(this.data[i][j] / 255));
    //       this.imgData!.data[idx] = color.r;
    //       this.imgData!.data[idx + 1] = color.g;
    //       this.imgData!.data[idx + 2] = color.b;
    //       this.imgData!.data[idx + 3] = 255;
    //     }
    //     this.ctx.putImageData(this.imgData!, 0, 0, j, 0, 1, shape[0]); // Update only the current column

    //     j++; // Move to the next column
    //     if (j < shape[1]) {
    //       requestAnimationFrame(updateColumn); // Schedule next column update
    //     }
    //   };

    //   updateColumn(); // Start updating columns
    // }

    // updateCanvas(shape: [number, number]) {
    //   if (!this.ctx) {
    //     throw new Error('Could not get canvas context');
    //   }
    //   let idx = 0;
    //   for (let i = 0; i < shape[0]; i++) {
    //     for (let j = 0; j < shape[1]; j++) {
    //       idx = (i * shape[1] + j) * 4;
    //       const color = rgb(cMap.interpolateViridis(this.data[i][j] / 255));
    //       this.imgData!.data[idx] = color.r
    //       this.imgData!.data[idx + 1] = color.g;
    //       this.imgData!.data[idx + 2] = color.b;
    //       this.imgData!.data[idx + 3] = 255;
    //     }
    //   }
    //   this.ctx.putImageData(this.imgData!, 0, 0);
    // },

    // updateColumn(shape: [number, number]) {
    //   for (let i = 0; i < shape[0]; i++) {
    //     idx = ()
    //   }
    // }

    // drawOnCanvas(data: Uint8Array[], shape: [number, number]) {
    //   const cMapKeys = Object.keys(cMap)
    //     .filter((key) => typeof cMap[key] === 'function');
    //   const randKey = cMapKeys[Math.floor(Math.random() * cMapKeys.length)];
    //   const canvas = this.$refs.canvas as HTMLCanvasElement;
    //   const ctx = canvas.getContext('2d');
    //   canvas.width = shape[1];
    //   canvas.height = shape[0];
    //   if (!ctx) {
    //     throw new Error('Could not get canvas context');
    //   }
    //   this.imgData = ctx.createImageData(shape[1], shape[0]);
    //   let idx = 0;
    //   for (let i = 0; i < shape[0]; i++) {
    //     for (let j = 0; j < shape[1]; j++) {
    //       idx = (i * shape[1] + j) * 4;
    //       const color = rgb(cMap[randKey](data[i][j] / 255));
    //       this.imgData.data[idx] = color.r
    //       this.imgData.data[idx + 1] = color.g;
    //       this.imgData.data[idx + 2] = color.b;
    //       this.imgData.data[idx + 3] = 255;
    //     }
    //   }
    //   ctx.putImageData(this.imgData, 0, 0);
    // }
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
/* 
.img-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: red;
  opacity: 0.3;
  pointer-events: none;
} */

</style>