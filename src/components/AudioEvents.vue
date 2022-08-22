<template>
  <div class='main'>
    <div class='fileContainer'>
      <div 
        class='audioEventRow' 
        v-for='audioEvent in allAudioEvents'
        :key='audioEvent.name'>
        <div class='audioEventNameRow' @dblclick='toggleDisplay($event, audioEvent, true)'>
          <span @click='toggleDisplay($event, audioEvent)'>&#9654;</span>
          <label>{{audioEvent.name}}</label>
          <button @click='openEditWindow(audioEvent._id)'>Edit</button>
        </div>
        <div :class='`audioRecordingRowOuter height${getHeight(audioEvent)}`' v-show='audioEvent.visible'>
          <div :class='`audioRecordingRowSpacer height${getHeight(audioEvent)}`'>
          </div>
          <div class='audioRecordingCol'>
            <div 
              :class='`audioRecordingRow height${getRaagHeight(audioEvent.recordings[recKey])}`' 
              v-for='recKey in Object.keys(audioEvent.recordings)'
              :key='audioEvent.recordings[recKey].audioFileId'
              @dblclick='sendAudioSource($event, audioEvent.recordings[recKey].audioFileId)'>
              <span class='recordingNum'>{{`${Number(recKey)+1}. `}}</span>
              <div :class='`soloist height${getRaagHeight(audioEvent.recordings[recKey])}`'>
                <span>
                  {{getSoloist(audioEvent.recordings[recKey])}}
                </span>
              </div>
              
              <div :class='`raagNameCol height${getRaagHeight(audioEvent.recordings[recKey])}`'>
                <div 
                  class='raagName' 
                  v-for='raag in getRaags(audioEvent.recordings[recKey])'
                  :key='raag'>
                  <span>{{raag}}
                  </span>
                </div>
              </div>
              
              <div :class='`performanceSectionCol height${getRaagHeight(audioEvent.recordings[recKey])}`'>
                <div 
                  class='performanceSections' 
                  v-for='raag in getRaags(audioEvent.recordings[recKey])'
                  :key='raag'>
                  <span>
                    {{getPSecs(audioEvent.recordings[recKey].raags[raag])}}
                  </span>
                </div>
              </div>
              
              <!-- <div :class='`playCol height${getRaagHeight(audioEvent.recordings[recKey])}`'>
                  <audio controls :class='`height${getRaagHeight(audioEvent.recordings[recKey])}`'>
                    <source 
                      :src='`https://swara.studio/audio/mp3/${audioEvent.recordings[recKey].audioFileId}.mp3`' 
                      type='audio/mpeg'>
                  </audio>
                  
              </div> -->
              
            </div>
          </div>
          
        </div>
      </div>
      <div class='addEventRow'>
        <button @click='toggleAddEvent'>Add new Audio Event</button>
      </div>
    </div>
    
    <AddAudioEvent 
      v-if='showAddEvent' 
      class='audioEventPopup' 
      ref='addAudioEvent'
      :extUniqueId='editingId'/>
    <AudioPlayer v-if='true' :audioSource='audioSource'/>
      
    
    <!-- <div>
      <input ref='file' @change='handleFileUpload' type='file'>
    </div> -->  
  </div>
</template>
<script>
import { getAllAudioEventMetadata } from '@/js/serverCalls.js';

import AddAudioEvent from '@/components/AddAudioEvent.vue';
import AudioPlayer from '@/components/AudioPlayer.vue';
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
  name: 'AudioEvents',
  
  data() {
    return {
      infoKeys: [
        'Name', 
      ],
      playingIdx: undefined,
      // getAllAudioFileMetaData: getAllAudioFileMetaData,
      allAudioEvents: undefined,
      performers: undefined,
      colHeight: 30,
      colWidths: [100, 180, 150, 80, 100],
      showAddEvent: false,
      recHeight: 30,
      editingId: undefined,
      audioSource: undefined
    }
  },
  components: {
    AddAudioEvent, AudioPlayer
  },
  
  created() {
      
    getAllAudioEventMetadata()
      .then(aa => {
        this.allAudioEvents = aa
      })
  },
  
  computed: {
    
    playing(idx) {
      return this.playingIdx === idx
    },
    
    
  },
  
  mounted() {  
  },
  
  methods: {
    
    sendAudioSource(e, _id) {
      const playing = document.querySelector('.playing');
      if (playing) {
        playing.classList.remove('playing')
      }
      e.target.classList.add('playing');
      this.audioSource = `https://swara.studio/audio/mp3/${_id}.mp3`;
    },
    
    getRaags(recording) {
      return Object.keys(recording.raags)
    },
    
    getSoloist(recording) {
      // get soloist _and_ instrument
      const soloist = Object.entries(recording.musicians)
                        .filter(c => c[1].role === 'Soloist')[0][0];
      const instrument = recording.musicians[soloist].instrument;
      return soloist + ', ' + instrument
    },
    
    getPSecs(raag) {
      return Object.keys(raag['performance sections']).join(', ')
    },
    
    audioFileInfo(p) {
      const raga = p.raag;
      const performers = p.performers.map(obj => Object.keys(obj)[0]);
      const instrumentation = p.performers.map(obj => Object.values(obj)[0]);
      const year = p.year;
      const duration = displayTime(p.duration);
      return [raga, performers, instrumentation, year, duration]
    },
    
    
    toggleAddEvent() {
      this.showAddEvent = Boolean(Math.abs(this.showAddEvent - 1))
    },
    
    toggleDisplay(t, audioEvent, parent) {
      // console.log(t, audioEvent, parent)
      const target = parent ? t.target.children.item(0) : t.target;
      if (target.className === '') {
        target.className = 'rotated';
        audioEvent.visible = true
      } else {
        target.className = '';
        audioEvent.visible = undefined
      }
    },
    
    getHeight(audioEvent) {
      let ct = 0;
      Object.values(audioEvent.recordings).forEach(rec => {
        Object.keys(rec.raags).forEach(() => {
          ct ++
        })
      });
      return ct
    },
    
    getRaagHeight(rec) {
      return Object.keys(rec.raags).length
    },
    
    openEditWindow(_id) {
      this.editingId = _id;
      this.showAddEvent = true
    },
    
    getAudioUrl() {
      
    }
    // getPSecs(rec) {
    //   rec.
    // },

  }
}
</script>

<style scoped>

.fileContainer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px);
  width: 100%;
  background-color: black;
  background-image: linear-gradient(black, #1e241e);
  color: white;
  user-select: none;
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
  top: 5vh;
  left: 5vw;
  width: 90vw;
  height: 90vh;
  overflow-y: auto;
}

.audioEventRow {
  width: 100%;
  border-bottom: 1px solid black;
}

.audioEventNameRow {
  width: 100%;
  height: 40px;
  border-bottom: 1px solid grey;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  cursor: pointer;
}

.audioEventNameRow > label {
  margin-left: 20px;
  width: 500px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.audioEventNameRow > span {
  transition: 0.25s;
  margin-left: 10px;
  cursor: pointer
}

.audioEventNameRow > span.rotated {
  transform: rotate(90deg)
}

.audioRecordingRowOuter {
  width: 100%;
  height: 30px;
  display: flex;
  flex-direction: row;
}

.audioRecordingRow {
  width: 100%;
  height: 30px;
  /* border-bottom: 1px dotted grey; */
  background-color: #202621;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  cursor: pointer
}



.playing {
  background-color: #3e4a40
}

.audioRecordingRow:hover {
  background-color: #2b332c
}

.audioEventNameRow:hover {
  background-color: #181c18
}

.audioRecordingRow > label {
  width: 200px;
  border-right: 1px dotted grey;
}

.audioRecordingRowSpacer {
  width: 20px;
  height: 30px;
  border-right: 1px solid grey;
}

.recordingNum {
  width: 30px;
}

.raagName {
  /* width: 100%; */
  height: 100%;
  overflow-x: auto;
  border-right: 1px dotted grey;
  /* margin-left: 10px; */
  scrollbar-width: none;
}

.raagName > span {
  /* display: inline-block; */
  white-space: nowrap;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  height: 100%;
}

.soloist {
  width: 200px;
  padding-left: 10px;
  border-right: 1px dotted grey;
  overflow-x: auto;
  scrollbar-width: none;
  display: flex;
  flex-direction: column;
  align-items: left;
  justify-content: center;
}

.soloist > span {
  white-space: nowrap;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.performanceSections {
  /* width: 100%; */
  /* margin-left: 10px; */
  overflow-x: auto;
  scrollbar-width: none;
  justify-content: left;
  display: flex;
  flex-direction: column;
}

.performanceSections > span {
  white-space: nowrap;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.performanceSectionCol {
  width: 250px;
  display: flex;
  flex-direction: column;
  align-items: left;
  justify-content: space-evenly;
  padding-left: 10px;
  padding-right: 10px;
  border-right: 1px dotted grey;
}

.audioRecordingCol {
  display: flex;
  flex-direction: column;
  align-items: left;
  justify-content: space-evenly;
}

.raagNameCol {
  display: flex;
  flex-direction: column;
  align-items: space-evenly;
  justify-content: left;
  width: 160px;
  padding-left: 10px;
}

.playCol {
  width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: left;
}

.height1 {
  height: v-bind(recHeight+'px')
}

.height2 {
  height: v-bind(recHeight*2+'px')
}

.height3 {
  height: v-bind(recHeight*3+'px')
}

.height4 {
  height: v-bind(recHeight*4+'px')
}

.height5 {
  height: v-bind(recHeight*5+'px')
}

.height6 {
  height: v-bind(recHeight*6+'px')
}

.audioRecordingRow * {
  pointer-events: none
}

.audioEventNameRow > label {
  pointer-events: none
}



button {
  background-color: #2f3830;
  color: white;
  /* border-radius: 8px; */
}

</style>
