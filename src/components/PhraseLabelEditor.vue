<template>
  <div class='outerPhraseLabel'>
    <div class='topRow'>
      {{`Phrase ${phraseNum}`  }}
    </div>
    <div class='bottomContainer'>
      <div class='checkColumn'>
        <div class='titleRow'>
          <label>Phrase Type</label>
        </div>
        <div class='checkRow' v-for='phraseType in phraseTypes'>
          <input 
            type='checkbox' 
            :id='phraseType' 
            :name='phraseType' 
            :value='phraseType'
            v-model='phrase.categorizationGrid[0].Phrase[phraseType]'
            @change='$emit("unsavedChanges")'
            :disabled='!editable'
            >
          <label :for='phraseType'>{{phraseType}}</label>
        </div>
      </div>
      <div class='checkColumn'>
        <div class='titleRow'>
          <label>Elaboration Type</label>
        </div>
        <div class='checkRow' v-for='elaborationType in elaborationTypes'>
          <input 
            type='checkbox' 
            :id='elaborationType' 
            :name='elaborationType' 
            :value='elaborationType'
            v-model='phrase.categorizationGrid[0].Elaboration[elaborationType]'
            @change='$emit("unsavedChanges")'
            :disabled='!editable'
            >
          <label :for='elaborationType'>{{elaborationType}}</label>
        </div>
      </div>
      <div class='checkColumn' v-if='vocal'>
        <div class='titleRow'>
          <label>Articulation Type</label>
        </div>
        <div 
          class='checkRow'
          v-for='vArtType in vocalArtTypes'
          >
          <input 
            type='checkbox' 
            :id='vArtType' 
            :name='vArtType' 
            :value='vArtType'
            v-model='phrase.categorizationGrid[0]["Vocal Articulation"][vArtType]'
            @change='$emit("unsavedChanges")'
            :disabled='!editable'
            >
          <label :for='vArtType'>{{vArtType}}</label>
        </div>
      </div>
      <div class='checkColumn' v-else>
        <div class='titleRow'>
          <label>Articulation Type</label>
        </div>
        <div 
          class='checkRow'
          v-for='iArtType in instrumentalArtTypes'
          >
          <input 
            type='checkbox' 
            :id='iArtType' 
            :name='iArtType' 
            :value='iArtType'
            v-model='phrase.categorizationGrid[0]["Instrumental Articulation"][iArtType]'
            @change='$emit("unsavedChanges")'
            :disabled='!editable'
            
            >
          <label :for='iArtType'>{{iArtType}}</label>
        </div>
      </div>
      <div class='checkColumn'>
        <div class='titleRow'>
          <label>Incidental</label>
        </div>
        <div class='checkRow' v-for='incidentalType in incidentalTypes'>
          <input 
            type='checkbox' 
            :id='incidentalType' 
            :name='incidentalType' 
            :value='incidentalType'
            v-model='phrase.categorizationGrid[0].Incidental[incidentalType]'
            @change='$emit("unsavedChanges")'
            :disabled='!editable'
            >
          <label :for='incidentalType'>{{incidentalType}}</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang='ts'>

import { defineComponent, PropType } from 'vue';
import { Piece, Phrase, PhraseCategorizationType } from '@/js/classes.ts';

import categoryData from '@/assets/json/categorization.json';
const phraseData = categoryData['Phrase'];
const articulationTypes = phraseData['Articulation Type'];

type PhraseLabelEditorDataType = {
  phraseTypes: PPhraseType[],
  elaborationTypes: PElaborationType[],
  vocalArtTypes: PVArtType[],
  instrumentalArtTypes: PIArtType[],
  incidentalTypes: PIncidentalType[],
  phrase: Phrase
}

type PPhraseType = keyof PhraseCategorizationType['Phrase'];
type PElaborationType = keyof PhraseCategorizationType['Elaboration'];
type PVArtType = keyof PhraseCategorizationType['Vocal Articulation'];
type PIArtType = keyof PhraseCategorizationType['Instrumental Articulation'];
type PIncidentalType = keyof PhraseCategorizationType['Incidental'];



export default defineComponent({
  name: 'PhraseLabelEditor',
  data(): PhraseLabelEditorDataType {
    return {
      phraseTypes: phraseData['Phrase Type'] as PPhraseType[],
      elaborationTypes: phraseData['Elaboration Type'] as PElaborationType[],
      vocalArtTypes: articulationTypes['Vocal'] as PVArtType[],
      instrumentalArtTypes: articulationTypes['Instrumental'] as PIArtType[],
      incidentalTypes: phraseData['Incidental'] as PIncidentalType[],
      phrase: this.piece.phrases[this.phraseNum]
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
    }
  },
  methods: {
    // updatePhraseType(e: Event) {
    //   const target = e.target as HTMLInputElement;
    //   const phraseType = target.value;
    //   const phrase = this.piece.phrases[this.phraseNum];
    //   if (target.checked) {
    //     phrase.categorizationGrid[0].Phrase[phraseType] = true;
    //   } else {
    //     phrase.categorizationGrid[0].Phrase[phraseType] = false;
    //   }
    // }
  }
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
