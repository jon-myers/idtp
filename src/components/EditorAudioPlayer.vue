<template>
  <div class='mainq' ref='main'>
    <div 
      class='player' 
      @mouseover='hoverTrigger(true)' 
      @mouseleave='hoverTrigger(false)'
      @mousemove='handleCircleMouseMove'
      @mouseup='handleCircleMouseUp'>
      <div class='progressBarOuter' @click='handleProgressClick' ref='pbOuter'>
        <div class='progressBarInner'>
          <div :class='`currentTime tooLeft`'>
            {{formattedCurrentTime}}
          </div>
          <div 
            class='progressCircle' 
            @mousedown='handleCircleMouseDown'         
            >
            <div class='invisibleProgressCircle'>
            </div>
          </div>
        </div>
        <div class='timeLeft'>{{'-'+formattedTimeLeft}}</div>
      </div>
      <div class='controlsContainer'>
        <div class='recInfo left'>
        </div>
        <div class='controlFlexer'>
          <div class='controlBox' v-if='!loading'>
            <img :src='icons.back_15' @click='back_15'/>
            <img :src='icons.beginning' @click='goToBeginning'/>
            <div class='playCircle' @click='togglePlay'>
              <img 
                ref='playImg' 
                :src='[icons.play, icons.pause][Number(this.playing)]'
                />
            </div>
            <img :src='icons.end' @click='trackEnd'/>
            <img :src='icons.forward_15' @click='forward_15' class='icon'/>
          </div>
          <div class='loadingSymbol' v-else>
            <div class='loader'>
            </div>
          </div>
        </div>
        <div class='recInfo right'>
          <div class='rulerBox'>
            <img :src='icons.ruler' @click='toggleWaveform' />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>

import beginningIcon from '@/assets/icons/beginning.svg';
import endIcon from '@/assets/icons/end.svg';
import loopIcon from '@/assets/icons/loop.svg';
import back_15 from '@/assets/icons/back_15.svg';
import forward_15 from '@/assets/icons/forward_15.svg';
import pauseIcon from '@/assets/icons/pause.svg';
import playIcon from '@/assets/icons/play.svg';
import shuffleIcon from '@/assets/icons/shuffle.svg';
import rulerIcon from '@/assets/icons/ruler.svg';

// GETBACK
// import { getStarts, getEnds } from '@/js/classes.js';
// import { AudioWorklet } from "@/audio-worklet";
// end GETBACK

const structuredTime = dur => {
  const hours = String(Math.floor(dur / 3600));
  const minutes = leadingZeros(Math.floor((dur % 3600) / 60));
  const seconds = leadingZeros(Math.round(dur % 60));
  return { hours: hours, minutes: minutes, seconds: seconds }
};

const leadingZeros = int => {
  if (int < 10) {
    return '0'+int
  } else {
    return String(int)
  }
};

export default {
  name: 'EditorAudioPlayer',
  data() {
    return {
      progress: 0.0,
      playing: false,
      looping: false,
      shuffling: false,
      showWaveform: false,
      audio: {
        paused: false
      },
      icons: {
        beginning: beginningIcon,
        end: endIcon,
        loop: loopIcon,
        pause: pauseIcon,
        play: playIcon,
        shuffle: shuffleIcon,
        ruler: rulerIcon,
        back_15: back_15,
        forward_15: forward_15
      },
      circleDragging: false,
      formattedCurrentTime: '00:00',
      formattedTimeLeft: '00:00',
      waKey: 0,
      loading: true,
      startedAt: 0,
      pausedAt: 0,
      loop: false,
      loopStart: undefined,
      loopEnd: undefined,
      slowRamp: 1,
      bufferSourceNodes: [],
      synthGain: 0,
      recGain: 1,
      chikariGain: 0,
    }
  },
  props: [
    'audioSource', 
    'saEstimate',
    'saVerified',
    'id'
  ],
  mounted() {
    this.ac = new AudioContext();
    this.gainNode = this.ac.createGain();
    this.gainNode.connect(this.ac.destination);
    this.gainNode.gain.setValueAtTime(this.recGain, this.now());
    // GETBACK
    // this.masterSynthGainNode = this.ac.createGain();
    // this.masterSynthGainNode.gain.setValueAtTime(this.synthGain, this.now())
    // this.synthGainNode = this.ac.createGain();
    // this.synthGainNode.connect(this.masterSynthGainNode);
    // this.masterSynthGainNode.connect(this.ac.destination);    
    // this.ac.audioWorklet.addModule(
    //   AudioWorklet(new URL("@/audioWorklets/karplusStrong.worklet.js", import.meta.url))
    // );
    // this.ac.audioWorklet.addModule(
    //   AudioWorklet(new URL("@/audioWorklets/chikaris.worklet.js", import.meta.url))
    // );
    // end GETBACK  
    // this.initializePluckNode() this gets triggered in parent
    this.audio = new Audio();
    this.audio.ontimeupdate = () => {
      this.progress = this.audio.currentTime / this.audio.duration;
      const pbi = document.querySelector('.progressBarInner');
      const pbo = document.querySelector('.progressBarOuter');
      const totWidth = pbo.getBoundingClientRect().width;
      pbi.style.width = this.progress * totWidth + 'px'
      this.updateFormattedCurrentTime();
      this.updateFormattedTimeLeft();
      this.$parent.currentTime = this.audio.currentTime
    };
    this.audio.onended = this.trackEnd
  },
  
  watch: {
    async audioSource(newSrc) {
      this.loading = true;
      this.audioBuffer = await this.getAudio(newSrc, true);
      this.loading = false;
    }
  },
  methods: {
    // GETBACK
    // playChikaris(playHeadLoc, now) {
    //   this.chikarisGainNode.gain.setValueAtTime(0, now);
    //   this.chikarisGainNode.gain.linearRampToValueAtTime(1, now + this.slowRamp);
    //   this.$parent.piece.phrases.forEach(phrase => {
    //     Object.keys(phrase.chikaris).forEach(key => {
    //       const time = now + phrase.startTime + Number(key) - Number(playHeadLoc);
    //       if (time >= this.now()) {
    //         this.sendNoiseBurst(time, 0.01, this.otherNode, 0.025, 0.2)            
    //       }
    //     })        
    //   })
    // },
    // 
    // cancelBursts() {
    //   this.bufferSourceNodes.forEach(buf => {
    //     buf.stop()
    //     buf.disconnect()
    //   })
    // },
    // 
    // playTrajs(playHeadLoc=0, now) {
    //   const allTrajs = this.$parent.piece.phrases.map(p => p.trajectories).flat();
    //   const allStarts = getStarts(allTrajs.map(t => t.durTot));
    //   const allEnds = getEnds(allTrajs.map(t => t.durTot));
    //   const startIdx = allStarts.findIndex(s => s >= playHeadLoc);
    //   this.synthGainNode.gain.setValueAtTime(0, now);
    //   this.synthGainNode.gain.linearRampToValueAtTime(1, now + this.slowRamp);
    //   allTrajs.slice(startIdx).forEach((traj, i_) => {
    //     const i = i_ + startIdx;
    //     this.playArticulations(traj, now + Number(allStarts[i]) - Number(playHeadLoc));
    //     if (traj.id === 12) {
    //       if (i_ !== 0 && allTrajs[i-1].id !== 12 ) {
    //         //
    //       }
    //     } else {
    //       if (i_ === 0 || allTrajs[i-1].id === 12) {
    //         //
    //        }
    //       this.playTraj(traj, now + allStarts[i] - playHeadLoc, now + allEnds[i] - playHeadLoc, 512, i === 0)
    //     }
    //     if (i === allTrajs.length - 1) {
    //       //
    //     }
    //   })
    // },
    // 
    // playArticulations(traj, startTime) {
    //   //plucks
    //   if (traj.id !== 12) {
    //     const keys = Object.keys(traj.articulations);
    //     const plucks = keys.filter(key => traj.articulations[key].name === 'pluck');
    //     const hammerOffs = keys.filter(key => traj.articulations[key].name === 'hammer-off');
    //     const hammerOns = keys.filter(key => traj.articulations[key].name === 'hammer-on');
    //     const slides = keys.filter(key => traj.articulations[key].name === 'slide');
    // 
    //     plucks.forEach(time => {
    //         this.sendNoiseBurst(Number(startTime) + Number(time) * Number(traj.durTot), 0.01, this.pluckNode, 0.05, 1)
    //     });
    //     hammerOffs.forEach(time => {
    //       this.sendNoiseBurst(Number(startTime) + Number(time) * Number(traj.durTot), 0.01, this.pluckNode, 0.05, 0.5)
    //     });
    //     hammerOns.forEach(time => {
    //       this.sendNoiseBurst(Number(startTime) + Number(time) * Number(traj.durTot), 0.01, this.pluckNode, 0.05, 0.3)
    //     });
    //     slides.forEach(time => {
    //       this.sendNoiseBurst(Number(startTime) + Number(time) * Number(traj.durTot), 0.01, this.pluckNode, 0.05, 0.1)
    //     })
    //   }
    // },
    // 
    // sendNoiseBurst(when, dur, where, attack=0.05, amp=1) {
    //   const bufferSize = this.ac.sampleRate * dur;
    //   const noiseBuffer = this.ac.createBuffer(1, bufferSize, this.ac.sampleRate);
    //   const attackSize = this.ac.sampleRate * attack;
    //   const output = noiseBuffer.getChannelData(0);
    //   let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    //   for (let i = 0; i < bufferSize; i++) {
    //     const white = Math.random() * 2 - 1;
    //     b0 = 0.99886 * b0 + white * 0.0555179;
    //     b1 = 0.99332 * b1 + white * 0.0750759;
    //     b2 = 0.96900 * b2 + white * 0.1538520;
    //     b3 = 0.86650 * b3 + white * 0.3104856;
    //     b4 = 0.55000 * b4 + white * 0.5329522;
    //     b5 = -0.7616 * b5 - white * 0.0168980;
    //     output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    //     b6 = white * 0.115926
    //   }
    //   for (let i = 0; i < attackSize; i++) {
    //     output[i] *= i / attackSize
    //   }
    //   for (let i = 0; i < bufferSize; i++) {
    //     output[i] *= amp
    //   }
    //   const bufferSourceNode = this.ac.createBufferSource();
    //   this.bufferSourceNodes.push(bufferSourceNode);
    //   bufferSourceNode.connect(where);
    //   bufferSourceNode.buffer = noiseBuffer;
    //   bufferSourceNode.start(when);
    // },
    // 
    // 
    // playTraj(traj, startTime, endTime, valueCt, first=false) {
    //   if (first) {        
    //     const offset = startTime < this.now() ? this.now() - startTime : 0;
    //     this.pluckNode.frequency.setValueCurveAtTime(this.firstEnvelope, startTime + offset, endTime - (startTime + offset));
    //     this.lowPassNode.frequency.setValueCurveAtTime(this.firstLPEnvelope, startTime + offset, endTime - (startTime + offset));
    //   } else {
    //     const envelope = new Float32Array(valueCt);
    //     const lpEnvelope = new Float32Array(valueCt);
    //     for (let i = 0; i < valueCt; i ++) {
    //       envelope[i] = traj.compute(i/(valueCt-1));
    //       lpEnvelope[i] = traj.compute(i/(valueCt-1)) * (2 ** 3);
    //     }
    //     this.pluckNode.frequency.setValueCurveAtTime(envelope, startTime, endTime - startTime);
    //     this.lowPassNode.frequency.setValueCurveAtTime(lpEnvelope, startTime, endTime - startTime);
    //   }
    // 
    // },
    // 
    // preSetFirstEnvelope(valueCt) {
    //   const traj = this.$parent.piece.phrases.map(p => p.trajectories).flat()[0];
    //   this.firstEnvelope = new Float32Array(valueCt);
    //   this.firstLPEnvelope = new Float32Array(valueCt);
    //   for (let i = 0; i < valueCt; i ++) {
    //     this.firstEnvelope[i] = traj.compute(i/(valueCt-1));
    //     this.firstLPEnvelope[i] = traj.compute(i/(valueCt-1)) * (2 ** 3);
    //   }
    // },
    // 
    // initializeChikariNodes() {
    //   if (this.chikarisGainNode) this.chikarisGainNode.disconnect();
    //   this.chikarisGainNode = this.ac.createGain();
    //   if (this.chikariNodes) this.chikariNodes.forEach(cn => cn.disconnect());
    //   this.otherNode = new AudioWorkletNode(this.ac, 'chikaris', { numberOfInputs: 1, numberOfOutputs: 4 });
    //   this.otherNode.freq0 = this.otherNode.parameters.get('freq0');
    //   this.otherNode.freq1 = this.otherNode.parameters.get('freq1');
    //   this.otherNode.freq2 = this.otherNode.parameters.get('freq2');
    //   this.otherNode.freq3 = this.otherNode.parameters.get('freq3');
    //   this.otherNode.cutoff = this.otherNode.parameters.get('Cutoff');
    //   this.otherNode.cutoff.setValueAtTime(0.6, this.now());
    //   this.otherNode.connect(this.chikarisGainNode, 0);
    //   this.otherNode.connect(this.chikarisGainNode, 1);
    //   this.otherNode.connect(this.chikarisGainNode, 2);
    //   this.otherNode.connect(this.chikarisGainNode, 3);
    //   this.chikarisGainNode.connect(this.synthGainNode);
    //   const raga = this.$parent.piece.raga;
    //   this.otherNode.freq0.setValueAtTime(raga.chikariPitches[0].frequency, this.now());
    //   this.otherNode.freq1.setValueAtTime(raga.chikariPitches[1].frequency, this.now());
    //   this.otherNode.freq2.setValueAtTime(raga.chikariPitches[2].frequency, this.now());
    //   this.otherNode.freq3.setValueAtTime(raga.chikariPitches[3].frequency, this.now());
    // },
    // 
    // initializePluckNode() {
    //   if (this.pluckNode) this.pluckNode.disconnect();
    //   if (this.lowPassNode) this.lowPassNode.disconnect();
    //   this.pluckNode = new AudioWorkletNode(this.ac, 'karplusStrong');
    //   this.lowPassNode = this.ac.createBiquadFilter();
    //   this.lowPassNode.type = 'lowpass';
    //   const fund = this.$parent.piece.raga.fundamental;
    //   this.lowPassNode.frequency.setValueAtTime(fund * (2**3), this.now());
    //   this.pluckNode.connect(this.lowPassNode).connect(this.synthGainNode);
    //   this.pluckNode.frequency = this.pluckNode.parameters.get('Frequency');
    //   this.pluckNode.cutoff = this.pluckNode.parameters.get('Cutoff');
    // },
    // end GETBACK
    
    
    async getAudio(filepath, verbose) {
      const start = await performance.now();
      const res = await fetch(filepath);
      const fetched = await performance.now() - start;
      if (verbose) console.log('fetched: ', fetched / 1000)
      const arrayBuffer = await res.arrayBuffer();
      const midpoint = await performance.now() - start;
      if (verbose) console.log('array buffd: ', midpoint/1000)
      const audioBuffer = await this.ac.decodeAudioData(arrayBuffer);
      const endpoint = await performance.now() - start;
      if (verbose) console.log('done: ', endpoint/1000)
      return audioBuffer
    },
    
    back_15() {
      this.audio.currentTime = this.audio.currentTime - 15
    },
    
    forward_15() {
      this.audio.currentTime = this.audio.currentTime + 15
    },
    
    trackEnd() {
      if (this.looping) {
        this.audio.currentTime = 0;
        this.audio.play();
      } else {
        this.$parent.nextTrack(this.shuffling, false)
      }
    },
    
    now() {
      return this.ac.currentTime
    },
    
    play() {
      let offset = this.pausedAt;
      this.startingDelta = this.pausedAt;
      this.sourceNode = this.ac.createBufferSource();
      this.sourceNode.connect(this.gainNode);
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.start(this.now(), offset);
      if (this.loop && this.loopStart && this.loopEnd) {
        this.sourceNode.loop = this.loop;
        this.sourceNode.loopStart = this.loopStart;
        this.sourceNode.loopEnd = this.loopEnd;
      }
      this.startedAt = this.now() - offset;
      this.pausedAt = 0;
      this.playing = true;    
    },
    
    stop() {
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode.stop(this.now());
        this.sourceNode = null
      }
      this.pausedAt = 0;
      this.startedAt = 0;
      this.playing = false;
    },
    
    pause() {
      const elapsed = this.now() - this.startedAt;
      this.stop();
      this.pausedAt = this.loop ? this.loopTime : elapsed;    
    },
    
    getCurrentTime() {
      if (this.pausedAt) {
        return this.pausedAt
      } else if (this.playing) {
        if (this.loop && (this.startingDelta < this.loopEnd)) {
          const dur = this.loopEnd - this.loopStart;
          const realTime = this.now() - this.startedAt;
          this.loopTime = realTime;
          if (realTime > this.loopEnd) {
            this.loopTime = this.loopStart + (realTime - this.loopStart) % dur;
          }
          return this.loopTime
        } else {
          return this.now() - this.startedAt
        }        
      } else {
        return 0
      }
    },
    
    startPlayCursorAnimation() {
      if (!this.requestId) {
        this.requestId = window.requestAnimationFrame(this.loopPlayAnimation)
      }
    },
    
    updateProgress() {
      this.progress = this.getCurrentTime() / this.audioBuffer.duration;
      const pbi = document.querySelector('.progressBarInner');
      const pbo = document.querySelector('.progressBarOuter');
      const totWidth = pbo.getBoundingClientRect().width;
      pbi.style.width = this.progress * totWidth + 'px'
    },
    
    loopPlayAnimation() {
      this.requestId = undefined;
      this.updateProgress();
      this.updateFormattedCurrentTime();
      this.updateFormattedTimeLeft();
      this.$parent.currentTime = this.getCurrentTime();
      this.startPlayCursorAnimation();
    },
    
    stopPlayCursorAnimation() {
      if (this.requestId) {
        window.cancelAnimationFrame(this.requestId);
        this.requestId = undefined
      }
    },

    togglePlay() {
      if (!this.playing) {
        this.play()
        this.$refs.playImg.classList.add('playing');
        this.$parent.startAnimationFrame();
        this.startPlayCursorAnimation();
        // GETBACK
        // this.playTrajs(this.audio.currentTime, this.now());
        // this.playChikaris(this.audio.currentTime, this.now());
        // end GETBACK
      } else {
        this.pause();
        this.$refs.playImg.classList.remove('playing');
        this.$parent.stopAnimationFrame();
        this.stopPlayCursorAnimation();
        // GETBACK
        // this.cancelPlayTrajs();
        // this.cancelBursts();
        // this.bufferSourceNodes = [];
        // end GETBACK
      }
    },
    
    // GETBACK
    // cancelPlayTrajs() {
    //   this.pluckNode.frequency.cancelScheduledValues(this.now());
    //   this.lowPassNode.frequency.cancelScheduledValues(this.now());
    //   this.synthGainNode.gain.cancelScheduledValues(this.now());
    //   this.synthGainNode.gain.setValueAtTime(1, this.now());
    //   this.synthGainNode.gain.linearRampToValueAtTime(0, this.now() + this.slowRamp);
    //   this.chikarisGainNode.gain.setValueAtTime(1, this.now());
    //   this.chikarisGainNode.gain.linearRampToValueAtTime(0, this.now() + this.slowRamp);
    // },
    // end GETBACK
    
    toggleWaveform(e) {
      const cl = e.target.classList;
      cl.toggle('showWaveform');
      this.showWaveform = this.showWaveform ? false: true;
    },
    
    goToBeginning() {
      this.audio.currentTime = 0;
      if (!this.playing) {
        this.pausedAt = 0;
        this.updateProgress()
      } else {
        this.stop();
        this.pausedAt = 0;
        this.play();
        this.updateProgress()
      }
      this.$parent.currentTime = 0;
      this.$parent.redrawPlayhead();
    },
    
    handleProgressClick(e) {
      const bb = this.$refs.pbOuter.getBoundingClientRect();
      if (!this.playing) {
        this.pausedAt = this.audioBuffer.duration * e.clientX / bb.width;
        this.$parent.currentTime = this.pausedAt;
        this.$parent.redrawPlayhead();
        this.updateProgress();
      } else {
        this.stop();
        this.pausedAt = this.audioBuffer.duration * e.clientX / bb.width;
        this.play();
      }
    },
    
    tooLeftLimit() {
      if (this.$refs.pbOuter && this.progress) {
        const bb = this.$refs.pbOuter.getBoundingClientRect();
        return this.progress < 35 / bb.width
      } else {
        return true
      }  
    },
    
    tooRightLimit() {
      if (this.$refs.pbOuter && this.progress) {
        const bb = this.$refs.pbOuter.getBoundingClientRect();
        return this.progress >= 1 - (90 / bb.width)
      } else {
        return false
      }
    },
    
    updateFormattedCurrentTime() {
      const st = structuredTime(this.getCurrentTime());
      const ms = st.minutes + ':' + st.seconds;
      this.formattedCurrentTime = st.hours !== 0 ? ms : st.hours + ':' + ms;      
    },
    
    updateFormattedTimeLeft() {
      if (isNaN(this.audioBuffer.duration)) {
        return '00:00'
      } else {
        const buf = this.audioBuffer;
        const ut = Number(buf.duration) - Number(this.getCurrentTime());
        const st = structuredTime(ut);
        const ms = st.minutes + ':' + st.seconds;
        this.formattedTimeLeft = st.hours !== 0 ? ms : st.hours + ':' + ms;
      }
    },
    
    hoverTrigger(bool) {
      const classes_ = [
        '.currentTime', 
        '.progressCircle', 
        '.timeLeft', 
        '.invisibleProgressCircle'];
      const cls = classes_.map(cl => document.querySelector(cl).classList);
      if (bool) {
        cls.forEach(cl => {
          if (!cl.contains('hovering')) cl.add('hovering')
        })
      } else {
        cls.forEach(cl => {
          if (cl.contains('hovering')) cl.remove('hovering')
        })
      }
    },
    
    handleCircleMouseDown(e) {
      this.circleDragging = true;
      this.dragStart = e.clientX;
      this.$refs.main.classList.toggle('hovering')
    },
    
    handleCircleMouseUp(e) {
      if (this.circleDragging) {
        const bb = this.$refs.pbOuter.getBoundingClientRect();
        const ct = this.audio.currentTime;
        const dur = this.audio.duration;
        const newTime = ct + dur * (e.clientX - this.dragStart) / bb.width;
        if (this.audio.fastSeek) {
          this.audio.fastSeek(newTime)
        } else {
          this.audio.currentTime = newTime
        }
        const pc = document.querySelector('.progressCircle');
        pc.style.right = '-7px';
        this.circleDragging = false;
        this.$refs.main.classList.toggle('hovering');
      }  
    },
    
    handleCircleMouseMove(e) {
      if (this.circleDragging) {
        const diff = this.dragStart - e.clientX;
        const pbi = document.querySelector('.progressBarInner');
        const pbo = document.querySelector('.progressBarOuter');
        const pboBox = pbo.getBoundingClientRect()
        pbi.style.width = pboBox.width * this.progress - diff + 'px';
      }
    }       
  }
}
</script>

<style scoped>

.player {
  position: absolute;
  width: 100%;
  height: 100px;
  left: 0px;
  bottom: 0px;
  background-color: black;
  display: flex;
  flex-direction: column;
  border-top: 1px solid black;
  pointer-events: auto;
}

.progressBarOuter {
  width: 100%;
  height: 8px;
  background-color: #242424;
  overflow-x: hidden;
}

.progressBarOuter:hover {
  cursor: pointer
}

.progressBarInner {
  width: 0px;
  background-color: lightgrey;
  height: 6px;
  position: absolute;
}

.progressBarInner:hover {
  cursor: pointer
}

.progressCircle {
  background-color: lightgrey;
  width: 14px;
  height: 14px;
  border-radius: 7px;
  position: absolute;
  right: -7px;
  top: -4px;
  opacity: 0;
  transition: opacity 0.25s 
}

.progressCircle:hover {
  cursor: pointer;
}

.controlsContainer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
}

.recInfo {
  width: 300px;
  min-width: 300px;
  height: 100%;
  background-color: black;
}

.right {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: right;
}

.rulerBox {
  width: 100px;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.rulerBox > img {
  height: 40px;
  filter: brightness(400%);
  cursor: pointer;
}

.rulerBox > img:hover {
  filter: invert(46%) sepia(42%) saturate(292%) hue-rotate(78deg) 
          brightness(94%) contrast(97%);
}

.rulerBox > .showWaveform {
  filter: invert(46%) sepia(75%) saturate(292%) hue-rotate(85deg) 
          brightness(97%) contrast(97%);
}

.controlFlexer {
  width: 100%;
  height: 100%;
  background-color: black;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.controlBox {
  width: 400px;
  height: 70px;
  background-color: black;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
}

.loadingSymbol {
  width: 400px;
  height: 70px;
  background-color: black;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.controlBox > img {
  height: 30px;
  width: 30px;
  cursor: pointer;
  filter: brightness(400%)
}


.controlBox > img:hover {
  filter: invert(46%) sepia(42%) saturate(292%) hue-rotate(78deg) 
          brightness(94%) contrast(97%);
}

.controlBox > .looping {
  filter: invert(46%) sepia(75%) saturate(292%) hue-rotate(85deg) 
          brightness(97%) contrast(97%);
}

.controlBox > .shuffling {
  filter: invert(46%) sepia(75%) saturate(292%) hue-rotate(85deg) 
          brightness(97%) contrast(97%);
}

.playCircle > img {
  object-position: 3px;
}

.playCircle > img.playing {
  object-position: 0px;
}

.playCircle {
  background-color: #242424;
  border-radius: 30px;
  width: 60px;
  height: 60px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.playCircle:hover {
  background-color: #4f4f4f
}

.playCircle > img {
  filter: brightness(400%)
}

.currentTime {
  color: white;
  position: absolute;
  top: 12px;
  right: -10px;
  width: 30px;
  height: 20px;
  text-align: center;
  opacity: 0;
  transition: opacity 0.25s
}

.timeLeft {
  color: white;
  position: absolute;
  top: 12px;
  right: 25px;
  width: 30px;
  height: 20px;
  transition: opacity 0.25s;
  opacity: 0;
}

.hovering {
  opacity: 1;
}



.tooLeft {
  left: 10px;
}

.tooRight {
  left: calc(100vw - 120px);
}

.mainq {
  user-select: none;
  width: 100vw;
  height: 100px;
  position: absolute;
  left: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1
}

.main.hovering {
  cursor: pointer
}

.invisibleProgressCircle {
  width: 500px;
  height: 100px;
  position: absolute;
  bottom: 0px;
  right: -25px;
  pointer-events: none;
  overflow: hidden;
}

.invisibleProgressCircle.hovering {
  pointer-events: auto;
}

.icon {
  fill: white;
  stroke: white;
}

.loader {
  border: 8px solid grey;
  border-top: 8px solid green;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* WaveformAnalyzer {
  position: absolute;
  left: 0px;
  bottom: 100px;
} */

</style>
