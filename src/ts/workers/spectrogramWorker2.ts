import * as d3CMap from 'd3-scale-chromatic';
import { CMap } from '../types.ts';
import { rgb } from 'd3-color';
import ndarray, { NdArray } from 'ndarray';
import ops from 'ndarray-ops';

type MessageType = 'initial' | 'crop' | 'scale' | 'power' | 'color';

interface WorkerMessage {
  type: MessageType;
  extData?: number[];
  extDataShape?: [number, number];
  logMin?: number;
  logMax?: number;
  newScaledShape?: [number, number];
  newPower?: number;
  newCMap?: CMap;

}

let initData: NdArray | undefined = undefined;
let croppedData: NdArray | undefined = undefined;
let scaledData: NdArray | undefined = undefined;
let intensifiedData: NdArray | undefined = undefined;
let imgData: ImageData | undefined = undefined;

let initLogMin = Math.log2(75);
let initLogMax = Math.log2(2400);
let scaledShape: [number, number] | undefined = undefined;
let power = 1;
let maxVal = 255;
let cMapName = CMap.Viridis;
let priorityRange: [number, number] = [0, 1];

const scale = () => {
  if (scaledShape === undefined) {
    throw new Error('Scaled shape must be provided');
  }
  if (croppedData === undefined) {
    throw new Error('Cropped data must be provided');
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
}

const intensify = () => {
  if (scaledData === undefined) {
    throw new Error('Scaled data must be provided');
  }
  intensifiedData = ndarray(new Array(scaledData.size), scaledData.shape);

  // this should work, but doesn't for some reason.
  // ops.pows(intensifiedData, scaledData, power);
  // ops.divseq(intensifiedData, maxVal / 255);

  // so, instead: 
  const adjust = (x: number) => {
    return (Math.pow(x, power) / maxVal) * 255;
  }
  intensifiedData.data = (intensifiedData.data as Uint8Array).map(adjust);
}


const crop = (logMin: number, logMax: number) => {
  if (initData === undefined) {
    throw new Error('Initial data must be provided');
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
};

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
  const cMapObj = d3CMap[cMapName];
  for (let i = 0; i < imgData.height; i++) {
    for (let j = 0; j < imgData.width; j++) {
      const val = intensifiedData.get(i, j);
      const colorObj = rgb(cMapObj(val / 255));
      setPixelData(j, i, colorObj);
    }
  }
};


self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { 
    type, 
    extData, 
    extDataShape,
    logMin,
    logMax,
    newScaledShape,
    newPower,
    newCMap
  } = e.data;

  if (type === 'initial') {
    if (extData === undefined || extDataShape === undefined) {
      throw new Error('Initial data and shape must be provided');
    }
    initData = ndarray(extData, extDataShape);
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
    scaledShape = newScaledShape;
    crop(logMin, logMax);
    scale();
    intensify();
    colorize();
  } else if (type === 'crop') {
    if (logMin === undefined || logMax === undefined) {
      throw new Error('Log min and max must be provided');
    }
    crop(logMin, logMax);
    scale();
    intensify();
    colorize();
  } else if (type === 'scale') {
    if (newScaledShape === undefined) {
      throw new Error('Scaled shape must be provided');
    }
    scaledShape = newScaledShape;
    scale();
    intensify();
    colorize();
  } else if (type === 'power') {
    if (newPower === undefined) {
      throw new Error('Power must be provided');
    }
    power = newPower;
    intensify();
    colorize();
  } else if (type === 'color') {
    if (newCMap === undefined) {
      throw new Error('Color map must be provided');
    }
    cMapName = newCMap;
    colorize();
  }
}; 