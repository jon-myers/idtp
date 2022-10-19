<template>
  <div class='outer'>
    <div class="formContainer">
      <div class="formRow">
        <label>Title</label>
        <input v-model="title"/>
      </div>
      <div class="formRow">
        <label>Transcriber</label>
        <input v-model="transcriber"/>
      </div>
      <div class='formRow'>
        <label>Recording</label>
        <div class='formCol'>
          <select v-model='aeIdx'>
            <option 
              v-for='(ae, i) in allAudioEvents' 
              :key='ae.name'
              :value='i'>
              {{ae.name}}
            </option>
          </select>
          <select class='c2' v-model='recording' v-if='aeIdx >= 0'>
            <option
              v-for='(recIdx, i) in Object.keys(allAudioEvents[aeIdx].recordings)'
              :key='i'
              :value='recIdx'
              >{{getShorthand(allAudioEvents[aeIdx].recordings[recIdx])}}</option>
          </select>
        </div>
      </div>
      <div class="formRow">
        <label>Raga
          <input type='checkbox' v-model='showRaagEditor'>
        </label>
        <select v-model='raga'>
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
      <div class='buttonRow'>
        <div class='buttonCol'>
          <button @click="makeNewPiece">submit</button>
          <button @click="cancel">cancel</button>
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
    <div class='closeWindow' @click='closeWindow'>
      <span class='close-x'></span>
    </div>
  </div>
  
</template>
<script>

import { getAllAudioEventMetadata, getRagaNames, getRaagRule, saveRaagRules } from '@/js/serverCalls.js';
import RaagEditor from '@/components/RaagEditor.vue';
export default {
  name: 'NewPieceRegistrar',
  data() {
    return {
      title: undefined,
      transcriber: undefined,
      raga: undefined,
      allAudioEvents: undefined,
      aeIdx: undefined,
      recording: undefined,
      raags: undefined,
      showRaagEditor: false,
      rules: undefined,
      savedMsg: 'unsaved',
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
    }
  },
  
  async mounted() {
    this.allAudioEvents = await getAllAudioEventMetadata();
    this.raags = await getRagaNames();
    this.rules = this.rulesTemplate;
  },
  
  watch: {
    aeIdx() {
      this.recording = undefined
    },
    
    recording(newVal) {
      if (newVal) {
        const ae = this.allAudioEvents[this.aeIdx];
        const raags = ae.recordings[newVal].raags;
        const keys = Object.keys(raags);
        if (keys.length === 1) {
          this.raga = keys[0]
        } else if (keys.length > 1) {
          this.raga = keys.filter(key => raags[key].start === 0)[0]
        }
        
      }
    },
    
    raga(newVal) {
      console.log(newVal)
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
    }

  },
  
  components: [
    RaagEditor
  ],
  
  methods: {
    
    async save() {
      const date = new Date();
      const res = await saveRaagRules(this.selectedRaag, this.rules, date);
      if (res) {
        this.savedMsg = 'Saved: ' + date.toLocaleString()
      }
    },
    
    makeNewPiece() {
      const newPieceInfo = {
        title: this.title,
        transcriber: this.transcriber,
        raga: this.raga,
        permissions: this.permissions
      }
      if (this.aeIdx && this.recording) {
        const ae = this.allAudioEvents[this.aeIdx];
        newPieceInfo.audioID = ae.recordings[this.recording].audioFileId
      }
      this.emitter.emit('newPieceInfo', newPieceInfo);
      this.emitter.emit('closeModal');
    },
    
    cancel() {
      this.emitter.emit('closeModal')
    },
    
    getShorthand(rec) {
      const out = [];
      const raagNames = Object.keys(rec.raags);
      raagNames.forEach(rn => {
        out.push(rn, ' - ');
        const pSecs = Object.keys(rec.raags[rn]['performance sections']);
        pSecs.forEach((pSec, i) => {
          out.push(pSec, i !== pSecs.length - 1 ? ', ' : '; ');
        })
      })
      return out.join('')
    },
    
    closeWindow() {
      this.$parent.designPieceModal = false
    }
  }
}
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
  width: 100px;
  display: flex;
  flex-direction: row;
  justify-content: left;
  padding-left: 20px;
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

/* .c2 {
  margin-left: 5px;
} */

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
  /* height: 200px;
  min-height: 200px; */
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

.close-x {
        display: inline-block;
        width: 20px;
        height: 20px;
        /* border: 7px solid #f56b00; */
        background:
            linear-gradient(45deg, rgba(0,0,0,0) 0%,rgba(0,0,0,0) 43%,#fff 45%,#fff 55%,rgba(0,0,0,0) 57%,rgba(0,0,0,0) 100%),
            linear-gradient(135deg, rgba(0,0,0,0) 0%,rgba(0,0,0,0) 43%,#fff 45%,#fff 55%, rgba(0,0,0,0) 57%, rgba(0,0,0,0) 100%);
}

</style>
