<template>
  <div class='main'>
    <div class='analysisControls'>
      <div class='analysisTypeRow'>
        <div 
          :class='`analysisType ${atIdx === selectedATIdx ? "selected" : ""}`' 
          v-for='(at, atIdx) in analysisTypes'
          :key='at'
          @click='selectedATIdx = atIdx'
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
            <label for='fadeTime'>Fade Time</label>
            <input type='number' id='fadeTime' v-model.number='fadeTime'>
            <label for='fadeTime'>(s)</label>
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
    </div>
    <div class='graphContainer'>
      <div class='graph' ref='graph'></div>
    </div>
  </div>
</template>

<script>

  import { 
    instantiatePiece, 
    segmentByDuration, 
    durationsOfPitchOnsets 
  } from '@/js/analysis.mjs';
  import { durationsOfFixedPitches } from '@/js/classes.mjs';
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

  export default {
    data() {
      return {
        piece: undefined,
        analysisTypes: ['Pitch Prevalence', 'Markov Matrices'],
        selectedATIdx: 0,
        pitchPrevalenceTypes: ['Section', 'Phrase', 'Duration'],
        pitchRepresentationTypes: ['Fixed Pitch', 'Pitch Onsets'],
        segmentationType: 'Section',
        pitchRepresentation: 'Fixed Pitch',
        duration: 30,
        pitchChroma: false,
        condensed: false,
        heatmap: false,
        fadeTime: 5,
      }
    },

    methods: {

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
        fontSize = '12px',
        fontWeight = 'normal',
        fill = 'black',
      } = {}) {
        return svg.append('text')
          .attr('x', x)
          .attr('y', y)
          .attr('font-size', fontSize)
          .attr('font-weight', fontWeight)
          .attr('fill', fill)
          .attr('text-anchor', 'middle')
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
        duration = 30, // in seconds, only applicable if segmentation is 'Duration'
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
        const ppOct = condensed ? this.piece.raga.getPitchNumbers(0, 11).length : 12; 
        const lkOct = Math.floor(lowestKey / ppOct);
        const hkOct = Math.floor(highestKey / ppOct);
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
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
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
                fill: heatmap ? 'none' : 'lightgrey',
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
                  this.addRect({ x: x_, y: mY_, w: w_, h: mH_, fill: 'lightgrey'})
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
                fill: heatmap ? 'none' : 'lightgrey',
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
        for (let i = lkOct; i <= hkOct; i++) {
          let lowY = i * ppOct;
          let highY = (i+1) * ppOct;
          if (i === lkOct) {
            lowY = lowestKey - 0.5;
          }
          if (i === hkOct) {
            highY = highestKey+ 1.5;
          }
          this.addText({ x: '-45', y: y((lowY + highY) / 2 - 0.5), text: i })
          const h_ = y(lowY) - y(highY);
          const y_ = y(highY - 0.5);
          this.addRect({ x: '-60', y: y_, w: '30', h: h_, stroke: 'black' })
          const lY_ = y(lowY - 0.5);
          this.addLine({ x1: '-30', y1: lY_, x2: width, y2: lY_ })
          if (i === hkOct) this.addLine({ x1: '-30', y1: y_, x2: width, y2: y_ })
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
            const text = `Pitch Range and Percentage of Duration on each Fixed Pitch, Segmented into ${duration}s Windows`;
            const x_ = (width - 30) / 2;
            this.addText({ x: x_, y: -55, text: text, fontSize: '14px', fontWeight: 'bold' })
            this.addLine({ x1: -60, y1: 0, x2: -60, y2: -40 })
            this.addLine({ x1: -60, y1: -40, x2: -30, y2: -40})
            this.addText({ x: -45, y: -20, text: 'Oct.' })
            durs.forEach((dur, dIdx) => {
              const tX_ = widthPerSeg * (dIdx + 0.5);
              this.addText({ x: tX_, y: -30, text: displayTime(dIdx * duration) });
              this.addText({ x: tX_, y: -10, text: displayTime((dIdx + 1) * duration) });
              if (dIdx !== durs.length - 1) {
                const x_ = widthPerSeg * (dIdx + 1)
                this.addLine({ x1: x_, y1: 0, x2: x_, y2: -40, stroke: 'lightgrey' })
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
              text: 'Pitch Range and Percentage of Duration on each Fixed Pitch, Segmented by Section', 
              fontSize: '14px', 
              fontWeight: 'bold' 
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
                this.addLine({ x1: x_, y1: 0, x2: x_, y2: -60, stroke: 'lightgrey' })
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
              text: 'Pitch Range and Percentage of Duration on each Fixed Pitch, Segmented by Phrase', 
              fontSize: '14px', 
              fontWeight: 'bold' 
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
                this.addLine({ x1: lX_, y1: 0, x2: lX_, y2: -60, stroke: 'lightgrey' })
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

        this.createPitchFrequencyGraph({ 
          segmentation: this.segmentationType,
          duration: this.duration,
          pitchChroma: this.pitchChroma,
          condensed: this.condensed,
          heatmap: this.heatmap,
          pitchRepresentation: this.pitchRepresentation,
        })
      }
    },

    async mounted() {
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
    width: 90vw;
  }

  .graphContainer {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .analysisControls {
    display: flex;
    flex-direction: column;
    justify-content: top;
    align-items: center;
    width: 100%;
    height: 200px;
    border-top: 1px solid black;
  }

  .analysisTypeRow {
    display: flex;
    flex-direction: row;
    justify-content: left;
    align-items: center;
    width: 100%;
    height: 30px;
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
    width: 150px;
    height: calc(100% - 20px);
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
    width: 30px;
  }

  #fadeTime {
    /* max-width: 50px; */
    width: 30px;
  }
</style>
