import * as d3CMap from 'd3-scale-chromatic';
import { CMap } from '../types.ts';
import { rgb } from 'd3-color';
import ndarray, { NdArray } from 'ndarray';
import ops from 'ndarray-ops';
import pako from 'pako';

import { MessageType, ProcessMessage, WorkerMessage } from '@/ts/types.ts';

let initData: NdArray | undefined = undefined;
let croppedData: NdArray | undefined = undefined;
let scaledData: NdArray | undefined = undefined;
let intensifiedData: NdArray | undefined = undefined;
let imgData: ImageData | undefined = undefined;
let extData: Uint8Array | undefined = undefined;
let extDataShape: [number, number] | undefined = undefined;

let initLogMin = Math.log2(75);
let initLogMax = Math.log2(2400);
let scaledShape: [number, number] | undefined = undefined;
let power = 1;
let maxVal = 255;
let cMapName = CMap.Viridis;
let processing = false;
let complete = false;

let verbose = false;

const processChunk = async (
  reader: ReadableStreamDefaultReader,
  inflator: pako.Inflate
) => {
  const { done, value } = await reader.read();
  if (done) {
    inflator.push(new Uint8Array(), true);
    return;
  }
  inflator.push(value, false);
  if (inflator.err) {
    throw new Error(`pakeo error: ${inflator.err}`);
  }
  console.log('processing chunk')
  await processChunk(reader, inflator);

}

const crop = (logMin: number, logMax: number) => {
  if (initData === undefined) {
    throw new Error('Initial data must be provided');
  }
  let now: number | undefined = undefined;
  if (verbose) {
    now = performance.now() as number;
  }
  const initHeight = initData.shape[0];
  let yMin = (logMin - initLogMin) / (initLogMax - initLogMin) * initHeight;
  let yMax = (logMax - initLogMin) / (initLogMax - initLogMin) * initHeight;
  yMin = Math.floor(yMin);
  yMax = Math.ceil(yMax);
  const newHeight = yMax - yMin;
  croppedData = initData
    .lo(initHeight - yMax, logMax)
    .hi(newHeight, initData.shape[1]);
  // set max val
  maxVal = ops.sup(croppedData);
  if (verbose) {
    self.postMessage(`crop time: ${performance.now() - now!}`);
  }
  scale();
};
const scale = () => {
  if (scaledShape === undefined) {
    throw new Error('Scaled shape must be provided');
  }
  if (croppedData === undefined) {
    throw new Error('Cropped data must be provided');
  }
  let now: number | undefined = undefined;
  if (verbose) {
    now = performance.now() as number;
  }
  const [newHeight, newWidth] = scaledShape as [number, number];
  const [oldHeight, oldWidth] = croppedData.shape;
  scaledData = ndarray(new Array(newHeight * newWidth), scaledShape);
  const yScale = oldHeight / newHeight;
  const xScale = oldWidth / newWidth;
  for (let i = 0; i < newHeight; i++) {
    for (let j = 0; j < newWidth; j++) {
      const y = i * yScale;
      const x = j * xScale;
      const y1 = Math.floor(y);
      const y2 = Math.ceil(y);
      const x1 = Math.floor(x);
      const x2 = Math.ceil(x);
      const a = y - y1;
      const b = x - x1;
      const val = (1 - a) * (1 - b) * croppedData.get(y1, x1) +
        (1 - a) * b * croppedData.get(y1, x2) +
        a * (1 - b) * croppedData.get(y2, x1) +
        a * b * croppedData.get(y2, x2);
      scaledData.set(i, j, val);
    }
  }
  const emptyImgData = new Uint8ClampedArray(newWidth * newHeight * 4);
  imgData = new ImageData(emptyImgData, newWidth, newHeight);
  if (verbose) {
    self.postMessage(`scale time: ${performance.now() - now!}`);
  }
  intensify();
}

const intensify = () => {
  if (scaledData === undefined) {
    throw new Error('Scaled data must be provided');
  }
  let now: number | undefined = undefined;
  if (verbose) {
    now = performance.now() as number;
  }
  console.log(scaledData)
  intensifiedData = ndarray(new Array(scaledData.size), scaledData.shape);

  // this should work, but doesn't for some reason.
  // ops.pows(intensifiedData, scaledData, power);
  // ops.divseq(intensifiedData, maxVal / 255);

  // so, instead: 
  const adjust = (x: number) => {
    return (Math.pow(x, power) / maxVal) * 255;
  }
  const floatData = new Float32Array(scaledData.data as Uint8Array);
  const adjustedData = floatData.map(adjust);
  intensifiedData.data = new Uint8Array(adjustedData);
  if (verbose) {
    self.postMessage(`intensify time: ${performance.now() - now!}`);
  }
  colorize();
}

const setPixelData = (
  x: number,
  y: number,
  colorObj: { r: number, g: number, b: number }
) => {
  if (imgData === undefined) {
    throw new Error('Image data must be provided');
  }
  const idx = (y * imgData.width + x) * 4;
  imgData.data[idx] = colorObj.r;
  imgData.data[idx + 1] = colorObj.g;
  imgData.data[idx + 2] = colorObj.b;
  imgData.data[idx + 3] = 255;
};

const colorize = () => {
  if (imgData === undefined) {
    throw new Error('Image data must be provided');
  }
  if (intensifiedData === undefined) {
    throw new Error('Intensified data must be provided');
  }
  let now: number | undefined = undefined;
  if (verbose) {
    now = performance.now()
  }
  const cMapObj = d3CMap[cMapName];
  for (let i = 0; i < imgData.height; i++) {
    for (let j = 0; j < imgData.width; j++) {
      const val = intensifiedData.get(i, j);
      const colorObj = rgb(cMapObj(val / 255));
      setPixelData(j, i, colorObj);
    }
  }
  console.log(intensifiedData)
  processing = false;
  console.log('getting to here')
  complete = true;
  if (verbose) {
    self.postMessage(`colorize time: ${performance.now() - now!}`);
  }
  self.postMessage('done processing')
};


const waitUntilComplete = async () => {
  while (!complete) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  if (e.data.msg === 'process') {
    complete = false;
    const data = e.data.payload as ProcessMessage;
    const {
      type,
      logMin,
      logMax,
      newScaledShape,
      newPower,
      newCMap,
      audioID,
      newVerbose
    } = data;

    if (type === 'initial') {
      // if (extData === undefined || extDataShape === undefined) {
      //   throw new Error('Initial data and shape must be provided');
      // }
      if (audioID === undefined) {
        throw new Error('Audio ID must be provided');
      }

      if (logMin === undefined || logMax === undefined) {
        throw new Error('Log min and max must be provided');
      }
      if (newScaledShape === undefined) {
        throw new Error('Scaled shape must be provided');
      }
      if (newPower !== undefined) {
        power = newPower;
      }
      if (newCMap !== undefined) {
        cMapName = newCMap;
      }
      if (newVerbose !== undefined) {
        verbose = newVerbose;
        console.log('verbose', verbose)
      }
      console.log('processing')
      processing = true;
      const dataUrl = 'https://swara.studio/spec_data/' + audioID + '/spec_data.gz';
      const shapeUrl = 'https://swara.studio/spec_data/' + audioID + '/spec_shape.json';
      const fetchArrayBuf = async () => {
        console.log('fetching array buf')
        let now: number | undefined = undefined;
        if (verbose) {
          now = performance.now() as number;
        }
        const res = await fetch(dataUrl);
        if (verbose) {
          self.postMessage(`fetch time: ${performance.now() - now!}`);
          now = performance.now() as number;
        }
        // const reader = res.body!.getReader();
        // const inflator = new pako.Inflate();
        // inflator.onData = (chunk: Uint8Array) => {
        //   // console.log('chunk', chunk.length);
        // }
        // await processChunk(reader, inflator);

        // if (inflator.err) {
        //   throw new Error(`pakeo error: ${inflator.err}`);
        // }
        const arrayBuf = await res.arrayBuffer();
        const data = pako.inflate(new Uint8Array(arrayBuf))
        // const arrayBuf = await res.arrayBuffer();
        if (verbose) {
          self.postMessage(`array buffer time: ${performance.now() - now!}`);
        }
        // const data = pako.inflate(new Uint8Array(arrayBuf));
        return data;
      }
      const fetchShape = async () => {
        const res = await fetch(shapeUrl);
        const shape = await res.json() as { shape: [number, number] };
        return shape.shape;
      }
      try {
        const dataPromise = fetchArrayBuf();
        const shapePromise = fetchShape();
        [extData, extDataShape] = await Promise.all([
          dataPromise,
          shapePromise
        ])
      } catch (err) {
        console.error(err);
      }
      if (extData === undefined || extDataShape === undefined) {
        throw new Error('Data and shape must be provided');
      }
      initData = ndarray(extData, extDataShape);
      scaledShape = newScaledShape;
      crop(logMin, logMax);
    } else if (type === 'crop') {
      if (logMin === undefined || logMax === undefined) {
        throw new Error('Log min and max must be provided');
      }
      processing = true;
      crop(logMin, logMax);
    } else if (type === 'scale') {
      if (newScaledShape === undefined) {
        throw new Error('Scaled shape must be provided');
      }
      processing = true;
      scaledShape = newScaledShape;
      scale();
    } else if (type === 'power') {
      if (newPower === undefined) {
        throw new Error('Power must be provided');
      }
      processing = true;
      power = newPower;
      intensify();
    } else if (type === 'color') {
      if (newCMap === undefined) {
        throw new Error('Color map must be provided');
      }
      processing = true;
      cMapName = newCMap;
      colorize();
    }
  } else if (e.data.msg === 'requestRenderData') {
    // first, wait until processing is done, how to do this like a promise?
    if (!complete) {
      console.log('waiting until complete')
      await waitUntilComplete();
      console.log('done waiting')
    }

    // grab the slice of image data and send it back
    if (imgData === undefined) {
      throw new Error('Image data must be provided');
    }
    const { canvasIdx, startX, width } = e.data.payload as { 
      canvasIdx: number, 
      startX: number, 
      width: number 
    };
    const slice = new Uint8ClampedArray(width * imgData.height * 4);
    for (let y = 0; y < imgData.height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * imgData.width + x + startX) * 4;
        const destIdx = (y * width + x) * 4;
        [0, 1, 2, 3].forEach(i => {
          slice[destIdx + i] = imgData!.data[srcIdx + i];
        });
      }
    };
    const sliceImgData = new ImageData(slice, width, imgData.height);
    const msg = {
      msg: 'render',
      payload: sliceImgData,
      canvasIdx: canvasIdx,
    }
    self.postMessage(msg, [slice.buffer]);
  }
} 