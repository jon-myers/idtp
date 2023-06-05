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

  get lowestLayer(): number {
    // get all affiliations that have an associated layer
    const layers = this.affiliations.map(a => a.layer);
    const filteredLayers = layers.filter(l => l !== undefined) as number[];
    // if there are no layers, throw error
    if (filteredLayers.length === 0) {
      throw new Error('No layers found')
    } else {
      // otherwise return the lowest layer
      return Math.min(...filteredLayers)
    }
  }

  getLowestPSID() {
    const layer = this.lowestLayer;
    const affiliation = this.affiliations.find(a => a.layer === layer);
    if (affiliation === undefined) {
      throw new Error('Affiliation not found')
    }
    return affiliation.pulseStructureId
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
  parentPulseID?: string;
  primary: boolean;

  constructor({
    tempo = 60,
    size = 4,
    offsetType = 'proportional', 
    offsets = undefined,
    startTime = 0.0,
    uniqueId = uuidv4(),
    frontWeighted = true,
    initPulse = undefined,
    layer = undefined,
    parentPulseID = undefined,
    primary = true
  }: {
    tempo?: number,
    size?: number,
    offsetType?: 'linear' | 'proportional',
    offsets?: number[],
    startTime?: number,
    uniqueId?: string,
    frontWeighted?: boolean,
    initPulse?: Pulse,
    layer?: number,
    parentPulseID?: string,
    primary?: boolean
  } = {}) {
    this.frontWeighted = frontWeighted;
    this.uniqueId = uniqueId;
    this.tempo = tempo;
    this.pulseDur = 60 / tempo;
    this.size = size;
    this.startTime = startTime;
    this.layer = layer;
    this.parentPulseID = parentPulseID;
    this.primary = primary;
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

  getPulseIdxFromId(pulseId: string) {
    return this.pulses.findIndex(p => p.uniqueId === pulseId)
  }

  adjustLinearOffsets(offsets: number[]) {
    if (offsets.length !== this.size) {
      throw new Error('offsets must be same length as size')
    }
    const maxOff = 0.5 * this.pulseDur;
    const min = Math.min(...offsets);
    const max = Math.max(...offsets);
    if (min < -maxOff || max > maxOff) {
      throw new Error('offsets must be between -0.5 and 0.5 of pulse duration')
    }
    this.linearOffsets = offsets;
    this.proportionalOffsets = offsets.map(o => o / this.pulseDur);
    const newRealTimes = this.linearOffsets.map((o, i) => {
      return this.startTime + o + i * this.pulseDur;
    });
    this.pulses.forEach((p, i) => {
      p.realTime = newRealTimes[i];
    });
  }

  adjustProportionalOffsets(offsets: number[]) {
    if (offsets.length !== this.size) {
      throw new Error('offsets must be same length as size')
    }
    const min = Math.min(...offsets);
    const max = Math.max(...offsets);
    if (min < -0.5 || max > 0.5) {
      throw new Error('offsets must be between -0.5 and 0.5')
    }
    this.proportionalOffsets = offsets;
    this.linearOffsets = offsets.map(o => o * this.pulseDur);
    const newRealTimes = this.linearOffsets.map((o, i) => {
      return this.startTime + o + i * this.pulseDur;
    });
    this.pulses.forEach((p, i) => {
      p.realTime = newRealTimes[i];
    });
  }

  static fromPulse(pulse: Pulse, duration: number, size: number, {
    frontWeighted = true,
    layer = 0,
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
      layer,
      parentPulseID: pulse.uniqueId
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
                layer: i,
                primary: j === 0
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
            parentPS.pulses.forEach(p => {
              const beatDur = parentPS.pulseDur / summed;
              h.forEach((subH, k) => {
                let startTime = p.realTime + beatDur * sum(h.slice(0, k));
                const tempo = 60 / beatDur;
                const duration = beatDur * subH;
                const c1 = parentPS.frontWeighted && k === 0;
                const c2 = !parentPS.frontWeighted && k === h.length - 1;
                let ps: PulseStructure;
                if (c1 || c2) {
                  ps = PulseStructure.fromPulse(p, duration, subH, {
                    frontWeighted: parentPS.frontWeighted,
                    layer: i,
                  })
                } else {
                  ps = new PulseStructure({
                    tempo,
                    size: subH,
                    startTime,
                    layer: i,
                    parentPulseID: p.uniqueId,
                    primary: false
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

  get allPulses() {
    // go to lowest layer, get all pulses
    const lastLayer = this.pulseStructures[this.pulseStructures.length - 1];
    return lastLayer.map(ps => ps.pulses).flat()
  }

  get allPulseStructures() {
    return this.pulseStructures.flat()
  }

  getPSFromId(id: string) {
    const outPS = this.allPulseStructures.find(ps => ps.uniqueId === id);
    if (outPS === undefined) {
      throw new Error(`PulseStructure with ID ${id} not found`)
    }
    return outPS
  }

  getPulseFromId(id: string) {
    return this.allPulses.find(p => p.uniqueId === id)
  }

  replaceAllChildrenPulseStructures(pulse: Pulse, layer: number) { // recursive
    if (this.pulseStructures.length < layer + 1) {
      throw new Error(`Layer ${layer + 1} does not exist`)
    }
    const bottomLayerPulses = this.allPulses.filter(p => {
      return p.lowestLayer === layer - 1
    })
    const pulseIdx = bottomLayerPulses.indexOf(pulse);
    if (pulseIdx === -1) {
      throw new Error(`Pulse ${pulse.uniqueId} not found`)
    } else if (pulseIdx === 0) {
      throw new Error(`Cannot shift first pulse`)
    }
    const prevPulse = bottomLayerPulses[pulseIdx - 1];
    let parentPulseIDs = [prevPulse.uniqueId, pulse.uniqueId];
    const removeIdxsGrid = [];
    for (let i = layer; i < this.pulseStructures.length; i++) {
      const psLayer = this.pulseStructures[i];
      const removeIdxs: number[] = [];
      psLayer.forEach((ps, j) => {
        if (parentPulseIDs.includes(ps.parentPulseID!)) {
          removeIdxs.push(j);
          ps.pulses.forEach(p => {
            if (!parentPulseIDs.includes(p.uniqueId)) {
              parentPulseIDs.push(p.uniqueId);
            }
          })
        }
      })
      removeIdxsGrid.push(removeIdxs);
    }
    const replacePSsGrid: PulseStructure[][] = [];
    removeIdxsGrid.forEach((removeIdxs, i) => {
      const replacePSs: PulseStructure[] = [];
      const relLayer = i + layer;
      const lps = this.allPulses.filter(p => p.lowestLayer <= relLayer-1);
      const layerDurs = [...Array(lps.length-1).keys()].map(j => {
        return lps[j+1].realTime - lps[j].realTime
      })
      const lastDur = this.cycleDuration - lps[lps.length-1].realTime + lps[0].realTime;
      layerDurs.push(lastDur);


      // this most likely does not work at all for bifurcated metric units, i.e. [3, 4]
      const h = this.hierarchy[relLayer];
      if (typeof h === 'number') {
        removeIdxs.forEach(idx => {
          const dur = layerDurs[idx];
          const oldPS = this.pulseStructures[relLayer][idx];
          
          const newPS = PulseStructure.fromPulse(lps[idx], dur, oldPS.size, {
            layer: relLayer
          })
          replacePSs.push(newPS);
        })
      } else {
        const summed = sum(h);
        const startIdx = prevPulse.affiliations.find(aff => {
          return aff.layer === relLayer - 1
        })!.idx
        layerDurs.forEach((dur, j) => {
          if (j >= startIdx && j < startIdx + 2) {
            const unitDur = dur / summed;
            h.forEach((subH, k) => {
              const dur = unitDur * subH;
              const oldPS = this.pulseStructures[relLayer][j * h.length + k];
              if (k === 0) {
                const newPS = PulseStructure.fromPulse(lps[j], dur, subH, {
                  layer: relLayer
                })
                replacePSs.push(newPS);
              } else {
                const tempo = 60 * subH / dur;
                const startTime = lps[j].realTime + unitDur * sum(h.slice(0, k));
                const newPS = new PulseStructure({
                  tempo,
                  size: subH,
                  startTime,
                  layer: relLayer,
                  parentPulseID: lps[j].uniqueId,
                  primary: false
                })
                replacePSs.push(newPS);
              }
            })
          }
          
        })


      }
      replacePSsGrid.push(replacePSs);
    })
    removeIdxsGrid.forEach((removeIdxs, i) => {
      const relLayer = i + layer;
      const riStart = removeIdxs[0];
      const riEnd = removeIdxs[removeIdxs.length - 1];
      this.pulseStructures[relLayer]
        .splice(riStart, riEnd - riStart + 1, ...replacePSsGrid[i])
    })
  }

  offsetPulse(pulse: Pulse, offset: number) {
    const psID = pulse.getLowestPSID();
    const layer = pulse.lowestLayer;
    const pulseStructure = this.getPSFromId(psID);
    // first, adjust the pulse structure
    const pulseIdx = pulseStructure.getPulseIdxFromId(pulse.uniqueId);
    const newOffsets = pulseStructure.linearOffsets;
    newOffsets[pulseIdx] += offset;
    pulseStructure.adjustLinearOffsets(newOffsets);
    // then, for relevent pulses (the previous, and the next), get rid of all
    // children pulse structures, and re-add them
    // get all pulses whose lowest layer is less than or equal to that layer;
    const layerPulses = this.allPulses.filter(p => p.lowestLayer <= layer);
    const layerPulseIdx = layerPulses.findIndex(p => {
      p.uniqueId === pulse.uniqueId
    });
    if (layerPulseIdx === 0) {
      throw new Error('Cannot offset first pulse')
    }
    this.replaceAllChildrenPulseStructures(pulse, layer+1)
  }
}


const a = new Meter({ hierarchy: [4, [3, 2]] });
const pulse = a.allPulses[10];
console.log(a.allPulses.map(p => p.realTime))
// console.log(a.pulseStructures[1].length)
a.offsetPulse(pulse, 0.05)
console.log(a.allPulses.map(p => p.realTime))
