<template>
  <div class='controlsOuter'>
    <div class='controlsBox primary'>
      <div class='controlsRow'>
        <label for='segmentation'>Segmentation: </label>
        <select name='segmentation' v-model='segmentation'>
          <option 
            v-for='segmentation in possibleSegmentations' 
            :value='segmentation.value'
            :key='segmentation.value'
            >
            {{ segmentation.text }}
          </option>
        </select>
      </div>
      <div class='controlsRow' v-if='segmentation === "sequenceOfTrajectories"'>
      <label>Sequence Size: </label>
        <input 
          type='number' 
          v-model='sequenceLength' 
          min='1' 
          step='1' 
          class='numQueries'
          @input='sequenceLength = Math.round(sequenceLength)'
          @keypress='preventDecimal'
          />
      </div>
      <div class='controlsRow'>
        <label>Queries: </label>
        <input 
          type='number' 
          v-model='numQueries' 
          min='1' 
          step='1' 
          class='numQueries'
          @input='numQueries = Math.round(numQueries)'
          @keypress='preventDecimal'
          />
        <label class='everySome'>Every</label>
        <input type='radio' :value='true' v-model='all' />
        <label class='everySome'>Some</label>
        <input type='radio' :value='false' v-model='all' />
      </div>
      <div class='controlsRow dur'>
        <label>Min Dur: </label>
        <input type='number' v-model='minDur' min='0' :max='maxDur' step='1' />
        <label>Max Dur: </label>
        <input type='number' v-model='maxDur' :min='minDur' step='1' />
      </div>
      <div class='controlsRow'>
        <button @click='runQuery'>Search</button>
      </div>
    </div>
    <div class='queriesContainer'>
      <div 
        class='controlsBox' 
        v-for='(q, qIdx) in numQueries'
        :key='qIdx'
      >
        <div class='controlsRow title'>
          Query {{ q }}
        </div>  
        <div class='controlsRow'>
          <label for='category'>Category: </label>
          <select name='category' v-model='categories[qIdx].value'>
            <option 
              v-for='category in possibleCategories' 
              :value='category.value'
              :key='category.value'
              >
              {{ category.text }}
            </option>
          </select>
        </div>
        <div class='controlsRow' v-if='categories[qIdx].value === "pitch"'>
          <label>Pitch: </label>
          <select 
            name='pitch' 
            v-model='pitchNames[qIdx]' 
            >
            <option 
              v-for='pitchName in reversedSargamNames' 
              :value='pitchName'
              :key='pitchName'
              >
              {{ pitchName }}
            </option>
          </select>
          <label>Octave: </label>
          <select name='octave' v-model='octs[qIdx]'>
            <option 
              v-for='oct in range(-2, 4, true)' 
              :value='oct'
              :key='oct'>
              {{ oct }}
            </option>
          </select>
        </div>
        <div 
          class='controlsRow' 
          v-if='categories[qIdx].value.slice(0, 13) === "pitchSequence"'
          >
          <label>Number of Pitches: </label>
          <select 
            name='numPitches' 
            v-model='numPitches[qIdx]' 
            @change='updateNumPitches(qIdx)'
            >
            <option 
              v-for='numP in range(2, 7, true)' 
              :value='numP'
              :key='numP'
              >
              {{ numP }}
            </option>
          </select>
        </div>
        <div 
          class='controlsRow'
          v-if='categories[qIdx].value.slice(0, 13) === "pitchSequence"'
          >
          <label>Sequence: </label>
          <div 
            class='pitchOct' 
            v-for='(_, seqIdx) in pitchSeqObjs[qIdx].length' 
            :key='seqIdx'
            >
            <select 
              name='pitch' 
              v-model='pitchSeqObjs[qIdx][seqIdx].swara' 
              >
              <option 
                v-for='pitchName in reversedSargamNames' 
                :value='pitchName'
                :key='pitchName'
                >
                {{ pitchName }}
              </option>
            </select>
            <select name='octave' v-model='pitchSeqObjs[qIdx][seqIdx].oct'>
              <option 
                v-for='oct in range(-2, 4, true)' 
                :value='oct'
                :key='oct'>
                {{ oct }}
              </option>
            </select>
          </div>
        </div>
        <div
          class='controlsRow'
          v-if='categories[qIdx].value.slice(0, 12) === "trajSequence"'
          >
          <label>Number of Trajectories: </label>
          <select
            name='numTrajs'
            v-model='numTrajs[qIdx]'
            @change='updateNumTrajs(qIdx)'
            >
            <option
              v-for='numT in range(2, 5, true)'
              :value='numT'
              :key='numT'
              >
              {{ numT }}
            </option>
          </select>
        </div>
        <div 
          class='controlsRow big'
          v-if='categories[qIdx].value.slice(0, 12) === "trajSequence"'
          >
          <label>Sequence: </label>
          <div class='seqCol'>
            <div 
              v-for='(_, seqIdx) in trajIdSeqs[qIdx].length'
              >
              <select
                v-model='trajIdSeqs[qIdx][seqIdx]'
                >
                <option
                  v-for='trajName in trajNames'
                  :value='trajName.value'
                  :key='trajName.value'
                  >
                  {{ trajName.name }}
                </option>
              </select>
            </div>
          </div>
        </div>
        <div 
          class='controlsRow' 
          v-if='categories[qIdx].value === "trajectoryID"'
          >
          <label>Trajectory: </label>
          <select 
            name='trajectory' v-model='trajectoryIDs[qIdx]'
            >
            <option 
              v-for='(trajName) in trajNames' 
              :value='trajName.value'
              :key='trajName.value'
              >
              {{ trajName.name }}
            </option>
          </select>

        </div>
        <div class='controlsRow' v-if='categories[qIdx].value === "vowel"'>
          <label>Vowel: </label>
          <select 
            name='vowel' 
            v-model='vowels[qIdx]'
            >
            <option 
              v-for='vowel in possibleVowels' 
              :value='vowel'
              >
              {{ vowel }}
            </option>
          </select>
        </div>
        <div class='controlsRow' v-if='isConsonantCategory[qIdx]'>
          <label>Consonant: </label>
          <select 
            name='consonant' 
            v-model='consonants[qIdx]'
            >
            <option 
              v-for='consonant in possibleConsonants' 
              :value='consonant'
              >
              {{ consonant }}
            </option>
          </select>
        </div>
        <div 
          class='controlsRow' 
          v-if='categories[qIdx].value === "sectionTopLevel"'
          >
          <label>Section Type: </label>
          <select 
            name='sectionTopLevel' 
            v-model='sectionTopLevels[qIdx]'
            >
            <option 
              v-for='topLevel in topLevelOptions' 
              :value='topLevel'
              >
              {{ topLevel }}
            </option>
          </select>
        </div>
        <div 
          class='controlsRow' 
          v-if='categories[qIdx].value === "alapSection"'
          >
          <label>Alap Section: </label>
          <select 
            name='alapSection' 
            v-model='alapSections[qIdx]'
            >
            <option 
              v-for='alapSection in alapSectionOptions' 
              :value='alapSection'
              >
              {{ alapSection }}
            </option>
          </select>
        </div>
        <div 
          class='controlsRow' 
          v-if='categories[qIdx].value === "compType"'
          >
          <label>Composition Type: </label>
          <select 
            name='compType' 
            v-model='compTypes[qIdx]'
            >
            <option 
              v-for='compType in compTypeOptions' 
              :value='compType'
              >
              {{ compType }}
            </option>
          </select>
        </div>
        <div 
          class='controlsRow' 
          v-if='categories[qIdx].value === "compSecTempo"'
          >
          <label>Composition-section/Tempo: </label>
          <select 
            name='compSecTempo' 
            v-model='compSecTempos[qIdx]'
            >
            <option 
              v-for='compSecTempo in compSecTempoOptions' 
              :value='compSecTempo'
              >
              {{ compSecTempo }}
            </option>
          </select>
        </div>
        <div 
          class='controlsRow' 
          v-if='categories[qIdx].value === "tala"'
          >
          <label>Tala: </label>
          <select 
            name='tala' 
            v-model='talas[qIdx]'
            >
            <option 
              v-for='tala in talaOptions' 
              :value='tala'
              >
              {{ tala }}
            </option>
          </select>
        </div>
        <div class='controlsRow'>
          <label>Designator: </label>
          <select name='designator' v-model='designators[qIdx].value'>
            <option 
              v-for='designator in possibleDesignators(categories[qIdx].value)' 
              :value='designator.value'
              >
              {{ designator.text }}
            </option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang='ts'>
import phonemes from '@/assets/json/phonemes.json';
import { defineComponent, PropType } from 'vue';
import { 
  SegmentationType, 
  QueryType, 
  CategoryType,
  DesignatorType,
  MultipleOptionType,
} from '@/js/query.ts';
import {
  Pitch,
  Raga,
  Trajectory,
  SectionCategorizationType
} from '@/js/classes.ts';

type QueryControlsDataType = {
  segmentation: SegmentationType,
  numQueries: number,
  categories: { value: CategoryType, text: string }[],
  designators: { value: DesignatorType, text: string }[],
  trajectoryIDs: number[],
  trajectoryNames: string[],
  vowels: string[],
  consonants: string[],
  possibleSegmentations: { value: SegmentationType, text: string }[],
  all: boolean,
  sequenceLength: number,
  minDur: number,
  maxDur: number,
  pitchNames: PitchNameType[],
  octs: number[],
  Trajectory: typeof Trajectory,
  possibleVowels: string[],
  possibleConsonants: string[],
  numPitches: number[],
  numTrajs: number[],
  pitchSeqObjs: PitchSeqObjType[][],
  trajIdSeqs: number[][],
  sectionTopLevels: SectionCategorizationType["Top Level"][],
  alapSections: (keyof SectionCategorizationType["Alap"])[],
  topLevelOptions: SectionCategorizationType["Top Level"][],
  alapSectionOptions: (keyof SectionCategorizationType["Alap"])[],
  compTypeOptions: (keyof SectionCategorizationType["Composition Type"])[],
  compSecTempoOptions: (keyof SectionCategorizationType["Composition-section/Tempo"])[],
  talaOptions: (keyof SectionCategorizationType["Tala"])[],
  talas: (keyof SectionCategorizationType["Tala"])[],
  compTypes: (keyof SectionCategorizationType["Composition Type"])[],
  compSecTempos: (keyof SectionCategorizationType["Composition-section/Tempo"])[],

}
type PitchNameType = 'Sa' | 're' | 'Re' | 'ga' | 'Ga' | 'ma' | 'Ma' | 'Pa' | 'dha' | 
  'Dha' | 'ni' | 'Ni';
type ParamType = (
  number | 
  { value: (CategoryType | DesignatorType), text: string } | 
  PitchNameType |
  string |
  PitchSeqObjType[] | 
  PitchSeqObjType |
  number[]
  );

type PitchSeqObjType = {
  swara: PitchNameType,
  oct: number,
}

export default defineComponent({
  name: 'QueryControls',
  data(): QueryControlsDataType {
    return {
      segmentation: 'phrase',
      numQueries: 1,
      categories: [{ value: 'pitch', text: 'Pitch' }],
      designators: [{ value: 'includes', text: 'Includes' }],
      pitchNames: ['Sa'],
      octs: [0],
      trajectoryIDs: [0],
      vowels: ['a'],
      consonants: ['ra'],
      possibleSegmentations: [
        { value: 'phrase', text: 'Phrase' },
        { value: 'group', text: 'Group' },
        { value: 'sequenceOfTrajectories', text: 'Trajectory Sequence' },
        { 
          value: 'connectedSequenceOfTrajectories', 
          text: 'Connected Trajectories' 
        },
      ],
      all: true,
      sequenceLength: 20,
      minDur: 0,
      maxDur: 60,
      trajectoryNames: ['Fixed'],
      Trajectory: Trajectory,
      possibleVowels: phonemes.filter(p => {
        return p.type === 'vowel'
      }).map(p => p.eng_trans),
      possibleConsonants: phonemes.filter(p => {
        return p.type === 'consonant'
      }).map(p => p.iso_15919),
      numPitches: [2],
      numTrajs: [2],
      pitchSeqObjs: [[{ swara: 'Sa', oct: 0 }, { swara: 'Sa', oct: 0 }]],
      trajIdSeqs: [[0, 0]],
      sectionTopLevels: ["None"],
      alapSections: ["Alap"],
      compTypes: ["Dhrupad"],
      compSecTempos: ["Vilambit"],
      talas: ["Tintal"],
      topLevelOptions: [
        'Pre-Chiz Alap',
        'Alap',
        'Composition',
        'Improvisation',
        'Other',
        'None'
      ],
      alapSectionOptions: [
        'Alap',
        'Jor',
        'Alap-Jhala',
      ],
      compTypeOptions: [
        'Dhrupad',
        'Bandish',
        'Thumri',
        'Ghazal', 
        'Qawwali',
        'Dhun',
        'Tappa',
        'Bhajan',
        'Kirtan',
        'Kriti',
        'Masitkhani Gat',
        'Razakhani Gat',
        'Ferozkhani Gat',
      ],
      compSecTempoOptions: [
        'Ati Vilambit',
        'Vilambit',
        'Madhya',
        'Drut',
        'Ati Drut',
        'Jhala',
      ],
      talaOptions: [
        'Ektal',
        'Tintal',
        'Rupak'
      ]
    }
  },

  props: {
    vocal: {
      type: Boolean,
      required: true,
    },

    raga: {
      type: Object as PropType<Raga>,
      required: true,
    },

    trajIdxs: {
      type: Array as PropType<number[]>,
      required: true,
    }
    
  },

  watch: {
    numQueries(newVal, oldVal) {
      console.log('numQueries changed from', oldVal, 'to', newVal);
      const params: { param: ParamType[], init: ParamType }[]  = [
        { param: this.categories, init: { value: 'pitch', text: 'Pitch' } },
        { param: this.pitchNames, init: 'Sa' },
        { param: this.octs, init: 0 },
        { param: this.designators, init: { value: 'includes', text: 'Includes' } },
        { param: this.trajectoryNames, init: 'Fixed' },
        { param: this.trajectoryIDs, init: 0 },
        { param: this.numPitches, init: 2 },
        { param: this.pitchSeqObjs, init: [{ swara: 'Sa', oct: 0 }, { swara: 'Sa', oct: 0 }] },
        { param: this.trajIdSeqs, init: [0, 0] },
        { param: this.vowels, init: 'a' },
        { param: this.consonants, init: 'ra' },
        { param: this.sectionTopLevels, init: "None" },
        { param: this.alapSections, init: "Alap" },
        { param: this.compTypes, init: "Dhrupad" },
        { param: this.compSecTempos, init: "Vilambit" },
        { param: this.talas, init: "Tintal" },
      ]
      if (newVal > oldVal) {
        params.forEach(p => {
          this.growParam(p.param, p.init, newVal, oldVal);
        })
      } else {
        params.forEach(p => {
          p.param.splice(newVal, oldVal - newVal);
        })
      }
    }
  },

  computed: {

    trajNames() {
      return this.trajIdxs.map(ti => {
        return { name: Trajectory.names()[ti], value: ti }
      })
    },

    reversedSargamNames() {
      return this.raga.sargamNames.slice().reverse()
    },

    isConsonantCategory() {
      return this.categories.map(cat => {
        return cat.value === 'startingConsonant' || 
          cat.value === 'endingConsonant' || 
          cat.value === 'anyConsonant'
      })
    },

    queries(): QueryType[] {
      return this.categories.map((category, i) => {
        let query: QueryType = {
          category: category.value,
          designator: this.designators[i].value,
        }
        if (
          category.value === 'startingConsonant' || 
          category.value === 'endingConsonant' || 
          category.value === 'anyConsonant'
          ) {
          query.consonant = this.consonants[i]
        } else if (category.value === 'trajectoryID') {
          query.trajectoryID = this.trajectoryIDs[i]
        } else if (category.value === 'pitch') {
          query.pitch = this.pitches[i]
        } else if (category.value === 'vowel') {
          query.vowel = this.vowels[i]
        } else if (category.value.slice(0, 13) === 'pitchSequence') {
          query.pitchSequence = this.pitchSeqObjs[i].map(p => {
            return new Pitch({ swara: p.swara, oct: p.oct })
          })
        } else if (category.value.slice(0, 12) === 'trajSequence') {
          console.log('this')
          query.trajIdSequence = this.trajIdSeqs[i]
        } else if (category.value === 'sectionTopLevel') {
          query.sectionTopLevel = this.sectionTopLevels[i]
        } else if (category.value === 'alapSection') {
          query.alapSection = this.alapSections[i]
        } else if (category.value === 'compType') {
          query.compType = this.compTypes[i]
        } else if (category.value === 'compSecTempo') {
          query.compSecTempo = this.compSecTempos[i]
        } else if (category.value === 'tala') {
          query.tala = this.talas[i]
        }
        return query
      })
    },

    options(): MultipleOptionType {
      return {
        segmentation: this.segmentation,
        sequenceLength: this.sequenceLength,
        minDur: this.minDur,
        maxDur: this.maxDur,
        every: this.all,
      }
    },


    possibleCategories(): { value: CategoryType, text: string }[] {
      const cats: { value: CategoryType, text: string }[] = [
        { value: 'pitch', text: 'Pitch' },
        { value: 'pitchSequenceStrict', text: 'Strict Pitch Sequence'},
        { value: 'pitchSequenceLoose', text: 'Loose Pitch Sequence' },
        { value: 'trajectoryID', text: 'Trajectory' },
        { value: 'trajSequenceStrict', text: 'Strict Trajectory Sequence' },
        { value: 'trajSequenceLoose', text: 'Loose Traj Sequence' },
        
      ];
      if (this.segmentation !== 'sequenceOfTrajectories') {
        cats.push(
          { value: 'sectionTopLevel', text: 'Section Type' },
          { value: 'alapSection', text: 'Alap Section' },
          { value: 'compType', text: 'Composition Type' },
          { value: 'compSecTempo', text: 'Composition-section/Tempo' },
          { value: 'tala', text: 'Tala' }
        )
      }
      if (this.vocal) {
        cats.push(
          { value: 'vowel', text: 'Vowel' },
          { value: 'startingConsonant', text: 'Starting Consonant' },
          { value: 'endingConsonant', text: 'Ending Consonant' },
          { value: 'anyConsonant', text: 'Any Consonant' },
        )
      }
      return cats;
    },

    pitches(): Pitch[] {
      return this.pitchNames.map((pitchName, i) => {
        return new Pitch({swara: pitchName, oct: this.octs[i]})
      })
    }
  },

  methods: {

    possibleDesignators(category: CategoryType) {
      const out: { value: DesignatorType, text: string }[] = [
        { value: 'includes', text: 'Includes' },
        { value: 'excludes', text: 'Excludes' },
      ];
      if (category !== 'sectionTopLevel') {
        out.push(
          { value: 'startsWith', text: 'Starts With' },
          { value: 'endsWith', text: 'Ends With' }
        )
      }
      return out;
    },

    updateNumPitches(qIdx: number) {
      const n = this.numPitches[qIdx];
      const oldLen = this.pitchSeqObjs[qIdx].length;
      if (n > oldLen) {
        this.growParam(this.pitchSeqObjs[qIdx], { swara: 'Sa', oct: 0 }, n, oldLen);
      } else {
        this.pitchSeqObjs[qIdx].splice(n, oldLen - n);
      }
    },

    updateNumTrajs(qIdx: number) {
      const n = this.numTrajs[qIdx];
      const oldLen = this.trajIdSeqs[qIdx].length;
      if (n > oldLen) {
        this.growParam(this.trajIdSeqs[qIdx], 0, n, oldLen);
      } else {
        this.trajIdSeqs[qIdx].splice(n, oldLen - n);
      }
    },

    growParam(param: ParamType[], preset: ParamType, newVal: number, oldVal: number) {
      let add = [];
      if (preset instanceof Object) {
        add = Array.from({ length: newVal - oldVal }, () => ({ ...preset }));
      } else {
        add = Array(newVal - oldVal).fill(preset);
      }
      param.splice(oldVal, 0, ...add);
    },

    runQuery() {
      this.$emit('runQuery', this.queries, this.options)
    },

    range(start: number, end: number, reverse: boolean = false) {
      let out = Array(end - start).fill(0).map((_, idx) => start + idx);
      if (reverse) {
        out.reverse();
      }
      return out;
    },

    preventDecimal(event: KeyboardEvent) {
      if (event.key === '.') {
        event.preventDefault();
      }
    },

    updateTrajectoryID(tIdx: number) {
      const nIdx = Trajectory.names().indexOf(this.trajectoryNames[tIdx]);
      this.trajectoryIDs[tIdx] = nIdx;
    }
  }
})


</script>
<style scoped>

.controlsOuter {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.controlsBox {
  width: 350px;
  min-width: 350px;
  height: 100%;
  /* background-color: green; */
  box-sizing: border-box;
  border-right: 1px solid white;
  display: flex;
  flex-direction: column;
}

.primary {
  width: 300px;
  min-width: 300px
}

.controlsRow {
  width: 100%;
  height: 40px;
  min-height: 30px;
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
}

.controlsRow.big {
  height: 100px;
  min-height: 40px;
  /* min-height: 100px; */
}

.controlsRow.title {
  justify-content: center
}

.controlsRow > button {
  margin-left: 10px;
}

.controlsRow.dur > input {
  width: 40px;
  min-width: 40px;
  outline: none;
  user-select: none;
}

.everySome {
  margin-right: 2px;
}

select {
  color: white;
  background-color: black;
  outline: none
}

.numQueries {
  width: 40px;
  min-width: 40px;
  outline: none;
  user-select: none;
}

label {
  margin-right: 10px;
  margin-left: 10px;
}

.queriesContainer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  overflow: auto;
  /* background-color: red; */
}

.pitchOct {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 50px;
  max-width: 50px;
}

.pitchOct > select {
  width: 40px;
  min-width: 40px;
  outline: none;
  user-select: none;
}

.seqCol {
  display: flex;
  flex-direction: column;
}
</style>