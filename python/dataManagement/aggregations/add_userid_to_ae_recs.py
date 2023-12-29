from pymongo import MongoClient
from bson.objectid import ObjectId
import os
username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(query)
audioRecordings = client['swara']['audioRecordings']
audioEvents = client['swara']['audioEvents']

all_recs = audioRecordings.find()

for rec in all_recs:
    parent_id = rec['parentID']
    track_num = rec['parentTrackNumber']
    ae = audioEvents.find_one({ '_id': ObjectId(parent_id) })
    ae_rec = ae['recordings'][track_num]
    # add the userID field to each ae['recordings'][track_num] so that it matches
    # the userID of the audioRecording, and set this change via mongo
    path = 'recordings.' + str(track_num) + '.userID'
    update = {'$set': {path: rec['userID']}}
    audioEvents.update_one({'_id': ObjectId(parent_id)}, update)

  
