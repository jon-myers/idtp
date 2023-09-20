<template>
  <div class='main' @click='handleClick'>
    <div 
      class='fileContainer' 
      ref='fileContainer' 
      @contextmenu='handleRightClick'>
      <div 
        class='audioEventRow' 
        v-for='(ae, aeIdx) in allAudioEvents'
        :key='ae.name'>
        <div 
          class='audioEventNameRow'
          :id='`ae${aeIdx}`'
          @dblclick='toggleDisplay($event, ae, true)'
          >
          
          <span @click='toggleDisplay($event, ae, false)'>&#9654;</span>
          <label>{{ae.name}}</label>
        </div>
        <div 
          :class='`audioRecordingRowOuter height${getHeight(ae)}`' 
          v-show='ae.visible'
          >
          <div 
            :class='`audioRecordingRowSpacer height${getHeight(ae)}`'
            >
          </div>
          <div class='audioRecordingCol'>
            <div 
              :class='`audioRecordingRow height${raagHt(ae, Number(recKey))}`' 
              v-for='recKey in Object.keys(ae.recordings)'
              :id='`arr${aeIdx}_${recKey}`'
              :key='ae.recordings[Number(recKey)].audioFileId'
              @dblclick='sendAudioSource($event, ae, aeIdx, Number(recKey))'>
              <span class='recordingNum'>{{`${Number(recKey)+1}. `}}</span>
              <div :class='`soloist height${raagHt(ae, Number(recKey))}`'>
                <span>
                  {{getSoloist(ae.recordings[Number(recKey)])}}
                </span>
              </div> 
              <div :class='`raagNameCol height${raagHt(ae, Number(recKey))}`'>
                <div 
                  class='raagName' 
                  v-for='raag in getRaags(ae.recordings[Number(recKey)])'
                  :key='raag'>
                  <span>{{raag}}
                  </span>
                </div>
              </div>
              <div :class='`performanceSectionCol height${raagHt(ae, Number(recKey))}`'>
                <div 
                  class='performanceSections' 
                  v-for='raag in getRaags(ae.recordings[Number(recKey)])'
                  :key='raag'>
                  <span>
                    {{getPSecs(ae.recordings[Number(recKey)].raags[raag])}}
                  </span>
                </div>
              </div>
            </div>
          </div>      
        </div>
      </div>
    </div>    
    <AddAudioEvent 
      v-if='showAddEvent' 
      class='audioEventPopup' 
      ref='addAudioEvent'
      :extUniqueId='editingId'
      :userID='userID'
      @reset-parent='resetAddEvent'
      />
    <AudioPlayer 
      v-if='true' 
      :audioSource='audioSource' 
      :saEstimate='saEstimate'
      :saVerified='saVerified'
      :id='audioRecId'
      ref='audioPlayer'
      @emitNextTrack='nextTrack'/>
  </div>
  <div class='dropDown closed' ref='dropDown'>
    <div 
      :class='`dropDownRow`'
      @click='toggleAddEvent'>
      Add Audio Event
    </div>
    <div 
      :class='`dropDownRow ${toggle[Number(!clickedAE)]}`' 
      @click='handleEditAEClick'>
      <!-- '`${[undefined, "handleEditAEClick"][Number(clickedAE)]}`'> -->
      Edit Audio Event
    </div>
    <div
      :class='`dropDownRow ${toggle[Number(userID !== selectedUserID)]}`'
      @click='deleteAE'>
      Delete Audio Event
    </div>
    <div
      :class='`dropDownRow last ${toggle[Number(!clickedAF)]}`'
      @click='handleNewTranscriptionClick'>
      New Transcription
    </div>
  </div>
  
</template>
<script lang='ts'>
import { 
  getAllAudioEventMetadata, 
  deleteAudioEvent,
  getAllTransOfAudioFile,
} from '@/js/serverCalls.ts';
import AddAudioEvent from '@/components/AddAudioEvent.vue';
import AudioPlayer from '@/components/AudioPlayer.vue';
import { defineComponent } from 'vue';

const displayTime = (dur: number) => {
  const hours = Math.floor(dur / 3600);
  let minutes: string | number = Math.floor((dur - hours * 3600) / 60);
  let seconds: string | number = dur % 60;
  if (seconds.toString().length === 1) seconds = '0' + seconds;
  if (hours !== 0) {
    if (minutes.toString().length === 1) minutes = '0' + minutes;
    return ([hours, minutes, seconds]).join(':')
  } else {
    return minutes + ':' + seconds 
  }
}

import type { AudioEventType, RecType, RaagType } from '@/components/AddAudioEvent.vue'

type AudioEventsDataType = {
  infoKeys: string[],
  playingIdx?: number,
  allAudioEvents?: AudioEventType[],
  performers?: string[],
  colHeight: number,
  colWidths: number[],
  showAddEvent: boolean,
  recHeight: number,
  editingId?: string,
  audioSource?: string,
  playing: number[],
  saEstimate?: number,
  saVerified?: boolean,
  audioRecId?: string,
  dropDownWidth: number,
  clickedAE: boolean,
  dropDownLeft: number,
  dropDownTop: number,
  selectedAE?: AudioEventType,
  selectedUserID?: string,
  clickedAF: boolean,
  selectedAF?: RecType,
  userID?: string,
  toggle: string[],
  audioEventId?: string,
  recIdx?: number,
}

export default defineComponent({
  name: 'AudioEvents',
  
  data(): AudioEventsDataType {
    return {
      infoKeys: [
        'Name', 
      ],
      playingIdx: undefined,
      // getAllAudioFileMetaData: getAllAudioFileMetaData,
      allAudioEvents: undefined,
      performers: undefined,
      colHeight: 30,
      colWidths: [100, 180, 150, 80, 100],
      showAddEvent: false,
      recHeight: 30,
      editingId: undefined,
      audioSource: undefined,
      playing: [0, 0],
      saEstimate: undefined,
      saVerified: undefined,
      audioRecId: undefined,
      dropDownWidth: 180,
      clickedAE: false,
      dropDownLeft: 200,
      dropDownTop: 300,
      selectedAE: undefined,
      selectedUserID: undefined,
      clickedAF: false,
      selectedAF: undefined,
      userID: undefined,
      toggle: ['', 'inactive'],
      recIdx: undefined,
      audioEventId: undefined
    }
  },
  components: {
    AddAudioEvent, AudioPlayer
  },

  
  async created() {
    window.addEventListener('keydown', this.handleKeydown);
    if (this.$store.state.userID === undefined) {
      this.$router.push('/')
    }
    this.userID = this.$store.state.userID;
    this.allAudioEvents = await getAllAudioEventMetadata()
  },
  
  beforeUnmount() {
    const audioPlayer = this.$refs.audioPlayer as typeof AudioPlayer;
    audioPlayer.audio.pause()
  },
  
  unmounted() {
    window.removeEventListener('keydown', this.handleKeydown);
  },

  
  methods: {

    async testFromAF() {
      const audioID = this.allAudioEvents![0].recordings[0].audioFileId;
      const userID = this.$store.state.userID!;
      try {
        this.testRes = await getAllTransOfAudioFile(audioID, userID);
      } catch (err) {
        console.log(err)
      }
    },

    resetAddEvent() {
      this.showAddEvent = false;
      this.editingId = undefined;
      this.reset();
    },

    async reset() {
      this.allAudioEvents = await getAllAudioEventMetadata()
    },

    getShorthand(rec: RecType) {
      const out: string[] = [];
      const raagNames = Object.keys(rec.raags);
      raagNames.forEach(rn => {
        const raag = rec.raags[rn];
        const pSecsObj = raag['performance sections'];
        if (pSecsObj === undefined) {
          throw new Error('no pSecsObj')
        }
        out.push(rn, ' - ');
        const pSecs = Object.keys(pSecsObj);
        pSecs.forEach((pSec, i) => {
          out.push(pSec, i !== pSecs.length - 1 ? ', ' : '; ');
        })
      })
      return out.join('')
    },

    handleNewTranscriptionClick() {
      const dropDown = this.$refs.dropDown as HTMLDivElement;
      dropDown.classList.add('closed');
      if (this.selectedAE === undefined) {
        throw new Error('selectedAE is undefined')
      }
      const aeName = this.selectedAE.name;
      if (this.selectedAF === undefined) {
        throw new Error('selectedAF is undefined')
      }
      const afName = this.getShorthand(this.selectedAF);
      this.$router.push({
        name: 'Files',
        query: {
          aeName: JSON.stringify(aeName),
          afName: JSON.stringify(afName)
        }
      })
      this.clickedAE = false;
      this.clickedAF = false
    },

    handleClick() {
      const dropDown = this.$refs.dropDown as HTMLDivElement;
      if (!dropDown.classList.contains('closed')) {
        dropDown.classList.add('closed');
        this.clickedAE = false;
        this.clickedAF = false
      }
    },

    handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        const dropDown = this.$refs.dropDown as HTMLDivElement;
        dropDown.classList.add('closed');
        this.clickedAE = false;
        this.clickedAF = false
      }
    },

    handleEditAEClick() {
      if (this.clickedAE && this.selectedAE !== undefined) {
        this.openEditWindow(this.selectedAE._id);
        const dropDown = this.$refs.dropDown as HTMLDivElement;
        dropDown.classList.add('closed');
        this.clickedAE = false;
        this.clickedAF = false
      }
    },

    handleRightClick(e: MouseEvent) {
      e.preventDefault();
      const dropDown = this.$refs.dropDown as HTMLDivElement;
      if (this.allAudioEvents === undefined) {
        throw new Error('allAudioEvents is undefined')
      }
      if (!dropDown.classList.contains('closed')) {
        dropDown.classList.add('closed');
      } else {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el === null) {
        throw new Error('el is null')
      }
      if (el.classList[0] === 'audioEventNameRow') {
        this.selectedAE = this.allAudioEvents[Number(el.id.slice(2))];
        this.selectedUserID = this.selectedAE.userID;
        this.clickedAE = true;
        this.clickedAF = false;
        this.selectedAF = undefined;
      } else if (el.classList[0] === 'audioRecordingRow') {
        const splits = el.id.split('_');
        const id = splits[0].slice(3);
        this.selectedAE = this.allAudioEvents[Number(id)];
        const selectedAFIdx = splits[1];
        this.selectedAF = this.selectedAE.recordings[Number(selectedAFIdx)];
        this.clickedAE = true;
        this.clickedAF = true
      } else {
        this.clickedAE = false;
        this.clickedAF = false;
        this.selectedAE = undefined;
        this.selectedAF = undefined;
      }
      this.dropDownLeft = e.clientX;
      this.dropDownTop = e.clientY;
      const fileContainer = this.$refs.fileContainer as HTMLDivElement;
      const rect = fileContainer.getBoundingClientRect();
      if (this.dropDownLeft + this.dropDownWidth > rect.width - 20) {
        this.dropDownLeft = rect.width - this.dropDownWidth - 20
      }
      const dropDownRect = dropDown.getBoundingClientRect();
      const dropDownHeight = dropDownRect.height;
      if (this.dropDownTop + dropDownHeight > rect.height - 20) {
        this.dropDownTop = rect.height - dropDownHeight - 20
      }
      dropDown.classList.remove('closed')  
      }
    },
    
    sendAudioSource(e: MouseEvent, 
                    audioEvent: AudioEventType, 
                    aeIdx: number, 
                    recKey: number) {
      const _id = audioEvent.recordings[recKey].audioFileId;
      this.playing = [aeIdx, recKey]
      const playing = document.querySelector('.playing');
      if (playing) playing.classList.remove('playing');
      const target = e.target as HTMLElement;
      if (target === null) {
        throw new Error('target is null')
      }
      target.classList.add('playing');
      const selected = document.querySelector('.selected');
      if (selected) selected.classList.remove('selected');
      const fileContainer = this.$refs.fileContainer as HTMLDivElement;
      const aeRow = fileContainer.children[aeIdx].children[0];
      aeRow.classList.add('selected');
      this.audioSource = `https://swara.studio/audio/mp3/${_id}.mp3`;
      this.audioRecId = _id;
      if (this.allAudioEvents === undefined) {
        throw new Error('allAudioEvents is undefined')
      }
      this.audioEventId = this.allAudioEvents[aeIdx]._id;
      this.recIdx = recKey;
      const rec = this.allAudioEvents[aeIdx].recordings[recKey];
      this.saEstimate = rec.saEstimate;
      this.saVerified = rec.saVerified;
      const audioPlayer = this.$refs.audioPlayer as typeof AudioPlayer;
      audioPlayer.waKey ++;
    },
    
    nextTrack(shuffling: boolean, initial: boolean) {
      const aeIdx = this.playing[0];
      const recKey = this.playing[1];
      const playingElem = document.querySelector('.playing');
      if (playingElem) playingElem.classList.remove('playing');
      const selected = document.querySelector('.selected');
      if (selected) selected.classList.remove('selected');
      if (this.allAudioEvents === undefined) {
        throw new Error('allAudioEvents is undefined')
      }
      const curEvent = this.allAudioEvents[aeIdx];
      const curTotRecs = Object.keys(curEvent.recordings).length;
      let newAeIdx;
      let newRecKey;
      if (!shuffling) {
        if (initial) {
          newAeIdx = 0;
          newRecKey = 0
        } else {
          if (recKey < curTotRecs-1) {
            newAeIdx = aeIdx;
            newRecKey = Number(recKey) + 1
          } else if (aeIdx < this.allAudioEvents.length-1) {
            newAeIdx = Number(aeIdx) + 1;
            newRecKey = 0
          } else {
            newAeIdx = 0;
            newRecKey = 0
          }
        }  
      } else {
        newAeIdx = Math.floor(Math.random() * this.allAudioEvents.length);
        const recs = this.allAudioEvents[newAeIdx].recordings;
        const numRecs = Object.keys(recs).length;
        newRecKey = Math.floor(Math.random() * numRecs);
      }
      const theseRecs = this.allAudioEvents[newAeIdx].recordings;
      const _id = theseRecs[Number(newRecKey)].audioFileId;
      this.audioSource = `https://swara.studio/audio/mp3/${_id}.mp3`;
      const fileContainer = this.$refs.fileContainer as HTMLDivElement;
      const newAEElem = fileContainer.children[newAeIdx];
      const grandChildren = newAEElem.children[1].children[1];
      const newRecElem = grandChildren.children[Number(newRecKey)];
      newRecElem.classList.add('playing')
      const aeRow = fileContainer.children[newAeIdx].children[0];
      aeRow.classList.add('selected');
      this.playing = [newAeIdx, newRecKey]
      
    },
    
    getRaags(recording: RecType) {
      return Object.keys(recording.raags)
    },
    
    getSoloist(recording: RecType) {
      // get soloist _and_ instrument
      const filtered = Object.entries(recording.musicians)
                        .filter(c => c[1].role === 'Soloist');
      let soloist;
      let instrument;
      if (filtered && filtered[0]) {
        soloist = filtered[0][0];
        instrument = recording.musicians[soloist].instrument;
        return soloist + ', ' + instrument
      } else {
        return ''
      }
    },
    
    getPSecs(raag: RaagType) {
      const pSecsObj = raag['performance sections'];
      if (pSecsObj === undefined) {
        throw new Error('pSecsObj is undefined')
      }
      return Object.keys(pSecsObj).join(', ')
    },
    
    toggleAddEvent() {
      this.showAddEvent = !this.showAddEvent
    },
    
    toggleDisplay(t: MouseEvent, audioEvent: AudioEventType, parent: boolean) {
      // console.log(t, audioEvent, parent)
      const preTarget = t.target as HTMLElement;
      const target = parent ? preTarget.children.item(0) : preTarget;
      if (target === null) {
        throw new Error('target is null')
      }
      if (target.className === '') {
        target.className = 'rotated';
        audioEvent.visible = true
      } else {
        target.className = '';
        audioEvent.visible = undefined
      }
    },
    
    getHeight(audioEvent: AudioEventType) {
      let ct = 0;
      if (!audioEvent.recordings) return 0;
      Object.values(audioEvent.recordings).forEach(rec => {
        Object.keys(rec.raags).forEach(() => ct ++)
      });
      return ct
    },
    
    raagHt(audioEvent: AudioEventType, recKey: number) {
      const rec = audioEvent.recordings[recKey];
      return Object.keys(rec.raags).length
    },
    
    openEditWindow(_id: string) {
      this.editingId = _id;
      this.showAddEvent = true
    },
    
    async deleteAE() {
      if (this.selectedAE === undefined) {
        throw new Error('selectedAE is undefined')
      }
      const result = await deleteAudioEvent(this.selectedAE._id);
      console.log(result);
      if (result.deletedCount === 1) {
        const dropDown = this.$refs.dropDown as HTMLDivElement;
        dropDown.classList.add('closed');
        this.allAudioEvents = await getAllAudioEventMetadata()
      }
    }
  }
})
</script>

<style scoped>

.fileContainer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  width: 100%;
  background-color: black;
  background-image: linear-gradient(black, #1e241e);
  color: white;
  user-select: none;
  overflow-y: scroll;
  border-top: 1px solid grey;
}

button {
  margin-left: 20px
}

.addEventRow {
  height: 50px;
  border-bottom: 1px solid black;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.audioEventPopup {
  position: absolute;
  top: 5vh;
  left: 5vw;
  width: 90vw;
  height: 90vh;
  overflow-y: auto;
}

.audioEventRow {
  width: 100%;
  border-bottom: 1px solid black;
}

.audioEventNameRow {
  width: 100%;
  height: 40px;
  border-bottom: 1px solid grey;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  cursor: pointer;
}

.audioEventNameRow > label {
  margin-left: 20px;
  /* width: 500px; */
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.audioEventNameRow > span {
  transition: 0.25s;
  margin-left: 10px;
  cursor: pointer
}

.audioEventNameRow > span.rotated {
  transform: rotate(90deg)
}

.audioRecordingRowOuter {
  width: 100%;
  height: 30px;
  display: flex;
  flex-direction: row;
}

.audioRecordingRow {
  width: 100%;
  height: 30px;
  /* border-bottom: 1px dotted grey; */
  background-color: #202621;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  cursor: pointer
}



.playing {
  background-color: #3e4a40
}

.audioRecordingRow:hover {
  background-color: #2b332c
}

.audioEventNameRow.selected {
  background-color: #2a331e
}

.audioEventNameRow:hover {
  background-color: #181c18
}


.audioRecordingRow > label {
  width: 200px;
  border-right: 1px dotted grey;
}

.audioRecordingRowSpacer {
  width: 20px;
  height: 30px;
  border-right: 1px solid grey;
}

.recordingNum {
  width: 30px;
}

.raagName {
  /* width: 100%; */
  height: 100%;
  overflow-x: auto;
  border-right: 1px dotted grey;
  /* margin-left: 10px; */
  scrollbar-width: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.raagName::-webkit-scrollbar {
  display: none
}

.raagName > span {
  /* display: inline-block; */
  white-space: nowrap;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  height: 100%;
}

.soloist {
  width: 200px;
  padding-left: 10px;
  border-right: 1px dotted grey;
  overflow-x: auto;
  scrollbar-width: none;
  display: flex;
  flex-direction: column;
  align-items: left;
  justify-content: center;
}

.soloist::-webkit-scrollbar {
  display: none
}

.soloist > span {
  white-space: nowrap;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.performanceSections {
  /* width: 100%; */
  /* margin-left: 10px; */
  overflow-x: auto;
  scrollbar-width: none;
  justify-content: left;
  display: flex;
  flex-direction: column;
}

.performanceSections::-webkit-scrollbar {
  display: none
}

.performanceSections > span {
  white-space: nowrap;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.performanceSectionCol {
  width: 250px;
  display: flex;
  flex-direction: column;
  align-items: left;
  justify-content: space-evenly;
  padding-left: 10px;
  padding-right: 10px;
  border-right: 1px dotted grey;
}

.audioRecordingCol {
  display: flex;
  flex-direction: column;
  align-items: left;
  justify-content: space-evenly;
}

.raagNameCol {
  display: flex;
  flex-direction: column;
  align-items: space-evenly;
  justify-content: left;
  width: 160px;
  padding-left: 10px;
}

.playCol {
  width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: left;
}

.height1 {
  height: v-bind(recHeight+'px')
}

.height2 {
  height: v-bind(recHeight*2+'px')
}

.height3 {
  height: v-bind(recHeight*3+'px')
}

.height4 {
  height: v-bind(recHeight*4+'px')
}

.height5 {
  height: v-bind(recHeight*5+'px')
}

.height6 {
  height: v-bind(recHeight*6+'px')
}

.audioRecordingRow * {
  pointer-events: none
}

.audioEventNameRow > label {
  pointer-events: none
}

button {
  background-color: #2f3830;
  color: white;
  cursor: pointer;
  /* border-radius: 8px; */
}

.dropDown {
  position: absolute;
  width: v-bind(dropDownWidth+'px');
  background-color: black;
  left: v-bind(dropDownLeft+'px');
  top: v-bind(dropDownTop+'px');
  border: 1px solid grey;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  user-select: none;
}

.dropDown.closed {
  visibility: hidden;
  opacity: 0;
  transition: visibility 0s 0.15s, opacity 0.15s linear;
}

.dropDownRow {
  color: white;
  border-radius: 5px;
  height: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  padding-left: 8px;
  margin-left: 8px;
  margin-right: 8px;
  margin-top: 6px;
  width: v-bind(dropDownWidth-24+'px')
}

.dropDownRow:hover {
  background-color: blue;
  cursor: pointer
}

.dropDownRow.last {
  margin-bottom: 6px;
}

.dropDownRow.inactive:hover {
  background-color: black;
  cursor: auto;
}

.dropDownRow.inactive {
  color: grey;
}

</style>
