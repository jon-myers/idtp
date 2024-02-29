from typing import Optional, TypedDict
import humps

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

	
r = Raga()
