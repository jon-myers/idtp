from enum import Enum
import pymongo, os
from pymongo.server_api import ServerApi
from typing import TypedDict
import numpy as np

username = os.environ.get('USER_NAME')
password = os.environ.get('PASSWORD')
query = "mongodb+srv://" + username + ":" + password + "@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = pymongo.MongoClient(query, server_api=ServerApi('1'))
db = client.swara
collection = db.ragas


class RulesType(TypedDict):
    sa = bool
    re = { 'lowered': bool, 'raised': bool }
    ga = { 'lowered': bool, 'raised': bool }
    ma = { 'lowered': bool, 'raised': bool }
    pa = bool
    dha = { 'lowered': bool, 'raised': bool }
    ni = { 'lowered': bool, 'raised': bool }

class RatiosType(TypedDict):
    sa = float
    re = { 'lowered': float, 'raised': float }
    ga = { 'lowered': float, 'raised': float }
    ma = { 'lowered': float, 'raised': float }
    pa = float
    dha = { 'lowered': float, 'raised': float }
    ni = { 'lowered': float, 'raised': float }
    

default_rule: RulesType = {
	'sa': True,
 	're': {
		'lowered': False,
		'raised': True
		},
	'ga': {
		'lowered': False,
		'raised': True
		},
	'ma': {
		'lowered': True,
		'raised': False
		},
	'pa': True,
	'dha': {
		'lowered': False,
		'raised': True
		},
	'ni': {
		'lowered': False,
		'raised': True
		},
	}

default_ratio: RatiosType = {
    'sa': 2 ** (0/12),
    're': { 'lowered': 2 ** (1/12), 'raised': 2 ** (2/12) },
    'ga': { 'lowered': 2 ** (3/12), 'raised': 2 ** (4/12) },
    'ma': { 'lowered': 2 ** (5/12), 'raised': 2 ** (6/12) },
    'pa': 2 ** (7/12),
    'dha': { 'lowered': 2 ** (8/12), 'raised': 2 ** (9/12) },
    'ni': { 'lowered': 2 ** (10/12), 'raised': 2 ** (11/12) },
}
 
class RaagName(Enum):
    Yaman = 'Yaman'
    
    def get_rules(self):
        query = { 'name': self.value }
        result = collection.find_one(query)
        return result['rules']

class Raag():
    name: RaagName
    rules: RulesType
    ratios: RatiosType = default_ratio
    fundamental: float
    
    def __init__(self, name: RaagName, fundamental: float):
        self.name = name
        self.fundamental = fundamental
        self.assign_rules()
        
    def assign_rules(self):
        query = { 'name': self.name.value }
        result = collection.find_one(query)
        self.rules = result['rules']
    
    @property
    def oct_ratios(self):
        ratios = []
        keys = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni']
        for key in keys:
            if type(self.rules[key]) == bool:
                if self.rules[key]:
                    ratios.append(self.ratios[key])
            else:
                if self.rules[key]['lowered']:
                    ratios.append(self.ratios[key]['lowered'])
                if self.rules[key]['raised']:
                    ratios.append(self.ratios[key]['raised'])
        return ratios
    
    def get_freqs(self, min_freq: float, max_freq: float):
        freqs = []
        oct_ct = 0
        while True:
            added_freqs = False
            for ratio in self.oct_ratios:
                freq = self.fundamental * (2 ** (oct_ct + ratio))
                if min_freq <= freq <= max_freq:
                    freqs.append(freq)
                    added_freqs = True
                    
                elif freq > max_freq:
                    break
            if not added_freqs and oct_ct > 0:
                break
            oct_ct += 1
        oct_ct = -1
        while True:
            # breakpoint()
            added_freqs = False
            for ratio in self.oct_ratios[::-1]:
                freq = self.fundamental * (2 ** (oct_ct + ratio))
                if min_freq <= freq <= max_freq:
                    freqs.append(freq)
                    added_freqs = True
                elif freq < min_freq:
                    break
            if not added_freqs and oct_ct < 0:
                break
            oct_ct -= 1
        return np.array(sorted(freqs))
                
        
        
    
        
        
# raag = Raag(RaagName.Yaman, 249)
# print(raag.get_freqs(100, 1000))
        
        

