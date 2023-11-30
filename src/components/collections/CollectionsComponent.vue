<template>
  <div class='collectionsMain'>
    <div 
      class='collectionRow'
      v-for='(collector, index) in collectors' 
      :key='index'
      >
      <div class='userName'>{{ collector.userName }}</div>
      <div class='collections'>
        <div 
          v-for='(collection, cIdx) in collector.collections' 
          :key='cIdx' 
          class='collection'
          >
          <div class='title'>{{ collection.title }}</div>
          <div class='description'>{{ collection.description }}</div>
        </div>
      </div>
    </div>
  </div>
  <NewCollectionModal 
    v-if='newCollectionModalOpen'
    @closeModal='newCollectionModalOpen = false'
    :navHeight='navHeight'
    />
</template>

<script lang='ts'>

import { CollectionType } from '@/ts/types.ts';
import { createCollection, getAllCollections } from '@/js/serverCalls.ts';
import NewCollectionModal from '@/components/collections/NewCollectionModal.vue';

import { defineComponent } from 'vue';

type CollectionsComponentDataType = {
  newCollectionModalOpen: boolean,
  allCollections: CollectionType[],
  collectors: {
    userID: string,
    userName: string,
    collections: CollectionType[],
  }[],
  collectionBoxSize: number,
  collectionsRowHeight: number,
  userNameHeight: number
}

export default defineComponent({
  data(): CollectionsComponentDataType {
    return {
      newCollectionModalOpen: false,
      allCollections: [],
      collectors: [],
      collectionBoxSize: 250,
      collectionsRowHeight: 330,
      userNameHeight: 50
      
    };
  },

  components: {
    NewCollectionModal
  },

  props: {
    navHeight: {
      type: Number,
      required: true
    }
  },

  async mounted() {
    // gather all collections, filter to only show collections that the user 
    // has permission to view, split them up according to their creator, and 
    // display basically a list of creator names, below each of which is a 
    // scrolling horizontal set of boxes representing each collection, with its
    // title and description and purpose. 
    try {
      this.allCollections = await getAllCollections();
      this.allCollections = this.allCollections.filter(coll => {
        const c0 = coll.permissions.publicView;
        const c1 = coll.userID === this.$store.state.userID;
        const c2 = coll.permissions.view.includes(this.$store.state.userID!);
        const c3 = coll.permissions.edit.includes(this.$store.state.userID!);
        return c0 || c1 || c2 || c3;
      });
      const collectorIDs = this.allCollections
        .map(coll => coll.userID)
        .filter((userID, index, self) => {
          return self.indexOf(userID) === index;
        });
      this.collectors = collectorIDs.map(collectorID => {
        const collectorName = this.allCollections.find(coll => {
          return coll.userID === collectorID;
        })!.userName!;
        const collections = this.allCollections.filter(coll => {
          return coll.userID === collectorID;
        });
        return {
          userID: collectorID,
          userName: collectorName,
          collections
        };
      });
    } catch (error) {
      console.log(error);
    }

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
        purpose: 'Research',
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

.collectionsMain {
  background-image: linear-gradient(black, #1e241e);
  height: 100%;
  width: 100%;
}

.collectionRow {
  height: v-bind(collectionsRowHeight + 'px');
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #ccc;
}

.userName {
  color: white;
  font-size: 1.5em;
  margin-left: 20px;
  /* margin-top: 10px; */
  display: flex;
  align-items: center;
  justify-content: left;
  height: v-bind(userNameHeight + 'px');

}

.collections {
  display: flex;
  overflow-x: auto;
  flex-direction: row;
  height: v-bind(collectionsRowHeight - userNameHeight + 'px');
  width: 100%;
  align-items: center;
  justify-content: left;
}

.collection {
  width: v-bind(collectionBoxSize + 'px');
  height: v-bind(collectionBoxSize + 'px');
  min-width: v-bind(collectionBoxSize + 'px');
  min-height: v-bind(collectionBoxSize + 'px');
  background-color: tan;
  box-sizing: border-box;
  border: 1px solid #ccc;
  margin-left: 20px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: left;
  justify-content: left;
}

.collection:hover {
  background-color: #ccc;
  cursor: pointer;
}

.title {
  font-size: 1.5em;
  color: black;
  /* margin-left: 10px; */
  margin-top: 10px;
  width: 100%;
  text-align: left;
}

.description {
  font-size: 1em;
  color: black;
  /* margin-left: 10px; */
  margin-top: 10px;
  width: 100%;
  text-align: left;
}
</style>
