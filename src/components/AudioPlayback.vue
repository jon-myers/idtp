<template>
  <div class='main'>
    <audio ref='audio' crossorigin='anonymous' :src='audioPath' @ended='end'></audio>
  </div>
</template>
<script>

const AudioContext = window.AudioContext || window.webkitAudioContext;

// import audioSample from '@/assets/yaman_0.wav';

export default {
  name: 'AudioPlayback',

  data() {
    return {
      sample: undefined,
      time: 0,
      audioSample: undefined,
      audioPath: undefined,
      playing: false,
      sendRate: 100,
      pieceLoaded: false,
      url: 'https://swara.studio/',
      rampTime: 0.05

    }
  },

  mounted() {
    this.ac = new AudioContext();



    this.emitter.on('toggleAudio', () => {
      if (this.audioElement) {
        this.toggleAudio()
      }
    });

    this.emitter.on('setTime', newTime => {
      if (this.audioElement) this.audioElement.currentTime = newTime
    });

    this.emitter.on('recordingVolume', vol => {
      this.gainNode.gain.linearRampToValueAtTime(Number(vol), this.ac.currentTime + this.rampTime)
    });

    this.emitter.on('newPiece', piece => {
      if (typeof piece.audioID === 'number') {
        this.pieceLoaded = true;
        this.audioSample = this.url + `audio/${piece.audioID}.wav`;
        this.audioPath = this.url + `audio/${piece.audioID}.wav`;
        this.audioElement = this.$refs.audio;
        this.src = this.ac.createMediaElementSource(this.audioElement);
        this.gainNode = this.ac.createGain();
        this.gainNode.gain.setValueAtTime(0, this.ac.currentTime);
        this.src.connect(this.gainNode).connect(this.ac.destination);
        this.audioElement.onloadeddata = () => {
          this.emitter.emit('audioDurTot', this.audioElement.duration);
        }
      }
    })



    // this.audioElement.addEventListener('timeupdate', () => {
    //   this.emitter.emit('currentTime', this.audioElement.currentTime)
    // })

  },

  beforeUnmount() {
    this.emitter.off('toggleAudio')
    this.emitter.off('setTime')
    this.emitter.off('newPiece')
  },

  methods: {

    toggleAudio() {
      if (this.ac.state === 'suspended') this.ac.resume();
      if (this.playing === false) {
        this.audioElement.play();
        this.playing = true;
        this.startSendingCurrentTime();
      } else if (this.playing === true) {
        this.audioElement.pause();
        this.playing = false;
        this.stopSendingCurrentTime();
      }
      this.emitter.emit('currentTime', this.audioElement.currentTime)
    },

    startSendingCurrentTime() {

    },

    stopSendingCurrentTime() {
      clearTimeout(this.ctSender)
    },

    end() {
      this.playing = false;
      this.emitter.emit('end')
    }


  }
}
</script>

<style scoped>

</style>
