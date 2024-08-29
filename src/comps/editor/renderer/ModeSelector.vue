<template>
  <div class='modeSelectorMain' :style='cssVars' ref='modeSelectorMain'>
    <div
      class='tile'
      v-for='mode in possibleModeTiles' 
      :key='mode'
      :id='String(mode)'
      @click='() => $emit("update:selectedMode", mode)'
      >
      <div class='tileText'>
        {{ typeof mode === 'string' ? mode[0] : mode }}
      </div>
    </div>
  </div>
</template>

<script lang='ts'>
import { defineComponent, ref, onMounted, PropType, computed, watch } from 'vue';
import { EditorMode } from '@/ts/enums.ts';
export default defineComponent({
  name: 'ModeSelector',
  props: {
    selectedMode: {
      type: [String, Number] as PropType<EditorMode | Record<string, number> | number>,
    },
    height: {
      type: Number,
      required: true
    },
    enum: {
      type: Object as PropType<Record<string, string | number>>,
      required: true
    },
    noneEnumItem: {
      type: [String, Number] as PropType<string | number>,
      required: true
    }
  },
  setup(props) {
    const modeSelectorMain = ref<HTMLDivElement | null>(null);
    const possibleModeTiles = ref<(string | number)[]>(Object.values(props.enum));
    const noneIdx = possibleModeTiles.value.indexOf(props.noneEnumItem);
    if (noneIdx > -1) {
      possibleModeTiles.value.splice(noneIdx, 1);
    }

    watch(() => props.selectedMode, newMode => {
      if (modeSelectorMain.value) {
        const tiles = modeSelectorMain.value.querySelectorAll('.tile');
        tiles.forEach(tile => {
          if (tile.id === String(newMode)) {
            tile.classList.add('selected');
          } else {
            tile.classList.remove('selected');
          }
        });
      }
    });

    const cssVars = computed(() => {
      return {
        '--height': `${props.height}px`
      }
    })
    onMounted(() => {
      const tiles = modeSelectorMain.value?.querySelectorAll('.tile');
      tiles?.forEach(tile => {
        if (tile.id === String(props.selectedMode)) {
          tile.classList.add('selected');
        }
      });
    });

    return {
      modeSelectorMain,
      possibleModeTiles,
      cssVars
    }
  }
})
</script>

<style scoped>
.modeSelectorMain {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  background-color: #202621
}

.tile {
  width: var(--height);
  height: var(--height);
  border: 1px solid lightgrey;
  box-sizing: border-box;
  color: lightgrey;
  position: relative;
}

.tile:hover {
  background-color: #404d43;
  cursor: pointer;
  color: white;
}

.tile.selected {
  background-color: #404d43;
  color: white;
}

.tileText {
  position: absolute;
  bottom: 1px;
  right: 5px;
  font-size: 10px;
  text-align: right;
}
</style>