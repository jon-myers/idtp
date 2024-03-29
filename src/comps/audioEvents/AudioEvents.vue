<template>
  <div class='main' @click='handleClick'>
    <div 
      class='fileContainer' 
      ref='fileContainer' 
      @contextmenu='handleRightClick'>
      <div 
        :class='`audioEventRow ${permissionToViewAE(ae) ? "" : "disabled"}`' 
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
                :class='computeRecClass(ae, Number(recKey))' 
                v-for='recKey in Object.keys(ae.recordings)'
                
                :id='`arr${aeIdx}_${recKey}`'
                :key='ae.recordings[Number(recKey)].audioFileId'
                @dblclick='permissionToViewRec(ae.recordings[Number(recKey)]) ? 
                  sendAudioSource($event, ae, aeIdx, Number(recKey)) : null'>
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
                <div :class='`pSecCol height${raagHt(ae, Number(recKey))}`'>
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
  <AddToCollection
    v-if='addToCollectionModalOpen'
    :possibleCollections='editCols'
    :navHeight='navHeight'
    :recID='selectedAF?.audioFileId'
    :aeID='selectedAE?._id'
    @close='closeCollectionsModal'
    :addType='addType'
    />
  <RemoveFromCollection
    v-if='removeFromCollectionModalOpen'
    :possibleCollections='addType === "audioEvent" ? 
      aeRemovableCols : 
      recRemovableCols'
    :navHeight='navHeight'
    :recID='selectedAF?.audioFileId'
    :aeID='selectedAE!._id'
    @close='closeCollectionsModal'
    :removeType='addType'
    />
    <PermissionsModal
      v-if='selectedAE !== undefined && 
        selectedAE.explicitPermissions !== undefined && 
        permissionsModalOpen'
      :navHeight='navHeight'
      :explicitPermissions='selectedAE.explicitPermissions'
      :artifactType='"audioEvent"'
      :artifactID='selectedAE._id'
      @close='handleClosePermissionsModal'
      />
  
</template>
<script lang='ts'>
import { 
  getAllAEMetadata, 
  deleteAudioEvent,
  getAllTransOfAudioFile,
  getEditableCollections,
} from '@/js/serverCalls.ts';
import AddAudioEvent from '@/comps/audioEvents/AddAudioEvent.vue';
import AudioPlayer from '@/comps/audioEvents/AudioPlayer.vue';
import { defineComponent } from 'vue';
import ContextMenu from '@/comps/ContextMenu.vue';
import AddToCollection from '@/comps/AddToCollection.vue';
import RemoveFromCollection from '@/comps/RemoveFromCollection.vue';
import PermissionsModal from '@/comps/PermissionsModal.vue'; 

import { 
  ContextMenuOptionType, 
  CollectionType,
  AudioEventType, 
  RecType, 
  RaagType  
} from '@/ts/types.ts';

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
  contextMenuChoices: ContextMenuOptionType[],
  editCols: CollectionType[],
  aeRemovableCols: CollectionType[],
  recRemovableCols: CollectionType[],
  addToCollectionModalOpen: boolean,
  removeFromCollectionModalOpen: boolean,
  permissionsModalOpen: boolean,
  addType: "audioEvent" | "recording" | "transcription",
}

export default defineComponent({
  name: 'AudioEvents',
  
  data(): AudioEventsDataType {
    return {
      infoKeys: [
        'Name', 
      ],
      playingIdx: undefined,
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
      editCols: [],
      aeRemovableCols: [],
      recRemovableCols: [],
      addToCollectionModalOpen: false,
      removeFromCollectionModalOpen: false,
      permissionsModalOpen: false,
      addType: 'audioEvent'
    }
  },
  components: {
    AddAudioEvent, 
    AudioPlayer, 
    ContextMenu, 
    AddToCollection, 
    RemoveFromCollection,
    PermissionsModal
  },

  props: {
    navHeight: {
      type: Number,
      required: true
    },
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
      this.allAudioEvents = await getAllAEMetadata();
      this.allAudioEvents?.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.log(err)
    }
  },

  async mounted() {
    try {
      this.editCols = await getEditableCollections(this.$store.state.userID!)
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

    computeRecClass(ae: AudioEventType, recKey: number) {
      const rec = ae.recordings[recKey];
      const baseClass = 'audioRecordingRow';
      const heightclass = `height${this.raagHt(ae, Number(recKey))}`;
      const disabledClass = this.permissionToViewRec(rec) ? '' : 'disabled';
      return `${baseClass} ${heightclass} ${disabledClass}`;
    },

    permissionToViewRec(recording: RecType) {
      const ep = recording.explicitPermissions!;
      const id = this.$store.state.userID!;
      return ep.publicView || 
        ep.view.includes(id) || 
        ep.edit.includes(id) ||
        recording.userID === id
    },

    permissionToEditRec(recording: RecType) {
      const ep = recording.explicitPermissions!;
      const id = this.$store.state.userID!;
      return ep.edit.includes(id) || recording.userID === id
    },

    permissionToViewAE(audioEvent: AudioEventType) {
      const ep = audioEvent.explicitPermissions!;
      const id = this.$store.state.userID!;
      return ep.publicView || 
        ep.view.includes(id) || 
        ep.edit.includes(id) ||
        audioEvent.userID === id
    },

    permissionToEditAE(audioEvent: AudioEventType) {
      const ep = audioEvent.explicitPermissions!;
      const id = this.$store.state.userID!;
      return ep.edit.includes(id) || audioEvent.userID === id
    },

    async handleClosePermissionsModal() {
      this.permissionsModalOpen = false;
      try {
        this.allAudioEvents = await getAllAEMetadata();
        this.allAudioEvents?.sort((a, b) => a.name.localeCompare(b.name));
        this.editCols = await getEditableCollections(this.$store.state.userID!)

      } catch (err) {
        console.log(err)
      }
    },

    async closeCollectionsModal() {
      this.addToCollectionModalOpen = false;
      this.removeFromCollectionModalOpen = false;
      try {
        this.allAudioEvents = await getAllAEMetadata();
        this.allAudioEvents?.sort((a, b) => a.name.localeCompare(b.name));
        this.editCols = await getEditableCollections(this.$store.state.userID!)

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
      this.allAudioEvents = await getAllAEMetadata();
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
      const userID = this.$store.state.userID!;
      const aeEditPermission = this.selectedAE && (
          this.selectedAE.userID === userID ||
          this.selectedAE.explicitPermissions?.edit.includes(userID)
      )
      const aeViewPermission = this.selectedAE && (
          this.selectedAE.userID === userID ||
          this.selectedAE.explicitPermissions!.view.includes(userID) ||
          this.selectedAE.explicitPermissions!.publicView ||
          this.selectedAE.explicitPermissions!.edit.includes(userID)
      )
      const aeOwner = this.selectedAE && this.selectedAE.userID === userID;

      const afEditPermission = this.selectedAE && this.selectedAF && (
          this.selectedAF.userID === userID ||
          this.selectedAF.explicitPermissions!.edit.includes(userID)
      );
      const afViewPermission = this.selectedAE && this.selectedAF &&
        (this.selectedAF.userID === userID ||
          this.selectedAF.explicitPermissions!.view.includes(userID) ||
          this.selectedAF.explicitPermissions!.publicView ||
          this.selectedAF.explicitPermissions!.edit.includes(userID)
        );

      this.contextMenuChoices.push({
        text: 'Add Audio Event',
        action: () => {
          this.toggleAddEvent();
          this.contextMenuClosed = true;
        },
        enabled: true
      });
      this.contextMenuChoices.push({
        text: 'Edit Audio Event',
        action: () => {
          console.log('edit audio event')
          this.openEditWindow(this.selectedAE!._id);
          this.contextMenuClosed = true;
        },
        enabled: aeEditPermission
        
      });
      this.contextMenuChoices.push({
        text: 'Delete Audio Event',
        action: () => {
          this.deleteAE();
          this.contextMenuClosed = true;
        },
        enabled: aeOwner
      });
      this.contextMenuChoices.push({
        text: 'Edit Permissions',
        action: () => {
          this.permissionsModalOpen = true;
          this.contextMenuClosed = true;
        },
        enabled: aeOwner
      });
      if (this.editCols.length > 0) {
        this.contextMenuChoices.push({
          text: 'Add Event to Collection',
          action: () => {
            this.addToCollectionModalOpen = true;
            
            this.contextMenuClosed = true;
          },
          enabled: aeViewPermission
        });
        this.aeRemovableCols = this.editCols.filter(c => {
          if (this.selectedAE === undefined) {
            throw new Error('selectedAE is undefined')
          }
          return c.audioEvents.includes(this.selectedAE._id!)
        });
        if (this.aeRemovableCols.length > 0) {
          this.contextMenuChoices.push({
            text: 'Remove Event from Collection',
            action: () => {
              this.removeFromCollectionModalOpen = true;
              this.contextMenuClosed = true;
            },
            enabled: true
          })
        }
      }
      
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
          },
          enabled: afViewPermission
        });
        if (this.editCols.length > 0) {
          this.contextMenuChoices.push({
            text: 'Add Recording to Collection',
            action: () => {
              this.addType = 'recording';
              this.addToCollectionModalOpen = true;
              this.contextMenuClosed = true;
            },
            enabled: afViewPermission
          });
          this.recRemovableCols = this.editCols.filter(c => {
            if (this.selectedAF === undefined) {
              throw new Error('selectedAF is undefined')
            }
            return c.audioRecordings.includes(this.selectedAF.audioFileId)
          });
          if (this.recRemovableCols.length > 0) {
            this.contextMenuChoices.push({
              text: 'Remove Recording from Collection',
              action: () => {
                this.addType = 'recording';
                this.removeFromCollectionModalOpen = true;
                this.contextMenuClosed = true;
              },
              enabled: true
            })
          }
        }
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
        if (Object.keys(rec.raags).length === 0) ct ++;
      });
      return ct
    },
    
    raagHt(audioEvent: AudioEventType, recKey: number) {
      const rec = audioEvent.recordings[recKey];
      let len = rec.raags ? Object.keys(rec.raags).length: 1;
      return len === 0 ? 1 : len
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
        this.allAudioEvents = await getAllAEMetadata();
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

.audioEventRow.disabled {
  color: grey;
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
  cursor: pointer;
  color: white;
}

.audioRecordingRow.disabled {
  color: grey;
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

.pSecCol {
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
  border-right: 1px dotted grey;
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
