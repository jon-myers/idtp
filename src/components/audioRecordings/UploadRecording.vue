<template>
  <div class="modal">
    <div class="modal-content">
      <div class='modalFrame' v-if='frameView === "uploadRec"'>
        <h2>Upload Recording</h2>
        <div class='modalRow'>
          <input 
            type="file" 
            @change="handleFileChange" 
            accept="audio/*"
            ref='file'
            />
        </div>
        <div class='modalRow taller'>
          <div class='subColumn'>
            <div class='subRow'>
              <input 
                type='radio' 
                id='addToAudioEvent' 
                value='addToAudioEvent' 
                name='uploadType'
                v-model='aeChoice'>
              <label for='addToAudioEvent'>Add to Audio Event</label>
            </div>
            <div class='subRow'>
              <input 
                type='radio' 
                id='createNewAudioEvent' 
                value='createNewAudioEvent' 
                name='uploadType'
                v-model='aeChoice'>
              <label for='createNewAudioEvent'>Create New Audio Event</label>
            </div>
            <div class='subRow'>
              <input 
                type='radio' 
                id='noAudioEvent' 
                value='noAudioEvent' 
                name='uploadType'
                v-model='aeChoice'>
              <label for='noAudioEvent'>No Audio Event</label>
            </div>
          </div>
          <div class='subColumn' v-if='aeChoice === "addToAudioEvent"'>
            <select v-model='selectedAE'>
              <option 
                v-for='(ae, i) in allAudioEvents' 
                :key='i'
                :value='ae'
                >
                {{ae.name}}
              </option>
            </select>
          </div>
          <div class='subColumn' v-if='aeChoice === "createNewAudioEvent"'>
            <input type='text' class='textInput' v-model='newAEName'>
          </div>
        </div>
        <div class='modalRow'>
          <button 
            @click="uploadRecording" 
            :disabled='uploadButtonDisabled'
            v-if='!uploadDone && !processingDone'
            >
            Upload
          </button>
          <div class='progressContainer' v-if='!uploadDone'>
            <div class='progress'></div>
          </div>
          <div v-if='uploadDone && !processingDone'>
            Processing...
          </div>
          <audio 
            controls 
            v-if='processingDone'
            ref='audio'
            >
            <source :src='`https://swara.studio/audio/mp3/${audioFileId}.mp3`'>
        </audio>
        </div>
      </div>
      <div class='modalFrame' v-if='frameView === "editRecMetadata"'>
        <h2>Edit Recording Metadata</h2>
        <div class='modalRow'>
          <audio 
            controls 
            ref='audio'
            >
            <source :src='`https://swara.studio/audio/mp3/${audioFileId}.mp3`'>
          </audio>
        </div>
        <div class='modalRow numMusicians'>
          <label>Number of Musicians</label>
          <input type='number' v-model='numMusicians'>
        </div>
        <div class='modalRow tall muscians'>
          <div class='modalCol' v-for='(mus, i) in editingMusicians' :key='i'>
            <div class='modalColRow'>
              <label>Name</label>
              <input type='text' v-model='mus.name'>
            </div>
            <div class='modalColRow'>
              <label>Role</label>
              <select v-model='mus.role'>
                <option value='Soloist'>Soloist</option>
                <option value='Accompanist'>Accompanist</option>
                <option value='Percussionist'>Percussionist</option>
                <option value='Drone'>Drone</option>
              </select>
            </div>
            <div class='modalColRow'>
              <label>Gharana</label>
              <select v-model='mus.gharana'>
                <option 
                  v-for='(gharana, i) in allGharanas' 
                  :key='i'
                  :value='gharana.name'
                  >
                  {{gharana.name}}
                </option>
              </select>
              <!-- <input type='text' v-model='mus.gharana'> -->
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { 
  getAllAudioEventMetadata, 
  AudioEventMetadataType,
  newUploadFile,
  getAudioRecording,
  getAllMusicians,
  getAllGharanas
} from '@/js/serverCalls.ts';

import { RecType } from '@/components/audioEvents/AddAudioEvent.vue';
import { MusicianDBType, GharanaType } from '@/ts/types.ts';
type UploadRecordingDataType = {
  progressWidth: number;
  file: File | null;
  aeChoice: string;
  allAudioEvents: AudioEventMetadataType[];
  selectedAE: AudioEventMetadataType | undefined;
  newAEName: string;
  progressContainerWidth: number;
  uploadDone: boolean;
  audioFileId: string;
  processingDone: boolean;
  numFiles: number;
  editingRec?: RecType;
  numMusicians: number;
  allMusicians: MusicianDBType[];
  allGharanas: GharanaType[];
  editingMusicians: {
    name?: string;
    id?: string;
    role?: 'Soloist' | 'Accompanist' | 'Percussionist' | 'Drone';
    gharana?: string
  }[]
}

export default defineComponent({
  data(): UploadRecordingDataType {
    return {
      progressWidth: 0,
      file: null as File | null,
      aeChoice: 'addToAudioEvent',
      allAudioEvents: [],
      selectedAE: undefined,
      newAEName: '',
      progressContainerWidth: 150,
      uploadDone: false,
      audioFileId: '',
      processingDone: false,
      numFiles: 0,
      editingRec: undefined,
      numMusicians: 1,
      allMusicians: [],
      editingMusicians: [],
      allGharanas: [],
      
    };
  },

  computed: {
    uploadButtonDisabled() {
      return this.numFiles < 1;
    }
  },

  async mounted() {
    // esc closes modal
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.$emit('closeModal');
      }
    });
    //  if you click outside modal-content, it closes the modal
    window.addEventListener('click', (e) => {
      const modal = this.$el as HTMLElement;
      if (e.target === modal) {
        this.$emit('closeModal');
      }
    });
    try {
      if (this.recId && this.frameView === 'editRecMetadata') {
        this.audioFileId = this.recId;
        await this.prepareForEditing();
      } else if (this.frameView === 'uploadRec') {
        this.allAudioEvents = await getAllAudioEventMetadata();
      }
    } catch (err) {
      console.log(err);
    }
  },

  unmounted() {
    document.removeEventListener('keydown', () => {});
    document.removeEventListener('click', () => {});
  },

  props: {
    navHeight: {
      type: Number,
      required: true
    },

    frameView: {
      type: String as PropType<'uploadRec' | 'editRecMetadata'>,
      required: true
    },

    recId: {
      type: String,
      required: false
    }
  },

  watch: {

    recId(newVal) {
      console.log('changed')
      if (newVal) {
        this.audioFileId = newVal;
      }
    }

  },

  methods: {

    growEditingMusicians() {
      this.editingMusicians.push({
        name: undefined,
        id: undefined,
        role: undefined,
        gharana: undefined
      })
    },

    async prepareForEditing() {
      try {
        this.editingRec = await getAudioRecording(this.audioFileId);
        this.numMusicians = Object.keys(this.editingRec!.musicians).length;
        if (this.numMusicians === 0) {
          this.numMusicians = 1;
          this.editingMusicians = [];
          this.growEditingMusicians();
        } else {
          this.allMusicians = await getAllMusicians();
          this.allGharanas = await getAllGharanas();
          this.editingMusicians = Object.keys(this.editingRec!.musicians).map((musKey) => {
            const mus = this.editingRec!.musicians[musKey];
            console.log(mus)
            const musObj = this.allMusicians.find((m) => m['Full Name'] === musKey);
            return {
              name: musKey,
              id: musObj ? musObj._id: undefined,
              role: mus.role,
              gharana: mus.gharana ? 
                mus.gharana : 
                (musObj ? musObj.Gharana : undefined)
            }
          })
        }
        
      } catch (err) {
        console.log(err);
      }
    },

    handleFileChange(event: Event) {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.file = target.files[0];
        this.numFiles = target.files.length;
      }
    },

    async uploadRecording() {
      // Perform the upload logic here
      console.log('Uploading recording...');
      const fileElem = this.$refs.file as HTMLInputElement;
      if (fileElem.files && fileElem.files.length > 0) {
        const file = fileElem.files[0];
        this.processingDone = false;
        this.uploadDone = false;
        this.progressWidth = 0;
        try {
          if (file.type.slice(0, 5) === 'audio') {
            let audioEventType: 'add' | 'create' | 'none' = 'add';
            if (this.aeChoice === 'createNewAudioEvent') {
              audioEventType = 'create';
            } else if (this.aeChoice === 'noAudioEvent') {
              audioEventType = 'none';
            }
            const res = await newUploadFile(file, this.onProgress, {
              audioEventType,
              audioEventID: this.selectedAE?._id,
              recIdx: Object.keys(this.selectedAE!.recordings).length,
              userID: this.$store.state.userID,
            });
            this.audioFileId = res.data.audioFileId;
            this.processingDone = true;
            this.$emit('updateFrameView', 'editRecMetadata');
            this.$emit('updateEditingRecId', this.audioFileId);
            this.editingRec = await getAudioRecording(this.audioFileId);

          } else {
            throw new Error('File must be an audio file');
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        throw new Error('No file selected');
      }
    },

    onProgress(percent: number) {
      this.progressWidth = this.progressContainerWidth * percent / 100;
      if (percent === 100) {
        this.uploadDone = true;
      }
    }
  },
});
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
  height: 400px;
  width: 600px;
  display: flex;
  flex-direction: column;
  justify-content: top;
}
.modalCol > * > select {
  width: 100px;
  box-sizing: border-box;
}

.modalCol > * > input[type='text'] {
  width: 100px;
  padding: 0px;
  margin: 0px;
  box-sizing: border-box;
}

.modalColRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  height: 30px;
  width: 200px;
}

.modalColRow > label {
  min-width: 100px;
  text-align: right;
  margin-right: 10px;
}

.modalRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  height: 60px;
}

.modalRow.tall {
  height: 100px;
}

.modalCol {
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: center;
  height: 100%;
  width: 200px;
}

.taller {
  height: 80px;

}

.progressContainer {
  width: v-bind(progressContainerWidth + 'px');
  height: 20px;
  background-color: white;
  border: 1px solid black;
  margin-left: 10px;
}

.progress {
  width: v-bind(progressWidth + 'px');
  height: 20px;
  background-color: lightblue;
}

.subColumn {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
  margin-right: 20px;
  height: 100%;
  width: 250px;

}

select {
  width: 250px;
}

input[type='text'] {
  width: 250px;
}

.numMusicians > input[type='number'] {
  width: 30px;
  margin-left: 10px;
}

.subRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  height: 100%;
  /* width: 150px; */
}

.modalFrame {
  display: flex;
  flex-direction: column;
  justify-content: top;
  align-items: center;
  height: 100%;
  width: 100%;
}

audio {
  width: 100%;
}
</style>