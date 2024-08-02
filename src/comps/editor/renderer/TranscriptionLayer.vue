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
  onBeforeUnmount, 
  watch, 
  computed,
  PropType,
  nextTick
} from 'vue';
import * as d3 from 'd3';
import { linSpace, escCssClass } from '@/ts/utils.ts';
import { EditorMode } from '@/ts/enums.ts';

import { Piece, Trajectory } from '@/js/classes.ts';
import { 
  SargamDisplayType, 
  VowelDisplayType, 
  ConsonantDisplayType,
  InstrumentTrackType,
  PhraseDivDisplayType
} from '@/ts/types.ts';

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
    showSargamLines: {
      type: Boolean,
      required: true
    },
    showPhonemes: {
      type: Boolean,
      required: true
    },
    phonemeRepresentation: {
      type: String,
      required: true
    },
    instTracks: {
      type: Array as PropType<InstrumentTrackType[]>,
      required: true
    },
    selectedMode: {
      type: String as PropType<EditorMode>,
      required: true
    },
    showPhraseDivs: {
      type: Boolean,
      required: true
    }
  },
  setup(props, { emit }) {
    const tranContainer = ref<HTMLDivElement | null>(null);
    const tranSvg = ref<SVGSVGElement | null>(null);
    const tracks: d3.Selection<SVGGElement, unknown, null, undefined>[] = [];
    const emptyOverlay = ref<HTMLDivElement | null>(null);
    const emptyDivs = ref<HTMLDivElement[]>([]);
    const editorMode = ref<EditorMode>(EditorMode.None);
    const shifted = ref<boolean>(false);
    const trajRenderStatus = ref<{ 
      uniqueId: string, 
      renderStatus: boolean,
      selectedStatus: boolean,
      track: number 
    }[][]>([]);
    const selectedPhraseDivIdx = ref<number | undefined>(undefined);
    const selPhraseDivColor = 'red';

    const emptyDivIdxMap = new Map<HTMLDivElement, number>();
    const maxEmptyDivWidth = props.clientWidth;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const idx = emptyDivIdxMap.get(entry.target as HTMLDivElement)!;
        if (entry.isIntersecting) {
          const dur = chunkDur.value;
          for (let inst = 0; inst < props.piece.instrumentation.length; inst++) {
            props.piece.chunkedDisplaySargam(inst, dur)[idx].forEach(s => {
              renderSargam(s);
            });
            const insts = ['Vocal (M)', 'Vocal (F)'];
            if (insts.includes(props.piece.instrumentation[inst])) {
              props.piece.chunkedDisplayVowels(inst, dur)[idx].forEach(v => {
                renderVowel(v);
              })
              props.piece.chunkedDisplayConsonants(inst, dur)[idx].forEach(c => {
                renderEndingConsonant(c);
              })
            }
            props.piece.chunkedTrajs(inst, dur)[idx].forEach(traj => {
              if (traj.id !== 12) renderTraj(traj);
            });
          }
          props.piece.chunkedPhraseDivs(dur)[idx].forEach(pd => {
            renderPhraseDiv(pd);
          });
          observer.unobserve(entry.target);
        }
      })
    }, {
      root: emptyOverlay.value,
      rootMargin: '0px',
      threshold: 0.0
    });

    const resetTrajRenderStatus = () => {
      for (let i = 0; i < props.piece.instrumentation.length; i++) {
        if (trajRenderStatus.value[i] === undefined) {
          trajRenderStatus.value.push([])
        }
        trajRenderStatus.value[i] = props.piece.allTrajectories(i).map(t => {
          return { 
            uniqueId: t.uniqueId!, 
            renderStatus: false,
            selectedStatus: false,
            track: i
          }
        })
      }
    }

    
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
    watch(() => props.showSargam, () => {
      d3.selectAll('.sargamG')
        .style('opacity', Number(props.showSargam))
    });
    watch(() => props.showTranscription, () => {
      d3.selectAll('.transcriptionG')
        .style('opacity', Number(props.showTranscription))
      // d3.selectAll('.traj')
      //   .style('opacity', Number(props.showTranscription))
    });
    watch(() => props.showSargamLines, () => {
      d3.selectAll('.sargamLines')
        .style('opacity', Number(props.showSargamLines))
    });
    watch(() => props.showPhonemes, () => {
      d3.selectAll('.phonemeG')
        .style('opacity', Number(props.showPhonemes))
    });
    watch(() => props.phonemeRepresentation, () => {
      const opacities = ['IPA', 'Devanagari', 'English'].map(c => {
        return c === props.phonemeRepresentation ? 1 : 0;
      });
      d3.selectAll('.IPA')
        .attr('opacity', opacities[0])
      d3.selectAll('.Devanagari')
        .attr('opacity', opacities[1])
      d3.selectAll('.Latin')
        .attr('opacity', opacities[2])
    });

    const selectedTrajs = computed(() => {
      const uIds = trajRenderStatus.value.flat().filter(obj => {
        return obj.selectedStatus === true
      }).map(obj => obj.uniqueId);
      const out = props.piece.allTrajectories().filter(traj => {
        return uIds.includes(traj.uniqueId!)
      });
      return out
    })

    watch(selectedTrajs, (newVal, oldVal) => {
      oldVal.forEach(traj => {
        if (!newVal.includes(traj)) {
          const renderObj = trajRenderStatus.value.flat().find(obj => {
            return obj.uniqueId === traj.uniqueId
          });
          const track = renderObj!.track;
          const selector = `.traj.uId${traj.uniqueId!}`;
          d3.selectAll(selector)
            .attr('stroke', props.instTracks[track].color)
          d3.selectAll(selector + '.pluck')
            .attr('fill', props.instTracks[track].color)
        }
      });
      newVal.forEach(traj => {
        const renderObj = trajRenderStatus.value.flat().find(obj => {
          return obj.uniqueId === traj.uniqueId
        });
        const track = renderObj!.track;
        if (!oldVal.includes(traj)) {
          const selector = `.traj.uId${traj.uniqueId!}`;
          d3.selectAll(selector)
            .attr('stroke', props.instTracks[track].selColor)
          d3.selectAll(selector + '.pluck')
            .attr('fill', props.instTracks[track].selColor)
        }
      });
    })
    watch(() => props.instTracks, (newVal) => {
      newVal.forEach((track, tIdx) => {
        d3.selectAll(`.track${track.idx}`)
          .style('opacity', Number(track.displaying))
        d3.selectAll(`.track${track.idx} .traj`)
          .attr('stroke', track.color)
        d3.selectAll(`.track${track.idx} .pluck`)
          .attr('stroke', track.color)
      })
      selectedTrajs.value.forEach(traj => {
        const renderObj = trajRenderStatus.value.flat().find(obj => {
          return obj.uniqueId === traj.uniqueId
        });
        const track = renderObj!.track;
        const selector = `.traj.uId${traj.uniqueId!}`;
        d3.selectAll(selector)
          .attr('stroke', props.instTracks[track].selColor)
        d3.selectAll(selector + '.pluck')
          .attr('fill', props.instTracks[track].selColor)
      })
    }, { deep: true });
    watch(() => props.showPhraseDivs, () => {
      d3.selectAll('.phraseDivG')
        .style('opacity', Number(props.showPhraseDivs))
    });
    watch(selectedPhraseDivIdx, (newVal) => {
      if (newVal !== undefined) {
        const selector = `.phraseDiv.pIdx${newVal}`;
        console.log(selector)
        d3.select(selector)
          .attr('stroke', selPhraseDivColor)
      } else {
        d3.selectAll('.phraseDiv')
          .attr('stroke', 'black')
      }
    });

    const addSargamG = () => {
      if (tranSvg.value) {
        const svg = d3.select(tranSvg.value);
        for (let i = 0; i < props.piece.instrumentation.length; i++) {
          const trackG = tracks[i];
          const sargamG = trackG.append('g')
            .attr('class', `sargamG`)
            .style('opacity', Number(props.showSargam))
        }
      }
    }

    const addPhonemeG = () => {
      if (tranSvg.value) {
        const svg = d3.select(tranSvg.value);
        for (let i = 0; i < props.piece.instrumentation.length; i++) {
          const trackG = tracks[i];
          trackG.append('g')
            .attr('class', `phonemeG`)
            .style('opacity', Number(props.showPhonemes))
        }
      }
    }

    const addTrajG = () => {
      if (tranSvg.value) {
        for (let i = 0; i < props.piece.instrumentation.length; i++) {
          const trackG = tracks[i];
          trackG.append('g')
            .attr('class', `trajG`)
        }
      }
    }

    const addPhraseDivG = () => {
      if (tranSvg.value) {
        const svg = d3.select(tranSvg.value);
        svg.append('g')
          .attr('class', 'phraseDivG')
          .style('opacity', Number(props.showPhraseDivs))
      }
    }

    const clearTranscription = () => {
      d3.selectAll('.trajG').remove();
      d3.selectAll('.sargamG').remove();
      d3.selectAll('.phonemeG').remove();
      d3.selectAll('.phraseDivG').remove();
    };

    const resetTranscription = () => {
      clearTranscription();
      resetTrajRenderStatus();
      resetEmptyObserverDivs();
      resetObserver();
      addPhraseDivG();
      addSargamG();
      addPhonemeG();
      addTrajG();
    }

    const initializeTracks = () => {
      // for the number of instrumental tracks, have a different <g> element
      // for each track. I'd like to store these g's in an array.
      if (tranSvg.value) {
        const svg = d3.select(tranSvg.value);
        const transcriptionG = svg.append('g')
          .attr('class', 'transcriptionG')
        for (let i = 0; i < props.piece.instrumentation.length; i++) {
          const g = transcriptionG.append('g')
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
      const renderObj = trajRenderStatus.value[track].find(obj => { 
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
      const trackG = tracks[track];
      const g = trackG.select('.trajG');
      const trajData = makeTrajData(traj, trajStart);
      g.append('path')
          .datum(trajData)
          .attr('d', trajCurve)
          .attr('fill', 'none')
          .attr('stroke', props.instTracks[track].color)
          .attr('stroke-width', '3px')
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('class', `traj uId${traj.uniqueId!}`)
        g.append('path')
          .datum(trajData)
          .attr('d', trajCurve)
          .attr('fill', 'none')
          .attr('stroke', 'black')
          .attr('stroke-width', '10px')
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('class', `trajShadow uId${traj.uniqueId!}`)
          .style('opacity', '0')
          .style('cursor', 'pointer')
          .on('mouseover', () => handleTrajMouseOver(traj, track))
          .on('mouseout', () => handleTrajMouseOut(traj, track))
          .on('click', () => handleClickTraj(traj, track))
    }

    

    const renderPlucks = (traj: Trajectory, track: number) => {
      const trajIdx = props.piece.allTrajectories(track).indexOf(traj);
      const trajStart = trajStartTimes.value[track][trajIdx];
      const trackG = tracks[track];
      const g = trackG.select('.trajG');
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
          .attr('stroke', props.instTracks[track].color)
          .attr('fill', props.instTracks[track].color)
          .attr('transform', d => `translate(${d.x + offset}, ${d.y}) rotate(90)`)
          .classed(`traj pluck uId${traj.uniqueId!}`, true)
        
        g.append('path')
          .data(pluckData)
          .attr('d', sym)
          .attr('stroke-width', 3.5)
          .attr('stroke', 'black')
          .attr('transform', d => `translate(${d.x + offset}, ${d.y}) rotate(90)`)
          .style('opacity', '0')
          .style('cursor', 'pointer')
          .classed(`pluckShadow uId${traj.uniqueId!}`, true)
          .on('mouseover', () => handleTrajMouseOver(traj, track))
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
        const trackG = tracks[track];
        const g = trackG.select('.trajG');
        g.append('path')
          .data([obj])
          .attr('d', d3.line()([[-2, -8], [0, -8], [0, 8], [-2, 8]]))
          .attr('stroke', props.instTracks[track].color)
          .attr('stroke-width', '3px')
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('fill', 'none')
          .attr('transform', d => {
            return `translate(${props.xScale(d.x)}, ${props.yScale(d.y)})`
          })
          .classed(`traj dampen uId${traj.uniqueId!}`, true)
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
          .style('cursor', 'pointer')
          .classed(`dampenShadow uId${traj.uniqueId!}`, true)
          .on('mouseover', () => handleTrajMouseOver(traj, track))
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
        .attr('class', `sargamLabel uId${s.uId}`)
    };

    const renderVowel = (v: VowelDisplayType) => {
      const svg = d3.select(tranSvg.value);
      const verticalOffset = 14;
      const y = props.yScale(v.logFreq) - verticalOffset;
      const x = props.xScale(v.time);
      const g = svg.select('.phonemeG');
      let text = '';
      const choices = ['IPA', 'Devanagari', 'English'];
      const opacities = choices.map(c => {
        return c === props.phonemeRepresentation ? 1 : 0;
      });
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 15)
        .attr('stroke', 'black')
        .attr('class', `vowelLabel IPA uId${v.uId}`)
        .attr('opacity', opacities[0])
        .attr('transform', d => `translate(${x}, ${y})` )
        .text(v.ipaText)
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 15)
        .attr('stroke', 'black')
        .attr('class', `vowelLabel Devanagari uId${v.uId}`)
        .attr('opacity', opacities[1])
        .attr('transform', d => `translate(${x}, ${y})` )
        .text(v.devanagariText)
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 15)
        .attr('stroke', 'black')
        .attr('class', `vowelLabel Latin uId${v.uId}`)
        .attr('opacity', opacities[2])
        .attr('transform', d => `translate(${x}, ${y})` )
        .text(v.englishText)
    };

    const renderEndingConsonant = (c: ConsonantDisplayType) => {
      const svg = d3.select(tranSvg.value);
      const verticalOffset = 14;
      const y = props.yScale(c.logFreq) - verticalOffset;
      const x = props.xScale(c.time);
      const g = svg.select('.phonemeG');
      const choices = ['IPA', 'Devanagari', 'English'];
      const opacities = choices.map(c => {
        return c === props.phonemeRepresentation ? 1 : 0;
      });
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 15)
        .attr('stroke', 'black')
        .attr('class', `consonantLabel IPA uId${c.uId}`)
        .attr('opacity', opacities[0])
        .attr('transform', d => `translate(${x}, ${y})` )
        .text(c.ipaText)
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 15)
        .attr('stroke', 'black')
        .attr('class', `consonantLabel Devanagari uId${c.uId}`)
        .attr('opacity', opacities[1])
        .attr('transform', d => `translate(${x}, ${y})` )
        .text(c.devanagariText)
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 15)
        .attr('stroke', 'black')
        .attr('class', `consonantLabel Latin uId${c.uId}`)
        .attr('opacity', opacities[2])
        .attr('transform', d => `translate(${x}, ${y})` )
        .text(c.englishText)
    }

    const renderPhraseDiv = (pd: PhraseDivDisplayType) => {
      const svg = d3.select(tranSvg.value);
      const x = props.xScale(pd.time);
      const thickness = pd.type === 'section' ? 4 : 2;
      const y1 = props.yScale.range()[0];
      const y2 = props.yScale.range()[1];
      const g = svg.select('.phraseDivG');
      g.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', y1)
        .attr('y2', y2)
        .attr('stroke', 'black')
        .attr('stroke-width', thickness)
        .attr('class', `phraseDiv pIdx${pd.idx}`)
      
      g.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', y1)
        .attr('y2', y2)
        .attr('stroke', 'white')
        .attr('stroke-width', 8)
        .style('opacity', 0)
        .style('cursor', 'pointer')
        .on('click', () => {
          selectedPhraseDivIdx.value = pd.idx;
        })
        .attr('class', `phraseDivShadow pIdx${pd.idx}`)
    } 

    const handleClickTraj = (traj: Trajectory, track: number) => {
      if (!shifted.value) {
        selectedTrajs.value.forEach(traj => {
          const rObj = trajRenderStatus.value.flat().find(obj => {
            return obj.uniqueId === traj.uniqueId
          });
          rObj!.selectedStatus = false;
        })
        const renderObj = trajRenderStatus.value[track].find(obj => {
          return obj.uniqueId === traj.uniqueId
        });
        renderObj!.selectedStatus = true;
      } else {
        const renderObj = trajRenderStatus.value[track].find(obj => {
          return obj.uniqueId === traj.uniqueId
        });
        renderObj!.selectedStatus = true;
      }
    }

    const handleTrajMouseOver = (traj: Trajectory, track: number) => {
      const selector = `.traj.uId${traj.uniqueId!}`

      d3.selectAll(selector)
        .attr('stroke', props.instTracks[track].selColor)
      d3.selectAll(selector + '.pluck')
        .attr('fill', props.instTracks[track].selColor)
    }

    const handleTrajMouseOut = (traj: Trajectory, track: number) => {
      const selector = `.traj.uId${traj.uniqueId!}`
      const renderObj = trajRenderStatus.value[track].find(obj => {
        return obj.uniqueId === traj.uniqueId
      });
      if (renderObj!.selectedStatus === false) {
        d3.selectAll(selector)
          .attr('stroke', props.instTracks[track].color)
        d3.selectAll(selector + '.pluck')
          .attr('fill', props.instTracks[track].color)
      }
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

    const addSargamLines = () => {
      const svg = d3.select(tranSvg.value);
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
      const sargamLinesG = svg.append('g')
        .attr('class', 'sargamLines')
        .style('opacity', Number(props.showSargamLines))

      sargamVals.value.forEach((s, idx) => {
        sargamLinesG.append('line')
          .classed('sargamLine', true)
          .attr('x1', 0)
          .attr('x2', props.width)
          .attr('y1', props.yScale(s))
          .attr('y2', props.yScale(s))
          .attr('stroke', props.sargamLineColor)
          .attr('stroke-width', strokeWidth(s, idx))
      })
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

    const handleEscape = () => {
      emit('update:selectedMode', EditorMode.None);
      selectedTrajs.value.forEach(traj => {
        const renderObj = trajRenderStatus.value[0].find(obj => {
          return obj.uniqueId === traj.uniqueId
        });
        const track = renderObj!.track;
        const selector = `.traj.uId${traj.uniqueId!}`;
        d3.selectAll(selector)
          .attr('stroke', props.instTracks[track].color)
        d3.selectAll(selector + '.pluck')
          .attr('fill', props.instTracks[track].color)
        renderObj!.selectedStatus = false;
      })
      selectedPhraseDivIdx.value = undefined;
    }

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleEscape();
      } else if (e.key === 's') {
        emit('update:selectedMode', EditorMode.Series);
      } else if (e.key === 't') {
        emit('update:selectedMode', EditorMode.Trajectory);
      } else if (e.key === 'c') {
        emit('update:selectedMode', EditorMode.Chikari);
      } else if (e.key === 'm') {
        emit('update:selectedMode', EditorMode.Meter);
      } else if (e.key === 'p') {
        emit('update:selectedMode', EditorMode.PhraseDiv);
      } else if (e.key === 'Shift') {
        shifted.value = true;
      }
    }

    const handleKeyup = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shifted.value = false;
      }
    }

    let selBoxStartX: number | undefined = undefined;
    let selBoxStartY: number | undefined = undefined;
    let selBox: d3.Selection<SVGRectElement, unknown, null, undefined> | null = 
      null;

    const selBoxDragStart = (e: MouseEvent) => {
      if (shifted.value) {
        selBoxStartX = e.x;
        selBoxStartY = e.y;
        selBox = d3.select(tranSvg.value)
          .append('rect')
          .attr('id', 'selBox')
      }
    }

    const selBoxDragMove = (e: MouseEvent) => {
      if (selBoxStartX !== undefined && selBoxStartY !== undefined) {
        if (shifted.value) {
          const x = Math.min(selBoxStartX, e.x);
          const y = Math.min(selBoxStartY, e.y);
          const width = Math.abs(selBoxStartX - e.x);
          const height = Math.abs(selBoxStartY - e.y);
          selBox?.attr('x', x)
            .attr('y', y)
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'none')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '5, 5')
        } else {
          selBoxDragEnd(e);
        }
      }
    }

    const selBoxDragEnd = (e: MouseEvent) => {
      if (shifted.value) {
        const c = selBoxStartX === e.x && selBoxStartY === e.y;
        if (selBoxStartX !== undefined && selBoxStartY !== undefined && !c) {
          const x = Math.min(selBoxStartX, e.x);
          const y = Math.min(selBoxStartY, e.y);
          const width = Math.abs(selBoxStartX - e.x);
          const height = Math.abs(selBoxStartY - e.y);
          d3.select('#selBox').remove();
          const startTime = props.xScale.invert(x);
          const endTime = props.xScale.invert(x + width);
          const lowLogFreq = props.yScale.invert(y + height);
          const highLogFreq = props.yScale.invert(y);
          selBoxSelectTrajs({
            startTime,
            endTime,
            minLogFreq: lowLogFreq,
            maxLogFreq: highLogFreq
          });
        } 
      }
    }

    const setUpSvg = () => {
      const svg = d3.select(tranSvg.value);
      const selBoxDrag = d3.drag()
        .on('start', selBoxDragStart)
        .on('drag', selBoxDragMove)
        .on('end', selBoxDragEnd);
      svg
        .attr('width', props.width)
        .attr('height', props.height)
        .call(selBoxDrag)
        .on('click', handleClick)
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target! as HTMLElement;
      const classes = [
        'tranSvg', 
        'sargamLine', 
        'sargamLabel', 
        'vowelLabel',
        'consonantLabel'
      ];
      const f = classes.some(c => target.classList.contains(c));
      if (f) {
        handleEscape();
      }
    }

    const collectTrajs = (
        timelyTrajs: Trajectory[], 
        options: { 
          startTime?: number, 
          endTime?: number, 
          minLogFreq?: number, 
          maxLogFreq?: number
        } = {
      startTime: undefined,
      endTime: undefined,
      minLogFreq: undefined,
      maxLogFreq: undefined
    }
    ) => {
      if (options.startTime === undefined || options.endTime === undefined ||
          options.minLogFreq === undefined || options.maxLogFreq === undefined) {
        throw new Error('Missing selection box parameters');
      }
      const startTime = options.startTime;
      const endTime = options.endTime;
      const lowFreq = options.minLogFreq;
      const highFreq = options.maxLogFreq;
      const collectedTrajs: Trajectory[] = [];
      const sampleDur = 0.01;
      timelyTrajs.forEach(async (traj, tIdx) => {
        const phrase = props.piece.phrases[traj.phraseIdx!];
        const trajStart = phrase.startTime! + traj.startTime!;
        const trajEnd = trajStart + traj.durTot;
        let sampleTimes;
        if (tIdx === 0) {
          if (timelyTrajs.length === 1) {
            const div = Math.floor((endTime - startTime) / sampleDur);
            sampleTimes = linSpace(0, 1, div);
          } else {
            const div = Math.floor((trajEnd - startTime) / sampleDur);
            sampleTimes = linSpace(0, 1, div)
          }
        } else if (tIdx === timelyTrajs.length - 1) {
          const div = Math.floor((endTime - trajStart) / sampleDur);
          sampleTimes = linSpace(0, 1, div)
        } else {
          const div = Math.floor((trajEnd - trajStart) / sampleDur);
          sampleTimes = linSpace(0, 1, div)
        }
        let trigger = false;
        let override = false;
        let ct = 0;
        while ((!trigger) && (!override)) {
          const logFreq = traj.compute(sampleTimes[ct], true);
          if (logFreq >= lowFreq && logFreq <= highFreq) {
            trigger = true;
          } else if (ct === sampleTimes.length - 1) {
            override = true;
          } else {
            ct++;
          }
        }
        if (trigger) {
          collectedTrajs.push(traj);
        }
        if (ct > 1000) {
          throw new Error('ct > 1000')
        }
        return
      });
      return collectedTrajs
    };

    const selBoxSelectTrajs = (options: { 
      startTime?: number, 
      endTime?: number, 
      minLogFreq?: number, 
      maxLogFreq?: number
    } = {
      startTime: undefined,
      endTime: undefined,
      minLogFreq: undefined,
      maxLogFreq: undefined
    }) => {
      
      if (options.startTime === undefined || options.endTime === undefined ||
          options.minLogFreq === undefined || options.maxLogFreq === undefined) {
        throw new Error('Missing selection box parameters');
      }
      const startTime = options.startTime;
      const endTime = options.endTime;
      const minLogFreq = options.minLogFreq;
      const maxLogFreq = options.maxLogFreq;
      const instIdxs = props.instTracks
        .filter(t => t.displaying)
        .map(t => t.idx);
      const trajs = instIdxs
        .map(i => props.piece.allTrajectories(i))
        .flat()
        .filter(traj => {
          const phraseStart = props.piece.phrases[traj.phraseIdx!].startTime!;
          const trajStart = phraseStart + traj.startTime!;
          const trajEnd = trajStart + traj.durTot;
          const c1 = trajStart >= startTime && trajStart <= endTime;
          const c2 = trajEnd >= startTime && trajEnd <= endTime;
          const c3 = trajStart <= startTime && trajEnd >= endTime;
          const c4 = traj.id !== 12;
          return (c1 || c2 || c3) && c4;
        })
      const overlappingTrajs = collectTrajs(trajs, options);
      overlappingTrajs.forEach(traj => {
        const rObj = trajRenderStatus.value.flat().find(obj => {
          return obj.uniqueId === traj.uniqueId
        });
        rObj!.selectedStatus = true;
      })
    }

    onMounted(() => {
      if (tranSvg.value) {
        setUpSvg();
        addSargamLines();
        initializeTracks();
        resetTranscription();
        // props.piece.instrumentation.forEach((inst, idx) => {
        //   instTracks.value.push({
        //     inst: inst,
        //     idx: idx,
        //     displaying: idx === 0,
        //     sounding: idx === 0
        //   })
        // })
        window.addEventListener('keydown', handleKeydown);
        window.addEventListener('keyup', handleKeyup);
      };

    });

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keyup', handleKeyup);
    });

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
      emptyDivIdxMap,
      selectedTrajs,
      editorMode,
      shifted,
      tracks
    }
  }
})
</script>

<style scopred>
.tranContainer {
  position: relative;
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