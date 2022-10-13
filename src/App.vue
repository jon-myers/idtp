<template>
  <!-- <Editor ref='editor'/> -->
  <div id='nav'>
      <router-link class='routerLink' to='/files/'><div class='link'>Files</div></router-link>
      <router-link class='routerLink' to='/altEditor'><div class='link'>Editor</div></router-link>
      <router-link class='routerLink' to='/audioEvents'><div class='link'>Audio Events</div></router-link>
      <router-link class='routerLink' to='/raagEditor'><div class='link'>Raag Editor</div></router-link>
  </div>
  <router-view />
</template>

<script>

// import Editor from '@/components/Editor.vue'

export default {
  name: 'App',
  components: {
    // Editor
  },
  data() {
    return {
    }
  },
  mounted() {
  }
}
</script>

<style>

html, body {
  scroll-behavior: smooth;
}

div {
  width: 100%
}

body {
  margin: 0px;
  display: flex;
  flex-direction: row;
  overflow: none;
  position: fixed;
  width: 100%;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.routerBox {
  width: 100px;
  height: 50px;
  border: 1px solid black;
  display: flex;
  align-items: center;
  justify-content: center;
}

.routerLink {
  display: flex;
  align-items: center;
  justify-content: center;
}

#nav {
  display: flex;
  flex-direction: row;
  text-align: center;
  border-bottom: 1px solid black;
}

.link {
  width: 100px;
  height: 30px;
  border-right: 1px solid black;
  display: flex;
  align-items: center;
  justify-content: center;
}

.active{
  background-color: #E09540;
}

a {
  text-decoration: none;
  color: inherit;
}




</style>
