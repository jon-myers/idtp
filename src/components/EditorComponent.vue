<template>
<div class='mainzz'>
  <div class='upperRow'>
    <div class='graph' ref='graph'></div>
    <div class='controlBox'>
      <div class='scrollingControlBox'>
        <div class='cbBox'>
          <label>Spectrogram Opacity</label>
          <input 
            type='range' 
            min='0.0' 
            max='1.0' 
            step='0.01' 
            v-model='spectrogramOpacity'
            >
        </div>
        <div class='cbBox' v-if='editable'>
          <div class='buttonRow'>
            <button @click='savePiece'>Save</button>
            <button @click='resetZoom'>Reset Zoom</button>
          </div>  
          <span class='savedDate'>
            {{`Saved: ${dateModified ? dateModified.toLocaleString() : ''}`}}
          </span>
        </div>
        <div class='cbRow' v-if='editable'>
          <button @click='makeSpectrograms'>Remake Spectrogram</button>
        </div>
        <div class='cbRow'>
          <label>View Phrases: </label>
          <input 
            type='checkbox' 
            v-model='viewPhrases' 
            @change='updatePhraseDivs'>
        </div>
        <div class='cbRow'>
          <label>Loop: </label>
          <input type='checkbox' v-model='loop' @click='updateLoop'>
        </div>
        <div class='cbRow'>
          <label>Show Sargam: </label>
          <input type='checkbox' v-model='showSargam'>
        </div>
        
      </div>
      <!-- <div class='filler'>
      </div> -->
      <AltTrajSelectPanel ref='trajSelectPanel' :editable='editable'/>
    </div>
  </div>
</div>
<EditorAudioPlayer 
  ref='audioPlayer' 
  :audioSource='audioSource' 
  :recGain='recGain'
  :synthGain='synthGain'
  :synthDamping='synthDamping'
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
  Chikari
} from '@/js/classes.js';
import {
  getPiece,
  getRaagRule,
  getAudioRecording,
  getNumberOfSpectrograms,
  savePiece,
  makeSpectrograms,
  pieceExists
} from '@/js/serverCalls.js';
import EditorAudioPlayer from '@/components/EditorAudioPlayer.vue';
import AltTrajSelectPanel from '@/components/AltTrajSelectPanel.vue';

// import * as d3 from 'd3';

import { detect } from 'detect-browser';

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
      piece: undefined,
      durTot: 600,
      freqMin: 100,
      freqMax: 800,
      backColor: 'aliceblue',
      axisColor: '#c4b18b',
      yAxWidth: 30,
      xAxHeight: 30,
      minDrawDur: 0.005, //this could be smaller, potentially
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
      trajColor: 'midnightblue',
      selectedTraj: undefined,
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
      rangeOffset: 0.1
    }
  },
  components: {
    EditorAudioPlayer,
    AltTrajSelectPanel
  },
  created() {
    window.addEventListener('keydown', this.handleKeydown);
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
      const logSargamLines = this.visibleSargam.map(s => Math.log2(s));
      const pitches = this.trajTimePts.map(ttp => {
        return this.visiblePitches[logSargamLines.indexOf(ttp.logFreq)]
      });
      const ttp = this.trajTimePts;
      const durTot = ttp[ttp.length - 1].time - ttp[0].time;
      const times = this.trajTimePts.map(ttp => ttp.time);
      const durArray = times.slice(1).map((x, i) => (x - times[i]) / durTot);
      let articulations;
      if (this.$refs.trajSelectPanel.pluckBool === false) articulations = {};
      const newTraj = new Trajectory({
        id: idx,
        pitches: pitches,
        durTot: durTot,
        durArray: durArray,
        articulations: articulations
      });
      const pIdx = this.trajTimePts[0].pIdx;
      const tIdx = this.trajTimePts[0].tIdx;
      const phrase = this.piece.phrases[pIdx];
      const silentTraj = phrase.trajectories[tIdx];
      const st = phrase.startTime + silentTraj.startTime
      const startsEqual = times[0] === st;
      const endsEqual = times[times.length - 1] === st + silentTraj.durTot;
      if (startsEqual && endsEqual) { // if replaces entire silent traj
        phrase.trajectories[tIdx] = newTraj;
        phrase.reset();
      } else if (startsEqual) { // if replaces left side of silent traj
        silentTraj.durTot = silentTraj.durTot - durTot;
        phrase.trajectories.splice(tIdx, 0, newTraj);
        phrase.reset();phrase.reset();
      } else if (endsEqual) { // if replaces right side of silent traj
        silentTraj.durTot = durTot - silentTraj.durTot;
        phrase.trajectories.splice(tIdx + 1, 0, newTraj);
        phrase.reset();
      } else { // if replaces internal portion of silent traj
        const firstDur = times[0] - st;
        const lastDur = (st + silentTraj.durTot) - times[times.length - 1];
        silentTraj.durTot = firstDur;
        const lastSilentTraj = new Trajectory({
          id: 12,
          pitches: [],
          durTot: lastDur,
          fundID12: this.piece.raga.fundamental
        });
        phrase.trajectories.splice(tIdx + 1, 0, newTraj);
        phrase.trajectories.splice(tIdx + 2, 0, lastSilentTraj);
        phrase.reset();
      }
      //
      this.codifiedAddTraj(newTraj, phrase.startTime);
      this.selectedTraj = newTraj;
      this.selectedTrajID = `p${newTraj.phraseIdx}t${newTraj.num}`;
      d3Select(`#${this.selectedTrajID}`)
        .attr('stroke', this.selectedTrajColor)
      d3Select(`#overlay__${this.selectedTrajID}`)
        .style('cursor', 'auto')
      this.setNewTraj = false;
      this.trajTimePts = [];
      this.svg.style('cursor', 'auto');
      d3SelectAll(`.newTrajDot`).remove();
      this.addAllDragDots();
      this.$refs.trajSelectPanel.selectedIdx = this.selectedTraj.id;
      this.$refs.trajSelectPanel.parentSelected = true;
      this.$refs.trajSelectPanel.slope = Math.log2(this.selectedTraj.slope);
      const c1 = this.selectedTraj.articulations[0];
      if (c1 && this.selectedTraj.articulations[0].name === 'pluck') {
        this.$refs.trajSelectPanel.pluckBool = true
      } else {
        this.$refs.trajSelectPanel.pluckBool = false
      }
    });

    this.emitter.on('pluckBool', pluckBool => {
      if (pluckBool) {
        if (!this.selectedTraj.articulations[0]) {
          this.selectedTraj.articulations[0] = new Articulation();
          const pIdx = this.selectedTraj.phraseIdx;
          const tIdx = this.selectedTraj.num;
          const phrase = this.piece.phrases[pIdx];
          const g = d3Select(`#articulations__p${pIdx}t${tIdx}`)
          this.codifiedAddPlucks(this.selectedTraj, phrase.startTime, g)
        }
      } else {
        if (this.selectedTraj.articulations[0]) {
          delete this.selectedTraj.articulations[0];
          this.removePlucks(this.selectedTraj)
        }
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
      
      if (piece.audioID) {
        const browser = detect();
        this.audioSource = browser.name === 'safari' ?
          `https://swara.studio/audio/mp3/${piece.audioID}.mp3` :
          `https://swara.studio/audio/opus/${piece.audioID}.opus`;         
        this.audioDBDoc = await getAudioRecording(piece.audioID);
        
        this.durTot = this.audioDBDoc.duration;
        // if pieceDurTot is less than this, add slient phrase to make the two 
        // the same
      } else {
        this.durTot = piece.durTot;
      }
      this.initXScale = this.durTot / this.initViewDur;
      let fund = 246;
      if (this.audioDBDoc && this.audioDBDoc.saEstimate) fund = 2 * this.audioDBDoc.saEstimate;
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
      await this.initializePiece();
      this.$refs.audioPlayer.parentLoaded();
      // GETBACK
      this.$refs.audioPlayer.initializePluckNode();
      this.$refs.audioPlayer.initializeChikariNodes();
      this.$refs.audioPlayer.preSetFirstEnvelope(256);
      // end GETBACK
      const silentDur = this.durTot - piece.durTot;
      if (silentDur !== 0) {
        const silentTraj = new Trajectory({
          id: 12,
          pitches: [],
          durTot: silentDur,
          fundID12: this.piece.raga.fundamental
        });
        const silentPhrase = new Phrase({
          trajectories: [silentTraj],
          durTot: silentDur,
        });
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
    this.emitter.off('pluckBool');
    this.emitter.off('mutateTraj');
    this.emitter.off('newTraj');
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
    }

  },

  methods: {

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
            const logFreq = t.logFreqs[i];
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
          pos = 0; // top
        } else if (!lastHigher && !nextHigher) {
          pos = 1; // bottom
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
        const positions = [
          { x: 0, y: 12 },
          { x: 0, y: -12 },
          { x: -5, y: -12 },
          { x: -5, y: 12 },
          { x: 5, y: -12 },
          { x: 5, y: 12}
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

    addSargamLabels() { // this 
      console.log('add sargam labels')
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
            const logFreq = t.logFreqs[i];
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
      allPitches.forEach((p, pIdx) => {
        const lastP = allPitches[pIdx - 1];
        const nextP = allPitches[pIdx + 1];
        const lastHigher = lastP ? lastP.logFreq > p.logFreq : true;
        const nextHigher = nextP ? nextP.logFreq > p.logFreq: true;
        let pos;
        if (lastHigher && nextHigher) {
          pos = 0; // top
        } else if (!lastHigher && !nextHigher) {
          pos = 1; // bottom
        } else if (lastHigher && !nextHigher) {
          pos = 3; // bottom left
        } else if (!lastHigher && nextHigher) {
          pos = 2; // top left
        }
        const positions = [
          { x: 0, y: 12 },
          { x: 0, y: -12 },
          { x: -5, y: -12 },
          { x: -5, y: 12 }
        ]
        const x = this.xr()(p.time);
        const y = this.yr()(p.logFreq);
        console.log(p.time, x, p.logFreq, y)
        

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
    
    async makeSpectrograms() {
      // use call from serverCalls.js to create new spectrograms on the server.
      const recId = this.piece.audioID;
      const saEst = this.audioDBDoc.saEstimate;
      const result = await makeSpectrograms(recId, saEst);
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
            nextTraj.durArray = this.newDurArrayA(nextTraj, delta)
          }
          nextTraj.durTot -= delta;
          nextTraj.startTime += delta;
          phrase.durArrayFromTrajectories();
          if (traj.durArray.length > 1) {
            const tda = traj.durArray;
            const initPortionZ = tda[tda.length - 1] * traj.durTot;
            const newDurTot = traj.durTot + delta;
            const newPropZ = (initPortionZ + delta) / newDurTot;
            let newDurArray = tda.map(i => i * traj.durTot / newDurTot);
            newDurArray[newDurArray.length - 1] = newPropZ;
            traj.durArray = newDurArray;
          }
          traj.durTot += delta;
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
          }
        }
      }
      const data = this.makeTrajData(traj, phrase.startTime)
      d3Select(`#transparentPhrase`)
        .datum(data)
        .attr('d', this.codifiedPhraseLine())
    },
    
    dragDotEnd(e) {
      const idx = Number(this.dragIdx);
      const time = this.constrainTime(e, idx);
      const x = this.codifiedXR(time);


      const traj = this.selectedTraj;
      const phrase = this.piece.phrases[traj.phraseIdx];
      const pIdx = traj.phraseIdx;
      const tIdx = traj.num;
      let logFreq = this.codifiedYR.invert(e.y);
      const logSargamLines = this.visibleSargam.map(s => Math.log2(s));
      logFreq = getClosest(logSargamLines, logFreq)
      const y = this.codifiedYR(logFreq)
      d3Select(`#dragDot${idx}`)
        .attr('cx', x)
        .attr('cy', y)
      const newPitch = this.visiblePitches[logSargamLines.indexOf(logFreq)]

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
          }
          phrase.durArrayFromTrajectories();
        } else {
          if (this.piece.phrases[pIdx + 1]) {
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
          this.removePlucks(newNextTraj);
          const g = d3Select(`#articulations__p${pIdx}t${tIdx+1}`);
          this.codifiedAddPlucks(newNextTraj, phrase.startTime, g)
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
      this.moveKrintin(this.selectedTraj, phrase.startTime);
      this.moveSlides(this.selectedTraj, phrase.startTime);
      this.cleanEmptyTrajs(phrase);
      this.moveChikaris(phrase)
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
      const trajObj = traj.toJSON();
      const c1 = traj.articulations[0];
      const pluckExists = c1 && traj.articulations[0].name === 'pluck';
      delete trajObj.articulations;
      const newTraj = new Trajectory(trajObj);
      if (!pluckExists) delete newTraj.articulations[0];
      return newTraj
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
              return a * nextTraj.durTot + phrase.startTime + nextTraj.startTime
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
        console.log('clicking')
      }
      this.phraseG
        .append('path')
        .attr('id', `phraseLine${idx}`)
        .attr('stroke', 'black')
        .attr('stroke-width', '2px')
        .attr('d', this.playheadLine())
        .style('opacity', this.viewPhrases ? '1' : '0')
        .attr('transform', `translate(${this.codifiedXR(time)},0)`);
      this.phraseG
        .append('path')
        .attr('id', `overlay__phraseLine${idx}`)
        .attr('stroke', 'black')
        .attr('stroke-width', '10px')
        .attr('d', this.playheadLine())
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
      })
      
      // reId all chikaris
      
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
            this.phraseG
              .append('path')
              .classed('phraseDiv', true)
              .attr('id', `phraseLine${i}`)
              .attr('stroke', 'black')
              .attr('stroke-width', '2px')
              .attr('d', this.playheadLine())
              .style('opacity', '1')
              .attr('transform', `translate(${this.codifiedXR(endTime)},0)`)
            this.phraseG
              .append('path')
              .classed('phraseDiv', true)
              .attr('id', `overlay__phraseLine${i}`)
              .attr('stroke', 'black')
              .attr('stroke-width', '10px')
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
               const newNextTraj = new Trajectory({ 
                 id: 12, 
                 durTot: origDivTime - time,
                 fundID12: this.piece.raga.fundamental
               });
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
               const newPrevTraj = new Trajectory({
                 id: 12,
                 durTot: time - origDivTime,
                 fundID12: this.piece.raga.fundamental
               });
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
                delete phraseB.chikaris;
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
        this.clearSelectedTraj();
        this.clearSelectedChikari();        
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
    
    reIdAllReps(oldId, newId) {
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
    },

    updateLoop(e) {
      if (e && e.clientX === 0) e.preventDefault(); // stops spacebar from 
      // checking box
    },

    async savePiece() {
      const result = await savePiece(this.piece);
      this.dateModified = new Date(result.dateModified);
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
      if (this.regionG && regionToo === undefined) {
        this.regionG.remove();
        this.regionG = undefined;
        this.regionStartTime = 0;
        this.regionEndTime = this.durTot;
        this.mouseUpUpdateLoop();
        
      }
    },

    handleKeydown(e) {
      if (e.key === ' ') {
        this.$refs.audioPlayer.togglePlay()
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.clearAll()
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
        }

      } else if (e.key === 'c' && this.editable) {
        this.setChikari = true;
        this.svg.style('cursor', 'cell')
        if (this.setNewTraj) this.setNewTraj = false;
        if (this.setNewPhraseDiv) this.setNewPhraseDiv = false;
      } else if (e.key === 't' && this.setNewTraj === false && this.editable) {
        this.clearSelectedTraj();
        this.clearTrajSelectPanel();
        this.setNewTraj = true;
        this.svg.style('cursor', 'crosshair');
        this.trajTimePts = [];
        if (this.setChikari) this.setChikari = false;
        if (this.setNewPhraseDiv) this.setNewPhraseDiv = false;
      } else if (e.key === 'p' && this.setNewPhraseDiv === false && this.editable) {
        this.clearSelectedTraj();
        this.clearTrajSelectPanel();
        this.clearSelectedPhraseDiv();
        if (this.setChikari) this.setChikari = false;
        if (this.setNewTraj) this.setNewTraj = false;
        this.setNewPhraseDiv = true;
        this.svg.style('cursor', 's-resize');
      }
    },

    shrink() {
      const x = this.yAxWidth;
      const y = this.xAxHeight;
      d3Select('.spectrogram')
        .attr('transform', `translate(${x},${y}) scale(0.5, 1)`)
    },

    async addSpectrogram() {
      try {
        this.numSpecs = await getNumberOfSpectrograms(this.piece.audioID);
      } catch (err) {
        console.error(err)
      }
      
      const rect = this.rect();
      const height = rect.height - this.xAxHeight;
      this.imgs = [];
      for (let i = 0; i < this.numSpecs; i++) {
        const dir = 'https://swara.studio/spectrograms/';
        const url = dir + this.piece.audioID + '/0/' + i + '.webp';
        const img = new Image();
        img.src = url;
        this.imgs.push(img)
      }
      this.loadedImgs = 0;
      this.imgs.forEach(img => {
        img.onload = () => {
          this.loadedImgs++;
          if (this.loadedImgs === this.numSpecs) {
            this.totNaturalWidth = 0;
            const unscaledWidths = []
            if (this.imgs.every(img => img.complete)) {
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
                  .style('opacity', this.spectrogramOpacity)
              });
            } else {
              console.log('not all loaded')
            }
          }
        }
      })
    },

    redrawSpectrogram() {
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
            .duration(this.transitionTime)
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
        phrase.trajectories.forEach(traj => {
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
        });
        phrase.trajectories = phrase.trajectories.map(traj => {
          return new Trajectory(traj)
        });
        const chikariKeys = Object.keys(phrase.chikaris);
        const chikariEntries = chikariKeys.map(key => phrase.chikaris[key]);
        const chikariObj = {};
        chikariKeys.forEach((key, i) => {
          chikariObj[key] = new Chikari(chikariEntries[i])
        })
        phrase.chikaris = chikariObj
      });
      piece.phrases = piece.phrases.map(phrase => new Phrase(phrase));
      this.piece = new Piece(piece);
      this.dateModified = new Date(this.piece.dateModified);
      this.fixTrajs();
    },

    fixTrajs() {
      // why are they getting named articulation slide
      this.piece.phrases.forEach(phrase => {
        phrase.trajectories.forEach((traj) => {
          if (traj.articulations[0] && traj.articulations[0].name === 'slide') {
            traj.articulations[0].name = 'pluck'
          }
        })
      })
    },

    resize() {
      const rect = this.rect();
      this.svg
        .attr('viewBox', [0, 0, rect.width, rect.height - 1])

      this.x.range([this.yAxWidth, rect.width])
      this.y.range([this.xAxHeight, rect.height])
      this.updateBackgroundColors();
      this.updateClipPaths();
      this.redraw();
      this.resetZoom();
    },

    phraseIdxFromTime(time) {
      const filtered = this.piece.phrases.filter(phrase => {
        const a = time >= phrase.startTime;
        const b = time < phrase.startTime + phrase.durTot;
        return a && b
      });
      return filtered[0].pieceIdx
      // return this.piece.phrases.filter(phrase => {
      //   const a = time >= phrase.startTime;
      //   const b = time < phrase.startTime + phrase.durTot;
      //   return a && b
      // })[0].pieceIdx
    },

    handleMousedown(e) {
      if (e.offsetY < this.xAxHeight) {
        this.drawingRegion = true;
        this.regionStartTime = this.xr().invert(e.offsetX);
        this.regionStartPx = e.offsetX;
      }
    },

    handleMouseup(e) {
      const rect = this.rect();
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
        const regionLine = d3Line()([
          [0, 0],
          [0, rect.height]
        ])

        if (!this.regionG) {
          this.regionG = this.svg
            .append('g')
            .classed('regionG', true)
            .attr('clip-path', 'url(#playheadClip)')

          this.regionG
            .append('rect')
            .classed('region', true)
            .style('pointer-events', 'none')
            .attr('width', this.regionEndPx - this.regionStartPx)
            .attr('height', rect.height)
            .attr('fill', 'white')
            .attr('opacity', '0.4')
            .attr('transform', `translate(${this.regionStartPx},0)`)

          this.regionG
            .append('path')
            .classed('regionStart', true)
            .attr('d', regionLine)
            .attr('stroke', 'grey')
            .attr('opacity', '0.6')
            .attr('stroke-width', 1)
            .attr('transform', `translate(${this.regionStartPx},0)`)

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

    async initializePiece() {
      this.visibleSargam = this.piece.raga.getFrequencies({
        low: this.freqMin,
        high: this.freqMax
      })
      this.visiblePitches = this.piece.raga.getPitches({
        low: this.freqMin,
        high: this.freqMax
      })
      const rect = await this.rect();
      this.svg = await d3Create('svg')
        .classed('noSelect', true)
        .attr('viewBox', [0, 0, rect.width, rect.height - 1])
        .on('click', this.handleClick)
        .on('mousedown', this.handleMousedown)
        .on('mouseup', this.handleMouseup)
      this.paintBackgroundColors();
      if (this.piece.audioID) {
        try {
          await this.addSpectrogram();
        } catch (err) {
          console.error(err)
        }
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
      this.zoomY = d3Zoom().scaleExtent([1, 5]).translateExtent([
        [0, 0],
        [rect.width, rect.height]
      ]);
      this.tx = () => d3ZoomTransform(this.gx.node());
      this.ty = () => d3ZoomTransform(this.gy.node());
      this.gx.call(this.zoomX).attr('pointer-events', 'none');
      this.gy.call(this.zoomY).attr('pointer-events', 'none');
      this.zoom = d3Zoom()
        .filter(z_ => {
          if (z_.type === 'dblclick') this.handleDblClick(z_);
          return z_.type !== 'mousedown' && z_.type !== 'dblclick' ? z_ : null
        })
        .on('zoom', this.enactZoom);
      this.makeAxes();
      this.addPhrases();

      this.updateTranslateExtent().then(() => {
        this.svgNode = this.svg
          .call(this.zoom)
          .call(this.zoom.transform, d3ZoomIdentity.scale(this.initXScale))
          .node();
        this.$refs.graph.appendChild(this.svgNode)
      });

    },
    
    handleDblClick(z) {
      const graphX = z.clientX - this.yAxWidth;
      const time = this.xr().invert(z.clientX);
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
        this.redrawPlayhead()
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
      const time = this.xr().invert(e.clientX);
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
        const logSargamLines = this.visibleSargam.map(s => Math.log2(s));
        const navHeight = this.$parent.$parent.navHeight;
        let logFreq = this.yr().invert(e.clientY - navHeight);
        logFreq = getClosest(logSargamLines, logFreq);
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
      } else if (this.setNewPhraseDiv) {
        const possibleTimes = this.possibleTrajDivs();
        const finalTime = getClosest(possibleTimes, time);
        const ftIdx = possibleTimes.indexOf(finalTime);
        const ptPerP = this.piece.phrases.map(p => p.trajectories.length - 1);
        const lims = [0, ...ptPerP.map(cumsum()).slice(0, ptPerP.length-1)];
        const pIdx = lims.findLastIndex(lim => ftIdx >= lim);
        const start = lims[pIdx];
        const trajIdx = ftIdx - start;
        const phrase = this.piece.phrases[pIdx];
        const end = phrase.trajectories.length - (trajIdx + 1);
        const newTrajs = phrase.trajectories.splice(trajIdx+1, end);
        phrase.durTotFromTrajectories();
        phrase.durArrayFromTrajectories();
        const newPhrase = new Phrase({
          trajectories: newTrajs,
          raga: phrase.raga
        })
        this.piece.phrases.splice(phrase.pieceIdx+1, 0, newPhrase);
        this.piece.durTotFromPhrases();
        this.piece.durArrayFromPhrases();
        this.piece.updateStartTimes();
        //move over names of old phrase divs, from the back forward
        for (let i=this.piece.phrases.length-2; i >= phrase.pieceIdx; i--) {
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
        this.addNewPhraseDiv(phrase.pieceIdx);
        this.setNewPhraseDiv = false;
        this.svg.style('cursor', 'auto');        
      } else {
        if (this.justEnded) {
          this.justEnded = false // this just prevents phrase div drag end from 
          // clearing all
        } else {
          this.clearAll(false)
        }
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
            const fltr = t => t >= st && t < end;
            const mp = t => (t - st) / traj.durTot;
            const trajDrawTimes = drawTimes.filter(fltr);
            const trajDrawXs = trajDrawTimes.map(mp);
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
          this.addArticulations(traj, phrase.startTime)
        })
      });
      this.addChikaris();
      this.addPlayhead();
      // this.addSargamLabels();
    },

    addArticulations(traj, phraseStart) {
      const g = this.phraseG.append('g')
        .attr('id', `articulations__p${traj.phraseIdx}t${traj.num}`)
      this.addPlucks(traj, phraseStart, g)
      this.addKrintin(traj, phraseStart, g)
      this.addSlide(traj, phraseStart, g)
    },

    codifiedAddArticulations(traj, phraseStart) {
      const g = this.phraseG.append('g')
        .attr('id', `articulations__p${traj.phraseIdx}t${traj.num}`)
      this.codifiedAddPlucks(traj, phraseStart, g);
      this.codifiedAddKrintin(traj, phraseStart, g);
      this.codifiedAddSlide(traj, phraseStart, g);

    },

    removePlucks(traj) {
      const pIdx = traj.phraseIdx;
      const tIdx = traj.num;
      d3Select(`#pluckp${pIdx}t${tIdx}`).remove()
    },

    addPlucks(traj, phraseStart, g) {
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
        const sym = d3Symbol().type(d3SymbolTriangle).size(20);
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
          .data(pluckData)
          .attr('transform', d => `translate(${x(d)}, ${y(d)}) rotate(90)`)
      }
    },

    codifiedAddTraj(traj, phraseStart) {
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
      this.codifiedAddArticulations(traj, phraseStart)
    },

    codifiedAddPlucks(traj, phraseStart, g) {
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
        const sym = d3Symbol().type(d3SymbolTriangle).size(20);
        g.append('g')
          .classed('articulation', true)
          .classed('pluck', true)
          .append('path')
          .attr('d', sym)
          .attr('id', `pluckp${traj.phraseIdx}t${traj.num}`)
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'black')
          .data(pluckData)
          .attr('transform', d => `translate(${x(d)}, ${y(d)}) rotate(90)`)
      }
    },

    movePlucks(traj) {
      if (traj.articulations[0] && traj.articulations[0].name === 'pluck') {
        const x = d => this.xr()(d.x);
        const y = d => this.yr()(d.y); 
        d3Select(`#pluckp${traj.phraseIdx}t${traj.num}`)
          .transition()
          .duration(this.transitionTime)
          .attr('transform', d => `translate(${x(d)}, ${y(d)}) rotate(90)`)
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
        .attr('stroke', 'black')
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

    handleMouseOver(e) {
      if (e.target.id.slice(0, 8) === 'circle__') {
        const id = e.target.id.slice(8)
        d3Select(`#${id}`)
          .attr('stroke', this.selectedChikariColor)
        d3Select(`#${e.target.id}`)
          .style('cursor', 'pointer')
      } else if (e.target.id.slice(0, 9) === 'overlay__') {
        const id = e.target.id.slice(9);
        const pIdx = Number(id.split('t')[0].slice(1));
        const tIdx = Number(id.split('t')[1]);
        d3Select(`#${id}`)
          .attr('stroke', this.selectedTrajColor)
        if (this.selectedTraj) {
          const c1 = this.selectedTraj.num === tIdx;
          if (!(c1 && this.selectedTraj.phraseIdx === pIdx)) {
            d3Select(`#${e.target.id}`)
              .style('cursor', 'pointer')
          }
        } else {
          d3Select(`#${e.target.id}`)
            .style('cursor', 'pointer')
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
      const data = this.makeTrajData(this.selectedTraj, phrase.startTime);
      d3Select(`#p${pIdx}t${tIdx}`)
        .datum(data)
        .attr('d', this.codifiedPhraseLine())
      d3Select(`#overlay__p${pIdx}t${tIdx}`)
        .datum(data)
        .attr('d', this.codifiedPhraseLine())
    },

    handleMouseOut(e) {
      if (e.target.id.slice(0, 8) === 'circle__') {
        const id = e.target.id.slice(8)
        if (id !== this.selectedChikariID) {
          d3Select(`#${id}`)
            .attr('stroke', this.chikariColor)
        }
      }
      if (e.target.id.slice(0, 9) === 'overlay__') {
        const id = e.target.id.slice(9)
        if (id !== this.selectedTrajID) {
          d3Select(`#${id}`)
            .attr('stroke', this.trajColor)
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

    handleClickTraj(e) {
      e.stopPropagation();
      const id = e.target.id.split('__')[1];
      if (this.selectedTrajID && this.selectedTrajID !== id) {
        d3Select(`#` + this.selectedTrajID)
          .attr('stroke', this.trajColor)
      }
      this.selectedTrajID = e.target.id.split('__')[1];
      const pIdx = this.selectedTrajID.split('t')[0].slice(1);
      const tIdx = this.selectedTrajID.split('t')[1];
      this.selectedTraj = this.piece.phrases[pIdx].trajectories[tIdx];
      this.$refs.trajSelectPanel.selectedIdx = this.selectedTraj.id;
      this.$refs.trajSelectPanel.parentSelected = true;
      this.$refs.trajSelectPanel.slope = Math.log2(this.selectedTraj.slope);
      const c1 = this.selectedTraj.articulations[0];
      if (c1 && this.selectedTraj.articulations[0].name === 'pluck') {
        this.$refs.trajSelectPanel.pluckBool = true
      } else {
        this.$refs.trajSelectPanel.pluckBool = false
      }
      d3Select(`#${this.selectedTrajID}`)
        .attr('stroke', this.selectedTrajColor)
      d3Select(`#overlay__${this.selectedTrajID}`)
        .style('cursor', 'auto')
      if (this.selectedChikariID) {
        this.clearSelectedChikari()
      }
      if (!(this.selectedPhraseDivIdx === undefined)) {
        this.clearSelectedPhraseDiv()
      }
      this.addAllDragDots();
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
        this.selectedPhraseDivIdx = undefined
      }
    },

    clearSelectedTraj() {
      if (this.selectedTrajID) {
        d3Select(`#${this.selectedTrajID}`)
          .attr('stroke', this.trajColor)
        d3Select(`#overlay__${this.selectedTrajID}`)
          .style('cursor', 'pointer')
        this.selectedTrajID = undefined;
        d3SelectAll('.dragDots').remove();
      }
    },

    clearTrajSelectPanel() {
      this.$refs.trajSelectPanel.parentSelected = false;
      this.$refs.trajSelectPanel.selectedIdx = undefined
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
      this.visibleSargam.forEach((s, i) => {
        d3Select('.sargamLine.s' + i)
          .attr('d', this.codifiedSargamLine(Math.log2(s)))
      });
      this.redraw();


    },

    playheadLine() {
      return d3Line()([
        [0, this.yr()(Math.log2(this.freqMin))],
        [0, this.yr()(Math.log2(this.freqMax)) - this.xAxHeight]
      ])
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
    },

    redrawPlayhead() {
      d3Select('.playhead').transition().duration(this.transitionTime)
        .attr('transform', `translate(${this.xr()(this.currentTime)})`)
    },

    async redraw() {
      await this.updateTranslateExtent();
      this.gx
        .transition()
        .duration(this.transitionTime)
        .call(this.xAxis, this.xr());
      this.gy
        .transition()
        .duration(this.transitionTime)
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

      if (this.piece.audioID) await this.redrawSpectrogram();
      this.redrawPlayhead();
      // this.movePhraseDivs();
      this.moveRegion();
      // this.codifiedAddSargamLabels();
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
      )
    },
    
    codifiedAddPhrases() {
      this.addSargamLines(true);
      
      this.piece.phrases.forEach(phrase => {
        phrase.trajectories.forEach(traj => {
          if (traj.id !== 12) this.codifiedAddTraj(traj, phrase.startTime)
        });
      })
      this.codifiedAddChikari();
      // this.codifiedAddSargamLabels();
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
          }
        })
      });
      this.redrawChikaris();
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
          d3Select()
          this.gx.call(this.zoomX.translateBy, deltaX, 0);
          this.gy.call(this.zoomY.translateBy, 0, deltaY);
        } else {
          // just for in initial this.zoomX setting
          const x = (this.yAxWidth * k - this.yAxWidth) / k;
          this.gx.call(this.zoomX.scaleBy, k, point);
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
      this.redraw()
    },

    getYTickLabels() {
      const yTickLabels = this.visiblePitches.map(p => p.octavedSargamLetter)
      return yTickLabels
    },

    startAnimationFrame() {
      this.animationStart = this.$refs.audioPlayer.getCurrentTime();
      if (!this.requestId) {
        this.requestId = window.requestAnimationFrame(this.loopAnimationFrame)
      }
    },

    loopAnimationFrame() {
      this.requestId = undefined;
      this.currentTime = this.$refs.audioPlayer.getCurrentTime();

      const currentStartTime = this.xr().invert(30);
      const currentEndTime = currentStartTime + this.durTot / this.tx().k;
      if (this.currentTime > currentEndTime) {
        const delta = (this.rect().width - this.yAxWidth) * 0.8 / this.tx().k;
        this.gx.call(this.zoomX.translateBy, -delta, 0);
        this.redraw()
      }


      this.redrawPlayhead();
      this.startAnimationFrame();
    },

    stopAnimationFrame() {
      if (this.requestId) {
        window.cancelAnimationFrame(this.requestId);
        this.requestId = undefined;
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
        newTraj = new Trajectory({
          id: 12,
          durTot: traj.durTot,
          fundID12: this.piece.raga.fundamental
        })
      }
      // if before and after are silence; combine all three trajs into single
      //silent traj
    d3Select(`#${trajID}`).remove();
      d3Select(`#overlay__${trajID}`).remove();
      d3Select(`#articulations__${trajID}`).remove();
      
      if (!newTraj) {
        // for (let i=phrase.trajectories.length-1; i > tIdx; i--) {
        //   const traj = phrase.trajectories[i];
        //   const oldId = `p${pIdx}t${traj.num}`;
        //   const newId = `p${pIdx}t${delAfter ? traj.num - 2 : traj.num-1}`;
        //   d3Select(`#${oldId}`).attr('id', newId);
        //   d3Select(`#overlay__${oldId}`).attr('id', `overlay__${newId}`);
        //   d3Select(`#articulations__${oldId}`)
        //     .attr('id', `articulations__${newId}`);
        //   let hOffCt = 0;
        //   let hOnCt = 0;
        //   let slideCt = 0;
        //   Object.keys(traj.articulations).forEach(key => {
        //     const art = traj.articulations[key];
        //     if (art.name === 'pluck') {
        //       d3Select(`#pluck${oldId}`).attr('id', `pluck${newId}`);
        //     } else if (art.name === 'hammer-off') {
        //       d3Select(`#hammeroff${oldId}i${hOffCt}`)
        //         .attr('id', `hammeroff${newId}i${hOffCt}`);
        //       hOffCt++;
        //     } else if (art.name === 'hammer-on') {
        //       d3Select(`#hammeron${oldId}i${hOnCt}`)
        //         .attr('id', `hammeron${newId}i${hOnCt}`);
        //       hOnCt++;
        //     } else if (art.name === 'slide') {
        //       d3Select(`#slide${oldId}i${slideCt}`)
        //         .attr('id', `slide${newId}i${slideCt}`);
        //       slideCt++;
        //     }
        //   })
        // }
        
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
        this.piece.phrases[pIdx].trajectories = newTrajs;
      }
      this.piece.phrases[pIdx].durArrayFromTrajectories();
      this.piece.phrases[pIdx].assignStartTimes();
      this.piece.phrases[pIdx].assignTrajNums();
      this.piece.durArrayFromPhrases();
      this.piece.updateStartTimes();
      this.codifiedRedrawPhrase(pIdx);
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
      })
    },

    redrawPhrase(pIdx) {
      const timePts = Math.round(this.durTot / this.minDrawDur);
      const drawTimes = linSpace(0, this.durTot, timePts);
      const phrase = this.piece.phrases[pIdx]
      phrase.trajectories.forEach((traj, tIdx) => {
        if (traj.id !== 12) {
          const st = phrase.startTime + traj.startTime;
          const end = st + traj.durTot;
          const fltr = t => t >= st && t < end;
          const mp = t => (t - st) / traj.durTot;
          const trajDrawTimes = drawTimes.filter(fltr);
          const trajDrawXs = trajDrawTimes.map(mp);
          const trajDrawYs = trajDrawXs.map(x => traj.compute(x));
          const data = trajDrawYs.map((y, i) => {
            return {
              x: trajDrawTimes[i],
              y: y
            }
          })
          d3Select(`#p${pIdx}t${tIdx}`)
            .datum(data)
            .attr('d', this.phraseLine())
          d3Select(`#overlay__${pIdx}t${tIdx}`)
            .datum(data)
            .attr('d', this.phraseLine())
        }
        this.redrawPlucks(traj, phrase.startTime)
        this.redrawKrintin(traj, phrase.startTime)
        this.redrawSlide(traj, phrase.startTime)
      })
    },

    redrawPlucks(traj, phraseStart) {
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
          .attr('transform', d => `translate(${x(y)}, ${d(y)}}) rotate(90)`)
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
  }
}
</script>

<style scoped>
.graph {
  width: calc(100% - v-bind(controlBoxWidth+1+'px'));
  height: 100%;
  border-bottom: 1px solid black;
  border-right: 1px solid black;
}

.controlBox {
  width: v-bind(controlBoxWidth+'px');
  height: 100%;
  border-bottom: 1px solid black;
  background-color: #202621;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
  color: white;
}

.scrollingControlBox {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
  color: white;
  background-color: #202621;
  overflow-y: scroll;
}

.mainzz {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 31px);
  /* min-height: 100%; */
  background-color: black;
}

.upperRow {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 600px;
}

.lower {
  width: 100%;
  height: 150px;
  background-color: black;
}

.cbBox {
  width: 100%;
  height: 70px;
  min-height: 70px;
  /* border: 1px solid orange; */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
}

.cbBoxSmall {
  width: 100%;
  height: 40px;
  min-height: 70px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
}

button {
  cursor: pointer
}

.savedDate {
  font-size: 13px
}

.cbRow {
  height: 30px;
  min-height: 30px;
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
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

/* .regionG {
  pointer-events: none;
}

.region {
  pointer-events: none
} */
</style>
