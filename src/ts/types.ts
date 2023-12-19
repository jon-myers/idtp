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

type MusicianDBType = {
  _id: string;
  'Initial Name': string;
  'Full Name'?: string;
  'First Name'?: string;
  'Middle Name'?: string;
  'Second Middle Name'?: string;
  'Last Name'?: string;
  'Alternative Name'?: string;
  Born?: number;
  Died?: number;
  Gharana?: string;
  Gender?: 'M' | 'F' | 'O';
  Instrument?: string;
  'All Instruments'?: string[];
}

type GharanaType = {
  _id: string;
  name: string;
  members: string[];
}


export type { 
  CollectionType, 
  UserType, 
  ContextMenuOptionType,
  MusicianDBType,
  GharanaType,
};