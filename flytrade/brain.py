"""Whole-brain leaky integrate-and-fire model of Shiu et al. 2024, re-implemented in numpy.

Same equations and constants as the paper's Brian2 model (model.py):
    dv/dt = (v_0 - v + g) / t_mbr      (unless refractory)
    dg/dt = -g / tau                    (unless refractory)
    on presynaptic spike: g += w  after t_dly,  w = synapse count * w_syn
    Poisson stimulation: v += w_syn * f_poi  (no refractory period for stimulated neurons)
Only rows of spiking neurons are propagated each step, so a 1 s trial takes seconds, not minutes.
"""
from dataclasses import dataclass

import numpy as np
from scipy import sparse

DT = 0.1  # ms
V_0 = -52.0  # mV resting potential
V_RST = -52.0  # mV reset potential
V_TH = -45.0  # mV spike threshold
T_MBR = 20.0  # ms membrane time constant
TAU = 5.0  # ms synaptic time constant
T_RFC = 2.2  # ms refractory period
T_DLY = 1.8  # ms synaptic delay
W_SYN = 0.275  # mV per synapse
F_POI = 250  # Poisson synapse scaling (enough to force a spike)


@dataclass
class SimResult:
    rates: np.ndarray  # Hz per neuron
    first_spike_ms: np.ndarray  # ms of each neuron's first spike, NaN if it never fired


class Brain:
    def __init__(self, ids: np.ndarray, synapses: sparse.spmatrix):
        """ids: flywire id per neuron index; synapses: signed synapse counts, [pre, post]."""
        self.ids = np.asarray(ids)
        self._index = {int(f): i for i, f in enumerate(self.ids)}
        self.W = (sparse.csr_matrix(synapses, dtype=np.float32) * np.float32(W_SYN)).tocsr()
        self.n = len(self.ids)

        # exact solution of the linear (v, g) system over one step
        self._a = np.float32(np.exp(-DT / T_MBR))
        self._b = np.float32(np.exp(-DT / TAU))
        self._c = np.float32(TAU / (TAU - T_MBR) * (np.exp(-DT / TAU) - np.exp(-DT / T_MBR)))
        self._delay = int(round(T_DLY / DT))
        self._rfc_steps = int(round(T_RFC / DT))

    def index_of(self, flyids) -> np.ndarray:
        return np.array([self._index[int(f)] for f in flyids], dtype=np.int64)

    def run(self, stim: dict[int, float], t_ms: float = 1000.0, seed: int = 0) -> SimResult:
        """Stimulate {flywire id: Poisson rate Hz} for t_ms and return per-neuron rates."""
        rng = np.random.default_rng(seed)
        n, steps = self.n, int(round(t_ms / DT))
        stim_idx = self.index_of(stim.keys())
        stim_p = np.array(list(stim.values()), dtype=np.float64) * DT / 1000.0
        rfc_len = np.full(n, self._rfc_steps, dtype=np.int16)
        rfc_len[stim_idx] = 0

        v = np.full(n, V_0, dtype=np.float32)
        g = np.zeros(n, dtype=np.float32)
        rfc = np.zeros(n, dtype=np.int16)
        ring = np.zeros((self._delay, n), dtype=np.float32)
        counts = np.zeros(n, dtype=np.int32)
        first = np.full(n, np.nan)
        a, b, c = self._a, self._b, self._c

        for step in range(steps):
            # 1. integrate everyone except refractory neurons (they stay frozen)
            frozen = np.flatnonzero(rfc)
            v_frozen, g_frozen = v[frozen], g[frozen]
            v -= V_0
            v *= a
            v += V_0
            v += g * c
            g *= b
            v[frozen], g[frozen] = v_frozen, g_frozen
            rfc[frozen] -= 1

            # 2. threshold
            spiked = np.flatnonzero(v > V_TH)

            # 3. synapses: delayed arrivals, Poisson drive, schedule new spikes
            slot = step % self._delay
            g += ring[slot]
            ring[slot] = 0
            if len(stim_idx):
                hits = stim_idx[rng.random(len(stim_idx)) < stim_p]
                v[hits] += W_SYN * F_POI
            if len(spiked):
                ring[slot] += np.asarray(self.W[spiked].sum(axis=0)).ravel()

            # 4. reset
            v[spiked] = V_RST
            g[spiked] = 0
            rfc[spiked] = rfc_len[spiked]
            counts[spiked] += 1
            new = spiked[np.isnan(first[spiked])]
            first[new] = step * DT

        return SimResult(rates=counts / (t_ms / 1000.0), first_spike_ms=first)
