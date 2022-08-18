import pymongo
from pymongo import MongoClient
from pymongo.server_api import ServerApi
import pprint
import csv

query = "mongodb+srv://jon_myers:tabular0sa@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = pymongo.MongoClient(query, server_api=ServerApi('1'))
db = client.swara
collection = db.ragas
f = open('ragas.csv')
reader = csv.reader(f)


docs = []
for i, row in enumerate(reader):
    obj = {'name': row[0]}
    docs.append(obj)

result = collection.insert_many(docs)
print(result)
    
