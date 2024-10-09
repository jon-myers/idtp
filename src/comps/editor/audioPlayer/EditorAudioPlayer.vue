<template>
  <div class="mainq" ref="main">
    <div
      class="player"
      @mouseover="hoverTrigger(true)"
      @mouseleave="hoverTrigger(false)"
      @mousemove="handleCircleMouseMove"
      @mouseup="handleCircleMouseUp"
    >
      <div class="progBarOuter" @click="handleProgressClick" ref="pbOuter">
        <div class="progBarInner">
          <div :class="`currentTime tooLeft`">
            {{ formattedCurrentTime }}
          </div>
          <div class="progressCircle">
          </div>
        </div>
        <div class="timeLeft">{{ '-' + formattedTimeLeft }}</div>
      </div>
      <div class="controlsContainer">
        <div class="spacer">
          <div class="innerSpacer"></div>
          <div class="recInfo left">
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
                :src="[icons.play, icons.pause][Number(playing)]"
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
          <div class='rulerBox'>
            <img
              :src='icons.specControl'
              @click='toggleSpecControls'
              class='specImg'
              ref='specImg'
              @mouseover='controlsMouseOver'
              @mouseout='controlsMouseOut'
            />
          </div>
          <div class="rulerBox">
            <img
              :src="icons.tags"
              @click="toggleLabelControls"
              class="tagsImg"
              ref="tagsImg"
              @mouseover='controlsMouseOver'
              @mouseout='controlsMouseOut'
            />
          </div>
          <div class="rulerBox">
            <img
              :src="icons.meter"
              @click="toggleMeterControls"
              class="meterImg"
              ref="meterImg"
              @mouseover='controlsMouseOver'
              @mouseout='controlsMouseOut'
            />
          </div>
          <div class="rulerBox">
            <img
              :src="icons.download"
              @click="toggleDownloads"
              class="downloadImg"
              ref="downloadImg"
              @mouseover='controlsMouseOver'
              @mouseout='controlsMouseOut'
            />
          </div>
          <div class="rulerBox">
            <img
              :src="icons.tuningFork"
              @click="toggleTuning"
              class="tuningFork"
              ref="tuningImg"
              @mouseover='controlsMouseOver'
              @mouseout='controlsMouseOut'
            />
          </div>
          <div class="rulerBox">
            <img 
              :src="icons.ruler" 
              @click="toggleControls" 
              ref="controlsImg" 
              class='showControls'
              @mouseover='controlsMouseOver'
              @mouseout='controlsMouseOut'
              />
          </div>
        </div>
      </div>
    </div>
    <!-- <div class="synthControls" v-if="showControls">
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
      <div class="cbBoxSmall" v-if='string'>
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
      <div class="cbBoxSmall" v-if='string'>
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
      <div class='cbBoxSmall' v-if='audioDBDoc'>
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
          @mouseup='handleRegionSpeedChange'
          />
      </div>
    </div> -->
    <!-- <InstrumentControl 
      class='synthControls' 
      v-if='showControls && synthControls.length > 0'
      :synthControl='synthControls[0]'
      :height='controlsHeight'
      :sonify='instTracks[0].sounding'
    /> -->
    <SynthesisControls
      class='synthControls'
      v-if='showControls && synthControls.length > 0'
      :synthControls='synthControls'
      :instTracks='instTracks'
      :height='controlsHeight'
      :transposition='transposition'
      :regionSpeed='regionSpeed'
      :playing='playing'
      :stretchable='stretchable'
      :shiftOn='shiftOn'
      :regionSpeedOn='regionSpeedOn'
      :readyToShift='readyToShift'
      :mixedGainVal='mixedGainVal'
      :recGainVal='recGain'
      :hasRecording='hasRecording'
      @update:transposition='transposition = Number($event)'
      @update:regionSpeed='regionSpeed = $event'
      @update:regionSpeedOn='regionSpeedOn = $event'
      @toggleShift='toggleShift'
      @update:shiftOn='shiftOn = $event'
      @toggleRegionSpeed='toggleRegionSpeed'
      @regionSpeedChange='handleRegionSpeedChange'
      @update:mixedGainVal='updateMixedGainVal'
      @update:recGainVal='updateRecGainVal'
      @update:gainNode='handleUpdateGainNode'
    />
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
      :currentTime='parentCurrentTime'
      :insertPulses='insertPulses'
      :editorMode='editorMode'
      ref='meterControls'
      @passthroughResetZoomEmit='passthroughResetZoom'
      @pSelectMeterEmit='passthroughSelectMeter'
      @passthroughAddMeterEmit='passthroughAddMeter'
      @passthroughAddMetricGridEmit='passthroughAddMetricGrid'
      @passthroughRemoveMeterEmit='passthroughRemoveMeter'
      @passthroughUnsavedChangesEmit='passthroughUnsavedChanges'
      @passthroughAssignPrevMeterEmit='passthroughAssignPrevMeter'
      @maxLayerEmit='$emit("maxLayerEmit", $event)'
      @renderMeter='$emit("renderMeter", $event)'
      />
    <LabelEditor
      v-if='showLabelControls'
      :height='controlsHeight'
      :playerHeight='playerHeight'
      :editable='editable'
      :piece='piece'
      :vocal='vocal!'
      :editingInstIdx='editingInstIdx'
      @unsavedChanges='$emit("unsavedChangesEmit", true)'
      @goToPhraseEmit='goToPhrase'
      @goToSectionEmit='goToSection'
      ref='labelControls'
    />
    <SpectrogramControls
      v-if='
        transcriptionWidth !== 0 &&
        raga
        '
      v-show='showSpecControls'
      :height='controlsHeight'
      :playerHeight='playerHeight'
      :audioID='id'
      :saFreq='raga.fundamental'
      :scaledWidth='transcriptionWidth'
      :scaledHeight='transcriptionHeight'
      :extLowOctOffset='lowOctOffset'
      :extHighOctOffset='highOctOffset'
      :backgroundColor='backgroundColor'
      :axisColor='axisColor'
      :melographColor='melographColor'
      :ac='ac'
      :maxPitch='maxPitch'
      :minPitch='minPitch'
      :raga='raga'
      :sargamLineColor='sargamLineColor'
      :instTracks='instTracks'
      :editingInstIdx='editingInstIdx'
      :meterColor='meterColor'
      :selectedMeterColor='selectedMeterColor'
      :playheadColor='playheadColor'
      @specCanvas='handleSpecCanvas'
      @update:backgroundColor='$emit("update:backgroundColor", $event)'
      @update:axisColor='$emit("update:axisColor", $event)'
      @update:melographColor='$emit("update:melographColor", $event)'
      @update:saFreq='$emit("update:saFreq", $event)'
      @update:maxPitch='$emit("update:maxPitch", $event)'
      @update:minPitch='$emit("update:minPitch", $event)'
      @update:sargamLineColor='$emit("update:sargamLineColor", $event)'
      @update:instTracks='$emit("update:instTracks", $event)'
      @update:meterColor='$emit("update:meterColor", $event)'
      @update:selectedMeterColor='$emit("update:selectedMeterColor", $event)'
      @update:playheadColor='$emit("update:playheadColor", $event)'
      />
      <Synths
        ref='synths'
        v-if='ac !== undefined && instTracks.length > 0 && synthControls.length > 0'
        :ac='ac'
        :piece='piece'
        :gainVal='1'
        :instTracks='instTracks'
        :controls='synthControls'
        :curPlayTime='curPlayTime'
        :transposition='transposition'
        :uniformVowel='uniformVowel'
      />
  </div>
</template>
<script lang='ts'>
import { defineComponent, PropType } from 'vue';
import { BrowserInfo, detect } from 'detect-browser';
import { drag as d3Drag, select as d3Select } from 'd3';

// Components
import SpectrogramControls from '@/comps/editor/audioPlayer/SpectrogramControls.vue';
import MeterControls from '@/comps/editor/audioPlayer/MeterControls.vue';
import LabelEditor from '@/comps/editor/LabelEditor.vue';
import Synths from '@/comps/editor/audioPlayer/Synths.vue';
import InstrumentControl from '@/comps/editor/audioPlayer/InstrumentControl.vue';
import SynthesisControls from '@/comps/editor/audioPlayer/SynthesisControls.vue';

// Icons
import beginningIcon from '@/assets/icons/beginning.svg';
import endIcon from '@/assets/icons/end.svg';
import loopIcon from '@/assets/icons/loop.svg';
import back_15 from '@/assets/icons/back_15.svg';
import forward_15 from '@/assets/icons/forward_15.svg';
import pauseIcon from '@/assets/icons/pause.svg';
import playIcon from '@/assets/icons/play.svg';
import shuffleIcon from '@/assets/icons/shuffle.svg';
import rulerIcon from '@/assets/icons/ruler.svg';
import tagsIcon from '@/assets/icons/tags.svg';
import tuningForkIcon from '@/assets/icons/tuning_fork.png';
import downloadIcon from '@/assets/icons/download.svg';
import meterIcon from '@/assets/icons/meter.svg';
import specControlIcon from '@/assets/icons/specControls.svg';

// URLs
import caURL from '@/audioWorklets/captureAudio.worklet.js?url';
import rubberBandUrl from '@/audioWorklets/rubberband-processor.js?url';
import stretcherURL from '@/js/bundledStretcherWorker.js?url';

// Classes and Types
import { 
  getStarts, 
  getEnds, 
  Phrase, 
  Trajectory, 
  Raga, 
  RuleSetType,
  Piece,
  Pitch
} from '@/js/classes.ts';
import { EditorMode } from '@/ts/enums.ts';
import { AudioWorklet } from '@/audio-worklet';
import { excelData, jsonData } from '@/js/serverCalls.ts';
import { Meter } from '@/js/meter.ts';
import { 
  RecType, 
  MusicianType,
  InstrumentTrackType, 
  TooltipData,
  SynthControl,
  SitarSynthType,
  SarangiSynthType,
  KlattSynthType, 
} from '@/ts/types.ts';
import { ControlsMode, Instrument } from '@/ts/enums.ts';

// External Libraries
import { createRubberBandNode as createRBNode } from 'rubberband-web';

type EditorAudioPlayerData = {
  progress: number;
  playing: boolean;
  looping: boolean;
  shuffling: boolean;
  showWaveform: boolean;
  audio: {
    paused: boolean;
  };
  icons: {
    beginning: string;
    end: string;
    loop: string;
    pause: string;
    play: string;
    shuffle: string;
    ruler: string;
    back_15: string;
    forward_15: string;
    download: string;
    tuningFork: string;
    meter: string;
    tags: string;
    specControl: string;
  };
  circleDragging: boolean;
  formattedCurrentTime: string;
  formattedTimeLeft: string;
  waKey: number;
  loading: boolean;
  startedAt: number;
  pausedAt: number;
  loop: boolean;
  loopStart: number | undefined;
  loopEnd: number | undefined;
  slowRamp: number;
  bufferSourceNodes: AudioBufferSourceNode[];
  chikariGain: number;
  lagTime: number;
  showControls: boolean;
  recGain: number;
  synthGain: number;
  synthDamp: number;
  valueCurveMinim: number;
  pieceTitle: string | undefined;
  performers: string[];
  raags: string[];
  showTuning: boolean;
  showDownloads: boolean;
  showMeterControls: boolean;
  showLabelControls: boolean;
  showSpecControls: boolean;
  sargam: string[];
  centDevs: number[];
  tuningGains: number[];
  srgmLtrHeight: number;
  tuningLblHeight: number;
  tuningGainFactor: number;
  dataChoice: string;
  noAudio: boolean;
  inited: boolean;
  modsLoaded: boolean;
  transposition: number;
  transposable: boolean;
  string: boolean | undefined;
  vocal: boolean | undefined;
  sarangi: boolean;
  dragStartX: number | undefined;
  shiftOn: boolean;
  readyToShift: boolean;
  klattActive: boolean;
  vowelParams: number[][][];
  soundtouch: any;
  stretchable: boolean;
  regionSpeed: number;
  regionSpeedOn: boolean;
  stretchBuf: AudioBuffer | undefined;
  chikariGainDisabled: boolean;
  synthGainDisabled: boolean;
  stretchedBuffer: AudioBuffer | undefined;
  raga: Raga | undefined;
  intSynthGainNode?: GainNode;
  ruleSet?: RuleSetType;
  ac?: AudioContext;
  stretchWorker?: Worker;
  synthGainNode?: GainNode;
  chikariGainNode?: GainNode;
  savedSynthGain: number | undefined;
  savedChikariGain: number | undefined;
  startingDelta?: number;
  loopTime?: number;
  sourceNode?: AudioBufferSourceNode | undefined | null;
  synthLoopSource?: LoopSourceNode | undefined;
  chikLoopSource?: LoopSourceNode | undefined;
  otherNode?: ChikariNodeType;
  intChikariGainNode?: GainNode;
  chikariDCOffsetNode?: BiquadFilterNode;
  pluckNode?: PluckNodeType | null;
  lowPassNode?: BiquadFilterNode;
  pluckDCOffsetNode?: BiquadFilterNode;
  vocalNode?: OscillatorNode;
  vocalGainNode?: GainNode;
  synthLoopGainNode?: GainNode;
  chikLoopGainNode?: GainNode;
  capture?: CaptureNodeType;
  endRecTime?: number;
  audioBuffer?: AudioBuffer;
  gainNode?: GainNode;
  moduleCt: number;
  synthLoopBufSourceNode?: AudioBufferSourceNode;
  firstEnvelope: Float32Array;
  firstLPEnvelope: Float32Array;
  klattNode?: KlattNodeType;
  chikariNodes: ChikariNodeType[];
  requestId?: number;
  rubberBandNode?: RubberBandNodeType;
  ETRatios: number[];
  initFreqs: number[];
  currentFreqs: number[];
  tuningMasterGainNode?: GainNode;
  tuningGainNodes: GainNode[];
  tuningSines: OscillatorNode[];
  // sarangiSynth?: SarangiSynthType;
  klattMiddleGain?: GainNode;
  selectedControlsMode: ControlsMode;
  controlsHoverTimeout?: NodeJS.Timeout;
  controlsTexts: {[key: string]: string};
  synthControls: SynthControl[],
  initializedSynthControls: boolean,
  mixedGainVal: number,
}

interface RubberBandNodeType extends AudioWorkletNode {
  setPitch: (pitch: number) => void;
  setHighQuality: (hq: boolean) => void;
}

interface LoopSourceNode extends AudioBufferSourceNode {
  playing?: boolean;
}

interface ChikariNodeType extends AudioWorkletNode {
  freq0?: AudioParam;
  freq1?: AudioParam;
  cutoff?: AudioParam;
}

interface PluckNodeType extends AudioWorkletNode {
  frequency?: AudioParam;
  cutoff?: AudioParam;
}

interface CaptureNodeType extends AudioWorkletNode {
  bufferSize?: AudioParam;
  active?: AudioParam;
  cancel?: AudioParam;
}

interface KlattNodeType extends AudioWorkletNode {
  extGain?: AudioParam;
  f0?: AudioParam;
  f1?: AudioParam;
  f2?: AudioParam;
  f3?: AudioParam;
  f4?: AudioParam;
  f5?: AudioParam;
  f6?: AudioParam;
  b1?: AudioParam;
  b2?: AudioParam;
  b3?: AudioParam;
  b4?: AudioParam;
  b5?: AudioParam;
  b6?: AudioParam;
  db1?: AudioParam;
  db2?: AudioParam;
  db3?: AudioParam;
  db4?: AudioParam;
  db5?: AudioParam;
  db6?: AudioParam;
  flutterLevel?: AudioParam;
  openPhaseRatio?: AudioParam;
  breathinessDb?: AudioParam;
  tiltDb?: AudioParam;
  gainDb?: AudioParam;
  agcRmsLevel?: AudioParam;
  cascadeEnabled?: AudioParam;
  cascadeVoicingDb?: AudioParam;
  cascadeAspirationDb?: AudioParam;
  cascadeAspirationMod?: AudioParam;
  nasalFormantFreq?: AudioParam;
  nasalFormantFreqToggle?: AudioParam;
  nasalFormantBw?: AudioParam;
  nasalFormantBwToggle?: AudioParam;
  nasalAntiformantFreq?: AudioParam;
  nasalAntiformantFreqToggle?: AudioParam;
  nasalAntiformantBw?: AudioParam;
  nasalAntiformantBwToggle?: AudioParam;
  parallelEnabled?: AudioParam;
  parallelVoicingDb?: AudioParam;
  parallelAspirationDb?: AudioParam;
  parallelAspirationMod?: AudioParam;
  fricationDb?: AudioParam;
  fricationMod?: AudioParam;
  parallelBypassDb?: AudioParam;
  nasalFormantDb?: AudioParam;
}

// interface SarangiSynthType extends AudioWorkletNode {
//   freq?: AudioParam;
//   bowGain?: AudioParam;
//   gain?: AudioParam;
// }

const structuredTime = (dur: number) => {
  const hours = String(Math.floor(dur / 3600));
  const minutes = leadingZeros(Math.floor((dur % 3600) / 60));
  const seconds = leadingZeros(Math.round(dur % 60));
  return { hours: hours, minutes: minutes, seconds: seconds };
};
const leadingZeros = (int: number) => {
  if (int < 10) {
    return '0' + int;
  } else {
    return String(int);
  }
};
export default defineComponent({
  name: 'EditorAudioPlayer',
  data(): EditorAudioPlayerData {
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
        tags: tagsIcon,
        specControl: specControlIcon
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
      chikariGain: 0,
      lagTime: 0.025,
      showControls: true,
      recGain: 1,
      synthGain: 0,
      synthDamp: 0.5,
      valueCurveMinim: 0.001,
      pieceTitle: undefined,
      performers: [],
      raags: [],
      showTuning: false,
      showDownloads: false,
      showMeterControls: false,
      showLabelControls: false,
      showSpecControls: false,
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
      raga: undefined,
      savedSynthGain: undefined,
      requestId: undefined,
      rubberBandNode: undefined,
      chikariNodes: [],
      klattNode: undefined,
      firstLPEnvelope: new Float32Array(256),
      firstEnvelope: new Float32Array(256),
      moduleCt: 0,
      ac: undefined,
      intSynthGainNode: undefined,
      ruleSet: undefined,
      stretchWorker: undefined,
      synthGainNode: undefined,
      chikariGainNode: undefined,
      savedChikariGain: undefined,
      startingDelta: undefined,
      loopTime: undefined,
      sourceNode: undefined,
      synthLoopSource: undefined,
      chikLoopSource: undefined,
      otherNode: undefined,
      intChikariGainNode: undefined,
      chikariDCOffsetNode: undefined,
      pluckNode: undefined,
      lowPassNode: undefined,
      pluckDCOffsetNode: undefined,
      vocalNode: undefined,
      vocalGainNode: undefined,
      synthLoopGainNode: undefined,
      chikLoopGainNode: undefined,
      capture: undefined,
      endRecTime: undefined,
      audioBuffer: undefined,
      gainNode: undefined,
      synthLoopBufSourceNode: undefined,
      ETRatios: [],
      initFreqs: [],
      currentFreqs: [],
      tuningMasterGainNode: undefined,
      tuningGainNodes: [],
      tuningSines: [],
      sarangi: false, // placeholder
      // sarangiSynth: undefined,
      klattMiddleGain: undefined,
      selectedControlsMode: ControlsMode.Synthesis,
      controlsHoverTimeout: undefined,
      controlsTexts: {
        specImg: 'Imaging and Color Controls',
        tagsImg: 'Label Editor',
        meterImg: 'Meter Controls',
        downloadImg: 'Download Data',
        tuningFork: 'Tuning Controls',
        showControls: 'Synthesis Controls'
      },
      synthControls: [],
      initializedSynthControls: false,
      mixedGainVal: 1,
    };
  },
  props: {
    audioSource: {
      type: String
    },
    saEstimate: {
      type: Number
    }, 
    saVerified: {
      type: Boolean
    }, 
    id: {
      type: String
    },
    piece: {
      type: Object as PropType<Piece>,
      required: true
    },
    playerHeight: {
      type: Number,
      required: true
    },
    controlsHeight: {
      type: Number,
      required: true
    },
    editable: {
      type: Boolean
    },
    windowWidth: {
      type: Number
    },
    regionStartTime: {
      type: Number
    },
    audioDBDoc: {
      type: Object as PropType< RecType | undefined>,
      required: false
    },
    regionEndTime: {
      type: Number
    },
    playheadReturn: {
      type: Boolean
    },
    parentCurrentTime: {
      type: Number,
      required: true
    },
    durTot: {
      type: Number,
      required: true
    },
    insertPulses: {
      type: Array as PropType<number[]>,
      required: true
    },
    uniformVowel: {
      type: Boolean,
      required: true
    },
    transcriptionWidth: {
      type: Number as PropType<number>,
      required: true,
      validator: (val: number) => Number.isInteger(val)
    },
    transcriptionHeight: {
      type: Number,
      required: true,
      validator: (val: number) => Number.isInteger(val)
    },
    lowOctOffset: {
      type: Number,
      required: true
    },
    highOctOffset: {
      type: Number,
      required: true
    },
    backgroundColor: {
      type: String,
      required: true
    },
    axisColor: {
      type: String,
      required: true
    },
    melographColor: {
      type: String,
      required: true
    },
    maxPitch: {
      type: Object as PropType<Pitch>,
      required: true
    },
    minPitch: {
      type: Object as PropType<Pitch>,
      required: true
    },
    sargamLineColor: {
      type: String,
      required: true
    },
    instTracks: {
      type: Array as PropType<InstrumentTrackType[]>,
      required: true
    },
    editingInstIdx: {
      type: Number,
      required: true
    },
    meterColor: {
      type: String,
      required: true
    },
    selectedMeterColor: {
      type: String,
      required: true
    },
    editorMode: {
      type: String as PropType<EditorMode>,
      required: true
    },
    playheadColor: {
      type: String,
      required: true
    },
    hasRecording: {
      type: Boolean,
      required: true
    },
  },

  components: {
    MeterControls,
    LabelEditor,
    SpectrogramControls,
    Synths,
    InstrumentControl,
    SynthesisControls,
  },

  async mounted() {
    if (window.innerHeight < 800) {
      this.showControls = false;
      const controlsImg = this.$refs.controlsImg as HTMLImageElement;
      controlsImg.classList.remove('showControls');
    }
    this.ac = new AudioContext({ sampleRate: 48000 });
    this.gainNode = this.ac.createGain();
    this.gainNode.gain.setValueAtTime(this.recGain, this.now());
    this.initializeStretching();
    this.moduleCt = 0;
    const browser = detect();
    const mac = browser!.os === 'Mac OS';
    const safari = browser!.name === 'safari';
    const firefox = browser!.name === 'firefox';
    if (mac && (!safari) && (!firefox)) {
      this.transposable = true;
    }
    this.gainNode.connect(this.ac.destination);    
    if (this.audioDBDoc && this.piece) this.gatherInfo();
    this.synthLoopBufSourceNode = this.ac.createBufferSource();
    this.synthLoopBufSourceNode.loop = true; 
    this.addDragger();
  },
  beforeUnmount() {
    this.tuningGains.forEach((_, i) => {
      this.tuningGains[i] = 0;
      this.updateTuningGain(i)
    });

    setTimeout(() => this.ac?.close(), this.lagTime * 1000);
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
      console.log('audio source:', newSrc)
      this.loading = true;
      this.audioBuffer = await this.getAudio(newSrc, false);
      this.loading = false;
      if (this.regionStartTime && this.regionEndTime) this.updateStretchBuf();
      this.pausedAt = this.parentCurrentTime;
      this.updateProgress();
      this.updateFormattedCurrentTime();
      this.updateFormattedTimeLeft();
      
    },
    // recGain(newGain) {
    //   if (this.ac!.state === 'suspended') this.ac!.resume();
    //   const currentGain = this.gainNode!.gain.value;
    //   const gain = this.gainNode!.gain;
    //   gain.setValueAtTime(currentGain, this.now());
    //   gain.linearRampToValueAtTime(newGain, this.now() + this.lagTime);
    // },
    // synthGain(newGain) {
    //   if (this.ac!.state === 'suspended') this.ac!.resume();
    //   const currentGain = this.synthGainNode!.gain.value;
    //   const gain = this.synthGainNode!.gain;
    //   gain.setValueAtTime(currentGain, this.now());
    //   gain.linearRampToValueAtTime(newGain, this.now() + this.lagTime);
    // },
    // synthDamp(newVal) {
    //   if (this.ac!.state === 'suspended') this.ac!.resume();
    //   const currentDamp = this.pluckNode!.cutoff!.value;
    //   const cutoff = this.pluckNode!.cutoff!;
    //   cutoff.setValueAtTime(currentDamp, this.now());
    //   cutoff.linearRampToValueAtTime(newVal, this.now() + this.lagTime);
    // },
    // chikariGain(newVal) {
    //   if (this.ac!.state === 'suspended') this.ac!.resume();
    //   const currentGain = this.chikariGainNode!.gain.value;
    //   const gain = this.chikariGainNode!.gain;
    //   gain.setValueAtTime(currentGain, this.now());
    //   gain.linearRampToValueAtTime(newVal, this.now() + this.lagTime);
    // },
    transposition(cents) {
      const newVal = 2 ** (cents / 1200);
      this.rubberBandNode!.setPitch(newVal);
      this.preSetFirstEnvelope(256);
      if (this.playing) {
        this.cancelPlayTrajs(this.now(), false);
        this.playTrajs(this.getCurTime(), this.now());
      }
      const raga = this.piece.raga;
      const freqs = raga.chikariPitches.map((p) => p.frequency);
      const transp = 2 ** (this.transposition / 1200);
      const synthsComp = this.$refs.synths as InstanceType<typeof Synths>;
      this.instTracks.forEach((track, idx) => {
        if (track.inst === Instrument.Sitar) {
          console.log(synthsComp)
          const nodesObj = synthsComp.synths[idx] as SitarSynthType;
          const chikariNode = nodesObj.chikariNode;
          const curFreq0 = chikariNode.freq0!.value;
          const curFreq1 = chikariNode.freq1!.value;
          chikariNode.freq0!.setValueAtTime(curFreq0, this.now());
          chikariNode.freq1!.setValueAtTime(curFreq1, this.now());
          const et = this.now() + this.lagTime;
          chikariNode.freq0!.linearRampToValueAtTime(freqs[0] * transp, et);
          chikariNode.freq1!.linearRampToValueAtTime(freqs[1] * transp, et);
        }
      })
    },
    selectedControlsMode(mode, oldMode) {
      this.showSpecControls = false;
      this.showMeterControls = false;
      this.showLabelControls = false;
      this.showDownloads = false;
      this.showTuning = false;
      this.showControls = false;
      const controlsImg = this.$refs.controlsImg as HTMLImageElement;
      controlsImg.classList.remove('showControls');
      const tuningImg = this.$refs.tuningImg as HTMLImageElement;
      tuningImg.classList.remove('showTuning');
      const downloadImg = this.$refs.downloadImg as HTMLImageElement;
      downloadImg.classList.remove('showDownloads');
      const meterImg = this.$refs.meterImg as HTMLImageElement;
      meterImg.classList.remove('showMeterControls');
      const tagsImg = this.$refs.tagsImg as HTMLImageElement;
      tagsImg.classList.remove('showLabelControls');
      const specImg = this.$refs.specImg as HTMLImageElement;
      specImg.classList.remove('showSpecControls');
      if (mode === ControlsMode.Display) {
        this.showSpecControls = true;
        specImg.classList.add('showSpecControls');
      } else if (mode === ControlsMode.Tag) {
        this.showLabelControls = true;
        tagsImg.classList.add('showLabelControls');
      } else if (mode === ControlsMode.Meter) {
        this.showMeterControls = true;
        meterImg.classList.add('showMeterControls');
      } else if (mode === ControlsMode.Download) {
        this.showDownloads = true;
        downloadImg.classList.add('showDownloads');
      } else if (mode === ControlsMode.Tuning) {
        this.showTuning = true;
        tuningImg.classList.add('showTuning');
      } else if (mode === ControlsMode.Synthesis) {
        this.showControls = true;
        controlsImg.classList.add('showControls');
      } else if (mode === ControlsMode.None) {
        this.$emit('resizeHeightEmit', false);
      }
      if (oldMode === ControlsMode.None) {
        this.$emit('resizeHeightEmit', true);
      }
    },
    instTracks: {
      handler(newTracks) {
        if (newTracks.length > 0 && !this.initializedSynthControls) {
          this.initializeSynthControls()
        }
      },
      deep: true
    }
  },
  computed: {
    // hasRecording() {
    //   return this.piece.audioID !== undefined;
    // },
    curPlayTime() {
      if (this.pausedAt) {
        return this.pausedAt;
      } else if (this.playing) {
        if (this.startingDelta === undefined) {
          throw new Error('startingDelta is undefined')
        }
        if (this.loop && this.startingDelta < this.loopEnd!) {
          const dur = this.loopEnd! - this.loopStart!;
          const realTime = this.now() - this.startedAt;
          this.loopTime = realTime;
          if (realTime > this.loopEnd!) {
            this.loopTime =
              this.loopStart! + ((realTime - this.loopStart!) % dur);
          }
          return this.loopTime;
        } else {
          return this.now() - this.startedAt;
        }
      } else {
        return 0;
      }
    }
  },
  methods: {

    updateMixedGainVal(val: string) {
      this.mixedGainVal = Number(val);
      const s = this.$refs.synths as InstanceType<typeof Synths>;
      const curVal = s.mixNode.gain.value;
      s.mixNode.gain.setValueAtTime(curVal, this.now());
      const targetTime = this.now() + this.lagTime;
      s.mixNode.gain.linearRampToValueAtTime(this.mixedGainVal, targetTime);
    },

    updateRecGainVal(val: string) {
      this.recGain = Number(val);
      const curVal = this.gainNode!.gain.value;
      const gain = this.gainNode!.gain;
      gain.setValueAtTime(curVal, this.now());
      gain.linearRampToValueAtTime(this.recGain, this.now() + this.lagTime);

    },

    handleUpdateGainNode(slider: { 
      label: string, 
      target: number, 
      paramName: string,
      instIdx: number,
    }) {
      const s = this.$refs.synths as InstanceType<typeof Synths>;
      // if slider.label === 
      // console.log(slider.instIdx, this.instTracks)
      const inst = this.instTracks[slider.instIdx].inst;
      let synth: KlattSynthType | SitarSynthType | SarangiSynthType;
      let node: GainNode;
      if (inst === Instrument.Sitar) {
        synth = s.synths[slider.instIdx] as SitarSynthType;
        node = synth[slider.paramName as keyof typeof synth] as GainNode;
      } else if (inst === Instrument.Sarangi) {
        synth = s.synths[slider.instIdx] as unknown as SarangiSynthType;
        node = synth[slider.paramName as keyof typeof synth] as GainNode;
      } else if (inst === Instrument.Vocal_M || inst === Instrument.Vocal_F) {
        synth = s.synths[slider.instIdx] as unknown as KlattSynthType;
        node = synth[slider.paramName as keyof typeof synth] as GainNode;
      } else {
        throw new Error('Invalid instrument')
      }
      const curVal = node.gain.value;
      node.gain.setValueAtTime(curVal, this.now());
      node.gain.linearRampToValueAtTime(slider.target, this.now() + this.lagTime);
    },

    initializeSynthControls() {
      console.log('initializing synth controls');
      this.initializedSynthControls = true;
      this.instTracks.forEach((track, i) => {
        // chikari freqs
        this.piece.phraseGrid[i]
        if (track.inst === Instrument.Sitar) {
          this.synthControls.push({
            inst: track.inst,
            idx: i,
            params: {
              dampen: 0.5,
              outGain: 0,
              extSitarGain: 1,
              extChikariGain: 1,
              chikariFreq0: this.piece.chikariFreqs(i)[0],
              chikariFreq1: this.piece.chikariFreqs(i)[1],
            }
          });
        } else if (track.inst === Instrument.Sarangi) {
          this.synthControls.push({
            inst: track.inst,
            idx: i,
            params: {
              extSarangiGain: 0,
            }
          })
        } else if (track.inst === Instrument.Vocal_M || track.inst === Instrument.Vocal_F) {
          this.synthControls.push({
            inst: track.inst,
            idx: i,
            params: {
              extGain: 0,
            }
          })
        }
      })
    },

    controlsMouseOver(e: MouseEvent) {
      if (this.controlsHoverTimeout === undefined) {
        this.controlsHoverTimeout = setTimeout(() => {
          const key = (e.target as HTMLElement).classList[0];
          const text = this.controlsTexts[key];
          const data: TooltipData = {
            text: text,
            x: e.clientX,
            y: e.clientY
          };
          this.$emit('showTooltip', data);
        }, 500);
      }

    },

    controlsMouseOut(e: MouseEvent) {
      if (this.controlsHoverTimeout) {
        clearTimeout(this.controlsHoverTimeout);
        this.controlsHoverTimeout = undefined;
        this.$emit('hideTooltip');
      }


    },

    handleSpecCanvas(specCanvas: HTMLCanvasElement) {
      this.$emit('specCanvas', specCanvas);
    },

    goToPhrase(pIdx: number) {
      this.$emit('goToPhraseEmit', pIdx)
    },

    goToSection(sIdx: number) {
      this.$emit('goToSectionEmit', sIdx)
    },

    reinitializeAC() {
      console.log('reinitializing audio context');
      if (this.ac) this.ac.close();
      this.ac = new AudioContext({ sampleRate: 48000 });
      this.gainNode = this.ac.createGain();
      this.gainNode.gain.setValueAtTime(this.recGain, this.now());
      this.synthGainNode = this.ac.createGain();
      this.synthGainNode.gain.setValueAtTime(this.synthGain, this.now());
      this.intSynthGainNode = this.ac.createGain();
      this.intSynthGainNode.connect(this.synthGainNode);
      this.chikariGainNode = this.ac.createGain();
      this.chikariGainNode.connect(this.ac.destination);
      this.chikariGainNode.gain.setValueAtTime(this.chikariGain, this.now());
      this.synthGainNode.connect(this.ac.destination);
      this.moduleCt = 0;
      const browser = detect();
      const mac = browser!.os === 'Mac OS';
      const safari = browser!.name === 'safari';
      const firefox = browser!.name === 'firefox';
      if (mac && (!safari) && (!firefox)) {
        this.transposable = true;
      }
      this.gainNode.connect(this.ac.destination);
      if (this.audioDBDoc && this.piece) this.gatherInfo();
      this.synthLoopBufSourceNode = this.ac.createBufferSource();
      this.synthLoopBufSourceNode.loop = true; 
      this.inited = false;
      this.parentLoaded();
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

    dragStart(e: DragEvent) {
      console.log('drag start');
      this.dragStartX = e.x;
    },

    dragging(e: DragEvent) {
      const diff = this.dragStartX! - e.x;
      const pbi = document.querySelector('.progBarInner') as HTMLElement;
      const pbo = document.querySelector('.progBarOuter');
      const pboBox = pbo!.getBoundingClientRect();
      pbi!.style.width = pboBox.width * this.progress - diff + 'px';
      const ct = this.getCurTime();
      const dur = this.audioBuffer!.duration;
      const newTime = ct + (dur * (e.x - this.dragStartX!)) / pboBox.width;      
      this.updateFormattedCurrentTime(newTime);
      this.updateFormattedTimeLeft(newTime);
    },

    dragEnd(e: DragEvent) {
      const pbOuter = this.$refs.pbOuter as HTMLElement;
      const bb = pbOuter.getBoundingClientRect();
      const ct = this.getCurTime();
      const dur = this.audioBuffer!.duration;
      const newTime = ct + (dur * (e.x - this.dragStartX!)) / bb.width;
      if (!this.playing) {
          this.pausedAt = newTime;
          this.$emit('currentTimeEmit', this.pausedAt)
          this.$emit('movePlayheadsEmit')
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
      const ratios = this.initFreqs.map(if_ => if_ / this.raga!.fundamental);
      this.raga!.ratios = ratios;
      this.$emit('updateSargamLinesEmit')
      this.instantiateTuning();
      this.tuningSines.forEach((oscNode, i) => {
        const curVal = oscNode.frequency.value;
        oscNode.frequency.setValueAtTime(curVal, this.now());
        const newVal = this.raga!.fundamental * this.raga!.ratios[i];
        oscNode.frequency.setValueAtTime(newVal, this.now() + this.lagTime);
      })
    },

    updateTuningGain(sIdx: number) {
      if (this.ac!.state === 'suspended') this.ac!.resume();
      const gainNode = this.tuningGainNodes[sIdx];
      const curGain = gainNode.gain.value;
      gainNode.gain.setValueAtTime(curGain, this.now());
      const endTime = this.now() + this.lagTime;
      const newGain = this.tuningGains[sIdx];
      gainNode.gain.linearRampToValueAtTime(newGain, endTime);
    },

    updateTuning(sIdx: number) {
      const oscNode = this.tuningSines[sIdx];
      const curFreq = oscNode.frequency.value;
      oscNode.frequency.setValueAtTime(curFreq, this.now());
      const endTime = this.now() + this.lagTime;
      const initFreq = this.initFreqs[sIdx];
      const newFreq = initFreq * 2 ** (this.centDevs[sIdx] / 1200);
      const newRatio = newFreq / this.raga!.fundamental;
      this.raga!.ratios[sIdx] = newRatio;
      oscNode.frequency.linearRampToValueAtTime(newFreq, endTime);
      this.$emit('updateSargamLinesEmit');
      this.$emit('unsavedChangesEmit', true);
    },

    instantiateTuning() {
      this.piece.realignPitches();
      this.$emit('resetZoomEmit')
    },

    passthroughResetZoom() {
      this.$emit('resetZoomEmit')
    },

    passthroughSelectMeter(pulseUniqueId: string, turnMMOn: boolean = false) {
      this.$emit('selectMeterEmit', pulseUniqueId, turnMMOn) //turn metermode on
    },

    passthroughAddMeter(meter: Meter) {
      this.$emit('addMeterEmit', meter)
    },

    passthroughAddMetricGrid(codified: boolean = true) {
      this.$emit('addMetricGridEmit', codified)
    },

    passthroughRemoveMeter(meter: Meter) {
      this.$emit('removeMeterEmit', meter)
    },

    passthroughUnsavedChanges(truth: boolean) {
      console.log('here')
      this.$emit('unsavedChangesEmit', truth)
    },

    passthroughAssignPrevMeter() {
      this.$emit('assignPrevMeterEmit')
    },

    makeTuningSines() {
      this.tuningGainNodes = [...Array(this.sargam.length)].map(() => {
        return this.ac!.createGain()
      });
      this.tuningSines = [...Array(this.sargam.length)].map(() => {
          return this.ac!.createOscillator()
      });
      this.tuningMasterGainNode = this.ac!.createGain();
      this.tuningMasterGainNode.connect(this.ac!.destination);
      this.tuningMasterGainNode.gain.setValueAtTime(0.25, this.now());
      this.tuningGainNodes.forEach((gainNode, i) => {
        gainNode.connect(this.tuningMasterGainNode!);
        gainNode.gain.setValueAtTime(0, this.now());
        const osc = this.tuningSines[i];
        osc.frequency.setValueAtTime(this.currentFreqs[i], this.now());
        osc.connect(gainNode);
        osc.start();
      });
    },
    // addKlattModule(url = this.ksUrl)
    // async setUpKlattNode(url: string, destination: GainNode) {
    //   try {
    //     await this.ac!.audioWorklet.addModule(url);
    //     this.klattNode = new AudioWorkletNode(this.ac!, 'klatt-synth');
    //     const params = this.klattNode.parameters;
    //     const kn = this.klattNode;
    //     kn.f0 = params.get('f0');
    //     kn.f1 = params.get('f1');
    //     kn.f2 = params.get('f2');
    //     kn.f3 = params.get('f3');
    //     kn.f4 = params.get('f4');
    //     kn.f5 = params.get('f5');
    //     kn.f6 = params.get('f6');
    //     kn.b1 = params.get('b1');
    //     kn.b2 = params.get('b2');
    //     kn.b3 = params.get('b3');
    //     kn.b4 = params.get('b4');
    //     kn.b5 = params.get('b5');
    //     kn.b6 = params.get('b6');
    //     kn.db1 = params.get('db1');
    //     kn.db2 = params.get('db2');
    //     kn.db3 = params.get('db3');
    //     kn.db4 = params.get('db4');
    //     kn.db5 = params.get('db5');
    //     kn.db6 = params.get('db6');
    //     kn.flutterLevel = params.get('flutterLevel');
    //     kn.openPhaseRatio = params.get('openPhaseRatio');
    //     kn.breathinessDb = params.get('breathinessDb');
    //     kn.tiltDb = params.get('tiltDb');
    //     kn.gainDb = params.get('gainDb');
    //     kn.agcRmsLevel = params.get('agcRmsLevel');
    //     kn.cascadeEnabled = params.get('cascadeEnabled');
    //     kn.cascadeVoicingDb = params.get('cascadeVoicingDb');
    //     kn.cascadeAspirationDb = params.get('cascadeAspirationDb');
    //     kn.cascadeAspirationMod = params.get('cascadeAspirationMod');
    //     kn.nasalFormantFreq = params.get('nasalFormantFreq');
    //     kn.nasalFormantFreqToggle = params.get('nasalFormantFreqToggle');
    //     kn.nasalFormantBw = params.get('nasalFormantBw');
    //     kn.nasalFormantBwToggle = params.get('nasalFormantBwToggle');
    //     kn.nasalAntiformantFreq = params.get('nasalAntiformantFreq');
    //     kn.nasalAntiformantFreqToggle = params.get('nasalAntiformantFreqToggle')
    //     kn.nasalAntiformantBw = params.get('nasalAntiformantBw');
    //     kn.nasalAntiformantBwToggle = params.get('nasalAntiformantBwToggle');
    //     kn.parallelEnabled = params.get('parallelEnabled');
    //     kn.parallelVoicingDb = params.get('parallelVoicingDb');
    //     kn.parallelAspirationDb = params.get('parallelAspirationDb');
    //     kn.parallelAspirationMod = params.get('parallelAspirationMod');
    //     kn.fricationDb = params.get('fricationDb');
    //     kn.fricationMod = params.get('fricationMod');
    //     kn.parallelBypassDb = params.get('parallelBypassDb');
    //     kn.nasalFormantDb = params.get('nasalFormantDb');
    //     kn.extGain = params.get('extGain');
    //     const max = 0.125;

    //     kn.extGain?.setValueAtTime(max, this.now());
    //     this.klattMiddleGain = this.ac!.createGain();
    //     this.klattMiddleGain.gain.setValueAtTime(0, this.now());
    //     this.klattNode
    //       .connect(this.klattMiddleGain)
    //       .connect(destination)
    //   } catch (e) {
    //     console.error(e);
    //   }
    // },

    // async setUpSarangiNode(destination: GainNode) {
    //   try {
    //     await this.ac!.audioWorklet.addModule(ssURL);
    //     this.sarangiSynth = new AudioWorkletNode(this.ac!, 'sarangi');
    //     this.sarangiSynth.freq = this.sarangiSynth.parameters.get('Frequency');
    //     this.sarangiSynth.bowGain = this.sarangiSynth.parameters.get('BowGain');
    //     this.sarangiSynth.gain = this.sarangiSynth.parameters.get('Gain');
    //     this.sarangiSynth.gain!.setValueAtTime(1.0, this.now());
    //     this.sarangiSynth.bowGain!.setValueAtTime(0.0, this.now());
    //     this.sarangiSynth.connect(destination);
    //   } catch (e) {
    //     console.error(e);
    //   }
    // },
    
    async parentLoaded() {
      this.gatherInfo();
      const instrumentation = this.piece.instrumentation[0];
      const stringInsts = [
        'Sitar', 
        'Sarod', 
        'Surbahar', 
        'Veena (Saraswati)',
        'Veena (Vichitra)',
        'Veena, Rudra (Bin)',
      ];
      const vocInsts = ['Vocal (M)', 'Vocal (F)'];
      this.vocal = vocInsts.includes(instrumentation);
      this.sarangi = instrumentation === 'Sarangi';
      this.string = stringInsts.includes(instrumentation);
      // if (this.string) {
      //   this.ac!.audioWorklet.addModule(AudioWorklet(ksURL))
      //     .then(() => {
      //       this.moduleCt++;
      //       if (this.moduleCt === 3) {
      //         this.modsLoaded = true;
      //         if (!this.inited && this.piece) this.initAll();
      //       }
      //     })
      //     .catch((err) => {
      //       console.log(err);
      //     });
      //   this.ac!.audioWorklet.addModule(AudioWorklet(cURL))
      //     .then(() => {
      //       this.moduleCt++;
      //       if (this.moduleCt === 3) {
      //         this.modsLoaded = true;
      //         if (!this.inited && this.piece) this.initAll();
      //       }
      //     })
      //     .catch((err) => {
      //       console.log(err);
      //     });
      // } 
      
      // this.ac!.audioWorklet.addModule(AudioWorklet(caURL))
      //   .then(() => {
      //     this.moduleCt++;
      //     let trialNum = this.string ? 3 : 1;
      //     if (this.moduleCt === trialNum) {
      //       this.modsLoaded = true;
      //       if (!this.inited && this.piece) this.initAll();
      //     }
      //   })
      //   .catch((err) => {
      //     console.log(err);
      //   });

      this.makeTuningSines();
      if (this.piece) {
        if (!this.piece.audioID && !this.piece.audio_DB_ID) {
          this.loading = false;
          this.noAudio = true;
          this.synthGain = 1;
          this.chikariGain = 1;
          this.recGain = 0;
          if (this.modsLoaded && !this.inited) this.initAll()
        }
      }
    },

    stretch(tempo = 1.0) {
      if (this.stretchBuf) {
        const left = this.stretchBuf.getChannelData(0);
        const right = this.stretchBuf.numberOfChannels > 1 ?
          this.stretchBuf.getChannelData(1) : left;
        this.stretchWorker!.postMessage({
          name: 'stretch',
          tempo: tempo,
          left: left,
          right: right,
        });
        this.stretchWorker!.onmessage = e => {
          if (e.data.name === 'stretched') {
            this.stretchedBuffer = this.ac!.createBuffer(
              2,
              e.data.left.length,
              this.ac!.sampleRate
            );
            this.stretchedBuffer.copyToChannel(e.data.left, 0);
            this.stretchedBuffer.copyToChannel(e.data.right, 1);
            const initDur = this.regionEndTime! - this.regionStartTime!;
            const factor = initDur / this.stretchedBuffer!.duration;
            this.$emit('update:stretchedFactor', factor)
          }
        }
      }
    },

    initStretchWorker() {
      this.stretchWorker = new Worker(stretcherURL);
    },

    handleRegionSpeedChange() {
      this.stretch(2 ** this.regionSpeed);
    },

    toggleRegionSpeed() {
      console.log('toggling region speed')
      if (this.regionSpeedOn) {
        this.stretch(2 ** this.regionSpeed);
        const time = this.regionStartTime!;
        this.$emit('currentTimeEmit', time)
        if (!this.playing) {
          this.pausedAt = time;
          this.updateProgress();
          this.updateFormattedCurrentTime();
          this.updateFormattedTimeLeft();
        } else {
          console.log('this should not happen')
        }
        this.$emit('movePlayheadsEmit')
        this.synthGainDisabled = true;
        this.chikariGainDisabled = true;
        const curSG = this.synthGainNode!.gain.value;
        this.synthGainNode!.gain.setValueAtTime(curSG, this.now());
        this.synthGain = 0;
        this.synthGainNode!.gain
          .linearRampToValueAtTime(0, this.now() + this.lagTime);
        this.savedSynthGain = curSG;
        const curCG = this.chikariGainNode!.gain.value;
        this.chikariGainNode!.gain.setValueAtTime(curCG, this.now());
        this.chikariGain = 0;
        this.chikariGainNode!.gain
          .linearRampToValueAtTime(0, this.now() + this.lagTime);
        this.savedChikariGain = curCG;

      } else {
        this.regionSpeed = 0;
        this.$emit('update:stretchedFactor', 1)
        this.stretchedBuffer = undefined;
        this.synthGainDisabled = false;
        this.chikariGainDisabled = false;
        if (this.savedSynthGain !== undefined) {
          this.synthGainNode!.gain.setValueAtTime(0, this.now());
          const ssg = this.savedSynthGain;
          this.synthGainNode!.gain
            .linearRampToValueAtTime(ssg, this.now() + this.lagTime);
          this.synthGain = this.savedSynthGain;
        }
        if (this.savedChikariGain !== undefined) {
          this.chikariGainNode!.gain.setValueAtTime(0, this.now());
          const scg = this.savedChikariGain;
          this.chikariGainNode!.gain
            .linearRampToValueAtTime(scg, this.now() + this.lagTime);
          this.chikariGain = this.savedChikariGain;
        }
      }
    },

    updateStretchBuf() {
      const start = this.regionStartTime!;
      const end = this.regionEndTime!;
      console.log('start: ', start, 'end: ', end)
      const startSample = Math.round(start * this.ac!.sampleRate);
      const endSample = Math.round(end * this.ac!.sampleRate);
      // make new audio buffer
      const sr = this.ac!.sampleRate;
      this.stretchBuf = this.ac!.createBuffer(2, endSample - startSample, sr);
      // copy data over
      const left = this.audioBuffer!
        .getChannelData(0)
        .slice(startSample, endSample+1);
      const right = this.audioBuffer!.numberOfChannels > 1 ?
        this.audioBuffer!.getChannelData(1).slice(startSample, endSample+1) :
        left;
      this.stretchBuf.copyToChannel(left, 0);
      this.stretchBuf.copyToChannel(right, 1);
    },

    // initAll() {
    //   if (this.string) {
    //     this.initializePluckNode();
    //     this.initializeChikariNodes();
    //   } else if (this.vocal) {
    //     const browser = detect();
    //     const version = browser!.version!.split('.')[0];
    //     const c1 = browser!.name === 'chrome';
    //     const c2 = browser!.name === 'firefox' && Number(version) >= 113;
    //     const c3 = browser!.name === 'edge-chromium';
    //     if (c1 || c2 || c3) {
    //       this.setUpKlattNode(klattURL, this.intSynthGainNode!);
    //       this.klattActive = true
    //     } else {
    //       this.initializeVocalNode()
    //     }
    //   } else if (this.sarangi) {
    //     this.setUpSarangiNode(this.intSynthGainNode!)
    //   }
    //   this.initializeBufferRecorder();
    //   this.preSetFirstEnvelope(256);
    //   this.initStretchWorker();
    //   this.inited = true;
    // },

    initializeStretching() {
      // this.initializeBufferRecorder();
      this.initStretchWorker();
    },
    gatherInfo() {
      const obj = this.audioDBDoc;
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
          const pSec = obj.raags[raag]['performance sections']!;
          const localPSecs = Object.keys(pSec);
          return localPSecs.join(', ');
        });
        this.raags = raags.map((raag, i) => {
          return `${raag}: ${pSecs[i]}`;
        });
      }
      this.raga = this.piece.raga;
      this.ruleSet = this.piece.raga.ruleSet;
      this.ETRatios = this.raga.setRatios(this.ruleSet); // equal temperement
      this.initFreqs = this.ETRatios.map(ratio => {
        return this.raga!.fundamental * ratio
      })
      this.currentFreqs = this.raga.ratios.map(ratio => {
        return this.raga!.fundamental * ratio
      })
      this.sargam = this.raga.sargamLetters;
      this.centDevs = this.currentFreqs.map((cf, i) => {
        return 1200 * Math.log2(cf / this.initFreqs[i]);
      })
      this.tuningGains = [...Array(this.sargam.length)].fill(0);
    },
    getRoleRank(musician: MusicianType) {
      const roles = ['Soloist', 'Percussionist', 'Accompanist', 'Drone'];
      return roles.indexOf(musician.role);
    },
    playChikaris(curPlayTime: number, now: number, otherNode: ChikariNodeType) {
      const gain = this.intChikariGainNode!.gain;
      gain.setValueAtTime(0, now);
      gain.linearRampToValueAtTime(1, now + this.slowRamp);
      this.piece.phrases.forEach((phrase: Phrase) => {
        Object.keys(phrase.chikaris).forEach((key) => {
          const time = now + phrase.startTime! + Number(key) - curPlayTime;
          if (time >= this.now()) {
            this.sendBurst(time, 0.01, otherNode, 0.025, 0.2);
          }
        });
      });
    },
    cancelBursts(when?: number) {
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
    playTrajs(curPlayTime = 0, now: number) {
      
      const phrases = this.piece.phrases;
      const allTrajs = phrases.map((p) => p.trajectories).flat();
      const allStarts = getStarts(allTrajs.map((t) => t.durTot));
      const allEnds = getEnds(allTrajs.map((t) => t.durTot));
      const startIdx = allStarts.findIndex((s) => s >= curPlayTime);
      const gain = this.intSynthGainNode!.gain;
      gain.setValueAtTime(0, now);
      gain.linearRampToValueAtTime(1, now + this.slowRamp);
      const remainingTrajs = allTrajs.slice(startIdx);
      remainingTrajs.forEach((traj, i_) => {
        const i = i_ + startIdx;
        if (this.string) {
          this.playArticulations(traj, now + Number(allStarts[i]) - curPlayTime);
        }
        if (traj.id !== 12) {
          const st = now + allStarts[i] - curPlayTime;
          const et = now + allEnds[i] - curPlayTime;
          const lastTraj = remainingTrajs[i_-1];
          const fromSil = i === 0 || !lastTraj || lastTraj.id === 12;
          const last = i_ === remainingTrajs.length - 1;
          const toSil = last || remainingTrajs[i_+1].id === 12;
          if (this.string) {
            this.playStringTraj(traj, st, et, 64, i === 0);
          } else if (this.vocal) {
            if (this.klattActive) {
              this.playKlattTraj(traj, st, et, fromSil, toSil);
            } else {
              this.playVocalTraj(traj, st, et, i === 0, fromSil, toSil);
            }
          } else if (this.sarangi) {
            this.playSarangiTraj(traj, st, et, fromSil, toSil);
          }
        }
      });
    },
    playArticulations(traj: Trajectory, startTime: number) {
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
          this.sendBurst(when, 0.01, this.pluckNode!, 0.05, 1);
        });
        hammerOffs.forEach((time) => {
          const when = Number(startTime) + Number(time) * Number(traj.durTot);
          this.sendBurst(when, 0.01, this.pluckNode!, 0.05, 0.5);
        });
        hammerOns.forEach((time) => {
          const when = Number(startTime) + Number(time) * Number(traj.durTot);
          this.sendBurst(when, 0.01, this.pluckNode!, 0.05, 0.3);
        });
        slides.forEach((time) => {
          const when = Number(startTime) + Number(time) * Number(traj.durTot);
          this.sendBurst(when, 0.01, this.pluckNode!, 0.05, 0.1);
        });
        dampens.forEach(time => {
          const when = Number(startTime) + Number(time) * Number(traj.durTot);
          const curVal = this.pluckNode!.cutoff!.value;
          this.pluckNode!.cutoff!
            .setValueAtTime(curVal, when);
          this.pluckNode!.cutoff!
            .linearRampToValueAtTime(0, when + 1 * this.lagTime);
          this.pluckNode!.cutoff!
            .setValueAtTime(0, when + this.lagTime + 0.025)
          this.pluckNode!.cutoff!
            .linearRampToValueAtTime(curVal, when + this.lagTime + 0.03);
        })
      }
    },
  
    sendBurst(when: number, dur: number, to: AudioNode, atk = 0.05, amp = 1) {
      amp *= 2;
      if (this.ac === undefined) {
        throw new Error('audio context is undefined');
      }
      const bufSize = this.ac.sampleRate * dur;
      const noiseBuffer = this.ac.createBuffer(1, bufSize, this.ac.sampleRate);
      const attackSize = this.ac.sampleRate * atk;
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
      bufferSourceNode.connect(to);
      bufferSourceNode.buffer = noiseBuffer;
      bufferSourceNode.start(when);
    },


    playStringTraj(
        traj: Trajectory, 
        startTime: number, 
        endTime: number, 
        valueCt: number, 
        first = false
      ) {
      const valueDur = 0.02;
      // this seems to be undoing valueCt; so why is it here?
      valueCt = Math.round((endTime - startTime) / valueDur);
      const freq = this.pluckNode!.frequency!;
      const lpFreq = this.lowPassNode!.frequency;
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

    playVocalTraj(
      traj: Trajectory, 
      startTime: number, 
      endTime: number, 
      first: boolean = false, 
      fromSil: boolean = false, 
      toSil:boolean = false) {
      const lag = 0.01;
      const valueDur = 0.02;
      const valueCt = Math.round((endTime - startTime) / valueDur);
      const freq = this.vocalNode!.frequency;
      const verySmall = 0.000000000001;
      if (first) {
        const offset = startTime < this.now() ? this.now() - startTime : 0;
        const start = startTime + offset;
        const duration = endTime - start - verySmall;
        if (duration < 0) {
          console.log(duration, traj)
        }
        this.vocalGainNode!.gain.setValueAtTime(0, start-lag);
        this.vocalGainNode!.gain.linearRampToValueAtTime(1, start);
        freq.setValueCurveAtTime(this.firstEnvelope, start, duration);
        if (toSil) {
          this.vocalGainNode!.gain.setValueAtTime(1, endTime);
          this.vocalGainNode!.gain.linearRampToValueAtTime(0, endTime+lag);
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
          this.vocalGainNode!.gain.setValueAtTime(0, startTime-lag);
          this.vocalGainNode!.gain.linearRampToValueAtTime(1, startTime);
        }
        if (toSil) {
          this.vocalGainNode!.gain.setValueAtTime(1, endTime);
          this.vocalGainNode!.gain.linearRampToValueAtTime(0, endTime+lag);
        }
      }
    },

    playKlattTraj(
        traj: Trajectory, 
        startTime: number, 
        endTime: number, 
        fromSil = false, 
        toSil = false) {
      const valueDur = 0.02;
      const durTot = endTime - startTime;
      const valueCt = Math.round(durTot / valueDur);
      const freq = this.klattNode!.f0!;
      const verySmall = 0.000000000001;
      const shwahTime = 0.3;
      const envelope = new Float32Array(valueCt);
      const transp = 2 ** (this.transposition / 1200);
      const max = 0.125;
      const gainEnvelope = traj.automation!.generateValueCurve(valueDur, durTot, max)
      for (let i = 0; i < valueCt; i++) {
        envelope[i] = transp * traj.compute(i / (valueCt - 1));
      }
      const duration = endTime - startTime - verySmall;
      if (duration < 0) {
        console.log(duration, traj)
      }
      freq.setValueCurveAtTime(envelope, startTime, duration);
      this.klattNode!.extGain!.setValueCurveAtTime(gainEnvelope, startTime, duration);
      const vowels = ['a', 'ā', 'i', 'ī', 'u', 'ū', 'ē', 'ai','ō', 'au', '_'];
      const vpIdxs = [7, 6, 1, 0, 9, 10, 2, 3, 8, 5, 7];
      let vIdx = traj.vowel ? vowels.indexOf(traj.vowel) : 0;
      if (this.uniformVowel) {
        vIdx = 0
      }
      type Param = 'f1' | 'f2' | 'f3' | 'b1' | 'b2' | 'b3';
      const params: Param[] = ['f1', 'f2', 'f3', 'b1', 'b2', 'b3'];
      params.forEach((param, pIdx) => {
        const idx = vpIdxs[vIdx];
        const s0 = this.vowelParams[idx][0][pIdx];
        const s1 = idx === 1 || idx === 3 ? s0 : this.vowelParams[idx][1][pIdx];
        const audioParam = this.klattNode![param] as AudioParam;
        audioParam.setValueAtTime(s0, startTime);
        audioParam.linearRampToValueAtTime(s1, startTime + shwahTime);
      });
      // const max = 0.125;
      if (fromSil) {
        // this.klattNode!.extGain!.setValueAtTime(0, startTime);
        // this.klattNode!.extGain!.linearRampToValueAtTime(max, startTime + 0.01);
        this.klattMiddleGain!.gain.setValueAtTime(0, startTime);
        this.klattMiddleGain!.gain.linearRampToValueAtTime(1, startTime + 0.01);
      }
      if (toSil) {
        // this.klattNode!.extGain!.setValueAtTime(max, endTime - 0.01);
        // this.klattNode!.extGain!.linearRampToValueAtTime(0, endTime);
        this.klattMiddleGain!.gain.setValueAtTime(1, endTime - 0.01);
        this.klattMiddleGain!.gain.linearRampToValueAtTime(0, endTime);
      }
      this.klattNode!.flutterLevel!.setValueAtTime(0.15, startTime);
    },

    playSarangiTraj(
        traj: Trajectory, 
        startTime: number, 
        endTime: number, 
        fromSil = false, 
        toSil = false) {
      const valueDur = 0.02;
      const durTot = endTime - startTime;
      const valueCt = Math.round(durTot / valueDur);
      const freq = this.sarangiSynth!.freq!;
      const bowGain = this.sarangiSynth!.bowGain!;
      const verySmall = 0.000000000001;
      const envelope = new Float32Array(valueCt);
      const gainEnv = traj.automation!.generateValueCurve(valueDur, durTot);
      const transp = 2 ** (this.transposition / 1200);
      for (let i = 0; i < valueCt; i++) {
        envelope[i] = transp * traj.compute(i / (valueCt - 1));
      }
      const duration = endTime - startTime - verySmall;
      freq.setValueCurveAtTime(envelope, startTime, duration);
      this.sarangiSynth!.gain!.setValueCurveAtTime(gainEnv, startTime, duration);
      if (fromSil) {
        bowGain.setValueAtTime(0, startTime);
        bowGain.linearRampToValueAtTime(0.5, startTime + 0.01);
      }
      if (toSil) {
        bowGain.setValueAtTime(0.5, endTime - 0.01);
        bowGain.linearRampToValueAtTime(0, endTime);
      }
    },
    

    preSetFirstEnvelope(valueCt: number) {
      const phrases = this.piece.phrases;
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
    // async initializeChikariNodes() {
    //   if (this.ac === undefined) {
    //     throw new Error('audio context is undefined');
    //   }
    //   if (this.intChikariGainNode) this.intChikariGainNode.disconnect();
    //   this.intChikariGainNode = this.ac.createGain();
    //   if (this.chikariNodes) this.chikariNodes.forEach((cn) => cn.disconnect());
    //   const options = { numberOfInputs: 1, numberOfOutputs: 2 };
    //   const sName = 'chikaris'
    //   try {
    //     this.otherNode = await new AudioWorkletNode(this.ac, sName, options);
    //   } catch (e) {
    //     console.log(e);
    //     this.ac.audioWorklet.addModule(AudioWorklet(cURL))
    //       .then(() => {
    //         this.otherNode = new AudioWorkletNode(this.ac!, sName, options);
    //       });
    //   }
    //   if (this.otherNode === undefined) {
    //     throw new Error('other node is undefined');
    //   }
    //   this.otherNode.freq0 = this.otherNode.parameters.get('freq0');
    //   this.otherNode.freq1 = this.otherNode.parameters.get('freq1');
    //   this.otherNode.cutoff = this.otherNode.parameters.get('Cutoff');
    //   this.otherNode.cutoff!.setValueAtTime(0.7, this.now());
    //   this.otherNode.connect(this.intChikariGainNode, 0);
    //   this.otherNode.connect(this.intChikariGainNode, 1);
    //   this.chikariDCOffsetNode = this.ac.createBiquadFilter();
    //   this.chikariDCOffsetNode.type = 'highpass';
    //   this.chikariDCOffsetNode.frequency.setValueAtTime(5, this.now());
    //   this.intChikariGainNode
    //     .connect(this.chikariDCOffsetNode)
    //     .connect(this.chikariGainNode!);
    //   const raga = this.piece.raga;
    //   const freqs = raga.chikariPitches.map((p) => p.frequency);
    //   const transp = 2 ** (this.transposition / 1200);
    //   this.otherNode.freq0!.setValueAtTime(freqs[0] * transp, this.now());
    //   this.otherNode.freq1!.setValueAtTime(freqs[1] * transp, this.now());
    // },
    // initializePluckNode() {
    //   if (this.pluckNode) {
    //     this.pluckNode.disconnect();
    //     this.pluckNode.port.close();
    //     this.pluckNode = null;
    //   }
    //   if (this.lowPassNode) this.lowPassNode.disconnect();
    //   this.pluckNode = new AudioWorkletNode(this.ac!, 'karplusStrong');
    //   this.pluckDCOffsetNode = this.ac!.createBiquadFilter();
    //   this.pluckDCOffsetNode.type = 'highpass';
    //   this.pluckDCOffsetNode.frequency.setValueAtTime(5, this.now());
    //   this.lowPassNode = this.ac!.createBiquadFilter();
    //   this.lowPassNode.type = 'lowpass';
    //   const fund = this.piece.raga.fundamental;
    //   this.lowPassNode.frequency.setValueAtTime(fund * 2 ** 3, this.now());
    //   this.pluckNode
    //     .connect(this.pluckDCOffsetNode)
    //     .connect(this.lowPassNode)
    //     .connect(this.intSynthGainNode!);
    //   this.pluckNode.frequency = this.pluckNode.parameters.get('Frequency');
    //   this.pluckNode.cutoff = this.pluckNode.parameters.get('Cutoff');
    //   this.pluckNode.cutoff!.setValueAtTime(Number(this.synthDamp), this.now());
    // },
    // initializeVocalNode() {
    //   if (this.vocalNode) this.vocalNode.disconnect();
    //   this.vocalNode = this.ac!.createOscillator();
    //   this.vocalNode.type = 'triangle';
    //   this.vocalGainNode = this.ac!.createGain();
    //   this.vocalGainNode.gain.setValueAtTime(0, this.now());
    //   this.vocalNode
    //     .connect(this.vocalGainNode)
    //     .connect(this.intSynthGainNode!);
    //   this.vocalNode.start();
    // },  
    initializeBufferRecorder() {
      // the buffer source node
      this.synthLoopSource = this.ac!.createBufferSource();
      this.synthLoopSource.loop = true;
      this.synthLoopGainNode = this.ac!.createGain();
      this.synthLoopGainNode.gain.setValueAtTime(1, this.now());
      this.synthLoopSource
        .connect(this.synthLoopGainNode)
        .connect(this.synthGainNode!);
      this.chikLoopSource = this.ac!.createBufferSource();
      this.chikLoopSource.loop = true;
      this.chikLoopGainNode = this.ac!.createGain();
      this.chikLoopGainNode.gain.setValueAtTime(1, this.now());
      this.chikLoopSource
        .connect(this.chikLoopGainNode)
        .connect(this.chikariGainNode!);
      // the recorder
      const options = { numberOfInputs: 2, numberOfOutputs: 0 };
      this.capture = new AudioWorkletNode(this.ac!, 'captureAudio', options);
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
        const sr = this.ac!.sampleRate;
        const synthBuffer = this.ac!.createBuffer(1, synthArr.length, sr);
        synthBuffer.copyToChannel(synthArr, 0);
        const chikArr = new Float32Array(e.data[1]);
        const chikBuffer = this.ac!.createBuffer(1, chikArr.length, sr);
        chikBuffer.copyToChannel(chikArr, 0);
        const offset = this.now() - this.endRecTime!;
        if (this.synthLoopSource === undefined) {
          throw new Error('synthLoopSource is undefined');
        }
        if (this.chikLoopSource === undefined) {
          throw new Error('chikLoopSource is undefined');
        }
        this.synthLoopSource.buffer = synthBuffer;
        this.synthLoopSource.start(this.now(), offset);
        this.synthLoopSource.playing = true;
        this.chikLoopSource.buffer = chikBuffer;
        this.chikLoopSource.start(this.now(), offset);
        this.chikLoopSource.playing = true;
              
      }
    },

    resetPluckNode() {
      this.pluckNode?.port.postMessage('kill');
      this.initializePluckNode();
    },


    async getAudio(filepath: string, verbose: boolean) {
      try {
        const start = await performance.now();
        const res = await fetch(filepath);
        const fetched = (await performance.now()) - start;
        if (verbose) console.log('fetched: ', fetched / 1000);
        const arrayBuffer = await res.arrayBuffer();
        const midpoint = (await performance.now()) - start;
        if (verbose) console.log('array buffd: ', midpoint / 1000);
        const audioBuffer = await this.ac!.decodeAudioData(arrayBuffer);
        const endpoint = (await performance.now()) - start;
        if (verbose) console.log('done: ', endpoint / 1000);
        return audioBuffer;
      } catch (err) {
        console.log(err);
      }
    },
    back_15() {
      let newTime = this.getCurTime() - 15;
      if (newTime < 0) newTime = 0;
      if (!this.playing) {
        this.pausedAt = newTime;
        this.$emit('currentTimeEmit', newTime);
        this.$emit('movePlayheadsEmit')
        this.updateProgress();
      } else {
        this.stop();
        this.pausedAt = newTime;
        this.play();
      }
    },
    forward_15() {
      let newTime = this.getCurTime() + 15;
      if (newTime > this.audioBuffer!.duration) {
        newTime = this.audioBuffer!.duration;
      }
      if (!this.playing) {
        this.pausedAt = newTime;
        this.$emit('currentTimeEmit', newTime);
        this.$emit('movePlayheadsEmit')
        this.updateProgress();
      } else {
        this.stop();
        this.pausedAt = newTime;
        this.play();
      }
    },

    trackEnd() {
      let newTime = this.durTot;
      if (!this.playing) {
        this.$emit('currentTimeEmit', newTime);
        this.$emit('movePlayheadsEmit')
        this.updateProgress();
      } else {
        this.stop();
        this.pausedAt = newTime;
        this.play();
      }
      
    },
    
    now() {
      return this.ac!.currentTime;
    },

    playStretched() {
      const offset = (this.parentCurrentTime - this.regionStartTime!);
      console.log('playing stretched, offset: ', offset)
      const scaledOffset = offset / (2 ** this.regionSpeed);
      this.sourceNode = this.ac!.createBufferSource();
      this.sourceNode.connect(this.gainNode!);
      this.sourceNode.buffer = this.stretchedBuffer!;
      this.sourceNode.loop = this.loop;
      this.sourceNode.start(this.now(), scaledOffset);
      this.sourceNode.addEventListener('ended', () => {
        console.log('stretched ended')
        this.pauseStretched(this.playing); // this is a fancy way of saying that 
        // if the sourceNode has ended naturally (without the user pausing it),
        // then it should return to the beginning, otehrwise, stay where it is.
        // this.$emit('stopStretchedAnimationEmit')
        if (this.loop) {
          this.$emit('currentTimeEmit', this.regionStartTime);
        } else {
          this.$emit('currentTimeEmit', this.getStretchedCurTime());
        }
      })
      this.playing = true;
      this.pausedAt = 0;
      this.startedAt = this.now() - scaledOffset;
    },

    pauseStretched(returnToStart=false) {
      console.log('pausing stretched')
      if (this.regionEndTime === undefined) {
        throw new Error('regionEndTime is undefined')
      }
      if (this.regionStartTime === undefined) {
        throw new Error('regionStartTime is undefined')
      }
      const elapsed = this.now() - this.startedAt;
      let scaledElapsed = (2 ** this.regionSpeed) * elapsed;
      if (this.loop) {
        const tot = this.regionEndTime - this.regionStartTime;
        scaledElapsed = scaledElapsed % tot;
      }
      this.stopStretched();
      this.pausedAt = returnToStart ? 
        this.regionStartTime : 
        scaledElapsed + this.regionStartTime;
      this.$emit('movePlayheadsEmit', 'justShadowPlayhead')
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
      this.sourceNode = this.ac!.createBufferSource();
      this.sourceNode.connect(this.gainNode!);
      this.sourceNode.buffer = this.audioBuffer!;
      this.sourceNode.start(this.now(), offset);
      const allLoops = this.loop && this.loopStart && this.loopEnd;
      if (allLoops && this.pausedAt < this.loopEnd!) {
        this.sourceNode.loop = this.loop;
        this.sourceNode.loopStart = this.loopStart!;
        this.sourceNode.loopEnd = this.loopEnd!;
        if (this.pausedAt > this.loopStart!) {
          this.pausedAt = this.loopStart!;
        } 
        
        console.log('need to reimplement this')
        const startRecTime = this.now() + this.loopStart! - this.pausedAt;
        const duration = this.loopEnd! - this.loopStart!;
        const endRecTime = startRecTime + duration;
        const s = this.$refs.synths as InstanceType<typeof Synths>;
        s.recordAllSynths(startRecTime, endRecTime);
        // const bufSize = duration * this.ac!.sampleRate;
        // this.capture!.bufferSize!.setValueAtTime(bufSize, this.now());
        // this.capture!.active!.setValueAtTime(1, startRecTime);
        // this.capture!.active!.setValueAtTime(0, this.endRecTime);
        // const curGain = this.intSynthGainNode!.gain.value;
        // this.intSynthGainNode!.gain.setValueAtTime(curGain, this.endRecTime);
        // this.intSynthGainNode!.gain
        //   .setValueAtTime(0, this.endRecTime + this.lagTime);
        // this.synthLoopGainNode!.gain.setValueAtTime(1, this.endRecTime);

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
      // if (this.synthLoopSource === undefined) {
      //   throw new Error('synthLoopSource is undefined')
      // }
      // if (this.chikLoopSource === undefined) {
      //   throw new Error('chikLoopSource is undefined')
      // }
      // if (this.synthLoopSource.playing) {
      //   const curSynthGain = this.synthLoopGainNode!.gain.value;
      //   this.synthLoopGainNode!.gain.setValueAtTime(curSynthGain, this.now());
      //   const endTime = this.now() + this.lagTime;
      //   this.synthLoopGainNode!.gain.linearRampToValueAtTime(0, endTime)
      //   this.synthLoopSource.stop(this.now() + this.lagTime);
      //   this.synthLoopSource.onended = () => {
      //     this.synthLoopSource!.disconnect();
      //     this.synthLoopSource = this.ac!.createBufferSource();
      //     this.synthLoopSource.loop = true;
      //     this.synthLoopSource
      //       .connect(this.synthLoopGainNode!)
      //       .connect(this.synthGainNode!);
      //   }
      //   const curChikGain = this.chikLoopGainNode!.gain.value;
      //   this.chikLoopGainNode!.gain.setValueAtTime(curChikGain, this.now());
      //   this.chikLoopGainNode!.gain.linearRampToValueAtTime(0, endTime)
      //   this.chikLoopSource.stop(this.now() + this.lagTime);
      //   this.chikLoopSource.onended = () => {
      //     this.chikLoopSource!.disconnect();
      //     this.chikLoopSource = this.ac!.createBufferSource();
      //     this.chikLoopSource.loop = true;
      //     this.chikLoopSource
      //       .connect(this.chikLoopGainNode!)
      //       .connect(this.chikariGainNode!);
      //   }
      // }
      // if (this.capture!.active!.value === 1) {
      //   this.capture!.active!.setValueAtTime(0, this.now());
      //   this.capture!.cancel!.setValueAtTime(1, this.now());
      //   this.capture!.cancel!.setValueAtTime(0, this.now() + 0.1);
      // }
      const s = this.$refs.synths as InstanceType<typeof Synths>;
      s.stopRecordingSynths();
      this.pausedAt = 0;
      this.startedAt = 0;
      this.playing = false;
    },

    pause() {
      const elapsed = this.now() - this.startedAt;
      this.stop();
      if (this.playheadReturn) {
        if (this.startingDelta === undefined) {
          throw new Error('startingDelta is undefined')
        }
        this.pausedAt = this.startingDelta;
        this.$emit('currentTimeEmit', this.startingDelta);
        this.$emit('movePlayheadsEmit', 'justPlayhead')
      } else {
        this.pausedAt = this.loop ? this.loopTime! : elapsed;
        this.$emit('movePlayheadsEmit', 'justShadowPlayhead')
      } 
    },

    getCurTime() {
      if (this.pausedAt) {
        return this.pausedAt;
      } else if (this.playing) {
        if (this.startingDelta === undefined) {
          throw new Error('startingDelta is undefined')
        }
        if (this.loop && this.startingDelta < this.loopEnd!) {
          const dur = this.loopEnd! - this.loopStart!;
          const realTime = this.now() - this.startedAt;
          this.loopTime = realTime;
          if (realTime > this.loopEnd!) {
            this.loopTime =
              this.loopStart! + ((realTime - this.loopStart!) % dur);
          }
          return this.loopTime;
        } else {
          return this.now() - this.startedAt;
        }
      } else {
        return 0;
      }
    },

    getStretchedCurTime() {
      let out;
      if (this.pausedAt) {
        out = this.pausedAt;
      } else if (this.playing) {
        if (this.regionStartTime === undefined) {
          throw new Error('regionStartTime is undefined')
        }
        if (this.regionEndTime === undefined) {
          throw new Error('regionEndTime is undefined')
        }
        if (this.stretchedBuffer === undefined) {
          throw new Error('stretchedBuffer is undefined')
        }
        // const ed = this.$parent;
        const realDur = this.regionEndTime - this.regionStartTime;
        const bufDur = this.stretchedBuffer.duration;
        const realStretchedSpeed = Math.log2(realDur / bufDur)
        const elapsed = this.now() - this.startedAt;
        let scaledElapsed = (2 ** realStretchedSpeed) * elapsed;
        if (this.loop) {
          const tot = this.regionEndTime - this.regionStartTime;
          scaledElapsed = scaledElapsed % tot;
        }
        out = scaledElapsed + this.regionStartTime;
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
        this.progress = this.getCurTime() / this.piece.durTot!;
      } else {
        this.progress = this.getCurTime() / this.audioBuffer!.duration;
      }
      const pbi = document.querySelector('.progBarInner') as HTMLDivElement;
      const pbo = document.querySelector('.progBarOuter') as HTMLDivElement;
      const totWidth = pbo.getBoundingClientRect().width;
      pbi.style.width = this.progress * totWidth + 'px';
    },
    loopPlayAnimation(timestamp: number) {
        this.updateProgress();
        this.updateFormattedCurrentTime();
        this.updateFormattedTimeLeft();
        this.$emit('currentTimeEmit', this.getCurTime());
      this.requestId = undefined;
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
          const playImg = this.$refs.playImg as HTMLImageElement;
          playImg.classList.add('playing');
        } else {
          this.pauseStretched();
          const playImg = this.$refs.playImg as HTMLImageElement;
          playImg.classList.remove('playing');
        }
      } else {
        if (!this.playing) {
          this.play();
          const playImg = this.$refs.playImg as HTMLImageElement;
          playImg.classList.add('playing');
          this.startPlayCursorAnimation();
          const s = this.$refs.synths as InstanceType<typeof Synths>;
          s.playAllTrajs();
        } else {
          this.pause();
          const playImg = this.$refs.playImg as HTMLImageElement;
          playImg.classList.remove('playing');
          this.stopPlayCursorAnimation();
          const s = this.$refs.synths as InstanceType<typeof Synths>;
          s.cancelAllTrajs();
          // this.cancelPlayTrajs();
          // if (this.string) {
          //   this.cancelBursts();
          // }
          this.bufferSourceNodes = [];
        }
      }
    },
    cancelPlayTrajs(when?: number, mute=true) {
      if (when === undefined) when = this.now();
      if (this.string) {
        this.pluckNode!.frequency!.cancelScheduledValues(when);
        this.lowPassNode!.frequency.cancelScheduledValues(when);
        this.pluckNode!.cutoff!.cancelScheduledValues(when);
      } else if (this.vocal) {
        if (this.klattActive && this.klattNode !== undefined) {
          const curGain = this.klattNode!.extGain!.value;
          this.klattNode.parameters.forEach(param => {
            param.cancelScheduledValues(when! + 0.01);
          })
          this.klattNode.extGain!.setValueAtTime(curGain, when);
          this.klattNode.extGain!.linearRampToValueAtTime(0, when + 0.01);
          this.klattMiddleGain?.gain.cancelScheduledValues(when);
          const kmCurGain = this.klattMiddleGain!.gain.value;
          this.klattMiddleGain!.gain.setValueAtTime(kmCurGain, when);
          this.klattMiddleGain!.gain.linearRampToValueAtTime(0, when + 0.01);

        } else {
          this.vocalNode!.frequency.cancelScheduledValues(when);
          this.vocalGainNode!.gain.cancelScheduledValues(when);
          const curGain = this.vocalGainNode!.gain.value;
          this.vocalGainNode!.gain.setValueAtTime(curGain, when);
          this.vocalGainNode!.gain.linearRampToValueAtTime(0, when + 0.01);
        }
      } else if (this.sarangi) {
        this.sarangiSynth!.freq!.cancelScheduledValues(when);
        this.sarangiSynth!.bowGain!.cancelScheduledValues(when);
        this.sarangiSynth!.gain!.cancelScheduledValues(when);
        const curBowGain = this.sarangiSynth!.bowGain!.value;
        this.sarangiSynth!.bowGain!.setValueAtTime(curBowGain, when);
        this.sarangiSynth!.bowGain!.linearRampToValueAtTime(0, when + 0.01);
        const curGain = this.sarangiSynth!.gain!.value;
        this.sarangiSynth!.gain!.setValueAtTime(curGain, when);
        this.sarangiSynth!.gain!.linearRampToValueAtTime(0, when + 0.01);
      }
      this.intSynthGainNode!.gain.cancelScheduledValues(when);
      const rampEnd = when + this.slowRamp;
      if (mute) {
        const curSynthGain = this.intSynthGainNode!.gain.value;
        this.intSynthGainNode!.gain.setValueAtTime(curSynthGain, when);
        this.intSynthGainNode!.gain.linearRampToValueAtTime(0, rampEnd);
        if (this.string) {
          const curChikGain = this.intChikariGainNode!.gain.value;
          this.intChikariGainNode!.gain.setValueAtTime(curChikGain, when);
          this.intChikariGainNode!.gain.linearRampToValueAtTime(0, rampEnd);
        }  
      }
      if (this.string) {
        if (this.pluckNode === undefined || this.pluckNode === null) {
          throw new Error('pluckNode is undefined')
        }
        const curCutoff = this.pluckNode.cutoff!.value;
        this.pluckNode.cutoff!.setValueAtTime(curCutoff, when);
        this.pluckNode.cutoff!.linearRampToValueAtTime(this.synthDamp, rampEnd);
      }
    },
    toggleControls(e: MouseEvent) {
      if (!this.loading) {
        if (this.selectedControlsMode === ControlsMode.Synthesis) {
          this.selectedControlsMode = ControlsMode.None;
        } else {
          this.selectedControlsMode = ControlsMode.Synthesis;
        }
      }
    },
    toggleTuning(e: MouseEvent) {
      if (!this.loading) {
        if (this.selectedControlsMode === ControlsMode.Tuning) {
          this.selectedControlsMode = ControlsMode.None;
        } else {
          this.selectedControlsMode = ControlsMode.Tuning;
        }
      }
      
    },
    toggleDownloads(e: MouseEvent) {
      if (!this.loading) {
        if (this.selectedControlsMode === ControlsMode.Download) {
          this.selectedControlsMode = ControlsMode.None;
        } else {
          this.selectedControlsMode = ControlsMode.Download;
        }
      }
    },

    toggleMeterControls(e?: MouseEvent) {
      if (!this.loading) {
        if (this.selectedControlsMode === ControlsMode.Meter) {
          this.selectedControlsMode = ControlsMode.None;
        } else {
          this.selectedControlsMode = ControlsMode.Meter;
        }
      }
    },

    toggleLabelControls(e?: MouseEvent) {
      if (!this.loading) {
        if (this.selectedControlsMode === ControlsMode.Tag) {
          this.selectedControlsMode = ControlsMode.None;
        } else {
          this.selectedControlsMode = ControlsMode.Tag;
        }
      }
    },

    toggleSpecControls(e?: MouseEvent) {
      if (!this.loading) {
        if (this.selectedControlsMode === ControlsMode.Display) {
          this.selectedControlsMode = ControlsMode.None;
        } else {
          this.selectedControlsMode = ControlsMode.Display;
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
      this.$emit('currentTimeEmit', 0)
      // this.$emit('movePlayheadsEmit')
    },

    handleProgressClick(e: MouseEvent) {
      const pbOuter = this.$refs.pbOuter as HTMLDivElement;
      const bb = pbOuter.getBoundingClientRect();
      if (!this.playing) {
        this.pausedAt = (this.audioBuffer!.duration * e.clientX) / bb.width;
        this.$emit('currentTimeEmit', this.pausedAt)
        // this.$emit('movePlayheadsEmit')
        this.updateProgress();
      } else {
        this.stop();
        this.pausedAt = (this.audioBuffer!.duration * e.clientX) / bb.width;
        this.play();
      }
    },

    tooLeftLimit() {
      if (this.$refs.pbOuter && this.progress) {
        const pbOuter = this.$refs.pbOuter as HTMLDivElement;
        const bb = pbOuter.getBoundingClientRect();
        return this.progress < 35 / bb.width;
      } else {
        return true;
      }
    },

    tooRightLimit() {
      if (this.$refs.pbOuter && this.progress) {
        const pbOuter = this.$refs.pbOuter as HTMLDivElement;
        const bb = pbOuter.getBoundingClientRect();
        return this.progress >= 1 - 90 / bb.width;
      } else {
        return false;
      }
    },
    updateFormattedCurrentTime(ct?: number) {
      const st = structuredTime(ct ? ct : this.getCurTime());
      const ms = st.minutes + ':' + st.seconds;
      this.formattedCurrentTime = st.hours !== '0' ? ms : st.hours + ':' + ms;
    },
    updateFormattedTimeLeft(ct?: number) {
      if (this.audioBuffer && isNaN(this.audioBuffer.duration)) {
        return '00:00';
      } else {
        let ut;
        if (!this.noAudio) {
          const buf = this.audioBuffer!;
          ut = Number(buf.duration) - Number(ct ? ct : this.getCurTime());
        } else {
          const dt = Number(this.piece.durTot);
          ut = dt - Number(ct ? ct : this.getCurTime());
        }
        
        const st = structuredTime(ut);
        const ms = st.minutes + ':' + st.seconds;
        this.formattedTimeLeft = st.hours !== '0' ? ms : st.hours + ':' + ms;
      }
    },
    hoverTrigger(bool: boolean) {
      const classes_ = [
        '.currentTime',
        '.progressCircle',
        '.timeLeft',
        // '.invisibleProgressCircle',
      ];
      const cls = classes_.map((cl) => document.querySelector(cl)!.classList);
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
    handleCircleMouseDown(e: MouseEvent) {
      this.circleDragging = true;
      this.dragStartX = e.clientX;
      const main = this.$refs.main as HTMLDivElement;
      main.classList.toggle('hovering');
    },
    handleCircleMouseUp(e: MouseEvent) {
      if (this.circleDragging) {
        const pbOuter = this.$refs.pbOuter as HTMLDivElement;
        const bb = pbOuter.getBoundingClientRect();
        const ct = this.getCurTime();
        const dur = this.audioBuffer!.duration;
        const newTime = ct + (dur * (e.clientX - this.dragStartX!)) / bb.width;
        if (!this.playing) {
          this.pausedAt = newTime;
          this.$emit('currentTimeEmit', this.pausedAt)
          this.$emit('movePlayheadsEmit')
          this.updateProgress();
        } else {
          this.stop();
          this.pausedAt = newTime;
          this.play();
        }
        const pc = document.querySelector('.progressCircle') as HTMLDivElement;
        pc.style.right = '-7px';
        this.circleDragging = false;
        const main = this.$refs.main as HTMLDivElement;
        main.classList.toggle('hovering');
      }
    },
    handleCircleMouseMove(e: MouseEvent) {
      if (this.circleDragging) {
        const diff = this.dragStartX! - e.clientX;
        const pbi = document.querySelector('.progBarInner') as HTMLDivElement;
        const pbo = document.querySelector('.progBarOuter') as HTMLDivElement;
        const pboBox = pbo.getBoundingClientRect();
        pbi.style.width = pboBox.width * this.progress - diff + 'px';
      }
    },
    handleDownload() {
      if (this.dataChoice === 'xlsx') {
        excelData(this.piece._id!)
      } else if (this.dataChoice === 'json') {
        jsonData(this.piece._id!)
      }
    },
    preventSpace(e: MouseEvent) {
      // prevents spacebar from changing checkbox
      if (e && e.clientX === 0) e.preventDefault();
    },
    async toggleShift() {
      if (this.ac === undefined) {
        throw new Error('ac is undefined')
      }
      if (this.shiftOn) {
        this.rubberBandNode = await createRBNode(this.ac, rubberBandUrl);
        this.rubberBandNode.setHighQuality(true);
        this.gainNode!.disconnect(this.ac.destination);
        this.gainNode!.connect(this.rubberBandNode);
        this.rubberBandNode.connect(this.ac.destination);
        this.readyToShift = true;
      } else {
        this.rubberBandNode!.disconnect(this.ac.destination);
        this.gainNode!.disconnect(this.rubberBandNode!);
        this.gainNode!.connect(this.ac.destination);
        this.readyToShift = false;
        this.transposition = 0;
      }
    }
  },
});
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
.progBarOuter {
  width: 100%;
  height: 8px;
  background-color: #242424;
  overflow-x: hidden;
}
.progBarOuter:hover {
  cursor: pointer;
}
.progBarInner {
  width: 0px;
  background-color: lightgrey;
  height: 6px;
  position: absolute;
}
.progBarInner:hover {
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
  max-width: 300px;
  min-width: 250px;
  height: 100%;
  background-color: black;
}
.recInfo.left {
  height: calc(100% - 20px);
  min-width: 150px;
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
  max-width: 400px;
  min-width: 250px;
  height: 70px;
  background-color: black;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
}
.loadingSymbol {
  max-width: 400px;
  min-width: 250px;
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
  /* width: 540px; */
  width: 100%;
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
  width: v-bind(windowWidth+'px');
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
  max-width: 300px;
  min-width: 150px;
  flex-shrink: 2
}
.innerSpacer {
  height: 100%;
  max-width: 300px;
  min-width: 150px;
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

.rulerBox > .showLabelControls {
  filter: invert(46%) sepia(42%) saturate(292%) hue-rotate(78deg)
    brightness(94%) contrast(97%);
}

.rulerBox > .showSpecControls {
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
  writing-mode: vertical-lr;
  direction: rtl;
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
  writing-mode: vertical-lr;
  direction: rtl;

}

.cbBoxSmall > input[type=checkbox] {
  height: 20px;
  width: 20px;
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

.tagsImg {
  width: 40px;
}

.specImg {
  width: 40px;
}
</style>