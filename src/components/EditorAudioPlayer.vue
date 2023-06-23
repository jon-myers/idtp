<template>
  <div class="mainq" ref="main">
    <div
      class="player"
      @mouseover="hoverTrigger(true)"
      @mouseleave="hoverTrigger(false)"
      @mousemove="handleCircleMouseMove"
      @mouseup="handleCircleMouseUp"
    >
      <div class="progressBarOuter" @click="handleProgressClick" ref="pbOuter">
        <div class="progressBarInner">
          <div :class="`currentTime tooLeft`">
            {{ formattedCurrentTime }}
          </div>
          <div class="progressCircle">
            <!-- <div class="invisibleProgressCircle"></div> -->
          </div>
        </div>
        <div class="timeLeft">{{ '-' + formattedTimeLeft }}</div>
      </div>
      <div class="controlsContainer">
        <div class="spacer">
          <div class="innerSpacer"></div>
          <div class="recInfo left">
            <!-- <span>{{pieceTitle}}</span> -->
            <div class="span">
              {{ performers.join(', ') }}
            </div>
            <div class="span">{{ raags.join('; ') }}</div>
          </div>
        </div>
        <div class="controlFlexer">
          <div class="controlBox" v-if="!loading">
            <img :src="icons.back_15" @click="back_15" />
            <img :src="icons.beginning" @click="goToBeginning" />
            <div class="playCircle" @click="togglePlay">
              <img
                ref="playImg"
                :src="[icons.play, icons.pause][Number(this.playing)]"
              />
            </div>
            <img :src="icons.end" @click="trackEnd" />
            <img :src="icons.forward_15" @click="forward_15" class="icon" />
          </div>
          <div class="loadingSymbol" v-else>
            <div class="loader"></div>
          </div>
        </div>
        <div class="recInfo right">
          <div class="rulerBox">
            <img
              :src="icons.meter"
              @click="toggleMeterControls"
              class="meterImg"
              ref="meterImg"
            />
          </div>
          <div class="rulerBox">
            <img
              :src="icons.download"
              @click="toggleDownloads"
              class="downloadImg"
              ref="downloadImg"
            />
          </div>
          <div class="rulerBox">
            <img
              :src="icons.tuningFork"
              @click="toggleTuning"
              class="tuningFork"
              ref="tuningImg"
            />
          </div>
          <div class="rulerBox">
            <img 
              :src="icons.ruler" 
              @click="toggleControls" 
              ref="controlsImg" 
              class='showControls'
              />
          </div>
        </div>
      </div>
    </div>
    <div class="synthControls" v-if="showControls">
      <div class="cbBoxSmall" v-if='!noAudio'>
        <label>Recording Gain</label>
        <input 
          type="range" 
          min="0.0" 
          max="1.0" 
          step="0.01" 
          v-model="recGain" 
          orient='vertical'/>
      </div>
      <div class="cbBoxSmall">
        <label>Synthesis Gain</label>
        <input
          type="range"
          min="0.0"
          max="1.0"
          step="0.01"
          v-model="synthGain"
          orient='vertical'
          :disabled='synthGainDisabled'
        />
      </div>
      <div class="cbBoxSmall" v-if='!vocal'>
        <label>Synthesis Damping</label>
        <input
          type="range"
          min="0.0"
          max="1.0"
          step="0.01"
          v-model="synthDamp"
          orient='vertical'
        />
      </div>
      <div class="cbBoxSmall" v-if='!vocal'>
        <label>Chikari Gain</label>
        <input
          type="range"
          min="0.0"
          max="1.0"
          step="0.01"
          v-model="chikariGain"
          orient='vertical'
          :disabled='chikariGainDisabled'
        />
      </div>
      <div class='cbBoxSmall' v-if='transposable'>
        <label>Pitch Shift <br>({{transposition}}&#162;)</label>
        <input 
          type='checkbox' 
          v-model='shiftOn' 
          @click='preventSpace' 
          @change='toggleShift'
          :disabled='playing'
          />
        <input 
          type='range' 
          min='-200' 
          max='200' 
          step='1' 
          v-model='transposition'
          orient='vertical'
          :disabled='playing || !shiftOn || !readyToShift'
          />
      </div>
      <div class='cbBoxSmall' v-if='this.$parent.audioDBDoc'>
        <label>Region Speed <br>({{ (2 ** regionSpeed).toFixed(2) }})</label>
        <input 
          type='checkbox' 
          v-model='regionSpeedOn' 
          @click='preventSpace' 
          @change='toggleRegionSpeed'
          :disabled='playing || !stretchable'
          />
        <input
          type="range"
          min="-1.0"
          max="1.0"
          step="0.01"
          v-model="regionSpeed"
          orient='vertical'
          :disabled='playing || !regionSpeedOn || !stretchable'
          @mouseup='handleregionSpeedChange'
          />
      </div>

    </div>
    <div class='downloads' v-if='showDownloads'>
      <label>Data</label>
      <fieldset class='dataRadioButtons'>
        <div class='dataChoice'>
          <input 
            type='radio' 
            id='dataChoice1' 
            name='dataType' 
            value='json'
            v-model='dataChoice'
            />
          <label for='dataChoice1'>json</label>
        </div>
        <div class='dataChoice'>
          <input 
            type='radio' 
            id='dataChoice2' 
            name='dataType' 
            value='xlsx'
            v-model='dataChoice'
            />
          <label for='dataChoice2'>xlsx</label>
        </div>
      </fieldset>
      <button @click='handleDownload'>Download</button>

    </div>
    <div class='tuningControls' v-if='showTuning'>
      <div class='buttons'>
        <button @click='resetTunings'>Reset</button>
      </div>
      <div 
        :class='`tuningBox \
          ${["", "last"][Number(sIdx === sargam.length-1)]} \
          ${["", "first"][Number(sIdx === 0)]}
        `' 
        v-for='(s, sIdx) in sargam' 
        :key='s'>
        <div class='sargamLetter'>
          {{s}}
        </div>
        <div class='sliders'>
          <div class='paddingCol'></div>
          <div class='leftSliderCol' v-if='sIdx !== 0'>
            <div class='label'></div>
            <div class='centsTickLabels'>
              <div class='centsLabel'>+50&#162;-</div>
              <div class='centsLabel'>0&#162;-</div>
              <div class='centsLabel'>-50&#162;-</div>
            </div>
          </div>
          <div class='sliderCol' v-if='sIdx !== 0'>
            <div class='label'>Tune</div>
            <input 
              type='range' 
              min='-50' 
              max='50' 
              step='1' 
              v-model='centDevs[sIdx]'
              @input='updateTuning(sIdx)'
              @change='instantiateTuning'
            />
          </div>
          <div class='sliderCol'>
            <div class='label'>Gain</div>
            <input 
              type='range' 
              orient='vertical' 
              min='0' 
              max='1' 
              step='0.01'
              v-model='tuningGains[sIdx]'
              @input='updateTuningGain(sIdx)'
            />
          </div>
        </div>
      </div>
    </div>
    <MeterControls 
        v-show='showMeterControls' 
        :height='controlsHeight'
        :playerHeight='playerHeight'
        :editable='editable'
        ref='meterControls'
        />
  </div>
</template>
<script>
import beginningIcon from '@/assets/icons/beginning.svg';
import endIcon from '@/assets/icons/end.svg';
import loopIcon from '@/assets/icons/loop.svg';
import back_15 from '@/assets/icons/back_15.svg';
import forward_15 from '@/assets/icons/forward_15.svg';
import pauseIcon from '@/assets/icons/pause.svg';
import playIcon from '@/assets/icons/play.svg';
import shuffleIcon from '@/assets/icons/shuffle.svg';
import rulerIcon from '@/assets/icons/ruler.svg';
import { getStarts, getEnds } from '@/js/classes.ts';
import { AudioWorklet } from '@/audio-worklet';
import tuningForkIcon from '@/assets/icons/tuning_fork.png';
import downloadIcon from '@/assets/icons/download.svg';
import meterIcon from '@/assets/icons/meter.svg';
import { excelData, jsonData } from '@/js/serverCalls.mjs';
import ksURL from '@/audioWorklets/karplusStrong.worklet.js?url';
import cURL from '@/audioWorklets/chikaris.worklet.js?url';
import caURL from '@/audioWorklets/captureAudio.worklet.js?url';
import klattURL from '@/audioWorklets/klattSynth2.worklet.js?url';
import rubberBandUrl from '@/audioWorklets/rubberband-processor.js?url';
import { createRubberBandNode as createRBNode } from 'rubberband-web';
import { detect } from 'detect-browser';
import { drag as d3Drag, select as d3Select } from 'd3';
import { Stretcher } from '@/js/stretcher.js';
import stretcherURL from '@/js/bundledStretcherWorker.js?url';
import MeterControls from '@/components/MeterControls.vue';


const structuredTime = (dur) => {
  const hours = String(Math.floor(dur / 3600));
  const minutes = leadingZeros(Math.floor((dur % 3600) / 60));
  const seconds = leadingZeros(Math.round(dur % 60));
  return { hours: hours, minutes: minutes, seconds: seconds };
};
const leadingZeros = (int) => {
  if (int < 10) {
    return '0' + int;
  } else {
    return String(int);
  }
};
export default {
  name: 'EditorAudioPlayer',
  data() {
    return {
      progress: 0.0,
      playing: false,
      looping: false,
      shuffling: false,
      showWaveform: false,
      audio: {
        paused: false,
      },
      icons: {
        beginning: beginningIcon,
        end: endIcon,
        loop: loopIcon,
        pause: pauseIcon,
        play: playIcon,
        shuffle: shuffleIcon,
        ruler: rulerIcon,
        back_15: back_15,
        forward_15: forward_15,
        download: downloadIcon,
        tuningFork: tuningForkIcon,
        meter: meterIcon,
      },
      circleDragging: false,
      formattedCurrentTime: '00:00',
      formattedTimeLeft: '00:00',
      waKey: 0,
      loading: true,
      startedAt: 0,
      pausedAt: 0,
      loop: false,
      loopStart: undefined,
      loopEnd: undefined,
      slowRamp: 1,
      bufferSourceNodes: [],
      // synthGain: 1,
      chikariGain: 0,
      lagTime: 0.1,
      showControls: true,
      recGain: 1,
      synthGain: 0,
      synthDamp: 0.5,
      valueCurveMinim: 0.001,
      pieceTitle: undefined,
      performers: [],
      raags: [],
      // playerHeight: 100,
      showTuning: false,
      showDownloads: false,
      showMeterControls: false,
      sargam: [],
      centDevs: [],
      tuningGains: [],
      srgmLtrHeight: 30,
      tuningLblHeight: 20,
      tuningGainFactor: 0.25,
      dataChoice: 'xlsx',
      noAudio: false,
      inited: false,
      modsLoaded: false,
      transposition: 0,
      transposable: false,
      string: undefined,
      vocal: undefined,
      dragStartX: undefined,
      shiftOn: false,
      readyToShift: false,
      klattActive: false,
      vowelParams: [ // f1, f2, f3, b1, b2, b3
        [[310, 2020, 2960, 45, 200, 400], [290, 2070, 2960, 60, 200, 400]],
        [[400, 1800, 2570, 50, 100, 140], [470, 1600, 2600, 50, 100, 140]],
        [[480, 1720, 2520, 70, 100, 200], [330, 2020, 2600, 55, 100, 200]],
        [[530, 1680, 2500, 60, 90, 200], [620, 1530, 2530, 60, 90, 200]],
        [[620, 1660, 2430, 70, 150, 320], [650, 1490, 2470, 70, 100, 320]],
        [[700, 1220, 2600, 130, 70, 160], [700, 1220, 2600, 130, 70, 160]],
        [[600, 990, 2570, 90, 100, 80], [630, 1040, 2600, 90, 100, 80]],
        [[620, 1220, 2550, 80, 50, 140], [620, 1220, 2550, 80, 50, 140]],
        [[540, 1100, 2300, 80, 70, 70], [450, 900, 2300, 80, 70, 70]],
        [[450, 1100, 2350, 80, 100, 80], [500, 1180, 2390, 80, 100, 80]],
        [[350, 1250, 2200, 65, 110, 140], [320, 900, 2200, 65, 110, 140]],
        [[470, 1270, 1540, 100, 60, 110], [420, 1310, 1540, 100, 60, 110]],
        [[660, 1200, 2550, 100, 70, 200], [400, 1880, 2500, 70, 100, 200]],
        [[640, 1230, 2550, 80, 70, 140], [420, 940, 2350, 80, 70, 80]],
        [[550, 960, 2400, 80, 50, 130], [360, 1820, 2450, 60, 50, 160]]
      ],
      soundtouch: undefined,
      stretchable: false,
      regionSpeed: 0.0,
      regionSpeedOn: false,
      stretchBuf: undefined,
      chikariGainDisabled: false,
      synthGainDisabled: false,
      stretchedBuffer: undefined,
    };
  },
  props: [
    'audioSource', 
    'saEstimate', 
    'saVerified', 
    'id', 
    'playerHeight', 
    'controlsHeight',
    'editable'
  ],
  components: {
    MeterControls
  },

  async mounted() {
    this.ac = new AudioContext({ sampleRate: 48000 });
    this.gainNode = this.ac.createGain();
    this.gainNode.gain.setValueAtTime(Number(this.recGain), this.now());
    this.synthGainNode = this.ac.createGain();
    this.synthGainNode.gain.setValueAtTime(Number(this.synthGain), this.now());
    this.intSynthGainNode = this.ac.createGain();
    this.intSynthGainNode.connect(this.synthGainNode);
    this.chikariGainNode = this.ac.createGain();
    this.chikariGainNode.connect(this.ac.destination);
    this.chikariGainNode.gain.setValueAtTime(this.chikariGain, this.now());
    this.synthGainNode.connect(this.ac.destination);
    this.moduleCt = 0;
    this.browser = detect();
    const mac = this.browser.os === 'Mac OS';
    const safari = this.browser.name === 'safari';
    const firefox = this.browser.name === 'firefox';
    if (mac && (!safari) && (!firefox)) {
      this.transposable = true;
    }
    this.gainNode.connect(this.ac.destination);
    
    if (this.$parent.audioDBDoc && this.$parent.piece) this.gatherInfo();
    this.synthLoopBufSourceNode = this.ac.createBufferSource();
    this.synthLoopBufSourceNode.loop = true; 
    this.addDragger();
  },
  beforeUnmount() {
    this.tuningGains.forEach((_, i) => {
      this.tuningGains[i] = 0;
      this.updateTuningGain(i)
    });
    const curGain = this.gainNode.gain.value;
    this.gainNode.gain.setValueAtTime(curGain, this.now());
    const endTime = this.now() + this.lagTime;
    this.gainNode.gain.linearRampToValueAtTime(0, endTime);
    const curSynthGain = this.synthGainNode.gain.value;
    this.synthGainNode.gain.setValueAtTime(curSynthGain, this.now());
    this.synthGainNode.gain.linearRampToValueAtTime(0, endTime);
    const curChikariGain = this.chikariGainNode.gain.value;
    this.chikariGainNode.gain.setValueAtTime(curChikariGain, this.now());
    this.chikariGainNode.gain.linearRampToValueAtTime(0, endTime);
    setTimeout(() => this.ac.close(), this.lagTime * 1000);
    this.$parent.stopAnimationFrame();
    const nodes = [
      this.gainNode,
      this.synthGainNode,
      this.klattNode,
      this.synthLoopBufSourceNode,
      this.intSynthGainNode,
      this.chikariGainNode,
      this.rubberBandNode,
      this.otherNode,
      this.chikariDCOffsetNode,
      this.intChikariGainNode,
      this.pluckNode,
      this.lowPassNode,
      this.pluckDCOffsetNode,
      this.vocalNode,
      this.synthLoopGainNode,
      this.synthLoopSource,
      this.capture,
      this.chikLoopSource,
      this.chikLoopGainNode,
    ];
    nodes.forEach(node => {
      if (node) node.disconnect();
    })
  },
  watch: {
    async audioSource(newSrc) {
      this.loading = true;
      this.audioBuffer = await this.getAudio(newSrc, false);
      this.loading = false;
      this.pausedAt = this.$parent.currentTime;
      this.updateProgress();
      this.updateFormattedCurrentTime();
      this.updateFormattedTimeLeft();
      
    },
    recGain(newGain) {
      if (this.ac.state === 'suspended') this.ac.resume();
      const currentGain = this.gainNode.gain.value;
      const gain = this.gainNode.gain;
      gain.setValueAtTime(currentGain, this.now());
      gain.linearRampToValueAtTime(newGain, this.now() + this.lagTime);
    },
    synthGain(newGain) {
      if (this.ac.state === 'suspended') this.ac.resume();
      const currentGain = this.synthGainNode.gain.value;
      const gain = this.synthGainNode.gain;
      gain.setValueAtTime(currentGain, this.now());
      gain.linearRampToValueAtTime(newGain, this.now() + this.lagTime);
    },
    synthDamp(newVal) {
      if (this.ac.state === 'suspended') this.ac.resume();
      const currentDamp = this.pluckNode.cutoff.value;
      const cutoff = this.pluckNode.cutoff;
      cutoff.setValueAtTime(currentDamp, this.now());
      cutoff.linearRampToValueAtTime(newVal, this.now() + this.lagTime);
    },
    chikariGain(newVal) {
      if (this.ac.state === 'suspended') this.ac.resume();
      const currentGain = this.chikariGainNode.gain.value;
      const gain = this.chikariGainNode.gain;
      gain.setValueAtTime(currentGain, this.now());
      gain.linearRampToValueAtTime(newVal, this.now() + this.lagTime);
    },
    transposition(cents) {
      const newVal = 2 ** (cents / 1200);
      this.rubberBandNode.setPitch(newVal);
      this.preSetFirstEnvelope(256);
      if (this.playing) {
        this.cancelPlayTrajs(this.now(), false);
        this.playTrajs(this.getCurrentTime(), this.now());
      }
      const raga = this.$parent.piece.raga;
      const freqs = raga.chikariPitches.map((p) => p.frequency);
      const transp = 2 ** (this.transposition / 1200);
      if (this.string) {
        const curFreq0 = this.otherNode.freq0.value;
        const curFreq1 = this.otherNode.freq1.value;
        this.otherNode.freq0.setValueAtTime(curFreq0, this.now());
        this.otherNode.freq1.setValueAtTime(curFreq1, this.now());
        const et = this.now() + this.lagTime;
        this.otherNode.freq0.linearRampToValueAtTime(freqs[0] * transp, et);
        this.otherNode.freq1.linearRampToValueAtTime(freqs[1] * transp, et);
      }
    }
  },
  methods: {

    reinitializeAC() {
      if (this.ac) this.ac.close();
      this.ac = new AudioContext({ sampleRate: 48000 });
      this.gainNode = this.ac.createGain();
      this.gainNode.gain.setValueAtTime(Number(this.recGain), this.now());
      this.synthGainNode = this.ac.createGain();
      this.synthGainNode.gain.setValueAtTime(Number(this.synthGain), this.now());
      this.intSynthGainNode = this.ac.createGain();
      this.intSynthGainNode.connect(this.synthGainNode);
      this.chikariGainNode = this.ac.createGain();
      this.chikariGainNode.connect(this.ac.destination);
      this.chikariGainNode.gain.setValueAtTime(this.chikariGain, this.now());
      this.synthGainNode.connect(this.ac.destination);
      this.moduleCt = 0;
      this.browser = detect();
      const mac = this.browser.os === 'Mac OS';
      const safari = this.browser.name === 'safari';
      const firefox = this.browser.name === 'firefox';
      if (mac && (!safari) && (!firefox)) {
        this.transposable = true;
      }
      this.gainNode.connect(this.ac.destination);
      
      if (this.$parent.audioDBDoc && this.$parent.piece) this.gatherInfo();
      this.synthLoopBufSourceNode = this.ac.createBufferSource();
      this.synthLoopBufSourceNode.loop = true; 
      this.inited = false;
      this.parentLoaded();
      // this.initAll();

    },

    onSoundTouchInit() {
      console.log('soundtouch initialized')
    },

    addDragger() {
      const drag = d3Drag()
        .on('start', this.dragStart)
        .on('drag', this.dragging)
        .on('end', this.dragEnd);
      d3Select('.progressCircle')
        .call(drag);
    },
    dragStart(e) {
      console.log('drag start');
      this.dragStartX = e.x;
    },
    dragging(e) {
      const diff = this.dragStartX - e.x;
      const pbi = document.querySelector('.progressBarInner');
      const pbo = document.querySelector('.progressBarOuter');
      const pboBox = pbo.getBoundingClientRect();
      pbi.style.width = pboBox.width * this.progress - diff + 'px';
      const ct = this.getCurrentTime();
      const dur = this.audioBuffer.duration;
      const newTime = ct + (dur * (e.x - this.dragStartX)) / pboBox.width;      
      this.updateFormattedCurrentTime(newTime);
      this.updateFormattedTimeLeft(newTime);
    },
    dragEnd(e) {
      const bb = this.$refs.pbOuter.getBoundingClientRect();
      const ct = this.getCurrentTime();
      const dur = this.audioBuffer.duration;
      const newTime = ct + (dur * (e.x - this.dragStartX)) / bb.width;
      if (!this.playing) {
          this.pausedAt = newTime;
          this.$parent.currentTime = this.pausedAt;
          this.$parent.movePlayhead();
          this.$parent.moveShadowPlayhead();
          this.updateProgress();
        } else {
          this.stop();
          this.pausedAt = newTime;
          this.play();
        }
        this.updateFormattedCurrentTime();
        this.updateFormattedTimeLeft();
    },
    resetTunings() {
      this.centDevs = this.centDevs.map(() => 0);
      const ratios = this.initFreqs.map(if_ => if_ / this.raga.fundamental);
      this.raga.ratios = ratios;
      this.$parent.updateSargamLines();
      this.instantiateTuning();
      this.tuningSines.forEach((oscNode, i) => {
        const curVal = oscNode.frequency.value;
        oscNode.frequency.setValueAtTime(curVal, this.now());
        const newVal = this.raga.fundamental * this.raga.ratios[i];
        oscNode.frequency.setValueAtTime(newVal, this.now() + this.lagTime);
      })
    },
    updateTuningGain(sIdx) {
      if (this.ac.suspended) this.ac.resume();
      const gainNode = this.tuningGainNodes[sIdx];
      const curGain = gainNode.gain.value;
      gainNode.gain.setValueAtTime(curGain, this.now());
      const endTime = this.now() + this.lagTime;
      const newGain = this.tuningGains[sIdx];
      gainNode.gain.linearRampToValueAtTime(newGain, endTime);
    },
    updateTuning(sIdx) {
      const oscNode = this.tuningSines[sIdx];
      const curFreq = oscNode.frequency.value;
      oscNode.frequency.setValueAtTime(curFreq, this.now());
      const endTime = this.now() + this.lagTime;
      const initFreq = this.initFreqs[sIdx];
      const newFreq = initFreq * 2 ** (this.centDevs[sIdx] / 1200);
      const newRatio = newFreq / this.raga.fundamental;
      this.raga.ratios[sIdx] = newRatio;
      oscNode.frequency.linearRampToValueAtTime(newFreq, endTime);
      this.$parent.updateSargamLines();
    },
    instantiateTuning() {
      
      this.$parent.piece.realignPitches();
      this.$parent.resetZoom();
    },
    makeTuningSines() {
      this.tuningGainNodes = [...Array(this.sargam.length)].map(() => {
        return this.ac.createGain()
      });
      this.tuningSines = [...Array(this.sargam.length)].map(() => {
          return this.ac.createOscillator()
      });
      this.tuningMasterGainNode = this.ac.createGain();
      this.tuningMasterGainNode.connect(this.ac.destination);
      this.tuningMasterGainNode.gain.setValueAtTime(0.25, this.now());
      this.tuningGainNodes.forEach((gainNode, i) => {
        gainNode.connect(this.tuningMasterGainNode);
        gainNode.gain.setValueAtTime(0, this.now());
        const osc = this.tuningSines[i];
        osc.frequency.setValueAtTime(this.currentFreqs[i], this.now());
        osc.connect(gainNode);
        osc.start();
      });
    },
    // addKlattModule(url = this.ksUrl)
    async setUpKlattNode(url, destination) {
      try {
        await this.ac.audioWorklet.addModule(url, destination);
        this.klattNode = new AudioWorkletNode(this.ac, 'klatt-synth');
        const params = this.klattNode.parameters;
        const kn = this.klattNode;
        kn.f0 = params.get('f0');
        kn.f1 = params.get('f1');
        kn.f2 = params.get('f2');
        kn.f3 = params.get('f3');
        kn.f4 = params.get('f4');
        kn.f5 = params.get('f5');
        kn.f6 = params.get('f6');
        kn.b1 = params.get('b1');
        kn.b2 = params.get('b2');
        kn.b3 = params.get('b3');
        kn.b4 = params.get('b4');
        kn.b5 = params.get('b5');
        kn.b6 = params.get('b6');
        kn.db1 = params.get('db1');
        kn.db2 = params.get('db2');
        kn.db3 = params.get('db3');
        kn.db4 = params.get('db4');
        kn.db5 = params.get('db5');
        kn.db6 = params.get('db6');
        kn.flutterLevel = params.get('flutterLevel');
        kn.openPhaseRatio = params.get('openPhaseRatio');
        kn.breathinessDb = params.get('breathinessDb');
        kn.tiltDb = params.get('tiltDb');
        kn.gainDb = params.get('gainDb');
        kn.agcRmsLevel = params.get('agcRmsLevel');
        kn.cascadeEnabled = params.get('cascadeEnabled');
        kn.cascadeVoicingDb = params.get('cascadeVoicingDb');
        kn.cascadeAspirationDb = params.get('cascadeAspirationDb');
        kn.cascadeAspirationMod = params.get('cascadeAspirationMod');
        kn.nasalFormantFreq = params.get('nasalFormantFreq');
        kn.nasalFormantFreqToggle = params.get('nasalFormantFreqToggle');
        kn.nasalFormantBw = params.get('nasalFormantBw');
        kn.nasalFormantBwToggle = params.get('nasalFormantBwToggle');
        kn.nasalAntiformantFreq = params.get('nasalAntiformantFreq');
        kn.nasalAntiformantFreqToggle = params.get('nasalAntiformantFreqToggle')
        kn.nasalAntiformantBw = params.get('nasalAntiformantBw');
        kn.nasalAntiformantBwToggle = params.get('nasalAntiformantBwToggle');
        kn.parallelEnabled = params.get('parallelEnabled');
        kn.parallelVoicingDb = params.get('parallelVoicingDb');
        kn.parallelAspirationDb = params.get('parallelAspirationDb');
        kn.parallelAspirationMod = params.get('parallelAspirationMod');
        kn.fricationDb = params.get('fricationDb');
        kn.fricationMod = params.get('fricationMod');
        kn.parallelBypassDb = params.get('parallelBypassDb');
        kn.nasalFormantDb = params.get('nasalFormantDb');
        kn.extGain = params.get('extGain');
        this.klattNode
          .connect(destination)
      } catch (e) {
        console.error(e);
      }
    },
    
    async parentLoaded() {
      this.gatherInfo();
      const instrumentation = this.$parent.piece.instrumentation[0];
      const stringInsts = [
        'Sitar', 
        'Sarod', 
        'Surbahar', 
        'Veena (Saraswati)',
        'Veena (Vichitra)',
        'Veena, Rudra (Bin)'
      ];
      const vocInsts = ['Vocal (M)', 'Vocal (F)'];
      this.string = stringInsts.includes(instrumentation);
      this.vocal = vocInsts.includes(instrumentation);
      if (this.string) {
        this.ac.audioWorklet.addModule(AudioWorklet(ksURL))
          .then(() => {
            this.moduleCt++;
            if (this.moduleCt === 3) {
              this.modsLoaded = true;
              if (!this.inited && this.$parent.piece) this.initAll();
            }
          })
          .catch((err) => {
            console.log(err);
          });
        this.ac.audioWorklet.addModule(AudioWorklet(cURL))
          .then(() => {
            this.moduleCt++;
            if (this.moduleCt === 3) {
              this.modsLoaded = true;
              if (!this.inited && this.$parent.piece) this.initAll();
            }
          })
          .catch((err) => {
            console.log(err);
          });
      } 
      
      this.ac.audioWorklet.addModule(AudioWorklet(caURL))
        .then(() => {
          this.moduleCt++;
          if (this.moduleCt === this.string ? 3 : 1) {
            this.modsLoaded = true;
            if (!this.inited && this.$parent.piece) this.initAll();
          }
        })
        .catch((err) => {
          console.log(err);
        });

      this.makeTuningSines();
      if (this.$parent.piece) {
        if (!this.$parent.piece.audioID && !this.$parent.piece.audio_DB_ID) {
          this.loading = false;
          this.noAudio = true;
          this.synthGain = 1;
          this.chikariGain = 1;
          this.recGain = 0;
          if (this.modsLoaded && !this.inited) this.initAll()
        }
      }
    },

    openMeterControls() {
      // check if classlist includes showMeterControls
      const cl = this.$refs.meterImg.classList;
      if (!cl.contains('showMeterControls')) {
        cl.toggle('showMeterControls');
        this.showMeterControls = this.showMeterControls ? false : true;
        if (this.showControls) {
          this.showControls = false;
          this.$refs.controlsImg.classList.remove('showControls');
        } else if (this.showTuning) {
          this.showTuning = false;
          this.$refs.tuningImg.classList.remove('showTuning');
        } else if (this.showDownloads) {
          this.showDownloads = false;
          this.$refs.downloadImg.classList.remove('showDownloads')
        } else {
          this.$parent.resizeHeight(this.showMeterControls);
        }
      }
    },

    stretch(tempo = 1.0) {
      if (this.stretchBuf) {
        const left = this.stretchBuf.getChannelData(0);
        const right = this.stretchBuf.numberOfChannels > 1 ?
          this.stretchBuf.getChannelData(1) : left;
        this.stretchWorker.postMessage({
          name: 'stretch',
          tempo: tempo,
          left: left,
          right: right,
        });
        this.stretchWorker.onmessage = e => {
          if (e.data.name === 'stretched') {
            this.stretchedBuffer = this.ac.createBuffer(
              2,
              e.data.left.length,
              this.ac.sampleRate
            );
            this.stretchedBuffer.copyToChannel(e.data.left, 0);
            this.stretchedBuffer.copyToChannel(e.data.right, 1);
          }
        }
      }
    },

    initStretchWorker() {
      this.stretchWorker = new Worker(stretcherURL);
    },

    handleregionSpeedChange() {
      this.stretch(2 ** this.regionSpeed);
    },

    toggleRegionSpeed() {
      if (this.regionSpeedOn) {
        this.stretch(2 ** this.regionSpeed);
        const time = this.$parent.regionStartTime;
        this.$parent.currentTime = time;
        if (!this.playing) {
          this.pausedAt = time;
          this.updateProgress();
          this.updateFormattedCurrentTime();
          this.updateFormattedTimeLeft();
        } else {
          console.log('this should not happen')
        }
        this.$parent.movePlayhead();
        this.$parent.moveShadowPlayhead();
        this.synthGainDisabled = true;
        this.chikariGainDisabled = true;
        const curSG = this.synthGainNode.gain.value;
        this.synthGainNode.gain.setValueAtTime(curSG, this.now());
        this.synthGain = 0;
        this.synthGainNode.gain
          .linearRampToValueAtTime(0, this.now() + this.lagTime);
        this.savedSynthGain = curSG;
        const curCG = this.chikariGainNode.gain.value;
        this.chikariGainNode.gain.setValueAtTime(curCG, this.now());
        this.chikariGain = 0;
        this.chikariGainNode.gain
          .linearRampToValueAtTime(0, this.now() + this.lagTime);
        this.savedChikariGain = curCG;

      } else {
        this.regionSpeed = 0;
        this.stretchedBuffer = null;
        this.synthGainDisabled = false;
        this.chikariGainDisabled = false;
        if (this.savedSynthGain !== undefined) {
          this.synthGainNode.gain.setValueAtTime(0, this.now());
          const ssg = this.savedSynthGain;
          this.synthGainNode.gain
            .linearRampToValueAtTime(ssg, this.now() + this.lagTime);
          this.synthGain = this.savedSynthGain;
        }
        if (this.savedChikariGain !== undefined) {
          this.chikariGainNode.gain.setValueAtTime(0, this.now());
          const scg = this.savedChikariGain;
          this.chikariGainNode.gain
            .linearRampToValueAtTime(scg, this.now() + this.lagTime);
          this.chikariGain = this.savedChikariGain;
        }
      }
    },

    updateStretchBuf() {
      const start = this.$parent.regionStartTime;
      const end = this.$parent.regionEndTime;
      const startSample = Math.round(start * this.ac.sampleRate);
      const endSample = Math.round(end * this.ac.sampleRate);
      // make new audio buffer
      const sr = this.ac.sampleRate;
      this.stretchBuf = this.ac.createBuffer(2, endSample - startSample, sr);
      // copy data over
      const left = this.audioBuffer
        .getChannelData(0)
        .slice(startSample, endSample+1);
      const right = this.audioBuffer.numberOfChannels > 1 ?
        this.audioBuffer.getChannelData(1).slice(startSample, endSample+1) :
        left
      this.stretchBuf.copyToChannel(left, 0);
      this.stretchBuf.copyToChannel(right, 1);
    },

    initAll() {
      if (this.string) {
        this.initializePluckNode();
        this.initializeChikariNodes();
      } else if (this.vocal) {
        const version = this.browser.version.split('.')[0];
        const c1 = this.browser.name === 'chrome';
        const c2 = this.browser.name === 'firefox' && version >= 113;
        const c3 = this.browser.name === 'edge-chromium';
        if (c1 || c2 || c3) {
          this.setUpKlattNode(klattURL, this.synthGainNode);
          this.klattActive = true
        } else {
          this.initializeVocalNode()
        }
      }
      this.initializeBufferRecorder();
      this.preSetFirstEnvelope(256);
      this.initStretchWorker();
      this.inited = true
    },
    gatherInfo() {
      const obj = this.$parent.audioDBDoc;
      if (obj) {
        const keys = Object.keys(obj.musicians).sort((a, b) => {
          return (
            this.getRoleRank(obj.musicians[a]) -
            this.getRoleRank(obj.musicians[b])
          );
        });
        this.performers = keys;
        const raags = Object.keys(obj.raags);
        const pSecs = raags.map((raag) => {
          const pSec = obj.raags[raag]['performance sections'];
          const localPSecs = Object.keys(pSec);
          return localPSecs.join(', ');
        });
        this.raags = raags.map((raag, i) => {
          return `${raag}: ${pSecs[i]}`;
        });
      }
      this.raga = this.$parent.piece.raga;
      this.ruleSet = this.$parent.piece.raga.ruleSet;
      this.ETRatios = this.raga.setRatios(this.ruleSet); // equal temperement
      this.initFreqs = this.ETRatios.map(ratio => {
        return this.raga.fundamental * ratio
      })
      this.currentFreqs = this.raga.ratios.map(ratio => {
        return this.raga.fundamental * ratio
      })
      this.sargam = this.raga.sargamLetters;
      this.centDevs = this.currentFreqs.map((cf, i) => {
        return 1200 * Math.log2(cf / this.initFreqs[i]);
      })
      this.tuningGains = [...Array(this.sargam.length)].fill(0);
    },
    getRoleRank(musician) {
      const roles = ['Soloist', 'Percussionist', 'Accompanist', 'Drone'];
      return roles.indexOf(musician.role);
    },
    playChikaris(curPlayTime, now, otherNode) {
      const gain = this.intChikariGainNode.gain;
      gain.setValueAtTime(0, now);
      gain.linearRampToValueAtTime(1, now + this.slowRamp);
      this.$parent.piece.phrases.forEach((phrase) => {
        Object.keys(phrase.chikaris).forEach((key) => {
          const time = now + phrase.startTime + Number(key) - curPlayTime;
          if (time >= this.now()) {
            this.sendNoiseBurst(time, 0.01, otherNode, 0.025, 0.2);
          }
        });
      });
    },
    cancelBursts(when) {
      if (when === undefined) when = this.now();
      let timeLag = when - this.now();
      if (timeLag < 0) timeLag = 0;
      this.bufferSourceNodes.forEach((buf) => {
        buf.stop(when);
        buf.onended = () => {
          buf.disconnect();
        }
      });
    },
    playTrajs(curPlayTime = 0, now) {
      const phrases = this.$parent.piece.phrases;
      const allTrajs = phrases.map((p) => p.trajectories).flat();
      const allStarts = getStarts(allTrajs.map((t) => t.durTot));
      const allEnds = getEnds(allTrajs.map((t) => t.durTot));
      const startIdx = allStarts.findIndex((s) => s >= curPlayTime);
      const gain = this.intSynthGainNode.gain;
      gain.setValueAtTime(0, now);
      gain.linearRampToValueAtTime(1, now + this.slowRamp);
      const remainingTrajs = allTrajs.slice(startIdx);
      remainingTrajs.forEach((traj, i_) => {
        const i = i_ + startIdx;
        this.playArticulations(traj, now + Number(allStarts[i]) - curPlayTime);
        if (traj.id !== 12) {
          const st = now + allStarts[i] - curPlayTime;
          const et = now + allEnds[i] - curPlayTime;
          const lastTraj = remainingTrajs[i_-1];
          const fromSil = i === 0 || !lastTraj || lastTraj.id === 12;
          const last = i === remainingTrajs.length - 1;
          const toSil = last || remainingTrajs[i_+1].id === 12;
          if (this.string) {
            this.playStringTraj(traj, st, et, 64, i === 0);
          } else if (this.vocal) {
            if (this.klattActive) {
              this.playKlattTraj(traj, st, et, fromSil, toSil);
            } else {
              this.playVocalTraj(traj, st, et, i === 0, fromSil, toSil);
            }
            
          }
        }
      });
    },
    playArticulations(traj, startTime) {
      //plucks
      const arts = traj.articulations;
      if (traj.id !== 12) {
        const keys = Object.keys(arts);
        const plucks = keys.filter((key) => arts[key].name === 'pluck');
        const hammerOffs = keys.filter(
          (key) => arts[key].name === 'hammer-off'
        );
        const hammerOns = keys.filter((key) => arts[key].name === 'hammer-on');
        const slides = keys.filter((key) => arts[key].name === 'slide');
        const dampens = keys.filter(key => arts[key].name === 'dampen');
        plucks.forEach((time) => {
          const when = Number(startTime) + Number(time) * Number(traj.durTot);
          this.sendNoiseBurst(when, 0.01, this.pluckNode, 0.05, 1);
        });
        hammerOffs.forEach((time) => {
          const when = Number(startTime) + Number(time) * Number(traj.durTot);
          this.sendNoiseBurst(when, 0.01, this.pluckNode, 0.05, 0.5);
        });
        hammerOns.forEach((time) => {
          const when = Number(startTime) + Number(time) * Number(traj.durTot);
          this.sendNoiseBurst(when, 0.01, this.pluckNode, 0.05, 0.3);
        });
        slides.forEach((time) => {
          const when = Number(startTime) + Number(time) * Number(traj.durTot);
          this.sendNoiseBurst(when, 0.01, this.pluckNode, 0.05, 0.1);
        });
        dampens.forEach(time => {
          const when = Number(startTime) + Number(time) * Number(traj.durTot);
          const curVal = this.pluckNode.cutoff.value;
          this.pluckNode.cutoff
            .setValueAtTime(curVal, when);
          this.pluckNode.cutoff
            .linearRampToValueAtTime(0, when + 1 * this.lagTime);
          this.pluckNode.cutoff
            .setValueAtTime(0, when + this.lagTime + 0.05)
          this.pluckNode.cutoff
            .linearRampToValueAtTime(curVal, when + this.lagTime + 0.1);
        })
      }
    },
    createCurveVals(start, duration) {
      // time in transcription, not this.ac
      const env = new Float32Array(Math.round(duration * this.valueCurveMinim));
      const computeTimes = env.map((_, i) => this.valueCurveMinim * i + start);
      const allTrajs = this.piece.phrases.map((p) => p.trajectories).flat();
      const allStarts = getStarts(allTrajs.map((t) => t.durTot));
      const computedVals = [];
      let lastVal = this.piece.raga.fundamental;
      for (let i = 0; i < computeTimes.length; i++) {
        const time = computeTimes[i];
        const traj = allTrajs[allStarts.findIndex((s) => s >= time)];
        const trajX = (time - traj.startTime) / traj.durTot;
        let val;
        if (traj.id === 12) {
          val = lastVal;
        } else {
          val = traj.compute(trajX);
          lastVal = val;
        }
        computedVals.push(val);
      }
    },
    sendNoiseBurst(when, dur, where, attack = 0.05, amp = 1) {
      amp *= 2;
      const bufSize = this.ac.sampleRate * dur;
      const noiseBuffer = this.ac.createBuffer(1, bufSize, this.ac.sampleRate);
      const attackSize = this.ac.sampleRate * attack;
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < bufSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      for (let i = 0; i < attackSize; i++) {
        output[i] *= i / attackSize;
      }
      for (let i = 0; i < bufSize; i++) {
        output[i] *= amp;
      }
      const bufferSourceNode = this.ac.createBufferSource();
      this.bufferSourceNodes.push(bufferSourceNode);
      // console.log(where)
      bufferSourceNode.connect(where);
      bufferSourceNode.buffer = noiseBuffer;
      bufferSourceNode.start(when);
    },
    playStringTraj(traj, startTime, endTime, valueCt, first = false) {
      const valueDur = 0.02;
      // this seems to be undoing valueCt; so why is it here?
      valueCt = Math.round((endTime - startTime) / valueDur);
      const freq = this.pluckNode.frequency;
      const lpFreq = this.lowPassNode.frequency;
      const verySmall = 0.000000000001;
      if (first) {
        const offset = startTime < this.now() ? this.now() - startTime : 0;
        const start = startTime + offset;
        const duration = endTime - start - verySmall;
        if (duration < 0) {
          console.log(duration, traj)
        }
        freq.setValueCurveAtTime(this.firstEnvelope, start, duration);
        lpFreq.setValueCurveAtTime(this.firstLPEnvelope, start, duration);
      } else {
        const envelope = new Float32Array(valueCt);
        const lpEnvelope = new Float32Array(valueCt);
        const transp = 2 ** (this.transposition / 1200);
        for (let i = 0; i < valueCt; i++) {
          envelope[i] = transp * traj.compute(i / (valueCt - 1));
          lpEnvelope[i] = transp * traj.compute(i / (valueCt - 1)) * 2 ** 3;
        }
        const duration = endTime - startTime - verySmall;
        if (duration < 0) {
          console.log(duration, traj)
        }
        freq.setValueCurveAtTime(envelope, startTime, duration);
        lpFreq.setValueCurveAtTime(lpEnvelope, startTime, duration);
      }
    },
    playVocalTraj(traj, startTime, endTime, first=false, 
      fromSil=false, toSil=false) {
      const lag = 0.01;
      const valueDur = 0.02;
      const valueCt = Math.round((endTime - startTime) / valueDur);
      const freq = this.vocalNode.frequency;
      const verySmall = 0.000000000001;
      if (first) {
        const offset = startTime < this.now() ? this.now() - startTime : 0;
        const start = startTime + offset;
        const duration = endTime - start - verySmall;
        if (duration < 0) {
          console.log(duration, traj)
        }
        this.vocalGainNode.gain.setValueAtTime(0, start-lag);
        this.vocalGainNode.gain.linearRampToValueAtTime(1, start);
        freq.setValueCurveAtTime(this.firstEnvelope, start, duration);
        if (toSil) {
          this.vocalGainNode.gain.setValueAtTime(1, endTime);
          this.vocalGainNode.gain.linearRampToValueAtTime(0, endTime+lag);
        }
      } else {
        const envelope = new Float32Array(valueCt);
        const transp = 2 ** (this.transposition / 1200);
        for (let i = 0; i < valueCt; i++) {
          envelope[i] = transp * traj.compute(i / (valueCt - 1));
        }
        const duration = endTime - startTime - verySmall;
        if (duration < 0) {
          console.log(duration, traj)
        }
        freq.setValueCurveAtTime(envelope, startTime, duration);
        if (fromSil) {
          this.vocalGainNode.gain.setValueAtTime(0, startTime-lag);
          this.vocalGainNode.gain.linearRampToValueAtTime(1, startTime);
        }
        if (toSil) {
          this.vocalGainNode.gain.setValueAtTime(1, endTime);
          this.vocalGainNode.gain.linearRampToValueAtTime(0, endTime+lag);
        }
      }
    },
    playKlattTraj(traj, startTime, endTime, fromSil=false, toSil=false) {
      const valueDur = 0.02;
      const valueCt = Math.round((endTime - startTime) / valueDur);
      const freq = this.klattNode.f0;
      const verySmall = 0.000000000001;
      const shwahTime = 0.3;
      const envelope = new Float32Array(valueCt);
      const transp = 2 ** (this.transposition / 1200);
      for (let i = 0; i < valueCt; i++) {
        envelope[i] = transp * traj.compute(i / (valueCt - 1));
      }
      const duration = endTime - startTime - verySmall;
      if (duration < 0) {
        console.log(duration, traj)
      }
      freq.setValueCurveAtTime(envelope, startTime, duration);
      const vowels = ['a', 'ā', 'i', 'ī', 'u', 'ū', 'ē', 'ai','ō', 'au'];
      const vpIdxs = [7, 6, 1, 0, 9, 10, 2, 3, 8, 5];
      const vIdx = traj.vowel ? vowels.indexOf(traj.vowel) : 0;
      const params = ['f1', 'f2', 'f3', 'b1', 'b2', 'b3'];
      params.forEach((param, pIdx) => {
        const idx = vpIdxs[vIdx];
        const s0 = this.vowelParams[idx][0][pIdx];
        const s1 = idx === 1 || idx === 3 ? s0 : this.vowelParams[idx][1][pIdx];
        this.klattNode[param].setValueAtTime(s0, startTime);
        this.klattNode[param]
          .linearRampToValueAtTime(s1, startTime + shwahTime);
      });
      const max = 0.125;
      if (fromSil) {
        this.klattNode.extGain.setValueAtTime(0, startTime);
        this.klattNode.extGain.linearRampToValueAtTime(max, startTime + 0.01);
      }
      if (toSil) {
        this.klattNode.extGain.setValueAtTime(max, endTime - 0.01);
        this.klattNode.extGain.linearRampToValueAtTime(0, endTime);
      }
      this.klattNode.flutterLevel.setValueAtTime(0.15, startTime);
    },
    preSetFirstEnvelope(valueCt) {
      const phrases = this.$parent.piece.phrases;
      const traj = phrases.map((p) => p.trajectories).flat()[0];
      this.firstEnvelope = new Float32Array(valueCt);
      this.firstLPEnvelope = new Float32Array(valueCt);
      const transp = 2 ** (this.transposition / 1200);
      for (let i = 0; i < valueCt; i++) {
        const x = i / (valueCt - 1);
        this.firstEnvelope[i] = transp * traj.compute(x);
        this.firstLPEnvelope[i] = transp * traj.compute(x) * 2 ** 3;
      }
    },
    async initializeChikariNodes() {
      if (this.intChikariGainNode) this.intChikariGainNode.disconnect();
      this.intChikariGainNode = this.ac.createGain();
      if (this.chikariNodes) this.chikariNodes.forEach((cn) => cn.disconnect());
      const options = { numberOfInputs: 1, numberOfOutputs: 2 };
      try {
        this.otherNode = await new AudioWorkletNode(this.ac, 'chikaris', options);
      } catch (e) {
        console.log(e);
        this.ac.audioWorklet.addModule(AudioWorklet(cURL))
          .then(() => {
            this.otherNode = new AudioWorkletNode(this.ac, 'chikaris', options);
          });
      }
      
      this.otherNode.freq0 = this.otherNode.parameters.get('freq0');
      this.otherNode.freq1 = this.otherNode.parameters.get('freq1');
      this.otherNode.cutoff = this.otherNode.parameters.get('Cutoff');
      this.otherNode.cutoff.setValueAtTime(0.7, this.now());
      this.otherNode.connect(this.intChikariGainNode, 0);
      this.otherNode.connect(this.intChikariGainNode, 1);
      this.chikariDCOffsetNode = this.ac.createBiquadFilter();
      this.chikariDCOffsetNode.type = 'highpass';
      this.chikariDCOffsetNode.frequency.setValueAtTime(5, this.now());
      this.intChikariGainNode
        .connect(this.chikariDCOffsetNode)
        .connect(this.chikariGainNode);
      const raga = this.$parent.piece.raga;
      const freqs = raga.chikariPitches.map((p) => p.frequency);
      const transp = 2 ** (this.transposition / 1200);
      this.otherNode.freq0.setValueAtTime(freqs[0] * transp, this.now());
      this.otherNode.freq1.setValueAtTime(freqs[1] * transp, this.now());
    },
    initializePluckNode() {
      if (this.pluckNode) {
        this.pluckNode.disconnect();
        this.pluckNode.port.close();
        this.pluckNode = null;
      }
      if (this.lowPassNode) this.lowPassNode.disconnect();
      this.pluckNode = new AudioWorkletNode(this.ac, 'karplusStrong');
      this.pluckDCOffsetNode = this.ac.createBiquadFilter();
      this.pluckDCOffsetNode.type = 'highpass';
      this.pluckDCOffsetNode.frequency.setValueAtTime(5, this.now());
      this.lowPassNode = this.ac.createBiquadFilter();
      this.lowPassNode.type = 'lowpass';
      const fund = this.$parent.piece.raga.fundamental;
      this.lowPassNode.frequency.setValueAtTime(fund * 2 ** 3, this.now());
      this.pluckNode
        .connect(this.pluckDCOffsetNode)
        .connect(this.lowPassNode)
        .connect(this.intSynthGainNode);
      this.pluckNode.frequency = this.pluckNode.parameters.get('Frequency');
      this.pluckNode.cutoff = this.pluckNode.parameters.get('Cutoff');
      this.pluckNode.cutoff.setValueAtTime(Number(this.synthDamp), this.now());
    },
    initializeVocalNode() {
      if (this.vocalNode) this.vocalNode.disconnect();
      this.vocalNode = this.ac.createOscillator();
      this.vocalNode.type = 'triangle';
      this.vocalGainNode = this.ac.createGain();
      this.vocalGainNode.gain.setValueAtTime(0, this.now());
      this.vocalNode
        .connect(this.vocalGainNode)
        .connect(this.intSynthGainNode);
      this.vocalNode.start();
    },  
    initializeBufferRecorder() {
      // the buffer source node
      this.synthLoopSource = this.ac.createBufferSource();
      this.synthLoopSource.loop = true;
      this.synthLoopGainNode = this.ac.createGain();
      this.synthLoopGainNode.gain.setValueAtTime(1, this.now());
      this.synthLoopSource
        .connect(this.synthLoopGainNode)
        .connect(this.synthGainNode);
      this.chikLoopSource = this.ac.createBufferSource();
      this.chikLoopSource.loop = true;
      this.chikLoopGainNode = this.ac.createGain();
      this.chikLoopGainNode.gain.setValueAtTime(1, this.now());
      this.chikLoopSource
        .connect(this.chikLoopGainNode)
        .connect(this.chikariGainNode);
      // the recorder
      const options = { numberOfInputs: 2, numberOfOutputs: 0 };
      this.capture = new AudioWorkletNode(this.ac, 'captureAudio', options);
      this.capture.bufferSize = this.capture.parameters.get('BufferSize');
      this.capture.active = this.capture.parameters.get('Active');
      this.capture.cancel = this.capture.parameters.get('Cancel');
      if (this.intSynthGainNode) {
        this.intSynthGainNode.connect(this.capture, 0, 0)
      }
      if (this.intChikariGainNode) {
        this.intChikariGainNode.connect(this.capture, 0, 1)
      }
      this.capture.port.onmessage = e => {
        
        
      const synthArr = new Float32Array(e.data[0]);
      const sr = this.ac.sampleRate;
      const synthBuffer = this.ac.createBuffer(1, synthArr.length, sr);
      synthBuffer.copyToChannel(synthArr, 0);
      const chikArr = new Float32Array(e.data[1]);
      const chikBuffer = this.ac.createBuffer(1, chikArr.length, sr);
      chikBuffer.copyToChannel(chikArr, 0);
      const offset = this.now() - this.endRecTime;
      this.synthLoopSource.buffer = synthBuffer;
      this.synthLoopSource.start(this.now(), offset);
      this.synthLoopSource.playing = true;
      this.chikLoopSource.buffer = chikBuffer;
      this.chikLoopSource.start(this.now(), offset);
      this.chikLoopSource.playing = true;
             
      }
    },

    resetPluckNode() {
      this.pluckNode.port.postMessage('kill');
      this.initializePluckNode();
    },


    async getAudio(filepath, verbose) {
      try {
        const start = await performance.now();
        const res = await fetch(filepath);
        const fetched = (await performance.now()) - start;
        if (verbose) console.log('fetched: ', fetched / 1000);
        const arrayBuffer = await res.arrayBuffer();
        const midpoint = (await performance.now()) - start;
        if (verbose) console.log('array buffd: ', midpoint / 1000);
        const audioBuffer = await this.ac.decodeAudioData(arrayBuffer);
        const endpoint = (await performance.now()) - start;
        if (verbose) console.log('done: ', endpoint / 1000);
        return audioBuffer;
      } catch (err) {
        console.log(err);
      }
    },
    back_15() {
      let newTime = this.getCurrentTime() - 15;
      if (newTime < 0) newTime = 0;
      if (!this.playing) {
        this.pausedAt = newTime;
        this.$parent.currentTime = newTime;
        this.$parent.movePlayhead();
        this.$parent.moveShadowPlayhead();
        this.updateProgress();
      } else {
        this.stop();
        this.pausedAt = newTime;
        this.play();
      }
    },
    forward_15() {
      let newTime = this.getCurrentTime() + 15;
      if (newTime > this.audioBuffer.duration) {
        newTime = this.audioBuffer.duration;
      }
      if (!this.playing) {
        this.pausedAt = newTime;
        this.$parent.currentTime = newTime;
        this.$parent.movePlayhead();
        this.$parent.moveShadowPlayhead();
        this.updateProgress();
      } else {
        this.stop();
        this.pausedAt = newTime;
        this.play();
      }
    },
    
    now() {
      return this.ac.currentTime;
    },

    playStretched() {
      const offset = (this.$parent.currentTime - this.$parent.regionStartTime);
      const scaledOffset = offset / (2 ** this.regionSpeed);
      this.sourceNode = this.ac.createBufferSource();
      this.sourceNode.connect(this.gainNode);
      this.sourceNode.buffer = this.stretchedBuffer;
      this.sourceNode.loop = this.loop;
      // const realDur = this.$parent.regionEndTime - this.$parent.regionStartTime;
      // const scaledDur = realDur / (2 ** Number(this.regionSpeed));
      // const bufDur = this.stretchedBuffer.duration;
      // this.sourceNode.playbackRate.setValueAtTime(bufDur / scaledDur, this.now());
      this.sourceNode.start(this.now(), scaledOffset);
      this.sourceNode.addEventListener('ended', () => {
        this.pauseStretched(this.playing); // this is a fancy way of saying that 
        // if the sourceNode has ended naturally (without the user pausing it),
        // then it should return to the beginning, otehrwise, stay where it is.
        this.$parent.stopStretchedAnimationFrame();
        this.$parent.currentTime = this.getStretchedCurrentTime();
      })
      this.playing = true;
      this.pausedAt = 0;
      this.startedAt = this.now() - scaledOffset;
    },

    pauseStretched(returnToStart=false) {
      const elapsed = this.now() - this.startedAt;
      let scaledElapsed = (2 ** this.regionSpeed) * elapsed;
      if (this.loop) {
        const tot = this.$parent.regionEndTime - this.$parent.regionStartTime;
        scaledElapsed = scaledElapsed % tot;
      }
      this.stopStretched();
      this.pausedAt = returnToStart ? 
        this.$parent.regionStartTime : 
        scaledElapsed + this.$parent.regionStartTime;
      this.$parent.moveShadowPlayhead();
    },

    stopStretched() {
      if (this.sourceNode) {
        this.sourceNode.stop(this.now());
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      this.playing = false;
    },

    play() {
      const offset = this.pausedAt;
      this.startingDelta = this.pausedAt;
      this.sourceNode = this.ac.createBufferSource();
      this.sourceNode.connect(this.gainNode);
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.start(this.now(), offset);
      if (this.loop && this.loopStart && this.pausedAt < this.loopEnd) {
        this.sourceNode.loop = this.loop;
        this.sourceNode.loopStart = this.loopStart;
        this.sourceNode.loopEnd = this.loopEnd;
        if (this.pausedAt > this.loopStart) {
          console.error("Can't loop a recording that starts after the loop \
          start point.")
          this.cancelPlayTrajs();
          this.cancelBursts();
          this.bufferSourceNodes = [];
          const curGain = this.intSynthGainNode.gain.value;
          this.intSynthGainNode.gain.setValueAtTime(curGain, this.now());
          const endTime = this.now() + this.lagTime;
          this.intSynthGainNode.gain.setValueAtTime(0, endTime);
        } else {
          const startRecTime = this.now() + this.loopStart - offset;
          const duration = this.loopEnd - this.loopStart;
          this.endRecTime = startRecTime + duration;
          const bufSize = duration * this.ac.sampleRate;
          this.capture.bufferSize.setValueAtTime(bufSize, this.now());
          this.capture.active.setValueAtTime(1, startRecTime);
          this.capture.active.setValueAtTime(0, this.endRecTime);
          const curGain = this.intSynthGainNode.gain.value;
          this.intSynthGainNode.gain.setValueAtTime(curGain, this.endRecTime);
          this.intSynthGainNode.gain
            .setValueAtTime(0, this.endRecTime + this.lagTime);
          this.synthLoopGainNode.gain.setValueAtTime(1, this.endRecTime);
          // the following synth stuff needs to be cancelled ...
          this.cancelPlayTrajs(this.endRecTime + this.lagTime);
          this.cancelBursts(this.endRecTime + this.lagTime);
          this.bufferSourceNodes = [];
        }
      }
      this.startedAt = this.now() - offset;
      this.pausedAt = 0;
      this.playing = true;
    },

    stop() {
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode.stop(this.now());
        this.sourceNode = null;
      }
      if (this.synthLoopSource.playing) {
        const curSynthGain = this.synthLoopGainNode.gain.value;
        this.synthLoopGainNode.gain.setValueAtTime(curSynthGain, this.now());
        const endTime = this.now() + this.lagTime;
        this.synthLoopGainNode.gain.linearRampToValueAtTime(0, endTime)
        this.synthLoopSource.stop(this.now() + this.lagTime);
        this.synthLoopSource.onended = () => {
          this.synthLoopSource.disconnect();
          this.synthLoopSource = this.ac.createBufferSource();
          this.synthLoopSource.loop = true;
          this.synthLoopSource
            .connect(this.synthLoopGainNode)
            .connect(this.synthGainNode);
        }
        const curChikGain = this.chikLoopGainNode.gain.value;
        this.chikLoopGainNode.gain.setValueAtTime(curChikGain, this.now());
        this.chikLoopGainNode.gain.linearRampToValueAtTime(0, endTime)
        this.chikLoopSource.stop(this.now() + this.lagTime);
        this.chikLoopSource.onended = () => {
          this.chikLoopSource.disconnect();
          this.chikLoopSource = this.ac.createBufferSource();
          this.chikLoopSource.loop = true;
          this.chikLoopSource
            .connect(this.chikLoopGainNode)
            .connect(this.chikariGainNode);
        }
      }
      if (this.capture.active.value === 1) {
        this.capture.active.setValueAtTime(0, this.now());
        this.capture.cancel.setValueAtTime(1, this.now());
        this.capture.cancel.setValueAtTime(0, this.now() + 0.1);
      }
      this.pausedAt = 0;
      this.startedAt = 0;
      this.playing = false;
    },

    pause() {
      const elapsed = this.now() - this.startedAt;
      this.stop();
      if (this.$parent.playheadReturn) {
        this.pausedAt = this.startingDelta;
        this.$parent.currentTime = this.startingDelta;
        this.$parent.movePlayhead();
      } else {
        this.pausedAt = this.loop ? this.loopTime : elapsed;
        this.$parent.moveShadowPlayhead();
        // this.startingDelta = this.pausedAt;
      } 
    },

    getCurrentTime() {
      if (this.pausedAt) {
        return this.pausedAt;
      } else if (this.playing) {
        if (this.loop && this.startingDelta < this.loopEnd) {
          const dur = this.loopEnd - this.loopStart;
          const realTime = this.now() - this.startedAt;
          this.loopTime = realTime;
          if (realTime > this.loopEnd) {
            this.loopTime =
              this.loopStart + ((realTime - this.loopStart) % dur);
          }
          return this.loopTime;
        } else {
          return this.now() - this.startedAt;
        }
      } else {
        return 0;
      }
    },

    getStretchedCurrentTime() {
      let out;
      if (this.pausedAt) {
        out = this.pausedAt;
      } else if (this.playing) {
        const ed = this.$parent;
        const realDur = ed.regionEndTime - ed.regionStartTime;
        const bufDur = this.stretchedBuffer.duration;
        const realStretchedSpeed = Math.log2(realDur / bufDur)
        const elapsed = this.now() - this.startedAt;
        let scaledElapsed = (2 ** realStretchedSpeed) * elapsed;
        if (this.loop) {
          const tot = this.$parent.regionEndTime - this.$parent.regionStartTime;
          scaledElapsed = scaledElapsed % tot;
        }
        out = scaledElapsed + this.$parent.regionStartTime;
      }
      return out
    },

    getShadowTime() {
      if (this.pausedAt) {
        return this.pausedAt
      } else if (this.playing) {
        return this.startingDelta
      } else {
        return 0
      }
    },
    startPlayCursorAnimation() {
      if (!this.requestId) {
        this.requestId = window.requestAnimationFrame(this.loopPlayAnimation);
      }
    },
    updateProgress() {
      if (this.noAudio) {
        this.progress = this.getCurrentTime() / this.$parent.piece.durTot;
      } else {
        this.progress = this.getCurrentTime() / this.audioBuffer.duration;
      }
      const pbi = document.querySelector('.progressBarInner');
      const pbo = document.querySelector('.progressBarOuter');
      const totWidth = pbo.getBoundingClientRect().width;
      pbi.style.width = this.progress * totWidth + 'px';
    },
    loopPlayAnimation() {
      this.requestId = undefined;
      this.updateProgress();
      this.updateFormattedCurrentTime();
      this.updateFormattedTimeLeft();
      this.$parent.currentTime = this.getCurrentTime();
      this.startPlayCursorAnimation();
    },
    stopPlayCursorAnimation() {
      if (this.requestId) {
        window.cancelAnimationFrame(this.requestId);
        this.requestId = undefined;
      }
    },
    togglePlay() {
      if (this.regionSpeedOn && this.stretchedBuffer) {
        if (!this.playing) {
          this.playStretched();
          this.$refs.playImg.classList.add('playing');
          this.$parent.startStretchedAnimationFrame();
          this.$parent.stretchedAnimationStart = this.getStretchedCurrentTime();
        } else {
          this.pauseStretched();
          this.$refs.playImg.classList.remove('playing');
          this.$parent.stopStretchedAnimationFrame();
        }
      } else {
        if (!this.playing) {
          this.play();
          this.$refs.playImg.classList.add('playing');
          this.$parent.startAnimationFrame();
          this.$parent.animationStart = this.getCurrentTime();
          this.startPlayCursorAnimation();
          this.playTrajs(this.getCurrentTime(), this.now());
          if (this.string) {
            this.playChikaris(this.getCurrentTime(), this.now(), this.otherNode);
          }
          
        } else {
          this.pause();
          this.$refs.playImg.classList.remove('playing');
          this.$parent.stopAnimationFrame();
          this.stopPlayCursorAnimation();
          this.cancelPlayTrajs();
          if (this.string) {
            this.cancelBursts();
          }
          this.bufferSourceNodes = [];
        }
      }
    },
    cancelPlayTrajs(when, mute=true) {
      if (when === undefined) when = this.now();
      if (this.string) {
        this.pluckNode.frequency.cancelScheduledValues(when);
        this.lowPassNode.frequency.cancelScheduledValues(when);
        this.pluckNode.cutoff.cancelScheduledValues(when);
      } else if (this.vocal) {
        if (this.klattActive) {
          const curGain = this.klattNode.extGain.value;
          this.klattNode.parameters.forEach(param => {
            param.cancelScheduledValues(when + 0.01);
          })
          this.klattNode.extGain.setValueAtTime(curGain, when);
          this.klattNode.extGain.linearRampToValueAtTime(0, when + 0.01);
        } else {
          this.vocalNode.frequency.cancelScheduledValues(when);
          this.vocalGainNode.gain.cancelScheduledValues(when);
          const curGain = this.vocalGainNode.gain.value;
          this.vocalGainNode.gain.setValueAtTime(curGain, when);
          this.vocalGainNode.gain.linearRampToValueAtTime(0, when + 0.01);
        }
      }
      this.intSynthGainNode.gain.cancelScheduledValues(when);
      const rampEnd = when + this.slowRamp;
      if (mute) {
        const curSynthGain = this.intSynthGainNode.gain.value;
        this.intSynthGainNode.gain.setValueAtTime(curSynthGain, when);
        this.intSynthGainNode.gain.linearRampToValueAtTime(0, rampEnd);
        if (this.string) {
          const curChikGain = this.intChikariGainNode.gain.value;
          this.intChikariGainNode.gain.setValueAtTime(curChikGain, when);
          this.intChikariGainNode.gain.linearRampToValueAtTime(0, rampEnd);
        }  
      }
      if (this.string) {
        const curCutoff = this.pluckNode.cutoff.value;
        this.pluckNode.cutoff.setValueAtTime(curCutoff, when);
        this.pluckNode.cutoff.linearRampToValueAtTime(this.synthDamp, rampEnd);
      }
    },
    toggleControls(e) {
      if (!this.loading) {
        const cl = e.target.classList;
        cl.toggle('showControls');
        this.showControls = this.showControls ? false : true;
        if (this.showTuning) {
          this.showTuning = false;
          this.$refs.tuningImg.classList.remove('showTuning');
        } else if (this.showDownloads) {
          this.showDownloads = false;
          this.$refs.downloadImg.classList.remove('showDownloads')
        } else if (this.showMeterControls) {
          this.showMeterControls = false;
          this.$refs.meterImg.classList.remove('showMeterControls');
        } else {
          this.$parent.resizeHeight(this.showControls);
        }
      }
    },
    toggleTuning(e) {
      if (!this.loading) {
        const cl = e.target.classList;
        cl.toggle('showTuning');
        if (this.showTuning) {
          this.showTuning = false;
          this.tuningGains.forEach((_, i) => {
            this.tuningGains[i] = 0;
            this.updateTuningGain(i)
          })
        } else {
          this.showTuning = true
        }
        if (this.showControls) {
          this.showControls = false;
          this.$refs.controlsImg.classList.remove('showControls');
        } else if (this.showDownloads) {
          this.showDownloads = false;
          this.$refs.downloadImg.classList.remove('showDownloads')
        } else if (this.showMeterControls) {
          this.showMeterControls = false;
          this.$refs.meterImg.classList.remove('showMeterControls');
        } else {
          this.$parent.resizeHeight(this.showTuning);
        }
      }
      
    },
    toggleDownloads(e) {
      if (!this.loading) {
        const cl = e.target.classList;
        cl.toggle('showDownloads');
        this.showDownloads = this.showDownloads ? false : true;
        if (this.showControls) {
          this.showControls = false;
          this.$refs.controlsImg.classList.remove('showControls');
        } else if (this.showTuning) {
          this.showTuning = false;
          this.$refs.tuningImg.classList.remove('showTuning');
        } else if (this.showMeterControls) {
          this.showMeterControls = false;
          this.$refs.meterImg.classList.remove('showMeterControls');
        } else {
          this.$parent.resizeHeight(this.showDownloads);
        }
      }
    },

    toggleMeterControls(e) {
      if (!this.loading) {
        const cl = e.target.classList;
        cl.toggle('showMeterControls');
        this.showMeterControls = this.showMeterControls ? false : true;
        if (this.showControls) {
          this.showControls = false;
          this.$refs.controlsImg.classList.remove('showControls');
        } else if (this.showTuning) {
          this.showTuning = false;
          this.$refs.tuningImg.classList.remove('showTuning');
        } else if (this.showDownloads) {
          this.showDownloads = false;
          this.$refs.downloadImg.classList.remove('showDownloads')
        } else {
          this.$parent.resizeHeight(this.showMeterControls);
        }
      }
    },

    goToBeginning() {
      if (!this.playing) {
        this.pausedAt = 0;
        this.updateProgress();
      } else {
        this.stop();
        this.pausedAt = 0;
        this.play();
        this.updateProgress();
      }
      this.$parent.currentTime = 0;
      this.$parent.movePlayhead();
      this.$parent.moveShadowPlayhead();
    },
    handleProgressClick(e) {
      const bb = this.$refs.pbOuter.getBoundingClientRect();
      if (!this.playing) {
        this.pausedAt = (this.audioBuffer.duration * e.clientX) / bb.width;
        this.$parent.currentTime = this.pausedAt;
        this.$parent.movePlayhead();
        this.$parent.moveShadowPlayhead();
        this.updateProgress();
      } else {
        this.stop();
        this.pausedAt = (this.audioBuffer.duration * e.clientX) / bb.width;
        this.play();
      }
    },
    tooLeftLimit() {
      if (this.$refs.pbOuter && this.progress) {
        const bb = this.$refs.pbOuter.getBoundingClientRect();
        return this.progress < 35 / bb.width;
      } else {
        return true;
      }
    },
    tooRightLimit() {
      if (this.$refs.pbOuter && this.progress) {
        const bb = this.$refs.pbOuter.getBoundingClientRect();
        return this.progress >= 1 - 90 / bb.width;
      } else {
        return false;
      }
    },
    updateFormattedCurrentTime(ct = undefined) {
      const st = structuredTime(ct ? ct : this.getCurrentTime());
      const ms = st.minutes + ':' + st.seconds;
      this.formattedCurrentTime = st.hours !== 0 ? ms : st.hours + ':' + ms;
    },
    updateFormattedTimeLeft(ct = undefined) {
      if (this.audioBuffer && isNaN(this.audioBuffer.duration)) {
        return '00:00';
      } else {
        let ut;
        if (!this.noAudio) {
          const buf = this.audioBuffer;
          ut = Number(buf.duration) - Number(ct ? ct : this.getCurrentTime());
        } else {
          const dt = Number(this.$parent.piece.durTot);
          ut = dt - Number(ct ? ct : this.getCurrentTime());
        }
        
        const st = structuredTime(ut);
        const ms = st.minutes + ':' + st.seconds;
        this.formattedTimeLeft = st.hours !== 0 ? ms : st.hours + ':' + ms;
      }
    },
    hoverTrigger(bool) {
      const classes_ = [
        '.currentTime',
        '.progressCircle',
        '.timeLeft',
        // '.invisibleProgressCircle',
      ];
      const cls = classes_.map((cl) => document.querySelector(cl).classList);
      if (bool) {
        cls.forEach((cl) => {
          if (!cl.contains('hovering')) cl.add('hovering');
        });
      } else {
        cls.forEach((cl) => {
          if (cl.contains('hovering')) cl.remove('hovering');
        });
      }
    },
    handleCircleMouseDown(e) {
      this.circleDragging = true;
      this.dragStart = e.clientX;
      this.$refs.main.classList.toggle('hovering');
    },
    handleCircleMouseUp(e) {
      if (this.circleDragging) {
        const bb = this.$refs.pbOuter.getBoundingClientRect();
        const ct = this.getCurrentTime();
        const dur = this.audioBuffer.duration;
        const newTime = ct + (dur * (e.clientX - this.dragStart)) / bb.width;
        if (!this.playing) {
          this.pausedAt = newTime;
          this.$parent.currentTime = this.pausedAt;
          this.$parent.movePlayhead();
          this.$parent.moveShadowPlayhead();
          this.updateProgress();
        } else {
          this.stop();
          this.pausedAt = newTime;
          this.play();
        }
        const pc = document.querySelector('.progressCircle');
        pc.style.right = '-7px';
        this.circleDragging = false;
        this.$refs.main.classList.toggle('hovering');
      }
    },
    handleCircleMouseMove(e) {
      if (this.circleDragging) {
        const diff = this.dragStart - e.clientX;
        const pbi = document.querySelector('.progressBarInner');
        const pbo = document.querySelector('.progressBarOuter');
        const pboBox = pbo.getBoundingClientRect();
        pbi.style.width = pboBox.width * this.progress - diff + 'px';
      }
    },
    handleDownload() {
      if (this.dataChoice === 'xlsx') {
        excelData(this.$parent.piece._id)
      } else if (this.dataChoice === 'json') {
        jsonData(this.$parent.piece._id)
      }
    },
    preventSpace(e) {
      // prevents spacebar from changing checkbox
      if (e && e.clientX === 0) e.preventDefault();
    },
    async toggleShift() {
      if (this.shiftOn) {
        this.rubberBandNode = await createRBNode(this.ac, rubberBandUrl);
        this.rubberBandNode.setHighQuality(true);
        this.gainNode.disconnect(this.ac.destination);
        this.gainNode.connect(this.rubberBandNode);
        this.rubberBandNode.connect(this.ac.destination);
        this.readyToShift = true;
      } else {
        this.rubberBandNode.disconnect(this.ac.destination);
        this.gainNode.disconnect(this.rubberBandNode);
        this.gainNode.connect(this.ac.destination);
        this.readyToShift = false;
        this.transposition = 0;
      }
    }
  },
};
</script>

<style scoped>
.player {
  position: absolute;
  width: 100%;
  height: v-bind(playerHeight + 'px');
  left: 0px;
  bottom: 0px;
  background-color: black;
  display: flex;
  flex-direction: column;
  border-top: 1px solid black;
  /* pointer-events: auto; */
}
.progressBarOuter {
  width: 100%;
  height: 8px;
  background-color: #242424;
  overflow-x: hidden;
}
.progressBarOuter:hover {
  cursor: pointer;
}
.progressBarInner {
  width: 0px;
  background-color: lightgrey;
  height: 6px;
  position: absolute;
}
.progressBarInner:hover {
  cursor: pointer;
}
.progressCircle {
  background-color: lightgrey;
  width: 14px;
  height: 14px;
  border-radius: 7px;
  position: absolute;
  right: -7px;
  top: -4px;
  opacity: 0;
  transition: opacity 0.25s;
}
.progressCircle:hover {
  cursor: pointer;
}
.controlsContainer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: bottom;
}
.recInfo {
  width: 300px;
  min-width: 300px;
  height: 100%;
  background-color: black;
}
.recInfo.left {
  height: calc(100% - 20px);
  color: white;
  /* border: 1px solid grey; */
  display: flex;
  flex-direction: column;
  align-items: left;
  justify-content: left;
  overflow: hidden;
  padding-left: 20px;
  padding-right: 20px;
}
.span {
  white-space: nowrap;
  display: inline;
  /* flex-direction: row; */
  /* padding-left: 20px; */
  /* padding-right: 20px; */
  /* justify-content: left; */
  /* align-items: left; */
  width: calc(100% - 40px);
  text-align: left;
  overflow-x: scroll;
  height: 40px;
  scrollbar-width: none;
}
.span::-webkit-scrollbar {
  display: none;
}
.right {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: right;
}
.rulerBox {
  width: 100px;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
.rulerBox > img {
  height: 40px;
  filter: brightness(400%);
  cursor: pointer;
}
.rulerBox > img:hover {
  filter: invert(46%) sepia(42%) saturate(292%) hue-rotate(78deg)
    brightness(94%) contrast(97%);
}
.rulerBox > .showWaveform {
  filter: invert(46%) sepia(75%) saturate(292%) hue-rotate(85deg)
    brightness(97%) contrast(97%);
}
.rulerBox > .showControls {
  filter: invert(46%) sepia(42%) saturate(292%) hue-rotate(78deg)
    brightness(94%) contrast(97%);
}
.controlFlexer {
  width: 100%;
  height: 100%;
  background-color: black;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
.controlBox {
  width: 400px;
  height: 70px;
  background-color: black;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
}
.loadingSymbol {
  width: 400px;
  height: 70px;
  background-color: black;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
.controlBox > img {
  height: 30px;
  width: 30px;
  cursor: pointer;
  filter: brightness(400%);
}
.controlBox > img:hover {
  filter: invert(46%) sepia(42%) saturate(292%) hue-rotate(78deg)
    brightness(94%) contrast(97%);
}
.controlBox > .looping {
  filter: invert(46%) sepia(75%) saturate(292%) hue-rotate(85deg)
    brightness(97%) contrast(97%);
}
.controlBox > .shuffling {
  filter: invert(46%) sepia(75%) saturate(292%) hue-rotate(85deg)
    brightness(97%) contrast(97%);
}
.playCircle > img {
  object-position: 3px;
}
.playCircle > img.playing {
  object-position: 0px;
}
.playCircle {
  background-color: #242424;
  border-radius: 30px;
  width: 60px;
  height: 60px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.playCircle:hover {
  background-color: #4f4f4f;
}
.playCircle > img {
  filter: brightness(400%);
}
.currentTime {
  color: white;
  position: absolute;
  top: 12px;
  right: -10px;
  width: 30px;
  height: 20px;
  text-align: center;
  opacity: 0;
  transition: opacity 0.25s;
}
.timeLeft {
  color: white;
  position: absolute;
  top: 12px;
  right: 25px;
  width: 30px;
  height: 20px;
  transition: opacity 0.25s;
  opacity: 0;
}
.hovering {
  opacity: 1;
}
.tooLeft {
  left: 10px;
}
.tooRight {
  left: calc(100vw - 120px);
}
.mainq {
  user-select: none;
  width: 100vw;
  height: 100px;
  position: absolute;
  left: 0;
  bottom: 0;
  /* pointer-events: none; */
  z-index: 1;
}
.main.hovering {
  cursor: pointer;
}
.invisibleProgressCircle {
  width: 500px;
  height: 100px;
  position: absolute;
  bottom: 0px;
  right: -25px;
  /* pointer-events: none; */
  overflow: hidden;
}
.invisibleProgressCircle.hovering {
  pointer-events: auto;
}
.icon {
  fill: white;
  stroke: white;
}
.loader {
  border: 8px solid grey;
  border-top: 8px solid green;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 2s linear infinite;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.synthControls {
  position: absolute;
  right: 0px;
  bottom: v-bind(playerHeight + 'px');
  background-color: #202621;
  width: 540px;
  height: v-bind(controlsHeight + 'px');
  border-bottom: 1px solid black;
  color: white;
  display: flex;
  flex-direction: row;
  pointer-events: auto;
  justify-content: space-evenly;
  align-items: center;
}
.tuningControls {
  position: absolute;
  right: 0px;
  bottom: v-bind(playerHeight + 'px');
  background-color: #202621;
  width: 1000px;
  height: v-bind(controlsHeight+'px');
  border-bottom: 1px solid black;
  color: white;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
}
.downloads {
  position: absolute;
  right: 0px;
  bottom: v-bind(playerHeight + 'px');
  background-color: #202621;
  width: 200px;
  height: v-bind(controlsHeight + 'px');;
  border-bottom: 1px solid black;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
}
.spacer {
  display: flex;
  flex-direction: column;
  align-items: bottom;
  justify-content: bottom;
  height: 100%;
  width: 300px;
}
.innerSpacer {
  height: 100%;
}
.rulerBox > .tuningFork {
  filter: invert(100%) sepia(100%) saturate(0%) hue-rotate(288deg)
    brightness(102%) contrast(102%);
}
.rulerBox > .showTuning {
  filter: invert(46%) sepia(42%) saturate(292%) hue-rotate(78deg)
    brightness(94%) contrast(97%);
}
.rulerBox > .showDownloads {
  filter: invert(46%) sepia(42%) saturate(292%) hue-rotate(78deg)
    brightness(94%) contrast(97%);
}

.rulerBox > .showMeterControls {
  filter: invert(46%) sepia(42%) saturate(292%) hue-rotate(78deg)
    brightness(94%) contrast(97%);
}
.tuningBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.tuningBox.last {
  margin-right: 10px;
}
.tuningBox.first {
  min-width: 45px;
  width: 45px;
}
.sliders {
  height: v-bind(controlsHeight - srgmLtrHeight + 'px');
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
}
.sargamLetter {
  height: v-bind(srgmLtrHeight + 'px');
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.label {
  height: v-bind(tuningLblHeight + 'px');
  font-size: 13px;
}
.sliderCol > input {
  width: 12px;
  height: v-bind(controlsHeight - srgmLtrHeight - tuningLblHeight - 10 + 'px');
  -webkit-appearance: slider-vertical;
  appearance: slider-vertical;
  -moz-appearance: slider-vertical;
  margin-top: 5px;
  margin-bottom: 5px;
}
.leftSliderCol {
  width: 35px;
}
.sliderCol {
  min-width: 30px;
}
.centsTickLabels {
  display: flex;
  flex-direction: column;
  align-items: right;
  justify-content: space-between;
  height: v-bind(controlsHeight - srgmLtrHeight - tuningLblHeight - 10 + 'px');
  margin-top: 5px;
  margin-bottom: 5px;
}
.paddingCol {
  min-width: 10px;
  max-width: 10px;
  width: 10px;
}
.centsLabel {
  text-align: right;
  font-size: 12px;
}
.buttons {
  width: 80px;
  min-width: 80px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
}
button {
  cursor: pointer
}
.dataChoice {
  display: flex;
  flex-direction: column;
  width: 80px;
  height: 100%;
}
.dataRadioButtons {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
  width: 100%;
  padding: 0px;
  border: 0px;
  margin: 0px;
}
.cbBoxSmall {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  /* width */
}
.cbBoxSmall > input {
  width: 30px;
  height: 150px;
  -webkit-appearance: slider-vertical;
  appearance: slider-vertical;
  -moz-appearance: slider-vertical;
}
.cbBoxSmall > label {
  padding-top: 5px;
  height: 50px;
  width: 83px;
  font-size: 13px;
}

.meterImg {
  width: 40px;
}
</style>