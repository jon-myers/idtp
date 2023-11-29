<template>
  <div class="modal">
    <div class="modal-content">
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
        <button @click="uploadRecording">Upload</button>
        <div class='progressContainer' v-if='!uploadDone'>
          <div class='progress'></div>
        </div>
        <audio 
          controls 
          v-if='processingDone'
          ref='audio'
          @canplaythrough='loaded'
          >
          <source :src='`https://swara.studio/audio/mp3/${audioFileId}.mp3`'>
      </audio>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { 
  getAllAudioEventMetadata, 
  AudioEventMetadataType,
  newUploadFile 
} from '@/js/serverCalls';

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
    };
  },

  async mounted() {
    try {
      this.allAudioEvents = await getAllAudioEventMetadata();
    } catch (err) {
      console.log(err);
    }
  },

  methods: {

    handleFileChange(event: Event) {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.file = target.files[0];
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
            });
            this.audioFileId = res.data.audioFileId;
            this.processingDone = true;
            console.log(res.message, res.audioFileId)
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
}

.modal-content {
  background-color: lightgrey;
  padding: 20px;
  border-radius: 4px;
  height: 300px;
  width: 600px;
  display: flex;
  flex-direction: column;
  justify-content: top;

}

.modalRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  height: 60px;
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

.subRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  height: 100%;
  /* width: 150px; */
}
</style>