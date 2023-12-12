<template>
  <div class='miniAEMain'>
    <div class='labelRow'>
      <div class='metadataLabels'
        v-for='(field, fIdx) in metadataFields'
        :style='{
          "width": columnWidths[fIdx] + "px",
          "max-width": fIdx === 0 ? "" : columnWidths[fIdx] + "px",
          "min-width": minColumnWidths[fIdx] + "px",
          "flex-grow": fIdx === 0 ? 1 : 0,
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
      ref='fileContainer'
      >
      <div 
        class='aeRowHolder' 
        v-for='(ae, aeIdx) in audioEvents'
        :style='{ "min-height": getAERowHeight(ae) + "px" }'
        >
        <div 
          :class='aeRowClass(aeIdx, audioEvents)'
          :id='`aeRow${aeIdx}`'
          @dblclick='toggleDisplay($event, ae, true)'
          >
          <div 
            class='metadataLabels'
            v-for='(field, fIdx) in metadataFields'
            :style='{
              "width": columnWidths[fIdx] + "px",
              "max-width": fIdx === 0 ? "" : columnWidths[fIdx] + "px",
              "min-width": minColumnWidths[fIdx] + "px",
              "flex-grow": fIdx === 0 ? 1 : 0,
            }'
            >
            
            <span class='field'>
              <span 
                class='tri' 
                v-if='fIdx === 0' 
                @click='toggleDisplay($event, ae, false)'
                >&#9654;</span>
              {{ field.func(ae) }}
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
          class='recsHolder'
          :style='{ "min-height": getAERowHeight(ae) - rowHeight + "px" }'
          v-if='ae.visible'
          >
          <div class='recsLabelRow'>
            <div class='recsMetadataLabels' 
              v-for='(field, fIdx) in recMetadataFields'
              :style='{
                "width": recColumnWidths[fIdx] + "px",
                "max-width": fIdx === 1 ? "" : recColumnWidths[fIdx] + "px",
                "min-width": recMinColumnWidths[fIdx] + "px",
                "flex-grow": fIdx === 1 ? 1 : 0,
                "position": "relative",
              }'
              >
              <span class='field'>
                {{ field.name }}
              </span>
              <div 
                class='draggableBorder'
                draggable='true'
                @dragstart='recHandleDragStart(fIdx, $event)'
                @drag='recHandleDrag(fIdx, $event)'
                @dragend='recHandleDragEnd(fIdx, $event)'
                >
              </div>
            </div>
          </div>
          <div 
            class='recRow'
            v-for='(recKey, recIdx) in Object.keys(ae.recordings)'
            >
            <div 
              :class='recClass(recIdx, aeIdx, audioEvents)'
              v-for='(field, fIdx) in recMetadataFields'
              :style='{
                "width": recColumnWidths[fIdx] + "px",
                "max-width": fIdx === 1 ? "" : recColumnWidths[fIdx] + "px",
                "min-width": recMinColumnWidths[fIdx] + "px",
                "flex-grow": fIdx === 1 ? 1 : 0,
              }'
              >
              <span class='field'>
                {{ field.func(ae.recordings[Number(recKey)]) }}
              </span>
              <div 
                class='draggableBorder'
                draggable='true'
                @dragstart='recHandleDragStart(fIdx, $event)'
                @drag='recHandleDrag(fIdx, $event)'
                @dragend='recHandleDragEnd(fIdx, $event)'
                >
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  </div>
</template>

<script lang='ts'>

import { defineComponent, PropType } from 'vue';
import { displayTime } from '@/ts/utils';
import type { 
  RecType, 
  AudioEventType 
} from '@/components/audioEvents/AddAudioEvent.vue';
import { getAEsFromIds } from '@/js/serverCalls';

type MiniAudioEventsDataType = {
  audioEvents: AudioEventType[],
  metadataFields: {
    name: string,
    func: (ae: AudioEventType) => string,
    sortState: 'up' | 'down',
    sortType?: string
  }[],
  recMetadataFields: {
    name: string,
    func: (rec: RecType) => string,
  }[],
  columnWidths: number[],
  minColumnWidths: number[],
  initialWidths: number[],
  recColumnWidths: number[],
  recMinColumnWidths: number[],
  recInitialWidths: number[],
  selectedSortIdx: number,
  labelRowHeight: number,
  initialMouseX?: number,
  indentWidth: number,
  rowHeight: number
  
}

export default defineComponent({
  name: 'MiniAudioEvents',
  data(): MiniAudioEventsDataType {
    return {
      audioEvents: [],
      metadataFields: [
        {
          name: 'Title',
          func: (ae: AudioEventType) => ae.name,
          sortState: 'down',
          sortType: 'title'
        },
        {
          name: 'Primary Soloist',
          func: this.getSoloist as (ae: AudioEventType) => string,
          sortState: 'down',
          sortType: 'soloist'
        },
        { 
          name: 'Event Type',
          func: (ae: AudioEventType) => ae['event type'],
          sortState: 'down',
          sortType: 'eventType'
        },
        {
          name: 'Recordings', // number of recordings
          func: (ae: AudioEventType) => {
            return Object.keys(ae.recordings).length.toString();
          },
          sortState: 'down',
          sortType: 'numRecs'
        },
        {
          name: 'Total Duration',
          func: (ae: AudioEventType) => {
            const recKeys = Object.keys(ae.recordings);
            let totalDuration = 0;
            recKeys.forEach(recKey => {
              const rec = ae.recordings[Number(recKey)];
              totalDuration += rec.duration;
            });
            return displayTime(totalDuration);
          },
          sortState: 'down',
          sortType: 'totalDuration'
        }
      ],

      columnWidths: [200, 150, 150, 125, 140],
      initialWidths: [200, 150, 150, 125, 140],
      minColumnWidths: [80, 150, 120, 125, 140],
      recColumnWidths: [140, 160, 150, 150, 125],
      recInitialWidths: [140, 160, 150, 150, 125],
      recMinColumnWidths: [70, 80, 70, 80, 80],
      selectedSortIdx: 0,
      labelRowHeight: 40,
      initialMouseX: undefined,
      recMetadataFields: [
        {
          name: 'Track #',
          func: (rec: RecType) => {
            return rec.parentTrackNumber ? rec.parentTrackNumber : 'None';
          }, 
        },
        {
          name: 'Soloist',
          func: (rec: RecType) => {
            const keys = Object.keys(rec.musicians).filter(key => {
              return rec.musicians[key].role === 'Soloist';
            });
            if (keys.length > 0) {
              return keys[0];
            } else {
              return 'Unknown';
            }         
          },
        },
        {
          name: 'Raag',
          func: (rec: RecType) => {
            return Object.keys(rec.raags).join(', ');
          },
        },
        {
          name: 'Section',
          func: (rec: RecType) => {
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
          name: 'Duration',
          func: (rec: RecType) => {
            return displayTime(rec.duration);
          },
        },
      ],
      indentWidth: 40,
      rowHeight: 40,
    }
  },
  props: {
    aeIds: {
      type: Array as PropType<string[]>,
      required: true
    },
  },

  async mounted() {
    const summedWidths = this.columnWidths.reduce((a, b) => a + b, 0);
    const ratio = this.$el.offsetWidth / summedWidths;
    this.columnWidths = this.columnWidths.map(w => w * ratio);
    this.initialWidths = this.columnWidths.slice();

    const summedRecWidths = this.recColumnWidths.reduce((a, b) => a + b, 0);
    const recRatio = (this.$el.offsetWidth - this.indentWidth) / summedRecWidths;
    this.recColumnWidths = this.recColumnWidths.map(w => w * recRatio);
    this.recInitialWidths = this.recColumnWidths.slice();

    // handle resizing
    window.addEventListener('resize', () => {
      const summedWidths = this.columnWidths.reduce((a, b) => a + b, 0);
      const ratio = this.$el.offsetWidth / summedWidths;
      this.columnWidths = this.columnWidths.map(w => w * ratio);
      this.initialWidths = this.columnWidths.slice();

      const summedRecWidths = this.recColumnWidths.reduce((a, b) => a + b, 0);
      const recRatio = (this.$el.offsetWidth - this.indentWidth) / summedRecWidths;
      this.recColumnWidths = this.recColumnWidths.map(w => w * recRatio);
      this.recInitialWidths = this.recColumnWidths.slice();
    });
    try {
      this.audioEvents = await getAEsFromIds(this.aeIds);
      // add parentTrackNumber to each recording
      this.audioEvents.forEach(ae => {
        const recKeys = Object.keys(ae.recordings);
        recKeys.forEach(recKey => {
          const rec = ae.recordings[Number(recKey)];
          rec.parentTrackNumber = recKey;
        });
      });

    } catch (err) {
      console.log(err);
    }
  },

  beforeUnmount() {
    window.removeEventListener('resize', () => {
      const summedWidths = this.columnWidths.reduce((a, b) => a + b, 0);
      const ratio = this.$el.offsetWidth / summedWidths;
      this.columnWidths = this.columnWidths.map(w => w * ratio);
      this.initialWidths = this.columnWidths.slice();

      const summedRecWidths = this.recColumnWidths.reduce((a, b) => a + b, 0);
      const recRatio = (this.$el.offsetWidth - this.indentWidth) / summedRecWidths;
      this.recColumnWidths = this.recColumnWidths.map(w => w * recRatio);
      this.recInitialWidths = this.recColumnWidths.slice();
    });
  },
  components: {
  },
  computed: {
  },

  methods: {

    getAERowHeight(ae: AudioEventType) {
      if (ae.visible === undefined || ae.visible === false ) {
        return this.rowHeight;
      } else {
        const recKeys = Object.keys(ae.recordings);
        let totalHeight = this.rowHeight;
        recKeys.forEach(recKey => {
          const rec = ae.recordings[Number(recKey)];
          totalHeight += this.rowHeight;
        });
        totalHeight += this.rowHeight; // for the rec label row
        return totalHeight;
      }
    },

    toggleDisplay(t: MouseEvent, audioEvent: AudioEventType, parent: boolean) {
      if (!parent) {
        const target = t.target as HTMLElement;
        if (target.classList.contains('rotated')) {
          audioEvent.visible = undefined
        } else {
          audioEvent.visible = true;
        }
        target.classList.toggle('rotated');
        const row = target.parentElement!.parentElement!.parentElement!;
        row.classList.toggle('visible');
      } else {
        let target = t.target as HTMLElement;
        target = target.parentElement!;
        if (target.classList.contains('metadataLabels')) {
          target = target.parentElement!;
        }
        if (target.classList.contains('aeRow')) {
          target = target.querySelector('.tri') as HTMLElement;
          if (target.classList.contains('rotated')) {
            audioEvent.visible = undefined
          } else {
            audioEvent.visible = true;
          }
          target.classList.toggle('rotated')
          const row = target.parentElement!.parentElement!.parentElement!;
          row.classList.toggle('visible');
        } 
      }
    },

    getSoloist(ae: AudioEventType) {
      const recKeys = Object.keys(ae.recordings);
      const soloists: { [key: string]: number } = {};
      recKeys.forEach(recKey => {
        const rec = ae.recordings[Number(recKey)]
        const musicians = rec.musicians;
        const musKeys = Object.keys(musicians);
        musKeys.forEach(musKey => {
          const mus = musicians[musKey];
          if (mus.role === 'Soloist') {
            if (soloists[musKey] !== undefined) {
              soloists[musKey] += 1;
            } else {
              soloists[musKey] = 1;
            }
          }
        })
      });
      const soloistKeys = Object.keys(soloists);
      if (soloistKeys.length === 0) {
        return '';
      } else {
        const soloistVals = soloistKeys.map(key => soloists[key]);
        const idxOfMaxVal = soloistVals.indexOf(Math.max(...soloistVals));
        return soloistKeys[idxOfMaxVal]
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

    recHandleDragStart(fIdx: number, event: DragEvent) {
      // Store the initial mouse position and column widths
      // event.preventDefault();
      this.initialMouseX = event.clientX;
      this.recInitialWidths = this.recColumnWidths.slice()
      // make cursor resize until drag end
      document.body.style.cursor = 'col-resize';
    },

    recHandleDrag(fIdx: number, event: DragEvent) {
      const nextCol = fIdx < this.recColumnWidths.length - 1;
      // Calculate the new width based on the mouse movement
      document.body.style.cursor = 'col-resize';
        if (event.clientX !== 0) {
          
          const deltaX = event.clientX - this.initialMouseX!;
          if (this.recInitialWidths[fIdx]! + deltaX < 50) {
            return;
          } else if (nextCol && (this.recInitialWidths[fIdx + 1]! - deltaX < 50)) {
            return
          } else if (this.recInitialWidths[fIdx] + deltaX < this.recMinColumnWidths[fIdx]) {
            return
          } else if (nextCol && this.recInitialWidths[fIdx + 1] -deltaX < this.recMinColumnWidths[fIdx + 1]) {
            return
          } else {
            this.recColumnWidths[fIdx] = this.recInitialWidths[fIdx]! + deltaX;
            if (nextCol) {
              this.recColumnWidths[fIdx + 1] = this.recInitialWidths[fIdx + 1] - deltaX;
            }

          }
      }
    },

    recHandleDragEnd(fIdx: number, event: DragEvent) {
      document.body.style.cursor = 'auto';
      const nextCol = fIdx < this.recColumnWidths.length - 1;
      const deltaX = event.clientX - this.initialMouseX!;
      if (this.recInitialWidths[fIdx] + deltaX < 50) {
        return;
      } else if (nextCol && this.recInitialWidths[fIdx + 1] - deltaX < 50) {
        return
      } else if (this.recInitialWidths[fIdx] + deltaX < this.recMinColumnWidths[fIdx]) {
        return
      } else if (nextCol && this.recInitialWidths[fIdx + 1] -deltaX < this.recMinColumnWidths[fIdx + 1]) {
        return
      } else {
        this.recColumnWidths[fIdx] = this.recInitialWidths[fIdx] + deltaX;
        if (nextCol) {
          this.recColumnWidths[fIdx + 1] = this.recInitialWidths[fIdx + 1] - deltaX;
        }  
      } 
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

    titleSorter(a: AudioEventType, b: AudioEventType) {
      if (a.name < b.name) {
        return -1;
      } else if (a.name > b.name) {
        return 1
      } else {
        return 0;
      }
    },

    soloistSorter(a: AudioEventType, b: AudioEventType) {
      const aSoloist = this.getSoloist(a);
      const bSoloist = this.getSoloist(b);
      if (aSoloist < bSoloist) {
        return -1;
      } else if (aSoloist > bSoloist) {
        return 1
      } else {
        return 0;
      }
    },

    eventTypeSorter(a: AudioEventType, b: AudioEventType) {
      if (a['event type'] < b['event type']) {
        return -1;
      } else if (a['event type'] > b['event type']) {
        return 1
      } else {
        return 0;
      }
    },

    numRecsSorter(a: AudioEventType, b: AudioEventType) {
      const aNumRecs = Object.keys(a.recordings).length;
      const bNumRecs = Object.keys(b.recordings).length;
      if (aNumRecs < bNumRecs) {
        return -1;
      } else if (aNumRecs > bNumRecs) {
        return 1
      } else {
        return 0;
      }
    },

    totalDurationSorter(a: AudioEventType, b: AudioEventType) {
      const aRecKeys = Object.keys(a.recordings);
      let aTotalDuration = 0;
      aRecKeys.forEach(recKey => {
        const rec = a.recordings[Number(recKey)];
        aTotalDuration += rec.duration;
      });
      const bRecKeys = Object.keys(b.recordings);
      let bTotalDuration = 0;
      bRecKeys.forEach(recKey => {
        const rec = b.recordings[Number(recKey)];
        bTotalDuration += rec.duration;
      });
      if (aTotalDuration < bTotalDuration) {
        return -1;
      } else if (aTotalDuration > bTotalDuration) {
        return 1
      } else {
        return 0;
      }
    },

    sortRecordings({
      sort='title',
      fromTop=true
    }:{
      sort?: string,
      fromTop?: boolean
    } = {}) {
      const playingElem = document.querySelector('.playing');
      if (playingElem) {
        playingElem.classList.remove('playing');
      }
      let sortFunc: (a: AudioEventType, b: AudioEventType) => number;
      if (sort === 'title') {
        sortFunc = this.titleSorter;
      } else if (sort === 'soloist') {
        sortFunc = this.soloistSorter;
      } else if (sort === 'eventType') {
        sortFunc = this.eventTypeSorter;
      } else if (sort === 'numRecs') {
        sortFunc = this.numRecsSorter;
      } else if (sort === 'totalDuration') {
        sortFunc = this.totalDurationSorter;
      } else {
        sortFunc = this.titleSorter;
      }
      this.audioEvents.sort(sortFunc);
      if (!fromTop) {
        this.audioEvents.reverse();
      }
    },

    aeRowClass(aeIdx: number, AEs: AudioEventType[]) {
      if (aeIdx === 0) {
        return 'aeRow first';
      } else if (AEs[aeIdx-1].visible) {
        return 'aeRow borderAbove';
      } else {
        return 'aeRow';
      }
    },

    recClass(recIdx: number, aeIdx: number, AEs: AudioEventType[]) {
      const ae = AEs[aeIdx];
      const c1 = recIdx === (Object.keys(ae.recordings).length - 1);
      const c2 = aeIdx === (AEs.length - 1);
      if (c1 && c2) {
        return 'recsMetadataLabels lastRec';
      } else {
        return 'recsMetadataLabels';
      }
    }
  }
})
</script>

<style scoped>

.miniAEMain {
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
  /* border-bottom: 1px solid grey; */
}

.aeRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  min-height: 40px;
  width: 100%;
  border-bottom: 1px solid grey;
}

.aeRow.first {
  border-top: 1px solid grey;
}

.aeRow.borderAbove {
  border-top: 1px solid grey;

}

.aeRow:hover {
  background-color: #2b332c;
}

.tri {
  color: white;
}

.tri.rotated {
  transform: rotate(90deg);
}

.aeRowHolder {
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: center;
  width: 100%;
}

.recsHolder {
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: center;
  width: calc(100% - 40px);
  margin-left: v-bind(indentWidth + 'px');
  box-sizing: border-box;
  border-left: 1px solid grey;
}

.recsLabelRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  min-height: v-bind(rowHeight + 'px');
  width: 100%;
  /* border-bottom: 1px solid grey; */
  box-sizing: border-box;
  background-color: #343A35;
}

.recsMetadataLabels {
  text-align: center;
  border-right: 1px solid grey;
  height: 40px;
  position: relative;
  white-space: nowrap;
  /* margin-left: 5px;
  margin-right: 5px; */
  user-select: none;
  box-sizing: border-box;
  border-bottom: 1px solid grey;
}

.recsMetadataLabels.lastRec {
  border-bottom: 1px solid grey;
}

.recRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  min-height: v-bind(rowHeight + 'px');
  width: 100%;
  /* border-bottom: 1px solid grey; */
  box-sizing: border-box;
  background-color: #202621;
}

.recRow:hover {
  background-color: #2b332c;
}
</style>