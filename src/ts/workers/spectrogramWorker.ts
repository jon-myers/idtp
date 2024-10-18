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
    .lo(initHeight - yMax, 0)
    .hi(newHeight, initData.shape[1]);
  // set max val
  maxVal = ops.sup(croppedData);
  if (verbose) {
    const dur = performance.now() - now!;
    self.postMessage(`crop time: ${(dur / 1000).toFixed()}`);
  }
  // test if we just need to add a little time here
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
  scaledData = ndarray(new Float32Array(newHeight * newWidth), scaledShape);
  const yScale = oldHeight / newHeight;
  const xScale = oldWidth / newWidth;
  let trigger = false;
  for (let i = 0; i < newHeight; i++) {
    for (let j = 0; j < newWidth; j++) {
      const y = i * yScale;
      const x = j * xScale;
      const y1 = Math.floor(y);
      const y2 = Math.min(Math.ceil(y), oldHeight - 1);
      const x1 = Math.floor(x);
      const x2 = Math.min(Math.ceil(x), oldWidth - 1);
      const a = y - y1;
      const b = x - x1;
      let y1x1 = croppedData.get(y1, x1);
      let y1x2 = croppedData.get(y1, x2);
      let y2x1 = croppedData.get(y2, x1);
      let y2x2 = croppedData.get(y2, x2);
      if (y1x1 === undefined) y1x1 = 0;
      if (y1x2 === undefined) y1x2 = 0;
      if (y2x1 === undefined) y2x1 = 0;
      if (y2x2 === undefined) y2x2 = 0;
      let val = (1 - a) * (1 - b) * y1x1 +
        (1 - a) * b * y1x2 +
        a * (1 - b) * y2x1 +
        a * b * y2x2;
      val = Math.round(val);
      if (Number.isNaN(val)) {
        console.log(x, y, x1, x2, y1, y2);
        debugger;
        trigger = true;
      }
      try {
        scaledData.set(i, j, val);
      } catch (err) {
        console.log('Error details:', {
          i,
          j,
          val,
          shape: scaledData.shape,
          dataLength: scaledData.data.length,
          error: err.message
        });
        throw err;
      }
    }
  }
  if (trigger) {
    console.log(croppedData.shape)
    throw new Error('NaN value found');
  }
  const emptyImgData = new Uint8ClampedArray(newWidth * newHeight * 4);
  imgData = new ImageData(emptyImgData, newWidth, newHeight);
  if (verbose) {
    const dur = performance.now() - now!;
    self.postMessage(`scale time: ${(dur / 1000).toFixed()}`);
  }
  intensify();
}

const createIntensityLUT = (maxVal: number) => {
  const lut = new Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.floor(Math.pow(i, power) / maxVal * 255);
  }
  return lut;
}

const intensify = () => {
  if (scaledData === undefined) {
    throw new Error('Scaled data must be provided');
  }
  let now: number | undefined = undefined;
  if (verbose) {
    now = performance.now() as number;
  }
  intensifiedData = ndarray(new Float32Array(scaledData.size), scaledData.shape);
  if (power !== 1) {
    const scData = scaledData.data as Uint8Array;
    maxVal = scData.reduce((acc, val) => Math.max(acc, val), 0);
    maxVal = Math.pow(maxVal, power);
    const lut = createIntensityLUT(maxVal);
    const lutData = new Uint8Array(scData);
    for (let i = 0; i < lutData.length; i++) {
      lutData[i] = lut[lutData[i]];
    }
    intensifiedData.data = lutData;
  } else {
    ops.assign(intensifiedData, scaledData);
  }
  if (verbose) {
    const dur = performance.now() - now!;
    self.postMessage(`intensify time: ${(dur / 1000).toFixed(2)}`);
  }
  colorize();
}

const createColorMapLUT = (cMapObj: any) => {
  const lut = new Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = rgb(cMapObj(i / 255));
  }
  return lut;
}

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

  // console.log(intensifiedData.data)
  const cMapObj = d3CMap[cMapName];
  const imgDataHeight = imgData.height;
  const imgDataWidth = imgData.width;
  const imgDataData = imgData.data;
  // console.log(imgDataData)
  const lut = createColorMapLUT(cMapObj);
  for (let i = 0; i < imgDataHeight; i++) {
    for (let j = 0; j < imgDataWidth; j++) {
      const dataVal = intensifiedData.get(i, j);
      const colorObj = lut[dataVal];
      const idx = (i * imgDataWidth + j) * 4;
      imgDataData[idx] = colorObj.r;
      imgDataData[idx + 1] = colorObj.g;
      imgDataData[idx + 2] = colorObj.b;
      imgDataData[idx + 3] = 255;
    }
  }
  processing = false;
  complete = true;
  if (verbose) {
    const dur = performance.now() - now!;
    self.postMessage(`colorize time: ${(dur / 1000).toFixed()}`);
  }
  if (verbose) {
    console.log('done processing');
  }
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
      }
      processing = true;
      const dataUrl = 'https://swara.studio/spec_data/' + audioID + '/spec_data.gz';
      const shapeUrl = 'https://swara.studio/spec_data/' + audioID + '/spec_shape.json';
      const fetchArrayBuf = async () => {
        let now: number | undefined = undefined;
        if (verbose) {
          now = performance.now() as number;
        }
        const res = await fetch(dataUrl);
        if (verbose) {
          const dur = performance.now() - now!;
          self.postMessage(`fetch time: ${(dur / 1000).toFixed()}`);
          now = performance.now() as number;
        }
        const arrayBuf = await res.arrayBuffer();
        const data = pako.inflate(new Uint8Array(arrayBuf))
        if (verbose) {
          const dur = performance.now() - now!;
          self.postMessage(`array buffer time: ${(dur / 1000).toFixed()}`);
        }
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
      const altArr = new Float32Array(extData);
      initData = ndarray(altArr, extDataShape);
      scaledShape = newScaledShape;
      crop(logMin, logMax);
    } else {
      self.postMessage('updateObserver');
      if (type === 'crop') {
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
    }
  } else if (e.data.msg === 'requestRenderData') {
    // first, wait until processing is done, how to do this like a promise?
    if (!complete) {
      await waitUntilComplete();
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
