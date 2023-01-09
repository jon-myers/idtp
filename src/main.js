import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createStore } from 'vuex';
import vue3GoogleLogin from 'vue3-google-login';
import VueCookies from 'vue-cookies';
import LoadScript from "vue-plugin-load-script";

const store = createStore({
  state() {
    return {
      _id: '63445d13dc8b9023a09747a6',
      userID: undefined,
      firstTime: false,
      returning: false,
      firstName: undefined,
      name: undefined,
      lastName: undefined,
      query: undefined,
    }
  },
  mutations: {
    update_id(state, _id) {
      state._id = _id
    },
    
    update_userID(state, userID) {
      state.userID = userID
    },
    
    update_firstTime(state, firstTime) {
      state.firstTime = firstTime
    },
    
    update_returning(state, returning) {
      state.returning = returning
    },
    
    update_firstName(state, firstName) {
      state.firstName = firstName
    },

    update_name(state, name) {
      state.name = name
    },

    update_lastName(state, lastName) {
      state.lastName = lastName
    },

    update_query(state, query) {
      state.query = query
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
  .use(VueCookies, { expire: '7d' })
  .use(LoadScript)
  .mount('#app')