<template>
  <div class='outerBox'>
    <div class='controlBox'>
      <button @click='toggleDrone'>
        {{ ['Initialize Drone', 'Stop Drone'][Number(droneOn)] }}
      </button>
    </div>
    <div class='controlBox'>
      <label>
        Main
      </label>
      <GainSlider 
        v-if='droneInitialized'
        ref='main'
        class='gainSlider'
        :gainNode='mainGain!'
        :lag='lag'
        :ac='ac!'
        />
    </div>
    <div class='controlBox wide'>
      <label>
        Sa
      </label>
      <div class='innerControlBox'>
        <div class='controlBox thin'>
          <label>Main</label>
          <GainSlider
            ref='saMain' 
            v-if='droneInitialized'
            class='gainSlider'
            :gainNode='saGain!'
            :lag='lag'
            :ac='ac!'
            />
        </div>
        <div class='controlBox thin'>
          <label>Sine</label>
          <GainSlider
            ref='sa0'
            v-if='droneInitialized'
            class='gainSlider'
            :gainNode='saOscBankGains[0]'
            :lag='lag'
            :ac='ac!'
            />
        </div>
        <div class='controlBox thin'>
          <label>Tri</label>
          <GainSlider
            ref='sa1' 
            v-if='droneInitialized'
            class='gainSlider'
            :gainNode='saOscBankGains[1]'
            :lag='lag'
            :ac='ac!'
            />
        </div>
        <div class='controlBox thin'>
          <label>Square</label>
          <GainSlider
            ref='sa2'
            v-if='droneInitialized'
            class='gainSlider'
            :gainNode='saOscBankGains[2]'
            :lag='lag'
            :ac='ac!'
            />
        </div>
        <div class='controlBox thin'>
          <label>Saw</label>
          <GainSlider
            ref='sa3'
            v-if='droneInitialized'
            class='gainSlider'
            :gainNode='saOscBankGains[3]'
            :lag='lag'
            :ac='ac!'
            />
        </div>
      </div>
    </div>
    <div class='controlBox wide'>
      <label>
        Pa
      </label>
      <div class='innerControlBox'>
        <div class='controlBox thin'>
          <label>Main</label>
          <GainSlider
            ref='paMain'
            v-if='droneInitialized'
            class='gainSlider'
            :gainNode='paGain!'
            :lag='lag'
            :ac='ac!'
            />
        </div>
        <div class='controlBox thin'>
          <label>Sine</label>
          <GainSlider
            ref='pa0'
            v-if='droneInitialized'
            class='gainSlider'
            :gainNode='paOscBankGains[0]'
            :lag='lag'
            :ac='ac!'
            />
        </div>
        <div class='controlBox thin'>
          <label>Tri</label>
          <GainSlider
            ref='pa1' 
            v-if='droneInitialized'
            class='gainSlider'
            :gainNode='paOscBankGains[1]'
            :lag='lag'
            :ac='ac!'
            />
        </div>
        <div class='controlBox thin'>
          <label>Square</label>
          <GainSlider 
            ref='pa2'
            v-if='droneInitialized'
            class='gainSlider'
            :gainNode='paOscBankGains[2]'
            :lag='lag'
            :ac='ac!'
            />
        </div>
        <div class='controlBox thin'>
          <label>Saw</label>
          <GainSlider
            ref='pa3'
            v-if='droneInitialized'
            class='gainSlider'
            :gainNode='paOscBankGains[3]'
            :lag='lag'
            :ac='ac!'
            />
        </div>
      </div>
    </div>
  </div>
</template>
<script lang='ts'>

import { defineComponent, PropType } from 'vue';
import { Piece } from '@/js/classes.ts'
import GainSlider from '@/components/GainSlider.vue'

type DroneControlsDataType = {
  saOscBank: OscillatorNode[],
  paOscBank: OscillatorNode[],
  saOscBankGains: GainNode[],
  paOscBankGains: GainNode[],
  mainGain?: GainNode,
  saGain?: GainNode,
  paGain?: GainNode,
  droneOn: boolean,

  lag: number,
  droneInitialized: boolean,
  droneStarted: boolean,
  refStrings: string[],
}

export default defineComponent({
  data(): DroneControlsDataType {
    return {
      saOscBank: [],
      paOscBank: [],
      saOscBankGains: [],
      paOscBankGains: [],
      mainGain: undefined,
      saGain: undefined,
      paGain: undefined,
      droneOn: false,
      lag: 0.1,
      droneInitialized: false,
      droneStarted: false,
      refStrings: [
        'main',
        'saMain',
        'sa0',
        'sa1',
        'sa2',
        'sa3',
        'paMain',
        'pa0',
        'pa1',
        'pa2',
        'pa3'
      ]
    }
  },
  props: {
    height: {
      type: Number,
      required: true
    },
    playerHeight: {
      type: Number,
      required: true
    },
    editable: {
      type: Boolean,
      required: true
    },
    piece: {
      type: Object as PropType<Piece>,
      required: true
    },
    saFreq: {
      type: Number,
      required: false
    },
    ac: {
      type: AudioContext,
      required: false
    },
  },

  components: {
    GainSlider
  },

  mounted() {
    this.initializeDrone();
  },

  methods: {

    toggleDrone() {
      if (this.droneOn) {
        this.stopDrone();
      } else {
        this.startDrone();
      }
      this.droneOn = !this.droneOn;
    },

    stopDrone() {
      this.saOscBankGains.forEach(gainNode => {
        const curGain = gainNode.gain.value;
        gainNode.gain.setValueAtTime(curGain, this.ac!.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.ac!.currentTime + this.lag);
      });
      this.paOscBankGains.forEach(gainNode => {
        const curGain = gainNode.gain.value;
        gainNode.gain.setValueAtTime(curGain, this.ac!.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.ac!.currentTime + this.lag);
      });
      this.saOscBank.forEach(saOscNode => {
        saOscNode.stop(this.ac!.currentTime + this.lag);
      });
      this.paOscBank.forEach(paOscNode => {
        paOscNode.stop(this.ac!.currentTime + this.lag);
      });
      this.$nextTick(() => {
        this.initializeDrone()
      });
    },

    startDrone() {
      if (!this.droneStarted) {
        this.saOscBank.forEach(osc => osc.start());
        this.paOscBank.forEach(osc => osc.start());
      }
      
      const mg = this.mainGain.gain;
      const gains = this.refStrings.map(refString => {
          const slider = this.$refs[refString] as typeof GainSlider;
          return slider.gainNode.gain.value;
        });
      if (gains[0] === 0) {
        gains[0] = 0.0001;
      }
      mg.exponentialRampToValueAtTime(gains[0], this.ac.currentTime + this.lag);
    },

    initializeDrone() {
      if (!this.ac) {
        throw new Error('AudioContext not initialized');
      }
      if (this.saFreq === undefined) {
        throw new Error('saFreq not initialized');
      }
      const options = (pitch: 'sa' | 'pa' = 'sa'): OscillatorOptions[] => {
        const freq = pitch === 'sa' ? this.saFreq! / 2: this.saFreq! * 3 / 4;
        return [
          { type: 'sine', frequency: freq },
          { type: 'triangle', frequency: freq },
          { type: 'square', frequency: freq },
          { type: 'sawtooth', frequency: freq }
        ]
      };
      this.saOscBank = [
        new OscillatorNode(this.ac, options('sa')[0]),
        new OscillatorNode(this.ac, options('sa')[1]),
        new OscillatorNode(this.ac, options('sa')[2]),
        new OscillatorNode(this.ac, options('sa')[3])
      ];
      this.paOscBank = [
        new OscillatorNode(this.ac, options('pa')[0]),
        new OscillatorNode(this.ac, options('pa')[1]),
        new OscillatorNode(this.ac, options('pa')[2]),
        new OscillatorNode(this.ac, options('pa')[3])
      ];
      let gains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      if (this.droneInitialized) {
        gains = this.refStrings.map(refString => {
          const slider = this.$refs[refString] as typeof GainSlider;
          return slider.gainNode.gain.value;
        });
      }
      this.saOscBankGains = [
        new GainNode(this.ac, { gain: gains[2] }),
        new GainNode(this.ac, { gain: gains[3] }),
        new GainNode(this.ac, { gain: gains[4] }),
        new GainNode(this.ac, { gain: gains[5] })
      ];
      this.paOscBankGains = [
        new GainNode(this.ac, { gain: gains[7] }),
        new GainNode(this.ac, { gain: gains[8] }),
        new GainNode(this.ac, { gain: gains[9] }),
        new GainNode(this.ac, { gain: gains[10] })
      ];
      this.saGain = new GainNode(this.ac, { gain: gains[1] });
      this.paGain = new GainNode(this.ac, { gain: gains[6] });
      this.mainGain = new GainNode(this.ac, { gain: gains[0] });
      this.filter = new BiquadFilterNode(this.ac, { 
        type: 'lowpass', 
        frequency: 1000 
      });
      this.saGain.connect(this.filter);
      this.paGain.connect(this.filter);
      this.filter.connect(this.mainGain);

    
      
      this.saOscBank.forEach((osc, i) => {
        osc.connect(this.saOscBankGains[i]);
        this.saOscBankGains[i].connect(this.saGain!);
      });
      this.paOscBank.forEach((osc, i) => {
        osc.connect(this.paOscBankGains[i]);
        this.paOscBankGains[i].connect(this.paGain!);
      });
      // this.saGain!.connect(this.mainGain!);
      // this.paGain!.connect(this.mainGain!);
      // this.mainGain!.connect(this.ac.destination);
      this.analyserNode = this.ac.createAnalyser();
      this.mainGain!.connect(this.analyserNode);
      this.analyserNode.connect(this.ac.destination);
      this.droneInitialized = true;
    },

    capture() {
      // const byteArr = new Uint8Array(this.analyserNode!.frequencyBinCount);
      // this.analyserNode!.getByteTimeDomainData(byteArr);
      const floatArr = new Float32Array(this.analyserNode!.frequencyBinCount);
      this.analyserNode!.getFloatTimeDomainData(floatArr);
      console.log(floatArr);
      console.log(Math.max(...floatArr));
    }
  }
})
</script>

<style scoped>

.outerBox {
  background-color: #202621;
  height: v-bind(height + 'px');
  position: absolute;
  right: 0px;
  bottom: v-bind(playerHeight + 'px');
  color: white;
  z-index: -1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.controlBox {
  width: 100px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
  padding: 10px;
  box-sizing: border-box;
}

.controlBox.wide {
  width: 250px;
  margin-left: 10px;
  margin-right: 10px;
  box-sizing: border-box;
}

.controlBox.thin {
  width: 50px;
}

.gainSlider {
  width: 20px;
  height: 100%;
  appearance: slider-vertical;
  /* margin-top: 10px; */
}

.innerControlBox {
  width: 100%;
  height: v-bind(height - 70 + 'px');
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;

}

label {
  height: 40px;
}
</style>
