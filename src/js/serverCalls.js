const url = 'https://swara.studio/';
const axios = require('axios');

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

const getAllPieces = async userID => {
  let allPieces;
  let request = {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  };
  const query = '?' + new URLSearchParams({
    userID: JSON.stringify(userID)
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
  console.log(obj)
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
  await fetch(url + "oneTranscription", request)
    .then(response => {
      out = response
    })
    .catch(err => console.error(err))
  return out
};

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

const updateSaEstimate = async (recID, aeID, recIdx, saEstimate, verified) => {
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
      'verified': verified
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


const altUploadFile = async (file, onProgress, parentID, idx) => {
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


exports.getPiece = getPiece
exports.savePiece = savePiece
exports.getAllPieces = getAllPieces
exports.createNewPiece = createNewPiece
exports.deletePiece = deletePiece
exports.getAudioDBEntry = getAudioDBEntry
exports.getAllAudioFileMetaData = getAllAudioFileMetaData
exports.uploadFile = altUploadFile
exports.getSortedMusicians = getSortedMusicians
exports.getEventTypes = getEventTypes
exports.getGharana = getGharana
exports.getRagaNames = getRagaNames
exports.getInstruments = getInstruments
exports.getLocationObject = getLocationObject
exports.getPerformanceSections = getPerformanceSections
exports.initializeAudioEvent = initializeAudioEvent
exports.cleanEmptyDoc = cleanEmptyDoc
exports.saveAudioMetadata = saveAudioMetadata
exports.getAllAudioEventMetadata = getAllAudioEventMetadata
exports.getAudioEvent = getAudioEvent
exports.updateSaEstimate = updateSaEstimate
exports.getVerifiedStatus = getVerifiedStatus
exports.getRaagRule = getRaagRule
exports.saveRaagRules = saveRaagRules
exports.getAudioRecording = getAudioRecording
exports.getNumberOfSpectrograms = getNumberOfSpectrograms
exports.userLoginGoogle = userLoginGoogle
exports.agreeToWaiver = agreeToWaiver
exports.nameFromUserID = nameFromUserID
exports.makeSpectrograms = makeSpectrograms
exports.pieceExists = pieceExists
