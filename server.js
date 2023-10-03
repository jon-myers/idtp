const express = require('express')
const fileUpload = require('express-fileupload')
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const { MongoClient, ObjectId } = require('mongodb');
const app = express();
const { promises: fs } = require('fs');
const { spawn } = require('child_process');
const history = require('connect-history-api-fallback');
const cron = require('node-cron');
const aggregations = require('./aggregations.js');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();
const console = require('console');

async function exists (path) {  
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

const getSuffix = mimetype => {
  // TODO add other audio file types
  const end = mimetype.split('/')[1];
  if (end === 'mpeg') {
    return '.mp3'
  } else if (end === 'wav' || end === 'x-wav') {
    return '.wav'
  } else if (end === 'm4a' || end === 'x-m4a') {
    return '.m4a'
  } else if (end === 'flac' || end === 'x-flac') {
    return '.flac'
  } else if (end === 'ogg' || end === 'x-ogg') {
    return '.opus'
  } else if (end === 'opus' || end === 'x-opus') {
    return '.opus'
  }
};

cron.schedule('0 0 * * *', () => {
  spawn('python3', ['delete_unlinked_audio.py'])
})

// schedule a cron job to backup every day
cron.schedule('0 0 * * *', () => {
  spawn('python3', ['backups/backup_mongo.py'])
});

app.use(fileUpload({
  createParentPath: true
}))
app.use(history({
  htmlAcceptHeaders: ['text/html']
}))

app.use(cors({
  origin: '*'
}));
app.use(bodyParser({
  limit: '1000mb'
}))
app.use(express.json({
  type: ['application/json', 'text/plain']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(morgan('dev'));

const apiTimeout = 600000;
app.use((req, res, next) => {
  // Set the timeout for all HTTP requests
  req.setTimeout(apiTimeout, () => {
    let err = new Error('Request Timeout');
    err.status = 408;
    next(err);
  });
  // Set the server response timeout for all HTTP requests
  res.setTimeout(apiTimeout, () => {
    let err = new Error('Service Unavailable');
    err.status = 503;
    next(err);
  });
  next();
});
const settings = 'retryWrites=true&w=majority';
const webAddress = 'swara.f5cuf.mongodb.net/swara';
const password = process.env.PASSWORD;
const username = process.env.USER_NAME;
const login = `srv://${username}:${password}`;
const uri = `mongodb+${login}@${webAddress}?${settings}`;

const runServer = async () => {
  try {
    const client = await MongoClient.connect(uri, { useUnifiedTopology: true });    
    console.log('Connected to Database')
    const db = client.db('swara');
    const transcriptions = db.collection('transcriptions');
    const audioFiles = db.collection('audioFiles');
    const audioEvents = db.collection('audioEvents');
    const musicians = db.collection('musicians');
    const eventTypes = db.collection('audioEventTypes');
    const ragas = db.collection('ragas');
    const instruments = db.collection('instruments');
    const location = db.collection('location');
    const performanceSections = db.collection('performanceSections');
    const audioRecordings = db.collection('audioRecordings');
    const users = db.collection('users');
    const phonemes = db.collection('phonemes');
      
    app.post('/insertNewTranscription', async (req, res) => {
      // creates new transcription entry in transcriptions collection
      try {
        const insert = req.body;
        insert['dateCreated'] = new Date(insert.dateCreated);
        insert['dateModified'] = new Date(insert.dateModified);
        const result = await transcriptions.insertOne(req.body)
        res.send(JSON.stringify(result));
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    });

    app.post('/updateTranscription', async (req, res) => {
      // updates a transcription
      const updateObj = {};
      Object.keys(req.body).forEach(key => {
        if (key !== '_id') updateObj[key] = req.body[key]
      });
      updateObj['dateModified'] = new Date();
      updateObj['dateCreated'] = new Date(updateObj['dateCreated'])
      const query = { '_id': ObjectId(req.body._id) };
      const update = { '$set': updateObj };
      try {
        const result = await transcriptions.updateOne(query, update);
        result['dateModified'] = updateObj['dateModified']
        res.send(JSON.stringify(result))
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    });


    app.get('/getAllTranscriptions', async (req, res) => {
      try {
        const userID = JSON.parse(req.query.userID);
        const sortKey = JSON.parse(req.query.sortKey);
        let secondarySortKey = undefined;
        if (sortKey === 'family_name') secondarySortKey = 'given_name';
        const sortDir = JSON.parse(req.query.sortDir);
        const proj = {
          title: 1,
          dateCreated: 1,
          dateModified: 1,
          location: 1,
          transcriber: 1,
          _id: 1,
          performers: 1,
          durTot: 1,
          raga: 1,
          userID: 1,
          permissions: 1,
          name: 1,
          family_name: 1,
          given_name: 1,
          audioID: 1,
          instrumentation: 1
        }
        const query = {
          '$or': [
            {
              '$or': [
                { 'permissions': 'Public' },
                { 'permissions': 'Publicly Editable' }
              ]
            },
            { 'userID': userID },
          ]
        };
        const sort = {};
        sort[sortKey] = sortDir;
        if (secondarySortKey) sort[secondarySortKey] = sortDir;
        const result = await transcriptions
          .find(query)
          .collation({ 'locale': 'en' })
          .sort(sort)
          .project(proj)
          .toArray();
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    });

    app.get('/getAllTranscriptionsOfAudioFile', async (req, res) => {
      const query = {
        audioID: req.query.audioID,
        $or: [
          { userID: req.query.userID },
          { permissions: { $in: ['Public', 'Publicly Editable'] } }
        ]
      };
      const projection = {
        title: 1,
        name: 1,
      };
      try {
        const result = await transcriptions.find(query)
          .project(projection).toArray();
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    });

    app.get('/nameFromUserID', async (req, res) => {
      // retrieve a user's name from their associated userID in the users db
      const query = {
        _id: ObjectId(JSON.parse(req.query.userID))
      };
      try {
        const result = await users.findOne(query);
        res.send(await JSON.stringify(result.name))
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    });

    app.get('/allUsers', async (req, res) => {
      try {
        const result = await users.find().toArray();
        res.send(await JSON.stringify(result))
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }

    })

    app.get('/getAllAudioFileMetaData', async (req, res) => {
      // get all relevent data for audio files
      const projection = {
        raag: 1,
        performers: 1,
        _id: 1,
        duration: 1,
        fundamental: 1,
        fileNumber: 1,
        year: 1,
      }
      try {
        const result = await audioFiles.find().project(projection).toArray();
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    });

    app.get('/getAllAudioEventMetadata', async (req, res) => {
      // retreive metadata for all audio events
      try {
        const result = await audioEvents.find().sort({
          'name': 1
        }).toArray();
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    });

    app.post('/getOneTranscription', async (req, res) => {
      // retreive a particular transcription. If _id is 0, return first one.
      if (req.body._id === 0) {
        try {
          const result = await transcriptions.find().sort({ "_id": 1 }).next();
          res.json(result)
        } catch (err) {
          console.error(err);
          res.status(500).send(err);
        }
      } else {
        try {
          const query = { '_id': ObjectId(req.body._id) };
          const result = await transcriptions.findOne(query);
          res.send(JSON.stringify(result))
        } catch (err) {
          console.error(err);
          res.status(500).send(err);
        }  
      }
    });
    
    app.get('/pieceExists', async (req, res) => { 
      try {
        const query = { _id: ObjectId(req.query._id) };
        const result = await transcriptions.countDocuments(query) > 0;
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err)
      }
    });

    app.delete('/oneTranscription', async (req, res) => {
      // delete a particular transcription
      try {
        const query = { "_id": ObjectId(req.body._id) };
        const result = await transcriptions.deleteOne(query);
        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }    
    });

    app.delete('/deleteAudioEvent', async (req, res) => {
      // delete a particular audio event
      try {
        const query = { "_id": ObjectId(req.body._id) };
        const projection = { 'recordings': 1, '_id': 0 };
        const result = await audioEvents.findOne(query, projection);
        const recordings = result.recordings;
        const idxs = Object.keys(recordings);
        idxs.forEach(async idx => {
          const recID = recordings[idx].audioFileId?.toString();
          // remove from peaks folder
          const peaksPath = 'peaks/' + recID + '.json';
          const spectrogramsPath = 'spectrograms' + recID;
          const mp3Path = 'audio/mp3/' + recID + '.mp3';
          const wavPath = 'audio/wav/' + recID + '.wav';
          const opusPath = 'audio/opus/' + recID + '.opus';
          const peaksPathExists = await exists(peaksPath);
          const spectrogramsPathExists = await exists(spectrogramsPath);
          const mp3PathExists = await exists(mp3Path);
          const wavPathExists = await exists(wavPath);
          const opusPathExists = await exists(opusPath);
          if (peaksPathExists) {
            fs.unlink(peaksPath)
          }
          if (spectrogramsPathExists) {
            fs.rm(spectrogramsPath, { recursive: true, force: true })
          }
          if (mp3PathExists) {
            fs.unlink(mp3Path)
          }
          if (wavPathExists) {
            fs.unlink(wavPath)
          }
          if (opusPathExists) {
            fs.unlink(opusPath)
          }
        })
        const delResult = await audioEvents.deleteOne(query);
        console.log(delResult)
        res.json(delResult);
        // res.json('not deleted _id ' + req.body._id);
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    })

    app.post('/getAudioDBEntry', async (req, res) => {
      // retrieve a particular entry from the audioFiles db
      try {
        const query = { '_id': ObjectId(req.body._id) };
        const result = await audioFiles.findOne(query);
        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }    
    });

    app.get('/getSortedMusicians', async (req, res) => {
      //Get all names of all musicians from db, sorted
      const sorts = { 'Last Name': 1, 'First Name': 1, 'Middle Name': 1};
      const proj = { 'Initial Name': 1, _id: 0 };
      try {
        let result = await musicians.find().sort(sorts).project(proj).toArray();
        res.json(result.map(r => r['Initial Name']))
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    });

    app.get('/getGharana', async (req, res) => {
      //gets gharana of a particular musician
      const initName = JSON.parse(req.query.initName);
      const query = { 'Initial Name': initName };
      const projection = { projection: { Gharana: 1, _id: 0 } };
      try {
        const result = musicians.findOne(query, projection);
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }    
    });

    app.get('/getInstruments', async (req, res) => {
      // get names of all instruments, or instruments  of particular kind (if 
      // melody is true)
      const proj = { name: 1, _id: 0 };
      if (req.query.melody) {
        const query = { 'kind': 'melody' };
        try {
          const result = await instruments.find(query).project(proj).toArray();
          res.json(result.map(r => r.name))
        } catch (err) {
          console.error(err);
          res.status(500).send(err);
        }        
      } else {
        try {
          const result = await instruments.find().project(proj).toArray();
          res.json(result.map(r => r.name))
        } catch (err) {
          console.error(err);
          res.status(500).send(err);
        }
      }
    });

    app.get('/getRagaNames', async (req, res) => {
      // gets names of all ragas
      const proj = { 'name': 1, _id: 0 };
      const sortRule = { 'name': 1 };
      try {
        let result = await ragas.find().sort(sortRule).project(proj).toArray();
        const names = await result.map(r => r.name);
        res.json(names)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }    
    });

    app.get('/getLocationObject', async (req, res) => {
      // gets location object
      try {
        const result = await location.findOne({}, { projection: { _id: 0 } });
        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    });

    app.get('/getEventTypes', async (req, res) => {
      // retrieve list of all possible event types
      const projection = { 'type': 1, _id: 0 };
      try {
        const result = await eventTypes.find().project(projection).toArray();
        res.json(result.map(r => r.type))
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }    
    });

    app.get('/getPerformanceSections', async (req, res) => {
      // retrieve list of all possible performance sections
      const proj = { 'name': 1, _id: 0 };
      try {
        const result = await performanceSections.find().project(proj).toArray();
        res.json(result.map(r => r.name));
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    });

    app.get('/getNumberOfSpectrograms', async (req, res) => {
      // returns the number of spectrograms that the app needs to load
      const dir = 'spectrograms/' + req.query.id + '/0';
      try {  
        const files = await fs.readdir(dir);
        res.json(files.length)  
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    });
    
    app.post('/makeSpectrograms', async (req, res) => {
      // generate spectrograms for the given recording ID and tonic estimate  
      const makingSpecs = spawn(
        'python3', 
        ['generate_log_spectrograms.py', req.body.recId, req.body.saEst]
      );
      try {
        makingSpecs.stdout.on('data', data => {
          console.log(`stdout: ${data}`)
        });
        
        makingSpecs.stderr.on('data', data => {
          console.error(`stderr: ${data}`)
        });
        await makingSpecs.on('close', (msg) => {
          console.log(msg)
          res.json('made the spectrograms')
        })
      } catch (err) {
        console.error(err)
      }
    })

    app.post('/makeMelograph', async (req, res) => {
      const makingMelograph = spawn(
        'python3', 
        ['generate_melograph.py', req.body.recId, req.body.saEst]
      );
      try {
        makingMelograph.stdout.on('data', data => {
          console.log(`stdout: ${data}`)
        });
        
        makingMelograph.stderr.on('data', data => {
          console.error(`stderr: ${data}`)
        });
        await makingMelograph.on('close', (msg) => {
          console.log(msg)
          res.json('made the melograph')
        })
      } catch (err) {
        console.error(err)
      }
    })

    app.get('/getAudioEvent', async (req, res) => {
      try {
        const result = await audioEvents.findOne({
          _id: ObjectId(req.query._id)
        });
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    })

    app.get('/getAudioRecording', async (req, res) => {
      try {
        const result = await audioRecordings.findOne({
          _id: ObjectId(req.query._id)
        });
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    })

    app.post('/initializeAudioEvent', async (req, res) => {
      // Creates a new (empty) AudioEvent mongDB entry, and receives back a 
      // unique _id for use throughout the upload / metadata entry process.
      const userID = req.body.userID;
      try {
        const result = await audioEvents.insertOne({ 
          userID: userID,
          permissions: "Public", 
        });
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    })

    app.delete('/cleanEmptyDoc', async (req, res) => {
      const query = { _id: ObjectId(req.body._id) };
      const projection = { projection: { _id: 0 } };
      try {
        const result = await audioEvents.findOne(query, projection)
        if (Object.keys(result).length <= 2) {
          const output = await audioEvents.deleteOne(query);
          res.json(output)
        }
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }    
    })

    app.post('/saveAudioMetadata', async (req, res) => {
      const parentId = ObjectId(req.body._id);
      const myUpdates = req.body.updates;
      const query = { _id: parentId };
      const update = { $set: myUpdates };
      const options = { upsert: true };
      try {
        const result = await audioEvents.updateOne(query, update, options);
        res.json(result);
        aggregations.generateAudioRecordingsDB();
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }    
    })

    app.post('/updateSaEstimate', async (req, res) => {
      try {
        const verString = `recordings.${req.body.recIdx}.saVerified`;
        const estString = `recordings.${req.body.recIdx}.saEstimate`;
        const octString = `recordings.${req.body.recIdx}.octOffset`;
        const query = { _id: ObjectId(req.body.aeID) };
        const update = { $set: {} };
        update.$set[verString] = req.body.verified;
        update.$set[estString] = req.body.saEstimate;
        update.$set[octString] = req.body.octOffset;
        await audioEvents.updateOne(query, update);
        const otherQuery = { _id: ObjectId(req.body.recID) };
        const saEst = req.body.saEstimate;
        const ver = req.body.verified;
        const oct = req.body.octOffset;
        const setting = { saEstimate: saEst, saVerified: ver, octOffset: oct };
        const otherUpdate = { $set: setting };
        const oRes = await audioRecordings.updateOne(otherQuery, otherUpdate);
        res.json(oRes)
      } catch (err) {
        console.error(err);
        res.status(500).send(err)
      }
    })

    app.post('/updateTranscriptionTitle', async (req, res) => {
      try {
        const query = { _id: ObjectId(req.body.id) };
        const update = { $set: { title: req.body.title} };
        const result = await transcriptions.updateOne(query, update);
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err)
      }
    })

    app.post('/updateTranscriptionPermissions', async (req, res) => {
      try {
        const query = { _id: ObjectId(req.body.id) };
        const update = { $set: { permissions: req.body.permissions} };
        const result = await transcriptions.updateOne(query, update);
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    })

    app.post('/updateTranscriptionOwner', async (req, res) => {
      try {
        const query = { _id: ObjectId(req.body.transcriptionID) };
        const update = { $set: { 
          userID: req.body.userID,
          name: req.body.name,
          family_name: req.body.family_name,
          given_name: req.body.given_name
        } };
        const result = await transcriptions.updateOne(query, update);
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    })

    app.get('/getVerifiedStatus', async (req, res) => {
      try {
        const query = { _id: ObjectId(req.query.aeID) };
        const verString = `$recordings.${req.query.recIdx}.saVerified`;
        const estString = `$recordings.${req.query.recIdx}.saEstimate`;
        const octOffset = `$recordings.${req.query.recIdx}.octOffset`;
        const projection = { '_id': 0 };
        projection['saEstimate'] = estString;
        projection['saVerified'] = verString;
        projection['octOffset'] = octOffset;
        const options = { projection: projection };
        const result = await audioEvents.findOne(query, options);
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    })

    app.get('/getRaagRule', async (req, res) => {
      try {
        const query = { name: req.query.name };
        const projection = { _id: 0, rules: 1, updatedDate: 1 };
        const options = { projection: projection };
        const result = await ragas.findOne(query, options);
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err)
      }
    })

    app.get('/getIpaVowels', async (req, res) => {
      try {
        const query = { type: 'vowel' };
        const projection = { _id: 0 };
        const options = { projection: projection };
        const result = await phonemes.find(query, options).toArray();
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err)
      }
    })

    app.get('/getConsonants', async (req, res) => {
      try {
        const query = { type: 'consonant' };
        const projection = { _id: 0 };
        const options = { projection: projection };
        const result = await phonemes.find(query, options).toArray();
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err)
      }
    })

    app.post('/saveRaagRules', async (req, res) => {
      try {
        const query = { name: req.body.name };
        const update = {
          $set: { rules: req.body.rules, updatedDate: req.body.date }
        };
        const options = { upsert: true };
        const result = await ragas.updateOne(query, update, options);
        res.json(result.acknowledged)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    })

    app.post('/userLoginGoogle', async (req, res) => {
      try {
        const query = { sub: req.body.sub };
        const update = { $set: req.body };
        const options = { upsert: true, returnDocument: 'after' };
        const result = await users.findOneAndUpdate(query, update, options);
        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    })

    app.post('/agreeToWaiver', async (req, res) => {
      try {
        const query = { _id: ObjectId(req.body.userID) };
        const update = { $set: { waiverAgreed: true } };
        const options = { upsert: true };
        const result = await users.updateOne(query, update, options);
        res.json(result)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    })

    app.post('/handleGoogleAuthCode', async (req, res) => {
      
      try {
        let url = req.body.redirectURL;
        url = url.slice(0, url.length-1);
        console.log(url)
        const OAuthClient = new OAuth2Client({
          clientId: "324767655055-crhq76mdupavvrcedtde986glivug1nm.apps.googl" +
            "eusercontent.com",
          clientSecret: "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",
          redirectUri: url
        });
        let { tokens } = await OAuthClient.getToken(req.body.authCode);
        OAuthClient.setCredentials({ access_token: tokens.access_token });
        const userinfo = await OAuthClient.request({
          url: 'https://www.googleapis.com/oauth2/v3/userinfo'
        })
        res.json(userinfo.data)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    })

    app.post('/cloneTranscription', async (req, res) => {
      try {

        const query = { _id: ObjectId(req.body.id) };
        console.log(query)
        const copy = await transcriptions.findOne(query);
        console.log(copy)
        copy._id = new ObjectId();
        copy.title = req.body.title;
        copy.userID = req.body.newOwner;
        copy.permissions = req.body.permissions;
        copy.name = req.body.name;
        copy.family_name = req.body.family_name;
        copy.given_name = req.body.given_name;
        copy.dateModified = new Date();
        copy.dateCreated = new Date();
        const result = await transcriptions.insertOne(copy);
        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(500).send(err)
      }
    })

    app.get('/excelData', async (req, res) => {
      const id = req.query._id;
      const argvs = [
        'make_excel.py',
        id,
        `data/json/${id}.json`,
        `data/excel/${id}.xlsx`
      ];
      try {
        const pythonScript = spawn('python3', argvs);
        pythonScript.stdout.on('data', data => {
          console.log(`stdout: ${data}`)
        });
        
        pythonScript.stderr.on('data', data => {
          console.error(`stderr: ${data}`)
        });
        await pythonScript.on('close', () => {
          res.download(`data/excel/${id}.xlsx`);
        }) 
      } catch (err) {
        console.error(err);
        res.status(500).send(err)
      }
    })

    app.get('/jsonData', async (req, res) => {
      const id = req.query._id;
      const argvs = [
        'make_excel.py',
        id,
        `data/json/${id}.json`,
        `data/excel/${id}.xlsx`
      ];
      try {
        const pythonScript = spawn('python3', argvs);
        pythonScript.stdout.on('data', data => {
          console.log(`stdout: ${data}`)
        });
        
        pythonScript.stderr.on('data', data => {
          console.error(`stderr: ${data}`)
        });
        await pythonScript.on('close', () => {
          res.download(`data/json/${id}.json`);
        }) 
      } catch (err) {
        console.error(err);
        res.status(500).send(err)
      }
    })

    app.get('/getInstrumentation', async (req, res) => {
      try {
        const audioID = ObjectId(JSON.parse(req.query.audioID));
        const query = { _id: audioID };
        const projection = { projection: { musicians: 1, _id: 0 } };
        const result = await audioRecordings.findOne(query, projection);
        const musicians = result.musicians;
        const keys = Object.keys(musicians);
        const sortOrder = ['Soloist', 'Accompanist'];
        const musiciansArr = keys
          .map(key => musicians[key])
          .filter(musician => sortOrder.includes(musician.role))
        const ordering = {};
        for (let i=0; i<sortOrder.length; i++) {
          ordering[sortOrder[i]] = i;
        }
        musiciansArr.sort((a, b) => ordering[a.role] - ordering[b.role]);
        const instrumentation = musiciansArr.map(m => m.instrument);
        res.json(instrumentation);
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    })
    
    app.post('/upload-avatar', async (req, res) => {
    // upload files, and send back progress, via axios (doesn't work with fetch)
      try {
        if (!req.files) {
          res.send({ status: false, message: 'No file uploaded' });
        } else {
          const parentId = req.body.parentID;
          const idx = req.body.idx;
          const avatar = req.files.avatar;
          const tempString = `recordings.${idx}.audioFileId`;
          const newUniqueId = await ObjectId();
          const query = { _id: ObjectId(parentId) };
          const update = { $set: { [tempString]: newUniqueId } };
          const options = { upsert: true };
          await audioEvents.updateOne(query, update, options)
          const suffix = getSuffix(avatar.mimetype);
          let fileName = newUniqueId + suffix;
          avatar.mv('./uploads/' + fileName);
          if (suffix === '.opus') {
            const newFileName = newUniqueId + '.wav';
            const spawnArgs = ['-i', './uploads/' + fileName, './uploads/' + newFileName];
            const convertToOpus = spawn('ffmpeg', spawnArgs)
            fileName = newFileName;
            convertToOpus.stderr.on('data', data => {
              console.error(`stderr: ${data}`)
            });
            await convertToOpus.on('close', () => {
              console.log('opus conversion finished')
            })
          }
          const spawnArr = ['process_audio.py', fileName, parentId, idx];
          const processAudio = spawn('python3', spawnArr);
          processAudio.stderr.on('data', data => {
            console.error(`stderr: ${data}`)
          });
          await processAudio.on('close', () => {
            console.log('python closed, finally')
            res.send({
              status: true,
              message: 'File is uploaded',
              data: {
                name: avatar.name,
                mimetype: avatar.mimetype,
                size: avatar.size,
                audioFileId: newUniqueId
              }
            });
          });
          spawn('python3', ['make_images.py', newUniqueId.toString()])
        }
      } catch (err) {
        console.error(err)
        res.status(500).send(err);
      }
    });

    const setNoCache = res => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0')
    };
    app.use('/audio', express.static('audio', { setHeaders: setNoCache }));
    app.use('/peaks', express.static('peaks', { setHeaders: setNoCache }));
    app.use('/spectrograms', express.static('spectrograms', { 
      setHeaders: setNoCache 
    }))
    app.use('/melographs', express.static('melographs', { 
      setHeaders: setNoCache 
    }));
    app.use('/', express.static('dist'))
    const server = app.listen(3000);
    server.timeout = 600000;
  } catch (err) {
    console.error(err)
  }
}

runServer();
