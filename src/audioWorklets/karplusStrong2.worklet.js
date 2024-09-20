const AMP = 1.25;

class Processor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'Frequency',
        defaultValue: 110,
        minValue: 50,
        maxValue: 2000,
      },
      {
        name: 'Cutoff',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
      },
    ];
  }

  constructor() {
    super();
    // Instance-specific variables
    this.dead = false;
    this.delay = new Float32Array(2048);
    this.readPtr = 0;
    this.writePtr = 0;
    this.y1 = 0;

    this.port.onmessage = (e) => {
      if (e.data === 'reset') {
        this.reset();
      } else if (e.data === 'status') {
        console.log(
          'readPtr',
          this.readPtr,
          'writePtr',
          this.writePtr,
          'dead?',
          this.dead ? 'yes' : 'no'
        );
      } else if (e.data === 'kill') {
        this.dead = true;
      }
    };
  }

  setDelayTime(time) {
    this.writePtr = (this.readPtr + time * sampleRate) & 2047;
  }

  delayInput(x) {
    this.delay[this.writePtr] = x;
    this.readPtr = (this.readPtr + 1) & 2047;
    this.writePtr = (this.writePtr + 1) & 2047;
  }

  delayOutput() {
    return this.delay[this.readPtr];
  }

  filter(x, cutoff) {
    const y = cutoff * x + (1 - cutoff) * this.y1;
    this.y1 = y;
    return y;
  }

  reset() {
    this.delay.fill(0);
    this.readPtr = 0;
    this.writePtr = 0;
    this.y1 = 0;
  }

  process(inputs, outputs, params) {
    const freq = params['Frequency'][0];
    const cutoff = params['Cutoff'][0];
    const period = 1 / freq;
    this.setDelayTime(period);

    const output = outputs[0][0];
    const input = inputs[0][0];

    if (output) {
      for (let i = 0; i < output.length; ++i) {
        let x = input ? input[i] : 0;
        x += this.filter(this.delayOutput(), cutoff);
        this.delayInput(x);
        output[i] = AMP * x;
      }
    }

    if (this.dead === true) {
      return false; // Stop the processor
    } else {
      return true; // Keep the processor alive
    }
  }
}

registerProcessor('karplusStrong', Processor);