import { EssentiaWASM } from "https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia-wasm.es.js";
import Essentia from "https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia.js-core.es.js";
import ooura from 'https://unpkg.com/ooura@2.1.6/ooura.js';


const essentia = new Essentia(EssentiaWASM);

// importScripts()
onmessage = async function(e) {
  // const inputSignalVector = await essentia.arrayToVector(e.data);
  // console.log(inputSignalVector)
  console.log(ooura)
  console.log(essentia)
  const frames = await essentia.FrameGenerator(e.data, 2048, 512);
  let frame0 = await frames.get(0);
  frame0 = await essentia.vectorToArray(frame0);
  console.log(frame0)


  // for (let i=0; i < frames.size(); i++) {
  //   let windowedOut = await essentia.Windowing(frames.get(i), 'hann');
  //   console.log(windowedOut.frame);
  // }
}