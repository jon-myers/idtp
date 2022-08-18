import librosa
import librosa.display
from matplotlib import pyplot as plt
import numpy as np


y, sr = librosa.load('1.wav', offset=1, duration=6)
est, voiced = librosa.pyin(y, 100, 400, sr)[:2]

fund_est = np.sum(est[1:]) / (len(est)-1)
