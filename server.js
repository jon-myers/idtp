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
  }
};

cron.schedule('0 0 * * *', () => {
  spawn('python3', ['delete_unlinked_audio.py'])
})

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
const login = 'srv://jon_myers:tabular0sa';
const uri = `mongodb+${login}@${webAddress}?${settings}`;
// const uri = "mongodb+srv://jon_myers:tabular0sa@swara.f5cuf.mongodb.net/swara?retryWrites=true&w=majority"

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
      
    app.post('/insertNewTranscription', async (req, res) => {
      // creates new transcription entry in transcriptions collection
      try {
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
          audioID: 1
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
        await transcriptions.deleteOne(query);
        res.json('deleted _id ' + req.body._id);
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }    
    });

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
        const result = await musicians.find().sort(sorts).project(proj).toArray();
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
        const result = await ragas.find().sort(sortRule).project(proj).toArray();
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
        console.error (err)
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
      try {
        const result = await audioEvents.insertOne({});
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
        if (Object.keys(result).length === 0) {
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
          clientId: "324767655055-crhq76mdupavvrcedtde986glivug1nm.apps.googleusercontent.com",
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
        const result = await transcriptions.insertOne(copy);
        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(500).send
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
        res.status(500).send
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
        res.status(500).send
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
          const fileName = newUniqueId + getSuffix(avatar.mimetype);
          avatar.mv('./uploads/' + fileName);
          const processAudio = spawn('python3', ['process_audio.py', fileName, parentId, idx])
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
    app.use('/audio', express.static('audio'))
    app.use('/peaks', express.static('peaks'))
    app.use('/spectrograms', express.static('spectrograms'))
    app.use('/', express.static('dist'))
    const server = app.listen(3000);
    server.timeout = 600000;
  } catch (err) {
    console.throw(err)
  }
}

runServer();
