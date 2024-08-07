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
  nextTick,
  reactive,
  toRef
} from 'vue';
import * as d3 from 'd3';
import { linSpace, cumsum, getClosest } from '@/ts/utils.ts';
import { EditorMode, Instrument } from '@/ts/enums.ts';

import { Piece, Trajectory, Phrase, Pitch } from '@/js/classes.ts';
import { throttle } from 'lodash';
import { 
  SargamDisplayType, 
  VowelDisplayType, 
  ConsonantDisplayType,
  InstrumentTrackType,
  PhraseDivDisplayType,
  TrajSelectionStatus
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
    },
    editable: {
      type: Boolean,
      required: true
    },
    sargamMagnetMode: {
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
    const lowOctOffsetRef = toRef(props, 'lowOctOffset');
    const highOctOffsetRef = toRef(props, 'highOctOffset');

    const selPhraseDivColor = 'red';
    const dragDotColor = 'purple';
    let dragDotIdx: number | undefined = undefined;
    let dragShadowTraj: Trajectory | undefined = undefined;
    const minTrajDur = 0.05;

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

    const resetTrajRenderStatus = (persistingTrajUIds: string[] = []) => {
      for (let i = 0; i < props.piece.instrumentation.length; i++) {
        if (trajRenderStatus.value[i] === undefined) {
          trajRenderStatus.value.push([])
        }
        trajRenderStatus.value[i] = props.piece.allTrajectories(i).map(t => {
          return { 
            uniqueId: t.uniqueId!, 
            renderStatus: false,
            selectedStatus: persistingTrajUIds.includes(t.uniqueId!),
            track: i
          }
        })
      }
    }

    resetTrajRenderStatus();

    // computed values
    const trajStartTimes = computed(() => {
      const gridStartTimes = [];
      for (let i = 0; i < props.piece.instrumentation.length; i++) {
        const trajs = props.piece.allTrajectories(i);
        const durs = trajs.map(t => t.durTot);
        const startTimes = durs.reduce((acc, dur) => {
          if (typeof dur !== 'number') {
            throw new Error('Duration is not a number');
          }
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
      console.log('recomputing logmin')
      return Math.log2(props.piece.raga.fundamental) - lowOctOffsetRef.value;
    })
    const logMax = computed(() => {
      return Math.log2(props.piece.raga.fundamental) + highOctOffsetRef.value;
    })
    const logSargamVals = computed(() => {
      console.log('recomputing sargam values')
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
    const selectedTrajs = computed(() => {
      const uIds = trajRenderStatus.value.flat().filter(obj => {
        return obj.selectedStatus === true
      }).map(obj => obj.uniqueId);
      const out = props.piece.allTrajectories().filter(traj => {
        return uIds.includes(traj.uniqueId!)
      });
      return out
    });
    const chunkDur = computed(() => {
      return props.xScale.invert(props.clientWidth)
    });
    const selectedTraj = computed(() => {
      return selectedTrajs.value.length === 1 ? 
        selectedTrajs.value[0] : 
        undefined;
    })

    // watched values
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
            .attr('fill', props.instTracks[track].color);
          const vowelSelector = `.vowelLabel.uId${traj.uniqueId}`;
          d3.selectAll(vowelSelector)
            .attr('stroke', 'black')
          const consonantSelector = `.consonantLabel.uId${traj.uniqueId}`;
          d3.selectAll(consonantSelector)
            .attr('stroke', 'black')
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
          const vowelSelector = `.vowelLabel.uId${traj.uniqueId}`;
          d3.selectAll(vowelSelector)
            .attr('stroke', props.instTracks[track].selColor)
          const consonantSelector = `.consonantLabel.uId${traj.uniqueId}`;
          d3.selectAll(consonantSelector)
            .attr('stroke', props.instTracks[track].selColor)
        }
      });
      let status: TrajSelectionStatus = undefined;
      if (selectedTrajs.value.length > 0) {
        const traj = selectedTrajs.value[0];
        const track = props.piece.trackFromTraj(traj);
        const inst = props.piece.instrumentation[track] as Instrument;
        if (selectedTrajs.value.length === 1) {
          refreshDragDots();
        }
        status = { trajs: selectedTrajs.value, instrument: inst }
      }
      emit('update:TrajSelStatus', status);
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

    const addSargamLineG = () => {
      console.log('adding sargam line g')
      if (tranSvg.value) {
        const svg = d3.select(tranSvg.value);
        svg.append('g')
          .attr('class', 'sargamLines')
          .style('opacity', Number(props.showSargamLines))
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
      console.log('adding traj g')
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
      d3.selectAll('.sargamLines').remove();

    };

    const resetTranscription = () => {
      
      clearTranscription();
      const selectedTrajUIds = selectedTrajs.value.map(t => t.uniqueId!);
      resetTrajRenderStatus(selectedTrajUIds);
      resetEmptyObserverDivs();
      resetObserver();
      addSargamLineG();
      refreshSargamLines();
      initializeTracks();
      addPhraseDivG();
      addSargamG();
      addPhonemeG();
      addTrajG();
      clearDragDots();
      refreshDragDots();
      
    }

    const initializeTracks = () => {
      // for the number of instrumental tracks, have a different <g> element
      // for each track. I'd like to store these g's in an array.
      if (tranSvg.value) {
        const svg = d3.select(tranSvg.value);
        svg.selectAll('.transcriptionG').remove();
        tracks.length = 0;
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

    const renderTraj = (traj: Trajectory) => {
      const track = props.piece.trackFromTraj(traj);
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

    const removeTraj = (traj: Trajectory) => {
      const track = props.piece.trackFromTraj(traj);
      const renderObj = trajRenderStatus.value[track].find(obj => {
        return obj.uniqueId === traj.uniqueId
      });
      if (renderObj === undefined) {
        throw new Error('Trajectory not found in render status array');
      }
      if (renderObj.renderStatus === false) return;
      const trajG = tracks[track].select('.trajG');
      trajG.selectAll(`.uId${traj.uniqueId}`).remove();
      renderObj.renderStatus = false;
    };

    const renderMelodicCurve = (traj: Trajectory, track: number = 0) => {
      const trajUIds = props.piece.allTrajectories(track).map(t => t.uniqueId);
      const trajIdx = trajUIds.indexOf(traj.uniqueId);
      const trajStart = trajStartTimes.value[track][trajIdx];
      const trackG = tracks[track];
      const g = trackG.select('.trajG');
      const trajData = makeTrajData(traj, trajStart);
      const color = selectedTrajs.value.includes(traj) ? 
        props.instTracks[track].selColor : props.instTracks[track].color;
      g.append('path')
          .datum(trajData)
          .attr('d', trajCurve)
          .attr('fill', 'none')
          .attr('stroke', color)
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
      const trajUIds = props.piece.allTrajectories(track).map(t => t.uniqueId);
      const trajIdx = trajUIds.indexOf(traj.uniqueId);
      const trajStart = trajStartTimes.value[track][trajIdx];
      const trackG = tracks[track];
      const g = trackG.select('.trajG');
      const size = 20;
      const offset = (size ** 0.5) / 2;
      const color = selectedTrajs.value.includes(traj) ? 
        props.instTracks[track].selColor : props.instTracks[track].color;
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
          .attr('stroke', color)
          .attr('fill', color)
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
      const trajUIds = props.piece.allTrajectories(track).map(t => t.uniqueId);
      const trajIdx = trajUIds.indexOf(traj.uniqueId);
      const trajStart = trajStartTimes.value[track][trajIdx];
      const color = selectedTrajs.value.includes(traj) ? 
        props.instTracks[track].selColor : props.instTracks[track].color;
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
          .attr('stroke', color)
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

    const clearSargam = (uId: string) => {
      const g = d3.select('.sargamG');
      g.selectAll(`.uId${uId}`).remove();
    };

    const clearVowel = (uId: string) => {
      const g = d3.select('.phonemeG');
      g.selectAll(`.vowelLabel.uId${uId}`).remove();
    };

    const clearEndingConsonant = (uId: string) => {
      const g = d3.select('.phonemeG');
      g.selectAll(`.consonantLabel.uId${uId}`).remove();
    };

    const renderVowel = (v: VowelDisplayType) => {
      const svg = d3.select(tranSvg.value);
      const verticalOffset = 14;
      const y = props.yScale(v.logFreq) - verticalOffset;
      const x = props.xScale(v.time);
      const g = svg.select('.phonemeG');
      const choices = ['IPA', 'Devanagari', 'English'];
      const opacities = choices.map(c => {
        return c === props.phonemeRepresentation ? 1 : 0;
      });
      const track = props.piece.trackFromTrajUId(v.uId);
      const selT = selectedTraj.value;
      const color = (selT && selT.uniqueId === v.uId) ? 
        props.instTracks[track].selColor : 
        'black';
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 15)
        .attr('stroke', color)
        .attr('class', `vowelLabel IPA uId${v.uId}`)
        .attr('opacity', opacities[0])
        .attr('transform', d => `translate(${x}, ${y})` )
        .text(v.ipaText)
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 15)
        .attr('stroke', color)
        .attr('class', `vowelLabel Devanagari uId${v.uId}`)
        .attr('opacity', opacities[1])
        .attr('transform', d => `translate(${x}, ${y})` )
        .text(v.devanagariText)
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 15)
        .attr('stroke', color)
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
      const track = props.piece.trackFromTrajUId(c.uId);
      const selT = selectedTraj.value;
      const color = (selT && selT.uniqueId === c.uId) ? 
        props.instTracks[track].selColor : 
        'black';
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 15)
        .attr('stroke', color)
        .attr('class', `consonantLabel IPA uId${c.uId}`)
        .attr('opacity', opacities[0])
        .attr('transform', d => `translate(${x}, ${y})` )
        .text(c.ipaText)
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 15)
        .attr('stroke', color)
        .attr('class', `consonantLabel Devanagari uId${c.uId}`)
        .attr('opacity', opacities[1])
        .attr('transform', d => `translate(${x}, ${y})` )
        .text(c.devanagariText)
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 15)
        .attr('stroke', color)
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
          clearDragDots();
          selectedPhraseDivIdx.value = pd.idx;
          selectedTrajs.value.forEach(traj => {
            const rObj = trajRenderStatus.value.flat().find(obj => {
              return obj.uniqueId === traj.uniqueId
            });
            rObj!.selectedStatus = false;
          })
        })
        .attr('class', `phraseDivShadow pIdx${pd.idx}`)
    }

    const removePhraseDiv = (pdIdx: number) => {
      console.log(pdIdx)
      const g = d3.select('.phraseDivG');
      g.selectAll(`.pIdx${pdIdx}`).remove();
    }

    const handleClickTraj = (traj: Trajectory, track: number) => {
      selectedPhraseDivIdx.value = undefined;
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
        clearDragDots();
        const renderObj = trajRenderStatus.value[track].find(obj => {
          return obj.uniqueId === traj.uniqueId
        });
        renderObj!.selectedStatus = true;
      }
    };

    interface Datum {
      x: number,
      y: number
    }

    const constrainTime = (e: MouseEvent | 
        d3.D3DragEvent<SVGCircleElement, Datum, MouseEvent>,
        idx: number) => {
      let time = props.xScale.invert(e.x);
      const traj = selectedTrajs.value[0];
      const tIdx = traj.num!;
      const phrase = props.piece.phrases[traj.phraseIdx!];
      let times = [0, ...traj.durArray!.map(cumsum())];
      const startTime = phrase.startTime! + traj.startTime!;
      times = times.map(t => t * traj.durTot + startTime);
      if (idx === 0) {
        let start: number = 0;
        let prevTraj: Trajectory;
        if (tIdx > 0){
          prevTraj = phrase.trajectories[tIdx - 1];
          if (prevTraj.durArray && prevTraj.durArray.length > 1) {
            let prevTrajTimes = [0, ...prevTraj.durArray!.map(cumsum())];
            prevTrajTimes = prevTrajTimes.map(t => {
              const pst = phrase.startTime! + prevTraj.startTime!;
              return t * prevTraj.durTot + pst;
            })
            start = prevTrajTimes[prevTrajTimes.length - 2];
          } else {
            start = phrase.startTime! + prevTraj.startTime!;
          }
        } else if (traj.phraseIdx! > 0) {
          const prevPhrase = props.piece.phrases[traj.phraseIdx! - 1];
          const pTrajs = prevPhrase.trajectories;
          prevTraj = pTrajs[pTrajs.length - 1];
          if (prevTraj.durArray && prevTraj.durArray.length > 1) {
            let prevTrajTimes = [0, ...prevTraj.durArray!.map(cumsum())];
            prevTrajTimes = prevTrajTimes.map(t => {
              const pst = prevPhrase.startTime! + prevTraj.startTime!;
              return t * prevTraj.durTot + pst;
            })
            start = prevTrajTimes[prevTrajTimes.length - 2];
          } else {
            start = prevPhrase.startTime! + prevTraj.startTime!;
          }
        };
        if (prevTraj!.id === 12) {
          if (time < start) time = start
        } else {
          if (time < start + minTrajDur) {
            time = start + minTrajDur;
          }
        }
        if (time > times[1] - minTrajDur) {
          time = times[1] - minTrajDur;
        }
      } else if (idx < times.length - 1) {
        if (time < times[idx - 1] + minTrajDur) {
          time = times[idx - 1] + minTrajDur;
        }
        if (time > times[idx + 1] - minTrajDur) {
          time = times[idx + 1] - minTrajDur;
        }
      } else {
        let nextEnd: number = 0;
        let nextTraj: Trajectory;
        if (time < times[idx - 1] + minTrajDur) {
          time = times[idx - 1] + minTrajDur;
        }
        if (phrase.trajectories[tIdx + 1]) {
          nextTraj = phrase.trajectories[tIdx + 1];
          if (nextTraj.durArray && nextTraj.durArray.length > 1) {
            let nextTrajTimes = [0, ...nextTraj.durArray!.map(cumsum())];
            nextTrajTimes = nextTrajTimes.map(t => {
              const pst = phrase.startTime! + nextTraj.startTime!;
              return t * nextTraj.durTot + pst;
            })
            nextEnd = nextTrajTimes[1];
          } else {
            nextEnd = phrase.startTime! + nextTraj.startTime! + nextTraj.durTot;
          }
        } else if (props.piece.phrases[traj.phraseIdx! + 1]) {
          const nextPhrase = props.piece.phrases[traj.phraseIdx! + 1];
          nextTraj = nextPhrase.trajectories[0];
          if (nextTraj.durArray && nextTraj.durArray.length > 1) {
            let nextTrajTimes = [0, ...nextTraj.durArray!.map(cumsum())];
            nextTrajTimes = nextTrajTimes.map(t => {
              const pst = nextPhrase.startTime! + nextTraj.startTime!;
              return t * nextTraj.durTot + pst;
            })
            nextEnd = nextTrajTimes[1];
          } else {
            const start = nextPhrase.startTime! + nextTraj.startTime!;
            nextEnd = start + nextTraj.durTot;
          }
        }
        if (nextTraj!.id === 12) {
          if (time > nextEnd) time = nextEnd;
        } else {
          if (time > nextEnd - minTrajDur) {
            time = nextEnd - minTrajDur;
          }
        }
      }
      return time;
    };
    
    const calculateNewDurArray = (
        phrase: Phrase,
        traj: Trajectory,
        idx: number,
        time: number
        ) => {
      let times = [0, ...traj.durArray!.map(cumsum())];
      const startTime = phrase.startTime! + traj.startTime!;
      times = times.map(t => t * traj.durTot + startTime);
      const newTimes = times.slice();
      newTimes[idx] = time;
      let durArray = newTimes.slice(1).map((v, i) => v - newTimes[i]);
      const daSum = durArray.reduce((a, b) => a + b, 0);
      durArray = durArray.map(d => d / daSum);
      return durArray;
    };

    const newDurArrayA = (traj: Trajectory, delta: number) => {
      const initPortionA = traj.durArray![0] * traj.durTot;
      const newDur = traj.durTot - delta;
      const newPropA = (initPortionA - delta) / newDur;
      let newDurArray = traj.durArray!.map((i => i * traj.durTot / newDur));
      newDurArray[0] = newPropA;
      return newDurArray
    };

    const newDurArrayZ = (traj: Trajectory, delta: number) => {
      const initPartZ = traj.durArray![traj.durArray!.length-1] * traj.durTot;
      const newDur = traj.durTot + delta;
      const newPropZ = (initPartZ + delta) / newDur;
      let newDurArray = traj.durArray!.map((i => i * traj.durTot / newDur));
      newDurArray[newDurArray.length - 1] = newPropZ;
      return newDurArray;
    };

    const dragDotStart = (e: d3.D3DragEvent<
      SVGCircleElement, Datum, MouseEvent
    >) => {
      const traj = selectedTrajs.value[0];
      const phrase = props.piece.phrases[traj.phraseIdx!];
      const startTime = phrase.startTime! + traj.startTime!;
      dragDotIdx = Number(e.sourceEvent.target.id.split('dragDot')[1]);
      const trajData = makeTrajData(traj, startTime);
      const trajG = d3.select(tranSvg.value)
        .select('.trajG')
      trajG.append('path')
        .datum(trajData)
        .attr('d', trajCurve)
        .classed('dragShadowTraj', true)
        .attr('fill', 'none')
        .attr('stroke', props.instTracks[0].color)
        .attr('stroke-width', '3px')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .style('opacity', '0.35')
    };

    const updateTrajCurve = throttle((
        traj: Trajectory, 
        startTime: number) => {
      const data = makeTrajData(traj, startTime);
      d3.select('.dragShadowTraj')
        .datum(data)
        .attr('d', trajCurve)
    }, 50)

    const updateDurArray = (traj: any, delta: number) => {
      if (traj.durArray && traj.durArray.length > 1) {
        const initPortionA = traj.durArray[0] * traj.durTot;
        const newDur = traj.durTot - delta;
        const newPropA = (initPortionA - delta) / newDur;
        const newDurArr = traj.durArray.map((i: number) => i * traj.durTot / newDur);
        newDurArr[0] = newPropA;
        traj.durArray = newDurArr;
      }
    };

    const updatePrevTraj = (prevTraj: any, delta: number) => {
      if (prevTraj.durArray && prevTraj.durArray.length > 1) {
        prevTraj.durArray = newDurArrayZ(prevTraj, delta);
      }
      prevTraj.durTot += delta;
    };

    const updateNextTraj = (nextTraj: any, delta: number) => {
      if (nextTraj.durArray && nextTraj.durArray.length > 1) {
        nextTraj.durArray = newDurArrayA(nextTraj, delta);
      }
      nextTraj.durTot -= delta;
      nextTraj.startTime! += delta;
    };

    const updatePhraseChikaris = (phrase: any, delta: number) => {
      Object.keys(phrase.chikaris).forEach(key => {
        const nk = (Math.round(100 * (Number(key) - delta)) / 100).toString();
        if (nk !== key) {
          phrase.chikaris[nk] = phrase.chikaris[key];
          delete phrase.chikaris[key];
        }
      });
    };

    const dragDotMove = (e: d3.D3DragEvent<SVGCircleElement, Datum, MouseEvent>) => {
      const time = constrainTime(e, dragDotIdx!);
      const x = props.xScale(time);
      d3.select(`#dragDot${dragDotIdx}`)
        .attr('cx', x)
        .attr('cy', e.y);
      const traj = selectedTrajs.value[0];
      const idx = dragDotIdx!;
      const tIdx = traj.num!;
      const pIdx = traj.phraseIdx!;
      const phrase = props.piece.phrases[pIdx];
      const logFreq = props.yScale.invert(e.y);
      if (traj.logFreqs[idx]) {
        const basePitch = new Pitch(traj.pitches[idx]);
        basePitch.logOffset = 0;
        const logOffset = logFreq - basePitch.logFreq;
        traj.pitches[idx].logOffset = logOffset;
      }
      if (idx > 0 && idx < traj.durArray!.length) {
        const newDurArray = calculateNewDurArray(phrase, traj, idx, time);
        traj.durArray = newDurArray;
      } else if (idx === 0) {
        const delta = time - (phrase.startTime! + traj.startTime!);
        if (tIdx === 0) {
          const prevPhrase = props.piece.phrases[pIdx - 1];
          const prevTraj = prevPhrase.trajectories[prevPhrase.trajectories.length - 1];
          updatePrevTraj(prevTraj, delta);
          updateDurArray(traj, delta);
          traj.durTot -= delta;
          phrase.startTime! += delta;
          updatePhraseChikaris(phrase, delta);
        } else {
          const prevTraj = phrase.trajectories[tIdx - 1];
          updatePrevTraj(prevTraj, delta);
          updateDurArray(traj, delta);
          traj.durTot -= delta;
          phrase.durTotFromTrajectories();
          phrase.durArrayFromTrajectories();
          phrase.assignStartTimes();
        }
      } else if (idx === traj.durArray!.length) {
        const delta = time - (phrase.startTime! + traj.startTime! + traj.durTot);
        if (tIdx < phrase.trajectories.length - 1) {
          const nextTraj = phrase.trajectories[tIdx + 1];
          updateNextTraj(nextTraj, delta);
          if (traj.durArray!.length > 1) {
            traj.durArray = newDurArrayZ(traj, delta);
          }
          traj.durTot += delta;
          phrase.durArrayFromTrajectories();
        } else if (props.piece.phrases[pIdx + 1]) {
          const nextPhrase = props.piece.phrases[pIdx + 1];
          const nextTraj = nextPhrase.trajectories[0];
          updateNextTraj(nextTraj, delta);
          nextPhrase.startTime! += delta;
          nextPhrase.durTotFromTrajectories();
          nextPhrase.durArrayFromTrajectories();
          nextPhrase.assignStartTimes();
          const tda = traj.durArray!;
          if (tda.length > 1) {
            const initPartZ = tda[tda.length - 1] * traj.durTot;
            const newDur = traj.durTot + delta;
            const newPropZ = (initPartZ + delta) / newDur;
            const newDurArray = tda.map((i => i * traj.durTot / newDur));
            newDurArray[tda.length - 1] = newPropZ;
            traj.durArray = newDurArray;
          }
          traj.durTot += delta;
          phrase.durTotFromTrajectories();
          phrase.durArrayFromTrajectories();
          phrase.assignStartTimes();
          updatePhraseChikaris(nextPhrase, delta);
        }
      }
      // this looks good, but it maybe is causing visual discomfort ...
      // updateTrajCurve(traj, phrase.startTime! + traj.startTime!);
    };

    const dragDotEnd = (e: d3.D3DragEvent<
      SVGCircleElement, Datum, MouseEvent
    >) => {
      d3.selectAll('.dragShadowTraj').remove();
      emit('unsavedChanges', true);
      const idx = dragDotIdx!;
      const traj = selectedTrajs.value[0];
      const phrase = props.piece.phrases[traj.phraseIdx!];
      const pIdx = traj.phraseIdx!;
      const tIdx = traj.num!;
      const time = constrainTime(e, idx);
      let logFreq = props.yScale.invert(e.y);
      if (props.sargamMagnetMode) {
        logFreq = getClosest(logSargamVals.value, logFreq);
      }
      const y = props.yScale(logFreq);
      const selectedDragDot = d3.select(`#dragDot${idx}`);
      selectedDragDot.attr('cy', y);
      const newPitch = () => {
        return props.piece.raga.pitchFromLogFreq(logFreq)
      };
      if (traj.logFreqs[idx]) {
        traj.pitches[idx] = newPitch();
        if (idx === 0 && traj.id === 0) { // if first dot of fixed traj
          traj.pitches[1] = newPitch();
          d3.select(`#dragDot1`)
            .attr('cy', y);
        } else if (idx === 1 && traj.id === 0) { // if second dot of fixed traj
          traj.pitches[0] = newPitch();
          d3.select(`#dragDot0`)
            .attr('cy', y);
        }
      }
      const affectedTrajs = [traj];
      let affectedPhraseDivIdx = undefined;
      if (idx === 0) {
        if (tIdx === 0) {
          if (pIdx > 0) {
            const prevPhrase = props.piece.phrases[pIdx - 1];
            const prevTraj = prevPhrase.trajectories[prevPhrase.trajectories.length - 1];
            affectedTrajs.push(prevTraj);
            affectedPhraseDivIdx = phrase.pieceIdx;
          }
        } else {
          const prevTraj = phrase.trajectories[tIdx - 1];
          affectedTrajs.push(prevTraj);
        }
      } else if (idx === traj.durArray!.length) {
        if (tIdx < phrase.trajectories.length - 1) {
          const nextTraj = phrase.trajectories[tIdx + 1];
          affectedTrajs.push(nextTraj);
        } else if (props.piece.phrases[pIdx + 1]) {
          const nextPhrase = props.piece.phrases[pIdx + 1];
          const nextTraj = nextPhrase.trajectories[0];
          affectedTrajs.push(nextTraj);
          affectedPhraseDivIdx = nextPhrase.pieceIdx;
        }
      }
      affectedTrajs.forEach(traj => refreshTraj(traj));
      if (affectedPhraseDivIdx !== undefined) {
        console.log('removing phrase div' + affectedPhraseDivIdx)
        removePhraseDiv(affectedPhraseDivIdx);
        const pdObj = props.piece.allPhraseDivs()[affectedPhraseDivIdx - 1];
        renderPhraseDiv(pdObj);
      }
    };

    const refreshTraj = (traj: Trajectory) => {
      removeTraj(traj);
      renderTraj(traj);
      refreshSargam(traj.uniqueId!);
      refreshVowel(traj.uniqueId!);
      refreshEndingConsonant(traj.uniqueId!);
      refreshDragDots();

    };

    const refreshDragDots = () => {
      if (selectedTrajs.value.length === 1) {
        const traj = selectedTrajs.value[0];
        const track = props.piece.trackFromTrajUId(traj.uniqueId!);
        const phrase = props.piece.phrases[traj.phraseIdx!];
        d3.selectAll('.dragDots').remove();
        const drag = () => {
          return d3.drag<SVGCircleElement, Datum>()
          .on('start', dragDotStart)
          .on('drag', dragDotMove)
          .on('end', dragDotEnd)
        };
        const dragDotsG = d3.select(tranSvg.value)
        .append('g')
        .attr('class', `dragDots track${track}` )
        let times = [0, ...traj.durArray!.map(cumsum())];
        const startTime = phrase.startTime! + traj.startTime!;
        times = times.map(t => t * traj.durTot + startTime);
        const logFreqs = times.map((_, i) => {
          return traj.logFreqs[i] || traj.logFreqs[i - 1]
        });
        times.forEach((t, i) => {
          dragDotsG.append('circle')
            .attr('id', `dragDot${i}`)
            .attr('class', `track${track}`)
            .attr('cx', props.xScale(t))
            .attr('cy', props.yScale(logFreqs[i]))
            .attr('r', 4)
            .style('fill', dragDotColor)
            .style('cursor', 'pointer')
        })
        if (props.editable) {
          (dragDotsG.selectAll('circle') as d3.Selection<
              SVGCircleElement, Datum, SVGGElement, undefined
            >)
            .call(drag())
        }
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
          .data(logSargamVals.value)
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

    const refreshSargamLines = () => {
      console.log('refreshign sargam lines')
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
      const sargamLinesG = svg.select('.sargamLines');
      logSargamVals.value.forEach((s, idx) => {
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
    };

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
      });
      clearDragDots();
      selectedPhraseDivIdx.value = undefined;
    }

    const clearDragDots = () => {
      d3.selectAll('.dragDots').remove();
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

    const setUpSvg = () => {
      const svg = (d3.select(tranSvg.value) as 
        d3.Selection<SVGSVGElement, Datum, null, undefined>);
      const selBoxDrag = d3.drag<SVGSVGElement, Datum>()
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
      if (selectedTraj.value) {
        if (overlappingTrajs.length > 0) {
          if (overlappingTrajs.length === 1) {
            if (selectedTraj.value.uniqueId !== overlappingTrajs[0].uniqueId) {
              clearDragDots();
            }
          } else {
            clearDragDots();
          }
        }
      }
      
      
      overlappingTrajs.forEach(traj => {
        const rObj = trajRenderStatus.value.flat().find(obj => {
          return obj.uniqueId === traj.uniqueId
        });
        rObj!.selectedStatus = true;
      })
    };

    const refreshSargam = (trajUId: string) => {
      const track = props.piece.trackFromTrajUId(trajUId);
      const sargamDisplayObjs = props.piece.allDisplaySargam(track)
        .filter(obj => obj.uId === trajUId);
      if (sargamDisplayObjs.length > 0) {
        clearSargam(trajUId);
        sargamDisplayObjs.forEach(obj => {
          renderSargam(obj);
        })
      }
    };

    const refreshVowel = (trajUId: string) => {
      const track = props.piece.trackFromTrajUId(trajUId);
      const vowelDisplayObjs = props.piece.allDisplayVowels(track)
        .filter(obj => obj.uId === trajUId);
      clearVowel(trajUId);
      if (vowelDisplayObjs.length > 0) {
        vowelDisplayObjs.forEach(obj => {
          renderVowel(obj);
        })
      }
    };

    const refreshEndingConsonant = (trajUId: string) => {
      const track = props.piece.trackFromTrajUId(trajUId);
      const consonantDisplayObjs = props.piece.allDisplayEndingConsonants(track)
        .filter(obj => obj.uId === trajUId);
      clearEndingConsonant(trajUId);
      if (consonantDisplayObjs.length === 1) {
        renderEndingConsonant(consonantDisplayObjs[0]);
      }
    }




    const mutateTraj = (newIdx: number) => {
      if (selectedTraj.value === undefined) {
        throw new Error('No selected trajectory');
      };
      const trajObj = selectedTraj.value.toJSON();
      trajObj.id = newIdx;
      const newTraj = new Trajectory(trajObj);
      const pIdx = selectedTraj.value.phraseIdx!;
      const phrase = props.piece.phrases[pIdx];
      const tIdx = selectedTraj.value.num!;
      const track = props.piece.trackFromTraj(selectedTraj.value);
      phrase.trajectoryGrid[track][tIdx] = newTraj;
      phrase.assignStartTimes();
      phrase.assignPhraseIdx();
      phrase.assignTrajNums();
      removeTraj(selectedTraj.value);
      renderTraj(newTraj);
      refreshSargam(newTraj.uniqueId!);
      refreshVowel(newTraj.uniqueId!);
      refreshEndingConsonant(newTraj.uniqueId!);
      emit('unsavedChanges', true);
    };

    onMounted(() => {
      if (tranSvg.value) {
        setUpSvg();
        // refreshSargamLines();
        // initializeTracks();
        resetTranscription();
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
      selectedTraj,
      editorMode,
      shifted,
      tracks,
      mutateTraj,
      refreshDragDots,
      refreshVowel,
      refreshEndingConsonant,
      refreshTraj,
      lowOctOffsetRef,
      highOctOffsetRef,
      logMin,
      logMax
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