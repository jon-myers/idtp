import { SoundTouch, SimpleFilter } from 'soundtouchjs';
// import AudioBuffer from 'audiobuffer';

class ProcessAudioBufferSource {
  constructor(bufferProps, leftChannel, rightChannel) {
    Object.assign(this, bufferProps);
    this.leftChannel = leftChannel;
    this.rightChannel = rightChannel;
    this._position = 0;
  }

  get position() {
    return this._position;
  }

  set position(value) {
    this._position = value;
  }

  extract(target, numFrames = 0, position = 0) {
    this.position = position;
    let i = 0;
    for (; i < numFrames; i++) {
      target[i * 2] = this.leftChannel[i + position];
      target[i * 2 + 1] = this.rightChannel[i + position];
    }
    return numFrames;
  }
}

class Stretcher {
  constructor({
    tempo = 1,
    // buf = undefined,
    left = undefined,
    right = undefined,
    sampleRate = 48000,
  }={}) {
    if (sampleRate === undefined) {
      sampleRate = 48000;
    }
    this.pipe = new SoundTouch();
    this.tempo = tempo;
    // this.buf = buf;
    this.bufferSize = Math.round(left.length / tempo);
    const bufProps = {
      sampleRate: sampleRate,
      duration: left.length / sampleRate,
      bufferLength: left.length,
      numberOfChannels: 2,
    };
    // const left = this.buf.getChannelData(0);
    // const right = this.buf.getChannelData(this.buf.numberOfChannels > 1 ? 1 : 0);
    this.bufferSource = new ProcessAudioBufferSource(bufProps, left, right);
    this.samples = new Float32Array(this.bufferSize * 2);
    
    this.pipe.tempo = this.tempo;
    this.filter = new SimpleFilter(this.bufferSource, this.pipe);
    // console.log(sampleRate)
    // this.outAudioBuffer = new AudioBuffer({
    //   length: this.bufferSize,
    //   numberOfChannels: 2,
    //   sampleRate: sampleRate,
    // })
    // this.leftOut = this.outAudioBuffer.getChannelData(0);
    // this.rightOut = this.outAudioBuffer.getChannelData(1);
    this.leftOut = new Float32Array(this.bufferSize);
    this.rightOut = new Float32Array(this.bufferSize);
  }

  process() {
    const framesExtracted = this.filter.extract(this.samples, this.bufferSize);
    for (let i = 0; i < framesExtracted; i++) {
      this.leftOut[i] = this.samples[i * 2];
      this.rightOut[i] = this.samples[i * 2 + 1];
    };
    const nanIndex = this.rightOut.findIndex(Number.isNaN);
    if (nanIndex !== -1) {
      this.leftOut = this.leftOut.slice(0, nanIndex);
      this.rightOut = this.rightOut.slice(0, nanIndex);
    }
  }
}

onmessage = function(event) {
  const data = event.data;
  if (data.name === 'stretch') {
    const tempo = data.tempo;
    const left = data.left;
    const right = data.right;
    const stretcher = new Stretcher({ 
      tempo: tempo, 
      left: left, 
      right: right 
    });
    stretcher.process();
    postMessage({
      name: 'stretched',
      left: stretcher.leftOut,
      right: stretcher.rightOut,
    })
  }
}


