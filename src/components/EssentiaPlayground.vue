<template>
  <div class='main'></div>
</template>
<script>

// import Essentia from './essentia.js-core.web.js';
// import { EssentiaWASM } from './essentia-wasm.web.js';
// 
// let essentia = new Essentia(EssentiaWASM);
// console.log(essentia)

let esPkg = require('essentia.js')
const essentia = new esPkg.Essentia(esPkg.EssentiaWASM.EssentiaWASM)
console.log(essentia)
// const essentia = new esPkg.Essentia(esPkg.EssentiaWASM);

// console.log(esPkg.EssentiaWASM.EssentiaWASM)

// const essentia = new esPkg.Essentia(esPkg.EssentiaWASM.EssentiaWASM)

export default {
  name: 'EssentiaPlayground',
  
  data() {
    return {
      audioUrl: 'https://freesound.org/data/previews/328/328857_230356-lq.mp3',

      
    }
  },
  
  async mounted() {
    // this.ac = new AudioContext();
    // this.buffer = await essentia.getAudioBufferFromURL(this.audioUrl, this.ac);
    // this.isVector = essentia.arrayToVector(this.buffer.getChannelData(0))
    // this.outputRG = essentia.ReplayGain(this.isVector, 44100);
    // this.outputPyYin = essentia.PitchYinProbabilistic(this.isVector);
    // this.pitches = essentia.vectorToArray(this.outputPyYin.pitch);
    // this.voicedProbabilities = essentia.vectorToArray(this.outputPyYin.voicedProbabilities);
    // console.log(this.pitches)
    // console.log(this.voicedProbabilities)
  },
  
  methods: {
    
  }
}
</script>

<style scoped>

</style>
