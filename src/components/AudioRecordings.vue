<template>
  <div class='main' @click='handleClick'>
    <div 
      class='fileContainer'
      @contextmenu='handleRightClick'
    >
    <div 
      class='recordingRow'
      v-for='recording in allRecordings'
      >
    </div>
    </div>
    <AudioPlayer 
      :audioSource='audioSource'
      :saEstimate='saEstimate'
      :saVerified='saVerified'
      :id='audioRecId'
      ref='audioPlayer'
      @emitNextTrack='nextTrack'
    />
  </div>
</template>

<script lang='ts'>
import { defineComponent } from 'vue';
import AudioPlayer from '@/components/audioEvents/AudioPlayer.vue';
import { getAllAudioRecordingMetadata } from '@/js/serverCalls.ts';
type AudioRecordingsDataType = {
  audioSource: string | undefined,
  saEstimate: string | undefined,
  saVerified: string | undefined,
  audioRecId: string | undefined,
  allRecordings: { 
    date: { 
      year?: string,
      month?: string,
      day?: string,
    },
    duration: number,
    location: {
      continent?: string,
      country?: string,
      city?: string,
    },
    musicians: {
      [key: string]: {
        instrument: string,
        gharana: string,
        role: string,
      }
    },
    octOffset: number,
    parentID: string,
    raags: {
      [key: string]: {
        'performance sections': {
          [key: string]: {
            start: number,
            end: number,
          }
        }
        start: number,
        end: number,
      }
    }
    saEstimate: number, 
    _id: string 
  }[],
}

export default defineComponent({
  name: 'AudioRecordings',
  
  data(): AudioRecordingsDataType {
    return {
      audioSource: undefined,
      saEstimate: undefined,
      saVerified: undefined,
      audioRecId: undefined,
      allRecordings: []
    }
  },

  components: {
    AudioPlayer
  },

  async created() {
    window.addEventListener('keydown', this.handleKeydown);
    if (this.$store.state.userID === undefined) {
      if (this.$cookies.get('userID') === undefined) {
        this.$router.push('/')
      } else {
        this.userID = this.$cookies.get('userID');
      }
    } else {
      this.userID = this.$store.state.userID;
    }

    try {
      this.allRecordings = await getAllAudioRecordingMetadata();
      console.log(this.allRecordings);
    } catch (err) {
      console.log(err);
    }
    
  },

  beforeUnmount() {
    const audioPlayer = this.$refs.audioPlayer as typeof AudioPlayer;
    audioPlayer.audio.pause();
    window.removeEventListener('keydown', this.handleKeydown);
  },
  
  mounted() {
  },
  
  computed: {
  },
  
  methods: {
  }
})
</script>

<style scoped>


.fileContainer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  width: 100%;
  background-color: black;
  background-image: linear-gradient(black, #1e241e);
  color: white;
  user-select: none;
  overflow-y: scroll;
  border-top: 1px solid grey;
}

</style>