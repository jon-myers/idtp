<template>
  <div class='outerHolder'>
    <div 
      class='axisHolder' 
      :style="{ '--margin': margin + 'px' }"
      ref='axisHolder'
      >
    </div>
    <div class='scrollingGraphHolder' :style="{ 
      '--margin': margin + 'px',
      '--yAxisWidth': yAxisWidth + 'px'
      }">
      <div class='longtxt'>aslkdjflaskdjflaksdjf
      </div>
    </div>
  </div>
</template>
<script lang='ts'>

import { defineComponent, PropType } from 'vue';
import { 
  Piece,
  durationsOfFixedPitches,
  
} from '@/js/classes.ts';
import * as d3 from 'd3';
import { 
  segmentByDuration,
  durationsOfPitchOnsets,
  chromaSeqToCondensedPitchNums
} from '@/js/analysis.ts';



type PitchPrevalenceDataType = {
  showGraph: boolean,
  margin: number,
  graphHeight: number,
  xAxisHeight: number,
  yAxisWidth: number,
}

export default defineComponent({
  name: 'PitchPrevalence',
  props: {
    segmentation: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    pitchChroma: {
      type: Boolean,
      required: true
    },
    condensed: {
      type: Boolean,
      required: true
    },
    heatmap: {
      type: Boolean,
      required: true
    },
    pitchRepresentation: {
      type: String,
      required: true
    },
    piece: {
      type: Piece,
      required: true
    },
    fadeTime: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },

  },
  data(): PitchPrevalenceDataType {
    return {

      showGraph: true,
      margin: 10,
      graphHeight: 600,
      xAxisHeight: 70,
      yAxisWidth: 70,
    }
  },

  mounted() {
    this.generateSectionGraph();
    window.addEventListener('resize', this.resetWidth);
  
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.resetWidth);
  },

  methods: {
    generateSectionGraph() {
      let segments = this.piece.sections.map(s => s.trajectories);
      const func = this.pitchRepresentation === 'Fixed Pitch' ?
        durationsOfFixedPitches :
        durationsOfPitchOnsets;
      const durs = segments.map(seg => func(seg, {
        countType: 'proportional',
        outputType: this.pitchChroma ? 'chroma' : 'pitchNumber',
        maxSilence: this.fadeTime
      }));
      let lowestKey: number = 10000, highestKey: number = -10000;
      durs.forEach(dur => {
        if (dur === undefined) {
          throw new Error('dur is undefined');
        }
        const keys = Object.keys(dur);
        keys.forEach(key => {
          if (Number(key) < lowestKey) {
            lowestKey = Number(key);
          }
          if (Number(key) > highestKey) {
            highestKey = Number(key);
          }
        })
      });
      if (this.condensed) {
        lowestKey = this.piece.raga.pitchNumberToScaleNumber(lowestKey);
        highestKey = this.piece.raga.pitchNumberToScaleNumber(highestKey);
      }
      let totalWidth = 0.9 * window.innerWidth;
      const pnLen = this.piece.raga.getPitchNumbers(0, 11).length;
      const ppOct = this.condensed ? pnLen: 12;
      const lkOct = Math.floor(lowestKey / ppOct);
      const hOct = Math.floor(highestKey / ppOct);
      this.xAxisHeight = 70;
      this.yAxisWidth = 70.5;
      this.graphHeight = this.height - this.xAxisHeight - 80 - this.margin * 2;
      const axisHolder = this.$refs.axisHolder as HTMLElement;
      
      const axisSVG = d3.select(axisHolder)
        .append('svg')
        .classed('axisSVG', true)
        .attr('width', 0.9 * window.innerWidth - this.margin * 2 + 1)
        .attr('height', this.height - this.margin * 2)
        .style('background-color', 'white');
      
      let y = d3.scaleLinear()
        .domain([lowestKey - 1, highestKey + 1])
        .range([this.graphHeight, 0]);
      const yAxisNode = axisSVG.append('g');
      const pitchNumbers = this.condensed ? 
        [...Array(1 + highestKey - lowestKey)].map((_, i) => i + lowestKey) :
        this.piece.raga.getPitchNumbers(lowestKey, highestKey);
      const tickLabels = this.condensed ? 
        pitchNumbers.map(sn => {
          return this.piece.raga.scaleNumberToPitchNumber(sn);
        }) :
        pitchNumbers.map(pn => {
          return this.piece.raga.pitchNumberToSargamLetter(pn);
        });
      yAxisNode.call(d3.axisLeft(y)
          .tickValues(pitchNumbers)
          .tickFormat((d, i) => tickLabels[i])
          .tickSize(0)
          .tickPadding(15))
        .style('color', 'black')
        .style('font-weight', 'normal')
        .attr('transform', `translate(${this.yAxisWidth}, ${this.xAxisHeight + 80})`);
      const sectionRects = [...Array(durs.length)]
      this.addLine({
        x1: this.yAxisWidth - 35,
        x2: this.yAxisWidth,
        y1: this.xAxisHeight + 80,
        y2: this.xAxisHeight + 80,
        stroke: 'black',
        element: axisSVG
      })

      const aboveAxLines = [
        { num: 20, text: 'Sec. Type' }, 
        { num: 40, text: 'Duration' },
        { num: 60, text: 'Start' },
        { num: 80, text: 'Section #' }
      ];
      aboveAxLines.forEach((d, idx) => {
        const add = idx === 3 ? 1 : 0;
        this.addLine({
          x1: this.yAxisWidth - 70,
          x2: this.yAxisWidth + add,
          y1: this.xAxisHeight + 80 - d.num,
          y2: this.xAxisHeight + 80 - d.num,
          stroke: 'black',
          element: axisSVG
        })
        this.addText({
          x: this.yAxisWidth - 35,
          y: this.xAxisHeight + 80 - d.num + 10,
          text: d.text,
          element: axisSVG
        
        })
      })
      this.addLine({
        x1: this.yAxisWidth - 70,
        x2: this.yAxisWidth - 70,
        y1: this.xAxisHeight + 80 - 140,
        y2: this.xAxisHeight + 80,
        stroke: 'black',
        element: axisSVG
      })
      this.addLine({
        x1: this.yAxisWidth,
        x2: this.yAxisWidth,
        y1: this.xAxisHeight,
        y2: this.xAxisHeight + 80,
        stroke: 'black',
        element: axisSVG
      })
      const wideLines = [
        { num: 140, text: this.piece.title },
        { num: 110, text: 'Pitch Range and Percentage of Duration on each \
          Fixed Pitch, Segmented by Section' }
      ];
      wideLines.forEach(wl => {
        this.addLine({
          x1: this.yAxisWidth - 70,
          x2: this.yAxisWidth - 70 + totalWidth,
          y1: this.xAxisHeight + 80 - wl.num,
          y2: this.xAxisHeight + 80 - wl.num,
          stroke: 'black',
          element: axisSVG,
          class_: 'wideLine'
        });
        this.addText({
          x: this.yAxisWidth - 70 + totalWidth / 2,
          y: this.xAxisHeight + 80 - wl.num + 15,
          text: wl.text,
          element: axisSVG,
          fSize: '14px',
          fWeight: 'bold',
          class_: 'titleText'
        })
      });

      // top right vertical line
      this.addLine({
        x1: totalWidth - this.margin * 2 + 0.5,
        x2: totalWidth - this.margin * 2 + 0.5,
        y1: this.margin,
        y2: this.xAxisHeight + 80,
        stroke: 'black',
        element: axisSVG,
        class_: 'topRightVertical'
      })
      

      for (let i = lkOct; i <= hOct; i++) {
        let lowY = i * ppOct;
        let highY = (i + 1) * ppOct;
        if (i === lkOct) {
          lowY = lowestKey - 0.5;
        }
        if (i === hOct) {
          highY = highestKey + 1.5;
        }
        this.addText({ 
          x: this.yAxisWidth - 50, 
          y: this.xAxisHeight + 80 + y((lowY + highY) / 2 - 0.5), 
          text: i, 
          element: axisSVG 
        })
        const h_ = y(lowY) - y(highY);
        const y_ = y(highY - 0.5);
        const add = i === lkOct ? - 0.5 : 0;
        this.addRect({
          x: this.yAxisWidth - 70,
          y: this.xAxisHeight + 80 + y_,
          w: 35,
          h: h_ + add,
          stroke: 'black',
          element: axisSVG
        });
        const lY_ = y(lowY - 0.5);
        this.addLine({ 
          x1: this.yAxisWidth - 35,
          y1: lY_ + this.xAxisHeight + add + 80,
          x2: this.yAxisWidth - add * 2,
          y2: lY_ + this.xAxisHeight + add + 80,
          stroke: 'black',
          element: axisSVG
        })
      }
    },

    addText({
      x = undefined,
      y = undefined,
      text = '',
      fSize = '12px',
      fWeight = 'normal',
      fill = 'black',
      anchor = 'middle',
      element = undefined,
      class_ = undefined
    }: {
      x?: number,
      y?: number,
      text?: string | number,
      fSize?: string,
      fWeight?: string,
      fill?: string,
      anchor?: string,
      element?: d3.Selection<SVGElement, unknown, HTMLElement, any>,
      class_?: string
    } = {}) {
      if (x === undefined || y === undefined || text === undefined) {
        throw new Error('x, y, or text is undefined');
      }
      if (element === undefined) {
        throw new Error('element is undefined');
      }
      const txt = element.append('text')
        .attr('x', x)
        .attr('y', y)
        .text(text)
        .attr('font-size', fSize)
        .attr('font-weight', fWeight)
        .attr('fill', fill)
        .attr('text-anchor', anchor)
        .attr('alignment-baseline', 'middle')
      if (class_ !== undefined) {
        txt.classed(class_, true);
      }
    },

    addRect({
      x = undefined,
      y = undefined,
      w = undefined,
      h = undefined,
      fill = 'none',
      stroke = 'none',
      element = undefined
    }: {
      x?: number,
      y?: number,
      w?: number,
      h?: number,
      fill?: string,
      stroke?: string,
      element?: d3.Selection<SVGElement, unknown, HTMLElement, any>
    } = {}) {
      if (
        x === undefined || 
        y === undefined || 
        w === undefined || 
        h === undefined
      ) {
        throw new Error('x, y, w, or h is undefined');
      }
      if (element === undefined) {
        throw new Error('element is undefined');
      }
      return element.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', w)
        .attr('height', h)
        .attr('fill', fill)
        .attr('stroke', stroke)
    },

    addLine({
      x1 = undefined,
      y1 = undefined,
      x2 = undefined,
      y2 = undefined,
      stroke = 'black',
      element = undefined,
      class_ = undefined
    }: {
      x1?: number,
      y1?: number,
      x2?: number,
      y2?: number,
      stroke?: string,
      element?: d3.Selection<SVGElement, unknown, HTMLElement, any>,
      class_?: string
    } = {}) {
      if (
        x1 === undefined || 
        y1 === undefined || 
        x2 === undefined || 
        y2 === undefined
      ) {
        throw new Error('x1, y1, x2, or y2 is undefined');
      }
      if (element === undefined) {
        throw new Error('element is undefined');
      }
      const line = element.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', stroke)
      if (class_ !== undefined) {
        line.classed(class_, true);
      }
      return line
    },

    resetWidth() {
      const totalWidth = 0.9 * window.innerWidth;
      d3.select('.axisSVG')
        .attr('width', totalWidth - this.margin * 2 + 2)
      d3.selectAll('.wideLine')
        .attr('x2', totalWidth - this.margin * 2 + 1)
      d3.selectAll('.titleText')
        .attr('x', totalWidth / 2)
      d3.select('.topRightVertical')
        .attr('x1', totalWidth - this.margin * 2 + 0.5)
        .attr('x2', totalWidth - this.margin * 2 + 0.5)
    } 
  },

  

})

</script>

<style scoped>

.outerHolder {
  width: 90vw;
  min-height: v-bind(height + 'px');
  background-color: white;
  position: relative;
}

.axisHolder {
  width: calc(100% - var(--margin) * 2);
  height: v-bind(height - 2 * margin + 'px');
  background-color: blue;
  position: absolute;
  left: v-bind(margin + 'px');
  top: v-bind(margin + 'px');
}
.scrollingGraphHolder {
  width: calc(90vw - (var(--margin) * 2 + var(--yAxisWidth)));
  height: v-bind(graphHeight + 80 + 0.5 + 'px');
  background-color: #FAF9F6;
  position: absolute;
  left: v-bind(yAxisWidth + margin + 1 + 'px');
  top: v-bind(xAxisHeight + margin - 0.5 + 'px');
  overflow-x: scroll;
  border-top: 1px solid black;
  border-bottom: 1px solid black;
  border-right: 1px solid black;
  box-sizing: border-box;

}

.longtxt {
  width: 2000px;
  height: 100%;
}
</style>