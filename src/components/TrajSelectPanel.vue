<template>
<div class='main'>
  <div 
    :class='`selectionPanel \
    ${["", "vocal"][Number(vocal)]} \
    ${["", "vib"][Number(showVibObj)]}`'>
    <div class='selectionRow checks' v-if='$parent.groupable'>
      <label>Grouped</label>
      <input
        v-if='editable'
        type='checkbox'
        v-model='grouped'
        @change='toggleGroup'
      />
      <input
        v-if='!editable'
        type='checkbox'
        v-model='grouped'
        @change='toggleGroup'
        disabled='disabled'
      />
    </div>
    <div class='selectionRow checks' v-if='!vocal && showTrajChecks'>
      <label>Pluck</label>
      <input 
        v-if='editable' 
        type='checkbox' 
        v-model='pluckBool' 
        @change='updateBool'
      />
      <input 
        v-if='!editable' 
        type='checkbox' 
        v-model='pluckBool' 
        @change='updateBool'
        disabled='disabled'
      />
    </div>
    <div class='selectionRow checks' v-if='!vocal && showTrajChecks'>
      <label class='spaceLeft'>Dampen</label>
      <input 
        v-if='editable' 
        type='checkbox' 
        v-model='dampen' 
        @change='updateDampen'
      />
      <input 
        v-if='!editable' 
        type='checkbox' 
        v-model='dampen' 
        @change='updateDampen'
        disabled='disabled'
      />
    </div>
    <div class='selectionRow checks' v-if='vocal && showTrajChecks'>
      <label class='spaceLeft wide'>Start</label>
      <select 
        v-if='editable' 
        v-model='startConsonant' 
        @change='updateStartConsonant'
        >
        <option 
          v-for='(consonant, idx) in cIso_15919' 
          :key='consonant' 
          :value='consonant'
          v-html='consonantList[idx]'>
        </option>
      </select>
        <select 
        v-if='!editable' 
        v-model='startConsonant' 
        disabled='disabled'
        >
        <option 
          v-for='(consonant, idx) in cIso_15919' 
          :key='consonant' 
          :value='consonant'
          v-html='consonantList[idx]'>
        </option>
    </select>
    </div>
    <div class='selectionRow checks' v-if='vocal && showTrajChecks'>
      <label class='spaceLeft'>Vowel</label>
      <select
        v-if='editable'
        v-model='vowel' 
        @change='updateVowel' 
        class='vowelSelect'>
        <option 
        v-for='(vowel, idx) in iso_15919' 
        :key='vowel' 
        :value='vowel'
        v-html='vowelList[idx]'>
        </option>
      </select>
      <select
        v-if='!editable'
        v-model='vowel' 
        @change='updateVowel' 
        class='vowelSelect'
        disabled='disabled'>
        <option 
          v-for='(vowel, idx) in iso_15919' 
          :key='vowel' 
          :value='vowel'
          v-html='vowelList[idx]'
          >
        </option>
          <!-- {{ hindiVowels[idx] + '  -  ' + iso_15919[idx] + '  ('}}
            <span v-html='englishWords[idx]'></span>
          {{ ')' }}  -->
        <!-- </option> -->
      </select>
    </div>
    <div class='selectionRow checks' v-if='vocal && showTrajChecks'>
      <label class='spaceLeft wide'>End</label>
      <select 
        v-if='editable' 
        v-model='endConsonant' 
        @change='updateEndConsonant'
        >
        <option 
          v-for='(consonant, idx) in cIso_15919' 
          :key='consonant' 
          :value='consonant'
          v-html='consonantList[idx]'>
        </option>
      </select>
        <select 
        v-if='!editable' 
        v-model='endConsonant' 
        disabled='disabled'
        >
        <option 
          v-for='(consonant, idx) in cIso_15919' 
          :key='consonant' 
          :value='consonant'
          v-html='consonantList[idx]'>
        </option>
    </select>
    </div>
    <div class='radioGroup' v-if='showPhraseRadio'>
      <div class='selectionRow'>
        <label>Phrase Division</label>
        <input type='radio' name='phraseDiv' v-model='phraseDivType' value='phrase'>
      </div>
      <div class='selectionRow'>
        <label>Section Division</label>
        <input type='radio' name='phraseDiv' v-model='phraseDivType' value='section'>
      </div>
    </div>
    <div class='selectionRow checks' v-if='showVibObj'>
      <label v-if='showVibObj' class='spaceLeft'>Phase</label>
      <input
        v-if='editable && showVibObj'
        type='checkbox'
        v-model='initUp'
        @change='updateVibObj'
      />
      <input
        v-if='!editable && showVibObj'
        type='checkbox'
        v-model='initUp'
        @change='updateVibObj'
        disabled='disabled'
      />
    </div>
    <div class='selectionRow' v-if='showSlope'>
      <label>Slope</label>
      <input 
        v-if='editable'
        type='range' 
        class='slider'
        v-model='slope'
        min='0.0'
        max='3.0'
        step='0.01'
        @input='updateSlope'
        />
        <input 
          v-if='!editable'
          type='range' 
          class='slider'
          v-model='slope'
          min='0.0'
          max='3.0'
          step='0.01'
          @input='updateSlope'
          disabled='disabled'
          />
    </div>
    <div class='selectionRow' v-if='showVibObj'>
      <label>Periods</label>
      <input
        v-if='editable'
        type='range'
        class='slider'
        v-model='periods'
        min='1'
        max='20'
        step='0.5'
        @input='updateVibObj'
      />
      <input
        v-if='!editable'
        type='range'
        class='slider'
        v-model='periods'
        min='1'
        max='20'
        step='0.5'
        @input='updateVibObj'
        disabled='disabled'
      />
    </div>
    <div class='selectionRow' v-if='showVibObj'>
      <label>Extent</label>
      <input
        v-if='editable'
        type='range'
        class='slider'
        v-model='extent'
        min='0'
        max='0.2'
        step='0.005'
        @input='updateVibObj'
      />
      <input
        v-if='!editable'
        type='range'
        class='slider'
        v-model='periods'
        min='0'
        max='0.5'
        step='0.01'
        @input='updateVibObj'
        disabled='disabled'
      />
    </div>
    <div class='selectionRow' v-if='showVibObj'>
      <label>Offset</label>
      <input
        v-if='editable'
        type='range'
        class='slider'
        v-model='offset'
        min='-1.0'
        max='1.0'
        step='0.01'
        @input='updateVibObj'
      />
      <input
        v-if='!editable'
        type='range'
        class='slider'
        v-model='periods'
        min='-1.0'
        max='1.0'
        step='0.01'
        @input='updateVibObj'
        disabled='disabled'
      />
    </div>
  </div>
  <div class='thumbRow' v-for='odx in Math.ceil(urlsFiltered.length/4)' :key='odx'>
    <div :class='["imgContainer", idx === 4 ? "right" : ""]' v-for='idx in 4' >
      <img
        v-if='urlsFiltered[4 * (odx-1) + (idx-1)] !== undefined'
        :class='["thumb", idx === 4 ? "right" : "" ]' 
        :src="urlsFiltered[4 * (odx-1) + (idx-1)]" 
        :key='idx' 
        :id='"id" + ((idx-1) + 4 *(odx-1))' 
        @click='selectIcon'>
      <div 
        class='keyNum'
        v-if='urlsFiltered[4 * (odx-1) + (idx-1)] !== undefined'
        
        >{{ keyNumsFiltered[4 * (odx-1) + (idx-1)] }}</div>
    </div>
  </div>
</div>
</template>
<script>
import t1 from '@/assets/thumbnails/1.png';
import t2 from '@/assets/thumbnails/2.png';
import t3 from '@/assets/thumbnails/3.png';
import t4 from '@/assets/thumbnails/4.png';
import t5 from '@/assets/thumbnails/5.png';
import t6 from '@/assets/thumbnails/6.png';
import t7 from '@/assets/thumbnails/7.png';
import t8 from '@/assets/thumbnails/8.png';
import t9 from '@/assets/thumbnails/9.png';
import t10 from '@/assets/thumbnails/10.png';
import t11 from '@/assets/thumbnails/11.png';
import t12 from '@/assets/thumbnails/12.png';
import t13 from '@/assets/thumbnails/13.png';
import { select as d3Select } from 'd3';
import { getIpaVowels, getConsonants } from '@/js/serverCalls.js';
export default {
  name: 'TrajSelectPanel',

  data() {
    return {
      urls: [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13],
      keyNums: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'e'],
      pluckBool: true,
      intraTrajDursBool: false,
      selectedIcon: undefined,
      selectedIdx: undefined,
      parentSelected: false,
      slope: 1,
      showSlope: false,
      showVibObj: false,
      periods: 8,
      offset: 0,
      initUp: true,
      extent: 0.05,
      dampen: false,
      showTrajChecks: false,
      showPhraseRadio: false,
      phraseDivType: undefined,
      trajIdxs: [],
      urlsFiltered: [],
      keyNumsFiltered: [],
      vocal: false,
      vowel: undefined,
      ipaVowels: ['a', 'b', 'c'],
      englishWords: [],
      hindiVowels: [],
      iso_15919: [],
      cIpa: [],
      cExample: [],
      cIso_15919: [],
      hindi_consonants: [],
      consonantList: [],
      startConsonant: undefined,
      endConsonant: undefined,
      grouped: false,
      panelHeight: 80,
      vib: false,
    }
  },
  
  props: [
    'editable',
    'ctrlBoxWidth',
  ],

  async mounted() {
    // const piece = this.$parent.piece;
    // this.urlIdxs = piece.possibleTrajs[piece.instrumentation[0]]
    const result = await getIpaVowels();
    this.ipaVowels = result.map(v => v.ipa);
    this.iso_15919 = result.map(v => v.iso_15919);
    this.englishWords = result.map(v => v.english);
    this.hindiVowels = result.map(v => v.hindi.initial);
    this.vowelList = result.map(v => {
      return `${v.hindi.initial} - ${v.iso_15919} (${v.english})`
    })

    const consonantResults = await getConsonants();
    this.cIpa = consonantResults.map(v => v.ipa);
    this.cIso_15919 = consonantResults.map(v => v.iso_15919);
    
    this.cExample = consonantResults.map(v => v.example);
    this.hindiConsonants = consonantResults.map(v => v.hindi);

    this.consonantList = this.cIso_15919.map((iso, idx) => {
      return `${this.hindiConsonants[idx]} - ${iso} (${this.cExample[idx]})`
    })

    // add 'none' to end of consonantlist
    this.consonantList.push('none');

    this.cIso_15919.push(undefined)


  },
  
  watch: {
    selectedIdx(newVal) {
      document.querySelectorAll('.thumb').forEach(t => {
        t.classList.remove('selected')
      })
      if (newVal !== undefined) {
        const el = document.querySelector(`#id${newVal}`)
        el.classList.add('selected')
        const slopeIdxs = [2, 3, 4, 5]
        this.showSlope = slopeIdxs.includes(this.trajIdxs[this.selectedIdx]);
        this.showVibObj = this.trajIdxs[this.selectedIdx] === 12;
      }
    },

    phraseDivType(newVal, oldVal) {
      if (oldVal !== undefined && newVal !== undefined) {
        const realPhraseStart = this.$parent.selectedPhraseDivIdx + 1;
        if (newVal === 'phrase' && oldVal == 'section') {
          const piece = this.$parent.piece;
          const starts = piece.sectionStarts;
          piece.sectionStarts = starts.filter(s => s !== realPhraseStart);
          d3Select(`#phraseLine${realPhraseStart-1}`)
            .attr('stroke-width', '2px')
        } else if (newVal === 'section' && oldVal == 'phrase') {
          const piece = this.$parent.piece;
          const starts = piece.sectionStarts;
          piece.sectionStarts = [...starts, realPhraseStart];
          piece.sectionStarts.sort();
          d3Select(`#phraseLine${realPhraseStart-1}`)
            .attr('stroke-width', '3px')
        }
      }
    },

    trajIdxs(newVal) {
      this.urlsFiltered = newVal.map(idx => this.urls[idx]);
      this.keyNumsFiltered = newVal.map(idx => this.keyNums[idx]);
    }
  },

  methods: {

    toggleGroup() {
      if (this.grouped) {
        this.$parent.groupSelectedTrajs()
      } else {
        this.$parent.ungroupSelectedTrajs()
      }
    },

    selectIcon(e) {
      let idx;
      if (e instanceof PointerEvent) {
        idx = Number(e.target.id.slice(2));
      } else {
        idx = Number(e)
      }
      const selectId = '#id' + idx;
      let realIdx = this.trajIdxs[idx];
      if (realIdx >= 12) {
        realIdx += 1;
      }
      let realSelectedIdx = this.trajIdxs[this.selectedIdx];
      if (realSelectedIdx >= 12) {
        realSelectedIdx += 1;
      }
      if (this.parentSelected && this.editable) {
        const fixed = [0, 13];
        const twos = [1, 2, 3];
        const threes = [4, 5, 6];
        if (twos.includes(this.trajIdxs[this.selectedIdx])) {
          if (realIdx !== this.trajIdxs[this.selectedIdx] && twos.includes(realIdx)) {
            this.selectedIdx = idx;
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.emitter.emit('mutateTraj', outIdx);
            document.querySelectorAll('.thumb').forEach(t => {
              t.classList.remove('selected')
            })
            document.querySelector(selectId).classList.add('selected')
          }
        } else if (threes.includes(this.trajIdxs[this.selectedIdx])) {
          if (realIdx !== this.trajIdxs[this.selectedIdx] && threes.includes(realIdx)) {
            if (this.trajIdxs[this.selectedIdx] === 6) {
              if (this.$parent.selectedTraj.durArray.length === 2) {
                this.selectedIdx = idx;
                let outIdx = this.trajIdxs[this.selectedIdx];
                if (outIdx >= 12) outIdx += 1;
                this.emitter.emit('mutateTraj', outIdx);
                document.querySelectorAll('.thumb').forEach(t => {
                  t.classList.remove('selected')
                })
                document.querySelector(selectId).classList.add('selected')
              }
            } else {
              this.selectedIdx = idx;
              let outIdx = this.trajIdxs[this.selectedIdx];
              if (outIdx >= 12) outIdx += 1;
              this.emitter.emit('mutateTraj', outIdx);
              document.querySelectorAll('.thumb').forEach(t => {
                t.classList.remove('selected')
              })
              document.querySelector(selectId).classList.add('selected')
            }
          }
        } else if (fixed.includes(realSelectedIdx)) {
          if (realIdx !== this.trajIdxs[this.selectedIdx] && fixed.includes(realIdx)) {
            this.selectedIdx = idx;
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.emitter.emit('mutateTraj', outIdx);
            document.querySelectorAll('.thumb').forEach(t => {
              t.classList.remove('selected')
            })
            document.querySelector(selectId).classList.add('selected')
          }
        }
      } else if (this.$parent.setNewTraj) {
        const timePts = this.$parent.trajTimePts;
        if (timePts.length === 2) {
          const options = [1, 2, 3];
          if (timePts[0].logFreq === timePts[1].logFreq) options.push(0, 13)
          if (options.includes(realIdx)) {
            this.selectedIdx = idx;

            document.querySelector(selectId).classList.add('selected')
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.emitter.emit('newTraj', outIdx);
          }
        } else if (timePts.length === 3) {
          const options = [4, 5, 6];
          const sortedTimePts = timePts.slice().sort((a, b) => a.time - b.time);
          const logFreqs = sortedTimePts.map(tp => tp.logFreq);
          const lfDiffs = logFreqs.slice(1).map((x, i) => x - logFreqs[i]);
          if (lfDiffs[0] < 0 && lfDiffs[1] === 0) options.push(7)
          if (lfDiffs[0] > 0 && lfDiffs[1] === 0) options.push(7)
          if (lfDiffs[1] === 0) options.push(11)
          if (options.includes(realIdx)) {
            this.selectedIdx = idx;
            document.querySelector(selectId).classList.add('selected')
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.emitter.emit('newTraj', outIdx);
          }
        } else if (timePts.length === 4) {
          const options = [6];
          const sortedTimePts = timePts.slice().sort((a, b) => a.time - b.time);
          const logFreqs = sortedTimePts.map(tp => tp.logFreq);
          const lfDiffs = logFreqs.slice(1).map((x, i) => x - logFreqs[i]);
          const c = lfDiffs[0] < 0 && lfDiffs[1] < 0 && lfDiffs[2] === 0
          if (c) options.push(8)
          if (options.includes(realIdx)) {
            this.selectedIdx = idx;
            document.querySelector(selectId).classList.add('selected')
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.emitter.emit('newTraj', outIdx);
          }
        } else if (timePts.length === 5) {
          const options = [6];
          const sortedTimePts = timePts.slice().sort((a, b) => a.time - b.time);
          const logFreqs = sortedTimePts.map(tp => tp.logFreq);
          const lDif = logFreqs.slice(1).map((x, i) => x - logFreqs[i]);
          const c = lDif[0] < 0 && lDif[1] < 0 && lDif[2] > 0 && lDif[3] === 0;
          if (c) options.push(9);
          if (options.includes(realIdx)) {
            this.selectedIdx = idx;
            document.querySelector(selectId).classList.add('selected')
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.emitter.emit('newTraj', outIdx);
          }
        } else if (timePts.length === 6) {
          const options = [6];
          if (options.includes(realIdx)) {
            this.selectedIdx = idx;
            document.querySelector(selectId).classList.add('selected')
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.emitter.emit('newTraj', outIdx);
          }
        } else if (timePts.length === 7) {
          const options = [6];
          const sortedTimePts = timePts.slice().sort((a, b) => a.time - b.time);
          const logFreqs = sortedTimePts.map(tp => tp.logFreq);
          const lfDiffs = logFreqs.slice(1).map((x, i) => x - logFreqs[i]);
          const c = [
            lfDiffs[0] > 0,
            lfDiffs[1] > 0,
            lfDiffs[2] < 0,
            lfDiffs[3] < 0,
            lfDiffs[4] > 0,
            lfDiffs[5] === 0
          ];
          if (c.every(a => a)) {
            options.push(10)
          }
          if (options.includes(realIdx)) {
            this.selectedIdx = idx;
            document.querySelector(selectId).classList.add('selected')
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.emitter.emit('newTraj', outIdx);
          }
        }
      } 
    },
    
    updateSlope() {
      this.$parent.alterSlope((2 ** this.slope))
    },
    
    updateBool() {
      if (this.parentSelected) {
        this.emitter.emit('pluckBool', this.pluckBool)
      }
    },

    updateDampen() {
      if (this.parentSelected) {
        this.emitter.emit('dampen', this.dampen)
      }
    },

    updateVowel() {
      if (this.parentSelected) {
        this.emitter.emit('vowel', this.vowel)
      }
    },

    updateStartConsonant() {
      if (this.parentSelected) {
        this.emitter.emit('startConsonant', this.startConsonant)
      }
    },

    updateEndConsonant() {
      if (this.parentSelected) {
        this.emitter.emit('endConsonant', this.endConsonant)
      }
    },

    updateVibObj() {
      const vibObj = {
        periods: this.periods,
        vertOffset: this.extent * this.offset,
        initUp: this.initUp,
        extent: this.extent,
      };
      this.emitter.emit('vibObj', vibObj);
    },
  }
}
</script>

<style scoped>

.selectionPanel {
  width: v-bind(ctrlBoxWidth + 'px');
  height: v-bind(panelHeight + 'px');
  border-top: 1px solid black;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
}

.selectionPanel.vocal {
  height: v-bind(panelHeight + ctrlBoxWidth/4 + 'px');
}

.selectionPanel.vib {
  height: v-bind(panelHeight + 50 + 'px');
}

.selectionPanel.vocal.vib {
  height: v-bind(panelHeight + ctrlBoxWidth/2 + 'px');
}


.imgContainer {
  width: v-bind((ctrlBoxWidth - 3) / 4 + 'px');
  height: v-bind((ctrlBoxWidth - 3) / 4 + 'px');
  border-right: 1px solid black;
  border-top: 1px solid black;
  margin: 0px;
  position: relative;
  /* display: inline-block */
}

.thumb {
  width: 100%;
  height: 100%;
  /* width: calc((100% - 3px) / 4);
  border-right: 1px solid black;
  border-top: 1px solid black;
  margin: 0;
  display: inline-block; */
  /* cursor: pointer; */
}

.right {
  border-right: none;
}

.thumbRow {
  border: 0;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: row;
}

.selected {
  filter: invert(75%);
}

label {
  display: inline-block;
  width: 60px;
  text-align: right;
}

label.wide {
  width: 150px;
}

.slider {
  width: 120px;
}

.selectionRow {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.selectionRow.checks {
  justify-content: right;
  margin-right: 20px;
  width: 100%;
  height: 25px;
}

.radioGroup > .selectionRow {
  justify-content: right;
  width: 100%;
  height: 30px;
}

.radioGroup > .selectionRow > label {
  width: 125px;
}

.radioGroup > .selectionRow > input {
  margin-right: 10px
}
.selectionRow > label {
  margin-right: 5px;
}

.spaceLeft {
  margin-left: 10px;
}

.keyNum {
  /* display: inline-block; */
  position: absolute;
  bottom: 0px;
  right: 0px;
  z-index: 1;
  color: black;
  width: 15px;
  height: 15px;
  text-align: center;
  font-size: 13px;
}

.selectionRow select {
  width: 120px;
}
</style>
