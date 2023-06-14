<template>
  <div
    class="fileContainer"
    @contextmenu="handleRightClick"
    @click="handleClick"
    ref="fileContainer"
  >
    <div class="fileInfoKeys">
      <div
        v-for="(ik, idx) in infoKeys"
        :key="ik"
        :class="`infoKey ${['', 'first'][Number(idx === 0)]}`"
      >
        {{ ik }}
        <span
          :class="`sorter ${['', 'selectedTri'][Number(selectedSort === idx)]}`"
          :ref="`s${idx}`"
          @click="toggleSort(idx)"
        >
          {{ ['&#9650;', '&#9660;'][(sorts[idx] + 1) / 2] }}
        </span>
      </div>
    </div>
    <div class="fileInfoRowScroller">
      <div
        class="fileInfoRow"
        v-for="(piece, i) in allPieces"
        :key="piece"
        @dblclick="openPieceAlt(piece)"
        :id="`fir${i}`"
      >
        <div
          :class="`infoKey ${['', 'first'][Number(idx === 0)]}`"
          v-for="(info, idx) in allPieceInfo[i]"
          :key="info"
        >
          {{ info }}
        </div>
      </div>
    </div>
  </div>
  <div class="dropDown closed" ref="dropDown">
    <div
      :class="`dropDownRow ${['last', ''][Number(delete_)]}`"
      @click="designNewPiece()"
    >
      New Transcription
    </div>
    <div v-if="open_" class="dropDownRow" @click="openPieceAlt(piece)">
      Open In Editor
    </div>
    <div v-if="open_" class="dropDownRow" @click="openInAnalyzer(piece)">
      Open In Analyzer
    </div>
    <div class="dropDownRow" @click="clonePiece(piece)" v-if='open_'>
      Clone Transcription
    </div>
    <div 
      :class="`dropDownRow ${['inactive', ''][Number(deleteActive)]}`" 
      @click='editTitle(piece)' 
      v-if='open_'
    >
      Edit Title
    </div>
    <div 
      :class="`dropDownRow ${['inactive', ''][Number(deleteActive)]}`" 
      @click='editPermissions(piece)' 
      v-if='open_'
    >
      Edit Permissions
    </div>
    <div class='dropDownRow' @click='copyLink' v-if='open_'>
      Copy Link
    </div>
    <div
      v-if="delete_"
      :class="`dropDownRow last ${['inactive', ''][Number(deleteActive)]}`"
      @click="deletePiece"
    >
      Delete Transcription
    </div>
  </div>
  <div v-if="designPieceModal" class="designPieceModal">
    <NewPieceRegistrar
      ref="newPieceRegistrar"
      :modalWidth="modalWidth"
      :modalHeight="modalHeight"
      :dataObj='passedInDataObj'
    />
  </div>
  <div v-if='editTitleModal' class='titleModal'>
    <div class='modalRow'>
      <input type='text' v-model='editingTitle' />
    </div>
    <div class='modalRow'>
      <button @click='saveTitle'>Save</button>
      <button @click='cancelTitle'>Cancel</button>
    </div>
  </div>
  <div v-if='editPermissionsModal' class='permissionsModal'>
    <div class='modalRow'>
      <select v-model='editingPermissions'>
        <option value='Private'>Private</option>
        <option value='Public'>Public</option>
        <option value='Publicly Editable'>Publicly Editable</option>
      </select>
    </div>
    <div class='modalRow'>
      <button @click='savePermissions'>Save</button>
      <button @click='cancelPermissions'>Cancel</button>
    </div>
  </div>
</template>
<script>
import {
  getAllPieces,
  createNewPiece,
  deletePiece,
  getRaagRule,
  getAudioRecording,
  getAudioEvent,
  cloneTranscription,
  updateTranscriptionTitle,
  updateTranscriptionPermissions,
} from '@/js/serverCalls.ts';
import NewPieceRegistrar from '@/components/NewPieceRegistrar.vue';
import { Raga, Piece, Trajectory, Phrase } from '@/js/classes.ts';

export default {
  name: 'FileManager',
  data() {
    return {
      infoKeys: [
        'Title',
        'Transcriber',
        'Raga',
        'Date Created',
        'Date Modified',
        'Permissions',
      ],
      designPieceModal: false,
      allPieces: undefined,
      allPieceInfo: [],
      dropDownLeft: 200,
      dropDownTop: 300,
      modalLeft: 200,
      modalTop: 200,
      dropDownWidth: 200,
      delete_: true,
      open_: true,
      deleteActive: true,
      selectedPiece: undefined,
      modalWidth: 600,
      modalHeight: 450,
      titleModalWidth: 500,
      titleModalHeight: 100,
      permissionsModalWidth: 300,
      permissionsModalHeight: 100,
      sorts: [1, 1, 1, 1, 1, 1],
      selectedSort: 0,
      sortKeyNames: [
        'title',
        'family_name',
        'raga',
        'dateCreated',
        'dateModified',
        'permissions',
      ],
      passedInDataObj: undefined,
      editTitleModal: false,
      editPermissionsModal: false,
      editingTitle: undefined,
      editingPermissions: undefined,
    };
  },

  components: {
    NewPieceRegistrar,
  },

  async created() {
    window.addEventListener('keydown', this.handleKeydown);
    if (this.$store.state.userID === undefined) {
      this.$router.push('/');
    }
    const id = this.$store.state.userID;
    const sortKey = this.sortKeyNames[this.selectedSort];
    const sortDir = this.sorts[this.selectedSort];
    this.allPieces = await getAllPieces(id, sortKey, sortDir);
    this.allPieces.forEach(() => {
      this.allPieceInfo.push([
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      ]);
    });
    this.allPieces.forEach(async (piece, i) => {
      this.allPieceInfo[i] = this.pieceInfo(piece);
    });
  },

  async mounted() {
    if (this.$route.query.aeName && this.$route.query.afName) {
      this.designNewPiece();
    }

    this.emitter.on('newPieceInfo', async (newPieceInfo) => {
      try {
        if (newPieceInfo.clone) {
          const id = newPieceInfo.origID;
          const title = newPieceInfo.title;
          const perm = newPieceInfo.permissions;
          const newOwner = this.$store.state.userID;
          const name = this.$store.state.name;
          const family_name = this.$store.state.lastName;
          const given_name = this.$store.state.firstName;
          const result = await cloneTranscription({
            id: id, 
            title: title, 
            newOwner: newOwner, 
            permissions: perm, 
            name: name, 
            family_name: family_name, 
            given_name: given_name
          });
          this.$router.push({
            name: 'EditorComponent',
            query: { id: result.insertedId },
          });
        } else {
          const npi = Object.assign({}, newPieceInfo);
          delete npi.clone
          const rsRes = await getRaagRule(npi.raga);
          const ruleSet = rsRes.rules;
          npi.raga = new Raga({
            name: npi.raga,
            ruleSet: ruleSet,
          });
          let durTot;
          if (npi.audioID) {
            const audioDBDoc = await getAudioRecording(npi.audioID);
            durTot = audioDBDoc.duration;
          } else {
            durTot = 60;
          }
          const tObj = {
            id: 12,
            durTot: durTot,
            fundID12: npi.raga.fundamental,
          };
          if (npi.instrumentation) {
            tObj.instrumentation = npi.instrumentation[0];
          }
          const traj = new Trajectory(tObj);
          npi.phrases = [
            new Phrase({
              trajectories: [traj],
            }),
          ];
          npi.family_name = this.$store.state.lastName;
          npi.given_name = this.$store.state.firstName;

          this.createNewPiece(npi);
        }
      } catch (err) {
        console.log(err);
      }
    });
  },

  beforeUnmount() {
    this.emitter.off('newPieceInfo');
    window.removeEventListener('keydown', this.handleKeydown);
  },

  methods: {
    async toggleSort(idx) {
      if (this.sorts[idx] === 1) {
        this.sorts[idx] = -1;
      } else {
        this.sorts[idx] = 1;
      }
      this.selectedSort = idx;
      await this.updateSort();
    },

    pieceInfo(p) {
      const title = p.title;
      const raga = p.raga.name;
      let name = undefined;
      if (p.userID) {
        if (p.userID === this.$store.state.userID) {
          name = 'You';
        } else {
          name = p.name;
        }
      }
      const dateCreated = this.writeDate(p.dateCreated);
      const dateModified = this.writeDate(p.dateModified);
      const permissions = p.permissions;
      return [title, name, raga, dateCreated, dateModified, permissions];
    },

    writeDate(d) {
      const date = new Date(d);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      return month + '/' + day + '/' + year;
    },

    openPieceAlt(piece) {
      if (piece === undefined) {
        piece = this.selectedPiece;
      }
      this.$store.commit('update_id', piece._id);
      this.$cookies.set('currentPieceId', piece._id);
      this.$router.push({
        name: 'EditorComponent',
        query: { id: piece._id },
      });
    },

    openInAnalyzer(piece) {
      if (piece === undefined) {
        piece = this.selectedPiece;
      }
      this.$store.commit('update_id', piece._id);
      this.$cookies.set('currentPieceId', piece._id);
      this.$router.push({
        name: 'AnalyzerComponent',
        query: { id: piece._id },
      })
    },

    designNewPiece() {
      this.$refs.dropDown.classList.add('closed');
      this.designPieceModal = true;
    },

    createNewPiece(obj) {
      const piece = obj ? new Piece(obj) : new Piece();
      piece.userID = this.$store.state.userID;
      piece.name = this.$store.state.name;
      createNewPiece(piece).then((data) => {
        this.$store.commit('update_id', data.insertedId);
        this.$cookies.set('currentPieceId', data.insertedId);
        this.$router.push({
          name: 'EditorComponent',
          query: { id: data.insertedID },
        });
      });
    },

    copyLink() {
      const piece = this.selectedPiece;
      const url = window.location.origin + '/editor?id=' + piece._id;
      navigator.clipboard.writeText(url);
      this.closeDropDown();
    },

    async clonePiece(piece) {
      if (piece === undefined) piece = this.selectedPiece;
      try {
        const audioRecording = await getAudioRecording(piece.audioID);
        const audioEvent = await getAudioEvent(audioRecording.parentID);
        const dataObj = {
          title: piece.title + ' (clone)',
          raga: piece.raga,
          audioEvent: audioEvent.name,
          audioRecording: audioRecording,
          origID: piece._id,
          family_name: this.$store.state.lastName,
          given_name: this.$store.state.firstName,
          name: this.$store.state.name,
        };
        if (piece.instrumentation) {
          dataObj.instrumentation = piece.instrumentation;
        }
        this.passedInDataObj = JSON.stringify(dataObj);
        this.designPieceModal = true;
      } catch (err) {
        console.log(err);
      }
    },

    async deletePiece() {
      const isUser = this.$store.state.userID === this.selectedPiece.userID;
      if (this.delete_ && isUser) {
        this.$refs.dropDown.classList.add('closed');
        const res = await deletePiece(this.selectedPiece);
        if (res.deletedCount === 1) {
          const id = this.$store.state.userID;
          const sortKey = this.sortKeyNames[this.selectedSort];
          const sortDir = this.sorts[this.selectedSort];
          this.allPieces = await getAllPieces(id, sortKey, sortDir);
          this.allPieces.forEach( (piece, i) => {
            this.allPieceInfo[i] = this.pieceInfo(piece);
          });
        }
      }
    },

    async updateSort() {
      const id = this.$store.state.userID;
      const sortKey = this.sortKeyNames[this.selectedSort];
      const sortDir = this.sorts[this.selectedSort];
      this.allPieces = await getAllPieces(id, sortKey, sortDir);
      this.allPieces.forEach(async (piece, i) => {
        this.allPieceInfo[i] = this.pieceInfo(piece);
      });
    },

    handleRightClick(e) {
      e.preventDefault();
      this.dropDownLeft = e.clientX;
      this.dropDownTop = e.clientY;
      this.modalLeft = e.clientX;
      this.modalTop = e.clientY;
      const rect = this.$refs.fileContainer.getBoundingClientRect();
      if (this.modalLeft + this.modalWidth > rect.width - 20) {
        this.modalLeft = rect.width - 20 - this.modalWidth;
      }
      if (this.modalTop + this.modalHeight > rect.height - 20) {
        this.modalTop = rect.height - 20 - this.modalHeight;
      }
      if (this.dropDownLeft + this.dropDownWidth > rect.width - 20) {
        this.dropDownLeft = rect.width - 20 - this.dropDownWidth;
      }
      const dropDownRect = this.$refs.dropDown.getBoundingClientRect();
      const dropDownHeight = dropDownRect.height;
      if (this.dropDownTop + dropDownHeight > rect.height - 20) {
        this.dropDownTop = rect.height - 20 - dropDownHeight;
      }
      this.designPieceModal = false;

      document.querySelectorAll('.selected').forEach((el) => {
        el.classList.remove('selected');
      });
      this.$refs.dropDown.classList.remove('closed');
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el.classList[0] === 'fileInfoRow') {
        const num = el.id.slice(3);
        el.classList.add('selected');
        this.selectedPiece = this.allPieces[num];
        this.delete_ = true;
        this.open_ = true;
        if (this.allPieces[num].userID === this.$store.state.userID) {
          this.deleteActive = true;
        } else {
          this.deleteActive = false;
        }
      } else if (el.parentNode.classList[0] === 'fileInfoRow') {
        const num = el.parentNode.id.slice(3);
        el.parentNode.classList.add('selected');
        this.selectedPiece = this.allPieces[num];
        this.delete_ = true;
        this.open_ = true;
        if (this.allPieces[num].userID === this.$store.state.userID) {
          this.deleteActive = true;
        } else {
          this.deleteActive = false;
        }
      } else {
        this.delete_ = false;
        this.open_ = false;
        this.deleteActive = false;
      }
    },

    closeDropDown() {
      this.$refs.dropDown.classList.add('closed');
      document.querySelectorAll('.selected').forEach((el) => {
        el.classList.remove('selected');
      });
    },

    handleClick() {
      this.designPieceModal = false;
      this.editTitleModal = false;
      this.editPermissionsModal = false;
      this.closeDropDown();
    },

    cancelTitle() {
      this.editTitleModal = false;
    },

    cancelPermissions() {
      this.editPermissionsModal = false;
    },

    async saveTitle() {
      const id = this.selectedPiece._id;
      const title = this.editingTitle;
      const result = await updateTranscriptionTitle(id, title);
      await this.updateSort();
      this.editTitleModal = false;
    },

    async savePermissions() {
      const id = this.selectedPiece._id;
      const permissions = this.editingPermissions;
      const result = await updateTranscriptionPermissions(id, permissions);
      await this.updateSort();
      this.editPermissionsModal = false;
    },

    editTitle(piece) {
      if (piece === undefined) {
        piece = this.selectedPiece;
      }
      this.editTitleModal = true;
      this.closeDropDown();
      this.editingTitle = piece.title;
    },

    editPermissions(piece) {
      if (piece === undefined) {
        piece = this.selectedPiece;
      }
      this.editPermissionsModal = true;
      this.closeDropDown();
      this.editingPermissions = piece.permissions;
    },

    handleKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeDropDown();
        this.designPieceModal = false;
        this.editTitleModal = false;
        this.editPermissionsModal = false;
        
      }
    },
  },
};
</script>

<style scoped>
.fileContainer {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-image: linear-gradient(black, #1e241e);
  border-top: 1px solid grey;
  /* overflow-y: scroll; */
}

.fileInfoRowScroller {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow-y: scroll;
}

.fileInfoRow {
  width: 100%;
  height: 40px;
  min-height: 40px;
  color: white;
  border-bottom: 1px solid grey;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  cursor: pointer;
}

.fileInfoRow:hover {
  background-color: #2b332c;
}

.fileInfoRow.selected {
  background-color: #2b332c;
}

.fileInfoKeys {
  width: 100%;
  height: 30px;
  min-height: 30px;
  background-color: #1e241e;
  color: white;
  border-bottom: 1px solid grey;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.infoKey {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 150px;
  height: 100%;
  border-right: 1px solid grey;
  user-select: none;
}

.infoKey.first {
  width: 220px;
}

.addNewPiece {
  width: 100%;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-bottom: 1px solid black;
  background-color: #a6ffbe;
  user-select: none;
  cursor: pointer;
}

.designPieceModal {
  width: v-bind(modalWidth + 'px');
  height: v-bind(modalHeight + 'px');
  border: 1px solid black;
  position: fixed;
  left: v-bind(modalLeft + 'px');
  top: v-bind(modalTop + 'px');
}

.titleModal {
  width: v-bind(titleModalWidth + 'px');
  height: v-bind(titleModalHeight + 'px');
  border: 1px solid black;
  position: fixed;
  left: v-bind(modalLeft + 'px');
  top: v-bind(modalTop + 'px');
  background-color: lightgrey;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
}

.permissionsModal {
  width: v-bind(permissionsModalWidth + 'px');
  height: v-bind(permissionsModalHeight + 'px');
  border: 1px solid black;
  position: fixed;
  left: v-bind(modalLeft + 'px');
  top: v-bind(modalTop + 'px');
  background-color: lightgrey;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
}

.modalRow {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
}

.modalRow > input {
  width: 100%;
  margin-left: 20px;
  margin-right: 20px;
}

.dropDown {
  position: absolute;
  width: v-bind(dropDownWidth + 'px');
  background-color: black;
  left: v-bind(dropDownLeft + 'px');
  top: v-bind(dropDownTop + 'px');
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
  width: v-bind(dropDownWidth-24 + 'px');
}

.dropDownRow:hover {
  background-color: blue;
  cursor: pointer;
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

button {
  margin-left: 20px;
  cursor: pointer;
}

.sorter {
  cursor: pointer;
  color: black;
}

.sorter.selectedTri {
  color: white;
}
</style>
