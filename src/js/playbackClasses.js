import createSoundTouchNode from '@soundtouchjs/audio-worklet';
import regeneratorRuntime from 'regenerator-runtime';

class SoundTouch {
  constructor({ 
    rate = 1, 
    looping = true, 
    extThis=undefined, 
    buf=undefined, 
    destination=undefined,
    node=undefined } = {}) {
    this.rate = rate;
    this.looping = looping;
    this.extThis = extThis;
    this.buf = buf;
    this.destination = destination;
    this.node = undefined;
    this.playing = false;
    this.paused = false;
    if (this.destination === undefined) {
      this.destination = this.extThis.ac.destination;
    }
  }

  play() {
    if (this.playing) {
      return
    } else if (this.paused) {
      this.node.play();
      this.playing = true;
      this.paused = false;
    } else {
      if (this.node) {
        this.node.off();
        this.node.disconnect();
      }
      this.node = createSoundTouchNode(this.extThis.ac, AudioWorkletNode, this.buf);
      this.node.connect(this.destination);
      this.node.on('initialized', () => {
        this.node.tempo = 1 / this.rate;
        this.node.connectToBuffer();
        this.node.play();
        this.playing = true;
      })
      this.node.on('end', () => {
        this.playing = false;
        if (this.looping) {
          this.play();
        }
      })
    }
  }

  reset() {
    if (this.node) {
      this.node.stop();
      this.node.off();
      this.node.disconnect();
      this.node = undefined;
    }
    this.playing = false;
    this.paused = false;
  }

  pause() {
    if (this.playing) {
      this.node.pause();
      this.paused = true;
      this.playing = false;
    }
  }

  setRate(rate) {
    this.rate = rate;
    if (this.node) {
      this.node.tempo = 1 / rate;
    }
  }
}

export { SoundTouch };