import essentia, os, psutil, sys, json, math, bson, io
import matplotlib.pyplot as plt
import essentia.standard as ess
# from essentia.standard import (EasyLoader, MonoLoader, NSGConstantQ, NSGIConstantQ)
import numpy as np
from sklearn.preprocessing import normalize
import gzip, pickle
from PIL import Image

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

path_to_audio = './../audio'
# process = psutil.Process(os.getpid())
full_path = path_to_audio + '/wav/' + file_id + '.wav'
loader = ess.EasyLoader(filename = full_path, replayGain=0, startTime=0)
audio = loader()
octaves = 3
params = {
          'inputSize': audio.size,
          'minFrequency': sa,
          'maxFrequency': (2 ** octaves) * sa,
          'binsPerOctave': 72,
          'windowSizeFactor': 1,
          'gamma': 20
         }
cqGen = ess.NSGConstantQ(**params)

passes = math.ceil(len(audio) / max_samples)
arrs = []
for i in range(passes):
    if i < passes - 1:
        audio_segment = audio[i * max_samples: (i+1) * max_samples]
    else:
        audio_segment = audio[i * max_samples:]
    constantq, _, _ = cqGen(audio_segment)
    arr = np.log10(np.abs(constantq))
    arrs.append(arr)

arr = np.hstack(arrs)
arr =  (64 * (arr - np.min(arr)) / (np.max(arr) - np.min(arr))).astype(np.uint8)
plt.imsave('test.png', np.flip(arr, axis=0)[:, :int(np.shape(arr)[-1])])
obj = []
obj.append(arr)
for i in range(4):
    arr = halfen(arr)
    obj.append(arr)
    # plt.imsave('test_' + str(i) + '.png', np.flip(arr, axis=0))
# pickle.dump(obj, open('pickled.p', 'wb'))




for colormap in plt.colormaps():
    img_buf = io.BytesIO()
    plt.imsave(img_buf, np.flip(obj[0][:,:16383], axis=0), cmap=colormap)
    im = Image.open(img_buf)
    im.save('webps/' + colormap + '.webp', format='webp', quality=95)



# with open('./../spectrograms/' + str(file_id) + '.json', 'w') as outfile:
#     json.dump(obj, outfile, cls=NumpyEncoder)


# with gzip.open('spectrogram.gz', 'wb') as f:
#     for i, arr in enumerate(obj):
#         f.write(bytes(arr))
# 
# for i, arr in enumerate(obj):
#     with gzip.open('gzip_test' + str(i) + '.gz', 'wb') as f:
#         f.write(bytes(arr))
# with open('./../spectrograms/' + str(file_id) + '.bson', 'w') as outfile:    
#     bson.dump(obj, outfile, cls=NumpyEncoder)
# 
# audio1 = audio[:30 * 44100]
# audio2 = audio[30*44100:]
# 
# constantq1, dcchannel, nfchannel = ess.NSGConstantQ(**params)(audio1)
# arr1 = np.log10(np.abs(constantq1))
# constantq2, dcchannel, nfchannel = ess.NSGConstantQ(**params)(audio2)
# arr2 = np.log10(np.abs(constantq2))
# arr3 = np.hstack((arr1, arr2[:,2:]))
# arr3 =  (256 * (arr3 - np.min(arr3)) / (np.max(arr3) - np.min(arr3))).astype(np.uint8)
# plt.imsave('test_stitched.png', np.flip(arr3, axis=0))
