<template>
  <div class='mainz'>
    <div class='waveform'>
      <!-- <div class='waveformInner'> -->
        <img :src='waveform' width='2500' height='94'/>
      <!-- </div> -->
    </div>
    <div class='saVerifier'>
      <div class='inputRow'>
        <label>Sa Estimate:</label>
        <span>{{saEstimate}}</span>
        <!-- <input type='text' v-model='saEstimate' class='saEst'> -->
      </div>
      <div class='inputRow'>
        <label>Verified:</label>
        <input type='checkbox' v-model='saVerified' class='checkBox'>
      </div>
      <div class='inputRow'>
        <input type='range' min='1.0' max='2.0' :value='0.5'
      </div>
    </div>
  </div>
</template>
<script>

import waveform from '@/assets/waveform.png';

export default {
  name: 'WaveformAnalyzer',
  
  data() {
    return {
      waveform: waveform,
      saEstimate: 100,
      saVerified: false
    }
  },
  
  mounted() {
    // this.saEstimate = this.initSaEstimate
  },
  
  computed: {
    
    linSaVal() {
      
    }
    
  },
  
  watch: {
    initSaEstimate(newVal) {
      this.saEstimate = Math.round(newVal)
    },
    
    initSaVerified(newVal) {
      this.saVerified = newVal
    }
  },
  
  props: [
    'initSaEstimate',
    'initSaVerified'
  ],
  
  methods: {
    
  }
}
</script>

<style scoped>

.mainz {
  width: 100%;
  height: 140px;
  background-color: pink;
  position: absolute;
  left: 0px;
  bottom: 100px;
  z-index: 1;
  display: flex;
  flex-direction: row;
  pointer-events: auto;
  
}

.waveform {
  height: 100%;
  width: calc(100vw - 200px);
  overflow: auto;
}



.waveform > img {
  height: calc(100% - 6px);
  /* object-fit: fill; */
}

.saVerifier {
  height: 100%;
  width: 200px;
  background-color: grey;
}

.saEst {
  width: 30px;
  margin-left: 10px;
}

.checkBox {
  width: 20px;
  height: 20px;
}

input {
  margin-left: 10px;
}

.inputRow {
  height: 30px;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
}

label {
  width: 130px;
  text-align: right;
}

span {
  margin-left: 10px;
}

</style>
