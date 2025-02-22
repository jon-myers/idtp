import { Store } from 'vuex'
import { VueCookies } from 'vue-cookies'

declare module '@vue/runtime-core' {
  // declare your own store states
  interface State {
    _id: string,
    userID?: string,
    firstTime: boolean,
    returning: boolean,
    firstName?: string,
    name?: string,
    lastName?: string,
    query?: string,
    incomingFullPath?: string
  }

  // provide typings for `this.$store`
  interface ComponentCustomProperties {
    $store: Store<State>,
    $cookies: VueCookies;
  }
}
