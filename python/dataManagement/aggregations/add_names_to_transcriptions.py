from pymongo import MongoClient
from bson.objectid import ObjectId
import os
username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(query)
users = client['swara']['users']
project = {'name': 1, 'family_name': 1, 'given_name': 1}
result = users.find(projection=project)
for i in result:
    print(i)

transcriptions = client['swara']['transcriptions']
all_pieces = transcriptions.find()
for piece in all_pieces:
    if 'name' not in piece:
        user = users.find_one({'_id': ObjectId(piece['userID'])})
        if user:
            name = user['name']
            family_name = user['family_name']
            given_name = user['given_name']
            update = {'$set': {
                'name': name, 
                'family_name': family_name, 
                'given_name': given_name
                }}
            transcriptions.update_one({'_id': piece['_id']}, update)
        else:
            print('no user')
    if 'family_name' not in piece:
        user = users.find_one({'_id': ObjectId(piece['userID'])})
        if user:
            name = user['name']
            family_name = user['family_name']
            given_name = user['given_name']
            update = {'$set': {
                'family_name': family_name, 
                'given_name': given_name
                }}
            transcriptions.update_one({'_id': piece['_id']}, update)
        else:
            print('no user')