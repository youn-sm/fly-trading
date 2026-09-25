"""The fly tastes the stock: recent gains are sugar, recent losses are bitter.

Each trading day both tastes are fed to the gustatory neurons of the simulated brain.
If the feeding motor neuron MN9 fires strongly the fly "eats" (BUY / keep holding),
otherwise it "spits" (SELL / stay in cash). Long-only, all-in / all-out, paper trading.

Run:  python -m flytrade.trader   ->  output/timeline.json
"""
import itertools
import json
from dataclasses import asdict, dataclass
from typing import Callable

import numpy as np

from flytrade.data import ROOT

LOOKBACK = 5  # days of returns the fly tastes
FULL_SCALE = 0.08  # summed move (8%) that saturates a taste
MAX_HZ = 200.0  # strongest stimulation, as in the paper
MN9_THRESHOLD_HZ = 20.0  # MN9 rate at which the fly eats (buys)
TRIAL_MS = 500.0  # simulated brain time per trading day

BrainFn = Callable[[float, float], tuple[float, int]]  # (sugar Hz, bitter Hz) -> (MN9 Hz, active neurons)


@dataclass
class Day:
    date: str
    close: float
    sugar_hz: float
    bitter_hz: float
    mn9_hz: float
    n_active: int
    action: str  # BUY, SELL, HOLD (in position), WAIT (in cash)
    position: bool
    equity: float


def taste_rates(closes, i, lookback=LOOKBACK, full_scale=FULL_SCALE, max_hz=MAX_HZ):
    """(sugar Hz, bitter Hz) from the up / down moves of the `lookback` returns ending at day i."""
    window = np.asarray(closes[i - lookback : i + 1], dtype=float)
    rets = np.diff(window) / window[:-1]
    up, down = rets.clip(min=0).sum(), (-rets).clip(min=0).sum()
    scale = lambda x: float(max_hz * min(x / full_scale, 1.0))
    return scale(up), scale(down)


def backtest(closes, dates, brain_fn: BrainFn, threshold=MN9_THRESHOLD_HZ, lookback=LOOKBACK, cash=10_000.0):
    days, shares = [], 0.0
    for i, (date, close) in enumerate(zip(dates, closes)):
        sugar = bitter = mn9 = 0.0
        n_active, action = 0, "WAIT"
        if i >= lookback:
            sugar, bitter = taste_rates(closes, i, lookback)
            mn9, n_active = brain_fn(sugar, bitter)
            eat = mn9 >= threshold
            if eat and shares == 0:
                shares, cash, action = cash / close, 0.0, "BUY"
            elif not eat and shares > 0:
                cash, shares, action = shares * close, 0.0, "SELL"
            else:
                action = "HOLD" if shares > 0 else "WAIT"
        days.append(Day(str(date), float(close), sugar, bitter, float(mn9), int(n_active),
                        action, bool(shares > 0), float(cash + shares * close)))
    return days


def main(ticker="NVDA", n_days=60):
    from flytrade.brain import Brain
    from flytrade.data import load_connectome, load_prices
    from flytrade.neurons import BITTER, MN9, SUGAR

    prices = load_prices(ticker, n_days + LOOKBACK)
    ids, synapses = load_connectome()
    brain = Brain(ids, synapses)
    mn9 = brain.index_of(MN9[:1])[0]

    seeds = itertools.count()

    def brain_fn(sugar_hz, bitter_hz):
        stim = {**{f: sugar_hz for f in SUGAR if sugar_hz}, **{f: bitter_hz for f in BITTER if bitter_hz}}
        res = brain.run(stim, t_ms=TRIAL_MS, seed=next(seeds))
        print(f"  sugar {sugar_hz:5.0f} Hz  bitter {bitter_hz:5.0f} Hz  ->  MN9 {res.rates[mn9]:5.0f} Hz")
        return float(res.rates[mn9]), int((res.rates > 0).sum())

    dates = [d.strftime("%Y-%m-%d") for d in prices.index]
    days = backtest(prices.to_numpy(), dates, brain_fn)[LOOKBACK:]

    # brain snapshots for the video: the wave of first spikes after tasting sugar, and bitter's footprint
    sweet = brain.run({f: MAX_HZ for f in SUGAR}, t_ms=100)
    bitter = brain.run({f: MAX_HZ for f in BITTER}, t_ms=100)
    fired = np.flatnonzero(~np.isnan(sweet.first_spike_ms))

    start, end = days[0].equity, days[-1].equity
    timeline = {
        "ticker": ticker,
        "params": {"lookback": LOOKBACK, "full_scale": FULL_SCALE, "max_hz": MAX_HZ,
                   "mn9_threshold_hz": MN9_THRESHOLD_HZ, "trial_ms": TRIAL_MS},
        "days": [asdict(d) for d in days],
        "summary": {
            "start_cash": start,
            "fly_return": end / start - 1,
            "hold_return": days[-1].close / days[0].close - 1,
            "n_trades": sum(d.action in ("BUY", "SELL") for d in days),
        },
        "brain": {
            "n_neurons": int(brain.n),
            "n_synapses": int(abs(synapses).sum()),
            "sugar_wave": [[int(i), float(sweet.first_spike_ms[i])] for i in fired],
            "bitter_active": np.flatnonzero(bitter.rates > 0).tolist(),
            "sugar": brain.index_of(SUGAR).tolist(),
            "bitter": brain.index_of(BITTER).tolist(),
            "mn9": brain.index_of(MN9).tolist(),
        },
    }
    out = ROOT / "output" / "timeline.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(timeline, indent=1))
    s = timeline["summary"]
    print(f"\n{ticker}: fly {s['fly_return']:+.1%} vs buy&hold {s['hold_return']:+.1%}, {s['n_trades']} trades -> {out}")


if __name__ == "__main__":
    main()
