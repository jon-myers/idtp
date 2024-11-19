from pymongo.server_api import ServerApi
from bson.objectid import ObjectId
from pymongo import MongoClient
import os, requests
import essentia.standard as ess
import numpy as np

transcription_id = "63445d13dc8b9023a09747a6"

username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(query, server_api=ServerApi('1'))
db = client.swara
transcriptions = db.transcriptions

def get_articulations(transcription_id: str):
    pluck_times = []
    chikari_times = []
    t = transcriptions.find_one({'_id': ObjectId(transcription_id)})
    phrases = t['phraseGrid'][0]
    for phrase in phrases:
        start_time = phrase['startTime']
        trajs = phrase['trajectoryGrid'][0]
        for traj in trajs:
            if traj['id'] != 12:
                arts = traj['articulations']
                if '0.00' in arts and arts['0.00']['name'] == 'pluck':
                    pluck_times.append(start_time + traj['startTime'])
        chikaris_keys = phrase['chikaris'].keys()
        for key in chikaris_keys:
            chikari_times.append(start_time + float(key))
    audio_id = t['audioID']
    audio_url = f"https://swara.studio/audio/mp3/{audio_id}.mp3"
    response = requests.get(audio_url)
    temp_file = f"./python/auto_transcribe/extraction/clips/{audio_id}.mp3"
    with open(temp_file, 'wb') as f:
        f.write(response.content)
    loader = ess.EasyLoader(filename = temp_file)
    audio = loader()
    segment_duration = 0.5
    sample_rate = 44100
    offset = 0.1
    plucks_folder = './python/auto_transcribe/extraction/clips/plucks'
    chikaris_folder = './python/auto_transcribe/extraction/clips/chikaris'
    for p_idx, p_time in enumerate(pluck_times):
        # print(p_idx)
        start_sample = int((p_time - offset) * sample_rate)
        if start_sample < 0:
            start_sample = 0
        end_sample = int(start_sample + segment_duration * sample_rate)
        segment = audio[start_sample:end_sample]
        # breakpoint()
        segment = segment / (np.max(np.abs(segment)) )
        seg_path = os.path.join(plucks_folder, f'pluck_{p_idx}.wav')
        ess.MonoWriter(filename=seg_path)(segment)
    for c_idx, c_time in enumerate(chikari_times):
        start_sample = int((c_time - offset) * sample_rate)
        if start_sample < 0:
            start_sample = 0
        end_sample = int(start_sample + segment_duration * sample_rate)
        segment = audio[start_sample:end_sample]
        seg_path = os.path.join(chikaris_folder, f'chikari_{c_idx}.wav')
        ess.MonoWriter(filename=seg_path)(segment)
            
    
get_articulations(transcription_id)

