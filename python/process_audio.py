import essentia.standard as ess
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId
from pymongo import MongoClient
import numpy as np
import sys, os, pymongo, math
import soundfile as sf
import json

def get_peaks(data, num_levels=4, block_size=64):
    obj = {}
    for i in range(num_levels):
        top = []
        bottom = []
        size = block_size * 2 ** i
        indices = np.repeat(size, len(data) // size)
        if len(data) % size != 0:
            indices = np.append(indices, len(data) % size)
        cur_top = np.maximum.reduceat(data, np.append([0], np.cumsum(indices[:-1])))/size
        top.append(cur_top)
        cur_bottom = np.minimum.reduceat(data, np.append([0], np.cumsum(indices[:-1])))/size
        bottom.append(cur_bottom)
        peaks = np.dstack((top, bottom))
        obj[size] = peaks[0].tolist()
    return obj

username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = pymongo.MongoClient(query, server_api=ServerApi('1'))
db = client.swara
audio_events = db.audioEvents
audio_recordings = db.audioRecordings


path = sys.argv[1]
objectId = sys.argv[2]
recording_idx = sys.argv[3]
recording_id = sys.argv[4]

file_path = 'uploads/'

split_f = path.split('.')
suffix = split_f[-1]
file_name = '.'.join(split_f[:-1])

loader = ess.EasyLoader(filename = file_path + path)
audio = loader()
duration = ess.Duration()(audio)

# this could be sped up by just sampling chunks rather than whole file ...
tonic_guess = ess.TonicIndianArtMusic(maxTonicFrequency=200)(audio)

dur = duration
if objectId != 'undefined':
    query = { '_id': ObjectId(objectId) }
    dur_path = 'recordings.' + str(recording_idx) + '.duration'
    sa_path = 'recordings.' + str(recording_idx) + '.saEstimate'
    verified_path = 'recordings.' + str(recording_idx) + '.saVerified'
    update = { '$set': { dur_path: dur, sa_path: tonic_guess, verified_path: False } }
    audio_events.update_one(query, update, upsert=True)

if recording_id:
    query = { '_id': ObjectId(recording_id) }
    dur_path = 'duration'
    sa_path = 'saEstimate'
    verified_path = 'saVerified'
    update = { '$set': { dur_path: dur, sa_path: tonic_guess, verified_path: False } }
    audio_recordings.update_one(query, update, upsert=True)

wav_path = 'audio/wav/' + file_name + '.wav'
mp3_path = 'audio/mp3/' + file_name + '.mp3'
opus_path = 'audio/opus/' + file_name + '.opus'
sr = 44100

if suffix == 'mp3':
    sf.write(wav_path, audio, sr)
    os.system(f'ffmpeg -i {file_path + path} -codec:a libopus {opus_path}')
    os.rename(file_path + path, mp3_path)
elif suffix == 'wav':
    
    os.system(f'ffmpeg -i {file_path + path} -vn -ar 44100 -ac 2 -b:a 192k {mp3_path}')
    os.system(f'ffmpeg -i {file_path + path} -codec:a libopus {opus_path}')
    os.rename(file_path + path, wav_path)
else:
    sf.write(wav_path, audio, sr)
    os.system(f'ffmpeg -i {file_path + path} -vn -ar 44100 -ac 2 -b:a 192k {mp3_path}')
    os.system(f'ffmpeg -i {file_path + path} -codec:a libopus {opus_path}')
    os.remove(file_path + path)


peaks = get_peaks(audio, block_size=2**11, num_levels=5)
with open('peaks/' + file_name + '.json', 'w') as outfile:
    json.dump(peaks, outfile)
