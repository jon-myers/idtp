<template>
  <div class='graph'>

  </div>

</template>
<script lang='ts'>

import { defineComponent, PropType } from 'vue';
import { Trajectory, Piece, Phrase } from '@/js/classes.ts';

import d3 from 'd3';

type SegmentDisplayDataType = {
  svg?: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
  verticalPadding: number,
  horizontalPadding: number
}

export default defineComponent({
  name: 'SegmentDisplay',

  data(): SegmentDisplayDataType {
    return {
      verticalPadding: 0.1,
      horizontalPadding: 0.1,
      svg: undefined
    }
  },

  mounted() {
    this.svg = d3.select('.graph')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('background-color', 'white')
      .style('border', '1px solid black')
      .style('box-sizing', 'border-box')
      .style('padding', '10px')
      .style('overflow', 'visible');
  },

  props: {
    trajectories: {
      type: Array as PropType<Trajectory[]>,
      required: true
    },

    piece: {
      type: Object as PropType<Piece>,
      required: true
    }
  },

  computed: {
    maxTrajLogFreq() {
      const logFreqs = this.trajectories.map(traj => traj.logFreqs).flat();
      return Math.max(...logFreqs);
    },

    minTrajLogFreq() {
      const logFreqs = this.trajectories.map(traj => traj.logFreqs).flat();
      return Math.min(...logFreqs);
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

    minTime() {
      const timeDelta = this.maxTrajTime - this.minTrajTime;
      return this.minTrajTime - timeDelta * this.horizontalPadding;
    },

    maxTime() {
      const timeDelta = this.maxTrajTime - this.minTrajTime;
      return this.maxTrajTime + timeDelta * this.horizontalPadding;
    },
  }
})

</script>