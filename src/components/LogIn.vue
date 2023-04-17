<template>
  <div class='main'>
    <div class='waiverContainer'>
      <div class='waiver' v-if='firstTime || returning || firstWelcome'>
        <div v-if='firstTime'>{{waiver}}</div>
        <input type='checkbox' @change='agreeToWaiver' v-model='agreeBool' v-if='firstTime'>
        <div v-if='returning'>{{`Welcome back, ${firstName}!`}}</div>
        <div v-if='firstWelcome'>{{`Welcome, ${firstName}!`}}</div>
      </div>
    </div>
  </div>
</template>
<script>


// import { decodeCredential } from 'vue3-google-login';
import { agreeToWaiver } from '@/js/serverCalls.mjs';

export default {
  name: 'LogIn',
  
  data() {
    return {
      firstTime: false,
      returning: false,
      waiver: 'TBD language regarding only using the service for scholarly and \
        / or pedagogical purposes. If agreed, check box.',
      agreeBool: false,
      firstName: undefined,
      userID: undefined,
      firstWelcome: undefined
    }
  },
  
  mounted() {
    this.firstTime = this.$store.state.firstTime;
    this.returning = this.$store.state.returning;
    this.userID = this.$store.state.userID;
    this.firstName = this.$store.state.firstName;
  },
  
  computed: {
    getStoreFirstTime() {
      return this.$store.state.firstTime
    },
    
    getStoreFirstName() {
      return this.$store.state.firstName
    },
    
    getStoreUserID() {
      return this.$store.state.userID
    },
    
    getStoreReturning() {
      return this.$store.state.returning
    }
  },
  
  watch: {
    getStoreFirstTime(val) {
      this.firstTime = val
    },
    
    getStoreFirstName(val) {
      this.firstName = val
    },
    
    getStoreUserID(val) {
      this.userID = val
    },
    
    getStoreReturning(val) {
      this.returning = val
    }
  },
  
  methods: {
    
    agreeToWaiver() {
      if (this.agreeBool) {
        agreeToWaiver(this.userID);
        this.firstTime = false;
        this.$store.commit('update_firstTime', this.firstTime);
        this.firstWelcome = true;
        // this.returning = true
      }
    }
  }
}
</script>

<style scoped>

.waiver {
  width: 350px;
  /* height: 200px; */
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: bottom;
  justify-content: bottom;
  color: white;
}

.waiverContainer {
  width: 100%;
  height: 40%;
  display: flex;
  flex-direction: column;
  justify-content: bottom;
  align-items: center;
}

.main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-image: linear-gradient(black, #1e241e);
}

</style>
