from pymongo import MongoClient
import os

username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(query)
transcriptions = client['swara']['transcriptions']
projection = {
    'sectionCategorization': 1,
    'sectionStarts': 1,
    '_id': 1
}
docs = transcriptions.find(projection)
for doc in docs:
    print(doc)
    print()
    if len(doc['sectionCategorization']) > len(doc['sectionStarts']):
        keep_length = len(doc['sectionStarts'])
        updated = doc['sectionCategorization'][:keep_length]

        transcriptions.update_one({ '_id': doc['_id'] }, 
                                { '$set': {'sectionCategorization': updated }
                                })
        print("Updated", doc['_id'])
print("Done")
