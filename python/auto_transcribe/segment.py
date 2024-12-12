import numpy as np
from raag import RaagName
from typing import TypedDict
from enum import Enum
import os, sys
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from api.classes.pitch import Pitch
from api.classes.raga import Raga, RagaOptionsType




class SegmentType(Enum):
    Silent = 0
    Fixed = 1
    Variable = 2

class Segment():
    type: SegmentType
    
    def __init__(self, log_contour: np.ndarray, type: SegmentType):
        self.log_contour = log_contour
        self.type = type
    

class MelodicSegmentation:
    log_contour: np.ndarray
    fundamental: float
    raga: Raga
    # raag: Raag
    log_threshold: float = 0.016 
    min_freq: float
    max_freq: float
    # need to figure out what log_threshold should be, and perhaps
    # should be adjustable. maybe 20 cents aka 0.016 in log2
    
    def __init__(self, log_contour: np.ndarray, fundamental: float, 
                 raag_name: RaagName, min_freq: float = 150, 
                 max_freq: float = 500):
        self.log_contour = log_contour
        self.fundamental = fundamental
        raga_options = {
            'name': raag_name.value,
            'fundamental': fundamental,
            'rule_set': raag_name.get_rules(),
        }
        self.raga = Raga(raga_options)
        self.min_freq = min_freq
        self.max_freq = max_freq
    
    # @property
    # def log_centers(self):
    #     return 2 ** self.raag.get_freqs(self.min_freq, self.max_freq)
    
    # isolate all segments where the log contour is within the threshold above
    # and below a log center
    
    # def perform_segmentation():
    
    
    
        
