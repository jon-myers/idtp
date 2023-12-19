from pymongo import MongoClient
import os
username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(query)
audioRecordings = client['swara']['audioRecordings']
musicians = client['swara']['musicians']
pipeline = [
    {"$match": {}},  # Match all documents, adjust if needed
    {"$project": {"musicians": {"$objectToArray": "$musicians"}}},
    {"$unwind": "$musicians"},
    {"$group": {"_id": "$musicians.k"}}
]

unique_musicians = audioRecordings.aggregate(pipeline)
# to list
unique_musicians = [doc['_id'] for doc in unique_musicians]

for name in unique_musicians:
    if musicians.find_one({'Full Name': name}):
        print('already exists')
    else:
        musicians.insert_one({'Full Name': name})

