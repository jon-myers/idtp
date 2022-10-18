import os

files = list(os.listdir('./wav'))

for file in files:
    in_path = './wav/' + file
    out_path = './opus/' + file[:-3] + 'opus'
    os.system('ffmpeg -i ' + in_path + ' -codec:a libopus ' + out_path)
