<template>
<div class='main'>
  <div 
    :class='`selectionPanel \
    ${["", "vocal"][Number(vocal)]} \
    ${["", "vib"][Number(showVibObj)]}`'>
    <div class='octShift' v-if='selectedTrajs.length > 0'>
      <button 
        class='octUp' 
        @click='shiftOct(1)' 
        :disabled='!editable || !canShiftUp'
        >
        &#8593
      </button>
      <button 
        class='octDown' 
        @click='shiftOct(-1)' 
        :disabled='!editable || !canShiftDown'
        >
        &#8595
      </button>
    </div>
    <div class='selectionRow checks' v-if='groupable'>
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
        :disabled='true'
      />
    </div>
    <div class='selectionRow checks' v-if='sitar && showTrajChecks'>
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
        :disabled='true'
      />
    </div>
    <div class='selectionRow checks' v-if='sitar && showTrajChecks'>
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
       :disabled='true'
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
        :disabled='true'
        >
        <option 
          v-for='(consonant, idx) in cIso_15919' 
          :key='consonant' 
          :value='consonant'
          v-html='consonantList[idx]'>
        </option>
    </select>
    </div>
    <div class='selectionRow checks' v-if='vocal && showVowelTrajCheck'>
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
        :disabled='true'>
        <option 
          v-for='(vowel, idx) in iso_15919' 
          :key='vowel' 
          :value='vowel'
          v-html='vowelList[idx]'
          >
        </option>
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
        :disabled='true'
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
        <input 
        type='radio' 
        name='phraseDiv' 
        v-model='phraseDivType' 
        value='phrase'
        >
      </div>
      <div class='selectionRow'>
        <label>Section Division</label>
        <input 
        type='radio' 
        name='phraseDiv' 
        v-model='phraseDivType' 
        value='section'
        >
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
        :disabled='true'
      />
    </div>
    <div class='selectionRow slope' v-if='showSlope'>
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
          :disabled='true'
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
        :disabled='true'
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
        :disabled='true'
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
        :disabled='true'
      />
    </div>
  </div>
  <div 
    class='thumbRow' 
    v-for='odx in Math.ceil(urlsFiltered.length/4)' 
    :key='odx'
    >
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
        
        >{{ kNumsFiltered[4 * (odx-1) + (idx-1)] }}</div>
    </div>
  </div>
</div>
</template>
<script lang='ts'>
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
import { getIpaVowels, getConsonants } from '@/js/serverCalls.ts';
import { PropType, defineComponent } from 'vue';
import { initSecCategorization, Piece, Trajectory } from '@/js/classes.ts';

type TrajSelectPanelDataType = {
  urls: string[],
  kNums: string[],
  pluckBool: boolean,
  intraTrajDursBool: boolean,
  selectedIdx?: number,
  parentSelected: boolean,
  slope: number,
  showSlope: boolean,
  showVibObj: boolean,
  periods: number,
  offset: number,
  initUp: boolean,
  extent: number,
  dampen: boolean,
  showTrajChecks: boolean,
  showVowelTrajCheck: boolean,
  showPhraseRadio: boolean,
  phraseDivType?: 'phrase' | 'section',
  trajIdxs: number[],
  urlsFiltered: string[],
  kNumsFiltered: string[],
  vocal: boolean,
  vowel: string,
  ipaVowels: string[],
  englishWords: string[],
  englishTrans: string[],
  hindiVowels: string[],
  iso_15919: string[],
  cIpa: string[],
  cExample: string[],
  cIso_15919: (string | undefined)[],
  hindiConsonants: string[],
  consonantList: string[],
  startConsonant?: string,
  endConsonant?: string,
  grouped: boolean,
  panelHeight: number,
  vib: boolean,
  octShiftTop: number,
  canShiftUp: boolean,
  canShiftDown: boolean,
  vowelList: string[],
  cEngTrans: string[],
  sitar: boolean,
  sarangi: boolean,
}

export default defineComponent({
  name: 'TrajSelectPanel',

  data(): TrajSelectPanelDataType {
    return {
      urls: [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13],
      kNums: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'e'],
      pluckBool: true,
      intraTrajDursBool: false,
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
      showVowelTrajCheck: false,
      showPhraseRadio: false,
      phraseDivType: undefined,
      trajIdxs: [],
      urlsFiltered: [],
      kNumsFiltered: [],
      vocal: false,
      vowel: 'a',
      ipaVowels: ['a', 'b', 'c'],
      englishWords: [],
      hindiVowels: [],
      iso_15919: [],
      cIpa: [],
      cExample: [],
      cIso_15919: [],
      hindiConsonants: [],
      consonantList: [],
      startConsonant: undefined,
      endConsonant: undefined,
      grouped: false,
      panelHeight: 80,
      vib: false,
      octShiftTop: 4,
      canShiftUp: true,
      canShiftDown: true,
      englishTrans: [],
      vowelList: [],
      cEngTrans: [],
      sitar: false,
      sarangi: false,
    }
  },
  
  props: {
    groupable: {
      type: Boolean,
      required: true
    },
    editable: {
      type: Boolean,
      required: true
    },
    ctrlBoxWidth: {
      type: Number,
      required: true
    },
    selectedPhraseDivIdx: {
      type: Number,
      required: false
    },
    piece: {
      type: Object as PropType<Piece>,
    },
    selectedTrajs: {
      type: Array as PropType<Trajectory[]>,
      required: true
    },
    selectedTraj: {
      type: Object as PropType<Trajectory>,
      required: false
    },
    freqMin: {
      type: Number,
      required: true
    },
    freqMax: {
      type: Number,
      required: true
    },
    setNewTraj: {
      type: Boolean,
      required: true
    },
    trajTimePts: {
      type: Array as PropType<{time: number, logFreq: number}[]>,
      required: false
    }
  },

  async mounted() {
    let result = await getIpaVowels();
    this.ipaVowels = result.map(v => v.ipa);
    this.iso_15919 = result.map(v => v.iso_15919);
    this.englishWords = result.map(v => v.english);
    this.englishTrans = result.map(v => v.eng_trans);
    this.hindiVowels = result.map(v => v.hindi.initial);
    this.vowelList = result.map(v => {
      return `${v.hindi.initial} - ${v.iso_15919} (${v.english})`
    })
    const consonantResults = await getConsonants();
    this.cIpa = consonantResults.map(v => v.ipa);
    this.cIso_15919 = consonantResults.map(v => v.iso_15919);
    this.cEngTrans = consonantResults.map(v => v.eng_trans);
    this.cExample = consonantResults.map(v => v.example);
    this.hindiConsonants = consonantResults.map(v => v.hindi);
    this.consonantList = this.cIso_15919.map((iso, idx) => {
      return `${this.hindiConsonants[idx]} - ${iso} (${this.cExample[idx]})`
    })
    this.consonantList.push('none');
    this.cIso_15919.push(undefined);
    if (this.vocal) this.octShiftTop = 75;
    if (this.vocal && this.showSlope) this.octShiftTop = 97
  },
  
  watch: {
    selectedIdx(newVal) {
      document.querySelectorAll('.thumb').forEach(t => {
        t.classList.remove('selected')
      })
      if (newVal !== undefined) {
        const el = document.querySelector(`#id${newVal}`)!
        el.classList.add('selected')
        const slopeIdxs = [2, 3, 4, 5] 
        this.showSlope = slopeIdxs.includes(this.trajIdxs[newVal]);
        this.showVibObj = this.trajIdxs[newVal] === 12;
        if (this.vocal && this.vowel === undefined) {
          this.vowel = 'a'
        }
      }
    },

    showSlope(newVal) {
      if (newVal) {
        this.octShiftTop = this.vocal ? 97 : 4;
      } else {
        this.octShiftTop = this.vocal ? 75 : 4;
      }
    },

    vocal(newVal) {
      if (newVal) {
        this.octShiftTop = this.showSlope ? 97 : 75;
      } else {
        this.octShiftTop = 4;
      }
    },

    phraseDivType(newVal, oldVal) {
      if (oldVal !== undefined && newVal !== undefined) {
        const realPhraseStart = this.selectedPhraseDivIdx! + 1;
        if (newVal === 'phrase' && oldVal == 'section') {
          const piece = this.piece!;
          const starts = piece.sectionStarts;
          if (starts === undefined) {
            throw new Error('starts is undefined')
          }
          piece.sectionStarts = starts.filter((s, sIdx) => {
            const bool = s !== realPhraseStart;
            if (!bool) {
              piece.sectionCategorization.splice(sIdx, 1);
            }
            return bool
          });
          d3Select(`#phraseLine${realPhraseStart-1}`)
            .attr('stroke-width', '2px')
        } else if (newVal === 'section' && oldVal == 'phrase') {
          const piece = this.piece!;
          const starts = piece.sectionStarts;
          if (starts === undefined) {
            throw new Error('starts is undefined')
          }
          piece.sectionStarts = [...starts, realPhraseStart];
          piece.sectionStarts.sort((a, b) => a - b);
          const newIdx = piece.sectionStarts.indexOf(realPhraseStart);
          piece.sectionCategorization
            .splice(newIdx, 0, initSecCategorization());
          d3Select(`#phraseLine${realPhraseStart-1}`)
            .attr('stroke-width', '4px')
        }
      }
    },

    trajIdxs(newVal) {
      this.urlsFiltered = newVal
        .map((idx: number) => this.urls[idx])
        .filter((url: string) => url !== undefined);
      this.kNumsFiltered = newVal
        .map((idx: number) => this.kNums[idx])
        .filter((kNum: string) => kNum !== undefined);
    }
  },

  methods: {

    shiftOct(offset = 1) {
      const sts = this.selectedTrajs;
      sts.forEach(traj => this.$emit('shiftOct', traj, offset))
      const minFreq = Math.min(...sts.map(traj => traj.minFreq));
      const maxFreq = Math.max(...sts.map(traj => traj.maxFreq));
      if ((minFreq / 2) < this.freqMin) {
        this.canShiftDown = false;
      } else {
        this.canShiftDown = true;
      }
      if ((maxFreq * 2) > this.freqMax) {
        this.canShiftUp = false;
      } else {
        this.canShiftUp = true;
      }
    },

    toggleGroup() {
      if (this.grouped) {
        this.$emit('groupSelectedTrajs')
      } else {
        this.$emit('ungroupSelectedTrajs')
      }
    },

    effectivelyFixed(traj: Trajectory) {
      const c1 = traj.pitches.length === 2;
      const c2 = new Set(traj.pitches.map(p => p.numberedPitch)).size === 1;
      const c3 = traj.pitches.map(p => p.logOffset === 0).every(b => b);
      return c1 && c2 && c3;

    },

    selectIcon(e: MouseEvent | number) {
      let idx;
      if (e instanceof PointerEvent) {
        const target = e.target as HTMLElement;
        idx = Number(target!.id.slice(2));
      } else {
        idx = Number(e)
      }
      const selectId = '#id' + idx;
      let realIdx = this.trajIdxs[idx];
      if (realIdx >= 12) {
        realIdx += 1;
      }
      let realSelectedIdx = this.trajIdxs[this.selectedIdx!];
      if (realSelectedIdx >= 12) {
        realSelectedIdx += 1;
      }
      if (this.parentSelected && this.editable) {
        const fixed = [0, 13];
        const twos = [1, 2, 3];
        const threes = [4, 5, 6];
        if (twos.includes(realSelectedIdx)) {
          if (realIdx !== realSelectedIdx) {
            if (twos.includes(realIdx)) {
              this.selectedIdx = idx;
              let outIdx = this.trajIdxs[this.selectedIdx];
              if (outIdx >= 12) outIdx += 1;
              this.$emit('mutateTraj', outIdx)
              document.querySelectorAll('.thumb').forEach(t => {
                t.classList.remove('selected')
              })
              document.querySelector(selectId)!.classList.add('selected')
            } else if (fixed.includes(realIdx) && this.effectivelyFixed(this.selectedTraj!)) {
              this.selectedIdx = idx;
              let outIdx = this.trajIdxs[this.selectedIdx];
              if (outIdx >= 12) outIdx += 1;
              this.$emit('mutateTraj', outIdx)
              document.querySelectorAll('.thumb').forEach(t => {
                t.classList.remove('selected')
              })
              document.querySelector(selectId)!.classList.add('selected')
            }
          }
        } else if (threes.includes(realSelectedIdx)) {
          if (realIdx !== realSelectedIdx && threes.includes(realIdx)) {
            if (realSelectedIdx === 6) {
              if (this.selectedTraj!.durArray!.length === 2) {
                this.selectedIdx = idx;
                let outIdx = this.trajIdxs[this.selectedIdx];
                if (outIdx >= 12) outIdx += 1;
                this.$emit('mutateTraj', outIdx)
                document.querySelectorAll('.thumb').forEach(t => {
                  t.classList.remove('selected')
                })
                document.querySelector(selectId)!.classList.add('selected')
              }
            } else {
              this.selectedIdx = idx;
              let outIdx = this.trajIdxs[this.selectedIdx];
              if (outIdx >= 12) outIdx += 1;
              this.$emit('mutateTraj', outIdx)
              document.querySelectorAll('.thumb').forEach(t => {
                t.classList.remove('selected')
              })
              document.querySelector(selectId)!.classList.add('selected')
            }
          }
        } else if (fixed.includes(realSelectedIdx)) {
          if (realIdx !== realSelectedIdx && 
            (fixed.includes(realIdx) || twos.includes(realIdx))
          ) {
            this.selectedIdx = idx;
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.$emit('mutateTraj', outIdx)
            document.querySelectorAll('.thumb').forEach(t => {
              t.classList.remove('selected')
            })
            document.querySelector(selectId)!.classList.add('selected')
          }
        }
      } else if (this.setNewTraj) {
        const timePts = this.trajTimePts!;
        if (timePts.length === 2) {
          const options = [1, 2, 3];
          if (timePts[0].logFreq === timePts[1].logFreq) options.push(0, 13)
          if (options.includes(realIdx)) {
            this.selectedIdx = idx;

            document.querySelector(selectId)!.classList.add('selected')
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.$emit('newTraj', outIdx)
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
            document.querySelector(selectId)!.classList.add('selected')
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.$emit('newTraj', outIdx)
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
            document.querySelector(selectId)!.classList.add('selected')
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.$emit('newTraj', outIdx)
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
            document.querySelector(selectId)!.classList.add('selected')
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.$emit('newTraj', outIdx)
          }
        } else if (timePts.length === 6) {
          const options = [6];
          if (options.includes(realIdx)) {
            this.selectedIdx = idx;
            document.querySelector(selectId)!.classList.add('selected')
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.$emit('newTraj', outIdx)
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
            document.querySelector(selectId)!.classList.add('selected')
            let outIdx = this.trajIdxs[this.selectedIdx];
            if (outIdx >= 12) outIdx += 1;
            this.$emit('newTraj', outIdx)
          }
        }
      } 
    },
    
    updateSlope() {
      // this.$parent.alterSlope((2 ** this.slope))
      this.$emit('alterSlope', 2 ** this.slope)
    },
    
    updateBool() {
      if (this.parentSelected) {
        this.$emit('pluckBool', this.pluckBool)
      }
    },

    updateDampen() {
      if (this.parentSelected) {
        this.$emit('dampen', this.dampen)
      }
    },

    updateVowel() {
      if (this.parentSelected) {
        this.$emit('vowel', this.vowel);
      } else if (this.selectedTrajs.length > 1) {
        this.$emit('multiVowel', this.vowel);
      }
    },

    updateStartConsonant() {
      if (this.parentSelected) {
        this.$emit('startConsonant', this.startConsonant)
      }
    },

    updateEndConsonant() {
      if (this.parentSelected) {
        this.$emit('endConsonant', this.endConsonant)
      }
    },

    updateVibObj() {
      const vibObj = {
        periods: this.periods,
        vertOffset: this.extent * this.offset,
        initUp: this.initUp,
        extent: this.extent,
      };
      this.$emit('vibObj', vibObj);
    },
  }
})
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
  position: relative;
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
}

.thumb {
  width: 100%;
  height: 100%;
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
  justify-content: right;
}

.selectionRow.slope {
  margin-right: 20px;
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

.octShift {
  position: absolute;
  top: v-bind(octShiftTop + 'px');
  left: 5px;
  width: 100px;
  height: 25px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.octShift button {
  width: 25px;
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin: 2px;
}
</style>
