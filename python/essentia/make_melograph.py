import essentia, os, psutil
import matplotlib.pyplot as plt
from essentia.standard import (EasyLoader, MonoLoader, NSGConstantQ, NSGIConstantQ, PitchYin, FrameGenerator, PitchYinProbabilistic)
import essentia.standard as ess
import numpy as np

process = psutil.Process(os.getpid())
loader = ess.EqloudLoader(filename='../audio/Hamir_alap_original.wav', startTime=352, endTime=358)

audio = loader()

W = 1024
H = 512

# yin = PitchYin(frameSize = W, interpolate = True, tolerance = 1)
# pyt = []
# ct = []
# for frame in FrameGenerator(audio, frameSize = W, hopSize = H):
#     py, c = yin(frame)
#     pyt.append(py)
#     ct.append(c)
#     if ct[-1] % 100 == 0:
#         print(ct[-1])
# pyt = np.asarray(pyt)
# ct = np.asarray(ct)
# Fs = 44100
# 
# x = np.linspace(0, 6, np.shape(pyt)[0])
# 
# y = pyt * (ct>0.75)
# y = [float('nan') if i == 0 else i for i in y]
# # selects = np.where(ct>0.6)[0]
# # x = x[selects]
# # y = pyt[selects]
# plt.plot(x, y, color='r')
# plt.ylim(300, 600)
# plt.savefig('melograph.png')
# 
# plt.close()


# pyin = PitchYinProbabilistic(frameSize = W, hopSize = H, lowRMSThreshold = 0.0001, preciseTime = True)
# pyin_p, vp = pyin(audio)
# print(np.min(pyin_p))
# print(np.max(pyin_p))
# y = pyin_p * (vp>0.4)
# nan_y = [float('nan') if i ==0 else i for i in y]
# x = np.linspace(0, 6, np.shape(pyin_p)[0])
# # selects = np.where(vp>0.6)[0]
# # x = x[selects]
# # y = pyin_p[selects]
# 
# plt.plot(x, nan_y, color='r')
# plt.ylim(300, 600)
# plt.savefig('melograph_pyin.png')
# plt.close()

ppm = ess.PredominantPitchMelodia()

pitch, pc = ppm(audio)
print(np.max(pc))
y = pitch
nan_y = [float('nan') if i == 0 else i for i in y]
x = np.linspace(0, 6, np.shape(y)[0])
f, axes = plt.subplots(2, sharex=True)
axes[0].plot(x, nan_y)
axes[0].set_title('estimated pitch [Hz]')
axes[1].plot(x, pc)
axes[1].set_title('pitch confidence')

# plt.plot(x, nan_y)
# plt.ylim(300, 600)
plt.savefig('predominantPitchMelodia.png')
plt.close()
# 
# print(vp)
# print(np.max(vp))
