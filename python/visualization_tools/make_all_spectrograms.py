import os 
# import matplotlib.pyplot as plt
# import essentia.standard as ess
# import numpy as np
from pymongo import MongoClient

client = MongoClient('mongodb+srv://jon_myers:tabular0sa@swara.f5cuf.mongodb.net/test')
audioEvents = client['swara']['audioEvents']

findQuery = {''}
projection = {'_id': 1, 'recordings': 1}
result = audioEvents.find({ }, projection)
for audioEvent in result:
    for key in audioEvent['recordings'].keys():
        rec = audioEvent['recordings'][key]
        if rec['saVerified']:
            recId = rec['audioFileId']
            sa = rec['saEstimate']
            os.system('python3 generate_log_spectrograms.py ' + str(recId) + ' ' + str(sa))
        
        
