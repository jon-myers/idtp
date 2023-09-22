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
        :key="piece._id"
        @dblclick="openPieceAlt(piece)"
        :id="`fir${i}`"
        >
        <div
          :class="`infoKey ${['', 'first'][Number(idx === 0)]}`"
          v-for="(info, idx) in allPieceInfo[i]"
          :key="info"
          >
          <div class='overflowX'>
            {{ info }}
          </div>
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
    <div v-if="open_" class="dropDownRow" @click="openPieceAlt()">
      Open In Editor
    </div>
    <div v-if="open_" class="dropDownRow" @click="openInAnalyzer()">
      Open In Analyzer
    </div>
    <div class="dropDownRow" @click="clonePiece()" v-if='open_'>
      Clone Transcription
    </div>
    <div 
      :class="`dropDownRow ${['inactive', ''][Number(deleteActive)]}`" 
      @click='editTitle()' 
      v-if='open_'
    >
      Edit Title
    </div>
    <div 
      :class="`dropDownRow ${['inactive', ''][Number(deleteActive)]}`" 
      @click='editPermissions()' 
      v-if='open_'
    >
      Edit Permissions
    </div>
    <div 
      :class="`dropDownRow ${['inactive', ''][Number(deleteActive)]}`"
      @click='editOwner()'
      v-if='open_'
      >
      Edit Owner
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
      @newPieceInfoEmit="acceptNewPieceInfo"
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
  <div v-if='editOwnerModal' class='ownerModal'>
    <div class='modalRow'>
      <select v-model='editingUserIdx'>
        <option v-for='(user, i) in allUsers' :key='i' :value='i'>
          {{allNames![i]}}
        </option>
      </select>
    </div>
    <div class='modalRow'>
      <button @click='saveNewOwner'>Save New Owner</button>
    </div>
  </div>
</template>
<script lang='ts'>
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
  updateTranscriptionOwner,
  getAllUsers
} from '@/js/serverCalls.ts';
import NewPieceRegistrar from '@/components/NewPieceRegistrar.vue';
import { Raga, Piece, Trajectory, Phrase } from '@/js/classes.ts';

import { defineComponent } from 'vue';
import { RecType } from '@/components/AddAudioEvent.vue'


type UserType = {
  email: string;
  family_name: string;
  given_name: string;
  name: string;
  picture: string;
  sub: string;
  waiverAgreed: boolean;
  _id: string;
}

type FileManagerType = {
  infoKeys: string[];
  designPieceModal: boolean;
  selectedPiece?: Piece,
  allPieces?: Piece[];
  allPieceInfo: PieceInfoType[];
  dropDownLeft: number;
  dropDownTop: number;
  dropDownWidth: number;
  delete_: boolean;
  open_: boolean;
  deleteActive: boolean;
  modalLeft: number;
  modalTop: number;
  modalWidth: number;
  modalHeight: number;
  titleModalWidth: number;
  titleModalHeight: number;
  permissionsModalWidth: number;
  permissionsModalHeight: number;
  ownerModalWidth: number;
  ownerModalHeight: number;
  sorts: number[];
  selectedSort: number;
  sortKeyNames: string[];
  editTitleModal: boolean;
  editPermissionsModal: boolean;
  passedInDataObj?: string,
  editingTitle?: string,
  editingPermissions?: string,
  editOwnerModal: boolean,
  allUsers?: UserType[],
  allNames?: string[],
  editingUserIdx?: number
}

type PieceInfoType = [string?, string?, string?, string?, string?, string?];

type NewPieceInfoType = {
  title: string;
  transcriber?: string;
  raga: string | Raga;
  audioID: string;
  permissions: string;
  clone?: boolean;
  origID: string;
  instrumentation?: string[];
  phrases?: Phrase[];
  family_name?: string;
  given_name?: string;
  name?: string;
}

type RagaNewPieceInfoType = {
  title: string;
  transcriber?: string;
  raga: Raga;
  audioID: string;
  permissions: string;
  clone?: boolean;
  origID: string;
  instrumentation?: string[];
  phrases?: Phrase[];
  family_name?: string;
  given_name?: string;
  name?: string;
}

export default defineComponent({
  name: 'FileManager',
  data(): FileManagerType {
    return {
      infoKeys: [
        'Title',
        'Transcriber',
        'Raga',
        'Created',
        'Modified',
        'Permissions',
      ],
      designPieceModal: false,
      allPieces: undefined,
      allPieceInfo: [],
      dropDownLeft: 200,
      dropDownTop: 300,
      dropDownWidth: 200,
      modalLeft: 200,
      modalTop: 200,
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
      ownerModalWidth: 300,
      ownerModalHeight: 200,
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
      editOwnerModal: false,
      editingTitle: undefined,
      editingPermissions: undefined,
      allUsers: undefined,
      allNames: undefined,
      editingUserIdx: undefined,
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
    const id = this.$store.state.userID as string;
    const sortKey = this.sortKeyNames[this.selectedSort];
    const sortDir = this.sorts[this.selectedSort];
    this.allPieces = await getAllPieces(id, sortKey, String(sortDir));
    if (this.allPieces === undefined) {
      throw new Error('this.allPieces is undefined');
    }
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
    try {
      this.allUsers = await getAllUsers();
      if (this.allUsers !== undefined) {
        this.allNames = this.allUsers.map(user => {
          return user.name + ' (' + user.email + ' )'
        });
      } else {
        throw new Error('this.allUsers is undefined');
      }
        
    } catch (err) {
      console.log(err)
    }
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeydown);
  },

  methods: {

    async acceptNewPieceInfo(newPieceInfo: NewPieceInfoType) {
      console.log(newPieceInfo)
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
          delete npi.clone;
          const stringRaga = npi.raga as string;
          const rsRes = await getRaagRule(stringRaga);
          const ruleSet = rsRes.rules;
          npi.raga = new Raga({
            name: stringRaga,
            ruleSet: ruleSet,
          });
          let durTot;
          if (npi.audioID) {
            const audioDBDoc = await getAudioRecording(npi.audioID);
            durTot = audioDBDoc.duration;
          } else {
            durTot = 60;
          }
          const tObj: {
            id: number;
            durTot: number;
            fundID12: number;
            instrumentation?: string;
          } = {
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

          this.createNewPiece(npi as RagaNewPieceInfoType);
        }
      } catch (err) {
        console.log(err);
      }
    },

    async toggleSort(idx: number) {
      if (this.sorts[idx] === 1) {
        this.sorts[idx] = -1;
      } else {
        this.sorts[idx] = 1;
      }
      this.selectedSort = idx;
      try {
        await this.updateSort();
      } catch (err) {
        console.log(err);
      }
      
    },

    async saveNewOwner() {
      const id = this.selectedPiece!._id!;
      const ownerObj = this.allUsers![this.editingUserIdx!];
      try {
        await updateTranscriptionOwner(id, ownerObj);
        await this.updateSort();
      } catch (err) {
        console.log(err);
      }
      this.editOwnerModal = false;
    },

    pieceInfo(p: Piece): PieceInfoType {
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

    writeDate(d: Date) {
      const date = new Date(d);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      return month + '/' + day + '/' + year;
    },

    openPieceAlt(piece?: Piece) {
      if (piece) {
        this.selectedPiece = piece;
      }
      if (this.selectedPiece === undefined) {
        throw new Error('piece is undefined')
      }
      this.$store.commit('update_id', this.selectedPiece._id);
      this.$cookies.set('currentPieceId', this.selectedPiece._id);
      this.$router.push({
        name: 'EditorComponent',
        query: { id: this.selectedPiece._id },
      });
    },

    openInAnalyzer() {
      const piece = this.selectedPiece;
      if (piece === undefined) {
        throw new Error('piece is undefined')
      }
      this.$store.commit('update_id', piece._id);
      this.$cookies.set('currentPieceId', piece._id);
      this.$router.push({
        name: 'AnalyzerComponent',
        query: { id: piece._id },
      })
    },

    designNewPiece() {
      const dropDown = this.$refs.dropDown as HTMLElement;
      dropDown.classList.add('closed');
      this.designPieceModal = true;
    },

    createNewPiece(obj: RagaNewPieceInfoType) {
      if (typeof obj.raga === 'string') {
        throw new Error('obj.raga is a string')
      }
      const piece = obj ? new Piece(obj) : new Piece();
      piece.userID = this.$store.state.userID;
      piece.name = this.$store.state.name;
      createNewPiece(piece).then((data) => {
        if (data === undefined) {
          throw new Error('data is undefined')
        }
        this.$store.commit('update_id', data.insertedId);
        this.$cookies.set('currentPieceId', data.insertedId);
        this.$router.push({
          name: 'EditorComponent',
          query: { id: data.insertedId },
        });
      });
    },

    copyLink() {
      const piece = this.selectedPiece;
      if (piece === undefined) {
        throw new Error('piece is undefined')
      }
      const url = window.location.origin + '/editor?id=' + piece._id;
      navigator.clipboard.writeText(url);
      this.closeDropDown();
    },

    async clonePiece() {
      const piece = this.selectedPiece;
      if (piece === undefined) {
        throw new Error('piece is undefined')
      }
      if (piece.audioID === undefined) {
        throw new Error('piece.audioId is undefined')
      }
      try {
        const audioRecording = await getAudioRecording(piece.audioID);
        const audioEvent = await getAudioEvent(audioRecording.parentID);
        const dataObj: {
          title: string;
          raga: Raga;
          audioEvent: string;
          audioRecording: RecType;
          origID: string;
          family_name?: string;
          given_name?: string;
          name?: string;
          instrumentation?: string[];
        } = {
          title: piece.title + ' (clone)',
          raga: piece.raga,
          audioEvent: audioEvent.name,
          audioRecording: audioRecording,
          origID: piece._id!,
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
      if (this.selectedPiece === undefined) {
        throw new Error('selectedPiece is undefined')
      }
      const isUser = this.$store.state.userID === this.selectedPiece.userID;
      if (this.delete_ && isUser) {
        const dropDown = this.$refs.dropDown as HTMLElement;
        dropDown.classList.add('closed');
        const res = await deletePiece(this.selectedPiece);
        if (res.deletedCount === 1) {
          const id = this.$store.state.userID!;
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
      const id = this.$store.state.userID!;
      const sortKey = this.sortKeyNames[this.selectedSort];
      const sortDir = this.sorts[this.selectedSort];
      try {
        this.allPieces = await getAllPieces(id, sortKey, sortDir);
        this.allPieces.forEach(async (piece, i) => {
          this.allPieceInfo[i] = this.pieceInfo(piece);
        });
      } catch (err) {
        console.log(err);
      }
      
    },

    handleRightClick(e: MouseEvent) {
      e.preventDefault();
      this.$nextTick(() => {
        this.dropDownLeft = e.clientX;
        this.dropDownTop = e.clientY;
        this.modalLeft = e.clientX;
        this.modalTop = e.clientY;
        const fc = this.$refs.fileContainer as HTMLElement;
        const rect = fc.getBoundingClientRect();
        if (this.modalLeft + this.modalWidth > rect.width - 20) {
          this.modalLeft = rect.width - 20 - this.modalWidth;
        }
        if (this.modalTop + this.modalHeight > rect.height - 20) {
          this.modalTop = rect.height - 20 - this.modalHeight;
        }
        if (this.dropDownLeft + this.dropDownWidth > rect.width - 20) {
          this.dropDownLeft = rect.width - 20 - this.dropDownWidth;
        }
        const dd = this.$refs.dropDown as HTMLElement;
        const dropDownRect = dd.getBoundingClientRect();
        const dropDownHeight = dropDownRect.height;
        if (this.dropDownTop + dropDownHeight > rect.height - 20) {
          this.dropDownTop = rect.height - 20 - dropDownHeight;
        }
        this.designPieceModal = false;

        document.querySelectorAll('.selected').forEach((el) => {
          el.classList.remove('selected');
        });
        dd.classList.remove('closed');
        let el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
        const parentNode = el.parentNode as HTMLElement;
        if (el.classList[0] === 'overflowX') {
          el = el.parentElement!.parentElement!;
        }
        if (el.classList[0] === 'fileInfoRow') {
          const num = Number(el.id.slice(3));
          el.classList.add('selected');
          this.selectedPiece = this.allPieces![num];
          this.delete_ = true;
          this.open_ = true;
          if (this.allPieces![num].userID === this.$store.state.userID) {
            this.deleteActive = true;
          } else {
            this.deleteActive = false;
          }
        } else if (parentNode.classList[0] === 'fileInfoRow') {
          const num = Number(parentNode.id.slice(3));
          parentNode.classList.add('selected');
          this.selectedPiece = this.allPieces![num];
          this.delete_ = true;
          this.open_ = true;
          if (this.allPieces![num].userID === this.$store.state.userID) {
            this.deleteActive = true;
          } else {
            this.deleteActive = false;
          }
        } else {
          this.delete_ = false;
          this.open_ = false;
          this.deleteActive = false;
        }
      })
      
    },

    closeDropDown() {
      const dd = this.$refs.dropDown as HTMLElement;
      dd.classList.add('closed');
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
      const id = this.selectedPiece!._id!;
      const title = this.editingTitle!;
      await updateTranscriptionTitle(id, title);
      await this.updateSort();
      this.editTitleModal = false;
    },

    async savePermissions() {
      const id = this.selectedPiece!._id!;
      const permissions = this.editingPermissions!;
      await updateTranscriptionPermissions(id, permissions);
      await this.updateSort();
      this.editPermissionsModal = false;
    },

    async saveOwner() {
      const id = this.selectedPiece!._id!;
      const ownerObj = this.allUsers![this.editingUserIdx!];
      await updateTranscriptionOwner(id, ownerObj);
      await this.updateSort();
      this.editOwnerModal = false;
    },

    editTitle() {
      const piece = this.selectedPiece;
      if (piece === undefined) {
        throw new Error('piece is undefined')
      }
      this.editTitleModal = true;
      this.closeDropDown();
      this.editingTitle = piece.title;
    },

    editPermissions() {
      const piece = this.selectedPiece;
      if (piece === undefined) {
        throw new Error('piece is undefined')
      }
      this.editPermissionsModal = true;
      this.closeDropDown();
      this.editingPermissions = piece.permissions;
    },

    editOwner() {
      const piece = this.selectedPiece;
      if (piece === undefined) {
        throw new Error('piece is undefined')
      }
      this.editOwnerModal = true;
      this.closeDropDown();
      this.editingUserIdx = this.allUsers?.findIndex(user => {
        return user._id === piece.userID
      })      
    },

    handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeDropDown();
        this.designPieceModal = false;
        this.editTitleModal = false;
        this.editPermissionsModal = false;
        this.editOwnerModal = false;
        
      }
    },
  },
});
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
  min-width: 220px;
  max-width: 300px;
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

.ownerModal {
  width: v-bind(ownerModalWidth + 'px');
  height: v-bind(ownerModalHeight + 'px');
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

.modalRow > select {
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

.overflowX {
  white-space: nowrap;
  text-align: left;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  width: 100%;
  margin-left: 5px;
  margin-right: 5px;
}

.overflowX::-webkit-scrollbar {
  width: 0em;
  height: 0em;
}

.overflowX::-webkit-scrollbar-thumb {
  background-color: #888;
  border-radius: 0em;
}
</style>
