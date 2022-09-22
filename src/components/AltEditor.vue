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
    </div>
  </div>
</div>
<EditorAudioPlayer
  ref='audioPlayer'
  :audioSource='audioSource'
  />
</template>
<script>
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

const cumsum = (sum => value => sum += value)(0);

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
import * as d3 from 'd3';
export default {
  name: 'AltEditor',

  data() {
    return {
      piece: undefined,
      durTot: 600,
      freqMin: 100,
      freqMax: 800,
      backColor: '#fab6c3',
      axisColor: '#c4b18b',
      yAxWidth: 30,
      xAxHeight: 30,
      minDrawDur: 0.005, //this could be smaller, potentially, might be more efficient
      initViewDur: 10,
      initYScaleFactor: 2,
      initXScaleFactor: 1,
      d3: d3,
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
      selectedTraj: undefined
    }
  },
  
  components: {
    EditorAudioPlayer
  },
  
  created() {
    window.addEventListener('keydown', this.handleKeydown)
  },

  async mounted() {
    this.d3 = d3;
    window.addEventListener('resize', this.resize);

    const piece = await getPiece(this.$store.state._id);
    if (piece.audioID) {
      this.audioSource = `https://swara.studio/audio/mp3/${piece.audioID}.mp3`;
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
    

  },

  unmounted() {
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.handleKeydown);
  },

  watch: {
    spectrogramOpacity(newVal) {
      d3.selectAll('.spectrogram')
        .style('opacity', newVal)
    }
  },

  methods: {
    
    async savePiece() {
      const result = await savePiece(this.piece);
      this.dateModified = new Date(result.dateModified);
    },
    
    handleKeydown(e) {
      if (e.key === ' ') {
        this.$refs.audioPlayer.togglePlay()
      } else if (e.key === 'Escape') {
        this.clearSelectedChikari();
        this.clearSelectedTraj();
        if (this.setChikari) {
          this.setChikari = false;
          this.svg.style('cursor', 'auto')
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
              this.cumulativeWidths = [0].concat(unscaledWidths.map(cumsum).slice(0, unscaledWidths.length - 1))
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
      // console.log('this is getting called')
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

    async initializePiece() {
      this.visibleSargam = this.piece.raga.getFrequencies({
        low: this.freqMin,
        high: this.freqMax
      })
      const rect = this.rect();
      this.svg = d3.create('svg')
        .attr('viewBox', [0, 0, rect.width, rect.height - 1])
        .on('click', this.handleClick)
        
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
      this.addSargamLines();
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
      // console.log(z)
      const graphX = z.clientX - this.yAxWidth;
      const time = this.xr().invert(z.clientX);
      if (graphX >= 0) {
        this.currentTime = time;
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
        const num = (Number(fixedTime) % 1).toFixed(2).toString().slice(2);
        const id = `p${phrase.pieceIdx}_${Math.floor(Number(fixedTime))}_${num}`;   
             
        this.svg.append('g')
          .classed('chikari', true)
          .attr('clip-path', 'url(#clip)')
          .append('path')
          .attr('id', id)
          .attr('d', sym)
          .attr('stroke', this.chikariColor)
          .attr('stroke-width', 3)
          .attr('stroke-linecap', 'round')
          .data([dataObj])
          .attr('transform', d => `translate(${this.xr()(d.x)},${this.yr()(d.y)})`)
          
        this.svg.append('g')
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

    addPhrases() {
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
            this.svg.append('path')
              .datum(data)
              .classed('phrase', true)
              .attr('clip-path', 'url(#clip)')
              .attr('id', `p${pIdx}t${tIdx}`)
              .attr("fill", "none")
              .attr("stroke", this.trajColor)
              .attr("stroke-width", '3px')
              .attr("stroke-linejoin", "round")
              .attr("stroke-linecap", "round")
              .attr("d", this.phraseLine())
              
            this.svg.append('path')
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
      const g = this.svg.append('g')
        .attr('id', `articulations__p${traj.phraseIdx}t${traj.num}`)
        .attr('clip-path', 'url(#clip)')
      this.addPlucks(traj, phraseStart, g)
      this.addKrintin(traj, phraseStart, g)
      this.addSlide(traj, phraseStart, g)
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

    movePlucks(traj) {
      d3.select(`#pluckp${traj.phraseIdx}t${traj.num}`).transition().duration(this.transitionTime)
        .attr('transform', d => `translate(${this.xr()(d.x)}, ${this.yr()(d.y)}) rotate(90)`)
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
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        return {
          x: this.xr()(phraseStart + traj.startTime + Number(normedX)),
          y: this.yr()(y)
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
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        return {
          x: this.xr()(phraseStart + traj.startTime + Number(normedX)),
          y: this.yr()(y),
          i: i
        }
      });
      const offOffset = {
        x: 0,
        y: 0
      };
      hammerOffData.forEach(obj => {
        d3.select(`.hammer-off#krintinp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3.line()([
            [obj.x - 10 + offOffset.x, obj.y + offOffset.y],
            [obj.x + offOffset.x, obj.y + offOffset.y],
            [obj.x + offOffset.x, obj.y + 10 + offOffset.y]
          ]))
      });
      // hammer-ons
      const hammerOnKeys = keys.filter(key => traj.articulations[key].name === 'hammer-on')
      const hammerOnData = hammerOnKeys.map(p => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        return {
          x: this.xr()(phraseStart + traj.startTime + Number(normedX)),
          y: this.yr()(y)
        }
      });
      const onOffset = {
        x: 0,
        y: 0
      };
      hammerOnData.forEach(obj => {
        d3.select(`.hammer-off#krintinp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3.line()([
            [obj.x - 10 + onOffset.x, obj.y + onOffset.y],
            [obj.x + onOffset.x, obj.y + onOffset.y],
            [obj.x + onOffset.x, obj.y - 10 + onOffset.y]
          ]))
      })
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

          this.svg.append('g')
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
          this.svg.append('g')
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
        d3.select(`#${id}`)
          .attr('stroke', this.selectedTrajColor)
        d3.select(`#${e.target.id}`)
          .style('cursor', 'pointer')
      }      
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
      d3.select(`#${this.selectedTrajID}`)
        .attr('stroke', this.selectedTrajColor)
      if (this.selectedChikariID) {
        this.clearSelectedChikari()
      }
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
        this.selectedTrajID = undefined
      }
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
      const yr = this.ty().rescaleY(this.y);
      return d3.line()([
        [this.x(0), yr(y)],
        [this.x(this.durTot), yr(y)]
      ])
    },

    addSargamLines() {
      this.visibleSargam.forEach((s, i) => { // draws hoizontal sargam lines
        const logOverFund = freq => Math.log2(freq / this.piece.raga.fundamental);
        const saFilter = freq => Math.abs(logOverFund(freq) % 1) == 0;
        const paFilter = freq => Math.abs((logOverFund(freq) - (7 / 12)) % 1) == 0;
        const strokeWidth = saFilter(s) || paFilter(s) ? 2 : 1;
        this.svg.append('path')
          .classed(`sargamLine s${i}`, true)
          .attr('clip-path', 'url(#clip)')
          .attr("fill", "none")
          .attr("stroke", "grey")
          .attr("stroke-width", `${strokeWidth}px`)
          .attr("stroke-linejoin", "round")
          .attr("stroke-linecap", "round")
          .attr("d", this.sargamLine(Math.log2(s)));
      })
    },
    
    playheadLine(currentTime) {
      return d3.line()([
        [this.xr()(currentTime), this.yr()(Math.log2(this.freqMin))],
        [this.xr()(currentTime), this.yr()(Math.log2(this.freqMax))]
      ])
    },
    
    addPlayhead() {
      this.svg.append('path')
        .classed('playhead', true)
        .attr('stroke', 'darkgreen')
        .attr('stroke-width', '2px')
        .attr('d', this.playheadLine(0))
    },
    
    redrawPlayhead() {
      d3.select('.playhead').transition().duration(this.transitionTime)
        .attr('d', this.playheadLine(this.currentTime))
    },

    async redraw() {
      await this.updateTranslateExtent();
      // await this.svg.call(this.zoom.transform, d3.zoomIdentity);
      await this.gx.transition().duration(this.transitionTime).call(this.xAxis, this.xr());
      await this.gy.transition().duration(this.transitionTime).call(this.yAxis, this.yr());
      await this.visibleSargam.forEach((s, i) => {
        d3.select(`.s${i}`).transition().duration(this.transitionTime)
          .attr('d', this.sargamLine(Math.log2(s)))
      });
      await this.movePhrases();
      if (this.piece.audioID) await this.redrawSpectrogram();
      this.redrawPlayhead();
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
    },

    updateClipPaths() {
      const rect = this.rect();
      d3.select('#clip>#rect')
        .attr('width', rect.width - this.yAxWidth)
        .attr('height', rect.height - this.xAxHeight)
      d3.select('#yAxisClip>#rect')
        .attr('height', rect.height - this.xAxHeight)
    },

    rect() {
      const rect = this.$refs.graph.getBoundingClientRect();
      return rect
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
      this.animationStart = this.$refs.audioPlayer.audio.currentTime;
      if (!this.requestId) {
        this.requestId = window.requestAnimationFrame(this.loopAnimationFrame)
      }
    },
    
    loopAnimationFrame() {
      this.requestId = undefined;
      this.currentTime = this.$refs.audioPlayer.audio.currentTime;
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
      const pIdx = split[0].slice(1);
      const tIdx = split[1];
      const phrase = this.piece.phrases[pIdx];
      // const traj = phrase.trajectories[tIdx];
      
      
      
      d3.select(`#${trajID}`).remove();
      d3.select(`#overlay__${trajID}`).remove();
      d3.select(`#articulations__${trajID}`).remove();
      
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
      
      
      
      const newTrajs = phrase.trajectories.filter(traj => traj.num !== Number(tIdx));
      this.piece.phrases[pIdx].trajectories = newTrajs;
      this.piece.phrases[pIdx].durArrayFromTrajectories();
      this.piece.phrases[pIdx].assignStartTimes();
      this.piece.phrases[pIdx].assignTrajNums();
      this.piece.durArrayFromPhrases();
      this.piece.updateStartTimes();

      this.redrawPhrase(pIdx);
      // this.emitter.emit('deletedTraj')
      // this.setNoteVals();
      // this.setPluckVals();
      // this.$forceUpdate();
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
  height: 400px;
}

.lower {
  width: 100%;
  height: 150px;
  background-color: black;
}

.cbBox {
  width: 100%;
  height: 70px;
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

</style>
