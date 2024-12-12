<template>
  <div class='outerPhraseLabel'>
    <div class='topRow'>
      {{`Phrase ${phraseNum + 1}`  }}
    </div>
    <div class='bottomContainer'>
      <div class='checkColumn'>
        <div class='titleRow'>
          <label>Phrase Type</label>
        </div>
        <div class='checkRow' v-for='(phraseType, ptIdx) in phraseTypes'>
          <input 
            type='checkbox' 
            :id='phraseType + "p" + phraseNum + "idx" + ptIdx' 
            :name='phraseType' 
            :value='phraseType'
            v-model='phrase.categorizationGrid[0].Phrase[phraseType]'
            @change='$emit("unsavedChanges")'
            :disabled='!editable'
            >
          <label :for='phraseType + "p" + phraseNum + "idx" + ptIdx'>
            {{phraseType}}
          </label>
        </div>
      </div>
      <div class='checkColumn'>
        <div class='titleRow'>
          <label>Elaboration Type</label>
        </div>
        <div 
          class='checkRow' 
          v-for='(elaborationType, etIdx) in elaborationTypes'
          >
          <input 
            type='checkbox' 
            :id='elaborationType + "p" + phraseNum + "idx" + etIdx' 
            :name='elaborationType' 
            :value='elaborationType'
            v-model='phrase.categorizationGrid[0].Elaboration[elaborationType]'
            @change='$emit("unsavedChanges")'
            :disabled='!editable'
            >
          <label :for='elaborationType + "p" + phraseNum + "idx" + etIdx'>
            {{elaborationType}}
          </label>
        </div>
      </div>
      <div class='checkColumn' v-if='vocal'>
        <div class='titleRow'>
          <label>Articulation Type</label>
        </div>
        <div 
          class='checkRow'
          v-for='(vArt, vaIdx) in vocalArtTypes'
          >
          <input 
            type='checkbox' 
            :id='vArt + "p" + phraseNum + "idx" + vaIdx' 
            :name='vArt' 
            :value='vArt'
            v-model='phrase.categorizationGrid[0]["Vocal Articulation"][vArt]'
            @change='$emit("unsavedChanges")'
            :disabled='!editable'
            >
          <label :for='vArt + "p" + phraseNum + "idx" + vaIdx' >
            {{vArt}}
          </label>
        </div>
      </div>
      <div class='checkColumn' v-else>
        <div class='titleRow'>
          <label>Articulation Type</label>
        </div>
        <div 
          class='checkRow'
          v-for='(iArtType, iaIdx) in instrumentalArtTypes'
          >
          <input 
            type='checkbox' 
            :id='iArtType + "p" + phraseNum + "idx" + iaIdx' 
            :name='iArtType' 
            :value='iArtType'
            v-model='iArtModelPath[iArtType]'
            @change='$emit("unsavedChanges")'
            :disabled='!editable'
            
            >
          <label :for='iArtType + "p" + phraseNum + "idx" + iaIdx'>
            {{iArtType}}
          </label>
        </div>
      </div>
      <div class='checkColumn'>
        <div class='titleRow'>
          <label>Incidental</label>
        </div>
        <div class='checkRow' v-for='(incType, itIdx) in incidentalTypes'>
          <input 
            type='checkbox' 
            :id='incType + "p" + phraseNum + "idx" + itIdx' 
            :name='incType' 
            :value='incType'
            v-model='phrase.categorizationGrid[0].Incidental[incType]'
            @change='$emit("unsavedChanges")'
            :disabled='!editable'
            >
          <label :for='incType + "p" + phraseNum + "idx" + itIdx'>
            {{incType}}
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang='ts'>

import { defineComponent, PropType } from 'vue';
import { Piece, Phrase } from '@/js/classes.ts';
import { PhraseCatType } from '@/ts/types.ts';
import categoryData from '@/assets/json/categorization.json';
const phraseData = categoryData['Phrase'];
const articulationTypes = phraseData['Articulation Type'];

type PhraseLabelEditorDataType = {
  phraseTypes: PPhraseType[],
  elaborationTypes: PElaborationType[],
  vocalArtTypes: PVArtType[],
  instrumentalArtTypes: PIArtType[],
  incidentalTypes: PIncidentalType[],
  // phrase: Phrase
}

type PPhraseType = keyof PhraseCatType['Phrase'];
type PElaborationType = keyof PhraseCatType['Elaboration'];
type PVArtType = keyof PhraseCatType['Vocal Articulation'];
type PIArtType = keyof PhraseCatType['Instrumental Articulation'];
type PIncidentalType = keyof PhraseCatType['Incidental'];



export default defineComponent({
  name: 'PhraseLabelEditor',
  computed: {
    iArtModelPath() {
      const cat = this.phrase.categorizationGrid[0];
      return cat['Instrumental Articulation'];
    },
    phrase() {
      return this.piece.phraseGrid[this.editingInstIdx][this.phraseNum];
    }
  },
  data(): PhraseLabelEditorDataType {
    return {
      phraseTypes: phraseData['Phrase Type'] as PPhraseType[],
      elaborationTypes: phraseData['Elaboration Type'] as PElaborationType[],
      vocalArtTypes: articulationTypes['Vocal'] as PVArtType[],
      instrumentalArtTypes: articulationTypes['Instrumental'] as PIArtType[],
      incidentalTypes: phraseData['Incidental'] as PIncidentalType[],
      // phrase: this.piece.phrases[this.phraseNum]
    }
  },
  props: {
    phraseNum: {
      type: Number,
      required: true
    },
    vocal: {
      type: Boolean,
      required: true
    },
    piece: {
      type: Object as PropType<Piece>,
      required: true
    },
    editable: {
      type: Boolean,
      required: true
    },
    editingInstIdx: {
      type: Number,
      required: true
    }
  },
})
</script>

<style scoped>

.outerPhraseLabel {
  background-color: #202621;
  box-sizing: border-box;
  width: 650px;
  min-width: 650px;
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

.titleRow {
  width: 100%;
  min-height: 30px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  font-weight: bold;
}

.titleRow > label {
  margin-left: 5px;
}
</style>
