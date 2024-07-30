<template>
  <div class='tranContainer' ref='tranContainer' :style='dynamicStyle'>
    <svg ref='tranSvg' class='tranSvg'></svg>
    <div class='emptyOverlay' ref='emptyOverlay'></div>
  </div>
</template>

<script lang='ts'>

import { 
  defineComponent, 
  ref, 
  onMounted, 
  watch, 
  computed,
  PropType,
  nextTick
} from 'vue';
import * as d3 from 'd3';
import { linSpace, escCssClass } from '@/ts/utils.ts';

import { Piece, Trajectory } from '@/js/classes.ts';
import { SargamDisplayType } from '@/ts/types.ts';

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
    },
    showSargam: {
      type: Boolean,
      required: true
    },
  },
  setup(props) {
    const tranContainer = ref<HTMLDivElement | null>(null);
    const tranSvg = ref<SVGSVGElement | null>(null);
    const tracks: d3.Selection<SVGGElement, unknown, null, undefined>[] = [];
    const emptyOverlay = ref<HTMLDivElement | null>(null);
    const emptyDivs = ref<HTMLDivElement[]>([]);
    const emptyDivIdxMap = new Map<HTMLDivElement, number>();
    const maxEmptyDivWidth = props.clientWidth;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {

        const idx = emptyDivIdxMap.get(entry.target as HTMLDivElement)!;
        if (entry.isIntersecting) {
          const inst = 0;
          const dur = chunkDur.value;
          props.piece.chunkedTrajs(inst, dur)[idx].forEach(traj => {
            if (traj.id !== 12) renderTraj(traj);
          });
          props.piece.chunkedDisplaySargam(inst, dur)[idx].forEach(s => {
            renderSargam(s);
          });
          observer.unobserve(entry.target);
        }
      })
    }, {
      root: emptyOverlay.value,
      rootMargin: '0px',
      threshold: 0.0
    });

    const trajChunks = computed(() => {
      const out = [];
      for (let i = 0; i < props.piece.instrumentation.length; i++) {
        out.push(props.piece.chunkedTrajs(i, chunkDur.value));
      }
      return out;
    })

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
        resetTranscription();
      }
    });
    watch(() => props.width, () => {
      if (tranSvg.value) {
        d3.select(tranSvg.value)
          .attr('width', props.width)
        updateSargamLineWidth();
        resetTranscription();
      }
    });
    watch(() => props.trajColor, () => {
      d3.selectAll('.traj')
        .attr('stroke', props.trajColor)
    });
    watch(() => props.showSargam, () => {
      d3.selectAll('.sargamG')
        .style('opacity', Number(props.showSargam))
    });

    const addSargamG = () => {
      if (tranSvg.value) {
        const svg = d3.select(tranSvg.value);
        const g = svg.append('g')
          .attr('class', 'sargamG')
          .style('opacity', Number(props.showSargam))
        return g;
      }
    }

    const clearTranscription = () => {
      d3.selectAll('.traj').remove();
      d3.selectAll('.trajShadow').remove();
      d3.selectAll('.sargamG').remove();
    };

    const resetTranscription = () => {
      console.log('resetting transcription');
      clearTranscription();
      resetTrajRenderStatus();
      resetEmptyObserverDivs();
      resetObserver();
      addSargamG();
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
      const renderObj = trajRenderStatus[track].find(obj => { 
        return obj.uniqueId === traj.uniqueId
      });
      if (renderObj === undefined) {
        throw new Error('Trajectory not found in render status array');
      }
      if (renderObj.renderStatus === true) return;
      if (traj.id !== 12) {
        renderMelodicCurve(traj, track);
        const inst = props.piece.instrumentation[track];
        if (inst === 'Sitar') {
          renderPlucks(traj, track);
          renderDampener(traj, track);
        }
      };
      renderObj.renderStatus = true;
    };

    const renderMelodicCurve = (traj: Trajectory, track: number = 0) => {
      const trajIdx = props.piece.allTrajectories(track).indexOf(traj);
      const trajStart = trajStartTimes.value[track][trajIdx];
      const g = tracks[track];
      const trajData = makeTrajData(traj, trajStart);
      g.append('path')
          .datum(trajData)
          .attr('d', trajCurve)
          .attr('fill', 'none')
          .attr('stroke', props.trajColor)
          .attr('stroke-width', '3px')
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('class', `traj track${track} uId${traj.uniqueId!}`)
        g.append('path')
          .datum(trajData)
          .attr('d', trajCurve)
          .attr('fill', 'none')
          .attr('stroke', 'black')
          .attr('stroke-width', '10px')
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('class', `trajShadow track${track} uId${traj.uniqueId!}`)
          .style('opacity', '0')
          .on('mouseover', () => handleTrajMouseOver(traj))
          .on('mouseout', () => handleTrajMouseOut(traj, track))
          .on('click', () => handleClickTraj(traj, track))
    }

    const renderPlucks = (traj: Trajectory, track: number) => {
      const trajIdx = props.piece.allTrajectories(track).indexOf(traj);
      const trajStart = trajStartTimes.value[track][trajIdx];
      const g = tracks[track];
      const size = 20;
      const offset = (size ** 0.5) / 2;
      const keys = Object.keys(traj.articulations)
        .filter(key => traj.articulations[key].name === 'pluck')
      if (keys.length > 0) {
        const pluckData = keys.map(p => {
          const logY = traj.compute(Number(p), true);
          const y = props.yScale(logY);
          const x = props.xScale(trajStart + Number(p));
          return { x, y }
        });
        const sym = d3.symbol()
          .size(size)
          .type(d3.symbolTriangle);
        g.append('path')
          .data(pluckData)
          .attr('d', sym)
          .attr('stroke-width', 1.5)
          .attr('stroke', props.trajColor)
          .attr('fill', props.trajColor)
          .attr('transform', d => `translate(${d.x + offset}, ${d.y}) rotate(90)`)
          .classed(`traj pluck track${track} uId${traj.uniqueId!}`, true)
        
        g.append('path')
          .data(pluckData)
          .attr('d', sym)
          .attr('stroke-width', 3.5)
          .attr('stroke', 'black')
          .attr('transform', d => `translate(${d.x + offset}, ${d.y}) rotate(90)`)
          .style('opacity', '0')
          .classed(`pluckshadow track${track} uId${traj.uniqueId!}`, true)
          .on('mouseover', () => handleTrajMouseOver(traj))
          .on('mouseout', () => handleTrajMouseOut(traj, track))
          .on('click', () => handleClickTraj(traj, track))
      }
    };

    const renderDampener = (traj: Trajectory, track: number) => {
      const trajIdx = props.piece.allTrajectories(track).indexOf(traj);
      const trajStart = trajStartTimes.value[track][trajIdx];
      const keys = Object.keys(traj.articulations)
        .filter(key => traj.articulations[key].name === 'dampen')
      keys.forEach(() => {
        const obj = {
          x: trajStart + traj.durTot,
          y: traj.compute(1, true)
        }
        const g = tracks[track];
        g.append('path')
          .data([obj])
          .attr('d', d3.line()([[-2, -8], [0, -8], [0, 8], [-2, 8]]))
          .attr('stroke', props.trajColor)
          .attr('stroke-width', '3px')
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('fill', 'none')
          .attr('transform', d => {
            return `translate(${props.xScale(d.x)}, ${props.yScale(d.y)})`
          })
          .classed(`traj dampen track${track} uId${traj.uniqueId!}`, true)
        g.append('path')
          .data([obj])
          .attr('d', d3.line()([[-2, -8], [0, -8], [0, 8], [-2, 8]]))
          .attr('stroke', 'black')
          .attr('stroke-width', '5px')
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('fill', 'none')
          .attr('transform', d => {
            return `translate(${props.xScale(d.x)}, ${props.yScale(d.y)})`
          })
          .style('opacity', '0')
          .classed(`dampenshadow track${track} uId${traj.uniqueId!}`, true)
          .on('mouseover', () => handleTrajMouseOver(traj))
          .on('mouseout', () => handleTrajMouseOut(traj, track))
          .on('click', () => handleClickTraj(traj, track))
      })
    };

    const renderSargam = (s: SargamDisplayType) => {
      const svg = d3.select(tranSvg.value);
      const y = props.yScale(s.logFreq);
      const x = props.xScale(s.time);
      const positions = [
          { x: 0, y: 15 },
          { x: 0, y: -15 },
          { x: -5, y: -15 },
          { x: -5, y: 15 },
          { x: 5, y: -15 },
          { x: 5, y: 15 }
        ]
      const g = svg.select('.sargamG');
      g.append('text')
        .text(s.sargam)
        .attr('x', x + positions[s.pos!].x)
        .attr('y', y + positions[s.pos!].y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 14)
        .attr('fill', 'black')
        .attr('class', 'sargamLabel')
    }

    const handleClickTraj = (traj: Trajectory, track: number) => {
      console.log('clicked traj');
      const selector = `.traj.uId${traj.uniqueId!}`;
      const renderObj = trajRenderStatus[track].find(obj => {
        return obj.uniqueId === traj.uniqueId
      });
      if (renderObj!.selectedStatus === false) {
        d3.selectAll(selector)
          .attr('stroke', props.selTrajColor)
        d3.selectAll(selector + '.pluck')
          .attr('fill', props.selTrajColor)
        
        const currentlySelected = trajRenderStatus[track].filter(obj => {
          return obj.selectedStatus === true
        });
        currentlySelected.forEach(obj => {
          const selSelector = `.traj.uId${obj.uniqueId}`;
          d3.selectAll(selSelector)
            .attr('stroke', props.trajColor)
          d3.selectAll(selSelector + '.pluck')
            .attr('fill', props.trajColor)
          obj.selectedStatus = false;
        });
        renderObj!.selectedStatus = true;
      } else {
        d3.selectAll(selector)
          .attr('stroke', props.trajColor)
        d3.selectAll(selector + '.pluck')
          .attr('fill', props.trajColor)
        renderObj!.selectedStatus = false;
      }
    }

    const handleTrajMouseOver = (traj: Trajectory) => {
      const selector = `.traj.uId${traj.uniqueId!}`
      d3.selectAll(selector)
        .attr('stroke', props.selTrajColor)
      d3.selectAll(selector + '.pluck')
        .attr('fill', props.selTrajColor)
    }

    const handleTrajMouseOut = (traj: Trajectory, track: number) => {
      const selector = `.traj.uId${traj.uniqueId!}`
      const renderObj = trajRenderStatus[track].find(obj => {
        return obj.uniqueId === traj.uniqueId
      });
      if (renderObj!.selectedStatus === false) {
        d3.selectAll(selector)
          .attr('stroke', props.trajColor)
        d3.selectAll(selector + '.pluck')
          .attr('fill', props.trajColor)
      }
    }

    const renderChunk = (inst: number, idx: number) => {
      const trackChunks = trajChunks.value[inst];
      const chunk = trackChunks[idx];
      chunk.forEach(traj => {
        renderTraj(traj, inst);
      })
    }

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

    const resetEmptyObserverDivs = () => {
      observer.disconnect();
      emptyDivs.value.forEach(div => {
        emptyOverlay.value?.removeChild(div);
      });
      emptyDivs.value = [];
      emptyDivIdxMap.clear();
      const numDivs = Math.ceil(props.width / maxEmptyDivWidth);
      for (let i = 0; i < numDivs; i++) {
        const div = document.createElement('div');
        const width = Math.min(maxEmptyDivWidth, 
          props.width - i * maxEmptyDivWidth);
        div.style.width = `${width}px`;
        div.style.height = `${props.height}px`;
        emptyOverlay.value?.appendChild(div);
        emptyDivs.value.push(div);
        emptyDivIdxMap.set(div, i);
        observer.observe(div);
      }
    };

    const resetObserver = () => {
      observer.disconnect();
      emptyDivs.value.forEach(div => {
        observer.observe(div);
      });
    }

    const chunkDur = computed(() => {
      return props.xScale.invert(props.clientWidth)
    })

    onMounted(() => {
      if (tranSvg.value) {
        const svg = d3.select(tranSvg.value);
        svg
          .attr('width', props.width)
          .attr('height', props.height)
        addSargamLines(svg);
        initializeTracks();
        resetEmptyObserverDivs();
        addSargamG();
      };
    })


    return { 
      dynamicStyle,
      tranContainer,
      tranSvg,
      trajRenderStatus,
      trajStartTimes,
      trajEndTimes,
      chunkDur,
      resetTranscription,
      emptyOverlay,
      emptyDivs,
      emptyDivIdxMap
    }
  }
})
</script>

<style scopred>
.tranContainer {
  position: relative;
  opacity: var(--opacity);
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  width: var(--width);
  height: var(--height);
}

.emptyOverlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  width: var(--width);
  height: var(--height);
  display: flex;
  flex-direction: row;
}

</style>