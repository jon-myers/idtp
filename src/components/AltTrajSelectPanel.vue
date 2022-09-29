<template>
<div class='main'>
  <div class='selectionPanel'>
    <div class='selectionRow'>
      <label>Pluck</label>
      <input type='checkbox' v-model='pluckBool' @change='updateBool'/>
    </div>
  </div>
  <div class='thumbRow' v-for='odx in 4' :key='odx'>
    <img 
      :class='["thumb", idx === 3 ? "right" : "" ]' 
      v-for='idx in 3' 
      :src="urls[3 * (odx-1) + (idx-1)]" 
      :key='idx' 
      :id='"id" + ((idx-1) + 3*(odx-1))' 
      @click='selectIcon' />
  </div>
</div>
</template>
<script>
import url1 from '@/assets/thumbnails/1.png';
import url2 from '@/assets/thumbnails/2.png';
import url3 from '@/assets/thumbnails/3.png';
import url4 from '@/assets/thumbnails/4.png';
import url5 from '@/assets/thumbnails/5.png';
import url6 from '@/assets/thumbnails/6.png';
import url7 from '@/assets/thumbnails/7.png';
import url8 from '@/assets/thumbnails/8.png';
import url9 from '@/assets/thumbnails/9.png';
import url10 from '@/assets/thumbnails/10.png';
import url11 from '@/assets/thumbnails/11.png';
import url12 from '@/assets/thumbnails/12.png';

// import { Articulation } from '@/js/classes.js';

export default {
  name: 'AltTrajSelectPanel',

  data() {
    return {
      urls: [url1, url2, url3, url4, url5, url6, url7, url8, url9, url10, url11, url12],
      pluckBool: true,
      intraTrajDursBool: false,
      selectedIcon: undefined,
      selectedIdx: undefined,
      parentSelected: false,
    }
  },


  mounted() {

  },
  
  watch: {
    selectedIdx(newVal) {
      document.querySelectorAll('.thumb').forEach(t => {
        t.classList.remove('selected')
      })
      const el = document.querySelector(`#id${newVal}`)
      el.classList.add('selected')
    }
  },

  methods: {

    selectIcon(e) {
      document.querySelectorAll('.thumb').forEach(t => {
        t.classList.remove('selected')
      })
      e.target.classList.add('selected');
      const idx = Number(e.target.id.slice(2));
      this.selectedIdx = idx;
      const obj = { 
        idx: idx, 
        pluckBool: this.pluckBool, 
        intraTrajDursBool: this.intraTrajDursBool
       }
       console.log(obj)
    },
    
    updateBool() {
      if (this.parentSelected) {
        this.emitter.emit('pluckBool', this.pluckBool)
        // if (this.pluckBool) {
        // 
        //   if (!this.$parent.selectedTraj.articulations[0]) {
        //     this.$parent.selectedTraj.articulations[0] = new Articulation();
        //     this.$parent.
        //   }
        // } else {
        //   if (this.$parent.selectedTraj.articulations[0]) {
        //     delete this.$parent.selectedTraj.articulations[0]
        //   }
        // }
      
      
      }
    },
    
    
  }
}
</script>

<style scoped>

.selectionPanel {
  width: 100%;
  height: 60px;
  border-top: 1px solid black;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
}

.thumb {
  width: calc((100% - 2px) / 3);
  border-right: 1px solid black;
  border-top: 1px solid black;
  margin: 0;
  display: inline-block;
  cursor: pointer;
}

.right {
  border-right: none;
}

.thumbRow {
  border: 0;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: row;
}

.selected {
  filter: invert(75%);
}

label {
  display: inline-block;
  width: 100px;
  text-align: right;
}
</style>
