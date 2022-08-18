import pymongo
from pymongo import MongoClient
from pymongo.server_api import ServerApi
import pprint
import csv

query = "mongodb+srv://jon_myers:tabular0sa@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = pymongo.MongoClient(query, server_api=ServerApi('1'))
db = client.swara
collection = db.musicians
f = open('musicians.csv')
reader = csv.reader(f)
    
docs = []

for i, row in enumerate(reader):
    if i != 0:
        obj = {}
        obj['Initial Name'] = row[0]
        obj['Full Name'] = row[1]
        split_name = row[1].split(' ')
        last_name = split_name[-1]
        if last_name == 'nizami':
            last_name = split_name[-2]
        first_name = split_name[0]
        if len(split_name) == 2:
            middle_name = None
            middle_name2 = None
        elif len(split_name) == 3 or split_name[-1] == 'nizami':
            middle_name = split_name[1]
            middle_name2 = None
        elif len(split_name) == 4:
            middle_name2 = split_name[2]
        else:
            print(split_name)
            
        obj['First Name'] = first_name
        obj['Middle Name'] = middle_name
        obj['Second Middle Name'] = middle_name2
        obj['Last Name'] = last_name
        if row[2] == '':
            obj['Alternate Name'] = None
        else:
            obj['Alternate Name'] = row[2]
        if row[3] == '' or row[3] == 'DK':
            obj['Born'] = None
        elif row[3].isnumeric():
            obj['Born'] = int(row[3])
        else:
            obj['Born'] = row[3]
        if row[4] == '' or row[4] == 'DK':
            obj['Died'] = None
        elif row[4].isnumeric():
            obj['Died'] = int(row[4])
        else:
            obj['Died'] = row[4]
        if row[5] == '' or row[5] == '?':
            obj['Gharana'] = None
        else:
            obj['Gharana'] = row[5]
        if row[6] == '' or row[6] == '?':
            obj['Gender'] = None
        else: 
            obj['Gender'] = row[6]
        if row[7] == '':
            obj['Instrument'] = None
        else:
            obj['Instrument'] = row[7]
        docs.append(obj)
    
result = collection.insert_many(docs)
print(result)
        
    
