import { Store } from 'vuex'

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
  }

  // provide typings for `this.$store`
  interface ComponentCustomProperties {
    $store: Store<State>
  }
}