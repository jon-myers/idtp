import essentia, os, psutil
import matplotlib.pyplot as plt
from essentia.standard import (EasyLoader, MonoLoader, NSGConstantQ, NSGIConstantQ)
import numpy as np

process = psutil.Process(os.getpid())
loader = EasyLoader(filename='../audio/Banerjee_hemant_alap.mp3', replayGain=0)

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
y = NSGIConstantQ(**params)(constantq, dcchannel, nfchannel)
print(process.memory_info().rss)



# from pylab import plot, show, figure, imshow


# plt.plot(audio)
# ticklabels = np.round(100 * 2 ** np.linspace(0, 3, 10))
# ticks = np.linspace(0, 36*3, 10)

# plt.figure(figsize=(12, 8))
arr = np.log10(np.abs(constantq))
# img = plt.imshow(np.log10(np.abs(constantq)), origin='lower', aspect='auto')
# plt.yticks(ticks, ticklabels)
# plt.savefig('testplot.png')
plt.imsave('testplot.png', np.flip(arr))
