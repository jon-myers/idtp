<template>
  <!-- <Editor ref='editor'/> -->
  <div id='nav' @click='handleNavClick'>
      <router-link class='routerLink' to='/files/'>
        <div class='link'>Files</div>
      </router-link>
      <router-link class='routerLink' to='/altEditor'>
        <div class='link'>Editor</div>
      </router-link>
      <router-link class='routerLink' to='/audioEvents'>
        <div class='link'>Audio Events</div>
      </router-link>
      <router-link class='routerLink' to='/raagEditor'>
        <div class='link'>Raag Editor</div>
      </router-link>
      <div class='gap'></div>
      <div class='imgBox' @click='handleUsrImgClick'>
        <img 
          v-if='usrImgUrl' 
          :src='usrImgUrl' 
          class='usrImg'
          > 
      </div> 
  </div>
  <div id='userMenu' v-if='showUserMenu'>
    <div class='userMenuRow' @click='logIn'>
      <span>Log in</span>
    </div>
    <div class='userMenuRow' @click='logOut'>
      <span>Log out</span>
    </div>
  </div>
  <div class='routerViewContainer' @click='handleNavClick'>
    <router-view ref='routerView'/>
  </div>
  
  <!-- <GoogleLogin :callback='loggedIn' v-show='false' prompt auto-login/> -->
</template>

<script>
import { decodeCredential, googleLogout, googleOneTap } from 'vue3-google-login';

import { userLoginGoogle } from '@/js/serverCalls.js';
// import Editor from '@/components/Editor.vue'

export default {
  name: 'App',
  components: {
    // Editor
  },
  data() {
    return {
      usrImgUrl: undefined,
      navHeight: 40,
      userID: undefined,
      firstName: undefined,
      returning: false,
      firstTime: false,
<<<<<<< HEAD
      showUserMenu: false  
=======
      showUserMenu: false
      
      
>>>>>>> 24d86ccb4190d7c5e02b883ece330154792e55bc
    }
  },
  async mounted() {
    this.userID = this.$cookies.get('userID');
    if (this.userID === 'undefined') this.userID = undefined;
    this.usrImgUrl = this.$cookies.get('usrImgUrl');
    if (this.usrImgUrl === 'undefined') this.usrImgUrl = undefined;
<<<<<<< HEAD
    this.firstName = this.$cookies.get('firstName');
    if (this.firstName === 'undefined') this.firstName = undefined;
=======
>>>>>>> 24d86ccb4190d7c5e02b883ece330154792e55bc
    if (this.userID) {
      this.$store.commit('update_userID', this.userID);
      this.$store.commit('update_returning', true)
    } else {
      try {
        const response = await googleOneTap({ autoLogin: false });
        await this.loggedIn(response);
      } catch (err) {
        console.error(err)
      }
    }
  },
  
  methods: {
    async loggedIn(res) {
      const userData = decodeCredential(res.credential);
      this.usrImgUrl = userData.picture;
      const result = await userLoginGoogle(userData);
      this.userID = result.value._id;
<<<<<<< HEAD
      
      this.firstName = result.value.given_name;
      this.$cookies.set('userID', this.userID);
      this.$cookies.set('usrImgUrl', this.usrImgUrl);
      this.$cookies.set('firstName', this.firstName);
=======
      this.$cookies.set('userID', this.userID);
      this.$cookies.set('usrImgUrl', this.usrImgUrl);
      this.firstName = result.value.given_name;
>>>>>>> 24d86ccb4190d7c5e02b883ece330154792e55bc
      this.$store.commit('update_firstName', this.firstName);
      this.$store.commit('update_userID', this.userID);
      if (!result.lastErrorObject.updatedExisting) {
        this.firstTime = true;
        this.$store.commit('update_firstTime', this.firstTime)
        this.$router.push('/')
      } else if (!result.value.waiverAgreed) {
        this.firstTime = true;
        this.$store.commit('update_firstTime', this.firstTime);
        this.$router.push('/');
      } else {
        this.returning = true
        this.$store.commit('update_returning', this.returning)
      }
    },
    
    handleUsrImgClick(e) {
      this.showUserMenu = !this.showUserMenu;
      e.stopPropagation();
    },
    
    logOut() {
      googleLogout();
      this.$store.commit('update_userID', undefined);
      this.usrImgUrl = undefined;
      this.$store.commit('update_firstTime', false);
      this.$store.commit('update_returning', false);
      this.$store.commit('update_firstName', undefined);
      this.showUserMenu = false;
      this.$cookies.set('userID', undefined);
      this.$cookies.set('usrImgUrl', undefined);
<<<<<<< HEAD
      this.$cookies.set('firstName', undefined);
=======
>>>>>>> 24d86ccb4190d7c5e02b883ece330154792e55bc
      this.$router.push('/')    
    },
    
    async logIn() {
      this.showUserMenu = false;
      if (this.$store.state.userID === undefined) {
        try {
          const response = await googleOneTap({ autoLogin: false });
          await this.loggedIn(response);
        } catch (err) {
          console.error(err)
        }
      }
    },
    
    handleNavClick() {
      if (this.showUserMenu) this.showUserMenu = false
    }
  }
}
</script>

<style>

.usrImg {
  width: 100%;
  height: 100%;
  /* cursor: pointer;
  border-left: 1px solid black;
  border-right: 1px solid black; */
}

.imgBox {
  width: v-bind(navHeight+'px');
  height: v-bind(navHeight+'px');
  min-width: v-bind(navHeight+'px');
  min-height: v-bind(navHeight+'px');
  cursor: pointer;
  border-left: 1px solid black;
  border-right: 1px solid black;
}

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
  height: 100%;
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
  height: v-bind(navHeight+'px');
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

.gap {
  width: 100%
}

#userMenu {
  width: 200px;
  /* height: 150px; */
  background-color: lightgrey;
  position: fixed;
  right: 1px;
  border-left: 1px solid black;
  border-bottom: 1px solid black;
  border-right: 1px solid black;
  top: v-bind(navHeight+1+'px');
  border-radius: 5px;
}

.userMenuRow {
  width: 100%;
  height: 40px;
  display: flex;
  flex-direction: row;
  align-items: left;
  justify-content: left;
  cursor: pointer
}

.userMenuRow:hover {
  background-color: lightblue
}

.routerViewContainer {
  width: 100%;
  height: 100%;
}

span {
  padding: 5px;
}

</style>
