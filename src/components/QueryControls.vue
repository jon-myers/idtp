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
          v-if='categories[qIdx].value === "trajectoryID"'
          >
          <label>Trajectory: </label>
          <select 
            name='trajectory' v-model='trajectoryIDs[qIdx]'
            >
            <option 
              v-for='(trajName, trajID) in Trajectory.names()' 
              :value='trajID'
              >
              {{ trajName }}
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
        <div class='controlsRow'>
          <label>Designator: </label>
          <select name='designator' v-model='designators[qIdx].value'>
            <option 
              v-for='designator in possibleDesignators' 
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
  Trajectory
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
  possibleDesignators: { value: DesignatorType, text: string }[],
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
  pitchSeqObjs: PitchSeqObjType[][],


}
type PitchNameType = 'Sa' | 're' | 'Re' | 'ga' | 'Ga' | 'ma' | 'Ma' | 'Pa' | 'dha' | 
  'Dha' | 'ni' | 'Ni';
type ParamType = (
  number | 
  { value: (CategoryType | DesignatorType), text: string } | 
  PitchNameType |
  string |
  PitchSeqObjType[] | 
  PitchSeqObjType
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
      // queries: [],
      categories: [{ value: 'pitch', text: 'Pitch' }],
      designators: [{ value: 'includes', text: 'Includes' }],
      pitchNames: ['Sa'],
      octs: [0],
      // pitches: [new Pitch()],
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
      possibleDesignators: [
        { value: 'includes', text: 'Includes' },
        { value: 'excludes', text: 'Excludes' },
        { value: 'startsWith', text: 'Starts With' },
        { value: 'endsWith', text: 'Ends With' }
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
      pitchSeqObjs: [[{ swara: 'Sa', oct: 0 }, { swara: 'Sa', oct: 0 }]]
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
    }
    
  },

  watch: {
    numQueries(newVal, oldVal) {
      console.log('numQueries changed from', oldVal, 'to', newVal)
      if (newVal > oldVal) {
        this.growParam(this.categories, { value: 'pitch', text: 'Pitch' }, newVal, oldVal);
        this.growParam(this.pitchNames, 'Sa', newVal, oldVal);
        this.growParam(this.octs, 0, newVal, oldVal);
        this.growParam(this.designators, { value: 'includes', text: 'Includes' }, newVal, oldVal);
        this.growParam(this.trajectoryNames, 'Fixed', newVal, oldVal);
        this.growParam(this.trajectoryIDs, 0, newVal, oldVal);
        this.growParam(this.numPitches, 2, newVal, oldVal);
        this.growParam(this.pitchSeqObjs, [{ swara: 'Sa', oct: 0 }, { swara: 'Sa', oct: 0 }], newVal, oldVal);
      } else {
        this.categories.splice(newVal, oldVal - newVal);
        this.pitchNames.splice(newVal, oldVal - newVal);
        this.octs.splice(newVal, oldVal - newVal);
        this.designators.splice(newVal, oldVal - newVal);
        this.trajectoryNames.splice(newVal, oldVal - newVal);
        this.trajectoryIDs.splice(newVal, oldVal - newVal);
        this.numPitches.splice(newVal, oldVal - newVal);
        this.pitchSeqObjs.splice(newVal, oldVal - newVal);
      }
    }
  },

  computed: {

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
      if (this.vocal) {
        return [
          { value: 'pitch', text: 'Pitch' },
          { value: 'pitchSequenceStrict', text: 'Strict Pitch Sequence' },
          { value: 'pitchSequenceLoose', text: 'Loose Pitch Sequence' },
          { value: 'trajectoryID', text: 'Trajectory' },
          { value: 'vowel', text: 'Vowel' },
          { value: 'startingConsonant', text: 'Starting Consonant' },
          { value: 'endingConsonant', text: 'Ending Consonant' },
          { value: 'anyConsonant', text: 'Any Consonant' },
        ]
      } else {
        return [
          { value: 'pitch', text: 'Pitch' },
          { value: 'pitchSequenceStrict', text: 'Strict Pitch Sequence'},
          { value: 'pitchSequenceLoose', text: 'Loose Pitch Sequence' },
          { value: 'trajectoryID', text: 'Trajectory' },
        ]
      }
    },

    pitches(): Pitch[] {
      return this.pitchNames.map((pitchName, i) => {
        return new Pitch({swara: pitchName, oct: this.octs[i]})
      })
    }
  },

  methods: {

    updateNumPitches(qIdx: number) {
      const n = this.numPitches[qIdx];
      const oldLen = this.pitchSeqObjs[qIdx].length;
      if (n > oldLen) {
        this.growParam(this.pitchSeqObjs[qIdx], { swara: 'Sa', oct: 0 }, n, oldLen);
      } else {
        this.pitchSeqObjs[qIdx].splice(n, oldLen - n);
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
</style>