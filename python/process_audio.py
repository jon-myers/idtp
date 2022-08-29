import librosa, os, sys, warnings, shutil, psutil, math
import soundfile as sf
from os import listdir
import numpy as np
from os.path import isfile, join
import pymongo
from pymongo import MongoClient
from pymongo.server_api import ServerApi
import pprint
from bson.objectid import ObjectId

query = "mongodb+srv://jon_myers:tabular0sa@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = pymongo.MongoClient(query, server_api=ServerApi('1'))
db = client.swara
audio_events = db.audioEvents

process = psutil.Process(os.getpid())

def guess_tonic(full_y, sr, num_tries, dur):
    # this is only for instrumental (and male vocals, but needs more testing)
    # should change limits for female vocals, eventually!    
    norm_guesses = {}
    low_energy_guesses = {}
    if np.shape(full_y)[0] <= dur * 44100:
        raise Exception("audio file is too short.")
    for i in range(num_tries):
        # print('trying: ', i)
        # print('a: ', process.memory_info().rss)
        
        duration = dur * 44100
        offset = np.random.randint(0, np.shape(full_y)[0] - duration)
        y = full_y[offset:duration+offset]
        f0, voiced_flag, voiced_probs = librosa.pyin(y, 100, 200, sr)
        # print('b: ', process.memory_info().rss)
        bins = np.linspace(99, 201, 52)
        # rms = librosa.feature.rms(y=y, )
        # low_energy_idxs = np.argsort(rms)[0][:int(np.shape(rms)[-1]/20)]
        # low_energy_f0 = f0[low_energy_idxs]
        a, new_bins = np.histogram(f0, bins)
        max_a = np.argmax(a)
        f0_sa = np.average(new_bins[max_a:max_a+2])    
        # a, new_bins = np.histogram(low_energy_f0, bins)
        # max_a = np.argmax(a)
        # low_energy_f0_sa = np.average(new_bins[max_a:max_a+2])        
        add_ng = True
        # print('c: ', process.memory_info().rss)
        for ng in norm_guesses.keys():
            if abs(int(ng) - f0_sa) < 3:
                norm_guesses[str(int(ng))] = norm_guesses[str(int(ng))] + 1
                add_ng = False
                break
        if add_ng:
            norm_guesses[str(int(f0_sa))] = 1
        # add_leg = True
        # for leg in low_energy_guesses.keys():
        #     if abs(leg - low_energy_f0_sa) < 3:
        #         low_energy_guesses[leg] = low_energy_guesses[leg] + 1
        #         add_leg = False
        #         break
        # if add_leg:
        #     low_energy_guesses[low_energy_f0_sa] = 1            
    # return norm_guesses, low_energy_guesses
    return norm_guesses

path = sys.argv[1]
objectId = sys.argv[2]
recording_idx = sys.argv[3]
file_path = 'uploads/'





with warnings.catch_warnings():
    warnings.simplefilter('ignore')
    split_f = path.split('.')
    suffix = split_f[-1]
    file_name = '.'.join(split_f[:-1])
    y, sr = librosa.load(file_path + path, sr=None)
    duration = librosa.get_duration(y, sr)
    # maybe here is where you would get the fundamental, and communicate 
    # that info up to mongodb somehow ...
    
    # ng, leg = guess_tonic(y, sr, 10, 60)
    # print(ng, leg)

    ng = guess_tonic(y, sr, 8, 30)
    # obj = {'duration': math.ceil(duration), 'saEstimate': ng}
    # print(obj)
    dur = math.ceil(duration)
    query = {'_id': ObjectId(objectId)}
    dur_path = 'recordings.' + str(recording_idx) + '.duration'
    sa_path = 'recordings.' + str(recording_idx) + '.saEstimate'
    update = {'$set': { dur_path: dur, sa_path: ng}}
    audio_events.update_one(query, update, upsert=True)

    # write wav file
    wav_path = 'audio/wav/' + file_name + '.wav'
    mp3_path = 'audio/mp3/' + file_name + '.mp3'
    
    if suffix == 'mp3':
        sf.write(wav_path, y, sr)
        os.rename(file_path + path, mp3_path)
    elif suffix == 'wav':
        
        os.system(f'ffmpeg -i {file_path + path} -vn -ar 44100 -ac 2 -b:a 192k {mp3_path}')
        os.rename(file_path + path, wav_path)
    else:
        sf.write(wav_path, y, sr)
        os.system(f'ffmpeg -i {file_path + path} -vn -ar 44100 -ac 2 -b:a 192k {mp3_path}')
        os.remove(file_path + path)

# print('finally: ', process.memory_info().rss)



        
