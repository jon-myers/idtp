import { SoundTouch, SimpleFilter } from 'soundtouchjs';

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

// createBaseArray(audioBuffer) {
//   return [
//     {
//       sampleRate: this.sampleRate,
//       duration: this.duration,
//       bufferLength: this.bufferLength,
//       numberOfChannels: this.numberOfChannels,
//     },
//     audioBuffer.getChannelData(0),
//     this.numberOfChannels > 1
//       ? audioBuffer.getChannelData(1)
//       : audioBuffer.getChannelData(0),
//   ];
// }



class Stretcher {
  constructor({
    tempo = 1,
    buf = undefined, // AudioBuffer, has already been decoded when passed in
    // whole thing in one shwoop anyway.
  }={}) {
    this.pipe = new SoundTouch();
    this.tempo = tempo;
    this.buf = buf;
    this.bufferSize = buf.length / tempo;
    const bufProps = {
      sampleRate: this.buf.sampleRate,
      duration: this.buf.duration,
      bufferLength: this.buf.length,
      numberOfChannels: this.buf.numberOfChannels,
    };
    const left = this.buf.getChannelData(0);
    const right = this.buf.getChannelData(this.buf.numberOfChannels > 1 ? 1 : 0);
    this.bufferSource = new ProcessAudioBufferSource(bufProps, left, right);
    this.samples = new Float32Array(this.bufferSize * 2);
    
    this.pipe.tempo = this.tempo;
    this.filter = new SimpleFilter(this.bufferSource, this.pipe);
    this.outAudioBuffer = new AudioBuffer({
      length: Math.round(this.buf.length / this.tempo),
      numberOfChannels: this.buf.numberOfChannels,
      sampleRate: this.buf.sampleRate,
    })
    this.leftOut = this.outAudioBuffer.getChannelData(0);
    this.rightOut = this.outAudioBuffer.getChannelData(1);
  }

  process() {
    const framesExtracted = this.filter.extract(this.samples, this.bufferSize);
    for (let i = 0; i < framesExtracted; i++) {
      this.leftOut[i] = this.samples[i * 2];
      this.rightOut[i] = this.samples[i * 2 + 1];
    };
    const nanIndex = this.rightOut.findIndex(Number.isNaN);
    if (nanIndex !== -1) {
      const newOutAudioBuffer = new AudioBuffer({
        length: nanIndex,
        numberOfChannels: this.buf.numberOfChannels,
        sampleRate: this.buf.sampleRate,
      })
      // copy channel data from old buffer to new buffer
      newOutAudioBuffer.copyToChannel(this.leftOut, 0);
      newOutAudioBuffer.copyToChannel(this.rightOut, 1);
      this.outAudioBuffer = newOutAudioBuffer;
    }
  }
}

export { Stretcher }