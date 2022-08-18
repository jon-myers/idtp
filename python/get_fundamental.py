import librosa, warnings
import numpy as np

def guess_tonic(full_y, sr, num_tries, dur):
    # this is only for instrumental (and male vocals, but needs more testing)
    # should change limits for female vocals, eventually!
    
    norm_guesses = {}
    low_energy_guesses = {}
    if np.shape(full_y)[0] <= dur * 44100
    for i in range(num_tries):
        duration = dur * 44100
        offset = np.random.randint(0, np.shape(full_y)[0] - duration)
        y = full_y[offset:duration+offset]
        f0, voiced_flag, voiced_probs = librosa.pyin(y, 50, 100, sr)
        bins = np.linspace(49.5, 100.5, 52)
        rms = librosa.feature.rms(y=y, )
        low_energy_idxs = np.argsort(rms)[0][:int(np.shape(rms)[-1]/20)]
        low_energy_f0 = f0[low_energy_idxs]
        fig, axes = plt.subplots(2, 1)
        axes[0].hist(f0, bins)
        axes[1].hist(low_energy_f0, bins)
        a, new_bins = np.histogram(f0, bins)
        max_a = np.argmax(a)
        f0_sa = np.average(new_bins[max_a:max_a+2])    
        a, new_bins = np.histogram(low_energy_f0, bins)
        max_a = np.argmax(a)
        low_energy_f0_sa = np.average(new_bins[max_a:max_a+2])        
        add_ng = True
        for ng in norm_guesses.keys():
            if abs(ng - f0_sa) < 3:
                norm_guesses[ng] = norm_guesses[ng] + 1
                add_ng = False
                break
        if add_ng:
            norm_guesses[f0_sa] = 1
        add_leg = True
        for leg in low_energy_guesses.keys():
            if abs(leg - low_energy_f0_sa) < 3:
                low_energy_guesses[leg] = low_energy_guesses[leg] + 1
                add_leg = False
                break
        if add_leg:
            low_energy_guesses[low_energy_f0_sa] = 1
            
    return norm_guesses, low_energy_guesses
# 
# 
# 
# 
# with warnings.catch_warnings():
#     warnings.simplefilter("ignore")
#     full_y, sr = librosa.load('shujaat.mp3', sr=None)
#     num_tries = 10
#     norm_guesses = {}
#     low_energy_guesses = {}
#     for i in range(num_tries):
#         duration = 60 * 44100
#         offset = np.random.randint(0, np.shape(full_y)[0] - duration)
# 
#         # print(offset, duration) 
#         # y, sr = librosa.load('yaman.mp3', offset=offset, duration=duration)
#         y = full_y[offset:duration+offset]
#         f0, voiced_flag, voiced_probs = librosa.pyin(y, 50, 100, sr)
# 
#         import matplotlib.pyplot as plt
# 
#         bins = np.linspace(49.5, 100.5, 52)
#         rms = librosa.feature.rms(y=y, )
#         # print(int(np.shape(rms)[-1]/40))
#         low_energy_idxs = np.argsort(rms)[0][:int(np.shape(rms)[-1]/20)]
#         # print(np.shape(low_energy_idxs))
#         low_energy_f0 = f0[low_energy_idxs]
#         # print(low_energy_f0)
#         # print(np.shape(f0))
#         # print(np.shape(low_energy_f0))
#         fig, axes = plt.subplots(2, 1)
# 
#         axes[0].hist(f0, bins)
#         axes[1].hist(low_energy_f0, bins)
#         a, new_bins = np.histogram(f0, bins)
#         max_a = np.argmax(a)
#         f0_sa = np.average(new_bins[max_a:max_a+2])
# 
#         a, new_bins = np.histogram(low_energy_f0, bins)
#         max_a = np.argmax(a)
#         low_energy_f0_sa = np.average(new_bins[max_a:max_a+2])
#         # print('duration: ', duration, '\nbasic est: ', f0_sa, '\nlow energy est:', low_energy_f0_sa, '\n\n')
# 
#         add_ng = True
#         for ng in norm_guesses.keys():
#             if abs(ng - f0_sa) < 3:
#                 norm_guesses[ng] = norm_guesses[ng] + 1
#                 add_ng = False
#                 break
#         if add_ng:
#             norm_guesses[f0_sa] = 1
# 
#         add_leg = True
#         for leg in low_energy_guesses.keys():
#             if abs(leg - low_energy_f0_sa) < 3:
#                 low_energy_guesses[leg] = low_energy_guesses[leg] + 1
#                 add_leg = False
#                 break
#         if add_leg:
#             low_energy_guesses[low_energy_f0_sa] = 1
# print(norm_guesses, low_energy_guesses)
# 
