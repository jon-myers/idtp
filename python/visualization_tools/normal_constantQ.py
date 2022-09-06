import essentia, os, psutil, sys, json
import matplotlib.pyplot as plt
import essentia.standard as ess
# from essentia.standard import (EasyLoader, MonoLoader, NSGConstantQ, NSGIConstantQ)
import numpy as np
from sklearn.preprocessing import normalize
import essentia.pytools.spectral as sp

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






file_id = sys.argv[1]
sa = float(sys.argv[2])
octaves = 3
path_to_audio = './../audio'
full_path = path_to_audio + '/wav/' + file_id + '.wav'
loader = ess.EasyLoader(filename = full_path, replayGain=0)
audio = loader()

cq_frames, dc, nf = sp.nsgcqgram(audio, minFrequency=sa, maxFrequency=sa*2**octaves, binsPerOctave=72, gamma=20)
cq = sp.nsgcq_overlap_add(cq_frames)
constantq = np.log10(np.abs(cq))
plt.imsave('cq_test.png', np.flip(constantq, axis=0))
# params = {
#           'inputSize': audio.size,
#           'minFrequency': sa,
#           'maxFrequency': (2 ** octaves) * sa,
#           'binsPerOctave': 48,
#           'windowSizeFactor': 1,
#           'gamma': 20
#          }
# 
# constantq, dcchannel, nfchannel = ess.NSGConstantQ(**params)(audio)


# print(cq_frames[0])
# print(np.shape(cq_frames))
# print(np.shape(out))
# constantq = []

# cq = ess.ConstantQ(minFrequency=sa, numberBins=72, binsPerOctave=36)
# for i, frame in enumerate(ess.FrameGenerator(audio, frameSize=32768)):
#     constantq.append(np.log10(np.abs(cq(frame))))
# 
# constantq = np.array(constantq)
# print(np.shape(constantq))
    
# constantq = np.array(constantq)
# plt.imsave('cq_test.png', constantq.T)


# # process = psutil.Process(os.getpid())

# octaves = 2
# params = {
#           'inputSize': audio.size,
#           'minFrequency': sa,
#           'maxFrequency': (2 ** octaves) * sa,
#           'binsPerOctave': 72,
#           'windowSizeFactor': 1,
#           'gamma': 20
#          }
# 
# constantq, dcchannel, nfchannel = ess.NSGConstantQ(**params)(audio)
# arr = np.log10(np.abs(constantq))
# 
# 
# 
# 
# arr =  (256 * (arr - np.min(arr)) / (np.max(arr) - np.min(arr))).astype(np.uint8)
# plt.imsave('test.png', np.flip(arr))
# obj = []
# obj.append(arr)
# for i in range(4):
#     arr = halfen(arr)
#     obj.append(arr)
#     plt.imsave('test_' + str(i) + '.png', np.flip(arr))
# 
# 
# with open('./../spectrograms/' + str(file_id) + '.json', 'w') as outfile:
#     json.dump(obj, outfile, cls=NumpyEncoder)

 
