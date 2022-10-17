import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createStore } from 'vuex';
import vue3GoogleLogin from 'vue3-google-login';


const store = createStore({
  state() {
    return {
      _id: '63445d13dc8b9023a09747a6',
      userID: undefined
    }
  },
  mutations: {
    update_id(state, _id) {
      state._id = _id
    },
    
    update_userID(state, userID) {
      state.userID = userID
    }
  }
})

// for event bus
import mitt from 'mitt';
const emitter = mitt();
const app = createApp(App);
app.config.globalProperties.emitter = emitter;
app
  .use(router)
  .use(store)
  .use(vue3GoogleLogin, {
    clientId: "324767655055-crhq76mdupavvrcedtde986glivug1nm.apps.googleusercontent.com"
  })
  .mount('#app')
