import numpy as np
import librosa, sys
import soundfile as sf

path = sys.argv[1]
cents_offset = float(sys.argv[2])
out_path = sys.argv[3]
rate = 2 ** (cents_offset / 1200)
y, sr = librosa.load(path, sr=None, mono=False)
print('loaded')

D = librosa.stft(y, n_fft=2048, hop_length=512)
print("stft'd", np.shape(D))
D_fast = librosa.phase_vocoder(D, rate=1/rate, hop_length=512)
print("phase vocoder'd", np.shape(D_fast))
y_fast = librosa.istft(D_fast, hop_length=512)
print("istft'd", np.shape(y_fast))
y_resample = librosa.resample(y_fast, orig_sr=sr*rate, target_sr=sr)
print("resampled", np.shape(y_resample))
sf.write(out_path, y_resample.T, sr)