import os 
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
        if rec['saVerified']:
            recId = rec['audioFileId']
            sa = rec['saEstimate']
            os.system('python3 generate_log_spectrograms.py ' + str(recId) + ' ' + str(sa))
        
        
