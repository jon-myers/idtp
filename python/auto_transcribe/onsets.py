import os
import essentia.standard as ess
import essentia
import numpy as np
import matplotlib.pyplot as plt

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



dir = os.path.dirname(__file__)
for i in range(3):
	filename = os.path.join(dir, f'clips/clip_{i}.mp3')
	loader = ess.EasyLoader(filename = filename, replayGain=0)
	audio = loader()

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

	if i == 2:
		alpha = 0.4
		delay = 4
		silenceThreshold = 0.02
		onsets = ess.Onsets(alpha=alpha, delay=delay, silenceThreshold=silenceThreshold)
		onsets_hfc = onsets(essentia.array([pool['odf.hfc']]), [1])
		onsets_complex = onsets(essentia.array([pool['odf.complex']]), [1])
		onsets_flux = onsets(essentia.array([pool['odf.flux']]), [1])
		onsets_complex_phase = onsets(essentia.array([pool['odf.complex_phase']]), [1])
		onsets_melflux = onsets(essentia.array([pool['odf.melflux']]), [1])
		onsets_rms = onsets(essentia.array([pool['odf.rms']]), [1])
		onsets = onsets_hfc[onsets_hfc > 0.02]
		onsets = onsets_complex[onsets_complex > 0.02]
		onsets = onsets[onsets < 0.99 * len(audio) / 44100]

		# print(onsets)
		for o_idx, onset in enumerate(onsets):
			dur = 0.1
			# slice of audio following onset time
			onset_audio = audio[int(onset * 44100):int((onset + dur) * 44100)]
			onset_sp_bins = []
			onset_sp_saliences = []
   
			# print(len(onset_audio))
			for frame in ess.FrameGenerator(onset_audio, frameSize=frameSize, hopSize=hopSize):
				frame = run_windowing(frame)
				spec = run_spectrum(frame)
				# flatness = ess.FlatnessDB()(frame)
				# hfc = ess.HFC()(spec)
				# pool.add(f'onset_{o_idx}_flatness', flatness)
				contrast = ess.SpectralContrast(frameSize=frameSize)(spec)
				pool.add(f'onset_{o_idx}_contrast', contrast)
				# print(len(spec))
				# power_spectrum = ess.PowerSpectrum()(frame)
				# pool.add(f'onset_{o_idx}_power_spectrum', power_spectrum)
				# onset_sp_bins.append(sp_bins)
				# onset_sp_saliences.append(sp_saliences)
			# print(np.mean(pool[f'onset_{o_idx}_flatness']))
			print(pool[f'onset_{o_idx}_contrast'])

			
		
		
	else:
		alpha = 0.4
		delay = 4
		silenceThreshold = 0.02
		onsets = ess.Onsets(alpha=alpha, delay=delay, silenceThreshold=silenceThreshold)
		onsets_hfc = onsets(essentia.array([pool['odf.hfc']]), [1])
		onsets_complex = onsets(essentia.array([pool['odf.complex']]), [1])
		onsets_flux = onsets(essentia.array([pool['odf.flux']]), [1])
		onsets_complex_phase = onsets(essentia.array([pool['odf.complex_phase']]), [1])
		onsets_melflux = onsets(essentia.array([pool['odf.melflux']]), [1])
		onsets_rms = onsets(essentia.array([pool['odf.rms']]), [1])
		onsets = onsets_hfc[onsets_hfc > 0.02]

	silence = [0.] * len(audio)
	beeps = ess.AudioOnsetsMarker(onsets=onsets, type='beep')(silence)
	beeps_audio = ess.StereoMuxer()(beeps, beeps)
	out_path = os.path.join(dir, f'beeps/beeps_{i}.wav')
	ess.AudioWriter(filename=out_path, format='wav')(beeps_audio)
	print(onsets)
#  print all with labels
	# print('hfc:', np.round(onsets_hfc, 2))
	# print('complex:', np.round(onsets_complex, 2))
	# print('flux:', np.round(onsets_flux, 2))
	# print('complex_phase:', np.round(onsets_complex_phase, 2))
	# print('melflux:', np.round(onsets_melflux, 2))
	# print('rms:', np.round(onsets_rms, 2))
	# print('\n')
