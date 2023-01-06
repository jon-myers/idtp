<template>
<div class='main'>
  <div class='selectionPanel'>
    <div class='selectionRow'>
      <label>Pluck</label>
      <input 
        v-if='editable' 
        type='checkbox' 
        v-model='pluckBool' 
        @change='updateBool'
      />
      <input 
        v-if='!editable' 
        type='checkbox' 
        v-model='pluckBool' 
        @change='updateBool'
        disabled='disabled'
      />
      <label class='spaceLeft'>Dampen</label>
      <input 
        v-if='editable' 
        type='checkbox' 
        v-model='dampen' 
        @change='updateDampen'
      />
      <input 
        v-if='!editable' 
        type='checkbox' 
        v-model='dampen' 
        @change='updateDampen'
        disabled='disabled'
      />
      <label v-if='showVibObj' class='spaceLeft'>Up</label>
      <input
        v-if='editable && showVibObj'
        type='checkbox'
        v-model='initUp'
        @change='updateVibObj'
      />
      <input
        v-if='!editable && showVibObj'
        type='checkbox'
        v-model='initUp'
        @change='updateVibObj'
        disabled='disabled'
      />
    </div>
    <div class='selectionRow' v-if='showSlope'>
      <label>Slope</label>
      <input 
        v-if='editable'
        type='range' 
        class='slider'
        v-model='slope'
        min='0.0'
        max='3.0'
        step='0.01'
        @input='updateSlope'
        />
        <input 
          v-if='!editable'
          type='range' 
          class='slider'
          v-model='slope'
          min='0.0'
          max='3.0'
          step='0.01'
          @input='updateSlope'
          disabled='disabled'
          />
    </div>
    <div class='selectionRow' v-if='showVibObj'>
      <label>Periods</label>
      <input
        v-if='editable'
        type='range'
        class='slider'
        v-model='periods'
        min='1'
        max='20'
        step='0.5'
        @input='updateVibObj'
      />
      <input
        v-if='!editable'
        type='range'
        class='slider'
        v-model='periods'
        min='1'
        max='20'
        step='0.5'
        @input='updateVibObj'
        disabled='disabled'
      />
    </div>
    <div class='selectionRow' v-if='showVibObj'>
      <label>Extent</label>
      <input
        v-if='editable'
        type='range'
        class='slider'
        v-model='extent'
        min='0'
        max='0.2'
        step='0.005'
        @input='updateVibObj'
      />
      <input
        v-if='!editable'
        type='range'
        class='slider'
        v-model='periods'
        min='0'
        max='0.5'
        step='0.01'
        @input='updateVibObj'
        disabled='disabled'
      />
    </div>
    <div class='selectionRow' v-if='showVibObj'>
      <label>Offset</label>
      <input
        v-if='editable'
        type='range'
        class='slider'
        v-model='offset'
        min='-1.0'
        max='1.0'
        step='0.01'
        @input='updateVibObj'
      />
      <input
        v-if='!editable'
        type='range'
        class='slider'
        v-model='periods'
        min='-1.0'
        max='1.0'
        step='0.01'
        @input='updateVibObj'
        disabled='disabled'
      />
    </div>
  </div>
  <div class='thumbRow' v-for='odx in 5' :key='odx'>
    <img 
      :class='["thumb", idx === 4 ? "right" : "" ]' 
      v-for='idx in 4' 
      :src="urls[4 * (odx-1) + (idx-1)]" 
      :key='idx' 
      :id='"id" + ((idx-1) + 4*(odx-1))' 
      @click='selectIcon' />
  </div>
</div>
</template>
<script>
import t1 from '@/assets/thumbnails/1.png';
import t2 from '@/assets/thumbnails/2.png';
import t3 from '@/assets/thumbnails/3.png';
import t4 from '@/assets/thumbnails/4.png';
import t5 from '@/assets/thumbnails/5.png';
import t6 from '@/assets/thumbnails/6.png';
import t7 from '@/assets/thumbnails/7.png';
import t8 from '@/assets/thumbnails/8.png';
import t9 from '@/assets/thumbnails/9.png';
import t10 from '@/assets/thumbnails/10.png';
import t11 from '@/assets/thumbnails/11.png';
import t12 from '@/assets/thumbnails/12.png';
import t13 from '@/assets/thumbnails/13.png';

// import { Articulation } from '@/js/classes.js';

export default {
  name: 'AltTrajSelectPanel',

  data() {
    return {
      urls: [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13],
      pluckBool: true,
      intraTrajDursBool: false,
      selectedIcon: undefined,
      selectedIdx: undefined,
      parentSelected: false,
      slope: 1,
      showSlope: false,
      showVibObj: false,
      periods: 8,
      offset: 0,
      initUp: true,
      extent: 0.05,
      dampen: false
    }
  },
  
  props: [
    'editable'
  ],


  mounted() {

  },
  
  watch: {
    selectedIdx(newVal) {
      document.querySelectorAll('.thumb').forEach(t => {
        t.classList.remove('selected')
      })
      if (newVal !== undefined) {
        if (newVal >= 12) {
          newVal -= 1;
        }
        const el = document.querySelector(`#id${newVal}`)
        el.classList.add('selected')
        const slopeIdxs = [2, 3, 4, 5]
        this.showSlope = slopeIdxs.includes(this.selectedIdx);
        this.showVibObj = this.selectedIdx === 13;
      }
    }
  },

  methods: {

    selectIcon(e) {
      let idx = Number(e.target.id.slice(2));
      if (idx >= 12) {
        idx += 1;
      }
      if (this.parentSelected && this.editable) {
        const fixed = [0, 13];
        const twos = [1, 2, 3];
        const threes = [4, 5, 6];
        if (twos.includes(this.selectedIdx)) {
          if (idx !== this.selectedIdx && twos.includes(idx)) {
            this.selectedIdx = idx;
            this.emitter.emit('mutateTraj', this.selectedIdx);
            document.querySelectorAll('.thumb').forEach(t => {
              t.classList.remove('selected')
            })
            e.target.classList.add('selected');
          }
        } else if (threes.includes(this.selectedIdx)) {
          if (idx !== this.selectedIdx && threes.includes(idx)) {
            if (this.selectedIdx === 6) {
              if (this.$parent.selectedTraj.durArray.length === 2) {
                this.selectedIdx = idx;
                this.emitter.emit('mutateTraj', this.selectedIdx);
                document.querySelectorAll('.thumb').forEach(t => {
                  t.classList.remove('selected')
                })
                e.target.classList.add('selected');
              }
            } else {
              this.selectedIdx = idx;
              this.emitter.emit('mutateTraj', this.selectedIdx);
              document.querySelectorAll('.thumb').forEach(t => {
                t.classList.remove('selected')
              })
              e.target.classList.add('selected');
            }
          }
        } else if (fixed.includes(this.selectedIdx)) {
          if (idx !== this.selectedIdx && fixed.includes(idx)) {
            this.selectedIdx = idx;
            this.emitter.emit('mutateTraj', this.selectedIdx);
            document.querySelectorAll('.thumb').forEach(t => {
              t.classList.remove('selected')
            })
            e.target.classList.add('selected');
          }
        }
      } else if (this.$parent.setNewTraj) {
        const timePts = this.$parent.trajTimePts;
        if (timePts.length === 2) {
          const options = [1, 2, 3];
          if (timePts[0].logFreq === timePts[1].logFreq) options.push(0, 13)
          if (options.includes(idx)) {
            this.selectedIdx = idx;
            e.target.classList.add('selected');
            this.emitter.emit('newTraj', this.selectedIdx);
          }
        } else if (timePts.length === 3) {
          const options = [4, 5, 6];
          const sortedTimePts = timePts.slice().sort((a, b) => a.time - b.time);
          const logFreqs = sortedTimePts.map(tp => tp.logFreq);
          const lfDiffs = logFreqs.slice(1).map((x, i) => x - logFreqs[i]);
          if (lfDiffs[0] < 0 && lfDiffs[1] === 0) options.push(7)
          if (lfDiffs[0] > 0 && lfDiffs[1] === 0) options.push(7)
          if (lfDiffs[1] === 0) options.push(11)
          if (options.includes(idx)) {
            this.selectedIdx = idx;
            e.target.classList.add('selected');
            this.emitter.emit('newTraj', this.selectedIdx);
          }
        } else if (timePts.length === 4) {
          const options = [6];
          const sortedTimePts = timePts.slice().sort((a, b) => a.time - b.time);
          const logFreqs = sortedTimePts.map(tp => tp.logFreq);
          const lfDiffs = logFreqs.slice(1).map((x, i) => x - logFreqs[i]);
          const c = lfDiffs[0] < 0 && lfDiffs[1] < 0 && lfDiffs[2] === 0
          if (c) options.push(8)
          if (options.includes(idx)) {
            this.selectedIdx = idx;
            e.target.classList.add('selected');
            this.emitter.emit('newTraj', this.selectedIdx);
          }
        } else if (timePts.length === 5) {
          const options = [6];
          const sortedTimePts = timePts.slice().sort((a, b) => a.time - b.time);
          const logFreqs = sortedTimePts.map(tp => tp.logFreq);
          const lDif = logFreqs.slice(1).map((x, i) => x - logFreqs[i]);
          const c = lDif[0] < 0 && lDif[1] < 0 && lDif[2] > 0 && lDif[3] === 0;
          if (c) options.push(9);
          if (options.includes(idx)) {
            this.selectedIdx = idx;
            e.target.classList.add('selected');
            this.emitter.emit('newTraj', this.selectedIdx);
          }
        } else if (timePts.length === 6) {
          const options = [6];
          if (options.includes(idx)) {
            this.selectedIdx = idx;
            e.target.classList.add('selected');
            this.emitter.emit('newTraj', this.selectedIdx);
          }
        } else if (timePts.length === 7) {
          const options = [6];
          const sortedTimePts = timePts.slice().sort((a, b) => a.time - b.time);
          const logFreqs = sortedTimePts.map(tp => tp.logFreq);
          const lfDiffs = logFreqs.slice(1).map((x, i) => x - logFreqs[i]);
          const c = [
            lfDiffs[0] > 0,
            lfDiffs[1] > 0,
            lfDiffs[2] < 0,
            lfDiffs[3] < 0,
            lfDiffs[4] > 0,
            lfDiffs[5] === 0
          ];
          if (c.every(a => a)) {
            options.push(10)
          }
          if (options.includes(idx)) {
            this.selectedIdx = idx;
            e.target.classList.add('selected');
            this.emitter.emit('newTraj', this.selectedIdx);
          }
        }
      } 
    },
    
    updateSlope() {
      
      this.$parent.alterSlope((2 ** this.slope))
    },
    
    updateBool() {
      if (this.parentSelected) {
        this.emitter.emit('pluckBool', this.pluckBool)
      }
    },

    updateDampen() {
      if (this.parentSelected) {
        this.emitter.emit('dampen', this.dampen)
      }
    },

    updateVibObj() {
      const vibObj = {
        periods: this.periods,
        vertOffset: this.extent * this.offset,
        initUp: this.initUp,
        extent: this.extent,
      };
      this.emitter.emit('vibObj', vibObj);
    },
  }
}
</script>

<style scoped>

.selectionPanel {
  width: 100%;
  height: 100px;
  border-top: 1px solid black;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
}

.thumb {
  width: calc((100% - 3px) / 4);
  border-right: 1px solid black;
  border-top: 1px solid black;
  margin: 0;
  display: inline-block;
  /* cursor: pointer; */
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
  width: 60px;
  text-align: right;
}

.slider {
  width: 120px;
}

.selectionRow {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.spaceLeft {
  margin-left: 10px;
}
</style>
