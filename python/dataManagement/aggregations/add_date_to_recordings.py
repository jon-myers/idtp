from pymongo import MongoClient
from datetime import datetime
import os

# Create a MongoClient to the running mongod instance
username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(query)# replace with your database name
audioRecordings = client['swara']['audioRecordings']
audioEvents = client['swara']['audioEvents']
# Get the current date
current_date = datetime.utcnow()

# Update all documents
audioRecordings.update_many({}, {'$set': {'dateModified': current_date}})

for audioEvent in audioEvents.find({}):
  for recording in audioEvent['recordings'].values():
    recording['dateModified'] = current_date
  audioEvents.update_one({'_id': audioEvent['_id']}, {'$set': {'recordings': audioEvent['recordings']}})
