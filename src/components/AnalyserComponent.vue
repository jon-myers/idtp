<template>
  <div class='main'>
    <button @click='createDemoGraph'>Create Demo Graph</button>
    <div class='graphContainer'>
      <div class='graph' ref='graph'></div>
    </div>
  </div>
</template>

<script>

  import { instantiatePiece, segmentByDuration } from '@/js/analysis.mjs';
  import { durationsOfFixedPitches } from '@/js/classes.mjs'
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
        piece: undefined
      }
    },

    methods: {

      createPitchFrequencyGraph({
        segmentation = 'duration', // or 'phrase' or 'section'
        duration = 30, // in seconds, only applicable if segmentation is 'duration'
      } = {}) {
        let segments;
        if (segmentation === 'duration') {
          segments = segmentByDuration(this.piece, { duration: duration });
        } else if (segmentation === 'phrase') {
          segments = this.piece.phrases.map(p => p.trajectories);
        } else if (segmentation === 'section') {
          segments = this.piece.sections.map(s => s.trajectories);
        }
        const durs = segments.map(seg => durationsOfFixedPitches(seg, {
          countType: 'proportional'
        }));
        let lowestKey = 0;
        let highestKey = 0;
        durs.forEach(dur => {
          const keys = Object.keys(dur);
          keys.forEach(key => {
            if (Number(key) < lowestKey) {
              lowestKey = Number(key);
            }
            if (Number(key) > highestKey) {
              highestKey = Number(key);
            }
          })
        })
        let totalWidth = 900;
        let totalHeight = 600;
        const lkOct = Math.floor(lowestKey / 12);
        const hkOct = Math.floor(highestKey / 12);
        const mTop = segmentation === 'duration' ? 90 : 110;
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
        const y = d3.scaleLinear()
          .domain([lowestKey-1, highestKey+1])
          .range([height, 0]);
        const axisNode = this.svg.append('g')
        const pitchNumbers = this.piece.raga.getPitchNumbers(lowestKey, highestKey);
        const tickLabels =  pitchNumbers.map(pn => {
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
          sectionRects[dIdx] = this.svg.append('rect')
            .attr('x', x_)
            .attr('y', y_)
            .attr('width', w_)
            .attr('height', h_)
            .attr('fill', 'lightgrey')  
          keys.forEach((key, kIdx) => {
            let fillColor = 'black';
            if (key === modeIdx) {
              fillColor = 'white'
              const rect = this.svg.append('rect')
              .attr('x', x_)
              .attr('y', y(Number(key)+0.5))
              .attr('width', w_)
              .attr('height', y(Number(key)-0.5) - y(Number(key)+0.5))
              .attr('fill', 'grey')
              .attr('id', `${dIdx}_${key}`)
            }
            this.svg
              .append('text')
              .attr('x', x_ + width/(2*durs.length))
              .attr('y', y(Number(key)))
              .text((100*dur[key]).toFixed(0)+'%')
              .attr('fill', fillColor)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .attr('font-size', '12px')
              // .attr('alignment-baseline', 'middle')
          })
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
          let lowY = i * 12;
          let highY = (i+1) * 12;
          if (i === lkOct) {
            lowY = lowestKey - 0.5;
          }
          if (i === hkOct) {
            highY = highestKey+ 1.5;
          }
          // const text = texts[i-lkOct];
          const text = i
          this.svg.append('text')
            .attr('x', '-45')
            .attr('y', y((lowY + highY) / 2 - 0.5))
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .text(text)
            
          this.svg.append('rect')
            .attr('x', '-60')
            .attr('y', y(highY - 0.5))
            .attr('width', '30')
            .attr('height', y(lowY) - y(highY))
            .attr('fill', 'none')
            .attr('stroke', 'black')
            .attr('id', `oct_${i}`)
          
          this.svg.append('line')
            .attr('x1', '-30')
            .attr('y1', y(lowY - 0.5))
            .attr('x2', width)
            .attr('y2', y(lowY - 0.5))
            .attr('stroke', 'black')
          
          if (i === hkOct) {
            this.svg.append('line')
              .attr('x1', '-30')
              .attr('y1', y(highY - 0.5))
              .attr('x2', width)
              .attr('y2', y(highY - 0.5))
              .attr('stroke', 'black')
          }

          this.svg.append('line')
            .attr('x1', width)
            .attr('y1', y(lowY - 0.5))
            .attr('x2', width)
            .attr('y2', y(highY - 0.5))
            .attr('stroke', 'black')

          if (segmentation === 'duration') {
            this.svg.append('line')
              .attr('x1', -30)
              .attr('y1', -20)
              .attr('x2', width)
              .attr('y2', -20)
              .attr('stroke', 'black')
            
            this.svg.append('line')
              .attr('x1', -30)
              .attr('y1', -40)
              .attr('x2', width)
              .attr('y2', -40)
              .attr('stroke', 'black')
            
            this.svg.append('text')
              .attr('x', -15)
              .attr('y', -10)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('font-size', '12px')
              .text('End')
            this.svg.append('text')
              .attr('x', -15)
              .attr('y', -30)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('font-size', '12px')
              .text('Start')
            
            this.svg.append('line')
              .attr('x1', -30)
              .attr('y1', 0)
              .attr('x2', -30)
              .attr('y2', -70)
              .attr('stroke', 'black')
            
            this.svg.append('line')
              .attr('x1', 0)
              .attr('y1', 0)
              .attr('x2', 0)
              .attr('y2', -40)
              .attr('stroke', 'black')

            this.svg.append('line')
              .attr('x1', -30)
              .attr('y1', -70)
              .attr('x2', width)
              .attr('y2', -70)
              .attr('stroke', 'black')
            
            this.svg.append('line')
              .attr('x1', width)
              .attr('y1', -70)
              .attr('x2', width)
              .attr('y2', 0)
              .attr('stroke', 'black')
            
            this.svg.append('text')
              .attr('x', (width - 30) / 2)
              .attr('y', -55)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('font-size', '14px')
              .text(`Pitch Range and Percentage of Duration on each Fixed Pitch, Segmented into ${duration}s Windows `)
              .attr('font-weight', 'bold')
            
            this.svg.append('line')
              .attr('x1', -60)
              .attr('y1', 0)
              .attr('x2', -60)
              .attr('y2', -40)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', -60)
              .attr('y1', -40)
              .attr('x2', -30)
              .attr('y2', -40)
              .attr('stroke', 'black')
            this.svg.append('text')
              .attr('x', -45)
              .attr('y', -20)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('font-size', '12px')
              .text('Oct.')

            
            durs.forEach((dur, dIdx) => {
              // start text
              this.svg.append('text')
                .attr('x', widthPerSeg * (dIdx + 0.5))
                .attr('y', -30)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('font-size', '12px')
                .text(displayTime(dIdx * duration))
              // end text  
              this.svg.append('text')
                .attr('x', widthPerSeg * (dIdx + 0.5))
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('font-size', '12px')
                .text(displayTime((dIdx + 1) * duration))
              if (dIdx !== durs.length - 1) {
                this.svg.append('line')
                .attr('x1', widthPerSeg * (dIdx + 1))
                .attr('y1', 0)
                .attr('x2', widthPerSeg * (dIdx + 1))
                .attr('y2', -40)
                .attr('stroke', 'lightgrey')
              }
            })

          } else if (segmentation === 'section') {
            this.svg.append('line')
              .attr('x1', -30)
              .attr('y1', -20)
              .attr('x2', width)
              .attr('y2', -20)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', -60)
              .attr('y1', -40)
              .attr('x2', width)
              .attr('y2', -40)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', -60)
              .attr('y1', -60)
              .attr('x2', width)
              .attr('y2', -60)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', -60)
              .attr('y1', 0)
              .attr('x2', -60)
              .attr('y2', -90)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', -30)
              .attr('y1', 0)
              .attr('x2', -30)
              .attr('y2', -40)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', 0)
              .attr('y1', 0)
              .attr('x2', 0)
              .attr('y2', -60)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', width)
              .attr('y1', 0)
              .attr('x2', width)
              .attr('y2', -90)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', -60)
              .attr('y1', -90)
              .attr('x2', width)
              .attr('y2', -90)
              .attr('stroke', 'black')
            
            //labels
            this.svg.append('text') // title
              .attr('x', width / 2)
              .attr('y', -75)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('font-size', '14px')
              .text('Pitch Range and Percentage of Duration on each Fixed Pitch, Segmented by Section')
              .attr('font-weight', 'bold')
            this.svg.append('text')
              .attr('x', -15)
              .attr('y', -10)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('font-size', '12px')
              .text('End')
            this.svg.append('text')
              .attr('x', -15)
              .attr('y', -30)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('font-size', '12px')
              .text('Start')
            this.svg.append('text')
              .attr('x', -30)
              .attr('y', -50)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('font-size', '12px')
              .text('Section')
            this.svg.append('text')
              .attr('x', -45)
              .attr('y', -20)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('font-size', '12px')
              .text('Oct.')
            durs.forEach((dur, dIdx) => {
              const secPhrases = this.piece.sections[dIdx].phrases;
              const st = secPhrases[0].startTime;
              const lastPhrase = secPhrases[secPhrases.length - 1];
              const et = lastPhrase.startTime + lastPhrase.durTot;
              this.svg.append('text')
                .attr('x', (dIdx + 0.5) * widthPerSeg)
                .attr('y', -30)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('font-size', '12px')
                .text(displayTime(st))
              this.svg.append('text')
                .attr('x', (dIdx + 0.5) * widthPerSeg)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('font-size', '12px')
                .text(displayTime(et))
              this.svg.append('text')
                .attr('x', (dIdx + 0.5) * widthPerSeg)
                .attr('y', -50)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('font-size', '12px')
                .text(dIdx + 1)
              if (dIdx !== durs.length - 1) {
                this.svg.append('line')
                  .attr('x1', widthPerSeg * (dIdx + 1))
                  .attr('y1', 0)
                  .attr('x2', widthPerSeg * (dIdx + 1))
                  .attr('y2', -60)
                  .attr('stroke', 'lightgrey')
              }           
            })
            
            
          } else if (segmentation === 'phrase') {
            this.svg.append('line')
              .attr('x1', -30)
              .attr('y1', -20)
              .attr('x2', width)
              .attr('y2', -20)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', -60)
              .attr('y1', -40)
              .attr('x2', width)
              .attr('y2', -40)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', -60)
              .attr('y1', -60)
              .attr('x2', width)
              .attr('y2', -60)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', -60)
              .attr('y1', 0)
              .attr('x2', -60)
              .attr('y2', -90)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', -30)
              .attr('y1', 0)
              .attr('x2', -30)
              .attr('y2', -40)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', 0)
              .attr('y1', 0)
              .attr('x2', 0)
              .attr('y2', -60)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', width)
              .attr('y1', 0)
              .attr('x2', width)
              .attr('y2', -90)
              .attr('stroke', 'black')
            this.svg.append('line')
              .attr('x1', -60)
              .attr('y1', -90)
              .attr('x2', width)
              .attr('y2', -90)
              .attr('stroke', 'black')

            // text labels
            this.svg.append('text')
              .attr('x', (width - 60) / 2)
              .attr('y', -75)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('font-size', '14px')
              .attr('font-weight', 'bold')
              .text('Pitch Range and Percentage of Duration on each Fixed Pitch, Segmented by Phrase')
            this.svg.append('text')
              .attr('x', -15)
              .attr('y', -10)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('font-size', '12px')
              .text('End')
            this.svg.append('text')
              .attr('x', -15)
              .attr('y', -30)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('font-size', '12px')
              .text('Start')
            this.svg.append('text')
              .attr('x', -30)
              .attr('y', -50)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('font-size', '12px')
              .text('Phrase')
            this.svg.append('text')
              .attr('x', -45)
              .attr('y', -20)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('font-size', '12px')
              .text('Oct.')
            durs.forEach((dur, dIdx) => {
              const phrase = this.piece.phrases[dIdx];
              const st = phrase.startTime;
              const et = st + phrase.durTot;
              this.svg.append('text')
                .attr('x', (dIdx + 0.5) * widthPerSeg)
                .attr('y', -30)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('font-size', '12px')
                .text(displayTime(st))
              this.svg.append('text')
                .attr('x', (dIdx + 0.5) * widthPerSeg)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('font-size', '12px')
                .text(displayTime(et))
              this.svg.append('text')
                .attr('x', (dIdx + 0.5) * widthPerSeg)
                .attr('y', -50)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('font-size', '12px')
                .text(dIdx + 1)
              if (dIdx !== durs.length - 1) {
                this.svg.append('line')
                  .attr('x1', widthPerSeg * (dIdx + 1))
                  .attr('y1', 0)
                  .attr('x2', widthPerSeg * (dIdx + 1))
                  .attr('y2', -60)
                  .attr('stroke', 'lightgrey')
              }
            })

          }
        }
      },

      createDemoGraph() {

        if (this.svg) {
          this.topSvg.selectAll('*').remove();
          this.topSvg.remove();
          this.topSvg = undefined;
          this.svg = undefined;
        }


        this.createPitchFrequencyGraph({ 
          segmentation: 'phrase',
          duration: 20
        })
      }
    },

    async mounted() {
      try {
        this.piece = await instantiatePiece(this.$store.state._id);
        this.createDemoGraph();
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
</style>
