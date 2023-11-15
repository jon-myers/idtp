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
    </div>
  </div>
</template>
<script lang='ts'>

import Gradient from 'javascript-color-gradient';
import { defineComponent, PropType } from 'vue';
import { 
  Piece,
  durationsOfFixedPitches,
  PhraseCatType
  
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
  topOfGraph: number,
}

const displayTime = (dur: number) => {
  const hours = Math.floor(dur / 3600);
  let minutes: number | string = Math.floor((dur - hours * 3600) / 60);
  let seconds: number | string = Math.round(dur % 60);
  if (seconds.toString().length === 1) seconds = '0' + seconds;
  if (hours !== 0) {
    if (minutes.toString().length === 1) minutes = '0' + minutes;
    return ([hours, minutes, seconds]).join(':')
  } else {
    return minutes + ':' + seconds 
  }
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
    secTopLevels: {
      type: Array as PropType<{ name: string, bool: boolean }[]>,
      required: true
    },
    diffs: {
      type: Object as PropType<{ [key: string]: 'include' | 'exclude' }>,
      required: true
    },
    phraseInfo: {
      type: Object as PropType<{
        phraseTypes: { name: keyof PhraseCatType['Phrase'], bool: boolean }[],
        elaborations: { name: keyof PhraseCatType['Elaboration'], bool: boolean }[],
        vocalArticulations: { name: keyof PhraseCatType['Vocal Articulation'], bool: boolean }[],
        instArticulations: { name: keyof PhraseCatType['Instrumental Articulation'], bool: boolean }[],
        incidentals: { name: keyof PhraseCatType['Incidental'], bool: boolean }[],
      }>,
       required: true
    },
    vocal: {
      type: Boolean,
      required: true
    }


  },
  data(): PitchPrevalenceDataType {
    return {

      showGraph: true,
      margin: 10,
      graphHeight: 600,
      xAxisHeight: 70,
      yAxisWidth: 70,
      topOfGraph: 80,
    }
  },

  mounted() {
    this.generateGraph();
    window.addEventListener('resize', this.resetWidth);
  
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.resetWidth);
  },

  methods: {

    generateGraph() {
      if (this.segmentation === 'Section') {
        this.generateSectionGraph();
      } else if (this.segmentation === 'Phrase') {
        this.generatePhraseGraph();
      } else if (this.segmentation === 'Duration') {
        this.generateDurationGraph();
      }
    },

    generateSectionGraph() {
      this.topOfGraph = 80;
      d3.select('.axisSVG').remove();
      d3.select('.gSVG').remove();
      let segments = this.piece.sections.map(s => s.trajectories);
      const func = this.pitchRepresentation === 'Fixed Pitch' ?
        durationsOfFixedPitches :
        durationsOfPitchOnsets;
      const durIdxs: number[] = [];
      const durs = segments.map((seg, sIdx) => {
        if (seg.length === 0) {
          return undefined;
        } else {
          return func(seg, {
            countType: 'proportional',
            outputType: this.pitchChroma ? 'chroma' : 'pitchNumber',
            maxSilence: this.fadeTime
          })
        }  
      }).filter((seg, sIdx) => {
        let bool1 = false;
        if (seg !== undefined) {
          bool1 = true;
        }
        let bool2 = false;
        this.secTopLevels.forEach(sec => {
          const section = this.piece.sections[sIdx];
          const sCat = section.categorization;
          if (sec.name === sCat['Top Level'] && sec['bool'] === true) {
            bool2 = true;
          }
        })
        if (bool1 && bool2) {
          durIdxs.push(sIdx);
          return true;
        }
      })
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

      this.graphHeight = this.height - this.xAxisHeight - this.topOfGraph - this.margin * 2;
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
          return this.piece.raga.scaleNumberToSargamLetter(sn);
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
        .attr('transform', `translate(${this.yAxisWidth}, ${this.xAxisHeight + this.topOfGraph})`);
      
        // horizontal line above sargam
      this.addLine({
        x1: this.yAxisWidth - 35,
        x2: this.yAxisWidth,
        y1: this.xAxisHeight + this.topOfGraph,
        y2: this.xAxisHeight + this.topOfGraph,
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
          y1: this.xAxisHeight + this.topOfGraph - d.num,
          y2: this.xAxisHeight + this.topOfGraph - d.num,
          stroke: 'black',
          element: axisSVG
        })
        this.addText({
          x: this.yAxisWidth - 35,
          y: this.xAxisHeight + this.topOfGraph - d.num + 10,
          text: d.text,
          element: axisSVG
        
        })
      })

      // vertical line top left
      this.addLine({
        x1: this.yAxisWidth - 70,
        x2: this.yAxisWidth - 70,
        y1: this.xAxisHeight + this.topOfGraph - 140,
        y2: this.xAxisHeight + this.topOfGraph,
        stroke: 'black',
        element: axisSVG
      })
      this.addLine({
        x1: this.yAxisWidth,
        x2: this.yAxisWidth,
        y1: this.xAxisHeight,
        y2: this.xAxisHeight + this.topOfGraph,
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
          y1: this.xAxisHeight + this.topOfGraph - wl.num,
          y2: this.xAxisHeight + this.topOfGraph - wl.num,
          stroke: 'black',
          element: axisSVG,
          class_: 'wideLine'
        });
        this.addText({
          x: this.yAxisWidth - 70 + totalWidth / 2,
          y: this.xAxisHeight + this.topOfGraph - wl.num + 15,
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
        y2: this.xAxisHeight,
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
          y: this.xAxisHeight + this.topOfGraph + y((lowY + highY) / 2 - 0.5), 
          text: i, 
          element: axisSVG 
        })
        const h_ = y(lowY) - y(highY);
        const y_ = y(highY - 0.5);
        const add = i === lkOct ? - 0.5 : 0;
        this.addRect({
          x: this.yAxisWidth - 70,
          y: this.xAxisHeight + this.topOfGraph + y_,
          w: 35,
          h: h_ + add,
          stroke: 'black',
          element: axisSVG
        });
        const lY_ = y(lowY - 0.5);
        this.addLine({ 
          x1: this.yAxisWidth - 35,
          y1: lY_ + this.xAxisHeight + add + this.topOfGraph,
          x2: this.yAxisWidth - add * 2,
          y2: lY_ + this.xAxisHeight + add + this.topOfGraph,
          stroke: 'black',
          element: axisSVG
        })
      };

      //  first need to get width of graph
      const widthPerSeg = 80;
      const width = widthPerSeg * durs.length;


      const gSVG = d3.select('.scrollingGraphHolder')
        .append('svg')
        .attr('width', width)
        .attr('height', this.graphHeight + 80 - 1.5)
        .style('background-color', 'white')
        .attr('transform', `translate(-0.5, 0)`)
        .classed('gSVG', true);
      
      const sectionRects = [...Array(durs.length)];
      if (this.condensed) {
        // transform durs
        durs.forEach((dur) => {
          
          if (dur === undefined) {
            throw new Error('dur is undefined');
          }
          const keys = Object.keys(dur);
          keys.forEach(key => {
            const sn = this.piece.raga.pitchNumberToScaleNumber(Number(key));
            dur[sn] = dur[key];
            if (Number(key) !== Number(sn)) delete dur[key];
          })
        });
      }
      durs.forEach((dur, dIdx) => {
          let minVal: (number | undefined) = undefined; 
          let maxVal: (number | undefined) = undefined;
          let modeIdx: number | undefined = undefined; 
          let modeVal = 0;
          if (dur === undefined) {
            throw new Error('dur is undefined');
          }
          const keys = Object.keys(dur);
          if (keys.length > 0) {
            keys.forEach(key => {
              if (key !== 'sIdx') {
                if (minVal === undefined) {
                  minVal = Number(key);
                }
                if (maxVal === undefined) {
                  maxVal = Number(key);
                }
                if (Number(key) < minVal) {
                  minVal = Number(key);
                }
                if (Number(key) > maxVal) {
                  maxVal = Number(key);
                }
                if (Number(dur[key]) > modeVal) {
                  modeVal = Number(dur[key]);
                  modeIdx = Number(key);
                }
              }
            })
            if (maxVal === undefined) {
              throw new Error('maxVal is undefined');
            }
            if (minVal === undefined) {
              throw new Error('minVal is undefined');
            }
            maxVal = maxVal + 0.5;
            minVal = minVal - 0.5;  
            const x_ = dIdx * width / durs.length;
            const y_ = y(maxVal) + this.topOfGraph;
            const w_ = width / durs.length;
            const h_ = y(minVal) - y(maxVal);
            if ((!this.pitchChroma) && (!this.heatmap)) {
              sectionRects[dIdx] = this.addRect({
                x: x_,
                y: y_,
                w: w_,
                h: h_,
                fill: this.heatmap ? 'none' : '#D3D3D3',
                element: gSVG
              })
            }

            
            keys.forEach((key, kIdx) => {

              let fillColor = 'black';
              const mY_ = y(Number(key)+0.5) + this.topOfGraph;
              const mH_ = y(Number(key)-0.5) - y(Number(key)+0.5);
              if (this.heatmap) {
                fillColor = this.getHeatmapColor(dur[key]);
                this.addRect({ 
                  x: x_, 
                  y: mY_, 
                  w: w_, 
                  h: mH_, 
                  fill: fillColor,
                  element: gSVG
                });
                this.addText({ 
                  x: x_ + width / (2 * durs.length), 
                  y: y(Number(key)) + this.topOfGraph, 
                  text: (100*dur[key]).toFixed(0)+'%',
                  fill: dur[key] > 0.5 ? 'white' : 'black',
                  element: gSVG
                })
              } else {
                if (Number(key) === modeIdx) {
                  fillColor = 'white'
                  this.addRect({ 
                    x: x_, 
                    y: mY_, 
                    w: w_, 
                    h: mH_, 
                    fill: 'grey',
                    element: gSVG 
                  })
                } else if (this.pitchChroma) {
                  this.addRect({ 
                    x: x_, 
                    y: mY_, 
                    w: w_, 
                    h: mH_, 
                    fill: '#D3D3D3',
                    element: gSVG
                  })
                }
                this.addText({ 
                  x: x_ + width / (2 * durs.length), 
                  y: y(Number(key)) + this.topOfGraph, 
                  text: (100*dur[key]).toFixed(0)+'%', 
                  fill: fillColor,
                  element: gSVG
                })
              }

            })
            if ((!this.pitchChroma) && (this.heatmap)) {
              sectionRects[dIdx] = this.addRect({
                x: x_,
                y: y_,
                w: w_,
                h: h_,
                fill: this.heatmap ? 'none' : '#D3D3D3',
                element: gSVG
              })
            }
          }
        })
        sectionRects.forEach(rect => {
          rect?.attr('stroke', 'black')
        });
        for (let i = lkOct; i <= hOct; i++) {
          let lowY = i * ppOct;
          let highY = (i+1) * ppOct;
          if (i === lkOct) {
            lowY = lowestKey - 0.5;
          }
          if (i === hOct) {
            highY = highestKey + 1.5;
          }
          const yPos = y((lowY + highY) / 2 - 0.5) + this.topOfGraph;
          this.addText({ x: -45, y: yPos, text: i, element: gSVG })
          const h_ = y(lowY) - y(highY);
          const y_ = y(highY - 0.5) + this.topOfGraph;
          this.addRect({ x: -60, y: y_, w: 30, h: h_, stroke: 'black', element: gSVG })
          const lY_ = y(lowY - 0.5) + this.topOfGraph;
          this.addLine({ x1: -30, y1: lY_, x2: width, y2: lY_, element: gSVG })
          if (i === hOct) {
            this.addLine({ x1: -30, y1: y_, x2: width, y2: y_, element: gSVG })
          }
          this.addLine({ x1: width, y1: lY_, x2: width, y2: y_, element: gSVG })
          this.addLine({ x1: -60, y1: -60 + this.topOfGraph, x2: width, y2: -60 + this.topOfGraph, element: gSVG })
          this.addLine({ x1: -60, y1: -40 + this.topOfGraph, x2: width, y2: -40 + this.topOfGraph, element: gSVG })
          this.addLine({ x1: -60, y1: -20 + this.topOfGraph, x2: width, y2: -20 + this.topOfGraph, element: gSVG })
          this.addLine({ x1: -60, y1: -80, x2: width, y2: -80, element: gSVG })
          this.addLine({ x1: -60, y1: -140, x2: width, y2: -140, element: gSVG })
          this.addLine({ x1: -60, y1: 0, x2: -60, y2: -140, element: gSVG })
          this.addLine({ x1: 0, y1: 0, x2: 0, y2: -80, element: gSVG })
          this.addLine({ x1: width, y1: 0, x2: width, y2: -140, element: gSVG })
          this.addLine({ x1: -60, y1: -110, x2: width, y2: -110, element: gSVG })
          durs.forEach((dur, dIdx) => {
            const sIdx = durIdxs[dIdx];
            const sCats = this.piece!.sectionCategorization[sIdx];
            const secPhrases = this.piece!.sections[sIdx].phrases;
            if (secPhrases.length > 0) {  
              const st = secPhrases[0].startTime!;
              const lastPhrase = secPhrases[secPhrases.length - 1];
              const et = lastPhrase.startTime! + lastPhrase.durTot!;
              const x_ = widthPerSeg * (dIdx + 0.5);
              this.addText({ x: x_, y: -50 + this.topOfGraph, text: displayTime(st), element: gSVG });
              this.addText({ x: x_, y: -70 + this.topOfGraph, text: sIdx + 1, element: gSVG })
              this.addText({ x: x_, y: -30 + this.topOfGraph, text: displayTime(et - st), element: gSVG });
              this.addText({ x: x_, y: -10 + this.topOfGraph, text: sCats['Top Level'], element: gSVG })
              if (dIdx !== durs.length - 1) {
                const x_ = widthPerSeg * (dIdx + 1)
                this.addLine({ 
                  x1: x_, 
                  y1: this.topOfGraph, 
                  x2: x_, 
                  y2: 0, 
                  stroke: '#D3D3D3',
                  element: gSVG 
                })
              }  
            }    

          })
           
        }

      

     
    },

    generatePhraseGraph() {
      d3.select('.axisSVG').remove();
      d3.select('.gSVG').remove();
      let segments = this.piece.phrases.map(p => p.trajectories);
      const func = this.pitchRepresentation === 'Fixed Pitch' ?
        durationsOfFixedPitches :
        durationsOfPitchOnsets;
      const durIdxs: number[] = [];
      let phraseTypeHeight = 1, elabHeight = 1, artHeight = 1, incHeight = 1; 
      const durs = segments.map(seg => {
        if (seg.length === 0) {
          return undefined
        } else {
          return func(seg, {
            countType: 'proportional',
            outputType: this.pitchChroma ? 'chroma' : 'pitchNumber',
            maxSilence: this.fadeTime
          })
        }
      }).filter((seg, pIdx) => {
        let bool1 = false;
        if (seg !== undefined) {
          bool1 = true
        }
        let bool2 = false; //part of section that is not allowed to be shown
        this.secTopLevels.forEach(sec => {
          const sIdx = this.piece.sIdxFromPIdx(pIdx);
          const section = this.piece.sections[sIdx];
          const sCat = section.categorization;
          if (sec.name === sCat['Top Level'] && sec['bool'] === true) {
            bool2 = true;
          }
        });
        
        const phrase = this.piece.phrases[pIdx];
        const pCat = phrase.categorizationGrid[0];

        // check if phrase type is allowed
        let ptBool = false; // phrase type bool
        const ptKeys = Object.keys(pCat.Phrase) as (keyof typeof pCat.Phrase)[];
        const thesePhraseTypes = ptKeys.filter(pt => {
          return pCat.Phrase[pt] === true;
        });
        const newPhraseTypeHeight = thesePhraseTypes.length > 1 ? 
          thesePhraseTypes.length : 
          1;
        if (newPhraseTypeHeight > phraseTypeHeight) {
          phraseTypeHeight = newPhraseTypeHeight;
        }
        const selectedPhraseTypes = this.phraseInfo.phraseTypes.filter(pt => {
          return pt.bool === true;
        });
        if (thesePhraseTypes.length === 0) {
          ptBool = true;
        } else if (this.diffs['phraseTypeDiff'] === 'include') {
          selectedPhraseTypes.forEach(pt => {
            if (thesePhraseTypes.includes(pt.name)) {
              ptBool = true;
            }
          })
        } else if (this.diffs['phraseTypeDiff'] === 'exclude') {
          ptBool = true;
          selectedPhraseTypes.forEach(pt => {
            if (thesePhraseTypes.includes(pt.name)) {
              ptBool = false;
            }
          })
        }

        // check if elaboration is allowed
        let elabBool = false;
        const elabKeys = Object.keys(pCat.Elaboration) as 
          (keyof typeof pCat.Elaboration)[];
        const theseElabs = elabKeys.filter(elab => {
          return pCat.Elaboration[elab] === true;
        });
        const newElabHeight = theseElabs.length > 1 ? theseElabs.length : 1;
        if (newElabHeight > elabHeight) {
          elabHeight = newElabHeight;
        }
        const selectedElabs = this.phraseInfo.elaborations.filter(elab => {
          return elab.bool === true;
        });
        if (theseElabs.length === 0) {
          elabBool = true;
        } else if (this.diffs['elaborationDiff'] === 'include') {
          selectedElabs.forEach(elab => {
            if (theseElabs.includes(elab.name)) {
              elabBool = true;
            }
          })
        } else if (this.diffs['elaborationDiff'] === 'exclude') {
          elabBool = true;
          selectedElabs.forEach(elab => {
            if (theseElabs.includes(elab.name)) {
              elabBool = false;
            }
          })
        }

        // if vocal, check if vocal articulation is allowed, else check if 
        // instrumental articulation is allowed
        let artBool = false;
        if (this.vocal) {
          const artKeys = Object.keys(pCat['Vocal Articulation']) as 
            (keyof typeof pCat['Vocal Articulation'])[];
          const theseArts = artKeys.filter(art => {
            return pCat['Vocal Articulation'][art] === true;
          });
          const newArtHeight = theseArts.length > 1 ? theseArts.length : 1;
          if (newArtHeight > artHeight) {
            artHeight = newArtHeight;
          }
          const selectedArts = this.phraseInfo.vocalArticulations.filter(art => {
            return art.bool === true;
          });
          if (theseArts.length === 0) {
            artBool = true;
          } else if (this.diffs['articulationDiff'] === 'include') {
            selectedArts.forEach(art => {
              if (theseArts.includes(art.name)) {
                artBool = true;
              }
            })
          } else if (this.diffs['articulationDiff'] === 'exclude') {
            artBool = true;
            selectedArts.forEach(art => {
              if (theseArts.includes(art.name)) {
                artBool = false;
              }
            })
          }
        } else {
          const artKeys = Object.keys(pCat['Instrumental Articulation']) as 
            (keyof typeof pCat['Instrumental Articulation'])[];
          const theseArts = artKeys.filter(art => {
            return pCat['Instrumental Articulation'][art] === true;
          });
          artHeight = theseArts.length > 1 ? theseArts.length : 1;
          const selectedArts = this.phraseInfo.instArticulations.filter(art => {
            return art.bool === true;
          });
          if (theseArts.length === 0) {
            artBool = true;
          } else if (this.diffs['articulationDiff'] === 'include') {
            selectedArts.forEach(art => {
              if (theseArts.includes(art.name)) {
                artBool = true;
              }
            })
          } else if (this.diffs['articulationDiff'] === 'exclude') {
            artBool = true;
            selectedArts.forEach(art => {
              if (theseArts.includes(art.name)) {
                artBool = false;
              }
            })
          }
        }

        // check if incidental is allowed
        let incBool = false;
        const incKeys = Object.keys(pCat.Incidental) as 
          (keyof typeof pCat.Incidental)[];
        const theseIncs = incKeys.filter(inc => {
          return pCat.Incidental[inc] === true;
        });
        const newIncHeight = theseIncs.length > 1 ? theseIncs.length : 1;
        if (newIncHeight > incHeight) {
          incHeight = newIncHeight;
        }
        const selectedIncs = this.phraseInfo.incidentals.filter(inc => {
          return inc.bool === true;
        });
        if (theseIncs.length === 0) {
          incBool = true;
        } else if (this.diffs['incidentalDiff'] === 'include') {
          selectedIncs.forEach(inc => {
            if (theseIncs.includes(inc.name)) {
              incBool = true;
            }
          })
        } else if (this.diffs['incidentalDiff'] === 'exclude') {
          incBool = true;
          selectedIncs.forEach(inc => {
            if (theseIncs.includes(inc.name)) {
              incBool = false;
            }
          })
        }
        if (bool1 && bool2 && ptBool && elabBool && artBool && incBool) {
          durIdxs.push(pIdx);
          return true;
        } else {
          return false;
        }
      });
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
      const sumHeights = phraseTypeHeight + elabHeight + artHeight + incHeight;
      this.topOfGraph = 100 + 20 * sumHeights;
      this.graphHeight = this.height - this.xAxisHeight - this.topOfGraph - this.margin * 2;
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
          return this.piece.raga.scaleNumberToSargamLetter(sn);
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
        .attr('transform', `translate(${this.yAxisWidth}, ${this.xAxisHeight + this.topOfGraph})`);
      
      // horizontal line above sargam
      this.addLine({
        x1: this.yAxisWidth - 35,
        x2: this.yAxisWidth,
        y1: this.xAxisHeight + this.topOfGraph,
        y2: this.xAxisHeight + this.topOfGraph,
        stroke: 'black',
        element: axisSVG
      });

      // const aboveAxLines = [
      //   { num: 20, text: 'Incidental' },
      //   { num: 40, text: 'Articulation' },
      //   { num: 60, text: 'Elaboration' },
      //   { num: 80, text: 'Phrase' },
      //   { num: 100, text: 'Duration' },
      //   { num: 120, text: 'Start' },
      //   { num: 140, text: 'Phrase #' },
      //   { num: 160, text: 'Section' },
      //   { num: 180, text: 'Section #' }
      // ];
      // lineNums.push(incHeight * -20);
    //   lineNums.push(lineNums[0] + artHeight * -20);
    //   lineNums.push(lineNums[1] + elabHeight * -20);
    //   lineNums.push(lineNums[2] + phraseTypeHeight * -20);
    //   lineNums.push(lineNums[3] - 20, lineNums[3] - 40, lineNums[3] - 60, lineNums[3] - 80)

      const aboveAxLines: { num: number, height: number, text: string }[] = [];
      aboveAxLines.push({ 
        num: incHeight * 20, 
        height: incHeight * 20, 
        text: 'Incidental' 
      });
      aboveAxLines.push({
        num: aboveAxLines[0].num + artHeight * 20,
        height: artHeight * 20,
        text: 'Articulation'
      })
      aboveAxLines.push({
        num: aboveAxLines[1].num + elabHeight * 20,
        height: elabHeight * 20,
        text: 'Elaboration'
      })
      aboveAxLines.push({
        num: aboveAxLines[2].num + phraseTypeHeight * 20,
        height: phraseTypeHeight * 20,
        text: 'Phrase Type'
      })
      aboveAxLines.push({
        num: aboveAxLines[3].num + 20,
        height: 20,
        text: 'Duration'
      })
      aboveAxLines.push({
        num: aboveAxLines[4].num + 20,
        height: 20,
        text: 'Start'
      })
      aboveAxLines.push({
        num: aboveAxLines[5].num + 20,
        height: 20,
        text: 'Phrase #'
      })
      aboveAxLines.push({
        num: aboveAxLines[6].num + 20,
        height: 20,
        text: 'Section'
      })
      aboveAxLines.push({
        num: aboveAxLines[7].num + 20,
        height: 20,
        text: 'Section #'
      })



      aboveAxLines.forEach((d, idx) => {
        const add = idx === 3 ? 1 : 0;
        this.addLine({
          x1: this.yAxisWidth - 70,
          x2: this.yAxisWidth + add,
          y1: this.xAxisHeight + this.topOfGraph - d.num,
          y2: this.xAxisHeight + this.topOfGraph - d.num,
          stroke: 'black',
          element: axisSVG
        })
        this.addText({
          x: this.yAxisWidth - 35,
          y: this.xAxisHeight + this.topOfGraph - d.num + d.height/2,
          text: d.text,
          element: axisSVG
        
        })
      })

      // vertical line top left
      this.addLine({
        x1: this.yAxisWidth - 70,
        x2: this.yAxisWidth - 70,
        y1: this.xAxisHeight + this.topOfGraph - (aboveAxLines[8].num + 60),
        y2: this.xAxisHeight + this.topOfGraph,
        stroke: 'black',
        element: axisSVG
      });
      this.addLine({
        x1: this.yAxisWidth,
        x2: this.yAxisWidth,
        y1: this.xAxisHeight,
        y2: this.xAxisHeight + this.topOfGraph,
        stroke: 'black',
        element: axisSVG
      });
      const wideLines = [
        { num: aboveAxLines[8].num + 30, text: this.piece.title },
        { num: aboveAxLines[8].num + 60, text: 'Pitch Range and Percentage of Duration on each \
          Fixed Pitch, Segmented by Phrase' }
      ];
      wideLines.forEach(wl => {
        this.addLine({
          x1: this.yAxisWidth - 70,
          x2: this.yAxisWidth - 70 + totalWidth,
          y1: this.xAxisHeight + this.topOfGraph - wl.num,
          y2: this.xAxisHeight + this.topOfGraph - wl.num,
          stroke: 'black',
          element: axisSVG,
          class_: 'wideLine'
        });
        this.addText({
          x: this.yAxisWidth - 70 + totalWidth / 2,
          y: this.xAxisHeight + this.topOfGraph - wl.num + 15,
          text: wl.text,
          element: axisSVG,
          fSize: '14px',
          fWeight: 'bold',
          class_: 'titleText'
        })
      })
      // top right vertical line
      this.addLine({
        x1: totalWidth - this.margin * 2 + 0.5,
        x2: totalWidth - this.margin * 2 + 0.5,
        y1: this.margin,
        y2: this.xAxisHeight,
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
          y: this.xAxisHeight + this.topOfGraph + y((lowY + highY) / 2 - 0.5), 
          text: i, 
          element: axisSVG 
        })
        const h_ = y(lowY) - y(highY);
        const y_ = y(highY - 0.5);
        const add = i === lkOct ? - 0.5 : 0;
        this.addRect({
          x: this.yAxisWidth - 70,
          y: this.xAxisHeight + this.topOfGraph + y_,
          w: 35,
          h: h_ + add,
          stroke: 'black',
          element: axisSVG
        });
        const lY_ = y(lowY - 0.5);
        this.addLine({ 
          x1: this.yAxisWidth - 35,
          y1: lY_ + this.xAxisHeight + add + this.topOfGraph,
          x2: this.yAxisWidth - add * 2,
          y2: lY_ + this.xAxisHeight + add + this.topOfGraph,
          stroke: 'black',
          element: axisSVG
        })
      };

      const widthPerSeg = 80;
      const width = widthPerSeg * durs.length;

      const gSVG = d3.select('.scrollingGraphHolder')
        .append('svg')
        .attr('width', width)
        .attr('height', this.graphHeight + this.topOfGraph - 1.5)
        .style('background-color', 'white')
        .attr('transform', `translate(-0.5, 0)`)
        .classed('gSVG', true);
      
      const phraseRects = [...Array(durs.length)];
      if (this.condensed) {
        durs.forEach(dur => {
          if (dur === undefined) {
            throw new Error('dur is undefined');
          }
          const keys = Object.keys(dur);
          keys.forEach(key => {
            const sn = this.piece.raga.pitchNumberToScaleNumber(Number(key));
            dur[sn] = dur[key];
            if (Number(key) !== Number(sn)) delete dur[key];
          })
        })
      }
      durs.forEach((dur, dIdx) => {
        let minVal: (number | undefined) = undefined; 
        let maxVal: (number | undefined) = undefined;
        let modeIdx: number | undefined = undefined; 
        let modeVal = 0;
        if (dur === undefined) {
          throw new Error('dur is undefined');
        }
        const keys = Object.keys(dur);
        if (keys.length > 0) {
          keys.forEach(key => {
            if (key !== 'sIdx') {
              if (minVal === undefined) {
                minVal = Number(key);
              }
              if (maxVal === undefined) {
                maxVal = Number(key);
              }
              if (Number(key) < minVal) {
                minVal = Number(key);
              }
              if (Number(key) > maxVal) {
                maxVal = Number(key);
              }
              if (Number(dur[key]) > modeVal) {
                modeVal = Number(dur[key]);
                modeIdx = Number(key);
              }
            }
          })
          if (maxVal === undefined) {
            throw new Error('maxVal is undefined');
          }
          if (minVal === undefined) {
            throw new Error('minVal is undefined');
          }
          maxVal = maxVal + 0.5;
          minVal = minVal - 0.5;  
          const x_ = dIdx * width / durs.length;
          const y_ = y(maxVal) + this.topOfGraph;
          const w_ = width / durs.length;
          const h_ = y(minVal) - y(maxVal);
          if ((!this.pitchChroma) && (!this.heatmap)) {
            phraseRects[dIdx] = this.addRect({
              x: x_,
              y: y_,
              w: w_,
              h: h_,
              fill: this.heatmap ? 'none' : '#D3D3D3',
              element: gSVG
            })
          }
          keys.forEach(key => {
            let fillColor = 'black';
            const mY_ = y(Number(key)+0.5) + this.topOfGraph;
            const mH_ = y(Number(key)-0.5) - y(Number(key)+0.5);
            if (this.heatmap) {
              fillColor = this.getHeatmapColor(dur[key]);
              this.addRect({ 
                x: x_, 
                y: mY_, 
                w: w_, 
                h: mH_, 
                fill: fillColor,
                element: gSVG
              });
              this.addText({ 
                x: x_ + width / (2 * durs.length), 
                y: y(Number(key)) + this.topOfGraph, 
                text: (100*dur[key]).toFixed(0)+'%',
                fill: dur[key] > 0.5 ? 'white' : 'black',
                element: gSVG
              })
            } else {
              if (Number(key) === modeIdx) {
                fillColor = 'white'
                this.addRect({ 
                  x: x_, 
                  y: mY_, 
                  w: w_, 
                  h: mH_, 
                  fill: 'grey',
                  element: gSVG 
                })
              } else if (this.pitchChroma) {
                this.addRect({ 
                  x: x_, 
                  y: mY_, 
                  w: w_, 
                  h: mH_, 
                  fill: '#D3D3D3',
                  element: gSVG
                })
              }
              this.addText({ 
                x: x_ + width / (2 * durs.length), 
                y: y(Number(key)) + this.topOfGraph, 
                text: (100*dur[key]).toFixed(0)+'%', 
                fill: fillColor,
                element: gSVG
              })
            }
          })
          if ((!this.pitchChroma) && (this.heatmap)) {
            phraseRects[dIdx] = this.addRect({
              x: x_,
              y: y_,
              w: w_,
              h: h_,
              fill: this.heatmap ? 'none' : '#D3D3D3',
              element: gSVG
            })
          }
        }
      })
      phraseRects.forEach(rect => {
        rect?.attr('stroke', 'black')
      });
      for (let i = lkOct; i <= hOct; i++) {
        let lowY = i * ppOct;
        let highY = (i+1) * ppOct;
        if (i === lkOct) {
          lowY = lowestKey - 0.5;
        }
        if (i === hOct) {
          highY = highestKey + 1.5;
        }
        const yPos = y((lowY + highY) / 2 - 0.5) + this.topOfGraph;
        this.addText({ x: -45, y: yPos, text: i, element: gSVG })
        const h_ = y(lowY) - y(highY);
        const y_ = y(highY - 0.5) + this.topOfGraph;
        this.addRect({ x: -60, y: y_, w: 30, h: h_, stroke: 'black', element: gSVG })
        const lY_ = y(lowY - 0.5) + this.topOfGraph;
        this.addLine({ x1: -30, y1: lY_, x2: width, y2: lY_, element: gSVG })
        if (i === hOct) {
          this.addLine({ x1: -30, y1: y_, x2: width, y2: y_, element: gSVG })
        }
        this.addLine({ x1: width, y1: lY_, x2: width, y2: y_, element: gSVG })
        const lineNums: number[] = [];
        lineNums.push(incHeight * -20);
        lineNums.push(lineNums[0] + artHeight * -20);
        lineNums.push(lineNums[1] + elabHeight * -20);
        lineNums.push(lineNums[2] + phraseTypeHeight * -20);
        lineNums.push(lineNums[3] - 20, lineNums[3] - 40, lineNums[3] - 60, lineNums[3] - 80)
        lineNums.forEach(n => {
          this.addLine({ 
            x1: -60, 
            y1: n + this.topOfGraph, 
            x2: width, 
            y2: n + this.topOfGraph, 
            element: gSVG 
          })
        })
        let currentSIdx = this.piece.sIdxFromPIdx(durIdxs[0]);
        let csidxTrig = true;
        durs.forEach((dur, dIdx) => {
          const pIdx = durIdxs[dIdx];
          const phrase = this.piece.phrases[pIdx];
          const pCat = phrase.categorizationGrid[0];
          const pStart = phrase.startTime!;
          const pDur = phrase.durTot!;
          const pTypes = (Object.keys(pCat.Phrase) as 
            (keyof typeof pCat.Phrase)[]
            ).filter(pt => {
              return pCat.Phrase[pt] === true;
            });
          const pElabs = (Object.keys(pCat.Elaboration) as
            (keyof typeof pCat.Elaboration)[]
            ).filter(elab => {
              return pCat.Elaboration[elab] === true;
            });
          const pArts = this.vocal ?
            (Object.keys(pCat['Vocal Articulation']) as
              (keyof typeof pCat['Vocal Articulation'])[]
              ).filter(art => {
                return pCat['Vocal Articulation'][art] === true;
              }) :
            (Object.keys(pCat['Instrumental Articulation']) as
              (keyof typeof pCat['Instrumental Articulation'])[]
              ).filter(art => {
                return pCat['Instrumental Articulation'][art] === true;
              });
          const pIncs = (Object.keys(pCat.Incidental) as
            (keyof typeof pCat.Incidental)[]
            ).filter(inc => {
              
              return pCat.Incidental[inc] === true;
            });
          const x_ = widthPerSeg * (dIdx + 0.5);
          pIncs.forEach((pInc, pIncIdx) => {
            const y_ = -20 * (incHeight - pIncIdx) + this.topOfGraph + 10;
            this.addText({ 
              x: x_, 
              y: y_, 
              text: pInc, 
              element: gSVG 
            })
          });
          pArts.forEach((pArt, pArtIdx) => {
            const sumH = incHeight + artHeight;
            const y_ = -20 * (sumH - pArtIdx) + this.topOfGraph + 10;
            this.addText({ 
              x: x_, 
              y: y_, 
              text: pArt, 
              element: gSVG 
            })
          });
          pElabs.forEach((pElab, pElabIdx) => {
            const sumH = incHeight + artHeight + elabHeight;
            const y_ = -20 * (sumH - pElabIdx) + this.topOfGraph + 10;
            this.addText({ 
              x: x_, 
              y: y_, 
              text: pElab, 
              element: gSVG 
            })
          });
          pTypes.forEach((pType, pTypeIdx) => {
            const sumH = incHeight + artHeight + elabHeight + phraseTypeHeight;
            const y_ = -20 * (sumH - pTypeIdx) + this.topOfGraph + 10;
            this.addText({ 
              x: x_, 
              y: y_, 
              text: pType, 
              element: gSVG 
            })
          });

          // add duration
          const summedH = incHeight + artHeight + elabHeight + phraseTypeHeight;
          const y_ = -20 * (summedH + 1) + this.topOfGraph + 10;
          this.addText({ 
            x: x_, 
            y: y_, 
            text: displayTime(pDur), 
            element: gSVG 
          })

          // add start time
          const st_y = -20 * (summedH + 2) + this.topOfGraph + 10;
          this.addText({ 
            x: x_, 
            y: st_y, 
            text: displayTime(pStart), 
            element: gSVG 
          })

          // add phrase #
          const pNum_y = -20 * (summedH + 3) + this.topOfGraph + 10;
          this.addText({ 
            x: x_, 
            y: pNum_y, 
            text: pIdx + 1, 
            element: gSVG 
          })
          
          const sIdx = this.piece.sIdxFromPIdx(pIdx);
          
          if (sIdx !== currentSIdx) {
            // draw vertical line at left
            currentSIdx = sIdx;
            
            // const s_y = -20 * (summedH + 3) + this.topOfGraph;
            const x_ = widthPerSeg * dIdx;
            this.addLine({ 
              x1: x_, 
              y1: this.topOfGraph - 20 * (summedH + 5), 
              x2: x_, 
              y2: this.topOfGraph + this.graphHeight,
              stroke: 'black', 
              element: gSVG 
            })
            const sIdxOfEachDurIdx = durIdxs.map(pIdx => {
              return this.piece.sIdxFromPIdx(pIdx);
            });
            const size = sIdxOfEachDurIdx.filter(sIdx_ => {
              return sIdx_ === sIdx;
            }).length;
            if (csidxTrig) {
              const prevDIdx = dIdx - 1;
              const prevPIdx = durIdxs[prevDIdx];
              const prevSIdx = this.piece.sIdxFromPIdx(prevPIdx);
              const prev_size = sIdxOfEachDurIdx.filter(sIdx_ => {
                return sIdx_ === prevSIdx;
              }).length;
              const prev_x = widthPerSeg * prev_size / 2;
              const prev_y = -20 * (summedH + 5) + this.topOfGraph + 10;
              this.addText({ 
                x: prev_x, 
                y: prev_y, 
                text: prevSIdx + 1, 
                element: gSVG 
              });
              //add section type
              const prevSecType = this.piece.sectionCategorization[prevSIdx]['Top Level'];
              this.addText({ 
                x: prev_x, 
                y: prev_y + 20, 
                text: prevSecType, 
                element: gSVG 
              });
              csidxTrig = false;
            }
            const sNum_y = -20 * (summedH + 5) + this.topOfGraph + 10;
            this.addText({ 
              x: x_ + widthPerSeg * size / 2, 
              y: sNum_y, 
              text: sIdx + 1, 
              element: gSVG 
            });
            // add section type
            const secType = this.piece.sectionCategorization[sIdx]['Top Level'];
            this.addText({ 
              x: x_ + widthPerSeg * size / 2, 
              y: sNum_y + 20, 
              text: secType, 
              element: gSVG 
            });

          }
          // grey vertical lines between each phrase
          if (dIdx !== durs.length - 1) {
            const x_ = widthPerSeg * (dIdx + 1);
            this.addLine({ 
              x1: x_, 
              y1: this.topOfGraph - 20 * (summedH + 3), 
              x2: x_, 
              y2: this.topOfGraph,
              stroke: 'grey', 
              element: gSVG 
            })
          }
        })

        // durs.forEach((dur, dIdx) => {
        //   const sIdx = durIdxs[dIdx];
        //   const sCats = this.piece!.sectionCategorization[sIdx];
        //   const secPhrases = this.piece!.sections[sIdx].phrases;
        //   if (secPhrases.length > 0) {  
        //     const st = secPhrases[0].startTime!;
        //     const lastPhrase = secPhrases[secPhrases.length - 1];
        //     const et = lastPhrase.startTime! + lastPhrase.durTot!;
        //     const x_ = widthPerSeg * (dIdx + 0.5);
        //     this.addText({ x: x_, y: -50 + this.topOfGraph, text: displayTime(st), element: gSVG });
        //     this.addText({ x: x_, y: -70 + this.topOfGraph, text: sIdx + 1, element: gSVG })
        //     this.addText({ x: x_, y: -30 + this.topOfGraph, text: displayTime(et - st), element: gSVG });
        //     this.addText({ x: x_, y: -10 + this.topOfGraph, text: sCats['Top Level'], element: gSVG })
        //     if (dIdx !== durs.length - 1) {
        //       const x_ = widthPerSeg * (dIdx + 1)
        //       this.addLine({ 
        //         x1: x_, 
        //         y1: this.topOfGraph,
        //         x2: x_,
        //         y2: 0,
        //         stroke: '#D3D3D3',
        //         element: gSVG
        //       })
        //     }
        //   }
        // })
      }
      
    },

    generateDurationGraph() {
      this.topOfGraph = 20;
      d3.select('.axisSVG').remove();
      d3.select('.gSVG').remove();
      let segments = segmentByDuration(this.piece, { duration: this.duration });
      const func = this.pitchRepresentation === 'Fixed Pitch' ?
        durationsOfFixedPitches :
        durationsOfPitchOnsets ;
      const durs = segments.map(seg => func(seg, {
        countType: 'proportional',
        outputType: this.pitchChroma ? 'chroma' : 'pitchNumber',
        maxSilence: this.fadeTime,
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

      this.graphHeight = this.height - this.xAxisHeight - this.topOfGraph - this.margin * 2;
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
          return this.piece.raga.scaleNumberToSargamLetter(sn);
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
        .attr('transform', `translate(${this.yAxisWidth}, ${this.xAxisHeight + this.topOfGraph})`);
      
      // horizontal line above sargam
      this.addLine({
        x1: this.yAxisWidth - 35,
        x2: this.yAxisWidth,
        y1: this.xAxisHeight + this.topOfGraph,
        y2: this.xAxisHeight + this.topOfGraph,
        stroke: 'black',
        element: axisSVG
      });

      const aboveAxLines = [
        { num: 20, text: 'start' }
      ];
      aboveAxLines.forEach((d, idx) => {
        const add = idx === 3 ? 1 : 0;
        this.addLine({
          x1: this.yAxisWidth - 70,
          x2: this.yAxisWidth + 1,
          y1: this.xAxisHeight + this.topOfGraph - d.num,
          y2: this.xAxisHeight + this.topOfGraph - d.num,
          stroke: 'black',
          element: axisSVG,
          class_: 'wideLine'
        });
        this.addText({
          x: this.yAxisWidth - 35,
          y: this.xAxisHeight + this.topOfGraph - d.num + 10,
          text: d.text,
          element: axisSVG,
          class_: 'titleText'
        })   
      });
      // vertical line top left
      this.addLine({
        x1: this.yAxisWidth - 70,
        x2: this.yAxisWidth - 70,
        y1: this.xAxisHeight + this.topOfGraph - (aboveAxLines[0].num + 60),
        y2: this.xAxisHeight + this.topOfGraph,
        stroke: 'black',
        element: axisSVG
      });
      this.addLine({
        x1: this.yAxisWidth,
        x2: this.yAxisWidth,
        y1: this.xAxisHeight,
        y2: this.xAxisHeight + this.topOfGraph,
        stroke: 'black',
        element: axisSVG
      });
      const wideLines = [
        { num: aboveAxLines[0].num + 30, text: this.piece.title },
        { 
          num: aboveAxLines[0].num + 60, 
          text: `Pitch Range and Percentage of Duration on each ` + 
              `Fixed Pitch, Segmented into ${this.duration}s Windows` }
      ];
      wideLines.forEach(wl => {
        this.addLine({
          x1: this.yAxisWidth - 70,
          x2: this.yAxisWidth - 70 + totalWidth,
          y1: this.xAxisHeight + this.topOfGraph - wl.num,
          y2: this.xAxisHeight + this.topOfGraph - wl.num,
          stroke: 'black',
          element: axisSVG,
          class_: 'wideLine'
        });
        this.addText({
          x: this.yAxisWidth - 70 + totalWidth / 2,
          y: this.xAxisHeight + this.topOfGraph - wl.num + 15,
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
        y2: this.xAxisHeight,
        stroke: 'black',
        element: axisSVG,
        class_: 'topRightVertical'
      });
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
          y: this.xAxisHeight + this.topOfGraph + y((lowY + highY) / 2 - 0.5), 
          text: i, 
          element: axisSVG 
        })
        const h_ = y(lowY) - y(highY);
        const y_ = y(highY - 0.5);
        const add = i === lkOct ? - 0.5 : 0;
        this.addRect({
          x: this.yAxisWidth - 70,
          y: this.xAxisHeight + this.topOfGraph + y_,
          w: 35,
          h: h_ + add,
          stroke: 'black',
          element: axisSVG
        });
        const lY_ = y(lowY - 0.5);
        this.addLine({ 
          x1: this.yAxisWidth - 35,
          y1: lY_ + this.xAxisHeight + add + this.topOfGraph,
          x2: this.yAxisWidth - add * 2,
          y2: lY_ + this.xAxisHeight + add + this.topOfGraph,
          stroke: 'black',
          element: axisSVG
        })
      };
      const widthPerSeg = 80;
      const width = widthPerSeg * durs.length;
      const gSVG = d3.select('.scrollingGraphHolder')
        .append('svg')
        .attr('width', width)
        .attr('height', this.graphHeight + this.topOfGraph - 1.5)
        .style('background-color', 'white')
        .attr('transform', `translate(-0.5, 0)`)
        .classed('gSVG', true);
      
      const rects = [...Array(durs.length)];
      if (this.condensed) {
        durs.forEach(dur => {
          if (dur === undefined) {
            throw new Error('dur is undefined');
          }
          const keys = Object.keys(dur);
          keys.forEach(key => {
            const sn = this.piece.raga.pitchNumberToScaleNumber(Number(key));
            dur[sn] = dur[key];
            if (Number(key) !== Number(sn)) delete dur[key];
          })
        })
      };
      durs.forEach((dur, dIdx) => {
        let minVal: (number | undefined) = undefined; 
        let maxVal: (number | undefined) = undefined;
        let modeIdx: number | undefined = undefined; 
        let modeVal = 0;
        if (dur === undefined) {
          throw new Error('dur is undefined');
        }
        const keys = Object.keys(dur);
        if (keys.length > 0) {
          keys.forEach(key => {
            if (key !== 'sIdx') {
              if (minVal === undefined) {
                minVal = Number(key);
              }
              if (maxVal === undefined) {
                maxVal = Number(key);
              }
              if (Number(key) < minVal) {
                minVal = Number(key);
              }
              if (Number(key) > maxVal) {
                maxVal = Number(key);
              }
              if (Number(dur[key]) > modeVal) {
                modeVal = Number(dur[key]);
                modeIdx = Number(key);
              }
            }
          })
          if (maxVal === undefined) {
            throw new Error('maxVal is undefined');
          }
          if (minVal === undefined) {
            throw new Error('minVal is undefined');
          }
          maxVal = maxVal + 0.5;
          minVal = minVal - 0.5;  
          const x_ = dIdx * width / durs.length;
          const y_ = y(maxVal) + this.topOfGraph;
          const w_ = width / durs.length;
          const h_ = y(minVal) - y(maxVal);
          if ((!this.pitchChroma) && (!this.heatmap)) {
            rects[dIdx] = this.addRect({
              x: x_,
              y: y_,
              w: w_,
              h: h_,
              fill: this.heatmap ? 'none' : '#D3D3D3',
              element: gSVG
            })
          }

          keys.forEach(key => {
            let fillColor = 'black';
            const mY_ = y(Number(key)+0.5) + this.topOfGraph;
            const mH_ = y(Number(key)-0.5) - y(Number(key)+0.5);
            if (this.heatmap) {
              fillColor = this.getHeatmapColor(dur[key]);
              this.addRect({ 
                x: x_, 
                y: mY_, 
                w: w_, 
                h: mH_, 
                fill: fillColor,
                element: gSVG
              });
              this.addText({ 
                x: x_ + width / (2 * durs.length), 
                y: y(Number(key)) + this.topOfGraph, 
                text: (100*dur[key]).toFixed(0)+'%',
                fill: dur[key] > 0.5 ? 'white' : 'black',
                element: gSVG
              })
            } else {
              if (Number(key) === modeIdx) {
                fillColor = 'white'
                this.addRect({ 
                  x: x_, 
                  y: mY_, 
                  w: w_, 
                  h: mH_, 
                  fill: 'grey',
                  element: gSVG 
                })
              } else if (this.pitchChroma) {
                this.addRect({ 
                  x: x_, 
                  y: mY_, 
                  w: w_, 
                  h: mH_, 
                  fill: '#D3D3D3',
                  element: gSVG
                })
              }
              this.addText({ 
                x: x_ + width / (2 * durs.length), 
                y: y(Number(key)) + this.topOfGraph, 
                text: (100*dur[key]).toFixed(0)+'%', 
                fill: fillColor,
                element: gSVG
              })
            }
          })
          if ((!this.pitchChroma) && (this.heatmap)) {
            rects[dIdx] = this.addRect({
              x: x_,
              y: y_,
              w: w_,
              h: h_,
              fill: this.heatmap ? 'none' : '#D3D3D3',
              element: gSVG
            })
          }
        }
      })
      rects.forEach(rect => {
        rect?.attr('stroke', 'black')
      });
      for (let i = lkOct; i<= hOct; i++) {
        let lowY = i * ppOct;
        let highY = (i+1) * ppOct;
        if (i === lkOct) {
          lowY = lowestKey - 0.5;
        }
        if (i === hOct) {
          highY = highestKey + 1.5;
        }
        const yPos = y((lowY + highY) / 2 - 0.5) + this.topOfGraph;
        this.addText({ x: -45, y: yPos, text: i, element: gSVG })
        const h_ = y(lowY) - y(highY);
        const y_ = y(highY - 0.5) + this.topOfGraph;
        this.addRect({ x: -60, y: y_, w: 30, h: h_, stroke: 'black', element: gSVG })
        const lY_ = y(lowY - 0.5) + this.topOfGraph;
        this.addLine({ x1: -30, y1: lY_, x2: width, y2: lY_, element: gSVG })
        if (i === hOct) {
          this.addLine({ x1: -30, y1: y_, x2: width, y2: y_, element: gSVG })
        }
        this.addLine({ x1: width, y1: lY_, x2: width, y2: y_, element: gSVG })
        durs.forEach((dur, dIdx) => {
          const startTime = dIdx * this.duration;
          this.addText({ x: (dIdx + 0.5) * widthPerSeg , y: -10 + this.topOfGraph, text: displayTime(startTime), element: gSVG })
          if (dIdx !== durs.length - 1) {
            const x_ = (dIdx + 1) * widthPerSeg;
            this.addLine({ x1: x_, y1: this.topOfGraph, x2: x_, y2: 0, stroke: '#D3D3D3', element: gSVG })
          }
        })
      }
    },

    getHeatmapColor(val: number) {
      const gradientArray = new Gradient()
        .setColorGradient('#ffffff', '#000000')
        .setMidpoint(100)
        .getColors();
      val = Math.floor(100 * val);
      if (val === 100) val = 99;
      return gradientArray[val]
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
      element?: d3.Selection<SVGSVGElement, unknown, HTMLElement | null, any>,
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
      element?: d3.Selection<SVGSVGElement, unknown, HTMLElement | null, any>
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
      element?: d3.Selection<SVGSVGElement, unknown, HTMLElement | null, any>,
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
  background-color: white;
  position: absolute;
  left: v-bind(margin + 'px');
  top: v-bind(margin + 'px');
}
.scrollingGraphHolder {
  width: calc(90vw - (var(--margin) * 2 + var(--yAxisWidth)) + 0.5px );
  height: v-bind(graphHeight + topOfGraph + 0.5 + 'px');
  background-color: #FAF9F6;
  position: absolute;
  left: v-bind(yAxisWidth + margin + 0.5 + 'px');
  top: v-bind(xAxisHeight + margin - 1 + 'px');
  overflow-x: scroll;
  overflow-y: hidden;
  border-top: 1px solid black;
  border-bottom: 1px solid black;
  border-right: 1px solid black;
  box-sizing: border-box;

}


</style>