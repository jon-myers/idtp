<template>
</template>
<script lang='ts'>
import { defineComponent, PropType } from 'vue';
import {
  InstrumentTrackType,
} from '@/ts/types.ts';
import { Instrument } from '@/ts/enums.ts';
import ksURL from '@/audioWorklets/KarplusStrong2.worklet.js?url';
import cURL from '@/audioWorklets/chikaris.worklet.js?url';
import caURL from '@/audioWorklets/captureAudio.worklet.js?url';
import klattURL from '@/audioWorklets/klattSynth2.worklet.js?url';
import { Piece } from '@/js/classes.ts';
import { v4 as uuidv4 } from 'uuid';
interface LoopSourceNode extends AudioBufferSourceNode {
  playing?: boolean;
}

interface ChikariNodeType extends AudioWorkletNode {
  freq0?: AudioParam;
  freq1?: AudioParam;
  cutoff?: AudioParam;
  parameters: Map<string, AudioParam>;
}

interface PluckNodeType extends AudioWorkletNode {
  frequency?: AudioParam;
  cutoff?: AudioParam;
  parameters: Map<string, AudioParam>;
}

interface CaptureNodeType extends AudioWorkletNode {
  bufferSize?: AudioParam;
  active?: AudioParam;
  cancel?: AudioParam;
}

interface KlattNodeType extends AudioWorkletNode {
  extGain?: AudioParam;
  f0?: AudioParam;
  f1?: AudioParam;
  f2?: AudioParam;
  f3?: AudioParam;
  f4?: AudioParam;
  f5?: AudioParam;
  f6?: AudioParam;
  b1?: AudioParam;
  b2?: AudioParam;
  b3?: AudioParam;
  b4?: AudioParam;
  b5?: AudioParam;
  b6?: AudioParam;
  db1?: AudioParam;
  db2?: AudioParam;
  db3?: AudioParam;
  db4?: AudioParam;
  db5?: AudioParam;
  db6?: AudioParam;
  flutterLevel?: AudioParam;
  openPhaseRatio?: AudioParam;
  breathinessDb?: AudioParam;
  tiltDb?: AudioParam;
  gainDb?: AudioParam;
  agcRmsLevel?: AudioParam;
  cascadeEnabled?: AudioParam;
  cascadeVoicingDb?: AudioParam;
  cascadeAspirationDb?: AudioParam;
  cascadeAspirationMod?: AudioParam;
  nasalFormantFreq?: AudioParam;
  nasalFormantFreqToggle?: AudioParam;
  nasalFormantBw?: AudioParam;
  nasalFormantBwToggle?: AudioParam;
  nasalAntiformantFreq?: AudioParam;
  nasalAntiformantFreqToggle?: AudioParam;
  nasalAntiformantBw?: AudioParam;
  nasalAntiformantBwToggle?: AudioParam;
  parallelEnabled?: AudioParam;
  parallelVoicingDb?: AudioParam;
  parallelAspirationDb?: AudioParam;
  parallelAspirationMod?: AudioParam;
  fricationDb?: AudioParam;
  fricationMod?: AudioParam;
  parallelBypassDb?: AudioParam;
  nasalFormantDb?: AudioParam;
}

interface SarangiSynthType extends AudioWorkletNode {
  freq?: AudioParam;
  bowGain?: AudioParam;
  gain?: AudioParam;
}

type ParamName = (
  'frequency' | 
  'cutoff' | 
  'dampen' | 
  'outGain' | 
  'intSitarGain' |
  'extSitarGain' |
  'intChikariGain' |
  'extChikariGain'
)


type SynthControl = {
  inst: Instrument,
  idx: number,
  params: Partial<{
    [key in ParamName]: number
  }>
}

type SitarSynthType = {
  sitarNode: PluckNodeType,
  sDCOffsetNode: BiquadFilterNode,
  lpNode: BiquadFilterNode,
  outGainNode: GainNode,
  intSitarGainNode: GainNode,
  intChikariGainNode: GainNode,
  extSitarGainNode: GainNode,
  extChikariGainNode: GainNode
}

type BurstOption = {
      when: number,
      dur: number,
      to: AudioNode,
      atk?: number,
      amp?: number
    }

export default defineComponent({
  name: 'Synths',
  props: {
    ac: {
      type: AudioContext,
      required: true
    },
    instTracks: {
      type: Array as PropType<InstrumentTrackType[]>,
      required: true
    },
    piece: {
      type: Object as PropType<Piece>,
      required: true
    },
    controls: {
      type: Array as PropType<SynthControl[]>,
      required: true
    },
    gain: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    const bursts: { [key: string]: AudioBufferSourceNode } = {};
    const now = () => props.ac.currentTime;
    const mixNode = props.ac.createGain();
    mixNode.gain.setValueAtTime(props.gain, now());
    
    

    const sendBurst = (option: BurstOption) => {
      const white = Math.random() * 2 - 1;
      const sr = props.ac.sampleRate;
      if (option.atk === undefined) option.atk = 0.05;
      if (option.amp === undefined) option.amp = 1;
      const bufSize = sr * option.dur;
      const noiseBuf = props.ac.createBuffer(1, bufSize, sr);
      const attackSize = sr * option.atk;
      const out = noiseBuf.getChannelData(0);
      const b = new Array(7).fill(0);
      for (let i = 0; i < bufSize; i++) {
        b[0] = 0.99886 * b[0] + out[i] * 0.0555179;
        b[1] = 0.99332 * b[1] + out[i] * 0.0750759;
        b[2] = 0.96900 * b[2] + out[i] * 0.1538520;
        b[3] = 0.86650 * b[3] + out[i] * 0.3104856;
        b[4] = 0.55000 * b[4] + out[i] * 0.5329522;
        b[5] = -0.7616 * b[5] - out[i] * 0.0168980;
        out[i] = b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + out[i] * 0.5362;
        out[i] *= 0.11;
        b[6] = white * 0.115926;
      }
      for (let i = 0; i < attackSize; i++) {
        out[i] *= i / attackSize;
      }
      for (let i = 0; i < bufSize; i++) {
        out[i] *= option.amp;
      }
      const bufferSourceNode = props.ac.createBufferSource();
      
      const uId = uuidv4();
      bursts[uId] = bufferSourceNode;
      bufferSourceNode.buffer = noiseBuf;
      bufferSourceNode.connect(option.to);
      bufferSourceNode.start(option.when);
      bufferSourceNode.onended = () => {
        bufferSourceNode.disconnect();
        delete bursts[uId];
      }
    };
    const cancelBursts = (when?: number) => {
      if (when === undefined) when = now();
      Object.values(bursts).forEach(burst => {
        burst.stop(when);
      });
    };

    // Synths
    const spawnSitar = async (control: SynthControl): Promise<SitarSynthType> => {
      if (control.inst !== Instrument.Sitar) {
        throw new Error('spawnSitar called with non-Sitar control');
      }
      const requiredParams: ParamName[] = [
        'dampen', 
        'intSitarGain',
        'extSitarGain',
        'intChikariGain',
        'extChikariGain',
        'outGain',
      ]
      if (!requiredParams.every(param => control.params[param] !== undefined)) {
        throw new Error('spawnSitar called with missing required params');
      }
      try {
        // load audio worklets
        await props.ac.audioWorklet.addModule(ksURL);
        await props.ac.audioWorklet.addModule(cURL);

        // initialize nodes
        const sitarNode = new AudioWorkletNode(props.ac, 'karplusStrong') as 
          PluckNodeType;
        const sDCOffsetNode = props.ac.createBiquadFilter();
        const lpNode = props.ac.createBiquadFilter();
        const intSitarGainNode = props.ac.createGain();
        const extSitarGainNode = props.ac.createGain();
        const mixChikariNode = props.ac.createGain();
        const intChikariGainNode = props.ac.createGain();
        const extChikariGainNode = props.ac.createGain();
        const outGainNode = props.ac.createGain();
        const cOpt = { numberOfInputs: 1, numberOfOutputs: 1 };
        const chikariNode = new AudioWorkletNode(props.ac, 'chikaris', cOpt) as 
          ChikariNodeType;
        const cDCOffsetNode = props.ac.createBiquadFilter();

        // map parameters
        sitarNode.frequency = sitarNode.parameters.get('Frequency');
        sitarNode.cutoff = sitarNode.parameters.get('Cutoff');
        chikariNode.freq0 = chikariNode.parameters.get('freq0');
        chikariNode.freq1 = chikariNode.parameters.get('freq1');
        chikariNode.cutoff = chikariNode.parameters.get('Cutoff');

        // set parameters
        sDCOffsetNode.type = 'highpass';
        sDCOffsetNode.frequency.value = 5
        cDCOffsetNode.type = 'highpass';
        cDCOffsetNode.frequency.value = 5;
        lpNode.type = 'lowpass';
        const fund = props.piece.raga.fundamental;
        lpNode.frequency.value = fund * 2 ** 3
        sitarNode.cutoff!.value = control.params.dampen!
        outGainNode.gain.value = control.params.outGain!;
        intSitarGainNode.gain.value = control.params.intSitarGain!;
        extSitarGainNode.gain.value = control.params.extSitarGain!;
        mixChikariNode.gain.value = 1;
        intChikariGainNode.gain.value = control.params.intChikariGain!;
        extChikariGainNode.gain.value = control.params.extChikariGain!;

        // connect nodes
        sitarNode
          .connect(sDCOffsetNode)
          .connect(lpNode)
          .connect(intSitarGainNode)
          .connect(outGainNode)
          .connect(mixNode);
        chikariNode.connect(mixChikariNode, 0);
        chikariNode.connect(mixChikariNode, 1);
        mixChikariNode
          .connect(cDCOffsetNode)
          .connect(intChikariGainNode)
          .connect(extChikariGainNode)
          .connect(outGainNode);

        return {
          sitarNode,
          sDCOffsetNode,
          lpNode,
          intSitarGainNode,
          extSitarGainNode,
          intChikariGainNode,
          extChikariGainNode,
          outGainNode
        }
      } catch (e) {
        throw new Error('Error adding Karplus-Strong module');
      }
    };

    return {
    }
  }
})
</script>
<style scoped>
</style>