<template>
  <div ref='graph'>

  </div>

</template>
<script lang='ts'>

import { defineComponent, PropType } from 'vue';
import { Trajectory, Piece, Phrase, Pitch, linSpace } from '@/js/classes.ts';
import { QueryAnswerType } from '@/js/query.ts';

import * as d3 from 'd3';

type SegmentDisplayDataType = {
  svg?: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
  verticalPadding: number,
  horizontalPadding: number,
  // verticalMargin: number,
  // horizontalMargin: number,
  titleMargin: number,
  outerMargin: {
    top: number,
    bottom: number,
    left: number,
    right: number
  }
  innerMargin: {
    top: number,
    bottom: number,
    left: number,
    right: number
  },
  xScale?: d3.ScaleLinear<number, number>,
  xAxis?: d3.Axis<d3.NumberValue>,
  yScale?: d3.ScaleLinear<number, number>,
  yAxis?: d3.Axis<d3.NumberValue>,
  visibleSargam?: number[],
  visiblePitches?: Pitch[],
  divsPerPxl: number,
  defs?: d3.Selection<SVGDefsElement, unknown, HTMLElement, any>,
  phonemeRepresentation: 'IPA' | 'Devanagari' | 'English'
};

export default defineComponent({
  name: 'SegmentDisplay',

  data(): SegmentDisplayDataType {
    return {
      // verticalMargin: 0.2,
      titleMargin: 30,
      outerMargin: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20
      },
      // horizontalMargin: 20,
      verticalPadding: 0.1,
      horizontalPadding: 0.1,
      innerMargin: {
        top: 40,
        bottom: 0,
        left: 30,
        right: 0
      },
      svg: undefined,
      xScale: undefined,
      xAxis: undefined,
      yScale: undefined,
      yAxis: undefined,
      visibleSargam: [],
      visiblePitches: [],
      divsPerPxl: 1,
      defs: undefined,
      phonemeRepresentation: 'English'
    }
  },

  mounted() {
    const horizontalMargin = this.outerMargin.left + this.outerMargin.right;
    const verticalMargin = this.outerMargin.top + this.outerMargin.bottom;
    this
    this.svg = d3.select(this.$refs.graph)
      .append('svg')
      .classed('svg', true)
      .attr('width', this.displayWidth - horizontalMargin + 'px')
      .attr('height', this.displayHeight - verticalMargin + 'px')
      // .style('background-color', 'lightgrey')
      // .style('border', '1px solid black')
      // .style('box-sizing', 'border-box')
    
    this.svg
      .append('rect')
      .attr('width', this.displayWidth - horizontalMargin + 'px')
      .attr('height', this.displayHeight - verticalMargin - this.titleMargin + 'px')
      .attr('x', 0)
      .attr('y', this.titleMargin + 'px')
      .style('fill', 'lightgrey')
      .style('stroke', 'black')
      .style('stroke-width', '1px')
      .style('box-sizing', 'border-box')
    this.addMarkers();
    
    let totWidth = this.displayWidth  - horizontalMargin;
    totWidth -= this.innerMargin.left + this.innerMargin.right;
    let totHeight = this.displayHeight - verticalMargin;
    totHeight -= this.innerMargin.top + this.innerMargin.bottom;
    this.visibleSargam = this.piece.raga.getFrequencies({
      low: 2 ** this.minLogFreq,
      high: 2 ** this.maxLogFreq
    });
    this.visiblePitches = this.piece.raga.getPitches({
      low: 2 ** this.minLogFreq,
      high: 2 ** this.maxLogFreq
    });
    const yTickTexts = this.visiblePitches.map(pitch => {
      return pitch.octavedSargamLetter
    });
    const yTickVals = this.visibleSargam.map(freq => Math.log2(freq));

    // coloring the background of the graph blue, excluding the axes
    this.svg.append('rect')
      .attr('x', this.innerMargin.left)
      .attr('y', this.innerMargin.top + this.titleMargin + 'px')
      .attr('width', totWidth)
      .attr('height', totHeight - this.titleMargin)
      .style('fill', 'lightblue')

    // adding the axes
    this.xScale = d3.scaleLinear()
      .domain([this.minTime, this.maxTime])
      .range([0, totWidth]);
    this.xAxis = d3.axisTop(this.xScale);
    let numTicks;
    if (this.$parent.horizontalProportionalDisplay) {
      numTicks = Math.round(3 * this.proportion);
    } else {
      numTicks = 3
    }
    const xTickVals = this.xAxis.scale().ticks(numTicks)! as number[];
    const xTickTexts = xTickVals.map(x => {
      const date = d3.timeSecond.offset(new Date(0), x);
      const minutes = date.getUTCMinutes();
      const seconds = date.getUTCSeconds();
      const milliseconds = 10 * (x % 1);
      if (milliseconds === 5) {
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}.5`;
      } else {
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      }
    })
    this.xAxis.tickValues(xTickVals)
      .tickFormat((_, i) => xTickTexts[i]);
    this.svg.append('g')
      .attr('transform', `translate(${this.innerMargin.left}, ${this.innerMargin.top + this.titleMargin})`)
      .call(this.xAxis)
      .style('color', 'black')
    this.yScale = d3.scaleLinear()
      .domain([this.minLogFreq, this.maxLogFreq])
      .range([totHeight - this.titleMargin, 0]);
    this.yAxis = d3.axisLeft(this.yScale)
      .tickValues(yTickVals)
      .tickFormat((_, i) => yTickTexts[i]);
    this.svg.append('g')
      .attr('transform', `translate(${this.innerMargin.left}, ${this.innerMargin.top + this.titleMargin})`)
      .call(this.yAxis)
      .style('color', 'black')

    // add the sargam lines
    const strokeWidths = this.visiblePitches.map(pitch => {
      const condition = pitch.swara === 0 || pitch.swara === 4;
      return condition ? '1.5px' : '1px';
    });
    this.svg.append('g')
      .attr('transform', `translate(${this.innerMargin.left}, ${this.innerMargin.top + this.titleMargin})`)
      .selectAll('line')
      .data(this.visibleSargam)
      .join('line')
      .attr('x1', 0)
      .attr('x2', totWidth)
      .attr('y1', d => this.yScale!(Math.log2(d)))
      .attr('y2', d => this.yScale!(Math.log2(d)))
      .style('stroke', 'grey')
      .style('stroke-width', d => strokeWidths[this.visibleSargam!.indexOf(d)])
    
    // add the trajectories
    this.trajectories
      .filter(traj => traj.id !== 12)
      .forEach(traj => this.addTrajectory(traj));
    
    if (this.vocal) {
      const vowelIdxs = this.firstTrajIdxs();  
      this.trajectories.forEach((traj, idx) => {
        if (vowelIdxs.includes(idx)) {
          this.addVowel(traj)
        }
        this.addEndingConsonant(traj);
      })
    }

    // add the title
    this.svg.append('text')
      .attr('x', this.innerMargin.left + totWidth / 2)
      .attr('y', this.titleMargin / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '20px')
      .text(this.queryAnswer.title);
  },

  props: {
    trajectories: {
      type: Array as PropType<Trajectory[]>,
      required: true
    },
    piece: {
      type: Object as PropType<Piece>,
      required: true
    },
    displayWidth: {
      type: Number,
      required: true
    },
    displayHeight: {
      type: Number,
      required: true
    },
    proportion: {
      type: Number,
      required: true
    },
    logFreqOverride: {
      type: Object as PropType<{low: number, high: number}>,
      required: false
    },
    id: {
      type: String,
      required: true
    },
    vocal: {
      type: Boolean,
      required: true
    },
    queryAnswer: {
      type: Object as PropType<QueryAnswerType>,
      required: true
    }
  },

  computed: {
    maxTrajLogFreq() {
      if (this.logFreqOverride) {
        return this.logFreqOverride.high
      } else {
        if (this.trajectories.every(traj => traj.id === 12)) {
          const fund = this.piece.raga.fundamental;
          return Math.log2(fund) + 0.5;
        } else {
          const logFreqs = this.trajectories.map(traj => traj.logFreqs).flat();
          const testXs = linSpace(0, 1, 25);
          return this.trajectories.reduce((acc, traj) => {
            const yVals = testXs.map(x => traj.compute(x, true));
            const max = Math.max(...yVals);
            if (max > acc) {
              return max;
            } else {
              return acc;
            }
          }, logFreqs[0])
        }
      }
    },

    minTrajLogFreq() {
      if (this.logFreqOverride) {
        return this.logFreqOverride.low
      } else {
        if (this.trajectories.every(traj => traj.id === 12)) {
          const fund = this.piece.raga.fundamental;
          return Math.log2(fund) - 0.5;
        } else {
          const logFreqs = this.trajectories.map(traj => traj.logFreqs).flat();
          const testXs = linSpace(0, 1, 25);
          return this.trajectories.reduce((acc, traj) => {
            const yVals = testXs.map(x => traj.compute(x, true));
            const min = Math.min(...yVals);
            if (min < acc) {
              return min;
            } else {
              return acc;
            }
          }, logFreqs[0])
        }
      }
    },

    maxLogFreq() {
      const logDelta = this.maxTrajLogFreq - this.minTrajLogFreq;
      return this.maxTrajLogFreq + logDelta * this.verticalPadding;
    },

    minLogFreq() {
      const logDelta = this.maxTrajLogFreq - this.minTrajLogFreq;
      return this.minTrajLogFreq - logDelta * this.verticalPadding;
    },

    minTrajTime() {
      if (this.trajectories.length === 0) {
        throw new Error('No trajectories');
      }
      const startTraj = this.trajectories[0];
      const pIdx = startTraj.phraseIdx!;
      const startPhrase = this.piece.phrases[pIdx];
      return startPhrase.startTime! + startTraj.startTime!;
    },

    maxTrajTime() {
      if (this.trajectories.length === 0) {
        throw new Error('No trajectories');
      }
      const endTraj = this.trajectories[this.trajectories.length - 1];
      const pIdx = endTraj.phraseIdx!;
      const endPhrase = this.piece.phrases[pIdx];
      return endPhrase.startTime! + endTraj.startTime! + endTraj.durTot;
    },

    durTot() {
      return this.maxTime - this.minTime;
    },

    minTime() {
      const timeDelta = this.maxTrajTime - this.minTrajTime;
      return this.minTrajTime - timeDelta * this.horizontalPadding;
    },

    maxTime() {
      const timeDelta = this.maxTrajTime - this.minTrajTime;
      return this.maxTrajTime + timeDelta * this.horizontalPadding;
    },
  },

  methods: {

    addTrajectory(traj: Trajectory) {
      const horizontalMargin = this.outerMargin.left + this.outerMargin.right;
      let totWidth = this.displayWidth - horizontalMargin;
      totWidth -= this.innerMargin.left + this.innerMargin.right;
      const trajWidth = traj.durTot / this.durTot * totWidth;
      let numDivs = Math.ceil(trajWidth * this.divsPerPxl);
      if (numDivs < 4) {
        numDivs = 4;
      }
      const phrase = this.piece.phrases[traj.phraseIdx!];
      const phraseStart = phrase.startTime!;
      const startTime = phraseStart + traj.startTime!;
      const times = linSpace(startTime, startTime + traj.durTot, numDivs);
      const sampleXs = linSpace(0, 1, numDivs);
      const sampleYs = sampleXs.map(x => traj.compute(x, true))
      const samplePoints = times.map((x, i) => {
        return {
          x: this.xScale!(x),
          y: this.yScale!(sampleYs[i])
        }
      });
      const line = (d3.line() as d3.Line<{x: number, y: number}>)
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveLinear);
      this.svg!.append('path')
        .datum(samplePoints)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-width', '1.5px')
        .attr('transform', `translate(${this.innerMargin.left}, ${this.innerMargin.top + this.titleMargin})`)

      // add articulations
      const artKeys = Object.keys(traj.articulations);
      artKeys.forEach(artKey => {
        const art = traj.articulations[artKey];
        const artTime = Number(artKey) * traj.durTot + startTime;
        if (art.name === 'pluck') {
          const artX = this.xScale!(artTime);
          const artY = this.yScale!(traj.compute(Number(artKey), true));
          const sym = d3.symbol().type(d3.symbolTriangle).size(20);
          const tX = this.innerMargin.left + artX;
          const tY = this.innerMargin.top + this.titleMargin + artY;
          this.svg!.append('path')
            .attr('d', sym)
            .attr('fill', 'black')
            .attr('transform', `translate(${tX}, ${tY}) rotate(90)`)
        } else if (art.name === 'hammer-off') {
          const artX = this.xScale!(artTime);
          const artY = this.yScale!(traj.compute(Number(artKey) - 0.01, true));
          const tX = this.innerMargin.left + artX;
          const tY = this.innerMargin.top + this.titleMargin + artY;
          this.svg!.append('path')
            .attr('d', d3.line()([[-10, 0], [0, 0], [0, 10]]))
            .attr('stroke', 'black')
            .attr('stroke-width', 1.5)
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrow)')
            .attr('transform', `translate(${tX}, ${tY})`)
        } else if (art.name === 'hammer-on') {
          const artX = this.xScale!(artTime);
          const artY = this.yScale!(traj.compute(Number(artKey) - 0.01, true));
          const tX = this.innerMargin.left + artX;
          const tY = this.innerMargin.top + this.titleMargin + artY;
          this.svg!.append('path')
            .attr('d', d3.line()([[-10, 0], [0, 0], [0, -10]]))
            .attr('stroke', 'black')
            .attr('stroke-width', 1.5)
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrow)')
            .attr('transform', `translate(${tX}, ${tY})`)
        } else if (art.name === 'slide') { 
          const artX = this.xScale!(artTime);
          const artY = this.yScale!(traj.compute(Number(artKey) - 0.01, true));
          const tX = this.innerMargin.left + artX;
          const tY = this.innerMargin.top + this.titleMargin + artY;
          const curY = this.yScale!(traj.compute(Number(artKey), true));
          let line = [[0, -10], [0, 10]] as [number, number][];
          if (curY < artY) line = [[0, 10], [0, -10]] as [number, number][];
          this.svg!.append('path')
            .attr('d', d3.line()(line))
            .attr('stroke', 'black')
            .attr('stroke-width', 1.5)
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrow)')
            .attr('transform', `translate(${tX}, ${tY})`)
        } else if (art.name === 'dampen') {
          const artX = this.xScale!(artTime);
          const artY = this.yScale!(traj.compute(Number(artKey), true));
          const tX = this.innerMargin.left + artX;
          const tY = this.innerMargin.top + this.titleMargin + artY;
          this.svg!.append('path')
            .attr('d', d3.line()([[-2, -8], [0, -8], [0, 8], [-2, 8]]))
            .attr('stroke', 'black')
            .attr('stroke-width', 1.5)
            .attr('fill', 'none')
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('transform', `translate(${tX}, ${tY})`)            
        } else if (art.name === 'consonant') {
          const artX = this.xScale!(artTime);
          const artY = this.yScale!(traj.compute(Number(artKey), true));
          const sym = d3.symbol().type(d3.symbolDiamond).size(25);
          const tX = this.innerMargin.left + artX;
          const tY = this.innerMargin.top + this.titleMargin + artY;
          this.svg!.append('path')
            .attr('d', sym)
            .attr('fill', 'black')
            .attr('transform', `translate(${tX}, ${tY})`)

        }
      })
    },

    addMarkers() {
      this.defs = this.svg?.append('defs')
      const markerBoxWidth = 4;
      const markerBoxHeight = 4;
      const refX = markerBoxWidth / 2;
      const refY = markerBoxHeight / 2;
      const arrowPoints = [
        [0, 0],
        [0, 4],
        [4, 2]
      ];
      this.defs!
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
        .attr('fill', 'black')
    },

    firstTrajIdxs() {
      const idxs: number[] = [];
      let ct = 0;
      let silentTrigger = false;
      let lastVowel: string | undefined = undefined;
      let endConsonantTrigger: boolean | undefined = undefined;
      this.trajectories.forEach((traj, tIdx) => {
        if (traj.id !== 12) {
          const c1 = ct === 0;
          const c2 = silentTrigger;
          const c3 = traj.startConsonant !== undefined;
          const c4 = endConsonantTrigger;
          const c5 = traj.vowel !== lastVowel;
          if (c1 || c2 || c3 || c4 || c5) {
            idxs.push(tIdx);
          }
          ct += 1;
          endConsonantTrigger = traj.endConsonant !== undefined;
          lastVowel = traj.vowel;
        }
        silentTrigger = traj.id === 12;
      });
      return idxs;
    },

    addVowel(traj: Trajectory) {
      // this includes adding first vowel, if there is one
      if (traj.id !== 12) {
        const phrase = this.piece.phrases[traj.phraseIdx!];
        const phraseStart = phrase.startTime!;
        const withC = traj.startConsonant !== undefined;
        const art = withC ? traj.articulations['0.00'] : undefined;
        let text: string;
        if (this.phonemeRepresentation === 'IPA') {
          text = withC ? art!.ipa + ' ' + traj.vowelIpa : traj.vowelIpa!;
        } else if (this.phonemeRepresentation === 'Devanagari') {
          text = withC ? art!.hindi + ' ' + traj.vowelHindi : traj.vowelHindi!;
        } else if (this.phonemeRepresentation === 'English') {
          text = withC ?
            art!.engTrans + ' ' + traj.vowelEngTrans :
            traj.vowelEngTrans!;
        }
        let xPos = this.xScale!(phraseStart + traj.startTime!) 
        xPos += this.innerMargin.left;
        let yPos = this.yScale!(traj.compute(0, true));
        yPos += this.innerMargin.top - 10;
        this.svg?.append('text')
          .text(text!)
          // .attr('stroke', 'black')
          .attr('font-size', '12px')
          .attr('text-anchor', 'left')
          .attr('font-weight', '600')
          .attr('transform', `translate(${xPos}, ${yPos})`)
      }
    },

    addEndingConsonant(traj: Trajectory) {
      if (traj.id !== 12) {
        const arts = traj.articulations;
        if (arts['1.00'] && arts['1.00'].name === 'consonant') {
          const phrase = this.piece.phrases[traj.phraseIdx!];
          const xTime = phrase.startTime! + traj.startTime! + traj.durTot;
          const yVal = traj.compute(1, true);
          const xPos = this.xScale!(xTime) + this.innerMargin.left;
          const yPos = this.yScale!(yVal) + this.innerMargin.top;
          let text: string;
          if (this.phonemeRepresentation === 'IPA') {
            text = arts['1.00'].ipa!;
          } else if (this.phonemeRepresentation === 'Devanagari') {
            text = arts['1.00'].hindi!;
          } else if (this.phonemeRepresentation === 'English') {
            text = arts['1.00'].engTrans!;
          }
          this.svg?.append('text')
            .text(text!)
            .attr('font-size', '12px')
            .attr('text-anchor', 'right')
            .attr('font-weight', '600')
            .attr('transform', `translate(${xPos - 10}, ${yPos - 10})`)

        }
      }
    }
  }
})

</script>

<style scoped>
.graph {
  padding: 0px;
  margin: 0px;
  overflow: none;
  height: 80px;
}
</style>
