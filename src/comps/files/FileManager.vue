<template>
  <FilterableTable
    ref='filterableTable'
    v-if='
      userID !== undefined
      && allPieces !== undefined
      
      '
    :labels='ftLabels'
    :items='allPieces'
    :userID='userID'
    :canEdit='(permissionToEdit as UserCheckType)'
    :canView='(permissionToView as UserCheckType)'
    :heightOffset='0'
    :navHeight='navHeight'
    @doubleClick='handleDoubleClickEmit'
    @click='handleClickEmit'
    @rightClick='handleRightClickEmit'
    />

  <div
    v-if='false'
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
  <ContextMenu
  :x='dropDownLeft'
  :y='dropDownTop'
  :closed='contextMenuClosed'
  :choices='contextMenuChoices'
  ref='contextMenu'
  />
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
  <AddToCollection
    v-if='addToCollectionModalOpen'
    :possibleCollections='editableCols'
    :navHeight='navHeight'
    :tID='selectedPiece?._id'
    @close='closeCollectionsModal'
    addType='transcription'
  />
  <RemoveFromCollection
    v-if='removeFromCollectionModalOpen'
    :possibleCollections='removableCols'
    :navHeight='0'
    :tID='selectedPiece?._id'
    @close='closeCollectionsModal'
    removeType='transcription'
  />
  <PermissionsModal
    v-if='permissionsModalOpen && selectedPiece !== undefined'
    :navHeight='navHeight'
    :explicitPermissions='selectedPiece.explicitPermissions'
    @close='permissionsModalOpen = false'
    artifactType='transcription'
    :artifactID='selectedPiece._id!'


  />
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
  getAllUsers,
  getEditableCollections,
} from '@/js/serverCalls.ts';
import NewPieceRegistrar from '@/comps/files/NewPieceRegistrar.vue';
import AddToCollection from '@/comps/AddToCollection.vue';
import RemoveFromCollection from '@/comps/RemoveFromCollection.vue';
import { Raga, Piece, Trajectory, Phrase } from '@/js/classes.ts';
import PermissionsModal from '@/comps/PermissionsModal.vue';
import { defineComponent } from 'vue';
import ContextMenu from '@/comps/ContextMenu.vue';
import FilterableTable from '@/comps/FilterableTable.vue';
import { 
  ContextMenuOptionType, 
  UserType, 
  CollectionType,
  TransMetadataType,
  RecType,
  NewPieceInfoType,
  RagaNewPieceInfoType,
  PassedDataType,
  FilterableTableType,
  SortFuncType,
  GetDisplayType,
  UserCheckType,
} from '@/ts/types.ts';
import { SortState } from '@/ts/enums.ts';

type FileManagerDataType = {
  infoKeys: string[];
  designPieceModal: boolean;
  selectedPiece?: TransMetadataType,
  allPieces?: TransMetadataType[];
  allPieceInfo: PieceInfoType[];
  dropDownLeft: number;
  dropDownTop: number;
  dropDownWidth: number;
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
  passedInDataObj: string,
  editingTitle?: string,
  editingPermissions?: string,
  editOwnerModal: boolean,
  allUsers?: UserType[],
  allNames?: string[],
  editingUserIdx?: number,
  contextMenuClosed: boolean,
  contextMenuChoices: ContextMenuOptionType[],
  editableCols: CollectionType[],
  removableCols: CollectionType[],
  addToCollectionModalOpen: boolean,
  removeFromCollectionModalOpen: boolean,
  permissionsModalOpen: boolean,
  fileContainerHeight: number,
  userID?: string,
  ftLabels: FilterableTableType[],
}

type PieceInfoType = [string?, string?, string?, string?, string?, string?];

export default defineComponent({
  name: 'FileManager',
  data(): FileManagerDataType {
    return {
      infoKeys: [
        'Title',
        'Transcriber',
        'Raga',
        'Created',
        'Modified',
        'Editable',
      ],
      designPieceModal: false,
      allPieces: undefined,
      allPieceInfo: [],
      dropDownLeft: 200,
      dropDownTop: 300,
      dropDownWidth: 200,
      modalLeft: 200,
      modalTop: 200,
      deleteActive: true,
      selectedPiece: undefined,
      modalWidth: 650,
      modalHeight: 550,
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
      passedInDataObj: '',
      editTitleModal: false,
      editPermissionsModal: false,
      editOwnerModal: false,
      editingTitle: undefined,
      editingPermissions: undefined,
      allUsers: undefined,
      allNames: undefined,
      editingUserIdx: undefined,
      contextMenuClosed: true,
      contextMenuChoices: [],
      editableCols: [],
      addToCollectionModalOpen: false,
      removeFromCollectionModalOpen: false,
      removableCols: [],
      permissionsModalOpen: false,
      fileContainerHeight: 800,
      userID: undefined,
      ftLabels: [{
        label: 'Title',
        minWidth: 75,
        prioritization: 0,
        sortFunction: this.titleSorter as SortFuncType,
        growable: true,
        initSortState: SortState.down,
        getDisplay: this.getTitleDisplay as GetDisplayType
      },
      {
       label: 'Transcriber',
       minWidth: 125,
       prioritization: 1,
       sortFunction: this.transcriberSorter as SortFuncType,
        growable: true,
        initSortState: SortState.down,
        getDisplay: this.getTranscriberDisplay as GetDisplayType
      },
      {
        label: 'Raga',
        minWidth: 75,
        prioritization: 2,
        sortFunction: this.ragaSorter as SortFuncType,
        growable: true,
        initSortState: SortState.down,
        getDisplay: this.getRagaDisplay as GetDisplayType
      },
      {
        label: 'Created',
        minWidth: 105,
        prioritization: 3,
        sortFunction: this.createdSorter as SortFuncType,
        growable: true,
        initSortState: SortState.down,
        getDisplay: this.getCreatedDisplay as GetDisplayType
      },
      {
        label: 'Modified',
        minWidth: 110,
        prioritization: 4,
        sortFunction: this.modifiedSorter as SortFuncType,
        growable: true,
        initSortState: SortState.down,
        getDisplay: this.getModifiedDisplay as GetDisplayType
      },
      {
        label: 'Editable',
        minWidth: 105,
        prioritization: 5,
        sortFunction: this.editableSorter as SortFuncType,
        growable: true,
        initSortState: SortState.down,
        getDisplay: this.getEditableDisplay as GetDisplayType
      }
    ]
    };
  },

  components: {
    NewPieceRegistrar,
    ContextMenu,
    AddToCollection,
    RemoveFromCollection,
    PermissionsModal,
    FilterableTable,
  },

  props: {
    navHeight: {
      type: Number,
      required: true,
    },
  },

  async created() {
    window.addEventListener('keydown', this.handleKeydown);
    let id = '';
    if (this.$store.state.userID === undefined) {
      if (this.$cookies.get('userID') === undefined) {
        this.$router.push('/');
      } else {
        id = this.$cookies.get('userID') as string;
      }
    } else {
      id = this.$store.state.userID as string;
    }
    this.userID = id; 
    const sortKey = this.sortKeyNames[this.selectedSort];
    const sortDir = this.sorts[this.selectedSort];
    this.allPieces = await getAllPieces(id, sortKey, String(sortDir), true);
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
    this.fileContainerHeight = window.innerHeight - this.navHeight;
    window.addEventListener('resize', () => {
      this.fileContainerHeight = window.innerHeight - this.navHeight;
    });
    try {
      this.allUsers = await getAllUsers();
      if (this.allUsers !== undefined) {
        this.allNames = this.allUsers.map(user => {
          return user.name + ' (' + user.email + ' )'
        });
      } else {
        throw new Error('this.allUsers is undefined');
      }
      const userID = this.$store.state.userID!;
      this.editableCols = await getEditableCollections(userID);
      
    } catch (err) {
      console.log(err)
    }
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('resize', () => {
      this.fileContainerHeight = window.innerHeight - this.navHeight;
    });

  },

  methods: {

    handleDoubleClickEmit(item: TransMetadataType, el: HTMLElement) {
      this.openPieceAlt(item);
    },

    handleClickEmit(item: TransMetadataType, el: HTMLElement) {
      // this.selectedPiece = item;
      this.closeDropDown();
    },

    async handleRightClickEmit(item: TransMetadataType, e: MouseEvent, target: HTMLElement) {
      // this.handleRightClick(e);
      try {
        this.editableCols = await getEditableCollections(this.userID!);
        let addOptions = false;
        this.dropDownLeft = e.clientX;
        this.dropDownTop = e.clientY;
        this.modalLeft = e.clientX;
        this.modalTop = e.clientY;
        const width = window.innerWidth;
        const height = window.innerHeight - this.navHeight;
        if (this.modalLeft + this.modalWidth > width - 20) {
          this.modalLeft = width - 20 - this.modalWidth;
        }
        if (this.modalTop + this.modalHeight > height - 20) {
          this.modalTop = height - 20 - this.modalHeight;
        }
        if (this.dropDownLeft + this.dropDownWidth > width - 20) {
          this.dropDownLeft = width - 20 - this.dropDownWidth;
        }
        const cm = this.$refs.contextMenu as typeof ContextMenu;
        const cmElem = cm.$el as HTMLElement;
        const cmRect = cmElem.getBoundingClientRect();
        if (this.dropDownTop + cmRect.height > height - 20) {
          this.dropDownTop = height - 20 - cmRect.height;
        }
        this.designPieceModal = false;
        document.querySelectorAll('.selected').forEach((el) => {
          el.classList.remove('selected');
        });
        this.selectedPiece = item;
        this.contextMenuChoices = [];
        target.classList.add('selected');

        this.contextMenuChoices.push({
          text: 'New Transcription',
          enabled: true,
          action: () => {
            this.designNewPiece();
            this.contextMenuClosed = true;
            // find any with class selected and remove it
            document.querySelectorAll('.selected').forEach((el) => {
              el.classList.remove('selected');
            })
          }
        });
        this.contextMenuChoices.push({
          text: 'Open In Editor',
          enabled: true,
          action: () => {
            this.openPieceAlt();
            this.contextMenuClosed = true;
          }
        });
        this.contextMenuChoices.push({
          text: 'Open In Analyzer',
          enabled: true,
          action: () => {
            this.openInAnalyzer();
            this.contextMenuClosed = true;
          }
        });
        this.contextMenuChoices.push({
          text: 'Clone Transcription',
          enabled: true,
          action: () => {
            this.clonePiece();
            this.contextMenuClosed = true;
          }
        });
        this.contextMenuChoices.push({
          text: 'Edit Title',
          enabled: this.owned(item),
          action: () => {
            this.editTitle();
            this.contextMenuClosed = true;
          }
        });
        this.contextMenuChoices.push({
          text: 'Edit Permissions',
          enabled: this.owned(item),
          action: () => {
            this.permissionsModalOpen = true;
            this.contextMenuClosed = true;
          }
        });
        this.contextMenuChoices.push({
          text: 'Edit Owner',
          enabled: this.owned(item),
          action: () => {
            this.editOwner();
            this.contextMenuClosed = true;
          }
        });
        this.contextMenuChoices.push({
          text: 'Copy Link',
          enabled: true,
          action: () => {
            this.copyLink();
            this.contextMenuClosed = true;
          }
        });
        this.contextMenuChoices.push({
          text: 'Delete Transcription',
          enabled: this.owned(item),
          action: () => {
            this.deletePiece();
            this.contextMenuClosed = true;
          }
        });
        if (this.editableCols.length > 0) {
          this.contextMenuChoices.push({
            text: 'Add To Collection',
            enabled: true,
            action: () => {
              this.contextMenuClosed = true;
              this.addToCollectionModalOpen = true;
            }
          });
          this.removableCols = this.editableCols.filter(col => {
            return col.transcriptions.includes(this.selectedPiece!._id!)
          });
          if (this.removableCols.length > 0) {
            this.contextMenuChoices.push({
              text: 'Remove From Collection',
              enabled: true,
              action: () => {
                this.contextMenuClosed = true;
                this.removeFromCollectionModalOpen = true;
              }
            });
          }
        };


        


        this.contextMenuClosed = false;








      } catch (err) {
        console.log(err)
      }
    },

    titleSorter(a: TransMetadataType, b: TransMetadataType) {
      const titleA = a.title.toLowerCase();
      const titleB = b.title.toLowerCase();

      if (titleA < titleB) {
        return -1;
      }
      if (titleA > titleB) {
        return 1;
      }
      return 0;
    },

    transcriberSorter(a: TransMetadataType, b: TransMetadataType) {
      const familyNameA = a.family_name.toLowerCase();
      const familyNameB = b.family_name.toLowerCase();
      const givenNameA = a.given_name.toLowerCase();
      const givenNameB = b.given_name.toLowerCase();
      if (familyNameA < familyNameB) {
        return -1;
      }
      if (familyNameA > familyNameB) {
        return 1;
      }
      if (givenNameA < givenNameB) {
        return -1;
      }
      if (givenNameA > givenNameB) {
        return 1;
      }
      return 0;
    },

    ragaSorter(a: TransMetadataType, b: TransMetadataType) {
      const ragaA = a.raga.name.toLowerCase();
      const ragaB = b.raga.name.toLowerCase();
      if (ragaA < ragaB) {
        return -1;
      }
      if (ragaA > ragaB) {
        return 1;
      }
      return 0;
    },

    createdSorter(a: TransMetadataType, b: TransMetadataType) {
      const dateA = new Date(a.dateCreated);
      const dateB = new Date(b.dateCreated);
      if (dateA < dateB) {
        return -1;
      }
      if (dateA > dateB) {
        return 1;
      }
      return 0;
    },

    modifiedSorter(a: TransMetadataType, b: TransMetadataType) {
      const dateA = new Date(a.dateModified);
      const dateB = new Date(b.dateModified);
      if (dateA < dateB) {
        return -1;
      }
      if (dateA > dateB) {
        return 1;
      }
      return 0;
    },

    editableSorter(a: TransMetadataType, b: TransMetadataType) {
      const id = this.$store.state.userID!;
      const aEdit = this.permissionToEdit(a);
      const bEdit = this.permissionToEdit(b);
      if (aEdit && !bEdit) {
        return -1;
      }
      if (!aEdit && bEdit) {
        return 1;
      }
      return 0;
    },


    getTitleDisplay(item: TransMetadataType) {
      return item.title;
    },

    getTranscriberDisplay(item: TransMetadataType) {
      return item.given_name + ' ' + item.family_name;
    },

    getRagaDisplay(item: TransMetadataType) {
      return item.raga.name;
    },

    getCreatedDisplay(item: TransMetadataType) {
      return this.writeDate(new Date(item.dateCreated));
    },

    getModifiedDisplay(item: TransMetadataType) {
      return this.writeDate(new Date(item.dateModified));
    },

    getEditableDisplay(item: TransMetadataType) {
      return this.permissionToEdit(item) ? 'Yes' : 'No';
    },

    async closeCollectionsModal() {
      this.addToCollectionModalOpen = false;
      this.removeFromCollectionModalOpen = false;
      document.querySelectorAll('.selected').forEach((el) => {
        el.classList.remove('selected');
      });
      try {
        const userID = this.$store.state.userID!;
        this.editableCols = await getEditableCollections(userID);
      } catch (err) {
        console.log(err)
      }
    },

    async acceptNewPieceInfo(newPieceInfo: NewPieceInfoType) {
      try {
        if (newPieceInfo.clone) {
          const id = newPieceInfo.origID;
          const title = newPieceInfo.title;
          const perm = newPieceInfo.permissions;
          const expPerm = newPieceInfo.explicitPermissions;
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
            given_name: given_name,
            explicitPermissions: expPerm,
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
      this.designPieceModal = false
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
      const originalOwnerID = this.selectedPiece!.userID!;
      const ownerObj = this.allUsers![this.editingUserIdx!];
      try {
        await updateTranscriptionOwner(id, ownerObj, originalOwnerID);
        await this.updateSort();
      } catch (err) {
        console.log(err);
      }
      this.editOwnerModal = false;
    },

    pieceInfo(p: TransMetadataType): PieceInfoType {
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
      const dateCreated = this.writeDate(new Date(p.dateCreated));
      const dateModified = this.writeDate(new Date(p.dateModified));
      const editable = this.permissionToEdit(p) ? 'Yes' : 'No';
      return [title, name, raga, dateCreated, dateModified, editable];
    },

    writeDate(d: Date) {
      const date = new Date(d);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      return month + '/' + day + '/' + year;
    },

    openPieceAlt(piece?: TransMetadataType) {
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
      this.designPieceModal = true;
      this.passedInDataObj = '';
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
      try {
        let audioEvent, audioRecording;
        if (piece.audioID !== undefined) {
          audioRecording = await getAudioRecording(piece.audioID);
          audioEvent = await getAudioEvent(audioRecording!.parentID!);
        }
        const dataObj: PassedDataType = {
          title: piece.title + ' (clone)',
          raga: piece.raga,
          audioEvent: audioEvent ? audioEvent.name : undefined,
          audioRecording: audioRecording ? audioRecording : undefined,
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
      if (isUser) {
        // const dropDown = this.$refs.dropDown as HTMLElement;
        // dropDown.classList.add('closed');
        this.closeDropDown()
        const res = await deletePiece(this.selectedPiece);
        if (res.deletedCount === 1) {
          const id = this.$store.state.userID!;
          const sortKey = this.sortKeyNames[this.selectedSort];
          const sortDir = this.sorts[this.selectedSort];
          this.allPieces = await getAllPieces(id, sortKey, sortDir, true);
          this.allPieces.forEach( (piece, i) => {
            this.allPieceInfo[i] = this.pieceInfo(piece);
          });
        }
      }
    },

    // async renewPieces() {
    //   const id = this.$store.state.userID!;
    //   const sortKey = this.sortKeyNames[this.selectedSort];
    //   const sortDir = this.sorts[this.selectedSort];
    //   this.allPieces = await getAllPieces(id, sortKey, sortDir, true);
    //   this.allPieces.forEach( (piece, i) => {
    //     this.allPieceInfo[i] = this.pieceInfo(piece);
    //   });
    // },
    

    async updateSort() {
      console.log('updateSort')
      const id = this.$store.state.userID!;
      const sortKey = this.sortKeyNames[this.selectedSort];
      const sortDir = this.sorts[this.selectedSort];
      try {
        this.allPieces = await getAllPieces(id, sortKey, sortDir, true);
        this.allPieces.forEach(async (piece, i) => {
          this.allPieceInfo[i] = this.pieceInfo(piece);
        });
      } catch (err) {
        console.log(err);
      }
      
    },

    async handleRightClick(e: MouseEvent) {
      e.preventDefault();
      try {
        const userID = this.$store.state.userID!;
        this.editableCols = await getEditableCollections(userID);
      } catch (err) {
        console.log(err)
      }
      this.$nextTick(() => {
        let addOptions = false;
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
        const cm = this.$refs.contextMenu as typeof ContextMenu;
        const cmElem = cm.$el as HTMLElement;
        const cmRect = cmElem.getBoundingClientRect();
        if (this.dropDownTop + cmRect.height > rect.height - 20) {
          this.dropDownTop = rect.height - 20 - cmRect.height;
        }
        this.designPieceModal = false;
        document.querySelectorAll('.selected').forEach((el) => {
          el.classList.remove('selected');
        });
        let el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
        const parentNode = el.parentNode as HTMLElement;
        if (el.classList[0] === 'overflowX') {
          el = el.parentElement!.parentElement!;
        }
        if (el.classList[0] === 'fileInfoRow') {
          addOptions = true;
          const num = Number(el.id.slice(3));
          el.classList.add('selected');
          this.selectedPiece = this.allPieces![num];
          if (this.allPieces![num].userID === this.$store.state.userID) {
            this.deleteActive = true;
          } else {
            this.deleteActive = false;
          }
        } else if (parentNode.classList[0] === 'fileInfoRow') {
          addOptions = true;
          const num = Number(parentNode.id.slice(3));
          parentNode.classList.add('selected');
          this.selectedPiece = this.allPieces![num];
          if (this.allPieces![num].userID === this.$store.state.userID) {
            this.deleteActive = true;
          } else {
            this.deleteActive = false;
          }
        } else {
          this.deleteActive = false;
        }
        if (addOptions) {
          this.contextMenuClosed = false;
          this.contextMenuChoices = [];
          this.contextMenuChoices.push({
            text: 'New Transcription',
            enabled: true,
            action: () => {
              this.designNewPiece();
              this.contextMenuClosed = true;
              // find any with class selected and remove it
              document.querySelectorAll('.selected').forEach((el) => {
                el.classList.remove('selected');
              });
            }
          });
          if (true) {
            this.contextMenuChoices.push({
              text: 'Open In Editor',
              enabled: true,
              action: () => {
                this.openPieceAlt();
                this.contextMenuClosed = true;
              }
            });
            this.contextMenuChoices.push({
              text: 'Open In Analyzer',
              enabled: true,
              action: () => {
                this.openInAnalyzer();
                this.contextMenuClosed = true;
              }
            });
            this.contextMenuChoices.push({
              text: 'Clone Transcription',
              enabled: true,
              action: () => {
                this.clonePiece();
                this.contextMenuClosed = true;
              }
            });
            this.contextMenuChoices.push({
              text: 'Edit Title',
              enabled: this.deleteActive,
              action: () => {
                this.editTitle();
                this.contextMenuClosed = true;
              }
            });
            this.contextMenuChoices.push({
              text: 'Edit Permissions',
              enabled: this.deleteActive,
              action: () => {
                this.permissionsModalOpen = true;
                this.contextMenuClosed = true;
              }
            })
            this.contextMenuChoices.push({
              text: 'Edit Owner',
              enabled: this.deleteActive,
              action: () => {
                this.editOwner();
                this.contextMenuClosed = true;
              }
            });
            this.contextMenuChoices.push({
              text: 'Copy Link',
              enabled: true,
              action: () => {
                this.copyLink();
                this.contextMenuClosed = true;
              }
            });
            this.contextMenuChoices.push({
              text: 'Delete Transcription',
              enabled: this.deleteActive,
              action: () => {
                this.deletePiece();
                this.contextMenuClosed = true;
              }
            });
            if (this.editableCols.length > 0) {
              this.contextMenuChoices.push({
                text: 'Add To Collection',
                enabled: true,
                action: () => {
                  this.contextMenuClosed = true;
                  this.addToCollectionModalOpen = true;
                }
              });
              this.removableCols = this.editableCols.filter(col => {
                return col.transcriptions.includes(this.selectedPiece!._id!)
              });
              if (this.removableCols.length > 0) {
                this.contextMenuChoices.push({
                  text: 'Remove From Collection',
                  enabled: true,
                  action: () => {
                    this.contextMenuClosed = true;
                    this.removeFromCollectionModalOpen = true;
                  }
                });
              }
            };
            

          }
        }
      })
      
    },

    closeDropDown() {
      this.contextMenuClosed = true;
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

    permissionToView(transcription: TransMetadataType) {
      const ep = transcription.explicitPermissions;
      const id = this.$store.state.userID!;
      return ep.publicView || 
        transcription.userID === id ||
        ep.edit.includes(id) ||
        ep.view.includes(id);
    },

    permissionToEdit(transcription: TransMetadataType) {
      const ep = transcription.explicitPermissions;
      const id = this.$store.state.userID!;
      return transcription.userID === id || ep.edit.includes(id);
    },

    owned(transcription: TransMetadataType) {
      return transcription.userID === this.userID;
    },
  },
});
</script>

<style scoped>
.fileContainer {
  display: flex;
  flex-direction: column;
  height: v-bind(fileContainerHeight + 'px');
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
.dropDown_ {
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

.dropDown_.closed {
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

::v-deep .selected {
  background-color: #3e4a40;
}

::v-deep .selected:hover {
  background-color: #3e4a40;
}
</style>
