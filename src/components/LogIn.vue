<template>
  <div class='main'>
    <GoogleLogin :callback='loggedIn' v-show='false' prompt auto-login/>
    <div class='waiver' v-if='firstTime || returning'>
      <div v-if='firstTime'>{{waiver}}</div>
      <input type='checkbox' @change='agreeToWaiver' v-model='agreeBool' v-if='firstTime'>
      <div v-if='returning'>{{`Welcome back, ${firstName}!`}}</div>
    </div>
  </div>
</template>
<script>


import { decodeCredential } from 'vue3-google-login';
import { userLoginGoogle, agreeToWaiver } from '@/js/serverCalls.js';

export default {
  name: 'LogIn',
  
  data() {
    return {
      firstTime: false,
      returning: false,
      waiver: 'TBD language regarding only using the service for scholarly and \
        / or pedagogical purposes. If agreed, check box.',
      agreeBool: false,
      firstName: undefined
    }
  },
  
  mounted() {
    
  },
  
  methods: {
    
    async loggedIn(res) {
      // console.log('logged in!!')
      const userData = decodeCredential(res.credential);
      const usrImgUrl = userData.picture;
      this.emitter.emit('usrImgUrl', usrImgUrl);
      const result = await userLoginGoogle(userData);
      console.log(result)
      this.userID = result.value._id;
      this.firstName = result.value.given_name;
      this.$store.commit('update_userID', this.userID);
      if (!result.lastErrorObject.updatedExisting) {
        this.firstTime = true
        console.log('first time')
      } else if (!result.value.waiverAgreed) {
        this.firstTime = true;
        console.log('never agreed to waiver')
      } else {
        console.log('returning');
        this.returning = true
      }
      // 100491673276750515389
    },
    
    agreeToWaiver() {
      if (this.agreeBool) {
        agreeToWaiver(this.userID);
        this.firstTime = false;
        this.returning = true
      }
    }
  }
}
</script>

<style scoped>

.waiver {
  width: 350px;
  /* height: 200px; */
  border: 1px solid black;
  border-top: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
}

.main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

</style>
