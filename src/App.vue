<template>
  <NavBar :navHeight='navHeight' v-if='path && path !== "/"'>
  </NavBar>
  <div class='routerViewContainer' >
    <router-view ref='routerView' :navHeight='navHeight'/>
  </div>
</template>
<script lang='ts'>
import { defineComponent } from 'vue';
import NavBar from '@/comps/NavBar.vue';
type AppDataType = {
  navHeight: number,
}

export default defineComponent({
  name: 'App',
  components: {
    NavBar
  },
  data(): AppDataType {
    return {
      navHeight: 40,
    }
  },

  // mounted() {
  //   this.path = this.$route.path;
  // },

  computed: {
    path() {
      return this.$route.path;
    }
  },
  
})
</script>

<style>

body {
  overscroll-behavior: none;
}

body, html {
  overscroll-behavior-x: none;
}

/* this is just for hiding something wierd about the new devtools installed */

#vue-inspector-container {
  width: 0%;
}

#__vue-devtools-container__ {
  width: 0%;
}
</style>
