import * as d3CMap from 'd3-scale-chromatic';
import { CMap } from '../types.ts';
import { rgb } from 'd3-color';




self.onmessage = async (e: { data: { 
  // imgData: ImageData,
  // offscreenCanvas: OffscreenCanvas,
  cMapName: CMap,
  croppedData: Uint8Array[],
  croppedDataShape: [number, number],
  numCols: number,
  xRangeInView: [number, number]
}}) => {
  const { 
    // imgData, 
    // offscreenCanvas, 
    cMapName,
    croppedData,
    croppedDataShape,
    numCols,
    xRangeInView
  } = e.data;
  const cMapObj = d3CMap[cMapName];
  console.log(croppedDataShape)
  const offscreenCanvas = new OffscreenCanvas(croppedDataShape[1], croppedDataShape[0]);
  const hiddenCtx = offscreenCanvas.getContext('2d')!;
  const imgData = hiddenCtx.createImageData(croppedDataShape[1], croppedDataShape[0]);
  // console.log(imgData)
  const update = async (start: number) => {
    const c1 = (x: number) => x < start + numCols;
    const c2 = (x: number) => x < croppedDataShape[1];
    for (let x = start; c1(x) && c2(x); x++) {
      for (let i = 0; i < croppedDataShape[0]; i++) {
        const idx = (i * croppedDataShape[1] + x) * 4;
        const colorObj = rgb(cMapObj(croppedData[i][x] / 255));
        imgData!.data[idx] = colorObj.r;
        imgData!.data[idx + 1] = colorObj.g;
        imgData!.data[idx + 2] = colorObj.b;
        imgData!.data[idx + 3] = 255;
      }
    }
    const width = croppedDataShape[1];
    const height = croppedDataShape[0];
    hiddenCtx.putImageData(imgData!, 0, 0, start, 0, numCols, height);
    const imgBitmap = await createImageBitmap(offscreenCanvas, start, 0, numCols, height);
    self.postMessage({ start, imgBitmap });
  };

  const updateAllCols = async () => {
    const tot = Math.ceil(croppedDataShape[1] / numCols);
    let startIs = Array.from({ length: tot }, (_, i) => i);
    const leftPropI = Math.floor(xRangeInView[0] * tot);
    const rightPropI = Math.floor(xRangeInView[1] * tot);
    const desiredSeg = startIs.slice(leftPropI, rightPropI);
    const initSeg = startIs.slice(0, leftPropI);
    const endSeg = startIs.slice(rightPropI);
    startIs = desiredSeg.concat(initSeg).concat(endSeg);
    for (const startI of startIs) {
      await update(startI * numCols);
    }
  }
  try {
    await updateAllCols();
  } catch (e) {
    console.error(e);
  }
  // await updateAllCols();
}