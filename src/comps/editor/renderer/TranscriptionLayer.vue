<template>
  <div class='tranContainer' ref='tranContainer' :style='dynamicStyle'>
    <svg ref='tranSvg'></svg>
  </div>
</template>

<script lang='ts'>

import { 
  defineComponent, 
  ref, 
  onMounted, 
  watch, 
  computed,
  PropType
} from 'vue';
import * as d3 from 'd3';
import { linSpace } from '@/ts/utils.ts';

import { Piece, Trajectory } from '@/js/classes.ts';

export default defineComponent({
  name: 'TranscriptionLayer',
  props: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
    showTranscription: {
      type: Boolean,
      required: true
    }, 
    xScale: {
      type: Function as PropType<d3.ScaleLinear<number, number>>,
      required: true
    },
    yScale: {
      type: Function as PropType<d3.ScaleLinear<number, number>>,
      required: true
    },
    piece: {
      type: Object as PropType<Piece>,
      required: true
    },
    lowOctOffset: {
      type: Number,
      required: true
    },
    highOctOffset: {
      type: Number,
      required: true
    },
    sargamLineColor: {
      type: String,
      required: true
    },
    minDrawDur: {
      type: Number,
      required: true
    },
    trajColor: {
      type: String,
      required: true
    },
    selTrajColor: {
      type: String,
      required: true
    },
    scrollX: {
      type: Number,
      required: true
    },
    clientWidth: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    const tranContainer = ref<HTMLDivElement | null>(null);
    const tranSvg = ref<SVGSVGElement | null>(null);
    const tracks: d3.Selection<SVGGElement, unknown, null, undefined>[] = [];
    const xRangeInView = ref<[number, number]>([0, 0]);

    const resetTrajRenderStatus = () => {
      for (let i = 0; i < props.piece.instrumentation.length; i++) {
        if (trajRenderStatus[i] === undefined) {
          trajRenderStatus.push([])
        }
        trajRenderStatus[i] = props.piece.allTrajectories(i).map(t => {
          return { 
            uniqueId: t.uniqueId!, 
            renderStatus: false,
            selectedStatus: false
          }
        })
      }
    }

    const trajRenderStatus: { 
      uniqueId: string, 
      renderStatus: boolean,
      selectedStatus: boolean 
    }[][] = [];
    resetTrajRenderStatus();

    const trajStartTimes = computed(() => {
      const gridStartTimes = [];
      for (let i = 0; i < props.piece.instrumentation.length; i++) {
        const trajs = props.piece.allTrajectories(i);
        const durs = trajs.map(t => t.durTot);
        const startTimes = durs.reduce((acc, dur) => {
          acc.push(acc[acc.length - 1] + dur);
          return acc;
        }, [0]);
        gridStartTimes.push(startTimes);
      };
      return gridStartTimes;
    });

    const trajEndTimes = computed(() => {
      const gridEndTimes = [];
      for (let i = 0; i < props.piece.instrumentation.length; i++) {
        const trajs = props.piece.allTrajectories(i);
        const durs = trajs.map(t => t.durTot);
        const endTimes = trajStartTimes.value[i].map((startTime, idx) => {
          return startTime + durs[idx];
        });
        gridEndTimes.push(endTimes);
      };
      return gridEndTimes;
    });

    const dynamicStyle = computed(() => {
      return {
        '--opacity': props.showTranscription ? 1 : 0,
        '--width': `${props.width}px`,
        '--height': `${props.height}px`
      }
    })
    const logMin = computed(() => {
      return Math.log2(props.piece.raga.fundamental) - props.lowOctOffset;
    })
    const logMax = computed(() => {
      return Math.log2(props.piece.raga.fundamental) + props.highOctOffset;
    })
    const sargamVals = computed(() => {
      return props.piece.raga.getFrequencies({
        low: 2 ** logMin.value,
        high: 2 ** logMax.value
      }).map(freq => Math.log2(freq))
    });
    const visPitches = computed(() => {
      return props.piece.raga.getPitches({
        low: 2 ** logMin.value,
        high: 2 ** logMax.value
      })
    });

    watch(() => props.sargamLineColor, () => {
      updateSargamLineColor();
    });
    watch(() => props.height, () => {
      if (tranSvg.value) {
        d3.select(tranSvg.value)
          .attr('height', props.height)
        updateSargamLineSpacing();
      }
    });
    watch(() => props.width, () => {
      if (tranSvg.value) {
        d3.select(tranSvg.value)
          .attr('width', props.width)
        updateSargamLineWidth();
      }
    });
    watch(() => props.scrollX, () => {
      setXRangeInView()
    });
    watch(() => props.clientWidth, () => {
      setXRangeInView()
    })

    const setXRangeInView = () => {
      const viewTimeRange = props.xScale.invert(props.clientWidth);
      const leftTimeMax = props.piece.durTot! - viewTimeRange;
      const leftTime = props.scrollX * leftTimeMax;
      const rightTime = leftTime + viewTimeRange;
      xRangeInView.value = [leftTime, rightTime];
    }

    const initializeTracks = () => {
      // for the number of instrumental tracks, have a different <g> element
      // for each track. I'd like to store these g's in an array.

      if (tranSvg.value) {
        const svg = d3.select(tranSvg.value);
        for (let i = 0; i < props.piece.instrumentation.length; i++) {
          const g = svg.append('g')
            .attr('class', `track${i}`)
          tracks.push(g);
        }
      }
    }

    const makeTrajData = (traj: Trajectory, realStartTime: number) => {
      const endTime = realStartTime + traj.durTot;
      const timePts = Math.round((endTime - realStartTime) / props.minDrawDur);
      const drawTimes = linSpace(realStartTime, endTime, timePts);
      const drawXs = drawTimes.map(t => {
        return (t - realStartTime) / (endTime - realStartTime)
      });
      const drawYs = drawXs.map(x => traj.compute(x, true));
      return drawYs.map((y, idx) => {
        return { x: drawTimes[idx], y }
      });
    };

    const trajCurve = d3.line<{ x: number, y: number }>()
      .x(d => props.xScale(d.x))
      .y(d => props.yScale(d.y))
      .curve(d3.curveMonotoneX);

    const renderTraj = (traj: Trajectory, track: number = 0) => {
      const trajIdx = props.piece.allTrajectories(track).indexOf(traj);
      const trajStart = trajStartTimes.value[track][trajIdx];
      const g = tracks[track];
      const trajData = makeTrajData(traj, trajStart);
      g.append('path')
        .datum(trajData)
        .attr('d', trajCurve)
        .attr('fill', 'none')
        .attr('stroke', props.trajColor)
        .attr('stroke-width', '2px')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('class', `traj ${traj.uniqueId}`)
    };

    const updateSargamLineSpacing = () => {
      if (tranSvg.value) {
        d3.select(tranSvg.value)
          .selectAll('line')
          .data(sargamVals.value)
          .attr('y1', d => props.yScale(d))
          .attr('y2', d => props.yScale(d))
      }
    }

    const updateSargamLineWidth = () => {
      if (tranSvg.value) {
        d3.select(tranSvg.value)
          .selectAll('line')
          .attr('x2', props.width)
      }
    }

    const updateSargamLineColor = () => {
      if (tranSvg.value) {
        d3.select(tranSvg.value)
          .selectAll('line')
          .attr('stroke', props.sargamLineColor)
      }
    }

    const addSargamLines = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
      const saFilter = (logFreq: number) => {
        const logSa = Math.log2(props.piece.raga.fundamental);
        return (logFreq - logSa) % 1 === 0
      }
      const paFilter = (idx: number) => {
        return visPitches.value[idx].swara === 4
      };
      const strokeWidth = (s: number, idx: number) => {
        return saFilter(s) || paFilter(idx) ? 2 : 1
      }
      svg.selectAll('line')
        .data(sargamVals.value)
        .enter()
        .append('line')
        .attr('x1', 0)
        .attr('x2', props.width)
        .attr('y1', d => props.yScale(d))
        .attr('y2', d => props.yScale(d))
        .attr('stroke', 'grey')
        .attr('stroke-width', (d, i) => strokeWidth(d, i))
    }

    onMounted(() => {
      if (tranSvg.value) {
        const svg = d3.select(tranSvg.value);
        svg
          .attr('width', props.width)
          .attr('height', props.height)
        addSargamLines(svg);
        initializeTracks();
        props.piece.chunkedTrajs()[0].forEach(traj => {
          if (traj.id !== 12) renderTraj(traj);
        });
      };
      setXRangeInView();
    })


    return { 
      dynamicStyle,
      tranContainer,
      tranSvg,
      trajRenderStatus,
      trajStartTimes,
      trajEndTimes,
      xRangeInView
    }
  }
})
</script>

<style scopred>
.tranContainer {
  opacity: var(--opacity);
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  width: var(--width);
  height: var(--height);
}
</style>