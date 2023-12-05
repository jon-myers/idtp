<template>
  <div class='mainCollection'>
    <div class='titleRow'>
      <div class='titleContainer'>
        <h2>{{ collection.title }}</h2>
      </div>
      <div class='button'>
        <button @click='closeCollection'>Close</button>
        <button v-if='owner' @click='editCollection'>Edit</button>
      </div>
    </div>
    <div class='descriptionRow'>
     <div class='descriptionContainer'>{{ collection.description }}</div>
    </div>
    <GenericAudioPlayer 
      :audioSource='audioSource'
      />
  </div>
</template>

<script lang='ts'>
import { defineComponent, PropType } from 'vue';
import type { CollectionType } from '@/ts/types.ts';
import { getContrastingTextColor } from '@/ts/utils';
import GenericAudioPlayer from '@/components/GenericAudioPlayer.vue';
import { getEditableCollections } from '@/js/serverCalls';
type CollectionViewerDataType = {
  audioSource: string | undefined
}
export default defineComponent({
  name: 'CollectionViewer',
  data() {
    return {
      audioSource: undefined
    }
  },
  components: {
    GenericAudioPlayer
  },
  props: {
    collection: {
      type: Object as PropType<CollectionType>,
      required: true
    },
    owner: {
      type: Boolean,
      required: true
    }
  },
  computed: {
    color() {
      return this.collection.color;
    },

    textColor() {
      return getContrastingTextColor(this.collection.color!);
    }
  },

  methods: {

    getEditableCollections,
    
    closeCollection($event: MouseEvent) {
      this.$emit('closeCollection');
    },

    editCollection($event: MouseEvent) {
      this.$emit('editCollection');
    }
  }
})
</script>
<style scoped>

.mainCollection {
  box-sizing: border-box;
  border-top: 1px solid #ccc;
  color: v-bind(textColor);
  background-color: v-bind(color);
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: center;
  width: 100%;
  height: 100%;
}

.titleRow {
  width: 100%;
  height: 80px;
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
}

.titleContainer {
  width: calc(100% - 80px);
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
}

h2 {
  margin-left: 20px;
  text-align: left;
}

.button {
  margin-right: 20px;
  width: 60px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: right;
}

.descriptionRow {
  width: 100%;
  height: 80px;
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
}

.descriptionContainer {
  width: calc(100% - 80px);
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  margin-left: 20px;
  text-align: left;
}
</style>