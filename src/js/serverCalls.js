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
      if (response.ok) {
        return response.json()
      }
    }).then(data => {
      if (data) {
        piece = data
      }
    }).catch(err => console.error(err))
  return piece
}

const getAudioDBEntry = async _id => {
  console.log('then', _id)
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


const savePiece = piece => {
  const data = JSON.stringify(piece);
  let request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: data
  };
  fetch(url + 'updateTranscription', request)
    .then(response => {
      if (response.ok) {
        return response.json()
      }
    }).then(out => console.log(out))
    .catch(err => console.error(err))
};

const getAllPieces = async () => {
  let allPieces;
  let request = {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  };
  await fetch(url + 'getAllTranscriptions', request)
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

const getSortedMusicians = async () => {
  // query 'musicians' mongoDB collection to get all musicians in alphabetical order
  let allMusicians;
  let request = {
    method: 'GET',
    headers: {
      'Conent-Type': 'application/json'
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
