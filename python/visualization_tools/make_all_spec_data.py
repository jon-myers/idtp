from make_spec_data import make_spec_data
from pymongo import MongoClient
import os

username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(query)
audioRecordings = client['swara']['audioRecordings']

projection = { '_id': 1 }
result = audioRecordings.find({ }, projection)
for recording in result:
    print('doing recording ' + str(recording['_id']))
    file_path = './audio/wav/' + str(recording['_id']) + '.wav'
    out_dir = './spec_data/' + str(recording['_id'])
    if not os.path.exists(out_dir):
        os.mkdir(out_dir)
    make_spec_data(file_path, './spec_data/' + str(recording['_id']))