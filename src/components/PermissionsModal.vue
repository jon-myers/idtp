<template>
  <div class='modal'>
    <div class='modal-content'>
      <div class='modalRow'>
        <label>{{  `Visibility: ` }}</label>
        <select v-model='visible'>
          <option :value='true'>Public</option>
          <option :value='false'>Private</option>
        </select>
      </div>
      <div class='modalRow'>
        <button @click='handleUpdate'>Update</button>
      </div>
    </div>
  </div>
</template>
<script lang='ts'>

import { defineComponent, PropType } from 'vue';
import { TranscriptionMetadataType } from '@/ts/types';
import { updateVisibility } from '@/js/serverCalls';
import { 
  AudioEventType, 
  RecType 
} from '@/components/audioEvents/AddAudioEvent.vue';


type PermissionsModalDataType = {
  visible: boolean
}

export default defineComponent({
  name: 'PermissionsModal',
  data(): PermissionsModalDataType {
    return {
      visible: true
    }
  },
  props: {
    navHeight: {
      type: Number,
      required: true
    },
    visibility: {
      type: Boolean,
      required: true
    },
    artifactType:{
      type: String as PropType<'audioEvent' | 'audioRecording' | 'transcription'>,
      required: true
    },
    artifactID: {
      type: String,
      required: true
    }
  },

  created() {
    this.visible = this.visibility;
  },
  mounted() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.$emit('close');
      }
    });

    window.addEventListener('click', (e) => {
      if (e.target === document.querySelector('.modal')) {
        this.$emit('close');
      }
    });

  },

  methods: {
    async handleUpdate() {
      const res = await updateVisibility(this.artifactType, this.artifactID, this.visible);
      this.$emit('close');
    }
  },

  unmounted() {
    // remove event listener for keydown
    window.removeEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.$emit('close');
      }
    });

    //  if you click outside modal-content, it closes the modal
    window.removeEventListener('click', (e) => {
      if (e.target === document.querySelector('.modal')) {
        this.$emit('close');
      }
    });
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
  height: 80px;
  width: 350px;
  display: flex;
  flex-direction: column;
  justify-content: top;
}

.modalRow {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 32px;
}

label {
  margin-right: 5px;
  text-align: right;
}

select {
  margin-left: 5px;
}


</style>