from pymongo import MongoClient
from bson.objectid import ObjectId
import os, mutagen
from mutagen.wave import WAVE
username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(query)
audio_events = client['swara']['audioEvents']
audio_recordings = client['swara']['audioRecordings']
all_events = audio_events.find()
for i, event in enumerate(all_events):
    rec_keys = list(event['recordings'].keys())
    for key in rec_keys:
        rec = event['recordings'][key]
        id = rec['audioFileId']
        dur = rec['duration']
        path = './audio/wav/' + str(id) + '.wav'
        real_dur = WAVE(path).info.length
        if real_dur != dur:
            print('fixing ' + str(id))
            print('old dur: ' + str(dur))
            print('new dur: ' + str(real_dur))
            
            out = audio_events.update_one({'_id': event['_id']}, {'$set': {'recordings.' + key + '.duration': real_dur}})
            print(out)
            out = audio_recordings.update_one({'_id': ObjectId(id)}, {'$set': {'duration': real_dur}})
            print(out)
            print('\n\n')
