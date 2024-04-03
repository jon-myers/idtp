from typing import Optional, TypedDict
import humps
import math
from .pitch import Pitch


BoolObj = dict[str, bool]   
RuleSetType = dict[str, bool | BoolObj]
NumObj = dict[str, float]
TuningType = dict[str, float | NumObj]


yaman_rule_set = {
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
		'lowered': False,
		'raised': True
	},
	'pa': True,
	'dha': {
		'lowered': False,
		'raised': True
	},
	'ni': {
		'lowered': False,
		'raised': True
	}
}

class RagaOptionsType(TypedDict, total=False):
	name: str
	fundamental: float
	rule_set: RuleSetType
	tuning: TuningType
	ratios: list[float]

class Raga():
	def __init__(self, options: Optional[RagaOptionsType] = None):
		if options is None:
			options = {}
		else:
			options = humps.decamelize(options)
		self.name = options.get('name', 'Yaman')
		self.fundamental = options.get('fundamental', 261.63)
		self.rule_set = options.get('rule_set', yaman_rule_set)
		self.ratios = None
		self.tuning: TuningType = {
			'sa': 2 ** (0 / 12),
			're': {
				'lowered': 2 ** (1 / 12),
				'raised': 2 ** (2 / 12)
			},
			'ga': {
				'lowered': 2 ** (3 / 12),
				'raised': 2 ** (4 / 12)
			},
			'ma': {
				'lowered': 2 ** (5 / 12),
				'raised': 2 ** (6 / 12)
			},
			'pa': 2 ** (7 / 12),
			'dha': {
				'lowered': 2 ** (8 / 12),
				'raised': 2 ** (9 / 12)
			},
			'ni': {
				'lowered': 2 ** (10 / 12),
				'raised': 2 ** (11 / 12)
			}
		}
		c1 = options.get('ratios') is None
		c2 = (not c1) and options.get('ratios').length != self.rule_set_num_pitches
		if c1 or c2:
			self.ratios = self.set_ratios(self.rule_set)
		else:
			self.ratios = options.get('ratios')
			
	@property
	def rule_set_num_pitches(self):
		num_pitches = 0
		for key in self.rule_set:
			if type(self.rule_set[key]) == bool:
				if self.rule_set[key]:
					num_pitches += 1
			else:
				if self.rule_set[key]['lowered']:
					num_pitches += 1
				if self.rule_set[key]['raised']:
					num_pitches += 1
		return num_pitches
	
	def set_ratios(self, rule_set: RuleSetType):
		sargam = rule_set.keys()
		ratios: list[float] = []
		for s in sargam:
			if type(self.tuning[s]) == float and rule_set[s]:
				ratios.append(self.tuning[s])
			else:
				rs: BoolObj = rule_set[s]
				tuning: NumObj = self.tuning[s]
				if rs['lowered']:
					ratios.append(tuning['lowered'])
				if rs['raised']:
					ratios.append(tuning['raised'])
		return ratios

	@property
	def sargam_letters(self):
		init_sargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni']
		sl = []
		for s in init_sargam:
			if isinstance(self.rule_set[s], dict):
				rule_set = self.rule_set[s]
				if rule_set.get('lowered'):
					sl.append(s[0])
				if rule_set.get('raised'):
					sl.append(s[0].upper())
			elif self.rule_set[s]:
				sl.append(s[0].upper())
		return sl
	
	#helper method needed for other methods
	def chroma_to_scale_degree(self, chroma):
		scale_degree = 0
		raised = True

		if chroma == 0:
			scale_degree = 0
			raised = True
		elif chroma == 1:
			scale_degree = 1
			raised = False
		elif chroma == 2:
			scale_degree = 1
			raised = True
		elif chroma == 3:
			scale_degree = 2
			raised = False
		elif chroma == 4:
			scale_degree = 2
			raised = True
		elif chroma == 5:
			scale_degree = 3
			raised = False
		elif chroma == 6:
			scale_degree = 3
			raised = True
		elif chroma == 7:
			scale_degree = 4
			raised = True
		elif chroma == 8:
			scale_degree = 5
			raised = False
		elif chroma == 9:
			scale_degree = 5
			raised = True
		elif chroma == 10:
			scale_degree = 6
			raised = False
		elif chroma == 11:
			scale_degree = 6
			raised = True
		return scale_degree, raised

	def pitch_number_to_sargam_letters(self, pitch_number):
		oct = int(pitch_number / 12)
		out = None
		chroma = pitch_number % 12
		while chroma < 0:
			chroma += 12
		scale_degree, raised = self.chroma_to_scale_degree(chroma)
		sargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni'][scale_degree]
		if isinstance(self.rule_set[sargam], bool):
			if self.rule_set[sargam]:
				out = sargam[0].upper()
		else:
			rule_set = self.rule_set[sargam]
			if rule_set['raised' if raised else 'lowered']:
				out = sargam[0].upper() if raised else sargam[0]
		return out

	def get_pitch_numbers(self, low, high):
		pitch_numbers = []
		for i in range(low,high+1):
			oct = int(i / 12)
			chroma = i % 12
			while chroma < 0:
				chroma += 12
			scale_degree, raised = self.chroma_to_scale_degree(chroma)
			sargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni'][scale_degree]
			if isinstance(self.rule_set[sargam], bool):
				if self.rule_set[sargam]:
					pitch_numbers.append(i)
			else:
				rule_set = self.rule_set[sargam]
				if rule_set['raised' if raised else 'lowered']:
					pitch_numbers.append(i)
		return pitch_numbers

	def pitch_number_to_scale_number(self, pitch_number):
		oct = pitch_number // 12
		chroma = pitch_number % 12
		while chroma < 0:
			chroma += 12
		main_oct = self.get_pitch_numbers(0, 11)
		index = main_oct.index(chroma)
		if index == -1:
			raise ValueError('pitchNumberToScaleNumber: pitchNumber not in raga')
		return index + oct * len(main_oct)

	def scale_number_to_pitch_number(self, scale_number):
		main_oct = self.get_pitch_numbers(0, 11)
		oct = scale_number // len(main_oct)
		while scale_number < 0:
			scale_number += len(main_oct)
		chroma = main_oct[scale_number % len(main_oct)]
		return chroma + oct * 12

	def scale_number_to_sargam_letter(self, scale_number):
		pitch_number = self.scale_number_to_pitch_number(scale_number)
		return self.pitch_number_to_sargam_letters(pitch_number)

	def get_pitches(self, low=100, high=800):
		sargam = list(self.rule_set.keys())
		pitches = []
		for s in sargam:
			if isinstance(self.rule_set[s], bool):
				if self.rule_set[s]:
					freq = self.tuning[s] * self.fundamental
					octs_below = math.ceil(math.log2(low / freq))
					octs_above = math.floor(math.log2(high / freq))
					for i in range(octs_below, octs_above + 1):
						pitches.append(Pitch(options={'swara': s, 'oct': i, 'raised': False, 
							'fundamental': self.fundamental, 'ratios': self.stratified_ratios}))
			else:
				if self.rule_set[s]['lowered']:
					freq = self.tuning[s]['lowered'] * self.fundamental
					octs_below = math.ceil(math.log2(low / freq))
					octs_above = math.floor(math.log2(high / freq))
					for i in range(octs_below, octs_above + 1):
						pitches.append(Pitch(options={'swara': s, 'oct': i, 'raised': False, 
							'fundamental': self.fundamental, 'ratios': self.stratified_ratios}))
					octs_below = math.ceil(math.log2(low / freq))
					octs_above = math.floor(math.log2(high / freq))
					for i in range(octs_below, octs_above + 1):
						pitches.append(Pitch(options={'swara': s, 'oct': i, 'raised': True,  
							'fundamental': self.fundamental, 'ratios': self.stratified_ratios}))
		pitches.sort(key=lambda x: x.frequency)
		return pitches

	@property
	def stratified_ratios(self):
		sargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni']
		ratios = []
		ct = 0
		for sIdx, s in enumerate(sargam):
			if isinstance(self.rule_set.get(s), bool):
				if self.rule_set.get(s):
					ratios.append(self.ratios[ct])
					ct += 1
				else:
					ratios.append(self.tuning[s])
			else:
				ratios.append([])
				if self.rule_set[s]['lowered']:
					ratios[sIdx].append(self.ratios[ct])
					ct += 1
				else:
					ratios[sIdx].append(self.tuning[s]['lowered'])
				if self.rule_set[s]['raised']:
					ratios[sIdx].append(self.ratios[ct])
					ct += 1
				else:
					ratios[sIdx].append(self.tuning[s]['raised'])
		return ratios

	@property
	def chikari_pitches(self):
		return [
        Pitch(options={'swara': 's', 'oct': 2, 'fundamental': self.fundamental}),
        Pitch(options={'swara': 's', 'oct': 1, 'fundamental': self.fundamental})
    	]

	def get_frequencies(self, low=100, high=800):
		base_freqs = [r * self.fundamental for r in self.ratios]
		freqs = []

		for f in base_freqs:
			low_exp = math.ceil(math.log2(low / f))
			high_exp = math.floor(math.log2(high / f))
			exps = list(range(low_exp, high_exp + 1))
			additional_freqs = [f * (2.0 ** exp) for exp in exps]
			freqs.extend(additional_freqs)

		freqs.sort()
		return freqs

	@property
	def sargam_names(self):
		names = []
		sargam = self.rule_set.keys()

		for s in sargam:
			if isinstance(self.rule_set[s], dict):  # Check if value is a dictionary
				obj = self.rule_set[s]
				if obj.get('raised', False):
					names.append(s.capitalize())
				if obj.get('lowered', False):
					names.append(s.lower())
			else:
				if self.rule_set[s]:
					names.append(s.capitalize())
		return names

	def to_json(self):
		return {
        'name': self.name,
        'fundamental': self.fundamental,
        'ratios': self.ratios
    	}
r = Raga()
