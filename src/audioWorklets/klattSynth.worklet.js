class Processor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      // starting from the parameter list in tdklatt python object. 
      // "FS" is really "sampleRate" and is not a parameter, because web audio
      // worklets have a fixed sample rate.
      // "N_Form" is the number of formants, which is not a parameter, because
      // it is fixed at 5.
      // "DUR" is the duration of the sound, which is not a parameter, because
      // in this implementation, the sound is generated in real time.
      {
        name: 'F0',
        defaultValue: 100,
        minValue: 1,
        maxValue: 500
      },
      {
        name: 'F1',
        defaultValue: 450,
        minValue: 150,
        maxValue: 900
      },
      {
        name: 'F2',
        defaultValue: 1450,
        minValue: 500,
        maxValue: 2500
      },
      {
        name: 'F3',
        defaultValue: 2450,
        minValue: 1300,
        maxValue: 3500
      },
      {
        name: 'F4',
        defaultValue: 3300,
        minValue: 2500,
        maxValue: 4500
      },
      {
        name: 'F5',
        defaultValue: 3750,
        minValue: 3500,
        maxValue: 4900
      },
      {
        name: 'F6',
        defaultValue: 4900,
        minValue: 4000,
        maxValue: 4999
      },
      {
        name: 'B1',
        defaultValue: 50,
        minValue: 40,
        maxValue: 500
      },
      {
        name: 'B2',
        defaultValue: 70,
        minValue: 40,
        maxValue: 500
      },
      {
        name: 'B3',
        defaultValue: 110,
        minValue: 40,
        maxValue: 500
      },
      {
        name: 'B4',
        defaultValue: 250,
        minValue: 100,
        maxValue: 500
      },
      {
        name: 'B5',
        defaultValue: 200,
        minValue: 150,
        maxValue: 700
      },
      {
        name: 'B6',
        defaultValue: 1000,
        minValue: 200,
        maxValue: 2000
      },

    ]
  }
}