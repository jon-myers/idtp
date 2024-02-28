from typing import List, Dict, TypedDict, Optional, Union
import humps
import math

# this should all be implemented in snake_case, even though the TypeScript 
# version is in camelCase

class PitchOptionsType(TypedDict, total=False):
    swara: Union[str, int]
    oct: int
    raised: bool
    fundamental: float
    ratios: List[Union[float, List[float]]]
    log_offset: float

class Pitch:

    def __init__(self, options: Optional[PitchOptionsType] = None):
        if options is None:
            options = {}
        else: # this converts from camelCase to snake_case
            options = humps.decamelize(options) 
        self.swara = options.get('swara', 'sa')
        sargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni']
        sargamletters = ['s', 'r', 'g', 'm', 'p', 'd', 'n']
        if type(self.swara) == str:
            self.swara = self.swara.lower()
            if len(self.swara) == 1:
                self.swara = sargamletters.index(self.swara)
            else:
                self.swara = sargam.index(self.swara)
        self.oct = options.get('oct', 0)
        self.raised = options.get('raised', True)
        self.fundamental = options.get('fundamental', 261.63)
        self.ratios = options.get('ratios', [
            1,
            [2 ** (1 / 12), 2 ** (2 / 12)],
            [2 ** (3 / 12), 2 ** (4 / 12)],
            [2 ** (5 / 12), 2 ** (6 / 12)],
            2 ** (7 / 12),
            [2 ** (8 / 12), 2 ** (9 / 12)],
            [2 ** (10 / 12), 2 ** (11 / 12)]
        ])
        self.log_offset = options.get('log_offset', 0.0)

    @property
    def frequency(self):
        ratio = 0
        if type(self.ratios[self.swara]) == list:
            ratio = self.ratios[self.swara][self.raised]
        else:
            ratio = self.ratios[self.swara]
        return self.fundamental * ratio * (2 ** (self.oct + self.log_offset))

    @property
    def non_offset_frequency(self):
        ratio = 0
        if type(self.ratios[self.swara]) == list:
            ratio = self.ratios[self.swara][self.oct]
        else:
            ratio = self.ratios[self.swara]
        return self.fundamental * ratio * (2 ** (self.oct))
    
    @property
    def non_offset_log_freq(self):
        return math.log2(self.non_offset_frequency)

    @property
    def log_freq(self):
        return math.log2(self.frequency)

    @property
    def sargam_letter(self):
        sargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni']
        s = sargam[int(self.swara)][0]
        if self.swara == 0 or self.swara == 4:
            # raised override
            self.raised = True
        if self.raised:
            s = s.upper()  # Ensure the first letter is capitalized
        return s

    @property
    def octaved_sargam_letter(self):
        s = self.sargam_letter
        if (self.oct == -2):
            s = s + '\u0324'
        elif (self.oct == -1):
            s = s + '\u0323'
        elif (self.oct == 1):
            s = s + '\u0307'
        elif (self.oct == 2):
            s = s + '\u0308'
        return s

    @property
    def numbered_pitch(self):
        # something like a midi pitch, but centered on 0 instead of 60
        if self.swara == 0:
            return self.oct * 12 + 0
        elif self.swara == 1:
            return self.oct * 12 + 1 + int(self.raised)
        elif self.swara == 2:
            return self.oct * 12 + 3 + int(self.raised)
        elif self.swara == 3:
            return self.oct * 12 + 5 + int(self.raised)
        elif self.swara == 4:
            return self.oct * 12 + 7
        elif self.swara == 5:
            return self.oct * 12 + 8 + int(self.raised)
        elif self.swara == 6:
            return self.oct * 12 + 10 + int(self.raised)
        else:
            raise SyntaxError(f"invalid swara: {self.swara}")

    @property
    def chroma(self):
        np = self.numbered_pitch
        while np < 0:
            np += 12
        return np % 12
    
    #method
    def to_JSON(self):
        return { # this should still be camelCase
            'swara': self.swara,
            'raised': self.raised,
            'oct': self.oct,
            'ratios': self.ratios,
            'fundamental': self.fundamental,
            'logOffset': self.log_offset,
        } 

    #method
    def set_oct(self, newOct):
        self.oct = newOct
        ratio = None
        
        if self.swara == 0 or self.swara == 4:
            ratio = self.ratios[self.swara]
            if not isinstance(ratio, (int, float)):
                raise SyntaxError(f"Invalid ratio type, must be int or float: {ratio}")
        else:
            if not isinstance(self.swara, int):
                raise SyntaxError(f"Invalid swara type: {self.swara}")
            
            nestedRatios = self.ratios[self.swara]
            if not isinstance(nestedRatios, list):
                raise SyntaxError(f"Invalid nestedRatios type, must be array: {nestedRatios}")
            
            ratio = nestedRatios[int(self.raised)]
