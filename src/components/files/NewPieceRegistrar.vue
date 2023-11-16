<template>
  <div class='outer'>
    <div class="formContainer">
      <div class="formRow">
        <label>Title</label>
        <input v-model="title"/>
      </div>
      <div class='formRow'>
        <label>Recording</label>
        <div class='formCol'>
          <select v-model='aeIdx' ref='audioEvent'>
            <option 
              v-for='(ae, i) in allEvents' 
              :key='ae.name'
              :value='i'
            >
              {{ae.name}}
            </option>
          </select>
          <select 
            class='c2' 
            v-model='recording' 
            v-if='aeIdx && aeIdx >= 0' 
            ref='audioRec'
          >
            <option
              v-for='(recIdx, i) in Object.keys(allEvents[aeIdx].recordings)'
              :key='i'
              :value='recIdx'
            >
              {{getShorthand(allEvents[aeIdx].recordings[Number(recIdx)])}}
            </option>
          </select>
        </div>
      </div>
      <div class="formRow">
        <label class='ragaLabel'>Raga</label>
        <input class='ragaCheck' type='checkbox' v-model='showRaagEditor'>
        <select v-model='raga' ref='raga'>
          <option v-for='raag in raags' :key='raag'>
            {{raag}}
          </option>
        </select>
      </div>
      <div class='formRow'>
        <label>Permissions</label>
        <select v-model='permissions'>
          <option v-for='pType in permissionTypes' :key='pType'>
            {{pType}}
          </option>
        </select>
      </div>
      <div class='formRow' v-if='instrumentation'>
        <label>Instrumentation</label>
        <select v-model='instrumentation[0]'>
          <option v-for='inst in instruments' :key='inst'>
            {{inst}}
          </option>
        </select>
      </div>
      <div class='buttonRow'>
        <div class='buttonCol'>
          <button @click="makeNewPiece">submit</button>
        </div>
      </div>
    </div>
    <div class='raagEditorBox' v-if='showRaagEditor'>
      <div class='infoRow'>
        <div class='sapa'>
          <label class='small'>Sa</label>
          <input type='checkbox' v-model='rules.sa'>
        </div>
      </div>
      <div class='infoRow'>
        <div class='sargam'>
          <label class='small'>Re</label>
          <div class='infoCol'>
            <div class='smallInfoRow'>
              <label>Lowered</label>
              <input type='checkbox' v-model='rules.re.lowered'>
            </div>
            <div class='smallInfoRow'>
              <label>Raised</label>
              <input type='checkbox' v-model='rules.re.raised'>
            </div>
          </div>
        </div>
      </div>
      <div class='infoRow'>
        <div class='sargam'>
          <label class='small'>Ga</label>
          <div class='infoCol'>
            <div class='smallInfoRow'>
              <label>Lowered</label>
              <input type='checkbox' v-model='rules.ga.lowered'>
            </div>
            <div class='smallInfoRow'>
              <label>Raised</label>
              <input type='checkbox' v-model='rules.ga.raised'>
            </div>
          </div>
        </div>
      </div>
      <div class='infoRow'>
        <div class='sargam'>
          <label class='small'>Ma</label>
          <div class='infoCol'>
            <div class='smallInfoRow'>
              <label>Lowered</label>
              <input type='checkbox' v-model='rules.ma.lowered'>
            </div>
            <div class='smallInfoRow'>
              <label>Raised</label>
              <input type='checkbox' v-model='rules.ma.raised'>
            </div>
          </div>
        </div>
      </div>
      <div class='infoRow'>
        <div class='sapa'>
          <label class='small'>Pa</label>
          <input type='checkbox' v-model='rules.pa'>
        </div>
      </div>
      <div class='infoRow'>
        <div class='sargam'>
          <label class='small'>Dha</label>
          <div class='infoCol'>
            <div class='smallInfoRow'>
              <label>Lowered</label>
              <input type='checkbox' v-model='rules.dha.lowered'>
            </div>
            <div class='smallInfoRow'>
              <label>Raised</label>
              <input type='checkbox' v-model='rules.dha.raised'>
            </div>
          </div>
        </div>
      </div>
      <div class='infoRow'>
        <div class='sargam'>
          <label class='small'>Ni</label>
          <div class='infoCol'>
            <div class='smallInfoRow'>
              <label>Lowered</label>
              <input type='checkbox' v-model='rules.ni.lowered'>
            </div>
            <div class='smallInfoRow'>
              <label>Raised</label>
              <input type='checkbox' v-model='rules.ni.raised'>
            </div>
          </div>
        </div>
      </div>
      <div class='infoRow'>
        <button @click='save'>save</button>
      </div>
      <div class='infoRow'>
        <span>{{savedMsg}}</span>
      </div>
    </div>
  </div>
  
</template>
<script lang='ts'>

import { 
  getAllAudioEventMetadata, 
  getRagaNames, 
  getRaagRule, 
  saveRaagRules,
  getInstruments,
  getInstrumentation,
} from '@/js/serverCalls.ts';
import RaagEditor from '@/components/RaagEditor.vue';
import type { AudioEventMetadataType } from '@/js/serverCalls.ts';
import { defineComponent } from 'vue';
import type { PassedDataType } from '@/components/files/FileManager.vue';
import type { RecType } from '@/components/audioEvents/AudioEvents/AddAudioEvent.vue';

type RulesType = {
  sa: boolean,
  re: {
    lowered: boolean,
    raised: boolean
  },
  ga: {
    lowered: boolean,
    raised: boolean
  },
  ma: {
    lowered: boolean,
    raised: boolean
  },
  pa: boolean,
  dha: {
    lowered: boolean,
    raised: boolean
  },
  ni: {
    lowered: boolean,
    raised: boolean
  }
}

type NewPieceRegistrarDataType = {
  title?: string;
  transcriber?: string;
  raga?: string;
  allEvents: AudioEventMetadataType[];
  aeIdx?: number;
  recording?: number;
  raags?: string[];
  showRaagEditor: boolean;
  rules: RulesType,
  savedMsg: string;
  passedInData?: PassedDataType;
  permissions: string;
  cloning: boolean;
  permissionTypes: string[];
  rulesTemplate: RulesType;
  instrumentation: string[];
  instruments?: string[];
}

export default defineComponent({
  name: 'NewPieceRegistrar',
  data(): NewPieceRegistrarDataType {
    return {
      title: undefined,
      transcriber: undefined,
      raga: undefined,
      allEvents: [],
      aeIdx: undefined,
      recording: undefined,
      raags: undefined,
      showRaagEditor: false,
      rules: {
        sa: false,
        re: {
          lowered: false,
          raised: false
        },
        ga: {
          lowered: false,
          raised: false
        },
        ma: {
          lowered: false,
          raised: false
        },
        pa: false,
        dha: {
          lowered: false,
          raised: false
        },
        ni: {
          lowered: false,
          raised: false
        }
      },
      savedMsg: 'unsaved',
      passedInData: undefined,
      permissions: 'Public',
      cloning: false,
      permissionTypes: [
        'Public',
        'Private',
        'Publicly Editable'
      ],
      rulesTemplate: {
        sa: false,
        re: {
          lowered: false,
          raised: false
        },
        ga: {
          lowered: false,
          raised: false
        },
        ma: {
          lowered: false,
          raised: false
        },
        pa: false,
        dha: {
          lowered: false,
          raised: false
        },
        ni: {
          lowered: false,
          raised: false
        }
      },
      instrumentation: ['Sitar'],
      instruments: undefined
    }
  },
  
  props: {
    modalWidth: {
      type: Number,
    },
    modalHeight: {
      type: Number,
    },
    dataObj: {
      type: String,
      required: true
    },
  },
    
  async mounted() {
    try {
      this.allEvents = await getAllAudioEventMetadata();
      this.raags = await getRagaNames();
      this.rules = this.rulesTemplate;
      if (this.dataObj) { // this is exclusively for cloning
        this.clonePiece()
      }
      if (this.$route.query.aeName) {
        const allNames = this.allEvents.map(obj => obj.name);
        this.aeIdx = allNames.indexOf(JSON.parse(this.$route.query.aeName as string));
        const recs = this.allEvents[this.aeIdx].recordings;
        const allRecNames = await Object.keys(recs).map(key => {
          const rec = recs[Number(key)];
          return this.getShorthand(rec)
        });
        const parsed = JSON.parse(this.$route.query.afName as string);
        this.recording = allRecNames.indexOf(parsed);
        this.raga = Object.keys(recs[this.recording].raags)[0];
        this.instrumentation = this.getInstrumentation();
      }
      this.instruments = await getInstruments();
    } catch (err) {
      console.log(err)
    }
    
  },
  
  watch: {
    aeIdx() {
      this.recording = undefined
    },
    
    async recording(newVal) {
      if (newVal) {
        if (this.aeIdx === undefined) {
          throw new Error('aeIdx is undefined')
        }
        const ae = this.allEvents[this.aeIdx];
        const raags = ae.recordings[newVal].raags;
        const keys = Object.keys(raags);
        if (keys.length === 1) {
          this.raga = keys[0]
        } else if (keys.length > 1) {
          this.raga = keys.filter(key => raags[key].start === 0)[0]
        }
        const audioID = ae.recordings[newVal].audioFileId;
        this.instrumentation = await getInstrumentation(audioID)
      }
    },
    
    raga(newVal) {
      getRaagRule(newVal).then(rules => {
        if (rules.rules) {
          this.rules = rules.rules;
          const date = new Date(rules.updatedDate);
          this.savedMsg = 'Saved: ' + date.toLocaleString();
        } else {
          this.rules = this.rulesTemplate;
          this.savedMsg = 'unsaved';
        }
      })
    },

    dataObj(newObj) {
      this.passedInData = JSON.parse(newObj);

    }
  },
  
  components: {
    RaagEditor
  },
  
  methods: {

    async clonePiece() {
      this.cloning = true;
      
      try {
        this.passedInData = JSON.parse(this.dataObj)!;
        if (this.passedInData === undefined) {
          throw new Error('passedInData is undefined')
        }
        this.title = this.passedInData.title;
        this.instrumentation = this.passedInData.instrumentation!;
        this.aeIdx = this.allEvents.findIndex(ae => {
          return ae.name === this.passedInData!.audioEvent
        });
        const recs = this.allEvents[this.aeIdx].recordings;
        const allRecNames = await Object.keys(recs).map(key => {
          const rec = recs[Number(key)];
          return this.getShorthand(rec)
        });
        const rec = this.getShorthand(this.passedInData.audioRecording);
        this.recording = allRecNames.indexOf(rec);
        this.raga = this.passedInData.raga.name;
        const aeElem = this.$refs.audioEvent as HTMLSelectElement;
        const arElem = this.$refs.audioRec as HTMLSelectElement;
        const rElem = this.$refs.raga as HTMLSelectElement;
        aeElem.disabled = true;
        arElem.disabled = true;
        rElem.disabled = true;
      } catch (err) {
        console.log(err)
      }
      
    },
    
    async save() {
      const date = new Date();
      const res = await saveRaagRules(this.raga!, this.rules!, date);
      if (res) {
        this.savedMsg = 'Saved: ' + date.toLocaleString()
      }
    },
    
    async makeNewPiece() {
      if (this.cloning) {
        if (this.passedInData === undefined) {
          throw new Error('passedInData is undefined')
        }
        const ae = this.allEvents[this.aeIdx!];
        const newPieceInfo = {
          title: this.title,
          transcriber: this.passedInData.transcriber,
          raga: this.passedInData.raga,
          permissions: this.permissions,
          audioID: ae.recordings[this.recording!].audioFileId,
          clone: true,
          origID: this.passedInData.origID,
          instrumentation: this.instrumentation
        };
        this.$emit('newPieceInfoEmit', newPieceInfo);
        // this.emitter.emit('newPieceInfo', newPieceInfo);
        
      } else {
        const newPieceInfo: {
          title?: string,
          transcriber?: string,
          raga?: string,
          permissions?: string,
          clone: boolean,
          audioID?: string,
          instrumentation: string[]
        } = {
          title: this.title,
          transcriber: this.transcriber,
          raga: this.raga,
          permissions: this.permissions,
          clone: false,
          instrumentation: this.instrumentation
        };
        if (this.aeIdx !== undefined && this.recording !== undefined) {
          const ae = this.allEvents[this.aeIdx];
          newPieceInfo.audioID = ae.recordings[this.recording].audioFileId;
          // newPieceInfo.instrumentation = this.getInstrumentation()
        }
        this.$emit('newPieceInfoEmit', newPieceInfo)
      }
      
    },

    getInstrumentation() {
      const rec = this.allEvents[Number(this.aeIdx)].recordings[Number(this.recording)];
      const musicians = Object.keys(rec.musicians);
      const instrumentation: string[] = [];
      musicians.forEach(m => {
        if (rec.musicians[m].role === 'Soloist') {
          instrumentation.push(rec.musicians[m].instrument)
        }
      })
      return instrumentation
    },
  
    
    getShorthand(rec: RecType) {
      const out: string[] = [];
      const raagNames = Object.keys(rec.raags);
      raagNames.forEach(rn => {
        out.push(rn, ' - ');
        const obj = rec.raags[rn]['performance sections']!;
        const pSecs = Object.keys(obj);
        pSecs.forEach((pSec, i) => {
          out.push(pSec, i !== pSecs.length - 1 ? ', ' : '; ');
        })
      })
      return out.join('')
    },
  }
})
</script>

<style scoped>

.formContainer {
  height: 100%;
  width: 350px;
  display: flex;
  flex-direction: column;
  justify-content: top;
  align-items: center;
}

.formRow {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  height: 50px;
}

label {
  /* padding-left: 20px;
  padding-right: 20px; */
  width: 120px;
  display: flex;
  flex-direction: row;
  justify-content: right;
  padding-right: 10px;
}

.ragaLabel {
  width: 95px;
  max-width: 95px;
  padding-right: 0px;
  margin-right: 5px;
}

.ragaCheck {
  width: 20px;
  max-width: 20px;
  margin: 0px;
  margin-right: 10px;
}

.formRow input {
  width: 200px;
}

button {
  width: 80px;
  height: 25px;
  cursor: pointer;
}

.buttonRow {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  width: 100%;
  height: 50px;
}

select {
  width: 208px;
}

.buttonCol {
  display: flex;
  flex-direction: column;
  width: 100%;
  justify-content: center;
  align-items: center;
}

.formCol {
  display: flex;
  flex-direction: column;
  width: 200px;
  
}

.raagEditorBox {
  width: 200px;
}

.infoRow {
  width: 100%;
  height: 50px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.infoCol {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 150px;
  max-width: 150px;
}

.smallInfoRow {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
}

.sapa {
  width: 200px;
  height: 50px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.sargam {
  width: 200px;
  height: 50px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.outer {
  display: flex;
  flex-direction: row;
  background-color: #202621;
  border: 1px solid white;
  border-radius: 5px;
  color: white;
  width: v-bind(modalWidth+'px');
  height: v-bind(modalHeight+'px')
}

.raagEditorBox label {
  width: 70px;
  text-align: right;
  margin-right: 10px;
}

.raagEditorBox label.small {
  width: 50px;
  min-width: 50px;
  font-weight: bold;
  
}

.closeWindow {
  position: absolute;
  width: 30px;
  height: 30px;
  background-color: black;
  right: 0;
  top: 0;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

input {
  background-color: #2f3830;
  color: white
}

select {
  background-color: #2f3830;
  color: white
}

button {
  background-color: #2f3830;
  color: white
}

</style>
