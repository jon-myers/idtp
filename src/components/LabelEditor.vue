<template>
  <div class='outerBox'>
    <div class='hierarchyPicker'>
      <label>
        <input type='radio' value='Section' v-model='selectedHierarchy'/>
        Section
      </label>
      <label>
        <input type='radio' value='Phrase' v-model='selectedHierarchy'/>
        Phrase
      </label>
    </div>
    <div class='sectionLabelHolder' v-show='selectedHierarchy === "Section"'>
      <SectionLabelEditor 
      v-for='(section, i) in piece.sections'
      :sectionNum='i'
      :piece='piece'
      @unsavedChanges='$emit("unsavedChanges")'
      :section='section'
      />
    </div>
    <div 
      class='phraseLabelHolder' 
      v-show='selectedHierarchy === "Phrase"'
      ref='phraseLabelHolder'
      >
      <PhraseLabelEditor 
      v-for='(phrase, i) in piece.phrases'
      @dblclick='goToPhrase($event, i)'
      :phraseNum='i'
      :vocal='vocal'
      :piece='piece'
      :editable='editable'
      @unsavedChanges='$emit("unsavedChanges")'
      ref='phraseLabelEditors'
      />
    </div>
    

  </div>
</template>

<script lang='ts'>

import { defineComponent, PropType } from 'vue';
import SectionLabelEditor from '@/components/SectionLabelEditor.vue';
import PhraseLabelEditor from '@/components/PhraseLabelEditor.vue';
import { Piece } from '@/js/classes.ts'

export default defineComponent({
  name: 'LabelEditor',
  data() {
    return {
      selectedHierarchy: 'Section'
    }
  },
  props: {
    height: {
      type: Number,
      required: true
    },
    playerHeight: {
      type: Number,
      required: true
    },
    editable: {
      type: Boolean,
      required: true
    }, 
    piece: {
      type: Object as PropType<Piece>,
      required: true
    },
    vocal: {
      type: Boolean,
      required: true
    }
  },
  components: {
    SectionLabelEditor,
    PhraseLabelEditor
  },
  mounted() {
    console.log('now')
  },
  methods: {
    goToPhrase(e: MouseEvent, pIdx: number) {
      this.$emit('goToPhraseEmit', pIdx);
    },

    scrollToPhrase(pIdx: number) {
      this.selectedHierarchy = 'Phrase';
      const pLabelEditors = this.$refs.phraseLabelEditors as typeof PhraseLabelEditor[];
      const pLabelEditor = pLabelEditors[pIdx];
      const container = this.$refs.phraseLabelHolder as HTMLElement;
      console.log(pLabelEditor.$el.offsetLeft)
      container.scrollTo({
        left: pLabelEditor.$el.offsetLeft,
        // behavior: 'smooth'
      })

    }
  }
});

</script>


<style scoped>

.outerBox {
  background-color: #202621;
  height: v-bind(height + 'px');
  position: absolute;
  right: 0px;
  bottom: v-bind(playerHeight + 'px');
  color: white;
  z-index: -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
}

.hierarchyPicker {
  width: 100%;
  height: 40px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.hierarchyPicker > label {
  margin-left: 10px;
  margin-right: 10px;
}

.sectionLabelHolder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  overflow-x: scroll;
  box-sizing: border-box;
}

.phraseLabelHolder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  overflow-x: scroll;
  box-sizing: border-box;
}

</style>
