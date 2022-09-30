<template>
<div class='mainzz'>
  <div class='upperRow'>
    <div class='graph' ref='graph'></div>
    <div class='controlBox'>
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
      <div class='cbBox'>
        <button @click='savePiece'>Save</button>
        <span class='savedDate'>{{`Saved: ${dateModified ? dateModified.toLocaleString() : ''}`}}</span>
      </div>
      <div class='cbRow'>
        <label>View Phrases: </label>
        <input type='checkbox' v-model='viewPhrases' @change='updatePhraseLabel'>
      </div>
      <div class='cbRow'>
        <label>Loop: </label>
        <input type='checkbox' v-model='loop' 
        @click='updateLoop' 
        >
      </div>
      <div class='filler'>
      </div>
      <AltTrajSelectPanel ref='trajSelectPanel'/>
    </div>
  </div>
</div>
<EditorAudioPlayer
  ref='audioPlayer'
  :audioSource='audioSource'
  />
</template>
<script>

const getClosest = (counts, goal) => {
  return counts.reduce((prev, curr) => Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev)
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

// const cumsum = (sum => value => sum += value)(0);

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
  //   getAudioDBEntry
} from '@/js/serverCalls.js';

import EditorAudioPlayer from '@/components/EditorAudioPlayer.vue';
import AltTrajSelectPanel from'@/components/AltTrajSelectPanel.vue';
import * as d3 from 'd3';
export default {
  name: 'AltEditor',

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
      minDrawDur: 0.005, //this could be smaller, potentially, might be more efficient
      initViewDur: 10,
      initYScaleFactor: 2,
      initXScaleFactor: 1,
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
      viewPhrases: false,
      phraseLabelHeight: 30,
      loop: false,
      init: true,
      minTrajDur: 0.05
    }
  },
  
  components: {
    EditorAudioPlayer, AltTrajSelectPanel
  },
  
  created() {
    window.addEventListener('keydown', this.handleKeydown)
  },

  async mounted() {
    this.d3 = d3;
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
        const data = this.makeTrajData(this.selectedTraj, this.piece.phrases[pIdx].startTime);
        d3.select(`#p${pIdx}t${tIdx}`)
          .datum(data)
          .attr('d', this.codifiedPhraseLine())
        d3.select(`#overlay__p${pIdx}t${tIdx}`)
          .datum(data)
          .attr('d', this.codifiedPhraseLine())
      }
      d3.selectAll('.dragDots').remove();
      this.addAllDragDots();
    })

    const piece = await getPiece(this.$store.state._id);
    if (piece.audioID) {
      this.audioSource = `https://swara.studio/audio/mp3/${piece.audioID}.mp3`;
      // this.audioSource = `https://swara.studio/audio/wav/${piece.audioID}.wav`;
      this.audioDBDoc = await getAudioRecording(piece.audioID)
      this.durTot = this.audioDBDoc.duration;
    } else {
      this.durTot = piece.durTot;
    }

    this.initXScaleFactor = this.durTot / this.initViewDur;
    let fund = 246;
    this.freqMin = fund / 2;
    this.freqMax = fund * 4;
    await this.getPieceFromJson(piece, fund);
    await this.initializePiece();
    
    this.emitter.on('pluckBool', pluckBool => {
      if (pluckBool) {
        if (!this.selectedTraj.articulations[0]) {
          this.selectedTraj.articulations[0] = new Articulation();
          const pIdx = this.selectedTraj.phraseIdx;
          const tIdx = this.selectedTraj.num;
          const phrase = this.piece.phrases[pIdx];
          const g = d3.select(`#articulations__p${pIdx}t${tIdx}`)
          this.codifiedAddPlucks(this.selectedTraj, phrase.startTime, g)
        }
      } else {
        // console.log(this, this.selectedTraj) 
        if (this.selectedTraj.articulations[0]) {
          delete this.selectedTraj.articulations[0];
          this.removePlucks(this.selectedTraj)
        }
      }
    });
    
  },

  unmounted() {
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.handleKeydown);
    this.emitter.off('pluckBool');
    this.emitter.off('mutateTraj')
  },

  watch: {
    spectrogramOpacity(newVal) {
      d3.selectAll('.spectrogram')
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
    }
    
  },

  methods: {
    
    addAllDragDots() {
      d3.selectAll('.dragDots').remove();
      const pIdx = this.selectedTraj.phraseIdx;
      // const tIdx = this.selectedTraj.num;
      const phrase = this.piece.phrases[pIdx];
      const drag = () => {
        const dragStart = e => {
          const phraseStart = phrase.startTime;
          const trajStart = this.selectedTraj.startTime;
          const idx = e.sourceEvent.target.id.split('dragDot')[1];
          this.dragIdx = idx;
          // const time = this.xr().invert(e.x);
          const logFreq = this.codifiedYR.invert(e.y);
          this.selectedTraj.logFreqs[idx] = logFreq;
          const endTime = phraseStart + trajStart + this.selectedTraj.durTot;
          const timePts = Math.round((endTime - (phraseStart + trajStart)) / this.minDrawDur);
          const drawTimes = linSpace(phraseStart + trajStart, endTime, timePts);
          const mp = t => (t - (phraseStart + trajStart)) / (endTime - (phraseStart + trajStart));
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
        };
        const dragging = e => {
          const idx = Number(this.dragIdx);
          const time = this._constrainTime(e, idx);
          const x = this.codifiedXR(time);
          d3.select(`#dragDot${idx}`)
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
              const prevPhrase = this.piece.phrases[pIdx-1];
              const prevTraj = prevPhrase.trajectories[prevPhrase.trajectories.length-1];
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
                let newDurArray = traj.durArray.map((i => i * traj.durTot / newDurTot));
                newDurArray[0] = newPropA;
                traj.durArray = newDurArray;
              } 
              traj.durTot -= delta;
              phrase.startTime += delta;
            } else {
              const prevTraj = phrase.trajectories[tIdx-1];
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
                let newDurArray = traj.durArray.map((i => i * traj.durTot / newDurTot));
                newDurArray[0] = newPropA;
                traj.durArray = newDurArray;
              }
              traj.durTot -= delta;
              traj.startTime += delta;
            }
            // if previous traj of this phrase
            
          } else if (idx === traj.durArray.length) {
            if (tIdx < phrase.trajectories.length-1) {
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
                const initPortionZ = traj.durArray[traj.durArray.length-1] * traj.durTot;
                const newDurTot = traj.durTot + delta;
                const newPropZ = (initPortionZ + delta) / newDurTot;
                let newDurArray = traj.durArray.map((i => i * traj.durTot / newDurTot));
                newDurArray[newDurArray.length - 1] = newPropZ;
                traj.durArray = newDurArray;
              }
              traj.durTot += delta;
            } else {
              if (this.piece.phrases[pIdx+1]) {
                const nextPhrase = this.piece.phrases[pIdx+1];
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
                if (traj.durArray.length > 1) {
                  const initPortionZ = traj.durArray[traj.durArray.length-1] * traj.durTot;
                  const newDurTot = traj.durTot + delta;
                  const newPropZ = (initPortionZ + delta) / newDurTot;
                  let newDurArray = traj.durArray.map((i => i * traj.durTot / newDurTot));
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

          d3.select(`#transparentPhrase`)
            .datum(data)
            .attr('d', this.codifiedPhraseLine())
        }
        
        const dragEnd = e => {
          const idx = Number(this.dragIdx);
          const time = this._constrainTime(e, idx);
          const x = this.codifiedXR(time);
          
            
          const traj = this.selectedTraj;
          const phrase = this.piece.phrases[traj.phraseIdx];
          const pIdx = traj.phraseIdx;
          const tIdx = traj.num;
          let logFreq = this.codifiedYR.invert(e.y);
          const logSargamLines = this.visibleSargam.map(s => Math.log2(s));
          logFreq = getClosest(logSargamLines, logFreq)
          const y = this.codifiedYR(logFreq)
          d3.select(`#dragDot${idx}`)
            .attr('cx', x)
            .attr('cy', y)
          const visiblePitches = this.piece.raga.getPitches({
            low: this.freqMin, 
            high: this.freqMax
          });
          const newPitch = visiblePitches[logSargamLines.indexOf(logFreq)]
          
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
              const prevPhrase = this.piece.phrases[pIdx-1];
              const prevTraj = prevPhrase.trajectories[prevPhrase.trajectories.length-1];
              const initTime = phrase.startTime + traj.startTime;
              const delta = time - initTime;
              prevTraj.durTot += delta;
              prevPhrase.durTotFromTrajectories();
              prevPhrase.durArrayFromTrajectories();
              if (traj.durArray.length > 1) {
                const initPortionA = traj.durArray[0] * traj.durTot;
                const newDurTot = traj.durTot - delta;
                const newPropA = (initPortionA - delta) / newDurTot;
                let newDurArray = traj.durArray.map((i => i * traj.durTot / newDurTot));
                newDurArray[0] = newPropA;
                traj.durArray = newDurArray;    
              } 
              traj.durTot -= delta;
              phrase.startTime += delta;
              phrase.durTotFromTrajectories();
              phrase.durArrayFromTrajectories();
            } else {
              const prevTraj = phrase.trajectories[tIdx-1];
              const initTime = phrase.startTime + traj.startTime;
              const delta = time - initTime;
              prevTraj.durTot += delta;
              phrase.durArrayFromTrajectories();
              if (traj.durArray.length > 1) {
                const initPortionA = traj.durArray[0] * traj.durTot;
                const newDurTot = traj.durTot - delta;
                const newPropA = (initPortionA - delta) / newDurTot;
                let newDurArray = traj.durArray.map((i => i * traj.durTot / newDurTot));
                newDurArray[0] = newPropA;
                traj.durArray = newDurArray;
              }
              traj.durTot -= delta;
            }            
          } else if (idx === traj.durArray.length) {
            if (tIdx < phrase.trajectories.length - 1) {
              const nextTraj = phrase.trajectories[tIdx+1];
              const initTime = phrase.startTime + traj.startTime + traj.durTot;
              const delta = time - initTime;
              nextTraj.durTot -= delta;
              traj.durTot += delta;              
              if (traj.durArray.length > 1) {
                const initPortionZ = traj.durArray[traj.durArray.length - 1] * traj.durTot;
                const newDurTot = traj.durTot + delta;
                const newPropZ = (initPortionZ + delta) / newDurTot;
                let newDurArray = traj.durArray.map((i => i * traj.durTot / newDurTot));
                newDurArray[newDurArray.length - 1] = newPropZ;
                traj.durArray = newDurArray;
              }
              phrase.trajectories[tIdx+1] = nextTraj;
              phrase.durArrayFromTrajectories();
            } else {
              if (this.piece.phrases[pIdx+1]) {
                const nextPhrase = this.piece.phrases[pIdx+1];
                const nextTraj = nextPhrase.trajectories[0];
                const initTime = phrase.startTime + traj.startTime + traj.durTot;
                const delta = time - initTime;
                nextTraj.durTot -= delta;
                nextPhrase.startTime += delta;
                nextPhrase.durTotFromTrajectories();
                nextPhrase.durArrayFromTrajectories();
                nextPhrase.assignStartTimes();
                traj.durTot += delta;    
              }  
            }
          }
          const data = this.makeTrajData(traj, phrase.startTime);
          d3.select(`#transparentPhrase`).remove()
          d3.select(`#p${pIdx}t${tIdx}`)
            .datum(data)
            .attr('d', this.codifiedPhraseLine())
          d3.select(`#overlay__p${pIdx}t${tIdx}`)
            .datum(data)
            .attr('d', this.codifiedPhraseLine())            
        if (idx === 0) {
          if (tIdx === 0) {
            const prevPhrase = this.piece.phrases[pIdx-1];
            const prevTraj = prevPhrase.trajectories[prevPhrase.trajectories.length-1];
            const newPrevTraj = this.fixTrajectory(prevTraj);
            prevPhrase.trajectories[prevPhrase.trajectories.length-1] = newPrevTraj;
            prevPhrase.assignStartTimes();
            prevPhrase.assignTrajNums();
            prevPhrase.assignPhraseIdx();
            
            const data = this.makeTrajData(newPrevTraj, prevPhrase.startTime);
            d3.select(`#p${pIdx-1}t${prevPhrase.trajectories.length-1}`)
            .datum(data)
            .attr('d', this.codifiedPhraseLine())
            
            d3.select(`#overlay__p${pIdx-1}t${prevPhrase.trajectories.length-1}`)
            .datum(data)
            .attr('d', this.codifiedPhraseLine())
            
            this.moveKrintin(newPrevTraj, phrase.startTime);
            this.moveSlides(newPrevTraj, phrase.startTime)
          } else {
            const prevTraj = phrase.trajectories[tIdx-1];
            const newPrevTraj = this.fixTrajectory(prevTraj);
            phrase.trajectories[tIdx-1] = newPrevTraj;
            phrase.assignStartTimes();
            phrase.assignTrajNums();
            phrase.assignPhraseIdx();
            const data = this.makeTrajData(newPrevTraj, phrase.startTime);          
            d3.select(`#p${pIdx}t${tIdx-1}`)
              .datum(data)
              .attr('d', this.codifiedPhraseLine())
            d3.select(`#overlay__p${pIdx}t${tIdx-1}`)
              .datum(data)
              .attr('d', this.codifiedPhraseLine())
            this.moveKrintin(newPrevTraj, phrase.startTime);
            this.moveSlides(newPrevTraj, phrase.startTime)
          }
        } else if (idx === traj.durArray.length) {
          if (tIdx < phrase.trajectories.length-1) {
            const nextTraj = phrase.trajectories[tIdx+1];
            const newNextTraj = this.fixTrajectory(nextTraj);
            phrase.trajectories[tIdx+1] = newNextTraj;
            phrase.assignStartTimes();
            phrase.assignTrajNums();
            phrase.assignPhraseIdx();
            const data = this.makeTrajData(nextTraj, phrase.startTime);
            d3.select(`#p${pIdx}t${tIdx+1}`)
              .datum(data)
              .attr('d', this.codifiedPhraseLine())
            d3.select(`#overlay__p${pIdx}t${tIdx+1}`)
              .datum(data)
              .attr('d', this.codifiedPhraseLine())          
            this.moveKrintin(newNextTraj, phrase.startTime);
            this.moveSlides(newNextTraj, phrase.startTime);
            this.removePlucks(newNextTraj);
            const g = d3.select(`#articulations__p${pIdx}t${tIdx+1}`);
            this.codifiedAddPlucks(newNextTraj, phrase.startTime, g)
          } else {
            if (this.piece.phrases[pIdx+1]) {
              const nextPhrase = this.piece.phrases[pIdx+1];
              const nextTraj = nextPhrase.trajectories[0];
              const newNextTraj = this.fixTrajectory(nextTraj);
              nextPhrase.trajectories[0] = newNextTraj;
              nextPhrase.assignStartTimes();
              nextPhrase.assignTrajNums();
              nextPhrase.assignPhraseIdx();
              const data = this.makeTrajData(newNextTraj, nextPhrase.startTime);
              d3.select(`#p${pIdx+1}t${0}`)
                .datum(data)
                .attr('d', this.codifiedPhraseLine())
              d3.select(`#overlay__p${pIdx+1}t${0}`)
                .datum(data)
                .attr('d', this.codifiedPhraseLine())
              this.moveKrintin(newNextTraj, nextPhrase.startTime)
              this.moveSlides(newNextTraj, nextPhrase.startTime)  
              this.removePlucks(newNextTraj);
              const g = d3.select(`#articulations__p${pIdx+1}t${0}`);
              this.codifiedAddPlucks(newNextTraj, nextPhrase.startTime, g)
            }  
          }
        }        
          this.removePlucks(traj);
          const g = d3.select(`#articulations__p${pIdx}t${tIdx}`)
          this.codifiedAddPlucks(traj, phrase.startTime, g);
          const newTraj = this.fixTrajectory(traj)
          this.piece.phrases[pIdx].trajectories[tIdx] = newTraj
          phrase.assignStartTimes();
          phrase.assignTrajNums();
          phrase.assignPhraseIdx();
          this.selectedTraj = newTraj;
          this.moveKrintin(this.selectedTraj, phrase.startTime);
          this.moveSlides(this.selectedTraj, phrase.startTime)
        }
        return d3.drag()
          .on('start', dragStart)
          .on('drag', dragging)
          .on('end', dragEnd)
      };
      const dragDotsG = this.phraseG.append('g').classed('dragDots', true);
      let times = [0,...this.selectedTraj.durArray.map(cumsum())];
      const phraseStart = phrase.startTime;
      const trajStart = this.selectedTraj.startTime;
      times = times.map(a => a * this.selectedTraj.durTot + phraseStart + trajStart)
      for (let i = 0; i < times.length; i++) {
        const lf = this.selectedTraj.logFreqs[i] ? 
          this.selectedTraj.logFreqs[i] : 
          this.selectedTraj.logFreqs[i-1];
        dragDotsG
          .append('circle')
          .attr('id', `dragDot${i}`)
          .attr('cx', this.codifiedXR(times[i]))
          .attr('cy', this.codifiedYR(lf))
          .attr('r', 5)
          .style('fill', 'purple')
          .style('cursor', 'pointer')
          .call(drag())
      }
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
      const pluckExists = traj.articulations[0] && traj.articulations[0].name === 'pluck';
      delete trajObj.articulations;
      const newTraj = new Trajectory(trajObj);
      if (!pluckExists) delete newTraj.articulations[0];
      return newTraj
    },
    
    _constrainTime(e, idx) {
      let time = this.codifiedXR.invert(e.x);
      const traj = this.selectedTraj;
      const pIdx = traj.phraseIdx;
      const tIdx = traj.num;
      const phrase = this.piece.phrases[pIdx];
      let times = [0,...traj.durArray.map(cumsum())];
      times = times.map(a => a * traj.durTot + phrase.startTime + traj.startTime);  
      if (idx === 0) {
        let start
        if (tIdx > 0) {
          const prevTraj = phrase.trajectories[tIdx-1];
          if (prevTraj.durArray && prevTraj.durArray.length > 1) {
            let prevTrajTimes = [0,...prevTraj.durArray.map(cumsum())];
            prevTrajTimes = prevTrajTimes.map(a => {
              return a * prevTraj.durTot + phrase.startTime + prevTraj.startTime
            });
            start = prevTrajTimes[prevTrajTimes.length - 2]
          } else {
            start = phrase.startTime + phrase.trajectories[tIdx-1].startTime;
          }      
        } else if (pIdx > 0) {
          const prevPhrase = this.piece.phrases[pIdx-1];
          const prevTraj = prevPhrase.trajectories[prevPhrase.trajectories.length-1];
          if (prevTraj.durArray && prevTraj.durArray.length > 1) {
            let prevTrajTimes = [0,...prevTraj.durArray.map(cumsum())];
            prevTrajTimes = prevTrajTimes.map(a => {
              return a * prevTraj.durTot + prevPhrase.startTime + prevTraj.startTime
            });
            start = prevTrajTimes[prevTrajTimes.length - 2]
          } else {
            start = prevPhrase.startTime + prevTraj.startTime;
          }  
        }
        if (time < start + this.minTrajDur) time = start + this.minTrajDur;
        if (time > times[1] - this.minTrajDur) time = times[1] - this.minTrajDur;
      } else if (idx < times.length-1) {
        if (time < times[idx-1] + this.minTrajDur) time = times[idx-1] + this.minTrajDur;
        if (time > times[idx+1] - this.minTrajDur) time = times[idx+1] - this.minTrajDur;
      } else {
        let nextEnd;
        if (time < times[idx-1] + this.minTrajDur) time = times[idx-1] + this.minTrajDur;
        if (phrase.trajectories[tIdx+1]) {
          const nextTraj = phrase.trajectories[tIdx+1];
          if (nextTraj.durArray && nextTraj.durArray.length > 1) {
            let nextTrajTimes = [0,...nextTraj.durArray.map(cumsum())];
            nextTrajTimes = nextTrajTimes.map(a => {
              return a * nextTraj.durTot + phrase.startTime + nextTraj.startTime
            });
            nextEnd = nextTrajTimes[1]
          } else {
            nextEnd = phrase.startTime + nextTraj.startTime + nextTraj.durTot;
          }
        } else if (this.piece.phrases[pIdx+1]) {
          const nextPhrase = this.piece.phrases[pIdx+1];
          const nextTraj = nextPhrase.trajectories[0];
          if (nextTraj.durArray && nextTraj.durArray.length > 1) {
            let nextTrajTimes = [0,...nextTraj.durArray.map(cumsum())];
            nextTrajTimes = nextTrajTimes.map(a => {
              return a * nextTraj.durTot + nextPhrase.startTime + nextTraj.startTime
            });
            nextEnd = nextTrajTimes[1]
          } else {
            nextEnd = nextPhrase.startTime + nextTraj.startTime + nextTraj.durTot;
          }    
        }
        if (time > nextEnd - this.minTrajDur) time = nextEnd - this.minTrajDur;
      }
      return time
    },
    
    calculateNewDurArray(phrase, traj, idx, time) {
      let times = [0,...traj.durArray.map(cumsum())];
      times = times.map(a => a * traj.durTot + phrase.startTime + traj.startTime); 
      const newTimes = times.slice();
      newTimes[idx] = time;
      let durArray = newTimes.slice(1).map((v, i) => v - newTimes[i]);
      const daSum = durArray.reduce((a, b) => a+b, 0)
      durArray = durArray.map(i => i/daSum)
      return durArray
    },
    
    constrainTime(e) {
      let time = this.xr().invert(e.x);
      const pIdx = this.selectedTraj.phraseIdx;
      const tIdx = this.selectedTraj.num;
      if (this.selectedTraj.num > 0) {
        const phrase = this.piece.phrases[pIdx];
        if (time < phrase.startTime + phrase.trajectories[tIdx-1].startTime) {
          time = phrase.startTime + phrase.trajectories[tIdx-1].startTime;
        }
      } else if (pIdx > 0) {
        const phrase = this.piece.phrases[pIdx-1];
        const traj = phrase.trajectories[phrase.trajectories.length - 1];
        if (time < phrase.startTime + traj.startTime) {
          time = phrase.startTime + traj.startTime
        }
      } else {
        if (time < 0) time = 0
      }
      const _phrase = this.piece.phrases[pIdx];
      const _traj = _phrase.trajectories[tIdx];
      const _endTime = _phrase.startTime + _traj.startTime + _traj.durTot;
      if (time > _endTime) time = _endTime;
      return time
    },
    
    updatePhraseLabel() {
      // const rect = this.rect();
      // if (this.viewPhrases) {
      //   this.y.range([this.xAxHeight, rect.height - this.phraseLabelHeight]);
      //   d3.select('#clip>#rect')
      //     .attr('height', rect.height - this.xAxHeight - this.phraseLabelHeight);
      //   d3.select('#yAxisClip>#yAxisClipRect')
      //     .attr('height', rect.height - this.xAxHeight - this.phraseLabelHeight);
      //   d3.select('#playheadClipRect')
      //     .attr('height', rect.height - this.phraseLabelHeight);
      // } else {
      //   this.y.range([this.xAxHeight, rect.height]);
      //   d3.select('#clip>#rect')
      //     .attr('height', rect.height - this.xAxHeight)
      //   d3.select('#yAxisClip>#yAxisClipRect')
      //     .attr('height', rect.height - this.xAxHeight);
      //   d3.select('#playheadClipRect')
      //     .attr('height', rect.height);
      // }
      // this.redraw()
    },
    
    updateLoop(e) {
      if (e && e.clientX === 0) e.preventDefault(); // stops spacebar from checking box
      // this.$nextTick(() => {
      //   if (this.loop) {
      //     this.$refs.audioPlayer.loop = true;
      //     this.$refs.audioPlayer.loopStart = this.regionStartTime;
      //     this.$refs.audioPlayer.loopEnd = this.regionEndTime;
      //     if (this.$refs.audioPlayer.sourceNode) {
      //       this.$refs.audioPlayer.sourceNode.loopStart = this.regionStartTime;
      //       this.$refs.audioPlayer.sourceNode.loopEnd = this.regionEndTime;
      //     }  
      //   } else {
      //     this.$refs.audioPlayer.loop = false;
      //     this.$refs.audioPlayer.loopStart = undefined;
      //     this.$refs.audioPlayer.loopEnd = undefined;
      //   }
      // })
      
    },
    
    async savePiece() {
      const result = await savePiece(this.piece);
      this.dateModified = new Date(result.dateModified);
    },
    
    handleKeydown(e) {
      if (e.key === ' ') {
        this.$refs.audioPlayer.togglePlay()
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.clearSelectedChikari();
        this.clearSelectedTraj();
        this.clearTrajSelectPanel();
        d3.selectAll('.dragDots').remove();
        if (this.setChikari) {
          this.setChikari = false;
          this.svg.style('cursor', 'auto')
        }
        if (this.regionG) {
          this.regionG.remove();
          this.regionG = undefined
        }
      } else if (e.key === 'Backspace') {
        
        if (this.selectedChikariID) {
          const splitArr = this.selectedChikariID.split('_');
          const pIdx = splitArr[0].slice(1);
          const key = splitArr[1] + '.' + splitArr[2];
          delete this.piece.phrases[pIdx].chikaris[key];
          d3.select(`#${this.selectedChikariID}`).remove()
          d3.select(`#circle__${this.selectedChikariID}`).remove()
          this.selectedChikariID = undefined;
        } else if (this.selectedTrajID) {
          this.deleteTraj(this.selectedTrajID);
          this.selectedTrajID = undefined;
        }
        
      } else if (e.key === 'c') {
        this.setChikari = true;
        this.svg.style('cursor', 'cell')
      }
    },

    shrink() {
      d3.select('.spectrogram')
        .attr('transform', `translate(${this.yAxWidth},${this.xAxHeight}) scale(0.5, 1)`)
    },

    async addSpectrogram() {
      this.numSpecs = await getNumberOfSpectrograms(this.piece.audioID);      
      const rect = this.rect();
      const height = rect.height - this.xAxHeight;
      this.imgs = [];
      for (let i=0; i < this.numSpecs; i++) {    
        const url = `https://swara.studio/spectrograms/${this.piece.audioID}/0/${i}.webp`;
        const img = new Image();
        img.src = url;
        this.imgs.push(img)
      }
      this.loadedImgs = 0;
      this.imgs.forEach(img => {
        img.onload = () => {
          this.loadedImgs ++;
          if (this.loadedImgs === this.numSpecs) {
            this.totNaturalWidth = 0;
            const unscaledWidths = []
            if (this.imgs.every(img => img.complete)) {
              this.imgs.forEach(img => {
                this.totNaturalWidth += img.naturalWidth;
                unscaledWidths.push(Number(height * img.naturalWidth / img.naturalHeight))
              });
              this.cumulativeWidths = [0].concat(unscaledWidths.map(cumsum()).slice(0, unscaledWidths.length - 1))
              this.unscaledWidth = height * this.totNaturalWidth / this.imgs[0].naturalHeight;
              this.desiredWidth = (rect.width - this.yAxWidth) * this.initXScaleFactor;
              this.xScale = this.desiredWidth / this.unscaledWidth;
              this.desiredHeight = (rect.height - this.xAxHeight) * this.initYScaleFactor;
              this.yScale = this.desiredHeight / height;
              this.specBox = this.svg.insert('g', 'defs')
                .attr('clip-path', 'url(#clip)');
              this.imgs.forEach((img, i) => {
                const imgPortion = img.naturalWidth / this.totNaturalWidth;
                const unscaledWidth = this.unscaledWidth * imgPortion;
                const xTranslate = this.yAxWidth + this.cumulativeWidths[i];
                this.specBox.append('image')
                  .attr('class', `spectrogram img${i}`)
                  .attr('xlink:href', this.imgs[i].src)
                  .attr('width', unscaledWidth)
                  .attr('height', height)
                  .attr('transform', `translate(${xTranslate},${this.yr()(Math.log2(this.freqMax))}) scale(${this.xScale}, ${this.yScale})`)
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
          // const imgPortion = img.naturalWidth / this.totNaturalWidth;
          // const unscaledWidth = this.unscaledWidth * imgPortion;
          const time = this.durTot * this.cumulativeWidths[i] / (this.totNaturalWidth * height / img.naturalHeight);
          const xTranslate = this.xr()(time);
          d3.select(`.spectrogram.img${i}`).transition().duration(this.transitionTime)
            .attr('transform', `translate(${xTranslate}, ${this.yr()(Math.log2(this.freqMax))}) scale(${this.xScale}, ${this.yScale})`)
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
        phrase.trajectories = phrase.trajectories.map(traj => new Trajectory(traj));
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
    },
    
    phraseIdxFromTime(time) {
      return this.piece.phrases.filter(phrase => {
        const a = time >= phrase.startTime;
        const b = time < phrase.startTime + phrase.durTot;
        return a && b
      })[0].pieceIdx
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
        this.updateLoop();
        const regionLine = d3.line()([
          [0, 0],
          [0, rect.height]
        ])
          
        if (!this.regionG) {
          this.regionG = this.svg
            .append('g')
            .attr('clip-path', 'url(#playheadClip)')
            
            
          this.regionG
            .append('rect')
            .classed('region', true)
            .attr('width', this.regionEndPx-this.regionStartPx)
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
              d3.select('.clickableRegionStart').attr('transform', `translate(${e.x},0)`)
              d3.select('.regionStart').attr('transform', `translate(${e.x}, 0)`);
              d3.select('.region')
                .attr('width', this.xr()(this.regionEndTime) - e.x)
                .attr('transform', `translate(${e.x}, 0)`)
            }
            const dragended = e => {
              this.regionStartPx = e.x;
              this.regionStartTime = this.xr().invert(this.regionStartPx);
              this.updateLoop();
            }
            return d3.drag()
              .on('drag', dragged)
              .on('end', dragended)
          };
          
          const reDrag = () => {
            const dragged = e => {
              d3.select('.clickableRegionEnd').attr('transform', `translate(${e.x},0)`)
              d3.select('.regionEnd').attr('transform', `translate(${e.x}, 0)`);
              d3.select('.region')
                .attr('width', e.x - this.xr()(this.regionStartTime))
            }
            const dragended = e => {
              this.regionEndPx = e.x;
              this.regionEndTime = this.xr().invert(this.regionEndPx);
              this.updateLoop();
            }
            return d3.drag()
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
            .attr('stroke-width', 1 )
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
          d3.select('.region')
            .attr('width', this.regionEndPx-this.regionStartPx)
            .attr('transform', `translate(${this.regionStartPx},0)`)
          d3.select('.regionStart')
            .attr('transform', `translate(${this.regionStartPx},0)`)
          d3.select('.regionEnd')
            .attr('transform', `translate(${this.regionEndPx},0)`)
        }
      }
    },
    
    // region start 
    
    
    moveRegion() {
      const start = this.xr()(this.regionStartTime);
      const end = this.xr()(this.regionEndTime);
      d3.select('.region')
        .attr('width', end - start)
        .attr('transform', `translate(${start})`)
      d3.select('.regionStart')
        .attr('transform', `translate(${start},0)`)
      d3.select('.regionEnd')
        .attr('transform', `translate(${end},0)`)
    },

    async initializePiece() {
      this.visibleSargam = this.piece.raga.getFrequencies({
        low: this.freqMin,
        high: this.freqMax
      })
      const rect = await this.rect();
      this.svg = d3.create('svg')
        .classed('noSelect', true)
        .attr('viewBox', [0, 0, rect.width, rect.height - 1])
        .on('click', this.handleClick)
        .on('mousedown', this.handleMousedown)
        .on('mouseup', this.handleMouseup)
        
      this.paintBackgroundColors();
      if (this.piece.audioID) await this.addSpectrogram();
      this.curWidth = rect.width - this.yAxWidth;
      this.addClipPaths();
      this.addMarkers();

      this.gx = this.svg.append('g');
      this.gy = this.svg.append('g');
      this.x = d3.scaleLinear()
        .domain([0, this.durTot])
        .range([this.yAxWidth, rect.width])
      this.y = d3.scaleLinear()
        .domain([Math.log2(this.freqMax), Math.log2(this.freqMin)])
        .range([this.xAxHeight, rect.height])
      this.z = d3.zoomIdentity;
      this.zoomX = d3.zoom()
        .scaleExtent([1, 1000])
        .translateExtent([
          [0, 0],
          [rect.width, rect.height]
        ]);
      this.zoomY = d3.zoom().scaleExtent([1, 5]).translateExtent([
        [0, 0],
        [rect.width, rect.height]
      ]);
      this.tx = () => d3.zoomTransform(this.gx.node());
      this.ty = () => d3.zoomTransform(this.gy.node());
      this.gx.call(this.zoomX).attr('pointer-events', 'none');
      this.gy.call(this.zoomY).attr('pointer-events', 'none');
      this.zoom = d3.zoom()
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
          .call(this.zoom.transform, d3.zoomIdentity.scale(this.initXScaleFactor))
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
        
        this.$refs.audioPlayer.audio.currentTime = time;
        this.redrawPlayhead()
      }
    },
    
    handleClick(e) {
      const time = this.xr().invert(e.clientX);
      const pIdx = this.phraseIdxFromTime(time);
      // need to figure out how to handle when click is over a non phrase
      if (this.setChikari) {
        const sym = d3.symbol().type(d3.symbolX).size(80);
        const phrase = this.piece.phrases[pIdx];
        const fixedTime = (time - phrase.startTime).toFixed(2);
        phrase.chikaris[fixedTime] = new Chikari({
          'fundamental': this.piece.raga.fundamental,
          'pitches': this.piece.raga.chikariPitches
        });
        const scaledX = Number(fixedTime) / phrase.durTot;
        const dataObj = {
          x: Number(fixedTime) + phrase.startTime,
          y: phrase.compute(scaledX, true)
        };
        console.log(dataObj)
        const num = (Number(fixedTime) % 1).toFixed(2).toString().slice(2);
        const id = `p${phrase.pieceIdx}_${Math.floor(Number(fixedTime))}_${num}`;   
             
        this.phraseG.append('g')
          .classed('chikari', true)
          .append('path')
          .attr('id', id)
          .attr('d', sym)
          .attr('stroke', this.chikariColor)
          .attr('stroke-width', 3)
          .attr('stroke-linecap', 'round')
          .data([dataObj])
          .attr('transform', d => `translate(${this.codifiedXR(d.x)},${this.codifiedYR(d.y)})`)
          
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
      }
    },

    makeAxes() {
      this.xAxis = (g, scale) => g
        .attr('transform', `translate(0,${this.xAxHeight})`)
        .style('font-size', '13px')
        .call(d3.axisTop(scale).ticks(10).tickFormat(d => structuredTime(d)))
        .call(g => g.select('.domain'))

      const yTickLabels = this.getYTickLabels();
      this.yAxis = (g, scale) => g
        .attr('transform', `translate(${this.x(0)},0)`)
        .attr('clip-path', 'url(#yAxisClip)')
        .style('font-size', '14px')
        .call(d3.axisLeft(scale)
          .tickValues(this.visibleSargam.map(f => Math.log2(f)))
          .tickFormat((_, i) => yTickLabels[i]))
        .call(g => g.select('.domain'))
    },
    
    slidePhrases(xDelta, yDelta, xScale, yScale) {
      this.phraseG.transition().duration(this.transitionTime)
        .attr('transform', `translate(${xDelta},${yDelta}) scale(${xScale},${yScale})`)
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
              // .attr('clip-path', 'url(#clip)')
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
    },

    addArticulations(traj, phraseStart) {
      const g = this.phraseG.append('g')
        .attr('id', `articulations__p${traj.phraseIdx}t${traj.num}`)
        // .attr('clip-path', 'url(#clip)')
      this.addPlucks(traj, phraseStart, g)
      this.addKrintin(traj, phraseStart, g)
      this.addSlide(traj, phraseStart, g)
    },
    
    removePlucks(traj) {
      const pIdx = traj.phraseIdx;
      const tIdx = traj.num;
      d3.select(`#pluckp${pIdx}t${tIdx}`).remove()
    },

    addPlucks(traj, phraseStart, g) {
      if (traj.id !== 12) {
        const keys = Object.keys(traj.articulations);
        const relKeys = keys.filter(key => traj.articulations[key].name === 'pluck')
        const pluckData = relKeys.map(p => {
          const normedX = Number(p) * traj.durTot;
          const y = traj.compute(normedX, true);
          return {
            x: phraseStart + traj.startTime + Number(p),
            y: y
          }
        });
        const sym = d3.symbol().type(d3.symbolTriangle).size(20);
        g.append('g')
          .classed('articulation', true)
          .classed('pluck', true)
          .attr('clip-path', 'url(#clip)')
          .append('path')
          .attr('d', sym)
          .attr('id', `pluckp${traj.phraseIdx}t${traj.num}`)
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'black')
          .data(pluckData)
          .attr('transform', d => `translate(${this.xr()(d.x)}, ${this.yr()(d.y)}) rotate(90)`)
      }
    },
    
    codifiedAddPlucks(traj, phraseStart, g) {
      if (traj.id !== 12) {
        const keys = Object.keys(traj.articulations);
        const relKeys = keys.filter(key => traj.articulations[key].name === 'pluck')
        const pluckData = relKeys.map(p => {
          const normedX = Number(p) * traj.durTot;
          const y = traj.compute(normedX, true);
          return {
            x: phraseStart + traj.startTime + Number(p),
            y: y
          }
        });
        const sym = d3.symbol().type(d3.symbolTriangle).size(20);
        g.append('g')
          .classed('articulation', true)
          .classed('pluck', true)
          .attr('clip-path', 'url(#clip)')
          .append('path')
          .attr('d', sym)
          .attr('id', `pluckp${traj.phraseIdx}t${traj.num}`)
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'black')
          .data(pluckData)
          .attr('transform', d => `translate(${this.codifiedXR(d.x)}, ${this.codifiedYR(d.y)}) rotate(90)`)
      }
    },

    movePlucks(traj) {
      if (traj.articulations[0] && traj.articulations[0].name === 'pluck') {
        d3.select(`#pluckp${traj.phraseIdx}t${traj.num}`).transition().duration(this.transitionTime)
          .attr('transform', d => `translate(${this.xr()(d.x)}, ${this.yr()(d.y)}) rotate(90)`)
      }
    
    },
    

    addKrintin(traj, phraseStart, g) {
      // hammer-offs
      const keys = Object.keys(traj.articulations);
      const hammerOffKeys = keys.filter(key => traj.articulations[key].name === 'hammer-off')
      const hammerOffData = hammerOffKeys.map((p, i) => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y,
          i: i
        }
      });
      const offOffset = {
        x: 0,
        y: 0
      };
      hammerOffData.forEach(obj => {
        
        g.append('path')
          .classed('articulation', true)
          .classed('hammer-off', true)
          // .attr('clip-path', 'url(#clip)')
          .attr('id', `krintinp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3.line()([
            // [obj.x - 10 + offOffset.x, obj.y + offOffset.y],
            // [obj.x + offOffset.x, obj.y + offOffset.y],
            // [obj.x + offOffset.x, obj.y + 10 + offOffset.y]
            [-10 + offOffset.x, 0 + offOffset.y],
            [0 + offOffset.x, 0 + offOffset.y],
            [0 + offOffset.x, 10 + offOffset.y]
          ]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .attr('marker-end', 'url(#arrow)')
          .attr('transform', `translate(${this.xr()(obj.x)},${this.yr()(obj.y)})`)
      })

      // hammer-ons
      const hammerOnKeys = keys.filter(key => traj.articulations[key].name === 'hammer-on')
      const hammerOnData = hammerOnKeys.map(p => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y
        }
      });
      const onOffset = {
        x: 0,
        y: 0
      };
      hammerOnData.forEach(obj => {
        g.append('path')
          .classed('articulation', true)
          .classed('hammer-on', true)
          .attr('clip-path', 'url(#clip)')
          .attr('id', `krintinp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3.line()([
            [-10 + onOffset.x, 0 + onOffset.y],
            [0 + onOffset.x, 0 + onOffset.y],
            [0 + onOffset.x, 10 + onOffset.y]
          ]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .attr('marker-end', 'url(#arrow)')
          .attr('transform', `translate(${this.xr()(obj.x)},${this.yr()(obj.y)})`)
      })
    },

    moveKrintin(traj, phraseStart) {
      // hammer-offs
      const keys = Object.keys(traj.articulations);
      const hammerOffKeys = keys.filter(key => traj.articulations[key].name === 'hammer-off')
      const hammerOffData = hammerOffKeys.map((p, i) => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(Number(p) - 0.01, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y,
          i: i
        }
      });
      hammerOffData.forEach(obj => {
        d3.select(`.hammer-off#krintinp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('transform', `translate(${this.codifiedXR(obj.x)},${this.codifiedYR(obj.y)})`)
      });
      // hammer-ons
      const hammerOnKeys = keys.filter(key => traj.articulations[key].name === 'hammer-on')
      const hammerOnData = hammerOnKeys.map(p => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y
        }
      });

      hammerOnData.forEach(obj => {
        d3.select(`.hammer-off#krintinp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('transform', `translate(${this.codifiedXR(obj.x)},${this.codifiedYR(obj.y)})`)
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
      const relKeys = keys.filter(key => traj.articulations[key].name === 'slide')
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
      const offset = {
        x: 0,
        y: 0
      };

      data.forEach(obj => {
        const yMotion = obj.dirUp ? [10, -10] : [-10, 10];
        g.append('path')
          .classed('articulation', true)
          .classed('slide', true)
          .attr('id', `slidep${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3.line()([
            [0 + offset.x, 0 + yMotion[0] + offset.y],
            [0 + offset.x, 0 + yMotion[1] + offset.y]
          ]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .attr('marker-end', 'url(#arrow)')
          .attr('transform', `translate(${this.xr()(obj.x)},${this.yr()(obj.y)})`)
      })
    },
    
    moveSlides(traj, phraseStart) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => traj.articulations[key].name === 'slide')
      const offset = {
        x: 0,
        y: 0
      };
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
      data.forEach(obj => {
        const yMotion = obj.dirUp ? [10, -10] : [-10, 10];
        d3.select(`#slidep${traj.phraseIdx}t${traj.num}i${obj.i}`)
        .attr('d', d3.line()([
          [0 + offset.x, 0 + yMotion[0] + offset.y],
          [0 + offset.x, 0 + yMotion[1] + offset.y]
        ]))
        .attr('transform', `translate(${this.codifiedXR(obj.x)},${this.codifiedYR(obj.y)})`)
      })
      
    },
    
    addMarkers() {
      const markerBoxWidth = 4;
      const markerBoxHeight = 4;
      const refX = markerBoxWidth / 2;
      const refY = markerBoxHeight / 2;
      const arrowPoints = [[0, 0], [0, 4], [4, 2]];

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
        .attr('d', d3.line()(arrowPoints))
        .attr('stroke', 'black')
    },

    addChikaris() {
      const sym = d3.symbol().type(d3.symbolX).size(80);
      this.piece.phrases.forEach(phrase => {
        Object.keys(phrase.chikaris).forEach(key => {
          const scaledX = Number(key) / phrase.durTot;
          const dataObj = {
            x: Number(key) + phrase.startTime,
            y: phrase.compute(scaledX, true)
          };
          const id = 'p' + phrase.pieceIdx + '_' + Math.floor(Number(key)) + '_' +
            (Number(key) % 1).toFixed(2).toString().slice(2);

          this.phraseG.append('g')
            .classed('chikari', true)
            .attr('clip-path', 'url(#clip)')
            .append('path')
            .attr('id', id)
            .attr('d', sym)
            .attr('stroke', this.chikariColor)
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round')
            .data([dataObj])
            .attr('transform', d => `translate(${this.xr()(d.x)}, ${this.yr()(d.y)})`)
            
          // for clicking  
          this.phraseG.append('g')
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
    
    handleMouseOver(e) {
      if (e.target.id.slice(0, 8) === 'circle__') {
        const id = e.target.id.slice(8)
        d3.select(`#${id}`)
          .attr('stroke', this.selectedChikariColor)
        d3.select(`#${e.target.id}`)
          .style('cursor', 'pointer')
      } else if (e.target.id.slice(0, 9) === 'overlay__') {
        const id = e.target.id.slice(9);
        const pIdx = Number(id.split('t')[0].slice(1));
        const tIdx = Number(id.split('t')[1]);        
        d3.select(`#${id}`)
          .attr('stroke', this.selectedTrajColor)
        if (this.selectedTraj) {
          if (!(this.selectedTraj.num === tIdx && this.selectedTraj.phraseIdx === pIdx)) {
            d3.select(`#${e.target.id}`)
              .style('cursor', 'pointer')
          }
        } else {
          d3.select(`#${e.target.id}`)
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
      d3.select(`#p${pIdx}t${tIdx}`)
        .datum(data)
        .attr('d', this.codifiedPhraseLine())
      d3.select(`#overlay__p${pIdx}t${tIdx}`)
        .datum(data)
        .attr('d', this.codifiedPhraseLine())
    },
    
    handleMouseOut(e) {
      if (e.target.id.slice(0, 8) === 'circle__') {
        const id = e.target.id.slice(8)
        if (id !== this.selectedChikariID) {
          d3.select(`#${id}`)
            .attr('stroke', this.chikariColor)
        }      
      }
      if (e.target.id.slice(0, 9) === 'overlay__') {
        const id = e.target.id.slice(9)
        if (id !== this.selectedTrajID) {
          d3.select(`#${id}`)
            .attr('stroke', this.trajColor)
        }
      }  
    },
    
    handleClickChikari(e) {
      if (this.selectedChikariID && this.selectedChikariID !== e.target.id.split('__')[1]) {
        d3.select('#'+this.selectedChikariID).attr('stroke', this.chikariColor)
      }
      this.selectedChikariID = e.target.id.split('__')[1];
      d3.select(`#${this.selectedChikariID}`)
        .attr('stroke', this.selectedChikariColor)      
      if (this.selectedTrajID) {
        this.clearSelectedTraj()
      }
    },
    
    handleClickTraj(e) {
      if (this.selectedTrajID && this.selectedTrajID !== e.target.id.split('__')[1]) {
        d3.select(`#` + this.selectedTrajID)
          .attr('stroke', this.trajColor)
      }
      this.selectedTrajID = e.target.id.split('__')[1];
      const pIdx = this.selectedTrajID.split('t')[0].slice(1);
      const tIdx = this.selectedTrajID.split('t')[1];
      this.selectedTraj = this.piece.phrases[pIdx].trajectories[tIdx];
      this.$refs.trajSelectPanel.selectedIdx = this.selectedTraj.id;
      this.$refs.trajSelectPanel.parentSelected = true;
      if (this.selectedTraj.articulations[0] && this.selectedTraj.articulations[0].name === 'pluck') {
        this.$refs.trajSelectPanel.pluckBool = true
      } else {
        this.$refs.trajSelectPanel.pluckBool = false
      }
      d3.select(`#${this.selectedTrajID}`)
        .attr('stroke', this.selectedTrajColor)
      d3.select(`#overlay__${this.selectedTrajID}`)
        .style('cursor', 'auto')
      if (this.selectedChikariID) {
        this.clearSelectedChikari()
      }
      this.addAllDragDots();
    },
    
    clearSelectedChikari() {
      if (this.selectedChikariID) {
        d3.select(`#${this.selectedChikariID}`)
          .attr('stroke', this.chikariColor)
        this.selectedChikariID = undefined
      }
    },
    
    clearSelectedTraj() {
      if (this.selectedTrajID) {
        d3.select(`#${this.selectedTrajID}`)
          .attr('stroke', this.trajColor)
        this.selectedTrajID = undefined;
      }
    },
    
    clearTrajSelectPanel() {
      this.$refs.trajSelectPanel.parentSelected = false;
      this.$refs.trajSelectPanel.selectedIdx = undefined
    },

    redrawChikaris() {
      this.piece.phrases.forEach(phrase => {
        Object.keys(phrase.chikaris).forEach(key => {
          const id = 'p' + phrase.pieceIdx + '_' + Math.floor(Number(key)) + '_' +
            (Number(key) % 1).toFixed(2).toString().slice(2);
          d3.select(`#${id}`).transition().duration(this.transitionTime)
            .attr('transform', d => `translate(${this.xr()(d.x)}, ${this.yr()(d.y)})`)
          d3.select(`#circle__${id}`).transition().duration(this.transitionTime)
            .attr('cx', d => this.xr()(d.x))
            .attr('cy', d => this.yr()(d.y))
        })
      })
    },

    redrawSlide(traj, phraseStart) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => traj.articulations[key].name === 'slide')
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

      data.forEach(obj => {
        // const yMotion = obj.dirUp ? [10, -10] : [-10, 10];
        d3.select(`#slidep${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .transition().duration(this.transitionTime)
          .attr('transform', `translate(${this.xr()(obj.x)},${this.yr()(obj.y)})`)
      })
    },

    async updateTranslateExtent() {
      const rect = await this.$refs.graph.getBoundingClientRect();
      const xLim = await (this.yAxWidth * this.tx().k - this.yAxWidth) / this.tx().k;
      const yLim = await (this.xAxHeight * this.ty().k - this.xAxHeight) / this.ty().k;
      await this.zoomX.translateExtent([
        [xLim, yLim],
        [rect.width, rect.height]
      ]);
      await this.zoomY.translateExtent([
        [xLim, yLim],
        [rect.width, rect.height]
      ]);
    },

    sargamLine(y) {
      return d3.line()([
        [0, this.yr()(y)],
        [this.xr()(this.durTot), this.yr()(y)]
      ])
    },

    addSargamLines() {
      this.visibleSargam.forEach((s, i) => { // draws hoizontal sargam lines
        const logOverFund = freq => Math.log2(freq / this.piece.raga.fundamental);
        const saFilter = freq => Math.abs(logOverFund(freq) % 1) == 0;
        const paFilter = freq => Math.abs((logOverFund(freq) - (7 / 12)) % 1) == 0;
        const strokeWidth = saFilter(s) || paFilter(s) ? 2 : 1;
        this.phraseG.append('path')
          .classed(`sargamLine s${i}`, true)
          // .attr('clip-path', 'url(#clip)')
          .attr("fill", "none")
          .attr("stroke", "grey")
          .attr("stroke-width", `${strokeWidth}px`)
          .attr("stroke-linejoin", "round")
          .attr("stroke-linecap", "round")
          .attr("d", this.sargamLine(Math.log2(s)));
      })
    },
    
    playheadLine() {
      return d3.line()([
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
      d3.select('.playhead').transition().duration(this.transitionTime)
        // .attr('d', this.playheadLine(this.currentTime))
        .attr('transform', `translate(${this.xr()(this.currentTime)})`)
    },

    async redraw() {
      await this.updateTranslateExtent();
      // await this.svg.call(this.zoom.transform, d3.zoomIdentity);
      this.gx.transition().duration(this.transitionTime).call(this.xAxis, this.xr());
      this.gy.transition().duration(this.transitionTime).call(this.yAxis, this.yr());

      // await this.movePhrases();
      if (this.init) {
        this.movePhrases();
        this.init = false;
        this.codifiedXScale = this.tx().k;
        this.codifiedYScale = this.ty().k;
        this.codifiedYOffset = this.yr().invert(0);
        this.codifiedXR = this.xr();
        this.codifiedYR = this.yr();
        this.visibleSargam.forEach((s, i) => {
          d3.select(`.s${i}`).transition().duration(this.transitionTime)
            .attr('d', this.sargamLine(Math.log2(s)))
        });
      } else {
        this.slidePhrases(
          this.xr()(0) - 30, 
          this.yr()(this.codifiedYOffset),
          this.tx().k / this.codifiedXScale,
          this.ty().k / this.codifiedYScale
        )
      }
      
      if (this.piece.audioID) await this.redrawSpectrogram();
      this.redrawPlayhead();
      this.moveRegion();
    },
    
    

    xr() {
      return this.tx().rescaleX(this.x)
    },

    yr() {
      return this.ty().rescaleY(this.y)
    },

    phraseLine() {
      return d3.line()
        .x(d => this.xr()(d.x))
        .y(d => this.yr()(Math.log2(d.y)))
    },
    
    codifiedPhraseLine() {
      return d3.line()
        .x(d => this.codifiedXR(d.x))
        .y(d => this.codifiedYR(Math.log2(d.y)))
    },

    movePhrases() {


      this.piece.phrases.forEach((phrase, pIdx) => {
        phrase.trajectories.forEach((traj, tIdx) => {
          if (traj.id !== 12) {

            d3.select(`#p${pIdx}t${tIdx}`)
              .transition().duration(this.transitionTime)
              .attr("d", this.phraseLine())
            d3.select(`#overlay__p${pIdx}t${tIdx}`)
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
      d3.select('#clip>#rect')
        .attr('width', rect.width - this.yAxWidth)
        .attr('height', rect.height - this.xAxHeight)
      d3.select('#yAxisClip>#yAxisClipRect')
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
      // behind (for axes)
      this.svg.append('rect')
        .attr('id', 'behindColor')
        .attr('fill', this.axisColor)
        .attr('width', rect.width)
        .attr('height', rect.height)

      // main graph
      this.svg.append('rect')
        .attr('id', 'backColor')
        .attr('fill', this.backColor)
        .attr('width', rect.width - this.yAxWidth)
        .attr('height', rect.height - this.xAxHeight - 1)
        .attr('transform', `translate(${this.yAxWidth},${this.xAxHeight})`)
    },

    updateBackgroundColors() {
      const rect = this.rect();
      d3.select('#behindColor')
        .attr('width', rect.width)
        .attr('height', rect.height)
      d3.select('#backColor')
        .attr('width', rect.width - this.yAxWidth)
        .attr('height', rect.height - this.xAxHeight - 1)
    },

    center(e) {
      const rect = this.rect();
      if (e.sourceEvent) {
        const p = d3.pointers(e, this.svg.node());
        return [d3.mean(p, d => d[0]), d3.mean(p, d => d[1])];
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
          d3.select()
          this.gx.call(this.zoomX.translateBy, deltaX, 0);
          this.gy.call(this.zoomY.translateBy, 0, deltaY);
        } else {
          // just for in initial this.zoomX setting
          // const te = this.zoomY.translateExtent();
          // const ylim = (this.yAxWidth * this.initYScaleFactor - this.yAxWidth) / this.initYScaleFactor;
          // const y = (te[1] - te[0]) / 2;
          const x = (this.yAxWidth * k - this.yAxWidth) / k;
          this.gx.call(this.zoomX.scaleBy, k, point);
          this.gx.call(this.zoomX.translateTo, x, 0, [0, 0]);
          this.gy.call(this.zoomY.scaleBy, this.initYScaleFactor, point);
          this.gy.call(this.zoomY.translateTo, 0, this.rect().height, [0, 0])
        }
      } else if (k === 1) {
        // pure translation?
        doX && this.gx.call(this.zoomX.translateBy, (t.x - this.z.x) / this.tx().k, 0);
        doY && this.gy.call(this.zoomY.translateBy, 0, (t.y - this.z.y) / this.ty().k);
      } else {
        // if not, we're zooming on a fixed point
        doX && this.gx.call(this.zoomX.scaleBy, k, point);
        doY && this.gy.call(this.zoomY.scaleBy, k, point);
      }
      this.z = t;
      this.redraw()
    },

    getYTickLabels() {
      const saCondition = s => Math.abs(Math.log2(s / this.piece.raga.fundamental) % 1) == 0;
      const totPitches = this.piece.raga.sargamLetters.length;
      const idxOfFirst = totPitches - this.visibleSargam.findIndex(saCondition);
      const yTickLabels = this.visibleSargam.map((v, i) => {
        return this.piece.raga.sargamLetters[(idxOfFirst + i) % totPitches]
      });
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
      const beforeSilent = tIdx > 0 ? phrase.trajectories[tIdx-1].id === 12 : false;
      const afterSilent = phrase.trajectories.length > (tIdx + 1) ? phrase.trajectories[tIdx+1].id === 12 : false;
      // if before is silent, but after is not, 
      let delAfter = false;
      let newTraj = undefined;
      if (beforeSilent && !afterSilent) {
        phrase.trajectories[tIdx-1].durTot += traj.durTot;
      } else if (afterSilent && !beforeSilent) {
        phrase.trajectories[tIdx+1].durTot += traj.durTot
      } else if (beforeSilent && afterSilent) {
        phrase.trajectories[tIdx-1].durTot += traj.durTot;
        phrase.trajectories[tIdx-1].durTot += phrase.trajectories[tIdx+1].durTot;
        delAfter = true;
      } else if (!beforeSilent && !afterSilent) {
        newTraj = new Trajectory({ id: 12, durTot: traj.durTot })
      }
      
        // if before and after are silence; combine all three trajs into single
        //silent traj
      
      
      d3.select(`#${trajID}`).remove();
      d3.select(`#overlay__${trajID}`).remove();
      d3.select(`#articulations__${trajID}`).remove();
      if (!newTraj) {
        phrase.trajectories.filter(traj => traj.num > tIdx).forEach(traj => {
          const oldId = `p${pIdx}t${traj.num}`;
          const newId = `p${pIdx}t${traj.num-1}`;
          d3.select(`#${oldId}`).attr('id', newId);
          d3.select(`#overlay__${oldId}`).attr('id', `overlay__${newId}`);
          d3.select(`#articulations__${oldId}`).attr('id', `articulations__${newId}`);
          let hOffCt = 0;
          let hOnCt = 0;
          let slideCt = 0;
          Object.keys(traj.articulations).forEach(key => {
            const art = traj.articulations[key];
            if (art.name === 'pluck') {
              d3.select(`#pluck${oldId}`).attr('id', `pluck${newId}`);
            } else if (art.name === 'hammer-off') {
              d3.select(`#krintin${oldId}i${hOffCt}.hammer-off`)
                .attr('id', `krintin${newId}i${hOffCt}`);
              hOffCt++;            
            } else if (art.name === 'hammer-on') {
              d3.select(`#krintin${oldId}i${hOnCt}.hammer-on`)
                .attr('id', `krintin${newId}i${hOnCt}`);
              hOnCt++;
            } else if (art.name === 'slide') {
              d3.select(`#slide${oldId}i${slideCt}`)
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
            return traj.num !== Number(tIdx) && traj.num !== Number(tIdx+1)
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
      this.redrawPhrase(pIdx);
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
          d3.select(`#p${pIdx}t${tIdx}`)
            .datum(data)
            .attr('d', this.phraseLine())
            
          d3.select(`#overlay__${pIdx}t${tIdx}`)
            .datum(data)
            .attr('d', this.phraseLine())
        }
        this.redrawPlucks(traj, phrase.startTime)
        this.redrawKrintin(traj, phrase.startTime)
        this.redrawSlide(traj, phrase.startTime)
      //   this.addArticulations(traj, phrase.startTime)
      })
    },
    
    redrawPlucks(traj, phraseStart) {
      if (traj.id !== 12) {
        const keys = Object.keys(traj.articulations);
        const relKeys = keys.filter(key => traj.articulations[key].name === 'pluck')
        const pluckData = relKeys.map(p => {
          const normedX = Number(p) * traj.durTot;
          const y = traj.compute(normedX, true);
          return {
            x: phraseStart + traj.startTime + Number(p),
            y: y
          }
        });
        d3.select(`#pluckp${traj.phraseIdx}t${traj.num}`)
          .data(pluckData)
          .attr('transform', d => `translate(${this.xr()(d.x)}, ${this.yr()(d.y)}) rotate(90)`)
      }
    },
    
    redrawKrintin(traj, phraseStart) {
      const keys = Object.keys(traj.articulations);
      const hammerOffKeys = keys.filter(key => traj.articulations[key].name === 'hammer-off')
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
        d3.select(`.hammer-off#krintinp${traj.phraseIdx}t${traj.num}i${obj.i}`).transition().duration(this.transitionTime)
          .attr('transform', `translate(${this.xr()(obj.x)},${this.yr()(obj.y)})`)
      });
      
      const hammerOnKeys = keys.filter(key => traj.articulations[key].name === 'hammer-on')
      const hammerOnData = hammerOnKeys.map(p => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        return {
          x: phraseStart + traj.startTime + Number(normedX),
          y: y
        }
      });
      hammerOnData.forEach(obj => {
        d3.select(`.hammer-on#krintinp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('transform', `translate(${this.xr()(obj.x)},${this.yr()(obj.y)})`)
      })
      
      
    }
    
    
    
    

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

.noSelect > * {
  user-select: none;
  -moz-user-select: none;
  -webkit-user-select: none
}

* {
    -webkit-touch-callout:none;
    -webkit-user-select:none;
    -moz-user-select:none;
    -ms-user-select:none;
    user-select:none;
}

.filler {
  width: 100%;
  height: 100%;
}
</style>
