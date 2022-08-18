<template>
  <div class='horizontalBar'>
    <ControlsComponent class='left' ref='controls'/>
    <ScrollableFixedYAxis ref='transcription'/>
    <div class='right'></div>
  </div>
  <DardDataView v-if='showNoteData'/>
  <TrajectoryView v-if='loaded && showTrajView'/>
  <div class='newTrajContainer'>
    <NewTrajectory v-if='loaded' v-show='showNewTrajectory'/>
  </div>

</template>

<script>
import ScrollableFixedYAxis from '@/components/ScrollableFixedYAxis.vue';
import DardDataView from '@/components/DardDataView.vue';
import ControlsComponent from '@/components/ControlsComponent.vue';
import TrajectoryView from '@/components/TrajectoryView.vue';
import NewTrajectory from '@/components/NewTrajectory.vue';

export default {
  name: 'EditorComponent',
  components: {
    ScrollableFixedYAxis,
    DardDataView,
    ControlsComponent,
    TrajectoryView,
    NewTrajectory,
  },
  data() {
    return {
      showNoteData: false,
      showTrajView: true,
      showNewTrajectory: false,
      loaded: false
    }
  },
  mounted() {
    this.emitter.on('showNoteData', noteData => {
      this.showNoteData = noteData
    }),
    this.emitter.on('showTrajectories', showTraj => {
      this.showTrajView = showTraj
    })
  }
}
</script>

<style scoped>

.stuffAbove {
  width: 100vw;
  height: 26px;
  background-color: grey;
}

.stuffBelow {
  width: 100vw;
  height: 50px;
  background-color: grey;
}

.horizontalBar {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  height: 500px;
  width: 100vw;
}

.left {
  height: 100%;
  width: 150px;
  min-width: 0px;
  /* background-color: green; */
}

.right {
  height: 100%;
  width: 0px;
  min-width: 0px;
  background-color: purple;
}

.comp {
  width: 80px;
  height: 100%
}

html {
  scroll-behavior: smooth;
}

.newTrajContainer {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}



</style>
