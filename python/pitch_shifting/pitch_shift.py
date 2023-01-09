import numpy as np
import librosa
import soundfile as sf

rate = 2 ** (-1/12)
y, sr = librosa.load('darbari.mp3', sr=44100)
D = librosa.stft(y, n_fft=2048, hop_length=512)
D_fast = librosa.phase_vocoder(D, rate=1/rate, hop_length=512)
y_fast = librosa.istft(D_fast, hop_length=512)
y_resample = librosa.resample(y_fast, orig_sr=sr*rate, target_sr=sr)

# sf.write('darbari_faster_test.wav', y_fast, sr)
sf.write('darbari_transformed.wav', y_resample, sr)