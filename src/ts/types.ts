type CollectionType = {
  _id?: string;
  title: string;
  userID: string;
  permissions: {
    view: string[]; // list of userIDs
    edit: string[]; // list of userIDs
    publicView: boolean; // potentially overrides the need for view list
  };
  purpose: 'Pedagogical' | 'Research' | 'Appreciative' | 'Creative' | 'Other';
  description?: string;
  audioRecordings: string[]; // list of audioRecordingIDs
  audioEvents: string[]; // list of audioEventIDs
  transcriptions: string[]; // list of transcriptionIDs
  userName?: string;
  dateCreated?: Date;
  dateModified?: Date;
  color?: string;
}


type UserType = {
  email: string;
  family_name: string;
  given_name: string;
  name: string;
  picture: string;
  sub: string;
  waiverAgreed: boolean;
  _id: string;
}

type ContextMenuOptionType = {
  text: string,
  action: () => void,
  enabled?: boolean,
}

export type { CollectionType, UserType, ContextMenuOptionType };