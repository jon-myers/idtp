from pymongo import MongoClient
from bson.objectid import ObjectId
import os
username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=true"
# replace with your connection string


client = MongoClient(query)
transcriptions = client['swara']['transcriptions']
users = client['swara']['users']


for transcription in transcriptions.find():
    user_id = transcription['userID']

    users.update_one(
        { '_id': ObjectId(user_id) },
        { '$push': { 'transcriptions': ObjectId(transcription['_id']) } }
    )

