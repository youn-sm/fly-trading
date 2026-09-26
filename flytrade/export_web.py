"""Export the trading timeline (with OHLC candles) and brain coordinates for the 3D web page.

Run:  python -m flytrade.export_web   ->  web/data/timeline.json, web/data/brain.json
"""
import json

import numpy as np
import pandas as pd

from flytrade.data import DATA, ROOT, load_ids, load_positions

OUT = ROOT / "web" / "data"
BACKGROUND_POINTS = 40_000  # neurons drawn as the dim brain outline


def load_ohlc(ticker: str) -> pd.DataFrame:
    cache = DATA / f"ohlc_{ticker}.csv"
    if not cache.exists():
        import yfinance as yf

        df = yf.Ticker(ticker).history(period="1y")[["Open", "High", "Low", "Close"]]
        df.index = df.index.tz_localize(None).normalize()
        df.to_csv(cache)
    return pd.read_csv(cache, index_col=0, parse_dates=True)


def main():
    timeline = json.loads((ROOT / "output" / "timeline.json").read_text())
    ohlc = load_ohlc(timeline["ticker"])
    for day in timeline["days"]:
        o, h, l, c = ohlc.loc[pd.Timestamp(day["date"]), ["Open", "High", "Low", "Close"]]
        day.update(open=round(o, 2), high=round(h, 2), low=round(l, 2))
    brain = timeline.pop("brain")

    pos = load_positions(load_ids())
    valid = np.flatnonzero(~np.isnan(pos).any(axis=1))
    center = (np.nanpercentile(pos, 1, axis=0) + np.nanpercentile(pos, 99, axis=0)) / 2
    xyz = lambda idx: [[int(v) for v in (pos[i] - center).round()] for i in idx if i in valid_set]
    valid_set = set(valid.tolist())
    rng = np.random.default_rng(0)
    background = rng.choice(valid, BACKGROUND_POINTS, replace=False)
    wave = [(i, ms) for i, ms in brain["sugar_wave"] if i in valid_set]

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "timeline.json").write_text(json.dumps(timeline, separators=(",", ":")))
    (OUT / "brain.json").write_text(json.dumps({
        "n_neurons": brain["n_neurons"],
        "n_synapses": brain["n_synapses"],
        "background": xyz(background),
        "sugar": xyz([i for i, _ in wave]),  # neurons reached by the sugar signal
        "sugar_ms": [round(ms, 1) for _, ms in wave],  # their first-spike times
        "bitter": xyz(brain["bitter_active"]),
        "mn9": xyz(brain["mn9"]),
    }, separators=(",", ":")))
    for f in ("timeline.json", "brain.json"):
        print(f"{OUT / f}  {(OUT / f).stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
