import os, sys
import essentia.standard as ess
import essentia
import numpy as np
import matplotlib.pyplot as plt
from melodic_contour import get_contour
from extract import download_samples, download_file
submodule_path = os.path.abspath('articulation_classification')
sys.path.append('articulation_classification')

from infer import AudioClassifier
def demix_onsets(onsets: np.ndarray, start: float):
    plucks = []
    chikaris = []
    adjusted_onsets = onsets + start
    download_samples(adjusted_onsets, audio_id)
    model_path = os.path.join(submodule_path, 'articulation_classifier.pth')
    model = AudioClassifier(model_path=model_path)
    for k in range(len(onsets)):
        segment_path = os.path.join(dir, f'extraction/clips/tmp/{audio_id}/segment_{k}.wav')
        articulation = model.predict(segment_path)
        if articulation == 'plucks':
            plucks.append(onsets[k])
        elif articulation == 'chikaris':
            chikaris.append(onsets[k])
    return essentia.array(plucks), essentia.array(chikaris)

hopSize = 128
frameSize = 2048
sampleRate = 44100
guessUnvoiced = True

run_windowing = ess.Windowing(type='hann', zeroPadding=3*frameSize) # Hann window with x4 zero padding
run_spectrum = ess.Spectrum(size=frameSize)
run_spectral_peaks = ess.SpectralPeaks(minFrequency=50,
                                   maxFrequency=10000,
                                   maxPeaks=100,
                                   sampleRate=sampleRate,
                                   magnitudeThreshold=0,
                                   orderBy="magnitude")
run_pitch_salience_function = ess.PitchSalienceFunction(magnitudeThreshold=30)
run_pitch_salience_function_peaks = ess.PitchSalienceFunctionPeaks(minFrequency=100, maxFrequency=300)
run_pitch_contours = ess.PitchContours(hopSize=hopSize, peakFrameThreshold=0.2)
run_pitch_contours_melody = ess.PitchContoursMelody(guessUnvoiced=guessUnvoiced,
                                                hopSize=hopSize)
audio_id = '62fa903990b9ba8cdae9d251'
fund = 249
file_path = download_file(audio_id)

dir = os.path.dirname(__file__)
clips = [
    { 'start': 0, 'end': 20 },
    { 'start': 20, 'end': 40 },
    { 'start': 40, 'end': 60 },
    { 'start': 60, 'end': 80 },
    { 'start': 80, 'end': 100 },
    { 'start': 100, 'end': 120 },
]

for i, clip in enumerate(clips):
    print(file_path)
    loader = ess.EasyLoader(filename = file_path, startTime = clip['start'], endTime = clip['end'])
    audio = loader()
    ess.MonoWriter(filename=os.path.join(dir, f'clips/clip_{i}.wav'))(audio)

    od_hfc = ess.OnsetDetection(method='hfc')
    od_complex = ess.OnsetDetection(method='complex')
    od_flux = ess.OnsetDetection(method='flux')
    od_complex_phase = ess.OnsetDetection(method='complex_phase')
    od_melflux = ess.OnsetDetection(method='melflux')
    od_rms = ess.OnsetDetection(method='rms')

    w = ess.Windowing(type='hann')
    fft = ess.FFT()
    c2p = ess.CartesianToPolar()

    pool = essentia.Pool()
    for frame in ess.FrameGenerator(audio, frameSize=1024, hopSize=512):
        mag, phase, = c2p(fft(w(frame)))
        pool.add('odf.hfc', od_hfc(mag, phase))
        pool.add('odf.complex', od_complex(mag, phase))
        pool.add('odf.flux', od_flux(mag, phase))
        pool.add('odf.complex_phase', od_complex_phase(mag, phase))
        pool.add('odf.melflux', od_melflux(mag, phase))
        pool.add('odf.rms', od_rms(mag, phase))
    alpha = 0.3 # higher means less detections (I think)
    delay = 5 # higher means more detections (I think)
    silenceThreshold = 0.02
    detection_funcs = ['hfc', 'complex', 'flux', 'complex_phase', 'melflux', 'rms']
    det_arrays = [pool[f'odf.{func}'] for func in detection_funcs]
    onset_func = ess.Onsets(alpha=alpha, delay=delay, silenceThreshold=silenceThreshold)
    onsets = onset_func(essentia.array(det_arrays), [1 for _ in det_arrays])
    onsets = onsets[onsets > 0.02]
    onsets = onsets[onsets < 0.99 * len(audio) / 44100]
    audio_id = '62fa903990b9ba8cdae9d251'
    pluck_onsets, chikari_onsets = demix_onsets(onsets, clip['start'])
    sig = [0.] * len(audio)
    sig = ess.AudioOnsetsMarker(onsets=pluck_onsets, type='beep')(sig)
    sig = ess.AudioOnsetsMarker(onsets=chikari_onsets, type='noise')(sig)
    beeps_audio = ess.StereoMuxer()(sig, sig)
    out_path = os.path.join(dir, f'beeps/beeps_{i}.wav')
    ess.AudioWriter(filename=out_path, format='wav')(beeps_audio)
    get_contour(audio, i, pluck_onsets, chikari_onsets, clip['start'], clip['end'], fund)
    
        
 

    
 
	

 
 
