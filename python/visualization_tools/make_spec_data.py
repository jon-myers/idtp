import sys, json, math
import matplotlib.pyplot as plt
import essentia.standard as ess
import gzip
from io import BytesIO
# from essentia.standard import (EasyLoader, MonoLoader, NSGConstantQ, NSGIConstantQ)
import numpy as np
# from sklearn.preprocessing import normalize
# import gzip, pickle
# from PIL import Image

def replaceZeros(data):
    min_nonzero = np.min(data[np.nonzero(data)])
    data[data == 0] = min_nonzero
    return data

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)

max_seconds = 600
max_samples = max_seconds * 44100

file_id = sys.argv[1]
sa = float(sys.argv[2])
if len(sys.argv) > 3:
    full_path = sys.argv[3]
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
arr =  (256 * (arr - np.min(arr)) / (np.max(arr) - np.min(arr))).astype(np.uint8)
shape = np.shape(arr)
arr_bytes = arr.tobytes()

compressed_data = gzip.compress(arr_bytes)
# json_data = json.dumps({'data': arr.tolist()}, cls=NumpyEncoder)
with open('python/visualization_tools/gray_dir/test.gz', 'wb') as f:
    f.write(compressed_data)
    
with open('python/visualization_tools/gray_dir/test_shape.json', 'w') as f:
    json.dump({'shape': shape}, f)