import { demoFrameParms, Generator } from 'klatt-syn';

class Processor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'f0',
        defaultValue: 247,
        minValue: 0,
        maxValue: 1000
      },
      {
        name: 'flutterLevel',
        defaultValue: 0.25,
        minValue: 0,
        maxValue: 1
      },
      {
        name: 'openPhaseRatio',
        defaultValue: 0.7,
        minValue: 0,
        maxValue: 1
      },
      {
        name: 'breathinessDb',
        defaultValue: -25,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'tiltDb',
        defaultValue: 0,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'gainDb',
        defaultValue: 0,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'agcRmsLevel',
        defaultValue: 0.18,
        minValue: 0,
        maxValue: 1
      },
      {
        name: 'f1',
        defaultValue: 520,
        minValue: 0,
        maxValue: 6000
      },
      {
        name: 'f2',
        defaultValue: 1006,
        minValue: 0,
        maxValue: 6000
      },
      {
        name: 'f3',
        defaultValue: 2831,
        minValue: 0,
        maxValue: 6000
      },
      {
        name: 'f4',
        defaultValue: 3168,
        minValue: 0,
        maxValue: 6000
      },
      {
        name: 'f5',
        defaultValue: 4135,
        minValue: 0,
        maxValue: 6000
      },
      {
        name: 'f6',
        defaultValue: 5020,
        minValue: 0,
        maxValue: 6000
      },
      {
        name: 'b1',
        defaultValue: 76,
        minValue: 0,
        maxValue: 1000
      },
      {
        name: 'b2',
        defaultValue: 102,
        minValue: 0,
        maxValue: 1000
      },
      {
        name: 'b3',
        defaultValue: 72,
        minValue: 0,
        maxValue: 1000
      },
      {
        name: 'b4',
        defaultValue: 102,
        minValue: 0,
        maxValue: 1000
      },
      {
        name: 'b5',
        defaultValue: 816,
        minValue: 0,
        maxValue: 1000
      },
      {
        name: 'b6',
        defaultValue: 596,
        minValue: 0,
        maxValue: 1000
      },
      {
        name: 'db1',
        defaultValue: 0,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'db2',
        defaultValue: -8,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'db3',
        defaultValue: -15,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'db4',
        defaultValue: -19,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'db5',
        defaultValue: -30,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'db6',
        defaultValue: -35,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'cascadeEnabled',
        defaultValue: 1,
        minValue: 0,
        maxValue: 1
      },
      {
        name: 'cascadeVoicingDb',
        defaultValue: 0,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'cascadeAspirationDb',
        defaultValue: -25,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'cascadeAspirationMod',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1
      },
      { // this needs to be set as NaN much of the time, via other parameter trigger
        name: 'nasalFormantFreq',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1000
      },
      {
        name: 'nasalFormantFreqToggle',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1
      },
      { // this needs to be set as NaN much of the time, via other parameter trigger
        name: 'nasalFormantBw',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1000
      },
      {
        name: 'nasalFormantBwToggle',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1
      },
      { // this needs to be set as NaN much of the time, via other parameter trigger
        name: 'nasalAntiformantFreq',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1000
      },
      {
        name: 'nasalAntiformantFreqToggle',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1
      },
      { // this needs to be set as NaN much of the time, via other parameter trigger
        name: 'nasalAntiformantBw',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1000
      },
      {
        name: 'nasalAntiformantBwToggle',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1
      },
      {
        name: 'parallelEnabled',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1
      },
      {
        name: 'parallelVoicingDb',
        defaultValue: 0,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'parallelAspirationDb',
        defaultValue: -25,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'parallelAspirationMod',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1
      },
      {
        name: 'fricationDb',
        defaultValue: -30,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'fricationMod',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1
      },
      {
        name: 'parallelBypassDb',
        defaultValue: -99,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'nasalFormantDb',
        defaultValue: -99,
        minValue: -99,
        maxValue: 30
      },
      {
        name: 'extGain',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1
      }
    ]
  }

  constructor() {
    super();
    this.mParms = {
      sampleRate: sampleRate,
      glottalSourceType: 1
    }
    this.fParms = demoFrameParms
    this.fParms.duration = 128 / sampleRate;
    this.generator = new Generator(this.mParms);
  }

  trigFunc(item, idx) {
    return item.length > 1 ? item[idx] : item[0];
  }

  process(_, outputs, parameters) {
    const f0 = parameters['f0'];
    const f1 = parameters['f1'];
    const f2 = parameters['f2'];
    const f3 = parameters['f3'];
    const f4 = parameters['f4'];
    const f5 = parameters['f5'];
    const f6 = parameters['f6'];
    const b1 = parameters['b1'];
    const b2 = parameters['b2'];
    const b3 = parameters['b3'];
    const b4 = parameters['b4'];
    const b5 = parameters['b5'];
    const b6 = parameters['b6'];
    const db1 = parameters['db1'];
    const db2 = parameters['db2'];
    const db3 = parameters['db3'];
    const db4 = parameters['db4'];
    const db5 = parameters['db5'];
    const db6 = parameters['db6'];
    const flutterLevel = parameters['flutterLevel'];
    const openPhaseRatio = parameters['openPhaseRatio'];
    const breathinessDb = parameters['breathinessDb'];
    const tiltDb = parameters['tiltDb'];
    const gainDb = parameters['gainDb'];
    const agcRmsLevel = parameters['agcRmsLevel'];
    const cascadeEnabled = parameters['cascadeEnabled'];
    const cascadeVoicingDb = parameters['cascadeVoicingDb'];
    const cascadeAspirationDb = parameters['cascadeAspirationDb'];
    const cascadeAspirationMod = parameters['cascadeAspirationMod'];

    const nasalFormantFreq = parameters['nasalFormantFreq']; // figure out NaN
    const nasalFormantBw = parameters['nasalFormantBw']; // // figure out NaN
    const nasalAntiformantFreq = parameters['nasalAntiformantFreq']; // figure out NaN
    const nasalAntiformantBw = parameters['nasalAntiformantBw']; // figure out NaN

    const nasalFormantFreqToggle = parameters['nasalFormantFreqToggle'];
    const nasalFormantBwToggle = parameters['nasalFormantBwToggle'];
    const nasalAntiformantFreqToggle = parameters['nasalAntiformantFreqToggle'];
    const nasalAntiformantBwToggle = parameters['nasalAntiformantBwToggle'];

    const parallelEnabled = parameters['parallelEnabled'];
    const parallelVoicingDb = parameters['parallelVoicingDb'];
    const parallelAspirationDb = parameters['parallelAspirationDb'];
    const parallelAspirationMod = parameters['parallelAspirationMod'];
    const fricationDb = parameters['fricationDb'];
    const fricationMod = parameters['fricationMod'];
    const parallelBypassDb = parameters['parallelBypassDb'];
    const nasalFormantDb = parameters['nasalFormantDb'];
    const extGain = parameters['extGain'];
    
    let fParms = this.fParms;
    fParms.duration = 1 / sampleRate;
    for (let i = 0; i < outputs[0][0].length; i++) {
      fParms = JSON.parse(JSON.stringify(fParms));
      fParms.f0 = this.trigFunc(f0, i);
      fParms.oralFormantFreq = [
        this.trigFunc(f1, i), 
        this.trigFunc(f2, i), 
        this.trigFunc(f3, i), 
        this.trigFunc(f4, i), 
        this.trigFunc(f5, i), 
        this.trigFunc(f6, i)
      ];
      fParms.oralFormantBw = [
        this.trigFunc(b1, i),
        this.trigFunc(b2, i),
        this.trigFunc(b3, i),
        this.trigFunc(b4, i),
        this.trigFunc(b5, i),
        this.trigFunc(b6, i)
      ];
      fParms.oralFormantDb = [
        this.trigFunc(db1, i),
        this.trigFunc(db2, i),
        this.trigFunc(db3, i),
        this.trigFunc(db4, i),
        this.trigFunc(db5, i),
        this.trigFunc(db6, i)
      ];
      fParms.flutterLevel = this.trigFunc(flutterLevel, i);
      fParms.openPhaseRatio = this.trigFunc(openPhaseRatio, i);
      fParms.breathinessDb = this.trigFunc(breathinessDb, i);
      fParms.tiltDb = this.trigFunc(tiltDb, i);
      fParms.gainDb = this.trigFunc(gainDb, i);
      fParms.agcRmsLevel = this.trigFunc(agcRmsLevel, i);
      fParms.cascadeEnabled = this.trigFunc(cascadeEnabled, i) ? true : false;
      fParms.cascadeVoicingDb = this.trigFunc(cascadeVoicingDb, i);
      fParms.cascadeAspirationDb = this.trigFunc(cascadeAspirationDb, i);
      fParms.cascadeAspirationMod = this.trigFunc(cascadeAspirationMod, i);
      fParms.nasalFormantFreq = this.trigFunc(nasalFormantFreqToggle) ? 
                                this.trigFunc(nasalFormantFreq, i) :
                                NaN;
      fParms.nasalFormantBw = this.trigFunc(nasalFormantBwToggle) ?
                              this.trigFunc(nasalFormantBw, i) :
                              NaN;
      fParms.nasalAntiformantFreq = this.trigFunc(nasalAntiformantFreqToggle) ?
                                    this.trigFunc(nasalAntiformantFreq, i) :
                                    NaN;
      fParms.nasalAntiformantBw = this.trigFunc(nasalAntiformantBwToggle) ?
                                  this.trigFunc(nasalAntiformantBw, i) :
                                  NaN;
      fParms.parallelEnabled = this.trigFunc(parallelEnabled, i) ? true : false;
      fParms.parallelVoicingDb = this.trigFunc(parallelVoicingDb, i);
      fParms.parallelAspirationDb = this.trigFunc(parallelAspirationDb, i);
      fParms.parallelAspirationMod = this.trigFunc(parallelAspirationMod, i);
      fParms.fricationDb = this.trigFunc(fricationDb, i);
      fParms.fricationMod = this.trigFunc(fricationMod, i);
      fParms.parallelBypassDb = this.trigFunc(parallelBypassDb, i);
      fParms.nasalFormantDb = this.trigFunc(nasalFormantDb, i);


      const subArray = outputs[0][0].subarray(i, i + 1);
      this.generator.generateFrame(fParms, subArray);
      outputs[0][0][i] = this.trigFunc(extGain, i) * subArray[0];
    }

    return true;
  }
}

registerProcessor('klatt-synth', Processor);