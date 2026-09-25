import numpy as np
import pytest
from scipy import sparse

from flytrade.brain import Brain


def tiny_brain(edges: dict[tuple[int, int], float], n: int = 4) -> Brain:
    """Brain over ids 0..n-1 with signed synapse counts on the given (pre, post) edges."""
    pre, post = zip(*edges) if edges else ((), ())
    W = sparse.csr_matrix((list(edges.values()), (pre, post)), shape=(n, n), dtype=np.float32)
    return Brain(np.arange(n), W)


def test_silent_without_input():
    res = tiny_brain({(0, 1): 500}).run({}, t_ms=200)
    assert res.rates.sum() == 0
    assert np.isnan(res.first_spike_ms).all()


def test_stimulated_neuron_follows_poisson_rate():
    res = tiny_brain({}).run({0: 100.0}, t_ms=2000, seed=1)
    assert 80 <= res.rates[0] <= 120
    assert res.rates[1:].sum() == 0


def test_strong_excitation_drives_downstream_after_delay():
    res = tiny_brain({(0, 1): 400}).run({0: 100.0}, t_ms=1000)
    assert res.rates[1] > 10
    assert res.first_spike_ms[1] >= res.first_spike_ms[0] + 1.8


def test_inhibition_suppresses_downstream():
    edges = {(0, 2): 400, (1, 2): -800}
    excited = tiny_brain(edges).run({0: 100.0}, t_ms=1000)
    both = tiny_brain(edges).run({0: 100.0, 1: 100.0}, t_ms=1000)
    assert both.rates[2] < 0.5 * excited.rates[2]


@pytest.mark.slow
def test_real_connectome_sugar_drives_mn9_and_bitter_suppresses():
    from flytrade.data import load_connectome
    from flytrade.neurons import BITTER, MN9, SUGAR

    brain = Brain(*load_connectome())
    mn9 = brain.index_of(MN9[:1])[0]
    sugar = brain.run({i: 150.0 for i in SUGAR}, t_ms=1000)
    mixed = brain.run({**{i: 150.0 for i in SUGAR}, **{i: 150.0 for i in BITTER}}, t_ms=1000)
    assert sugar.rates[mn9] > 5
    assert mixed.rates[mn9] < sugar.rates[mn9]
