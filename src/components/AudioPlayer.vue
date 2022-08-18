<template>
  <div class='main'>
    <div class='player'>
      <div class='progressBarOuter'>
        <div class='progressBarInner'>
        </div>
      </div>
      <div class='controlsContainer'>
        <div class='recInfo'>
        </div>
        <div class='controlFlexer'>
          <div class='controlBox'>
            <img :src='icons.loop'/>
            <img :src='icons.beginning'/>
            <div class='playCircle'>
              <img :src='icons.play'/>
            </div>
            <img :src='icons.end'/>
            <img :src='icons.shuffle'/>
          </div>
        </div>
        <div class='recInfo'>
        </div>
      </div>
    </div>
  
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
      progress: 0.1,
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
  
  mounted() {
    
  },
  
  methods: {
    
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
  width: 200px;
  min-width: 200px;
  height: 100%;
  background-color: pink;
}

.controlFlexer {
  width: 100%;
  height: 100%;
  background-color: blue;
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

.playCircle {
  background-color: grey;
  border-radius: 30px;
  width: 60px;
  height: 60px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.playCircle > img {
  filter: brightness(400%)
}



</style>
