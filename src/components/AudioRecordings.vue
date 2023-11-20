<template>
  <div class='main' @click='handleClick'>
    <div class='labelRow'>
      <div 
        class='metadataLabels' 
        v-for='(field, fIdx) in metadataFields'
        :style='{
          "width": columnWidths[fIdx] + "px",
          "max-width": fIdx === metadataFields.length - 1 ? "" : columnWidths[fIdx] + "px",
          "min-width": columnWidths[fIdx] + "px",
          "flex-grow": fIdx === metadataFields.length - 1 ? 1 : 0,
          "position": "relative" 
          }'
        >
        <span>{{ field.name }}</span>
        <div 
          class='draggableBorder'
          draggable='true'
          @dragstart='handleDragStart(fIdx, $event)'
          @drag='handleDrag(fIdx, $event)'
          @dragend='handleDragEnd(fIdx, $event)'
          >
        </div>
      </div>
    </div>
    <div 
      class='fileContainer'
      @contextmenu='handleRightClick'
      >
      <div 
        class='recordingRow'
        v-for='recording in allRecordings'
        >
        <div 
          class='metadataLabels' 
          v-for='(field, fIdx) in metadataFields'
          :style='{ 
            "width": columnWidths[fIdx] + "px", 
            "max-width": fIdx === metadataFields.length - 1 ? "" : columnWidths[fIdx] + "px",
            "min-width": columnWidths[fIdx] + "px",
            "flex-grow": fIdx === metadataFields.length - 1 ? 1 : 0 
            }'
          >
          <span>{{ field.func(recording) }}</span>
          <div 
            class='draggableBorder'
            draggable='true'
            @dragstart='handleDragStart(fIdx, $event)'
            @drag='handleDrag(fIdx, $event)'
            @dragend='handleDragEnd(fIdx, $event)'
            >
          </div>
        </div>
       
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
import { RecType } from '@/components/audioEvents/AddAudioEvent.vue';
import { displayTime } from '@/js/utils.ts';
type AudioRecordingsDataType = {
  audioSource: string | undefined,
  saEstimate: string | undefined,
  saVerified: string | undefined,
  audioRecId: string | undefined,
  allRecordings: RecType[],
  metadataFields: { 
    'name': string,
    'func': (rec: RecType) => string | string[]
  }[],
  columnWidths: number[],
  initialMouseX?: number,
  initialWidths: number[],
}

export default defineComponent({
  name: 'AudioRecordings',
  
  data(): AudioRecordingsDataType {
    return {
      audioSource: undefined,
      saEstimate: undefined,
      saVerified: undefined,
      audioRecId: undefined,
      allRecordings: [],
      metadataFields: [
        { 
          'name': 'Soloist', 
          'func': (rec: RecType) => {
            const keys = Object.keys(rec.musicians).filter(key => {
              return rec.musicians[key].role === 'Soloist';
            });
            if (keys.length > 0) {
              return keys[0];
            } else {
              return 'Unknown';
            }           
          }
        },
        {
          'name': 'Raag',
          'func': (rec: RecType) => {
            return Object.keys(rec.raags).join(', ');
          }
        },
        {
          'name': 'Performance Section',
          'func': (rec: RecType) => {
            const raags = Object.keys(rec.raags);
            return raags.map(raag => {
              if (rec.raags[raag]['performance sections']) {
                return Object.keys(rec.raags[raag]['performance sections']!);
              } else {
                return []; 
              }
            }).flat().join(', ');
          }
        },
        {
          'name': 'Duration',
          'func': (rec: RecType) => {
            return displayTime(rec.duration);
          }
        },
        {
          'name': 'Audio Event',
          'func': (rec: RecType) => {
            return rec.parentTitle ? rec.parentTitle : 'None';
          }
        }      
      ],
      columnWidths: [200, 200, 200, 200, 400],
      initialWidths: [200, 200, 200, 200, 400]
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

    handleDragStart(fIdx: number, event: DragEvent) {
      // Store the initial mouse position and column widths
      this.initialMouseX = event.clientX;
      this.initialWidths = this.columnWidths.slice()
      // make cursor resize until drag end
      document.body.style.cursor = 'col-resize';

    },
    handleDrag(fIdx: number, event: DragEvent) {
      // Calculate the new width based on the mouse movement
        if (event.clientX !== 0) {
          const deltaX = event.clientX - this.initialMouseX!;
        requestAnimationFrame(() => {
          this.columnWidths[fIdx] = this.initialWidths[fIdx]! + deltaX;
          if (fIdx < this.columnWidths.length - 1) {
            this.columnWidths[fIdx + 1] = this.initialWidths[fIdx + 1] - deltaX;
          }
        });
      }
    },
    handleDragEnd(fIdx: number, event: DragEvent) {
      // Update the column width in your data
      const deltaX = event.clientX - this.initialMouseX!;
      this.columnWidths[fIdx] = this.initialWidths[fIdx] + deltaX;
      if (fIdx < this.columnWidths.length - 1) {
        this.columnWidths[fIdx + 1] = this.initialWidths[fIdx + 1] - deltaX;
      }
      document.body.style.cursor = '';
    },
  }
})
</script>

<style scoped>

.main {
  background-color: black;
  background-image: linear-gradient(black, #1e241e);
  color: white;
}
.fileContainer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  width: 100%;
  user-select: none;
  overflow-y: scroll;
  border-top: 1px solid grey;
}

.recordingRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  min-height: 40px;
  width: 100%;
  border-bottom: 1px solid grey;
}

.labelRow { 
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  min-height: 40px;
  background-color: #1e241e;
  border-top: 1px solid grey;
}

.metadataLabels {
  /* display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center; */
  text-align: center;
  border-right: 1px solid grey;
  height: 40px;
  /* user-select: none; */
  position: relative;
  white-space: nowrap;
  overflow-x: hidden;
  box-sizing: border-box;
  /* text-overflow: ellipsis; */
}

span {
  /* display: block; */
  display: flex;
  align-items: center;
  justify-content: left;
  white-space: nowrap;
  overflow-x: auto;
  /* text-overflow: ellipsis; */
  height: 30px;
  margin-left: 5px;
  margin-right: 5px;
}

.draggableBorder {
  position: absolute;
  right: -10px;
  top: 0;
  width: 20px;
  height: 100%;
  background-color: none;
  opacity: 0;
  cursor: ew-resize;
  user-select: none;
}

</style>