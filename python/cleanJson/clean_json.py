import sys
import json
import pprint

pp = pprint.PrettyPrinter()
path = sys.argv[1]
json_out_path = sys.argv[2]
xlcs_out_path = sys.argv[3]

# get rid of ratios
transcription = json.load(open(path, 'r'))[0]
phrases = transcription['phrases']
for phrase in phrases:
    for trajectory in phrase['trajectories']:
        for pitch in trajectory['pitches']:
            pitch.pop('ratios', None)

json.dump(transcription, open(json_out_path, 'w'))