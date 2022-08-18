import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createStore } from 'vuex'

const store = createStore({
  state() {
    return {
      _id: '61e5daca03729a1e53a46a4d'
    }
  },
  mutations: {
    update_id(state, _id) {
      state._id = _id
    }
  }
})


// for event bus
import mitt from 'mitt';
const emitter = mitt();
const app = createApp(App);
app.config.globalProperties.emitter = emitter;
app.use(router).use(store).mount('#app')
