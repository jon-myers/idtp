<template>
  <div class='synthMain'></div>
</template>
<script>

import { WorkerUrl } from 'worker-url';
import { getStarts, getEnds } from '@/js/classes.js';
// import karplusStrongPath from 'worklet-loader!@/audioWorklets/karplusStrong.worklet.js';
// import chikarisPath from 'worklet-loader!@/audioWorklets/chikaris.worklet.js';

const karplusStrongPath = new WorkerUrl(new URL('@/audioWorklets/karplusStrong.worklet.js', import.meta.url), {
  name: 'karplusStrong'
});
const chikarisPath = new WorkerUrl(new URL('@/audioWorklets/chikaris.worklet.js', import.meta.url), {
  name: 'chikaris'
})
export default {
  name: 'SynthesisComponent',

  data() {
    return {
      rampTime: 0.01,
      slowRamp: 1,
      playing: false,
      bufferSourceNodes: [],
      currentGain: 1.0
    }
  },

  mounted() {
    this.ac = new AudioContext();
    this.masterGainNode = this.ac.createGain();
    this.masterGainNode.gain.setValueAtTime(this.currentGain, this.ac.currentTime);
    this.outerSynthGain = this.ac.createGain();
    this.masterGainNode.connect(this.outerSynthGain).connect(this.ac.destination)
    this.outerSynthGain.gain.setValueAtTime(this.currentGain, this.ac.currentTime)
    
    this.ac.resume();
    this.piece = this.$parent.piece;
    this.ac.audioWorklet.addModule(karplusStrongPath).then(() => {
      this.initializePluckNode();
      
    })
    this.ac.audioWorklet.addModule(chikarisPath).then(() => {
      this.initializeChikariNodes();
    })
    
    this.preSetFirstEnvelope(256);
    this.emitter.on('toggleAudio', () => {
      
      if (!this.playing) {
        const now = this.ac.currentTime;
        this.playTrajs(this.$parent.playhead, now);
        this.playChikaris(this.$parent.playhead, now);
        this.playing = true;
      } else {
        this.cancelPlayTrajs()
        this.playing = false;
        this.cancelBursts();
        this.bufferSourceNodes = [];
        
      }
    });
    this.emitter.on('synthVolume', vol => {
      // this.masterGainNode.gain.setValueAtTime(this.currentGain, this.ac.currentTime);
      // this.masterGainNode.gain.linearRampToValueAtTime(Number(vol), this.ac.currentTime + this.rampTime);
      this.outerSynthGain.gain.setValueAtTime(this.currentGain, this.ac.currentTime);
      this.outerSynthGain.gain.linearRampToValueAtTime(Number(vol), this.ac.currentTime + this.rampTime);
       
      this.currentGain = Number(vol);
    });
    
    this.emitter.on('damping', damping => {
      this.pluckNode.cutoff.linearRampToValueAtTime(Number(damping), this.ac.currentTime + this.rampTime)
    });
    
    this.emitter.on('end', () => {
      this.cancelPlayTrajs()
      this.playing = false;
      this.cancelBursts();
      this.bufferSourceNodes = [];
    })
  },
  
  

  beforeUnmount() {
    this.emitter.off('toggleAudio'),
    this.emitter.off('synthVolume'),
    this.emitter.off('damping'),
    this.emitter.off('end')
  },

  methods: {
    
    initializePluckNode() {
      if (this.pluckNode) this.pluckNode.disconnect();
      if (this.lowPassNode) this.lowPassNode.disconnect();
      this.pluckNode = new AudioWorkletNode(this.ac, 'main');
      this.lowPassNode = this.ac.createBiquadFilter();
      this.lowPassNode.type = 'lowpass';
      this.lowPassNode.frequency.setValueAtTime(this.$parent.piece.raga.fundamental * (2**3), this.ac.currentTime);
      this.pluckNode.connect(this.lowPassNode).connect(this.masterGainNode);
      this.pluckNode.frequency = this.pluckNode.parameters.get('Frequency');
      this.pluckNode.cutoff = this.pluckNode.parameters.get('Cutoff');
    },
    
    initializeChikariNodes() {
      if (this.chikarisGainNode) this.chikarisGainNode.disconnect();
      this.chikarisGainNode = this.ac.createGain();
      if (this.chikariNodes) this.chikariNodes.forEach(cn => cn.disconnect());
      this.otherNode = new AudioWorkletNode(this.ac, 'chikaris', { numberOfInputs: 1, numberOfOutputs: 4 });
      this.otherNode.freq0 = this.otherNode.parameters.get('freq0');
      this.otherNode.freq1 = this.otherNode.parameters.get('freq1');
      this.otherNode.freq2 = this.otherNode.parameters.get('freq2');
      this.otherNode.freq3 = this.otherNode.parameters.get('freq3');
      this.otherNode.cutoff = this.otherNode.parameters.get('Cutoff');
      this.otherNode.cutoff.setValueAtTime(0.6, this.ac.currentTime);
      this.otherNode.connect(this.chikarisGainNode, 0);
      this.otherNode.connect(this.chikarisGainNode, 1);
      this.otherNode.connect(this.chikarisGainNode, 2);
      this.otherNode.connect(this.chikarisGainNode, 3);
      this.chikarisGainNode.connect(this.outerSynthGain);
      this.otherNode.freq0.setValueAtTime(this.piece.raga.chikariPitches[0].frequency, this.ac.currentTime);
      this.otherNode.freq1.setValueAtTime(this.piece.raga.chikariPitches[1].frequency, this.ac.currentTime);
      this.otherNode.freq2.setValueAtTime(this.piece.raga.chikariPitches[2].frequency, this.ac.currentTime);
      this.otherNode.freq3.setValueAtTime(this.piece.raga.chikariPitches[3].frequency, this.ac.currentTime);
    },
    
    sendNoiseBurst(when, dur, where, attack=0.05, amp=1) {
      const bufferSize = this.ac.sampleRate * dur;
      const noiseBuffer = this.ac.createBuffer(1, bufferSize, this.ac.sampleRate);
      const attackSize = this.ac.sampleRate * attack;
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926
      }
      for (let i = 0; i < attackSize; i++) {
        output[i] *= i / attackSize
      }
      for (let i = 0; i < bufferSize; i++) {
        output[i] *= amp
      }
      const bufferSourceNode = this.ac.createBufferSource();
      this.bufferSourceNodes.push(bufferSourceNode);
      bufferSourceNode.connect(where);
      bufferSourceNode.buffer = noiseBuffer;
      bufferSourceNode.start(when);
    },
    
    cancelBursts() {
      this.bufferSourceNodes.forEach(buf => {
        buf.stop()
        buf.disconnect()
      })
    },
    
    preSetFirstEnvelope(valueCt) {
      const traj = this.piece.phrases.map(p => p.trajectories).flat()[0];
      this.firstEnvelope = new Float32Array(valueCt);
      this.firstLPEnvelope = new Float32Array(valueCt);
      for (let i = 0; i < valueCt; i ++) {
        this.firstEnvelope[i] = traj.compute(i/(valueCt-1));
        this.firstLPEnvelope[i] = traj.compute(i/(valueCt-1)) * (2 ** 3);
      }
    },

    playTraj(traj, startTime, endTime, valueCt, first=false) {
      if (first) {        
        const offset = startTime < this.ac.currentTime ? this.ac.currentTime - startTime : 0;
        this.pluckNode.frequency.setValueCurveAtTime(this.firstEnvelope, startTime + offset, endTime - (startTime + offset));
        this.lowPassNode.frequency.setValueCurveAtTime(this.firstLPEnvelope, startTime + offset, endTime - (startTime + offset));
      } else {
        const envelope = new Float32Array(valueCt);
        const lpEnvelope = new Float32Array(valueCt);
        for (let i = 0; i < valueCt; i ++) {
          envelope[i] = traj.compute(i/(valueCt-1));
          lpEnvelope[i] = traj.compute(i/(valueCt-1)) * (2 ** 3);
        }
        this.pluckNode.frequency.setValueCurveAtTime(envelope, startTime, endTime - startTime);
        this.lowPassNode.frequency.setValueCurveAtTime(lpEnvelope, startTime, endTime - startTime);
      }
      
    },

    playTrajs(playHeadLoc=0, now) {
      const allTrajs = this.piece.phrases.map(p => p.trajectories).flat();
      const allStarts = getStarts(allTrajs.map(t => t.durTot));
      const allEnds = getEnds(allTrajs.map(t => t.durTot));
      const startIdx = allStarts.findIndex(s => s >= playHeadLoc);
      this.masterGainNode.gain.setValueAtTime(0, now);
      this.masterGainNode.gain.linearRampToValueAtTime(1, now + this.slowRamp);
      allTrajs.slice(startIdx).forEach((traj, i_) => {
        const i = i_ + startIdx;
        this.playArticulations(traj, now + Number(allStarts[i]) - Number(playHeadLoc));
        if (traj.id === 12) {
          if (i_ !== 0 && allTrajs[i-1].id !== 12 ) {
            //
          }
        } else {
          if (i_ === 0 || allTrajs[i-1].id === 12) {
            //
           }
          this.playTraj(traj, now + allStarts[i] - playHeadLoc, now + allEnds[i] - playHeadLoc, 512, i === 0)
        }
        if (i === allTrajs.length - 1) {
          //
        }
      })
    },
    
    playArticulations(traj, startTime) {
      //plucks
      if (traj.id !== 12) {
        const keys = Object.keys(traj.articulations);
        const plucks = keys.filter(key => traj.articulations[key].name === 'pluck');
        const hammerOffs = keys.filter(key => traj.articulations[key].name === 'hammer-off');
        const hammerOns = keys.filter(key => traj.articulations[key].name === 'hammer-on');
        const slides = keys.filter(key => traj.articulations[key].name === 'slide');
        
        plucks.forEach(time => {
            this.sendNoiseBurst(Number(startTime) + Number(time) * Number(traj.durTot), 0.01, this.pluckNode, 0.05, 1)
        });
        hammerOffs.forEach(time => {
          this.sendNoiseBurst(Number(startTime) + Number(time) * Number(traj.durTot), 0.01, this.pluckNode, 0.05, 0.5)
        });
        hammerOns.forEach(time => {
          this.sendNoiseBurst(Number(startTime) + Number(time) * Number(traj.durTot), 0.01, this.pluckNode, 0.05, 0.3)
        });
        slides.forEach(time => {
          this.sendNoiseBurst(Number(startTime) + Number(time) * Number(traj.durTot), 0.01, this.pluckNode, 0.05, 0.1)
        })
      }
    },
    
    playChikaris(playHeadLoc, now) {
      this.chikarisGainNode.gain.setValueAtTime(0, now);
      this.chikarisGainNode.gain.linearRampToValueAtTime(1, now + this.slowRamp);
      this.piece.phrases.forEach(phrase => {
        Object.keys(phrase.chikaris).forEach(key => {
          const time = now + phrase.startTime + Number(key) - Number(playHeadLoc);
          if (time >= this.ac.currentTime) {
            this.sendNoiseBurst(time, 0.01, this.otherNode, 0.025, 0.2)            
          }
        })        
      })
    },

    cancelPlayTrajs() {
      const now = this.ac.currentTime;
      this.pluckNode.frequency.cancelScheduledValues(now);
      this.lowPassNode.frequency.cancelScheduledValues(now);
      this.masterGainNode.gain.cancelScheduledValues(now);
      this.masterGainNode.gain.setValueAtTime(1, now);
      this.masterGainNode.gain.linearRampToValueAtTime(0, now + this.slowRamp);
      this.chikarisGainNode.gain.setValueAtTime(1, now);
      this.chikarisGainNode.gain.linearRampToValueAtTime(0, now + this.slowRamp);
    },
  }
}
</script>

<style scoped>

</style>
