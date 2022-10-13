import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createStore } from 'vuex'

const store = createStore({
  state() {
    return {
      _id: '63445d13dc8b9023a09747a6'
    }
  },
  mutations: {
    update_id(state, _id) {
      state._id = _id
    }
  }
})

import GAuth from 'vue-google-oauth2';
const gauthOption = {
  clientId: 'CLIENT_ID.apps.googleusercontent.com',
  scope: 'profile email',
  prompt: 'select_account'
};


// for event bus
import mitt from 'mitt';
const emitter = mitt();
const app = createApp(App);
app.config.globalProperties.emitter = emitter;
app.use(router).use(store).use(GAuth, gauthOption).mount('#app')
