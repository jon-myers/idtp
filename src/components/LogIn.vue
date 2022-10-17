<template>
  <div class='main'>
    <div class='waiver' v-if='firstTime || returning || firstWelcome'>
      <div v-if='firstTime'>{{waiver}}</div>
      <input type='checkbox' @change='agreeToWaiver' v-model='agreeBool' v-if='firstTime'>
      <div v-if='returning'>{{`Welcome back, ${firstName}!`}}</div>
      <div v-if='firstWelcome'>{{`Welcome, ${firstName}!`}}</div>
    </div>
  </div>
</template>
<script>


// import { decodeCredential } from 'vue3-google-login';
import { agreeToWaiver } from '@/js/serverCalls.js';

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
      userID: undefined
    }
  },
  
  mounted() {
    this.firstTime = this.$store.state.firstTime;
    this.returning = this.$store.state.returning;
    this.userID = this.$store.state.userID;
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
