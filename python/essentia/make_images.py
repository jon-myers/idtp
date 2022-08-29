import essentia, os, psutil, sys
import matplotlib.pyplot as plt
from essentia.standard import (EasyLoader, MonoLoader, NSGConstantQ, NSGIConstantQ)
import numpy as np

_id = sys.argv[1]
path_to_audio = './../audio'
loader = EasyLoader(filename = path_to_audio + '/wav/' + sys.argv[1] + '.wav')
audio = loader()


fig = plt.figure(frameon=False)
fig.set_size_inches(np.shape(audio)[0] / 10000, 8)

ax = plt.Axes(fig, [0, 0, 1, 1])
ax.set_axis_off()
fig.add_axes(ax)

ax.plot(audio)
fig.savefig('waveform.png', dpi=100)
