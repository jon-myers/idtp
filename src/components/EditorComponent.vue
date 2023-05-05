<template>
<div class='mainzz'>
  <div class='upperRow'>
    <div class='graphContainer'>
      <div class='graph' ref='graph'></div>
      <div class='scrollXContainer'>
        <div class='leftNotch'>
          <div class='leftNotchZoomer left' @click='horizontalZoomOut'>-</div>
          <div class='leftNotchZoomer' @click='horizontalZoomIn'>+</div>
        </div>
        <div class='scrollX' ref='scrollX'></div>
      </div>
      <div 
        class='instructions' 
        v-show='showInstructions' 
        v-html='instructionsText'>
      </div>
    </div>
    <div class='scrollYContainer'>
      <div class='topNotch'>
        <div class='topNotchZoomer top' @click='verticalZoomIn'>+</div>
        <div class='topNotchZoomer' @click='verticalZoomOut'>-</div>
      </div>
      <div class='scrollY' ref='scrollY'></div>
      <div class='bottomNotch'></div>
    </div>
    <div class='controlBox'>
      <div class='scrollingControlBox'>
        <div class='cbRow'>
          <label>Spectrogram</label>
          <input 
            type='checkbox' 
            @change='toggleSpectrogram'
            @click='preventSpaceToggle'>
        </div>
        <div class='cbRow'>
          <label>Loop</label>
          <input type='checkbox' v-model='loop' @click='updateLoop'>
        </div>
        <div class='cbRow'>
          <label>Sargam</label>
          <input 
            type='checkbox' 
            v-model='showSargam' 
            @click='preventSpaceToggle'>
        </div>
        <div class='cbRow'>
          <label>Playhead Return</label>
          <input 
            type='checkbox' 
            v-model='playheadReturn' 
            @click='preventSpaceToggle'>
        </div>
        <div class='cbRow'>
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
          <label>Phonemes</label>
          <select 
            v-model='phonemeRepresentation'
            @change='updatePhonemeRepresentation'
            >
            <option value='Devanagari'>Devanagari</option>
            <option value='IPA'>IPA</option>
            <option value='English'>Roman</option>
          </select>
        </div>
        <div class='instructionsIcon' @click='toggleInstructions'>?</div>
      </div>
      <TrajSelectPanel 
        ref='trajSelectPanel' 
        :editable='editable' 
        :ctrlBoxWidth='controlBoxWidth' />
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
  />
</template>
<script>
const getClosest = (counts, goal) => {
  return counts.reduce((prev, curr) => {
    return Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev
  })
};
const structuredTime = dur => {
  const hours = String(Math.floor(dur / 3600));
  const minutes = leadingZeros(Math.floor((dur % 3600) / 60));
  const seconds = leadingZeros(dur % 60);
  if (hours > 0) {
    return `${hours}:${minutes}:${seconds}`
  } else {
    return `${minutes}:${seconds}`
  }
};
const cumsum = sum => (sum = 0, n => sum += n);
const linSpace = (startValue, stopValue, cardinality) => {
  var arr = [];
  var step = (stopValue - startValue) / (cardinality - 1);
  for (var i = 0; i < cardinality; i++) {
    arr.push(startValue + (step * i));
  }
  return arr;
};
const leadingZeros = int => {
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
  Group
} from '@/js/classes.mjs';

import {
  getPiece,
  getRaagRule,
  getAudioRecording,
  getNumberOfSpectrograms,
  savePiece,
  makeSpectrograms,
  pieceExists
} from '@/js/serverCalls.mjs';
import EditorAudioPlayer from '@/components/EditorAudioPlayer.vue';
import TrajSelectPanel from '@/components/TrajSelectPanel.vue';
import instructionsText from '@/assets/texts/editor_instructions.html?raw';
import { detect } from 'detect-browser';

import { toRaw } from 'vue';

const getStarts = durArray => {
  const cumsum = (sum => value => sum += value)(0);
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
  easeQuadInOut as d3EaseQuadInOut,
  pointers as d3Pointers,
  mean as d3Mean,
} from 'd3';

export default {
  name: 'EditorComponent',
  data() {
    return {
      group: Group,
      piece: undefined,
      durTot: 600,
      freqMin: 100,
      freqMax: 800,
      backColor: 'aliceblue',
      axisColor: '#c4b18b',
      yAxWidth: 30,
      xAxHeight: 30,
      minDrawDur: 0.01, //this could be smaller, potentially
      initViewDur: 20,
      initYScale: 2,
      initXScale: 1,
      spectrogramOpacity: 0,
      transitionTime: 40,
      controlBoxWidth: 200,
      audioSource: undefined,
      currentTime: 0,
      selectedChikariID: undefined,
      chikariColor: 'black',
      selectedChikariColor: 'red',
      dateModified: undefined,
      setChikari: false,
      selectedTrajColor: 'red',
      selectedArtColor: '#9C2208',
      trajColor: 'midnightblue',
      selectedTraj: undefined,
      selectedTrajs: [],
      viewPhrases: true,
      phraseLabelHeight: 30,
      loop: false,
      init: true,
      minTrajDur: 0.05,
      setNewTraj: false,
      setNewPhraseDiv: false,
      justEnded: false,
      editable: false,
      recGain: 0,
      synthGain: 0,
      synthDamping: 0.5,
      showSargam: false,
      rangeOffset: 0.1,
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
      phonemeRepresentation: 'IPA',
      vocal: false,
    }
  },
  components: {
    EditorAudioPlayer,
    TrajSelectPanel
  },
  created() {
    window.addEventListener('keydown', this.handleKeydown);
    window.addEventListener('keyup', this.handleKeyup);
    const navHeight = this.$parent.$parent.navHeight;
    this.editorHeight = window.innerHeight - navHeight - this.playerHeight;
    // this.editorHeight = 800;
    if (this.$store.state.userID === undefined) {
      if (this.$route.query) {
        this.$store.commit('update_query', this.$route.query)
      }
      this.$router.push('/')
    }
  },
  async mounted() {
    window.addEventListener('resize', this.resize);
    this.emitter.on('mutateTraj', newIdx => {
      if (!this.selectedTraj) {
        console.log('no selected traj')
      } else {
        const trajObj = this.selectedTraj.toJSON();
        trajObj.id = newIdx;
        const newTraj = new Trajectory(trajObj);
        const pIdx = this.selectedTraj.phraseIdx;
        const phrase = this.piece.phrases[pIdx];

        const tIdx = this.selectedTraj.num;
        phrase.trajectories[tIdx] = newTraj;
        phrase.assignStartTimes();
        phrase.assignPhraseIdx();
        phrase.assignTrajNums();
        this.selectedTraj = newTraj;
        this.selectedTrajs = [this.selectedTraj];
        const data = this.makeTrajData(this.selectedTraj, phrase.startTime);
        d3Select(`#p${pIdx}t${tIdx}`)
          .datum(data)
          .attr('d', this.codifiedPhraseLine())
        d3Select(`#overlay__p${pIdx}t${tIdx}`)
          .datum(data)
          .attr('d', this.codifiedPhraseLine())
      }
      d3SelectAll('.dragDots').remove();
      this.addAllDragDots();
    });

    this.emitter.on('newTraj', idx => {
      this.trajTimePts.sort((a, b) => a.time - b.time);
      const logSGLines = this.visibleSargam.map(s => Math.log2(s));
      const pitches = this.trajTimePts.map(ttp => {
        return new Pitch(this.visPitches[logSGLines.indexOf(ttp.logFreq)])
      })
      const ttp = this.trajTimePts;
      const durTot = ttp[ttp.length - 1].time - ttp[0].time;
      const times = this.trajTimePts.map(ttp => ttp.time);
      const durArray = times.slice(1).map((x, i) => (x - times[i]) / durTot);
      let articulations;
      const tsp = this.$refs.trajSelectPanel;
      if (tsp.vocal || tsp.pluckBool === false) {
        articulations = {};
      } else {
        articulations = { '0.00': new Articulation({ name: 'pluck' }) }
      }
      if (!tsp.vocal && tsp.dampen === true) {
        // if (!articulations) articulations = {};
        articulations['1.00'] = new Articulation({ name: 'dampen' })
      }
      const trajObj = {
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
      const phrase = this.piece.phrases[pIdx];
      if (this.piece.instrumentation) {
        trajObj.instrumentation = this.piece.instrumentation[0];
      }
      const newTraj = new Trajectory(trajObj);
      const trajs = phrase.trajectories;
      const silentTraj = phrase.trajectories[tIdx];
      const st = phrase.startTime + silentTraj.startTime
      const startsEqual = times[0] === st;
      const endsEqual = times[times.length - 1] === st + silentTraj.durTot;
      if (startsEqual && endsEqual) { // if replaces entire silent traj
        trajs[tIdx] = newTraj;
        phrase.reset();
      } else if (startsEqual) { // if replaces left side of silent traj
        silentTraj.durTot = silentTraj.durTot - durTot;
        trajs.splice(tIdx, 0, newTraj);
        phrase.reset();
        const followingTrajs = trajs.slice(tIdx + 1, trajs.length);
        followingTrajs.reverse().forEach(traj => {
          if (traj.id !== 12) {
            const oldId = `p${pIdx}t${traj.num - 1}`;
            const newId = `p${pIdx}t${traj.num}`;
            this.reIdAllReps(oldId, newId);
          }
        })
      } else if (endsEqual) { // if replaces right side of silent traj
        silentTraj.durTot = silentTraj.durTot - durTot;
        phrase.trajectories.splice(tIdx + 1, 0, newTraj);
        phrase.reset();
        const followingTrajs = trajs.slice(tIdx + 1, trajs.length);
        followingTrajs.reverse().forEach(traj => {
          if (traj.id !== 12) {
            const oldId = `p${pIdx}t${traj.num - 1}`;
            const newId = `p${pIdx}t${traj.num}`;
            this.reIdAllReps(oldId, newId);
          }
        })
      } else { // if replaces internal portion of silent traj
        const firstDur = times[0] - st;
        const lastDur = (st + silentTraj.durTot) - times[times.length - 1];
        silentTraj.durTot = firstDur;
        const lstObj = {
          id: 12,
          pitches: [],
          durTot: lastDur,
          fundID12: this.piece.raga.fundamental
        };
        if (this.piece.instrumentation) {
          lstObj.instrumentation = this.piece.instrumentation[0];
        }
        const lastSilentTraj = new Trajectory(lstObj);
        phrase.trajectories.splice(tIdx + 1, 0, newTraj);
        phrase.trajectories.splice(tIdx + 2, 0, lastSilentTraj);
        phrase.reset();
        const followingTrajs = trajs.slice(tIdx + 2, trajs.length);
        followingTrajs.reverse().forEach(traj => {
          if (traj.id !== 12) {
            const oldId = `p${pIdx}t${traj.num - 2}`;
            const newId = `p${pIdx}t${traj.num}`;
            this.reIdAllReps(oldId, newId);
          }
        })
      }
      //
      const vowelIdxs = phrase.firstTrajIdxs();
      this.codifiedAddTraj(newTraj, phrase.startTime, vowelIdxs);
      this.selectedTraj = newTraj;
      this.selectedTrajs = [this.selectedTraj];
      this.selectedTrajID = `p${newTraj.phraseIdx}t${newTraj.num}`;
      d3Select(`#${this.selectedTrajID}`)
        .attr('stroke', this.selectedTrajColor)
      d3Select(`#overlay__${this.selectedTrajID}`)
        .style('cursor', 'auto')
      d3Select(`#dampen${this.selectedTrajID}`)
        .attr('stroke', this.selectedTrajColor)
      d3Select(`#pluck${this.selectedTrajID}`)
        .attr('stroke', this.selectedArtColor)
        .attr('fill', this.selectedArtColor)
      this.updateArtColors(this.selectedTraj, true);
      this.setNewTraj = false;
      this.trajTimePts = [];
      this.svg.style('cursor', 'auto');
      d3SelectAll(`.newTrajDot`).remove();
      
      this.addAllDragDots();
      const altId = this.selectedTraj.id >= 12 ? 
                    this.selectedTraj.id - 1: 
                    this.selectedTraj.id; 
      tsp.selectedIdx = tsp.trajIdxs.indexOf(altId);
      tsp.parentSelected = true;
      tsp.slope = Math.log2(this.selectedTraj.slope);
      if (this.selectedTraj.vibObj) {
        tsp.extent = this.selectedTraj.vibObj.extent;
        tsp.initUp = this.selectedTraj.vibObj.initUp;
        tsp.periods = this.selectedTraj.vibObj.periods;
        tsp.offset = this.selectedTraj.vibObj.vertOffset;
      }
      const selT = this.selectedTraj;
      const c1 = this.selectedTraj.articulations[0];
      const c2 = this.selectedTraj.articulations['0.00'];
      const c3 = c1 && selT.articulations[0].name === 'pluck';
      const c4 = c2 && selT.articulations['0.00'].name === 'pluck';
      if (c3 || c4) {
        tsp.pluckBool = true
      } else {
        tsp.pluckBool = false
      }
      if (!this.audioDBDoc) {
        this.extendDurTot();
      }
      this.resetSargam();
    });

    this.emitter.on('pluckBool', pluckBool => {
      const selT = this.selectedTraj;
      const c1 = selT.articulations[0] || selT.articulations['0.00'];
      if (pluckBool) {
        if (!c1) {
          this.selectedTraj.articulations['0.00'] = new Articulation();
          const pIdx = this.selectedTraj.phraseIdx;
          const tIdx = this.selectedTraj.num;
          console.log(pIdx, tIdx)
          const phrase = this.piece.phrases[pIdx];
          const g = d3Select(`#articulations__p${pIdx}t${tIdx}`)
          this.codifiedAddPlucks(this.selectedTraj, phrase.startTime, g)
        }
      } else {
        if (c1) {
          delete this.selectedTraj.articulations[0];
          delete this.selectedTraj.articulations['0.00']
          console.log(4)
          this.removePlucks(this.selectedTraj)
        }
      }
    });

    this.emitter.on('dampen', dampen => {
      const pIdx = this.selectedTraj.phraseIdx;
      const tIdx = this.selectedTraj.num;
      if (dampen) {
        this.selectedTraj.articulations['1.00'] = new Articulation({
          name: 'dampen',
        });
        const phrase = this.piece.phrases[pIdx];
        const g = d3Select(`#articulations__p${pIdx}t${tIdx}`);
        this.codifiedAddDampener(this.selectedTraj, phrase.startTime, g);
        d3Select(`#dampen${this.selectedTrajID}`)
          .attr('stroke', this.selectedTrajColor)

      } else {
        if (this.selectedTraj.articulations['1.00']) {
          delete this.selectedTraj.articulations['1.00'];
        }
        d3Select(`#dampenp${pIdx}t${tIdx}`).remove();
      }
    });

    this.emitter.on('vibObj', vibObj => {
      this.selectedTraj.vibObj = vibObj;
      const phrase = this.piece.phrases[this.selectedTraj.phraseIdx];
      const data = this.makeTrajData(this.selectedTraj, phrase.startTime);
      const pIdx = this.selectedTraj.phraseIdx;
      const tIdx = this.selectedTraj.num;
      d3Select(`#p${pIdx}t${tIdx}`)
        .datum(data)
        .attr('d', this.codifiedPhraseLine())
      d3Select(`#overlay__p${pIdx}t${tIdx}`)
        .datum(data)
        .attr('d', this.codifiedPhraseLine())

      // this.resetZoom();
    });

    this.emitter.on('vowel', vowel => {
      this.selectedTraj.updateVowel(vowel)
      const pIdx = this.selectedTraj.phraseIdx;
      const tIdx = this.selectedTraj.num;
      const phrase = this.piece.phrases[pIdx];
      const g = d3Select(`#articulations__p${pIdx}t${tIdx}`);
      const selected = d3Select(`#vowelp${pIdx}t${tIdx}`);
      if (selected.node() === null) {
        console.log('this')
        this.addVowel(this.selectedTraj, phrase.startTime, g, true)
      } else {
        console.log('that')
        selected.remove();
        this.addVowel(this.selectedTraj, phrase.startTime, g, true)
      }
    });

    this.emitter.on('startConsonant', startConsonant => {
      if (startConsonant === undefined) {
        this.selectedTraj.removeConsonant()
      } else if (this.selectedTraj.startConsonant === undefined) {
        this.selectedTraj.addConsonant(startConsonant)
      } else {
        this.selectedTraj.changeConsonant(startConsonant)
      }
      const pIdx = this.selectedTraj.phraseIdx;
      const tIdx = this.selectedTraj.num;
      const phrase = this.piece.phrases[pIdx];
      const g = d3Select(`#articulations__p${pIdx}t${tIdx}`);
      const selected = d3Select(`#startConsonantp${pIdx}t${tIdx}`);
      if (selected.node() === null) {
        this.addStartingConsonant(this.selectedTraj, phrase.startTime, g, true)
      } else if (this.selectedTraj.startConsonant === undefined) {
        selected.remove();
      } else {
        selected.remove();
        this.addStartingConsonant(this.selectedTraj, phrase.startTime, g, true)
      }
    });

    this.emitter.on('endConsonant', endConsonant => {
      if (endConsonant === undefined) {
        // false indicates that this is the end consonant
        this.selectedTraj.removeConsonant(false)
      } else if (this.selectedTraj.endConsonant === undefined) {
        this.selectedTraj.addConsonant(endConsonant, false)
      } else {
        this.selectedTraj.changeConsonant(endConsonant, false)
      }
      const pIdx = this.selectedTraj.phraseIdx;
      const tIdx = this.selectedTraj.num;
      const phrase = this.piece.phrases[pIdx];
      const g = d3Select(`#articulations__p${pIdx}t${tIdx}`);
      const selected = d3Select(`#endConsonantp${pIdx}t${tIdx}`);
      if (selected.node() === null) {
        this.addEndingConsonant(this.selectedTraj, phrase.startTime, g, true)
      } else if (this.selectedTraj.endConsonant === undefined) {
        selected.remove();
      } else {
        selected.remove();
        this.addEndingConsonant(this.selectedTraj, phrase.startTime, g, true)
      }
    });

    try {
      // if there's a query id, 1. check if exists, 2. if so, load it, else:
      // send some sort of message that entered piece didn't exist and go to files.
      // check if stored piece esists. if so, load it, else: load default piece.
      // push the id to router. 
      
      let piece, pieceDoesExist;
      

      const queryId = this.$route.query.id;
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
      this.browser = detect();
      
      if (piece.audioID) {
        
        this.audioSource = this.browser.name === 'safari' ?
          `https://swara.studio/audio/mp3/${piece.audioID}.mp3` :
          `https://swara.studio/audio/opus/${piece.audioID}.opus`;         
        this.audioDBDoc = await getAudioRecording(piece.audioID);
        
        this.durTot = this.audioDBDoc.duration;
        // if pieceDurTot is less than this, add silent phrase to make the two 
        // the same
      } else {
        this.durTot = piece.durTot;
      }
      this.initXScale = this.durTot / this.initViewDur;
      let fund = 246;
      if (this.audioDBDoc && this.audioDBDoc.saEstimate) {
        fund = 2 * this.audioDBDoc.saEstimate * 2 ** this.audioDBDoc.octOffset;
      }
      this.freqMin = 2 ** (Math.log2(fund / 2) - this.rangeOffset);
      this.freqMax = 2 ** (Math.log2(fund * 4) + this.rangeOffset);
      await this.getPieceFromJson(piece, fund);
      const c1 = this.$store.state.userID === this.piece.userID;
      const c2 = this.piece.permissions === 'Publicly Editable';
      const c3 = this.piece.permissions === 'Private';
      if (c1 || c2) {
        this.editable = true
      }
      if (!c1 && c3) {
        await this.$router.push({ name: 'Files' });
          throw 'IDTP logger: Piece does not exist, or you do not have \
          permission to view.'
      }
      this.oldHeight = window.innerHeight;
      const tsp = this.$refs.trajSelectPanel;
      tsp.trajIdxs = this.piece.trajIdxs;
      const vox = ['Vocal (M)', 'Vocal (F)'];
      tsp.vocal = vox.includes(this.piece.instrumentation[0]);
      this.vocal = tsp.vocal;
      await this.initializePiece();
      this.$refs.audioPlayer.parentLoaded();
      const silentDur = this.durTot - piece.durTot;
      if (silentDur >= 0.00001) {
        const stTrajObj = {
          id: 12,
          pitches: [],
          durTot: silentDur,
          fundID12: this.piece.raga.fundamental
        };
        if (this.piece.instrumentation) {
          stTrajObj.instrumentation = this.piece.instrumentation[0];
        }
        const silentTraj = new Trajectory(stTrajObj);
        const phraseObj = {
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
    } catch (err) {
      console.error(err)
    } 
  },

  unmounted() {
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('keyup', this.handleKeyup);
    this.emitter.off('pluckBool');
    this.emitter.off('mutateTraj');
    this.emitter.off('newTraj');
    this.emitter.off('vibObj');
    this.emitter.off('dampen');
    this.emitter.off('vowel');
    this.emitter.off('startConsonant');
    this.emitter.off('endConsonant');
  },

  watch: {
    spectrogramOpacity(newVal) {
      d3SelectAll('.spectrogram')
        .style('opacity', newVal)
    },

    loop() {
      if (this.loop) {
        this.$refs.audioPlayer.loop = true;
        this.$refs.audioPlayer.loopStart = this.regionStartTime;
        this.$refs.audioPlayer.loopEnd = this.regionEndTime;
        if (this.$refs.audioPlayer.sourceNode) {
          this.$refs.audioPlayer.sourceNode.loopStart = this.regionStartTime;
          this.$refs.audioPlayer.sourceNode.loopEnd = this.regionEndTime;
        }
      } else {
        this.$refs.audioPlayer.loop = false;
        this.$refs.audioPlayer.loopStart = undefined;
        this.$refs.audioPlayer.loopEnd = undefined;
      }
    },

    showSargam(newVal) {
      if (newVal) {
        d3SelectAll('.sargamLabels')
          .style('opacity', '1')
      } else {
        d3SelectAll('.sargamLabels')
          .style('opacity', '0')
      }
    },

    regionStartTime(newVal) {
      if (this.loop) {
        this.$refs.audioPlayer.loopStart = newVal;
        if (this.$refs.audioPlayer.sourceNode) {
          this.$refs.audioPlayer.sourceNode.loopStart = newVal;
        }
      }
    },

    regionEndTime(newVal) {
      if (this.loop) {
        this.$refs.audioPlayer.loopEnd = newVal;
        if (this.$refs.audioPlayer.sourceNode) {
          this.$refs.audioPlayer.sourceNode.loopEnd = newVal;
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


  methods: {

    updatePhonemeRepresentation() {
      const nodes = d3SelectAll('.consonant');
      nodes.remove();
      const vNodes = d3SelectAll('.vowel');
      vNodes.remove();
      this.piece.phrases.forEach(phrase => {
        const vowelIdxs = phrase.firstTrajIdxs();
        phrase.trajectories.forEach(traj => {
          const pIdx = phrase.pieceIdx;
          const tIdx = traj.num;
          const g = d3Select(`#articulations__p${pIdx}t${tIdx}`)
          if (traj.id !== 12) {
            this.addStartingConsonant(traj, phrase.startTime, g, true);
            this.addEndingConsonant(traj, phrase.startTime, g, true);
            if (vowelIdxs.includes(traj.num)) {
              this.addVowel(traj, phrase.startTime, g, true);
            }
          }
        })
      })
    },

    setRegionToPhrase(pIdx) {
      const phrase = this.piece.phrases[pIdx];
      const startTime = phrase.startTime;
      const endTime = startTime + phrase.durTot;
      this.regionStartTime = startTime;
      this.regionEndTime = endTime;
      this.regionStartPx = this.xr()(startTime);
      this.regionEndPx = this.xr()(endTime);
      this.setUpRegion();
      this.currentTime = startTime;
        if (!this.$refs.audioPlayer.playing) {
          this.$refs.audioPlayer.pausedAt = startTime;
          this.$refs.audioPlayer.updateProgress();
          this.$refs.audioPlayer.updateFormattedCurrentTime();
          this.$refs.audioPlayer.updateFormattedTimeLeft();
        } else {
          this.$refs.audioPlayer.stop();
          this.$refs.audioPlayer.pausedAt = startTime;
          this.$refs.audioPlayer.play();
        }
        this.movePlayhead();
        this.moveShadowPlayhead();
    },

    toggleSpectrogram() {
      if (this.spectrogramOpacity === 0) {
        this.spectrogramOpacity = 1;
      } else {
        this.spectrogramOpacity = 0;
      }
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
      const phraseStart = this.piece.phrases[lastTraj.phraseIdx].startTime;
      const lastTrajEnd = phraseStart + lastTraj.startTime + lastTraj.durTot;
      if (lastTrajEnd > this.piece.durTot - dur) {
        // if silence after lastTraj, extend it
        const samePhrase = lastSilence.phraseIdx === lastTraj.phraseIdx;
        const c1 = samePhrase && lastSilence.num > lastTraj.num;
        const c2 = lastSilence.phraseIdx > lastTraj.phraseIdx;
        const extraTime = lastTrajEnd + dur - this.piece.durTot;
        if (c1 || c2) {
          lastSilence.durTot += extraTime;
          lastPhrase.reset();
        } else {
          const ntObj = {
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
        this.durTot = this.piece.durTot;
        this.x.domain([0, this.durTot]);
        this.resetZoom();
        this.redraw();
      }
    },

    cleanPhrases() {
      // if a phrase is shorter than some very small number, delete it.
      const realPhrases = this.piece.phrases.filter(phrase => {
        return phrase.durTot > 0.0000001
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

      this.$refs.scrollY.appendChild(this.scrollY.node())
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
        .on('end', this.scrollXDragEnd)

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


      this.$refs.scrollX.appendChild(this.scrollX.node())
    },

    scrollXClick(e) {
      const x = e.offsetX;
      const xDragger = this.scrollX.select('.scrollXDragger');
      const xDraggerXVal = xDragger.node().transform.baseVal[0].matrix.e;
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
      this.gx.call(this.zoomX.translateTo, scrollXVal, 0, [0, 0]);
      this.redraw();
      xDragger.attr('transform', `translate(${deltaX}, 2)`)
    },

    scrollYClick(e) {
      const y = e.offsetY;
      const yDragger = this.scrollY.select('.scrollYDragger');
      const yDraggerYVal = yDragger.node().transform.baseVal[0].matrix.f;
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
      this.gy.call(this.zoomY.translateTo, 0, scrollYVal, [0, 0]);
      this.redraw();
      yDragger.attr('transform', `translate(2, ${deltaY})`)
    },

    pasteTrajs() {
      this.pastedTrajs = [];
      //make sure they are sorted by time first
      this.clipboardTrajs.sort((a, b) => {
        const aPhrase = this.piece.phrases[a.phraseIdx];
        const aPhraseStart = aPhrase.startTime;
        const aStart = a.startTime + aPhraseStart;
        const bPhrase = this.piece.phrases[b.phraseIdx];
        const bPhraseStart = bPhrase.startTime;
        const bStart = b.startTime + bPhraseStart;
        return aStart - bStart;
      }, 0);

      // make sure they all fit within a single silent traj, otherwise indicate
      // somehow that they don't fit
      const fT = this.clipboardTrajs[0];
      const fP = this.piece.phrases[fT.phraseIdx];
      const fPStart = fP.startTime + fT.startTime;
      const lT = this.clipboardTrajs[this.clipboardTrajs.length - 1];
      const lP = this.piece.phrases[lT.phraseIdx];
      const lPEnd = lP.startTime + lT.startTime + lT.durTot;
      const dur = lPEnd - fPStart;
      const realST = this.currentTime;
      const startPIdx = this.phraseIdxFromTime(realST);
      const startP = this.piece.phrases[startPIdx];
      const startTIdx = this.trajIdxFromTime(startP, realST);
      const startT = startP.trajectories[startTIdx];
      const realET = realST + dur;
      const endPIdx = this.phraseIdxFromTime(realET);
      const endP = this.piece.phrases[endPIdx];
      const endTIdx = this.trajIdxFromTime(endP, realET);
      if (startPIdx === endPIdx && startTIdx === endTIdx && startT.id === 12) {
        let grouped = false;
        if (this.clipboardTrajs[0].groupId !== undefined) {
          grouped = true;
        }
        this.clipboardTrajs.forEach(traj => {
          // first, find real start time for original traj
          const origPhrase = this.piece.phrases[traj.phraseIdx];
          const origPhraseStart = origPhrase.startTime;
          const origTrajStart = origPhraseStart + traj.startTime;
          const offsetTrajStart = origTrajStart - fPStart;
          const realStartTime = realST + offsetTrajStart;

          // get idx of phrase and traj in which to paste
          const targetPhraseIdx = this.phraseIdxFromTime(realStartTime);
          const targetPhrase = this.piece.phrases[targetPhraseIdx];
          const targetTrajIdx = this.trajIdxFromTime(targetPhrase, realStartTime);
          const targetTraj = targetPhrase.trajectories[targetTrajIdx];
          // make a copy of traj.toJSON() without reference to original
          const copyObj = JSON.parse(JSON.stringify(traj.toJSON()))
          copyObj.groupId = undefined;
          copyObj.pitches.forEach((pitch, pIdx) => {
            copyObj.pitches[pIdx] = new Pitch(pitch)
          })
          const newTraj = new Trajectory(copyObj);

          const startsTogether = targetTraj.startTime === realStartTime - targetPhrase.startTime;
          const endsTogether = targetTraj.startTime + targetTraj.durTot === realStartTime - targetPhrase.startTime + traj.durTot;
          const trajs = targetPhrase.trajectories;
          if (startsTogether && endsTogether) {
            // replace silent traj with copied traj
            trajs[targetTrajIdx] = newTraj;
            targetPhrase.reset();
          } else if (startsTogether) {
            // replace with copied traj followed by silent traj
            targetTraj.durTot = targetTraj.durTot - newTraj.durTot;
            trajs.splice(targetTrajIdx, 0, newTraj);
            targetPhrase.reset();
            const followingTrajs = trajs.slice(targetTrajIdx + 1, trajs.length);
            followingTrajs.reverse().forEach(t => {
              if (t.id !== 12) {
                const oldId = `p${t.phraseIdx}t${t.num - 1}`;
                const newId = `p${t.phraseIdx}t${t.num}`;
                this.reIdAllReps(oldId, newId);
              }
            })
          } else if (endsTogether) {
            // replace with silent traj followed by copied traj
            targetTraj.durTot = targetTraj.durTot - newTraj.durTot;
            trajs.splice(targetTrajIdx + 1, 0, newTraj);
            targetPhrase.reset();
            const followingTrajs = trajs.slice(targetTrajIdx + 1, trajs.length);
            followingTrajs.reverse().forEach(t => {
              if (t.id !== 12) {
                const oldId = `p${t.phraseIdx}t${t.num - 1}`;
                const newId = `p${t.phraseIdx}t${t.num}`;
                this.reIdAllReps(oldId, newId);
              }
            })
          } else {
            // replace with silent traj followed by copied traj followed by silent traj
            const firstDur = realStartTime - targetPhrase.startTime - targetTraj.startTime;
            const lastDur = targetTraj.durTot - firstDur - newTraj.durTot;
            targetTraj.durTot = firstDur;
            const lstObj = {
              id: 12,
              pitches: [],
              durTot: lastDur,
              fundID12: this.piece.raga.fundamental
            };
            if (this.piece.instrumentation) {
              lstObj.instrument = this.piece.instrumentation;
            }
            const lastTraj = new Trajectory(lstObj);
            trajs.splice(targetTrajIdx + 1, 0, newTraj);
            trajs.splice(targetTrajIdx + 2, 0, lastTraj);
            targetPhrase.reset();
            const followingTrajs = trajs.slice(targetTrajIdx + 2, trajs.length);
            followingTrajs.reverse().forEach(t => {
              if (t.id !== 12) {
                const oldId = `p${t.phraseIdx}t${t.num - 2}`;
                const newId = `p${t.phraseIdx}t${t.num}`;
                this.reIdAllReps(oldId, newId);
              }
            })
          }
          const vowelIdxs = targetPhrase.firstTrajIdxs();
          this.codifiedAddTraj(newTraj, targetPhrase.startTime, vowelIdxs)
          this.pastedTrajs.push(newTraj);
        });
        
        this.selectedTrajs = this.pastedTrajs;
        if (grouped) {
          this.groupSelectedTrajs()
        }
        if (this.selectedTrajs.length === 1) {
          this.selectedTraj = this.selectedTrajs[0];
          this.selectedTrajID = `p${this.selectedTraj.phraseIdx}t${this.selectedTraj.num}`
          d3Select('#' + this.selectedTrajID)
            .attr('stroke', this.selectedTrajColor)
          d3Select(`#dampen${this.selectedTrajID}`)
            .attr('stroke', this.selectedTrajColor)
          d3Select(`#pluck${this.selectedTrajID}`)
            .attr('stroke', this.selectedTrajColor)
            .attr('fill', this.selectedTrajColor)
          d3Select(`#overlay__${this.selectedTrajID}`)
            .attr('cursor', 'default')
        } else {
          this.selectedTrajs.forEach(traj => {
            const id = `p${traj.phraseIdx}t${traj.num}`;
            d3Select(`#${id}`)
              .attr('stroke', this.selectedTrajColor)
            d3Select(`#dampen${id}`)
              .attr('stroke', this.selectedTrajColor)
            d3Select(`#pluck${id}`)
              .attr('fill', this.selectedTrajColor)
            d3Select(`#pluck${id}`)
              .attr('stroke', this.selectedTrajColor)
            d3Select('#overlay__' + id)
              .attr('cursor', 'default')
          })
        }
      } else {
        console.log("Can't paste here")
      }

      
    },

    codifiedAddSargamLabels() { // this 
      const allTrajs = this.piece.phrases.map(p => p.trajectories).flat();
      const allPitches = [];
      // I need pitches and timings
      let lastPitch = { logFreq: undefined, time: undefined };
      let trajStart = 0;
      allTrajs.forEach(t => {
        if (t.id !== 12) {
          const durs = t.durArray.map(d => d * t.durTot);
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
        .style('opacity', Number(this.showSargam));
      const phraseDivs = this.piece.phrases.map(p => p.startTime + p.durTot);
      const pwr = 10 ** 5;
      const roundedPDs = phraseDivs.map(p => Math.round(p * pwr) / pwr);
      allPitches.forEach((p, pIdx) => {
        const lastP = allPitches[pIdx - 1];
        const nextP = allPitches[pIdx + 1];
        const lastHigher = lastP ? lastP.logFreq > p.logFreq : true;
        const nextHigher = nextP ? nextP.logFreq > p.logFreq: true;
        let pos;
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
        if (this.vocal && pos === 1) pos = 0;
        if (this.vocal && pos === 2) pos = 5;
        const positions = [
          { x: 0, y: 15 },
          { x: 0, y: -15 },
          { x: -5, y: -15 },
          { x: -5, y: 15 },
          { x: 5, y: -15 },
          { x: 5, y: 15 }
        ]
        const x = this.codifiedXR(p.time);
        const y = this.codifiedYR(p.logFreq);
        sargamLabels.append('text')
          .attr('x', x + positions[pos].x)
          .attr('y', y + positions[pos].y)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', 14)
          .attr('fill', 'black')
          .text(p.pitch.octavedSargamLetter)
      })
    },

    clearSargamLabels() {
      d3Select('.sargamLabels').remove();
    },

    resetSargam() {
      this.clearSargamLabels();
      this.codifiedAddSargamLabels();
    },

    addAllDragDots() {
      d3SelectAll('.dragDots').remove();
      const pIdx = this.selectedTraj.phraseIdx;
      // const tIdx = this.selectedTraj.num;
      const phrase = this.piece.phrases[pIdx];
      const drag = () => {
        return d3Drag()
          .on('start', this.dragDotStart)
          .on('drag', this.dragDotDragging)
          .on('end', this.dragDotEnd)
      };
      const dragDotsG = this.phraseG.append('g').classed('dragDots', true);
      let times = [0, ...this.selectedTraj.durArray.map(cumsum())];
      const phraseStart = phrase.startTime;
      const ts = this.selectedTraj.startTime;
      times = times.map(a => a * this.selectedTraj.durTot + phraseStart + ts);
      for (let i = 0; i < times.length; i++) {
        const lf = this.selectedTraj.logFreqs[i] ?
          this.selectedTraj.logFreqs[i] :
          this.selectedTraj.logFreqs[i - 1];
        dragDotsG
          .append('circle')
          .attr('id', `dragDot${i}`)
          .attr('cx', this.codifiedXR(times[i]))
          .attr('cy', this.codifiedYR(lf))
          .attr('r', 4)
          .style('fill', 'purple')
          .style('cursor', 'pointer')
        if (this.editable) {
          d3Select(`#dragDot${i}`)
            .call(drag())  
        }          
      }
    },

    async resizeHeight(controlsOpenOverride = undefined) {
      const navHeight = this.$parent.$parent.navHeight;
      const player = this.$refs.audioPlayer;
      let controlsOpen = player.showControls || player.showDownloads || player.showTuning;
      if (controlsOpenOverride !== undefined) {
        controlsOpen = controlsOpenOverride;
      }
      const controlsHeight = controlsOpen ? player.controlsHeight : 0;
      const less = navHeight + controlsHeight + this.playerHeight + 1;
      this.editorHeight = window.innerHeight - less;
      try {
        const leftTime = this.leftTime;
        const currentXK = this.tx().k;
        const currentYK = this.ty().k;
        const yProp = this.getScrollYDraggerTranslate();
        const currentHeight = document.querySelector('#backColor').getBoundingClientRect().height;
        const scalingParam = currentYK * currentHeight;
        const regularMove = await this.initializePiece(leftTime, currentXK, scalingParam, yProp);
        this.resize();
        if (regularMove) {
          await this.$nextTick();

          this.scaleAndMoveToTime(currentXK, leftTime, scalingParam, yProp)
        }
        // console.log(leftTime)
        // this.moveToTime(leftTime)
      } catch (err) {
        console.log(err)
      }
    },

    getCenterPoint() {
      const rect = document.querySelector('#backColor').getBoundingClientRect();
      const x = rect.width / 2;
      const y = rect.height / 2;
      return [x, y];
    },
    
    async makeSpectrograms() {
      // use call from serverCalls.js to create new spectrograms on the server.
      const recId = this.piece.audioID;
      const saEst = this.audioDBDoc.saEstimate;
      const octOffset = this.audioDBDoc.octOffset;
      const result = await makeSpectrograms(recId, saEst * 2 ** Number(octOffset));
      console.log(result)
    },
    
    dragDotStart(e) {
      const phrase = this.piece.phrases[this.selectedTraj.phraseIdx]; 
      const phraseStart = phrase.startTime;
      const trajStart = this.selectedTraj.startTime;
      const idx = e.sourceEvent.target.id.split('dragDot')[1];
      this.dragIdx = idx;
      // const time = this.xr().invert(e.x);
      const logFreq = this.codifiedYR.invert(e.y);
      this.selectedTraj.logFreqs[idx] = logFreq;
      const st = phraseStart + trajStart;
      const endTime = st + this.selectedTraj.durTot;
      const timePts = Math.round((endTime - st) / this.minDrawDur);
      const drawTimes = linSpace(st, endTime, timePts);
      const mp = t => (t - st) / (endTime - st);
      const trajDrawXs = drawTimes.map(mp);
      const trajDrawYs = trajDrawXs.map(x => this.selectedTraj.compute(x))
      const data = trajDrawYs.map((y, i) => {
        return {
          x: drawTimes[i],
          y: y
        }
      });
      this.phraseG.append('path')
        .datum(data)
        .attr('id', 'transparentPhrase')
        .attr('stroke', this.trajColor)
        .attr('fill', 'none')
        .attr('stroke-width', '3px')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('d', this.codifiedPhraseLine())
        .style('opacity', '0.35')
    },
    
    dragDotDragging(e) {
      const idx = Number(this.dragIdx);
      const time = this.constrainTime(e, idx);
      const x = this.codifiedXR(time);
      d3Select(`#dragDot${idx}`)
        .attr('cx', x)
        .attr('cy', e.y)
      const traj = this.selectedTraj;
      const tIdx = traj.num;
      const pIdx = traj.phraseIdx;
      const phrase = this.piece.phrases[traj.phraseIdx];
      const logFreq = this.codifiedYR.invert(e.y);
      if (traj.logFreqs[idx]) {
        traj.logFreqs[idx] = logFreq;
      }
      // special case of moving inner dots, doesn't effect other trajs
      if (idx > 0 && idx < traj.durArray.length) {
        const newDurArray = this.calculateNewDurArray(phrase, traj, idx, time);
        traj.durArray = newDurArray;
      } else if (idx === 0) {
        if (tIdx === 0) {
          const prevPhrase = this.piece.phrases[pIdx - 1];
          const prevTrajs = prevPhrase.trajectories;
          const prevTraj = prevTrajs[prevTrajs.length - 1];
          const initTime = phrase.startTime + traj.startTime;
          const delta = time - initTime;
          if (prevTraj.durArray && prevTraj.durArray.length > 1) {
            prevTraj.durArray = this.newDurArrayZ(prevTraj, delta)
          }
          prevTraj.durTot += delta;
          if (traj.durArray.length > 1) {
            const initPortionA = traj.durArray[0] * traj.durTot;
            const newDurTot = traj.durTot - delta;
            const newPropA = (initPortionA - delta) / newDurTot;
            let newDurArr = traj.durArray.map(i => i * traj.durTot / newDurTot);
            newDurArr[0] = newPropA;
            traj.durArray = newDurArr;
          }
          traj.durTot -= delta;
          phrase.startTime += delta;
          // update the chikari times
          Object.keys(phrase.chikaris).forEach(key => {
            const newKey = (Math.round(100 * (Number(key) - delta)) / 100).toString();
            if (newKey !== key) {
              phrase.chikaris[newKey] = phrase.chikaris[key];
              delete phrase.chikaris[key];
            }
          })
        } else {
          const prevTraj = phrase.trajectories[tIdx - 1];
          const initTime = phrase.startTime + traj.startTime;
          const delta = time - initTime;
          if (prevTraj.durArray && prevTraj.durArray.length > 1) {
            prevTraj.durArray = this.newDurArrayZ(prevTraj, delta)
          }
          prevTraj.durTot += delta;
          if (traj.durArray.length > 1) {
            const initPortionA = traj.durArray[0] * traj.durTot;
            const newDurTot = traj.durTot - delta;
            const newPropA = (initPortionA - delta) / newDurTot;
            let newDurArr = traj.durArray.map(i => i * traj.durTot / newDurTot);
            newDurArr[0] = newPropA;
            traj.durArray = newDurArr;
          }
          traj.durTot -= delta;
          traj.startTime += delta;
        }
        // if previous traj of this phrase
      } else if (idx === traj.durArray.length) {
        if (tIdx < phrase.trajectories.length - 1) {
          const nextTraj = phrase.trajectories[tIdx + 1];
          const initTime = phrase.startTime + traj.startTime + traj.durTot;
          const delta = time - initTime;
          if (nextTraj.durArray && nextTraj.durArray.length > 1) {
            nextTraj.durArray = this.newDurArrayA(nextTraj, delta);
          }
          nextTraj.durTot -= delta;
          nextTraj.startTime += delta;
          
          if (traj.durArray.length > 1) {
            // const tda = traj.durArray;
            // const initPortionZ = tda[tda.length - 1] * traj.durTot;
            // const newDurTot = traj.durTot + delta;
            // const newPropZ = (initPortionZ + delta) / newDurTot;
            // let newDurArray = tda.map(i => i * traj.durTot / newDurTot);
            // newDurArray[newDurArray.length - 1] = newPropZ;
            // traj.durArray = newDurArray;
            traj.durArray = this.newDurArrayZ(traj, delta)
          }
          traj.durTot += delta;
          phrase.durArrayFromTrajectories();
        } else {
          if (this.piece.phrases[pIdx + 1]) {
            const nextPhrase = this.piece.phrases[pIdx + 1];
            const nextTraj = nextPhrase.trajectories[0];
            const initTime = phrase.startTime + traj.startTime + traj.durTot;
            const delta = time - initTime;
            if (nextTraj.durArray && nextTraj.durArray.length > 1) {
              nextTraj.durArray = this.newDurArrayA(nextTraj, delta)
            }
            nextTraj.durTot -= delta;
            nextPhrase.startTime += delta;
            nextPhrase.durTotFromTrajectories();
            nextPhrase.durArrayFromTrajectories();
            nextPhrase.assignStartTimes();
            const tda = traj.durArray;
            if (tda.length > 1) {
              const initPortionZ = tda[tda.length - 1] * traj.durTot;
              const newDurTot = traj.durTot + delta;
              const newPropZ = (initPortionZ + delta) / newDurTot;
              let newDurArray = tda.map((i => i * traj.durTot / newDurTot));
              newDurArray[newDurArray.length - 1] = newPropZ;
              traj.durArray = newDurArray;
            }
            traj.durTot += delta;
            phrase.durTotFromTrajectories();
            phrase.durArrayFromTrajectories();
            phrase.assignStartTimes();
            // move chikaris in next phrase
            Object.keys(nextPhrase.chikaris).forEach(key => {
              const newKey = (Math.round(100 * (Number(key) - delta)) / 100).toString();
              if (newKey !== key) {
                nextPhrase.chikaris[newKey] = nextPhrase.chikaris[key];
                delete nextPhrase.chikaris[key];
              }
            })
          }
        }
      }
      const data = this.makeTrajData(traj, phrase.startTime)
      d3Select(`#transparentPhrase`)
        .datum(data)
        .attr('d', this.codifiedPhraseLine())
    },
    
    dragDotEnd(e) {
      let deletedSilentTraj = false;
      let resetRequired = false;
      const idx = Number(this.dragIdx);
      const time = this.constrainTime(e, idx);
      const x = this.codifiedXR(time);
      const traj = this.selectedTraj;
      const phrase = this.piece.phrases[traj.phraseIdx];
      const pIdx = traj.phraseIdx;
      const tIdx = traj.num;
      let logFreq = this.codifiedYR.invert(e.y);
      const logSGLines = this.visibleSargam.map(s => Math.log2(s));
      logFreq = getClosest(logSGLines, logFreq)
      const y = this.codifiedYR(logFreq)
      d3Select(`#dragDot${idx}`)
        .attr('cx', x)
        .attr('cy', y)
      const newPitch = new Pitch(this.visPitches[logSGLines.indexOf(logFreq)])
      if (traj.logFreqs[idx]) {
        traj.logFreqs[idx] = logFreq;
        traj.pitches[idx] = newPitch
      }
      // special case of moving inner dots, doesn't effect other trajs
      if (idx > 0 && idx < traj.durArray.length) {
        const newDurArray = this.calculateNewDurArray(phrase, traj, idx, time);
        traj.durArray = newDurArray;
      } else if (idx === 0) {
        if (tIdx === 0) {
          resetRequired = true;
          const prevPhrase = this.piece.phrases[pIdx - 1];
          const pTrajs = prevPhrase.trajectories;
          const prevTraj = pTrajs[pTrajs.length - 1];
          const initTime = phrase.startTime + traj.startTime;
          const delta = time - initTime;
          prevTraj.durTot += delta;
          prevPhrase.durTotFromTrajectories();
          prevPhrase.durArrayFromTrajectories();
          if (prevTraj.durTot === 0) {
            prevPhrase.durArrayFromTrajectories();
          }
          if (traj.durArray.length > 1) {
            const initPortionA = traj.durArray[0] * traj.durTot;
            const durTot = traj.durTot - delta;
            const newPropA = (initPortionA - delta) / durTot;
            let newDurArray = traj.durArray.map(i => i * traj.durTot / durTot);
            newDurArray[0] = newPropA;
            traj.durArray = newDurArray;
          }
          traj.durTot -= delta;
          phrase.startTime += delta;
          phrase.durTotFromTrajectories();
          phrase.durArrayFromTrajectories();
          // update the chikari times
          Object.keys(phrase.chikaris).forEach(key => {
            let newKey = (Math.round(100 * (Number(key) - delta)) / 100);
            newKey = newKey.toString();
            if (newKey !== key) {
              phrase.chikaris[newKey] = phrase.chikaris[key];
              delete phrase.chikaris[key];
            }
            if (Number(newKey) < 0) {
              let prevPhraseNewKey = (prevPhrase.durTot + Number(newKey))
              prevPhraseNewKey = prevPhraseNewKey.toFixed(2);
              prevPhrase.chikaris[prevPhraseNewKey] = phrase.chikaris[newKey];
              delete phrase.chikaris[newKey];
            }
          })
          // for each chikari in prevPhrase, if it is now in the next phrase, 
          // move it
          Object.keys(prevPhrase.chikaris).forEach(key => {
            if (Number(key) > prevPhrase.durTot) {
              const newKey = (Number(key) - prevPhrase.durTot).toFixed(2);
              phrase.chikaris[newKey] = prevPhrase.chikaris[key];
              delete prevPhrase.chikaris[key]
            }
          })
        } else {
          const prevTraj = phrase.trajectories[tIdx - 1];
          const initTime = phrase.startTime + traj.startTime;
          const delta = time - initTime;
          prevTraj.durTot += delta;
          if (prevTraj.durTot === 0) {
            phrase.durArrayFromTrajectories();
            phrase.assignStartTimes();
            phrase.assignTrajNums();
          }
          phrase.durArrayFromTrajectories();
          if (traj.durArray.length > 1) {
            const initPortionA = traj.durArray[0] * traj.durTot;
            const durTot = traj.durTot - delta;
            const newPropA = (initPortionA - delta) / durTot;
            let newDurArray = traj.durArray.map(i => i * traj.durTot / durTot);
            newDurArray[0] = newPropA;
            traj.durArray = newDurArray;
          }
          traj.durTot -= delta;
        }
      } else if (idx === traj.durArray.length) {
        if (tIdx < phrase.trajectories.length - 1) {
          const nextTraj = phrase.trajectories[tIdx + 1];
          const initTime = phrase.startTime + traj.startTime + traj.durTot;
          const delta = time - initTime;
          nextTraj.durTot -= delta;
          traj.durTot += delta;
          if (traj.durArray.length > 1) {
            const tda = traj.durArray;
            const initPortionZ = tda[tda.length - 1] * traj.durTot;
            const durTot = traj.durTot + delta;
            const newPropZ = (initPortionZ + delta) / durTot;
            let newDurArray = tda.map((i => i * traj.durTot / durTot));
            newDurArray[newDurArray.length - 1] = newPropZ;
            traj.durArray = newDurArray;
          }
          phrase.trajectories[tIdx + 1] = nextTraj;
          if (nextTraj.durTot === 0) {
            phrase.durArrayFromTrajectories();
            phrase.assignStartTimes();
            phrase.assignTrajNums();
            deletedSilentTraj = true
          }
          phrase.durArrayFromTrajectories();
        } else {
          if (this.piece.phrases[pIdx + 1]) {
            resetRequired = true;
            const nextPhrase = this.piece.phrases[pIdx + 1];
            const nextTraj = nextPhrase.trajectories[0];
            const initTime = phrase.startTime + traj.startTime + traj.durTot;
            const delta = time - initTime;
            nextTraj.durTot -= delta;
            nextPhrase.startTime += delta;
            nextPhrase.durTotFromTrajectories();
            nextPhrase.durArrayFromTrajectories();
            nextPhrase.assignStartTimes();
            if (nextTraj.durTot === 0) {
              nextPhrase.assignTrajNums();
              nextPhrase.durArrayFromTrajectories();
            }
            traj.durTot += delta;
            Object.keys(nextPhrase.chikaris).forEach(key => {
              let newKey = (Math.round(100 * (Number(key) - delta)) / 100);
              newKey = newKey.toString();
              if (newKey !== key) {
                nextPhrase.chikaris[newKey] = nextPhrase.chikaris[key];
                delete nextPhrase.chikaris[key];
              }
              if (Number(newKey) < 0) {
                let phraseNewKey = (phrase.durTot + Number(newKey)).toFixed(2);
                phrase.chikaris[phraseNewKey] = nextPhrase.chikaris[newKey];
                delete nextPhrase.chikaris[newKey];
              }
            })
            // for each chikari in prevPhrase, if it is now in the next phrase, 
            // move it
            Object.keys(phrase.chikaris).forEach(key => {
              if (Number(key) > phrase.durTot) {
                const newKey = (Number(key) - phrase.durTot).toFixed(2);
                nextPhrase.chikaris[newKey] = phrase.chikaris[key];
                delete phrase.chikaris[key]
              }
            })
          }
        }
      }
      const data = this.makeTrajData(traj, phrase.startTime);
      d3Select(`#transparentPhrase`).remove()
      d3Select(`#p${pIdx}t${tIdx}`)
        .datum(data)
        .attr('d', this.codifiedPhraseLine())
      d3Select(`#overlay__p${pIdx}t${tIdx}`)
        .datum(data)
        .attr('d', this.codifiedPhraseLine())
      if (idx === 0) {
        if (tIdx === 0) {
          const prevPhrase = this.piece.phrases[pIdx - 1];
          const pTrajs = prevPhrase.trajectories;
          const prevTraj = pTrajs[pTrajs.length - 1];
          const newPrevTraj = this.fixTrajectory(prevTraj);
          prevPhrase.trajectories[pTrajs.length - 1] = newPrevTraj;
          prevPhrase.assignStartTimes();
          prevPhrase.assignTrajNums();
          prevPhrase.assignPhraseIdx();
          const data = this.makeTrajData(newPrevTraj, prevPhrase.startTime);
          d3Select(`#p${pIdx-1}t${prevPhrase.trajectories.length-1}`)
            .datum(data)
            .attr('d', this.codifiedPhraseLine())
          d3Select(`#overlay__p${pIdx-1}t${prevPhrase.trajectories.length-1}`)
            .datum(data)
            .attr('d', this.codifiedPhraseLine())
          this.moveKrintin(newPrevTraj, phrase.startTime);
          this.moveSlides(newPrevTraj, phrase.startTime);
          this.movePhraseDivs();
        } else {
          const prevTraj = phrase.trajectories[tIdx - 1];
          const newPrevTraj = this.fixTrajectory(prevTraj);
          phrase.trajectories[tIdx - 1] = newPrevTraj;
          phrase.assignStartTimes();
          phrase.assignTrajNums();
          phrase.assignPhraseIdx();
          const data = this.makeTrajData(newPrevTraj, phrase.startTime);
          d3Select(`#p${pIdx}t${tIdx-1}`)
            .datum(data)
            .attr('d', this.codifiedPhraseLine())
          d3Select(`#overlay__p${pIdx}t${tIdx-1}`)
            .datum(data)
            .attr('d', this.codifiedPhraseLine())
          this.moveKrintin(newPrevTraj, phrase.startTime);
          this.moveSlides(newPrevTraj, phrase.startTime)
        }
      } else if (idx === traj.durArray.length) {
        if (tIdx < phrase.trajectories.length - 1) {
          if (deletedSilentTraj) {
          } else {
            const nextTraj = phrase.trajectories[tIdx + 1];
            const newNextTraj = this.fixTrajectory(nextTraj);
            phrase.trajectories[tIdx + 1] = newNextTraj;
            phrase.assignStartTimes();
            phrase.assignTrajNums();
            phrase.assignPhraseIdx();
            const data = this.makeTrajData(nextTraj, phrase.startTime);
            d3Select(`#p${pIdx}t${tIdx+1}`)
              .datum(data)
              .attr('d', this.codifiedPhraseLine())
            d3Select(`#overlay__p${pIdx}t${tIdx+1}`)
              .datum(data)
              .attr('d', this.codifiedPhraseLine())
            this.moveKrintin(newNextTraj, phrase.startTime);
            this.moveSlides(newNextTraj, phrase.startTime);
            this.codifiedRedrawDampener(newNextTraj, phrase.startTime);
            this.moveStartingConsonant(newNextTraj, phrase.startTime, true);
            this.moveEndingConsonant(newNextTraj, phrase.startTime, true);
            this.moveVowel(newNextTraj, phrase.startTime, true);
            console.log(0)
            this.removePlucks(newNextTraj);
            const g = d3Select(`#articulations__p${pIdx}t${tIdx+1}`);
            this.codifiedAddPlucks(newNextTraj, phrase.startTime, g);
          }
          


        } else {
          if (this.piece.phrases[pIdx + 1]) {
            const nextPhrase = this.piece.phrases[pIdx + 1];
            const nextTraj = nextPhrase.trajectories[0];
            const newNextTraj = this.fixTrajectory(nextTraj);
            nextPhrase.trajectories[0] = newNextTraj;
            nextPhrase.assignStartTimes();
            nextPhrase.assignTrajNums();
            nextPhrase.assignPhraseIdx();
            const data = this.makeTrajData(newNextTraj, nextPhrase.startTime);
            d3Select(`#p${pIdx+1}t${0}`)
              .datum(data)
              .attr('d', this.codifiedPhraseLine())
            d3Select(`#overlay__p${pIdx+1}t${0}`)
              .datum(data)
              .attr('d', this.codifiedPhraseLine())
            this.moveKrintin(newNextTraj, nextPhrase.startTime)
            this.moveSlides(newNextTraj, nextPhrase.startTime)
            this.codifiedRedrawDampener(newNextTraj, nextPhrase.startTime)
            this.moveStartingConsonant(newNextTraj, nextPhrase.startTime, true);
            this.moveEndingConsonant(newNextTraj, nextPhrase.startTime, true);
            this.moveVowel(newNextTraj, nextPhrase.startTime, true);
            console.log(1)
            this.removePlucks(newNextTraj);
            const g = d3Select(`#articulations__p${pIdx+1}t${0}`);
            this.codifiedAddPlucks(newNextTraj, nextPhrase.startTime, g);
            this.movePhraseDivs()
          }
        }
      }
      this.removePlucks(traj);
      const g = d3Select(`#articulations__p${pIdx}t${tIdx}`)
      this.codifiedAddPlucks(traj, phrase.startTime, g);
      const newTraj = this.fixTrajectory(traj)
      this.piece.phrases[pIdx].trajectories[tIdx] = newTraj
      phrase.assignStartTimes();
      phrase.assignTrajNums();
      phrase.assignPhraseIdx();
      this.selectedTraj = newTraj;
      this.selectedTrajs = [this.selectedTraj];
      this.moveKrintin(this.selectedTraj, phrase.startTime);
      this.moveSlides(this.selectedTraj, phrase.startTime);
      this.codifiedRedrawDampener(this.selectedTraj, phrase.startTime);
      this.moveStartingConsonant(this.selectedTraj, phrase.startTime, true);
      this.moveEndingConsonant(this.selectedTraj, phrase.startTime, true);
      this.moveVowel(this.selectedTraj, phrase.startTime, true);
      this.cleanEmptyTrajs(phrase);
      this.moveChikaris(phrase);
      if (resetRequired) this.resetZoom();
      this.resetSargam();
    },
    
    cleanEmptyTrajs(phrase) {
      phrase.trajectories.forEach((traj, i) => {
        if (traj.durTot === 0) {
          phrase.trajectories.splice(i, 1);
          phrase.durArray.splice(i, 1);
          phrase.trajectories.slice(i).forEach(_traj => {
            const oldTIdx = _traj.num;
            const newTIdx = _traj.num - 1;
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

    newDurArrayA(traj, delta) {
      const initPortionA = traj.durArray[0] * traj.durTot;
      const newDurTot = traj.durTot - delta;
      const newPropA = (initPortionA - delta) / newDurTot;
      let newDurArray = traj.durArray.map((i => i * traj.durTot / newDurTot));
      newDurArray[0] = newPropA;
      return newDurArray
    },

    newDurArrayZ(traj, delta) {
      const initPortionZ = traj.durArray[traj.durArray.length-1] * traj.durTot;
      const newDurTot = traj.durTot + delta;
      const newPropZ = (initPortionZ + delta) / newDurTot;
      let newDurArray = traj.durArray.map((i => i * traj.durTot / newDurTot));
      newDurArray[newDurArray.length - 1] = newPropZ;
      return newDurArray;
    },

    fixTrajectory(traj) {
      // so that articulations are in the right place according to new durArray;
      if (!this.vocal) {
        const trajObj = traj.toJSON();
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
        delete trajObj.articulations;
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

    constrainTime(e, idx) {
      let time = this.codifiedXR.invert(e.x);
      const traj = this.selectedTraj;
      const pIdx = traj.phraseIdx;
      const tIdx = traj.num;
      const phrase = this.piece.phrases[pIdx];
      let times = [0, ...traj.durArray.map(cumsum())];
      const st = phrase.startTime + traj.startTime;
      times = times.map(a => a * traj.durTot + st);
      if (idx === 0) {
        let start;
        let prevTraj;
        if (tIdx > 0) {
          prevTraj = phrase.trajectories[tIdx - 1];
          if (prevTraj.durArray && prevTraj.durArray.length > 1) {
            let prevTrajTimes = [0, ...prevTraj.durArray.map(cumsum())];
            prevTrajTimes = prevTrajTimes.map(a => {
              return a * prevTraj.durTot + phrase.startTime + prevTraj.startTime
            });
            start = prevTrajTimes[prevTrajTimes.length - 2]
          } else {
            start = phrase.startTime + phrase.trajectories[tIdx - 1].startTime
          }
        } else if (pIdx > 0) {
          const prevPhrase = this.piece.phrases[pIdx - 1];
          const pTrajs = prevPhrase.trajectories;
          prevTraj = pTrajs[pTrajs.length - 1];
          if (prevTraj.durArray && prevTraj.durArray.length > 1) {
            let prevTrajTimes = [0, ...prevTraj.durArray.map(cumsum())];
            prevTrajTimes = prevTrajTimes.map(a => {
              const pst = prevPhrase.startTime + prevTraj.startTime;
              return a * prevTraj.durTot + pst
            });
            start = prevTrajTimes[prevTrajTimes.length - 2]
          } else {
            start = prevPhrase.startTime + prevTraj.startTime
          }
        }
        if (prevTraj.id === 12) {
          if (time < start) time = start
        } else {
          if (time < start + this.minTrajDur) {
            time = start + this.minTrajDur
          }
        }      
        if (time > times[1] - this.minTrajDur) {
          time = times[1] - this.minTrajDur
        }
      } else if (idx < times.length - 1) {
        if (time < times[idx - 1] + this.minTrajDur) {
          time = times[idx - 1] + this.minTrajDur
        }
        if (time > times[idx + 1] - this.minTrajDur) {
          time = times[idx + 1] - this.minTrajDur
        }
      } else {
        let nextEnd;
        let nextTraj;
        if (time < times[idx - 1] + this.minTrajDur) {
          time = times[idx - 1] + this.minTrajDur
        }
        if (phrase.trajectories[tIdx + 1]) {
          nextTraj = phrase.trajectories[tIdx + 1];
          if (nextTraj.durArray && nextTraj.durArray.length > 1) {
            let nextTrajTimes = [0, ...nextTraj.durArray.map(cumsum())];
            nextTrajTimes = nextTrajTimes.map(a => {
              const st = phrase.startTime + nextTraj.startTime;
              return a * nextTraj.durTot + st
            });
            nextEnd = nextTrajTimes[1]
          } else {
            nextEnd = phrase.startTime + nextTraj.startTime + nextTraj.durTot
          }
        } else if (this.piece.phrases[pIdx + 1]) {
          const nextPhrase = this.piece.phrases[pIdx + 1];
          nextTraj = nextPhrase.trajectories[0];
          if (nextTraj.durArray && nextTraj.durArray.length > 1) {
            let nextTrajTimes = [0, ...nextTraj.durArray.map(cumsum())];
            nextTrajTimes = nextTrajTimes.map(a => {
              const nst = nextPhrase.startTime + nextTraj.startTime;
              return a * nextTraj.durTot + nst
            });
            nextEnd = nextTrajTimes[1]
          } else {
            const nst = nextPhrase.startTime + nextTraj.startTime;
            nextEnd = nst + nextTraj.durTot;
          }
        }
        if (nextTraj.id === 12) {
          if (time > nextEnd) time = nextEnd
        } else {
          if (time > nextEnd - this.minTrajDur) {
            time = nextEnd - this.minTrajDur
          }
        }  
      }
      return time
    },

    calculateNewDurArray(phrase, traj, idx, time) {
      let times = [0, ...traj.durArray.map(cumsum())];
      const st = phrase.startTime + traj.startTime;
      times = times.map(a => a * traj.durTot + st);
      const newTimes = times.slice();
      newTimes[idx] = time;
      let durArray = newTimes.slice(1).map((v, i) => v - newTimes[i]);
      const daSum = durArray.reduce((a, b) => a + b, 0)
      durArray = durArray.map(i => i / daSum)
      return durArray
    },
    
    addNewPhraseDiv(idx) {
      const phrase = this.piece.phrases[idx];
      const time = phrase.startTime + phrase.durTot;
      const drag = () => {
        return d3Drag()
          .on('start', this.phraseDivDragStart(idx))
          .on('drag', this.phraseDivDragDragging(idx))
          .on('end', this.phraseDivDragEnd(idx))
      }; 
      const dontClick = e => {
        e.stopPropagation();
      };
      const realPhraseStartIdx = idx + 1;
      const sectionDiv = this.piece.sectionStarts.includes(realPhraseStartIdx);
      this.phraseG
        .append('path')
        .attr('id', `phraseLine${idx}`)
        .classed('phraseDiv', true)
        .attr('stroke', 'black')
        .attr('stroke-width', sectionDiv ? '4px' : '2px')
        .attr('d', this.playheadLine(true))
        .style('opacity', this.viewPhrases ? '1' : '0')
        .attr('transform', `translate(${this.codifiedXR(time)},0)`);
      this.phraseG
        .append('path')
        .attr('id', `overlay__phraseLine${idx}`)
        .classed('phraseDiv', true)
        .attr('stroke', 'black')
        .attr('stroke-width', '4px')
        .attr('d', this.playheadLine(true))
        .style('opacity', '0')
        .attr('transform', `translate(${this.codifiedXR(time)},0)`)
        .style('cursor', 'pointer')
        .on('click', dontClick)
      if (this.editable) {
        d3Select(`#overlay__phraseLine${idx}`)
          .call(drag())
      } 
      // reId all trajs and articulations in following phrases
      for (let i = this.piece.phrases.length-1; i > 1 + idx; i--) {
        const thisPhrase = this.piece.phrases[i];
        thisPhrase.trajectories.forEach(traj => {
          const oldId = `p${i-1}t${traj.num}`;
          const newId = `p${i}t${traj.num}`;
          this.reIdAllReps(oldId, newId);
        });
        // chikaris
        Object.keys(thisPhrase.chikaris).forEach(key => {
          const lastPhrase = this.piece.phrases[i-1];
          const oldSec = Math.floor(Number(key));
          const oldDec = (Number(key) % 1).toFixed(2).toString().slice(2);
          const oldId = `p${lastPhrase.pieceIdx}_${oldSec}_${oldDec}`;
          const newId = `p${thisPhrase.pieceIdx}_${oldSec}_${oldDec}`;
          d3Select(`#circle__${oldId}`).attr('id', `circle__${newId}`);
          d3Select(`#${oldId}`).attr('id', newId); 
        })
      }
      //reId all trajs to the right of the new phraseDivLine
      const nextPhrase = this.piece.phrases[idx+1];
      nextPhrase.trajectories.forEach(traj => {
        const add = phrase.trajectories.length;
        const oldId = `p${phrase.pieceIdx}t${traj.num + add}`;
        const newId = `p${nextPhrase.pieceIdx}t${traj.num}`;
        this.reIdAllReps(oldId, newId)
      })
      // move all chikaris to new phrase, and reId
      Object.keys(phrase.chikaris).forEach(key => {
        if (Number(key) > phrase.durTot) {
          const newKey = (Number(key) - phrase.durTot).toFixed(2);
          const oldSec = Math.floor(Number(key));
          const oldDec = (Number(key) % 1).toFixed(2).toString().slice(2);
          const oldId = `p${phrase.pieceIdx}_${oldSec}_${oldDec}`;
          const newSec = Math.floor(Number(newKey));
          const newDec = (Number(newKey) % 1).toFixed(2).toString().slice(2);
          const newId = `p${nextPhrase.pieceIdx}_${newSec}_${newDec}`;
          d3Select(`#circle__${oldId}`).attr('id', `circle__${newId}`);
          d3Select(`#${oldId}`).attr('id', newId);
          nextPhrase.chikaris[newKey] = phrase.chikaris[key];
          delete phrase.chikaris[key];
        }
      });
      const realIdx = idx + 1;
      this.piece.sectionStarts = this.piece.sectionStarts.map(i => {
        if (i >= realIdx) {
          return i + 1;
        } else {
          return i;
        }
      });
      this.phraseG.selectAll('.phraseDiv').remove();
      this.updatePhraseDivs();
    },

    updatePhraseDivs() {
      if (this.viewPhrases) {
        this.piece.phrases.forEach((phrase, i) => {
          const endTime = phrase.startTime + phrase.durTot;
          if (d3Select(`#phraseLine${i}`).node()) {
            d3Select(`#phraseLine${i}`)
              .style('opacity', '1')
          } else {           
            const drag = () => {
              return d3Drag()
                .on('start', this.phraseDivDragStart(i))
                .on('drag', this.phraseDivDragDragging(i))
                .on('end', this.phraseDivDragEnd(i))
            }
            const sectionDiv = this.piece.sectionStarts.includes(i + 1);
            this.phraseG
              .append('path')
              .classed('phraseDiv', true)
              .attr('id', `phraseLine${i}`)
              .attr('stroke', 'black')
              .attr('stroke-width', sectionDiv ? '4px' : '2px')
              .attr('d', this.playheadLine())
              .style('opacity', '1')
              .attr('transform', `translate(${this.codifiedXR(endTime)},0)`)
            this.phraseG
              .append('path')
              .classed('phraseDiv', true)
              .attr('id', `overlay__phraseLine${i}`)
              .attr('stroke', 'black')
              .attr('stroke-width', '4px')
              .attr('d', this.playheadLine())
              .style('opacity', '0')
              .attr('transform', `translate(${this.codifiedXR(endTime)},0)`)
              .style('cursor', 'pointer')
            if (this.editable) {
              d3Select(`#overlay__phraseLine${i}`)
                .call(drag())
            }
          }
        })
      } else {
        this.piece.phrases.forEach((phrase, i) => {
          d3Select(`#phraseLine${i}`)
            .style('opacity', 0)
        })
      }
    },
    
    phraseDivDragStart(i) {
      return e => {
        let time = this.xr().invert(e.sourceEvent.clientX);
        this.phraseG
          .append('path')
          .attr('id', `transparentPhraseLine${i}`)
          .attr('stroke', 'black')
          .attr('stroke-width', '2px')
          .attr('d', this.playheadLine())
          .style('opacity', '0.4')
          .attr('transform', `translate(${this.codifiedXR(time)},0)`)        
        this.svg.style('cursor', 'col-resize')
      }
    },
    
    phraseDivDragDragging(i) {
      return e => {
        let time = this.xr().invert(e.sourceEvent.clientX);
        d3Select(`#transparentPhraseLine${i}`)
          .attr('transform', `translate(${this.codifiedXR(time)},0)`)
      }
    },
    
    phraseDivDragEnd(i) {
      return e => {
        this.justEnded = true;
        d3Select(`#transparentPhraseLine${i}`).remove();
        const time = this.xr().invert(e.sourceEvent.clientX);
        const tempPIdx = this.phraseIdxFromTime(time);
        const tPhrase = this.piece.phrases[tempPIdx];
        const tempTIdx = this.trajIdxFromTime(tPhrase, time);        
        const tTraj = tPhrase.trajectories[tempTIdx];
        let doNormal = true;
        if (tTraj.id === 12) {
           // this is hard
           if (i === tempPIdx && tempTIdx === tPhrase.trajectories.length - 1) {         
             const phraseA = this.piece.phrases[i];
             const phraseB = this.piece.phrases[i+1];
             const origDivTime = phraseA.startTime + phraseA.durTot;
             if (phraseB.trajectories[0].id === 12) { // if next is also silent
               doNormal = false;
               const pATrajs = phraseA.trajectories;
               const prevTraj = pATrajs[pATrajs.length-1];
               const nextTraj = phraseB.trajectories[0];
               prevTraj.durTot -= origDivTime - time;
               nextTraj.durTot += origDivTime - time;
               phraseA.durTotFromTrajectories();
               phraseA.durArrayFromTrajectories();
               phraseB.durTotFromTrajectories();
               phraseB.durArrayFromTrajectories();
               phraseB.assignStartTimes();
               this.piece.durTotFromPhrases();
               this.piece.durArrayFromPhrases();
               this.piece.updateStartTimes();
             } else {
               doNormal = false;  
               const pATrajs = phraseA.trajectories;        
               const prevTraj = pATrajs[pATrajs.length-1];
               const nntObj = { 
                 id: 12, 
                 durTot: origDivTime - time,
                 fundID12: this.piece.raga.fundamental
               };
               if (this.piece.instrumentation) {
                nntObj.instrumentation = this.piece.instrumentation[0];
               }
               const newNextTraj = new Trajectory(nntObj);
               prevTraj.durTot -= origDivTime - time;
               phraseA.durTotFromTrajectories();
               phraseA.durArrayFromTrajectories();
               phraseB.trajectories.splice(0, 0, newNextTraj);
               phraseB.durTotFromTrajectories();
               phraseB.durArrayFromTrajectories();
               phraseB.assignStartTimes();
               phraseB.assignTrajNums();
               this.piece.durTotFromPhrases();
               this.piece.durArrayFromPhrases();
               this.piece.updateStartTimes();
               phraseB.trajectories.slice().reverse()
                .forEach((traj, idx, arr) => {
                 if (idx !== arr.length-1) {
                   const oldId = `p${phraseB.pieceIdx}t${traj.num-1}`;
                   const newId = `p${phraseB.pieceIdx}t${traj.num}`;
                   this.reIdAllReps(oldId, newId)
                 }
               }) 
             }
             Object.keys(phraseB.chikaris).forEach(key => {
               const delta = origDivTime - time;
               const newKey = (Number(key) + delta).toFixed(2);
               phraseB.chikaris[newKey] = phraseB.chikaris[key];
               delete phraseB.chikaris[key];
               this.reIdChikari(key, newKey, phraseB, phraseB)
             });
             Object.keys(phraseA.chikaris).forEach(key => {
               if (Number(key) > phraseA.durTot) {
                 const newKey = (Number(key) - phraseA.durTot);
                 phraseB.chikaris[newKey] = phraseA.chikaris[key];
                 delete phraseA.chikaris[key];
                 this.reIdChikari(key, newKey, phraseA, phraseB)           
               }
             })
           } else if (i + 1 === tempPIdx && tempTIdx === 0) {
             const phraseA = this.piece.phrases[i];
             const phraseB = this.piece.phrases[i+1];
             const origDivTime = phraseA.startTime + phraseA.durTot;
             const pATrajs = phraseA.trajectories;
             if (pATrajs[pATrajs.length-1].id === 12) {
               doNormal = false       
               const prevTraj = pATrajs[pATrajs.length-1];
               const nextTraj = phraseB.trajectories[0];
               prevTraj.durTot -= origDivTime - time;
               nextTraj.durTot += origDivTime - time;
               phraseA.durTotFromTrajectories();
               phraseA.durArrayFromTrajectories();
               phraseB.durTotFromTrajectories();
               phraseB.durArrayFromTrajectories();
               phraseB.assignStartTimes();
               this.piece.durTotFromPhrases();
               this.piece.durArrayFromPhrases();
               this.piece.updateStartTimes();             
             } else {
               doNormal = false;
               const nptObj = {
                 id: 12,
                 durTot: time - origDivTime,
                 fundID12: this.piece.raga.fundamental
               };
                if (this.piece.instrumentation) {
                  nptObj.instrumentation = this.piece.instrumentation[0];
                }
               const newPrevTraj = new Trajectory(nptObj);
               const nextTraj = phraseB.trajectories[0];
               nextTraj.durTot -= time - origDivTime;
               phraseA.trajectories
                .splice(phraseA.trajectories.length, 0, newPrevTraj);
               phraseA.durTotFromTrajectories();
               phraseA.durArrayFromTrajectories();
               phraseA.assignStartTimes();
               phraseA.assignTrajNums();
               phraseB.durTotFromTrajectories();
               phraseB.durArrayFromTrajectories();
               phraseB.assignStartTimes();
               this.piece.durTotFromPhrases();
               this.piece.durArrayFromPhrases();
               this.piece.updateStartTimes();   
             }
             Object.keys(phraseB.chikaris).forEach(key => {
               const delta = time - origDivTime;
               if (Number(key) < delta) {
                 const newKey = (phraseA.durTot - ((delta) - key)).toFixed(2);
                 phraseA.chikaris[newKey] = phraseB.chikaris[key];
                 delete phraseB.chikaris[key];
                 this.reIdChikari(key, newKey, phraseB, phraseA);
               } else {
                 const newKey = (Number(key) - (delta)).toFixed(2);
                 phraseB.chikaris[newKey] = phraseB.chikaris[key];
                 delete phraseB.chikaris[key];
                 this.reIdChikari(key, newKey, phraseB, phraseB)
               }
             })
           }
        }
        const phraseA = this.piece.phrases[i];
        const phraseB = this.piece.phrases[i+1]
        if (doNormal) {
          const possibleTimes = this.possibleTrajDivs(i);
          const finalTime = getClosest(possibleTimes, time);
          const ftIdx = possibleTimes.indexOf(finalTime);          
          let pIdx, tIdx;
          const lenA = phraseA.trajectories.length;
          if (ftIdx < lenA) {
            pIdx = i;
            tIdx = ftIdx
          } else {
            pIdx = i + 1;
            tIdx = Math.round(((ftIdx / lenA) - 1) * lenA);
          }
          if (pIdx === i) {
            if (tIdx < phraseA.trajectories.length-1) {
              const ctA = phraseA.trajectories.length - 1 - tIdx;
              const ctB = phraseB.trajectories.length;
              const transfers = phraseA.trajectories.splice(tIdx+1);
              phraseB.trajectories.splice(0, 0, ...transfers);
              phraseA.durTotFromTrajectories();
              phraseA.durArrayFromTrajectories();
              phraseB.durTotFromTrajectories();
              phraseB.durArrayFromTrajectories();
              phraseB.assignStartTimes();
              phraseB.assignTrajNums();
              this.piece.durTotFromPhrases();
              this.piece.durArrayFromPhrases();
              this.piece.updateStartTimes();          
              for (let j = ctB-1; j >= 0; j--) {
                const oldId = `p${phraseB.pieceIdx}t${j}`;
                const newId = `p${phraseB.pieceIdx}t${j + ctA}`;
                this.reIdAllReps(oldId, newId)
              }
              for (let j = ctA-1; j >= 0; j--) {
                const oldId = `p${phraseA.pieceIdx}t${tIdx + j + 1}`;
                const newId = `p${phraseB.pieceIdx}t${j}`;
                this.reIdAllReps(oldId, newId)
              }
              // fix chikaris
              Object.keys(phraseB.chikaris).forEach(key => {
                const delta = transfers
                  .map(t => t.durTot)
                  .reduce((a, b) => a + b, 0);
                const newKey = (Number(key) + delta).toFixed(2);
                phraseB.chikaris[newKey] = phraseB.chikaris[key];
                delete phraseB.chikaris[key];
                this.reIdChikari(key, newKey, phraseB, phraseB);    
              });
              Object.keys(phraseA.chikaris).forEach(key => {
                if (Number(key) >= phraseA.durTot) {
                  const obj = phraseA.chikaris[key];
                  const newKey = (Number(key) - phraseA.durTot).toFixed(2);
                  delete phraseA.chikaris[key];
                  phraseB.chikaris[newKey] = obj;
                  this.reIdChikari(key, newKey, phraseA, phraseB);
                }
              })
            }
          } else {
            const ctB = phraseB.trajectories.length;
            const ctA = phraseA.trajectories.length;
            const transfers = phraseB.trajectories.splice(0, tIdx+1);
            const pATrajs = phraseA.trajectories;
            phraseA.trajectories.splice(pATrajs.length, 0, ...transfers);
            phraseA.durTotFromTrajectories();
            phraseA.durArrayFromTrajectories();
            phraseA.assignStartTimes();
            phraseA.assignTrajNums();
            phraseB.durTotFromTrajectories();
            phraseB.durArrayFromTrajectories();
            phraseB.assignStartTimes();
            phraseB.assignTrajNums();
            this.piece.durTotFromPhrases();
            this.piece.durArrayFromPhrases();
            this.piece.updateStartTimes();            
            for (let j = 0; j <= tIdx; j++) {
              const oldId = `p${phraseB.pieceIdx}t${j}`;
              const newId = `p${phraseA.pieceIdx}t${ctA+j}`;
              this.reIdAllReps(oldId, newId);
            }
            for (let j = tIdx+1; j < ctB; j++) {
              const oldId = `p${phraseB.pieceIdx}t${j}`;
              const newId = `p${phraseB.pieceIdx}t${j-(tIdx+1)}`;
              this.reIdAllReps(oldId, newId);
            }
            //fix chikaris
            Object.keys(phraseB.chikaris).forEach(key => {
              const delta = transfers
                .map(t => t.durTot)
                .reduce((a, b) => a + b, 0);
              if (Number(key) < delta) {
                const newKey = (phraseA.durTot - (delta - Number(key)))
                  .toFixed(2);
                phraseA.chikaris[newKey] = phraseB.chikaris[key];
                delete phraseB.chikaris[key];
                this.reIdChikari(key, newKey, phraseB, phraseA);
              } else {
                const newKey = (Number(key) - delta).toFixed(2);
                phraseB.chikaris[newKey] = phraseB.chikaris[key];
                delete phraseB.chikaris[key];
                this.reIdChikari(key, newKey, phraseB, phraseB);
              }
            })
          }
          d3Select(`#phraseLine${i}`)
            .attr('transform', `translate(${this.codifiedXR(finalTime)},0)`)
            .attr('stroke', 'red')
          d3Select(`#overlay__phraseLine${i}`)
            .attr('transform', `translate(${this.codifiedXR(finalTime)},0)`)  
        }  
        if (this.selectedPhraseDivIdx !== phraseA.pieceIdx) {
          this.clearSelectedPhraseDiv();
        }    
        if (!doNormal) {
          d3Select(`#phraseLine${i}`)
            .attr('transform', `translate(${this.codifiedXR(time)},0)`)
            .attr('stroke', 'red')
          d3Select(`#overlay__phraseLine${i}`)
            .attr('transform', `translate(${this.codifiedXR(time)},0)`)
        }
        this.svg.style('cursor', 'auto');
        this.selectedPhraseDivIdx = i;
        const realPhraseStartIdx = i + 1;
        if (this.piece.sectionStarts.includes(realPhraseStartIdx)) {
          this.$refs.trajSelectPanel.phraseDivType = 'section';
        } else {
          this.$refs.trajSelectPanel.phraseDivType = 'phrase';
        }
        this.clearSelectedTraj();
        this.clearSelectedChikari();
        this.clearTrajSelectPanel();
        this.$refs.trajSelectPanel.showPhraseRadio = true;  
      }
    },
    
    movePhraseDivs() {
      this.piece.phrases.forEach((phrase, i) => {
        const endTime = phrase.startTime + phrase.durTot;
        d3Select(`#phraseLine${i}`)
          .transition().duration(this.transitionTime)
          .attr('transform', `translate(${this.codifiedXR(endTime)},0)`)
      })
    },
    
    reIdChikari(key, newKey, oldPhrase, newPhrase) {
      const oldSec = Math.floor(Number(key));
      const oldDec = (Number(key) % 1).toFixed(2).toString().slice(2);
      const oldId = `p${oldPhrase.pieceIdx}_${oldSec}_${oldDec}`;
      const newSec = Math.floor(Number(newKey));
      const newDec = (Number(newKey) % 1).toFixed(2).toString().slice(2);
      const newId = `p${newPhrase.pieceIdx}_${newSec}_${newDec}`;
      d3Select(`#circle__${oldId}`).attr('id', `circle__${newId}`);
      d3Select(`#${oldId}`).attr('id', newId);  
    },
    
    reIdAllReps(oldId, newId, verbose=false) {
      if (verbose) {
        console.log(`reIdAllReps: ${oldId} -> ${newId}`);
      }
      // given old and new ids, change the ids of all svg representations 
      d3Select(`#${oldId}`).attr('id', newId);
      d3Select(`#overlay__${oldId}`).attr('id', `overlay__${newId}`);
      d3Select(`#articulations__${oldId}`)
        .attr('id', `articulations__${newId}`);
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
    
    possibleTrajDivs(pIdx) {
      if (pIdx !== undefined) {
        // returns times on left and right of phrase div (so, current phrase 
        // and next phrase)
        const phraseA = this.piece.phrases[pIdx];
        const phraseB = this.piece.phrases[pIdx+1];
        // get all trajs except first one, and collect all start times
        const stA = phraseA.startTime;
        const stB = phraseB.startTime;
        const divs = phraseA.trajectories.slice(1).map(t => stA + t.startTime);
        divs.push(...phraseB.trajectories.map(t => stB + t.startTime));
        return divs
      } else {
        const divs = [];
        this.piece.phrases.forEach(phrase => {
          const st = phrase.startTime;
          divs.push(...phrase.trajectories.slice(1).map(t => st + t.startTime))
        });
        return divs
      }
    },
    
    mouseUpUpdateLoop() {
      if (this.loop) {
        this.$refs.audioPlayer.loop = true;
        this.$refs.audioPlayer.loopStart = this.regionStartTime;
        this.$refs.audioPlayer.loopEnd = this.regionEndTime;
        if (this.$refs.audioPlayer.sourceNode) {
          this.$refs.audioPlayer.sourceNode.loopStart = this.regionStartTime;
          this.$refs.audioPlayer.sourceNode.loopEnd = this.regionEndTime;
        }
      } else {
        this.$refs.audioPlayer.loop = false;
        this.$refs.audioPlayer.loopStart = undefined;
        this.$refs.audioPlayer.loopEnd = undefined;
      }
      // also, update stretchBuffer
    },

    updateLoop(e) {
      if (e && e.clientX === 0) e.preventDefault(); // stops spacebar from 
      // checking box
    },


    preventSpaceToggle(e) {
      if (e && e.clientX === 0) e.preventDefault();
    },

    async savePiece() {
      this.piece.phrases.forEach(phrase => {
        phrase.consolidateSilentTrajs()
      });
      this.cleanPhrases();
      const result = await savePiece(this.piece);
      this.dateModified = new Date(result.dateModified);
    },

    addFixedTraj() {
      this.trajTimePts.sort((a, b) => a.time - b.time);
      const logSGLines = this.visibleSargam.map(s => Math.log2(s));
      const lf = this.trajTimePts[0].logFreq;
      const pitch = this.visPitches[logSGLines.indexOf(lf)];
      const pitchJSON = pitch.toJSON();
      pitchJSON.fundamental = this.piece.raga.fundamental;
      const endPitch = new Pitch(pitchJSON)
      // const endPitch = new Pitch(pitch.)
      const pitches = [pitch, endPitch];
      const durTot = this.trajTimePts[1].time - this.trajTimePts[0].time;
      const ntObj = {
        pitches: pitches,
        durTot: durTot,
        durArray: [1],
        articulations: undefined
      };
      if (this.piece.instrumentation) {
        ntObj.instrumentation = this.piece.instrumentation[0];
        if (['Vocal (M)', 'Vocal (F)'].includes(ntObj.instrumentation)) {
          ntObj.articulations = {}
        }
      }
      const newTraj = new Trajectory(ntObj);
      const times = this.trajTimePts.map(t => t.time);
      const pIdx = this.trajTimePts[0].pIdx;
      const tIdx = this.trajTimePts[0].tIdx;
      const phrase = this.piece.phrases[pIdx];
      const silentTraj = phrase.trajectories[tIdx];
      const st = phrase.startTime + silentTraj.startTime;
      const startsEqual = Math.abs(times[0] - st) < 0.000001;
      const endA = times[times.length - 1];
      const endB = st + silentTraj.durTot;
      const endsEqual = Math.abs(endA - endB) < 0.000001;
      if (startsEqual && endsEqual) { // if taking up entire silent traj
        phrase.trajectories[tIdx] = newTraj;
        phrase.reset();
        const vowelIdxs = phrase.firstTrajIdxs();
        this.codifiedAddTraj(newTraj, phrase.startTime, vowelIdxs);
        this.selectedTraj = newTraj;
        this.selectedTrajs = [this.selectedTraj];
        this.selectedTrajID = `p${newTraj.phraseIdx}t${newTraj.num}`;
        d3Select(`#${this.selectedTrajID}`)
          .attr('stroke', this.selectedTrajColor)
        d3Select(`#overlay__${this.selectedTrajID}`)
          .style('cursor', 'auto')
        d3Select(`#dampen${this.selectedTrajID}`)
          .attr('fill', this.selectedTrajColor)
        this.setNewSeries = false;
        this.trajTimePts = [];
        this.svg.style('cursor', 'auto');
        d3SelectAll('.newSeriesDot').remove();
        this.addAllDragDots();
        this.$refs.trajSelectPanel.selectedIdx = this.selectedTraj.id;
        this.$refs.trajSelectPanel.parentSelected = true;
        this.$refs.trajSelectPanel.slope = Math.log2(this.selectedTraj.slope);
        const arts = this.selectedTraj.articulations;
        const c1 = arts[0] && arts[0].name === 'pluck';
        const c2 = arts['0.00'] && arts['0.00'].name === 'pluck';
        if (c1 || c2) {
          this.$refs.trajSelectPanel.pluckBool = true
        } else {
          this.$refs.trajSelectPanel.pluckBool = false
        } 
      } else if (endsEqual) {
        silentTraj.durTot = silentTraj.durTot - durTot;
        phrase.trajectories.splice(tIdx + 1, 0, newTraj);
        phrase.reset();
        const vowelIdxs = phrase.firstTrajIdxs();
        this.codifiedAddTraj(newTraj, phrase.startTime, vowelIdxs);
        this.selectedTraj = newTraj;
        this.selectedTrajs = [this.selectedTraj];
        this.selectedTrajID = `p${newTraj.phraseIdx}t${newTraj.num}`;
        d3Select(`#${this.selectedTrajID}`)
          .attr('stroke', this.selectedTrajColor)
        d3Select(`#overlay__${this.selectedTrajID}`)
          .style('cursor', 'auto')
        d3Select(`#dampen${this.selectedTrajID}`)
          .attr('fill', this.selectedTrajColor)
        this.setNewSeries = false;
        this.trajTimePts = [];
        this.svg.style('cursor', 'auto');
        d3SelectAll('.newSeriesDot').remove();
        this.addAllDragDots();
        this.$refs.trajSelectPanel.selectedIdx = this.selectedTraj.id;
        this.$refs.trajSelectPanel.parentSelected = true;
        this.$refs.trajSelectPanel.slope = Math.log2(this.selectedTraj.slope);
        const arts = this.selectedTraj.articulations;
        const c1 = arts[0] && arts[0].name === 'pluck';
        const c2 = arts['0.00'] && arts['0.00'].name === 'pluck';
        if (c1 || c2) {
          this.$refs.trajSelectPanel.pluckBool = true
        } else {
          this.$refs.trajSelectPanel.pluckBool = false
        } 
      } else {
        if (startsEqual) {
          silentTraj.durTot = silentTraj.durTot - durTot;
          phrase.trajectories.splice(tIdx, 0, newTraj);
          phrase.reset();
          this.trajTimePts[1].tIdx += 1;
        } else {
          const firstDur = times[0] - st;
          const lastDur = st + silentTraj.durTot - times[times.length - 1];
          silentTraj.durTot = firstDur;
          const lstObj = {
            id: 12,
            pitches: [],
            durTot: lastDur,
            fundID12: this.piece.raga.fundamental
          };
          if (this.piece.instrumentation) {
            lstObj.instrumentation = this.piece.instrumentation[0];
          }
          const lastSilentTraj = new Trajectory(lstObj);
          phrase.trajectories.splice(tIdx + 1, 0, newTraj);
          phrase.trajectories.splice(tIdx + 2, 0, lastSilentTraj);
          phrase.reset();
          this.trajTimePts[1].tIdx += 2;
        }
        const vowelIdxs = phrase.firstTrajIdxs();
        this.codifiedAddTraj(newTraj, phrase.startTime, vowelIdxs);
        this.trajTimePts.splice(0, 1);
        d3SelectAll('.newSeriesDot').remove();
        this.phraseG 
          .append('circle')
          .classed('newSeriesDot', true)
          .attr('cx', this.codifiedXR(this.trajTimePts[0].time))
          .attr('cy', this.codifiedYR(this.trajTimePts[0].logFreq))
          .attr('r', 4)
          .style('fill', '#7300e6') 
      };
      this.resetSargam();
    },
    
    clearAll(regionToo) {
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
      if (this.regionG && regionToo === undefined) {
        this.regionG.remove();
        this.regionG = undefined;
        this.regionStartTime = 0;
        this.regionEndTime = this.durTot;
        this.mouseUpUpdateLoop(); 
        this.$refs.audioPlayer.updateStretchBuf(); 
        this.$refs.audioPlayer.stretchable = false;
      }
      if (this.setNewRegion) this.setNewRegion = false;

    },

    handleKeyup(e) {
      if (e.key === 'Shift') this.shifted = false;
      if (e.key === 'Meta' && this.browser.os.includes('Mac OS')) {
        this.metad = false
      }
      if (e.key === 'Control' && this.browser.os.includes('Windows')) {
        this.metad = false
      }
    },

    handleKeydown(e) {
      if (e.key === ' ') {
        this.$refs.audioPlayer.togglePlay()
      } else if (e.key === 'Meta' && this.browser.os.includes('Mac OS')) {
        this.metad = true
      } else if (e.key === 'Control' && this.browser.os.includes('Windows')) {
        this.metad = true

      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.clearAll();
        this.svg.style('cursor', 'auto');
        // region speed settings
        this.$refs.audioPlayer.regionSpeed = 0;
        this.$refs.audioPlayer.regionSpeedOn = false;
      } else if (e.key === 'Backspace' && this.editable === true) {
        if (this.selectedChikariID) {
          const splitArr = this.selectedChikariID.split('_');
          const pIdx = splitArr[0].slice(1);
          const key = splitArr[1] + '.' + splitArr[2];
          delete this.piece.phrases[pIdx].chikaris[key];
          d3Select(`#${this.selectedChikariID}`).remove()
          d3Select(`#circle__${this.selectedChikariID}`).remove()
          this.selectedChikariID = undefined;
        } else if (this.selectedTrajID) {
          this.deleteTraj(this.selectedTrajID);
          this.selectedTrajID = undefined;
          this.clearTrajSelectPanel();
          d3SelectAll('.dragDots').remove();
          this.selectedTrajs = [];
        } else if (this.selectedTrajs.length > 1) {
          this.selectedTrajs.forEach(traj => {
            const trajID = `p${traj.phraseIdx}t${traj.num}`;
            this.deleteTraj(trajID);
            this.clearTrajSelectPanel();
            this.selectedTrajs = [];
          })
        } else if (!(this.selectedPhraseDivIdx === undefined)) {
          const phraseA = this.piece.phrases[this.selectedPhraseDivIdx];
          const initPhraseADur = phraseA.durTot;
          const phraseB = this.piece.phrases[this.selectedPhraseDivIdx+1];
          const ctB = phraseB.trajectories.length;
          const ctA = phraseA.trajectories.length;
          phraseA.trajectories.splice(ctA, 0, ...phraseB.trajectories);
          this.piece.phrases.splice(this.selectedPhraseDivIdx+1, 1);
          phraseA.durTotFromTrajectories();
          phraseA.durArrayFromTrajectories();
          phraseA.assignStartTimes();
          phraseA.assignTrajNums();
          this.piece.durTotFromPhrases();
          this.piece.durArrayFromPhrases();
          this.piece.updateStartTimes();
          for (let j=0; j < ctB; j++) {
            const oldId = `p${phraseB.pieceIdx}t${j}`;
            const newId = `p${phraseA.pieceIdx}t${j + ctA}`;
            this.reIdAllReps(oldId, newId)
          }
          d3Select(`#phraseLine${this.selectedPhraseDivIdx}`).remove();
          d3Select(`#overlay__phraseLine${this.selectedPhraseDivIdx}`)
            .remove();
            const idx = this.selectedPhraseDivIdx;
          for (let j = idx + 1; j < this.piece.phrases.length; j++) {
            d3Select(`#phraseLine${j}`).attr('id', `phraseLine${j-1}`);
            d3Select(`#overlay__phraseLine${j}`)
              .attr('id', `overlay__phraseLine${j-1}`);
            d3Select(`#overlay__phraseLine${j-1}`).on('.drag', null);
            const drag = () => {
              return d3Drag()
                .on('start', this.phraseDivDragStart(j-1))
                .on('drag', this.phraseDivDragDragging(j-1))
                .on('end', this.phraseDivDragEnd(j-1))
            };
            if (this.editable) {
              d3Select(`#overlay__phraseLine${j-1}`)
                .call(drag())
            }  
          }
          // fix chikaris
          Object.keys(phraseB.chikaris).forEach(key => {
            const newKey = (initPhraseADur + Number(key)).toFixed(2);
            phraseA.chikaris[newKey] = phraseB.chikaris[key];
            delete phraseB.chikaris[key];
            const oldSec = Math.floor(Number(key));
            const oldDec = (Number(key) % 1).toFixed(2).toString().slice(2);
            const oldId = `p${phraseB.pieceIdx}_${oldSec}_${oldDec}`;
            const newSec = Math.floor(Number(newKey));
            const newDec = (Number(newKey) % 1).toFixed(2).toString().slice(2);
            const newId = `p${phraseA.pieceIdx}_${newSec}_${newDec}`;
            d3Select(`#circle__${oldId}`).attr('id', `circle__${newId}`);
            d3Select(`#${oldId}`).attr('id', newId);          
          })
          // if selectedPhraseDivIdx - 1 is less than any of the items in 
          // piece.sectionStarts, then subtract one from those items in 
          // piece.sectionStarts
          this.piece.sectionStarts = this.piece.sectionStarts.map((item) => {
            if (item > this.selectedPhraseDivIdx + 1) {
              return item - 1;
            } else {
              return item;
            }
          })
          this.selectedPhraseDivIdx = undefined;
          this.piece.phrases.forEach(phrase => {
            phrase.consolidateSilentTrajs()
          });
          this.cleanPhrases();
        }
      } else if (e.key === 'c' && this.editable) {
        if (this.metad) {
          this.clipboardTrajs = this.selectedTrajs
        } else {
          this.setChikari = true;
          this.svg.style('cursor', 'cell')
          if (this.setNewTraj) {
            d3SelectAll('.newTrajDot').remove();
            this.setNewTraj = false;
          }
          if (this.setNewPhraseDiv) this.setNewPhraseDiv = false;
          if (this.setNewSeries) {
            this.setNewSeries = false;
            d3SelectAll('.newSeriesDot').remove();
          }
        }
      } else if (e.key === 't' && this.setNewTraj === false && this.editable) {
        this.clearSelectedTraj();
        this.clearTrajSelectPanel();
        this.setNewTraj = true;
        this.svg.style('cursor', 'crosshair');
        this.trajTimePts = [];
        if (this.setChikari) this.setChikari = false;
        if (this.setNewPhraseDiv) this.setNewPhraseDiv = false;
        if (this.setNewSeries) {
          this.setNewSeries = false;
          d3SelectAll('.newSeriesDot').remove();
        }
        this.$refs.trajSelectPanel.showTrajChecks = true;
      } else if ( e.key === 'p' && 
                  this.setNewPhraseDiv === false && 
                  this.editable && 
                  !this.selectedTraj) {
        this.clearSelectedTraj();
        this.clearTrajSelectPanel();
        this.clearSelectedPhraseDiv();
        if (this.setChikari) this.setChikari = false;
        if (this.setNewTraj) {
          d3SelectAll('.newTrajDot').remove();
          this.setNewTraj = false;
        }
        if (this.setNewSeries) {
          this.setNewSeries = false;
          d3SelectAll('.newSeriesDot').remove();
        }
        this.setNewPhraseDiv = true;
        this.svg.style('cursor', 's-resize');
      } else if (e.key === 's' && (!this.setNewSeries) && this.editable) {
        this.setNewSeries = true;
        this.clearSelectedTraj();
        this.clearTrajSelectPanel();
        this.clearSelectedPhraseDiv();
        if (this.setChikari) this.setChikari = false;
        if (this.setNewTraj) {
          d3SelectAll('.newTrajDot').remove();
          this.setNewTraj = false;
        }
        if (this.setNewPhraseDiv) this.setNewPhraseDiv = false;
        this.svg.style('cursor', 'crosshair');
        this.trajTimePts = [];
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.shifted ? this.moveToPrevPhrase() : this.moveToNextPhrase();
      } else if (e.key === 'Shift') {
        this.shifted = true;
      } else if (e.key === '[') {
        this.moveToPrevPhrase()
      } else if (e.key === ']') {
        this.moveToNextPhrase()
      } else if (e.key === 'r') {
        this.clearAll();
        this.setNewRegion = true;

      } else if (e.key === 'v' && this.metad && this.editable) {
        if (this.clipboardTrajs.length > 0) this.pasteTrajs()
      }
      if (this.setNewTraj || this.selectedTraj) {
        const keyNums = this.$refs.trajSelectPanel.kNumsFiltered;
        if (keyNums.includes(e.key)) {
          this.$refs.trajSelectPanel.selectIcon(keyNums.indexOf(e.key))
        }
      }
      if (this.selectedTraj) {
        const tsp = this.$refs.trajSelectPanel;
        const inst = this.piece.instrumentation[0];
        const vox = ['Vocal (M)', 'Vocal (F)'];
        if (e.key === 'p' && !vox.includes(inst)) { 
          tsp.pluckBool = !tsp.pluckBool;
          tsp.updateBool();
        } else if (e.key === 'd') {
          tsp.dampen = !tsp.dampen;
          tsp.updateDampen();
        }
      }
      if (this.selectedChikariID) {
        if (e.key === 'ArrowLeft') {
          if (this.editable) this.adjustChikari(true)
        } else if (e.key === 'ArrowRight') {
          if (this.editable) this.adjustChikari(false)
        }
      }
    },

    shrink() {
      const x = this.yAxWidth;
      const y = this.xAxHeight;
      d3Select('.spectrogram')
        .attr('transform', `translate(${x},${y}) scale(0.5, 1)`)
    },

    async addSpectrogram(leftTime, currentXK, scalingParam, yProp) {
      if (false) {
        // console.log('could do it here instead')
        // await this.$nextTick();
        // this.setSpectrogram(leftTime, currentXK, scalingParam, yProp)
      } else {
        try {
          this.numSpecs = await getNumberOfSpectrograms(this.piece.audioID);
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

    setSpectrogram(leftTime, currentXK, scalingParam, yProp) {
      this.totNaturalWidth = 0
      const rect = this.rect();
      const height = rect.height - this.xAxHeight;
      const unscaledWidths = []
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
      if (leftTime !== undefined) {
        this.scaleAndMoveToTime(currentXK, leftTime, scalingParam, yProp)
        // this.moveToTime(leftTime);
        this.leftTime = leftTime;
      }
    },

    redrawSpectrogram(instant=false) {
      const rect = this.rect();
      const height = rect.height - this.xAxHeight;
      this.desiredWidth = (rect.width - this.yAxWidth) * this.tx().k;
      this.xScale = this.desiredWidth / this.unscaledWidth;
      this.desiredHeight = height * this.ty().k;
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
            .attr('transform', `translate(${x}, ${y}) scale(${xS}, ${yS})`)
        })
      }
    },

    async getPieceFromJson(piece, fundamental) {
      if (fundamental) piece.raga.fundamental = fundamental;
      const rsRes = await getRaagRule(piece.raga.name);
      piece.raga.ruleSet = rsRes.rules;
      piece.raga = new Raga(piece.raga);
      piece.phrases.forEach(phrase => {
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
          const artObj = {};
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
            traj.instrumentation = piece.instrumentation[0];
          }
          const vox = ['Vocal (M)', 'Vocal (F)'];
          if (vox.includes(traj.instrumentation)) {
            if (traj.vowel === undefined && traj.id !== 12) {
              traj.vowel = 'a';
            }
          }
        });
        if (phrase.trajectoryGrid) {
          phrase.trajectoryGrid[0] = pt.map(traj => {
            return new Trajectory(traj)
          });
        } else {
          phrase.trajectories = pt.map(traj => {
            return new Trajectory(traj)
          });
        }
        if (phrase.groupsGrid !== undefined) {
          phrase.groupsGrid.forEach(groups => {
            groups.forEach(group => {
              group.trajectories.forEach((traj, idx) => {
                // const pIdx = phrase.pieceIdx;
                const tIdx = traj.num;
                const realTraj = phrase.trajectoryGrid[0][tIdx];
                group.trajectories[idx] = realTraj;
              })
            })
          })
        }
        const chikariKeys = Object.keys(phrase.chikaris);
        const chikariEntries = chikariKeys.map(key => phrase.chikaris[key]);
        const chikariObj = {};
        chikariKeys.forEach((key, i) => {
          chikariObj[key] = new Chikari(chikariEntries[i])
        })
        phrase.chikaris = chikariObj;
        if (piece.instrumentation) {
          phrase.instrumentation = piece.instrumentation;
        }
      });
      piece.phrases = piece.phrases.map(phrase => new Phrase(phrase));
      this.piece = new Piece(piece);
      this.dateModified = new Date(this.piece.dateModified);
      this.fixTrajs();
      this.piece.phrases.forEach(phrase => {
        phrase.consolidateSilentTrajs()
      });
      this.piece.durArrayFromPhrases();
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
      if (this.oldHeight !== window.innerHeight) {
        console.log('changed real height')
        this.resizeHeight();
      }

      const rect = this.rect();
      this.svg
        .attr('viewBox', [0, 0, rect.width, rect.height])
      this.x.range([this.yAxWidth, rect.width])
      this.y.range([this.xAxHeight, rect.height])
      this.updateBackgroundColors();
      this.updateClipPaths();
      this.resizeScrollX();
      this.redraw();
      this.resetZoom();
      this.oldHeight = window.innerHeight;
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

    phraseIdxFromTime(time, rounded=false) {
      if (rounded) time = Math.round(time * 1000) / 1000;
      const filtered = this.piece.phrases.filter(phrase => {
        let st = phrase.startTime;
        let et = st + phrase.durTot;
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

    handleMousedown(e) {
      if (e.offsetY < this.xAxHeight) {
        this.drawingRegion = true;
        this.regionStartTime = this.xr().invert(e.offsetX);
        this.regionStartPx = e.offsetX;
      }
    },

    handleMouseup(e) {
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
        this.$refs.audioPlayer.updateStretchBuf();
      }
    },

    setUpRegion() {
      this.$refs.audioPlayer.stretchable = true;
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
            const dragged = e => {
              d3Select('.clickableRegionStart')
                .attr('transform', `translate(${e.x},0)`)
              d3Select('.regionStart')
                .attr('transform', `translate(${e.x}, 0)`);
              d3Select('.region')
                .attr('width', this.xr()(this.regionEndTime) - e.x)
                .attr('transform', `translate(${e.x}, 0)`)
            }
            const dragended = e => {
              this.regionStartPx = e.x;
              this.regionStartTime = this.xr().invert(this.regionStartPx);
              this.updateLoop();
              this.$refs.audioPlayer.updateStretchBuf();
            }
            return d3Drag()
              .on('drag', dragged)
              .on('end', dragended)
          };

          const reDrag = () => {
            const dragged = e => {
              d3Select('.clickableRegionEnd')
                .attr('transform', `translate(${e.x},0)`)
              d3Select('.regionEnd').attr('transform', `translate(${e.x}, 0)`);
              d3Select('.region')
                .attr('width', e.x - this.xr()(this.regionStartTime))
            }
            const dragended = e => {
              this.regionEndPx = e.x;
              this.regionEndTime = this.xr().invert(this.regionEndPx);
              this.updateLoop();
              this.$refs.audioPlayer.updateStretchBuf();

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
      const start = this.xr()(this.regionStartTime);
      const end = this.xr()(this.regionEndTime);
      d3Select('.region')
        .attr('width', end - start)
        .attr('transform', `translate(${start})`)
      d3Select('.regionStart')
        .attr('transform', `translate(${start},0)`)
      d3Select('.regionEnd')
        .attr('transform', `translate(${end},0)`)
        d3Select('.clickableRegionStart')
          .attr('transform', `translate(${start},0)`)
        d3Select('.clickableRegionEnd')
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
      return offset / (this.ty().k * height - height + 1)
    },

    getScrollXDraggerTranslate() {
      const offset = - (this.xr()(0) - this.yAxWidth);
      const width = this.rect().width - this.yAxWidth;
      const out = offset / (this.tx().k * width - width);
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
      if (this.specbox) {
        this.specbox.remove();
        console.log('there was still a specbox')
      }
    },

    async initializePiece(leftTime, currentXK, scalingParam, yProp) {
      this.removeEditor();
      this.visibleSargam = this.piece.raga.getFrequencies({
        low: this.freqMin,
        high: this.freqMax
      })
      this.visPitches = this.piece.raga.getPitches({
        low: this.freqMin,
        high: this.freqMax
      })

      this.setScrollY();
      this.setScrollX();
      const rect = await this.rect();
      this.oldRectHeight = rect.height;
      this.svg = await d3Create('svg')
        .classed('noSelect', true)
        .attr('viewBox', [0, 0, rect.width, rect.height])
        .on('click', this.handleClick)
        .on('mousedown', this.handleMousedown)
        .on('mouseup', this.handleMouseup)
        .style('border-bottom', '1px solid black')

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
        .range([this.yAxWidth, rect.width])
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
      this.tx = () => d3ZoomTransform(this.gx.node());
      this.ty = () => d3ZoomTransform(this.gy.node());
      this.gx.call(this.zoomX).attr('pointer-events', 'none');
      this.gy.call(this.zoomY).attr('pointer-events', 'none');
      
      try {
        this.zoom = d3Zoom()
        .filter(z_ => {
          if (z_.type === 'dblclick') this.handleDblClick(z_);
          return z_.type !== 'mousedown' && z_.type !== 'dblclick' ? z_ : null
        })
        .on('zoom', this.enactZoom);
      } catch (err) {
        console.error(err)
      }
      
      this.makeAxes();
      this.addPhrases();
      

      this.updateTranslateExtent().then(() => {
        this.svgNode = this.svg
          .call(this.zoom)
          .call(this.zoom.transform, d3ZoomIdentity.scale(this.initXScale))
          .node();
        this.$refs.graph.appendChild(this.svgNode)
        
      });
    return regularMove
      

    },
    
    handleDblClick(z) {
      const graphX = z.clientX - this.yAxWidth;
      const time = this.xr().invert(z.clientX);
      if (this.$refs.audioPlayer.regionSpeedOn) {
        console.log('this one', time)
        const afterStart = time >= this.regionStartTime;
        const beforeEnd = time <= this.regionEndTime;
        if (afterStart && beforeEnd) {
          if (graphX >= 0) {
            this.currentTime = time;
            if (!this.$refs.audioPlayer.playing) {
              this.$refs.audioPlayer.pausedAt = time;
              this.$refs.audioPlayer.updateProgress();
              this.$refs.audioPlayer.updateFormattedCurrentTime();
              this.$refs.audioPlayer.updateFormattedTimeLeft();
            } else {
              this.$refs.audioPlayer.stop();
              this.$refs.audioPlayer.pausedAt = time;
              this.$refs.audioPlayer.play();
            }
            this.movePlayhead();
            this.moveShadowPlayhead();
          }
        }
      } else if (graphX >= 0) {
        this.currentTime = time;
        if (!this.$refs.audioPlayer.playing) {
          this.$refs.audioPlayer.pausedAt = time;
          this.$refs.audioPlayer.updateProgress();
          this.$refs.audioPlayer.updateFormattedCurrentTime();
          this.$refs.audioPlayer.updateFormattedTimeLeft();
        } else {
          this.$refs.audioPlayer.stop();
          this.$refs.audioPlayer.pausedAt = time;
          this.$refs.audioPlayer.play();
        }
        this.movePlayhead();
        this.moveShadowPlayhead();
      }
    },

    trajIdxFromTime(phrase, time) {
      let phraseTime = time - phrase.startTime;
      return phrase.trajectories.filter(traj => {
        const a = phraseTime >= traj.startTime;
        const b = phraseTime < traj.startTime + traj.durTot;
        return a && b
      })[0].num
    },

    handleClick(e) {
      let time = this.xr().invert(e.clientX);
      const pIdx = this.phraseIdxFromTime(time);
      // need to figure out how to handle when click is over a non phrase
      if (this.setChikari) {
        const sym = d3Symbol().type(d3SymbolX).size(80);
        const phrase = this.piece.phrases[pIdx];
        const fixedTime = Number((time - phrase.startTime).toFixed(2));
        phrase.chikaris[fixedTime] = new Chikari({
          'fundamental': this.piece.raga.fundamental,
          'pitches': this.piece.raga.chikariPitches
        });
        const scaledX = fixedTime / phrase.durTot;
        const dataObj = {
          x: fixedTime + phrase.startTime,
          y: phrase.compute(scaledX, true)
        };
        const num = (fixedTime % 1).toFixed(2).toString().slice(2);
        const id = `p${phrase.pieceIdx}_${Math.floor(fixedTime)}_${num}`;
        const x = d => this.codifiedXR(d.x);
        const y = d => this.codifiedYR(d.y);
        this.phraseG.append('g')
          .classed('chikari', true)
          .append('path')
          .attr('id', id)
          .attr('d', sym)
          .attr('stroke', this.chikariColor)
          .attr('stroke-width', 3)
          .attr('stroke-linecap', 'round')
          .data([dataObj])
          .attr('transform', d => `translate(${x(d)},${y(d)})`)
        this.phraseG.append('g')
          .classed('chikari', true)
          .append('circle')
          .attr('id', 'circle__' + id)
          .classed('chikariCircle', true)
          .style('opacity', '0')
          .data([dataObj])
          .attr('cx', d => this.codifiedXR(d.x))
          .attr('cy', d => this.codifiedYR(d.y))
          .attr('r', 6)
          .on('mouseover', this.handleMouseOver)
          .on('mouseout', this.handleMouseOut)
          .on('click', this.handleClickChikari)
        this.setChikari = false;
        this.svg.style('cursor', 'auto');
      } else if (this.setNewTraj) {
        const logSGLines = this.visibleSargam.map(s => Math.log2(s));
        const navHeight = this.$parent.$parent.navHeight;
        let logFreq = this.yr().invert(e.clientY - navHeight);
        logFreq = getClosest(logSGLines, logFreq);
        const phrase = this.piece.phrases[pIdx];
        const tIdx = this.trajIdxFromTime(phrase, time);
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
          if (setIt) {
            let fixedTime = time;
            const startTime = phrase.startTime + traj.startTime;
            if (time - startTime < this.minTrajDur) {
              fixedTime = startTime
            } else if (startTime + traj.durTot - time < this.minTrajDur) {
              fixedTime = startTime + traj.durTot
            }
            this.phraseG
              .append('circle')
              .classed('newTrajDot', true)
              .attr('cx', this.codifiedXR(fixedTime))
              .attr('cy', this.codifiedYR(logFreq))
              .attr('r', 4)
              .style('fill', 'forestgreen')
            this.trajTimePts.push({
              time: fixedTime,
              logFreq: logFreq,
              pIdx: pIdx,
              tIdx: tIdx
            })
          }
        }
      } else if (this.setNewSeries) {
        const logSGLines = this.visibleSargam.map(s => Math.log2(s));
        const navHeight = this.$parent.$parent.navHeight;
        let logFreq = this.yr().invert(e.clientY - navHeight);
        logFreq = getClosest(logSGLines, logFreq);
        const phrase = this.piece.phrases[pIdx];
        const tIdx = this.trajIdxFromTime(phrase, time);
        const traj = phrase.trajectories[tIdx];
        let snappedTime = time;
        const st = phrase.startTime + traj.startTime;
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
            .attr('cx', this.codifiedXR(time))
            .attr('cy', this.codifiedYR(logFreq))
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



        // get trajectory at time
        const phrase = this.piece.phrases[pIdx];
        const tIdx = this.trajIdxFromTime(phrase, time);
        const traj = phrase.trajectories[tIdx];

        // override time so that if it falls within a group of trajectories, 
        // time is set to either the start of the first traj in the group, or 
        // the end of the last traj in the group. This is so that the phrase div 
        // does not fall within a group of trajectories.

        if (traj.groupId !== undefined) {
          console.log('Phrase div would fall within a group of trajectories, ' + 
            'so overriding time to be either the start or end of the group.');
          const group = phrase.getGroupFromId(traj.groupId);
          const firstTraj = group.trajectories[0];
          const lastTraj = group.trajectories[group.trajectories.length - 1];
          const startTime = phrase.startTime + firstTraj.startTime;
          let endTime = lastTraj.startTime + lastTraj.durTot;
          endTime = endTime + phrase.startTime;
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
          const firstTrajDur = time - (phrase.startTime + traj.startTime);
          const secondTrajDur = traj.durTot - firstTrajDur;
          traj.durTot = firstTrajDur;
          const ntObj = {
            id: 12,
            durTot: secondTrajDur,
            pitches: [],
            fundID12: this.piece.raga.fundamental
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
            const oldId = `p${phrase.pieceIdx}t${thisTraj.num-1}`;
            const newId = `p${phrase.pieceIdx}t${thisTraj.num}`;
            this.reIdAllReps(oldId, newId);
          }
        }
        const possibleTimes = this.possibleTrajDivs();
        const finalTime = getClosest(possibleTimes, time);
        const ftIdx = possibleTimes.indexOf(finalTime);
        const ptPerP = this.piece.phrases.map(p => p.trajectories.length - 1);
        const lims = [0, ...ptPerP.map(cumsum()).slice(0, ptPerP.length - 1)];
        const pIdx_ = lims.findLastIndex(lim => ftIdx >= lim);
        const start = lims[pIdx_];
        const trajIdx = ftIdx - start;
        const phrase_ = this.piece.phrases[pIdx_];
        const end = phrase_.trajectories.length - (trajIdx + 1);
        const newTrajs = phrase_.trajectories.splice(trajIdx+1, end);
        phrase_.durTotFromTrajectories();
        phrase_.durArrayFromTrajectories();
        const newPhraseObj = {
          trajectories: newTrajs,
          raga: phrase_.raga
        };
        if (this.piece.instrumentation) {
          newPhraseObj.instrumentation = this.piece.instrumentation;
        }
        const newPhrase = new Phrase(newPhraseObj)
        this.piece.phrases.splice(phrase_.pieceIdx+1, 0, newPhrase);
        this.piece.durTotFromPhrases();
        this.piece.durArrayFromPhrases();
        this.piece.updateStartTimes();
        //move over names of old phrase_ divs, from the back forward
        for (let i=this.piece.phrases.length-2; i >= phrase_.pieceIdx; i--) {
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
        this.addNewPhraseDiv(phrase_.pieceIdx);
        this.setNewPhraseDiv = false;
        this.svg.style('cursor', 'auto');        
      } else if (this.setNewRegion) {
        this.setRegionToPhrase(pIdx);
        this.setNewRegion = false;
      } else {
        if (this.justEnded) {
          this.justEnded = false // this just prevents phrase div drag end from 
          // clearing all
        } else {
          this.clearAll(false)
        }
      }
    },

    scrollYDragStart(e) {
      const elem = d3Select('.scrollYDragger');
      const transform = elem.attr('transform');
      this.initYOffset = transform.split(',')[1];
      const end = this.initYOffset.length - 1;
      this.initYOffset = Number(this.initYOffset.slice(0, end));
      this.initYOffset = e.y - this.initYOffset; 
    },

    getScrollYVal(scrollProp) {
      const scrollYMin = this.zoomY.translateExtent()[0][1];
      const graphHeight = this.rect().height - 30;
      const k = this.ty().k;
      const scrollYExtent = (graphHeight * k - graphHeight) / k;
      const scrollY = scrollYMin + scrollProp * scrollYExtent;
      return scrollY
    },

    scrollYDragging(e) {
      let y = e.y - this.initYOffset;
      if (y < 0) y = 0;
      const maxY = this.scrollYHeight - this.getScrollYDraggerHeight();
      if (y > maxY) y = maxY;
      const scrollProp = y / maxY;
      const scrollY = this.getScrollYVal(scrollProp);
      this.gy.call(this.zoomY.translateTo, 0, scrollY, [0, 0]);
      this.redraw();

      d3Select('.scrollYDragger')
        .attr('transform', `translate(2, ${y})`)
    },

    scrollYDragEnd(e) {
      let y = e.y - this.initYOffset;
      if (y < 0) y = 0;
      const maxY = this.scrollYHeight - this.getScrollYDraggerHeight();
      if (y > maxY) y = maxY;
      d3Select('.scrollYDragger')
        .attr('transform', `translate(2, ${y})`)
    },

    scrollXDragStart(e) {
      const elem = d3Select('.scrollXDragger');
      const transform = elem.attr('transform');
      this.initXOffset = transform.split(',')[0];
      this.initXOffset = Number(this.initXOffset.slice(10));
      this.initXOffset = e.x - this.initXOffset; 
    },

    getScrollXVal(scrollProp) {
      const scrollXMin = this.zoomX.translateExtent()[0][0];
      const graphWidth = this.rect().width - 30;
      const k = this.tx().k;
      const scrollXExtent = (graphWidth * k - graphWidth) / k;
      const scrollX = scrollXMin + scrollProp * scrollXExtent;
      return scrollX
    },

    scrollXDragging(e) {
      let x = e.x - this.initXOffset;
      if (x < 0) x = 0;
      const maxX = this.scrollXWidth - this.getScrollXDraggerWidth();
      if (x > maxX) x = maxX;
      const scrollProp = x / maxX;
      const scrollX = this.getScrollXVal(scrollProp);
      this.gx.call(this.zoomX.translateTo, scrollX, 0, [0, 0]);
      this.redraw();

      d3Select('.scrollXDragger')
        .attr('transform', `translate(${x}, 2)`)
    },

    moveToPhrase(pIdx) {
      // move scroll
      const offsetDurTot = this.piece.durTot * (1 - 1 / this.tx().k);
      const time = this.piece.phrases[pIdx].startTime;
      const scrollX = this.getScrollXVal(time / offsetDurTot);
      this.gx.call(this.zoomX.translateTo, scrollX, 0, [0, 0]);
      this.redraw();
      //move playhead
      this.currentTime = time;
      if (!this.$refs.audioPlayer.playing) {
        this.$refs.audioPlayer.pausedAt = time;
        this.$refs.audioPlayer.updateProgress();
        this.$refs.audioPlayer.updateFormattedCurrentTime();
        this.$refs.audioPlayer.updateFormattedTimeLeft();
      } else {
        this.$refs.audioPlayer.stop();
        this.$refs.audioPlayer.pausedAt = time;
        this.$refs.audioPlayer.play();
      }
      this.movePlayhead();
      this.moveShadowPlayhead();
      const query = this.$route.query;
      this.$router.push({ query: { id: query.id, pIdx: pIdx.toString() } });
    },

    moveToTime(time, point, redraw=false) {
      if (point === undefined) {
        point = [0, 0];
      }
      const offsetDurTot = this.piece.durTot * (1 - 1 / this.tx().k);
      const scrollX = this.getScrollXVal(time / offsetDurTot);
      this.gx.call(this.zoomX.translateTo, scrollX, 0, point);
      if (redraw === true) this.redraw(true)
    },

    moveToY(y, point, redraw=false) {
      if (point === undefined) {
        point = [0, 0]
      }
      this.gy.call(this.zoomY.translateTo, 0, y, point);
      if (redraw === true) this.redraw(true)
      // this.transformScrollYDragger();
    },

    scaleToX(x, point = undefined, redraw = false) {
      const currentX = this.tx().k;
      const scaleFactor = x / currentX;
      if (point === undefined) {
        point = [0, 0];
      }
      this.gx.call(this.zoomX.scaleBy, scaleFactor, point);
      if (redraw === true) this.redraw(true)
    },

    scaleToY(y, point = undefined, redraw = false) {
      const currentY = this.ty().k;
      const scaleFactor = y / currentY;
      if (point === undefined) {
        point = [0, 0];
      }
      this.gy.call(this.zoomY.scaleBy, scaleFactor, point);
      if (redraw === true) this.redraw(true)
    },

    scaleAndMoveToTime(x, time, scalingParam, yProp,point=undefined) {
      if (point === undefined) {
        point = [0, 0];
      }
      this.scaleToX(x, point);
      const currentHeight = document.querySelector('#backColor')
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
      const curPhrase = this.phraseIdxFromTime(time, true);
      if (this.piece.phrases[curPhrase+1]) {
        this.moveToPhrase(curPhrase+1);
      }
    },

    moveToPrevPhrase() {
      const time = this.xr().invert(this.yAxWidth);
      const curPhrase = this.phraseIdxFromTime(time, true);
      if (this.piece.phrases[curPhrase-1]) {
        this.moveToPhrase(curPhrase-1);
      }
    },

    makeAxes() {
      this.xAxis = (g, scale) => g
        .attr('transform', `translate(0,${this.xAxHeight})`)
        .style('font-size', '13px')
        .call(d3AxisTop(scale).ticks(10).tickFormat(d => structuredTime(d)))
        .call(g => g.select('.domain'))
      const yTickLabels = this.getYTickLabels();
      this.yAxis = (g, scale) => g
        .attr('transform', `translate(${this.x(0)},0)`)
        .attr('clip-path', 'url(#yAxisClip)')
        .style('font-size', '14px')
        .call(d3AxisLeft(scale)
          .tickValues(this.visibleSargam.map(f => Math.log2(f)))
          .tickFormat((_, i) => yTickLabels[i]))
        .call(g => g.select('.domain'))
    },

    slidePhrases(x, y, xS, yS, tTime) {  
      this.phraseG.transition().duration(tTime)
        .ease(d3EaseQuadInOut)
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
      this.addSargamLines();
      this.piece.phrases.forEach((phrase, pIdx) => {
        phrase.trajectories.forEach((traj, tIdx) => {
          if (traj.id !== 12) {
            const st = phrase.startTime + traj.startTime;
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
              .style('cursor', 'pointer')
              .on('mouseover', this.handleMouseOver)
              .on('mouseout', this.handleMouseOut)
              .on('click', this.handleClickTraj)
          }
          const vowelIdxs = phrase.firstTrajIdxs();
          this.addArticulations(traj, phrase.startTime, vowelIdxs)
        })
      });
      this.addChikaris();
      this.addPlayhead();
    },

    addArticulations(traj, phraseStart, vowelIdxs) {
      const g = this.phraseG.append('g')
        .attr('id', `articulations__p${traj.phraseIdx}t${traj.num}`)
      this.addPlucks(traj, phraseStart, g)
      this.addKrintin(traj, phraseStart, g)
      this.addSlide(traj, phraseStart, g)
      this.addDampener(traj, phraseStart, g)
      if (this.vocal) {
        this.addStartingConsonant(traj, phraseStart, g)
        this.addEndingConsonant(traj, phraseStart, g)
        if (vowelIdxs.includes(traj.num)) {
          this.addVowel(traj, phraseStart, g)
        }
      }   
    },

    codifiedAddArticulations(traj, phraseStart, vowelIdxs) {
      const g = this.phraseG.append('g')
        .attr('id', `articulations__p${traj.phraseIdx}t${traj.num}`)
      this.codifiedAddPlucks(traj, phraseStart, g);
      this.codifiedAddKrintin(traj, phraseStart, g);
      this.codifiedAddSlide(traj, phraseStart, g);
      this.codifiedAddDampener(traj, phraseStart, g);
      if (this.vocal) {
        this.addStartingConsonant(traj, phraseStart, g, true);
        this.addEndingConsonant(traj, phraseStart, g, true);
        if (vowelIdxs.includes(traj.num)) {
          this.addVowel(traj, phraseStart, g, true);
        }
      }
    },

    removePlucks(traj) {
      const pIdx = traj.phraseIdx;
      const tIdx = traj.num;
      const id = `#pluckp${pIdx}t${tIdx}`;
      d3SelectAll(id).remove()
    },

    addPlucks(traj, phraseStart, g) {
      if (traj.id !== 12) {
        const size = 20;
        const offset = (size ** 0.5 ) / 2;
        
        const keys = Object.keys(traj.articulations);
        const relKeys = keys.filter(key => {
          return traj.articulations[key].name === 'pluck'
        });
        const pluckData = relKeys.map(p => {
          const normedX = Number(p) * traj.durTot;
          const y = traj.compute(normedX, true);
          return {
            x: phraseStart + traj.startTime + Number(p),
            y: y
          }
        });
        const sym = d3Symbol().type(d3SymbolTriangle).size(size);
        const x = d => this.xr()(d.x);
        const y = d => this.yr()(d.y);
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
    },

    codifiedAddPlucks(traj, phraseStart, g) {
      const size = 20;
      const offset = (size ** 0.5 ) / 2;
      if (traj.id !== 12) {
        const keys = Object.keys(traj.articulations);
        const relKeys = keys.filter(key => {
          return traj.articulations[key].name === 'pluck'
        });
        const pluckData = relKeys.map(p => {
          const normedX = Number(p) * traj.durTot;
          const y = traj.compute(normedX, true);
          return {
            x: phraseStart + traj.startTime + Number(p),
            y: y
          }
        });
        const x = d => this.codifiedXR(d.x);
        const y = d => this.codifiedYR(d.y);
        const sym = d3Symbol().type(d3SymbolTriangle).size(size);
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
    },

    addStartingConsonant(traj, phraseStart, g, codified=false) {
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
          let text;
          if (this.phonemeRepresentation === 'IPA') {
            text = traj.articulations[key].ipa;
          } else if (this.phonemeRepresentation === 'Devanagari') {
            text = traj.articulations[key].hindi;
          } else if (this.phonemeRepresentation === 'English') {
            text = traj.articulations[key].engTrans;
          }
          const cd = {
            x: phraseStart + traj.startTime + normedX,
            y: y_,
            text: text
          }
          let x, y;
          if (codified) {
            x = d => this.codifiedXR(d.x);
            y = d => this.codifiedYR(d.y);
          } else {
            x = d => this.xr()(d.x);
            y = d => this.yr()(d.y);
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

    addEndingConsonant(traj, phraseStart, g, codified=false) {
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

          let text;
          if (this.phonemeRepresentation === 'IPA') {
            text = traj.articulations[key].ipa;
          } else if (this.phonemeRepresentation === 'Devanagari') {
            text = traj.articulations[key].hindi;
          } else if (this.phonemeRepresentation === 'English') {
            text = traj.articulations[key].engTrans;
            console.log(traj.articulations[key])
          }
          const cd = {
            x: phraseStart + traj.startTime + normedX,
            y: y_,
            text: text
          }
          let x, y;
          if (codified) {
            x = d => this.codifiedXR(d.x);
            y = d => this.codifiedYR(d.y);
          } else {
            x = d => this.xr()(d.x);
            y = d => this.yr()(d.y);
          }
          g.append('text')
            .classed('articulation', true)
            .classed('consonant', true)
            .attr('id', `endConsonantp${traj.phraseIdx}t${traj.num}`)
            .attr('stroke', 'black')
            .attr('font-size', '15px')
            .attr('text-anchor', 'middle')
            .data([cd])
            .attr('transform', d => `translate(${x(d)}, ${y(d) - 14})`)
            .text(cd.text)
        }
      }
    },

    addVowel(traj, phraseStart, g, codified = false) {
      if (traj.id !== 12) {
        let text;
          if (this.phonemeRepresentation === 'IPA') {
            text = traj.vowelIpa;
          } else if (this.phonemeRepresentation === 'Devanagari') {
            text = traj.vowelHindi;
          } else if (this.phonemeRepresentation === 'English') {
            text = traj.vowelEngTrans;
          }
        let x, y;
        if (codified) {
          x = d => this.codifiedXR(d.x);
          y = d => this.codifiedYR(d.y);
        } else {
          x = d => this.xr()(d.x);
          y = d => this.yr()(d.y);
        }
        const cd = {
          x: phraseStart + traj.startTime + traj.durTot / 2,
          y: traj.compute(0.5, true),
          text: text
        }
        g.append('text')
          .classed('articulation', true)
          .classed('vowel', true)
          .attr('id', `vowelp${traj.phraseIdx}t${traj.num}`)
          .attr('stroke', 'black')
          .attr('font-size', '15px')
          .attr('text-anchor', 'middle')
          .data([cd])
          .attr('transform', d => `translate(${x(d)}, ${y(d) - 14})`)
          .text(cd.text)
      }
    },

    moveStartingConsonant(traj, phraseStart, codified=false) {
      if (traj.id !== 12) {
        const key = '0.00';
        if (traj.articulations[key] !== undefined) {
          const normedX = Number(key) * traj.durTot;
          const y_ = traj.compute(Number(key), true);
          const cd = {
            x: phraseStart + traj.startTime + normedX,
            y: y_,
            text: traj.articulations[key].stroke
          };
          let x, y;
          if (codified) {
            x = d => this.codifiedXR(d.x);
            y = d => this.codifiedYR(d.y);
          } else {
            x = d => this.xr()(d.x);
            y = d => this.yr()(d.y);
          }
          d3Select(`#startConsonantp${traj.phraseIdx}t${traj.num}`)
            .data([cd])
            .attr('transform', d => `translate(${x(d)}, ${y(d) - 14})`)
        }
      }
    },

    moveVowel(traj, phraseStart, codified=false) {
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
          x: phraseStart + traj.startTime + traj.durTot / 2,
          y: traj.compute(0.5, true),
          text: text
        };
        let x, y;
        if (codified) {
          x = d => this.codifiedXR(d.x);
          y = d => this.codifiedYR(d.y);
        } else {
          x = d => this.xr()(d.x);
          y = d => this.yr()(d.y);
        }
        d3Select(`#vowelp${traj.phraseIdx}t${traj.num}`)
          .data([cd])
          .attr('transform', d => `translate(${x(d)}, ${y(d) - 14})`)
      }
    },

    groupSelectedTrajs() {
      if (this.selectedTrajsGroupable()) {
        const pIdx = this.selectedTrajs[0].phraseIdx;
        const phrase = this.piece.phrases[pIdx];
        const group = new Group({ trajectories: this.selectedTrajs });
        phrase.getGroups(0).push(group)
      } else {
        throw new Error('Cannot group selected trajectories');
      }
    },

    ungroupSelectedTrajs() {
      if (this.selectedTrajsConstituteAGroup()) {
        const groupId = this.selectedTrajs[0].groupId;
        this.selectedTrajs.forEach(traj => {
          traj.groupId = undefined
        });
        const pIdx = this.selectedTrajs[0].phraseIdx;
        const phrase = this.piece.phrases[pIdx];
        const groups = phrase.getGroups(0);
        // remove group from groups
        const idx = groups.findIndex(group => group.id === groupId);
        groups.splice(idx, 1);

      } else {
        throw new Error('Cannot ungroup selected trajectories');
      }
    },

    selectedTrajsConstituteAGroup() {
      const phrase = this.piece.phrases[this.selectedTrajs[0].phraseIdx];
      const id = this.selectedTrajs[0].groupId;
      const group = phrase.getGroupFromId(id);
      const c1 = group.trajectories.length === this.selectedTrajs.length;
      const c2 = this.selectedTrajs.every(traj => traj.groupId === id);
      return c1 && c2
    },

    moveEndingConsonant(traj, phraseStart, codified=false) {
      if (traj.id !== 12) {
        const key = '1.00';
        if (traj.articulations[key] !== undefined) {
          const normedX = Number(key) * traj.durTot;
          const y_ = traj.compute(Number(key), true);
          const cd = {
            x: phraseStart + traj.startTime + normedX,
            y: y_,
            text: traj.articulations[key].stroke
          };
          let x, y;
          if (codified) {
            x = d => this.codifiedXR(d.x);
            y = d => this.codifiedYR(d.y);
          } else {
            x = d => this.xr()(d.x);
            y = d => this.yr()(d.y);
          }
          d3Select(`#endConsonantp${traj.phraseIdx}t${traj.num}`)
            .data([cd])
            .attr('transform', d => `translate(${x(d)}, ${y(d) - 14})`)
        }
      }
    },

    addKrintin(traj, phraseStart, g) {
      // hammer-offs
      const keys = Object.keys(traj.articulations);
      const hammerOffKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-off'
      });
      const hammerOffData = hammerOffKeys.map((p, i) => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y,
          i: i
        }
      });
      hammerOffData.forEach(obj => {
        const x = d => this.xr()(d.x);
        const y = d => this.yr()(d.y);
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
          x: phraseStart + traj.startTime + Number(normedX),
          y: y,
          i: i
        }
      });
      hammerOnData.forEach(obj => {
        const x = d => this.xr()(d.x);
        const y = d => this.yr()(d.y);
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

    codifiedAddKrintin(traj, phraseStart, g) {
      // hammer-offs
      const keys = Object.keys(traj.articulations);
      const hammerOffKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-off'
      });
      const hammerOffData = hammerOffKeys.map((p, i) => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y,
          i: i
        }
      });
      const x = d => this.codifiedXR(d.x);
      const y = d => this.codifiedYR(d.y);
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
          x: phraseStart + traj.startTime + Number(normedX),
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

    moveKrintin(traj, phraseStart) {
      // hammer-offs
      const keys = Object.keys(traj.articulations);
      const hammerOffKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-off'
      })
      const hammerOffData = hammerOffKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y,
          i: i
        }
      });
      const x = d => this.codifiedXR(d.x);
      const y = d => this.codifiedYR(d.y);
      hammerOffData.forEach(obj => {
        d3Select(`#hammeroffp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      });
      // hammer-ons
      const hammerOnKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-on'
      });
      const hammerOnData = hammerOnKeys.map((p, i) => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y,
          i: i
        }
      });

      hammerOnData.forEach(obj => {
        d3Select(`#hammeronp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })
    },

    makeTrajData(traj, phraseStart) {
      const startTime = traj.startTime + phraseStart;
      const endTime = startTime + traj.durTot;
      const timePts = Math.round((endTime - startTime) / this.minDrawDur);
      const drawTimes = linSpace(startTime, endTime, timePts);
      const mp = t => (t - startTime) / (endTime - startTime);
      const trajDrawXs = drawTimes.map(mp);
      const trajDrawYs = trajDrawXs.map(x => traj.compute(x))
      return trajDrawYs.map((y, i) => {
        return {
          x: drawTimes[i],
          y: y
        }
      });
    },

    addSlide(traj, phraseStart, g) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => {
        return traj.articulations[key].name === 'slide'
      });
      const data = relKeys.map((p, i) => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        const dirUp = y < traj.compute(p, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y,
          dirUp: dirUp,
          i: i
        }
      });
      const x = d => this.xr()(d.x);
      const y = d => this.yr()(d.y);
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

    codifiedAddSlide(traj, phraseStart, g) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => {
        return traj.articulations[key].name === 'slide'
      });
      const data = relKeys.map((p, i) => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        const dirUp = y < traj.compute(p, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y,
          dirUp: dirUp,
          i: i
        }
      });
      const x = d => this.codifiedXR(d.x);
      const y = d => this.codifiedYR(d.y);
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

    moveSlides(traj, phraseStart) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => {
        return traj.articulations[key].name === 'slide'
      });
      const data = relKeys.map((p, i) => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        const dirUp = y < traj.compute(p, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y,
          dirUp: dirUp,
          i: i
        }
      });
      const x = d => this.codifiedXR(d.x);
      const y = d => this.codifiedYR(d.y);
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
      const arrowPoints = [
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
        .attr('fill', this.selectedArtColor)
    },
    
    idFromKey(key, idx) {
      const sec = Math.floor(Number(key));
      const dec = (Number(key) % 1).toFixed(2).toString().slice(2);
      return `p${idx}_${sec}_${dec}`;
    },

    addChikaris() {
      const sym = d3Symbol().type(d3SymbolX).size(80);
      this.piece.phrases.forEach(phrase => {
        Object.keys(phrase.chikaris).forEach(key => {
          const scaledX = Number(key) / phrase.durTot;
          const dataObj = {
            x: Number(key) + phrase.startTime,
            y: phrase.compute(scaledX, true)
          };
          const id = this.idFromKey(key, phrase.pieceIdx);
          const x = d => this.xr()(d.x);
          const y = d => this.yr()(d.y);
          this.phraseG.append('g') // actual chikari
            .classed('chikari', true)
            .append('path')
            .attr('id', id)
            .attr('d', sym)
            .attr('stroke', this.chikariColor)
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round')
            .data([dataObj])
            .attr('transform', d => `translate(${x(d)}, ${y(d)})`)
          this.phraseG.append('g') // for clicking
            .classed('chikari', true)
            .append('circle')
            .attr('id', 'circle__' + id)
            .classed('chikariCircle', true)
            .style('opacity', '0')
            .data([dataObj])
            .attr('cx', d => this.xr()(d.x))
            .attr('cy', d => this.yr()(d.y))
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
          const scaledX = Number(key) / phrase.durTot;
          const dataObj = {
            x: Number(key) + phrase.startTime,
            y: phrase.compute(scaledX, true)
          };
          const id = this.idFromKey(key, phrase.pieceIdx);
          const x = d => this.codifiedXR(d.x);
          const y = d => this.codifiedYR(d.y);
          this.phraseG.append('g')
            .classed('chikari', true)
            .append('path')
            .attr('id', id)
            .attr('d', sym)
            .attr('stroke', this.chikariColor)
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round')
            .data([dataObj])
            .attr('transform', d => {
              return `translate(${x(d)}, ${y(d)})`
            })  
          this.phraseG.append('g') // for clicking
            .classed('chikari', true)
            .append('circle')
            .attr('id', 'circle__' + id)
            .classed('chikariCircle', true)
            .style('opacity', '0')
            .data([dataObj])
            .attr('cx', d => this.codifiedXR(d.x))
            .attr('cy', d => this.codifiedYR(d.y))
            .attr('r', 6)
            .on('mouseover', this.handleMouseOver)
            .on('mouseout', this.handleMouseOut)
            .on('click', this.handleClickChikari)
        })
      })
    },

    codifiedAddOneChikari(phrase, key, selected=true) {
      const sym = d3Symbol().type(d3SymbolX).size(80);
      const scaledX = Number(key) / phrase.durTot;
      const dataObj = {
        x: Number(key) + phrase.startTime,
        y: phrase.compute(scaledX, true)
      };
      const id = this.idFromKey(key, phrase.pieceIdx);
      const x = d => this.codifiedXR(d.x);
      const y = d => this.codifiedYR(d.y);
      this.phraseG.append('g')
        .classed('chikari', true)
        .append('path')
        .attr('id', id)
        .attr('d', sym)
        .attr('stroke', selected? this.selectedChikariColor: this.chikariColor)
        .attr('stroke-width', 3)
        .attr('stroke-linecap', 'round')
        .data([dataObj])
        .attr('transform', d => {
          return `translate(${x(d)}, ${y(d)})`
        })  
      this.phraseG.append('g') // for clicking
        .classed('chikari', true)
        .append('circle')
        .attr('id', 'circle__' + id)
        .classed('chikariCircle', true)
        .style('opacity', '0')
        .data([dataObj])
        .attr('cx', d => this.codifiedXR(d.x))
        .attr('cy', d => this.codifiedYR(d.y))
        .attr('r', 6)
        .on('mouseover', this.handleMouseOver)
        .on('mouseout', this.handleMouseOut)
        .on('click', this.handleClickChikari)
    },

    getIdFromTrajClick(e) {
      const c1 = e.target.id.slice(0, 9) === 'overlay__';
      const c2 = e.target.id.slice(0, 5) === 'pluck';
      const c3 = e.target.id.slice(0, 9) === 'hammeroff';
      const c4 = e.target.id.slice(0, 8) === 'hammeron';
      const c5 = e.target.id.slice(0, 5) === 'slide';
      let id;
        if (c1) {
          id = e.target.id.slice(9);
        } else if (c2) {
          id = e.target.id.slice(5);
        } else if (c3) {
          id = e.target.id.slice(9);
          id = id.split('i')[0]
        } else if (c4) {
          id = e.target.id.slice(8);
          id = id.split('i')[0];
        } else if (c5) {
          id = e.target.id.slice(5);
          id = id.split('i')[0];
        }
      return id;
    },

    handleMouseOver(e) {
      const c1 = e.target.id.slice(0, 9) === 'overlay__';
      const c2 = e.target.id.slice(0, 5) === 'pluck';
      const c3 = e.target.id.slice(0, 9) === 'hammeroff';
      const c4 = e.target.id.slice(0, 8) === 'hammeron';
      const c5 = e.target.id.slice(0, 5) === 'slide';
      if (e.target.id.slice(0, 8) === 'circle__') {
        const id = e.target.id.slice(8)
        d3Select(`#${id}`)
          .attr('stroke', this.selectedChikariColor)
        d3Select(`#${e.target.id}`)
          .style('cursor', 'pointer')
      } else if (c1 || c2 || c3 || c4 || c5) {
        let id;
        if (c1) {
          id = e.target.id.slice(9);
        } else if (c2) {
          id = e.target.id.slice(5);
        } else if (c3) {
          id = e.target.id.slice(9);
          id = id.split('i')[0]
        } else if (c4) {
          id = e.target.id.slice(8);
          id = id.split('i')[0];
        } else if (c5) {
          id = e.target.id.slice(5);
          id = id.split('i')[0];
        }
        const pIdx = Number(id.split('t')[0].slice(1));
        const tIdx = Number(id.split('t')[1]);
        const traj = this.piece.phrases[pIdx].trajectories[tIdx];
        if (traj.groupId === undefined) {
          let color = this.selectedTrajColor;
          d3Select(`#${id}`)
            .attr('stroke', color)
          d3Select(`#dampenp${pIdx}t${tIdx}`)
            .attr('stroke', color)
          if (this.selectedTraj && traj !== this.selectedTraj) {
            d3Select(`#${e.target.id}`)
              .style('cursor', 'pointer')
          } else {
            d3Select(`#${e.target.id}`)
              .style('cursor', 'pointer')
          }
          d3Select(`#pluck${id}`)
            .attr('stroke', this.selectedArtColor)
            .attr('fill', this.selectedArtColor)
          this.updateArtColors(traj, true)
        } else {
          const group = this.piece.phrases[pIdx].getGroupFromId(traj.groupId);
          group.trajectories.forEach(traj => {
            const id = `p${traj.phraseIdx}t${traj.num}`;
            d3Select(`#${id}`)
              .attr('stroke', this.selectedTrajColor)
            d3Select(`#dampenp${traj.phraseIdx}t${traj.num}`)
              .attr('stroke', this.selectedTrajColor)
            d3Select(`#pluck${id}`)
              .attr('stroke', this.selectedArtColor)
              .attr('fill', this.selectedArtColor)
            // d3Select(`#overlay__${id}`)
            //   .attr('cursor', 'pointer')
            this.updateArtColors(traj, true)
          })
        }
      } 
    },

    alterSlope(newSlope) {
      const trajObj = this.selectedTraj.toJSON();
      trajObj.slope = Number(newSlope);
      const newTraj = new Trajectory(trajObj);
      const pIdx = this.selectedTraj.phraseIdx;
      const tIdx = this.selectedTraj.num;
      const phrase = this.piece.phrases[pIdx];
      phrase.trajectories[tIdx] = newTraj;
      phrase.assignStartTimes();
      phrase.assignPhraseIdx();
      phrase.assignTrajNums();
      this.selectedTraj = newTraj;
      this.selectedTrajs = [this.selectedTraj];
      const data = this.makeTrajData(this.selectedTraj, phrase.startTime);
      d3Select(`#p${pIdx}t${tIdx}`)
        .datum(data)
        .attr('d', this.codifiedPhraseLine())
      d3Select(`#overlay__p${pIdx}t${tIdx}`)
        .datum(data)
        .attr('d', this.codifiedPhraseLine())
      if (this.vocal) {
        const pIdx = this.selectedTraj.phraseIdx;
        const tIdx = this.selectedTraj.num;
        const phrase = this.piece.phrases[pIdx];
        const g = d3Select(`#articulations__p${pIdx}t${tIdx}`);
        const selected = d3Select(`#vowelp${pIdx}t${tIdx}`);
        if (selected.node() === null) {
          console.log('this')
          this.addVowel(this.selectedTraj, phrase.startTime, g, true)
        } else {
          console.log('that')
          selected.remove();
          this.addVowel(this.selectedTraj, phrase.startTime, g, true)
        }
      }
    },

    handleMouseOut(e) {
      const c1 = e.target.id.slice(0, 9) === 'overlay__';
      const c2 = e.target.id.slice(0, 5) === 'pluck';
      const c3 = e.target.id.slice(0, 9) === 'hammeroff';
      const c4 = e.target.id.slice(0, 8) === 'hammeron';
      const c5 = e.target.id.slice(0, 5) === 'slide';
      if (e.target.id.slice(0, 8) === 'circle__') {
        const id = e.target.id.slice(8)
        if (id !== this.selectedChikariID) {
          d3Select(`#${id}`)
            .attr('stroke', this.chikariColor)
        }
      }
      if (c1 || c2 || c3 || c4 || c5) {
        let id;
        if (c1) {
          id = e.target.id.slice(9);
        } else if (c2) {
          id = e.target.id.slice(5);
        } else if (c3) {
          id = e.target.id.slice(9);
          id = id.split('i')[0]
        } else if (c4) {
          id = e.target.id.slice(8);
          id = id.split('i')[0];
        } else if (c5) {
          id = e.target.id.slice(5);
          id = id.split('i')[0];
        }
        if (this.selectedTrajs.length < 2) {
          if (id !== this.selectedTrajID) {
            const pIdx = Number(id.split('t')[0].slice(1));
            const tIdx = Number(id.split('t')[1]);
            const traj = this.piece.phrases[pIdx].trajectories[tIdx];
            if (traj.groupId === undefined) {
              d3Select(`#${id}`)
                .attr('stroke', this.trajColor)
              d3Select(`#dampen${id}`)
                .attr('stroke', this.trajColor)
              d3Select(`#pluck${id}`)
                .attr('stroke', 'black')
                .attr('fill', 'black')
              this.updateArtColors(traj, false)
            } else {
              const group = this.piece.phrases[pIdx]
                .getGroupFromId(traj.groupId);
              group.trajectories.forEach(traj_ => {
                const id_ = `p${traj_.phraseIdx}t${traj_.num}`;
                d3Select(`#${id_}`)
                  .attr('stroke', this.trajColor)
                d3Select(`#dampen${id_}`)
                  .attr('stroke', this.trajColor)
                d3Select(`#pluck${id_}`)
                  .attr('stroke', 'black')
                  .attr('fill', 'black')
                this.updateArtColors(traj_, false)
              })
            } 
          }
        } else {
          const pIdx = Number(id.split('t')[0].slice(1));
          const tIdx = Number(id.split('t')[1]);
          const traj = this.piece.phrases[pIdx].trajectories[tIdx];
          if (!this.selectedTrajs.includes(traj)) {
            if (traj.groupId === undefined) {
              d3Select(`#${id}`)
                .attr('stroke', this.trajColor)
              d3Select(`#dampen${id}`)
                .attr('stroke', this.trajColor)
              d3Select(`#pluck${id}`)
                .attr('stroke', 'black')
                .attr('fill', 'black')
              this.updateArtColors(traj, false)
            } else {
              const group = this.piece.phrases[pIdx]
                .getGroupFromId(traj.groupId);
              group.trajectories.forEach(traj_ => {
                const id_ = `p${traj_.phraseIdx}t${traj_.num}`;
                d3Select(`#${id_}`)
                  .attr('stroke', this.trajColor)
                d3Select(`#dampen${id_}`)
                  .attr('stroke', this.trajColor)
                d3Select(`#pluck${id_}`)
                  .attr('stroke', 'black')
                  .attr('fill', 'black')
                this.updateArtColors(traj_, false)
              })
            }
            
          }
        }
      }
    },

    handleClickChikari(e) {
      e.stopPropagation();
      const id = e.target.id.split('__')[1];
      if (this.selectedChikariID && this.selectedChikariID !== id) {
        d3Select('#' + this.selectedChikariID)
          .attr('stroke', this.chikariColor)
      }
      this.selectedChikariID = e.target.id.split('__')[1];
      d3Select(`#${this.selectedChikariID}`)
        .attr('stroke', this.selectedChikariColor)
      if (this.selectedTrajID) {
        this.clearSelectedTraj();
      }
      if (!(this.selectedPhraseDivIdx === undefined)) {
        this.clearSelectedPhraseDiv()
      }
    },

    adjustChikari(left=true) {
      // first, adjust the actual chikari in phrase object, 
      const offset = 0.02;
      const pIdx = this.selectedChikariID.split('_')[0].slice(1);
      const sec = this.selectedChikariID.split('_')[1];
      const cSec = this.selectedChikariID.split('_')[2];
      const time = Number(sec) + Number(cSec) / 100;
      const phrase = this.piece.phrases[pIdx];
      if (time < offset && left ) {
        return 
      } else if (phrase.durTot - time < offset && !left) {
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

    selectedTrajsGroupable() {// tests whether all trajs in this.selectedTrajs
      // are adjacent to one another and part of the same phrase
      const uniquePIdxs = [...new Set(this.selectedTrajs.map(t => t.phraseIdx))];
      if (uniquePIdxs.length === 1) {
        // sort by num
        this.selectedTrajs.sort((a, b) => a.num - b.num);
        const nums = this.selectedTrajs.map(traj => traj.num);
        const diffs = nums.slice(1).map((num, nIdx) => {
          return num - nums[nIdx];
        })
        return diffs.every(diff => diff === 1)
      } else {
        return false
      }
    },

    handleClickTraj(e) {
      e.stopPropagation();
      this.groupable = false;
      if (this.shifted && this.selectedTrajs.length >= 1) {
        const id = this.getIdFromTrajClick(e);
        const pIdx = id.split('t')[0].slice(1);
        const tIdx = id.split('t')[1];
        const newTraj = this.piece.phrases[pIdx].trajectories[tIdx];
        if (newTraj.groupId === undefined) {
          this.selectedTrajs.push(newTraj);
          this.groupable = this.selectedTrajsGroupable();
          this.$refs.trajSelectPanel.grouped = false;
          // clear selected traj visually
          if (this.selectedTraj && this.selectedTrajID) {
            d3Select(`#${this.selectedTrajID}`)
              .attr('stroke', this.trajColor)
            d3Select(`#dampen${this.selectedTrajID}`)
              .attr('stroke', this.trajColor)
            d3Select(`#pluck${this.selectedTrajID}`)
              .attr('fill', this.trajColor)
            d3Select(`#pluck${this.selectedTrajID}`)
              .attr('stroke', this.trajColor)
            d3Select('#overlay__' + this.selectedTrajID)
              .attr('cursor', 'pointer')
            d3SelectAll('.dragDots').remove();
            this.selectedTrajID = undefined;
            this.selectedTraj = undefined;
            this.clearTrajSelectPanel();
          }
          this.selectedTrajs.forEach(traj => {
            const id = `p${traj.phraseIdx}t${traj.num}`;
            d3Select(`#${id}`)
              .attr('stroke', this.selectedTrajColor)
            d3Select(`#dampen${id}`)
              .attr('stroke', this.selectedTrajColor)
            d3Select(`#pluck${id}`)
              .attr('fill', this.selectedArtColor)
              .attr('stroke', this.selectedArtColor)
            d3Select('#overlay__' + id)
              .attr('cursor', 'pointer')
            this.updateArtColors(traj, true)
          })
        }
      } else {
        if (this.selectedTrajs.length > 1) {
          this.selectedTrajs.forEach(traj => {
            const id = `p${traj.phraseIdx}t${traj.num}`;
            d3Select(`#${id}`)
              .attr('stroke', this.trajColor)
            d3Select(`#dampen${id}`)
              .attr('stroke', this.trajColor)
            d3Select(`#pluck${id}`)
              .attr('fill', this.trajColor)
            d3Select(`#pluck${id}`)
              .attr('stroke', this.trajColor)
            d3Select('#overlay__' + id)
              .attr('cursor', 'pointer')
            this.updateArtColors(traj, false)
          })
        }
        const id = this.getIdFromTrajClick(e);
        if (this.selectedTrajID && this.selectedTrajID !== id) {
          d3Select(`#` + this.selectedTrajID)
            .attr('stroke', this.trajColor)
          d3Select(`#dampen` + this.selectedTrajID)
            .attr('stroke', this.trajColor)
          d3Select(`#pluck${this.selectedTrajID}`)
            .attr('fill', this.trajColor)
            .attr('stroke', this.trajColor)
          this.updateArtColors(this.selectedTraj, false)
        }
        if (this.setNewSeries) {
          this.setNewSeries = false;
          d3SelectAll('.newSeriesDot').remove();
        }
        if (this.setNewTraj) {
          this.setNewTraj = false;
          d3SelectAll('.newTrajDot').remove();
        }
        if (this.setNewPhraseDiv) this.setNewPhraseDiv = false;
        if (this.setChikari) this.setChikari = false;
        this.svg.style('cursor', 'default');
        this.selectedTrajID = this.getIdFromTrajClick(e);
        const pIdx = this.selectedTrajID.split('t')[0].slice(1);
        const tIdx = this.selectedTrajID.split('t')[1];
        this.selectedTraj = this.piece.phrases[pIdx].trajectories[tIdx];
        if (this.selectedTraj.groupId !== undefined) {
          const phrase = this.piece.phrases[pIdx];
          const group = phrase.getGroupFromId(this.selectedTraj.groupId);
          this.selectedTrajs = group.trajectories;
          this.clearTrajSelectPanel();
          this.groupable = true;
          this.$refs.trajSelectPanel.grouped = true;
          this.selectedTrajID = undefined;
          this.selectedTraj = undefined;
          this.selectedTrajs.forEach(traj => {
            const id = `p${traj.phraseIdx}t${traj.num}`;
            d3Select(`#${id}`)
              .attr('stroke', this.selectedTrajColor)
            d3Select(`#dampen${id}`)
              .attr('stroke', this.selectedTrajColor)
            d3Select(`#pluck${id}`)
              .attr('fill', this.selectedArtColor)
              .attr('stroke', this.selectedArtColor)
            d3Select('#overlay__' + id)
              .attr('cursor', 'default')
            this.updateArtColors(traj, true)
          })
          d3SelectAll('.dragDots').remove();

        } else {
          this.selectedTrajs = [this.selectedTraj];
          const tsp = this.$refs.trajSelectPanel;
          const altId = this.selectedTraj.id >= 12 ? 
                        this.selectedTraj.id - 1: 
                        this.selectedTraj.id; 
          tsp.selectedIdx = tsp.trajIdxs.indexOf(altId);
          tsp.parentSelected = true;
          tsp.slope = Math.log2(this.selectedTraj.slope);
          tsp.vowel = this.selectedTraj.vowel;
          tsp.startConsonant = this.selectedTraj.startConsonant;
          tsp.endConsonant = this.selectedTraj.endConsonant;
          const st = this.selectedTraj;
          const c1 = st.articulations[0];
          const c2 = this.selectedTraj.articulations['1.00'];
          const c3 = st.articulations['0.00'];
          const c4 = c1 && st.articulations[0].name === 'pluck';
          const c5 = c3 && st.articulations['0.00'].name === 'pluck';
          if (c4 || c5) {
            tsp.pluckBool = true
          } else {
            tsp.pluckBool = false
          }
          if (c2 && c2.name === 'dampen') {
            tsp.dampen = true
          } else {
            tsp.dampen = false
          }
          d3Select(`#${this.selectedTrajID}`)
            .attr('stroke', this.selectedTrajColor)
          d3Select(`#overlay__${this.selectedTrajID}`)
            .style('cursor', 'auto')
          d3Select(`#dampen${this.selectedTrajID}`)
            .attr('stroke', this.selectedTrajColor)
          d3Select(`#pluck${this.selectedTrajID}`)
            .attr('fill', this.selectedArtColor)
            .attr('stroke', this.selectedArtColor)
          this.updateArtColors(this.selectedTraj, true)
          if (this.selectedChikariID) {
            this.clearSelectedChikari()
          }
          if (!(this.selectedPhraseDivIdx === undefined)) {
            this.clearSelectedPhraseDiv()
          }
          this.addAllDragDots();
          this.$refs.trajSelectPanel.showTrajChecks = true;
        }
      }   
    },

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
        this.$refs.trajSelectPanel.phraseDivType = undefined;
      }
    },

    updateArtColors(traj, selection) {
      // not plucks
      const color = selection ? this.selectedArtColor : 'black';
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

    clearSelectedTraj() {
      if (this.selectedTrajID) {
        d3Select(`#${this.selectedTrajID}`)
          .attr('stroke', this.trajColor)
        d3Select(`#overlay__${this.selectedTrajID}`)
          .style('cursor', 'pointer')
        d3Select(`#dampen${this.selectedTrajID}`)
          .attr('stroke', this.trajColor);
        d3Select(`#pluck${this.selectedTrajID}`)
          .attr('fill', this.trajColor)
          .attr('stroke', this.trajColor)
        this.updateArtColors(this.selectedTraj, false);
        this.selectedTrajID = undefined;
        this.selectedTraj = undefined;
        this.selectedTrajs = [];
        d3SelectAll('.dragDots').remove();
      }
      if (this.selectedTrajs.length >= 2) {
        this.selectedTrajs.forEach(traj => {
          const id = `p${traj.phraseIdx}t${traj.num}`;
          d3Select(`#${id}`)
            .attr('stroke', this.trajColor)
          d3Select(`#dampen${id}`)
            .attr('stroke', this.trajColor)
          d3Select('#overlay__' + id)
            .attr('cursor', 'pointer')
          d3Select(`#pluck${id}`)
            .attr('fill', this.trajColor)
            .attr('stroke', this.trajColor)
          this.updateArtColors(traj, false);
        })
        this.selectedTrajs = [];
        this.selectedTraj = undefined;
      }
      this.groupable = false
    },

    clearTrajSelectPanel() {
      const tsp = this.$refs.trajSelectPanel;
      tsp.parentSelected = false;
      tsp.selectedIdx = undefined;
      tsp.showVibObj = false;
      tsp.showSlope = false;
      tsp.showTrajChecks = false;
      tsp.showPhraseRadio = false;
      tsp.startConsonant = undefined;
      tsp.endConsonant = undefined;
      tsp.vowel = 'a';

    },

    redrawChikaris() {
      this.piece.phrases.forEach(phrase => {
        const x = d => this.xr()(d.x);
        const y = d => this.yr()(d.y);
        Object.keys(phrase.chikaris).forEach(key => {
          const id = this.idFromKey(key, phrase.pieceIdx);
          d3Select(`#${id}`)
            .transition()
            .duration(this.transitionTime)
            .attr('transform', d => `translate(${x(d)}, ${y(d)})`)
          d3Select(`#circle__${id}`)
            .transition()
            .duration(this.transitionTime)
            .attr('cx', d => x(d))
            .attr('cy', d => y(d))
        })
      })
    },
    
    moveChikaris(phrase) {
      Object.keys(phrase.chikaris).forEach(key => {
        const scaledX = Number(key) / phrase.durTot;
        const dataObj = {
          x: Number(key) + phrase.startTime,
          y: phrase.compute(scaledX, true)
        };
        const x = d => this.codifiedXR(d.x);
        const y = d => this.codifiedYR(d.y);
        const id = this.idFromKey(key, phrase.pieceIdx);
        d3Select(`#${id}`)
          .data([dataObj])
          .attr('transform', d => `translate(${x(d)}, ${y(d)})`)
        d3Select(`#circle__${id}`)
          .data([dataObj])
          .attr('cx', d => x(d))
          .attr('cy', d => y(d))
      })
    },

    redrawSlide(traj, phraseStart) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => {
        return traj.articulations[key].name === 'slide'
      });
      const data = relKeys.map((p, i) => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        const dirUp = y < traj.compute(p, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y,
          dirUp: dirUp,
          i: i
        }
      });
      const x = d => this.xr()(d.x);
      const y = d => this.yr()(d.y);
      data.forEach(obj => {
        d3Select(`#slidep${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .transition()
          .duration(this.transitionTime)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })
    },

    redrawDampener(traj, phraseStart) {
      const keys = Object.keys(traj.articulations);
      const dampenKeys = keys.filter(key => {
        return traj.articulations[key].name === 'dampen'
      });
      dampenKeys.forEach(() => {
        const x = d => this.xr()(d.x);
        const y = d => this.yr()(d.y);
        const obj = {
          x: phraseStart + traj.startTime + traj.durTot,
          y: traj.compute(1, true)
        };
        d3Select(`#dampenp${traj.phraseIdx}t${traj.num}`)
          .transition()
          .duration(this.transitionTime)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      });
    },

    codifiedRedrawDampener(traj, phraseStart) {
      const keys = Object.keys(traj.articulations);
      const dampenKeys = keys.filter(key => {
        return traj.articulations[key].name === 'dampen'
      });
      dampenKeys.forEach(() => {
        const x = d => this.codifiedXR(d.x);
        const y = d => this.codifiedYR(d.y);
        const obj = {
          x: phraseStart + traj.startTime + traj.durTot,
          y: traj.compute(1, true)
        };
        d3Select(`#dampenp${traj.phraseIdx}t${traj.num}`)
          .transition()
          .duration(this.transitionTime)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      });
    },

    codifiedRedrawSlide(traj, phraseStart) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => {
        return traj.articulations[key].name === 'slide'
      });
      const data = relKeys.map((p, i) => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        const dirUp = y < traj.compute(p, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y,
          dirUp: dirUp,
          i: i
        }
      });
      const x = d => this.codifiedXR(d.x);
      const y = d => this.codifiedYR(d.y);
      data.forEach(obj => {
        d3Select(`#slidep${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .transition().duration(this.transitionTime)
          .attr('transform', `translate(${x(obj)},${y(obj)})`)
      })
    },

    async updateTranslateExtent() {
      const rect = await this.$refs.graph.getBoundingClientRect();
      const scaledWidth = this.yAxWidth * this.tx().k;
      const scaledHeight = this.xAxHeight * this.ty().k;
      const xLim = (scaledWidth - this.yAxWidth) / this.tx().k;
      const yLim = (scaledHeight - this.xAxHeight) / this.ty().k;
      this.zoomX.translateExtent([
        [xLim, yLim],
        [rect.width, rect.height]
      ]);
      this.zoomY.translateExtent([
        [xLim, yLim],
        [rect.width, rect.height]
      ]);
    },

    sargamLine(y) {
      return d3Line()([
        [0, this.yr()(y)],
        [this.xr()(this.durTot), this.yr()(y)]
      ])
    },
    
    codifiedSargamLine(y) {
      return d3Line()([
        [this.codifiedXR(0), this.codifiedYR(y)],
        [this.codifiedXR(this.durTot), this.codifiedYR(y)]
      ])
    },

    addSargamLines(codified) {
      this.visibleSargam.forEach((s, i) => { // draws hoizontal sargam lines
        const fund = this.piece.raga.fundamental;
        const logOverFund = freq => Math.log2(freq / fund);
        const saFilter = freq => Math.abs(logOverFund(freq) % 1) === 0;
        const paFilter = freq => {
          return Math.abs((logOverFund(freq) - (7 / 12)) % 1) === 0
        };
        const strokeWidth = saFilter(s) || paFilter(s) ? 2 : 1;
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
      this.visibleSargam.forEach((s, i) => {
        d3Select('.sargamLine.s' + i)
          .attr('d', this.codifiedSargamLine(Math.log2(s)))
      });
      this.redraw();
    },

    playheadLine(codified) {
      if (codified) {
        return d3Line()([
          [0, this.codifiedYR(Math.log2(this.freqMin))],
          [0, this.codifiedYR(Math.log2(this.freqMax)) - this.xAxHeight]
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

    movePlayhead(transitionTime = undefined) {
      const time = transitionTime ? transitionTime : this.transitionTime;
      d3Select('.playhead').transition().duration(time)
        .attr('transform', `translate(${this.xr()(this.currentTime)})`)
    },

    moveShadowPlayhead() {
      const shadowTime = this.$refs.audioPlayer.getShadowTime();
      d3Select('.playheadShadow').transition().duration(this.transitionTime)
        .attr('transform', `translate(${this.xr()(shadowTime)})`)
    },

    async redraw(instant = false) {
      await this.updateTranslateExtent();
      this.gx
        .transition()
        .duration(instant ? 0 : this.transitionTime)
        .call(this.xAxis, this.xr());
      this.gy
        .transition()
        .duration(instant ? 0 : this.transitionTime)
        .call(this.yAxis, this.yr());

      if (this.init) {
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
            .transition()
            .duration(this.transitionTime)
            .attr('d', this.sargamLine(Math.log2(s)))
        });
        this.updatePhraseDivs();
        this.codifiedAddSargamLabels();
      } else {
        this.slidePhrases(
          this.xr()(this.codifiedXOffset),
          this.yr()(this.codifiedYOffset),
          this.tx().k / this.codifiedXScale,
          this.ty().k / this.codifiedYScale,
          this.transitionTime
        )
      }

      if (this.piece.audioID) await this.redrawSpectrogram(instant);
      this.movePlayhead();
      this.moveShadowPlayhead();
      this.moveRegion();
    },

    resetZoom() {
      // clear everything
      const selects = this.phraseG.selectAll('*');
      this.codifiedXScale = this.tx().k;
      this.codifiedYScale = this.ty().k;
      this.codifiedYOffset = this.yr().invert(0);
      this.codifiedXOffset = this.xr().invert(0);
      this.codifiedXR = this.xr();
      this.codifiedYR = this.yr();
      this.codifiedAddPhrases();
      this.phraseG.selectAll('.phraseDiv').remove();
      this.updatePhraseDivs();
      this.codifiedAddSargamLabels();
      selects.remove();
      this.slidePhrases(
        this.xr()(this.codifiedXOffset),
        this.yr()(this.codifiedYOffset),
        this.tx().k / this.codifiedXScale,
        this.ty().k / this.codifiedYScale,
        0
      );
      if (this.selectedTraj && this.selectedTrajID) {
        d3Select(`#${this.selectedTrajID}`)
          .attr('stroke', this.selectedTrajColor)
        d3Select(`#dampen${this.selectedTrajID}`)
          .attr('stroke', this.selectedTrajColor)
        d3Select(`#pluck${this.selectedTrajID}`)
          .attr('stroke', this.selectedArtColor)
          .attr('fill', this.selectedArtColor)
        this.updateArtColors(this.selectedTraj, true);
        this.addAllDragDots();
      }
      if (this.selectedTrajs.length > 1) {
        this.selectedTrajs.forEach((t, i) => {
          const id = `p${t.phraseIdx}t${t.num}`;
          d3Select(`#${id}`)
            .attr('stroke', this.selectedTrajColor)
          d3Select(`#dampen${id}`)
            .attr('stroke', this.selectedTrajColor)
          d3Select(`#pluck${id}`)
            .attr('stroke', this.selectedArtColor)
            .attr('fill', this.selectedArtColor)
          this.updateArtColors(t, true);
        })
      }
    },

    shiftTrajByOctave(traj, offset = 1) {
      // then remove the old trajectory and add the new one;
      traj.pitches.forEach(pitch => pitch.setOct(pitch.oct + offset));
      traj.realignPitches();
      const trajID = `p${traj.phraseIdx}t${traj.num}`;
      d3Select(`#${trajID}`).remove();
      d3Select(`#overlay__${trajID}`).remove();
      d3Select(`#articulations__${trajID}`).remove();
      const phrase = this.piece.phrases[traj.phraseIdx];
      const vowelIdxs = phrase.firstTrajIdxs();
      const startTime = this.piece.phraseStarts[traj.phraseIdx];
      this.codifiedAddTraj(traj, startTime, vowelIdxs);
      this.updateArtColors(traj, true);
      if (traj === this.selectedTraj) this.addAllDragDots();
      if (this.selectedTrajs.includes(traj)) {
        d3Select(`#${trajID}`)
          .attr('stroke', this.selectedTrajColor)
        d3Select(`#dampen${trajID}`)
          .attr('stroke', this.selectedTrajColor)
        d3Select(`#pluck${trajID}`)
          .attr('stroke', this.selectedArtColor)
          .attr('fill', this.selectedArtColor)
      }
    },

    codifiedAddTraj(traj, phraseStart, vowelIdxs) {
      const data = this.makeTrajData(traj, phraseStart);
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
        .style('cursor', 'pointer')
        .on('mouseover', this.handleMouseOver)
        .on('mouseout', this.handleMouseOut)
        .on('click', this.handleClickTraj)
      this.codifiedAddArticulations(traj, phraseStart, vowelIdxs)
    },
    
    codifiedAddPhrases() {
      this.addSargamLines(true);
      this.piece.phrases.forEach(phrase => {
        const vowelIdxs = phrase.firstTrajIdxs();
        phrase.trajectories.forEach(traj => {
          if (traj.id !== 12) {
            this.codifiedAddTraj(traj, phrase.startTime, vowelIdxs)
          }
        });
      })
      this.codifiedAddChikari();
    },

    xr() {
      return this.tx().rescaleX(this.x)
    },

    yr() {
      return this.ty().rescaleY(this.y)
    },

    phraseLine() {
      return d3Line()
        .x(d => this.xr()(d.x))
        .y(d => this.yr()(Math.log2(d.y)))
    },

    codifiedPhraseLine() {
      return d3Line()
        .x(d => this.codifiedXR(d.x))
        .y(d => this.codifiedYR(Math.log2(d.y)))
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
            this.redrawKrintin(traj, phrase.startTime);
            this.redrawSlide(traj, phrase.startTime);
            this.redrawDampener(traj, phrase.startTime);
            this.moveStartingConsonant(traj, phrase.startTime);
            this.moveEndingConsonant(traj, phrase.startTime);
            this.moveVowel(traj, phrase.startTime);
          }
        })
      });
      this.redrawChikaris();
    },

    movePlucks(traj) {
      const size = 20;
      const offset = (size ** 0.5 ) / 2;
      const arts = traj.articulations;
      const c1 = arts[0] && arts[0].name === 'pluck';
      const c2 = arts['0.00'] && arts['0.00'].name === 'pluck';
      if (c1 || c2) {
        const x = d => this.xr()(d.x);
        const y = d => this.yr()(d.y);
        d3Select(`#pluckp${traj.phraseIdx}t${traj.num}`)
          .transition()
          .duration(this.transitionTime)
          .attr('transform', d => {
            return `translate(${x(d) + offset}, ${y(d)}) rotate(90)`
          })
      }
    },

    addClipPaths() {
      this.defs = this.svg.append('defs');
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
      if (this.$refs.graph) {
        const rect = this.$refs.graph.getBoundingClientRect();
        return rect
      }
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

    center(e) {
      const rect = this.rect();
      if (e.sourceEvent) {
        const p = d3Pointers(e, this.svg.node());
        return [d3Mean(p, d => d[0]), d3Mean(p, d => d[1])];
      }
      return [rect.width / 2, rect.height / 2]
    },

    enactZoom(e) {
      const t = e.transform;
      const k = t.k / this.z.k;
      const point = this.center(e);
      const doX = point[0] > this.x.range()[0];
      const doY = point[1] > this.y.range()[0];
      if (doX && doY) {
        if (e.sourceEvent) {
          let deltaX = 0.5 * e.sourceEvent.wheelDeltaX / this.tx().k;
          let deltaY = 0.5 * e.sourceEvent.wheelDeltaY / this.ty().k;
          this.gx.call(this.zoomX.translateBy, deltaX, 0);
          this.gy.call(this.zoomY.translateBy, 0, deltaY);
        } else {
          // just for in initial this.zoomX setting
          const x = (this.yAxWidth * k - this.yAxWidth) / k;
          this.zoomX.scaleBy(this.gx, k, point);    
          this.gx.call(this.zoomX.translateTo, x, 0, [0, 0]);
          this.gy.call(this.zoomY.scaleBy, this.initYScale, point);
          this.gy.call(this.zoomY.translateTo, 0, this.rect().height, [0, 0])
        }
      } else {
        // if not, we're zooming on a fixed point
        doX && this.gx.call(this.zoomX.scaleBy, k, point);
        doY && this.gy.call(this.zoomY.scaleBy, k, point);
      }
      this.z = t;
      this.redraw();
      this.transformScrollYDragger();
      this.transformScrollXDragger();
      this.leftTime = this.xr().invert(this.yAxWidth);
    },

    verticalZoomIn() {
      const pt = [this.yAxWidth, this.rect().height / 2]
      this.gy.call(this.zoomY.scaleBy, 1.1, pt);
      this.redraw();
      this.transformScrollYDragger();
    },

    verticalZoomOut() {
      const pt = [this.yAxWidth, this.rect().height / 2];
      this.gy.call(this.zoomY.scaleBy, 1/1.1, pt);
      this.redraw();
      this.transformScrollYDragger();
    },

    horizontalZoomIn() {
      const pt = [this.rect().width / 2, this.xAxHeight];
      this.gx.call(this.zoomX.scaleBy, 1.1, pt);
      this.redraw();
      this.transformScrollXDragger();
    },

    horizontalZoomOut() {
      const pt = [this.rect().width / 2, this.xAxHeight];
      this.gx.call(this.zoomX.scaleBy, 1/1.1, pt);
      this.redraw();
      this.transformScrollXDragger();
    },

    getYTickLabels() {
      const yTickLabels = this.visPitches.map(p => p.octavedSargamLetter)
      return yTickLabels
    },

    startAnimationFrame() {
      if (!this.requestId) {
        this.requestId = window.requestAnimationFrame(this.loopAnimationFrame)
      }
    },

    loopAnimationFrame() {
      this.requestId = undefined;
      const latency = this.$refs.audioPlayer.ac.outputLatency;
      this.currentTime = this.$refs.audioPlayer.getCurrentTime() - latency;
      if (this.currentTime < this.animationStart) {
        this.currentTime = this.animationStart;
      }
      const currentStartTime = this.xr().invert(30);
      const currentEndTime = currentStartTime + this.durTot / this.tx().k;
      if (this.currentTime > currentEndTime) {
        const delta = (this.rect().width - this.yAxWidth) * 0.8 / this.tx().k;
        this.gx.call(this.zoomX.translateBy, -delta, 0);
        this.redraw()
      }
      this.movePlayhead();
      this.startAnimationFrame();
    },

    stopAnimationFrame() {
      if (this.requestId) {
        window.cancelAnimationFrame(this.requestId);
        this.requestId = undefined;
        this.currentTime = this.$refs.audioPlayer.getCurrentTime();
        const latency = this.$refs.audioPlayer.ac.outputLatency;
        this.movePlayhead(latency * 2.0 * 1000);
      }
    },

    startStretchedAnimationFrame() {
      if (!this.requestId) {
        const frame = this.loopStretchedAnimationFrame;
        this.requestId = window.requestAnimationFrame(frame)
      }
    },

    loopStretchedAnimationFrame() {
      this.requestId = undefined;
      const ap = this.$refs.audioPlayer;
      const latency = ap.ac.outputLatency;
      this.currentTime = ap.getStretchedCurrentTime() - latency;
      if (!ap.loop && this.currentTime < this.stretchedAnimationStart) {
        this.currentTime = this.stretchedAnimationStart;
      }
      this.movePlayhead();
      this.startStretchedAnimationFrame();
    },

    stopStretchedAnimationFrame() {
      if (this.requestId) {
        window.cancelAnimationFrame(this.requestId);
        this.requestId = undefined;
        this.currentTime = this.$refs.audioPlayer.getStretchedCurrentTime();
        const latency = this.$refs.audioPlayer.ac.outputLatency;
        this.movePlayhead(latency * 2.0 * 1000);
      }
    },

    deleteTraj(trajID) {
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
        const ntObj = {
          id: 12,
          durTot: traj.durTot,
          fundID12: this.piece.raga.fundamental
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
        phrase.trajectories.filter(traj => traj.num > tIdx).forEach(traj => {
          const oldId = `p${pIdx}t${traj.num}`;
          const newId = `p${pIdx}t${delAfter ? traj.num - 2 : traj.num-1}`;
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
          this.piece.phrases[pIdx].trajectories = newTrajs;
        }  
      }
      this.piece.phrases[pIdx].durArrayFromTrajectories();
      this.piece.phrases[pIdx].assignStartTimes();
      this.piece.phrases[pIdx].assignTrajNums();
      this.piece.durArrayFromPhrases();
      this.piece.updateStartTimes();
      this.codifiedRedrawPhrase(pIdx);
      this.resetSargam();
    },
    
    fixFollowingTrajs(phrase, tIdx) {
      const pIdx = phrase.pieceIdx;
      phrase.trajectories.filter(traj => traj.num > tIdx).forEach(traj => {
        const oldId = `p${pIdx}t${traj.num}`;
        const newId = `p${pIdx}t${traj.num-1}`;
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

    codifiedRedrawPhrase(pIdx) {
      const phrase = this.piece.phrases[pIdx]
      phrase.trajectories.forEach((traj, tIdx) => {
        if (traj.id !== 12) {
          const data = this.makeTrajData(traj, phrase.startTime);
          d3Select(`#p${pIdx}t${tIdx}`)
            .datum(data)
            .attr('d', this.codifiedPhraseLine())
          d3Select(`#overlay__${pIdx}t${tIdx}`)
            .datum(data)
            .attr('d', this.codifiedPhraseLine())
        }
        this.codifiedRedrawPlucks(traj, phrase.startTime)
        this.codifiedRedrawKrintin(traj, phrase.startTime)
        this.codifiedRedrawSlide(traj, phrase.startTime)
        this.codifiedRedrawDampener(traj, phrase.startTime)
        this.moveStartingConsonant(traj, phrase.startTime, true)
        this.moveEndingConsonant(traj, phrase.startTime, true);
        this.moveVowel(traj, phrase.startTime, true);
      })
    },

    redrawPlucks(traj, phraseStart) {
      console.log('redraw happens')
      if (traj.id !== 12) {
        const keys = Object.keys(traj.articulations);
        const relKeys = keys.filter(key => {
          return traj.articulations[key].name === 'pluck'
        });
        const pluckData = relKeys.map(p => {
          const normedX = Number(p) * traj.durTot;
          const y = traj.compute(normedX, true);
          return {
            x: phraseStart + traj.startTime + Number(p),
            y: y
          }
        });
        const x = d => this.xr()(d.x);
        const y = d => this.yr()(d.y); 
        d3Select(`#pluckp${traj.phraseIdx}t${traj.num}`)
          .data(pluckData)
          .attr('transform', d => `translate(${x(y)}, ${d(y)}) rotate(90)`)
      }
    },

    codifiedRedrawPlucks(traj, phraseStart) {
      if (traj.id !== 12) {
        const keys = Object.keys(traj.articulations);
        const relKeys = keys.filter(key => {
          return traj.articulations[key].name === 'pluck'
        });
        const pluckData = relKeys.map(p => {
          const normedX = Number(p) * traj.durTot;
          const y = traj.compute(normedX, true);
          return {
            x: phraseStart + traj.startTime + Number(p),
            y: y
          }
        });
        const x = d => this.codifiedXR(d.x);
        const y = d => this.codifiedYR(d.y);
        d3Select(`#pluckp${traj.phraseIdx}t${traj.num}`)
          .data(pluckData)
          .attr('transform', d => `translate(${x(d)}, ${y(d)}) rotate(90)`)
      }
    },

    redrawKrintin(traj, phraseStart) {
      const keys = Object.keys(traj.articulations);
      const hammerOffKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-off'
      });
      const hammerOffData = hammerOffKeys.map((p, i) => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y,
          i: i
        }
      });
      const x = d => this.xr()(d.x);
      const y = d => this.yr()(d.y); 
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
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
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

    codifiedRedrawKrintin(traj, phraseStart) {
      const keys = Object.keys(traj.articulations);
      const hammerOffKeys = keys.filter(key => {
        return traj.articulations[key].name === 'hammer-off'
      });
      const hammerOffData = hammerOffKeys.map((p, i) => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y,
          i: i
        }
      });
      const x = d => this.codifiedXR(d.x);
      const y = d => this.codifiedYR(d.y);
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
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
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

    addDampener(traj, phraseStart, g) {
      const keys = Object.keys(traj.articulations);
      const dampenKeys = keys.filter(key => {
        return traj.articulations[key].name === 'dampen'
      });
      dampenKeys.forEach(() => {
        const x = d => {
          const out = this.xr()(d.x);
          return out
        }
        const y = d => this.yr()(d.y)
        const obj = {
          x: phraseStart + traj.startTime + traj.durTot,
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
          .attr('transform', d => `translate(${x(d)},${y(d)})`)
      })
    },

    codifiedAddDampener(traj, phraseStart, g) {
      const keys = Object.keys(traj.articulations);
      const dampenKeys = keys.filter(key => {
        return traj.articulations[key].name === 'dampen'
      });
      dampenKeys.forEach(() => {
        const x = this.codifiedXR(phraseStart + traj.startTime + traj.durTot)
        const y = this.codifiedYR(traj.compute(1, true))
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
}
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

</style>
