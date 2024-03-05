<template>
  <div class='tableMain'>
    <div class='labelRow'>
      <div 
        class='metadataLabels'
        v-for='(labelObj, lIdx) in labels'
        :style='{
          "width": colWidths[lIdx] + "px",
          "min-width": colWidths[lIdx] + "px",
          "position": "relative",
        }'
        >
        <span class='field'>
          {{ labelObj.label }}
          <span
            v-if='labelObj.sortFunction !== undefined'
            :class='`sortTriangle ${ sortStates[lIdx] }`'
            @click='toggleSort(lIdx)'
            :style='{
              "color": lIdx === selectedSortIdx ? "white" : "black",
            }'
            >
            &#9654;
          </span>
        </span>
        <div
          v-if='lIdx !== labels.length - 1'
          class='draggableBorder'
          draggable='true'
          @dragstart='handleDragStart(lIdx, $event)'
          @drag='handleDrag(lIdx, $event)'
          @dragend='handleDragEnd(lIdx, $event)'
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
        v-for='(row, rIdx) in displayableData'
        :class='`dataRow ${viewable[rIdx] ? "" : "disabled"}`'
        @dblclick='viewable[rIdx] ? 
          $emit("rowdblclick", items[rIdx]) : 
          null'
        >
        <div
          class='metadataLabels'
          v-for='(labelObj, lIdx) in labels'
          :style='{
            "width": colWidths[lIdx] + "px",
            "min-width": colWidths[lIdx] + "px",
          }'
          >
          <span class='field'>{{ displayableData[rIdx][lIdx] }}</span>
          <div 
            class='draggableBorder'
            draggable='true'
            @dragstart='handleDragStart(lIdx, $event)'
            @drag='handleDrag(lIdx, $event)'
            @dragend='handleDragEnd(lIdx, $event)'
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang='ts'>
import { defineComponent, PropType } from 'vue';
import { SortState } from '@/ts/enums.ts';
import { 
  RecType, 
  FilterableTableType, 
  TransMetadataType,
  UserCheckType,
} from '@/ts/types.ts';

type FilterableTableDataType = {
  colWidths: number[],
  sortStates: SortState[],
  selectedSortIdx?: number,
  initialMouseX?: number,
  initialWidths: number[],
  labelRowHeight: number,
  displayableData: (string | number)[][],
  viewable: boolean[],
  editable: boolean[],
}

export default defineComponent({
  name: 'FilterableTable',
  data(): FilterableTableDataType {
    return {
      colWidths: [],
      sortStates: [],
      selectedSortIdx: 0,
      initialMouseX: undefined,
      initialWidths: [],
      labelRowHeight: 40,
      displayableData: [],
      viewable: [],
      editable: [],
    }
  },

  mounted() {
    this.colWidths = this.labels.map(label => label.minWidth);
    // get total window width. If it's more than the sum of the minWidths, then
    // distribute the extra space to the growable columns
    this.resetWidths();
    this.sortStates = this.labels.map(label => label.initSortState);
    this.displayableData = this.items.map((item, idx) => {
      return this.labels.map(label => label.getDisplay(item));
    })
    this.viewable = this.items.map(item => this.canView(item, this.userID));
    this.editable = this.items.map(item => this.canEdit(item, this.userID));
    this.$el.style.setProperty('--height-offset', `${this.heightOffset}px`);
    window.addEventListener('resize', this.resetWidths);


  },

  beforeUnmount() {
    window.removeEventListener('resize', this.resetWidths);
  },

  props: {
    labels: {
      type: Array as PropType<FilterableTableType[]>,
      required: true
    },
    items: {
      type: Array as PropType<(RecType[] | TransMetadataType[] )>,
      required: true
    },
    canView: {
      type: Function as PropType<UserCheckType>,
      required: true
    },
    canEdit: {
      type: Function as PropType<UserCheckType>,
      required: true
    },
    userID: {
      type: String,
      required: true
    },
    heightOffset: {
      type: Number,
      required: true
    }
  },

  methods: {

    resetWidths() {
      const totalWidth = this.colWidths.reduce((acc, cur) => acc + cur, 0);
      if (totalWidth < window.innerWidth) {
        const growableCols = this.labels.filter(label => label.growable);
        const extraSpace = (window.innerWidth - totalWidth) / growableCols.length;
        growableCols.forEach((col, i) => {
          this.colWidths[this.labels.indexOf(col)] += extraSpace;
        })
      } else if (totalWidth > window.innerWidth) {
        const delta = totalWidth - window.innerWidth;
        this.colWidths.forEach((col, i) => {
          this.colWidths[i] -= delta * (col / totalWidth);
        })
        const lessThanMinIdxs = this.colWidths.reduce((acc, cur, idx) => {
          if (cur < this.labels[idx].minWidth) {
            acc.push(idx);
          }
          return acc;
        }, [] as number[]);
        let overshoot = 0;
        lessThanMinIdxs.forEach(idx => {
          overshoot += this.labels[idx].minWidth - this.colWidths[idx];
          this.colWidths[idx] = this.labels[idx].minWidth;
        })
        const restIdxs = this.colWidths.reduce((acc, cur, idx) => {
          if (!lessThanMinIdxs.includes(idx)) {
            acc.push(idx);
          }
          return acc;
        }, [] as number[]);
        const restDelta = overshoot / restIdxs.length;
        restIdxs.forEach(idx => {
          this.colWidths[idx] += restDelta;
        })
      }
    },

    toggleSort(idx: number, ensureCurrentState = false) {
      const field = this.labels[idx];
      if (field.sortFunction === undefined) {
        return;
      }
      if (this.selectedSortIdx === idx) {
        if (
          (this.sortStates[idx] === SortState.down && !ensureCurrentState) ||
          (this.sortStates[idx] === SortState.up && ensureCurrentState)
        ) {
          this.sortStates[idx] = SortState.up;
          this.sortItems({
            sortFunc: field.sortFunction,
            fromTop: false
          })
        } else {
          this.sortStates[idx] = SortState.down;
          this.sortItems({
            sortFunc: field.sortFunction,
            fromTop: true
          })
        }
      } else {
        this.sortItems({
          sortFunc: field.sortFunction,
          fromTop: this.sortStates[idx] === SortState.down
        })
      }
      this.displayableData = this.items.map((item, idx) => {
        return this.labels.map(label => label.getDisplay(item));
      })
      
      this.selectedSortIdx = idx;
    },

    sortItems({ 
      sortFunc = undefined, 
      fromTop = true 
    }: {
      sortFunc?: (a: any, b: any) => number,
      fromTop?: boolean
    } = {}) {
      this.items.sort(sortFunc);
      if (!fromTop) {
        this.items.reverse();
      }
    },

    handleRightClick(e: MouseEvent) {
      e.preventDefault();
      console.log('right click');
    },

    handleDragStart(idx: number, e: DragEvent) {
      this.initialMouseX = e.clientX;
      this.initialWidths = this.colWidths.slice();
      document.body.style.cursor = 'ew-resize'; // might not need this one
    },

    handleDrag(idx: number, e: DragEvent) {
      const nextColExists = idx < this.colWidths.length - 1;
      document.body.style.cursor = 'col-resize';
      if (e.clientX !== 0) {
        const deltaX = e.clientX - this.initialMouseX!;
        const initW = this.initialWidths[idx];
        const nextInitW = this.initialWidths[idx + 1];
        const nextMinW = this.labels[idx + 1].minWidth;
        if (initW + deltaX < this.labels[idx].minWidth) {
          return;
        } else if (nextColExists && (nextInitW - deltaX < nextMinW)) {
          return;
        } else {
          this.colWidths[idx] = initW + deltaX;
          if (nextColExists) {
            this.colWidths[idx + 1] = nextInitW - deltaX;
          }
        }
      }
    },

    handleDragEnd(idx: number, e: DragEvent) {
      document.body.style.cursor = 'default';
      const nextColExists = idx < this.colWidths.length - 1;
      const deltaX = e.clientX - this.initialMouseX!;
      const nextMinCW = this.labels[idx + 1].minWidth;
      if (this.initialWidths[idx] + deltaX < this.labels[idx].minWidth) {
        return;
      } else if (nextColExists && (this.initialWidths[idx + 1] - deltaX < nextMinCW)) {
        return;
      } else {
        this.colWidths[idx] = this.initialWidths[idx] + deltaX;
        if (nextColExists) {
          this.colWidths[idx + 1] = this.initialWidths[idx + 1] - deltaX;
        }
      }
      this.initialMouseX = undefined;
    }
  }
})

</script>
<style scoped>

.tableMain {
  background-color: black;
  background-image: linear-gradient(black, #1e241e);
  color: white;
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

.dataRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  min-height: 40px;
  width: 100%;
  border-bottom: 1px solid grey;
}

.dataRow.disabled {
  color: grey;
}

.dataRow:hover {
  background-color: #1e241e;
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
  cursor: col-resize;
  
  user-select: none;
  background-color: pink
}

.draggableBorder:hover {
  cursor: col-resize
}

.sortTriangle.down {
  transform: rotate(90deg);
}

.sortTriangle.up {
  transform: rotate(-90deg);
}

.fileContainer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--height-offset) - 80px);
  width: 100%;
  user-select: none;
  overflow-y: scroll;
  overflow-x: hidden;
  border-top: 1px solid grey;
}
</style>