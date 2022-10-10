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
              <img ref='playImg' :src='[icons.play, icons.pause][Number(this.playing)]'/>
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
}

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
      loopEnd: undefined
    }
  },
  
  components: {
  },
  
  props: [
    'audioSource', 
    'saEstimate',
    'saVerified',
    'id'
  ],
  
  async mounted() {
    this.ac = new AudioContext();
    this.gainNode = this.ac.createGain();
    this.gainNode.connect(this.ac.destination);
    
    
    // this.audio = new Audio();
    // this.audio.ontimeupdate = () => {
    //   this.progress = this.audio.currentTime / this.audio.duration;
    //   const pbi = document.querySelector('.progressBarInner');
    //   const pbo = document.querySelector('.progressBarOuter');
    //   const totWidth = pbo.getBoundingClientRect().width;
    //   pbi.style.width = this.progress * totWidth + 'px'
    //   this.updateFormattedCurrentTime();
    //   this.updateFormattedTimeLeft();
    //   this.$parent.currentTime = this.audio.currentTime
    // };
    // this.audio.onended = this.trackEnd
  },
  
  watch: {
    async audioSource(newSrc) {
      this.loading = true;
      this.audioBuffer = await this.getAudio(newSrc, false);
      this.loading = false;
    }
  },
  
  computed: {
    
    
  },
  
  methods: {
    
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
          const loopDur = this.loopEnd - this.loopStart;
          const realTime = this.now() - this.startedAt;
          this.loopTime = realTime;
          if (realTime > this.loopEnd) {
            this.loopTime = this.loopStart + (realTime - this.loopStart) % loopDur;
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
        this.requestId = window.requestAnimationFrame(this.loopPlayCursorAnimation)
      }
    },
    
    updateProgress() {
      this.progress = this.getCurrentTime() / this.audioBuffer.duration;
      const pbi = document.querySelector('.progressBarInner');
      const pbo = document.querySelector('.progressBarOuter');
      const totWidth = pbo.getBoundingClientRect().width;
      pbi.style.width = this.progress * totWidth + 'px'
    },
    
    loopPlayCursorAnimation() {
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
        this.startPlayCursorAnimation()
      } else {
        this.pause();
        this.$refs.playImg.classList.remove('playing');
        this.$parent.stopAnimationFrame();
        this.stopPlayCursorAnimation();
      }
    },
    
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
      
      // this.audio.currentTime = this.audio.duration * e.clientX / bb.width;
      // this.$parent.currentTime = this.audio.currentTime;
      // this.$parent.redrawPlayhead();
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
      if (st.hours !== 0) {
        this.formattedCurrentTime = st.minutes + ':' + st.seconds
      } else {
        this.formattedCurrentTime = st.hours + ':' + st.minutes + ':' + st.seconds
      }       
    },
    
    updateFormattedTimeLeft() {
      if (isNaN(this.audioBuffer.duration)) {
        return '00:00'
      } else {
        const st = structuredTime(Number(this.audioBuffer.duration) - Number(this.getCurrentTime()))
        if (st.hours !== 0) {
          this.formattedTimeLeft = st.minutes + ':' + st.seconds
        } else {
          this.formattedTimeLeft = st.hours + ':' + st.minutes + ':' + st.seconds
        } 
      }
    
    },
    
    hoverTrigger(bool) {
      // const cl = document.querySelector('.currentTime').classList;
      // const ocl = document.querySelector('.progressCircle').classList;
      // const ecl = document.querySelector('.timeLeft').classList;
      // const lcl = document.querySelector('.invisibleProgressCircle').classList;
      // 
      const classes_ = ['.currentTime', '.progressCircle', '.timeLeft', '.invisibleProgressCircle'];
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
      // console.log(e)
      this.dragStart = e.clientX;
      this.$refs.main.classList.toggle('hovering')
      
    },
    
    handleCircleMouseUp(e) {
      if (this.circleDragging) {
        const bb = this.$refs.pbOuter.getBoundingClientRect()
        const newTime = this.audio.currentTime + this.audio.duration * (e.clientX - this.dragStart) / bb.width;
        if (this.audio.fastSeek) {
          this.audio.fastSeek(newTime)
        } else {
          this.audio.currentTime = newTime
        }
        const pc = document.querySelector('.progressCircle');
        pc.style.right = '-7px';
        this.circleDragging = false;
        this.$refs.main.classList.toggle('hovering');
        // const pbi = document.querySelector('.progressBarInner');
        // pbi.style.width = "v-bind(progress*100+'vw')"
      }
      
      
      
    },
    
    handleCircleMouseMove(e) {
      if (this.circleDragging) {
        // const currentX = e.clientX;
        const diff = this.dragStart - e.clientX;
        // const pc = document.querySelector('.progressCircle');
        // pc.style.right = diff - 7 + 'px';
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
  /* overflow-x: hidden; */
  /* overflow-x: hidden;
  overflow-y: visible; */
  /* border-top: 2px solid black; */
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
  /* opacity: 0; */
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
  filter: invert(46%) sepia(42%) saturate(292%) hue-rotate(78deg) brightness(94%) contrast(97%);
}

.rulerBox > .showWaveform {
  filter: invert(46%) sepia(75%) saturate(292%) hue-rotate(85deg) brightness(97%) contrast(97%);
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
  filter: invert(46%) sepia(42%) saturate(292%) hue-rotate(78deg) brightness(94%) contrast(97%);
}

.controlBox > .looping {
  filter: invert(46%) sepia(75%) saturate(292%) hue-rotate(85deg) brightness(97%) contrast(97%);
}

.controlBox > .shuffling {
  filter: invert(46%) sepia(75%) saturate(292%) hue-rotate(85deg) brightness(97%) contrast(97%);
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
