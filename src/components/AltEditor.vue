<template>
<div class='main'>
  <div class='graph' ref='graph'></div>
</div>
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
  //   Chikari
} from '@/js/classes.js';

import {
  getPiece,
  getRaagRule
  //   savePiece,
  //   getAudioDBEntry
} from '@/js/serverCalls.js';


import * as d3 from 'd3';
export default {
  name: 'AltEditor',

  data() {
    return {
      piece: undefined,
      durTot: 600,
      freqMin: 100,
      freqMax: 800,
      backColor: '#abe0ab',
      axisColor: '#c4b18b',
      yAxWidth: 30,
      xAxHeight: 30,
      minDrawDur: 0.005, //this could be smaller, potentially, might be more efficient
      initViewDur: 10,
      initYScaleFactor: 2,
      d3: d3
    }
  },

  async mounted() {
    window.addEventListener('resize', this.resize);

    const piece = await getPiece(this.$store.state._id);
    this.durTot = piece.durTot;
    this.initXScaleFactor = this.durTot / this.initViewDur;
    let fund = 246;
    this.freqMin = fund / 2;
    this.freqMax = fund * 4;
    await this.getPieceFromJson(piece, fund);
    await this.initializePiece();
  },

  unmounted() {
    window.removeEventListener('resize', this.resize)
  },

  methods: {


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

    initializePiece() {
      this.visibleSargam = this.piece.raga.getFrequencies({
        low: this.freqMin,
        high: this.freqMax
      })
      const rect = this.rect();
      this.svg = d3.create('svg')
        .attr('viewBox', [0, 0, rect.width, rect.height - 1])
      this.curWidth = rect.width - this.yAxWidth;
      this.addClipPaths();
      this.paintBackgroundColors();
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
        .scaleExtent([1, 10])
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
          return z_.type !== 'mousedown' ? z_ : null
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
      const line = d3.line()
        .x(d => this.xr()(d.x))
        .y(d => this.yr()(Math.log2(d.y)))
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
              .attr("stroke", "midnightblue")
              .attr("stroke-width", '3px')
              .attr("stroke-linejoin", "round")
              .attr("stroke-linecap", "round")
              .attr("d", line)
          }
          this.addArticulations(traj, phrase.startTime)
        })
      });
      this.addChikaris();
    },

    addArticulations(traj, phraseStart) {
      this.addPlucks(traj, phraseStart)
      this.addKrintin(traj, phraseStart)
      this.addSlide(traj, phraseStart)
    },

    addPlucks(traj, phraseStart) {
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
        this.svg.append('g')
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

    redrawPlucks(traj) {
      d3.select(`#pluckp${traj.phraseIdx}t${traj.num}`)
        .attr('transform', d => `translate(${this.xr()(d.x)}, ${this.yr()(d.y)}) rotate(90)`)
    },

    addKrintin(traj, phraseStart) {
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
        this.svg.append('path')
          .classed('articulation', true)
          .classed('hammer-off', true)
          .attr('clip-path', 'url(#clip)')
          .attr('id', `krintinp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3.line()([
            [obj.x - 10 + offOffset.x, obj.y + offOffset.y],
            [obj.x + offOffset.x, obj.y + offOffset.y],
            [obj.x + offOffset.x, obj.y + 10 + offOffset.y]
          ]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .attr('marker-end', 'url(#arrow)')
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
        this.svg.append('path')
          .classed('articulation', true)
          .classed('hammer-on', true)
          .attr('clip-path', 'url(#clip)')
          .attr('id', `krintinp${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3.line()([
            [obj.x - 10 + onOffset.x, obj.y + onOffset.y],
            [obj.x + onOffset.x, obj.y + onOffset.y],
            [obj.x + onOffset.x, obj.y - 10 + onOffset.y]
          ]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .attr('marker-end', 'url(#arrow)')
      })
    },

    redrawKrintin(traj, phraseStart) {
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

    addSlide(traj, phraseStart) {
      const keys = Object.keys(traj.articulations);
      const relKeys = keys.filter(key => traj.articulations[key].name === 'slide')
      const data = relKeys.map((p, i) => {
        const normedX = (p) * traj.durTot;
        const y = traj.compute(p - 0.01, true);
        const dirUp = y < traj.compute(p, true);
        return {
          x: this.xr()(phraseStart + traj.startTime + Number(normedX)),
          y: this.yr()(y),
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
        this.svg.append('path')
          .classed('articulation', true)
          .classed('slide', true)
          .attr('id', `slidep${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3.line()([
            [obj.x + offset.x, obj.y + yMotion[0] + offset.y],
            [obj.x + offset.x, obj.y + yMotion[1] + offset.y]
          ]))
          .attr('stroke', 'black')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .attr('marker-end', 'url(#arrow)')
      })
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
            .append('path')
            .attr('id', id)
            .attr('d', sym)
            .attr('stroke', 'black')
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round')
            .data([dataObj])
            .attr('transform', d => `translate(${this.xr()(d.x)}, ${this.yr()(d.y)})`)



          // for clicking  
          // this.transcription.append('g')
          //   .classed('chikari', true)
          //   .append('circle')
          //   .attr('id', 'circle__' + id)
          //   .attr('stroke', 'green')
          //   .style('opacity', '0')
          //   .data([dataObj])
          //   .attr('cx', d => this.xScale(d.x))
          //   .attr('cy', d => this.yScale(d.y))
          //   .attr('r', 6)
          //   .on('mouseover', this.handleMouseOver)
          //   .on('mouseout', this.handleMouseOut)
          //   .on('click', this.handleClickChikari)
        })
      })
    },

    redrawChikaris() {
      this.piece.phrases.forEach(phrase => {
        Object.keys(phrase.chikaris).forEach(key => {
          const scaledX = Number(key) / phrase.durTot;
          const dataObj = {
            x: Number(key) + phrase.startTime,
            y: phrase.compute(scaledX, true)
          };
          const id = 'p' + phrase.pieceIdx + '_' + Math.floor(Number(key)) + '_' +
            (Number(key) % 1).toFixed(2).toString().slice(2);
          d3.select(`#${id}`)
          .data([dataObj])
            .attr('transform', d => `translate(${this.xr()(d.x)}, ${this.yr()(d.y)})`)
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
          x: this.xr()(phraseStart + traj.startTime + Number(normedX)),
          y: this.yr()(y),
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
        d3.select(`#slidep${traj.phraseIdx}t${traj.num}i${obj.i}`)
          .attr('d', d3.line()([
            [obj.x + offset.x, obj.y + yMotion[0] + offset.y],
            [obj.x + offset.x, obj.y + yMotion[1] + offset.y]
          ]))
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

    async redraw() {
      await this.updateTranslateExtent();
      // await this.svg.call(this.zoom.transform, d3.zoomIdentity);
      await this.gx.call(this.xAxis, this.xr());
      await this.gy.call(this.yAxis, this.yr());
      await this.visibleSargam.forEach((s, i) => {
        d3.select(`.s${i}`)
          .attr('d', this.sargamLine(Math.log2(s)))
      });
      await this.redrawPhrases();
    },

    xr() {
      return this.tx().rescaleX(this.x)
    },

    yr() {
      return this.ty().rescaleY(this.y)
    },

    redrawPhrases() {
      const line = d3.line()
        .x(d => this.xr()(d.x))
        .y(d => this.yr()(Math.log2(d.y)));
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
            });
            d3.select(`#p${pIdx}t${tIdx}`)
              .datum(data)
              .attr("d", line)
            this.redrawPlucks(traj);
            this.redrawKrintin(traj, phrase.startTime);
            this.redrawSlide(traj, phrase.startTime);
          }
        })
      });
      this.redrawChikaris();
    },

    addClipPaths() {
      const defs = this.svg.append('defs');
      const rect = this.rect();
      defs.append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('id', 'rect')
        .attr('width', rect.width - this.yAxWidth)
        .attr('height', rect.height - this.xAxHeight)
        .attr('transform', `translate(${this.yAxWidth},${this.xAxHeight})`)

      defs.append('clipPath')
        .attr('id', 'yAxisClip')
        .append('rect')
        .attr('id', 'yAxisClipRect')
        .attr('width', this.yAxWidth)
        .attr('height', rect.height - this.xAxHeight)
        .attr('transform', `translate(${-this.yAxWidth},${this.xAxHeight})`)
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
          let deltaX = e.sourceEvent.wheelDeltaX / this.tx().k;
          let deltaY = e.sourceEvent.wheelDeltaY / this.ty().k;
          d3.select()
          this.gx.transition().duration(25).call(this.zoomX.translateBy, deltaX, 0);
          this.gy.transition().duration(25).call(this.zoomY.translateBy, 0, deltaY);
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
    }

  }
}
</script>

<style scoped>
.graph {
  width: 100%;
  height: 400px;
  border-bottom: 1px solid black;
}
</style>
