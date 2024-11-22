from essentia import standard as ess
from matplotlib import pyplot as plt
from matplotlib import cm
from matplotlib.markers import MarkerStyle
import numpy as np

def get_idx_groups(log_pitch: np.ndarray, discontinuity_threshold: float = 0.2):
    idx_groups = []
    current_group = []
    previous_val = None

    for i, val in enumerate(log_pitch):
        if np.isnan(val):
            if len(current_group) > 0:
                idx_groups.append(current_group)
                current_group = []
        else:
            if previous_val is not None and abs(val - previous_val) > discontinuity_threshold:
                if len(current_group) > 0:
                    idx_groups.append(current_group)
                    current_group = []
            current_group.append(i)
            previous_val = val

    if len(current_group) > 0:
        idx_groups.append(current_group)
    
    return idx_groups

def find_nearest_non_nan(arr: np.ndarray, idx: int) -> float:
    # Look backwards
    left_idx = idx - 1
    left_ct = 0
    while left_idx >= 0:
        if not np.isnan(arr[left_idx]):
            return arr[left_idx]
        left_idx -= 1
        left_ct += 1
        if left_ct > 20:
            break
    
    # Look forwards
    right_idx = idx + 1
    while right_idx < len(arr):
        if not np.isnan(arr[right_idx]):
            return arr[right_idx]
        right_idx += 1
    
    return np.nan  # If no non-NaN value found

def get_contour(audio: np.ndarray, idx: int, pluck_onsets: np.ndarray, 
                chikari_onsets: np.ndarray, start: float, end: float, 
                fund: float):
    # compute the melodic contour
    voicing_tolderance = 0.7
    min_freq = 124
    max_freq = 500
    eq_loud_audio = ess.EqualLoudness()(audio)
    ppm = ess.PredominantPitchMelodia(minFrequency = min_freq, 
                                      maxFrequency = max_freq, 
                                      voicingTolerance = voicing_tolderance)
    pitch, confidence = ppm(eq_loud_audio)
    pitch[pitch == 0] = np.nan
    log_pitch = np.log2(pitch)
    norm_confidence = confidence - np.min(confidence)
    norm_confidence /= np.max(norm_confidence)
    viridis = cm.get_cmap('viridis', 256)
    colors = viridis(norm_confidence)
    fig, ax = plt.subplots()
    x_vals = np.linspace(start, end, len(log_pitch))
    ax.scatter(x_vals, log_pitch, c=colors, s=1)
    ax.set_xlabel('Time')
    ax.set_ylabel('Pitch (Hz)')
    ax.set_title('Melodic Contour')
    y_ticks = ax.get_yticks()
    labels = [str(int(2**y)) for y in y_ticks]
    ax.set_yticklabels(labels)
    normed_pluck_onsets = pluck_onsets / (end - start)
    pluck_onset_idxs = (normed_pluck_onsets * len(log_pitch)).astype(int)
    pluck_onset_vals = log_pitch[pluck_onset_idxs]
    for i in range(len(pluck_onset_idxs)):
        if np.isnan(pluck_onset_vals[i]):
            pluck_onset_vals[i] = find_nearest_non_nan(log_pitch, pluck_onset_idxs[i])
    
    normed_chikari_onsets = chikari_onsets / (end - start)
    chikari_onset_idxs = (normed_chikari_onsets * len(log_pitch)).astype(int)
    chikari_onset_vals = log_pitch[chikari_onset_idxs]
    for i in range(len(chikari_onset_idxs)):
        if np.isnan(chikari_onset_vals[i]):
            chikari_onset_vals[i] = find_nearest_non_nan(log_pitch, chikari_onset_idxs[i])
    
    
    # pluck_onset_vals = pluck_onset_vals[~np.isnan(pluck_onset_vals)]
    # normed_chikari_onsets = chikari_onsets / (end - start)
    triangle_marker = MarkerStyle(marker='^')
    triangle_marker._transform = triangle_marker.get_transform().rotate_deg(270)
    ax.scatter(x_vals[pluck_onset_idxs], pluck_onset_vals, 
              marker=triangle_marker, color='blue', s=60, 
              label='Pluck Onsets')
    ax.scatter(x_vals[chikari_onset_idxs], chikari_onset_vals, 
              marker='x', color='black', s=60, 
              label='Chikari Onsets')
    
    index_groups = get_idx_groups(log_pitch)
    threshold = 0.1
    log_fund = np.log2(fund)
    oct_above_fund = log_fund + 1
    on_fund = [
        np.all((log_pitch[g] > log_fund - threshold) & (log_pitch[g] < log_fund + threshold)) or
        np.all((log_pitch[g] > oct_above_fund - threshold) & (log_pitch[g] < oct_above_fund + threshold))
        for g in index_groups
    ]
    breakpoint()



    plt.savefig(f'./python/auto_transcribe/melodic_contours/contour_{idx}.png')
    plt.close()
