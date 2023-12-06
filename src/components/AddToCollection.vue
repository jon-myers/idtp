<template>
  <div class='modal'>
    <div class='modal-content'>
      <h2>Add to Collection</h2>
      <div class='modalRow'>
        <select v-model='selectedCollection'>
          <option 
            v-for='(collection, i) in possibleCollections' 
            :key='i'
            :value='collection'
            >
            {{collection.userName + ' - ' + collection.title}}
          </option>
        </select>
      </div>
      <div class='modalRow'>
        <button 
          @click='addToCollection'
          :disabled='selectedCollection === undefined'
          >Add</button>
        <button @click='$emit("close")'>Close</button>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue';
import type { CollectionType } from '@/ts/types.ts';
import { addRecordingToCollection } from '@/js/serverCalls';

type AddToCollectionDataType = {
  selectedCollection: CollectionType | undefined  
}

export default defineComponent({
  name: 'AddToCollection',
  data(): AddToCollectionDataType {
    return {
      selectedCollection: undefined
    }
  },
  props: {
    possibleCollections: {
      type: Array as PropType<CollectionType[]>,
      required: true
    },
    navHeight: {
      type: Number,
      required: true
    },
    recID: {
      type: String,
      required: true
    }
  },

  mounted() {
    // add event listener for keydown
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.$emit('close');
      }
    });

    //  if you click outside modal-content, it closes the modal
    window.addEventListener('click', (e) => {
      const modal = this.$el as HTMLElement;
      if (e.target === modal) {
        this.$emit('close');
      }
    })
  },

  unmounted() {
    // remove event listener for keydown
    window.removeEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.$emit('close');
      }
    });

    window.removeEventListener('click', (e) => {
      const modal = this.$el as HTMLElement;
      if (e.target === modal) {
        this.$emit('close');
      }
    })
  },

  methods: {
    async addToCollection() {
      try {
        const res = await addRecordingToCollection(this.recID, this.selectedCollection!._id!);
        console.log(res)
        this.$emit('close');
      } catch (err) {
        console.log(err);
      }
    }
  }
})

</script>
<style scoped>

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3;
  margin-top: v-bind(navHeight + 'px');
}

.modal-content {
  background-color: lightgrey;
  padding: 20px;
  border-radius: 4px;
  height: 130px;
  width: 350px;
  display: flex;
  flex-direction: column;
  justify-content: top;
}

select {
  width: 300px;
}

button {
  margin: 10px;
}
</style>