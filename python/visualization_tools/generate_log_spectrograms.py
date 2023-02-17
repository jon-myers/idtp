import essentia, os, psutil, sys, json, math, bson, io
import matplotlib.pyplot as plt
import essentia.standard as ess
# from essentia.standard import (EasyLoader, MonoLoader, NSGConstantQ, NSGIConstantQ)
import numpy as np
from sklearn.preprocessing import normalize
import gzip, pickle
from PIL import Image

def replaceZeros(data):
    min_nonzero = np.min(data[np.nonzero(data)])
    data[data == 0] = min_nonzero
    return data

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)

def halfen(arr):
    sh = np.shape(arr)
    if sh[-1] % 2 == 1:
        b = np.array([[x] for x in arr[:, -1]])
        arr = np.concatenate((arr, b), axis=1)
        sh = np.shape(arr)
    # print(np.shape(arr))
    return arr.reshape((sh[0], int(sh[1]/2), -1)).mean(axis=2).astype(np.uint8)

max_seconds = 600
max_samples = max_seconds * 44100

file_id = sys.argv[1]
sa = float(sys.argv[2])

# path_to_audio = './../audio'
path_to_audio = './audio'
# process = psutil.Process(os.getpid())
full_path = path_to_audio + '/wav/' + file_id + '.wav'
loader = ess.EasyLoader(filename = full_path, replayGain=0, startTime=0)
audio = loader()
octaves = 3
offset = 0.1
params = {
          'inputSize': audio.size,
          'minFrequency': 2 ** (np.log2(sa) - offset),
          'maxFrequency': 2 ** (np.log2((2 ** octaves) * sa) + offset),
          'binsPerOctave': 72,
          'windowSizeFactor': 1,
          'gamma': 20
         }
cqGen = ess.NSGConstantQ(**params)

passes = math.ceil(len(audio) / max_samples)
arrs = []
print(file_id)
for i in range(passes):
    print(i)
    if i < passes - 1:
        audio_segment = audio[i * max_samples: (i+1) * max_samples]
    else:
        audio_segment = audio[i * max_samples:]
    constantq, _, _ = cqGen(audio_segment)
    abs_constantq = replaceZeros(np.abs(constantq))
    arr = np.log10(abs_constantq)
    arrs.append(arr)

arr = np.hstack(arrs)
arr =  (64 * (arr - np.min(arr)) / (np.max(arr) - np.min(arr))).astype(np.uint8)
plt.imsave('test.png', np.flip(arr, axis=0)[:, :int(np.shape(arr)[-1])])
obj = []
obj.append(arr)
for i in range(4):
    arr = halfen(arr)
    obj.append(arr)

max_size = 16383
cmap = 'magma'
folder_path = 'spectrograms/' + file_id
if not os.path.exists(folder_path):
    os.mkdir(folder_path)
for i, array in enumerate(obj):
    subfolder_path = folder_path + '/' + str(i)
    # delete all files in folder
    for the_file in os.listdir(subfolder_path):
        os.remove(os.path.join(subfolder_path, the_file))
    
    if not os.path.exists(subfolder_path):
        os.mkdir(subfolder_path)
    for j in range(math.ceil(np.shape(array)[1] / max_size)):
        start = j * max_size
        end = (j + 1) * max_size
        sub_arr = array[:, start: end]
        img_buf = io.BytesIO()
        plt.imsave(img_buf, np.flip(sub_arr, axis=0), cmap=cmap)
        im = Image.open(img_buf)
        im.save(subfolder_path + '/' + str(j) + '.webp', format='webp', quality=95)
