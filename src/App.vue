<template>
  <!-- <Editor ref='editor'/> -->
  <div id='nav' @click='handleNavClick'>
      <router-link class='routerLink' to='/files/'>
        <div class='link'>Files</div>
      </router-link>
      <router-link class='routerLink' to='/editor'>
        <div class='link'>Editor</div>
      </router-link>
      <router-link class='routerLink' to='/audioEvents'>
        <div class='link'>Audio Events</div>
      </router-link>
      <router-link class='routerLink' to='/raagEditor'>
        <div class='link'>Raag Editor</div>
      </router-link>
      <router-link class='routerLink' to='/analyzer'>
        <div class='link'>Analyzer</div>
      </router-link>
      <div class='gap'></div>
      <div class='imgBox' @click='handleUsrImgClick'>
        <img 
          v-if='usrImgUrl' 
          :src='usrImgUrl' 
          class='usrImg'
          referrerpolicy="no-referrer"
          > 
        <img 
          v-else
          :src='defaultUsrImgUrl'
          class='usrImg'
          >
      </div> 
  </div>
  <div id='userMenu' v-if='showUserMenu'>
    <div class='userMenuRow' @click='logIn'>
      <span>Log in</span>
    </div>
    <div class='userMenuRow last' @click='logOut'>
      <span>Log out</span>
    </div>
  </div>
  <div class='routerViewContainer' @click='handleNavClick'>
    <router-view ref='routerView'/>
  </div>
  
  <!-- <GoogleLogin :callback='loggedIn' v-show='false' prompt auto-login/> -->
</template>

<script>
import { 
  decodeCredential, 
  googleLogout, 
  googleOneTap, 
  googleAuthCodeLogin 
} from 'vue3-google-login';
// import { detect } from 'detect-browser';
import { userLoginGoogle, handleGoogleAuthCode } from '@/js/serverCalls.mjs';

import defaultUsrImgUrl from '@/assets/icons/user_head.svg';
// import Editor from '@/components/Editor.vue'
// const browser = detect();
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
      showUserMenu: false,
      userMenuWidth: 200,
      defaultUsrImgUrl: defaultUsrImgUrl,
    }
  },
  async mounted() {
    this.userID = this.$cookies.get('userID');
    if (this.userID === 'undefined') this.userID = undefined;
    this.usrImgUrl = this.$cookies.get('usrImgUrl');
    if (this.usrImgUrl === 'undefined') this.usrImgUrl = undefined;
    this.firstName = this.$cookies.get('firstName');
    if (this.firstName === 'undefined') this.firstName = undefined;
    this.lastName = this.$cookies.get('lastName');
    if (this.lastName === 'undefined') this.lastName = undefined;
    this.name = this.$cookies.get('name');
    if (this.name === 'undefined') this.name = undefined;
    if (this.userID) {
      this.$store.commit('update_userID', this.userID);
      this.$store.commit('update_returning', true);
      this.$store.commit('update_firstName', this.firstName);
      this.$store.commit('update_lastName', this.lastName);
      this.$store.commit('update_name', this.name);
      const pieceId = this.$cookies.get('currentPieceId');
      if (pieceId !== null) this.$store.commit('update_id', pieceId); //just for now
    } else {
      try {
        const response = await googleOneTap({ autoLogin: false });
          const userData = decodeCredential(response.credential);
          await this.loggedIn(userData);     
      } catch (err) {
        console.error(err);
        try {
          const response = await googleAuthCodeLogin();
          const redirURL = window.location.href;
          const userData = await handleGoogleAuthCode(response.code, redirURL);
          await this.loggedIn(userData);
        } catch (error) {
          console.error();
        } finally {
          console.log('got to the finally')
        }
      }
    }
  },
  
  methods: {
    async loggedIn(userData) {
      this.usrImgUrl = userData.picture;
      const result = await userLoginGoogle(userData);
      this.userID = result.value._id;    
      this.firstName = result.value.given_name;
      this.$cookies.set('userID', this.userID);
      this.$cookies.set('usrImgUrl', this.usrImgUrl);
      this.$cookies.set('firstName', this.firstName);
      this.$cookies.set('lastName', result.value.family_name);
      this.$cookies.set('name', result.value.name);
      this.$store.commit('update_firstName', this.firstName);
      this.$store.commit('update_lastName', result.value.family_name);
      this.$store.commit('update_name', result.value.name);
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
        this.$store.commit('update_returning', this.returning);
        if (this.$store.state.query) {
          this.$router.push({
            name: 'EditorComponent',
            query: this.$store.state.query
          })
        }
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
      this.$store.commit('update_lastName', undefined);
      this.$store.commit('update_name', undefined);
      this.showUserMenu = false;
      this.$cookies.set('userID', undefined);
      this.$cookies.set('usrImgUrl', undefined);
      this.$cookies.set('firstName', undefined);
      this.$cookies.set('lastName', undefined);
      this.$cookies.set('name', undefined);
      this.$router.push('/')    
    },
    
    async logIn() {
      this.showUserMenu = false;
      if (this.$store.state.userID === undefined) {
        try {
          const response = await googleOneTap({ autoLogin: false });
          const userData = decodeCredential(response.credential);
          await this.loggedIn(userData);     
        } catch (err) {
          console.error(err);
          try {
            const response = await googleAuthCodeLogin();
            const reURL = window.location.href;
            const userData = await handleGoogleAuthCode(response.code, reURL);
            await this.loggedIn(userData);
          } catch (err) {
            console.error(err)
          }
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
  border-radius: 4px;
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
  border-radius: 4px;
  /* border-left: 1px solid black; */
  /* border-right: 1px solid black; */
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
  /* width: 100px; */
  height: 50px;
  /* border: 1px solid black; */
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: black;
  /* padding-left: 20px;
  padding-right: 20px; */
}

.routerLink {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: black;
  color: white;
  border-radius: 4px;
  padding-left: 10px;
  padding-right: 10px;
}

.routerLink:hover {
  background-color: #242424;
}

#nav {
  display: flex;
  flex-direction: row;
  text-align: center;
  /* border-bottom: 1px solid black; */
  background-color: black;
}

.link {
  width: 100px;
  height: v-bind(navHeight+'px');
  /* border-right: 1px solid black; */
  display: flex;
  align-items: center;
  justify-content: center;
}

.active {
  background-color: #242424;
}

a {
  text-decoration: none;
  color: inherit;
}

.gap {
  width: 100%
}

#userMenu {
  width: v-bind(userMenuWidth + 'px');
  /* height: 150px; */
  background-color: black;
  position: fixed;
  right: 1px;
  border: 1px solid grey;
  top: v-bind(navHeight+1+'px');
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  user-select: none;
  z-index: 1
}

.userMenuRow {
  width: v-bind(userMenuWidth-24+'px');
  height: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
  /* cursor: pointer; */
  color: white;
  padding-left: 8px;
  margin-left: 8px;
  margin-right: 8px;
  margin-top: 6px;
  border-radius: 5px;
}

.userMenuRow.last {
  margin-bottom: 6px;
}

.userMenuRow:hover {
  background-color: blue;
  cursor: pointer;
}

.routerViewContainer {
  width: 100%;
  height: 100%;
}

span {
  padding: 5px;
}

</style>
