<template>
<div 
  class='fileContainer' 
  @contextmenu='handleRightClick'
  @click='handleClick'
  ref='fileContainer'
  >
  <div class='fileInfoKeys'>
    <div 
      v-for="(ik, idx) in infoKeys" 
      :key='ik' 
      :class='`infoKey ${["", "first"][Number(idx === 0)]}`'
      >
      {{ik}}
    </div>
  </div>
  <div class='fileInfoRowScroller'>
    <div 
      class='fileInfoRow' 
      v-for="(piece, i) in allPieces" 
      :key="piece"
      @dblclick='openPieceAlt(piece)'
      :id='`fir${i}`'>
      <div 
        :class='`infoKey ${["", "first"][Number(idx === 0)]}`' 
        v-for="(info, idx) in allPieceInfo[i]" 
        :key="info">
        {{info}}
      </div>
    </div>
  </div>
</div>
<div class='dropDown closed' ref='dropDown' v-show='showDropDown'>
  <div 
    :class='`dropDownRow ${["last", ""][Number(delete_)]}`' 
    @click='designNewPiece()'>
    New Transcription
  </div>
  <div 
    v-if='delete_' 
    :class='`dropDownRow last ${["inactive", ""][Number(deleteActive)]}`'
    @click='deletePiece'>
    Delete
  </div>
</div>
<div v-if="designPieceModal" class='designPieceModal'>
  <NewPieceRegistrar
    ref='newPieceRegistrar'
    :modalWidth='modalWidth'
    :modalHeight='modalHeight'
   />
</div>
</template>
<script>
import {
  getAllPieces,
  createNewPiece,
  deletePiece,
  getRaagRule,
  nameFromUserID
} from '@/js/serverCalls.js';
import NewPieceRegistrar from '@/components/NewPieceRegistrar.vue';
import {
  Raga,
  Piece, 
  Trajectory,
  Phrase
} from '@/js/classes.js';

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
        'Permissions'
      ],
      designPieceModal: false,
      getAllPieces: getAllPieces,
      allPieces: undefined,
      allPieceInfo: [],
      showDropDown: true,
      dropDownLeft: 200,
      dropDownTop: 300,
      dropDownWidth: 200,
      delete_: true,
      deleteActive: true,
      selectedPiece: undefined,
      modalWidth: 600,
      modalHeight: 450
    }
  },
  
  components: {
    NewPieceRegistrar
  },

  async created() {
    
    window.addEventListener('keydown', this.handleKeydown);
    if (this.$store.state.userID === undefined) {
      this.$router.push('/')
    }
    this.allPieces = await getAllPieces(this.$store.state.userID);
    this.allPieces.forEach(() => {
      this.allPieceInfo.push([
        undefined, 
        undefined, 
        undefined, 
        undefined, 
        undefined
      ]);
    });
    this.allPieces.forEach(async (piece, i) => {
      this.allPieceInfo[i] = await this.pieceInfo(piece)
    })
  },

  mounted() {
    this.emitter.on('newPieceInfo', async newPieceInfo => {
      const npi = Object.assign({}, newPieceInfo);
      const rsRes = await getRaagRule(npi.raga)
      const ruleSet = rsRes.rules;
      npi.raga = new Raga({
        name: npi.raga,
        ruleSet: ruleSet
      });
      npi.phrases = [new Phrase({ 
        trajectories: [new Trajectory({ 
          id: 12, 
          durTot: 5, 
          fundID12: npi.raga.fundamental 
        })],  
      })]
      this.createNewPiece(npi);
    });

  },
  
  beforeUnmount() {
    this.emitter.off('newPieceInfo');
    window.removeEventListener('keydown', this.handleKeydown);
  },

  methods: {

    async pieceInfo(p) {
      const title = p.title;
      const raga = p.raga.name;
      let name = undefined;
      if (p.userID) {
        if (p.userID === this.$store.state.userID) {
          name = 'You'
        } else {
          name = await nameFromUserID(p.userID);
        }
      }
      const dateCreated = this.writeDate(p.dateCreated);
      const dateModified = this.writeDate(p.dateModified);
      const permissions = p.permissions;
      return [title, name, raga, dateCreated, dateModified, permissions]
    },

    writeDate(d) {
      const date = new Date(d)
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      return month + '/' + day + '/' + year
    },
    
    openPieceAlt(piece) {
      this.$store.commit('update_id', piece._id);
      console.log('this always happens: ' + piece._id)
      this.$cookies.set('currentPieceId', piece._id);
      this.$router.push('/altEditor')
    },

    designNewPiece() {
      this.$refs.dropDown.classList.add('closed')
      this.designPieceModal = true
    },

    createNewPiece(obj) {
      const piece = obj ? new Piece(obj) : new Piece;
      piece.userID = this.$store.state.userID;
      createNewPiece(piece)
        .then(data => {
          this.$store.commit('update_id', data.insertedId);
          this.$cookies.set('currentPieceId', data.insertedId);
          this.$router.push('/altEditor');
        })
    },

    async deletePiece() {
      this.$refs.dropDown.classList.add('closed')  
      const res = await deletePiece(this.selectedPiece);
      if (res.ok) {
        this.allPieces = await getAllPieces(this.$store.state.userID)
      }
    },
    
    handleRightClick(e) {
      e.preventDefault();
      this.dropDownLeft = e.clientX;
      this.dropDownTop = e.clientY;
      this.modalLeft = e.clientX;
      this.modalTop = e.clientY;
      const rect = this.$refs.fileContainer.getBoundingClientRect();
      if (this.modalLeft + this.modalWidth > rect.width - 20) {
        this.modalLeft = rect.width - 20 - this.modalWidth
      }
      if (this.modalTop + this.modalHeight > rect.height - 20) {
        this.modalTop = rect.height - 20 - this.modalHeight
      }
      this.designPieceModal = false;
      
      document.querySelectorAll('.selected').forEach(el => {
        el.classList.remove('selected')
      });
      this.$refs.dropDown.classList.remove('closed');
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el.classList[0] === 'fileInfoRow') {
        const num = el.id.slice(3);
        el.classList.add('selected');
        this.selectedPiece = this.allPieces[num];
        this.delete_ = true;
        if (this.allPieces[num].userID === this.$store.state.userID) {
          this.deleteActive = true
        } else {
          this.deleteActive = false
        }
      } else if (el.parentNode.classList[0] === 'fileInfoRow') {
        const num = el.parentNode.id.slice(3);
        el.parentNode.classList.add('selected');
        this.selectedPiece = this.allPieces[num];
        this.delete_ = true;
        if (this.allPieces[num].userID === this.$store.state.userID) {
          this.deleteActive = true
        } else {
          this.deleteActive = false
        }
      } else {
        this.delete_ = false;
        this.deleteActive = false;
      }
    },
    
    closeDropDown() {
      this.$refs.dropDown.classList.add('closed');
      document.querySelectorAll('.selected').forEach(el => {
        el.classList.remove('selected')
      });
    },
    
    handleClick() {
      this.designPieceModal = false;
      this.closeDropDown()
    },
    
    handleKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeDropDown();
        if (this.designPieceModal) {
          this.designPieceModal = false
        }
      }
    }
  }
}
</script>

<style scoped>
.fileContainer {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-image: linear-gradient(black, #1e241e);
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
  background-color: #2b332c
}

.fileInfoRow.selected {
  background-color: #2b332c
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
  width: v-bind(modalWidth+'px');
  height: v-bind(modalHeight+'px');
  border: 1px solid black;
  position: fixed;
  left: v-bind(modalLeft+'px');
  top: v-bind(modalTop+'px');
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

button {
  margin-left: 20px;
  cursor: pointer;
}
</style>
