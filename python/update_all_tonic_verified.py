import essentia, os 
# import matplotlib.pyplot as plt
import essentia.standard as ess
import numpy as np
from pymongo import MongoClient

client = MongoClient('mongodb+srv://jon_myers:tabular0sa@swara.f5cuf.mongodb.net/test')
audioEvents = client['swara']['audioEvents']

findQuery = {''}
projection = {'_id': 1, 'recordings': 1}
result = audioEvents.find({ }, projection)
for audioEvent in result:
    for key in audioEvent['recordings'].keys():
        rec = audioEvent['recordings'][key]
        recId = rec['audioFileId']
        query = { '_id': audioEvent['_id'] }
        update = { "$set": { "recordings." + key + '.saVerified': False } }
        audioEvents.update_one(query, update)
        print(key)
