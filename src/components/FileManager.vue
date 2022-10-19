<template>
<div class='fileContainer'>
  <div class='fileInfoKeys'>
    <div v-for="ik in infoKeys" :key='ik' class='infoKey'>
      {{ik}}
    </div>
  </div>
  <div 
    class='fileInfoRow' 
    v-for="(piece, i) in allPieces" 
    :key="piece"
    @dblclick='openPieceAlt(piece)'>
    <div class='infoKey' v-for="info in allPieceInfo[i]" :key="info">{{info}}</div>
    <!-- <button @click='openPiece(piece)'>open</button> -->
    <!-- <button @click='openPieceAlt(piece)'>open</button> -->
    <!-- <button @click='deletePiece(piece)'>delete</button> -->
  </div>
  <div class='addNewPiece' @click="designNewPiece()">Add new Piece ...</div>
</div>
<div v-if="designPieceModal" class='designPieceModal'>
  <NewPieceRegistrar />
</div>

<!-- <div v-if="designPieceModal" class='designPieceModal'>
  <NewPieceRegistrar />
</div> -->
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
      allPieceInfo: []
    }
  },
  components: {
    NewPieceRegistrar
  },

  async created() {
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

    this.emitter.on('closeModal', () => {
      this.designPieceModal = false
    });
    this.emitter.on('newPieceInfo', async newPieceInfo => {
      const npi = Object.assign({}, newPieceInfo);
      const rsRes = await getRaagRule(npi.raga)
      const ruleSet = rsRes.rules;
      // console.log('just before: ', ruleSet);
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
    this.emitter.off('newPieceInfo')
  },

  methods: {

    async pieceInfo(p) {
      const title = p.title;
      const raga = p.raga.name;
      let name = undefined;
      if (p.userID) name = await nameFromUserID(p.userID);
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

    openPiece(piece) {
      const _id = piece._id;
      this.$store.commit('update_id', _id)
      this.$router.push('/editor')
    },
    
    openPieceAlt(piece) {
      this.$store.commit('update_id', piece._id)
      this.$router.push('/altEditor')
    },

    designNewPiece() {
      this.designPieceModal = true
    },

    createNewPiece(obj) {
      const piece = obj ? new Piece(obj) : new Piece;
      piece.userID = this.$store.state.userID;
      createNewPiece(piece)
        .then(data => {
          this.$store.commit('update_id', data.insertedId);
          this.$router.push('/altEditor');
        })
    },

    deletePiece(piece) {
      deletePiece(piece)
        .then(res => {
          if (res.ok) {
            getAllPieces(this.$store.state.userID)
              .then(ap => this.allPieces = ap)
          }
        })
    },





  }
}
</script>

<style scoped>
.fileContainer {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  /* user-select: none; */
}

.fileInfoRow {
  width: 100%;
  height: 40px;
  background-color: white;
  border-bottom: 1px solid black;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  cursor: pointer;
  /* pointer-events: none; */
}

/* .fileInfoRow * {
  user-select: none
} */

.fileInfoKeys {
  width: 100%;
  height: 30px;
  background-color: #6de6f7;
  border-bottom: 1px solid black;
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
  border-right: 1px solid black;
  user-select: none;
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
  width: 650px;
  height: 500px;
  background-color: lightgrey;
  border: 1px solid black;
  position: fixed;
  top: calc(50vh - 100px);
  left: calc(50vw - 175px);

}

button {
  margin-left: 20px;
  cursor: pointer;
}
</style>
