class BiquadFilter {
  b0;
  b1;
  b2;
  a1;
  a2;
  x1;
  x2;
  y1;
  y2;

  constructor(b0, b1, b2, a1, a2) {
    this.b0 = b0;
    this.b1 = b1;
    this.b2 = b2;
    this.a1 = a1;
    this.a2 = a2;
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
  }

  process(x) {
    const output = (
      this.b0 * x + 
      this.b1 * this.x1 + 
      this.b2 * this.x2 - 
      this.a1 * this.y1 - 
      this.a2 * this.y2
    );
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = output;
    return output;
  }

  static lowPass(sr, freq, q) {
    const OMEGA_c = 2 * Math.PI * freq / sr;
    const omega_c = 2 * sr * Math.tan(OMEGA_c / 2);
    const b0 = omega_c ** 2 / (
      omega_c ** 2 + 
      2 * (omega_c / q) * sr +
      4 * sr ** 2
      );
    const b1 = 2 * b0;
    const b2 = b0;
    const a1 = 2 * (4 * sr ** 2 - omega_c ** 2) / (
      omega_c ** 2 + 
      2 * (omega_c / q) * sr +
      4 * sr ** 2
      );
    const a2 = (
      omega_c ** 2 - 
      2 * (omega_c / q) * sr +
      4 * sr ** 2
      ) / (
      omega_c ** 2 + 
      2 * (omega_c / q) * sr +
      4 * sr ** 2
      );
    return new BiquadFilter(b0, b1, b2, a1, a2);
  }

  static notch(sr, freq, bw) {
    const omega_0 = 2 * Math.PI * freq / sr;
    const alpha = Math.sin(omega_0) * Math.sinh(Math.log(2) / 2 * bw * omega_0 / Math.sin(omega_0));
    const a0 = 1 + alpha;
    const b0 = 1 / a0;
    const b1 = -2 * Math.cos(omega_0) / a0;
    const b2 = 1 / a0;
    const a1 = -2 * Math.cos(omega_0) / a0;
    const a2 = (1 - alpha) / a0;
    return new BiquadFilter(b0, b1, b2, a1, a2);

  }

  calculateLowpass(sr, freq, q) {
    const OMEGA_c = 2 * Math.PI * freq / sr;
    const omega_c = 2 * sr * Math.tan(OMEGA_c / 2);
    const b0 = omega_c ** 2 / (
      omega_c ** 2 + 
      2 * (omega_c / q) * sr +
      4 * sr ** 2
      );
    const b1 = 2 * b0;
    const b2 = b0;
    const a1 = 2 * (4 * sr ** 2 - omega_c ** 2) / (
      omega_c ** 2 + 
      2 * (omega_c / q) * sr +
      4 * sr ** 2
      );
    const a2 = (
      omega_c ** 2 - 
      2 * (omega_c / q) * sr +
      4 * sr ** 2
      ) / (
      omega_c ** 2 + 
      2 * (omega_c / q) * sr +
      4 * sr ** 2
      );
    this.b0 = b0;
    this.b1 = b1;
    this.b2 = b2;
    this.a1 = a1;
    this.a2 = a2;
  }

  static bandPass(sr, freq, q) {
    const omega = 2 * Math.PI * freq / sr;
    const beta = Math.sin(omega) / (2 * q);
    const b0 = (Math.sin(omega) / 2) / (1 + beta);
    const b1 = 0;
    const b2 = -b0;
    const a1 = -2 * Math.cos(omega) / (1 + beta);
    const a2 = (1 - beta) / (1 + beta);
    return new BiquadFilter(b0, b1, b2, a1, a2);
  }

  calculateBandpass(sr, freq, q) {
    const omega = 2 * Math.PI * freq / sr;
    const beta = Math.sin(omega) / (2 * q);
    const b0 = (Math.sin(omega) / 2) / (1 + beta);
    const b1 = 0;
    const b2 = -b0;
    const a1 = -2 * Math.cos(omega) / (1 + beta);
    const a2 = (1 - beta) / (1 + beta);
    return [b0, b1, b2, a1, a2];
  }

}

const closeTo = (a, b) => Math.abs(a - b) < 0.000001;

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
        name: 'BowGain',
        defaultValue: 0.3,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: 'Gain',
        defaultValue: 0.0,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: 'BandPassFrequency',
        defaultValue: 800,
        minValue: 100,
        maxValue: 5000,
      },
      {
        name: 'BandPassQ',
        defaultValue: 1.0,
        minValue: 0.1,
        maxValue: 10,
      },
    ]
  }

  constructor() {
    super();
    this.prevBandPassFreq = 800;
    this.prevBandPassQ = 1.0;
  }

  process(
    inputs, 
    outputs, 
    parameters
    ) {
    let freq = parameters['Frequency'];
    let bowGain = parameters['BowGain'];
    let gain = parameters['Gain'];
    let bandPassFreq = parameters['BandPassFrequency'][0];
    let bandPassQ = parameters['BandPassQ'][0];
    const c1 = closeTo(bandPassFreq, this.prevBandPassFreq)
    const c2 = closeTo(bandPassQ, this.prevBandPassQ)
    if (!c1 || !c2) {
      noiseFilter.calculateBandpass(sampleRate, bandPassFreq, bandPassQ);
      this.prevBandPassFreq = bandPassFreq;
      this.prevBandPassQ = bandPassQ;
    }
    const feedbackGain = 0.98;
    if (freq.length === 1) {
      const period = 1/freq[0];
      setDelayTime(period / 2);
    }
    const out = outputs[0][0];
    if (out) {
      for (let i = 0; i < out.length; i++) {
        let del2Sig = readFromDelay2();
        if (isNaN(del2Sig)) {
          return false
        }
        if (freq.length > 1) {
          const period = 1/freq[i];
          setDelayTime(period / 2);
        }
        let noiseSig = Math.random() * 2 - 1;
        noiseSig = noiseFilter.process(noiseSig);
        const bowGainVal = bowGain.length === 1 ? bowGain[0] : bowGain[i];
        let feedbackSig = noiseSig * bowGainVal + del2Sig * feedbackGain;
        writeToDelay1(feedbackSig);
        let del1Sig = readFromDelay1();
        del1Sig = filter(del1Sig, 0.4);
        writeToDelay2(del1Sig);
        let resSig = del2Sig;
        const parallelSigs = resFilters.map((filter) => filter.process(resSig));
        resSig = parallelSigs.reduce((acc, val) => acc + val, 0);
        resSig = resSig * 0.2;
        resSig = notchFilter.process(resSig);
        const gainVal = gain.length === 1 ? gain[0] : gain[i]; 
        out[i] = resSig * gainVal;
      }
    }
    return true;
  }
}

registerProcessor('sarangi', Processor);
const sampleRate = 48000;
const delay1 = [...Array(2048)].map(() => 0);
let readPtr1 = 0;
let writePtr1 = 0;
const delay2 = [...Array(2048)].map(() => 0);
let readPtr2 = 0;
let writePtr2 = 0;

const setDelayTime = (time) => {
  writePtr1 = readPtr1 + time * sampleRate & 2047;
  writePtr2 = readPtr2 + time * sampleRate & 2047;
}

const writeToDelay1 = (x) => {
  delay1[writePtr1] = x;
  writePtr1 = (writePtr1 + 1) & 2047;
  readPtr1 = (readPtr1 + 1) & 2047;
}

const writeToDelay2 = (x) => {
  delay2[writePtr2] = x;
  writePtr2 = (writePtr2 + 1) & 2047;
  readPtr2 = (readPtr2 + 1) & 2047;
}

const readFromDelay1 = () => delay1[readPtr1];
const readFromDelay2 = () => delay2[readPtr2];
const noiseFilter = BiquadFilter.bandPass(sampleRate, 1000, 1);
const resFreqs = [185, 275, 405, 460, 530];
const resFilters = resFreqs.map((freq) => {
  return BiquadFilter.bandPass(sampleRate, freq, 1)
});

const notchFilter = BiquadFilter.notch(sampleRate, 10000, 1.4);

let smoothing_y1 = 0;

const filter = (x, cutoff) => {
    const y = cutoff * x + (1 - cutoff) * smoothing_y1;
    smoothing_y1 = y;
    return y;
}