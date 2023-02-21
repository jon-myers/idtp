const mongodb = require('mongodb');

const generateAudioRecordingsDB = async () => {
  const agg = [
    {
      '$project': {
        'recordings': {
          '$objectToArray': '$recordings'
        }, 
        '_id': 0, 
        'parentID': '$_id'
      }
    }, {
      '$unwind': {
        'path': '$recordings'
      }
    }, {
      '$project': {
        '_id': '$recordings.v.audioFileId', 
        'duration': '$recordings.v.duration', 
        'saEstimate': '$recordings.v.saEstimate', 
        'date': '$recordings.v.date', 
        'location': '$recordings.v.location', 
        'musicians': '$recordings.v.musicians', 
        'raags': '$recordings.v.raags', 
        'parentID': '$parentID',
        'octOffset': '$recordings.v.octOffset',

      }
    }, {
      '$out': 'audioRecordings'
    }
  ];

  const client = await mongodb.MongoClient.connect(
    'mongodb+srv://jon_myers:tabular0sa@swara.f5cuf.mongodb.net/test',
    { useNewUrlParser: true, useUnifiedTopology: true }
  );
  const coll = client.db('swara').collection('audioEvents');
  const cursor = coll.aggregate(agg);
  const result = await cursor.toArray();
  console.log(result);
  await client.close();
}

exports.generateAudioRecordingsDB = generateAudioRecordingsDB
