<template>
  <div 
  class='mainCollection' 
  @contextmenu='handleContextClick($event)'
  @click='contextMenuOpen = false'
  >
    <div class='titleRow'>
      <div class='titleContainer'>
        <h2>{{ collection.title }}</h2>
      </div>
      <div class='button'>
        <button @click='closeCollection'>Close</button>
        <button v-if='owner' @click='editCollection'>Edit</button>
      </div>
    </div>
    <div class='descriptionRow'>
     <div class='descriptionContainer'>{{ collection.description }}</div>
    </div>
    <div class='contentContainer'>
      <div class='arHolder' v-if='collection.audioRecordings.length > 0'>
        <div class='miniBoxTitle'>Audio Recordings</div>
        <MiniAudioRecordings
          :recIds='collection.audioRecordings'
          class='miniAR'
          @sendAudioSource='sendAudioSource'
          @chirp='handleChirp("recording")'
          ref = 'miniAR'
          />
      </div>
      <div class='aeHolder' v-if='collection.audioEvents.length > 0'>
        <div class='miniBoxTitle'>Audio Events</div>
        <MiniAudioEvents
          :aeIds='collection.audioEvents'
          class='miniAE'
          ref = 'miniAE'
          @sendAudioSource='sendAudioSource'
          @chirp='handleChirp("audioEvent")'
          />
      </div>
      <div class='tHolder' v-if='collection.transcriptions.length > 0'>
        <div class='miniBoxTitle'>Transcriptions</div>
        <MiniTranscriptions
          :tIds='collection.transcriptions'
          @chirp='handleChirp("transcription")'
          class='miniT'
          ref='miniT'
          />
      </div>
    </div>
    
    <GenericAudioPlayer 
      :audioSource='audioSource'
      @emitNextTrack='emitNextTrack'
      @emitPrevTrack='emitPrevTrack'
      />
  </div>
  <ContextMenu
    :x='contextMenuX'
    :y='contextMenuY'
    :choices='contextMenuOptions'
    :closed='!contextMenuOpen'
    ref='contextMenu'
  
  />
</template>

<script lang='ts'>
import { defineComponent, PropType } from 'vue';
import type { 
  CollectionType, 
  ContextMenuOptionType,
  TranscriptionMetadataType, 
} from '@/ts/types.ts';
import { getContrastingTextColor } from '@/ts/utils';
import GenericAudioPlayer from '@/components/GenericAudioPlayer.vue';
import { 
  getEditableCollections,
  removeAudioEventFromCollection,
  removeRecordingFromCollection,
  removeTranscriptionFromCollection,
  getAllTransOfAudioFile
} from '@/js/serverCalls';
import MiniAudioRecordings from '@/components/collections/MiniAudioRecordings.vue';
import MiniAudioEvents from '@/components/collections/MiniAudioEvents.vue';
import MiniTranscriptions from '@/components/collections/MiniTranscriptions.vue';
import ContextMenu from '@/components/ContextMenu.vue';
import { RecType } from '@/components/audioEvents/AddAudioEvent.vue';
import { AudioEventType } from '@/components/audioEvents/AddAudioEvent.vue';

type CollectionViewerDataType = {
  audioSource: string | undefined,
  miniBoxHeight: number,
  miniBoxLabelHeight: number,
  playingFromType?: 'recording' | 'audioEvent',
  titleRowHeight: number,
  descriptionRowHeight: number,
  containerHeight: number,
  contextMenuOpen: boolean,
  contextMenuX: number,
  contextMenuY: number,
  contextMenuOptions: ContextMenuOptionType[],
  chirpSource?: 'recording' | 'audioEvent' | 'transcription',
  editor: boolean
}
export default defineComponent({
  name: 'CollectionViewer',
  data(): CollectionViewerDataType {
    return {
      audioSource: undefined,
      miniBoxHeight: 300,
      miniBoxLabelHeight: 50,
      playingFromType: undefined,
      titleRowHeight: 80,
      descriptionRowHeight: 80,
      containerHeight: 500,
      contextMenuOpen: false,
      contextMenuX: 0,
      contextMenuY: 0,
      contextMenuOptions: [],
      chirpSource: undefined,
      editor: false
    }
  },
  components: {
    GenericAudioPlayer,
    MiniAudioRecordings,
    MiniAudioEvents,
    MiniTranscriptions,
    ContextMenu
  },
  props: {
    collection: {
      type: Object as PropType<CollectionType>,
      required: true
    },
    owner: {
      type: Boolean,
      required: true
    },
    navHeight: {
      type: Number,
      required: true
    }
  },
  computed: {
    color() {
      return this.collection.color;
    },

    textColor() {
      return getContrastingTextColor(this.collection.color!);
    }
  },

  mounted() {
    this.setContainerHeight();
    window.addEventListener('resize', this.setContainerHeight);
    // listen for escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.contextMenuOpen) {
          this.contextMenuOpen = false;
        } else {
          this.closeCollection();
        }
      }
    });
    const editors = this.collection.permissions.edit;
    this.editor = this.owner || editors.includes(this.$store.state.userID!);
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.setContainerHeight);
  },

  methods: {

    permissionToViewRec(rec: RecType) {
      const ep = rec.explicitPermissions!;
      const id = this.$store.state.userID!;
      const out = ep.publicView || 
        ep.view.includes(id) || 
        ep.edit.includes(id) || 
        rec.userID === id;
      return out;
    },

    permissionToEditRec(rec: RecType) {
      const ep = rec.explicitPermissions!;
      const id = this.$store.state.userID!;
      return ep.edit.includes(id) || rec.userID === id;
    },

    permissionToViewTrans(transcription: TranscriptionMetadataType) {
      const ep = transcription.explicitPermissions;
      const id = this.$store.state.userID!;
      return ep.publicView || 
        transcription.userID === id ||
        ep.edit.includes(id) ||
        ep.view.includes(id);
    },

    permissionToEditTrans(transcription: TranscriptionMetadataType) {
      const ep = transcription.explicitPermissions;
      const id = this.$store.state.userID!;
      return transcription.userID === id || ep.edit.includes(id);
    },

    handleChirp(fromType: 'recording' | 'audioEvent' | 'transcription') {
      this.chirpSource = fromType;
    },

    async handleContextClick(e: MouseEvent) {
      this.contextMenuOptions = [];

      e.preventDefault();
      if (this.contextMenuOpen) {
        this.contextMenuOpen = false;
        return;
      }
      this.contextMenuX = e.clientX;
      this.contextMenuY = e.clientY;
      if (this.chirpSource === 'transcription') {
        let target = e.target as HTMLElement;
        if (target.classList.contains('field')) {
          target = target.parentElement!.parentElement!;
        } 
        if (target.classList.contains('metadataLabels')) {
          target = target.parentElement!
        }
        const idx = target.id.slice(4);
        if (idx !== '') {
          const tComp = this.$refs.miniT as typeof MiniTranscriptions;
          const t = tComp.trans[idx];
          this.contextMenuOptions = [
            {
              text: 'Open in Editor',
              action: () => {
                this.$store.commit('update_id', t._id);
                this.$cookies.set('currentPieceId', t._id);
                this.$router.push({
                  name: 'EditorComponent',
                  query: { id: t._id }
                })
              },
              enabled: true
            },
            {
              text: 'Open in Analyzer',
              action: () => {
                this.$store.commit('update_id', t._id);
                this.$cookies.set('currentPieceId', t._id);
                this.$router.push({
                  name: 'AnalyzerComponent',
                  query: { id: t._id }
                })
              },
              enabled: true
            },
          ];
          // if you are the owner, or have editing permissions for the collection
          // const editors = this.collection.permissions.edit;
          if (this.editor) {
            this.contextMenuOptions.push({
              text: 'Remove from Collection',
              action: async () => {
                try {
                  await removeTranscriptionFromCollection(t._id, this.collection._id!);
                  await this.$nextTick();
                  await tComp.updateTrans();
                } catch (err) {
                  console.log(err);
                }
                this.$emit('updateCollections');
                this.contextMenuOpen = false;

              },
              enabled: true
            });
          }
          this.contextMenuOpen = true;
          this.updateContextMenuPosition();
        }   
      } else if (this.chirpSource === 'audioEvent') {
        let target = e.target as HTMLElement;
        let recRowID = undefined;
        if (target.classList.contains('draggableBorder')) {
          target = target.parentElement!
        }
        if (target.classList.contains('field')) {
          target = target.parentElement!
        }
        if (target.classList.contains('metadataLabels')) {
          target = target.parentElement!
        }
        if (target.classList.contains('aeRow')) {
          target = target.parentElement!
        }
        if (target.classList.contains('recsMetadataLabels')) {
          target = target.parentElement!
        }
        if (target.classList.contains('recsLabelRow')) {
          target = target.parentElement!
        }
        if (target.classList.contains('recRow')) {
          recRowID = target.id
          target = target.parentElement!
          
        }
        if (target.classList.contains('recsHolder')) {
          target = target.parentElement!
        }
        if (target.classList.contains('aeRowHolder')) {
          const idx = Number(target.id.slice(11));
          
          this.contextMenuOptions.push({
            text: 'Remove from Collection',
            action: async () => {
              try {
                const miniAE = this.$refs.miniAE as typeof MiniAudioEvents;
                const aeId = miniAE.audioEvents[idx]._id!;
                await removeAudioEventFromCollection(aeId, this.collection._id!);
                await this.$nextTick();
                await miniAE.updateAEs();
              } catch (err) {
                console.log(err);
              }
              this.$emit('updateCollections');
              this.contextMenuOpen = false;
            },
            enabled: this.editor,
          });
          this.contextMenuOpen = true;
          if (recRowID !== undefined) {
            const split = recRowID.split('rec');
            const recIdx = Number(split[1]);
            const aeIdx = Number(split[0].slice(2));
            const aeComp = this.$refs.miniAE as typeof MiniAudioEvents;
            const ae = aeComp.audioEvents[aeIdx] as AudioEventType;
            const rec = ae.recordings[recIdx];
            this.contextMenuOptions.push({
              text: 'New Transcription',
              action: () => {
                const recID = rec.audioFileId!;
                const aeName = ae.name;
                const afName = this.getShorthand(rec);
                const query = {
                  aeName: JSON.stringify(aeName),
                  afName: JSON.stringify(afName),
                  recID: recID
                }
                this.$router.push({
                  name: 'Files',
                  query
                });
                this.contextMenuOpen = false
              },
              enabled: this.permissionToViewRec(rec)
            })
            const tChoices = await getAllTransOfAudioFile(
              rec.audioFileId,
              this.$store.state.userID!
            );
            tChoices.forEach(tc => {
              this.contextMenuOptions.push({
                text: `Open transcription: "${ tc.title }" by ${ tc.name }`,
                action: () => {
                  this.$store.commit('update_id', tc._id);
                  this.$cookies.set('currentPieceId', tc._id);
                  this.$router.push({
                    name: 'EditorComponent',
                    query: { id: tc._id }
                  })
                },
                enabled: this.permissionToViewTrans(tc)
              })
            })
          } 
        }
      } else if (this.chirpSource === 'recording') {
        let target = e.target as HTMLElement;
        if (target.classList.contains('draggableBorder')) {
          target = target.parentElement!
        }
        if (target.classList.contains('field')) {
          target = target.parentElement!
        }
        if (target.classList.contains('metadataLabels')) {
          target = target.parentElement!
        }
        if (target.classList.contains('recordingRow')) {
          const idx = Number(target.id.slice(6));
          const miniAR = this.$refs.miniAR as typeof MiniAudioRecordings;
          const rec = miniAR.recs[idx];

          this.contextMenuOptions.push({
            text: 'Remove from Collection',
            action: async () => {
              try {
                const recId = rec._id!;
                await removeRecordingFromCollection(recId, this.collection._id!);
              } catch (err) {
                console.log(err);
              }
              this.$emit('updateCollections');
              this.contextMenuOpen = false;
            },
            enabled: this.editor,
          });
          this.contextMenuOptions.push({
            text: 'New Transcription',
            action: () => {
              
              const recID = rec._id!;
              const aeName = rec.parentTitle;
              const afName = this.getShorthand(rec);
              const query = {
                aeName: JSON.stringify(aeName),
                afName: JSON.stringify(afName),
                recID: recID
              }
              this.$router.push({
                name: 'Files',
                query
              });
              this.contextMenuOpen = false
            },
            enabled: this.permissionToViewRec(rec)
          })
          const tChoices = await getAllTransOfAudioFile(
            rec._id!,
            this.$store.state.userID!
          );
          tChoices.forEach(tc => {
            this.contextMenuOptions.push({
              text: `Open transcription: "${ tc.title }" by ${ tc.name }`,
              action: () => {
                this.$store.commit('update_id', tc._id);
                this.$cookies.set('currentPieceId', tc._id);
                this.$router.push({
                  name: 'EditorComponent',
                  query: { id: tc._id }
                })
              },
              enabled: this.permissionToViewTrans(tc)
            })
          })

          this.contextMenuOpen = true;
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

    updateContextMenuPosition() {
      const CM = this.$refs.contextMenu as typeof ContextMenu;
      const height = this.contextMenuOptions.length * CM.rowHeight;
      if (this.contextMenuY + height > window.innerHeight - this.navHeight - 100) {
        this.contextMenuY = window.innerHeight - 100 - this.navHeight - height;
      }
      if (this.contextMenuX + CM.dropDownWidth > window.innerWidth - 20) {
        this.contextMenuX = window.innerWidth - CM.dropDownWidth - 20;
      }
    },

    setContainerHeight() {
      this.containerHeight = window.innerHeight - this.navHeight - 101 - this.titleRowHeight - this.descriptionRowHeight;
    },

    getEditableCollections,
    
    closeCollection($event?: MouseEvent) {
      this.$emit('closeCollection');
    },

    editCollection($event: MouseEvent) {
      this.$emit('editCollection');
    },

    sendAudioSource(id: string, fromType: 'recording' | 'audioEvent') {
      this.playingFromType = fromType;
      this.audioSource = `Https://swara.studio/audio/mp3/${ id }.mp3`;
    },

    emitNextTrack(shuffling: boolean, repeat: boolean) {
      if (this.playingFromType === 'recording') {
        const miniAR = this.$refs.miniAR as typeof MiniAudioRecordings;
        miniAR.sendNextTrack(shuffling, repeat);
      } else if (this.playingFromType === 'audioEvent') {
        const miniAE = this.$refs.miniAE as typeof MiniAudioEvents;
        miniAE.sendNextTrack(shuffling, repeat);
      }
    },

    emitPrevTrack(shuffling: boolean, repeat: boolean) {
      if (this.playingFromType === 'recording') {
        const miniAR = this.$refs.miniAR as typeof MiniAudioRecordings;
        miniAR.sendPrevTrack(shuffling, repeat);
      } else if (this.playingFromType === 'audioEvent') {
        const miniAE = this.$refs.miniAE as typeof MiniAudioEvents;
        miniAE.sendPrevTrack(shuffling, repeat);
      }
    }
  }
})
</script>
<style scoped>

.mainCollection {
  box-sizing: border-box;
  border-top: 1px solid #ccc;
  color: v-bind(textColor);
  background-color: v-bind(color);
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: center;
  width: 100%;
  height: 100%;
}

.titleRow {
  width: 100%;
  height: v-bind(titleRowHeight + 'px');
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
}

.titleContainer {
  width: calc(100% - 80px);
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
}

h2 {
  margin-left: 20px;
  text-align: left;
}

.button {
  margin-right: 20px;
  width: 60px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: right;
}

.descriptionRow {
  width: 100%;
  height: v-bind(descriptionRowHeight + 'px');
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
}

.descriptionContainer {
  width: calc(100% - 80px);
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  margin-left: 20px;
  text-align: left;
}

.miniAR {
  width: 90vw;
  height: v-bind(miniBoxHeight + 'px');

}

.miniAE {
  width: 90vw;
  height: v-bind(miniBoxHeight + 'px');
}

.miniT {
  width: 90vw;
  height: v-bind(miniBoxHeight + 'px');
}

.aeHolder {
  width: 100%;
  height: v-bind(miniBoxHeight + miniBoxLabelHeight + 'px');
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 10px;

}

.arHolder {
  width: 100%;
  height: v-bind(miniBoxHeight + miniBoxLabelHeight + 'px');
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
}

.tHolder {
  width: 100%;
  height: v-bind(miniBoxHeight + miniBoxLabelHeight + 'px');
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 10px;

}

.miniBoxTitle {
  width: 100%;
  height: v-bind(miniBoxLabelHeight + 'px');
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  font-size: 1.2em;
  font-weight: bold;
  text-align: center;
}

.contentContainer {
  width: 100%;
  height: v-bind(containerHeight + 'px');
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  padding: 10px;

}
</style>