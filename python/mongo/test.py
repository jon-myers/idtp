import pymongo
from pymongo import MongoClient
from pymongo.server_api import ServerApi
import pprint

query = "mongodb+srv://jon_myers:tabular0sa@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = pymongo.MongoClient(query, server_api=ServerApi('1'))
db = client.swara
musicians = db.musicians

for doc in musicians.find().sort([('Last Name', 1), ('First Name', 1), ('Middle Name', 1)]):
    print(doc['Initial Name'])
