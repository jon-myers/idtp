from pymongo import MongoClient
from bson.objectid import ObjectId
import os

username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(query)
users = client['swara']['users']
transcriptions = client['swara']['transcriptions']
recordings = client['swara']['audioRecordings']
audio_events = client['swara']['audioEvents']

# for each user, add `collections: []`
users.update_many({}, {'$set': {'collections': []}})
# for each transcription, add `collections: []`
transcriptions.update_many({}, {'$set': {'collections': []}})
# for each recording, add `collections: []`
recordings.update_many({}, {'$set': {'collections': []}})
# for each audio event, add `collections: []`
audio_events.update_many({}, {'$set': {'collections': []}})
