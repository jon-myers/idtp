<template>
  <div class='miniTMain'>
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
      ref='fileContainer'
      >
      <div 
        class='transcriptionRow'
        v-for='(transcription, rIdx) in trans'
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
          <span class='field'>{{ field.func(transcription) }}</span>
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
import { getTranscriptionsFromIds } from '@/js/serverCalls.ts';

type TranscriptionMetadataType = {
  title: string,
  audioID: string,
  dateCreated: string,
  dateModified: string,
  durTot: number,
  family_name: string,
  given_name: string,
  instrumentation: string[],
  location: string,
  name: string,
  permissions: string,
  performers: string[],
  raga: {
    name: string,
    fundamental: number,
    ratios: number[]
  },
  transcriber: string,
  userID: string,
  _id: string
}

// title, transcriber, raga, created, modified, permissions

type MiniTranscriptionsDataType = {
  trans: TranscriptionMetadataType[],
  columnWidths: number[],
  minColumnWidths: number[],
  initialWidths: number[],
  metadataFields: {
    name: string,
    func: (t: TranscriptionMetadataType) => string,
    sortType?: string,
    sortState?: 'up' | 'down',
  }[],
  initialMouseX?: number,
  selectedSortIdx: number,
  labelRowHeight: number,
}
export default defineComponent({
  name: 'MiniTranscriptions',
  props: {
    tIds: {
      type: Array as PropType<string[]>,
      required: true
    },
  },
  data(): MiniTranscriptionsDataType {
    return {
      trans: [],
      metadataFields: [
        {
          name: 'Title',
          func: (t: TranscriptionMetadataType) => t.title,
          sortType: 'title',
          sortState: 'down'
        },
        {
          name: 'Transcriber',
          func: (t: TranscriptionMetadataType) => t.name,
          sortType: 'transcriber',
          sortState: 'down'
        },
        {
          name: 'Raga',
          func: (t: TranscriptionMetadataType) => t.raga.name,
          sortType: 'raga',
          sortState: 'down'
        },
        {
          name: 'Created',
          func: (t: TranscriptionMetadataType) => {
            const date = new Date(t.dateCreated);
            return date.toLocaleDateString();
          },
          sortType: 'created',
          sortState: 'down'
        },
        {
          name: 'Modified',
          func: (t: TranscriptionMetadataType) => {
            const date = new Date(t.dateModified);
            return date.toLocaleDateString();
          },
          sortType: 'modified',
          sortState: 'down'
        },
        {
          name: 'Permissions',
          func: (t: TranscriptionMetadataType) => t.permissions,
          sortType: 'permissions',
          sortState: 'down'
        },
      ],
      columnWidths: [100, 100, 100, 100, 100, 100],
      minColumnWidths: [80, 80, 80, 80, 80, 80],
      initialWidths: [100, 100, 100, 100, 100, 100],
      initialMouseX: undefined,
      selectedSortIdx: 0,
      labelRowHeight: 40,

    }
  },

  async mounted() {
    const summedWidths = this.columnWidths.reduce((a, b) => a + b, 0);
    const ratio = this.$el.offsetWidth / summedWidths;
    this.columnWidths = this.columnWidths.map(width => width * ratio);
    this.initialWidths = this.columnWidths.slice();
    try {
      this.trans = await getTranscriptionsFromIds(this.tIds);
    } catch (err) {
      console.error(err);
    }
  },
  methods: {

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
          this.sortTranscriptions({ sort: field.sortType, fromTop: false });
        } else {
          field.sortState = 'down';
          this.sortTranscriptions({ sort: field.sortType, fromTop: true });
        }
      } else {
        this.sortTranscriptions({ 
          sort: field.sortType, 
          fromTop: field.sortState === 'down' 
        });
      }

      this.selectedSortIdx = fIdx;
    },

    titleSorter(a: TranscriptionMetadataType, b: TranscriptionMetadataType) {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      if (aTitle < bTitle) {
        return -1;
      } else if (aTitle > bTitle) {
        return 1;
      } else {
        return 0;
      }
    },

    sortTranscriptions({
      sort='title',
      fromTop=true
    }: {
      sort?: string,
      fromTop?: boolean
    } = {}) {
      let sorter;
      if (sort === 'title') {
        sorter = this.titleSorter;
      }
      this.trans.sort(sorter);

    }
  },
  computed: {
  }
})
</script>

<style scoped>

.miniTMain {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  color: white;
  box-sizing: border-box;
  border: 1px solid #ccc;
  /* width: 100%; */
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

.transcriptionRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  min-height: 40px;
  width: 100%;
  border-bottom: 1px solid grey;
}

.transcriptionRow:hover {
  background-color: #2b332c;
}
</style>
