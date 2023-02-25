import os 
# import matplotlib.pyplot as plt
import essentia.standard as ess
import numpy as np
from pymongo import MongoClient

username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(query)
audioEvents = client['swara']['audioEvents']

findQuery = {''}
projection = {'_id': 1, 'recordings': 1}
result = audioEvents.find({ }, projection)
for audioEvent in result:
    for key in audioEvent['recordings'].keys():
        rec = audioEvent['recordings'][key]
        recId = rec['audioFileId']
        path = './audio/wav/' + str(recId) + '.wav'
        dur = 120
        durtot = rec['duration']
        if durtot <= dur:
            dur = durtot - 1
        startTime = np.random.randint(0, durtot - dur)
        endTime = durtot + startTime
        loader = ess.EasyLoader(filename=path, startTime=startTime, endTime=endTime)
        audio = loader()
        tonic = ess.TonicIndianArtMusic(maxTonicFrequency=200)(audio)
        
        query = { '_id': audioEvent['_id'] }
        update = { "$set": { "recordings." + key + '.saEstimate': tonic } }
        audioEvents.update_one(query, update)
        print(key)