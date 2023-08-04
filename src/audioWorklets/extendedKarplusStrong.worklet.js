class Processor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'Frequency',
        defaultValue: 110,
        minValue: 50,
        maxValue: 2000
      },
      {
        name: 'Pick Direction',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1
      },
      {
        name: 'Pick Position',
        defaultValue: 0.25,
        minValue: 0,
        maxValue: 1

      },
      {
        name: 'Damping Brightness',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1
      },
      {
        name: 'Lowpass Level',
        defaultValue: 0.1,
        minValue: 0,
        maxValue: 2
      }
    ]
  }

  constructor() {
    super();
  }

  process(inputs, outputs, params) {
    let freq = params['Frequency'][0];
    let pickDir = params['Pick Direction'][0];
    let pickPos = params['Pick Position'][0];
    let b = params['Damping Brightness'][0];
    let L = params['Lowpass Level'][0];
    const period = 1 / freq;
  }
}