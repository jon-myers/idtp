<template>
<div class='compOuter'>
  <div class='graph' ref='graph'>
    <div class='yAxisBoxContainer'>
      <div class='emptySpace'></div>
      <div
        class='yAxisBox'
        ref='yAxisBox'
        @scroll='recordScrollY'
        @wheel='handleYAxisWheel'
        @gesturestart='preventGesture'
        @gesturechange='preventGesture'
        @gestureend='preventGesture'
        ></div>
    </div>
    <div class='restOfGraph'>
      <div
        class='xAxisBox'
        ref='xAxisBox'
        @scroll='recordScrollX'
        @wheel='handleXAxisWheel'
        @gesturestart='preventGestureStart'
        @gesturechange='preventGesture'
        @gestureend='preventGestureEnd'></div>
        <div
          class='phraseLabelsBox'
          v-show='showPhraseLabels'
          ref='phraseLabelsBox'
          @scroll='recordScrollX'>
        </div>
      <div class='transcriptionBox'
        ref='transcriptionBox'
        @scroll='recordScroll'>
        <div class='tsContainer'>
        </div>
      </div>
    </div>
  </div>
  <div class='dataViewContainer' v-if='showSwaraBox'>
    <div class='dataViewEmptySpace'></div>
    <div class='swaraBox' ref='swaraBox' v-if='showSwaraBox' @scroll='recordScrollX'>
    </div>
  </div>
  <AudioPlayback ref='audioPlayback'/>
  <SynthesisComponent ref='synth' v-if="$parent.loaded"/>
</div>
</template>

<script>
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
  savePiece,
  getAudioDBEntry
} from '@/js/serverCalls.js';

// import savedPiece from '@/assets/piece2.JSON';
import * as d3 from 'd3';

// import spectrogram from '@/assets/yaman_cqt.png';
import AudioPlayback from '@/components/AudioPlayback.vue';
import SynthesisComponent from '@/components/SynthesisComponent.vue';


const linSpace = (startValue, stopValue, cardinality) => {
  var arr = [];
  var step = (stopValue - startValue) / (cardinality - 1);
  for (var i = 0; i < cardinality; i++) {
    arr.push(startValue + (step * i));
  }
  return arr;
};

const getClosestIndex = (arr, item) => {
  const diffArr = arr.map(x => Math.abs(item - x));
  const minNumber = Math.min(...diffArr);
  const index = diffArr.findIndex(x => x === minNumber);
  return index
};

export default {
  name: 'ScrollableFixedYAxis',
  data() {
    return {
      freqMin: 100,
      freqMax: 800,
      margin: {
        top: 35,
        bottom: 20,
        left: 30,
        right: 0
      },
      timeScale: 50, // pixels per second
      octScale: 250, // pixels per octave
      minDrawDur: 0.005, // minimum duration for generating draw data coords
      xWheeling: undefined,
      showSwaraBox: false,
      rowHeight: 30,
      showPhraseDivs: true,
      showPhraseLabels: true,
      currentTime: 0,
      trajViewHover: undefined,
      trajDivDragging: false,
      minTrajDur: 0.1,
      computedDataTrick: 0,
      pickingChikari: false,
      selectedChikariID: undefined,
      placingPlayhead: undefined,
      durTot: 63,
      audioDurTot: 63,
      playhead: 0,
      trajSel: false,
      drawingNewTraj: false,
      mutableTotClicks: false
    }
  },

  components: {
    AudioPlayback, SynthesisComponent
  },

  mounted() {
    getPiece(this.$store.state._id).then(this.initializePiece);
    
    this.emitter.on('selectedTrajIdx', obj => {
      const idx = obj.idx;
      this.pluckBool = obj.pluckBool;
      this.intraTrajDursBool = obj.intraTrajDursBool;
      this.drawingNewTraj = true;
      this.clickCollection = [];
      if (idx === 0) {
        // fixed
        this.totClicks = 2;
        this.newTrajId = 0;
      } else if (idx === 1) {
        this.totClicks = 2;
        this.newTrajId = 1
      } else if (idx === 2) {
        this.totClicks = 2;
        this.newTrajId = 2
      } else if (idx === 3) {
        this.totClicks = 2;
        this.newTrajId = 3
      } else if (idx === 4) {
        this.totClicks = 3;
        this.newTrajId = 4
      } else if (idx === 5) {
        this.totClicks = 3;
        this.newTrajId = 5
      } else if (idx === 6) {
        this.totClicks = 2;
        this.mutableTotClicks = true;
        this.newTrajId = 6;
      } else if (idx === 7) {
        this.totClicks = 2;
        this.newTrajId = 7
      } else if (idx === 8) {
        this.totClicks = 3;
        this.newTrajId = 8
      } else if (idx === 9) {
        this.totClicks = 4;
        this.newTrajId = 9
      } else if (idx === 10) {
        this.totClicks = 6;
        this.newTrajId = 10;
      } else if (idx === 11) {
        this.totClicks = 2;
        this.newTrajId = 11
      }
    })
  },

  beforeUnmount() {
    this.removeNotation();
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('resize', this.handleResize)
    this.emitter.off('opacity')
    this.emitter.off('playing')
    this.emitter.off('trajHover')
    this.emitter.off('reDraw')
    this.emitter.off('deletedTraj')
    this.emitter.off('savePiece')
    this.emitter.off('audioDurTot')
    this.emitter.off('setTime')
    this.emitter.off('selectedTrajIdx')
  },

  computed: {

    height() {
      const totOcts = Math.log2(this.freqMax / this.freqMin);
      return totOcts * this.octScale;
    },

    width() {
      this.computedDataTrick;
      return this.durTot * this.timeScale;
    },

    audioWidth() {
      this.computedDataTrick;
      return this.audioDurTot * this.timeScale;
    },

    dataViewHeight() {
      return this.showSwaraBox * this.rowHeight
    },

    emptySpaceHeight() {
      return this.showPhraseLabels * this.rowHeight + this.margin.top
    }
  },

  watch: {
    octScale() {
      this.addXScale();
      this.addYScale();
      this.removeYAxis();
      this.addYAxis();
      this.removeNotation();
      this.addNotation();
      this.updateSpectrogram();
    },

    timeScale() {
      this.addXScale();
      this.addYScale();
      this.removeXAxis();
      this.addXAxis();
      this.removeNotation();
      this.addNotation();
      this.removeSwaraRow();
      this.addSwaraRow();
      this.removePhraseLabels();
      this.addPhraseLabels();
      this.updateSpectrogram();
    },

    scrollLeft() {
      this.xAxisBox.scrollLeft = this.scrollLeft;
      this.transcriptionBox.scrollLeft = this.scrollLeft
    },

    scrollTop() {
      this.yAxisBox.scrollTop = this.scrollTop;
      this.transcriptionBox.scrollTop = this.scrollTop;
    },

    trajViewHover() {
      this.resetTrajViewHover()
    },

    showPhraseDivs() {
      if (this.showPhraseDivs) {
        this.addPhraseDivs();
        this.showPhraseLabels = true;
      } else {
        this.removePhraseDivs();
        this.showPhraseLabels = false;
      }
    },

    showPhraseLabels() {
      if (this.showPhraseLabels) {
        this.addPhraseLabels()
      } else {
        this.removePhraseLabels()
      }
    },

    trajDivDragging() {
      if (this.trajDivDragging) {
        this.$refs.transcriptionBox.style.cursor = 'col-resize'
      } else {
        this.$refs.transcriptionBox.style.cursor = 'default'
      }
    },

    piece() {
    }
  },

  methods: {

    alignVertical() {
      // alters scrollTop such that the piece is all visible.
      let lowestNote, highestNote;
      this.piece.phrases.forEach(phrase => {
        phrase.trajectories.forEach(traj => {
          traj.pitches.forEach(pitch => {
            if (!lowestNote) lowestNote = pitch.frequency;
            if (!highestNote) highestNote = pitch.frequency;
            if (pitch.frequency < lowestNote) lowestNote = pitch.frequency;
            if (pitch.frequency > highestNote) highestNote = pitch.frequency;
          })
        })
      });
      const el = this.$refs.transcriptionBox;
      const pixelTop = el.scrollTop;
      const pixelBottom = pixelTop + el.getBoundingClientRect().height;
      const pixelCenter = (pixelBottom + pixelTop) / 2;
      if (this.piece.phrases[0].trajectories[0]) {
        const lowestNotePixel = Math.log2(this.freqMax/lowestNote) * this.octScale;
        const highestNotePixel = Math.log2(this.freqMax/highestNote) * this.octScale;
        const centerNotePixel = (lowestNotePixel + highestNotePixel) / 2;
        const desiredScrollTop = pixelTop + (centerNotePixel - pixelCenter);
        el.scrollTo({ top: desiredScrollTop })
      } else {
        const desiredCenter = this.height / 2;
        const desiredScrollTop = pixelTop + (desiredCenter - pixelCenter);
        el.scrollTo({ top: desiredScrollTop })
      }

    },

    async getAudioDBEntry(_id) {
      this.audioDB = await getAudioDBEntry(_id)
    },

    async initializePiece(piece) {
      let fund = 246;
      if (piece.audio_DB_ID) {
        this.audioDB = await getAudioDBEntry(piece.audio_DB_ID)
        fund = this.audioDB.fundamental;
      }

      this.$parent.loaded = true;
      await this.getPieceFromJson(piece, fund);
      if (!(typeof this.piece.audioID === 'number')) {

        if (this.piece.durTot < 10) {
          this.durTot = 10;
          this.audioDurTot = 10;
        } else {
          this.durTot = this.piece.durTot;
          this.audioDurTot = this.piece.durTot;
        }

        this.$parent.$refs.controls.durTot = this.durTot;
        this.$parent.$refs.controls.audioDurTot = this.audioDurTot;
        const minTS = this.minTimeScale();
        if (this.timeScale < minTS) this.timeScale = minTS
      }

      this.visibleSargam = this.piece.raga.getFrequencies({
        low: this.freqMin,
        high: this.freqMax
      })
      this.addXScale();
      this.addYScale();
      this.addYAxis();
      this.addXAxis();  
      this.addNotation();
      this.addPhraseLabels();
      window.addEventListener('resize', this.handleResize)
      if (typeof this.piece.audioID === 'number') {
        this.addSpectrogram();
      }
      this.emitter.on('opacity', opacity => {
        document.querySelector('.spectrogram').style.opacity = opacity
      })
      this.setInitScroll();
      this.emitter.on('playing', playing => {
        this.playing = playing;
        if (playing) {
          this.startAnimationFrame()
        } else {
          this.stopAnimationFrame()
        }
      });
      this.emitter.on('trajHover', th => {
        this.trajViewHover = th
      });
      this.emitter.on('reDraw', m => {
        if (m === 'computedTrick') {
          this.computedDataTrick++
        }
        if (this.durTot < this.piece.durTot) {
          this.durTot = this.piece.durTot;
          this.emitter.emit('durTot', this.durTot);
        }
        this.reDrawAll()
      })
      this.emitter.on('deletedTraj', () => {
        this.reDrawNotation();
        this.removePhraseLabels();
        this.addPhraseLabels();
      })
      this.emitter.off('savePiece');
      this.emitter.on('savePiece', () => {
        savePiece(this.piece)
      })

      this.emitter.on('audioDurTot', adt => {
        this.audioDurTot = adt;
        if (this.durTot < this.audioDurTot) {
          this.durTot = this.audioDurTot
        }
        this.computedDataTrick++
        this.reDrawAll()

      })

      window.addEventListener('keydown', this.handleKeyDown);

      this.emitter.on('setTime', time => {
        this.playhead = time;
        d3.select('.playhead')
          .attr('d', this.playheadLine(time))
      })
    },

    handleKeyDown(e) {
      if (e.key === 'c' && this.pickingChikari === false) {
        this.setChikari(true)
      } else if (e.key === 'c' && this.pickingChikari === true) {
        this.setChikari(false)
      } else if (e.key === 'Backspace' && this.selectedChikariID) {
        const splitArr = this.selectedChikariID.split('_');
        const pIdx = splitArr[0].slice(1);
        const key = splitArr[1] + '.' + splitArr[2];
        delete this.piece.phrases[pIdx].chikaris[key];
        this.updateChikari();
        this.selectedChikariID = undefined;
      } else if (e.key === 'Escape') {
        d3.select('#'+this.selectedChikariID).style('stroke', 'black')
        this.selectedChikariID = undefined;
      } else if (e.key === 'p') {
        this.placingPlayhead = !this.placingPlahyead;
      }
      else if (e.key === ' ') {
        e.preventDefault();
        this.$parent.$refs.controls.toggleAudio()
      }
      else if (e.key === 't') {
        this.toggleTrajSel()
      }
      if (this.mutableTotClicks) {
        if (Number.isInteger(Number(e.key)) && Number(e.key) > 1) {
          this.totClicks = Number(e.key)
        }
      }
    },

    toggleTrajSel() {
      if (this.trajSel === false) {
        this.emitter.emit('toggleTrajSel', true);
        this.trajSel = true;

      }
      else {
        this.emitter.emit('toggleTrajSel', false);
        this.trajSel = false;
        this.mutableTotClicks = false;
        this.pluckBool = undefined;
        this.intraTrajDursBool = undefined;
      }
    },

    reDrawAll() {
      this.addXScale();
      this.addYScale();
      this.reDrawNotation();
      this.removePhraseLabels();
      this.removePhraseDivs();
      this.removeXAxis();
      this.addXAxis();
      this.addPhraseDivs();
      this.addPhraseLabels();
      this.updateSpectrogram();
    },

    handleResize() {
      if (this.timeScale < this.minTimeScale()) this.timeScale = this.minTimeScale()
    },


    setChikari(bool) {
      const svg = document.querySelector('.transcriptionSvg')
      if (bool) {
        svg.style.cursor = 'cell';
        this.pickingChikari = true;
      } else {
        svg.style.cursor = 'default';
        this.pickingChikari = false;
      }

    },

    resetTrajViewHover() {
      this.removeHighlightBox();
      if (this.trajViewHover !== undefined) {
        const pIdx = this.trajViewHover[0];
        const tIdx = this.trajViewHover[1];
        const phrase = this.piece.phrases[pIdx];
        const traj = phrase.trajectories[tIdx];
        const startTime = phrase.startTime + traj.startTime;
        const endTime = startTime + traj.durTot;
        this.addHighlightBox(startTime, endTime)
        const tBox = this.$refs.transcriptionBox;
        const viewLims = this.inView();
        if (startTime < viewLims[0]) {
          const idealScroll = startTime * this.timeScale;
          tBox.scrollLeft = idealScroll;
        } else if (endTime > viewLims[1]) {
          const idealScroll = endTime * this.timeScale - tBox.getBoundingClientRect().width;
          tBox.scrollLeft = idealScroll;
        }
      }
    },

    reDrawNotation() {
      this.removeNotation();
      this.addNotation();
      this.removePhraseLabels();
      this.addPhraseLabels();
    },

    inView() {
      // return array of startTime and endTime currently in view, useful for auto scrolling stuff
      const tBox = this.$refs.transcriptionBox;
      const startTime = tBox.scrollLeft / this.timeScale;
      const width = tBox.getBoundingClientRect().width;
      const endTime = startTime + (width / this.timeScale);
      return [startTime, endTime]
    },

    addVerticalLine(loc) {
      const verticalLine = x => d3.line()([
        [this.xScale(x), 0],
        [this.xScale(x), this.height]
      ]);

      this.overlay.append('path')
        .classed('dottedVerticalLine', true)
        .attr("fill", "none")
        .attr("stroke", "grey")
        .attr("stroke-width", `2px`)
        .style('stroke-dasharray', ('3, 3'))
        .attr("d", verticalLine(loc));
    },

    handleTrajDivMouseDown(e) {
      const ps = this.piece.phrases
      const split = e.target.id.split('t');
      const pIdx = split[0].slice(1);
      const tIdx = split[1];
      const leftTraj = ps[pIdx].trajectories[tIdx];
      let rightTraj;
      if (ps[pIdx].trajectories[Number(tIdx)+1]) {
        rightTraj = ps[pIdx].trajectories[Number(tIdx)+1]
      } else if (ps[Number(pIdx)+1]) {
        rightTraj = ps[Number(pIdx)+1].trajectories[0];
        this.initChikaris = Object.assign({}, ps[Number(pIdx)+1].chikaris)
      } else {
        rightTraj = undefined
      }
      this.trajDivDragging = true;
      this.initDragX = e.clientX;
      this.dragTrajs = [leftTraj, rightTraj];
      this.clonedDragTrajs = [new Trajectory(leftTraj.getSpawnObj())];
      if (rightTraj) {
        this.clonedDragTrajs.push(new Trajectory(rightTraj.getSpawnObj()))
      } else {
        this.clonedDragTrajs.push(undefined)
      }
      if (tIdx === ps[pIdx].length-1 && ps[Number(pIdx)+1]) {
        this.clonedRightPhrase = ps[Number(pIdx)+1].getSpawnObj();
      }
      this.clonedPieceSpawnObj = this.piece.getSpawnObj();
    },

    handleTrajDivMouseMove(e) {
      if (this.trajDivDragging) {
        const deltaX = e.clientX - this.initDragX;
        const deltaTime = deltaX / this.timeScale;
        const initLeftDurTot = this.clonedDragTrajs[0].durTot;
        this.dragTrajs[0].durTot = initLeftDurTot + deltaTime;
        const initRightDurTot = this.clonedDragTrajs[1].durTot;
        this.dragTrajs[1].durTot = initRightDurTot - deltaTime;
        const pIdx = e.target.id.split('t')[0].slice(1);
        this.piece.phrases[pIdx].durArrayFromTrajectories();
        this.piece.phrases[pIdx].assignStartTimes();
        this.reDrawNotation();
      }
    },

    reanimate(pieceSpawnObj) {
      pieceSpawnObj.phrases.forEach((phrase, pIdx) => {
        phrase.trajectories.forEach((traj, tIdx) => {
          phrase.trajectories[tIdx] = new Trajectory(traj);
        });
        pieceSpawnObj.phrases[pIdx] = new Phrase(phrase);
      })
      return new Piece(pieceSpawnObj)
    },

    handleTrajDivMouseUp() {
      this.initDragX = undefined;
      this.dragTrajs = undefined;
      this.clonedDragTrajs = undefined;
      this.clonedRightPhrase = undefined;
      this.clonedPieceSpawnObj = undefined;
      this.trajDivDragging = false;
    },

    addHighlightBox(start, stop) {
      this.addVerticalLine(start)
      this.addVerticalLine(stop)


      this.overlay.append('rect')
        .classed('highlightBox', true)
        .attr('x', this.xScale(start))
        .attr('y', 0)
        .attr('width', this.xScale(stop) - this.xScale(start))
        .attr('height', this.height)
        .attr('fill', 'white')
        .attr('opacity', '0.1')

    },

    removeHighlightBox() {
      this.removeVerticalLines();
      d3.selectAll('.highlightBox').remove()
    },

    removeVerticalLines() {
      d3.selectAll('.dottedVerticalLine').remove()
    },

    loopAnimationFrame() {
      
      this.requestId = undefined;
      this.playhead = this.$refs.audioPlayback.audioElement ? 
                this.$refs.audioPlayback.audioElement.currentTime :
                this.playheadStart + this.$refs.synth.ac.currentTime - this.animationStart;
      d3.select('.playhead')
        .attr('d', this.playheadLine(this.playhead))

      
      const el = this.$refs.transcriptionBox;
      const currentScroll = el.scrollLeft;
      const width = el.getBoundingClientRect().width;
      const currentEndTime = (currentScroll + width) / this.timeScale;
      if (this.playhead >= currentEndTime) {
        const newScrollLeft = this.playhead * this.timeScale - 0.1 * width;
        // const delta = newScrollLeft - currentScroll;
        el.scrollTo({ left: newScrollLeft });
      }
      this.startAnimationFrame();
    },

    startAnimationFrame() {
      this.animationStart = this.$refs.synth.ac.currentTime;
      this.playheadStart = this.playhead;
      if (!this.requestId) {
        this.requestId = window.requestAnimationFrame(this.loopAnimationFrame)
      }
    },

    stopAnimationFrame() {
      if (this.requestId) {
        window.cancelAnimationFrame(this.requestId);
        this.requestId = undefined;
      }
    },

    addSpectrogram() {
      const img = document.createElement('img');
      img.classList.add('spectrogram');
      img.src = `https://swara.studio/spectrograms/${this.piece.audioID}.png`;
      img.width = this.audioWidth;
      img.height = this.height;
      img.style.position = 'absolute';
      img.style.left = '0px';
      img.style.top = '0px';
      img.style.opacity = 0;
      img.style.zIndex = 1;
      img.style.pointerEvents = 'none';

      document.querySelector('.tsContainer')
        .append(img)
    },

    updateSpectrogram() {
      if (typeof this.piece.audioID === 'number') {
        const img = document.querySelector('.spectrogram');
        img.height = this.height;
        img.width = this.audioWidth;
      }
    },

    minTimeScale() {
      const rect = this.$refs.graph.getBoundingClientRect();
      return (rect.width - this.margin.left) / this.durTot;
    },

    minOctScale() {
      const rect = this.$refs.graph.getBoundingClientRect();
      return (rect.height - this.margin.top) / (this.freqMax / this.freqMin)
    },

    getPieceFromJson(piece, fundamental) {
      if (fundamental) piece.raga.fundamental = fundamental;
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
      this.fixTrajs();
      this.emitter.emit('newPiece', this.piece);

    },

    addYAxis() {
      const yAxis = d3.select(this.$refs.yAxisBox)
        .append('svg')
        .classed('yAxisSvg', true)
        .attr('height', this.height)
        .attr('width', this.margin.left)
        .append('g')
        .attr('transform', `translate(${this.margin.left-0.5}, ${0})`)
      const saCondition = s => Math.abs(Math.log2(s / this.piece.raga.fundamental) % 1) == 0;
      const totPitches = this.piece.raga.sargamLetters.length;
      const idxOfFirst = totPitches - this.visibleSargam.findIndex(saCondition);
      const yTickLabels = this.visibleSargam.map((v, i) => this.piece.raga.sargamLetters[(idxOfFirst + i) % totPitches])
      const axis = d3.axisLeft()
        .scale(this.yScale)
        .tickValues(this.visibleSargam.map(f => Math.log2(f)))
        .tickFormat((_, i) => yTickLabels[i])
      yAxis.call(axis)
        .selectAll('text')
        .style('text-anchor', 'end')
        .style('position', 'fixed')
    },

    removeYAxis() {
      d3.select('.yAxisSvg').remove()
    },

    addXAxis() {
      // const minTS = this.minTimeScale();
      // if (this.timeScale < minTS) this.timeScale = minTS
      const xAxis = d3.select(this.$refs.xAxisBox)
        .append('svg')
        .classed('xAxisSvg', true)
        .attr('height', this.margin.top)
        .attr('width', this.width)
        .append('g')
        .classed('xAxisSvgInner', true)
        .attr('transform', `translate(0, ${this.margin.top-0.5})`)
        .attr('height', this.margin.top)
        .attr('width', this.width)
      const axis = d3.axisTop()
        .scale(this.xScale)
        .ticks(this.width/120)
        // .scale(this.xScale)
        // .tickValues(Array.from({
        //   length: seconds
        // }, (_, i) => i + 1))
      xAxis.call(axis)
        .selectAll('text')
        .style('text-anchor', 'middle')
        .style('position', 'fixed')
    },

    addXScale() {
      this.xScale = d3.scaleLinear()
        .domain([0, this.durTot])
        .range([0, this.width])
    },

    addYScale() {
      this.yScale = d3.scaleLinear()
        .domain([Math.log2(this.freqMin), Math.log2(this.freqMax)])
        .range([this.height, 0])
    },

    removeXAxis() {
      d3.select('.xAxisSvg').remove()
    },

    addPhrases() {
      const line = d3.line()
        .x(d => this.xScale(d.x))
        .y(d => this.yScale(Math.log2(d.y)))

      const timePts = Math.round(this.durTot / this.minDrawDur);
      const drawTimes = linSpace(0, this.durTot, timePts);


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
            this.transcription.append("path")
              .datum(data)
              .classed('phrase', true)
              .attr('id', `p${pIdx}t${tIdx}`)
              .attr("fill", "none")
              .attr("stroke", "midnightblue")
              .attr("stroke-width", '3px')
              .attr("stroke-linejoin", "round")
              .attr("stroke-linecap", "round")
              .attr("d", line)
            this.addArticulations(traj, phrase.startTime);
          }
        })
      })
    },

    phraseIdxFromTime(time) {
      return this.piece.phrases.filter(phrase => {
        const a = time >= phrase.startTime;
        const b = time < phrase.startTime + phrase.durTot;
        return a && b
      })[0].pieceIdx
    },

    handleMouseMove(e) {
      if (this.$parent.showTrajView) {

        if (!this.trajDivDragging) {
          const x = e.offsetX;
          const xTime = x / this.timeScale;

          if (xTime < this.piece.durTot) {
            const pIdx = this.phraseIdxFromTime(xTime)
            let tIdx = this.piece.phrases[pIdx].trajectories.filter(traj => {
              const startTime = this.piece.phrases[pIdx].startTime + traj.startTime
              const testA = xTime >= startTime;
              const testB = xTime < startTime + traj.durTot;
              return testA && testB
            });
            if (!tIdx[0]) {
              console.log('this is a problem')
            }
            tIdx = tIdx[0].num;
            const oldTVH = this.trajViewHover ? [...this.trajViewHover] : undefined;
            this.trajViewHover = [pIdx, tIdx];
            if (this.trajViewHover !== oldTVH) {
              this.emitter.emit('trajHighlight', `p${pIdx}t${tIdx}`)
            }
          } else {
            this.emitter.emit('trajHighlight', 'off');
            this.trajViewHover = undefined;

          }


        } else {
          this.emitter.emit('trajHighlight', `p${this.trajViewHover[0]}t${this.trajViewHover[1]}`);
          this.$nextTick(() => this.resetTrajViewHover())
          this.emitter.emit('changedTimings')
        }
      }
      if (this.trajDivDragging) {
        const deltaX = e.clientX - this.initDragX;
        let deltaTime = deltaX / this.timeScale;
        const initLeftDurTot = this.clonedDragTrajs[0].durTot;
        const initRightDurTot = this.clonedDragTrajs[1].durTot;
        const maxTime = initRightDurTot - this.minTrajDur;
        const minTime = this.minTrajDur - initLeftDurTot;
        if (deltaTime > maxTime) deltaTime = maxTime;
        if (deltaTime < minTime) deltaTime = minTime;

        this.dragTrajs[0].durTot = initLeftDurTot + deltaTime;
        this.dragTrajs[1].durTot = initRightDurTot - deltaTime;
        const pIdx = this.dragTrajs[0].phraseIdx;
        if (pIdx === this.dragTrajs[1].phraseIdx) {
          this.piece.phrases[pIdx].durArrayFromTrajectories();
          this.piece.phrases[pIdx].assignStartTimes();
          this.reDrawNotation();
        } else {
          this.piece.phrases[pIdx].durArrayFromTrajectories();
          this.piece.phrases[pIdx].assignStartTimes();
          this.piece.phrases[Number(pIdx)+1].durArrayFromTrajectories();
          this.piece.phrases[Number(pIdx)+1].assignStartTimes();
          this.piece.phrases[Number(pIdx)+1].offsetChikaris(deltaTime, this.initChikaris);
          this.piece.durArrayFromPhrases();
          this.piece.updateStartTimes();
          this.reDrawNotation();
        }
      }
    },

    fixChikari() {
      this.piece.phrases.forEach(phrase => {
        Object.keys(phrase.chikaris).forEach(chikari => {
          phrase.chikaris[chikari].pitches = this.piece.raga.chikariPitches
        })
      })
    },


    handleClick(e) {
      const time = e.offsetX / this.timeScale;
      const pIdx = this.phraseIdxFromTime(time);

      if (this.pickingChikari) {
        const phrase = this.piece.phrases[pIdx];
        const fixedTime = (time - phrase.startTime).toFixed(2);
        this.piece.phrases[pIdx].chikaris[fixedTime] = new Chikari({
          'fundamental': this.piece.raga.fundamental,
          'pitches': this.piece.raga.chikariPitches
        });
        this.updateChikari()
        this.setChikari(false)
      }

      if (this.placingPlayhead) {
        this.emitter.emit('setTime', time)
        this.playhead = time;
        d3.select('.playhead')
          .attr('d', this.playheadLine(time))
        this.placingPlayhead = false
      }

      if (this.drawingNewTraj) {
        const tIdx = this.piece.phrases[pIdx].trajectories.filter(traj => {
          const startTime = this.piece.phrases[pIdx].startTime + traj.startTime
          const testA = time >= startTime;
          const testB = time < startTime + traj.durTot;
          return testA && testB
        })[0].num;
        const traj = (pIdx || pIdx === 0) && (tIdx || tIdx === 0) ? this.piece.phrases[pIdx].trajectories[tIdx] : undefined;
        if (traj.id === 12) {
          const clickFreq = 2 ** (Math.log2(this.freqMax) - (e.offsetY / this.octScale));
          const closestIndex = getClosestIndex(this.piece.raga.getFrequencies(), clickFreq);
          const pitch = this.piece.raga.getPitches()[closestIndex];
          this.clickCollection.push({ time: time, pitch: pitch });
          if (this.clickCollection.length === this.totClicks) {
            this.insertNewTraj(pIdx, tIdx);
            this.toggleTrajSel();
            this.totClicks = undefined;
          }
        }
      }
    },

    insertNewTraj(pIdx, tIdx) {
      const phrase = this.piece.phrases[pIdx];
      const origTraj = phrase.trajectories[tIdx];
      const otStart = origTraj.startTime + phrase.startTime;
      const otEnd = otStart + origTraj.durTot;
      const minTrajDur = 0.15;
      const magnetStart = this.clickCollection[0].time - otStart < minTrajDur;
      const magnetEnd = otEnd - this.clickCollection.slice(-1)[0] < minTrajDur;
      const trajs = [];
      let durTot1;
      if (!magnetStart) {
        const durTot0 = this.clickCollection[0].time - otStart;
        trajs.push(new Trajectory({ id: 12, pitches: [], durTot: durTot0 }));
        if (!magnetEnd) {
          durTot1 = this.clickCollection.slice(-1)[0].time - this.clickCollection[0].time
        } else {
          durTot1 = otEnd - this.clickCollection[0].time
        }
      } else {
        if (!magnetEnd) {
          durTot1 = this.clickCollection.slice(-1)[0].time - otStart;
        } else {
          durTot1 = otEnd - otStart
        }
      }
      let pitches1 = this.clickCollection.map(cc => cc.pitch);
      if (this.newTrajId === 0) pitches1 = pitches1.slice(0, 1);
      
      let durArray;
      if (this.intraTrajDursBool && this.newTrajId > 3 && this.newTrajId <= 6) {
        durArray = this.clickCollection.slice(1).map((click, i) => {
            return click.time - this.clickCollection[i].time
          })
        const sum = durArray.reduce((a, b) => a + b, 0);
        durArray = durArray.map(dur => dur / sum)        
      } else {
        durArray = undefined
      }
      
      
      const arts = this.pluckBool ? 
        { 0: new Articulation({name: 'pluck', stroke: 'd'}) } :
        {};
        
      trajs.push(new Trajectory({ 
        id: this.newTrajId, 
        pitches: pitches1, 
        durTot: durTot1,
        durArray: durArray,
        articulations: arts
      }));
      if (!magnetEnd) {
        const durTot2 = otStart + origTraj.durTot - this.clickCollection.slice(-1)[0].time;
        trajs.push(new Trajectory({ id: 12, pitches: [], durTot: durTot2 }));
      }  
      phrase.trajectories.splice(tIdx, 1, ...trajs);
      phrase.durArrayFromTrajectories();
      phrase.assignStartTimes();
      phrase.assignTrajNums();
      this.piece.durArrayFromPhrases(); // might not need this
      this.piece.updateStartTimes(); // might not need this
      this.emitter.emit('reDraw')
      // this.computedDataTrick++; // might not need this
      // this.reDrawAll();


    },

    handleMouseUp() {
      if (this.trajDivDragging) {
        this.initDragX = undefined;
        this.dragTrajs = undefined;
        this.clonedDragTrajs = undefined;
        this.clonedRightPhrase = undefined;
        this.clonedPieceSpawnObj = undefined;
        this.trajDivDragging = false;
        this.initChikaris = false
      }
    },

    handleMouseLeave() {
      if (this.$parent.showTrajView) {
        this.emitter.emit('trajHighlight', 'off');
        if (!this.dragTrajs) this.trajViewHover = undefined;
      }
    },

    addMarkers() {
      const markerBoxWidth = 4;
      const markerBoxHeight = 4;
      const refX = markerBoxWidth / 2;
      const refY = markerBoxHeight / 2;
      // const markerWidth = markerBoxWidth / 2;
      // const markerHeight = markerBoxHeight / 2;
      const arrowPoints = [[0, 0], [0, 4], [4, 2]];

      this.transcription
        .append('defs')
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

    addChikari() {

      const sym = d3.symbol().type(d3.symbolX).size(50);

      this.piece.phrases.forEach(phrase => {
        Object.keys(phrase.chikaris).forEach(key => {
          const scaledX = Number(key) / phrase.durTot;
          const dataObj = {
            x: Number(key)+phrase.startTime,
            y: phrase.compute(scaledX, true)
          };
          const id = 'p' + phrase.pieceIdx + '_' + Math.floor(Number(key)) + '_' + (Number(key)%1).toFixed(2).toString().slice(2);

          this.transcription.append('g')
            .classed('chikari', true)
            .append('path')
            .attr('id', id)
            .attr('d', sym)
            .attr('stroke', 'black')
            .attr('stroke-width', 1.5)
            .data([dataObj])
            .attr('transform', d => `translate(${this.xScale(d.x)}, ${this.yScale(d.y)})`)
            // .on('mouseover', this.handleMouseOver)
            // .on('mouseout', this.handleMouseOut)
            // .on('click', this.handleClickChikari)

          this.transcription.append('g')
            .classed('chikari', true)
            .append('circle')
            .attr('id', 'circle__' + id)
            .attr('stroke', 'green')
            .style('opacity', '0')
            .data([dataObj])
            .attr('cx', d => this.xScale(d.x))
            .attr('cy', d => this.yScale(d.y))
            .attr('r', 6)
            .on('mouseover', this.handleMouseOver)
            .on('mouseout', this.handleMouseOut)
            .on('click', this.handleClickChikari)



        })
      })
    },

    updateChikari() {
      d3.selectAll('.chikari').remove();
      this.addChikari()
    },

    handleMouseOver(e) {
      const xTargetID = e.target.id.split('__')[1];
      d3.select('#'+xTargetID).style('stroke', 'red')
      d3.select('#'+e.target.id).style('cursor', 'pointer')
    },

    handleMouseOut(e) {
      if (this.selectedChikariID && this.selectedChikariID === e.target.id.split('__')[1]) {
        return
      } else {
        d3.select('#'+e.target.id.split('__')[1]).style('stroke', 'black')
        d3.select('#'+e.target.id).style('cursor', 'default')
      }
    },

    handleClickChikari(e) {
      if (this.selectedChikariId !== e.target.id.split('__')[1]) {
        d3.select('#'+this.selectedChikariID).style('stroke', 'black')
      }
      this.selectedChikariID = e.target.id.split('__')[1];
    },

    addArticulations(traj, phraseStart) {
      this.addPlucks(traj, phraseStart)
      this.addKrintin(traj, phraseStart)
      this.addSlide(traj, phraseStart)
    },

    addPlucks(traj, phraseStart) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => traj.articulations[key].name === 'pluck')
      const pluckData = relKeys.map(p => {
        const normedX = Number(p) * traj.durTot;
        const y = traj.compute(normedX, true);
        return { x: phraseStart + traj.startTime + Number(p), y: y }
      });
      const sym = d3.symbol().type(d3.symbolTriangle).size(20);

      this.transcription.append('g')
      .classed('articulation', true)
      .classed('pluck', true)
      .append('path')
      .attr('d', sym)
      .attr('stroke', 'black')
      .attr('stroke-width', 1.5)
      .attr('fill', 'black')
      .data(pluckData)
      .attr('transform', d => `translate(${this.xScale(d.x)}, ${this.yScale(d.y)}) rotate(90)`)
    },

    addKrintin(traj, phraseStart) {
      // hammer-offs
      const keys = Object.keys(traj.articulations);
      const hammerOffKeys = keys.filter(key => traj.articulations[key].name === 'hammer-off')
      const hammerOffData = hammerOffKeys.map(p => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p-0.01, true);
        return {
          x: this.xScale(phraseStart + traj.startTime + Number(normedX)),
          y: this.yScale(y) }
      });
      const offOffset = { x: 0, y: 0 };
      hammerOffData.forEach(obj => {
        this.transcription.append('path')
          .classed('articulation', true)
          .classed('hammer-off', true)
          .attr('d', d3.line()([
            [obj.x - 10 + offOffset.x, obj.y + offOffset.y],
            [obj.x + offOffset.x, obj.y + offOffset.y],
            [obj.x + offOffset.x, obj.y + 10 + offOffset.y]]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .attr('marker-end', 'url(#arrow)')
      })

      // hammer-ons
      const hammerOnKeys = keys.filter(key => traj.articulations[key].name === 'hammer-on')
      const hammerOnData = hammerOnKeys.map(p => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p-0.01, true);
        return {
          x: this.xScale(phraseStart + traj.startTime + Number(normedX)),
          y: this.yScale(y) }
      });
      const onOffset = { x: 0, y: 0 };
      hammerOnData.forEach(obj => {
        this.transcription.append('path')
          .classed('articulation', true)
          .classed('hammer-on', true)
          .attr('d', d3.line()([
            [obj.x - 10 + onOffset.x, obj.y + onOffset.y],
            [obj.x + onOffset.x, obj.y + onOffset.y],
            [obj.x + onOffset.x, obj.y - 10 + onOffset.y]]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .attr('marker-end', 'url(#arrow)')
      })
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

    addSlide(traj, phraseStart) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => traj.articulations[key].name === 'slide')
      const data = relKeys.map(p => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p-0.01, true);
        const dirUp = y < traj.compute(p, true);
        return {
          x: this.xScale(phraseStart + traj.startTime + Number(normedX)),
          y: this.yScale(y),
          dirUp: dirUp
         }
      });
      const offset = { x: 0, y: 0 };

      data.forEach(obj => {
        const yMotion = obj.dirUp ? [10, -10] : [-10, 10];
        this.transcription.append('path')
          .classed('articulation', true)
          .classed('hammer-off', true)
          .attr('d', d3.line()([
            [obj.x + offset.x, obj.y + yMotion[0] + offset.y],
            [obj.x + offset.x, obj.y + yMotion[1] + offset.y]]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .attr('marker-end', 'url(#arrow)')
      })
    },

    addNotation() {
      this.transcription = d3.select('.tsContainer')
        .append('svg')
        .classed('transcriptionSvg', true)
        .attr('ref', 'transcriptionSvg')
        .attr('height', this.height)
        .attr('width', this.width)
        .style('top', '0px')
        .style('left', '0px')
        .style('position', 'absolute')
        .style('z-index', '0')
        .on('mousemove', this.handleMouseMove)
        .on('mouseleave', this.handleMouseLeave)
        .on('mouseup', this.handleMouseUp)
        .on('click', this.handleClick)

      this.addMarkers();
      this.addSargamLines();
      this.addPhrases();
      this.addDataSet();
      this.addOverlay();
      this.addTrajDivs();
      this.addChikari();
      if (this.showPhraseDivs) this.addPhraseDivs();
      if (!document.querySelector('.playhead')) this.addPlayhead();
    },

    addTrajDivs() {

      const verticalLine = x => d3.line()([
        [this.xScale(x), 0],
        [this.xScale(x), this.height]
      ]);

      this.piece.phrases.forEach((phrase, pIdx, pArr) => {
        phrase.trajectories.forEach((traj, tIdx, tArr) => {
          if (!((pIdx === pArr.length-1) && (tIdx == tArr.length-1))) {
            const endTime = phrase.startTime + traj.startTime + traj.durTot;
            this.transcription.append('path')
                .classed('trajDiv', true)
                .attr('id', `p${pIdx}t${tIdx}`)
                .attr('fill', 'none')
                .attr('stroke', 'black')
                .style('opacity', '0')
                .style('cursor', 'col-resize')
                .attr("stroke-width", `8px`)
                .attr('d', verticalLine(endTime))
                .on('mousedown', this.handleTrajDivMouseDown)
                .on('mousemove', this.handleTrajDivMouseMove)
                .on('mouseup', this.handleTrajDivMouseUp)
          }
        })
      })


    },

    addOverlay() {
      // adds an svg that sits on top of spectrogram (z-index 2), to hold the
      // phrase divs, and the playback indicator, so they don't get hidden by
      // full opacity spectrogram

      this.overlay = d3.select('.tsContainer')
        .append('svg')
        .classed('overlaySvg', true)
        .attr('ref', 'overlaySvg')
        .attr('height', this.height)
        .attr('width', this.width)
        .style('top', '0px')
        .style('left', '0px')
        .style('position', 'absolute')
        .style('z-index', '2')
        .style('pointer-events', 'none')

    },

    removeOverlay() {
      d3.select('.overlaySvg').remove()
    },

    addPlayhead() {
      this.playheadLine = x => d3.line()([
        [this.xScale(x), 0],
        [this.xScale(x), this.height]
      ]);

      d3.select('.overlaySvg')
        .append('path')
        .classed('playhead', true)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", `2px`)
        .attr('d', this.playheadLine(this.currentTime))

    },

    // playheadTrans() {
    //   return d3.transition().duration(10000).ease(d3.easeLinear)
    // },
    //
    // stopPlayheadTransition() {
    //   d3.select('.playhead').interrupt()
    // },

    // updatePlayhead() {
    //   d3.select('.playhead').transition(this.playheadTrans())
    //     .attr('d', this.playheadLine(this.currentTime))
    // },

    removePlayhead() {
      d3.select('.overlaySvg').remove()
    },

    addPhraseDivs() {
      const phraseDivLine = x => d3.line()([
        [this.xScale(x), 0],
        [this.xScale(x), this.height]
      ]);

      this.piece.phrases.forEach((phrase) => {
        // if (idx !== this.piece.phrases.length-1) {
          const endTime = phrase.startTime + phrase.durTot;

          this.overlay.append('path')
            .classed('phraseDivLine', true)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", `2px`)
            .attr("d", phraseDivLine(endTime));
        // }
      })
    },

    removePhraseDivs() {
      d3.selectAll('.phraseDivLine').remove()
    },

    removeNotation() {
      d3.select('.transcriptionSvg').remove();
      d3.select('.overlaySvg').remove()
    },

    addPhraseLabels() {
      d3.select('.phraseLabelsBox')
        .append('svg')
        .classed('phraseLabelsSvg', true)
        .attr('height', this.rowHeight-2)
        .attr('width', this.width)


      const phraseDivLine = x => d3.line()([
        [this.xScale(x), 0],
        [this.xScale(x), this.rowHeight-2]
      ]);

      this.piece.phrases.forEach((phrase, idx) => {
        // if (idx !== this.piece.phrases.length-1) {
          const endTime = phrase.startTime + phrase.durTot;

          d3.select('.phraseLabelsSvg')
            .append('path')
            .classed('phraseLabelDivLine', true)
            .attr('fill', 'none')
            .attr('stroke', 'black')
            .attr('stroke-width', '2px')
            .attr('d', phraseDivLine(endTime))
          const phraseText = phrase.durTot * this.timeScale < 70 ? idx+1 : `Phrase ${idx+1}`;
          const midPoint = phrase.startTime + phrase.durTot / 2;
          d3.select('.phraseLabelsSvg')
            .append('text')
            .text(phraseText)
            .attr('transform', `translate(${this.xScale(midPoint)},${this.rowHeight/2})`)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
        // }
      })
    },

    removePhraseLabels() {
      d3.select('.phraseLabelsSvg').remove()
    },

    addDataSet() {
      this.addSwaraRow();
    },

    addSwaraRow() {
      this.swaraBox = d3.select(this.$refs.swaraBox)
        .append('svg')
        .classed('swaraRowSvg', true)
        .attr('ref', 'swaraRowSvg')
        .attr('height', this.rowHeight)
        .attr('width', this.width)

      this.piece.phrases.forEach(phrase => {
        const swara = phrase.swara;
        swara.forEach(s => {
          const idx = s.pitch.swara;
          const abrv = this.piece.raga.sargamLetters[idx];
          d3.select('.swaraRowSvg')
            .append('text')
            .text(abrv)
            .attr('transform', `translate(${this.xScale(s.time)}, ${this.rowHeight/2})`)
            .attr('text-anchor', 'middle')
        })
      })

    },

    removeSwaraRow() {
      d3.select('.swaraRowSvg').remove()
    },

    recordScroll(e) {
      this.$refs.xAxisBox.scrollLeft = e.target.scrollLeft;
      this.$refs.yAxisBox.scrollTop = e.target.scrollTop;
      this.$refs.phraseLabelsBox.scrollLeft = e.target.scrollLeft;
      if (this.showSwaraBox) {
        this.$refs.swaraBox.scrollLeft = e.target.scrollLeft;
      }

    },

    setInitScroll() {
      // const tBox = document.querySelector('.transcriptionBox');
      // const smallHeight = tBox.getBoundingClientRect().height;
      // const scrollVal = (this.height - smallHeight) / 2;
      // this.$refs.yAxisBox.scrollTop = scrollVal;
      // this.$refs.transcriptionBox.scrollTop = scrollVal;
      this.alignVertical()

    },

    recordScrollX(e) {
      this.$refs.transcriptionBox.scrollLeft = e.target.scrollLeft;
    },

    recordScrollY(e) {
      this.$refs.transcriptionBox.scrollTop = e.target.scrollTop;
    },

    handleXAxisWheel(e) {
      e.preventDefault()
      const newTS = this.timeScale / 2 ** (e.deltaY / 40)
      this.timeScale = newTS < this.minTimeScale() ? this.minTimeScale() : newTS;
    },

    handleYAxisWheel(e) {
      e.preventDefault()
      const newOS = this.octScale / 2 ** (e.deltaY / 40)
      this.octScale = newOS < this.minOctScale() ? this.minOctScale() : newOS
    },

    preventGestre(e) {
      return e.preventDefault()
    },

    addSargamLines() {
      const sargamLine = (y) => d3.line()([
        [0, this.yScale(y)],
        [this.width, this.yScale(y)]
      ]);

      this.visibleSargam.forEach((s) => { // draws hoizontal sargam lines
        const logOverFund = freq => Math.log2(freq / this.piece.raga.fundamental);
        const saFilter = freq => Math.abs(logOverFund(freq) % 1) == 0;
        const paFilter = freq => Math.abs((logOverFund(freq) - (7 / 12)) % 1) == 0;
        const strokeWidth = saFilter(s) || paFilter(s) ? 2 : 1;

        this.transcription.append("path")
          .classed('sargamLine', true)
          .attr("fill", "none")
          .attr("stroke", "grey")
          .attr("stroke-width", `${strokeWidth}px`)
          .attr("stroke-linejoin", "round")
          .attr("stroke-linecap", "round")
          .attr("d", sargamLine(Math.log2(s)));
      });
    },

    removeSargamLines() {
      d3.selectAll('.sargamLine').remove()
    }


  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.compOuter {
  background-color: aliceblue;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: scroll;
  border-bottom: 1px solid black;
  border-top: 1px solid black;
}

.graph {
  width: 100%;
  height: calc(100% - v-bind(dataViewHeight  +'px'));
  display: flex;
  flex-direction: row;
}

.yAxisBox {
  width: v-bind(margin.left+'px');
  min-width: v-bind(margin.left+'px');
  height: calc(100% - v-bind(margin.top + 'px'));
  overflow: scroll;
  scrollbar-width: none;
}

.yAxisBox::-webkit-scrollbar {
  display: none;
}

.yAxisBoxContainer {
  width: v-bind(margin.left+'px');
  min-width: v-bind(margin.left+'px');
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #E09540;
}

.emptySpace {
  width: v-bind(margin.left+'px');
  min-width: v-bind(margin.left+'px');
  height: v-bind(emptySpaceHeight+'px');
  min-height: v-bind(emptySpaceHeight+'px');
  background-color: black;
}

.xAxisBox {
  width: 100%;
  height: v-bind(margin.top+'px');
  background-color: #E09540;
  overflow: scroll;
  scrollbar-width: none;
  overflow-y: hidden;
}

.xAxisBox::-webkit-scrollbar {
  display: none
}

.restOfGraph {
  width: calc(100% - v-bind(margin.left+'px'));
  overflow: hidden;
}

.transcriptionBox {
  width: 100%;
  height: calc(100% - v-bind(emptySpaceHeight+'px'));
  overflow: scroll;
  /* scroll-behavior: smooth; */
}

/* .transcriptionSvg {
  background: url(v-bind(spectrogram))
} */

.swaraBox {
  width: 100%;
  height: v-bind(dataViewHeight + 'px');
  background-color: lightgreen;
  overflow: scroll;
}

.dataViewContainer {
  width: 100%;
  height: v-bind(dataViewHeight + 'px');
  display: flex;
  flex-direction: row;
}

.dataViewEmptySpace {
  width: v-bind(margin.left + 'px');
  min-width: v-bind(margin.left + 'px');
  height: v-bind(dataViewHeight + 'px');
  background-color: black;
}

.phraseLabelsBox {
  width: 100%;
  height: v-bind(rowHeight-2 + 'px');
  border-bottom: 2px solid black;
  overflow: scroll;
  background-color: white;
  scrollbar-width: none;
}

.phraseLabelsBox::-webkit-scrollbar {
  display: none;
}

/* .spectrogramImg {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1
} */

/* .transcriptionSvg {
  position: absolute;
  left: 0;
  top: 30px;
  z-index: 0
} */

.tsContainer {
  position: relative;
}

.chikari:hover {
  stroke: 'red'
}

/*
.tsContainer {
  width: v-bind(width+'px');
  height: v-bind(height+'px');
} */

</style>
