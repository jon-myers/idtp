const express = require('express')
const fileUpload = require('express-fileupload')
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const _ = require('lodash');
const { MongoClient, ObjectId } = require('mongodb')
const app = express();
const https = require('https');
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const history = require('connect-history-api-fallback');
const cron = require('node-cron');
const key = fs.readFileSync(__dirname + '/selfsigned.key');
const cert = fs.readFileSync(__dirname + '/selfsigned.crt');
const dot = require('mongo-dot-notation');
const options = { key: key, cert: cert };
const whitelist = [
  'https://chaparr.al', 
  'https://www.chaparr.al', 
  'http://localhost:8080',
  'chaparr.al'
];

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

var corsOptions = {
  origin: function (origin, callback) {
    console.log(origin)
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error(`Not allowed by CORS ${origin}`))
    }
  },
  credentials: true
}

app.use(fileUpload({
  createParentPath: true
}))
app.use(history({ 
  htmlAcceptHeaders: ['text/html']
}))

app.use(cors({
  origin: '*'
}));
app.use(bodyParser({limit:'1000mb'}))
app.use(express.json({
  type: ['application/json', 'text/plain']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
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

const uri = "mongodb+srv://jon_myers:tabular0sa@swara.f5cuf.mongodb.net/swara?retryWrites=true&w=majority"

MongoClient.connect(uri, { useUnifiedTopology: true })
  .then(client => {
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

    // creates new transcription entry in transcriptions collection
    app.post('/insertNewTranscription', (req, res) => {
      console.log(req.body)
      transcriptions.insertOne(req.body)
        .then(result => {
          console.log('inserted new transcription!')
          console.log(result.insertedId)
          res.send(JSON.stringify(result))
        })
        .catch(error => console.error(error))
    });
    
    app.post('/updateTranscription', (req, res) => {
      const updateObj = {};
      Object.keys(req.body).forEach(key => {
        if (key !== '_id') updateObj[key] = req.body[key]
      });
      updateObj['dateModified'] = new Date();
      transcriptions.updateOne({ '_id': ObjectId(req.body._id) }, {'$set': updateObj})
        .then(result => {
          console.log('updated transcription')
          res.send(JSON.stringify(result))
        })
        .catch(error => console.error(error))
    });

    app.get('/getAllTranscriptions', (req, res) => {
      console.log('trying to get all transcriptions')
      const projection = {
        title: 1,
        dateCreated: 1,
        dateModified: 1,
        location: 1,
        transcriber: 1,
        _id: 1,
        performers: 1,
        durTot: 1,
        raga: 1
      }
      const cursor = transcriptions.find().project(projection).toArray()
        .then(result => {
          res.send(JSON.stringify(result))
        })
    });
    
    // get all relevent data for audio files
    app.get('/getAllAudioFileMetaData', (req, res) => {
      const projection = {
        raag: 1,
        performers: 1,
        _id: 1,
        duration: 1,
        fundamental: 1,
        fileNumber: 1,
        year: 1,
      }
      const cursor = audioFiles.find().project(projection).toArray()
        .then(result => {
          res.send(JSON.stringify(result))
        })
    });
    
    app.get('/getAllAudioEventMetadata', async (req, res) => {
      // for now, just get everything, eventually gonna have to thin the herd via aggregation pipeline
      try {
        const result = await audioEvents.find().sort({ 'name': 1 }).toArray();
        res.json(result)
      } catch (err) {
        console.error(err)
      }
    });
    
    app.post('/getOneTranscription', (req, res) => {
      if (req.body._id === 0) {
        console.log('getting for editor')
        transcriptions.find().sort({"_id": 1}).next()
          .then(result => {
            res.send(JSON.stringify(result))
          })
      } else {
        transcriptions.findOne({ '_id': ObjectId(req.body._id) })
          .then(result => {
            console.log('pulling down another piece')
            res.send(JSON.stringify(result))
          })
      }
    })

    app.delete('/oneTranscription', (req, res) => {
      transcriptions.deleteOne(
        { "_id": ObjectId(req.body._id) }
      )
      .then(result => {
        res.json('deleted _id ' + req.body._id)
      })
      .catch(err => console.error(err))
    })
    
    
    app.post('/getAudioDBEntry', (req, res) => {
      console.log('heres and id: '+req.body._id)
      audioFiles.findOne({ '_id': ObjectId(req.body._id) })
        .then(result => {
          res.json(result)
        })
        .catch(err => {
          throw err;
        })
    })
    
    app.get('/getSortedMusicians', (req, res) => {
      //Get all names of all musicians from db, sorted
      const sorts = {'Last Name': 1, 'First Name': 1, 'Middle Name': 1};
      const projection = {'Initial Name': 1, _id: 0};
      musicians.find().sort(sorts).project(projection).toArray()
        .then(result => {
          res.json(result.map(r => r['Initial Name']))
        })
        .catch(err => {
          throw err
        })
    })
    
    app.get('/getGharana', (req, res) => {
      //gets gharana of a particular musician
      const initName = JSON.parse(req.query.initName);
      const query = { 'Initial Name': initName };
      const projection = { projection: {Gharana: 1, _id: 0} };
      musicians.findOne(query, projection)
        .then(result => {
          res.json(result)
        })
        .catch(err => {
          throw err;
        })
    })
    
    app.get('/getInstruments', (req, res) => {
      const projection = { name: 1, _id: 0 };
      console.log(req.query)
      if (req.query.melody) {
        const query = { 'kind': 'melody' }
        instruments.find(query).project(projection).toArray()
          .then(result => {
            res.json(result.map(r => r.name))
          })
          .catch(err => {
            throw err
          })
      } else {
        instruments.find().project(projection).toArray()
          .then(result => {
            res.json(result.map(r => r.name))
          })
          .catch(err => {
            throw err
          })
      }
    })
    
    app.get('/getRagaNames', (req, res) => {
      // gets names of all ragas
      const projection = { 'name': 1, _id: 0 };
      const sortRule = { 'name': 1 };
      ragas.find().sort(sortRule).project(projection).toArray()
        .then(result => {
          res.json(result.map(r => r.name))
        })
        .catch(err => {
          throw err
        })
    })
    
    app.get('/getLocationObject', (req, res) => {
      // gets location object
      location.findOne({}, { projection: { _id: 0 } })
        .then(result => {
          res.json(result)
        })
        .catch(err => {
          throw err
        })
    })
    
    app.get('/getEventTypes', (req, res) => {
      const projection = { 'type': 1, _id: 0 };
      eventTypes.find().project(projection).toArray()
        .then(result => {
          res.json(result.map(r => r.type))
        })
        .catch(err => {
          throw err
        })
    })
    
    app.get('/getPerformanceSections', (req, res) => {
      const projection = { 'name': 1, _id: 0 };
      performanceSections.find().project(projection).toArray()
        .then(result => {
          res.json(result.map(r => r.name))
        })
        .catch(err => {
          throw err
        })
    })
    
    app.get('/getAudioEvent', async (req, res) => {
      try {
        const result = await audioEvents.findOne({_id: ObjectId(req.query._id)});
        res.json(result)
      } catch (err) {
        throw err
      }    
    })
    
    app.post('/initializeAudioEvent', (req, res) => {
      // Creates a new (empty) AudioEvent mongDB entry, and receives back a 
      // unique _id for use throughout the upload / metadata entry process.
      audioEvents.insertOne({})
        .then(result => {
          res.json(result)
        })
        .catch(err => {
          throw err
        })
     
    })
    
    app.delete('/cleanEmptyDoc', (req, res) => {
      const query = { _id: ObjectId(req.body._id) }
      const projection = { projection: { _id: 0 } };
      audioEvents.findOne(query, projection)
        .then(result => {
          if (Object.keys(result).length === 0) {
            audioEvents.deleteOne(query)
            .then(output => {
              res.json(output)
            })
            .catch(err => console.error(err))
          }
        }).catch(err => console.error(err))  
    })
    
    app.post('/saveAudioMetadata', (req, res) => {
      const parentId = ObjectId(req.body._id);
      const myUpdates = req.body.updates;
      const query = { _id: parentId };
      const update = { $set: myUpdates };
      const options = { upsert: true };
      audioEvents.updateOne(query, update, options)
        .then(result => {
          res.json(result)
        })
        .catch(err => console.error(err))
    })
    
    app.post('/updateSaEstimate', async (req, res) => {
      try {
        const verString = `recordings.${req.body.recIdx}.saVerified`;
        const estString = `recordings.${req.body.recIdx}.saEstimate`;
        const query = { _id: ObjectId(req.body.aeID)};
        const update = { $set: {} };
        update.$set[verString] = req.body.verified;
        update.$set[estString] = req.body.saEstimate;
        const result = await audioEvents.updateOne(query, update);
        console.log(result)
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
        const projection = { '_id': 0 };
        projection['saEstimate'] = estString;
        projection['saVerified'] = verString;
        const options = { projection: projection }
        // console.log(projection);
        const result = await audioEvents.findOne(query, options);
        // console.log(result);
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
        console.log(req.body.name)
        const query = { name: req.body.name };
        // const update = dot.flatten(req.body);
        // console.log(update)
        const update = { $set: { rules: req.body.rules, updatedDate: req.body.date }};
        const options = { upsert: true }
        const result = await ragas.updateOne(query, update, options);
        console.log(result)
        res.json(result.acknowledged)
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    })
    
    // upload files (probably this can be moved out of this mongodb thing)
    app.post('/upload-avatar', async (req, res) => {
      try {
        if (!req.files) {
          res.send({
            status: false,
            message: 'No file uploaded'
          });
        } else {
          const parentId = req.body.parentID;
          const idx = req.body.idx;
          const avatar = req.files.avatar;
          const tempString = `recordings.${idx}.audioFileId`;
          const newUniqueId = await ObjectId();
          const query = { _id: ObjectId(parentId) };
          const update = { $set: { [tempString]: newUniqueId } };
          const options = { upsert: true };
          audioEvents.updateOne(query, update, options)
            .then(result => console.log(result))
            .catch(err => console.error(err))
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
          const makeImages = spawn('python3', ['make_images.py', newUniqueId.toString()])
          
        }
      } catch (err) {
        console.error(err)
        res.status(500).send(err);
      }
    });
    
  })
  .catch(error => console.error(error))
  
  
  
  

app.use('/audio', express.static('audio'))
app.use('/peaks', express.static('peaks'))
app.use('/spectrograms', express.static('spectrograms'))
app.use('/', express.static('dist'))


const server = app.listen(3000);
server.timeout = 600000;
