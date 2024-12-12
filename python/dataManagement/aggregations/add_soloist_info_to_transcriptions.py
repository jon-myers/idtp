from pymongo import MongoClient
from bson.objectid import ObjectId
import os

username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(query)
transcriptions = client['swara']['transcriptions']
audioRecordings = client['swara']['audioRecordings']

for transcription in transcriptions.find():
    if transcription.get('audioID') is not None:
        audio_object_id = ObjectId(transcription['audioID'])
        audioRecording = audioRecordings.find_one({ '_id': audio_object_id })
        if audioRecording is not None:
            musicians = list(audioRecording.get('musicians', {}).items())
            soloist = next((k for k, v in musicians if v.get('role') == 'Soloist'), None)
            if soloist is not None:
                query = { '_id': transcription['_id'] }
                update = { '$set': { 
                    'soloist': soloist,
                    'soloInstrument': audioRecording['musicians'][soloist]['instrument'] 
                    }}
            else:
                query = { '_id': transcription['_id'] }
                update = { '$set': { 
                    'soloist': None,
                    'soloInstrument': None
                }}
        else:
            query = { '_id': transcription['_id'] }
            update = { '$set': { 
                'soloist': None,
                'soloInstrument': None
            }}
    else:
        query = { '_id': transcription['_id'] }
        update = { '$set': { 
            'soloist': None,
            'soloInstrument': None
        }}
    transcriptions.update_one(query, update)
