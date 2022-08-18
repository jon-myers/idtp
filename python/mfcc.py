import librosa, sys
import librosa.display
from matplotlib import pyplot as plt
import numpy as np
import skimage.io
from librosa.feature import melspectrogram

def scale_minmax(X, min=0.0, max=1.0):
    X_std = (X - X.min()) / (X.max() - X.min())
    X_scaled = X_std * (max - min) + min
    return X_scaled

in_path = sys.argv[1]
out_path = sys.argv[2]

y, sr = librosa.load(in_path, duration = 60*10)
C = librosa.cqt(y=y, sr=sr, fmin=100, n_bins = 48*3, bins_per_octave= 48)
C_db = librosa.amplitude_to_db(np.abs(C), ref=np.max)
img = scale_minmax(C_db, 0, 255).astype(np.uint8)
img = np.flip(img, axis=0)
img = 255 - img
plt.imsave(out_path, img, cmap='cividis')
