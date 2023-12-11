<template>
  <div class='miniAEMain'>
    <div class='labelRow'>
      <div class='metadataLabels'
        v-for='(field, fIdx) in metadataFields'
        :style='{
          "width": columnWidths[fIdx] + "px",
          "max-width": fIdx === metadataFields.length - 3 ? "" : columnWidths[fIdx] + "px",
          "min-width": minColumnWidths[fIdx] + "px",
          "flex-grow": fIdx === metadataFields.length - 3 ? 1 : 0,
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
        class='aeRow'
        v-for='(ae, aeIdx) in audioEvents'
        :id='`aeRow${aeIdx}`'
        >
        <div 
          class='metadataLabels'
          v-for='(field, fIdx) in metadataFields'
          :style='{
            "width": columnWidths[fIdx] + "px",
            "max-width": fIdx === metadataFields.length - 3 ? "" : columnWidths[fIdx] + "px",
            "min-width": minColumnWidths[fIdx] + "px",
            "flex-grow": fIdx === metadataFields.length - 3 ? 1 : 0,
          }'
          >
          <span class='field'>
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
  columnWidths: number[],
  minColumnWidths: number[],
  initialWidths: number[],
  selectedSortIdx: number,
  labelRowHeight: number,
  initialMouseX?: number,
  
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
      selectedSortIdx: 0,
      labelRowHeight: 40,
      initialMouseX: undefined,
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
    try {
      this.audioEvents = await getAEsFromIds(this.aeIds);

    } catch (err) {
      console.log(err);
    }
  },
  components: {
  },
  computed: {
  },

  methods: {

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
  border-top: 1px solid grey;
}

.aeRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  min-height: 40px;
  width: 100%;
  border-bottom: 1px solid grey;
  /* overflow-x: hidden; */
}
</style>