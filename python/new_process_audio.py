import essentia.standard as ess
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId
from pymongo import MongoClient
import numpy as np
import sys, os, pymongo, math
import soundfile as sf

query = "mongodb+srv://jon_myers:tabular0sa@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = pymongo.MongoClient(query, server_api=ServerApi('1'))
db = client.swara
audio_events = db.audioEvents


path = sys.argv[1]
objectId = sys.argv[2]
recording_idx = sys.argv[3]
file_path = 'uploads/'

split_f = path.split('.')
suffix = split_f[-1]
file_name = '.'.join(split_f[:-1])

loader = ess.EasyLoader(filename = file_path + path)
audio = loader()
duration = ess.Duration()(audio)

# this could be sped up by just sampling chunks rather than whole file ...
tonic_guess = ess.TonicIndianArtMusic(maxTonicFrequency=200)(audio)

dur = math.ceil(duration)
query = { '_id': ObjectId(objectId) }
dur_path = 'recordings.' + str(recording_idx) + '.duration'
sa_path = 'recordings.' + str(recording_idx) + '.saEstimate'
verified_path = 'recordings.' + str(recording_idx) + '.saVerified'
update = { '$set': { dur_path: dur, sa_path: tonic_guess, verified_path: False } }
audio_events.update_one(query, update, upsert=True)

wav_path = 'audio/wav/' + file_name + '.wav'
mp3_path = 'audio/mp3/' + file_name + '.mp3'
sr = 44100

if suffix == 'mp3':
    sf.write(wav_path, audio, sr)
    os.rename(file_path + path, mp3_path)
elif suffix == 'wav':
    
    os.system(f'ffmpeg -i {file_path + path} -vn -ar 44100 -ac 2 -b:a 192k {mp3_path}')
    os.rename(file_path + path, wav_path)
else:
    sf.write(wav_path, audio, sr)
    os.system(f'ffmpeg -i {file_path + path} -vn -ar 44100 -ac 2 -b:a 192k {mp3_path}')
    os.remove(file_path + path)
