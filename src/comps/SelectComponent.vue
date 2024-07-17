<template>
  <div class="dropdown">
    <div class="dropdown-btn" @click="toggleDropdown">{{ selectedLabel }}</div>
    <div class="dropdown-content" v-show="isOpen">
      <div 
        v-for="(svg, index) in svgs" 
        :key="index" 
        class="dropdown-item" 
        @click="selectSwatch(svg, index)"
        v-html="svg"
      >
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';

export default defineComponent({
  name: 'DropdownMenu',
  props: {
    svgs: {
      type: Array as PropType<Array<string>>,
      required: true,
    },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const isOpen = ref(false);
    const selectedLabel = ref('Select an option');
    const selectedValue = ref('');

    const toggleDropdown = () => {
      isOpen.value = !isOpen.value;
      console.log('isOpen', isOpen.value);
    };

    const selectSwatch = (svg: string, index: number) => {
      selectedLabel.value = `Option ${index + 1}`;
      selectedValue.value = svg;
      isOpen.value = false;
      emit('update:modelValue', svg);
      emit('change', { svg, index });
    };

    return {
      isOpen,
      selectedLabel,
      selectSwatch,
      toggleDropdown,
    };
  },
});
</script>



<style scoped>
.dropdown {
  position: relative;
  display: inline-block;
  width: 100px;
  font-family: Arial, sans-serif;
  background-color: black;
}

.dropdown-btn {
  background-color: #ffffff;
  color: #333;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}

.dropdown-content {
  display: none;
  position: absolute;
  background-color: #f9f9f9;
  min-width: 100%;
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  z-index: 1;
  border-radius: 4px;
  margin-top: 2px;
  overflow-y: scroll;
  height: 100px;
}

.dropdown-content .dropdown-item {
  color: black;
  background-color: black;
  text-decoration: none;
  display: block;
  white-space: nowrap;
  height: 20px;
  /* border-bottom: 1px solid #eee; */
  cursor: pointer;
}

.dropdown-content .dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-content .dropdown-item:hover {
  background-color: black;
}

.dropdown-btn:hover, .dropdown-btn:focus {
  background-color: #f1f1f1;
}

.dropdown-content {
  display: block;
}
</style>