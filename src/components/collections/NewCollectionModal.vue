<template>
  <div class='modal'>
    <div class='modal-content'>
      <div class='modalRow'>
        <h2>New Collection</h2>
      </div>
      <div class='modalRow'>
        <label for='title'>Title: </label>
        <input type='text' id='title' v-model='title'>
      </div>
      <div class='modalRow'>
        <label for='description'>Description: </label>
        <input type='text' id='description' v-model='description'>
      </div>
      <div class='modalRow'>
        <label for='purpose'>Purpose: </label>
        <select id='purpose' v-model='purpose'>
          <option 
            v-for='(purpose, i) in purposeChoices' 
            :key='i'
            :value='purpose'
            >
            {{purpose}}
          </option>
        </select>
      </div>
      <div class='modalRow'>
        <label for='publicView'>Visibility: </label>
        <div class='modalColumn'>
          <div class='subRow'>
            <input 
              type='radio' 
              id='publicView' 
              :value='true' 
              name='publicView'
              v-model='publicView'>
            <label for='publicView'>Public</label>
          </div>
          <div class='subRow'>
            <input 
              type='radio' 
              id='privateView' 
              :value='false' 
              name='publicView'
              v-model='publicView'>
            <label for='privateView'>Private</label>
          </div>
        </div>
      </div>
      <div class='modalRow users' >
        <div class='modalColumn wide'>
          <div class='labelBox'>
            <label for ='editors'>Editors</label>
          </div>
          <div class='userSelectColumn'>
            <div class='usersBox'>
              <div v-for='(editor, i) in selectedEditors' :key='i'>
                <select v-model='selectedEditors[i]'>
                  <option 
                    v-for='(user, j) in allUsers' 
                    :key='j'
                    :value='user'
                    >
                    {{ `${user.name} , (${user.email})` }}
                  </option>
                </select>
                <button @click='selectedEditors.splice(i, 1)'>-</button>
              </div>
            </div>
            <div>
              <button @click='addEditor'>+</button>
            </div>
          </div>
        </div>
        <div class='modalColumn wide' v-if='!publicView'>
          <div class='labelBox'>
            <label for='viewers'>Viewers</label>
          </div>
          <div class='userSelectColumn'>
            <div class='usersBox'>
              <div v-for='(viewer, i) in selectedViewers' :key='i'>
                <select v-model='selectedViewers[i]'>
                  <option 
                    v-for='(user, j) in allUsers' 
                    :key='j'
                    :value='user'
                    >
                    {{ `${user.name} , (${user.email})` }}
                  </option>
                </select>
                <button @click='selectedViewers.splice(i, 1)'>-</button>
              </div>
            </div>
            <div>
              <button @click='addViewer'>+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang='ts'>
import { defineComponent } from 'vue';
import { CollectionType, UserType } from '@/ts/types.ts';
import { getAllUsers } from '@/js/serverCalls.ts';
type NewCollectionModalDataType = {
  purposeChoices: CollectionType['purpose'][],
  title: string,
  description: string,
  publicView: boolean,
  purpose: CollectionType['purpose'],
  // viewers: { name: string, id: string }[],
  // editors: { name: string, id: string }[],
  allUsers: UserType[],
  selectedViewers: (UserType | undefined)[],
  selectedEditors: (UserType | undefined)[],
}

export default defineComponent({
  data(): NewCollectionModalDataType {
    return {
      purposeChoices: [
        'Pedagogical', 
        'Research', 
        'Aesthetic', 
        'Creative', 
        'Other'
      ],
      title: '',
      description: '',
      publicView: false,
      purpose: 'Research',
      // viewers: [],
      // editors: [],
      allUsers: [],
      selectedViewers: [],
      selectedEditors: [],
    };
  },

  async created() {
    try {
      this.allUsers = await getAllUsers();
      this.allUsers.sort((a, b) => {
        if (a.family_name < b.family_name) return -1;
        else if (a.family_name > b.family_name) return 1;
        else if (a.given_name < b.given_name) return -1;
        else if (a.given_name > b.given_name) return 1;
        else return 0
      })
    } catch (error) {
      console.log(error);
    }
  },

  methods: {

    addViewer() {
      this.selectedViewers.push(undefined);
    },

    addEditor() {
      this.selectedEditors.push(undefined);
    }
    
  }
});
</script>

<style scoped>

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3;
}

.modal-content {
  background-color: lightgrey;
  padding: 20px;
  border-radius: 4px;
  height: 400px;
  width: 600px;
  display: flex;
  flex-direction: column;
  justify-content: top;

}


.modalRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  height: 50px;
}

.modalColumn {
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: left;
  height: 50px;
}

.wide {
  width: 250px;
}

.labelBox > label {
  text-align: center;
}

.subRow {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  height: 50px;
}

.subRow > label {
  text-align: left;
  margin-left: 5px;
}

label {
  min-width: 100px;
  width: 100px;
  text-align: right;
  margin-right: 10px;
}

input[type=text] {
  width: 400px;
}

select {
  margin-right: 5px;
  width: 150px;
}

.userSelectColumn {
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: left;
  height: 100px;
  width: 200px;
}

.usersBox {
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: left;
  max-height: 100px;
  width: 200px;
  margin-bottom: 5px;
  overflow-y: scroll;
}

.labelBox {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  height: 50px;
  /* width: 200px; */
}

.modalRow.users {
  margin-top: 10px;
}
</style>