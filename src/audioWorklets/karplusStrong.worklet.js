const AMP = 1.0;
// let t = 100000;

class Processor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            {
                name: 'Frequency',
                defaultValue: 110,
                minValue: 50,
                maxValue: 1000,
            },
            {
                name: 'Cutoff',
                defaultValue: 0.5,
                minValue: 0,
                maxValue: 1,
            },
        ];
    }

    // constructor() {
    //     // super();
    // }

    process(inputs, outputs, params) {
        let freq = params['Frequency'][0];
        const cutoff = params['Cutoff'][0];

        const period = 1 / freq;
        setDelayTime(period);

        const out = outputs[0][0];
        const input = inputs[0][0];
        
        // console.log(inputs[0])
        // console.log(in_)
        for (let i = 0; i < out.length; ++i) {
            // let x = t < period ? 2 * Math.random() - 1 : 0;
            // setDelayTime(1/params['Frequency'][i])
            let x = input ? input[i] : 0;
            x += filter(delayOutput(), cutoff);
            // if (freq !== params['Frequency'][i]) {
            //     freq = params['Frequency'][i];
            //   setDelayTime(1/freq)
            // }
            delayInput(x);
            out[i] = AMP * x;
            // eslint-disable-next-line no-undef
            // t += 1 / sampleRate;
        }
        return true;
    }
}

registerProcessor('main', Processor);

const delay = new Float32Array(2048);
let readPtr = 0;
let writePtr = 0;

function setDelayTime(time) {
    // eslint-disable-next-line no-undef
    writePtr = (readPtr + time * sampleRate) & 2047;
}

function delayInput(x) {
    delay[writePtr] = x;
    readPtr = (readPtr + 1) & 2047;
    writePtr = (writePtr + 1) & 2047;
}

function delayOutput() {
    return delay[readPtr];
}

let y1 = 0;

function filter(x, cutoff) {
    const y = cutoff * x + (1 - cutoff) * y1;
    y1 = y;
    return y;
}
