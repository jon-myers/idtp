import numpy as np
import librosa
import soundfile as sf
import time

start_time = time.time()
rate = 2 ** (1/12)
y, sr = librosa.load('darbari.mp3', sr=44100)
print("loaded --- %s seconds ---" % (time.time() - start_time))
D = librosa.stft(y, n_fft=2048, hop_length=512)
print("stft'd --- %s seconds ---" % (time.time() - start_time))
D_fast = librosa.phase_vocoder(D, rate=1/rate, hop_length=512)
print("phase vocoded --- %s seconds ---" % (time.time() - start_time))
y_fast = librosa.istft(D_fast, hop_length=512)
print("istft'd --- %s seconds ---" % (time.time() - start_time))
y_resample = librosa.resample(y_fast, orig_sr=sr*rate, target_sr=sr)
print("resampled --- %s seconds ---" % (time.time() - start_time))
sf.write('darbari_pitch_shifted_test.wav', y_resample, sr)
print("saved")