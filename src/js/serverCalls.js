const url = 'https://swara.studio/';
import axios from 'axios';

// import { Piece } from './classes.js';


const getPiece = async id => {
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

  await fetch(url + 'getOneTranscription', request)
    .then(response => {
      // console.log(response)
      if (response.ok) {
        return response.json()
      }
    }).then(data => {
      piece = data;
      if (!piece) throw 'no piece'
    }).catch(err => console.error(err))
  return piece
}

const pieceExists = async id => {
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

const excelData = async id => {
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
    a.href = window.URL.createObjectURL(data);
    a.download = 'data.xlsx';
    a.click();
  } catch (err) {
    console.error(err)
  }
}

const jsonData = async id => {
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
    a.href = window.URL.createObjectURL(data);
    a.download = 'data.json';
    a.click();
  } catch (err) {
    console.error(err)
  }
}

const getAudioDBEntry = async _id => {
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


const savePiece = async piece => {
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

const getAllPieces = async (userID, sortKey, sortDir) => {
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
  await fetch(url + 'getAllTranscriptions' + query, request)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
    }).then(data => {
      if (data) {
        allPieces = data
      }
    }).catch(err => console.error(err));
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

const getAudioEvent = async _id => {
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

const getAudioRecording = async _id => {
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

const getSortedMusicians = async () => {
  // query 'musicians' mongoDB collection to get all musicians in alphabetical order
  let allMusicians;
  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  await fetch(url + 'getSortedMusicians', request)
    .then(res => {
      if (res.ok) {
        return res.json();
      }
    }).then(data => {
      if (data) {
        allMusicians = data
      }
    }).catch(err => console.error(err))
  return allMusicians
};

const getEventTypes = async () => {
  // query 'audioEventTypes' mongoDB collection to get all event types
  let allEventTypes;
  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  await fetch(url + 'getEventTypes', request)
    .then(res => {
      if (res.ok) {
        return res.json();
      }
    }).then(data => {
      if (data) {
        allEventTypes = data
      }
    }).catch(err => console.error(err))
    return allEventTypes
};

const getGharana = async initName => {
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

const getInstruments = async melody => {
  melody = melody || false;
  const suffix = melody ? 
    '?' + new URLSearchParams({
      melody: true
    }) : 
    '';
  let instruments;
  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  await fetch(url + 'getInstruments' + suffix, request)
    .then(res => {
      if (res.ok) {
        return res.json();
      }
    }).then(data => {
      if (data) {
        instruments = data
      }
    }).catch(err => console.error(err))
    return instruments
};

const getNumberOfSpectrograms = async id => {
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

const makeSpectrograms = async (recId, saEst) => {
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

const getRagaNames = async () => {
  // gets all raga names
  let ragas;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  await fetch(url + 'getRagaNames', request)
    .then(res => {
      if (res.ok) {
        return res.json()
      }
    }).then(data => {
      if (data) {
        ragas = data
      }
    }).catch(err => console.error(err))
    return ragas
};

const getRaagRule = async name => {
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

const getLocationObject = async () => {
  // gets location object
  let location;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  await fetch(url+'getLocationObject', request)
    .then(res => {
      if (res.ok) {
        return res.json()
      }
    }).then(data => {
      if (data) {
        location = data
      }
    }).catch(err => console.error(err))
  return location
};

const getPerformanceSections = async () => {
  let performanceSections;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  await fetch(url + 'getPerformanceSections', request)
    .then(res => {
      if (res.ok) {
        return res.json()
      }
    }).then(data => {
      if (data) {
        performanceSections = data
      }
    }).catch(err => console.error(err))
  return performanceSections
};

const createNewPiece = async obj => {
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
    }).then(data => {
      if (data) {
        out = data
      }
    })
  return out
};

const deletePiece = async piece => {
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

const deleteAudioEvent = async aeID => {
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

const initializeAudioEvent = async () => {
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
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

const cleanEmptyDoc = async _id => {
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

const saveAudioMetadata = async (_id, updates) => {
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

const updateSaEstimate = async (recID, aeID, recIdx, saEstimate, verified, octOffset) => {
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      'recID': recID,
      'aeID': aeID,
      'recIdx': recIdx,
      'saEstimate': saEstimate,
      'verified': verified,
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

const getVerifiedStatus = async (aeID, recIdx) => {
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  let out;
  try {
    const response = await fetch(url + 'getVerifiedStatus?' + new URLSearchParams({
      aeID: aeID,
      recIdx: recIdx
    }), request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const saveRaagRules = async (name, rules, date) => {
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


const uploadFile = async (file, onProgress, parentID, idx) => {
  const formData = new FormData();
  formData.append('avatar', file);
  formData.append('parentID', parentID);
  formData.append('idx', idx);
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: progressEvent => {
      const progressPercent = 100 * progressEvent.loaded / progressEvent.total;
      if (onProgress) onProgress(progressPercent);
      return progressPercent
    }
  };
  try {
    const response = await axios.post(url+'upload-avatar', formData, config)
    if (!response.statusText === 'OK') {
      throw new Error(`Error! status: ${response.status}`)
    }
    return response.data;
  } catch (err) {
    console.log(err)
  }
}

const userLoginGoogle = async userData => {
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

const agreeToWaiver = async userID => {
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

const nameFromUserID = async userID => {
  let out;
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  try {
    const response = await fetch(url + 'nameFromUserID?' + new URLSearchParams({
      userID: JSON.stringify(userID)
    }), request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const handleGoogleAuthCode = async (code, redirectURL) => {
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

const updateTranscriptionTitle = async (id, title) => {
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

const updateTranscriptionPermissions = async (id, permissions) => {
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
    const response = await fetch(url + 'updateTranscriptionPermissions', request);
    if (response.ok) {
      out = await response.json()
    }
    return out
  } catch (err) {
    console.error(err)
  }
}

const cloneTranscription = async (id, title, newOwner, permissions) => {
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
      permissions: permissions 
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
  updateTranscriptionPermissions
}