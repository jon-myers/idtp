<template>
  <div class='main'>
    <div class='player'>
      <div class='progressBarOuter' @click='handleProgressClick' ref='pbOuter'>
        <div class='progressBarInner'>
        </div>
      </div>
      <div class='controlsContainer'>
        <div class='recInfo'>
        </div>
        <div class='controlFlexer'>
          <div class='controlBox'>
            <img :src='icons.loop'/>
            <img :src='icons.beginning' @click='goToBeginning'/>
            <div class='playCircle' @click='togglePlay'>
              <img ref='playImg' :src='[icons.play, icons.pause][Number(this.playing)]'/>
            </div>
            <img :src='icons.end'/>
            <img :src='icons.shuffle'/>
          </div>
        </div>
        <div class='recInfo'>
        </div>
      </div>
    </div>
    <audio ref='audio'> 
      <source :src='audioSource' type='audio/mpeg'>
    </audio>
  
  </div>
</template>
<script>

import beginningIcon from '@/assets/icons/beginning.svg';
import endIcon from '@/assets/icons/end.svg';
import loopIcon from '@/assets/icons/loop.svg';
import pauseIcon from '@/assets/icons/pause.svg';
import playIcon from '@/assets/icons/play.svg';
import shuffleIcon from '@/assets/icons/shuffle.svg';

export default {
  name: 'AudioPlayer',
  
  data() {
    return {
      progress: 0.0,
      playing: false,
      audio: {
        paused: false
      },
      icons: {
        beginning: beginningIcon,
        end: endIcon,
        loop: loopIcon,
        pause: pauseIcon,
        play: playIcon,
        shuffle: shuffleIcon
      }  
    }
  },
  
  components: {
    // beginningIcon,
    // endIcon,
    // loopIcon,
    // pauseIcon,
    // playIcon,
    // shuffleIcon
  },
  
  props: [
    'audioSource'
  ],
  
  mounted() {
    this.audio = new Audio();
    this.audio.ontimeupdate = () => {
      this.progress = this.audio.currentTime / this.audio.duration
    }
  },
  
  watch: {
    audioSource(newSrc) {
      this.audio.src = newSrc;
      this.audio.play();
      this.playing = true;
      this.$refs.playImg.className = 'playing';
      
    }
  },
  
  methods: {
    
    // getSrc(src) {
    //   return require(src)
    // }
    togglePlay() {
      if (this.audio.paused) {
        this.audio.play();
        this.playing = true
      } else {
        this.audio.pause();
        this.playing = false
      }
    },
    
    goToBeginning() {
      this.audio.currentTime = 0
    },
    
    handleProgressClick(e) {
      const bb = this.$refs.pbOuter.getBoundingClientRect();
      this.audio.currentTime = this.audio.duration * e.clientX / bb.width
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
  /* border-top: 2px solid black; */
}

.progressBarOuter {
  width: 100%;
  height: 8px;
  background-color: #242424;
}

.progressBarInner {
  width: v-bind(progress*100+'vw');
  background-color: lightgrey;
  height: 6px;
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
  filter: invert(46%) sepia(42%) saturate(292%) hue-rotate(78deg) brightness(94%) contrast(97%);
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



</style>
