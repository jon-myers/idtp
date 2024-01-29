from python.api.classes.pitch import Pitch

def inc(x):
    return x + 1

def test_answer():
    assert inc(3) == 4

def test_pitch():
    p = Pitch()
    assert p.swara == 0
    assert p.oct == 0
    assert p.raised == False
    assert p.fundamental == 261.63
    assert p.ratios == [
        1,
        [2 ** (1 / 12), 2 ** (2 / 12)],
        [2 ** (3 / 12), 2 ** (4 / 12)],
        [2 ** (5 / 12), 2 ** (6 / 12)],
        2 ** (7 / 12),
        [2 ** (8 / 12), 2 ** (9 / 12)],
        [2 ** (10 / 12), 2 ** (11 / 12)]
    ]
    assert p.logOffset == 0.0
    # assert p.frequency == 261.63
