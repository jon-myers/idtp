import json, math, gzip, os, sys
import essentia.standard as ess
import numpy as np
from matplotlib import pyplot as plt

def replaceZeros(data):
    min_nonzero = np.min(data[np.nonzero(data)])
    data[data == 0] = min_nonzero
    return data

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)

def make_spec_data(file_path, output_dir):
    loader = ess.EasyLoader(filename = file_path, replayGain=0, startTime=0)
    audio = loader()
    params = {
              'inputSize': audio.size,
              'minFrequency': 75,
              'maxFrequency': 2400,
              'binsPerOctave': 72,
              'windowSizeFactor': 1,
              'gamma': 20
             }
    cqGen = ess.NSGConstantQ(**params)
    max_seconds = 600
    max_samples = int(max_seconds * loader.paramValue('sampleRate'))


    passes = math.ceil(len(audio) / max_samples)
    arrs = []

    for i in range(passes):
        print(i)
        if i < passes - 1:
            audio_segment = audio[i * max_samples: (i+1) * max_samples]
        else:
            audio_segment = audio[i * max_samples:]
        constantq, _, _ = cqGen(audio_segment)
        abs_constantq = replaceZeros(np.abs(constantq))
        arr = np.log10(abs_constantq)
        arrs.append(arr)

    arr = np.hstack(arrs)
    arr =  (256 * (arr - np.min(arr)) / (np.max(arr) - np.min(arr))).astype(np.uint8)
    # flip vertically
    arr = np.flipud(arr)
    shape = np.shape(arr)
    offset = 10
    # Take the last 10 columns of the spectrogram
    # and put them at the beginning
    arr = np.hstack((arr[:, -offset:], arr[:, :-offset]))    
    arr_bytes = arr.tobytes()

    compressed_data = gzip.compress(arr_bytes)
    with open(output_dir + '/spec_data.gz', 'wb') as f:
        f.write(compressed_data)

    with open(output_dir + '/spec_shape.json', 'w') as f:
        json.dump({'shape': shape}, f)
        
# if main
if __name__ == '__main__':
  rec_id = sys.argv[1]
  path_to_audio = os.path.join(os.path.dirname(__file__), '..', 'audio')
  path_to_wav = os.path.join(path_to_audio, 'wav')
  file_path = os.path.join(path_to_wav, rec_id + '.wav')
  path_to_spec_data = os.path.join(os.path.dirname(__file__), '..', 'spec_data')
  out_dir = os.path.join(path_to_spec_data, rec_id)
  if not os.path.exists(out_dir):
    os.makedirs(out_dir)
  make_spec_data(file_path, out_dir)
