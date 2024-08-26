<template>
<div class='mainzz'>
  <div class='upperRow'>
    <Renderer
      v-if='transcriptionWidth > 0 && transcriptionHeight > 0'
      id='renderer'
      ref='renderer'
      :yAxWidth='yAxWidth'
      :xAxHeight='xAxHeight'
      :scaledWidth='transcriptionWidth'
      :scaledHeight='transcriptionHeight'
      :piece='piece'
      :lowOctOffset='lowOctOffset'
      :highOctOffset='highOctOffset'
      :showSpectrogram='showSpectrogram'
      :showMelograph='melographVisible'
      :backgroundColor='backColor'
      :axisColor='axisColor'
      :melographColor='melographColor'
      :showTranscription='showMelody'
      :sargamLineColor='sargamLineColor'
      :showSargam='showSargam'
      :showSargamLines='showSargamLines'
      :showPhonemes='showPhonemes'
      :phonemeRepresentation='phonemeRepresentation'
      :instTracks='instTracks'
      :selectedMode='selectedMode'
      :showPhraseDivs='viewPhrases'
      :editable='editable'
      :sargamMagnetMode='sargamMagnetMode'
      :initViewDur='initViewDur'
      :meterMagnetMode='meterMagnetMode'
      :editingInstIdx='editingInstIdx'
      @zoomInY='zoomInY'
      @zoomOutY='zoomOutY'
      @zoomInX='zoomInX'
      @zoomOutX='zoomOutX'
      @xRangeInView='(xRange: [number, number]) => xRangeInView = xRange'
      @update:selectedMode='(mode: EditorMode) => selectedMode = mode'
      @unsavedChanges='unsavedChanges = $event'
      @update:TrajSelStatus='trajSelStatus = $event'
      @update:selPhraseDivUid='updateSelPhraseDivUid($event)'
      @update:trajTimePts='trajTimePts = $event'
      @update:editingInstIdx='editingInstIdx = $event'
      />
    <div class='controlBox'>
      <div class='scrollingControlBox'>
        <div class='cbRow visibilityToggle' @click='toggleVisibility'>
          <span :style='{ transform: `rotate(${rotation}deg)` }'>▼</span>
          <label>Visibility</label>
        </div>
        <div class='cbRow' v-if='visibilityTab'>
          <label>Spectrogram</label>
          <input 
            type='checkbox'
            v-model='showSpectrogram'
            @click='preventSpaceToggle'>
        </div>
        <div class='cbRow' v-if='visibilityTab'>
          <label>Melograph</label>
          <input 
            type='checkbox' 
            v-model='melographVisible'
            @change='toggleMelograph'
            @click='preventSpaceToggle'>
        </div>
        <div class='cbRow' v-if='visibilityTab'>
          <label>Sargam</label>
          <input 
            type='checkbox' 
            v-model='showSargam' 
            @click='preventSpaceToggle'>
        </div>
        <div class='cbRow' v-if='visibilityTab'>
          <label>Sargam Lines</label>
          <input 
            type='checkbox' 
            v-model='showSargamLines' 
            @click='preventSpaceToggle'>
        </div>
        <div v-if='!vocal && visibilityTab' class='cbRow' >
          <label>Bols</label>
          <input 
            type='checkbox' 
            v-model='showBols' 
            @click='preventSpaceToggle'>
        </div>
        <div v-if='visibilityTab' class='cbRow'>
          <label>Transcription</label>
          <input 
            type='checkbox' 
            v-model='showMelody' 
            @click='preventSpaceToggle'
            @change='updateTranscriptionVisibility'>
        </div>
        <div v-if='visibilityTab' class='cbRow'>
          <label>Meter</label>
          <input 
            type='checkbox' 
            v-model='showMeter' 
            @click='preventSpaceToggle'
            @change='updateMeterVisibility'
            >
        </div>
        <div class='cbRow' v-if='visibilityTab && vocal'>
          <label>Phonemes</label>
          <input 
            type='checkbox' 
            v-model='showPhonemes' 
            @click='preventSpaceToggle'>
        </div>
        <div class='cbRow' v-if='visibilityTab'>
          <label>Phrase Divs</label>
          <input 
            type='checkbox' 
            v-model='viewPhrases' 
            @click='preventSpaceToggle'>
        </div>
        <div class='lineBreakParent' v-if='visibilityTab'>
          <div class='lineBreak'>
          </div>
        </div>
        <div class='cbRow'>
          <label>Loop</label>
          <input type='checkbox' v-model='loop' @click='updateLoop'>
        </div>
        <div class='cbRow'>
          <label>Playhead Return</label>
          <input 
            type='checkbox' 
            v-model='playheadReturn' 
            @click='preventSpaceToggle'>
        </div>
        <div class='cbRow'>
          <label>Meter Magnet</label>
          <input
            type='checkbox'
            v-model='meterMagnetMode'
            @click='preventSpaceToggle'>
        </div>
        <div class='cbRow'>
          <label>Sargam Magnet</label>
          <input
            type='checkbox'
            v-model='sargamMagnetMode'
            @click='preventSpaceToggle'>
        </div>
        <div class='cbRow' v-if='vocal'>
          <label>Uniform Vowel</label>
          <input
            type='checkbox'
            v-model='uniformVowel'
            @click='preventSpaceToggle'>
        </div>
        <div class='cbRow'>
          <button @click='resetAudio'>Reset Audio</button>
          <button @click='resetZoom'>Reset Zoom</button>
          <button @click='savePiece'>Save</button>
        </div>
        <div class='cbRow'>
          <span class='savedDate'>
            {{`Saved: ${dateModified ? 
              dateModified.toLocaleString([], { 
                hour: '2-digit', minute: '2-digit'
              }) : ''}`}}
          </span>
        </div>
        <div class='cbRow' v-if='vocal'>
          <label>Phoneme Script</label>
          <select 
            v-model='phonemeRepresentation'
            >
            <option value='Devanagari'>Devanagari</option>
            <option value='IPA'>IPA</option>
            <option value='English'>Latin</option>
          </select>
        </div>
        <div class='instructionsIcon' @click='toggleInstructions'>?</div>
      </div>
      <TrajSelectPanel 
        ref='trajSelectPanel' 
        :editable='editable' 
        :ctrlBoxWidth='controlBoxWidth'
        :selectedPhraseDivUid='selectedPhraseDivUid'
        :piece='piece'

        :freqMax='freqMax'
        :freqMin='freqMin'
        :setNewTraj='setNewTraj'
        :trajTimePts='trajTimePts'
        :groupable='groupable'
        :trajSelStatus='trajSelStatus'
        :instrument='piece.instrumentation[editingInstIdx]'
        :selectedMode='selectedMode'
        @mutateTraj='mutateTrajEmit'
        @pluckBool='pluckBoolEmit'
        @newTraj='newTrajEmit'
        @vibObj='alterVibObj'
        @dampen='dampenEmit'
        @vowel='vowelEmit'
        @startConsonant='startConsonantEmit'
        @endConsonant='endConsonantEmit'
        @shiftOct='shiftTrajByOctave'
        @alterSlope='throttledAlterSlope'
        @update:phraseDivRendering='updatePhraseDivRendering'
        @unsavedChanges='updateUnsavedChanges'
        />
    </div>
  </div>
</div>
<EditorAudioPlayer 
  class='audioPlayer'
  ref='audioPlayer' 
  :audioSource='audioSource' 
  :recGain='recGain'
  :synthGain='synthGain'
  :synthDamping='synthDamping'
  :playerHeight='playerHeight'
  :controlsHeight='controlsHeight'
  :editable='editable'
  :windowWidth='fullWidth'
  :piece='piece'
  :regionStartTime='regionStartTime'
  :audioDBDoc='audioDBDoc'
  :regionEndTime='regionEndTime'
  :playheadReturn='playheadReturn'
  :parentCurrentTime='currentTime'
  :durTot='durTot'
  :uniformVowel='uniformVowel'
  :insertPulses='insertPulses'
  :transcriptionWidth='transcriptionWidth'
  :transcriptionHeight='transcriptionHeight'
  :xRangeInView='xRangeInView'
  :saEstimate='audioDBDoc?.saEstimate'
  :id='audioDBDoc?._id'
  :lowOctOffset='lowOctOffset'
  :highOctOffset='highOctOffset'
  :backgroundColor='backColor'
  :axisColor='axisColor'
  :melographColor='melographColor'
  :maxPitch='maxPitch'
  :minPitch='minPitch'
  :sargamLineColor='sargamLineColor'
  :instTracks='instTracks'
  :editingInstIdx='editingInstIdx'
  @resizeHeightEmit='resizeHeight'
  @currentTimeEmit='setCurrentTime'
  @updateSargamLinesEmit='updateSargamLines'
  @selectMeterEmit='selectMeter'
  @addMeterEmit='addMeter'
  @addMetricGridEmit='addMetricGrid'
  @removeMeterEmit='removeMeter'
  @unsavedChangesEmit='updateUnsavedChanges'
  @assignPrevMeterEmit='assignPrevMeter'
  @goToPhraseEmit='moveToPhrase'
  @goToSectionEmit='moveToSection'
  @maxLayerEmit='updateMaxLayer'
  @update:backgroundColor='backColor = $event'
  @update:axisColor='axisColor = $event'
  @update:melographColor='melographColor = $event'
  @update:saFreq='updateSaFreq'
  @update:minPitch='updateMinPitch'
  @update:maxPitch='updateMaxPitch'
  @update:sargamLineColor='sargamLineColor = $event'
  @update:instTracks='updateInstTracks'
  />
  <ContextMenu 
    :x='contextMenuX'
    :y='contextMenuY'
    :closed='contextMenuClosed'
    :choices='contextMenuChoices'
    />
  <AutomationWindow
    v-if='autoWindowOpen && autoTrajs.length > 0 && piece && editable'
    :trajectories='autoTrajs'
    :x='autoWindowX'
    :y='autoWindowY'
    :width='autoWindowWidth'
    :piece='piece'
    />
</template>
<script lang='ts'>
const getClosest = (counts: number[], goal: number) => {
  return counts.reduce((prev, curr) => {
    return Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev
  })
};
const structuredTime = (dur: number) => {
  const hours = String(Math.floor(dur / 3600));
  const minutes = leadingZeros(Math.floor((dur % 3600) / 60));
  const seconds = leadingZeros(dur % 60);
  if (Number(hours) > 0) {
    return `${hours}:${minutes}:${seconds}`
  } else {
    return `${minutes}:${seconds}`
  }
};
const cumsum = (sum: number = 0) => (sum = 0, (n: number) => sum += n);

const leadingZeros = (int: number) => {
  if (int < 10) {
    return '0' + int
  } else {
    return String(int)
  }
}
import {
  Piece,
  Phrase,
  Trajectory,
  Pitch,
  Articulation,
  Raga,
  Chikari,
  Group,
  linSpace,
  VibObjType
} from '@/js/classes.ts';

import {
  getPiece,
  getRaagRule,
  getAudioRecording,
  getNumberOfSpectrograms,
  savePiece,
  makeSpectrograms,
  pieceExists,
  getMelographJSON
} from '@/js/serverCalls.ts';
import { Meter, Pulse } from '@/js/meter.ts';
import EditorAudioPlayer from '@/comps/editor/EditorAudioPlayer.vue';
import MeterControls from '@/comps/editor/MeterControls.vue';
import TrajSelectPanel from '@/comps/editor/TrajSelectPanel.vue';
import ContextMenu from'@/comps/ContextMenu.vue';
import LabelEditor from '@/comps/editor/LabelEditor.vue';
import instructionsText from '@/assets/texts/editor_instructions.html?raw';
import AutomationWindow from '@/comps/editor/AutomationWindow.vue';
import Renderer from '@/comps/editor/Renderer.vue';
import TranscriptionLayer from '@/comps/editor/renderer/TranscriptionLayer.vue';
import YAxis from '@/comps/editor/renderer/YAxis.vue';
import { detect, BrowserInfo } from 'detect-browser';
import { throttle } from 'lodash';
import { defineComponent } from 'vue';

import { 
  ContextMenuOptionType, 
  RecType, 
  TFuncType,
  DrawDataType,
  StrokeNicknameType,
  InstrumentTrackType,
  TrajSelectionStatus,
  PhraseDivDisplayType,
  TrajRenderObj
} from '@/ts/types';
import { EditorMode, Instrument } from '@/ts/enums';
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const getStarts = (durArray: number[]) => {
  const cumsum = (sum => (value: number) => sum += value)(0);
  return [0].concat(durArray.slice(0, durArray.length - 1)).map(cumsum)
}

import { 
  select as d3Select, 
  selectAll as d3SelectAll,
  drag as d3Drag,
  line as d3Line,
  create as d3Create,
  scaleLinear as d3ScaleLinear,
  zoomIdentity as d3ZoomIdentity,
  zoom as d3Zoom,
  zoomTransform as d3ZoomTransform,
  symbol as d3Symbol,
  axisTop as d3AxisTop,
  axisLeft as d3AxisLeft,
  symbolTriangle as d3SymbolTriangle,
  symbolX as d3SymbolX,
  symbolDiamond as d3SymbolDiamond,
  easeQuadInOut as d3EaseQuadInOut,
  easeLinear as d3EaseLinear,
  pointers as d3Pointers,
  mean as d3Mean,
  ZoomTransform,
  ValueFn,
  D3ZoomEvent,
  SelectionFn,
  D3DragEvent,
  Selection,
} from 'd3';

import { useTitle } from '@vueuse/core';

const  findClosestStartTime = (startTimes: number[], timepoint: number) => {
  let closestIndex = -1;
  let closestDiff = Infinity;

  for (let i = 0; i < startTimes.length; i++) {
    if (startTimes[i] > timepoint) continue; // Skip start times after timepoint

    const diff = timepoint - startTimes[i];
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

function findClosestStartTimeAfter(startTimes: number[], timepoint: number) {
  let closestIndex = -1;
  let closestDiff = Infinity;
  for (let i = 0; i < startTimes.length; i++) {
    if (startTimes[i] <= timepoint) continue; // Skip start times <= timepoint

    const diff = startTimes[i] - timepoint;
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

type EditorDataType = {
  piece: Piece,
  durTot: number,
  // freqMin: number,
  // freqMax: number,
  backColor: string,
  axisColor: string,
  yAxWidth: number,
  xAxHeight: number,
  minDrawDur: number,
  initViewDur: number,
  initYScale: number,
  initXScale: number,
  transitionTime: number,
  controlBoxWidth: number,
  audioSource?: string,
  currentTime: number,
  selectedChikariID?: string,
  chikariColor: string,
  selectedChikariColor: string,
  dateModified?: Date,
  setChikari: boolean,
  // selectedTraj?: Trajectory,
  // selectedTrajs: Trajectory[],
  viewPhrases: boolean,
  phraseLabelHeight: number,
  loop: boolean,
  init: boolean,
  minTrajDur: number,
  // setNewTraj: boolean,
  setNewPhraseDiv: boolean,
  justEnded: boolean,
  editable: boolean,
  recGain: number,
  synthGain: number,
  synthDamping: number,
  showSargam: boolean,
  showBols: boolean,
  scrollYWidth: number,
  scrollXHeight: number,
  yScaleLims: [number, number],
  editorHeight: number,
  scrollYHeight: number,
  initYOffset: number,
  setNewSeries: boolean,
  setNewRegion: boolean,
  shifted: boolean,
  metad: boolean,
  regionStartTime?: number,
  regionEndTime?: number,
  scrollDragColor: string,
  scrollDragColorHover: string,
  playheadReturn: boolean,
  showInstructions: boolean,
  instructionsText: string,
  clipboardTrajs: Trajectory[],
  pastedTrajs: Trajectory[],
  groupable: boolean,
  playerHeight: number,
  oldHeight?: number,
  leftTime: number,
  phonemeRepresentation: string,
  // vocal: boolean,
  controlsHeight: number,
  unsavedChanges: boolean,
  selMeterColor: string,
  meterMode: boolean,
  selMeter?: Meter,
  meterColor: string,
  pulseDragEnabled: boolean,
  pulseDragInitX?: number,
  insertPulseMode: boolean,
  insertPulses: number[],
  meterMagnetMode: boolean,
  contextMenuX: number,
  contextMenuY: number,
  contextMenuClosed: boolean,
  contextMenuChoices: ContextMenuOptionType[],
  selBoxStartX?: number,
  selBoxStartY?: number,
  fullWidth: number,
  initLogFreq?: number,
  uniformVowel: boolean,
  tx?: () => ZoomTransform,
  ty?: () => ZoomTransform,
  x?: d3.ScaleLinear<number, number>,
  y?: d3.ScaleLinear<number, number>,
  codifiedXR?: d3.ScaleLinear<number, number>,
  codifiedYR?: d3.ScaleLinear<number, number>,
  requestId?: number,
  stretchedAnimationStart?: number,
  gx: d3.Selection<SVGGElement, undefined, any, any>,
  gy: d3.Selection<SVGGElement, undefined, any, any>,
  zoomX?: d3.ZoomBehavior<Element, unknown>,
  zoomY?: d3.ZoomBehavior<Element, unknown>,
  animationStart: number,
  visPitches: Pitch[],
  svg: Selection<SVGSVGElement, undefined, null, undefined>,
  z?: ZoomTransform,
  defs: Selection<SVGDefsElement, undefined, null, undefined>,
  phraseG: Selection<SVGGElement, undefined, null, undefined>,
  selectedTrajID?: string,
  codifiedXOffset: number,
  codifiedYOffset: number,
  codifiedXScale: number,
  codifiedYScale: number,
  visibleSargam: number[],
  yAxis?: (
    g: Selection<SVGGElement, any, HTMLElement, any>,
    scale: d3.ScaleLinear<number, number>
    ) => Selection<SVGGElement, any, HTMLElement, any>,
  xAxis?: (
    g: Selection<SVGGElement, any, HTMLElement, any>,
    scale: d3.ScaleLinear<number, number>
    ) => Selection<SVGGElement, any, HTMLElement, any>,
  selectedPhraseDivIdx?: number,
  clipG: Selection<SVGGElement, undefined, null, undefined>,
  scrollXWidth: number,
  initXOffset: number,
  trajTimePts: {
    time: number, 
    logFreq: number,
    pIdx: number,
    tIdx: number,
    track: number,
  }[],
  drawingRegion: boolean,
  regionStartPx: number,
  regionEndPx: number,
  audioDBDoc?: RecType,
  selBox: Selection<SVGRectElement, undefined, null, undefined>,
  svgNode: SVGSVGElement,
  zoom: d3.ZoomBehavior<Element, unknown>,
  curWidth: number,
  oldRectHeight: number,
  scrollX: Selection<SVGSVGElement, undefined, null, undefined>,
  scrollY: Selection<SVGSVGElement, undefined, null, undefined>,
  regionG?: Selection<SVGGElement, undefined, null, undefined>,
  desiredWidth: number,
  desiredHeight: number,
  xScale: number,
  yScale: number,
  unscaledWidth: number,
  loadedImgs: number,
  numSpecs: number,
  totNaturalWidth: number,
  cumulativeWidths: number[],
  imgs: HTMLImageElement[],
  specBox: Selection<SVGGElement, undefined, null, undefined>,
  browser: BrowserInfo,
  dragIdx: string,
  IPLims: [number, number],
  melographJSON?: {
    data_chunks: number[][],
    time_chunk_starts: number[],
    time_increment: number,
  },
  melographVisible: boolean,
  autoWindowOpen: boolean,
  autoWindowX: number,
  autoWindowY: number,
  autoTrajs: Trajectory[],
  autoWindowWidth: number,
  sarangi: boolean,
  sitar: boolean,
  d3ZoomEvent?: D3ZoomEvent<Element, unknown>,
  maxLayer: number,
  visibilityTab: boolean,
  rotation: number,
  showMelody: boolean,
  showMeter: boolean,
  throttledRedraw: (() => void) | undefined,
  transcriptionWidth: number,
  transcriptionHeight: number,
  xRangeInView: [number, number],
  lowOctOffset: number,
  highOctOffset: number,
  showSpectrogram: boolean,
  melographColor: string,
  maxPitch: Pitch,
  minPitch: Pitch,
  sargamLineColor: string,
  showSargamLines: boolean,
  showPhonemes: boolean,
  instTracks: InstrumentTrackType[],
  selectedMode: EditorMode,
  trajSelStatus: TrajSelectionStatus,
  sargamMagnetMode: boolean,
  selectedPhraseDivUid?: string,
  throttledAlterSlope: ReturnType<typeof throttle> | undefined,
  throttledAlterVibObj: ReturnType<typeof throttle> | undefined,
  editingInstIdx: number,
}

// DebouncedFunc<(newSlope: number) => void>

export { findClosestStartTime }

export default defineComponent({
  name: 'EditorComponent',
  data(): EditorDataType {
    return {
      piece: new Piece(),
      durTot: 600,
      // freqMin: 100,
      // freqMax: 800,
      backColor: '#f0f8ff', // aliceblue
      axisColor: '#c4b18b', // tan
      yAxWidth: 30,
      xAxHeight: 30,
      minDrawDur: 0.01, //this could be smaller, potentially
      initViewDur: 20,
      initYScale: 2,
      initXScale: 1,
      transitionTime: 1000 / 60,
      controlBoxWidth: 240,
      audioSource: undefined,
      currentTime: 0,
      selectedChikariID: undefined,
      chikariColor: 'black',
      selectedChikariColor: 'red',
      dateModified: undefined,
      setChikari: false,
      // selectedTraj: undefined,
      // selectedTrajs: [],
      viewPhrases: true,
      phraseLabelHeight: 30,
      loop: false,
      init: true,
      minTrajDur: 0.05,
      // setNewTraj: false,
      setNewPhraseDiv: false,
      justEnded: false,
      editable: false,
      recGain: 0,
      synthGain: 0,
      synthDamping: 0.5,
      showSargam: false,
      showBols: false,
      scrollYWidth: 20,
      scrollXHeight: 20,
      yScaleLims: [1, 5],
      editorHeight: 400,
      scrollYHeight: 500 - 30 - 20, // this is bad, just a placeholder anyway
      initYOffset: 0,
      setNewSeries: false,
      setNewRegion: false,
      shifted: false,
      metad: false,
      regionStartTime: undefined,
      regionEndTime: undefined,
      scrollDragColor: '#9c9c9c',
      scrollDragColorHover: '#AAAAAA',
      playheadReturn: false,
      showInstructions: false,
      instructionsText: instructionsText,
      clipboardTrajs: [],
      pastedTrajs: [],
      groupable: false,
      playerHeight: 100,
      oldHeight: undefined,
      leftTime: 0,
      phonemeRepresentation: 'English',
      // vocal: false,
      controlsHeight: 200,
      unsavedChanges: false,
      selMeterColor: '#3dcc63',
      meterMode: false,
      selMeter: undefined,
      meterColor: '#0D3D0E',
      pulseDragEnabled: false,
      pulseDragInitX: undefined,
      insertPulseMode: false,
      insertPulses: [],
      meterMagnetMode: false,
      contextMenuX: 0,
      contextMenuY: 0,
      contextMenuClosed: true,
      contextMenuChoices: [],
      selBoxStartX: undefined,
      selBoxStartY: undefined,
      fullWidth: 0,
      initLogFreq: undefined,
      uniformVowel: false,
      x: undefined,
      y: undefined,
      requestId: undefined,
      tx: undefined,
      ty: undefined,
      animationStart: 0,
      visPitches: [],
      svg: d3Create('svg'),
      z: undefined,
      defs: d3Create('defs'),
      phraseG: d3Create('g'),
      gx: d3Create('g'),
      gy: d3Create('g'),
      codifiedXOffset: 0,
      codifiedYOffset: 0,
      codifiedXScale: 1,
      codifiedYScale: 1,
      visibleSargam: [],
      yAxis: undefined,
      xAxis: undefined,
      clipG: d3Create('g'),
      scrollXWidth: 0,
      initXOffset: 0,
      trajTimePts: [],
      drawingRegion: false,
      regionStartPx: 0,
      regionEndPx: 0,
      audioDBDoc: undefined,
      selBox: d3Create('rect'),
      svgNode: d3Create('svg').node() as SVGSVGElement,
      zoom: d3Zoom(),
      curWidth: 0,
      oldRectHeight: 0,
      specBox: d3Create('g'),
      scrollX: d3Create('svg'),
      scrollY: d3Create('svg'),
      regionG: undefined,
      desiredWidth: 0,
      desiredHeight: 0,
      xScale: 1,
      yScale: 1,
      unscaledWidth: 0,
      loadedImgs: 0,
      numSpecs: 0,
      totNaturalWidth: 0,
      cumulativeWidths: [],
      imgs: [],
      browser: detect() as BrowserInfo,
      dragIdx: '',
      IPLims: [0, 0],
      melographJSON: undefined,
      melographVisible: false,
      selectedPhraseDivIdx: undefined,
      autoWindowOpen: false,
      autoWindowX: 500,
      autoWindowY: 500,
      autoTrajs: [],
      autoWindowWidth: 300,
      sarangi: false,
      sitar: false,
      d3ZoomEvent: undefined,
      maxLayer: 3,
      visibilityTab: false,
      rotation: -90,
      showMelody: true,
      showMeter: true,
      throttledRedraw: undefined,
      transcriptionWidth: 0,
      transcriptionHeight: 0,
      xRangeInView: [0, 0],
      lowOctOffset: 1.1,
      highOctOffset: 2.1,
      showSpectrogram: false,
      melographColor: '#006400', // darkgreen
      maxPitch: new Pitch({ swara: 'Sa', oct: 2 }),
      minPitch: new Pitch({ swara: 'Sa', oct: -1 }),
      sargamLineColor: '#808080', // grey
      showSargamLines: true,
      showPhonemes: true,
      instTracks: [],
      selectedMode: EditorMode.None,
      trajSelStatus: undefined,
      sargamMagnetMode: true,
      selectedPhraseDivUid: undefined,
      throttledAlterSlope: undefined,
      throttledAlterVibObj: undefined,
      editingInstIdx: 0,
    }
  },
  components: {
    EditorAudioPlayer,
    TrajSelectPanel,
    ContextMenu,
    AutomationWindow,
    Renderer,

  },
  created() {
    this.throttledRedraw = throttle(this.redraw.bind(this), this.transitionTime);
    window.addEventListener('keydown', this.handleKeydown);
    // window.addEventListener('keyup', this.handleKeyup);
    let offset = this.navHeight + this.playerHeight + this.controlsHeight + 1;
    if (window.innerHeight < 800) {
      offset = this.navHeight + this.playerHeight + 1;
      const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
    }
    this.editorHeight = window.innerHeight - offset  ;
    if (this.$store.state.userID === undefined) {
      if (this.$cookies.get('userID') === undefined) {
        if (this.$route.query) {
          this.$store.commit('update_query', this.$route.query)
        }
        this.$router.push('/')
      }
    }
  },

  beforeRouteLeave(to, from) {
    if (this.unsavedChanges) {
      const txt = 'You have unsaved changes. Are you sure you want to leave ' +
                  'the transcription editor?'
      const answer = window.confirm(txt)
      if (!answer) return false
    }
  },

  props: {
    navHeight: {
      type: Number,
      required: true
    }
  },

  async mounted() {
    window.addEventListener('beforeunload', this.beforeUnload);
    this.fullWidth = window.innerWidth;
    this.throttledAlterSlope = throttle(this.alterSlope, 16);
    this.throttledAlterVibObj = throttle(this.alterVibObj, 16);

    try {
      // if there's a query id, 1. check if exists, 2. if so, load it, else:
      // send some sort of message that entered piece didn't exist and go to 
      // files.
      // check if stored piece esists. if so, load it, else: load default piece.
      // push the id to router. 
      
      let piece, pieceDoesExist;
      const queryId = this.$route.query.id! as string;
      if (queryId) {
        pieceDoesExist = await pieceExists(queryId);
        if (pieceDoesExist) {
          piece = await getPiece(queryId);

        } else {
          await this.$router.push({ name: 'Files' });
          throw 'IDTP logger: Piece does not exist, or you do not have \
          permission to view.'
        }
      } else {
        const storedId = this.$store.state._id;
        pieceDoesExist = await pieceExists(storedId);
        const id = pieceDoesExist ? storedId : '63445d13dc8b9023a09747a6';
        this.$router.push({ 
          name: 'EditorComponent',
          query: { 'id': id }
        })
        piece = await getPiece(id);
      }
      this.browser = detect() as BrowserInfo;
      
      if (piece.audioID) {
        
        this.audioSource = this.browser.name === 'safari' ?
          `https://swara.studio/audio/mp3/${piece.audioID}.mp3` :
          `https://swara.studio/audio/opus/${piece.audioID}.opus`;        
        this.audioDBDoc = await getAudioRecording(piece.audioID);
        this.melographJSON = await getMelographJSON(piece.audioID);
        this.durTot = this.audioDBDoc!.duration;
        // if pieceDurTot is less than this, add silent phrase to make the two 
        // the same
      } else {
        this.durTot = piece.durTot!;
      }
      this.initXScale = this.durTot / this.initViewDur;
      let fund = 246;
      if (this.audioDBDoc && this.audioDBDoc.saEstimate) {
        fund = 2 * this.audioDBDoc.saEstimate * 2 ** this.audioDBDoc.octOffset;
      }
      await this.getPieceFromJson(piece, fund);
      useTitle(this.piece.title);


      this.editable = this.permissionToEdit(this.piece); // necessary
      if (!this.permissionToView(this.piece)) {
        await this.$router.push({ name: 'Files' });
          throw 'IDTP logger: Piece does not exist, or you do not have \
          permission to view.'
      }
      this.oldHeight = window.innerHeight;
      // const tsp = this.$refs.trajSelectPanel as typeof TrajSelectPanel;
      // tsp.trajIdxs = this.piece.trajIdxs;
      const vox = ['Vocal (M)', 'Vocal (F)'];
      // tsp.vocal = vox.includes(this.piece.instrumentation[0]);
      // this.vocal = tsp.vocal;
      this.sitar = this.piece.instrumentation[0] === 'Sitar';
      this.sarangi = this.piece.instrumentation[0] === 'Sarangi';
      // tsp.sitar = this.sitar;
      // tsp.sarangi = this.sarangi;
      const leftTime = this.leftTime;
      // await this.initializePiece();
      const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      ap.parentLoaded();
      const colors = ['#204580', '#532080', '#802030', '#428020'];
      const selColors = ['#4089ff', '#a640ff', '#ff4060', '#83ff40']
      this.piece.instrumentation.forEach((inst, idx) => {
        if (idx > 3) {
          throw 'IDTP logger: Too many instruments in instrumentation array.'
        }
        this.instTracks.push({
          inst,
          idx,
          displaying: idx === 0,
          sounding: idx === 0,
          color: colors[idx],
          selColor: selColors[idx]
        })
      });

      const q = this.$route.query;
      if (q.pIdx) {
        // this.moveToPhrase(Number(q.pIdx));
      } else {
        this.$router.push({ query: { id: q.id} });
      }
      if (q.regionStart && q.regionEnd) {
        this.setRegionToTimes(Number(q.regionStart), Number(q.regionEnd));
      }
      const silentDur = this.durTot - piece.durTot!;
      if (silentDur >= 0.00001) {
        const stTrajObj: {
          id: number,
          pitches: Pitch[],
          durTot: number,
          fundID12: number,
          instrumentation?: string
        } = {
          id: 12,
          pitches: [],
          durTot: silentDur,
          fundID12: this.piece.raga.fundamental
        };
        if (this.piece.instrumentation) {
          stTrajObj.instrumentation = this.piece.instrumentation[0];
        }
        const silentTraj = new Trajectory(stTrajObj);
        const phraseObj: {
          trajectories: Trajectory[],
          durTot: number,
          instrumentation?: string[]
        } = {
          trajectories: [silentTraj],
          durTot: silentDur,
        };
        if (this.piece.instrumentation) {
          phraseObj.instrumentation = this.piece.instrumentation;
        }
        const silentPhrase = new Phrase(phraseObj);
        this.piece.phrases.push(silentPhrase);
        this.piece.durArrayFromPhrases();
        this.piece.updateStartTimes();
      }
      const rendererWidth = this.fullWidth - this.controlBoxWidth;
      const graphWidth = rendererWidth - this.scrollYWidth;
      this.transcriptionWidth = Math.round(graphWidth * this.durTot / this.initViewDur);
      const rendererHeight = this.editorHeight;
      const graphHeight = rendererHeight - this.scrollXHeight;
      this.transcriptionHeight = Math.round(2 * graphHeight);
    } catch (err) {
      console.error(err)
    }
  },

  unmounted() {
    // window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.handleKeydown);
    // window.removeEventListener('keyup', this.handleKeyup);
    window.removeEventListener('beforeunload', this.beforeUnload);
  },

  watch: {
    spectrogramOpacity(newVal) {
      d3SelectAll('.spectrogram')
        .style('opacity', newVal)
    },

    loop() {
      const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      if (this.loop) {
        ap.loop = true;
        ap.loopStart = this.regionStartTime;
        ap.loopEnd = this.regionEndTime;
        if (ap.sourceNode) {
          ap.sourceNode.loopStart = this.regionStartTime;
          ap.sourceNode.loopEnd = this.regionEndTime;
        }
      } else {
        ap.loop = false;
        ap.loopStart = undefined;
        ap.loopEnd = undefined;
      }
    },

    showSargam(newVal) {
      if (newVal) {
        d3SelectAll('.sargamLabels')
          .style('opacity', '1')
        if (this.showBols) {
          this.showBols = false;
        }
      } else {
        d3SelectAll('.sargamLabels')
          .style('opacity', '0')
      }
    },

    showBols(newVal) {
      if (newVal) {
        d3SelectAll('.bolLabels')
          .style('opacity', '1')
        if (this.showSargam) {
          this.showSargam = false;
        }
      } else {
        d3SelectAll('.bolLabels')
          .style('opacity', '0')
      }
    },

    regionStartTime(newVal) {
      const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      if (this.loop) {
        ap.loopStart = newVal;
        if (ap.sourceNode) {
          ap.sourceNode.loopStart = newVal;
        }
      }
    },

    regionEndTime(newVal) {
      const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      if (this.loop) {
        ap.loopEnd = newVal;
        if (ap.sourceNode) {
          ap.sourceNode.loopEnd = newVal;
        }
      }
    },

    playheadReturn(newVal) {
      d3Select('.playheadShadow')
        .attr('opacity', Number(newVal))
    },

    setNewRegion(newVal) {
      if (newVal) {
        this.svg.style('cursor', 'alias');
      } else {
        this.svg.style('cursor', 'default');
      }
    },
  },

  computed: {
    setNewTraj() {
      return this.selectedMode === EditorMode.Trajectory;
    },

    freqMin() {
      const saFreq = this.piece.raga.fundamental;
      const logSaFreq = Math.log2(saFreq);
      const logMin: number = logSaFreq - this.lowOctOffset;
      return 2 ** logMin;
    },

    freqMax() {
      const saFreq = this.piece.raga.fundamental;
      const logSaFreq = Math.log2(saFreq);
      const logMax: number = logSaFreq + this.highOctOffset;
      return 2 ** logMax;
    },

    vocal() {
      const vox = [Instrument.Vocal_M, Instrument.Vocal_F];
      for (const inst of this.piece.instrumentation) {
        if (vox.includes(inst as Instrument)) {
          return true;
        }
      }
      return false;
    },

    selectedTraj() {
      const r = this.$refs.renderer as typeof Renderer;
      const tLayer = r.$refs.transcriptionLayer as typeof TranscriptionLayer;
      return tLayer.selectedTraj;
    }
  },

  methods: {

    updatePhraseDivRendering(pd: PhraseDivDisplayType) {
      const r = this.$refs.renderer as typeof Renderer;
      const tLayer = r.$refs.transcriptionLayer as typeof TranscriptionLayer;
      tLayer.removePhraseDiv(pd.uId);
      tLayer.renderPhraseDiv(pd);
    },

    updateSelPhraseDivUid(uId: string) {
      this.selectedPhraseDivUid = uId;
    },

    updateInstTracks(tracks: InstrumentTrackType[]) {
      this.instTracks = tracks;
    },

    updateSaFreq(f: number) {
      this.piece.raga.fundamental = f;
      this.minPitch.fundamental = f;
      this.maxPitch.fundamental = f;
      const minPitchFreq = this.minPitch.frequency;
      const maxPitchFreq = this.maxPitch.frequency;
      this.lowOctOffset = Math.log2(f / minPitchFreq) + 0.1;
      this.highOctOffset = Math.log2(maxPitchFreq / f) + 0.1;
      const renderer = this.$refs.renderer as typeof Renderer;
      renderer.reScaleY();
      const yAxis = renderer.yAxis as typeof YAxis;
      yAxis.resetAxis();
    },

    updateMinPitch(p: Pitch) {
      this.minPitch = p;
      const saFreq = this.piece.raga.fundamental;
      const minPitchFreq = this.minPitch.frequency;
      this.lowOctOffset = Math.log2(saFreq / minPitchFreq) + 0.1;
      const r = this.$refs.renderer as typeof Renderer;
      const yAxis = r.yAxis as typeof YAxis;
      yAxis.resetAxis();
      const tLayer = r.$refs.transcriptionLayer as typeof TranscriptionLayer;
      this.$nextTick(() => tLayer.resetTranscription());
      // tLayer.resetTranscription();
    },

    updateMaxPitch(p: Pitch) {
      this.maxPitch = p;
      const saFreq = this.piece.raga.fundamental;
      const maxPitchFreq = this.maxPitch.frequency;
      this.highOctOffset = Math.log2(maxPitchFreq / saFreq) + 0.1;
      const r = this.$refs.renderer as typeof Renderer;
      const yAxis = r.yAxis as typeof YAxis;
      yAxis.resetAxis();
      const tLayer = r.$refs.transcriptionLayer as typeof TranscriptionLayer;
      this.$nextTick(() => tLayer.resetTranscription());
      // tLayer.resetTranscription();
    },

    zoomInY() {
      this.transcriptionHeight = Math.round(this.transcriptionHeight * 1.1);
    },

    zoomOutY() {
      this.transcriptionHeight = Math.round(this.transcriptionHeight / 1.1);
    },

    zoomInX() {
      this.transcriptionWidth = Math.round(this.transcriptionWidth * 1.1);
    },

    zoomOutX() {
      this.transcriptionWidth = Math.round(this.transcriptionWidth / 1.1);
    },

    getXRangeInView(): [number, number] {

      const renderer = this.$refs.renderer as typeof Renderer;
      const el = renderer.$el as HTMLElement;
      const width = el.clientWidth;
      const pxlLeft = el.scrollLeft;
      const pxlRight = pxlLeft + width;
      const xLeft = pxlLeft / el.scrollWidth;
      const xRight = pxlRight / el.scrollWidth;
      return [xLeft, xRight] 
    },

    updateMeterVisibility() {
      if (!this.showMeter) {
        d3SelectAll('.metricGrid')
          .style('display', 'none')
      } else {
        d3SelectAll('.metricGrid')
          .style('display', 'inline')
      }
    },

    updateTranscriptionVisibility() {
      if (!this.showMelody) {
        d3SelectAll('.phrase')
          .style('display', 'none')
        d3SelectAll('.articulation')
          .style('display', 'none')
      } else {
        d3SelectAll('.phrase')
          .style('display', 'inline')
        d3SelectAll('.articulation')
          .style('display', 'inline')
      }
    },

    toggleVisibility(e: MouseEvent) {
      let target = e.target as HTMLElement;
      target = target.parentNode as HTMLElement;
      if (this.visibilityTab) {
        this.visibilityTab = false;
        this.rotation = -90;
        target.classList.remove('open');
      } else {
        this.visibilityTab = true;
        this.rotation = 0;
        target.classList.add('open');
      }
    },

    updateMaxLayer(e: number) {
      this.maxLayer = e
    },

    permissionToEdit(piece: Piece) {
      const id = this.$store.state.userID!;
      const c1 = id === piece.userID;
      const c2 = piece.explicitPermissions.edit.includes(id);
      return c1 || c2;
    },

    permissionToView(piece: Piece) {
      const id = this.$store.state.userID!;
      const c1 = id === piece.userID;
      const c2 = piece.explicitPermissions.view.includes(id);
      const c3 = piece.explicitPermissions.edit.includes(id);
      const c4 = piece.explicitPermissions.publicView;
      return c1 || c2 || c3 || c4;
    },

    addMelograph(codified=true) {
      d3SelectAll('.melograph').remove();
      this.melographJSON?.data_chunks.forEach((chunk, i) => {
        const start = this.melographJSON!.time_chunk_starts[i];
        const increment = this.melographJSON!.time_increment;
        const data = chunk.map((d, i) => {
          return {
            x: start + i * increment,
            y: d
          }
        })
        this.phraseG.append('path')
          .datum(data)
          .classed('melograph', true)
          .attr('stroke', melographColor)
          .attr('stroke-width', '2px')
          .attr('fill', 'none')
          .attr('opacity', this.melographVisible ? 1 : 0)
          .attr('d', codified ? this.codifiedPhraseLine() : this.phraseLine())
      })
    },

    // addTrajToSelectedGroup(traj: Trajectory) {
    //   const longEnough = this.selectedTrajs.length > 1;
    //   if (longEnough && this.selectedTrajs[0].groupId !== undefined) {
    //     const pIdx = this.selectedTrajs[0].phraseIdx!;
    //     const phrase = this.piece.phrases[pIdx];
    //     const group = phrase.getGroupFromId(this.selectedTrajs[0].groupId!)!;
    //     group.addTraj(traj);
    //     this.selectedTrajs.push(traj);
    //     const tIdx = traj.num!;
    //     const id = `p${pIdx}t${tIdx}`;
    //     d3Select(`#${id}`)
    //       .attr('stroke', this.selTrajColor)
    //     d3Select(`#dampen${id}`)
    //       .attr('stroke', this.selTrajColor)
    //     d3Select(`#pluck${id}`)
    //       .attr('fill', this.selArtColor)
    //       .attr('stroke', this.selArtColor)
    //     d3Select('#overlay__' + id)
    //       .attr('cursor', 'default')
    //     this.updateArtColors(traj, true)
    //   }
    // },

    assignPrevMeter() {
      const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      const meterControls = ap.$refs.meterControls as typeof MeterControls;
      const mtrStarts = this.piece.meters.map(m => m.startTime);
      const mIdx = findClosestStartTime(mtrStarts, this.insertPulses[0]);
      meterControls.meter = this.piece.meters[mIdx];
    },

    updateUnsavedChanges(truth: boolean) {
      this.unsavedChanges = truth;
    },

    addMeter(meter: Meter) {
      this.piece.addMeter(meter);
      this.unsavedChanges = true;
      this.selMeter = meter;
      this.meterMode = true;
    },

    timeWithinMeter(time: number): boolean {
      let out = false;
      this.piece.meters.forEach(meter => {
        const start = meter.startTime;
        const end = start + meter.durTot;
        if (time >= start && time <= end) {
          out = true;
        }
      })
      return out;
    },

    updateIPLims() {
      const mtrStarts = this.piece.meters
        .map(m => m.startTime)
      const ip = this.insertPulses[0];
      if (Math.min(...mtrStarts) > ip) {
        const afterIdx = findClosestStartTimeAfter(mtrStarts, ip);
        const after = this.piece.meters[afterIdx];
        if (after === undefined) {
          this.IPLims = [0, this.durTot];
        } else {
          this.IPLims = [0, after.startTime];
        }
      } else if (Math.max(...mtrStarts) < ip) {
        const beforeIdx = findClosestStartTime(mtrStarts, ip);
        const before = this.piece.meters[beforeIdx];
        this.IPLims = [before.startTime + before.durTot, this.durTot];
      } else {
        const beforeIdx = findClosestStartTime(mtrStarts, ip);
        const afterIdx = findClosestStartTimeAfter(mtrStarts, ip);
        const before = this.piece.meters[beforeIdx];
        const after = this.piece.meters[afterIdx];
        this.IPLims = [before.startTime + before.durTot, after.startTime];
      }
      const eAP = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      const meterControls = eAP.$refs.meterControls as typeof MeterControls;
      if (this.insertPulses.length === 0) {
        meterControls.prevMeter = false;
      } else {
        meterControls.prevMeter = Math.min(...mtrStarts) < this.insertPulses[0];
      }
    },

    endConsonantEmit(endConsonant: string) {
      const r = this.$refs.renderer as typeof Renderer;
      const tLayer = r.$refs.transcriptionLayer as typeof TranscriptionLayer;
      const selT = tLayer.selectedTraj;
      this.unsavedChanges = true;
      const pIdx = selT.phraseIdx!;
      const tIdx = selT.num!;
      const phrase = this.piece.phrases[pIdx];
      if (endConsonant === undefined) {
        // false indicates that this is the end consonant
        selT.removeConsonant(false);
      } else if (selT.endConsonant === undefined) {
        selT.addConsonant(endConsonant, false);
      } else {
        selT.changeConsonant(endConsonant, false)
      }
      tLayer.refreshEndingConsonant(selT.uniqueId);
      if (phrase.trajectories.length > tIdx + 1) {
        const nextTraj = phrase.trajectories[tIdx + 1];
        tLayer.refreshVowel(nextTraj.uniqueId);
      }
    },

    startConsonantEmit(startConsonant: string) {
      const r = this.$refs.renderer as typeof Renderer;
      const tLayer = r.$refs.transcriptionLayer as typeof TranscriptionLayer;
      const selT = tLayer.selectedTraj;
      const pIdx = selT.phraseIdx!;
      const phrase = this.piece.phrases[pIdx];
      const tIdx = selT.num!;
      this.unsavedChanges = true;
      if (startConsonant === undefined) {
        selT.removeConsonant();   
      } else if (selT.startConsonant === undefined) {
        selT.addConsonant(startConsonant);
      } else {
        selT.changeConsonant(startConsonant)
      }
      tLayer.refreshVowel(selT.uniqueId);
      if (phrase.trajectories.length > tIdx + 1) {
        const nextTraj = phrase.trajectories[tIdx + 1];
        tLayer.refreshVowel(nextTraj.uniqueId);
      }

    },

    // multiVowelEmit(vowel: string) {
    //   this.unsavedChanges = true;
    //   this.selectedTrajs.sort((a, b) => {
    //     if (a.phraseIdx === b.phraseIdx) {
    //       return a.num! - b.num!;
    //     } else {
    //       return a.phraseIdx! - b.phraseIdx!;
    //     }
    //   })
    //   this.selectedTrajs.forEach(t => {
    //     t.updateVowel(vowel)
    //     const pIdx = t.phraseIdx!;
    //     const tIdx = t.num!;
    //     const g = d3Select(`#articulations__p${pIdx}t${tIdx}`) as 
    //       Selection<SVGGElement, any, any, any>;
    //     const phrase = this.piece.phrases[pIdx];
    //     const selected = d3Select(`#vowelp${pIdx}t${tIdx}`);
    //     let dontReplace = false;
    //     let prevTraj: Trajectory | undefined;
    //     if (tIdx > 0) {
    //       prevTraj = phrase.trajectories[tIdx - 1];
    //     } else if (pIdx > 0) {
    //       const prevPhrase = this.piece.phrases[pIdx - 1];
    //       prevTraj = prevPhrase.trajectories[prevPhrase.trajectories.length - 1];
    //     }
    //     if (prevTraj) {
    //       if (prevTraj.vowel === vowel) {
    //         dontReplace = true;
    //       }
    //     }
    //     if (selected.node() === null) {
    //       if (!dontReplace) {
    //         this.addVowel(t, phrase.startTime!, g, true)
    //       }
    //     } else {
    //       selected.remove();
    //       if (!dontReplace) {
    //         this.addVowel(t, phrase.startTime!, g, true)
    //       }
    //     }
    //     const nextTraj = phrase.trajectories[tIdx + 1];
    //     if (nextTraj) {
    //       const sel = d3Select(`#vowelp${pIdx}t${tIdx + 1}`);
    //       sel.remove();
    //       const vowelIdxs = phrase.firstTrajIdxs();
    //       if (vowelIdxs.includes(nextTraj.num!)) {
    //         this.addVowel(nextTraj, phrase.startTime!, g, true)
    //       }
    //     }
    //   })
    // },

    vowelEmit(vowel: string) {
      // legit 
      const r = this.$refs.renderer as typeof Renderer;
      const tLayer = r.transcriptionLayer;
      const selT = tLayer.selectedTraj;
      this.unsavedChanges = true;
      selT.updateVowel(vowel)
      const pIdx = selT.phraseIdx!;
      const tIdx = selT.num!;
      const phrase = this.piece.phrases[pIdx];
      tLayer.refreshVowel(selT.uniqueId);
      // if there is a next traj, check its vowel, and change it if necessary
      if (phrase.trajectories.length > tIdx + 1) {
        const nextTraj = phrase.trajectories[tIdx + 1];
        tLayer.refreshVowel(nextTraj.uniqueId);
      }
    },

    dampenEmit(dampen: boolean) {
      // legit
      this.unsavedChanges = true;
      const r = this.$refs.renderer as typeof Renderer;
      const tLayer = r.transcriptionLayer;
      const selT = tLayer.selectedTraj!;
      if (dampen) {
        selT.articulations['1.00'] = new Articulation({
          name: 'dampen',
        });
      } else {
        if (selT.articulations['1.00']) {
          delete selT.articulations['1.00'];
        }
      };
      tLayer.refreshTraj(selT);
    },

    alterVibObj(vibObj: VibObjType) {
      // legit
      this.unsavedChanges = true;
      const r = this.$refs.renderer as typeof Renderer;
      const tLayer = r.transcriptionLayer;
      tLayer.selectedTraj!.vibObj = vibObj;
      tLayer.refreshTraj(tLayer.selectedTraj!);
    },

    newTrajEmit(idx: number) {
      this.unsavedChanges = true;
      this.trajTimePts.sort((a, b) => a.time - b.time);
      // const logSGLines = this.visibleSargam.map(s => Math.log2(s));
      const logSGLines = this.piece.raga.getFrequencies({
        low: this.freqMin,
        high: this.freqMax
      }).map(f => Math.log2(f));
      const visPitches = this.piece.raga.getPitches({
        low: this.freqMin,
        high: this.freqMax
      });

      const pitches = this.trajTimePts.map(ttp => {
        const logFreq = ttp.logFreq;
        return new Pitch(visPitches[logSGLines.indexOf(ttp.logFreq)])
      })
      const ttp = this.trajTimePts;
      const durTot = ttp[ttp.length - 1].time - ttp[0].time;
      const times = this.trajTimePts.map(ttp => ttp.time);
      const durArray = times.slice(1).map((x, i) => (x - times[i]) / durTot);
      let articulations: { [key: string]: Articulation };
      const tsp = this.$refs.trajSelectPanel as typeof TrajSelectPanel;
      if (tsp.vocal || tsp.sarangi || tsp.pluckBool === false) {
        articulations = {};
      } else {
        articulations = { '0.00': new Articulation({ 
          name: 'pluck',
          stroke: 'd',
          strokeNickname: 'da' 
        }) }
      }
      if (!tsp.vocal && tsp.dampen === true) {
        // if (!articulations) articulations = {};
        articulations['1.00'] = new Articulation({ name: 'dampen' })
      }
      const trajObj: {
        id: number,
        pitches: Pitch[],
        durTot: number,
        durArray: number[],
        articulations: { [key: string]: Articulation },
        vowel?: string,
        startConsonant?: string,
        endConsonant?: string,
        instrumentation?: string
      } = {
        id: idx,
        pitches: pitches,
        durTot: durTot,
        durArray: durArray,
        articulations: articulations,
        vowel: tsp.vowel,
        startConsonant: tsp.startConsonant,
        endConsonant: tsp.endConsonant,
      };
      const pIdx = this.trajTimePts[0].pIdx;
      const tIdx = this.trajTimePts[0].tIdx;
      const track = this.trajTimePts[0].track;
      const phrase = this.piece.phraseGrid[track][pIdx];
      if (this.piece.instrumentation) {
        trajObj.instrumentation = this.piece.instrumentation[track];
      }
      const newTraj = new Trajectory(trajObj);
      const trajs = phrase.trajectories;
      const silentTraj = phrase.trajectories[tIdx];
      const st = phrase.startTime! + silentTraj.startTime!
      const startsEqual = times[0] === st;
      const endsEqual = times[times.length - 1] === st + silentTraj.durTot;
      if (startsEqual && endsEqual) { // if replaces entire silent traj
        trajs[tIdx] = newTraj;
        phrase.reset();
      } else if (startsEqual) { // if replaces left side of silent traj
        silentTraj.durTot = silentTraj.durTot - durTot;
        trajs.splice(tIdx, 0, newTraj);
        phrase.reset();
      } else if (endsEqual) { // if replaces right side of silent traj
        silentTraj.durTot = silentTraj.durTot - durTot;
        phrase.trajectories.splice(tIdx + 1, 0, newTraj);
        phrase.reset();
      } else { // if replaces internal portion of silent traj
        const firstDur = times[0] - st;
        const lastDur = (st + silentTraj.durTot) - times[times.length - 1];
        silentTraj.durTot = firstDur;
        const lstObj: {
          id: number,
          pitches: Pitch[],
          durTot: number,
          fundID12: number,
          instrumentation?: string
        } = {
          id: 12,
          pitches: [],
          durTot: lastDur,
          fundID12: this.piece.raga.fundamental
        };
        lstObj.instrumentation = this.piece.instrumentation[track];
        const lastSilentTraj = new Trajectory(lstObj);
        phrase.trajectories.splice(tIdx + 1, 0, newTraj);
        phrase.trajectories.splice(tIdx + 2, 0, lastSilentTraj);
        phrase.reset();
      }
      this.selectedMode = EditorMode.None
      const r = this.$refs.renderer as typeof Renderer;
      const tLayer = r.transcriptionLayer as typeof TranscriptionLayer;
      tLayer.resetTrajRenderStatus([newTraj.uniqueId]);
      tLayer.renderTraj(newTraj);
      tLayer.refreshSargam(newTraj.uniqueId!);
      const inst = this.piece.instrumentation[track];
      if (inst === Instrument.Vocal_M || inst === Instrument.Vocal_F) {
        tLayer.refreshVowel(newTraj.uniqueId!);
        tLayer.refreshEndingConsonant(newTraj.uniqueId!);
      }
      tLayer.refreshDragDots();
      this.trajTimePts = [];
      const altId = tLayer.selectedTraj.id >= 12 ? 
                    tLayer.selectedTraj.id - 1: 
                    tLayer.selectedTraj.id; 
      tsp.selectedIdx = tsp.trajIdxs.indexOf(altId);
      tsp.parentSelected = true;
      tsp.slope = Math.log2(tLayer.selectedTraj.slope);
      if (tLayer.selectedTraj.vibObj) {
        tsp.extent = tLayer.selectedTraj.vibObj.extent;
        tsp.initUp = tLayer.selectedTraj.vibObj.initUp;
        tsp.periods = tLayer.selectedTraj.vibObj.periods;
        tsp.offset = tLayer.selectedTraj.vibObj.vertOffset;
      }
      const selT = tLayer.selectedTraj;
      const c1 = tLayer.selectedTraj.articulations[0];
      const c2 = tLayer.selectedTraj.articulations['0.00'];
      const c3 = c1 && selT.articulations[0].name === 'pluck';
      const c4 = c2 && selT.articulations['0.00'].name === 'pluck';
      if (c3 || c4) {
        tsp.pluckBool = true
      } else {
        if (tsp.pluckBool) {
          tsp.pluckBool = false
        }
      }
      if (!this.audioDBDoc) {
        this.extendDurTot();
      };
      this.$nextTick(() => {
        tLayer.selectTraj(newTraj.uniqueId!);
      })
      this.trajTimePts = [];
    },

    pluckBoolEmit(pluckBool: boolean) {
      this.unsavedChanges = true;
      const r = this.$refs.renderer as typeof Renderer;
      const tLayer = r.transcriptionLayer;
      const selT = tLayer.selectedTraj!;
      const c1 = selT.articulations[0] || selT.articulations['0.00'];
      if (pluckBool) {
        if (!c1) {
          selT.articulations['0.00'] = new Articulation({
            name: 'pluck',
            stroke: 'd',
            strokeNickname: 'da'
          });
          // const pIdx = selT.phraseIdx!;
          // const tIdx = selT.num!;
          // const phrase = this.piece!.phrases[pIdx];
          // const g = d3Select(`#articulations__p${pIdx}t${tIdx}`) as 
          //   Selection<SVGGElement, any, any, any>
          // this.codifiedAddPlucks(selT, phrase.startTime!, g)
        }
      } else {
        if (c1) {
          delete selT.articulations[0];
          delete selT.articulations['0.00']
          // this.removePlucks(selT)
        }
      }
      tLayer.refreshTraj(selT);
      // this.resetBols();
    },

    mutateTrajEmit(newIdx: number) {
      const renderer = this.$refs.renderer as typeof Renderer;
      const tLayer = renderer.transcriptionLayer as typeof TranscriptionLayer;
      tLayer.mutateTraj(newIdx);
      
        // this.unsavedChanges = true;
        // const trajObj = this.selectedTraj.toJSON();
        // trajObj.id = newIdx;
        // const newTraj = new Trajectory(trajObj);
        // const pIdx = this.selectedTraj.phraseIdx!;
        // const phrase = this.piece.phrases[pIdx];
        // const tIdx = this.selectedTraj.num!;
        // phrase.trajectories[tIdx] = newTraj;
        // phrase.assignStartTimes();
        // phrase.assignPhraseIdx();
        // phrase.assignTrajNums();
        
      
    },

    setAnimationStart(time: number) {
      this.animationStart = time
    },

    setStretchedAnimationStart(time: number) {
      this.stretchedAnimationStart = time
    },

    setCurrentTime(newTime: number) {
      this.currentTime = newTime;
    },

    beforeUnload(event: BeforeUnloadEvent) {
      if (this.unsavedChanges) {
        const txt = 'You have unsaved changes. Are you sure you want to leave ' +
                    'the transcription editor?'
        event.returnValue = txt;
        return txt;
      } else {
        return undefined;
      }
    },

    // movePlayheads(msg=undefined) {
    //   if (msg === 'justPlayhead') {
    //     this.movePlayhead();
    //   } else if (msg === 'justShadowPlayhead') {
    //     this.moveShadowPlayhead();
    //   } else {
    //     this.movePlayhead();
    //     this.moveShadowPlayhead();
    //   }
    // },

    // updatePhonemeRepresentation() {
    //   const nodes = d3SelectAll('.consonant');
    //   nodes.remove();
    //   const vNodes = d3SelectAll('.vowel');
    //   vNodes.remove();
    //   this.piece.phrases.forEach(phrase => {
    //     const vowelIdxs = phrase.firstTrajIdxs();
    //     phrase.trajectories.forEach(traj => {
    //       const pIdx = phrase.pieceIdx;
    //       const tIdx = traj.num;
    //       const g = d3Select(`#articulations__p${pIdx}t${tIdx}`) as 
    //         Selection<SVGGElement, any, any, any>;
    //       if (traj.id !== 12) {
    //         this.addEndingConsonant(traj, phrase.startTime!, g, true);
    //         if (vowelIdxs.includes(traj.num!)) {
    //           this.addVowel(traj, phrase.startTime!, g, true);
    //         }
    //       }
    //     })
    //   })
    // },

    setRegionToPhrase(pIdx: number) {
      const phrase = this.piece.phrases[pIdx];
      const startTime = phrase.startTime!;
      const endTime = startTime + phrase.durTot!;
      this.regionStartTime = startTime;
      this.regionEndTime = endTime;
      this.regionStartPx = this.xr()(startTime);
      this.regionEndPx = this.xr()(endTime);
      this.setUpRegion();
      const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      this.currentTime = startTime;
        if (!ap.playing) {
          ap.pausedAt = startTime;
          ap.updateProgress();
          ap.updateFormattedCurrentTime();
          ap.updateFormattedTimeLeft();
        } else {
          ap.stop();
          ap.pausedAt = startTime;
          ap.play();
        }
        this.movePlayhead();
        this.moveShadowPlayhead();
    },

    setRegionToTimes(startTime: number, endTime: number) {
      this.regionStartTime = startTime;
      this.regionEndTime = endTime;
      this.regionStartPx = this.xr()(startTime);
      this.regionEndPx = this.xr()(endTime);
      this.setUpRegion();
      const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      this.currentTime = startTime;
        if (!ap.playing) {
          ap.pausedAt = startTime;
          ap.updateProgress();
          ap.updateFormattedCurrentTime();
          ap.updateFormattedTimeLeft();
        } else {
          ap.stop();
          ap.pausedAt = startTime;
          ap.play();
        }
        this.movePlayhead();
        this.moveShadowPlayhead();
    },

    // toggleSpectrogram() {
    //   // this.showSpectrogram = !this.showSpectrogram;
    //   // if (this.spectrogramOpacity === 0) {
    //   //   this.spectrogramOpacity = 1;
    //   // } else {
    //   //   this.spectrogramOpacity = 0;
    //   // }
    // },

    toggleMelograph() {
      const melographLines = d3SelectAll('.melograph');
      this.$nextTick(() => {
        if (this.melographVisible) {
          melographLines.attr('opacity', 1);
        } else {
          melographLines.attr('opacity', 0);
        }
      })
      
    },

    toggleInstructions() {
      this.showInstructions = !this.showInstructions;
    },

    extendDurTot(dur=10) {
      // if no audio (!this.audioDBDoc), call this after each new traj is added,
      // if necessary, extend audio such that it is dur beyond end of last traj.
      const allTrajs = this.piece.phrases
                        .map(p => p.trajectories)
                        .flat()
                        .filter(t => t.id !== 12);
      const lastTraj = allTrajs[allTrajs.length - 1];
      const allSilences = this.piece.phrases
                        .map(p => p.trajectories)
                        .flat()
                        .filter(t => t.id === 12);
      const lastSilence = allSilences[allSilences.length - 1];
      const lastPhrase = this.piece.phrases[this.piece.phrases.length - 1];
      const phraseStart = this.piece.phrases[lastTraj.phraseIdx!].startTime!;
      const lastTrajEnd = phraseStart + lastTraj.startTime! + lastTraj.durTot;
      if (lastTrajEnd > this.piece.durTot! - dur) {
        // if silence after lastTraj, extend it
        const samePhrase = lastSilence.phraseIdx === lastTraj.phraseIdx;
        const c1 = samePhrase && lastSilence.num! > lastTraj.num!;
        const c2 = lastSilence.phraseIdx! > lastTraj.phraseIdx!;
        const extraTime = lastTrajEnd + dur - this.piece.durTot!;
        if (c1 || c2) {
          lastSilence.durTot += extraTime;
          lastPhrase.reset();
        } else {
          const ntObj: {
            id: number,
            pitches: Pitch[],
            durTot: number,
            fundID12: number,
            instrumentation?: string
          } = {
            id: 12,
            pitches: [],
            durTot: extraTime,
            fundID12: this.piece.raga.fundamental
          };
          if (this.piece.instrumentation) {
            ntObj.instrumentation = this.piece.instrumentation[0];
          }
          const newTraj = new Trajectory(ntObj);
          lastPhrase.trajectories.push(newTraj);
          lastPhrase.reset();
        }
        this.piece.durTotFromPhrases();
        this.durTot = this.piece.durTot!;
        this.x!.domain([0, this.durTot]);
        this.resetZoom();
        this.redraw();
      }
    },

    findKrintin() {
      const krintinTrajs = this.piece.allTrajectories().filter(traj => {
        const artVals = Object.values(traj.articulations);
        return artVals.some(art => {
          return art.name === 'hammer-on' || art.name === 'hammer-off'
        });
      })
    },

    cleanPhrases() {
      // if a phrase is shorter than some very small number, delete it.
      const realPhrases = this.piece.phrases.filter(phrase => {
        return phrase.durTot! > 0.0000001
      });
      this.piece.phrases = realPhrases;
      this.piece.durTotFromPhrases();
      this.piece.durArrayFromPhrases();
      this.piece.updateStartTimes();
      this.removeAccidentalSilentTrajs()
      this.resetZoom();
    },
 
    setScrollY() {
      const notchesHeight = this.xAxHeight + this.scrollXHeight;
      this.scrollYHeight = this.editorHeight - notchesHeight;
      this.scrollY = d3Create('svg')
        .attr('viewBox', [0, 0, this.scrollYWidth, this.scrollYHeight])
      this.scrollY.append('rect')
        .classed('scrollYRect', true)
        .attr('fill', 'lightgrey')
        .attr('width', this.scrollYWidth)
        .attr('height', this.scrollYHeight)
        .style('cursor', 'pointer')
        .on('click', this.scrollYClick)

      const vertDrag = d3Drag()
        .on('start', this.scrollYDragStart)
        .on('drag', this.scrollYDragging)
        .on('end', this.scrollYDragEnd)
        
      const height = this.getScrollYDraggerHeight();
      this.scrollY.append('rect')
        .classed('scrollYDragger', true)
        .attr('fill', this.scrollDragColor)
        .attr('width', this.scrollYWidth - 4)
        .attr('rx', 6)
        .attr('ry', 6)
        .attr('height', height)
        .attr('transform', `translate(2,${this.scrollYHeight - height - 1})`)
        .style('cursor', 'pointer')
        .call(vertDrag)
        .on('mouseover', () => {
          d3Select('.scrollYDragger').attr('fill', this.scrollDragColorHover)
        })
        .on('mouseout', () => {
          d3Select('.scrollYDragger').attr('fill', this.scrollDragColor)
        })
      const scrollYElem = this.$refs.scrollY as HTMLElement;
      scrollYElem.appendChild(this.scrollY.node()!)
    },

    setScrollX() {
      this.scrollXWidth = this.rect().width - this.yAxWidth;
      this.scrollX = d3Create('svg')
        .attr('viewBox', [0, 0, this.scrollXWidth, this.scrollXHeight-1])
      this.scrollX.append('rect')
        .classed('scrollXRect', true)
        .attr('fill', 'lightgrey')
        .attr('width', this.scrollXWidth)
        .attr('height', this.scrollXHeight)
        .on('click', this.scrollXClick)
        .style('cursor', 'pointer')

      const horDrag = d3Drag()
        .on('start', this.scrollXDragStart)
        .on('drag', this.scrollXDragging)
        // .on('end', this.scrollXDragEnd)

      this.scrollX.append('rect')
        .classed('scrollXDragger', true)
        .attr('fill', this.scrollDragColor)
        .attr('width', this.getScrollXDraggerWidth())
        .attr('height', this.scrollXHeight - 4)
        .attr('rx', 6)
        .attr('ry', 6)
        .attr('transform', 'translate(0, 2)')
        .call(horDrag)
        .on('mouseover', () => {
          d3Select('.scrollXDragger').attr('fill', this.scrollDragColorHover)
        })
        .on('mouseout', () => {
          d3Select('.scrollXDragger').attr('fill', this.scrollDragColor)
        })
        .style('cursor', 'pointer')

      const scrollXElem = this.$refs.scrollX as HTMLElement;
      scrollXElem.appendChild(this.scrollX.node()!)
    },

    scrollXClick(e: MouseEvent) {
      const x = e.offsetX;
      const xDragger = this.scrollX.select('.scrollXDragger');
      const xDraggerNode = xDragger.node()! as SVGGraphicsElement;
      const xDraggerXVal = xDraggerNode.transform.baseVal[0].matrix.e;
      const width = this.getScrollXDraggerWidth();
      const horRange = this.scrollXWidth - width - 1;
      let deltaX;
      if (x < xDraggerXVal) {
        deltaX = xDraggerXVal - width;
        if (deltaX < 0) deltaX = 0;
      } else {
        deltaX = xDraggerXVal + width;
        if (deltaX > horRange) deltaX = horRange;
      }
      const xProp = deltaX / horRange;
      const scrollXVal = this.getScrollXVal(xProp);
      this.gx.call(this.zoomX!.translateTo, scrollXVal, 0, [0, 0]);
      this.redraw();
      xDragger.attr('transform', `translate(${deltaX}, 2)`)
    },

    scrollYClick(e: MouseEvent) {
      const y = e.offsetY;
      const yDragger = this.scrollY.select('.scrollYDragger');
      const yDraggerNode = yDragger.node()! as SVGGraphicsElement;
      const yDraggerYVal = yDraggerNode.transform.baseVal[0].matrix.f;
      const height = this.getScrollYDraggerHeight();
      const vertRange = this.scrollYHeight - height - 1;
      let deltaY;
      if (y < yDraggerYVal) {
        deltaY = yDraggerYVal - height;
        if (deltaY < 0) deltaY = 0;
      } else {
        deltaY = yDraggerYVal + height;
        if (deltaY > vertRange) deltaY = vertRange;
      }
      const yProp = deltaY / vertRange;
      const scrollYVal = this.getScrollYVal(yProp);
      this.gy.call(this.zoomY!.translateTo, 0, scrollYVal, [0, 0]);
      this.redraw();
      yDragger.attr('transform', `translate(2, ${deltaY})`)
    },

    // pasteTrajs() {
    //   this.pastedTrajs = [];
    //   //make sure they are sorted by time first
    //   this.clipboardTrajs.sort((a, b) => {
    //     const aPhrase = this.piece.phrases[a.phraseIdx!];
    //     const aPhraseStart = aPhrase.startTime;
    //     const aStart = a.startTime! + aPhraseStart!;
    //     const bPhrase = this.piece.phrases[b.phraseIdx!];
    //     const bPhraseStart = bPhrase.startTime;
    //     const bStart = b.startTime! + bPhraseStart!;
    //     return aStart - bStart;
    //   });

    //   // make sure they all fit within a single silent traj, otherwise indicate
    //   // somehow that they don't fit
    //   const fT = this.clipboardTrajs[0];
    //   const fP = this.piece.phrases[fT.phraseIdx!];
    //   const fPStart = fP.startTime! + fT.startTime!;
    //   const lT = this.clipboardTrajs[this.clipboardTrajs.length - 1];
    //   const lP = this.piece.phrases[lT.phraseIdx!];
    //   const lPEnd = lP.startTime! + lT.startTime! + lT.durTot;
    //   const dur = lPEnd - fPStart;
    //   let realST: number = this.currentTime;
    //   const startPIdx = this.phraseIdxFromTime(realST)!;
    //   const startP = this.piece.phrases[startPIdx];
    //   const startTIdx = this.trajIdxFromTime(startP, realST)!;
    //   const startT = startP.trajectories[startTIdx];
    //   const realET = realST + dur;
    //   const endPIdx = this.phraseIdxFromTime(realET)!;
    //   const endP = this.piece.phrases[endPIdx];
    //   const endTIdx = this.trajIdxFromTime(endP, realET)!;
    //   if (startPIdx === endPIdx && startTIdx === endTIdx && startT.id === 12) {
    //     let grouped = false;
    //     if (this.clipboardTrajs[0].groupId !== undefined) {
    //       grouped = true;
    //     }
    //     this.clipboardTrajs.forEach(traj => {
    //       // first, find real start time for original traj
    //       const origPhrase = this.piece.phrases[traj.phraseIdx!];
    //       const origPhraseStart = origPhrase.startTime!;
    //       const origTrajStart = origPhraseStart + traj.startTime!;
    //       const offsetTrajStart = origTrajStart - fPStart;
    //       realST = realST + offsetTrajStart;

    //       // get idx of phrase and traj in which to paste
    //       const targetPIdx = this.phraseIdxFromTime(realST);
    //       const targetP = this.piece.phrases[targetPIdx!];
    //       const targetTIdx = this.trajIdxFromTime(targetP, realST)!;
    //       const targetT = targetP.trajectories[targetTIdx];
    //       // make a copy of traj.toJSON() without reference to original
    //       const copyObj = JSON.parse(JSON.stringify(traj.toJSON()))
    //       copyObj.groupId = undefined;
    //       copyObj.pitches.forEach((pitch: object, pIdx: number) => {
    //         copyObj.pitches[pIdx] = new Pitch(pitch)
    //       })
    //       const newTraj = new Trajectory(copyObj);
    //       const startingTime = realST - targetP.startTime!;
    //       const startsTogether = targetT.startTime! === startingTime;
    //       const targetEnd = targetT.startTime! + targetT.durTot;
    //       const computedEnd = realST - targetP.startTime! + traj.durTot;
    //       const endsTogether = targetEnd === computedEnd;
    //       const trajs = targetP.trajectories;
    //       if (startsTogether && endsTogether) {
    //         // replace silent traj with copied traj
    //         trajs[targetTIdx] = newTraj;
    //         targetP.reset();
    //       } else if (startsTogether) {
    //         // replace with copied traj followed by silent traj
    //         targetT.durTot = targetT.durTot - newTraj.durTot;
    //         trajs.splice(targetTIdx, 0, newTraj);
    //         targetP.reset();
    //         const followingTrajs = trajs.slice(targetTIdx + 1, trajs.length);
    //         followingTrajs.reverse().forEach(t => {
    //           if (t.id !== 12) {
    //             const oldId = `p${t.phraseIdx}t${t.num! - 1}`;
    //             const newId = `p${t.phraseIdx}t${t.num}`;
    //             this.reIdAllReps(oldId, newId);
    //           }
    //         })
    //       } else if (endsTogether) {
    //         // replace with silent traj followed by copied traj
    //         targetT.durTot = targetT.durTot - newTraj.durTot;
    //         trajs.splice(targetTIdx + 1, 0, newTraj);
    //         targetP.reset();
    //         const followingTrajs = trajs.slice(targetTIdx + 1, trajs.length);
    //         followingTrajs.reverse().forEach(t => {
    //           if (t.id !== 12) {
    //             const oldId = `p${t.phraseIdx}t${t.num! - 1}`;
    //             const newId = `p${t.phraseIdx}t${t.num}`;
    //             this.reIdAllReps(oldId, newId);
    //           }
    //         })
    //       } else {
    //         // replace with silent traj followed by copied traj followed by 
    //         // silent traj
    //         const firstDur = realST - targetP.startTime! - targetT.startTime!;
    //         const lastDur = targetT.durTot - firstDur - newTraj.durTot;
    //         targetT.durTot = firstDur;
    //         const lstObj: {
    //           id: number,
    //           pitches: Pitch[],
    //           durTot: number,
    //           fundID12: number,
    //           instrument?: string
    //         } = {
    //           id: 12,
    //           pitches: [],
    //           durTot: lastDur,
    //           fundID12: this.piece.raga.fundamental
    //         };
    //         if (this.piece.instrumentation) {
    //           lstObj.instrument = this.piece.instrumentation[0];
    //         }
    //         const lastTraj = new Trajectory(lstObj);
    //         trajs.splice(targetTIdx + 1, 0, newTraj);
    //         trajs.splice(targetTIdx + 2, 0, lastTraj);
    //         targetP.reset();
    //         const followingTrajs = trajs.slice(targetTIdx + 2, trajs.length);
    //         followingTrajs.reverse().forEach(t => {
    //           if (t.id !== 12) {
    //             const oldId = `p${t.phraseIdx}t${t.num! - 2}`;
    //             const newId = `p${t.phraseIdx}t${t.num}`;
    //             this.reIdAllReps(oldId, newId);
    //           }
    //         })
    //       }
    //       const vowelIdxs = targetP.firstTrajIdxs();
    //       this.codifiedAddTraj(newTraj, targetP.startTime!, vowelIdxs)
    //       this.pastedTrajs.push(newTraj);
    //     });
        
    //     this.selectedTrajs = this.pastedTrajs;
    //     if (grouped) {
    //       this.groupSelectedTrajs()
    //     }
    //     if (this.selectedTrajs.length === 1) {
    //       this.selectedTraj = this.selectedTrajs[0];
    //       const st = this.selectedTraj;
    //       this.selectedTrajID = `p${st.phraseIdx}t${st.num}`
    //       d3Select('#' + this.selectedTrajID)
    //         .attr('stroke', this.selTrajColor)
    //       d3Select(`#dampen${this.selectedTrajID}`)
    //         .attr('stroke', this.selTrajColor)
    //       d3Select(`#pluck${this.selectedTrajID}`)
    //         .attr('stroke', this.selArtColor)
    //         .attr('fill', this.selArtColor)
    //       d3Select(`#overlay__${this.selectedTrajID}`)
    //         // .attr('cursor', 'default')
    //     } else {
    //       this.selectedTrajs.forEach(traj => {
    //         const id = `p${traj.phraseIdx}t${traj.num}`;
    //         d3Select(`#${id}`)
    //           .attr('stroke', this.selTrajColor)
    //         d3Select(`#dampen${id}`)
    //           .attr('stroke', this.selTrajColor)
    //         d3Select(`#pluck${id}`)
    //           .attr('fill', this.selArtColor)
    //         d3Select(`#pluck${id}`)
    //           .attr('stroke', this.selArtColor)
    //         d3Select('#overlay__' + id)
    //           // .attr('cursor', 'default')
    //       })
    //     }
    //   } else {
    //     console.log("Can't paste here")
    //   }

      
    // },

    codifiedAddSargamLabels() { // this 
      const allTrajs = this.piece.phrases.map(p => p.trajectories).flat();
      const allPitches: { logFreq: number, time: number, pitch: Pitch }[] = [];
      // I need pitches and timings
      let lastPitch: { 
        logFreq?: number, 
        time?: number 
      } = { logFreq: undefined, time: undefined };
      let trajStart = 0;
      allTrajs.forEach(t => {
        if (t.id !== 12) {
          const durs = t.durArray!.map(d => d * t.durTot);
          let timePts = getStarts(durs);
          timePts.push(t.durTot);
          timePts = timePts.map(tp => trajStart + tp);
          timePts.forEach((tp, i) => {
            const logFreq = t.logFreqs[i] ? t.logFreqs[i] : t.logFreqs[i-1];
            const cLF = lastPitch.logFreq === logFreq;
            const cT = lastPitch.time === tp;
            if (!(cLF || (cLF && cT))) {
              allPitches.push({ 
                logFreq: logFreq, 
                time: tp, 
                pitch: t.pitches[i] 
              });
            }
            lastPitch.logFreq = logFreq;
            lastPitch.time = tp;
          })
        }
        trajStart += t.durTot;
      });
      const sargamLabels = this.phraseG.append('g')
        .classed('sargamLabels', true)
        .style('opacity', Number(this.showSargam))
        .style('pointer-events', 'none');
      const phraseDivs = this.piece.phrases.map(p => p.startTime! + p.durTot!);
      const pwr = 10 ** 5;
      const roundedPDs = phraseDivs.map(p => Math.round(p * pwr) / pwr);
      allPitches.forEach((p, pIdx) => {
        const lastP = allPitches[pIdx - 1];
        const nextP = allPitches[pIdx + 1];
        const lastHigher = lastP ? lastP.logFreq > p.logFreq : true;
        const nextHigher = nextP ? nextP.logFreq > p.logFreq: true;
        let pos: number;
        if (lastHigher && nextHigher) {
          pos = 0; // bottom
        } else if (!lastHigher && !nextHigher) {
          pos = 1; // top
        } else if (lastHigher && !nextHigher) {
          pos = 3; // bottom left
        } else if (!lastHigher && nextHigher) {
          pos = 2; // top left
        }
        if (roundedPDs.includes(Math.round(p.time * pwr) / pwr)) {
          if (nextHigher) {
            pos = 5
          } else {
            pos = 4
          }
        }
        if (this.vocal && pos! === 1) pos = 0;
        if (this.vocal && pos! === 2) pos = 5;
        const positions = [
          { x: 0, y: 15 },
          { x: 0, y: -15 },
          { x: -5, y: -15 },
          { x: -5, y: 15 },
          { x: 5, y: -15 },
          { x: 5, y: 15 }
        ]
        const x = this.codifiedXR!(p.time);
        const y = this.codifiedYR!(p.logFreq);
        sargamLabels.append('text')
          .attr('x', x + positions[pos!].x)
          .attr('y', y + positions[pos!].y)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', 14)
          .attr('fill', 'black')
          .text(p.pitch.octavedSargamLetter)
      })
    },

    addBolLabels() {
      const trajs = this.piece.allTrajectories();
      const bolLabels = this.phraseG.append('g')
        .classed('bolLabels', true)
        .style('opacity', Number(this.showBols))
        .style('pointer-events', 'none');
      trajs.forEach(traj => {
        const pIdx = traj.phraseIdx!;
        const phrase = this.piece.phrases[pIdx];
        const tIdx = traj.num!;
        const phraseStart = phrase.startTime!;
        if (traj.id !== 12) {
          const pArt = traj.articulations['0.00'];
          if (pArt && pArt.name === 'pluck') {
            const pluckdata = [
              { x: phraseStart + traj.startTime!, y: traj.compute(0, true) }
            ];
            const x = (d: DrawDataType) => this.codifiedXR!(d.x);
            const y = (d: DrawDataType) => this.codifiedYR!(d.y);
            const strokeText = pArt.strokeNickname!;
            const size = 20;
            const offset = (size ** 0.5) / 2;
            bolLabels.append('text')
              .data(pluckdata)
              .text(strokeText)
              .attr('font-size', '16px')
              .attr('fill', 'black')
              .attr('text-anchor', 'middle')
              .attr('transform', d => {
                return `translate(${x(d) + offset}, ${y(d) - 10})`
              })
          }
        }
      })
    },

    clearSargamLabels() {
      d3Select('.sargamLabels').remove();
    },

    resetSargam() {
      this.clearSargamLabels();
      this.codifiedAddSargamLabels();
    },

    clearBolLabels() {
      d3Select('.bolLabels').remove();
    },

    resetBols() {
      this.clearBolLabels();
      this.addBolLabels();
    },

    // addAllDragDots() {
    //   const sTraj = this.selectedTraj!
    //   d3SelectAll('.dragDots').remove();
    //   const pIdx = sTraj.phraseIdx!;
    //   // const tIdx = sTraj.num;
    //   const phrase = this.piece.phrases[pIdx];
    //   const drag = () => {
    //     return d3Drag()
    //       .on('start', this.dragDotStart)
    //       .on('drag', this.dragDotDragging)
    //       .on('end', this.dragDotEnd)
    //   };
    //   const dragDotsG = this.phraseG.append('g').classed('dragDots', true);
    //   let times = [0, ...sTraj.durArray!.map(cumsum())];
    //   const phraseStart = phrase.startTime!;
    //   const ts = sTraj.startTime!;
    //   times = times.map(a => a * sTraj.durTot + phraseStart + ts);
    //   for (let i = 0; i < times.length; i++) {
    //     const lf = sTraj.logFreqs[i] ?
    //       sTraj.logFreqs[i] :
    //       sTraj.logFreqs[i - 1];
    //     dragDotsG
    //       .append('circle')
    //       .attr('id', `dragDot${i}`)
    //       .attr('cx', this.codifiedXR!(times[i]))
    //       .attr('cy', this.codifiedYR!(lf))
    //       .attr('r', 4)
    //       .style('fill', 'purple')
    //       .style('cursor', 'pointer')
    //       .on('contextmenu', this.dragDotContextMenuClick)
    //     if (this.editable) {
    //       d3Select(`#dragDot${i}`)
    //         .call(drag())  
    //     }          
    //   }
    // },

    dragDotContextMenuClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      e.preventDefault();
      e.stopPropagation();
      this.contextMenuX = e.x;
      this.contextMenuY = e.y;
      const ddIdx = Number(target.id.slice(7));
      
      this.contextMenuChoices = [];
      this.contextMenuChoices.push({
        text: 'Offset Frequency',
        action: () => {
          target.style.fill = '#398BB9';
          this.contextMenuClosed = true;
          const newDrag = () => {
            return d3Drag()
              .on('start', this.verticalDragDotStart)
              .on('drag', this.verticalDragDotDragging)
              .on('end', this.verticalDragDotEnd)
          }
          d3Select(`#dragDot${ddIdx}`)
            .on('.drag', null)
            .call(newDrag())
        },
        enabled: true
      })
      this.contextMenuClosed = false;
    },

    async resizeHeight(controlsOpenOverride = undefined) {
      const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      let controlsOpen = ap.showControls || ap.showDownloads || ap.showTuning;
      if (controlsOpenOverride !== undefined) {
        controlsOpen = controlsOpenOverride;
      }
      const controlsHeight = controlsOpen ? ap.controlsHeight : 0;
      const less = this.navHeight + controlsHeight + this.playerHeight + 1;
      this.editorHeight = window.innerHeight - less;
      try {
        const leftTime = this.leftTime;
        const currentXK = this.tx!().k;
        const currentYK = this.ty!().k;
        const yProp = this.getScrollYDraggerTranslate();
        const backColorElem = document.querySelector('#backColor') as 
          HTMLElement;
        const currentHeight = backColorElem.getBoundingClientRect().height;
        const scalingParam = currentYK * currentHeight;
        // await this.initializePiece(leftTime, currentXK, scalingParam, yProp);
        // const scrollY = this.getScrollYVal(yProp);
        // this.gy.call(this.zoomY!.translateTo, 0, scrollY, [0, 0]);
        // this.transformScrollYDragger();

        this.resize();

      } catch (err) {
        console.log(err)
      }
    },

    getCenterPoint() {
      const backColorElem = document.querySelector('#backColor') as HTMLElement;
      const rect = backColorElem.getBoundingClientRect();
      const x = rect.width / 2;
      const y = rect.height / 2;
      return [x, y];
    },
    
    async makeSpectrograms() {
      // use call from serverCalls.ts to create new spectrograms on the server.
      const recId = this.piece.audioID!;
      const saEst = this.audioDBDoc!.saEstimate;
      const octOffset = Number(this.audioDBDoc!.octOffset);
      const result = await makeSpectrograms(recId, saEst * 2 ** octOffset);
      console.log(result)
    },

    // verticalDragDotStart(e: D3DragEvent<HTMLDivElement, any, MouseEvent>) {
    //   const straj = this.selectedTraj!;
    //   if (this.editable) {
    //     const phrase = this.piece.phrases[straj.phraseIdx!]; 
    //     const phraseStart = phrase.startTime;
    //     const trajStart = straj.startTime;
    //     const idx = e.sourceEvent.target.id.split('dragDot')[1];
    //     this.dragIdx = idx;
    //     const logFreq = this.codifiedYR!.invert(e.y);
    //     this.initLogFreq = straj.pitches[idx].nonOffsetLogFreq;
    //     // straj.logFreqs[idx] = logFreq;
    //     const st = phraseStart! + trajStart!;
    //     const endTime = st + straj.durTot;
    //     const timePts = Math.round((endTime - st) / this.minDrawDur);
    //     const drawTimes = linSpace(st, endTime, timePts);
    //     const mp = (t: number) => (t - st) / (endTime - st);
    //     const trajDrawXs = drawTimes.map(mp);
    //     const trajDrawYs = trajDrawXs.map(x => straj.compute(x))
    //     const data = trajDrawYs.map((y, i) => {
    //       return {
    //         x: drawTimes[i],
    //         y: y
    //       }
    //     });
    //     this.phraseG.append('path')
    //       .datum(data)
    //       .attr('id', 'transparentPhrase')
    //       .attr('stroke', this.trajColor)
    //       .attr('fill', 'none')
    //       .attr('stroke-width', '3px')
    //       .attr('stroke-linejoin', 'round')
    //       .attr('stroke-linecap', 'round')
    //       .attr('d', this.codifiedPhraseLine())
    //       .style('opacity', '0.35')
    //   }
    // },

    // verticalDragDotDragging(e: D3DragEvent<HTMLDivElement, any, MouseEvent>) {
    //   if (this.editable) {
    //     const idx = Number(this.dragIdx);

        
    //     const traj = this.selectedTraj!;
    //     const tIdx = traj.num!;
    //     const pIdx = traj.phraseIdx!;
    //     const phrase = this.piece.phrases[pIdx];
    //     const pitch = traj.pitches[idx];
    //     const basicLogFreq = pitch.logFreq - pitch.logOffset;
    //     const logSGLines = this.visibleSargam.map(s => Math.log2(s));
    //     const closest = getClosest(logSGLines, basicLogFreq);
    //     const lIdx = logSGLines.indexOf(closest);
    //     let logMax = logSGLines.length > lIdx + 1 ? 
    //         logSGLines[lIdx + 1] : 
    //         logSGLines[lIdx];
    //     logMax = (logMax + basicLogFreq) / 2;
    //     let logMin = lIdx > 0 ? logSGLines[lIdx - 1] : logSGLines[lIdx];
    //     logMin = (logMin + basicLogFreq) / 2;
    //     let logFreq = this.codifiedYR!.invert(e.y);
    //     if (logFreq > logMax) logFreq = logMax;
    //     if (logFreq < logMin) logFreq = logMin;
    //     const yPxl = this.codifiedYR!(logFreq);
    //     const offset = logFreq - this.initLogFreq!;
    //     pitch.logOffset = offset;
        
    //     d3Select(`#dragDot${idx}`)
    //       .attr('cy', yPxl)
    //     const data = this.makeTrajData(traj, phrase.startTime!);
    //     d3Select(`#transparentPhrase`)
    //       .datum(data)
    //       .attr('d', this.codifiedPhraseLine())
    //   } 
    // },

    // verticalDragDotEnd(e: MouseEvent) {
    //   if (this.editable) {
    //     const idx = Number(this.dragIdx);
    //     const traj = this.selectedTraj!;
    //     const tIdx = traj.num!;
    //     const pIdx = traj.phraseIdx!;
    //     const phrase = this.piece.phrases[traj.phraseIdx!];
    //     const pitch = traj.pitches[idx];
    //     let logFreq = this.codifiedYR!.invert(e.y);
    //     const basicLogFreq = pitch.logFreq - pitch.logOffset;
    //     const logSGLines = this.visibleSargam.map(s => Math.log2(s));
    //     const closest = getClosest(logSGLines, basicLogFreq);
    //     const lIdx = logSGLines.indexOf(closest);
    //     let logMax = logSGLines.length > lIdx + 1 ? 
    //       logSGLines[lIdx + 1] : 
    //       logSGLines[lIdx];
    //     logMax = (logMax + basicLogFreq) / 2;
    //     let logMin = lIdx > 0 ? logSGLines[lIdx - 1] : logSGLines[lIdx];
    //     logMin = (logMin + basicLogFreq) / 2;
    //     if (logFreq > logMax) logFreq = logMax;
    //     if (logFreq < logMin) logFreq = logMin;
    //     const offset = logFreq - this.initLogFreq!;
    //     pitch.logOffset = offset;
    //     if (idx === 0 && traj.id === 0) {
    //       const pitch2 = traj.pitches[1];
    //       pitch2.logOffset = offset;
    //     } else if (idx === 1 && traj.id === 0) {
    //       const pitch1 = traj.pitches[0];
    //       pitch1.logOffset = offset;
    //     }
    //     const pst = phrase.startTime!;
    //     d3Select(`#transparentPhrase`).remove();
    //     const data = this.makeTrajData(traj, pst);
    //     d3Select(`#p${pIdx}t${tIdx}`)
    //       .datum(data)
    //       .attr('d', this.codifiedPhraseLine())
    //     d3Select(`#overlay__p${pIdx}t${tIdx}`)
    //       .datum(data)
    //       .attr('d', this.codifiedPhraseLine())
    //     this.moveKrintin(traj, pst);
    //     this.moveSlides(traj, pst);
    //     this.codifiedRedrawDampener(traj, pst);
    //     if (this.vocal) {
    //       this.moveSConsonant(traj, pst, true);
    //       this.moveEConsonant(traj, pst, true);
    //       this.moveVowel(traj, pst, true);
    //       this.moveConsonantSymbols(traj, pst, true);
    //     }
    //     this.removePlucks(traj);
    //     const g = d3Select(`#articulations__p${pIdx}t${tIdx}`) as 
    //       Selection<SVGGElement, any, any, any>;
    //     this.codifiedAddPlucks(traj, pst, g);
    //     this.addAllDragDots();
    //     this.unsavedChanges = true;
    //   }
    // },

    cleanEmptyTrajs(phrase: Phrase) {
      phrase.trajectories.forEach((traj, i) => {
        if (traj.durTot === 0) {
          phrase.trajectories.splice(i, 1);
          phrase.durArray!.splice(i, 1);
          phrase.trajectories.slice(i).forEach(_traj => {
            const oldTIdx = _traj.num!;
            const newTIdx = _traj.num! - 1;
            _traj.num = newTIdx;
            const oldId = `p${phrase.pieceIdx}t${oldTIdx}`;
            const newId = `p${phrase.pieceIdx}t${newTIdx}`;
            d3Select(`#${oldId}`).attr('id', newId);
            d3Select(`#overlay__${oldId}`).attr('id', `overlay__${newId}`);
            d3Select(`#articulations__${oldId}`)
              .attr('id', `articulations__${newId}`);
            let hOffCt = 0;
            let hOnCt = 0;
            let slideCt = 0;
            Object.keys(_traj.articulations).forEach(key => {
              const art = _traj.articulations[key];
              if (art.name === 'pluck') {
                d3Select(`#pluck${oldId}`).attr('id', `pluck${newId}`);
              } else if (art.name === 'hammer-off') {
                d3Select(`#hammeroff${oldId}i${hOffCt}`)
                  .attr('id', `hammeroff${newId}i${hOffCt}`);
                hOffCt++;
              } else if (art.name === 'hammer-on') {
                d3Select(`#hammeron${oldId}i${hOnCt}`)
                  .attr('id', `hammeron${newId}i${hOnCt}`);
                hOnCt++;
              } else if (art.name === 'slide') {
                d3Select(`#slide${oldId}i${slideCt}`)
                  .attr('id', `slide${newId}i${slideCt}`);
                slideCt++;
              }
            })
          })
        }
      })
    },

    newDurArrayA(traj: Trajectory, delta: number) {
      const initPortionA = traj.durArray![0] * traj.durTot;
      const newDur = traj.durTot - delta;
      const newPropA = (initPortionA - delta) / newDur;
      let newDurArray = traj.durArray!.map((i => i * traj.durTot / newDur));
      newDurArray[0] = newPropA;
      return newDurArray
    },

    newDurArrayZ(traj: Trajectory, delta: number) {
      const initPartZ = traj.durArray![traj.durArray!.length-1] * traj.durTot;
      const newDur = traj.durTot + delta;
      const newPropZ = (initPartZ + delta) / newDur;
      let newDurArray = traj.durArray!.map((i => i * traj.durTot / newDur));
      newDurArray[newDurArray.length - 1] = newPropZ;
      return newDurArray;
    },

    fixTrajectory(traj: Trajectory) {
      // so that articulations are in the right place according to new durArray;
      if (!this.vocal) {
        const trajObj: {
          id?: number;
          num?: number;
          durArray?: number[];
          durTot?: number;
          articulations?: { [key: string]: Articulation };
        } = traj.toJSON();
        const c1 = traj.articulations[0] || traj.articulations['0.00'];
        const c2 = traj.articulations['1.00'];
        let pluckExists = false;
        if (c1) {
          if (traj.articulations[0]) {
            pluckExists = traj.articulations[0].name === 'pluck';
          } else {
            pluckExists = traj.articulations['0.00'].name === 'pluck';
          }
        }   
        const dampenExists = c2 && traj.articulations['1.00'].name === 'dampen';
        trajObj.articulations = undefined;
        const newTraj = new Trajectory(trajObj);
        if (!pluckExists) {
          delete newTraj.articulations[0];
          delete newTraj.articulations['0.00']
        }
        if (dampenExists) newTraj.articulations['1.00'] = new Articulation({
          name: 'dampen',
        })
        return newTraj
      } else {
        return traj
      }
      
    },

    // constrainTime(
    //     e: MouseEvent | D3DragEvent<HTMLDivElement, any, MouseEvent>, 
    //     idx: number
    //     ) {
    //   let time = this.codifiedXR!.invert(e.x);
    //   const traj = this.selectedTraj!;
    //   const pIdx = traj.phraseIdx!;
    //   const tIdx = traj.num!;
    //   const phrase = this.piece.phrases[pIdx];
    //   let times = [0, ...traj.durArray!.map(cumsum())];
    //   const st = phrase.startTime! + traj.startTime!;
    //   times = times.map(a => a * traj.durTot! + st);
    //   if (idx === 0) {
    //     let start: number = 0;
    //     let prevTraj: Trajectory;
    //     if (tIdx > 0) {
    //       prevTraj = phrase.trajectories[tIdx - 1];
    //       if (prevTraj.durArray && prevTraj.durArray.length > 1) {
    //         let prevTrajTimes = [0, ...prevTraj.durArray.map(cumsum())];
    //         prevTrajTimes = prevTrajTimes.map(a => {
    //           const pst = phrase.startTime! + prevTraj.startTime!;
    //           return a * prevTraj.durTot + pst
    //         });
    //         start = prevTrajTimes[prevTrajTimes.length - 2]
    //       } else {
    //         start = phrase.startTime! + phrase.trajectories[tIdx - 1].startTime!
    //       }
    //     } else if (pIdx > 0) {
    //       const prevPhrase = this.piece.phrases[pIdx - 1];
    //       const pTrajs = prevPhrase.trajectories;
    //       prevTraj = pTrajs[pTrajs.length - 1];
    //       if (prevTraj.durArray && prevTraj.durArray.length > 1) {
    //         let prevTrajTimes = [0, ...prevTraj.durArray.map(cumsum())];
    //         prevTrajTimes = prevTrajTimes.map(a => {
    //           const pst = prevPhrase.startTime! + prevTraj.startTime!;
    //           return a * prevTraj.durTot + pst
    //         });
    //         start = prevTrajTimes[prevTrajTimes.length - 2]
    //       } else {
    //         start = prevPhrase.startTime! + prevTraj.startTime!
    //       }
    //     }
    //     if (prevTraj!.id === 12) {
    //       if (time < start) time = start
    //     } else {
    //       if (time < start + this.minTrajDur) {
    //         time = start + this.minTrajDur
    //       }
    //     }      
    //     if (time > times[1] - this.minTrajDur) {
    //       time = times[1] - this.minTrajDur
    //     }
    //   } else if (idx < times.length - 1) {
    //     if (time < times[idx - 1] + this.minTrajDur) {
    //       time = times[idx - 1] + this.minTrajDur
    //     }
    //     if (time > times[idx + 1] - this.minTrajDur) {
    //       time = times[idx + 1] - this.minTrajDur
    //     }
    //   } else {
    //     let nextEnd: number = 0;
    //     let nextTraj: Trajectory;
    //     if (time < times[idx - 1] + this.minTrajDur) {
    //       time = times[idx - 1] + this.minTrajDur
    //     }
    //     if (phrase.trajectories[tIdx + 1]) {
    //       nextTraj = phrase.trajectories[tIdx + 1];
    //       if (nextTraj.durArray && nextTraj.durArray.length > 1) {
    //         let nextTrajTimes = [0, ...nextTraj.durArray.map(cumsum())];
    //         nextTrajTimes = nextTrajTimes.map(a => {
    //           const st = phrase.startTime! + nextTraj.startTime!;
    //           return a * nextTraj.durTot + st
    //         });
    //         nextEnd = nextTrajTimes[1]
    //       } else {
    //         nextEnd = phrase.startTime! + nextTraj.startTime! + nextTraj.durTot
    //       }
    //     } else if (this.piece.phrases[pIdx + 1]) {
    //       const nextPhrase = this.piece.phrases[pIdx + 1];
    //       nextTraj = nextPhrase.trajectories[0];
    //       if (nextTraj.durArray && nextTraj.durArray.length > 1) {
    //         let nextTrajTimes = [0, ...nextTraj.durArray.map(cumsum())];
    //         nextTrajTimes = nextTrajTimes.map(a => {
    //           const nst = nextPhrase.startTime! + nextTraj.startTime!;
    //           return a * nextTraj.durTot + nst
    //         });
    //         nextEnd = nextTrajTimes[1]
    //       } else {
    //         const nst = nextPhrase.startTime! + nextTraj.startTime!;
    //         nextEnd = nst + nextTraj.durTot;
    //       }
    //     }
    //     if (nextTraj!.id === 12) {
    //       if (time > nextEnd) time = nextEnd
    //     } else {
    //       if (time > nextEnd - this.minTrajDur) {
    //         time = nextEnd - this.minTrajDur
    //       }
    //     }  
    //   }
    //   return time
    // },

    calculateNewDurArray(
        phrase: Phrase, 
        traj: Trajectory, 
        idx: number, 
        time: number
        ) {
      let times = [0, ...traj.durArray!.map(cumsum())];
      const st = phrase.startTime! + traj.startTime!;
      times = times.map(a => a * traj.durTot + st);
      const newTimes = times.slice();
      newTimes[idx] = time;
      let durArray = newTimes.slice(1).map((v, i) => v - newTimes[i]);
      const daSum = durArray.reduce((a, b) => a + b, 0)
      durArray = durArray.map(i => i / daSum)
      return durArray
    },
    
    // addNewPhraseDiv(idx: number) {
    //   console.log(idx)
    //   const phrase = this.piece.phrases[idx];
    //   const time = phrase.startTime! + phrase.durTot!;
    //   const drag = () => {
    //     return d3Drag()
    //       .on('start', this.phraseDivDragStart(idx))
    //       .on('drag', this.phraseDivDragDragging(idx))
    //       .on('end', this.phraseDivDragEnd(idx))
    //   }; 
    //   const dontClick = (e: MouseEvent) => {
    //     e.preventDefault();
    //     e.stopPropagation();
    //   };
    //   const realPhraseStartIdx = idx + 1;
    //   const sectionDiv = this.piece.sectionStarts!.includes(realPhraseStartIdx);
    //   this.phraseG
    //     .append('path')
    //     .attr('id', `phraseLine${idx}`)
    //     .classed('phraseDiv', true)
    //     .attr('stroke', 'black')
    //     .attr('stroke-width', sectionDiv ? '4px' : '2px')
    //     .attr('d', this.playheadLine(true))
    //     .style('opacity', this.viewPhrases ? '1' : '0')
    //     .attr('transform', `translate(${this.codifiedXR!(time)},0)`);
    //   this.phraseG
    //     .append('path')
    //     .attr('id', `overlay__phraseLine${idx}`)
    //     .classed('phraseDiv', true)
    //     .attr('stroke', 'black')
    //     .attr('stroke-width', '4px')
    //     .attr('d', this.playheadLine(true))
    //     .style('opacity', '0')
    //     .attr('transform', `translate(${this.codifiedXR!(time)},0)`)
    //     .style('cursor', 'pointer')
    //     .on('click', dontClick)
    //   if (this.editable) {
    //     d3Select(`#overlay__phraseLine${idx}`)
    //       .call(drag())
    //       .on('click', dontClick)
    //   } 
    //   // reId all trajs and articulations in following phrases
    //   for (let i = this.piece.phrases.length-1; i > 1 + idx; i--) {
    //     const thisPhrase = this.piece.phrases[i];
    //     thisPhrase.trajectories.forEach(traj => {
    //       const oldId = `p${i-1}t${traj.num}`;
    //       const newId = `p${i}t${traj.num}`;
    //       this.reIdAllReps(oldId, newId);
    //     });
    //     // chikaris
    //     Object.keys(thisPhrase.chikaris).forEach(key => {
    //       const lastPhrase = this.piece.phrases[i-1];
    //       const oldSec = Math.floor(Number(key));
    //       const oldDec = (Number(key) % 1).toFixed(2).toString().slice(2);
    //       const oldId = `p${lastPhrase.pieceIdx}_${oldSec}_${oldDec}`;
    //       const newId = `p${thisPhrase.pieceIdx}_${oldSec}_${oldDec}`;
    //       d3Select(`#circle__${oldId}`).attr('id', `circle__${newId}`);
    //       d3Select(`#${oldId}`).attr('id', newId); 
    //     })
    //   }
    //   //reId all trajs to the right of the new phraseDivLine
    //   const nextPhrase = this.piece.phrases[idx+1];
    //   nextPhrase.trajectories.forEach(traj => {
    //     const add = phrase.trajectories.length;
    //     const oldId = `p${phrase.pieceIdx}t${traj.num! + add}`;
    //     const newId = `p${nextPhrase.pieceIdx}t${traj.num}`;
    //     this.reIdAllReps(oldId, newId)
    //   })
    //   // move all chikaris to new phrase, and reId
    //   Object.keys(phrase.chikaris).forEach(key => {
    //     if (Number(key) > phrase.durTot!) {
    //       const newKey = (Number(key) - phrase.durTot!).toFixed(2);
    //       const oldSec = Math.floor(Number(key));
    //       const oldDec = (Number(key) % 1).toFixed(2).toString().slice(2);
    //       const oldId = `p${phrase.pieceIdx}_${oldSec}_${oldDec}`;
    //       const newSec = Math.floor(Number(newKey));
    //       const newDec = (Number(newKey) % 1).toFixed(2).toString().slice(2);
    //       const newId = `p${nextPhrase.pieceIdx}_${newSec}_${newDec}`;
    //       d3Select(`#circle__${oldId}`).attr('id', `circle__${newId}`);
    //       d3Select(`#${oldId}`).attr('id', newId);
    //       nextPhrase.chikaris[newKey] = phrase.chikaris[key];
    //       delete phrase.chikaris[key];
    //     }
    //   });
    //   const realIdx = idx + 1;
    //   this.piece.sectionStarts = this.piece.sectionStarts!.map(i => {
    //     if (i >= realIdx) {
    //       return i + 1;
    //     } else {
    //       return i;
    //     }
    //   });
    //   this.phraseG.selectAll('.phraseDiv').remove();
    //   this.updatePhraseDivs();
    // },

    addMetricGrid(codified=true) {
      this.insertPulseMode = false;
      d3SelectAll('.metricGrid').remove();
      const allPulses: Pulse[] = [];
      this.piece.meters.forEach(meter => {
        allPulses.push(...meter.allCorporealPulses)
      });
      const layerWidth = [1.5, 1, 0.5, 0.25]
      allPulses.forEach(pulse => {
        const x = codified ? 
            this.codifiedXR!(pulse.realTime) : 
            this.xr()(pulse.realTime);
        let strokeWidth = layerWidth[pulse.lowestLayer];
        if (pulse.lowestLayer === 0 && pulse.affiliations[0].strong) {
          strokeWidth += 0.5;
          if (pulse.affiliations[0].segmentedMeterIdx === 0) {
            strokeWidth += 0.5;
          }
        }
        const drag = (pulse: Pulse) => {
          return d3Drag()
            .on('start', this.pulseDragStart(pulse))
            .on('drag', this.pulseDragging(pulse))
            .on('end', this.pulseDragEnd(pulse))
        }

        const opacity = this.maxLayer >= pulse.lowestLayer ? '1' : '0';
        this.phraseG
          .append('path')
          .classed('metricGrid', true)
          .classed(`layer_${pulse.lowestLayer}`, true)
          .classed(`meterId_${pulse.meterId}`, true)
          .attr('id', `metricGrid_${pulse.uniqueId}`)
          .attr('stroke', this.meterColor)
          .attr('stroke-width', `${strokeWidth}px`)
          .attr('d', this.playheadLine(codified))
          .style('opacity', opacity)
          .attr('transform', `translate(${x},0)`)

        this.phraseG
          .append('path')
          .classed('metricGrid', true)
          .classed(`layer_${pulse.lowestLayer}`, true)
          .classed(`meterId_${pulse.meterId}`, true)
          .classed('overlay', true)
          .attr('id', `metricGrid_${pulse.uniqueId}`)
          .attr('stroke', this.meterColor)
          .style('opacity', '0')
          .attr('stroke-width', `5px`)
          .attr('d', this.playheadLine(codified))
          .on('click', (e: MouseEvent) => {
            if (this.meterMode) {
              e.preventDefault();
              e.stopPropagation();
              this.selectMeter(pulse.uniqueId)
            }
            
          })
          .on('contextmenu', (e: MouseEvent) => {
            const target = e.target as SVGPathElement;
            if (this.meterMode) {
              e.preventDefault();
              e.stopPropagation();
              this.contextMenuX = e.x;
              this.contextMenuY = e.y;
              this.contextMenuClosed = false;
              const pulseId = target.id.slice(11);
              const pulse = this.selMeter!.getPulseFromId(pulseId)!;
              const cycle = this.selMeter!.cycleOfPulse(pulse);
              this.contextMenuChoices = [];
              if (cycle === 0) {
                this.contextMenuChoices.push({
                  text: 'Hide Pulse and priors',
                  action: () => {
                    this.selMeter!.hidePulseAndPriors(pulse);
                    this.contextMenuClosed = true;
                    this.resetZoom();
                    this.selectMeter(pulse.uniqueId)
                  },
                  enabled: true
                })
              } else if (cycle === this.selMeter!.repetitions - 1) {
                this.contextMenuChoices.push({
                  text: 'Hide Pulse and nexts',
                  action: () => {
                    this.selMeter!.hidePulseAndFollowing(pulse);
                    this.contextMenuClosed = true;
                    this.resetZoom();
                    this.selectMeter(pulse.uniqueId)
                  },
                  enabled: true
                })
              }
              if (!this.selMeter!.allPulses[0].corporeal) {
                this.contextMenuChoices.push({
                  text: 'Show all Prior Pulses',
                  action: () => {
                    this.selMeter!.showPriorPulses();
                    this.contextMenuClosed = true;
                    this.resetZoom();
                    this.selectMeter(pulse.uniqueId)
                  },
                  enabled: true
                })
              }
              const ap = this.selMeter!.allPulses;
              if (!ap[ap.length - 1].corporeal) {
                this.contextMenuChoices.push({
                  text: 'Show all Later Pulses',
                  action: () => {
                    this.selMeter!.showLaterPulses();
                    this.contextMenuClosed = true;
                    this.resetZoom();
                    this.selectMeter(pulse.uniqueId)
                  },
                  enabled: true
                })
              }
            }
          })
          .on('mouseover', () => this.hoverMeter(pulse.uniqueId))
          .on('mouseout', () => this.unhoverMeter(pulse.uniqueId))
          .attr('transform', `translate(${x},0)`)
          .call(drag(pulse))
      });
      this.piece.meters.forEach(meter => {
        const endTime = meter.startTime + meter.durTot;
        const x = codified ? 
            this.codifiedXR!(endTime) : 
            this.xr()(endTime);
        this.phraseG
          .append('path')
          .classed('metricGrid', true)
          .classed(`meterId_${meter.uniqueId}`, true)
          .attr('id', `metricGrid_${meter.uniqueId}`)
          .attr('stroke', this.meterColor)
          .attr('stroke-width', '1px')
          .attr('stroke-dasharray', ('5,5'))
          .attr('d', this.playheadLine(codified))
          .attr('transform', `translate(${x},0)`)

        this.phraseG
          .append('path')
          .classed('metricGrid', true)
          .classed(`meterId_${meter.uniqueId}`, true)
          .attr('id', `metricGrid_${meter.uniqueId}`)
          .attr('stroke', this.meterColor)
          .attr('stroke-width', '5px')
          .style('opacity', '0')
          .attr('d', this.playheadLine(codified))
          .attr('transform', `translate(${x},0)`)
          .on('mouseover', () => this.hoverMeter(meter.uniqueId, false))
          .on('mouseout', () => this.unhoverMeter(meter.uniqueId, false))
          .on('click', (e: MouseEvent) => {
            if (this.meterMode) {
              e.preventDefault();
              e.stopPropagation();
              this.selectMeter(meter.uniqueId, false, false)
            }
          })
      })
    },

    pulseDragStart(pulse: Pulse) {
      return (e: D3DragEvent<HTMLDivElement, any, MouseEvent>) => {
        this.pulseDragInitX = e.x;
        if (this.selMeter && pulse.meterId === this.selMeter.uniqueId) {
          this.pulseDragEnabled = true;
        }
      }
    },

    pulseDragging(pulse: Pulse) {
      return (e: D3DragEvent<HTMLDivElement, any, MouseEvent>) => {
        // get affiliation with
        const c1 = pulse.meterId === this.selMeter!.uniqueId;
        if (this.selMeter && c1 && this.editable) {
          const aff = pulse.affiliations[0];
          const psId = pulse.affiliations[0].psId;
          const ps = this.selMeter.getPSFromId(psId)
          let minTime, maxTime;
          if (aff.idx === 0 && aff.segmentedMeterIdx === 0 && aff.layer === 0) {
            const psIdx = this.selMeter.pulseStructures[0].indexOf(ps);
            let cycleNum, subdivs;
            const hierarchy = this.selMeter.hierarchy[0];
            if (typeof hierarchy === 'number') {
              cycleNum = psIdx
              subdivs = hierarchy
            } else {
              cycleNum = Math.floor(psIdx / hierarchy.length);
              subdivs = sum(hierarchy);
            }
            const st = this.selMeter.startTime;
            const center = st + this.selMeter.cycleDur * cycleNum;
            const subDur = this.selMeter.cycleDur / subdivs;
            const maxOff = subDur / 2;
            maxTime = center + maxOff;
            minTime = center - maxOff;
          } else {
            const maxOff = ps.pulseDur / 2;
            const pulseIdx = ps.pulses.indexOf(pulse);
            const center = ps.startTime + ps.pulseDur * pulseIdx;
            maxTime = center + maxOff;
            minTime = center - maxOff;
          }
          let newX = e.x;
          if (newX < this.codifiedXR!(minTime)) {
            newX = this.codifiedXR!(minTime);
          } else if (newX > this.codifiedXR!(maxTime)) {
            newX = this.codifiedXR!(maxTime);
          }
          if (this.pulseDragEnabled) {
            d3Select(`#metricGrid_${pulse.uniqueId}`)
              .attr('transform', `translate(${newX},0)`)
          }
        }
      }
    },

    pulseDragEnd(pulse: Pulse) {
      return (e: D3DragEvent<HTMLDivElement, any, MouseEvent>) => {
        if (this.pulseDragEnabled && this.editable) {
          const aff = pulse.affiliations[0];
          const psId = pulse.affiliations[0].psId;
          const ps = this.selMeter!.getPSFromId(psId);
          let minTime, maxTime;
          if (aff.idx === 0 && aff.segmentedMeterIdx === 0 && aff.layer === 0) {
            const psIdx = this.selMeter!.pulseStructures[0].indexOf(ps);
            let cycleNum, subdivs;
            const hierarchy = this.selMeter!.hierarchy[0];
            if (typeof hierarchy === 'number') {
              cycleNum = psIdx
              subdivs = hierarchy
            } else {
              cycleNum = Math.floor(psIdx / hierarchy.length);
              subdivs = sum(hierarchy);
            }
            const st = this.selMeter!.startTime;
            const center = st + this.selMeter!.cycleDur * cycleNum;
            const subDur = this.selMeter!.cycleDur / subdivs;
            const maxOff = subDur / 2;
            maxTime = center + maxOff;
            minTime = center - maxOff;
          } else {
            const maxOff = ps.pulseDur / 2;
            const pulseIdx = ps.pulses.indexOf(pulse);
            const center = ps.startTime + ps.pulseDur * pulseIdx;
            maxTime = center + maxOff;
            minTime = center - maxOff;
          }
          let newX = e.x;
          if (newX < this.codifiedXR!(minTime)) {
            newX = this.codifiedXR!(minTime);
          } else if (newX > this.codifiedXR!(maxTime)) {
            newX = this.codifiedXR!(maxTime);
          }
          const oldTime = pulse.realTime;
          const newTime = this.codifiedXR!.invert(newX);
          const time = newTime - oldTime;
          this.selMeter!.offsetPulse(pulse, time, true);
          this.selMeter!.resetTempo();
          this.resetZoom();
          this.pulseDragEnabled = false;
          this.pulseDragInitX = undefined
          this.selectMeter(pulse.uniqueId);
          const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
          const meterControls = ap.$refs.meterControls as typeof MeterControls;
          meterControls.updateVisibility();
        }
      }
    },

    hoverMeter(id: string, pulseId: boolean = true) {
      if (this.meterMode) {
        let meter: Meter;
        let pulse: Pulse;
        if (pulseId) {
          const allPulses: Pulse[] = [];
          this.piece.meters.forEach(meter => {
            allPulses.push(...meter.allCorporealPulses)
          });
          pulse = allPulses.find(pulse => pulse.uniqueId === id)!;
          meter = this.piece.meters.find(meter => {
            return meter.uniqueId === pulse.meterId
          })!;
        } else {
          meter = this.piece.meters.find(meter => {
            return meter.uniqueId === id
          })!;
          pulse = meter.allPulses[0];
        }     
        if (this.selMeter !== meter) {
          this.svg.style('cursor', 'pointer')
          d3SelectAll(`.meterId_${pulse.meterId}`)
            .filter((d, i, nodes) => !d3Select(nodes[i]).classed('overlay'))
            .attr('stroke', this.selMeterColor)
        } else {
          if (pulseId) { 
            // prevents final dotted ghost pulse from hovering as col resize
            this.svg.style('cursor', 'col-resize')
          }
        }
      }
    },

    unhoverMeter(id: string, pulseId: boolean = true) {
      if (this.meterMode) {
        let pulse: Pulse;
        let meter: Meter;
        this.svg.style('cursor', 'default');
        if (pulseId) {
          const allPulses: Pulse[] = [];
          this.piece.meters.forEach(meter => {
            allPulses.push(...meter.allCorporealPulses)
          });
          pulse = allPulses.find(pulse => pulse.uniqueId === id)!;
          meter = this.piece.meters.find(meter => {
            return meter.uniqueId === pulse.meterId
          })!;
        } else {
          meter = this.piece.meters.find(meter => {
            return meter.uniqueId === id
          })!;
          pulse = meter.allPulses[0];
        }
        
        if (this.selMeter !== meter) {
          d3SelectAll(`.meterId_${pulse.meterId}`)
          .filter((d, i, nodes) => !d3Select(nodes[i]).classed('overlay'))
          .attr('stroke', this.meterColor)
        }
        this.svg.style('cursor', 'crosshair')
      }
    },

    selectMeter(id: string, turnMMOn = false, pulseId = true) {
      if (turnMMOn) {
        this.meterMode = true;
        this.insertPulseMode = false;
        d3SelectAll('.insertPulse').remove();
      }
      if (this.meterMode) {
        const allPulses: Pulse[] = []
        this.piece.meters.forEach(meter => {
          allPulses.push(...meter.allPulses)
        });
        
        const audioPlayer = this.$refs.audioPlayer as typeof EditorAudioPlayer;
        const meterControls = audioPlayer.$refs.meterControls as 
          typeof MeterControls;
        meterControls.meterSelected = true;
        let pulse: Pulse;
        let meter: Meter;
        if (pulseId) {
          pulse = allPulses.find(pulse => pulse.uniqueId === id)!;
          meter = this.piece.meters.find(meter => {
            return meter.uniqueId === pulse.meterId
          })!;
        } else {
          meter = this.piece.meters.find(meter => {
            return meter.uniqueId === id
          })!;
          pulse = meter.allPulses[0];
        }
        
        this.selMeter = meter;
        meterControls.meter = meter;
        //should go to the meter controls, if not selected
        if (audioPlayer.showMeterControls === false) {
          audioPlayer.toggleMeterControls()
        }
        d3SelectAll('.metricGrid')
          .attr('stroke', this.meterColor)
        d3SelectAll(`.meterId_${pulse.meterId}`)
          .filter((d, i, nodes) => !d3Select(nodes[i]).classed('overlay'))
          .attr('stroke', this.selMeterColor)
        meterControls.assignData();
      }   
    },

    async removeMeter(meter: Meter) { // the specific graph
      const meterIdx = this.piece.meters.indexOf(meter);
      if (meterIdx !== -1) {
        this.piece.meters.splice(meterIdx, 1);
      }
      d3SelectAll('#metricGrid_' + meter.uniqueId).remove();
      await this.$nextTick();
      this.resetZoom();
      this.meterMode = false;
      this.svg.style('cursor', 'default');
      this.unsavedChanges = true;
    },

    // updatePhraseDivs() {
    //   if (this.viewPhrases) {
    //     this.piece.phrases.forEach((phrase, i) => {
    //       const endTime = phrase.startTime! + phrase.durTot!;
    //       if (d3Select(`#phraseLine${i}`).node()) {
    //         d3Select(`#phraseLine${i}`)
    //           .style('opacity', '1')
    //       } else {           
    //         const drag = () => {
    //           return d3Drag()
    //             .on('start', this.phraseDivDragStart(i))
    //             .on('drag', this.phraseDivDragDragging(i))
    //             .on('end', this.phraseDivDragEnd(i))
    //         }
    //         const dontClick = (e: MouseEvent) => {
    //           e.preventDefault();
    //           e.stopPropagation();
    //         };
    //         const sectionDiv = this.piece.sectionStarts!.includes(i + 1);
    //         this.phraseG
    //           .append('path')
    //           .classed('phraseDiv', true)
    //           .attr('id', `phraseLine${i}`)
    //           .attr('stroke', 'black')
    //           .attr('stroke-width', sectionDiv ? '4px' : '2px')
    //           .attr('d', this.playheadLine())
    //           .style('opacity', '1')
    //           .attr('transform', `translate(${this.codifiedXR!(endTime)},0)`)
    //         this.phraseG
    //           .append('path')
    //           .classed('phraseDiv', true)
    //           .attr('id', `overlay__phraseLine${i}`)
    //           .attr('stroke', 'black')
    //           .attr('stroke-width', '4px')
    //           .attr('d', this.playheadLine())
    //           .on('click', dontClick)
    //           .style('opacity', '0')
    //           .attr('transform', `translate(${this.codifiedXR!(endTime)},0)`)
    //           .style('cursor', 'pointer')
    //         if (this.editable) {
    //           d3Select(`#overlay__phraseLine${i}`)
    //             .call(drag())
    //         }
    //       }
    //     })
    //   } else {
    //     this.piece.phrases.forEach((phrase, i) => {
    //       d3Select(`#phraseLine${i}`)
    //         .style('opacity', 0)
    //     })
    //   }
    // },
    
    // phraseDivDragStart(i: number) {
    //   return (e: D3DragEvent<HTMLDivElement, any, MouseEvent>) => {
    //     e.sourceEvent.preventDefault();
    //     e.sourceEvent.stopPropagation();
    //     if (this.selectedPhraseDivIdx !== undefined) {
    //       let time = this.xr().invert(e.sourceEvent.clientX);
    //       this.phraseG
    //         .append('path')
    //         .attr('id', `transparentPhraseLine${i}`)
    //         .attr('stroke', 'black')
    //         .attr('stroke-width', '2px')
    //         .attr('d', this.playheadLine())
    //         .style('opacity', '0.4')
    //         .attr('transform', `translate(${this.codifiedXR!(time)},0)`)        
    //       this.svg.style('cursor', 'col-resize')
    //     }
    //   }
    // },
    
    // phraseDivDragDragging(i: number) {
    //   return (e: D3DragEvent<HTMLDivElement, any, MouseEvent>) => {
    //     if (this.selectedPhraseDivIdx !== undefined) {
    //       let time = this.xr().invert(e.sourceEvent.clientX);
    //       d3Select(`#transparentPhraseLine${i}`)
    //         .attr('transform', `translate(${this.codifiedXR!(time)},0)`)
    //     }
    //   }
    // },
    
    // phraseDivDragEnd(i: number) {
      
    //   const tsp = this.$refs.trajSelectPanel as typeof TrajSelectPanel;
    //   return (e: D3DragEvent<HTMLDivElement, any, MouseEvent>) => {
    //     e.sourceEvent.preventDefault();
    //     e.sourceEvent.stopPropagation();
    //     if (this.selectedPhraseDivIdx !== undefined) {
    //       this.justEnded = true;
    //       d3Select(`#transparentPhraseLine${i}`).remove();
    //       const time = this.xr().invert(e.sourceEvent.clientX);
    //       const tempPIdx = this.phraseIdxFromTime(time)!;
    //       const tPhrase = this.piece.phrases[tempPIdx];
    //       const tempTIdx = this.trajIdxFromTime(tPhrase, time)!;        
    //       const tTraj = tPhrase.trajectories[tempTIdx];
    //       let doNormal = true;
    //       if (tTraj.id === 12) {
    //           const tpLen = tPhrase.trajectories.length;
    //           if (i === tempPIdx && tempTIdx === tpLen - 1) {         
    //             const phraseA = this.piece.phrases[i];
    //             const phraseB = this.piece.phrases[i+1];
    //             const origDivTime = phraseA.startTime! + phraseA.durTot!;
    //             if (phraseB.trajectories[0].id === 12) { // if next is silent
    //               doNormal = false;
    //               const pATrajs = phraseA.trajectories;
    //               const prevTraj = pATrajs[pATrajs.length-1];
    //               const nextTraj = phraseB.trajectories[0];
    //               prevTraj.durTot -= origDivTime - time;
    //               nextTraj.durTot += origDivTime - time;
    //               phraseA.durTotFromTrajectories();
    //               phraseA.durArrayFromTrajectories();
    //               phraseB.durTotFromTrajectories();
    //               phraseB.durArrayFromTrajectories();
    //               phraseB.assignStartTimes();
    //               this.piece.durTotFromPhrases();
    //               this.piece.durArrayFromPhrases();
    //               this.piece.updateStartTimes();
    //             } else {
    //               doNormal = false;  
    //               const pATrajs = phraseA.trajectories;        
    //               const prevTraj = pATrajs[pATrajs.length-1];
    //               const nntObj: {
    //                 id: number,
    //                 durTot: number,
    //                 fundID12: number,
    //                 instrumentation?: string
    //               } = { 
    //                 id: 12, 
    //                 durTot: origDivTime - time,
    //                 fundID12: this.piece.raga.fundamental
    //               };
    //               if (this.piece.instrumentation) {
    //               nntObj.instrumentation = this.piece.instrumentation[0];
    //               }
    //               const newNextTraj = new Trajectory(nntObj);
    //               prevTraj.durTot -= origDivTime - time;
    //               phraseA.durTotFromTrajectories();
    //               phraseA.durArrayFromTrajectories();
    //               phraseB.trajectories.splice(0, 0, newNextTraj);
    //               phraseB.durTotFromTrajectories();
    //               phraseB.durArrayFromTrajectories();
    //               phraseB.assignStartTimes();
    //               phraseB.assignTrajNums();
    //               this.piece.durTotFromPhrases();
    //               this.piece.durArrayFromPhrases();
    //               this.piece.updateStartTimes();
    //               phraseB.trajectories.slice().reverse()
    //               .forEach((traj, idx, arr) => {
    //                 if (idx !== arr.length-1) {
    //                   const oldId = `p${phraseB.pieceIdx}t${traj.num!-1}`;
    //                   const newId = `p${phraseB.pieceIdx}t${traj.num}`;
    //                   this.reIdAllReps(oldId, newId)
    //                 }
    //               }) 
    //             }
    //             Object.keys(phraseB.chikaris).forEach(key => {
    //               const delta = origDivTime - time;
    //               const newKey = (Number(key) + delta).toFixed(2);
    //               phraseB.chikaris[newKey] = phraseB.chikaris[key];
    //               delete phraseB.chikaris[key];
    //               this.reIdChikari(key, newKey, phraseB, phraseB)
    //             });
    //             Object.keys(phraseA.chikaris).forEach(key => {
    //               if (Number(key) > phraseA.durTot!) {
    //                 const newKey = (Number(key) - phraseA.durTot!);
    //                 phraseB.chikaris[newKey] = phraseA.chikaris[key];
    //                 delete phraseA.chikaris[key];
    //                 this.reIdChikari(key, newKey.toFixed(2), phraseA, phraseB)           
    //               }
    //             })
    //           } else if (i + 1 === tempPIdx && tempTIdx === 0) {
    //             const phraseA = this.piece.phrases[i];
    //             const phraseB = this.piece.phrases[i+1];
    //             const origDivTime = phraseA.startTime! + phraseA.durTot!;
    //             const pATrajs = phraseA.trajectories;
    //             if (pATrajs[pATrajs.length-1].id === 12) {
    //               doNormal = false       
    //               const prevTraj = pATrajs[pATrajs.length-1];
    //               const nextTraj = phraseB.trajectories[0];
    //               prevTraj.durTot -= origDivTime - time;
    //               nextTraj.durTot += origDivTime - time;
    //               phraseA.durTotFromTrajectories();
    //               phraseA.durArrayFromTrajectories();
    //               phraseB.durTotFromTrajectories();
    //               phraseB.durArrayFromTrajectories();
    //               phraseB.assignStartTimes();
    //               this.piece.durTotFromPhrases();
    //               this.piece.durArrayFromPhrases();
    //               this.piece.updateStartTimes();             
    //             } else {
    //               doNormal = false;
    //               const nptObj: {
    //                 id: number,
    //                 durTot: number,
    //                 fundID12: number,
    //                 instrumentation?: string
    //               } = {
    //                 id: 12,
    //                 durTot: time - origDivTime,
    //                 fundID12: this.piece.raga.fundamental
    //               };
    //               if (this.piece.instrumentation) {
    //                 nptObj.instrumentation = this.piece.instrumentation[0];
    //               }
    //               const newPrevTraj = new Trajectory(nptObj);
    //               const nextTraj = phraseB.trajectories[0];
    //               nextTraj.durTot -= time - origDivTime;
    //               phraseA.trajectories
    //               .splice(phraseA.trajectories.length, 0, newPrevTraj);
    //               phraseA.durTotFromTrajectories();
    //               phraseA.durArrayFromTrajectories();
    //               phraseA.assignStartTimes();
    //               phraseA.assignTrajNums();
    //               phraseB.durTotFromTrajectories();
    //               phraseB.durArrayFromTrajectories();
    //               phraseB.assignStartTimes();
    //               this.piece.durTotFromPhrases();
    //               this.piece.durArrayFromPhrases();
    //               this.piece.updateStartTimes();   
    //             }
    //             Object.keys(phraseB.chikaris).forEach(key => {
    //               const delta = time - origDivTime;
    //               if (Number(key) < delta) {
    //                 const num = phraseA.durTot! - (delta - Number(key));
    //                 let newKey = num.toFixed(2);
    //                 phraseA.chikaris[newKey] = phraseB.chikaris[key];
    //                 delete phraseB.chikaris[key];
    //                 this.reIdChikari(key, newKey, phraseB, phraseA);
    //               } else {
    //                 const newKey = (Number(key) - (delta)).toFixed(2);
    //                 phraseB.chikaris[newKey] = phraseB.chikaris[key];
    //                 delete phraseB.chikaris[key];
    //                 this.reIdChikari(key, newKey, phraseB, phraseB)
    //               }
    //             })
    //           }
    //       }
    //       const phraseA = this.piece.phrases[i];
    //       const phraseB = this.piece.phrases[i+1]
    //       if (doNormal) {
    //         const possibleTimes = this.possibleTrajDivs(i);
    //         const finalTime = getClosest(possibleTimes, time);
    //         const ftIdx = possibleTimes.indexOf(finalTime);          
    //         let pIdx, tIdx;
    //         const lenA = phraseA.trajectories.length;
    //         if (ftIdx < lenA) {
    //           pIdx = i;
    //           tIdx = ftIdx
    //         } else {
    //           pIdx = i + 1;
    //           tIdx = Math.round(((ftIdx / lenA) - 1) * lenA);
    //         }
    //         if (pIdx === i) {
    //           if (tIdx < phraseA.trajectories.length-1) {
    //             const ctA = phraseA.trajectories.length - 1 - tIdx;
    //             const ctB = phraseB.trajectories.length;
    //             const transfers = phraseA.trajectories.splice(tIdx+1);
    //             phraseB.trajectories.splice(0, 0, ...transfers);
    //             phraseA.durTotFromTrajectories();
    //             phraseA.durArrayFromTrajectories();
    //             phraseB.durTotFromTrajectories();
    //             phraseB.durArrayFromTrajectories();
    //             phraseB.assignStartTimes();
    //             phraseB.assignTrajNums();
    //             this.piece.durTotFromPhrases();
    //             this.piece.durArrayFromPhrases();
    //             this.piece.updateStartTimes();          
    //             for (let j = ctB-1; j >= 0; j--) {
    //               const oldId = `p${phraseB.pieceIdx}t${j}`;
    //               const newId = `p${phraseB.pieceIdx}t${j + ctA}`;
    //               this.reIdAllReps(oldId, newId)
    //             }
    //             for (let j = ctA-1; j >= 0; j--) {
    //               const oldId = `p${phraseA.pieceIdx}t${tIdx + j + 1}`;
    //               const newId = `p${phraseB.pieceIdx}t${j}`;
    //               this.reIdAllReps(oldId, newId)
    //             }
    //             // fix chikaris
    //             Object.keys(phraseB.chikaris).forEach(key => {
    //               const delta = transfers
    //                 .map(t => t.durTot)
    //                 .reduce((a, b) => a + b, 0);
    //               const newKey = (Number(key) + delta).toFixed(2);
    //               phraseB.chikaris[newKey] = phraseB.chikaris[key];
    //               delete phraseB.chikaris[key];
    //               this.reIdChikari(key, newKey, phraseB, phraseB);    
    //             });
    //             Object.keys(phraseA.chikaris).forEach(key => {
    //               if (Number(key) >= phraseA.durTot!) {
    //                 const obj = phraseA.chikaris[key];
    //                 const newKey = (Number(key) - phraseA.durTot!).toFixed(2);
    //                 delete phraseA.chikaris[key];
    //                 phraseB.chikaris[newKey] = obj;
    //                 this.reIdChikari(key, newKey, phraseA, phraseB);
    //               }
    //             })
    //           }
    //         } else {
    //           const ctB = phraseB.trajectories.length;
    //           const ctA = phraseA.trajectories.length;
    //           const transfers = phraseB.trajectories.splice(0, tIdx+1);
    //           const pATrajs = phraseA.trajectories;
    //           phraseA.trajectories.splice(pATrajs.length, 0, ...transfers);
    //           phraseA.durTotFromTrajectories();
    //           phraseA.durArrayFromTrajectories();
    //           phraseA.assignStartTimes();
    //           phraseA.assignTrajNums();
    //           phraseB.durTotFromTrajectories();
    //           phraseB.durArrayFromTrajectories();
    //           phraseB.assignStartTimes();
    //           phraseB.assignTrajNums();
    //           this.piece.durTotFromPhrases();
    //           this.piece.durArrayFromPhrases();
    //           this.piece.updateStartTimes();            
    //           for (let j = 0; j <= tIdx; j++) {
    //             const oldId = `p${phraseB.pieceIdx}t${j}`;
    //             const newId = `p${phraseA.pieceIdx}t${ctA+j}`;
    //             this.reIdAllReps(oldId, newId);
    //           }
    //           for (let j = tIdx+1; j < ctB; j++) {
    //             const oldId = `p${phraseB.pieceIdx}t${j}`;
    //             const newId = `p${phraseB.pieceIdx}t${j-(tIdx+1)}`;
    //             this.reIdAllReps(oldId, newId);
    //           }
    //           //fix chikaris
    //           Object.keys(phraseB.chikaris).forEach(key => {
    //             const delta = transfers
    //               .map(t => t.durTot)
    //               .reduce((a, b) => a + b, 0);
    //             if (Number(key) < delta) {
    //               const newKey = (phraseA.durTot! - (delta - Number(key)))
    //                 .toFixed(2);
    //               phraseA.chikaris[newKey] = phraseB.chikaris[key];
    //               delete phraseB.chikaris[key];
    //               this.reIdChikari(key, newKey, phraseB, phraseA);
    //             } else {
    //               const newKey = (Number(key) - delta).toFixed(2);
    //               phraseB.chikaris[newKey] = phraseB.chikaris[key];
    //               delete phraseB.chikaris[key];
    //               this.reIdChikari(key, newKey, phraseB, phraseB);
    //             }
    //           })
    //         }
    //         d3Select(`#phraseLine${i}`)
    //           .attr('transform', `translate(${this.codifiedXR!(finalTime)},0)`)
    //           .attr('stroke', 'red')
    //         d3Select(`#overlay__phraseLine${i}`)
    //           .attr('transform', `translate(${this.codifiedXR!(finalTime)},0)`)  
    //       }  
    //       if (this.selectedPhraseDivIdx !== phraseA.pieceIdx) {
    //         this.clearSelectedPhraseDiv();
    //       }    
    //       if (!doNormal) {
    //         d3Select(`#phraseLine${i}`)
    //           .attr('transform', `translate(${this.codifiedXR!(time)},0)`)
    //           .attr('stroke', 'red')
    //         d3Select(`#overlay__phraseLine${i}`)
    //           .attr('transform', `translate(${this.codifiedXR!(time)},0)`)
    //       }
    //       this.svg.style('cursor', 'auto');
    //       this.selectedPhraseDivIdx = i;
    //       const realPhraseStartIdx = i + 1;
    //       if (this.piece.sectionStarts!.includes(realPhraseStartIdx)) {
    //         tsp.phraseDivType = 'section';
    //       } else {
    //         tsp.phraseDivType = 'phrase';
    //       }
    //       this.clearSelectedTraj();
    //       this.clearSelectedChikari();
    //       this.clearTrajSelectPanel();
    //       tsp.showPhraseRadio = true;  
    //     } else {
    //       this.selectedPhraseDivIdx = i;
    //       const realPhraseStartIdx = i + 1;
    //       if (this.piece.sectionStarts!.includes(realPhraseStartIdx)) {
    //         tsp.phraseDivType = 'section';
    //       } else {
    //         tsp.phraseDivType = 'phrase';
    //       }
    //       this.clearSelectedTraj();
    //       this.clearSelectedChikari();
    //       this.clearTrajSelectPanel();
    //       tsp.showPhraseRadio = true; 
    //       d3Select(`#phraseLine${i}`)
    //         .attr('stroke', 'red')
    //     }   
    //   }
    // },
    
    // movePhraseDivs() {
    //   this.piece.phrases.forEach((phrase, i) => {
    //     const endTime = phrase.startTime! + phrase.durTot!;
    //     d3Select(`#phraseLine${i}`)
    //       .transition().duration(this.transitionTime)
    //       .attr('transform', `translate(${this.codifiedXR!(endTime)},0)`)
    //   })
    // },
    
    reIdChikari(
        key: string, 
        newKey: string, 
        oldPhrase: Phrase, 
        newPhrase: Phrase
        ) {
      const oldSec = Math.floor(Number(key));
      const oldDec = (Number(key) % 1).toFixed(2).toString().slice(2);
      const oldId = `p${oldPhrase.pieceIdx}_${oldSec}_${oldDec}`;
      const newSec = Math.floor(Number(newKey));
      const newDec = (Number(newKey) % 1).toFixed(2).toString().slice(2);
      const newId = `p${newPhrase.pieceIdx}_${newSec}_${newDec}`;
      d3Select(`#circle__${oldId}`).attr('id', `circle__${newId}`);
      d3Select(`#${oldId}`).attr('id', newId);  
    },
    
    reIdAllReps(oldId: string, newId: string, verbose=false) {
      if (verbose) {
        console.log(`reIdAllReps: ${oldId} -> ${newId}`);
      }
      // given old and new ids, change the ids of all svg representations 
      d3Select(`#${oldId}`).attr('id', newId);
      d3Select(`#overlay__${oldId}`).attr('id', `overlay__${newId}`);
      d3Select(`#articulations__${oldId}`)
        .attr('id', `articulations__${newId}`);
      d3Select(`#vowel${oldId}`).attr('id', `vowel${newId}`);
      d3Select(`#endConsonant${oldId}`).attr('id', `endConsonant${newId}`);
      // since trajs have already been updated, grab via new Id
      const pIdx = Number(newId.split('t')[0].slice(1));
      const tIdx = Number(newId.split('t')[1]);
      const phrase = this.piece.phrases[pIdx];
      const traj = phrase.trajectories[tIdx];
      if (verbose) console.log(traj)
      let hOffCt = 0;
      let hOnCt = 0;
      let slideCt = 0;
      Object.keys(traj.articulations).forEach(key => {
        const art = traj.articulations[key];
        if (art.name === 'pluck') {
          d3Select(`#pluck${oldId}`).attr('id', `pluck${newId}`);
        } else if (art.name === 'hammer-off') {
          d3Select(`#hammeroff${oldId}i${hOffCt}`)
            .attr('id', `hammeroff${newId}i${hOffCt}`);
          hOffCt++;
        } else if (art.name === 'hammer-on') {
          d3Select(`#hammeron${oldId}i${hOnCt}`)
            .attr('id', `hammeron${newId}i${hOnCt}`);
          hOnCt++;
        } else if (art.name === 'slide') {
          d3Select(`#slide${oldId}i${slideCt}`)
            .attr('id', `slide${newId}i${slideCt}`);
          slideCt++;
        } else if (art.name === 'dampen') {
          d3Select(`#dampen${oldId}`).attr('id', `dampen${newId}`);
        }
      })
    },
    
    possibleTrajDivs(pIdx?: number) {
      if (pIdx !== undefined) {
        // returns times on left and right of phrase div (so, current phrase 
        // and next phrase)
        const phraseA = this.piece.phrases[pIdx];
        const phraseB = this.piece.phrases[pIdx+1];
        // get all trajs except first one, and collect all start times
        const stA = phraseA.startTime!;
        const stB = phraseB.startTime!;
        const divs = phraseA.trajectories.slice(1).map(t => stA + t.startTime!);
        divs.push(...phraseB.trajectories.map(t => stB + t.startTime!));
        return divs
      } else {
        const divs: number[] = [];
        this.piece.phrases.forEach(phrase => {
          const st = phrase.startTime!;
          divs.push(...phrase.trajectories.slice(1).map(t => st + t.startTime!))
        });
        return divs
      }
    },
    
    mouseUpUpdateLoop() {
      const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      if (this.loop) {
        ap.loop = true;
        ap.loopStart = this.regionStartTime;
        ap.loopEnd = this.regionEndTime;
        if (ap.sourceNode) {
          ap.sourceNode.loopStart = this.regionStartTime;
          ap.sourceNode.loopEnd = this.regionEndTime;
        }
      } else {
        ap.loop = false;
        ap.loopStart = undefined;
        ap.loopEnd = undefined;
      }
      // also, update stretchBuffer
    },

    updateLoop(e?: MouseEvent) {
      if (e && e.clientX === 0) e.preventDefault(); // stops spacebar from 
      // checking box
    },

    preventSpaceToggle(e: MouseEvent) {
      if (e && e.clientX === 0) e.preventDefault();
    },
 
    async savePiece() {
      this.piece.phrases.forEach(phrase => {
        phrase.consolidateSilentTrajs()
      });
      this.piece.meters.forEach(meter => {
        meter.resetTempo();
      })
      this.cleanPhrases();
      this.piece.sectionStarts = [...new Set(this.piece.sectionStarts)]
      const result = await savePiece(this.piece);
      this.dateModified = new Date(result.dateModified);
      this.unsavedChanges = false;
    },

    // addFixedTraj() {
    //   const tsp = this.$refs.trajSelectPanel as typeof TrajSelectPanel;
    //   this.unsavedChanges = true;
    //   this.trajTimePts.sort((a, b) => a.time - b.time);
    //   const logSGLines = this.visibleSargam.map(s => Math.log2(s));
    //   const lf = this.trajTimePts[0].logFreq;
    //   const pitch = this.visPitches[logSGLines.indexOf(lf)];
    //   const pitchJSON = pitch.toJSON();
    //   pitchJSON.fundamental = this.piece.raga.fundamental;
    //   const endPitch = new Pitch(pitchJSON);
    //   const firstPitch = new Pitch(pitch.toJSON());
    //   // const endPitch = new Pitch(pitch.)
    //   const pitches = [firstPitch, endPitch];
    //   const durTot = this.trajTimePts[1].time - this.trajTimePts[0].time;
    //   const ntObj: {
    //     pitches: Pitch[],
    //     durTot: number,
    //     durArray: number[],
    //     articulations?: {[key: string]: Articulation},
    //     vowel?: string,
    //     vowelEngTrans?: string,
    //     vowelHindi?: string,
    //     vowelIPA?: string,
    //     instrumentation?: string
    //   } = {
    //     pitches: pitches,
    //     durTot: durTot,
    //     durArray: [1],
    //     articulations: undefined
    //   };
    //   if (this.piece.instrumentation) {
    //     ntObj.instrumentation = this.piece.instrumentation[0];
    //     if (['Vocal (M)', 'Vocal (F)'].includes(ntObj.instrumentation)) {
    //       ntObj.articulations = {};
    //       ntObj.vowel = 'a';
    //       ntObj.vowelEngTrans = 'a';
    //       ntObj.vowelHindi = "अ";
    //       ntObj.vowelIPA = 'ə';
    //     } else if (ntObj.instrumentation === 'Sarangi') {
    //       ntObj.articulations = {};
    //     }
    //   }
    //   const newTraj = new Trajectory(ntObj);
    //   const times = this.trajTimePts.map(t => t.time);
    //   const pIdx = this.trajTimePts[0].pIdx;
    //   const tIdx = this.trajTimePts[0].tIdx;
    //   const phrase = this.piece.phrases[pIdx];
    //   const silentTraj = phrase.trajectories[tIdx];
    //   const st = phrase.startTime! + silentTraj.startTime!;
    //   const startsEqual = Math.abs(times[0] - st) < 0.000001;
    //   const endA = times[times.length - 1];
    //   const endB = st + silentTraj.durTot;
    //   const endsEqual = Math.abs(endA - endB) < 0.000001;
    //   if (startsEqual && endsEqual) { // if taking up entire silent traj
    //     phrase.trajectories[tIdx] = newTraj;
    //     phrase.reset();
    //     const vowelIdxs = phrase.firstTrajIdxs();
    //     this.codifiedAddTraj(newTraj, phrase.startTime!, vowelIdxs);
    //     this.selectedTraj = newTraj;
    //     this.selectedTrajs = [this.selectedTraj];
    //     this.selectedTrajID = `p${newTraj.phraseIdx}t${newTraj.num}`;
    //     d3Select(`#${this.selectedTrajID}`)
    //       .attr('stroke', this.selTrajColor)
    //     d3Select(`#overlay__${this.selectedTrajID}`)
    //       .style('cursor', 'auto')
    //     d3Select(`#dampen${this.selectedTrajID}`)
    //       .attr('fill', this.selTrajColor)
    //     this.setNewSeries = false;
    //     this.trajTimePts = [];
    //     this.svg.style('cursor', 'auto');
    //     d3SelectAll('.newSeriesDot').remove();
    //     this.addAllDragDots();
    //     tsp.selectedIdx = this.selectedTraj.id;
    //     tsp.parentSelected = true;
    //     tsp.slope = Math.log2(this.selectedTraj.slope);
    //     const arts = this.selectedTraj.articulations;
    //     const c1 = arts[0] && arts[0].name === 'pluck';
    //     const c2 = arts['0.00'] && arts['0.00'].name === 'pluck';
    //     if (c1 || c2) {
    //       tsp.pluckBool = true
    //     } else {
    //       tsp.pluckBool = false
    //     } 
    //   } else if (endsEqual) {
    //     silentTraj.durTot = silentTraj.durTot - durTot;
    //     phrase.trajectories.splice(tIdx + 1, 0, newTraj);
    //     phrase.reset();
    //     const vowelIdxs = phrase.firstTrajIdxs();
    //     this.codifiedAddTraj(newTraj, phrase.startTime!, vowelIdxs);
    //     this.selectedTraj = newTraj;
    //     this.selectedTrajs = [this.selectedTraj];
    //     this.selectedTrajID = `p${newTraj.phraseIdx}t${newTraj.num}`;
    //     d3Select(`#${this.selectedTrajID}`)
    //       .attr('stroke', this.selTrajColor)
    //     d3Select(`#overlay__${this.selectedTrajID}`)
    //       .style('cursor', 'auto')
    //     d3Select(`#dampen${this.selectedTrajID}`)
    //       .attr('fill', this.selTrajColor)
    //     this.setNewSeries = false;
    //     this.trajTimePts = [];
    //     this.svg.style('cursor', 'auto');
    //     d3SelectAll('.newSeriesDot').remove();
    //     this.addAllDragDots();
    //     tsp.selectedIdx = this.selectedTraj.id;
    //     tsp.parentSelected = true;
    //     tsp.slope = Math.log2(this.selectedTraj.slope);
    //     const arts = this.selectedTraj.articulations;
    //     const c1 = arts[0] && arts[0].name === 'pluck';
    //     const c2 = arts['0.00'] && arts['0.00'].name === 'pluck';
    //     if (c1 || c2) {
    //       tsp.pluckBool = true
    //     } else {
    //       tsp.pluckBool = false
    //     } 
    //   } else {
    //     if (startsEqual) {
    //       silentTraj.durTot = silentTraj.durTot - durTot;
    //       phrase.trajectories.splice(tIdx, 0, newTraj);
    //       phrase.reset();
    //       this.trajTimePts[1].tIdx += 1;
    //     } else {
    //       const firstDur = times[0] - st;
    //       const lastDur = st + silentTraj.durTot - times[times.length - 1];
    //       silentTraj.durTot = firstDur;
    //       const lstObj: {
    //         id: number,
    //         pitches: Pitch[],
    //         durTot: number,
    //         fundID12: number,
    //         instrumentation?: string
    //       } = {
    //         id: 12,
    //         pitches: [],
    //         durTot: lastDur,
    //         fundID12: this.piece.raga.fundamental
    //       };
    //       if (this.piece.instrumentation) {
    //         lstObj.instrumentation = this.piece.instrumentation[0];
    //       }
    //       const lastSilentTraj = new Trajectory(lstObj);
    //       phrase.trajectories.splice(tIdx + 1, 0, newTraj);
    //       phrase.trajectories.splice(tIdx + 2, 0, lastSilentTraj);
    //       phrase.reset();
    //       this.trajTimePts[1].tIdx += 2;
    //     }
    //     const vowelIdxs = phrase.firstTrajIdxs();
    //     this.codifiedAddTraj(newTraj, phrase.startTime!, vowelIdxs);
    //     this.trajTimePts.splice(0, 1);
    //     if (!this.audioDBDoc) this.extendDurTot();
    //     d3SelectAll('.newSeriesDot').remove();
    //     this.phraseG 
    //       .append('circle')
    //       .classed('newSeriesDot', true)
    //       .attr('cx', this.codifiedXR!(this.trajTimePts[0].time))
    //       .attr('cy', this.codifiedYR!(this.trajTimePts[0].logFreq))
    //       .attr('r', 4)
    //       .style('fill', '#7300e6') 
    //   };
      
    //   this.resetSargam();
    //   this.resetBols();
    //   const vowelIdxs = phrase.firstTrajIdxs();
    // },
    
    clearAll(regionToo = true) {
      const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      const mc = ap.$refs.meterControls as typeof MeterControls;
      mc.prevMeter = false;
      mc.attachToPrevMeter = false;
      this.clearSelectedChikari();
      this.clearSelectedTraj();
      this.clearTrajSelectPanel();
      this.clearSelectedPhraseDiv();
      if (this.setChikari) {
        this.setChikari = false;
        this.svg.style('cursor', 'auto')
      }
      if (this.setNewTraj) {
        this.setNewTraj = false;
        this.trajTimePts = [];
        this.svg.style('cursor', 'auto');
        d3SelectAll(`.newTrajDot`).remove()
      }
      if (this.setNewSeries) {
        this.setNewSeries = false;
        d3SelectAll('.newSeriesDot').remove();
      }
      if (this.setNewPhraseDiv) this.setNewPhraseDiv = false;
      if (this.regionG && regionToo) {
        this.regionG.remove();
        this.regionG = undefined;
        this.regionStartTime = 0;
        this.regionEndTime = this.durTot;
        this.mouseUpUpdateLoop(); 
        if (this.audioDBDoc) ap.updateStretchBuf();
        ap.stretchable = false;
      }
      if (this.setNewRegion) this.setNewRegion = false;
      this.meterMode = false;
      d3SelectAll('.metricGrid')
        .filter((d, i, nodes) => !d3Select(nodes[i]).classed('overlay'))
        .attr('stroke', this.meterColor)
      this.selMeter = undefined;
      const meterControls = ap.$refs.meterControls;
      meterControls.meter = undefined;
      meterControls.meterSelected = false;
      this.insertPulses = [];
      this.insertPulseMode = false;
      meterControls.insertPulseMode = false;
      d3SelectAll('.insertPulse').remove();
      this.contextMenuClosed = true;
      this.autoWindowOpen = false;
      this.svg.style('cursor', 'auto');
      d3Select('#selBox').remove();
    },

    handleKeyup(e: KeyboardEvent) {
      if (e.key === 'Shift') this.shifted = false;
      if (e.key === 'Meta' && this.browser.os!.includes('Mac OS')) {
        this.metad = false
      }
      if (e.key === 'Control' && this.browser.os!.includes('Windows')) {
        this.metad = false
      }
    },

    handleKeydown(e: KeyboardEvent) {
      if (this.selectedMode === EditorMode.Trajectory || this.selectedTraj) {
        const tsp = this.$refs.trajSelectPanel as typeof TrajSelectPanel;
        const keyNums = tsp.kNumsFiltered;
        if (keyNums.includes(e.key)) {
          tsp.selectIcon(keyNums.indexOf(e.key))
        }
      }
    },

    // handleKeydown(e: KeyboardEvent) {
    //   const tsp = this.$refs.trajSelectPanel as typeof TrajSelectPanel;
    //   const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
    //   if (e.key === ' ') {
    //     ap.togglePlay()
    //   } else if (e.key === 'Meta' && this.browser.os!.includes('Mac OS')) {
    //     this.metad = true
    //   } else if (e.key === 'Control' && this.browser.os!.includes('Windows')) {
    //     this.metad = true
    //   } else if (e.key === 'Escape') {
    //     e.preventDefault();
    //     this.clearAll();
    //     this.svg.style('cursor', 'auto');
    //     // region speed settings
    //     if (ap.regionSpeedOn) {
    //       ap.regionSpeed = 0;
    //       ap.regionSpeedOn = false;
    //       ap.toggleRegionSpeed();
    //     }
    //   } else if (e.key === 'Backspace' && this.editable === true) {
    //     if (this.selectedChikariID) {
    //       this.unsavedChanges = true;
    //       const splitArr = this.selectedChikariID!.split('_')!;
    //       const pIdx = Number(splitArr[0]!.slice(1)!);
    //       const key = splitArr[1] + '.' + splitArr[2];
    //       delete this.piece.phrases[pIdx].chikaris[key];
    //       d3Select(`#${this.selectedChikariID}`).remove()
    //       d3Select(`#circle__${this.selectedChikariID}`).remove()
    //       this.selectedChikariID = undefined;
    //     } else if (this.selectedTrajID) {
    //       this.unsavedChanges = true;
    //       this.deleteTraj(this.selectedTrajID);
    //       this.selectedTrajID = undefined;
    //       this.clearTrajSelectPanel();
    //       d3SelectAll('.dragDots').remove();
    //       this.selectedTrajs = [];
    //     } else if (this.selectedTrajs.length > 1) {
    //       this.unsavedChanges = true;
    //       this.selectedTrajs.forEach(traj => {
    //         const trajID = `p${traj.phraseIdx}t${traj.num}`;
    //         this.deleteTraj(trajID);
    //         this.clearTrajSelectPanel();
    //         this.selectedTrajs = [];
    //       })
    //     } else if (!(this.selectedPhraseDivIdx === undefined)) {
    //       this.unsavedChanges = true;
    //       const phraseA = this.piece.phrases[this.selectedPhraseDivIdx];
    //       const initPhraseADur = phraseA.durTot!;
    //       const phraseB = this.piece.phrases[this.selectedPhraseDivIdx+1];
    //       const ctB = phraseB.trajectories.length;
    //       const ctA = phraseA.trajectories.length;
    //       phraseA.trajectories.splice(ctA, 0, ...phraseB.trajectories);
    //       this.piece.phrases.splice(this.selectedPhraseDivIdx+1, 1);
    //       phraseA.durTotFromTrajectories();
    //       phraseA.durArrayFromTrajectories();
    //       phraseA.assignStartTimes();
    //       phraseA.assignTrajNums();
    //       this.piece.durTotFromPhrases();
    //       this.piece.durArrayFromPhrases();
    //       this.piece.updateStartTimes();
    //       for (let j=0; j < ctB; j++) {
    //         const oldId = `p${phraseB.pieceIdx}t${j}`;
    //         const newId = `p${phraseA.pieceIdx}t${j + ctA}`;
    //         this.reIdAllReps(oldId, newId)
    //       }
    //       d3Select(`#phraseLine${this.selectedPhraseDivIdx}`).remove();
    //       d3Select(`#overlay__phraseLine${this.selectedPhraseDivIdx}`)
    //         .remove();
    //         const idx = this.selectedPhraseDivIdx;
    //       for (let j = idx + 1; j < this.piece.phrases.length; j++) {
    //         d3Select(`#phraseLine${j}`).attr('id', `phraseLine${j-1}`);
    //         d3Select(`#overlay__phraseLine${j}`)
    //           .attr('id', `overlay__phraseLine${j-1}`);
    //         d3Select(`#overlay__phraseLine${j-1}`).on('.drag', null);
    //         const drag = () => {
    //           return d3Drag()
    //             .on('start', this.phraseDivDragStart(j-1))
    //             .on('drag', this.phraseDivDragDragging(j-1))
    //             .on('end', this.phraseDivDragEnd(j-1))
    //         };
    //         if (this.editable) {
    //           d3Select(`#overlay__phraseLine${j-1}`)
    //             .call(drag())
    //         }  
    //       }
    //       // fix chikaris
    //       Object.keys(phraseB.chikaris).forEach(key => {
    //         const newKey = (initPhraseADur + Number(key)).toFixed(2);
    //         phraseA.chikaris[newKey] = phraseB.chikaris[key];
    //         delete phraseB.chikaris[key];
    //         const oldSec = Math.floor(Number(key));
    //         const oldDec = (Number(key) % 1).toFixed(2).toString().slice(2);
    //         const oldId = `p${phraseB.pieceIdx}_${oldSec}_${oldDec}`;
    //         const newSec = Math.floor(Number(newKey));
    //         const newDec = (Number(newKey) % 1).toFixed(2).toString().slice(2);
    //         const newId = `p${phraseA.pieceIdx}_${newSec}_${newDec}`;
    //         d3Select(`#circle__${oldId}`).attr('id', `circle__${newId}`);
    //         d3Select(`#${oldId}`).attr('id', newId);          
    //       })
    //       // if selectedPhraseDivIdx - 1 is less than any of the items in 
    //       // piece.sectionStarts, then subtract one from those items in 
    //       // piece.sectionStarts
    //       const sectionStart = this.selectedPhraseDivIdx + 1;
    //       const ssIdx = this.piece.sectionStarts!.indexOf(sectionStart);
    //       console.log(ssIdx)
    //       if (ssIdx !== -1) {
    //         this.piece.sectionStarts!.splice(ssIdx, 1);
    //         this.piece.sectionCategorization!.splice(ssIdx, 1);
    //       }
    //       this.piece.sectionStarts = this.piece.sectionStarts!.map((item) => {
    //         if (item > this.selectedPhraseDivIdx! + 1) {
    //           return item - 1;
    //         } else {
    //           return item;
    //         }
    //       })
    //       this.selectedPhraseDivIdx = undefined;
    //       this.piece.phrases.forEach(phrase => {
    //         phrase.consolidateSilentTrajs()
    //       });
    //       this.cleanPhrases();
    //     } else if (this.meterMode && this.selMeter) {
    //       const meterControls = ap.$refs.meterControls;
    //       meterControls.removeMeter(this.selMeter.uniqueId);
    //     }
    //   } else if (e.key === 'c' && this.editable) {
    //     console.log('c down')
    //     if (this.metad) {
    //       console.log('and also it was metad')
    //       this.clipboardTrajs = this.selectedTrajs
    //     } else {
    //       this.setChikari = true;
    //       this.svg.style('cursor', 'cell')
    //       if (this.setNewTraj) {
    //         d3SelectAll('.newTrajDot').remove();
    //         this.setNewTraj = false;
    //       }
    //       if (this.setNewPhraseDiv) this.setNewPhraseDiv = false;
    //       if (this.setNewSeries) {
    //         this.setNewSeries = false;
    //         d3SelectAll('.newSeriesDot').remove();
    //       }
    //     }
    //   } else if (e.key === 't' && this.setNewTraj === false && this.editable) {
    //     this.clearSelectedTraj();
    //     this.clearTrajSelectPanel();
    //     this.setNewTraj = true;
    //     this.svg.style('cursor', 'crosshair');
    //     this.trajTimePts = [];
    //     if (this.setChikari) this.setChikari = false;
    //     if (this.setNewPhraseDiv) this.setNewPhraseDiv = false;
    //     if (this.setNewSeries) {
    //       this.setNewSeries = false;
    //       d3SelectAll('.newSeriesDot').remove();
    //     }
    //     tsp.showTrajChecks = true;
    //     tsp.showVowelTrajCheck = true;
    //   } else if ( e.key === 'p' && 
    //               this.setNewPhraseDiv === false && 
    //               this.editable && 
    //               !this.selectedTraj) {
    //     this.clearSelectedTraj();
    //     this.clearTrajSelectPanel();
    //     this.clearSelectedPhraseDiv();
    //     if (this.setChikari) this.setChikari = false;
    //     if (this.setNewTraj) {
    //       d3SelectAll('.newTrajDot').remove();
    //       this.setNewTraj = false;
    //     }
    //     if (this.setNewSeries) {
    //       this.setNewSeries = false;
    //       d3SelectAll('.newSeriesDot').remove();
    //     }
    //     this.setNewPhraseDiv = true;
    //     this.svg.style('cursor', 's-resize');
    //   } else if (e.key === 's' && (!this.setNewSeries) && this.editable) {
    //     this.setNewSeries = true;
    //     this.clearSelectedTraj();
    //     this.clearTrajSelectPanel();
    //     this.clearSelectedPhraseDiv();
    //     if (this.setChikari) this.setChikari = false;
    //     if (this.setNewTraj) {
    //       d3SelectAll('.newTrajDot').remove();
    //       this.setNewTraj = false;
    //     }
    //     if (this.setNewPhraseDiv) this.setNewPhraseDiv = false;
    //     this.svg.style('cursor', 'crosshair');
    //     this.trajTimePts = [];
    //   } 
    //   //   else if (e.key === 'Tab') {
    //   //   e.preventDefault();
    //   //   this.shifted ? this.moveToPrevPhrase() : this.moveToNextPhrase();
    //   // }
    //    else if (e.key === 'Shift') {
    //     this.shifted = true;
    //   } else if (e.key === '[') {
    //     this.moveToPrevPhrase()
    //   } else if (e.key === ']') {
    //     this.moveToNextPhrase()
    //   } else if (e.key === 'r') {
    //     this.clearAll();
    //     this.setNewRegion = true;

    //   } else if (e.key === 'v' && this.metad && this.editable) {
    //     if (this.clipboardTrajs.length > 0) this.pasteTrajs()
    //   } else if (e.key === 'm' || e.key === 'M') {
    //     if (this.shifted) {
    //       this.clearAll();
    //       this.svg.style('cursor', 's-resize');
    //       this.insertPulseMode = true;
    //       const audioPlayer = this.$refs.audioPlayer;
    //       const meterControls = ap.$refs.meterControls;
    //       meterControls.insertPulseMode = true;
    //       meterControls.prevMeter = false;
    //       if (ap.showMeterControls === false) {
    //         ap.toggleMeterControls();
    //       }
    //       d3SelectAll('.phrase')
    //         .style('cursor', 's-resize');
    //       d3SelectAll('.articulation')
    //         .selectAll('*')
    //         .style('cursor', 's-resize');
    //     } else {
    //       this.clearAll();
    //       this.meterMode = true;
    //       this.svg.style('cursor', 'crosshair');
    //       d3SelectAll('.phrase')
    //         .style('cursor', 'crosshair');
    //       d3SelectAll('.articulation')
    //         .selectAll('*')
    //         .style('cursor', 'crosshair');
    //     }
    //   }
    //   if (this.setNewTraj || this.selectedTraj) {
    //     const keyNums = tsp.kNumsFiltered;
    //     if (keyNums.includes(e.key)) {
    //       tsp.selectIcon(keyNums.indexOf(e.key))
    //     }
    //   }
    //   if (this.selectedTraj) {
        
    //     const inst = this.piece.instrumentation[0];
    //     const vox = ['Vocal (M)', 'Vocal (F)'];
    //     if (e.key === 'p' && !vox.includes(inst)) { 
    //       tsp.pluckBool = !tsp.pluckBool;
    //       tsp.updateBool();
    //     } else if (e.key === 'd') {
    //       tsp.dampen = !tsp.dampen;
    //       tsp.updateDampen();
    //     }
    //   }
    //   if (this.selectedChikariID) {
    //     if (e.key === 'ArrowLeft') {
    //       if (this.editable) this.adjustChikari(true)
    //     } else if (e.key === 'ArrowRight') {
    //       if (this.editable) this.adjustChikari(false)
    //     }
    //   }
    //   if (this.selMeter !== undefined) {
    //     if (e.key === 'ArrowLeft') {
    //       if (this.editable) this.adjustMeter(true)
    //     } else if (e.key === 'ArrowRight') {
    //       if (this.editable) this.adjustMeter(false)
    //     }
    //   }

    // },

    shrink() {
      const x = this.yAxWidth;
      const y = this.xAxHeight;
      d3Select('.spectrogram')
        .attr('transform', `translate(${x},${y}) scale(0.5, 1)`)
    },

    async addSpectrogram(
        leftTime?: number, 
        currentXK?: number, 
        scalingParam?: number, 
        yProp?: number
        ) {
      if (false) {
      } else {
        try {
          this.numSpecs = await getNumberOfSpectrograms(this.piece.audioID!);
        } catch (err) {
          console.error(err)
        }      
        this.imgs = [];
        for (let i = 0; i < this.numSpecs; i++) {
          const dir = 'https://swara.studio/spectrograms/';
          const url = dir + this.piece.audioID + '/0/' + i + '.webp';
          const img = new Image();
          img.src = url + '?version=1';
          this.imgs.push(img)
        }
        this.loadedImgs = 0;
        this.imgs.forEach(img => {
          img.onload = () => {
            this.loadedImgs++;
            if (this.loadedImgs === this.numSpecs) {
              if (this.imgs.every(img => img.complete)) {
                this.setSpectrogram(leftTime, currentXK, scalingParam, yProp);
              } else {
                console.log('not all loaded')
              }
            }
          }
        })
      }  
    },

    setSpectrogram(
        leftTime?: number, 
        currentXK?: number, 
        scalingParam?: number, 
        yProp?: number
        ) {
      this.totNaturalWidth = 0
      const rect = this.rect();
      const height = rect.height - this.xAxHeight;
      const unscaledWidths: number[] = []
      this.imgs.forEach(img => {
        this.totNaturalWidth += img.naturalWidth;
        const num = height * img.naturalWidth / img.naturalHeight;
        unscaledWidths.push(num)
      });
      this.cumulativeWidths = [0].concat(unscaledWidths
        .map(cumsum()).slice(0, unscaledWidths.length - 1))
      const ratio = this.totNaturalWidth / this.imgs[0].naturalHeight;
      this.unscaledWidth = height * ratio;
      const realWidth = rect.width - this.yAxWidth;
      this.desiredWidth = realWidth * this.initXScale;
      this.xScale = this.desiredWidth / this.unscaledWidth;
      const realHeight = rect.height - this.xAxHeight;
      this.desiredHeight = realHeight * this.initYScale;
      this.yScale = this.desiredHeight / height;
      this.specBox = this.svg.insert('g', 'defs')
        .attr('clip-path', 'url(#clip)');
      this.imgs.forEach((img, i) => {
        const imgPortion = img.naturalWidth / this.totNaturalWidth;
        const unscaledWidth = this.unscaledWidth * imgPortion;
        const x = this.yAxWidth + this.cumulativeWidths[i];
        const y = this.yr()(Math.log2(this.freqMax));
        const xS = this.xScale;
        const yS = this.yScale;
        this.specBox.append('image')
          .attr('class', `spectrogram img${i}`)
          .attr('xlink:href', this.imgs[i].src)
          .attr('width', unscaledWidth)
          .attr('height', height)
          .attr('transform', `translate(${x},${y}) scale(${xS},${yS})`)
          .style('opacity', this.spectrogramOpacity);
      });
      if (leftTime !== undefined && currentXK !== undefined && 
          scalingParam !== undefined && yProp !== undefined) {
        this.scaleAndMoveToTime(currentXK, leftTime, scalingParam, yProp)
        // this.moveToTime(leftTime);
        this.leftTime = leftTime;
      }
    },

    redrawSpectrogram(instant=false) {
      const rect = this.rect();
      const height = rect.height - this.xAxHeight;
      this.desiredWidth = (rect.width - this.yAxWidth) * this.tx!().k;
      this.xScale = this.desiredWidth / this.unscaledWidth;
      this.desiredHeight = height * this.ty!().k;
      this.yScale = this.desiredHeight / height;
      if (this.loadedImgs === this.numSpecs) {
        this.imgs.forEach((img, i) => {
          const propWidth = this.totNaturalWidth * height / img.naturalHeight;
          const time = this.durTot * this.cumulativeWidths[i] / propWidth;
          const x = this.xr()(time);
          const y = this.yr()(Math.log2(this.freqMax));
          const xS = this.xScale;
          const yS = this.yScale
          d3Select(`.spectrogram.img${i}`)
            .transition()
            .duration(instant ? 0 : this.transitionTime)
            .ease(d3EaseQuadInOut)
            .attr('transform', `translate(${x}, ${y}) scale(${xS}, ${yS})`)
        })
      }
    },

    async getPieceFromJson(piece: Piece, fundamental: number) {
      if (fundamental) piece.raga.fundamental = fundamental;
      const rsRes = await getRaagRule(piece.raga.name);
      piece.raga.ruleSet = rsRes.rules;
      piece.raga = new Raga(piece.raga);
      if (piece.phraseGrid === undefined) {
        piece.phraseGrid = [piece.phrases];
        while (piece.phraseGrid.length < piece.instrumentation.length) {
          piece.phraseGrid.push([]);
        }
      }
      piece.phraseGrid.forEach((phrases, instIdx) => {
        phrases.forEach(phrase => {
          let pt = phrase.trajectoryGrid ?
                  phrase.trajectoryGrid[0] : 
                  phrase.trajectories;
          pt.forEach(traj => {
            traj.pitches = traj.pitches.map(pitch => {
              pitch.fundamental = piece.raga.fundamental;
              // convert to pitch ratio format
              pitch.ratios = piece.raga.stratifiedRatios;
              return new Pitch(pitch)
            });
            const artKeys = Object.keys(traj.articulations);
            const artEntries = artKeys.map(key => traj.articulations[key]);
            const artObj: { [key: string]: Articulation } = {};
            artKeys.forEach((key, i) => {
              artObj[key] = new Articulation(artEntries[i]);
            });
            traj.articulations = artObj;
            if (traj.id === 12 && traj.fundID12 !== piece.raga.fundamental) {
              traj.fundID12 = piece.raga.fundamental
            }
            if (traj.id === 12 && Object.keys(traj.articulations).length > 0) {
              traj.articulations = {};
            }
            if (piece.instrumentation) {
              traj.instrumentation = piece.instrumentation[instIdx];
            }
            const vox = ['Vocal (M)', 'Vocal (F)'];
            if (vox.includes(traj.instrumentation)) {
              if (traj.vowel === undefined && traj.id !== 12) {
                traj.vowel = 'a';
              }
            }
          });
          if (phrase.trajectoryGrid === undefined) {
            phrase.trajectoryGrid = [];
          }
          phrase.trajectoryGrid[0] = pt.map(traj => {
            return new Trajectory(traj)
          });
          if (phrase.groupsGrid !== undefined) {
            phrase.groupsGrid.forEach((groups, ggIdx) => {
              groups.forEach((group, gIdx) => {
                group.trajectories.forEach((traj, idx) => {
                  const tIdx = traj.num!;
                  const realTraj = phrase.trajectoryGrid[0][tIdx];
                  group.trajectories[idx] = realTraj;
                })
                groups[gIdx] = new Group(group)
              })
            })
          }
          const chikariKeys = Object.keys(phrase.chikaris);
          const chikariEntries = chikariKeys.map(key => phrase.chikaris[key]);
          const chikariObj: { [key: string]: Chikari } = {};
          chikariKeys.forEach((key, i) => {
            chikariObj[key] = new Chikari(chikariEntries[i])
          })
          phrase.chikaris = chikariObj;
          if (piece.instrumentation) {
            phrase.instrumentation = piece.instrumentation;
          }
        });
      });
      if (piece.phraseGrid !== undefined) {
        // piece.phraseGrid.forEach((phrases) => {
        //   phrases = phrases.map(phrase => new Phrase(phrase));
        // })
        piece.phraseGrid = piece.phraseGrid.map(phrases => {
          return phrases.map(phrase => new Phrase(phrase))
        })
      } else {
        piece.phrases = piece.phrases.map(phrase => new Phrase(phrase));
      }
      if (piece.meters) {
        piece.meters = piece.meters.map(meter => new Meter(meter))
      }
      this.piece = new Piece(piece);
      this.dateModified = new Date(this.piece.dateModified);
      this.fixTrajs();
      this.piece.phrases.forEach(phrase => {
        phrase.consolidateSilentTrajs()
      });
      this.piece.durArrayFromPhrases();
      if (this.piece.durTot !== this.durTot) {
        this.piece.setDurTot(this.durTot)
      }
      this.piece.sectionStarts = [...new Set(this.piece.sectionStarts)];
    },

    fixTrajs() {
      // why are they getting named articulation slide ?
      this.piece.phrases.forEach(phrase => {
        phrase.trajectories.forEach((traj) => {
          const arts = traj.articulations;
          const c1 = arts[0] && arts[0].name === 'slide';
          const c2 = arts['0.00'] && arts['0.00'].name === 'slide';
          if (c1 || c2) {
            traj.articulations['0.00'].name = 'pluck'
          }
        })
      })
    },

    resize() {
      const diff = Math.abs(this.oldHeight! - window.innerHeight);
      if (diff > 53) {
        console.log('changed real height')
        this.resizeHeight();
      }

      const rect = this.rect();
      this.svg
        .attr('viewBox', [0, 0, rect.width, rect.height])
      this.x!.range([this.yAxWidth, rect.width])
      this.y!.range([this.xAxHeight, rect.height])
      this.updateBackgroundColors();
      this.updateClipPaths();
      this.resizeScrollX();
      this.redraw();
      this.resetZoom();
      this.oldHeight = window.innerHeight;
      this.fullWidth = window.innerWidth;
    },

    resizeScrollX() {
      this.scrollXWidth = this.rect().width - this.yAxWidth;
      this.scrollX
        .attr('viewBox', [0, 0, this.scrollXWidth, this.scrollXHeight-1])
      d3Select('.scrollXRect')
        .attr('width', this.scrollXWidth)
      const width = this.getScrollXDraggerWidth();
      const horRange = this.scrollXWidth - 1 - width;
      const deltaX = this.getScrollXDraggerTranslate() * horRange;
      d3Select('.scrollXDragger')
        .attr('width', width)
        .attr('transform', `translate(${deltaX}, 2)`)
    },

    phraseIdxFromTime(time: number, rounded=false) {
      if (rounded) time = Math.round(time * 1000) / 1000;
      const filtered = this.piece.phrases.filter(phrase => {
        let st = phrase.startTime!;
        let et = st + phrase.durTot!;
        if (rounded) {
          st = Math.round(st * 1000) / 1000;
          et = Math.round(et * 1000) / 1000;
        }
        const a = time >= st;
        const b = time < et;
        return a && b
      });
      return filtered[0].pieceIdx
    },

    handleMousedown(e: MouseEvent) {
      if (e.offsetY < this.xAxHeight) {
        this.drawingRegion = true;
        this.regionStartTime = this.xr().invert(e.offsetX);
        this.regionStartPx = e.offsetX;
      }
    },

    handleMouseup(e: MouseEvent) {
      if (e.offsetY < this.xAxHeight && this.drawingRegion) {
        if (e.offsetX < this.regionStartPx) {
          this.regionEndPx = this.regionStartPx;
          this.regionEndTime = this.xr().invert(this.regionEndPx)
          this.regionStartPx = e.offsetX;
          this.regionStartTime = this.xr().invert(this.regionStartPx)
        } else {
          this.regionEndTime = this.xr().invert(e.offsetX);
          this.regionEndPx = e.offsetX;
        }
        this.mouseUpUpdateLoop();
        this.setUpRegion();
        if (this.audioDBDoc) {
          const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
          if (!ap.loading) {
            ap.updateStretchBuf();
          }
        }
      }
    },

    setUpRegion() {
      const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      ap.stretchable = true;
      const rect = this.rect();
      const regionLine = d3Line()([
          [0, 0],
          [0, rect.height]
        ]);
        if (!this.regionG) {
          this.regionG = this.svg
            .append('g')
            .classed('regionG', true)
            .attr('clip-path', 'url(#playheadClip)');
          this.regionG
            .append('rect')
            .classed('region', true)
            .style('pointer-events', 'none')
            .attr('width', this.regionEndPx - this.regionStartPx)
            .attr('height', rect.height)
            .attr('fill', 'white')
            .attr('opacity', '0.4')
            .attr('transform', `translate(${this.regionStartPx},0)`);
          this.regionG
            .append('path')
            .classed('regionStart', true)
            .attr('d', regionLine)
            .attr('stroke', 'grey')
            .attr('opacity', '0.6')
            .attr('stroke-width', 1)
            .attr('transform', `translate(${this.regionStartPx},0)`);
          const rsDrag = () => {
            const dragged = (e: MouseEvent) => {
              d3Select('.clickableRegionStart')
                .attr('transform', `translate(${e.x},0)`)
              d3Select('.regionStart')
                .attr('transform', `translate(${e.x}, 0)`);
              d3Select('.region')
                .attr('width', this.xr()(this.regionEndTime!) - e.x)
                .attr('transform', `translate(${e.x}, 0)`)
            }
            const dragended = (e: MouseEvent) => {
              this.regionStartPx = e.x;
              this.regionStartTime = this.xr().invert(this.regionStartPx);
              this.updateLoop();
              if (this.audioDBDoc) ap.updateStretchBuf();
            }
            return d3Drag()
              .on('drag', dragged)
              .on('end', dragended)
          };

          const reDrag = () => {
            const dragged = (e: MouseEvent) => {
              d3Select('.clickableRegionEnd')
                .attr('transform', `translate(${e.x},0)`)
              d3Select('.regionEnd').attr('transform', `translate(${e.x}, 0)`);
              d3Select('.region')
                .attr('width', e.x - this.xr()(this.regionStartTime!))
            }
            const dragended = (e: MouseEvent) => {
              this.regionEndPx = e.x;
              this.regionEndTime = this.xr().invert(this.regionEndPx);
              this.updateLoop();
              if (this.audioDBDoc) ap.updateStretchBuf();

            }
            return d3Drag()
              .on('drag', dragged)
              .on('end', dragended)
          };
          
          this.regionG
            .append('path')
            .classed('clickableRegionStart', true)
            .attr('d', regionLine)
            .attr('stroke', 'grey')
            .attr('opacity', '0')
            .attr('stroke-width', 8)
            .attr('transform', `translate(${this.regionStartPx},0)`)
            .style('cursor', 'col-resize')
            .call(rsDrag())

          this.regionG
            .append('path')
            .classed('regionEnd', true)
            .attr('d', regionLine)
            .attr('stroke', 'grey')
            .attr('opacity', '0.6')
            .attr('stroke-width', 1)
            .attr('transform', `translate(${this.regionEndPx},0)`)

          this.regionG
            .append('path')
            .classed('clickableRegionEnd', true)
            .attr('d', regionLine)
            .attr('stroke', 'grey')
            .attr('opacity', '0')
            .attr('stroke-width', 8)
            .attr('transform', `translate(${this.regionEndPx},0)`)
            .style('cursor', 'col-resize')
            .call(reDrag())
        } else {
          d3Select('.region')
            .attr('width', this.regionEndPx - this.regionStartPx)
            .attr('transform', `translate(${this.regionStartPx},0)`)
          d3Select('.regionStart')
            .attr('transform', `translate(${this.regionStartPx},0)`)
          d3Select('.regionEnd')
            .attr('transform', `translate(${this.regionEndPx},0)`)
        }
    },

    moveRegion() {
      const start = this.xr()(this.regionStartTime!);
      const end = this.xr()(this.regionEndTime!);
      d3Select('.region')
        .attr('width', end - start)
        .transition()
        .duration(this.transitionTime)
        .ease(d3EaseQuadInOut)
        .attr('transform', `translate(${start})`)
      d3Select('.regionStart')
        .transition()
        .duration(this.transitionTime)
        .ease(d3EaseQuadInOut)
        .attr('transform', `translate(${start},0)`)
      d3Select('.regionEnd')
        .transition()
        .duration(this.transitionTime)
        .ease(d3EaseQuadInOut)
        .attr('transform', `translate(${end},0)`)
      d3Select('.clickableRegionStart')
        .transition()
        .duration(this.transitionTime)
        .ease(d3EaseQuadInOut)
        .attr('transform', `translate(${start},0)`)
      d3Select('.clickableRegionEnd')
        .transition()
        .duration(this.transitionTime)
        .ease(d3EaseQuadInOut)
        .attr('transform', `translate(${end},0)`)
    },

    getScrollYDraggerHeight() {

      const scale = this.ty ? this.ty().k : this.initYScale;
      return this.scrollYHeight * 1 / scale
    },

    getScrollXDraggerWidth() {
      const scale = this.tx ? this.tx().k : this.initXScale;
      let width = this.scrollXWidth / scale;
      return width < 20 ? 20 : width
    },

    transformScrollYDragger() {
      const height = this.getScrollYDraggerHeight();
      const vertRange = this.scrollYHeight - 1 - height;
      const deltaY = this.getScrollYDraggerTranslate() * vertRange;
      d3Select('.scrollYDragger')
        .attr('height', height)
        .attr('transform', `translate(2,${deltaY})`)
    },

    transformScrollXDragger() {
      const width = this.getScrollXDraggerWidth();
      const horRange = this.scrollXWidth - 1 - width;
      const deltaX = this.getScrollXDraggerTranslate() * horRange;
      d3Select('.scrollXDragger')
        .attr('width', width)
        .attr('transform', `translate(${deltaX},2)`)
    },

    getScrollYDraggerTranslate() {
      const height = this.rect().height - this.xAxHeight;
      const offset = - (this.yr()(Math.log2(this.freqMax)) - this.xAxHeight);
      return offset / (this.ty!().k * height - height + 1)
    },

    getScrollXDraggerTranslate() {
      const offset = - (this.xr()(0) - this.yAxWidth);
      const width = this.rect().width - this.yAxWidth;
      const out = offset / (this.tx!().k * width - width);
      if (isNaN(out)) return 0 // amateurish, but whatever
      return out
    },

    removeEditor() {
      if (this.scrollY) this.scrollY.remove();
      if (this.scrollX) this.scrollX.remove();
      if (this.svg) {
        this.svg.selectAll('*').remove();
        this.svg.remove();
      }

      if (this.defs) {
        this.defs.selectAll('*').remove();
        this.defs.remove();
      }
      if (this.specBox) {
        this.specBox.remove();
      }
    },

    async initializePiece(
        leftTime?: number, 
        currentXK?: number,
        scalingParam?: number, 
        yProp?: number,
        ) {
      this.removeEditor();
      this.visibleSargam = this.piece.raga.getFrequencies({
        low: this.freqMin,
        high: this.freqMax
      })
      this.visPitches = this.piece.raga.getPitches({
        low: this.freqMin,
        high: this.freqMax
      })

      const drag = d3Drag()
        .on('start', this.selBoxDragStart)
        .on('drag', this.selBoxDrag)
        .on('end', this.selBoxDragEnd);

      this.setScrollY();
      this.setScrollX();
      const rect = this.rect();
      this.oldRectHeight = rect.height;
      this.svg = d3Create('svg')
        .classed('noSelect', true)
        .attr('viewBox', [0, 0, rect.width, rect.height])
        .on('click', this.handleClick)
        .on('contextmenu', this.backgroundContextMenuClick)
        .on('mousedown', this.handleMousedown)
        .on('mouseup', this.handleMouseup)
        .style('border-bottom', '1px solid black')
        .call(drag)

      let imgsPreLoaded = false
      this.paintBackgroundColors();
      let regularMove = false;
      if (this.piece.audioID) {
        try {
          await this.addSpectrogram(leftTime, currentXK, scalingParam, yProp);
        } catch (err) {
          console.error(err)
        }
      } else {
        regularMove = true
      }
    
      this.curWidth = rect.width - this.yAxWidth;
      this.addClipPaths();
      this.addMarkers();
      this.gx = this.svg.append('g');
      this.gy = this.svg.append('g');
      this.x = d3ScaleLinear()
        .domain([0, this.durTot])
        .range([this.yAxWidth, this.rect().width])
      this.y = d3ScaleLinear()
        .domain([Math.log2(this.freqMax), Math.log2(this.freqMin)])
        .range([this.xAxHeight, rect.height])
      this.z = d3ZoomIdentity;
      this.zoomX = d3Zoom()
        .scaleExtent([1, 1000])
        .translateExtent([
          [0, 0],
          [rect.width, rect.height]
        ]);
      this.zoomY = d3Zoom().scaleExtent(this.yScaleLims).translateExtent([
        [0, 0],
        [rect.width, rect.height]
      ]);
      this.tx = () => d3ZoomTransform(this.gx.node()!);
      this.ty = () => d3ZoomTransform(this.gy.node()!);
      this.gx.call(this.zoomX).attr('pointer-events', 'none');
      this.gy.call(this.zoomY).attr('pointer-events', 'none');
      
      try {
        this.zoom = d3Zoom()
        .filter(z_ => {
          if (z_.type === 'dblclick') this.handleDblClick(z_);
          if (z_.type === 'touchmove') console.log('touchmove: ', z_)
          if (!z_.cancelable && this.browser.os !== 'Mac OS') {
            console.log('alt way is happening')
            this.nonD3EnactZoom(z_);
            return true
          }
          if (z_.type === 'wheel') return true;

          
          
          return z_.type !== 'mousedown' && z_.type !== 'dblclick'
        })
        .on('zoom', this.enactZoom)
        // .on('pointermove', () => console.log('wheel'))
      } catch (err) {
        console.error(err)
      }
      
      this.makeAxes();
      this.addPhrases();
      this.updateTranslateExtent();
      this.svgNode = this.svg
        .call(this.zoom)
        .call(this.zoom.transform, d3ZoomIdentity.scale(this.initXScale))
        .node()!;
      const graph = this.$refs.graph as HTMLElement;
      graph.appendChild(this.svgNode)
      
      this.addMetricGrid(false);
    },

    // selBoxDragStart(e: MouseEvent) {
    //   if (this.shifted) {
    //     this.selBoxStartX = e.x;
    //     this.selBoxStartY = e.y;
    //     this.selBox = this.svg.append('rect')
    //       .attr('id', 'selBox');
    //   }
    // },

    // selBoxDrag(e: MouseEvent) {
    //   if (this.selBoxStartX && this.selBoxStartY) {
    //     if (this.shifted) {
    //       const x = Math.min(this.selBoxStartX, e.x);
    //       const y = Math.min(this.selBoxStartY, e.y);
    //       const width = Math.abs(this.selBoxStartX - e.x);
    //       const height = Math.abs(this.selBoxStartY - e.y);
    //       this.selBox.attr('x', x)
    //         .attr('y', y)
    //         .attr('width', width)
    //         .attr('height', height)
    //         .attr('fill', 'none')
    //         .attr('stroke', 'black')
    //         .attr('stroke-width', 1)
    //         .attr('stroke-dasharray', '5,5')
    //     } else {
    //       this.selBoxDragEnd(e)
    //     }
        
    //   }
    // },

    // selBoxDragEnd(e: MouseEvent) {
    //   const c = this.selBoxStartX === e.x && this.selBoxStartY === e.y;
    //   if (this.selBoxStartX && this.selBoxStartY && !c) {
    //     const x = Math.min(this.selBoxStartX, e.x);
    //     const y = Math.min(this.selBoxStartY, e.y);
    //     const width = Math.abs(this.selBoxStartX - e.x);
    //     const height = Math.abs(this.selBoxStartY - e.y);
    //     const startTime = this.xr().invert(x);
    //     const endTime = this.xr().invert(x + width);
    //     const lowFreq = this.yr().invert(y + height);
    //     const highFreq = this.yr().invert(y);
    //     this.selectTrajectories(startTime, endTime, lowFreq, highFreq);
    //     this.groupable = this.selectedTrajsGroupable();
    //     d3Select('#selBox').remove();
    //     this.selBoxStartX = undefined;
    //     this.selBoxStartY = undefined;
    //   } else {
    //     if (e.y < this.xAxHeight && this.drawingRegion) {
    //       if (e.x < this.regionStartPx) {
    //         this.regionEndPx = this.regionStartPx;
    //         this.regionEndTime = this.xr().invert(this.regionEndPx);
    //         this.regionStartPx = e.x;
    //         this.regionStartTime = this.xr().invert(this.regionStartPx);
    //       } else {
    //         this.regionEndTime = this.xr().invert(e.x);
    //         this.regionEndPx = e.x;
    //       }
    //       this.mouseUpUpdateLoop();
    //       this.setUpRegion();
    //       if (this.audioDBDoc) {
    //         this.$nextTick(() => {
    //           const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
    //           if (!ap.loading) {
    //             ap.updateStretchBuf()
    //           }
    //         })
    //       }
    //     }
    //   }
    // },

    collectTrajs(
        timelyTrajs: Trajectory[], 
        startTime: number, 
        endTime: number, 
        lowFreq: number, 
        highFreq: number
        ) {
      const collectedTrajs: Trajectory[] = [];
      const sampleDur = 0.01;
      timelyTrajs.forEach(async (traj, tIdx) => {
        const phrase = this.piece.phrases[traj.phraseIdx!];
        const trajStart = phrase.startTime! + traj.startTime!;
        const trajEnd = trajStart + traj.durTot;
        let sampleTimes;
        if (tIdx === 0) {
          if (timelyTrajs.length === 1) {
            const div = Math.floor((endTime - startTime) / sampleDur);
            sampleTimes = linSpace(0, 1, div);
          } else {
            const div = Math.floor((trajEnd - startTime) / sampleDur);
            sampleTimes = linSpace(0, 1, div)
          }
        } else if (tIdx === timelyTrajs.length - 1) {
          const div = Math.floor((endTime - trajStart) / sampleDur);
          sampleTimes = linSpace(0, 1, div)
        } else {
          const div = Math.floor((trajEnd - trajStart) / sampleDur);
          sampleTimes = linSpace(0, 1, div)
        }
        let trigger = false;
        let override = false;
        let ct = 0;
        while ((!trigger) && (!override)) {
          const logFreq = traj.compute(sampleTimes[ct], true);
          if (logFreq >= lowFreq && logFreq <= highFreq) {
            trigger = true;
          } else if (ct === sampleTimes.length - 1) {
            override = true;
          } else {
            ct++;
          }
        }
        if (trigger) {
          collectedTrajs.push(traj);
        }
        if (ct > 1000) {
          throw new Error('ct > 1000')
        }
        return
      });
      return collectedTrajs
    },
    
    handleDblClick(z: MouseEvent) {
      const graphX = z.clientX - this.yAxWidth;
      const time = this.xr().invert(z.clientX);
      const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      if (ap.regionSpeedOn) {
        const afterStart = time >= this.regionStartTime!;
        const beforeEnd = time <= this.regionEndTime!;
        if (afterStart && beforeEnd) {
          if (graphX >= 0) {
            this.currentTime = time;
            if (!ap.playing) {
              ap.pausedAt = time;
              ap.updateProgress();
              ap.updateFormattedCurrentTime();
              ap.updateFormattedTimeLeft();
            } else {
              ap.stop();
              ap.pausedAt = time;
              ap.play();
            }
            this.movePlayhead();
            this.moveShadowPlayhead();
          }
        }
      } else if (graphX >= 0) {
        this.currentTime = time;
        if (!ap.playing) {
          ap.pausedAt = time;
          ap.updateProgress();
          ap.updateFormattedCurrentTime();
          ap.updateFormattedTimeLeft();
        } else {
          ap.stop();
          ap.pausedAt = time;
          this.animationStart = time;
          ap.play();
          ap.cancelPlayTrajs();
          if (ap.string) {
            ap.cancelBursts();
          }
          ap.bufferSourceNodes = [];
          ap.playTrajs(ap.getCurTime(), ap.now());
          if (ap.string) {
            ap.playChikaris(ap.getCurTime(), ap.now(), ap.otherNode)
          }
        }
        this.movePlayhead();
        this.moveShadowPlayhead();
      }
    },

    trajIdxFromTime(phrase: Phrase, time: number) {
      let phraseTime = time - phrase.startTime!;
      const trajs = phrase.trajectories.filter(traj => {
        const a = phraseTime >= traj.startTime!;
        const b = phraseTime < traj.startTime! + traj.durTot;
        return a && b
      })
      if (trajs.length === 0) {
        console.log(trajs, phrase, time)
      }
      return trajs[0].num
    },

    magnetize(time: number) {
      let outTime = undefined
      this.piece.meters.forEach(meter => {
        const corpTimes = meter.realCorpTimes;
        // const corpPulses = meter.allCorporealPulses;
        const start = corpTimes[0];
        const end = corpTimes[corpTimes.length - 1]
        if (time >= start && time <= end) {
          const nearestTime = corpTimes.reduce((a, b) => {
            const aDiff = Math.abs(a - time);
            const bDiff = Math.abs(b - time);
            if (aDiff < bDiff) {
              return a
            } else {
              return b
            }
          })
          outTime = nearestTime
        }
      })
      if (outTime === undefined) {
        outTime = time
      }
      return outTime
    },

    handleClick(e: MouseEvent, dragbox=false) {
      const eventX = dragbox ? e.x : e.clientX;
      const eventY = dragbox ? e.y : e.clientY;
      let time = this.xr().invert(eventX);
      const pIdx = this.phraseIdxFromTime(time)!;
      // need to figure out how to handle when click is over a non phrase
      if (this.setChikari) {
        this.unsavedChanges = true;
        const sym = d3Symbol().type(d3SymbolX).size(80);
        const phrase = this.piece.phrases[pIdx];
        const fixedTime = Number((time - phrase.startTime!).toFixed(2));
        phrase.chikaris[fixedTime] = new Chikari({
          'fundamental': this.piece.raga.fundamental,
          'pitches': this.piece.raga.chikariPitches
        });
        const scaledX = fixedTime / phrase.durTot!;
        const dataObj: DrawDataType = {
          x: fixedTime + phrase.startTime!,
          y: phrase.compute(scaledX, true)
        };
        const num = (fixedTime % 1).toFixed(2).toString().slice(2);
        const id = `p${phrase.pieceIdx}_${Math.floor(fixedTime)}_${num}`;
        const x = (d: DrawDataType) => this.codifiedXR!(d.x);
        const y = (d: DrawDataType) => this.codifiedYR!(d.y);
        const tFunc: TFuncType = (datum) => {
          const d = datum as DrawDataType;
          return `translate(${x(d)},${y(d)})`
        } 
        this.phraseG.append('g')
          .classed('chikari', true)
          .append('path')
          .attr('id', id)
          .attr('d', sym)
          .attr('stroke', this.chikariColor)
          .attr('stroke-width', 3)
          .attr('stroke-linecap', 'round')
          .data([dataObj])
          .attr('transform', tFunc)
        this.phraseG.append('g')
          .classed('chikari', true)
          .append('circle')
          .attr('id', 'circle__' + id)
          .classed('chikariCircle', true)
          .style('opacity', '0')
          .data([dataObj])
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 6)
          .on('mouseover', this.handleMouseOver)
          .on('mouseout', this.handleMouseOut)
          .on('click', this.handleClickChikari)
        this.setChikari = false;
        this.svg.style('cursor', 'auto');
      } else if (this.setNewTraj) {
        if (this.meterMagnetMode) {
          time = this.magnetize(time);
        }
        const logSGLines = this.visibleSargam.map(s => Math.log2(s));
        let logFreq = this.yr().invert(eventY - this.navHeight);
        logFreq = getClosest(logSGLines, logFreq);
        const phrase = this.piece.phrases[pIdx];
        const tIdx = this.trajIdxFromTime(phrase, time)!;
        const traj = phrase.trajectories[tIdx];
        if (traj.id === 12) {
          let setIt = true;
          if (this.trajTimePts.length > 0) {
            const c1 = this.trajTimePts[0].tIdx === tIdx;
            const c2 = this.trajTimePts[0].pIdx === pIdx;
            if (!(c1 && c2)) {
              setIt = false;
            }
          }
          
          // if point is too close in time to other trajTimePts, seit should be
          // false. Less than 0.05 to be exact.
          const diffs = this.trajTimePts.map(ttp => {
            return Math.abs(ttp.time - time)
          })
          const minDiff = Math.min(...diffs);
          setIt = minDiff > 0.05 ? true : false;

          if (setIt) {
            let fixedTime = time;
            const startTime = phrase.startTime! + traj.startTime!;
            if (time - startTime < this.minTrajDur) {
              fixedTime = startTime
            } else if (startTime + traj.durTot - time < this.minTrajDur) {
              fixedTime = startTime + traj.durTot
            }
            this.phraseG
              .append('circle')
              .classed('newTrajDot', true)
              .attr('cx', this.codifiedXR!(fixedTime))
              .attr('cy', this.codifiedYR!(logFreq))
              .attr('r', 4)
              .style('fill', 'forestgreen')
            this.trajTimePts.push({
              time: fixedTime,
              logFreq: logFreq,
              pIdx: pIdx,
              tIdx: tIdx
            })
            // if a new traj dot's time is within some small threshold of a
            // previous traj, then set the trajselect penel's vowel attribute
            // to be the same as the previous traj's vowel attribute.
            if (this.vocal) {
              const prevTraj = this.piece.mostRecentTraj(fixedTime);
              if (prevTraj && prevTraj.id !== 12) {
                const phrase = this.piece.phrases[prevTraj.phraseIdx!];
                const startTime = phrase.startTime! + prevTraj.startTime!; 
                const endTime = startTime + prevTraj.durTot;
                const diff = fixedTime - endTime;
                if (diff < this.minTrajDur) {
                  const tsp = this.$refs.trajSelectPanel as 
                    typeof TrajSelectPanel;
                  tsp.vowel = prevTraj.vowel;
                }
              }
            }
          }
        }
      } else if (this.setNewSeries) {
        if (this.meterMagnetMode) {
          time = this.magnetize(time);
        }
        const logSGLines = this.visibleSargam.map(s => Math.log2(s));
        let logFreq = this.yr().invert(eventY - this.navHeight);
        logFreq = getClosest(logSGLines, logFreq);
        const phrase = this.piece.phrases[pIdx];
        const tIdx = this.trajIdxFromTime(phrase, time)!;
        const traj = phrase.trajectories[tIdx];
        let snappedTime = time;
        const st = phrase.startTime! + traj.startTime!;
        const et = st + traj.durTot;
        if (time - st < this.minTrajDur) {
          snappedTime = st
        } else if (et - time < this.minTrajDur) {
          snappedTime = et
        }
        const ttp  = this.trajTimePts;
        if (traj.id === 12 && (ttp.length === 0 || ttp[0].tIdx === tIdx)) {
          this.phraseG  
            .append('circle')
            .classed('newSeriesDot', true)
            .attr('cx', this.codifiedXR!(time))
            .attr('cy', this.codifiedYR!(logFreq))
            .attr('r', 4)
            .style('fill', '#7300e6')
          this.trajTimePts.push({
            time: snappedTime,
            logFreq: logFreq,
            pIdx: pIdx,
            tIdx: tIdx
          })
          if (this.trajTimePts.length > 1) {
            this.addFixedTraj();

          }
        }
      } else if (this.setNewPhraseDiv) {
        this.unsavedChanges = true;
        const phrase = this.piece.phrases[pIdx];
        const tIdx = this.trajIdxFromTime(phrase, time)!;
        const traj = phrase.trajectories[tIdx];

        // override time so that if it falls within a group of trajectories, 
        // time is set to either the start of the first traj in the group, or 
        // the end of the last traj in the group. This is so that the phrase div 
        // does not fall within a group of trajectories.

        if (traj.groupId !== undefined) {
          console.log('Phrase div would fall within a group of trajectories, ' + 
            'so overriding time to be either the start or end of the group.');
          const group = phrase.getGroupFromId(traj.groupId)!;
          const firstTraj = group.trajectories[0];
          const lastTraj = group.trajectories[group.trajectories.length - 1];
          const startTime = phrase.startTime! + firstTraj.startTime!;
          let endTime = lastTraj.startTime! + lastTraj.durTot;
          endTime = endTime + phrase.startTime!;
          if (endTime - time <= time - startTime) {
            time = endTime;
          } else {
            time = startTime;
          }
        }
        if (traj.id === 12) {
          // make current traj durTot such that it ends at current time, and 
          // make new traj start at current time, update the phrase to reflect
          // and reset zoom ? Or ... do I have to manually rename all the 
          // following trajs if there are any?
          const firstTrajDur = time - (phrase.startTime! + traj.startTime!);
          const secondTrajDur = traj.durTot - firstTrajDur;
          traj.durTot = firstTrajDur;
          const ntObj: {
            id: number,
            durTot: number,
            pitches: Pitch[],
            fundID12: number,
            instrumentation?: string
          } = {
            id: 12,
            durTot: secondTrajDur,
            pitches: [],
            fundID12: this.piece.raga.fundamental,
          };
          if (this.piece.instrumentation) {
            ntObj.instrumentation = this.piece.instrumentation[0];
          }
          const newTraj = new Trajectory(ntObj);
          phrase.trajectories.splice(tIdx + 1, 0, newTraj);
          phrase.reset();
          // right here, I need to reid all the following trajectories
          for (let i = phrase.trajectories.length-1; i >= tIdx+2; i--) {
            const thisTraj = phrase.trajectories[i];
            const oldId = `p${phrase.pieceIdx}t${thisTraj.num!-1}`;
            const newId = `p${phrase.pieceIdx}t${thisTraj.num}`;
            this.reIdAllReps(oldId, newId);
          }
        }
        const possibleTimes = this.possibleTrajDivs();
        const finalTime = getClosest(possibleTimes, time);
        const ftIdx = possibleTimes.indexOf(finalTime);
        const ptPerP = this.piece.phrases.map(p => p.trajectories.length - 1);
        // look into this cumsum issue ...
        const lims = [0, ...ptPerP.map(cumsum()).slice(0, ptPerP.length - 1)];
        const pIdx_ = lims.findLastIndex(lim => ftIdx >= lim);
        const start = lims[pIdx_];
        const trajIdx = ftIdx - start;
        const phrase_ = this.piece.phrases[pIdx_];
        const end = phrase_.trajectories.length - (trajIdx + 1);
        const newTrajs = phrase_.trajectories.splice(trajIdx+1, end);
        phrase_.durTotFromTrajectories();
        phrase_.durArrayFromTrajectories();
        const newPhraseObj: {
          trajectories: Trajectory[],
          raga: Raga,
          instrumentation?: string[]
        } = {
          trajectories: newTrajs,
          raga: phrase_.raga!
        };
        if (this.piece.instrumentation) {
          newPhraseObj.instrumentation = this.piece.instrumentation;
        }
        const newPhrase = new Phrase(newPhraseObj)
        this.piece.phrases.splice(phrase_.pieceIdx! + 1, 0, newPhrase);
        this.piece.durTotFromPhrases();
        this.piece.durArrayFromPhrases();
        this.piece.updateStartTimes();
        //move over names of old phrase_ divs, from the back forward
        for (let i=this.piece.phrases.length-2; i >= phrase_.pieceIdx!; i--) {
          const drag = () => {
            return d3Drag()
            .on('start', this.phraseDivDragStart(i+1))
            .on('drag', this.phraseDivDragDragging(i+1))
            .on('end', this.phraseDivDragEnd(i+1))
          };        
          d3Select(`#overlay__phraseLine${i}`)
            .attr('id', `overlay__phraseLine${i+1}`)
          if (this.editable) {
            d3Select(`#overlay__phraseLine${i}`)
            .on('.drag', null)
            .call(drag())
          }
          d3Select(`#phraseLine${i}`)
            .attr('id', `phraseLine${i+1}`)          
        }
        this.addNewPhraseDiv(phrase_.pieceIdx!);
        this.setNewPhraseDiv = false;
        this.svg.style('cursor', 'auto');        
      } else if (this.insertPulseMode) {
        let continue_ = false;
        if (!this.timeWithinMeter(time)) {
          if (this.insertPulses.length > 0) {
            if (time >= this.IPLims[0] && time < this.IPLims[1]) {
              this.insertPulses.push(time);
              continue_ = true
            }
          } else {
            this.insertPulses.push(time);
            this.updateIPLims();
            continue_ = true
          }
          if (continue_) {
            this.phraseG
            .append('path')
            .classed('insertPulse', true)
            .attr('id', `insertPulse${this.insertPulses.length - 1}`)
            .attr('stroke', this.selMeterColor)
            .attr('stroke-width', 2)
            .attr('d', this.playheadLine(true))
            .attr('transform', `translate(${this.codifiedXR!(time)}, 0)`)
          }
        }   
      } else if (this.setNewRegion) {
        this.setRegionToPhrase(pIdx);
        this.setNewRegion = false;
      } else if (this.shifted) {
      } else {
        if (this.justEnded) {
          this.justEnded = false // this just prevents phrase div drag end from 
          // clearing all
        } else {
          this.clearAll(false)
        }
      }
    },

    insertSilentTrajRight(traj: Trajectory, dur=0.1) {
      // if traj is not silent and next traj is not silent (and there is a next 
      // traj), then shorten the current traj by 0.1 s, and insert a silent traj
      // after it with a duration of 0.1 s.
      if (traj.durTot < 0.2) dur = 0.1 * traj.durTot;
      const pIdx = traj.phraseIdx!;
      const tIdx = traj.num!;
      const phrase = this.piece.phrases[pIdx];

      if (traj.id === 12) {
        throw new Error('traj is already silent');
      }
      if (tIdx === phrase.trajectories.length - 1) {
        if (this.piece.phrases.length > pIdx + 1) {
          const nextPhrase = this.piece.phrases[pIdx + 1];
          const nextTraj = nextPhrase.trajectories[0];
          if (nextTraj.id === 12) {
            throw new Error('next traj is already silent');
          }
        }
      } else {
        const nextTraj = phrase.trajectories[tIdx + 1];
        if (nextTraj.id === 12) {
          throw new Error('next traj is already silent');
        }
      }
      const newTraj = new Trajectory({
        id: 12,
        durTot: dur,
        pitches: [],
        fundID12: this.piece.raga.fundamental
      });
      if (traj.durArray!.length === 1) {
        traj.durTot -= dur;
      } else {
        const durs = traj.durArray!.map(d => d * traj.durTot);
        durs[durs.length - 1] -= dur;
        traj.durTot -= dur;
        traj.durArray = durs.map(d => d / traj.durTot);
      }
      phrase.trajectories.splice(tIdx + 1, 0, newTraj);
      phrase.reset();

      const data = this.makeTrajData(traj, phrase.startTime!);
      d3Select(`#p${pIdx}t${tIdx}`)
        .datum(data)
        .attr('d', this.codifiedPhraseLine())
      d3Select(`#overlay__p${pIdx}t${tIdx}`)
        .datum(data)
        .attr('d', this.codifiedPhraseLine())

      for (let i = phrase.trajectories.length-1; i > tIdx + 1; i--) {
        const oldId = `p${pIdx}t${i-1}`;
        const newId = `p${pIdx}t${i}`;
        this.reIdAllReps(oldId, newId);
      }
      this.resetZoom();
    },

    // insertSilentTrajLeft(traj: Trajectory, dur=0.1) {
    //   if (traj.durTot < 0.2) dur = 0.1 * traj.durTot;
    //   const pIdx = traj.phraseIdx!;
    //   const tIdx = traj.num!;
    //   const phrase = this.piece.phrases[pIdx];
    //   if (traj.id === 12) {
    //     throw new Error('traj is already silent');
    //   }
    //   if (tIdx === 0) {
    //     if (pIdx > 0) {
    //       const prevPhrase = this.piece.phrases[pIdx - 1];
    //       const trajs = prevPhrase.trajectories;
    //       const prevTraj = trajs[trajs.length - 1];
    //       if (prevTraj.id === 12) {
    //         throw new Error('previous traj is already silent');
    //       }
    //     }
    //   } else {
    //     const prevTraj = phrase.trajectories[tIdx - 1];
    //     if (prevTraj.id === 12) {
    //       throw new Error('previous traj is already silent');
    //     }
    //   }
    //   const newTraj = new Trajectory({
    //     id: 12,
    //     durTot: dur,
    //     pitches: [],
    //     fundID12: this.piece.raga.fundamental
    //   });
    //   if (traj.durArray!.length === 1) {
    //     traj.durTot -= dur;
    //   } else {
    //     const durs = traj.durArray!.map(d => d * traj.durTot);
    //     durs[0] -= dur;
    //     traj.durTot -= dur;
    //     traj.durArray = durs.map(d => d / traj.durTot);
    //   }
    //   phrase.trajectories.splice(tIdx, 0, newTraj);
    //   phrase.reset();

    //   const data = this.makeTrajData(traj, phrase.startTime!);
    //   d3Select(`#p${pIdx}t${tIdx}`)
    //     .datum(data)
    //     .attr('d', this.codifiedPhraseLine())
    //   d3Select(`#overlay__p${pIdx}t${tIdx}`)
    //     .datum(data)
    //     .attr('d', this.codifiedPhraseLine())
      

    //   for (let i = phrase.trajectories.length - 2; i >= tIdx; i--) {
    //     const oldId = `p${pIdx}t${i}`;
    //     const newId = `p${pIdx}t${i + 1}`;
    //     this.reIdAllReps(oldId, newId);
    //   }
    //   this.selectedTrajID = `p${pIdx}t${tIdx + 1}`;
    //   // d3SelectAll('.dragDots').remove();
    //   // this.addAllDragDots();
    //   this.resetZoom();
    // },

    // insertFixedTrajRight(traj: Trajectory, dur=0.1) {
    //   if (traj.durTot < 0.2) dur = 0.1 * traj.durTot;
    //   const pIdx = traj.phraseIdx!;
    //   const tIdx = traj.num!;
    //   const phrase = this.piece.phrases[pIdx];
    //   if (traj.id === 0) {
    //     throw new Error('traj is already fixed');
    //   }
    //   const newPitch = new Pitch(traj.pitches[traj.pitches.length - 1]);
    //   const newTraj = new Trajectory({
    //     id: 0,
    //     durTot: dur,
    //     pitches: [newPitch],
    //     articulations: {},
    //     vowel: traj.vowel,
    //     vowelEngTrans: traj.vowelEngTrans,
    //     vowelHindi: traj.vowelHindi,
    //     vowelIpa: traj.vowelIpa,
    //     endConsonant: traj.endConsonant,
    //     endConsonantEngTrans: traj.endConsonantEngTrans,
    //     endConsonantHindi: traj.endConsonantHindi,
    //     endConsonantIpa: traj.endConsonantIpa,
    //   });
    //   traj.endConsonant = undefined;
    //   traj.endConsonantEngTrans = undefined;
    //   traj.endConsonantHindi = undefined;
    //   traj.endConsonantIpa = undefined;
    //   const art = traj.articulations['1.00'];
    //   if (art && art.name === 'consonant') {
    //     delete traj.articulations['1.00'];
    //   }

    //   if (traj.durArray!.length === 1) {
    //     traj.durTot -= dur;
    //   } else {
    //     const durs = traj.durArray!.map(d => d * traj.durTot);
    //     durs[0] -= dur;
    //     traj.durTot -= dur;
    //     traj.durArray = durs.map(d => d / traj.durTot);
    //   }
    //   phrase.trajectories.splice(tIdx+1, 0, newTraj);
    //   phrase.reset();

    //   const origTrajData = this.makeTrajData(traj, phrase.startTime!);
    //   d3Select(`#p${pIdx}t${tIdx}`)
    //     .datum(origTrajData)
    //     .attr('d', this.codifiedPhraseLine())
    //   d3Select(`#overlay__p${pIdx}t${tIdx}`)
    //     .datum(origTrajData)
    //     .attr('d', this.codifiedPhraseLine())
    //   const vowelIdxs = phrase.firstTrajIdxs();
    //   this.codifiedAddTraj(newTraj, phrase.startTime!, vowelIdxs);
    //   for (let i = phrase.trajectories.length-1; i > tIdx + 1; i--) {
    //     const oldId = `p${pIdx}t${i-1}`;
    //     const newId = `p${pIdx}t${i}`;
    //     this.reIdAllReps(oldId, newId);
    //   }
    //   this.resetZoom();
    // },

    // insertFixedTrajLeft(traj: Trajectory, dur=0.1) {
    //   if (traj.durTot < 0.2) dur = 0.1 * traj.durTot;
    //   const pIdx = traj.phraseIdx!;
    //   const tIdx = traj.num!;
    //   const phrase = this.piece.phrases[pIdx];
    //   if (traj.id === 0) {
    //     throw new Error('traj is already fixed');
    //   }
    //   const newPitch = new Pitch(traj.pitches[0]);
    //   const art = traj.articulations['0.00'];
    //   const newArts = art && art.name === 'pluck' ? 
    //         [{ '0.00': new Articulation({ 
    //           name: 'pluck',
    //           stroke: 'd',
    //           strokeNickname: 'da' 
    //         }) }] : 
    //         [{ }];
    //   const newTraj = new Trajectory({
    //     id: 0,
    //     durTot: dur,
    //     pitches: [newPitch],
    //     articulations: newArts,
    //     vowel: traj.vowel,
    //     vowelEngTrans: traj.vowelEngTrans,
    //     vowelHindi: traj.vowelHindi,
    //     vowelIpa: traj.vowelIpa,
    //     startConsonant: traj.startConsonant,
    //     startConsonantEngTrans: traj.startConsonantEngTrans,
    //     startConsonantHindi: traj.startConsonantHindi,
    //     startConsonantIpa: traj.startConsonantIpa,
    //   });
    //   traj.startConsonant = undefined;
    //   traj.startConsonantEngTrans = undefined;
    //   traj.startConsonantHindi = undefined;
    //   traj.startConsonantIpa = undefined;
    //   if (art && art.name === 'consonant') {
    //     delete traj.articulations['0.00'];
    //   }
    //   if (art && art.name === 'pluck') {
    //     delete traj.articulations['0.00'];
    //   }
    //   if (traj.durArray!.length === 1) {
    //     traj.durTot -= dur;
    //   } else {
    //     const durs = traj.durArray!.map(d => d * traj.durTot);
    //     durs[0] -= dur;
    //     traj.durTot -= dur;
    //     traj.durArray = durs.map(d => d / traj.durTot);
    //   }
    //   phrase.trajectories.splice(tIdx, 0, newTraj);
    //   phrase.reset();

    //   const origTrajData = this.makeTrajData(traj, phrase.startTime!);
    //   d3Select(`#p${pIdx}t${tIdx}`)
    //     .datum(origTrajData)
    //     .attr('d', this.codifiedPhraseLine())
    //   d3Select(`#overlay__p${pIdx}t${tIdx}`)
    //     .datum(origTrajData)
    //     .attr('d', this.codifiedPhraseLine())
      
    //   const vowelIdxs = phrase.firstTrajIdxs();
    //   this.codifiedAddTraj(newTraj, phrase.startTime!, vowelIdxs);
    //   for (let i = phrase.trajectories.length - 2; i >= tIdx; i--) {
    //     const oldId = `p${pIdx}t${i}`;
    //     const newId = `p${pIdx}t${i + 1}`;
    //     this.reIdAllReps(oldId, newId);
    //   }
    //   this.selectedTrajID = `p${pIdx}t${tIdx + 1}`;
    //   this.resetZoom();


    // },

    scrollYDragStart(e: MouseEvent) {
      const elem = d3Select('.scrollYDragger');
      const transform = elem.attr('transform');
      const yOffsetString = transform.split(',')[1];
      const end = yOffsetString.length - 1;
      this.initYOffset = Number(yOffsetString.slice(0, end));
      this.initYOffset = e.y - this.initYOffset; 
    },

    getScrollYVal(scrollProp: number) {
      const scrollYMin = this.zoomY!.translateExtent()[0][1];
      const graphHeight = this.rect().height - 30;
      const k = this.ty!().k;
      const scrollYExtent = (graphHeight * k - graphHeight) / k;
      const scrollY = scrollYMin + scrollProp * scrollYExtent;
      return scrollY
    },

    scrollYDragging(e: MouseEvent) {
      let y = e.y - this.initYOffset;
      if (y < 0) y = 0;
      const maxY = this.scrollYHeight - this.getScrollYDraggerHeight();
      if (y > maxY) y = maxY;
      const scrollProp = y / maxY;
      // console.log(scrollProp)
      const scrollY = this.getScrollYVal(scrollProp);
      this.gy.call(this.zoomY!.translateTo, 0, scrollY, [0, 0]);
      this.redraw();

      d3Select('.scrollYDragger')
        .attr('transform', `translate(2, ${y})`)
    },

    scrollYDragEnd(e: MouseEvent) {
      let y = e.y - this.initYOffset;
      if (y < 0) y = 0;
      const maxY = this.scrollYHeight - this.getScrollYDraggerHeight();
      if (y > maxY) y = maxY;
      d3Select('.scrollYDragger')
        .attr('transform', `translate(2, ${y})`)
    },

    scrollXDragStart(e: MouseEvent) {
      const elem = d3Select('.scrollXDragger');
      const transform = elem.attr('transform');
      let xOffsetString = transform.split(',')[0].slice(10);
      this.initXOffset = e.x - Number(xOffsetString); 
    },

    getScrollXVal(scrollProp: number) {
      const scrollXMin = this.zoomX!.translateExtent()[0][0];
      const graphWidth = this.rect().width - 30;
      const k = this.tx!().k;
      const scrollXExtent = (graphWidth * k - graphWidth) / k;
      const scrollX = scrollXMin + scrollProp * scrollXExtent;
      return scrollX
    },

    scrollXDragging(e: MouseEvent) {
      let x = e.x - this.initXOffset;
      if (x < 0) x = 0;
      const maxX = this.scrollXWidth - this.getScrollXDraggerWidth();
      if (x > maxX) x = maxX;
      const scrollProp = x / maxX;
      const scrollX = this.getScrollXVal(scrollProp);
      this.gx.call(this.zoomX!.translateTo, scrollX, 0, [0, 0]);
      this.redraw();
      d3Select('.scrollXDragger')
        .attr('transform', `translate(${x}, 2)`)
    },

    moveToPhrase(pIdx: number) {
      // move scroll
      const offsetDurTot = this.piece.durTot! * (1 - 1 / this.tx!().k);
      const time = this.piece.phrases[pIdx].startTime!;
      const scrollX = this.getScrollXVal(time / offsetDurTot);
      this.gx.call(this.zoomX!.translateTo, scrollX, 0, [0, 0]);
      this.redraw();
      //move playhead
      this.currentTime = time;
      const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      if (!ap.loading) {
        if (!ap.playing) {
          ap.pausedAt = time;
          ap.updateProgress();
          ap.updateFormattedCurrentTime();
          ap.updateFormattedTimeLeft();
        } else {
          ap.stop();
          ap.pausedAt = time;
          ap.play();
        }
      }
      this.movePlayhead();
      this.moveShadowPlayhead();
      const query = this.$route.query;
      this.$router.push({ query: { id: query.id, pIdx: pIdx.toString() } });
    },

    moveToSection(sIdx: number) {
      const pIdx = this.piece.sectionStarts[sIdx];
      this.moveToPhrase(pIdx);
    },

    moveToTime(time: number, point: [number, number], redraw=false) {
      if (point === undefined) {
        point = [0, 0];
      }
      const offsetDurTot = this.piece.durTot! * (1 - 1 / this.tx!().k);
      const scrollX = this.getScrollXVal(time / offsetDurTot);
      this.gx.call(this.zoomX!.translateTo, scrollX, 0, point);
      if (redraw === true) this.redraw(true)
    },

    moveToY(y: number, point?: [number, number] , redraw=false) {
      if (point === undefined) {
        point = [0, 0]
      }
      this.gy.call(this.zoomY!.translateTo, 0, y, point);
      if (redraw === true) this.redraw(true)
      // this.transformScrollYDragger();
    },

    scaleToX(x: number, point?: [number, number] = undefined, redraw = false) {
      const currentX = this.tx!().k;
      const scaleFactor = x / currentX;
      if (point === undefined) {
        point = [0, 0];
      }
      this.gx.call(this.zoomX!.scaleBy, scaleFactor, point);
      if (redraw === true) this.redraw(true)
    },

    scaleToY(y: number, point?: [number, number] = undefined, redraw = false) {
      const currentY = this.ty!().k;
      const scaleFactor = y / currentY;
      if (point === undefined) {
        point = [0, 0];
      }
      this.gy.call(this.zoomY!.scaleBy, scaleFactor, point);
      if (redraw === true) this.redraw(true)
    },

    scaleAndMoveToTime(
        x: number, 
        time: number, 
        scalingParam: number, 
        yProp: number,
        point?: [number, number] = undefined) {
      if (point === undefined) {
        point = [0, 0];
      }
      this.scaleToX(x, point);
      const currentHeight = document.querySelector('#backColor')!
        .getBoundingClientRect()
        .height;
      const newYK = scalingParam / currentHeight;
      this.scaleToY(newYK, point);
      this.moveToTime(time, [0, point[1]]);
      const yScroll = this.getScrollYVal(yProp);
      this.moveToY(yScroll, [0, 0]);
      this.redraw(true);
      this.transformScrollXDragger();
      this.transformScrollYDragger();
    },

    moveToNextPhrase() {
      const time = this.xr().invert(this.yAxWidth);
      const curPhrase = this.phraseIdxFromTime(time, true)!;
      if (this.piece.phrases[curPhrase+1]) {
        this.moveToPhrase(curPhrase+1);
      }
    },

    moveToPrevPhrase() {
      const time = this.xr().invert(this.yAxWidth);
      const curPhrase = this.phraseIdxFromTime(time, true)!;
      if (this.piece.phrases[curPhrase-1]) {
        this.moveToPhrase(curPhrase-1);
      }
    },

    makeAxes() {
      this.xAxis = (
          g: Selection<SVGGElement, any, HTMLElement, any>,
          scale: d3.ScaleLinear<number, number>
          ) => g
        .attr('transform', `translate(0,${this.xAxHeight})`)
        .style('font-size', '13px')
        .call(
          d3AxisTop(scale)
          .ticks(10)
          .tickFormat(d => structuredTime(Number(d)))
          )
        .call(g => g.select('.domain'))
      const yTickLabels = this.getYTickLabels();
      this.yAxis = (
          g: Selection<SVGGElement, any, HTMLElement, any>,
          scale: d3.ScaleLinear<number, number>
          ) => g
        .attr('transform', `translate(${this.x!(0)},0)`)
        .attr('clip-path', 'url(#yAxisClip)')
        .style('font-size', '14px')
        .call(d3AxisLeft(scale)
          .tickValues(this.visibleSargam.map(f => Math.log2(f)))
          .tickFormat((_, i) => yTickLabels[i]))
        .call(g => g.select('.domain'))
    },

    slidePhrases(x: number, y: number, xS: number, yS: number, tTime: number) {  
      this.phraseG
        .transition()
        .duration(tTime)
        .ease(d3EaseLinear)
        .attr('transform', `translate(${x},${y}) scale(${xS},${yS})`)  
      if (Math.abs(Math.log(xS)) > 0.2) this.resetZoom();
      if (Math.abs(Math.log(yS)) > 0.3) this.resetZoom();
    },

    addPhrases() {
      const timePts = Math.round(this.durTot / this.minDrawDur);
      const drawTimes = linSpace(0, this.durTot, timePts);
      this.clipG = this.svg.append('g')
        .attr('clip-path', 'url(#clip)')
      this.phraseG = this.clipG.append('g')
        .classed('phraseG', true)
      this.addSargamLines(false);
      this.piece.phrases.forEach((phrase, pIdx) => {
        phrase.trajectories.forEach((traj, tIdx) => {
          if (traj.id !== 12) {
            const st = phrase.startTime! + traj.startTime!;
            const end = st + traj.durTot;
            const numTimePts = Math.round(traj.durTot / this.minDrawDur);
            const trajDrawXs = linSpace(0, 1, numTimePts);
            const trajDrawTimes = trajDrawXs.map(x => st + x * traj.durTot);
            const trajDrawYs = trajDrawXs.map(x => traj.compute(x));
            const data = trajDrawYs.map((y, i) => {
              return {
                x: trajDrawTimes[i],
                y: y
              }
            })
            this.phraseG.append('path')
              .datum(data)
              .classed('phrase', true)
              .attr('id', `p${pIdx}t${tIdx}`)
              .attr("fill", "none")
              .attr("stroke", this.trajColor)
              .attr("stroke-width", '3px')
              .attr("stroke-linejoin", "round")
              .attr("stroke-linecap", "round")
              .attr("d", this.phraseLine())
            this.phraseG.append('path')
              .datum(data)
              .classed('phrase', true)
              .attr('id', `overlay__p${pIdx}t${tIdx}`)
              .attr('fill', 'none')
              .attr('stroke', 'green')
              .attr('stroke-width', '6px')
              .attr('d', this.phraseLine())
              .style('opacity', '0')
              .on('mouseover', this.handleMouseOver)
              .on('mouseout', this.handleMouseOut)
              .on('click', this.handleClickTraj)
              .on('contextmenu', this.trajContextMenuClick)
          }
          const vowelIdxs = phrase.firstTrajIdxs();
          this.addArticulations(traj, phrase.startTime!, vowelIdxs)
        })
      });
      this.addChikaris();
      this.addPlayhead();   
    },

    backgroundContextMenuClick(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      this.contextMenuX = e.x;
      this.contextMenuY = e.y;

      const time = this.xr().invert(e.x);
      const pIdx = this.phraseIdxFromTime(time, true)!;
      const ss = this.piece.sectionStarts!;
      const sectionIdx = ss.findLastIndex(x => pIdx >= x);
      this.contextMenuChoices = [];
      this.contextMenuChoices.push({
        text: `Edit Section ${sectionIdx} labels`,
        action: () => {
          this.contextMenuClosed = true;
          const eap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
          if (eap.showLabelControls === false) eap.toggleLabelControls();
          this.$nextTick(() => {
            const labelEditor = eap.$refs.labelControls as typeof LabelEditor;
            labelEditor.selectedHierarchy = 'Section';
            labelEditor.scrollToSection(sectionIdx);
          })
        },
        enabled: true
      });
      this.contextMenuChoices.push({
        text: `Edit Phrase ${pIdx} labels`,
        action: () => {
          this.contextMenuClosed = true;
          const eap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
          if (eap.showLabelControls === false) eap.toggleLabelControls();
          this.$nextTick(() => {
            const labelEditor = eap.$refs.labelControls as typeof LabelEditor;
            labelEditor.selectedHierarchy = 'Phrase';
            labelEditor.scrollToPhrase(pIdx);
          })
        },
        enabled: true
      })
      this.contextMenuClosed = false;
      

    },

    // trajContextMenuClick(e: MouseEvent) {
    //   if (!this.meterMode) {
    //     e.preventDefault();
    //     e.stopPropagation();
    //     this.contextMenuX = e.x;
    //     this.contextMenuY = e.y;
    //     const target = e.target as SVGPathElement;
    //     const trajID = target.id.split('__')[1];
    //     const tIdx = Number(trajID.split('t')[1]);
    //     const pIdx = Number(trajID.split('t')[0].split('p')[1]);
    //     const phrase = this.piece.phrases[pIdx];
    //     const traj = phrase.trajectories[tIdx];
        
    //     if (traj.groupId === undefined) {
    //       let insertSilenceLeft = false;
    //       let insertSilenceRight = false;
    //       let insertFixedLeft = false;
    //       let insertFixedRight = false;
    //       if (phrase.trajectories.length > tIdx + 1) {
    //         const nextTraj = phrase.trajectories[tIdx + 1];
    //         if (nextTraj.id !== 12) {
    //           insertSilenceRight = true;
    //         }
    //         if (nextTraj.id !== 0 && traj.id !== 0) {
    //           insertFixedRight = true;
    //         }
    //       } else if (this.piece.phrases.length > pIdx + 1) {
    //         const nextPhrase = this.piece.phrases[pIdx + 1];
    //         if (nextPhrase.trajectories.length > 0) {
    //           const nextTraj = nextPhrase.trajectories[0];
    //           if (nextTraj.id !== 12) {
    //             insertSilenceRight = true;
    //           }
    //           if (nextTraj.id !== 0 && traj.id !== 0) {
    //             insertFixedRight = true;
    //           }
    //         }
    //       }
    //       if (tIdx > 0) {
    //         const prevTraj = phrase.trajectories[tIdx - 1];
    //         if (prevTraj.id !== 12) {
    //           insertSilenceLeft = true;
    //         }
    //         if (prevTraj.id !== 0 && traj.id !== 0) {
    //           insertFixedLeft = true;
    //         }
    //       } else if (pIdx > 0) {
    //         const prevP = this.piece.phrases[pIdx - 1];
    //         if (prevP.trajectories.length > 0) {
    //           const prevTraj = prevP.trajectories[prevP.trajectories.length - 1];
    //           if (prevTraj.id !== 12) {
    //             insertSilenceLeft = true;
    //           }
    //           if (prevTraj.id !== 0 && traj.id !== 0) {
    //             insertFixedLeft = true;
    //           }
    //         }
    //       }
    //       this.contextMenuChoices = [];
    //       if (insertSilenceLeft) {
    //         this.contextMenuChoices.push({
    //           text: 'Insert Silence Left',
    //           action: () => {
    //             this.insertSilentTrajLeft(traj);
    //             this.contextMenuClosed = true;
    //           },
    //           enabled: true
    //         })
    //       }
    //       if (insertSilenceRight) {
    //         this.contextMenuChoices.push({
    //           text: 'Insert Silence Right',
    //           action: () => {
    //             this.insertSilentTrajRight(traj);
    //             this.contextMenuClosed = true;
    //           },
    //           enabled: true
    //         })
    //       } 
    //       if (insertFixedLeft) {
    //         this.contextMenuChoices.push({
    //           text: 'Insert Fixed Left',
    //           action: () => {
    //             this.insertFixedTrajLeft(traj);
    //             this.contextMenuClosed = true;
    //           },
    //           enabled: true
    //         })
    //       }
    //       if (insertFixedRight) {
    //         this.contextMenuChoices.push({
    //           text: 'Insert Fixed Right',
    //           action: () => {
    //             this.insertFixedTrajRight(traj);
    //             this.contextMenuClosed = true;
    //           },
    //           enabled: true

    //         })
    //       };
    //       if (tIdx > 0) {
    //         const pt = phrase.trajectories[tIdx - 1];
    //         if (pt.groupId !== undefined && this.selectedTrajs.includes(pt)) {
    //           this.contextMenuChoices.push({
    //             text: 'Add to Selected Group',
    //             action: () => {
    //               this.addTrajToSelectedGroup(traj);
    //               this.contextMenuClosed = true;
    //             },
    //             enabled: true
    //           })
    //         }
    //       }
    //       if (phrase.trajectories.length > tIdx + 1) {
    //         const nt = phrase.trajectories[tIdx + 1];
    //         if (nt.groupId !== undefined && this.selectedTrajs.includes(nt)) {
    //           this.contextMenuChoices.push({
    //             text: 'Add to Selected Group',
    //             action: () => {
    //               this.addTrajToSelectedGroup(traj);
    //               this.contextMenuClosed = true;
    //             },
    //             enabled: true
    //           })
    //         }
    //       }
    //       const selTrajCond = this.selectedTrajs.length === 1 && 
    //         this.selectedTrajs[0] === traj;
    //       if (
    //         (this.selectedTrajs.length === 0 || selTrajCond) &&
    //         (this.sarangi || this.vocal)
    //         ) {
    //         this.contextMenuChoices.push({
    //           text: 'Adjust Volume',
    //           action: () => {
    //             const phrase = this.piece.phrases[pIdx];
    //             const startTime = phrase.startTime! + traj.startTime!;
    //             const xStart = this.xr()(startTime);
    //             const xEnd = this.xr()(startTime + traj.durTot);
    //             this.autoWindowWidth = xEnd - xStart + 40;
    //             const minLogFreq = Math.min(...traj.logFreqs);
    //             const yPxl = this.yr()(minLogFreq) + this.navHeight;
    //             this.autoTrajs = [traj];
    //             this.autoWindowOpen = true;
    //             this.contextMenuClosed = true;
    //             this.autoWindowX = xStart - 20;
    //             this.autoWindowY = yPxl + 20;
    //           },
    //           enabled: this.editable
    //         })
    //       } else if (this.selectedTrajsGroupable() && (this.sarangi || this.vocal)) {
    //         this.contextMenuChoices.push({
    //           text: 'Adjust Volume',
    //           action: () => {
    //             const startTraj = this.selectedTrajs[0];
    //             const startPIdx = startTraj.phraseIdx!;
    //             const startPhrase = this.piece.phrases[startPIdx];
    //             const startTime = phrase.startTime! + startTraj.startTime!;
    //             const endTraj = this.selectedTrajs[this.selectedTrajs.length - 1];
    //             const endPIdx = endTraj.phraseIdx!;
    //             const endPhrase = this.piece.phrases[endPIdx];
    //             const xStart = this.xr()(startTime);
    //             const endTime = endPhrase.startTime! + endTraj.startTime! + endTraj.durTot;
    //             const xEnd = this.xr()(endTime);
    //             this.autoWindowWidth = xEnd - xStart + 40;
    //             let minLogFreq = Infinity;
    //             this.selectedTrajs.forEach(traj => {
    //               const min = Math.min(...traj.logFreqs);
    //               if (min < minLogFreq) minLogFreq = min;
    //             });
    //             const yPxl = this.yr()(minLogFreq) + this.navHeight;
    //             this.autoTrajs = this.selectedTrajs;
    //             this.autoWindowOpen = true;
    //             this.autoWindowX = xStart - 20;
    //             this.autoWindowY = yPxl + 20;
    //             this.contextMenuClosed = true;
    //           },
    //           enabled: this.editable
    //         })
    //       }
    //     } else {
    //       let groupInsertSilenceLeft = false;
    //       let groupInsertSilenceRight = false;
    //       let groupInsertFixedLeft = false;
    //       let groupInsertFixedRight = false;
    //       const group = phrase.getGroupFromId(traj.groupId)!;
    //       const firstTraj = group.trajectories[0];
    //       const lastTraj = group.trajectories[group.trajectories.length - 1];
    //       if (phrase.trajectories.length > lastTraj.num! + 1) {
    //         const nextTraj = phrase.trajectories[lastTraj.num! + 1];
    //         if (nextTraj.id !== 12) {
    //           groupInsertSilenceRight = true;
    //         }
    //         if (nextTraj.id !== 0 && lastTraj.id !== 0) {
    //           groupInsertFixedRight = true;
    //         }
    //       } else if (this.piece.phrases.length > pIdx + 1) {
    //         const nextPhrase = this.piece.phrases[pIdx + 1];
    //         if (nextPhrase.trajectories.length > 0) {
    //           const nextTraj = nextPhrase.trajectories[0];
    //           if (nextTraj.id !== 12) {
    //             groupInsertSilenceRight = true;
    //           }
    //           if (nextTraj.id !== 0 && lastTraj.id !== 0) {
    //             groupInsertFixedRight = true;
    //           }
    //         }
    //       }
    //       if (firstTraj.num! > 0) {
    //         const prevTraj = phrase.trajectories[firstTraj.num! - 1];
    //         if (prevTraj.id !== 12) {
    //           groupInsertSilenceLeft = true;
    //         }
    //         if (prevTraj.id !== 0 && firstTraj.id !== 0) {
    //           groupInsertFixedLeft = true;
    //         }
    //       } else if (pIdx > 0) {
    //         const prevP = this.piece.phrases[pIdx - 1];
    //         if (prevP.trajectories.length > 0) {
    //           const prevT = prevP.trajectories[prevP.trajectories.length - 1];
    //           if (prevT.id !== 12) {
    //             groupInsertSilenceLeft = true;
    //           }
    //           if (prevT.id !== 0 && firstTraj.id !== 0) {
    //             groupInsertFixedLeft = true;
    //           }
    //         }
    //       };
    //       this.contextMenuChoices = [];
    //       if (groupInsertSilenceLeft) {
    //         this.contextMenuChoices.push({
    //           text: 'Insert Silence Left',
    //           action: () => {
    //             this.insertSilentTrajLeft(firstTraj);
    //             this.contextMenuClosed = true;
    //           },
    //           enabled: true
    //         })
    //       }
    //       if (groupInsertSilenceRight) {
    //         this.contextMenuChoices.push({
    //           text: 'Insert Silence Right',
    //           action: () => {
    //             this.insertSilentTrajRight(lastTraj);
    //             this.contextMenuClosed = true;
    //           },
    //           enabled: true
    //         })
    //       }
    //       if (groupInsertFixedLeft) {
    //         this.contextMenuChoices.push({
    //           text: 'Insert Fixed Left',
    //           action: () => {
    //             this.insertFixedTrajLeft(firstTraj);
    //             this.contextMenuClosed = true;
    //           },
    //           enabled: true
    //         })
    //       }
    //       if (groupInsertFixedRight) {
    //         this.contextMenuChoices.push({
    //           text: 'Insert Fixed Right',
    //           action: () => {
    //             this.insertFixedTrajRight(lastTraj);
    //             this.contextMenuClosed = true;
    //           },
    //           enabled: true
    //         })
    //       }
    //       if (this.selectedTrajsGroupable() && (this.sarangi || this.vocal)) {
    //         this.contextMenuChoices.push({
    //           text: 'Adjust Volume',
    //           action: () => {
    //             const startTraj = this.selectedTrajs[0];
    //             const startPIdx = startTraj.phraseIdx!;
    //             const startPhrase = this.piece.phrases[startPIdx];
    //             const startTime = phrase.startTime! + startTraj.startTime!;
    //             const endTraj = this.selectedTrajs[this.selectedTrajs.length - 1];
    //             const endPIdx = endTraj.phraseIdx!;
    //             const endPhrase = this.piece.phrases[endPIdx];
    //             const xStart = this.xr()(startTime);
    //             const endTime = endPhrase.startTime! + endTraj.startTime! + endTraj.durTot;
    //             const xEnd = this.xr()(endTime);
    //             this.autoWindowWidth = xEnd - xStart + 40;
    //             let minLogFreq = Infinity;
    //             this.selectedTrajs.forEach(traj => {
    //               const min = Math.min(...traj.logFreqs);
    //               if (min < minLogFreq) minLogFreq = min;
    //             });
    //             const yPxl = this.yr()(minLogFreq) + this.navHeight;
    //             this.autoTrajs = this.selectedTrajs;
    //             this.autoWindowOpen = true;
    //             this.autoWindowX = xStart - 20;
    //             this.autoWindowY = yPxl + 20;
    //             this.contextMenuClosed = true;
    //           },
    //           enabled: this.editable
    //         })
    //       }
    //     };
    //     const pArt = traj.articulations['0.00'];
    //     if (pArt && pArt.name === 'pluck') {
    //       const nChoices: StrokeNicknameType[] = 
    //         ['da', 'di', 'd', 'ra', 'ri', 'r',];
    //       nChoices.forEach(n => {
    //         const add = pArt.strokeNickname === n ? ' \u2713' : '';
    //         this.contextMenuChoices.push({
    //           text: `Stroke: ${n + add}`,
    //           action: () => {
    //             if (pArt.strokeNickname !== n) {
    //               this.updatePluckNickname(traj, n);
    //               this.resetBols();
    //             }
    //             this.contextMenuClosed = true;
    //           },
    //           enabled: true
    //         })
    //       })
    //     }
    //     if (this.contextMenuChoices.length > 0) {
    //       this.contextMenuClosed = false;
    //     }
    //   }
    // },

    addArticulations(
        traj: Trajectory, 
        phraseStart: number, 
        vowelIdxs: number[]
        ) {
      const g = this.phraseG.append('g')
        .attr('id', `articulations__p${traj.phraseIdx}t${traj.num}`)
      this.addPlucks(traj, phraseStart, g)
      this.addKrintin(traj, phraseStart, g)
      this.addSlide(traj, phraseStart, g)
      this.addConsonantSymbols(traj, phraseStart, g)
      this.addDampener(traj, phraseStart, g)
      if (this.vocal) {
        // this.addStartingConsonant(traj, phraseStart, g)
        this.addEndingConsonant(traj, phraseStart, g)
        if (vowelIdxs.includes(traj.num!)) {
          this.addVowel(traj, phraseStart, g)
        }
      }   
    },

    codifiedAddArticulations(
        traj: Trajectory, 
        phraseStart: number, 
        vowelIdxs: number[]
        ) {
      const g = this.phraseG.append('g')
        .attr('id', `articulations__p${traj.phraseIdx}t${traj.num}`)
      this.codifiedAddPlucks(traj, phraseStart, g);
      this.codifiedAddKrintin(traj, phraseStart, g);
      this.codifiedAddSlide(traj, phraseStart, g);
      this.addConsonantSymbols(traj, phraseStart, g, true);
      this.codifiedAddDampener(traj, phraseStart, g);
      if (this.vocal) {
        // this.addStartingConsonant(traj, phraseStart, g, true);
        this.addEndingConsonant(traj, phraseStart, g, true);
        if (vowelIdxs.includes(traj.num!)) {
          this.addVowel(traj, phraseStart, g, true);
        }
      }
    },

    removeConsonantSymbol(id: string, start=true) {
      const str = start ? `#start_consonant_${id}` : `#end_consonant_${id}`;
      d3Select(str).remove();
    },

    removePlucks(traj: Trajectory) {
      const pIdx = traj.phraseIdx;
      const tIdx = traj.num;
      const id = `#pluckp${pIdx}t${tIdx}`;
      d3SelectAll(id).remove()
    },

    addPlucks(
        traj: Trajectory, 
        phraseStart: number, 
        g: d3.Selection<SVGGElement, any, any, any>
        ) {
      if (traj.id !== 12) {
        const size = 20;
        const offset = (size ** 0.5 ) / 2;
        
        const keys = Object.keys(traj.articulations);
        const relKeys = keys.filter(key => {
          return traj.articulations[key].name === 'pluck'
        });
        if (relKeys.length > 0) {
          
          const pluckData = relKeys.map(p => {
            const normedX = Number(p) * traj.durTot;
            const y = traj.compute(normedX, true);
            return {
              x: phraseStart + traj.startTime! + Number(p),
              y: y
            }
          });
          
          const sym = d3Symbol().type(d3SymbolTriangle).size(size);
          const x = (d: DrawDataType) => this.xr()(d.x);
          const y = (d: DrawDataType) => this.yr()(d.y);
          g.append('g')
            .classed('articulation', true)
            .classed('pluck', true)
            .append('path')
            .attr('d', sym)
            .attr('id', `pluckp${traj.phraseIdx}t${traj.num}`)
            .attr('stroke', 'black')
            .attr('stroke-width', 1.5)
            .attr('fill', 'black')
            .attr('cursor', 'pointer')
            .on('mouseover', this.handleMouseOver)
            .on('mouseout', this.handleMouseOut)
            .on('click', this.handleClickTraj)
            .data(pluckData)
            .attr('transform', d => {
              return `translate(${x(d) + offset}, ${y(d)}) rotate(90)`
            })          
        }
      }
    },

    codifiedAddPlucks(
        traj: Trajectory, 
        phraseStart: number, 
        g: d3.Selection<SVGGElement, any, any, any>
        ) {
      const size = 20;
      const offset = (size ** 0.5 ) / 2;
      if (traj.id !== 12) {
        const keys = Object.keys(traj.articulations);
        const relKeys = keys.filter(key => {
          return traj.articulations[key].name === 'pluck'
        });
        if (relKeys.length > 0) {
          const pluckData = relKeys.map(p => {
          const normedX = Number(p) * traj.durTot;
          const y = traj.compute(normedX, true);
          return {
            x: phraseStart + traj.startTime! + Number(p),
            y: y
          }
        });
        const x = (d: DrawDataType) => this.codifiedXR!(d.x);
        const y = (d: DrawDataType) => this.codifiedYR!(d.y);
        const sym = d3Symbol().type(d3SymbolTriangle).size(size);
        g.append('g')
          .classed('articulation', true)
          .classed('pluck', true)
          .classed('codified', true)
          .append('path')
          .attr('d', sym)
          .attr('id', `pluckp${traj.phraseIdx}t${traj.num}`)
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'black')
          .attr('cursor', 'pointer')
          .on('mouseover', this.handleMouseOver)
          .on('mouseout', this.handleMouseOut)
          .on('click', this.handleClickTraj)
          .data(pluckData)
          .attr('transform', d => {
            return `translate(${x(d) + offset}, ${y(d)}) rotate(90)`
          })
        }
      }
    },

    addConsonantSymbols(
        traj: Trajectory, 
        phraseStart: number, 
        g: d3.Selection<SVGGElement, any, any, any>, 
        codified=false, 
        startOnly=false, 
        endOnly=false) {
      if (traj.id !== 12) {
        const arts = traj.articulations;
        const a = arts['0.00'];
        const c1 = a !== undefined && a.name === 'consonant';

        if (c1 && !endOnly) {
          const x = phraseStart + traj.startTime!;
          const y = traj.compute(0, true);
          const scaledX = codified ? this.codifiedXR!(x) : this.xr()(x);
          const scaledY = codified ? this.codifiedYR!(y) : this.yr()(y);
          const sym = d3Symbol().type(d3SymbolDiamond).size(40);
          g.append('path')
            .classed('articulation', true)
            .classed('consonantSymbol', true)
            .attr('d', sym)
            .attr('id', `start_consonant_p${traj.phraseIdx}t${traj.num}`)
            .attr('fill', 'black')
            .attr('cursor', 'pointer')
            .on('mouseover', this.handleMouseOver)
            .on('mouseout', this.handleMouseOut)
            .on('click', this.handleClickTraj)
            .attr('transform', `translate(${scaledX}, ${scaledY})`)

        }
        const a1 = arts['1.00'];
        const c2 = a1 !== undefined && a1.name === 'consonant';

        if (c2 && !startOnly) {
          const x = phraseStart + traj.startTime! + traj.durTot;
          const y = traj.compute(1, true);
          const scaledX = codified ? this.codifiedXR!(x) : this.xr()(x);
          const scaledY = codified ? this.codifiedYR!(y) : this.yr()(y);
          const sym = d3Symbol().type(d3SymbolDiamond).size(40);
          g.append('path')
            .classed('articulation', true)
            .classed('consonantSymbol', true)
            .attr('d', sym)
            .attr('id', `end_consonant_p${traj.phraseIdx}t${traj.num}`)
            .attr('fill', 'black')
            .attr('cursor', 'pointer')
            .on('mouseover', this.handleMouseOver)
            .on('mouseout', this.handleMouseOut)
            .on('click', this.handleClickTraj)
            .attr('transform', `translate(${scaledX}, ${scaledY})`)
        }
      }
    },

    moveConsonantSymbols(
        traj: Trajectory, 
        phraseStart: number, 
        codified=false
        ) {
      if (traj.id !== 12) {
        const arts = traj.articulations;
        if (arts['0.00'] !== undefined && arts['0.00'].name === 'consonant') {
          const x = phraseStart + traj.startTime!;
          const y = traj.compute(0, true);
          const scaledX = codified ? this.codifiedXR!(x) : this.xr()(x);
          const scaledY = codified ? this.codifiedYR!(y) : this.yr()(y);
          d3Select(`#start_consonant_p${traj.phraseIdx}t${traj.num}`)
            .attr('transform', `translate(${scaledX}, ${scaledY})`)
        }
        if (arts['1.00'] !== undefined && arts['1.00'].name === 'consonant') {
          const x = phraseStart + traj.startTime! + traj.durTot;
          const y = traj.compute(1, true);
          const scaledX = codified ? this.codifiedXR!(x) : this.xr()(x);
          const scaledY = codified ? this.codifiedYR!(y) : this.yr()(y);
          d3Select(`#end_consonant_p${traj.phraseIdx}t${traj.num}`)
            .attr('transform', `translate(${scaledX}, ${scaledY})`)
        }
      }
    },

    addStartingConsonant(
        traj: Trajectory, 
        phraseStart: number, 
        g: d3.Selection<SVGGElement, any, any, any>, 
        codified=false) {
      if (traj.id !== 12) {
        const keys = Object.keys(traj.articulations);
        const relKeys = keys.filter(key => {
          const c1 = traj.articulations[key].name === 'consonant';
          const c2 = key === '0.00';
          return c1 && c2;
        });
        if (relKeys[0] !== undefined) {
          const key = relKeys[0];
          const normedX = Number(key) * traj.durTot;
          const y_ = traj.compute(Number(key), true);
          let text = '';
          if (this.phonemeRepresentation === 'IPA') {
            text = traj.articulations[key].ipa!;
          } else if (this.phonemeRepresentation === 'Devanagari') {
            text = traj.articulations[key].hindi!;
          } else if (this.phonemeRepresentation === 'English') {
            text = traj.articulations[key].engTrans!;
          }
          const cd = {
            x: phraseStart + traj.startTime! + normedX,
            y: y_,
            text: text
          }
          let x = (d: DrawDataType) => this.xr()(d.x);
          let y = (d: DrawDataType) => this.yr()(d.y);
          if (codified) {
            x = (d: DrawDataType) => this.codifiedXR!(d.x);
            y = (d: DrawDataType) => this.codifiedYR!(d.y);
          }
          g.append('text')
            .classed('articulation', true)
            .classed('consonant', true)
            .attr('id', `startConsonantp${traj.phraseIdx}t${traj.num}`)
            .attr('stroke', 'black')
            .attr('font-size', '15px')
            .attr('text-anchor', 'middle')
            .data([cd])
            .attr('transform', d => `translate(${x(d)}, ${y(d) - 14})`)
            .text(cd.text)
        }
      }
    },

    addEndingConsonant(
        traj: Trajectory, 
        phraseStart: number, 
        g: d3.Selection<SVGGElement, any, any, any>, 
        codified=false) {
      if (traj.id !== 12) {
        const keys = Object.keys(traj.articulations);
        const relKeys = keys.filter(key => {
          const c1 = traj.articulations[key].name === 'consonant';
          const c2 = key === '1.00';
          return c1 && c2;
        });
        if (relKeys[0] !== undefined) {
          const key = relKeys[0];
          const normedX = Number(key) * traj.durTot;
          const y_ = traj.compute(Number(key), true);

          let text = '';
          if (this.phonemeRepresentation === 'IPA') {
            text = traj.articulations[key].ipa!;
          } else if (this.phonemeRepresentation === 'Devanagari') {
            text = traj.articulations[key].hindi!;
          } else if (this.phonemeRepresentation === 'English') {
            text = traj.articulations[key].engTrans!;
          }
          

          const cd = {
            x: phraseStart + traj.startTime! + normedX,
            y: y_,
            text: text
          }
          let x = (d: DrawDataType) => this.xr()(d.x);
          let y = (d: DrawDataType) => this.yr()(d.y);
          if (codified) {
            x = (d: DrawDataType) => this.codifiedXR!(d.x);
            y = (d: DrawDataType) => this.codifiedYR!(d.y);
          }
          let offset = 0;
          // if next traj is not silent, the x needs to be adjusted to the left
          // so as not to overlap
          const phrase = this.piece.phrases[traj.phraseIdx!];
          let nextTraj: Trajectory | undefined = undefined;
          if (traj.num! < phrase.trajectories.length - 1) {
            nextTraj = phrase.trajectories[traj.num! + 1];
          } else if (this.piece.phrases.length > traj.phraseIdx! + 1) {
            nextTraj = this.piece.phrases[traj.phraseIdx! + 1].trajectories[0];
          }
          if (nextTraj !== undefined && nextTraj.id !== 12) {
            offset = -5;
          }          
          const tFunc = (d: DrawDataType) => {
            return `translate(${x(d) + offset}, ${y(d) - 14})`;
          }
          g.append('text')
            .classed('articulation', true)
            .classed('consonant', true)
            .attr('id', `endConsonantp${traj.phraseIdx}t${traj.num}`)
            .attr('stroke', 'black')
            .attr('font-size', '15px')
            .attr('text-anchor', 'middle')
            .data([cd])
            .attr('transform', tFunc)
            .text(cd.text)
        }
      }
    },

    addVowel(
        traj: Trajectory, 
        phraseStart: number, 
        g: d3.Selection<SVGGElement, any, any, any>, 
        codified = false
        ) {
      if (traj.id !== 12) {
        const withC = traj.startConsonant !== undefined;
        const art = withC ? traj.articulations['0.00'] : undefined;
        let text: string = '';
        if (this.phonemeRepresentation === 'IPA') {
          text = withC ? art!.ipa! + traj.vowelIpa! : traj.vowelIpa!;
        } else if (this.phonemeRepresentation === 'Devanagari') {
          text = withC ? 
            art!.hindi! + traj.vowelHindi! : 
            traj.vowelHindi!;
        } else if (this.phonemeRepresentation === 'English') {
          text = withC ? 
            art!.engTrans! + traj.vowelEngTrans! : 
            traj.vowelEngTrans!;
        }
        let x = (d: DrawDataType) => this.xr()(d.x);
        let y = (d: DrawDataType) => this.yr()(d.y);
        if (codified) {
          x = (d: DrawDataType) => this.codifiedXR!(d.x);
          y = (d: DrawDataType) => this.codifiedYR!(d.y);
        }
        const cd = {
          x: phraseStart + traj.startTime!,
          y: traj.compute(0, true),
          text: text
        }
        const pxlOffset = 12;
        const timeOffset = this.xr().invert(pxlOffset) - this.xr().invert(0);
        let ctrCompute = traj.compute(0, true);
        ctrCompute = y({ y:ctrCompute, x: 0 });
        let yVal = ctrCompute;
        const txtElem = g.append('text')
          .text(cd.text)
          .classed('articulation', true)
          .classed('vowel', true)
          .attr('id', `vowelp${traj.phraseIdx}t${traj.num}`)
          .attr('stroke', 'black')
          .attr('font-size', '15px')
          .attr('text-anchor', 'left')
          .data([cd])
        
        txtElem.attr('transform', function(d){
            return `translate(${x(d)}, ${yVal - 14})`
        })
      }
    },

    moveSConsonant(
        traj: Trajectory, 
        phraseStart: number, 
        codified=false
        ) {
      if (traj.id !== 12) {
        const key = '0.00';
        if (traj.articulations[key] !== undefined) {
          const normedX = Number(key) * traj.durTot;
          const y_ = traj.compute(Number(key), true);
          const cd = {
            x: phraseStart + traj.startTime! + normedX,
            y: y_,
            text: traj.articulations[key].stroke
          };
          let x = (d: DrawDataType) => this.xr()(d.x);
          let y = (d: DrawDataType) => this.yr()(d.y);
          if (codified) {
            x = (d: DrawDataType) => this.codifiedXR!(d.x);
            y = (d: DrawDataType) => this.codifiedYR!(d.y);
          }
          d3Select(`#startConsonantp${traj.phraseIdx}t${traj.num}`)
            .data([cd])
            .attr('transform', d => `translate(${x(d)}, ${y(d) - 14})`)
        }
      }
    },

    moveVowel(traj: Trajectory, phraseStart: number, codified=false) {
      if (traj.id !== 12) {
        let text;
          if (this.phonemeRepresentation === 'IPA') {
            text = traj.vowelIpa;
          } else if (this.phonemeRepresentation === 'Devanagari') {
            text = traj.vowelHindi;
          } else if (this.phonemeRepresentation === 'English') {
            text = traj.vowelEngTrans;
          }
        const cd = {
          x: phraseStart + traj.startTime!,
          y: traj.compute(0, true),
          text: text
        };
        let x = (d: DrawDataType) => this.xr()(d.x);
        let y = (d: DrawDataType) => this.yr()(d.y);
        if (codified) {
          x = (d: DrawDataType) => this.codifiedXR!(d.x);
          y = (d: DrawDataType) => this.codifiedYR!(d.y);
        }
        // const pxlOffset = 12;
        // const timeOffset = this.xr().invert(pxlOffset) - this.xr().invert(0);
        // const leftTime = phraseStart + traj.startTime! - timeOffset;
        let ctrCompute = traj.compute(0, true);
        ctrCompute = y({ y: ctrCompute, x: 0 });
        let yVal = ctrCompute;
        const id = `#vowelp${traj.phraseIdx}t${traj.num}`;
        d3Select(id)
          .data([cd])
          .attr('transform', d => `translate(${x(d)}, ${yVal - 14})`)
      }
    },

    // groupSelectedTrajs() {
    //   if (this.selectedTrajsGroupable()) {
    //     const pIdx = this.selectedTrajs[0].phraseIdx;
    //     const phrase = this.piece.phrases[Number(pIdx)];
    //     const group = new Group({ trajectories: this.selectedTrajs });
    //     phrase.getGroups(0).push(group)
    //   } else {
    //     throw new Error('Cannot group selected trajectories');
    //   }
    // },

    // ungroupSelectedTrajs() {
    //   if (this.selectedTrajsConstituteAGroup()) {
    //     const groupId = this.selectedTrajs[0].groupId;
    //     this.selectedTrajs.forEach(traj => {
    //       traj.groupId = undefined
    //     });
    //     const pIdx = this.selectedTrajs[0].phraseIdx;
    //     const phrase = this.piece.phrases[Number(pIdx)];
    //     const groups = phrase.getGroups(0);
    //     // remove group from groups
    //     const idx = groups.findIndex(group => group.id === groupId);
    //     groups.splice(idx, 1);

    //   } else {
    //     throw new Error('Cannot ungroup selected trajectories');
    //   }
    // },

    // selectedTrajsConstituteAGroup() {
    //   const phrase = this.piece.phrases[this.selectedTrajs[0]!.phraseIdx!];
    //   const id = this.selectedTrajs[0].groupId!;
    //   const group = phrase.getGroupFromId(id)!;
    //   const c1 = group.trajectories.length === this.selectedTrajs.length;
    //   const c2 = this.selectedTrajs.every(traj => traj.groupId === id);
    //   return c1 && c2
    // },

    moveEConsonant(
        traj: Trajectory, 
        phraseStart: number, 
        codified=false
        ) {
      if (traj.id !== 12) {
        const key = '1.00';
        if (traj.articulations[key] !== undefined) {
          const normedX = Number(key) * traj.durTot;
          const y_ = traj.compute(Number(key), true);
          const cd = {
            x: phraseStart + traj.startTime! + normedX,
            y: y_,
            text: traj.articulations[key].stroke
          };
          let x = (d: DrawDataType) => this.xr()(d.x);
          let y = (d: DrawDataType) => this.yr()(d.y);
          if (codified) {
            x = (d: DrawDataType) => this.codifiedXR!(d.x);
            y = (d: DrawDataType) => this.codifiedYR!(d.y);
          }
          let offset = 0;
          // if next traj is not silent, the x needs to be adjusted to the left
          // so as not to overlap
          const phrase = this.piece.phrases[traj.phraseIdx!];
          let nextTraj: Trajectory | undefined = undefined;
          if (traj.num! < phrase.trajectories.length - 1) {
            nextTraj = phrase.trajectories[traj.num! + 1];
          } else if (this.piece.phrases.length > traj.phraseIdx! + 1) {
            nextTraj = this.piece.phrases[traj.phraseIdx! + 1].trajectories[0];
          }
          if (nextTraj !== undefined && nextTraj.id !== 12) {
            offset = -5;
          } 
          d3Select(`#endConsonantp${traj.phraseIdx}t${traj.num}`)
            .data([cd])
            .attr('transform', d => `translate(${x(d) + offset}, ${y(d) - 14})`)
        }
      }
    },

    updatePluckNickname(traj: Trajectory, n: StrokeNicknameType) {
      const dNames = ['da', 'd', 'di'];
      const rNames = ['ra', 'r', 'ri'];
      if (dNames.includes(n)) {
        traj.articulations['0.00'].stroke = 'd';
        
      } else if (rNames.includes(n)) {
        traj.articulations['0.00'].stroke = 'r';
      }
      traj.articulations['0.00'].strokeNickname = n;
      // update save status
      this.unsavedChanges = true;
    },

    addKrintin(
        traj: Trajectory, 
        phraseStart: number, 
        g: d3.Selection<SVGGElement, any, any, any>
        ) {
      // hammer-offs
      const keys = Object.keys(traj.articulations);
      const hammerOffKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-off'
      });
      const hammerOffData = hammerOffKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y,
          i: i
        }
      });
      hammerOffData.forEach(obj => {
        const x = (d: DrawDataType) => this.xr()(d.x);
        const y = (d: DrawDataType) => this.yr()(d.y);
        if (x(obj) === undefined) {
          console.log(traj)
        }
        g.append('path')
          .classed('articulation', true)
          .classed('hammer-off', true)
          .attr('id', `hammeroffp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3Line()([[-10, 0], [0, 0], [0, 10]]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .on('mouseover', this.handleMouseOver)
          .on('mouseout', this.handleMouseOut)
          .on('click', this.handleClickTraj)
          .attr('marker-end', 'url(#arrow)')
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })

      // hammer-ons
      const hammerOnKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-on'
      });
      const hammerOnData = hammerOnKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y,
          i: i
        }
      });
      hammerOnData.forEach(obj => {
        const x = (d: DrawDataType) => this.xr()(d.x);
        const y = (d: DrawDataType) => this.yr()(d.y);
        g.append('path')
          .classed('articulation', true)
          .classed('hammer-on', true)
          .attr('id', `hammeronp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3Line()([[-10, 0], [0, 0], [0, -10]]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .on('mouseover', this.handleMouseOver)
          .on('mouseout', this.handleMouseOut)
          .on('click', this.handleClickTraj)
          .attr('marker-end', 'url(#arrow)')
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })
    },

    codifiedAddKrintin(
        traj: Trajectory, 
        phraseStart: number, 
        g: d3.Selection<SVGGElement, any, any, any>
        ) {
      // hammer-offs
      const keys = Object.keys(traj.articulations);
      const hammerOffKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-off'
      });
      const hammerOffData = hammerOffKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y,
          i: i
        }
      });
      const x = (d: DrawDataType) => this.codifiedXR!(d.x);
      const y = (d: DrawDataType) => this.codifiedYR!(d.y);
      hammerOffData.forEach(obj => {
        g.append('path')
          .classed('articulation', true)
          .classed('hammer-off', true)
          .attr('id', `hammeroffp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3Line()([[-10, 0], [0, 0], [0, 10]]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .on('mouseover', this.handleMouseOver)
          .on('mouseout', this.handleMouseOut)
          .on('click', this.handleClickTraj)
          .attr('marker-end', 'url(#arrow)')
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })

      // hammer-ons
      const hammerOnKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-on'
      });
      const hammerOnData = hammerOnKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y,
          i: i
        }
      });
      hammerOnData.forEach(obj => {
        g.append('path')
          .classed('articulation', true)
          .classed('hammer-on', true)
          .attr('id', `hammeronp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3Line()([[-10, 0], [0, 0], [0, -10]]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .on('mouseover', this.handleMouseOver)
          .on('mouseout', this.handleMouseOut)
          .on('click', this.handleClickTraj)
          .attr('marker-end', 'url(#arrow)')
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })
    },

    moveKrintin(traj: Trajectory, phraseStart: number) {
      // hammer-offs
      const keys = Object.keys(traj.articulations);
      const hammerOffKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-off'
      })
      const hammerOffData = hammerOffKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y,
          i: i
        }
      });
      const x = (d: DrawDataType) => this.codifiedXR!(d.x);
      const y = (d: DrawDataType) => this.codifiedYR!(d.y);
      hammerOffData.forEach(obj => {
        d3Select(`#hammeroffp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      });
      // hammer-ons
      const hammerOnKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-on'
      });
      const hammerOnData = hammerOnKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y,
          i: i
        }
      });

      hammerOnData.forEach(obj => {
        d3Select(`#hammeronp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })
    },

    makeTrajData(traj: Trajectory, phraseStart: number) {
      const startTime = traj.startTime! + phraseStart;
      const endTime = startTime + traj.durTot;
      const timePts = Math.round((endTime - startTime) / this.minDrawDur);
      const drawTimes = linSpace(startTime, endTime, timePts);
      const mp = (t: number) => (t - startTime) / (endTime - startTime);
      const trajDrawXs = drawTimes.map(mp);
      const trajDrawYs = trajDrawXs.map(x => traj.compute(x))
      return trajDrawYs.map((y, i) => {
        return {
          x: drawTimes[i],
          y: y
        }
      });
    },

    addSlide(
      traj: Trajectory, 
      phraseStart: number, 
      g: d3.Selection<SVGGElement, any, any, any>
    ) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => {
        return traj.articulations[key].name === 'slide'
      });
      const data = relKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        const dirUp = y < traj.compute(Number(p), true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y,
          dirUp: dirUp,
          i: i
        }
      });
      const x = (d: DrawDataType) => this.xr()(d.x);
      const y = (d: DrawDataType) => this.yr()(d.y);
      data.forEach(obj => {
        const yMotion = obj.dirUp ? [10, -10] : [-10, 10];
        g.append('path')
          .classed('articulation', true)
          .classed('slide', true)
          .attr('id', `slidep${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3Line()([[0, 0 + yMotion[0]], [0, 0 + yMotion[1]]]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .on('mouseover', this.handleMouseOver)
          .on('mouseout', this.handleMouseOut)
          .on('click', this.handleClickTraj)
          .attr('cursor', 'pointer')
          .attr('marker-end', 'url(#arrow)')
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })
    },

    codifiedAddSlide(
        traj: Trajectory, 
        phraseStart: number, 
        g: d3.Selection<SVGGElement, any, any, any>
        ) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => {
        return traj.articulations[key].name === 'slide'
      });
      const data = relKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        const dirUp = y < traj.compute(Number(p), true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y,
          dirUp: dirUp,
          i: i
        }
      });
      const x = (d: DrawDataType) => this.codifiedXR!(d.x);
      const y = (d: DrawDataType) => this.codifiedYR!(d.y);
      data.forEach(obj => {
        const yMotion = obj.dirUp ? [10, -10] : [-10, 10];
        g.append('path')
          .classed('articulation', true)
          .classed('slide', true)
          .attr('id', `slidep${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3Line()([[0, 0 + yMotion[0]], [0, 0 + yMotion[1]]]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .on('mouseover', this.handleMouseOver)
          .on('mouseout', this.handleMouseOut)
          .on('click', this.handleClickTraj)
          .attr('marker-end', 'url(#arrow)')
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })
    },

    moveSlides(traj: Trajectory, phraseStart: number) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => {
        return traj.articulations[key].name === 'slide'
      });
      const data = relKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        const dirUp = y < traj.compute(Number(p), true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y,
          dirUp: dirUp,
          i: i
        }
      });
      const x = (d: DrawDataType) => this.codifiedXR!(d.x);
      const y = (d: DrawDataType) => this.codifiedYR!(d.y);
      data.forEach(obj => {
        const yMotion = obj.dirUp ? [10, -10] : [-10, 10];
        d3Select(`#slidep${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3Line()([[0, 0 + yMotion[0]], [0, 0 + yMotion[1]]]))
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })
    },

    addMarkers() {
      const markerBoxWidth = 4;
      const markerBoxHeight = 4;
      const refX = markerBoxWidth / 2;
      const refY = markerBoxHeight / 2;
      const arrowPoints: [number, number][] = [
        [0, 0],
        [0, 4],
        [4, 2]
      ];
      this.defs
        .append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', [0, 0, markerBoxWidth, markerBoxHeight])
        .attr('refX', refX)
        .attr('refY', refY)
        .attr('markerWidth', markerBoxWidth)
        .attr('markerHeight', markerBoxHeight)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', d3Line()(arrowPoints))
        .attr('fill', 'black')

      this.defs
        .append('marker')
        .attr('id', 'selectedArrow')
        .attr('viewBox', [0, 0, markerBoxWidth, markerBoxHeight])
        .attr('refX', refX)
        .attr('refY', refY)
        .attr('markerWidth', markerBoxWidth)
        .attr('markerHeight', markerBoxHeight)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', d3Line()(arrowPoints))
        .attr('fill', this.selArtColor)
    },
    
    idFromKey(key: string | number, idx: number) {
      const sec = Math.floor(Number(key));
      const dec = (Number(key) % 1).toFixed(2).toString().slice(2);
      return `p${idx}_${sec}_${dec}`;
    },

    addChikaris() {
      const sym = d3Symbol().type(d3SymbolX).size(80);
      this.piece.phrases.forEach(phrase => {
        Object.keys(phrase.chikaris).forEach(key => {
          const scaledX = Number(key) / phrase.durTot!;
          const dataObj: DrawDataType = {
            x: Number(key) + phrase.startTime!,
            y: phrase.compute(scaledX, true)!
          };
          const id = this.idFromKey(key, phrase.pieceIdx!);
          const x = (d: DrawDataType) => this.xr()(d.x);
          const y = (d: DrawDataType) => this.yr()(d.y);
          const tFunc: TFuncType = (datum) => {
            const d = datum as DrawDataType;
            return `translate(${x(d)}, ${y(d)})`
          };
          this.phraseG.append('g') // actual chikari
            .classed('chikari', true)
            .append('path')
            .attr('id', id)
            .attr('d', sym)
            .attr('stroke', this.chikariColor)
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round')
            .data([dataObj])
            .attr('transform', tFunc)
          this.phraseG.append('g') // for clicking
            .classed('chikari', true)
            .append('circle')
            .attr('id', 'circle__' + id)
            .classed('chikariCircle', true)
            .style('opacity', '0')
            .data([dataObj])
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 6)
            .on('mouseover', this.handleMouseOver)
            .on('mouseout', this.handleMouseOut)
            .on('click', this.handleClickChikari)
        })
      })
    },
    
    codifiedAddChikari() {
      const sym = d3Symbol().type(d3SymbolX).size(80);
      this.piece.phrases.forEach(phrase => {
        Object.keys(phrase.chikaris).forEach(key => {
          const scaledX = Number(key) / phrase.durTot!;
          const dataObj: DrawDataType = {
            x: Number(key) + phrase.startTime!,
            y: phrase.compute(scaledX, true)!
          };
          const id = this.idFromKey(key, phrase.pieceIdx!);
          const x = (d: DrawDataType) => this.codifiedXR!(d.x);
          const y = (d: DrawDataType) => this.codifiedYR!(d.y);
          const tFunc: TFuncType = (datum) => {
            const d = datum as DrawDataType;
            return `translate(${x(d)}, ${y(d)})`
          };
          this.phraseG.append('g')
            .classed('chikari', true)
            .append('path')
            .attr('id', id)
            .attr('d', sym)
            .attr('stroke', this.chikariColor)
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round')
            .data([dataObj])
            .attr('transform', tFunc)  
          this.phraseG.append('g') // for clicking
            .classed('chikari', true)
            .append('circle')
            .attr('id', 'circle__' + id)
            .classed('chikariCircle', true)
            .style('opacity', '0')
            .data([dataObj])
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 6)
            .on('mouseover', this.handleMouseOver)
            .on('mouseout', this.handleMouseOut)
            .on('click', this.handleClickChikari)
        })
      })
    },

    codifiedAddOneChikari(phrase: Phrase, key: string | number, selected=true) {
      const sym = d3Symbol().type(d3SymbolX).size(80);
      const scaledX = Number(key) / phrase.durTot!;
      const dataObj: DrawDataType = {
        x: Number(key) + phrase.startTime!,
        y: phrase.compute(scaledX, true)!
      };
      const id = this.idFromKey(key, phrase.pieceIdx!);
      const x = (d: DrawDataType) => this.codifiedXR!(d.x);
      const y = (d: DrawDataType) => this.codifiedYR!(d.y);
      const tFunc: TFuncType = (datum) => {
        const d = datum as DrawDataType;
        return `translate(${x(d)}, ${y(d)})`
      };
      this.phraseG.append('g')
        .classed('chikari', true)
        .append('path')
        .attr('id', id)
        .attr('d', sym)
        .attr('stroke', selected? this.selectedChikariColor: this.chikariColor)
        .attr('stroke-width', 3)
        .attr('stroke-linecap', 'round')
        .data([dataObj])
        .attr('transform', tFunc)  
      this.phraseG.append('g') // for clicking
        .classed('chikari', true)
        .append('circle')
        .attr('id', 'circle__' + id)
        .classed('chikariCircle', true)
        .style('opacity', '0')
        .data([dataObj])
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 6)
        .on('mouseover', this.handleMouseOver)
        .on('mouseout', this.handleMouseOut)
        .on('click', this.handleClickChikari)
    },

    getIdFromTrajClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const c1 = target.id.slice(0, 9) === 'overlay__';
      const c2 = target.id.slice(0, 5) === 'pluck';
      const c3 = target.id.slice(0, 9) === 'hammeroff';
      const c4 = target.id.slice(0, 8) === 'hammeron';
      const c5 = target.id.slice(0, 5) === 'slide';
      let id;
        if (c1) {
          id = target.id.slice(9);
        } else if (c2) {
          id = target.id.slice(5);
        } else if (c3) {
          id = target.id.slice(9);
          id = id.split('i')[0]
        } else if (c4) {
          id = target.id.slice(8);
          id = id.split('i')[0];
        } else if (c5) {
          id = target.id.slice(5);
          id = id.split('i')[0];
        }
      return id;
    },

    // handleMouseOver(e: MouseEvent) {
    //   const target = e.target as SVGElement;
    //   if (!(this.meterMode || this.insertPulseMode)) {
    //     const c1 = target.id.slice(0, 9) === 'overlay__';
    //     const c2 = target.id.slice(0, 5) === 'pluck';
    //     const c3 = target.id.slice(0, 9) === 'hammeroff';
    //     const c4 = target.id.slice(0, 8) === 'hammeron';
    //     const c5 = target.id.slice(0, 5) === 'slide';
    //     if (target.id.slice(0, 8) === 'circle__') {
    //       const id = target.id.slice(8)
    //       d3Select(`#${id}`)
    //         .attr('stroke', this.selectedChikariColor)
    //       d3Select(`#${target.id}`)
    //         .style('cursor', 'pointer')
    //     } else if (c1 || c2 || c3 || c4 || c5) {
    //       let id;
    //       if (c1) {
    //         id = target.id.slice(9);
    //       } else if (c2) {
    //         id = target.id.slice(5);
    //       } else if (c3) {
    //         id = target.id.slice(9);
    //         id = id.split('i')[0]
    //       } else if (c4) {
    //         id = target.id.slice(8);
    //         id = id.split('i')[0];
    //       } else if (c5) {
    //         id = target.id.slice(5);
    //         id = id.split('i')[0];
    //       }
    //       const pIdx = Number(id!.split('t')[0].slice(1));
    //       const tIdx = Number(id!.split('t')[1]);
    //       const traj = this.piece.phrases[pIdx].trajectories[tIdx];
    //       if (traj.groupId === undefined) {
    //         let color = this.selTrajColor;
    //         d3Select(`#${id}`)
    //           .attr('stroke', color)
    //         d3Select(`#dampenp${pIdx}t${tIdx}`)
    //           .attr('stroke', color)
    //         if (this.selectedTraj && traj !== this.selectedTraj) {
    //           d3Select(`#${target.id}`)
    //             .style('cursor', 'pointer')
    //         } else {
    //           d3Select(`#${target.id}`)
    //             .style('cursor', 'pointer')
    //         }
    //         d3Select(`#pluck${id}`)
    //           .attr('stroke', this.selArtColor)
    //           .attr('fill', this.selArtColor)
    //         this.updateArtColors(traj, true)
    //       } else {
    //         const group = this.piece.phrases[pIdx].getGroupFromId(traj.groupId);
    //         group!.trajectories.forEach(traj => {
    //           const id = `p${traj.phraseIdx}t${traj.num}`;
    //           d3Select(`#${id}`)
    //             .attr('stroke', this.selTrajColor)
    //           d3Select(`#dampenp${traj.phraseIdx}t${traj.num}`)
    //             .attr('stroke', this.selTrajColor)
    //           d3Select(`#pluck${id}`)
    //             .attr('stroke', this.selArtColor)
    //             .attr('fill', this.selArtColor)
    //           d3Select(`#overlay__${id}`)
    //             .attr('cursor', 'pointer')
    //           this.updateArtColors(traj, true)
    //         })
    //       }
    //     } 
    //   }
    // },

    alterSlope(newSlope: number) {
      this.unsavedChanges = true;
      const r = this.$refs.renderer as typeof Renderer;
      const tLayer = r.transcriptionLayer as typeof TranscriptionLayer;
      tLayer.selectedTraj!.slope = newSlope;
      tLayer.refreshTraj(tLayer.selectedTraj!);
    },

    // handleMouseOut(e: MouseEvent) {
    //   const target = e.target as HTMLElement;
    //   if (!(this.meterMode || this.insertPulseMode)) {
    //     const c1 = target.id.slice(0, 9) === 'overlay__';
    //     const c2 = target.id.slice(0, 5) === 'pluck';
    //     const c3 = target.id.slice(0, 9) === 'hammeroff';
    //     const c4 = target.id.slice(0, 8) === 'hammeron';
    //     const c5 = target.id.slice(0, 5) === 'slide';
    //     if (target.id.slice(0, 8) === 'circle__') {
    //       const id = target.id.slice(8)
    //       if (id !== this.selectedChikariID) {
    //         d3Select(`#${id}`)
    //           .attr('stroke', this.chikariColor)
    //       }
    //     }
    //     if (c1 || c2 || c3 || c4 || c5) {
    //       let id;
    //       if (c1) {
    //         id = target.id.slice(9);
    //       } else if (c2) {
    //         id = target.id.slice(5);
    //       } else if (c3) {
    //         id = target.id.slice(9);
    //         id = id.split('i')[0]
    //       } else if (c4) {
    //         id = target.id.slice(8);
    //         id = id.split('i')[0];
    //       } else if (c5) {
    //         id = target.id.slice(5);
    //         id = id.split('i')[0];
    //       }
    //       if (this.selectedTrajs.length < 2) {
    //         if (id !== this.selectedTrajID) {
    //           const pIdx = Number(id!.split('t')[0].slice(1));
    //           const tIdx = Number(id!.split('t')[1]);
    //           const traj = this.piece.phrases[pIdx].trajectories[tIdx];
    //           if (traj.groupId === undefined) {
    //             d3Select(`#${id}`)
    //               .attr('stroke', this.trajColor)
    //             d3Select(`#dampen${id}`)
    //               .attr('stroke', this.trajColor)
    //             d3Select(`#pluck${id}`)
    //               .attr('stroke', 'black')
    //               .attr('fill', 'black')
    //             this.updateArtColors(traj, false)
    //           } else {
    //             const group = this.piece.phrases[pIdx]
    //               .getGroupFromId(traj.groupId);
    //             group!.trajectories.forEach(traj_ => {
    //               const id_ = `p${traj_.phraseIdx}t${traj_.num}`;
    //               d3Select(`#${id_}`)
    //                 .attr('stroke', this.trajColor)
    //               d3Select(`#dampen${id_}`)
    //                 .attr('stroke', this.trajColor)
    //               d3Select(`#pluck${id_}`)
    //                 .attr('stroke', 'black')
    //                 .attr('fill', 'black')
    //               this.updateArtColors(traj_, false)
    //             })
    //           } 
    //         }
    //       } else {
    //         const pIdx = Number(id!.split('t')[0].slice(1));
    //         const tIdx = Number(id!.split('t')[1]);
    //         const traj = this.piece.phrases[pIdx].trajectories[tIdx];
    //         if (!this.selectedTrajs.includes(traj)) {
    //           if (traj.groupId === undefined) {
    //             d3Select(`#${id}`)
    //               .attr('stroke', this.trajColor)
    //             d3Select(`#dampen${id}`)
    //               .attr('stroke', this.trajColor)
    //             d3Select(`#pluck${id}`)
    //               .attr('stroke', 'black')
    //               .attr('fill', 'black')
    //             this.updateArtColors(traj, false)
    //           } else {
    //             const group = this.piece.phrases[pIdx]
    //               .getGroupFromId(traj.groupId);
    //             group!.trajectories.forEach(traj_ => {
    //               const id_ = `p${traj_.phraseIdx}t${traj_.num}`;
    //               d3Select(`#${id_}`)
    //                 .attr('stroke', this.trajColor)
    //               d3Select(`#dampen${id_}`)
    //                 .attr('stroke', this.trajColor)
    //               d3Select(`#pluck${id_}`)
    //                 .attr('stroke', 'black')
    //                 .attr('fill', 'black')
    //               this.updateArtColors(traj_, false)
    //             })
    //           }  
    //         }
    //       }
    //     }
    //   }
    // },

    // handleClickChikari(e: MouseEvent) {
    //   const target = e.target as HTMLElement;
    //   e.stopPropagation();
    //   const id = target.id.split('__')[1];
    //   if (this.selectedChikariID && this.selectedChikariID !== id) {
    //     d3Select('#' + this.selectedChikariID)
    //       .attr('stroke', this.chikariColor)
    //   }
    //   this.selectedChikariID = target.id.split('__')[1];
    //   d3Select(`#${this.selectedChikariID}`)
    //     .attr('stroke', this.selectedChikariColor)
    //   if (this.selectedTrajID) {
    //     this.clearSelectedTraj();
    //   }
    //   if (!(this.selectedPhraseDivIdx === undefined)) {
    //     this.clearSelectedPhraseDiv()
    //   }
    // },

    adjustChikari(left = true) {
      // first, adjust the actual chikari in phrase object, 
      const offset = 0.02;
      const pIdx = this.selectedChikariID!.split('_')[0].slice(1);
      const sec = this.selectedChikariID!.split('_')[1];
      const cSec = this.selectedChikariID!.split('_')[2];
      const time = Number(sec) + Number(cSec) / 100;
      const phrase = this.piece.phrases[Number(pIdx)];
      if (time < offset && left ) {
        return 
      } else if (phrase.durTot! - time < offset && !left) {
        return
      } else {
        const selectedChikari = phrase.chikaris[time.toFixed(2)];
        const newTime = left ? time - offset : time + offset;
        phrase.chikaris[newTime.toFixed(2)] = selectedChikari;
        delete phrase.chikaris[time];
        // then adjust the chikari in the view while altering its id
        const newID = `p${pIdx}_${newTime.toFixed(2).replace('.', '_')}`;
        d3Select(`#${this.selectedChikariID}`).remove();
        d3Select(`#circle__${this.selectedChikariID}`).remove();
        this.codifiedAddOneChikari(phrase, newTime);
        this.selectedChikariID = newID;
      }
    },

    adjustMeter(left = true) {
      if (this.selMeter === undefined) {
        throw new Error('No meter selected')
      }
      const offset = 0.02;
      const startTime = this.selMeter.startTime;
      let adjustment = 0;
      if (left) {
        if (startTime - offset >= 0) {
          this.selMeter.adjustStartTime(-offset);
          adjustment = this.codifiedXR!(0) - this.codifiedXR!(0.02);
        } else if (startTime !== 0) {
          this.selMeter.setStartTime(0);
          adjustment = this.codifiedXR!(0) - this.codifiedXR!(startTime);
        } else {
          return
        }
      } else {
        this.selMeter.adjustStartTime(offset);
        adjustment = this.codifiedXR!(0.02) - this.codifiedXR!(0);
      }
      const selected = d3SelectAll(`.meterId_${this.selMeter.uniqueId}`);
      const nodes = selected.nodes() as SVGPathElement[];
      nodes.forEach(node => {
        console.log(node)
        const curX = node!.transform.baseVal[0].matrix.e;
        const newX = curX + adjustment;
        d3Select(node).attr('transform', `translate(${newX}, 0)`);
      })
      this.resetZoom();
      this.selectMeter(this.selMeter.allPulses[0].uniqueId);
      this.unsavedChanges = true;
      
    },

    setTrajColor(id: string, color: string, altColor?: string = undefined) {
      // sets the colors for the traj stroke, dampen, pluck, and turns the 
      // overlay to pointer
      if (altColor === undefined) altColor = color;
      d3Select(`#${id}`)
        .attr('stroke', color)
      d3Select(`#dampen${id}`)
        .attr('stroke', color)
      d3Select(`#pluck${id}`)
        .attr('stroke', altColor)
        .attr('fill', altColor)
      d3Select(`#overlay__${id}`)
        .attr('cursor', 'pointer')
    },

    // selectedTrajsGroupable() {// tests whether all trajs in this.selectedTrajs
    //   // are adjacent to one another and part of the same phrase
    //   const uniquePIdxs = [...new Set(this.selectedTrajs.map(t => t.phraseIdx))]
    //   if (uniquePIdxs.length === 1) {
    //     // sort by num
    //     this.selectedTrajs.sort((a, b) => a.num! - b.num!);
    //     const nums = this.selectedTrajs.map(traj => traj.num!);
    //     const diffs = nums.slice(1).map((num, nIdx) => {
    //       return num - nums[nIdx];
    //     })
    //     const c1 = diffs.every(diff => diff === 1);
    //     const c2 = this.selectedTrajs.every(traj => {
    //       return traj.groupId === this.selectedTrajs[0].groupId
    //     });
    //     return c1 && c2
    //   } else {
    //     return false
    //   }
    // },

    // selectedTrajsGrouped() {
    //   const groupIDs = [...new Set(this.selectedTrajs.map(t => t.groupId))];
    //   return groupIDs.length === 1 && groupIDs[0] !== undefined;
    // },

    // handleClickTraj(e: MouseEvent) {
    //   const tsp = this.$refs.trajSelectPanel as typeof TrajSelectPanel;
    //   if (!(this.meterMode || this.insertPulseMode )) {
    //     e.stopPropagation();
    //     this.groupable = false;
    //     if (this.shifted && this.selectedTrajs.length >= 1) {
    //       const id = this.getIdFromTrajClick(e)!;
    //       const pIdx = Number(id.split('t')[0].slice(1));
    //       const tIdx = Number(id.split('t')[1]);
    //       const newTraj = this.piece.phrases[pIdx].trajectories[tIdx];
    //       if (!this.selectedTrajs.includes(newTraj)) {
    //         if (newTraj.groupId === undefined) {
    //           this.selectedTrajs.push(newTraj);
    //           this.groupable = this.selectedTrajsGroupable();
    //           tsp.grouped = false;
    //           // clear selected traj visually
    //           if (
    //               this.selectedTraj && 
    //               this.selectedTrajID && 
    //               id !== this.selectedTrajID
    //             ) {
    //             this.setTrajColor(this.selectedTrajID, this.trajColor, 'black');
    //             d3SelectAll('.dragDots').remove();
    //             this.selectedTrajID = undefined;
    //             this.selectedTraj = undefined;
    //             this.clearTrajSelectPanel();
    //           }
    //           this.selectedTrajs.forEach(traj => {
    //             const id = `p${traj.phraseIdx}t${traj.num}`;
    //             this.setTrajColor(id, this.selTrajColor, this.selArtColor);
    //             this.updateArtColors(traj, true)
    //           })
    //           let minFreq = Math.min(...this.selectedTrajs.map(t => t.minFreq));
    //           let maxFreq = Math.max(...this.selectedTrajs.map(t => t.maxFreq));
    //           if ((minFreq / 2) < this.freqMin) {
    //             tsp.canShiftDown = false
    //           } else {
    //             tsp.canShiftDown = true
    //           }
    //           if ((maxFreq * 2) > this.freqMax) {
    //             tsp.canShiftUp = false
    //           } else {
    //             tsp.canShiftUp = true
    //           }
    //         } else {
    //           // need to actually make stuff happen here
    //         }
    //       } else {
    //         this.groupable = this.selectedTrajsGroupable();
    //       }
    //       if (this.vocal) {
    //         tsp.showVowelTrajCheck = true;
    //         const vowels = this.selectedTrajs.map(t => t.vowel);
    //         const uniqueVowels = [...new Set(vowels)];
    //         if (uniqueVowels.length === 1) {
    //           tsp.vowel = uniqueVowels[0];
    //         } else {
    //           tsp.vowel = undefined;
    //         }
    //       }
          

    //     } else {
    //       if (this.selectedTrajs.length > 1) {
    //         this.selectedTrajs.forEach(traj => {
    //           const id = `p${traj.phraseIdx}t${traj.num}`;
    //           d3Select(`#${id}`)
    //             .attr('stroke', this.trajColor)
    //           d3Select(`#dampen${id}`)
    //             .attr('stroke', this.trajColor)
    //           d3Select(`#pluck${id}`)
    //             .attr('fill', this.trajColor)
    //           d3Select(`#pluck${id}`)
    //             .attr('stroke', this.trajColor)
    //           d3Select('#overlay__' + id)
    //             .attr('cursor', 'pointer')
    //           this.updateArtColors(traj, false)
    //         })
    //         let minFreq = Math.min(...this.selectedTrajs.map(t => t.minFreq));
    //         let maxFreq = Math.max(...this.selectedTrajs.map(t => t.maxFreq));
    //         if ((minFreq / 2) < this.freqMin) {
    //           tsp.canShiftDown = false
    //         } else {
    //           tsp.canShiftDown = true
    //         }
    //         if ((maxFreq * 2) > this.freqMax) {
    //           tsp.canShiftUp = false
    //         } else {
    //           tsp.canShiftUp = true
    //         }
            
    //       }
    //       const id = this.getIdFromTrajClick(e);
    //       if (this.selectedTrajID && this.selectedTrajID !== id) {
    //         d3Select(`#` + this.selectedTrajID)
    //           .attr('stroke', this.trajColor)
    //         d3Select(`#dampen` + this.selectedTrajID)
    //           .attr('stroke', this.trajColor)
    //         d3Select(`#pluck${this.selectedTrajID}`)
    //           .attr('fill', this.trajColor)
    //           .attr('stroke', this.trajColor)
    //         this.updateArtColors(this.selectedTraj!, false)
    //       }
    //       if (this.setNewSeries) {
    //         this.setNewSeries = false;
    //         d3SelectAll('.newSeriesDot').remove();
    //       }
    //       if (this.setNewTraj) {
    //         this.setNewTraj = false;
    //         d3SelectAll('.newTrajDot').remove();
    //       }
    //       if (this.setNewPhraseDiv) this.setNewPhraseDiv = false;
    //       if (this.setChikari) this.setChikari = false;
    //       this.svg.style('cursor', 'default');
    //       this.selectedTrajID = this.getIdFromTrajClick(e);
    //       const pIdx = Number(this.selectedTrajID!.split('t')[0].slice(1));
    //       const tIdx = Number(this.selectedTrajID!.split('t')[1]);
    //       this.selectedTraj = this.piece.phrases[pIdx].trajectories[tIdx];
          
    //       if (this.selectedTraj!.groupId !== undefined) {
    //         const phrase = this.piece.phrases[pIdx];
    //         const group = phrase.getGroupFromId(this.selectedTraj!.groupId)!;
    //         if ((group.minFreq / 2) < this.freqMin) {
    //           tsp.canShiftDown = false
    //         } else {
    //           tsp.canShiftDown = true
    //         }
    //         if ((group.maxFreq * 2) > this.freqMax) {
    //           tsp.canShiftUp = false
    //         } else {
    //           tsp.canShiftUp = true
    //         }
    //         this.selectedTrajs = [...group.trajectories];
    //         this.clearTrajSelectPanel();
    //         this.groupable = true;
    //         tsp.grouped = true;
    //         this.selectedTrajID = undefined;
    //         this.selectedTraj = undefined;
    //         this.selectedTrajs.forEach(traj => {
    //           const id = `p${traj.phraseIdx}t${traj.num}`;
    //           d3Select(`#${id}`)
    //             .attr('stroke', this.selTrajColor)
    //           d3Select(`#dampen${id}`)
    //             .attr('stroke', this.selTrajColor)
    //           d3Select(`#pluck${id}`)
    //             .attr('fill', this.selArtColor)
    //             .attr('stroke', this.selArtColor)
    //           d3Select('#overlay__' + id)
    //             .attr('cursor', 'pointer')
    //           this.updateArtColors(traj, true)
    //         })
    //         d3SelectAll('.dragDots').remove();

    //       } else {
    //         const st = this.selectedTraj!;
    //         this.selectedTrajs = [st];
            
    //         const altId = st.id >= 12 ? 
    //                       st.id - 1: 
    //                       st.id; 
    //         tsp.selectedIdx = tsp.trajIdxs.indexOf(altId);
    //         tsp.parentSelected = true;
    //         tsp.slope = Math.log2(st.slope);
    //         tsp.vowel = st.vowel;
    //         tsp.startConsonant = st.startConsonant;
    //         tsp.endConsonant = st.endConsonant;
    //         if ((st.minFreq / 2) < this.freqMin) {
    //           tsp.canShiftDown = false
    //         } else {
    //           tsp.canShiftDown = true
    //         }
    //         if ((st.maxFreq * 2) > this.freqMax) {
    //           tsp.canShiftUp = false
    //         } else {
    //           tsp.canShiftUp = true
    //         }
    //         const c1 = st.articulations[0];
    //         const c2 = st.articulations['1.00'];
    //         const c3 = st.articulations['0.00'];
    //         const c4 = c1 && st.articulations[0].name === 'pluck';
    //         const c5 = c3 && st.articulations['0.00'].name === 'pluck';
    //         if (c4 || c5) {
    //           tsp.pluckBool = true
    //         } else {
    //           tsp.pluckBool = false
    //         }
    //         if (c2 && c2.name === 'dampen') {
    //           tsp.dampen = true
    //         } else {
    //           tsp.dampen = false
    //         }
    //         d3Select(`#${this.selectedTrajID}`)
    //           .attr('stroke', this.selTrajColor)
    //         // d3Select(`#overlay__${this.selectedTrajID}`)
    //         //   .style('cursor', 'auto')
    //         d3Select(`#dampen${this.selectedTrajID}`)
    //           .attr('stroke', this.selTrajColor)
    //         d3Select(`#pluck${this.selectedTrajID}`)
    //           .attr('fill', this.selArtColor)
    //           .attr('stroke', this.selArtColor)
    //         this.updateArtColors(st, true)
    //         if (this.selectedChikariID) {
    //           this.clearSelectedChikari()
    //         }
    //         if (!(this.selectedPhraseDivIdx === undefined)) {
    //           this.clearSelectedPhraseDiv()
    //         }
    //         this.addAllDragDots();
    //         tsp.showTrajChecks = true;
    //         tsp.showVowelTrajCheck = true;
    //       }
    //     }
    //   }
         
    // },

    clearSelectedChikari() {
      if (this.selectedChikariID) {
        d3Select(`#${this.selectedChikariID}`)
          .attr('stroke', this.chikariColor)
        this.selectedChikariID = undefined
      }
    },
    
    clearSelectedPhraseDiv() {  
      if (this.selectedPhraseDivIdx !== undefined) {
        d3Select(`#phraseLine${this.selectedPhraseDivIdx}`)
          .attr('stroke', 'black')
        this.selectedPhraseDivIdx = undefined;
        const tsp = this.$refs.trajSelectPanel as typeof TrajSelectPanel;
        tsp.phraseDivType = undefined;
      }
    },

    updateArtColors(traj: Trajectory, selection: boolean) {
      // not plucks
      const color = selection ? this.selArtColor : 'black';
      const arrow = selection ? 'url(#selectedArrow)' : 'url(#arrow)';
      const id = `p${traj.phraseIdx}t${traj.num}`;
      let hOffCt = 0;
      let hOnCt = 0;
      let slideCt = 0;
      Object.keys(traj.articulations).forEach(key => {
        const art = traj.articulations[key];
        switch (art.name) {
          case 'hammer-off':
            d3Select(`#hammeroff${id}i${hOffCt}`)
              .attr('stroke', color)
              .attr('marker-end', arrow)
            hOffCt++;
            break;
          case 'hammer-on':
            d3Select(`#hammeron${id}i${hOnCt}`)
              .attr('stroke', color)
              .attr('marker-end', arrow)
            hOnCt++;
            break;
          case 'slide':
            d3Select(`#slide${id}i${slideCt}`)
              .attr('stroke', color)
              .attr('marker-end', arrow)
            slideCt++;
            break;
        }
      })
    },

    // clearSelectedTraj() {
    //   if (this.selectedTrajID) {
    //     d3Select(`#${this.selectedTrajID}`)
    //       .attr('stroke', this.trajColor)
    //     d3Select(`#overlay__${this.selectedTrajID}`)
    //       .style('cursor', 'pointer')
    //     d3Select(`#dampen${this.selectedTrajID}`)
    //       .attr('stroke', this.trajColor);
    //     d3Select(`#pluck${this.selectedTrajID}`)
    //       .attr('fill', this.trajColor)
    //       .attr('stroke', this.trajColor)
    //     this.updateArtColors(this.selectedTraj!, false);
    //     this.selectedTrajID = undefined;
    //     this.selectedTraj = undefined;
    //     this.selectedTrajs = [];
    //     d3SelectAll('.dragDots').remove();
    //   }
    //   if (this.selectedTrajs.length >= 2) {
    //     this.selectedTrajs.forEach(traj => {
    //       const id = `p${traj.phraseIdx}t${traj.num}`;
    //       d3Select(`#${id}`)
    //         .attr('stroke', this.trajColor)
    //       d3Select(`#dampen${id}`)
    //         .attr('stroke', this.trajColor)
    //       d3Select('#overlay__' + id)
    //         .attr('cursor', 'pointer')
    //       d3Select(`#pluck${id}`)
    //         .attr('fill', this.trajColor)
    //         .attr('stroke', this.trajColor)
    //       this.updateArtColors(traj, false);
    //     })
    //     this.selectedTrajs = [];
    //     this.selectedTraj = undefined;
    //     this.selectedTrajID = undefined;
    //   }
    //   this.groupable = false
    // },

    clearTrajSelectPanel() {
      const tsp = this.$refs.trajSelectPanel as typeof TrajSelectPanel;
      tsp.parentSelected = false;
      tsp.selectedIdx = undefined;
      tsp.showVibObj = false;
      tsp.showSlope = false;
      tsp.showTrajChecks = false;
      tsp.showVowelTrajCheck = false;
      tsp.showPhraseRadio = false;
      tsp.startConsonant = undefined;
      tsp.endConsonant = undefined;
      tsp.vowel = 'a';

    },

    redrawChikaris() {
      this.piece.phrases.forEach(phrase => {
        const x = (d: DrawDataType) => this.xr()(d.x);
        const y = (d: DrawDataType) => this.yr()(d.y);
        const tFunc: TFuncType = (datum) => {
          const d = datum as DrawDataType;
          return `translate(${x(d)}, ${y(d)})`
        };
        Object.keys(phrase.chikaris).forEach(key => {
          const id = this.idFromKey(key, phrase.pieceIdx!);
          const sel = d3Select(`#${id}`)
          const datum = sel.datum();

          d3Select(`#${id}`)
            .attr('transform', tFunc)
            .transition()
            .duration(this.transitionTime)            
            
          d3Select(`#circle__${id}`)
            .transition()
            .duration(this.transitionTime)
            .attr('cx', x)
            .attr('cy', y)
        })
      })
    },
    
    moveChikaris(phrase: Phrase) {
      Object.keys(phrase.chikaris).forEach(key => {
        const scaledX = Number(key) / phrase.durTot!;
        const dataObj: DrawDataType = {
          x: Number(key) + phrase.startTime!,
          y: phrase.compute(scaledX, true)!
        };
        const x = (d: DrawDataType) => this.codifiedXR!(d.x);
        const y = (d: DrawDataType) => this.codifiedYR!(d.y);
        const id = this.idFromKey(key, phrase.pieceIdx!);
        const tFunc: TFuncType = (datum) => {
          const d = datum as DrawDataType;
          return `translate(${x(d)}, ${y(d)})`
        };
        d3Select(`#${id}`)
          .data([dataObj])
          .attr('transform', tFunc)
        d3Select(`#circle__${id}`)
          .data([dataObj])
          .attr('cx', x)
          .attr('cy', y)
      })
    },

    redrawSlide(traj: Trajectory, phraseStart: number) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => {
        return traj.articulations[key].name === 'slide'
      });
      const data = relKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        const dirUp = y < traj.compute(Number(p), true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y,
          dirUp: dirUp,
          i: i
        }
      });
      const x = (d: DrawDataType) => this.xr()(d.x);
      const y = (d: DrawDataType) => this.yr()(d.y);
      data.forEach(obj => {
        d3Select(`#slidep${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .transition()
          .duration(this.transitionTime)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })
    },

    redrawDampener(traj: Trajectory, phraseStart: number) {
      const keys = Object.keys(traj.articulations);
      const dampenKeys = keys.filter(key => {
        return traj.articulations[key].name === 'dampen'
      });
      dampenKeys.forEach(() => {
        const x = (d: DrawDataType) => this.xr()(d.x);
        const y = (d: DrawDataType) => this.yr()(d.y);
        const obj = {
          x: phraseStart + traj.startTime! + traj.durTot,
          y: traj.compute(1, true)
        };
        d3Select(`#dampenp${traj.phraseIdx}t${traj.num}`)
          .transition()
          .duration(this.transitionTime)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      });
    },

    codifiedRedrawDampener(traj: Trajectory, phraseStart: number) {
      const keys = Object.keys(traj.articulations);
      const dampenKeys = keys.filter(key => {
        return traj.articulations[key].name === 'dampen'
      });
      dampenKeys.forEach(() => {
        const x = (d: DrawDataType) => this.codifiedXR!(d.x);
        const y = (d: DrawDataType) => this.codifiedYR!(d.y);
        const obj = {
          x: phraseStart + traj.startTime! + traj.durTot,
          y: traj.compute(1, true)
        };
        d3Select(`#dampenp${traj.phraseIdx}t${traj.num}`)
          .transition()
          .duration(this.transitionTime)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      });
    },

    codifiedRedrawSlide(traj: Trajectory, phraseStart: number) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => {
        return traj.articulations[key].name === 'slide'
      });
      const data = relKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        const dirUp = y < traj.compute(Number(p), true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y,
          dirUp: dirUp,
          i: i
        }
      });
      const x = (d: DrawDataType) => this.codifiedXR!(d.x);
      const y = (d: DrawDataType) => this.codifiedYR!(d.y);
      data.forEach(obj => {
        d3Select(`#slidep${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .transition().duration(this.transitionTime)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })
    },

    updateTranslateExtent() {
      const rect = this.rect();
      const scaledWidth = this.yAxWidth * this.tx().k;
      const scaledHeight = this.xAxHeight * this.ty().k;
      const xLim = (scaledWidth - this.yAxWidth) / this.tx().k;
      const yLim = (scaledHeight - this.xAxHeight) / this.ty().k;
      this.zoomX!.translateExtent([
        [xLim, yLim],
        [rect.width, rect.height]
      ]);
      this.zoomY!.translateExtent([
        [xLim, yLim],
        [rect.width, rect.height]
      ]);
    },

    sargamLine(y: number) {
      return d3Line()([
        [0, this.yr()(y)],
        [this.xr()(this.durTot), this.yr()(y)]
      ])
    },
    
    codifiedSargamLine(y: number) {
      return d3Line()([
        [this.codifiedXR!(0), this.codifiedYR!(y)],
        [this.codifiedXR!(this.durTot), this.codifiedYR!(y)]
      ])
    },

    addSargamLines(codified: boolean) {
      this.visibleSargam.forEach((s, i) => { // draws hoizontal sargam lines
        const fund = this.piece.raga.fundamental;
        const logOverFund = (freq: number) => Math.log2(freq / fund);
        const saFilter = (freq: number) => {
          return Math.abs(logOverFund(freq) % 1) === 0
        }
        const paFilter = (idx: number) => {
          return this.visPitches[idx].swara === 4
        };
        const strokeWidth = saFilter(s) || paFilter(i) ? 2 : 1;
        this.phraseG.append('path')
          .classed(`sargamLine s${i}`, true)
          .attr("fill", "none")
          .attr("stroke", "grey")
          .attr("stroke-width", `${strokeWidth}px`)
          .attr("stroke-linejoin", "round")
          .attr("stroke-linecap", "round")
          .attr("d", codified ? 
            this.codifiedSargamLine(Math.log2(s)) : 
            this.sargamLine(Math.log2(s)));
      })
    },

    updateSargamLines() {
      this.visibleSargam = this.piece.raga.getFrequencies({
        low: this.freqMin,
        high: this.freqMax
      })
      this.visPitches = this.piece.raga.getPitches({
        low: this.freqMin,
        high: this.freqMax
      })
      const fund = this.piece.raga.fundamental;
      const logOverFund = (freq: number) => Math.log2(freq / fund);
      const saFilter = (freq: number) => Math.abs(logOverFund(freq) % 1) === 0;
      const paFilter = (idx: number) => {
        return this.visPitches[idx].swara === 4
      };
      this.visibleSargam.forEach((s, i) => {
        const strokeWidth = saFilter(s) || paFilter(i) ? 2 : 1;
        d3Select('.sargamLine.s' + i)
          .attr('stroke-width', `${strokeWidth}px`)
          .attr('d', this.codifiedSargamLine(Math.log2(s)))
      });
      this.redraw();
    },

    playheadLine(codified = false) {
      if (codified) {
        return d3Line()([
          [0, this.codifiedYR!(Math.log2(this.freqMin))],
          [0, this.codifiedYR!(Math.log2(this.freqMax)) - this.xAxHeight]
        ])
      } else {

        return d3Line()([
          [0, this.yr()(Math.log2(this.freqMin)) + 1000],
          [0, this.yr()(Math.log2(this.freqMax)) - this.xAxHeight]
        ])
      }
    },

    addPlayhead() {
      this.svg
        .append('g')
        .attr('clip-path', 'url(#playheadClip)')
        .append('path')
        .classed('playhead', true)
        .attr('stroke', 'darkgreen')
        .attr('stroke-width', '2px')
        .attr('d', this.playheadLine())
        .attr('transform', `translate(${this.xr()(this.currentTime)})`)
      
      this.svg
        .append('g')
        .attr('clip-path', 'url(#playheadClip)')
        .append('path')
        .classed('playheadShadow', true)
        .attr('stroke', 'darkgreen')
        .attr('stroke-width', '1px')
        .attr('d', this.playheadLine())
        .attr('transform', `translate(${this.xr()(this.currentTime)})`)
        .attr('opacity', '0')
    },

    // movePlayhead(transitionTime?: number = undefined) {
    //   const time = transitionTime ? transitionTime : this.transitionTime;
    //   d3Select('.playhead')
    //     .attr('transform', `translate(${this.xr()(this.currentTime)})`)
    // }, 

    // moveShadowPlayhead() {
    //   const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
    //   const shadowTime = ap.getShadowTime();
    //   d3Select('.playheadShadow')
    //     .transition()
    //     .duration(this.transitionTime)
    //     .attr('transform', `translate(${this.xr()(shadowTime)})`)
    // },

    redraw(instant = false) {
      this.updateTranslateExtent();
      this.gx!
        .transition()
        .duration(instant ? 0 : this.transitionTime)
        .ease(d3EaseLinear)
        .call(this.xAxis, this.xr());
      this.gy!
        .transition()
        .duration(instant ? 0 : this.transitionTime)
        .ease(d3EaseLinear)
        .call(this.yAxis, this.yr());

      if (this.init) {
        this.$nextTick(() => {
          this.movePhrases();
          this.init = false;
          this.codifiedXScale = this.tx().k;
          this.codifiedYScale = this.ty().k;
          this.codifiedYOffset = this.yr().invert(0);
          this.codifiedXOffset = this.xr().invert(0);
          this.codifiedXR = this.xr();
          this.codifiedYR = this.yr();
          this.visibleSargam.forEach((s, i) => {
            d3Select(`.s${i}`)
              .attr('d', this.sargamLine(Math.log2(s)))
          });
          this.updatePhraseDivs();
          this.codifiedAddSargamLabels();
          this.addBolLabels();
        })
        
      } else {
        this.slidePhrases(
          this.xr()(this.codifiedXOffset),
          this.yr()(this.codifiedYOffset),
          this.tx().k / this.codifiedXScale,
          this.ty().k / this.codifiedYScale,
          this.transitionTime
        )
      }

      if (this.piece.audioID) {
        this.redrawSpectrogram(instant);
      }
      this.movePlayhead();
      this.moveShadowPlayhead();
      this.moveRegion();
    },

    resetAudio(e: MouseEvent) {
      if (e.pointerType === '') {
        this.preventSpaceToggle(e);
      } else {
        const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      ap.reinitializeAC();
      // also, need to (if Pitch Shift is checked), uncheck pitch shift, and 
      // set its default back to 0.
      const eap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
      eap.shiftOn = false;
      eap.transposition = 0
      }
    },

    shiftTrajByOctave(traj: Trajectory, offset = 1) {
      // then remove the old trajectory and add the new one;
      traj.pitches.forEach(pitch => pitch.setOct(pitch.oct + offset));
      const r = this.$refs.renderer as typeof Renderer;
      const tLayer = r.transcriptionLayer as typeof TranscriptionLayer;
      tLayer.refreshTraj(traj);
    },

    codifiedAddTraj(traj: Trajectory, pStart: number, vowelIdxs: number[]) {
      const data = this.makeTrajData(traj, pStart);
      this.phraseG.append('path')
        .datum(data)
        .classed('phrase', true)
        .attr('id', `p${traj.phraseIdx}t${traj.num}`)
        .attr("fill", "none")
        .attr("stroke", this.trajColor)
        .attr("stroke-width", '3px')
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr('d', this.codifiedPhraseLine())
      this.phraseG.append('path')
        .datum(data)
        .classed('phrase', true)
        .attr('id', `overlay__p${traj.phraseIdx}t${traj.num}`)
        .attr('fill', 'none')
        .attr('stroke', 'green')
        .attr('stroke-width', '6px')
        .attr('d', this.codifiedPhraseLine())
        .style('opacity', '0')
        .on('mouseover', this.handleMouseOver)
        .on('mouseout', this.handleMouseOut)
        .on('click', this.handleClickTraj)
        .on('contextmenu', this.trajContextMenuClick)
      this.codifiedAddArticulations(traj, pStart, vowelIdxs);
      // if there is a prev traj, and that traj is not silent, and that traj
      // has a ending consonant, move E Consonant
      const phrase = this.piece.phrases[traj.phraseIdx!];
      let prevTraj: Trajectory | undefined = undefined;
      if (traj.num! > 0) {
        prevTraj = phrase.trajectories[traj.num! - 1];
      } else if (traj.phraseIdx! > 0) {
        prevTraj = this.piece.phrases[traj.phraseIdx! - 1].trajectories[
          this.piece.phrases[traj.phraseIdx! - 1].trajectories.length - 1
        ];
      }
      if (prevTraj && prevTraj.id !== 12 && prevTraj.endConsonant) {
        this.moveEConsonant(prevTraj, pStart, true);
      }
    },
    
    codifiedAddPhrases() {
      this.addSargamLines(true);
      this.piece.phrases.forEach(phrase => {
        const vowelIdxs = phrase.firstTrajIdxs();
        phrase.trajectories.forEach(traj => {
          if (traj.id !== 12) {
            this.codifiedAddTraj(traj, phrase.startTime!, vowelIdxs)
          }
        });
      })
      this.codifiedAddChikari();
      this.addMetricGrid();
    },

    xr() {
      return this.tx!().rescaleX(this.x!)
    },

    yr() {
      return this.ty!().rescaleY(this.y!)
    },

    phraseLine() {
      return d3Line<DrawDataType>()
        .x(d => this.xr()(d.x))
        .y(d => this.yr()(Math.log2(d.y)))
    },

    codifiedPhraseLine() {
      return d3Line<DrawDataType>()
        .x(d => this.codifiedXR!(d.x))
        .y(d => this.codifiedYR!(Math.log2(d.y)))
    },

    movePhrases() {
      this.piece.phrases.forEach((phrase, pIdx) => {
        phrase.trajectories.forEach((traj, tIdx) => {
          if (traj.id !== 12) {
            d3Select(`#p${pIdx}t${tIdx}`)
              .transition().duration(this.transitionTime)
              .attr("d", this.phraseLine())
            d3Select(`#overlay__p${pIdx}t${tIdx}`)
              .transition().duration(this.transitionTime)
              .attr('d', this.phraseLine())
            this.movePlucks(traj);
            this.redrawKrintin(traj, phrase.startTime!);
            this.redrawSlide(traj, phrase.startTime!);
            this.redrawDampener(traj, phrase.startTime!);
            if (this.vocal) {
              this.moveSConsonant(traj, phrase.startTime!);
              this.moveEConsonant(traj, phrase.startTime!);
              this.moveVowel(traj, phrase.startTime!, false);
              this.moveConsonantSymbols(traj, phrase.startTime!);
            } 
          }
        })
      });
      this.redrawChikaris();
    },

    movePlucks(traj: Trajectory) {
      const size = 20;
      const offset = (size ** 0.5 ) / 2;
      const arts = traj.articulations;
      const c1 = arts[0] && arts[0].name === 'pluck';
      const c2 = arts['0.00'] && arts['0.00'].name === 'pluck';
      if (c1 || c2) {
        const x = (d: DrawDataType) => this.xr()(d.x);
        const y = (d: DrawDataType) => this.yr()(d.y);
        const tFunc: TFuncType = (datum) => {
          const d = datum as DrawDataType;
          return `translate(${x(d) + offset}, ${y(d)}) rotate(90)`
        };
        d3Select(`#pluckp${traj.phraseIdx}t${traj.num}`)
          .transition()
          .duration(this.transitionTime)
          .attr('transform', tFunc)
      }
    },

    addClipPaths() {
      this.defs = this.svg.append('defs') as 
        Selection<SVGDefsElement, unknown, null, undefined>;
      const rect = this.rect();
      this.defs.append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('id', 'rect')
        .attr('width', rect.width - this.yAxWidth)
        .attr('height', rect.height - this.xAxHeight)
        .attr('transform', `translate(${this.yAxWidth},${this.xAxHeight})`)

      this.defs.append('clipPath')
        .attr('id', 'yAxisClip')
        .append('rect')
        .attr('id', 'yAxisClipRect')
        .attr('width', this.yAxWidth)
        .attr('height', rect.height - this.xAxHeight)
        .attr('transform', `translate(${-this.yAxWidth},${this.xAxHeight})`)

      this.defs.append('clipPath')
        .attr('id', 'imgClip')
        .append('rect')
        .attr('id', 'imgClipRect')
        .attr('width', rect.width - this.yAxWidth)
        .attr('height', rect.height - this.xAxHeight)
      this.defs.append('clipPath')
        .attr('id', 'playheadClip')
        .append('rect')
        .attr('id', 'playheadClipRect')
        .attr('width', rect.width - this.yAxWidth)
        .attr('height', rect.height)
        .attr('transform', `translate(${this.yAxWidth},0)`)
    },

    updateClipPaths() {
      const rect = this.rect();
      d3Select('#clip>#rect')
        .attr('width', rect.width - this.yAxWidth)
        .attr('height', rect.height - this.xAxHeight)
      d3Select('#yAxisClip>#yAxisClipRect')
        .attr('height', rect.height - this.xAxHeight)
      d3Select('#playheadClip>#playheadClipRect')
        .attr('width', rect.width - this.yAxWidth)
    },

    rect() {
      // if (this.$refs.graph) {
        const graf = this.$refs.graph as HTMLElement;
        const rect = graf.getBoundingClientRect();
        return rect;
      // }
    },

    paintBackgroundColors() {
      const rect = this.rect();
      this.svg.append('rect') // behind (for axes)
        .attr('id', 'behindColor')
        .attr('fill', this.axisColor)
        .attr('width', rect.width)
        .attr('height', rect.height)
      this.svg.append('rect') // main graph
        .attr('id', 'backColor')
        .attr('fill', this.backColor)
        .attr('width', rect.width - this.yAxWidth)
        .attr('height', rect.height - this.xAxHeight - 1)
        .attr('transform', `translate(${this.yAxWidth},${this.xAxHeight})`)
    },

    updateBackgroundColors() {
      const rect = this.rect();
      d3Select('#behindColor')
        .attr('width', rect.width)
        .attr('height', rect.height)
      d3Select('#backColor')
        .attr('width', rect.width - this.yAxWidth)
        .attr('height', rect.height - this.xAxHeight - 1)
    },

    center(e: D3ZoomEvent<Element, unknown>) {
      const rect = this.rect()!;
      if (e.sourceEvent) {
        const p = d3Pointers(e, this.svg.node());
        return [d3Mean(p, d => d[0])!, d3Mean(p, d => d[1])!];
      }
      return [rect.width / 2, rect.height / 2]
    },

    nonD3EnactZoom(e: WheelEvent) {
      let deltaX = 0.5 * e.wheelDeltaX / this.tx!().k;
      let deltaY = 0.5 * e.wheelDeltaY / this.ty!().k;
      this.gx!.call(this.zoomX!.translateBy, deltaX, 0);
      this.gy!.call(this.zoomY!.translateBy, 0, deltaY);
      this.redraw();
      this.transformScrollYDragger();
      this.transformScrollXDragger();
      this.leftTime = this.xr().invert(this.yAxWidth);
    },

    // enactZoom(e: D3ZoomEvent<Element, unknown>) {
    //   e.sourceEvent?.preventDefault();
    //   this.d3ZoomEvent = e;
    //   const t = e.transform;
    //   const k = t.k / this.z!.k;
    //   const point = this.center(e);
    //   const doX = point[0] > this.x!.range()[0];
    //   const doY = point[1] > this.y!.range()[0];
    //   if (doX && doY) {
    //     if (e.sourceEvent) {
    //       // console.log('wheel: ', e.sourceEvent.wheelDeltaX, e.sourceEvent.wheelDeltaY)
    //       // console.log('normal: ', e.sourceEvent.deltaX, e.sourceEvent.deltaY)
    //       let deltaX = 0.5 * e.sourceEvent.wheelDeltaX / this.tx!().k;
    //       let deltaY = 0.5 * e.sourceEvent.wheelDeltaY / this.ty!().k;
    //       this.gx!.call(this.zoomX!.translateBy, deltaX, 0);
    //       this.gy!.call(this.zoomY!.translateBy, 0, deltaY);
    //     } else {
    //       // just for in initial this.zoomX setting
    //       const x = (this.yAxWidth * k - this.yAxWidth) / k;
    //       this.zoomX!.scaleBy(this.gx!, k, point);    
    //       this.gx!.call(this.zoomX!.translateTo, x, 0, [0, 0]);
    //       this.gy!.call(this.zoomY!.scaleBy, this.initYScale, point);
    //       this.gy!.call(this.zoomY!.translateTo, 0, this.rect()!.height, [0, 0])
    //     }
    //   } else {
    //     // if not, we're zooming on a fixed point
    //     doX && this.gx!.call(this.zoomX!.scaleBy, k, point);
    //     doY && this.gy!.call(this.zoomY!.scaleBy, k, point);
    //   }
    //   this.z = t;
    //   // this.redraw();
    //   this.throttledRedraw!();
    //   this.transformScrollYDragger();
    //   this.transformScrollXDragger();
    //   this.leftTime = this.xr().invert(this.yAxWidth);
    //   this.transcriptionWidth = Math.round(this.xr()(this.durTot) - this.xr()(0));
    //   this.transcriptionHeight = Math.round(this.yr()(Math.log2(this.freqMin)) - 
    //     this.yr()(Math.log2(this.freqMax)));
    //   // this.xRangeInView = this.xr().domain()
    //   //   .map(t => t / this.durTot) as [number, number];
    // },

    verticalZoomIn() {
      const pt = [this.yAxWidth, this.rect().height / 2]
      this.gy!.call(this.zoomY!.scaleBy, 1.1, pt);
      this.redraw();
      this.transformScrollYDragger();
    },

    verticalZoomOut() {
      const pt = [this.yAxWidth, this.rect().height / 2];
      this.zoomY!.scaleBy(this.gy!, 1/1.1, pt);
      // this.gy!.call(this.zoomY!.scaleBy, 1/1.1, pt);
      this.redraw();
      this.transformScrollYDragger();
    },

    horizontalZoomIn() {
      const pt = [this.rect().width / 2, this.xAxHeight];
      this.gx!.call(this.zoomX!.scaleBy, 1.1, pt);
      this.redraw();
      this.transformScrollXDragger();
    },

    horizontalZoomOut() {
      const pt = [this.rect().width / 2, this.xAxHeight];
      this.gx!.call(this.zoomX!.scaleBy, 1/1.1, pt);
      this.redraw();
      this.transformScrollXDragger();
    },

    getYTickLabels() {
      this.visPitches = this.piece.raga.getPitches({
        low: this.freqMin,
        high: this.freqMax,
      })
      const yTickLabels = this.visPitches.map(p => p.octavedSargamLetter)
      return yTickLabels
    },

    // startAnimationFrame() {
    //   if (!this.requestId) {
    //     this.requestId = window.requestAnimationFrame(this.loopAnimationFrame)
    //   }
    // },

    // loopAnimationFrame() {
    //   this.requestId = undefined;
    //   const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
    //   const latency = ap.ac.outputLatency ? ap.ac.outputLatency : 0;
    //   this.currentTime = ap.getCurTime() - latency;
    //   if (this.currentTime < this.animationStart) {
    //     this.currentTime = this.animationStart;
    //   }
    //   const currentStartTime = this.xr().invert(30);
    //   const currentEndTime = currentStartTime + this.durTot / this.tx!().k;
    //   if (this.currentTime > currentEndTime) {
    //     const delta = (this.rect().width - this.yAxWidth) * 0.8 / this.tx!().k;
    //     this.gx!.call(this.zoomX!.translateBy, -delta, 0);
    //     this.redraw()
    //   }
    //   this.movePlayhead();
    //   // window.setTimeout(this.loopAnimationFrame, 1000 / 60)
    //   this.startAnimationFrame();
    // },

    // stopAnimationFrame() {
    //   if (this.requestId) {
    //     window.cancelAnimationFrame(this.requestId);
    //     this.requestId = undefined;
    //     const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
    //     this.currentTime = ap.getCurTime();
    //     const latency = ap.ac.outputLatency;
    //     this.movePlayhead(latency * 2.0 * 1000);
    //   }
    // },

    // startStretchedAnimationFrame() {
    //   if (!this.requestId) {
    //     const frame = this.loopStretchedAnimationFrame;
    //     this.requestId = window.requestAnimationFrame(frame)
    //   }
    // },

    // loopStretchedAnimationFrame() {
    //   this.requestId = undefined;
    //   const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
    //   const latency = ap.ac.outputLatency;
    //   this.currentTime = ap.getStretchedCurTime() - latency;
    //   if (!ap.loop && this.currentTime < this.stretchedAnimationStart!) {
    //     this.currentTime = this.stretchedAnimationStart!;
    //   }
    //   this.movePlayhead();
    //   this.startStretchedAnimationFrame();
    // },

    // stopStretchedAnimationFrame() {
    //   if (this.requestId) {
    //     window.cancelAnimationFrame(this.requestId);
    //     this.requestId = undefined;
    //     const ap = this.$refs.audioPlayer as typeof EditorAudioPlayer;
    //     this.currentTime = ap.getStretchedCurTime();
    //     const latency = ap.ac.outputLatency;
    //     this.movePlayhead(latency * 2.0 * 1000);
    //   }
    // },

    deleteTraj(trajID: string) {
      const split = trajID.split('t');
      const pIdx = Number(split[0].slice(1));
      const tIdx = Number(split[1]);
      const phrase = this.piece.phrases[pIdx];
      const traj = phrase.trajectories[tIdx];
      const beforeSilent = tIdx > 0 ? 
                           phrase.trajectories[tIdx - 1].id === 12 : 
                           false;
      const afterSilent = phrase.trajectories.length > (tIdx + 1) ? 
                          phrase.trajectories[tIdx + 1].id === 12 : 
                          false;
      // if before is silent, but after is not, 
      let delAfter = false;
      let newTraj = undefined;
      if (beforeSilent && !afterSilent) {
        phrase.trajectories[tIdx - 1].durTot += traj.durTot;
      } else if (afterSilent && !beforeSilent) {
        phrase.trajectories[tIdx + 1].durTot += traj.durTot
      } else if (beforeSilent && afterSilent) {
        phrase.trajectories[tIdx - 1].durTot += traj.durTot;
        const nextTraj = phrase.trajectories[tIdx + 1];
        phrase.trajectories[tIdx - 1].durTot += nextTraj.durTot;
        delAfter = true;
      } else if (!beforeSilent && !afterSilent) {
        const ntObj: {
          id: number,
          durTot: number,
          fundID12: number,
          instrumentation?: string,
        } = {
          id: 12,
          durTot: traj.durTot,
          fundID12: this.piece.raga.fundamental,
        };
        if (this.piece.instrumentation) {
          ntObj.instrumentation = this.piece.instrumentation[0];
        }
        newTraj = new Trajectory(ntObj)
      }
      // if before and after are silence; combine all three trajs into single
      //silent traj
      d3Select(`#${trajID}`).remove();
      d3Select(`#overlay__${trajID}`).remove();
      d3Select(`#articulations__${trajID}`).remove();
      
      if (!newTraj) {        
        phrase.trajectories.filter(traj => traj.num! > tIdx).forEach(traj => {
          const oldId = `p${pIdx}t${traj.num}`;
          const newId = `p${pIdx}t${delAfter ? traj.num! - 2 : traj.num!-1}`;
          d3Select(`#${oldId}`).attr('id', newId);
          d3Select(`#overlay__${oldId}`).attr('id', `overlay__${newId}`);
          d3Select(`#articulations__${oldId}`)
            .attr('id', `articulations__${newId}`);
          let hOffCt = 0;
          let hOnCt = 0;
          let slideCt = 0;
          Object.keys(traj.articulations).forEach(key => {
            const art = traj.articulations[key];
            if (art.name === 'pluck') {
              d3Select(`#pluck${oldId}`).attr('id', `pluck${newId}`);
            } else if (art.name === 'hammer-off') {
              d3Select(`#hammeroff${oldId}i${hOffCt}`)
                .attr('id', `hammeroff${newId}i${hOffCt}`);
              hOffCt++;
            } else if (art.name === 'hammer-on') {
              d3Select(`#hammeron${oldId}i${hOnCt}`)
                .attr('id', `hammeron${newId}i${hOnCt}`);
              hOnCt++;
            } else if (art.name === 'slide') {
              d3Select(`#slide${oldId}i${slideCt}`)
                .attr('id', `slide${newId}i${slideCt}`);
              slideCt++;
            }
          })
        });
      }

      if (newTraj) {
        phrase.trajectories[tIdx] = newTraj;
      } else {
        const newTrajs = phrase.trajectories.filter(traj => {
          if (delAfter) {
            return traj.num !== Number(tIdx) && traj.num !== Number(tIdx + 1)
          } else {
            return traj.num !== Number(tIdx)
          }
        });
        if (this.piece.phrases[pIdx].trajectoryGrid) {
          this.piece.phrases[pIdx].trajectoryGrid[0] = newTrajs;
        } else {
          throw new Error('no trajectory grid');
          // 
          // this.piece.phrases[pIdx].trajectories = newTrajs;
        }  
      }
      this.piece.phrases[pIdx].durArrayFromTrajectories();
      this.piece.phrases[pIdx].assignStartTimes();
      this.piece.phrases[pIdx].assignTrajNums();
      this.piece.durArrayFromPhrases();
      this.piece.updateStartTimes();
      this.codifiedRedrawPhrase(pIdx);
      this.resetSargam();
      this.resetBols();
    },
    
    fixFollowingTrajs(phrase: Phrase, tIdx: number) {
      const pIdx = phrase.pieceIdx;
      phrase.trajectories.filter(traj => traj.num! > tIdx).forEach(traj => {
        const oldId = `p${pIdx}t${traj.num!}`;
        const newId = `p${pIdx}t${traj.num!-1}`;
        d3Select(`#${oldId}`).attr('id', newId);
        d3Select(`#overlay__${oldId}`).attr('id', `overlay__${newId}`);
        d3Select(`#articulations__${oldId}`)
          .attr('id', `articulations__${newId}`);
        let hOffCt = 0;
        let hOnCt = 0;
        let slideCt = 0;
        Object.keys(traj.articulations).forEach(key => {
          const art = traj.articulations[key];
          if (art.name === 'pluck') {
            d3Select(`#pluck${oldId}`).attr('id', `pluck${newId}`);
          } else if (art.name === 'hammer-off') {
            d3Select(`#hammeroff${oldId}i${hOffCt}`)
              .attr('id', `hammeroff${newId}i${hOffCt}`);
            hOffCt++;
          } else if (art.name === 'hammer-on') {
            d3Select(`#hammeron${oldId}i${hOnCt}`)
              .attr('id', `hammeron${newId}i${hOnCt}`);
            hOnCt++;
          } else if (art.name === 'slide') {
            d3Select(`#slide${oldId}i${slideCt}`)
              .attr('id', `slide${newId}i${slideCt}`);
            slideCt++;
          }
        })
      });
    },

    codifiedRedrawPhrase(pIdx: number) {
      const phrase = this.piece.phrases[pIdx];
      const st = phrase.startTime!;
      const vowelIdxs = phrase.firstTrajIdxs();
      phrase.trajectories.forEach((traj, tIdx) => {
        if (traj.id !== 12) {
          const data = this.makeTrajData(traj, st);
          d3Select(`#p${pIdx}t${tIdx}`)
            .datum(data)
            .attr('d', this.codifiedPhraseLine())
          d3Select(`#overlay__${pIdx}t${tIdx}`)
            .datum(data)
            .attr('d', this.codifiedPhraseLine())
        }
        this.codifiedRedrawPlucks(traj, st)
        this.codifiedRedrawKrintin(traj, st)
        this.codifiedRedrawSlide(traj, st)
        this.codifiedRedrawDampener(traj, st)
        if (this.vocal) {
          this.moveSConsonant(traj, st, true)
          this.moveEConsonant(traj, st, true);
          // remove vowel
          const selected = d3Select(`#vowel${pIdx}t${tIdx}`);
          if (selected) selected.remove();
          const g = d3Select(`#articulations__p${pIdx}t${tIdx}`) as 
            Selection<SVGGElement, any, any, any>;
          if (vowelIdxs.includes(tIdx)) {
            this.addVowel(traj, st, g, true);
          }
          this.moveConsonantSymbols(traj, st, true);
        }
      })
    },

    redrawPlucks(traj: Trajectory, phraseStart: number) {
      if (traj.id !== 12) {
        const keys = Object.keys(traj.articulations);
        const relKeys = keys.filter(key => {
          return traj.articulations[key].name === 'pluck'
        });
        const pluckData = relKeys.map(p => {
          const normedX = Number(p) * traj.durTot;
          const y = traj.compute(normedX, true);
          return {
            x: phraseStart + traj.startTime! + Number(p),
            y: y
          }
        });
        const x = (d: DrawDataType) => this.xr()(d.x);
        const y = (d: DrawDataType) => this.yr()(d.y); 
        d3Select(`#pluckp${traj.phraseIdx}t${traj.num}`)
          .data(pluckData)
          .attr('transform', d => `translate(${x(d)}, ${y(d)}) rotate(90)`)
      }
    },

    codifiedRedrawPlucks(traj: Trajectory, phraseStart: number) {
      if (traj.id !== 12) {
        const keys = Object.keys(traj.articulations);
        const relKeys = keys.filter(key => {
          return traj.articulations[key].name === 'pluck'
        });
        const pluckData = relKeys.map(p => {
          const normedX = Number(p) * traj.durTot;
          const y = traj.compute(normedX, true);
          return {
            x: phraseStart + traj.startTime! + Number(p),
            y: y
          }
        });
        const x = (d: DrawDataType) => this.codifiedXR!(d.x);
        const y = (d: DrawDataType) => this.codifiedYR!(d.y);
        d3Select(`#pluckp${traj.phraseIdx}t${traj.num}`)
          .data(pluckData)
          .attr('transform', d => `translate(${x(d)}, ${y(d)}) rotate(90)`)
      }
    },

    redrawKrintin(traj: Trajectory, phraseStart: number) {
      const keys = Object.keys(traj.articulations);
      const hammerOffKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-off'
      });
      const hammerOffData = hammerOffKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y,
          i: i
        }
      });
      const x = (d: DrawDataType) => this.xr()(d.x);
      const y = (d: DrawDataType) => this.yr()(d.y); 
      hammerOffData.forEach(obj => {
        d3Select(`#hammeroffp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .transition()
          .duration(this.transitionTime)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      });
      const hammerOnKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-on'
      });
      const hammerOnData = hammerOnKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y,
          i: i
        }
      });
      hammerOnData.forEach(obj => {
        d3Select(`#hammeronp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .transition()
          .duration(this.transitionTime)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })
    },

    codifiedRedrawKrintin(traj: Trajectory, phraseStart: number) {
      const keys = Object.keys(traj.articulations);
      const hammerOffKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-off'
      });
      const hammerOffData: DrawDataType[] = hammerOffKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y,
          i: i
        }
      });
      const x = (d: DrawDataType) => this.codifiedXR!(d.x);
      const y = (d: DrawDataType) => this.codifiedYR!(d.y);
      hammerOffData.forEach(obj => {
        d3Select(`#hammeroffp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .transition()
          .duration(this.transitionTime)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      });
      const hammerOnKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-on'
      })
      const hammerOnData = hammerOnKeys.map(p => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        return {
          x: phraseStart + traj.startTime! + Number(normedX),
          y: y
        }
      });
      hammerOnData.forEach(obj => {
        d3Select(`#hammeronp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .transition()
          .duration(this.transitionTime)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })
    },


// apparently there's lots of bugs here, beware!
    removeAccidentalSilentTrajs() {
      // remove all silent trajs that are shorter than a very small threshold
      let ct = 0;
      this.piece.phrases.forEach((phrase, pIdx) => {
        phrase.trajectories.forEach((traj, tIdx) => {
          if (traj.id === 12 && traj.durTot < 0.01) {
            
            ct += 1
            if (tIdx === phrase.trajectories.length - 1) {
              // ones at the end of a phrase             
              const splicedTraj = phrase.trajectories.splice(tIdx, 1)[0];
              if (splicedTraj && phrase.trajectories[tIdx-1]) {
                phrase.trajectories[tIdx-1].durTot += splicedTraj.durTot;
              }     
              phrase.durTotFromTrajectories();
              phrase.durArrayFromTrajectories();
            } else if (tIdx !== 0) {
              // ones in the middle of a phrase
              const splicedTraj = phrase.trajectories.splice(tIdx, 1)[0];
              phrase.trajectories[tIdx-1].durTot += splicedTraj.durTot;
              phrase.durTotFromTrajectories();
              phrase.durArrayFromTrajectories();
              phrase.assignStartTimes();
              phrase.assignTrajNums();
              for (let i = tIdx; i < phrase.trajectories.length; i++) {
                const oldId = `p${pIdx}t${i+1}`;
                const newId = `p${pIdx}t${i}`;
                this.reIdAllReps(oldId, newId);
              }
            } else {
              // ones at the beginning of a phrase
              const splicedTraj = phrase.trajectories.splice(tIdx, 1)[0];
              phrase.trajectories[tIdx].durTot += splicedTraj.durTot;
              phrase.durTotFromTrajectories();
              phrase.durArrayFromTrajectories();
              phrase.assignStartTimes();
              phrase.assignTrajNums();
              for (let i = 0; i < phrase.trajectories.length; i++) {
                const oldId = `p${pIdx}t${i+1}`;
                const newId = `p${pIdx}t${i}`;
                this.reIdAllReps(oldId, newId);
              }
            }
          }
        })
      });
      console.log(`removed ${ct} silent trajs`)
    },

    addDampener(
        traj: Trajectory, 
        phraseStart: number, 
        g: d3.Selection<SVGGElement, any, any, any>
        ) {
      const keys = Object.keys(traj.articulations);
      const dampenKeys = keys.filter(key => {
        return traj.articulations[key].name === 'dampen'
      });
      dampenKeys.forEach(() => {
        const x = (d: DrawDataType) => {
          const out = this.xr()(d.x);
          return out
        }
        const y = (d: DrawDataType) => this.yr()(d.y)
        const obj = {
          x: phraseStart + traj.startTime! + traj.durTot,
          y: traj.compute(1, true)
        };
        g.append('path')
          .classed('articulation', true)
          .classed('dampen', true)
          .attr('id', `dampenp${traj.phraseIdx}t${traj.num}`)
          .attr('d', d3Line()([[-2, -8], [0, -8], [0, 8], [-2, 8]]))
          .attr('stroke', this.trajColor)
          .attr('stroke-width', '3px')
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('fill', 'none')
          .data([obj])
          .attr('transform', (d: DrawDataType) => `translate(${x(d)},${y(d)})`)
      })
    },

    codifiedAddDampener(
        traj: Trajectory, 
        phraseStart: number, 
        g: d3.Selection<SVGGElement, any, any, any>
        ) {
      const keys = Object.keys(traj.articulations);
      const dampenKeys = keys.filter(key => {
        return traj.articulations[key].name === 'dampen'
      });
      dampenKeys.forEach(() => {
        const x = this.codifiedXR!(phraseStart + traj.startTime! + traj.durTot);
        const y = this.codifiedYR!(traj.compute(1, true));
        g.append('path')
          .classed('articulation', true)
          .classed('dampen', true)
          .attr('id', `dampenp${traj.phraseIdx}t${traj.num}`)
          .attr('d', d3Line()([[-2, -8], [0, -8], [0, 8], [-2, 8]]))
          .attr('stroke', this.trajColor)
          .attr('stroke-width', '3px')
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('fill', 'none')
          .attr('transform', `translate(${x},${y})`)
      })
    }
  }
})
</script>

<style scoped>



.graph {
  width: calc(100% - 1px);
  height: calc(100% - v-bind(scrollXHeight + 'px'));
  border-right: 1px solid black;
}

.graphContainer {
  width: calc(100% - v-bind(controlBoxWidth + scrollYWidth + 2 + 'px'));
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative
}

#renderer {
  width: calc(100% - v-bind(controlBoxWidth + 'px'));
  height: 100%;
  position: relative;
}

.scrollYContainer {
  width: v-bind(scrollYWidth+'px');
  background-color: white;
  border-right: 1px solid black;
  border-bottom: 1px solid black;
  height: calc(100% - 1px);
  display: flex;
  flex-direction: column;
}

.topNotch {
  width: v-bind(scrollYWidth+'px');
  min-width: v-bind(scrollYWidth+'px');
  height: v-bind(xAxHeight - 0.5 +'px');
  min-height: v-bind(xAxHeight - 0.5 +'px');
  border-bottom: 1px solid black;
  background-color: grey;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.topNotchZoomer {
  width: v-bind(scrollYWidth+'px');
  min-width: v-bind(scrollYWidth+'px');
  height: v-bind((xAxHeight - 1.5)/2 +'px');
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: v-bind(scrollDragColor)
}

.topNotchZoomer:hover {
  background-color: v-bind(scrollDragColorHover);
  cursor: pointer;
}

.topNotchZoomer.top {
  border-bottom: 1px solid black;
}

.scrollY {
  width: 100%;
  height: v-bind(scrollYHeight-1.5 + 'px');
}

.bottomNotch {
  width: 100%;
  height: v-bind(scrollXHeight - 1 + 'px');
  min-height: v-bind(scrollXHeight - 1 + 'px');
  border-top: 1px solid black;
  background-color: grey;
}

.scrollXContainer {
  height: v-bind(scrollXHeight - 1 + 'px');
  min-height: v-bind(scrollXHeight - 1 + 'px');
  width: calc(100% - 1px);
  border-bottom: 1px solid black;
  border-right: 1px solid black;
  background-color: white;
  display: flex;
  flex-direction: row;
}

.leftNotch {
  width: v-bind(yAxWidth - 0.5 + 'px');
  min-width: v-bind(yAxWidth - 0.5 + 'px');
  border-right: 1px solid black;
  background-color: grey;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
}

.leftNotchZoomer {
  width: v-bind((yAxWidth - 1.5)/2 + 'px');
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: v-bind(scrollDragColor);
}

.leftNotchZoomer.left {
  border-right: 1px solid black;
}

.leftNotchZoomer:hover {
  background-color: v-bind(scrollDragColorHover);
  cursor: pointer;
}

.scrollX {
  width: 100%;
  height: 100%;
}

.controlBox {
  width: v-bind(controlBoxWidth+'px');
  height: calc(100% - 1px);
  border-bottom: 1px solid black;
  background-color: #202621;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
  color: white;
}

.scrollingControlBox {
  width: v-bind(controlBoxWidth+'px');
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
  color: white;
  background-color: #202621;
  position: relative;
  overflow-y: scroll;
  scrollbar-width: none;
}

.scrollingControlBox::-webkit-scrollbar {
  display: none
}

.mainzz {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 31px);
  background-color: black;
}

.upperRow {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: v-bind(editorHeight+'px');
}

.lower {
  width: 100%;
  height: 150px;
  background-color: black;
}

button {
  cursor: pointer;
  background-color: v-bind(scrollDragColor);
  border-radius: 5px;
  border: 0px;
}

button:hover {
  background-color: v-bind(scrollDragColorHover);
}
.savedDate {
  font-size: 13px;
  width: 150px;
  text-align: right;
  padding: 0px;
  padding-top: 10px;
}

.cbRow {
  height: 26px;
  min-height: 26px;
  width: v-bind(controlBoxWidth - 10 +'px');
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: right;
  margin-right: 10px;
}

.cbRow > label {
  width: 130px;
  text-align: right;
  margin-right: 5px;
}

.cbRow > input:hover {
  cursor: pointer;
}

.cbRow > button {
  margin-left: 5px;
}

.cbRow > span {
  padding: 0px;
}

.visibilityToggle > label {
  width: auto;
  margin-left: 5px;
}


.noSelect {
  user-select: none;
  -moz-user-select: none;
  -webkit-user-select: none
}

.noSelect>* {
  user-select: none;
  -moz-user-select: none;
  -webkit-user-select: none
}

* {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.filler {
  width: 100%;
  height: 100%;
}

.hidden {
  opacity: 0 !important;
}

.buttonRow {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
}

input[type='checkbox'] {
  user-select: none;
  -moz-user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

.instructionsIcon {
  width: 20px;
  height: 20px;
  position: absolute;
  top: 5px;
  left: 5px;
  border: 1px solid white;
  border-radius: 50%;
  cursor: pointer;
}

.instructionsIcon:hover {
  background-color: #2C342D;
}

.instructions {
  position: absolute;
  top: 0px;
  left: 0px;
  width: calc(100% + v-bind(scrollYWidth - 40 + "px"));
  height: v-bind(editorHeight - 40 +'px');
  background-color: #2C342D;
  color: white;
  text-align: left;
  padding: 20px;
  overflow-y: scroll;
  display: flex;
  justify-content: center;
  font-family: sans-serif;
  font-size: 16px;
  line-height: 1.2;
}

svg {
  touch-action: pan-y pan-x pinch-zoom;
}

.lineBreak {
  border-top: 1px solid black;
  width: 120px;
  height: 0px;
}

.lineBreakParent {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: right;
  width: 100%;
  height: 1px;
  box-sizing: border-box;
  padding-top: 4px;
  padding-right: 10px;
  padding-bottom: 3px;
}


</style>
