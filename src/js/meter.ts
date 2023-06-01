import { v4 as uuidv4 } from 'uuid';


type AffiliationType = { 
    pulseStructureId: string, 
    idx: number, 
    layer?: number 
  };
  
  class Pulse {
    realTime: number;
    uniqueId: string;
    affiliations: AffiliationType[];
  
    constructor({
      realTime = 0.0,
      uniqueId = uuidv4(),
      affiliation = undefined 
    }: {
      realTime?: number,
      uniqueId?: string,
      affiliation?: AffiliationType
    } = {}) {
      this.realTime = realTime;
      this.uniqueId = uniqueId;
      this.affiliations = affiliation ? [affiliation] : [];
    }
  
    addAffiliation(pulseStructure: PulseStructure, idx: number, layer?: number) {
      // check if pulse real time is the same as the affiliation's pulse real time
      if (this.realTime === pulseStructure.pulses[idx].realTime) {
        const affiliation = { 
          pulseStructureId: pulseStructure.uniqueId, 
          idx, 
          layer 
        };
        if (this.affiliations.some(a => a.pulseStructureId !== affiliation.pulseStructureId)) {
          this.affiliations.push(affiliation)
        } else {
          throw new Error('Pulse already affiliated with this pulse structure')
        }
      } else {
        throw new Error('Pulse real time does not match affiliation real time')
      }
    }
  }
  
  class PulseStructure {
    pulses: Pulse[];
    tempo: number; // bpm
    pulseDur: number; // seconds
    size: number;
    linearOffsets: number[];
    proportionalOffsets: number[];
    startTime: number;
    uniqueId: string;
    frontWeighted: boolean;
    layer?: number;
  
    constructor({
      tempo = 60,
      size = 4,
      offsetType = 'proportional', 
      offsets = undefined,
      startTime = 0.0,
      uniqueId = uuidv4(),
      frontWeighted = true,
      initPulse = undefined,
      layer = undefined
    }: {
      tempo?: number,
      size?: number,
      offsetType?: 'linear' | 'proportional',
      offsets?: number[],
      startTime?: number,
      uniqueId?: string,
      frontWeighted?: boolean,
      initPulse?: Pulse,
      layer?: number
    } = {}) {
      this.frontWeighted = frontWeighted;
      this.uniqueId = uniqueId;
      this.tempo = tempo;
      this.pulseDur = 60 / tempo;
      this.size = size;
      this.startTime = startTime;
      this.layer = layer;
      if (offsets === undefined) {
        this.pulses = [...Array(size).keys()].map(i => new Pulse({ 
          realTime: this.startTime + i * this.pulseDur,
          affiliation: { 
            pulseStructureId: 
            this.uniqueId, 
            idx: i, 
            layer: this.layer 
          } 
        }));
        this.proportionalOffsets = [...Array(size).keys()].map(i => 0.0);
        this.linearOffsets = [...Array(size).keys()].map(i => 0.0);
      } else {
        if (offsets.length !== size) {
          throw new Error('offsets must be same length as size')
        } else if (offsetType === 'proportional') {
          this.proportionalOffsets = offsets;
          const min = Math.min(...offsets);
          const max = Math.max(...offsets);
          if (min < -0.5 || max > 0.5) {
            throw new Error('offsets must be between -0.5 and 0.5')
          }
          this.linearOffsets = offsets.map(o => o * this.pulseDur);
        } else { // offsetType === 'linear'
          const maxOff = 0.5 * this.pulseDur;
          const min = Math.min(...offsets);
          const max = Math.max(...offsets);
          if (min < -maxOff || max > maxOff) {
            throw new Error('offsets must be between -0.5 and 0.5')
          }
          this.linearOffsets = offsets;
          this.proportionalOffsets = offsets.map(o => o / this.pulseDur);
        }
        this.pulses = this.linearOffsets.map((o, i) => {
          const time = this.startTime + o + i * this.pulseDur;
          return new Pulse({
            realTime: time,
            affiliation: { pulseStructureId: this.uniqueId, idx: i }
          })
        });
        if (this.pulses[0].realTime < 0) {
          throw new Error('all pulses must be positive or zero')
        }
      }
      if (initPulse !== undefined) {
        if (this.frontWeighted === true) {
          this.pulses[0] = initPulse;
        } else {
          this.pulses[this.pulses.length - 1] = initPulse;
        }
      }
    }

    get durTot() {
      return this.size * this.pulseDur;
    }
  
    static fromPulse(pulse: Pulse, duration: number, size: number, {
      frontWeighted = true,
      layer = 0
    }: {
      frontWeighted?: boolean,
      layer?: number
    } = {}) {
      // for evenly spaced pulse structures ... you can always update offsets
      // later
      const startTime = pulse.realTime;
      const tempo = 60 * size / duration;
      const ps = new PulseStructure({
        tempo,
        size, 
        startTime,
        frontWeighted,
        initPulse: pulse,
        layer
      });
      const idx = frontWeighted === true ? 0 : ps.pulses.length - 1;
      pulse.addAffiliation(ps, idx, layer)
      return ps
    }
  }
  
  // [4] or [4, 2] or [[4, 3], [2]] or 
  
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  
  class Meter {
    hierarchy: (number | number[])[];
    pulseStructures: PulseStructure[][];
    startTime: number;
    cycleDuration: number;
    uniqueId: string;
    repetitions: number;
  
    constructor({
      hierarchy = [4, 4],
      startTime = 0.0,
      tempo = 60, //bpm
      uniqueId = uuidv4(),
      repetitions = 1
    }: {
      hierarchy?: (number | number[])[],
      startTime?: number,
      tempo?: number,
      uniqueId?: string,
      repetitions?: number
    }) {
      this.repetitions = repetitions;
      this.hierarchy = hierarchy;
      this.startTime = startTime;
      if (typeof hierarchy[0] === 'number') {
        this.cycleDuration = 60 * hierarchy[0] / tempo;
      } else {
        const summed = sum(hierarchy[0]);
        this.cycleDuration = 60 * summed / tempo;
      }
      this.uniqueId = uniqueId;
      this.pulseStructures = [];
      this.hierarchy.forEach((h, i) => {
        const subPulseStructures: PulseStructure[] = [];
        if (i === 0) {
          for (let rep = 0; rep < repetitions; rep++) {
            if (typeof h === 'number') {
              const tempo = 60 * h / this.cycleDuration;
              const ps = new PulseStructure({
                tempo,
                size: h,
                startTime: rep * this.cycleDuration + this.startTime,
                layer: i
              })
              subPulseStructures.push(ps)
            } else {
              const summed = sum(h);
              const tempo = 60 * summed / this.cycleDuration;
              const beatDur = this.cycleDuration / summed;
              h.forEach((subH, j) => {
                let startTime = this.startTime + beatDur * sum(h.slice(0, j));
                startTime += rep * this.cycleDuration;
                const ps = new PulseStructure({
                  tempo,
                  size: subH,
                  startTime,
                  layer: i
                })
                subPulseStructures.push(ps)
              })
            }
          }         
        } else {
          if (typeof h === 'number') {
            this.pulseStructures[i - 1].forEach(parentPS => {
              parentPS.pulses.forEach((p, j) => {
                let duration = parentPS.pulseDur;
                const tempo = 60 * h / duration;
                let startTime = p.realTime + parentPS.pulseDur * j;
                const ps = PulseStructure.fromPulse(p, duration, h, { 
                  layer: i 
                })
                subPulseStructures.push(ps)
              })
            })
          } else {
            const summed = sum(h);
            this.pulseStructures[i - 1].forEach(parentPS => {
              parentPS.pulses.forEach((p, j) => {
                const beatDur = parentPS.pulseDur / summed;
                h.forEach((subH, k) => {
                  let startTime = p.realTime + beatDur * sum(h.slice(0, k));
                  const tempo = 60 * subH / beatDur;
                  const duration = beatDur * subH;
                  const c1 = parentPS.frontWeighted && k === 0;
                  const c2 = !parentPS.frontWeighted && k === h.length - 1;
                  let ps: PulseStructure;
                  if (c1 || c2) {
                    ps = PulseStructure.fromPulse(p, duration, subH, {
                      frontWeighted: parentPS.frontWeighted,
                      layer: i
                    })
                  } else {
                    ps = new PulseStructure({
                      tempo,
                      size: subH,
                      startTime,
                      layer: i
                    });
                  }
                  subPulseStructures.push(ps)
                })
              })
            })
          }
        }
        this.pulseStructures.push(subPulseStructures)
      })
    }
  }
  
  
  const a = new Meter({ hierarchy: [4, 2], repetitions: 20, tempo: 100 });
//   const firstPulse = a.pulseStructures[0][0].pulses[0];
  console.log(a)
  // console.log(a.pulseStructures[1][1].startTime)
  // console.log(a.pulseStructures[2].map(ps => ps.startTime))
