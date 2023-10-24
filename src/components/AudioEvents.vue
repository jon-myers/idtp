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
        <div v-if='ae.recordings !== undefined'>
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
  <ContextMenu
    :x='dropDownLeft'
    :y='dropDownTop'
    :closed='contextMenuClosed'
    :choices='contextMenuChoices'
    />
  
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
import ContextMenu from '@/components/ContextMenu.vue';

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
  dropDownLeft: number,
  dropDownTop: number,
  selectedAE?: AudioEventType,
  selectedUserID?: string,
  selectedAF?: RecType,
  userID?: string,
  toggle: string[],
  audioEventId?: string,
  recIdx?: number,
  contextMenuClosed: boolean,
  contextMenuChoices: { text: string, action: () => void }[],
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
      dropDownLeft: 200,
      dropDownTop: 300,
      selectedAE: undefined,
      selectedUserID: undefined,
      selectedAF: undefined,
      userID: undefined,
      toggle: ['', 'inactive'],
      recIdx: undefined,
      audioEventId: undefined,
      contextMenuClosed: true,
      contextMenuChoices: [],
    }
  },
  components: {
    AddAudioEvent, AudioPlayer, ContextMenu
  },

  
  async created() {
    window.addEventListener('keydown', this.handleKeydown);
    if (this.$store.state.userID === undefined) {
      if (this.$cookies.get('userID') === undefined) {
        this.$router.push('/')
      } else {
        this.userID = this.$cookies.get('userID');
      }
    } else {
      this.userID = this.$store.state.userID;
    }
    
    try {
      this.allAudioEvents = await getAllAudioEventMetadata();
      this.allAudioEvents?.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.log(err)
    }
    
  },
  
  beforeUnmount() {
    const audioPlayer = this.$refs.audioPlayer as typeof AudioPlayer;
    audioPlayer.audio.pause()
  },
  
  unmounted() {
    window.removeEventListener('keydown', this.handleKeydown);
  },

  
  methods: {

    resetAddEvent() {
      this.showAddEvent = false;
      this.editingId = undefined;
      this.reset();
    },

    async reset() {
      this.allAudioEvents = await getAllAudioEventMetadata();
      this.allAudioEvents?.sort((a, b) => a.name.localeCompare(b.name));
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
    },

    handleClick() {
      this.contextMenuClosed = true;
    },

    handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.contextMenuClosed = true;

      }
    },

    async handleRightClick(e: MouseEvent) {
      e.preventDefault();
      this.dropDownLeft = e.clientX;
      this.dropDownTop = e.clientY;
      if (this.allAudioEvents === undefined) {
        throw new Error('allAudioEvents is undefined')
      }
      this.contextMenuClosed = !this.contextMenuClosed;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el === null) {
        throw new Error('el is null')
      }
      this.contextMenuChoices = [];
      if (el.classList[0] === 'audioEventNameRow') {
        this.selectedAE = this.allAudioEvents[Number(el.id.slice(2))];
        this.selectedUserID = this.selectedAE.userID;
        this.selectedAF = undefined;
      } else if (el.classList[0] === 'audioRecordingRow') {
        const splits = el.id.split('_');
        const id = splits[0].slice(3);
        this.selectedAE = this.allAudioEvents[Number(id)];
        const selectedAFIdx = splits[1];
        this.selectedAF = this.selectedAE.recordings[Number(selectedAFIdx)];
      } else {
        this.selectedAE = undefined;
        this.selectedAF = undefined;
      }
      this.contextMenuChoices.push({
        text: 'Add Audio Event',
        action: () => {
          this.toggleAddEvent();
          this.contextMenuClosed = true;
        }
      });
      this.contextMenuChoices.push({
        text: 'Edit Audio Event',
        action: () => {
          this.openEditWindow(this.selectedAE!._id);
          this.contextMenuClosed = true;
        }
      });
      this.contextMenuChoices.push({
        text: 'Delete Audio Event',
        action: () => {
          this.deleteAE();
          this.contextMenuClosed = true;
        }
      })
      if (this.selectedAF !== undefined) {
        this.contextMenuChoices.push({
          text: 'New Transcription',
          action: () => {
            const aeName = this.selectedAE!.name;
            const afName = this.getShorthand(this.selectedAF!);
            this.$router.push({
              name: 'Files',
              query: {
                aeName: JSON.stringify(aeName),
                afName: JSON.stringify(afName)
              }
            })
            this.contextMenuClosed = true;
          }
        });
        try {
          const tChoices = await getAllTransOfAudioFile(
            this.selectedAF.audioFileId, this.$store.state.userID!
          );
          tChoices.forEach(tc => {
            this.contextMenuChoices.push({
              text: `Open file: "${tc.title}" by ${tc.name}`,
              action: () => { 
                this.$store.commit('update_id', tc._id);
                this.$cookies.set('currentPieceId', tc._id);
                this.$router.push({
                  name: 'EditorComponent',
                  query: { id: tc._id }
                })
              }
            })
          })
        } catch (err) {
          console.log(err)
        }

      }
      const fileContainer = this.$refs.fileContainer as HTMLDivElement;
      const rect = fileContainer.getBoundingClientRect();
      if (this.dropDownLeft + this.dropDownWidth > rect.width - 20) {
        this.dropDownLeft = rect.width - this.dropDownWidth - 20
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
        this.allAudioEvents = await getAllAudioEventMetadata();
        this.allAudioEvents?.sort((a, b) => a.name.localeCompare(b.name));
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


</style>
