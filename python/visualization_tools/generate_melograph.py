import essentia.standard as ess
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
import json, sys, os

file_id = sys.argv[1]
sa = float(sys.argv[2])
path_to_audio = './audio'
full_path = path_to_audio + '/wav/' + file_id + '.wav'
loader = ess.EasyLoader(filename = full_path, replayGain=0)

audio = loader()
octaves = 3
offset = 0.1
min_freq = 2 ** (np.log2(sa) - offset)
max_freq = 2 ** (np.log2((2 ** octaves) * sa) + offset) 
pExt = ess.PredominantPitchMelodia(
  frameSize=2048, hopSize=128, minFrequency=min_freq, maxFrequency=max_freq)
pitch, confidence = pExt(audio)
time = np.linspace(0, len(audio)/44100, len(pitch))
masked_pitch = np.ma.masked_where(confidence < 0.1, pitch)
unmasked_indices = np.where(~masked_pitch.mask)[0]
break_indices = np.where(np.diff(unmasked_indices) != 1)[0] + 1
data_chunks = np.split(masked_pitch.data[unmasked_indices], break_indices)
time_chunks = np.split(time[unmasked_indices], break_indices)




data_chunks_list = [chunk.tolist() for chunk in data_chunks]
data_chunks_list = [[round(y, 1) for y in chunk.astype('float64')] for chunk in data_chunks]
time_chunks_list = [chunk.tolist() for chunk in time_chunks]


new_data_chunks_list = []
new_time_chunks_list = []
for i, chunk in enumerate(data_chunks_list):
  sub_data_chunk = [chunk[0]]
  sub_time_chunk = [time_chunks_list[i][0]]
  for j in range(len(chunk))[1:]:
    diff = np.abs(np.log(chunk[j] / chunk[j-1]))
    if (diff > 0.2):
      new_data_chunks_list.append(sub_data_chunk)
      new_time_chunks_list.append(sub_time_chunk)
      sub_data_chunk = [chunk[j]]
      sub_time_chunk = [time_chunks_list[i][j]]
    else:
      sub_data_chunk.append(chunk[j])
      sub_time_chunk.append(time_chunks_list[i][j])
  new_data_chunks_list.append(sub_data_chunk)
  new_time_chunks_list.append(sub_time_chunk)
data_chunks_list = new_data_chunks_list
time_chunks_list = new_time_chunks_list
    
time_chunk_starts = [chunk[0] for chunk in time_chunks_list]

# write down only every 8th one
factor = 4
data_chunks_list = [[item for i, item in enumerate(j) if i%factor == 0] for j in data_chunks_list]
time_chunks_list = [[item for i, item in enumerate(j) if i%factor == 0] for j in time_chunks_list]




time_increment = (len(audio)/44100) / (len(pitch) - 1)
time_increment *= factor

data_dict = {
    'data_chunks': data_chunks_list,
    'time_chunk_starts': time_chunk_starts,
    'time_increment': time_increment
}

data_json = json.dumps(data_dict)

folder_path = 'melographs/' + file_id
if not os.path.exists(folder_path):
  os.mkdir(folder_path)
with open(folder_path + '/melograph.json', 'w') as f:
  f.write(data_json)
