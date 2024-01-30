from typing import List, Dict, TypedDict, Optional, Union



class PitchOptionsType(TypedDict, total=False):
    swara: Union[str, int]
    oct: int
    raised: bool
    fundamental: float
    ratios: List[Union[float, List[float]]]
    logOffset: float

class Pitch:

    def __init__(self, options: Optional[PitchOptionsType] = None):
        if options is None:
            options = {}
        self.swara = options.get('swara', 'sa')
        sargam = ['sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni']
        if type(self.swara) == str:
            self.swara = self.swara.lower()
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
        self.logOffset = options.get('logOffset', 0.0)

    # @property
    # def frequency(self) -> float:
    #     return self.fundamental * (2 ** self.oct)
    
