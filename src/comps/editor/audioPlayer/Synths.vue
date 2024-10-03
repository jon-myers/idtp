<template>
</template>
<script lang='ts'>
import { defineComponent, PropType, onMounted } from 'vue';
import {
  InstrumentTrackType,
} from '@/ts/types.ts';
import { Instrument } from '@/ts/enums.ts';
import ksURL from '@/audioWorklets/KarplusStrong2.worklet.js?url';
import cURL from '@/audioWorklets/chikaris2.worklet.js?url';
import ssURL from '@/audioWorklets/sarangi.worklet.js?url';
import caURL from '@/audioWorklets/captureAudio.worklet.js?url';
import klattURL from '@/audioWorklets/klattSynth2.worklet.js?url';
import { 
  Piece, 
  Trajectory, 
  getStarts, 
  getEnds,
  Phrase
} from '@/js/classes.ts';
import { v4 as uuidv4 } from 'uuid';
import { 
  LoopSourceNode,
  ChikariNodeType,
  PluckNodeType,
  SarangiNodeType,
  CaptureNodeType,
  KlattNodeType,
  ParamName,
  SynthControl,
  SitarSynthControl,
  SarangiSynthControl,
  KlattSynthControl,
  SynthType,
  SitarSynthType,
  SarangiSynthType,
  KlattSynthType,
  BurstOption,
} from '@/ts/types.ts';


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
    gainVal: {
      type: Number,
      required: true
    },
    curPlayTime: {
      type: Number,
      required: true
    },
    transposition: {
      type: Number,
      required: true
    },
    uniformVowel: {
      type: Boolean,
      required: true
    }
  },
  setup(props) {
    const bursts: { [key: string]: AudioBufferSourceNode } = {};
    const now = () => props.ac.currentTime;
    const mixNode = props.ac.createGain();
    mixNode.gain.setValueAtTime(props.gainVal, now());
    mixNode.connect(props.ac.destination);
    const synths: SynthType[] = [];
    const lagTime = 0.025;
    const firstEnvelopes: Float32Array[] = [];
    const firstLPEnvelopes: Float32Array[] = [];
    const vowelParams = [ // f1, f2, f3, b1, b2, b3
      [[310, 2020, 2960, 45, 200, 400], [290, 2070, 2960, 60, 200, 400]],
      [[400, 1800, 2570, 50, 100, 140], [470, 1600, 2600, 50, 100, 140]],
      [[480, 1720, 2520, 70, 100, 200], [330, 2020, 2600, 55, 100, 200]],
      [[530, 1680, 2500, 60, 90, 200], [620, 1530, 2530, 60, 90, 200]],
      [[620, 1660, 2430, 70, 150, 320], [650, 1490, 2470, 70, 100, 320]],
      [[700, 1220, 2600, 130, 70, 160], [700, 1220, 2600, 130, 70, 160]],
      [[600, 990, 2570, 90, 100, 80], [630, 1040, 2600, 90, 100, 80]],
      [[620, 1220, 2550, 80, 50, 140], [620, 1220, 2550, 80, 50, 140]],
      [[540, 1100, 2300, 80, 70, 70], [450, 900, 2300, 80, 70, 70]],
      [[450, 1100, 2350, 80, 100, 80], [500, 1180, 2390, 80, 100, 80]],
      [[350, 1250, 2200, 65, 110, 140], [320, 900, 2200, 65, 110, 140]],
      [[470, 1270, 1540, 100, 60, 110], [420, 1310, 1540, 100, 60, 110]],
      [[660, 1200, 2550, 100, 70, 200], [400, 1880, 2500, 70, 100, 200]],
      [[640, 1230, 2550, 80, 70, 140], [420, 940, 2350, 80, 70, 80]],
      [[550, 960, 2400, 80, 50, 130], [360, 1820, 2450, 60, 50, 160]]
    ];

    // const sendBurst = (option: BurstOption) => {
    //   const white = Math.random() * 2 - 1;
    //   const sr = props.ac.sampleRate;
    //   if (option.atk === undefined) option.atk = 0.05;
    //   if (option.amp === undefined) option.amp = 1;
    //   if (option.dur === undefined) option.dur = 0.1;
    //   const bufSize = sr * option.dur;
    //   const noiseBuf = props.ac.createBuffer(1, bufSize, sr);
    //   const attackSize = sr * option.atk;
    //   const out = noiseBuf.getChannelData(0);
    //   const b = new Array(7).fill(0);
    //   for (let i = 0; i < bufSize; i++) {
    //     b[0] = 0.99886 * b[0] + white * 0.0555179;
    //     b[1] = 0.99332 * b[1] + white * 0.0750759;
    //     b[2] = 0.96900 * b[2] + white * 0.1538520;
    //     b[3] = 0.86650 * b[3] + white * 0.3104856;
    //     b[4] = 0.55000 * b[4] + white * 0.5329522;
    //     b[5] = -0.7616 * b[5] - white * 0.0168980;
    //     out[i] = b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + white * 0.5362;
    //     out[i] *= 0.11;
    //     b[6] = white * 0.115926;
    //   }
    //   for (let i = 0; i < attackSize; i++) {
    //     out[i] *= i / attackSize;
    //   }
    //   console.log(option.amp)
    //   for (let i = 0; i < bufSize; i++) {
    //     out[i] *= option.amp;
    //   }
    //   console.log(Math.max(...out))
    //   const bufferSourceNode = props.ac.createBufferSource();
      
    //   const uId = uuidv4();
    //   bursts[uId] = bufferSourceNode;        
    //   bufferSourceNode.buffer = noiseBuf;
    //   bufferSourceNode.connect(option.to);
    //   bufferSourceNode.start(option.when);
    //   bufferSourceNode.onended = () => {
    //     bufferSourceNode.disconnect();
    //     delete bursts[uId];
    //   }
    // };
    const sendBurst = (option: BurstOption) => {
      const sr = props.ac.sampleRate;
      const whiteNoise = () => Math.random() * 2 - 1;

      // Set default values if undefined
      option.atk = option.atk ?? 0.05;
      option.amp = option.amp ?? 1;
      option.dur = option.dur ?? 0.01;

      // Double the amplitude
      option.amp *= 2;

      // Calculate buffer sizes
      const bufSize = sr * option.dur;
      const attackSize = sr * option.atk;

      // Create noise buffer
      const noiseBuf = props.ac.createBuffer(1, bufSize, sr);
      const out = noiseBuf.getChannelData(0);

      // Initialize filter coefficients
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      // Generate noise with filtering
      for (let i = 0; i < bufSize; i++) {
        const white = whiteNoise();
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      // Apply attack envelope
      for (let i = 0; i < attackSize; i++) {
        out[i] *= i / attackSize;
      }

      // Apply amplitude
      for (let i = 0; i < bufSize; i++) {
        out[i] *= option.amp;
      }

      // Create buffer source node
      const bufferSourceNode = props.ac.createBufferSource();
      const uId = uuidv4();
      bursts[uId] = bufferSourceNode;

      bufferSourceNode.buffer = noiseBuf;
      bufferSourceNode.connect(option.to);
      bufferSourceNode.start(option.when);
      bufferSourceNode.onended = () => {
        bufferSourceNode.disconnect();
        delete bursts[uId];
      };
    };
    const cancelBursts = (when?: number) => {
      if (when === undefined) when = now();
      Object.values(bursts).forEach(burst => {
        burst.stop(when);
      });
    };

    // Synths
    const spawnSitar = async (control: SitarSynthControl): Promise<SitarSynthType> => {
      if (control.inst !== Instrument.Sitar) {
        throw new Error('spawnSitar called with non-Sitar control');
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
        const cOpt = { numberOfInputs: 1, numberOfOutputs: 2 };
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
        intSitarGainNode.gain.value = 0;
        extSitarGainNode.gain.value = control.params.extSitarGain!;
        mixChikariNode.gain.value = 1;
        intChikariGainNode.gain.value = 0;
        extChikariGainNode.gain.value = control.params.extChikariGain!;
        chikariNode.cutoff!.value = 0.7;

        // connect nodes
        sitarNode
          .connect(sDCOffsetNode)
          .connect(lpNode)
          .connect(intSitarGainNode)
          .connect(extSitarGainNode)
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
          chikariNode,
          sDCOffsetNode,
          lpNode,
          intSitarGainNode,
          intChikariGainNode,
          extChikariGainNode,
          outGainNode,
          extSitarGainNode,
          idx: control.idx
        }
      } catch (e) {
        throw new Error('Error adding Karplus-Strong module');
      }
    };

    const spawnSarangi = async (
      control: SarangiSynthControl
    ): Promise<SarangiSynthType> => {
      if (control.inst !== Instrument.Sarangi) {
        throw new Error('spawnSarangi called with non-Sarangi control');
      }
      try {
        // load audio worklet
        await props.ac.audioWorklet.addModule(ssURL);

        // initialize nodes
        const sarangiNode = new AudioWorkletNode(props.ac, 'sarangi') as 
          SarangiNodeType;
        sarangiNode.freq = sarangiNode.parameters.get('Frequency');
        sarangiNode.bowGain = sarangiNode.parameters.get('BowGain');
        sarangiNode.gain = sarangiNode.parameters.get('Gain');
        const intGain = props.ac.createGain();
        const extGain = props.ac.createGain();

        // set parameters
        sarangiNode.bowGain!.value = 0;
        sarangiNode.gain!.value = 1;
        intGain.gain.value = 0;
        extGain.gain.value = control.params.extSarangiGain!;

        // connect nodes
        sarangiNode
          .connect(intGain)
          .connect(extGain)
          .connect(mixNode);

        return {
          sarangiNode,
          intGain,
          extGain,
          idx: control.idx
        }
      } catch (e) {
        throw new Error('Error adding Sarangi module');
      }
    };

    const spawnKlatt = async (
      control: KlattSynthControl
    ): Promise<KlattSynthType> => {
      try {
        // load module
        await props.ac.audioWorklet.addModule(klattURL);

        // initialize nodes
        const kn = new AudioWorkletNode(props.ac, 'klatt-synth') as 
          KlattNodeType;
        const intGain = props.ac.createGain();
        const extGain = props.ac.createGain();
        
          // map parameters
        const params = kn.parameters;
        kn.f0 = params.get('f0');
        kn.f1 = params.get('f1');
        kn.f2 = params.get('f2');
        kn.f3 = params.get('f3');
        kn.f4 = params.get('f4');
        kn.f5 = params.get('f5');
        kn.f6 = params.get('f6');
        kn.b1 = params.get('b1');
        kn.b2 = params.get('b2');
        kn.b3 = params.get('b3');
        kn.b4 = params.get('b4');
        kn.b5 = params.get('b5');
        kn.b6 = params.get('b6');
        kn.db1 = params.get('db1');
        kn.db2 = params.get('db2');
        kn.db3 = params.get('db3');
        kn.db4 = params.get('db4');
        kn.db5 = params.get('db5');
        kn.db6 = params.get('db6');
        kn.flutterLevel = params.get('flutterLevel');
        kn.openPhaseRatio = params.get('openPhaseRatio');
        kn.breathinessDb = params.get('breathinessDb');
        kn.tiltDb = params.get('tiltDb');
        kn.gainDb = params.get('gainDb');
        kn.agcRmsLevel = params.get('agcRmsLevel');
        kn.cascadeEnabled = params.get('cascadeEnabled');
        kn.cascadeVoicingDb = params.get('cascadeVoicingDb');
        kn.cascadeAspirationDb = params.get('cascadeAspirationDb');
        kn.cascadeAspirationMod = params.get('cascadeAspirationMod');
        kn.nasalFormantFreq = params.get('nasalFormantFreq');
        kn.nasalFormantFreqToggle = params.get('nasalFormantFreqToggle');
        kn.nasalFormantBw = params.get('nasalFormantBw');
        kn.nasalFormantBwToggle = params.get('nasalFormantBwToggle');
        kn.nasalAntiformantFreq = params.get('nasalAntiformantFreq');
        kn.nasalAntiformantFreqToggle = params.get('nasalAntiformantFreqToggle')
        kn.nasalAntiformantBw = params.get('nasalAntiformantBw');
        kn.nasalAntiformantBwToggle = params.get('nasalAntiformantBwToggle');
        kn.parallelEnabled = params.get('parallelEnabled');
        kn.parallelVoicingDb = params.get('parallelVoicingDb');
        kn.parallelAspirationDb = params.get('parallelAspirationDb');
        kn.parallelAspirationMod = params.get('parallelAspirationMod');
        kn.fricationDb = params.get('fricationDb');
        kn.fricationMod = params.get('fricationMod');
        kn.parallelBypassDb = params.get('parallelBypassDb');
        kn.nasalFormantDb = params.get('nasalFormantDb');
        kn.extGain = params.get('extGain');

        // set parameters
        kn.extGain!.value = 0.125;
        intGain.gain.value = 0;
        extGain.gain.value = control.params.extGain!;

        // connect nodes
        kn
          .connect(intGain)
          .connect(extGain)
          .connect(mixNode);

        return {
          node: kn,
          intGain,
          extGain,
          idx: control.idx
        }
      } catch (e) {
        throw new Error('Error adding Klatt module');
      }
    };

    const playSitarArticulations = (
        traj: Trajectory, 
        startTime: number, 
        to: PluckNodeType
      ) => {
      const arts = traj.articulations;
      if (traj.id !== 12) {
        const keys = Object.keys(arts);
        const plucks = keys.filter(k => arts[k].name === 'pluck');
        const hammerOffs = keys.filter(k => arts[k].name === 'hammer-off');
        const hammerOns = keys.filter(k => arts[k].name === 'hammer-on');
        const slides = keys.filter(k => arts[k].name === 'slide');
        const dampens = keys.filter(k => arts[k].name === 'dampen');
        plucks.forEach(time => {
          console.log('plucking')
          const when = startTime + Number(time) * traj.durTot;
          sendBurst({ when, to, amp: 0.5 })
        });
        hammerOffs.forEach(time => {
          console.log('hammer off')
          const when = startTime + Number(time) * traj.durTot;
          sendBurst({ when, to, amp: 0.5 })
        });
        hammerOns.forEach(time => {
          console.log('hammer on')
          const when = startTime + Number(time) * traj.durTot;
          sendBurst({ when, to, amp: 0.3 })
        });
        slides.forEach(time => {
          console.log('sliding')
          const when = startTime + Number(time) * traj.durTot;
          sendBurst({ when, to, amp: 0.1 })
        });
        dampens.forEach(time => {
          const when = startTime + Number(time) * traj.durTot;
          const curVal = to.cutoff!.value;
          const durs = [lagTime, 0.025, 0.005];
          const times = Array(durs.length + 1).fill(0).map((_, i) => {
            return when + durs.slice(0, i).reduce((a, b) => a + b, 0)
          });
          to.cutoff!.setValueAtTime(curVal, times[0]);
          to.cutoff!.linearRampToValueAtTime(0, times[1]);
          to.cutoff!.setValueAtTime(0, times[2]);
          to.cutoff!.linearRampToValueAtTime(curVal, times[3]);
        })
      }
    }

    const playSitarFreqContour = (
        traj: Trajectory, 
        startTime: number,
        synth: SitarSynthType,
        first: boolean,
      ) => {
      const node = synth.sitarNode;
      const lpNode = synth.lpNode;
      const track = synth.idx;
      const valueDur = 0.02;
      const endTime = startTime + traj.durTot;
      const valueCt = Math.round((endTime - startTime) / valueDur);
      const freq = node.frequency !;
      const lpFreq = lpNode.frequency!;
      const verySmall = 0.000000000001;
      if (first) {
        const offset = startTime < now() ? now() - startTime : 0;
        const start = startTime + offset;
        const duration = endTime - start - verySmall;
        if (duration < 0) {
          throw new Error('Negative duration');
        }
        freq.setValueCurveAtTime(firstEnvelopes[track], start, duration);
        lpFreq.setValueCurveAtTime(firstLPEnvelopes[track], start, duration);
      } else {
        const env = new Float32Array(valueCt);
        const lpEnv = new Float32Array(valueCt);
        const transp = 2 ** (props.transposition / 1200);
        for (let i = 0; i < valueCt; i++) {
          env[i] = transp * traj.compute(i / (valueCt - 1));
          lpEnv[i] = transp * traj.compute(i / (valueCt - 1)) * 2 ** 3;
        }
        const duration = endTime - startTime - verySmall;
        if (duration < 0) {
          throw new Error('Negative duration');
        }
        freq.setValueCurveAtTime(env, startTime, duration);
        lpFreq.setValueCurveAtTime(lpEnv, startTime, duration);
      }
    }

    const cancelSitarTrajs = (synth: SitarSynthType) => {
      synth.intChikariGainNode.gain.cancelScheduledValues(now());
      synth.intSitarGainNode.gain.cancelScheduledValues(now());
      synth.extChikariGainNode.gain.cancelScheduledValues(now());
      synth.extSitarGainNode.gain.cancelScheduledValues(now());
      synth.intSitarGainNode.gain.setValueAtTime(1, now());
      synth.intSitarGainNode.gain.linearRampToValueAtTime(0, now() + lagTime);
      synth.intChikariGainNode.gain.setValueAtTime(1, now());
      synth.intChikariGainNode.gain.linearRampToValueAtTime(0, now() + lagTime);
      cancelBursts();
      const freq = synth.sitarNode.frequency!;
      const lpFreq = synth.lpNode.frequency!;
      freq.cancelScheduledValues(now());
      lpFreq.cancelScheduledValues(now());
    };
    const cancelSarangiTrajs = (synth:SarangiSynthType) => {
      const when = now();
      synth.sarangiNode.freq!.cancelScheduledValues(when);
      synth.sarangiNode.bowGain!.cancelScheduledValues(when);
      synth.sarangiNode.gain!.cancelScheduledValues(when);
      const curBowGain = synth.sarangiNode.bowGain!.value;
      synth.sarangiNode.bowGain!.setValueAtTime(curBowGain, when);
      synth.sarangiNode.bowGain!.linearRampToValueAtTime(0, when + lagTime);
      const curGain = synth.sarangiNode.gain!.value;
      synth.sarangiNode.gain!.setValueAtTime(curGain, when);
      synth.sarangiNode.gain!.linearRampToValueAtTime(0, when + lagTime);
    }

    const playSitarTrajs = (synth: SitarSynthType) => {
      // gains
      synth.intSitarGainNode.gain.setValueAtTime(0, now());
      synth.intSitarGainNode.gain.linearRampToValueAtTime(1, now() + lagTime);
      synth.intChikariGainNode.gain.setValueAtTime(0, now());
      synth.intChikariGainNode.gain.linearRampToValueAtTime(1, now() + lagTime);
      // synth.outGainNode.gain.setValueAtTime(0, now());
      // synth.outGainNode.gain.linearRampToValueAtTime(1, now() + lagTime);
      // trajs
      const trajs = props.piece.allTrajectories(synth.idx);
      const starts = getStarts(trajs.map(t => t.durTot));
      const ends = getEnds(trajs.map(t => t.durTot));
      const startIdx = starts.findIndex(s => s >= props.curPlayTime);
      const remainingTrajs = trajs.slice(startIdx);
      remainingTrajs.forEach((traj, tIdx) => {
        const i = tIdx + startIdx;
        if (traj.id !== 12) {
          const startTime = now() + starts[i] - props.curPlayTime;
          playSitarArticulations(traj, startTime, synth.sitarNode);
          playSitarFreqContour(traj, startTime, synth, i === 0);
        }
      });

      // const 

      // chikaris
      props.piece.phraseGrid[synth.idx].forEach((phrase: Phrase, pIdx: number) => {
        Object.keys(phrase.chikaris).forEach((key) => {
          const time = now() + phrase.startTime! + Number(key) - props.curPlayTime;
          if (time >= now()) {
            sendBurst({ 
              when: time, 
              to: synth.chikariNode, 
              atk: 0.025, 
              amp: 0.2 
            });
          }
        })
      })
    };

    const playSarangiTraj = (
      traj: Trajectory,
      startTime: number,
      synth: SarangiSynthType,
      fromSil = false,
      toSil = false
    ) => {
      const valueDur = 0.02;
      const durTot = traj.durTot;
      const valueCt = Math.round(durTot / valueDur);
      const freq = synth.sarangiNode.freq!;
      const bowGain = synth.sarangiNode.bowGain!;
      const verySmall = 0.000000000001;
      const env = new Float32Array(valueCt);
      const gainEnv = traj.automation!.generateValueCurve(valueDur, durTot);
      const transp = 2 ** (props.transposition / 1200);
      for (let i = 0; i < valueCt; i++) {
        env[i] = transp * traj.compute(i / (valueCt - 1));
      }
      const duration = durTot - verySmall;
      freq.setValueCurveAtTime(env, startTime, duration);
      synth.sarangiNode.gain!.setValueCurveAtTime(gainEnv, startTime, duration);
      if (fromSil) {
        bowGain.setValueAtTime(0, startTime);
        bowGain.linearRampToValueAtTime(0.5, startTime + 0.01);
      }
      if (toSil) {
        bowGain.setValueAtTime(0.5, startTime + durTot - 0.01);
        bowGain.linearRampToValueAtTime(0, startTime + durTot);
      }
    };

    const playSarangiTrajs = (synth: SarangiSynthType) => {
      synth.intGain.gain.setValueAtTime(0, now());
      synth.intGain.gain.linearRampToValueAtTime(1, now() + lagTime);
      const trajs = props.piece.allTrajectories(synth.idx);
      const starts = getStarts(trajs.map(t => t.durTot));
      const ends = getEnds(trajs.map(t => t.durTot));
      const startIdx = starts.findIndex(s => s >= props.curPlayTime);
      const remainingTrajs = trajs.slice(startIdx);
      remainingTrajs.forEach((traj, tIdx) => {
        const i = tIdx + startIdx;
        if (traj.id !== 12) {
          const st = now() + starts[i] - props.curPlayTime;
          const lastTraj = remainingTrajs[tIdx - 1];
          const fromSil = tIdx === 0 || !lastTraj || lastTraj.id === 12;
          const last = tIdx === remainingTrajs.length - 1;
          const toSil = last || remainingTrajs[tIdx + 1].id === 12;
          playSarangiTraj(traj, st, synth, fromSil, toSil);
        }
      })
    };

    const playKlattTraj = (
      traj: Trajectory, 
      startTime: number,
      synth: KlattSynthType,
      fromSil = false,
      toSil = false,
    ) => {
      const valueDur = 0.02;
      const endTime = startTime + traj.durTot;
      const valueCt = Math.round(traj.durTot / valueDur);
      const freq = synth.node.f0!;
      const verySmall = 0.000000000001;
      const shwahTime = 0.3;
      const env = new Float32Array(valueCt);
      const transp = 2 ** (props.transposition / 1200);
      const max = 0.125;
      const gainEnv = traj.automation!.generateValueCurve(valueDur, traj.durTot, max);
      for (let i = 0; i < valueCt; i++) {
        env[i] = transp * traj.compute(i / (valueCt - 1));
      }
      const duration = endTime - startTime - verySmall;
      if (duration < 0) {
        throw new Error('Negative duration');
      }
      freq.setValueCurveAtTime(env, startTime, duration);
      synth.node.extGain!.setValueCurveAtTime(gainEnv, startTime, duration);
      const vowels = ['a', 'ā', 'i', 'ī', 'u', 'ū', 'ē', 'ai','ō', 'au', '_'];
      const vpIdxs = [7, 6, 1, 0, 9, 10, 2, 3, 8, 5, 7];
      let vIdx = traj.vowel ? vowels.indexOf(traj.vowel) : 0;
      if (props.uniformVowel) {
        vIdx = 0
      }
      type Param = 'f1' | 'f2' | 'f3' | 'b1' | 'b2' | 'b3';
      const params: Param[] = ['f1', 'f2', 'f3', 'b1', 'b2', 'b3'];
      params.forEach((param, pIdx) => {
        const idx = vpIdxs[vIdx];
        const s0 = vowelParams[idx][0][pIdx];
        const s1 = idx === 1 || idx === 3 ? s0 : vowelParams[idx][1][pIdx];
        const audioParam = synth.node[param] as AudioParam;
        audioParam.setValueAtTime(s0, startTime);
        audioParam.linearRampToValueAtTime(s1, startTime + shwahTime);
      })
      if (fromSil) {
        synth.intGain.gain.setValueAtTime(0, startTime);
        synth.intGain.gain.linearRampToValueAtTime(1, startTime + 0.01);
      }
      if (toSil) {
        synth.intGain.gain.setValueAtTime(1, endTime - 0.01);
        synth.intGain.gain.linearRampToValueAtTime(0, endTime);
      }
      synth.node.flutterLevel!.setValueAtTime(0.15, startTime);
    };
    const playKlattTrajs = (synth: KlattSynthType) => {
      // synth.intGain.gain.setValueAtTime(0, now());
      // synth.intGain.gain.linearRampToValueAtTime(1, now() + lagTime);
      // synth.extGain.gain.setValueAtTime(0, now());
      // synth.extGain.gain.linearRampToValueAtTime(1, now() + lagTime);
      const trajs = props.piece.allTrajectories(synth.idx);
      const starts = getStarts(trajs.map(t => t.durTot));
      const startIdx = starts.findIndex(s => s >= props.curPlayTime);
      const remainingTrajs = trajs.slice(startIdx);
      remainingTrajs.forEach((traj, tIdx) => {
        const i = tIdx + startIdx;
        if (traj.id !== 12) {
          const st = now() + starts[i] - props.curPlayTime;
          const lastTraj = remainingTrajs[tIdx - 1];
          const fromSil = tIdx === 0 || !lastTraj || lastTraj.id === 12;
          const last = tIdx === remainingTrajs.length - 1;
          const toSil = last || remainingTrajs[tIdx + 1].id === 12;
          playKlattTraj(traj, st, synth, fromSil, toSil);
        }
      })
    };

    const preSetFirstEnvelopes = () => {
      const valueCt = 256;
      props.instTracks.forEach((track, idx) => {
        const traj = props.piece.allTrajectories(idx)[0];
        const env = new Float32Array(valueCt);
        const lpEnv = new Float32Array(valueCt);
        const transp = 2 ** (props.transposition / 1200);
        for (let i = 0; i < valueCt; i++) {
          env[i] = transp * traj.compute(i / (valueCt - 1));
          lpEnv[i] = transp * traj.compute(i / (valueCt - 1)) * 2 ** 3;
        }
        firstEnvelopes.push(env);
        firstLPEnvelopes.push(lpEnv);
      })
    };

    const playAllTrajs = () => {
      props.instTracks.forEach((track, idx) => {
        if (track.inst === Instrument.Sitar) {
          playSitarTrajs(synths[idx] as SitarSynthType);
        } else if (track.inst === Instrument.Sarangi) {
          playSarangiTrajs(synths[idx] as SarangiSynthType);
        } else if ([Instrument.Vocal_M, Instrument.Vocal_F].includes(track.inst)) {
          playKlattTrajs(synths[idx] as KlattSynthType);
        }
      })
    }

    const cancelAllTrajs = () => {
      props.instTracks.forEach((track, idx) => {
        if (track.inst === Instrument.Sitar) {
          cancelSitarTrajs(synths[idx] as SitarSynthType);
        } else if (track.inst === Instrument.Sarangi) {
          cancelSarangiTrajs(synths[idx] as SarangiSynthType);
        } else if ([Instrument.Vocal_M, Instrument.Vocal_F].includes(track.inst)) {
          cancelKlattTrajs(synths[idx] as KlattSynthType);
        }
      })
    }

    onMounted(async () => {
      const synthPromises = props.instTracks.map(async (track, idx) => {
        const vox = [Instrument.Vocal_M, Instrument.Vocal_F];
        if (track.inst === Instrument.Sitar) {
          const sitar = await spawnSitar(props.controls[idx] as SitarSynthControl);
          return sitar;
        } else if (track.inst === Instrument.Sarangi) {
          const sarangi = await spawnSarangi(props.controls[idx] as SarangiSynthControl);
          return sarangi;
        } else if (vox.includes(track.inst)) {
          const klatt = await spawnKlatt(props.controls[idx] as KlattSynthControl);
          return klatt;
        }
        return null;
      });
      const resolvedSynths = await Promise.all(synthPromises);
      resolvedSynths.forEach(synth => {
        if (synth !== null) {
          synths.push(synth)
        } else {
          throw new Error('Synth not resolved')
        }
      });
      preSetFirstEnvelopes();
        
    });
    return {
      mixNode,
      synths,
      sendBurst,
      cancelBursts,
      playAllTrajs,
      firstEnvelopes,
      cancelAllTrajs
    }
  }
})
</script>
<style scoped>
</style>