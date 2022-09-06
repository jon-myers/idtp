import essentia, os, psutil
import matplotlib.pyplot as plt
from essentia.standard import (EasyLoader, MonoLoader, NSGConstantQ, NSGIConstantQ, PitchYin, FrameGenerator)
import numpy as np

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)

# process = psutil.Process(os.getpid())
loader = EasyLoader(filename='../audio/Hamir_alap_denoised.wav', replayGain=0, startTime=240, endTime=300)

audio = loader()
fund = 194
params = {
          'inputSize': audio.size,
          'minFrequency': fund,
          'maxFrequency': (2**3)*fund,
          'binsPerOctave': 48,
          'minimumWindow': 128
         }

constantq, dcchannel, nfchannel = NSGConstantQ(**params)(audio)
# y = NSGIConstantQ(**params)(constantq, dcchannel, nfchannel)
print(process.memory_info().rss)
arr = np.log10(np.abs(constantq))
plt.imsave('Hamir_alap_denoised.png', np.flip(arr))
print('1')
W = 1024
H = 512

yin = PitchYin(frameSize = W, interpolate = True, tolerance = 1)
pyt = []
ct = []
print('2')
for frame in FrameGenerator(audio, frameSize = W, hopSize = H):
    py, c = yin(frame)
    pyt.append(py)
    ct.append(c)
    if ct[-1] % 100 == 0:
        print(ct[-1])
pyt = np.asarray(pyt)
ct = np.asarray(ct)
Fs = 44100

fig = plt.figure(frameon=False)
fig.set_size_inches(np.shape(audio)[0] / 10000, 8)

ax = plt.Axes(fig, [0, 0, 1, 1])
ax.set_axis_off()
fig.add_axes(ax)

ax.plot(pyt*(ct>0.5)*(W/Fs), color = 'r')
fig.savefig('melograph_denoised.png', dpi=100)
