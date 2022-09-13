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
}

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
    }
  },

  async mounted() {
    const piece = await getPiece(this.$store.state._id);
    console.log(piece)
    let fund = 246;
    this.freqMin = fund / 2;
    this.freqMax = fund * 4;
    await this.getPieceFromJson(piece, fund);
    await this.initializePiece();
  },

  methods: {
    

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

    initializePiece() {
      this.visibleSargam = this.piece.raga.getFrequencies({
        low: this.freqMin,
        high: this.freqMax
      })
      const rect = this.rect();
      this.svg = d3.create('svg')
        .attr('viewBox', [0, 0, rect.width, rect.height])
      this.curWidth = rect.width - this.yAxWidth;
      this.addClipPaths();
      this.paintBackgroundColors();
      this.gx = this.svg.append('g');
      this.gy = this.svg.append('g');
      this.makeDots();
      this.x = d3.scaleLinear()
        .domain([0, this.durTot])
        .range([this.yAxWidth, rect.width])
      this.y = d3.scaleLinear()
        .domain([Math.log2(this.freqMax), Math.log2(this.freqMin)])
        .range([this.xAxHeight, rect.height])
      this.z = d3.zoomIdentity;
      this.zoomX = d3.zoom()
        .scaleExtent([1, 10])
        .translateExtent([[0, 0], [rect.width, rect.height]]);
      this.zoomY = d3.zoom().scaleExtent([1, 5]).translateExtent([
        [0, 0],
        [rect.width, rect.height]
      ]);
      this.tx = () => d3.zoomTransform(this.gx.node());
      this.ty = () => d3.zoomTransform(this.gy.node());
      this.gx.call(this.zoomX).attr('pointer-events', 'none');
      this.gy.call(this.zoomY).attr('pointer-events', 'none');
      this.zoom = d3.zoom()
        .filter(z_ => z_.type !== 'mousedown' ? z_: null)
        .on('zoom', this.enactZoom);
      this.makeAxes();
      this.addSargamLines();
      this.svgNode = this.svg
        .call(this.zoom)
        .call(this.zoom.transform, d3.zoomIdentity.scale(2))
        .node();
      this.$refs.graph.appendChild(this.svgNode)
    },
    
    makeAxes() {
      this.xAxis = (g, scale) => g
        .attr('transform', `translate(0,${this.xAxHeight})`)
        .call(d3.axisTop(scale).ticks(10).tickFormat(d => structuredTime(d)))
        .call(g => g.select('.domain'))

      const yTickLabels = this.getYTickLabels();
      this.yAxis = (g, scale) => g
        .attr('transform', `translate(${this.x(0)},0)`)
        .attr('clip-path', 'url(#yAxisClip)')
        .call(d3.axisLeft(scale)
          .tickValues(this.visibleSargam.map(f => Math.log2(f)))
          .tickFormat((_, i) => yTickLabels[i]))
        .call(g => g.select('.domain'))
    },
    
    addPhrases() {
      // const yr = this.ty().rescaleY(this.y);
      // const xr = this.tx().rescaleX(this.x)
      // const line = d3.line()
      //   .x(d => xr(d.x))
      //   .y(d => yr(Math.log2(d.y)))
      // const timePts = Math.round(this.durTot / this.minDrawDur);
      // const drawTimes = linSpace(0, this.durTot, timePts)
      
    },

    updateTranslateExtent() {
      const rect = this.$refs.graph.getBoundingClientRect();
      const xLim = (this.yAxWidth * this.tx().k - this.yAxWidth) / this.tx().k;
      const yLim = (this.xAxHeight * this.ty().k - this.xAxHeight) / this.ty().k;
      this.zoomX.translateExtent([
        [xLim, yLim],
        [rect.width, rect.height]
      ]);
      this.zoomY.translateExtent([
        [xLim, yLim],
        [rect.width, rect.height]
      ])
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

    redraw() {
      this.updateTranslateExtent();
      const xr = this.tx().rescaleX(this.x);
      const yr = this.ty().rescaleY(this.y);
      this.gx.call(this.xAxis, xr);
      this.gy.call(this.yAxis, yr);
      this.dots
        .attr('cx', d => xr(d[0]))
        .attr('cy', d => yr(d[1]))
        .attr('rx', 5)
        .attr('ry', 5);

      this.visibleSargam.forEach((s, i) => {
        d3.select(`.s${i}`)
          .attr('d', this.sargamLine(Math.log2(s)))
      })
    },

    makeDots() {
      const data = Array.from({
        length: 100
      }, () => [
        this.durTot * Math.random(),
        Math.log2(this.freqMin) + Math.log2(this.freqMax / this.freqMin) * Math.random()
      ]);
      this.dots = this.svg.append('g')
        .attr('clip-path', 'url(#clip)')
        .selectAll('ellipse')
        .data(data)
        .join('ellipse')
        .attr('fill', () => d3.schemeOranges[9][(Math.random() * 9) | 0]);
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

    rect() {
      return this.$refs.graph.getBoundingClientRect();
    },

    paintBackgroundColors() {
      const rect = this.rect();
      // behind (for axes)
      this.svg.append('rect')
        .attr('fill', this.axisColor)
        .attr('width', rect.width)
        .attr('height', rect.height)

      // main graph
      this.svg.append('rect')
        .attr('fill', this.backColor)
        .attr('width', rect.width - this.yAxWidth)
        .attr('height', rect.height - this.xAxHeight - 1)
        .attr('transform', `translate(${this.yAxWidth},${this.xAxHeight})`)
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
          this.gx.call(this.zoomX.scaleBy, k, point);
          this.gx.call(this.zoomX.translateTo, 0, 0)
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
