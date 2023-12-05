<template>
  <div class='mainq' ref='main' @contextmenu='handleRightClick'>
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
          <div class='controlBox'>
            <img :src='icons.loop' @click='toggleLoop'/>
            <img :src='icons.beginning' @click='goToBeginning'/>
            <div class='playCircle' @click='togglePlay'>
              <img 
                ref='playImg' 
                :src='[icons.play, icons.pause][Number(playing)]'
                />
            </div>
            <img :src='icons.end' @click='trackEnd'/>
            <img :src='icons.shuffle' @click='toggleShuffle'/>
          </div>
        </div>
        <div class='recInfo right'>
          <!-- <div class='rulerBox'>
            <img :src='icons.ruler' @click='toggleWaveform' />
          </div> -->
        </div>
      </div>
    </div>
    <!-- <WaveformAnalyzer
      class='waveformAnalyzer'
      v-show='showWaveform' 
      :initSaEstimate='saEstimate' 
      :initSaVerified='saVerified'
      ref='waveformAnalyzer'
      :key='waKey'/> -->
    
  
  </div>
</template>
<script lang='ts'>

import beginningIcon from '@/assets/icons/beginning.svg';
import endIcon from '@/assets/icons/end.svg';
import loopIcon from '@/assets/icons/loop.svg';
import pauseIcon from '@/assets/icons/pause.svg';
import playIcon from '@/assets/icons/play.svg';
import shuffleIcon from '@/assets/icons/shuffle.svg';
// import rulerIcon from '@/assets/icons/ruler.svg';
// import WaveformAnalyzer from '@/components/audioEvents/WaveformAnalyzer.vue';

const structuredTime = (dur: number) => {
  const hours = String(Math.floor(dur / 3600));
  const minutes = leadingZeros(Math.floor((dur % 3600) / 60));
  const seconds = leadingZeros(Math.round(dur % 60));
  return { hours: hours, minutes: minutes, seconds: seconds }
};

const leadingZeros = (int: number) => {
  if (int < 10) {
    return '0'+int
  } else {
    return String(int)
  }
}


type AudioPlayerData = {
  progress: number,
  playing: boolean,
  looping: boolean,
  shuffling: boolean,
  showWaveform: boolean,
  audio?: HTMLAudioElement,
  icons: {
    beginning: string,
    end: string,
    loop: string,
    pause: string,
    play: string,
    shuffle: string,
    // ruler: string
  },
  circleDragging: boolean,
  formattedCurrentTime: string,
  formattedTimeLeft: string,
  waKey: number,
  dragStart: number,
}


export default {
  name: 'GenericAudioPlayer',
  
  data(): AudioPlayerData {
    return {
      progress: 0.0,
      playing: false,
      looping: false,
      shuffling: false,
      showWaveform: false,
      audio: undefined,
      icons: {
        beginning: beginningIcon,
        end: endIcon,
        loop: loopIcon,
        pause: pauseIcon,
        play: playIcon,
        shuffle: shuffleIcon,
        // ruler: rulerIcon
      },
      circleDragging: false,
      formattedCurrentTime: '00:00',
      formattedTimeLeft: '00:00',
      waKey: 0,
      dragStart: 0
    }
  },
  
  components: {
    // WaveformAnalyzer
  },
  
  props: [
    'audioSource',
    'saEstimate',
    'saVerified',
    'id'
  ],
  
  mounted() {
    this.audio = new Audio() as HTMLAudioElement;
    this.audio.ontimeupdate = () => {
      this.progress = this.audio!.currentTime / this.audio!.duration;
      const pbi = document.querySelector('.progressBarInner') as HTMLDivElement;
      const pbo = document.querySelector('.progressBarOuter');
      if (pbo) {
        const totWidth = pbo.getBoundingClientRect().width;
        pbi!.style.width = this.progress * totWidth + 'px'
        this.updateFormattedCurrentTime();
        this.updateFormattedTimeLeft();
      }
      
    };
    this.audio.onended = this.trackEnd
  },
  
  watch: {
    audioSource(newSrc) {
      if (this.audio === undefined) {
        throw new Error('audio is undefined')
      }
      this.audio.src = newSrc;
      this.audio.play();
      this.playing = true;
      const playImg = this.$refs.playImg as HTMLImageElement;
      playImg.className = 'playing';
    }
  },
  
  methods: {
    trackEnd() {
      if (this.looping) {
        if (this.audio === undefined) {
          throw new Error('audio is undefined')
        }
        this.audio.currentTime = 0;
        this.audio.play();
        this.playing = true;
      } else {
        this.$emit('emitNextTrack', this.shuffling, false)
      }
    },
    
    togglePlay() {
      if (this.audio === undefined) {
        throw new Error('audio is undefined')
      }
      if (this.audio.paused) {
        if (this.audio.currentSrc === '') {
          this.$emit('emitNextTrack', this.shuffling, true)
        } else {
          this.audio.play();
          this.playing = true
        }
      } else {
        this.audio.pause();
        this.playing = false
      }
    },
    
    toggleLoop(e: MouseEvent) {
      const target = e.target as HTMLImageElement;
      const cl = target.classList;
      cl.toggle('looping');
      this.looping = this.looping ? false : true;
    },
    
    toggleShuffle(e: MouseEvent) {
      const target = e.target as HTMLImageElement;
      const cl = target.classList;
      cl.toggle('shuffling');
      this.shuffling = this.shuffling ? false : true;
    },
    
    toggleWaveform(e: MouseEvent) {
      const target = e.target as HTMLImageElement;
      const cl = target.classList;
      cl.toggle('showWaveform');
      this.showWaveform = this.showWaveform ? false: true;
    },
    
    goToBeginning() {
      if (this.audio === undefined) {
        throw new Error('audio is undefined')
      }
      this.audio.currentTime = 0
    },
    
    handleProgressClick(e: MouseEvent) {
      if (this.audio === undefined) {
        throw new Error('audio is undefined')
      }
      const pbOuter = this.$refs.pbOuter as HTMLDivElement;
      const bb = pbOuter.getBoundingClientRect();
      this.audio.currentTime = this.audio.duration * e.clientX / bb.width
    },
    
    tooLeftLimit() {
      if (this.$refs.pbOuter && this.progress) {
        const pbOuter = this.$refs.pbOuter as HTMLDivElement;
        const bb = pbOuter.getBoundingClientRect();
        return this.progress < 35 / bb.width
      } else {
        return true
      }  
    },
    
    tooRightLimit() {
      if (this.$refs.pbOuter && this.progress) {
        const pbOuter = this.$refs.pbOuter as HTMLDivElement;
        const bb = pbOuter.getBoundingClientRect();
        return this.progress >= 1 - (90 / bb.width)
      } else {
        return false
      }
    },
    
    updateFormattedCurrentTime() {
      if (this.audio === undefined) {
        throw new Error('audio is undefined')
      }
      const st = structuredTime(this.audio.currentTime);
      if (st.hours !== '0') {
        this.formattedCurrentTime = st.minutes + ':' + st.seconds
      } else {
        this.formattedCurrentTime = [st.hours, st.minutes, st.seconds].join(':')
      }       
    },
    
    updateFormattedTimeLeft() {
      if (this.audio === undefined) {
        throw new Error('audio is undefined')
      }
      if (isNaN(this.audio.duration)) {
        return '00:00'
      } else {
        const au = this.audio;
        const st = structuredTime(Number(au.duration) - Number(au.currentTime))
        if (st.hours !== '0') {
          this.formattedTimeLeft = st.minutes + ':' + st.seconds
        } else {
          this.formattedTimeLeft = [st.hours, st.minutes, st.seconds].join(':')
        } 
      }
    
    },
    
    hoverTrigger(bool: boolean) {
      const classes_ = [
        '.currentTime', 
        '.progressCircle', 
        '.timeLeft', 
        '.invisibleProgressCircle'
      ];
      const cls = classes_.map(cl => document.querySelector(cl)!.classList);
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
    
    handleCircleMouseDown(e: MouseEvent) {
      this.circleDragging = true;
      this.dragStart = e.clientX;
      const main = this.$refs.main as HTMLDivElement;
      main.classList.toggle('hovering')
    },
    
    handleCircleMouseUp(e: MouseEvent) {
      if (this.circleDragging) {
        const pbOuter = this.$refs.pbOuter as HTMLDivElement;
        const bb = pbOuter.getBoundingClientRect()
        if (this.audio === undefined) {
          throw new Error('audio is undefined')
        }
        let offset = this.audio.duration * (e.clientX - this.dragStart) 
        offset /= bb.width;
        const newTime = this.audio.currentTime + offset;
        if (this.audio.fastSeek) {
          this.audio.fastSeek(newTime)
        } else {
          this.audio.currentTime = newTime
        }
        const pc = document.querySelector('.progressCircle') as HTMLDivElement;
        pc.style.right = '-7px';
        this.circleDragging = false;
        const main = this.$refs.main as HTMLDivElement;
        main.classList.toggle('hovering');
      }
    },
    
    handleCircleMouseMove(e: MouseEvent) {
      if (this.circleDragging) {
        const diff = this.dragStart - e.clientX;
        const pbi = document.querySelector('.progressBarInner') as HTMLDivElement;
        const pbo = document.querySelector('.progressBarOuter') as HTMLDivElement;
        const pboBox = pbo.getBoundingClientRect()
        pbi.style.width = pboBox.width * this.progress - diff + 'px';
      }
    },

    handleRightClick(e: MouseEvent) {
      e.preventDefault();
    },
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
/* 
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
} */

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

/* .waveformAnalyzer {
  z-index: -2
} */
</style>
