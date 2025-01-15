<template>
  <NavBar :navHeight='navHeight' v-if='shouldShowNavBar'>
  </NavBar>
  <div class='routerViewContainer' >
    <router-view ref='routerView' :navHeight='navHeight'/>
  </div>
</template>
<script lang='ts'>
import { defineComponent, computed } from 'vue';
import NavBar from '@/comps/NavBar.vue';
import { useRoute } from 'vue-router';

type AppDataType = {
  navHeight: number,
}

export default defineComponent({
  name: 'App',
  components: {
    NavBar
  },
  setup() {
    const route = useRoute();

    const shouldShowNavBar = computed(() => {
      const excludedPaths = ['/', '/changelog'];
      return route.path && !excludedPaths.includes(route.path);
    })
    return { route, shouldShowNavBar }
  },
  data(): AppDataType {
    return {
      navHeight: 40,
    }
  },
  computed: {
    path() {
      return this.route.path;
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

.routerViewContainer {
  background-color: #202621
}
</style>
