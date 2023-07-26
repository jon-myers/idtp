<template>
  <div class='mainz'>
    <div class='waveform'>
      <div class='waveformInner' ref='waveform'></div>
    </div>
    <div class='saVerifier'>
      <div class='zoomCol'>
        <button @click='zoom(true)'>+</button>
        <button @click='zoom(false)'>-</button>
      </div>
      <div class='saVerifierCol'>
        <div class='inputRow'>
          <label class='saLabel'>Sa:</label>
          <span>
            {{`${(saEstimate * 2 ** Number(octOffset)).toFixed()} hz.`}}
          </span>
          <label>Verified:</label>
          <input type='checkbox' v-model='saVerified' class='checkBox'>
        </div>
        <div class='inputRow rangeSlider'>
          <label>Fine</label>
          <input 
            type='range' 
            min='-0.1' 
            max='0.1' 
            step='0.001' 
            v-model='fineTune'
            @input='updateCoarse'>
        </div>
        <div class='inputRow rangeSlider'>
          <label>Coarse</label>
          <input 
            type='range' 
            min='0.0' 
            max='1.0' 
            step='0.01' 
            v-model='coarse'
            @input='updateCoarse'>
        </div>
        <div class='inputRow rangeSlider'>
          <label>Volume</label>
          <input 
            type='range'
            min='0'
            max='1'
            step='0.01'
            v-model='sineVol'
            @input='updateVol'>
        </div>
        <div class='inputRow'>
          <label>Oct offset</label>
          <input 
            type='number' 
            v-model='octOffset' 
            min='-1' 
            max='1' 
            class='octOffset'
            >
        </div>
        <div class='inputRow button'>
          <button @click='saveSaEstimate'>Save</button>
          <button @click='generateSpectrogram'>Make Spectrogram</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang='ts'>

import { 
  updateSaEstimate, 
  getVerifiedStatus, 
  makeSpectrograms 
  } from '@/js/serverCalls.ts';

import * as d3 from 'd3';
const avg = values => values.reduce((sum, val) => sum + val, 0) / values.length;

export default {
  name: 'WaveformAnalyzer',
  
  data() {
    return {
      saEstimate: 100,
      saVerified: false,
      fineTune: 0.0,
      sineVol: 0.0,
      ac: undefined,
      lag: 0.1,
      coarse: 0.5,
      waveformWidth: 1500,
      waveformHeight: 160,
      selectedChart: 0,
      octOffset: 0
    }
  },
  
  async mounted() {
    this.ac = new AudioContext();
    this.oscNode = this.ac.createOscillator();
    this.gainNode = this.ac.createGain();
    this.oscNode.connect(this.gainNode).connect(this.ac.destination);
    this.oscNode.frequency.setValueAtTime(this.saEstimate, this.now());
    this.gainNode.gain.setValueAtTime(Number(this.sineVol), this.now());
    this.oscNode.type = 'triangle';  
    this.oscNode.start();
    
    const aeElem = this.$parent.$parent;
    if (aeElem.audioEventId !== undefined && aeElem.recIdx !== undefined) {
      const res = await getVerifiedStatus(aeElem.audioEventId, aeElem.recIdx);
      this.saEstimate = res.saEstimate;
      this.saVerified = res.saVerified;
      this.octOffset = res.octOffset;
      const cur = this.oscNode.frequency.value
      this.oscNode.frequency.setValueAtTime(cur, this.now());
      this.oscNode.frequency
        .exponentialRampToValueAtTime(this.saEstimate, this.now() + this.lag);    
      this.coarse = this.linSaVal(this.saEstimate);
    }  
    if (this.$parent.id !== undefined) this.newChart();      
  },
  
  beforeUnmount() {
    this.oscNode.stop(this.now() + this.lag);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.now());
    this.gainNode.gain.linearRampToValueAtTime(0, this.now() + this.lag)
  },
  

  watch: {
    initSaEstimate(newVal) {
      this.saEstimate = newVal;
      const cur = this.oscNode.frequency.value;
      this.oscNode.frequency.setValueAtTime(cur, this.now());
      this.oscNode.frequency
        .exponentialRampToValueAtTime(this.saEstimate, this.now() + this.lag);    
      this.coarse = this.linSaVal(newVal)
    },
    
    initSaVerified(newVal) {
      this.saVerified = newVal
    },
    
    async waveformWidth() {
      this.charts = await this.chartsFromPeaks();
      this.calculateChartWidthLims();
      this.setChart(this.selectedChart)
    },
  },
  
  props: [
    'initSaEstimate',
    'initSaVerified'
  ],
  
  methods: {

    async generateSpectrogram() {
      const id = this.$parent.$parent.audioRecId;
      const freq = this.saEstimate * 2 ** this.octOffset;
      const result = await makeSpectrograms(id, freq);
      console.log(result)
    },
    
    zoom(bool) {
      const factor = 1.2;
      
      this.waveformWidth = bool ? 
        factor * this.waveformWidth : 
        this.waveformWidth / factor;

    },
    
    async newChart() {
      try {
        const url = `https://swara.studio/peaks/${this.$parent.id}.json`;
        const response = await fetch(url);
        this.peaks = await response.json();
        this.charts = await this.chartsFromPeaks();
        this.calculateChartWidthLims();
        this.setChart(this.selectedChart);
      } catch (err) {
        console.log(err)
      }
      
      
    },
    
    _getLims() {
      const divs = Object.keys(this.peaks);
      return divs.map(div => this.peaks[div].length);
    },
    
    calculateChartWidthLims() {
      const lims = this._getLims();
      const limIdx = lims.reverse().findIndex(lim => lim > this.waveformWidth);
      let idx = lims.length - limIdx - 1;
      this.selectedChart = idx
    },
    
    now() {
      return this.ac.currentTime
    },
    
    linSaVal(hz) {
      return Math.log2(hz/100)
    },
    
    logSaVal(val) {
      return 100 * 2 ** val
    },
    
    updateVol() {
      if (this.ac.state === 'suspended') this.ac.resume();
      
      const curVol = this.gainNode.gain.value;
      this.gainNode.gain.setValueAtTime(curVol, this.now());
      this.gainNode.gain
        .linearRampToValueAtTime(Number(this.sineVol), this.now() + this.lag);
    },
    
    updateCoarse() {
      const cur = this.oscNode.frequency.value;
      this.oscNode.frequency.setValueAtTime(cur, this.now());
      const num = Number(this.coarse) + Number(this.fineTune);
      this.saEstimate = this.logSaVal(num);
      this.oscNode.frequency
        .exponentialRampToValueAtTime(this.saEstimate, this.now() + this.lag);
    },
    
    saveSaEstimate() {
      const recID = this.$parent.id;
      const aeID = this.$parent.$parent.audioEventId;
      const recIdx = this.$parent.$parent.playing[1];
      const saEst = this.saEstimate;
      const saVer = this.saVerified;
      const octOffset = this.octOffset;
      updateSaEstimate(recID, aeID, recIdx, saEst, saVer, octOffset)
    },
    
    
    async chartsFromPeaks() {
      const charts = await Object.keys(this.peaks).map(key => {
        return this.bandChart(this.peaks[key], {
          x: (_, i) => i,
          y1: d => d[1],
          y2: d => d[0],
          color: "steelblue",
          curve: d3.curveStep,
          width: this.waveformWidth,
          height: this.waveformHeight - 4
        });
      });
      return charts
    },
    
    setChart(idx) {
      this.$refs.waveform.innerHTML = '';
      this.$refs.waveform.appendChild(this.charts[idx])
    },
    
    getWaveformData(pixels) {
      const leftChannel = this.audioBuffer.getChannelData(0);
      const rightChannel = this.audioBuffer.getChannelData(1);
      const pixelLength = Math.round(leftChannel.length/pixels);
      const vals = [];
      
      const maxSampleSize = 1000;
      const sampleSize = Math.min(pixelLength, maxSampleSize);
      
      for (let i = 0; i < pixels; i++) {
        let posSum = 0;
        let negSum = 0;
        
        for (let j = 0; j < sampleSize; j++) {
          const leftVal = leftChannel[i * pixelLength + j];
          const rightVal = rightChannel[i * pixelLength + j];
          const val = avg([leftVal, rightVal]);
          
          if (val > 0) {
            posSum += val;
          } else {
            negSum += val;
          }
        }
        vals.push([negSum / sampleSize, posSum / sampleSize])
      }
      return vals;
    },
    
    bandChart(data, {
      x = ([x]) => x, // given d in data, returns the (temporal) x-value
      y1 = () => 0, // given d in data, returns the (quantitative) low value
      y2 = ([, y]) => y, // given d in data, returns the (quant) high value
      defined, // for gaps in data
      curve = d3.curveLinear, // method of interpolation between points
      marginTop = 0, // top margin, in pixels
      marginRight = 0, // right margin, in pixels
      marginBottom = 0, // bottom margin, in pixels
      marginLeft = 0, // left margin, in pixels
      width = 640, // outer width, in pixels
      height = 400, // outer height, in pixels
      xType = d3.scaleUtc, // type of x-scale
      xDomain, // [xmin, xmax]
      xRange = [marginLeft, width - marginRight], // [left, right]
      yType = d3.scaleLinear, // type of y-scale
      yDomain, // [ymin, ymax]
      yRange = [height - marginBottom, marginTop], // [bottom, top]
      // yFormat, // a format specifier string for the y-axis
      // yLabel, // a label for the y-axis
      color = "currentColor" // fill color of area
    } = {}) {
      // Compute values.
      const X = d3.map(data, x);
      const Y1 = d3.map(data, y1);
      const Y2 = d3.map(data, y2);
      const I = d3.range(X.length);
      if (defined === undefined) {
        defined = (d, i) => !isNaN(X[i]) && !isNaN(Y1[i]) && !isNaN(Y2[i])
      }
      const D = d3.map(data, defined);

      // Compute default domains.
      if (xDomain === undefined) xDomain = d3.extent(X);
      if (yDomain === undefined) {
        yDomain = d3.nice(...d3.extent([...Y1, ...Y2]), 10)
      }

      // Construct scales and axes.
      const xScale = xType(xDomain, xRange);
      const yScale = yType(yDomain, yRange);

      // Construct an area generator.
      const area = d3.area()
          .defined(i => D[i])
          .curve(curve)
          .x(i => xScale(X[i]))
          .y0(i => yScale(Y1[i]))
          .y1(i => yScale(Y2[i]));

      const svg = d3.create("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height])
          .attr("style", `max-width: 100%; height: ${this.waveformHeight-6}px`);

      svg.append("path")
          .attr("fill", color)
          .attr("d", area(I));

      return svg.node();
    }  
  }
}
</script>

<style scoped>

.mainz {
  width: 100%;
  height: 200px;
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
  width: calc(100vw - 240px);
  overflow: auto;
}

.waveformInner {
  height: 100%;
  width: v-bind(waveformWidth + 'px');
  background-color: black;
}

.saVerifier {
  height: 100%;
  width: 240px;
  background-color: grey;
  display: flex;
  flex-direction: row;
}

.saVerifierCol {
  display: flex;
  flex-direction: column;
  width: 200px;
}

.zoomCol {
  width: 40px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.zoomCol > button {
  width: 30px;
  cursor: pointer;
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

.octOffset {
  width: 30px;
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
  width: 80px;
  text-align: right;
}

span {
  margin-left: 10px;
  width: 60px
}

.rangeSlider > input {
  width: 100%;
  margin-right: 10px;
}

.rangeSlider > label {
  width: 100px;
}

.button {
  align-items: center;
  justify-content: center;
}

.saLabel {
  width: 30px
}

svg {
  width: 2500px;
}

button {
  cursor: pointer
}


</style>
