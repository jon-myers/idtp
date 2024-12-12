import sys, os
import soundfile as sf
import essentia.standard as ess

file_path = sys.argv[1]
rec_id, suffix = file_path.split('/')[-1].split('.')
wav_path = 'audio/wav/' + rec_id + '.wav'
mp3_path = 'audio/mp3/' + rec_id + '.mp3'
opus_path = 'audio/opus/' + rec_id + '.opus'
sr = 44100

loader = ess.EasyLoader(filename = file_path)
audio = loader()

if suffix == 'mp3':
    sf.write(wav_path, audio, sr)
    os.system(f'ffmpeg -i {file_path} -codec:a libopus {opus_path}')
    os.rename(file_path, mp3_path)
elif suffix == 'wav':
    
    os.system(f'ffmpeg -i {file_path} -vn -ar 44100 -ac 2 -b:a 192k {mp3_path}')
    os.system(f'ffmpeg -i {file_path} -codec:a libopus {opus_path}')
    os.rename(file_path, wav_path)
else:
    sf.write(wav_path, audio, sr)
    os.system(f'ffmpeg -i {file_path} -vn -ar 44100 -ac 2 -b:a 192k {mp3_path}')
    os.system(f'ffmpeg -i {file_path} -codec:a libopus {opus_path}')
    os.remove(file_path)

os.system(f'python3 make_spec_data.py {rec_id}')
