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
        <span class='field'>
          {{ field.name }}
          <span 
            :class='`sortTriangle ${field.sortState}`'
            @click='toggleSort(fIdx)'
            :style='{
              "color": fIdx === selectedSortIdx ? "white" : "black",
            }'
            >
            &#9654;
          </span>
        </span>
        
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
          <span class='field'>{{ field.func(recording) }}</span>
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
import { 
  getAllAudioRecordingMetadata, 
  getSortedMusicians 
} from '@/js/serverCalls.ts';
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
    'func': (rec: RecType) => string | string[],
    'sortState': 'down' | 'up',
    'sortType': string
  }[],
  columnWidths: number[],
  initialMouseX?: number,
  initialWidths: number[],
  allMusicians?: { 
    'First Name'?: string,
    'Last Name'?: string,
    'Initial Name': string,
    'Middle Name'?: string,
  }[],
  selectedSortIdx: number
}

export default defineComponent({
  name: 'AudioRecordings',
  
  data(): AudioRecordingsDataType {
    return {
      audioSource: undefined,
      saEstimate: undefined,
      saVerified: undefined,
      audioRecId: undefined,
      allMusicians: undefined,
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
          },
          'sortState': 'down',
          'sortType': 'soloist'
        },
        {
          'name': 'Raag',
          'func': (rec: RecType) => {
            return Object.keys(rec.raags).join(', ');
          },
          'sortState': 'down',
          'sortType': 'raag'
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
          },
          'sortState': 'down',
          'sortType': 'pSec'
        },
        {
          'name': 'Duration',
          'func': (rec: RecType) => {
            return displayTime(rec.duration);
          },
          'sortState': 'down',
          'sortType': 'duration'
        },
        {
          'name': 'Audio Event',
          'func': (rec: RecType) => {
            return rec.parentTitle ? rec.parentTitle : 'None';
          },
          'sortState': 'down',
          'sortType': 'audioEvent'
        }      
      ],
      columnWidths: [200, 180, 180, 80, 400],
      initialWidths: [200, 180, 180, 80, 400],
      selectedSortIdx: 0
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
      this.allMusicians = await getSortedMusicians(true) as { 
        'First Name'?: string,
        'Last Name'?: string,
        'Initial Name': string,
        'Middle Name'?: string,
      }[];
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
    const summedWidths = this.columnWidths.reduce((a, b) => a + b, 0);
    if (summedWidths > window.innerWidth) {
      const ratio = window.innerWidth / summedWidths;
      this.columnWidths = this.columnWidths.map(width => width * ratio);
      this.initialWidths = this.columnWidths.slice();
    }
  },
  
  computed: {
  },
  
  methods: {

    handleDragStart(fIdx: number, event: DragEvent) {
      console.log('drag start')
      // Store the initial mouse position and column widths
      this.initialMouseX = event.clientX;
      this.initialWidths = this.columnWidths.slice()
      // make cursor resize until drag end
      document.body.style.cursor = 'col-resize';

    },
    handleDrag(fIdx: number, event: DragEvent) {
      const nextCol = fIdx < this.columnWidths.length - 1;
      // Calculate the new width based on the mouse movement
        if (event.clientX !== 0) {
          const deltaX = event.clientX - this.initialMouseX!;
          if (this.initialWidths[fIdx]! + deltaX < 50) {
            return;
          } else if (nextCol && (this.initialWidths[fIdx + 1]! - deltaX < 50)) {
            return
          } else {
            this.columnWidths[fIdx] = this.initialWidths[fIdx]! + deltaX;
            if (nextCol) {
              this.columnWidths[fIdx + 1] = this.initialWidths[fIdx + 1] - deltaX;
            }
          }
      }
    },
    handleDragEnd(fIdx: number, event: DragEvent) {
      document.body.style.cursor = '';
      const nextCol = fIdx < this.columnWidths.length - 1;
      const deltaX = event.clientX - this.initialMouseX!;
      if (this.initialWidths[fIdx] + deltaX < 50) {
        return;
      } else if (nextCol && this.initialWidths[fIdx + 1] - deltaX < 50) {
        return
      } else {
        this.columnWidths[fIdx] = this.initialWidths[fIdx] + deltaX;
        if (nextCol) {
          this.columnWidths[fIdx + 1] = this.initialWidths[fIdx + 1] - deltaX;
        }  
      } 
    },

    toggleSort(fIdx: number) {
      const field = this.metadataFields[fIdx];
      if (this.selectedSortIdx === fIdx) {
        if (field.sortState === 'down') {
          field.sortState = 'up';
          this.sortRecordings({ sort: field.sortType, fromTop: false });
        } else {
          field.sortState = 'down';
          this.sortRecordings({ sort: field.sortType, fromTop: true });
        }
      } else {
        this.sortRecordings({ 
          sort: field.sortType, 
          fromTop: field.sortState === 'down' 
        });
      }

      this.selectedSortIdx = fIdx;
    },

    eventSorter(a: RecType, b: RecType) {
      if (a.parentTitle === undefined && b.parentTitle === undefined) {
        return 0;
      } else if (a.parentTitle === undefined && b.parentTitle !== undefined) {
        return 1;
      } else if (a.parentTitle !== undefined && b.parentTitle === undefined) {
        return -1;
      } else {
        const aTitleLower = a.parentTitle!.toLowerCase();
        const bTitleLower = b.parentTitle!.toLowerCase();

        if (aTitleLower < bTitleLower) {
          return -1;
        } else if (aTitleLower > bTitleLower) {
          return 1;
        } else {
          return 0;
        }
      }
    },

    durSorter(a: RecType, b: RecType) {
      if (a.duration < b.duration) {
        return -1;
      } else if (a.duration > b.duration) {
        return 1;
      } else {
        return 0;
      }
    },

    pSecSorter(a: RecType, b: RecType) {
      const aPSec = Object.keys(a.raags).map(raag => {
        if (a.raags[raag]['performance sections']) {
          return Object.keys(a.raags[raag]['performance sections']!);
        } else {
          return []; 
        }
      }).flat()[0];
      const bPSec = Object.keys(b.raags).map(raag => {
        if (b.raags[raag]['performance sections']) {
          return Object.keys(b.raags[raag]['performance sections']!);
        } else {
          return []; 
        }
      }).flat()[0];
      if (aPSec === undefined && bPSec === undefined) {
        return 0;
      } else if (aPSec === undefined && bPSec !== undefined) {
        return 1;
      } else if (aPSec !== undefined && bPSec === undefined) {
        return -1;
      } else if (aPSec === 'undefined') {
        if (bPSec === 'undefined') {
          return 0
        } else if (bPSec === undefined) {
          return -1;
        } else {
          return 1;
        }
      } else if (bPSec === 'undefined') {
        if (aPSec === undefined) {
          return 1;
        } else {
          return -1;
        }
      } else if (aPSec === 'Unknown') {
        if (bPSec === 'Unknown') {
          return 0;
        } else if (bPSec === undefined || bPSec === 'undefined') {
          return -1;
        } else {
          return 1;
        }
      } else if (bPSec === 'Unknown') {
        if (aPSec === undefined || aPSec === 'undefined') {
          return 1;
        } else {
          return -1;
        }
      
      } else {
        if (aPSec < bPSec) {
          return -1;
        } else if (aPSec > bPSec) {
          return 1;
        } else {
          return 0;
        }
      }
    },

    raagSorter(a: RecType, b: RecType) {
      const aRaag = Object.keys(a.raags)[0];
      const bRaag = Object.keys(b.raags)[0];
      if (aRaag === undefined && bRaag === undefined) {
        return 0;
      } else if (aRaag === undefined && bRaag !== undefined) {
        return 1;
      } else if (aRaag !== undefined && bRaag === undefined) {
        return -1;
      } else if (aRaag === 'undefined') {
        if (bRaag === 'undefined') {
          return 0
        } else if (bRaag === undefined) {
          return -1;
        } else {
          return 1;
        }
      } else if (bRaag === 'undefined') {
        if (aRaag === undefined) {
          return 1;
        } else {
          return -1;
        }
      } else if (aRaag === 'Unknown') {
        if (bRaag === 'Unknown') {
          return 0;
        } else if (bRaag === undefined || bRaag === 'undefined') {
          return -1;
        } else {
          return 1;
        }
      } else if (bRaag === 'Unknown') {
        if (aRaag === undefined || aRaag === 'undefined') {
          return 1;
        } else {
          return -1;
        }
      
      } else {
        if (aRaag < bRaag) {
          return -1;
        } else if (aRaag > bRaag) {
          return 1;
        } else {
          return 0;
        }
      }
    },

    soloistSorter(a: RecType, b: RecType) {
      // get last name by looking up soloist in allMusicians array,
      // then sort by last name, then first name, then middle name. If there 
      // is no last name, put after all other last names. If solist is Unknown,
      // put at the end
      const aSoloist = Object.keys(a.musicians).filter(key => {
        return a.musicians[key].role === 'Soloist';
      })[0];
      const bSoloist = Object.keys(b.musicians).filter(key => {
        return b.musicians[key].role === 'Soloist';
      })[0];
      if (aSoloist === 'Unknown') {
        return 1;
      } else if (bSoloist === 'Unknown') {
        return -1;
      } else if (aSoloist === undefined) {
        return 1;
      } else if (bSoloist === undefined) {
        return -1;
      } else {
        const aObj = this.allMusicians!.find(musician => {
          return musician['Initial Name'] === aSoloist;
        })
        const bObj = this.allMusicians!.find(musician => {
          return musician['Initial Name'] === bSoloist;
        })
        if (aObj === undefined && bObj === undefined) {
          return 0;
        } else if (aObj === undefined && bObj !== undefined) {
          return 1;
        } else if (aObj !== undefined && bObj === undefined) {
          return -1;
        } else {
          const aLastName = aObj!['Last Name'];
          const bLastName = bObj!['Last Name'];
          if (aLastName === undefined) {
            return 1;
          } else if (bLastName === undefined) {
            return -1;
          } else {
            const aFirstName = this.allMusicians!.find(musician => {
              return musician['Initial Name'] === aSoloist;
            })!['First Name'];
            const bFirstName = this.allMusicians!.find(musician => {
              return musician['Initial Name'] === bSoloist;
            })!['First Name'];
            const aMiddleName = this.allMusicians!.find(musician => {
              return musician['Initial Name'] === aSoloist;
            })!['Middle Name'];
            const bMiddleName = this.allMusicians!.find(musician => {
              return musician['Initial Name'] === bSoloist;
            })!['Middle Name'];
            if (aLastName < bLastName) {
              return -1;
            } else if (aLastName > bLastName) {
              return 1;
            } else {
              if (aFirstName !== undefined && bFirstName === undefined) {
                return -1;
              } else if (aFirstName === undefined && bFirstName !== undefined) {
                return 1;
              } else if (aFirstName === undefined && bFirstName === undefined) {
                return 0;
              } else {
                if (aFirstName! < bFirstName!) {
                  return -1;
                } else if (aFirstName! > bFirstName!) {
                  return 1;
                } else {
                  if (aMiddleName !== undefined && bMiddleName === undefined) {
                    return -1;
                  } else if (aMiddleName === undefined && bMiddleName !== undefined) {
                    return 1;
                  } else if (aMiddleName === undefined && bMiddleName === undefined) {
                    return 0;
                  } else {
                    if (aMiddleName! < bMiddleName!) {
                      return -1;
                    } else if (aMiddleName! > bMiddleName!) {
                      return 1;
                    } else {
                      return 0;
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    sortRecordings({
      sort='soloist', 
      fromTop=true
    }: {
      sort?: string,
      fromTop?: boolean
    } = {
    }) {
      if (sort === 'soloist') {
        this.allRecordings.sort(this.soloistSorter);
        if (!fromTop) {
          this.allRecordings.reverse();
        }
      } else if (sort === 'raag') {
        this.allRecordings.sort(this.raagSorter);
        if (!fromTop) {
          this.allRecordings.reverse();
        }
      } else if (sort === 'pSec') {
        this.allRecordings.sort(this.pSecSorter);
        if (!fromTop) {
          this.allRecordings.reverse();
        }
      } else if (sort === 'duration') {
        this.allRecordings.sort(this.durSorter);
        if (!fromTop) {
          this.allRecordings.reverse();
        }
      } else if (sort === 'audioEvent') {
        this.allRecordings.sort(this.eventSorter)
        if (!fromTop) {
          this.allRecordings.reverse();
        }
      }
    }
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
  height: calc(100vh - 140px - 40px);
  width: 100%;
  user-select: none;
  overflow-y: scroll;
  overflow-x: hidden;
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
  /* overflow-x: hidden; */
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
  text-align: center;
  border-right: 1px solid grey;
  height: 40px;
  position: relative;
  white-space: nowrap;
  box-sizing: border-box;
}

span.field {
  display: flex;
  align-items: center;
  justify-content: left;
  white-space: nowrap;
  overflow-x: auto;
  height: 30px;
  margin-left: 5px;
  margin-right: 5px;
  user-select: none;
}

.draggableBorder {
  position: absolute;
  right: -5px;
  top: 0;
  width: 10px;
  height: 100%;
  background-color: none;
  z-index: 1;
  opacity: 0;
  cursor: ew-resize;
  user-select: none;
  /* background-color: pink */
}

.sortTriangle.down {
  transform: rotate(90deg);
}

.sortTriangle.up {
  transform: rotate(-90deg);
}

</style>