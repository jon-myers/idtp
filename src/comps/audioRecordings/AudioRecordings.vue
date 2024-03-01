<template>
  <div class='main' @click='handleClick'>
    <div 
      class='labelRow'
      >
      <div 
        class='metadataLabels' 
        v-for='(field, fIdx) in mdFields'
        :style='{
          "width": colWidths[fIdx] + "px",
          "max-width": fIdx === mdFields.length - 2 ? 
            "" : 
            colWidths[fIdx] + "px",
          "min-width": colWidths[fIdx] + "px",
          "flex-grow": fIdx === mdFields.length - 2 ? 1 : 0,
          "position": "relative" 
          }'
        >
        <span class='field'>
          {{ field.name }}
          <span 
            v-if='field.sortType !== undefined'
            :class='`sortTriangle ${field.sortState}`'
            @click='toggleSort(fIdx)'
            :style='{
              "color": fIdx === selectedSortIdx ? "white" : "black",
            }'
            >
            &#9654;
          </span>
        </span>
        
        <div
          v-if='fIdx !== mdFields.length - 1'
          class='draggableBorder'
          draggable='true'
          @dragstart='handleDragStart(fIdx, $event)'
          @drag='handleDrag(fIdx, $event)'
          @dragend='handleDragEnd(fIdx, $event)'
          >
        </div>
      </div>
    </div>
    <div 
      class='fileContainer'
      @contextmenu='handleRightClick'
      ref='fileContainer'
      >
      <div 
        :class='`recordingRow ${[canView(recording) ? "" : "disabled"]}`'
        v-for='(recording, rIdx) in allRecordings'
        @dblclick='canView(recording) ? 
          sendAudioSource($event, recording) : 
          null'
        :id='`recRow${rIdx}`'
        >
        <div 
          class='metadataLabels' 
          v-for='(field, fIdx) in mdFields'
          :style='{ 
            "width": colWidths[fIdx] + "px", 
            "max-width": fIdx === mdFields.length - 2 ? 
              "" : 
              colWidths[fIdx] + "px",
            "min-width": colWidths[fIdx] + "px",
            "flex-grow": fIdx === mdFields.length - 2 ? 1 : 0 
            }'
          >
          <span class='field'>{{ field.func(recording) }}</span>
          <div 
            class='draggableBorder'
            draggable='true'
            @dragstart='handleDragStart(fIdx, $event)'
            @drag='handleDrag(fIdx, $event)'
            @dragend='handleDragEnd(fIdx, $event)'
            >
          </div>
        </div>
       
      </div>
    </div>
    <AudioPlayer 
      :audioSource='audioSource'
      :saEstimate='saEstimate'
      :saVerified='saVerified'
      :id='audioRecId'
      ref='audioPlayer'
      @emitNextTrack='nextTrack'
    />
  </div>
  <ContextMenu
    :x='dropDownLeft'
    :y='dropDownTop'
    :closed='contextMenuClosed'
    :choices='contextMenuChoices'
    />
  <UploadRecording 
    v-if='!uploadRecModalClosed'
    :navHeight='navHeight'
    :frameView='recModalFrame'
    :recId='editingRecId'  
    @closeModal='handleCloseRecModal'
    @updateFrameView='newVal => recModalFrame = newVal'
    @updateEditingRecId='newVal => editingRecId = newVal'
  />
  <AddToCollection 
    v-if='!addToCollectionModalClosed && selectedRecording'
    :possibleCollections='possibleCols'
    :navHeight='navHeight'
    :recID='selectedRecording._id!'
    addType='recording'
    @close='addToCollectionModalClosed = true'
  />
  <RemoveFromCollection
    v-if='!removeFromCollectionModalClosed && selectedRecording'
    :possibleCollections='removableCols'
    :navHeight='navHeight'
    :recID='selectedRecording._id!'
    removeType='recording'
    @close='removeFromCollectionModalClosed = true'
  />
  <PermissionsModal
    v-if='!permissionsModalClosed && artifactID && selectedRecording &&
      selectedRecording.explicitPermissions'
    :navHeight='navHeight'
    :artifactID='artifactID'
    :explicitPermissions='selectedRecording.explicitPermissions'
    artifactType='audioRecording'
    @close='handleClosePermissionsModal'
    />

</template>

<script lang='ts'>
import { defineComponent } from 'vue';
import AudioPlayer from '@/comps/audioRecordings/ARAudioPlayer.vue';
import ContextMenu from '@/comps/ContextMenu.vue';
import UploadRecording from '@/comps/audioRecordings/UploadRecording.vue';
import AddToCollection from '@/comps/AddToCollection.vue';
import RemoveFromCollection from '@/comps/RemoveFromCollection.vue';
import { 
  getAllAudioRecordingMetadata, 
  getSortedMusicians,
  getAllTransOfAudioFile,
  deleteRecording,
  getEditableCollections
} from '@/js/serverCalls.ts';
import { displayTime } from '@/ts/utils.ts';
import { 
  CollectionType, 
  ContextMenuOptionType,
  RecType
} from '@/ts/types.ts';
import PermissionsModal from '@/comps/PermissionsModal.vue';

type AudioRecordingsDataType = {
  audioSource: string | undefined,
  saEstimate: number | undefined,
  saVerified: boolean | undefined,
  audioRecId: string | undefined,
  allRecordings: RecType[],
  mdFields: { 
    'name': string,
    'func': (rec: RecType) => string | string[],
    'sortState': 'down' | 'up',
    'sortType'?: string
  }[],
  colWidths: number[],
  initialMouseX?: number,
  initialWidths: number[],
  mincolWidths: number[],
  allMusicians?: { 
    'First Name'?: string,
    'Last Name'?: string,
    'Initial Name': string,
    'Middle Name'?: string,
  }[],
  selectedSortIdx: number,
  activeRecording: RecType | undefined,
  contextMenuClosed: boolean,
  contextMenuChoices: ContextMenuOptionType[],
  userID: string | undefined,
  dropDownLeft: number,
  dropDownTop: number,
  dropDownWidth: number,
  labelRowHeight: number,
  dropDownHeight: number,
  uploadRecModalClosed: boolean,
  possibleCols: CollectionType[],
  removableCols: CollectionType[],
  addToCollectionModalClosed: boolean,
  removeFromCollectionModalClosed: boolean,
  selectedRecording: RecType | undefined,
  recModalFrame: 'uploadRec' | 'editRecMetadata',
  editingRecId?: string,
  permissionsModalClosed: boolean,
  artifactID: string | undefined,
  

}

export default defineComponent({
  name: 'AudioRecordings',
  
  data(): AudioRecordingsDataType {
    return {
      audioSource: undefined,
      saEstimate: undefined,
      saVerified: undefined,
      audioRecId: undefined,
      allMusicians: undefined,
      allRecordings: [],
      activeRecording: undefined,
      mdFields: [
        { 
          'name': 'Soloist', 
          'func': (rec: RecType) => {
            const keys = Object.keys(rec.musicians).filter(key => {
              return rec.musicians[key].role === 'Soloist';
            });
            if (keys.length > 0) {
              return keys[0];
            } else {
              return 'Unknown';
            }         
          },
          'sortState': 'down',
          'sortType': 'soloist'
        },
        {
          'name': 'Raag',
          'func': (rec: RecType) => {
            return Object.keys(rec.raags).join(', ');
          },
          'sortState': 'down',
          'sortType': 'raag'
        },
        {
          'name': 'Performance Section',
          'func': (rec: RecType) => {
            const raags = Object.keys(rec.raags);
            return raags.map(raag => {
              if (rec.raags[raag]['performance sections']) {
                return Object.keys(rec.raags[raag]['performance sections']!);
              } else {
                return []; 
              }
            }).flat().join(', ');
          },
          'sortState': 'down',
          'sortType': 'pSec'
        },
        {
          'name': 'Duration',
          'func': (rec: RecType) => {
            return displayTime(rec.duration);
          },
          'sortState': 'down',
          'sortType': 'duration'
        },
        {
          'name': 'Audio Event',
          'func': (rec: RecType) => {
            return rec.parentTitle !== undefined ? rec.parentTitle : 'None';
          },
          'sortState': 'down',
          'sortType': 'audioEvent'
        },
        {
          'name': 'Track #',
          'func': (rec: RecType) => {
            return rec.parentTrackNumber !== undefined ? rec.parentTrackNumber : 'None';
          },
          'sortState': 'down',
          'sortType': undefined
        }      
      ],
      colWidths: [200, 180, 180, 80, 400, 80],
      initialWidths: [200, 180, 180, 80, 400, 80],
      mincolWidths: [90, 80, 190, 100, 130, 80],
      selectedSortIdx: 0,
      contextMenuClosed: true,
      contextMenuChoices: [],
      userID: undefined,
      dropDownLeft: 200,
      dropDownTop: 300,
      dropDownWidth: 180,
      labelRowHeight: 40,
      dropDownHeight: 30,
      uploadRecModalClosed: true,
      addToCollectionModalClosed: true,
      removeFromCollectionModalClosed: true,
      possibleCols: [],
      removableCols: [],
      selectedRecording: undefined,
      recModalFrame: 'uploadRec',
      permissionsModalClosed: true,
      artifactID: undefined,
    }
  },

  components: { 
    AudioPlayer, 
    ContextMenu, 
    UploadRecording, 
    AddToCollection,
    RemoveFromCollection,
    PermissionsModal
  },

  props: {
    navHeight: {
      type: Number,
      required: true
    }
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
      this.allRecordings = await getAllAudioRecordingMetadata();
      this.allMusicians = await getSortedMusicians(true) as { 
        'First Name'?: string,
        'Last Name'?: string,
        'Initial Name': string,
        'Middle Name'?: string,
      }[];
    } catch (err) {
      console.log(err);
    }
    
  },

  beforeUnmount() {
    const audioPlayer = this.$refs.audioPlayer as typeof AudioPlayer;
    audioPlayer.audio.pause();
    window.removeEventListener('keydown', this.handleKeydown);
  },
  
  mounted() {
    this.resetWidths();
    // add event listener to resize columns when window is resized
    window.addEventListener('resize', this.resetWidths);
    
  },

  unmounted() {
    window.removeEventListener('resize', this.resetWidths);
  },
  
  computed: {
  },
  
  methods: {

    canView(recording: RecType) {
      const ep = recording.explicitPermissions!;
      return (
        ep!.view.includes(this.userID!) ||
        ep!.edit.includes(this.userID!) ||
        ep!.publicView ||
        recording.userID === this.userID
      );
    },

    permissiontoEdit(recording: RecType) {
      const ep = recording.explicitPermissions!;
      return (
        ep!.edit.includes(this.userID!) ||
        recording.userID === this.userID
      );
    },

    async handleClosePermissionsModal() {
      this.permissionsModalClosed = true;
      try {
        this.allRecordings = await getAllAudioRecordingMetadata();
        this.toggleSort(this.selectedSortIdx, true);
      } catch (err) {
        console.log(err);
      }
    },

    async handleCloseRecModal() {
      this.uploadRecModalClosed = true;
      try {
        this.allRecordings = await getAllAudioRecordingMetadata();
        this.toggleSort(this.selectedSortIdx, true);
      } catch (err) {
        console.log(err);
      }
    },

    resetWidths() {
      const summedWidths = this.colWidths.reduce((a, b) => a + b, 0);
      const ratio = window.innerWidth / summedWidths;
      this.colWidths = this.colWidths.map(width => width * ratio);
      this.initialWidths = this.colWidths.slice();
      this.ensureMinWidths();
    },

    nextTrack(shuffling: boolean, initial: boolean) {

      if (this.activeRecording) {
        const playingElem = document.querySelector('.playing');
        if (playingElem) playingElem.classList.remove('playing');
        if (!shuffling) {
          const curIdx = this.allRecordings.findIndex(rec => {
            return rec._id === this.activeRecording!._id;
          });
          const nextIdx = (curIdx + 1) % this.allRecordings.length;
          this.activeRecording = this.allRecordings[nextIdx];
          const nextElem = document.getElementById(`recRow${nextIdx}`);
          if (nextElem) nextElem.classList.add('playing');
          const id = this.activeRecording._id;
          this.audioSource = `Https://swara.studio/audio/mp3/${ id }.mp3`;
        } else {
          if (initial) {
            const idx = Math.floor(Math.random() * this.allRecordings.length);
            this.activeRecording = this.allRecordings[idx];
            const elem = document.getElementById(`recRow${idx}`);
            if (elem) elem.classList.add('playing');
            const id = this.activeRecording._id;
            this.audioSource = `Https://swara.studio/audio/mp3/${ id }.mp3`;
          } else {
            const curIdx = this.allRecordings.findIndex(rec => {
              return rec._id === this.activeRecording!._id;
            });
            let nextIdx = Math.floor(Math.random() * this.allRecordings.length);
            while (nextIdx === curIdx) {
              nextIdx = Math.floor(Math.random() * this.allRecordings.length);
            }
            this.activeRecording = this.allRecordings[nextIdx];
            const nextElem = document.getElementById(`recRow${nextIdx}`);
            if (nextElem) nextElem.classList.add('playing');
            const id = this.activeRecording._id;
            this.audioSource = `Https://swara.studio/audio/mp3/${ id }.mp3`;
          }
        
        }
      } else {
        if (!shuffling) {
          this.activeRecording = this.allRecordings[0];
          const elem = document.getElementById('recRow0');
          if (elem) elem.classList.add('playing');
          const id = this.activeRecording._id;
          this.audioSource = `Https://swara.studio/audio/mp3/${ id }.mp3`;
        } else {
          const idx = Math.floor(Math.random() * this.allRecordings.length);
          this.activeRecording = this.allRecordings[idx];
          const elem = document.getElementById(`recRow${idx}`);
          if (elem) elem.classList.add('playing');
          const id = this.activeRecording._id;
          this.audioSource = `Https://swara.studio/audio/mp3/${ id }.mp3`;
        
        }
      }
    },

    handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.contextMenuClosed = true;
      }
    },

    handleClick() {
      this.contextMenuClosed = true;
    },

    async handleRightClick(e: MouseEvent) {
      e.preventDefault();
      this.dropDownLeft = e.clientX;
      this.dropDownTop = e.clientY;
      this.contextMenuClosed = !this.contextMenuClosed;
      const fileContainer = this.$refs.fileContainer as HTMLElement;
      const rect = fileContainer.getBoundingClientRect();
      if (this.dropDownLeft + this.dropDownWidth > rect.width - 20) {
        this.dropDownLeft = rect.width - 30 - this.dropDownWidth;
      }

      let el = document.elementFromPoint(e.clientX, e.clientY);
      
      if (el) {
        if (el.classList.contains('metadataLabels')) {
          el = el.parentElement!;
        } else if (el.classList.contains('field')) {
          el = el.parentElement!.parentElement!;
        } else if (el.classList.contains('draggableBorder')) {
          el = el.parentElement!;
        }
        const recording = this.allRecordings[parseInt(el.id.slice(6))];
        const ep = recording.explicitPermissions!;
        const editPermission = recording !== undefined && (
          ep!.edit.includes(this.userID!) ||
          recording.userID === this.userID
        );
        const viewPermission = recording !== undefined && (
          ep!.view.includes(this.userID!) ||
          ep!.edit.includes(this.userID!) ||
          ep!.publicView ||
          recording.userID === this.userID
        );
        const owner = recording !== undefined && (
          recording.userID === this.userID
        ); 
        this.contextMenuChoices = [];
        this.contextMenuChoices.push({
          text: 'New Transcription',
          action: () => {
            let query: {
              aeName?: string,
              afName?: string,
              recID?: string
            } = {
              aeName: JSON.stringify(recording.parentTitle),
              afName: JSON.stringify(this.getShorthand(recording)),
            }
            if (recording.parentTitle === null) {
              query.recID = recording._id;
            }
            this.$router.push({
              name: 'Transcriptions',
              query
            })
            this.contextMenuClosed = true;
          },
          enabled: viewPermission
          
        });

        // options to edit recording, delete recording, and upload new recording
        this.contextMenuChoices.push({
          text: 'Edit Recording',
          action: () => {
            this.openRecordingModal({ editing: true, recId: recording._id })
            this.contextMenuClosed = true;
          },
          enabled: editPermission
        });
        this.contextMenuChoices.push({
          text: 'Edit Permissions',
          action: () => {
            this.artifactID = recording._id!;
            this.permissionsModalClosed = false;
            this.contextMenuClosed = true;
            this.selectedRecording = recording
          },
          enabled: owner
        })
        this.contextMenuChoices.push({
          text: 'Delete Recording',
          action: async () => {
            
            this.contextMenuClosed = true;
            try { 
              await deleteRecording(recording._id!);
              this.allRecordings = await getAllAudioRecordingMetadata();
              this.toggleSort(this.selectedSortIdx, true);
            } catch (err) {
              console.log(err); 
            }
          },
          enabled: owner
        });
        this.contextMenuChoices.push({
          text: 'Upload New Recording',
          action: () => {
            this.recModalFrame = 'uploadRec';
            this.openUploadModal();
            this.contextMenuClosed = true;
          },
          enabled: true
        });

        try {
          // show option to add to collection, if there are any avaliable to
          // the user
          const userID = this.$store.state.userID!;
          this.possibleCols = await getEditableCollections(userID);
          if (this.possibleCols.length > 0) {
            this.contextMenuChoices.push({
              text: 'Add to Collection',
              action: () => {

                this.selectedRecording = recording;
                this.contextMenuClosed = true;
                this.addToCollectionModalClosed = false;
              },
              enabled: viewPermission
            });

            this.removableCols = this.possibleCols.filter(col => {
              return col.audioRecordings.includes(recording._id!);
            })
            if (this.removableCols.length > 0) {
              this.contextMenuChoices.push({
                text: 'Remove from Collection',
                action: () => {
                  this.selectedRecording = recording;
                  this.contextMenuClosed = true;
                  this.removeFromCollectionModalClosed = false;
                  
                },
                enabled: true
              })
            }
          }

          const tChoices = await getAllTransOfAudioFile(
            recording._id!, 
            this.userID!
          );
          tChoices.forEach(tc => {
            this.contextMenuChoices.push({
              text: `Open file: "${tc.title}" by ${tc.name}`,
              action: () => {
                this.$store.commit('update_id', tc._id);
                this.$cookies.set('currentPieceID', tc._id);
                this.$router.push({
                  name: 'EditorComponent',
                    query: { id: tc._id }
                })
              },
              enabled: true
            })
          })
          this.dropDownHeight = this.contextMenuChoices.length * 30;
          const topPartHeight = rect.height + rect.top;
          if (this.dropDownTop + this.dropDownHeight > topPartHeight - 10) {
            this.dropDownTop = topPartHeight - 10 - this.dropDownHeight;
          }
        } catch (err) {
          console.log(err);
        }
      }
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

    handleDragStart(fIdx: number, event: DragEvent) {
      // Store the initial mouse position and column widths
      // event.preventDefault();
      this.initialMouseX = event.clientX;
      this.initialWidths = this.colWidths.slice()
      // make cursor resize until drag end
      document.body.style.cursor = 'col-resize';
    },

    handleDrag(fIdx: number, event: DragEvent) {
      const nextCol = fIdx < this.colWidths.length - 1;
      // Calculate the new width based on the mouse movement
      document.body.style.cursor = 'col-resize';
        if (event.clientX !== 0) {
          const deltaX = event.clientX - this.initialMouseX!;
          const initW = this.initialWidths[fIdx]!;
          const nextInitW = this.initialWidths[fIdx + 1]!;
          const nextMinW = this.mincolWidths[fIdx + 1]!;
          if (initW + deltaX < this.mincolWidths[fIdx]!) {
            return;
            
          } else if (nextCol && (initW - deltaX < nextMinW)) {
            return
          } else {
            this.colWidths[fIdx] = initW + deltaX;
            if (nextCol) {
              this.colWidths[fIdx + 1] = nextInitW - deltaX;
            }
          }
      }
    },
    handleDragEnd(fIdx: number, event: DragEvent) {
      document.body.style.cursor = 'auto';
      const nextCol = fIdx < this.colWidths.length - 1;
      const deltaX = event.clientX - this.initialMouseX!;
      const nextMinCW = this.mincolWidths[fIdx + 1];
      if (this.initialWidths[fIdx] + deltaX < this.mincolWidths[fIdx]) {
        return;
      } else if (nextCol && this.initialWidths[fIdx + 1] - deltaX < nextMinCW) {
        return
      } else {
        this.colWidths[fIdx] = this.initialWidths[fIdx] + deltaX;
        if (nextCol) {
          this.colWidths[fIdx + 1] = this.initialWidths[fIdx + 1] - deltaX;
        }  
      } 
    },

    ensureDurationWidth() {
      // ensure duration column is wide enough to display duration label
      const minWidth = 100;
      const idx = this.mdFields.findIndex(field => {
        return field.name === 'Duration';
      });
      const audioEventIdx = this.mdFields.findIndex(field => {
        return field.name === 'Audio Event';
      });
      if (this.colWidths[idx] < minWidth) {
        const extra = minWidth - this.colWidths[idx];
        this.colWidths[idx] = minWidth;
        this.colWidths[audioEventIdx] -= extra;
      }
    },

    ensureMinWidths() {
      this.colWidths.forEach((width, idx) => {
        if (width < this.mincolWidths[idx]) {
          const diff = this.mincolWidths[idx] - width;
          this.colWidths[idx] += diff;
          if (idx < this.colWidths.length - 1) {
            this.colWidths[idx + 1] -= diff;
          } else {
            this.colWidths[0] -= diff;
          }
        }
      })
    },

    toggleSort(fIdx: number, ensureCurrentState: boolean = false) {
      const field = this.mdFields[fIdx];
      if (this.selectedSortIdx === fIdx) {
        if (
          (field.sortState === 'down' && !ensureCurrentState) || 
          (field.sortState === 'up' && ensureCurrentState)
          ) {
          field.sortState = 'up';
          this.sortRecordings({ sort: field.sortType, fromTop: false });
        } else {
          field.sortState = 'down';
          this.sortRecordings({ sort: field.sortType, fromTop: true });
        }
      } else {
        this.sortRecordings({ 
          sort: field.sortType, 
          fromTop: field.sortState === 'down' 
        });
      }

      this.selectedSortIdx = fIdx;
    },

    eventSorter(a: RecType, b: RecType) {
      const apt = a.parentTitle;
      const bpt = b.parentTitle;
      const aptUndefined = apt === undefined || apt === null;
      const bptUndefined = bpt === undefined || bpt === null;
      if (aptUndefined && bptUndefined) {
        return 0;
      } else if (aptUndefined && !bptUndefined) {
        return 1;
      } else if (!aptUndefined && bptUndefined) {
        return -1;
      } else {
        const aTitleLower = apt ? apt.toLowerCase() : '';
        const bTitleLower = bpt? bpt.toLowerCase() : '';

        if (aTitleLower < bTitleLower) {
          return -1;
        } else if (aTitleLower > bTitleLower) {
          return 1;
        } else {
          return 0;
        }
      }
    },

    durSorter(a: RecType, b: RecType) {
      if (a.duration > b.duration) {
        return -1;
      } else if (a.duration < b.duration) {
        return 1;
      } else {
        return 0;
      }
    },

    pSecSorter(a: RecType, b: RecType) {
      const aPSec = Object.keys(a.raags).map(raag => {
        if (a.raags[raag]['performance sections']) {
          return Object.keys(a.raags[raag]['performance sections']!);
        } else {
          return []; 
        }
      }).flat()[0];
      const bPSec = Object.keys(b.raags).map(raag => {
        if (b.raags[raag]['performance sections']) {
          return Object.keys(b.raags[raag]['performance sections']!);
        } else {
          return []; 
        }
      }).flat()[0];
      if (aPSec === undefined && bPSec === undefined) {
        return 0;
      } else if (aPSec === undefined && bPSec !== undefined) {
        return 1;
      } else if (aPSec !== undefined && bPSec === undefined) {
        return -1;
      } else if (aPSec === 'undefined') {
        if (bPSec === 'undefined') {
          return 0
        } else if (bPSec === undefined) {
          return -1;
        } else {
          return 1;
        }
      } else if (bPSec === 'undefined') {
        if (aPSec === undefined) {
          return 1;
        } else {
          return -1;
        }
      } else if (aPSec === 'Unknown') {
        if (bPSec === 'Unknown') {
          return 0;
        } else if (bPSec === undefined || bPSec === 'undefined') {
          return -1;
        } else {
          return 1;
        }
      } else if (bPSec === 'Unknown') {
        if (aPSec === undefined || aPSec === 'undefined') {
          return 1;
        } else {
          return -1;
        }
      
      } else {
        if (aPSec < bPSec) {
          return -1;
        } else if (aPSec > bPSec) {
          return 1;
        } else {
          return 0;
        }
      }
    },

    raagSorter(a: RecType, b: RecType) {
      const aRaag = Object.keys(a.raags)[0];
      const bRaag = Object.keys(b.raags)[0];
      if (aRaag === undefined && bRaag === undefined) {
        return 0;
      } else if (aRaag === undefined && bRaag !== undefined) {
        return 1;
      } else if (aRaag !== undefined && bRaag === undefined) {
        return -1;
      } else if (aRaag === 'undefined') {
        if (bRaag === 'undefined') {
          return 0
        } else if (bRaag === undefined) {
          return -1;
        } else {
          return 1;
        }
      } else if (bRaag === 'undefined') {
        if (aRaag === undefined) {
          return 1;
        } else {
          return -1;
        }
      } else if (aRaag === 'Unknown') {
        if (bRaag === 'Unknown') {
          return 0;
        } else if (bRaag === undefined || bRaag === 'undefined') {
          return -1;
        } else {
          return 1;
        }
      } else if (bRaag === 'Unknown') {
        if (aRaag === undefined || aRaag === 'undefined') {
          return 1;
        } else {
          return -1;
        }
      
      } else {
        if (aRaag < bRaag) {
          return -1;
        } else if (aRaag > bRaag) {
          return 1;
        } else {
          return 0;
        }
      }
    },

    trackNumSorter(a: RecType, b: RecType) {
      const ptn = (rec: RecType) => rec.parentTrackNumber;
      if (ptn(a) === undefined && ptn(b) === undefined) {
        return 0;
      } else if (ptn(a) === undefined && ptn(b) !== undefined) {
        return 1;
      } else if (ptn(a) !== undefined && ptn(b) === undefined) {
        return -1;
      } else {
        if (ptn(a)! < ptn(b)!) {
          return -1;
        } else if (ptn(a)! > ptn(b)!) {
          return 1;
        } else {
          return 0;
        }
      }
    },

    soloistSorter(a: RecType, b: RecType) {
      // get last name by looking up soloist in allMusicians array,
      // then sort by last name, then first name, then middle name. If there 
      // is no last name, put after all other last names. If solist is Unknown,
      // put at the end
      const aSoloist = Object.keys(a.musicians).filter(key => {
        return a.musicians[key].role === 'Soloist';
      })[0];
      const bSoloist = Object.keys(b.musicians).filter(key => {
        return b.musicians[key].role === 'Soloist';
      })[0];
      if (aSoloist === 'Unknown') {
        return 1;
      } else if (bSoloist === 'Unknown') {
        return -1;
      } else if (aSoloist === undefined) {
        return 1;
      } else if (bSoloist === undefined) {
        return -1;
      } else {
        const aObj = this.allMusicians!.find(musician => {
          return musician['Initial Name'] === aSoloist;
        })
        const bObj = this.allMusicians!.find(musician => {
          return musician['Initial Name'] === bSoloist;
        })
        if (aObj === undefined && bObj === undefined) {
          return 0;
        } else if (aObj === undefined && bObj !== undefined) {
          return 1;
        } else if (aObj !== undefined && bObj === undefined) {
          return -1;
        } else {
          const aLastName = aObj!['Last Name'];
          const bLastName = bObj!['Last Name'];
          if (aLastName === undefined) {
            return 1;
          } else if (bLastName === undefined) {
            return -1;
          } else {
            const aFirstName = this.allMusicians!.find(musician => {
              return musician['Initial Name'] === aSoloist;
            })!['First Name'];
            const bFirstName = this.allMusicians!.find(musician => {
              return musician['Initial Name'] === bSoloist;
            })!['First Name'];
            const aMidName = this.allMusicians!.find(musician => {
              return musician['Initial Name'] === aSoloist;
            })!['Middle Name'];
            const bMidName = this.allMusicians!.find(musician => {
              return musician['Initial Name'] === bSoloist;
            })!['Middle Name'];
            if (aLastName < bLastName) {
              return -1;
            } else if (aLastName > bLastName) {
              return 1;
            } else {
              if (aFirstName !== undefined && bFirstName === undefined) {
                return -1;
              } else if (aFirstName === undefined && bFirstName !== undefined) {
                return 1;
              } else if (aFirstName === undefined && bFirstName === undefined) {
                return 0;
              } else {
                if (aFirstName! < bFirstName!) {
                  return -1;
                } else if (aFirstName! > bFirstName!) {
                  return 1;
                } else {
                  if (aMidName !== undefined && bMidName === undefined) {
                    return -1;
                  } else if (aMidName === undefined && bMidName !== undefined) {
                    return 1;
                  } else if (aMidName === undefined && bMidName === undefined) {
                    return 0;
                  } else {
                    if (aMidName! < bMidName!) {
                      return -1;
                    } else if (aMidName! > bMidName!) {
                      return 1;
                    } else {
                      return 0;
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    sortRecordings({
      sort='soloist', 
      fromTop=true
    }: {
      sort?: string,
      fromTop?: boolean
    } = {
    }) {
      const playingElem = document.querySelector('.playing');
      if (playingElem) {
        playingElem.classList.remove('playing');
      }
      if (sort === 'soloist') {
        this.allRecordings.sort(this.soloistSorter);
        if (!fromTop) {
          this.allRecordings.reverse();
        }
      } else if (sort === 'raag') {
        this.allRecordings.sort(this.raagSorter);
        if (!fromTop) {
          this.allRecordings.reverse();
        }
      } else if (sort === 'pSec') {
        this.allRecordings.sort(this.pSecSorter);
        if (!fromTop) {
          this.allRecordings.reverse();
        }
      } else if (sort === 'duration') {
        this.allRecordings.sort(this.durSorter);
        if (!fromTop) {
          this.allRecordings.reverse();
        }
      } else if (sort === 'audioEvent') {
        this.allRecordings.sort(this.trackNumSorter)
        this.allRecordings.sort(this.eventSorter)
        if (!fromTop) {
          this.allRecordings.reverse();
        }
      } else if (sort === 'trackNum') {
        this.allRecordings.sort(this.trackNumSorter)
      }
      if (this.activeRecording !== undefined) {
        const idx = this.allRecordings.findIndex(rec => {
          return rec._id === this.activeRecording!._id;
        });
        const elem = document.getElementById(`recRow${idx}`);
        if (elem) {
          elem.classList.add('playing');
        }
      }

    },

    sendAudioSource(event: MouseEvent, recording: RecType) {
      const audioFileId = recording._id; 
      let target = event.target as HTMLElement;
      if (target.tagName === 'SPAN') {
        target = target.parentElement!;
        if (target.classList.contains('metadataLabels')) {
          target = target.parentElement!;
        }
      };
      const playingElem = document.querySelector('.playing');
      if (playingElem) {
        playingElem.classList.remove('playing');
      }
      target.classList.add('playing');
      this.audioSource = `Https://swara.studio/audio/mp3/${audioFileId}.mp3`;
      this.saEstimate = recording.saEstimate;
      this.saVerified = recording.saVerified;
      this.activeRecording = recording;
    },

    openRecordingModal({ 
      editing = true, 
      recId = undefined 
    }: { 
      editing?: boolean,
      recId?: string 
    } = {}) {
      // console.log(`open recording modal, ${editing}`);
      this.uploadRecModalClosed = false;
      this.recModalFrame = editing ? 'editRecMetadata' : 'uploadRec';
      if (editing) {
        this.editingRecId = recId;
      }
    },

    openUploadModal() {
      this.uploadRecModalClosed = false;
    }
  }
})
</script>

<style scoped>

.main {
  background-color: black;
  background-image: linear-gradient(black, #1e241e);
  color: white;
}
.fileContainer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px - 40px);
  width: 100%;
  user-select: none;
  overflow-y: scroll;
  overflow-x: hidden;
  border-top: 1px solid grey;
}

.recordingRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  min-height: 40px;
  width: 100%;
  border-bottom: 1px solid grey;
}

.recordingRow.disabled {
  color: grey;
}

.recordingRow:hover {
  background-color: #2b332c;
}

.playing {
  background-color: #3e4a40;
}

.labelRow { 
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  min-height: v-bind(labelRowHeight + 'px');
  background-color: #1e241e;
  border-top: 1px solid grey;
}

.metadataLabels {
  text-align: center;
  border-right: 1px solid grey;
  height: 40px;
  position: relative;
  white-space: nowrap;
  box-sizing: border-box;
}

span.field {
  display: flex;
  align-items: center;
  justify-content: left;
  white-space: nowrap;
  overflow-x: auto;
  height: 30px;
  margin-left: 5px;
  margin-right: 5px;
  user-select: none;
}

.draggableBorder {
  position: absolute;
  right: -5px;
  top: 0;
  width: 10px;
  height: 100%;
  background-color: none;
  z-index: 1;
  opacity: 0;
  cursor: col-resize;
  
  user-select: none;
  background-color: pink
}

.draggableBorder:hover {
  cursor: col-resize
}

.sortTriangle.down {
  transform: rotate(90deg);
}

.sortTriangle.up {
  transform: rotate(-90deg);
}

</style>