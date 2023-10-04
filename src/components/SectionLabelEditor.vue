<template>
  <div class='outerSecLabel'>
    <div class='topRow'>
      <label>
      {{`Section ${sectionNum}`  }}
      </label>
    </div>
    <div class='middleRow'>
      <select v-model='topLevel' @change='updateTopLevel'>
        <option v-for='option in topLevelOptions' :value='option'>
          {{option}}
        </option>
      </select>
    </div>
    <div class='bottomContainer'>
      <div class='checkColumn' v-if='topLevel === "Alap"'>
        <div class='titleRow'>
          <label>Alap Section</label>
        </div>
        <select v-model='alapType' @change='updateAlapType'>
          <option 
            v-for='option in Object.keys(section.categorization["Alap"])' 
            :value='option'
            >
            {{option}}
          </option>
        </select>
      </div>
      <div class='selectComposition' v-if='topLevel === "Composition"'>
        <div class='checkColumn'>
          <div class='titleRow'>
            <label>Composition Type</label>
          </div>
          <select v-model='compositionType' @change='updateCompositionType'>
            <option 
              v-for='option in Object.keys(section.categorization["Composition Type"])' 
              :value='option'
              >
              {{option}}
            </option>
          </select>
        </div>
        <div class='checkColumn'>
          <div class='titleRow'>
            <label>Section/Tempo</label>
          </div>
          <select v-model='section_tempo' @change='updateSection_Tempo'>
            <option 
              v-for='option in Object.keys(section.categorization["Composition-section/Tempo"])' 
              :value='option'
              >
              {{option}}
            </option>
          </select>
        </div>
        <div class='checkColumn'>
          <div class='titleRow'>
            <label>Tala</label>
          </div>
          <select v-model='tala' @change='updateTala'>
            <option 
              v-for='option in Object.keys(section.categorization["Tala"])' 
              :value='option'
              >
              {{option}}
            </option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang='ts'>

import { defineComponent, PropType } from 'vue';
import { Piece, initSectionCategorization, Section } from '@/js/classes.ts';
type topLevelOptionsType = (
  'Pre-Chiz Alap' | 
  'Alap' | 
  'Composition' | 
  'None' |
  'Improvisation' |
  'Other'
  );

type Section_TempoType = keyof Section['categorization']['Composition-section/Tempo'];
type CompositionType = keyof Section['categorization']['Composition Type'];
type TalaType = keyof Section['categorization']['Tala'];
type AlapType = keyof Section['categorization']['Alap'];

type SectionLabelEditorType = {
  topLevelOptions: topLevelOptionsType[],
  topLevel: topLevelOptionsType,
  compositionType?: CompositionType,
  section_tempo?: Section_TempoType,
  tala?: TalaType,
  alapType?: AlapType
}

export default defineComponent({
  name: 'SectionLabelEditor',
  data(): SectionLabelEditorType {
    return {
      topLevelOptions: [
        'Pre-Chiz Alap',
        'Alap',
        'Composition',
        'Improvisation',
        'Other',
        'None'
      ],
      topLevel: 'None',
      compositionType: undefined,
      section_tempo: undefined,
      tala: undefined,
      alapType: undefined
    }
  },
  props: {
    sectionNum: {
      type: Number,
      required: true
    },
    piece: {
      type: Object as PropType<Piece>,
      required: true
    },
    section: {
      type: Object as PropType<Section>,
      required: true
    }
  },
  mounted() {
    const cat = this.section.categorization;
    const com = cat['Composition Type'];
    const comSecTemp = cat['Composition-section/Tempo'];
    const tala = cat['Tala'];
    const improv = cat['Improvisation'];
    const other = cat['Other'];
    const someTrue = (obj: object) => Object.values(obj).some(x => x);
    if (cat['Pre-Chiz Alap']['Pre-Chiz Alap']) {
      this.topLevel = 'Pre-Chiz Alap'
    } else if (someTrue(cat['Alap'])) {
      this.topLevel = 'Alap';
      const keys = Object.keys(cat['Alap']) as AlapType[];
      this.alapType = keys.find(key => cat['Alap'][key]);
    } else if (someTrue(com) || someTrue(comSecTemp) || someTrue(tala)) {
      this.topLevel = 'Composition';
      const comKeys = Object.keys(com) as CompositionType[];
      this.compositionType = comKeys.find(key => com[key]);
      const comSecTempKeys = Object.keys(comSecTemp) as Section_TempoType[];
      this.section_tempo = comSecTempKeys.find(key => comSecTemp[key]);
      const talaKeys = Object.keys(tala) as TalaType[];
      this.tala = talaKeys.find(key => tala[key]);
    } else if (improv['Improvisation']) {
      this.topLevel = 'Improvisation'
    } else if (other['Other']) {
      this.topLevel = 'Other'
    } else {
      this.topLevel = 'None'
    }
  },


  methods: {

    
    updateTopLevel() {
      this.compositionType = undefined,
      this.section_tempo = undefined,
      this.section.categorization = initSectionCategorization();
      this.piece.sectionCategorization[this.sectionNum] = initSectionCategorization();

      if (this.topLevel === 'Pre-Chiz Alap') {
        const cat = this.section.categorization;
        const altCat = this.piece.sectionCategorization[this.sectionNum];
        cat['Pre-Chiz Alap']['Pre-Chiz Alap'] = true;
        altCat['Pre-Chiz Alap']['Pre-Chiz Alap'] = true;
      } else if (this.topLevel === 'Improvisation') {
        const cat = this.section.categorization;
        const altCat = this.piece.sectionCategorization[this.sectionNum];
        cat['Improvisation']['Improvisation'] = true;
        altCat['Improvisation']['Improvisation'] = true;
      } else if (this.topLevel === 'Other') {
        const cat = this.section.categorization;
        const altCat = this.piece.sectionCategorization[this.sectionNum];
        cat['Other']['Other'] = true;
        altCat['Other']['Other'] = true;
      }
      this.$emit('unsavedChanges');
    },
    updateCompositionType() {
      if (this.compositionType) {
        const cat = this.section.categorization;
        const altCat = this.piece.sectionCategorization[this.sectionNum];
        const allKeys = Object.keys(cat['Composition Type']) as CompositionType[];
        allKeys.forEach(key => cat['Composition Type'][key] = false);
        cat['Composition Type'][this.compositionType] = true;
        altCat['Composition Type'][this.compositionType] = true;
      }
      this.$emit('unsavedChanges');
    },
    updateSection_Tempo() {
      if (this.section_tempo) {
        const cat = this.section.categorization;
        const altCat = this.piece.sectionCategorization[this.sectionNum];
        const allKeys = Object.keys(cat['Composition-section/Tempo']) as Section_TempoType[];
        allKeys.forEach(key => cat['Composition-section/Tempo'][key] = false);
        cat['Composition-section/Tempo'][this.section_tempo] = true;
        altCat['Composition-section/Tempo'][this.section_tempo] = true;
      }
      this.$emit('unsavedChanges');
    },
    updateTala() {
      if (this.tala) {
        const cat = this.section.categorization;
        const altCat = this.piece.sectionCategorization[this.sectionNum];
        const allKeys = Object.keys(cat['Tala']) as TalaType[];
        allKeys.forEach(key => cat['Tala'][key] = false);
        cat['Tala'][this.tala] = true;
        altCat['Tala'][this.tala] = true;
      }
      this.$emit('unsavedChanges');
    },
    updateAlapType() {
      if (this.alapType) {
        const cat = this.section.categorization;
        const altCat = this.piece.sectionCategorization[this.sectionNum];
        const allKeys = Object.keys(cat['Alap']) as AlapType[];
        allKeys.forEach(key => cat['Alap'][key] = false);
        cat['Alap'][this.alapType] = true;
        altCat['Alap'][this.alapType] = true;
      }
      this.$emit('unsavedChanges');
    }
  }
})
</script>

<style scoped>

.outerSecLabel {
  background-color: #202621;
  box-sizing: border-box;
  width: 420px;
  min-width: 420px;
  border: 1px solid black;
  border-left: none;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
  
}

.topRow {
  width: 100%;
  height: 40px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size:18px;
}

.topRow > select {
  margin-left: 10px;
}

.bottomContainer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  overflow-y: auto;
  margin-bottom: 10px;
  scrollbar-width: none;
}

.checkColumn {
  width: 150px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
}

.checkRow {
  width: 100%;
  height: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.checkRow > label {
  margin-left: 5px;
}

select {
  width: 120px;

  outline: none
}

.selectAlap {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
  /* padding-top: 10px; */
}

.selectAlap > select {
  margin-top: 5px;
}

.titleRow {
  width: 100%;
  min-height: 30px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.selectComposition {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
</style>
