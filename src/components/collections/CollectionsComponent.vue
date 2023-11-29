<template>
  <div class='collectionsMain'>
  </div>
  <NewCollectionModal v-if='newCollectionModalOpen'/>
</template>

<script lang='ts'>

import { CollectionType } from '@/ts/types.ts';
import { createCollection } from '@/js/serverCalls.ts';
import NewCollectionModal from '@/components/collections/NewCollectionModal.vue';

import { defineComponent } from 'vue';

type CollectionsComponentDataType = {
  newCollectionModalOpen: boolean
}

export default defineComponent({
  data(): CollectionsComponentDataType {
    return {
      newCollectionModalOpen: true
      
    };
  },

  components: {
    NewCollectionModal
  },

  methods: {

    async addTestCollection() {
      const collection: CollectionType = {
        title: 'Test Collection',
        userID: this.$store.state.userID!, 
        description: 'This is a test collection',
        permissions: {
          view: [],
          edit: [],
          publicView: false
        },
        purpose: 'research',
        audioRecordings: [],
        audioEvents: [],
        transcriptions: [],
      };
      const response = await createCollection(collection);
      console.log(response);

      
    }
    
  }
});
</script>

<style scoped>

</style>
