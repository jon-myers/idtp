<template>
  <div 
    :class='`dropDown + ${ closed ? "closed" : "" }`' 
    :style='{ top: y + "px", left: x + "px" }'
    >
    <div 
      :class='`dropDownRow ${choices && cIdx === choices.length - 1 ? "last" : "" }`' 
      v-for='(choice, cIdx) in choices' 
      @click='choice.action'
      >
      {{ choice.text }}
    </div>
  </div>

</template>

<script lang='ts'>
import { defineComponent } from 'vue';
import type { PropType } from 'vue';

type ContextMenuDataType = {
  dropDownWidth: number
}


export default defineComponent({
  name: 'ContextMenu',
  props: {
    x: Number,
    y: Number,
    choices: Array as PropType<{ text: string, action: () => void }[]>,
    closed: Boolean
  },

  data(): ContextMenuDataType {
    return {
      dropDownWidth: 200
    }
  }
});


</script>

<style scoped>

.dropDown {
  position: absolute;
  background-color: black;
  width: v-bind(dropDownWidth + 'px');
  border: 1px solid grey;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  user-select: none;
}

.dropDown.closed {
  visibility: hidden;
  opacity: 0;
  transition: visibility 0s 0.15s, opacity 0.15s linear;
}

.dropDownRow {
  color: white;
  border-radius: 5px;
  height: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  padding-left: 8px;
  margin-left: 8px;
  margin-right: 8px;
  margin-top: 6px;
  width: v-bind(dropDownWidth - 24 + 'px');
}

.dropDownRow:hover {
  background-color: blue;
  cursor: pointer;
}

.dropDownRow.last {
  margin-bottom: 6px;
}

.dropDownRow.inactive:hover {
  background-color: black;
  cursor: auto;
}

.dropDownRow.inactive {
  color: grey;
}
</style>