from essentia import standard as ess
from matplotlib import pyplot as plt
from matplotlib import cm
from matplotlib.markers import MarkerStyle
import numpy as np
from mir_eval.sonify import pitch_contour

min_freq = 150
max_freq = 500

def get_idx_groups(log_pitch: np.ndarray, pluck_idxs: list[int], discontinuity_threshold: float = 0.2):
    # segmentation of the pitch contour
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
    
     # Further segment the groups based on pluck_idxs
    final_idx_groups = []
    for group in idx_groups:
        new_group = []
        for idx in group:
            if idx in pluck_idxs:
                if new_group:
                    final_idx_groups.append(new_group)
                    new_group = []
            new_group.append(idx)
        if new_group:
            final_idx_groups.append(new_group)
    
    return final_idx_groups

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

def within_threshold(trial_arr: np.ndarray, target_arr: np.ndarray, threshold: float, debug: bool = False) -> np.ndarray:
    result = []
    for item in target_arr:
        if debug:
            breakpoint()
        is_within_threshold = any(abs(item - num) <= threshold for num in trial_arr)
        result.append(is_within_threshold)
    return np.array(result)


def save_contour_synth(idx: int, log_pitch: np.ndarray, filtered_index_groups: list[list[int]], start: float, end: float, audio: np.ndarray):
    synth_vals = np.zeros(len(log_pitch))
    for g in filtered_index_groups:
        synth_vals[g] = 2 ** log_pitch[g]
    sample_rate = 44100
    duration = end - start
    time = np.linspace(0, duration, len(synth_vals))
    sine_wave = np.sin(2 * np.pi * synth_vals * time)
    sine_wave /= np.max(np.abs(sine_wave))
    amp = np.ones(len(sine_wave)) / 2
    synth_melody = pitch_contour(time, synth_vals, sample_rate, amp)
    mixed_audio = audio + synth_melody
    mixed_audio /= np.max(np.abs(mixed_audio))
    dir = './python/auto_transcribe/melodic_contours'
    writer = ess.MonoWriter(filename=f'{dir}/synth_{idx}.wav', sampleRate=sample_rate)
    writer(mixed_audio)

def make_amplitude_plot(ax_amp, normed_amp, start, end):
    x_vals = np.linspace(start, end, len(normed_amp))
    ax_amp.plot(x_vals, normed_amp, color='black')
    ax_amp.set_ylabel('Amplitude (dB)')
    ax_amp.set_ylim([0, 1])
    ax_amp.set_xlim([start, end])

def make_just_contour_plot(ax_0, x_vals, log_pitch, log_fund, start, end, colors):
    x_vals = np.linspace(start, end, len(log_pitch))
    # ax_0.plot(np.arange(len(normed_amp)), normed_amp, color='black')
    ax_0.scatter(x_vals, log_pitch, c=colors, s=1)
    ax_0.set_ylabel('Pitch (Hz)')
    # ax_0.set_title('Melodic Contour')
    ax_0.set_ylim([np.log2(min_freq), np.log2(max_freq)])
    y_ticks = ax_0.get_yticks()
    labels = [str(int(2**y)) for y in y_ticks]
    ax_0.set_yticklabels(labels)
    ax_0.set_xlim([start, end])

def make_annotated_contour_plot(ax, log_pitch, log_fund, start, end, colors, 
                                pluck_onset_idxs, chikari_onset_idxs, idx_groups):
    x_vals = np.linspace(start, end, len(log_pitch))
    ax.scatter(x_vals, log_pitch, c=colors, s=1)
    ax.set_ylabel('Pitch (Hz)')
    ax.set_ylim([np.log2(min_freq), np.log2(max_freq)])
    y_ticks = ax.get_yticks()
    labels = [str(int(2**y)) for y in y_ticks]
    ax.set_yticklabels(labels)
    # normed_pluck_onsets = pluck_onsets / (end - start)
    # pluck_onset_idxs = (normed_pluck_onsets * len(log_pitch)).astype(int)
    pluck_onset_vals = log_pitch[pluck_onset_idxs]
    for i in range(len(pluck_onset_idxs)):
        if np.isnan(pluck_onset_vals[i]):
            pluck_onset_vals[i] = find_nearest_non_nan(log_pitch, pluck_onset_idxs[i])
    # normed_chikari_onsets = chikari_onsets / (end - start)
    # chikari_onset_idxs = (normed_chikari_onsets * len(log_pitch)).astype(int)
    chikari_onset_vals = log_pitch[chikari_onset_idxs]
    for i in range(len(chikari_onset_idxs)):
        if np.isnan(chikari_onset_vals[i]):
            chikari_onset_vals[i] = find_nearest_non_nan(log_pitch, chikari_onset_idxs[i])
    triangle_marker = MarkerStyle(marker='^')
    triangle_marker._transform = triangle_marker.get_transform().rotate_deg(270)
    triangle_marker._transform = triangle_marker._transform.translate(0.5, 0)
    # Annotate the indices above and to the right of each triangle marker
    for i, (x, y) in enumerate(zip(x_vals[pluck_onset_idxs], pluck_onset_vals)):
        ax.text(x + 0.01, y + 0.1, str(i), color='blue', fontsize=8)
    ax.scatter(x_vals[pluck_onset_idxs], pluck_onset_vals, 
              marker=triangle_marker, color='blue', s=60, 
              label='Pluck Onsets')
    ax.scatter(x_vals[chikari_onset_idxs], chikari_onset_vals, 
              marker='x', color='black', s=60, 
              label='Chikari Onsets')
    ax.set_xlim([start, end])
    ig_starts = [g[0] for g in idx_groups]
    for igs in ig_starts:
        ax.axvline(x=x_vals[igs], color='black', linestyle='--')
    
def make_filtered_contour_plot(ax1, log_pitch, log_fund, start, end, 
                               filtered_index_groups):
    x_vals = np.linspace(start, end, len(log_pitch))
    ax1.set_ylabel('Pitch (Hz)')
    ax1.set_ylim([np.log2(min_freq), np.log2(max_freq)])
    y_ticks = ax1.get_yticks()
    labels = [str(int(2**y)) for y in y_ticks]
    ax1.set_yticklabels(labels)
    ax1.set_xlim([start, end])
    ax1.set_xlabel('Time')
    for g in filtered_index_groups:
        ax1.scatter(x_vals[g], log_pitch[g], c='red', s=1) 

def get_contour(audio: np.ndarray, idx: int, pluck_onsets: np.ndarray, 
                chikari_onsets: np.ndarray, start: float, end: float, 
                fund: float):
    # compute the melodic contour
    log_fund = np.log2(fund)
    voicing_tolerance = 0.7
    # min_freq = 100
    # max_freq = 400
    eq_loud_audio = ess.EqualLoudness()(audio)
    frame_size = 2048
    ppm = ess.PredominantPitchMelodia(minFrequency = min_freq, 
                                      maxFrequency = max_freq, 
                                      voicingTolerance = voicing_tolerance,
                                      frameSize = frame_size)
    pitch, confidence = ppm(eq_loud_audio)
    pitch[pitch == 0] = np.nan
    num_frames = len(pitch)
    amp_envelope = ess.Envelope()(eq_loud_audio)
    amp_frame_size = len(amp_envelope) // len(pitch)
    # max_amplitude = np.array([np.max(amp_envelope[i * frame_size:(i + 1) * frame_size]) for i in range(num_frames)])
    max_amplitude = np.array([np.max(amp_envelope[i * amp_frame_size:(i + 1) * amp_frame_size]) for i in range(num_frames)])
    max_val = np.max(max_amplitude)
    noise_floor = np.min(max_amplitude)
    log_amplitude = np.log10(max_amplitude / noise_floor)
    normed_amp = (log_amplitude - np.min(log_amplitude)) / (np.log10(1 / noise_floor) - np.min(log_amplitude))
    
    log_pitch = np.log2(pitch)
    norm_confidence = confidence - np.min(confidence)
    norm_confidence /= np.max(norm_confidence)
    
    normed_chikari_onsets = chikari_onsets / (end - start)
    chikari_onset_idxs = (normed_chikari_onsets * len(log_pitch)).astype(int)
    normed_pluck_onsets = pluck_onsets / (end - start)
    pluck_onset_idxs = (normed_pluck_onsets * len(log_pitch)).astype(int)
    
    idx_groups = get_idx_groups(log_pitch, pluck_onset_idxs, 0.1)
    threshold = 0.05
    
    oct_above_fund = log_fund + 1
    on_fund = [
        np.all((log_pitch[g] > log_fund - threshold) & (log_pitch[g] < log_fund + threshold)) or
        np.all((log_pitch[g] > oct_above_fund - threshold) & (log_pitch[g] < oct_above_fund + threshold))
        for g in idx_groups
    ]
    
    viridis = cm.get_cmap('viridis', 256)
    colors = viridis(norm_confidence)
    fig, axes = plt.subplots(4, 1, figsize=(6, 8))
    make_amplitude_plot(axes[0], normed_amp, start, end)
    make_just_contour_plot(axes[1], np.linspace(start, end, len(log_pitch)), log_pitch, log_fund, start, end, colors)
    make_annotated_contour_plot(axes[2], log_pitch, log_fund, start, end, 
                                colors, pluck_onset_idxs, chikari_onset_idxs,
                                idx_groups)
    
    
    
    #TODO turn this part into a `make_filtered_contour` function
    ig_starts = [g[0] for g in idx_groups]   
    chik_starts = within_threshold(chikari_onset_idxs, ig_starts, 20)
    pluck_starts = within_threshold(pluck_onset_idxs, ig_starts, 20)
    
    removable_chik_seg = chik_starts & np.array(on_fund)
    removable_chik_seg_idxs = np.where(removable_chik_seg)[0]
    removable_pluck_seg = ~pluck_starts & np.array(on_fund)
    removable_pluck_seg_idxs = np.where(removable_pluck_seg)[0]
    filtered_index_groups = []
    for i, g in enumerate(idx_groups):
        if i in removable_chik_seg_idxs or i in removable_pluck_seg_idxs:
            continue
        filtered_index_groups.append(g)    
    x_vals = np.linspace(start, end, len(log_pitch))
    log_fund = np.log2(fund)
    
    make_filtered_contour_plot(axes[3], log_pitch, log_fund, start, end, 
                               filtered_index_groups)
    

        
        
    plt.savefig(f'./python/auto_transcribe/melodic_contours/contour_{idx}.png')
    plt.close()
    save_contour_synth(idx, log_pitch, filtered_index_groups, start, end, audio)

