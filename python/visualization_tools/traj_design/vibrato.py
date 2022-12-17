from matplotlib import pyplot as plt
import numpy as np

class Vibrato:
    def __init__(self, x1, x2, y, periods, offset=False, extent=1):
        # offset just changes whether the beginning is up or down
        # False is down, True is up
        self.x1 = x1
        self.x2 = x2
        self.y = y
        self.periods = periods
        self.offset = offset
        self.extent = extent

    def compute(self, x, outer=True): # where x is between 0 and 1
        out = np.cos(x * 2 * np.pi * self.periods + self.offset * np.pi)
        if outer and x < 1 / (2 * self.periods):
            out = (out - np.sign(self.compute(0, False))) / 2
        if outer and x > 1 - 1 / (2 * self.periods):
            out = (out - np.sign(self.compute(1, False))) / 2
        if outer == True:
            return 0.5 * self.extent * out + self.y
        else:
            return out

    def plot(self):
        x = np.linspace(0, 1, 1000)
        display_x = np.linspace(self.x1, self.x2, 1000)
        y = [self.compute(i) for i in x]
        plt.plot(display_x, y)
        plt.show()

class MoveableVibrato:
    def __init__(self, x1, x2, y, periods, init_up=False, extent=1, vert_offset=0):
        self.x1 = x1
        self.x2 = x2
        self.y = y
        self.periods = periods
        self.init_up = init_up
        self.extent = extent
        self.vert_offset = vert_offset
        if np.abs(self.vert_offset) > extent / 2:
            self.vert_offset = np.sign(self.vert_offset) * extent / 2
    
    def compute(self, x):
        out = np.cos(x * 2 * np.pi * self.periods + self.init_up * np.pi)
        if x < 1 / (2 * self.periods):
            start = 0
            end = self.compute(1 / (2 * self.periods))
            middle = (end + start) / 2
            ext = np.abs(end - start) / 2
            out = out * ext + middle
            return out
        elif x > 1 - 1 / (2 * self.periods):
            start = self.compute(1 - 1 / (2 * self.periods))
            end = 0
            middle = (end + start) / 2
            ext = np.abs(end - start) / 2
            out = out * ext + middle
            return out
        else:
            return 0.5 * self.extent * out + self.y + self.vert_offset


    def plot(self):
        x = np.linspace(0, 1, 1000)
        display_x = np.linspace(self.x1, self.x2, 1000)
        y = [self.compute(i) for i in x]
        plt.plot(display_x, y)
        plt.ylim(-self.extent, self.extent)
        plt.show()

vib = MoveableVibrato(0, 1, 0, 5, True, 6, 3)
vib.plot()


