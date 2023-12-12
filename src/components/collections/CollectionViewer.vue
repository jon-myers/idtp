<template>
  <div class='mainCollection'>
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
          />
      </div>
      <div class='tHolder' v-if='collection.transcriptions.length > 0'>
        <div class='miniBoxTitle'>Transcriptions</div>
        <MiniTranscriptions
          :tIds='collection.transcriptions'
          class='miniT'
          />
      </div>
    </div>
    
    <GenericAudioPlayer 
      :audioSource='audioSource'
      @emitNextTrack='emitNextTrack'
      @emitPrevTrack='emitPrevTrack'
      />
  </div>
</template>

<script lang='ts'>
import { defineComponent, PropType } from 'vue';
import type { CollectionType } from '@/ts/types.ts';
import { getContrastingTextColor } from '@/ts/utils';
import GenericAudioPlayer from '@/components/GenericAudioPlayer.vue';
import { getEditableCollections } from '@/js/serverCalls';
import MiniAudioRecordings from '@/components/collections/MiniAudioRecordings.vue';
import MiniAudioEvents from '@/components/collections/MiniAudioEvents.vue';
import MiniTranscriptions from '@/components/collections/MiniTranscriptions.vue';
type CollectionViewerDataType = {
  audioSource: string | undefined,
  miniBoxHeight: number,
  miniBoxLabelHeight: number,
  playingFromType?: 'recording' | 'audioEvent',
  titleRowHeight: number,
  descriptionRowHeight: number,
  containerHeight: number
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
    }
  },
  components: {
    GenericAudioPlayer,
    MiniAudioRecordings,
    MiniAudioEvents,
    MiniTranscriptions
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
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.setContainerHeight);
  },

  methods: {

    setContainerHeight() {
      this.containerHeight = window.innerHeight - this.navHeight - 101 - this.titleRowHeight - this.descriptionRowHeight;
    },

    getEditableCollections,
    
    closeCollection($event: MouseEvent) {
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