const url = 'https://swara.studio/';
import axios from 'axios';
import { AxiosProgressEvent } from 'axios';
import fetch from 'cross-fetch';
import { Piece } from './classes.ts';
import { RecType } from './components/AddAudioEvent.vue';
import { UserType } from './components/FileManager.vue';

const getPiece = async (id: string): Promise<Piece> => {
  let piece;
  const request = {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      _id: id
    })
  };
  try {
    const response = await fetch(url + 'getOneTranscription', request);
    if (response.ok) {
      piece = await response.json()
    }
  } catch (err) {
    console.error(err)
  }
  return piece
}

const pieceExists = async (id: string) => {
  const request = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  const query = '?' + new URLSearchParams({ _id: id });
  try {
    const response = await fetch(url + 'pieceExists' + query, request);
    let data;
    if (response.ok) data = await response.json();
    return data
  } catch (err) {
    console.error(err)
  }
}

const excelData = async (id: string) => {
  const request = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  const query = '?' + new URLSearchParams({ _id: id });
  try {
    const response = await fetch(url + 'excelData' + query, request);
    let data;
    if (response.ok) data = await response.blob();
    const a = document.createElement('a');
    if (data) a.href = window.URL.createObjectURL(data);
    a.download = 'data.xlsx';
    a.click();
  } catch (err) {
    console.error(err)
  }
}

const jsonData = async (id: string) => {
  const request = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  const query = '?' + new URLSearchParams({ _id: id });
  try {
    const response = await fetch(url + 'jsonData' + query, request);
    let data;
    if (response.ok) data = await response.blob();
    const a = document.createElement('a');
    if (data) a.href = window.URL.createObjectURL(data);
    a.download = 'data.json';
    a.click();
  } catch (err) {
    console.error(err)
  }
}

const getAudioDBEntry = async (_id: string): Promise<RecType> => {
  let request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({_id})
  };
  const res = await fetch(url + 'getAudioDBEntry', request)
  if (res.ok) {
    return res.json()
  }
  return res.ok ? res.json(): undefined
}


const savePiece = async (piece: Piece) => {
  const data = JSON.stringify(piece);
  let result;
  let request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: data
  };
  try {
    const res = await fetch(url + 'updateTranscription', request);
    if (res.ok) {
      result = await res.json()
    }
    return result
  } catch (err) {
    console.error(err)
  }
};

const getAllPieces = async (
    userID: string, 
    sortKey: string, 
    sortDir?: string | number
  ): Promise<Piece[]> => {
  if (sortKey === undefined) {
    sortKey = 'title'
  }
  if (sortDir === undefined) {
    sortDir = '1'
  }
  let allPieces;
  let request = {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  };
  const query = '?' + new URLSearchParams({
    userID: JSON.stringify(userID),
    sortKey: JSON.stringify(sortKey),
    sortDir: JSON.stringify(sortDir)
  });
  try {
    const response = await fetch(url + 'getAllTranscriptions' + query, request);
    if (response.ok) {
      allPieces = await response.json()
    }
  } catch (err) {
    console.error(err)
  }
  return allPieces
};

const getAllAudioFileMetaData = async () => {
  let allAudio;
  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  await fetch(url + 'getAllAudioFileMetaData', request)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
    }).then(data => {
      if (data) {
        allAudio = data
      }
    }).catch(err => console.error(err));
  return allAudio
};


const getAllAudioEventMetadata = async () => {
  let allAudioEvents;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  try {
    const response = await fetch(url + 'getAllAudioEventMetadata', request);
    if (response.ok) {
      allAudioEvents = await response.json()
    }
    return allAudioEvents
  } catch (err) {
    console.error(err)
  }
}

const getAudioEvent = async (_id: string) => {
  let audioEvent;
  const suffix = '?' + new URLSearchParams({ _id: _id });
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  try {
    const response = await fetch(url + 'getAudioEvent' + suffix, request);
    if (response.ok) {
      audioEvent = await response.json()
    }
    return audioEvent
  } catch (err) {
    console.error(err)
  }
}

const getAudioRecording = async (_id: string): Promise<RecType> => {
  let audioRecording;
  const suffix = '?' + new URLSearchParams({ _id: _id });
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  try {
    const response = await fetch(url + 'getAudioRecording' + suffix, request);
    if (response.ok) {
      // console.log(response);
      audioRecording = await response.json()
    }
    return audioRecording
  } catch (err) {
    console.error(err)
  }
};

const getAllTransOfAudioFile = async (audioID: string, userID: string) => {
  let allTrans;
  const suffix = '?' + new URLSearchParams({
    audioID: audioID,
    userID: userID
  });
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  try {
    const extUrl = url + 'getAllTranscriptionsOfAudioFile' + suffix;
    const response = await fetch(extUrl, request);
    if (response.ok) {
      allTrans = await response.json()
    }
    return allTrans
  } catch (err) {
    console.error(err)
  }
};

// const getSortedMusicians = async () => {
//   // query 'musicians' mongoDB collection to get all musicians in alphabetical 
//   // order
//   let allMusicians;
//   let request = {
//     method: 'GET',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//   };
//   await fetch(url + 'getSortedMusicians', request)
//     .then(res => {
//       if (res.ok) {
//         return res.json();
//       }
//     }).then(data => {
//       if (data) {
//         allMusicians = data
//       }
//     }).catch(err => console.error(err))
//   return allMusicians
// };


const getSortedMusicians = async (): Promise<string[]> => {
  let allMusicians: string[] = [];
  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  try {
    const res = await fetch(url + 'getSortedMusicians', request);
    if (res.ok) {
      allMusicians = await res.json()
    }
  } catch (err) {
    console.error(err)
  }
  return allMusicians
}

const getEventTypes = async () => {
  // query 'audioEventTypes' mongoDB collection to get all event types
  let allEventTypes: string[] = []; 
  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  try {
    const res = await fetch(url + 'getEventTypes', request);
    if (res.ok) {
      allEventTypes = await res.json()
    }
  } catch (err) {
    console.error(err)
  }
  return allEventTypes
};

const getGharana = async (initName: string) => {
  // get gharana from musician's name
  let gharana;
  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  await fetch(url + 'getGharana?' + new URLSearchParams({ 
    initName: JSON.stringify(initName) 
  }), request)
    .then(res => {
      if (res.ok) {
        return res.json();
      }
    }).then(data => {
      if (data) {
        gharana = data.Gharana
      }
    }).catch(err => console.error(err))
    return gharana  
};

const getInstruments = async (melody: boolean): Promise<string[]> => {
  melody = melody || false;
  const searchParams = new URLSearchParams({ melody: 'true' });
  const suffix = melody ? '?' + searchParams : '';
  let instruments;
  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };

  try {
    const res = await fetch(url + 'getInstruments' + suffix, request);
    if (res.ok) {
      instruments = await res.json()
    }
  } catch (err) {
    console.error(err)
  }
  return instruments
};

const getNumberOfSpectrograms = async (id: string) => {
  const suffix = '?' + new URLSearchParams({
    id: id
  });
  let out;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  try {
    const res = await fetch(url + 'getNumberOfSpectrograms' + suffix, request);
    if (res.ok) {
      out = await res.json();
      return out
    }
  } catch (err) {
    console.error(err)
  }  
};

const makeSpectrograms = async (recId: string, saEst: string | number) => {
  let out;
  // console.log('recId: ', recId, '; saEst: ', saEst)
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ recId: recId, saEst: saEst })
  };
  try {
    const res = await fetch(url + 'makeSpectrograms', request);
    if (res.ok) {
      out = await res.json();
      return out
    }
  } catch (err) {
    console.error(err)
  }
};

const getRagaNames = async (): Promise<string[]> => {
  // gets all raga names
  let ragas;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  try {
    const res = await fetch(url + 'getRagaNames', request);
    if (res.ok) {
      ragas = await res.json()
    }
  } catch (err) {
    console.error(err)
  }
  return ragas
};

const getRaagRule = async (name: string) => {
  let rule;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  const searchParams = new URLSearchParams({ name: name })
  try {
    const res = await fetch(url + 'getRaagRule?' + searchParams, request);
    if (res.ok) {
      rule = await res.json();
      return rule
    }
  } catch (err) {
    console.error(err)
  }
  
}

type LocationType = {
  _id: string,
} & {
  [key: string]: {
    [key: string]: string[]
  }
}

export type { LocationType };

const getLocationObject = async (): Promise<LocationType> => {
  // gets location object
  let location;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  try {
    const res = await fetch(url + 'getLocationObject', request);
    if (res.ok) {
      location = await res.json();
      
    }
  } catch (err) {
    console.error(err)
  }
  return location
};

const getPerformanceSections = async (): Promise<string[]> => {
  let performanceSections;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  try {
    const res = await fetch(url + 'getPerformanceSections', request);
    if (res.ok) {
      performanceSections = await res.json()
    }
  } catch (err) {
    console.error(err)
  }
  return performanceSections
};

type NewPieceDataType = {
  acknowledged: boolean,
  insertedId: string
}


const createNewPiece = async (obj: object): Promise<NewPieceDataType | undefined> => {
  const data = JSON.stringify(obj);
  let out;
  let request = {
    method: 'POST',
    headers: {
      'Conent-Type': 'application/json'
    },
    body: data
  };
  await fetch(url + 'insertNewTranscription', request)
    .then(response => {
      if (response.ok) {
        return response.json()
      }
    }).then((data: NewPieceDataType) => {
      if (data) {
        out = data
      }
    })
  return out
};

const deletePiece = async (piece: Piece) => {
  let out;
  let request = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      '_id': piece._id
    })
  };
  try {
    const response = await fetch(url + 'oneTranscription', request);
    if (response.ok) {
      out = await response.json();
    }
    return out
  } catch (err) {
    console.error(err)
  }
  return out
};

const deleteAudioEvent = async (aeID: string) => {
  let out;
  let request = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      '_id': aeID
    })
  };
  try {
    const response = await fetch(url + 'deleteAudioEvent', request);
    if (response.ok) {
      out = await response.json();
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const initializeAudioEvent = async (userID: string) => {
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      'userID': userID
    })
  };
  let out;
  try {
    const response = await fetch(url + 'initializeAudioEvent', request);
    if (response.ok) {
      out = await response.json();
    }
    return out
  } catch (err) {
    console.error(err)
  }  
}

const cleanEmptyDoc = async (_id: string) => {
  const request = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }, 
    body: JSON.stringify({
      '_id': _id  
    })
  };
  let out;
  try {
    const response = await fetch(url + 'cleanEmptyDoc', request);
    if (response.ok) {
      out = await response.json();
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const saveAudioMetadata = async (_id: string, updates: object) => {
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      '_id': _id,
      'updates': updates
    })
  };
  let out;
  try {
    const response = await fetch(url + 'saveAudioMetadata', request);
    if (response.ok) {
      out = await response.json();
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const updateSaEstimate = async (
  recID: string, 
  aeID: string, 
  recIdx: number | string, 
  saEst: number | string, 
  ver: boolean, 
  octOffset: number
  ) => {
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      'recID': recID,
      'aeID': aeID,
      'recIdx': recIdx,
      'saEstimate': saEst,
      'verified': ver,
      'octOffset': octOffset
    }),
  };
  let out;
  try {
    const response = await fetch(url + 'updateSaEstimate', request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const getVerifiedStatus = async (aeID: string, recIdx: string) => {
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  let out;
  try {
    const params = new URLSearchParams({ aeID: aeID, recIdx: recIdx });
    const response = await fetch(url + 'getVerifiedStatus?' + params, request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const saveRaagRules = async (name: string, rules: object, date: Date) => {
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: name,
      rules: rules,
      date: date
    })
  };
  let out;
  try {
    const response = await fetch(url + 'saveRaagRules', request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

type OnProgressType = (percent: number) => void;

const uploadFile = async (
  file: File, 
  onProgress: OnProgressType, 
  parentID: string, 
  idx: number) => {
  const formData = new FormData();
  formData.append('avatar', file);
  formData.append('parentID', parentID);
  formData.append('idx', String(idx));
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
      const progressPercent = 100 * progressEvent.loaded / progressEvent.total!;
      if (onProgress) onProgress(progressPercent);
      return progressPercent
    }
  };
  try {
    const response = await axios.post(url+'upload-avatar', formData, config)
    if (response.statusText !== 'OK') {
      throw new Error(`Error! status: ${response.status}`)
    }
    return response.data;
  } catch (err) {
    console.log(err)
  }
}

type UserDataType = {
  sub: string,
  picture: string,
  email: string,
  name: string,
  given_name: string,
  family_name: string
}

const userLoginGoogle = async (userData: UserDataType) => {
  const data = JSON.stringify({
    sub: userData.sub,
    picture: userData.picture,
    email: userData.email,
    name: userData.name,
    given_name: userData.given_name,
    family_name: userData.family_name
  });
  let out;
  let request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: data
  };
  try {
    const response = await fetch(url + 'userLoginGoogle', request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const agreeToWaiver = async (userID: string) => {
  let out;
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userID: userID })
  };
  try {
    const response = await fetch(url + 'agreeToWaiver', request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const nameFromUserID = async (userID: string) => {
  let out;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  try {
    const params = new URLSearchParams({ userID: JSON.stringify(userID) });
    const response = await fetch(url + 'nameFromUserID?' + params, request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const handleGoogleAuthCode = async (code: string, redirectURL: string) => {
  let out;
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      authCode: code,
      redirectURL: redirectURL
    })
  };
  try {
    const response = await fetch(url + 'handleGoogleAuthCode', request);
    if (response.ok) {
      out = await response.json()
    } return out
  } catch (err) {
    console.error(err)
  }
}

const updateTranscriptionTitle = async (id: string, title: string) => {
  let out;
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: id, 
      title: title
    })
  };
  try {
    const response = await fetch(url + 'updateTranscriptionTitle', request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const updateTranscriptionPermissions = async (id: string, permissions: string) => {
  let out;
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: id,
      permissions: permissions
    })
  };
  try {
    const res = await fetch(url + 'updateTranscriptionPermissions', request);
    if (res.ok) {
      out = await res.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const updateTranscriptionOwner = async (id: string, ownerObj: UserType) => {
  let out;
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transcriptionID: id,
      userID: ownerObj['_id'],
      name: ownerObj['name'],
      family_name: ownerObj['family_name'],
      given_name: ownerObj['given_name']
    })
  };
  try {
    const res = await fetch(url + 'updateTranscriptionOwner', request);
    if (res.ok) {
      out = await res.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const cloneTranscription = async ({
  id = undefined,
  title = undefined,
  newOwner = undefined,
  permissions = undefined,
  name = undefined,
  family_name = undefined,
  given_name = undefined
}: {
  id?: string,
  title?: string,
  newOwner?: string,
  permissions?: string,
  name?: string,
  family_name?: string,
  given_name?: string
} = {}) => {
  let out;
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: id, 
      title: title, 
      newOwner: newOwner, 
      permissions: permissions,
      name: name,
      family_name: family_name,
      given_name: given_name
    })
  };
  try {
    const response = await fetch(url + 'cloneTranscription', request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const getInstrumentation = async (audioID: string) => {
  let out;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  try {
    const params = new URLSearchParams({ audioID: JSON.stringify(audioID) });
    const response = await fetch(url + 'getInstrumentation?' + params, request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const getIpaVowels = async () => {
  let out;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  try {
    const response = await fetch(url + 'getIpaVowels', request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const getConsonants = async () => {
  let out;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  try {
    const response = await fetch(url + 'getConsonants', request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const getAllUsers = async () => {
  let out;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  try {
    const response = await fetch(url + 'allUsers', request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}


export { 
  getPiece,
  savePiece,
  getAllPieces,
  createNewPiece,
  deletePiece,
  deleteAudioEvent,
  getAudioDBEntry,
  getAllAudioFileMetaData,
  uploadFile,
  getSortedMusicians,
  getEventTypes,
  getGharana,
  getRagaNames,
  getInstruments,
  getLocationObject,
  getPerformanceSections,
  initializeAudioEvent,
  cleanEmptyDoc,
  saveAudioMetadata,
  getAllAudioEventMetadata,
  getAudioEvent,
  updateSaEstimate,
  getVerifiedStatus,
  getRaagRule,
  saveRaagRules,
  getAudioRecording,
  getNumberOfSpectrograms,
  userLoginGoogle,
  agreeToWaiver,
  nameFromUserID,
  makeSpectrograms,
  pieceExists,
  handleGoogleAuthCode,
  cloneTranscription,
  excelData,
  jsonData,
  updateTranscriptionTitle,
  updateTranscriptionPermissions,
  getInstrumentation,
  getIpaVowels,
  getConsonants,
  getAllTransOfAudioFile,
  getAllUsers,
  updateTranscriptionOwner
}