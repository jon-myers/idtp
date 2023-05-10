<template>
  <div class='main'>
    <div class='analysisControls'>
      <div class='analysisTypeRow'>
        <div 
          :class='`analysisType ${atIdx === selectedATIdx ? "selected" : ""}`' 
          v-for='(at, atIdx) in analysisTypes'
          :key='at'
          @click='handleClickAnalysisType(atIdx)'
          >
          {{ at }}
        </div>
      </div>
      <div class='controls' v-if='selectedATIdx === 0'>
        <div class='controlBox'>
          <div v-for='prType in pitchRepresentationTypes' :key='prType'>
            <input 
              type='radio' 
              :id='prType' 
              :value='prType' 
              v-model='pitchRepresentation'
              >
              <label :for='prType'>{{ prType }}</label>
          </div>
          <div v-if='pitchRepresentation === "Pitch Onsets"'>
            <label for='fadeTime'>Fade Time (s)</label>
            <input type='number' id='fadeTime' v-model.number='fadeTime'>
          </div>
        </div>
        <div class='controlBox'>
          <div v-for='ppType in pitchPrevalenceTypes' :key='pptype'>
            <input 
              type='radio' 
              :id='ppType' 
              :value='ppType' 
              v-model='segmentationType'
              >
            <label :for='ppType'>{{ ppType }}</label>
          </div>
          <div v-if='segmentationType === "Duration"'>
            <input type='number' id='duration' v-model.number='duration'>
            <label for='duration'>(s)</label>
          </div>
        </div>
        <div class='controlBox'>
          <div>
            <input type='checkbox' v-model='pitchChroma'/>
            <label>Pitch Chroma</label>
          </div>
          <div>
            <input type='checkbox' v-model='condensed'/>
            <label>Condensed</label>
          </div>
          <div>
            <input type='checkbox' v-model='heatmap'/>
            <label>Heatmap</label>
          </div>
        </div>
        <div class='controlBox button'>
          <button class='generate' @click='createGraph'>
            Generate Visualization
          </button>
        </div>       
      </div>
      <div class='controls' v-if='selectedATIdx === 1'>
        <div class='controlBox'>
          <div v-for='ppType in patternCountTypes' :key='pptype'>
            <input 
              type='radio' 
              :id='ppType' 
              :value='ppType' 
              v-model='segmentationType'
              >
            <label :for='ppType'>{{ ppType }}</label>
          </div>
          <div v-if='segmentationType === "Duration"'>
            <input type='number' id='duration' v-model.number='duration'>
            <label for='duration'>(s)</label>
          </div>
        </div>
        <div class='controlBox'>
          <div v-for='pType in pitchTypes' :key='prType'>
            <input 
              type='radio' 
              :id='pType' 
              :value='pType' 
              v-model='pitchType'
              >
              <label :for='pType'>{{ pType }}</label>
          </div>
          <div>
            <input type='checkbox' v-model='pitchChroma' @change='updateChroma'/>
            <label>Chroma</label>
          </div>
        </div>
        <div class='controlBox'>
          <div class='rightInputRow'>
            <label for='targetPitch'>Target</label>
            <input type='checkbox' v-model='targetPitchBool'>
            <select v-model='targetPitchIdx' id='targetPitch' v-if='targetPitchBool'>
              <option 
                v-for='(tpc, idx) in targetPitchChoices' 
                :key='tpc' 
                :value='idx'
                >
                {{ tpc }}
              </option>
            </select>
            <div id='targetPitch' v-else></div>
          </div>
          <div class='rightInputRow'>
            <label>Fade Time (s)</label>
            <input type='number' v-model.number='fadeTime' id='fadeTime'>
          </div>
        </div>
        <div class='controlBox'>
          <label class='patternSizeLabel'>Pattern Size</label>
          <div class='patternSizeMatrix'>
            <div 
              class='patternSizeColumn'
              v-for='(_, pcIdx) in 3'
              :key='pcIdx'
              >
              <div class='patternSizeRow' v-for='(_, prIdx) in 3' :key='prIdx'>
                <input type='checkbox' 
                  :id='`cb_${pcIdx * 3 + prIdx}`' 
                  :value='patternSizes[pcIdx * 3 + prIdx]'
                  v-model='selectedPatternSizes[pcIdx * 3 + prIdx]'
                  >
                <label>
                  {{ 2 + pcIdx * 3 + prIdx }}
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class='controlBox'>
          <div>
            <input type='checkbox' v-model='minPatternSize' id='minPatternSize'>
            <label for='#minPatternSize'>Minimum Size</label>
          </div>
          <div v-if='minPatternSize'>
            <input 
              class='minPatternSizeInput'
              type='number' 
              step='1' 
              v-model.number='minPatternSizeValue'
              onkeypress="return /[0-9]/i.test(event.key)">
          </div>
          <div>
            <input type='checkbox' v-model='plot' id='plot'>
            <label for='#plot'>Plot</label>
          </div>
        </div>
        <div class='controlBox button'>
          <button class='generate' @click='createGraph'>
            Generate Visualization
          </button>
        </div>   
      </div>

    </div>
    <div class='graphContainer'>
      <div class='graph' ref='graph'></div>
    </div>
  </div>
</template>

<script>
  const linSpace = (startValue, stopValue, cardinality) => {
    var arr = [];
    var step = (stopValue - startValue) / (cardinality - 1);
    for (var i = 0; i < cardinality; i++) {
      arr.push(startValue + (step * i));
    }
    return arr;
  };

  import { 
    instantiatePiece, 
    segmentByDuration, 
    durationsOfPitchOnsets,
    patternCounter,
    chromaSeqToCondensedPitchNums
  } from '@/js/analysis.mjs';
  import { 
    durationsOfFixedPitches, 
    Pitch, 
    pitchNumberToChroma,
    Trajectory
  } from '@/js/classes.ts';
  import { pieceExists } from '@/js/serverCalls.mjs';
  import Gradient from 'javascript-color-gradient';
  import * as d3 from 'd3';

  const displayTime = dur => {
    const hours = Math.floor(dur / 3600);
    let minutes = Math.floor((dur - hours * 3600) / 60);
    let seconds = Math.round(dur % 60);
    if (seconds.toString().length === 1) seconds = '0' + seconds;
    if (hours !== 0) {
      if (minutes.toString().length === 1) minutes = '0' + minutes;
      return ([hours, minutes, seconds]).join(':')
    } else {
      return minutes + ':' + seconds 
    }
  }

  function shouldTextBeBlack (backgroundcolor) {
    return computeLuminence(backgroundcolor) > 0.179;
  }

  function computeLuminence(backgroundcolor) {
      var colors = hexToRgb(backgroundcolor);
      
      var components = ['r', 'g', 'b'];
      for (var i in components) {
          var c = components[i];
          
          colors[c] = colors[c] / 255.0;

          if (colors[c] <= 0.03928) { 
              colors[c] = colors[c]/12.92;
          } else { 
              colors[c] = Math.pow (((colors[c] + 0.055) / 1.055), 2.4);
          }
      }
      
      var luminence = 0.2126 * colors.r + 0.7152 * colors.g + 0.0722 * colors.b;

      return luminence;
  }

  function hexToRgb(hex) {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
      } : null;
  }

  export default {
    data() {
      return {
        piece: undefined,
        analysisTypes: ['Pitch Prevalence', 'Pitch Patterns'],
        selectedATIdx: 0,
        pitchPrevalenceTypes: ['Section', 'Phrase', 'Duration'],
        patternCountTypes: ['Transcription', 'Section', 'Duration'],
        pitchRepresentationTypes: ['Fixed Pitch', 'Pitch Onsets'],
        segmentationType: 'Section',
        pitchRepresentation: 'Fixed Pitch',
        duration: 30,
        pitchChroma: false,
        condensed: false,
        heatmap: false,
        fadeTime: 5,
        controlsHeight: 150,
        typeRowHeight: 30,
        graphHeight: 1000,
        targetPitchChoices: [0],
        targetPitchIdx: 0,
        pitchTypes: ['Pitch Number', 'Sargam'],
        pitchType: 'Pitch Number',
        patternSizes: [2, 3, 4, 5, 6, 7, 8, 9, 10],
        selectedPatternSizes: [
          true, // 2
          true, // 3
          true, // 4
          true, // 5
          true, // 6
          false, // 7
          false, // 8
          false, // 9
          false, // 10
        ],
        controlBoxWidth: 150,
        minPatternSize: false,
        minPatternSizeValue: 1,
        targetPitchBool: true,
        plot: false
      }
    },

    watch: {
      pitchType(newVal) {
        const raga = this.piece.raga;
        if (newVal === 'Pitch Number') {
          if (this.pitchChroma) {
            this.targetPitchChoices = raga.getPitchNumbers(0, 11).reverse();
            this.targetPitchIdx = this.targetPitchChoices.indexOf(0);
          } else {
            const low = this.piece.lowestPitchNumber;
            const high = this.piece.highestPitchNumber;
            this.targetPitchChoices = raga.getPitchNumbers(low, high).reverse();
            this.targetPitchIdx = this.targetPitchChoices.indexOf(0);
          }
          
        } else if (newVal === 'Sargam') {
          if (this.pitchChroma) {
            const pitchChoices = raga.getPitchNumbers(0, 11).reverse();
            this.targetPitchChoices = pitchChoices.map(pn => {
              const pitch = Pitch.fromPitchNumber(pn);
              return pitch.octavedSargamLetter
            });
            this.targetPitchIdx = this.targetPitchChoices.indexOf('S');
          } else {
            const low = this.piece.lowestPitchNumber;
            const high = this.piece.highestPitchNumber;
            const pnChoices = raga.getPitchNumbers(low, high).reverse();
            this.targetPitchChoices = pnChoices.map(pn => {
              const pitch = Pitch.fromPitchNumber(pn);
              return pitch.octavedSargamLetter
            });
            this.targetPitchIdx = this.targetPitchChoices.indexOf('S');
          }         
        }
      }
    },

    methods: {

      updateChroma() {
        const raga = this.piece.raga;
        if (this.pitchType === 'Pitch Number') {
          if (this.pitchChroma) {
            this.targetPitchChoices = raga.getPitchNumbers(0, 11).reverse();
            this.targetPitchIdx = this.targetPitchChoices.indexOf(0);
          } else {
            const low = this.piece.lowestPitchNumber;
            const high = this.piece.highestPitchNumber;
            this.targetPitchChoices = raga.getPitchNumbers(low, high).reverse();
            this.targetPitchIdx = this.targetPitchChoices.indexOf(0);
          }
        } else if (this.pitchType === 'Sargam') {
          if (this.pitchChroma) {
            const pitchChoices = raga.getPitchNumbers(0, 11).reverse();
            this.targetPitchChoices = pitchChoices.map(pn => {
              const pitch = Pitch.fromPitchNumber(pn);
              return pitch.octavedSargamLetter
            });
            this.targetPitchIdx = this.targetPitchChoices.indexOf('S');
          } else {
            const low = this.piece.lowestPitchNumber;
            const high = this.piece.highestPitchNumber;
            const pnChoices = raga.getPitchNumbers(low, high).reverse();
            this.targetPitchChoices = pnChoices.map(pn => {
              const pitch = Pitch.fromPitchNumber(pn);
              return pitch.octavedSargamLetter
            });
            this.targetPitchIdx = this.targetPitchChoices.indexOf('S');
          }  
        }
      },

      handleClickAnalysisType(atIdx) {
        this.selectedATIdx = atIdx;
        if (this.svg) {
          this.topSvg.selectAll('*').remove();
          this.topSvg.remove();
          this.topSvg = undefined;
          this.svg = undefined;
        }
        this.createGraph();

      },

      addRect({
        svg = this.svg, 
        x = undefined, 
        y = undefined, 
        w = undefined, 
        h = undefined, 
        fill = 'none',
        stroke = 'none',
      } = {}) {
        return svg.append('rect')
          .attr('x', x)
          .attr('y', y)
          .attr('width', w)
          .attr('height', h)
          .attr('fill', fill)
          .attr('stroke', stroke)
      },

      addLine({
        svg = this.svg,
        x1 = undefined,
        y1 = undefined,
        x2 = undefined,
        y2 = undefined,
        stroke = 'black',
      } = {}) {
        return svg.append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', stroke)
      },

      addText({
        svg = this.svg,
        x = undefined,
        y = undefined,
        text = '',
        fSize = '12px',
        fWeight = 'normal',
        fill = 'black',
        anchor = 'middle'
      } = {}) {
        return svg.append('text')
          .attr('x', x)
          .attr('y', y)
          .attr('font-size', fSize)
          .attr('font-weight', fWeight)
          .attr('fill', fill)
          .attr('text-anchor', anchor)
          .attr('alignment-baseline', 'middle')
          .text(text)
      },

      getHeatmapColor(val) {
        const gradientArray = new Gradient()
          .setColorGradient('#ffffff', '#000000')
          .setMidpoint(100)
          .getColors();
        val = Math.floor(100 * val);
        if (val === 100) val = 99;
        return gradientArray[val]
      },

      createPitchFrequencyGraph({
        segmentation = 'Duration', // or 'Phrase' or 'Section'
        duration = 30, // in seconds, only if segmentation is 'Duration'
        displayType = 'simple', // or 'gradient'
        pitchChroma = false,
        condensed = false,
        heatmap = false,
        pitchRepresentation = 'Fixed Pitch',
      } = {}) {
        let segments;
        if (segmentation === 'Duration') {
          segments = segmentByDuration(this.piece, { duration: duration });
        } else if (segmentation === 'Phrase') {
          segments = this.piece.phrases.map(p => p.trajectories);
        } else if (segmentation === 'Section') {
          segments = this.piece.sections.map(s => s.trajectories);
        }
        const func = pitchRepresentation === 'Fixed Pitch' ? 
          durationsOfFixedPitches : 
          durationsOfPitchOnsets;
        const durs = segments.map(seg => func(seg, {
          countType: 'proportional',
          outputType: pitchChroma ? 'chroma' : 'pitchNumber',
          maxSilence: this.fadeTime,

        }));
        let lowestKey, highestKey;
        durs.forEach(dur => {
          const keys = Object.keys(dur);
          keys.forEach(key => {
            if (lowestKey === undefined) lowestKey = Number(key);
            if (highestKey === undefined) highestKey = Number(key);
            if (Number(key) < lowestKey) {
              lowestKey = Number(key);
            }
            if (Number(key) > highestKey) {
              highestKey = Number(key);
            }
          })
        })
        if (condensed) {
          lowestKey = this.piece.raga.pitchNumberToScaleNumber(lowestKey);
          highestKey = this.piece.raga.pitchNumberToScaleNumber(highestKey);
        }
        let totalWidth = 900;
        let totalHeight = 600;
        const pnLen = this.piece.raga.getPitchNumbers(0, 11).length;
        const ppOct = condensed ? pnLen : 12; 
        const lkOct = Math.floor(lowestKey / ppOct);
        const hOct = Math.floor(highestKey / ppOct);
        const mTop = segmentation === 'Duration' ? 90 : 110;
        const margin = { top: mTop, right: 30, bottom: 20, left: 80 };
        let width = totalWidth - margin.left - margin.right;
        const height = totalHeight - margin.top - margin.bottom;
        let widthPerSeg = width / durs.length;
        const minWidthPerSeg = 35;
        if (widthPerSeg < minWidthPerSeg) {
          widthPerSeg = minWidthPerSeg;
          width = widthPerSeg * durs.length;
          totalWidth = width + margin.left + margin.right;
        }
        this.topSvg = d3.select(this.$refs.graph)
          .append('svg')
          .attr('width', totalWidth)
          .attr('height', totalHeight)
          .style('background-color', 'white')
        this.svg = this.topSvg
          .append('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);
        let y = d3.scaleLinear()
          .domain([lowestKey-1, highestKey+1])
          .range([height, 0]);

        const axisNode = this.svg.append('g')
        const pitchNumbers = condensed ? 
          [...Array(1 + highestKey - lowestKey)].map((_, i) => i + lowestKey) : 
          this.piece.raga.getPitchNumbers(lowestKey, highestKey) ;
        const tickLabels =  condensed ? 
          pitchNumbers.map(sn => {
            return this.piece.raga.scaleNumberToSargamLetter(sn);
          }) : 
          pitchNumbers.map(pn => {
          return this.piece.raga.pitchNumberToSargamLetter(pn)
        }) 
        axisNode
          .call(d3.axisLeft(y)
            .tickValues(pitchNumbers)
            .tickFormat((_, i) => tickLabels[i])
            .tickSize(0)
            .tickPadding(10))
          .style('color', 'black')
          .style('font-weight', 'normal')
        const sectionRects = [...Array(durs.length)]

        if (condensed) {
          // transform durs
          durs.forEach((dur, dIdx) => {
            const keys = Object.keys(dur);
            keys.forEach(key => {
              const sn = this.piece.raga.pitchNumberToScaleNumber(Number(key));
              dur[sn] = dur[key];
              if (Number(key) !== Number(sn)) delete dur[key];
            })
          })
        }

        durs.forEach((dur, dIdx) => {
          let minVal, maxVal, modeIdx=undefined, modeVal=0;
          const keys = Object.keys(dur);
          if (keys.length > 0) {
            keys.forEach(key => {
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
                modeIdx = key;
              }
            })
            maxVal += 0.5;
            minVal -= 0.5;  
            const x_ = dIdx * width / durs.length;
            const y_ = y(maxVal);
            const w_ = width / durs.length;
            const h_ = y(minVal) - y(maxVal);
            if ((!pitchChroma) && (!heatmap)) {
              sectionRects[dIdx] = this.addRect({
                x: x_,
                y: y_,
                w: w_,
                h: h_,
                fill: heatmap ? 'none' : '#D3D3D3',
              })
            }

            
            keys.forEach((key, kIdx) => {
              let fillColor = 'black';
              const mY_ = y(Number(key)+0.5);
              const mH_ = y(Number(key)-0.5) - y(Number(key)+0.5);
              if (heatmap) {
                fillColor = this.getHeatmapColor(dur[key]);
                this.addRect({ x: x_, y: mY_, w: w_, h: mH_, fill: fillColor });
                this.addText({ 
                  x: x_ + width / (2 * durs.length), 
                  y: y(Number(key)), 
                  text: (100*dur[key]).toFixed(0)+'%',
                  fill: dur[key] > 0.5 ? 'white' : 'black' 
                })
              } else {
                if (key === modeIdx) {
                  fillColor = 'white'
                  this.addRect({ x: x_, y: mY_, w: w_, h: mH_, fill: 'grey' })
                } else if (this.pitchChroma) {
                  this.addRect({ x: x_, y: mY_, w: w_, h: mH_, fill: '#D3D3D3'})
                }
                this.addText({ 
                  x: x_ + width / (2 * durs.length), 
                  y: y(Number(key)), 
                  text: (100*dur[key]).toFixed(0)+'%', 
                  fill: fillColor 
                })
              }
            })
            if ((!pitchChroma) && (heatmap)) {
              sectionRects[dIdx] = this.addRect({
                x: x_,
                y: y_,
                w: w_,
                h: h_,
                fill: heatmap ? 'none' : '#D3D3D3',
              })
            }
          }
        })
        sectionRects.forEach(rect => {
          rect?.attr('stroke', 'black')
        })
        
        const texts = [
          'Very Low Octave', 
          'Low Octave (Manjha)', 
          'Middle Octave (Sthai)', 
          'High Octave (Antara)', 
          'Very High Octave'
        ];
        for (let i = lkOct; i <= hOct; i++) {
          let lowY = i * ppOct;
          let highY = (i+1) * ppOct;
          if (i === lkOct) {
            lowY = lowestKey - 0.5;
          }
          if (i === hOct) {
            highY = highestKey+ 1.5;
          }
          this.addText({ x: '-45', y: y((lowY + highY) / 2 - 0.5), text: i })
          const h_ = y(lowY) - y(highY);
          const y_ = y(highY - 0.5);
          this.addRect({ x: '-60', y: y_, w: '30', h: h_, stroke: 'black' })
          const lY_ = y(lowY - 0.5);
          this.addLine({ x1: '-30', y1: lY_, x2: width, y2: lY_ })
          if (i === hOct) this.addLine({ x1: '-30', y1: y_, x2: width, y2: y_ })
          this.addLine({ x1: width, y1: lY_, x2: width, y2: y_ })
          if (segmentation === 'Duration') {
            this.addLine({ x1: '-30', y1: '-20', x2: width, y2: '-20' })
            this.addLine({ x1: '-30', y1: '-40', x2: width, y2: '-40' })
            this.addText({ x: -15, y: -10, text: 'End' })
            this.addText({ x: -15, y: -30, text: 'Start' })
            this.addLine({ x1: '-30', y1: '0', x2: '-30', y2: '-70' })
            this.addLine({ x1: 0, y1: 0, x2: 0, y2: '-40' })
            this.addLine({ x1: -30, y1: -70, x2: width, y2: -70 })
            this.addLine({ x1: width, y1: -70, x2: width, y2: 0 })
            const text = `Pitch Range and Percentage of Duration on each ` + 
              `Fixed Pitch, Segmented into ${duration}s Windows`;
            const x_ = (width - 30) / 2;
            this.addText({ 
              x: x_, 
              y: -55, 
              text: text, 
              fSize: '14px', 
              fWeight: 'bold' 
            });
            this.addLine({ x1: -60, y1: 0, x2: -60, y2: -40 })
            this.addLine({ x1: -60, y1: -40, x2: -30, y2: -40})
            this.addText({ x: -45, y: -20, text: 'Oct.' })
            durs.forEach((dur, dIdx) => {
              const tX_ = widthPerSeg * (dIdx + 0.5);
              const txt1 = displayTime(dIdx * duration);
              this.addText({ x: tX_, y: -30, text: txt1 });
              const txt2 = displayTime((dIdx + 1) * duration);
              this.addText({ x: tX_, y: -10, text: txt2 });
              if (dIdx !== durs.length - 1) {
                const x_ = widthPerSeg * (dIdx + 1)
                this.addLine({ 
                  x1: x_, 
                  y1: 0, 
                  x2: x_, 
                  y2: -40, 
                  stroke: '#D3D3D3' 
                })
              }
            })
          } else if (segmentation === 'Section') {
            this.addLine({ x1: '-30', y1: '-20', x2: width, y2: '-20' })
            this.addLine({ x1: -60, y1: -40, x2: width, y2: -40 })
            this.addLine({ x1: -60, y1: -60, x2: width, y2: -60 })
            this.addLine({ x1: -60, y1: 0, x2: -60, y2: -90 })
            this.addLine({ x1: -30, y1: 0, x2: -30, y2: -40 })
            this.addLine({ x1: 0, y1: 0, x2: 0, y2: -60 })
            this.addLine({ x1: width, y1: 0, x2: width, y2: -90 })
            this.addLine({ x1: -60, y1: -90, x2: width, y2: -90 })
            
            this.addText({ 
              x: width / 2, 
              y: -75, 
              text: 'Pitch Range and Percentage of Duration on each Fixed ' + 
                'Pitch, Segmented by Section', 
              fSize: '14px', 
              fWeight: 'bold' 
            });
            this.addText({ x: -15, y: -10, text: 'End' })
            this.addText({ x: -15, y: -30, text: 'Start' })
            this.addText({ x: -30, y: -50, text: 'Section' })
            this.addText({ x: -45, y: -20, text: 'Oct.' })
            durs.forEach((dur, dIdx) => {
              const secPhrases = this.piece.sections[dIdx].phrases;
              const st = secPhrases[0].startTime;
              const lastPhrase = secPhrases[secPhrases.length - 1];
              const et = lastPhrase.startTime + lastPhrase.durTot;
              const x_ = widthPerSeg * (dIdx + 0.5);
              this.addText({ x: x_, y: -30, text: displayTime(st) });
              this.addText({ x: x_, y: -10, text: displayTime(et) });
              this.addText({ x: x_, y: -50, text: dIdx + 1 })
              if (dIdx !== durs.length - 1) {
                const x_ = widthPerSeg * (dIdx + 1)
                this.addLine({ 
                  x1: x_, 
                  y1: 0, 
                  x2: x_, 
                  y2: -60, 
                  stroke: '#D3D3D3' 
                })
              }           
            })
          } else if (segmentation === 'Phrase') {
            this.addLine({ x1: '-30', y1: '-20', x2: width, y2: '-20' })
            this.addLine({ x1: -60, y1: -40, x2: width, y2: -40 })
            this.addLine({ x1: -60, y1: -60, x2: width, y2: -60 })
            this.addLine({ x1: -60, y1: 0, x2: -60, y2: -90 })
            this.addLine({ x1: -30, y1: 0, x2: -30, y2: -40 })
            this.addLine({ x1: 0, y1: 0, x2: 0, y2: -60 })
            this.addLine({ x1: width, y1: 0, x2: width, y2: -90 })
            this.addLine({ x1: -60, y1: -90, x2: width, y2: -90 })
            // text labels
            this.addText({ 
              x: width / 2, 
              y: -75, 
              text: 'Pitch Range and Percentage of Duration on each Fixed ' + 
                'Pitch, Segmented by Phrase', 
              fSize: '14px', 
              fWeight: 'bold' 
            });
            this.addText({ x: -15, y: -10, text: 'End' })
            this.addText({ x: -15, y: -30, text: 'Start' })
            this.addText({ x: -30, y: -50, text: 'Phrase' })
            this.addText({ x: -45, y: -20, text: 'Oct.' })
            durs.forEach((dur, dIdx) => {
              const phrase = this.piece.phrases[dIdx];
              const st = phrase.startTime;
              const et = st + phrase.durTot;
              const x_ = widthPerSeg * (dIdx + 0.5);
              this.addText({ x: x_, y: -30, text: displayTime(st) });
              this.addText({ x: x_, y: -10, text: displayTime(et) });
              this.addText({ x: x_, y: -50, text: dIdx + 1 })
              if (dIdx !== durs.length - 1) {
                const lX_ = widthPerSeg * (dIdx + 1);
                this.addLine({ 
                  x1: lX_, 
                  y1: 0, 
                  x2: lX_, 
                  y2: -60, 
                  stroke: '#D3D3D3' 
                })
              }
            })

          }
        }
      },

      createGraph() {

        if (this.svg) {
          this.topSvg.selectAll('*').remove();
          this.topSvg.remove();
          this.topSvg = undefined;
          this.svg = undefined;
        }
        if (this.selectedATIdx === 0) {
          this.createPitchFrequencyGraph({ 
            segmentation: this.segmentationType,
            duration: this.duration,
            pitchChroma: this.pitchChroma,
            condensed: this.condensed,
            heatmap: this.heatmap,
            pitchRepresentation: this.pitchRepresentation,
          })
        } else if (this.selectedATIdx === 1) {
          const sargam = this.pitchType === 'Sargam';
          let tpChoices;
          if (sargam) {
            const low = this.piece.lowestPitchNumber;
            const high = this.piece.highestPitchNumber;
            tpChoices = this.pitchChroma ?
              this.piece.raga.getPitchNumbers(0, 11).reverse() :
              this.piece.raga.getPitchNumbers(low, high).reverse();
          } else {
            tpChoices = this.targetPitchChoices;
          }
          const tp = tpChoices[this.targetPitchIdx];
          const targetPitch = this.targetPitchBool ? tp : undefined;
          const minPatSize = this.minPatternSize ? this.minPatternSizeValue : 1;
          this.createPatternCounterGraph({
            segmentation: this.segmentationType,
            duration: this.duration,
            pitchChroma: this.pitchChroma,
            fadeTime: this.fadeTime,
            targetPitch: targetPitch,
            minSize: minPatSize,
            pitchType: this.pitchType,
            plot: this.plot,
          })
        }
      },

      createPatternCounterGraph({
        segmentation = 'Section',
        duration = 30,
        pitchChroma = false,
        pitchType = 'Pitch Number',
        fadeTime = this.fadeTime,
        targetPitch = undefined,
        minSize = 1,
        plot = false

      } = {}) {
        const pSizes = this.patternSizes
            .filter((_, idx) => this.selectedPatternSizes[idx]);
        let segments, title;
        if (segmentation === 'Duration') {
          segments = segmentByDuration(this.piece, { duration: duration });
          title = `Patterns of Size ${pSizes.join(', ')}, ` + 
            `Segmented into ${duration}s Durations`;
        } else if (segmentation === 'Phrase') {
          segments = this.piece.phrases.map(p => p.trajectories);
          title = `Patterns of Size ${pSizes.join(', ')}, Segmented by Phrase`;
        } else if (segmentation === 'Section') {
          segments = this.piece.sections.map(s => s.trajectories);
          title = `Patterns of Size ${pSizes.join(', ')}, Segmented by Section`;
        } else if (segmentation === 'Transcription') {
          segments = [this.piece.allTrajectories()];
          title = `Patterns of Size ${pSizes.join(', ')} in Full Transcription`;
        }
        const pCounts = segments.map(s => {
          const pCount = {};
          let maxSize = 0;          
          pSizes.forEach(ps => {
              const options = {
                size: ps,
                outputType: pitchChroma ? 'chroma' : 'pitchNumber',
                maxLagTime: fadeTime,
                sort: true,
                targetPitch: targetPitch,
                minSize: minSize
              }
              const pc = patternCounter(s, options);
              if (pc.length > maxSize) maxSize = pc.length;
              pCount[ps] = pc
            })
          pCount['maxSize'] = maxSize;
          return pCount;
        })
        let verticalTot = 20 * pCounts
          .map(pCount => (plot ? pCount.maxSize * 4 : pCount.maxSize) + 3)
          .reduce((acc, v) => acc + v, 0);
        const margin = { top: 100, right: 30, bottom: 20, left: 30 };
        const sum = pSizes.reduce((acc, ps) => acc + ps, 0);
        let totalWidth = (sum + 3 * pSizes.length) * 20 + margin.left;
        // let totalWidth = 900;
        let totalHeight = verticalTot + margin.top;
        this.topSvg = d3.select(this.$refs.graph)
          .append('svg')
          .attr('width', totalWidth)
          .attr('height', totalHeight)
          .style('background-color', 'white')
        this.svg = this.topSvg
          .append('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`)

        // add title
        this.addText({
          x: totalWidth / 2,
          y: -75,
          text: this.piece.title,
          fSize: '14px',
          fWeight: 'bold'
        });
        this.addText({ 
          x: totalWidth / 2, 
          y: -55, 
          text: title, 
          fSize: '14px', 
          fWeight: 'bold' 
        });

        let verticalOffset = 0;
        pCounts.forEach((pCount, pcIdx) => {
          if (segmentation === 'Section') {
            this.addText({
              x: 0,
              y: verticalOffset * 20 - 15,
              text: 'Section ' + (pcIdx + 1),
              fSize: '12px',
              fWeight: 'bold',
              anchor: 'left'
            })
          } else if (segmentation === 'Duration') {
            const txt = displayTime(pcIdx * duration) + ' - ' + 
              displayTime((pcIdx + 1) * duration);
            this.addText({
              x: 0,
              y: verticalOffset * 20 - 15,
              text: txt,
              fSize: '12px',
              fWeight: 'bold',
              anchor: 'left'
            })
          }
          const sizes = Object.keys(pCount).filter(k => k !== 'maxSize');
          let ct = 0;
          sizes.forEach((size, sIdx) => {
            const arr = pCount[size];
            arr.forEach((patternObj, aIdx) => {
              const y = plot ? 
                  (4 * aIdx + verticalOffset) * 20 : 
                  (aIdx + verticalOffset) * 20;
              patternObj.pattern.forEach((patItem, patIdx) => {
                const x = patIdx * 20 + ct * 20;
                const chroma = pitchNumberToChroma(patItem);
                const colors = [
                  '#e6194b', 
                  '#3cb44b', 
                  '#ffe119', 
                  '#4363d8', 
                  '#f58231', 
                  '#911eb4', 
                  '#46f0f0', 
                  '#f032e6', 
                  '#bcf60c', 
                  '#fabebe', 
                  '#008080', 
                  '#e6beff',
                ]
                const co = colors[chroma];
                const x_ = x + 10;
                const y_ = y + 10;
                const blk = shouldTextBeBlack(co);
                const txtColor = blk ? 'black' : 'white';
                this.addRect({ x: x, y: y, w: 20, h: 20, fill: co });
                let txt;
                if (pitchType === 'Sargam') {
                  const pitch = Pitch.fromPitchNumber(patItem);
                  txt = pitch.octavedSargamLetter;
                } else if (pitchType === 'Pitch Number') {
                  txt = patItem;
                }
                this.addText({ x: x_, y: y_, text: txt, fill: txtColor })
              })
              const x = size * 20 + ct * 20 + 15;
              // const y = (verticalOffset + aIdx) * 20 + 10;
              this.addRect({ x: x-10, y: y, w: 20, h: 20, fill: 'black' })
              this.addText({ x: x, y: y + 10, text: patternObj.count, fill: 'white' })

              if (plot) {
                let pattern = patternObj.pattern;
                if (pitchChroma) {
                  pattern = chromaSeqToCondensedPitchNums(pattern)
                }
                const pitches = pattern.map(p => {
                  return Pitch.fromPitchNumber(p)
                })
                const da = [...Array(pitches.length-1)]
                  .map(_ => 1 / (pitches.length-1))
                const trajObj = {
                  id: 6,
                  pitches: pitches,
                  durArray: da,
                }
                const traj = new Trajectory(trajObj);
                const numPts = 50;
                const pts = linSpace(0, 1, numPts);
                let computes = pts.map(pt => traj.compute(pt, true));
                const min = Math.min(...computes);
                const initMax = Math.max(...computes);
                computes = computes.map(c => c - min);
                const max = Math.max(...computes);
                if (max > 0) computes = computes.map(c => c / max);


                const x_ = ct * 20;
                // const x_end = x_ + 20 * pCount.maxSize;
                const xScale = d3.scaleLinear()
                  .domain([0, 1])
                  .range([x_ + 10, x_ + 20 * size - 10])
                const y = (4 * aIdx + verticalOffset) * 20 + 30;
                const yScale = d3.scaleLinear()
                  .domain([0, 1])
                  .range([y + 40, y])
                
                
                
                const line = d3.line()
                  .x((d, i) => xScale(pts[i]))
                  .y((d, i) => yScale(d))
                  
                
                
                if (min !== initMax) {
                  const nps = pitches.map(p => p.numberedPitch)
                  const minP = Math.min(...nps);
                  const maxP = Math.max(...nps);
                  const pns = this.piece.raga.getPitchNumbers(minP, maxP);
                  const ps = pns.map(p => Pitch.fromPitchNumber(p));
                  const lines = ps.map(p => {
                    return (p.logFreq - min) / (initMax - min)
                  })
                  lines.forEach(l => {
                    this.svg.append('line')
                      .attr('x1', x_)
                      .attr('y1', yScale(l))
                      .attr('x2', x_ + 20 * size)
                      .attr('y2', yScale(l))
                      .attr('stroke', 'lightgrey')
                      .attr('stroke-width', 1)
                  })
                }
                this.svg.append('path')
                  .datum(computes)
                  .attr('d', line)
                  .attr('stroke', 'black')
                  .attr('stroke-width', 1)
                  .attr('fill', 'none')
              }
            })
            ct += Number(size);      
            ct += 3;
          })
          const offset = plot ? 3 * pCount.maxSize : pCount.maxSize;

          verticalOffset += offset;
          verticalOffset += 3;
        })
        


        
      }

    },

    async mounted() {
      const navHeight = this.$parent.$parent.navHeight;
      const aboveHeight = this.controlsHeight + this.typeRowHeight + navHeight;
      this.graphRowHeight = window.innerHeight - aboveHeight;
      try {
        const storedId = this.$store.state._id;
        const pieceDoesExist = await pieceExists(storedId);
        const id = pieceDoesExist ? storedId : '63445d13dc8b9023a09747a6';
        this.$router.push({
          name: 'AnalyzerComponent', 
          query: { 'id': id },
        })
        this.piece = await instantiatePiece(id);
        this.createGraph();
        const low = this.piece.lowestPitchNumber;
        const high = this.piece.highestPitchNumber;
        const raga = this.piece.raga;
        if (this.pitchChroma) {
          this.targetPitchChoices = raga.getPitchNumbers(0, 11).reverse();
          this.targetPitchIdx = this.targetPitchChoices.indexOf(0);
        } else {
          this.targetPitchChoices = raga.getPitchNumbers(low, high).reverse()
          this.targetPitchIdx = this.targetPitchChoices.indexOf(0)
        }  
      } catch (err) {
        console.log(err);
      }
    }
  }
</script>

<style lang="css" scoped>
  .main {
    background-image: linear-gradient(black, #1e241e);
    height: 100%;
    color: white;
    user-select: none;
  }

  .graph {
    overflow-x: scroll;
    overflow-y: scroll;
    width: 90vw;
    /* height: 100%; */
    height: v-bind(graphRowHeight + 'px');
    /* max-height: v-bind(graphRowHeight + 'px'); */
    /* overflow-y: scroll; */
  }

  .graphContainer {
    width: 100%;
    /* height: v-bind(graphRowHeight + 'px'); */
    /* max-height: v-bind(graphRowHeight + 'px'); */
    height: calc(100% - v-bind(controlsHeight + typeRowHeight + 100 + 'px'));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow-y: scroll;
  }

  .analysisControls {
    display: flex;
    flex-direction: column;
    justify-content: top;
    align-items: center;
    width: 100%;
    height: v-bind(controlsHeight + typeRowHeight + 'px');
    border-top: 1px solid black;
  }

  .analysisTypeRow {
    display: flex;
    flex-direction: row;
    justify-content: left;
    align-items: center;
    width: 100%;
    height: v-bind(typeRowHeight + 'px');
    background-color: #1e241e;
  }

  .analysisType {
    width: 150px;
    height: 30px;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    border-radius: 5px;
  }

  .analysisType:hover {
    cursor: pointer;
    background-color: #586958;
  }

  .selected {
    background-color: #586958;
    /* color: white; */
  }

  .controls { 
    display: flex;
    flex-direction: row;
    justify-content: left;
    align-items: center;
    width: 100%;
    height: 100%;
    background-color: black;
    overflow: auto;
  }

  .controlBox {
    display: flex;
    flex-direction: column;
    justify-content: top;
    align-items: left;
    width: v-bind(controlBoxWidth + 'px');
    height: v-bind(controlsHeight - 20 + 'px');
    padding: 10px;
    /* border: 1px solid black; */
  }
  
  .controlBox > div {
    width: 100%;
    height: 25px;
    display: flex;
    flex-direction: row;
    justify-content: left;
    align-items: center;
  }

  .controlBox > div > input {
    margin: 5px;
  }

  .controlBox.button {
    justify-content: center;
    align-items: center;
  }

  button {
    cursor: pointer;
  }

  button.generate {
    width: 100px;
  }

  #duration {
    max-width: 50px;
    width: 50px;
  }

  #fadeTime {
    /* max-width: 50px; */
    width: 36px;
    max-width: 36px;
    padding: 0px;
    margin: 0px;
  }

  #targetPitch {
    max-width: 40px;
    min-width: 40px;
    width: 40px;
    /* margin-left: 5px; */
  }

  label {
    font-family: sans-serif;
    width: 120px;
    text-align: left;
    
  }

  button {
    font-family: sans-serif
  }

  input {
    font-family: sans-serif;
  }
  

  .rightInputRow {
    display: flex;
    flex-direction: row;
    justify-content: right;
    align-items: center;
    width: 100%;
    height: 25px;
  }

  .rightInputRow > label {
    text-align: right;
    margin-right: 5px;
  }

  .patternSizeLabel {
    text-align: center;
    height: 25px;
  }

  .patternSizeMatrix {
    height: v-bind(controlsHeight - 40 + 'px');
    min-height: v-bind(controlsHeight - 40 + 'px');
    display: flex;
    flex-direction: column;
    justify-content: top;
    align-items: center;
    width: 100%;
  }

  .patternSizeRow {
    display: flex;
    flex-direction: row;
    justify-content: left;
    align-items: center;
    width: v-bind(controlBoxWidth / 3 + 'px');
    height: 25px;
  }

  .patternSizeRow > label {
    margin-left: 5px;
  }

  .minPatternSizeInput {
    width: 30px;
    min-width: 30px;
    max-width: 30px;
  }
</style>
