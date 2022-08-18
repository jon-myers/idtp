<template>
  <div class="formContainer">
    <div class="formRow">
      <label>Title</label>
      <input v-model="title"/>
    </div>
    <div class="formRow">
      <label>Transcriber</label>
      <input v-model="transcriber"/>
    </div>
    <div class="formRow">
      <label>Raga</label>
      <input v-model="raga"/>
    </div>
    <div class='buttonRow'>
      <button @click="makeNewPiece">submit</button>
      <button @click="cancel">cancel</button>
    </div>
  </div>
  
</template>
<script>


export default {
  name: 'NewPieceRegistrar',
  data() {
    return {
      title: undefined,
      transcriber: undefined,
      raga: undefined
    }
  },
  methods: {
    
    makeNewPiece() {
      const newPieceInfo = {
        title: this.title,
        transcriber: this.transcriber,
        raga: this.raga
      }
      this.emitter.emit('newPieceInfo', newPieceInfo);
      this.emitter.emit('closeModal');
    },
    
    cancel() {
      this.emitter.emit('closeModal')
    }
    
  }
}
</script>

<style scoped>

.formContainer {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
}

.formRow {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
}

label {
  /* padding-left: 20px;
  padding-right: 20px; */
  width: 100px;
  display: flex;
  flex-direction: row;
  justify-content: left;
  padding-left: 20px;
}

input {
  width: 200px;
}

button {
  width: 80px;
  height: 25px;
  cursor: pointer;
}

.buttonRow {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  width: 100%;
}


</style>
