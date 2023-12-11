<template>
  <div class='miniARMain'>
    <div class='labelRow'>
      <div class='metadataLabels'
        v-for='(field, fIdx) in metadataFields'
        :style='{
          "width": columnWidths[fIdx] + "px",
          "max-width": fIdx === metadataFields.length - 2 ? "" : columnWidths[fIdx] + "px",
          "min-width": minColumnWidths[fIdx] + "px",
          "flex-grow": fIdx === metadataFields.length - 2 ? 1 : 0,
          "position": "relative",
        }'
      >
        <span class='field'>
          {{ field.name }}
          <span
            v-if='field.sortType !== undefined'
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
      ref='fileContainer'
      >
      <div 
        class='recordingRow'
        v-for='(recording, rIdx) in recs'
        @dblclick='sendAudioSource($event, recording)'
        :id='`recRow${rIdx}`'
        >
        <div 
          class='metadataLabels' 
          v-for='(field, fIdx) in metadataFields'
          :style='{ 
            "width": columnWidths[fIdx] + "px", 
            "max-width": fIdx === metadataFields.length - 2 ? "" : columnWidths[fIdx] + "px",
            "min-width": minColumnWidths[fIdx] + "px",
            "flex-grow": fIdx === metadataFields.length - 2 ? 1 : 0 
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
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue';
import type { RecType } from '@/components/audioEvents/AddAudioEvent.vue';
import { 
  getRecsFromIds,
  getSortedMusicians, 
} from '@/js/serverCalls';
type MiniAudioRecordingsDataType = {
  recs: RecType[],
  metadataFields: {
    name: string,
    func: (rec: RecType) => string,
    sortState: 'up' | 'down',
    sortType: string | undefined
  }[],
  columnWidths: number[],
  labelRowHeight: number,
  allMusicians: { 
    'First Name'?: string,
    'Last Name'?: string,
    'Initial Name': string,
    'Middle Name'?: string,
  }[],
  selectedSortIdx: number,
  activeRecording?: RecType,
  initialMouseX?: number,
  initialWidths: number[],
  minColumnWidths: number[]
}
import { displayTime } from '@/ts/utils.ts';


export default defineComponent({
  name: 'MiniAudioRecordings',
  data(): MiniAudioRecordingsDataType {
    return {
      recs: [],
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
          'name': 'Section',
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
        },
        {
          'name': 'Track #',
          'func': (rec: RecType) => {
            return rec.parentTrackNumber ? rec.parentTrackNumber : 'None';
          },
          'sortState': 'down',
          'sortType': undefined
        }   
      ],
      columnWidths: [100, 100, 100, 100, 120, 70],
      initialWidths: [100, 100, 100, 100, 120, 70],
      initialMouseX: undefined,
      labelRowHeight: 40,
      allMusicians: [],
      selectedSortIdx: 0,
      activeRecording: undefined,
      minColumnWidths: [90, 75, 90, 110, 130, 80]
    }
  },
  props: {
    recIds: {
      type: Array as PropType<string[]>,
      required: true
    }
  },

  async mounted() {
    const summedWidths = this.columnWidths.reduce((a, b) => a + b, 0);
    // if (summedWidths > this.$el.offsetWidth) {
      const ratio = this.$el.offsetWidth / summedWidths;
      this.columnWidths = this.columnWidths.map(width => width * ratio);
      this.initialWidths = this.columnWidths.slice();
    // }
    this.ensureDurationWidth();
    try {
      this.recs = await getRecsFromIds(this.recIds);
      this.allMusicians = await getSortedMusicians(true) as {
        'First Name'?: string,
        'Last Name'?: string,
        'Initial Name': string,
        'Middle Name'?: string,
      }[];

    } catch (err) {
      console.error(err);
    }

  },

  methods: {

    ensureDurationWidth() {
      // ensure duration column is wide enough to display duration label
      const minWidth = 100;
      const idx = this.metadataFields.findIndex(field => {
        return field.name === 'Duration';
      });
      const audioEventIdx = this.metadataFields.findIndex(field => {
        return field.name === 'Audio Event';
      });
      if (this.columnWidths[idx] < minWidth) {
        const extra = minWidth - this.columnWidths[idx];
        this.columnWidths[idx] = minWidth;
        this.columnWidths[audioEventIdx] -= extra;
      }
    },

    sendNextTrack(shuffling: boolean, repeat: boolean) {
      const idx = this.recs.findIndex(rec => {
        return rec._id === this.activeRecording!._id;
      });
      const click = new MouseEvent('dblclick');
      if (repeat) {
        // get el with .playing
        const playingElem = document.querySelector('.playing');
        playingElem?.dispatchEvent(click);
      } else if (shuffling) {
        const nextIdx = Math.floor(Math.random() * this.recs.length);
        const nextElem = document.getElementById(`recRow${nextIdx}`);
        nextElem?.dispatchEvent(click);
      } else if (!shuffling) {
        if (idx === this.recs.length - 1) {
          const nextElem = document.getElementById(`recRow0`);
          nextElem?.dispatchEvent(click);
        } else {
          const nextElem = document.getElementById(`recRow${idx + 1}`);
          nextElem?.dispatchEvent(click);
        }
      }
    },

    sendPrevTrack(shuffling: boolean, repeat: boolean) {
      const idx = this.recs.findIndex(rec => {
        return rec._id === this.activeRecording!._id;
      });
      const click = new MouseEvent('dblclick');
      if (repeat) {
        // get el with .playing
        const playingElem = document.querySelector('.playing');
        playingElem?.dispatchEvent(click);
      } else if (shuffling) {
        const nextIdx = Math.floor(Math.random() * this.recs.length);
        const nextElem = document.getElementById(`recRow${nextIdx}`);
        nextElem?.dispatchEvent(click);
      } else if (!shuffling) {
        if (idx === 0) {
          const nextElem = document.getElementById(`recRow${this.recs.length - 1}`);
          nextElem?.dispatchEvent(click);
        } else {
          const nextElem = document.getElementById(`recRow${idx - 1}`);
          nextElem?.dispatchEvent(click);
        }
      }
    },

    sendAudioSource(event: MouseEvent, recording: RecType) {
      this.activeRecording = recording;
      let target = event.target as HTMLElement;
      if (target.tagName === 'SPAN') {
        target = target.parentElement!;
      };
      if (target.classList.contains('draggableBorder')) {
        target = target.parentElement!;
      }
      if (target.classList.contains('metadataLabels')) {
        target = target.parentElement!;
      }
      const playingElem = document.querySelector('.playing');
      if (playingElem) {
        playingElem.classList.remove('playing');
      }
      target.classList.add('playing');
      
      this.$emit('sendAudioSource', recording._id, 'recording');
    },

    toggleSort(fIdx: number, ensureCurrentState: boolean = false) {
      const field = this.metadataFields[fIdx];
      if (this.selectedSortIdx === fIdx) {
        if (
          (field.sortState === 'down' && !ensureCurrentState) || 
          (field.sortState === 'up' && ensureCurrentState)
          ) {
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
      if (a.duration > b.duration) {
        return -1;
      } else if (a.duration < b.duration) {
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



    trackNumSorter(a: RecType, b: RecType) {
      if (a.parentTrackNumber === undefined && b.parentTrackNumber === undefined) {
        return 0;
      } else if (a.parentTrackNumber === undefined && b.parentTrackNumber !== undefined) {
        return 1;
      } else if (a.parentTrackNumber !== undefined && b.parentTrackNumber === undefined) {
        return -1;
      } else {
        if (a.parentTrackNumber! < b.parentTrackNumber!) {
          return -1;
        } else if (a.parentTrackNumber! > b.parentTrackNumber!) {
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
      const playingElem = document.querySelector('.playing');
      if (playingElem) {
        playingElem.classList.remove('playing');
      }
      if (sort === 'soloist') {
        this.recs.sort(this.soloistSorter);
        if (!fromTop) {
          this.recs.reverse();
        }
      } else if (sort === 'raag') {
        this.recs.sort(this.raagSorter);
        if (!fromTop) {
          this.recs.reverse();
        }
      } else if (sort === 'pSec') {
        this.recs.sort(this.pSecSorter);
        if (!fromTop) {
          this.recs.reverse();
        }
      } else if (sort === 'duration') {
        this.recs.sort(this.durSorter);
        if (!fromTop) {
          this.recs.reverse();
        }
      } else if (sort === 'audioEvent') {
        this.recs.sort(this.trackNumSorter)
        this.recs.sort(this.eventSorter)
        if (!fromTop) {
          this.recs.reverse();
        }
      } else if (sort === 'trackNum') {
        this.recs.sort(this.trackNumSorter)
      }
      if (this.activeRecording !== undefined) {
        const idx = this.recs.findIndex(rec => {
          return rec._id === this.activeRecording!._id;
        });
        const elem = document.getElementById(`recRow${idx}`);
        if (elem) {
          elem.classList.add('playing');
        }
      }

    },

    handleDragStart(fIdx: number, event: DragEvent) {
      // Store the initial mouse position and column widths
      // event.preventDefault();
      this.initialMouseX = event.clientX;
      this.initialWidths = this.columnWidths.slice()
      // make cursor resize until drag end
      document.body.style.cursor = 'col-resize';
      

    },
    handleDrag(fIdx: number, event: DragEvent) {
      const nextCol = fIdx < this.columnWidths.length - 1;
      // Calculate the new width based on the mouse movement
      document.body.style.cursor = 'col-resize';
        if (event.clientX !== 0) {
          
          const deltaX = event.clientX - this.initialMouseX!;
          if (this.initialWidths[fIdx]! + deltaX < 50) {
            return;
          } else if (nextCol && (this.initialWidths[fIdx + 1]! - deltaX < 50)) {
            return
          } else if (this.initialWidths[fIdx] + deltaX < this.minColumnWidths[fIdx]) {
            return
          } else if (nextCol && this.initialWidths[fIdx + 1] -deltaX < this.minColumnWidths[fIdx + 1]) {
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
      document.body.style.cursor = 'auto';
      const nextCol = fIdx < this.columnWidths.length - 1;
      const deltaX = event.clientX - this.initialMouseX!;
      if (this.initialWidths[fIdx] + deltaX < 50) {
        return;
      } else if (nextCol && this.initialWidths[fIdx + 1] - deltaX < 50) {
        return
      } else if (this.initialWidths[fIdx] + deltaX < this.minColumnWidths[fIdx]) {
        return
      } else if (nextCol && this.initialWidths[fIdx + 1] -deltaX < this.minColumnWidths[fIdx + 1]) {
        return
      } else {
        this.columnWidths[fIdx] = this.initialWidths[fIdx] + deltaX;
        if (nextCol) {
          this.columnWidths[fIdx + 1] = this.initialWidths[fIdx + 1] - deltaX;
        }  
      } 
    },
  }
})
</script>
<style scoped>

.miniARMain {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  color: white;
  box-sizing: border-box;
  border: 1px solid #ccc;
  width: 100%;

  background-image: linear-gradient(black, #1e241e);
}

.labelRow { 
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  min-height: v-bind(labelRowHeight + 'px');
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
  overflow-y: hidden;
  height: 30px;
  margin-left: 5px;
  margin-right: 5px;
  user-select: none;
}

.sortTriangle.down {
  transform: rotate(90deg);
}

.sortTriangle.up {
  transform: rotate(-90deg);
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
  cursor: col-resize;
  
  user-select: none;
  background-color: pink
}

.draggableBorder:hover {
  cursor: col-resize
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
}

.playing {
  background-color: #3e4a40;
}

.recordingRow:hover {
  background-color: #2b332c;
}

</style>