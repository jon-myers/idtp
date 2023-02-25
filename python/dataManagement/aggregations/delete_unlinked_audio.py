from pymongo import MongoClient
import os
# Requires the PyMongo package.
# https://api.mongodb.com/python/current

username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"

client = MongoClient(query)
result = client['swara']['audioEvents'].aggregate([
    {
        '$project': {
            'recordings': {
                '$objectToArray': '$recordings'
            }, 
            '_id': 0
        }
    }, {
        '$unwind': {
            'path': '$recordings'
        }
    }, {
        '$project': {
            'uniqueId': '$recordings.v.audioFileId'
        }
    }, {
        '$group': {
            '_id': 'null', 
            'data': {
                '$push': '$$ROOT'
            }
        }
    }, {
        '$project': {
            '_id': 0, 
            'all': '$data.uniqueId'
        }
    }
])

ids = result.next()['all']

path_to_audio = './audio'
mp3s = os.listdir(path_to_audio + '/mp3')
wavs = os.listdir(path_to_audio + '/wav')
for mp3 in mp3s:
    if not mp3.split('.')[0] in [str(x) for x in ids]:
        os.remove(path_to_audio + '/mp3/' + mp3)
for wav in wavs:
    if not wav.split('.')[0] in [str(x) for x in ids]:
        os.remove(path_to_audio + '/wav/' + wav)

    
