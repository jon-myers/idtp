<template>
<div class='fileContainer'>
  <div class='fileInfoKeys'>
    <div v-for="ik in infoKeys" :key='ik' class='infoKey'>
      {{ik}}
    </div>
  </div>
  <div class='fileInfo' v-for="piece in allPieces" :key="piece">
    <div class='infoKey' v-for="info in pieceInfo(piece)" :key="info">{{info}}</div>
    <button @click='openPiece(piece)'>open</button>
    <button @click='openPieceAlt(piece)'>open in alt editor</button>
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
  getRaagRule
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
        'Date Modified'
      ],
      designPieceModal: false,
      getAllPieces: getAllPieces,
      allPieces: undefined,
    }
  },
  components: {
    NewPieceRegistrar
  },

  created() {
    getAllPieces()
      .then(ap => this.allPieces = ap)
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
        trajectories: [new Trajectory({ id: 12, durTot: 5, fundID12: npi.raga.fundamental })],
      
      })]
      // console.log(npi);
      this.createNewPiece(npi);
    });

  },
  
  beforeUnmount() {
    this.emitter.off('newPieceInfo')
  },

  methods: {

    pieceInfo(p) {
      const title = p.title;
      const raga = p.raga.name;
      const transcriber = p.transcriber;
      const dateCreated = this.writeDate(p.dateCreated);
      const dateModified = this.writeDate(p.dateModified);
      return [title, transcriber, raga, dateCreated, dateModified]
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
            getAllPieces()
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
}

.fileInfo {
  width: 100%;
  height: 40px;
  background-color: white;
  border-bottom: 1px solid black;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

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
