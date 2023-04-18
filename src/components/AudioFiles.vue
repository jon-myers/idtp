<template>
  <div class='main'>
    <div class='fileContainer'>
      <div class='fileInfoKeys'>
        <div v-for="(ik, idx) in infoKeys" :key='ik' :class='"infoKeyTop "+`idx${idx}`'>
          {{ik}}
        </div>
      </div>
      <div :class='`fileInfo${piece.performers.length}`' v-for="(piece, pIdx) in allAudioFiles" :key="piece">
        <div :class='"infoKey " + `idx${i}`' v-for="(info, i) in audioFileInfo(piece)" :key="info">
          <div class='performerColumn' v-if='i === 1 || i === 2'>
            <div v-for="(item, k) in info" :key='item' 
              :class='`pColItem${k < info.length - 1 ? "Top" : "Bottom"}`'>
              {{item}}
            </div>
          </div>
          <div v-else>
            {{info}}
          </div>
        </div>
        <button @click='playAudio(pIdx)'>{{['play', 'pause'][Number(playingIdx === pIdx)]}}</button>
      </div>
      <div class='addEventRow'>
        <button @click='toggleAddEvent'>Add new Audio Event</button>
      </div>
    </div>
    
    <AddAudioEvent v-if='showAddEvent' class='audioEventPopup' />
      
    
    <!-- <div>
      <input ref='file' @change='handleFileUpload' type='file'>
    </div> -->  
  </div>
</template>
<script>
import { getAllAudioFileMetaData, getAllAudioEventMetadata } from '@/js/serverCalls.mjs';

import AddAudioEvent from '@/components/AddAudioEvent.vue';
const displayTime = dur => {
  const hours = Math.floor(dur / 3600);
  let minutes = Math.floor((dur - hours * 3600) / 60);
  let seconds = dur % 60;
  if (seconds.toString().length === 1) seconds = '0' + seconds;
  if (hours !== 0) {
    if (minutes.toString().length === 1) minutes = '0' + minutes;
    return ([hours, minutes, seconds]).join(':')
  } else {
    return minutes + ':' + seconds 
  }
}

export default {
  name: 'AudioFiles',
  
  data() {
    return {
      infoKeys: [
        'Raga',
        'Performer(s)',
        'Instrumentation',
        'Year',
        'Duration',  
      ],
      playingIdx: undefined,
      // getAllAudioFileMetaData: getAllAudioFileMetaData,
      allAudioFiles: undefined,
      allAudioEvents: undefined,
      colHeight: 30,
      colWidths: [100, 180, 150, 80, 100],
      showAddEvent: false
    }
  },
  components: {
    AddAudioEvent
  },
  
  created() {
    getAllAudioFileMetaData()
      .then(aa => this.allAudioFiles = aa)
      
    getAllAudioEventMetadata()
      .then(aa => this.allAudioEvents = aa)
  },
  
  computed: {
    
    playing(idx) {
      return this.playingIdx === idx
    }
  },
  
  mounted() {  
  },
  
  methods: {
    
    audioFileInfo(p) {
      const raga = p.raag;
      const performers = p.performers.map(obj => Object.keys(obj)[0]);
      const instrumentation = p.performers.map(obj => Object.values(obj)[0]);
      const year = p.year;
      const duration = displayTime(p.duration);
      return [raga, performers, instrumentation, year, duration]
    },
    
    // handleFileUpload(f) {
    //   console.log('handling file');
    //   const file = f.target.files[0];
    //   console.log(file);
    //   uploadFile(file)
    // },
    
    toggleAddEvent() {
      this.showAddEvent = Boolean(Math.abs(this.showAddEvent - 1))
    },
    
    
    // playAudio(idx) {
    //   if (this.playingIdx == idx)
    //   this.playingIdx = idx
    // }
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

.fileInfo1 {
  width: 100%;
  height: v-bind(colHeight+'px');
  background-color: white;
  border-bottom: 1px solid black;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.fileInfo2 {
  width: 100%;
  height: v-bind(2*colHeight+'px');
  background-color: white;
  border-bottom: 1px solid black;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.fileInfo3 {
  width: 100%;
  height: v-bind(3*colHeight+'px');
  background-color: white;
  border-bottom: 1px solid black;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.fileInfo4 {
  width: 100%;
  height: v-bind(4*colHeight+'px');
  background-color: white;
  border-bottom: 1px solid black;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.fileInfo5 {
  width: 100%;
  height: v-bind(5*colHeight+'px');
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

.idx0 {
  width: v-bind(colWidths[0]+'px');
  min-width: v-bind(colWidths[0]+'px')
}

.idx1 {
  width: v-bind(colWidths[1]+'px');
  min-width: v-bind(colWidths[1]+'px')
}

.idx2 {
  width: v-bind(colWidths[2]+'px');
  min-width: v-bind(colWidths[2]+'px')
}

.idx3 {
  width: v-bind(colWidths[3]+'px');
  min-width: v-bind(colWidths[3]+'px')
}

.idx4 {
  width: v-bind(colWidths[4]+'px');
  min-width: v-bind(colWidths[4]+'px')
}

.infoKey {
  display: flex;
  justify-content: center;
  align-items: center;
  /* width: 150px; */
  height: 100%;
  border-right: 1px solid black;
}

.infoKeyTop {
  display: flex;
  justify-content: center;
  align-items: center;
  /* width: 150px; */
  height: 100%;
  border-right: 1px solid black;
}



.performerColumn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  height: 100%;
}

.pColItemTop {
  border-bottom: 1px dotted black;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pColItemBottom {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
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
  top: 10vh;
  left: 10vw;
  width: 80vw;
  height: 80vh;
}

</style>
