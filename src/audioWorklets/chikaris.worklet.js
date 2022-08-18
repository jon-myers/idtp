const AMP = 1.0;
// let t = 100000;

class Processor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            {
                name: 'freq0',
                defaultValue: 110,
                minValue: 50,
                maxValue: 1000,
            },
            {
                name: 'freq1',
                defaultValue: 110,
                minValue: 50,
                maxValue: 1000,
            },
            {
                name: 'freq2',
                defaultValue: 110,
                minValue: 50,
                maxValue: 1000,
            },
            {
                name: 'freq3',
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
        let freq0 = params['freq0'][0];
        let freq1 = params['freq1'][0];
        let freq2 = params['freq2'][0];
        let freq3 = params['freq3'][0];
        const cutoff = params['Cutoff'][0];

        setDelayTime(1/freq0, 1/freq1, 1/freq2, 1/freq3);

        const out = outputs[0][0];
        const input = inputs[0][0];
        // console.log(inputs.length)
        
        // console.log(inputs[0])
        // console.log(in_)
        for (let i = 0; i < out.length; ++i) {
            // let x = t < period ? 2 * Math.random() - 1 : 0;
            // setDelayTime(1/params['Frequency'][i])
            let x0 = input ? input[i] : 0;
            // let x1 = input ? input[i] : 0;
            // let x2 = input ? input[i] : 0;
            // let x3 = input ? input[i] : 0;
            
            initDelayInput(input ? input[i] : 0)
            let x1 = initDelayOutput(1);
            let x2 = initDelayOutput(2);
            let x3 = initDelayOutput(3);
            
            x0 += filter(delayOutput(0), cutoff, 0);
            x1 += filter(delayOutput(1), cutoff, 1);
            x2 += filter(delayOutput(2), cutoff, 2);
            x3 += filter(delayOutput(3), cutoff, 3);
            delayInput(x0, x1, x2, x3);
            outputs[0][0][i] = AMP * x0;
            outputs[1][0][i] = AMP * x1;
            outputs[2][0][i] = AMP * x2;
            outputs[3][0][i] = AMP * x3;
            // eslint-disable-next-line no-undef
            // t += 1 / sampleRate;
        }
        return true;
    }
}

registerProcessor('chikaris', Processor);

const delay0 = new Float32Array(2048);
const delay1 = new Float32Array(2048);
const delay2 = new Float32Array(2048);
const delay3 = new Float32Array(2048);
let readPtr0 = 0, readPtr1 = 0, readPtr2 = 0, readPtr3 = 0;
let writePtr0 = 0, writePtr1 = 0, writePtr2 = 0, writePtr3 = 0;

const initDelay1 = new Float32Array(2048);
const initDelay2 = new Float32Array(2048);
const initDelay3 = new Float32Array(2048);
const del = 2 ** -8;
const initDelDur1 = del; // must be less than 0.0464
const initDelDur2 = 2 * del // must be less than 0.0464
const initDelDur3 = 3 * del; // must be less than 0.0464
// eslint-disable-next-line no-undef
let initWritePtr1 = (initDelDur1 * sampleRate) & 2047;
// eslint-disable-next-line no-undef
let initWritePtr2 = (initDelDur2 * sampleRate) & 2047;
// eslint-disable-next-line no-undef
let initWritePtr3 = (initDelDur3 * sampleRate) & 2047;
let initReadPtr1 = 0, initReadPtr2 = 0, initReadPtr3 = 0;


function setDelayTime(time0, time1, time2, time3) {
    // eslint-disable-next-line no-undef
    writePtr0 = (readPtr0 + time0 * sampleRate) & 2047;
    // eslint-disable-next-line no-undef
    writePtr1 = (readPtr1 + time1 * sampleRate) & 2047;
    // eslint-disable-next-line no-undef
    writePtr2 = (readPtr2 + time2 * sampleRate) & 2047;
    // eslint-disable-next-line no-undef
    writePtr3 = (readPtr3 + time3 * sampleRate) & 2047;
}

function delayInput(x0, x1, x2, x3) {
    delay0[writePtr0] = x0;
    delay1[writePtr1] = x1;
    delay2[writePtr2] = x2;
    delay3[writePtr3] = x3;
    readPtr0 = (readPtr0 + 1) & 2047;
    writePtr0 = (writePtr0 + 1) & 2047;
    readPtr1 = (readPtr1 + 1) & 2047;
    writePtr1 = (writePtr1 + 1) & 2047;
    readPtr2 = (readPtr2 + 1) & 2047;
    writePtr2 = (writePtr2 + 1) & 2047;
    readPtr3 = (readPtr3 + 1) & 2047;
    writePtr3 = (writePtr3 + 1) & 2047;
}

function initDelayInput(x) {
  initDelay1[initWritePtr1] = x;
  initReadPtr1 = (initReadPtr1 + 1) & 2047;
  initWritePtr1 = (initWritePtr1 + 1) & 2047;
  
  initDelay2[initWritePtr2] = x;
  initReadPtr2 = (initReadPtr2 + 1) & 2047;
  initWritePtr2 = (initWritePtr2 + 1) & 2047;
  
  initDelay3[initWritePtr3] = x;
  initReadPtr3 = (initReadPtr3 + 1) & 2047;
  initWritePtr3 = (initWritePtr3 + 1) & 2047;
}

function delayOutput(i) {
    return [delay0[readPtr0], delay1[readPtr1], delay2[readPtr2], delay3[readPtr3]][i];
}

function initDelayOutput(i) {
  return [initDelay1[initReadPtr1], initDelay2[initReadPtr2], initDelay3[initReadPtr3]][i-1]
}

let y1 = [0, 0, 0, 0];

function filter(x, cutoff, i) {
    const y = cutoff * x + (1 - cutoff) * y1[i];
    y1[i] = y;
    return y;
}
