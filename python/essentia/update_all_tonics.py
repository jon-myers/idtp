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
        
        
# print(result)
# ids = [str(i) for i in result.next()['all']]
# print(ids)








# 
# 
# 
# 
# 
# dur = 60
# startTime = np.random.randint(120, 1800)
# endTime = dur + startTime
# loader = ess.EasyLoader(filename='../audio/Hamir_alap_original.wav', startTime=startTime, endTime=endTime)
# audio = loader()
# tonic = ess.TonicIndianArtMusic(maxTonicFrequency=200)(audio)
# 
